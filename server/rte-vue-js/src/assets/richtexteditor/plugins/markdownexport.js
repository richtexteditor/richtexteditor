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

        // 2026-10-13 Markdown mode (tools/markdown/markdown-mode.mjs): the document is edited as Markdown text in place.
        // A toggle without an edit changes nothing. An edit applies as one undoable step. While the mode is open,
        // getHTML() returns the HTML the Markdown text describes, so a host that saves mid-edit keeps the change.
        var mdMode = null;
        editor.isMarkdownMode = function () { return !!mdMode; };
        editor.toggleMarkdownMode = function () { return mdMode ? exitMarkdownMode() : enterMarkdownMode(); };
        // 2026-10-17 a live preview beside the source (competitor matrix F6): it renders what the text will become,
        // from the editor's own importer, so raw HTML and javascript: links show as text. On by default; the button
        // in the note row and setMarkdownPreview(bool) turn it off and on. tools/markdown/markdown-preview.mjs
        var mdPreviewOn = true;
        editor.isMarkdownPreview = function () { return !!mdMode && mdPreviewOn; };
        editor.setMarkdownPreview = function (on) {
            mdPreviewOn = !!on;
            if (mdMode) applyPreviewState();
            return editor.isMarkdownPreview();
        };
        var baseGetHTML = editor.getHTMLCode;
        var htmlWhileMarkdown = function () {
            if (mdMode && !mdMode.locked) return editor.fromMarkdown(mdMode.area.value, { apply: false });
            return baseGetHTML.apply(editor, arguments);
        };
        editor.getHTML = htmlWhileMarkdown;
        editor.getHTMLCode = htmlWhileMarkdown;

        // 2026-10-17 labels speak the page's language: their own config.text_ key first, then - when a non-English
        // language pack is loaded (text_language is not "Language") - the pack's existing translation, else English.
        // tools/i18n/block-menu-language.mjs
        function label(own, packKey, fallback) {
            if (config && config["text_" + own]) return config["text_" + own];
            if (packKey && config && config.text_language && config.text_language !== "Language" && config["text_" + packKey]) return config["text_" + packKey];
            return fallback;
        }

        function enterMarkdownMode() {
            var frame = editor.iframe;
            if (!frame || !frame.parentNode) return false;
            var host = frame.ownerDocument;
            injectMarkdownStyles(host);
            var original = editor.toMarkdown();
            var note = host.createElement("div");
            note.className = "rte-markdown-note";
            note.textContent = ((config && config.text_md_note) || "Markdown mode. Markdown keeps headings, lists, links, emphasis, code and tables. Colours, footnotes, comments and other formatting are not kept when you change the text.");
            var area = host.createElement("textarea");
            area.className = "rte-markdown-mode";
            area.setAttribute("spellcheck", "false");
            // 2026-10-14 A named text box, described by the note above it (what Markdown keeps and loses), so a
            // screen reader does not announce a bare "edit text" (WCAG 4.1.2). tools/markdown/markdown-mode-a11y.mjs
            area.setAttribute("aria-label", ((config && config.text_md_source) || "Markdown source"));
            note.id = "rte-markdown-note-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1e6);
            area.setAttribute("aria-describedby", note.id);
            area.value = original;
            // 2026-10-17 a locked document stays locked: in read-only and comments-only mode the source box was
            // editable and leaving applied the edit; in suggesting mode the edit replaced the document untracked. The
            // source now opens view-only there and leaving never applies. tools/markdown/markdown-mode-locked.mjs
            var locked = false;
            try { locked = !!((editor.getReadOnly && editor.getReadOnly()) || (editor.getCommentsOnly && editor.getCommentsOnly())); } catch (e) { locked = false; }
            if (!locked && editor.__trackHook && editor.__trackHook("refuse", { message: ((config && config.text_md_suggestlocked) || "Suggesting is on, so the Markdown source is view only. Turn suggesting off to edit as Markdown.") }) === true) locked = true;
            if (locked) {
                area.readOnly = true;
                note.textContent = ((config && config.text_md_viewonly) || "Markdown source, view only: this document cannot be changed here right now.");
            }
            var toggle = host.createElement("button");
            toggle.type = "button";
            toggle.className = "rte-markdown-preview-toggle";
            var bar = host.createElement("div");
            bar.className = "rte-markdown-bar";
            bar.appendChild(toggle);
            var split = host.createElement("div");
            split.className = "rte-markdown-split";
            var preview = host.createElement("div");
            preview.className = "rte-markdown-preview";
            preview.setAttribute("role", "region");
            preview.setAttribute("aria-label", label("markdownpreview", "preview", "Markdown preview"));
            split.appendChild(area);
            split.appendChild(preview);
            frame.style.display = "none";
            frame.parentNode.insertBefore(note, frame.nextSibling);
            frame.parentNode.insertBefore(bar, note.nextSibling);
            frame.parentNode.insertBefore(split, bar.nextSibling);
            mdMode = { area: area, note: note, frame: frame, original: original, split: split, preview: preview, toggle: toggle, bar: bar, timer: 0, locked: locked };
            toggle.onclick = function () { editor.setMarkdownPreview(!mdPreviewOn); };
            // 2026-10-17 the preview follows the source as it scrolls (proportional, as side-by-side Markdown editors
            // do): with a long document the part being edited was off screen in the preview.
            // tools/markdown/markdown-preview-scroll.mjs
            area.addEventListener("scroll", syncPreviewScroll);
            area.addEventListener("input", function () {
                var state = mdMode;
                if (!state || !mdPreviewOn) return;
                clearTimeout(state.timer);
                state.timer = setTimeout(renderPreview, 120);
            });
            applyPreviewState();
            try { area.focus(); } catch (e) { /* focus is best effort */ }
            return true;
        }

        function exitMarkdownMode() {
            var state = mdMode;
            var text = state.area.value;
            mdMode = null;
            if (!state.locked && text !== state.original) editor.setHTMLCode(editor.fromMarkdown(text, { apply: false }), { undoable: true });
            clearTimeout(state.timer);
            if (state.split.parentNode) state.split.parentNode.removeChild(state.split);
            if (state.bar.parentNode) state.bar.parentNode.removeChild(state.bar);
            if (state.note.parentNode) state.note.parentNode.removeChild(state.note);
            state.frame.style.display = "";
            // the text box that held focus is gone: focus goes back to the editor, not to the page body (WCAG 2.4.3)
            try { editor.focus(); } catch (e) { /* ignore */ }
            return true;
        }

        function renderPreview() {
            var state = mdMode;
            if (!state) return;
            var html = "";
            try { html = editor.fromMarkdown(state.area.value, { apply: false }); } catch (e) { html = ""; }
            state.preview.innerHTML = html;
            syncPreviewScroll();
        }

        function syncPreviewScroll() {
            var state = mdMode;
            if (!state || !mdPreviewOn) return;
            var a = state.area, pv = state.preview;
            var range = a.scrollHeight - a.clientHeight;
            var ratio = range > 0 ? a.scrollTop / range : 0;
            pv.scrollTop = Math.round(ratio * Math.max(0, pv.scrollHeight - pv.clientHeight));
        }

        function applyPreviewState() {
            var state = mdMode;
            state.preview.style.display = mdPreviewOn ? "" : "none";
            state.split.className = "rte-markdown-split" + (mdPreviewOn ? " has-preview" : "");
            state.toggle.setAttribute("aria-pressed", mdPreviewOn ? "true" : "false");
            state.toggle.textContent = mdPreviewOn ? label("markdownpreview_hide", "", "Hide preview") : label("markdownpreview_show", "", "Show preview");
            if (mdPreviewOn) renderPreview();
        }

        function injectMarkdownStyles(doc) {
            if (doc.getElementById("rte-markdown-mode-styles")) return;
            var st = doc.createElement("style");
            st.id = "rte-markdown-mode-styles";
            st.appendChild(doc.createTextNode(
                ".rte-markdown-mode{display:block;box-sizing:border-box;width:100%;min-height:240px;margin:0;padding:12px 14px;" +
                "border:1px solid #cbd5e1;border-radius:8px;font:14px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;" +
                "color:#0f172a;background:#fff;resize:vertical;}" +
                ".rte-markdown-note{margin:0 0 6px;font:13px/1.4 system-ui,sans-serif;color:#475569;}" +
                ".rte-markdown-split.has-preview{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;}" +
                "@media (max-width:640px){.rte-markdown-split.has-preview{grid-template-columns:minmax(0,1fr);}}" +
                ".rte-markdown-preview{box-sizing:border-box;min-height:240px;max-height:70vh;overflow:auto;padding:12px 14px;" +
                "border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#0f172a;font:15px/1.6 system-ui,sans-serif;overflow-wrap:anywhere;}" +
                ".rte-markdown-preview img{max-width:100%;height:auto;}" +
                ".rte-markdown-preview table{border-collapse:collapse;}.rte-markdown-preview th,.rte-markdown-preview td{border:1px solid #cbd5e1;padding:4px 8px;}" +
                ".rte-markdown-bar{margin:0 0 6px;}.rte-markdown-preview-toggle{padding:2px 10px;min-height:24px;border:1px solid #94a3b8;border-radius:6px;" +
                "background:#fff;color:#0f172a;font:12px/1.4 system-ui,sans-serif;cursor:pointer;}" +
                ".rte-markdown-preview-toggle:focus-visible{outline:2px solid #1d4ed8;outline-offset:2px;}"));
            (doc.head || doc.documentElement).appendChild(st);
        }
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
