if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Autocorrect and typography. Fixes common typos as you type,
// capitalises the start of sentences, and turns typed approximations into the
// real characters — straight quotes into curly ones, -- into an em dash, ...
// into an ellipsis, (c) into (C).
//
// TinyMCE sells this as TWO premium plugins: Autocorrect ("This plugin is only
// available for paid TinyMCE subscriptions", typo correction + capitalisation)
// and a separate Advanced Typography plugin. CKEditor 5 does include automatic
// text transformation in its open-source core, so this is parity there rather
// than a gap — do not claim otherwise.
//
// Design notes:
//   - Corrections are made by rewriting the caret's TEXT NODE, never by DOM
//     surgery. Everything happens inside one node, so inline markup around the
//     word is untouched and the caret is trivially restorable by offset.
//   - Nothing fires inside <code>, <pre>, or any [data-rte-no-autocorrect]
//     subtree. Curling the quotes inside a code sample corrupts it, and that is
//     the single most damaging thing a feature like this can do.
//   - Pressing Backspace immediately after a correction reverts it and leaves
//     what you actually typed, the way Word and Docs behave. Without an escape
//     hatch, autocorrect fights users who meant the thing it "fixed".
RTE_DefaultConfig.plugin_autocorrect = RTE_Plugin_Autocorrect;

if (typeof RTE_DefaultConfig.autocorrectEnabled === "undefined") RTE_DefaultConfig.autocorrectEnabled = true;
// Capitalise the first letter of a sentence.
if (typeof RTE_DefaultConfig.autocorrectCapitalize === "undefined") RTE_DefaultConfig.autocorrectCapitalize = true;
// Smart quotes, dashes, ellipsis, symbol and fraction substitutions.
if (typeof RTE_DefaultConfig.autocorrectTypography === "undefined") RTE_DefaultConfig.autocorrectTypography = true;
// Fix common misspellings from the table below.
if (typeof RTE_DefaultConfig.autocorrectSpelling === "undefined") RTE_DefaultConfig.autocorrectSpelling = true;
// Extra or overriding word replacements: { "recieve": "receive" }. Merged over
// the defaults, so a host can also DISABLE one by mapping it to itself.
if (typeof RTE_DefaultConfig.autocorrectReplacements === "undefined") RTE_DefaultConfig.autocorrectReplacements = null;

