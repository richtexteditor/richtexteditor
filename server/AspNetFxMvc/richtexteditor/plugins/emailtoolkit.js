if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-04 Email toolkit. Closes the CKEditor "email / inline-style export"
// gap. Email clients (Outlook, Gmail) strip <style> blocks, external CSS, and
// class attributes — so HTML email must carry style="" inline on every element.
// editor.getEmailHTML() walks the live editor content, copies a curated set of
// computed styles onto each element as inline styles, removes class/id, and
// (optionally) wraps the result in a centered max-width table for client compat.
RTE_DefaultConfig.plugin_emailtoolkit = RTE_Plugin_EmailToolkit;
// Curated whitelist of email-relevant CSS properties (kept small to avoid bloat).
RTE_DefaultConfig.emailInlineProperties = RTE_DefaultConfig.emailInlineProperties || [
    "color", "background-color", "font-family", "font-size", "font-weight",
    "font-style", "text-decoration", "text-align", "line-height",
    "margin-top", "margin-bottom", "margin-left", "margin-right",
    "padding-top", "padding-bottom", "padding-left", "padding-right",
    "border", "border-radius", "vertical-align", "list-style-type", "width"
];
RTE_DefaultConfig.emailWrapWidth = RTE_DefaultConfig.emailWrapWidth || 640;

