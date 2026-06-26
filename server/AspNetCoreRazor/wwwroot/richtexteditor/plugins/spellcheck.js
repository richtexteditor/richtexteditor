if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-04 Spell-check. Closes the "no spell-check UI" gap vs TinyMCE /
// CKEditor — but without bundling a dictionary or running a server of ours.
//
// Two layers:
//  1. Native: ensure the editable carries spellcheck="true" so the browser's
//     built-in checker shows red squiggles (zero infra). Toggle with
//     config.spellCheckEnabled (default true).
//  2. BYOK panel: wire config.spellCheckResolver to a service (LanguageTool,
//     Hunspell-on-server, an LLM, …) and the `spellcheck` command opens a
//     review panel listing each issue with click-to-replace suggestions:
//       config.spellCheckResolver = function (text) {
//         return fetch('/spell?t=' + encodeURIComponent(text))
//           .then(function (r) { return r.json(); });
//           // -> [{ word, offset, length, suggestions: ["...", ...] }]
//       };
RTE_DefaultConfig.plugin_spellcheck = RTE_Plugin_SpellCheck;
RTE_DefaultConfig.spellCheckResolver = RTE_DefaultConfig.spellCheckResolver || null;
if (typeof RTE_DefaultConfig.spellCheckEnabled === "undefined") RTE_DefaultConfig.spellCheckEnabled = true;

function RTE_Plugin_SpellCheck() {
    var obj = this;
    var config, editor;

    obj.PluginName = "SpellCheck";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        // Native spellcheck attribute on the editable.
        try {
            var editable = editor.getEditable && editor.getEditable();
            if (editable) editable.setAttribute("spellcheck", config.spellCheckEnabled === false ? "false" : "true");
        } catch (e) { /* ignore */ }

        editor.attachEvent("exec_command_spellcheck", function (state) {
            state.returnValue = true;
            obj.RunSpellCheck();
        });
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

    function notify(msg) {
        try { if (!editor.InvokeEventHook || !editor.InvokeEventHook("customdialog", "spellcheck", msg)) { /* fall through to toast */ } } catch (e) { }
        try {
            var editable = editor.getEditable();
            var host = editable.ownerDocument;
            var t = host.createElement("div");
            t.className = "rte-spell-toast";
            t.textContent = msg;
            host.body.appendChild(t);
            setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
        } catch (e) { /* ignore */ }
    }

    // Replace the first text-node occurrence of `word` with `replacement`.
    // Returns true on success. Skips CODE/PRE.
    function replaceFirst(word, replacement) {
        try {
            var editable = editor.getEditable();
            var editdoc = editor.getDocument();
            var walker = editdoc.createTreeWalker(editable, NodeFilter.SHOW_TEXT, null);
            var n;
            var re = new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
            while ((n = walker.nextNode())) {
                var p = n.parentNode;
                if (p && (p.nodeName === "CODE" || p.nodeName === "PRE")) continue;
                var idx = n.data.search(re);
                if (idx >= 0) {
                    n.data = n.data.substring(0, idx) + replacement + n.data.substring(idx + word.length);
                    return true;
                }
            }
        } catch (e) { /* ignore */ }
        return false;
    }

    obj.RunSpellCheck = function () {
        // No resolver → native browser spell-check only.
        if (!config.spellCheckResolver || typeof config.spellCheckResolver !== "function") {
            try {
                var editable = editor.getEditable();
                editable.setAttribute("spellcheck", "true");
                editable.focus();
            } catch (e) { }
            notify((editor.getLangText && editor.getLangText("spellchecknative")) || "Browser spell-check is on — misspellings are underlined as you type.");
            return;
        }

        var text;
        try { text = editor.getEditable().innerText || ""; } catch (e) { text = ""; }
        if (!text.trim()) { notify("Nothing to check."); return; }

        var dlg = editor.createDialog(
            (editor.getLangText && editor.getLangText("spellchecktitle")) || "Spelling",
            "rte-dialog-spell"
        );
        var close = typeof dlg.close === "function" ? function () { dlg.close(); } : function () { editor.closeCurrentPopup(); };
        var wrap = append(dlg, "div", "padding:14px;min-width:420px;max-height:60vh;overflow:auto;font:13px -apple-system,Segoe UI,sans-serif");
        var status = append(wrap, "div", "color:#64748b;margin-bottom:8px");
        status.innerText = "Checking…";
        var list = append(wrap, "div", "");

        function renderIssues(issues) {
            list.innerHTML = "";
            if (!issues || !issues.length) {
                status.innerText = (editor.getLangText && editor.getLangText("spellcheckclean")) || "No spelling issues found.";
                return;
            }
            status.innerText = issues.length + " issue" + (issues.length === 1 ? "" : "s") + " found.";
            issues.forEach(function (iss) {
                if (!iss || !iss.word) return;
                var row = append(list, "div", "padding:8px 0;border-bottom:1px solid rgba(15,23,42,.08)", "rte-spell-row");
                var head = append(row, "div", "font-weight:600;color:#b91c1c;margin-bottom:4px");
                head.textContent = iss.word;
                var sug = append(row, "div", "display:flex;flex-wrap:wrap;gap:6px");
                var suggestions = (iss.suggestions || []).slice(0, 6);
                if (!suggestions.length) {
                    append(sug, "span", "font-size:12px;color:#94a3b8").textContent = "(no suggestions)";
                }
                suggestions.forEach(function (s) {
                    var chip = append(sug, "button", "font-size:12px;padding:3px 10px;border:1px solid #cbd5e1;border-radius:14px;background:#f8fafc;cursor:pointer");
                    chip.type = "button";
                    chip.textContent = s;
                    chip.onclick = function () {
                        if (replaceFirst(iss.word, s)) {
                            row.style.opacity = "0.45";
                            head.innerHTML = esc(iss.word) + ' &rarr; <span style="color:#16a34a">' + esc(s) + "</span>";
                            sug.innerHTML = "";
                        }
                    };
                });
            });
        }

        var done = false;
        function finish(issues) { if (done) return; done = true; renderIssues(issues); }
        try {
            var p = config.spellCheckResolver(text);
            if (p && typeof p.then === "function") {
                p.then(function (r) { finish(r || []); }, function () { status.innerText = "Spell-check service error."; });
                setTimeout(function () { if (!done) { status.innerText = "Spell-check timed out."; done = true; } }, 12000);
            } else { finish(p || []); }
        } catch (e) { status.innerText = "Spell-check error."; }

        var footer = append(wrap, "div", "display:flex;justify-content:flex-end;margin-top:12px");
        var closeBtn = append(footer, "button", "padding:6px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer");
        closeBtn.type = "button"; closeBtn.textContent = "Done"; closeBtn.onclick = function () { close(); editor.focus(); };
    };

    function injectStyles() {
        var css = [
            ".rte-spell-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:#0f172a;color:#fff;padding:8px 16px;border-radius:8px;font:13px -apple-system,Segoe UI,sans-serif;z-index:2147483600;box-shadow:0 8px 24px rgba(15,23,42,.28)}",
            ".rte-spell-row:last-child{border-bottom:0}"
        ].join("\n");
        try {
            var host = (editor && editor.iframe && editor.iframe.ownerDocument) || document;
            if (!host.querySelector("style[data-rte-spellcheck]")) {
                var st = host.createElement("style");
                st.setAttribute("data-rte-spellcheck", "1");
                st.textContent = css;
                (host.head || host.documentElement).appendChild(st);
            }
        } catch (e) { /* ignore */ }
    }
}