function RTE_Plugin_Autocorrect() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var enabled = true;
    var lastFix = null;   // {node, start, typed, fixed} for the Backspace escape hatch

    // Deliberately conservative. Every entry here must be a string that is never
    // a word a user could legitimately want: "ill", "lets", "its" and "hes" are
    // all excluded for that reason, even though they are frequent typos of
    // "I'll", "let's", "it's" and "he's" — guessing wrong on a real word is far
    // more annoying than missing a correction.
    var DEFAULT_WORDS = {
        "teh": "the", "adn": "and", "taht": "that", "thier": "their", "freind": "friend",
        "recieve": "receive", "recieved": "received", "seperate": "separate",
        "seperated": "separated", "occured": "occurred", "occuring": "occurring",
        "definately": "definitely", "accomodate": "accommodate", "acommodate": "accommodate",
        "wich": "which", "becuase": "because", "beacuse": "because", "becasue": "because",
        "arguement": "argument", "existance": "existence", "maintainance": "maintenance",
        "neccessary": "necessary", "necessery": "necessary", "occassion": "occasion",
        "publically": "publicly", "reccommend": "recommend", "refered": "referred",
        "relevent": "relevant", "succesful": "successful", "successfull": "successful",
        "untill": "until", "wierd": "weird", "acheive": "achieve", "beleive": "believe",
        "concious": "conscious", "embarass": "embarrass", "goverment": "government",
        "independant": "independent", "occurence": "occurrence", "perseverence": "perseverance",
        "priviledge": "privilege", "supercede": "supersede", "threshhold": "threshold",
        "tommorow": "tomorrow", "tomorow": "tomorrow", "truely": "truly",
        "alot": "a lot", "infront": "in front", "inspite": "in spite",
        "dont": "don't", "doesnt": "doesn't", "didnt": "didn't", "cant": "can't",
        "isnt": "isn't", "wasnt": "wasn't", "arent": "aren't", "werent": "weren't",
        "havent": "haven't", "hasnt": "hasn't", "hadnt": "hadn't",
        "couldnt": "couldn't", "shouldnt": "shouldn't", "wouldnt": "wouldn't",
        "youre": "you're", "theyre": "they're", "wouldve": "would've",
        "couldve": "could've", "shouldve": "should've",
        "i": "I", "im": "I'm", "ive": "I've", "id": "I'd"
    };

    // Multi-character sequences replaced the moment they are completed.
    var SEQUENCES = [
        { from: "...", to: "…" },        // ellipsis
        { from: "-->", to: "⟶" },        // long right arrow
        { from: "->", to: "→" },
        { from: "<-", to: "←" },
        { from: "<=", to: "≤" },
        { from: ">=", to: "≥" },
        { from: "!=", to: "≠" },
        { from: "(c)", to: "©" },
        { from: "(r)", to: "®" },
        { from: "(tm)", to: "™" },
        { from: "1/2", to: "½" },
        { from: "1/4", to: "¼" },
        { from: "3/4", to: "¾" },
        { from: "+-", to: "±" }
    ];

    obj.PluginName = "Autocorrect";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        enabled = config.autocorrectEnabled !== false;
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0);

        editor.setAutocorrectEnabled = function (on) { enabled = !!on; return enabled; };
        editor.isAutocorrectEnabled = function () { return enabled; };
        editor.addAutocorrectRule = function (from, to) {
            if (!from) return false;
            words()[String(from).toLowerCase()] = String(to);
            return true;
        };
        editor.getAutocorrectRules = function () {
            var w = words(), out = {};
            for (var k in w) if (w.hasOwnProperty(k)) out[k] = w[k];
            return out;
        };
        // Exposed mainly so a host can run the same normalisation over pasted or
        // imported text rather than only over live typing.
        editor.applyTypography = function (text) { return typographyPass(String(text)); };
    };

    var wordTable = null;
    function words() {
        if (wordTable) return wordTable;
        wordTable = {};
        for (var k in DEFAULT_WORDS) if (DEFAULT_WORDS.hasOwnProperty(k)) wordTable[k] = DEFAULT_WORDS[k];
        var extra = config.autocorrectReplacements;
        if (extra) for (var j in extra) if (extra.hasOwnProperty(j)) wordTable[String(j).toLowerCase()] = extra[j];
        return wordTable;
    }

    function setup() {
        var doc = getDoc();
        if (!doc || doc === boundDoc) return;
        boundDoc = doc;
        var editable = getEditable();
        if (!editable) return;
        editable.addEventListener("input", onInput);
        editable.addEventListener("keydown", onKeyDown, true);
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    // ---- guards ----------------------------------------------------------

    // Code is the one place these substitutions are actively destructive.
    function inProtectedContext(node) {
        var editable = getEditable();
        var n = node && node.nodeType === 3 ? node.parentNode : node;
        while (n && n !== editable) {
            var name = n.nodeName;
            if (name === "CODE" || name === "PRE" || name === "KBD" || name === "SAMP" || name === "VAR") return true;
            if (n.getAttribute && n.getAttribute("data-rte-no-autocorrect") !== null &&
                n.getAttribute("data-rte-no-autocorrect") !== "false") return true;
            n = n.parentNode;
        }
        return false;
    }

    function caret() {
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            var r = sel.getRangeAt(0);
            if (!r.collapsed) return null;                 // only while typing
            if (!r.startContainer || r.startContainer.nodeType !== 3) return null;
            return { node: r.startContainer, offset: r.startOffset };
        } catch (e) { return null; }
    }

    function setCaret(node, offset) {
        try {
            var doc = getDoc();
            var r = doc.createRange();
            var max = node.nodeValue.length;
            r.setStart(node, Math.max(0, Math.min(offset, max)));
            r.collapse(true);
            var sel = editor.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
        } catch (e) {}
    }

    // ---- the Backspace escape hatch --------------------------------------

    function onKeyDown(e) {
        if (e.key !== "Backspace" || !lastFix) return;
        var c = caret();
        if (!c || c.node !== lastFix.node) { lastFix = null; return; }
        // Only when the caret is still exactly where the correction left it —
        // NOT start+fixed.length, because a word correction fires on the boundary
        // character, which is already sitting after the replaced range.
        if (c.offset !== lastFix.caretAfter) { lastFix = null; return; }
        var text = c.node.nodeValue;
        c.node.nodeValue = text.slice(0, lastFix.start) + lastFix.typed +
            text.slice(lastFix.start + lastFix.fixed.length);
        setCaret(c.node, lastFix.start + lastFix.typed.length + (lastFix.tail || 0));
        lastFix = null;
        e.preventDefault();
        e.stopPropagation();
    }

    // ---- main ------------------------------------------------------------

    function onInput(e) {
        if (!enabled) return;
        var ch = e && typeof e.data === "string" ? e.data : null;
        if (!ch) return;                       // deletion, paste, composition end
        var c = caret();
        if (!c) return;
        if (inProtectedContext(c.node)) return;

        if (config.autocorrectTypography !== false && applyInline(c, ch)) return;
        if (isBoundary(ch)) applyWordRules(c, ch);
    }

    function isBoundary(ch) {
        return ch === " " || ch === " " || ".,;:!?)]}\"'’”".indexOf(ch) >= 0;
    }

    // Substitutions that resolve as soon as the triggering character lands.
    function applyInline(c, ch) {
        var text = c.node.nodeValue;
        var at = c.offset;

        // Straight quote -> curly. Direction depends on what precedes it: after
        // whitespace or an opening bracket it opens, otherwise it closes.
        if (ch === '"' || ch === "'") {
            var prev = at >= 2 ? text.charAt(at - 2) : "";
            var opening = !prev || /[\s(\[{—–\-]/.test(prev);
            var repl = ch === '"' ? (opening ? "“" : "”") : (opening ? "‘" : "’");
            return replaceRange(c, at - 1, at, repl, ch);
        }

        // Em dash from "--", in both the tight form ("word--word") and the
        // spaced one ("word -- word"), which is how most people actually type it.
        // Both require real text to the left, so a "-- item" list marker at the
        // start of a line and a "--flag" are left alone.
        if (ch === "-" && at >= 2 && text.charAt(at - 2) === "-") {
            var before = at >= 3 ? text.charAt(at - 3) : "";
            var ok = /[\w\)\]"'’]/.test(before);
            if (!ok && /\s/.test(before)) ok = /[\w\)\]"'’]\s*$/.test(text.slice(0, at - 3));
            if (ok) return replaceRange(c, at - 2, at, "—", "--");
        }

        for (var i = 0; i < SEQUENCES.length; i++) {
            var s = SEQUENCES[i];
            if (s.from.charAt(s.from.length - 1) !== ch) continue;
            var start = at - s.from.length;
            if (start < 0) continue;
            if (text.substring(start, at).toLowerCase() !== s.from) continue;
            // A fraction or arrow glued to a word is probably not one.
            if (/^\d/.test(s.from) && start > 0 && /[\w.]/.test(text.charAt(start - 1))) continue;
            return replaceRange(c, start, at, s.to, s.from);
        }
        return false;
    }

    // Rules that need a completed word: spelling and sentence capitalisation.
    function applyWordRules(c, ch) {
        var text = c.node.nodeValue;
        var end = c.offset - 1;               // the boundary char we just typed
        var start = end;
        while (start > 0 && /[A-Za-z'’]/.test(text.charAt(start - 1))) start--;
        if (start === end) return;
        var word = text.substring(start, end);

        // Spelling THEN capitalisation, applied in sequence to the same word.
        // Treating them as alternatives means "teh cat" opening a sentence comes
        // out as "the cat" — the typo fixed but the sentence left lowercase.
        var fixed = word;
        if (config.autocorrectSpelling !== false) {
            var hit = words()[fixed.toLowerCase()];
            if (hit) fixed = matchCase(fixed, hit);
            // The table stores plain apostrophes so it stays easy to extend, but
            // typing ' produces a curly one — emit the same character here or
            // "don't" ends up with a different apostrophe than "it's".
            if (config.autocorrectTypography !== false) fixed = fixed.replace(/'/g, "’");
        }
        if (config.autocorrectCapitalize !== false && startsSentence(text, start, c.node)) {
            var first = fixed.charAt(0);
            if (first !== first.toUpperCase()) fixed = first.toUpperCase() + fixed.substring(1);
        }
        if (fixed === word) return;
        replaceRange(c, start, end, fixed, word);
    }

    // "teh" -> "the", "Teh" -> "The", "TEH" -> "THE".
    function matchCase(typed, fixed) {
        if (typed === typed.toUpperCase() && typed.length > 1) return fixed.toUpperCase();
        if (typed.charAt(0) === typed.charAt(0).toUpperCase()) {
            return fixed.charAt(0).toUpperCase() + fixed.substring(1);
        }
        return fixed;
    }

    function startsSentence(text, start, node) {
        for (var i = start - 1; i >= 0; i--) {
            var ch = text.charAt(i);
            if (/\s/.test(ch)) continue;
            if (ch === '"' || ch === "'" || ch === "“" || ch === "‘" || ch === "(") continue;
            return ".!?".indexOf(ch) >= 0;
        }
        // Nothing before it in this node: only a sentence start if nothing
        // precedes the node in its block either.
        return !hasTextBefore(node);
    }

    function hasTextBefore(node) {
        var editable = getEditable();
        var n = node;
        while (n && n !== editable) {
            var sib = n.previousSibling;
            while (sib) {
                if ((sib.textContent || "").trim()) return true;
                sib = sib.previousSibling;
            }
            n = n.parentNode;
            // Stop at the block: a new paragraph starts a new sentence.
            if (n && /^(P|LI|TD|TH|H[1-6]|BLOCKQUOTE|DIV)$/.test(n.nodeName)) return false;
        }
        return false;
    }

    function replaceRange(c, start, end, replacement, typed) {
        var node = c.node;
        var text = node.nodeValue;
        // Characters already typed after the range being replaced — for a word
        // rule this is the boundary character (usually a space), because the
        // boundary is what triggered the correction in the first place.
        var tail = c.offset - end;
        node.nodeValue = text.slice(0, start) + replacement + text.slice(end);
        var caretAfter = start + replacement.length + tail;
        setCaret(node, caretAfter);
        lastFix = { node: node, start: start, typed: typed, fixed: replacement, caretAfter: caretAfter, tail: tail };
        return true;
    }

    // Standalone typography pass, for pasted or imported text.
    function typographyPass(text) {
        var out = text;
        for (var i = 0; i < SEQUENCES.length; i++) {
            out = out.split(SEQUENCES[i].from).join(SEQUENCES[i].to);
        }
        out = out.replace(/(^|[\s(\[{])"/g, "$1“").replace(/"/g, "”");
        out = out.replace(/(^|[\s(\[{])'/g, "$1‘").replace(/'/g, "’");
        out = out.replace(/(\w)--(\w)/g, "$1—$2");
        out = out.replace(/(\w)\s--\s(\w)/g, "$1 — $2");
        return out;
    }
}
