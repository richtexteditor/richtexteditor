if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

RTE_DefaultConfig.plugin_stateinspector = RTE_Plugin_StateInspector;

// 2026-09-04 Document state inspector (developer tool).
//
// The editor's source of truth is the contenteditable DOM, not a separate
// document model, so there is no state object to print. This plugin derives
// one: it walks the editable subtree and produces a normalized, serializable
// snapshot (tree + selection + plugin init order), then runs a rule set over
// that snapshot looking for the structural faults that have actually caused
// defects in this product - zero-length text nodes, empty inline wrappers,
// duplicate nested formatting, control characters, sanitizer bypasses, broken
// atomic chips, invalid list and heading structure.
//
// The snapshot is the point. `editor.stateInspector.snapshot()` returns plain
// JSON, so a support case can carry the document's real structure instead of a
// screenshot, and a test can assert on structure instead of on an HTML string.
//
// It is deliberately NOT in any default toolbar: set stateInspectorToolbarButton
// to true to add it, or drive it from the API.
function RTE_Plugin_StateInspector() {
    var obj = this;
    var config;
    var editor;
    var shell = null;
    var panel = null;
    var body = null;
    var tabsBar = null;
    var summaryEl = null;
    var refreshTimer = 0;
    var activeTab = "issues";
    var pluginOrder = [];
    var eventLog = [];
    var logLimit = 60;

    var TABS = [
        { id: "issues", label: "Issues" },
        { id: "tree", label: "Tree" },
        { id: "selection", label: "Selection" },
        { id: "plugins", label: "Plugins" },
        { id: "log", label: "Log" }
    ];

    var INLINE_TAGS = {
        A: 1, ABBR: 1, B: 1, BDI: 1, BDO: 1, CITE: 1, CODE: 1, DEL: 1, DFN: 1,
        EM: 1, I: 1, INS: 1, KBD: 1, MARK: 1, Q: 1, S: 1, SAMP: 1, SMALL: 1,
        SPAN: 1, STRONG: 1, SUB: 1, SUP: 1, U: 1, VAR: 1, FONT: 1
    };
    var VOID_TAGS = {
        AREA: 1, BASE: 1, BR: 1, COL: 1, EMBED: 1, HR: 1, IMG: 1, INPUT: 1,
        LINK: 1, META: 1, PARAM: 1, SOURCE: 1, TRACK: 1, WBR: 1
    };
    var BLOCK_TAGS = {
        ADDRESS: 1, ARTICLE: 1, ASIDE: 1, BLOCKQUOTE: 1, DIV: 1, DL: 1, DT: 1,
        DD: 1, FIELDSET: 1, FIGCAPTION: 1, FIGURE: 1, FOOTER: 1, FORM: 1,
        H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, HEADER: 1, HR: 1, LI: 1,
        MAIN: 1, NAV: 1, OL: 1, P: 1, PRE: 1, SECTION: 1, TABLE: 1, UL: 1
    };
    // Control characters that make Word reject an entire .docx package and that
    // silently truncate grep over a bundle. NUL through backspace, vertical tab,
    // form feed, and shift-out through unit separator.
    // Written as escapes, never as literal bytes: a literal control character
    // in source makes grep treat the whole bundle as binary and silently
    // truncate every search over it.
    var CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

    obj.PluginName = "StateInspector";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.stateInspectorEnabled === false) return;

        config.stateInspectorTitle = config.stateInspectorTitle || "State inspector";
        config.stateInspectorHint = config.stateInspectorHint || "Derived document model, structural checks, and a copyable snapshot for bug reports.";
        config.stateInspectorEmptyText = config.stateInspectorEmptyText || "No content to inspect yet.";
        if (typeof config.stateInspectorAutoOpen !== "boolean") config.stateInspectorAutoOpen = false;
        if (typeof config.stateInspectorToolbarButton !== "boolean") config.stateInspectorToolbarButton = false;
        if (typeof config.stateInspectorMaxDepth !== "number") config.stateInspectorMaxDepth = 24;
        if (typeof config.stateInspectorLogLimit === "number") logLimit = Math.max(10, Math.min(500, config.stateInspectorLogLimit));

        // Captured here rather than in InitEditor because `for (var p in config)`
        // reproduces exactly the order the core uses to instantiate plugins -
        // which is bundle concatenation order, i.e. alphabetical by filename.
        // A plugin that registers into another plugin's API only works if it
        // sorts after it; that has silently broken registration before, so the
        // order is worth being able to see.
        pluginOrder = collectPluginOrder(config);

        if (config.stateInspectorToolbarButton) {
            // BOTH presets, deliberately. config.toolbar defaults to "default",
            // which resolves to toolbar_default - so appending only to
            // toolbar_full means a host that sets stateInspectorToolbarButton on
            // a default toolbar gets no button at all. "It is in the config" and
            // "a user can see it" are different claims. inlinecode shipped a
            // whole release cycle invisible for exactly this reason.
            //
            // If you write a test for this, scope it to [role=toolbar]. Searching
            // the whole document for the button's label matches the inspector
            // PANEL's aria-label - the panel is built at InitEditor and merely
            // hidden - so a page-wide text search reports the button present in
            // every case, including the two where no button exists. A check whose
            // population is wrong reports confidently and does not look broken.
            appendToolbarCommand("toolbar_default", "#{stateinspector}");
            appendToolbarCommand("toolbar_full", "#{stateinspector}");
        }
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.stateInspectorEnabled === false) return;

        editor.stateInspector = {
            close: function () { closePanel(); },
            isOpen: function () { return !!(shell && shell.classList.contains("is-open")); },
            issues: function () { return analyze(snapshotTree()).issues; },
            log: function () { return eventLog.slice(0); },
            open: function () { openPanel(); },
            plugins: function () { return pluginOrder.slice(0); },
            refresh: function () { render(); },
            snapshot: function () { return buildSnapshot(); },
            toggle: function () { togglePanel(); }
        };

        injectStyles();

        editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
        editor.toolbarFactoryMap["stateinspector"] = function (cmd) {
            return editor.createToolbarButton(cmd);
        };

        editor.attachEvent("exec_command_stateinspector", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            togglePanel();
        });
        editor.attachEvent("change", function () {
            recordEvent("change");
            scheduleRefresh();
        });
        editor.attachEvent("selectionchange", function () {
            recordEvent("selectionchange");
            scheduleRefresh();
        });

        // Safe to register here, unlike documentimport/pdfexport/readabilitystats:
        // plugins initialise in alphabetical bundle order and "stateinspector"
        // sorts AFTER "slashcommand", so editor.slashCommands already exists.
        // Guarded anyway, because that ordering is a filename away from changing.
        if (editor.slashCommands && editor.slashCommands.register) {
            editor.slashCommands.register({
                id: "stateinspector",
                section: "Tools",
                title: config.stateInspectorTitle,
                description: "Inspect document structure, selection, and structural issues",
                keywords: ["inspect", "debug", "devtools", "state", "structure"],
                run: function () { openPanel(); }
            });
        }

        // Build the wrapper NOW, not lazily on first open. ensureShell() reparents
        // the editor container, and reparenting a populated editing surface makes
        // Chrome reseat it - which blanks the visible content while the document
        // is still there (the status bar keeps counting words nobody can see).
        // documentoutline.js and contentminimap.js do the same thing for the same
        // reason: at InitEditor the surface is still empty, so the reseat is free.
        ensureShell();

        if (config.stateInspectorAutoOpen) openPanel();
    };

    function appendToolbarCommand(toolbar, item) {
        if (!config[toolbar]) return;
        if (config[toolbar].indexOf(item) !== -1) return;
        config[toolbar] = config[toolbar] + item;
    }

    function collectPluginOrder(cfg) {
        var order = [];
        for (var p in cfg) {
            if (p[0] !== "p" || p.substr(0, 7) !== "plugin_") continue;
            if (!cfg[p] || !(cfg[p] instanceof Function)) continue;
            order.push({ index: order.length, key: p, name: p.substring(7) });
        }
        return order;
    }

    function recordEvent(name) {
        eventLog.push({ at: Date.now(), event: name });
        if (eventLog.length > logLimit) eventLog.splice(0, eventLog.length - logLimit);
    }

    // ---------------------------------------------------------------- snapshot

    function describeAttributes(el) {
        var attrs = {};
        var list = el.attributes;
        if (!list) return attrs;
        for (var i = 0; i < list.length; i++) {
            var value = list[i].value;
            attrs[list[i].name] = value.length > 220 ? value.substring(0, 220) + "…" : value;
        }
        return attrs;
    }

    function walk(node, depth, maxDepth, counters) {
        if (node.nodeType === 3) {
            var text = node.nodeValue || "";
            counters.textNodes++;
            counters.characters += text.length;
            return {
                type: "text",
                length: text.length,
                text: text.length > 80 ? text.substring(0, 80) + "…" : text
            };
        }
        if (node.nodeType === 8) {
            counters.comments++;
            return { type: "comment", length: (node.nodeValue || "").length };
        }
        if (node.nodeType !== 1) return null;

        counters.elements++;
        var name = node.nodeName;
        counters.tags[name] = (counters.tags[name] || 0) + 1;

        var entry = {
            type: "element",
            name: name.toLowerCase(),
            attrs: describeAttributes(node),
            children: []
        };
        if (depth >= maxDepth) {
            entry.truncated = true;
            entry.childCount = node.childNodes.length;
            return entry;
        }
        for (var i = 0; i < node.childNodes.length; i++) {
            var child = walk(node.childNodes[i], depth + 1, maxDepth, counters);
            if (child) entry.children.push(child);
        }
        return entry;
    }

    function snapshotTree() {
        var editable = editor && editor.getEditable ? editor.getEditable() : null;
        var counters = { elements: 0, textNodes: 0, comments: 0, characters: 0, tags: {} };
        if (!editable) {
            return { root: null, counters: counters, editable: null };
        }
        var maxDepth = Math.max(2, config.stateInspectorMaxDepth || 24);
        var root = {
            type: "element",
            name: "root",
            attrs: {},
            children: []
        };
        for (var i = 0; i < editable.childNodes.length; i++) {
            var child = walk(editable.childNodes[i], 1, maxDepth, counters);
            if (child) root.children.push(child);
        }
        return { root: root, counters: counters, editable: editable };
    }

    function describeSelection() {
        var doc = editor && editor.getDocument ? editor.getDocument() : null;
        var editable = editor && editor.getEditable ? editor.getEditable() : null;
        var info = { available: false };
        if (!doc || !doc.getSelection) return info;

        var sel;
        try { sel = doc.getSelection(); } catch (e) { return info; }
        if (!sel || sel.rangeCount === 0) return info;

        var range;
        try { range = sel.getRangeAt(0); } catch (e) { return info; }
        if (!range) return info;

        info.available = true;
        info.collapsed = !!range.collapsed;
        info.anchor = describeBoundary(range.startContainer, range.startOffset);
        info.focus = describeBoundary(range.endContainer, range.endOffset);
        info.insideEditable = !!(editable && editable.contains(range.startContainer) && editable.contains(range.endContainer));
        try {
            var selected = String(range.toString() || "");
            info.textLength = selected.length;
            info.text = selected.length > 120 ? selected.substring(0, 120) + "…" : selected;
        } catch (e) {
            info.textLength = 0;
        }
        info.block = describeBlockPath(range.startContainer, editable);
        return info;
    }

    function describeBoundary(container, offset) {
        if (!container) return { node: "(none)", offset: offset };
        if (container.nodeType === 3) {
            var text = container.nodeValue || "";
            return {
                node: "#text",
                offset: offset,
                length: text.length,
                // A caret sitting in a zero-length text node is the shape of a
                // caret trap; surfacing it here is the whole point.
                zeroLength: text.length === 0
            };
        }
        return {
            node: container.nodeName ? container.nodeName.toLowerCase() : "(unknown)",
            offset: offset,
            childCount: container.childNodes ? container.childNodes.length : 0
        };
    }

    function describeBlockPath(node, editable) {
        var path = [];
        var current = node;
        while (current && current !== editable) {
            if (current.nodeType === 1) path.unshift(current.nodeName.toLowerCase());
            current = current.parentNode;
        }
        return path.join(" > ");
    }

    function buildSnapshot() {
        var tree = snapshotTree();
        var analysis = analyze(tree);
        return {
            snapshotVersion: 1,
            generatedAt: new Date().toISOString(),
            counters: tree.counters,
            issues: analysis.issues,
            plugins: pluginOrder.slice(0),
            recentEvents: eventLog.slice(-20),
            selection: describeSelection(),
            tree: tree.root
        };
    }

    // ----------------------------------------------------------------- analysis

    function issue(list, id, severity, message, detail) {
        list.push({ id: id, severity: severity, message: message, detail: detail || "" });
    }

    function elementPath(el, editable) {
        var path = [];
        var current = el;
        while (current && current !== editable && current.nodeType === 1) {
            var step = current.nodeName.toLowerCase();
            if (current.id) step += "#" + current.id;
            path.unshift(step);
            current = current.parentNode;
        }
        return path.join(" > ");
    }

    function hasMeaningfulContent(el) {
        if ((el.textContent || "").replace(/[\s\u200B\uFEFF]/g, "") !== "") return true;
        for (var i = 0; i < el.childNodes.length; i++) {
            var child = el.childNodes[i];
            if (child.nodeType === 1 && VOID_TAGS[child.nodeName]) return true;
        }
        return false;
    }

    function analyze(tree) {
        var issues = [];
        var editable = tree.editable;
        if (!editable) return { issues: issues };

        var walker = editable.ownerDocument.createTreeWalker(
            editable,
            // NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
            1 | 4,
            null,
            false
        );
        var lastHeadingLevel = 0;
        var node;

        while ((node = walker.nextNode())) {
            if (node.nodeType === 3) {
                analyzeText(node, editable, issues);
                continue;
            }
            analyzeElement(node, editable, issues);

            var level = headingLevel(node);
            if (level) {
                if (lastHeadingLevel && level > lastHeadingLevel + 1) {
                    issue(issues, "heading-skip", "warn",
                        "Heading level jumps from h" + lastHeadingLevel + " to h" + level,
                        elementPath(node, editable));
                }
                lastHeadingLevel = level;
            }
        }

        // Top-level images are children of the editable root, so a walker that
        // starts below the root would miss them - which is exactly how the
        // accessibility checker used to skip pasted images.
        for (var i = 0; i < editable.childNodes.length; i++) {
            var child = editable.childNodes[i];
            if (child.nodeType === 1 && child.nodeName === "IMG") {
                checkImageAlt(child, editable, issues);
            }
        }

        return { issues: issues };
    }

    function headingLevel(el) {
        var name = el.nodeName;
        if (name.length === 2 && name[0] === "H" && name[1] >= "1" && name[1] <= "6") {
            return parseInt(name[1], 10);
        }
        return 0;
    }

    function analyzeText(node, editable, issues) {
        var text = node.nodeValue || "";
        if (text.length === 0) {
            issue(issues, "zero-length-text", "warn",
                "Zero-length text node",
                elementPath(node.parentNode, editable));
            return;
        }
        if (CONTROL_CHARS.test(text)) {
            issue(issues, "control-characters", "error",
                "Text contains control characters - Word will reject an exported .docx",
                elementPath(node.parentNode, editable));
        }
    }

    function analyzeElement(el, editable, issues) {
        var name = el.nodeName;
        var path = elementPath(el, editable);

        // Sanitizer invariants. These are the shapes that got through before.
        var attrs = el.attributes;
        for (var i = 0; attrs && i < attrs.length; i++) {
            var attrName = attrs[i].name.toLowerCase();
            var attrValue = attrs[i].value || "";
            if (attrName.indexOf("on") === 0 && attrName.length > 2) {
                issue(issues, "event-handler-attribute", "error",
                    "Inline event handler " + attrName + " present in document content", path);
            }
            if (attrName === "href" || attrName === "src" || attrName === "xlink:href") {
                // Strip control characters and whitespace BEFORE testing the scheme;
                // "java	script:" is a live bypass otherwise.
                var scheme = attrValue.replace(/[\u0000-\u0020]/g, "").toLowerCase();
                if (scheme.indexOf("javascript:") === 0) {
                    issue(issues, "unsafe-url-scheme", "error",
                        "javascript: URL in " + attrName, path);
                } else if (scheme.indexOf("data:text/html") === 0 || scheme.indexOf("data:image/svg+xml") === 0) {
                    issue(issues, "unsafe-url-scheme", "error",
                        "Scriptable data: URL in " + attrName, path);
                }
            }
        }
        if (name === "IFRAME" && el.hasAttribute("srcdoc")) {
            issue(issues, "iframe-srcdoc", "error",
                "iframe[srcdoc] executes when the saved content is rendered downstream", path);
        }

        // Structural invariants.
        if (INLINE_TAGS[name] && !hasMeaningfulContent(el)) {
            issue(issues, "empty-inline", "warn",
                "Empty inline <" + name.toLowerCase() + "> - a caret entering it cannot leave by typing", path);
        }
        if (INLINE_TAGS[name] && el.parentNode && el.parentNode.nodeName === name) {
            issue(issues, "nested-duplicate-inline", "warn",
                "<" + name.toLowerCase() + "> nested directly inside another <" + name.toLowerCase() + ">", path);
        }
        if (INLINE_TAGS[name]) {
            for (var c = 0; c < el.childNodes.length; c++) {
                var child = el.childNodes[c];
                if (child.nodeType === 1 && BLOCK_TAGS[child.nodeName]) {
                    issue(issues, "block-inside-inline", "warn",
                        "Block <" + child.nodeName.toLowerCase() + "> inside inline <" + name.toLowerCase() + ">", path);
                    break;
                }
            }
        }
        if (name === "LI") {
            var parentName = el.parentNode ? el.parentNode.nodeName : "";
            if (parentName !== "UL" && parentName !== "OL") {
                issue(issues, "orphan-list-item", "warn",
                    "<li> outside a <ul> or <ol>", path);
            }
        }
        if (name === "IMG") {
            checkImageAlt(el, editable, issues);
        }
        // Atomic content - chips, footnote markers, merge fields - stops being
        // atomic the moment it loses contenteditable=false, and the caret then
        // edits its internals.
        if (el.hasAttribute && el.hasAttribute("data-rte-atomic") && el.getAttribute("contenteditable") !== "false") {
            issue(issues, "atomic-not-protected", "error",
                "Atomic element without contenteditable=\"false\"", path);
        }
    }

    function checkImageAlt(el, editable, issues) {
        if (el.getAttribute("role") === "presentation" || el.getAttribute("aria-hidden") === "true") return;
        var alt = el.getAttribute("alt");
        if (alt === null) {
            issue(issues, "image-missing-alt", "warn",
                "Image has no alt attribute", elementPath(el, editable));
        }
    }

    // -------------------------------------------------------------------- view

    function injectStyles() {
        var hostDoc = config.container.ownerDocument;
        if (hostDoc.getElementById("rte-state-inspector-style")) return;
        var style = hostDoc.createElement("style");
        style.id = "rte-state-inspector-style";
        style.innerHTML = [
            ".rte-state-inspector-shell{display:flex;align-items:stretch;gap:10px;}",
            ".rte-state-inspector-shell>.rte-state-inspector-host{flex:1 1 auto;min-width:0;}",
            ".rte-state-inspector-panel{display:none;flex:0 0 340px;min-width:290px;max-width:min(400px,36vw);border:1px solid rgba(148,163,184,.22);border-radius:8px;background:#fff;box-shadow:0 14px 32px rgba(29,78,216,.1),0 2px 8px rgba(15,23,42,.06);overflow:hidden;color:#172033;font-family:Aptos,'Segoe UI',sans-serif;}",
            ".rte-state-inspector-shell.is-open>.rte-state-inspector-panel{display:flex;flex-direction:column;}",
            ".rte-state-inspector-header{padding:12px 12px 9px 14px;border-bottom:1px solid rgba(148,163,184,.16);background:rgba(248,251,255,.72);}",
            ".rte-state-inspector-kicker{font-size:10px;line-height:1.3;letter-spacing:.08em;text-transform:uppercase;color:#52657e;font-weight:850;}",
            ".rte-state-inspector-title{margin-top:3px;font-size:15px;line-height:1.2;font-weight:850;color:#172033;}",
            ".rte-state-inspector-copy{margin-top:5px;font-size:12px;line-height:1.42;color:#52657e;}",
            ".rte-state-inspector-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px 8px 14px;border-bottom:1px solid rgba(148,163,184,.16);}",
            ".rte-state-inspector-summary{min-width:0;font-size:12px;font-weight:750;color:#52657e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".rte-state-inspector-actions{display:flex;gap:6px;flex:0 0 auto;}",
            ".rte-state-inspector-btn{appearance:none;border:1px solid rgba(100,116,139,.18);background:#fff;color:#315277;cursor:pointer;font-size:12px;font-weight:750;padding:6px 9px;border-radius:7px;line-height:1;}",
            ".rte-state-inspector-btn:hover,.rte-state-inspector-btn:focus-visible{background:#eef4ff;color:#0f3f9f;border-color:rgba(37,99,235,.28);}",
            ".rte-state-inspector-tabs{display:flex;gap:2px;padding:8px 10px 0 10px;border-bottom:1px solid rgba(148,163,184,.16);}",
            ".rte-state-inspector-tab{appearance:none;border:1px solid transparent;border-bottom:none;background:transparent;color:#52657e;cursor:pointer;font-size:12px;font-weight:800;padding:7px 10px;border-radius:7px 7px 0 0;line-height:1;}",
            ".rte-state-inspector-tab:hover,.rte-state-inspector-tab:focus-visible{background:#f8fbff;color:#0f3f9f;}",
            ".rte-state-inspector-tab[aria-selected='true']{background:#eef4ff;border-color:rgba(37,99,235,.26);color:#0f3f9f;}",
            ".rte-state-inspector-body{padding:10px;overflow:auto;min-height:160px;max-height:540px;scrollbar-width:thin;font-size:12px;line-height:1.5;}",
            ".rte-state-inspector-issue{display:block;padding:8px 10px;margin-bottom:6px;border:1px solid rgba(148,163,184,.24);border-left-width:3px;border-radius:7px;background:#fff;}",
            ".rte-state-inspector-issue.is-error{border-left-color:#dc2626;background:#fef4f4;}",
            ".rte-state-inspector-issue.is-warn{border-left-color:#d97706;background:#fffaf1;}",
            ".rte-state-inspector-issue-msg{font-weight:750;color:#172033;}",
            ".rte-state-inspector-issue-meta{margin-top:3px;font-size:11px;color:#52657e;font-family:Consolas,'Cascadia Mono',monospace;word-break:break-all;}",
            ".rte-state-inspector-ok{padding:14px;color:#166534;font-weight:750;background:#f0fdf4;border:1px dashed rgba(22,101,52,.3);border-radius:8px;}",
            ".rte-state-inspector-empty{padding:14px;color:#52657e;font-weight:700;background:#fff;border:1px dashed rgba(148,163,184,.34);border-radius:8px;}",
            ".rte-state-inspector-pre{margin:0;font-family:Consolas,'Cascadia Mono',monospace;font-size:11px;line-height:1.55;color:#172033;white-space:pre;}",
            ".rte-state-inspector-row{display:flex;gap:8px;padding:4px 0;border-bottom:1px solid rgba(148,163,184,.14);}",
            ".rte-state-inspector-row-key{flex:0 0 116px;color:#52657e;font-weight:750;}",
            ".rte-state-inspector-row-val{flex:1 1 auto;min-width:0;font-family:Consolas,'Cascadia Mono',monospace;word-break:break-all;}",
            ".rte-state-inspector-row.is-flagged .rte-state-inspector-row-val{color:#b91c1c;font-weight:750;}",
            "@media (max-width: 1100px){.rte-state-inspector-shell{display:block;}.rte-state-inspector-panel{margin-top:12px;max-width:none;width:100%;}.rte-state-inspector-body{max-height:340px;}}"
        ].join("");
        hostDoc.head.appendChild(style);
        // A <style> element's rules are dropped under a strict style-src; this
        // re-injects them through the CSSOM in that case only. Missed in 2.9.0,
        // found by auditing the FULL bundle rather than a sample of plugins.
        if (editor && typeof editor.ensureStyleSheetLive === "function") {
            editor.ensureStyleSheetLive(hostDoc, style, "rte-state-inspector-style", style.textContent);
        }
    }

    function ensureShell() {
        if (shell) return shell;
        var container = config.container;
        var hostDoc = container.ownerDocument;
        shell = hostDoc.createElement("div");
        shell.className = "rte-state-inspector-shell";

        var host = hostDoc.createElement("div");
        host.className = "rte-state-inspector-host";

        container.parentNode.insertBefore(shell, container);
        shell.appendChild(host);
        host.appendChild(container);

        panel = hostDoc.createElement("aside");
        panel.className = "rte-state-inspector-panel";
        panel.setAttribute("role", "complementary");
        panel.setAttribute("aria-label", config.stateInspectorTitle);

        var header = hostDoc.createElement("div");
        header.className = "rte-state-inspector-header";
        var kicker = hostDoc.createElement("div");
        kicker.className = "rte-state-inspector-kicker";
        kicker.innerText = "Developer";
        var title = hostDoc.createElement("div");
        title.className = "rte-state-inspector-title";
        title.innerText = config.stateInspectorTitle;
        var copy = hostDoc.createElement("div");
        copy.className = "rte-state-inspector-copy";
        copy.innerText = config.stateInspectorHint;
        header.appendChild(kicker);
        header.appendChild(title);
        header.appendChild(copy);

        var toolbar = hostDoc.createElement("div");
        toolbar.className = "rte-state-inspector-toolbar";
        summaryEl = hostDoc.createElement("div");
        summaryEl.className = "rte-state-inspector-summary";
        summaryEl.setAttribute("data-rte-inspector-summary", "1");
        var actions = hostDoc.createElement("div");
        actions.className = "rte-state-inspector-actions";
        actions.appendChild(makeButton(hostDoc, "Copy", "Copy the state snapshot as JSON", copySnapshot));
        actions.appendChild(makeButton(hostDoc, "Hide", "Hide the state inspector", closePanel));
        toolbar.appendChild(summaryEl);
        toolbar.appendChild(actions);

        tabsBar = hostDoc.createElement("div");
        tabsBar.className = "rte-state-inspector-tabs";
        tabsBar.setAttribute("role", "tablist");
        for (var i = 0; i < TABS.length; i++) {
            tabsBar.appendChild(makeTab(hostDoc, TABS[i]));
        }

        body = hostDoc.createElement("div");
        body.className = "rte-state-inspector-body";

        panel.appendChild(header);
        panel.appendChild(toolbar);
        panel.appendChild(tabsBar);
        panel.appendChild(body);
        shell.appendChild(panel);
        return shell;
    }

    function makeButton(hostDoc, label, aria, handler) {
        var btn = hostDoc.createElement("button");
        btn.type = "button";
        btn.className = "rte-state-inspector-btn";
        btn.innerText = label;
        btn.setAttribute("aria-label", aria);
        btn.onclick = handler;
        return btn;
    }

    function makeTab(hostDoc, tab) {
        var btn = hostDoc.createElement("button");
        btn.type = "button";
        btn.className = "rte-state-inspector-tab";
        btn.innerText = tab.label;
        btn.setAttribute("role", "tab");
        btn.setAttribute("data-rte-inspector-tab", tab.id);
        btn.setAttribute("aria-selected", tab.id === activeTab ? "true" : "false");
        btn.onclick = function () {
            activeTab = tab.id;
            syncTabs();
            render();
        };
        return btn;
    }

    function syncTabs() {
        if (!tabsBar) return;
        var buttons = tabsBar.querySelectorAll("[data-rte-inspector-tab]");
        for (var i = 0; i < buttons.length; i++) {
            var id = buttons[i].getAttribute("data-rte-inspector-tab");
            buttons[i].setAttribute("aria-selected", id === activeTab ? "true" : "false");
        }
    }

    function togglePanel() {
        if (shell && shell.classList.contains("is-open")) closePanel();
        else openPanel();
    }

    function openPanel() {
        ensureShell();
        shell.classList.add("is-open");
        render();
    }

    function closePanel() {
        if (!shell) return;
        shell.classList.remove("is-open");
    }

    function scheduleRefresh() {
        if (!shell || !shell.classList.contains("is-open")) return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () { render(); }, 120);
    }

    function copySnapshot() {
        var json = JSON.stringify(buildSnapshot(), null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json);
            return;
        }
        var hostDoc = config.container.ownerDocument;
        var area = hostDoc.createElement("textarea");
        area.value = json;
        area.style.position = "fixed";
        area.style.opacity = "0";
        hostDoc.body.appendChild(area);
        area.select();
        try { hostDoc.execCommand("copy"); } catch (e) { /* clipboard unavailable */ }
        hostDoc.body.removeChild(area);
    }

    function clear(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    function render() {
        if (!shell || !body) return;
        var tree = snapshotTree();
        var analysis = analyze(tree);
        var hostDoc = config.container.ownerDocument;

        var errors = 0;
        for (var i = 0; i < analysis.issues.length; i++) {
            if (analysis.issues[i].severity === "error") errors++;
        }
        if (summaryEl) {
            // Kept short on purpose: the toolbar row ellipsises, and "3 errors" is
            // the part that must survive the truncation. Full counts are in the
            // snapshot and the tree tab.
            summaryEl.innerText = tree.counters.elements + " el · " +
                analysis.issues.length + " issue" + (analysis.issues.length === 1 ? "" : "s") +
                (errors ? " · " + errors + " error" + (errors === 1 ? "" : "s") : "");
        }

        clear(body);
        if (activeTab === "issues") renderIssues(hostDoc, analysis.issues);
        else if (activeTab === "tree") renderTree(hostDoc, tree);
        else if (activeTab === "selection") renderSelection(hostDoc);
        else if (activeTab === "plugins") renderPlugins(hostDoc);
        else if (activeTab === "log") renderLog(hostDoc);
    }

    function renderIssues(hostDoc, issues) {
        if (!issues.length) {
            var ok = hostDoc.createElement("div");
            ok.className = "rte-state-inspector-ok";
            ok.innerText = "No structural issues found.";
            body.appendChild(ok);
            return;
        }
        for (var i = 0; i < issues.length; i++) {
            var item = issues[i];
            var wrap = hostDoc.createElement("div");
            wrap.className = "rte-state-inspector-issue is-" + (item.severity === "error" ? "error" : "warn");
            wrap.setAttribute("data-rte-issue-id", item.id);
            var msg = hostDoc.createElement("div");
            msg.className = "rte-state-inspector-issue-msg";
            msg.innerText = item.message;
            var meta = hostDoc.createElement("div");
            meta.className = "rte-state-inspector-issue-meta";
            meta.innerText = (item.detail || "(document root)") + "  ·  " + item.id;
            wrap.appendChild(msg);
            wrap.appendChild(meta);
            body.appendChild(wrap);
        }
    }

    function renderTree(hostDoc, tree) {
        if (!tree.root || !tree.root.children.length) {
            var empty = hostDoc.createElement("div");
            empty.className = "rte-state-inspector-empty";
            empty.innerText = config.stateInspectorEmptyText;
            body.appendChild(empty);
            return;
        }
        var pre = hostDoc.createElement("pre");
        pre.className = "rte-state-inspector-pre";
        pre.innerText = formatTree(tree.root, 0).join("\n");
        body.appendChild(pre);
    }

    function formatTree(node, depth) {
        var lines = [];
        var pad = new Array(depth + 1).join("  ");
        if (node.type === "text") {
            lines.push(pad + "#text(" + node.length + ") " + JSON.stringify(node.text));
            return lines;
        }
        if (node.type === "comment") {
            lines.push(pad + "#comment(" + node.length + ")");
            return lines;
        }
        var label = pad + "<" + node.name;
        var keys = [];
        for (var k in node.attrs) keys.push(k);
        if (keys.length) {
            keys.sort();
            for (var i = 0; i < keys.length && i < 4; i++) {
                label += " " + keys[i] + "=" + JSON.stringify(node.attrs[keys[i]]);
            }
            if (keys.length > 4) label += " …+" + (keys.length - 4);
        }
        label += ">";
        if (node.truncated) label += "  … " + node.childCount + " children (depth limit)";
        lines.push(label);
        for (var c = 0; c < (node.children || []).length; c++) {
            lines = lines.concat(formatTree(node.children[c], depth + 1));
        }
        return lines;
    }

    function renderSelection(hostDoc) {
        var info = describeSelection();
        if (!info.available) {
            var empty = hostDoc.createElement("div");
            empty.className = "rte-state-inspector-empty";
            empty.innerText = "No selection in the document.";
            body.appendChild(empty);
            return;
        }
        addRow(hostDoc, "Collapsed", String(info.collapsed));
        addRow(hostDoc, "In editable", String(info.insideEditable), !info.insideEditable);
        addRow(hostDoc, "Block path", info.block || "(root)");
        addRow(hostDoc, "Anchor", formatBoundary(info.anchor), !!(info.anchor && info.anchor.zeroLength));
        addRow(hostDoc, "Focus", formatBoundary(info.focus), !!(info.focus && info.focus.zeroLength));
        addRow(hostDoc, "Selected", info.textLength + " chars");
        if (info.text) addRow(hostDoc, "Text", info.text);
    }

    function formatBoundary(boundary) {
        if (!boundary) return "(none)";
        var out = boundary.node + " @ " + boundary.offset;
        if (typeof boundary.length === "number") out += " (len " + boundary.length + ")";
        if (typeof boundary.childCount === "number") out += " (" + boundary.childCount + " children)";
        if (boundary.zeroLength) out += "  ← zero-length text node";
        return out;
    }

    function addRow(hostDoc, key, value, flagged) {
        var row = hostDoc.createElement("div");
        row.className = "rte-state-inspector-row" + (flagged ? " is-flagged" : "");
        var k = hostDoc.createElement("div");
        k.className = "rte-state-inspector-row-key";
        k.innerText = key;
        var v = hostDoc.createElement("div");
        v.className = "rte-state-inspector-row-val";
        v.innerText = value;
        row.appendChild(k);
        row.appendChild(v);
        body.appendChild(row);
    }

    function renderPlugins(hostDoc) {
        if (!pluginOrder.length) {
            var empty = hostDoc.createElement("div");
            empty.className = "rte-state-inspector-empty";
            empty.innerText = "No plugins registered.";
            body.appendChild(empty);
            return;
        }
        var note = hostDoc.createElement("div");
        note.className = "rte-state-inspector-copy";
        note.innerText = "Initialization order. A plugin can only register into another plugin's API if it appears below it.";
        body.appendChild(note);
        for (var i = 0; i < pluginOrder.length; i++) {
            addRow(hostDoc, String(i + 1).padStart ? String(i + 1).padStart(3, "0") : String(i + 1), pluginOrder[i].name);
        }
    }

    function renderLog(hostDoc) {
        if (!eventLog.length) {
            var empty = hostDoc.createElement("div");
            empty.className = "rte-state-inspector-empty";
            empty.innerText = "No editor events recorded yet.";
            body.appendChild(empty);
            return;
        }
        var start = eventLog[0].at;
        for (var i = eventLog.length - 1; i >= 0; i--) {
            addRow(hostDoc, "+" + (eventLog[i].at - start) + "ms", eventLog[i].event);
        }
    }
}
