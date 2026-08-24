if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-08-15 Gap cursor — reach the unreachable places in a document.
//
// A document that ENDS with a table cannot be added to. The caret goes into the
// last cell and stays there: ArrowDown, ArrowRight and End all leave it where it
// was, because there is no node after the table to put it in. Same story for a
// document that STARTS with a table, and for two adjacent tables with no
// paragraph between them — there is no caret position in the gap, so the author
// cannot type there at all. Verified on the running editor before writing this:
// the caret stayed at TABLE>TBODY>TR>TD through every key.
//
// This is the single most-reported "the editor is broken" issue in every
// WYSIWYG that lacks it. Froala ships it as `lineBreaker`, Tiptap as
// `gapcursor`, and ProseMirror has it in core. We had it under no name.
//
// Design notes:
//   - ON DEMAND, never eager. The obvious fix — always append a trailing empty
//     paragraph — mutates every document that ends in a table, so getHTMLCode()
//     starts returning markup the author did not write and a round-trip through
//     the editor is no longer lossless. A paragraph is created only when the
//     author actually asks for one by pressing a key or clicking the gap.
//   - Clicking the blank space below the content is the gesture people already
//     have from Google Docs and Notion, and it needs no overlay DOM: a click
//     that lands on the editable ITSELF (rather than on a child) is by
//     definition a click in a gap. The child list then says which gap.
//   - Only TRAPPING blocks count. A trailing <p> is already reachable, so
//     offering to add another one after it would just spam empty paragraphs.
//   - The inserted paragraph carries a <br> filler. An empty <p> has zero
//     height in most engines, so without it the caret lands somewhere invisible
//     and the author thinks nothing happened.
RTE_DefaultConfig.plugin_gapcursor = RTE_Plugin_GapCursor;

// Click the empty space below/around content to create a paragraph there.
if (typeof RTE_DefaultConfig.gapCursorClick === "undefined") RTE_DefaultConfig.gapCursorClick = true;
// Arrow/Home/End keys escape a trapping block at the document edge.
if (typeof RTE_DefaultConfig.gapCursorKeys === "undefined") RTE_DefaultConfig.gapCursorKeys = true;
// Show a thin insertion hint when hovering a gap between two trapping blocks.
if (typeof RTE_DefaultConfig.gapCursorHint === "undefined") RTE_DefaultConfig.gapCursorHint = true;

