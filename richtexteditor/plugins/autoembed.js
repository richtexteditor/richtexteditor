if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-05 Auto-embed on paste. Paste a bare YouTube or Vimeo URL on its own
// line and it becomes a responsive 16:9 embed &mdash; the Notion / Medium
// behaviour. Complements the command-driven Insert Video dialog and the
// bookmark-card plugin (which makes a link-preview card from any URL).
//
// Approach: the editor's own paste pipeline already inserts the URL, so rather
// than fight it we let the paste land, then (next tick) replace the block that
// now holds nothing but the pasted URL with the embed. Mid-paragraph pastes are
// left as-is (they should be links, not block embeds).
//
// Safety: the iframe src is NEVER the raw pasted string. We extract the video ID
// with a strict whitelist regex, constrain it to [A-Za-z0-9_-]/digits, and build
// a trusted provider embed URL from a template. Add providers via
// config.autoEmbedResolver (must return an https:// URL).
RTE_DefaultConfig.plugin_autoembed = RTE_Plugin_AutoEmbed;
RTE_DefaultConfig.autoEmbedEnabled = (typeof RTE_DefaultConfig.autoEmbedEnabled === "undefined")
    ? true : RTE_DefaultConfig.autoEmbedEnabled;
RTE_DefaultConfig.autoEmbedResolver = RTE_DefaultConfig.autoEmbedResolver || null;

