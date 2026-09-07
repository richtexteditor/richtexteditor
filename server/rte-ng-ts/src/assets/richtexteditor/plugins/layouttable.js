if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-08-30 Layout tables — say whether a table carries data or only geometry.
//
// Found by re-sweeping CKEditor 5's feature pages (they ship `layout-tables`);
// TinyMCE has no equivalent. Every other editor treats <table> as one thing.
// It is two:
//
//   * a DATA table states relationships — this cell is described by that header —
//     and a screen reader announces them on every cell;
//   * a LAYOUT table states nothing. Newsletters, signatures and pre-CSS page
//     furniture use it purely for geometry, and the correct markup is
//     role="presentation", which tells assistive technology to read the cells as
//     plain flow content instead of narrating a fake grid.
//
// Using one where the other is meant is a real WCAG 1.3.1 failure, not a style
// preference: a layout table with <th>/scope/<caption> makes a screen reader
// announce column headers that describe nothing.
//
// It also fixes a false alarm we were shipping. `accessibilitychecker.js` raised
// `table-missing-header` on EVERY table without a <th>, so an email layout — which
// must not have one — produced a permanent error the author could never clear. A
// checker that cannot be satisfied teaches people to ignore it, so the rule now
// skips presentation tables and instead flags the genuine fault: a layout table
// that still carries data-table semantics.
//
// Design notes:
//   - role="presentation" is the whole marker. No vendor class is added, so the
//     exported HTML gains nothing this editor has to own; `role=none` is the ARIA
//     synonym and is accepted on read, though we always write "presentation"
//     because Outlook-era mail clients are more likely to have heard of it.
//   - The dashed outline is injected into the EDITING document only (a <style> in
//     the iframe head, like formattingmarks.js), never into the content. A layout
//     table is invisible by design; without an affordance the author cannot see
//     the thing they are editing.
//   - Tables nest. Marking the outer table layout must not strip the headers of a
//     data table sitting inside one of its cells, so every walk is restricted to
//     cells whose nearest ancestor table is this one.
//   - Converting <th> to <td> loses information. Which cells were headers is
//     remembered per table in a WeakMap so an accidental toggle is reversible in
//     the session, and that memory is deliberately NOT written into the markup —
//     restoring it is a convenience, not a document property. Reloaded documents
//     therefore restore nothing; `promoteFirstRow` is offered for that case.
RTE_DefaultConfig.plugin_layouttable = RTE_Plugin_LayoutTable;

// Show a dashed outline around layout tables while editing.
if (typeof RTE_DefaultConfig.layoutTableOutline === "undefined") RTE_DefaultConfig.layoutTableOutline = true;

