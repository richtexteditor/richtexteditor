if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-04 Equation-editor dialog. Closes the "no equation editor UI" gap
// vs CKEditor Math / Google Docs equation editor. Builds on the editor's
// existing inline-math infrastructure (editor.applyMathMarkup / renderMath /
// the .rte-math-inline markup) — this plugin only adds the authoring UX: a
// TeX input with a live KaTeX/MathJax preview, plus edit-in-place when the
// caret is already inside an equation. No renderer is bundled; the host page
// supplies KaTeX or MathJax exactly as for inline `$...$` rendering.
RTE_DefaultConfig.plugin_mathdialog = RTE_Plugin_MathDialog;

RTE_DefaultConfig.mathDialogSamples = RTE_DefaultConfig.mathDialogSamples || [
    "x^2 + y^2 = z^2",
    "\\frac{a}{b}",
    "\\sqrt{x}",
    "\\sum_{i=1}^{n} i",
    "\\int_0^1 x\\,dx",
    "\\alpha\\beta\\gamma"
];

function RTE_Plugin_MathDialog() {
    var obj = this;
    var config;
    var editor;

    obj.PluginName = "MathDialog";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        editor.attachEvent("exec_command_insertmath", function (state) {
            state.returnValue = true;
            obj.OpenMathDialog();
        });
    };

    function append(parent, tag, cssText, className) {
        var el = parent.ownerDocument.createElement(tag);
        if (cssText) el.style.cssText = cssText;
        if (className) el.className = className;
        parent.appendChild(el);
        return el;
    }

    // If the current selection sits inside an existing inline-math span, return
    // it so we can edit in place rather than insert a new equation.
    function findMathSpanAtSelection() {
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            var node = sel.getRangeAt(0).startContainer;
            var editable = editor.getEditable();
            while (node && node !== editable) {
                if (node.nodeType === 1 && node.classList && node.classList.contains("rte-math-inline")) return node;
                node = node.parentNode;
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    // Resolve a math renderer from the dialog's (host) window or its parent.
    function getRenderer(win) {
        var katex = win.katex || (win.parent && win.parent.katex);
        if (katex && typeof katex.render === "function") return { kind: "katex", katex: katex };
        var MathJax = win.MathJax || (win.parent && win.parent.MathJax);
        if (MathJax && MathJax.typesetPromise) return { kind: "mathjax", MathJax: MathJax };
        return null;
    }

    obj.OpenMathDialog = function () {
        var existing = findMathSpanAtSelection();
        var initialTex = existing ? (existing.getAttribute("data-tex") || "") : "";

        var dlg = editor.createDialog(
            (editor.getLangText && editor.getLangText("insertmathtitle")) || "Insert / edit equation",
            "rte-dialog-math"
        );
        var close = typeof dlg.close === "function" ? function () { dlg.close(); } : function () { editor.closeCurrentPopup(); };
        var win = dlg.ownerDocument.defaultView || window;

        var wrap = append(dlg, "div", "padding:14px;min-width:420px;font:13px -apple-system,Segoe UI,sans-serif");

        append(wrap, "div", "font-weight:600;margin-bottom:4px", "").innerText =
            (editor.getLangText && editor.getLangText("insertmathlabel")) || "TeX / LaTeX";
        var ta = append(wrap, "textarea",
            "width:100%;box-sizing:border-box;min-height:72px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:13px ui-monospace,Consolas,monospace;resize:vertical");
        ta.value = initialTex;
        ta.placeholder = "e.g.  x^2 + y^2 = z^2";

        // Sample chips
        var samples = append(wrap, "div", "display:flex;flex-wrap:wrap;gap:6px;margin:8px 0");
        (config.mathDialogSamples || []).forEach(function (s) {
            var chip = append(samples, "button", "font:11px ui-monospace,monospace;padding:3px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;cursor:pointer", "");
            chip.type = "button";
            chip.textContent = s;
            chip.onclick = function () { ta.value = s; updatePreview(); ta.focus(); };
        });

        append(wrap, "div", "font-weight:600;margin:10px 0 4px", "").innerText =
            (editor.getLangText && editor.getLangText("insertmathpreview")) || "Preview";
        var preview = append(wrap, "div",
            "min-height:48px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;overflow:auto;text-align:center");
        var rendererNote = append(wrap, "div", "font-size:11px;color:#94a3b8;margin-top:4px", "");

        var renderer = getRenderer(win);
        if (!renderer) {
            rendererNote.innerText = "No KaTeX/MathJax detected on the page — the equation is stored as markup and will render wherever a math renderer is loaded.";
        }

        function updatePreview() {
            var tex = ta.value;
            if (!tex.trim()) { preview.textContent = ""; return; }
            if (renderer && renderer.kind === "katex") {
                try { renderer.katex.render(tex, preview, { throwOnError: false, displayMode: false }); }
                catch (e) { preview.textContent = "⚠ " + (e && e.message ? e.message : "render error"); }
            } else if (renderer && renderer.kind === "mathjax") {
                preview.textContent = "\\(" + tex + "\\)";
                try { renderer.MathJax.typesetPromise([preview]); } catch (e) { /* ignore */ }
            } else {
                preview.textContent = "$" + tex + "$";
            }
        }
        ta.oninput = updatePreview;
        setTimeout(function () { ta.focus(); updatePreview(); }, 0);

        var footer = append(wrap, "div", "display:flex;justify-content:flex-end;gap:8px;margin-top:14px");
        var cancel = append(footer, "button", "padding:6px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer", "");
        cancel.type = "button"; cancel.textContent = "Cancel"; cancel.onclick = close;
        var ok = append(footer, "button", "padding:6px 14px;border:1px solid #1d67ba;border-radius:8px;background:#1d67ba;color:#fff;cursor:pointer", "");
        ok.type = "button"; ok.textContent = existing ? "Update" : "Insert";

        ok.onclick = function () {
            var tex = ta.value.trim();
            if (!tex) { close(); return; }
            if (existing) {
                // Edit in place: update the existing span's data-tex + text, re-render.
                existing.setAttribute("data-tex", tex);
                existing.textContent = "$" + tex + "$";
                close();
                if (editor.renderMath) editor.renderMath();
                editor.focus();
                return;
            }
            var safeTex = String(tex).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
            var safeText = String("$" + tex + "$").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            editor.insertHTML('<span class="rte-math-inline" data-tex="' + safeTex + '">' + safeText + "</span>​");
            close();
            if (editor.renderMath) editor.renderMath();
            editor.focus();
        };
    };
}
