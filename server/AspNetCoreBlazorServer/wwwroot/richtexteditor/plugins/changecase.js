if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Change case. UPPERCASE / lowercase / Title Case / Sentence case /
// tOGGLE cASE over the selection.
//
// CKEditor 5 case change: "Unlock this feature with selected CKEditor Plans".
//
// Design notes:
//   - This rewrites TEXT NODES in place, so inline markup survives: change the
//     case of "the <strong>Data</strong> Act" and the <strong> is still there.
//     A naive getSelectedText()/insertHTML() round-trip would flatten it.
//   - The selected text nodes are joined into one string, transformed, then
//     written back slice by slice. Doing it per-node would break the modes that
//     need context across a node boundary: Sentence case has to know it is at
//     the start of the selection, and Title Case has to see a whole word even
//     when <strong> splits it down the middle.
//   - A collapsed selection operates on the word under the caret, which is what
//     makes the feature usable from a keyboard shortcut without selecting first.
//   - "text-transform" is deliberately NOT used: that is a presentational lie
//     that disappears the moment the HTML is consumed somewhere else. This
//     changes the actual characters.
RTE_DefaultConfig.plugin_changecase = RTE_Plugin_ChangeCase;

// Words left lowercase by Title Case unless they are first or last.
if (typeof RTE_DefaultConfig.titleCaseSmallWords === "undefined") {
    RTE_DefaultConfig.titleCaseSmallWords =
        "a an and as at but by for if in nor of on or per so the to via vs with";
}

