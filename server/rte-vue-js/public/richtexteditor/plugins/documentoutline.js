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

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.documentOutlineEnabled === false) return;

        config.documentOutlineTitle = config.documentOutlineTitle || "Outline";
        config.documentOutlineHint = config.documentOutlineHint || "Browse headings and jump through long documents without leaving the editor.";
        config.documentOutlineEmptyText = config.documentOutlineEmptyText || "Add headings to build the document outline.";
        if (typeof config.documentOutlineAutoOpen !== "boolean") config.documentOutlineAutoOpen = false;
        if (typeof config.documentOutlineMinLevel !== "number") config.documentOutlineMinLevel = 1;
        if (typeof config.documentOutlineMaxLevel !== "number") config.documentOutlineMaxLevel = 6;

        appendToolbarCommand("toolbar_default", "#{documentoutline}");
        appendToolbarCommand("toolbar_full", "#{documentoutline}");
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
        var style = hostDoc.createElement("style");
        style.id = "rte-document-outline-style";
        style.innerHTML = [
            ".rte-document-outline-shell{display:flex;align-items:stretch;gap:10px;}",
            ".rte-document-outline-shell>.rte-document-outline-host{flex:1 1 auto;min-width:0;}",
            ".rte-document-outline-panel{display:none;flex:0 0 286px;min-width:248px;max-width:min(330px,30vw);border:1px solid rgba(148,163,184,.22);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.96));box-shadow:0 18px 42px rgba(29,78,216,.12),0 2px 8px rgba(15,23,42,.06);overflow:hidden;color:#172033;font-family:Aptos,'Segoe UI',sans-serif;}",
            ".rte-document-outline-shell.is-open>.rte-document-outline-panel{display:flex;flex-direction:column;}",
            ".rte-document-outline-header{padding:12px 12px 9px 14px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.72);}",
            ".rte-document-outline-kicker{font-size:10px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;color:#52657e;font-weight:850;}",
            ".rte-document-outline-title{margin-top:3px;font-size:15px;line-height:1.2;font-weight:850;color:#172033;}",
            ".rte-document-outline-copy{margin-top:5px;font-size:12px;line-height:1.42;color:#52657e;}",
            ".rte-document-outline-toolbar{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 8px 14px;border-bottom:1px solid rgba(148,163,184,.16);gap:10px;background:rgba(255,255,255,.52);}",
            ".rte-document-outline-count{min-width:0;font-size:12px;font-weight:750;color:#52657e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".rte-document-outline-close{appearance:none;border:1px solid rgba(100,116,139,.18);background:#fff;color:#315277;cursor:pointer;font-size:12px;font-weight:750;padding:6px 9px;border-radius:999px;line-height:1;}",
            ".rte-document-outline-close:hover,.rte-document-outline-close:focus-visible{background:#eef4ff;color:#0f3f9f;border-color:rgba(37,99,235,.28);}",
            ".rte-document-outline-body{padding:6px;overflow:auto;min-height:140px;max-height:520px;scrollbar-width:thin;}",
            ".rte-document-outline-list{display:flex;flex-direction:column;gap:5px;}",
            ".rte-document-outline-item{appearance:none;width:100%;text-align:left;border:1px solid transparent;background:transparent;color:#172033;cursor:pointer;border-radius:12px;padding:8px 10px 8px calc(10px + (var(--rte-outline-level,1) - 1) * 12px);font-size:13px;line-height:1.35;font-weight:650;}",
            ".rte-document-outline-item:hover,.rte-document-outline-item:focus-visible{background:#f8fbff;border-color:rgba(37,99,235,.18);}",
            ".rte-document-outline-item.is-active{background:#eef4ff;border-color:rgba(37,99,235,.26);color:#0f3f9f;box-shadow:0 8px 18px rgba(37,99,235,.1);}",
            ".rte-document-outline-item-level{display:inline-flex;margin:0 0 3px;padding:2px 6px;border-radius:999px;background:#fff;color:#64748b;font-size:10px;line-height:1.1;letter-spacing:.08em;text-transform:uppercase;font-weight:850;box-shadow:inset 0 0 0 1px rgba(148,163,184,.18);}",
            ".rte-document-outline-empty{margin:6px;padding:14px;color:#52657e;font-size:13px;font-weight:700;line-height:1.55;background:#fff;border:1px dashed rgba(148,163,184,.34);border-radius:14px;}",
            "@media (max-width: 1100px){.rte-document-outline-shell{display:block;}.rte-document-outline-panel{margin-top:12px;max-width:none;width:100%;}.rte-document-outline-body{max-height:320px;}}"
        ].join("");
        hostDoc.head.appendChild(style);
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
        kicker.innerText = "Document";
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
        close.innerText = "Hide";
        close.setAttribute("aria-label", "Hide document outline");
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

    function openPanel() {
        ensureShell();
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
        var counts = {};
        var items = [];
        var i;
        for (i = 0; i < headings.length; i++) {
            var heading = headings[i];
            var level = parseInt(heading.nodeName.substring(1), 10);
            if (level < minLevel || level > maxLevel) continue;
            var text = (heading.innerText || heading.textContent || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
            var baseId = heading.id || slugifyHeading(text);
            counts[baseId] = (counts[baseId] || 0) + 1;
            var resolvedId = heading.id || (counts[baseId] === 1 ? baseId : (baseId + "-" + counts[baseId]));
            if (!heading.id) heading.id = resolvedId;
            items.push({
                id: heading.id,
                level: level,
                text: text || ("Heading " + (items.length + 1)),
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
        if (count) count.innerText = items.length + " heading" + (items.length === 1 ? "" : "s");
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
