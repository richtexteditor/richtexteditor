if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

RTE_DefaultConfig.plugin_contentminimap = RTE_Plugin_ContentMinimap;

function RTE_Plugin_ContentMinimap() {
    var obj = this;
    var config;
    var editor;
    var shell = null;
    var panel = null;
    var preview = null;
    var viewport = null;
    var empty = null;
    var refreshTimer = 0;
    var dragState = null;

    obj.PluginName = "ContentMinimap";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.contentMinimapEnabled === false) return;

        if (typeof config.contentMinimapAutoOpen !== "boolean") config.contentMinimapAutoOpen = false;
        if (typeof config.contentMinimapWidth !== "number") config.contentMinimapWidth = 168;
        if (typeof config.contentMinimapScale !== "number") config.contentMinimapScale = 0.14;
        config.contentMinimapTitle = config.contentMinimapTitle || "Minimap";
        config.contentMinimapHint = config.contentMinimapHint || "Keep your place in long documents and jump by clicking the miniature preview.";
        config.contentMinimapEmptyText = config.contentMinimapEmptyText || "Start typing to build the document preview.";

        appendToolbarCommand("toolbar_default", "#{contentminimap}");
        appendToolbarCommand("toolbar_full", "#{contentminimap}");
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.contentMinimapEnabled === false) return;

        editor.contentMinimap = {
            close: function () { closePanel(); },
            isOpen: function () { return !!(shell && shell.classList.contains("is-open")); },
            open: function () { openPanel(); },
            refresh: function () { renderSnapshot(); syncViewport(); },
            toggle: function () { togglePanel(); }
        };

        injectStyles();

        editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
        editor.toolbarFactoryMap["contentminimap"] = function (cmd) {
            return editor.createToolbarButton(cmd);
        };

        editor.attachEvent("exec_command_contentminimap", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            togglePanel();
        });
        editor.attachEvent("change", function () {
            scheduleRefresh();
        });

        ensureShell();
        bindScroll();
        bindResize();
        renderSnapshot();
        syncViewport();
        if (config.contentMinimapAutoOpen) openPanel();
    };

    function appendToolbarCommand(toolbar, item) {
        if (!config[toolbar]) return;
        if (config[toolbar].indexOf(item) !== -1) return;
        config[toolbar] = config[toolbar] + item;
    }

    function injectStyles() {
        var hostDoc = config.container.ownerDocument;
        if (hostDoc.getElementById("rte-content-minimap-style")) return;
        var style = hostDoc.createElement("style");
        style.id = "rte-content-minimap-style";
        style.innerHTML = [
            ".rte-content-minimap-shell{display:flex;align-items:stretch;gap:10px;}",
            ".rte-content-minimap-shell>.rte-content-minimap-host{flex:1 1 auto;min-width:0;}",
            ".rte-content-minimap-panel{display:none;flex:0 0 var(--rte-content-minimap-width,168px);min-width:148px;max-width:220px;border:1px solid rgba(148,163,184,.22);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.96));box-shadow:0 18px 42px rgba(29,78,216,.12),0 2px 8px rgba(15,23,42,.06);overflow:hidden;color:#172033;font-family:Aptos,'Segoe UI',sans-serif;}",
            ".rte-content-minimap-shell.is-open>.rte-content-minimap-panel{display:flex;flex-direction:column;}",
            ".rte-content-minimap-header{padding:12px 12px 9px 14px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.72);}",
            ".rte-content-minimap-kicker{font-size:10px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;color:#52657e;font-weight:850;}",
            ".rte-content-minimap-title{margin-top:3px;font-size:15px;line-height:1.2;font-weight:850;color:#172033;}",
            ".rte-content-minimap-copy{margin-top:5px;font-size:12px;line-height:1.42;color:#52657e;}",
            ".rte-content-minimap-toolbar{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 8px 14px;border-bottom:1px solid rgba(148,163,184,.16);gap:8px;background:rgba(255,255,255,.52);}",
            ".rte-content-minimap-meta{min-width:0;font-size:12px;font-weight:750;color:#52657e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".rte-content-minimap-close{appearance:none;border:1px solid rgba(100,116,139,.18);background:#fff;color:#315277;cursor:pointer;font-size:12px;font-weight:750;padding:6px 9px;border-radius:999px;line-height:1;}",
            ".rte-content-minimap-close:hover,.rte-content-minimap-close:focus-visible{background:#eef4ff;color:#0f3f9f;border-color:rgba(37,99,235,.28);}",
            ".rte-content-minimap-body{padding:6px;overflow:auto;min-height:140px;max-height:520px;scrollbar-width:thin;}",
            ".rte-content-minimap-canvas{position:relative;border-radius:14px;background:#fff;border:1px solid rgba(148,163,184,.18);overflow:hidden;min-height:120px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.7);}",
            ".rte-content-minimap-preview{position:relative;transform-origin:top left;pointer-events:none;color:#172033;background:#fff;}",
            ".rte-content-minimap-preview>*{max-width:100%;}",
            ".rte-content-minimap-preview img,.rte-content-minimap-preview table,.rte-content-minimap-preview iframe,.rte-content-minimap-preview video{max-width:100% !important;}",
            ".rte-content-minimap-preview [contenteditable]{pointer-events:none;}",
            ".rte-content-minimap-viewport{position:absolute;left:0;right:0;border:1px solid rgba(37,99,235,.62);background:linear-gradient(180deg,rgba(37,99,235,.18) 0%,rgba(14,165,233,.12) 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.48),0 8px 18px rgba(37,99,235,.16);border-radius:10px;cursor:grab;}",
            ".rte-content-minimap-viewport.is-dragging{cursor:grabbing;}",
            ".rte-content-minimap-empty{position:absolute;inset:auto 8px 8px 8px;padding:10px;border-radius:12px;background:rgba(255,255,255,.94);color:#52657e;font-size:12px;font-weight:700;line-height:1.45;border:1px dashed rgba(148,163,184,.32);}",
            "@media (max-width: 1100px){.rte-content-minimap-shell{display:block;}.rte-content-minimap-panel{margin-top:12px;max-width:none;width:100%;}.rte-content-minimap-body{max-height:280px;}}"
        ].join("");
        hostDoc.head.appendChild(style);
    }

    function ensureShell() {
        if (shell) return shell;
        var container = config.container;
        var hostDoc = container.ownerDocument;
        shell = hostDoc.createElement("div");
        shell.className = "rte-content-minimap-shell";

        var host = hostDoc.createElement("div");
        host.className = "rte-content-minimap-host";

        var parent = container.parentNode;
        parent.insertBefore(shell, container);
        shell.appendChild(host);
        host.appendChild(container);

        panel = hostDoc.createElement("aside");
        panel.className = "rte-content-minimap-panel";
        panel.style.setProperty("--rte-content-minimap-width", String(Math.max(148, config.contentMinimapWidth || 168)) + "px");
        panel.setAttribute("aria-label", config.contentMinimapTitle);
        panel.setAttribute("role", "complementary");

        var header = hostDoc.createElement("div");
        header.className = "rte-content-minimap-header";
        var kicker = hostDoc.createElement("div");
        kicker.className = "rte-content-minimap-kicker";
        kicker.innerText = "Document";
        var title = hostDoc.createElement("div");
        title.className = "rte-content-minimap-title";
        title.innerText = config.contentMinimapTitle;
        var copy = hostDoc.createElement("div");
        copy.className = "rte-content-minimap-copy";
        copy.innerText = config.contentMinimapHint;
        header.appendChild(kicker);
        header.appendChild(title);
        header.appendChild(copy);

        var toolbar = hostDoc.createElement("div");
        toolbar.className = "rte-content-minimap-toolbar";
        var meta = hostDoc.createElement("div");
        meta.className = "rte-content-minimap-meta";
        meta.setAttribute("data-rte-content-minimap-meta", "1");
        var close = hostDoc.createElement("button");
        close.type = "button";
        close.className = "rte-content-minimap-close";
        close.innerText = "Hide";
        close.setAttribute("aria-label", "Hide content minimap");
        close.onclick = function () { closePanel(); };
        toolbar.appendChild(meta);
        toolbar.appendChild(close);

        var body = hostDoc.createElement("div");
        body.className = "rte-content-minimap-body";
        var canvas = hostDoc.createElement("div");
        canvas.className = "rte-content-minimap-canvas";
        canvas.addEventListener("click", handleCanvasClick, false);

        preview = hostDoc.createElement("div");
        preview.className = "rte-content-minimap-preview";

        viewport = hostDoc.createElement("div");
        viewport.className = "rte-content-minimap-viewport";
        viewport.setAttribute("role", "presentation");
        viewport.addEventListener("mousedown", beginViewportDrag, false);

        empty = hostDoc.createElement("div");
        empty.className = "rte-content-minimap-empty";
        empty.innerText = config.contentMinimapEmptyText;

        canvas.appendChild(preview);
        canvas.appendChild(viewport);
        canvas.appendChild(empty);
        body.appendChild(canvas);

        panel.appendChild(header);
        panel.appendChild(toolbar);
        panel.appendChild(body);
        shell.appendChild(panel);
        return shell;
    }

    function bindScroll() {
        var doc = editor.getDocument ? editor.getDocument() : null;
        if (!doc || doc.__rteContentMinimapBound) return;
        doc.__rteContentMinimapBound = true;
        doc.addEventListener("scroll", function () {
            syncViewport();
        }, true);
    }

    function bindResize() {
        var hostWindow = config.container.ownerDocument.defaultView;
        if (!hostWindow || hostWindow.__rteContentMinimapBound) return;
        hostWindow.__rteContentMinimapBound = true;
        hostWindow.addEventListener("resize", function () {
            scheduleRefresh();
        });
    }

    function togglePanel() {
        if (shell && shell.classList.contains("is-open")) closePanel();
        else openPanel();
    }

    function openPanel() {
        ensureShell();
        shell.classList.add("is-open");
        renderSnapshot();
        syncViewport();
        notifyResize();
    }

    function closePanel() {
        if (!shell) return;
        shell.classList.remove("is-open");
        notifyResize();
    }

    // Opening / closing the minimap changes the editor's available width.
    // Editors that size their toolbar / editable on a width recompute (responsive
    // wrap, sticky-toolbar geometry) need a nudge to re-lay-out for the new width;
    // a resize notification is a harmless no-op when the editor is already fluid.
    function notifyResize() {
        var fire = function () {
            try { if (editor && typeof editor.fireEvent === "function") editor.fireEvent("resize"); } catch (e) {}
            try { if (editor && typeof editor.updateLayout === "function") editor.updateLayout(); } catch (e) {}
            try {
                var hostDoc = config.container.ownerDocument;
                var win = hostDoc.defaultView || window;
                win.dispatchEvent(new win.Event("resize"));
            } catch (e) {}
        };
        fire();
        var raf = (typeof requestAnimationFrame === "function") ? requestAnimationFrame : function (f) { return setTimeout(f, 16); };
        raf(fire);
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
            renderSnapshot();
            syncViewport();
        }, 80);
    }

    function getEditable() {
        return editor.getEditable ? editor.getEditable() : null;
    }

    function getScrollElement() {
        var doc = editor.getDocument ? editor.getDocument() : null;
        if (!doc) return null;
        return doc.scrollingElement || doc.documentElement || doc.body || getEditable();
    }

    function getScale() {
        var scale = config.contentMinimapScale || 0.14;
        if (scale < 0.06) scale = 0.06;
        if (scale > 0.22) scale = 0.22;
        return scale;
    }

    function renderSnapshot() {
        ensureShell();
        var editable = getEditable();
        if (!editable || !preview) return;

        var html = editable.innerHTML || "";
        preview.innerHTML = html;

        var scale = getScale();
        var sourceWidth = Math.max(editable.scrollWidth || editable.clientWidth || 600, 320);
        var sourceHeight = Math.max(editable.scrollHeight || editable.clientHeight || 0, 0);
        var targetWidth = Math.max(120, Math.round(sourceWidth * scale));
        var targetHeight = Math.max(120, Math.round(sourceHeight * scale));

        preview.style.width = sourceWidth + "px";
        preview.style.transform = "scale(" + scale + ")";
        preview.parentNode.style.height = targetHeight + "px";
        preview.parentNode.style.width = targetWidth + "px";

        empty.style.display = html.replace(/<[^>]+>/g, "").replace(/\s+/g, "") ? "none" : "block";

        var meta = panel.querySelector("[data-rte-content-minimap-meta]");
        if (meta) meta.innerText = Math.max(1, Math.round(sourceHeight / Math.max(editable.clientHeight || 1, 1))) + " screens";
    }

    function syncViewport() {
        if (!viewport || !preview) return;
        var editable = getEditable();
        var scrollEl = getScrollElement();
        if (!editable || !scrollEl) return;

        var scale = getScale();
        var sourceHeight = Math.max(editable.scrollHeight || scrollEl.scrollHeight || editable.clientHeight || 1, 1);
        var scrollHeight = Math.max(scrollEl.scrollHeight || sourceHeight, sourceHeight);
        var clientHeight = Math.max(scrollEl.clientHeight || editable.clientHeight || 1, 1);
        var maxScroll = Math.max(0, scrollHeight - clientHeight);
        var scaledHeight = Math.max(120, Math.round(sourceHeight * scale));
        var viewportHeight = Math.max(18, Math.round(clientHeight * scale));
        if (viewportHeight > scaledHeight) viewportHeight = scaledHeight;
        var top = maxScroll ? Math.round((scrollEl.scrollTop / maxScroll) * Math.max(0, scaledHeight - viewportHeight)) : 0;

        viewport.style.height = viewportHeight + "px";
        viewport.style.top = top + "px";
        viewport.style.display = scaledHeight > 0 ? "block" : "none";
    }

    function handleCanvasClick(evt) {
        if (evt.target === viewport) return;
        jumpToPreviewOffset(evt.clientY);
    }

    function beginViewportDrag(evt) {
        evt.preventDefault();
        dragState = {
            startY: evt.clientY,
            startTop: parseFloat(viewport.style.top || "0") || 0
        };
        viewport.classList.add("is-dragging");
        var hostDoc = config.container.ownerDocument;
        hostDoc.addEventListener("mousemove", handleViewportDrag, true);
        hostDoc.addEventListener("mouseup", endViewportDrag, true);
    }

    function handleViewportDrag(evt) {
        if (!dragState) return;
        evt.preventDefault();
        var delta = evt.clientY - dragState.startY;
        jumpToScaledOffset(dragState.startTop + delta);
    }

    function endViewportDrag() {
        if (!dragState) return;
        dragState = null;
        viewport.classList.remove("is-dragging");
        var hostDoc = config.container.ownerDocument;
        hostDoc.removeEventListener("mousemove", handleViewportDrag, true);
        hostDoc.removeEventListener("mouseup", endViewportDrag, true);
    }

    function jumpToPreviewOffset(clientY) {
        var rect = preview.parentNode.getBoundingClientRect();
        var offset = clientY - rect.top - ((parseFloat(viewport.style.height || "0") || 0) / 2);
        jumpToScaledOffset(offset);
    }

    function jumpToScaledOffset(offset) {
        var editable = getEditable();
        var scrollEl = getScrollElement();
        if (!editable || !scrollEl || !preview) return;

        var scale = getScale();
        var sourceHeight = Math.max(editable.scrollHeight || scrollEl.scrollHeight || editable.clientHeight || 1, 1);
        var scaledHeight = Math.max(120, Math.round(sourceHeight * scale));
        var viewportHeight = Math.max(18, parseFloat(viewport.style.height || "0") || 18);
        var maxTop = Math.max(0, scaledHeight - viewportHeight);
        var nextTop = Math.max(0, Math.min(maxTop, offset));
        var maxScroll = Math.max(0, (scrollEl.scrollHeight || sourceHeight) - (scrollEl.clientHeight || editable.clientHeight || 1));
        scrollEl.scrollTop = maxTop ? Math.round((nextTop / maxTop) * maxScroll) : 0;
        syncViewport();
    }
}
