if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

if (!RTE_DefaultConfig.svgCode_trackchanges) {
    RTE_DefaultConfig.svgCode_trackchanges = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 17l4-1 10-10-3-3L5 13l-1 4z"/><path d="M14 4l3 3"/><path d="M4 21h10"/></svg>';
}

RTE_DefaultConfig.plugin_trackedchanges = RTE_Plugin_TrackedChanges;

function RTE_Plugin_TrackedChanges() {
    var obj = this;
    var config;
    var editor;
    var enabled = false;

    obj.PluginName = "TrackedChanges";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.trackChangesEnabled === false) return;

        config.currentUser = config.currentUser || null;
        config.trackChangesInsertClass = config.trackChangesInsertClass || "rte-tc rte-tc-insert";
        config.trackChangesDeleteClass = config.trackChangesDeleteClass || "rte-tc rte-tc-delete";
        // Optional application policy for accept/reject. Return false to keep a
        // suggestion pending. The default remains permissive for compatibility.
        config.reviewCanDecide = config.reviewCanDecide || null;
        config.onReviewDecisionDenied = config.onReviewDecisionDenied || null;

        // Toolbar command — only surfaces if the editor page adds it to a toolbar slot.
        config.text_trackchanges = config.text_trackchanges || "Suggesting mode";
        appendToolbarCommand("toolbar_default", "#{trackchanges}");
        appendToolbarCommand("toolbar_full", "#{trackchanges}");
        appendToolbarCommand("toolbar_mobile", "#{trackchanges}");

        if ((config.controltoolbar_TEXT || "").indexOf("trackchanges") === -1) {
            config.controltoolbar_TEXT = (config.controltoolbar_TEXT || "") + "|{trackchanges}";
        }
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.trackChangesEnabled === false) return;

        editor.trackedChanges = {
            enable: function (user) { enable(user); },
            disable: function () { disable(); },
            isEnabled: function () { return enabled; },
            acceptAll: function (filter) { syncFromDocument(); return acceptAll(filter); },
            rejectAll: function (filter) { syncFromDocument(); return rejectAll(filter); },
            accept: function (id) { syncFromDocument(); return acceptEntry(id); },
            reject: function (id) { syncFromDocument(); return rejectEntry(id); },
            canDecide: function (id, action) {
                syncFromDocument();
                var entry = editor.reviewLedger && editor.reviewLedger.get(id);
                return !!entry && canDecide(entry, action || "accept");
            },
            list: function (opts) {
                if (!editor.reviewLedger) return [];
                syncFromDocument();
                // Default to the PENDING review queue (matches the internal
                // accept/reject semantics). Pass {all:true} for full history
                // including accepted/rejected entries (also via reviewLedger.list()).
                var includeAll = opts && opts.all === true;
                return editor.reviewLedger.list().filter(function (e) {
                    if (e.changeType !== "insert" && e.changeType !== "delete" && e.changeType !== "format") return false;
                    return includeAll || e.status === "pending";
                });
            },
            // 2026-10-17 step through the pending suggestions and report the one at the caret.
            // tools/review/suggestion-card.mjs
            next: function () { return stepSuggestion(1); },
            previous: function () { return stepSuggestion(-1); },
            current: function () { var el = suggestionAtCaret(); return el ? el.getAttribute("data-tc-id") : null; }
        };

        injectStyles();

        editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
        editor.toolbarFactoryMap["trackchanges"] = function (cmd) {
            var btn = editor.createToolbarButton(cmd);
            btn.__tcSync = function () {
                if (enabled) btn.classList.add("rte-ui-active");
                else btn.classList.remove("rte-ui-active");
                btn.setAttribute("aria-pressed", enabled ? "true" : "false");
                // WCAG 2.5.3 Label in Name: the visible label (this tooltip) must be
                // contained in the accessible name. "Turn on suggesting mode" was not
                // — the accessible name is "Suggesting mode" — so a speech-input user
                // saying what they see did not match the control. State belongs in
                // aria-pressed and the active styling, not in the visible label.
                btn.setAttribute("title", config.text_trackchanges || "Suggesting mode");
            };
            btn.__tcSync();
            return btn;
        };

        editor.attachEvent("exec_command_trackchanges", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            if (enabled) disable();
            else enable();
        });

        // 2026-10-17 bound through the core so they follow the live editing document (these worked only because this
        // plugin initialises after the last plugin that moves the iframe). tools/keyboard/plugin-listeners-live.mjs
        var bindEd = editor.bindEditableEvent ? function (type, fn) { editor.bindEditableEvent(type, fn, true); } : function (type, fn) { editor.getEditable().addEventListener(type, fn, true); };
        bindEd("beforeinput", onBeforeInput);
        // the suggestion card follows the caret (tools/review/suggestion-card.mjs)
        if (editor.bindDocumentEvent) editor.bindDocumentEvent("selectionchange", function () { scheduleCard(); });
        // 2026-10-17 Alt+F10 moves focus to the suggestion card while it shows (else the core takes it to a toolbar).
        // tools/review/suggestion-card-keyboard.mjs
        if (editor.bindDocumentEvent) editor.bindDocumentEvent("keydown", function (e) {
            if (!(e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === "F10" || e.keyCode === 121))) return;
            if (!sugCard || !sugCard.isConnected) return;
            var first = sugCard.querySelector("button:not([disabled])");
            if (!first) return;
            e.preventDefault();
            e.stopPropagation();
            try { var ks = editor.getDocument().getSelection(); sugCard.__returnRange = ks && ks.rangeCount ? ks.getRangeAt(0).cloneRange() : null; } catch (x) { sugCard.__returnRange = null; }
            try { (sugCard.ownerDocument.defaultView || window).focus(); } catch (x) { /* ignore */ }
            first.focus();
        }, true);
        else { try { editor.getDocument().addEventListener("selectionchange", scheduleCard); } catch (x) { /* no card */ } }
        bindEd("compositionstart", onCompositionStart);
        bindEd("compositionend", onCompositionEnd);
        bindEd("keydown", function (e) { shiftEnter = e.key === "Enter" && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey; });

        // The document is loaded after this runs (the textarea's value, then any setHTMLCode),
        // and an undo or a collaborator can bring tracked spans back: catch the ledger up each time.
        ["setHTMLCode", "setHTML"].forEach(function (name) {
            var original = editor[name];
            if (typeof original !== "function") return;
            editor[name] = function () {
                var result = original.apply(this, arguments);
                syncFromDocument();
                return result;
            };
        });
        editor.attachEvent("change", function () { syncFromDocument(); });
        setTimeout(syncFromDocument, 0);

        // 2026-10-03 Paragraph structure. The core makes a paragraph split (Enter) and a join
        // (Backspace at the start of a block, Delete at its end) before beforeinput reaches this
        // plugin, so both went in for real in suggesting mode. The core asks here first: a split is
        // made by the core (info.split) and marked here; a join is only marked.
        // tools/review/tracked-structure.mjs
        editor.__trackHook = function (kind, info) {
            if (!enabled || !editor.reviewLedger || !config.currentUser) return null;
            if (kind === "enter") return trackSplit(info);
            if (kind === "join") return trackJoin(info);
            if (kind === "paste") return trackPaste(info);
            if (kind === "delete") return trackDeleteHook(info);
            if (kind === "command") return trackCommand(info);
            if (kind === "replace") return trackReplace(info);
            if (kind === "insert") return trackInsert(info);
            if (kind === "insert-element") return trackElementInsert(info);
            // 2026-10-14 An edit made while this plugin is recording a command (trackFormat, trackBlockFormat and
            // trackInsertCommand run the command inside the suggestion) is already tracked, so the refusals below,
            // which are for edits that would go in untracked, step aside. Without this, change case run as a
            // command was refused instead of suggested. tools/review/tracked-plugin-formatting.mjs
            if ((kind === "refuse" || kind === "remove" || kind === "insert-block" || kind === "duplicate" || kind === "move") &&
                (formatRunning || blockRunning || commandRunning)) return null;
            // 2026-10-14 A move (the core's Alt+Arrow, the grip's drop, Move up / Move down) is not tracked yet, so
            // suggesting mode refuses it and says so. tools/tables/table-row-move.mjs
            // 2026-10-14 A copy of a block or row (Ctrl+Shift+D, the block menu's Duplicate) is not tracked yet, so
            // suggesting mode refuses it and says so. tools/blocks/duplicate-block-suggesting.mjs
            if (kind === "duplicate") {
                if (typeof editor.announce === "function") editor.announce("Suggesting is on, so this copy was not made. Turn suggesting off to copy the block.");
                return true;
            }
            // 2026-10-14 An empty paragraph added by the API (insertParagraphAt / After / Before) is not tracked yet, so
            // suggesting mode refuses it and says so. tools/review/suggesting-structure-audit.mjs
            if (kind === "insert-block") {
                if (typeof editor.announce === "function") editor.announce("Suggesting is on, so no paragraph was added. Turn suggesting off to add one.");
                return true;
            }
            // 2026-10-14 Removing a table of contents or a text language is not tracked yet, so suggesting mode refuses it.
            // tools/review/suggesting-structure-audit.mjs
            if (kind === "remove") {
                if (typeof editor.announce === "function") editor.announce("Suggesting is on, so nothing was removed. Turn suggesting off to remove it.");
                return true;
            }
            // 2026-10-14 A command that cannot be tracked yet (a case or direction change) says why it was refused.
            if (kind === "refuse") {
                if (typeof editor.announce === "function" && info && info.message) editor.announce(info.message);
                return true;
            }
            if (kind === "move") {
                if (typeof editor.announce === "function") editor.announce("Suggesting is on, so this move was not made. Turn suggesting off to move it.");
                return true;
            }
            return null;
        };

        // Inline formatting in suggesting mode is a suggestion (trackFormat): the core asks the hook
        // ("command") before any command handler - its own or a plugin's - runs.
    };

    function appendToolbarCommand(toolbar, item) {
        if (!config[toolbar]) return;
        if (config[toolbar].indexOf(item) !== -1) return;
        config[toolbar] = config[toolbar] + item;
    }

    function enable(user) {
        if (user) config.currentUser = user;
        if (!config.currentUser) {
            config.currentUser = { id: "user", name: "User", color: "#2563eb" };
            console.warn("trackedchanges: no config.currentUser configured; defaulting to generic user.");
        }
        enabled = true;
        syncToolbarButtons();
    }

    function disable() {
        enabled = false;
        syncToolbarButtons();
    }

    function syncToolbarButtons() {
        var doc = editor.iframe && editor.iframe.ownerDocument || document;
        var btns = doc.querySelectorAll(".rte_command_trackchanges");
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].__tcSync) btns[i].__tcSync();
        }
    }

    // --- beforeinput intercept ---

    function onBeforeInput(e) {
        if (!enabled) return;
        if (!editor.reviewLedger) return; // No ledger => AI toolkit not loaded; do nothing.

        var type = e.inputType;
        if (!type) return;
        // a command this plugin is carrying out itself (trackInsertCommand) is left to the browser;
        // and an insertText with no text is not typing - WebKit fires one for a native command such as
        // insertHorizontalRule, and cancelling it made the command do nothing
        if (commandRunning) return;
        if ((type === "insertText" || type === "insertReplacementText") && !e.data && !(e.dataTransfer && e.dataTransfer.getData && e.dataTransfer.getData("text/plain"))) return;

        if (type === "insertText" || type === "insertReplacementText") {
            e.preventDefault();
            handleInsertText(e.data || "");
            return;
        }
        if (type === "deleteContentBackward" || type === "deleteContentForward" || type === "deleteByCut") {
            e.preventDefault();
            handleDelete(type);
            return;
        }
        // Shift+Enter is a line break; a WebKit build that reports it as insertParagraph too
        if (type === "insertLineBreak" || (type === "insertParagraph" && shiftEnter)) {
            e.preventDefault();
            handleLineBreak();
            return;
        }
        // insertParagraph (the core's Enter, tracked through editor.__trackHook), insertCompositionText
        // (wrapped when the composition ends, onCompositionEnd), insertFromPaste (the core's paste,
        // tracked through the hook), historyUndo/Redo: pass through.
    }

    // --- insert tracking ---

    function handleInsertText(text) {
        if (!text) return;
        var sel = editor.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        var range = sel.getRangeAt(0);
        if (!range.collapsed) {
            // Selection replace: the selection is a suggested deletion (across blocks too), then the
            // new text goes in after it.
            trackSelectionDelete(range, true);
            range = sel.getRangeAt(0);
            if (!range.collapsed) { range.collapse(false); placeRange(range); }
            createInsertSpan(text, range);
            return;
        }

        var mergeTarget = adjacentInsertSpan(range);
        if (mergeTarget) {
            appendToInsertSpan(mergeTarget, text);
        } else {
            createInsertSpan(text, range);
        }
    }

    function adjacentInsertSpan(range) {
        // If caret sits inside an insert span by the current user, or immediately after one, merge.
        var node = range.startContainer;
        if (node.nodeType === 3 && node.parentNode && isMyInsert(node.parentNode)) {
            return node.parentNode;
        }
        // Caret just after an insert span (at an element boundary).
        if (node.nodeType === 1 && range.startOffset > 0) {
            var prev = node.childNodes[range.startOffset - 1];
            if (prev && prev.nodeType === 1 && isMyInsert(prev)) return prev;
        }
        // Caret at the very beginning just before our span.
        if (node.nodeType === 3 && node.previousSibling && isMyInsert(node.previousSibling) && range.startOffset === 0) {
            return node.previousSibling;
        }
        return null;
    }

    function isMyInsert(el) {
        if (!el || el.nodeType !== 1) return false;
        if (!el.classList || !el.classList.contains("rte-tc-insert")) return false;
        return el.getAttribute("data-tc-author") === config.currentUser.id;
    }

    // We preventDefault() the browser's own text insertion, which means we also
    // lose the whitespace handling it does for free. A plain second space is
    // collapsed by HTML rendering, so pressing space a second time moved nothing
    // on screen and suggesting mode looked like it had stopped accepting input.
    // Reproduce what contenteditable does: any space followed by another space,
    // and any trailing space, becomes a non-breaking space. Recomputed from
    // scratch each time so an NBSP reverts to a normal space once real text
    // follows it (keeping word wrap and copied text clean). Only typed text
    // reaches this path -- paste arrives as insertFromPaste and is passed
    // through -- so this never rewrites an NBSP the user inserted deliberately.
    function normalizeInsertWhitespace(node) {
        if (!node || node.nodeType !== 3) return;
        var v = node.nodeValue;
        if (v.indexOf(" ") === -1 && v.indexOf("\u00a0") === -1) return;
        v = v.replace(/\u00a0/g, " ");
        v = v.replace(/ (?= )/g, "\u00a0");
        v = v.replace(/ $/, "\u00a0");
        if (v !== node.nodeValue) node.nodeValue = v;
    }

    function appendToInsertSpan(span, text) {
        var editdoc = editor.getDocument();
        // Append to the span's last text node (or create one).
        var last = span.lastChild;
        var node;
        if (last && last.nodeType === 3) {
            last.nodeValue = last.nodeValue + text;
            node = last;
        } else {
            node = editdoc.createTextNode(text);
            span.appendChild(node);
        }
        normalizeInsertWhitespace(node);
        placeCaretAtEnd(node);
        updateEntryForSpan(span);
    }

    // --- find & replace ---

    // 2026-10-03 A Find & Replace replacement in suggesting mode: the match is a suggested deletion and
    // the new text a suggested insertion right after it. A match inside text that is already a
    // suggested deletion is left alone. tools/review/tracked-find-replace.mjs
    function trackReplace(info) {
        var range = info && info.range;
        if (!range || typeof info.text !== "string") return null;
        if (isInsideDeleteSpan(range.startContainer) || isInsideDeleteSpan(range.endContainer)) return true;
        var sel = editor.getSelection();
        if (!sel) return null;
        if (!range.collapsed) {
            trackSelectionDelete(range.cloneRange(), true);
        } else {
            placeRange(range.cloneRange());
        }
        if (info.text) {
            var at = sel.rangeCount ? sel.getRangeAt(0) : null;
            if (!at) return true;
            if (!at.collapsed) { at = at.cloneRange(); at.collapse(false); placeRange(at); }
            createInsertSpan(info.text, at);
        }
        return true;
    }

    // --- IME and line breaks ---

    // 2026-10-03 Text typed through an IME (Chinese, Japanese, Korean) and a Shift+Enter line break
    // were let through untracked, so everything a CJK reviewer typed went into the document for
    // real. A composition cannot be cancelled while it runs: it is left to the browser, and when it
    // ends the text it committed - just before the caret - is wrapped as an insertion (or joins
    // the reviewer's insertion it was typed into or next to). A composition over a selection makes
    // the selection a suggested deletion first. tools/review/tracked-ime-linebreak.mjs
    var composing = false, shiftEnter = false;

    function onCompositionStart() {
        composing = false;
        if (!enabled || !editor.reviewLedger) return;
        var sel = editor.getSelection();
        if (!sel || !sel.rangeCount) return;
        var range = sel.getRangeAt(0);
        if (!range.collapsed) {
            trackSelectionDelete(range, true);
            var after = sel.rangeCount ? sel.getRangeAt(0) : null;
            if (after && !after.collapsed) { after.collapse(false); placeRange(after); }
        }
        composing = true;
    }

    function onCompositionEnd(e) {
        if (!composing) return;
        composing = false;
        var text = e && e.data ? e.data : "";
        if (!text || !enabled || !editor.reviewLedger) return;
        // the committed text is normally in place already; an engine that fires compositionend first
        // has it a moment later
        if (!wrapComposed(text)) setTimeout(function () { wrapComposed(text); }, 0);
    }

    function wrapComposed(text) {
        var sel = editor.getSelection();
        if (!sel || !sel.rangeCount) return false;
        var r = sel.getRangeAt(0);
        if (!r.collapsed) return false;
        var node = r.startContainer, off = r.startOffset;
        if (node.nodeType !== 3) {
            var prev = node.childNodes[off - 1];
            if (!prev || prev.nodeType !== 3) return false;
            node = prev;
            off = prev.data.length;
        }
        if (off < text.length || node.data.slice(off - text.length, off) !== text) return false;
        if (isInsideDeleteSpan(node)) {
            var del = node.parentNode;
            while (del && !(del.classList && del.classList.contains("rte-tc-delete"))) del = del.parentNode;
            // only the text at the very end of a deletion is the composition that followed it
            if (!del || off !== node.data.length || lastTextLeaf(del) !== node) return false;
            var moved = off - text.length > 0 ? node.splitText(off - text.length) : node;
            del.parentNode.insertBefore(moved, del.nextSibling);
            node = moved;
            off = moved.data.length;
        }
        if (isMyInsert(node.parentNode)) { updateEntryForSpan(node.parentNode); return true; }
        if (off < node.data.length) node.splitText(off);
        var piece = off - text.length > 0 ? node.splitText(off - text.length) : node;
        var before = piece.previousSibling;
        while (before && before.nodeType === 3 && !before.data.length) before = before.previousSibling;
        var span;
        if (before && isMyInsert(before)) {
            span = before;
            span.appendChild(piece);
            updateEntryForSpan(span);
        } else {
            span = newInsertSpan();
            piece.parentNode.insertBefore(span, piece);
            span.appendChild(piece);
            addInsertEntry(span, text);
        }
        placeCaretAtEnd(piece);
        return true;
    }

    // Shift+Enter: a <br> in an insertion. At the very end of a block a lone <br> shows no new line;
    // the browser adds a second, and so does this (inside the insertion, so a reject takes both).
    function handleLineBreak() {
        var sel = editor.getSelection();
        if (!sel || !sel.rangeCount) return;
        var range = sel.getRangeAt(0);
        if (!range.collapsed) {
            trackSelectionDelete(range, true);
            range = sel.getRangeAt(0);
            if (!range.collapsed) { range.collapse(false); placeRange(range); }
        }
        var doc = editor.getDocument();
        var block = containerOf(range.startContainer);
        var tail = doc.createRange();
        tail.setStart(range.startContainer, range.startOffset);
        tail.setEnd(block, block.childNodes.length);
        var atEnd = !tail.toString() && !tail.cloneContents().querySelector("img,br,iframe,video,audio,svg,input,table,hr,[contenteditable='false']");
        var span = adjacentInsertSpan(range), fresh = !span;
        var br = doc.createElement("br");
        if (fresh) {
            span = newInsertSpan();
            range.insertNode(span);
            span.appendChild(br);
        } else {
            // inside or right after your own insertion: at the caret
            range.insertNode(br);
        }
        if (atEnd) br.parentNode.insertBefore(doc.createElement("br"), br.nextSibling);
        if (fresh) addInsertEntry(span, "\n");
        else updateEntryForSpan(span);
        var cr = doc.createRange();
        cr.setStartAfter(br);
        cr.collapse(true);
        placeRange(cr);
    }

    function newInsertSpan() {
        var span = editor.getDocument().createElement("span");
        var user = config.currentUser;
        span.className = config.trackChangesInsertClass;
        span.setAttribute("data-tc-id", newId());
        span.setAttribute("data-tc-author", user.id);
        span.setAttribute("data-tc-at", new Date().toISOString());
        span.style.color = user.color;
        span.style.textDecoration = "underline";
        return span;
    }

    function addInsertEntry(span, text) {
        editor.reviewLedger.add({
            id: span.getAttribute("data-tc-id"),
            changeType: "insert",
            author: config.currentUser,
            text: text,
            status: "pending",
            sourceLabel: "Suggested insert",
            createdAt: Date.now()
        });
    }

    function createInsertSpan(text, range) {
        var editdoc = editor.getDocument();
        var span = editdoc.createElement("span");
        span.className = config.trackChangesInsertClass;
        var user = config.currentUser;
        var id = "tc-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
        span.setAttribute("data-tc-id", id);
        span.setAttribute("data-tc-author", user.id);
        span.setAttribute("data-tc-at", new Date().toISOString());
        span.style.color = user.color;
        span.style.textDecoration = "underline";
        span.appendChild(editdoc.createTextNode(text));
        range.insertNode(span);
        normalizeInsertWhitespace(span.firstChild);
        placeCaretAtEnd(span.firstChild);

        editor.reviewLedger.add({
            id: id,
            changeType: "insert",
            author: user,
            text: text,
            status: "pending",
            sourceLabel: "Suggested insert",
            createdAt: Date.now()
        });
    }

    function updateEntryForSpan(span) {
        var id = span.getAttribute("data-tc-id");
        if (!id) return;
        editor.reviewLedger.update(id, { text: span.textContent });
    }

    // --- delete tracking ---

    function handleDelete(mode) {
        var sel = editor.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        var range = sel.getRangeAt(0);
        if (mode === "deleteByCut") {
            var cells = editor.getDocument().querySelectorAll("[__rte_selected_cell]");
            if (cells.length > 1) {
                var cellRanges = [];
                for (var ci = 0; ci < cells.length; ci++) {
                    var cr = editor.getDocument().createRange();
                    cr.selectNodeContents(cells[ci]);
                    cellRanges.push(cr);
                }
                markLeavesDeleted(cellRanges, null);
                return;
            }
            if (range.collapsed) return;
        }

        if (!range.collapsed) {
            trackSelectionDelete(range, false);
            return;
        }

        // Collapsed: extend by one char in the appropriate direction, then wrap.
        // The extended range covers only that one character — any delete spans between
        // it and the caret should be SKIPPED, not re-wrapped.
        var extended = editor.getDocument().createRange();
        if (mode === "deleteContentBackward") {
            var anchor = prevCharPoint(range.startContainer, range.startOffset);
            if (!anchor) return;
            extended.setStart(anchor.node, anchor.offset);
            extended.setEnd(anchor.node, anchor.offset + 1);
        } else {
            var forward = nextCharPoint(range.startContainer, range.startOffset);
            if (!forward) return;
            extended.setStart(forward.node, forward.offset - 1);
            extended.setEnd(forward.node, forward.offset);
        }

        // If that extended range sits entirely inside one of the current user's own
        // insert spans, treat this as undoing their own typing — actually delete.
        if (rangeInsideMyInsert(extended)) {
            extended.deleteContents();
            var sel2 = editor.getSelection();
            sel2.removeAllRanges();
            sel2.addRange(extended);
            // If the insert span is now empty, remove it and its ledger entry.
            cleanupEmptyInsertSpans();
            return;
        }

        wrapRangeAsDelete(extended);
    }

    function isInsideDeleteSpan(node) {
        var walk = node.nodeType === 1 ? node : node.parentNode;
        while (walk && walk !== editor.getEditable()) {
            if (walk.classList && walk.classList.contains("rte-tc-delete")) return true;
            walk = walk.parentNode;
        }
        return false;
    }

    // Walk text leaves in the editable, skipping any that live inside an existing delete
    // span (those characters have already been visually "deleted" — we shouldn't re-wrap them).
    function liveTextLeaves() {
        var editable = editor.getEditable();
        var walker = editor.getDocument().createTreeWalker(editable, NodeFilter.SHOW_TEXT, {
            acceptNode: function (n) { return isInsideDeleteSpan(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
        });
        var out = [], n;
        while ((n = walker.nextNode())) out.push(n);
        return out;
    }

    function prevCharPoint(node, offset) {
        var leaves = liveTextLeaves();
        if (!leaves.length) return null;
        var idx = caretIndex(node, offset, leaves);
        if (idx <= 0) return null;
        return leafOffsetAt(idx - 1, leaves);
    }

    function nextCharPoint(node, offset) {
        var leaves = liveTextLeaves();
        if (!leaves.length) return null;
        var total = 0;
        for (var i = 0; i < leaves.length; i++) total += leaves[i].nodeValue.length;
        var idx = caretIndex(node, offset, leaves);
        if (idx >= total) return null;
        return leafOffsetAt(idx + 1, leaves);
    }

    // How many live characters appear before the given caret position?
    function caretIndex(node, offset, leaves) {
        var r = editor.getDocument().createRange();
        r.setStart(node, offset);
        r.collapse(true);
        var count = 0;
        for (var i = 0; i < leaves.length; i++) {
            var leaf = leaves[i];
            // If the entire leaf is before the caret, add its length.
            var cmpEnd = r.comparePoint(leaf, leaf.nodeValue.length);
            if (cmpEnd <= 0) { count += leaf.nodeValue.length; continue; }
            var cmpStart = r.comparePoint(leaf, 0);
            if (cmpStart >= 0) break; // leaf starts at or after caret
            // Caret falls inside this leaf — binary search the split point.
            var lo = 0, hi = leaf.nodeValue.length;
            while (lo < hi) {
                var mid = (lo + hi) >> 1;
                if (r.comparePoint(leaf, mid) < 0) lo = mid + 1;
                else hi = mid;
            }
            count += lo;
            break;
        }
        return count;
    }

    function leafOffsetAt(index, leaves) {
        var remaining = index;
        for (var i = 0; i < leaves.length; i++) {
            if (remaining <= leaves[i].nodeValue.length) return { node: leaves[i], offset: remaining };
            remaining -= leaves[i].nodeValue.length;
        }
        return null;
    }

    function firstTextLeaf(node) {
        if (!node) return null;
        if (node.nodeType === 3) return node;
        var walker = editor.getDocument().createTreeWalker(node, NodeFilter.SHOW_TEXT);
        return walker.nextNode();
    }

    function lastTextLeaf(node) {
        if (!node) return null;
        if (node.nodeType === 3) return node;
        var walker = editor.getDocument().createTreeWalker(node, NodeFilter.SHOW_TEXT);
        var last = null, n;
        while ((n = walker.nextNode())) last = n;
        return last;
    }

    function previousTextLeaf(node) {
        var editable = editor.getEditable();
        var walker = editor.getDocument().createTreeWalker(editable, NodeFilter.SHOW_TEXT);
        var prev = null, cur;
        while ((cur = walker.nextNode())) {
            if (cur === node) return prev;
            prev = cur;
        }
        return null;
    }

    function nextTextLeaf(node) {
        var editable = editor.getEditable();
        var walker = editor.getDocument().createTreeWalker(editable, NodeFilter.SHOW_TEXT);
        var seen = false, cur;
        while ((cur = walker.nextNode())) {
            if (seen) return cur;
            if (cur === node) seen = true;
        }
        return null;
    }

    function rangeInsideMyInsert(range) {
        var span = range.startContainer.parentNode;
        while (span && span !== editor.getEditable()) {
            if (isMyInsert(span)) return range.endContainer.parentNode === span || span.contains(range.endContainer);
            span = span.parentNode;
        }
        return false;
    }

    function wrapRangeAsDelete(range) {
        if (range.collapsed) return false;
        var editdoc = editor.getDocument();

        var fragment = range.cloneContents();
        if (!fragmentHasText(fragment)) return false;

        // Find existing same-author delete spans adjacent to the range so we can merge
        // sequential backspaces / forward deletes into one contiguous span.
        var user = config.currentUser;
        var mergeBefore = adjacentDeleteSpan(range, "before", user);
        var mergeAfter = adjacentDeleteSpan(range, "after", user);

        range.deleteContents();

        if (mergeBefore) {
            // Append the fragment's content to the existing "before" span.
            appendFragmentToSpan(mergeBefore, fragment);
            if (mergeAfter && mergeAfter !== mergeBefore) {
                // Collapse both sides: move "after" span's children into "before" and drop it.
                while (mergeAfter.firstChild) mergeBefore.appendChild(mergeAfter.firstChild);
                var afterId = mergeAfter.getAttribute("data-tc-id");
                mergeAfter.remove();
                if (afterId && editor.reviewLedger) editor.reviewLedger.remove(afterId);
            }
            var rangeAfter = editdoc.createRange();
            rangeAfter.setStartAfter(mergeBefore);
            rangeAfter.collapse(true);
            var sel = editor.getSelection();
            sel.removeAllRanges();
            sel.addRange(rangeAfter);
            // 2026-05-28 Defense: if a customer pasted a delete-class span from
            // outside this plugin, it may lack data-tc-id. Skip the ledger
            // update instead of writing under a `null` key (would silently
            // corrupt the ledger via the update("null", ...) coercion).
            var beforeId = mergeBefore.getAttribute("data-tc-id");
            if (beforeId && editor.reviewLedger) {
                editor.reviewLedger.update(beforeId, { text: mergeBefore.textContent });
            }
            return true;
        }

        if (mergeAfter) {
            prependFragmentToSpan(mergeAfter, fragment);
            var rangeBefore = editdoc.createRange();
            rangeBefore.setStartBefore(mergeAfter);
            rangeBefore.collapse(true);
            var sel2 = editor.getSelection();
            sel2.removeAllRanges();
            sel2.addRange(rangeBefore);
            // Same defense as above (mergeAfter may lack data-tc-id).
            var afterMergeId = mergeAfter.getAttribute("data-tc-id");
            if (afterMergeId && editor.reviewLedger) {
                editor.reviewLedger.update(afterMergeId, { text: mergeAfter.textContent });
            }
            return true;
        }

        var span = editdoc.createElement("span");
        span.className = config.trackChangesDeleteClass;
        var id = "tc-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
        span.setAttribute("data-tc-id", id);
        span.setAttribute("data-tc-author", user.id);
        span.setAttribute("data-tc-at", new Date().toISOString());
        span.style.color = user.color;
        span.style.textDecoration = "line-through";
        span.appendChild(fragment);
        range.insertNode(span);

        var after = editdoc.createRange();
        after.setStartAfter(span);
        after.collapse(true);
        var sel3 = editor.getSelection();
        sel3.removeAllRanges();
        sel3.addRange(after);

        editor.reviewLedger.add({
            id: id,
            changeType: "delete",
            author: user,
            text: span.textContent,
            originalHtml: span.innerHTML,
            status: "pending",
            sourceLabel: "Suggested delete",
            createdAt: Date.now()
        });
        return true;
    }

    function adjacentDeleteSpan(range, side, user) {
        // Find element immediately before or after the range boundaries at the container level.
        var node = side === "before" ? range.startContainer : range.endContainer;
        var offset = side === "before" ? range.startOffset : range.endOffset;
        if (node.nodeType === 3) {
            // Look at the sibling of the text node if we're at the text node's boundary.
            if (side === "before" && offset === 0) {
                var prev = node.previousSibling;
                if (prev && isDeleteSpanByAuthor(prev, user)) return prev;
            }
            if (side === "after" && offset === node.nodeValue.length) {
                var next = node.nextSibling;
                if (next && isDeleteSpanByAuthor(next, user)) return next;
            }
            return null;
        }
        // Element container: look at children on either side of the offset.
        if (side === "before" && offset > 0) {
            var childBefore = node.childNodes[offset - 1];
            if (childBefore && isDeleteSpanByAuthor(childBefore, user)) return childBefore;
        }
        if (side === "after" && offset < node.childNodes.length) {
            var childAfter = node.childNodes[offset];
            if (childAfter && isDeleteSpanByAuthor(childAfter, user)) return childAfter;
        }
        return null;
    }

    function isDeleteSpanByAuthor(el, user) {
        if (!el || el.nodeType !== 1) return false;
        if (!el.classList || !el.classList.contains("rte-tc-delete")) return false;
        return el.getAttribute("data-tc-author") === user.id;
    }

    function appendFragmentToSpan(span, fragment) {
        while (fragment.firstChild) span.appendChild(fragment.firstChild);
    }

    function prependFragmentToSpan(span, fragment) {
        var first = span.firstChild;
        while (fragment.firstChild) span.insertBefore(fragment.firstChild, first);
    }

    function fragmentHasText(fragment) {
        var t = (fragment.textContent || "").replace(/\s+/g, "");
        return !!t;
    }

    function cleanupEmptyInsertSpans() {
        var spans = editor.getEditable().querySelectorAll("." + "rte-tc-insert");
        for (var i = 0; i < spans.length; i++) {
            var s = spans[i];
            if (!s.textContent || !s.textContent.length) {
                var id = s.getAttribute("data-tc-id");
                if (id && editor.reviewLedger) editor.reviewLedger.remove(id);
                s.remove();
            } else {
                updateEntryForSpan(s);
            }
        }
    }

    function placeCaretAtEnd(node) {
        if (!node) return;
        var editdoc = editor.getDocument();
        var range = editdoc.createRange();
        if (node.nodeType === 3) {
            range.setStart(node, node.nodeValue.length);
        } else {
            range.setStart(node, node.childNodes.length);
        }
        range.collapse(true);
        var sel = editor.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    // --- the document is the record ---

    // 2026-10-03 A suggestion lives in two places: its span in the document and its entry in the
    // review ledger, which list(), accept(), acceptAll(), rejectAll() and the Review drawer read.
    // Only the span is saved with the document; the ledger is kept in memory (or in THIS browser's
    // localStorage, with aiToolkitPersistenceKey). So the review workflow - suggest and save, a
    // reviewer opens it later and decides - never worked: after a reload list() was empty,
    // acceptAll() and rejectAll() returned 0, and the marked-up text stayed in the document for
    // good. Every tracked span in the document is a PENDING suggestion: add the ones the ledger
    // lacks (the span carries id, author and time), and reopen a decided one whose span is back
    // (an older version reopened, a decision undone). tools/review/tracked-changes.mjs
    function syncFromDocument() {
        var ledger = editor.reviewLedger;
        var editable = editor.getEditable && editor.getEditable();
        if (!ledger || !editable || !editable.querySelectorAll) return;
        var spans = editable.querySelectorAll(".rte-tc-insert[data-tc-id], .rte-tc-delete[data-tc-id], [data-tc-break][data-tc-id], [data-tc-block][data-tc-id]");
        var seen = {};
        for (var i = 0; i < spans.length; i++) {
            var span = spans[i];
            var id = span.getAttribute("data-tc-id");
            if (!id) continue;
            seen[id] = true;
            var entry = ledger.get(id);
            if (entry) {
                if (entry.status !== "pending" && (entry.changeType === "insert" || entry.changeType === "delete" || entry.changeType === "format")) {
                    ledger.update(id, { status: "pending", decidedAt: 0, decidedBy: null });
                }
                continue;
            }
            if (span.hasAttribute("data-tc-break")) {
                ledger.add(breakEntry(span, spanAuthor(span)));
                continue;
            }
            if (span.hasAttribute("data-tc-block")) {
                var blockFmt = span.hasAttribute("data-tc-format");
                ledger.add({
                    id: id, changeType: blockFmt ? "format" : span.getAttribute("data-tc-block") === "delete" ? "delete" : "insert", author: spanAuthor(span), text: span.textContent, isBlock: true,
                    status: "pending", sourceLabel: blockFmt ? "Suggested formatting" : span.getAttribute("data-tc-block") === "delete" ? "Suggested delete" : "Suggested insert",
                    createdAt: Date.parse(span.getAttribute("data-tc-at") || "") || Date.now()
                });
                continue;
            }
            var isInsert = span.classList.contains("rte-tc-insert");
            ledger.add({
                id: id,
                changeType: span.hasAttribute("data-tc-format") ? "format" : isInsert ? "insert" : "delete",
                author: spanAuthor(span),
                text: span.textContent,
                originalHtml: isInsert ? "" : span.innerHTML,
                status: "pending",
                sourceLabel: isInsert ? "Suggested insert" : "Suggested delete",
                createdAt: Date.parse(span.getAttribute("data-tc-at") || "") || Date.now()
            });
        }
        // and the other way: a pending suggestion of ours whose mark has left the document (undone,
        // taken back, another document loaded) is no longer a suggestion - it was listed for good
        var entries = ledger.list();
        for (var j = 0; j < entries.length; j++) {
            var en = entries[j];
            if (en.status !== "pending" || (en.changeType !== "insert" && en.changeType !== "delete" && en.changeType !== "format")) continue;
            if (String(en.id).indexOf("tc-") !== 0 || seen[en.id]) continue;
            ledger.remove(en.id);
        }
    }

    // The span stores only the author's id: the current user's own suggestions get their name back,
    // anyone else's show the id.
    function spanAuthor(span) {
        var id = span.getAttribute("data-tc-author") || "user";
        var me = config.currentUser;
        if (me && me.id === id) return me;
        return { id: id, name: id, color: (span.style && span.style.color) || "" };
    }

    // --- paragraph breaks ---

    var PILCROW = String.fromCharCode(182);
    var BREAK_ATTRS = ["data-tc-id", "data-tc-author", "data-tc-at", "data-tc-break", "data-tc-code-first-line"];
    var TEXT_BLOCK = /^(P|DIV|H[1-6]|LI)$/;

    function trackSplit(info) {
        var res = info && typeof info.split === "function" ? info.split() : null;
        if (!res || !res.created) return false;
        markBreak(res.created, "insert");
        return true;
    }

    function trackJoin(info) {
        var a = info && info.first, b = info && info.second;
        if (!a || !b) return null;
        var brk = b.getAttribute("data-tc-break");
        if (typeof info.begin === "function") info.begin();
        if (brk === "insert" && b.getAttribute("data-tc-author") === config.currentUser.id) {
            // taking back your own suggested break: the paragraphs go back together, as on reject
            var id = b.getAttribute("data-tc-id");
            var caret = undoSplit(b);
            if (id && !trackedElements(id).length) editor.reviewLedger.remove(id);
            if (caret) placeRange(caret);
            return true;
        }
        if (!brk) markBreak(b, "delete");
        if (info.codeFirstLine) b.setAttribute("data-tc-code-first-line", "true");
        // a join already suggested, or someone else's suggested break: only the caret moves
        if (info.backward) caretToEnd(a);
        return true;
    }

    function markBreak(block, kind) {
        var user = config.currentUser;
        block.setAttribute("data-tc-id", "tc-" + Date.now() + "-" + Math.floor(Math.random() * 10000));
        block.setAttribute("data-tc-author", user.id);
        block.setAttribute("data-tc-at", new Date().toISOString());
        block.setAttribute("data-tc-break", kind);
        editor.reviewLedger.add(breakEntry(block, user));
    }

    function breakEntry(block, author) {
        var insert = block.getAttribute("data-tc-break") === "insert";
        return {
            id: block.getAttribute("data-tc-id"),
            changeType: insert ? "insert" : "delete",
            author: author,
            text: PILCROW,
            isBlock: true,
            status: "pending",
            sourceLabel: insert ? "Suggested paragraph break" : "Suggested paragraph join",
            createdAt: Date.parse(block.getAttribute("data-tc-at") || "") || Date.now()
        };
    }

    function clearBreak(block) {
        for (var i = 0; i < BREAK_ATTRS.length; i++) block.removeAttribute(BREAK_ATTRS[i]);
    }

    // Reject a suggested break: the new block goes back into the one it was split from, which keeps
    // its own attributes and id; an inline wrapper the split cut in two is one again.
    function undoSplit(block) {
        var a = block.previousElementSibling;
        clearBreak(block);
        if (!a || !TEXT_BLOCK.test(a.nodeName) || typeof editor.__joinTextBlocks !== "function") return null;
        // the layout whitespace between the two blocks (a reloaded document has it) goes with the break
        for (var ws = block.previousSibling; ws && ws !== a && ws.nodeType === 3 && !/\S/.test(ws.data); ws = block.previousSibling) ws.parentNode.removeChild(ws);
        return mergeAtJoin(editor.__joinTextBlocks(a, block, true));
    }

    // Accept a suggested join: exactly what an untracked Backspace does.
    function joinBreak(block, keepFirst) {
        var a = block.previousElementSibling;
        var codeFirstLine = block.getAttribute("data-tc-code-first-line") === "true";
        clearBreak(block);
        if (codeFirstLine && a && TEXT_BLOCK.test(a.nodeName) && block.nodeName === "PRE" && typeof editor.__joinFirstCodeLine === "function") {
            editor.__joinFirstCodeLine(a, block);
            return;
        }
        if (!a || !TEXT_BLOCK.test(a.nodeName) || !TEXT_BLOCK.test(block.nodeName) || typeof editor.__joinTextBlocks !== "function") return;
        editor.__joinTextBlocks(a, block, !!keepFirst);
    }

    function sameShell(x, y) {
        if (x.nodeName !== y.nodeName || /^(BR|IMG|HR|INPUT|IFRAME|VIDEO|AUDIO|SVG|OBJECT|EMBED|TABLE)$/i.test(x.nodeName)) return false;
        if (x.getAttribute("contenteditable") === "false") return false;
        if (x.attributes.length !== y.attributes.length) return false;
        for (var i = 0; i < x.attributes.length; i++) {
            if (y.getAttribute(x.attributes[i].name) !== x.attributes[i].value) return false;
        }
        return true;
    }

    function mergeAtJoin(caret) {
        if (!caret) return caret;
        var c = caret.startContainer, o = caret.startOffset;
        if (c.nodeType !== 1) return caret;
        var left = c.childNodes[o - 1], right = left ? left.nextSibling : null, parent = null, merged = false;
        while (left && right && left.nodeType === 1 && right.nodeType === 1 && sameShell(left, right)) {
            var inner = left.lastChild;
            while (right.firstChild) left.appendChild(right.firstChild);
            right.parentNode.removeChild(right);
            parent = left;
            left = inner;
            right = inner ? inner.nextSibling : null;
            merged = true;
        }
        if (!merged) return caret;
        var r = editor.getDocument().createRange();
        if (left && left.nodeType === 3) r.setStart(left, left.data.length);
        else if (left) r.setStartAfter(left);
        else r.setStart(parent, 0);
        r.collapse(true);
        return r;
    }

    function caretToEnd(block) {
        var doc = editor.getDocument();
        var r = doc.createRange();
        var w = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT), t, last = null;
        while ((t = w.nextNode())) if (t.data.length) last = t;
        var del = last && isInsideDeleteSpan(last) ? last.parentNode : null;
        while (del && !(del.classList && del.classList.contains("rte-tc-delete"))) del = del.parentNode;
        if (del) r.setStartAfter(del);
        else if (last) r.setStart(last, last.data.length);
        else r.setStart(block, 0);
        r.collapse(true);
        placeRange(r);
    }

    function placeRange(r) {
        var sel = editor.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(r);
    }

    // --- paste ---

    // 2026-10-03 A paste in suggesting mode. The core runs its whole pipeline and hands the RESULT
    // here (info.html) with its own insert (info.insert, its __InsertHTML): the inline runs go in as
    // one insertion, a table / list / rule as a wholly inserted block, and every paragraph the paste
    // started is a suggested break - so a reject gives the document back exactly and an accept is the
    // untracked paste. Pasted over a selection, the selection is a suggested deletion first.
    // tools/review/tracked-paste.mjs
    var PASTE_BLOCK = /^(P|DIV|H[1-6]|UL|OL|DL|LI|DT|DD|TABLE|THEAD|TBODY|TFOOT|TR|TD|TH|CAPTION|BLOCKQUOTE|PRE|HR|FIGURE|FIGCAPTION|SECTION|ARTICLE|ASIDE|HEADER|FOOTER|NAV|ADDRESS|DETAILS|SUMMARY|FIELDSET|FORM)$/;
    var PASTE_BLOCK_SELECTOR = "p,div,h1,h2,h3,h4,h5,h6,ul,ol,dl,li,table,blockquote,pre,hr,figure,section,article,aside,header,footer,nav,address,details,fieldset,form";
    var PASTE_ATOMS = "img,br,iframe,video,audio,svg,canvas,object,embed,input,table,hr";
    var ZWSP = String.fromCharCode(8203);

    function newId() {
        return "tc-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
    }

    // 2026-10-03 Inserted ELEMENTS (an image, a table, a picture pasted or dropped as a file) and native
    // insert commands (a horizontal rule, which splits the paragraph) are suggested insertions: an
    // inline element goes in an insertion, a block is a wholly inserted block, and a paragraph the
    // command split off is a suggested break - so reject gives the document back and accept is the
    // untracked insert. tools/review/tracked-insert-elements.mjs
    function caretInMyInsert() {
        var sel = editor.getSelection();
        if (!sel || !sel.rangeCount) return false;
        var r = sel.getRangeAt(0);
        return r.collapsed ? isMyInsertAncestor(r.startContainer.nodeType === 3 ? r.startContainer : (r.startContainer.childNodes[r.startOffset] || r.startContainer)) : rangeAllMine(r);
    }

    function deleteSelectionFirst() {
        var sel = editor.getSelection();
        if (!sel || !sel.rangeCount || sel.isCollapsed) return;
        trackSelectionDelete(sel.getRangeAt(0).cloneRange(), true);
        var r = sel.rangeCount ? sel.getRangeAt(0) : null;
        if (r && !r.collapsed) { r = r.cloneRange(); r.collapse(false); placeRange(r); }
    }

    function markInserted(node, st, fromCommand) {
        if (!node || !node.parentNode) return;
        if (PASTE_BLOCK.test(node.nodeName) || /^(IFRAME|VIDEO|AUDIO|FIGURE)$/.test(node.nodeName) && node.parentNode === editor.getEditable()) {
            if (fromCommand && TEXT_BLOCK.test(node.nodeName)) node.setAttribute("data-tc-break", "insert");
            else node.setAttribute("data-tc-block", "insert");
            st.mark(node);
            return;
        }
        var span = editor.getDocument().createElement("span");
        span.className = config.trackChangesInsertClass;
        st.mark(span);
        node.parentNode.insertBefore(span, node);
        span.appendChild(node);
    }

    function addElementEntry(st, text, what) {
        editor.reviewLedger.add({
            id: st.id, changeType: "insert", author: st.user, text: text, isBlock: true,
            status: "pending", sourceLabel: "Suggested insert" + (what ? " (" + what + ")" : ""), createdAt: Date.now()
        });
    }

    function trackElementInsert(info) {
        // an element a format command makes (a link around text) is part of that formatting suggestion
        if (formatRunning) return null;
        var el = info && info.element;
        if (!el || typeof info.run !== "function") return null;
        if (caretInMyInsert()) return null;
        deleteSelectionFirst();
        info.run();
        if (!el.parentNode || !editor.getEditable().contains(el)) return true;
        var st = deletionStamp();
        markInserted(el, st);
        addElementEntry(st, el.textContent || "", el.nodeName.toLowerCase());
        return true;
    }

    // 2026-10-10 A PAGE BREAK inserted in suggesting mode is a suggested insertion: the command runs, the new
    // break element is marked as a whole block (data-tc-block="insert"; a text-block mark would read as a
    // paragraph split and reject would merge it back) and shows until decided. tools/review/tracked-page-break.mjs
    function trackPageBreak(info) {
        var editable = editor.getEditable();
        var mo = typeof MutationObserver === "function" ? new MutationObserver(function () { }) : null;
        if (mo) mo.observe(editable, { childList: true, subtree: true });
        var recs = [];
        try { info.run(); } finally { if (mo) { recs = mo.takeRecords(); mo.disconnect(); } }
        var added = [];
        for (var i = 0; i < recs.length; i++) {
            for (var j = 0; j < recs[i].addedNodes.length; j++) {
                var n = recs[i].addedNodes[j];
                if (n.nodeType === 1 && editable.contains(n) && added.indexOf(n) < 0) added.push(n);
            }
        }
        var top = added.filter(function (n) { return !added.some(function (o) { return o !== n && o.contains(n); }); });
        if (!top.length) return true;
        var st = deletionStamp();
        for (var k = 0; k < top.length; k++) {
            top[k].setAttribute("data-tc-block", "insert");
            st.mark(top[k]);
        }
        editor.reviewLedger.add({
            id: st.id, changeType: "insert", author: st.user, text: "", isBlock: true,
            status: "pending", sourceLabel: "Suggested insert (page break)", createdAt: Date.now()
        });
        return true;
    }

    function trackInsertCommand(info) {
        var editable = editor.getEditable();
        deleteSelectionFirst();
        var recs = [];
        var mo = typeof MutationObserver === "function" ? new MutationObserver(function () { }) : null;
        if (mo) mo.observe(editable, { childList: true, subtree: true });
        commandRunning = true;
        try { info.run(); } finally { commandRunning = false; if (mo) { recs = mo.takeRecords(); mo.disconnect(); } }
        var added = [];
        for (var i = 0; i < recs.length; i++) {
            for (var j = 0; j < recs[i].addedNodes.length; j++) {
                var n = recs[i].addedNodes[j];
                if (n.nodeType === 1 && editable.contains(n) && added.indexOf(n) < 0) added.push(n);
            }
        }
        var top = added.filter(function (n) { return !added.some(function (o) { return o !== n && o.contains(n); }); });
        if (!top.length) return true;
        var st = deletionStamp();
        for (var k = 0; k < top.length; k++) markInserted(top[k], st, true);
        addElementEntry(st, "", info.name);
        return true;
    }

    // 2026-10-03 BLOCK formatting in suggesting mode - a heading or other paragraph style, a list, a block
    // quote, alignment, indent, line height - changed the blocks for real. Now the command runs, the
    // blocks it changed are marked as a formatting suggestion, and the blocks as they were are kept,
    // hidden, just before them (their ids parked in data-tc-was-id, so no id is in the document twice):
    // accept drops the originals - the untracked result; reject drops the new blocks and shows the
    // originals again, exactly. Reformatting your own suggested block just applies.
    // tools/review/tracked-block-format.mjs
    // 2026-10-10 table structure and appearance changes (a column inserted, a header, cell alignment, columns distributed,
    // a caption) changed the table with no suggestion: now a formatting suggestion of the whole table. tools/review/tracked-table-format.mjs
    var BLOCK_FORMAT = /^(formatblock|insertunorderedlist|insertorderedlist|insertblockquote|justifyleft|justifycenter|justifyright|justifyfull|indent|outdent|lineheight|linkedit|tablecolumninsertleft|tablecolumninsertright|tablecellsplitver|tablecellsplithor|tablecellmerge|tableheader|tablecellvalign|tablecellhalign|tabledistributecolumns|tablecaption|liststart|tablecellbackcolor|tablecellforecolor|tabledistributerows|tablecelltype)$/;
    // containers the comparison goes down into when only their children changed
    var BLOCK_SCOPE = /^(UL|OL|LI|BLOCKQUOTE|DIV|SECTION|ARTICLE|TABLE|TBODY|THEAD|TFOOT|TR|TD|TH)$/;
    var TABLE_PART = /^(TBODY|THEAD|TFOOT|TR|TD|TH|CAPTION|COLGROUP|COL)$/;
    var TC_BLOCK_ATTRS = ["data-tc-id", "data-tc-author", "data-tc-at", "data-tc-block", "data-tc-break", "data-tc-format"];
    var blockRunning = false;

    function trackBlockFormat(info) {
        var sel = editor.getSelection(), editable = editor.getEditable();
        if (!sel || !sel.rangeCount) return null;
        var r = sel.getRangeAt(0);
        if (!editable.contains(r.startContainer) || !editable.contains(r.endContainer)) return null;
        // the blocks the selection is in, and one more on each side (a list joins its neighbour)
        var kids = elementKids(editable);
        if (!kids || !kids.length) return null;
        var a = topChildAt(editable, r.startContainer, r.startOffset), b = topChildAt(editable, r.endContainer, r.endOffset);
        var lo = Math.max(0, (a ? kids.indexOf(a) : 0) - 1);
        var hi = b ? kids.indexOf(b) : kids.length - 1;
        hi = Math.min(kids.length - 1, (hi < 0 ? kids.length - 1 : hi) + 1);
        var copies = kids.slice(lo, hi + 1).map(function (k) { return k.cloneNode(true); });
        var prevAnchor = kids[lo - 1] || null, nextAnchor = kids[hi + 1] || null;
        // the hidden originals of earlier block suggestions step out while the command runs: a new
        // list joined the hidden list beside it, and its items were hidden with it
        var hidden = editable.querySelectorAll('[data-tc-block="delete"][data-tc-format]'), parked = [], i;
        for (i = 0; i < hidden.length; i++) {
            var ph = editor.getDocument().createComment("rte-tc");
            hidden[i].parentNode.replaceChild(ph, hidden[i]);
            parked.push([ph, hidden[i]]);
        }
        blockRunning = commandRunning = true;
        try { info.run(); } finally {
            blockRunning = commandRunning = false;
            for (i = parked.length - 1; i >= 0; i--) if (parked[i][0].parentNode) parked[i][0].parentNode.replaceChild(parked[i][1], parked[i][0]);
        }
        if ((prevAnchor && prevAnchor.parentNode !== editable) || (nextAnchor && nextAnchor.parentNode !== editable)) return true;
        var now = [];
        for (var n = prevAnchor ? prevAnchor.nextSibling : editable.firstChild; n && n !== nextAnchor; n = n.nextSibling) {
            if (n.nodeType === 1) now.push(n);
            else if (n.nodeType === 3 && /\S/.test(n.data)) return true;
        }
        var d = diffBlocks(copies, now, editable, nextAnchor);
        var removed = d.removed, added = d.added;
        if (!removed.length && !added.length) return true;
        // your own suggested blocks: the formatting just applies, and the new blocks stay yours
        if (removed.length && removed.every(isMyBlock)) {
            for (i = 0; i < added.length; i++) if (!added[i].hasAttribute("data-tc-id")) copyBlockMarks(removed[Math.min(i, removed.length - 1)], added[i]);
            return true;
        }
        // blocks that are already part of another suggestion (a suggested break or block) are left
        // as the command made them, as before
        if (removed.some(hasBlockMark) || added.some(hasBlockMark)) return true;
        var st = deletionStamp(), text = [];
        for (i = 0; i < removed.length; i++) {
            var c = removed[i];
            parkIds(c);
            c.setAttribute("data-tc-block", "delete");
            c.setAttribute("data-tc-format", "1");
            st.mark(c);
            d.parent.insertBefore(c, d.before);
        }
        for (i = 0; i < added.length; i++) {
            added[i].setAttribute("data-tc-block", "insert");
            added[i].setAttribute("data-tc-format", "1");
            st.mark(added[i]);
            text.push(added[i].textContent);
        }
        editor.reviewLedger.add({
            id: st.id, changeType: "format", author: st.user, text: text.join("\n"), isBlock: true,
            status: "pending", sourceLabel: "Suggested formatting (" + info.name + ")", createdAt: Date.now()
        });
        return true;
    }

    // the element children of a container, or null when it holds text of its own
    function elementKids(el) {
        var out = [];
        for (var n = el.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 1) out.push(n);
            else if (n.nodeType === 3 && /\S/.test(n.data)) return null;
        }
        return out;
    }

    // the child of the editable a boundary point is in
    function topChildAt(editable, node, offset) {
        if (node === editable) return editable.childNodes[Math.min(offset, editable.childNodes.length - 1)] || null;
        while (node && node.parentNode !== editable) node = node.parentNode;
        return node;
    }

    // what changed, as the blocks it was (copies) and the blocks it is (live), at the deepest level
    // where only one container's children changed
    function diffBlocks(olds, news, parent, tail) {
        var p = 0, s = 0;
        while (p < olds.length && p < news.length && olds[p].outerHTML === news[p].outerHTML) p++;
        while (s < olds.length - p && s < news.length - p && olds[olds.length - 1 - s].outerHTML === news[news.length - 1 - s].outerHTML) s++;
        var removed = olds.slice(p, olds.length - s), added = news.slice(p, news.length - s);
        if (removed.length === 1 && added.length === 1 && BLOCK_SCOPE.test(added[0].nodeName) && sameAttrs(removed[0], added[0])) {
            var ok = elementKids(removed[0]), nk = elementKids(added[0]);
            if (ok && nk && ok.length && nk.length) {
                var inner = diffBlocks(ok, nk, added[0], null);
                // a cell, row or row group is never a unit: its hidden original would be one more cell
                // or row in the live table - the part above it is, up to the table itself
                if (!inner.removed.concat(inner.added).some(function (x) { return TABLE_PART.test(x.nodeName); })) return inner;
            }
        }
        return { removed: removed, added: added, parent: parent, before: added[0] || news[news.length - s] || tail };
    }

    function sameAttrs(x, y) {
        if (x.nodeName !== y.nodeName || x.attributes.length !== y.attributes.length) return false;
        for (var i = 0; i < x.attributes.length; i++) if (y.getAttribute(x.attributes[i].name) !== x.attributes[i].value) return false;
        return true;
    }

    function hasBlockMark(el) {
        return el.hasAttribute("data-tc-block") || el.hasAttribute("data-tc-break");
    }

    function isMyBlock(el) {
        return el.getAttribute("data-tc-block") === "insert" && el.getAttribute("data-tc-author") === config.currentUser.id;
    }

    function copyBlockMarks(from, to) {
        for (var i = 0; i < TC_BLOCK_ATTRS.length; i++) {
            var v = from.getAttribute(TC_BLOCK_ATTRS[i]);
            if (v != null) to.setAttribute(TC_BLOCK_ATTRS[i], v);
        }
    }

    function parkIds(el) {
        var list = [el].concat(Array.prototype.slice.call(el.querySelectorAll("[id]")));
        for (var i = 0; i < list.length; i++) {
            if (!list[i].hasAttribute("id")) continue;
            list[i].setAttribute("data-tc-was-id", list[i].getAttribute("id"));
            list[i].removeAttribute("id");
        }
    }

    function unparkIds(el) {
        var list = [el].concat(Array.prototype.slice.call(el.querySelectorAll("[data-tc-was-id]")));
        for (var i = 0; i < list.length; i++) {
            if (!list[i].hasAttribute("data-tc-was-id")) continue;
            list[i].setAttribute("id", list[i].getAttribute("data-tc-was-id"));
            list[i].removeAttribute("data-tc-was-id");
        }
    }

    // 2026-10-03 The public insert API (editor.insertHTML / insertText) - plugins, dialogs, integrators -
    // marks its content like a paste. Inside the reviewer's own suggested insertion it just goes in:
    // it is part of that insertion already. tools/review/tracked-insert.mjs
    function trackInsert(info) {
        var sel = editor.getSelection();
        if (sel && sel.rangeCount) {
            var r = sel.getRangeAt(0);
            if (r.collapsed ? isMyInsertAncestor(r.startContainer.nodeType === 3 ? r.startContainer : (r.startContainer.childNodes[r.startOffset] || r.startContainer)) : rangeAllMine(r)) return null;
        }
        return trackPaste(info, "Suggested insert");
    }

    function trackPaste(info, label) {
        if (!info || typeof info.insert !== "function" || typeof info.html !== "string" || !info.html) return null;
        var sel = editor.getSelection();
        if (!sel || !sel.rangeCount) return null;
        var doc = editor.getDocument(), editable = editor.getEditable();
        var user = config.currentUser, id = newId(), at = new Date().toISOString();
        var stamp = function (el) {
            el.setAttribute("data-tc-id", id);
            el.setAttribute("data-tc-author", user.id);
            el.setAttribute("data-tc-at", at);
        };
        // marked in an inert document: nothing in the pasted HTML loads or runs while it is wrapped
        var inert = doc.implementation.createHTMLDocument("");
        var box = inert.createElement("div");
        box.innerHTML = __RTE_TT(info.html);
        var text = box.textContent;
        var hasBlock = markPasted(box, inert, stamp);

        if (typeof info.begin === "function") info.begin();
        var range = sel.getRangeAt(0);
        if (!range.collapsed) {
            // the text it replaces is a suggested deletion, not a silent removal
            if (!wrapRangeAsDelete(range)) { range.collapse(false); placeRange(range); }
            range = sel.getRangeAt(0);
        }
        // the block the core splits for a block paste, and what followed it
        var host = null;
        for (var n = range.startContainer; n && n !== editable; n = n.parentNode) {
            if (n.nodeType === 1 && /^(P|H[1-6])$/.test(n.nodeName)) { host = n; break; }
        }
        var hostNext = host ? host.nextElementSibling : null;
        // The core drops a host whose first half is EMPTY (a paste at its start, or into an empty
        // paragraph) - with its id and attributes. A zero-width space at the caret keeps it for the
        // length of the insert; it is always taken out again.
        var guard = null;
        if (hasBlock && host && firstHalfEmpty(host, range)) {
            guard = doc.createTextNode(ZWSP);
            range.insertNode(guard);
            range.setStartAfter(guard);
            range.collapse(true);
            placeRange(range);
        }
        try {
            info.insert(box.innerHTML);
        } finally {
            if (guard && guard.parentNode) guard.parentNode.removeChild(guard);
        }

        if (host && host.parentNode && editable.contains(host)) {
            // every block after the host up to what followed it is one the paste started
            for (var el = host.nextElementSibling; el && el !== hostNext; el = el.nextElementSibling) {
                if (el.hasAttribute("data-tc-block") || el.hasAttribute("data-tc-break")) continue;
                if (TEXT_BLOCK.test(el.nodeName)) el.setAttribute("data-tc-break", "insert");
                else el.setAttribute("data-tc-block", "insert");
                stamp(el);
            }
            if (guard) {
                // the host is left empty; accepting the paste lets it go, as an untracked paste does
                if (!host.firstChild) host.appendChild(doc.createElement("br"));
                if (!host.hasAttribute("data-tc-break")) {
                    host.setAttribute("data-tc-break", "delete");
                    stamp(host);
                }
            }
        }
        // pasted paragraphs that went in INSIDE another block (a cell, an item, a div): wholly inserted
        var landed = editable.querySelectorAll("[data-tc-new]");
        for (var k = 0; k < landed.length; k++) {
            landed[k].removeAttribute("data-tc-new");
            if (!landed[k].hasAttribute("data-tc-break") && !landed[k].hasAttribute("data-tc-block")) {
                landed[k].setAttribute("data-tc-block", "insert");
                stamp(landed[k]);
            }
        }
        editor.reviewLedger.add({
            id: id,
            changeType: "insert",
            author: user,
            text: text,
            isBlock: hasBlock,
            status: "pending",
            sourceLabel: label || "Suggested paste",
            createdAt: Date.now()
        });
        // 2026-10-03 the caret goes after what went in, as after an untracked paste or insert: left
        // selected, the next keystroke (or a second insertHTML) replaced the whole paste, and with your
        // own insertion that took its suggestion too. At the end of the last inserted text - the end
        // of the range after pasted paragraphs is the start of the paragraph that followed.
        // tools/review/tracked-paste.mjs, tracked-insert.mjs
        var ins = editable.querySelectorAll('.rte-tc-insert[data-tc-id="' + cssEscape(id) + '"]');
        var endSel = editor.getSelection(), endR = null;
        if (ins.length) {
            endR = doc.createRange();
            endR.selectNodeContents(ins[ins.length - 1]);
        } else if (endSel && endSel.rangeCount && !endSel.isCollapsed) {
            endR = endSel.getRangeAt(0).cloneRange();
        }
        if (endR) {
            endR.collapse(false);
            placeRange(endR);
        }
        return true;
    }

    // Wrap the pasted fragment: inline runs in insert spans; a plain text block keeps its tag and gets
    // its runs wrapped (and a mark, to find it once it is in); anything else is one inserted block.
    function markPasted(box, inert, stamp) {
        var hasBlock = false, c;
        for (c = box.firstChild; c; c = c.nextSibling) {
            if (c.nodeType === 1 && PASTE_BLOCK.test(c.nodeName)) { hasBlock = true; break; }
        }
        var child = box.firstChild;
        while (child) {
            if (child.nodeType === 1 && PASTE_BLOCK.test(child.nodeName)) {
                var next = child.nextSibling;
                if (/^(P|DIV|H[1-6])$/.test(child.nodeName) && !child.querySelector(PASTE_BLOCK_SELECTOR)) {
                    var inner = [];
                    for (var ic = child.firstChild; ic; ic = ic.nextSibling) inner.push(ic);
                    wrapPastedRun(child, inner, inert, stamp, false);
                    child.setAttribute("data-tc-new", "1");
                } else {
                    child.setAttribute("data-tc-block", "insert");
                    stamp(child);
                }
                child = next;
                continue;
            }
            var run = [];
            while (child && !(child.nodeType === 1 && PASTE_BLOCK.test(child.nodeName))) {
                run.push(child);
                child = child.nextSibling;
            }
            // whitespace between pasted blocks is layout, not content
            wrapPastedRun(box, run, inert, stamp, hasBlock);
        }
        return hasBlock;
    }

    function wrapPastedRun(parent, nodes, inert, stamp, skipBlank) {
        if (!nodes.length) return;
        if (skipBlank) {
            var blank = true;
            for (var i = 0; i < nodes.length && blank; i++) {
                var nd = nodes[i];
                if (nd.nodeType === 3) blank = !nd.data.replace(/[\s\xa0]/g, "");
                else if (nd.nodeType === 1) blank = !(nd.textContent || "").replace(/[\s\xa0]/g, "") && !(nd.matches && nd.matches(PASTE_ATOMS)) && !(nd.querySelector && nd.querySelector(PASTE_ATOMS));
            }
            if (blank) return;
        }
        var span = inert.createElement("span");
        span.className = config.trackChangesInsertClass;
        stamp(span);
        parent.insertBefore(span, nodes[0]);
        for (var j = 0; j < nodes.length; j++) span.appendChild(nodes[j]);
    }

    function firstHalfEmpty(host, range) {
        var r = editor.getDocument().createRange();
        r.setStart(host, 0);
        r.setEnd(range.startContainer, range.startOffset);
        var f = r.cloneContents();
        return !(f.textContent || "").split(ZWSP).join("").replace(/[\s\xa0]/g, "") && !f.querySelector("img,iframe,video,audio,table,hr,input,svg,canvas,object,embed");
    }

    function clearBlock(el) {
        el.removeAttribute("data-tc-id");
        el.removeAttribute("data-tc-author");
        el.removeAttribute("data-tc-at");
        el.removeAttribute("data-tc-block");
        el.removeAttribute("data-tc-format");
    }

    // --- selection deletes ---

    // 2026-10-03 Deleting a SELECTION in suggesting mode - Backspace/Delete, a selected image, typing,
    // Enter or a paste over it, a cut. The core deletes most of these itself and asks first
    // (editor.__trackHook "delete"); cut and the browser's replace arrive as beforeinput. Inside one
    // block: wrapRangeAsDelete as before. Across sibling text blocks: the selected text of the first
    // and last block is wrapped (text node by text node, so formatting is never split), a wholly
    // covered block in between is a deleted block, and the last block is a suggested join - accept is
    // exactly the untracked delete, reject is the document as it was. Any other shape (list items,
    // cells): the text is wrapped and the structure left alone. Nothing is removed.
    // tools/review/tracked-selection-delete.mjs
    var DELETE_ATOMS = "img,iframe,video,audio,svg,canvas,object,embed,input,[contenteditable='false']";
    var CONTAINER_BLOCK = /^(P|DIV|H[1-6]|LI|TD|TH|DT|DD|BLOCKQUOTE|PRE|FIGCAPTION|CAPTION)$/;
    var LAYOUT_PARENT = /^(UL|OL|DL|TABLE|THEAD|TBODY|TFOOT|TR|BODY|BLOCKQUOTE|SECTION|ARTICLE|FIGURE)$/;

    function trackDeleteHook(info) {
        var cells = info && info.ranges && info.ranges.length ? info.ranges : null;
        if (!info || (!cells && (!info.range || info.range.collapsed))) return null;
        if (typeof info.begin === "function") info.begin();
        if (cells) markLeavesDeleted(cells, null);
        else trackSelectionDelete(info.range.cloneRange(), !!info.typing);
        // suggesting mode never deletes for real, even when there is nothing to mark
        return true;
    }

    function containerOf(node) {
        var editable = editor.getEditable();
        for (var n = node; n && n !== editable; n = n.parentNode) if (n.nodeType === 1 && CONTAINER_BLOCK.test(n.nodeName)) return n;
        return editable;
    }

    // the leaf text block (P/DIV/H) a node is in, or null inside a list item, cell, quote...
    function textBlockOf(node) {
        var editable = editor.getEditable();
        for (var n = node; n && n !== editable; n = n.parentNode) {
            if (n.nodeType !== 1) continue;
            if (/^(P|DIV|H[1-6])$/.test(n.nodeName)) return n;
            if (/^(LI|TD|TH|UL|OL|TABLE|BLOCKQUOTE|FIGURE|PRE)$/.test(n.nodeName)) return null;
        }
        return null;
    }

    function blankRange(r) {
        return !(r.toString() || "").replace(/[\s\xa0]/g, "") && !r.cloneContents().querySelector(DELETE_ATOMS);
    }

    function trackSelectionDelete(range, keepFirst) {
        if (!range || range.collapsed) return false;
        var doc = editor.getDocument();
        // a triple-click ends at the very start of the next block: that block is not part of it
        var endBlock = textBlockOf(range.endContainer);
        if (endBlock && endBlock !== textBlockOf(range.startContainer) && endBlock.previousElementSibling) {
            var head = doc.createRange();
            head.setStart(endBlock, 0);
            head.setEnd(range.endContainer, range.endOffset);
            if (head.toString() === "" && !head.cloneContents().querySelector(DELETE_ATOMS)) range.setEnd(endBlock.previousElementSibling, endBlock.previousElementSibling.childNodes.length);
        }
        if (range.collapsed) return false;
        var c1 = containerOf(range.startContainer), c2 = containerOf(range.endContainer);
        if (c1 === c2 && !range.cloneContents().querySelector(PASTE_BLOCK_SELECTOR)) {
            if (wrapRangeAsDelete(range)) return true;
            return markLeavesDeleted([range], null);
        }
        var a = textBlockOf(range.startContainer), b = textBlockOf(range.endContainer);
        if (a && b && a !== b && a.parentNode === b.parentNode && (a.compareDocumentPosition(b) & 4)) return markBlocksDeleted(range, a, b, keepFirst);
        return markLeavesDeleted([range], null);
    }

    function deletionStamp() {
        var user = config.currentUser, id = newId(), at = new Date().toISOString();
        return {
            id: id, user: user,
            mark: function (el) {
                el.setAttribute("data-tc-id", id);
                el.setAttribute("data-tc-author", user.id);
                el.setAttribute("data-tc-at", at);
            }
        };
    }

    function markBlocksDeleted(range, a, b, keepFirst) {
        var doc = editor.getDocument();
        var blocks = [];
        for (var el = a; el; el = el.nextElementSibling) { blocks.push(el); if (el === b) break; }
        if (blocks[blocks.length - 1] !== b) return markLeavesDeleted([range], null);
        var text = range.toString();
        var head = doc.createRange(); head.setStart(a, 0); head.setEnd(range.startContainer, range.startOffset);
        var tail = doc.createRange(); tail.setStart(range.endContainer, range.endOffset); tail.setEnd(b, b.childNodes.length);
        var next = b.nextElementSibling;
        // whole blocks, nothing typed in their place, and somewhere for the caret: they go whole
        var whole = blankRange(head) && blankRange(tail) && !keepFirst && !!next;
        var st = deletionStamp(), parts = [];
        for (var i = 0; i < blocks.length; i++) {
            var blk = blocks[i], first = i === 0, last = i === blocks.length - 1;
            if (whole || (!first && !last)) {
                if (!blk.hasAttribute("data-tc-block") && !blk.hasAttribute("data-tc-break")) {
                    blk.setAttribute("data-tc-block", "delete");
                    st.mark(blk);
                }
                continue;
            }
            var r = doc.createRange();
            if (first) { r.setStart(range.startContainer, range.startOffset); r.setEnd(blk, blk.childNodes.length); }
            else { r.setStart(blk, 0); r.setEnd(range.endContainer, range.endOffset); }
            parts.push(r);
            if (last && !blk.hasAttribute("data-tc-break")) {
                blk.setAttribute("data-tc-break", "delete");
                st.mark(blk);
            }
        }
        markLeavesDeleted(parts, st, true);
        editor.reviewLedger.add({
            id: st.id, changeType: "delete", author: st.user, text: text, isBlock: true,
            status: "pending", sourceLabel: "Suggested delete", createdAt: Date.now()
        });
        if (whole) {
            var cr = doc.createRange();
            cr.setStart(next, 0);
            cr.collapse(true);
            placeRange(cr);
        }
        else caretToEnd(a);
        return true;
    }

    // Wrap every piece of text (and every atom) the ranges cover in a delete span of its own, without
    // splitting any element. With no stamp given this is a deletion of its own, listed here.
    function markLeavesDeleted(ranges, st, noEntry) {
        var doc = editor.getDocument();
        var own = !st;
        if (own) st = deletionStamp();
        var targets = [], text = "";
        for (var k = 0; k < ranges.length; k++) {
            var range = ranges[k];
            if (range.collapsed) continue;
            text += range.toString();
            var root = range.commonAncestorContainer;
            if (root.nodeType !== 1) root = root.parentNode;
            var w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false), n;
            while ((n = w.nextNode())) {
                if (!range.intersectsNode(n) || isInsideDeleteSpan(n)) continue;
                if (n.nodeType === 1) {
                    if (n.matches(DELETE_ATOMS) && !(n.parentNode && n.parentNode.closest && n.parentNode.closest("[contenteditable='false']"))) {
                        var nr = doc.createRange(); nr.selectNode(n);
                        if (range.compareBoundaryPoints(Range.START_TO_START, nr) <= 0 && range.compareBoundaryPoints(Range.END_TO_END, nr) >= 0) targets.push({ atom: n });
                    }
                    continue;
                }
                if (n.parentNode && n.parentNode.closest && n.parentNode.closest("[contenteditable='false']")) continue;
                var s0 = n === range.startContainer ? range.startOffset : 0;
                var e0 = n === range.endContainer ? range.endOffset : n.data.length;
                if (e0 <= s0) continue;
                // whitespace between blocks is layout, not text
                if (!/\S/.test(n.data) && n.parentNode && LAYOUT_PARENT.test(n.parentNode.nodeName)) continue;
                targets.push({ node: n, s: s0, e: e0 });
            }
        }
        var lastSpan = null;
        for (var t = targets.length - 1; t >= 0; t--) {
            var tg = targets[t], piece = tg.atom;
            if (!piece) {
                piece = tg.node;
                if (tg.e < piece.data.length) piece.splitText(tg.e);
                if (tg.s > 0) piece = piece.splitText(tg.s);
            }
            var span = doc.createElement("span");
            span.className = config.trackChangesDeleteClass;
            st.mark(span);
            span.style.color = st.user.color;
            span.style.textDecoration = "line-through";
            piece.parentNode.insertBefore(span, piece);
            span.appendChild(piece);
            if (!lastSpan) lastSpan = span;
        }
        if (own) {
            if (!targets.length) return false;
            editor.reviewLedger.add({
                id: st.id, changeType: "delete", author: st.user, text: text,
                status: "pending", sourceLabel: "Suggested delete", createdAt: Date.now()
            });
            var cr = doc.createRange();
            cr.setStartAfter(lastSpan);
            cr.collapse(true);
            placeRange(cr);
        }
        return targets.length > 0;
    }

    // --- formatting ---

    // 2026-10-03 Inline formatting in suggesting mode - bold, italic, underline, strikethrough,
    // sub/superscript, colours, font, size, remove formatting - went in for real. Now the command
    // runs, and the formatted text is marked as a formatting suggestion while the text as it was
    // (with its formatting) is kept beside it as a hidden deletion: accept drops the original - the
    // untracked result; reject drops the formatted copy and brings the original back, exactly.
    // Formatting your own suggested insertion just applies. tools/review/tracked-formatting.mjs
    // 2026-10-09 highlight and unlink went in untracked in suggesting mode (no suggestion to decide)
    var INLINE_FORMAT = /^(bold|italic|underline|strikethrough|superscript|subscript|forecolor|backcolor|fontname|fontsize|removeformat|inlinecode|changecase|createlink|highlight|unlink)$/;
    // commands that act on the word under a caret: the word is the selection they format
    var WORD_COMMANDS = /^(inlinecode|changecase)$/;
    var WORD_CHAR = /[^\s.,;:!?()"'\[\]{}<>]/;

    // native insert commands the browser carries out (a horizontal rule splits the paragraph)
    var INSERT_COMMANDS = /^(inserthorizontalrule)$/;
    var commandRunning = false;

    // 2026-10-09 Deleting a table ROW, COLUMN or whole TABLE in suggesting mode is a suggested deletion: the
    // row, cells or table stay visible (struck through) until decided; accept removes them, reject clears the
    // mark - the table as it was. The command is not run, so the table keeps its structure meanwhile.
    // Merged cells and a multi-cell selection stay untracked. tools/review/tracked-table-delete.mjs
    var TABLE_DELETE = /^(tablerowdelete|tablecolumndelete|tabledelete)$/;

    function trackTableDelete(info) {
        var sel = editor.getSelection();
        if (!sel || !sel.rangeCount) return null;
        var doc = editor.getDocument(), editable = editor.getEditable();
        if (doc.querySelectorAll("[__rte_selected_cell]").length > 1) return null;
        var node = sel.getRangeAt(0).startContainer;
        var cell = node.nodeType === 1 ? node : node.parentNode;
        while (cell && !/^(TD|TH)$/.test(cell.nodeName)) cell = cell.parentNode;
        if (!cell || !editable.contains(cell)) return null;
        var row = cell.parentNode, table = cell.parentNode && cell.parentNode.parentNode && cell.parentNode.parentNode.parentNode;
        while (table && table.nodeName !== "TABLE") table = table.parentNode;
        if (!table) return null;
        var targets = [], i, r;
        if (info.name === "tabledelete" || (info.name === "tablerowdelete" && table.rows.length <= 1) || (info.name === "tablecolumndelete" && row.cells.length <= 1)) {
            targets = [table];
        } else if (info.name === "tablerowdelete") {
            targets = [row];
        } else {
            var idx = cell.cellIndex;
            for (r = 0; r < table.rows.length; r++) {
                var c = table.rows[r].cells[idx];
                if (!c) continue;
                if (c.colSpan > 1 || c.rowSpan > 1) return null;
                targets.push(c);
            }
        }
        for (i = 0; i < targets.length; i++) {
            var tg = targets[i];
            if (tg.hasAttribute("data-tc-block") || tg.hasAttribute("data-tc-break") || tg.querySelector("[data-tc-block], [data-tc-break]")) return null;
        }
        if (!targets.length) return null;
        var st = deletionStamp(), text = [];
        for (i = 0; i < targets.length; i++) {
            targets[i].setAttribute("data-tc-block", "delete");
            st.mark(targets[i]);
            text.push(targets[i].textContent);
        }
        editor.reviewLedger.add({
            id: st.id, changeType: "delete", author: st.user, text: text.join(" "), isBlock: true,
            status: "pending",
            sourceLabel: "Suggested delete (" + (targets[0].nodeName === "TABLE" ? "table" : targets[0].nodeName === "TR" ? "table row" : "table column") + ")",
            createdAt: Date.now()
        });
        return true;
    }

    // 2026-10-09 Inserting a table ROW above or below in suggesting mode is a suggested insertion: the command
    // runs, the new row is marked (data-tc-block="insert") and shows until decided; accept keeps it, reject
    // removes it - the table as it was. tools/review/tracked-table-insert.mjs
    var TABLE_ROW_INSERT = /^(tablerowinsertabove|tablerowinsertbelow)$/;

    function trackTableRowInsert(info) {
        var editable = editor.getEditable();
        var mo = typeof MutationObserver === "function" ? new MutationObserver(function () { }) : null;
        if (mo) mo.observe(editable, { childList: true, subtree: true });
        var recs = [];
        try { info.run(); } finally { if (mo) { recs = mo.takeRecords(); mo.disconnect(); } }
        var rows = [];
        for (var i = 0; i < recs.length; i++) {
            for (var j = 0; j < recs[i].addedNodes.length; j++) {
                var n = recs[i].addedNodes[j];
                if (n.nodeName === "TR" && editable.contains(n) && rows.indexOf(n) < 0) rows.push(n);
            }
        }
        if (!rows.length) return true;
        var st = deletionStamp();
        for (var k = 0; k < rows.length; k++) {
            rows[k].setAttribute("data-tc-block", "insert");
            st.mark(rows[k]);
        }
        editor.reviewLedger.add({
            id: st.id, changeType: "insert", author: st.user, text: "", isBlock: true,
            status: "pending", sourceLabel: "Suggested insert (table row)", createdAt: Date.now()
        });
        return true;
    }

    function trackCommand(info) {
        if (!formatRunning && !blockRunning && info && TABLE_ROW_INSERT.test(info.name || "") && typeof info.run === "function") return trackTableRowInsert(info);
        if (!formatRunning && !blockRunning && info && TABLE_DELETE.test(info.name || "") && typeof info.run === "function") {
            var tableDelete = trackTableDelete(info);
            if (tableDelete === true) return true;
        }
        if (!formatRunning && !blockRunning && info && BLOCK_FORMAT.test(info.name || "") && typeof info.run === "function") return trackBlockFormat(info);
        if (!formatRunning && info && info.name === "insertpagebreak" && typeof info.run === "function") return trackPageBreak(info);
        if (!formatRunning && info && INSERT_COMMANDS.test(info.name || "") && typeof info.run === "function") return trackInsertCommand(info);
        if (formatRunning || !info || !INLINE_FORMAT.test(info.name || "")) return null;
        var sel = editor.getSelection();
        if (sel && sel.rangeCount && sel.isCollapsed && WORD_COMMANDS.test(info.name)) selectWordAtCaret(sel);
        return trackFormat(info.name, info.value, info.run) ? true : null;
    }

    function selectWordAtCaret(sel) {
        var r = sel.getRangeAt(0), n = r.startContainer;
        if (n.nodeType !== 3) return false;
        var s0 = r.startOffset, e0 = s0;
        while (s0 > 0 && WORD_CHAR.test(n.data.charAt(s0 - 1))) s0--;
        while (e0 < n.data.length && WORD_CHAR.test(n.data.charAt(e0))) e0++;
        if (e0 <= s0) return false;
        var w = editor.getDocument().createRange();
        w.setStart(n, s0);
        w.setEnd(n, e0);
        placeRange(w);
        return true;
    }
    var CONTAINER_SELECTOR = "p,div,h1,h2,h3,h4,h5,h6,li,td,th,dt,dd,blockquote,pre,figcaption,caption";
    var INLINE_WRAPPER = /^(B|STRONG|I|EM|U|S|STRIKE|DEL|INS|SPAN|FONT|SUB|SUP|MARK|CODE|SMALL|BIG|A)$/;
    var formatRunning = false;

    function trackFormat(cmd, value, run) {
        var sel = editor.getSelection();
        if (!sel || !sel.rangeCount) return false;
        var doc = editor.getDocument();
        // a dragged cell selection: the caret sits collapsed in the first cell and the core formats
        // every marked cell's content itself - each cell is a part of the one suggestion
        var cells = doc.querySelectorAll("[__rte_selected_cell]"), ranges = [], i;
        if (cells.length > 1) {
            for (i = 0; i < cells.length; i++) { var cr = doc.createRange(); cr.selectNodeContents(cells[i]); ranges.push(cr); }
        } else {
            if (sel.isCollapsed) return false;
            ranges.push(sel.getRangeAt(0));
            if (rangeAllMine(ranges[0])) return false;
        }
        var parts = [];
        for (var k = 0; k < ranges.length; k++) {
            var blocks = blocksInRange(ranges[k]);
            for (i = 0; i < blocks.length; i++) {
                var r = clipToBlock(ranges[k], blocks[i]);
                if (r.collapsed || blankRange(r)) continue;
                parts.push({ block: blocks[i], frag: cloneWithContext(r, blocks[i]), before: blocks[i].innerHTML });
            }
        }
        if (!parts.length) return false;
        // where the selection is, as text offsets in its blocks: a command that leaves the selection
        // collapsed or elsewhere (inline code does) still tells us what it formatted
        var anchor = null;
        if (cells.length < 2) {
            var r0 = ranges[0], sb = containerOf(r0.startContainer), eb = containerOf(r0.endContainer);
            anchor = { sb: sb, so: textOffsetIn(sb, r0.startContainer, r0.startOffset), eb: eb, eo: textOffsetIn(eb, r0.endContainer, r0.endOffset) };
        }
        formatRunning = true;
        try { if (typeof run === "function") run(); else editor.execCommand(cmd, value); } finally { formatRunning = false; }
        var after = cells.length > 1 ? null : sel.rangeCount ? sel.getRangeAt(0) : null;
        if (cells.length < 2) {
            var usable = !!after && !after.collapsed;
            // usable only if it covers some of what was selected in EVERY block
            for (var pi = 0; usable && pi < parts.length; pi++) if (!after.intersectsNode(parts[pi].block) || blankRange(clipToBlock(after, parts[pi].block))) usable = false;
            if (!usable && anchor && anchor.sb.parentNode && anchor.eb.parentNode) {
                var sp = pointAtTextOffset(anchor.sb, anchor.so), ep = pointAtTextOffset(anchor.eb, anchor.eo);
                after = doc.createRange();
                after.setStart(sp.node, sp.offset);
                after.setEnd(ep.node, ep.offset);
            }
            if (!after || after.collapsed) return true;
        }
        var st = deletionStamp(), text = "", first = null, last = null;
        for (i = 0; i < parts.length; i++) {
            var part = parts[i];
            if (!part.block.parentNode) continue;
            // a block the command left as it was is not part of the suggestion (a plugin command on a
            // cell selection changes only the caret's word, not every selected cell)
            if (part.block.innerHTML === part.before) continue;
            var whole = null;
            if (!after) { whole = doc.createRange(); whole.selectNodeContents(part.block); }
            var pr = whole || clipToBlock(after, part.block);
            if (pr.collapsed) continue;
            text += pr.toString();
            var at = outerStart(pr, part.block);
            var spans = wrapFormatted(pr, st);
            if (!spans.length) continue;
            if (!first) first = spans[0];
            last = spans[spans.length - 1];
            var del = doc.createElement("span");
            del.className = config.trackChangesDeleteClass;
            st.mark(del);
            del.setAttribute("data-tc-format", "1");
            del.appendChild(stripContext(part.frag, at.startContainer, part.block));
            at.insertNode(del);
        }
        if (!first) return true;
        editor.reviewLedger.add({
            id: st.id, changeType: "format", author: st.user, text: text,
            status: "pending", sourceLabel: "Suggested formatting (" + cmd + ")", createdAt: Date.now()
        });
        var nr = doc.createRange();
        nr.setStart(first, 0);
        nr.setEnd(last, last.childNodes.length);
        placeRange(nr);
        return true;
    }

    // every character the range covers is in the reviewer's own suggested insertion
    function rangeAllMine(range) {
        var root = range.commonAncestorContainer;
        if (root.nodeType === 3) return isMyInsertAncestor(root);
        var w = editor.getDocument().createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false), n, any = false;
        while ((n = w.nextNode())) {
            if (!range.intersectsNode(n)) continue;
            var s0 = n === range.startContainer ? range.startOffset : 0;
            var e0 = n === range.endContainer ? range.endOffset : n.data.length;
            if (e0 <= s0) continue;
            if (!isMyInsertAncestor(n)) return false;
            any = true;
        }
        return any;
    }

    function isMyInsertAncestor(node) {
        var editable = editor.getEditable();
        for (var a = node.parentNode; a && a !== editable; a = a.parentNode) if (isMyInsert(a)) return true;
        return false;
    }

    function textOffsetIn(block, node, offset) {
        var r = editor.getDocument().createRange();
        r.setStart(block, 0);
        r.setEnd(node, offset);
        return r.toString().length;
    }

    function pointAtTextOffset(block, n) {
        var w = editor.getDocument().createTreeWalker(block, NodeFilter.SHOW_TEXT, null, false), tn, left = n, last = null;
        while ((tn = w.nextNode())) {
            last = tn;
            if (left <= tn.data.length) return { node: tn, offset: left };
            left -= tn.data.length;
        }
        return last ? { node: last, offset: last.data.length } : { node: block, offset: block.childNodes.length };
    }

    // the leaf container blocks a range runs through, in document order
    function blocksInRange(range) {
        var c1 = containerOf(range.startContainer), c2 = containerOf(range.endContainer);
        if (c1 === c2 && !c1.querySelector(CONTAINER_SELECTOR)) return [c1];
        var root = range.commonAncestorContainer;
        if (root.nodeType !== 1) root = root.parentNode;
        var out = [], list = root.querySelectorAll(CONTAINER_SELECTOR);
        for (var i = 0; i < list.length; i++) {
            if (range.intersectsNode(list[i]) && !list[i].querySelector(CONTAINER_SELECTOR)) out.push(list[i]);
        }
        return out.length ? out : [c1];
    }

    function clipToBlock(range, block) {
        var r = range.cloneRange();
        if (!block.contains(range.startContainer) && block !== range.startContainer) r.setStart(block, 0);
        if (!block.contains(range.endContainer) && block !== range.endContainer) r.setEnd(block, block.childNodes.length);
        return r;
    }

    // the selected content with every inline element around it, up to the block
    function cloneWithContext(r, block) {
        var doc = editor.getDocument();
        var frag = r.cloneContents();
        var n = r.commonAncestorContainer;
        if (n.nodeType !== 1) n = n.parentNode;
        for (; n && n !== block && n.nodeType === 1; n = n.parentNode) {
            var w = n.cloneNode(false);
            w.removeAttribute("id");
            w.appendChild(frag);
            frag = doc.createDocumentFragment();
            frag.appendChild(w);
        }
        return frag;
    }

    // the start of a range moved out of every element it starts at the very beginning of: the spot
    // just before what the command wrapped around the selection
    function outerStart(range, block) {
        var r = range.cloneRange();
        r.collapse(true);
        var c = r.startContainer, o = r.startOffset;
        while (c !== block && o === 0 && c.parentNode) {
            var parent = c.parentNode, idx = 0;
            for (var x = c; x.previousSibling; x = x.previousSibling) idx++;
            c = parent;
            o = idx;
        }
        r.setStart(c, o);
        r.collapse(true);
        return r;
    }

    // drop the outer context the insertion point already has (the original goes back inside it)
    function stripContext(frag, container, block) {
        var outer = [];
        for (var n = container.nodeType === 1 ? container : container.parentNode; n && n !== block; n = n.parentNode) outer.unshift(n);
        var k = 0;
        while (k < outer.length && frag.childNodes.length === 1 && frag.firstChild.nodeType === 1 && sameShell(frag.firstChild, outer[k])) {
            var only = frag.firstChild, inner = editor.getDocument().createDocumentFragment();
            while (only.firstChild) inner.appendChild(only.firstChild);
            frag = inner;
            k++;
        }
        return frag;
    }

    function wrapFormatted(range, st) {
        var doc = editor.getDocument();
        var root = range.commonAncestorContainer;
        if (root.nodeType !== 1) root = root.parentNode;
        var targets = [], w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null, false), n;
        while ((n = w.nextNode())) {
            if (!range.intersectsNode(n) || isInsideDeleteSpan(n)) continue;
            if (n.nodeType === 1) {
                if (n.matches(DELETE_ATOMS)) {
                    var nr = doc.createRange(); nr.selectNode(n);
                    if (range.compareBoundaryPoints(Range.START_TO_START, nr) <= 0 && range.compareBoundaryPoints(Range.END_TO_END, nr) >= 0) targets.push({ atom: n });
                }
                continue;
            }
            if (n.parentNode && n.parentNode.closest && n.parentNode.closest("[contenteditable='false']")) continue;
            var s0 = n === range.startContainer ? range.startOffset : 0;
            var e0 = n === range.endContainer ? range.endOffset : n.data.length;
            if (e0 <= s0) continue;
            if (!/\S/.test(n.data) && n.parentNode && LAYOUT_PARENT.test(n.parentNode.nodeName)) continue;
            targets.push({ node: n, s: s0, e: e0 });
        }
        var spans = [];
        for (var t = targets.length - 1; t >= 0; t--) {
            var tg = targets[t], piece = tg.atom;
            if (!piece) {
                piece = tg.node;
                if (tg.e < piece.data.length) piece.splitText(tg.e);
                if (tg.s > 0) piece = piece.splitText(tg.s);
            }
            var span = doc.createElement("span");
            span.className = config.trackChangesInsertClass;
            st.mark(span);
            span.setAttribute("data-tc-format", "1");
            piece.parentNode.insertBefore(span, piece);
            span.appendChild(piece);
            spans.unshift(span);
        }
        return spans;
    }

    // a rejected formatted piece goes with the wrappers the command made around it, now empty
    function removeFormattedPiece(el, seams) {
        var editable = editor.getEditable(), top = el, parent = el.parentNode;
        while (parent && parent !== editable && INLINE_WRAPPER.test(parent.nodeName) && parent.childNodes.length === 1) { top = parent; parent = parent.parentNode; }
        if (top.previousSibling) seams.push(top.previousSibling);
        if (top.parentNode) top.parentNode.removeChild(top);
    }

    // two neighbours with the same tag and attributes (one wrapper a command split) become one again
    function mergePair(left) {
        while (left && left.nodeType === 1) {
            var right = left.nextSibling;
            if (!right || right.nodeType !== 1 || !sameShell(left, right)) break;
            var inner = left.lastChild;
            while (right.firstChild) left.appendChild(right.firstChild);
            right.parentNode.removeChild(right);
            // the seam inside, then this level again: the next neighbour may be a third piece
            mergePair(inner);
        }
    }

    function trackedElements(id) {
        var list = editor.getEditable().querySelectorAll('[data-tc-id="' + cssEscape(id) + '"]');
        var out = [];
        for (var i = 0; i < list.length; i++) out.push(list[i]);
        return out;
    }

    // --- accept / reject ---

    function decisionUser() {
        return config.currentUser || { id: "user", name: "User", color: "#2563eb" };
    }

    function canDecide(entry, action) {
        if (typeof config.reviewCanDecide !== "function") return true;
        var allowed = false;
        var user = decisionUser();
        try { allowed = config.reviewCanDecide(entry, action, user, editor) !== false; }
        catch (err) {
            console.warn("trackedchanges: reviewCanDecide threw; denying decision.", err);
        }
        if (allowed) return true;
        var detail = { entry: entry, action: action, user: user };
        try { typeof config.onReviewDecisionDenied === "function" && config.onReviewDecisionDenied(detail); } catch (ignore) { }
        try { typeof editor.fireEvent === "function" && editor.fireEvent("review_decision_denied", detail); } catch (ignore2) { }
        return false;
    }

    // 2026-10-17 Accepting or rejecting one suggestion on screen. Nothing in the editor could - only accept(id) from
    // code; the AI review drawer shows AI suggestions only - while CKEditor, TinyMCE's suggested edits and Google Docs
    // put Accept / Reject on each one. With the caret in a pending suggestion a card shows what it is and who made it,
    // with Accept, Reject, Previous and Next. tools/review/suggestion-card.mjs
    var sugCard = null, sugCardId = null, sugCardTimer = 0;
    function suggestionAtCaret() {
        var doc = editor.getDocument(), ed = editor.getEditable();
        var sel = doc && doc.getSelection();
        if (!sel || !sel.rangeCount || !ed) return null;
        for (var n = sel.getRangeAt(0).startContainer; n && n !== ed; n = n.parentNode)
            if (n.nodeType === 1 && n.getAttribute("data-tc-id")) return n;
        return null;
    }
    function pendingEntry(id) {
        if (!id || !editor.reviewLedger) return null;
        var entry = editor.reviewLedger.get(id);
        if (!entry) { syncFromDocument(); entry = editor.reviewLedger.get(id); }
        return entry && entry.status === "pending" ? entry : null;
    }
    function scheduleCard() {
        clearTimeout(sugCardTimer);
        sugCardTimer = setTimeout(updateSuggestionCard, 60);
    }
    function hideSuggestionCard() {
        if (sugCard && sugCard.parentNode) sugCard.parentNode.removeChild(sugCard);
        sugCard = null;
        sugCardId = null;
    }
    // 2026-10-17 the card is appended to the page body, outside the editor's element, so the editor's rte-dark class
    // cannot reach it: mirror it (as the comment sidebar does), and rte-auto-dark under a dark system setting.
    // tools/review/suggestion-card-dark.mjs
    function editorIsDark() {
        try {
            var hostEl = editor.container || (editor.iframe && editor.iframe.closest && editor.iframe.closest(".richtexteditor"));
            if (!hostEl || !hostEl.classList) return false;
            if (hostEl.classList.contains("rte-dark")) return true;
            var w = hostEl.ownerDocument.defaultView || window;
            return hostEl.classList.contains("rte-auto-dark") && !hostEl.classList.contains("rte-light") && !!(w.matchMedia && w.matchMedia("(prefers-color-scheme: dark)").matches);
        } catch (x) { return false; }
    }
    // 2026-10-18 the card's words come from config.text_ keys (language packs), English as the fallback.
    // tools/i18n/suggestion-card-language.mjs
    function tcText(key, fallback) { return (config && config["text_" + key]) || fallback; }
    function suggestionLabel(el, entry) {
        var brk = el.getAttribute("data-tc-break");
        if (brk) return brk === "insert" ? tcText("tc_break", "Suggested paragraph break") : tcText("tc_join", "Suggested paragraph join");
        if (entry.changeType === "insert") return tcText("tc_insert", "Suggested insertion");
        if (entry.changeType === "delete") return tcText("tc_delete", "Suggested deletion");
        return tcText("tc_format", "Suggested formatting");
    }
    function updateSuggestionCard() {
        var el = suggestionAtCaret();
        var id = el && el.getAttribute("data-tc-id");
        var entry = pendingEntry(id);
        if (!entry) { hideSuggestionCard(); return; }
        if (!sugCard || sugCardId !== id || !sugCard.isConnected) {
            hideSuggestionCard();
            var host = (editor.iframe && editor.iframe.ownerDocument) || document;
            sugCard = host.createElement("div");
            sugCard.className = "rte-suggestion-card" + (editorIsDark() ? " rte-suggestion-card-dark" : "");
            sugCard.setAttribute("role", "group");
            sugCard.setAttribute("aria-label", tcText("tc_suggestion", "Suggestion"));
            var head = host.createElement("div");
            head.className = "rte-suggestion-card-title";
            var who = entry.author && (entry.author.name || entry.author.id);
            head.textContent = suggestionLabel(el, entry) + (who ? " " + tcText("tc_by", "by") + " " + who : "");
            sugCard.appendChild(head);
            var excerpt = String(entry.text || "").replace(/\s+/g, " ").trim();
            if (excerpt && excerpt.length > 1) {
                var ex = host.createElement("div");
                ex.className = "rte-suggestion-card-text";
                ex.textContent = excerpt.length > 60 ? excerpt.slice(0, 57) + "..." : excerpt;
                sugCard.appendChild(ex);
            }
            var row = host.createElement("div");
            row.className = "rte-suggestion-card-actions";
            var mk = function (label, cls, enabled, run) {
                var b = host.createElement("button");
                b.type = "button";
                b.className = "rte-suggestion-card-button " + cls;
                b.textContent = label;
                if (!enabled) b.disabled = true;
                b.addEventListener("mousedown", function (e) { e.preventDefault(); });
                b.addEventListener("click", function (e) { e.preventDefault(); run(); });
                row.appendChild(b);
            };
            var cid = id;
            mk(tcText("tc_accept", "Accept"), "rte-suggestion-card-accept", canDecide(entry, "accept"), function () { hideSuggestionCard(); acceptEntry(cid); try { editor.focus(); } catch (x) { /* best effort */ } });
            mk(tcText("tc_reject", "Reject"), "rte-suggestion-card-reject", canDecide(entry, "reject"), function () { hideSuggestionCard(); rejectEntry(cid); try { editor.focus(); } catch (x) { /* best effort */ } });
            mk(tcText("findprevious", "Previous"), "rte-suggestion-card-prev", true, function () { stepSuggestion(-1); });
            mk(tcText("findnext", "Next"), "rte-suggestion-card-next", true, function () { stepSuggestion(1); });
            sugCard.appendChild(row);
            // 2026-10-17 Accept all / Reject all when more than one suggestion is pending (Google Docs, CKEditor):
            // acceptAll() / rejectAll() had no button. tools/review/suggestion-card-all.mjs
            var pendingCount = 0;
            try { pendingCount = editor.trackedChanges.list().length; } catch (x) { pendingCount = 0; }
            if (pendingCount > 1) {
                var allRow = host.createElement("div");
                allRow.className = "rte-suggestion-card-actions rte-suggestion-card-all";
                var keepRow = row;
                row = allRow;
                mk(tcText("tc_acceptall", "Accept all") + " (" + pendingCount + ")", "rte-suggestion-card-accept", true, function () { hideSuggestionCard(); acceptAll(); try { editor.focus(); } catch (x) { /* best effort */ } });
                mk(tcText("tc_rejectall", "Reject all"), "rte-suggestion-card-reject", true, function () { hideSuggestionCard(); rejectAll(); try { editor.focus(); } catch (x) { /* best effort */ } });
                row = keepRow;
                sugCard.appendChild(allRow);
            }
            // Left / Right / Home / End move between the buttons; Escape returns to the editor with the caret where it
            // was (the card stays: the caret is still in the suggestion). tools/review/suggestion-card-keyboard.mjs
            sugCard.addEventListener("keydown", function (e) {
                var btns = [].slice.call(sugCard.querySelectorAll("button:not([disabled])"));
                var at = btns.indexOf(e.target), next = -1;
                if (e.key === "ArrowRight") next = (at + 1) % btns.length;
                else if (e.key === "ArrowLeft") next = (at - 1 + btns.length) % btns.length;
                else if (e.key === "Home") next = 0;
                else if (e.key === "End") next = btns.length - 1;
                else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    var back = sugCard.__returnRange;
                    try { editor.focus(); } catch (x) { /* best effort */ }
                    if (back) { try { var bs = editor.getDocument().getSelection(); bs.removeAllRanges(); bs.addRange(back); } catch (x) { /* best effort */ } }
                    return;
                }
                if (next < 0 || at < 0) return;
                e.preventDefault();
                btns[next].focus();
            });
            host.body.appendChild(sugCard);
            sugCardId = id;
        }
        // under the suggestion (the iframe's offset added)
        var rect = el.getBoundingClientRect();
        var fx = 0, fy = 0;
        try { if (editor.iframe) { var fr = editor.iframe.getBoundingClientRect(); fx = fr.left; fy = fr.top; } } catch (x) { /* no frame */ }
        var top = fy + rect.bottom + 6, left = Math.max(8, fx + rect.left);
        var vw = (sugCard.ownerDocument.defaultView || window).innerWidth;
        if (left + 300 > vw) left = Math.max(8, vw - 308);
        sugCard.style.top = top + "px";
        sugCard.style.left = left + "px";
    }
    // the next / previous pending suggestion after / before the caret (wrapping), selected
    function stepSuggestion(dir) {
        var doc = editor.getDocument(), ed = editor.getEditable();
        if (!doc || !ed) return null;
        var els = ed.querySelectorAll("[data-tc-id]"), firsts = [], seen = {};
        for (var i = 0; i < els.length; i++) {
            var sid = els[i].getAttribute("data-tc-id");
            if (seen[sid] || !pendingEntry(sid)) continue;
            seen[sid] = true;
            firsts.push(els[i]);
        }
        if (!firsts.length) return null;
        var sel = doc.getSelection(), cur = sel && sel.rangeCount ? sel.getRangeAt(0) : null, pick = null;
        if (cur) {
            if (dir > 0) {
                for (var a = 0; a < firsts.length && !pick; a++) {
                    var ra = doc.createRange(); ra.selectNodeContents(firsts[a]);
                    if (ra.compareBoundaryPoints(Range.START_TO_START, cur) > 0) pick = firsts[a];
                }
            }
            else {
                for (var b = firsts.length - 1; b >= 0 && !pick; b--) {
                    var rb = doc.createRange(); rb.selectNodeContents(firsts[b]);
                    if (rb.compareBoundaryPoints(Range.START_TO_START, cur) < 0) pick = firsts[b];
                }
            }
        }
        if (!pick) pick = dir > 0 ? firsts[0] : firsts[firsts.length - 1];
        var pid = pick.getAttribute("data-tc-id");
        var all = trackedElements(pid);
        var r = doc.createRange();
        r.setStart(all[0], 0);
        r.setEnd(all[all.length - 1], all[all.length - 1].childNodes.length);
        try { editor.focus(); } catch (x) { /* best effort */ }
        sel.removeAllRanges();
        sel.addRange(r);
        try { pick.scrollIntoView({ block: "nearest" }); } catch (x) { /* best effort */ }
        updateSuggestionCard();
        return pid;
    }

    function acceptEntry(id) {
        var entry = editor.reviewLedger.get(id);
        if (!entry) return false;
        if (!canDecide(entry, "accept")) return false;
        // every element of it (a split cuts an insert span in two), and paragraph breaks
        var els = trackedElements(id), joins = [], i;
        // a join that is part of a selection deletion keeps the block before it, as the untracked
        // delete does (__JoinTextBlocks keepFirst); a lone Backspace join does not
        for (i = 0; i < els.length; i++) {
            if (els[i].getAttribute("data-tc-break") !== "delete") continue;
            var prev = els[i].previousElementSibling;
            joins.push({ el: els[i], keep: !!prev && (prev.getAttribute("data-tc-id") === id || !!prev.querySelector('[data-tc-id="' + cssEscape(id) + '"]')) });
        }
        for (i = 0; i < els.length; i++) {
            var el = els[i], brk = el.getAttribute("data-tc-break"), blk = el.getAttribute("data-tc-block");
            if (brk === "insert") clearBreak(el);
            else if (brk === "delete") continue;
            else if (blk === "delete") { if (el.parentNode) el.parentNode.removeChild(el); }
            else if (blk) clearBlock(el);
            else if (el.classList.contains("rte-tc-delete")) { if (el.parentNode) el.parentNode.removeChild(el); }
            else unwrapKeepChildren(el);
        }
        for (i = 0; i < joins.length; i++) joinBreak(joins[i].el, joins[i].keep);
        editor.reviewLedger.update(id, { status: "accepted", decidedAt: Date.now(), decidedBy: decisionUser() });
        return true;
    }

    function rejectEntry(id) {
        var entry = editor.reviewLedger.get(id);
        if (!entry) return false;
        if (!canDecide(entry, "reject")) return false;
        var els = trackedElements(id), splits = [], seams = [];
        for (var i = 0; i < els.length; i++) {
            var el = els[i], brk = el.getAttribute("data-tc-break");
            var blk = el.getAttribute("data-tc-block");
            var fmt = el.hasAttribute("data-tc-format");
            if (brk === "insert") splits.push(el);
            else if (brk === "delete") clearBreak(el);
            else if (blk === "delete") { clearBlock(el); if (fmt) unparkIds(el); }
            else if (blk) { if (el.parentNode) el.parentNode.removeChild(el); }
            else if (el.classList.contains("rte-tc-delete")) {
                if (fmt) { if (el.previousSibling) seams.push(el.previousSibling); if (el.lastChild) seams.push(el.lastChild); }
                unwrapKeepChildren(el);
            }
            else if (fmt) removeFormattedPiece(el, seams);
            else if (el.parentNode) el.parentNode.removeChild(el);
        }
        for (var j = splits.length - 1; j >= 0; j--) undoSplit(splits[j]);
        for (var k = 0; k < seams.length; k++) if (seams[k].parentNode && editor.getEditable().contains(seams[k])) mergePair(seams[k]);
        editor.reviewLedger.update(id, { status: "rejected", decidedAt: Date.now(), decidedBy: decisionUser() });
        // 2026-10-09 A rejected footnote drops its reference AND its note: the footnotes plugin removes a note
        // whose marker is gone only in its own renumber pass, which a reject never ran (the note and an empty
        // Footnotes section stayed). tools/review/tracked-footnote-reject.mjs
        try { if (typeof editor.syncFootnotes === "function") editor.syncFootnotes(); } catch (er) { /* ignore */ }
        return true;
    }

    function acceptAll(filter) {
        var entries = editor.reviewLedger.list(filter).filter(function (e) {
            return (e.changeType === "insert" || e.changeType === "delete" || e.changeType === "format") && e.status === "pending";
        });
        var accepted = 0;
        for (var i = 0; i < entries.length; i++) if (acceptEntry(entries[i].id)) accepted++;
        return accepted;
    }

    function rejectAll(filter) {
        var entries = editor.reviewLedger.list(filter).filter(function (e) {
            return (e.changeType === "insert" || e.changeType === "delete" || e.changeType === "format") && e.status === "pending";
        });
        var rejected = 0;
        for (var i = 0; i < entries.length; i++) if (rejectEntry(entries[i].id)) rejected++;
        return rejected;
    }

    function unwrapKeepChildren(el) {
        var parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    }

    // 2026-05-28 Prefer native CSS.escape — same hardening as comments.js.
    // Defense-in-depth for customers who wire reviewLedger.add() with custom IDs
    // containing punctuation (e.g. UUIDs with dashes, OAuth subject claims with
    // colons, base64 IDs with `=` padding).
    function cssEscape(s) {
        var str = String(s);
        if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
            try { return CSS.escape(str); } catch (e) { /* fall through */ }
        }
        return str.replace(/["\\\]\[\(\)\{\}'#:;,<>=`~!@$%^&*+/?\s\x00-\x1F]/g, function (c) {
            return "\\" + c;
        });
    }

    // --- styles ---

    function injectStyles() {
        var host = (editor && editor.iframe && editor.iframe.ownerDocument) || document;
        if (!host.querySelector("style[data-rte-trackchanges]")) {
            var style = host.createElement("style");
            style.setAttribute("data-rte-trackchanges", "1");
            style.textContent = [
                ".richtexteditor rte-toolbar-button.rte_command_trackchanges{position:relative;border-radius:8px;transition:background .14s ease,color .14s ease,box-shadow .14s ease}",
                ".richtexteditor rte-toolbar-button.rte_command_trackchanges.rte-ui-active{background:linear-gradient(135deg,#e9f7ef,#eef5ff);color:#17633f;box-shadow:inset 0 0 0 1px rgba(34,132,82,.28),0 6px 14px rgba(34,132,82,.12)}",
                ".richtexteditor rte-toolbar-button.rte_command_trackchanges.rte-ui-active:after{content:'';position:absolute;right:5px;top:5px;width:6px;height:6px;border-radius:50%;background:#22a66a;box-shadow:0 0 0 2px #fff}",
                ".rte-tc{border-radius:4px;padding:0 2px;box-decoration-break:clone;-webkit-box-decoration-break:clone}",
                ".rte-suggestion-card{position:fixed;z-index:100000;max-width:300px;padding:8px 10px;border:1px solid rgba(100,116,139,.28);border-radius:8px;background:#fff;color:#1e293b;box-shadow:0 10px 26px rgba(15,23,42,.16);font:13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}",
                ".rte-suggestion-card-title{font-weight:600;margin-bottom:2px}",
                ".rte-suggestion-card-text{color:#475569;margin-bottom:6px;word-break:break-word}",
                ".rte-suggestion-card-actions{display:flex;gap:6px;flex-wrap:wrap}",
                ".rte-suggestion-card-all{margin-top:6px;padding-top:6px;border-top:1px solid rgba(100,116,139,.18)}",
                ".rte-suggestion-card-button{font:inherit;padding:3px 9px;border:1px solid rgba(100,116,139,.35);border-radius:6px;background:#fff;color:#1e293b;cursor:pointer}",
                ".rte-suggestion-card-button:focus-visible{outline:2px solid #2563eb;outline-offset:1px}",
                ".rte-suggestion-card-button:disabled{opacity:.5;cursor:default}",
                ".rte-suggestion-card-accept{background:#e9f7ef;border-color:#86c8a2;color:#125b39}",
                ".rte-suggestion-card-reject{background:#fff1f1;border-color:#e3a3a3;color:#9f1d1d}",
                ".rte-suggestion-card-dark{background:#1e293b;color:#e2e8f0;border-color:#334155;box-shadow:0 10px 26px rgba(0,0,0,.45)}",
                ".rte-suggestion-card-dark .rte-suggestion-card-text{color:#cbd5e1}",
                ".rte-suggestion-card-dark .rte-suggestion-card-all{border-top-color:#334155}",
                ".rte-suggestion-card-dark .rte-suggestion-card-button{background:#0f172a;color:#e2e8f0;border-color:#475569}",
                ".rte-suggestion-card-dark .rte-suggestion-card-accept{background:#14532d;border-color:#22c55e;color:#dcfce7}",
                ".rte-suggestion-card-dark .rte-suggestion-card-reject{background:#7f1d1d;border-color:#f87171;color:#fee2e2}",
                ".rte-suggestion-card-dark .rte-suggestion-card-button:focus-visible{outline-color:#93c5fd}",
                ".rte-tc-insert{background:linear-gradient(180deg,rgba(232,248,239,.78),rgba(232,248,239,.38));color:#125b39;text-decoration:underline;text-decoration-color:#22a66a;text-decoration-thickness:2px;text-underline-offset:3px}",
                ".rte-tc-delete{background:linear-gradient(180deg,rgba(255,240,240,.82),rgba(255,240,240,.42));color:#9f1d1d;text-decoration:line-through;text-decoration-color:#dc4c4c;text-decoration-thickness:2px;opacity:.92}"
            ].join("\n");
            host.head.appendChild(style);
            // A <style> ELEMENT is governed by style-src: under a strict policy the browser
            // drops its rules, leaving this plugin's UI unstyled. The element above stays
            // the path everyone else takes; this re-injects through the CSSOM only when
            // the policy actually emptied it.
            if (editor && typeof editor.ensureStyleSheetLive === "function") {
                editor.ensureStyleSheetLive(host, style, "rte-trackedchanges-style", style.textContent);
            }
        }

        var editdoc = editor.getDocument();
        if (editdoc && editdoc.head && !editdoc.querySelector("style[data-rte-trackchanges-inline]")) {
            var iStyle = editdoc.createElement("style");
            iStyle.setAttribute("data-rte-trackchanges-inline", "1");
            iStyle.textContent = [
                ".rte-tc{border-radius:4px;padding:0 2px;box-decoration-break:clone;-webkit-box-decoration-break:clone}",
                ".rte-tc-insert{background:linear-gradient(180deg,rgba(232,248,239,.78),rgba(232,248,239,.38));color:#125b39;text-decoration:underline;text-decoration-color:#22a66a;text-decoration-thickness:2px;text-underline-offset:3px}",
                ".rte-tc-delete{background:linear-gradient(180deg,rgba(255,240,240,.82),rgba(255,240,240,.42));color:#9f1d1d;text-decoration:line-through;text-decoration-color:#dc4c4c;text-decoration-thickness:2px;opacity:.92}",
                // a suggested paragraph break / join: a bar on the block after it, a pilcrow where it is
                "[data-tc-break=insert]{box-shadow:inset 3px 0 0 #22a66a}",
                "[data-tc-break=delete]{box-shadow:inset 3px 0 0 #dc4c4c}",
                "[data-tc-block=insert]{outline:2px solid rgba(34,166,106,.6);outline-offset:1px;background:rgba(232,248,239,.45)}",
                // a suggested deletion of a table row, column or table: struck through until decided
                "tr[data-tc-block=delete], td[data-tc-block=delete], th[data-tc-block=delete], table[data-tc-block=delete]{text-decoration:line-through;color:#9f1d1d;opacity:.85}",
                // a formatting suggestion shows the text with its NEW formatting (colours included)
                ".rte-tc-delete[data-tc-format]{display:none}",
                ".rte-tc-insert[data-tc-format]{color:inherit;background:none;text-decoration:underline dotted #b45309;text-decoration-thickness:2px;text-underline-offset:3px}",
                // a block formatting suggestion: the blocks as they will be; the originals wait hidden
                "[data-tc-block=delete][data-tc-format]{display:none}",
                "[data-tc-block=insert][data-tc-format]{outline:2px dotted #b45309;outline-offset:2px;background:none}",
                ":has(+ [data-tc-break=insert])::after{content:'" + PILCROW + "';color:#22a66a;font-weight:600;padding-left:2px}",
                ":has(+ [data-tc-break=delete])::after{content:'" + PILCROW + "';color:#dc4c4c;font-weight:600;padding-left:2px;text-decoration:line-through}"
            ].join("\n");
            editdoc.head.appendChild(iStyle);
            // A <style> ELEMENT is governed by style-src: under a strict policy the browser
            // drops its rules, leaving this plugin's UI unstyled. The element above stays
            // the path everyone else takes; this re-injects through the CSSOM only when
            // the policy actually emptied it.
            if (editor && typeof editor.ensureStyleSheetLive === "function") {
                editor.ensureStyleSheetLive(editdoc, iStyle, "rte-trackedchanges-iStyle", iStyle.textContent);
            }
        }
    }
}
