if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-04 Web-bookmark preview cards. Closes the Notion / Google Docs
// "bookmark with preview card" gap. Insert a URL as a rich link card
// (favicon + title + description + domain).
//
// Zero-infra by default: with no resolver configured it renders a card from
// the URL alone + the page favicon (via the public Google s2 favicon
// endpoint, an <img> the browser loads — no server of our own). For rich
// previews (title/description/og:image), wire a resolver — same BYOK shape as
// the AI toolkit:
//   config.bookmarkResolver = function (url) {
//     return fetch('/my/unfurl?u=' + encodeURIComponent(url))
//       .then(function (r) { return r.json(); }); // { title, description, image, favicon }
//   };
RTE_DefaultConfig.plugin_bookmarkcard = RTE_Plugin_BookmarkCard;
RTE_DefaultConfig.bookmarkResolver = RTE_DefaultConfig.bookmarkResolver || null;
RTE_DefaultConfig.bookmarkFaviconService = (typeof RTE_DefaultConfig.bookmarkFaviconService === "undefined")
    ? "https://www.google.com/s2/favicons?sz=64&domain=" // set to "" to disable favicon fetch
    : RTE_DefaultConfig.bookmarkFaviconService;

function RTE_Plugin_BookmarkCard() {
    var obj = this;
    var config, editor;

    obj.PluginName = "BookmarkCard";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        editor.attachEvent("exec_command_insertbookmark", function (state) {
            state.returnValue = true;
            obj.OpenBookmarkDialog();
        });
        try {
            var ed = editor.getEditable();
            if (ed) {
                ed.addEventListener("click", onEditableClick, true);
                ed.addEventListener("keydown", onEditableKeyDown, true);
            }
        } catch (e) { /* ignore */ }
        injectStyles();
    };

    function append(parent, tag, cssText, className) {
        var el = parent.ownerDocument.createElement(tag);
        if (cssText) el.style.cssText = cssText;
        if (className) el.className = className;
        parent.appendChild(el);
        return el;
    }

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // Accept only http/https; reject javascript:, data:, vbscript:, etc.
    // Prepend https:// to bare domains so "example.com" works.
    function normalizeUrl(raw) {
        var u = String(raw || "").trim();
        if (!u) return null;
        if (/^(javascript|data|vbscript|file):/i.test(u)) return null;
        if (!/^https?:\/\//i.test(u)) {
            if (/^[a-z0-9.-]+\.[a-z]{2,}([\/?#].*)?$/i.test(u)) u = "https://" + u;
            else return null;
        }
        try {
            // Validate via URL when available.
            if (typeof URL === "function") { var parsed = new URL(u); if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null; return parsed.href; }
        } catch (e) { return null; }
        return u;
    }

    function domainOf(url) {
        try { return (new URL(url)).hostname.replace(/^www\./, ""); }
        catch (e) { return url.replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./, ""); }
    }
    function closestBookmark(node, editable) {
        while (node && node !== editable) {
            if (node.nodeType === 1 && node.classList && node.classList.contains("rte-bookmark-card")) return node;
            node = node.parentNode;
        }
        return null;
    }
    function removeBookmark(card) {
        if (!card || !card.parentNode) return;
        card.parentNode.removeChild(card);
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) { /* ignore */ }
        try { editor.focus(); } catch (e2) { /* ignore */ }
    }
    function onEditableClick(e) {
        var target = e.target;
        var editable = editor.getEditable();
        while (target && target !== editable) {
            if (target.nodeType === 1 && target.getAttribute && target.getAttribute("data-rte-bookmark-remove") === "1") {
                e.preventDefault();
                e.stopPropagation();
                removeBookmark(closestBookmark(target, editable));
                return;
            }
            target = target.parentNode;
        }
    }
    function onEditableKeyDown(e) {
        if ((e.key === "Enter" || e.key === " ") && e.target && e.target.getAttribute && e.target.getAttribute("data-rte-bookmark-remove") === "1") {
            e.preventDefault();
            e.stopPropagation();
            removeBookmark(closestBookmark(e.target, editor.getEditable()));
            return;
        }
        if (e.key !== "Delete" && e.key !== "Backspace") return;
        var card = null;
        try {
            var sel = editor.getSelection();
            if (sel && sel.rangeCount) card = closestBookmark(sel.getRangeAt(0).startContainer, editor.getEditable());
        } catch (ex) { card = null; }
        if (!card) return;
        e.preventDefault();
        removeBookmark(card);
    }

    function buildCardHtml(meta) {
        var url = meta.url;
        var domain = domainOf(url);
        var title = meta.title || domain;
        var desc = meta.description || "";
        var favicon = meta.favicon || (config.bookmarkFaviconService ? (config.bookmarkFaviconService + encodeURIComponent(domain)) : "");
        var image = meta.image || "";

        var html = '<a class="rte-bookmark-card" data-rte-block="bookmark" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" contenteditable="false">';
        html += '<span class="rte-bookmark-remove" data-rte-bookmark-remove="1" role="button" tabindex="0" aria-label="Remove bookmark" title="Remove bookmark">x</span>';
        html += '<span class="rte-bookmark-main">';
        html += '<span class="rte-bookmark-title">' + esc(title) + "</span>";
        if (desc) html += '<span class="rte-bookmark-desc">' + esc(desc) + "</span>";
        html += '<span class="rte-bookmark-url">';
        if (favicon) html += '<img class="rte-bookmark-favicon" src="' + esc(favicon) + '" alt="" width="16" height="16">';
        html += "<span>" + esc(domain) + "</span></span>";
        html += "</span>";
        if (image) html += '<span class="rte-bookmark-thumb" style="background-image:url(' + "'" + esc(image).replace(/'/g, "%27") + "'" + ')"></span>';
        html += "</a><p><br></p>";
        return html;
    }

    function insertCard(meta) {
        injectStyles();
        editor.insertHTML(buildCardHtml(meta));
        editor.focus();
    }

    obj.OpenBookmarkDialog = function () {
        var dlg = editor.createDialog(
            (editor.getLangText && editor.getLangText("insertbookmarktitle")) || "Insert bookmark",
            "rte-dialog-bookmark"
        );
        var close = typeof dlg.close === "function" ? function () { dlg.close(); } : function () { editor.closeCurrentPopup(); };
        var wrap = append(dlg, "div", "padding:14px;min-width:420px;font:13px -apple-system,Segoe UI,sans-serif");

        append(wrap, "div", "font-weight:600;margin-bottom:4px").innerText =
            (editor.getLangText && editor.getLangText("insertbookmarklabel")) || "Link URL";
        var input = append(wrap, "input", "width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:13px ui-monospace,monospace");
        input.type = "url"; input.placeholder = "https://example.com/article";

        var status = append(wrap, "div", "font-size:11px;color:#94a3b8;margin-top:6px;min-height:14px");
        if (!config.bookmarkResolver) status.innerText = "No metadata resolver configured — a basic card (favicon + domain) will be inserted. Wire config.bookmarkResolver for rich previews.";

        var footer = append(wrap, "div", "display:flex;justify-content:flex-end;gap:8px;margin-top:14px");
        var cancel = append(footer, "button", "padding:6px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer");
        cancel.type = "button"; cancel.textContent = "Cancel"; cancel.onclick = close;
        var ok = append(footer, "button", "padding:6px 14px;border:1px solid #1d67ba;border-radius:8px;background:#1d67ba;color:#fff;cursor:pointer");
        ok.type = "button"; ok.textContent = "Insert";

        setTimeout(function () { input.focus(); }, 0);
        input.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); ok.click(); } };

        ok.onclick = function () {
            var url = normalizeUrl(input.value);
            if (!url) { status.style.color = "#dc2626"; status.innerText = "Enter a valid http(s) URL."; return; }
            if (config.bookmarkResolver && typeof config.bookmarkResolver === "function") {
                ok.disabled = true; status.style.color = "#94a3b8"; status.innerText = "Fetching preview…";
                var done = false;
                function finish(meta) { if (done) return; done = true; meta = meta || {}; meta.url = url; close(); insertCard(meta); }
                try {
                    var p = config.bookmarkResolver(url);
                    if (p && typeof p.then === "function") {
                        p.then(function (m) { finish(m || {}); }, function () { finish({}); });
                        setTimeout(function () { finish({}); }, 8000); // safety timeout → fallback card
                    } else { finish(p || {}); }
                } catch (e) { finish({}); }
            } else {
                close();
                insertCard({ url: url });
            }
        };
    };

    function injectStyles() {
        var css = [
            ".rte-bookmark-card{position:relative;display:flex;align-items:stretch;justify-content:space-between;gap:12px;margin:12px 0;border:1px solid rgba(15,23,42,.14);border-radius:10px;overflow:hidden;text-decoration:none;color:inherit;background:#fff;max-width:640px;transition:box-shadow 160ms,border-color 160ms}",
            ".rte-bookmark-card:hover{border-color:rgba(37,99,235,.5);box-shadow:0 6px 18px rgba(15,23,42,.10)}",
            ".rte-bookmark-remove{position:absolute;top:7px;right:7px;width:22px;height:22px;border:1px solid rgba(15,23,42,.14);border-radius:999px;background:rgba(255,255,255,.96);color:#334155;display:flex;align-items:center;justify-content:center;font:700 13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 12px rgba(15,23,42,.12);opacity:0;transition:opacity 120ms,border-color 120ms,color 120ms;z-index:2}",
            ".rte-bookmark-card:hover .rte-bookmark-remove,.rte-bookmark-card:focus .rte-bookmark-remove{opacity:1}",
            ".rte-bookmark-remove:hover{border-color:rgba(220,38,38,.38);color:#b91c1c}",
            ".rte-bookmark-main{flex:1;min-width:0;padding:12px 14px;display:flex;flex-direction:column;gap:4px}",
            ".rte-bookmark-title{font-weight:600;font-size:14px;line-height:1.3;color:#0f172a;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}",
            ".rte-bookmark-desc{font-size:12px;color:#64748b;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}",
            ".rte-bookmark-url{display:flex;align-items:center;gap:6px;font-size:11px;color:#94a3b8;margin-top:2px}",
            ".rte-bookmark-favicon{width:16px;height:16px;border-radius:3px;flex:0 0 16px}",
            ".rte-bookmark-thumb{flex:0 0 120px;background-size:cover;background-position:center;background-color:#f1f5f9}",
            "@media (max-width:480px){.rte-bookmark-thumb{display:none}}"
        ].join("\n");
        try {
            var editdoc = editor.getDocument();
            if (!editdoc) return;
            var head = editdoc.head || (editdoc.getElementsByTagName && editdoc.getElementsByTagName("head")[0]) || editdoc.documentElement;
            if (head && !editdoc.querySelector("style[data-rte-bookmarkcard]")) {
                var st = editdoc.createElement("style");
                st.setAttribute("data-rte-bookmarkcard", "1");
                st.textContent = css;
                head.appendChild(st);
            }
        } catch (e) { /* ignore */ }
    }
}