function RTE_Plugin_GapCursor() {
    var obj = this;
    var config, editor;
    var boundDoc = null;

    obj.PluginName = "GapCursor";

    // Blocks that cannot host a caret directly beside them. A caret can always
    // be placed inside a paragraph or heading, so those are never "trapping".
    var TRAPPING = {
        TABLE: 1, HR: 1, IMG: 1, FIGURE: 1, IFRAME: 1, VIDEO: 1, AUDIO: 1,
        OBJECT: 1, EMBED: 1, CANVAS: 1, SVG: 1, PRE: 1
    };

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        bind();
        try { editor.attachEvent("ready", bind); } catch (e) {}
        try { editor.attachEvent("aftersethtml", bind); } catch (e) {}
        setTimeout(bind, 0);

        // Public API.
        editor.insertParagraphAt = function (index) { return insertAt(index); };
        editor.insertParagraphAfter = function (el) { return insertAround(el, true); };
        editor.insertParagraphBefore = function (el) { return insertAround(el, false); };
        editor.getGapPositions = function () { return gaps(); };
    };

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function bind() {
        var doc = getDoc();
        var ed = getEditable();
        if (!doc || !ed || doc === boundDoc) return;
        boundDoc = doc;
        injectStyles(doc);

        if (config.gapCursorKeys !== false) ed.addEventListener("keydown", onKeyDown, true);
        if (config.gapCursorClick !== false) ed.addEventListener("click", onClick, true);
        if (config.gapCursorHint !== false) ed.addEventListener("mousemove", onMove, true);
    }

    function isTrapping(el) {
        return !!(el && el.nodeType === 1 && TRAPPING[el.nodeName]);
    }

    function isHint(el) {
        return !!(el && el.nodeType === 1 && el.className === "rte-gap-hint");
    }

    // The editable's real children, with the hover hint filtered out.
    //
    // The hint is itself a child of the editable, so any code that reasons about
    // positions via ed.children sees it as a block: it shifts every index after
    // it, and because a <div> is not "trapping" its presence as the last child
    // made the trailing gap disappear entirely — hovering below a table removed
    // the very gap the hover was advertising, and the click then did nothing.
    function blocks() {
        var ed = getEditable();
        var out = [];
        if (!ed) return out;
        for (var i = 0; i < ed.children.length; i++) {
            if (!isHint(ed.children[i])) out.push(ed.children[i]);
        }
        return out;
    }

    // Every index where a paragraph could usefully be inserted: before a leading
    // trapping block, after a trailing one, and between two adjacent ones.
    function gaps() {
        var out = [];
        var kids = blocks();
        if (!kids.length) return out;
        if (isTrapping(kids[0])) out.push(0);
        for (var i = 0; i < kids.length - 1; i++) {
            if (isTrapping(kids[i]) && isTrapping(kids[i + 1])) out.push(i + 1);
        }
        if (isTrapping(kids[kids.length - 1])) out.push(kids.length);
        return out;
    }

    // ---- insertion -------------------------------------------------------

    function makeParagraph(doc) {
        var p = doc.createElement("p");
        // An empty <p> collapses to zero height, so the caret would land
        // somewhere the author cannot see.
        p.appendChild(doc.createElement("br"));
        return p;
    }

    function insertAt(index) {
        var ed = getEditable();
        var doc = getDoc();
        if (!ed || !doc) return null;
        // Resolve against the hint-free list, then insert relative to that node.
        hideHint();
        var p = makeParagraph(doc);
        var before = blocks()[index] || null;
        ed.insertBefore(p, before);
        focusParagraph(p);
        fireChange();
        return p;
    }

    function insertAround(el, after) {
        var ed = getEditable();
        var doc = getDoc();
        if (!ed || !doc || !el) return null;
        var p = makeParagraph(doc);
        if (after) el.parentNode.insertBefore(p, el.nextSibling);
        else el.parentNode.insertBefore(p, el);
        focusParagraph(p);
        fireChange();
        return p;
    }

    function focusParagraph(p) {
        try {
            var doc = p.ownerDocument;
            var r = doc.createRange();
            r.setStart(p, 0);
            r.collapse(true);
            var sel = editor.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
            editor.focus();
        } catch (e) {}
    }

    // ---- keyboard --------------------------------------------------------

    // The top-level child of the editable that contains this node.
    function topBlockOf(node) {
        var ed = getEditable();
        var n = (node && node.nodeType === 3) ? node.parentNode : node;
        while (n && n.parentNode && n.parentNode !== ed) n = n.parentNode;
        return (n && n.parentNode === ed) ? n : null;
    }

    function onKeyDown(e) {
        var key = e.key;
        var forward = (key === "ArrowDown" || key === "ArrowRight" || key === "End" || key === "PageDown");
        var back = (key === "ArrowUp" || key === "ArrowLeft" || key === "Home" || key === "PageUp");
        if (!forward && !back) return;

        var ed = getEditable();
        if (!ed || !ed.children.length) return;

        var sel = editor.getSelection();
        if (!sel || !sel.rangeCount) return;
        var block = topBlockOf(sel.getRangeAt(0).startContainer);
        if (!isTrapping(block)) return;

        var kids = blocks();
        var index = kids.indexOf(block);
        if (index < 0) return;

        if (forward) {
            var next = kids[index + 1];
            // Escape only where the author is genuinely stuck: nothing after the
            // block, or another trapping block immediately after it.
            if (next && !isTrapping(next)) return;
            e.preventDefault();
            e.stopPropagation();
            insertAt(index + 1);
        } else {
            var prev = kids[index - 1];
            if (prev && !isTrapping(prev)) return;
            e.preventDefault();
            e.stopPropagation();
            insertAt(index);
        }
    }

    // ---- click in a gap --------------------------------------------------

    // A click that lands on the editable itself, not on any child, is a click in
    // the space between or after blocks.
    function onClick(e) {
        var ed = getEditable();
        if (!ed || e.target !== ed) return;
        // Measure the gaps as they are without the hint, or the hint's own box
        // shifts the geometry the click is being resolved against.
        hideHint();
        var index = gapIndexAt(e.clientY);
        if (index === null) return;
        e.preventDefault();
        e.stopPropagation();
        insertAt(index);
    }

    // Which gap does this viewport Y fall in? Below every block means the end.
    function gapIndexAt(clientY) {
        var kids = blocks();
        if (!kids.length) return null;
        var available = gaps();
        if (!available.length) return null;

        for (var i = 0; i < kids.length; i++) {
            var rect = kids[i].getBoundingClientRect();
            if (clientY < rect.top) return allowed(available, i);
            if (clientY <= rect.bottom) return null;      // on the block itself
        }
        return allowed(available, kids.length);
    }

    function allowed(available, index) {
        return available.indexOf(index) >= 0 ? index : null;
    }

    // ---- hover hint ------------------------------------------------------

    var hint = null;
    var hintIndex = null;

    // How close to a block boundary counts as "aiming at the gap".
    var EDGE_TOLERANCE = 10;

    function onMove(e) {
        var ed = getEditable();
        if (!ed) return;
        if (isHint(e.target)) return;              // already on the hint; leave it alone

        // Blank space below/around the content: the click will land on the
        // editable itself and the geometry alone is enough.
        if (e.target === ed) {
            var index = gapIndexAt(e.clientY);
            if (index === null) { hideHint(); return; }
            showHint(index);
            return;
        }

        // Two adjacent tables have ZERO pixels between them, so a click there
        // can never reach the editable — it always lands on one of the tables.
        // The gap is unreachable by mouse unless we put something in it, so
        // hovering near the boundary materialises the hint and the hint itself
        // becomes the click target.
        var near = gapNearEdge(e.clientY);
        if (near === null) { hideHint(); return; }
        showHint(near);
    }

    // A gap whose boundary is within EDGE_TOLERANCE of this Y.
    function gapNearEdge(clientY) {
        var kids = blocks();
        var available = gaps();
        for (var g = 0; g < available.length; g++) {
            var i = available[g];
            var edge;
            if (i === 0) edge = kids[0].getBoundingClientRect().top;
            else edge = kids[i - 1].getBoundingClientRect().bottom;
            if (Math.abs(clientY - edge) <= EDGE_TOLERANCE) return i;
        }
        return null;
    }

    function showHint(index) {
        var ed = getEditable();
        var doc = getDoc();
        if (!ed || !doc) return;
        if (!hint) {
            hint = doc.createElement("div");
            hint.className = "rte-gap-hint";
            hint.setAttribute("contenteditable", "false");
            hint.setAttribute("aria-hidden", "true");
            // The hint is the only clickable thing in a zero-height gap.
            hint.addEventListener("mousedown", function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                if (hintIndex !== null) insertAt(hintIndex);
            }, true);
        }
        var before = blocks()[index] || null;
        // Re-inserting in place would thrash the DOM on every mousemove.
        if (hint.parentNode === ed && hint.nextSibling === before) { hintIndex = index; return; }
        ed.insertBefore(hint, before);
        hintIndex = index;
    }

    function hideHint() {
        if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
        hintIndex = null;
    }

    function fireChange() {
        // The hint is decoration; it must never be in the document when the
        // content is read.
        hideHint();
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }

    // ---- styles ----------------------------------------------------------

    function css() {
        // A real hit area, not just a line: in a zero-height gap between two
        // tables this element IS the click target, so it needs height.
        return ".rte-gap-hint{height:6px;margin:1px 0;position:relative;cursor:text;" +
               "pointer-events:auto;background:transparent;}" +
               ".rte-gap-hint::before{content:'';position:absolute;left:0;right:0;top:2px;" +
               "border-top:2px solid #2563eb;opacity:.65;}" +
               ".rte-gap-hint::after{content:'';position:absolute;left:-3px;top:0;width:6px;height:6px;" +
               "border-radius:50%;background:#2563eb;}";
    }

    function injectStyles(doc) {
        if (!doc) return;
        var text = css();
        var existing = doc.getElementById("rte-gapcursor-styles");
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        var st = doc.createElement("style");
        st.id = "rte-gapcursor-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
