if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

if (!RTE_DefaultConfig.svgCode_revisionhistory) {
    RTE_DefaultConfig.svgCode_revisionhistory = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/></svg>';
}

RTE_DefaultConfig.plugin_revisionhistory = RTE_Plugin_RevisionHistory;

function RTE_Plugin_RevisionHistory() {
    var obj = this;
    var config;
    var editor;
    var dialog = null;
    var autoSnapshotTimer = null;
    var lastSnapshotHtml = "";

    obj.PluginName = "RevisionHistory";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.revisionHistoryEnabled === false) return;

        config.revisionHistoryMaxEntries = config.revisionHistoryMaxEntries || 50;
        config.revisionHistoryAutoSnapshotMs = config.revisionHistoryAutoSnapshotMs || 0;
        config.revisionHistoryUrl = config.revisionHistoryUrl || "";
        config.text_revisionhistory = config.text_revisionhistory || "Revision history";

        appendToolbarCommand("toolbar_default", "#{revisionhistory}");
        appendToolbarCommand("toolbar_full", "#{revisionhistory}");
        appendToolbarCommand("toolbar_mobile", "#{revisionhistory}");
        if ((config.controltoolbar_TEXT || "").indexOf("revisionhistory") === -1) {
            config.controltoolbar_TEXT = (config.controltoolbar_TEXT || "") + "|{revisionhistory}";
        }
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.revisionHistoryEnabled === false) return;

        editor.revisionHistory = {
            snapshot: function (label, metadata) { return snapshot(label, metadata); },
            promptAndSnapshot: function (defaultLabel) { return promptAndSnapshot(defaultLabel); },
            rename: function (id, label) { return rename(id, label); },
            list: function () { return getStore().slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }); },
            listNamed: function () {
                return getStore().slice()
                    .filter(function (e) { return e.isNamed === true; })
                    .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
            },
            get: function (id) { return findById(id); },
            restore: function (id, opts) { return restore(id, opts || {}); },
            delete: function (id) { return deleteEntry(id); },
            clear: function () { return clearAll(); },
            diff: function (idA, idB) { return diffBetween(idA, idB); },
            openBrowser: function () { openDialog(); },
            closeBrowser: function () { closeDialog(); }
        };

        editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
        editor.toolbarFactoryMap["revisionhistory"] = function (cmd) {
            return editor.createToolbarButton(cmd);
        };

        editor.attachEvent("exec_command_revisionhistory", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            openDialog();
        });

        injectStyles();
        restoreStore();
        lastSnapshotHtml = editor.getHTML ? editor.getHTML() : "";

        // Auto-snapshot on idle typing (opt-in).
        if (config.revisionHistoryAutoSnapshotMs > 0) {
            editor.getDocument().addEventListener("input", function () {
                if (autoSnapshotTimer) clearTimeout(autoSnapshotTimer);
                autoSnapshotTimer = setTimeout(function () {
                    var currentHtml = editor.getHTML();
                    if (currentHtml !== lastSnapshotHtml) {
                        snapshot("Auto", { auto: true });
                    }
                }, config.revisionHistoryAutoSnapshotMs);
            }, true);
        }

        // Keyboard shortcut: Ctrl/Cmd + Shift + H opens the browser.
        editor.getDocument().addEventListener("keydown", function (e) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "H" || e.key === "h")) {
                e.preventDefault();
                openDialog();
            }
        }, true);
    };

    function appendToolbarCommand(toolbar, item) {
        if (!config[toolbar]) return;
        if (config[toolbar].indexOf(item) !== -1) return;
        config[toolbar] = config[toolbar] + item;
    }

    function getCurrentUser() {
        if (config.currentUser && config.currentUser.id) return config.currentUser;
        return { id: "user", name: "User", color: "#64748b" };
    }

    function getStoreKey() {
        var key = config.aiToolkitPersistenceKey || "default";
        return "RTE.Revisions." + key;
    }

    function getStore() {
        if (!editor.__revisions) editor.__revisions = [];
        return editor.__revisions;
    }

    function findById(id) {
        var store = getStore();
        for (var i = 0; i < store.length; i++) if (store[i].id === id) return store[i];
        return null;
    }

    function persistStore() {
        var store = getStore();
        // Trim oldest beyond max.
        while (store.length > config.revisionHistoryMaxEntries) {
            store.shift();
        }
        try {
            if (window.localStorage) {
                window.localStorage.setItem(getStoreKey(), JSON.stringify(store));
            }
        } catch (err) {
            console.warn("revisionhistory: localStorage quota or access issue:", err && err.message);
        }
        if (config.revisionHistoryUrl) {
            sendRemote(store);
        }
    }

    function sendRemote(store) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", config.revisionHistoryUrl, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify({
                documentKey: config.aiToolkitPersistenceKey || "",
                savedAt: Date.now(),
                revisions: store
            }));
        } catch (err) {
            console.warn("revisionhistory: remote POST failed:", err);
        }
    }

    function restoreStore() {
        try {
            if (!window.localStorage) return;
            var raw = window.localStorage.getItem(getStoreKey());
            if (!raw) return;
            var parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) editor.__revisions = parsed;
        } catch (ignore) { }
    }

    function snapshot(label, metadata) {
        var html = editor.getHTML ? editor.getHTML() : (editor.getHTMLCode ? editor.getHTMLCode() : "");
        var user = getCurrentUser();
        var trimmedLabel = (label || "").toString().slice(0, 120);
        var isNamed = trimmedLabel.length > 0 && (!metadata || metadata.auto !== true);
        var entry = {
            id: "rev-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
            html: html,
            text: editor.getText ? editor.getText() : stripHtml(html),
            label: trimmedLabel || autoLabel(),
            isNamed: isNamed,
            author: { id: user.id, name: user.name, color: user.color },
            createdAt: Date.now(),
            metadata: metadata || {}
        };
        getStore().push(entry);
        lastSnapshotHtml = html;
        persistStore();
        if (dialog && dialog.isConnected) renderDialog();
        try { if (typeof editor.fireEvent === "function") editor.fireEvent("revision_snapshot", { id: entry.id, label: entry.label, isNamed: entry.isNamed, createdAt: entry.createdAt }); } catch (e) { }
        return entry;
    }

    // Prompt the user for a snapshot name via native window.prompt, then take a snapshot.
    // Returns the entry (or null if the user cancelled).
    function promptAndSnapshot(defaultLabel) {
        var iframeDoc = editor.iframe ? editor.iframe.ownerDocument : document;
        var win = iframeDoc.defaultView || window;
        var value = win.prompt("Name this version (e.g. \"Draft sent to legal\"):", defaultLabel || "");
        if (value === null) return null;
        var trimmed = (value || "").trim();
        if (!trimmed) return null;
        return snapshot(trimmed, { user: true });
    }

    // Update the label of an existing entry. Flips `isNamed` to true so the
    // "only named versions" filter picks it up.
    function rename(id, label) {
        var entry = findById(id);
        if (!entry) return false;
        var trimmed = (label || "").toString().trim().slice(0, 120);
        if (!trimmed) return false;
        entry.label = trimmed;
        entry.isNamed = true;
        persistStore();
        if (dialog && dialog.isConnected) renderDialog();
        return true;
    }

    // Return { oldText, newText, lines } — useful for callers building their own
    // side-by-side diff UI on top of the plugin's data.
    function diffBetween(idA, idB) {
        var a = findById(idA);
        var b = findById(idB);
        if (!a || !b) return null;
        var oldText = a.text || stripHtml(a.html);
        var newText = b.text || stripHtml(b.html);
        return {
            oldEntry: a,
            newEntry: b,
            oldText: oldText,
            newText: newText,
            lines: diffLines(oldText, newText)
        };
    }

    function autoLabel() {
        var d = new Date();
        function pad(n) { return n < 10 ? "0" + n : "" + n; }
        return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }

    function restore(id, opts) {
        var entry = findById(id);
        if (!entry) return false;
        if (!opts.skipConfirm) {
            var doc = editor.iframe ? editor.iframe.ownerDocument : document;
            if (!doc.defaultView.confirm("Restore this version? Your current content will be replaced (this itself is not auto-snapshotted).")) {
                return false;
            }
        }
        if (editor.setHTMLCode) editor.setHTMLCode(entry.html);
        else if (editor.setHTML) editor.setHTML(entry.html);
        lastSnapshotHtml = entry.html;
        if (dialog && dialog.isConnected) closeDialog();
        return true;
    }

    function deleteEntry(id) {
        var store = getStore();
        for (var i = 0; i < store.length; i++) {
            if (store[i].id === id) {
                store.splice(i, 1);
                persistStore();
                if (dialog && dialog.isConnected) renderDialog();
                return true;
            }
        }
        return false;
    }

    function clearAll() {
        editor.__revisions = [];
        persistStore();
        if (dialog && dialog.isConnected) renderDialog();
    }

    // --- Simple line-based diff (Hunt–McIlroy style LCS) ---

    function diffLines(oldText, newText) {
        var a = String(oldText || "").split(/\r?\n/);
        var b = String(newText || "").split(/\r?\n/);
        var out = [];
        var lcs = computeLcs(a, b);
        var i = 0, j = 0, k = 0;
        while (i < a.length && j < b.length) {
            if (k < lcs.length && a[i] === lcs[k] && b[j] === lcs[k]) {
                out.push({ type: "eq", text: a[i] });
                i++; j++; k++;
            } else if (k < lcs.length && a[i] !== lcs[k]) {
                out.push({ type: "del", text: a[i] });
                i++;
            } else if (k < lcs.length && b[j] !== lcs[k]) {
                out.push({ type: "add", text: b[j] });
                j++;
            } else {
                // past the LCS — drain the rest
                if (i < a.length) { out.push({ type: "del", text: a[i] }); i++; }
                else if (j < b.length) { out.push({ type: "add", text: b[j] }); j++; }
            }
        }
        while (i < a.length) { out.push({ type: "del", text: a[i] }); i++; }
        while (j < b.length) { out.push({ type: "add", text: b[j] }); j++; }
        return out;
    }

    function computeLcs(a, b) {
        // O(n*m) DP. Fine for a few hundred lines; acceptable for snapshot sizes in v1.
        var m = a.length, n = b.length;
        var row = new Array(n + 1).fill(0);
        var prev = new Array(n + 1).fill(0);
        // Backpointers compacted: store length matrix fully, then walk it back.
        var len = [];
        for (var i = 0; i <= m; i++) len.push(new Array(n + 1).fill(0));
        for (var i = 1; i <= m; i++) {
            for (var j = 1; j <= n; j++) {
                if (a[i - 1] === b[j - 1]) len[i][j] = len[i - 1][j - 1] + 1;
                else len[i][j] = Math.max(len[i - 1][j], len[i][j - 1]);
            }
        }
        var out = [];
        var i = m, j = n;
        while (i > 0 && j > 0) {
            if (a[i - 1] === b[j - 1]) { out.unshift(a[i - 1]); i--; j--; }
            else if (len[i - 1][j] >= len[i][j - 1]) i--;
            else j--;
        }
        return out;
    }

    function stripHtml(html) {
        var tmp = document.createElement("div");
        tmp.innerHTML = html || "";
        return tmp.innerText || tmp.textContent || "";
    }

    // --- Dialog UI ---

    function openDialog() {
        if (dialog && dialog.isConnected) return;
        // 2026-05-28 Defense: editor.iframe may be null when revisionhistory
        // is invoked via a keyboard shortcut before InitEditor finishes wiring
        // up the iframe (e.g. customer auto-fires the shortcut on page-load).
        // Bail out cleanly rather than throw "Cannot read property
        // 'ownerDocument' of null" — the next user keypress will retry.
        if (!editor || !editor.iframe || !editor.iframe.ownerDocument) return;
        // Also: if a previous renderDialog() crashed and left `dialog` set
        // but detached, openDialog would short-circuit on isConnected=false
        // line above (correct), so explicitly null it before re-creating.
        if (dialog && !dialog.isConnected) dialog = null;
        var host = editor.iframe.ownerDocument;
        if (!host || !host.body) return;
        dialog = host.createElement("div");
        // Body-appended modal — mirror the editor's forced dark mode (automatic
        // dark is handled by a prefers-color-scheme media query in the styles).
        var __revDark = false;
        try {
            var __h = editor.container || (editor.getEditable && editor.getEditable().closest && editor.getEditable().closest(".richtexteditor"));
            __revDark = !!(__h && __h.classList && __h.classList.contains("rte-dark"));
        } catch (e) {}
        dialog.className = "rte-rev-dialog" + (__revDark ? " rte-rev-dark" : "");
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "rte-rev-dialog-title");

        var backdrop = host.createElement("div");
        backdrop.className = "rte-rev-backdrop";
        backdrop.addEventListener("mousedown", function (e) {
            if (e.target === backdrop) closeDialog();
        });

        var panel = host.createElement("div");
        panel.className = "rte-rev-panel";
        backdrop.appendChild(panel);
        dialog.appendChild(backdrop);
        host.body.appendChild(dialog);
        renderDialog();
    }

    function closeDialog() {
        if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
        dialog = null;
    }

    var dialogSelectedId = null;
    var dialogView = "preview"; // "preview" | "diff"

    function renderDialog() {
        if (!dialog) return;
        var host = dialog.ownerDocument;
        var panel = dialog.querySelector(".rte-rev-panel");
        // 2026-05-28 Defense: if the dialog DOM was tampered with externally
        // (or a previous render partially failed) `.rte-rev-panel` may be
        // missing. Bail out instead of dereferencing null on innerHTML.
        if (!panel) { closeDialog(); return; }
        panel.innerHTML = "";

        var header = host.createElement("div");
        header.className = "rte-rev-header";
        var title = host.createElement("div");
        title.id = "rte-rev-dialog-title";
        title.className = "rte-rev-title";
        title.textContent = "Revision history";
        header.appendChild(title);
        var actions = host.createElement("div");
        actions.className = "rte-rev-header-actions";
        var snapBtn = host.createElement("button");
        snapBtn.type = "button";
        snapBtn.className = "rte-rev-btn rte-rev-btn-ghost";
        snapBtn.textContent = "Save version now";
        snapBtn.addEventListener("mousedown", function (e) {
            e.preventDefault();
            var label = host.defaultView.prompt("Label this version (optional):", "");
            if (label === null) return; // cancelled
            snapshot(label || "");
        });
        actions.appendChild(snapBtn);
        var closeBtn = host.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "rte-rev-btn rte-rev-btn-ghost";
        closeBtn.textContent = "Close";
        closeBtn.setAttribute("aria-label", "Close revision history");
        closeBtn.addEventListener("mousedown", function (e) { e.preventDefault(); closeDialog(); });
        actions.appendChild(closeBtn);
        header.appendChild(actions);
        panel.appendChild(header);

        var body = host.createElement("div");
        body.className = "rte-rev-body";

        // Left: list
        var list = host.createElement("div");
        list.className = "rte-rev-list";
        list.setAttribute("role", "listbox");
        list.setAttribute("aria-label", "Saved revisions");
        var entries = editor.revisionHistory.list();
        if (!entries.length) {
            var empty = host.createElement("div");
            empty.className = "rte-rev-empty";
            empty.textContent = "No revisions yet. Click \"Save version now\" to capture the current document.";
            list.appendChild(empty);
        } else {
            if (!dialogSelectedId || !findById(dialogSelectedId)) {
                dialogSelectedId = entries[0].id;
            }
            for (var i = 0; i < entries.length; i++) {
                (function (e) {
                    var row = host.createElement("button");
                    row.type = "button";
                    row.className = "rte-rev-row" + (e.id === dialogSelectedId ? " rte-rev-row-active" : "");
                    row.setAttribute("role", "option");
                    row.setAttribute("aria-selected", e.id === dialogSelectedId ? "true" : "false");
                    var dot = host.createElement("span");
                    dot.className = "rte-rev-dot";
                    dot.style.background = (e.author && e.author.color) || "#64748b";
                    var who = host.createElement("div");
                    who.className = "rte-rev-row-who";
                    who.textContent = (e.author && e.author.name) || "User";
                    var when = host.createElement("div");
                    when.className = "rte-rev-row-when";
                    when.textContent = formatDate(e.createdAt) + " \u00B7 " + (e.label || "");
                    var col = host.createElement("div");
                    col.className = "rte-rev-row-col";
                    col.appendChild(who);
                    col.appendChild(when);
                    row.appendChild(dot);
                    row.appendChild(col);
                    row.addEventListener("mousedown", function (ev) {
                        ev.preventDefault();
                        dialogSelectedId = e.id;
                        renderDialog();
                    });
                    list.appendChild(row);
                })(entries[i]);
            }
        }
        body.appendChild(list);

        // Right: preview + diff tabs
        var pane = host.createElement("div");
        pane.className = "rte-rev-pane";
        if (entries.length) {
            var selected = findById(dialogSelectedId) || entries[0];

            var tabs = host.createElement("div");
            tabs.className = "rte-rev-tabs";
            tabs.setAttribute("role", "tablist");
            tabs.setAttribute("aria-label", "Revision view");
            var tabPreview = host.createElement("button");
            tabPreview.type = "button";
            tabPreview.className = "rte-rev-tab" + (dialogView === "preview" ? " rte-rev-tab-active" : "");
            tabPreview.setAttribute("role", "tab");
            tabPreview.setAttribute("aria-selected", dialogView === "preview" ? "true" : "false");
            tabPreview.textContent = "Preview";
            tabPreview.addEventListener("mousedown", function (e) { e.preventDefault(); dialogView = "preview"; renderDialog(); });
            var tabDiff = host.createElement("button");
            tabDiff.type = "button";
            tabDiff.className = "rte-rev-tab" + (dialogView === "diff" ? " rte-rev-tab-active" : "");
            tabDiff.setAttribute("role", "tab");
            tabDiff.setAttribute("aria-selected", dialogView === "diff" ? "true" : "false");
            tabDiff.textContent = "Diff vs current";
            tabDiff.addEventListener("mousedown", function (e) { e.preventDefault(); dialogView = "diff"; renderDialog(); });
            tabs.appendChild(tabPreview);
            tabs.appendChild(tabDiff);
            pane.appendChild(tabs);

            var content = host.createElement("div");
            content.className = "rte-rev-content";
            if (dialogView === "preview") {
                var iframe = host.createElement("iframe");
                iframe.className = "rte-rev-preview-frame";
                iframe.setAttribute("title", "Revision preview");
                iframe.setAttribute("sandbox", "allow-same-origin");
                content.appendChild(iframe);
                // Write after appending so document is available.
                setTimeout(function () {
                    try {
                        iframe.contentDocument.open();
                        iframe.contentDocument.write(
                            '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:16px;color:#0f172a;line-height:1.6}img{max-width:100%}</style></head><body>' +
                            (selected.html || "") +
                            "</body></html>"
                        );
                        iframe.contentDocument.close();
                    } catch (err) { }
                }, 0);
            } else {
                var currentText = editor.getText ? editor.getText() : stripHtml(editor.getHTML());
                var diff = diffLines(selected.text || stripHtml(selected.html), currentText);
                var diffBox = host.createElement("pre");
                diffBox.className = "rte-rev-diff";
                for (var d = 0; d < diff.length; d++) {
                    var line = host.createElement("span");
                    line.className = "rte-rev-diff-line rte-rev-diff-" + diff[d].type;
                    line.textContent = (diff[d].type === "add" ? "+ " : diff[d].type === "del" ? "- " : "  ") + diff[d].text + "\n";
                    diffBox.appendChild(line);
                }
                content.appendChild(diffBox);
            }
            pane.appendChild(content);

            var footer = host.createElement("div");
            footer.className = "rte-rev-footer";
            var labelInfo = host.createElement("div");
            labelInfo.className = "rte-rev-footer-info";
            labelInfo.textContent = selected.label ? "Label: " + selected.label : "";
            var footerBtns = host.createElement("div");
            footerBtns.className = "rte-rev-footer-btns";
            var delBtn = host.createElement("button");
            delBtn.type = "button";
            delBtn.className = "rte-rev-btn rte-rev-btn-danger";
            delBtn.textContent = "Delete";
            delBtn.addEventListener("mousedown", function (e) { e.preventDefault(); deleteEntry(selected.id); });
            var restoreBtn = host.createElement("button");
            restoreBtn.type = "button";
            restoreBtn.className = "rte-rev-btn rte-rev-btn-primary";
            restoreBtn.textContent = "Restore this version";
            restoreBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });
            restoreBtn.addEventListener("click", function (e) {
                e.preventDefault();
                restore(selected.id);
            });
            footerBtns.appendChild(delBtn);
            footerBtns.appendChild(restoreBtn);
            footer.appendChild(labelInfo);
            footer.appendChild(footerBtns);
            pane.appendChild(footer);
        }
        body.appendChild(pane);
        panel.appendChild(body);
    }

    function formatDate(ts) {
        if (!ts) return "";
        var d = new Date(ts);
        var now = new Date();
        function pad(n) { return n < 10 ? "0" + n : "" + n; }
        var time = pad(d.getHours()) + ":" + pad(d.getMinutes());
        if (d.toDateString() === now.toDateString()) return "Today " + time;
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + time;
    }

    // --- styles ---

    function injectStyles() {
        var host = (editor && editor.iframe && editor.iframe.ownerDocument) || document;
        if (host.querySelector("style[data-rte-revisionhistory]")) return;
        var style = host.createElement("style");
        style.setAttribute("data-rte-revisionhistory", "1");
        style.textContent = [
            ".rte-rev-dialog{position:fixed;inset:0;z-index:2147483600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#172033}",
            ".rte-rev-backdrop{position:absolute;inset:0;background:linear-gradient(135deg,rgba(12,18,32,.44),rgba(40,54,77,.26));display:flex;align-items:center;justify-content:center;padding:18px}",
            ".rte-rev-panel{background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);border:1px solid rgba(117,137,163,.28);border-radius:20px;width:min(960px,calc(100vw - 28px));max-height:min(82vh,740px);display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(35,48,72,.26);overflow:hidden}",
            ".rte-rev-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid rgba(117,137,163,.18);background:rgba(255,255,255,.72)}",
            ".rte-rev-title{font-size:16px;font-weight:760;letter-spacing:-.01em;color:#172033}",
            ".rte-rev-header-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
            ".rte-rev-btn{padding:8px 12px;border-radius:999px;border:1px solid rgba(116,135,162,.25);font:inherit;font-size:12px;font-weight:680;line-height:1;cursor:pointer;background:#fff;color:#223652;box-shadow:0 1px 2px rgba(32,45,66,.06);transition:background .14s ease,border-color .14s ease,box-shadow .14s ease,transform .14s ease}",
            ".rte-rev-btn:hover{background:#f5f8fc;border-color:rgba(81,111,151,.42);box-shadow:0 5px 14px rgba(32,45,66,.09);transform:translateY(-1px)}",
            ".rte-rev-btn:focus-visible{outline:2px solid rgba(56,122,255,.34);outline-offset:2px}",
            ".rte-rev-btn-ghost{background:#fff;color:#34506f}",
            ".rte-rev-btn-primary{background:linear-gradient(135deg,#2563eb,#1d67ba);color:#fff;border-color:rgba(29,103,186,.85);box-shadow:0 8px 18px rgba(37,99,235,.22)}",
            ".rte-rev-btn-primary:hover{background:linear-gradient(135deg,#1d4ed8,#195fad);color:#fff;border-color:rgba(29,78,216,.9);box-shadow:0 9px 20px rgba(37,99,235,.28)}",
            ".rte-rev-btn-danger{background:#fff5f5;color:#9f1d1d;border-color:rgba(190,45,45,.22)}",
            ".rte-rev-body{display:flex;flex:1;min-height:0;background:linear-gradient(90deg,#f8fbff 0%,#fff 42%)}",
            ".rte-rev-list{width:258px;flex:0 0 258px;border-right:1px solid rgba(117,137,163,.18);overflow-y:auto;background:rgba(244,248,253,.78);padding:10px}",
            ".rte-rev-empty{padding:16px;border:1px dashed rgba(99,118,145,.28);border-radius:14px;background:#fff;color:#5b6c81;font-size:12px;line-height:1.5}",
            ".rte-rev-row{display:flex;align-items:center;gap:10px;width:100%;padding:10px;border:1px solid transparent;border-radius:14px;background:transparent;text-align:left;cursor:pointer;font:inherit;color:inherit}",
            ".rte-rev-row:hover{background:#fff;border-color:rgba(93,122,161,.24);box-shadow:0 8px 18px rgba(33,48,70,.08)}",
            ".rte-rev-row-active{background:#eef6ff;border-color:rgba(37,99,235,.28);box-shadow:0 8px 22px rgba(37,99,235,.12)}",
            ".rte-rev-dot{width:9px;height:9px;border-radius:50%;flex:0 0 9px;box-shadow:0 0 0 3px rgba(255,255,255,.95),0 0 0 4px rgba(96,116,140,.18)}",
            ".rte-rev-row-col{flex:1;min-width:0}",
            ".rte-rev-row-who{font-weight:720;font-size:12px;line-height:1.25;color:#172033}",
            ".rte-rev-row-when{margin-top:2px;font-size:11px;color:#637487;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
            ".rte-rev-pane{flex:1;display:flex;flex-direction:column;min-width:0;padding:10px}",
            ".rte-rev-tabs{display:flex;align-self:flex-start;gap:3px;padding:3px;margin:0 0 10px;border:1px solid rgba(117,137,163,.2);border-radius:999px;background:#eef3f8}",
            ".rte-rev-tab{padding:7px 12px;border:0;border-radius:999px;background:transparent;font:inherit;font-size:12px;font-weight:680;color:#637487;cursor:pointer}",
            ".rte-rev-tab:hover{color:#1d3557;background:rgba(255,255,255,.58)}",
            ".rte-rev-tab:focus-visible{outline:2px solid rgba(56,122,255,.34);outline-offset:2px}",
            ".rte-rev-tab-active{color:#163966;background:#fff;box-shadow:0 2px 7px rgba(35,48,72,.08)}",
            ".rte-rev-content{flex:1;overflow:auto;padding:0;border:1px solid rgba(117,137,163,.18);border-radius:16px;background:#fff;min-height:300px}",
            ".rte-rev-preview-frame{width:100%;height:100%;min-height:330px;border:0;display:block;background:#fff}",
            ".rte-rev-diff{margin:0;padding:14px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.55;white-space:pre-wrap;color:#172033;background:#fbfdff;min-height:100%}",
            ".rte-rev-diff-line{display:block}",
            ".rte-rev-diff-add{background:#e8f8ef;color:#17633f}",
            ".rte-rev-diff-del{background:#fff0f0;color:#9f1d1d}",
            ".rte-rev-diff-eq{color:#556575}",
            ".rte-rev-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0 0;background:transparent}",
            ".rte-rev-footer-info{font-size:12px;color:#637487;min-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
            ".rte-rev-footer-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}",
            "@media(max-width:720px){.rte-rev-backdrop{padding:10px;align-items:flex-start}.rte-rev-panel{width:calc(100vw - 20px);max-height:calc(100vh - 20px);border-radius:16px}.rte-rev-header{align-items:flex-start;flex-direction:column}.rte-rev-body{flex-direction:column}.rte-rev-list{width:auto;flex:0 0 auto;max-height:178px;border-right:0;border-bottom:1px solid rgba(117,137,163,.18)}.rte-rev-pane{min-height:360px}.rte-rev-footer{align-items:stretch;flex-direction:column}.rte-rev-footer-info{white-space:normal}.rte-rev-footer-btns{justify-content:stretch}.rte-rev-footer-btns .rte-rev-btn{flex:1}}",
            // Dark mode — modal is body-appended; auto via prefers-color-scheme +
            // explicit .rte-rev-dark class when the editor is forced dark. The
            // preview iframe stays white (it renders the actual document).
            "@media (prefers-color-scheme:dark){",
            "  .rte-rev-dialog{color:#e2e8f0}",
            "  .rte-rev-panel{background:linear-gradient(180deg,#1e293b,#0f172a);border-color:#334155}",
            "  .rte-rev-header{background:rgba(30,41,59,.72);border-color:#334155}",
            "  .rte-rev-title,.rte-rev-row-who{color:#e2e8f0}",
            "  .rte-rev-btn,.rte-rev-btn-ghost{background:#0f172a;color:#cbd5e1;border-color:#334155}",
            "  .rte-rev-btn:hover{background:#334155}",
            "  .rte-rev-btn-primary,.rte-rev-btn-primary:hover{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-color:#3b82f6}",
            "  .rte-rev-body{background:#0f172a}",
            "  .rte-rev-list{background:rgba(15,23,42,.6);border-color:#334155}",
            "  .rte-rev-empty{background:#1e293b;color:#94a3b8;border-color:#334155}",
            "  .rte-rev-row:hover{background:#1e293b;border-color:#334155}",
            "  .rte-rev-row-active{background:#1e3a8a;border-color:#3b82f6}",
            "  .rte-rev-row-when,.rte-rev-footer-info{color:#94a3b8}",
            "  .rte-rev-tabs{background:#1e293b;border-color:#334155}",
            "  .rte-rev-tab{color:#94a3b8}.rte-rev-tab-active{color:#fff;background:#1d4ed8}",
            "  .rte-rev-diff{background:#0f172a;color:#cbd5e1}.rte-rev-diff-eq{color:#94a3b8}",
            "  .rte-rev-diff-add{background:rgba(16,185,129,.16);color:#6ee7b7}",
            "  .rte-rev-diff-del{background:rgba(244,63,94,.16);color:#fda4af}",
            "}",
            ".rte-rev-dark{color:#e2e8f0}",
            ".rte-rev-dark .rte-rev-panel{background:linear-gradient(180deg,#1e293b,#0f172a);border-color:#334155}",
            ".rte-rev-dark .rte-rev-header{background:rgba(30,41,59,.72);border-color:#334155}",
            ".rte-rev-dark .rte-rev-title,.rte-rev-dark .rte-rev-row-who{color:#e2e8f0}",
            ".rte-rev-dark .rte-rev-btn,.rte-rev-dark .rte-rev-btn-ghost{background:#0f172a;color:#cbd5e1;border-color:#334155}",
            ".rte-rev-dark .rte-rev-btn:hover{background:#334155}",
            ".rte-rev-dark .rte-rev-btn-primary,.rte-rev-dark .rte-rev-btn-primary:hover{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;border-color:#3b82f6}",
            ".rte-rev-dark .rte-rev-body{background:#0f172a}",
            ".rte-rev-dark .rte-rev-list{background:rgba(15,23,42,.6);border-color:#334155}",
            ".rte-rev-dark .rte-rev-empty{background:#1e293b;color:#94a3b8;border-color:#334155}",
            ".rte-rev-dark .rte-rev-row:hover{background:#1e293b;border-color:#334155}",
            ".rte-rev-dark .rte-rev-row-active{background:#1e3a8a;border-color:#3b82f6}",
            ".rte-rev-dark .rte-rev-row-when,.rte-rev-dark .rte-rev-footer-info{color:#94a3b8}",
            ".rte-rev-dark .rte-rev-tabs{background:#1e293b;border-color:#334155}",
            ".rte-rev-dark .rte-rev-tab{color:#94a3b8}.rte-rev-dark .rte-rev-tab-active{color:#fff;background:#1d4ed8}",
            ".rte-rev-dark .rte-rev-diff{background:#0f172a;color:#cbd5e1}.rte-rev-dark .rte-rev-diff-eq{color:#94a3b8}",
            ".rte-rev-dark .rte-rev-diff-add{background:rgba(16,185,129,.16);color:#6ee7b7}",
            ".rte-rev-dark .rte-rev-diff-del{background:rgba(244,63,94,.16);color:#fda4af}"
        ].join("\n");
        host.head.appendChild(style);
    }
}
