if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Permanent pen. Turns on a fixed character format that applies to
// everything typed from then on, until switched off — the marker you pick up to
// annotate a document in a colour that is obviously not the original text.
//
// TinyMCE Permanent Pen: "This plugin is only available for paid TinyMCE
// subscriptions".
//
// Design notes:
//   - The pen writes into a span that it OWNS and keeps extending, rather than
//     re-wrapping every keystroke. Wrapping per character produces one span per
//     letter, which bloats the HTML and makes the text impossible to edit
//     sensibly afterwards.
//   - It re-arms on selection changes. Click somewhere else and keep typing and
//     the pen still applies, which is the entire point of "permanent" — but the
//     new run gets its own span rather than reaching back to the old one.
//   - Pen output is REAL CONTENT. Unlike the format painter's transient state,
//     annotations written with the pen are meant to persist in the saved HTML.
RTE_DefaultConfig.plugin_permanentpen = RTE_Plugin_PermanentPen;

// The format the pen writes. Any CSS the host wants; these are the properties a
// reviewer's marker usually needs.
if (typeof RTE_DefaultConfig.permanentPenStyle === "undefined") {
    RTE_DefaultConfig.permanentPenStyle = {
        "color": "#c81e1e",
        "font-weight": "700"
    };
}
// Class placed on every run the pen writes, so a host can style or find them.
if (typeof RTE_DefaultConfig.permanentPenClass === "undefined") RTE_DefaultConfig.permanentPenClass = "rte-pen";

function RTE_Plugin_PermanentPen() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var active = false;
    var currentRun = null;   // the span this pen stroke is currently extending

    obj.PluginName = "PermanentPen";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_permanentpen", function (state) {
            state.returnValue = true;
            obj.Toggle();
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0);

        // Public API.
        editor.setPermanentPen = function (on) { return apply(!!on); };
        editor.togglePermanentPen = function () { return apply(!active); };
        editor.isPermanentPenActive = function () { return active; };
        editor.setPermanentPenStyle = function (style) {
            if (style && typeof style === "object") { config.permanentPenStyle = style; currentRun = null; }
            return config.permanentPenStyle;
        };
        editor.getPermanentPenStyle = function () {
            var s = config.permanentPenStyle || {}, out = {};
            for (var k in s) if (s.hasOwnProperty(k)) out[k] = s[k];
            return out;
        };
    };

    function setup() {
        var doc = getDoc();
        if (!doc || doc === boundDoc) return;
        boundDoc = doc;
        var editable = getEditable();
        if (!editable) return;
        // beforeinput fires while the caret is still where the text will land,
        // which is when the run has to exist for the character to go into it.
        editable.addEventListener("beforeinput", onBeforeInput, true);
        // Moving the caret ends the current stroke: the next typing starts a new
        // run instead of teleporting text into the old one.
        editable.addEventListener("mouseup", function () { currentRun = null; });
        editable.addEventListener("keydown", function (e) {
            if (/^Arrow|^Home|^End|^Page/.test(e.key)) currentRun = null;
        });
        editable.addEventListener("blur", function () { currentRun = null; });
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function apply(on) {
        var wasActive = active;
        active = !!on;
        var editable = getEditable();
        if (editable && editable.classList) {
            if (active) editable.classList.add("rte-pen-active");
            else editable.classList.remove("rte-pen-active");
        }
        // Switching OFF has to move the caret out of the run. Typing continues
        // in whatever element the caret is in, so leaving it inside the styled
        // span means the pen visibly refuses to turn off — the user keeps typing
        // red text after pressing the button that was supposed to stop that.
        if (wasActive && !active) stepOutOfRun();
        currentRun = null;
        return active;
    }

    function stepOutOfRun() {
        var doc = getDoc();
        if (!doc) return;
        var sel;
        try { sel = editor.getSelection(); } catch (e) { return; }
        if (!sel || sel.rangeCount === 0) return;
        var run = closestPenRun(sel.getRangeAt(0).startContainer);
        if (!run || !run.parentNode) return;
        tidyRun(run);
        try {
            var r = doc.createRange();
            r.setStartAfter(run);
            r.collapse(true);
            sel.removeAllRanges();
            sel.addRange(r);
        } catch (e) {}
    }

    // The run is seeded with a zero-width space so the caret has somewhere to
    // live inside an otherwise empty inline element. Once the run has real text
    // that placeholder is just litter in the saved HTML, so drop it.
    function tidyRun(run) {
        if (!run) return;
        var text = run.textContent || "";
        if (text.replace(/​/g, "") === "") {
            // Nothing was ever typed: remove the empty run entirely.
            if (run.parentNode) run.parentNode.removeChild(run);
            return;
        }
        var walker = run.ownerDocument.createTreeWalker(run, 4 /* SHOW_TEXT */, null, false);
        var n;
        while ((n = walker.nextNode())) {
            if (n.nodeValue.indexOf("​") >= 0) n.nodeValue = n.nodeValue.replace(/​/g, "");
        }
    }

    function onBeforeInput(e) {
        if (!active) return;
        // Only ordinary typing. Deletions, formatting commands and paste keep
        // their normal behaviour — a pen that hijacked paste would be a menace.
        if (e.inputType && e.inputType !== "insertText" && e.inputType !== "insertCompositionText") return;

        var doc = getDoc();
        if (!doc) return;
        var sel;
        try { sel = editor.getSelection(); } catch (x) { return; }
        if (!sel || sel.rangeCount === 0) return;
        var range = sel.getRangeAt(0);
        if (!range.collapsed) return;    // replacing a selection: let it be

        // Already inside our current run — nothing to do, the character will
        // land in it naturally.
        if (currentRun && containsNode(currentRun, range.startContainer)) return;

        // Already inside an identically-styled pen run (e.g. the user clicked
        // back into an annotation): adopt it rather than nesting a new span.
        var existing = closestPenRun(range.startContainer);
        if (existing && sameStyle(existing)) { currentRun = existing; return; }

        var span = doc.createElement("span");
        span.className = String(config.permanentPenClass || "rte-pen");
        var style = config.permanentPenStyle || {};
        for (var k in style) if (style.hasOwnProperty(k)) span.style.setProperty(k, style[k]);
        // A zero-width space gives the caret something real to sit inside; an
        // empty inline element cannot hold a caret, so the first character would
        // land outside the span and the pen would appear not to work.
        span.appendChild(doc.createTextNode("​"));

        range.insertNode(span);
        var r = doc.createRange();
        r.setStart(span.firstChild, 1);      // after the ZWSP
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        currentRun = span;
    }

    function containsNode(root, node) {
        while (node) { if (node === root) return true; node = node.parentNode; }
        return false;
    }

    function closestPenRun(node) {
        var editable = getEditable();
        var cls = String(config.permanentPenClass || "rte-pen");
        var n = node && node.nodeType === 3 ? node.parentNode : node;
        while (n && n !== editable) {
            if (n.nodeType === 1 && n.classList && n.classList.contains(cls)) return n;
            n = n.parentNode;
        }
        return null;
    }

    function sameStyle(el) {
        var style = config.permanentPenStyle || {};
        for (var k in style) {
            if (!style.hasOwnProperty(k)) continue;
            if (el.style.getPropertyValue(k) !== String(style[k])) return false;
        }
        return true;
    }
}
