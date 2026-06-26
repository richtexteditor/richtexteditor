if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-09 Document import — the natural pair to Export-to-Word/Markdown/PDF.
// Opens a local file and loads it into the editor. Library-free for the common
// formats: Markdown (.md/.markdown via the core fromMarkdown engine), HTML
// (.html/.htm), plain text (.txt), and Word's HTML-based format (.doc, which
// Word saves as MSO-flavored HTML) — Word junk (mso-* styles, o:/w: tags,
// conditional comments) is stripped the same way paste-from-Word is.
//
// Zipped .docx is NOT parseable library-free (it's a ZIP of XML); for it (or to
// override any type) supply config.documentImportResolver(file) returning an
// HTML string or Promise<string>, so a server/library can convert it.
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

    function readDocx(file) {
        var bufPromise = file.arrayBuffer ? file.arrayBuffer() : new Promise(function (res, rej) {
            var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsArrayBuffer(file);
        });
        return bufPromise.then(function (ab) {
            var bytes = new Uint8Array(ab);
            var entry = findZipEntry(bytes, "word/document.xml");
            if (!entry) return null;
            var xmlPromise = entry.method === 0 ? Promise.resolve(entry.data) : inflateRaw(entry.data);
            return xmlPromise.then(function (xmlBytes) { return docxXmlToHtml(utf8(xmlBytes)); });
        });
    }

    function docxXmlToHtml(xml) {
        var doc = new DOMParser().parseFromString(xml, "application/xml");
        var W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
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
                if (c.localName === "t") t += c.textContent || "";
                else if (c.localName === "tab") t += "\t";
                else if (c.localName === "br" || c.localName === "cr") t += "\n";
            }
            return t;
        }
        function runHtml(r) {
            var txt = esc(runText(r));
            if (!txt) return "";
            txt = txt.replace(/\n/g, "<br>");
            var rpr = firstChildEl(r, "rPr");
            if (rpr) {
                if (firstChildEl(rpr, "b")) txt = "<strong>" + txt + "</strong>";
                if (firstChildEl(rpr, "i")) txt = "<em>" + txt + "</em>";
                if (firstChildEl(rpr, "u")) txt = "<u>" + txt + "</u>";
                if (firstChildEl(rpr, "strike")) txt = "<s>" + txt + "</s>";
            }
            return txt;
        }
        function paraInner(p) {
            var h = "", kids = p.childNodes;
            for (var i = 0; i < kids.length; i++) {
                var c = kids[i];
                if (c.nodeType === 1 && c.localName === "r" && c.namespaceURI === W) h += runHtml(c);
                else if (c.nodeType === 1 && c.localName === "hyperlink") {
                    for (var j = 0; j < c.childNodes.length; j++) if (c.childNodes[j].localName === "r") h += runHtml(c.childNodes[j]);
                }
            }
            return h;
        }
        function paraStyle(p) {
            var ppr = firstChildEl(p, "pPr"); if (!ppr) return {};
            var info = {};
            var ps = firstChildEl(ppr, "pStyle");
            if (ps) { var v = ps.getAttributeNS(W, "val") || ps.getAttribute("w:val") || ""; var m = /heading(\d)/i.exec(v); if (m) info.heading = Math.min(6, parseInt(m[1], 10)); }
            if (firstChildEl(ppr, "numPr")) info.list = true;
            return info;
        }
        var body = els(doc, "body")[0];
        if (!body) return "";
        var out = [], inList = false;
        function closeList() { if (inList) { out.push("</ul>"); inList = false; } }
        for (var i = 0; i < body.childNodes.length; i++) {
            var node = body.childNodes[i];
            if (node.nodeType !== 1 || node.namespaceURI !== W) continue;
            if (node.localName === "p") {
                var st = paraStyle(node);
                var inner = paraInner(node);
                if (st.list) { if (!inList) { out.push("<ul>"); inList = true; } out.push("<li>" + (inner || "") + "</li>"); continue; }
                closeList();
                if (st.heading) out.push("<h" + st.heading + ">" + (inner || "") + "</h" + st.heading + ">");
                else out.push("<p>" + (inner || "<br>") + "</p>");
            } else if (node.localName === "tbl") {
                closeList();
                out.push(tableHtml(node));
            }
        }
        closeList();
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
