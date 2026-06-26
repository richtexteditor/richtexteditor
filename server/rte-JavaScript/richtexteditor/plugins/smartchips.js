if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-04 Smart chips — Google-Docs-style inline data chips. The most-used
// chip (and the one with no good equivalent here) is the interactive DATE chip:
// the existing `insertdate` drops plain text, whereas this inserts an atomic
// pill with a picker and a machine-readable value. A generic chip menu also
// supports Person / Link chips; rich data (avatars, presence, file metadata)
// comes from an optional BYOK resolver — same shape as the bookmark / spell /
// AI resolvers — so the chip system needs no backend of ours to be useful.
//
//   config.chipResolver = function (query, type) {
//     // type: "person" | "link"
//     return Promise.resolve([{ label, value, icon, href }]);
//   };
RTE_DefaultConfig.plugin_smartchips = RTE_Plugin_SmartChips;
RTE_DefaultConfig.chipResolver = RTE_DefaultConfig.chipResolver || null;
RTE_DefaultConfig.chipDateFormat = RTE_DefaultConfig.chipDateFormat || null; // optional fn(Date)->string

function RTE_Plugin_SmartChips() {
    var obj = this;
    var config, editor;

    obj.PluginName = "SmartChips";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        editor.attachEvent("exec_command_insertdatechip", function (state) { state.returnValue = true; obj.OpenDateChip(); });
        editor.attachEvent("exec_command_insertchip", function (state) { state.returnValue = true; obj.OpenChipMenu(); });
        injectStyles();
    };

    function append(parent, tag, cssText, className) {
        var el = parent.ownerDocument.createElement(tag);
        if (cssText) el.style.cssText = cssText;
        if (className) el.className = className;
        parent.appendChild(el);
        return el;
    }
    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    function fmtDate(d) {
        if (config.chipDateFormat && typeof config.chipDateFormat === "function") {
            try { return String(config.chipDateFormat(d)); } catch (e) { /* fall through */ }
        }
        return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
    }
    function isoDate(d) {
        function pad(n) { return (n < 10 ? "0" : "") + n; }
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }

    var ICONS = {
        date: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12"/><path d="M5 1.5v3"/><path d="M11 1.5v3"/></svg>',
        person: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="5" r="2.6"/><path d="M3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4"/></svg>',
        link: '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 9.5a3 3 0 004.2 0l2-2a3 3 0 10-4.2-4.2L7.4 4.3"/><path d="M9.5 6.5a3 3 0 00-4.2 0l-2 2a3 3 0 104.2 4.2l1-1"/></svg>'
    };

    function chipHtml(type, label, value, href) {
        var icon = ICONS[type] || "";
        var attrs = 'class="rte-chip rte-chip-' + esc(type) + '" data-rte-chip="' + esc(type) + '" data-rte-chip-value="' + esc(value || label) + '" contenteditable="false"';
        var inner = '<span class="rte-chip-icon">' + icon + "</span><span class=\"rte-chip-label\">" + esc(label) + "</span>";
        if (type === "link" && href) {
            var safeHref = /^(javascript|data|vbscript):/i.test(href) ? "#" : href;
            return '<a ' + attrs + ' href="' + esc(safeHref) + '" target="_blank" rel="noopener noreferrer">' + inner + "</a>";
        }
        return "<span " + attrs + ">" + inner + "</span>";
    }

    function insertChip(type, label, value, href) {
        injectStyles();
        // trailing zero-width space so the caret lands after the atomic pill
        editor.insertHTML(chipHtml(type, label, value, href) + "​");
        editor.focus();
    }

    // --- Date chip --------------------------------------------------------

    obj.OpenDateChip = function () {
        var dlg = editor.createDialog((editor.getLangText && editor.getLangText("insertdatechiptitle")) || "Date", "rte-dialog-datechip");
        var close = typeof dlg.close === "function" ? function () { dlg.close(); } : function () { editor.closeCurrentPopup(); };
        var wrap = append(dlg, "div", "", "rte-chip-dialog rte-chip-date-dialog");
        append(wrap, "div", "", "rte-chip-dialog-copy").textContent = "Choose a quick date or insert a custom date chip.";

        function quick(label, d) {
            var b = append(wrap, "button", "", "rte-chip-quick");
            b.type = "button"; b.textContent = label + " — " + fmtDate(d);
            b.onmouseover = function () { b.style.background = "#eef2ff"; };
            b.onmouseout = function () { b.style.background = "transparent"; };
            b.textContent = "";
            append(b, "span", "", "rte-chip-quick-label").textContent = label;
            append(b, "span", "", "rte-chip-quick-value").textContent = fmtDate(d);
            b.onmouseover = null;
            b.onmouseout = null;
            b.setAttribute("aria-label", "Insert " + label + ", " + fmtDate(d));
            b.onclick = function () { close(); insertChip("date", fmtDate(d), isoDate(d)); };
            return b;
        }
        var now = new Date(editor.__chipNow || Date.now());
        function addDays(base, n) { var x = new Date(base.getTime()); x.setDate(x.getDate() + n); return x; }
        quick("Today", now);
        quick("Tomorrow", addDays(now, 1));
        quick("Yesterday", addDays(now, -1));
        quick("Next week", addDays(now, 7));

        var pickRow = append(wrap, "div", "", "rte-chip-pick-row");
        var di = append(pickRow, "input", "", "rte-chip-input");
        di.type = "date"; di.value = isoDate(now);
        di.setAttribute("aria-label", "Custom date");
        var go = append(pickRow, "button", "", "rte-chip-action rte-chip-action-primary");
        go.type = "button"; go.textContent = "Insert";
        go.onclick = function () {
            var parts = (di.value || "").split("-");
            if (parts.length === 3) {
                var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                close(); insertChip("date", fmtDate(d), di.value);
            } else { close(); }
        };
        setTimeout(function () { di.focus(); }, 0);
    };

    // --- Generic chip menu (Date / Person / Link) -------------------------

    obj.OpenChipMenu = function () {
        var dlg = editor.createDialog((editor.getLangText && editor.getLangText("insertchiptitle")) || "Insert chip", "rte-dialog-chip");
        var close = typeof dlg.close === "function" ? function () { dlg.close(); } : function () { editor.closeCurrentPopup(); };
        var wrap = append(dlg, "div", "", "rte-chip-dialog rte-chip-menu-dialog");
        append(wrap, "div", "", "rte-chip-dialog-copy").textContent = "Insert a date, person, or link chip into the document.";

        var typeRow = append(wrap, "div", "", "rte-chip-type-tabs");
        typeRow.setAttribute("role", "tablist");
        typeRow.setAttribute("aria-label", "Chip type");
        var types = [["date", "Date"], ["person", "Person"], ["link", "Link"]];
        var current = "date";
        var body = append(wrap, "div", "", "rte-chip-dialog-body");
        var typeButtons = {};
        types.forEach(function (t) {
            var b = append(typeRow, "button", "", "rte-chip-type-tab");
            b.type = "button"; b.textContent = t[1];
            b.setAttribute("role", "tab");
            b.setAttribute("aria-selected", t[0] === current ? "true" : "false");
            typeButtons[t[0]] = b;
            b.onclick = function () { current = t[0]; highlight(); renderBody(); };
        });
        function highlight() {
            types.forEach(function (t) {
                var active = t[0] === current;
                typeButtons[t[0]].classList.toggle("is-selected", active);
                typeButtons[t[0]].setAttribute("aria-selected", active ? "true" : "false");
            });
        }

        function renderBody() {
            body.innerHTML = "";
            if (current === "date") {
                var note = append(body, "div", "", "rte-chip-field-label");
                note.textContent = "Insert a date chip:";
                var di = append(body, "input", "", "rte-chip-input");
                di.type = "date"; di.value = isoDate(new Date(editor.__chipNow || Date.now()));
                di.setAttribute("aria-label", "Date chip value");
                addInsert(function () {
                    var p = (di.value || "").split("-");
                    if (p.length === 3) { var d = new Date(+p[0], +p[1] - 1, +p[2]); close(); insertChip("date", fmtDate(d), di.value); }
                });
            } else {
                var lbl = append(body, "div", "", "rte-chip-field-label");
                lbl.textContent = current === "person" ? "Name (or search):" : "URL:";
                var input = append(body, "input", "", "rte-chip-input");
                input.type = current === "link" ? "url" : "text";
                input.placeholder = current === "person" ? "Jane Doe" : "https://example.com";
                input.setAttribute("aria-label", current === "person" ? "Person chip name" : "Link chip URL");
                var results = append(body, "div", "", "rte-chip-results");
                results.setAttribute("role", "listbox");
                results.setAttribute("aria-label", "Chip suggestions");
                // BYOK resolver: live suggestions
                if (config.chipResolver && typeof config.chipResolver === "function") {
                    input.oninput = function () {
                        var q = input.value.trim();
                        results.innerHTML = "";
                        if (!q) return;
                        try {
                            var p = config.chipResolver(q, current);
                            if (p && p.then) p.then(function (list) {
                                results.innerHTML = "";
                                (list || []).slice(0, 6).forEach(function (it) {
                                    var r = append(results, "button", "", "rte-chip-suggestion");
                                    r.type = "button"; r.textContent = it.label || it.value;
                                    r.setAttribute("role", "option");
                                    r.onclick = function () { close(); insertChip(current, it.label || it.value, it.value || it.label, it.href); };
                                });
                            });
                        } catch (e) { /* ignore */ }
                    };
                }
                addInsert(function () {
                    var v = input.value.trim(); if (!v) { close(); return; }
                    if (current === "link") {
                        // Validate the URL: reject javascript:/data:/vbscript:/file:,
                        // prefix https:// only on bare domains, else refuse.
                        if (/^(javascript|data|vbscript|file):/i.test(v)) {
                            input.style.borderColor = "#dc2626"; input.placeholder = "Enter a valid http(s) URL"; input.value = ""; return;
                        }
                        if (!/^https?:\/\//i.test(v)) {
                            if (/^[a-z0-9.-]+\.[a-z]{2,}([\/?#].*)?$/i.test(v)) v = "https://" + v;
                            else { input.style.borderColor = "#dc2626"; input.placeholder = "Enter a valid http(s) URL"; input.value = ""; return; }
                        }
                        close();
                        insertChip("link", v.replace(/^https?:\/\//i, "").replace(/\/$/, ""), v, v);
                    } else {
                        close();
                        insertChip("person", v, v);
                    }
                });
                setTimeout(function () { input.focus(); }, 0);
            }
        }
        function addInsert(fn) {
            var foot = append(body, "div", "", "rte-chip-dialog-footer");
            var ok = append(foot, "button", "", "rte-chip-action rte-chip-action-primary");
            ok.type = "button"; ok.textContent = "Insert"; ok.onclick = fn;
        }
        highlight(); renderBody();
    };

    function injectStyles() {
        var css = [
            ".rte-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px 2px 6px;margin:0 1px;border:1px solid rgba(100,116,139,.16);border-radius:999px;background:linear-gradient(180deg,#f8fbff,#eef4ff);color:#315277;font-size:.92em;line-height:1.45;white-space:nowrap;text-decoration:none;vertical-align:baseline;cursor:default;user-select:none;box-shadow:0 1px 2px rgba(15,23,42,.06)}",
            ".rte-chip-icon{display:inline-flex;align-items:center;opacity:.9}",
            ".rte-chip-date{background:linear-gradient(180deg,#f0fdff,#e6f8fb);color:#0e7490;border-color:rgba(14,116,144,.18)}",
            ".rte-chip-person{background:linear-gradient(180deg,#f6f7ff,#eef2ff);color:#3730a3;border-color:rgba(55,48,163,.18)}",
            ".rte-chip-link{background:linear-gradient(180deg,#f5fff8,#ecfdf4);color:#15803d;border-color:rgba(21,128,61,.18);cursor:pointer}",
            ".rte-chip-link:hover{text-decoration:underline}"
        ].join("\n");
        try {
            var editdoc = editor.getDocument();
            if (!editdoc) return;
            var head = editdoc.head || (editdoc.getElementsByTagName && editdoc.getElementsByTagName("head")[0]) || editdoc.documentElement;
            if (head && !editdoc.querySelector("style[data-rte-smartchips]")) {
                var st = editdoc.createElement("style");
                st.setAttribute("data-rte-smartchips", "1");
                st.textContent = css;
                head.appendChild(st);
            }
        } catch (e) { /* ignore */ }
    }
}
