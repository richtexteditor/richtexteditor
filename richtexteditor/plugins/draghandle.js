if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-28 Drag handle — grab a paragraph, heading, list, table or callout by
// the ⠿ grip that appears beside it and drop it somewhere else. The block-
// reordering interaction Notion made standard.
//
// Positioning honesty: NOT claimed as a competitor gap. Tiptap's drag-handle
// docs state no pricing, and CKEditor supports block drag and drop in its free
// core — so this ships without a compare-table row. It is here because moving a
// clause with the mouse beats cut-and-paste, not because someone charges for it.
//
// Design notes:
//   - The grip and the drop indicator live OUTSIDE the editable, in its offset
//     parent — the same placement pagination.js uses for its overlay. Chrome
//     that is not inside the editable structurally cannot leak into
//     getHTMLCode(), which beats stripping it around every serialize.
//   - Dragging is plain mouse events, not HTML5 drag-and-drop. Native DnD
//     inside contenteditable is exactly the browser behaviour that half-works
//     everywhere: it starts a text drag, draws the wrong ghost, and drops
//     serialized HTML instead of moving the node.
//   - Alt+Shift+Up/Down moves the caret's block — the same keys Word uses to
//     move paragraphs. This is not a bonus: a pointer-only reordering feature
//     is unusable from the keyboard, so the keyboard path is what makes the
//     feature accessible at all.
//   - The drop target is decided by the pointer's Y against each block's
//     vertical midpoint, so the indicator always sits where the block will
//     actually land.
RTE_DefaultConfig.plugin_draghandle = RTE_Plugin_DragHandle;

// Show the grip on hover.
if (typeof RTE_DefaultConfig.dragHandleEnabled === "undefined") RTE_DefaultConfig.dragHandleEnabled = true;
// Alt+Shift+ArrowUp / ArrowDown keyboard reordering.
if (typeof RTE_DefaultConfig.dragHandleKeyboard === "undefined") RTE_DefaultConfig.dragHandleKeyboard = true;

