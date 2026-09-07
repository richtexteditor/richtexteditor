if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-07 Dialog accessibility. The editor's dialogs/popups render as
// <rte-dropdown-panel class="rte-panel-general"> containers that hold an
// <rte-dialog-header> title (e.g. "Insert Link") and fields wrapped in
// <rte-dialog-line-URL>, <rte-dialog-line-TEXT>, etc. — but the panel carries no
// role/aria-label and the fields carry no programmatic label, so a screen-reader
// user lands in an unnamed dialog on unlabeled inputs (WCAG 4.1.2 / 1.3.1 / 3.3.2).
//
// This plugin adds the missing metadata WITHOUT touching the core, deriving every
// name from the editor's OWN markup (never guessing): the dialog name is the
// header text, and each field's label is the `rte-dialog-line-<X>` suffix. Plain
// dropdowns (color/font pickers — no <rte-dialog-header>) are deliberately left
// alone so they aren't mislabeled as dialogs.
//
// Disable with config.dialogA11y = false.
RTE_DefaultConfig.plugin_dialoga11y = RTE_Plugin_DialogA11y;
if (typeof RTE_DefaultConfig.dialogA11y === "undefined") RTE_DefaultConfig.dialogA11y = true;

function RTE_Plugin_DialogA11y() {
    var obj = this;
    var config, editor, boundDoc = null, observer = null, timer = null;
    var pending = [];

    obj.PluginName = "DialogA11y";

    // Nicer wording for known field-line suffixes; anything else is title-cased.
    var LINE_LABELS = {
        URL: "URL", SRC: "Source URL", HREF: "URL", LINK: "URL",
        TEXT: "Text", TITLE: "Title", NAME: "Name", CAPTION: "Caption",
        TARGET: "Open in a new window", ALT: "Alternative text",
        WIDTH: "Width", HEIGHT: "Height", SIZE: "Size",
        CLASS: "CSS class", STYLE: "Style", LANG: "Language",
        ROWS: "Rows", COLS: "Columns", COLUMNS: "Columns", BORDER: "Border"
    };

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.dialogA11y === false) return;
        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        setTimeout(setup, 0); setTimeout(setup, 300);
        editor.applyDialogAccessibility = function () { enhanceAll(hostDoc()); };
    };

    function hostDoc() {
        try { if (config.container && config.container.ownerDocument) return config.container.ownerDocument; } catch (e) {}
        return (typeof document !== "undefined") ? document : null;
    }

    function setup() {
        var host = hostDoc(); if (!host) return;
        enhanceAll(host);
        if (host === boundDoc || observer) return;
        boundDoc = host;
        try {
            var MO = (host.defaultView && host.defaultView.MutationObserver) || window.MutationObserver;
            observer = new MO(onMutations);
            observer.observe(host.body || host.documentElement, {
                subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class", "hidden"]
            });
        } catch (e) {}
    }

    function onMutations(muts) {
        for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            if (m.type === "attributes" && isPanel(m.target)) schedule(m.target);
            if (m.addedNodes) {
                for (var j = 0; j < m.addedNodes.length; j++) {
                    var n = m.addedNodes[j];
                    if (n.nodeType !== 1) continue;
                    if (isPanel(n)) schedule(n);
                    if (n.querySelectorAll) {
                        var ps = n.querySelectorAll("rte-dropdown-panel,[class*='rte-panel-general']");
                        for (var k = 0; k < ps.length; k++) schedule(ps[k]);
                    }
                }
            }
        }
    }

    // 2026-09-05 Widened. The original selector only matched
    // <rte-dropdown-panel>/.rte-panel-general, but Find&Replace, Insert Link and
    // their siblings render as <rte-dialog-float class="rte-panel-find"> wrapping
    // an <rte-dialog-inner role="dialog">. Those carry EXACTLY the markup this
    // plugin consumes - an <rte-dialog-header> and <rte-dialog-line-X> field
    // wrappers - and were simply never visited, so the plugin reported nothing
    // and covered nothing. Measured before the change: calling
    // editor.applyDialogAccessibility() with the find dialog open labelled 0 of
    // its 4 inputs, leaving "Find" and "Replace" announced as bare "edit"
    // (WCAG 1.3.1 / 3.3.2 / 4.1.2) while the two checkboxes were fine because
    // the core happens to wrap those in <label>.
    //
    // Widening is safe because enhancePanel() still requires an
    // <rte-dialog-header>, which is what keeps colour/font dropdowns out.
    function isPanel(el) {
        return el && el.nodeType === 1 &&
            (el.tagName === "RTE-DROPDOWN-PANEL" || el.tagName === "RTE-DIALOG-FLOAT" ||
             /rte-panel-general/.test(el.className || ""));
    }

    function schedule(panel) {
        if (pending.indexOf(panel) < 0) pending.push(panel);
        if (timer) return;
        timer = setTimeout(function () {
            timer = null;
            var list = pending.slice(); pending.length = 0;
            for (var i = 0; i < list.length; i++) {
                enhancePanel(list[i]);
                // Some dialog fields render lazily after the panel opens; run a
                // second pass so they still get labelled.
                (function (pnl) { setTimeout(function () { enhancePanel(pnl); }, 60); })(list[i]);
            }
        }, 0);
    }

    function enhanceAll(host) {
        if (!host || !host.querySelectorAll) return;
        var ps = host.querySelectorAll("rte-dropdown-panel,rte-dialog-float,[class*='rte-panel-general']");
        for (var i = 0; i < ps.length; i++) enhancePanel(ps[i]);
    }

    function enhancePanel(panel) {
        if (!panel || panel.nodeType !== 1 || !panel.querySelector) return;
        var headerEl = panel.querySelector("rte-dialog-header");
        if (!headerEl) return; // only header-bearing panels are dialogs

        var name = (headerEl.textContent || "").trim()
            .replace(/\s*\((?:Ctrl|Cmd|Alt|Shift|⌘|⇧|⌥)[^)]*\)\s*$/i, "").trim();

        // Name the element that IS the dialog. The float-style panels already
        // carry role="dialog" on an inner <rte-dialog-inner>; adding a second
        // role="dialog" to the wrapper would announce two nested dialogs, so
        // when an inner one exists it is the target and the wrapper is left
        // alone. When there is none (the original dropdown-panel shape) this
        // resolves to the panel itself and behaves exactly as before.
        var dialogEl = panel.getAttribute("role") === "dialog"
            ? panel
            : (panel.querySelector('[role="dialog"]') || panel);

        // A titled, form-bearing popup is a dialog, not a menu — override the
        // core's default role="menu" (a menu must not contain text fields).
        var role = dialogEl.getAttribute("role");
        if (!role || role === "menu") dialogEl.setAttribute("role", "dialog");
        if (name && !dialogEl.getAttribute("aria-label") && !dialogEl.getAttribute("aria-labelledby")) {
            dialogEl.setAttribute("aria-label", name);
        }

        var fields = panel.querySelectorAll("input,select,textarea");
        for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            if (f.type === "hidden") continue;
            if (f.getAttribute("aria-label") || f.getAttribute("aria-labelledby")) continue;
            if (f.labels && f.labels.length) continue;
            var label = fieldLabel(f, name);
            if (label) f.setAttribute("aria-label", label);
        }
    }

    function fieldLabel(f, dialogName) {
        // 0) THE VISIBLE LABEL WINS. 2026-09-05: deriving the name from the
        // <rte-dialog-line-X> suffix alone produced "Keyword" for a field whose
        // visible label reads "Find". That fails WCAG 2.5.3 Label in Name, and
        // it breaks speech input concretely: a user says "Find" and nothing
        // matches, because the accessible name does not contain the words they
        // can see. The markup already carries the right text in a sibling
        // <rte-dialog-input-label>, so prefer it and keep the suffix as the
        // fallback for fields that have no visible label.
        var lineEl = f.parentElement;
        for (var d = 0; d < 8 && lineEl; d++) {
            if (/^RTE-DIALOG-LINE-/.test(lineEl.tagName || "")) break;
            lineEl = lineEl.parentElement;
        }
        if (lineEl && lineEl.querySelector) {
            var visEl = lineEl.querySelector("rte-dialog-input-label");
            var vis = visEl ? (visEl.textContent || "").replace(/^\s+|\s+$/g, "").replace(/[:：]\s*$/, "") : "";
            if (vis) return vis;
        }

        // 1) nearest <rte-dialog-line-X> ancestor — the suffix is the field meaning
        var n = f.parentElement;
        for (var i = 0; i < 8 && n; i++) {
            var mm = /^RTE-DIALOG-LINE-(.+)$/.exec(n.tagName || "");
            if (mm) {
                var key = mm[1].toUpperCase().replace(/-/g, " ").trim();
                var first = key.split(" ")[0];
                if (LINE_LABELS[key]) return LINE_LABELS[key];
                if (LINE_LABELS[first]) return LINE_LABELS[first];
                return titleCase(key);
            }
            n = n.parentElement;
        }
        // 2) placeholder
        var ph = f.getAttribute("placeholder"); if (ph) return ph;
        // 3) nearby visible text
        var near = nearbyText(f); if (near) return near;
        // 4) contextual fallback (the dialog name) — not wrong, just generic
        return dialogName || null;
    }

    function nearbyText(f) {
        var prev = f.previousElementSibling;
        if (prev && prev.textContent && prev.textContent.trim() && prev.textContent.trim().length < 30) return prev.textContent.trim();
        var par = f.parentElement;
        if (par) {
            for (var k = 0; k < par.childNodes.length; k++) {
                var nd = par.childNodes[k];
                if (nd.nodeType === 3 && nd.textContent.trim()) return nd.textContent.trim().slice(0, 40);
            }
        }
        return "";
    }

    function titleCase(s) { return s.toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
}
