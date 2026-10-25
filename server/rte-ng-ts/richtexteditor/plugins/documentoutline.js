if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

RTE_DefaultConfig.plugin_documentoutline = RTE_Plugin_DocumentOutline;

function RTE_Plugin_DocumentOutline() {
    var obj = this;
    var config;
    var editor;
    var shell = null;
    var panel = null;
    var list = null;
    var empty = null;
    var refreshTimer = 0;
    var activeHeadingId = "";

    obj.PluginName = "DocumentOutline";

    // 2026-10-18 the words read config.text_ keys (language packs), English as the fallback; {0} fills a template.
    // tools/i18n/plugin-panels-language.mjs
    function pText(key, fallback, arg) {
        var s = (config && config["text_" + key]) || fallback;
        return arg === undefined ? s : s.split("{0}").join(String(arg));
    }
    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.documentOutlineEnabled === false) return;

        config.documentOutlineTitle = config.documentOutlineTitle || pText("ol_title", "Outline");
        config.documentOutlineHint = config.documentOutlineHint || pText("ol_hint", "Browse headings and jump through long documents without leaving the editor.");
        config.documentOutlineEmptyText = config.documentOutlineEmptyText || pText("ol_empty", "Add headings to build the document outline.");
        if (typeof config.documentOutlineAutoOpen !== "boolean") config.documentOutlineAutoOpen = false;
        if (typeof config.documentOutlineMinLevel !== "number") config.documentOutlineMinLevel = 1;
        if (typeof config.documentOutlineMaxLevel !== "number") config.documentOutlineMaxLevel = 6;

        appendToolbarCommand("toolbar_default", "#{documentoutline}");
        appendToolbarCommand("toolbar_full", "#{documentoutline}");
        // 2026-10-03 Build the shell NOW, before the editor creates its iframe. ensureShell() moves the
        // editor container; done in InitEditor it moved the live iframe, which then gets a fresh
        // document - and every plugin that had already bound listeners to the old one went deaf (the
        // slash menu, @mentions and emoji autocomplete, until they moved to editor.bindDocumentEvent;
        // customer plugins binding the document directly still were). Nothing is loaded yet here.
        // InitEditor's own ensureShell() call finds the shell and returns it.
        // tools/keyboard/plugin-listeners.mjs
        if (config.documentOutlineEnabled !== false && config.container && config.container.parentNode) {
            try { ensureShell(); } catch (e) { /* InitEditor builds it */ }
        }
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.documentOutlineEnabled === false) return;

        editor.documentOutline = {
            close: function () { closePanel(); },
            list: function () { return collectHeadings(); },
            open: function () { openPanel(); },
            refresh: function () { renderOutline(); },
            toggle: function () { togglePanel(); }
        };

        injectStyles();

        editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
        editor.toolbarFactoryMap["documentoutline"] = function (cmd) {
            return editor.createToolbarButton(cmd);
        };

        editor.attachEvent("exec_command_documentoutline", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            togglePanel();
        });
        editor.attachEvent("change", function () {
            scheduleRefresh();
        });
        // 2026-10-18 setHTMLCode fires no "change": a replaced document left the panel on the old one.
        // tools/outline/panels-follow-sethtml.mjs
        try { editor.attachEvent("aftersethtml", function () { scheduleRefresh(); }); } catch (e) { /* older cores */ }
        editor.attachEvent("selectionchange", function () {
            updateActiveHeading();
        });

        ensureShell();
        renderOutline();
        if (config.documentOutlineAutoOpen) openPanel();
    };

    function appendToolbarCommand(toolbar, item) {
        if (!config[toolbar]) return;
        if (config[toolbar].indexOf(item) !== -1) return;
        config[toolbar] = config[toolbar] + item;
    }

    function injectStyles() {
        var hostDoc = config.container.ownerDocument;
        if (hostDoc.getElementById("rte-document-outline-style")) return;
        var csstext = [
            ".rte-document-outline-shell{display:flex;align-items:stretch;gap:10px;}",
            ".rte-document-outline-shell>.rte-document-outline-host{flex:1 1 auto;min-width:0;}",
            "/* 2026-07-12 navigation panel precision */",
            ".rte-document-outline-panel{display:none;flex:0 0 286px;min-width:248px;max-width:min(330px,30vw);border:1px solid rgba(148,163,184,.22);border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.96));box-shadow:0 14px 32px rgba(29,78,216,.1),0 2px 8px rgba(15,23,42,.06);overflow:hidden;color:#172033;font-family:Aptos,'Segoe UI',sans-serif;}",
            ".rte-document-outline-shell.is-open>.rte-document-outline-panel{display:flex;flex-direction:column;}",
            ".rte-document-outline-header{padding:12px 12px 9px 14px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.72);}",
            ".rte-document-outline-kicker{font-size:10px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;color:#52657e;font-weight:850;}",
            ".rte-document-outline-title{margin-top:3px;font-size:15px;line-height:1.2;font-weight:850;color:#172033;}",
            ".rte-document-outline-copy{margin-top:5px;font-size:12px;line-height:1.42;color:#52657e;}",
            ".rte-document-outline-toolbar{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 8px 14px;border-bottom:1px solid rgba(148,163,184,.16);gap:10px;background:rgba(255,255,255,.52);}",
            ".rte-document-outline-count{min-width:0;font-size:12px;font-weight:750;color:#52657e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".rte-document-outline-close{appearance:none;border:1px solid rgba(100,116,139,.18);background:#fff;color:#315277;cursor:pointer;font-size:12px;font-weight:750;padding:6px 9px;border-radius:7px;line-height:1;}",
            ".rte-document-outline-close:hover,.rte-document-outline-close:focus-visible{background:#eef4ff;color:#0f3f9f;border-color:rgba(37,99,235,.28);}",
            ".rte-document-outline-body{padding:6px;overflow:auto;min-height:140px;max-height:520px;scrollbar-width:thin;}",
            ".rte-document-outline-list{display:flex;flex-direction:column;gap:5px;}",
            ".rte-document-outline-item{appearance:none;width:100%;text-align:left;border:1px solid transparent;background:transparent;color:#172033;cursor:pointer;border-radius:7px;padding:8px 10px 8px calc(10px + (var(--rte-outline-level,1) - 1) * 12px);font-size:13px;line-height:1.35;font-weight:650;}",
            ".rte-document-outline-item:hover,.rte-document-outline-item:focus-visible{background:#f8fbff;border-color:rgba(37,99,235,.18);}",
            ".rte-document-outline-item.is-active{background:#eef4ff;border-color:rgba(37,99,235,.26);color:#0f3f9f;box-shadow:0 8px 18px rgba(37,99,235,.1);}",
            ".rte-document-outline-item-level{display:inline-flex;margin:0 0 3px;padding:2px 6px;border-radius:999px;background:#fff;color:#64748b;font-size:10px;line-height:1.1;letter-spacing:.08em;text-transform:uppercase;font-weight:850;box-shadow:inset 0 0 0 1px rgba(148,163,184,.18);}",
            ".rte-document-outline-empty{margin:6px;padding:14px;color:#52657e;font-size:13px;font-weight:700;line-height:1.55;background:#fff;border:1px dashed rgba(148,163,184,.34);border-radius:8px;}",
            ".rte-document-outline-panel.rte-document-outline-dark{background:linear-gradient(180deg,#1e293b,#0f172a);border-color:#334155;color:#e2e8f0;box-shadow:0 18px 40px rgba(0,0,0,.45);}",
            ".rte-document-outline-dark .rte-document-outline-header,.rte-document-outline-dark .rte-document-outline-toolbar{background:rgba(15,23,42,.6);border-color:#334155;}",
            ".rte-document-outline-dark .rte-document-outline-kicker,.rte-document-outline-dark .rte-document-outline-copy,.rte-document-outline-dark .rte-document-outline-count{color:#94a3b8;}",
            ".rte-document-outline-dark .rte-document-outline-title{color:#f1f5f9;}",
            ".rte-document-outline-dark .rte-document-outline-close{background:#0f172a;color:#bfdbfe;border-color:#475569;}",
            ".rte-document-outline-dark .rte-document-outline-close:hover,.rte-document-outline-dark .rte-document-outline-close:focus-visible{background:#1e3a8a;color:#ffffff;}",
            ".rte-document-outline-dark .rte-document-outline-item{color:#e2e8f0;}",
            ".rte-document-outline-dark .rte-document-outline-item:hover,.rte-document-outline-dark .rte-document-outline-item:focus-visible{background:#1e293b;border-color:#475569;}",
            ".rte-document-outline-dark .rte-document-outline-item.is-active{background:#1e3a8a;border-color:#3b82f6;color:#ffffff;}",
            ".rte-document-outline-dark .rte-document-outline-item-level{background:#0f172a;color:#cbd5e1;}",
            ".rte-document-outline-dark .rte-document-outline-empty{background:#0f172a;color:#94a3b8;border-color:#475569;}",
            "@media (max-width: 1100px){.rte-document-outline-shell{display:block;}.rte-document-outline-panel{margin-top:12px;max-width:none;width:100%;}.rte-document-outline-body{max-height:320px;}}"
        ].join("");
        var style = hostDoc.createElement("style");
        style.id = "rte-document-outline-style";
        style.appendChild(hostDoc.createTextNode(csstext));
        hostDoc.head.appendChild(style);
        // A <style> element's rules are dropped under a strict style-src; this
        // re-injects them through the CSSOM in that case only.
        if (editor && typeof editor.ensureStyleSheetLive === "function") {
            editor.ensureStyleSheetLive(hostDoc, style, "rte-document-outline-style", csstext);
        }
    }

    function ensureShell() {
        if (shell) return shell;
        var container = config.container;
        var hostDoc = container.ownerDocument;
        shell = hostDoc.createElement("div");
        shell.className = "rte-document-outline-shell";

        var host = hostDoc.createElement("div");
        host.className = "rte-document-outline-host";

        var parent = container.parentNode;
        parent.insertBefore(shell, container);
        shell.appendChild(host);
        host.appendChild(container);

        panel = hostDoc.createElement("aside");
        panel.className = "rte-document-outline-panel";
        panel.setAttribute("aria-label", config.documentOutlineTitle);
        panel.setAttribute("role", "complementary");

        var header = hostDoc.createElement("div");
        header.className = "rte-document-outline-header";
        var kicker = hostDoc.createElement("div");
        kicker.className = "rte-document-outline-kicker";
        kicker.innerText = pText("pn_document", "Document");
        var title = hostDoc.createElement("div");
        title.className = "rte-document-outline-title";
        title.innerText = config.documentOutlineTitle;
        var copy = hostDoc.createElement("div");
        copy.className = "rte-document-outline-copy";
        copy.innerText = config.documentOutlineHint;
        header.appendChild(kicker);
        header.appendChild(title);
        header.appendChild(copy);

        var toolbar = hostDoc.createElement("div");
        toolbar.className = "rte-document-outline-toolbar";
        var count = hostDoc.createElement("div");
        count.className = "rte-document-outline-count";
        count.setAttribute("data-rte-outline-count", "1");
        var close = hostDoc.createElement("button");
        close.type = "button";
        close.className = "rte-document-outline-close";
        close.innerText = pText("pn_hide", "Hide");
        close.setAttribute("aria-label", pText("ol_hidearia", "Hide document outline"));
        close.onclick = function () { closePanel(); };
        toolbar.appendChild(count);
        toolbar.appendChild(close);

        var body = hostDoc.createElement("div");
        body.className = "rte-document-outline-body";
        list = hostDoc.createElement("div");
        list.className = "rte-document-outline-list";
        empty = hostDoc.createElement("div");
        empty.className = "rte-document-outline-empty";
        empty.innerText = config.documentOutlineEmptyText;
        body.appendChild(list);
        body.appendChild(empty);

        panel.appendChild(header);
        panel.appendChild(toolbar);
        panel.appendChild(body);
        shell.appendChild(panel);
        return shell;
    }

    function togglePanel() {
        if (shell && shell.classList.contains("is-open")) closePanel();
        else openPanel();
    }

    // 2026-10-17 the panel sits beside the editor's element, so rte-dark could not reach it: mirrored (and
    // rte-auto-dark under a dark system setting). tools/outline/outline-dark.mjs
    function editorIsDark() {
        try {
            var k = editor.container && editor.container.classList;
            return !!k && (k.contains("rte-dark") || (k.contains("rte-auto-dark") && !k.contains("rte-light") && !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)));
        } catch (x) { return false; }
    }
    function openPanel() {
        ensureShell();
        if (panel && panel.classList) { if (editorIsDark()) panel.classList.add("rte-document-outline-dark"); else panel.classList.remove("rte-document-outline-dark"); }
        shell.classList.add("is-open");
        renderOutline();
    }

    function closePanel() {
        if (!shell) return;
        shell.classList.remove("is-open");
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
            renderOutline();
        }, 80);
    }

    function slugifyHeading(text) {
        var slug = String(text || "")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        return slug || "section";
    }

    function collectHeadings() {
        var editable = editor.getEditable();
        if (!editable) return [];
        var minLevel = Math.max(1, Math.min(6, config.documentOutlineMinLevel || 1));
        var maxLevel = Math.max(minLevel, Math.min(6, config.documentOutlineMaxLevel || 6));
        var headings = editable.querySelectorAll("h1,h2,h3,h4,h5,h6");
        var items = [];
        var i;
        // 2026-09-24 Ids must be unique in the SAVED document. This used to keep any id a
        // heading already had, so copying or cutting a heading and pasting it saved the same
        // id twice (measured on published 2.6.7: <h1 id="hello-world"> x2), and outline
        // clicks / anchor links went to the first one. Now the FIRST heading in document
        // order keeps an id and a later duplicate is renamed, so the original's links stay
        // valid and the pasted copy becomes "slug-2". Ids on non-heading elements are
        // reserved too, so a heading never takes one. Every heading is checked, including
        // levels the outline does not display, since they share one id namespace.
        //
        // 2026-09-25 ...but only when the core does not own heading ids. With
        // autoHeadingAnchors on (the default) the core pass gives every heading a unique id
        // after each change, with the same first-keeps rule, and marks the ids it generated so
        // they can follow the text. This block ran 80 ms after each change instead: a heading
        // a person was typing got the slug of its FIRST letter ("Typed heading" -> id="t"),
        // unmarked, so the core took it for the author's own id and kept it for good. The
        // outline needs no id to work (it navigates by element), so it now leaves ids to the
        // core and keeps this pass for integrations that switched core anchors off.
        if (config.autoHeadingAnchors === false) {
            var used = {};
            var withId = editable.querySelectorAll("[id]");
            for (i = 0; i < withId.length; i++) {
                if (!/^H[1-6]$/.test(withId[i].nodeName)) used[withId[i].id] = true;
            }
            // Headings with text claim ids first. An EMPTY heading is usually the shell a cut
            // leaves behind, still carrying the moved heading's id; letting it claim first would
            // hand the moved heading "-2" and break every link to it. So empty headings go last
            // and simply drop an id that a real heading already holds.
            var textOf = function (el) {
                return (el.innerText || el.textContent || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
            };
            var empties = [];
            for (i = 0; i < headings.length; i++) {
                var h = headings[i];
                var t = textOf(h);
                if (!t) { empties.push(h); continue; }
                var base = h.id;
                if (!base) base = slugifyHeading(t);
                else if (!used[base]) { used[base] = true; continue; }
                var unique = base;
                var n = 2;
                while (used[unique]) { unique = base + "-" + n; n++; }
                used[unique] = true;
                if (h.id !== unique) h.id = unique;
            }
            for (i = 0; i < empties.length; i++) {
                if (!empties[i].id) continue;
                if (used[empties[i].id]) empties[i].removeAttribute("id");
                else used[empties[i].id] = true;
            }
        }
        for (i = 0; i < headings.length; i++) {
            var heading = headings[i];
            var level = parseInt(heading.nodeName.substring(1), 10);
            if (level < minLevel || level > maxLevel) continue;
            var text = (heading.innerText || heading.textContent || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
            items.push({
                // an empty heading may now have no id; key it internally (never written to
                // the element) so "" can't match the "no active heading" state and light up
                // every empty entry at once.
                id: heading.id || ("__rte-outline-" + items.length),
                level: level,
                text: text || pText("ol_heading", "Heading {0}", items.length + 1),
                element: heading
            });
        }
        return items;
    }

    function getCaretRange() {
        var selection = editor.getSelection ? editor.getSelection() : null;
        if (!selection || selection.rangeCount === 0) return null;
        try {
            var range = selection.getRangeAt(0).cloneRange();
            range.collapse(true);
            return range;
        } catch (ignore) {
            return null;
        }
    }

    function resolveActiveHeadingId(items) {
        var range = getCaretRange();
        if (!range || !items.length) return "";
        var doc = range.startContainer.ownerDocument || editor.getEditable().ownerDocument;
        var probe = doc.createRange();
        var active = "";
        try {
            probe.setStart(range.startContainer, range.startOffset);
            probe.collapse(true);
            for (var i = 0; i < items.length; i++) {
                var headingRange = doc.createRange();
                headingRange.selectNodeContents(items[i].element);
                headingRange.collapse(true);
                if (headingRange.compareBoundaryPoints(Range.START_TO_START, probe) <= 0) active = items[i].id;
            }
        } catch (ignore) {
            return activeHeadingId;
        }
        return active;
    }

    function focusHeading(item) {
        if (!item || !item.element) return;
        item.element.scrollIntoView({ behavior: "smooth", block: "center" });
        try {
            var selection = editor.getSelection ? editor.getSelection() : null;
            var range = item.element.ownerDocument.createRange();
            range.selectNodeContents(item.element);
            range.collapse(true);
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        } catch (ignore) { }
        editor.focus();
        activeHeadingId = item.id;
        syncActiveButton();
    }

    function syncActiveButton() {
        if (!list) return;
        var buttons = list.querySelectorAll(".rte-document-outline-item");
        for (var i = 0; i < buttons.length; i++) {
            var button = buttons[i];
            var active = button.getAttribute("data-rte-outline-id") === activeHeadingId;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-current", active ? "true" : "false");
        }
    }

    function updateActiveHeading() {
        var items = collectHeadings();
        var nextId = resolveActiveHeadingId(items);
        if (nextId === activeHeadingId && list && list.childNodes.length) {
            syncActiveButton();
            return;
        }
        activeHeadingId = nextId;
        renderOutline(items);
    }

    function renderOutline(cachedItems) {
        ensureShell();
        var items = cachedItems || collectHeadings();
        activeHeadingId = resolveActiveHeadingId(items) || activeHeadingId;

        while (list.firstChild) list.removeChild(list.firstChild);

        var count = panel.querySelector("[data-rte-outline-count]");
        if (count) count.innerText = items.length === 1 ? pText("ol_count1", "1 heading") : pText("ol_countn", "{0} headings", items.length);
        empty.style.display = items.length ? "none" : "block";

        for (var i = 0; i < items.length; i++) {
            (function (item) {
                var button = panel.ownerDocument.createElement("button");
                button.type = "button";
                button.className = "rte-document-outline-item";
                button.style.setProperty("--rte-outline-level", String(item.level));
                button.setAttribute("data-rte-outline-id", item.id);
                button.setAttribute("aria-current", "false");

                var level = panel.ownerDocument.createElement("span");
                level.className = "rte-document-outline-item-level";
                level.innerText = "H" + item.level;

                var text = panel.ownerDocument.createElement("span");
                text.innerText = item.text;

                button.appendChild(level);
                button.appendChild(text);
                button.onclick = function () { focusHeading(item); };
                list.appendChild(button);
            })(items[i]);
        }

        syncActiveButton();
    }
}
