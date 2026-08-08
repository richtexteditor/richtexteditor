if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Format painter. Pick up the character formatting at the caret and
// paint it onto another selection — the Word/Docs clipboard-brush interaction.
//
// Premium in both majors:
//   - CKEditor 5 format painter: "Unlock this feature with selected CKEditor Plans".
//   - TinyMCE formatpainter: "This plugin is only available for paid TinyMCE
//     subscriptions".
//
// Design notes:
//   - Formatting is captured from the COMPUTED style, not from the tag soup, so
//     it works the same whether the source was <b>, <strong>, style="font-weight:700"
//     or a class — which is the whole point of a painter.
//   - Painting wraps the target in one <span> and then strips the character
//     formatting already inside it. Without that strip the paint silently loses:
//     a descendant <strong> beats an ancestor span's font-weight:normal, so
//     "paint unbold onto bold text" would do nothing.
//   - Sticky mode (paint repeatedly until cancelled) mirrors double-clicking the
//     brush in Word. Escape cancels, as it does there.
RTE_DefaultConfig.plugin_formatpainter = RTE_Plugin_FormatPainter;

// The character-formatting properties the brush carries. Deliberately excludes
// block-level properties (alignment, margins, line-height): a painter that moved
// those would reflow the document, which is not what users expect from it.
if (typeof RTE_DefaultConfig.formatPainterProperties === "undefined") {
    RTE_DefaultConfig.formatPainterProperties = [
        "font-family", "font-size", "font-weight", "font-style",
        "text-decoration-line", "color", "background-color",
        "letter-spacing", "text-transform", "font-variant"
    ];
}

