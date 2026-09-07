if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-09-04 Inline code — CKEditor 5's "Code" feature (`<code>`), the one
// basic-style it ships that this editor had no command for. Markdown `x` was
// the only way to produce inline code here, which meant there was no way to
// REMOVE it and no toolbar affordance at all.
//
// The command is "inlinecode", NOT "code". "code" is already taken by the
// HTML-source-view toggle in the core (__Is_Cmd_Active case "code" ->
// ___Is_CodeMode()), so registering "code" here would have collided with source
// view. keyboarda11y.js has carried "inlinecode" in its TOGGLE_CMD list all
// along, with a comment that it matched nothing in this build; a core
// __Is_Cmd_Active case added alongside this plugin is what makes it match, so
// the button reports aria-pressed and not just a highlight.
//
// Design notes:
//   - Toggling is done by SPLITTING the <code> element around the selection
//     rather than by lifting text nodes out of it. Splitting preserves nested
//     inline markup: un-coding the middle of <code>a <em>b</em> c</code> keeps
//     the <em>. Lifting text nodes would have dropped it.
//   - A collapsed selection acts on the word under the caret. That is the same
//     choice changecase.js makes, and for the same reason: it makes the command
//     usable from a keyboard shortcut without selecting first. The alternative -
//     inserting an empty <code> and putting the caret inside - is the caret trap
//     documented in the footnotes work, so it is deliberately not done.
//   - Never nests inside <pre> or an existing <code>: both already mean
//     "preformatted", and nesting produces markup no serializer round-trips.
//   - Emits a bare <code> element and no rte-* class. That keeps the styling in
//     the content stylesheet where authors can override it, and keeps the plugin
//     out of check-css-contract.mjs, which only scans the four theme sheets.
RTE_DefaultConfig.plugin_inlinecode = RTE_Plugin_InlineCode;

if (!RTE_DefaultConfig.text_inlinecode) RTE_DefaultConfig.text_inlinecode = "Inline code";

if (!RTE_DefaultConfig.svgCode_inlinecode) {
    RTE_DefaultConfig.svgCode_inlinecode = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 8 3 12 7 16"/><polyline points="17 8 21 12 17 16"/></svg>';
}

