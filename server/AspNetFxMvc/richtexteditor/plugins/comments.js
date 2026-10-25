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
            focusComment: function (id) { focusComment(id); },
            react: function (commentId, emoji) { return reactToComment(commentId, emoji); },
            next: function () { return stepComment(1); },
            previous: function () { return stepComment(-1); }
        };

        injectStyles();

        editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
        editor.toolbarFactoryMap["commentadd"] = function (cmd) {
            return editor.createToolbarButton(cmd);
        };

        // 2026-10-17 Ctrl/Cmd+Alt+M adds a comment on the selection (Google Docs, CKEditor and TinyMCE bind it). A key that
        // reports a character other than "m" is AltGr typing (German AltGr+M is a micro sign) and is left alone.
        // tools/keyboard/comment-shortcut.mjs
        (editor.bindDocumentEvent ? function (fn) { editor.bindDocumentEvent("keydown", fn, true); } : function (fn) { editor.getDocument().addEventListener("keydown", fn, true); })(function (e) {
            if (!(e.ctrlKey || e.metaKey) || !e.altKey || e.shiftKey) return;
            if (e.key !== "m" && e.key !== "M") return;
            e.preventDefault();
            openComposerForSelection();
        });

        // 2026-10-17 Google Docs' chords: Ctrl/Cmd+Alt+N then C = next comment, Ctrl/Cmd+Alt+P then C = previous. A key
        // that reports a character other than n / p is AltGr typing and is left alone. tools/comments/comment-navigation.mjs
        var chordDir = 0, chordAt = 0;
        (editor.bindDocumentEvent ? function (fn) { editor.bindDocumentEvent("keydown", fn, true); } : function (fn) { editor.getDocument().addEventListener("keydown", fn, true); })(function (e) {
            if ((e.ctrlKey || e.metaKey) && e.altKey && !e.shiftKey && (e.key === "n" || e.key === "N" || e.key === "p" || e.key === "P")) {
                chordDir = (e.key === "n" || e.key === "N") ? 1 : -1;
                chordAt = Date.now();
                e.preventDefault();
                return;
            }
            if (chordDir && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "c" || e.key === "C") && Date.now() - chordAt < 2000) {
                var dir = chordDir;
                chordDir = 0;
                e.preventDefault();
                stepComment(dir);
                return;
            }
            if (e.key !== "Control" && e.key !== "Alt" && e.key !== "Meta" && e.key !== "Shift") chordDir = 0;
        });

        editor.attachEvent("exec_command_commentadd", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            openComposerForSelection();
        });

        // 2026-10-17 bound through the core so it follows the live editing document: plugins that wrap the content area move
        // the iframe during init, and a listener on the old document died (a click on a comment's highlight did nothing).
        // tools/keyboard/plugin-listeners-live.mjs
        (editor.bindEditableEvent ? function (fn) { editor.bindEditableEvent("click", fn); } : function (fn) { editor.getEditable().addEventListener("click", fn); })(function (e) {
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

    // 2026-10-18 a comments button runs its action on click, so Enter and Space work (they fire click, not mousedown;
    // these ran on mousedown only and did nothing from the keyboard). mousedown still prevents default so a mouse press
    // keeps the editor's selection. If a keyboard press re-rendered the sidebar and took focus with it, focus goes to
    // the sidebar's first control. tools/a11y/comment-buttons-keyboard.mjs
    function onActivate(el, fn) {
        el.addEventListener("mousedown", function (e) { e.preventDefault(); });
        el.addEventListener("click", function (e) {
            e.preventDefault();
            var fromKeyboard = e.detail === 0;
            fn();
            if (!fromKeyboard || !sidebar || !sidebar.isConnected) return;
            var a = sidebar.ownerDocument.activeElement;
            if (a && a !== sidebar.ownerDocument.body && a.isConnected) return;
            var first = sidebar.querySelector("button, [tabindex]:not([tabindex='-1'])");
            if (first) { try { first.focus(); } catch (x) { /* ignore */ } }
        });
    }

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
        composer.setAttribute("aria-label", cmText("cm_addcomment", "Add comment"));

        var header = host.createElement("div");
        header.className = "rte-comment-composer-header";
        header.textContent = cmText("cm_addcomment", "Add comment");
        composer.appendChild(header);

        var textarea = host.createElement("textarea");
        textarea.className = "rte-comment-composer-textarea";
        textarea.placeholder = cmText("cm_typecomment", "Type your comment...");
        textarea.rows = 3;
        composer.appendChild(textarea);

        // Mentions: "@" starts a list of the users in config.commentMentions. Choosing one inserts "@Name" and keeps
        // the user id with the comment. tools/comments/comment-mentions.mjs
        var mentionBox = host.createElement("div");
        mentionBox.className = "rte-comment-mentions";
        mentionBox.setAttribute("role", "listbox");
        mentionBox.style.display = "none";
        composer.appendChild(mentionBox);
        var picked = [];
        var mentionItems = [];
        var mentionActive = 0;
        var mentionStart = -1;
        function mentionQuery() {
            var before = textarea.value.slice(0, textarea.selectionStart);
            var m = /(^|\s)@([^\s@]*)$/.exec(before);
            if (!m) return null;
            mentionStart = before.length - m[2].length - 1;
            return m[2];
        }
        function hideMentions() {
            while (mentionBox.firstChild) mentionBox.removeChild(mentionBox.firstChild);
            mentionBox.style.display = "none";
            mentionItems = [];
            mentionStart = -1;
        }
        function paintMentions() {
            while (mentionBox.firstChild) mentionBox.removeChild(mentionBox.firstChild);
            for (var i = 0; i < mentionItems.length; i++) {
                var opt = host.createElement("div");
                opt.className = "rte-comment-mention-option" + (i === mentionActive ? " rte-comment-mention-active" : "");
                opt.setAttribute("role", "option");
                opt.setAttribute("aria-selected", i === mentionActive ? "true" : "false");
                opt.textContent = mentionItems[i].name;
                opt.addEventListener("mousedown", (function (u) { return function (e) { e.preventDefault(); pickMention(u); }; })(mentionItems[i]));
                mentionBox.appendChild(opt);
            }
        }
        function refreshMentions() {
            var q = mentionQuery();
            var users = Array.isArray(config.commentMentions) ? config.commentMentions : [];
            mentionItems = [];
            if (q !== null) {
                var ql = q.toLowerCase();
                for (var i = 0; i < users.length; i++) {
                    var u = users[i];
                    if (!u || !u.name || u.id == null) continue;
                    var words = String(u.name).toLowerCase().split(/\s+/);
                    for (var w = 0; w < words.length; w++) {
                        if (words[w].indexOf(ql) === 0) { mentionItems.push(u); break; }
                    }
                }
            }
            if (!mentionItems.length) { hideMentions(); return; }
            mentionActive = 0;
            mentionBox.style.display = "";
            paintMentions();
        }
        function pickMention(user) {
            if (!user || mentionStart < 0) return;
            var insert = "@" + user.name + " ";
            var caret = textarea.selectionStart;
            textarea.value = textarea.value.slice(0, mentionStart) + insert + textarea.value.slice(caret);
            var pos = mentionStart + insert.length;
            textarea.setSelectionRange(pos, pos);
            if (!picked.some(function (m) { return m.id === user.id; })) picked.push({ id: user.id, name: user.name });
            hideMentions();
        }
        textarea.addEventListener("input", refreshMentions);
        textarea.addEventListener("keydown", function (e) {
            if (mentionBox.style.display === "none") return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                var step = e.key === "ArrowDown" ? 1 : -1;
                mentionActive = (mentionActive + step + mentionItems.length) % mentionItems.length;
                paintMentions();
                e.preventDefault();
            } else if (e.key === "Enter" || e.key === "Tab") {
                pickMention(mentionItems[mentionActive]);
                e.preventDefault();
            } else if (e.key === "Escape" || e.key === "Esc") {
                hideMentions();
                e.stopPropagation();
            }
        });

        var actions = host.createElement("div");
        actions.className = "rte-comment-composer-actions";
        var cancel = host.createElement("button");
        cancel.type = "button";
        cancel.className = "rte-comment-btn rte-comment-btn-ghost";
        cancel.textContent = cmText("cancel", "Cancel");
        onActivate(cancel, closeComposer);
        var submit = host.createElement("button");
        submit.type = "button";
        submit.className = "rte-comment-btn rte-comment-btn-primary";
        submit.textContent = cmText("cm_submit", "Comment");
        onActivate(submit, function () {
            var text = textarea.value.replace(/^\s+|\s+$/g, "");
            if (!text) return;
            addComment({ anchor: options.anchor, text: text, mentions: picked.filter(function (m) { return text.indexOf("@" + m.name) >= 0; }) });
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

    // Users a comment mentions: { id, name } pairs, with anything else dropped.
    function sanitizeMentions(list) {
        var out = [];
        if (!Array.isArray(list)) return out;
        for (var i = 0; i < list.length; i++) {
            var m = list[i];
            if (m && m.id != null && m.name) out.push({ id: String(m.id), name: String(m.name) });
        }
        return out;
    }

    // Comment text with each mention ("@Name") in its own highlighted span. Built from text nodes, never innerHTML.
    function appendTextWithMentions(host, parent, text, mentions) {
        var names = sanitizeMentions(mentions).sort(function (a, b) { return b.name.length - a.name.length; });
        if (!names.length || !text) { parent.textContent = text || ""; return; }
        var pattern = names.map(function (m) { return m.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|");
        var re = new RegExp("@(" + pattern + ")", "g");
        var last = 0, hit;
        while ((hit = re.exec(text)) !== null) {
            if (hit.index > last) parent.appendChild(host.createTextNode(text.slice(last, hit.index)));
            var span = host.createElement("span");
            span.className = "rte-comment-mention";
            span.textContent = hit[0];
            parent.appendChild(span);
            last = hit.index + hit[0].length;
        }
        if (last < text.length) parent.appendChild(host.createTextNode(text.slice(last)));
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
                // the rect is in iframe pixels, scaled on screen inside a transform:scale() ancestor
                var sk = iframe.offsetWidth && ir.width > 0 ? ir.width / iframe.offsetWidth : 1;
                left = ir.left + (rect.left || 0) * sk + window.pageXOffset;
                top = ir.top + (rect.bottom || rect.top || 0) * sk + window.pageYOffset + 6;
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
        var anchor = options.anchor || options.range || null;
        // Accept a plain DOM Range (or Range-like) as the anchor: it has the
        // container/offset fields but no `.text`, so until 2026-09-02 the common
        // call add({ anchor: range }) silently recorded the comment WITHOUT a
        // highlight. Derive the text from the range instead.
        if (anchor && anchor.startContainer && anchor.endContainer && !anchor.text) {
            var derived = "";
            try { derived = typeof anchor.toString === "function" ? String(anchor.toString()) : ""; } catch (e) { derived = ""; }
            if (!derived) { try { derived = anchor.cloneContents ? (anchor.cloneContents().textContent || "") : ""; } catch (e2) { derived = ""; } }
            anchor = { startContainer: anchor.startContainer, startOffset: anchor.startOffset, endContainer: anchor.endContainer, endOffset: anchor.endOffset, text: derived };
        }
        var wrappedText = "";

        if (anchor && anchor.startContainer && anchor.endContainer && anchor.text) {
            var editdoc = editor.getDocument();
            try {
                var wrapRange = editdoc.createRange();
                wrapRange.setStart(anchor.startContainer, anchor.startOffset);
                wrapRange.setEnd(anchor.endContainer, anchor.endOffset);
                // 2026-10-02 one highlight per block the selection crosses (wrapEachBlock)
                var spans = wrapEachBlock(editdoc, wrapRange, function () {
                    var span = editdoc.createElement("span");
                    span.className = "rte-comment";
                    span.setAttribute("data-comment-id", id);
                    span.setAttribute("data-comment-author", user.id);
                    return span;
                });
                var parts = [];
                for (var si = 0; si < spans.length; si++) parts.push(spans[si].textContent);
                wrappedText = parts.join("\n");
                if (spans.length) {
                    // Collapse caret after the last highlight.
                    var after = editdoc.createRange();
                    after.setStartAfter(spans[spans.length - 1]);
                    after.collapse(true);
                    var sel = editor.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(after);
                }
            } catch (err) {
                console.warn("comments: range wrap failed:", err);
            }
        }

        editor.reviewLedger.add({
            id: id,
            changeType: "comment",
            author: user,
            text: text,
            mentions: sanitizeMentions(options.mentions),
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

    // 2026-10-15 reactions (BlockNote has them): a person adds an emoji to a comment and clicks it again to take it
    // back. Kept with the comment in the shared review store as [{ emoji, users: [id] }]; only this set is accepted.
    // tools/comments/comment-reactions.mjs
    var REACTIONS = [
        { emoji: "\uD83D\uDC4D", label: "Thumbs up", key: "cm_thumbsup" },
        { emoji: "\u2705", label: "Done", key: "cm_done" },
        { emoji: "\uD83C\uDF89", label: "Celebrate", key: "cm_celebrate" },
        { emoji: "\uD83D\uDC40", label: "Looking", key: "cm_looking" },
        { emoji: "\u2753", label: "Question", key: "cm_question" }
    ];
    // 2026-10-18 the comments UI reads config.text_ keys (language packs), English as the fallback; {0} / {1} fill a
    // template. tools/i18n/comments-language.mjs
    function cmText(key, fallback) {
        var s = (config && config["text_" + key]) || fallback;
        for (var i = 2; i < arguments.length; i++) s = s.split("{" + (i - 2) + "}").join(String(arguments[i]));
        return s;
    }

    function reactionIndex(emoji) {
        for (var i = 0; i < REACTIONS.length; i++) if (REACTIONS[i].emoji === emoji) return i;
        return -1;
    }

    function reactToComment(commentId, emoji) {
        if (!editor.reviewLedger || reactionIndex(emoji) < 0) return false;
        var entry = editor.reviewLedger.get(commentId);
        if (!entry || entry.changeType !== "comment") return false;
        var me = String(getCurrentUser().id);
        var list = Array.isArray(entry.reactions) ? entry.reactions : [];
        var out = [], found = false;
        for (var i = 0; i < list.length; i++) {
            if (!list[i] || !Array.isArray(list[i].users)) continue;
            var users = list[i].users.slice();
            if (list[i].emoji === emoji) {
                found = true;
                var at = users.indexOf(me);
                if (at >= 0) users.splice(at, 1); else users.push(me);
            }
            if (users.length) out.push({ emoji: list[i].emoji, users: users });
        }
        if (!found) out.push({ emoji: emoji, users: [me] });
        editor.reviewLedger.update(commentId, { reactions: out });
        if (sidebar && sidebar.isConnected) renderSidebar();
        try { if (typeof editor.fireEvent === "function") editor.fireEvent("comment_reacted", { id: commentId, emoji: emoji, user: me }); } catch (e) { }
        return true;
    }

    function renderReactions(entry, host) {
        var row = host.createElement("div");
        row.className = "rte-comment-reactions";
        row.setAttribute("role", "group");
        row.setAttribute("aria-label", cmText("cm_reactions", "Reactions"));
        var me = String(getCurrentUser().id);
        var list = Array.isArray(entry.reactions) ? entry.reactions : [];
        REACTIONS.forEach(function (r, index) {
            var users = [];
            for (var i = 0; i < list.length; i++) if (list[i] && list[i].emoji === r.emoji && Array.isArray(list[i].users)) users = list[i].users;
            var mine = users.indexOf(me) >= 0;
            var b = host.createElement("button");
            b.type = "button";
            b.className = "rte-comment-reaction";
            b.setAttribute("data-reaction", String(index));
            b.setAttribute("aria-pressed", mine ? "true" : "false");
            var rLabel = cmText(r.key, r.label);
            b.setAttribute("aria-label", users.length === 1 ? cmText("cm_reactioncount", "{0}, {1} reaction", rLabel, 1) : cmText("cm_reactionscount", "{0}, {1} reactions", rLabel, users.length));
            b.title = rLabel;
            b.textContent = r.emoji + (users.length ? " " + users.length : "");
            b.addEventListener("mousedown", function (e) { e.preventDefault(); });
            b.addEventListener("click", function (e) {
                e.preventDefault();
                reactToComment(entry.id, r.emoji);
                // the sidebar was rebuilt; keep keyboard focus on the same button
                try {
                    var again = sidebar && sidebar.querySelector('[data-comment-ref="' + cssEscape(entry.id) + '"] .rte-comment-reaction[data-reaction="' + index + '"]');
                    if (again) again.focus();
                } catch (err) { }
            });
            row.appendChild(b);
        });
        return row;
    }

    function resolveComment(commentId) {
        if (!editor.reviewLedger) return false;
        unwrapCommentSpans(commentId);
        editor.reviewLedger.update(commentId, { status: "resolved", decidedAt: Date.now() });
        if (sidebar && sidebar.isConnected) renderSidebar();
        try { if (typeof editor.fireEvent === "function") editor.fireEvent("comment_resolved", { id: commentId }); } catch (e) { }
        return true;
    }

    function deleteComment(commentId) {
        if (!editor.reviewLedger) return false;
        unwrapCommentSpans(commentId);
        editor.reviewLedger.remove(commentId);
        if (sidebar && sidebar.isConnected) renderSidebar();
        return true;
    }

    // 2026-10-17 select the next / previous commented text after / before the caret (wrapping) and show it in the
    // sidebar. tools/comments/comment-navigation.mjs
    function stepComment(dir) {
        var doc = editor.getDocument(), ed = editor.getEditable();
        if (!doc || !ed) return null;
        var spans = ed.querySelectorAll("[data-comment-id]"), firsts = [], seen = {};
        for (var i = 0; i < spans.length; i++) {
            var cid = spans[i].getAttribute("data-comment-id");
            if (!cid || seen[cid]) continue;
            seen[cid] = true;
            firsts.push(spans[i]);
        }
        if (!firsts.length) return null;
        var sel = doc.getSelection(), cur = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
        var pick = null;
        if (cur) {
            if (dir > 0) {
                for (var a = 0; a < firsts.length && !pick; a++) {
                    var ra = doc.createRange(); ra.selectNodeContents(firsts[a]);
                    if (ra.compareBoundaryPoints(Range.START_TO_END, cur) >= 0 && ra.compareBoundaryPoints(Range.START_TO_START, cur) > 0) pick = firsts[a];
                    else if (ra.compareBoundaryPoints(Range.START_TO_START, cur) >= 0 && !cur.collapsed && ra.compareBoundaryPoints(Range.START_TO_START, cur) !== 0) pick = firsts[a];
                }
            }
            else {
                for (var b = firsts.length - 1; b >= 0 && !pick; b--) {
                    var rb = doc.createRange(); rb.selectNodeContents(firsts[b]);
                    if (rb.compareBoundaryPoints(Range.START_TO_START, cur) < 0) pick = firsts[b];
                }
            }
        }
        if (!pick) pick = dir > 0 ? firsts[0] : firsts[firsts.length - 1];
        var id = pick.getAttribute("data-comment-id");
        var all = ed.querySelectorAll('[data-comment-id="' + cssEscape(id) + '"]');
        var r = doc.createRange();
        r.setStart(all[0], 0);
        r.setEnd(all[all.length - 1], all[all.length - 1].childNodes.length);
        try { editor.focus(); } catch (x) { /* best effort */ }
        sel.removeAllRanges();
        sel.addRange(r);
        try { pick.scrollIntoView({ block: "nearest" }); } catch (x) { /* best effort */ }
        focusComment(id);
        return id;
    }

    // 2026-10-17 the highlighted comment survives a re-render of the sidebar (selecting its text re-renders it, which
    // dropped the highlight at once). tools/comments/comment-navigation.mjs
    var activeCommentId = null, activeCommentUntil = 0;
    function focusComment(commentId) {
        activeCommentId = commentId;
        activeCommentUntil = Date.now() + 1400;
        if (!sidebar || !sidebar.isConnected) openSidebar();
        setTimeout(function () {
            if (!sidebar) return;
            var item = sidebar.querySelector('[data-comment-ref="' + cssEscape(commentId) + '"]');
            if (item) {
                item.scrollIntoView({ block: "nearest" });
                item.classList.add("rte-comment-item-active");
                // a timer from an earlier highlight of the same comment must not clear a newer one
                setTimeout(function () { if (activeCommentId !== commentId || Date.now() >= activeCommentUntil - 20) item.classList.remove("rte-comment-item-active"); }, 1400);
            }
        }, 30);
    }

    // 2026-10-02 A comment on a selection that crosses blocks highlights the selected text of EACH
    // block. One span went AROUND the blocks: two paragraphs became four
    // (<p>al</p><span><p>pha</p><p>be</p></span><p>ta</p>), list items and table cells got a span
    // inside <ul> / <tr>, and resolving the comment left the four paragraphs. The selection is cut
    // into runs of text that share a block, and each run is wrapped in its own make() element; all
    // carry the comment's id, so resolve and delete remove every one. A run starting or ending at
    // the edge of an inline element (<b>) takes the whole element, so no empty <b></b> is left
    // behind. Text inside a non-editable element (a chip) moves with its run.
    // tools/comments/comments-across-blocks.mjs
    var BLOCK_RE = /^(P|DIV|LI|UL|OL|DL|DT|DD|TABLE|TBODY|THEAD|TFOOT|TR|TD|TH|CAPTION|H[1-6]|PRE|BLOCKQUOTE|ADDRESS|FIGURE|FIGCAPTION|SECTION|ARTICLE|ASIDE|HEADER|FOOTER|NAV|MAIN|DETAILS|SUMMARY|FORM|FIELDSET|LEGEND|HR|BODY)$/;
    function blockOf(node) {
        for (var n = node; n; n = n.parentNode)
            if (n.nodeType === 1 && BLOCK_RE.test(n.nodeName)) return n;
        return null;
    }
    function wrapEachBlock(doc, range, make) {
        var root = range.commonAncestorContainer;
        if (root.nodeType !== 1) root = root.parentNode;
        var runs = [], cur = null;
        var w = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: function (n) { return n.nodeType === 1 && n.getAttribute("contenteditable") === "false" ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
        });
        for (var n = w.nextNode(); n; n = w.nextNode()) {
            if (n.nodeType === 1) {
                if (BLOCK_RE.test(n.nodeName)) cur = null;
                continue;
            }
            if (!range.intersectsNode(n)) continue;
            var a = n === range.startContainer ? range.startOffset : 0, b = n === range.endContainer ? range.endOffset : n.data.length;
            if (b <= a) continue;
            var blk = blockOf(n);
            if (!cur || cur.block !== blk) {
                cur = { block: blk, sn: n, so: a, text: "" };
                runs.push(cur);
            }
            cur.en = n;
            cur.eo = b;
            cur.text += n.data.substring(a, b);
        }
        var out = [];
        // from the last run back: wrapping one never moves the text of a run still to come
        for (var i = runs.length - 1; i >= 0; i--) {
            var run = runs[i];
            if (!/\S/.test(run.text)) continue; // the line break between two blocks
            var sub = doc.createRange();
            sub.setStart(run.sn, run.so);
            sub.setEnd(run.en, run.eo);
            widenToInlineEdges(sub, run.block);
            var el = make();
            el.appendChild(sub.extractContents());
            sub.insertNode(el);
            out.unshift(el);
        }
        return out;
    }
    function widenToInlineEdges(range, block) {
        var n = range.startContainer;
        if (n.nodeType === 3 && range.startOffset === 0) {
            while (n.parentNode && n.parentNode !== block && !n.previousSibling && !BLOCK_RE.test(n.parentNode.nodeName)) n = n.parentNode;
            range.setStartBefore(n);
        }
        n = range.endContainer;
        if (n.nodeType === 3 && range.endOffset === n.data.length) {
            while (n.parentNode && n.parentNode !== block && !n.nextSibling && !BLOCK_RE.test(n.parentNode.nodeName)) n = n.parentNode;
            range.setEndAfter(n);
        }
    }
    function unwrapCommentSpans(commentId) {
        var spans = editor.getEditable().querySelectorAll('[data-comment-id="' + cssEscape(commentId) + '"]');
        for (var i = 0; i < spans.length; i++) unwrapKeepChildren(spans[i]);
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
        sidebar.setAttribute("aria-label", cmText("cm_comments", "Comments"));
        // 2026-10-17 drag / arrow-key resizable (tools/ui/panel-resize.mjs)
        setTimeout(function () { if (editor && sidebar && typeof editor.makePanelResizable === "function") editor.makePanelResizable(sidebar, { label: cmText("cm_resizepanel", "Resize comments panel") }); }, 0);
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
        title.textContent = cmText("cm_comments", "Comments");
        header.appendChild(title);
        var close = host.createElement("button");
        close.type = "button";
        close.className = "rte-comment-sidebar-close";
        close.setAttribute("aria-label", cmText("close", "Close"));
        close.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
        onActivate(close, closeSidebar);
        header.appendChild(close);
        sidebar.appendChild(header);

        var list = host.createElement("div");
        list.className = "rte-comment-list";
        sidebar.appendChild(list);

        var entries = listComments({ status: "pending" });
        if (!entries.length) {
            var empty = host.createElement("div");
            empty.className = "rte-comment-empty";
            empty.textContent = cmText("cm_empty", "No open comments. Select text and click the Comment button to start.");
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
        if (entry.id === activeCommentId && Date.now() < activeCommentUntil) {
            wrap.classList.add("rte-comment-item-active");
            setTimeout(function () { if (activeCommentId !== entry.id || Date.now() >= activeCommentUntil - 20) wrap.classList.remove("rte-comment-item-active"); }, Math.max(0, activeCommentUntil - Date.now()));
        }
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
        resolveBtn.textContent = cmText("cm_resolve", "Resolve");
        resolveBtn.setAttribute("aria-label", cmText("cm_resolvecomment", "Resolve comment"));
        onActivate(resolveBtn, function () { resolveComment(entry.id); });
        var delBtn = host.createElement("button");
        delBtn.type = "button";
        delBtn.className = "rte-comment-action rte-comment-delete";
        delBtn.textContent = cmText("delete", "Delete");
        delBtn.setAttribute("aria-label", cmText("cm_deletecomment", "Delete comment"));
        onActivate(delBtn, function () { deleteComment(entry.id); });
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
        appendTextWithMentions(host, body, entry.text, entry.mentions);
        wrap.appendChild(body);
        wrap.appendChild(renderReactions(entry, host));

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
            repName.textContent = ((rep.author && rep.author.name) || cmText("cm_user", "User")) + " \u00B7 " + relativeTime(rep.createdAt);
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
        replyInput.placeholder = cmText("cm_reply", "Reply...");
        replyInput.setAttribute("aria-label", cmText("cm_replytocomment", "Reply to comment"));
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
        var spans = editor.getEditable().querySelectorAll('[data-comment-id="' + cssEscape(commentId) + '"]');
        if (!spans.length) return;
        spans[0].scrollIntoView({ block: "center", behavior: "smooth" });
        for (var i = 0; i < spans.length; i++) spans[i].classList.add("rte-comment-flash");
        setTimeout(function () {
            for (var j = 0; j < spans.length; j++) spans[j].classList.remove("rte-comment-flash");
        }, 1200);
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
        if (diff < 60) return cmText("cm_justnow", "just now");
        if (diff < 3600) return cmText("cm_minutesago", "{0}m ago", Math.floor(diff / 60));
        if (diff < 86400) return cmText("cm_hoursago", "{0}h ago", Math.floor(diff / 3600));
        return cmText("cm_daysago", "{0}d ago", Math.floor(diff / 86400));
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
                "/* 2026-07-12 comments panel precision */",
                ".rte-comment-sidebar{width:310px;min-width:270px;max-width:min(360px,32vw);margin-left:12px;padding:0;background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(248,251,255,.96));border:1px solid rgba(148,163,184,.22);border-radius:8px;font-family:Aptos,'Segoe UI',sans-serif;font-size:13px;color:#172033;display:flex;flex-direction:column;max-height:calc(100vh - 120px);overflow:hidden;box-shadow:0 14px 32px rgba(29,78,216,.1),0 2px 8px rgba(15,23,42,.06)}",
                ".rte-comment-sidebar-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 10px 9px 14px;border-bottom:1px solid rgba(148,163,184,.16);font-weight:750;background:rgba(255,255,255,.72)}",
                ".rte-comment-sidebar-title{font-size:13px;font-weight:850;letter-spacing:.02em}",
                ".rte-comment-sidebar-close{width:28px;height:28px;border:1px solid rgba(100,116,139,.18);background:#fff;cursor:pointer;color:#64748b;padding:0;border-radius:7px;display:inline-flex;align-items:center;justify-content:center}",
                ".rte-comment-sidebar-close:hover,.rte-comment-sidebar-close:focus-visible{background:#eef4ff;color:#0f3f9f;border-color:rgba(37,99,235,.28)}",
                ".rte-comment-list{flex:1;min-height:0;overflow-y:auto;padding:6px;scrollbar-width:thin}",
                ".rte-comment-empty{margin:6px;padding:14px;color:#52657e;font-size:12px;font-weight:700;line-height:1.45;text-align:center;background:#fff;border:1px dashed rgba(148,163,184,.28);border-radius:8px}",
                ".rte-comment-item{padding:10px;border:1px solid rgba(148,163,184,.14);border-radius:8px;background:rgba(255,255,255,.82);box-shadow:0 6px 14px rgba(15,23,42,.04);transition:background 200ms ease,box-shadow 200ms ease,transform 200ms ease}",
                ".rte-comment-item+.rte-comment-item{margin-top:7px}",
                ".rte-comment-item-active{background:#eef4ff;box-shadow:0 12px 28px rgba(37,99,235,.14);transform:translateY(-1px)}",
                ".rte-comment-item-top{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:8px}",
                ".rte-comment-avatar{width:30px;height:30px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;flex:0 0 30px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}",
                ".rte-comment-namewrap{flex:1;min-width:0}",
                ".rte-comment-name{font-weight:800;font-size:12px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
                ".rte-comment-when{font-size:11px;color:#64748b}",
                ".rte-comment-actions{display:flex;gap:4px;align-items:center}",
                ".rte-comment-action{font-size:11px;font-weight:750;padding:4px 8px;border-radius:6px;border:1px solid rgba(100,116,139,.16);background:#fff;cursor:pointer}",
                ".rte-comment-action:hover,.rte-comment-action:focus-visible{transform:translateY(-1px)}",
                ".rte-comment-resolve{color:#0f3f9f;border-color:rgba(37,99,235,.2);background:#eef4ff}",
                ".rte-comment-delete{color:#9f1239;border-color:rgba(159,18,57,.18);background:#fff1f2}",
                ".rte-comment-quote{margin:8px 0 0;padding:7px 9px;background:#fff8e8;border:1px solid rgba(245,158,11,.18);border-left:3px solid #f59e0b;border-radius:7px;font-size:11px;color:#67430a;cursor:pointer;line-height:1.35}",
                ".rte-comment-quote:hover{background:#fff3cf}",
                ".rte-comment-body{margin-top:8px;font-size:13px;line-height:1.45;color:#172033;white-space:pre-wrap}",
                ".rte-comment-reply{display:flex;gap:8px;margin-top:10px;padding-top:9px;border-top:1px dashed rgba(148,163,184,.22)}",
                ".rte-comment-reply-avatar{width:24px;height:24px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:800;flex:0 0 24px}",
                ".rte-comment-reply-body{flex:1;min-width:0}",
                ".rte-comment-reply-name{font-size:11px;color:#64748b}",
                ".rte-comment-reply-text{font-size:12px;color:#172033;line-height:1.45;white-space:pre-wrap;margin-top:2px}",
                ".rte-comment-reply-composer{margin-top:8px;display:flex}",
                ".rte-comment-reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}",
                ".rte-comment-reaction{display:inline-flex;align-items:center;gap:3px;min-height:24px;padding:1px 7px;border-radius:12px;border:1px solid rgba(148,163,184,.28);background:#fff;font:inherit;font-size:12px;line-height:1;color:#334155;cursor:pointer;opacity:.6}",
                ".rte-comment-reaction:hover,.rte-comment-reaction:focus-visible{opacity:1;border-color:rgba(37,99,235,.38)}",
                ".rte-comment-reaction:focus-visible{outline:2px solid rgba(37,99,235,.45);outline-offset:1px}",
                ".rte-comment-reaction[aria-pressed=true]{opacity:1;background:#eef4ff;border-color:rgba(37,99,235,.45);color:#0f3f9f}",
                ".rte-comment-reply-input{flex:1;min-width:0;padding:7px 10px;border-radius:7px;border:1px solid rgba(148,163,184,.24);font:inherit;font-size:12px;background:#fff}",
                ".rte-comment-reply-input:focus,.rte-comment-composer-textarea:focus{outline:2px solid rgba(37,99,235,.18);border-color:rgba(37,99,235,.38)}",
                ".rte-comment-composer{position:absolute;z-index:2147483000;width:min(320px,calc(100vw - 24px));background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid rgba(148,163,184,.22);box-shadow:0 14px 32px rgba(29,78,216,.12),0 2px 8px rgba(15,23,42,.08);border-radius:8px;padding:12px;font-family:Aptos,'Segoe UI',sans-serif;color:#172033}",
                ".rte-comment-composer-header{font-weight:850;font-size:13px;margin-bottom:8px;color:#172033}",
                ".rte-comment-composer-textarea{width:100%;box-sizing:border-box;padding:9px 10px;border-radius:7px;border:1px solid rgba(148,163,184,.24);font:inherit;font-size:13px;resize:vertical;min-height:70px;background:#fff}",
                ".rte-comment-composer-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:9px}",
                ".rte-comment-btn{min-height:30px;padding:0 13px;border-radius:7px;border:1px solid rgba(100,116,139,.18);font:750 12px/1 Aptos,'Segoe UI',sans-serif;cursor:pointer}",
                ".rte-comment-btn-ghost{background:#fff;color:#52657e}",
                ".rte-comment-btn-primary{background:#1d67ba;color:#fff;border-color:#1d67ba;box-shadow:0 8px 16px rgba(29,103,186,.18)}",
                // Body-appended overlays remain light unless the host editor
                // explicitly opts into its rte-dark treatment below.
                ".rte-comment-dark.rte-comment-sidebar,.rte-comment-dark.rte-comment-composer{background:linear-gradient(180deg,#1e293b,#0f172a);border-color:#334155;color:#e2e8f0}",
                ".rte-comment-dark .rte-comment-sidebar-header{background:rgba(30,41,59,.72);border-color:#334155}",
                ".rte-comment-dark .rte-comment-item{background:rgba(30,41,59,.85);border-color:#334155}",
                ".rte-comment-dark .rte-comment-item-active{background:#1e3a8a}",
                ".rte-comment-dark .rte-comment-empty{background:#0f172a;color:#94a3b8;border-color:#334155}",
                ".rte-comment-dark .rte-comment-when,.rte-comment-dark .rte-comment-reply-name{color:#94a3b8}",
                ".rte-comment-dark .rte-comment-body,.rte-comment-dark .rte-comment-reply-text,.rte-comment-dark .rte-comment-composer-header{color:#e2e8f0}",
                ".rte-comment-dark .rte-comment-reply-input,.rte-comment-dark .rte-comment-composer-textarea{background:#0f172a;color:#e2e8f0;border-color:#334155}",
                ".rte-comment-dark .rte-comment-action,.rte-comment-dark .rte-comment-btn-ghost,.rte-comment-dark .rte-comment-sidebar-close{background:#0f172a;color:#cbd5e1;border-color:#334155}",
                ".rte-comment-dark .rte-comment-quote{background:rgba(245,158,11,.12);color:#fcd34d}",
                ".rte-comment-dark .rte-comment-reaction{background:#0f172a;color:#cbd5e1;border-color:#334155}",
                ".rte-comment-dark .rte-comment-reaction[aria-pressed=true]{background:#1e3a8a;color:#e2e8f0;border-color:#3b82f6}",
                ".rte-comment-mentions{margin-top:4px;max-height:160px;overflow:auto;border:1px solid rgba(148,163,184,.3);border-radius:7px;background:#fff;box-shadow:0 6px 18px rgba(15,23,42,.12)}",
                ".rte-comment-mention-option{padding:6px 10px;font-size:13px;color:#172033;cursor:pointer}",
                ".rte-comment-mention-option.rte-comment-mention-active{background:#dbeafe}",
                ".rte-comment-mention{font-weight:600;color:#1d4ed8;background:rgba(37,99,235,.1);border-radius:4px;padding:0 2px}",
                ".rte-comment-dark .rte-comment-mentions{background:#0f172a;border-color:#334155}",
                ".rte-comment-dark .rte-comment-mention-option{color:#e2e8f0}",
                ".rte-comment-dark .rte-comment-mention-option.rte-comment-mention-active{background:#1e3a8a}",
                ".rte-comment-dark .rte-comment-mention{color:#93c5fd;background:rgba(147,197,253,.14)}"
            ].join("\n");
            host.head.appendChild(style);
            // A <style> ELEMENT is governed by style-src: under a strict policy the browser
            // drops its rules, leaving this plugin's UI unstyled. The element above stays
            // the path everyone else takes; this re-injects through the CSSOM only when
            // the policy actually emptied it.
            if (editor && typeof editor.ensureStyleSheetLive === "function") {
                editor.ensureStyleSheetLive(host, style, "rte-comments-style", style.textContent);
            }
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
            // A <style> ELEMENT is governed by style-src: under a strict policy the browser
            // drops its rules, leaving this plugin's UI unstyled. The element above stays
            // the path everyone else takes; this re-injects through the CSSOM only when
            // the policy actually emptied it.
            if (editor && typeof editor.ensureStyleSheetLive === "function") {
                editor.ensureStyleSheetLive(editdoc, iStyle, "rte-comments-iStyle", iStyle.textContent);
            }
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
