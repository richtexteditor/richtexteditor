if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-17 Multi-level / legal list numbering. Turns an ordered list into
// legal-style hierarchical numbering — 1, 1.1, 1.1.1 — the numbering contracts,
// specifications, statutes and policy documents are written in.
//
// CKEditor sells this as a premium "Multi-level list" feature; TinyMCE, Froala,
// Tiptap, Lexical and Quill ship nothing equivalent.
//
// Implementation is CSS counters, not rewritten text:
//   - the numbering is produced by counters(rte-legal, ".") on ::before, so the
//     document keeps clean semantic <ol>/<li> markup with no injected number
//     text to fall out of sync when items are added, removed or re-ordered
//   - the only thing stored is one class on the root <ol>, which IS content (a
//     deliberate formatting choice) and so is meant to persist in saved HTML
//   - because it is real CSS, the browser print pipeline renders it, which means
//     html2pdf and Print preview reproduce the numbering
//
// The matching stylesheet is injected into the editor document at runtime and is
// also exposed as editor.getLegalListCss() so hosts can drop the same rules into
// their public page, their print stylesheet, or an export template.
RTE_DefaultConfig.plugin_multilevellist = RTE_Plugin_MultiLevelList;

// Class applied to the root <ol>. Kept configurable so a host with an existing
// convention (or a CSS-module build) can point it at their own class.
if (typeof RTE_DefaultConfig.legalListClass === "undefined") RTE_DefaultConfig.legalListClass = "rte-legal-list";
// Separator between levels: "1.1.1" (default) or e.g. ")" / "-".
if (typeof RTE_DefaultConfig.legalListSeparator === "undefined") RTE_DefaultConfig.legalListSeparator = ".";
// Trailing string after the last number: "1.1." vs "1.1)".
if (typeof RTE_DefaultConfig.legalListSuffix === "undefined") RTE_DefaultConfig.legalListSuffix = ".";

function RTE_Plugin_MultiLevelList() {
    var obj = this;
    var config, editor;
    var boundDoc = null;

    obj.PluginName = "MultiLevelList";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0);

        // Public API.
        editor.setLegalNumbering = function (on) { return applyToSelection(!!on); };
        editor.toggleLegalNumbering = function () { return applyToSelection(!isLegal(nearestRootList())); };
        editor.isLegalNumbering = function () { return isLegal(nearestRootList()); };
        editor.getLegalListCss = function () { return css(); };
    };

    function setup() {
        var doc = getDoc();
        if (doc && doc !== boundDoc) { injectStyles(doc); boundDoc = doc; }
        else if (doc) injectStyles(doc);
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    // ---- selection helpers ----------------------------------------------

    // The <ol> that owns the caret, walked up to the OUTERMOST list so the class
    // lands on the root — counters() needs a single root scope to number from.
    function nearestRootList() {
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            var editable = getEditable();
            var n = sel.getRangeAt(0).startContainer;
            if (n && n.nodeType === 3) n = n.parentNode;
            var root = null;
            while (n && n !== editable) {
                if (n.nodeName === "OL") root = n;   // keep climbing: last wins = outermost
                n = n.parentNode;
            }
            return root;
        } catch (e) { return null; }
    }

    function isLegal(ol) {
        return !!(ol && ol.classList && ol.classList.contains(config.legalListClass));
    }

    function applyToSelection(on) {
        var ol = nearestRootList();
        if (!ol) return false;
        if (on) ol.classList.add(config.legalListClass);
        else ol.classList.remove(config.legalListClass);
        // Let the host know the document changed so undo/save stay honest.
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { editor.fireEvent && editor.fireEvent("change"); } catch (e) {}
        return on;
    }

    // ---- styles ----------------------------------------------------------

    function css() {
        var cls = config.legalListClass;
        var sep = String(config.legalListSeparator || ".").replace(/"/g, '\\"');
        var suffix = String(config.legalListSuffix == null ? "." : config.legalListSuffix).replace(/"/g, '\\"');
        // One counter name, reset at every level; counters() joins the whole
        // ancestor chain, which is what yields 1 / 1.1 / 1.1.1 automatically.
        return (
            "ol." + cls + ",ol." + cls + " ol{counter-reset:rte-legal;list-style:none;}" +
            "ol." + cls + ">li,ol." + cls + " ol>li{counter-increment:rte-legal;position:relative;}" +
            // Hide any native marker that a UA or reset stylesheet still draws.
            "ol." + cls + ">li::marker,ol." + cls + " ol>li::marker{content:\"\";}" +
            "ol." + cls + ">li::before,ol." + cls + " ol>li::before{" +
            "content:counters(rte-legal,\"" + sep + "\")\"" + suffix + "\";" +
            "position:absolute;left:-3.2em;width:3em;text-align:right;" +
            "font-variant-numeric:tabular-nums;}" +
            // Room for the widest marker; nested levels indent further.
            "ol." + cls + "{padding-left:3.6em;}" +
            "ol." + cls + " ol{padding-left:3.2em;margin-top:.25em;}"
        );
    }

    function injectStyles(doc) {
        if (!doc) return;
        var existing = doc.getElementById("rte-legal-list-styles");
        var text = css();
        if (existing) {
            // Config can change at runtime (separator/suffix) — keep it current.
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        var st = doc.createElement("style");
        st.id = "rte-legal-list-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
