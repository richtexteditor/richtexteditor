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

        // NOTE: do NOT call editor.slashCommands.register() from here. Plugins
        // initialise in bundle (alphabetical) order and this file sorts before
        // "slashcommand", so editor.slashCommands does not exist yet and the guarded
        // call silently did nothing - the "import-document" slash entry never appeared for any
        // customer until 2026-09-02. The entry now lives in slashcommand.js, gated on
        // typeof editor.openImportDialog === "function" (same pattern as exportToPdf).
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
        // 2026-10-03 undoable: Ctrl+Z after an import gives back exactly the document it replaced
        // (tools/import/import-undo.mjs)
        if (typeof editor.setHTMLCode === "function") { editor.setHTMLCode(html, { undoable: true }); return true; }
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
                        notify((config && config.text_imp_nounpack) || "This browser can't unpack .docx (no DecompressionStream). Save as .doc/.html/.md, or wire config.documentImportResolver.");
                        resolve(false);
                        return;
                    }
                    readDocx(file).then(function (html) {
                        if (html != null) resolve(applyHtml(html, mode));
                        else { notify((config && config.text_imp_badfile) || "Could not read this .docx file."); resolve(false); }
                    }, function () { notify((config && config.text_imp_badfile) || "Could not read this .docx file."); resolve(false); });
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
            // 2026-10-15 the document's default language, so it is not repeated as lang= on every run. tools/docx/run-props.mjs
            if (byName["word/styles.xml"]) {
                jobs.push(entryBytes(byName["word/styles.xml"]).then(function (b) {
                    var mm = /<w:docDefaults>[\s\S]*?<w:lang[^>]*w:val="([^"]+)"/.exec(utf8(b));
                    if (mm) ctx.defaultLang = mm[1].toLowerCase();
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
                    // 2026-10-04 the level's start number ("s" + ilvl), read by the list builder
                    var stEl = lvls[j].getElementsByTagNameNS(W, "start")[0];
                    if (stEl) levels["s" + ilvl] = parseInt(val(stEl), 10) || 1;
                }
                if (aid != null) abstracts[aid] = levels;
            }
            // num -> abstractNumId
            var nums = d.getElementsByTagNameNS(W, "num");
            for (var k = 0; k < nums.length; k++) {
                var nid = nums[k].getAttributeNS(W, "numId") || nums[k].getAttribute("w:numId");
                var ref = nums[k].getElementsByTagNameNS(W, "abstractNumId")[0];
                var aref = val(ref);
                if (nid != null && abstracts[aref]) {
                    // a copy per num: its lvlOverride/startOverride (how Word restarts a list) is its own
                    var own = {};
                    for (var key in abstracts[aref]) own[key] = abstracts[aref][key];
                    var ovs = nums[k].getElementsByTagNameNS(W, "lvlOverride");
                    for (var oi = 0; oi < ovs.length; oi++) {
                        var oIl = ovs[oi].getAttributeNS(W, "ilvl") || ovs[oi].getAttribute("w:ilvl") || "0";
                        var so = ovs[oi].getElementsByTagNameNS(W, "startOverride")[0];
                        if (so) own["s" + oIl] = parseInt(val(so), 10) || 1;
                    }
                    out[nid] = own;
                }
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
        "\u2211": "\\sum", "\u220f": "\\prod", "\u2210": "\\coprod",
        "\u222b": "\\int", "\u222c": "\\iint", "\u222d": "\\iiint", "\u222e": "\\oint",
        "\u22c3": "\\bigcup", "\u22c2": "\\bigcap",
        "\xb1": "\\pm", "\u2213": "\\mp", "\xd7": "\\times", "\xf7": "\\div",
        "\u2212": "-", "\u2260": "\\neq", "\u2264": "\\leq", "\u2265": "\\geq",
        "\u2248": "\\approx", "\u2261": "\\equiv", "\u221d": "\\propto",
        "\u221e": "\\infty", "\u2202": "\\partial", "\u2207": "\\nabla",
        "\u221a": "\\sqrt", "\u2220": "\\angle", "\u22c5": "\\cdot", "\u2026": "\\dots",
        "\u2192": "\\to", "\u2190": "\\leftarrow", "\u21d2": "\\Rightarrow", "\u21d4": "\\Leftrightarrow",
        "\u2208": "\\in", "\u2209": "\\notin", "\u2282": "\\subset", "\u2286": "\\subseteq",
        "\u222a": "\\cup", "\u2229": "\\cap", "\u2205": "\\emptyset",
        "\u2200": "\\forall", "\u2203": "\\exists", "\xac": "\\neg",
        "\u2227": "\\land", "\u2228": "\\lor", "\u2234": "\\therefore",
        "\u03b1": "\\alpha", "\u03b2": "\\beta", "\u03b3": "\\gamma", "\u03b4": "\\delta",
        "\u03b5": "\\epsilon", "\u03b6": "\\zeta", "\u03b7": "\\eta", "\u03b8": "\\theta",
        "\u03b9": "\\iota", "\u03ba": "\\kappa", "\u03bb": "\\lambda", "\u03bc": "\\mu",
        "\u03bd": "\\nu", "\u03be": "\\xi", "\u03c0": "\\pi", "\u03c1": "\\rho",
        "\u03c3": "\\sigma", "\u03c4": "\\tau", "\u03c5": "\\upsilon", "\u03c6": "\\varphi",
        "\u03c7": "\\chi", "\u03c8": "\\psi", "\u03c9": "\\omega",
        "\u0393": "\\Gamma", "\u0394": "\\Delta", "\u0398": "\\Theta", "\u039b": "\\Lambda",
        "\u039e": "\\Xi", "\u03a0": "\\Pi", "\u03a3": "\\Sigma", "\u03a6": "\\Phi",
        "\u03a8": "\\Psi", "\u03a9": "\\Omega"
    };
    // Accent character -> TeX accent command (m:acc carries the mark as a chr).
    var MATH_ACCENTS = {
        "\u0302": "\\hat", "\u0303": "\\tilde", "\u0304": "\\bar", "\u0305": "\\overline",
        "\u0306": "\\breve", "\u0307": "\\dot", "\u0308": "\\ddot", "\u030a": "\\mathring",
        "\u030c": "\\check", "\u2192": "\\vec", "\u20d7": "\\vec", "\u0301": "\\acute", "\u0300": "\\grave"
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
                    var chr = propOf(el, "naryPr", "chr") || "\u222b";
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
                        if (ch === "\u2016") return "\\|";
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
                        if (ch === "\u230a") return "\\lfloor";
                        if (ch === "\u230b") return "\\rfloor";
                        if (ch === "\u2308") return "\\lceil";
                        if (ch === "\u2309") return "\\rceil";
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
                    var mark = propOf(el, "accPr", "chr") || "\u0302";
                    var cmd = MATH_ACCENTS[mark] || "\\hat";
                    return cmd + arg(child(el, "e"));
                }
                case "bar":
                    return (propOf(el, "barPr", "pos") === "bot" ? "\\underline" : "\\overline") + arg(child(el, "e"));
                case "groupChr": {
                    var g = propOf(el, "groupChrPr", "chr");
                    if (g === "\u23df") return "\\underbrace" + arg(child(el, "e"));
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
        // 2026-10-15 with its alt text (<wp:docPr descr>, else title) and size (<wp:extent>, EMU; or a VML shape's
        // width/height in pt): every picture came back alt="" at natural size. tools/docx/image-alt-size.mjs
        function imageAttrs(node) {
            var all = node.getElementsByTagName("*"), alt = "", w = 0, h = 0;
            for (var i = 0; i < all.length; i++) {
                var e = all[i], ln = e.localName;
                if (ln === "docPr") alt = e.getAttribute("descr") || e.getAttribute("title") || "";
                else if (ln === "extent" && !w) { w = Math.round((parseInt(e.getAttribute("cx"), 10) || 0) * 96 / 914400); h = Math.round((parseInt(e.getAttribute("cy"), 10) || 0) * 96 / 914400); }
                else if (ln === "shape" && !w) {
                    var st = e.getAttribute("style") || "", mw = /width:\s*([\d.]+)pt/.exec(st), mh = /height:\s*([\d.]+)pt/.exec(st);
                    if (mw && mh) { w = Math.round(parseFloat(mw[1]) * 96 / 72); h = Math.round(parseFloat(mh[1]) * 96 / 72); }
                    if (!alt) alt = e.getAttribute("alt") || "";
                }
            }
            // esc() leaves quotes alone; this is an attribute value
            return ' alt="' + esc(alt).replace(/"/g, "&quot;") + '"' + (w > 0 && h > 0 ? ' width="' + w + '" height="' + h + '"' : "");
        }
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
                if (uri) return '<img src="' + uri + '"' + imageAttrs(node) + '>';
                if (rel.external) return '<img src="' + esc(rel.target) + '"' + imageAttrs(node) + '>';
                // A vector metafile (WMF/EMF) has no browser-renderable form, so
                // there is no data URI for it. Dropping it silently leaves the
                // reader with no idea a figure was ever there -- and no filename
                // to go looking for in the original.
                if (/\.(wmf|emf|emz|wmz)$/i.test(path)) {
                    var fileName = path.split("/").pop();
                    queueBlock('<p class="rte-imported-unsupported" data-source="' + esc(fileName) +
                               '"><em>[Unsupported image: ' + esc(fileName) +
                               " \u2014 Windows metafiles have no browser-renderable form]</em></p>");
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
                // 2026-10-15 a PAGE break is not a line break: mark it so the paragraph can be split around the
                // editor's page-break marker. tools/docx/page-breaks.mjs
                else if (c.localName === "br" && (c.getAttributeNS(W, "type") || c.getAttribute("w:type")) === "page") t += "\f";
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
                // w:shd is the OTHER way Word carries a background, and it is the
                // one our own exporter writes (w:highlight only accepts a fixed
                // set of colour NAMES, shd takes any hex). Reading only
                // w:highlight meant every highlight we exported came back
                // unhighlighted - the two sides used different vocabulary for the
                // same thing.
                var shd = firstChildEl(rpr, "shd");
                if (shd) {
                    var fill = shd.getAttributeNS(W, "fill") || shd.getAttribute("w:fill") || "";
                    if (fill && /^[0-9A-Fa-f]{6}$/.test(fill)) css += "background-color:#" + fill + ";";
                }
                // Monospace run -> inline code. Our exporter marks <code>/<kbd>/
                // <samp>/<pre> with w:rFonts Consolas; nothing read it back.
                var rf = firstChildEl(rpr, "rFonts");
                if (rf) {
                    var asc = rf.getAttributeNS(W, "ascii") || rf.getAttribute("w:ascii") || "";
                    if (/consolas|courier|monospace|mono$/i.test(asc)) txt = "<code>" + txt + "</code>";
                    else if (asc) css += "font-family:" + asc.replace(/[<>"]/g, "") + ";";
                }
                var sz = firstChildEl(rpr, "sz");
                if (sz) {
                    var sv = parseInt(sz.getAttributeNS(W, "val") || sz.getAttribute("w:val") || "", 10);
                    if (sv > 0) css += "font-size:" + (sv / 2) + "pt;";
                }
                // 2026-10-15 small caps, caps, letter spacing and the phrase's language. tools/docx/run-props.mjs
                var sc = firstChildEl(rpr, "smallCaps"), cp = firstChildEl(rpr, "caps");
                function on(el) { var v = el.getAttributeNS(W, "val") || el.getAttribute("w:val") || ""; return !/^(0|false|off)$/.test(v); }
                if (sc && on(sc)) css += "font-variant:small-caps;";
                if (cp && on(cp)) css += "text-transform:uppercase;";
                var spc = firstChildEl(rpr, "spacing");
                if (spc) { var spv = parseInt(spc.getAttributeNS(W, "val") || spc.getAttribute("w:val") || "", 10); if (spv) css += "letter-spacing:" + (Math.round(spv / 15 * 100) / 100) + "px;"; }
                var lg = firstChildEl(rpr, "lang"), lang = "";
                if (lg) {
                    lang = (lg.getAttributeNS(W, "val") || lg.getAttribute("w:val") || "").replace(/[^A-Za-z0-9-]/g, "");
                    // a run in the document's own language says nothing: Word stamps it on nearly every run
                    if (ctx.defaultLang ? lang.toLowerCase() === ctx.defaultLang : /^en(-|$)/i.test(lang)) lang = "";
                }
                if (css || lang) txt = "<span" + (lang ? ' lang="' + lang + '"' : "") + (css ? ' style="' + css + '"' : "") + ">" + txt + "</span>";
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
                         '" contenteditable="false" title="Back to reference">\u21a9</a></li>';
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
            if (ps) {
                var v = ps.getAttributeNS(W, "val") || ps.getAttribute("w:val") || "";
                var m = /heading(\d)/i.exec(v);
                if (m) info.heading = Math.min(6, parseInt(m[1], 10));
                // docxexport.js writes blockquotes as the "Quote" paragraph style;
                // without this they came back as plain <p> and the round-trip lost
                // every blockquote. Match Quote / IntenseQuote / BlockQuote.
                else if (/^(intense)?quote$|blockquote/i.test(v.replace(/\s+/g, ""))) info.quote = true;
                // docxexport.js writes <w:pStyle w:val="Code"/> for <pre>; without
                // this a code block came back as an ordinary paragraph and lost
                // both its monospace and its whitespace.
                else if (/^(code|sourcecode|htmlpre|preformatted)$/i.test(v.replace(/\s+/g, ""))) info.pre = true;
            }
            // A horizontal rule is exported as an EMPTY paragraph carrying a
            // bottom border - Word has no <hr>. Nothing read it back, so every
            // rule became a stray blank paragraph on import.
            var pbdr = firstChildEl(ppr, "pBdr");
            if (pbdr && firstChildEl(pbdr, "bottom")) info.rule = true;
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
                info.numId = nid;
                info.start = (levels && levels["s" + info.level]) || 1;
                // 2026-10-04 Word's lettered / Roman formats come back as list-style-type (they became 1. 2. 3.)
                info.listStyle = { lowerLetter: "lower-alpha", upperLetter: "upper-alpha", lowerRoman: "lower-roman", upperRoman: "upper-roman" }[fmt] || "";
            }
            // Word paragraph indentation. Nothing read this before 2026-09-04,
            // so every indented paragraph in every imported .docx arrived
            // flush left and the indentation was lost silently.
            // w:left is in twips; 15 twips = 1px.
            var ind = firstChildEl(ppr, "ind");
            if (ind) {
                var lft = ind.getAttributeNS(W, "left") || ind.getAttribute("w:left") || "";
                var tw = parseInt(lft, 10);
                // 720 twips alongside the Quote style is the blockquote's own
                // indent, already carried by the blockquote element itself.
                if (tw > 0 && !(info.quote && tw === 720))
                    info.indentPx = Math.round(tw / 15);
                // 2026-10-15 first-line / hanging indent, line spacing and direction were not read.
                // tools/docx/paragraph-props.mjs
                var fl = parseInt(ind.getAttributeNS(W, "firstLine") || ind.getAttribute("w:firstLine") || "", 10);
                var hg = parseInt(ind.getAttributeNS(W, "hanging") || ind.getAttribute("w:hanging") || "", 10);
                if (hg > 0) info.textIndentPx = -Math.round(hg / 15);
                else if (fl > 0) info.textIndentPx = Math.round(fl / 15);
            }
            var sp = firstChildEl(ppr, "spacing");
            if (sp) {
                var ln = parseInt(sp.getAttributeNS(W, "line") || sp.getAttribute("w:line") || "", 10);
                var rule = sp.getAttributeNS(W, "lineRule") || sp.getAttribute("w:lineRule") || "auto";
                // Word's default single spacing (240 auto) is not worth a style
                if (ln > 0 && !(rule === "auto" && ln === 240)) info.lineHeight = rule === "auto" ? String(Math.round(ln / 240 * 100) / 100) : Math.round(ln / 15) + "px";
            }
            var bidi = firstChildEl(ppr, "bidi");
            if (bidi && !/^(0|false|off)$/.test(bidi.getAttributeNS(W, "val") || bidi.getAttribute("w:val") || "")) info.rtl = true;
            if (firstChildEl(ppr, "pageBreakBefore")) info.pageBreakBefore = true;
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
        // 2026-10-04 items already numbered per numId and level: Word continues a list across
        // other paragraphs (same numId), so a list reopened here numbers on, and a list that does not
        // start at 1 keeps its start. Both restarted at 1. tools/docx/import-list-start.mjs
        var numCount = {};
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
                // 2026-10-15 page breaks come back as the editor's page-break marker (they were dropped):
                // <w:pageBreakBefore/> before the paragraph, <w:br w:type="page"/> splitting it. tools/docx/page-breaks.mjs
                if (st.pageBreakBefore) { closeListsTo(0); out.push(pageBreakHtml()); }
                if (inner && inner.indexOf("\f") !== -1) {
                    if (!st.list && !st.heading && !st.pre && !st.quote) {
                        var pbParts = inner.split("\f");
                        inner = pbParts.pop();
                        closeListsTo(0);
                        for (var pbi = 0; pbi < pbParts.length; pbi++) {
                            if (pbParts[pbi].replace(/<[^>]*>/g, "").trim()) out.push("<p>" + pbParts[pbi] + "</p>");
                            out.push(pageBreakHtml());
                        }
                    } else inner = inner.split("\f").join("");
                }
                // 2026-10-15 a paragraph that starts with a ballot box (open U+2610, ticked U+2611 / U+2612) is a task
                // item: that is how our export and Google Docs write a checklist, and how one is typed in Word. Each
                // becomes a one-item task list; adjacent ones are joined at the end. tools/docx/task-list.mjs
                var taskM = !st.list && !st.heading && inner && /^((?:<[^>]+>)*)\s*([\u2610\u2611\u2612])[\s\u00a0]?/.exec(inner);
                if (taskM) {
                    closeListsTo(0);
                    var taskBody = taskM[1] + inner.slice(taskM[0].length);
                    out.push('<ul class="rte-task-list"><li class="rte-task-item" data-checked="' + (taskM[2] === "\u2610" ? "false" : "true") + '"><span class="rte-task-checkbox" contenteditable="false"></span>' + (taskBody || "<br>") + "</li></ul>");
                    var tboxes = flushBlocks();
                    if (tboxes) out.push(tboxes);
                    continue;
                }
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
                        var olStart = (tag === "ol" && listStack.length === want - 1) ? (st.start || 1) + (numCount[st.numId + ":" + st.level] || 0) : 1;
                        var olAttrs = (olStart !== 1 ? " start=\"" + olStart + "\"" : "") +
                            (tag === "ol" && listStack.length === want - 1 && st.listStyle ? " style=\"list-style-type: " + st.listStyle + "\"" : "");
                        out.push("<" + tag + olAttrs + ">");
                        listStack.push(tag);
                        liOpen.push(false);
                    }
                    if (liOpen[want - 1]) { out.push("</li>"); liOpen[want - 1] = false; }
                    if (st.ordered) {
                        var ck = st.numId + ":" + st.level;
                        numCount[ck] = (numCount[ck] || 0) + 1;
                    }
                    // any higher-level item - a BULLET too (2026-10-05 review) - restarts the numbered
                    // levels below it (Word's default lvlRestart)
                    for (var cKey in numCount) {
                        var cp = cKey.split(":");
                        if (cp[0] === String(st.numId) && +cp[1] > st.level) numCount[cKey] = 0;
                    }
                    out.push("<li>" + (inner || ""));
                    liOpen[want - 1] = true;
                    continue;
                }
                closeListsTo(0);
                // Only a rule when the paragraph carries no text of its own -
                // a bordered paragraph WITH content is a real bordered paragraph.
                if (st.rule && !(inner || "").replace(/<[^>]*>/g, "").trim()) {
                    closeListsTo(0); out.push("<hr>"); continue;
                }
                if (st.pre) { out.push("<pre>" + (inner || "<br>") + "</pre>"); continue; }
                if (st.heading) {
                    // Headings carry w:ind too; without this an indented
                    // heading imported flush left.
                    var hs = st.indentPx ? ' style="margin-left:' + st.indentPx + 'px"' : "";
                    out.push("<h" + st.heading + hs + ">" + (inner || "") + "</h" + st.heading + ">");
                }
                else if (st.quote) out.push("<blockquote>" + (inner || "<br>") + "</blockquote>");
                else {
                    var decl = [];
                    if (st.align) decl.push("text-align:" + st.align);
                    // indentUseMargin defaults to margin, and margin is what
                    // w:ind means, so import writes margin-left to match.
                    if (st.indentPx) decl.push("margin-left:" + st.indentPx + "px");
                    if (st.textIndentPx) decl.push("text-indent:" + st.textIndentPx + "px");
                    if (st.lineHeight) decl.push("line-height:" + st.lineHeight);
                    var style = (st.rtl ? ' dir="rtl"' : "") + (decl.length ? ' style="' + decl.join(";") + '"' : "");
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
        // one task list per run of task items
        return out.join("\n").replace(/<\/ul>\n<ul class="rte-task-list">/g, "");

        // the editor's own page-break marker (rte.js __UI_InsertPageBreak), so it looks and behaves the same
        function pageBreakHtml() {
            var lbl = editor && editor.getLangText ? editor.getLangText("insertpagebreak") : "";
            if (!lbl || lbl === "insertpagebreak") lbl = "Page break";
            return '<div data-rte-page-break="true" contenteditable="false" style="position:relative;text-align:center;border-top:2px dashed #94a3b8;margin:18px 0 14px;padding:0;height:0;line-height:0;user-select:none;">' +
                '<span style="position:relative;top:-0.75em;display:inline-block;padding:0 10px;background:#fff;color:#64748b;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;line-height:1.6;">' + esc(lbl) + "</span></div>";
        }
        function tableHtml(tbl) {
            var rows = [], kids = tbl.childNodes;
            // 2026-10-15 merged cells: <w:gridSpan> is colspan; <w:vMerge w:val="restart"/> starts a rowspan and each
            // bare <w:vMerge/> below it, at the same grid column, extends it instead of becoming a cell. Both were
            // ignored, so merged cells came back split. tools/docx/merged-cells.mjs
            var openMerge = {};
            function wv(el) { return el ? (el.getAttributeNS(W, "val") || el.getAttribute("w:val") || "") : ""; }
            for (var i = 0; i < kids.length; i++) {
                var tr = kids[i];
                if (tr.nodeType !== 1 || tr.localName !== "tr") continue;
                // docxexport.js marks a header row with <w:trPr><w:tblHeader/>.
                // Without honouring it, every cell imported as <td> and the table
                // lost its header semantics on round-trip - which then fails the
                // accessibility checker's table-missing-header rule.
                var trPr = firstChildEl(tr, "trPr");
                var isHeaderRow = !!(trPr && firstChildEl(trPr, "tblHeader"));
                var cellTag = isHeaderRow ? "th" : "td";
                var cells = [], gcol = 0;
                for (var j = 0; j < tr.childNodes.length; j++) {
                    var tc = tr.childNodes[j];
                    if (tc.nodeType !== 1 || tc.localName !== "tc") continue;
                    var tcPr = firstChildEl(tc, "tcPr");
                    var span = parseInt(wv(tcPr && firstChildEl(tcPr, "gridSpan")), 10) || 1;
                    var vm = tcPr && firstChildEl(tcPr, "vMerge");
                    if (vm && wv(vm) !== "restart" && openMerge[gcol]) { openMerge[gcol].rowspan++; gcol += span; continue; }
                    var cellHtml = "";
                    for (var k = 0; k < tc.childNodes.length; k++) {
                        if (tc.childNodes[k].localName === "p") cellHtml += "<p>" + (paraInner(tc.childNodes[k]) || "<br>") + "</p>";
                    }
                    var cellObj = { tag: cellTag, html: cellHtml, colspan: span, rowspan: 1 };
                    cells.push(cellObj);
                    for (var sc = gcol; sc < gcol + span; sc++) delete openMerge[sc];
                    if (vm && wv(vm) === "restart") openMerge[gcol] = cellObj;
                    gcol += span;
                }
                rows.push(cells);
            }
            // 2026-10-15 the grid's column widths (as percentages, so the ratio holds at any page width) and a
            // percentage table width. tools/docx/table-widths.mjs
            var head = "<table", colgroup = "";
            var tPr = firstChildEl(tbl, "tblPr"), tW = tPr && firstChildEl(tPr, "tblW");
            if (tW && (tW.getAttributeNS(W, "type") || tW.getAttribute("w:type")) === "pct") {
                var pv = String(tW.getAttributeNS(W, "w") || tW.getAttribute("w:w") || "");
                var pn = /%$/.test(pv) ? parseFloat(pv) : parseFloat(pv) / 50;
                if (pn > 0) head += ' style="width:' + (Math.round(pn * 10) / 10) + '%"';
            }
            var grid = firstChildEl(tbl, "tblGrid");
            if (grid) {
                var gws = [], gsum = 0;
                for (var gi = 0; gi < grid.childNodes.length; gi++) {
                    var gc = grid.childNodes[gi];
                    if (gc.nodeType !== 1 || gc.localName !== "gridCol") continue;
                    var gw = parseInt(gc.getAttributeNS(W, "w") || gc.getAttribute("w:w") || "", 10) || 0;
                    gws.push(gw); gsum += gw;
                }
                if (gws.length > 1 && gsum > 0 && gws.every(function (g) { return g > 0; }))
                    colgroup = "<colgroup>" + gws.map(function (g) { return '<col style="width:' + (Math.round(g / gsum * 1000) / 10) + '%">'; }).join("") + "</colgroup>";
            }
            return head + ">" + colgroup + rows.map(function (cs) {
                return "<tr>" + cs.map(function (c) {
                    return "<" + c.tag + (c.colspan > 1 ? ' colspan="' + c.colspan + '"' : "") + (c.rowspan > 1 ? ' rowspan="' + c.rowspan + '"' : "") + ">" + c.html + "</" + c.tag + ">";
                }).join("") + "</tr>";
            }).join("") + "</table>";
        }
    }

    function notify(msg) {
        try {
            if (editor && typeof editor.createDialog === "function") {
                // 2026-10-18 getLangText returns the KEY when a pack lacks it, so this dialog was titled "importtitle" on every
                // page; the title and messages read config.text_ keys. tools/i18n/raw-key-titles.mjs
                var d = editor.createDialog((config && config.text_importtitle) || "Import document", "rte-dialog-import");
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
