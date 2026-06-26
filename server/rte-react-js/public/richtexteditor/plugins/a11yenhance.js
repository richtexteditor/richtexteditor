if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-07 Accessibility enhancements. Adds the assistive-technology metadata
// an iframe-based editor needs but the core doesn't emit by default, closing the
// most common WCAG 2.2 findings for rich-text editors:
//   - WCAG 4.1.2 (Name, Role, Value) — the editing region gets an accessible
//     name (role="textbox" + aria-multiline + aria-label) and the editor iframe
//     gets a title, so screen readers announce "<label>, editing area" instead
//     of an unlabelled frame.
//   - WCAG 2.4.1 (Bypass Blocks) / 1.3.1 — the iframe title gives the frame a
//     landmark name in the SR rotor.
//   - WCAG 3.1.1 / 3.1.2 (Language) — the editing document gets a lang attribute
//     so content is read with the correct pronunciation rules.
//
// Configure with:
//   config.contentAriaLabel = "Article body. Rich text editor."   // editing area name
//   config.contentLang      = "en"                                  // BCP-47; defaults to page <html lang> or "en"
//   config.a11yEnhance      = false                                 // opt out
RTE_DefaultConfig.plugin_a11yenhance = RTE_Plugin_A11yEnhance;
if (typeof RTE_DefaultConfig.a11yEnhance === "undefined") RTE_DefaultConfig.a11yEnhance = true;

function RTE_Plugin_A11yEnhance() {
    var obj = this;
    var config, editor;

    obj.PluginName = "A11yEnhance";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.a11yEnhance === false) return;
        apply();
        // The editor recreates its document/body after init and on aftersethtml;
        // re-apply so the attributes survive every remount.
        try { editor.attachEvent("ready", apply); } catch (e) {}
        try { editor.attachEvent("aftersethtml", apply); } catch (e) {}
        setTimeout(apply, 0); setTimeout(apply, 200);
        editor.applyAccessibilityMetadata = apply;
    };

    function label() {
        return config.contentAriaLabel || config.contentLabel || "Rich text editor. Editing area.";
    }

    function lang() {
        if (config.contentLang) return config.contentLang;
        try {
            var hostLang = (config.container && config.container.ownerDocument &&
                config.container.ownerDocument.documentElement.getAttribute("lang"));
            if (hostLang) return hostLang;
        } catch (e) {}
        try {
            var d = (typeof document !== "undefined") && document.documentElement.getAttribute("lang");
            if (d) return d;
        } catch (e) {}
        return "en";
    }

    function apply() {
        var doc = editor.getDocument();
        if (!doc) return;

        // 1) Editing document language.
        try {
            var lg = lang();
            if (lg && doc.documentElement && doc.documentElement.getAttribute("lang") !== lg) {
                doc.documentElement.setAttribute("lang", lg);
            }
        } catch (e) {}

        // 2) Iframe frame title (the frame's accessible name in the SR rotor).
        try {
            var frame = doc.defaultView && doc.defaultView.frameElement;
            if (frame && !frame.getAttribute("title")) frame.setAttribute("title", label());
        } catch (e) {}

        // 3) Editing region name + role.
        try {
            var ed = editor.getEditable();
            if (ed && ed.nodeType === 1) {
                if (!ed.getAttribute("role")) ed.setAttribute("role", "textbox");
                if (!ed.getAttribute("aria-multiline")) ed.setAttribute("aria-multiline", "true");
                if (!ed.getAttribute("aria-label") && !ed.getAttribute("aria-labelledby")) {
                    ed.setAttribute("aria-label", label());
                }
            }
        } catch (e) {}
    }
}
