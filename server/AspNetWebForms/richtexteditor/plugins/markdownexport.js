if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-06 Markdown export surface. The core already ships an HTML→Markdown
// engine (editor.toMarkdown()); this plugin makes it discoverable the way Notion
// "Copy as Markdown" / Obsidian do: a one-click copy-to-clipboard and a
// download-as-.md, exposed as slash commands + a public API. No content is
// modified — these are read-only exporters.
RTE_DefaultConfig.plugin_markdownexport = RTE_Plugin_MarkdownExport;
if (typeof RTE_DefaultConfig.markdownExportEnabled === "undefined") RTE_DefaultConfig.markdownExportEnabled = true;

function RTE_Plugin_MarkdownExport() {
    var obj = this;
    var config, editor;

    obj.PluginName = "MarkdownExport";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        // getMarkdown(): friendly alias for the core toMarkdown() engine.
        editor.getMarkdown = function () {
            if (typeof editor.toMarkdown === "function") return editor.toMarkdown();
            // Fallback: very small HTML→text if the core engine is unavailable.
            var ed = editor.getEditable();
            return ed ? (ed.innerText || ed.textContent || "") : "";
        };

        // copyAsMarkdown(): write the document's Markdown to the clipboard.
        // Returns a Promise<boolean>. Must run from a user gesture (the slash
        // command click qualifies).
        editor.copyAsMarkdown = function () {
            var md = editor.getMarkdown();
            return writeClipboard(md);
        };

        // downloadMarkdown(filename): save the Markdown as a .md file.
        editor.downloadMarkdown = function (filename) {
            var md = editor.getMarkdown();
            var base = sanitizeName(filename);
            var name = base ? (base + ".md") : defaultName();
            return triggerDownload(md, name);
        };
    };

    function defaultName() {
        // Derive from the first heading/line if possible.
        try {
            var ed = editor.getEditable();
            if (ed) {
                var h = ed.querySelector("h1,h2,h3");
                var base = h ? h.textContent : (ed.textContent || "");
                base = (base || "").trim().split("\n")[0].slice(0, 60);
                var clean = sanitizeName(base);
                if (clean) return clean + ".md";
            }
        } catch (e) {}
        return "document.md";
    }

    function sanitizeName(s) {
        if (!s) return "";
        s = String(s).replace(/\.md$/i, "");
        s = s.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
        s = s.replace(/[ .]+$/, "");
        return s;
    }

    function writeClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
            }
        } catch (e) {}
        return Promise.resolve(legacyCopy(text));
    }

    function legacyCopy(text) {
        try {
            var doc = document;
            var ta = doc.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0";
            doc.body.appendChild(ta);
            ta.focus(); ta.select();
            var ok = false;
            try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
            doc.body.removeChild(ta);
            return ok;
        } catch (e) { return false; }
    }

    function triggerDownload(text, filename) {
        try {
            var blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
            var url = (window.URL || window.webkitURL).createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url; a.download = filename;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                try { document.body.removeChild(a); } catch (e) {}
                try { (window.URL || window.webkitURL).revokeObjectURL(url); } catch (e) {}
            }, 0);
            return true;
        } catch (e) { return false; }
    }
}
