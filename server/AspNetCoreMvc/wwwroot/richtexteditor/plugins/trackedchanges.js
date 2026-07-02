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
            acceptAll: function (filter) { return acceptAll(filter); },
            rejectAll: function (filter) { return rejectAll(filter); },
            accept: function (id) { return acceptEntry(id); },
            reject: function (id) { return rejectEntry(id); },
            list: function (opts) {
                if (!editor.reviewLedger) return [];
                // Default to the PENDING review queue (matches the internal
                // accept/reject semantics). Pass {all:true} for full history
                // including accepted/rejected entries (also via reviewLedger.list()).
                var includeAll = opts && opts.all === true;
                return editor.reviewLedger.list().filter(function (e) {
                    if (e.changeType !== "insert" && e.changeType !== "delete") return false;
                    return includeAll || e.status === "pending";
                });
            }
        };

        injectStyles();

        editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
        editor.toolbarFactoryMap["trackchanges"] = function (cmd) {
            var btn = editor.createToolbarButton(cmd);
            btn.__tcSync = function () {
                if (enabled) btn.classList.add("rte-ui-active");
                else btn.classList.remove("rte-ui-active");
                btn.setAttribute("aria-pressed", enabled ? "true" : "false");
                btn.setAttribute("title", enabled ? "Suggesting mode is on" : "Turn on suggesting mode");
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

        editor.getEditable().addEventListener("beforeinput", onBeforeInput, true);
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
        // insertParagraph, insertCompositionText, insertFromPaste, historyUndo/Redo: pass through for v1.
    }

    // --- insert tracking ---

    function handleInsertText(text) {
        if (!text) return;
        var sel = editor.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        var range = sel.getRangeAt(0);
        if (!range.collapsed) {
            // Selection replace: wrap selection as delete, then insert new text.
            if (!wrapRangeAsDelete(range)) return;
            // After wrapping, caret should be past the delete span; re-fetch selection.
            range = sel.getRangeAt(0);
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
        placeCaretAtEnd(node);
        updateEntryForSpan(span);
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

        if (!range.collapsed) {
            wrapRangeAsDelete(range);
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

    // --- accept / reject ---

    function acceptEntry(id) {
        var entry = editor.reviewLedger.get(id);
        if (!entry) return false;
        var span = editor.getEditable().querySelector('[data-tc-id="' + cssEscape(id) + '"]');
        if (entry.changeType === "insert") {
            if (span) unwrapKeepChildren(span);
        } else if (entry.changeType === "delete") {
            if (span) span.remove();
        }
        editor.reviewLedger.update(id, { status: "accepted", decidedAt: Date.now() });
        return true;
    }

    function rejectEntry(id) {
        var entry = editor.reviewLedger.get(id);
        if (!entry) return false;
        var span = editor.getEditable().querySelector('[data-tc-id="' + cssEscape(id) + '"]');
        if (entry.changeType === "insert") {
            if (span) span.remove();
        } else if (entry.changeType === "delete") {
            if (span) unwrapKeepChildren(span);
        }
        editor.reviewLedger.update(id, { status: "rejected", decidedAt: Date.now() });
        return true;
    }

    function acceptAll(filter) {
        var entries = editor.reviewLedger.list(filter).filter(function (e) {
            return (e.changeType === "insert" || e.changeType === "delete") && e.status === "pending";
        });
        for (var i = 0; i < entries.length; i++) acceptEntry(entries[i].id);
        return entries.length;
    }

    function rejectAll(filter) {
        var entries = editor.reviewLedger.list(filter).filter(function (e) {
            return (e.changeType === "insert" || e.changeType === "delete") && e.status === "pending";
        });
        for (var i = 0; i < entries.length; i++) rejectEntry(entries[i].id);
        return entries.length;
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
                ".rte-tc-insert{background:linear-gradient(180deg,rgba(232,248,239,.78),rgba(232,248,239,.38));color:#125b39;text-decoration:underline;text-decoration-color:#22a66a;text-decoration-thickness:2px;text-underline-offset:3px}",
                ".rte-tc-delete{background:linear-gradient(180deg,rgba(255,240,240,.82),rgba(255,240,240,.42));color:#9f1d1d;text-decoration:line-through;text-decoration-color:#dc4c4c;text-decoration-thickness:2px;opacity:.92}"
            ].join("\n");
            host.head.appendChild(style);
        }

        var editdoc = editor.getDocument();
        if (editdoc && editdoc.head && !editdoc.querySelector("style[data-rte-trackchanges-inline]")) {
            var iStyle = editdoc.createElement("style");
            iStyle.setAttribute("data-rte-trackchanges-inline", "1");
            iStyle.textContent = [
                ".rte-tc{border-radius:4px;padding:0 2px;box-decoration-break:clone;-webkit-box-decoration-break:clone}",
                ".rte-tc-insert{background:linear-gradient(180deg,rgba(232,248,239,.78),rgba(232,248,239,.38));color:#125b39;text-decoration:underline;text-decoration-color:#22a66a;text-decoration-thickness:2px;text-underline-offset:3px}",
                ".rte-tc-delete{background:linear-gradient(180deg,rgba(255,240,240,.82),rgba(255,240,240,.42));color:#9f1d1d;text-decoration:line-through;text-decoration-color:#dc4c4c;text-decoration-thickness:2px;opacity:.92}"
            ].join("\n");
            editdoc.head.appendChild(iStyle);
        }
    }
}