function RTE_Plugin_FormatPainter() {
    var obj = this;
    var config, editor;
    var captured = null;   // {props:{...}} or null
    var sticky = false;
    var boundDoc = null;

    // Character-level tags that must be unwrapped inside a painted region,
    // because their UA styling outranks the wrapper span.
    var CHAR_TAGS = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, FONT: 1, BIG: 1, SMALL: 1 };

    obj.PluginName = "FormatPainter";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_formatpainter", function (state) {
            state.returnValue = true;
            obj.Toggle();
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0);

        // Public API.
        editor.copyFormatting = function () { return obj.Copy(); };
        editor.pasteFormatting = function () { return obj.Paint(); };
        editor.toggleFormatPainter = function (isSticky) { return obj.Toggle(isSticky); };
        editor.cancelFormatPainter = function () { return obj.Cancel(); };
        editor.isFormatPainterActive = function () { return !!captured; };
        editor.getCapturedFormatting = function () { return captured ? cloneProps(captured.props) : null; };
    };

    function setup() {
        var doc = getDoc();
        if (!doc) return;
        injectStyles(doc);
        if (doc === boundDoc) return;
        boundDoc = doc;
        var editable = getEditable();
        if (!editable) return;
        // Mouse-up rather than click: the selection is final by then, and click
        // fires before the browser has settled a drag-selection.
        editable.addEventListener("mouseup", function () {
            if (!captured) return;
            setTimeout(function () { if (captured) obj.Paint(); }, 0);
        });
        editable.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && captured) { obj.Cancel(); e.preventDefault(); }
        });
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function cloneProps(p) { var o = {}; for (var k in p) if (p.hasOwnProperty(k)) o[k] = p[k]; return o; }

    // ---- capture ---------------------------------------------------------

    function selectionElement() {
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            var n = sel.getRangeAt(0).startContainer;
            if (n && n.nodeType === 3) n = n.parentNode;
            return n && n.nodeType === 1 ? n : null;
        } catch (e) { return null; }
    }

    obj.Copy = function () {
        var el = selectionElement();
        var doc = getDoc();
        if (!el || !doc) return null;
        var view = doc.defaultView || window;
        var cs = view.getComputedStyle(el);
        // Diff against the editable root rather than recording the whole computed
        // style. Everything the source merely INHERITED (the body font stack,
        // letter-spacing:normal, text-transform:none...) is identical at the root,
        // so this drops it and the painted span carries only the formatting the
        // user can actually see. Without the diff every paint emits a ~250-char
        // style attribute of defaults, which is exactly the markup bloat this
        // product sells against.
        var baseEl = getEditable();
        var base = baseEl ? view.getComputedStyle(baseEl) : null;
        var props = {};
        var list = config.formatPainterProperties || [];
        for (var i = 0; i < list.length; i++) {
            var name = list[i];
            var v = cs.getPropertyValue(name);
            if (!v) continue;
            if (base && v === base.getPropertyValue(name)) continue;
            props[name] = v;
        }
        // A transparent background is the default, not a formatting choice —
        // carrying it would wipe highlights on every paint.
        if (props["background-color"] && /^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/.test(props["background-color"])) {
            delete props["background-color"];
        }
        captured = { props: props };
        setBrushState(true);
        return cloneProps(props);
    };

    // ---- paint -----------------------------------------------------------

    obj.Paint = function () {
        if (!captured) return false;
        var doc = getDoc();
        var sel;
        try { sel = editor.getSelection(); } catch (e) { return false; }
        if (!doc || !sel || sel.rangeCount === 0) return false;
        if (sel.getRangeAt(0).collapsed) return false;   // nothing selected: wait for one

        var span = doc.createElement("span");
        span.className = "rte-painted";
        var props = captured.props;
        for (var k in props) if (props.hasOwnProperty(k)) span.style.setProperty(k, props[k]);

        var placed = null;
        try { placed = editor.surroundElement(span); } catch (e) { placed = null; }
        if (!placed) return false;

        // Strip the FULL configured property list, not just the captured subset.
        // Copy() only keeps properties that differ from the root, so painting
        // "no bold" captures no font-weight at all — but a descendant carrying
        // style="font-weight:700" still has to go, or the paint does nothing.
        stripInnerFormatting(placed, config.formatPainterProperties || []);
        collapseRedundantAncestors(placed);

        if (!sticky) obj.Cancel();
        fireChange();
        return true;
    };

    // Remove the character formatting already inside the painted region so the
    // wrapper actually wins. Both halves matter: inline style properties on
    // descendants beat the ancestor by specificity, and <b>/<i>/<font> beat it
    // by UA stylesheet.
    function stripInnerFormatting(root, propNames) {
        var els = root.getElementsByTagName("*");
        // Live HTMLCollection + unwrapping = skipped nodes; snapshot first.
        var all = Array.prototype.slice.call(els);
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (el.style) {
                for (var p = 0; p < propNames.length; p++) el.style.removeProperty(propNames[p]);
                // Legacy shorthands the loop above cannot see.
                el.style.removeProperty("font");
                el.style.removeProperty("text-decoration");
            }
            if (el.nodeName === "FONT") {
                el.removeAttribute("color"); el.removeAttribute("face"); el.removeAttribute("size");
            }
        }
        for (var j = 0; j < all.length; j++) {
            var e2 = all[j];
            if (CHAR_TAGS[e2.nodeName] && e2.parentNode) unwrap(e2);
        }
        tidy(root);
    }

    // Stripping properties leaves behind style="" and spans that no longer carry
    // anything. Left in place they accumulate on every repaint, so the "clean
    // HTML" the product promises would erode one brush stroke at a time.
    function tidy(root) {
        var all = Array.prototype.slice.call(root.getElementsByTagName("*"));
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (el.getAttribute && el.getAttribute("style") === "") el.removeAttribute("style");
            // A wrapper from an EARLIER paint that now sits inside this one is
            // superseded by definition — its properties were just stripped. Left
            // alone, painting the same run N times nests N wrappers.
            if (el.nodeName === "SPAN" && el.classList && el.classList.contains("rte-painted") && el.parentNode) {
                unwrap(el);
                continue;
            }
            if (el.nodeName === "SPAN" && !el.attributes.length && el.parentNode) unwrap(el);
        }
        if (root.getAttribute && root.getAttribute("style") === "") root.removeAttribute("style");
    }

    function unwrap(el) {
        var parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    }

    // Repainting a run that was already painted puts the new wrapper INSIDE the
    // old one, because surroundElement only ever wraps the extracted selection —
    // so the stale wrapper is an ANCESTOR and tidy(), which walks descendants,
    // cannot see it. Paint the same words five times and you get five nested
    // spans. Only collapse a parent that wraps nothing but us: if it has other
    // children, its formatting still belongs to them.
    function collapseRedundantAncestors(span) {
        for (var guard = 0; guard < 32; guard++) {
            var p = span.parentNode;
            if (!p || p.nodeType !== 1) return;
            if (p.nodeName !== "SPAN") return;
            if (!p.classList || !p.classList.contains("rte-painted")) return;
            if (!wrapsNothingElse(p, span)) return;
            unwrap(p);
        }
    }

    // NOT childNodes.length === 1: Range.extractContents() leaves zero-length
    // text nodes on both sides of the extraction point, so the stale wrapper
    // reads as having three children when it really holds only the new span.
    // Counting those as content made the collapse above silently never fire.
    function wrapsNothingElse(parent, child) {
        for (var i = 0; i < parent.childNodes.length; i++) {
            var n = parent.childNodes[i];
            if (n === child) continue;
            if (n.nodeType === 3 && n.nodeValue.length === 0) continue;
            return false;
        }
        return true;
    }

    // ---- brush state -----------------------------------------------------

    obj.Toggle = function (isSticky) {
        sticky = !!isSticky;
        if (captured) { obj.Cancel(); return false; }
        obj.Copy();
        return !!captured;
    };

    obj.Cancel = function () {
        captured = null;
        sticky = false;
        setBrushState(false);
        return true;
    };

    // A cursor change is the only affordance the user gets that the brush is
    // loaded, so it is worth doing properly rather than leaving it invisible.
    function setBrushState(on) {
        var editable = getEditable();
        if (!editable || !editable.classList) return;
        if (on) editable.classList.add("rte-format-painting");
        else editable.classList.remove("rte-format-painting");
    }

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }

    function css() {
        return ".rte-format-painting,.rte-format-painting *{cursor:copy !important;}";
    }

    function injectStyles(doc) {
        if (!doc) return;
        if (doc.getElementById("rte-format-painter-styles")) return;
        var st = doc.createElement("style");
        st.id = "rte-format-painter-styles";
        st.appendChild(doc.createTextNode(css()));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