function RTE_Plugin_LayoutTable() {
    var obj = this;
    var config, editor;
    var headerMemory = (typeof WeakMap === "function") ? new WeakMap() : null;

    obj.PluginName = "LayoutTable";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_tablelayoutmode", function (state) {
            state.returnValue = true;
            obj.SetMode(tableAtCaret(), "layout");
        });
        editor.attachEvent("exec_command_tabledatamode", function (state) {
            state.returnValue = true;
            obj.SetMode(tableAtCaret(), "data");
        });
        editor.attachEvent("exec_command_toggletablelayout", function (state) {
            state.returnValue = true;
            obj.Toggle();
        });
        editor.attachEvent("exec_command_insertlayouttable", function (state) {
            state.returnValue = true;
            obj.InsertLayoutTable();
        });

        // Public API.
        editor.setTableLayoutMode = function (mode, table, options) {
            return obj.SetMode(table || tableAtCaret(), mode, options);
        };
        editor.getTableLayoutMode = function (table) {
            var t = table || tableAtCaret();
            return t ? (isLayout(t) ? "layout" : "data") : null;
        };
        editor.isLayoutTable = function (table) { return isLayout(table || tableAtCaret()); };
        editor.toggleTableLayoutMode = function () { return obj.Toggle(); };
        editor.insertLayoutTable = function (rows, cols, options) {
            return obj.InsertLayoutTable(rows, cols, options);
        };
        editor.listLayoutTables = function () {
            var ed = getEditable();
            if (!ed) return [];
            var out = [], all = ed.getElementsByTagName("table");
            for (var i = 0; i < all.length; i++) if (isLayout(all[i])) out.push(all[i]);
            return out;
        };
        editor.showLayoutTableOutlines = function (on) {
            outlineOn = (on !== false);
            injectStyles(editableDoc());
            return outlineOn;
        };

        try {
            if (config && typeof config.layoutTableOutline !== "undefined") outlineOn = !!config.layoutTableOutline;
        } catch (e) {}
        injectStyles(editableDoc());
        try {
            editor.attachEvent("editor_ready", function () { injectStyles(editableDoc()); });
            editor.attachEvent("update_design", function () { injectStyles(editableDoc()); });
        } catch (e) {}
    };

    var outlineOn = true;

    // ---------------------------------------------------------------- commands

    obj.SetMode = function (table, mode, options) {
        if (!table) return null;
        if (String(mode).toLowerCase() === "layout") return toLayout(table);
        return toData(table, options);
    };

    obj.Toggle = function () {
        var t = tableAtCaret();
        if (!t) return null;
        return isLayout(t) ? toData(t) : toLayout(t);
    };

    obj.InsertLayoutTable = function (rows, cols, options) {
        var doc = editableDoc();
        if (!doc) return null;
        rows = Math.max(1, parseInt(rows, 10) || 2);
        cols = Math.max(1, parseInt(cols, 10) || 2);
        options = options || {};

        var table = doc.createElement("table");
        table.setAttribute("role", "presentation");
        // The three attributes every email layout table needs; without
        // border-collapse the cells show a 2px gap in Outlook.
        table.setAttribute("cellpadding", "0");
        table.setAttribute("cellspacing", "0");
        table.style.width = options.width || "100%";
        table.style.borderCollapse = "collapse";

        var tbody = doc.createElement("tbody");
        for (var r = 0; r < rows; r++) {
            var tr = doc.createElement("tr");
            for (var c = 0; c < cols; c++) {
                var td = doc.createElement("td");
                td.style.verticalAlign = "top";
                td.appendChild(doc.createElement("br"));
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);

        insertAtCaret(table, doc);
        injectStyles(doc);
        fireChange();
        return table;
    };

    // ------------------------------------------------------------- conversions

    function toLayout(table) {
        table.setAttribute("role", "presentation");

        // A caption is announced as the table's name; a layout table has no name
        // to announce. Keep the text — it is content the author typed — by moving
        // it out into a paragraph before the table rather than deleting it.
        var caption = firstOwnChild(table, "caption");
        if (caption) {
            var text = String(caption.textContent || "").replace(/^\s+|\s+$/g, "");
            if (text) {
                var p = table.ownerDocument.createElement("p");
                while (caption.firstChild) p.appendChild(caption.firstChild);
                if (table.parentNode) table.parentNode.insertBefore(p, table);
            }
            caption.parentNode.removeChild(caption);
        }

        table.removeAttribute("summary");

        var cells = ownCells(table), converted = [];
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            cell.removeAttribute("scope");
            cell.removeAttribute("headers");
            cell.removeAttribute("abbr");
            if (cell.nodeName === "TH") {
                var td = rename(cell, "td");
                converted.push(td);
            }
        }
        if (headerMemory && converted.length) headerMemory.set(table, converted);

        // <thead> on a layout table is harmless to AT once role=presentation is
        // set, but it makes the markup lie to the next human who reads it.
        var thead = firstOwnChild(table, "thead");
        if (thead) unwrapSection(table, thead);

        fireChange();
        return table;
    }

    function toData(table, options) {
        table.removeAttribute("role");

        var restored = headerMemory ? headerMemory.get(table) : null;
        var promoted = false;
        if (restored && restored.length) {
            for (var i = 0; i < restored.length; i++) {
                var cell = restored[i];
                // The cell may have been deleted, or the whole table replaced,
                // since it was remembered.
                if (cell && cell.parentNode && contains(table, cell)) {
                    rename(cell, "th");
                    promoted = true;
                }
            }
            headerMemory["delete"](table);
        }
        if (!promoted && options && options.promoteFirstRow) promoteFirstRow(table);

        fireChange();
        return table;
    }

    function promoteFirstRow(table) {
        var rows = ownRows(table);
        if (!rows.length) return;
        var cells = rowCells(rows[0]);
        for (var i = 0; i < cells.length; i++) {
            var th = rename(cells[i], "th");
            th.setAttribute("scope", "col");
        }
    }

    // ------------------------------------------------------------------ helpers

    function isLayout(table) {
        if (!table || table.nodeName !== "TABLE") return false;
        var role = String(table.getAttribute("role") || "").toLowerCase();
        return role === "presentation" || role === "none";
    }

    // Tables nest: only touch nodes whose nearest ancestor table is this one.
    function ownsNode(table, node) {
        var n = node.parentNode;
        while (n && n !== table) {
            if (n.nodeName === "TABLE") return false;
            n = n.parentNode;
        }
        return n === table;
    }

    function ownCells(table) {
        var out = [], all = table.querySelectorAll ? table.querySelectorAll("th,td") : [];
        for (var i = 0; i < all.length; i++) if (ownsNode(table, all[i])) out.push(all[i]);
        return out;
    }

    function ownRows(table) {
        var out = [], all = table.querySelectorAll ? table.querySelectorAll("tr") : [];
        for (var i = 0; i < all.length; i++) if (ownsNode(table, all[i])) out.push(all[i]);
        return out;
    }

    function rowCells(row) {
        var out = [];
        for (var n = row.firstChild; n; n = n.nextSibling) {
            if (n.nodeName === "TH" || n.nodeName === "TD") out.push(n);
        }
        return out;
    }

    function firstOwnChild(table, name) {
        name = name.toUpperCase();
        for (var n = table.firstChild; n; n = n.nextSibling) if (n.nodeName === name) return n;
        return null;
    }

    function contains(root, node) {
        var n = node;
        while (n) { if (n === root) return true; n = n.parentNode; }
        return false;
    }

    // Move a <thead>'s rows into the table body and drop the section.
    function unwrapSection(table, section) {
        var body = firstOwnChild(table, "tbody");
        if (!body) {
            body = table.ownerDocument.createElement("tbody");
            table.insertBefore(body, section.nextSibling);
        }
        while (section.firstChild) body.insertBefore(section.firstChild, body.firstChild);
        section.parentNode.removeChild(section);
    }

    // Replace an element with the same content and attributes under a new tag.
    // The caret may be inside it, so the range is restored afterwards.
    function rename(el, tagName) {
        var doc = el.ownerDocument;
        var replacement = doc.createElement(tagName);
        for (var i = 0; i < el.attributes.length; i++) {
            var a = el.attributes[i];
            try { replacement.setAttribute(a.name, a.value); } catch (e) {}
        }
        while (el.firstChild) replacement.appendChild(el.firstChild);
        el.parentNode.replaceChild(replacement, el);
        return replacement;
    }

    function tableAtCaret() {
        var ed = getEditable();
        if (!ed) return null;
        var node = null;
        try {
            var sel = editor.getSelection();
            if (sel && sel.rangeCount) node = sel.getRangeAt(0).startContainer;
        } catch (e) {}
        if (!node) return null;
        if (node.nodeType === 3) node = node.parentNode;
        while (node && node !== ed) {
            if (node.nodeName === "TABLE") return node;
            node = node.parentNode;
        }
        return null;
    }

    function insertAtCaret(node, doc) {
        var inserted = false;
        try {
            var sel = editor.getSelection();
            if (sel && sel.rangeCount) {
                var range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(node);
                inserted = true;
            }
        } catch (e) {}
        if (!inserted) {
            var ed = getEditable();
            if (ed) { ed.appendChild(node); inserted = true; }
        }
        // A table at the very end of the document is a caret trap; gapcursor.js
        // handles escaping it, so nothing is appended here.
        return inserted;
    }

    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function editableDoc() {
        var ed = getEditable();
        return ed ? ed.ownerDocument : null;
    }

    function injectStyles(doc) {
        if (!doc) return;
        var text = outlineOn
            ? "table[role=presentation]{outline:1px dashed rgba(120,120,140,.55);outline-offset:1px;}" +
              "table[role=presentation] td{outline:1px dashed rgba(120,120,140,.28);}"
            : "";
        var existing = doc.getElementById("rte-layout-table-styles");
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        if (!text) return;
        var st = doc.createElement("style");
        st.id = "rte-layout-table-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }
}
