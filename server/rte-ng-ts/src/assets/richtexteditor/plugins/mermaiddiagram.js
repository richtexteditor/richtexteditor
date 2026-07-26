if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-04 Mermaid diagram block. Closes the "diagrams-as-code" gap vs
// GitHub / GitLab / Notion / Obsidian. Authors write Mermaid text (flowcharts,
// sequence, gantt, pie, class, state…) and the block renders to SVG.
//
// No renderer is bundled (Mermaid is ~2 MB). Three tiers, mirroring the math
// plugin's "host supplies KaTeX/MathJax" approach:
//   1. config.diagramResolver(source) -> Promise<{ svg } | { imageUrl }>
//      — server-side render (e.g. Kroki) for hosts without client Mermaid.
//   2. window.mermaid (loaded by the host page) — client-side render.
//   3. neither — the source is stored + shown as a <pre> code fallback and will
//      render wherever a renderer is later available (editor.renderDiagrams()).
// The Mermaid source always round-trips in data-diagram, so the block stays
// editable and re-renderable regardless of which tier produced the output.
RTE_DefaultConfig.plugin_mermaiddiagram = RTE_Plugin_MermaidDiagram;
RTE_DefaultConfig.diagramResolver = RTE_DefaultConfig.diagramResolver || null;
RTE_DefaultConfig.diagramSamples = RTE_DefaultConfig.diagramSamples || [
    "graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Do it]\n  B -->|No| D[Skip]",
    "sequenceDiagram\n  Alice->>Bob: Hello Bob\n  Bob-->>Alice: Hi Alice",
    "pie title Pets\n  \"Dogs\" : 386\n  \"Cats\" : 85\n  \"Birds\" : 24",
    "gantt\n  title Schedule\n  dateFormat YYYY-MM-DD\n  section Phase 1\n  Spec :a1, 2026-01-01, 20d\n  Build :after a1, 30d"
];

var RTE_MermaidSeq = 0;

