if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-09 Export to Word. Closes the "no Word export" gap vs CKEditor /
// TinyMCE (both gate Word export behind premium). Library-free: wraps the
// document's HTML in a Word-compatible HTML container (MSO namespaces + print
// view + @page setup) and downloads it as a .doc, which Microsoft Word and
// LibreOffice open natively with formatting, tables, images, and lists intact.
// Read-only exporter — never mutates the document. Uses editor.getHTMLCode(),
// which already strips runtime-only classes, so the export is clean.
//
// API:
//   editor.getWordDocument(options)        -> full Word-compatible HTML string
//   editor.exportToWord(filename, options) -> downloads <filename>.doc
//   editor.downloadWord(filename, options)  (alias)
// Toolbar/command: exec_command "exportword". Slash: "/export word".
// Config:
//   config.wordExport = false                  // disable
//   config.wordExportFileName = "report"        // default base name
//   config.wordExportFontFamily = "Calibri, sans-serif"
//   config.wordExportFontSize = "11pt"
//   config.wordExportPageSize = "8.5in 11in"    // @page size (Letter default; "21cm 29.7cm" for A4)
//   config.wordExportMargin = "1in"
//   config.wordExportLandscape = false
RTE_DefaultConfig.plugin_wordexport = RTE_Plugin_WordExport;
if (typeof RTE_DefaultConfig.wordExport === "undefined") RTE_DefaultConfig.wordExport = true;

