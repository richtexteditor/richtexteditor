if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

RTE_DefaultConfig.plugin_slashcommand = RTE_Plugin_SlashCommand;

function RTE_Plugin_SlashCommand() {
    var obj = this;
    var config;
    var editor;
    var popupHost = null;
    var popupEl = null;

    var trigger = null;
    var commands = [];
    var filtered = [];
    var activeIndex = 0;
    var composing = false;
    var suppressNextOpen = false;

    obj.PluginName = "SlashCommand";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.slashCommandEnabled === false) return;

        config.slashCommandTrigger = config.slashCommandTrigger || "/";
        config.slashCommandMaxItems = config.slashCommandMaxItems || 40;
        config.slashCommandIncludeAi = config.slashCommandIncludeAi !== false;
        config.slashCommands = config.slashCommands || null;
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.slashCommandEnabled === false) return;

        editor.slashCommands = {
            register: registerCommand,
            remove: removeCommand,
            list: function () { return commands.slice(); },
            open: function () { openPopup(true); },
            close: closePopup,
            isOpen: function () { return !!popupEl; }
        };

        commands = buildDefaultCommands();
        if (Array.isArray(config.slashCommands)) {
            for (var i = 0; i < config.slashCommands.length; i++) {
                registerCommand(config.slashCommands[i]);
            }
        }

        injectStyles();

        var editdoc = editor.getDocument();
        editdoc.addEventListener("keydown", onEditDocKeyDown, true);
        editdoc.addEventListener("input", onEditDocInput, true);
        editdoc.addEventListener("compositionstart", function () { composing = true; });
        editdoc.addEventListener("compositionend", function () { composing = false; });
        editdoc.addEventListener("mousedown", function () { closePopup(); }, true);
        editdoc.addEventListener("blur", function () { setTimeout(closePopup, 150); }, true);

        window.addEventListener("scroll", onHostScrollOrResize, true);
        window.addEventListener("resize", onHostScrollOrResize, true);
    };

    function registerCommand(def) {
        if (!def || !def.id) return;
        var existing = findCommandIndex(def.id);
        if (existing >= 0) commands[existing] = normalizeCommand(def);
        else commands.push(normalizeCommand(def));
    }

    function removeCommand(id) {
        var idx = findCommandIndex(id);
        if (idx >= 0) commands.splice(idx, 1);
    }

    function findCommandIndex(id) {
        for (var i = 0; i < commands.length; i++) if (commands[i].id === id) return i;
        return -1;
    }

    function normalizeCommand(def) {
        return {
            id: def.id,
            section: def.section || "Blocks",
            title: def.title || def.id,
            description: def.description || "",
            keywords: (def.keywords || []).slice(),
            icon: def.icon || "",
            iconSvg: def.iconSvg || "",
            // Accept `action` as an alias for `run` — external registrations
            // (and reasonable guesses at the API) shouldn't yield a menu item
            // that silently does nothing.
            run: def.run || def.action
        };
    }

    var BLOCK_TAGS = { P:1, DIV:1, H1:1, H2:1, H3:1, H4:1, H5:1, H6:1, BLOCKQUOTE:1, PRE:1, LI:1 };

    function findCurrentBlock() {
        var sel = editor.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        var node = sel.getRangeAt(0).startContainer;
        var editable = editor.getEditable();
        while (node && node !== editable) {
            if (node.nodeType === 1 && BLOCK_TAGS[node.nodeName]) return node;
            node = node.parentNode;
        }
        return null;
    }

    function formatBlockSafe(tagName) {
        var block = findCurrentBlock();
        tagName = tagName.toUpperCase();
        // For empty blocks the built-in formatblock picks the wrong node — replace the
        // element directly. For non-empty blocks, delegate to the editor so undo/selection
        // semantics match the rest of the toolbar.
        if (block && !block.textContent.trim()) {
            var editdoc = editor.getDocument();
            var newEl = editdoc.createElement(tagName);
            newEl.appendChild(editdoc.createElement("br"));
            block.parentNode.replaceChild(newEl, block);
            var range = editdoc.createRange();
            range.setStart(newEl, 0);
            range.setEnd(newEl, 0);
            var sel = editor.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }
        editor.execCommand("formatblock", tagName);
    }

    function buildDefaultCommands() {
        var list = [];

        function push(section, id, title, description, keywords, iconSvg, run) {
            list.push(normalizeCommand({
                id: id, section: section, title: title,
                description: description, keywords: keywords,
                iconSvg: iconSvg, run: run
            }));
        }

        push("Blocks", "heading1", "Heading 1", "Large section heading", ["h1", "title"], iconHeading("1"),
            function () { formatBlockSafe("H1"); });
        push("Blocks", "heading2", "Heading 2", "Medium section heading", ["h2", "subtitle"], iconHeading("2"),
            function () { formatBlockSafe("H2"); });
        push("Blocks", "heading3", "Heading 3", "Small section heading", ["h3"], iconHeading("3"),
            function () { formatBlockSafe("H3"); });
        push("Blocks", "paragraph", "Paragraph", "Plain body text", ["p", "text", "body"], iconParagraph(),
            function () { formatBlockSafe("P"); });
        push("Blocks", "bulletlist", "Bulleted list", "Unordered list", ["ul", "bullets", "list"], iconBullets(),
            function () { editor.execCommand("insertunorderedlist"); });
        push("Blocks", "numberlist", "Numbered list", "Ordered list", ["ol", "numbered"], iconNumbered(),
            function () { editor.execCommand("insertorderedlist"); });
        push("Blocks", "quote", "Quote", "Block quotation", ["blockquote"], iconQuote(),
            function () { editor.execCommand("insertblockquote"); });
        push("Blocks", "code", "Code block", "Monospaced code block", ["pre", "snippet"], iconCode(),
            function () {
                if (editor.isCommandEnabled && editor.isCommandEnabled("insertcode")) {
                    editor.execCommand("insertcode");
                } else {
                    editor.execCommand("formatblock", "PRE");
                }
            });
        push("Blocks", "divider", "Divider", "Horizontal rule", ["hr", "line", "separator"], iconDivider(),
            function () { editor.execCommand("inserthorizontalrule"); });

        // 2026-06-04 Modern block types (callout / columns / toggle). Each is
        // only offered when the blocktypes plugin is loaded (isCommandEnabled
        // guard), so the slash menu degrades gracefully without it.
        if (!editor.isCommandEnabled || editor.isCommandEnabled("insertcallout")) {
            push("Blocks", "callout", "Callout", "Highlighted info / warning box", ["admonition", "info", "warning", "note", "tip"], iconCallout(),
                function () { editor.execCommand("insertcallout"); });
        }
        if (!editor.isCommandEnabled || editor.isCommandEnabled("insertcolumns")) {
            push("Blocks", "columns", "Columns", "Multi-column layout", ["layout", "grid", "column"], iconColumns(),
                function () { editor.execCommand("insertcolumns"); });
        }
        if (!editor.isCommandEnabled || editor.isCommandEnabled("inserttoggle")) {
            push("Blocks", "toggle", "Toggle list", "Collapsible toggle block", ["collapse", "details", "accordion", "expand"], iconToggle(),
                function () { editor.execCommand("inserttoggle"); });
        }

        if (!editor.isCommandEnabled || editor.isCommandEnabled("insertmath")) {
            push("Insert", "equation", "Equation", "Insert a math equation (TeX)", ["math", "latex", "tex", "formula", "katex"], iconEquation(),
                function () { editor.execCommand("insertmath"); });
        }
        if (!editor.isCommandEnabled || editor.isCommandEnabled("inserttodolist")) {
            push("Blocks", "todolist", "To-do list", "Checklist with clickable checkboxes", ["task", "todo", "checklist", "checkbox", "check"], iconTodo(),
                function () { editor.execCommand("inserttodolist"); });
        }
        if (!editor.isCommandEnabled || editor.isCommandEnabled("insertdiagram")) {
            push("Insert", "diagram", "Diagram", "Insert a Mermaid diagram", ["mermaid", "flowchart", "sequence", "gantt", "graph", "uml"], iconDiagram(),
                function () { editor.execCommand("insertdiagram"); });
        }
        if (!editor.isCommandEnabled || editor.isCommandEnabled("insertbookmark")) {
            push("Insert", "bookmark", "Bookmark", "Insert a link preview card", ["link", "url", "embed", "preview", "card"], iconBookmark(),
                function () { editor.execCommand("insertbookmark"); });
        }
        if (!editor.isCommandEnabled || editor.isCommandEnabled("spellcheck")) {
            push("Tools", "spellcheck", "Spell check", "Check spelling", ["spelling", "grammar", "proofread", "typo"], iconSpell(),
                function () { editor.execCommand("spellcheck"); });
        }
        if (!editor.isCommandEnabled || editor.isCommandEnabled("insertdatechip")) {
            push("Insert", "datechip", "Date chip", "Insert an interactive date chip", ["date", "calendar", "chip", "today"], iconChip(),
                function () { editor.execCommand("insertdatechip"); });
        }
        if (!editor.isCommandEnabled || editor.isCommandEnabled("insertchip")) {
            push("Insert", "chip", "Smart chip", "Insert a date / person / link chip", ["chip", "person", "mention", "link", "pill"], iconChip(),
                function () { editor.execCommand("insertchip"); });
        }
        if (!editor.isCommandEnabled || editor.isCommandEnabled("emailexport")) {
            push("Tools", "emailexport", "Export email HTML", "Inline-styled HTML for email", ["email", "inline", "mail", "newsletter", "html"], iconEmail(),
                function () { editor.execCommand("emailexport"); });
        }
        if (typeof editor.openFindDialog === "function") {
            push("Tools", "findreplace", "Find & replace", "Search the document and replace text", ["find", "replace", "search", "query", "substitute"], iconFind(),
                function () { editor.openFindDialog(); });
        }
        if (typeof editor.showShortcuts === "function") {
            push("Tools", "shortcuts", "Keyboard shortcuts", "Show the keyboard shortcut cheat sheet (Ctrl+/)", ["keyboard", "shortcuts", "hotkeys", "keys", "help", "cheat"], iconKeyboard(),
                function () { editor.showShortcuts(); });
        }
        if (typeof editor.foldAtCaret === "function") {
            push("Tools", "foldsection", "Fold section", "Collapse the section under the current heading", ["fold", "collapse", "heading", "outline", "section"], iconFold(),
                function () { editor.foldAtCaret(); });
            push("Tools", "unfoldall", "Unfold all", "Expand every collapsed heading section", ["unfold", "expand", "headings", "collapse"], iconFold(),
                function () { if (editor.unfoldAll) editor.unfoldAll(); });
        }
        if (!editor.isCommandEnabled || editor.isCommandEnabled("readaloud")) {
            push("Tools", "readaloud", "Read aloud", "Speak the selection or document (text-to-speech)", ["tts", "speak", "speech", "voice", "accessibility", "narrate"], iconReadAloud(),
                function () { editor.execCommand("readaloud"); });
        }
        if (typeof editor.requestGhostText === "function") {
            push("Tools", "aicomplete", "AI complete", "Suggest an inline AI completion of the current sentence", ["ai", "complete", "autocomplete", "ghost", "suggest", "continue", "copilot"], iconGhost(),
                function () { editor.requestGhostText(); });
        }
        if (typeof editor.copyAsMarkdown === "function") {
            push("Tools", "copymarkdown", "Copy as Markdown", "Copy the whole document to the clipboard as Markdown", ["markdown", "md", "copy", "clipboard", "export"], iconMarkdown(),
                function () { editor.copyAsMarkdown(); });
            push("Tools", "downloadmarkdown", "Download as Markdown", "Save the document as a .md file", ["markdown", "md", "download", "export", "save", "file"], iconMarkdown(),
                function () { editor.downloadMarkdown(); });
        }
        if (typeof editor.toggleTypewriterMode === "function") {
            push("Tools", "typewriter", "Typewriter mode", "Keep the caret line centred as you type", ["typewriter", "center", "scroll", "focus", "distraction", "zen"], iconTypewriter(),
                function () { editor.toggleTypewriterMode(); });
            push("Tools", "focusmode", "Focus mode", "Dim everything except the current paragraph", ["focus", "dim", "highlight", "distraction", "zen", "concentrate"], iconFocus(),
                function () { editor.toggleFocusMode(); });
        }

        push("Insert", "table", "Table", "Insert a table", ["grid", "rows", "columns"], iconTable(),
            function () { editor.execCommand("inserttable"); });
        push("Insert", "image", "Image", "Upload or embed an image", ["picture", "photo", "img"], iconImage(),
            function () { editor.execCommand("imageupload"); });
        push("Insert", "link", "Link", "Insert a hyperlink", ["url", "anchor"], iconLink(),
            function () { editor.execCommand("insertlink"); });
        push("Insert", "emoji", "Emoji", "Insert an emoji", ["smiley", "icon"], iconEmoji(),
            function () { editor.execCommand("insertemoji"); });
        push("Insert", "template", "Template", "Insert from template gallery", ["snippet"], iconTemplate(),
            function () { editor.execCommand("inserttemplate"); });
        push("Insert", "date", "Today's date", "Insert the current date", ["time", "now"], iconDate(),
            function () { editor.execCommand("insertdate"); });

        if (config.slashCommandIncludeAi && Array.isArray(config.aiToolkitActions)) {
            for (var i = 0; i < config.aiToolkitActions.length; i++) {
                (function (action) {
                    list.push(normalizeCommand({
                        id: "ai-" + action.id,
                        section: "AI",
                        title: action.title || action.id,
                        description: action.description || "",
                        keywords: ["ai", action.id],
                        iconSvg: config["svgCode_aiassist_" + (action.icon || action.id)] || config.svgCode_aiassist || "",
                        run: function () {
                            // resolveAction() only RESOLVES a definition (returns a
                            // promise with the result spec) — it never opens UI or
                            // touches the document, so these entries were silent
                            // no-ops. Route to the EXECUTING entry points instead.
                            var tk = editor.aiToolkit;
                            if (!tk) return;
                            if (action.id === "chat-panel" && typeof tk.openChatPanel === "function") { tk.openChatPanel(); return; }
                            if (action.id === "review-panel" && typeof tk.openReviewPanel === "function") { tk.openReviewPanel(); return; }
                            if (action.id === "open-dialog" && typeof tk.openDialog === "function") { tk.openDialog(); return; }
                            if (typeof tk.runQuickAction === "function") { tk.runQuickAction(action.id); return; }
                            if (typeof tk.resolveAction === "function") tk.resolveAction(action.id);
                        }
                    }));
                })(config.aiToolkitActions[i]);
            }
        }

        return list;
    }

    function onEditDocKeyDown(e) {
        if (composing) return;


        if (popupEl) {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    e.stopPropagation();
                    moveActive(1);
                    return;
                case "ArrowUp":
                    e.preventDefault();
                    e.stopPropagation();
                    moveActive(-1);
                    return;
                case "Enter":
                case "Tab":
                    if (filtered.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        selectActive();
                        return;
                    }
                    closePopup();
                    return;
                case "Escape":
                case "Esc":
                    e.preventDefault();
                    e.stopPropagation();
                    closePopup();
                    return;
            }
        }

        if (e.key === config.slashCommandTrigger && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (!isAtTriggerBoundary()) return;
            suppressNextOpen = false;
            setTimeout(function () {
                if (!suppressNextOpen) openPopup(false);
            }, 0);
        }
    }

    function onEditDocInput() {
        if (!popupEl) return;
        updateTriggerState();
    }

    function isAtTriggerBoundary() {
        var sel = editor.getSelection();
        if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
        var range = sel.getRangeAt(0);
        var node = range.startContainer;
        var offset = range.startOffset;

        // Suppress inside code/pre — users typing "/" in a code snippet mean the literal slash.
        var editable = editor.getEditable();
        var walk = node.nodeType === 1 ? node : node.parentNode;
        while (walk && walk !== editable) {
            var name = walk.nodeName;
            if (name === "CODE" || name === "PRE") return false;
            walk = walk.parentNode;
        }

        if (node.nodeType === 3) {
            if (offset === 0) return true;
            var ch = node.nodeValue.charAt(offset - 1);
            return /\s/.test(ch);
        }
        return true;
    }

    function openPopup(manual) {
        closePopup();
        var sel = editor.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        var range = sel.getRangeAt(0).cloneRange();

        // For automatic trigger, the "/" was typed before setTimeout(0) fires, so the
        // caret already sits just past it — startOffset is where the query begins.
        trigger = {
            range: range,
            startNode: range.startContainer,
            startOffset: range.startOffset,
            triggerCharCount: manual ? 0 : 1,
            query: ""
        };

        renderPopup();
        positionPopup();
        applyFilter("");
    }

    function closePopup() {
        if (popupEl && popupEl.parentNode) {
            popupEl.parentNode.removeChild(popupEl);
        }
        popupEl = null;
        trigger = null;
        filtered = [];
        activeIndex = 0;
    }

    function updateTriggerState() {
        if (!trigger) return;
        var sel = editor.getSelection();
        if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) { closePopup(); return; }
        var range = sel.getRangeAt(0);
        var node = range.startContainer;
        if (node !== trigger.startNode) { closePopup(); return; }
        var caret = range.startOffset;
        if (caret < trigger.startOffset) { closePopup(); return; }

        var text = (node.nodeType === 3 ? node.nodeValue : "") || "";
        var query = text.substring(trigger.startOffset, caret);
        if (/\s/.test(query)) { closePopup(); return; }
        trigger.query = query;
        applyFilter(query);
        positionPopup();
    }

    function applyFilter(query) {
        var q = (query || "").toLowerCase();
        filtered = commands.filter(function (cmd) {
            if (!q) return true;
            if (cmd.title.toLowerCase().indexOf(q) !== -1) return true;
            if (cmd.description && cmd.description.toLowerCase().indexOf(q) !== -1) return true;
            for (var i = 0; i < cmd.keywords.length; i++) {
                if (String(cmd.keywords[i]).toLowerCase().indexOf(q) !== -1) return true;
            }
            return false;
        }).slice(0, config.slashCommandMaxItems);
        activeIndex = 0;
        renderItems();
    }

    function renderPopup() {
        popupHost = editor.iframe.ownerDocument;
        popupEl = popupHost.createElement("div");
        popupEl.className = "rte-slash-popup";
        // The popup is body-appended (outside the editor container), so the
        // container's rte-dark class can't reach it via CSS. Mirror forced
        // dark mode here; automatic (prefers-color-scheme) dark is handled by
        // the media query in the injected stylesheet.
        try {
            var host = editor.container || (editor.getEditable && editor.getEditable().closest && editor.getEditable().closest(".richtexteditor"));
            if (host && host.classList && host.classList.contains("rte-dark")) popupEl.className += " rte-slash-popup-dark";
        } catch (e) {}
        popupEl.setAttribute("role", "listbox");
        popupEl.setAttribute("aria-label", "Slash commands");
        popupHost.body.appendChild(popupEl);
    }

    function renderItems() {
        if (!popupEl) return;
        popupEl.innerHTML = "";

        if (!filtered.length) {
            var empty = popupHost.createElement("div");
            empty.className = "rte-slash-empty";
            empty.textContent = "No matching commands";
            popupEl.appendChild(empty);
            return;
        }

        var lastSection = "";
        for (var i = 0; i < filtered.length; i++) {
            (function (cmd, index) {
                if (cmd.section !== lastSection) {
                    var sectionEl = popupHost.createElement("div");
                    sectionEl.className = "rte-slash-section";
                    sectionEl.textContent = cmd.section;
                    popupEl.appendChild(sectionEl);
                    lastSection = cmd.section;
                }
                var item = popupHost.createElement("button");
                item.type = "button";
                item.className = "rte-slash-item" + (index === activeIndex ? " rte-slash-item-active" : "");
                item.setAttribute("role", "option");
                item.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
                item.setAttribute("data-index", index);

                var icon = popupHost.createElement("span");
                icon.className = "rte-slash-item-icon";
                icon.innerHTML = cmd.iconSvg || iconDot();
                item.appendChild(icon);

                var body = popupHost.createElement("span");
                body.className = "rte-slash-item-body";
                var title = popupHost.createElement("span");
                title.className = "rte-slash-item-title";
                title.textContent = cmd.title;
                body.appendChild(title);
                if (cmd.description) {
                    var desc = popupHost.createElement("span");
                    desc.className = "rte-slash-item-desc";
                    desc.textContent = cmd.description;
                    body.appendChild(desc);
                }
                item.appendChild(body);

                // mousedown runs synchronously before focus shifts, so the editor's
                // selection stays intact. preventDefault stops the button from stealing
                // focus in the first place. click() is a fallback for programmatic
                // element.click() callers that don't dispatch a mousedown.
                item.addEventListener("mousedown", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    activeIndex = index;
                    selectActive();
                });
                item.addEventListener("click", function (e) {
                    if (!popupEl) return; // mousedown already handled it
                    e.preventDefault();
                    e.stopPropagation();
                    activeIndex = index;
                    selectActive();
                });
                item.addEventListener("mouseenter", function () {
                    if (activeIndex !== index) {
                        activeIndex = index;
                        updateActiveClass();
                    }
                });

                popupEl.appendChild(item);
            })(filtered[i], i);
        }
    }

    function updateActiveClass() {
        if (!popupEl) return;
        var items = popupEl.querySelectorAll(".rte-slash-item");
        for (var i = 0; i < items.length; i++) {
            var idx = +items[i].getAttribute("data-index");
            var active = idx === activeIndex;
            items[i].classList.toggle("rte-slash-item-active", active);
            items[i].setAttribute("aria-selected", active ? "true" : "false");
        }
        scrollActiveIntoView();
    }

    function scrollActiveIntoView() {
        if (!popupEl) return;
        var active = popupEl.querySelector(".rte-slash-item-active");
        if (!active) return;
        var top = active.offsetTop;
        var bot = top + active.offsetHeight;
        if (top < popupEl.scrollTop) popupEl.scrollTop = top;
        else if (bot > popupEl.scrollTop + popupEl.clientHeight) popupEl.scrollTop = bot - popupEl.clientHeight;
    }

    function moveActive(delta) {
        if (!filtered.length) return;
        activeIndex = (activeIndex + delta + filtered.length) % filtered.length;
        updateActiveClass();
    }

    function selectActive() {
        if (!filtered.length) { closePopup(); return; }
        var cmd = filtered[activeIndex];
        var triggerSnapshot = trigger;
        closePopup();
        if (!cmd || !triggerSnapshot) return;
        deleteTriggerText(triggerSnapshot);
        // Only re-focus if focus actually left the iframe — avoids editwin.focus()
        // nuking our freshly-placed selection when we were already focused.
        var editdoc = editor.getDocument();
        if (editdoc.activeElement !== editor.getEditable() && !editdoc.hasFocus()) {
            editor.focus();
        }
        try { cmd.run(editor); } catch (err) { console.warn("Slash command failed:", err); }
    }

    function deleteTriggerText(triggerSnapshot) {
        var node = triggerSnapshot.startNode;
        if (!node) return;
        var start = triggerSnapshot.startOffset - (triggerSnapshot.triggerCharCount || 0);
        if (start < 0) start = 0;
        var sel = editor.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        var currentRange = sel.getRangeAt(0);
        var endNode, endOffset;
        if (node.nodeType === 3 && currentRange.startContainer === node) {
            endNode = node;
            endOffset = currentRange.startOffset;
        } else {
            endNode = currentRange.startContainer;
            endOffset = currentRange.startOffset;
        }
        var delRange = editor.getDocument().createRange();
        delRange.setStart(node, start);
        delRange.setEnd(endNode, endOffset);
        try { delRange.deleteContents(); } catch (err) { return; }
        // After deleteContents(), delRange is collapsed at the deletion start — reuse it.
        sel.removeAllRanges();
        sel.addRange(delRange);
    }

    function positionPopup() {
        if (!popupEl || !trigger) return;
        var iframe = editor.iframe;
        var ir = iframe.getBoundingClientRect();
        var rects = trigger.range.getClientRects();
        var r = rects && rects.length ? rects[rects.length - 1] : null;
        if (!r) r = trigger.range.getBoundingClientRect();

        var left = ir.left + (r.left || 0) + window.pageXOffset;
        var top = ir.top + (r.bottom || r.top || 0) + window.pageYOffset + 4;

        popupEl.style.position = "absolute";
        popupEl.style.left = left + "px";
        popupEl.style.top = top + "px";

        // Flip up if would overflow viewport
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var popupRect = popupEl.getBoundingClientRect();
        if (popupRect.bottom > vh - 8 && (ir.top + (r.top || 0)) > popupRect.height + 16) {
            popupEl.style.top = (ir.top + (r.top || 0) + window.pageYOffset - popupRect.height - 4) + "px";
        }
    }

    function onHostScrollOrResize() {
        if (popupEl) positionPopup();
    }

    function injectStyles() {
        var host = (editor && editor.iframe && editor.iframe.ownerDocument) || document;
        if (host.querySelector("style[data-rte-slashcommand]")) return;
        var style = host.createElement("style");
        style.setAttribute("data-rte-slashcommand", "1");
        style.textContent = [
            "/* 2026-07-03 slash command polish */",
            ".rte-slash-popup{position:absolute;z-index:2147483000;min-width:280px;max-width:min(390px,calc(100vw - 24px));max-height:min(360px,64vh);overflow-y:auto;overscroll-behavior:contain;padding:6px;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.96));background-clip:padding-box;border:1px solid rgba(148,163,184,.22);box-shadow:0 16px 36px rgba(29,78,216,.14),0 2px 8px rgba(15,23,42,.08);border-radius:8px;font-family:Aptos,'Segoe UI',sans-serif;font-size:13px;color:#172033;scrollbar-width:thin}",
            ".rte-slash-section{position:sticky;top:0;z-index:1;margin:4px 0 2px;padding:6px 8px 4px;background:linear-gradient(180deg,rgba(248,251,255,.98),rgba(248,251,255,.86));color:#52657e;font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}",
            ".rte-slash-item{display:grid;grid-template-columns:28px minmax(0,1fr);align-items:center;gap:8px;width:100%;min-height:40px;padding:6px 8px;border:0;background:transparent;text-align:left;cursor:pointer;color:inherit;font:inherit;border-radius:8px}",
            ".rte-slash-item:hover,.rte-slash-item-active{background:#eef4ff;color:#1559d6}",
            ".rte-slash-item:focus-visible{outline:2px solid rgba(37,99,235,.22);outline-offset:2px}",
            ".rte-slash-item-icon{flex:0 0 28px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;color:#315277;background:#ffffff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(148,163,184,.18)}",
            ".rte-slash-item-active .rte-slash-item-icon{color:#1559d6;background:#ffffff}",
            ".rte-slash-item-icon svg{display:block;width:16px;height:16px;pointer-events:none}",
            ".rte-slash-item-body{display:flex;flex-direction:column;min-width:0;flex:1}",
            ".rte-slash-item-title{font-weight:780;font-size:13px;line-height:1.24;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
            ".rte-slash-item-desc{font-size:11px;color:#64748b;line-height:1.24;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
            ".rte-slash-item-active .rte-slash-item-desc{color:#315277}",
            ".rte-slash-empty{padding:16px;color:#52657e;font-size:12px;font-weight:700;text-align:center}",
            // Dark mode — applied automatically via prefers-color-scheme, and via
            // an explicit .rte-slash-popup-dark class set when the editor is in
            // forced dark mode (the popup is body-appended, outside the editor
            // container, so the container's .rte-dark class can't reach it).
            "@media (prefers-color-scheme:dark){",
            "  .rte-slash-popup{background:linear-gradient(180deg,#1e293b,#0f172a);border-color:#334155;color:#e2e8f0;box-shadow:0 20px 46px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.4)}",
            "  .rte-slash-section{background:linear-gradient(180deg,rgba(30,41,59,.98),rgba(30,41,59,.86));color:#94a3b8}",
            "  .rte-slash-item:hover,.rte-slash-item-active{background:#1d4ed8;color:#fff}",
            "  .rte-slash-item-icon{color:#cbd5e1;background:#0f172a;box-shadow:inset 0 0 0 1px rgba(148,163,184,.25)}",
            "  .rte-slash-item-active .rte-slash-item-icon{color:#fff;background:#1e3a8a}",
            "  .rte-slash-item-desc{color:#94a3b8}",
            "  .rte-slash-item-active .rte-slash-item-desc{color:#dbeafe}",
            "  .rte-slash-empty{color:#94a3b8}",
            "}",
            ".rte-slash-popup-dark{background:linear-gradient(180deg,#1e293b,#0f172a);border-color:#334155;color:#e2e8f0;box-shadow:0 20px 46px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.4)}",
            ".rte-slash-popup-dark .rte-slash-section{background:linear-gradient(180deg,rgba(30,41,59,.98),rgba(30,41,59,.86));color:#94a3b8}",
            ".rte-slash-popup-dark .rte-slash-item:hover,.rte-slash-popup-dark .rte-slash-item-active{background:#1d4ed8;color:#fff}",
            ".rte-slash-popup-dark .rte-slash-item-icon{color:#cbd5e1;background:#0f172a;box-shadow:inset 0 0 0 1px rgba(148,163,184,.25)}",
            ".rte-slash-popup-dark .rte-slash-item-active .rte-slash-item-icon{color:#fff;background:#1e3a8a}",
            ".rte-slash-popup-dark .rte-slash-item-desc{color:#94a3b8}",
            ".rte-slash-popup-dark .rte-slash-item-active .rte-slash-item-desc{color:#dbeafe}",
            ".rte-slash-popup-dark .rte-slash-empty{color:#94a3b8}"
        ].join("\n");
        host.head.appendChild(style);
    }

    // --- Icons (minimal inline SVGs) ---
    function iconHeading(n) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16"/><path d="M14 4v16"/><path d="M6 12h8"/><text x="16" y="18" font-size="9" font-weight="700" fill="currentColor" stroke="none" font-family="-apple-system,Segoe UI,sans-serif">' + n + '</text></svg>';
    }
    function iconParagraph() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4h5"/><path d="M13 4v16"/><path d="M17 4v16"/><path d="M13 4a4 4 0 000 8h0"/></svg>'; }
    function iconBullets() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="7" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/><path d="M9 7h11"/><path d="M9 12h11"/><path d="M9 17h11"/></svg>'; }
    function iconNumbered() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h1v3"/><path d="M4 9h2"/><path d="M4 14h2a1 1 0 010 2H4v1h2"/><path d="M9 7h11"/><path d="M9 12h11"/><path d="M9 17h11"/></svg>'; }
    function iconQuote() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8c-2 0-3 1.5-3 4s1 4 3 4V8z"/><path d="M16 8c-2 0-3 1.5-3 4s1 4 3 4V8z"/></svg>'; }
    function iconCode() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8l-4 4 4 4"/><path d="M15 8l4 4-4 4"/></svg>'; }
    function iconDivider() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 6h10"/><path d="M4 18h10"/></svg>'; }
    function iconTable() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 10h16"/><path d="M4 15h16"/><path d="M10 5v14"/><path d="M16 5v14"/></svg>'; }
    function iconImage() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/></svg>'; }
    function iconLink() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 10-5.7-5.7L11 7"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 105.7 5.7L13 17"/></svg>'; }
    function iconEmoji() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.5 2 4 2s3-.5 4-2"/><circle cx="9" cy="10" r=".8"/><circle cx="15" cy="10" r=".8"/></svg>'; }
    function iconTemplate() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16"/><path d="M9 9v11"/></svg>'; }
    function iconDate() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="16" height="14" rx="1.5"/><path d="M4 10h16"/><path d="M9 3v4"/><path d="M15 3v4"/></svg>'; }
    function iconDot() { return '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/></svg>'; }
    function iconCallout() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 9v4"/><path d="M12 16h.01"/></svg>'; }
    function iconColumns() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="16" rx="1"/></svg>'; }
    function iconToggle() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'; }
    function iconEquation() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5h9l-5 14"/><path d="M14 11h6"/><path d="M14 16h6"/></svg>'; }
    function iconBookmark() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="7" cy="7.5" r=".6" fill="currentColor"/></svg>'; }
    function iconSpell() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l4-10 4 10"/><path d="M5.5 13.5h5"/><path d="M14 14a2.5 2.5 0 105 0v-3"/><path d="M14 20l2 2 4-4"/></svg>'; }
    function iconChip() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="8" cy="12" r="1.6"/><path d="M12 12h6"/></svg>'; }
    function iconEmail() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>'; }
    function iconDiagram() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="5" rx="1"/><rect x="15" y="3" width="6" height="5" rx="1"/><rect x="9" y="16" width="6" height="5" rx="1"/><path d="M6 8v3h12V8M12 11v5"/></svg>'; }
    function iconReadAloud() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a4 4 0 010 7"/><path d="M19 6a7 7 0 010 12"/></svg>'; }
    function iconTodo() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7" height="7" rx="1.5"/><path d="M4.5 7.5 6 9l2.5-3"/><line x1="13" y1="6" x2="21" y2="6"/><line x1="13" y1="13" x2="21" y2="13"/><line x1="3" y1="17" x2="21" y2="17"/><line x1="3" y1="20.5" x2="14" y2="20.5"/></svg>'; }
    function iconFold() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l3 3 3-3"/><path d="M9 18l3-3 3 3"/><line x1="4" y1="12" x2="20" y2="12"/></svg>'; }
    function iconKeyboard() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/></svg>'; }
    function iconFind() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/></svg>'; }
    function iconTypewriter() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="7" rx="1"/><path d="M7 9V5h10v4"/><line x1="7" y1="20" x2="17" y2="20"/></svg>'; }
    function iconFocus() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 12h3M18 12h3M12 3v3M12 18v3"/></svg>'; }
    function iconMarkdown() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 15V9l3 3 3-3v6"/><path d="M17 9v6M14.5 12.5L17 15l2.5-2.5"/></svg>'; }
    function iconGhost() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V9a7 7 0 0114 0v12l-3-2-2 2-2-2-2 2-3-2z"/><circle cx="9.5" cy="10" r="1" fill="currentColor"/><circle cx="14.5" cy="10" r="1" fill="currentColor"/></svg>'; }
}
