if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-28 Formatting marks — Word's ¶ button. Shows paragraph marks, block
// outlines, tabs, line breaks and (the useful one) non-breaking and zero-width
// characters that are otherwise invisible and cause mysterious layout bugs.
//
// Positioning note: this is PARITY, not a gap win. TinyMCE ships `visualchars`
// and `visualblocks` in its FREE core, and CKEditor has show-blocks. Do not
// claim it as something competitors charge for.
//
// Design notes:
//   - Everything that can be done in CSS is done in CSS: pilcrows via ::after,
//     block outlines via outline. CSS cannot change the document, so those marks
//     are incapable of corrupting content no matter what the user does.
//   - Invisible CHARACTERS cannot be reached from CSS, so those get a wrapper
//     span — but every wrapper is stripped around serialize (the pagination.js
//     contract) and removed when the feature is switched off. A marking feature
//     that leaves debris in the saved HTML is worse than no marking feature.
RTE_DefaultConfig.plugin_formattingmarks = RTE_Plugin_FormattingMarks;

// Which marks to draw.
if (typeof RTE_DefaultConfig.formattingMarkPilcrow === "undefined") RTE_DefaultConfig.formattingMarkPilcrow = true;
if (typeof RTE_DefaultConfig.formattingMarkBlocks === "undefined") RTE_DefaultConfig.formattingMarkBlocks = true;
if (typeof RTE_DefaultConfig.formattingMarkInvisibles === "undefined") RTE_DefaultConfig.formattingMarkInvisibles = true;

