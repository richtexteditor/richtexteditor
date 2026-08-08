if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-28 Text direction / bidirectional text. Arabic, Hebrew, Persian and
// Urdu are written right-to-left, and until now this editor had no way to say so
// — no direction command, no toolbar item, not even a language string. Seventy-two
// translation files do not help if the text still runs the wrong way.
//
// Design notes:
//   - `dir` is CONTENT, not presentation. It must persist in getHTMLCode(), and
//     it is deliberately NOT stripped around serialize the way the page-view
//     overlay or the watermark are. A document whose direction disappeared on
//     save would be unreadable.
//   - Flipping direction SWAPS an explicit physical alignment. `dir` alone only
//     changes the DEFAULT alignment, so a paragraph explicitly set to
//     text-align:left stays hard-left in RTL and looks broken. Word swaps it;
//     so do we.
//   - Detection uses the first-strong algorithm, the same rule the HTML spec
//     defines for dir="auto": the paragraph's direction is that of its first
//     strongly-directional character, ignoring digits and punctuation.
//   - Mixed content is isolated, not just marked. Dropping an LTR URL into an
//     RTL sentence without isolation lets the bidi algorithm reorder the
//     surrounding punctuation, which is how "(https://example.com)" ends up
//     rendering with its brackets swapped.
//
// Not covered here: mirroring the editor's own toolbar/chrome for RTL locales.
// That is theme work in rte_theme_default.css, not document direction.
RTE_DefaultConfig.plugin_textdirection = RTE_Plugin_TextDirection;

// "rtl" | "ltr" | null (leave the document alone)
if (typeof RTE_DefaultConfig.defaultTextDirection === "undefined") RTE_DefaultConfig.defaultTextDirection = null;
// Detect direction from content when HTML is loaded or pasted.
if (typeof RTE_DefaultConfig.textDirectionAutoDetect === "undefined") RTE_DefaultConfig.textDirectionAutoDetect = false;
// Swap an explicit left/right alignment when direction flips.
if (typeof RTE_DefaultConfig.textDirectionSwapAlign === "undefined") RTE_DefaultConfig.textDirectionSwapAlign = true;

