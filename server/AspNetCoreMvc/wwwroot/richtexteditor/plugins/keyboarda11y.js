if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-08-02 Keyboard and state accessibility for the editor CHROME.
//
// a11yenhance.js names the editing region and dialoga11y.js names the dialogs.
// This closes what an audit of the running editor found still open — four
// findings, three of them WCAG Level A:
//
//   1. KEYBOARD TRAP (2.1.2, Level A). Tab inside the editing area is
//      preventDefault-ed and inserts spaces, so a keyboard-only or screen
//      reader user who enters the editor can never leave it. Reloading the page
//      is the only way out. This is the most serious kind of accessibility
//      defect: it does not degrade the experience, it ends it.
//
//   2. TOGGLE STATE NOT EXPOSED (4.1.2, Level A). Bold, italic, underline and
//      the alignment buttons carry their state in a CSS class
//      (rte-command-active / rte-command-deactive) and nowhere else. Sighted
//      users see a highlighted button; assistive technology is told nothing.
//      Measured: 0 of 6 toggle buttons exposed aria-pressed.
//
//   3. POPUP STATE NOT EXPOSED (4.1.2, Level A). Buttons carry
//      aria-haspopup but never aria-expanded, so there is no way to know
//      whether a menu is open. Measured: 0 of 7.
//
//   4. EVERY TOOLBAR BUTTON IS A TAB STOP (2.4.3, and plain usability).
//      Measured 53. The ARIA Authoring Practices toolbar pattern is a single
//      tab stop per toolbar with arrow keys moving between buttons. 53 presses
//      of Tab to reach the text you came to write is not operable in any
//      meaningful sense.
//
// All four are fixed here rather than in the core, so they ship without a
// re-obfuscation cycle.
//
// Config:
//   config.keyboardA11y = false            // opt out entirely
//   config.a11yEscapeHint = "..."          // wording appended to the editing area's name
//   config.a11yRovingToolbar = false       // keep every button as a tab stop
RTE_DefaultConfig.plugin_keyboarda11y = RTE_Plugin_KeyboardA11y;
if (typeof RTE_DefaultConfig.keyboardA11y === "undefined") RTE_DefaultConfig.keyboardA11y = true;

