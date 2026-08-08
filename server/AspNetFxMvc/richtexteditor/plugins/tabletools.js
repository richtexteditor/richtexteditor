if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Table sorting and row numbering.
//
// TinyMCE sells both as the premium "Enhanced Tables" plugin: "This plugin is
// only available for paid TinyMCE subscriptions". It adds sorting by column and
// an automatic row-numbering column on top of the standard table plugin.
//
// Design notes:
//   - Column type is DETECTED, not assumed. A column of prices sorts numerically
//     even when the cells read "$1,240.00" or "(500)"; a column of dates sorts
//     chronologically rather than as strings. Text sorting a numeric column is
//     the classic wrong answer that puts 10 before 9.
//   - The sort REFUSES on a table with merged body cells rather than doing it
//     badly. A rowspan crossing rows has no meaning once the rows move; silently
//     shredding a table the user spent an hour on is far worse than declining.
//   - <thead> and <tfoot> never move. If a table has no <thead>, a first row
//     that looks like a header (all <th>) is pinned anyway.
//   - The sort is STABLE, so re-sorting by a second column preserves the order
//     of the first — which is how people expect to sort by two things.
RTE_DefaultConfig.plugin_tabletools = RTE_Plugin_TableTools;

// "numeric" | "upper-alpha" | "lower-alpha" | "upper-roman" | "lower-roman"
if (typeof RTE_DefaultConfig.tableNumberSeries === "undefined") RTE_DefaultConfig.tableNumberSeries = "numeric";
// Heading placed above the numbering column.
if (typeof RTE_DefaultConfig.tableNumberHeader === "undefined") RTE_DefaultConfig.tableNumberHeader = "#";