function RTE_Plugin_AutoEmbed() {
    var obj = this;
    var config, editor, editable;

    obj.PluginName = "AutoEmbed";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    var pasteDoc = null;
    // Attach the paste listener to the iframe DOCUMENT (paste bubbles to it), and
    // RE-ATTACH whenever the editor swaps in a new document/body. The editor can
    // recreate both after init, so a one-shot attach at InitEditor is orphaned.
    function ensurePasteListener() {
        try {
            var doc = editor.getDocument();
            if (!doc || doc === pasteDoc) return;
            doc.addEventListener("paste", onPaste, true);
            pasteDoc = doc;
        } catch (e) { /* ignore */ }
    }

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        ensurePasteListener();
        try { editor.attachEvent("ready", ensurePasteListener); } catch (e) { /* ignore */ }
        try { editor.attachEvent("aftersethtml", ensurePasteListener); } catch (e) { /* ignore */ }
        // Belt-and-braces: the document can be created slightly after init.
        setTimeout(ensurePasteListener, 0);
        setTimeout(ensurePasteListener, 200);
        // Public API: programmatically embed a media URL at the caret. Returns
        // true if the URL resolved to a supported provider.
        editor.embedUrl = function (url) {
            var e = resolve(String(url || "").trim());
            if (!e) return false;
            insertEmbed(e);
            return true;
        };
    };

    // ---- provider resolution (id is whitelist-constrained before interpolation) ----
    function resolveBuiltin(url) {
        var m;
        m = /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{6,20})/i.exec(url);
        if (m) return "https://www.youtube.com/embed/" + m[1];
        m = /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{6,20})/i.exec(url);
        if (m) return "https://www.youtube.com/embed/" + m[1];
        m = /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{6,20})/i.exec(url);
        if (m) return "https://www.youtube.com/embed/" + m[1];
        m = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d{6,12})(?:[/?#]|$)/i.exec(url);
        if (m) return "https://player.vimeo.com/video/" + m[1];
        m = /^https?:\/\/player\.vimeo\.com\/video\/(\d{6,12})/i.exec(url);
        if (m) return "https://player.vimeo.com/video/" + m[1];
        return null;
    }
    function resolve(url) {
        var built = resolveBuiltin(url);
        if (built) return built;
        if (typeof config.autoEmbedResolver === "function") {
            try {
                var r = config.autoEmbedResolver(url);
                if (typeof r === "string" && /^https:\/\//i.test(r)) return r;
            } catch (e) { /* ignore */ }
        }
        return null;
    }

    function isCollapsed() {
        try { var s = editor.getSelection(); return s && s.rangeCount > 0 && s.isCollapsed; } catch (e) { return false; }
    }

    // ---- paste -> (next tick) replace the bare-URL block with an embed ----
    function onPaste(e) {
        if (!config.autoEmbedEnabled || !isCollapsed()) return;
        var cd = e.clipboardData || window.clipboardData;
        if (!cd) return;
        var text;
        try { text = cd.getData("text/plain"); } catch (er) { return; }
        if (!text) return;
        text = text.trim();
        if (/\s/.test(text) || !/^https?:\/\/\S+$/i.test(text)) return;
        var embedUrl = resolve(text);
        if (!embedUrl) return;
        // The editor inserts the pasted URL asynchronously, so poll briefly until
        // the bare-URL block appears, then swap it for the embed.
        var tries = 0;
        (function attempt() {
            if (replacePastedUrl(text, embedUrl)) return;
            if (++tries < 12) setTimeout(attempt, 25);
        })();
    }

    // Replace the top-level block whose only text is the pasted URL with an embed.
    function replacePastedUrl(urlText, embedUrl) {
        try {
            var editable = editor.getEditable();
            if (!editable) return false;
            var blocks = editable.querySelectorAll("p,div,li,h1,h2,h3,h4,h5,h6");
            for (var i = blocks.length - 1; i >= 0; i--) {
                var b = blocks[i];
                if (b.classList && b.classList.contains("rte-embed")) continue;
                if (b.querySelector && (b.querySelector(".rte-embed") || b.querySelector("ul,ol,table"))) continue;
                if ((b.textContent || "").trim() !== urlText) continue;
                var doc = editor.getDocument();
                injectStyles(doc);
                var holder = doc.createElement("div");
                holder.innerHTML = buildEmbedHtml(embedUrl) + '<p><br></p>';
                var parent = b.parentNode; if (!parent) return;
                var firstInserted = holder.firstChild, lastP = holder.lastChild;
                while (holder.firstChild) parent.insertBefore(holder.firstChild, b);
                parent.removeChild(b);
                // caret into the trailing paragraph
                try {
                    var r = doc.createRange(); r.setStart(lastP, 0); r.collapse(true);
                    var s = editor.getSelection(); if (s) { s.removeAllRanges(); s.addRange(r); }
                } catch (e2) { /* ignore */ }
                try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e3) { /* ignore */ }
                return true;
            }
        } catch (e) { /* ignore */ }
        return false;
    }

    function buildEmbedHtml(embedUrl) {
        var safe = String(embedUrl).replace(/"/g, "&quot;");
        return '<div class="rte-embed" contenteditable="false" data-embed="' + safe + '" ' +
            'style="display:block;margin:12px 0;max-width:720px;">' +
            '<div class="rte-embed-frame" style="position:relative;width:100%;height:0;padding-bottom:56.25%;' +
            'overflow:hidden;border-radius:10px;background:#000;">' +
            '<iframe src="' + safe + '" loading="lazy" allowfullscreen ' +
            'referrerpolicy="strict-origin-when-cross-origin" ' +
            'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
            'style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe>' +
            '</div></div>';
    }

    function injectStyles(doc) {
        if (!doc || doc.getElementById("rte-autoembed-styles")) return;
        var css = ".rte-embed{display:block;margin:12px 0;max-width:720px;}" +
            ".rte-embed .rte-embed-frame{position:relative;width:100%;height:0;padding-bottom:56.25%;overflow:hidden;border-radius:10px;background:#000;}" +
            ".rte-embed .rte-embed-frame iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0;}";
        var st = doc.createElement("style");
        st.id = "rte-autoembed-styles";
        st.appendChild(doc.createTextNode(css));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }

    // Programmatic insert at caret (public editor.embedUrl API).
    function insertEmbed(embedUrl) {
        injectStyles(editor.getDocument());
        try { editor.insertHTML(buildEmbedHtml(embedUrl) + '<p><br></p>'); } catch (e) { /* ignore */ }
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) { /* ignore */ }
    }
}
