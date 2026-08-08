if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-31 Right-to-left EDITOR CHROME. textdirection.js flips the document;
// this flips the editor around it — toolbar, dropdowns, menus, dialogs — so an
// Arabic or Hebrew user is not typing right-to-left text inside a left-to-right
// application.
//
// Deliberately a plugin rather than an edit to rte_theme_default.css:
//   - the theme is 146 KB, shared by every tier, and cached behind a fixed
//     "?v=" query, so changing it means a cache-buster bump across the site
//   - LTR users get zero new CSS; every rule here is scoped under [dir="rtl"]
//   - it rides the existing plugin bundle, which is already audited for drift
//
// Why this is mostly small: the chrome is flexbox with NO floats, no
// text-align:left/right and no left:0/right:0 anchors, so `direction: rtl`
// reverses the layout on its own. What remains is the handful of PHYSICAL
// margins/paddings the theme still uses, which have to be mirrored by hand.
//
// Icons are deliberately NOT mirrored. Word does not flip its toolbar icons in
// RTL either: bold, italic and the alignment glyphs mean the same thing in both
// directions, and flipping them makes the toolbar harder to read, not easier.
// The only icons that SHOULD flip are the ones that encode reading order --
// indent/outdent and the menu disclosure arrow -- and those are handled below.
RTE_DefaultConfig.plugin_rtlui = RTE_Plugin_RtlUi;

// "auto"  = mirror when the document/base direction is RTL
// true    = always mirror | false = never
if (typeof RTE_DefaultConfig.rtlUserInterface === "undefined") RTE_DefaultConfig.rtlUserInterface = "auto";

function RTE_Plugin_RtlUi() {
    var obj = this;
    var config, editor;
    var applied = false;

    obj.PluginName = "RtlUi";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_rtlui", function (state) {
            state.returnValue = true;
            obj.Toggle();
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0);

        editor.setRtlUserInterface = function (on) { return apply(!!on); };
        editor.toggleRtlUserInterface = function () { return apply(!applied); };
        editor.isRtlUserInterface = function () { return applied; };
        editor.getRtlUiCss = function () { return css(); };
    };

    obj.Toggle = function () { return apply(!applied); };

    function setup() {
        injectStyles();
        if (config.rtlUserInterface === true) apply(true);
        else if (config.rtlUserInterface === false) apply(false);
        else apply(detect());
    }

    // "auto": follow the document's own direction.
    function detect() {
        try {
            if (typeof editor.getBaseDirection === "function" && editor.getBaseDirection() === "rtl") return true;
            var ed = editor.getEditable();
            if (ed) {
                var doc = ed.ownerDocument;
                var win = doc && (doc.defaultView || doc.parentWindow);
                if (win && win.getComputedStyle(ed).direction === "rtl") return true;
            }
        } catch (e) {}
        return false;
    }

    // The editor shell lives in the HOST document, not the editable iframe, so
    // the class and the stylesheet both belong there.
    function shell() {
        try {
            var ed = editor.getEditable();
            if (!ed) return null;
            // The iframe's frameElement walks us back out to the host page.
            var win = ed.ownerDocument.defaultView;
            var node = (win && win.frameElement) ? win.frameElement : ed;
            while (node && node.classList && !node.classList.contains("richtexteditor")) node = node.parentNode;
            return (node && node.classList) ? node : null;
        } catch (e) { return null; }
    }

    function apply(on) {
        var el = shell();
        // Set the flag only once the change has actually landed. Setting it
        // first meant isRtlUserInterface() reported success when the shell could
        // not be resolved (the editor not yet built, or a host that reparents
        // it) -- a state that reads as "mirrored" while nothing is mirrored.
        if (!el) return applied;
        if (on) el.setAttribute("dir", "rtl");
        else el.removeAttribute("dir");
        applied = !!on;
        return applied;
    }

    function css() {
        return [
            // Flexbox does the bulk of the work once direction is set.
            '.richtexteditor[dir="rtl"]{direction:rtl;}',
            // Menus and dropdown panels open from the correct edge.
            '.richtexteditor[dir="rtl"] rte-dropdown,',
            '.richtexteditor[dir="rtl"] rte-submenu,',
            '.richtexteditor[dir="rtl"] rte-floatpanel{direction:rtl;text-align:right;}',
            '.richtexteditor[dir="rtl"] rte-menuitem{flex-direction:row-reverse;}',
            // Mirror the theme's remaining PHYSICAL spacing.
            '.richtexteditor[dir="rtl"] rte-menutext{margin-left:0;margin-right:3px;}',
            '.richtexteditor[dir="rtl"] rte-menuarrow{margin-right:0;margin-left:4px;}',
            '.richtexteditor[dir="rtl"] rte-ribbon-group-right{margin-left:2px;margin-right:5px;}',
            '.richtexteditor[dir="rtl"] rte-toolbar-arrowbutton{padding-right:0;padding-left:12px;}',
            '.richtexteditor[dir="rtl"] rte-toolbar-dropdown-input{padding-left:0;padding-right:3px;}',
            '.richtexteditor[dir="rtl"] rte-dialog-line-target rte-dialog-input-label{padding-left:0;padding-right:20px;}',
            // margin-*:auto is a push-to-the-far-edge idiom; the edge changes.
            '.richtexteditor[dir="rtl"] .rte-find-replace-all{margin-left:0;margin-right:auto;}',
            '.richtexteditor[dir="rtl"] .rte-gallery-browser-footer-text{margin-right:0;margin-left:auto;}',
            // Status bar and tag list read from the right.
            '.richtexteditor[dir="rtl"] rte-bottom,',
            '.richtexteditor[dir="rtl"] rte-taglist,',
            '.richtexteditor[dir="rtl"] rte-textcounter{direction:rtl;}',
            // Resize grip moves to the opposite corner.
            '.richtexteditor[dir="rtl"] rte-resizecorner{transform:scaleX(-1);}',
            // ONLY the icons that encode reading order flip. Bold/italic/align
            // glyphs deliberately do not.
            '.richtexteditor[dir="rtl"] [class*="indent"] svg,',
            '.richtexteditor[dir="rtl"] [class*="outdent"] svg,',
            '.richtexteditor[dir="rtl"] rte-menuarrow svg{transform:scaleX(-1);}'
        ].join("\n");
    }

    function injectStyles() {
        // Host document: this styles the editor chrome, not the content.
        var doc = document;
        if (doc.getElementById("rte-rtl-ui-styles")) return;
        var st = doc.createElement("style");
        st.id = "rte-rtl-ui-styles";
        st.appendChild(doc.createTextNode(css()));
        (doc.head || doc.documentElement).appendChild(st);
    }
}
