if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-06 Typewriter scrolling + Focus mode. Two distraction-free writing
// modes, both purely presentational (no content/DOM mutation, nothing to
// serialize):
//
//   Typewriter mode  — as you type, the editor keeps the caret line pinned to a
//                       fixed vertical position (default: the middle of the
//                       viewport) by scrolling the editable, the way iA Writer /
//                       Typora / Ulysses do. The text moves up to meet a steady
//                       caret instead of the caret marching down the page.
//
//   Focus mode       — dims everything except the block (paragraph / heading /
//                       list-item) the caret is in, so the current sentence
//                       stands out. Notion / iA Writer "focus" behaviour.
//
// Both are runtime-only: focus mode toggles a single class on the editable
// (rte-focus-active) and a transient class on the active block
// (rte-focus-current); typewriter mode only scrolls. Saved markup is untouched,
// and getHTMLCode is wrapped to strip the transient focus class as a belt-and-
// braces guard in case a serialize fires mid-keystroke.
RTE_DefaultConfig.plugin_typewriter = RTE_Plugin_Typewriter;
if (typeof RTE_DefaultConfig.typewriterModeEnabled === "undefined") RTE_DefaultConfig.typewriterModeEnabled = false;
if (typeof RTE_DefaultConfig.focusModeEnabled === "undefined") RTE_DefaultConfig.focusModeEnabled = false;
// 0..1 fraction of the viewport height the caret line is held at (0.5 = middle).
if (typeof RTE_DefaultConfig.typewriterAnchor === "undefined") RTE_DefaultConfig.typewriterAnchor = 0.5;