function RTE_Plugin_EmailToolkit() {
    var obj = this;
    var config, editor;

    obj.PluginName = "EmailToolkit";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        // Public API.
        editor.getEmailHTML = function (options) { return obj.BuildEmailHTML(options || {}); };
        editor.attachEvent("exec_command_emailexport", function (state) { state.returnValue = true; obj.OpenEmailExport(); });
    };

    function append(parent, tag, cssText, className) {
        var el = parent.ownerDocument.createElement(tag);
        if (cssText) el.style.cssText = cssText;
        if (className) el.className = className;
        parent.appendChild(el);
        return el;
    }

    // Values we treat as "default" and skip to keep the output lean.
    function isDefaultValue(prop, val) {
        if (!val) return true;
        var v = val.trim().toLowerCase();
        if (v === "normal" || v === "auto" || v === "none" || v === "0px" || v === "0") {
            // Keep list-style-type:none (meaningful), drop the rest at default.
            if (prop === "list-style-type" && v === "none") return false;
            return true;
        }
        if (prop === "background-color" && (v === "rgba(0, 0, 0, 0)" || v === "transparent")) return true;
        if (prop === "color" && v === "rgb(0, 0, 0)") return false; // keep explicit black text
        if (prop === "text-decoration" && v.indexOf("none") === 0) return true;
        if (prop === "border" && (v.indexOf("0px") === 0 || v.indexOf("none") !== -1 && v.indexOf("0px") !== -1)) return true;
        if (prop === "vertical-align" && v === "baseline") return true;
        if (prop === "font-weight" && v === "400") return true;
        if (prop === "font-style" && v === "normal") return true;
        // start/left are the default flow direction; "start" is poorly supported in Outlook.
        if (prop === "text-align" && (v === "start" || v === "left")) return true;
        return false;
    }

    // Tags where list-style-type is meaningful; emitting "disc" on a <p>/<span> is bloat.
    var LIST_TAGS = { UL: 1, OL: 1, LI: 1 };

    // Build an inline style string for a live element from its computed style.
    function inlineStyleFor(el, win) {
        var cs = win.getComputedStyle(el);
        var props = config.emailInlineProperties || [];
        var out = [];
        for (var i = 0; i < props.length; i++) {
            var p = props[i];
            var v;
            try { v = cs.getPropertyValue(p); } catch (e) { v = ""; }
            if (v == null || v === "") continue;
            if (isDefaultValue(p, v)) continue;
            // width only on tables/images (avoid forcing widths on every block).
            if (p === "width" && el.nodeName !== "TABLE" && el.nodeName !== "IMG" && el.nodeName !== "TD" && el.nodeName !== "TH") continue;
            // list-style-type only on list elements (else "disc" bloats every <p>/<span>).
            if (p === "list-style-type" && !LIST_TAGS[el.nodeName]) continue;
            out.push(p + ":" + v);
        }
        return out.join(";");
    }

    var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1 };

    // Recursively clone a live element into an inlined-style clone.
    function cloneInlined(src, win) {
        if (src.nodeType === 3) return src.ownerDocument.createTextNode(src.data); // text
        if (src.nodeType !== 1) return null;
        if (SKIP_TAGS[src.nodeName]) return null;
        var doc = src.ownerDocument;
        var clone = doc.createElement(src.nodeName);
        // Copy semantic attributes (href/src/alt/colspan/etc.) but NOT class/id/contenteditable.
        for (var a = 0; a < src.attributes.length; a++) {
            var at = src.attributes[a];
            var n = at.name.toLowerCase();
            if (n === "class" || n === "id" || n === "contenteditable" || n === "style" || n.indexOf("data-rte-") === 0) continue;
            clone.setAttribute(at.name, at.value);
        }
        var inline = inlineStyleFor(src, win);
        if (inline) clone.setAttribute("style", inline);
        for (var c = 0; c < src.childNodes.length; c++) {
            var child = cloneInlined(src.childNodes[c], win);
            if (child) clone.appendChild(child);
        }
        return clone;
    }

    obj.BuildEmailHTML = function (options) {
        var editable = editor.getEditable();
        var editdoc = editor.getDocument();
        var win = (editdoc && editdoc.defaultView) || window;
        var container = editdoc.createElement("div");
        for (var i = 0; i < editable.childNodes.length; i++) {
            var c = cloneInlined(editable.childNodes[i], win);
            if (c) container.appendChild(c);
        }
        var inner = container.innerHTML;
        var wrap = options.wrap !== false;
        if (!wrap) return inner;
        var width = options.width || config.emailWrapWidth || 640;
        // Center the content in an email-safe table.
        return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">' +
            '<tr><td align="center" style="padding:0">' +
            '<table role="presentation" width="' + width + '" cellpadding="0" cellspacing="0" style="border-collapse:collapse;max-width:' + width + 'px;width:100%">' +
            '<tr><td style="padding:16px;font-family:Arial,Helvetica,sans-serif">' + inner + '</td></tr></table>' +
            '</td></tr></table>';
    };

    obj.OpenEmailExport = function () {
        var html = obj.BuildEmailHTML({});
        var dlg = editor.createDialog((editor.getLangText && editor.getLangText("emailexporttitle")) || "Export email HTML", "rte-dialog-email");
        var close = typeof dlg.close === "function" ? function () { dlg.close(); } : function () { editor.closeCurrentPopup(); };
        var wrap = append(dlg, "div", "", "rte-email-export");
        append(wrap, "div", "", "rte-email-export-copy").innerText =
            "Inline-styled HTML for email clients (class/style blocks resolved to inline styles). Copy and paste into your email tool.";
        var ta = append(wrap, "textarea", "", "rte-email-export-code");
        ta.value = html;
        ta.readOnly = true;
        ta.setAttribute("aria-label", "Inline-styled email HTML");
        var status = append(wrap, "div", "", "rte-email-export-status");
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        status.textContent = "Ready to copy " + html.length + " characters.";
        var foot = append(wrap, "div", "", "rte-email-export-footer");
        var copyBtn = append(foot, "button", "", "rte-email-export-button rte-email-export-button-primary");
        copyBtn.type = "button"; copyBtn.textContent = "Copy";
        copyBtn.onclick = function () {
            ta.select();
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(ta.value); }
                else { dlg.ownerDocument.execCommand("copy"); }
                copyBtn.textContent = "Copied";
                status.textContent = "Copied email HTML to the clipboard.";
                setTimeout(function () { copyBtn.textContent = "Copy"; status.textContent = "Ready to copy " + html.length + " characters."; }, 1400);
            } catch (e) { /* ignore */ }
        };
        var closeBtn = append(foot, "button", "", "rte-email-export-button");
        closeBtn.type = "button"; closeBtn.textContent = "Close"; closeBtn.onclick = close;
        setTimeout(function () { ta.focus(); }, 0);
    };
}
