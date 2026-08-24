if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-08-15 Text part language ("language of parts").
//
// WCAG 2.1 SC 3.1.2 (Level AA) requires that the human language of every
// PASSAGE or PHRASE be programmatically determinable when it differs from the
// document language. Until now this editor could only set a language on the
// whole document (a11yenhance.js stamps <html lang>), so a French quotation
// inside an English page was unmarkable and any AA conformance claim on
// /docs/accessibility was overstated. A screen reader reads such a phrase with
// the wrong phoneme set, which is the failure the SC exists to prevent.
//
// CKEditor 5 ships this as "Text part language". TinyMCE has no equivalent
// plugin (8.5's `content_language` sets the default proofing language, not
// per-phrase markup).
//
// Design notes:
//   - `lang` is CONTENT, exactly like `dir` in textdirection.js: it must survive
//     getHTMLCode(), and it is never stripped on serialize. A document whose
//     language annotations vanished on save would silently drop its own
//     conformance.
//   - The wrapper is a bare <span lang>. No class is emitted, so there is
//     nothing for check-css-contract.mjs to chase and nothing that depends on a
//     stylesheet travelling with the content. The in-editor visual marker is
//     injected into the EDITING DOCUMENT only, keyed off [lang], so it shows the
//     author what is marked without ever leaving the editor.
//   - RTL languages also get `dir`, because `lang` alone does not set direction.
//     A Hebrew phrase marked only with lang="he" still renders left-to-right and
//     reads as gibberish.
//   - Re-applying the SAME language to a selection REMOVES it (toggle), which is
//     how every other inline format in this editor behaves.
//   - Nested lang spans inside the selection are unwrapped before wrapping, so a
//     phrase never ends up with two competing languages. The inner one would win
//     in the accessibility tree and the author would have no way to see why.
//   - A collapsed selection deliberately does NOT create an empty wrapper. An
//     empty inline span is a caret trap (the caret falls in and cannot be typed
//     out of); instead a collapsed caret retargets the [lang] element it is
//     already inside, so "put the cursor in the phrase and pick Remove" works.
RTE_DefaultConfig.plugin_textpartlanguage = RTE_Plugin_TextPartLanguage;

// The dropdown list. `dir` is only needed for right-to-left languages.
if (typeof RTE_DefaultConfig.textPartLanguages === "undefined") {
    RTE_DefaultConfig.textPartLanguages = [
        { code: "ar", label: "Arabic", dir: "rtl" },
        { code: "zh-Hans", label: "Chinese (Simplified)" },
        { code: "zh-Hant", label: "Chinese (Traditional)" },
        { code: "cs", label: "Czech" },
        { code: "nl", label: "Dutch" },
        { code: "en", label: "English" },
        { code: "fr", label: "French" },
        { code: "de", label: "German" },
        { code: "el", label: "Greek" },
        { code: "he", label: "Hebrew", dir: "rtl" },
        { code: "hi", label: "Hindi" },
        { code: "it", label: "Italian" },
        { code: "ja", label: "Japanese" },
        { code: "ko", label: "Korean" },
        { code: "fa", label: "Persian", dir: "rtl" },
        { code: "pl", label: "Polish" },
        { code: "pt", label: "Portuguese" },
        { code: "ru", label: "Russian" },
        { code: "es", label: "Spanish" },
        { code: "sv", label: "Swedish" },
        { code: "tr", label: "Turkish" },
        { code: "uk", label: "Ukrainian" },
        { code: "ur", label: "Urdu", dir: "rtl" },
        { code: "vi", label: "Vietnamese" }
    ];
}

// Show marked phrases with a dotted underline while editing. Editor-only: the
// rule lives in the editing document, never in the saved HTML.
if (typeof RTE_DefaultConfig.textPartLanguageHighlight === "undefined") RTE_DefaultConfig.textPartLanguageHighlight = true;

