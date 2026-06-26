if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-04 Modern block types: callout / multi-column / toggle.
// Closes the Tier-1 competitive gaps vs Notion / Google Docs / CKEditor:
// admonition callouts, multi-column layouts, and collapsible toggle blocks.
// Each block is editor-native HTML (no server), round-trips through
// getHTMLCode/getJSON, and is insertable via toolbar command + slash menu.
RTE_DefaultConfig.plugin_blocktypes = RTE_Plugin_BlockTypes;

// Callout variants: id -> { label, icon }. Customizable via config.calloutTypes.
RTE_DefaultConfig.calloutTypes = RTE_DefaultConfig.calloutTypes || [
    { id: "info", label: "Info", icon: "ℹ️" },       // ℹ️
    { id: "success", label: "Success", icon: "✅" },       // ✅
    { id: "warning", label: "Warning", icon: "⚠️" }, // ⚠️
    { id: "danger", label: "Danger", icon: "⛔" },         // ⛔
    { id: "note", label: "Note", icon: "📝" }        // 📝
];
RTE_DefaultConfig.calloutDefaultType = RTE_DefaultConfig.calloutDefaultType || "info";
RTE_DefaultConfig.columnsDefaultCount = RTE_DefaultConfig.columnsDefaultCount || 2;

function RTE_Plugin_BlockTypes() {
    var obj = this;
    var config;
    var editor;

    obj.PluginName = "BlockTypes";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_insertcallout", function (state, cmd, value) {
            state.returnValue = true;
            obj.InsertCallout(value);
        });
        editor.attachEvent("exec_command_insertcolumns", function (state, cmd, value) {
            state.returnValue = true;
            obj.InsertColumns(value);
        });
        editor.attachEvent("exec_command_inserttoggle", function (state) {
            state.returnValue = true;
            obj.InsertToggle();
        });

        injectStyles();
    };

    function esc(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function calloutTypeById(id) {
        var types = config.calloutTypes || [];
        for (var i = 0; i < types.length; i++) {
            if (types[i].id === id) return types[i];
        }
        return types[0] || { id: "info", label: "Info", icon: "ℹ️" };
    }

    // --- Insertion -------------------------------------------------------

    obj.InsertCallout = function (typeId) {
        var t = calloutTypeById(typeId || config.calloutDefaultType);
        var bodyText = editor.getLangText ? (editor.getLangText("calloutplaceholder") || "Callout text") : "Callout text";
        var html =
            '<div class="rte-callout rte-callout-' + esc(t.id) + '" data-rte-block="callout" data-rte-callout-type="' + esc(t.id) + '">' +
            '<div class="rte-callout-icon" contenteditable="false" data-rte-callout-icon="1">' + t.icon + '</div>' +
            '<div class="rte-callout-body"><p>' + esc(bodyText) + '</p></div>' +
            '</div><p><br></p>';
        insertBlockHtml(html, "rte-callout-body");
    };

    obj.InsertColumns = function (count) {
        count = parseInt(count, 10) || config.columnsDefaultCount || 2;
        if (count < 2) count = 2;
        if (count > 4) count = 4;
        var cols = "";
        var label = editor.getLangText ? (editor.getLangText("columnplaceholder") || "Column") : "Column";
        for (var i = 0; i < count; i++) {
            cols += '<div class="rte-column"><p>' + esc(label) + " " + (i + 1) + "</p></div>";
        }
        var html =
            '<div class="rte-columns rte-columns-' + count + '" data-rte-block="columns" data-rte-columns="' + count + '">' +
            cols + "</div><p><br></p>";
        insertBlockHtml(html, "rte-column");
    };

    obj.InsertToggle = function () {
        var summary = editor.getLangText ? (editor.getLangText("toggleplaceholder") || "Toggle title") : "Toggle title";
        var body = editor.getLangText ? (editor.getLangText("togglebodyplaceholder") || "Hidden content") : "Hidden content";
        var html =
            '<details class="rte-toggle" data-rte-block="toggle" open>' +
            '<summary class="rte-toggle-summary">' + esc(summary) + "</summary>" +
            '<div class="rte-toggle-body"><p>' + esc(body) + "</p></div>" +
            "</details><p><br></p>";
        insertBlockHtml(html, "rte-toggle-summary");
    };

    // Insert block HTML, then try to move the caret into the first editable
    // region (matched by class) so the user can type immediately.
    function insertBlockHtml(html, focusClass) {
        // 2026-06-04 Ensure styles are present BEFORE the block becomes visible.
        // The InitEditor-time injection can no-op if the iframe document's
        // <head> isn't ready yet at plugin-init; injecting here (idempotent,
        // guarded by the data-attr check) guarantees the block is styled the
        // moment it's inserted. Caught by visual verification — without this
        // the blocks rendered unstyled (transparent callouts, block-display
        // columns instead of flex).
        injectStyles();
        editor.insertHTML(html);
        try {
            var editdoc = editor.getDocument();
            var editable = editor.getEditable();
            var targets = editable.getElementsByClassName(focusClass);
            if (targets && targets.length) {
                var target = targets[targets.length - 1]; // the one we just inserted
                var caretNode = target.querySelector("p") || target;
                var range = editdoc.createRange();
                range.selectNodeContents(caretNode);
                range.collapse(true);
                var sel = editor.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        } catch (e) { /* caret best-effort */ }
        editor.focus();
    }

    // --- Styles ----------------------------------------------------------

    function injectStyles() {
        var css = [
            // Callouts
            ".rte-callout{display:flex;gap:10px;align-items:flex-start;margin:12px 0;padding:12px 14px;border-radius:8px;border:1px solid rgba(15,23,42,.12);border-left-width:4px;background:#f8fafc}",
            ".rte-callout-icon{flex:0 0 auto;font-size:18px;line-height:1.4;user-select:none}",
            ".rte-callout-body{flex:1;min-width:0}",
            ".rte-callout-body > :first-child{margin-top:0}",
            ".rte-callout-body > :last-child{margin-bottom:0}",
            ".rte-callout-info{border-left-color:#2563eb;background:#eff6ff}",
            ".rte-callout-success{border-left-color:#16a34a;background:#f0fdf4}",
            ".rte-callout-warning{border-left-color:#d97706;background:#fffbeb}",
            ".rte-callout-danger{border-left-color:#dc2626;background:#fef2f2}",
            ".rte-callout-note{border-left-color:#7c3aed;background:#faf5ff}",
            // Columns
            ".rte-columns{display:flex;gap:16px;margin:12px 0;align-items:stretch}",
            ".rte-column{flex:1 1 0;min-width:0;padding:8px 10px;border:1px dashed rgba(15,23,42,.15);border-radius:6px}",
            ".rte-column > :first-child{margin-top:0}",
            ".rte-column > :last-child{margin-bottom:0}",
            // Toggle
            ".rte-toggle{margin:12px 0;border:1px solid rgba(15,23,42,.12);border-radius:8px;padding:6px 12px;background:#fafbff}",
            ".rte-toggle > summary{cursor:pointer;font-weight:600;outline:none;list-style:revert;padding:4px 0}",
            ".rte-toggle-body{padding:4px 0 4px 16px}",
            ".rte-toggle-body > :first-child{margin-top:0}",
            ".rte-toggle-body > :last-child{margin-bottom:0}",
            // Responsive: stack columns on narrow editors
            "@media (max-width:640px){.rte-columns{flex-direction:column}}"
        ].join("\n");

        try {
            var editdoc = editor.getDocument();
            if (!editdoc) return;
            // <head> may not exist yet at plugin-init; fall back to documentElement.
            var head = editdoc.head || (editdoc.getElementsByTagName && editdoc.getElementsByTagName("head")[0]) || editdoc.documentElement;
            if (head && !editdoc.querySelector("style[data-rte-blocktypes]")) {
                var st = editdoc.createElement("style");
                st.setAttribute("data-rte-blocktypes", "1");
                st.textContent = css;
                head.appendChild(st);
            }
        } catch (e) { /* ignore */ }
    }
}
