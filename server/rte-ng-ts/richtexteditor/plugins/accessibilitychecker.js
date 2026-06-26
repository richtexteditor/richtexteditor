if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

RTE_DefaultConfig.plugin_accessibilitychecker = RTE_Plugin_AccessibilityChecker;

function RTE_Plugin_AccessibilityChecker() {
    var obj = this;
    var config;
    var editor;
    var shell = null;
    var panel = null;
    var list = null;
    var empty = null;
    var detail = null;
    var refreshTimer = 0;
    var lastResult = null;
    var selectedIssueIndex = -1;

    obj.PluginName = "AccessibilityChecker";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.accessibilityCheckerEnabled === false) return;

        if (typeof config.accessibilityCheckerAutoOpen !== "boolean") config.accessibilityCheckerAutoOpen = false;
        config.accessibilityCheckerTitle = config.accessibilityCheckerTitle || "Accessibility";
        config.accessibilityCheckerHint = config.accessibilityCheckerHint || "Review heading structure, image alt text, and table headers without leaving the editor.";
        config.accessibilityCheckerEmptyText = config.accessibilityCheckerEmptyText || "No accessibility issues found in the current document.";

        appendToolbarCommand("toolbar_default", "#{accessibilitychecker}");
        appendToolbarCommand("toolbar_full", "#{accessibilitychecker}");
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.accessibilityCheckerEnabled === false) return;

        editor.accessibilityChecker = {
            close: function () { closePanel(); },
            getIssues: function () { return lastResult ? lastResult.issues.slice() : []; },
            open: function () { openPanel(); },
            refresh: function () { return runAudit(); },
            repair: function (issueIndex, options) { return repairIssue(issueIndex, options); },
            run: function () { return runAudit(); },
            toggle: function () { togglePanel(); }
        };

        injectStyles();

        editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
        editor.toolbarFactoryMap["accessibilitychecker"] = function (cmd) {
            return editor.createToolbarButton(cmd);
        };

        editor.attachEvent("exec_command_accessibilitychecker", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            togglePanel();
        });
        editor.attachEvent("change", function () {
            scheduleRefresh();
        });

        ensureShell();
        runAudit();
        if (config.accessibilityCheckerAutoOpen) openPanel();
    };

    function appendToolbarCommand(toolbar, item) {
        if (!config[toolbar]) return;
        if (config[toolbar].indexOf(item) !== -1) return;
        config[toolbar] = config[toolbar] + item;
    }

    function injectStyles() {
        var hostDoc = config.container.ownerDocument;
        if (hostDoc.getElementById("rte-accessibility-checker-style")) return;
        var style = hostDoc.createElement("style");
        style.id = "rte-accessibility-checker-style";
        style.innerHTML = [
            ".rte-a11y-shell{display:flex;align-items:stretch;gap:10px;}",
            ".rte-a11y-shell>.rte-a11y-host{flex:1 1 auto;min-width:0;}",
            ".rte-a11y-panel{display:none;flex:0 0 310px;min-width:270px;max-width:min(360px,32vw);border:1px solid rgba(148,163,184,.22);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.96));box-shadow:0 18px 42px rgba(29,78,216,.12),0 2px 8px rgba(15,23,42,.06);overflow:hidden;color:#172033;font-family:Aptos,'Segoe UI',sans-serif;}",
            ".rte-a11y-shell.is-open>.rte-a11y-panel{display:flex;flex-direction:column;}",
            ".rte-a11y-header{padding:12px 12px 9px 14px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.72);}",
            ".rte-a11y-kicker{font-size:10px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;color:#52657e;font-weight:850;}",
            ".rte-a11y-title{margin-top:3px;font-size:15px;line-height:1.2;font-weight:850;color:#172033;}",
            ".rte-a11y-copy{margin-top:5px;font-size:12px;line-height:1.42;color:#52657e;}",
            ".rte-a11y-toolbar{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 8px 14px;border-bottom:1px solid rgba(148,163,184,.16);gap:10px;background:rgba(255,255,255,.52);}",
            ".rte-a11y-count{min-width:0;font-size:12px;font-weight:750;color:#52657e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".rte-a11y-actions{display:flex;align-items:center;gap:6px;}",
            ".rte-a11y-link{appearance:none;border:1px solid rgba(100,116,139,.18);background:#fff;color:#315277;cursor:pointer;font-size:12px;font-weight:750;padding:6px 9px;border-radius:999px;line-height:1;}",
            ".rte-a11y-link:hover,.rte-a11y-link:focus-visible{background:#eef4ff;color:#0f3f9f;border-color:rgba(37,99,235,.28);}",
            ".rte-a11y-body{padding:6px;overflow:auto;min-height:160px;max-height:560px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin;}",
            ".rte-a11y-list{display:flex;flex-direction:column;gap:6px;}",
            ".rte-a11y-item{appearance:none;width:100%;text-align:left;border:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.84);cursor:pointer;border-radius:14px;padding:10px;box-shadow:0 8px 18px rgba(15,23,42,.04);transition:background 160ms ease,box-shadow 160ms ease,transform 160ms ease;}",
            ".rte-a11y-item:hover,.rte-a11y-item:focus-visible{background:#f8fbff;border-color:rgba(37,99,235,.24);}",
            ".rte-a11y-item.is-active{border-color:rgba(37,99,235,.36);background:#eef4ff;box-shadow:0 12px 28px rgba(37,99,235,.14);transform:translateY(-1px);}",
            ".rte-a11y-item-top{display:flex;align-items:center;justify-content:space-between;gap:10px;}",
            ".rte-a11y-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:10px;line-height:1;font-weight:850;letter-spacing:.08em;text-transform:uppercase;}",
            ".rte-a11y-badge-warning{background:#fff8e8;color:#92400e;border:1px solid rgba(245,158,11,.18);}",
            ".rte-a11y-badge-error{background:#fff1f2;color:#9f1239;border:1px solid rgba(159,18,57,.18);}",
            ".rte-a11y-code{font-size:11px;color:#64748b;font-family:Consolas,'Cascadia Mono',monospace;}",
            ".rte-a11y-message{margin-top:7px;font-size:13px;line-height:1.42;color:#172033;}",
            ".rte-a11y-detail{border:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.86);border-radius:14px;padding:11px;display:flex;flex-direction:column;gap:9px;box-shadow:0 8px 18px rgba(15,23,42,.04);}",
            ".rte-a11y-detail-title{font-size:13px;font-weight:850;color:#172033;}",
            ".rte-a11y-detail-copy{font-size:12px;line-height:1.45;color:#52657e;}",
            ".rte-a11y-field{display:flex;flex-direction:column;gap:6px;}",
            ".rte-a11y-label{font-size:10px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;color:#52657e;font-weight:850;}",
            ".rte-a11y-input{width:100%;border:1px solid rgba(148,163,184,.24);border-radius:12px;padding:9px 10px;font-size:13px;line-height:1.4;box-sizing:border-box;background:#fff;}",
            ".rte-a11y-input:focus{outline:2px solid rgba(37,99,235,.18);border-color:rgba(37,99,235,.38);}",
            ".rte-a11y-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}",
            ".rte-a11y-button{appearance:none;border:1px solid #1d67ba;border-radius:999px;background:#1d67ba;color:#fff;padding:8px 12px;font-size:12px;font-weight:750;cursor:pointer;box-shadow:0 8px 16px rgba(29,103,186,.18);}",
            ".rte-a11y-button-secondary{background:#fff;color:#315277;border-color:rgba(100,116,139,.18);box-shadow:none;}",
            ".rte-a11y-button:hover,.rte-a11y-button:focus-visible{transform:translateY(-1px);}",
            ".rte-a11y-empty{padding:14px;border-radius:14px;background:#fff;color:#52657e;font-size:13px;font-weight:700;line-height:1.55;border:1px dashed rgba(148,163,184,.34);}",
            "@media (max-width: 1420px){.rte-a11y-shell{display:block;}.rte-a11y-panel{margin-top:12px;max-width:none;width:100%;}.rte-a11y-body{max-height:360px;}}"
        ].join("");
        hostDoc.head.appendChild(style);
    }

    function ensureShell() {
        if (shell) return shell;
        var container = config.container;
        var hostDoc = container.ownerDocument;
        shell = hostDoc.createElement("div");
        shell.className = "rte-a11y-shell";

        var host = hostDoc.createElement("div");
        host.className = "rte-a11y-host";

        var parent = container.parentNode;
        parent.insertBefore(shell, container);
        shell.appendChild(host);
        host.appendChild(container);

        panel = hostDoc.createElement("aside");
        panel.className = "rte-a11y-panel";
        panel.setAttribute("aria-label", config.accessibilityCheckerTitle);
        panel.setAttribute("role", "complementary");

        var header = hostDoc.createElement("div");
        header.className = "rte-a11y-header";
        header.innerHTML = '<div class="rte-a11y-kicker">Accessibility</div><div class="rte-a11y-title"></div><div class="rte-a11y-copy"></div>';
        header.querySelector(".rte-a11y-title").innerText = config.accessibilityCheckerTitle;
        header.querySelector(".rte-a11y-copy").innerText = config.accessibilityCheckerHint;

        var toolbar = hostDoc.createElement("div");
        toolbar.className = "rte-a11y-toolbar";
        toolbar.innerHTML = '<div class="rte-a11y-count" data-rte-a11y-count="1"></div><div class="rte-a11y-actions"><button type="button" class="rte-a11y-link" data-rte-a11y-refresh="1">Refresh</button><button type="button" class="rte-a11y-link" data-rte-a11y-close="1" aria-label="Hide accessibility checker">Hide</button></div>';
        toolbar.querySelector("[data-rte-a11y-refresh]").onclick = function () { runAudit(); };
        toolbar.querySelector("[data-rte-a11y-close]").onclick = function () { closePanel(); };

        var body = hostDoc.createElement("div");
        body.className = "rte-a11y-body";
        list = hostDoc.createElement("div");
        list.className = "rte-a11y-list";
        empty = hostDoc.createElement("div");
        empty.className = "rte-a11y-empty";
        empty.innerText = config.accessibilityCheckerEmptyText;
        detail = hostDoc.createElement("div");
        detail.className = "rte-a11y-detail";
        body.appendChild(list);
        body.appendChild(empty);
        body.appendChild(detail);

        panel.appendChild(header);
        panel.appendChild(toolbar);
        panel.appendChild(body);
        shell.appendChild(panel);
        return shell;
    }

    function togglePanel() {
        if (shell && shell.classList.contains("is-open")) closePanel();
        else openPanel();
    }

    function openPanel() {
        ensureShell();
        shell.classList.add("is-open");
        renderPanel();
        notifyResize();
    }

    function closePanel() {
        if (!shell) return;
        shell.classList.remove("is-open");
        notifyResize();
    }

    // Opening / closing the panel changes the editor's available width. Editors
    // that size their toolbar / editable on a width recompute (responsive wrap,
    // sticky-toolbar geometry) need a nudge to re-lay-out for the new width —
    // otherwise a fixed-width or sticky toolbar can appear stale or doubled.
    // A resize notification is a harmless no-op when the editor is already fluid.
    function notifyResize() {
        var fire = function () {
            try { if (editor && typeof editor.fireEvent === "function") editor.fireEvent("resize"); } catch (e) {}
            try { if (editor && typeof editor.updateLayout === "function") editor.updateLayout(); } catch (e) {}
            try {
                var hostDoc = config.container.ownerDocument;
                var win = hostDoc.defaultView || window;
                win.dispatchEvent(new win.Event("resize"));
            } catch (e) {}
        };
        fire();
        var raf = (typeof requestAnimationFrame === "function") ? requestAnimationFrame : function (f) { return setTimeout(f, 16); };
        raf(fire);
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () {
            runAudit();
        }, 120);
    }

    function runAudit() {
        ensureShell();
        var ctor = window.RichTextEditor;
        var documentModel = editor.getJSON ? editor.getJSON() : null;
        lastResult = ctor && typeof ctor.auditAccessibility === "function"
            ? ctor.auditAccessibility(documentModel)
            : auditDomAccessibility();
        if (!lastResult.issues.length) selectedIssueIndex = -1;
        else if (selectedIssueIndex < 0 || selectedIssueIndex >= lastResult.issues.length) selectedIssueIndex = 0;
        renderPanel();
        return lastResult;
    }

    function repairIssue(issueIndex, options) {
        if (!lastResult || !lastResult.issues || !lastResult.issues[issueIndex]) return runAudit();
        var ctor = window.RichTextEditor;
        if (!ctor || typeof ctor.repairAccessibilityIssue !== "function") return repairDomIssue(lastResult.issues[issueIndex], options || {});
        var nextDocument = ctor.repairAccessibilityIssue(editor.getJSON(), lastResult.issues[issueIndex], options || {});
        editor.setJSON(nextDocument);
        selectedIssueIndex = issueIndex;
        return runAudit();
    }

    function focusIssue(issue) {
        if (!issue) return;
        if (issue._target && typeof issue._target.scrollIntoView === "function") {
            issue._target.scrollIntoView({ behavior: "smooth", block: "center" });
            editor.focus();
            return;
        }
        var editable = editor.getEditable ? editor.getEditable() : null;
        if (!editable) return;
        var match = /^content\[(\d+)\]/.exec(issue.path || "");
        if (!match) return;
        var targetIndex = parseInt(match[1], 10);
        var nodes = [];
        for (var index = 0; index < editable.childNodes.length; index++) {
            if (editable.childNodes[index] && editable.childNodes[index].nodeType === 1) {
                nodes.push(editable.childNodes[index]);
            }
        }
        var target = nodes[targetIndex];
        if (target && typeof target.scrollIntoView === "function") {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        editor.focus();
    }

    function auditDomAccessibility() {
        var editable = editor.getEditable ? editor.getEditable() : null;
        var issues = [];
        if (!editable) return { document: null, issues: issues, valid: true, source: "dom" };

        var blocks = [];
        for (var blockIndex = 0; blockIndex < editable.childNodes.length; blockIndex++) {
            var block = editable.childNodes[blockIndex];
            if (!block || block.nodeType !== 1) continue;
            blocks.push(block);
        }

        var previousHeadingLevel = 0;
        for (var index = 0; index < blocks.length; index++) {
            var node = blocks[index];
            var tag = String(node.nodeName || "").toLowerCase();
            var path = "content[" + index + "]";

            if (/^h[1-6]$/.test(tag)) {
                var level = parseInt(tag.substring(1), 10);
                var headingText = getText(node);
                if (!headingText) {
                    issues.push({
                        code: "heading-empty",
                        severity: "warning",
                        message: "Heading is empty. Add a concise label or remove the heading.",
                        path: path,
                        _target: node
                    });
                }
                if (previousHeadingLevel && level > previousHeadingLevel + 1) {
                    issues.push({
                        code: "heading-level-skip",
                        severity: "warning",
                        message: "Heading jumps from H" + previousHeadingLevel + " to H" + level + ". Use the next heading level for a clearer outline.",
                        path: path + ".attrs.level",
                        _target: node
                    });
                }
                if (headingText) previousHeadingLevel = level;
            }

            var images = node.querySelectorAll ? node.querySelectorAll("img") : [];
            for (var imageIndex = 0; imageIndex < images.length; imageIndex++) {
                var image = images[imageIndex];
                if (!String(image.getAttribute("alt") || "").replace(/^\s+|\s+$/g, "")) {
                    issues.push({
                        code: "image-missing-alt",
                        severity: "error",
                        message: "Image is missing alt text. Describe the image or mark it decorative in your content workflow.",
                        path: path + ".image[" + imageIndex + "]",
                        _target: image
                    });
                }
            }

            var tables = tag === "table" ? [node] : (node.querySelectorAll ? node.querySelectorAll("table") : []);
            for (var tableIndex = 0; tableIndex < tables.length; tableIndex++) {
                var table = tables[tableIndex];
                if (!table.querySelector("th")) {
                    issues.push({
                        code: "table-missing-header",
                        severity: "warning",
                        message: "Table has no header cells. Promote the first row to headers when it describes the columns.",
                        path: path + ".table[" + tableIndex + "]",
                        _target: table
                    });
                }
            }
        }

        return { document: null, issues: issues, valid: !issues.length, source: "dom" };
    }

    function repairDomIssue(issue, options) {
        if (!issue || !issue._target) return runAudit();
        var target = issue._target;

        if (issue.code === "image-missing-alt") {
            target.setAttribute("alt", String(options.altText || "").replace(/^\s+|\s+$/g, ""));
        }
        else if (issue.code === "heading-empty") {
            target.textContent = String(options.headingText || "").replace(/^\s+|\s+$/g, "");
        }
        else if (issue.code === "heading-level-skip") {
            var level = Math.max(1, Math.min(6, parseInt(options.targetLevel, 10) || 2));
            var replacement = target.ownerDocument.createElement("h" + level);
            while (target.firstChild) replacement.appendChild(target.firstChild);
            copyAttributes(target, replacement);
            target.parentNode.replaceChild(replacement, target);
        }
        else if (issue.code === "table-missing-header") {
            promoteFirstTableRow(target);
        }

        selectedIssueIndex = 0;
        scheduleEditorChange();
        return runAudit();
    }

    function promoteFirstTableRow(table) {
        var firstRow = table && table.rows && table.rows.length ? table.rows[0] : null;
        if (!firstRow) return;
        var doc = table.ownerDocument;
        for (var index = 0; index < firstRow.cells.length; index++) {
            var cell = firstRow.cells[index];
            if (!cell || String(cell.nodeName || "").toLowerCase() === "th") continue;
            var header = doc.createElement("th");
            while (cell.firstChild) header.appendChild(cell.firstChild);
            copyAttributes(cell, header);
            header.setAttribute("scope", "col");
            firstRow.replaceChild(header, cell);
        }
    }

    function copyAttributes(source, target) {
        if (!source || !target || !source.attributes) return;
        for (var index = 0; index < source.attributes.length; index++) {
            var attr = source.attributes[index];
            if (!attr || !attr.name) continue;
            target.setAttribute(attr.name, attr.value);
        }
    }

    function scheduleEditorChange() {
        try { if (editor && typeof editor.fireEvent === "function") editor.fireEvent("change"); } catch (e) {}
        try { if (editor && typeof editor.fireEvent === "function") editor.fireEvent("contentchange"); } catch (e) {}
    }

    function getText(node) {
        return String((node && (node.innerText || node.textContent)) || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    }

    function renderPanel() {
        ensureShell();
        var issues = lastResult && lastResult.issues ? lastResult.issues : [];
        while (list.firstChild) list.removeChild(list.firstChild);

        var count = panel.querySelector("[data-rte-a11y-count]");
        if (count) {
            count.innerText = issues.length
                ? (issues.length + " issue" + (issues.length === 1 ? "" : "s") + " to review")
                : "Ready to publish";
        }

        empty.style.display = issues.length ? "none" : "block";

        for (var index = 0; index < issues.length; index++) {
            (function (issue, issueIndex) {
                var button = panel.ownerDocument.createElement("button");
                button.type = "button";
                button.className = "rte-a11y-item" + (issueIndex === selectedIssueIndex ? " is-active" : "");
                button.setAttribute("aria-selected", issueIndex === selectedIssueIndex ? "true" : "false");
                button.innerHTML =
                    '<div class="rte-a11y-item-top">' +
                    '<span class="rte-a11y-badge rte-a11y-badge-' + issue.severity + '">' + issue.severity + '</span>' +
                    '<span class="rte-a11y-code">' + issue.code + '</span>' +
                    "</div>" +
                    '<div class="rte-a11y-message"></div>';
                button.querySelector(".rte-a11y-message").innerText = issue.message;
                button.onclick = function () {
                    selectedIssueIndex = issueIndex;
                    focusIssue(issue);
                    renderPanel();
                };
                list.appendChild(button);
            })(issues[index], index);
        }

        renderDetail();
    }

    function renderDetail() {
        while (detail.firstChild) detail.removeChild(detail.firstChild);

        var issues = lastResult && lastResult.issues ? lastResult.issues : [];
        if (!issues.length || selectedIssueIndex < 0 || !issues[selectedIssueIndex]) {
            detail.innerHTML = '<div class="rte-a11y-detail-title">No fixes pending</div><div class="rte-a11y-detail-copy">Run the checker again after major content changes to keep headings, image descriptions, and tables in shape.</div>';
            return;
        }

        var issue = issues[selectedIssueIndex];
        var title = detail.ownerDocument.createElement("div");
        title.className = "rte-a11y-detail-title";
        title.innerText = issue.code;
        var copy = detail.ownerDocument.createElement("div");
        copy.className = "rte-a11y-detail-copy";
        copy.innerText = issue.message;
        detail.appendChild(title);
        detail.appendChild(copy);

        if (issue.code === "image-missing-alt") {
            renderTextRepair("Alt text", "Describe the image for screen-reader users.", function (value) {
                repairIssue(selectedIssueIndex, { altText: value });
            });
            return;
        }

        if (issue.code === "heading-empty") {
            renderTextRepair("Heading text", "Add a concise heading label before publishing.", function (value) {
                repairIssue(selectedIssueIndex, { headingText: value });
            });
            return;
        }

        if (issue.code === "heading-level-skip") {
            var suggestedLevel = suggestHeadingLevel(issue);
            var row = detail.ownerDocument.createElement("div");
            row.className = "rte-a11y-row";
            var normalize = detail.ownerDocument.createElement("button");
            normalize.type = "button";
            normalize.className = "rte-a11y-button";
            normalize.innerText = "Normalize to H" + suggestedLevel;
            normalize.onclick = function () {
                repairIssue(selectedIssueIndex, { targetLevel: suggestedLevel });
            };
            var focus = detail.ownerDocument.createElement("button");
            focus.type = "button";
            focus.className = "rte-a11y-button rte-a11y-button-secondary";
            focus.innerText = "Focus issue";
            focus.onclick = function () { focusIssue(issue); };
            row.appendChild(normalize);
            row.appendChild(focus);
            detail.appendChild(row);
            return;
        }

        if (issue.code === "table-missing-header") {
            var actionRow = detail.ownerDocument.createElement("div");
            actionRow.className = "rte-a11y-row";
            var promote = detail.ownerDocument.createElement("button");
            promote.type = "button";
            promote.className = "rte-a11y-button";
            promote.innerText = "Promote first row to headers";
            promote.onclick = function () {
                repairIssue(selectedIssueIndex, {});
            };
            var review = detail.ownerDocument.createElement("button");
            review.type = "button";
            review.className = "rte-a11y-button rte-a11y-button-secondary";
            review.innerText = "Focus issue";
            review.onclick = function () { focusIssue(issue); };
            actionRow.appendChild(promote);
            actionRow.appendChild(review);
            detail.appendChild(actionRow);
            return;
        }

        detail.innerHTML += '<div class="rte-a11y-detail-copy">This issue is visible here, but does not have an automatic repair action yet.</div>';
    }

    function renderTextRepair(labelText, hintText, apply) {
        var field = detail.ownerDocument.createElement("div");
        field.className = "rte-a11y-field";
        var label = detail.ownerDocument.createElement("div");
        label.className = "rte-a11y-label";
        label.innerText = labelText;
        var input = detail.ownerDocument.createElement("input");
        input.type = "text";
        input.className = "rte-a11y-input";
        input.placeholder = hintText;
        var row = detail.ownerDocument.createElement("div");
        row.className = "rte-a11y-row";
        var button = detail.ownerDocument.createElement("button");
        button.type = "button";
        button.className = "rte-a11y-button";
        button.innerText = "Apply fix";
        button.onclick = function () {
            var value = String(input.value || "").replace(/^\s+|\s+$/g, "");
            if (!value) return;
            apply(value);
        };
        var focus = detail.ownerDocument.createElement("button");
        focus.type = "button";
        focus.className = "rte-a11y-button rte-a11y-button-secondary";
        focus.innerText = "Focus issue";
        focus.onclick = function () {
            var issues = lastResult && lastResult.issues ? lastResult.issues : [];
            if (issues[selectedIssueIndex]) focusIssue(issues[selectedIssueIndex]);
        };
        row.appendChild(button);
        row.appendChild(focus);
        field.appendChild(label);
        field.appendChild(input);
        detail.appendChild(field);
        detail.appendChild(row);
    }

    function suggestHeadingLevel(issue) {
        var path = (issue && issue.path ? issue.path : "").replace(/\.attrs\.level$/, "");
        var documentModel = editor.getJSON ? editor.getJSON() : null;
        if (!documentModel || !documentModel.content) return 2;
        var lastHeadingLevel = 0;

        function visit(node, nodePath) {
            if (!node || typeof node.type !== "string") return false;
            if (nodePath === path) return true;
            if (node.type === "heading" && node.attrs && typeof node.attrs.level === "number") {
                lastHeadingLevel = node.attrs.level;
            }
            if (!node.content || !node.content.length) return false;
            for (var index = 0; index < node.content.length; index++) {
                if (visit(node.content[index], nodePath + ".content[" + index + "]")) return true;
            }
            return false;
        }

        for (var rootIndex = 0; rootIndex < documentModel.content.length; rootIndex++) {
            if (visit(documentModel.content[rootIndex], "content[" + rootIndex + "]")) break;
        }

        return Math.max(1, Math.min(6, (lastHeadingLevel || 1) + (lastHeadingLevel ? 1 : 0)));
    }
}