function RTE_Plugin_DragHandle() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var grip = null;          // the ⠿ element, in the editable's offset parent
    var indicator = null;     // the drop line
    var hoverBlock = null;    // block the grip is currently attached to
    var dragging = null;      // { block } while a drag is live
    var dropBefore = null;    // element to insert before (null = append at end)

    obj.PluginName = "DragHandle";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0);

        // Public API — the drag is a thin layer over these, so everything the
        // pointer can do is scriptable and testable without synthetic drags.
        editor.moveBlock = function (block, beforeEl) { return moveBlock(block, beforeEl); };
        editor.moveBlockUp = function () { return nudge(-1); };
        editor.moveBlockDown = function () { return nudge(1); };
        editor.setDragHandleEnabled = function (on) {
            config.dragHandleEnabled = !!on;
            if (!on) hideGrip();
            return !!on;
        };
        editor.isDragHandleEnabled = function () { return config.dragHandleEnabled !== false; };
    };

    function setup() {
        var doc = getDoc();
        if (!doc || doc === boundDoc) return;
        boundDoc = doc;
        injectStyles(doc);
        var ed = getEditable();
        if (!ed) return;

        // Grip placement follows the pointer over the editable.
        doc.addEventListener("mousemove", onHover);
        doc.addEventListener("mousedown", onMouseDown, true);
        doc.addEventListener("mousemove", onDragMove, true);
        doc.addEventListener("mouseup", onMouseUp, true);
        doc.addEventListener("keydown", onKeyDown);
        // Leaving the document entirely: tidy up.
        doc.addEventListener("mouseleave", function () { if (!dragging) hideGrip(); });
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    // ---- block model -----------------------------------------------------

    // Movable blocks: the editable's element children, minus any overlay chrome
    // that other plugins park inside it.
    function blocks() {
        var ed = getEditable();
        if (!ed) return [];
        var out = [];
        for (var i = 0; i < ed.children.length; i++) {
            var el = ed.children[i];
            if (el.nodeType !== 1) continue;
            if (el.getAttribute &&
                (el.getAttribute("data-rte-page-overlay") === "true" ||
                 el.getAttribute("data-rte-linenumbers") === "true")) continue;
            out.push(el);
        }
        return out;
    }

    function topBlockOf(node) {
        var ed = getEditable();
        var n = node && node.nodeType === 3 ? node.parentNode : node;
        var last = null;
        while (n && n !== ed) { last = n; n = n.parentNode; }
        return (n === ed && last && last.nodeType === 1) ? last : null;
    }

    function caretBlock() {
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            return topBlockOf(sel.getRangeAt(0).startContainer);
        } catch (e) { return null; }
    }

    // ---- the move itself (shared by pointer and keyboard) ----------------

    function moveBlock(block, beforeEl) {
        var ed = getEditable();
        if (!ed || !block || block.parentNode !== ed) return false;
        if (beforeEl === block || (beforeEl && beforeEl.parentNode !== ed)) return false;
        // Inserting before its own next sibling is a no-op move.
        if (beforeEl === block.nextSibling) return false;
        ed.insertBefore(block, beforeEl || null);
        // Keep the caret with the block that moved — losing the caret is what
        // makes programmatic moves feel broken (same lesson as tabletools sort).
        try {
            var doc = getDoc();
            var r = doc.createRange();
            r.selectNodeContents(block);
            r.collapse(true);
            var sel = editor.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
        } catch (e) {}
        fireChange();
        return true;
    }

    function nudge(dir) {
        var block = caretBlock();
        if (!block) return false;
        var list = blocks();
        var i = list.indexOf(block);
        if (i < 0) return false;
        if (dir < 0) {
            if (i === 0) return false;
            return moveBlock(block, list[i - 1]);
        }
        if (i >= list.length - 1) return false;
        // Moving down = inserting before the element after the next one.
        return moveBlock(block, list[i + 1].nextSibling);
    }

    function onKeyDown(e) {
        if (config.dragHandleKeyboard === false) return;
        if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        if (nudge(e.key === "ArrowUp" ? -1 : 1)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    // ---- grip ------------------------------------------------------------

    function ensureChrome(doc, ed) {
        var host = ed.parentNode || doc.body;
        if (!grip || !grip.parentNode) {
            grip = doc.createElement("div");
            grip.className = "rte-drag-grip";
            grip.setAttribute("contenteditable", "false");
            grip.setAttribute("aria-hidden", "true");
            grip.textContent = "⠿";   // ⠿
            host.appendChild(grip);
        }
        if (!indicator || !indicator.parentNode) {
            indicator = doc.createElement("div");
            indicator.className = "rte-drag-indicator";
            indicator.setAttribute("contenteditable", "false");
            indicator.setAttribute("aria-hidden", "true");
            host.appendChild(indicator);
        }
    }

    function hideGrip() {
        if (grip) grip.style.display = "none";
        hoverBlock = null;
    }

    function hideIndicator() {
        if (indicator) indicator.style.display = "none";
    }

    function onHover(e) {
        if (dragging || config.dragHandleEnabled === false) return;
        var doc = getDoc();
        var ed = getEditable();
        if (!doc || !ed) return;
        var block = null;
        if (e.target === grip) return;             // hovering the grip itself
        if (ed.contains(e.target)) block = topBlockOf(e.target);
        if (!block || blocks().indexOf(block) < 0) { hideGrip(); return; }
        if (block === hoverBlock && grip && grip.style.display !== "none") return;

        ensureChrome(doc, ed);
        hoverBlock = block;
        // RTL documents get the grip on the right, where the line starts.
        var rtl = false;
        try { rtl = (doc.defaultView.getComputedStyle(ed).direction === "rtl"); } catch (x) {}
        grip.style.display = "block";
        grip.style.top = block.offsetTop + "px";
        if (rtl) grip.style.left = (block.offsetLeft + block.offsetWidth + 4) + "px";
        else grip.style.left = Math.max(0, block.offsetLeft - 22) + "px";
    }

    // ---- drag ------------------------------------------------------------

    function onMouseDown(e) {
        if (e.target !== grip || !hoverBlock) return;
        dragging = { block: hoverBlock };
        dropBefore = null;
        e.preventDefault();
        e.stopPropagation();
        var ed = getEditable();
        if (ed && ed.classList) ed.classList.add("rte-drag-active");
        if (grip) grip.classList.add("rte-drag-grip-held");
    }

    function onDragMove(e) {
        if (!dragging) return;
        e.preventDefault();
        var doc = getDoc();
        var ed = getEditable();
        if (!doc || !ed) return;
        ensureChrome(doc, ed);

        // Decide the insertion point from the pointer's Y against each block's
        // midpoint, in the same offsetTop space the indicator is drawn in.
        var list = blocks();
        if (!list.length) return;
        var edRect = ed.getBoundingClientRect();
        var y = e.clientY - edRect.top + (ed.scrollTop || 0);

        dropBefore = null;   // default: end of document
        var lineTop = null;
        for (var i = 0; i < list.length; i++) {
            var b = list[i];
            var mid = b.offsetTop + b.offsetHeight / 2;
            if (y < mid) { dropBefore = b; lineTop = b.offsetTop; break; }
        }
        if (lineTop === null) {
            var lastB = list[list.length - 1];
            lineTop = lastB.offsetTop + lastB.offsetHeight;
        }
        indicator.style.display = "block";
        indicator.style.top = Math.max(0, lineTop - 1) + "px";
        indicator.style.left = ed.offsetLeft + "px";
        indicator.style.width = ed.offsetWidth + "px";
    }

    function onMouseUp() {
        if (!dragging) return;
        var block = dragging.block;
        var target = dropBefore;
        dragging = null;
        hideIndicator();
        var ed = getEditable();
        if (ed && ed.classList) ed.classList.remove("rte-drag-active");
        if (grip) grip.classList.remove("rte-drag-grip-held");
        hideGrip();
        // Dropping a block onto itself moves nothing.
        if (target !== block) moveBlock(block, target);
    }

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }

    // ---- styles ----------------------------------------------------------

    function injectStyles(doc) {
        if (doc.getElementById("rte-drag-handle-styles")) return;
        var st = doc.createElement("style");
        st.id = "rte-drag-handle-styles";
        st.appendChild(doc.createTextNode(
            ".rte-drag-grip{position:absolute;display:none;width:18px;text-align:center;" +
            "color:#94a3b8;font-size:14px;line-height:1.4;cursor:grab;user-select:none;z-index:20;" +
            "border-radius:4px;}" +
            ".rte-drag-grip:hover{background:rgba(148,163,184,.18);color:#475569;}" +
            ".rte-drag-grip-held{cursor:grabbing;color:#1474ea;}" +
            ".rte-drag-indicator{position:absolute;display:none;height:2px;background:#1474ea;" +
            "border-radius:1px;pointer-events:none;z-index:19;}" +
            ".rte-drag-active{cursor:grabbing;}" +
            ".rte-drag-active *{cursor:grabbing !important;}"
        ));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
