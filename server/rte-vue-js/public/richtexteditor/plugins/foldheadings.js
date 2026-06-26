if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-06 Foldable headings. Obsidian / Notion / Word-style section folding:
// click the gutter chevron next to a heading (or call the API) to collapse every
// block beneath it, up to the next heading of the same or higher level. Great for
// navigating long structured documents.
//
// Serialization-safe by design: the fold state lives ONLY in runtime CSS classes
// (rte-fold-collapsed on the heading, rte-fold-hidden on the blocks it hides) and
// the chevron is a CSS ::before pseudo-element &mdash; no DOM is injected into the
// content. getHTMLCode / getJSON are wrapped to strip those classes around the
// call, so saved markup is always clean and the folded content is never lost.
RTE_DefaultConfig.plugin_foldheadings = RTE_Plugin_FoldHeadings;
RTE_DefaultConfig.foldHeadingsEnabled = (typeof RTE_DefaultConfig.foldHeadingsEnabled === "undefined")
    ? true : RTE_DefaultConfig.foldHeadingsEnabled;

function RTE_Plugin_FoldHeadings() {
    var obj = this;
    var config, editor;
    var wrapped = false, clickDoc = null;

    obj.PluginName = "FoldHeadings";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        setup();
        try { editor.attachEvent("ready", setup); } catch (e) { /* ignore */ }
        try { editor.attachEvent("aftersethtml", setup); } catch (e) { /* ignore */ }
        setTimeout(setup, 0); setTimeout(setup, 200);
        // Public API.
        editor.toggleHeadingFold = function (h) { if (isHeading(h)) toggleFold(h); };
        editor.unfoldAll = function () { var ed = editor.getEditable(); if (!ed) return; rm(ed.querySelectorAll(".rte-fold-collapsed,.rte-fold-hidden")); };
        editor.foldAtCaret = function () { var h = headingAtCaret(); if (h) toggleFold(h); return !!h; };
    };

    // Re-runnable setup (the editor can recreate the document/body after init).
    function setup() {
        var doc = editor.getDocument();
        if (doc) {
            injectStyles(doc);
            if (doc !== clickDoc) { doc.addEventListener("click", onClick, true); clickDoc = doc; }
        }
        wrapSerializers();
    }

    function isHeading(n) { return n && n.nodeType === 1 && /^H[1-6]$/.test(n.nodeName); }
    function level(n) { return isHeading(n) ? +n.nodeName.charAt(1) : 0; }
    function rm(list) { for (var i = 0; i < list.length; i++) { list[i].classList.remove("rte-fold-collapsed"); list[i].classList.remove("rte-fold-hidden"); } }

    // Blocks from after `heading` up to the next heading of <= its level.
    function blocksUnder(heading) {
        var lv = level(heading), out = [], n = heading.nextElementSibling;
        while (n) {
            if (isHeading(n) && level(n) <= lv) break;
            out.push(n);
            n = n.nextElementSibling;
        }
        return out;
    }

    // The heading of the section the caret is in: the caret's own heading, else
    // the nearest preceding top-level heading sibling.
    function headingAtCaret() {
        try {
            var s = editor.getSelection(); if (!s || s.rangeCount === 0) return null;
            var editable = editor.getEditable();
            var n = s.getRangeAt(0).startContainer;
            while (n && n !== editable) { if (isHeading(n)) return n; n = n.parentNode; }
            // walk up to the top-level block, then back to the nearest heading
            var block = s.getRangeAt(0).startContainer;
            while (block && block.parentNode !== editable && block !== editable) block = block.parentNode;
            while (block && block !== editable) { if (isHeading(block)) return block; block = block.previousElementSibling; }
        } catch (e) {}
        return null;
    }

    function toggleFold(heading) {
        if (heading.classList.contains("rte-fold-collapsed")) unfold(heading);
        else fold(heading);
    }
    function fold(heading) {
        var blocks = blocksUnder(heading);
        if (!blocks.length) return;
        // Caret safety: if the caret sits in a block we're about to hide, move it
        // to the end of the heading so it never ends up stuck in hidden content.
        try {
            var s = editor.getSelection();
            if (s && s.rangeCount) {
                var c = s.getRangeAt(0).startContainer, host = (c.nodeType === 1 ? c : c.parentNode);
                for (var k = 0; k < blocks.length; k++) {
                    if (blocks[k] === host || blocks[k].contains(host)) {
                        var doc = editor.getDocument(), r = doc.createRange();
                        r.selectNodeContents(heading); r.collapse(false);
                        s.removeAllRanges(); s.addRange(r);
                        break;
                    }
                }
            }
        } catch (e) {}
        heading.classList.add("rte-fold-collapsed");
        for (var i = 0; i < blocks.length; i++) blocks[i].classList.add("rte-fold-hidden");
        fireChange();
    }
    function unfold(heading) {
        heading.classList.remove("rte-fold-collapsed");
        var blocks = blocksUnder(heading);
        for (var i = 0; i < blocks.length; i++) blocks[i].classList.remove("rte-fold-hidden");
        fireChange();
    }

    function onClick(e) {
        if (!config.foldHeadingsEnabled) return;
        var t = e.target;
        if (!isHeading(t)) return;
        // Only the left gutter chevron (rendered at left:-0.95em, just OUTSIDE
        // the heading box, so its click offset is negative) toggles. Clicking
        // anywhere in the heading text (offset >= 0) places the caret normally.
        var rect = t.getBoundingClientRect();
        var dx = e.clientX - rect.left;
        if (dx > 2 || dx < -40) return;
        e.preventDefault();
        toggleFold(t);
    }

    function fireChange() { try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {} }

    function injectStyles(doc) {
        if (!doc || doc.getElementById("rte-foldheadings-styles")) return;
        var css =
            ".rte-fold-hidden{display:none !important;}" +
            "h1,h2,h3,h4,h5,h6{position:relative;}" +
            "h1::before,h2::before,h3::before,h4::before,h5::before,h6::before{" +
            "content:'\\25BE';position:absolute;left:-0.95em;top:0;width:0.8em;text-align:center;" +
            "color:#cbd5e1;cursor:pointer;opacity:0;transition:opacity .12s,transform .12s;font-size:.9em;}" +
            "h1:hover::before,h2:hover::before,h3:hover::before,h4:hover::before,h5:hover::before,h6:hover::before{opacity:1;}" +
            "h1.rte-fold-collapsed::before,h2.rte-fold-collapsed::before,h3.rte-fold-collapsed::before," +
            "h4.rte-fold-collapsed::before,h5.rte-fold-collapsed::before,h6.rte-fold-collapsed::before{" +
            "content:'\\25B8';opacity:1;color:#1d67ba;}" +
            "@media (prefers-reduced-motion: reduce){h1::before,h2::before,h3::before,h4::before,h5::before,h6::before{transition:none !important;}}" +
            // Touch / no-hover devices can't reveal a hover-only chevron — keep it
            // visible so headings remain foldable by tap.
            "@media (hover: none),(pointer: coarse){h1::before,h2::before,h3::before,h4::before,h5::before,h6::before{opacity:.5;}}";
        var st = doc.createElement("style");
        st.id = "rte-foldheadings-styles";
        st.appendChild(doc.createTextNode(css));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }

    // Strip fold classes for the duration of a serialization call so saved markup
    // is clean and folded content is never lost.
    function stripFor() {
        var ed = editor.getEditable(); if (!ed) return function () {};
        var collapsed = ed.querySelectorAll(".rte-fold-collapsed");
        var hidden = ed.querySelectorAll(".rte-fold-hidden");
        var i;
        for (i = 0; i < collapsed.length; i++) collapsed[i].classList.remove("rte-fold-collapsed");
        for (i = 0; i < hidden.length; i++) hidden[i].classList.remove("rte-fold-hidden");
        return function restore() {
            for (var j = 0; j < collapsed.length; j++) collapsed[j].classList.add("rte-fold-collapsed");
            for (var k = 0; k < hidden.length; k++) hidden[k].classList.add("rte-fold-hidden");
        };
    }
    function wrapSerializers() {
        if (wrapped) return;
        var names = ["getHTMLCode", "getJSON", "getHTMLContent"];
        var did = false;
        for (var i = 0; i < names.length; i++) {
            (function (name) {
                var orig = editor[name];
                if (typeof orig !== "function" || orig.__rteFoldWrapped) return;
                var w = function () { var restore = stripFor(); try { return orig.apply(editor, arguments); } finally { restore(); } };
                w.__rteFoldWrapped = true;
                editor[name] = w;
                did = true;
            })(names[i]);
        }
        if (did) wrapped = true;
    }
}