function RTE_Plugin_MermaidDiagram() {
    var obj = this;
    var config, editor;

    obj.PluginName = "MermaidDiagram";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        // Public API: render every diagram block via the active renderer.
        editor.renderDiagrams = function () { return obj.RenderAll(); };
        editor.attachEvent("exec_command_insertdiagram", function (state) {
            state.returnValue = true;
            obj.OpenDiagramDialog();
        });
        // Edit-in-place: double-clicking a rendered block reopens the editor.
        try {
            var ed = editor.getEditable();
            if (ed) ed.addEventListener("dblclick", function (e) {
                var b = closestDiagram(e.target, ed);
                if (b) { e.preventDefault(); obj.OpenDiagramDialog(b); }
            });
            if (ed) ed.addEventListener("click", function (e) {
                var node = e.target;
                while (node && node !== ed) {
                    if (node.nodeType === 1 && node.getAttribute && node.getAttribute("data-rte-mermaid-remove") === "1") {
                        var b = closestDiagram(node, ed);
                        if (b) {
                            e.preventDefault();
                            e.stopPropagation();
                            removeDiagram(b);
                        }
                        return;
                    }
                    node = node.parentNode;
                }
            }, true);
            if (ed) ed.addEventListener("keydown", function (e) {
                if (e.key !== "Delete" && e.key !== "Backspace") return;
                var b = findDiagramAtSelection();
                if (!b) return;
                e.preventDefault();
                removeDiagram(b);
            }, true);
        } catch (e) { /* ignore */ }
    };

    function append(parent, tag, cssText, className) {
        var el = parent.ownerDocument.createElement(tag);
        if (cssText) el.style.cssText = cssText;
        if (className) el.className = className;
        parent.appendChild(el);
        return el;
    }
    function escAttr(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function unescAttr(s) {
        return String(s).replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
    }
    function escText(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function closestDiagram(node, editable) {
        while (node && node !== editable) {
            if (node.nodeType === 1 && node.classList && node.classList.contains("rte-mermaid")) return node;
            node = node.parentNode;
        }
        return null;
    }
    function findDiagramAtSelection() {
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) return null;
            return closestDiagram(sel.getRangeAt(0).startContainer, editor.getEditable());
        } catch (e) { return null; }
    }
    function removeDiagram(block) {
        if (!block || !block.parentNode) return;
        block.parentNode.removeChild(block);
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) { /* ignore */ }
        try { editor.focus(); } catch (e2) { /* ignore */ }
    }

    // Inject block CSS at insert/render time (the iframe head isn't ready at
    // InitEditor). head -> documentElement fallback.
    function injectStyles(doc) {
        if (!doc || doc.getElementById("rte-mermaid-styles")) return;
        var css =
            ".rte-mermaid{position:relative;display:block;margin:12px 0;padding:12px;border:1px solid #e2e8f0;border-radius:10px;" +
            "background:#fff;text-align:center;overflow:auto;}" +
            ".rte-mermaid-remove{position:absolute;top:7px;right:7px;width:24px;height:24px;border:1px solid rgba(15,23,42,.14);border-radius:999px;background:rgba(255,255,255,.96);color:#334155;font:700 13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 4px 12px rgba(15,23,42,.12);opacity:0;cursor:pointer;transition:opacity 120ms,border-color 120ms,color 120ms;}" +
            ".rte-mermaid:hover .rte-mermaid-remove,.rte-mermaid-remove:focus{opacity:1;}" +
            ".rte-mermaid-remove:hover{border-color:rgba(220,38,38,.38);color:#b91c1c;}" +
            ".rte-mermaid svg{max-width:100%;height:auto;}" +
            ".rte-mermaid .rte-mermaid-src{display:block;text-align:left;white-space:pre;overflow:auto;" +
            "font:12px ui-monospace,Consolas,monospace;color:#334155;background:#f8fafc;border-radius:6px;padding:10px;margin:0;}" +
            ".rte-mermaid .rte-mermaid-err{color:#b91c1c;font:12px ui-monospace,monospace;text-align:left;}";
        var style = doc.createElement("style");
        style.id = "rte-mermaid-styles";
        style.appendChild(doc.createTextNode(css));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(style);
    }

    function getMermaid(win) {
        try { return win.mermaid || (win.parent && win.parent.mermaid) || null; } catch (e) { return null; }
    }

    // Normalize mermaid.render across v8/v9 (string return) and v10+ (promise).
    function mermaidRender(mermaid, id, src) {
        return new Promise(function (resolve, reject) {
            try {
                var r = mermaid.render(id, src);
                if (r && typeof r.then === "function") r.then(function (o) { resolve(o && o.svg ? o.svg : o); }, reject);
                else if (typeof r === "string") resolve(r);
                else reject(new Error("Unsupported Mermaid API"));
            } catch (e) { reject(e); }
        });
    }

    // Render `source` into `target` (a .rte-mermaid-render container) using the
    // best available tier. Returns a Promise that always resolves.
    function renderInto(target, source) {
        var doc = target.ownerDocument;
        var win = doc.defaultView || window;
        function fallback(msg) {
            target.innerHTML = "";
            var pre = doc.createElement("pre");
            pre.className = "rte-mermaid-src";
            pre.textContent = source;
            target.appendChild(pre);
            if (msg) { var e = doc.createElement("div"); e.className = "rte-mermaid-err"; e.textContent = msg; target.appendChild(e); }
        }
        if (typeof config.diagramResolver === "function") {
            return Promise.resolve().then(function () { return config.diagramResolver(source); }).then(function (res) {
                if (res && res.svg) { target.innerHTML = res.svg; }
                else if (res && res.imageUrl) {
                    target.innerHTML = "";
                    var img = doc.createElement("img"); img.src = res.imageUrl; img.alt = "diagram"; img.style.maxWidth = "100%";
                    target.appendChild(img);
                } else { fallback(""); }
            }).catch(function (e) { fallback(e && e.message ? e.message : "resolver error"); });
        }
        var mermaid = getMermaid(win);
        if (mermaid && typeof mermaid.render === "function") {
            var id = "rtemmd" + (++RTE_MermaidSeq);
            return mermaidRender(mermaid, id, source).then(function (svg) {
                target.innerHTML = svg;
            }).catch(function (e) { fallback(e && e.message ? e.message : "render error"); });
        }
        fallback("");
        return Promise.resolve();
    }

    // Render every diagram block in the editable. Returns the count.
    obj.RenderAll = function () {
        var editable = editor.getEditable();
        if (!editable) return 0;
        injectStyles(editor.getDocument());
        var blocks = editable.querySelectorAll(".rte-mermaid[data-diagram]");
        for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            var target = b.querySelector(".rte-mermaid-render");
            if (!target) { target = b.ownerDocument.createElement("div"); target.className = "rte-mermaid-render"; b.appendChild(target); }
            renderInto(target, unescAttr(b.getAttribute("data-diagram") || ""));
        }
        return blocks.length;
    };

    function buildBlockHTML(source, pendingId) {
        var enc = escAttr(source);
        return '<div class="rte-mermaid" data-rte-diagram="1" data-diagram="' + enc + '" contenteditable="false"' +
            (pendingId ? ' id="' + pendingId + '"' : '') + '>' +
            '<button type="button" class="rte-mermaid-remove" data-rte-mermaid-remove="1" aria-label="Remove diagram" title="Remove diagram">x</button>' +
            '<div class="rte-mermaid-render"><pre class="rte-mermaid-src">' + escText(source) + '</pre></div>' +
            '</div>';
    }

    obj.OpenDiagramDialog = function (existing) {
        if (!existing) existing = findDiagramAtSelection();
        var initial = existing ? unescAttr(existing.getAttribute("data-diagram") || "") : "";

        var dlg = editor.createDialog(
            (editor.getLangText && editor.getLangText("insertdiagramtitle")) || "Insert / edit diagram",
            "rte-dialog-diagram"
        );
        var close = typeof dlg.close === "function" ? function () { dlg.close(); } : function () { editor.closeCurrentPopup(); };
        var win = dlg.ownerDocument.defaultView || window;

        var wrap = append(dlg, "div", "padding:14px;min-width:480px;font:13px -apple-system,Segoe UI,sans-serif");
        append(wrap, "div", "font-weight:600;margin-bottom:4px").innerText =
            (editor.getLangText && editor.getLangText("insertdiagramlabel")) || "Mermaid";
        var ta = append(wrap, "textarea",
            "width:100%;box-sizing:border-box;min-height:120px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:12px ui-monospace,Consolas,monospace;resize:vertical");
        ta.value = initial;
        ta.placeholder = "graph TD\n  A --> B";

        var samples = append(wrap, "div", "display:flex;flex-wrap:wrap;gap:6px;margin:8px 0");
        (config.diagramSamples || []).forEach(function (s) {
            var chip = append(samples, "button", "font:11px ui-monospace,monospace;padding:3px 8px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;cursor:pointer");
            chip.type = "button";
            chip.textContent = (s.split("\n")[0] || "sample").slice(0, 22);
            chip.title = s;
            chip.onclick = function () { ta.value = s; updatePreview(); ta.focus(); };
        });

        append(wrap, "div", "font-weight:600;margin:10px 0 4px").innerText =
            (editor.getLangText && editor.getLangText("insertdiagrampreview")) || "Preview";
        var preview = append(wrap, "div",
            "min-height:80px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;overflow:auto;text-align:center");
        var note = append(wrap, "div", "font-size:11px;color:#94a3b8;margin-top:4px");
        if (typeof config.diagramResolver !== "function" && !getMermaid(win)) {
            note.innerText = "No Mermaid renderer detected on the page — the diagram is stored as source and will render wherever Mermaid (or config.diagramResolver) is available.";
        }

        var previewTimer = null;
        function updatePreview() {
            var src = ta.value.trim();
            if (!src) { preview.textContent = ""; return; }
            if (previewTimer) clearTimeout(previewTimer);
            previewTimer = setTimeout(function () {
                var holder = preview.ownerDocument.createElement("div");
                holder.className = "rte-mermaid-render";
                preview.innerHTML = "";
                preview.appendChild(holder);
                renderInto(holder, src);
            }, 250);
        }
        ta.oninput = updatePreview;
        setTimeout(function () { ta.focus(); updatePreview(); }, 0);

        var footer = append(wrap, "div", "display:flex;justify-content:flex-end;gap:8px;margin-top:14px");
        var cancel = append(footer, "button", "padding:6px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer");
        cancel.type = "button"; cancel.textContent = "Cancel"; cancel.onclick = close;
        var ok = append(footer, "button", "padding:6px 14px;border:1px solid #1d67ba;border-radius:8px;background:#1d67ba;color:#fff;cursor:pointer");
        ok.type = "button"; ok.textContent = existing ? "Update" : "Insert";

        ok.onclick = function () {
            var src = ta.value.trim();
            if (!src) { close(); return; }
            injectStyles(editor.getDocument());
            if (existing) {
                existing.setAttribute("data-diagram", escAttr(src));
                var target = existing.querySelector(".rte-mermaid-render");
                if (!target) { target = existing.ownerDocument.createElement("div"); target.className = "rte-mermaid-render"; existing.appendChild(target); }
                renderInto(target, src);
                close();
                editor.focus();
                return;
            }
            var pendingId = "rtemmd-pending-" + (++RTE_MermaidSeq);
            editor.insertHTML(buildBlockHTML(src, pendingId));
            close();
            try {
                var doc = editor.getDocument();
                var block = doc.getElementById(pendingId);
                if (block) {
                    block.removeAttribute("id");
                    var target = block.querySelector(".rte-mermaid-render");
                    renderInto(target, src);
                }
            } catch (e) { /* ignore */ }
            editor.focus();
        };
    };
}
