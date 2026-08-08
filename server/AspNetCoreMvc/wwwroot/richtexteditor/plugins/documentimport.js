if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-09 Document import — the natural pair to Export-to-Word/Markdown/PDF.
// Opens a local file and loads it into the editor. Library-free for the common
// formats: Markdown (.md/.markdown via the core fromMarkdown engine), HTML
// (.html/.htm), plain text (.txt), and Word's HTML-based format (.doc, which
// Word saves as MSO-flavored HTML) — Word junk (mso-* styles, o:/w: tags,
// conditional comments) is stripped the same way paste-from-Word is.
//
// .docx IS parsed library-free: it is a ZIP of XML, and the ZIP central
// directory is read directly while DecompressionStream("deflate-raw") handles
// the inflate. No dependency, no server round-trip.
// (This comment used to say .docx was not parseable library-free. That was true
// when it was written and stopped being true when the ZIP reader landed below;
// it then misled a reader into reporting the feature as missing. Kept explicit
// so it does not happen again.)
//
// 2026-07-28 fidelity pass — what a naive converter silently loses, and what
// this now preserves:
//   - HYPERLINK URLS. w:hyperlink carries only an r:id; the address lives in
//     word/_rels/document.xml.rels. Without resolving it every link imports as
//     plain text with the URL discarded.
//   - IMAGES. w:drawing -> a:blip r:embed -> word/media/*, inlined as data URIs
//     (set config.documentImportImages = false to skip, for image-heavy files).
//   - ORDERED vs BULLET lists and NESTING. document.xml stores every list the
//     same way; only word/numbering.xml says which is which, so a naive reader
//     turns numbered lists into bullets. w:ilvl gives real nesting, placed
//     inside the parent <li> so the markup is valid.
//   - Paragraph alignment (w:jc).
// Supply config.documentImportResolver(file) to override any type (e.g. to run
// a server-side converter for formats this does not cover).
//
// API:
//   editor.openImportDialog(options?)        -> file picker, then import
//   editor.importFile(file, options?)        -> import a File object (Promise)
//   editor.htmlFromImportText(text, kind)     -> convert text to HTML (kind: md|html|txt|doc)
// Command: exec_command "importdocument" opens the picker. Slash: "/import".
// Config:
//   config.documentImport = false                 // disable
//   config.documentImportMode = "replace" | "insert"   // default "replace"
//   config.documentImportAccept = ".md,.markdown,.html,.htm,.txt,.doc,.docx"
//   config.documentImportResolver = function(file){ return htmlOrPromise; }
RTE_DefaultConfig.plugin_documentimport = RTE_Plugin_DocumentImport;
if (typeof RTE_DefaultConfig.documentImport === "undefined") RTE_DefaultConfig.documentImport = true;