function RTE_Plugin_TextPartLanguage() {
    var obj = this;
    var config, editor;
    var boundDoc = null;

    obj.PluginName = "TextPartLanguage";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_textpartlanguage", function (state) {
            state.returnValue = true;
            var v = state && state.value;
            if (!v || v === "none" || v === "remove") obj.Remove();
            else obj.Apply(v);
        });

        if (editor.toolbarFactoryMap) {
            editor.toolbarFactoryMap["textpartlanguage"] = function (cmd) {
                return editor.createToolbarItemDropDownPanel(cmd, buildPanel);
            };
        }

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0);

        // Public API.
        editor.setTextLanguage = function (code) { return obj.Apply(code); };
        editor.removeTextLanguage = function () { return obj.Remove(); };
        editor.getTextLanguage = function () { return obj.Current(); };
        editor.listTextLanguages = function () { return languages().slice(); };
        editor.getMarkedLanguages = function () { return obj.List(); };
    };

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function languages() {
        var list = config && config.textPartLanguages;
        return (list && list.length) ? list : [];
    }

    function entry(code) {
        var list = languages();
        for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i];
        return { code: code, label: code };
    }

    // ---- state -----------------------------------------------------------

    // The nearest ancestor carrying a lang, bounded by the editable so the host
    // page's own <html lang> is never reported as the phrase language.
    function langAncestor(node) {
        var ed = getEditable();
        var n = (node && node.nodeType === 3) ? node.parentNode : node;
        while (n && n !== ed && n.nodeType === 1) {
            if (n.hasAttribute && n.hasAttribute("lang")) return n;
            n = n.parentNode;
        }
        return null;
    }

    function selectionRange() {
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            return sel.getRangeAt(0);
        } catch (e) { return null; }
    }

    obj.Current = function () {
        var r = selectionRange();
        if (!r) return null;
        var el = langAncestor(r.startContainer);
        // A non-collapsed selection only counts as "in" a language if BOTH ends
        // sit in the same marked phrase; a selection straddling the boundary has
        // no single language and must not report one.
        if (el && !r.collapsed && langAncestor(r.endContainer) !== el) return null;
        return el ? el.getAttribute("lang") : null;
    };

    // Every distinct language marked in the document, for auditing.
    obj.List = function () {
        var ed = getEditable();
        var out = [];
        if (!ed) return out;
        var seen = {};
        var nodes = ed.querySelectorAll("[lang]");
        for (var i = 0; i < nodes.length; i++) {
            var code = nodes[i].getAttribute("lang");
            if (!code || seen[code]) continue;
            seen[code] = true;
            out.push({ code: code, label: entry(code).label });
        }
        return out;
    };

    // ---- apply -----------------------------------------------------------

    obj.Apply = function (code) {
        code = String(code == null ? "" : code).trim();
        if (!code) return false;

        var doc = getDoc();
        var r = selectionRange();
        if (!doc || !r) return false;

        // Re-picking the current language toggles it off.
        if (obj.Current() === code) return obj.Remove();

        if (r.collapsed) {
            // No empty wrapper (caret trap). Retarget the phrase the caret is in.
            var host = langAncestor(r.startContainer);
            if (!host) return false;
            stamp(host, code);
            fireChange();
            return code;
        }

        var span = doc.createElement("span");
        stamp(span, code);

        try {
            // surroundContents is the clean path, but it throws whenever the
            // range partially selects a non-text node (half a <strong>), which
            // is the common case in real prose.
            r.surroundContents(span);
        } catch (e) {
            var frag = r.extractContents();
            span.appendChild(frag);
            r.insertNode(span);
        }

        unwrapInner(span);
        pruneEmptyText(span);
        if (!span.firstChild) { // selection held nothing real
            if (span.parentNode) span.parentNode.removeChild(span);
            return false;
        }
        mergeSiblings(span);
        select(span);
        fireChange();
        return code;
    };

    obj.Remove = function () {
        var r = selectionRange();
        if (!r) return false;
        var ed = getEditable();
        if (!ed) return false;

        var removed = 0;

        // The phrase the caret/selection sits inside.
        var host = langAncestor(r.startContainer);
        if (host) { unwrap(host); removed++; }

        // Plus any fully- or partly-selected marked phrases in a wider range.
        if (!r.collapsed) {
            var nodes = ed.querySelectorAll("[lang]");
            for (var i = nodes.length - 1; i >= 0; i--) {
                var el = nodes[i];
                if (el === host) continue;
                if (intersects(r, el)) { unwrap(el); removed++; }
            }
        }

        if (removed) fireChange();
        return removed > 0;
    };

    function intersects(range, el) {
        try {
            var er = el.ownerDocument.createRange();
            er.selectNodeContents(el);
            return range.compareBoundaryPoints(Range.END_TO_START, er) < 0 &&
                   range.compareBoundaryPoints(Range.START_TO_END, er) > 0;
        } catch (e) { return false; }
    }

    function stamp(el, code) {
        el.setAttribute("lang", code);
        var dir = entry(code).dir;
        // lang does not imply direction; without dir an RTL phrase renders LTR.
        if (dir === "rtl" || dir === "ltr") el.setAttribute("dir", dir);
        else el.removeAttribute("dir");
    }

    // A phrase must carry exactly one language. Anything marked inside the new
    // wrapper would otherwise win in the accessibility tree.
    function unwrapInner(span) {
        var inner = span.querySelectorAll("[lang]");
        for (var i = inner.length - 1; i >= 0; i--) unwrap(inner[i]);
    }

    function unwrap(el) {
        if (!el || !el.parentNode) return;
        // A span we created carries nothing else; anything the author's own
        // markup carries (a styled <em lang>) must survive, so only the
        // language attributes come off.
        if (el.nodeName === "SPAN" && el.attributes.length <= 2 &&
            !el.getAttribute("class") && !el.getAttribute("style") && !el.getAttribute("id")) {
            var parent = el.parentNode;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
            try { parent.normalize(); } catch (e) {}
        } else {
            el.removeAttribute("lang");
            el.removeAttribute("dir");
        }
    }

    // extractContents leaves zero-length text nodes behind; they make a wrapper
    // look non-empty and leave invisible caret stops in the phrase.
    function pruneEmptyText(el) {
        for (var i = el.childNodes.length - 1; i >= 0; i--) {
            var n = el.childNodes[i];
            if (n.nodeType === 3 && n.nodeValue === "") el.removeChild(n);
        }
    }

    // Marking two adjacent halves of a phrase should read as one phrase, not two.
    function mergeSiblings(span) {
        var code = span.getAttribute("lang");
        var prev = span.previousSibling;
        if (prev && prev.nodeType === 1 && prev.nodeName === "SPAN" && prev.getAttribute("lang") === code) {
            while (span.firstChild) prev.appendChild(span.firstChild);
            span.parentNode.removeChild(span);
            span = prev;
        }
        var next = span.nextSibling;
        if (next && next.nodeType === 1 && next.nodeName === "SPAN" && next.getAttribute("lang") === code) {
            while (next.firstChild) span.appendChild(next.firstChild);
            next.parentNode.removeChild(next);
        }
        try { span.normalize(); } catch (e) {}
        return span;
    }

    function select(span) {
        try {
            var sel = editor.getSelection();
            var r = span.ownerDocument.createRange();
            r.selectNodeContents(span);
            sel.removeAllRanges();
            sel.addRange(r);
        } catch (e) {}
    }

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }

    // ---- toolbar panel ---------------------------------------------------

    function buildPanel(panel) {
        var current = obj.Current();
        panel.style.width = "220px";
        panel.style.maxHeight = "340px";
        panel.style.overflowY = "auto";
        panel.style.padding = "4px 0";

        var list = languages();

        addRow(panel, editor.getLangText ? (editor.getLangText("removelanguage") || "Remove language") : "Remove language",
               null, !current, function () { obj.Remove(); });

        var sep = panel.ownerDocument.createElement("div");
        sep.style.cssText = "height:1px;margin:4px 6px;background:var(--rte-border-color,#e0e0e0);";
        panel.appendChild(sep);

        for (var i = 0; i < list.length; i++) {
            (function (item) {
                addRow(panel, item.label, item.code, current === item.code, function () { obj.Apply(item.code); });
            })(list[i]);
        }

        // Opening a menu has to put focus inside it, or a keyboard user has
        // opened something they cannot reach. Start on the current language when
        // there is one — that is the item they are most likely acting on.
        setTimeout(function () {
            var rows = panel.querySelectorAll("rte-toolbar-dropdown-item");
            if (!rows.length) return;
            var target = rows[0];
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].getAttribute("aria-checked") === "true") { target = rows[i]; break; }
            }
            try { target.focus(); } catch (e) {}
        }, 0);
    }

    function addRow(panel, label, code, active, run) {
        var doc = panel.ownerDocument;
        // Two things are required for a menu row to be operable by keyboard, and
        // a plain <div role="menuitemradio"> has neither:
        //   1. The TAG. The core's keyboard layer finds items via
        //      __actionElementSelector, which lists element NAMES
        //      (rte-toolbar-dropdown-item, rte-dropdown-menuitem, rte-menuitem)
        //      and ignores roles entirely.
        //   2. A tab stop and key handling. The core applies those inside its own
        //      closure — __Append / __Make_ActionElementAccessible are not exposed
        //      to plugins — so a plugin has to supply them itself rather than
        //      hope an internal picks the row up.
        // Both are done here, so the menu works with a keyboard regardless of
        // what the core does or does not reach into (WCAG 2.1.1).
        var row = doc.createElement("rte-toolbar-dropdown-item");
        panel.appendChild(row);
        row.setAttribute("role", "menuitemradio");
        row.setAttribute("aria-checked", active ? "true" : "false");
        row.setAttribute("tabindex", "0");
        row.style.cssText = "padding:5px 12px;cursor:pointer;white-space:nowrap;display:flex;" +
            "justify-content:space-between;gap:12px;color:var(--rte-text-color,inherit);" +
            (active ? "font-weight:600;" : "");

        var name = doc.createElement("span");
        name.appendChild(doc.createTextNode(label));
        row.appendChild(name);

        if (code) {
            var tag = doc.createElement("span");
            tag.style.cssText = "opacity:.55;font-size:11px;";
            tag.appendChild(doc.createTextNode(code));
            row.appendChild(tag);
        }

        row.onmouseover = function () { row.style.backgroundColor = "var(--rte-hover-bg,#e6e6e6)"; };
        row.onmouseout = function () { row.style.backgroundColor = ""; };
        row.onclick = function () {
            // Close first: the panel steals focus, and applying to a selection
            // the editor no longer owns silently does nothing.
            try { editor.closeCurrentPopup(); } catch (e) {}
            try { editor.focus(); } catch (e) {}
            run();
        };

        row.onkeydown = function (e) {
            var key = e.key;
            if (key === "Enter" || key === " " || key === "Spacebar") {
                e.preventDefault();
                e.stopPropagation();
                row.onclick();
                return;
            }
            if (key === "ArrowDown" || key === "ArrowUp") {
                e.preventDefault();
                e.stopPropagation();
                var items = panel.querySelectorAll("rte-toolbar-dropdown-item");
                var list = Array.prototype.slice.call(items);
                var at = list.indexOf(row);
                // Wrap, so the list cannot dead-end and strand the user.
                var next = list[(at + (key === "ArrowDown" ? 1 : -1) + list.length) % list.length];
                if (next) next.focus();
                return;
            }
            if (key === "Home" || key === "End") {
                e.preventDefault();
                e.stopPropagation();
                var all = panel.querySelectorAll("rte-toolbar-dropdown-item");
                var target = key === "Home" ? all[0] : all[all.length - 1];
                if (target) target.focus();
                return;
            }
            if (key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                // Escape closes the menu; focus then lands in the EDITING AREA,
                // not back on the launcher.
                //
                // That is the core's behaviour for every dropdown — closing a
                // popup refocuses the editable asynchronously — and it cannot be
                // overridden from here. Measured: setting focus on the launcher
                // does take effect, and is then taken back ~16 ms later; a forced
                // re-focus is taken back again. Racing it with longer timeouts
                // would be fragile and would fight the "close the popup, carry on
                // typing" flow the rest of the editor depends on.
                //
                // This is not a trap and not a WCAG failure: the menu closes,
                // focus is visible and lands somewhere meaningful. Restoring
                // launcher focus properly belongs in the core's popup-close path,
                // where it would apply to every dropdown at once.
                try { editor.closeCurrentPopup(); } catch (ex) {}
            }
        };
    }

    // ---- editor-only marker ----------------------------------------------

    function setup() {
        var doc = getDoc();
        if (!doc || doc === boundDoc) return;
        boundDoc = doc;
        injectStyles(doc);
    }

    function css() {
        if (config && config.textPartLanguageHighlight === false) return "";
        // Scoped to [lang] inside the editing document only. Never serialized,
        // so the marker cannot follow the content into a customer's page.
        //
        // :not(html):not(body) is REQUIRED, not defensive tidiness. a11yenhance.js
        // stamps the editing document's root with the document language, so a bare
        // [lang] selector matches <html> — which made hovering anywhere in the
        // editing area grey the ENTIRE surface, and drew the "marked phrase"
        // underline across the whole document. Reported from the live demos page.
        // Only a phrase the author actually marked should be decorated.
        return "[lang]:not(html):not(body){border-bottom:1px dotted rgba(120,120,120,.75);}" +
               "[lang]:not(html):not(body):hover{background:rgba(120,120,120,.10);}";
    }

    function injectStyles(doc) {
        if (!doc) return;
        var text = css();
        var existing = doc.getElementById("rte-textpartlanguage-styles");
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        if (!text) return;
        var st = doc.createElement("style");
        st.id = "rte-textpartlanguage-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