function RTE_Plugin_KeyboardA11y() {
    var obj = this;
    var config, editor;
    var observers = [];
    var popupOwner = null;          // last activated [aria-haspopup]
    var openPanels = [];            // [{ panel, owner }]

    obj.PluginName = "KeyboardA11y";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.keyboardA11y === false) return;

        editor.focusToolbar = function () { return focusFirstToolbarButton(); };

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        // The toolbar is built asynchronously; a deferred pass catches the case
        // where InitEditor runs before it exists.
        setTimeout(setup, 0);
        setTimeout(setup, 400);
    };

    function shell() {
        try {
            var ed = editor.getEditable();
            if (!ed) return null;
            var win = ed.ownerDocument.defaultView;
            var node = (win && win.frameElement) ? win.frameElement : ed;
            while (node && node.classList && !node.classList.contains("richtexteditor")) node = node.parentNode;
            return (node && node.classList) ? node : null;
        } catch (e) { return null; }
    }

    function setup() {
        var root = shell();
        if (!root) return;
        bindEscapeHatch();
        applyRovingTabindex(root);
        syncToggleStates(root);
        trackPopups(root);
        watch(root);
    }

    // ---------------------------------------------------- 1. keyboard trap
    //
    // Tab keeps its editing meaning (indent, next table cell) because that is
    // what writers expect and what every other editor does. The escape is a
    // separate, documented key: Escape leaves the editing area and puts focus
    // on the toolbar, from which Tab continues through the page normally.
    //
    // Escape is only intercepted when nothing is open — a dialog or dropdown
    // must still get its own Escape first, or closing a colour picker would
    // throw the user out of the editor.
    function bindEscapeHatch() {
        var ed;
        try { ed = editor.getEditable(); } catch (e) { return; }
        if (!ed || ed.__rteEscapeHatch) return;
        ed.__rteEscapeHatch = true;

        ed.addEventListener("keydown", function (e) {
            if (e.key !== "Escape" && e.keyCode !== 27) return;
            if (anythingOpen()) return;           // let the panel close itself
            e.preventDefault();
            e.stopPropagation();
            if (!focusFirstToolbarButton()) focusAfterEditor();
        }, false);

        announceEscape(ed);
    }

    function anythingOpen() {
        try {
            var panels = document.querySelectorAll("rte-dropdown-panel, rte-dialog-float, rte-floatpanel");
            for (var i = 0; i < panels.length; i++) {
                var s = getComputedStyle(panels[i]);
                if (s.display !== "none" && s.visibility !== "hidden") return true;
            }
        } catch (e) {}
        return false;
    }

    // The way out has to be discoverable, or it may as well not exist. The
    // editing region's accessible name is the one thing a screen reader always
    // announces on entry, so the hint goes there rather than into the content.
    function announceEscape(ed) {
        var hint = config.a11yEscapeHint ||
            "Press Escape to leave the editing area.";
        var label = ed.getAttribute("aria-label") || "";
        if (label.indexOf(hint) >= 0) return;
        ed.setAttribute("aria-label", (label ? label.replace(/\s*$/, " ") : "") + hint);
    }

    function focusAfterEditor() {
        var root = shell();
        if (!root) return false;
        var all = [].slice.call(document.querySelectorAll(
            'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )).filter(function (el) {
            return !root.contains(el) && el.offsetParent !== null;
        });
        // The first focusable that follows the editor in document order.
        for (var i = 0; i < all.length; i++) {
            if (root.compareDocumentPosition(all[i]) & Node.DOCUMENT_POSITION_FOLLOWING) {
                all[i].focus();
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------- 4. roving tabindex
    function toolbarsIn(root) {
        return [].slice.call(root.querySelectorAll('[role="toolbar"]'));
    }
    // Toolbars nest — an overflow or ribbon toolbar sits inside the main one.
    // A plain descendant query therefore makes the outer toolbar claim the
    // inner one's buttons, and the two passes fight: the first run measured two
    // tab stops in one toolbar and NONE in the other two, which left those
    // buttons unreachable by keyboard altogether. Each button belongs to its
    // NEAREST toolbar and to no other.
    function buttonsIn(bar) {
        return [].slice.call(bar.querySelectorAll('[role="button"]')).filter(function (b) {
            if (b.getAttribute("aria-disabled") === "true") return false;
            if (b.offsetParent === null) return false;                 // hidden: not reachable anyway
            return (b.closest && b.closest('[role="toolbar"]')) === bar;
        });
    }

    function applyRovingTabindex(root) {
        if (config.a11yRovingToolbar === false) return;
        var bars = toolbarsIn(root);
        for (var i = 0; i < bars.length; i++) {
            (function (bar) {
                var btns = buttonsIn(bar);
                if (!btns.length) return;
                // Exactly one tab stop per toolbar, which is the ARIA pattern.
                var current = btns.filter(function (b) { return b.getAttribute("tabindex") === "0"; })[0] || btns[0];
                for (var j = 0; j < btns.length; j++) btns[j].setAttribute("tabindex", btns[j] === current ? "0" : "-1");

                if (bar.__rteRoving) return;
                bar.__rteRoving = true;
                bar.addEventListener("keydown", function (e) {
                    var list = buttonsIn(bar);
                    var at = list.indexOf(document.activeElement);
                    if (at < 0) return;
                    var rtl = (bar.closest && bar.closest('[dir="rtl"]')) ? true : false;
                    var next = null;
                    if (e.key === "ArrowRight") next = list[(at + (rtl ? -1 : 1) + list.length) % list.length];
                    else if (e.key === "ArrowLeft") next = list[(at + (rtl ? 1 : -1) + list.length) % list.length];
                    else if (e.key === "Home") next = list[0];
                    else if (e.key === "End") next = list[list.length - 1];
                    else return;
                    e.preventDefault();
                    for (var k = 0; k < list.length; k++) list[k].setAttribute("tabindex", list[k] === next ? "0" : "-1");
                    next.focus();
                }, false);
                // Clicking a button makes it the new tab stop, so returning by
                // Tab lands where the user last was.
                bar.addEventListener("focusin", function (e) {
                    var list = buttonsIn(bar);
                    if (list.indexOf(e.target) < 0) return;
                    for (var k = 0; k < list.length; k++) list[k].setAttribute("tabindex", list[k] === e.target ? "0" : "-1");
                }, false);
            })(bars[i]);
        }
    }

    function focusFirstToolbarButton() {
        var root = shell();
        if (!root) return false;
        var bars = toolbarsIn(root);
        for (var i = 0; i < bars.length; i++) {
            var btns = buttonsIn(bars[i]);
            if (!btns.length) continue;
            var target = btns.filter(function (b) { return b.getAttribute("tabindex") === "0"; })[0] || btns[0];
            target.focus();
            return true;
        }
        return false;
    }

    // ------------------------------------------------- 2. aria-pressed
    //
    // The editor already tracks active state — it just keeps it in a class.
    // Mirroring rather than recomputing means the announced state can never
    // disagree with the highlighted button.
    var TOGGLE_CMD = /^(bold|italic|underline|strikethrough|subscript|superscript|justifyleft|justifycenter|justifyright|justifyfull|insertorderedlist|insertunorderedlist|outdent|indent|blockquote|inlinecode|trackchanges|typewriter|focusmode|pagination|formattingmarks|linenumbers|permanentpen|rtlui)$/;

    function syncToggleStates(root) {
        var btns = [].slice.call(root.querySelectorAll('[role="button"][rte-cmd-name]'));
        for (var i = 0; i < btns.length; i++) {
            var cmd = (btns[i].getAttribute("rte-cmd-name") || "").toLowerCase();
            if (!TOGGLE_CMD.test(cmd)) continue;
            var active = btns[i].classList.contains("rte-command-active");
            var pressed = active ? "true" : "false";
            if (btns[i].getAttribute("aria-pressed") !== pressed) btns[i].setAttribute("aria-pressed", pressed);
        }
    }

    // ------------------------------------------------- 3. aria-expanded
    //
    // Opening a menu inserts an <rte-dropdown-panel> elsewhere in the document
    // and leaves the button untouched, so the button and its panel have to be
    // correlated: remember which popup button was activated, then pair it with
    // the panel that appears.
    function trackPopups(root) {
        var pops = [].slice.call(root.querySelectorAll("[aria-haspopup]"));
        for (var i = 0; i < pops.length; i++) {
            if (!pops[i].hasAttribute("aria-expanded")) pops[i].setAttribute("aria-expanded", "false");
            if (pops[i].__rtePopupBound) continue;
            pops[i].__rtePopupBound = true;
            (function (el) {
                function remember() { popupOwner = el; }
                el.addEventListener("mousedown", remember, true);
                el.addEventListener("keydown", function (e) {
                    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") remember();
                }, true);
            })(pops[i]);
        }

        if (trackPopups.bound) return;
        trackPopups.bound = true;
        var mo = new MutationObserver(function (records) {
            for (var r = 0; r < records.length; r++) {
                var rec = records[r];
                for (var a = 0; a < rec.addedNodes.length; a++) {
                    var n = rec.addedNodes[a];
                    if (n.nodeType !== 1 || !isPanel(n)) continue;
                    if (popupOwner) {
                        popupOwner.setAttribute("aria-expanded", "true");
                        openPanels.push({ panel: n, owner: popupOwner });
                        popupOwner = null;
                    }
                }
                for (var d = 0; d < rec.removedNodes.length; d++) {
                    var m = rec.removedNodes[d];
                    if (m.nodeType !== 1 || !isPanel(m)) continue;
                    for (var k = openPanels.length - 1; k >= 0; k--) {
                        if (openPanels[k].panel === m) {
                            openPanels[k].owner.setAttribute("aria-expanded", "false");
                            openPanels.splice(k, 1);
                        }
                    }
                }
            }
        });
        mo.observe(document.body, { childList: true, subtree: true });
        observers.push(mo);
    }
    function isPanel(el) {
        var t = (el.tagName || "").toLowerCase();
        return t === "rte-dropdown-panel" || t === "rte-floatpanel" || t === "rte-dialog-float";
    }

    // Toolbar buttons are rebuilt and re-classed as the selection moves, so the
    // mirrored state has to follow rather than be set once.
    function watch(root) {
        if (root.__rteA11yWatch) return;
        root.__rteA11yWatch = true;
        var pending = null;
        var mo = new MutationObserver(function () {
            if (pending) return;
            pending = setTimeout(function () {
                pending = null;
                syncToggleStates(root);
                applyRovingTabindex(root);
                trackPopups(root);
            }, 60);
        });
        mo.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "aria-disabled"] });
        observers.push(mo);
    }
}