function RTE_Plugin_DocumentImport() {
    var obj = this;
    var config, editor;

    obj.PluginName = "DocumentImport";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.documentImport === false) return;

        editor.htmlFromImportText = function (text, kind) { return toHtml(String(text == null ? "" : text), kind); };
        editor.importFile = function (file, options) { return importFile(file, options || {}); };
        editor.openImportDialog = function (options) { return openPicker(options || {}); };

        editor.attachEvent("exec_command_importdocument", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            openPicker({});
        });

        if (editor.slashCommands && typeof editor.slashCommands.register === "function") {
            try {
                editor.slashCommands.register({
                    id: "import-document",
                    title: "Import document",
                    description: "Open a Markdown, HTML, text, or Word (.doc) file into the editor",
                    keywords: ["import", "open", "file", "word", "markdown", "upload"],
                    action: function () { openPicker({}); }
                });
            } catch (e) {}
        }
    };

    function kindFromName(name) {
        var n = String(name || "").toLowerCase();
        if (/\.(md|markdown|mdown|mkd)$/.test(n)) return "md";
        if (/\.html?$/.test(n)) return "html";
        if (/\.doc$/.test(n)) return "doc";
        if (/\.docx$/.test(n)) return "docx";
        if (/\.txt$/.test(n)) return "txt";
        return "txt";
    }

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // A Word text box and a SmartArt graphic are BOXES on the page. Importing
    // them as bare <div>s keeps the words but loses the thing that made them
    // read as separate from the body text, so the import looks lossier than it
    // is. Styled inline rather than by class because this is saved content: it
    // has to survive wherever the host renders it, with no stylesheet of ours
    // loaded. (Found by check-css-contract.mjs -- the classes were emitted with
    // no rule anywhere.)
    var TEXTBOX_STYLE = "border:1px solid #b9c2cf;border-radius:4px;padding:10px 14px;margin:12px 0;background:#fbfcfe";
    var SMARTART_STYLE = "border:1px solid #b9c2cf;border-radius:4px;padding:10px 14px 10px 6px;margin:12px 0;background:#f7faff";

    // Strip Word/MSO debris from .doc HTML (same intent as paste-from-Word).
    function cleanWordHtml(html) {
        var h = String(html || "");
        // body only, drop head/xml/style islands and conditional comments
        var bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(h);
        if (bodyMatch) h = bodyMatch[1];
        h = h.replace(/<!--\[if[\s\S]*?\[endif\]-->/gi, "");
        h = h.replace(/<!--[\s\S]*?-->/g, "");
        h = h.replace(/<\/?(o:p|o:|w:|xml|style|meta|link|title|head)[^>]*>/gi, "");
        h = h.replace(/<\\?\?xml[^>]*>/gi, "");
        // strip mso-* declarations + empty style/class/lang attrs
        h = h.replace(/\sstyle="[^"]*"/gi, function (m) {
            var cleaned = m.replace(/mso-[^;"]*;?/gi, "").replace(/style="\s*;*\s*"/i, "");
            return /style="\s*"/.test(cleaned) || cleaned === ' style=""' ? "" : cleaned;
        });
        h = h.replace(/\sclass="Mso[^"]*"/gi, "");
        h = h.replace(/\s(lang|xmlns(:\w+)?)="[^"]*"/gi, "");
        return h;
    }

    function toHtml(text, kind) {
        switch (kind) {
            case "md":
                if (editor && typeof editor.fromMarkdown === "function") return editor.fromMarkdown(text, { apply: false });
                return "<p>" + esc(text).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>") + "</p>";
            case "html":
                return text;
            case "doc":
                return cleanWordHtml(text);
            case "txt":
            default:
                var paras = String(text).replace(/\r\n?/g, "\n").split(/\n{2,}/);
                return paras.map(function (p) {
                    return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>";
                }).join("");
        }
    }

    function applyHtml(html, mode) {
        if (html == null) return false;
        if (mode === "insert") {
            if (typeof editor.insertHTML === "function") { editor.insertHTML(html); return true; }
        }
        if (typeof editor.setHTMLCode === "function") { editor.setHTMLCode(html); return true; }
        return false;
    }

    function importFile(file, options) {
        var mode = options.mode || config.documentImportMode || "replace";
        return new Promise(function (resolve) {
            if (!file) { resolve(false); return; }
            var kind = kindFromName(file.name);

            // BYOK resolver wins for any type (lets a host handle .docx etc.).
            if (typeof config.documentImportResolver === "function") {
                try {
                    var r = config.documentImportResolver(file);
                    Promise.resolve(r).then(function (html) {
                        if (typeof html === "string") { resolve(applyHtml(html, mode)); }
                        else { builtin(); }
                    }, function () { builtin(); });
                    return;
                } catch (e) { builtin(); return; }
            }
            builtin();

            function builtin() {
                if (kind === "docx") {
                    // Library-free .docx: unzip word/document.xml (native
                    // DecompressionStream) + transform WordprocessingML -> HTML.
                    if (!docxSupported()) {
                        notify("This browser can't unpack .docx (no DecompressionStream). Save as .doc/.html/.md, or wire config.documentImportResolver.");
                        resolve(false);
                        return;
                    }
                    readDocx(file).then(function (html) {
                        if (html != null) resolve(applyHtml(html, mode));
                        else { notify("Could not read this .docx file."); resolve(false); }
                    }, function () { notify("Could not read this .docx file."); resolve(false); });
                    return;
                }
                if (typeof FileReader === "undefined") { resolve(false); return; }
                var reader = new FileReader();
                reader.onload = function () {
                    var html = toHtml(reader.result, kind);
                    resolve(applyHtml(html, mode));
                };
                reader.onerror = function () { resolve(false); };
                reader.readAsText(file);
            }
        });
    }

    function openPicker(options) {
        try {
            var input = document.createElement("input");
            input.type = "file";
            input.accept = options.accept || config.documentImportAccept || ".md,.markdown,.html,.htm,.txt,.doc,.docx";
            input.style.position = "fixed";
            input.style.left = "-9999px";
            input.addEventListener("change", function () {
                var f = input.files && input.files[0];
                if (f) importFile(f, options);
                setTimeout(function () { try { document.body.removeChild(input); } catch (e) {} }, 0);
            });
            document.body.appendChild(input);
            input.click();
            return true;
        } catch (e) {
            if (window.console) console.error("documentimport: openPicker failed", e);
            return false;
        }
    }

    // ---- library-free .docx (ZIP of XML) ----
    function docxSupported() {
        return typeof DecompressionStream === "function" && typeof DOMParser === "function" &&
            (typeof Response === "function" || typeof Blob === "function");
    }

    // Locate an entry via the ZIP central directory (reliable comp sizes/offsets).
    function findZipEntry(bytes, wantName) {
        var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        // End Of Central Directory: signature 0x06054b50, scan from the end.
        var eocd = -1;
        for (var i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 65536; i--) {
            if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) return null;
        var cdOffset = dv.getUint32(eocd + 16, true);
        var cdCount = dv.getUint16(eocd + 10, true);
        var p = cdOffset;
        for (var n = 0; n < cdCount; n++) {
            if (dv.getUint32(p, true) !== 0x02014b50) break;
            var method = dv.getUint16(p + 10, true);
            var compSize = dv.getUint32(p + 20, true);
            var nameLen = dv.getUint16(p + 28, true);
            var extraLen = dv.getUint16(p + 30, true);
            var commentLen = dv.getUint16(p + 32, true);
            var localOff = dv.getUint32(p + 42, true);
            // Normalize separators: the ZIP spec mandates "/", but some Windows
            // tools (.NET ZipFile on older runtimes) emit "\".
            var name = utf8(bytes.subarray(p + 46, p + 46 + nameLen)).replace(/\\/g, "/");
            if (name === wantName) {
                var lh = new DataView(bytes.buffer, bytes.byteOffset + localOff, 30);
                var lNameLen = lh.getUint16(26, true);
                var lExtraLen = lh.getUint16(28, true);
                var dataStart = localOff + 30 + lNameLen + lExtraLen;
                return { method: method, data: bytes.subarray(dataStart, dataStart + compSize) };
            }
            p += 46 + nameLen + extraLen + commentLen;
        }
        return null;
    }

    function utf8(u8) {
        try { return new TextDecoder("utf-8").decode(u8); } catch (e) {
            var s = ""; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return s;
        }
    }

    function inflateRaw(u8) {
        // method 0 = stored, 8 = deflate (raw).
        var ds = new DecompressionStream("deflate-raw");
        var blob = new Blob([u8]);
        return new Response(blob.stream().pipeThrough(ds)).arrayBuffer().then(function (ab) {
            return new Uint8Array(ab);
        });
    }

    // Every entry whose name matches, decompressed. Needed because a faithful
    // conversion is not just document.xml: the hyperlink URLs live in the rels
    // part, whether a list is bulleted or numbered lives in numbering.xml, and
    // the images live in word/media.
    function listZipEntries(bytes) {
        var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        var eocd = -1;
        for (var i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 65536; i--) {
            if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
        }
        if (eocd < 0) return [];
        var cdOffset = dv.getUint32(eocd + 16, true);
        var cdCount = dv.getUint16(eocd + 10, true);
        var p = cdOffset, out = [];
        for (var n = 0; n < cdCount; n++) {
            if (dv.getUint32(p, true) !== 0x02014b50) break;
            var method = dv.getUint16(p + 10, true);
            var compSize = dv.getUint32(p + 20, true);
            var nameLen = dv.getUint16(p + 28, true);
            var extraLen = dv.getUint16(p + 30, true);
            var commentLen = dv.getUint16(p + 32, true);
            var localOff = dv.getUint32(p + 42, true);
            var name = utf8(bytes.subarray(p + 46, p + 46 + nameLen)).replace(/\\/g, "/");
            var lh = new DataView(bytes.buffer, bytes.byteOffset + localOff, 30);
            var dataStart = localOff + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
            out.push({ name: name, method: method, data: bytes.subarray(dataStart, dataStart + compSize) });
            p += 46 + nameLen + extraLen + commentLen;
        }
        return out;
    }

    function entryBytes(entry) {
        return entry.method === 0 ? Promise.resolve(entry.data) : inflateRaw(entry.data);
    }

    function mimeForExt(name) {
        var e = (name.split(".").pop() || "").toLowerCase();
        if (e === "png") return "image/png";
        if (e === "jpg" || e === "jpeg") return "image/jpeg";
        if (e === "gif") return "image/gif";
        if (e === "bmp") return "image/bmp";
        if (e === "webp") return "image/webp";
        if (e === "svg") return "image/svg+xml";
        return null;   // wmf/emf and friends have no browser-renderable form
    }

    function bytesToDataUri(u8, mime) {
        var CHUNK = 0x8000, s = "";
        for (var i = 0; i < u8.length; i += CHUNK) {
            s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
        }
        return "data:" + mime + ";base64," + btoa(s);
    }

    function readDocx(file) {
        var bufPromise = file.arrayBuffer ? file.arrayBuffer() : new Promise(function (res, rej) {
            var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsArrayBuffer(file);
        });
        return bufPromise.then(function (ab) {
            var bytes = new Uint8Array(ab);
            var entries = listZipEntries(bytes);
            var byName = {};
            for (var i = 0; i < entries.length; i++) byName[entries[i].name] = entries[i];
            if (!byName["word/document.xml"]) return null;

            var ctx = { rels: {}, numbering: {}, media: {}, footnotes: {}, endnotes: {}, comments: {}, diagrams: {}, vectorNames: {} };

            // Images are opt-in: a document full of photographs would otherwise
            // inline megabytes of base64 into the editor.
            var wantMedia = config.documentImportImages !== false;

            var jobs = [entryBytes(byName["word/document.xml"]).then(function (b) { ctx.documentXml = utf8(b); })];

            if (byName["word/_rels/document.xml.rels"]) {
                jobs.push(entryBytes(byName["word/_rels/document.xml.rels"]).then(function (b) {
                    ctx.rels = parseRels(utf8(b));
                }));
            }
            if (byName["word/numbering.xml"]) {
                jobs.push(entryBytes(byName["word/numbering.xml"]).then(function (b) {
                    ctx.numbering = parseNumbering(utf8(b));
                }));
            }
            // Footnotes live in their OWN part; document.xml only carries
            // w:footnoteReference with an id. Skip this and a footnoted contract
            // imports with every citation silently deleted.
            if (byName["word/footnotes.xml"]) {
                jobs.push(entryBytes(byName["word/footnotes.xml"]).then(function (b) {
                    ctx.footnotes = parseFootnotes(utf8(b), "footnote");
                }));
            }
            // Comment bodies live in their own part too, keyed by id; the
            // document only marks the commented RANGE.
            // Endnotes are structurally identical to footnotes, in their own part.
            if (byName["word/endnotes.xml"]) {
                jobs.push(entryBytes(byName["word/endnotes.xml"]).then(function (b) {
                    ctx.endnotes = parseFootnotes(utf8(b), "endnote");
                }));
            }
            if (byName["word/comments.xml"]) {
                jobs.push(entryBytes(byName["word/comments.xml"]).then(function (b) {
                    ctx.comments = parseComments(utf8(b));
                }));
            }
            // SmartArt. The drawing in document.xml holds only relationship ids;
            // every word of the diagram lives in word/diagrams/dataN.xml, in the
            // DrawingML *diagram* namespace. A reader that looks for a:blip finds
            // nothing and drops the whole graphic, so an org chart or a process
            // flow imports as empty space.
            for (var dg = 0; dg < entries.length; dg++) {
                (function (ent) {
                    if (!/^word\/diagrams\/data\d*\.xml$/.test(ent.name)) return;
                    jobs.push(entryBytes(ent).then(function (b) {
                        try { ctx.diagrams[ent.name] = parseDiagram(utf8(b)); } catch (e) {}
                    }));
                })(entries[dg]);
            }
            if (wantMedia) {
                for (var n = 0; n < entries.length; n++) {
                    (function (ent) {
                        if (ent.name.indexOf("word/media/") !== 0) return;
                        var mime = mimeForExt(ent.name);
                        if (!mime) return;
                        jobs.push(entryBytes(ent).then(function (b) {
                            try { ctx.media[ent.name] = bytesToDataUri(b, mime); } catch (e) {}
                        }));
                    })(entries[n]);
                }
            }

            return Promise.all(jobs).then(function () { return docxXmlToHtml(ctx.documentXml, ctx); });
        });
    }

    // r:id -> target. Without this, every hyperlink in the document survives as
    // plain text with its URL silently discarded.
    function parseRels(xml) {
        var map = {};
        try {
            var d = new DOMParser().parseFromString(xml, "application/xml");
            var rs = d.getElementsByTagName("*");
            for (var i = 0; i < rs.length; i++) {
                if (rs[i].localName !== "Relationship") continue;
                var id = rs[i].getAttribute("Id");
                var target = rs[i].getAttribute("Target");
                var mode = rs[i].getAttribute("TargetMode");
                if (id && target) map[id] = { target: target, external: mode === "External" };
            }
        } catch (e) {}
        return map;
    }

    // w:id -> plain text of the footnote body.
    // Word reserves ids 0 and -1 for the separator rules drawn above footnotes;
    // those carry type="separator"/"continuationSeparator" and are not content.
    // tagName is "footnote" or "endnote": the two parts share a schema but NOT
    // an element name, so parsing endnotes.xml with "footnote" silently returns
    // nothing at all.
    function parseFootnotes(xml, tagName) {
        var out = {};
        try {
            var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
            var d = new DOMParser().parseFromString(xml, "application/xml");
            var notes = d.getElementsByTagNameNS(W, tagName || "footnote");
            for (var i = 0; i < notes.length; i++) {
                var n = notes[i];
                var type = n.getAttributeNS(W, "type") || n.getAttribute("w:type") || "";
                if (type) continue;                       // separator, not a real note
                var id = n.getAttributeNS(W, "id") || n.getAttribute("w:id");
                if (id == null) continue;
                // Body text only; the leading footnote-reference mark inside the
                // note is Word's own numbering and would duplicate ours.
                var txt = (n.textContent || "").replace(/\s+/g, " ").trim();
                if (txt) out[String(id)] = txt;
            }
        } catch (e) {}
        return out;
    }

    // w:id -> { text, author }
    function parseComments(xml) {
        var out = {};
        try {
            var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
            var d = new DOMParser().parseFromString(xml, "application/xml");
            var cs = d.getElementsByTagNameNS(W, "comment");
            for (var i = 0; i < cs.length; i++) {
                var c = cs[i];
                var id = c.getAttributeNS(W, "id") || c.getAttribute("w:id");
                if (id == null) continue;
                out[String(id)] = {
                    text: (c.textContent || "").replace(/\s+/g, " ").trim(),
                    author: c.getAttributeNS(W, "author") || c.getAttribute("w:author") || ""
                };
            }
        } catch (e) {}
        return out;
    }

    // word/diagrams/dataN.xml -> the diagram's text, one entry per node, in
    // document order.
    //
    // SmartArt has no browser equivalent -- it is a laid-out graphic driven by a
    // layout algorithm -- but its CONTENT is ordinary text, and text is what the
    // reader actually needs. An org chart that imports as an outline is usable; an
    // org chart that imports as nothing is a hole in the document.
    //
    // Nodes with presentation-only roles (`dgm:prSet` with no text, and the
    // ptType "pres"/"parTrans"/"sibTrans" connector points) carry no content and
    // would otherwise contribute blank list items.
    function parseDiagram(xml) {
        var out = [];
        try {
            var DGM = "http://schemas.openxmlformats.org/drawingml/2006/diagram";
            var d = new DOMParser().parseFromString(xml, "application/xml");
            var pts = d.getElementsByTagNameNS(DGM, "pt");
            for (var i = 0; i < pts.length; i++) {
                var type = pts[i].getAttribute("type") || "";
                if (type === "pres" || type === "parTrans" || type === "sibTrans") continue;
                var t = pts[i].getElementsByTagNameNS(DGM, "t")[0];
                if (!t) continue;
                var text = (t.textContent || "").replace(/\s+/g, " ").trim();
                if (text) out.push(text);
            }
        } catch (e) {}
        return out;
    }

    // numId -> { level -> "bullet" | "decimal" | ... }. Word stores every list
    // the same way in document.xml; only numbering.xml says whether it renders
    // as bullets or numbers, which is why a naive converter turns every ordered
    // list into a <ul>.
    function parseNumbering(xml) {
        var out = {};
        try {
            var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
            var d = new DOMParser().parseFromString(xml, "application/xml");
            function val(el) { return el ? (el.getAttributeNS(W, "val") || el.getAttribute("w:val") || "") : ""; }

            // abstractNumId -> { ilvl -> numFmt }
            var abstracts = {};
            var aNums = d.getElementsByTagNameNS(W, "abstractNum");
            for (var i = 0; i < aNums.length; i++) {
                var aid = aNums[i].getAttributeNS(W, "abstractNumId") || aNums[i].getAttribute("w:abstractNumId");
                var levels = {};
                var lvls = aNums[i].getElementsByTagNameNS(W, "lvl");
                for (var j = 0; j < lvls.length; j++) {
                    var ilvl = lvls[j].getAttributeNS(W, "ilvl") || lvls[j].getAttribute("w:ilvl") || "0";
                    var fmt = val(lvls[j].getElementsByTagNameNS(W, "numFmt")[0]);
                    levels[ilvl] = fmt || "decimal";
                }
                if (aid != null) abstracts[aid] = levels;
            }
            // num -> abstractNumId
            var nums = d.getElementsByTagNameNS(W, "num");
            for (var k = 0; k < nums.length; k++) {
                var nid = nums[k].getAttributeNS(W, "numId") || nums[k].getAttribute("w:numId");
                var ref = nums[k].getElementsByTagNameNS(W, "abstractNumId")[0];
                var aref = val(ref);
                if (nid != null && abstracts[aref]) out[nid] = abstracts[aref];
            }
        } catch (e) {}
        return out;
    }

    // ---------------------------------------------------------------------
    // OMML (Office Math Markup) -> LaTeX.
    //
    // Word does not store equations as text, MathML or an image: it stores an
    // <m:oMath> tree in its OWN namespace, interleaved between the runs of a
    // paragraph. A converter that walks w:r elements never sees it, so every
    // equation in the document disappears without a trace -- and because the
    // surrounding sentence still imports, nothing looks broken.
    //
    // The target is the editor's own inline-math format
    // (<span class="rte-math-inline" data-tex="...">), so imported equations
    // are editable and re-render through whichever renderer the host page
    // loads, exactly like one typed in the math dialog.
    //
    // This covers the constructs Word's equation editor actually produces.
    // Anything unrecognised degrades to its literal text rather than vanishing
    // -- a wrong-looking formula is recoverable, a missing one is not.
    var OMML_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math";

    // Word writes operators as Unicode, but a TeX renderer wants command names.
    // Passing "∑" through untouched produces a glyph that KaTeX cannot size or
    // place limits on.
    var MATH_SYMBOLS = {
        "∑": "\\sum", "∏": "\\prod", "∐": "\\coprod",
        "∫": "\\int", "∬": "\\iint", "∭": "\\iiint", "∮": "\\oint",
        "⋃": "\\bigcup", "⋂": "\\bigcap",
        "±": "\\pm", "∓": "\\mp", "×": "\\times", "÷": "\\div",
        "−": "-", "≠": "\\neq", "≤": "\\leq", "≥": "\\geq",
        "≈": "\\approx", "≡": "\\equiv", "∝": "\\propto",
        "∞": "\\infty", "∂": "\\partial", "∇": "\\nabla",
        "√": "\\sqrt", "∠": "\\angle", "⋅": "\\cdot", "…": "\\dots",
        "→": "\\to", "←": "\\leftarrow", "⇒": "\\Rightarrow", "⇔": "\\Leftrightarrow",
        "∈": "\\in", "∉": "\\notin", "⊂": "\\subset", "⊆": "\\subseteq",
        "∪": "\\cup", "∩": "\\cap", "∅": "\\emptyset",
        "∀": "\\forall", "∃": "\\exists", "¬": "\\neg",
        "∧": "\\land", "∨": "\\lor", "∴": "\\therefore",
        "α": "\\alpha", "β": "\\beta", "γ": "\\gamma", "δ": "\\delta",
        "ε": "\\epsilon", "ζ": "\\zeta", "η": "\\eta", "θ": "\\theta",
        "ι": "\\iota", "κ": "\\kappa", "λ": "\\lambda", "μ": "\\mu",
        "ν": "\\nu", "ξ": "\\xi", "π": "\\pi", "ρ": "\\rho",
        "σ": "\\sigma", "τ": "\\tau", "υ": "\\upsilon", "φ": "\\varphi",
        "χ": "\\chi", "ψ": "\\psi", "ω": "\\omega",
        "Γ": "\\Gamma", "Δ": "\\Delta", "Θ": "\\Theta", "Λ": "\\Lambda",
        "Ξ": "\\Xi", "Π": "\\Pi", "Σ": "\\Sigma", "Φ": "\\Phi",
        "Ψ": "\\Psi", "Ω": "\\Omega"
    };
    // Accent character -> TeX accent command (m:acc carries the mark as a chr).
    var MATH_ACCENTS = {
        "̂": "\\hat", "̃": "\\tilde", "̄": "\\bar", "̅": "\\overline",
        "̆": "\\breve", "̇": "\\dot", "̈": "\\ddot", "̊": "\\mathring",
        "̌": "\\check", "→": "\\vec", "⃗": "\\vec", "́": "\\acute", "̀": "\\grave"
    };

    function ommlToTex(node) {
        var M = OMML_NS;
        function attrVal(parent, ln) {
            // Properties sit in a child element whose only content is m:val.
            for (var i = 0; i < parent.childNodes.length; i++) {
                var c = parent.childNodes[i];
                if (c.nodeType === 1 && c.localName === ln) {
                    return c.getAttributeNS(M, "val") || c.getAttribute("m:val") || "";
                }
            }
            return "";
        }
        function propOf(el, propName, ln) {
            var p = child(el, propName);
            return p ? attrVal(p, ln) : "";
        }
        function child(el, ln) {
            for (var i = 0; i < el.childNodes.length; i++) {
                var c = el.childNodes[i];
                if (c.nodeType === 1 && c.localName === ln && c.namespaceURI === M) return c;
            }
            return null;
        }
        function children(el, ln) {
            var out = [];
            for (var i = 0; i < el.childNodes.length; i++) {
                var c = el.childNodes[i];
                if (c.nodeType === 1 && c.localName === ln && c.namespaceURI === M) out.push(c);
            }
            return out;
        }
        // An argument slot: braces so multi-character content binds correctly.
        // "x+1" without them turns \frac{x+1}{2} into \fracx+12.
        function arg(el) {
            return "{" + (el ? walk(el).trim() : "") + "}";
        }
        // A slot where braces are optional. Emitting them unconditionally is
        // correct but produces "{x}^{2}" and "{{i}^{2}}" -- valid TeX that is
        // unreadable the moment the user opens the equation in the math dialog.
        // A lone letter, digit or command needs none.
        function atom(el) {
            var t = el ? walk(el).trim() : "";
            if (/^[A-Za-z0-9]$/.test(t) || /^\\[A-Za-z]+$/.test(t)) return t;
            return "{" + t + "}";
        }
        function mapText(s) {
            var out = "";
            for (var i = 0; i < s.length; i++) {
                var ch = s.charAt(i);
                var sym = MATH_SYMBOLS[ch];
                if (sym) { out += sym + " "; continue; }
                // TeX metacharacters inside literal math text.
                if ("#$%&_{}".indexOf(ch) >= 0) { out += "\\" + ch; continue; }
                if (ch === "\\") { out += "\\backslash "; continue; }
                out += ch;
            }
            return out;
        }
        function walk(el) {
            var tex = "";
            for (var i = 0; i < el.childNodes.length; i++) {
                var c = el.childNodes[i];
                if (c.nodeType !== 1) continue;
                if (c.namespaceURI !== M) { tex += mapText(c.textContent || ""); continue; }
                tex += convert(c);
            }
            return tex;
        }
        function convert(el) {
            var ln = el.localName;
            switch (ln) {
                case "oMath":
                case "oMathPara":
                case "e":
                case "num":
                case "den":
                case "sub":
                case "sup":
                case "deg":
                case "lim":
                case "fName":
                    return walk(el);
                // Properties describe how to render, not what to render; emitting
                // their text would leak stray characters into the formula.
                case "rPr": case "ctrlPr": case "fPr": case "radPr": case "naryPr":
                case "dPr": case "sSupPr": case "sSubPr": case "sSubSupPr": case "accPr":
                case "barPr": case "funcPr": case "mPr": case "limLowPr": case "limUppPr":
                case "groupChrPr": case "mcPr": case "eqArrPr": case "boxPr": case "borderBoxPr":
                case "phantPr": case "sPrePr":
                    return "";
                case "r":
                    return mapText(el.textContent || "");
                case "t":
                    return mapText(el.textContent || "");
                case "f": {
                    // A "no bar" fraction is Word's binomial/stacked form.
                    var type = propOf(el, "fPr", "type");
                    var n = arg(child(el, "num")), d = arg(child(el, "den"));
                    if (type === "noBar") return "\\binom" + n + d;
                    if (type === "skw" || type === "lin") return n + "/" + d;
                    return "\\frac" + n + d;
                }
                case "sSup":  return atom(child(el, "e")) + "^" + arg(child(el, "sup"));
                case "sSub":  return atom(child(el, "e")) + "_" + arg(child(el, "sub"));
                case "sSubSup": return atom(child(el, "e")) + "_" + arg(child(el, "sub")) + "^" + arg(child(el, "sup"));
                case "sPre": return "{}_" + arg(child(el, "sub")) + "^" + arg(child(el, "sup")) + arg(child(el, "e"));
                case "rad": {
                    // degHide means a plain square root; otherwise it is \sqrt[n]{}.
                    var hide = propOf(el, "radPr", "degHide");
                    var deg = child(el, "deg");
                    var body = arg(child(el, "e"));
                    if (hide === "1" || hide === "on" || hide === "true" || !deg || !(deg.textContent || "").trim()) return "\\sqrt" + body;
                    return "\\sqrt[" + walk(deg) + "]" + body;
                }
                case "nary": {
                    // The operator itself is an ATTRIBUTE (m:chr), not text. Miss
                    // it and every summation imports as a bare limit pair.
                    var chr = propOf(el, "naryPr", "chr") || "∫";
                    var op = MATH_SYMBOLS[chr] || mapText(chr);
                    var subHide = propOf(el, "naryPr", "subHide");
                    var supHide = propOf(el, "naryPr", "supHide");
                    var s = op;
                    if (subHide !== "1" && subHide !== "on" && child(el, "sub")) s += "_" + arg(child(el, "sub"));
                    if (supHide !== "1" && supHide !== "on" && child(el, "sup")) s += "^" + arg(child(el, "sup"));
                    // The integrand takes no braces: \sum_{i=1}^{n} i^{2}, not
                    // \sum_{i=1}^{n} {i^{2}}.
                    var nbody = child(el, "e");
                    return s + " " + (nbody ? walk(nbody).trim() : "");
                }
                case "d": {
                    // \left/\right so the fences grow with their content.
                    var beg = propOf(el, "dPr", "begChr");
                    var end = propOf(el, "dPr", "endChr");
                    var sep = propOf(el, "dPr", "sepChr") || "|";
                    if (beg === "") beg = "(";
                    if (end === "") end = ")";
                    function fence(ch, side) {
                        if (!ch) return side === "l" ? "\\left." : "\\right.";
                        if (ch === "{" || ch === "}") return "\\" + ch;
                        if (ch === "|") return "|";
                        if (ch === "‖") return "\\|";
                        // THREE different codepoints render as an angle
                        // bracket and are indistinguishable on screen: the
                        // mathematical pair (U+27E8/9), the CJK pair
                        // (U+3008/9) and the deprecated pair (U+2329/A) that
                        // several generators still emit. Comparing against a
                        // literal in the source would silently match only one
                        // of them, so compare by codepoint.
                        var cp = ch.charCodeAt(0);
                        if (cp === 0x27E8 || cp === 0x3008 || cp === 0x2329) return "\\langle";
                        if (cp === 0x27E9 || cp === 0x3009 || cp === 0x232A) return "\\rangle";
                        if (ch === "⌊") return "\\lfloor";
                        if (ch === "⌋") return "\\rfloor";
                        if (ch === "⌈") return "\\lceil";
                        if (ch === "⌉") return "\\rceil";
                        return ch;
                    }
                    var parts = children(el, "e");
                    var inner = [];
                    for (var q = 0; q < parts.length; q++) inner.push(walk(parts[q]));
                    return "\\left" + fence(beg, "l") + inner.join(" " + fence(sep, "m") + " ") + "\\right" + fence(end, "r");
                }
                case "func": {
                    // Word stores "sin"/"log" as ordinary text; without
                    // \operatorname TeX renders it as s*i*n in italics.
                    var name = walk(child(el, "fName")).trim();
                    var known = /^(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|log|ln|lg|exp|lim|max|min|det|dim|gcd|arg|deg|hom|ker|Pr|sup|inf)$/;
                    var head = known.test(name) ? "\\" + name : (name ? "\\operatorname{" + name + "}" : "");
                    return head + arg(child(el, "e"));
                }
                case "limLow": {
                    var base = walk(child(el, "e")).trim();
                    if (base === "lim" || base === "\\lim") return "\\lim_" + arg(child(el, "lim"));
                    return "\\underset" + arg(child(el, "lim")) + "{" + base + "}";
                }
                case "limUpp":
                    return "\\overset" + arg(child(el, "lim")) + arg(child(el, "e"));
                case "acc": {
                    var mark = propOf(el, "accPr", "chr") || "̂";
                    var cmd = MATH_ACCENTS[mark] || "\\hat";
                    return cmd + arg(child(el, "e"));
                }
                case "bar":
                    return (propOf(el, "barPr", "pos") === "bot" ? "\\underline" : "\\overline") + arg(child(el, "e"));
                case "groupChr": {
                    var g = propOf(el, "groupChrPr", "chr");
                    if (g === "⏟") return "\\underbrace" + arg(child(el, "e"));
                    return "\\overbrace" + arg(child(el, "e"));
                }
                case "borderBox":
                    return "\\boxed" + arg(child(el, "e"));
                case "box":
                case "phant":
                    return walk(el);
                case "m": {
                    // Matrix: rows are m:mr, cells are m:e inside them.
                    var rows = children(el, "mr"), lines = [];
                    for (var r = 0; r < rows.length; r++) {
                        var cells = children(rows[r], "e"), cs = [];
                        for (var cix = 0; cix < cells.length; cix++) cs.push(walk(cells[cix]));
                        lines.push(cs.join(" & "));
                    }
                    return "\\begin{matrix}" + lines.join(" \\\\ ") + "\\end{matrix}";
                }
                case "eqArr": {
                    var eqs = children(el, "e"), rowsOut = [];
                    for (var e2 = 0; e2 < eqs.length; e2++) rowsOut.push(walk(eqs[e2]));
                    return "\\begin{aligned}" + rowsOut.join(" \\\\ ") + "\\end{aligned}";
                }
                default:
                    // Unknown construct: keep the content rather than losing it.
                    return walk(el);
            }
        }
        try {
            return convert(node).replace(/\s+/g, " ").trim();
        } catch (e) { return (node.textContent || "").trim(); }
    }

    function docxXmlToHtml(xml, ctx) {
        ctx = ctx || { rels: {}, numbering: {}, media: {} };
        if (!ctx.diagrams) ctx.diagrams = {};
        var doc = new DOMParser().parseFromString(xml, "application/xml");
        var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
        var R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

        function relTarget(el) {
            if (!el) return null;
            var id = el.getAttributeNS(R, "id") || el.getAttribute("r:id") ||
                     el.getAttributeNS(R, "embed") || el.getAttribute("r:embed");
            if (!id) return null;
            return ctx.rels[id] || null;
        }

        // <w:drawing>/<w:pict> -> <img> from word/media, inlined as a data URI.
        function imageHtml(node) {
            var blips = node.getElementsByTagName("*");
            for (var i = 0; i < blips.length; i++) {
                if (blips[i].localName !== "blip" && blips[i].localName !== "imagedata") continue;
                var rel = relTarget(blips[i]);
                if (!rel) continue;
                // Targets are relative to word/: "media/image1.png".
                var path = rel.target.replace(/^\.\//, "");
                var key = path.indexOf("word/") === 0 ? path : "word/" + path;
                var uri = ctx.media[key];
                if (uri) return '<img src="' + uri + '" alt="">';
                if (rel.external) return '<img src="' + esc(rel.target) + '" alt="">';
                // A vector metafile (WMF/EMF) has no browser-renderable form, so
                // there is no data URI for it. Dropping it silently leaves the
                // reader with no idea a figure was ever there -- and no filename
                // to go looking for in the original.
                if (/\.(wmf|emf|emz|wmz)$/i.test(path)) {
                    var fileName = path.split("/").pop();
                    queueBlock('<p class="rte-imported-unsupported" data-source="' + esc(fileName) +
                               '"><em>[Unsupported image: ' + esc(fileName) +
                               " — Windows metafiles have no browser-renderable form]</em></p>");
                    return "";
                }
            }
            queueBlock(diagramHtml(node));
            return "";
        }

        // SmartArt: the drawing references word/diagrams/dataN.xml through
        // r:dm. Rendered as a labelled list -- the layout cannot be reproduced,
        // but every word of it survives and stays editable.
        function diagramHtml(node) {
            var all = node.getElementsByTagName("*");
            for (var i = 0; i < all.length; i++) {
                if (all[i].localName !== "relIds") continue;
                var id = all[i].getAttributeNS(R, "dm") || all[i].getAttribute("r:dm");
                var rel = id ? ctx.rels[id] : null;
                if (!rel) continue;
                var path = rel.target.replace(/^\.\//, "");
                var key = path.indexOf("word/") === 0 ? path : "word/" + path;
                var nodes = ctx.diagrams[key];
                if (!nodes || !nodes.length) continue;
                var items = "";
                for (var n = 0; n < nodes.length; n++) items += "<li>" + esc(nodes[n]) + "</li>";
                return '<div class="rte-imported-smartart" style="' + SMARTART_STYLE + '"><ul>' + items + "</ul></div>";
            }
            return "";
        }
        function els(parent, ln) { return parent.getElementsByTagNameNS(W, ln); }
        function firstChildEl(parent, ln) {
            for (var i = 0; i < parent.childNodes.length; i++) {
                var c = parent.childNodes[i];
                if (c.nodeType === 1 && c.localName === ln && c.namespaceURI === W) return c;
            }
            return null;
        }
        function runText(r) {
            var t = "", kids = r.childNodes;
            for (var i = 0; i < kids.length; i++) {
                var c = kids[i];
                if (c.nodeType !== 1) continue;
                // Deleted text is stored as w:delText, never w:t — read only w:t
                // and every tracked deletion imports as an empty run.
                if (c.localName === "t" || c.localName === "delText") t += c.textContent || "";
                else if (c.localName === "tab") t += "\t";
                else if (c.localName === "br" || c.localName === "cr") t += "\n";
            }
            return t;
        }
        function runHtml(r) {
            // A run can carry a picture instead of text; without this every
            // image in the document is silently dropped on import.
            var pics = "";
            for (var d = 0; d < r.childNodes.length; d++) {
                var ch = r.childNodes[d];
                if (ch.nodeType === 1 && (ch.localName === "drawing" || ch.localName === "pict")) {
                    pics += imageHtml(ch);
                }
                // A run holding a footnote reference has no text of its own.
                if (ch.nodeType === 1 && ch.localName === "footnoteReference") {
                    var fid = ch.getAttributeNS(W, "id") || ch.getAttribute("w:id");
                    var body = fid != null ? ctx.footnotes[String(fid)] : null;
                    if (body) pics += footnoteMarker(body);
                }
                // Endnotes render through the same notes machinery: Word puts
                // both at the end of the document, and the distinction is not
                // one HTML has a separate representation for.
                if (ch.nodeType === 1 && ch.localName === "endnoteReference") {
                    var eid = ch.getAttributeNS(W, "id") || ch.getAttribute("w:id");
                    var ebody = eid != null ? ctx.endnotes[String(eid)] : null;
                    if (ebody) pics += footnoteMarker(ebody);
                }
                // TEXT BOXES. Their content is nested several levels below the
                // run (w:pict > v:shape > v:textbox > w:txbxContent, or the
                // DrawingML mc:AlternateContent equivalent), so a reader that
                // only looks at a run's DIRECT children drops every word inside
                // them -- silently, with no sign anything is missing.
                if (ch.nodeType === 1 && (ch.localName === "pict" || ch.localName === "drawing" ||
                                          ch.localName === "object" || ch.localName === "AlternateContent")) {
                    collectTextBoxes(ch);
                }
            }
            var txt = esc(runText(r));
            if (!txt) return pics;
            txt = txt.replace(/\n/g, "<br>");
            var rpr = firstChildEl(r, "rPr");
            if (rpr) {
                if (firstChildEl(rpr, "b")) txt = "<strong>" + txt + "</strong>";
                if (firstChildEl(rpr, "i")) txt = "<em>" + txt + "</em>";
                if (firstChildEl(rpr, "u")) txt = "<u>" + txt + "</u>";
                if (firstChildEl(rpr, "strike")) txt = "<s>" + txt + "</s>";
                var vert = firstChildEl(rpr, "vertAlign");
                if (vert) {
                    var va = vert.getAttributeNS(W, "val") || vert.getAttribute("w:val") || "";
                    if (va === "superscript") txt = "<sup>" + txt + "</sup>";
                    else if (va === "subscript") txt = "<sub>" + txt + "</sub>";
                }
                // Character colour and size. w:sz is in HALF-points, so 24 = 12pt;
                // forgetting the halving makes every imported document twice the
                // size it should be.
                var css = "";
                var col = firstChildEl(rpr, "color");
                if (col) {
                    var cv = col.getAttributeNS(W, "val") || col.getAttribute("w:val") || "";
                    if (cv && /^[0-9A-Fa-f]{6}$/.test(cv)) css += "color:#" + cv + ";";
                }
                var hl = firstChildEl(rpr, "highlight");
                if (hl) {
                    var hv = hl.getAttributeNS(W, "val") || hl.getAttribute("w:val") || "";
                    if (hv && hv !== "none") css += "background-color:" + hv + ";";
                }
                var sz = firstChildEl(rpr, "sz");
                if (sz) {
                    var sv = parseInt(sz.getAttributeNS(W, "val") || sz.getAttribute("w:val") || "", 10);
                    if (sv > 0) css += "font-size:" + (sv / 2) + "pt;";
                }
                if (css) txt = '<span style="' + css + '">' + txt + "</span>";
            }
            return pics + txt;
        }

        // Block-level content discovered while rendering a paragraph: text
        // boxes, SmartArt outlines, and placeholders for images the browser
        // cannot render. None of them may be emitted inline inside the
        // paragraph that referenced them -- a <div> inside a <p> is invalid and
        // browsers silently close the paragraph around it -- so each is
        // buffered here, already wrapped, and flushed straight after.
        var pendingBlocks = [];
        function queueBlock(html) {
            // Dedup on the whole string: an mc:AlternateContent block carries
            // the same graphic twice, once per rendering flavour.
            if (html && pendingBlocks.indexOf(html) < 0) pendingBlocks.push(html);
        }
        function collectTextBoxes(node) {
            var boxes = node.getElementsByTagName("*");
            for (var i = 0; i < boxes.length; i++) {
                if (boxes[i].localName !== "txbxContent") continue;
                var inner = "";
                var kids = boxes[i].childNodes;
                for (var k = 0; k < kids.length; k++) {
                    var c = kids[k];
                    if (c.nodeType !== 1) continue;
                    if (c.localName === "p") {
                        var t = paraInner(c);
                        if (t) inner += "<p>" + t + "</p>";
                    } else if (c.localName === "tbl") {
                        inner += tableHtml(c);
                    }
                }
                if (inner) queueBlock('<div class="rte-imported-textbox" style="' + TEXTBOX_STYLE + '">' + inner + "</div>");
            }
        }

        function flushBlocks() {
            if (!pendingBlocks.length) return "";
            var html = pendingBlocks.join("");
            pendingBlocks = [];
            return html;
        }

        // Emit a marker in the shape footnotes.js already understands, and stash
        // the body so the notes section can be built at the end. The plugin
        // renumbers on load, so the number written here is provisional.
        var importedNotes = [];
        // OMML -> the editor's own inline-math span, so an imported equation is
        // editable in the math dialog and renders through whatever renderer the
        // host page loads. The visible text is the TeX itself: that is what a
        // page with no renderer shows, and it is readable rather than blank.
        function mathHtml(node) {
            var tex = ommlToTex(node);
            if (!tex) return "";
            var display = node.localName === "oMathPara";
            return '<span class="rte-math-inline' + (display ? " rte-math-display" : "") +
                   '" data-tex="' + esc(tex) + '">' + esc(tex) + "</span>";
        }

        function footnoteMarker(text) {
            var id = "fnimp" + (importedNotes.length + 1);
            importedNotes.push({ id: id, text: text });
            var n = importedNotes.length;
            return '<sup class="rte-fn-ref" data-fn-id="' + id + '" data-fn-number="' + n +
                   '" id="fnref-' + id + '" contenteditable="false">' + n + "</sup>";
        }

        function footnotesSection() {
            if (!importedNotes.length) return "";
            var items = "";
            for (var i = 0; i < importedNotes.length; i++) {
                var f = importedNotes[i];
                items += '<li class="rte-fn-note" data-fn-id="' + f.id + '" data-fn-number="' + (i + 1) +
                         '" id="fn-' + f.id + '">' + esc(f.text) +
                         '<a class="rte-fn-back" data-fn-id="' + f.id + '" href="#fnref-' + f.id +
                         '" contenteditable="false" title="Back to reference">↩</a></li>';
            }
            return '<section class="rte-footnotes"><h2 class="rte-fn-title">Footnotes</h2>' +
                   '<ol class="rte-fn-list" data-numbering="decimal">' + items + "</ol></section>";
        }
        // Runs inside a w:ins / w:del wrapper, rendered with the review markup
        // that the DOCX *export* already round-trips (<ins data-author>/<del>).
        function revisionHtml(node, tag) {
            var inner = "";
            for (var i = 0; i < node.childNodes.length; i++) {
                var c = node.childNodes[i];
                if (c.nodeType !== 1) continue;
                if (c.localName === "r") inner += runHtml(c);
                else if (c.localName === "ins") inner += revisionHtml(c, "ins");
                else if (c.localName === "del") inner += revisionHtml(c, "del");
            }
            if (!inner) return "";
            var author = node.getAttributeNS(W, "author") || node.getAttribute("w:author") || "";
            var date = node.getAttributeNS(W, "date") || node.getAttribute("w:date") || "";
            return "<" + tag +
                (author ? ' data-author="' + esc(author) + '"' : "") +
                (date ? ' data-date="' + esc(date) + '"' : "") +
                ">" + inner + "</" + tag + ">";
        }

        function paraInner(p) {
            var h = "", kids = p.childNodes;
            // Word marks a commented RANGE with start/end markers around the runs,
            // so the wrapper has to be opened and closed as we walk, not derived
            // from any single element.
            var openComments = [];
            function commentOpen(id) {
                var c = ctx.comments[String(id)];
                if (!c) return "";
                openComments.push(id);
                return '<span data-comment="' + esc(c.text) + '"' +
                       (c.author ? ' data-comment-author="' + esc(c.author) + '"' : "") + ">";
            }
            for (var i = 0; i < kids.length; i++) {
                var c = kids[i];
                if (c.nodeType === 1 && c.localName === "commentRangeStart") {
                    h += commentOpen(c.getAttributeNS(W, "id") || c.getAttribute("w:id"));
                    continue;
                }
                if (c.nodeType === 1 && c.localName === "commentRangeEnd") {
                    if (openComments.length) { openComments.pop(); h += "</span>"; }
                    continue;
                }
                if (c.nodeType === 1 && (c.localName === "ins" || c.localName === "del") && c.namespaceURI === W) {
                    h += revisionHtml(c, c.localName);
                    continue;
                }
                // EQUATIONS. OMML is a sibling of the runs, in its own
                // namespace -- a walker that only recognises w:r skips it and
                // the equation is gone. m:oMathPara is the display (own-line)
                // wrapper around one or more m:oMath.
                if (c.nodeType === 1 && c.namespaceURI === OMML_NS &&
                    (c.localName === "oMath" || c.localName === "oMathPara")) {
                    h += mathHtml(c);
                    continue;
                }
                if (c.nodeType === 1 && c.localName === "r" && c.namespaceURI === W) h += runHtml(c);
                else if (c.nodeType === 1 && c.localName === "hyperlink") {
                    var inner = "";
                    for (var j = 0; j < c.childNodes.length; j++) if (c.childNodes[j].localName === "r") inner += runHtml(c.childNodes[j]);
                    // Resolve r:id through the rels part. Previously the run text
                    // was emitted bare and the URL was thrown away, so every link
                    // in an imported document became plain text.
                    var rel = relTarget(c);
                    var anchor = c.getAttributeNS(W, "anchor") || c.getAttribute("w:anchor");
                    var href = rel ? rel.target : (anchor ? "#" + anchor : null);
                    h += href ? ('<a href="' + esc(href) + '">' + (inner || esc(href)) + "</a>") : inner;
                }
            }
            // A comment range left open at the end of the paragraph would leak an
            // unbalanced <span> into the document.
            while (openComments.length) { openComments.pop(); h += "</span>"; }
            return h;
        }
        function paraStyle(p) {
            var ppr = firstChildEl(p, "pPr"); if (!ppr) return {};
            var info = {};
            var ps = firstChildEl(ppr, "pStyle");
            if (ps) { var v = ps.getAttributeNS(W, "val") || ps.getAttribute("w:val") || ""; var m = /heading(\d)/i.exec(v); if (m) info.heading = Math.min(6, parseInt(m[1], 10)); }
            var numPr = firstChildEl(ppr, "numPr");
            if (numPr) {
                info.list = true;
                var ilvl = firstChildEl(numPr, "ilvl");
                var numId = firstChildEl(numPr, "numId");
                info.level = parseInt(ilvl ? (ilvl.getAttributeNS(W, "val") || ilvl.getAttribute("w:val") || "0") : "0", 10) || 0;
                var nid = numId ? (numId.getAttributeNS(W, "val") || numId.getAttribute("w:val") || "") : "";
                var levels = ctx.numbering[nid];
                var fmt = levels ? levels[String(info.level)] : null;
                // Word marks bullets with numFmt="bullet"; anything else is an
                // ordered list. Defaulting to bullet when numbering.xml is absent
                // matches the old behaviour rather than inventing <ol>s.
                info.ordered = !!fmt && fmt !== "bullet" && fmt !== "none";
            }
            var jc = firstChildEl(ppr, "jc");
            if (jc) {
                var a = jc.getAttributeNS(W, "val") || jc.getAttribute("w:val") || "";
                if (a === "center" || a === "right" || a === "both") {
                    info.align = (a === "both") ? "justify" : a;
                }
            }
            return info;
        }
        var body = els(doc, "body")[0];
        if (!body) return "";
        var out = [];
        // Stack of open lists so w:ilvl produces real nesting instead of a flat
        // run of <li>s. liOpen tracks whether an <li> is still open at each
        // depth, because a nested list must live INSIDE its parent <li> --
        // <ol><li>a</li><ol>...</ol></ol> is invalid HTML, and shipping invalid
        // markup out of an importer undermines the whole clean-output promise.
        var listStack = [];
        var liOpen = [];
        function closeListsTo(depth) {
            while (listStack.length > depth) {
                var d = listStack.length - 1;
                if (liOpen[d]) { out.push("</li>"); liOpen[d] = false; }
                out.push("</" + listStack.pop() + ">");
                liOpen.pop();
            }
        }
        for (var i = 0; i < body.childNodes.length; i++) {
            var node = body.childNodes[i];
            if (node.nodeType !== 1) continue;
            // A display equation can sit at body level rather than inside a
            // w:p, so the "wordprocessingml namespace only" filter below would
            // drop it.
            if (node.namespaceURI === OMML_NS &&
                (node.localName === "oMathPara" || node.localName === "oMath")) {
                closeListsTo(0);
                var mh = mathHtml(node);
                if (mh) out.push("<p>" + mh + "</p>");
                continue;
            }
            if (node.namespaceURI !== W) continue;
            if (node.localName === "p") {
                var st = paraStyle(node);
                var inner = paraInner(node);
                if (st.list) {
                    var want = (st.level || 0) + 1;
                    var tag = st.ordered ? "ol" : "ul";
                    // Come back up to this depth FIRST. Checking the type before
                    // this ran compared against the wrong level, so a bullet
                    // following a deeper numbered item silently joined the <ol>.
                    if (listStack.length > want) closeListsTo(want);
                    // Now at this depth: a different list type means a new list.
                    if (listStack.length === want && listStack[want - 1] !== tag) closeListsTo(want - 1);
                    // Going deeper leaves the parent <li> open so the sublist
                    // nests inside it.
                    while (listStack.length < want) {
                        out.push("<" + tag + ">");
                        listStack.push(tag);
                        liOpen.push(false);
                    }
                    if (liOpen[want - 1]) { out.push("</li>"); liOpen[want - 1] = false; }
                    out.push("<li>" + (inner || ""));
                    liOpen[want - 1] = true;
                    continue;
                }
                closeListsTo(0);
                if (st.heading) out.push("<h" + st.heading + ">" + (inner || "") + "</h" + st.heading + ">");
                else {
                    var style = st.align ? ' style="text-align:' + st.align + '"' : "";
                    // A paragraph that contained ONLY a text box has no text of
                    // its own; emitting an empty <p> before the box adds a blank
                    // line that was never in the document.
                    var boxes = flushBlocks();
                    if (inner || !boxes) out.push("<p" + style + ">" + (inner || "<br>") + "</p>");
                    if (boxes) out.push(boxes);
                }
            } else if (node.localName === "tbl") {
                closeListsTo(0);
                out.push(tableHtml(node));
            }
        }
        closeListsTo(0);
        // A text box hanging off the last paragraph, or off a heading/list item,
        // still has to land somewhere.
        var trailing = flushBlocks();
        if (trailing) out.push(trailing);
        // The notes section goes last, after every marker has been collected.
        var notes = footnotesSection();
        if (notes) out.push(notes);
        return out.join("\n");

        function tableHtml(tbl) {
            var rows = [], kids = tbl.childNodes;
            for (var i = 0; i < kids.length; i++) {
                var tr = kids[i];
                if (tr.nodeType !== 1 || tr.localName !== "tr") continue;
                var cells = [];
                for (var j = 0; j < tr.childNodes.length; j++) {
                    var tc = tr.childNodes[j];
                    if (tc.nodeType !== 1 || tc.localName !== "tc") continue;
                    var cellHtml = "";
                    for (var k = 0; k < tc.childNodes.length; k++) {
                        if (tc.childNodes[k].localName === "p") cellHtml += "<p>" + (paraInner(tc.childNodes[k]) || "<br>") + "</p>";
                    }
                    cells.push("<td>" + cellHtml + "</td>");
                }
                rows.push("<tr>" + cells.join("") + "</tr>");
            }
            return "<table>" + rows.join("") + "</table>";
        }
    }

    function notify(msg) {
        try {
            if (editor && typeof editor.createDialog === "function") {
                var d = editor.createDialog((editor.getLangText && editor.getLangText("importtitle")) || "Import document", "rte-dialog-import");
                var w = d.ownerDocument.createElement("div");
                w.style.cssText = "padding:16px;max-width:420px;font:13px -apple-system,Segoe UI,sans-serif;line-height:1.5";
                w.textContent = msg;
                d.appendChild(w);
                return;
            }
        } catch (e) {}
        if (window.console) console.warn("documentimport:", msg);
    }
}