function RTE_Plugin_WordExport() {
    var obj = this;
    var config, editor;

    obj.PluginName = "WordExport";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.wordExport === false) return;

        // getWordDocument(options): the full Word-compatible HTML string.
        editor.getWordDocument = function (options) { return buildWordHtml(options || {}); };

        // exportToWord(filename, options): download as <filename>.doc.
        editor.exportToWord = function (filename, options) {
            var html = buildWordHtml(options || {});
            var base = sanitizeName(filename) || sanitizeName(config.wordExportFileName) || defaultBase();
            return triggerDownload(html, base + ".doc");
        };
        editor.downloadWord = editor.exportToWord;

        editor.attachEvent("exec_command_exportword", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            try { editor.exportToWord(); } catch (e) { if (window.console) console.error("wordexport:", e); }
        });

        // Discoverable as a slash command when the slash plugin is present.
        if (editor.slashCommands && typeof editor.slashCommands.register === "function") {
            try {
                // Disambiguated from the real OOXML exporter (docxexport.js).
                // Two menu entries both reading "Export to Word" is a coin toss
                // for the user, and the formats are genuinely different: this
                // one is HTML in a Word wrapper, which Word opens but nags on
                // save and round-trips poorly.
                editor.slashCommands.register({
                    id: "export-word",
                    title: "Export to Word (legacy .doc)",
                    description: "HTML wrapped for Word — use Export to Word (.docx) for a real OOXML file",
                    keywords: ["word", "doc", "legacy", "html", "export", "download"],
                    run: function () { editor.exportToWord(); }
                });
            } catch (e) {}
        }
    };

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function bodyHtml() {
        // getHTMLCode() yields the serialized, runtime-class-free document HTML.
        if (editor && typeof editor.getHTMLCode === "function") {
            var h = editor.getHTMLCode();
            if (h != null) return h;
        }
        var ed = editor && editor.getEditable ? editor.getEditable() : null;
        return ed ? ed.innerHTML : "";
    }

    // Paper size / margins / orientation stored on the document itself, so the
    // exported .doc matches the paginated page view and the PDF export. Returns
    // null when the document carries no page setup, in which case the explicit
    // options and the wordExport* config defaults apply exactly as before.
    function documentPageSetup() {
        try {
            if (!editor || typeof editor.getDocumentPageSetup !== "function") return null;
            var s = editor.getDocumentPageSetup();
            if (!s || typeof s !== "object") return null;
            var out = {};
            // width/height are normalized by the document model (e.g. "210mm").
            if (s.width && s.height) out.pageSize = s.width + " " + s.height;
            if (s.orientation) out.landscape = String(s.orientation).toLowerCase() === "landscape";
            var m = s.margins;
            if (m && typeof m === "object" && m.top && m.right && m.bottom && m.left) {
                // CSS shorthand order: top right bottom left.
                out.margin = m.top + " " + m.right + " " + m.bottom + " " + m.left;
            }
            return out;
        } catch (e) { return null; }
    }

    function buildWordHtml(options) {
        // Precedence: explicit call options > the document's own page setup >
        // wordExport* config > built-in Letter defaults.
        var docSetup = documentPageSetup() || {};
        var font = options.fontFamily || config.wordExportFontFamily || "Calibri, 'Segoe UI', Arial, sans-serif";
        var fontSize = options.fontSize || config.wordExportFontSize || "11pt";
        var pageSize = options.pageSize || docSetup.pageSize || config.wordExportPageSize || "8.5in 11in";
        var margin = options.margin || docSetup.margin || config.wordExportMargin || "1in";
        var landscape = (typeof options.landscape !== "undefined") ? options.landscape
            : (typeof docSetup.landscape !== "undefined") ? docSetup.landscape
            : config.wordExportLandscape;
        var title = esc(options.title || documentTitle() || "Document");
        var view = landscape ? "Print" : "Print";
        var orientation = landscape ? "landscape" : "portrait";

        // The MSO XML island tells Word to open in Print view at 100% zoom.
        // @page controls paper size/margins; the base body style sets the
        // default font. Inline styles in the body HTML take precedence, so the
        // document's own formatting is preserved.
        return "" +
            "<!DOCTYPE html>\r\n" +
            "<html xmlns:o=\"urn:schemas-microsoft-com:office:office\" " +
            "xmlns:w=\"urn:schemas-microsoft-com:office:word\" " +
            "xmlns=\"http://www.w3.org/TR/REC-html40\">\r\n" +
            "<head>\r\n" +
            "<meta charset=\"utf-8\">\r\n" +
            "<meta name=\"ProgId\" content=\"Word.Document\">\r\n" +
            "<title>" + title + "</title>\r\n" +
            "<!--[if gte mso 9]><xml>\r\n" +
            "<w:WordDocument><w:View>" + view + "</w:View><w:Zoom>100</w:Zoom>" +
            "<w:DoNotOptimizeForBrowser/></w:WordDocument>\r\n" +
            "</xml><![endif]-->\r\n" +
            "<style>\r\n" +
            "@page { size: " + esc(pageSize) + " " + orientation + "; margin: " + esc(margin) + "; }\r\n" +
            "body { font-family: " + esc(font) + "; font-size: " + esc(fontSize) + "; color: #000; }\r\n" +
            "table { border-collapse: collapse; }\r\n" +
            "td, th { border: 1px solid #999; padding: 4px 8px; }\r\n" +
            "img { max-width: 100%; height: auto; }\r\n" +
            "blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 12px; color: #444; }\r\n" +
            "pre { font-family: Consolas, 'Courier New', monospace; background: #f4f4f4; padding: 8px; }\r\n" +
            "</style>\r\n" +
            "</head>\r\n" +
            "<body>\r\n" + bodyHtml() + "\r\n</body>\r\n</html>";
    }

    function documentTitle() {
        try {
            var ed = editor.getEditable();
            if (ed) {
                var h = ed.querySelector("h1,h2,h3");
                if (h && h.textContent) return h.textContent.trim().slice(0, 80);
            }
        } catch (e) {}
        return "";
    }

    function defaultBase() {
        var t = documentTitle();
        var clean = sanitizeName(t);
        return clean || "document";
    }

    function sanitizeName(name) {
        if (!name) return "";
        // Strip control chars + filesystem-reserved characters, collapse spaces.
        return String(name)
            .replace(/[\\/:*?"<>| -]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80);
    }

    function triggerDownload(text, filename) {
        try {
            // Prefix a UTF-8 BOM so Word reads the encoding correctly.
            var blob = new Blob(["﻿", text], { type: "application/msword;charset=utf-8" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                try { document.body.removeChild(a); } catch (e) {}
                try { URL.revokeObjectURL(url); } catch (e) {}
            }, 0);
            return true;
        } catch (e) {
            if (window.console) console.error("wordexport download failed:", e);
            return false;
        }
    }
}