function RTE_Plugin_FormattingMarks() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var active = false;
    var wrapped = false;
    var queued = false;

    // Characters that render as nothing (or as a normal space) but behave
    // differently. These are what people are actually hunting when they turn
    // formatting marks on after pasting from somewhere else.
    var INVISIBLES = [
        { ch: " ", cls: "rte-fm-nbsp",  label: "·" },   // non-breaking space
        { ch: "​", cls: "rte-fm-zwsp",  label: "␀" },   // zero-width space
        { ch: "‎", cls: "rte-fm-bidi",  label: "‎" },   // LTR mark
        { ch: "‏", cls: "rte-fm-bidi",  label: "‏" },   // RTL mark
        { ch: "­", cls: "rte-fm-shy",   label: "-" }         // soft hyphen
    ];

    obj.PluginName = "FormattingMarks";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_formattingmarks", function (state) {
            state.returnValue = true;
            obj.Toggle();
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", function () { setup(); if (active) queue(); }); } catch (e) {}
        setTimeout(setup, 0);

        editor.setFormattingMarks = function (on) { active = !!on; apply(); return active; };
        editor.toggleFormattingMarks = function () { return obj.Toggle(); };
        editor.isFormattingMarks = function () { return active; };
        editor.getFormattingMarksCss = function () { return css(); };
    };

    obj.Toggle = function () { active = !active; apply(); return active; };

    function setup() {
        var doc = getDoc();
        if (!doc) return;
        injectStyles(doc);
        wrapSerializers();
        if (doc === boundDoc) return;
        boundDoc = doc;
        var editable = getEditable();
        if (!editable) return;
        editable.addEventListener("keyup", function () { if (active) queue(); });
        editable.addEventListener("paste", function () { if (active) queue(); });
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function queue() {
        if (queued) return;
        queued = true;
        setTimeout(function () { queued = false; markInvisibles(); }, 0);
    }

    function apply() {
        var editable = getEditable();
        if (!editable) return;
        if (editable.classList) {
            editable.classList.toggle("rte-fm-on", active);
            editable.classList.toggle("rte-fm-pilcrow", active && config.formattingMarkPilcrow !== false);
            editable.classList.toggle("rte-fm-blocks", active && config.formattingMarkBlocks !== false);
        }
        if (active && config.formattingMarkInvisibles !== false) markInvisibles();
        else unmarkInvisibles();
    }

    // ---- invisible characters (the only part that touches the DOM) --------

    function unmarkInvisibles() {
        var editable = getEditable();
        if (!editable) return;
        var spans = editable.querySelectorAll("span[data-rte-fm]");
        for (var i = 0; i < spans.length; i++) {
            var s = spans[i];
            var parent = s.parentNode;
            if (!parent) continue;
            // Put the ORIGINAL character back, not the label glyph.
            parent.replaceChild(s.ownerDocument.createTextNode(s.getAttribute("data-rte-fm-char") || ""), s);
            parent.normalize();
        }
    }

    function markInvisibles() {
        var editable = getEditable();
        var doc = getDoc();
        if (!editable || !doc) return;
        unmarkInvisibles();

        var chars = {};
        for (var i = 0; i < INVISIBLES.length; i++) chars[INVISIBLES[i].ch] = INVISIBLES[i];

        // Collect first: splitting text nodes while walking invalidates the walk.
        var walker = doc.createTreeWalker(editable, 4 /* SHOW_TEXT */, null, false);
        var targets = [];
        var n;
        while ((n = walker.nextNode())) {
            if (!n.nodeValue) continue;
            for (var c = 0; c < INVISIBLES.length; c++) {
                if (n.nodeValue.indexOf(INVISIBLES[c].ch) >= 0) { targets.push(n); break; }
            }
        }

        for (var t = 0; t < targets.length; t++) wrapNode(doc, targets[t], chars);
    }

    function wrapNode(doc, node, chars) {
        var text = node.nodeValue;
        var parent = node.parentNode;
        if (!parent) return;
        // Never mark inside our own markers, or inside code where the character
        // may be deliberate.
        if (parent.nodeName === "CODE" || parent.nodeName === "PRE") return;

        var frag = doc.createDocumentFragment();
        var buf = "";
        for (var i = 0; i < text.length; i++) {
            var def = chars[text[i]];
            if (!def) { buf += text[i]; continue; }
            if (buf) { frag.appendChild(doc.createTextNode(buf)); buf = ""; }
            var span = doc.createElement("span");
            span.setAttribute("data-rte-fm", "1");
            span.setAttribute("data-rte-fm-char", text[i]);
            span.className = def.cls;
            span.setAttribute("contenteditable", "false");
            span.textContent = def.label;
            frag.appendChild(span);
        }
        if (buf) frag.appendChild(doc.createTextNode(buf));
        parent.replaceChild(frag, node);
    }

    // ---- serialization safety -------------------------------------------

    function stripFor() {
        var editable = getEditable();
        if (!editable) return function () {};
        var spans = Array.prototype.slice.call(editable.querySelectorAll("span[data-rte-fm]"));
        if (!spans.length) return function () {};
        var parked = [];
        for (var i = 0; i < spans.length; i++) {
            var s = spans[i];
            var textNode = s.ownerDocument.createTextNode(s.getAttribute("data-rte-fm-char") || "");
            parked.push({ span: s, parent: s.parentNode, text: textNode });
            if (s.parentNode) s.parentNode.replaceChild(textNode, s);
        }
        return function restore() {
            for (var j = 0; j < parked.length; j++) {
                var p = parked[j];
                if (p.text.parentNode) p.text.parentNode.replaceChild(p.span, p.text);
            }
        };
    }

    function wrapSerializers() {
        if (wrapped) return;
        var names = ["getHTMLCode", "getJSON", "getHTMLContent", "getText"];
        var did = false;
        for (var i = 0; i < names.length; i++) {
            (function (name) {
                var orig = editor[name];
                if (typeof orig !== "function" || orig.__rteFmWrapped) return;
                var w = function () {
                    var restore = stripFor();
                    try { return orig.apply(editor, arguments); } finally { restore(); }
                };
                w.__rteFmWrapped = true;
                editor[name] = w;
                did = true;
            })(names[i]);
        }
        if (did) wrapped = true;
    }

    // ---- styles ----------------------------------------------------------

    function css() {
        return (
            // Pilcrow at the end of every block, drawn by CSS so it can never
            // become part of the document.
            ".rte-fm-pilcrow p::after,.rte-fm-pilcrow h1::after,.rte-fm-pilcrow h2::after," +
            ".rte-fm-pilcrow h3::after,.rte-fm-pilcrow h4::after,.rte-fm-pilcrow h5::after," +
            ".rte-fm-pilcrow h6::after,.rte-fm-pilcrow li::after,.rte-fm-pilcrow blockquote::after" +
            "{content:'\\00b6';color:#9aa4b5;opacity:.65;font-weight:400;}" +
            ".rte-fm-blocks p,.rte-fm-blocks h1,.rte-fm-blocks h2,.rte-fm-blocks h3," +
            ".rte-fm-blocks h4,.rte-fm-blocks h5,.rte-fm-blocks h6,.rte-fm-blocks ul," +
            ".rte-fm-blocks ol,.rte-fm-blocks blockquote,.rte-fm-blocks table," +
            ".rte-fm-blocks div{outline:1px dashed rgba(120,140,170,.45);outline-offset:1px;}" +
            "span[data-rte-fm]{color:#c2410c;opacity:.75;user-select:none;}" +
            ".rte-fm-nbsp{background:rgba(194,65,12,.10);border-radius:2px;}" +
            ".rte-fm-zwsp,.rte-fm-shy,.rte-fm-bidi{background:rgba(194,65,12,.18);border-radius:2px;" +
            "font-size:.8em;vertical-align:middle;}"
        );
    }

    function injectStyles(doc) {
        if (!doc) return;
        var existing = doc.getElementById("rte-formatting-marks-styles");
        var text = css();
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        var st = doc.createElement("style");
        st.id = "rte-formatting-marks-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
