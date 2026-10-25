if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// Restricted editing — Word-style "protect document with editable regions".
// When `restrictedEditingMode` is true on the editor's config, all content
// is read-only EXCEPT spans tagged with `data-rte-editable="true"`. Use it
// for templates with fillable fields, contracts with author-only edits, etc.
//
//   var ed = new RichTextEditor("#editor", { restrictedEditingMode: true });
//   ed.restrictedEditing.markSelection();     // mark current selection editable
//   ed.restrictedEditing.enable();            // turn on lockdown
//   ed.restrictedEditing.disable();           // turn off lockdown
//   ed.restrictedEditing.goToNext();          // move caret to next editable region
//   ed.restrictedEditing.goToPrev();          // move caret to previous editable region
//   ed.restrictedEditing.list();              // -> Array<Element>

if (!RTE_DefaultConfig.svgCode_restrictedediting) {
    RTE_DefaultConfig.svgCode_restrictedediting = '<svg viewBox="0 0 24 24" fill="none" stroke="#5F6368" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
}

RTE_DefaultConfig.plugin_restrictedediting = RTE_Plugin_RestrictedEditing;

function RTE_Plugin_RestrictedEditing() {
    var obj = this;
    var config;
    var editor;
    var enabled = false;
    var editableAttr = "data-rte-editable";

    obj.PluginName = "RestrictedEditing";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        config.text_restrictedediting = config.text_restrictedediting || "Restricted editing";
        config.text_restrictedediting_mark = config.text_restrictedediting_mark || "Mark as editable";
        config.text_restrictedediting_next = config.text_restrictedediting_next || "Next editable region";
        config.text_restrictedediting_hint = config.text_restrictedediting_hint || "Lock the document; only marked regions accept input.";
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        enabled = !!config.restrictedEditingMode;

        editor.restrictedEditing = {
            isEnabled: function () { return enabled; },
            enable: enable,
            disable: disable,
            toggle: function () { return enabled ? disable() : enable(); },
            markSelection: markSelection,
            unmark: unmark,
            list: list,
            goToNext: function () { return navigate(1); },
            goToPrev: function () { return navigate(-1); }
        };

        editor.attachEvent("exec_command_restrictedediting", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            // Toolbar click toggles the lockdown.
            editor.restrictedEditing.toggle();
        });

        if (enabled) enable();

        // Refresh styles when content changes (newly-pasted marked spans inherit visuals).
        editor.attachEvent("change", refreshStyles);
        refreshStyles();
    };

    // 2026-10-14 The lockdown is enforced, not only drawn. A paragraph that holds a field stays contenteditable so the
    // caret can reach the field, which left the protected text around the field editable; Delete over a locked
    // selection, Alt+Arrow (move block) and Ctrl+Shift+D (copy block) changed protected text too, because the core
    // handles those keys itself. While the lockdown is on, a key or an input whose selection is not entirely inside
    // one marked region is cancelled at the editing window, in the capture phase, before anything else sees it.
    // Backspace at a field's start and Delete at its end would reach outside it, so they are cancelled as well.
    // tools/restricted/restricted-audit.mjs
    var guardedWindows = [];
    function regionOf(node) {
        var el = node && node.nodeType === 1 ? node : (node && node.parentNode);
        while (el && el.nodeType === 1) {
            if (el.getAttribute && el.getAttribute(editableAttr) === "true") return el;
            el = el.parentNode;
        }
        return null;
    }
    // the marked region that holds the whole selection, or null
    function selectionRegion(doc) {
        var sel = doc.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        var r = sel.getRangeAt(0);
        var a = regionOf(r.startContainer), b = regionOf(r.endContainer);
        return a && a === b ? { region: a, range: r } : null;
    }
    function atEdge(doc, region, range, atStart) {
        var probe = doc.createRange();
        probe.selectNodeContents(region);
        if (atStart) probe.setEnd(range.startContainer, range.startOffset);
        else probe.setStart(range.endContainer, range.endOffset);
        return probe.toString() === "";
    }
    function editsDocument(e) {
        var k = e.key || "";
        if (e.isComposing) return true;
        if (k === "Backspace" || k === "Delete" || k === "Enter" || k === "Tab") return true;
        if (e.altKey && (k === "ArrowUp" || k === "ArrowDown")) return true;
        if (e.ctrlKey || e.metaKey) {
            var c = k.toLowerCase();
            return c === "x" || c === "v" || c === "b" || c === "i" || c === "u" || c === "d";
        }
        return k.length === 1 && !e.altKey;
    }
    function guardKey(e) {
        if (!enabled || !editsDocument(e)) return;
        var doc = e.target && (e.target.ownerDocument || e.target);
        if (!doc || !doc.getSelection) return;
        var hit = selectionRegion(doc);
        var refuse = !hit;
        if (hit && hit.range.collapsed) {
            if (e.key === "Backspace" && atEdge(doc, hit.region, hit.range, true)) refuse = true;
            if (e.key === "Delete" && atEdge(doc, hit.region, hit.range, false)) refuse = true;
        }
        if (hit && (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown"))) refuse = true;
        if (hit && (e.ctrlKey || e.metaKey) && e.shiftKey && String(e.key).toLowerCase() === "d") refuse = true;
        if (!refuse) return;
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    function guardInput(e) {
        if (!enabled) return;
        var type = e.inputType || "";
        if (type.indexOf("history") === 0) return;
        var doc = e.target && (e.target.ownerDocument || e.target);
        if (!doc || !doc.getSelection) return;
        if (selectionRegion(doc)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    function ensureGuards() {
        var body = getEditable();
        var win = body && body.ownerDocument && body.ownerDocument.defaultView;
        if (!win || guardedWindows.indexOf(win) >= 0) return;
        guardedWindows.push(win);
        win.addEventListener("keydown", guardKey, true);
        win.addEventListener("beforeinput", guardInput, true);
        win.addEventListener("cut", function (e) { if (enabled && !selectionRegion(e.target.ownerDocument || e.target)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
        win.addEventListener("paste", function (e) { if (enabled && !selectionRegion(e.target.ownerDocument || e.target)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
        win.addEventListener("drop", function (e) { if (enabled) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    }

    function getEditable() {
        return editor.getEditable ? editor.getEditable() : null;
    }

    function refreshStyles() {
        var body = getEditable();
        if (!body) return;
        var doc = body.ownerDocument;
        if (!doc || doc.getElementById("__rte_restrictedediting_styles")) return;
        var s = doc.createElement("style");
        s.id = "__rte_restrictedediting_styles";
        s.textContent = [
            "[" + editableAttr + "='true']{background:rgba(34,197,94,.10);outline:1px dashed rgba(34,197,94,.55);outline-offset:1px;border-radius:2px;padding:1px 2px}",
            "body.rte-restricted [contenteditable='false']{cursor:not-allowed}",
            "body.rte-restricted [" + editableAttr + "='true']{background:rgba(34,197,94,.16)}"
        ].join("\n");
        (doc.head || doc.getElementsByTagName("head")[0]).appendChild(s);
        // A <style> ELEMENT is governed by style-src: under a strict policy the browser
        // drops its rules, leaving this plugin's UI unstyled. The element above stays
        // the path everyone else takes; this re-injects through the CSSOM only when
        // the policy actually emptied it.
        if (editor && typeof editor.ensureStyleSheetLive === "function") {
            editor.ensureStyleSheetLive(doc, s, "__rte_restrictedediting_styles", s.textContent);
        }
    }

    function enable() {
        var body = getEditable();
        if (!body) return false;
        enabled = true;
        body.classList.add("rte-restricted");
        // Walk top-level children — anything WITHOUT a descendant marked region
        // becomes contenteditable=false. Marked regions stay editable.
        for (var i = 0; i < body.children.length; i++) {
            var node = body.children[i];
            if (node.querySelector("[" + editableAttr + "='true']")) {
                node.setAttribute("contenteditable", "true");
                // Lock the wrapper itself but keep the marked descendants editable.
                node.setAttribute(editableAttr + "-wrapper", "true");
            } else {
                node.setAttribute("contenteditable", "false");
            }
        }
        // Make the body itself NOT editable; rely on per-element contenteditable.
        body.setAttribute("contenteditable", "false");
        ensureGuards();
        refreshStyles();
        return true;
    }

    function disable() {
        var body = getEditable();
        if (!body) return false;
        enabled = false;
        body.classList.remove("rte-restricted");
        var locked = body.querySelectorAll("[contenteditable]");
        for (var i = 0; i < locked.length; i++) {
            locked[i].removeAttribute("contenteditable");
            locked[i].removeAttribute(editableAttr + "-wrapper");
        }
        body.setAttribute("contenteditable", "true");
        return true;
    }

    // Mark the current selection as an editable region. Returns the wrapper element.
    function markSelection(options) {
        options = options || {};
        var body = getEditable();
        if (!body) return null;
        var doc = body.ownerDocument;
        var sel = doc.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        var range = sel.getRangeAt(0);
        if (range.collapsed) return null;
        // 2026-10-02 A selection that crosses blocks marks the selected text of EACH block. One span
        // went AROUND the blocks: two paragraphs became four (<p>al</p><span><p>pha</p><p>be</p>
        // </span><p>ta</p>), list items and table cells got a span inside <ul> / <tr> - and that
        // span, a direct child of the body, was LOCKED by enable() (it looks for a region among a
        // child's descendants): the region could not be typed into. Returns the first region.
        // tools/restricted/mark-across-blocks.mjs
        var runs = crossBlockRuns(doc, range);
        if (runs) {
            var regions = [];
            // from the last run back: wrapping one never moves the text of a run still to come
            for (var ri = runs.length - 1; ri >= 0; ri--) {
                var sub = doc.createRange();
                sub.setStart(runs[ri].sn, runs[ri].so);
                sub.setEnd(runs[ri].en, runs[ri].eo);
                widenToInlineEdges(sub, runs[ri].block);
                var part = doc.createElement("span");
                part.setAttribute(editableAttr, "true");
                if (options.label) part.setAttribute("aria-label", options.label);
                part.appendChild(sub.extractContents());
                sub.insertNode(part);
                regions.unshift(part);
            }
            if (!regions.length) return null;
            var all = doc.createRange();
            all.setStart(regions[0], 0);
            all.setEnd(regions[regions.length - 1], regions[regions.length - 1].childNodes.length);
            sel.removeAllRanges();
            sel.addRange(all);
            refreshStyles();
            if (enabled) enable();
            return regions[0];
        }
        var span = doc.createElement("span");
        span.setAttribute(editableAttr, "true");
        if (options.label) span.setAttribute("aria-label", options.label);
        try {
            range.surroundContents(span);
        } catch (e) {
            // surroundContents fails on partial-element selections; fall back
            // to extract → wrap → insert.
            var frag = range.extractContents();
            span.appendChild(frag);
            range.insertNode(span);
        }
        // Restore selection inside the new wrapper.
        var r2 = doc.createRange();
        r2.selectNodeContents(span);
        sel.removeAllRanges();
        sel.addRange(r2);
        refreshStyles();
        if (enabled) enable(); // recompute lockdown around new editable region
        return span;
    }

    // The runs of selected text that share a block, when the selection crosses blocks; null when it
    // starts and ends in one block (that keeps the single-span path). Whitespace-only runs (the line
    // break between two blocks) are dropped; text inside a non-editable element moves with its run.
    var BLOCK_RE = /^(P|DIV|LI|UL|OL|DL|DT|DD|TABLE|TBODY|THEAD|TFOOT|TR|TD|TH|CAPTION|H[1-6]|PRE|BLOCKQUOTE|ADDRESS|FIGURE|FIGCAPTION|SECTION|ARTICLE|ASIDE|HEADER|FOOTER|NAV|MAIN|DETAILS|SUMMARY|FORM|FIELDSET|LEGEND|HR|BODY)$/;
    function blockOf(node) {
        for (var n = node; n; n = n.parentNode)
            if (n.nodeType === 1 && BLOCK_RE.test(n.nodeName)) return n;
        return null;
    }
    function crossBlockRuns(doc, range) {
        if (blockOf(range.startContainer) === blockOf(range.endContainer)) return null;
        var root = range.commonAncestorContainer;
        if (root.nodeType !== 1) root = root.parentNode;
        var runs = [], cur = null;
        var w = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: function (n) { return n.nodeType === 1 && n.getAttribute("contenteditable") === "false" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
        });
        for (var n = w.nextNode(); n; n = w.nextNode()) {
            if (n.nodeType === 1) {
                if (BLOCK_RE.test(n.nodeName)) cur = null;
                continue;
            }
            if (!range.intersectsNode(n)) continue;
            var a = n === range.startContainer ? range.startOffset : 0, b = n === range.endContainer ? range.endOffset : n.data.length;
            if (b <= a) continue;
            var blk = blockOf(n);
            if (!cur || cur.block !== blk) {
                cur = { block: blk, sn: n, so: a, text: "" };
                runs.push(cur);
            }
            cur.en = n;
            cur.eo = b;
            cur.text += n.data.substring(a, b);
        }
        var keep = [];
        for (var i = 0; i < runs.length; i++) if (/\S/.test(runs[i].text)) keep.push(runs[i]);
        return keep;
    }
    // A run starting or ending at the edge of an inline element (<b>) takes the whole element, so
    // no empty <b></b> is left behind by extractContents.
    function widenToInlineEdges(range, block) {
        var n = range.startContainer;
        if (n.nodeType === 3 && range.startOffset === 0) {
            while (n.parentNode && n.parentNode !== block && !n.previousSibling && !BLOCK_RE.test(n.parentNode.nodeName)) n = n.parentNode;
            range.setStartBefore(n);
        }
        n = range.endContainer;
        if (n.nodeType === 3 && range.endOffset === n.data.length) {
            while (n.parentNode && n.parentNode !== block && !n.nextSibling && !BLOCK_RE.test(n.parentNode.nodeName)) n = n.parentNode;
            range.setEndAfter(n);
        }
    }

    function unmark(node) {
        node = node || (function () {
            var body = getEditable();
            var sel = body && body.ownerDocument.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            var n = sel.anchorNode;
            while (n && n !== body) {
                if (n.nodeType === 1 && n.getAttribute && n.getAttribute(editableAttr) === "true") return n;
                n = n.parentNode;
            }
            return null;
        })();
        if (!node) return false;
        // Replace the wrapper with its children (preserve content).
        var parent = node.parentNode;
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        parent.removeChild(node);
        if (enabled) enable();
        return true;
    }

    function list() {
        var body = getEditable();
        if (!body) return [];
        return Array.prototype.slice.call(body.querySelectorAll("[" + editableAttr + "='true']"));
    }

    function navigate(direction) {
        var regions = list();
        if (regions.length === 0) return null;
        var body = getEditable();
        var sel = body && body.ownerDocument.getSelection();
        var current = null;
        if (sel && sel.anchorNode) {
            var n = sel.anchorNode;
            while (n && n !== body) {
                if (n.nodeType === 1 && n.getAttribute && n.getAttribute(editableAttr) === "true") { current = n; break; }
                n = n.parentNode;
            }
        }
        var idx = current ? regions.indexOf(current) : -1;
        var next = regions[(idx + direction + regions.length) % regions.length];
        if (!next) return null;
        var range = body.ownerDocument.createRange();
        range.selectNodeContents(next);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        next.scrollIntoView({ block: "center", behavior: "smooth" });
        return next;
    }
}
