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

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        // 2026-10-15 Move Row Up/Down and Move Column Left/Right in the table menus: the single-pointer way to do what
        // the row and column grips do by dragging (WCAG 2.2 SC 2.5.7, Dragging Movements). tools/tables/table-move-buttons.mjs
        appendMenuItems("subtoolbar_tablerow", ["tablerowmoveup", "tablerowmovedown"]);
        appendMenuItems("subtoolbar_tablecolumn", ["tablecolumnmoveleft", "tablecolumnmoveright"]);
        var labels = { tablerowmoveup: "Move Row Up", tablerowmovedown: "Move Row Down", tablecolumnmoveleft: "Move Column Left", tablecolumnmoveright: "Move Column Right" };
        var arrows = { tablerowmoveup: "M12 19V5M6 11l6-6 6 6", tablerowmovedown: "M12 5v14M6 13l6 6 6-6", tablecolumnmoveleft: "M19 12H5M11 6l-6 6 6 6", tablecolumnmoveright: "M5 12h14M13 6l6 6-6 6" };
        for (var k in labels) {
            if (config["text_" + k] == null) config["text_" + k] = labels[k];
            if (config["svgCode_" + k] == null) config["svgCode_" + k] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + arrows[k] + '"/></svg>';
        }
    };

    // subtoolbar_* lists are comma-separated, sometimes inside braces
    function appendMenuItems(name, items) {
        var val = config[name];
        if (typeof val !== "string" || !val) return;
        for (var i = 0; i < items.length; i++) {
            if (val.indexOf(items[i]) !== -1) continue;
            var at = val.lastIndexOf("}");
            val = at === -1 ? val + "," + items[i] : val.substring(0, at) + "," + items[i] + val.substring(at);
        }
        config[name] = val;
    }

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
        ["tablerowmoveup", "tablerowmovedown", "tablecolumnmoveleft", "tablecolumnmoveright"].forEach(function (cmd) {
            editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
            if (!editor.toolbarFactoryMap[cmd]) editor.toolbarFactoryMap[cmd] = function (c) { return editor.createToolbarButton(c); };
            editor.attachEvent("exec_command_" + cmd, function (state) {
                state.returnValue = true;
                state.stopBubble = true;
                if (cmd === "tablerowmoveup") moveRowBy(-1);
                else if (cmd === "tablerowmovedown") moveRowBy(1);
                else if (cmd === "tablecolumnmoveleft") moveColumnBy(-1);
                else moveColumnBy(1);
            });
        });
        editor.moveTableRow = function (dir) { return moveRowBy(dir < 0 ? -1 : 1); };
        editor.moveTableColumn = function (dir) { return moveColumnBy(dir < 0 ? -1 : 1); };
        if (config.tableRowDrag !== false) initRowDrag();
        if (config.tableColumnDrag !== false) initColumnDrag();
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
            var num = t.replace(/[\s\xa0,]/g, "").replace(/^\(([^)]*)\)$/, "-$1").replace(/[^0-9.eE+-]/g, "");
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
        // 2026-10-14 Suggesting mode: a sort reorders rows and is not tracked yet, so the track hook refuses it.
        // tools/tables/table-row-move.mjs
        if (editor.__trackHook && editor.__trackHook("move", { direction: 0 }) === true) {
            return { ok: false, reason: "Suggesting is on, so the table was not sorted. Turn suggesting off to sort it." };
        }
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

    // 2026-10-14 Row drag: a grip beside a body row drags that row to another place in its table. It is the same move
    // as Alt+ArrowUp / Alt+ArrowDown, with the same limits: the header rows stay put, a table with merged cells is left
    // alone, and suggesting mode refuses the move because a move is not tracked yet. config.tableRowDrag = false turns
    // the grip off. Escape cancels a drag. tools/tables/table-row-drag.mjs
    // 2026-10-15 grips and drop lines use z-index 99998, under the floating table toolbar (99999), so they never cover
    // its menu buttons. tools/tables/table-move-buttons.mjs
    function initRowDrag() {
        var frame = editor.iframe;
        if (!frame || !frame.ownerDocument) return;
        var host = frame.ownerDocument;
        var edoc = editor.getDocument();
        var grip = host.createElement("div");
        grip.className = "rte-row-grip";
        grip.setAttribute("aria-hidden", "true");
        // 2026-10-15 this was the quoted text "String.fromCharCode(0x283f)", shown as code in the grip. tools/tables/table-column-drag.mjs
        grip.textContent = "\u283f";
        var gs = grip.style;
        gs.position = "fixed"; gs.display = "none"; gs.zIndex = "99998"; gs.width = "12px"; gs.height = "22px";
        gs.lineHeight = "22px"; gs.textAlign = "center"; gs.fontSize = "14px"; gs.color = "#64748b"; gs.cursor = "grab";
        gs.userSelect = "none"; gs.borderRadius = "3px"; gs.background = "rgba(15,23,42,.06)";
        var line = host.createElement("div");
        line.className = "rte-row-drop";
        var ls = line.style;
        ls.position = "fixed"; ls.display = "none"; ls.zIndex = "99998"; ls.height = "2px";
        ls.background = "#2563eb"; ls.pointerEvents = "none";
        host.body.appendChild(grip);
        host.body.appendChild(line);

        var hoverRow = null, hideTid = 0, drag = null;

        function frameRect() { return frame.getBoundingClientRect(); }
        function inEditable(node) { try { return !!editor.getEditable() && editor.getEditable().contains(node); } catch (e) { return false; } }
        // The row under a node, if it is a body row that may move.
        function movableRowAt(node) {
            var el = node && node.nodeType === 1 ? node : (node && node.parentNode);
            while (el && el.nodeName !== "TR") el = el.parentNode;
            if (!el || !inEditable(el)) return null;
            var sec = el.parentNode && el.parentNode.nodeName;
            if (sec === "THEAD" || sec === "TFOOT") return null;
            var table = el.closest ? el.closest("table") : null;
            if (!table || bodyRows(table).indexOf(el) < 0) return null;
            return el;
        }
        function placeGrip(row) {
            var fr = frameRect(), tr = row.getBoundingClientRect(), table = row.closest("table");
            var left = table.getBoundingClientRect().left - 14;
            // no room in the gutter: no grip, so it never covers the first cell (the keyboard still moves rows)
            if (left < fr.left) { gs.display = "none"; return; }
            gs.left = Math.round(left) + "px";
            gs.top = Math.round(fr.top + tr.top + tr.height / 2 - 11) + "px";
            gs.display = "block";
        }
        function hideGripSoon() {
            clearTimeout(hideTid);
            hideTid = setTimeout(function () { if (!drag) { gs.display = "none"; hoverRow = null; } }, 350);
        }
        // a pointer event from the editing frame has its y in the frame; the grip lives in the host page
        function hostY(e) { return e.view === frame.contentWindow ? frameRect().top + e.clientY : e.clientY; }
        function hasMergedCells(table) {
            var rows = bodyRows(table);
            for (var i = 0; i < rows.length; i++) for (var c = 0; c < rows[i].cells.length; c++) {
                var cell = rows[i].cells[c];
                if ((cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1) return true;
            }
            return false;
        }
        function say(text) { try { if (typeof editor.announce === "function") editor.announce(text); } catch (e) { /* ignore */ } }

        edoc.addEventListener("mousemove", function (e) {
            if (drag) return;
            var row = movableRowAt(e.target);
            if (row) { clearTimeout(hideTid); hoverRow = row; placeGrip(row); } else { hideGripSoon(); }
        });
        grip.addEventListener("mouseenter", function () { clearTimeout(hideTid); });
        grip.addEventListener("mouseleave", hideGripSoon);

        function endDrag() {
            drag = null;
            host.removeEventListener("mousemove", onDragMove, true);
            edoc.removeEventListener("mousemove", onDragMove, true);
            host.removeEventListener("mouseup", onDragEnd, true);
            edoc.removeEventListener("mouseup", onDragEnd, true);
            host.removeEventListener("keydown", onDragKey, true);
            edoc.removeEventListener("keydown", onDragKey, true);
            ls.display = "none"; gs.display = "none"; gs.cursor = "grab";
        }
        function onDragMove(e) {
            if (!drag) return;
            var y = hostY(e), fr = frameRect(), rows = drag.rows, drop = rows.length;
            for (var i = 0; i < rows.length; i++) {
                var rr = rows[i].getBoundingClientRect();
                if (y < fr.top + rr.top + rr.height / 2) { drop = i; break; }
            }
            drag.drop = drop;
            // dropping the row where it already is, or just below itself, changes nothing
            var noop = drop === drag.from || drop === drag.from + 1;
            drag.noop = noop;
            var at = drop < rows.length ? fr.top + rows[drop].getBoundingClientRect().top
                : fr.top + rows[rows.length - 1].getBoundingClientRect().bottom;
            var tb = drag.table.getBoundingClientRect();
            ls.left = Math.round(fr.left + tb.left) + "px";
            ls.width = Math.round(tb.width) + "px";
            ls.top = Math.round(at - 1) + "px";
            ls.display = noop ? "none" : "block";
        }
        function moveRow(d) {
            // 2026-10-14 Read-only (designMode off) or comments-only: a move changes the document, so it does nothing. tools/review/readonly-audit.mjs
            try { if (String(editor.getDocument().designMode).toLowerCase() === "off" || (editor.getCommentsOnly && editor.getCommentsOnly())) return false; } catch (e) { /* ignore */ }
            if (hasMergedCells(d.table)) { say("This table has merged cells, so the row was not moved."); return false; }
            // a move is not tracked yet: suggesting mode refuses it (the track hook answers "move")
            if (editor.__trackHook && editor.__trackHook("move", { direction: 0 }) === true) return false;
            var ref = d.drop < d.rows.length ? d.rows[d.drop] : null;
            if (typeof editor.recordUndo === "function") editor.recordUndo();
            d.row.parentNode.insertBefore(d.row, ref);
            renumber(d.table);
            // the caret goes into the moved row and the editor takes focus, so Ctrl+Z reaches the editor (as after Alt+Arrow)
            try { restoreCaret(d.row.cells[0]); if (typeof editor.focus === "function") editor.focus(); } catch (e) { /* ignore */ }
            fireChange();
            return true;
        }
        function onDragEnd(e) {
            if (!drag) return;
            var d = drag;
            endDrag();
            if (d.drop < 0 || d.noop) return;
            moveRow(d);
        }
        function onDragKey(e) {
            if (e.key === "Escape") { endDrag(); }
        }
        grip.addEventListener("mousedown", function (e) {
            if (!hoverRow || e.button !== 0) return;
            e.preventDefault();
            var table = hoverRow.closest("table");
            var rows = bodyRows(table).filter(function (r) { return r.parentNode === hoverRow.parentNode; });
            drag = { row: hoverRow, table: table, rows: rows, from: rows.indexOf(hoverRow), drop: -1, noop: true };
            gs.cursor = "grabbing";
            host.addEventListener("mousemove", onDragMove, true);
            edoc.addEventListener("mousemove", onDragMove, true);
            host.addEventListener("mouseup", onDragEnd, true);
            edoc.addEventListener("mouseup", onDragEnd, true);
            host.addEventListener("keydown", onDragKey, true);
            edoc.addEventListener("keydown", onDragKey, true);
        });
    }

    // 2026-10-15 Column drag: a grip above a column drags it to another place in its table (Tiptap, CKEditor and
    // BlockNote move columns). Every row moves the cell, header rows too, and the column's <col> width goes with it.
    // Same limits as the row grip: merged cells or ragged rows leave the table alone, suggesting mode refuses (a move
    // is not tracked), read-only does nothing, and the row-number column stays first. config.tableColumnDrag = false
    // turns it off; Escape cancels. tools/tables/table-column-drag.mjs
    function say(text) { try { if (typeof editor.announce === "function") editor.announce(text); } catch (e) { /* ignore */ } }
    // read-only and comments-only change nothing; suggesting mode refuses a move, which is not tracked yet
    function moveRefused() {
        try { if (String(editor.getDocument().designMode).toLowerCase() === "off" || (editor.getCommentsOnly && editor.getCommentsOnly())) return true; } catch (e) { /* ignore */ }
        return !!(editor.__trackHook && editor.__trackHook("move", { direction: 0 }) === true);
    }
    // a rectangular table: every row has the same number of cells and none spans
    function isRectangular(table) {
        var rows = table.rows, n = rows.length ? rows[0].cells.length : 0;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].cells.length !== n) return false;
            for (var c = 0; c < n; c++) if ((rows[i].cells[c].rowSpan || 1) > 1 || (rows[i].cells[c].colSpan || 1) > 1) return false;
        }
        return n > 1;
    }
    // the first column that may move: the row-number column stays put
    function firstMovableColumn(table) { return table.querySelector("[data-rte-rownum]") ? 1 : 0; }
    // Move column `from` so it sits before column `drop` (drop = column count: to the end). caretCell, when given,
    // keeps the caret; otherwise it goes into the moved column's first body cell.
    function moveColumnTo(table, from, drop, caretCell) {
        if (moveRefused()) return false;
        if (!isRectangular(table)) { say("This table has merged cells, so the column was not moved."); return false; }
        var rows = table.rows, n = rows[0].cells.length;
        if (from < 0 || from >= n || drop < 0 || drop > n || drop === from || drop === from + 1) return false;
        if (typeof editor.recordUndo === "function") editor.recordUndo();
        for (var i = 0; i < rows.length; i++) {
            var cells = rows[i].cells;
            rows[i].insertBefore(cells[from], drop < n ? cells[drop] : null);
        }
        // the <col> widths follow, when the colgroup describes these columns (it may leave out the number column)
        var cols = [];
        for (var k = 0; k < table.children.length; k++) {
            var g = table.children[k];
            if (g.nodeName === "COLGROUP") for (var m = 0; m < g.children.length; m++) if (g.children[m].nodeName === "COL") cols.push(g.children[m]);
        }
        var off = n - cols.length, spans = false;
        for (var s = 0; s < cols.length; s++) if ((parseInt(cols[s].getAttribute("span"), 10) || 1) > 1) spans = true;
        if (cols.length && !spans && (off === 0 || off === firstMovableColumn(table)) && from >= off) {
            var col = cols[from - off], ref = drop < n ? cols[drop - off] : null;
            if (col && col !== ref) (ref ? ref.parentNode : col.parentNode).insertBefore(col, ref);
        }
        var at = drop > from ? drop - 1 : drop;
        try { restoreCaret(caretCell || rows[rows.length > 1 ? 1 : 0].cells[at]); if (typeof editor.focus === "function") editor.focus(); } catch (e) { /* ignore */ }
        fireChange();
        return true;
    }
    function moveColumnBy(dir) {
        var cell = cellAtCaret();
        if (!cell || cell.hasAttribute("data-rte-rownum")) return false;
        var table = cell.closest("table");
        if (!table || !table.rows.length) return false;
        var from = cell.cellIndex, n = table.rows[0].cells.length;
        if (dir < 0 ? from - 1 < firstMovableColumn(table) : from + 1 >= n) return false;
        return moveColumnTo(table, from, dir < 0 ? from - 1 : from + 2, cell);
    }
    // a body row moves one place within its section; header rows stay put, as for the grip and Alt+Arrow
    function moveRowBy(dir) {
        var cell = cellAtCaret();
        if (!cell) return false;
        var row = cell.parentNode, table = cell.closest("table");
        var rows = bodyRows(table).filter(function (r) { return r.parentNode === row.parentNode; });
        var i = rows.indexOf(row), j = i + (dir < 0 ? -1 : 1);
        if (i < 0 || j < 0 || j >= rows.length) return false;
        if (moveRefused()) return false;
        for (var r = 0; r < rows.length; r++) for (var c = 0; c < rows[r].cells.length; c++) {
            if ((rows[r].cells[c].rowSpan || 1) > 1 || (rows[r].cells[c].colSpan || 1) > 1) { say("This table has merged cells, so the row was not moved."); return false; }
        }
        if (typeof editor.recordUndo === "function") editor.recordUndo();
        row.parentNode.insertBefore(row, dir < 0 ? rows[j] : rows[j].nextSibling);
        renumber(table);
        try { restoreCaret(cell); if (typeof editor.focus === "function") editor.focus(); } catch (e) { /* ignore */ }
        fireChange();
        return true;
    }

    function initColumnDrag() {
        var frame = editor.iframe;
        if (!frame || !frame.ownerDocument) return;
        var host = frame.ownerDocument;
        var edoc = editor.getDocument();
        var grip = host.createElement("div");
        grip.className = "rte-col-grip";
        grip.setAttribute("aria-hidden", "true");
        grip.textContent = "\u283f";
        var gs = grip.style;
        gs.position = "fixed"; gs.display = "none"; gs.zIndex = "99998"; gs.width = "22px"; gs.height = "12px";
        gs.lineHeight = "12px"; gs.textAlign = "center"; gs.fontSize = "12px"; gs.color = "#64748b"; gs.cursor = "grab";
        gs.userSelect = "none"; gs.borderRadius = "3px"; gs.background = "rgba(15,23,42,.06)"; gs.overflow = "hidden";
        var line = host.createElement("div");
        line.className = "rte-col-drop";
        var ls = line.style;
        ls.position = "fixed"; ls.display = "none"; ls.zIndex = "99998"; ls.width = "2px";
        ls.background = "#2563eb"; ls.pointerEvents = "none";
        host.body.appendChild(grip);
        host.body.appendChild(line);

        var hoverCell = null, hideTid = 0, drag = null;
        function frameRect() { return frame.getBoundingClientRect(); }
        function inEditable(node) { try { return !!editor.getEditable() && editor.getEditable().contains(node); } catch (e) { return false; } }
        function cellAt(node) {
            var el = node && node.nodeType === 1 ? node : (node && node.parentNode);
            while (el && el.nodeName !== "TD" && el.nodeName !== "TH") el = el.parentNode;
            if (!el || !inEditable(el) || el.hasAttribute("data-rte-rownum")) return null;
            return el.closest && el.closest("table") ? el : null;
        }
        function placeGrip(cell) {
            var fr = frameRect(), cr = cell.getBoundingClientRect(), tb = cell.closest("table").getBoundingClientRect();
            var top = fr.top + tb.top - 14;
            // no room above the table: no grip, so it never covers the first row
            if (top < fr.top) { gs.display = "none"; return; }
            gs.left = Math.round(fr.left + cr.left + cr.width / 2 - 11) + "px";
            gs.top = Math.round(top) + "px";
            gs.display = "block";
        }
        function hideGripSoon() {
            clearTimeout(hideTid);
            hideTid = setTimeout(function () { if (!drag) { gs.display = "none"; hoverCell = null; } }, 350);
        }
        function hostX(e) { return e.view === frame.contentWindow ? frameRect().left + e.clientX : e.clientX; }

        edoc.addEventListener("mousemove", function (e) {
            if (drag) return;
            var cell = cellAt(e.target);
            if (cell) { clearTimeout(hideTid); hoverCell = cell; placeGrip(cell); } else { hideGripSoon(); }
        });
        grip.addEventListener("mouseenter", function () { clearTimeout(hideTid); });
        grip.addEventListener("mouseleave", hideGripSoon);

        function endDrag() {
            drag = null;
            host.removeEventListener("mousemove", onDragMove, true);
            edoc.removeEventListener("mousemove", onDragMove, true);
            host.removeEventListener("mouseup", onDragEnd, true);
            edoc.removeEventListener("mouseup", onDragEnd, true);
            host.removeEventListener("keydown", onDragKey, true);
            edoc.removeEventListener("keydown", onDragKey, true);
            ls.display = "none"; gs.display = "none"; gs.cursor = "grab";
        }
        function onDragMove(e) {
            if (!drag) return;
            var x = hostX(e), fr = frameRect(), cells = drag.table.rows[0].cells, n = cells.length, drop = n;
            for (var i = drag.min; i < n; i++) {
                var cr = cells[i].getBoundingClientRect();
                if (x < fr.left + cr.left + cr.width / 2) { drop = i; break; }
            }
            drag.drop = drop;
            // dropping the column where it already is, or just after itself, changes nothing
            drag.noop = drop === drag.from || drop === drag.from + 1;
            var at = drop < n ? fr.left + cells[drop].getBoundingClientRect().left : fr.left + cells[n - 1].getBoundingClientRect().right;
            var tb = drag.table.getBoundingClientRect();
            ls.left = Math.round(at - 1) + "px";
            ls.top = Math.round(fr.top + tb.top) + "px";
            ls.height = Math.round(tb.height) + "px";
            ls.display = drag.noop ? "none" : "block";
        }
        function moveColumn(d) { return moveColumnTo(d.table, d.from, d.drop); }
        function onDragEnd() {
            if (!drag) return;
            var d = drag;
            endDrag();
            if (d.drop < 0 || d.noop) return;
            moveColumn(d);
        }
        function onDragKey(e) { if (e.key === "Escape") endDrag(); }
        grip.addEventListener("mousedown", function (e) {
            if (!hoverCell || e.button !== 0) return;
            e.preventDefault();
            var table = hoverCell.closest("table");
            if (!table.rows.length) return;
            drag = { table: table, from: hoverCell.cellIndex, min: firstMovableColumn(table), drop: -1, noop: true };
            gs.cursor = "grabbing";
            host.addEventListener("mousemove", onDragMove, true);
            edoc.addEventListener("mousemove", onDragMove, true);
            host.addEventListener("mouseup", onDragEnd, true);
            edoc.addEventListener("mouseup", onDragEnd, true);
            host.addEventListener("keydown", onDragKey, true);
            edoc.addEventListener("keydown", onDragKey, true);
        });
    }

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
        if (editor.commitBookmark) editor.commitBookmark();
        if (table.querySelector("[data-rte-rownum]")) {
            renumber(table);
            fireChange();
            if (editor.recordUndo) editor.recordUndo();
            return true;
        }
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
        if (editor.recordUndo) editor.recordUndo();
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
        if (editor.commitBookmark) editor.commitBookmark();
        for (var i = 0; i < cells.length; i++) if (cells[i].parentNode) cells[i].parentNode.removeChild(cells[i]);
        table.removeAttribute("data-rte-rownum-series");
        fireChange();
        if (editor.recordUndo) editor.recordUndo();
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
