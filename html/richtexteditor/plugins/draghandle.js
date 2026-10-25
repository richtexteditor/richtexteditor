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
        // 2026-10-14 Read-only (designMode off) or comments-only: a move changes the document, so it does nothing. tools/review/readonly-audit.mjs
        try { if (String(editor.getDocument().designMode).toLowerCase() === "off" || (editor.getCommentsOnly && editor.getCommentsOnly())) return false; } catch (e) { /* ignore */ }
        var ed = getEditable();
        if (!ed || !block || block.parentNode !== ed) return false;
        if (beforeEl === block || (beforeEl && beforeEl.parentNode !== ed)) return false;
        // Inserting before its own next sibling is a no-op move.
        if (beforeEl === block.nextSibling) return false;
        // 2026-10-14 Suggesting mode refuses a move (the track hook's "move"); see trackedchanges.js.
        if (editor.__trackHook && editor.__trackHook("move", { direction: 0 }) === true) return false;
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
        // 2026-10-17 Shift+F10 / the Menu key with no text selected open the block menu for the caret's block: it
        // opened only from a mouse click on the grip, so block colour (no shortcut of its own) was mouse-only. With text
        // selected these keys stay the AI actions (the core's handler). tools/blocks/block-menu-keyboard.mjs
        if ((e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey && !e.altKey)) && !e.ctrlKey && !e.metaKey && config.dragHandleEnabled !== false) {
            var kdoc = getDoc(), ked = getEditable(), ksel = kdoc && kdoc.getSelection();
            if (ked && ksel && ksel.rangeCount && ksel.isCollapsed) {
                var kblock = topBlockOf(ksel.anchorNode && ksel.anchorNode.nodeType === 3 ? ksel.anchorNode.parentNode : ksel.anchorNode);
                if (kblock && blocks().indexOf(kblock) >= 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    hoverBlock = null;
                    onHover({ target: kblock });
                    var kreturn = ksel.getRangeAt(0).cloneRange();
                    openBlockMenu(kblock);
                    if (blockMenu) blockMenu.__returnRange = kreturn;
                    return;
                }
            }
        }
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
            grip.textContent = "\u283f";   // ⠿
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
        dragging = { block: hoverBlock, x: e.clientX, y: e.clientY, moved: false };
        dropBefore = null;
        e.preventDefault();
        e.stopPropagation();
        var ed = getEditable();
        if (ed && ed.classList) ed.classList.add("rte-drag-active");
        if (grip) grip.classList.add("rte-drag-grip-held");
    }

    function onDragMove(e) {
        if (!dragging) return;
        if (!dragging.moved && (Math.abs(e.clientX - dragging.x) > 3 || Math.abs(e.clientY - dragging.y) > 3)) dragging.moved = true;
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
        var click = !dragging.moved;
        dragging = null;
        hideIndicator();
        var ed = getEditable();
        if (ed && ed.classList) ed.classList.remove("rte-drag-active");
        if (grip) grip.classList.remove("rte-drag-grip-held");
        // A press that never moved is a click on the handle: it opens the block menu and moves nothing.
        if (click) { openBlockMenu(block); hideGrip(); return; }
        hideGrip();
        // Dropping a block onto itself moves nothing.
        if (target !== block) moveBlock(block, target);
    }

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }

    // ---- block menu ------------------------------------------------------
    // 2026-10-12 a click on the handle opens the block's actions, as BlockNote and Plate offer: Duplicate, Move up,
    // Move down, and turning the block into a paragraph or heading. Clicking the handle without dragging used to move
    // the block to the end of the document. tools/blocks/block-menu.mjs

    var blockMenu = null;
    var blockMenuListeners = null;

    // 2026-10-17 labels speak the page's language: their own config.text_ key first, then - when a non-English
    // language pack is loaded (text_language is not "Language") - the pack's existing translation, else English.
    // tools/i18n/block-menu-language.mjs
    function label(own, packKey, fallback) {
        if (config && config["text_" + own]) return config["text_" + own];
        if (packKey && config && config.text_language && config.text_language !== "Language" && config["text_" + packKey]) return config["text_" + packKey];
        return fallback;
    }

    function closeBlockMenu() {
        var doc = getDoc();
        if (blockMenuListeners && doc) {
            doc.removeEventListener("mousedown", blockMenuListeners.mousedown, true);
            doc.removeEventListener("keydown", blockMenuListeners.keydown, true);
            if (blockMenuListeners.outer) {
                blockMenuListeners.outer.removeEventListener("keydown", blockMenuListeners.keydown, true);
                blockMenuListeners.outer.removeEventListener("mousedown", blockMenuListeners.mousedown, true);
            }
        }
        blockMenuListeners = null;
        if (blockMenu && blockMenu.parentNode) blockMenu.parentNode.removeChild(blockMenu);
        blockMenu = null;
    }

    // Put the caret in the block, so the core commands below act on it.
    function placeCaretIn(block) {
        try {
            var doc = getDoc();
            var r = doc.createRange();
            r.selectNodeContents(block);
            r.collapse(true);
            var sel = editor.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
        } catch (e) {}
    }

    function turnInto(block, tag) {
        return function () {
            placeCaretIn(block);
            try { editor.execCommand("formatblock", tag); } catch (e) {}
            fireChange();
        };
    }

    // 2026-10-17 alignment from the block menu (BlockNote and Plate offer it; competitor matrix U4): the editor's own
    // justify commands on that block, so they undo like the toolbar buttons. tools/blocks/block-menu-align.mjs
    function alignOf(block) {
        var a = "";
        try { a = (block.ownerDocument.defaultView.getComputedStyle(block).textAlign || "").toLowerCase(); } catch (e) {}
        if (a === "center" || a === "-webkit-center") return "center";
        if (a === "right" || a === "-webkit-right") return "right";
        if (a === "justify") return "justify";
        if (a === "end") { try { return block.ownerDocument.defaultView.getComputedStyle(block).direction === "rtl" ? "left" : "right"; } catch (e) { return "right"; } }
        return "left";
    }

    function alignBlock(block, command) {
        return function () {
            placeCaretIn(block);
            try { editor.execCommand(command); } catch (e) {}
            fireChange();
        };
    }

    function setActiveItem(item) {
        if (!blockMenu || !item) return;
        var all = blockMenu.querySelectorAll(".rte-block-menu-active");
        for (var n = 0; n < all.length; n++) all[n].classList.remove("rte-block-menu-active");
        item.classList.add("rte-block-menu-active");
        blockMenu.__activeItem = item;
        try { item.focus(); } catch (x) { /* focus is best effort (Firefox: designMode) */ }
    }

    // 2026-10-17 colour from the block menu (BlockNote's block menu has text and background colours; competitor
    // matrix U4): the editor's own forecolor / backcolor commands over the whole block, so they undo like the
    // toolbar's colour panels; Default / None clear it the way the panels' Automatic does. Text colours keep 4.5:1
    // on white. tools/blocks/block-menu-colour.mjs
    var BLOCK_TEXT_COLOURS = [["Grey", "#57606a"], ["Red", "#c62828"], ["Orange", "#b45309"], ["Green", "#2e7d32"], ["Blue", "#1d4ed8"], ["Purple", "#6d28d9"]];
    var BLOCK_BACK_COLOURS = [["Yellow", "#fff3bf"], ["Green", "#dcfce7"], ["Blue", "#dbeafe"], ["Pink", "#fce7f3"], ["Grey", "#f1f5f9"]];

    function colourBlock(block, command, value) {
        return function () {
            try {
                var doc = getDoc();
                var r = doc.createRange();
                r.selectNodeContents(block);
                var sel = editor.getSelection();
                sel.removeAllRanges();
                sel.addRange(r);
                editor.execCommand(command, value);
                placeCaretIn(block);
            } catch (e) {}
            fireChange();
        };
    }

    function colourItems(block) {
        var textWord = label("blockmenu_textcolour", "forecolor", "Text"), backWord = label("blockmenu_backcolour", "backcolor", "Background");
        var list = [{ label: label("blockmenu_back", "", "Back"), run: function () { openBlockMenu(block); } }, { separator: true },
            { label: textWord + ": " + label("blockmenu_default", "colorauto", "Default"), run: colourBlock(block, "forecolor", "") }];
        for (var c = 0; c < BLOCK_TEXT_COLOURS.length; c++) list.push({ label: textWord + ": " + label("blockmenu_colour_" + BLOCK_TEXT_COLOURS[c][0].toLowerCase(), "", BLOCK_TEXT_COLOURS[c][0]), swatch: BLOCK_TEXT_COLOURS[c][1], run: colourBlock(block, "forecolor", BLOCK_TEXT_COLOURS[c][1]) });
        list.push({ separator: true });
        list.push({ label: backWord + ": " + label("blockmenu_none", "colorauto", "None"), run: colourBlock(block, "backcolor", "") });
        for (var g = 0; g < BLOCK_BACK_COLOURS.length; g++) list.push({ label: backWord + ": " + label("blockmenu_colour_" + BLOCK_BACK_COLOURS[g][0].toLowerCase(), "", BLOCK_BACK_COLOURS[g][0]), swatch: BLOCK_BACK_COLOURS[g][1], run: colourBlock(block, "backcolor", BLOCK_BACK_COLOURS[g][1]) });
        return list;
    }

    function openBlockMenu(block, view) {
        closeBlockMenu();
        if (!grip || !grip.parentNode) return;
        var doc = grip.ownerDocument;
        var host = grip.parentNode;
        var list = blocks();
        var i = list.indexOf(block);
        if (i < 0) return;
        var items = [
            { label: label("blockmenu_duplicate", "", "Duplicate"), run: function () { placeCaretIn(block); try { editor.duplicateCurrentBlock(); } catch (e) {} fireChange(); } },
            { label: label("blockmenu_moveup", "", "Move up"), enabled: i > 0, run: function () { moveBlock(block, list[i - 1]); } },
            { label: label("blockmenu_movedown", "", "Move down"), enabled: i < list.length - 1, run: function () { moveBlock(block, list[i + 1].nextSibling); } },
            { label: label("blockmenu_paragraph", "normal", "Paragraph"), run: turnInto(block, "<p>") },
            { label: label("blockmenu_heading1", "h1", "Heading 1"), run: turnInto(block, "<h1>") },
            { label: label("blockmenu_heading2", "h2", "Heading 2"), run: turnInto(block, "<h2>") },
            { label: label("blockmenu_heading3", "h3", "Heading 3"), run: turnInto(block, "<h3>") }
        ];
        var current = alignOf(block);
        items.push({ label: label("blockmenu_colour", "", "Colour\u2026"), run: function () { openBlockMenu(block, "colour"); } });
        items.push({ separator: true });
        items.push({ label: label("blockmenu_alignleft", "justifyleft", "Align left"), radio: true, checked: current === "left", run: alignBlock(block, "justifyleft") });
        items.push({ label: label("blockmenu_aligncentre", "justifycenter", "Align centre"), radio: true, checked: current === "center", run: alignBlock(block, "justifycenter") });
        items.push({ label: label("blockmenu_alignright", "justifyright", "Align right"), radio: true, checked: current === "right", run: alignBlock(block, "justifyright") });
        items.push({ label: label("blockmenu_justify", "justifyfull", "Justify"), radio: true, checked: current === "justify", run: alignBlock(block, "justifyfull") });
        if (view === "colour") items = colourItems(block);
        blockMenu = doc.createElement("div");
        blockMenu.className = "rte-block-menu";
        blockMenu.setAttribute("role", "menu");
        blockMenu.setAttribute("aria-label", ((typeof config !== "undefined" && config && config.text_blk_actions) || "Block actions"));
        blockMenu.setAttribute("contenteditable", "false");
        blockMenu.style.left = grip.style.left || "0px";
        blockMenu.style.top = ((parseInt(grip.style.top, 10) || 0) + 26) + "px";
        for (var k = 0; k < items.length; k++) {
            var it = items[k];
            if (it.separator) {
                var sep = doc.createElement("div");
                sep.setAttribute("role", "separator");
                sep.className = "rte-block-menu-separator";
                blockMenu.appendChild(sep);
                continue;
            }
            var el = doc.createElement("div");
            el.setAttribute("role", it.radio ? "menuitemradio" : "menuitem");
            if (it.radio) el.setAttribute("aria-checked", it.checked ? "true" : "false");
            el.setAttribute("tabindex", "-1");
            el.setAttribute("aria-disabled", it.enabled === false ? "true" : "false");
            el.className = "rte-block-menu-item" + (it.enabled === false ? " rte-block-menu-disabled" : "");
            if (it.swatch) {
                var sw = doc.createElement("span");
                sw.className = "rte-block-menu-swatch";
                sw.setAttribute("aria-hidden", "true");
                sw.style.backgroundColor = it.swatch;
                el.appendChild(sw);
                el.appendChild(doc.createTextNode(it.label));
            } else el.textContent = it.label;
            el.addEventListener("mousedown", function (e) { e.preventDefault(); });
            el.addEventListener("click", (function (item) {
                return function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (item.enabled === false) return;
                    closeBlockMenu();
                    item.run();
                };
            })(it));
            blockMenu.appendChild(el);
        }
        host.appendChild(blockMenu);
        blockMenuListeners = {
            mousedown: function (e) { if (blockMenu && !blockMenu.contains(e.target)) closeBlockMenu(); },
            keydown: function (e) {
                if (!blockMenu) return;
                var items = [].slice.call(blockMenu.querySelectorAll(".rte-block-menu-item:not(.rte-block-menu-disabled)"));
                var at = items.indexOf(doc.activeElement);
                if (at < 0 && blockMenu.__activeItem) at = items.indexOf(blockMenu.__activeItem);
                if (e.key === "Escape" || e.key === "Esc") {
                    e.preventDefault();
                    var returnRange = blockMenu.__returnRange;
                    closeBlockMenu();
                    // 2026-10-14 the editable focus() does not move focus from the host page into the editing
                    // frame, so focus fell to the page body; editor.focus() does (WCAG 2.4.3). tools/blocks/block-menu.mjs
                    try { if (typeof editor.focus === "function") editor.focus(); else { var ed = getEditable(); if (ed && ed.focus) ed.focus(); } } catch (x) { /* focus is best effort */ }
                    // opened from the keyboard: the caret goes back where it was (WebKit lost it on focus)
                    if (returnRange) { try { var rsel = doc.getSelection(); rsel.removeAllRanges(); rsel.addRange(returnRange); } catch (x) { /* best effort */ } }
                } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && items.length) {
                    e.preventDefault();
                    var next = e.key === "ArrowDown" ? (at + 1) % items.length : (at <= 0 ? items.length - 1 : at - 1);
                    setActiveItem(items[next]);
                } else if ((e.key === "Enter" || e.key === " " || e.key === "Spacebar") && at >= 0) {
                    e.preventDefault();
                    items[at].click();
                }
            }
        };
        doc.addEventListener("mousedown", blockMenuListeners.mousedown, true);
        doc.addEventListener("keydown", blockMenuListeners.keydown, true);
        // Focus can sit in the page around the frame (Firefox after a click), so the page hears Escape too.
        var outer = null;
        try { outer = editor.iframe && editor.iframe.ownerDocument; } catch (x) { outer = null; }
        if (outer && outer !== doc) {
            blockMenuListeners.outer = outer;
            outer.addEventListener("keydown", blockMenuListeners.keydown, true);
            outer.addEventListener("mousedown", blockMenuListeners.mousedown, true);
        }
        // The menu takes focus, so the keyboard reaches it (and Escape can close it).
        var firstItem = blockMenu.querySelector(".rte-block-menu-item:not(.rte-block-menu-disabled)");
        if (firstItem) setActiveItem(firstItem);
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
            ".rte-drag-active *{cursor:grabbing !important;}" +
            ".rte-block-menu{position:absolute;z-index:50;min-width:150px;padding:4px;background:#fff;" +
            "border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.14);" +
            "font:13px/1.2 system-ui,sans-serif;color:#0f172a;}" +
            ".rte-block-menu-item{padding:6px 10px;border-radius:5px;cursor:pointer;white-space:nowrap;}" +
            ".rte-block-menu-item:hover,.rte-block-menu-item:focus,.rte-block-menu-item.rte-block-menu-active{background:#e0e7ff;outline:none;}" +
            ".rte-block-menu-disabled{color:#94a3b8;cursor:default;}" +
            ".rte-block-menu-disabled:hover{background:none;}" +
            ".rte-block-menu-separator{height:1px;margin:4px 6px;background:#e2e8f0;}" +
            ".rte-block-menu-swatch{display:inline-block;width:12px;height:12px;margin-right:8px;vertical-align:-1px;border:1px solid rgba(0,0,0,.25);border-radius:3px;}" +
            ".rte-block-menu-item[aria-checked=true]{font-weight:600;}" +
            ".rte-block-menu-item[aria-checked]::before{content:'';display:inline-block;width:14px;}" +
            ".rte-block-menu-item[aria-checked=true]::before{content:'\\2713';}"
        ));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
        // A <style> ELEMENT is governed by style-src: under a strict policy the browser
        // drops its rules, leaving this plugin's UI unstyled. The element above stays
        // the path everyone else takes; this re-injects through the CSSOM only when
        // the policy actually emptied it.
        if (editor && typeof editor.ensureStyleSheetLive === "function") {
            editor.ensureStyleSheetLive(doc, st, "rte-drag-handle-styles", st.textContent);
        }
    }
}