function RTE_Plugin_Typewriter() {
    var obj = this;
    var config, editor;
    var typewriter = false, focus = false;
    var clickDoc = null, wrapped = false, raf = 0;

    obj.PluginName = "Typewriter";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        typewriter = !!config.typewriterModeEnabled;
        focus = !!config.focusModeEnabled;
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0); setTimeout(setup, 200);

        // Public API.
        editor.setTypewriterMode = function (on) { typewriter = !!on; apply(); return typewriter; };
        editor.setFocusMode = function (on) { focus = !!on; apply(); return focus; };
        editor.toggleTypewriterMode = function () { typewriter = !typewriter; apply(); return typewriter; };
        editor.toggleFocusMode = function () { focus = !focus; apply(); return focus; };
        editor.isTypewriterMode = function () { return typewriter; };
        editor.isFocusMode = function () { return focus; };
    };

    // Re-runnable: the editor can recreate the document/body after init.
    function setup() {
        var doc = editor.getDocument();
        if (doc) {
            injectStyles(doc);
            if (doc !== clickDoc) {
                // One handler drives both modes off any caret movement.
                doc.addEventListener("keyup", onActivity, true);
                doc.addEventListener("mouseup", onActivity, true);
                doc.addEventListener("input", onActivity, true);
                clickDoc = doc;
            }
        }
        wrapSerializers();
        apply();
    }

    function isBlock(n) {
        return n && n.nodeType === 1 && /^(P|H[1-6]|LI|BLOCKQUOTE|PRE|DIV|TD|TH|FIGCAPTION)$/.test(n.nodeName);
    }

    function currentBlock() {
        try {
            var s = editor.getSelection(); if (!s || s.rangeCount === 0) return null;
            var editable = editor.getEditable();
            var n = s.getRangeAt(0).startContainer;
            if (n && n.nodeType === 3) n = n.parentNode;
            var last = null;
            while (n && n !== editable) { if (isBlock(n)) last = n; n = n.parentNode; }
            return last;
        } catch (e) { return null; }
    }

    function caretRect() {
        try {
            var s = editor.getSelection(); if (!s || s.rangeCount === 0) return null;
            var r = s.getRangeAt(0).cloneRange();
            var rect = r.getBoundingClientRect();
            if (rect && (rect.top || rect.bottom || rect.height)) return rect;
            // Collapsed range at a node boundary can yield an empty rect — fall
            // back to the active block's rect.
            var b = currentBlock();
            return b ? b.getBoundingClientRect() : null;
        } catch (e) { return null; }
    }

    function onActivity() {
        if (!typewriter && !focus) return;
        if (raf) return;
        var win = typeof requestAnimationFrame === "function" ? requestAnimationFrame : function (f) { return setTimeout(f, 16); };
        raf = win(function () { raf = 0; if (focus) markFocus(); if (typewriter) scrollToCaret(); });
    }

    function markFocus() {
        var editable = editor.getEditable(); if (!editable) return;
        var prev = editable.querySelectorAll(".rte-focus-current");
        for (var i = 0; i < prev.length; i++) prev[i].classList.remove("rte-focus-current");
        var b = currentBlock();
        if (b) b.classList.add("rte-focus-current");
    }

    function scrollToCaret() {
        var doc = editor.getDocument(); if (!doc) return;
        var rect = caretRect(); if (!rect) return;
        var win = doc.defaultView || doc.parentWindow; if (!win) return;
        var vh = win.innerHeight || doc.documentElement.clientHeight; if (!vh) return;
        var anchor = vh * clamp(config.typewriterAnchor, 0.15, 0.85);
        var caretMid = rect.top + rect.height / 2;
        var delta = caretMid - anchor;
        if (Math.abs(delta) < 2) return;
        // Prefer the document scroller, but if the document itself doesn't scroll
        // (the editable BODY has its own overflow), scroll the editable instead so
        // the caret-pin actually moves the content.
        var scroller = doc.scrollingElement || doc.documentElement || doc.body;
        if (scroller && (scroller.scrollHeight - scroller.clientHeight) <= 4) {
            var ed = editor.getEditable();
            if (ed && (ed.scrollHeight - ed.clientHeight) > 4) scroller = ed;
        }
        if (scroller) scroller.scrollTop += delta;
    }

    function clamp(v, lo, hi) { v = (typeof v === "number" && !isNaN(v)) ? v : 0.5; return v < lo ? lo : (v > hi ? hi : v); }

    function apply() {
        var editable = editor.getEditable(); if (!editable) return;
        if (focus) { editable.classList.add("rte-focus-active"); markFocus(); }
        else {
            editable.classList.remove("rte-focus-active");
            var cur = editable.querySelectorAll(".rte-focus-current");
            for (var i = 0; i < cur.length; i++) cur[i].classList.remove("rte-focus-current");
        }
        if (typewriter) {
            editable.classList.add("rte-typewriter-active");
            scrollToCaret();
        } else {
            editable.classList.remove("rte-typewriter-active");
        }
    }

    function injectStyles(doc) {
        if (!doc || doc.getElementById("rte-typewriter-styles")) return;
        var css =
            // Focus mode: dim the body, restore full opacity on the active block.
            ".rte-focus-active p,.rte-focus-active h1,.rte-focus-active h2,.rte-focus-active h3," +
            ".rte-focus-active h4,.rte-focus-active h5,.rte-focus-active h6,.rte-focus-active li," +
            ".rte-focus-active blockquote,.rte-focus-active pre,.rte-focus-active figcaption{" +
            "opacity:.28;transition:opacity .18s ease;}" +
            ".rte-focus-active .rte-focus-current,.rte-focus-active .rte-focus-current *{opacity:1 !important;}" +
            // Typewriter mode: generous bottom padding so the last lines can still
            // scroll up to the anchor position.
            ".rte-typewriter-active{padding-bottom:45vh !important;}" +
            // Respect reduced-motion: drop the focus-dim opacity transition.
            "@media (prefers-reduced-motion: reduce){.rte-focus-active p,.rte-focus-active h1,.rte-focus-active h2," +
            ".rte-focus-active h3,.rte-focus-active h4,.rte-focus-active h5,.rte-focus-active h6,.rte-focus-active li," +
            ".rte-focus-active blockquote,.rte-focus-active pre,.rte-focus-active figcaption{transition:none !important;}}";
        var st = doc.createElement("style");
        st.id = "rte-typewriter-styles";
        st.appendChild(doc.createTextNode(css));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }

    // Strip the transient focus class around any serialize so saved markup never
    // carries it, even if a save fires mid-keystroke.
    function stripFor() {
        var ed = editor.getEditable(); if (!ed) return function () {};
        var marked = ed.querySelectorAll(".rte-focus-current");
        for (var i = 0; i < marked.length; i++) marked[i].classList.remove("rte-focus-current");
        return function restore() { for (var j = 0; j < marked.length; j++) marked[j].classList.add("rte-focus-current"); };
    }
    function wrapSerializers() {
        if (wrapped) return;
        var names = ["getHTMLCode", "getJSON", "getHTMLContent"];
        var did = false;
        for (var i = 0; i < names.length; i++) {
            (function (name) {
                var orig = editor[name];
                if (typeof orig !== "function" || orig.__rteTwWrapped) return;
                var w = function () { var restore = stripFor(); try { return orig.apply(editor, arguments); } finally { restore(); } };
                w.__rteTwWrapped = true;
                editor[name] = w;
                did = true;
            })(names[i]);
        }
        if (did) wrapped = true;
    }
}