function RTE_Plugin_ChangeCase() {
    var obj = this;
    var config, editor;

    obj.PluginName = "ChangeCase";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_changecase", function (state) {
            state.returnValue = true;
            obj.Apply(state && state.value ? state.value : "upper");
        });

        // Public API.
        editor.changeCase = function (mode) { return obj.Apply(mode); };
        editor.getChangeCaseModes = function () {
            return ["upper", "lower", "title", "sentence", "toggle"];
        };
    };

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    // ---- transforms ------------------------------------------------------

    function smallWordSet() {
        var set = {};
        String(config.titleCaseSmallWords || "").split(/\s+/).forEach(function (w) {
            if (w) set[w.toLowerCase()] = true;
        });
        return set;
    }

    function transform(text, mode) {
        switch (mode) {
            case "lower": return text.toLowerCase();
            case "upper": return text.toUpperCase();
            case "toggle":
                return text.replace(/\S/g, function (ch) {
                    var up = ch.toUpperCase();
                    // Characters with no case (digits, CJK, punctuation) compare
                    // equal both ways — leave them alone.
                    return ch === up ? ch.toLowerCase() : up;
                });
            case "sentence": return sentenceCase(text);
            case "title": return titleCase(text);
            default: return text;
        }
    }

    function sentenceCase(text) {
        var lower = text.toLowerCase();
        var out = "";
        var startOfSentence = true;
        for (var i = 0; i < lower.length; i++) {
            var ch = lower[i];
            if (startOfSentence && /\S/.test(ch)) {
                out += ch.toUpperCase();
                // A letter opens the sentence; an opening quote or bracket does
                // not, so keep waiting for the real first letter.
                if (/[\p{L}\p{N}]/u.test(ch)) startOfSentence = false;
            } else {
                out += ch;
            }
            if (/[.!?]/.test(ch)) startOfSentence = true;
        }
        return out;
    }

    function titleCase(text) {
        var small = smallWordSet();
        // Split on whitespace but KEEP it, so the original spacing is preserved
        // exactly rather than normalised to single spaces.
        var parts = text.split(/(\s+)/);
        var wordIndex = 0;
        var wordCount = 0;
        var i;
        for (i = 0; i < parts.length; i++) if (!/^\s*$/.test(parts[i])) wordCount++;
        for (i = 0; i < parts.length; i++) {
            if (/^\s*$/.test(parts[i])) continue;
            var isEdge = (wordIndex === 0 || wordIndex === wordCount - 1);
            parts[i] = titleWord(parts[i], small, isEdge);
            wordIndex++;
        }
        return parts.join("");
    }

    function titleWord(word, small, isEdge) {
        var lower = word.toLowerCase();
        // Compare on letters only so "the," and "(the" still match "the".
        var bare = lower.replace(/[^\p{L}\p{N}']/gu, "");
        if (!isEdge && small[bare]) return lower;
        // A hyphenated compound is title-cased segment by segment, and the small
        // word rule applies inside it too — "state-of-the-art" is conventionally
        // "State-of-the-Art", not "State-Of-The-Art". Splitting on a capturing
        // group keeps the separators, so odd indices are the separators and even
        // indices are the segments.
        var segs = lower.split(/([-\/])/);
        var last = segs.length - 1;
        for (var i = 0; i <= last; i += 2) {
            var seg = segs[i];
            if (!seg) continue;
            var segBare = seg.replace(/[^\p{L}\p{N}']/gu, "");
            if (i !== 0 && i !== last && small[segBare]) continue;   // stays lowercase
            segs[i] = seg.replace(/[\p{L}\p{N}]/u, function (ch) { return ch.toUpperCase(); });
        }
        return segs.join("");
    }

    // ---- selection plumbing ----------------------------------------------

    // Grow a collapsed caret to cover the word it sits in, so the command is
    // useful without a prior selection.
    function expandToWord(range) {
        var node = range.startContainer;
        if (!node || node.nodeType !== 3) return false;
        var text = node.nodeValue || "";
        var start = range.startOffset;
        var end = start;
        while (start > 0 && /[\p{L}\p{N}'']/u.test(text[start - 1])) start--;
        while (end < text.length && /[\p{L}\p{N}'']/u.test(text[end])) end++;
        if (start === end) return false;
        range.setStart(node, start);
        range.setEnd(node, end);
        return true;
    }

    // Split the boundary text nodes so the range covers whole nodes only, then
    // collect every text node inside it.
    function textNodesInRange(range, doc) {
        if (range.startContainer.nodeType === 3 && range.startOffset > 0) {
            var s = range.startContainer.splitText(range.startOffset);
            range.setStart(s, 0);
        }
        if (range.endContainer.nodeType === 3 && range.endOffset < range.endContainer.nodeValue.length) {
            range.endContainer.splitText(range.endOffset);
        }
        var root = range.commonAncestorContainer;
        if (root.nodeType === 3) return [root];
        var nodes = [];
        var walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */, null, false);
        var n;
        while ((n = walker.nextNode())) {
            if (!n.nodeValue) continue;
            if (range.intersectsNode ? range.intersectsNode(n) : true) {
                // intersectsNode is true for the boundary nodes that sit just
                // outside a zero-width touch, so confirm with a real comparison.
                var r = doc.createRange();
                r.selectNodeContents(n);
                if (range.compareBoundaryPoints(Range.END_TO_START, r) < 0 &&
                    range.compareBoundaryPoints(Range.START_TO_END, r) > 0) {
                    nodes.push(n);
                }
            }
        }
        return nodes;
    }

    obj.Apply = function (mode) {
        mode = String(mode || "upper").toLowerCase();
        var doc = getDoc();
        var sel;
        try { sel = editor.getSelection(); } catch (e) { return false; }
        if (!doc || !sel || sel.rangeCount === 0) return false;

        var range = sel.getRangeAt(0);
        if (range.collapsed && !expandToWord(range)) return false;

        var nodes = textNodesInRange(range, doc);
        if (!nodes.length) return false;

        // Join -> transform -> write back, so context-sensitive modes see the
        // whole selection rather than one <strong>'s worth of it.
        var joined = "";
        for (var i = 0; i < nodes.length; i++) joined += nodes[i].nodeValue;
        var result = transform(joined, mode);
        if (result === joined) return false;
        // Defensive: every mode is length-preserving, but if a future mode is
        // not, bail rather than corrupt the document by mis-slicing.
        if (result.length !== joined.length) return false;

        var at = 0;
        for (var j = 0; j < nodes.length; j++) {
            var len = nodes[j].nodeValue.length;
            nodes[j].nodeValue = result.substr(at, len);
            at += len;
        }

        // Restore the selection over the transformed run.
        try {
            var r2 = doc.createRange();
            r2.setStart(nodes[0], 0);
            r2.setEnd(nodes[nodes.length - 1], nodes[nodes.length - 1].nodeValue.length);
            sel.removeAllRanges();
            sel.addRange(r2);
        } catch (e) {}

        fireChange();
        return true;
    };

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }
}
