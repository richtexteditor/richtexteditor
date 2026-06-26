if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

if (!RTE_DefaultConfig.svgCode_commentadd) {
    RTE_DefaultConfig.svgCode_commentadd = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h14a2 2 0 012 2v8a2 2 0 01-2 2h-7l-4 4v-4H4a2 2 0 01-2-2V7a2 2 0 012-2z"/><path d="M8 9h8"/><path d="M8 12h5"/></svg>';
}

RTE_DefaultConfig.plugin_comments = RTE_Plugin_Comments;

function RTE_Plugin_Comments() {
    var obj = this;
    var config;
    var editor;
    var sidebar = null;
    var composer = null;

    obj.PluginName = "Comments";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.commentsEnabled === false) return;

        config.text_commentadd = config.text_commentadd || "Comment";
        config.commentHighlightBg = config.commentHighlightBg || "#fff9c4";
        config.commentHighlightBorder = config.commentHighlightBorder || "#f9a825";

        appendToolbarCommand("toolbar_default", "#{commentadd}");
        appendToolbarCommand("toolbar_full", "#{commentadd}");
        appendToolbarCommand("toolbar_mobile", "#{commentadd}");
        if ((config.controltoolbar_TEXT || "").indexOf("commentadd") === -1) {
            config.controltoolbar_TEXT = (config.controltoolbar_TEXT || "") + "|{commentadd}";
        }
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.commentsEnabled === false) return;

        editor.comments = {
            add: function (options) { return addComment(options); },
            reply: function (commentId, text) { return replyToComment(commentId, text); },
            resolve: function (commentId) { return resolveComment(commentId); },
            delete: function (commentId) { return deleteComment(commentId); },
            list: function (filter) { return listComments(filter); },
            openSidebar: function () { openSidebar(); },
            closeSidebar: function () { closeSidebar(); },
            toggleSidebar: function () { if (sidebar && sidebar.isConnected) closeSidebar(); else openSidebar(); },
            focusComment: function (id) { focusComment(id); }
        };

        injectStyles();

        editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
        editor.toolbarFactoryMap["commentadd"] = function (cmd) {
            return editor.createToolbarButton(cmd);
        };

        editor.attachEvent("exec_command_commentadd", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            openComposerForSelection();
        });

        editor.getEditable().addEventListener("click", function (e) {
            var span = e.target && e.target.closest ? e.target.closest(".rte-comment") : null;
            if (!span) return;
            var id = span.getAttribute("data-comment-id");
            if (id) focusComment(id);
        });

        // Restore existing comments on load so their spans re-hydrate from the ledger.
        // (Span markup is persisted in the HTML itself, but we also make sure no
        // orphan ledger entries point at missing spans.)
        pruneOrphanComments();
    };

    function appendToolbarCommand(toolbar, item) {
        if (!config[toolbar]) return;
        if (config[toolbar].indexOf(item) !== -1) return;
        config[toolbar] = config[toolbar] + item;
    }

    function getCurrentUser() {
        if (config.currentUser && config.currentUser.id) return config.currentUser;
        return { id: "user", name: "User", color: "#2563eb" };
    }

    // The sidebar/composer are body-appended, outside the editor container, so
    // the container's rte-dark class can't reach them via CSS. Mirror forced
    // dark mode by adding rte-comment-dark; automatic dark uses a media query.
    function isEditorDark() {
        try {
            var host = editor.container || (editor.getEditable && editor.getEditable().closest && editor.getEditable().closest(".richtexteditor"));
            return !!(host && host.classList && host.classList.contains("rte-dark"));
        } catch (e) { return false; }
    }

    function listComments(filter) {
        if (!editor.reviewLedger) return [];
        return editor.reviewLedger.list().filter(function (e) {
            if (e.changeType !== "comment") return false;
            if (filter && filter.status && e.status !== filter.status) return false;
            if (filter && filter.author && e.author.id !== filter.author) return false;
            return true;
        });
    }

    function pruneOrphanComments() {
        var editable = editor.getEditable();
        var entries = listComments();
        for (var i = 0; i < entries.length; i++) {
            var id = entries[i].id;
            if (!editable.querySelector('[data-comment-id="' + cssEscape(id) + '"]')) {
                // Don't actually delete — just mark stale.
                if (editor.reviewLedger && entries[i].status === "pending") {
                    editor.reviewLedger.update(id, { status: "stale" });
                }
            }
        }
    }

    // --- creating comments ---

    function openComposerForSelection() {
        var sel = editor.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            // No selection — open composer anchored to caret, with empty snapshot.
            var rangeInfo = sel && sel.rangeCount ? snapshotRange(sel.getRangeAt(0)) : null;
            showComposer({ anchor: rangeInfo, allowEmpty: true });
            return;
        }
        var range = sel.getRangeAt(0);
        showComposer({ anchor: snapshotRange(range), range: range });
    }

    function snapshotRange(range) {
        if (!range) return null;
        return {
            startContainer: range.startContainer,
            startOffset: range.startOffset,
            endContainer: range.endContainer,
            endOffset: range.endOffset,
            text: range.toString()
        };
    }

    function showComposer(options) {
        closeComposer();
        options = options || {};
        var host = editor.iframe.ownerDocument;
        composer = host.createElement("div");
        composer.className = "rte-comment-composer" + (isEditorDark() ? " rte-comment-dark" : "");
        composer.setAttribute("role", "dialog");
        composer.setAttribute("aria-label", "Add comment");

        var header = host.createElement("div");
        header.className = "rte-comment-composer-header";
        header.textContent = "Add comment";
        composer.appendChild(header);

        var textarea = host.createElement("textarea");
        textarea.className = "rte-comment-composer-textarea";
        textarea.placeholder = "Type your comment...";
        textarea.rows = 3;
        composer.appendChild(textarea);

        var actions = host.createElement("div");
        actions.className = "rte-comment-composer-actions";
        var cancel = host.createElement("button");
        cancel.type = "button";
        cancel.className = "rte-comment-btn rte-comment-btn-ghost";
        cancel.textContent = "Cancel";
        cancel.addEventListener("mousedown", function (e) { e.preventDefault(); closeComposer(); });
        var submit = host.createElement("button");
        submit.type = "button";
        submit.className = "rte-comment-btn rte-comment-btn-primary";
        submit.textContent = "Comment";
        submit.addEventListener("mousedown", function (e) {
            e.preventDefault();
            var text = textarea.value.replace(/^\s+|\s+$/g, "");
            if (!text) return;
            addComment({ anchor: options.anchor, text: text });
            closeComposer();
        });
        actions.appendChild(cancel);
        actions.appendChild(submit);
        composer.appendChild(actions);

        host.body.appendChild(composer);
        positionComposer(options.anchor);
        setTimeout(function () { textarea.focus(); }, 0);

        var escListener = function (e) {
            if (e.key === "Escape" || e.key === "Esc") closeComposer();
        };
        composer.addEventListener("keydown", escListener);
    }

    function positionComposer(anchor) {
        if (!composer) return;
        composer.style.position = "absolute";
        var iframe = editor.iframe;
        var ir = iframe.getBoundingClientRect();
        var left = ir.left + window.pageXOffset + 12;
        var top = ir.top + window.pageYOffset + 12;
        if (anchor && anchor.startContainer) {
            try {
                var r = editor.getDocument().createRange();
                r.setStart(anchor.startContainer, anchor.startOffset);
                r.setEnd(anchor.endContainer, anchor.endOffset);
                var rects = r.getClientRects();
                var rect = rects && rects.length ? rects[rects.length - 1] : r.getBoundingClientRect();
                left = ir.left + (rect.left || 0) + window.pageXOffset;
                top = ir.top + (rect.bottom || rect.top || 0) + window.pageYOffset + 6;
            } catch (ignore) { }
        }
        composer.style.left = left + "px";
        composer.style.top = top + "px";
    }

    function closeComposer() {
        if (composer && composer.parentNode) composer.parentNode.removeChild(composer);
        composer = null;
    }

    function addComment(options) {
        options = options || {};
        if (!editor.reviewLedger) return null;
        var text = (options.text || "").replace(/^\s+|\s+$/g, "");
        if (!text) return null;

        var id = "cmt-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
        var user = getCurrentUser();
        var anchor = options.anchor;
        var wrappedText = "";

        if (anchor && anchor.startContainer && anchor.endContainer && anchor.text) {
            var editdoc = editor.getDocument();
            try {
                var wrapRange = editdoc.createRange();
                wrapRange.setStart(anchor.startContainer, anchor.startOffset);
                wrapRange.setEnd(anchor.endContainer, anchor.endOffset);
                var span = editdoc.createElement("span");
                span.className = "rte-comment";
                span.setAttribute("data-comment-id", id);
                span.setAttribute("data-comment-author", user.id);
                var fragment = wrapRange.extractContents();
                span.appendChild(fragment);
                wrapRange.insertNode(span);
                wrappedText = span.textContent;
                // Collapse caret after the span.
                var after = editdoc.createRange();
                after.setStartAfter(span);
                after.collapse(true);
                var sel = editor.getSelection();
                sel.removeAllRanges();
                sel.addRange(after);
            } catch (err) {
                console.warn("comments: range wrap failed:", err);
            }
        }

        editor.reviewLedger.add({
            id: id,
            changeType: "comment",
            author: user,
            text: text,
            originalText: wrappedText || (anchor && anchor.text) || "",
            status: "pending",
            sourceLabel: "Comment",
            createdAt: Date.now(),
            replies: []
        });

        if (sidebar && sidebar.isConnected) renderSidebar();
        else openSidebar();
        focusComment(id);
        try { if (typeof editor.fireEvent === "function") editor.fireEvent("comment_added", { id: id, text: text, author: user }); } catch (e) { }
        return id;
    }

    function replyToComment(commentId, text) {
        if (!editor.reviewLedger) return false;
        var entry = editor.reviewLedger.get(commentId);
        if (!entry) return false;
        var replies = Array.isArray(entry.replies) ? entry.replies.slice() : [];
        replies.push({
            id: "rpl-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
            author: getCurrentUser(),
            text: text,
            createdAt: Date.now()
        });
        editor.reviewLedger.update(commentId, { replies: replies });
        if (sidebar && sidebar.isConnected) renderSidebar();
        return true;
    }

    function resolveComment(commentId) {
        if (!editor.reviewLedger) return false;
        var span = editor.getEditable().querySelector('[data-comment-id="' + cssEscape(commentId) + '"]');
        if (span) unwrapKeepChildren(span);
        editor.reviewLedger.update(commentId, { status: "resolved", decidedAt: Date.now() });
        if (sidebar && sidebar.isConnected) renderSidebar();
        try { if (typeof editor.fireEvent === "function") editor.fireEvent("comment_resolved", { id: commentId }); } catch (e) { }
        return true;
    }

    function deleteComment(commentId) {
        if (!editor.reviewLedger) return false;
        var span = editor.getEditable().querySelector('[data-comment-id="' + cssEscape(commentId) + '"]');
        if (span) unwrapKeepChildren(span);
        editor.reviewLedger.remove(commentId);
        if (sidebar && sidebar.isConnected) renderSidebar();
        return true;
    }

    function focusComment(commentId) {
        if (!sidebar || !sidebar.isConnected) openSidebar();
        setTimeout(function () {
            if (!sidebar) return;
            var item = sidebar.querySelector('[data-comment-ref="' + cssEscape(commentId) + '"]');
            if (item) {
                item.scrollIntoView({ block: "nearest" });
                item.classList.add("rte-comment-item-active");
                setTimeout(function () { item.classList.remove("rte-comment-item-active"); }, 1400);
            }
        }, 30);
    }

    function unwrapKeepChildren(el) {
        var parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    }

    // 2026-05-28 Prefer native CSS.escape when available — handles every code
    // point that would break an attribute selector (], ', U+0000, U+0001..0x1F,
    // leading digits, etc.). Comment IDs are auto-generated today so the legacy
    // single-char shim worked, but defense-in-depth pays off if a customer
    // ever wires reviewLedger.add() with custom IDs containing punctuation.
    function cssEscape(s) {
        var str = String(s);
        if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
            try { return CSS.escape(str); } catch (e) { /* fall through */ }
        }
        // Fallback: escape every char that could break an attribute selector.
        return str.replace(/["\\\]\[\(\)\{\}'#:;,<>=`~!@$%^&*+/?\s\x00-\x1F]/g, function (c) {
            return "\\" + c;
        });
    }

    // --- sidebar ---

    function openSidebar() {
        if (sidebar && sidebar.isConnected) { renderSidebar(); return; }
        var host = editor.iframe.ownerDocument;
        sidebar = host.createElement("div");
        sidebar.className = "rte-comment-sidebar" + (isEditorDark() ? " rte-comment-dark" : "");
        sidebar.setAttribute("role", "complementary");
        sidebar.setAttribute("aria-label", "Comments");
        var shell = getEditorShell();
        if (shell) {
            shell.parentNode.insertBefore(sidebar, shell.nextSibling);
            shell.classList.add("rte-comment-sidebar-host");
        } else {
            host.body.appendChild(sidebar);
        }
        renderSidebar();
    }

    function closeSidebar() {
        if (sidebar && sidebar.parentNode) sidebar.parentNode.removeChild(sidebar);
        sidebar = null;
        var shell = getEditorShell();
        if (shell) shell.classList.remove("rte-comment-sidebar-host");
    }

    function getEditorShell() {
        var el = editor.iframe;
        while (el && el !== document.body) {
            if (el.classList && el.classList.contains("richtexteditor")) return el;
            el = el.parentNode;
        }
        return null;
    }

    function renderSidebar() {
        if (!sidebar) return;
        var host = sidebar.ownerDocument;
        sidebar.innerHTML = "";

        var header = host.createElement("div");
        header.className = "rte-comment-sidebar-header";
        var title = host.createElement("div");
        title.className = "rte-comment-sidebar-title";
        title.textContent = "Comments";
        header.appendChild(title);
        var close = host.createElement("button");
        close.type = "button";
        close.className = "rte-comment-sidebar-close";
        close.setAttribute("aria-label", "Close");
        close.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
        close.addEventListener("mousedown", function (e) { e.preventDefault(); closeSidebar(); });
        header.appendChild(close);
        sidebar.appendChild(header);

        var list = host.createElement("div");
        list.className = "rte-comment-list";
        sidebar.appendChild(list);

        var entries = listComments({ status: "pending" });
        if (!entries.length) {
            var empty = host.createElement("div");
            empty.className = "rte-comment-empty";
            empty.textContent = "No open comments. Select text and click the Comment button to start.";
            list.appendChild(empty);
            return;
        }

        entries.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });

        for (var i = 0; i < entries.length; i++) {
            list.appendChild(renderEntry(entries[i], host));
        }
    }

    function renderEntry(entry, host) {
        var wrap = host.createElement("div");
        wrap.className = "rte-comment-item";
        wrap.setAttribute("data-comment-ref", entry.id);
        wrap.setAttribute("role", "article");

        var topRow = host.createElement("div");
        topRow.className = "rte-comment-item-top";
        var avatar = host.createElement("span");
        avatar.className = "rte-comment-avatar";
        avatar.style.background = entry.author.color || "#2563eb";
        avatar.textContent = initialsOf(entry.author.name || entry.author.id || "?");
        var nameWrap = host.createElement("div");
        nameWrap.className = "rte-comment-namewrap";
        var name = host.createElement("div");
        name.className = "rte-comment-name";
        name.textContent = entry.author.name || entry.author.id || "";
        var when = host.createElement("div");
        when.className = "rte-comment-when";
        when.textContent = relativeTime(entry.createdAt);
        nameWrap.appendChild(name);
        nameWrap.appendChild(when);
        topRow.appendChild(avatar);
        topRow.appendChild(nameWrap);

        var actions = host.createElement("div");
        actions.className = "rte-comment-actions";
        var resolveBtn = host.createElement("button");
        resolveBtn.type = "button";
        resolveBtn.className = "rte-comment-action rte-comment-resolve";
        resolveBtn.textContent = "Resolve";
        resolveBtn.setAttribute("aria-label", "Resolve comment");
        resolveBtn.addEventListener("mousedown", function (e) { e.preventDefault(); resolveComment(entry.id); });
        var delBtn = host.createElement("button");
        delBtn.type = "button";
        delBtn.className = "rte-comment-action rte-comment-delete";
        delBtn.textContent = "Delete";
        delBtn.setAttribute("aria-label", "Delete comment");
        delBtn.addEventListener("mousedown", function (e) { e.preventDefault(); deleteComment(entry.id); });
        actions.appendChild(resolveBtn);
        actions.appendChild(delBtn);
        topRow.appendChild(actions);

        wrap.appendChild(topRow);

        if (entry.originalText) {
            var quote = host.createElement("div");
            quote.className = "rte-comment-quote";
            quote.textContent = truncate(entry.originalText, 140);
            quote.addEventListener("click", function () { scrollToSpan(entry.id); });
            wrap.appendChild(quote);
        }

        var body = host.createElement("div");
        body.className = "rte-comment-body";
        body.textContent = entry.text;
        wrap.appendChild(body);

        var replies = Array.isArray(entry.replies) ? entry.replies : [];
        for (var i = 0; i < replies.length; i++) {
            var rep = replies[i];
            var repEl = host.createElement("div");
            repEl.className = "rte-comment-reply";
            var repAv = host.createElement("span");
            repAv.className = "rte-comment-reply-avatar";
            repAv.style.background = (rep.author && rep.author.color) || "#64748b";
            repAv.textContent = initialsOf((rep.author && rep.author.name) || "?");
            var repBody = host.createElement("div");
            repBody.className = "rte-comment-reply-body";
            var repName = host.createElement("div");
            repName.className = "rte-comment-reply-name";
            repName.textContent = ((rep.author && rep.author.name) || "User") + " \u00B7 " + relativeTime(rep.createdAt);
            var repText = host.createElement("div");
            repText.className = "rte-comment-reply-text";
            repText.textContent = rep.text;
            repBody.appendChild(repName);
            repBody.appendChild(repText);
            repEl.appendChild(repAv);
            repEl.appendChild(repBody);
            wrap.appendChild(repEl);
        }

        // Reply composer
        var replyRow = host.createElement("div");
        replyRow.className = "rte-comment-reply-composer";
        var replyInput = host.createElement("input");
        replyInput.type = "text";
        replyInput.className = "rte-comment-reply-input";
        replyInput.placeholder = "Reply...";
        replyInput.setAttribute("aria-label", "Reply to comment");
        replyInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                var t = replyInput.value.replace(/^\s+|\s+$/g, "");
                if (t) replyToComment(entry.id, t);
                replyInput.value = "";
            }
        });
        replyRow.appendChild(replyInput);
        wrap.appendChild(replyRow);

        return wrap;
    }

    function scrollToSpan(commentId) {
        var span = editor.getEditable().querySelector('[data-comment-id="' + cssEscape(commentId) + '"]');
        if (!span) return;
        span.scrollIntoView({ block: "center", behavior: "smooth" });
        span.classList.add("rte-comment-flash");
        setTimeout(function () { span.classList.remove("rte-comment-flash"); }, 1200);
    }

    function initialsOf(label) {
        var parts = String(label).trim().split(/\s+/);
        if (!parts[0]) return "?";
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    function relativeTime(ts) {
        if (!ts) return "";
        var diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return "just now";
        if (diff < 3600) return Math.floor(diff / 60) + "m ago";
        if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
        return Math.floor(diff / 86400) + "d ago";
    }

    function truncate(s, n) {
        if (s.length <= n) return s;
        return s.slice(0, n - 1) + "\u2026";
    }

    function injectStyles() {
        var host = (editor && editor.iframe && editor.iframe.ownerDocument) || document;
        if (!host.querySelector("style[data-rte-comments]")) {
            var style = host.createElement("style");
            style.setAttribute("data-rte-comments", "1");
            style.textContent = [
                ".rte-comment-sidebar-host{display:flex!important;align-items:stretch}",
                ".rte-comment-sidebar{width:310px;min-width:270px;max-width:min(360px,32vw);margin-left:12px;padding:0;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.96));border:1px solid rgba(148,163,184,.22);border-radius:16px;font-family:Aptos,'Segoe UI',sans-serif;font-size:13px;color:#172033;display:flex;flex-direction:column;max-height:calc(100vh - 120px);overflow:hidden;box-shadow:0 18px 42px rgba(29,78,216,.12),0 2px 8px rgba(15,23,42,.06)}",
                ".rte-comment-sidebar-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 10px 9px 14px;border-bottom:1px solid rgba(148,163,184,.16);font-weight:750;background:rgba(255,255,255,.72)}",
                ".rte-comment-sidebar-title{font-size:13px;font-weight:850;letter-spacing:.02em}",
                ".rte-comment-sidebar-close{width:28px;height:28px;border:1px solid rgba(100,116,139,.18);background:#fff;cursor:pointer;color:#64748b;padding:0;border-radius:999px;display:inline-flex;align-items:center;justify-content:center}",
                ".rte-comment-sidebar-close:hover,.rte-comment-sidebar-close:focus-visible{background:#eef4ff;color:#0f3f9f;border-color:rgba(37,99,235,.28)}",
                ".rte-comment-list{flex:1;min-height:0;overflow-y:auto;padding:6px;scrollbar-width:thin}",
                ".rte-comment-empty{margin:6px;padding:14px;color:#52657e;font-size:12px;font-weight:700;line-height:1.45;text-align:center;background:#fff;border:1px dashed rgba(148,163,184,.28);border-radius:13px}",
                ".rte-comment-item{padding:10px;border:1px solid rgba(148,163,184,.14);border-radius:14px;background:rgba(255,255,255,.82);box-shadow:0 8px 18px rgba(15,23,42,.04);transition:background 200ms ease,box-shadow 200ms ease,transform 200ms ease}",
                ".rte-comment-item+.rte-comment-item{margin-top:7px}",
                ".rte-comment-item-active{background:#eef4ff;box-shadow:0 12px 28px rgba(37,99,235,.14);transform:translateY(-1px)}",
                ".rte-comment-item-top{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:8px}",
                ".rte-comment-avatar{width:30px;height:30px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;flex:0 0 30px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}",
                ".rte-comment-namewrap{flex:1;min-width:0}",
                ".rte-comment-name{font-weight:800;font-size:12px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
                ".rte-comment-when{font-size:11px;color:#64748b}",
                ".rte-comment-actions{display:flex;gap:4px;align-items:center}",
                ".rte-comment-action{font-size:11px;font-weight:750;padding:4px 8px;border-radius:999px;border:1px solid rgba(100,116,139,.16);background:#fff;cursor:pointer}",
                ".rte-comment-action:hover,.rte-comment-action:focus-visible{transform:translateY(-1px)}",
                ".rte-comment-resolve{color:#0f3f9f;border-color:rgba(37,99,235,.2);background:#eef4ff}",
                ".rte-comment-delete{color:#9f1239;border-color:rgba(159,18,57,.18);background:#fff1f2}",
                ".rte-comment-quote{margin:8px 0 0;padding:7px 9px;background:#fff8e8;border:1px solid rgba(245,158,11,.18);border-left:3px solid #f59e0b;border-radius:11px;font-size:11px;color:#67430a;cursor:pointer;line-height:1.35}",
                ".rte-comment-quote:hover{background:#fff3cf}",
                ".rte-comment-body{margin-top:8px;font-size:13px;line-height:1.45;color:#172033;white-space:pre-wrap}",
                ".rte-comment-reply{display:flex;gap:8px;margin-top:10px;padding-top:9px;border-top:1px dashed rgba(148,163,184,.22)}",
                ".rte-comment-reply-avatar{width:24px;height:24px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:800;flex:0 0 24px}",
                ".rte-comment-reply-body{flex:1;min-width:0}",
                ".rte-comment-reply-name{font-size:11px;color:#64748b}",
                ".rte-comment-reply-text{font-size:12px;color:#172033;line-height:1.45;white-space:pre-wrap;margin-top:2px}",
                ".rte-comment-reply-composer{margin-top:8px;display:flex}",
                ".rte-comment-reply-input{flex:1;min-width:0;padding:7px 10px;border-radius:999px;border:1px solid rgba(148,163,184,.24);font:inherit;font-size:12px;background:#fff}",
                ".rte-comment-reply-input:focus,.rte-comment-composer-textarea:focus{outline:2px solid rgba(37,99,235,.18);border-color:rgba(37,99,235,.38)}",
                ".rte-comment-composer{position:absolute;z-index:2147483000;width:min(320px,calc(100vw - 24px));background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid rgba(148,163,184,.22);box-shadow:0 18px 42px rgba(29,78,216,.16),0 2px 8px rgba(15,23,42,.08);border-radius:16px;padding:12px;font-family:Aptos,'Segoe UI',sans-serif;color:#172033}",
                ".rte-comment-composer-header{font-weight:850;font-size:13px;margin-bottom:8px;color:#172033}",
                ".rte-comment-composer-textarea{width:100%;box-sizing:border-box;padding:9px 10px;border-radius:12px;border:1px solid rgba(148,163,184,.24);font:inherit;font-size:13px;resize:vertical;min-height:70px;background:#fff}",
                ".rte-comment-composer-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:9px}",
                ".rte-comment-btn{min-height:30px;padding:0 13px;border-radius:999px;border:1px solid rgba(100,116,139,.18);font:750 12px/1 Aptos,'Segoe UI',sans-serif;cursor:pointer}",
                ".rte-comment-btn-ghost{background:#fff;color:#52657e}",
                ".rte-comment-btn-primary{background:#1d67ba;color:#fff;border-color:#1d67ba;box-shadow:0 8px 16px rgba(29,103,186,.18)}",
                // Dark mode — the sidebar/composer are body-appended (outside the
                // editor container) so the .rte-dark class can't reach them. Apply
                // automatically via prefers-color-scheme, and via an explicit
                // .rte-comment-dark class set when the editor is forced dark.
                "@media (prefers-color-scheme:dark){",
                "  .rte-comment-sidebar,.rte-comment-composer{background:linear-gradient(180deg,#1e293b,#0f172a);border-color:#334155;color:#e2e8f0}",
                "  .rte-comment-sidebar-header{background:rgba(30,41,59,.72);border-color:#334155}",
                "  .rte-comment-item{background:rgba(30,41,59,.85);border-color:#334155}",
                "  .rte-comment-item-active{background:#1e3a8a}",
                "  .rte-comment-empty{background:#0f172a;color:#94a3b8;border-color:#334155}",
                "  .rte-comment-when,.rte-comment-reply-name{color:#94a3b8}",
                "  .rte-comment-body,.rte-comment-reply-text,.rte-comment-composer-header{color:#e2e8f0}",
                "  .rte-comment-reply-input,.rte-comment-composer-textarea{background:#0f172a;color:#e2e8f0;border-color:#334155}",
                "  .rte-comment-action,.rte-comment-btn-ghost,.rte-comment-sidebar-close{background:#0f172a;color:#cbd5e1;border-color:#334155}",
                "  .rte-comment-quote{background:rgba(245,158,11,.12);color:#fcd34d}",
                "}",
                ".rte-comment-dark.rte-comment-sidebar,.rte-comment-dark.rte-comment-composer{background:linear-gradient(180deg,#1e293b,#0f172a);border-color:#334155;color:#e2e8f0}",
                ".rte-comment-dark .rte-comment-sidebar-header{background:rgba(30,41,59,.72);border-color:#334155}",
                ".rte-comment-dark .rte-comment-item{background:rgba(30,41,59,.85);border-color:#334155}",
                ".rte-comment-dark .rte-comment-item-active{background:#1e3a8a}",
                ".rte-comment-dark .rte-comment-empty{background:#0f172a;color:#94a3b8;border-color:#334155}",
                ".rte-comment-dark .rte-comment-when,.rte-comment-dark .rte-comment-reply-name{color:#94a3b8}",
                ".rte-comment-dark .rte-comment-body,.rte-comment-dark .rte-comment-reply-text,.rte-comment-dark .rte-comment-composer-header{color:#e2e8f0}",
                ".rte-comment-dark .rte-comment-reply-input,.rte-comment-dark .rte-comment-composer-textarea{background:#0f172a;color:#e2e8f0;border-color:#334155}",
                ".rte-comment-dark .rte-comment-action,.rte-comment-dark .rte-comment-btn-ghost,.rte-comment-dark .rte-comment-sidebar-close{background:#0f172a;color:#cbd5e1;border-color:#334155}",
                ".rte-comment-dark .rte-comment-quote{background:rgba(245,158,11,.12);color:#fcd34d}"
            ].join("\n");
            host.head.appendChild(style);
        }

        var editdoc = editor.getDocument();
        if (editdoc && editdoc.head && !editdoc.querySelector("style[data-rte-comments-inline]")) {
            var iStyle = editdoc.createElement("style");
            iStyle.setAttribute("data-rte-comments-inline", "1");
            iStyle.textContent = [
                ".rte-comment{background:" + config.commentHighlightBg + ";border-bottom:2px solid " + config.commentHighlightBorder + ";cursor:pointer;padding:0 1px;border-radius:2px}",
                ".rte-comment:hover{background:rgba(253,230,138,.6)}",
                ".rte-comment-flash{animation:rte-comment-flash 1.2s ease}",
                "@keyframes rte-comment-flash{0%{background:rgba(251,191,36,.9)}100%{background:" + config.commentHighlightBg + "}}"
            ].join("\n");
            editdoc.head.appendChild(iStyle);
        }
    }

    // Block-anchored comments: img, table, figure, video, audio, iframe, embed, object, hr, svg.
    function resolveCommentTarget(range, editdoc) {
        if (!range) return null;
        var container = range.commonAncestorContainer;
        var el = container && container.nodeType === 1 ? container : (container && container.parentNode);
        if (!el) return null;
        // If selection collapses on/inside an embedded block, anchor to that element instead of a text range.
        var block = el.closest && el.closest("img,table,figure,video,audio,iframe,embed,object,hr,svg");
        if (!block && el.querySelector) {
            block = el.querySelector("img,table,figure,video,audio,iframe,embed,object,hr,svg");
        }
        if (block) {
            block.setAttribute("data-rte-comment-anchor", "element");
            return { kind: "element", element: block };
        }
        return { kind: "range", range: range };
    }

    function isElementAnchoredComment(el) {
        if (!el || el.nodeType !== 1 || !el.getAttribute) return false;
        if (el.getAttribute("data-rte-comment-anchor") === "element") return true;
        return false;
    }
}