function RTE_Plugin_TextDirection() {
    var obj = this;
    var config, editor;
    var boundDoc = null;

    var BLOCKS = { P: 1, DIV: 1, LI: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1,
                   BLOCKQUOTE: 1, TD: 1, TH: 1, PRE: 1, UL: 1, OL: 1, TABLE: 1, SECTION: 1, ARTICLE: 1 };

    // Strongly right-to-left ranges: Hebrew, Arabic (+ supplement, extended),
    // Syriac, Thaana, NKo, Samaritan, Mandaic, and the Arabic presentation forms.
    var RTL_RE = /[֐-׿؀-ۿ܀-ݏݐ-ݿހ-޿߀-߿ࠀ-࠿ࡀ-࡟ࢠ-ࣿיִ-﷿ﹰ-﻿]/;
    // Strongly left-to-right: Latin, Greek, Cyrillic, Armenian, and CJK/Kana
    // (which are LTR for bidi purposes).
    var LTR_RE = /[A-Za-zÀ-ʯͰ-֏ऀ-႟Ḁ-῿Ⰰ-ⷿ⺀-꓏가-힯]/;

    obj.PluginName = "TextDirection";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_textdirection", function (state) {
            state.returnValue = true;
            var v = state && state.value;
            if (v === "rtl" || v === "ltr") obj.Apply(v);
            else obj.Toggle();
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", function () { setup(); afterLoad(); }); } catch (e) {}
        setTimeout(function () { setup(); afterLoad(); }, 0);

        // Public API.
        editor.setTextDirection = function (dir) { return obj.Apply(dir); };
        editor.toggleTextDirection = function () { return obj.Toggle(); };
        editor.getTextDirection = function () { return obj.Current(); };
        editor.setBaseDirection = function (dir) { return obj.Base(dir); };
        editor.getBaseDirection = function () {
            var ed = getEditable();
            return ed ? (ed.getAttribute("dir") || "ltr") : "ltr";
        };
        editor.detectTextDirection = function (text) { return firstStrong(String(text == null ? "" : text)); };
        editor.autoDetectTextDirection = function () { return obj.AutoDetect(); };
        editor.isolateBidi = function (html, dir) { return obj.Isolate(html, dir); };
        editor.insertIsolated = function (html, dir) { return obj.InsertIsolated(html, dir); };
        editor.getTextDirectionCss = function () { return css(); };
    };

    function setup() {
        var doc = getDoc();
        if (!doc || doc === boundDoc) return;
        boundDoc = doc;
        injectStyles(doc);
    }

    function afterLoad() {
        var ed = getEditable();
        if (!ed) return;
        if (config.defaultTextDirection === "rtl" || config.defaultTextDirection === "ltr") {
            if (!ed.getAttribute("dir")) obj.Base(config.defaultTextDirection);
        }
        if (config.textDirectionAutoDetect) obj.AutoDetect();
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    // ---- detection -------------------------------------------------------

    // First-strong: the direction of the first strongly-directional character.
    // Digits, punctuation and whitespace are neutral and skipped, which is why
    // "123 שלום" is RTL and "123 hello" is LTR.
    function firstStrong(text) {
        for (var i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            if (RTL_RE.test(ch)) return "rtl";
            if (LTR_RE.test(ch)) return "ltr";
        }
        return "neutral";
    }

    // ---- selection -------------------------------------------------------

    function blocksInSelection() {
        var ed = getEditable();
        var out = [];
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) return out;
            var range = sel.getRangeAt(0);
            var start = blockOf(range.startContainer);
            var end = blockOf(range.endContainer);
            if (!start) return out;
            if (start === end || range.collapsed) return [start];

            // Walk top-level blocks between the two endpoints.
            var all = ed.querySelectorAll("*");
            var collecting = false;
            for (var i = 0; i < all.length; i++) {
                var el = all[i];
                if (!BLOCKS[el.nodeName]) continue;
                if (el === start) collecting = true;
                if (collecting && !containsBlockChild(el)) out.push(el);
                if (el === end) break;
            }
            if (!out.length) out.push(start);
        } catch (e) {}
        return out;
    }

    // Only leaf-ish blocks get dir, so setting it on a <li> does not also stamp
    // the parent <ul> and double-apply.
    function containsBlockChild(el) {
        for (var i = 0; i < el.children.length; i++) {
            if (BLOCKS[el.children[i].nodeName]) return true;
        }
        return false;
    }

    function blockOf(node) {
        var ed = getEditable();
        var n = node && node.nodeType === 3 ? node.parentNode : node;
        while (n && n !== ed) {
            if (n.nodeType === 1 && BLOCKS[n.nodeName]) return n;
            n = n.parentNode;
        }
        return ed && ed.firstElementChild ? ed.firstElementChild : null;
    }

    // ---- apply -----------------------------------------------------------

    obj.Current = function () {
        var b = blocksInSelection()[0];
        if (!b) return editor.getBaseDirection ? editor.getBaseDirection() : "ltr";
        var d = b.getAttribute("dir");
        if (d) return d;
        try {
            var doc = getDoc();
            var win = doc && (doc.defaultView || doc.parentWindow);
            if (win) return win.getComputedStyle(b).direction || "ltr";
        } catch (e) {}
        return "ltr";
    };

    obj.Apply = function (dir) {
        dir = (dir === "rtl") ? "rtl" : (dir === "auto" ? "auto" : "ltr");
        var blocks = blocksInSelection();
        if (!blocks.length) return false;
        for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            var was = b.getAttribute("dir") || "ltr";
            b.setAttribute("dir", dir);
            if (config.textDirectionSwapAlign !== false && dir !== "auto" && was !== dir) swapAlign(b, dir);
        }
        fireChange();
        return dir;
    };

    obj.Toggle = function () {
        return obj.Apply(obj.Current() === "rtl" ? "ltr" : "rtl");
    };

    // `dir` only changes the DEFAULT alignment. An explicit text-align:left
    // survives the flip and pins the text to the wrong edge, so swap the
    // physical value to the mirror side.
    function swapAlign(el, dir) {
        var cur = (el.style && el.style.textAlign) || el.getAttribute("align") || "";
        if (!cur) return;
        var next = null;
        if (cur === "left") next = "right";
        else if (cur === "right") next = "left";
        if (!next) return;
        // Landing on the new direction's natural side means the explicit value
        // is now redundant; drop it so the block follows `dir` from here on.
        var natural = (dir === "rtl") ? "right" : "left";
        if (el.style) el.style.textAlign = (next === natural) ? "" : next;
        if (el.getAttribute("align")) el.removeAttribute("align");
    }

    obj.Base = function (dir) {
        var ed = getEditable();
        if (!ed) return false;
        dir = (dir === "rtl") ? "rtl" : (dir === "auto" ? "auto" : "ltr");
        ed.setAttribute("dir", dir);
        fireChange();
        return dir;
    };

    // Stamp each block with the direction its own text implies.
    obj.AutoDetect = function () {
        var ed = getEditable();
        if (!ed) return [];
        var out = [];
        var all = ed.querySelectorAll("*");
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (!BLOCKS[el.nodeName] || containsBlockChild(el)) continue;
            var d = firstStrong(el.textContent || "");
            if (d === "neutral") continue;          // nothing to go on: leave it
            if (el.getAttribute("dir") === d) continue;
            el.setAttribute("dir", d);
            out.push({ tag: el.nodeName, dir: d });
        }
        if (out.length) fireChange();
        return out;
    };

    // ---- bidi isolation --------------------------------------------------

    // <bdi> isolates a run so the surrounding text's direction cannot reorder
    // it. Without this, an LTR URL inside an RTL sentence drags the adjacent
    // punctuation to the wrong side.
    obj.Isolate = function (html, dir) {
        var d = (dir === "rtl" || dir === "ltr") ? dir : "auto";
        return '<bdi dir="' + d + '">' + String(html == null ? "" : html) + "</bdi>";
    };

    obj.InsertIsolated = function (html, dir) {
        var doc = getDoc();
        if (!doc) return false;
        var span = doc.createElement("bdi");
        span.setAttribute("dir", (dir === "rtl" || dir === "ltr") ? dir : "auto");
        span.innerHTML = String(html == null ? "" : html);
        try {
            if (typeof editor.insertElement === "function") { editor.insertElement(span); fireChange(); return true; }
        } catch (e) {}
        try {
            var sel = editor.getSelection();
            if (sel && sel.rangeCount) {
                var r = sel.getRangeAt(0);
                r.collapse(false);
                r.insertNode(span);
                r.setStartAfter(span); r.collapse(true);
                sel.removeAllRanges(); sel.addRange(r);
                fireChange();
                return true;
            }
        } catch (e) {}
        return false;
    };

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }

    // ---- styles ----------------------------------------------------------

    function css() {
        return (
            // Lists and quotes carry their decoration on the physical side, so
            // they need flipping too or bullets sit on the wrong edge.
            "[dir='rtl'] ul,[dir='rtl'] ol{padding-right:1.6em;padding-left:0;}" +
            "[dir='rtl'] blockquote{border-right:3px solid #ddd;border-left:0;" +
            "padding-right:.9em;padding-left:0;margin-right:0;}" +
            "[dir='rtl'] table{direction:rtl;}" +
            // Isolation should be visually invisible.
            "bdi{unicode-bidi:isolate;}"
        );
    }

    function injectStyles(doc) {
        if (!doc) return;
        var existing = doc.getElementById("rte-textdirection-styles");
        var text = css();
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        var st = doc.createElement("style");
        st.id = "rte-textdirection-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
