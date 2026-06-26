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