function RTE_Plugin_TableTools() {
    var obj = this;
    var config, editor;

    obj.PluginName = "TableTools";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_sorttable", function (state) {
            state.returnValue = true;
            obj.SortAtCaret(state && state.value === "desc" ? "desc" : "asc");
        });
        editor.attachEvent("exec_command_tablerownumbers", function (state) {
            state.returnValue = true;
            obj.ToggleRowNumbers();
        });

        // Public API.
        editor.sortTableByColumn = function (index, dir) { return obj.Sort(tableAtCaret(), index, dir); };
        editor.sortTableAtCaret = function (dir) { return obj.SortAtCaret(dir); };
        editor.canSortTable = function () { return canSort(tableAtCaret()); };
        editor.addTableRowNumbers = function (opts) { return obj.AddRowNumbers(opts); };
        editor.removeTableRowNumbers = function () { return obj.RemoveRowNumbers(); };
        editor.hasTableRowNumbers = function () {
            var t = tableAtCaret();
            return !!(t && t.querySelector("[data-rte-rownum]"));
        };
    };

    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    // ---- locating ---------------------------------------------------------

    function tableAtCaret() {
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            var n = sel.getRangeAt(0).startContainer;
            if (n && n.nodeType === 3) n = n.parentNode;
            var editable = getEditable();
            while (n && n !== editable) {
                if (n.nodeName === "TABLE") return n;
                n = n.parentNode;
            }
            return null;
        } catch (e) { return null; }
    }

    function cellAtCaret() {
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            var n = sel.getRangeAt(0).startContainer;
            if (n && n.nodeType === 3) n = n.parentNode;
            var editable = getEditable();
            while (n && n !== editable) {
                if (n.nodeName === "TD" || n.nodeName === "TH") return n;
                n = n.parentNode;
            }
            return null;
        } catch (e) { return null; }
    }

    // Rows that are allowed to move: everything except thead/tfoot and a
    // header-looking first row.
    function bodyRows(table) {
        if (!table) return [];
        var all = Array.prototype.slice.call(table.rows || []);
        var out = [];
        for (var i = 0; i < all.length; i++) {
            var r = all[i];
            var section = r.parentNode ? r.parentNode.nodeName : "";
            if (section === "THEAD" || section === "TFOOT") continue;
            // No <thead>: treat an all-<th> first row as the header anyway.
            if (out.length === 0 && i === 0 && r.cells.length && allHeaderCells(r)) continue;
            out.push(r);
        }
        return out;
    }

    function allHeaderCells(row) {
        for (var i = 0; i < row.cells.length; i++) if (row.cells[i].nodeName !== "TH") return false;
        return true;
    }

    // ---- safety -----------------------------------------------------------

    function canSort(table) {
        if (!table) return { ok: false, reason: "The caret is not inside a table." };
        var rows = bodyRows(table);
        if (rows.length < 2) return { ok: false, reason: "The table has fewer than two sortable rows." };
        for (var i = 0; i < rows.length; i++) {
            for (var c = 0; c < rows[i].cells.length; c++) {
                var cell = rows[i].cells[c];
                if ((cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1) {
                    return {
                        ok: false,
                        reason: "This table has merged cells. Sorting would move rows out from under a rowspan and break the table, so it has been left alone."
                    };
                }
            }
        }
        return { ok: true, reason: "" };
    }

    // ---- value typing -----------------------------------------------------

    // Detect what a cell actually holds so the comparison matches the data.
    function cellValue(text) {
        var t = String(text == null ? "" : text).trim();
        if (!t) return { type: "empty", v: "" };
        if (/\d/.test(t)) {
            // Strip currency, spaces, thousands separators; (500) is accounting
            // notation for negative.
            var num = t.replace(/[\s ,]/g, "").replace(/^\(([^)]*)\)$/, "-$1").replace(/[^0-9.eE+-]/g, "");
            if (num && /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(num)) {
                return { type: "number", v: parseFloat(num) };
            }
            var d = Date.parse(t);
            if (!isNaN(d)) return { type: "date", v: d };
        }
        return { type: "text", v: t.toLowerCase() };
    }

    // The column's type is whatever most of its non-empty cells are.
    function columnType(rows, index) {
        var counts = { number: 0, date: 0, text: 0 };
        for (var i = 0; i < rows.length; i++) {
            var cell = rows[i].cells[index];
            if (!cell) continue;
            var val = cellValue(cell.textContent);
            if (val.type === "empty") continue;
            counts[val.type]++;
        }
        if (counts.number >= counts.date && counts.number >= counts.text && counts.number > 0) return "number";
        if (counts.date >= counts.text && counts.date > 0) return "date";
        return "text";
    }

    // ---- sort -------------------------------------------------------------

    obj.SortAtCaret = function (dir) {
        var table = tableAtCaret();
        var cell = cellAtCaret();
        if (!table || !cell) return false;
        return obj.Sort(table, cell.cellIndex, dir);
    };

    obj.Sort = function (table, index, dir) {
        var check = canSort(table);
        if (!check.ok) return check;
        var descending = String(dir).toLowerCase() === "desc";
        var rows = bodyRows(table);
        var type = columnType(rows, index);

        // Decorate with the original position so the sort is stable — the
        // Array.prototype.sort in older engines is not guaranteed to be.
        var decorated = [];
        for (var i = 0; i < rows.length; i++) {
            var cell = rows[i].cells[index];
            decorated.push({ row: rows[i], order: i, val: cellValue(cell ? cell.textContent : "") });
        }

        decorated.sort(function (a, b) {
            // Empty cells sink to the bottom in both directions: a blank is
            // "no value", not "the smallest value".
            if (a.val.type === "empty" && b.val.type === "empty") return a.order - b.order;
            if (a.val.type === "empty") return 1;
            if (b.val.type === "empty") return -1;

            var cmp;
            if (type === "number" || type === "date") {
                var av = a.val.type === type ? a.val.v : Number.POSITIVE_INFINITY;
                var bv = b.val.type === type ? b.val.v : Number.POSITIVE_INFINITY;
                cmp = av < bv ? -1 : (av > bv ? 1 : 0);
            } else {
                var as = String(a.val.v), bs = String(b.val.v);
                cmp = as.localeCompare ? as.localeCompare(bs, undefined, { numeric: true, sensitivity: "base" })
                                       : (as < bs ? -1 : (as > bs ? 1 : 0));
            }
            if (cmp === 0) return a.order - b.order;      // stable
            return descending ? -cmp : cmp;
        });

        // Re-append in the new order. Appending a row already in the table moves
        // it, so this reorders in place without cloning (which would drop any
        // event handlers or editor state attached to the cells).
        var parent = decorated.length ? decorated[0].row.parentNode : null;
        if (!parent) return { ok: false, reason: "The table has no sortable rows." };

        // Moving a row that contains the caret collapses the selection, so a
        // second sort would find no cell and silently do nothing. Remember the
        // cell and put the caret back into it afterwards.
        var caretCell = cellAtCaret();
        for (var j = 0; j < decorated.length; j++) parent.appendChild(decorated[j].row);
        restoreCaret(caretCell);

        renumber(table);      // numbering is positional, so it follows the sort
        fireChange();
        return { ok: true, reason: "", sortedBy: index, direction: descending ? "desc" : "asc", detectedType: type };
    };

    // ---- row numbering ----------------------------------------------------

    function seriesLabel(n, series) {
        switch (String(series)) {
            case "upper-alpha": return alpha(n).toUpperCase();
            case "lower-alpha": return alpha(n);
            case "upper-roman": return roman(n);
            case "lower-roman": return roman(n).toLowerCase();
            default: return String(n);
        }
    }

    function alpha(n) {
        var s = "";
        while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(97 + m) + s; n = Math.floor((n - 1) / 26); }
        return s || "a";
    }

    function roman(n) {
        var map = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],
                   [50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
        var out = "";
        for (var i = 0; i < map.length; i++) while (n >= map[i][0]) { out += map[i][1]; n -= map[i][0]; }
        return out || "I";
    }

    obj.AddRowNumbers = function (opts) {
        var table = tableAtCaret();
        if (!table) return false;
        if (table.querySelector("[data-rte-rownum]")) { renumber(table); return true; }
        opts = opts || {};
        var series = opts.series || config.tableNumberSeries;
        var doc = table.ownerDocument;

        // Header cell in every header row so the columns stay aligned.
        var all = Array.prototype.slice.call(table.rows || []);
        var body = bodyRows(table);
        var bodySet = {};
        for (var b = 0; b < body.length; b++) bodySet[rowKey(body[b])] = true;

        for (var i = 0; i < all.length; i++) {
            var row = all[i];
            var isBody = bodySet[rowKey(row)];
            var cell = doc.createElement(isBody ? "td" : "th");
            cell.setAttribute("data-rte-rownum", isBody ? "value" : "header");
            if (!isBody) cell.textContent = String(config.tableNumberHeader == null ? "#" : config.tableNumberHeader);
            row.insertBefore(cell, row.firstChild);
        }
        table.setAttribute("data-rte-rownum-series", series);
        renumber(table);
        fireChange();
        return true;
    };

    // rows have no stable identity across arrays, so key on position
    var keySeq = 0;
    function rowKey(row) {
        if (!row.__rteKey) row.__rteKey = "r" + (keySeq++);
        return row.__rteKey;
    }

    obj.RemoveRowNumbers = function () {
        var table = tableAtCaret();
        if (!table) return false;
        var cells = table.querySelectorAll("[data-rte-rownum]");
        if (!cells.length) return false;
        for (var i = 0; i < cells.length; i++) if (cells[i].parentNode) cells[i].parentNode.removeChild(cells[i]);
        table.removeAttribute("data-rte-rownum-series");
        fireChange();
        return true;
    };

    obj.ToggleRowNumbers = function () {
        var table = tableAtCaret();
        if (!table) return false;
        return table.querySelector("[data-rte-rownum]") ? obj.RemoveRowNumbers() : obj.AddRowNumbers();
    };

    // Numbering is positional: after a sort, row 1 is whatever is now on top.
    function renumber(table) {
        if (!table) return;
        var series = table.getAttribute("data-rte-rownum-series") || config.tableNumberSeries;
        var rows = bodyRows(table);
        var n = 1;
        for (var i = 0; i < rows.length; i++) {
            var cell = rows[i].querySelector("[data-rte-rownum='value']");
            if (!cell) continue;
            cell.textContent = seriesLabel(n++, series);
        }
    }

    // Put a collapsed caret back into a cell that has just been moved.
    function restoreCaret(cell) {
        if (!cell || !cell.parentNode) return;
        try {
            var doc = cell.ownerDocument;
            var r = doc.createRange();
            r.selectNodeContents(cell);
            r.collapse(true);
            var sel = editor.getSelection();
            sel.removeAllRanges();
            sel.addRange(r);
        } catch (e) {}
    }

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }
}