function RTE_Plugin_InlineCode() {
    var obj = this;
    var config, editor;

    obj.PluginName = "InlineCode";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_inlinecode", function (state) {
            state.returnValue = true;
            obj.Toggle();
        });

        // Public API, matching the shape the other toggle plugins expose.
        editor.toggleInlineCode = function () { return obj.Toggle(); };
        editor.isInlineCode = function () { return obj.IsActive(); };
    };

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function getRange(doc) {
        var sel = doc && doc.getSelection ? doc.getSelection() : null;
        if (!sel || !sel.rangeCount) return null;
        return sel.getRangeAt(0);
    }

    // Nearest <code> ancestor that is still inside the editable area.
    function codeAncestor(node, editable) {
        while (node && node !== editable) {
            if (node.nodeType === 1 && node.nodeName === "CODE") return node;
            node = node.parentNode;
        }
        return null;
    }

    function inPre(node, editable) {
        while (node && node !== editable) {
            if (node.nodeType === 1 && node.nodeName === "PRE") return true;
            node = node.parentNode;
        }
        return false;
    }

    obj.IsActive = function () {
        var doc = getDoc(), editable = getEditable();
        if (!doc || !editable) return false;
        var range = getRange(doc);
        if (!range) return false;
        return !!codeAncestor(range.startContainer, editable);
    };

    // ---- selection helpers -----------------------------------------------

    // Expand a collapsed caret to the word under it. Returns false when the
    // caret is not sitting in a word, in which case the command does nothing
    // rather than creating an empty element.
    function expandToWord(range) {
        var node = range.startContainer;
        if (!node || node.nodeType !== 3) return false;
        var text = node.data || "";
        var offset = range.startOffset;
        var start = offset, end = offset;
        while (start > 0 && /\S/.test(text.charAt(start - 1))) start--;
        while (end < text.length && /\S/.test(text.charAt(end))) end++;
        if (start === end) return false;
        range.setStart(node, start);
        range.setEnd(node, end);
        return true;
    }

    // Every text node the range actually covers. Boundary text nodes are split
    // first so a partially-selected node is not treated as fully selected.
    function selectedTextNodes(doc, range, editable) {
        if (range.startContainer.nodeType === 3 && range.startOffset > 0) {
            var s = range.startContainer;
            if (range.startOffset < s.data.length) {
                var rest = s.splitText(range.startOffset);
                var endSame = (range.endContainer === s);
                var endOff = range.endOffset;
                range.setStart(rest, 0);
                if (endSame) range.setEnd(rest, endOff - s.data.length);
            }
        }
        if (range.endContainer.nodeType === 3 && range.endOffset < range.endContainer.data.length && range.endOffset > 0) {
            range.endContainer.splitText(range.endOffset);
        }

        var out = [];
        var walker = doc.createTreeWalker(editable, 4 /* SHOW_TEXT */, null, false);
        var n;
        while ((n = walker.nextNode())) {
            if (!n.data) continue;
            if (range.intersectsNode ? range.intersectsNode(n) : true) {
                // intersectsNode is true for merely-touching nodes, so confirm
                // the node is genuinely within the boundaries.
                var r = doc.createRange();
                r.selectNodeContents(n);
                if (range.compareBoundaryPoints(Range.END_TO_START, r) < 0 &&
                    range.compareBoundaryPoints(Range.START_TO_END, r) > 0) {
                    out.push(n);
                }
            }
        }
        return out;
    }

    // ---- apply / remove ---------------------------------------------------

    // Split `code` around the selection and unwrap only the overlapping part,
    // so partial removal keeps the untouched halves coded.
    function unwrapPart(doc, code, range) {
        var parent = code.parentNode;
        if (!parent) return;

        var startsInside = code.contains(range.startContainer);
        var endsInside = code.contains(range.endContainer);

        // Tail first: extracting it cannot disturb the head's boundaries.
        var after = doc.createRange();
        if (endsInside) after.setStart(range.endContainer, range.endOffset);
        else after.setStart(code, code.childNodes.length);
        after.setEnd(code, code.childNodes.length);
        var afterFrag = after.extractContents();

        var before = doc.createRange();
        before.setStart(code, 0);
        if (startsInside) before.setEnd(range.startContainer, range.startOffset);
        else before.setEnd(code, 0);
        var beforeFrag = before.extractContents();

        if (beforeFrag && beforeFrag.textContent !== "") {
            var head = doc.createElement("code");
            head.appendChild(beforeFrag);
            parent.insertBefore(head, code);
        }

        // What is left in `code` is exactly the selected part: unwrap it.
        while (code.firstChild) parent.insertBefore(code.firstChild, code);

        if (afterFrag && afterFrag.textContent !== "") {
            var tail = doc.createElement("code");
            tail.appendChild(afterFrag);
            parent.insertBefore(tail, code);
        }

        parent.removeChild(code);
    }

    function wrapNodes(doc, nodes, editable) {
        // Group contiguous siblings so a run of text under one parent becomes a
        // single <code>, not one per text node.
        var group = [], groups = [];
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            if (inPre(n, editable) || codeAncestor(n, editable)) continue;
            if (group.length && group[group.length - 1].parentNode === n.parentNode &&
                group[group.length - 1].nextSibling === n) {
                group.push(n);
            } else {
                if (group.length) groups.push(group);
                group = [n];
            }
        }
        if (group.length) groups.push(group);

        for (var g = 0; g < groups.length; g++) {
            var run = groups[g];
            // Whitespace-only runs would produce a <code> containing nothing but
            // a space, which is invisible formatting debris.
            var joined = "";
            for (var k = 0; k < run.length; k++) joined += run[k].data;
            if (!/\S/.test(joined)) continue;

            var code = doc.createElement("code");
            run[0].parentNode.insertBefore(code, run[0]);
            for (var j = 0; j < run.length; j++) code.appendChild(run[j]);
        }
    }

    // Adjacent <code><code> pairs read as one to the user but serialize as two.
    function mergeAdjacent(editable) {
        var all = editable.querySelectorAll("code");
        for (var i = 0; i < all.length; i++) {
            var code = all[i];
            var next = code.nextSibling;
            while (next && next.nodeType === 1 && next.nodeName === "CODE") {
                while (next.firstChild) code.appendChild(next.firstChild);
                next.parentNode.removeChild(next);
                next = code.nextSibling;
            }
        }
    }

    obj.Toggle = function () {
        var doc = getDoc(), editable = getEditable();
        if (!doc || !editable) return false;
        var range = getRange(doc);
        if (!range) return false;
        if (!editable.contains(range.startContainer)) return false;

        if (range.collapsed && !expandToWord(range)) return false;

        var nodes = selectedTextNodes(doc, range, editable);
        if (!nodes.length) return false;

        // Remove when every selected text node is already coded; otherwise apply.
        var allCoded = true;
        for (var i = 0; i < nodes.length; i++) {
            if (!/\S/.test(nodes[i].data)) continue;
            if (!codeAncestor(nodes[i], editable)) { allCoded = false; break; }
        }

        if (allCoded) {
            var codes = [], seen = [];
            for (var n = 0; n < nodes.length; n++) {
                var c = codeAncestor(nodes[n], editable);
                if (c && seen.indexOf(c) < 0) { seen.push(c); codes.push(c); }
            }
            for (var x = 0; x < codes.length; x++) unwrapPart(doc, codes[x], range);
        } else {
            wrapNodes(doc, nodes, editable);
            mergeAdjacent(editable);
        }

        try { editor.updateToolbarStatus && editor.updateToolbarStatus(); } catch (e) { }
        return true;
    };
}
