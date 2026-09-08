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
            "/* 2026-07-12 accessibility panel precision */",
            ".rte-a11y-panel{display:none;flex:0 0 310px;min-width:270px;max-width:min(360px,32vw);border:1px solid rgba(148,163,184,.22);border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.96));box-shadow:0 14px 32px rgba(29,78,216,.1),0 2px 8px rgba(15,23,42,.06);overflow:hidden;color:#172033;font-family:Aptos,'Segoe UI',sans-serif;}",
            ".rte-a11y-shell.is-open>.rte-a11y-panel{display:flex;flex-direction:column;}",
            ".rte-a11y-header{padding:12px 12px 9px 14px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.72);}",
            ".rte-a11y-kicker{font-size:10px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;color:#52657e;font-weight:850;}",
            ".rte-a11y-title{margin-top:3px;font-size:15px;line-height:1.2;font-weight:850;color:#172033;}",
            ".rte-a11y-copy{margin-top:5px;font-size:12px;line-height:1.42;color:#52657e;}",
            ".rte-a11y-toolbar{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 8px 14px;border-bottom:1px solid rgba(148,163,184,.16);gap:10px;background:rgba(255,255,255,.52);}",
            ".rte-a11y-count{min-width:0;font-size:12px;font-weight:750;color:#52657e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".rte-a11y-actions{display:flex;align-items:center;gap:6px;}",
            ".rte-a11y-link{appearance:none;border:1px solid rgba(100,116,139,.18);background:#fff;color:#315277;cursor:pointer;font-size:12px;font-weight:750;padding:6px 9px;border-radius:7px;line-height:1;}",
            ".rte-a11y-link:hover,.rte-a11y-link:focus-visible{background:#eef4ff;color:#0f3f9f;border-color:rgba(37,99,235,.28);}",
            ".rte-a11y-body{padding:6px;overflow:auto;min-height:160px;max-height:560px;display:flex;flex-direction:column;gap:8px;scrollbar-width:thin;}",
            ".rte-a11y-list{display:flex;flex-direction:column;gap:6px;}",
            ".rte-a11y-item{appearance:none;width:100%;text-align:left;border:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.84);cursor:pointer;border-radius:8px;padding:10px;box-shadow:0 6px 14px rgba(15,23,42,.04);transition:background 160ms ease,box-shadow 160ms ease,transform 160ms ease;}",
            ".rte-a11y-item:hover,.rte-a11y-item:focus-visible{background:#f8fbff;border-color:rgba(37,99,235,.24);}",
            ".rte-a11y-item.is-active{border-color:rgba(37,99,235,.36);background:#eef4ff;box-shadow:0 12px 28px rgba(37,99,235,.14);transform:translateY(-1px);}",
            ".rte-a11y-item-top{display:flex;align-items:center;justify-content:space-between;gap:10px;}",
            ".rte-a11y-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:10px;line-height:1;font-weight:850;letter-spacing:.08em;text-transform:uppercase;}",
            ".rte-a11y-badge-warning{background:#fff8e8;color:#92400e;border:1px solid rgba(245,158,11,.18);}",
            ".rte-a11y-badge-error{background:#fff1f2;color:#9f1239;border:1px solid rgba(159,18,57,.18);}",
            ".rte-a11y-code{font-size:11px;color:#64748b;font-family:Consolas,'Cascadia Mono',monospace;}",
            ".rte-a11y-message{margin-top:7px;font-size:13px;line-height:1.42;color:#172033;}",
            ".rte-a11y-detail{border:1px solid rgba(148,163,184,.16);background:rgba(255,255,255,.86);border-radius:8px;padding:11px;display:flex;flex-direction:column;gap:9px;box-shadow:0 6px 14px rgba(15,23,42,.04);}",
            ".rte-a11y-detail-title{font-size:13px;font-weight:850;color:#172033;}",
            ".rte-a11y-detail-copy{font-size:12px;line-height:1.45;color:#52657e;}",
            ".rte-a11y-field{display:flex;flex-direction:column;gap:6px;}",
            ".rte-a11y-label{font-size:10px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;color:#52657e;font-weight:850;}",
            ".rte-a11y-input{width:100%;border:1px solid rgba(148,163,184,.24);border-radius:7px;padding:9px 10px;font-size:13px;line-height:1.4;box-sizing:border-box;background:#fff;}",
            ".rte-a11y-input:focus{outline:2px solid rgba(37,99,235,.18);border-color:rgba(37,99,235,.38);}",
            ".rte-a11y-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}",
            ".rte-a11y-button{appearance:none;border:1px solid #1d67ba;border-radius:7px;background:#1d67ba;color:#fff;padding:8px 12px;font-size:12px;font-weight:750;cursor:pointer;box-shadow:0 6px 14px rgba(29,103,186,.16);}",
            ".rte-a11y-button-secondary{background:#fff;color:#315277;border-color:rgba(100,116,139,.18);box-shadow:none;}",
            ".rte-a11y-button:hover,.rte-a11y-button:focus-visible{transform:translateY(-1px);}",
            ".rte-a11y-empty{padding:14px;border-radius:8px;background:#fff;color:#52657e;font-size:13px;font-weight:700;line-height:1.55;border:1px dashed rgba(148,163,184,.34);}",
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
        // An issue carrying `_target` came from the DOM audit and is addressed
        // by a DOM node, not by a JSON path. Handing it to the structured-content
        // repairer looks like it works — no error, a document comes back — but
        // that repairer cannot resolve the node and returns the input unchanged,
        // so the fix silently does nothing.
        var issue = lastResult.issues[issueIndex];
        if (issue._target || lastResult.source === "dom") return repairDomIssue(issue, options || {});
        if (!ctor || typeof ctor.repairAccessibilityIssue !== "function") return repairDomIssue(issue, options || {});
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

    // ---- WCAG 3.1.2 Language of Parts -----------------------------------
    //
    // A passage in a language other than the document's must be marked, or a
    // screen reader pronounces it with the wrong phoneme set. Detecting
    // "French inside English" is a language-identification problem we are not
    // going to pretend to solve; detecting a different WRITING SYSTEM is
    // deterministic, and it catches the cases that actually break speech
    // synthesis outright (Hebrew, Arabic, Greek, Cyrillic, CJK in a Latin
    // document, and the reverse). We flag only what we can be certain of —
    // a checker that cries wolf gets switched off.
    var SCRIPTS = [
        { name: "Hebrew",   lang: "he", re: /[֐-׿]/g },
        { name: "Arabic",   lang: "ar", re: /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g },
        { name: "Greek",    lang: "el", re: /[Ͱ-Ͽἀ-῿]/g },
        { name: "Cyrillic", lang: "ru", re: /[Ѐ-ӿ]/g },
        { name: "Han",      lang: "zh", re: /[㐀-䶿一-鿿]/g },
        { name: "Kana",     lang: "ja", re: /[぀-ゟ゠-ヿ]/g },
        { name: "Hangul",   lang: "ko", re: /[가-힯ᄀ-ᇿ]/g },
        { name: "Devanagari", lang: "hi", re: /[ऀ-ॿ]/g },
        { name: "Thai",     lang: "th", re: /[฀-๿]/g },
        { name: "Latin",    lang: "en", re: /[A-Za-zÀ-ɏ]/g }
    ];

    // Below this, a "run" is more likely a stray glyph, a maths symbol or a
    // single borrowed character than a passage worth annotating.
    var MIN_SCRIPT_RUN = 4;

    // Every script present in the text with enough characters to be a passage.
    //
    // Deliberately NOT "the dominant script": a foreign phrase is by definition
    // the minority of its paragraph, so picking the most common script finds
    // the document's own language and reports nothing. "A Hebrew proverb,
    // שלום עליכם, appears mid-sentence" is 40 Latin characters and 9 Hebrew —
    // the 9 are the entire point.
    function scriptsIn(text) {
        var found = [];
        for (var i = 0; i < SCRIPTS.length; i++) {
            var m = String(text).match(SCRIPTS[i].re);
            if (m && m.length >= MIN_SCRIPT_RUN) found.push(SCRIPTS[i]);
        }
        return found;
    }

    function documentScript() {
        var editable = editor.getEditable ? editor.getEditable() : null;
        var code = (editable && editable.getAttribute("lang")) ||
                   (typeof document !== "undefined" && document.documentElement.getAttribute("lang")) || "en";
        code = String(code).toLowerCase().split("-")[0];
        for (var i = 0; i < SCRIPTS.length; i++) if (SCRIPTS[i].lang === code) return SCRIPTS[i];
        // An unlisted language tag (nl, pt, sv…) is Latin-script; defaulting to
        // Latin keeps us from flagging every English word in a Dutch document.
        return SCRIPTS[SCRIPTS.length - 1];
    }

    function hasLangAncestor(node, editable) {
        var n = (node && node.nodeType === 3) ? node.parentNode : node;
        while (n && n !== editable && n.nodeType === 1) {
            if (n.hasAttribute && n.hasAttribute("lang")) return true;
            n = n.parentNode;
        }
        return false;
    }

    function collectUnmarkedLanguageRuns(block, editable, path, issues) {
        var docScript = documentScript();
        var doc = block.ownerDocument;
        if (!doc || !doc.createTreeWalker) return;
        var walker = doc.createTreeWalker(block, 4 /* SHOW_TEXT */, null, false);
        var textNode, seen = {};
        while ((textNode = walker.nextNode())) {
            var value = textNode.nodeValue || "";
            if (!value.replace(/\s+/g, "")) continue;
            if (hasLangAncestor(textNode, editable)) continue;
            var scripts = scriptsIn(value);
            for (var s = 0; s < scripts.length; s++) {
                var script = scripts[s];
                if (script === docScript) continue;
                // One issue per script per block: a paragraph with six Hebrew
                // words is one thing to fix, not six.
                if (seen[script.name]) continue;
                seen[script.name] = true;
                issues.push({
                    code: "language-of-parts",
                    severity: "warning",
                    message: script.name + " text is not marked with a language. Select the phrase and set its " +
                             "language so assistive technology pronounces it correctly (WCAG 3.1.2).",
                    path: path + ".lang",
                    _target: block,
                    _lang: script.lang,
                    _script: script.name
                });
            }
        }
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

            // querySelectorAll only returns DESCENDANTS, so an image that is
            // itself a top-level block — which is exactly where a pasted or
            // dropped image lands in an empty editor — was never checked, and
            // missing alt text went unreported. The table rule below already
            // guards this case; the image rule did not. Measured 2026-08-27:
            // bare top-level img => 0 issues, the same img inside a <p> => 1.
            var images = tag === "img" ? [node] : (node.querySelectorAll ? node.querySelectorAll("img") : []);
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

            // 2026-09-04 A link with no accessible name is announced as just
            // "link", giving a keyboard or screen-reader user nothing to decide
            // on (WCAG 2.4.4 / 4.1.2). Reached the editor easily: an image-only
            // link whose <img> has empty alt, or a link left empty after its
            // text was deleted.
            //
            // Only elements with href are links. A bare <a name="x"> or an <a>
            // with no href is an anchor TARGET and has no name to announce, so
            // flagging it would be an error with no valid fix.
            var links = tag === "a" ? [node] : (node.querySelectorAll ? node.querySelectorAll("a") : []);
            for (var linkIndex = 0; linkIndex < links.length; linkIndex++) {
                var link = links[linkIndex];
                if (!link.getAttribute || link.getAttribute("href") === null) continue;
                if (accessibleNameOf(link)) continue;
                issues.push({
                    code: "link-empty",
                    severity: "error",
                    message: "Link has no text, so it is announced only as \"link\". Add link text, an aria-label, or alt text on the image inside it.",
                    path: path + ".link[" + linkIndex + "]",
                    _target: link
                });
            }

            var tables = tag === "table" ? [node] : (node.querySelectorAll ? node.querySelectorAll("table") : []);
            for (var tableIndex = 0; tableIndex < tables.length; tableIndex++) {
                var table = tables[tableIndex];
                var tableRole = String(table.getAttribute("role") || "").toLowerCase();
                var isLayoutTable = (tableRole === "presentation" || tableRole === "none");

                // 2026-08-30 A layout table MUST NOT have headers, so demanding
                // them here produced an error the author could never clear —
                // which is how a checker teaches people to ignore it. Presentation
                // tables are held to the opposite rule instead: they must not
                // carry data-table semantics, because <th>/scope/<caption> make a
                // screen reader announce relationships that do not exist
                // (WCAG 1.3.1). See layouttable.js.
                if (isLayoutTable) {
                    var semantic = table.querySelector("th, [scope], caption") || table.getAttribute("summary");
                    if (semantic) {
                        issues.push({
                            code: "layout-table-semantics",
                            severity: "error",
                            message: "Layout table still carries data-table markup (header cells, scope or a caption). A screen reader will announce relationships this table does not have.",
                            path: path + ".table[" + tableIndex + "]",
                            _target: table
                        });
                    }
                }
                else if (!table.querySelector("th")) {
                    issues.push({
                        code: "table-missing-header",
                        severity: "warning",
                        message: "Table has no header cells. Promote the first row to headers, or mark it as a layout table when it only positions content.",
                        path: path + ".table[" + tableIndex + "]",
                        _target: table
                    });
                }
                else {
                    // 2026-09-04 A table can HAVE headers and still be unusable if
                    // one is blank: the screen reader announces the column's name as
                    // an empty string, which is worse than no header at all because
                    // the relationship exists and says nothing (WCAG 1.3.1).
                    // `table-missing-header` above only fires when there is not a
                    // single <th>, so this case reported valid. Found by testing
                    // CKEditor issue #19204 against this checker.
                    //
                    // THE CORNER CELL IS EXEMPT. In a cross-tab - column headers
                    // across the top, row headers down the side - the top-left cell
                    // is conventionally and correctly empty; it names neither axis.
                    // Flagging it would be an error the author can only clear by
                    // inventing a word, which is how a checker teaches people to
                    // ignore it. Same reasoning that exempts layout tables above.
                    var headerCells = table.querySelectorAll("th");
                    var hasRowHeaders = false;
                    for (var probeIndex = 0; probeIndex < headerCells.length; probeIndex++) {
                        var probeRow = headerCells[probeIndex].parentNode;
                        if (probeRow && probeRow.rowIndex > 0) { hasRowHeaders = true; break; }
                    }
                    for (var headerIndex = 0; headerIndex < headerCells.length; headerIndex++) {
                        var headerCell = headerCells[headerIndex];
                        if (accessibleNameOf(headerCell)) continue;
                        var ownerRow = headerCell.parentNode;
                        if (hasRowHeaders && ownerRow && ownerRow.rowIndex === 0 && headerCell.cellIndex === 0) continue;
                        issues.push({
                            code: "table-header-empty",
                            severity: "error",
                            message: "Header cell is empty, so the column or row it labels is announced with no name. Give it text, or make it a normal cell if it labels nothing.",
                            path: path + ".table[" + tableIndex + "].th[" + headerIndex + "]",
                            _target: headerCell
                        });
                    }
                }
            }


            // 2026-09-07 COLOUR CONTRAST (WCAG 1.4.3). The most-cited criterion in
            // any accessibility audit and the checker had no rule for it -- and
            // our own comparison page once claimed one, which had to be retracted.
            //
            // Only INLINE colour is judged. Contrast against a stylesheet the
            // editor cannot see would be a guess, and a checker that guesses
            // teaches people to ignore it. Where no background is declared on the
            // element or an ancestor, white is assumed and stated in the message,
            // because that is the editing surface's own ground.
            var coloured = node.querySelectorAll ? node.querySelectorAll("[style*='color']") : [];
            var colouredList = (node.getAttribute && /(^|;)\s*color\s*:/i.test(node.getAttribute("style") || ""))
                ? [node].concat(Array.prototype.slice.call(coloured))
                : Array.prototype.slice.call(coloured);
            for (var cIndex = 0; cIndex < colouredList.length; cIndex++) {
                var cEl = colouredList[cIndex];
                var fg = parseCssColour(cEl.style && cEl.style.color);
                if (!fg) continue;
                var bg = nearestBackground(cEl);
                var ratio = contrastRatio(fg, bg.rgb);
                // 4.5:1 is the AA threshold for body text; 3:1 for large text
                // (>=18pt, or >=14pt bold). Using the body number on a heading
                // would report a failure that is not one.
                var large = isLargeText(cEl);
                var need = large ? 3 : 4.5;
                // Epsilon absorbs float noise ONLY. 0.05 was 1% of the threshold and
                // swallowed real near-misses: #777777 on white is 4.48:1, a genuine
                // failure, and went unreported. It must also not fire on a colour that
                // passes at exactly 4.5, so the comparison errs toward silence.
                if (ratio < need - 0.001) {
                    issues.push({
                        code: "contrast-insufficient",
                        severity: "error",
                        message: "Text contrast is " + ratio.toFixed(2) + ":1 against " +
                            (bg.assumed ? "an assumed white background" : "its background") +
                            ", below the " + need + ":1 needed for " +
                            (large ? "large text" : "body text") + " (WCAG 1.4.3).",
                        path: path + ".contrast[" + cIndex + "]",
                        _target: cEl
                    });
                }
            }

            // 2026-09-07 BLOCKQUOTE USED AS INDENTATION (WCAG 1.3.1). A quotation
            // element used for visual offset is announced as a quotation by screen
            // readers and exported to Word as the Quote style.
            //
            // This is OUR OWN historical output: until 2026-09-04 the indent button
            // fell through to the browser's execCommand, which wraps the block in
            // <blockquote style="margin:0 0 0 40px;border:none;padding:0px">. Every
            // document indented in an older build carries these, so the rule
            // matters most for content we produced ourselves.
            //
            // Recognise only that SHAPE -- an offset with the quote decoration
            // explicitly switched off. A blockquote that keeps its border is a real
            // quotation and must not be flagged.
            var quotes = tag === "blockquote" ? [node] : (node.querySelectorAll ? node.querySelectorAll("blockquote") : []);
            for (var qIndex = 0; qIndex < quotes.length; qIndex++) {
                var q = quotes[qIndex];
                var qs = q.style;
                if (!qs) continue;
                var hasOffset = /^\s*[\d.]+\s*[a-z%]+\s*$/i.test(qs.marginLeft || "") && parseFloat(qs.marginLeft) > 0;
                var borderOff = /^(none|0|0px)$/i.test(String(qs.borderStyle || qs.border || "").trim());
                if (hasOffset && borderOff) {
                    issues.push({
                        code: "blockquote-as-indent",
                        severity: "warning",
                        message: "This looks like indentation, not a quotation: a <blockquote> with a left margin and no quote styling. Screen readers announce it as a quotation. Use the indent button instead.",
                        path: path + ".blockquote[" + qIndex + "]",
                        _target: q
                    });
                }
            }

            // 2026-09-07 AMBIGUOUS LINK TEXT (WCAG 2.4.4). "Click here" read out of
            // context -- which is how a screen-reader user listing links hears it --
            // conveys nothing about the destination.
            var ambiguous = /^(click here|here|read more|more|link|this|this link|learn more|details|go)$/i;
            var namedLinks = tag === "a" ? [node] : (node.querySelectorAll ? node.querySelectorAll("a") : []);
            for (var aIndex = 0; aIndex < namedLinks.length; aIndex++) {
                var aEl = namedLinks[aIndex];
                if (!aEl.getAttribute || aEl.getAttribute("href") === null) continue;
                var aName = accessibleNameOf(aEl);
                if (aName && ambiguous.test(aName.replace(/[\s.,!:;]+$/g, "").replace(/^\s+/, ""))) {
                    issues.push({
                        code: "link-ambiguous-text",
                        severity: "warning",
                        message: "Link text \"" + aName + "\" does not say where it goes. Out of context a screen reader announces only this text.",
                        path: path + ".link[" + aIndex + "]",
                        _target: aEl
                    });
                }
            }

            collectUnmarkedLanguageRuns(node, editable, path, issues);
        }

        // 2026-09-07 DUPLICATE id (WCAG 4.1.1). Two elements sharing an id break
        // every aria-labelledby / aria-describedby / label that points at it --
        // the reference silently resolves to the first one. Reached easily by
        // copying and pasting a block that carries an id.
        //
        // Runs ONCE over the whole editable, deliberately NOT inside the per-node
        // walk: querySelectorAll returns DESCENDANTS only, so a walk visiting each
        // sibling separately sees one id at a time and can never detect a pair.
        // The same trap already cost this file its top-level image check.
        if (editable && editable.querySelectorAll) {
            var allWithIds = editable.querySelectorAll("[id]");
            var idSeen = {};
            for (var dupIndex = 0; dupIndex < allWithIds.length; dupIndex++) {
                var dupId = allWithIds[dupIndex].getAttribute("id");
                if (!dupId) continue;
                if (idSeen[dupId]) {
                    issues.push({
                        code: "duplicate-id",
                        severity: "error",
                        message: "id \"" + dupId + "\" is used more than once. Any aria-labelledby, aria-describedby or label pointing at it resolves to only the first element.",
                        path: "document.id[" + dupIndex + "]",
                        _target: allWithIds[dupIndex]
                    });
                }
                idSeen[dupId] = true;
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
            // Two valid outcomes, and only the author knows which: the table
            // describes data (give it headers) or only positions it (say so).
            if (options && options.markLayout) markTableAsLayout(target);
            else promoteFirstTableRow(target);
        }
        else if (issue.code === "layout-table-semantics") {
            markTableAsLayout(target);
        }
        else if (issue.code === "table-header-empty") {
            // Two valid outcomes and only the author knows which: the cell labels
            // something (give it text) or it labels nothing (it is not a header).
            var headerText = String((options && options.headerText) || "").replace(/^\s+|\s+$/g, "");
            if (headerText) target.textContent = headerText;
            else if (options && options.demoteToCell) {
                var cell = target.ownerDocument.createElement("td");
                while (target.firstChild) cell.appendChild(target.firstChild);
                copyAttributes(target, cell);
                cell.removeAttribute("scope");
                target.parentNode.replaceChild(cell, target);
            }
        }
        else if (issue.code === "link-empty") {
            // Prefer real text: an aria-label is invisible, so a sighted editor
            // cannot see what the link says and it drifts out of date.
            var linkText = String((options && options.linkText) || "").replace(/^\s+|\s+$/g, "");
            if (linkText) target.textContent = linkText;
            else {
                var linkLabel = String((options && options.linkLabel) || "").replace(/^\s+|\s+$/g, "");
                if (linkLabel) target.setAttribute("aria-label", linkLabel);
            }
        }
        else if (issue.code === "language-of-parts") {
            markLanguageRuns(target, options && options.lang ? options.lang : issue._lang, issue._script);
        }

        selectedIssueIndex = 0;
        scheduleEditorChange();
        return runAudit();
    }

    // Wrap the offending script's runs in <span lang> — the same markup
    // textpartlanguage.js produces, so the two features agree on one shape and
    // the author can retarget the result from the Language dropdown afterwards.
    //
    // Only the matching characters (plus the spaces and punctuation BETWEEN
    // them) are wrapped: wrapping the whole text node would relabel the
    // surrounding English as Hebrew, which is a worse lie than leaving it
    // unmarked.
    function markLanguageRuns(block, lang, scriptName) {
        if (!block || !lang) return;
        var script = null;
        for (var i = 0; i < SCRIPTS.length; i++) if (SCRIPTS[i].name === scriptName) script = SCRIPTS[i];
        if (!script) return;
        var doc = block.ownerDocument;
        var editable = editor.getEditable ? editor.getEditable() : null;
        var rtl = (lang === "he" || lang === "ar" || lang === "fa" || lang === "ur");

        var walker = doc.createTreeWalker(block, 4 /* SHOW_TEXT */, null, false);
        var pending = [], n;
        while ((n = walker.nextNode())) {
            if (hasLangAncestor(n, editable)) continue;
            pending.push(n);
        }

        for (var t = 0; t < pending.length; t++) {
            var node = pending[t];
            var value = node.nodeValue || "";
            // Character classes are per-char; build a run matcher that also
            // absorbs the neutral characters sitting inside a passage.
            var runRe = new RegExp("(?:" + script.re.source + "|[\\s.,;:!?'\"()\\u2010-\\u2027\\u00AB\\u00BB\\u201C\\u201D])*" +
                                   script.re.source +
                                   "(?:" + script.re.source + "|[\\s.,;:!?'\"()\\u2010-\\u2027\\u00AB\\u00BB\\u201C\\u201D])*", "g");
            var frag = doc.createDocumentFragment();
            var last = 0, m, wrapped = false;
            while ((m = runRe.exec(value))) {
                var text = m[0];
                // Trim the neutrals the greedy match pulled in at the edges;
                // they belong to the surrounding sentence, not the phrase.
                var lead = text.length - text.replace(/^[\s.,;:!?'"()‐-‧«»“”]+/, "").length;
                var trail = text.length - text.replace(/[\s.,;:!?'"()‐-‧«»“”]+$/, "").length;
                var start = m.index + lead;
                var end = m.index + text.length - trail;
                if (end - start < MIN_SCRIPT_RUN) continue;
                if (start > last) frag.appendChild(doc.createTextNode(value.slice(last, start)));
                var span = doc.createElement("span");
                span.setAttribute("lang", lang);
                if (rtl) span.setAttribute("dir", "rtl");
                span.appendChild(doc.createTextNode(value.slice(start, end)));
                frag.appendChild(span);
                last = end;
                wrapped = true;
                if (runRe.lastIndex === m.index) runRe.lastIndex++; // zero-width guard
            }
            if (!wrapped) continue;
            if (last < value.length) frag.appendChild(doc.createTextNode(value.slice(last)));
            node.parentNode.replaceChild(frag, node);
        }
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

    // Delegates to layouttable.js when it is loaded so there is ONE definition of
    // what "layout table" means; the fallback keeps the repair working in builds
    // where that plugin was left out of the bundle.
    // The accessible name of an element, as a screen reader would compute it:
    // aria-label wins, then visible text, then title, then the alt text of an
    // image standing in for the text. Empty string means "announced as nothing".
    // Deliberately NOT aria-labelledby - resolving it needs the whole document
    // and a wrong answer here would produce an error the author cannot clear.

    // --- contrast helpers (WCAG 1.4.3) ---------------------------------------
    function parseCssColour(v) {
        if (!v) return null;
        var str = String(v).trim();
        var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(str);
        if (m) {
            var hex = m[1];
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
        }
        var rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(str);
        if (rgb) return [Math.round(+rgb[1]), Math.round(+rgb[2]), Math.round(+rgb[3])];
        return null;   // named colours are not resolved: a guess is worse than silence
    }
    // Nearest ancestor that DECLARES a background. Reports whether it had to
    // fall back, so the message can say "assumed white" rather than asserting a
    // background the document never set.
    function nearestBackground(el) {
        var n = el;
        while (n && n.style) {
            var c = parseCssColour(n.style.backgroundColor);
            if (c) return { rgb: c, assumed: false };
            n = n.parentElement;
        }
        return { rgb: [255, 255, 255], assumed: true };
    }
    function relativeLuminance(rgb) {
        var a = [rgb[0], rgb[1], rgb[2]].map(function (v) {
            v = v / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function contrastRatio(fg, bg) {
        var l1 = relativeLuminance(fg), l2 = relativeLuminance(bg);
        var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
        return (hi + 0.05) / (lo + 0.05);
    }
    // WCAG "large text": >=18pt, or >=14pt bold. A heading judged against the
    // body threshold reports a failure that is not one.
    function isLargeText(el) {
        var st = el.style || {};
        var size = String(st.fontSize || "");
        var pt = null;
        var m = /^([\d.]+)(px|pt)$/i.exec(size.trim());
        if (m) pt = m[2].toLowerCase() === "pt" ? parseFloat(m[1]) : parseFloat(m[1]) * 0.75;
        if (pt === null) {
            var tagName = (el.tagName || "").toLowerCase();
            if (/^h[1-3]$/.test(tagName)) return true;
            return false;
        }
        var bold = /bold|^[6-9]00$/.test(String(st.fontWeight || ""));
        return pt >= 18 || (pt >= 14 && bold);
    }

    function accessibleNameOf(element) {
        if (!element) return "";
        var trim = function (v) { return String(v || "").replace(/^\s+|\s+$/g, ""); };
        var label = trim(element.getAttribute && element.getAttribute("aria-label"));
        if (label) return label;
        var text = trim(element.textContent);
        if (text) return text;
        var title = trim(element.getAttribute && element.getAttribute("title"));
        if (title) return title;
        if (element.querySelectorAll) {
            var imgs = element.querySelectorAll("img");
            for (var i = 0; i < imgs.length; i++) {
                var alt = trim(imgs[i].getAttribute("alt"));
                if (alt) return alt;
            }
        }
        return "";
    }

    function markTableAsLayout(table) {
        if (!table) return;
        if (editor && typeof editor.setTableLayoutMode === "function") {
            try { editor.setTableLayoutMode("layout", table); return; } catch (e) {}
        }
        table.setAttribute("role", "presentation");
        table.removeAttribute("summary");
        var caption = table.querySelector("caption");
        if (caption && caption.parentNode === table) caption.parentNode.removeChild(caption);
        var cells = table.querySelectorAll("th,[scope]");
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            // Tables nest — do not strip the headers of a data table that
            // happens to sit inside a cell of this one.
            if (cell.closest && cell.closest("table") !== table) continue;
            cell.removeAttribute("scope");
            cell.removeAttribute("headers");
            if (String(cell.nodeName || "").toLowerCase() !== "th") continue;
            var td = table.ownerDocument.createElement("td");
            while (cell.firstChild) td.appendChild(cell.firstChild);
            copyAttributes(cell, td);
            td.removeAttribute("scope");
            cell.parentNode.replaceChild(td, cell);
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

        if (issue.code === "language-of-parts") {
            var langRow = detail.ownerDocument.createElement("div");
            langRow.className = "rte-a11y-row";
            var mark = detail.ownerDocument.createElement("button");
            mark.type = "button";
            mark.className = "rte-a11y-button";
            mark.innerText = "Mark as " + issue._script;
            mark.onclick = function () { repairIssue(selectedIssueIndex, { lang: issue._lang }); };
            var look = detail.ownerDocument.createElement("button");
            look.type = "button";
            look.className = "rte-a11y-button rte-a11y-button-secondary";
            look.innerText = "Focus issue";
            look.onclick = function () { focusIssue(issue); };
            langRow.appendChild(mark);
            langRow.appendChild(look);
            detail.appendChild(langRow);
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
