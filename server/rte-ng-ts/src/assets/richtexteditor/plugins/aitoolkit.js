if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// Auto-inject aitoolkit.css if the host page didn't link it. Without
// this stylesheet the inline SVG icons in the AI menu / chat / review
// panels expand to fill their container (the SVGs carry only viewBox,
// no width/height attrs). Resolves the CSS href as a sibling of this
// script's own <script src>. Opt out via
// `RTE_DefaultConfig.aitoolkit_skip_auto_css = true`.
(function autoInjectAiToolkitCss() {
    if (typeof document === "undefined") return;
    if (window.RTE_DefaultConfig && window.RTE_DefaultConfig.aitoolkit_skip_auto_css) return;
    var existing = document.querySelectorAll("link[rel=stylesheet]");
    for (var i = 0; i < existing.length; i++) {
        var href = existing[i].getAttribute("href") || "";
        if (/(?:^|\/)aitoolkit\.css(?:\?.*)?$/i.test(href)) return;
    }
    // Locate our own script tag (aitoolkit.js or all_plugins.js) so we
    // can resolve aitoolkit.css next to it. Matches a custom mount path.
    var ourScript = null;
    var scripts = document.getElementsByTagName("script");
    for (var j = scripts.length - 1; j >= 0; j--) {
        var src = scripts[j].getAttribute("src") || "";
        if (/(?:^|\/)(?:aitoolkit|all_plugins)\.js(?:\?.*)?$/i.test(src)) {
            ourScript = scripts[j];
            break;
        }
    }
    var srcAttr = ourScript ? ourScript.getAttribute("src") : "";
    var cssHref = srcAttr
        ? srcAttr.replace(/[^/]+$/, "aitoolkit.css")
        : (((window.RTE_DefaultConfig && window.RTE_DefaultConfig.url_base) || "/richtexteditor") + "/plugins/aitoolkit.css");
    if (cssHref.indexOf("?") < 0) cssHref += "?v=20260703a";
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssHref;
    link.setAttribute("data-rte-auto-injected", "aitoolkit");
    (document.head || document.documentElement).appendChild(link);
})();

if (!RTE_DefaultConfig.svgCode_aiassist) {
    RTE_DefaultConfig.svgCode_aiassist = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><defs><linearGradient id="rte-ai-robot-shell" x1="5" y1="6" x2="19" y2="18" gradientUnits="userSpaceOnUse"><stop stop-color="#1fb6ff"/><stop offset=".52" stop-color="#2563eb"/><stop offset="1" stop-color="#7c3aed"/></linearGradient><linearGradient id="rte-ai-robot-glow" x1="8" y1="10" x2="16" y2="15" gradientUnits="userSpaceOnUse"><stop stop-color="#fef9c3"/><stop offset="1" stop-color="#fde68a"/></linearGradient></defs><path d="M12 2.4v2.4" stroke="#f59e0b" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="2.4" r="1" fill="#fbbf24"/><rect x="5.1" y="6.1" width="13.8" height="11.2" rx="3.4" fill="url(#rte-ai-robot-shell)" stroke="#1e40af" stroke-width="1.2"/><path d="M8.2 6.1V5.8A1.8 1.8 0 0110 4h4a1.8 1.8 0 011.8 1.8v.3" stroke="#93c5fd" stroke-width="1.2" stroke-linecap="round"/><rect x="7.7" y="9.2" width="8.6" height="4.8" rx="2.4" fill="#0f172a" opacity=".26"/><circle cx="10" cy="11.6" r="1.15" fill="url(#rte-ai-robot-glow)"/><circle cx="14" cy="11.6" r="1.15" fill="url(#rte-ai-robot-glow)"/><path d="M9.4 14.9c.8.55 1.66.83 2.6.83s1.8-.28 2.6-.83" stroke="#ffffff" stroke-width="1.45" stroke-linecap="round"/><path d="M8.1 19.2l1-2.1M15.9 19.2l-1-2.1" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round"/><path d="M18.8 6.4l.55-1.25.55 1.25 1.25.55-1.25.55-.55 1.25-.55-1.25-1.25-.55z" fill="#fef08a"/></svg>';
    RTE_DefaultConfig.svgCode_aiassist = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><defs><linearGradient id="rte-ai-bot-v4-shell" x1="4.2" y1="5.8" x2="19.8" y2="18.4" gradientUnits="userSpaceOnUse"><stop stop-color="#22d3ee"/><stop offset=".52" stop-color="#2563eb"/><stop offset="1" stop-color="#4338ca"/></linearGradient><linearGradient id="rte-ai-bot-v4-visor" x1="7.8" y1="9" x2="16.2" y2="13.8" gradientUnits="userSpaceOnUse"><stop stop-color="#f8fafc"/><stop offset="1" stop-color="#bfdbfe"/></linearGradient></defs><path d="M12 2.6v2.3" stroke="#f59e0b" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="2.6" r=".9" fill="#fbbf24"/><path d="M4.9 12.2h-1a1.4 1.4 0 010-2.8h1M19.1 9.4h1a1.4 1.4 0 010 2.8h-1" stroke="#2563eb" stroke-width="1.25" stroke-linecap="round"/><rect x="5.2" y="5.9" width="13.6" height="12.2" rx="4" fill="url(#rte-ai-bot-v4-shell)" stroke="#1e40af" stroke-width="1.15"/><rect x="7.6" y="8.8" width="8.8" height="5.2" rx="2.6" fill="url(#rte-ai-bot-v4-visor)" opacity=".98"/><circle cx="10.2" cy="11.4" r=".9" fill="#0f172a"/><circle cx="13.8" cy="11.4" r=".9" fill="#0f172a"/><path d="M9.5 15.3c.78.52 1.6.78 2.5.78s1.72-.26 2.5-.78" stroke="#eff6ff" stroke-width="1.35" stroke-linecap="round"/><path d="M7.7 20.2l1.15-2.15M16.3 20.2l-1.15-2.15" stroke="#2563eb" stroke-width="1.45" stroke-linecap="round"/><path d="M18.6 5.1l.45-.95.45.95.95.45-.95.45-.45.95-.45-.95-.95-.45z" fill="#fde68a"/></svg>';
}

if (!RTE_DefaultConfig.svgCode_aiassist_open_dialog) {
    RTE_DefaultConfig.svgCode_aiassist_open_dialog = RTE_DefaultConfig.svgCode_aiassist;
}
if (!RTE_DefaultConfig.svgCode_aiassist_review) {
    RTE_DefaultConfig.svgCode_aiassist_review = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 6.5h13"/><path d="M5.5 11.5h8"/><path d="M5.5 16.5h6"/><path d="M16.5 14.2l1.8 1.8 3.2-4.2"/></svg>';
}
if (!RTE_DefaultConfig.svgCode_aiassist_chat) {
    RTE_DefaultConfig.svgCode_aiassist_chat = RTE_DefaultConfig.svgCode_aiassist;
}
if (!RTE_DefaultConfig.svgCode_aiassist_proofread) {
    RTE_DefaultConfig.svgCode_aiassist_proofread = '<svg viewBox="0 0 24 24" fill="none" stroke="#5F6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="4.5"/><path d="M14 14l5 5"/><path d="M8.8 10.5l1.2 1.3 2.3-2.5"/></svg>';
}
if (!RTE_DefaultConfig.svgCode_aiassist_rewrite) {
    RTE_DefaultConfig.svgCode_aiassist_rewrite = '<svg viewBox="0 0 24 24" fill="none" stroke="#5F6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h11"/><path d="M4 12h8"/><path d="M4 17h11"/><path d="M16 5l4 4-6.5 6.5H9.5v-4z"/></svg>';
}
if (!RTE_DefaultConfig.svgCode_aiassist_translate) {
    RTE_DefaultConfig.svgCode_aiassist_translate = '<svg viewBox="0 0 24 24" fill="none" stroke="#5F6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5h10"/><path d="M8 4v2.5"/><path d="M11 6.5c-.6 2.9-2.2 5.3-4.7 7.1"/><path d="M6.5 10.5c1.2.9 2.5 1.6 3.9 2.1"/><path d="M14.5 9.5h5"/><path d="M17 7v2.5"/><path d="M15 19l2-4.5 2 4.5"/><path d="M15.8 17.2h2.4"/></svg>';
}
if (!RTE_DefaultConfig.svgCode_aiassist_comment) {
    RTE_DefaultConfig.svgCode_aiassist_comment = '<svg viewBox="0 0 24 24" fill="none" stroke="#5F6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7.5A3.5 3.5 0 019.5 4h8A3.5 3.5 0 0121 7.5v5a3.5 3.5 0 01-3.5 3.5H12l-4.5 3v-3H6A3.5 3.5 0 012.5 12.5v-5A3.5 3.5 0 016 4"/><path d="M8 9h8"/><path d="M8 12h5"/></svg>';
}
if (!RTE_DefaultConfig.svgCode_aiassist_paragraph) {
    RTE_DefaultConfig.svgCode_aiassist_paragraph = '<svg viewBox="0 0 24 24" fill="none" stroke="#5F6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h8"/><path d="M5 12h14"/><path d="M5 17h10"/><path d="M18 5v6"/><path d="M15 8h6"/></svg>';
}
if (!RTE_DefaultConfig.svgCode_aiassist_justify) {
    RTE_DefaultConfig.svgCode_aiassist_justify = '<svg viewBox="0 0 24 24" fill="none" stroke="#5F6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14"/><path d="M5 11h14"/><path d="M5 15h9"/><path d="M16 14l2 2 3-4"/></svg>';
}

RTE_DefaultConfig.plugin_aitoolkit = RTE_Plugin_AIToolkit;

function RTE_Plugin_AIToolkit() {
    var obj = this;
    var config;
    var editor;

    obj.PluginName = "AIToolkit";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.aiToolkitEnabled === false) {
            return;
        }

        config.text_aiassist = config.text_aiassist || "Ask AI";
        config.text_aireview = config.text_aireview || "AI Review";
        config.text_aichat = config.text_aichat || "AI Chat";
        config.aiToolkitTranslateLanguages = config.aiToolkitTranslateLanguages || [
            { value: "spanish", label: "Spanish" },
            { value: "french", label: "French" },
            { value: "german", label: "German" },
            { value: "italian", label: "Italian" },
            { value: "portuguese", label: "Portuguese" },
            { value: "japanese", label: "Japanese" }
        ];
        // 2026-05-13 (v20260513d): trimmed AI-redundant words from titles.
        // The menu is opened FROM the AI toolbar button and renders inside
        // a panel scoped to AI, so "Chat with AI" / "Draft with AI" / "Add
        // AI note" each spent a word on context the user already has.
        // "Proofread selection" / "Rewrite selection" similarly trail an
        // object the icon + Selection-source default already imply. Same
        // shape Notion AI's slash menu ("Continue writing", "Summarize",
        // "Improve writing") and Linear's command palette ship — single
        // verb / verb-object labels that read at a glance. Saves ~6-10px
        // horizontal per item so the menu can tighten to a narrower frame
        // in a later pass. Customer overrides via `aiToolkitActions` keep
        // any legacy long-form labels untouched.
        config.aiToolkitActions = config.aiToolkitActions || [
            { id: "chat-panel", section: "Start", icon: "chat", title: "Chat", description: "Ask follow-up questions about this document.", target: "chat-panel" },
            { id: "open-dialog", section: "Start", icon: "open_dialog", title: "Draft", description: "Generate, rewrite, translate, or summarize before applying.", target: "dialog" },
            { id: "review-panel", section: "Start", icon: "review", title: "Review", description: "Accept or reject prepared AI edits.", target: "review-panel" },
            { id: "proofread", section: "Quick edit", icon: "proofread", title: "Proofread", description: "Check grammar, spacing, and clarity.", resolverMode: "proofread", target: "selection-preview" },
            { id: "rewrite", section: "Quick edit", icon: "rewrite", title: "Rewrite", description: "Improve clarity without changing intent.", resolverMode: "rewrite", target: "selection-preview" },
            { id: "translate", section: "Quick edit", icon: "translate", title: "Translate", description: "Choose a language and preview the result.", resolverMode: "translate", target: "dialog", autoRun: false },
            { id: "justify", section: "Quick edit", icon: "justify", title: "Explain", description: "Rewrite and show why it changed.", resolverMode: "justify", target: "dialog", autoRun: false },
            { id: "comment", section: "Insert", icon: "comment", title: "Add note", description: "Insert a short comment near the selection.", resolverMode: "comment", target: "comment" },
            { id: "paragraph", section: "Insert", icon: "paragraph", title: "Add paragraph", description: "Draft a supporting paragraph below.", resolverMode: "paragraph", target: "insert" }
        ];
        // 2026-05-09 (v20260509j): single-verb default chip labels matching
        // the toolbar dropdown idiom — chips render on one line at the
        // default 390px chat panel width. Customer overrides via
        // aiToolkitChatPrompts keep their own labels untouched.
        config.aiToolkitChatPrompts = config.aiToolkitChatPrompts || [
            { id: "summarize", label: "Summarize", prompt: "Summarize the current content and suggest the clearest next edit." },
            { id: "proofread", label: "Proofread", prompt: "Proofread the current content and prepare a cleaner version I can review." },
            { id: "translate", label: "Translate", prompt: "Translate the current content into Spanish and prepare a reviewable version." },
            { id: "headings", label: "Headings", prompt: "Suggest better section titles and subheadings for this content." },
            { id: "expand", label: "Expand", prompt: "Add a short supporting paragraph that strengthens this content." }
        ];
        // 2026-05-20 (v20260520c): descriptions trimmed to ~5-8 words so
        // each fits the one-line mode caption without wrapping at the 480px
        // dialog inner width. "Justify edit" renamed to "Explain rewrite"
        // — "Justify" in an editor reads as text-alignment (the toolbar's
        // own Justify Align button uses the same word), and the underlying
        // mode generates a rewrite plus an explicit rationale, so "Explain
        // rewrite" names what it actually does. Pre-pass descriptions were
        // full sentences (47-92 chars) tuned for the hover-only tooltip;
        // the caption is more prominent so the description earns brevity.
        // 2026-05-20 (v20260520i) — Pass 61: descriptions trimmed to ≤24 chars
        // each so the header subtitle never truncates at the 480px frame even
        // when paired with the longest mode title ("Explain rewrite"). Pre-pass
        // the v20260520g descriptions ran 31-38 chars; together with a 13px
        // title that left ~7-10 chars of slack before the ellipsis kicked in
        // on narrow viewports. Same brevity Notion AI inline composer subtitles
        // ship — "Improve writing", "Make shorter" — single 2-4 word verb
        // phrases.
        config.aiToolkitDialogModes = config.aiToolkitDialogModes || [
            { id: "proofread", title: "Proofread", description: "Fix grammar & clarity." },
            { id: "rewrite", title: "Rewrite", description: "Rewrite for clarity." },
            { id: "translate", title: "Translate", description: "Translate to a language." },
            { id: "justify", title: "Explain rewrite", description: "Rewrite and explain why." },
            { id: "shorten", title: "Shorten", description: "Compress to be shorter." },
            { id: "expand", title: "Expand", description: "Add supporting detail." },
            { id: "summarize", title: "Summarize", description: "Summarize the source." }
        ];
        config.aiToolkitResolver = config.aiToolkitResolver || null;
        config.aiToolkitOperationHandlers = config.aiToolkitOperationHandlers || {};
        config.aiToolkitPersistenceKey = config.aiToolkitPersistenceKey || "";
        config.aiToolkitReviewSyncInterval = config.aiToolkitReviewSyncInterval || 15000;
        config.aiToolkitSuggestionLedgerUrl = config.aiToolkitSuggestionLedgerUrl || "";
        config.aiToolkitReviewLogUrl = config.aiToolkitReviewLogUrl || "";
        config.aiToolkitAutoToolbarButtons = config.aiToolkitAutoToolbarButtons !== false;
        config.aiToolkitUiVersion = config.aiToolkitUiVersion || "v20260520k";

        appendToolbarCommand("toolbar_default", "#{aiassist}");
        appendToolbarCommand("toolbar_basic", "#{aiassist}");
        appendToolbarCommand("toolbar_full", "#{aiassist}");
        appendToolbarCommand("toolbar_mobile", "#{aiassist}");

        appendControlToolbarCommand("controltoolbar_TEXT", "|{aiassist}");

        config.toolbarfactory_aiassist = function (cmd, suffix, ownerElement) {
            var toolbarEditor = this;
            return toolbarEditor.createToolbarItemDropDownPanel(cmd, function (panel) {
                renderActionMenu(panel);
            });
        };
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        editor.aiToolkit = {
            normalizeText: normalizeText,
            ensureSentence: ensureSentence,
            buildDemoResult: buildDemoResult,
            getTranslateLanguages: getTranslateLanguages,
            getTranslateLanguageLabel: getTranslateLanguageLabel,
            getOperationContract: getOperationContract,
            getActionDefinitions: getActionDefinitions,
            registerAction: registerActionDefinition,
            removeAction: removeActionDefinition,
            getDialogModes: getDialogModes,
            registerDialogMode: registerDialogModeDefinition,
            removeDialogMode: removeDialogModeDefinition,
            resolveAction: function (actionId, options) {
                return resolveAction(actionId, options);
            },
            loadSelectionText: function () {
                var snapshot = captureSelectionSnapshot();
                return snapshot.text || snapshot.wholeText;
            },
            loadDocumentText: function () {
                return normalizeText(editor.getText ? editor.getText() : "");
            },
            textToHtml: function (text) {
                return textToHtml(text);
            },
            previewInlineSuggestion: function (result, options) {
                return previewInlineSuggestion(result, options);
            },
            applyResult: function (result, options) {
                return applyResult(result, options);
            },
            executeOperations: function (operations, options) {
                return executeOperations(operations, options);
            },
            executeResolvedAction: function (resolved, options) {
                return executeResolvedAction(resolved, options);
            },
            registerOperationHandler: registerOperationHandler,
            unregisterOperationHandler: unregisterOperationHandler,
            getSuggestions: function () {
                return getSuggestionStore().slice();
            },
            clearSuggestions: function () {
                return clearSuggestionStore();
            },
            getReviewLogEntries: function () {
                return getReviewLogEntries().slice();
            },
            setResolver: function (resolver) {
                config.aiToolkitResolver = typeof resolver === "function" ? resolver : null;
            },
            openChatPanel: function (options) {
                openChatPanel(options);
            },
            closeChatPanel: function () {
                closeChatPanel({ restoreFocus: true });
            },
            toggleChatPanel: function (options) {
                toggleChatPanel(options);
            },
            getChatSessions: function (options) {
                return getChatSessionsForApi(options);
            },
            loadChatSession: function (sessionId, options) {
                return loadChatSessionForApi(sessionId, options);
            },
            clearChatSessions: function (options) {
                return clearChatSessionsForApi(options);
            },
            openReviewPanel: function (options) {
                openReviewPanel(options);
            },
            closeReviewPanel: function () {
                closeReviewPanel();
            },
            toggleReviewPanel: function (options) {
                toggleReviewPanel(options);
            },
            saveSuggestionLedger: function () {
                return persistSuggestionStore();
            },
            loadSuggestionLedger: function () {
                return restoreSuggestionStore();
            },
            loadRemoteSuggestionLedger: function (force, callback) {
                return loadRemoteSuggestionLedger(force, callback);
            },
            loadReviewLogEntries: function (force, callback) {
                return loadReviewLogEntries(force, callback);
            },
            refreshRemoteReviewState: function (force, callback) {
                return refreshRemoteReviewState(force, callback);
            },
            openDialog: function (options) {
                openDialog(options);
            },
            runQuickAction: function (actionId, options) {
                return runQuickAction(actionId, options);
            },
            setAgent: function (agent) {
                config.aiToolkitAgent = typeof agent === "function" ? agent : null;
            },
            runAgent: function (prompt, options) {
                return runAgent(prompt, options);
            },
            streamRequest: function (options) {
                return streamAiRequest(options);
            },
            exportDocx: function (options) {
                return exportDocx(options);
            },
            importDocx: function (options) {
                return importDocx(options);
            }
        };

        bindAiToolkitLiveSyncTargets();

        // Shared review ledger — the AI toolkit owns the store, but other plugins
        // (e.g. human Track Changes) add their own entries here so the Review drawer
        // shows AI + human suggestions in one unified list.
        editor.reviewLedger = {
            add: function (entry) {
                var normalized = normalizeLedgerEntry(entry);
                if (!normalized) return null;
                var store = getSuggestionStore();
                for (var i = 0; i < store.length; i++) {
                    if (store[i].id === normalized.id) { store[i] = normalized; break; }
                }
                if (i === store.length) store.push(normalized);
                persistSuggestionStore();
                if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                    renderReviewPanel(false);
                }
                return normalized;
            },
            update: function (id, patch) {
                var store = getSuggestionStore();
                for (var i = 0; i < store.length; i++) {
                    if (store[i].id !== id) continue;
                    for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) {
                        store[i][k] = patch[k];
                    }
                    persistSuggestionStore();
                    if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                        renderReviewPanel(false);
                    }
                    return store[i];
                }
                return null;
            },
            remove: function (id) {
                var store = getSuggestionStore();
                for (var i = 0; i < store.length; i++) {
                    if (store[i].id === id) {
                        store.splice(i, 1);
                        persistSuggestionStore();
                        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                            renderReviewPanel(false);
                        }
                        return true;
                    }
                }
                return false;
            },
            get: function (id) {
                var store = getSuggestionStore();
                for (var i = 0; i < store.length; i++) if (store[i].id === id) return store[i];
                return null;
            },
            list: function (filter) {
                var store = getSuggestionStore().slice();
                if (!filter) return store;
                return store.filter(function (e) {
                    if (filter.author && e.author && e.author.id !== filter.author) return false;
                    if (filter.status && e.status !== filter.status) return false;
                    if (filter.changeType && e.changeType !== filter.changeType) return false;
                    return true;
                });
            },
            refreshPanel: function () {
                if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                    renderReviewPanel(false);
                }
            }
        };

        editor.attachEvent("exec_command_aiassist", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            openDialog();
        });

        editor.attachEvent("exec_command_aichat", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            openChatPanel({ focusComposer: true });
        });

        var inlinePreviewEventEditable = editor.getEditable();
        var inlinePreviewEventDocument = inlinePreviewEventEditable && inlinePreviewEventEditable.ownerDocument ? inlinePreviewEventEditable.ownerDocument : document;
        function handleInlinePreviewClick(e) {
            if (e.__rteAiInlinePreviewClickHandled) {
                return;
            }
            var wrapper = e.target && e.target.closest ? e.target.closest("[data-rte-ai-suggestion-id]") : null;
            if (!wrapper) {
                return;
            }

            var suggestionId = wrapper.getAttribute("data-rte-ai-suggestion-id");
            if (!suggestionId || !findSuggestionById(suggestionId)) {
                return;
            }
            e.__rteAiInlinePreviewClickHandled = true;

            var actionNode = e.target && e.target.closest ? e.target.closest("[data-rte-ai-action]") : null;
            if (!actionNode) {
                var preferredAction = getPreferredReviewActionFocus();
                var currentInlineFocus = wrapper.ownerDocument ? wrapper.ownerDocument.activeElement : null;
                if (currentInlineFocus && currentInlineFocus.getAttribute && editor.getEditable().contains(currentInlineFocus)) {
                    preferredAction = currentInlineFocus.getAttribute("data-rte-ai-action") || preferredAction;
                }
                if (editor.__aiReviewEmptyPreviewSuggestionId && suggestionId === editor.__aiReviewEmptyPreviewSuggestionId) {
                    activateReviewSuggestionWithDefaultActionFocus(suggestionId, {
                        focusPanel: true,
                        focusAction: preferredAction || getPreferredReviewActionFocus(),
                        openedQueue: true
                    });
                    return;
                }
                setActiveSuggestionId(suggestionId);
                if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                    renderReviewPanel(false);
                }
                if (focusDefaultInlineReviewAction(suggestionId, preferredAction)) {
                    return;
                }
                focusInlineSuggestionWrapper(wrapper);
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            var action = actionNode.getAttribute("data-rte-ai-action");
            var continuationId = "";
            var wasCurrentReviewTarget = editor.__aiActiveSuggestionId === suggestionId;
            if ((action === "accept" || action === "reject") && wasCurrentReviewTarget) {
                continuationId = getNextInlineReviewSuggestionId(suggestionId);
            }
            if (action === "accept") {
                if (acceptInlineSuggestion(suggestionId)) {
                    if (continuationId) {
                        locateSuggestion(continuationId, { focusInlineAction: action });
                    }
                    else if (wasCurrentReviewTarget) {
                        announceReviewStatus(buildInlineQueueCompleteAnnouncement("Accepted", suggestionId));
                    }
                }
            }
            else if (action === "reject") {
                if (rejectInlineSuggestion(suggestionId)) {
                    if (continuationId) {
                        locateSuggestion(continuationId, { focusInlineAction: action });
                    }
                    else if (wasCurrentReviewTarget) {
                        announceReviewStatus(buildInlineQueueCompleteAnnouncement("Rejected", suggestionId));
                    }
                }
            }
            else if (action === "review") {
                activateReviewSuggestionWithDefaultActionFocus(suggestionId, {
                    focusPanel: true
                });
            }
            else if (action === "previous") {
                if (!locatePreviousInlineReviewSuggestion(suggestionId, { focusInlineAction: action })) {
                    announceReviewStatus(buildInlineQueueBoundaryAnnouncement(suggestionId, "previous"));
                }
            }
            else if (action === "next") {
                if (!locateNextInlineReviewSuggestion(suggestionId, { focusInlineAction: action })) {
                    announceReviewStatus(buildInlineQueueBoundaryAnnouncement(suggestionId, "next"));
                }
            }
            else if (action === "shared-seen") {
                markReviewActivitySeen();
                updateActiveSuggestionDecorations();
                if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                    renderReviewPanel(false);
                }
                announceReviewStatus("Shared AI review updates cleared for the current item.");
                focusInlineSuggestionWrapper(wrapper);
            }
            else if (action === "undo") {
                undoLastReviewDecision({ focusInlineAction: "undo" });
            }
            else if (action === "redo") {
                redoLastReviewDecision({ focusInlineAction: "redo" });
            }
        }

        function bindInlinePreviewEventHandlers() {
            inlinePreviewEventEditable = editor.getEditable ? editor.getEditable() : null;
            inlinePreviewEventDocument = inlinePreviewEventEditable && inlinePreviewEventEditable.ownerDocument ? inlinePreviewEventEditable.ownerDocument : document;
            if (inlinePreviewEventEditable && editor.__aiInlinePreviewEventEditable !== inlinePreviewEventEditable) {
                inlinePreviewEventEditable.addEventListener("click", handleInlinePreviewClick);
                inlinePreviewEventEditable.addEventListener("keydown", handleInlinePreviewKeydown);
                editor.__aiInlinePreviewEventEditable = inlinePreviewEventEditable;
            }
            if (inlinePreviewEventDocument && editor.__aiInlinePreviewEventDocument !== inlinePreviewEventDocument) {
                inlinePreviewEventDocument.addEventListener("click", handleInlinePreviewClick, true);
                inlinePreviewEventDocument.addEventListener("keydown", handleInlinePreviewKeydown, true);
                editor.__aiInlinePreviewEventDocument = inlinePreviewEventDocument;
            }
        }

        function handleInlinePreviewKeydown(e) {
            if (e.__rteAiInlinePreviewKeydownHandled) {
                return;
            }
            var wrapper = e.target && e.target.closest ? e.target.closest(".rte-ai-inline-preview") : (e.target && e.target.classList && e.target.classList.contains("rte-ai-inline-preview") ? e.target : null);
            if (!wrapper) {
                return;
            }
            var inlineActionNode = e.target && e.target.closest ? e.target.closest("[data-rte-ai-action]") : null;

            var suggestionId = wrapper.getAttribute("data-rte-ai-suggestion-id");
            if (!suggestionId || !findSuggestionById(suggestionId) || e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }
            e.__rteAiInlinePreviewKeydownHandled = true;

            var key = (e.key || "").toLowerCase();
            var preferredInlineAction = inlineActionNode && inlineActionNode.getAttribute
                ? (inlineActionNode.getAttribute("data-rte-ai-action") || "")
                : "";
            var preferredRecoveryInlineAction = preferredInlineAction || getDefaultInlineReviewActionName(findSuggestionById(suggestionId));
            var isPreviewTarget = !!(editor.__aiReviewEmptyPreviewSuggestionId && suggestionId === editor.__aiReviewEmptyPreviewSuggestionId);
            if (isPreviewTarget) {
                if (key === "enter" || key === " ") {
                    e.preventDefault();
                    activateReviewSuggestionWithDefaultActionFocus(suggestionId, {
                        focusPanel: true,
                        focusAction: preferredInlineAction || getPreferredReviewActionFocus(),
                        openedQueue: true
                    });
                }
                return;
            }
            if (key === "arrowleft" || key === "k") {
                e.preventDefault();
                if (!locatePreviousInlineReviewSuggestion(suggestionId, { focusInlineAction: preferredInlineAction })) {
                    announceReviewStatus(buildInlineQueueBoundaryAnnouncement(suggestionId, "previous"));
                }
            }
            else if (key === "arrowright" || key === "j") {
                e.preventDefault();
                if (!locateNextInlineReviewSuggestion(suggestionId, { focusInlineAction: preferredInlineAction })) {
                    announceReviewStatus(buildInlineQueueBoundaryAnnouncement(suggestionId, "next"));
                }
            }
            else if (key === "home") {
                e.preventDefault();
                if (!locateFirstInlineReviewSuggestion(suggestionId, { focusInlineAction: preferredInlineAction })) {
                    announceReviewStatus(buildInlineQueueBoundaryAnnouncement(suggestionId, "first"));
                }
            }
            else if (key === "end") {
                e.preventDefault();
                if (!locateLastInlineReviewSuggestion(suggestionId, { focusInlineAction: preferredInlineAction })) {
                    announceReviewStatus(buildInlineQueueBoundaryAnnouncement(suggestionId, "last"));
                }
            }
            else if (key === "a") {
                e.preventDefault();
                var nextSuggestionId = getNextInlineReviewSuggestionId(suggestionId);
                if (acceptInlineSuggestion(suggestionId)) {
                    if (nextSuggestionId) {
                        locateSuggestion(nextSuggestionId, { focusInlineAction: preferredInlineAction });
                    }
                    else {
                        announceReviewStatus(buildInlineQueueCompleteAnnouncement("Accepted", suggestionId));
                    }
                }
            }
            else if (key === "r") {
                e.preventDefault();
                var followingSuggestionId = getNextInlineReviewSuggestionId(suggestionId);
                if (rejectInlineSuggestion(suggestionId)) {
                    if (followingSuggestionId) {
                        locateSuggestion(followingSuggestionId, { focusInlineAction: preferredInlineAction });
                    }
                    else {
                        announceReviewStatus(buildInlineQueueCompleteAnnouncement("Rejected", suggestionId));
                    }
                }
            }
            else if (key === "u" && !e.shiftKey && hasUndoableReviewShortcut()) {
                e.preventDefault();
                undoLastReviewDecision({ focusInlineAction: preferredRecoveryInlineAction || "accept" });
            }
            else if (key === "u" && e.shiftKey) {
                var redoableInlineDecision = getRedoableReviewDecision();
                if (redoableInlineDecision && redoableInlineDecision.suggestion && redoableInlineDecision.suggestion.id === suggestionId) {
                    e.preventDefault();
                    redoLastReviewDecision({ focusInlineAction: preferredRecoveryInlineAction || "accept" });
                }
            }
            else if (key === "g") {
                if (getSuggestionRemoteUpdateCount(suggestionId)) {
                    e.preventDefault();
                    markReviewActivitySeen();
                    updateActiveSuggestionDecorations();
                    if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                        renderReviewPanel(false);
                    }
                    announceReviewStatus("Shared AI review updates cleared for the current item.");
                    focusInlineSuggestionWrapper(wrapper);
                }
            }
            else if (key === "enter" || key === " ") {
                if (inlineActionNode) {
                    return;
                }
                e.preventDefault();
                focusDefaultInlineReviewAction(suggestionId, preferredInlineAction || getPreferredReviewActionFocus());
            }
        }

        editor.__aiBindInlinePreviewEventHandlers = bindInlinePreviewEventHandlers;
        bindInlinePreviewEventHandlers();

        restoreSuggestionStore();
        refreshRemoteReviewState(false);
        bindRemoteReviewSyncEvents();
        startRemoteReviewSync();
    };

    var stockToolbarDefinitions = {
        toolbar_default: "{bold,italic,underline,forecolor,backcolor}|{justifyleft,justifycenter,justifyright,justifyfull}|{insertorderedlist,insertunorderedlist,indent,outdent,insertblockquote,insertemoji}|{aiassist}#{toggleborder,fullscreenenter,fullscreenexit,undo,redo,togglemore}",
        toolbar_mobile: "{bold,italic,underline|fontname:toggle,fontsize:toggle,menu_paragraphop|forecolor,backcolor}{insertlink,insertemoji,inserttable,insertimage,removeformat}|{aiassist}#{toggleborder,fullscreenenter,fullscreenexit,undo,redo,togglemore}",
        toolbar_basic: "{bold,italic,underline}|{fontname,fontsize}|{insertlink,insertemoji,insertimage,insertvideo}|removeformat|code#{toggleborder,fullscreenenter,fullscreenexit,undo,redo,togglemore}",
        toolbar_full: "{bold,italic,underline,forecolor,backcolor}|{justifyleft,justifycenter,justifyright,justifyfull}|{insertorderedlist,insertunorderedlist,indent,outdent}{superscript,subscript}|{insertlink,insertimage,insertvideo,inserttable,insertemoji,find,code,html2pdf}|{aiassist_chat,aiassist_review}|{insertcomment,trackchanges}#{insertmergefield,insertfootnote,inserttoc,insertpagebreak,revisionhistory,newdoc,save,toggleborder,fullscreenenter,fullscreenexit,undo,redo,togglemore}",
        controltoolbar_TEXT: "removeformat | {bold,italic,underline,forecolor,backcolor}|{fontname:toggle,fontsize:toggle}|{insertlink}"
    };

    function normalizeToolbarDefinition(value) {
        return String(value || "").replace(/\s+/g, "");
    }

    function shouldAutoAppendToolbarCommand(key) {
        if (config.aiToolkitAutoToolbarButtons === false) {
            return false;
        }
        var current = config[key];
        if (!current) {
            return true;
        }
        var stock = stockToolbarDefinitions[key];
        if (!stock) {
            return true;
        }
        return normalizeToolbarDefinition(current) === normalizeToolbarDefinition(stock);
    }

    function appendToolbarCommand(key, token) {
        var current = config[key] || "";
        if (current.indexOf("aiassist") !== -1) {
            return;
        }
        if (!shouldAutoAppendToolbarCommand(key)) {
            return;
        }
        config[key] = current ? current + " " + token : token;
    }

    function appendControlToolbarCommand(key, token) {
        var current = config[key] || "";
        if (current.indexOf("aiassist") !== -1) {
            return;
        }
        if (!shouldAutoAppendToolbarCommand(key)) {
            return;
        }
        config[key] = current ? current + token : token;
    }

    function append(parent, tagName, cssText, className, text) {
        var node = parent.ownerDocument.createElement(tagName);
        if (cssText) {
            node.style.cssText = cssText;
        }
        if (className) {
            node.className = className;
        }
        if (typeof text !== "undefined") {
            node.innerText = text;
        }
        parent.appendChild(node);
        return node;
    }

    function appendPanelSectionLabel(parent, className, text) {
        var node = append(parent, "div", "", className, text);
        node.setAttribute("aria-hidden", "true");
        return node;
    }

    function getAiHeroPhotoDataUri() {
        return "data:image/svg+xml;utf8," + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-label="Editorial workspace photo">' +
            '<defs>' +
            '<linearGradient id="ai-photo-sky" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#e0f2fe"/>' +
            '<stop offset="52%" stop-color="#bfdbfe"/>' +
            '<stop offset="100%" stop-color="#ddd6fe"/>' +
            '</linearGradient>' +
            '<linearGradient id="ai-photo-desk" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#fef3c7"/>' +
            '<stop offset="100%" stop-color="#fdba74"/>' +
            '</linearGradient>' +
            '<filter id="ai-photo-blur" x="-20%" y="-20%" width="140%" height="140%">' +
            '<feGaussianBlur stdDeviation="14"/>' +
            '</filter>' +
            '</defs>' +
            '<rect width="320" height="240" rx="28" fill="url(#ai-photo-sky)"/>' +
            '<circle cx="248" cy="52" r="40" fill="#ffffff" opacity=".55"/>' +
            '<circle cx="76" cy="44" r="34" fill="#fdf2f8" opacity=".65"/>' +
            '<path d="M0 174C37 155 68 151 99 162c24 9 47 23 75 17 20-4 31-17 51-23 28-7 54 6 95 18v66H0z" fill="#86efac" opacity=".92"/>' +
            '<path d="M0 188c34-24 66-27 100-15 32 12 63 26 95 17 23-6 44-24 66-26 22-2 39 7 59 18v48H0z" fill="#60a5fa" opacity=".3"/>' +
            '<g filter="url(#ai-photo-blur)" opacity=".34">' +
            '<circle cx="248" cy="154" r="54" fill="#1d4ed8"/>' +
            '<circle cx="92" cy="134" r="48" fill="#7c3aed"/>' +
            '</g>' +
            '<rect x="74" y="72" width="172" height="110" rx="14" fill="#f8fafc" opacity=".95"/>' +
            '<rect x="88" y="86" width="144" height="14" rx="7" fill="#cbd5e1"/>' +
            '<rect x="88" y="110" width="118" height="10" rx="5" fill="#dbeafe"/>' +
            '<rect x="88" y="128" width="128" height="10" rx="5" fill="#dbeafe"/>' +
            '<rect x="88" y="146" width="82" height="10" rx="5" fill="#e9d5ff"/>' +
            '<rect x="198" y="138" width="34" height="28" rx="10" fill="url(#ai-photo-desk)"/>' +
            '<rect x="54" y="183" width="212" height="32" rx="16" fill="#ffffff" opacity=".68"/>' +
            '</svg>'
        );
    }

    // Inline SVG used in the AI Chat empty state and AI Review empty state.
    // Drawn as a single document with a chat bubble + sparkle stars on top
    // to evoke "your assistant is ready". Works on both light and dark page
    // backgrounds because the strokes use currentColor — the parent CSS
    // controls hue via `color`. ~6 KB so it stays inline rather than being
    // requested as a separate file.
    function getAiAssistantIllustrationSvg() {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140" role="img" aria-hidden="true" focusable="false">' +
            '<defs>' +
                '<linearGradient id="ai-illus-doc" x1="0" y1="0" x2="0" y2="1">' +
                    '<stop offset="0%" stop-color="#ffffff"/>' +
                    '<stop offset="100%" stop-color="#f1f5fb"/>' +
                '</linearGradient>' +
                '<linearGradient id="ai-illus-bubble" x1="0" y1="0" x2="1" y2="1">' +
                    '<stop offset="0%" stop-color="#3b82f6"/>' +
                    '<stop offset="100%" stop-color="#6366f1"/>' +
                '</linearGradient>' +
                '<linearGradient id="ai-illus-sparkle" x1="0" y1="0" x2="0" y2="1">' +
                    '<stop offset="0%" stop-color="#fbbf24"/>' +
                    '<stop offset="100%" stop-color="#f59e0b"/>' +
                '</linearGradient>' +
            '</defs>' +
            // soft halo behind everything
            '<ellipse cx="100" cy="118" rx="68" ry="8" fill="#0f172a" opacity="0.08"/>' +
            // document with shadow
            '<rect x="44" y="34" width="92" height="78" rx="10" fill="#cbd5e1" opacity="0.45" transform="translate(2,3)"/>' +
            '<rect x="44" y="34" width="92" height="78" rx="10" fill="url(#ai-illus-doc)" stroke="#cbd5e1" stroke-width="1"/>' +
            // document text lines
            '<rect x="56" y="54" width="60" height="6" rx="3" fill="#dbeafe"/>' +
            '<rect x="56" y="66" width="68" height="5" rx="2.5" fill="#e2e8f0"/>' +
            '<rect x="56" y="76" width="52" height="5" rx="2.5" fill="#e2e8f0"/>' +
            '<rect x="56" y="90" width="44" height="5" rx="2.5" fill="#ede9fe"/>' +
            // chat bubble peeking out top-right with AI sparkle
            '<g>' +
                '<path d="M118 22 H162 a10 10 0 0 1 10 10 v22 a10 10 0 0 1 -10 10 H140 l-9 8 v-8 H118 a10 10 0 0 1 -10 -10 V32 a10 10 0 0 1 10 -10 z" fill="url(#ai-illus-bubble)"/>' +
                '<circle cx="128" cy="42" r="2.6" fill="#ffffff"/>' +
                '<circle cx="140" cy="42" r="2.6" fill="#ffffff"/>' +
                '<circle cx="152" cy="42" r="2.6" fill="#ffffff"/>' +
            '</g>' +
            // sparkle stars (4-point)
            '<g fill="url(#ai-illus-sparkle)">' +
                '<path d="M36 28 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z"/>' +
                '<path d="M168 88 l1.6 4.8 4.8 1.6 -4.8 1.6 -1.6 4.8 -1.6 -4.8 -4.8 -1.6 4.8 -1.6 z"/>' +
                '<path d="M30 92 l1.2 3.6 3.6 1.2 -3.6 1.2 -1.2 3.6 -1.2 -3.6 -3.6 -1.2 3.6 -1.2 z"/>' +
            '</g>' +
        '</svg>';
    }

    function appendAiHero(parent, variant) {
        var hero = append(parent, "div", "", "rte-ai-hero" + (variant ? " is-" + variant : ""));
        var media = append(hero, "div", "", "rte-ai-hero-media");
        var image = append(media, "img", "", "rte-ai-hero-image");
        image.alt = "Styled editorial workspace preview";
        image.src = getAiHeroPhotoDataUri();
        image.loading = "eager";
        image.decoding = "async";
        var body = append(hero, "div", "", "rte-ai-hero-body");
        append(body, "div", "", "rte-ai-hero-kicker", variant === "dialog" ? "Guided AI flow" : "Beautiful drafting");
        append(body, "div", "", "rte-ai-hero-title", variant === "dialog" ? "Review the change before it lands" : "Shape the document with a calmer AI workspace");
        append(body, "div", "", "rte-ai-hero-copy", variant === "dialog"
            ? "Load source text, compare the result, and apply only the version that improves the draft."
            : "Keep context visible, ask for help in smaller steps, and make each suggestion feel intentional.");
        return hero;
    }

    function appendReviewControlGroup(parent, className, text) {
        var node = append(parent, "div", "", className);
        if (text) {
            node.setAttribute("data-rte-ai-review-group-label", text);
        }
        return append(node, "div", "", "rte-ai-review-control-group-body");
    }

    function appendReviewHeaderGroup(parent, className, text) {
        var node = append(parent, "div", "", className);
        if (text) {
            append(node, "div", "", "rte-ai-review-header-group-label", text);
        }
        return append(node, "div", "", "rte-ai-review-header-group-body");
    }

    function getActionIconSvg(action) {
        if (!action) {
            return config.svgCode_aiassist || "";
        }

        var iconKey = action.icon || action.id || "open_dialog";
        return config["svgCode_aiassist_" + iconKey] || config.svgCode_aiassist || "";
    }

    /**
     * Consume a Server-Sent Events stream from the RichTextBox AI streaming
     * endpoint. Yields each text delta to `onDelta`, the final structured
     * response to `onResponse` (if the server emitted one), and fires `onDone`
     * when the stream closes. Returns an object with an `abort()` method and a
     * `promise` that resolves to the concatenated full text.
     *
     *   editor.aiToolkit.streamRequest({
     *     url: "/richtextbox/ai/stream",
     *     body: { mode: "rewrite", selectionText: "..." },
     *     onDelta: function (text) { ... },
     *     onResponse: function (response) { ... },
     *     onDone: function (fullText) { ... },
     *     onError: function (err) { ... }
     *   });
     *
     * Non-streaming providers still work — the server emits one data frame
     * plus a "response" event instead of incremental deltas.
     */
    function streamAiRequest(options) {
        options = options || {};
        var url = options.url || "/richtextbox/ai/stream";
        var body = options.body || {};
        var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        var fullText = "";

        var p = (function () {
            // If fetch or ReadableStream isn't available, fall back to the
            // non-streaming endpoint so the helper is still callable.
            if (typeof fetch !== "function" || typeof ReadableStream === "undefined") {
                return fetchFallback(url, body, options);
            }

            return fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
                body: JSON.stringify(body),
                signal: controller ? controller.signal : undefined,
                credentials: "same-origin"
            }).then(function (res) {
                if (!res.ok) {
                    throw new Error("AI stream failed: HTTP " + res.status);
                }
                if (!res.body || typeof res.body.getReader !== "function") {
                    // Server returned non-streaming body (old client / proxy buffered).
                    return res.text().then(function (text) {
                        if (options.onDelta) options.onDelta(text);
                        fullText = text;
                        if (options.onDone) options.onDone(fullText);
                        return fullText;
                    });
                }

                var reader = res.body.getReader();
                var decoder = new TextDecoder("utf-8");
                var buffer = "";

                function pump() {
                    return reader.read().then(function (chunk) {
                        if (chunk.done) {
                            if (options.onDone) options.onDone(fullText);
                            return fullText;
                        }
                        buffer += decoder.decode(chunk.value, { stream: true });

                        // Each SSE frame ends with a blank line (\n\n).
                        var frameEnd;
                        while ((frameEnd = buffer.indexOf("\n\n")) >= 0) {
                            var rawFrame = buffer.slice(0, frameEnd);
                            buffer = buffer.slice(frameEnd + 2);
                            handleFrame(rawFrame);
                        }
                        return pump();
                    });
                }

                function handleFrame(raw) {
                    var eventName = "message";
                    var dataLines = [];
                    var lines = raw.split("\n");
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (line.indexOf("event:") === 0) eventName = line.slice(6).trim();
                        else if (line.indexOf("data:") === 0) dataLines.push(line.slice(5).trim());
                    }
                    if (dataLines.length === 0) return;
                    var dataStr = dataLines.join("\n");

                    var payload;
                    try { payload = JSON.parse(dataStr); }
                    catch (e) { payload = dataStr; }

                    if (eventName === "message") {
                        var text = typeof payload === "string" ? payload : "";
                        if (text) {
                            fullText += text;
                            if (options.onDelta) options.onDelta(text, fullText);
                        }
                    } else if (eventName === "response") {
                        if (options.onResponse) options.onResponse(payload);
                    } else if (eventName === "error") {
                        if (options.onError) options.onError(payload);
                    }
                    // "done" is handled by the reader closing; we don't need to act here.
                }

                return pump();
            }).catch(function (err) {
                if (err && err.name === "AbortError") return fullText;
                if (options.onError) options.onError(err);
                throw err;
            });
        })();

        return {
            promise: p,
            abort: function () { if (controller) controller.abort(); }
        };
    }

    function fetchFallback(url, body, options) {
        // Plain JSON POST fallback for browsers without streaming. Uses the
        // existing non-streaming endpoint by convention (caller can override).
        var fallbackUrl = (options && options.fallbackUrl) || url.replace(/\/stream$/, "");
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", fallbackUrl, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    var parsed;
                    try { parsed = JSON.parse(xhr.responseText); } catch (e) { parsed = xhr.responseText; }
                    var text = "";
                    if (parsed && parsed.operations && parsed.operations.length) {
                        text = parsed.operations[0].text || "";
                    } else if (parsed && parsed.message) {
                        text = parsed.message;
                    }
                    if (options && options.onDelta && text) options.onDelta(text, text);
                    if (options && options.onResponse && parsed && typeof parsed === "object") options.onResponse(parsed);
                    if (options && options.onDone) options.onDone(text);
                    resolve(text);
                } else {
                    var err = new Error("AI request failed: HTTP " + xhr.status);
                    if (options && options.onError) options.onError(err);
                    reject(err);
                }
            };
            xhr.onerror = function () {
                var err = new Error("AI request network error");
                if (options && options.onError) options.onError(err);
                reject(err);
            };
            xhr.send(JSON.stringify(body));
        });
    }

    /**
     * Ask the server to build a .docx from the current editor HTML and
     * trigger a browser download. Defaults target the endpoint registered
     * by `MapRichTextBoxUploads()` (RichTextBox.AspNetCore 1.0.0-preview.11+).
     *
     *   editor.aiToolkit.exportDocx({
     *     url: "/richtextbox/export/docx",      // optional override
     *     fileName: "my-document.docx",          // optional; suggested filename
     *     title: "My document",                  // optional; core-props title
     *     html: "<p>custom HTML</p>",            // optional; defaults to editor HTML
     *     onError: function (err) { ... }
     *   });
     *
     * Returns a Promise that resolves when the file has been handed to the
     * browser download mechanism. Works in every browser with fetch + Blob.
     */
    function exportDocx(options) {
        options = options || {};
        var url = options.url || "/richtextbox/export/docx";
        var html = typeof options.html === "string" ? options.html
            : (editor && editor.getHTMLCode ? editor.getHTMLCode() : "");
        var title = options.title || (typeof document !== "undefined" ? document.title : "") || "document";
        var fileName = options.fileName || (String(title).replace(/[\\\/\:\*\?"<>\|]/g, "").trim() || "document") + ".docx";

        if (!html) {
            var err = new Error("exportDocx: editor content is empty.");
            if (options.onError) options.onError(err);
            return Promise.reject(err);
        }
        if (typeof fetch !== "function") {
            var err2 = new Error("exportDocx requires fetch + Blob support.");
            if (options.onError) options.onError(err2);
            return Promise.reject(err2);
        }

        return fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
            body: JSON.stringify({ html: html, title: title, fileName: fileName }),
            credentials: "same-origin"
        }).then(function (res) {
            if (!res.ok) throw new Error("exportDocx failed: HTTP " + res.status);
            return res.blob();
        }).then(function (blob) {
            // Trigger browser download. Use createObjectURL + anchor click; msSaveBlob for IE/old Edge.
            if (typeof window !== "undefined" && window.navigator && window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveOrOpenBlob(blob, fileName);
                return fileName;
            }
            var href = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = href;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            // Release the object URL after the browser has had time to start the download.
            setTimeout(function () { try { URL.revokeObjectURL(href); } catch (e) { /* ignore */ } }, 4000);
            return fileName;
        }).catch(function (err) {
            if (options.onError) options.onError(err);
            throw err;
        });
    }

    /**
     * Import a .docx file and apply its HTML into the editor.
     *
     *   editor.aiToolkit.importDocx({
     *     url: "/richtextbox/import/docx",      // optional server endpoint
     *     file: fileObject,                     // optional File / Blob
     *     mode: "replace" | "insert",           // replace = overwrite document; insert = at caret
     *     onError: function (err) { ... }
     *   });
     *
     * If `file` is omitted, prompts the user with a file picker. Resolves with
     * the inserted HTML (or undefined if cancelled).
     */
    function importDocx(options) {
        options = options || {};
        var url = options.url || "/richtextbox/import/docx";
        var mode = options.mode === "insert" ? "insert" : "replace";

        function extractImportHtml(payload) {
            if (!payload) return "";
            return payload.html || payload.content || "";
        }

        function postFile(file) {
            if (typeof fetch !== "function" || typeof FormData !== "function") {
                var err = new Error("importDocx requires fetch + FormData support.");
                if (options.onError) options.onError(err);
                return Promise.reject(err);
            }
            var fd = new FormData();
            fd.append("file", file, file.name || "document.docx");
            fd.append("mode", mode);
            return fetch(url, { method: "POST", body: fd, credentials: "same-origin" }).then(function (res) {
                if (!res.ok) throw new Error("importDocx failed: HTTP " + res.status);
                return res.json().then(extractImportHtml);
            }).then(function (html) {
                if (!html) return undefined;
                if (mode === "insert" && editor && editor.insertHTML) {
                    editor.insertHTML(html);
                } else if (editor && editor.setHTMLCode) {
                    editor.setHTMLCode(html);
                }
                return html;
            }).catch(function (err) {
                if (options.onError) options.onError(err);
                throw err;
            });
        }

        if (options.file) return postFile(options.file);

        // No file provided — prompt user.
        return new Promise(function (resolve, reject) {
            if (typeof document === "undefined") return reject(new Error("importDocx: no document"));
            var input = document.createElement("input");
            input.type = "file";
            input.accept = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            input.style.display = "none";
            input.onchange = function () {
                var f = input.files && input.files[0];
                document.body.removeChild(input);
                if (!f) return resolve(undefined);
                postFile(f).then(resolve, reject);
            };
            document.body.appendChild(input);
            input.click();
        });
    }

    function normalizeText(text) {
        return (text || "")
            .replace(/\r\n/g, "\n")
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }

    function ensureSentence(text) {
        var clean = normalizeText(text);
        if (!clean) {
            return clean;
        }
        clean = clean.charAt(0).toUpperCase() + clean.substring(1);
        if (!/[.!?]$/.test(clean)) {
            clean += ".";
        }
        return clean;
    }

    function getTranslateLanguages() {
        return (config.aiToolkitTranslateLanguages || []).slice();
    }

    function normalizeLanguageValue(language) {
        return normalizeText(language || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    }

    function getTranslateLanguageLabel(language) {
        var normalized = normalizeLanguageValue(language);
        var languages = getTranslateLanguages();
        for (var i = 0; i < languages.length; i++) {
            if (normalizeLanguageValue(languages[i].value) === normalized || normalizeLanguageValue(languages[i].label) === normalized) {
                return languages[i].label || languages[i].value;
            }
        }
        return language ? ensureSentence(String(language)).replace(/[.!?]$/, "") : "Spanish";
    }

    function getTranslateLanguageValue(language) {
        var normalized = normalizeLanguageValue(language);
        var languages = getTranslateLanguages();
        for (var i = 0; i < languages.length; i++) {
            if (normalizeLanguageValue(languages[i].value) === normalized || normalizeLanguageValue(languages[i].label) === normalized) {
                return languages[i].value || languages[i].label;
            }
        }
        return normalized || "spanish";
    }

    function getSuggestionTypeValue(type) {
        var normalized = normalizeText(type || "").toLowerCase();
        return normalized || "other";
    }

    function getSuggestionTypeLabel(type) {
        switch (getSuggestionTypeValue(type)) {
            case "proofread":
                return "Proofread";
            case "rewrite":
                return "Rewrite";
            case "translate":
                return "Translate";
            case "justify":
                return "Justify";
            case "summarize":
                return "Summarize";
            case "shorten":
                return "Shorten";
            case "expand":
                return "Expand";
            case "comment":
                return "Comment";
            case "paragraph":
                return "Paragraph";
            case "chat":
                return "Chat";
            default:
                return "Other";
        }
    }

    function getSuggestionScopeLabel(suggestion) {
        if (!suggestion) {
            return "";
        }
        if (suggestion.snapshot && suggestion.snapshot.hasSelection) {
            return "Selection";
        }
        if (suggestion.scope === "selection") {
            return "Selection";
        }
        if (suggestion.sourceLabel) {
            if (/selection/i.test(suggestion.sourceLabel)) {
                return "Selection";
            }
            if (/document/i.test(suggestion.sourceLabel)) {
                return "Document";
            }
        }
        return "Document";
    }

    function getSuggestionQueueActionLabel(suggestion) {
        var pendingCount = getSuggestionQueuePendingCount(suggestion);
        var pendingLabel = pendingCount === 1 ? "1 pending" : pendingCount + " pending";
        var typeLabel = suggestion && suggestion.suggestionType ? getSuggestionTypeLabel(suggestion.suggestionType) : "AI";
        if (!typeLabel || typeLabel === "Other") {
            return "Open queue (" + pendingLabel + ")";
        }
        return "Open " + typeLabel + " queue (" + pendingLabel + ")";
    }

    function getSuggestionQueueActionTitle(suggestion) {
        var pendingCount = getSuggestionQueuePendingCount(suggestion);
        var pendingLabel = pendingCount === 1 ? "1 pending item" : pendingCount + " pending items";
        var typeLabel = suggestion && suggestion.suggestionType ? getSuggestionTypeLabel(suggestion.suggestionType) : "AI";
        var focusLabel = getReviewFocusActionDisplayLabel(suggestion, getPreferredReviewActionFocus());
        if (!typeLabel || typeLabel === "Other") {
            return "Click or press Enter to open this AI review queue" + (focusLabel ? " and focus " + focusLabel : "") + ". " + pendingLabel + ".";
        }
        return "Click or press Enter to open the " + typeLabel + " AI review queue" + (focusLabel ? " and focus " + focusLabel : "") + ". " + pendingLabel + ".";
    }

    function getSuggestionQueueShortcutHint(suggestion) {
        var pendingCount = getSuggestionQueuePendingCount(suggestion);
        var pendingLabel = pendingCount === 1 ? "1 pending" : pendingCount + " pending";
        var typeLabel = suggestion && suggestion.suggestionType ? getSuggestionTypeLabel(suggestion.suggestionType) : "AI";
        var focusLabel = getReviewFocusActionDisplayLabel(suggestion, getPreferredReviewActionFocus());
        if (!typeLabel || typeLabel === "Other") {
            return "Click or Enter opens queue (" + pendingLabel + ")" + (focusLabel ? ", focus " + focusLabel : "");
        }
        return "Click or Enter opens " + typeLabel + " queue (" + pendingLabel + ")" + (focusLabel ? ", focus " + focusLabel : "");
    }

    function getSuggestionQueuePendingCount(suggestion) {
        if (!suggestion) {
            return 0;
        }
        var typeValue = getSuggestionTypeValue(suggestion.suggestionType || "");
        var typeFilter = typeValue === "other" ? "all" : typeValue;
        return getFilteredPendingSuggestions(typeFilter).length;
    }

    function getSuggestionQueueAriaContext(suggestion) {
        var pendingCount = getSuggestionQueuePendingCount(suggestion);
        var pendingLabel = pendingCount === 1 ? "1 pending item" : pendingCount + " pending items";
        var typeLabel = suggestion && suggestion.suggestionType ? getSuggestionTypeLabel(suggestion.suggestionType) : "AI";
        var focusLabel = getReviewFocusActionDisplayLabel(suggestion, getPreferredReviewActionFocus());
        if (!typeLabel || typeLabel === "Other") {
            return "Opens AI review queue." + (focusLabel ? " Focuses " + focusLabel + "." : "") + " " + pendingLabel;
        }
        return "Opens " + typeLabel + " AI review queue." + (focusLabel ? " Focuses " + focusLabel + "." : "") + " " + pendingLabel;
    }

    function buildInlineSuggestionAriaLabel(suggestion, options) {
        options = options || {};
        var parts = ["AI suggestion preview"];
        var includeTypeLabel = true;
        if (options.isPreviewTarget) {
            parts.push("Next review queue target");
            parts.push(getSuggestionQueueAriaContext(suggestion));
            includeTypeLabel = false;
        }
        else if (options.isCurrent) {
            parts.push("Current review item");
        }
        if (options.queueOpened) {
            parts.push("Queue opened");
        }
        if (includeTypeLabel && suggestion && suggestion.suggestionType && getSuggestionTypeValue(suggestion.suggestionType) !== "other") {
            parts.push(getSuggestionTypeLabel(suggestion.suggestionType));
        }
        if (suggestion && suggestion.language) {
            parts.push(getTranslateLanguageLabel(suggestion.language));
        }
        var scopeLabel = getSuggestionScopeLabel(suggestion);
        if (scopeLabel) {
            parts.push(scopeLabel);
        }
        if (options.glanceLabels && options.glanceLabels.length) {
            for (var glanceIndex = 0; glanceIndex < options.glanceLabels.length; glanceIndex++) {
                if (options.glanceLabels[glanceIndex]) {
                    parts.push(options.glanceLabels[glanceIndex]);
                }
            }
        }
        if (options.glanceDetail) {
            parts.push(options.glanceDetail);
        }
        if (options.compareLabel) {
            parts.push(options.compareLabel);
        }
        if (options.reasonText) {
            parts.push("Why this suggestion: " + options.reasonText);
        }
        if (options.queueRoleLabel && !options.isPreviewTarget) {
            parts.push(options.queueRoleLabel);
        }
        if (options.queueRoleDetail && !options.isPreviewTarget) {
            parts.push(options.queueRoleDetail);
        }
        if (options.focusLabel && !options.isPreviewTarget) {
            parts.push("Enter focuses " + options.focusLabel);
        }
        if (options.positionLabel) {
            parts.push(options.positionLabel);
        }
        if (options.transitionLabel) {
            parts.push(options.transitionLabel);
        }
        if (options.followupLabel) {
            parts.push(options.followupLabel);
        }
        if (options.remoteUpdateCount) {
            parts.push(options.remoteUpdateCount > 1 ? options.remoteUpdateCount + " shared updates" : "Shared update");
        }
        if (options.undoLabel) {
            parts.push(options.undoLabel);
        }
        if (options.undoNextLabel) {
            parts.push(options.undoNextLabel);
        }
        if (options.redoLabel) {
            parts.push(options.redoLabel);
        }
        if (options.redoNextLabel) {
            parts.push(options.redoNextLabel);
        }
        return parts.join(". ");
    }

    function buildSuggestionSourceLabel(type, snapshot, language, scope) {
        var scopeLabel = scope === "selection"
            ? "Selection"
            : (scope === "document"
                ? "Document"
                : (snapshot && snapshot.hasSelection ? "Selection" : "Document"));
        var typeLabel = getSuggestionTypeLabel(type);
        if (getSuggestionTypeValue(type) === "translate" && language) {
            return typeLabel + " - " + scopeLabel + " - " + getTranslateLanguageLabel(language);
        }
        return typeLabel + " - " + scopeLabel;
    }

    function buildTranslatedResult(source, language) {
        var clean = normalizeText(source);
        if (!clean) {
            return "";
        }

        var languageValue = getTranslateLanguageValue(language);
        var languageLabel = getTranslateLanguageLabel(languageValue);
        var leadMap = {
            spanish: "Version en español",
            french: "Version française",
            german: "Deutsche Fassung",
            italian: "Versione italiana",
            portuguese: "Versão em português",
            japanese: "Japanese draft"
        };
        var lead = leadMap[languageValue] || (languageLabel + " version");
        return ensureSentence(lead + ": " + clean);
    }

    function buildDemoResult(mode, source, options) {
        options = options || {};
        var clean = normalizeText(source);
        if (!clean) {
            return "";
        }

        var words = clean.split(/\s+/);
        switch (mode) {
            case "proofread":
                var proofed = clean
                    .replace(/\s{2,}/g, " ")
                    .replace(/\s+([,.;:!?])/g, "$1")
                    .replace(/([,.;:!?])([^\s"'\)\]])/g, "$1 $2")
                    .replace(/\.{2,}(?!\.)/g, ".")
                    .replace(/^(.)/, function (m) { return m.toUpperCase(); });
                return ensureSentence(proofed);
            case "rewrite":
                return ensureSentence(clean
                    .replace(/\bvery\s+/gi, "")
                    .replace(/\breally\s+/gi, "")
                    .replace(/\bjust\s+/gi, "")
                    .replace(/\bin order to\b/gi, "to")
                    .replace(/\bdue to the fact that\b/gi, "because")
                    .replace(/\s{2,}/g, " "));
            case "translate":
                return buildTranslatedResult(clean, options.language);
            case "shorten":
                return ensureSentence(words.slice(0, Math.max(8, Math.ceil(words.length * 0.6))).join(" "));
            case "expand":
                return ensureSentence(clean) + "\n\nTo add context: this extended version unpacks the idea with an additional sentence so readers can follow the reasoning without extra background.";
            case "summarize":
                return "Summary:\n- " + ensureSentence(words.slice(0, Math.max(10, Math.ceil(words.length * 0.45))).join(" "));
            default:
                return ensureSentence(clean);
        }
    }

    function buildCommentResult(source) {
        var clean = normalizeText(source);
        if (!clean) {
            return "AI note: Consider tightening this wording for clarity and reader confidence.";
        }
        return ensureSentence("AI note: Consider clarifying this passage and tightening the wording around \"" + clean.split(/\s+/).slice(0, 6).join(" ") + "\"");
    }

    function buildParagraphResult(source) {
        var clean = normalizeText(source);
        if (!clean) {
            return "Additional paragraph: This section adds a concise supporting explanation so the reader gets more context without losing momentum.";
        }
        return ensureSentence("Additional paragraph: This section adds a concise supporting explanation that reinforces " + clean.split(/\s+/).slice(0, 10).join(" ") + " for the reader.");
    }

    function truncateText(text, maxLength) {
        var clean = normalizeText(text);
        if (!clean || clean.length <= maxLength) {
            return clean;
        }
        return clean.substring(0, Math.max(0, maxLength - 3)).replace(/\s+\S*$/, "").trim() + "...";
    }

    function buildChatAnswer(prompt, source) {
        var focus = truncateText(source, 160) || "the current document";
        if (/\b(headings?|titles?)\b/.test(prompt)) {
            return "You could tighten the structure by using shorter headings that mirror the main claims in " + focus + ". Ask me to draft heading options and I can turn them into reviewable suggestions.";
        }
        if (/\b(translate|translation)\b/.test(prompt)) {
            return "I can translate the current selection or whole document into Spanish, French, German, Italian, Portuguese, or Japanese and keep it reviewable in the editor before you accept it.";
        }
        if (/\bwhy\b|\bhow\b|\bwhat\b|\?/.test(prompt)) {
            return "Based on " + focus + ", I would focus on clarity, stronger section framing, and cleaner transitions. If you want, ask me to rewrite or summarize a specific passage and I can prepare an in-editor suggestion.";
        }
        return "I reviewed " + focus + ". Ask me to rewrite, summarize, proofread, translate, comment on, or expand the current content and I can prepare editor-ready changes.";
    }

    function extractRequestedLanguage(prompt) {
        var normalizedPrompt = normalizeText(prompt).toLowerCase();
        if (!normalizedPrompt) {
            return "";
        }
        var languages = getTranslateLanguages();
        for (var i = 0; i < languages.length; i++) {
            var label = (languages[i].label || "").toLowerCase();
            var value = (languages[i].value || "").toLowerCase();
            if ((label && normalizedPrompt.indexOf(label) >= 0) || (value && normalizedPrompt.indexOf(value) >= 0)) {
                return languages[i].value || languages[i].label;
            }
        }
        return "";
    }

    function buildChatResolvedAction(request) {
        var prompt = normalizeText(request.prompt || "");
        var source = normalizeText(request.source || request.selectionText || request.documentText || "");
        var promptLower = prompt.toLowerCase();
        var requestedLanguage = request.language || extractRequestedLanguage(prompt);
        var usesSelectionScope = request.scope === "selection";
        var previewTarget = usesSelectionScope ? "selection-preview" : "document";
        var editReason = "";
        var resultText = "";
        var target = previewTarget;

        if (!prompt) {
            return {
                message: "Ask a question, request a rewrite, or tell the AI to summarize, proofread, translate, or expand the current content.",
                operations: []
            };
        }

        if (/\b(translate|translation|localize|localise)\b/.test(promptLower)) {
            var languageLabel = getTranslateLanguageLabel(requestedLanguage || "spanish");
            resultText = buildDemoResult("translate", source, { language: requestedLanguage });
            editReason = "This prepares a translated " + languageLabel + " draft while keeping the original text nearby until you review and accept the change.";
            return {
                message: "I prepared a " + languageLabel + " translation you can review before applying.",
                result: resultText,
                reason: editReason,
                operations: [
                    buildLegacyOperation(previewTarget, resultText, { reason: editReason }, request, request.action)
                ]
            };
        }

        if (/\b(comment|note|feedback)\b/.test(promptLower)) {
            resultText = buildCommentResult(source);
            editReason = "This AI note highlights a place that could use clarification or stronger editorial guidance.";
            return {
                message: "I prepared an AI comment you can add next to the current content.",
                result: resultText,
                reason: editReason,
                operations: [
                    {
                        type: "add-comment",
                        text: resultText,
                        reason: editReason
                    }
                ]
            };
        }

        if (/\b(expand|add|insert|paragraph|develop)\b/.test(promptLower)) {
            resultText = buildDemoResult("expand", source);
            editReason = "This adds supporting detail without changing the original point, so it works well as an inserted follow-up paragraph.";
            target = "insert";
            return {
                message: "I drafted a supporting paragraph you can insert below the current content.",
                result: resultText,
                reason: editReason,
                operations: [
                    buildLegacyOperation(target, resultText, { reason: editReason }, request, request.action)
                ]
            };
        }

        if (/\b(summarize|summary|recap)\b|\bexecutive summary\b/.test(promptLower)) {
            resultText = buildDemoResult("summarize", source);
            editReason = "This compresses the current content into a shorter, clearer version that is easier to scan or reuse.";
            target = usesSelectionScope ? "selection-preview" : "document";
            return {
                message: "I prepared a condensed version of the current content for review.",
                result: resultText,
                reason: editReason,
                operations: [
                    buildLegacyOperation(target, resultText, { reason: editReason }, request, request.action)
                ]
            };
        }

        if (/\b(proofread|grammar|fix|correct)\b|\bclean up\b/.test(promptLower)) {
            resultText = buildDemoResult("proofread", source);
            editReason = "This pass improves grammar, punctuation, and readability while keeping the original meaning intact.";
            return {
                message: "I prepared a proofread version you can preview inline and accept if it looks right.",
                result: resultText,
                reason: editReason,
                operations: [
                    buildLegacyOperation(previewTarget, resultText, { reason: editReason }, request, request.action)
                ]
            };
        }

        if (/\b(rewrite|adjust|clarify|improve|polish|tone)\b/.test(promptLower)) {
            resultText = buildDemoResult("rewrite", source);
            editReason = "This rewrite removes filler language and tightens the wording so the idea is easier to review and accept.";
            return {
                message: "I drafted a clearer rewrite of the current content.",
                result: resultText,
                reason: editReason,
                operations: [
                    buildLegacyOperation(previewTarget, resultText, { reason: editReason }, request, request.action)
                ]
            };
        }

        return {
            message: buildChatAnswer(promptLower, source),
            operations: []
        };
    }

    function getActionDefinition(actionId) {
        var actions = getActionDefinitions();
        for (var i = 0; i < actions.length; i++) {
            if (actions[i].id === actionId) {
                return actions[i];
            }
        }
        return null;
    }

    function getActionDefinitions() {
        return (config.aiToolkitActions || []).slice();
    }

    function getDialogModes() {
        return (config.aiToolkitDialogModes || []).slice();
    }

    function upsertDefinition(collection, definition) {
        if (!definition || !definition.id) {
            return false;
        }
        for (var i = 0; i < collection.length; i++) {
            if (collection[i].id === definition.id) {
                collection[i] = definition;
                return true;
            }
        }
        collection.push(definition);
        return true;
    }

    function removeDefinition(collection, id) {
        for (var i = collection.length - 1; i >= 0; i--) {
            if (collection[i].id === id) {
                collection.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    function registerActionDefinition(action) {
        config.aiToolkitActions = config.aiToolkitActions || [];
        upsertDefinition(config.aiToolkitActions, action);
        return action;
    }

    function removeActionDefinition(actionId) {
        config.aiToolkitActions = config.aiToolkitActions || [];
        return removeDefinition(config.aiToolkitActions, actionId);
    }

    function registerDialogModeDefinition(mode) {
        config.aiToolkitDialogModes = config.aiToolkitDialogModes || [];
        upsertDefinition(config.aiToolkitDialogModes, mode);
        return mode;
    }

    function removeDialogModeDefinition(modeId) {
        config.aiToolkitDialogModes = config.aiToolkitDialogModes || [];
        return removeDefinition(config.aiToolkitDialogModes, modeId);
    }

    function registerOperationHandler(type, handler) {
        if (!type) {
            return false;
        }
        if (typeof handler === "function") {
            config.aiToolkitOperationHandlers[type] = handler;
            return true;
        }
        delete config.aiToolkitOperationHandlers[type];
        return false;
    }

    function unregisterOperationHandler(type) {
        if (!type) {
            return false;
        }
        if (config.aiToolkitOperationHandlers && config.aiToolkitOperationHandlers[type]) {
            delete config.aiToolkitOperationHandlers[type];
            return true;
        }
        return false;
    }

    function getOperationContract() {
        return {
            version: "2026-04-18",
            operations: [
                { type: "open-chat-panel", description: "Open the docked AI chat panel." },
                { type: "open-review-panel", description: "Open the persistent AI review drawer." },
                { type: "open-dialog", description: "Open the Ask AI review dialog." },
                { type: "preview-suggestion", description: "Preview a reviewable inline suggestion for the current selection.", requiresText: true, requiresSelection: true },
                { type: "replace-selection", description: "Replace the current selection with new text.", requiresText: true, requiresSelection: true },
                { type: "replace-document", description: "Replace the whole editor document with new text.", requiresText: true },
                { type: "insert-below", description: "Insert new text below the current selection or caret.", requiresText: true },
                { type: "add-comment", description: "Insert an AI comment marker near the current selection or caret.", requiresText: true }
            ]
        };
    }

    function buildLegacyOperation(target, text, resolved, request, action) {
        var fallbackTarget = target || (action && action.target) || "document";
        var meta = {
            mode: request && request.mode ? request.mode : (action && action.resolverMode ? action.resolverMode : ""),
            language: request && request.language ? request.language : "",
            sourceLabel: buildSuggestionSourceLabel(request && request.mode ? request.mode : (action && action.resolverMode ? action.resolverMode : ""), request && request.snapshot ? request.snapshot : null, request && request.language ? request.language : "", request && request.scope ? request.scope : "")
        };
        switch (fallbackTarget) {
            case "chat-panel":
                return {
                    type: "open-chat-panel"
                };
            case "review-panel":
                return {
                    type: "open-review-panel"
                };
            case "dialog":
                return {
                    type: "open-dialog",
                    presetMode: resolved && resolved.presetMode ? resolved.presetMode : (request && request.mode ? request.mode : ""),
                    useDocument: resolved && typeof resolved.useDocument === "boolean" ? resolved.useDocument : false,
                    autoRun: resolved && typeof resolved.autoRun === "boolean" ? resolved.autoRun : (action && typeof action.autoRun === "boolean" ? action.autoRun : false)
                };
            case "selection-preview":
            case "preview":
                return {
                    type: "preview-suggestion",
                    text: text,
                    meta: meta
                };
            case "comment":
                return {
                    type: "add-comment",
                    text: text,
                    meta: meta
                };
            case "insert":
                return {
                    type: "insert-below",
                    text: text,
                    meta: meta
                };
            case "selection":
                return {
                    type: "replace-selection",
                    text: text,
                    meta: meta
                };
            case "document":
            default:
                return {
                    type: "replace-document",
                    text: text,
                    meta: meta
                };
        }
    }

    function normalizeOperation(operation, fallbackTarget, resolved, request, action) {
        if (operation == null) {
            return null;
        }

        if (typeof operation === "string") {
            return buildLegacyOperation(fallbackTarget, operation, resolved, request, action);
        }

        var type = operation.type || operation.op || operation.name || "";
        if (!type) {
            return buildLegacyOperation(operation.target || fallbackTarget, operation.text || operation.result || operation.content || operation.note || "", operation, request, action);
        }

        return {
            type: type,
            text: normalizeText(operation.text || operation.result || operation.content || operation.note || ""),
            html: operation.html || "",
            reason: operation.reason || (resolved && resolved.reason) || "",
            presetMode: operation.presetMode || (resolved && resolved.presetMode) || (request && request.mode) || "",
            useDocument: typeof operation.useDocument === "boolean" ? operation.useDocument : (resolved && typeof resolved.useDocument === "boolean" ? resolved.useDocument : false),
            autoRun: typeof operation.autoRun === "boolean" ? operation.autoRun : (resolved && typeof resolved.autoRun === "boolean" ? resolved.autoRun : (action && typeof action.autoRun === "boolean" ? action.autoRun : false)),
            target: operation.target || fallbackTarget || "",
            meta: operation.meta || null
        };
    }

    function extractResolvedOperations(resolved, fallbackTarget, request, action) {
        var items = [];
        if (resolved && resolved.operations) {
            items = resolved.operations;
        }
        else if (resolved && resolved.operation) {
            items = [resolved.operation];
        }
        else {
            items = [buildLegacyOperation(fallbackTarget, resolved && (resolved.result || resolved.text || ""), resolved, request, action)];
        }

        var normalized = [];
        for (var i = 0; i < items.length; i++) {
            var entry = normalizeOperation(items[i], fallbackTarget, resolved, request, action);
            if (entry) {
                normalized.push(entry);
            }
        }
        return normalized;
    }

    function getPrimaryResolvedText(resolved) {
        if (!resolved) {
            return "";
        }
        if (resolved.result) {
            return normalizeText(resolved.result);
        }
        var operations = resolved.operations || [];
        for (var i = 0; i < operations.length; i++) {
            if (operations[i] && operations[i].text) {
                return normalizeText(operations[i].text);
            }
        }
        return "";
    }

    function getPrimaryResolvedReason(resolved) {
        if (!resolved) {
            return "";
        }
        if (resolved.reason) {
            return normalizeText(resolved.reason);
        }
        var operations = resolved.operations || [];
        for (var i = 0; i < operations.length; i++) {
            if (operations[i] && operations[i].reason) {
                return normalizeText(operations[i].reason);
            }
        }
        return "";
    }

    function getOperationDisplayMeta(operation) {
        if (!operation || !operation.type) {
            return {
                title: "Unknown step",
                copy: "This AI step does not expose a known editor action yet."
            };
        }

        switch (operation.type) {
            case "open-chat-panel":
                return {
                    title: "Open AI chat",
                    copy: "Opens the docked AI chat panel for multi-turn document help."
                };
            case "open-review-panel":
                return {
                    title: "Open AI review",
                    copy: "Opens the persistent AI suggestion queue for the current editor."
                };
            case "open-dialog":
                return {
                    title: "Open review dialog",
                    copy: "Launches the Ask AI review dialog for a guided follow-up."
                };
            case "preview-suggestion":
                return {
                    title: "Preview inline suggestion",
                    copy: "Shows a reviewable inline diff in the editor before anything is committed."
                };
            case "replace-selection":
                return {
                    title: "Replace selection",
                    copy: "Updates the current selection with the generated text."
                };
            case "replace-document":
                return {
                    title: "Replace document",
                    copy: "Swaps the full editor content with the generated text."
                };
            case "insert-below":
                return {
                    title: "Insert below",
                    copy: "Adds generated content beneath the current selection or caret."
                };
            case "add-comment":
                return {
                    title: "Add AI comment",
                    copy: "Drops a non-destructive AI comment marker into the document."
                };
            default:
                return {
                    title: operation.type,
                    copy: "Custom AI operation returned by the current resolver."
                };
        }
    }

    function getOperationPlanButtonLabel(resolved) {
        var operations = resolved && resolved.operations ? resolved.operations : [];
        if (!operations.length) {
            return "Apply";
        }

        if (operations.length > 1) {
            return "Apply " + operations.length + " steps";
        }

        // 2026-05-20 (v20260520h): primary-button labels shortened to a single
        // verb where possible — "Apply inline preview" (3 words / 21 chars)
        // → "Preview" (1 word / 7 chars); "Apply to selection" → "Replace
        // selection"; "Apply to document" → "Replace document". The compound
        // "Apply <something>" phrasing read as a redundant double-verb
        // ("apply a preview?") at first glance; the single-verb form names
        // the actual effect ("Preview" / "Replace selection" / "Insert
        // below"), matching Notion AI / Tiptap / ChatGPT inline edit which
        // all label their primary by what the click DOES, not what kind of
        // action class it belongs to. Plus the shorter label leaves more
        // headroom on the apply row for the refine chips at 480px frame.
        switch (operations[0].type) {
            case "preview-suggestion":
                return "Preview";
            case "open-review-panel":
                return "Open AI review";
            case "replace-selection":
                return "Replace selection";
            case "replace-document":
                return "Replace document";
            case "insert-below":
                return "Insert below";
            case "add-comment":
                return "Add AI comment";
            case "open-chat-panel":
                return "Open AI chat";
            case "open-dialog":
                return "Open review dialog";
            default:
                return "Apply";
        }
    }

    function getSingleOperationPlanButtonLabel(operation) {
        return getOperationPlanButtonLabel({ operations: [operation] });
    }

    function getSelectionRequiredPlanButtonLabel(operations) {
        var list = operations || [];
        if (!list.length) {
            return "Select text to continue";
        }
        if (list.length > 1) {
            return "Select text to apply plan";
        }
        switch (list[0].type) {
            case "preview-suggestion":
                return "Select text to preview";
            case "replace-selection":
                return "Select text to apply to selection";
            default:
                return "Select text to continue";
        }
    }

    function getPlanOperationButtonDetail(operation, actionState) {
        if (!operation || !operation.type) {
            return "Run this prepared AI step in the editor.";
        }
        switch (operation.type) {
            case "preview-suggestion":
                return actionState && actionState.hasSelection
                    ? "Show the prepared inline diff in the editor before deciding it."
                    : "Select text to preview this prepared inline diff in the editor.";
            case "replace-selection":
                return actionState && actionState.hasSelection
                    ? "Replace the current selection with this prepared draft."
                    : "Select text before replacing it with this prepared draft.";
            case "replace-document":
                return "Replace the full document with this prepared draft.";
            case "insert-below":
                return actionState && actionState.hasSelection
                    ? "Insert this prepared draft below the current selection."
                    : "Insert this prepared draft below the current content.";
            case "add-comment":
                return "Add this prepared AI comment without rewriting the document body.";
            default:
                return "Run this prepared AI step in the editor.";
        }
    }

    function syncPlanButtonAccessibility(button, label, detail, unavailableReason) {
        if (!button) {
            return;
        }
        var parts = [label || "Action"];
        if (detail) {
            parts.push(detail);
        }
        if (unavailableReason) {
            parts.push(unavailableReason);
        }
        button.setAttribute("aria-label", parts.join(". "));
        button.title = detail
            ? (label || "Action") + " - " + detail + (unavailableReason ? " " + unavailableReason : "")
            : (label || "Action") + (unavailableReason ? " - " + unavailableReason : "");
    }

    function buildResolvedActionFromText(text, target, resolved, request, action) {
        return normalizeResolvedAction({
            operations: [buildLegacyOperation(target, text, resolved, request, action)],
            presetMode: resolved && resolved.presetMode ? resolved.presetMode : (request && request.mode ? request.mode : ""),
            useDocument: resolved && typeof resolved.useDocument === "boolean" ? resolved.useDocument : false,
            autoRun: resolved && typeof resolved.autoRun === "boolean" ? resolved.autoRun : false
        }, action, request);
    }

    function defaultResolveAction(request) {
        switch (request.mode) {
            case "proofread":
                var proofReason = "Normalizes spacing, punctuation, and capitalization while keeping the original meaning intact.";
                return {
                    operations: [
                        buildLegacyOperation(request.action && request.action.target ? request.action.target : "selection-preview", buildDemoResult("proofread", request.source), { reason: proofReason }, request, request.action)
                    ],
                    reason: proofReason
                };
            case "rewrite":
                var rewriteReason = "Tightens the wording by removing filler phrases so the point comes through faster.";
                return {
                    operations: [
                        buildLegacyOperation(request.action && request.action.target ? request.action.target : "selection-preview", buildDemoResult("rewrite", request.source), { reason: rewriteReason }, request, request.action)
                    ],
                    reason: rewriteReason
                };
            case "translate":
                // The translate action has target: "dialog" so the AI menu opens the dialog
                // preset to Translate. When the user then clicks "Ask AI" INSIDE that dialog,
                // we need a real text-producing target — a "dialog" target would just re-issue
                // open-dialog and produce no visible output.
                var translateTarget = request.action && request.action.target && request.action.target !== "dialog"
                    ? request.action.target
                    : (request.scope === "selection" ? "selection-preview" : "document");
                return {
                    operations: [
                        buildLegacyOperation(translateTarget, buildDemoResult("translate", request.source, { language: request.language }), { reason: "This prepares a translated " + getTranslateLanguageLabel(request.language || "spanish") + " draft while keeping the original text available for review." }, request, request.action)
                    ],
                    reason: "This prepares a translated " + getTranslateLanguageLabel(request.language || "spanish") + " draft while keeping the original text available for review."
                };
            case "justify":
                return {
                    operations: [
                        {
                            type: "preview-suggestion",
                            text: buildDemoResult("rewrite", request.source),
                            reason: "This rewrite reduces filler language, clarifies the main point, and makes the sentence easier to review before accepting."
                        }
                    ],
                    reason: "This rewrite reduces filler language, clarifies the main point, and makes the sentence easier to review before accepting."
                };
            case "shorten":
                var shortenReason = "Trims the passage to its core idea while keeping the original phrasing.";
                return {
                    operations: [
                        buildLegacyOperation(request.action && request.action.target ? request.action.target : "document", buildDemoResult("shorten", request.source), { reason: shortenReason }, request, request.action)
                    ],
                    reason: shortenReason
                };
            case "expand":
                var expandReason = "Adds a supporting sentence that reinforces the original point without changing its direction.";
                var expandTarget = request.action && request.action.target && request.action.id !== request.mode
                    ? request.action.target
                    : "insert";
                return {
                    operations: [
                        buildLegacyOperation(expandTarget, buildDemoResult("expand", request.source), { reason: expandReason }, request, request.action)
                    ],
                    reason: expandReason
                };
            case "summarize":
                var summarizeReason = "Condenses the content into a scannable summary that works as a recap or abstract.";
                return {
                    operations: [
                        buildLegacyOperation(request.action && request.action.target ? request.action.target : "document", buildDemoResult("summarize", request.source), { reason: summarizeReason }, request, request.action)
                    ],
                    reason: summarizeReason
                };
            case "comment":
                return {
                    operations: [
                        {
                            type: "add-comment",
                            text: buildCommentResult(request.source)
                        }
                    ]
                };
            case "paragraph":
                return {
                    operations: [
                        {
                            type: "insert-below",
                            text: buildParagraphResult(request.source)
                        }
                    ]
                };
            case "chat":
                return buildChatResolvedAction(request);
            default:
                return {
                    operations: [
                        buildLegacyOperation(request.action && request.action.target ? request.action.target : "document", buildDemoResult(request.mode || "rewrite", request.source), null, request, request.action)
                    ]
                };
        }
    }

    function normalizeResolvedAction(resolved, action, request) {
        var fallbackTarget = action && action.target ? action.target : "document";
        if (resolved == null) {
            return {
                result: "",
                target: fallbackTarget,
                operations: [],
                message: "",
                action: action,
                request: request
            };
        }

        if (typeof resolved === "string") {
            resolved = {
                operations: [buildLegacyOperation(fallbackTarget, resolved, null, request, action)]
            };
        }

        var operations = extractResolvedOperations(resolved, resolved.target || resolved.mode || fallbackTarget, request, action);
        var target = operations.length ? (operations[0].target || resolved.target || resolved.mode || fallbackTarget) : (resolved.target || resolved.mode || fallbackTarget);

        return {
            result: normalizeText(resolved.result || resolved.text || getPrimaryResolvedText({ operations: operations }) || ""),
            target: target,
            operations: operations,
            message: normalizeText(resolved.message || resolved.reply || ""),
            reason: normalizeText(resolved.reason || getPrimaryResolvedReason({ operations: operations }) || ""),
            autoRun: typeof resolved.autoRun === "boolean" ? resolved.autoRun : (action && typeof action.autoRun === "boolean" ? action.autoRun : false),
            useDocument: typeof resolved.useDocument === "boolean" ? resolved.useDocument : false,
            presetMode: resolved.presetMode || request.mode || "",
            action: action,
            request: request
        };
    }

    function resolveAction(actionId, options) {
        options = options || {};
        var action = getActionDefinition(actionId) || { id: actionId, title: actionId, target: "document" };
        var snapshot = options.snapshot || captureSelectionSnapshot();
        var request = {
            actionId: actionId,
            action: action,
            mode: options.mode || action.resolverMode || actionId,
            source: options.source || (snapshot.text || snapshot.wholeText),
            prompt: options.prompt || "",
            language: options.language || "",
            scope: options.scope || (snapshot.hasSelection ? "selection" : "document"),
            selectionText: snapshot.text || "",
            documentText: snapshot.wholeText || "",
            snapshot: snapshot,
            editor: editor,
            contract: getOperationContract()
        };

        if (typeof config.aiToolkitResolver === "function") {
            try {
                return Promise.resolve(config.aiToolkitResolver.call(editor, request)).then(function (resolved) {
                    if (resolved === null || typeof resolved === "undefined") {
                        resolved = defaultResolveAction(request);
                    }
                    return normalizeResolvedAction(resolved, action, request);
                });
            }
            catch (x) {
                return Promise.reject(x);
            }
        }

        return Promise.resolve(normalizeResolvedAction(defaultResolveAction(request), action, request));
    }

    function captureSelectionSnapshot() {
        var selection = editor.getSelection ? editor.getSelection() : null;
        var snapshot = {
            text: normalizeText(editor.getSelectedText ? editor.getSelectedText() : ""),
            html: editor.getSelectedHTML ? editor.getSelectedHTML() : "",
            wholeText: normalizeText(editor.getText ? editor.getText() : ""),
            range: null
        };

        snapshot.hasSelection = !!snapshot.text;

        if (selection && selection.rangeCount) {
            try {
                snapshot.range = selection.getRangeAt(0).cloneRange();
            }
            catch (x) {
                snapshot.range = null;
            }
        }

        return snapshot;
    }

    function isRangeUsable(range) {
        if (!range || !range.startContainer || !range.endContainer) {
            return false;
        }

        var editable = editor.getEditable ? editor.getEditable() : null;
        if (!editable) {
            return false;
        }

        var startNode = range.startContainer.nodeType === 3 ? range.startContainer.parentNode : range.startContainer;
        var endNode = range.endContainer.nodeType === 3 ? range.endContainer.parentNode : range.endContainer;
        return !!(startNode && endNode && editable.contains(startNode) && editable.contains(endNode));
    }

    function areRangesEquivalent(left, right) {
        if (!left && !right) {
            return true;
        }
        if (!isRangeUsable(left) || !isRangeUsable(right)) {
            return false;
        }

        try {
            return left.compareBoundaryPoints(left.START_TO_START, right) === 0
                && left.compareBoundaryPoints(left.END_TO_END, right) === 0;
        }
        catch (x) {
            return false;
        }
    }

    function restoreSelection(snapshot, collapseToEnd) {
        if (!snapshot || !snapshot.range || !isRangeUsable(snapshot.range)) {
            return false;
        }

        var range = snapshot.range.cloneRange();
        if (collapseToEnd) {
            range.collapse(false);
        }

        editor.focus();

        var selection = editor.getSelection ? editor.getSelection() : null;
        if (!selection) {
            return false;
        }

        if (selection.removeAllRanges) {
            selection.removeAllRanges();
        }
        else if (selection.empty) {
            selection.empty();
        }

        selection.addRange(range);
        return true;
    }

    function textToHtml(text) {
        var clean = normalizeText(text);
        if (!clean) {
            return "";
        }

        var blocks = clean.split(/\n{2,}/);
        var html = [];
        for (var i = 0; i < blocks.length; i++) {
            html.push("<p>" + editor.htmlEncode(blocks[i]).replace(/\n/g, "<br/>") + "</p>");
        }
        return html.join("");
    }

    function textToInlineHtml(text) {
        var clean = normalizeText(text);
        if (!clean) {
            return "";
        }
        return editor.htmlEncode(clean).replace(/\n/g, "<br/>");
    }

    function escapeHtml(text) {
        return editor.htmlEncode(text || "");
    }

    function escapeAttribute(text) {
        return editor.htmlEncode(text || "").replace(/\n/g, "&#10;");
    }

    function hasBlockMarkup(html) {
        return /<(p|div|h1|h2|h3|h4|h5|h6|ul|ol|li|table|thead|tbody|tr|td|th|blockquote|pre|section|article)\b/i.test(html || "");
    }

    function getSuggestionStore() {
        if (!editor.__aiSuggestions) {
            editor.__aiSuggestions = [];
        }
        return editor.__aiSuggestions;
    }

    function getReviewLogEntries() {
        if (!editor.__aiReviewLogEntries) {
            editor.__aiReviewLogEntries = [];
        }
        return editor.__aiReviewLogEntries;
    }

    function getPersistenceStorageKey() {
        if (!config.aiToolkitPersistenceKey) {
            return "";
        }
        return "RTE.AIToolkit." + config.aiToolkitPersistenceKey;
    }

    function getReviewLogDocumentKey() {
        return config.aiToolkitPersistenceKey || "";
    }

    function normalizeReviewLogEntry(raw) {
        if (!raw) {
            return null;
        }

        return {
            id: raw.id || ("log-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000)),
            documentKey: raw.documentKey || getReviewLogDocumentKey(),
            eventType: raw.eventType || "suggestion-updated",
            suggestionId: raw.suggestionId || "",
            status: raw.status || "",
            suggestionType: getSuggestionTypeValue(raw.suggestionType || ""),
            language: raw.language || "",
            sourceLabel: raw.sourceLabel || "",
            originalText: normalizeText(raw.originalText || ""),
            resultText: normalizeText(raw.resultText || ""),
            reason: normalizeText(raw.reason || ""),
            timestamp: raw.timestamp || new Date().getTime()
        };
    }

    function getReviewLogEventLabel(entry) {
        switch (entry.eventType) {
            case "suggestion-created":
                return "Created";
            case "suggestion-accepted":
                return "Accepted";
            case "suggestion-rejected":
                return "Rejected";
            case "suggestion-reopened":
                return "Reopened";
            case "suggestion-stale":
                return "Marked stale";
            default:
                return "Updated";
        }
    }

    function getReviewLogEventToneClass(entry) {
        if (!entry) {
            return "updated";
        }
        switch (entry.eventType) {
            case "suggestion-created":
                return "created";
            case "suggestion-accepted":
                return "accepted";
            case "suggestion-rejected":
                return "rejected";
            case "suggestion-reopened":
                return "reopened";
            case "suggestion-stale":
                return "stale";
            default:
                return "updated";
        }
    }

    function summarizeReviewLogEntry(entry) {
        if (!entry) {
            return "";
        }
        return getReviewLogEventLabel(entry) + " - " + (entry.sourceLabel || "AI review");
    }

    function buildReviewLogEntry(eventType, suggestion) {
        return normalizeReviewLogEntry({
            id: "log-" + suggestion.id + "-" + eventType + "-" + new Date().getTime(),
            documentKey: getReviewLogDocumentKey(),
            eventType: eventType,
            suggestionId: suggestion.id,
            status: suggestion.status || "",
            suggestionType: suggestion.suggestionType || "",
            language: suggestion.language || "",
            sourceLabel: suggestion.sourceLabel || (suggestion.snapshot && suggestion.snapshot.hasSelection ? "Selection suggestion" : "Document suggestion"),
            originalText: suggestion.originalText || "",
            resultText: suggestion.resultText || "",
            reason: suggestion.reason || "",
            timestamp: new Date().getTime()
        });
    }

    function pushReviewLogEntry(entry) {
        if (!entry) {
            return;
        }
        var items = getReviewLogEntries();
        items.unshift(entry);
        if (items.length > 30) {
            items.length = 30;
        }
    }

    function sendReviewLogRequest(method, url, body, callback) {
        if (!url || !window.XMLHttpRequest) {
            if (typeof callback === "function") {
                callback(null);
            }
            return false;
        }

        try {
            var xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            if (body) {
                xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
            }
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) {
                    return;
                }
                if (typeof callback === "function") {
                    callback(xhr);
                }
            };
            xhr.send(body || null);
            return true;
        }
        catch (ignore) {
            if (typeof callback === "function") {
                callback(null);
            }
            return false;
        }
    }

    function emitReviewLogEvent(eventType, suggestion) {
        var reviewLogUrl = config.aiToolkitReviewLogUrl || "";
        if (!reviewLogUrl || !suggestion || !getReviewLogDocumentKey()) {
            return false;
        }

        var entry = buildReviewLogEntry(eventType, suggestion);
        pushReviewLogEntry(entry);
        sendReviewLogRequest("POST", reviewLogUrl, JSON.stringify(entry), function (xhr) {
            if (!xhr || xhr.status < 200 || xhr.status >= 300) {
                console.warn("AI review log request failed");
            }
        });
        return true;
    }

    function loadReviewLogEntries(force, callback) {
        var reviewLogUrl = config.aiToolkitReviewLogUrl || "";
        var documentKey = getReviewLogDocumentKey();
        if (!reviewLogUrl || !documentKey) {
            if (typeof callback === "function") {
                callback(getReviewLogEntries().slice(), false);
            }
            return false;
        }

        if (!force && editor.__aiReviewLogLoaded) {
            if (typeof callback === "function") {
                callback(getReviewLogEntries().slice(), true);
            }
            return true;
        }

        sendReviewLogRequest("GET", reviewLogUrl + "?key=" + encodeURIComponent(documentKey), null, function (xhr) {
            var items = [];
            var ok = !!(xhr && xhr.status >= 200 && xhr.status < 300);
            if (ok) {
                try {
                    var payload = JSON.parse(xhr.responseText || "{}");
                    var entries = payload && payload.entries ? payload.entries : [];
                    for (var i = 0; i < entries.length; i++) {
                        var normalized = normalizeReviewLogEntry(entries[i]);
                        if (normalized) {
                            items.push(normalized);
                        }
                    }
                }
                catch (ignore) {
                }
            }
            editor.__aiReviewLogEntries = items;
            editor.__aiReviewLogLoaded = ok;
            if (typeof callback === "function") {
                callback(items.slice(), ok);
            }
        });
        return true;
    }

    function serializeSuggestion(suggestion) {
        return {
            id: suggestion.id,
            changeType: suggestion.changeType || "ai-preview",
            author: suggestion.author ? {
                id: suggestion.author.id || "ai",
                name: suggestion.author.name || "AI",
                color: suggestion.author.color || "#8b5cf6"
            } : { id: "ai", name: "AI", color: "#8b5cf6" },
            originalHtml: suggestion.originalHtml || "",
            originalText: suggestion.originalText || "",
            resultText: suggestion.resultText || "",
            resultHtml: suggestion.resultHtml || "",
            reason: suggestion.reason || "",
            suggestionType: suggestion.suggestionType || "",
            language: suggestion.language || "",
            isBlock: !!suggestion.isBlock,
            status: suggestion.status || "pending",
            createdAt: suggestion.createdAt || new Date().getTime(),
            decidedAt: suggestion.decidedAt || 0,
            sourceLabel: suggestion.sourceLabel || "",
            scope: suggestion.snapshot && suggestion.snapshot.hasSelection ? "selection" : "document",
            text: suggestion.text || "",
            blockPath: suggestion.blockPath || "",
            replies: Array.isArray(suggestion.replies) ? suggestion.replies : []
        };
    }

    function normalizeLedgerEntry(raw) {
        if (!raw || !raw.id) return null;
        var changeType = raw.changeType || "ai-preview";
        var author = raw.author && typeof raw.author === "object" ? raw.author : null;
        if (!author) {
            author = changeType === "ai-preview"
                ? { id: "ai", name: "AI", color: "#8b5cf6" }
                : { id: "user", name: "User", color: "#2563eb" };
        }
        return {
            id: raw.id,
            changeType: changeType,
            author: {
                id: author.id || "user",
                name: author.name || author.id || "User",
                color: author.color || "#2563eb"
            },
            originalHtml: raw.originalHtml || "",
            originalText: raw.originalText || "",
            resultText: raw.resultText || "",
            resultHtml: raw.resultHtml || "",
            reason: raw.reason || "",
            suggestionType: raw.suggestionType || "",
            language: raw.language || "",
            isBlock: !!raw.isBlock,
            status: raw.status || "pending",
            createdAt: raw.createdAt || new Date().getTime(),
            decidedAt: raw.decidedAt || 0,
            sourceLabel: raw.sourceLabel || "",
            snapshot: raw.snapshot || { hasSelection: raw.scope === "selection" },
            text: raw.text || "",
            blockPath: raw.blockPath || "",
            replies: Array.isArray(raw.replies) ? raw.replies : []
        };
    }

    function normalizePersistedSuggestion(raw) {
        if (!raw || !raw.id) {
            return null;
        }

        var changeType = raw.changeType || "ai-preview";
        var author = raw.author && typeof raw.author === "object" ? raw.author : null;
        if (!author) {
            author = changeType === "ai-preview"
                ? { id: "ai", name: "AI", color: "#8b5cf6" }
                : { id: "user", name: "User", color: "#2563eb" };
        }

        return {
            id: raw.id,
            changeType: changeType,
            author: {
                id: author.id || "user",
                name: author.name || author.id || "User",
                color: author.color || "#2563eb"
            },
            originalHtml: raw.originalHtml || textToInlineHtml(raw.originalText || ""),
            originalText: normalizeText(raw.originalText || ""),
            resultText: normalizeText(raw.resultText || ""),
            resultHtml: raw.resultHtml || textToInlineHtml(raw.resultText || ""),
            reason: normalizeText(raw.reason || ""),
            suggestionType: getSuggestionTypeValue(raw.suggestionType || ""),
            language: raw.language || "",
            isBlock: !!raw.isBlock,
            status: raw.status === "accepted" || raw.status === "rejected" || raw.status === "stale" ? raw.status : "stale",
            createdAt: raw.createdAt || new Date().getTime(),
            decidedAt: raw.decidedAt || 0,
            sourceLabel: raw.sourceLabel || (raw.scope === "selection" ? "Selection suggestion" : "Document suggestion"),
            snapshot: {
                hasSelection: raw.scope === "selection"
            },
            text: raw.text || "",
            blockPath: raw.blockPath || "",
            replies: Array.isArray(raw.replies) ? raw.replies : []
        };
    }

    function getSuggestionLedgerDocumentKey() {
        return config.aiToolkitPersistenceKey || "";
    }

    function buildSuggestionLedgerPayload() {
        return {
            version: "2026-04-18",
            documentKey: getSuggestionLedgerDocumentKey(),
            savedAt: new Date().getTime(),
            suggestions: getSuggestionStore().map(serializeSuggestion)
        };
    }

    function getSuggestionStatusRank(status) {
        switch (status) {
            case "pending":
                return 4;
            case "accepted":
                return 3;
            case "rejected":
                return 2;
            case "stale":
                return 1;
            default:
                return 0;
        }
    }

    function getSuggestionVersionStamp(suggestion) {
        return Math.max(suggestion && suggestion.decidedAt || 0, suggestion && suggestion.createdAt || 0);
    }

    function cloneSuggestionRecord(suggestion) {
        if (!suggestion) {
            return null;
        }
        return {
            id: suggestion.id,
            originalHtml: suggestion.originalHtml || "",
            originalText: suggestion.originalText || "",
            resultText: suggestion.resultText || "",
            resultHtml: suggestion.resultHtml || "",
            reason: suggestion.reason || "",
            suggestionType: suggestion.suggestionType || "",
            language: suggestion.language || "",
            isBlock: !!suggestion.isBlock,
            status: suggestion.status || "stale",
            createdAt: suggestion.createdAt || 0,
            decidedAt: suggestion.decidedAt || 0,
            sourceLabel: suggestion.sourceLabel || "",
            snapshot: {
                hasSelection: !!(suggestion.snapshot && suggestion.snapshot.hasSelection)
            }
        };
    }

    function choosePreferredSuggestion(current, candidate) {
        if (!current) {
            return cloneSuggestionRecord(candidate);
        }
        if (!candidate) {
            return current;
        }

        var currentStamp = getSuggestionVersionStamp(current);
        var candidateStamp = getSuggestionVersionStamp(candidate);
        if (candidateStamp > currentStamp) {
            return cloneSuggestionRecord(candidate);
        }
        if (candidateStamp < currentStamp) {
            return current;
        }

        if (getSuggestionStatusRank(candidate.status) > getSuggestionStatusRank(current.status)) {
            return cloneSuggestionRecord(candidate);
        }
        return current;
    }

    function mergeSuggestionStores(localSuggestions, remoteSuggestions) {
        var map = {};
        var order = [];
        var i;

        function addSuggestion(item) {
            if (!item || !item.id) {
                return;
            }
            if (!map[item.id]) {
                order.push(item.id);
            }
            map[item.id] = choosePreferredSuggestion(map[item.id], item);
        }

        for (i = 0; i < localSuggestions.length; i++) {
            addSuggestion(localSuggestions[i]);
        }
        for (i = 0; i < remoteSuggestions.length; i++) {
            addSuggestion(remoteSuggestions[i]);
        }

        var merged = [];
        for (i = 0; i < order.length; i++) {
            if (map[order[i]]) {
                merged.push(map[order[i]]);
            }
        }

        merged.sort(function (left, right) {
            return getSuggestionVersionStamp(right) - getSuggestionVersionStamp(left);
        });
        return merged;
    }

    function readPersistedSuggestionPayload() {
        var storageKey = getPersistenceStorageKey();
        var payload = "";
        if (storageKey && window.localStorage) {
            try {
                payload = window.localStorage.getItem(storageKey) || "";
            }
            catch (ignore) {
            }
        }

        if (!payload) {
            var shell = getEditorShell();
            if (shell && shell.getAttribute) {
                payload = shell.getAttribute("data-rte-ai-ledger") || "";
            }
        }
        return payload;
    }

    function sendSuggestionLedgerPayload(payload, callback) {
        var url = config.aiToolkitSuggestionLedgerUrl || "";
        if (!url || !payload || !payload.documentKey) {
            if (typeof callback === "function") {
                callback(null);
            }
            return false;
        }
        return sendReviewLogRequest("POST", url, JSON.stringify(payload), callback);
    }

    function getReviewSyncInterval() {
        var parsed = parseInt(config.aiToolkitReviewSyncInterval, 10);
        return parsed >= 5000 ? parsed : 15000;
    }

    function getReviewLastSyncedAt() {
        return editor.__aiReviewLastSyncedAt || 0;
    }

    function setReviewLastSyncedAt(timestamp) {
        editor.__aiReviewLastSyncedAt = timestamp || new Date().getTime();
    }

    function getReviewSyncState() {
        if (!editor.__aiReviewSyncState) {
            editor.__aiReviewSyncState = {
                phase: hasRemoteReviewSync() ? "idle" : "local",
                message: ""
            };
        }
        return editor.__aiReviewSyncState;
    }

    function getReviewSyncMeta() {
        if (!hasRemoteReviewSync()) {
            return {
                subtitle: "Queued AI suggestions for this session.",
                badge: "Local",
                badgeClass: "is-local",
                buttonText: "Sync now",
                buttonDisabled: true,
                syncing: false
            };
        }

        var state = getReviewSyncState();
        if (state.phase === "syncing") {
            return {
                subtitle: state.message || "Syncing shared AI review...",
                badge: "Syncing",
                badgeClass: "is-syncing",
                buttonText: "Syncing...",
                buttonDisabled: true,
                syncing: true
            };
        }

        if (state.phase === "error") {
            return {
                subtitle: state.message || "Shared AI review sync failed. Try again.",
                badge: "Retry",
                badgeClass: "is-error",
                buttonText: "Retry sync",
                buttonDisabled: false,
                syncing: false
            };
        }

        var timestamp = getReviewLastSyncedAt();
        if (!timestamp) {
            return {
                subtitle: "Shared AI review sync is ready.",
                badge: "Shared",
                badgeClass: "is-shared",
                buttonText: "Sync now",
                buttonDisabled: false,
                syncing: false
            };
        }

        var seconds = Math.max(0, Math.round((new Date().getTime() - timestamp) / 1000));
        if (seconds < 5) {
            return {
                subtitle: "Shared AI review synced just now.",
                badge: "Live",
                badgeClass: "is-live",
                buttonText: "Sync now",
                buttonDisabled: false,
                syncing: false
            };
        }
        if (seconds < 60) {
            return {
                subtitle: "Shared AI review synced " + seconds + "s ago.",
                badge: "Live",
                badgeClass: "is-live",
                buttonText: "Sync now",
                buttonDisabled: false,
                syncing: false
            };
        }
        return {
            subtitle: "Shared AI review synced " + Math.round(seconds / 60) + "m ago.",
            badge: "Live",
            badgeClass: "is-live",
            buttonText: "Sync now",
            buttonDisabled: false,
            syncing: false
        };
    }

    function setReviewSyncState(phase, message) {
        var state = getReviewSyncState();
        state.phase = phase || (hasRemoteReviewSync() ? "idle" : "local");
        state.message = message || "";
        updateReviewSyncUi();
    }

    function hasRemoteReviewSync() {
        return !!(config.aiToolkitSuggestionLedgerUrl || config.aiToolkitReviewLogUrl);
    }

    function getReviewSyncLabel() {
        return getReviewSyncMeta().subtitle;
    }

    function updateReviewSyncUi() {
        if (!editor.__aiReviewPanel || !editor.__aiReviewPanel.isConnected) {
            return false;
        }

        var meta = getReviewSyncMeta();
        if (editor.__aiReviewSubtitleNode) {
            editor.__aiReviewSubtitleNode.textContent = meta.subtitle;
        }
        if (editor.__aiReviewSyncBadgeNode) {
            editor.__aiReviewSyncBadgeNode.className = "rte-ai-review-sync-badge " + meta.badgeClass;
            editor.__aiReviewSyncBadgeNode.textContent = meta.badge;
        }
        if (editor.__aiReviewSyncButton) {
            editor.__aiReviewSyncButton.textContent = meta.buttonText;
            editor.__aiReviewSyncButton.disabled = !!meta.buttonDisabled;
            if (meta.syncing) {
                editor.__aiReviewSyncButton.setAttribute("aria-busy", "true");
            }
            else {
                editor.__aiReviewSyncButton.removeAttribute("aria-busy");
            }
        }
        return true;
    }

    function collectRemoteReviewLogEntries(previousEntries, nextEntries) {
        var seen = {};
        var fresh = [];
        var i;
        for (i = 0; i < previousEntries.length; i++) {
            if (previousEntries[i] && previousEntries[i].id) {
                seen[previousEntries[i].id] = true;
            }
        }
        for (i = 0; i < nextEntries.length; i++) {
            if (nextEntries[i] && nextEntries[i].id && !seen[nextEntries[i].id]) {
                fresh.push(nextEntries[i]);
            }
        }
        return fresh;
    }

    function registerRemoteReviewActivity(entries) {
        if (!entries || !entries.length) {
            return false;
        }
        var reviewState = getReviewState();
        reviewState.unseenRemoteActivityCount += entries.length;
        reviewState.latestRemoteActivity = entries[0];
        reviewState.latestRemoteSuggestionId = entries[0] && entries[0].suggestionId ? entries[0].suggestionId : reviewState.latestRemoteSuggestionId;
        for (var i = 0; i < entries.length; i++) {
            if (entries[i] && entries[i].suggestionId) {
                markSuggestionRemoteUpdate(entries[i].suggestionId);
            }
        }
        return true;
    }

    function sortReviewSuggestions(list) {
        return (list || []).slice().sort(function (left, right) {
            var leftRemote = getSuggestionRemoteUpdateCount(left.id);
            var rightRemote = getSuggestionRemoteUpdateCount(right.id);
            if (leftRemote !== rightRemote) {
                return rightRemote - leftRemote;
            }
            if (editor.__aiActiveSuggestionId) {
                if (left.id === editor.__aiActiveSuggestionId) {
                    return -1;
                }
                if (right.id === editor.__aiActiveSuggestionId) {
                    return 1;
                }
            }
            return getSuggestionVersionStamp(right) - getSuggestionVersionStamp(left);
        });
    }

    function applyRemoteSuggestionState() {
        var suggestions = getSuggestionStore().slice();
        var updated = false;
        for (var i = 0; i < suggestions.length; i++) {
            var suggestion = suggestions[i];
            var previewWrapper = getSuggestionWrapper(suggestion.id);
            var resolvedWrapper = getResolvedSuggestionWrapper(suggestion.id);

            if (suggestion.status === "pending") {
                if (resolvedWrapper) {
                    resolvedWrapper.outerHTML = createInlinePreviewHtml(suggestion);
                    updated = true;
                }
                continue;
            }

            if (suggestion.status === "accepted" || suggestion.status === "rejected" || suggestion.status === "stale") {
                var resolvedHtml = getResolvedSuggestionHtml(suggestion, suggestion.status);
                if (previewWrapper) {
                    previewWrapper.outerHTML = resolvedHtml;
                    updated = true;
                }
                else if (resolvedWrapper && (
                    (resolvedWrapper.getAttribute("data-rte-ai-resolved-status") || "") !== suggestion.status
                    || resolvedWrapper.innerHTML !== (suggestion.status === "accepted"
                        ? (suggestion.resultHtml || textToInlineHtml(suggestion.resultText || ""))
                        : (suggestion.originalHtml || textToInlineHtml(suggestion.originalText || "")))
                )) {
                    resolvedWrapper.outerHTML = resolvedHtml;
                    updated = true;
                }
            }
        }

        clearPreviewStateIfMissing();
        return updated;
    }

    function refreshRemoteReviewState(force, callback) {
        if (!hasRemoteReviewSync()) {
            if (typeof callback === "function") {
                callback(getSuggestionStore().slice());
            }
            return false;
        }

        if (editor.__aiReviewSyncInFlight) {
            if (typeof callback === "function") {
                if (!editor.__aiReviewSyncCallbacks) {
                    editor.__aiReviewSyncCallbacks = [];
                }
                editor.__aiReviewSyncCallbacks.push(callback);
            }
            if (force) {
                editor.__aiReviewSyncPending = true;
            }
            setReviewSyncState("syncing", "Syncing shared AI review...");
            return true;
        }

        editor.__aiReviewSyncInFlight = true;
        editor.__aiReviewSyncPending = false;
        editor.__aiReviewSyncCallbacks = typeof callback === "function" ? [callback] : [];
        setReviewSyncState("syncing", "Syncing shared AI review...");

        var remaining = 0;
        var syncedSuggestions = getSuggestionStore().slice();
        var hadFailure = false;
        var previousReviewEntries = getReviewLogEntries().slice();
        var hadReviewLogBaseline = !!editor.__aiReviewLogLoaded;

        function finish() {
            remaining--;
            if (remaining > 0) {
                return;
            }
            editor.__aiReviewSyncInFlight = false;
            if (!hadFailure) {
                setReviewLastSyncedAt(new Date().getTime());
                setReviewSyncState("idle");
            }
            else {
                setReviewSyncState("error", "Shared AI review sync failed. Showing the last known state.");
            }
            if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                renderReviewPanel(false);
            }
            var callbacks = editor.__aiReviewSyncCallbacks ? editor.__aiReviewSyncCallbacks.slice() : [];
            editor.__aiReviewSyncCallbacks = [];
            for (var c = 0; c < callbacks.length; c++) {
                callbacks[c](syncedSuggestions.slice());
            }
            if (editor.__aiReviewSyncPending) {
                editor.__aiReviewSyncPending = false;
                refreshRemoteReviewState(true);
            }
        }

        if (config.aiToolkitSuggestionLedgerUrl) {
            remaining++;
            loadRemoteSuggestionLedger(force, function (items, ok) {
                syncedSuggestions = items || getSuggestionStore().slice();
                if (!ok) {
                    hadFailure = true;
                }
                applyRemoteSuggestionState();
                finish();
            });
        }

        if (config.aiToolkitReviewLogUrl) {
            remaining++;
            loadReviewLogEntries(force, function (items, ok) {
                if (!ok) {
                    hadFailure = true;
                }
                else if (hadReviewLogBaseline) {
                    registerRemoteReviewActivity(collectRemoteReviewLogEntries(previousReviewEntries, items || []));
                }
                finish();
            });
        }

        return remaining > 0;
    }

    function loadRemoteSuggestionLedger(force, callback) {
        var url = config.aiToolkitSuggestionLedgerUrl || "";
        var documentKey = getSuggestionLedgerDocumentKey();
        if (!url || !documentKey) {
            if (typeof callback === "function") {
                callback(getSuggestionStore().slice(), false);
            }
            return false;
        }

        if (!force && editor.__aiSuggestionLedgerLoaded) {
            if (typeof callback === "function") {
                callback(getSuggestionStore().slice(), true);
            }
            return true;
        }

        sendReviewLogRequest("GET", url + "?key=" + encodeURIComponent(documentKey), null, function (xhr) {
            var remoteSuggestions = [];
            var ok = !!(xhr && xhr.status >= 200 && xhr.status < 300);
            if (ok) {
                try {
                    var payload = JSON.parse(xhr.responseText || "{}");
                    var list = payload && payload.suggestions ? payload.suggestions : [];
                    for (var i = 0; i < list.length; i++) {
                        var normalized = normalizePersistedSuggestion(list[i]);
                        if (normalized) {
                            remoteSuggestions.push(normalized);
                        }
                    }
                }
                catch (ignore) {
                }
            }

            var merged = mergeSuggestionStores(getSuggestionStore(), remoteSuggestions);
            editor.__aiSuggestions = merged;
            editor.__aiSuggestionLedgerLoaded = ok;
            persistSuggestionStore({ skipRemote: true });
            if (typeof callback === "function") {
                callback(merged.slice(), ok);
            }
        });
        return true;
    }

    function stopRemoteReviewSync() {
        if (editor.__aiReviewSyncTimer) {
            window.clearInterval(editor.__aiReviewSyncTimer);
            editor.__aiReviewSyncTimer = null;
        }
    }

    function startRemoteReviewSync() {
        if (!hasRemoteReviewSync() || editor.__aiReviewSyncTimer || !window.setInterval) {
            return false;
        }
        editor.__aiReviewSyncTimer = window.setInterval(function () {
            if (document && document.hidden) {
                return;
            }
            refreshRemoteReviewState(true);
        }, getReviewSyncInterval());
        return true;
    }

    function bindRemoteReviewSyncEvents() {
        if (editor.__aiReviewSyncEventsBound) {
            return;
        }
        editor.__aiReviewSyncEventsBound = true;

        if (document && document.addEventListener) {
            document.addEventListener("visibilitychange", function () {
                if (!document.hidden) {
                    refreshRemoteReviewState(true);
                }
            });
        }
        if (window && window.addEventListener) {
            window.addEventListener("focus", function () {
                refreshRemoteReviewState(true);
            });
        }
    }

    function persistSuggestionStore(options) {
        options = options || {};
        var payloadData = buildSuggestionLedgerPayload();
        var payload = JSON.stringify(payloadData);

        var shell = getEditorShell();
        if (shell && shell.setAttribute) {
            shell.setAttribute("data-rte-ai-ledger", payload);
        }

        var storageKey = getPersistenceStorageKey();
        if (storageKey && window.localStorage) {
            try {
                window.localStorage.setItem(storageKey, payload);
            }
            catch (ignore) {
            }
        }
        if (!options.skipRemote) {
            sendSuggestionLedgerPayload(payloadData, function (xhr) {
                if (!xhr || xhr.status < 200 || xhr.status >= 300) {
                    console.warn("AI suggestion ledger request failed");
                }
            });
        }
        return payload;
    }

    function restoreSuggestionStore() {
        var payload = readPersistedSuggestionPayload();
        if (!payload) {
            editor.__aiSuggestions = [];
            clearLastReviewDecision();
            setActiveSuggestionId(null);
            return [];
        }

        try {
            var parsed = JSON.parse(payload);
            var list = parsed && parsed.suggestions ? parsed.suggestions : [];
            var restored = [];
            for (var i = 0; i < list.length; i++) {
                var normalized = normalizePersistedSuggestion(list[i]);
                if (normalized) {
                    restored.push(normalized);
                }
            }
            editor.__aiSuggestions = restored;
            pruneReviewDecisionHistory();
            setActiveSuggestionId(null);
            return restored.slice();
        }
        catch (error) {
            editor.__aiSuggestions = [];
            clearLastReviewDecision();
            setActiveSuggestionId(null);
            return [];
        }
    }

    function clearSuggestionStore() {
        editor.__aiSuggestions = [];
        clearLastReviewDecision();
        setActiveSuggestionId(null);
        var shell = getEditorShell();
        if (shell && shell.removeAttribute) {
            shell.removeAttribute("data-rte-ai-ledger");
        }
        var storageKey = getPersistenceStorageKey();
        if (storageKey && window.localStorage) {
            try {
                window.localStorage.removeItem(storageKey);
            }
            catch (ignore) {
            }
        }
        editor.__aiSuggestionLedgerLoaded = false;
        sendSuggestionLedgerPayload({
            version: "2026-04-18",
            documentKey: getSuggestionLedgerDocumentKey(),
            savedAt: new Date().getTime(),
            suggestions: []
        }, function () { });
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(false);
        }
        return true;
    }

    function getReviewState() {
        if (!editor.__aiReviewState) {
            editor.__aiReviewState = {
                showResolved: false,
                typeFilter: "all",
                unseenRemoteActivityCount: 0,
                latestRemoteActivity: null,
                latestRemoteSuggestionId: "",
                remoteSuggestionIds: {}
            };
        }
        return editor.__aiReviewState;
    }

    function markReviewActivitySeen() {
        var reviewState = getReviewState();
        reviewState.unseenRemoteActivityCount = 0;
        reviewState.latestRemoteActivity = null;
        reviewState.latestRemoteSuggestionId = "";
        reviewState.remoteSuggestionIds = {};
    }

    function markSuggestionRemoteUpdate(suggestionId) {
        if (!suggestionId) {
            return false;
        }
        var reviewState = getReviewState();
        reviewState.remoteSuggestionIds[suggestionId] = (reviewState.remoteSuggestionIds[suggestionId] || 0) + 1;
        return true;
    }

    function clearSuggestionRemoteUpdate(suggestionId) {
        var reviewState = getReviewState();
        if (suggestionId && reviewState.remoteSuggestionIds[suggestionId]) {
            delete reviewState.remoteSuggestionIds[suggestionId];
            return true;
        }
        return false;
    }

    function getSuggestionRemoteUpdateCount(suggestionId) {
        var reviewState = getReviewState();
        return suggestionId ? (reviewState.remoteSuggestionIds[suggestionId] || 0) : 0;
    }

    function getLatestRemoteSuggestionId() {
        return getReviewState().latestRemoteSuggestionId || "";
    }

    function getReviewActivityNotice() {
        var reviewState = getReviewState();
        if (!reviewState.unseenRemoteActivityCount) {
            return null;
        }

        var latestEntry = reviewState.latestRemoteActivity;
        var count = reviewState.unseenRemoteActivityCount;
        return {
            count: count,
            title: count === 1 ? "1 shared review update just arrived." : count + " shared review updates just arrived.",
            detail: latestEntry ? summarizeReviewLogEntry(latestEntry) : "Shared AI review activity is newer than your local view."
        };
    }

    function findSuggestionById(suggestionId) {
        var suggestions = getSuggestionStore();
        for (var i = 0; i < suggestions.length; i++) {
            if (suggestions[i].id === suggestionId) {
                return suggestions[i];
            }
        }
        return null;
    }

    function getSuggestionWrapper(suggestionId) {
        var editable = editor.getEditable ? editor.getEditable() : null;
        return editable ? editable.querySelector("[data-rte-ai-suggestion-id=\"" + suggestionId + "\"]") : null;
    }

    function getResolvedSuggestionWrapper(suggestionId) {
        var editable = editor.getEditable ? editor.getEditable() : null;
        return editable ? editable.querySelector("[data-rte-ai-resolved-id=\"" + suggestionId + "\"]") : null;
    }

    function getResolvedSuggestionHtml(suggestion, statusOverride) {
        if (!suggestion) {
            return "";
        }
        var status = statusOverride || suggestion.status || "accepted";
        var wrapperTag = suggestion.isBlock ? "div" : "span";
        var innerHtml = status === "accepted"
            ? (suggestion.resultHtml || textToInlineHtml(suggestion.resultText || ""))
            : (suggestion.originalHtml || textToInlineHtml(suggestion.originalText || ""));
        return "<" + wrapperTag + " class=\"rte-ai-resolved-suggestion is-" + escapeAttribute(status) + (suggestion.isBlock ? " is-block" : " is-inline") + "\" data-rte-ai-resolved-id=\"" + escapeAttribute(suggestion.id) + "\" data-rte-ai-resolved-status=\"" + escapeAttribute(status) + "\">"
            + innerHtml
            + "</" + wrapperTag + ">";
    }

    function getReviewDecisionHistory() {
        if (!editor.__aiReviewDecisionHistory) {
            editor.__aiReviewDecisionHistory = [];
        }
        return editor.__aiReviewDecisionHistory;
    }

    function pruneReviewDecisionHistory() {
        var history = getReviewDecisionHistory();
        for (var i = history.length - 1; i >= 0; i--) {
            var decision = history[i];
            var suggestion = decision && decision.suggestionId ? findSuggestionById(decision.suggestionId) : null;
            if (!suggestion || suggestion.status !== decision.status) {
                history.splice(i, 1);
            }
        }
        return history;
    }

    function getLastReviewDecision() {
        var history = getReviewDecisionHistory();
        return history.length ? history[history.length - 1] : null;
    }

    function setLastReviewDecision(suggestion, status, options) {
        options = options || {};
        if (!suggestion || !suggestion.id || !status) {
            clearLastReviewDecision();
            return null;
        }
        if (options.clearRedo !== false) {
            clearRedoReviewDecision();
        }
        var history = getReviewDecisionHistory();
        history.push({
            suggestionId: suggestion.id,
            status: status,
            timestamp: new Date().getTime()
        });
        if (history.length > 12) {
            history.splice(0, history.length - 12);
        }
        return history[history.length - 1];
    }

    function popLastReviewDecision() {
        var history = getReviewDecisionHistory();
        return history.length ? history.pop() : null;
    }

    function getReviewRedoHistory() {
        if (!editor.__aiReviewRedoHistory) {
            editor.__aiReviewRedoHistory = [];
        }
        return editor.__aiReviewRedoHistory;
    }

    function pushRedoReviewDecision(suggestion, status) {
        if (!suggestion || !suggestion.id || !status) {
            return null;
        }
        var history = getReviewRedoHistory();
        history.push({
            suggestionId: suggestion.id,
            status: status,
            timestamp: new Date().getTime()
        });
        if (history.length > 12) {
            history.splice(0, history.length - 12);
        }
        return history[history.length - 1];
    }

    function popRedoReviewDecision() {
        var history = getReviewRedoHistory();
        return history.length ? history.pop() : null;
    }

    function clearRedoReviewDecision() {
        editor.__aiReviewRedoHistory = [];
    }

    function clearLastReviewDecision() {
        editor.__aiReviewDecisionHistory = [];
        clearRedoReviewDecision();
    }

    function getUndoableReviewDecision() {
        var history = getReviewDecisionHistory();
        while (history.length) {
            var decision = history[history.length - 1];
            if (!decision || !decision.suggestionId) {
                history.pop();
                continue;
            }
            var suggestion = findSuggestionById(decision.suggestionId);
            var wrapper = getResolvedSuggestionWrapper(decision.suggestionId);
            if (!suggestion || !wrapper || suggestion.status !== decision.status) {
                history.pop();
                continue;
            }
            return {
                suggestion: suggestion,
                wrapper: wrapper,
                status: decision.status,
                timestamp: decision.timestamp || 0,
                historyCount: history.length,
                remainingCount: history.length - 1
            };
        }
        return null;
    }

    function getRedoableReviewDecision() {
        var history = getReviewRedoHistory();
        while (history.length) {
            var decision = history[history.length - 1];
            if (!decision || !decision.suggestionId) {
                history.pop();
                continue;
            }
            var suggestion = findSuggestionById(decision.suggestionId);
            var wrapper = getSuggestionWrapper(decision.suggestionId);
            if (!suggestion || !wrapper || suggestion.status !== "pending") {
                history.pop();
                continue;
            }
            return {
                suggestion: suggestion,
                wrapper: wrapper,
                status: decision.status,
                timestamp: decision.timestamp || 0,
                historyCount: history.length,
                remainingCount: history.length - 1
            };
        }
        return null;
    }

    function getUndoDecisionContext(undoable) {
        undoable = undoable || getUndoableReviewDecision();
        if (!undoable || !undoable.suggestion) {
            return {
                actionLabel: "Undo last",
                shortcutLabel: "undo last",
                decisionLabel: "last",
                typeLabel: "",
                detailLabel: "last suggestion",
                summaryText: ""
            };
        }
        var suggestion = undoable.suggestion;
        var statusLabel = undoable.status === "rejected"
            ? "rejected"
            : undoable.status === "accepted"
                ? "accepted"
                : "resolved";
        var suggestionTypeLabel = suggestion.suggestionType && suggestion.suggestionType !== "other"
            ? getSuggestionTypeLabel(suggestion.suggestionType).toLowerCase()
            : "";
        return {
            actionLabel: "Undo " + statusLabel + (suggestionTypeLabel ? " " + suggestionTypeLabel : "") + (undoable.remainingCount ? " (" + undoable.remainingCount + " more)" : ""),
            shortcutLabel: "undo " + statusLabel,
            decisionLabel: statusLabel,
            typeLabel: suggestionTypeLabel,
            detailLabel: statusLabel + " " + (suggestionTypeLabel ? suggestionTypeLabel + " " : "") + "suggestion",
            summaryText: summarizeSuggestionText(suggestion.originalText || suggestion.resultText || "suggestion", 72),
            remainingCount: undoable.remainingCount || 0
        };
    }

    function buildUndoDecisionSummaryText(undoable) {
        var undoContext = getUndoDecisionContext(undoable);
        if (!undoable || !undoable.suggestion) {
            return "";
        }
        return "Undo target: " + undoContext.detailLabel + (undoContext.summaryText ? " - " + undoContext.summaryText : "") + (undoContext.remainingCount ? ". " + undoContext.remainingCount + " earlier undo" + (undoContext.remainingCount === 1 ? " remains." : "s remain.") : "");
    }

    function buildRedoDecisionSummaryText(redoable) {
        var redoContext = getRedoDecisionContext(redoable);
        if (!redoable || !redoable.suggestion) {
            return "";
        }
        return "Redo target: " + redoContext.detailLabel + (redoContext.summaryText ? " - " + redoContext.summaryText : "") + (redoContext.remainingCount ? ". " + redoContext.remainingCount + " earlier redo" + (redoContext.remainingCount === 1 ? " remains." : "s remain.") : "");
    }

    function getRedoDecisionContext(redoable) {
        redoable = redoable || getRedoableReviewDecision();
        if (!redoable || !redoable.suggestion) {
            return {
                actionLabel: "Redo last",
                shortcutLabel: "redo last",
                decisionLabel: "last",
                detailLabel: "last suggestion",
                summaryText: "",
                remainingCount: 0
            };
        }
        var suggestion = redoable.suggestion;
        var statusLabel = redoable.status === "rejected"
            ? "rejected"
            : redoable.status === "accepted"
                ? "accepted"
                : "resolved";
        var suggestionTypeLabel = suggestion.suggestionType && suggestion.suggestionType !== "other"
            ? getSuggestionTypeLabel(suggestion.suggestionType).toLowerCase()
            : "";
        return {
            actionLabel: "Redo " + statusLabel + (suggestionTypeLabel ? " " + suggestionTypeLabel : "") + (redoable.remainingCount ? " (" + redoable.remainingCount + " more)" : ""),
            shortcutLabel: "redo " + statusLabel,
            decisionLabel: statusLabel,
            detailLabel: statusLabel + " " + (suggestionTypeLabel ? suggestionTypeLabel + " " : "") + "suggestion",
            summaryText: summarizeSuggestionText(suggestion.originalText || suggestion.resultText || "suggestion", 72),
            remainingCount: redoable.remainingCount || 0
        };
    }

    function getUndoDecisionHistorySummaries(limit) {
        var history = getReviewDecisionHistory();
        var summaries = [];
        var maxCount = typeof limit === "number" ? limit : 3;
        for (var i = history.length - 2; i >= 0 && summaries.length < maxCount; i--) {
            var decision = history[i];
            if (!decision || !decision.suggestionId) {
                continue;
            }
            var suggestion = findSuggestionById(decision.suggestionId);
            var wrapper = getResolvedSuggestionWrapper(decision.suggestionId);
            if (!suggestion || !wrapper || suggestion.status !== decision.status) {
                continue;
            }
            var undoable = {
                suggestion: suggestion,
                wrapper: wrapper,
                status: decision.status,
                timestamp: decision.timestamp || 0,
                historyCount: i + 1,
                remainingCount: i
            };
            var undoContext = getUndoDecisionContext(undoable);
            summaries.push({
                label: undoContext.actionLabel,
                detail: buildUndoDecisionSummaryText(undoable)
            });
        }
        return summaries;
    }

    function getRedoDecisionHistorySummaries(limit) {
        var history = getReviewRedoHistory();
        var summaries = [];
        var maxCount = typeof limit === "number" ? limit : 3;
        for (var i = history.length - 2; i >= 0 && summaries.length < maxCount; i--) {
            var decision = history[i];
            if (!decision || !decision.suggestionId) {
                continue;
            }
            var suggestion = findSuggestionById(decision.suggestionId);
            var wrapper = getSuggestionWrapper(decision.suggestionId);
            if (!suggestion || !wrapper || suggestion.status !== "pending") {
                continue;
            }
            var redoable = {
                suggestion: suggestion,
                wrapper: wrapper,
                status: decision.status,
                timestamp: decision.timestamp || 0,
                historyCount: i + 1,
                remainingCount: i
            };
            var redoContext = getRedoDecisionContext(redoable);
            summaries.push({
                label: redoContext.actionLabel,
                detail: redoContext.detailLabel + (redoContext.summaryText ? " - " + redoContext.summaryText : "")
            });
        }
        return summaries;
    }

    function appendReviewItemRecoveryHistory(item, historyItems, mode) {
        if (!item || !historyItems || !historyItems.length) {
            return null;
        }
        var history = append(item, "div", "", "rte-ai-review-item-history" + (mode ? " is-" + mode : ""));
        append(history, "div", "", "rte-ai-review-item-history-title", "Then");
        for (var i = 0; i < historyItems.length; i++) {
            var historyItem = historyItems[i];
            var row = append(history, "div", "", "rte-ai-review-item-history-item");
            append(row, "div", "", "rte-ai-review-item-history-label", historyItem.label);
            append(row, "div", "", "rte-ai-review-item-history-detail", historyItem.detail);
        }
        return history;
    }

    function ensureReviewRecoveryNodeId(node, prefix, suggestionId) {
        if (!node || !node.setAttribute) {
            return "";
        }
        if (node.id) {
            return node.id;
        }
        var safeSuggestionId = String(suggestionId || "item").replace(/[^A-Za-z0-9\-_:.]/g, "-");
        node.id = "rte-ai-review-" + prefix + "-" + safeSuggestionId;
        return node.id;
    }

    function focusInlineSuggestionWrapper(wrapper) {
        if (!wrapper || !wrapper.focus) {
            return false;
        }
        try {
            wrapper.focus({ preventScroll: true });
            return true;
        }
        catch (error) {
            try {
                wrapper.focus();
                return true;
            }
            catch (innerError) {
                return false;
            }
        }
    }

    function focusInlineSuggestionActionButton(wrapper, actionName) {
        if (!wrapper || !actionName || !wrapper.querySelector) {
            return false;
        }
        var actionButton = wrapper.querySelector('[data-rte-ai-action="' + actionName + '"]');
        if (actionButton && !actionButton.disabled && actionButton.focus) {
            try {
                actionButton.focus({ preventScroll: true });
                return true;
            }
            catch (error) {
                try {
                    actionButton.focus();
                    return true;
                }
                catch (innerError) {
                }
            }
        }
        return false;
    }

    function focusInlineSuggestionAction(suggestionId, actionName) {
        if (!suggestionId) {
            return false;
        }
        var wrapper = getSuggestionWrapper(suggestionId);
        if (!wrapper) {
            return false;
        }
        if (focusInlineSuggestionActionButton(wrapper, actionName)) {
            return true;
        }
        return focusInlineSuggestionWrapper(wrapper);
    }

    function getDefaultInlineReviewActionName(suggestion) {
        if (!suggestion) {
            return "";
        }
        var redoable = getRedoableReviewDecision();
        if (suggestion.status === "pending" && redoable && redoable.suggestion && redoable.suggestion.id === suggestion.id) {
            return "redo";
        }
        return suggestion.status === "pending" ? "accept" : "review";
    }

    function focusDefaultInlineReviewAction(suggestionId, preferredAction) {
        var suggestion = findSuggestionById(suggestionId);
        if (!suggestion) {
            return false;
        }
        var wrapper = getSuggestionWrapper(suggestionId);
        var defaultInlineAction = getDefaultInlineReviewActionName(suggestion);
        var focusAction = preferredAction || defaultInlineAction;
        if (wrapper) {
            if (focusInlineSuggestionActionButton(wrapper, focusAction)) {
                return true;
            }
            if (defaultInlineAction && defaultInlineAction !== focusAction && focusInlineSuggestionActionButton(wrapper, defaultInlineAction)) {
                return true;
            }
        }
        var panelFocusAction = defaultInlineAction && defaultInlineAction !== focusAction
            ? defaultInlineAction
            : focusAction;
        return activateReviewSuggestion(suggestionId, {
            focusPanel: true,
            focusAction: panelFocusAction === "review" ? "" : panelFocusAction
        });
    }

    function syncInlineSuggestionRemoteChip(wrapper, remoteChip, sharedUpdateCount, anchorNode) {
        if (!wrapper) {
            return null;
        }
        if (!sharedUpdateCount) {
            if (remoteChip && remoteChip.parentNode) {
                remoteChip.parentNode.removeChild(remoteChip);
            }
            return null;
        }

        if (!remoteChip) {
            remoteChip = document.createElement("span");
            remoteChip.className = "rte-ai-inline-preview-remote";
        }

        remoteChip.textContent = sharedUpdateCount > 1 ? sharedUpdateCount + " shared updates" : "Shared update";
        remoteChip.setAttribute("aria-label", "Shared AI review updates");

        var referenceNode = anchorNode && anchorNode.parentNode === wrapper ? anchorNode : (wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-actions") : null);
        if (referenceNode && referenceNode.parentNode === wrapper) {
            if (referenceNode.nextSibling !== remoteChip) {
                if (referenceNode.nextSibling) {
                    wrapper.insertBefore(remoteChip, referenceNode.nextSibling);
                }
                else {
                    wrapper.appendChild(remoteChip);
                }
            }
        }
        else if (remoteChip.parentNode !== wrapper) {
            wrapper.appendChild(remoteChip);
        }

        return remoteChip;
    }

    function updateActiveSuggestionDecorations() {
        if (editor.__aiBindInlinePreviewEventHandlers) {
            editor.__aiBindInlinePreviewEventHandlers();
        }
        var editable = editor.getEditable ? editor.getEditable() : null;
        if (!editable || !editable.querySelectorAll) {
            return false;
        }

        var wrappers = editable.querySelectorAll("[data-rte-ai-suggestion-id]");
        var undoableInlineDecision = getUndoableReviewDecision();
        var redoableInlineDecision = getRedoableReviewDecision();
        for (var i = 0; i < wrappers.length; i++) {
            var suggestionId = wrappers[i].getAttribute("data-rte-ai-suggestion-id") || "";
            var suggestion = findSuggestionById(suggestionId);
            var currentChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-current") : null;
            var openedChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-opened") : null;
            var typeChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-type") : null;
            var languageChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-language") : null;
            var scopeChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-scope") : null;
            var remoteChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-remote") : null;
            var queueChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-queue") : null;
            var transitionChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-transition") : null;
            var followupChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-followup") : null;
            var glanceNode = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-glance") : null;
            var reasonNode = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-reason") : null;
            var planNode = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-plan") : null;
            var undoChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-undo") : null;
            var undoNextChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-undo-next") : null;
            var redoChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-redo") : null;
            var redoNextChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-redo-next") : null;
            var shortcutsChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-shortcuts") : null;
            var launchChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-launch") : null;
            var focusChip = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-focus") : null;
            var reviewButton = wrappers[i].querySelector ? wrappers[i].querySelector("[data-rte-ai-action=\"review\"]") : null;
            var previousButton = wrappers[i].querySelector ? wrappers[i].querySelector("[data-rte-ai-action=\"previous\"]") : null;
            var nextButton = wrappers[i].querySelector ? wrappers[i].querySelector("[data-rte-ai-action=\"next\"]") : null;
            var acceptButton = wrappers[i].querySelector ? wrappers[i].querySelector("[data-rte-ai-action=\"accept\"]") : null;
            var rejectButton = wrappers[i].querySelector ? wrappers[i].querySelector("[data-rte-ai-action=\"reject\"]") : null;
            var undoButton = wrappers[i].querySelector ? wrappers[i].querySelector("[data-rte-ai-action=\"undo\"]") : null;
            var redoButton = wrappers[i].querySelector ? wrappers[i].querySelector("[data-rte-ai-action=\"redo\"]") : null;
            var sharedSeenButton = wrappers[i].querySelector ? wrappers[i].querySelector("[data-rte-ai-action=\"shared-seen\"]") : null;
            var sharedUpdateCount = getSuggestionRemoteUpdateCount(suggestionId);
            var isPreviewTarget = !!(editor.__aiReviewEmptyPreviewSuggestionId && suggestionId === editor.__aiReviewEmptyPreviewSuggestionId);
            var isQueueOpened = !!(!isPreviewTarget && editor.__aiRecentlyOpenedQueueSuggestionId && suggestionId === editor.__aiRecentlyOpenedQueueSuggestionId);
            var undoInlineContext = !isPreviewTarget && undoableInlineDecision ? getUndoDecisionContext(undoableInlineDecision) : null;
            var undoInlineSummaryText = !isPreviewTarget && undoableInlineDecision ? buildUndoDecisionSummaryText(undoableInlineDecision) : "";
            var undoInlineHistoryItems = !isPreviewTarget ? getUndoDecisionHistorySummaries(1) : [];
            var undoInlineNextItem = undoInlineHistoryItems.length ? undoInlineHistoryItems[0] : null;
            var isRedoTarget = !!(!isPreviewTarget && redoableInlineDecision && redoableInlineDecision.suggestion && redoableInlineDecision.suggestion.id === suggestionId && suggestion && suggestion.status === "pending");
            var redoInlineContext = isRedoTarget ? getRedoDecisionContext(redoableInlineDecision) : null;
            var redoInlineSummaryText = isRedoTarget ? buildRedoDecisionSummaryText(redoableInlineDecision) : "";
            var redoInlineHistoryItems = isRedoTarget ? getRedoDecisionHistorySummaries(1) : [];
            var redoInlineNextItem = redoInlineHistoryItems.length ? redoInlineHistoryItems[0] : null;
            var queueFocusLabel = isPreviewTarget ? getReviewFocusActionDisplayLabel(suggestion, getPreferredReviewActionFocus()) : "";
            var reviewFocusLabel = getReviewFocusActionDisplayLabel(suggestion, getPreferredReviewActionFocus()) || getReviewFocusActionDisplayLabel(suggestion, "");
            var reviewLabel = isPreviewTarget
                ? "Open this AI review queue" + (reviewFocusLabel ? " and focus " + reviewFocusLabel : "")
                : "Open this AI suggestion in review" + (reviewFocusLabel ? " and focus " + reviewFocusLabel : "");
            var typeFilter = getInlineReviewTypeFilter(suggestionId);
            var pendingPosition = !isPreviewTarget ? getPendingSuggestionPosition(typeFilter, suggestionId) : { index: 0, total: 0 };
            var filteredPendingSuggestions = !isPreviewTarget ? getFilteredPendingSuggestions(typeFilter) : [];
            var queuePositionData = !isPreviewTarget ? buildReviewQueuePositionData(filteredPendingSuggestions, editor.__aiActiveSuggestionId, suggestion) : null;
            var queueTransitionData = !isPreviewTarget ? buildReviewQueueTransitionData(filteredPendingSuggestions, editor.__aiActiveSuggestionId, suggestion) : null;
            var glanceData = !isPreviewTarget ? buildReviewChangeGlanceData(suggestion) : null;
            var compareGlanceData = !isPreviewTarget ? buildInlinePreviewCompareGlanceData(glanceData) : null;
            var reasonText = buildCompletionPreviewReason(suggestion);
            var previousSuggestionId = !isPreviewTarget ? getPreviousInlineReviewSuggestionId(suggestionId) : "";
            var nextSuggestionId = !isPreviewTarget ? getNextInlineReviewSuggestionId(suggestionId) : "";
            var previousLabel = previousSuggestionId ? "Previous AI review item" : "No previous AI review item in the current queue";
            var nextLabel = nextSuggestionId ? "Next AI review item" : "No next AI review item in the current queue";
            if (editor.__aiActiveSuggestionId && suggestionId === editor.__aiActiveSuggestionId) {
                wrappers[i].classList.add("is-review-active");
                wrappers[i].classList.toggle("is-review-preview", isPreviewTarget);
                wrappers[i].classList.toggle("is-queue-opened", isQueueOpened);
                if (isPreviewTarget) {
                    wrappers[i].setAttribute("role", "button");
                    wrappers[i].removeAttribute("aria-current");
                    wrappers[i].setAttribute("aria-keyshortcuts", "Enter Space");
                    wrappers[i].setAttribute("tabindex", "0");
                    wrappers[i].title = getSuggestionQueueActionTitle(suggestion);
                }
                else {
                    wrappers[i].setAttribute("role", "group");
                    wrappers[i].setAttribute("aria-current", "step");
                    wrappers[i].setAttribute("aria-keyshortcuts", (sharedUpdateCount ? "ArrowLeft ArrowRight Home End J K A R G Enter Space" : "ArrowLeft ArrowRight Home End J K A R Enter Space") + (undoInlineContext ? " U" : "") + (isRedoTarget ? " Shift+U" : ""));
                    wrappers[i].setAttribute("tabindex", "0");
                    wrappers[i].title = getInlineReviewWrapperShortcutTitle({
                        suggestion: suggestion,
                        sharedUpdateCount: sharedUpdateCount,
                        undoInlineContext: undoInlineContext,
                        redoInlineContext: redoInlineContext
                    });
                }
                var acceptActionPresentation = getPendingReviewActionPresentation(suggestion, "accept", typeFilter) || { text: "Accept", label: "Accept this AI change" };
                var rejectActionPresentation = getPendingReviewActionPresentation(suggestion, "reject", typeFilter) || { text: "Reject", label: "Reject this AI change" };
                var acceptLabel = acceptActionPresentation.label;
                var rejectLabel = rejectActionPresentation.label;
                var undoLabel = undoInlineSummaryText || "Undo the last AI review decision";
                var redoLabel = redoInlineSummaryText || "Redo the last AI review decision";
                var inlineButtonShortcutOptions = {
                    isPreviewTarget: isPreviewTarget,
                    sharedUpdateCount: sharedUpdateCount,
                    undoInlineContext: undoInlineContext,
                    redoInlineContext: redoInlineContext
                };
                updateInlineReviewActionButtonState(reviewButton, isPreviewTarget ? "Open queue" : "Review", reviewLabel);
                updateInlineReviewButtonState(previousButton, !previousSuggestionId, previousLabel);
                updateInlineReviewButtonState(nextButton, !nextSuggestionId, nextLabel);
                updateInlineReviewActionButtonState(acceptButton, acceptActionPresentation.text, acceptLabel);
                updateInlineReviewActionButtonState(rejectButton, rejectActionPresentation.text, rejectLabel);
                applyInlineReviewButtonShortcutState(reviewButton, reviewLabel, inlineButtonShortcutOptions);
                applyInlineReviewButtonShortcutState(previousButton, previousLabel, inlineButtonShortcutOptions);
                applyInlineReviewButtonShortcutState(nextButton, nextLabel, inlineButtonShortcutOptions);
                applyInlineReviewButtonShortcutState(acceptButton, acceptLabel, inlineButtonShortcutOptions);
                applyInlineReviewButtonShortcutState(rejectButton, rejectLabel, inlineButtonShortcutOptions);
                var actionsNodeForRecoveryState = getInlinePreviewActionContainer(wrappers[i], "recovery");
                if (undoInlineContext) {
                    if (!undoButton) {
                        undoButton = document.createElement("button");
                        undoButton.type = "button";
                        undoButton.className = "rte-ai-inline-preview-button is-undo";
                        undoButton.setAttribute("data-rte-ai-action", "undo");
                        if (actionsNodeForRecoveryState) {
                            actionsNodeForRecoveryState.appendChild(undoButton);
                        }
                    }
                    updateInlineReviewActionButtonState(undoButton, undoInlineContext.actionLabel, undoLabel);
                    applyInlineReviewButtonShortcutState(undoButton, undoLabel, inlineButtonShortcutOptions);
                }
                else if (undoButton && undoButton.parentNode) {
                    undoButton.parentNode.removeChild(undoButton);
                    undoButton = null;
                }
                if (isRedoTarget && redoInlineContext) {
                    if (!redoButton) {
                        redoButton = document.createElement("button");
                        redoButton.type = "button";
                        redoButton.className = "rte-ai-inline-preview-button is-redo";
                        redoButton.setAttribute("data-rte-ai-action", "redo");
                        if (actionsNodeForRecoveryState) {
                            actionsNodeForRecoveryState.appendChild(redoButton);
                        }
                    }
                    updateInlineReviewActionButtonState(redoButton, redoInlineContext.actionLabel, redoLabel);
                    applyInlineReviewButtonShortcutState(redoButton, redoLabel, inlineButtonShortcutOptions);
                }
                else if (redoButton && redoButton.parentNode) {
                    redoButton.parentNode.removeChild(redoButton);
                    redoButton = null;
                }
                if (!currentChip) {
                    currentChip = document.createElement("span");
                    currentChip.className = "rte-ai-inline-preview-current";
                    var actionsNode = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-actions") : null;
                    if (actionsNode && actionsNode.nextSibling) {
                        wrappers[i].insertBefore(currentChip, actionsNode.nextSibling);
                    }
                    else {
                        wrappers[i].appendChild(currentChip);
                    }
                }
                currentChip.classList.toggle("is-preview-target", isPreviewTarget);
                currentChip.textContent = isPreviewTarget ? "Next queue" : "Current";
                currentChip.setAttribute("aria-label", isPreviewTarget ? "Next AI review queue target" : "Current AI review item");
                if (isQueueOpened) {
                    if (!openedChip) {
                        openedChip = document.createElement("span");
                        openedChip.className = "rte-ai-inline-preview-opened";
                        if (currentChip && currentChip.nextSibling) {
                            wrappers[i].insertBefore(openedChip, currentChip.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(openedChip);
                        }
                    }
                    openedChip.textContent = "Queue opened";
                    openedChip.setAttribute("aria-label", "AI review queue opened");
                }
                else if (openedChip && openedChip.parentNode) {
                    openedChip.parentNode.removeChild(openedChip);
                }
                if (isPreviewTarget) {
                    if (!launchChip) {
                        launchChip = document.createElement("span");
                        launchChip.className = "rte-ai-inline-preview-launch";
                        if (currentChip && currentChip.nextSibling) {
                            wrappers[i].insertBefore(launchChip, currentChip.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(launchChip);
                        }
                    }
                    launchChip.textContent = getSuggestionQueueActionLabel(suggestion);
                    launchChip.setAttribute("aria-hidden", "true");
                    if (queueFocusLabel) {
                        if (!focusChip) {
                            focusChip = document.createElement("span");
                            focusChip.className = "rte-ai-inline-preview-focus";
                            var focusAnchor = launchChip || currentChip;
                            if (focusAnchor && focusAnchor.nextSibling) {
                                wrappers[i].insertBefore(focusChip, focusAnchor.nextSibling);
                            }
                            else {
                                wrappers[i].appendChild(focusChip);
                            }
                        }
                        focusChip.textContent = "Focus " + queueFocusLabel;
                        focusChip.setAttribute("aria-label", "Queue opens on " + queueFocusLabel);
                    }
                    else if (focusChip && focusChip.parentNode) {
                        focusChip.parentNode.removeChild(focusChip);
                    }
                }
                else {
                    if (launchChip && launchChip.parentNode) {
                        launchChip.parentNode.removeChild(launchChip);
                    }
                    if (focusChip && focusChip.parentNode) {
                        focusChip.parentNode.removeChild(focusChip);
                    }
                }
                if (suggestion && suggestion.suggestionType && getSuggestionTypeValue(suggestion.suggestionType) !== "other") {
                    if (!typeChip) {
                        typeChip = document.createElement("span");
                        typeChip.className = "rte-ai-inline-preview-type";
                        if (currentChip && currentChip.nextSibling) {
                            wrappers[i].insertBefore(typeChip, currentChip.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(typeChip);
                        }
                    }
                    typeChip.textContent = getSuggestionTypeLabel(suggestion.suggestionType);
                    typeChip.setAttribute("aria-label", "AI suggestion type");
                }
                else if (typeChip && typeChip.parentNode) {
                    typeChip.parentNode.removeChild(typeChip);
                }
                if (suggestion && suggestion.language) {
                    if (!languageChip) {
                        languageChip = document.createElement("span");
                        languageChip.className = "rte-ai-inline-preview-language";
                        var languageAnchor = typeChip || currentChip;
                        if (languageAnchor && languageAnchor.nextSibling) {
                            wrappers[i].insertBefore(languageChip, languageAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(languageChip);
                        }
                    }
                    languageChip.textContent = getTranslateLanguageLabel(suggestion.language);
                    languageChip.setAttribute("aria-label", "AI suggestion language");
                }
                else if (languageChip && languageChip.parentNode) {
                    languageChip.parentNode.removeChild(languageChip);
                }
                var scopeLabel = getSuggestionScopeLabel(suggestion);
                if (scopeLabel) {
                    if (!scopeChip) {
                        scopeChip = document.createElement("span");
                        scopeChip.className = "rte-ai-inline-preview-scope";
                        var scopeAnchor = languageChip || typeChip || currentChip;
                        if (scopeAnchor && scopeAnchor.nextSibling) {
                            wrappers[i].insertBefore(scopeChip, scopeAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(scopeChip);
                        }
                    }
                    scopeChip.textContent = scopeLabel;
                    scopeChip.setAttribute("aria-label", "AI suggestion scope");
                }
                else if (scopeChip && scopeChip.parentNode) {
                    scopeChip.parentNode.removeChild(scopeChip);
                }
                remoteChip = syncInlineSuggestionRemoteChip(
                    wrappers[i],
                    remoteChip,
                    sharedUpdateCount,
                    scopeChip || languageChip || typeChip || currentChip || (wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-actions") : null)
                );
                var actionsNodeForSharedState = getInlinePreviewActionContainer(wrappers[i], "recovery");
                if (sharedUpdateCount) {
                    if (!sharedSeenButton) {
                        sharedSeenButton = document.createElement("button");
                        sharedSeenButton.type = "button";
                        sharedSeenButton.className = "rte-ai-inline-preview-button is-shared";
                        sharedSeenButton.setAttribute("data-rte-ai-action", "shared-seen");
                        if (actionsNodeForSharedState) {
                            actionsNodeForSharedState.appendChild(sharedSeenButton);
                        }
                    }
                    sharedSeenButton.textContent = "Got it";
                    sharedSeenButton.setAttribute("aria-label", "Clear shared AI review update notice");
                    sharedSeenButton.title = "Clear shared AI review update notice";
                    applyInlineReviewButtonShortcutState(sharedSeenButton, "Clear shared AI review update notice", inlineButtonShortcutOptions);
                }
                else if (sharedSeenButton && sharedSeenButton.parentNode) {
                    sharedSeenButton.parentNode.removeChild(sharedSeenButton);
                    sharedSeenButton = null;
                }
                setInlinePreviewActionGroupVisibility(wrappers[i], "recovery", !!(undoInlineContext || (isRedoTarget && redoInlineContext) || sharedUpdateCount));
                syncInlinePreviewActionSummaryNode(wrappers[i], {
                    suggestion: suggestion,
                    isPreviewTarget: isPreviewTarget,
                    sharedUpdateCount: sharedUpdateCount,
                    undoInlineContext: undoInlineContext,
                    redoInlineContext: redoInlineContext,
                    queueTransitionData: queueTransitionData,
                    undoInlineSummaryText: undoInlineSummaryText,
                    redoInlineSummaryText: redoInlineSummaryText
                });
                syncInlinePreviewActionGroupHeaders(wrappers[i], {
                    suggestion: suggestion,
                    isPreviewTarget: isPreviewTarget,
                    sharedUpdateCount: sharedUpdateCount,
                    undoInlineContext: undoInlineContext,
                    redoInlineContext: redoInlineContext,
                    queueTransitionData: queueTransitionData,
                    undoInlineSummaryText: undoInlineSummaryText,
                    redoInlineSummaryText: redoInlineSummaryText
                });
                syncInlinePreviewEnterTargetButtonState(wrappers[i], {
                    suggestion: suggestion,
                    isPreviewTarget: isPreviewTarget,
                    sharedUpdateCount: sharedUpdateCount,
                    undoInlineContext: undoInlineContext,
                    redoInlineContext: redoInlineContext
                });
                if (pendingPosition.total && pendingPosition.index) {
                    if (!queueChip) {
                        queueChip = document.createElement("span");
                        queueChip.className = "rte-ai-inline-preview-queue";
                        var queueAnchor = remoteChip || scopeChip || languageChip || typeChip || currentChip || (wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-current") : null);
                        if (queueAnchor && queueAnchor.nextSibling) {
                            wrappers[i].insertBefore(queueChip, queueAnchor.nextSibling);
                        }
                        else if (queueAnchor) {
                            wrappers[i].appendChild(queueChip);
                        }
                        else {
                            var actionsNodeForQueue = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-actions") : null;
                            if (actionsNodeForQueue && actionsNodeForQueue.nextSibling) {
                                wrappers[i].insertBefore(queueChip, actionsNodeForQueue.nextSibling);
                            }
                            else {
                                wrappers[i].appendChild(queueChip);
                            }
                        }
                    }
                    queueChip.textContent = "Item " + pendingPosition.index + " of " + pendingPosition.total;
                    queueChip.setAttribute("aria-label", "Current AI review queue position");
                }
                else if (queueChip && queueChip.parentNode) {
                    queueChip.parentNode.removeChild(queueChip);
                }
                if (queueTransitionData) {
                    if (!transitionChip) {
                        transitionChip = document.createElement("span");
                        transitionChip.className = "rte-ai-inline-preview-transition";
                        var transitionAnchor = queueChip || remoteChip || scopeChip || languageChip || typeChip || currentChip;
                        if (transitionAnchor && transitionAnchor.nextSibling) {
                            wrappers[i].insertBefore(transitionChip, transitionAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(transitionChip);
                        }
                    }
                    transitionChip.textContent = queueTransitionData.statusLabel + " - " + queueTransitionData.queueLabel;
                    transitionChip.setAttribute("aria-label", queueTransitionData.title + ". " + queueTransitionData.detail + " " + getQueueTransitionPreviewSummary(queueTransitionData));
                    if (queueTransitionData.followupTitle) {
                        if (!followupChip) {
                            followupChip = document.createElement("span");
                            followupChip.className = "rte-ai-inline-preview-followup";
                            var followupAnchor = transitionChip || queueChip || remoteChip || scopeChip || languageChip || typeChip || currentChip;
                            if (followupAnchor && followupAnchor.nextSibling) {
                                wrappers[i].insertBefore(followupChip, followupAnchor.nextSibling);
                            }
                            else {
                                wrappers[i].appendChild(followupChip);
                            }
                        }
                        followupChip.textContent = queueTransitionData.followupTitle;
                        followupChip.setAttribute("aria-label", queueTransitionData.followupTitle + ". " + queueTransitionData.followupDetail);
                    }
                    else if (followupChip && followupChip.parentNode) {
                        followupChip.parentNode.removeChild(followupChip);
                    }
                }
                else {
                    if (transitionChip && transitionChip.parentNode) {
                        transitionChip.parentNode.removeChild(transitionChip);
                    }
                    if (followupChip && followupChip.parentNode) {
                        followupChip.parentNode.removeChild(followupChip);
                    }
                }
                if (undoInlineContext) {
                    if (!undoChip) {
                        undoChip = document.createElement("span");
                        undoChip.className = "rte-ai-inline-preview-undo";
                        var undoAnchor = followupChip || transitionChip || queueChip || remoteChip || scopeChip || languageChip || typeChip || currentChip;
                        if (undoAnchor && undoAnchor.nextSibling) {
                            wrappers[i].insertBefore(undoChip, undoAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(undoChip);
                        }
                    }
                    undoChip.textContent = undoInlineContext.actionLabel;
                    undoChip.setAttribute("aria-label", undoInlineSummaryText);
                }
                else if (undoChip && undoChip.parentNode) {
                    undoChip.parentNode.removeChild(undoChip);
                }
                if (undoInlineNextItem) {
                    if (!undoNextChip) {
                        undoNextChip = document.createElement("span");
                        undoNextChip.className = "rte-ai-inline-preview-undo-next";
                        var undoNextAnchor = undoChip || queueChip || remoteChip || scopeChip || languageChip || typeChip || currentChip;
                        if (undoNextAnchor && undoNextAnchor.nextSibling) {
                            wrappers[i].insertBefore(undoNextChip, undoNextAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(undoNextChip);
                        }
                    }
                    undoNextChip.textContent = "Then " + undoInlineNextItem.label;
                    undoNextChip.setAttribute("aria-label", "Undo after this: " + undoInlineNextItem.detail);
                }
                else if (undoNextChip && undoNextChip.parentNode) {
                    undoNextChip.parentNode.removeChild(undoNextChip);
                }
                if (isRedoTarget && redoInlineContext) {
                    if (!redoChip) {
                        redoChip = document.createElement("span");
                        redoChip.className = "rte-ai-inline-preview-redo";
                        var redoAnchor = undoNextChip || undoChip || queueChip || remoteChip || scopeChip || languageChip || typeChip || currentChip;
                        if (redoAnchor && redoAnchor.nextSibling) {
                            wrappers[i].insertBefore(redoChip, redoAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(redoChip);
                        }
                    }
                    redoChip.textContent = redoInlineContext.actionLabel;
                    redoChip.setAttribute("aria-label", redoInlineSummaryText);
                }
                else if (redoChip && redoChip.parentNode) {
                    redoChip.parentNode.removeChild(redoChip);
                }
                if (redoInlineNextItem) {
                    if (!redoNextChip) {
                        redoNextChip = document.createElement("span");
                        redoNextChip.className = "rte-ai-inline-preview-redo-next";
                        var redoNextAnchor = redoChip || undoNextChip || undoChip || queueChip || remoteChip || scopeChip || languageChip || typeChip || currentChip;
                        if (redoNextAnchor && redoNextAnchor.nextSibling) {
                            wrappers[i].insertBefore(redoNextChip, redoNextAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(redoNextChip);
                        }
                    }
                    redoNextChip.textContent = "Then " + redoInlineNextItem.label;
                    redoNextChip.setAttribute("aria-label", "Redo after this: " + redoInlineNextItem.detail);
                }
                else if (redoNextChip && redoNextChip.parentNode) {
                    redoNextChip.parentNode.removeChild(redoNextChip);
                }
                if (isPreviewTarget) {
                    if (!shortcutsChip) {
                        shortcutsChip = document.createElement("span");
                        shortcutsChip.className = "rte-ai-inline-preview-shortcuts";
                        var previewShortcutsAnchor = redoNextChip || redoChip || undoNextChip || undoChip || queueChip || remoteChip || scopeChip || languageChip || typeChip || currentChip;
                        if (previewShortcutsAnchor && previewShortcutsAnchor.nextSibling) {
                            wrappers[i].insertBefore(shortcutsChip, previewShortcutsAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(shortcutsChip);
                        }
                    }
                    shortcutsChip.textContent = getSuggestionQueueShortcutHint(suggestion);
                    shortcutsChip.setAttribute("aria-label", "Inline queue preview shortcut");
                }
                else if (!shortcutsChip) {
                    shortcutsChip = document.createElement("span");
                    shortcutsChip.className = "rte-ai-inline-preview-shortcuts";
                    var shortcutsAnchor = redoNextChip || redoChip || undoNextChip || undoChip || queueChip || remoteChip || scopeChip || languageChip || typeChip || currentChip;
                    if (shortcutsAnchor && shortcutsAnchor.nextSibling) {
                        wrappers[i].insertBefore(shortcutsChip, shortcutsAnchor.nextSibling);
                    }
                    else {
                        wrappers[i].appendChild(shortcutsChip);
                    }
                }
                var inlineShortcutDisplayOptions = {
                    isPreviewTarget: isPreviewTarget,
                    sharedUpdateCount: sharedUpdateCount,
                    undoInlineContext: undoInlineContext,
                    redoInlineContext: redoInlineContext,
                    suggestion: suggestion
                };
                var inlineWrapperFocusLabel = getInlineReviewWrapperFocusLabel(inlineShortcutDisplayOptions);
                shortcutsChip.id = getInlineReviewShortcutDisplayId(wrappers[i]);
                setInlineReviewShortcutDisplay(shortcutsChip, isPreviewTarget ? "preview" : "wrapper", inlineShortcutDisplayOptions);
                bindInlineReviewWrapperShortcutFocus(wrappers[i], shortcutsChip, inlineShortcutDisplayOptions);
                bindInlineReviewShortcutFocusTarget(reviewButton, wrappers[i], shortcutsChip, "review", inlineShortcutDisplayOptions);
                bindInlineReviewShortcutFocusTarget(previousButton, wrappers[i], shortcutsChip, "previous", inlineShortcutDisplayOptions);
                bindInlineReviewShortcutFocusTarget(nextButton, wrappers[i], shortcutsChip, "next", inlineShortcutDisplayOptions);
                bindInlineReviewShortcutFocusTarget(acceptButton, wrappers[i], shortcutsChip, "accept", inlineShortcutDisplayOptions);
                bindInlineReviewShortcutFocusTarget(rejectButton, wrappers[i], shortcutsChip, "reject", inlineShortcutDisplayOptions);
                bindInlineReviewShortcutFocusTarget(undoButton, wrappers[i], shortcutsChip, "undo", inlineShortcutDisplayOptions);
                bindInlineReviewShortcutFocusTarget(redoButton, wrappers[i], shortcutsChip, "redo", inlineShortcutDisplayOptions);
                bindInlineReviewShortcutFocusTarget(sharedSeenButton, wrappers[i], shortcutsChip, "shared-seen", inlineShortcutDisplayOptions);
                var activeInlineNode = wrappers[i].ownerDocument ? wrappers[i].ownerDocument.activeElement : null;
                var activeInlineAction = activeInlineNode && wrappers[i].contains(activeInlineNode) && activeInlineNode.getAttribute
                    ? activeInlineNode.getAttribute("data-rte-ai-action") || ""
                    : "";
                setInlineReviewShortcutDisplay(shortcutsChip, isPreviewTarget ? "preview" : (activeInlineAction || "wrapper"), inlineShortcutDisplayOptions);
                syncInlinePreviewCompareHeaderNode(wrappers[i], suggestion);
                syncInlinePreviewCompareMetaNode(wrappers[i], suggestion);
                syncInlinePreviewCompareGlanceNode(wrappers[i], compareGlanceData);
                reasonNode = syncInlinePreviewReasonNode(wrappers[i], reasonNode, suggestion);
                planNode = syncInlinePreviewPlanNode(wrappers[i], planNode, suggestion);
                shortcutsChip = syncInlinePreviewShortcutNode(wrappers[i], shortcutsChip);
                wrappers[i].setAttribute("aria-label", buildInlineSuggestionAriaLabel(suggestion, {
                    isCurrent: !isPreviewTarget,
                    isPreviewTarget: isPreviewTarget,
                    queueOpened: isQueueOpened,
                    glanceLabels: glanceData ? glanceData.pills.map(function (pill) { return pill.text; }) : [],
                    glanceDetail: glanceData ? glanceData.detail : "",
                    compareLabel: "Proposed edit. Current and suggested text.",
                    reasonText: reasonText,
                    focusLabel: inlineWrapperFocusLabel,
                    positionLabel: pendingPosition.total && pendingPosition.index ? "Item " + pendingPosition.index + " of " + pendingPosition.total : "",
                    transitionLabel: queueTransitionData ? (queueTransitionData.statusLabel + ". " + queueTransitionData.queueLabel + ". " + getQueueTransitionPreviewSummary(queueTransitionData)) : "",
                    followupLabel: queueTransitionData && queueTransitionData.followupTitle ? (queueTransitionData.followupTitle + ". " + queueTransitionData.followupDetail) : "",
                    remoteUpdateCount: sharedUpdateCount,
                    undoLabel: undoInlineSummaryText,
                    undoNextLabel: undoInlineNextItem ? "Undo after this: " + undoInlineNextItem.detail : "",
                    redoLabel: redoInlineSummaryText,
                    redoNextLabel: redoInlineNextItem ? "Redo after this: " + redoInlineNextItem.detail : ""
                }));
            }
            else {
                wrappers[i].classList.remove("is-review-active");
                wrappers[i].classList.remove("is-review-preview");
                wrappers[i].classList.remove("is-queue-opened");
                wrappers[i].setAttribute("role", "group");
                wrappers[i].removeAttribute("aria-current");
                wrappers[i].removeAttribute("aria-keyshortcuts");
                wrappers[i].setAttribute("tabindex", "-1");
                wrappers[i].removeAttribute("title");
                wrappers[i].onfocus = null;
                wrappers[i].onfocusout = null;
                clearInlineReviewShortcutDisplayTarget(wrappers[i]);
                syncInlinePreviewCompareMetaNode(wrappers[i], suggestion);
                syncInlinePreviewCompareGlanceNode(wrappers[i], compareGlanceData);
                reasonNode = syncInlinePreviewReasonNode(wrappers[i], reasonNode, suggestion);
                planNode = syncInlinePreviewPlanNode(wrappers[i], planNode, suggestion);
                wrappers[i].setAttribute("aria-label", buildInlineSuggestionAriaLabel(suggestion, {
                    remoteUpdateCount: sharedUpdateCount,
                    glanceLabels: glanceData ? glanceData.pills.map(function (pill) { return pill.text; }) : [],
                    glanceDetail: glanceData ? glanceData.detail : "",
                    compareLabel: "Proposed edit. Current and suggested text.",
                    reasonText: reasonText,
                    focusLabel: reviewFocusLabel,
                    queueRoleLabel: queuePositionData ? queuePositionData.roleLabel : "",
                    queueRoleDetail: queuePositionData ? queuePositionData.detail : "",
                    transitionLabel: queueTransitionData ? (queueTransitionData.title + ". " + queueTransitionData.statusLabel + ". " + queueTransitionData.queueLabel + ". " + getQueueTransitionPreviewSummary(queueTransitionData)) : "",
                    followupLabel: queueTransitionData && queueTransitionData.followupTitle ? (queueTransitionData.followupTitle + ". " + queueTransitionData.followupDetail) : ""
                }));
                var inactiveTypeFilter = getInlineReviewTypeFilter(suggestionId);
                var inactiveAcceptActionPresentation = getPendingReviewActionPresentation(suggestion, "accept", inactiveTypeFilter) || { text: "Accept", label: "Accept this AI change" };
                var inactiveRejectActionPresentation = getPendingReviewActionPresentation(suggestion, "reject", inactiveTypeFilter) || { text: "Reject", label: "Reject this AI change" };
                updateInlineReviewActionButtonState(reviewButton, "Review", reviewLabel);
                updateInlineReviewButtonState(previousButton, !previousSuggestionId, previousLabel);
                updateInlineReviewButtonState(nextButton, !nextSuggestionId, nextLabel);
                if (queueTransitionData && /queue state/i.test(queueTransitionData.previewLabel || "")) {
                    updateInlineReviewButtonState(nextButton, true, "No next AI review item in the current queue");
                }
                updateInlineReviewActionButtonState(acceptButton, inactiveAcceptActionPresentation.text, inactiveAcceptActionPresentation.label);
                updateInlineReviewActionButtonState(rejectButton, inactiveRejectActionPresentation.text, inactiveRejectActionPresentation.label);
                clearInlineReviewButtonShortcutState(reviewButton);
                clearInlineReviewButtonShortcutState(previousButton);
                clearInlineReviewButtonShortcutState(nextButton);
                clearInlineReviewButtonShortcutState(acceptButton);
                clearInlineReviewButtonShortcutState(rejectButton);
                clearInlineReviewButtonShortcutState(undoButton);
                clearInlineReviewButtonShortcutState(redoButton);
                clearInlineReviewButtonShortcutState(sharedSeenButton);
                clearInlineReviewShortcutFocusBinding(reviewButton);
                clearInlineReviewShortcutFocusBinding(previousButton);
                clearInlineReviewShortcutFocusBinding(nextButton);
                clearInlineReviewShortcutFocusBinding(acceptButton);
                clearInlineReviewShortcutFocusBinding(rejectButton);
                clearInlineReviewShortcutFocusBinding(undoButton);
                clearInlineReviewShortcutFocusBinding(redoButton);
                clearInlineReviewShortcutFocusBinding(sharedSeenButton);
                if (undoButton && undoButton.parentNode) {
                    undoButton.parentNode.removeChild(undoButton);
                }
                if (redoButton && redoButton.parentNode) {
                    redoButton.parentNode.removeChild(redoButton);
                }
                if (sharedSeenButton && sharedSeenButton.parentNode) {
                    sharedSeenButton.parentNode.removeChild(sharedSeenButton);
                }
                setInlinePreviewActionGroupVisibility(wrappers[i], "recovery", false);
                syncInlinePreviewActionSummaryNode(wrappers[i], {
                    suggestion: suggestion,
                    isPreviewTarget: isPreviewTarget,
                    sharedUpdateCount: sharedUpdateCount,
                    queueTransitionData: queueTransitionData
                });
                syncInlinePreviewActionGroupHeaders(wrappers[i], {
                    suggestion: suggestion,
                    isPreviewTarget: isPreviewTarget,
                    sharedUpdateCount: sharedUpdateCount,
                    queueTransitionData: queueTransitionData
                });
                syncInlinePreviewEnterTargetButtonState(wrappers[i], {
                    suggestion: suggestion,
                    isPreviewTarget: isPreviewTarget,
                    sharedUpdateCount: sharedUpdateCount
                });
                if (currentChip && currentChip.parentNode) {
                    currentChip.parentNode.removeChild(currentChip);
                }
                if (openedChip && openedChip.parentNode) {
                    openedChip.parentNode.removeChild(openedChip);
                }
                if (launchChip && launchChip.parentNode) {
                    launchChip.parentNode.removeChild(launchChip);
                }
                if (typeChip && typeChip.parentNode) {
                    typeChip.parentNode.removeChild(typeChip);
                }
                if (languageChip && languageChip.parentNode) {
                    languageChip.parentNode.removeChild(languageChip);
                }
                if (scopeChip && scopeChip.parentNode) {
                    scopeChip.parentNode.removeChild(scopeChip);
                }
                remoteChip = syncInlineSuggestionRemoteChip(
                    wrappers[i],
                    remoteChip,
                    sharedUpdateCount,
                    wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-actions") : null
                );
                if (!isPreviewTarget && reviewFocusLabel) {
                    if (!focusChip) {
                        focusChip = document.createElement("span");
                        focusChip.className = "rte-ai-inline-preview-focus";
                        var inactiveFocusAnchor = remoteChip || scopeChip || languageChip || typeChip || currentChip;
                        if (inactiveFocusAnchor && inactiveFocusAnchor.nextSibling) {
                            wrappers[i].insertBefore(focusChip, inactiveFocusAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(focusChip);
                        }
                    }
                    focusChip.textContent = "Focus " + reviewFocusLabel;
                    focusChip.setAttribute("aria-label", "Review opens on " + reviewFocusLabel);
                }
                else if (focusChip && focusChip.parentNode) {
                    focusChip.parentNode.removeChild(focusChip);
                    focusChip = null;
                }
                if (!isPreviewTarget && glanceData && glanceData.pills && glanceData.pills.length) {
                    if (!glanceNode) {
                        glanceNode = document.createElement("span");
                        glanceNode.className = "rte-ai-inline-preview-glance";
                        var glanceAnchor = scopeChip || typeChip || currentChip;
                        if (glanceAnchor && glanceAnchor.nextSibling) {
                            wrappers[i].insertBefore(glanceNode, glanceAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(glanceNode);
                        }
                    }
                    while (glanceNode.firstChild) {
                        glanceNode.removeChild(glanceNode.firstChild);
                    }
                    for (var glanceIndex = 0; glanceIndex < glanceData.pills.length; glanceIndex++) {
                        var glancePill = glanceData.pills[glanceIndex];
                        if (!glancePill || !glancePill.text || glancePill.kind === "scope") {
                            continue;
                        }
                        append(glanceNode, "span", "", "rte-ai-review-item-glance-pill is-" + glancePill.kind, glancePill.text);
                    }
                    if (!glanceNode.childNodes.length && glanceNode.parentNode) {
                        glanceNode.parentNode.removeChild(glanceNode);
                        glanceNode = null;
                    }
                }
                else if (glanceNode && glanceNode.parentNode) {
                    glanceNode.parentNode.removeChild(glanceNode);
                    glanceNode = null;
                }
                if (!isPreviewTarget && queuePositionData && queuePositionData.role !== "current") {
                    if (!queueChip) {
                        queueChip = document.createElement("span");
                        queueChip.className = "rte-ai-inline-preview-queue";
                        var inactiveQueueAnchor = focusChip || remoteChip || glanceNode || scopeChip || languageChip || typeChip || currentChip;
                        if (inactiveQueueAnchor && inactiveQueueAnchor.nextSibling) {
                            wrappers[i].insertBefore(queueChip, inactiveQueueAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(queueChip);
                        }
                    }
                    queueChip.textContent = queuePositionData.roleLabel + " - " + queuePositionData.queueLabel;
                    queueChip.setAttribute("aria-label", queuePositionData.detail);
                }
                else if (queueChip && queueChip.parentNode) {
                    queueChip.parentNode.removeChild(queueChip);
                    queueChip = null;
                }
                if (!isPreviewTarget && queueTransitionData) {
                    if (!transitionChip) {
                        transitionChip = document.createElement("span");
                        transitionChip.className = "rte-ai-inline-preview-transition";
                        var inactiveTransitionAnchor = queueChip || focusChip || remoteChip || glanceNode || scopeChip || languageChip || typeChip || currentChip;
                        if (inactiveTransitionAnchor && inactiveTransitionAnchor.nextSibling) {
                            wrappers[i].insertBefore(transitionChip, inactiveTransitionAnchor.nextSibling);
                        }
                        else {
                            wrappers[i].appendChild(transitionChip);
                        }
                    }
                    transitionChip.textContent = queueTransitionData.statusLabel;
                    transitionChip.setAttribute("aria-label", queueTransitionData.title + ". " + queueTransitionData.detail + " " + getQueueTransitionPreviewSummary(queueTransitionData));
                    if (queueTransitionData.followupTitle) {
                        if (!followupChip) {
                            followupChip = document.createElement("span");
                            followupChip.className = "rte-ai-inline-preview-followup";
                            var inactiveFollowupAnchor = transitionChip || queueChip || focusChip || remoteChip || scopeChip || languageChip || typeChip || currentChip;
                            if (inactiveFollowupAnchor && inactiveFollowupAnchor.nextSibling) {
                                wrappers[i].insertBefore(followupChip, inactiveFollowupAnchor.nextSibling);
                            }
                            else {
                                wrappers[i].appendChild(followupChip);
                            }
                        }
                        followupChip.textContent = queueTransitionData.followupTitle;
                        followupChip.setAttribute("aria-label", queueTransitionData.followupTitle + ". " + queueTransitionData.followupDetail);
                    }
                    else if (followupChip && followupChip.parentNode) {
                        followupChip.parentNode.removeChild(followupChip);
                        followupChip = null;
                    }
                }
                else {
                    if (transitionChip && transitionChip.parentNode) {
                        transitionChip.parentNode.removeChild(transitionChip);
                        transitionChip = null;
                    }
                    if (followupChip && followupChip.parentNode) {
                        followupChip.parentNode.removeChild(followupChip);
                        followupChip = null;
                    }
                }
                if (undoChip && undoChip.parentNode) {
                    undoChip.parentNode.removeChild(undoChip);
                }
                if (undoNextChip && undoNextChip.parentNode) {
                    undoNextChip.parentNode.removeChild(undoNextChip);
                }
                if (redoChip && redoChip.parentNode) {
                    redoChip.parentNode.removeChild(redoChip);
                }
                if (redoNextChip && redoNextChip.parentNode) {
                    redoNextChip.parentNode.removeChild(redoNextChip);
                }
                if (shortcutsChip && shortcutsChip.parentNode) {
                    shortcutsChip.parentNode.removeChild(shortcutsChip);
                }
            }
            if (editor.__aiActiveSuggestionId !== suggestionId && !isPreviewTarget) {
                if (!shortcutsChip || !shortcutsChip.parentNode) {
                    shortcutsChip = document.createElement("span");
                    shortcutsChip.className = "rte-ai-inline-preview-shortcuts";
                    wrappers[i].appendChild(shortcutsChip);
                }
                setInlineReviewShortcutDisplay(shortcutsChip, "wrapper", {
                    suggestion: suggestion,
                    isPreviewTarget: isPreviewTarget,
                    sharedUpdateCount: sharedUpdateCount
                });
                shortcutsChip = syncInlinePreviewShortcutNode(wrappers[i], shortcutsChip);
            }
            var hideOuterReviewScaffold = true;
            var scaffoldNodes = [typeChip, scopeChip, queueChip, transitionChip, followupChip, glanceNode, focusChip, remoteChip];
            if (isPreviewTarget) {
                scaffoldNodes.push(currentChip, openedChip, launchChip);
            }
            for (var scaffoldIndex = 0; scaffoldIndex < scaffoldNodes.length; scaffoldIndex++) {
                if (scaffoldNodes[scaffoldIndex] && scaffoldNodes[scaffoldIndex].style) {
                    scaffoldNodes[scaffoldIndex].style.display = hideOuterReviewScaffold ? "none" : "";
                }
            }
            var inlineCompareNode = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-compare") : null;
            var inlineActionsNode = wrappers[i].querySelector ? wrappers[i].querySelector(".rte-ai-inline-preview-actions") : null;
            if (wrappers[i].style) {
                wrappers[i].style.display = hideOuterReviewScaffold ? "flex" : "";
                wrappers[i].style.flexDirection = hideOuterReviewScaffold ? "column" : "";
                wrappers[i].style.cursor = isPreviewTarget ? "pointer" : "";
            }
            if (inlineCompareNode && inlineCompareNode.style) {
                inlineCompareNode.style.order = hideOuterReviewScaffold ? "1" : "";
            }
            if (inlineActionsNode && inlineActionsNode.style) {
                inlineActionsNode.style.order = hideOuterReviewScaffold ? "2" : "";
                inlineActionsNode.style.display = isPreviewTarget ? "none" : "";
            }
        }
        return true;
    }

    function updateInlineReviewActionButtonState(button, text, label) {
        if (!button) {
            return false;
        }
        if (typeof text === "string" && text.length) {
            button.textContent = text;
        }
        if (label) {
            button.setAttribute("aria-label", label);
            button.title = label;
        }
        return true;
    }

    function getInlineReviewButtonShortcutKeys(actionName, options) {
        options = options || {};
        if (options.isPreviewTarget) {
            return "Enter Space";
        }
        switch (actionName) {
            case "previous":
                return "Enter Space K ArrowLeft";
            case "next":
                return "Enter Space J ArrowRight";
            case "accept":
                return "Enter Space A";
            case "reject":
                return "Enter Space R";
            case "undo":
                return options.undoInlineContext ? "Enter Space U" : "Enter Space";
            case "redo":
                return options.redoInlineContext ? "Enter Space Shift+U" : "Enter Space";
            case "shared-seen":
                return options.sharedUpdateCount ? "Enter Space G" : "Enter Space";
            default:
                return "Enter Space";
        }
    }

    function getInlineReviewButtonShortcutTitle(actionName, label, options) {
        options = options || {};
        var title = label || "";
        if (!title) {
            return title;
        }
        title = title.replace(/\.$/, "");
        if (options.isPreviewTarget) {
            return title + ". Enter or Space activates this action.";
        }
        var decisionCopy = getReviewShortcutDecisionCopy(options.suggestion);
        title += ". Enter or Space activates this action.";
        switch (actionName) {
            case "previous":
                title += " K or Left moves to the previous review item.";
                break;
            case "next":
                title += " J or Right moves to the next review item.";
                break;
            case "accept":
                title += " A uses " + decisionCopy.acceptLabel + ".";
                break;
            case "reject":
                title += " R uses " + decisionCopy.rejectLabel + ".";
                break;
            case "undo":
                if (options.undoInlineContext) {
                    title += " U " + options.undoInlineContext.shortcutLabel + ".";
                }
                break;
            case "redo":
                if (options.redoInlineContext) {
                    title += " Shift+U " + options.redoInlineContext.shortcutLabel + ".";
                }
                break;
            case "shared-seen":
                if (options.sharedUpdateCount) {
                    title += " G clears shared.";
                }
                break;
        }
        return title;
    }

    function getInlineReviewWrapperShortcutHint(options) {
        options = options || {};
        if (options.isPreviewTarget) {
            return getSuggestionQueueShortcutHint(options.suggestion);
        }
        var decisionCopy = getReviewShortcutDecisionCopy(options.suggestion);
        var focusLabel = getInlineReviewWrapperFocusLabel(options);
        var hint = "Enter focus " + focusLabel + " - A " + decisionCopy.acceptHint + " - R " + decisionCopy.rejectHint + " - J/K move - Home/End jump";
        if (options.sharedUpdateCount) {
            hint += " - G clear shared";
        }
        if (options.undoInlineContext) {
            hint += " - U " + options.undoInlineContext.shortcutLabel;
        }
        if (options.redoInlineContext) {
            hint += " - Shift+U " + options.redoInlineContext.shortcutLabel;
        }
        return hint;
    }

    function getInlineReviewWrapperShortcutTitle(options) {
        options = options || {};
        if (options.isPreviewTarget) {
            return getSuggestionQueueActionTitle(options.suggestion);
        }
        var decisionCopy = getReviewShortcutDecisionCopy(options.suggestion);
        var focusLabel = getInlineReviewWrapperFocusLabel(options);
        var title = "Shortcuts: J or Right next, K or Left previous, Home/End jump, Enter focus " + focusLabel + ", A " + decisionCopy.acceptHint + ", R " + decisionCopy.rejectHint;
        if (options.sharedUpdateCount) {
            title += ", G clear shared";
        }
        if (options.undoInlineContext) {
            title += ", U " + options.undoInlineContext.shortcutLabel;
        }
        if (options.redoInlineContext) {
            title += ", Shift+U " + options.redoInlineContext.shortcutLabel;
        }
        return title;
    }

    function getInlinePreviewFocusedActionName(options) {
        options = options || {};
        if (options.isPreviewTarget) {
            return "review";
        }
        var suggestion = options.suggestion;
        if (!suggestion) {
            return "";
        }
        var preferredAction = options.preferredAction || getPreferredReviewActionFocus();
        if ((preferredAction === "accept" || preferredAction === "reject") && suggestion.status === "pending") {
            return preferredAction;
        }
        if (preferredAction === "undo" && options.undoInlineContext) {
            return "undo";
        }
        if (preferredAction === "redo" && options.redoInlineContext) {
            return "redo";
        }
        if (preferredAction === "review") {
            return "review";
        }
        if (preferredAction === "shared-seen" && options.sharedUpdateCount) {
            return "shared-seen";
        }
        var defaultActionName = options.defaultActionName || getDefaultInlineReviewActionName(suggestion);
        if (defaultActionName === "redo" && options.redoInlineContext) {
            return "redo";
        }
        if (defaultActionName === "accept") {
            return "accept";
        }
        return "review";
    }

    function getInlinePreviewActionGroupName(actionName) {
        switch (actionName) {
            case "accept":
            case "reject":
                return "decision";
            case "undo":
            case "redo":
            case "shared-seen":
                return "recovery";
            case "review":
                return "review";
            default:
                return "";
        }
    }

    function getInlineReviewWrapperFocusLabel(options) {
        options = options || {};
        var suggestion = options.suggestion;
        if (!suggestion) {
            return "Review";
        }
        if (options.isPreviewTarget) {
            return "Open queue";
        }
        var decisionCopy = getReviewShortcutDecisionCopy(suggestion);
        var focusedActionName = getInlinePreviewFocusedActionName(options);
        if (focusedActionName === "accept") {
            return decisionCopy.acceptLabel;
        }
        if (focusedActionName === "reject") {
            return decisionCopy.rejectLabel;
        }
        if (focusedActionName === "undo" && options.undoInlineContext) {
            return options.undoInlineContext.actionLabel || "Undo";
        }
        if (focusedActionName === "redo" && options.redoInlineContext) {
            return options.redoInlineContext.actionLabel || "Redo";
        }
        if (focusedActionName === "review") {
            return "Review";
        }
        if (focusedActionName === "shared-seen" && options.sharedUpdateCount) {
            return "Clear shared";
        }
        return "Review";
    }

    function getInlineReviewActionShortcutHint(actionName, options) {
        options = options || {};
        if (options.isPreviewTarget) {
            return getSuggestionQueueShortcutHint(options.suggestion);
        }
        var hint = "";
        var decisionCopy = getReviewShortcutDecisionCopy(options.suggestion);
        var acceptDisplayLabel = decisionCopy.acceptLabel;
        var rejectDisplayLabel = decisionCopy.rejectLabel;
        var reviewFocusLabel = options.reviewFocusLabel || getReviewFocusActionDisplayLabel(options.suggestion, getPreferredReviewActionFocus()) || getReviewFocusActionDisplayLabel(options.suggestion, "");
        switch (actionName) {
            case "review":
                hint = "Enter focus " + (reviewFocusLabel || "Review") + " - J/K move - Home/End jump - A " + decisionCopy.acceptHint + " - R " + decisionCopy.rejectHint;
                break;
            case "previous":
                hint = "Enter previous - J/K move - Home/End jump - A " + decisionCopy.acceptHint + " - R " + decisionCopy.rejectHint;
                break;
            case "next":
                hint = "Enter next - J/K move - Home/End jump - A " + decisionCopy.acceptHint + " - R " + decisionCopy.rejectHint;
                break;
            case "accept":
                hint = "Enter " + acceptDisplayLabel + " - R " + decisionCopy.rejectHint + " - J/K move - Home/End jump";
                break;
            case "reject":
                hint = "Enter " + rejectDisplayLabel + " - A " + decisionCopy.acceptHint + " - J/K move - Home/End jump";
                break;
            case "undo":
                hint = "Enter undo - A " + decisionCopy.acceptHint + " - R " + decisionCopy.rejectHint + " - J/K move - Home/End jump";
                break;
            case "redo":
                hint = "Enter redo - A " + decisionCopy.acceptHint + " - R " + decisionCopy.rejectHint + " - J/K move - Home/End jump";
                break;
            case "shared-seen":
                hint = "Enter clear shared - A " + decisionCopy.acceptHint + " - R " + decisionCopy.rejectHint + " - J/K move - Home/End jump";
                break;
            default:
                return getInlineReviewWrapperShortcutHint(options);
        }
        if (options.undoInlineContext) {
            hint += " - U " + options.undoInlineContext.shortcutLabel;
        }
        if (options.sharedUpdateCount && actionName !== "shared-seen") {
            hint += " - G clear shared";
        }
        if (options.redoInlineContext) {
            hint += " - Shift+U " + options.redoInlineContext.shortcutLabel;
        }
        return hint;
    }

    function getInlineReviewShortcutDisplayId(wrapper) {
        if (!wrapper) {
            return "";
        }
        if (!wrapper.__rteAiInlineShortcutDisplayId) {
            wrapper.__rteAiInlineShortcutDisplayId = "rte-ai-inline-shortcuts-" + String(Math.floor(Math.random() * 1000000000));
        }
        return wrapper.__rteAiInlineShortcutDisplayId;
    }

    function linkInlineReviewShortcutDisplayTarget(node, shortcutsChip) {
        if (!node || !node.setAttribute || !shortcutsChip) {
            return false;
        }
        var displayId = shortcutsChip.id || "";
        if (!displayId) {
            return false;
        }
        node.setAttribute("aria-describedby", displayId);
        return true;
    }

    function clearInlineReviewShortcutDisplayTarget(node) {
        if (!node || !node.removeAttribute) {
            return false;
        }
        node.removeAttribute("aria-describedby");
        return true;
    }

    function renderInlineReviewShortcutDisplayContent(shortcutsChip, title, text) {
        if (!shortcutsChip) {
            return false;
        }
        while (shortcutsChip.firstChild) {
            shortcutsChip.removeChild(shortcutsChip.firstChild);
        }
        if (!title && !text) {
            return true;
        }
        var ownerDocument = shortcutsChip.ownerDocument || document;
        if (title) {
            var titleNode = ownerDocument.createElement("span");
            titleNode.className = "rte-ai-inline-preview-shortcuts-title";
            titleNode.innerText = title;
            shortcutsChip.appendChild(titleNode);
        }
        if (!text) {
            return true;
        }
        var bodyNode = ownerDocument.createElement("span");
        bodyNode.className = "rte-ai-inline-preview-shortcuts-body";
        shortcutsChip.appendChild(bodyNode);
        var pieces = String(text || "").split(/(\s+·\s+|\s+-\s+)/);
        for (var pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
            var piece = pieces[pieceIndex];
            if (!piece) {
                continue;
            }
            if (/^\s+[·-]\s+$/.test(piece)) {
                var separator = ownerDocument.createElement("span");
                separator.className = "rte-ai-inline-preview-shortcuts-separator";
                separator.innerText = piece.replace(/^\s+|\s+$/g, "");
                bodyNode.appendChild(separator);
                continue;
            }
            var segment = ownerDocument.createElement("span");
            segment.className = "rte-ai-inline-preview-shortcuts-segment";
            var segmentText = piece.replace(/^\s+|\s+$/g, "");
            var firstSpace = segmentText.indexOf(" ");
            if (firstSpace > 0) {
                var keyNode = ownerDocument.createElement("span");
                keyNode.className = "rte-ai-inline-preview-shortcuts-key";
                keyNode.innerText = segmentText.substring(0, firstSpace);
                segment.appendChild(keyNode);
                segment.appendChild(ownerDocument.createTextNode(" "));
                var copyNode = ownerDocument.createElement("span");
                copyNode.className = "rte-ai-inline-preview-shortcuts-copy";
                copyNode.innerText = segmentText.substring(firstSpace + 1);
                segment.appendChild(copyNode);
            }
            else {
                segment.innerText = segmentText;
            }
            bodyNode.appendChild(segment);
        }
        return true;
    }

    function setInlineReviewShortcutDisplay(shortcutsChip, state, options) {
        if (!shortcutsChip) {
            return false;
        }
        options = options || {};
        shortcutsChip.classList.remove("is-action");
        shortcutsChip.classList.toggle("is-preview", state === "preview");
        if (state === "preview") {
            renderInlineReviewShortcutDisplayContent(shortcutsChip, "Queue shortcut", getSuggestionQueueShortcutHint(options.suggestion));
            shortcutsChip.setAttribute("aria-label", "Inline queue preview shortcut");
            return true;
        }
        if (state && state !== "wrapper") {
            shortcutsChip.classList.add("is-action");
            renderInlineReviewShortcutDisplayContent(shortcutsChip, "Keyboard guide", getInlineReviewActionShortcutHint(state, options));
            shortcutsChip.setAttribute("aria-label", "Inline AI review action shortcuts");
            return true;
        }
        renderInlineReviewShortcutDisplayContent(shortcutsChip, "Keyboard guide", getInlineReviewWrapperShortcutHint(options));
        shortcutsChip.setAttribute("aria-label", "Inline AI review shortcuts");
        return true;
    }

    function bindInlineReviewWrapperShortcutFocus(wrapper, shortcutsChip, options) {
        if (!wrapper) {
            return false;
        }
        linkInlineReviewShortcutDisplayTarget(wrapper, shortcutsChip);
        wrapper.onfocus = function () {
            linkInlineReviewShortcutDisplayTarget(wrapper, shortcutsChip);
            setInlineReviewShortcutDisplay(shortcutsChip, options && options.isPreviewTarget ? "preview" : "wrapper", options);
        };
        wrapper.onfocusout = function () {
            var currentWrapper = wrapper;
            var currentChip = shortcutsChip;
            var currentOptions = options || {};
            window.setTimeout(function () {
                var doc = currentWrapper.ownerDocument || document;
                if (!currentWrapper.contains(doc.activeElement)) {
                    setInlineReviewShortcutDisplay(currentChip, currentOptions.isPreviewTarget ? "preview" : "wrapper", currentOptions);
                }
            }, 0);
        };
        return true;
    }

    function bindInlineReviewShortcutFocusTarget(node, wrapper, shortcutsChip, actionName, options) {
        if (!node) {
            return false;
        }
        linkInlineReviewShortcutDisplayTarget(node, shortcutsChip);
        node.onfocus = function () {
            linkInlineReviewShortcutDisplayTarget(node, shortcutsChip);
            setInlineReviewShortcutDisplay(shortcutsChip, actionName, options);
        };
        return true;
    }

    function clearInlineReviewShortcutFocusBinding(node) {
        if (!node) {
            return false;
        }
        node.onfocus = null;
        clearInlineReviewShortcutDisplayTarget(node);
        return true;
    }

    function applyInlineReviewButtonShortcutState(button, label, options) {
        if (!button) {
            return false;
        }
        var actionName = button.getAttribute ? (button.getAttribute("data-rte-ai-action") || "") : "";
        button.setAttribute("aria-keyshortcuts", getInlineReviewButtonShortcutKeys(actionName, options));
        button.title = getInlineReviewButtonShortcutTitle(actionName, label, options);
        return true;
    }

    function clearInlineReviewButtonShortcutState(button) {
        if (!button) {
            return false;
        }
        button.removeAttribute("aria-keyshortcuts");
        return true;
    }

    function updateInlineReviewButtonState(button, disabled, label) {
        if (!button) {
            return false;
        }
        button.disabled = !!disabled;
        button.setAttribute("aria-disabled", disabled ? "true" : "false");
        if (label) {
            button.setAttribute("aria-label", label);
            button.title = label;
        }
        if (disabled) {
            button.classList.add("is-disabled");
        }
        else {
            button.classList.remove("is-disabled");
        }
        return true;
    }

    function setActiveSuggestionId(suggestionId, options) {
        options = options || {};
        editor.__aiActiveSuggestionId = suggestionId || null;
        editor.__aiPreviewState = suggestionId ? findSuggestionById(suggestionId) : null;
        if (options.preserveEmptyPreview) {
            editor.__aiReviewEmptyPreviewSuggestionId = editor.__aiActiveSuggestionId;
        }
        else {
            editor.__aiReviewEmptyPreviewSuggestionId = null;
        }
        updateActiveSuggestionDecorations();
    }

    function getActiveSuggestion() {
        if (editor.__aiActiveSuggestionId) {
            return findSuggestionById(editor.__aiActiveSuggestionId);
        }
        return editor.__aiPreviewState || null;
    }

    function syncSuggestionStates() {
        var suggestions = getSuggestionStore();
        var activeStillPending = false;
        var changed = false;
        for (var i = 0; i < suggestions.length; i++) {
            if (suggestions[i].status === "pending" && !getSuggestionWrapper(suggestions[i].id)) {
                suggestions[i].status = "stale";
                suggestions[i].decidedAt = suggestions[i].decidedAt || new Date().getTime();
                emitReviewLogEvent("suggestion-stale", suggestions[i]);
                changed = true;
            }
            if (editor.__aiActiveSuggestionId && suggestions[i].id === editor.__aiActiveSuggestionId && suggestions[i].status === "pending") {
                activeStillPending = true;
            }
        }
        if (!activeStillPending) {
            setActiveSuggestionId(null);
        }
        if (changed) {
            persistSuggestionStore();
        }
    }

    function clearPreviewStateIfMissing() {
        syncSuggestionStates();
    }

    function summarizeSuggestionText(text, maxLength) {
        var clean = normalizeText(text);
        var limit = maxLength || 90;
        if (clean.length <= limit) {
            return clean;
        }
        return clean.substring(0, Math.max(0, limit - 3)).replace(/\s+\S*$/, "") + "...";
    }

    function getSuggestionStatusLabel(status) {
        switch (status) {
            case "accepted":
                return "Accepted";
            case "rejected":
                return "Rejected";
            case "stale":
                return "Needs refresh";
            default:
                return "Pending";
        }
    }

    function createInlinePreviewActionGroupHtml(groupClass, label, innerHtml) {
        var hiddenAttr = !innerHtml && groupClass === "recovery" ? " style=\"display:none\"" : "";
        return ""
            + "<span class=\"rte-ai-inline-preview-action-group is-" + groupClass + "\""
            + " data-rte-ai-inline-action-group=\"" + groupClass + "\""
            + " data-rte-ai-inline-action-group-label=\"" + escapeHtml(label) + "\""
            + " data-rte-ai-inline-action-group-current=\"false\""
            + hiddenAttr
            + " role=\"group\" aria-label=\"" + escapeHtml(label) + " actions\">"
            + "<span class=\"rte-ai-inline-preview-action-group-header\">"
            + "<span class=\"rte-ai-inline-preview-action-group-title\">" + escapeHtml(label) + "</span>"
            + "<span class=\"rte-ai-inline-preview-action-group-badge\" style=\"display:none\"></span>"
            + "</span>"
            + "<span class=\"rte-ai-inline-preview-action-group-detail\"></span>"
            + "<span class=\"rte-ai-inline-preview-action-group-body\">"
            + (innerHtml || "")
            + "</span>"
            + "</span>";
    }

    function getInlinePreviewActionContainer(wrapper, groupName) {
        if (!wrapper || !wrapper.querySelector) {
            return null;
        }
        if (groupName) {
            var groupedNode = wrapper.querySelector(".rte-ai-inline-preview-action-group.is-" + groupName + " .rte-ai-inline-preview-action-group-body");
            if (groupedNode) {
                return groupedNode;
            }
        }
        return wrapper.querySelector(".rte-ai-inline-preview-actions");
    }

    function setInlinePreviewActionGroupVisibility(wrapper, groupName, isVisible) {
        if (!wrapper || !wrapper.querySelector || !groupName) {
            return;
        }
        var groupNode = wrapper.querySelector(".rte-ai-inline-preview-action-group.is-" + groupName);
        if (!groupNode) {
            return;
        }
        groupNode.style.display = isVisible ? "" : "none";
    }

    function getInlinePreviewFocusedActionGroupName(options) {
        options = options || {};
        if (options.isPreviewTarget) {
            return "review";
        }
        var suggestion = options.suggestion;
        if (!suggestion) {
            return "";
        }
        return getInlinePreviewActionGroupName(getInlinePreviewFocusedActionName(options));
    }

    function getInlinePreviewActionGroupDisplayLabel(groupName) {
        switch (groupName) {
            case "review":
                return "Open";
            case "move":
                return "Move";
            case "decision":
                return "Decide";
            case "recovery":
                return "Recover";
            default:
                return "";
        }
    }

    function getInlinePreviewActionGroupDisplayOrder(groupName, currentGroupName) {
        var baseOrder = ["review", "move", "decision", "recovery"];
        var defaultIndex = baseOrder.indexOf(groupName);
        if (defaultIndex === -1) {
            return baseOrder.length + 1;
        }
        var currentIndex = baseOrder.indexOf(currentGroupName);
        if (currentIndex === -1) {
            return defaultIndex + 1;
        }
        if (groupName === currentGroupName) {
            return 1;
        }
        var displayOrder = 2;
        for (var orderIndex = 0; orderIndex < baseOrder.length; orderIndex++) {
            if (baseOrder[orderIndex] === currentGroupName) {
                continue;
            }
            if (baseOrder[orderIndex] === groupName) {
                return displayOrder;
            }
            displayOrder++;
        }
        return defaultIndex + 1;
    }

    function getInlinePreviewActionButtonDisplayOrder(groupName, actionName, targetActionName) {
        var baseOrder;
        switch (groupName) {
            case "review":
                baseOrder = ["review"];
                break;
            case "move":
                baseOrder = ["previous", "next"];
                break;
            case "decision":
                baseOrder = ["accept", "reject"];
                break;
            case "recovery":
                baseOrder = ["shared-seen", "undo", "redo"];
                break;
            default:
                baseOrder = [];
                break;
        }
        var defaultIndex = baseOrder.indexOf(actionName);
        if (defaultIndex === -1) {
            return baseOrder.length + 1;
        }
        if (!targetActionName) {
            return defaultIndex + 1;
        }
        var targetIndex = baseOrder.indexOf(targetActionName);
        if (targetIndex === -1) {
            return defaultIndex + 1;
        }
        if (actionName === targetActionName) {
            return 1;
        }
        var displayOrder = 2;
        for (var orderIndex = 0; orderIndex < baseOrder.length; orderIndex++) {
            if (baseOrder[orderIndex] === targetActionName) {
                continue;
            }
            if (baseOrder[orderIndex] === actionName) {
                return displayOrder;
            }
            displayOrder++;
        }
        return defaultIndex + 1;
    }

    function buildInlinePreviewActionGroupDetail(groupName, options) {
        options = options || {};
        if (options.isPreviewTarget) {
            if (groupName === "review") {
                return "Open the next review queue from this handoff surface.";
            }
            return "";
        }
        var suggestion = options.suggestion;
        if (!suggestion) {
            return "";
        }
        var queueTransitionData = options.queueTransitionData || null;
        if (!queueTransitionData && suggestion) {
            var typeFilter = getInlineReviewTypeFilter(suggestion.id);
            queueTransitionData = buildReviewQueueTransitionData(getFilteredPendingSuggestions(typeFilter), editor.__aiActiveSuggestionId, suggestion);
        }
        switch (groupName) {
            case "review":
                return "Reopen this suggestion in the current review lane.";
            case "move":
                return "Jump earlier or later in this queue before deciding.";
            case "decision":
                if (queueTransitionData && queueTransitionData.detail) {
                    return queueTransitionData.detail;
                }
                return "Apply or dismiss this AI change.";
            case "recovery":
                if (options.redoInlineContext && options.redoInlineSummaryText) {
                    return options.redoInlineSummaryText;
                }
                if (options.undoInlineContext && options.undoInlineSummaryText) {
                    return options.undoInlineSummaryText;
                }
                if (options.sharedUpdateCount) {
                    return "Clear collaboration updates and keep reviewing this suggestion.";
                }
                return "";
            default:
                return "";
        }
    }

    function buildInlinePreviewActionSummaryData(options) {
        options = options || {};
        if (options.isPreviewTarget) {
            return null;
        }
        var suggestion = options.suggestion;
        if (!suggestion) {
            return null;
        }
        var focusGroupName = getInlinePreviewFocusedActionGroupName(options);
        var focusLabel = getInlineReviewWrapperFocusLabel(options);
        var groupLabel = getInlinePreviewActionGroupDisplayLabel(focusGroupName);
        if (!focusGroupName || !focusLabel || !groupLabel) {
            return null;
        }
        var queueTransitionData = options.queueTransitionData || null;
        if (!queueTransitionData && suggestion.id) {
            var typeFilter = getInlineReviewTypeFilter(suggestion.id);
            var filteredPendingSuggestions = getFilteredPendingSuggestions(typeFilter);
            queueTransitionData = buildReviewQueueTransitionData(filteredPendingSuggestions, editor.__aiActiveSuggestionId, suggestion);
        }
        var detail = "";
        if (focusGroupName === "decision" && queueTransitionData) {
            detail = queueTransitionData.statusLabel + ". " + queueTransitionData.detail;
        }
        else if (focusGroupName === "recovery") {
            if (options.preferredAction === "undo" && options.undoInlineSummaryText) {
                detail = options.undoInlineSummaryText;
            }
            else if (options.preferredAction === "redo" && options.redoInlineSummaryText) {
                detail = options.redoInlineSummaryText;
            }
            else if (options.sharedUpdateCount) {
                detail = "Clear the shared update notice and continue reviewing this suggestion.";
            }
            else {
                detail = "Recover from a recent AI review action without leaving this suggestion.";
            }
        }
        else if (focusGroupName === "review") {
            detail = "Open this suggestion in review and keep the current inline lane ready.";
        }
        else if (focusGroupName === "move") {
            detail = "Move through the current queue before choosing a decision.";
        }
        return {
            title: "Action handoff",
            pills: [groupLabel + " lane", "Enter focuses " + focusLabel],
            detail: detail
        };
    }

    function buildInlinePreviewActionSummaryAriaLabel(summaryData) {
        if (!summaryData) {
            return "";
        }
        var parts = [];
        if (summaryData.title) {
            parts.push(summaryData.title);
        }
        if (summaryData.pills && summaryData.pills.length) {
            for (var pillIndex = 0; pillIndex < summaryData.pills.length; pillIndex++) {
                if (summaryData.pills[pillIndex]) {
                    parts.push(summaryData.pills[pillIndex]);
                }
            }
        }
        if (summaryData.detail) {
            parts.push(summaryData.detail);
        }
        return parts.join(". ");
    }

    function createInlinePreviewActionSummaryHtml(previewState) {
        var summaryData = buildInlinePreviewActionSummaryData({ suggestion: previewState });
        if (!summaryData) {
            return "";
        }
        var html = "<span class=\"rte-ai-inline-preview-action-summary\" aria-label=\"" + escapeHtml(buildInlinePreviewActionSummaryAriaLabel(summaryData)) + "\">"
            + "<span class=\"rte-ai-inline-preview-action-summary-title\">" + escapeHtml(summaryData.title) + "</span>";
        if (summaryData.pills && summaryData.pills.length) {
            html += "<span class=\"rte-ai-inline-preview-action-summary-pills\">";
            for (var pillIndex = 0; pillIndex < summaryData.pills.length; pillIndex++) {
                if (!summaryData.pills[pillIndex]) {
                    continue;
                }
                html += "<span class=\"rte-ai-inline-preview-action-summary-pill\">" + escapeHtml(summaryData.pills[pillIndex]) + "</span>";
            }
            html += "</span>";
        }
        if (summaryData.detail) {
            html += "<span class=\"rte-ai-inline-preview-action-summary-detail\">" + escapeHtml(summaryData.detail) + "</span>";
        }
        html += "</span>";
        return html;
    }

    function syncInlinePreviewActionSummaryNode(wrapper, options) {
        if (!wrapper || !wrapper.querySelector) {
            return null;
        }
        var actionsNode = wrapper.querySelector(".rte-ai-inline-preview-actions");
        var summaryData = buildInlinePreviewActionSummaryData(options);
        var summaryNode = actionsNode && actionsNode.querySelector ? actionsNode.querySelector(".rte-ai-inline-preview-action-summary") : null;
        if (!actionsNode || !summaryData) {
            if (summaryNode && summaryNode.parentNode) {
                summaryNode.parentNode.removeChild(summaryNode);
            }
            if (actionsNode) {
                actionsNode.setAttribute("aria-label", "AI suggestion actions");
            }
            return null;
        }
        var ownerDocument = actionsNode.ownerDocument || document;
        if (!summaryNode) {
            summaryNode = ownerDocument.createElement("span");
            summaryNode.className = "rte-ai-inline-preview-action-summary";
            if (actionsNode.firstChild) {
                actionsNode.insertBefore(summaryNode, actionsNode.firstChild);
            }
            else {
                actionsNode.appendChild(summaryNode);
            }
        }
        else if (actionsNode.firstChild !== summaryNode) {
            actionsNode.insertBefore(summaryNode, actionsNode.firstChild);
        }
        while (summaryNode.firstChild) {
            summaryNode.removeChild(summaryNode.firstChild);
        }
        summaryNode.setAttribute("aria-label", buildInlinePreviewActionSummaryAriaLabel(summaryData));
        append(summaryNode, "span", "", "rte-ai-inline-preview-action-summary-title", summaryData.title);
        if (summaryData.pills && summaryData.pills.length) {
            var pillsNode = append(summaryNode, "span", "", "rte-ai-inline-preview-action-summary-pills");
            for (var pillIndex = 0; pillIndex < summaryData.pills.length; pillIndex++) {
                if (!summaryData.pills[pillIndex]) {
                    continue;
                }
                append(pillsNode, "span", "", "rte-ai-inline-preview-action-summary-pill", summaryData.pills[pillIndex]);
            }
        }
        if (summaryData.detail) {
            append(summaryNode, "span", "", "rte-ai-inline-preview-action-summary-detail", summaryData.detail);
        }
        actionsNode.setAttribute("aria-label", "AI suggestion actions. " + buildInlinePreviewActionSummaryAriaLabel(summaryData));
        return summaryNode;
    }

    function syncInlinePreviewActionGroupHeaders(wrapper, options) {
        if (!wrapper || !wrapper.querySelectorAll) {
            return false;
        }
        options = options || {};
        var ownerDocument = wrapper.ownerDocument || document;
        var actionsNode = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-actions") : null;
        var focusGroupName = getInlinePreviewFocusedActionGroupName(options);
        var focusLabel = options.isPreviewTarget ? "Open queue" : getInlineReviewWrapperFocusLabel(options);
        var badgeText = focusLabel ? "Enter: " + focusLabel : "";
        var groups = wrapper.querySelectorAll(".rte-ai-inline-preview-action-group");
        var orderedGroups = [];
        for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
            var groupNode = groups[groupIndex];
            if (!groupNode) {
                continue;
            }
            orderedGroups.push(groupNode);
            var groupName = groupNode.getAttribute("data-rte-ai-inline-action-group") || "";
            var label = groupNode.getAttribute("data-rte-ai-inline-action-group-label") || "";
            var headerNode = groupNode.querySelector ? groupNode.querySelector(".rte-ai-inline-preview-action-group-header") : null;
            if (!headerNode) {
                headerNode = ownerDocument.createElement("span");
                headerNode.className = "rte-ai-inline-preview-action-group-header";
                if (groupNode.firstChild) {
                    groupNode.insertBefore(headerNode, groupNode.firstChild);
                }
                else {
                    groupNode.appendChild(headerNode);
                }
            }
            var titleNode = headerNode.querySelector ? headerNode.querySelector(".rte-ai-inline-preview-action-group-title") : null;
            if (!titleNode) {
                titleNode = ownerDocument.createElement("span");
                titleNode.className = "rte-ai-inline-preview-action-group-title";
                headerNode.appendChild(titleNode);
            }
            titleNode.textContent = label;
            var badgeNode = headerNode.querySelector ? headerNode.querySelector(".rte-ai-inline-preview-action-group-badge") : null;
            if (!badgeNode) {
                badgeNode = ownerDocument.createElement("span");
                badgeNode.className = "rte-ai-inline-preview-action-group-badge";
                headerNode.appendChild(badgeNode);
            }
            var detailNode = groupNode.querySelector ? groupNode.querySelector(".rte-ai-inline-preview-action-group-detail") : null;
            if (!detailNode) {
                detailNode = ownerDocument.createElement("span");
                detailNode.className = "rte-ai-inline-preview-action-group-detail";
                var bodyNode = groupNode.querySelector ? groupNode.querySelector(".rte-ai-inline-preview-action-group-body") : null;
                if (bodyNode) {
                    groupNode.insertBefore(detailNode, bodyNode);
                }
                else {
                    groupNode.appendChild(detailNode);
                }
            }
            var isCurrentGroup = !!badgeText && !!focusGroupName && focusGroupName === groupName;
            var detailText = buildInlinePreviewActionGroupDetail(groupName, options);
            groupNode.style.removeProperty("order");
            groupNode.setAttribute("data-rte-ai-inline-action-group-current", isCurrentGroup ? "true" : "false");
            groupNode.classList.toggle("is-current-lane", isCurrentGroup);
            if (isCurrentGroup) {
                badgeNode.textContent = badgeText;
                badgeNode.style.display = "";
                badgeNode.setAttribute("aria-label", "Current action lane. " + badgeText);
            }
            else {
                badgeNode.textContent = "";
                badgeNode.style.display = "none";
                badgeNode.removeAttribute("aria-label");
            }
            if (detailText) {
                detailNode.textContent = detailText;
                detailNode.style.display = "";
            }
            else {
                detailNode.textContent = "";
                detailNode.style.display = "none";
            }
            var ariaLabel = label ? (label + " actions") : "AI suggestion actions";
            if (detailText) {
                ariaLabel += ". " + detailText;
            }
            if (isCurrentGroup && badgeText) {
                ariaLabel += ". Current lane. " + badgeText;
            }
            groupNode.setAttribute("aria-label", ariaLabel);
        }
        if (actionsNode && orderedGroups.length) {
            orderedGroups.sort(function (a, b) {
                var aGroupName = a.getAttribute("data-rte-ai-inline-action-group") || "";
                var bGroupName = b.getAttribute("data-rte-ai-inline-action-group") || "";
                return getInlinePreviewActionGroupDisplayOrder(aGroupName, focusGroupName) - getInlinePreviewActionGroupDisplayOrder(bGroupName, focusGroupName);
            });
            for (var orderedIndex = 0; orderedIndex < orderedGroups.length; orderedIndex++) {
                actionsNode.appendChild(orderedGroups[orderedIndex]);
            }
        }
        return true;
    }

    function syncInlinePreviewEnterTargetButtonState(wrapper, options) {
        if (!wrapper || !wrapper.querySelectorAll) {
            return false;
        }
        options = options || {};
        var targetActionName = getInlinePreviewFocusedActionName(options);
        var groupedButtons = {};
        var buttons = wrapper.querySelectorAll(".rte-ai-inline-preview-button[data-rte-ai-action]");
        for (var buttonIndex = 0; buttonIndex < buttons.length; buttonIndex++) {
            var button = buttons[buttonIndex];
            if (!button || !button.getAttribute) {
                continue;
            }
            var buttonActionName = button.getAttribute("data-rte-ai-action") || "";
            var groupNode = button.closest ? button.closest(".rte-ai-inline-preview-action-group") : null;
            var groupName = groupNode && groupNode.getAttribute ? (groupNode.getAttribute("data-rte-ai-inline-action-group") || "") : "";
            if (groupName) {
                if (!groupedButtons[groupName]) {
                    groupedButtons[groupName] = [];
                }
                groupedButtons[groupName].push(button);
            }
            var isTarget = !!targetActionName && buttonActionName === targetActionName && !button.disabled;
            var ariaLabel = (button.getAttribute("aria-label") || button.textContent || "").replace(/\.\s*Current Enter target\.$/i, "");
            var title = (button.getAttribute("title") || ariaLabel).replace(/\.\s*Current Enter target\.$/i, "");
            button.setAttribute("data-rte-ai-enter-target", isTarget ? "true" : "false");
            button.classList.toggle("is-enter-target", isTarget);
            if (isTarget) {
                var shortcutKey = buttonActionName === "accept" ? "A" : (buttonActionName === "reject" ? "R" : "");
                button.setAttribute("aria-keyshortcuts", shortcutKey ? ("Enter Space " + shortcutKey) : "Enter Space");
                button.setAttribute("data-rte-ai-enter-target-label", "Enter");
                if (ariaLabel && !/current enter target/i.test(ariaLabel)) {
                    button.setAttribute("aria-label", ariaLabel + ". Current Enter target.");
                }
                if (title && !/enter or space activates this action/i.test(title)) {
                    title += ". Enter or Space activates this action";
                    if (shortcutKey) {
                        title += ". " + shortcutKey + " uses " + (button.textContent || buttonActionName) + ".";
                    }
                }
                if (title && !/current enter target/i.test(title)) {
                    button.title = title + ". Current Enter target.";
                }
            }
            else {
                button.removeAttribute("data-rte-ai-enter-target-label");
                if (ariaLabel) {
                    button.setAttribute("aria-label", ariaLabel);
                }
                if (title) {
                    button.title = title;
                }
            }
        }
        for (var groupName in groupedButtons) {
            if (!groupedButtons.hasOwnProperty(groupName)) {
                continue;
            }
            var groupBodyNode = getInlinePreviewActionContainer(wrapper, groupName);
            var groupButtons = groupedButtons[groupName];
            if (!groupBodyNode || !groupButtons || !groupButtons.length) {
                continue;
            }
            groupButtons.sort(function (a, b) {
                var aActionName = a.getAttribute("data-rte-ai-action") || "";
                var bActionName = b.getAttribute("data-rte-ai-action") || "";
                return getInlinePreviewActionButtonDisplayOrder(groupName, aActionName, targetActionName) - getInlinePreviewActionButtonDisplayOrder(groupName, bActionName, targetActionName);
            });
            for (var orderedButtonIndex = 0; orderedButtonIndex < groupButtons.length; orderedButtonIndex++) {
                groupBodyNode.appendChild(groupButtons[orderedButtonIndex]);
            }
        }
        return true;
    }

    function syncInlinePreviewReasonNode(wrapper, reasonNode, suggestion) {
        if (!wrapper) {
            return null;
        }
        var compareNode = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-compare") : null;
        var reasonText = buildCompletionPreviewReason(suggestion);
        if (!compareNode || !reasonText) {
            if (reasonNode && reasonNode.parentNode) {
                reasonNode.parentNode.removeChild(reasonNode);
            }
            return null;
        }
        if (!reasonNode || reasonNode.parentNode !== compareNode) {
            if (reasonNode && reasonNode.parentNode) {
                reasonNode.parentNode.removeChild(reasonNode);
            }
            reasonNode = document.createElement("span");
            reasonNode.className = "rte-ai-inline-preview-reason";
            var oldNode = compareNode.querySelector ? compareNode.querySelector(".rte-ai-inline-preview-old") : null;
            var newNode = !oldNode && compareNode.querySelector ? compareNode.querySelector(".rte-ai-inline-preview-new") : null;
            var anchorNode = oldNode || newNode;
            if (anchorNode) {
                compareNode.insertBefore(reasonNode, anchorNode);
            }
            else {
                compareNode.appendChild(reasonNode);
            }
        }
        var labelNode = reasonNode.querySelector ? reasonNode.querySelector(".rte-ai-inline-preview-reason-label") : null;
        var copyNode = reasonNode.querySelector ? reasonNode.querySelector(".rte-ai-inline-preview-reason-copy") : null;
        if (!labelNode || !copyNode) {
            while (reasonNode.firstChild) {
                reasonNode.removeChild(reasonNode.firstChild);
            }
            labelNode = null;
            copyNode = null;
        }
        if (!labelNode) {
            labelNode = document.createElement("span");
            labelNode.className = "rte-ai-inline-preview-reason-label";
            reasonNode.appendChild(labelNode);
        }
        labelNode.textContent = "Why";
        if (!copyNode) {
            copyNode = document.createElement("span");
            copyNode.className = "rte-ai-inline-preview-reason-copy";
            reasonNode.appendChild(copyNode);
        }
        copyNode.textContent = reasonText;
        reasonNode.setAttribute("aria-label", "Why this suggestion: " + reasonText);
        reasonNode.title = reasonText;
        return reasonNode;
    }

    function syncInlinePreviewPlanNode(wrapper, planNode, suggestion) {
        if (!wrapper) {
            return null;
        }
        var compareNode = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-compare") : null;
        var planData = buildInlinePreviewPlanData(suggestion);
        if (!compareNode || !planData) {
            if (planNode && planNode.parentNode) {
                planNode.parentNode.removeChild(planNode);
            }
            return null;
        }
        if (!planNode || planNode.parentNode !== compareNode) {
            if (planNode && planNode.parentNode) {
                planNode.parentNode.removeChild(planNode);
            }
            planNode = document.createElement("span");
            planNode.className = "rte-ai-inline-preview-plan";
            compareNode.appendChild(planNode);
        }
        while (planNode.firstChild) {
            planNode.removeChild(planNode.firstChild);
        }
        append(planNode, "span", "", "rte-ai-inline-preview-plan-title", planData.title);
        var itemsNode = append(planNode, "span", "", "rte-ai-inline-preview-plan-items");
        for (var itemIndex = 0; itemIndex < planData.items.length; itemIndex++) {
            if (!planData.items[itemIndex]) {
                continue;
            }
            append(itemsNode, "span", "", "rte-ai-inline-preview-plan-item", planData.items[itemIndex]);
        }
        if (planData.detail) {
            append(planNode, "span", "", "rte-ai-inline-preview-plan-detail", planData.detail);
        }
        appendInlinePlanPreviewNode(planNode, planData);
        if (planData.followupTitle || planData.followupDetail) {
            var followupNode = append(planNode, "span", "", "rte-ai-inline-preview-plan-followup");
            if (planData.followupTitle) {
                append(followupNode, "span", "", "rte-ai-inline-preview-plan-followup-title", planData.followupTitle);
            }
            if (planData.followupDetail) {
                append(followupNode, "span", "", "rte-ai-inline-preview-plan-followup-detail", planData.followupDetail);
            }
        }
        return planNode;
    }

    function syncInlinePreviewShortcutNode(wrapper, shortcutsChip) {
        if (!wrapper || !shortcutsChip) {
            return shortcutsChip;
        }
        var compareNode = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-compare") : null;
        if (!compareNode) {
            return shortcutsChip;
        }
        var planNode = compareNode.querySelector ? compareNode.querySelector(".rte-ai-inline-preview-plan") : null;
        if (planNode && planNode.parentNode === compareNode) {
            if (planNode.nextSibling !== shortcutsChip) {
                if (planNode.nextSibling) {
                    compareNode.insertBefore(shortcutsChip, planNode.nextSibling);
                }
                else {
                    compareNode.appendChild(shortcutsChip);
                }
            }
            return shortcutsChip;
        }
        if (compareNode.lastChild !== shortcutsChip) {
            compareNode.appendChild(shortcutsChip);
        }
        return shortcutsChip;
    }

    function syncInlinePreviewCompareMetaNode(wrapper, suggestion) {
        if (!wrapper) {
            return null;
        }
        var compareNode = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-compare") : null;
        if (!compareNode) {
            return null;
        }
        var proposalData = buildInlinePreviewProposalData(suggestion);
        var metaNode = compareNode.querySelector ? compareNode.querySelector(".rte-ai-inline-preview-compare-meta") : null;
        if (!proposalData) {
            if (metaNode && metaNode.parentNode) {
                metaNode.parentNode.removeChild(metaNode);
            }
            return null;
        }
        if (!metaNode) {
            metaNode = document.createElement("span");
            metaNode.className = "rte-ai-inline-preview-compare-meta";
            var headerNode = compareNode.querySelector ? compareNode.querySelector(".rte-ai-inline-preview-compare-header") : null;
            if (headerNode && headerNode.nextSibling) {
                compareNode.insertBefore(metaNode, headerNode.nextSibling);
            }
            else {
                compareNode.appendChild(metaNode);
            }
        }
        while (metaNode.firstChild) {
            metaNode.removeChild(metaNode.firstChild);
        }
        append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-status", proposalData.statusLabel);
        if (proposalData.openedLabel) {
            append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-opened", proposalData.openedLabel);
        }
        if (proposalData.remoteLabel) {
            append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-remote", proposalData.remoteLabel);
        }
        if (proposalData.entryLabel) {
            append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-entry", proposalData.entryLabel);
        }
        if (proposalData.queueRoleLabel) {
            append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-queue", proposalData.queueRoleLabel);
        }
        if (proposalData.queueLabel) {
            append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-position", proposalData.queueLabel);
        }
        if (proposalData.typeLabel) {
            append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-type", proposalData.typeLabel);
        }
        if (proposalData.languageLabel) {
            append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-language", proposalData.languageLabel);
        }
        append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-scope", proposalData.scopeLabel);
        append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-steps", proposalData.stepLabel);
        if (proposalData.targetLabel) {
            append(metaNode, "span", "", "rte-ai-inline-preview-compare-pill is-target", proposalData.targetLabel);
        }
        return metaNode;
    }

    function buildInlinePreviewCompareGlanceData(source) {
        var glanceData = source && source.pills ? source : buildReviewChangeGlanceData(source);
        if (!glanceData) {
            return null;
        }
        var pills = [];
        if (glanceData.pills && glanceData.pills.length) {
            for (var pillIndex = 0; pillIndex < glanceData.pills.length; pillIndex++) {
                var glancePill = glanceData.pills[pillIndex];
                if (!glancePill || !glancePill.text || glancePill.kind === "scope") {
                    continue;
                }
                pills.push(glancePill);
            }
        }
        if (!pills.length && !glanceData.detail) {
            return null;
        }
        return {
            title: glanceData.title || "Change at a glance",
            pills: pills,
            detail: glanceData.detail || ""
        };
    }

    function syncInlinePreviewCompareGlanceNode(wrapper, source) {
        if (!wrapper) {
            return null;
        }
        var compareNode = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-compare") : null;
        var compareGlanceData = buildInlinePreviewCompareGlanceData(source);
        var glanceNode = compareNode && compareNode.querySelector ? compareNode.querySelector(".rte-ai-inline-preview-compare-glance") : null;
        if (!compareNode || !compareGlanceData) {
            if (glanceNode && glanceNode.parentNode) {
                glanceNode.parentNode.removeChild(glanceNode);
            }
            return null;
        }
        if (!glanceNode) {
            glanceNode = document.createElement("span");
            glanceNode.className = "rte-ai-inline-preview-compare-glance";
            var compareContentNode = compareNode.querySelector ? compareNode.querySelector(".rte-ai-inline-preview-old") : null;
            if (compareContentNode) {
                compareNode.insertBefore(glanceNode, compareContentNode);
            }
            else {
                compareNode.appendChild(glanceNode);
            }
        }
        while (glanceNode.firstChild) {
            glanceNode.removeChild(glanceNode.firstChild);
        }
        append(glanceNode, "span", "", "rte-ai-inline-preview-compare-glance-title", compareGlanceData.title);
        if (compareGlanceData.pills && compareGlanceData.pills.length) {
            var pillsNode = append(glanceNode, "span", "", "rte-ai-inline-preview-compare-glance-pills");
            for (var glancePillIndex = 0; glancePillIndex < compareGlanceData.pills.length; glancePillIndex++) {
                var pill = compareGlanceData.pills[glancePillIndex];
                if (!pill || !pill.text) {
                    continue;
                }
                append(pillsNode, "span", "", "rte-ai-review-item-glance-pill is-" + (pill.kind || "other"), pill.text);
            }
        }
        if (compareGlanceData.detail) {
            append(glanceNode, "span", "", "rte-ai-inline-preview-compare-glance-detail", compareGlanceData.detail);
        }
        return glanceNode;
    }

    function createInlinePreviewComparePartHtml(tagName, partClass, label, contentHtml) {
        var resolvedTag = tagName || "span";
        return ""
            + "<" + resolvedTag + " class=\"" + partClass + "\" aria-label=\"" + escapeHtml(label) + " text\">"
            + "<span class=\"rte-ai-inline-preview-compare-label\">" + escapeHtml(label) + "</span>"
            + "<" + resolvedTag + " class=\"rte-ai-inline-preview-compare-text\">" + contentHtml + "</" + resolvedTag + ">"
            + "</" + resolvedTag + ">";
    }

    function buildInlinePreviewCompareHeaderData(previewState) {
        var isPreviewTarget = !!(previewState && previewState.id && editor.__aiReviewEmptyPreviewSuggestionId === previewState.id);
        if (isPreviewTarget) {
            return {
                title: "Queue handoff",
                detail: "Open the next review queue"
            };
        }
        return {
            title: "Proposed edit",
            detail: "Current and suggested text"
        };
    }

    function syncInlinePreviewCompareHeaderNode(wrapper, previewState) {
        if (!wrapper) {
            return null;
        }
        var compareNode = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-compare") : null;
        if (!compareNode) {
            return null;
        }
        var headerData = buildInlinePreviewCompareHeaderData(previewState);
        var headerNode = compareNode.querySelector ? compareNode.querySelector(".rte-ai-inline-preview-compare-header") : null;
        if (!headerNode) {
            headerNode = document.createElement("span");
            headerNode.className = "rte-ai-inline-preview-compare-header";
            if (compareNode.firstChild) {
                compareNode.insertBefore(headerNode, compareNode.firstChild);
            }
            else {
                compareNode.appendChild(headerNode);
            }
        }
        var titleNode = headerNode.querySelector ? headerNode.querySelector(".rte-ai-inline-preview-compare-title") : null;
        var detailNode = headerNode.querySelector ? headerNode.querySelector(".rte-ai-inline-preview-compare-detail") : null;
        if (!titleNode) {
            titleNode = document.createElement("span");
            titleNode.className = "rte-ai-inline-preview-compare-title";
            headerNode.appendChild(titleNode);
        }
        if (!detailNode) {
            detailNode = document.createElement("span");
            detailNode.className = "rte-ai-inline-preview-compare-detail";
            headerNode.appendChild(detailNode);
        }
        titleNode.textContent = headerData.title;
        detailNode.textContent = headerData.detail;
        compareNode.setAttribute("aria-label", headerData.title + ". " + headerData.detail);
        return headerNode;
    }

    function buildInlinePreviewProposalData(previewState) {
        if (!previewState) {
            return null;
        }
        var isPreviewTarget = !!(previewState.id && editor.__aiReviewEmptyPreviewSuggestionId === previewState.id);
        var typeFilter = previewState.id ? getInlineReviewTypeFilter(previewState.id) : "";
        var filteredPendingSuggestions = previewState.id ? getFilteredPendingSuggestions(typeFilter) : [];
        var queuePositionData = previewState.id ? buildReviewQueuePositionData(filteredPendingSuggestions, editor.__aiActiveSuggestionId, previewState) : null;
        var remoteUpdateCount = previewState.id ? getSuggestionRemoteUpdateCount(previewState.id) : 0;
        var focusLabel = isPreviewTarget
            ? (getReviewFocusActionDisplayLabel(previewState, getPreferredReviewActionFocus()) || getReviewFocusActionDisplayLabel(previewState, ""))
            : getInlineReviewWrapperFocusLabel({ suggestion: previewState });
        var typeLabel = previewState.suggestionType && getSuggestionTypeValue(previewState.suggestionType) !== "other"
            ? getSuggestionTypeLabel(previewState.suggestionType)
            : "";
        var languageLabel = previewState.language ? getTranslateLanguageLabel(previewState.language) : "";
        return {
            statusLabel: isPreviewTarget ? "Queue handoff" : "Ready to review",
            openedLabel: editor.__aiRecentlyOpenedQueueSuggestionId === previewState.id ? "Queue opened" : "",
            remoteLabel: remoteUpdateCount > 1 ? remoteUpdateCount + " shared updates" : (remoteUpdateCount ? "Shared update" : ""),
            queueRoleLabel: isPreviewTarget ? "Next queue" : (queuePositionData ? queuePositionData.roleLabel : ""),
            queueLabel: !isPreviewTarget && queuePositionData ? queuePositionData.queueLabel : "",
            typeLabel: typeLabel,
            languageLabel: languageLabel,
            scopeLabel: (getSuggestionScopeLabel(previewState) || "Selection") + " draft",
            stepLabel: "1 step",
            entryLabel: isPreviewTarget ? getSuggestionQueueActionLabel(previewState) : "",
            targetLabel: focusLabel ? "Focus " + focusLabel : ""
        };
    }

    function buildInlinePreviewPlanData(previewState) {
        if (!previewState || !previewState.id) {
            return null;
        }
        var typeFilter = getInlineReviewTypeFilter(previewState.id);
        var filteredPendingSuggestions = getFilteredPendingSuggestions(typeFilter);
        var queueTransitionData = buildReviewQueueTransitionData(filteredPendingSuggestions, editor.__aiActiveSuggestionId, previewState);
        if (!queueTransitionData) {
            return null;
        }
        var items = [queueTransitionData.statusLabel, queueTransitionData.queueLabel];
        if (queueTransitionData.followupStatusLabel) {
            items.push(queueTransitionData.followupStatusLabel);
        }
        return {
            title: "What happens next",
            items: items,
            detail: queueTransitionData.detail || "",
            previewLabel: queueTransitionData.previewLabel || "",
            previewText: queueTransitionData.previewText || "",
            preview: getQueueTransitionPreviewSummary(queueTransitionData),
            followupTitle: queueTransitionData.followupTitle || "",
            followupDetail: queueTransitionData.followupDetail || ""
        };
    }

    function appendInlinePlanPreviewNode(planNode, planData) {
        if (!planNode || !planData || (!planData.preview && !planData.previewLabel && !planData.previewText)) {
            return null;
        }
        var previewNode = append(planNode, "span", "", "rte-ai-inline-preview-plan-preview");
        if (planData.previewLabel) {
            append(previewNode, "span", "", "rte-ai-inline-preview-plan-preview-label", planData.previewLabel + ":");
        }
        if (planData.previewText) {
            append(previewNode, "span", "", "rte-ai-inline-preview-plan-preview-text", planData.previewText);
        }
        if (!planData.previewLabel && !planData.previewText && planData.preview) {
            previewNode.textContent = planData.preview;
        }
        return previewNode;
    }

    function buildInlinePlanPreviewHtml(planData) {
        if (!planData || (!planData.preview && !planData.previewLabel && !planData.previewText)) {
            return "";
        }
        var html = "<span class=\"rte-ai-inline-preview-plan-preview\">";
        if (planData.previewLabel) {
            html += "<span class=\"rte-ai-inline-preview-plan-preview-label\">" + escapeHtml(planData.previewLabel) + ":</span>";
        }
        if (planData.previewText) {
            html += "<span class=\"rte-ai-inline-preview-plan-preview-text\">" + escapeHtml(planData.previewText) + "</span>";
        }
        if (!planData.previewLabel && !planData.previewText && planData.preview) {
            html += escapeHtml(planData.preview);
        }
        html += "</span>";
        return html;
    }

    function createInlinePreviewCompareHtml(tagName, oldHtml, newHtml, previewState) {
        var resolvedTag = tagName || "span";
        var headerData = buildInlinePreviewCompareHeaderData(previewState);
        var proposalData = buildInlinePreviewProposalData(previewState);
        var compareGlanceData = buildInlinePreviewCompareGlanceData(previewState);
        var reasonText = buildCompletionPreviewReason(previewState);
        var planData = buildInlinePreviewPlanData(previewState);
        var metaHtml = proposalData
            ? "<span class=\"rte-ai-inline-preview-compare-meta\">"
                + "<span class=\"rte-ai-inline-preview-compare-pill is-status\">" + escapeHtml(proposalData.statusLabel) + "</span>"
                + (proposalData.openedLabel ? "<span class=\"rte-ai-inline-preview-compare-pill is-opened\">" + escapeHtml(proposalData.openedLabel) + "</span>" : "")
                + (proposalData.remoteLabel ? "<span class=\"rte-ai-inline-preview-compare-pill is-remote\">" + escapeHtml(proposalData.remoteLabel) + "</span>" : "")
                + (proposalData.entryLabel ? "<span class=\"rte-ai-inline-preview-compare-pill is-entry\">" + escapeHtml(proposalData.entryLabel) + "</span>" : "")
                + (proposalData.queueRoleLabel ? "<span class=\"rte-ai-inline-preview-compare-pill is-queue\">" + escapeHtml(proposalData.queueRoleLabel) + "</span>" : "")
                + (proposalData.queueLabel ? "<span class=\"rte-ai-inline-preview-compare-pill is-position\">" + escapeHtml(proposalData.queueLabel) + "</span>" : "")
                + (proposalData.typeLabel ? "<span class=\"rte-ai-inline-preview-compare-pill is-type\">" + escapeHtml(proposalData.typeLabel) + "</span>" : "")
                + (proposalData.languageLabel ? "<span class=\"rte-ai-inline-preview-compare-pill is-language\">" + escapeHtml(proposalData.languageLabel) + "</span>" : "")
                + "<span class=\"rte-ai-inline-preview-compare-pill is-scope\">" + escapeHtml(proposalData.scopeLabel) + "</span>"
                + "<span class=\"rte-ai-inline-preview-compare-pill is-steps\">" + escapeHtml(proposalData.stepLabel) + "</span>"
                + (proposalData.targetLabel ? "<span class=\"rte-ai-inline-preview-compare-pill is-target\">" + escapeHtml(proposalData.targetLabel) + "</span>" : "")
            + "</span>"
            : "";
        var glanceHtml = "";
        if (compareGlanceData) {
            glanceHtml = "<span class=\"rte-ai-inline-preview-compare-glance\">"
                + "<span class=\"rte-ai-inline-preview-compare-glance-title\">" + escapeHtml(compareGlanceData.title) + "</span>";
            if (compareGlanceData.pills && compareGlanceData.pills.length) {
                glanceHtml += "<span class=\"rte-ai-inline-preview-compare-glance-pills\">";
                for (var pillIndex = 0; pillIndex < compareGlanceData.pills.length; pillIndex++) {
                    var glancePill = compareGlanceData.pills[pillIndex];
                    if (!glancePill || !glancePill.text) {
                        continue;
                    }
                    glanceHtml += "<span class=\"rte-ai-review-item-glance-pill is-" + escapeHtml(glancePill.kind || "other") + "\">" + escapeHtml(glancePill.text) + "</span>";
                }
                glanceHtml += "</span>";
            }
            if (compareGlanceData.detail) {
                glanceHtml += "<span class=\"rte-ai-inline-preview-compare-glance-detail\">" + escapeHtml(compareGlanceData.detail) + "</span>";
            }
            glanceHtml += "</span>";
        }
        var reasonHtml = reasonText
            ? "<span class=\"rte-ai-inline-preview-reason\" aria-label=\"Why this suggestion: " + escapeHtml(reasonText) + "\" title=\"" + escapeHtml(reasonText) + "\">"
                + "<span class=\"rte-ai-inline-preview-reason-label\">Why</span>"
                + "<span class=\"rte-ai-inline-preview-reason-copy\">" + escapeHtml(reasonText) + "</span>"
            + "</span>"
            : "";
        var planHtml = "";
        if (planData) {
            planHtml = "<span class=\"rte-ai-inline-preview-plan\">"
                + "<span class=\"rte-ai-inline-preview-plan-title\">" + escapeHtml(planData.title) + "</span>"
                + "<span class=\"rte-ai-inline-preview-plan-items\">";
            for (var itemIndex = 0; itemIndex < planData.items.length; itemIndex++) {
                if (!planData.items[itemIndex]) {
                    continue;
                }
                planHtml += "<span class=\"rte-ai-inline-preview-plan-item\">" + escapeHtml(planData.items[itemIndex]) + "</span>";
            }
            planHtml += "</span>";
            if (planData.detail) {
                planHtml += "<span class=\"rte-ai-inline-preview-plan-detail\">" + escapeHtml(planData.detail) + "</span>";
            }
            planHtml += buildInlinePlanPreviewHtml(planData);
            if (planData.followupTitle || planData.followupDetail) {
                planHtml += "<span class=\"rte-ai-inline-preview-plan-followup\">";
                if (planData.followupTitle) {
                    planHtml += "<span class=\"rte-ai-inline-preview-plan-followup-title\">" + escapeHtml(planData.followupTitle) + "</span>";
                }
                if (planData.followupDetail) {
                    planHtml += "<span class=\"rte-ai-inline-preview-plan-followup-detail\">" + escapeHtml(planData.followupDetail) + "</span>";
                }
                planHtml += "</span>";
            }
            planHtml += "</span>";
        }
        return ""
            + "<" + resolvedTag + " class=\"rte-ai-inline-preview-compare\" aria-label=\"" + escapeHtml(headerData.title + ". " + headerData.detail) + "\">"
            + "<span class=\"rte-ai-inline-preview-compare-header\">"
            + "<span class=\"rte-ai-inline-preview-compare-title\">" + escapeHtml(headerData.title) + "</span>"
            + "<span class=\"rte-ai-inline-preview-compare-detail\">" + escapeHtml(headerData.detail) + "</span>"
            + "</span>"
            + metaHtml
            + glanceHtml
            + reasonHtml
            + createInlinePreviewComparePartHtml(resolvedTag, "rte-ai-inline-preview-old", "Current", oldHtml)
            + createInlinePreviewComparePartHtml(resolvedTag, "rte-ai-inline-preview-new", "Suggested", newHtml)
            + planHtml
            + "</" + resolvedTag + ">";
    }

    function createInlinePreviewHtml(previewState) {
        var isBlock = !!previewState.isBlock;
        var wrapperTag = isBlock ? "div" : "span";
        var partTag = isBlock ? "div" : "span";
        var oldHtml = previewState.originalHtml || textToInlineHtml(previewState.originalText || "");
        var newHtml = previewState.resultHtml || textToInlineHtml(previewState.resultText || "");
        var reviewActionsHtml = createInlinePreviewActionGroupHtml("review", "Open",
            "<button type=\"button\" class=\"rte-ai-inline-preview-button is-review\" data-rte-ai-action=\"review\">Review</button>"
        );
        var moveActionsHtml = createInlinePreviewActionGroupHtml("move", "Move",
            "<button type=\"button\" class=\"rte-ai-inline-preview-button is-previous\" data-rte-ai-action=\"previous\">Previous</button>"
            + "<button type=\"button\" class=\"rte-ai-inline-preview-button is-next\" data-rte-ai-action=\"next\">Next</button>"
        );
        var decisionActionsHtml = createInlinePreviewActionGroupHtml("decision", "Decide",
            "<button type=\"button\" class=\"rte-ai-inline-preview-button is-accept\" data-rte-ai-action=\"accept\">Accept</button>"
            + "<button type=\"button\" class=\"rte-ai-inline-preview-button is-reject\" data-rte-ai-action=\"reject\">Reject</button>"
        );
        var recoveryActionsHtml = createInlinePreviewActionGroupHtml("recovery", "Recover", "");
        var actionSummaryHtml = createInlinePreviewActionSummaryHtml(previewState);

        return ""
            + "<" + wrapperTag + " class=\"rte-ai-inline-preview is-review-surface" + (isBlock ? " is-block" : " is-inline") + "\" contenteditable=\"false\" tabindex=\"-1\" role=\"group\" aria-label=\"AI suggestion preview\" data-rte-ai-preview-id=\"" + previewState.id + "\" data-rte-ai-suggestion-id=\"" + previewState.id + "\">"
            + createInlinePreviewCompareHtml(partTag, oldHtml, newHtml, previewState)
            + "<span class=\"rte-ai-inline-preview-actions\" role=\"group\" aria-label=\"AI suggestion actions\">"
            + actionSummaryHtml
            + reviewActionsHtml
            + moveActionsHtml
            + decisionActionsHtml
            + recoveryActionsHtml
            + "</span>"
            + "</" + wrapperTag + ">";
    }

    function previewInlineSuggestion(result, options) {
        var clean = normalizeText(result);
        if (!clean) {
            return false;
        }

        options = options || {};
        var snapshot = options.snapshot || captureSelectionSnapshot();
        if (!snapshot || !snapshot.hasSelection) {
            return false;
        }

        clearPreviewStateIfMissing();

        var isBlock = hasBlockMarkup(snapshot.html);
        var previewState = {
            id: "ai-preview-" + new Date().getTime(),
            snapshot: snapshot,
            originalHtml: snapshot.html,
            originalText: snapshot.text,
            resultText: clean,
            resultHtml: isBlock ? textToHtml(clean) : textToInlineHtml(clean),
            reason: options.reason || "",
            suggestionType: getSuggestionTypeValue(options.suggestionType || ""),
            language: options.language || "",
            isBlock: isBlock,
            status: "pending",
            createdAt: new Date().getTime(),
            sourceLabel: options.sourceLabel || buildSuggestionSourceLabel(options.suggestionType || "", snapshot, options.language || "")
        };

        getSuggestionStore().push(previewState);
        setActiveSuggestionId(previewState.id);

        if (!restoreSelection(snapshot, false)) {
            var suggestions = getSuggestionStore();
            suggestions.splice(suggestions.length - 1, 1);
            setActiveSuggestionId(null);
            return false;
        }

        if (editor.__aiBindInlinePreviewEventHandlers) {
            editor.__aiBindInlinePreviewEventHandlers();
        }
        editor.insertHTML(createInlinePreviewHtml(previewState));
        persistSuggestionStore();
        emitReviewLogEvent("suggestion-created", previewState);
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(false);
        }
        editor.focus();
        return true;
    }

    function insertAiComment(note, options) {
        var clean = normalizeText(note);
        if (!clean) {
            return false;
        }

        options = options || {};
        var snapshot = options.snapshot || captureSelectionSnapshot();

        clearPreviewStateIfMissing();

        if (!restoreSelection(snapshot, true)) {
            editor.focus();
        }

        editor.insertHTML('<span class="rte-comment-marker" data-comment="' + escapeAttribute(clean) + '" data-rte-comment="' + escapeAttribute(clean) + '" contenteditable="false" style="background:#fff9c4;border:1px solid #f9a825;border-radius:3px;padding:1px 6px;font-size:11px;color:#f57f17;cursor:pointer;" title="' + escapeAttribute(clean) + '" aria-label="' + escapeAttribute(clean) + '">&#128172; AI Comment</span>');
        syncSuggestionStates();
        persistSuggestionStore();
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(false);
        }
        editor.focus();
        return true;
    }

    function renderActionMenu(panel) {
        panel.classList.add("rte-panel-aiassist-menu");

        // 2026-05-09 (v20260509j): menu opens FROM the toolbar AI button
        // which already shows the gradient AI icon + "Ask AI" tooltip, so
        // the in-menu title row was just delaying the user's eye from
        // landing on the actual action grid. Title nodes are kept
        // detached so any external integration that walks
        // `.rte-ai-menu-info` / `.rte-ai-menu-title` selectors still
        // resolves without throwing. Click-outside dismisses via the
        // editor's standard popup handler; ESC dismisses via keydown.
        // Same shape Notion AI's slash menu / Linear's command palette
        // use — the menu opens straight onto the choices.
        var info = document.createElement("div");
        info.className = "rte-ai-menu-info is-minimal is-detached";
        var titleRow = append(info, "div", "", "rte-ai-menu-title-row");
        var titleIcon = append(titleRow, "span", "", "rte-ai-menu-title-icon");
        titleIcon.innerHTML = config.svgCode_aiassist || "";
        append(titleRow, "div", "", "rte-ai-menu-title", config.text_aiassist || "Ask AI");

        // 2026-05-27 (v20260527a): type-to-filter search bar pinned to the
        // top of the menu. Pre-pass the 9 default actions sat as a flat
        // 2-column grid with no keyboard navigation — mouse users had to
        // visually scan the grid, and keyboard users had to tab through
        // every item. Every reference inline AI surface ships a filter
        // input at the top of the action menu: Notion AI slash menu
        // ("Filter…"), Linear command palette, ChatGPT `/` suggestions,
        // VS Code command palette, GitHub command bar. Auto-focused on
        // open so a user can immediately type to narrow the list. Arrow
        // up/down cycles through the visible items with an active-row
        // highlight; Enter invokes the highlighted item; ESC clears the
        // query and unfocuses. The 9-item grid is small enough that the
        // filter is mostly a power-user / a11y win, but it costs ~30px
        // of vertical chrome and turns a mouse-only surface into a
        // keyboard-first one — exactly the kind of "easy to use" lift
        // the AI window passes have been chasing.
        var searchRow = append(panel, "div", "", "rte-ai-menu-search-row");
        // 2026-06-05 (v20260605a): leading magnifier glyph rendered INSIDE
        // the filter row at the input's left edge. Pre-pass the input was
        // a bare textbox carrying only a "Filter actions…" placeholder —
        // first-time users had to read the placeholder copy to understand
        // the input's purpose. Same shape Notion AI slash menu / Linear
        // command palette / Raycast / VS Code command palette ship — a
        // small outline magnifier glyph at the input's left edge so the
        // search affordance reads at a glance even before the placeholder
        // text. Pointer-events:none on the icon (via CSS) so users can
        // still click anywhere in the input to focus the textbox.
        var searchIcon = append(searchRow, "span", "", "rte-ai-menu-search-icon");
        searchIcon.setAttribute("aria-hidden", "true");
        searchIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M19 19l-3.4-3.4"/></svg>';
        var searchInput = panel.ownerDocument.createElement("input");
        searchInput.type = "text";
        searchInput.className = "rte-ai-menu-search-input";
        searchInput.placeholder = "Filter actions…";
        searchInput.setAttribute("aria-label", "Filter AI actions");
        searchInput.setAttribute("autocomplete", "off");
        searchInput.setAttribute("spellcheck", "false");
        searchRow.appendChild(searchInput);

        var actions = getActionDefinitions();
        var lastSection = "";
        var itemEntries = [];
        for (var i = 0; i < actions.length; i++) {
            (function (action) {
                // 2026-05-13 (v20260513c): "Start" / "Quick edit" / "Insert"
                // section labels dropped. With 9 items the menu has always
                // fit on one screen, and the labels were 9px uppercase caps
                // claiming ~22px each (66px total) above choices the icons
                // already typed visually (chat/dialog/review at the top,
                // proofread/rewrite/translate/justify in the middle, comment/
                // paragraph at the bottom). Same flat-list shape Notion AI's
                // slash menu, Linear's command palette, and ChatGPT's `/`
                // suggestions ship — they sort by use frequency without
                // pretending three items per category is a category. Section
                // nodes still appended as detached helpers so any external
                // integration that walks `.rte-ai-menu-section` resolves.
                if (action.section && action.section !== lastSection) {
                    var sectionNode = document.createElement("div");
                    sectionNode.className = "rte-ai-menu-section is-detached";
                    sectionNode.textContent = action.section;
                    lastSection = action.section;
                }
                var button = append(panel, "button", "", "rte-ai-menu-item");
                button.type = "button";
                // 2026-06-06 (v20260606a): surface the action section on the
                // button so CSS can tint the icon tile by section group.
                // Pre-pass the 9 items all rendered with the identical
                // `#f3f7fd` icon background — the 3 logical groupings
                // (Start: Chat/Draft/Review open workspaces; Quick edit:
                // Proofread/Rewrite/Translate/Explain preview a transform;
                // Insert: Add note/Add paragraph append content) gave the
                // user no at-a-glance signal which row family they were
                // looking at. The previous "Start" / "Quick edit" / "Insert"
                // uppercase captions were dropped in v20260513c because they
                // claimed ~22px each (~66px total) of vertical chrome. A
                // per-section icon tint restores the grouping signal at
                // zero vertical cost — same shape Notion AI slash menu /
                // ChatGPT `/` suggestions ship for sectioned command lists
                // where the divider would dominate the layout.
                if (action.section) {
                    button.setAttribute("data-section", action.section);
                }
                // 2026-06-02 (v20260602a): expose the action description via
                // the native title attribute so hover surfaces what each item
                // does without restoring the inline `display:none` copy span.
                // Pre-pass the title-only rows were dense but ambiguous —
                // "Justify", "Explain", "Add note" gave first-time users no
                // signal about what AI would actually do. Same shape Notion
                // AI slash menu / Linear command palette / VS Code command
                // palette ship — terse visible labels backed by a hover
                // tooltip that names the side effect. Zero layout cost; the
                // 26px row floor and 2-col grid measure identically.
                if (action.description) {
                    button.title = action.description;
                    button.setAttribute("aria-label", (action.title || action.id) + " — " + action.description);
                }
                var icon = append(button, "span", "", "rte-ai-menu-item-icon");
                icon.innerHTML = getActionIconSvg(action);
                var body = append(button, "span", "", "rte-ai-menu-item-body");
                append(body, "span", "", "rte-ai-menu-item-title", action.title || action.id);
                append(body, "span", "", "rte-ai-menu-item-copy", action.description || "");
                button.onclick = function (e) {
                    if (e && e.preventDefault) e.preventDefault();
                    if (e && e.stopPropagation) e.stopPropagation();
                    if (editor.closeCurrentPopup) editor.closeCurrentPopup();
                    runQuickAction(action.id);
                };
                button.addEventListener("mouseenter", function () {
                    setActiveButton(button);
                });
                itemEntries.push({ button: button, action: action });
            })(actions[i]);
        }

        function setActiveButton(target) {
            for (var k = 0; k < itemEntries.length; k++) {
                var entry = itemEntries[k];
                var isActive = entry.button === target;
                if (isActive) {
                    entry.button.classList.add("is-active");
                }
                else {
                    entry.button.classList.remove("is-active");
                }
            }
            if (target && typeof target.scrollIntoView === "function") {
                try {
                    target.scrollIntoView({ block: "nearest" });
                }
                catch (ignoreScroll) {
                    target.scrollIntoView();
                }
            }
        }

        function getVisibleButtons() {
            var visible = [];
            for (var k = 0; k < itemEntries.length; k++) {
                if (!itemEntries[k].button.hidden) {
                    visible.push(itemEntries[k].button);
                }
            }
            return visible;
        }

        function applyFilter(rawQuery) {
            var query = (rawQuery || "").trim().toLowerCase();
            var firstMatch = null;
            for (var k = 0; k < itemEntries.length; k++) {
                var entry = itemEntries[k];
                var haystack = ((entry.action.title || "") + " " + (entry.action.description || "") + " " + (entry.action.id || "")).toLowerCase();
                var matches = !query || haystack.indexOf(query) !== -1;
                entry.button.hidden = !matches;
                if (matches && !firstMatch) {
                    firstMatch = entry.button;
                }
            }
            // Empty-state hint when no item matches the query.
            if (!firstMatch) {
                if (!searchRow.__aiEmptyHint) {
                    var hint = panel.ownerDocument.createElement("div");
                    hint.className = "rte-ai-menu-empty-hint";
                    hint.textContent = "No actions match.";
                    panel.appendChild(hint);
                    searchRow.__aiEmptyHint = hint;
                }
                searchRow.__aiEmptyHint.hidden = false;
            }
            else if (searchRow.__aiEmptyHint) {
                searchRow.__aiEmptyHint.hidden = true;
            }
            setActiveButton(firstMatch);
        }

        searchInput.addEventListener("input", function () {
            applyFilter(searchInput.value);
        });
        searchInput.addEventListener("keydown", function (e) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                var visible = getVisibleButtons();
                if (!visible.length) return;
                var idx = -1;
                for (var k = 0; k < visible.length; k++) {
                    if (visible[k].classList.contains("is-active")) { idx = k; break; }
                }
                var next;
                if (e.key === "ArrowDown") {
                    next = idx < 0 ? 0 : (idx + 1) % visible.length;
                }
                else {
                    next = idx <= 0 ? visible.length - 1 : idx - 1;
                }
                setActiveButton(visible[next]);
            }
            else if (e.key === "Enter") {
                e.preventDefault();
                var visibleEnter = getVisibleButtons();
                var activeButton = null;
                for (var m = 0; m < visibleEnter.length; m++) {
                    if (visibleEnter[m].classList.contains("is-active")) {
                        activeButton = visibleEnter[m];
                        break;
                    }
                }
                if (!activeButton) activeButton = visibleEnter[0];
                if (activeButton) activeButton.click();
            }
            else if (e.key === "Escape") {
                if (searchInput.value) {
                    e.preventDefault();
                    searchInput.value = "";
                    applyFilter("");
                }
            }
        });

        applyFilter("");
        // Auto-focus the search input on open so users can immediately type
        // to filter. Wrapped in setTimeout so the dropdown's own positioning
        // / focus-traversal code (which fires synchronously after this
        // render returns) doesn't clobber the focus we set.
        setTimeout(function () {
            if (searchInput && typeof searchInput.focus === "function" && searchInput.isConnected !== false) {
                try { searchInput.focus({ preventScroll: true }); }
                catch (ignoreFocus) {
                    try { searchInput.focus(); }
                    catch (ignoreFocusFallback) { }
                }
            }
        }, 30);
    }

    function runAgent(prompt, options) {
        options = options || {};
        var agent = options.agent || config.aiToolkitAgent;
        if (typeof agent !== "function") {
            var err = new Error("AI Toolkit: no agent registered. Call editor.aiToolkit.setAgent(fn) first.");
            console.warn(err.message);
            return Promise.reject(err);
        }
        var maxSteps = Math.max(1, options.maxSteps | 0 || 6);
        var tools = options.tools || {};
        var snapshot = options.snapshot || captureSelectionSnapshot();
        var transcript = [];
        var executedOps = [];

        function tick(step, lastResult) {
            if (step >= maxSteps) {
                return Promise.resolve({ done: true, reason: "maxSteps", transcript: transcript, executedOps: executedOps, lastResult: lastResult });
            }
            var context = {
                step: step,
                prompt: prompt,
                snapshot: snapshot,
                tools: Object.keys(tools),
                transcript: transcript.slice(),
                lastResult: lastResult
            };
            var invocation;
            try { invocation = agent(prompt, context); }
            catch (err) { return Promise.reject(err); }

            return Promise.resolve(invocation).then(function (result) {
                transcript.push({ step: step, result: result });
                if (!result || result.done === true) {
                    return { done: true, reason: "agent", transcript: transcript, executedOps: executedOps, lastResult: result };
                }
                // Run tools if the agent asked for them
                var toolPromise = Promise.resolve(result);
                if (result.toolCalls && result.toolCalls.length) {
                    toolPromise = Promise.all(result.toolCalls.map(function (call) {
                        var fn = tools[call && call.name];
                        if (typeof fn !== "function") {
                            return { name: call && call.name, error: "unknown tool" };
                        }
                        try { return Promise.resolve(fn(call.args || {}, { snapshot: snapshot })).then(function (out) { return { name: call.name, output: out }; }); }
                        catch (err) { return { name: call.name, error: String(err && err.message || err) }; }
                    })).then(function (toolResults) {
                        result.toolResults = toolResults;
                        transcript[transcript.length - 1].toolResults = toolResults;
                        return result;
                    });
                }
                return toolPromise.then(function (resolved) {
                    if (resolved.operations && resolved.operations.length) {
                        var handled = executeOperations(resolved.operations, { snapshot: snapshot, resolved: resolved });
                        executedOps.push({ step: step, handled: handled, count: resolved.operations.length });
                    }
                    if (resolved.done === true) {
                        return { done: true, reason: "agent", transcript: transcript, executedOps: executedOps, lastResult: resolved };
                    }
                    return tick(step + 1, resolved);
                });
            });
        }

        return tick(0, null);
    }

    function runQuickAction(actionId, options) {
        options = options || {};
        var snapshot = options.snapshot || captureSelectionSnapshot();
        var action = getActionDefinition(actionId) || { id: actionId, target: "document" };

        if (action.target === "chat-panel" && !options.forceResolve) {
            openChatPanel({ focusComposer: true });
            return Promise.resolve(true);
        }

        if (action.target === "review-panel" && !options.forceResolve) {
            openReviewPanel({ focusPanel: true });
            return Promise.resolve(true);
        }

        if (action.target === "dialog" && !options.forceResolve) {
            openDialog({
                presetMode: action.resolverMode || "",
                useDocument: options.useDocument === true || !snapshot.hasSelection,
                autoRun: !!action.autoRun
            });
            return Promise.resolve(true);
        }

        return resolveAction(actionId, { snapshot: snapshot, source: options.source, prompt: options.prompt, scope: options.scope }).then(function (resolved) {
            return executeResolvedAction(resolved, {
                snapshot: snapshot,
                fallbackAction: action
            });
        }).catch(function (error) {
            console.error("AI Toolkit action failed", error);
            return false;
        });
    }

    function executeResolvedAction(resolved, options) {
        options = options || {};
        var snapshot = options.snapshot || captureSelectionSnapshot();
        if (resolved && resolved.operations && resolved.operations.length) {
            return executeOperations(resolved.operations, {
                snapshot: snapshot,
                resolved: resolved
            });
        }

        return executeOperations([buildLegacyOperation(resolved && resolved.target ? resolved.target : "document", resolved && resolved.result ? resolved.result : "", resolved, resolved ? resolved.request : null, resolved ? resolved.action : null)], {
            snapshot: snapshot,
            resolved: resolved
        });
    }

    function executeOperations(operations, options) {
        options = options || {};
        var snapshot = options.snapshot || captureSelectionSnapshot();
        var resolved = options.resolved || null;
        var handled = false;
        var list = operations || [];
        for (var i = 0; i < list.length; i++) {
            if (executeOperation(list[i], {
                snapshot: snapshot,
                resolved: resolved
            })) {
                handled = true;
            }
        }
        return handled;
    }

    function executeOperation(operation, options) {
        if (!operation || !operation.type) {
            return false;
        }

        options = options || {};
        var snapshot = options.snapshot || captureSelectionSnapshot();
        var resolved = options.resolved || {};
        var customHandler = config.aiToolkitOperationHandlers && config.aiToolkitOperationHandlers[operation.type];
        if (typeof customHandler === "function") {
            return !!customHandler.call(editor, operation, {
                snapshot: snapshot,
                resolved: resolved,
                request: resolved.request || null,
                action: resolved.action || null,
                editor: editor
            });
        }

        switch (operation.type) {
            case "open-chat-panel":
                openChatPanel({ focusComposer: true });
                return true;
            case "open-review-panel":
                openReviewPanel({ focusPanel: true });
                return true;
            case "open-dialog":
                openDialog({
                    presetMode: operation.presetMode || resolved.presetMode || (resolved.request ? resolved.request.mode : ""),
                    useDocument: operation.useDocument === true || resolved.useDocument === true || !snapshot.hasSelection,
                    autoRun: !!(operation.autoRun || resolved.autoRun)
                });
                return true;
            case "preview-suggestion":
                if (snapshot.hasSelection) {
                    return previewInlineSuggestion(operation.text, {
                        snapshot: snapshot,
                        reason: operation.reason || (resolved && resolved.reason) || "",
                        sourceLabel: operation.meta && operation.meta.sourceLabel ? operation.meta.sourceLabel : "",
                        suggestionType: operation.meta && operation.meta.mode ? operation.meta.mode : (resolved && resolved.request ? resolved.request.mode : ""),
                        language: operation.meta && operation.meta.language ? operation.meta.language : (resolved && resolved.request ? resolved.request.language : "")
                    });
                }
                openDialog({
                    presetMode: operation.presetMode || resolved.presetMode || (resolved.request ? resolved.request.mode : ""),
                    useDocument: true,
                    autoRun: true
                });
                return true;
            case "add-comment":
                return insertAiComment(operation.text, { snapshot: snapshot });
            case "insert-below":
                return applyResult(operation.text, { mode: "insert", snapshot: snapshot });
            case "replace-selection":
                return applyResult(operation.text, { mode: "selection", snapshot: snapshot });
            case "replace-document":
                return applyResult(operation.text, { mode: "document", snapshot: snapshot });
            default:
                return false;
        }
    }

    function acceptInlineSuggestion() {
        clearPreviewStateIfMissing();
        var previewState = arguments.length ? findSuggestionById(arguments[0]) : getActiveSuggestion();
        if (!previewState) {
            return false;
        }

        var wrapper = getSuggestionWrapper(previewState.id);
        if (!wrapper) {
            previewState.status = "stale";
            previewState.decidedAt = previewState.decidedAt || new Date().getTime();
            if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                renderReviewPanel(false);
            }
            setActiveSuggestionId(null);
            persistSuggestionStore();
            return false;
        }

        wrapper.outerHTML = getResolvedSuggestionHtml(previewState, "accepted");
        previewState.status = "accepted";
        previewState.decidedAt = new Date().getTime();
        setLastReviewDecision(previewState, "accepted");
        clearSuggestionRemoteUpdate(previewState.id);
        if (editor.__aiRecentlyOpenedQueueSuggestionId === previewState.id) {
            clearQueueOpenedSuggestion({ skipUpdate: true, skipRender: true });
        }
        setActiveSuggestionId(null);
        announceReviewStatus(buildSuggestionAnnouncement(previewState, "Accepted"));
        persistSuggestionStore();
        emitReviewLogEvent("suggestion-accepted", previewState);
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(false);
        }
        editor.focus();
        return true;
    }

    function rejectInlineSuggestion() {
        clearPreviewStateIfMissing();
        var previewState = arguments.length ? findSuggestionById(arguments[0]) : getActiveSuggestion();
        if (!previewState) {
            return false;
        }

        var wrapper = getSuggestionWrapper(previewState.id);
        if (!wrapper) {
            previewState.status = "stale";
            previewState.decidedAt = previewState.decidedAt || new Date().getTime();
            if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                renderReviewPanel(false);
            }
            setActiveSuggestionId(null);
            persistSuggestionStore();
            return false;
        }

        wrapper.outerHTML = getResolvedSuggestionHtml(previewState, "rejected");
        previewState.status = "rejected";
        previewState.decidedAt = new Date().getTime();
        setLastReviewDecision(previewState, "rejected");
        clearSuggestionRemoteUpdate(previewState.id);
        if (editor.__aiRecentlyOpenedQueueSuggestionId === previewState.id) {
            clearQueueOpenedSuggestion({ skipUpdate: true, skipRender: true });
        }
        setActiveSuggestionId(null);
        announceReviewStatus(buildSuggestionAnnouncement(previewState, "Rejected"));
        persistSuggestionStore();
        emitReviewLogEvent("suggestion-rejected", previewState);
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(false);
        }
        editor.focus();
        return true;
    }

    function undoLastReviewDecision(options) {
        options = options || {};
        clearPreviewStateIfMissing();
        var undoable = getUndoableReviewDecision();
        if (!undoable) {
            return false;
        }

        var suggestion = undoable.suggestion;
        var wrapper = undoable.wrapper;
        if (!wrapper || !wrapper.parentNode) {
            popLastReviewDecision();
            return false;
        }

        suggestion.status = "pending";
        suggestion.decidedAt = 0;
        wrapper.outerHTML = createInlinePreviewHtml(suggestion);
        getReviewState().showResolved = false;
        pushRedoReviewDecision(suggestion, undoable.status);
        popLastReviewDecision();
        setActiveSuggestionId(suggestion.id);
        announceReviewStatus(buildSuggestionAnnouncement(suggestion, "Reopened"));
        persistSuggestionStore();
        emitReviewLogEvent("suggestion-reopened", suggestion);
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(!!options.focusPanel, {
                focusAction: options.focusAction || ""
            });
        }
        var restoredInlineFocus = false;
        if (options.focusInlineAction) {
            restoredInlineFocus = focusDefaultInlineReviewAction(suggestion.id, options.focusInlineAction);
        }
        if (!options.focusPanel && !restoredInlineFocus) {
            editor.focus();
        }
        return true;
    }

    function redoLastReviewDecision(options) {
        options = options || {};
        clearPreviewStateIfMissing();
        var redoable = getRedoableReviewDecision();
        if (!redoable) {
            return false;
        }

        var suggestion = redoable.suggestion;
        var wrapper = redoable.wrapper;
        var continuationSuggestionId = editor.__aiActiveSuggestionId === suggestion.id ? getNextInlineReviewSuggestionId(suggestion.id) : "";
        if (!wrapper || !wrapper.parentNode) {
            popRedoReviewDecision();
            return false;
        }

        wrapper.outerHTML = getResolvedSuggestionHtml(suggestion, redoable.status);
        suggestion.status = redoable.status;
        suggestion.decidedAt = new Date().getTime();
        getReviewState().showResolved = false;
        popRedoReviewDecision();
        setLastReviewDecision(suggestion, redoable.status, { clearRedo: false });
        clearSuggestionRemoteUpdate(suggestion.id);
        if (editor.__aiRecentlyOpenedQueueSuggestionId === suggestion.id) {
            clearQueueOpenedSuggestion({ skipUpdate: true, skipRender: true });
        }
        setActiveSuggestionId(null);
        announceReviewStatus(buildSuggestionAnnouncement(suggestion, redoable.status === "accepted" ? "Accepted again" : "Rejected again"));
        persistSuggestionStore();
        emitReviewLogEvent(redoable.status === "accepted" ? "suggestion-accepted" : "suggestion-rejected", suggestion);
        if (continuationSuggestionId) {
            var continued = activateReviewSuggestion(continuationSuggestionId, {
                focusPanel: !!options.focusPanel,
                focusAction: options.focusAction || "accept"
            });
            if (continued && options.focusInlineAction) {
                focusDefaultInlineReviewAction(continuationSuggestionId, options.focusInlineAction);
            }
            return continued;
        }
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(!!options.focusPanel, {
                focusAction: options.focusAction || "accept"
            });
        }
        if (!options.focusPanel) {
            editor.focus();
        }
        return true;
    }

    function applyResult(result, options) {
        var clean = normalizeText(result);
        if (!clean) {
            return false;
        }

        clearPreviewStateIfMissing();

        options = options || {};
        var mode = options.mode || "document";
        var snapshot = options.snapshot || captureSelectionSnapshot();

        if (mode === "document") {
            editor.setHTMLCode(textToHtml(clean));
            syncSuggestionStates();
            persistSuggestionStore();
            if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                renderReviewPanel(false);
            }
            editor.focus();
            return true;
        }

        if (mode === "selection") {
            if (!restoreSelection(snapshot, false)) {
                editor.focus();
            }
            editor.insertText(clean);
            syncSuggestionStates();
            persistSuggestionStore();
            if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                renderReviewPanel(false);
            }
            editor.focus();
            return true;
        }

        if (!restoreSelection(snapshot, true)) {
            editor.focus();
        }
        editor.insertHTML("<p><br/></p>" + textToHtml(clean));
        syncSuggestionStates();
        persistSuggestionStore();
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(false);
        }
        editor.focus();
        return true;
    }

    function findEditorShellFromNode(node) {
        while (node) {
            if (node.nodeType === 1) {
                var cls = typeof node.className === "string" ? node.className : "";
                if (cls.indexOf("richtexteditor") !== -1) {
                    return node;
                }
            }
            node = node.parentNode;
        }
        return null;
    }

    function getEditorShell() {
        var editable = editor.getEditable ? editor.getEditable() : null;
        var shell = findEditorShellFromNode(editable);
        if (shell) {
            return shell;
        }

        var frameElement = editable && editable.ownerDocument && editable.ownerDocument.defaultView
            ? editable.ownerDocument.defaultView.frameElement
            : null;
        shell = findEditorShellFromNode(frameElement);
        if (shell) {
            return shell;
        }

        if (editor.iframe) {
            shell = findEditorShellFromNode(editor.iframe);
            if (shell) {
                return shell;
            }
            if (editor.iframe.parentNode) {
                return editor.iframe.parentNode;
            }
        }

        return editable && editable.parentNode ? editable.parentNode : null;
    }

    function ensureReviewStatusNode() {
        var shell = getEditorShell();
        if (!shell) {
            return null;
        }
        if (editor.__aiReviewStatusNode && editor.__aiReviewStatusNode.isConnected) {
            return editor.__aiReviewStatusNode;
        }

        var existing = shell.querySelector ? shell.querySelector(".rte-ai-review-live-region") : null;
        if (existing) {
            editor.__aiReviewStatusNode = existing;
            return existing;
        }

        var node = append(shell, "div", "", "rte-ai-review-live-region");
        node.setAttribute("role", "status");
        node.setAttribute("aria-live", "polite");
        node.setAttribute("aria-atomic", "true");
        editor.__aiReviewStatusNode = node;
        return node;
    }

    function buildSuggestionAnnouncement(suggestion, prefix, options) {
        if (!suggestion) {
            return prefix || "";
        }

        options = options || {};
        var details = [];
        var typeLabel = getSuggestionTypeValue(suggestion.suggestionType || "") !== "other"
            ? getSuggestionTypeLabel(suggestion.suggestionType)
            : "AI suggestion";
        details.push(typeLabel);

        var scopeLabel = getSuggestionScopeLabel(suggestion);
        if (scopeLabel) {
            details.push(scopeLabel);
        }
        if (suggestion.language) {
            details.push(getTranslateLanguageLabel(suggestion.language));
        }

        var message = prefix ? prefix + " " + details.join(", ") : details.join(", ");
        if (options.positionLabel) {
            message += ". " + options.positionLabel + ".";
        }
        else {
            message += ".";
        }
        if (options.remoteUpdateCount) {
            message += " " + (options.remoteUpdateCount > 1 ? options.remoteUpdateCount + " shared updates." : "Shared update.");
        }
        return message;
    }

    function buildQueueOpenAnnouncement(suggestion, options) {
        if (!suggestion) {
            return "Opened AI review queue.";
        }

        options = options || {};
        var pendingCount = getSuggestionQueuePendingCount(suggestion);
        var pendingLabel = pendingCount === 1 ? "1 pending item" : pendingCount + " pending items";
        var typeLabel = getSuggestionTypeValue(suggestion.suggestionType || "") !== "other"
            ? getSuggestionTypeLabel(suggestion.suggestionType)
            : "AI";
        var focusLabel = getReviewFocusActionDisplayLabel(suggestion, options.focusAction || getPreferredReviewActionFocus());
        var lead = typeLabel && typeLabel !== "AI"
            ? "Opened " + typeLabel + " AI review queue. " + pendingLabel + "."
            : "Opened AI review queue. " + pendingLabel + ".";
        if (focusLabel) {
            lead += " Focus " + focusLabel + ".";
        }
        return lead + " " + buildSuggestionAnnouncement(suggestion, "Reviewing", options);
    }

    function buildReviewItemAriaLabel(suggestion, options) {
        if (!suggestion) {
            return "AI review item";
        }

        options = options || {};
        var parts = [];
        if (options.isCurrent) {
            parts.push("Current review item");
        }
        if (options.queueOpened) {
            parts.push("Queue opened");
        }
        if (options.queueRoleLabel) {
            parts.push(options.queueRoleLabel);
        }
        if (options.queuePositionLabel) {
            parts.push(options.queuePositionLabel);
        }
        if (options.transitionLabel) {
            parts.push(options.transitionLabel);
        }
        if (options.changeSummary) {
            parts.push(options.changeSummary);
        }
        parts.push(getSuggestionStatusLabel(suggestion.status));
        if (suggestion.suggestionType && getSuggestionTypeValue(suggestion.suggestionType) !== "other") {
            parts.push(getSuggestionTypeLabel(suggestion.suggestionType));
        }
        else {
            parts.push("AI suggestion");
        }
        var scopeLabel = getSuggestionScopeLabel(suggestion);
        if (scopeLabel) {
            parts.push(scopeLabel);
        }
        if (suggestion.language) {
            parts.push(getTranslateLanguageLabel(suggestion.language));
        }
        if (options.remoteUpdateCount) {
            parts.push(options.remoteUpdateCount > 1 ? options.remoteUpdateCount + " shared updates" : "Shared update");
        }
        var title = summarizeSuggestionText(suggestion.originalText || suggestion.resultText || "AI suggestion", 80);
        if (title) {
            parts.push("Preview: " + title);
        }
        if (options.undoLabel) {
            parts.push(options.undoLabel);
        }
        if (options.undoNextLabel) {
            parts.push(options.undoNextLabel);
        }
        if (options.redoLabel) {
            parts.push(options.redoLabel);
        }
        if (options.redoNextLabel) {
            parts.push(options.redoNextLabel);
        }
        return parts.join(". ");
    }

    function buildReviewQueuePositionData(visibleSuggestions, activeSuggestionId, suggestion) {
        if (!suggestion || suggestion.status !== "pending" || !visibleSuggestions || !visibleSuggestions.length) {
            return null;
        }
        var pendingSuggestions = [];
        for (var visibleIndex = 0; visibleIndex < visibleSuggestions.length; visibleIndex++) {
            if (visibleSuggestions[visibleIndex] && visibleSuggestions[visibleIndex].status === "pending") {
                pendingSuggestions.push(visibleSuggestions[visibleIndex]);
            }
        }
        if (!pendingSuggestions.length) {
            return null;
        }
        var suggestionIndex = -1;
        var activeIndex = -1;
        for (var pendingIndex = 0; pendingIndex < pendingSuggestions.length; pendingIndex++) {
            if (pendingSuggestions[pendingIndex].id === suggestion.id) {
                suggestionIndex = pendingIndex;
            }
            if (pendingSuggestions[pendingIndex].id === activeSuggestionId) {
                activeIndex = pendingIndex;
            }
        }
        if (suggestionIndex === -1) {
            return null;
        }
        if (activeIndex === -1) {
            activeIndex = 0;
        }
        var role = "later";
        if (suggestionIndex === activeIndex) {
            role = "current";
        }
        else if (suggestionIndex === activeIndex + 1) {
            role = "next";
        }
        else if (suggestionIndex < activeIndex) {
            role = "earlier";
        }
        var queueLabel = "Queue " + (suggestionIndex + 1) + " of " + pendingSuggestions.length;
        var detail = "";
        var roleLabel = "";
        if (role === "current") {
            roleLabel = "Current focus";
            detail = "Review this item now. It is " + queueLabel.toLowerCase() + " in this view.";
        }
        else if (role === "next") {
            roleLabel = "Up next";
            detail = "This follows after the current decision. It is " + queueLabel.toLowerCase() + " in this view.";
        }
        else if (role === "earlier") {
            roleLabel = "Earlier item";
            detail = "You moved past this item. Use Previous or K to return. It is " + queueLabel.toLowerCase() + " in this view.";
        }
        else {
            roleLabel = "Later in queue";
            detail = "This comes later in the current review run. It is " + queueLabel.toLowerCase() + " in this view.";
        }
        return {
            role: role,
            roleLabel: roleLabel,
            queueLabel: queueLabel,
            detail: detail
        };
    }

    function buildReviewFeedSectionData(visibleSuggestions, activeSuggestionId, suggestion, queuePositionData) {
        if (!suggestion || !visibleSuggestions || !visibleSuggestions.length) {
            return null;
        }

        if (suggestion.status !== "pending") {
            var resolvedCount = 0;
            for (var resolvedIndex = 0; resolvedIndex < visibleSuggestions.length; resolvedIndex++) {
                if (visibleSuggestions[resolvedIndex] && visibleSuggestions[resolvedIndex].status !== "pending") {
                    resolvedCount++;
                }
            }
            return resolvedCount ? {
                key: "resolved",
                label: "Resolved items",
                detail: "Accepted, rejected, or stale suggestions from this review run.",
                countLabel: formatCountNoun(resolvedCount, "item")
            } : null;
        }

        var pendingSuggestions = [];
        for (var visibleIndex = 0; visibleIndex < visibleSuggestions.length; visibleIndex++) {
            if (visibleSuggestions[visibleIndex] && visibleSuggestions[visibleIndex].status === "pending") {
                pendingSuggestions.push(visibleSuggestions[visibleIndex]);
            }
        }
        if (!pendingSuggestions.length) {
            return null;
        }

        var activeIndex = -1;
        for (var pendingIndex = 0; pendingIndex < pendingSuggestions.length; pendingIndex++) {
            if (pendingSuggestions[pendingIndex].id === activeSuggestionId) {
                activeIndex = pendingIndex;
                break;
            }
        }
        if (activeIndex === -1) {
            activeIndex = 0;
        }

        var role = queuePositionData && queuePositionData.role ? queuePositionData.role : "";
        if (role === "current") {
            return {
                key: "current",
                label: "Current focus",
                detail: "Review this suggestion now.",
                countLabel: "1 item"
            };
        }
        if (role === "next") {
            return {
                key: "next",
                label: "Up next",
                detail: "Becomes current after this decision.",
                countLabel: "1 item"
            };
        }
        if (role === "later") {
            return {
                key: "later",
                label: "Later in queue",
                detail: "Pending suggestions after the immediate next step.",
                countLabel: formatCountNoun(Math.max(1, pendingSuggestions.length - activeIndex - 2), "item")
            };
        }
        if (role === "earlier") {
            return {
                key: "earlier",
                label: "Earlier in queue",
                detail: "Pending suggestions before the current focus.",
                countLabel: formatCountNoun(Math.max(1, activeIndex), "item")
            };
        }
        return {
            key: "pending",
            label: "Pending items",
            detail: "Remaining AI suggestions in this queue.",
            countLabel: formatCountNoun(pendingSuggestions.length, "item")
        };
    }

    function buildReviewQueueTransitionData(visibleSuggestions, activeSuggestionId, suggestion) {
        if (!suggestion || suggestion.status !== "pending" || !visibleSuggestions || !visibleSuggestions.length) {
            return null;
        }
        var pendingSuggestions = [];
        for (var visibleIndex = 0; visibleIndex < visibleSuggestions.length; visibleIndex++) {
            if (visibleSuggestions[visibleIndex] && visibleSuggestions[visibleIndex].status === "pending") {
                pendingSuggestions.push(visibleSuggestions[visibleIndex]);
            }
        }
        if (!pendingSuggestions.length) {
            return null;
        }
        var activeIndex = -1;
        var suggestionIndex = -1;
        for (var pendingIndex = 0; pendingIndex < pendingSuggestions.length; pendingIndex++) {
            if (pendingSuggestions[pendingIndex].id === activeSuggestionId) {
                activeIndex = pendingIndex;
            }
            if (pendingSuggestions[pendingIndex].id === suggestion.id) {
                suggestionIndex = pendingIndex;
            }
        }
        if (suggestionIndex === -1) {
            return null;
        }
        var isTerminalSuggestion = suggestionIndex === pendingSuggestions.length - 1;
        if (!isTerminalSuggestion && suggestion.id !== activeSuggestionId) {
            return null;
        }
        if (isTerminalSuggestion) {
            return {
                title: "After this decision",
                statusLabel: "Queue complete",
                queueLabel: "Queue " + (suggestionIndex + 1) + " of " + pendingSuggestions.length,
                typeLabel: "",
                scopeLabel: "",
                detail: "Accepting or rejecting this final pending item finishes the current review run.",
                previewLabel: "Queue state",
                previewText: "No later pending items remain in this queue.",
                followupTitle: "Then recovery and next queues appear",
                followupStatusLabel: "Recovery ready",
                followupDetail: "Undo the last decision or open another queue."
            };
        }
        if (activeIndex === -1 || activeIndex >= pendingSuggestions.length - 1) {
            return null;
        }
        var nextSuggestion = pendingSuggestions[activeIndex + 1];
        if (!nextSuggestion) {
            return null;
        }
        return {
            title: "After this decision",
            statusLabel: "Up next becomes current",
            queueLabel: "Queue " + (activeIndex + 2) + " of " + pendingSuggestions.length,
            typeLabel: nextSuggestion.suggestionType && getSuggestionTypeValue(nextSuggestion.suggestionType) !== "other" ? getSuggestionTypeLabel(nextSuggestion.suggestionType) : "",
            scopeLabel: getSuggestionScopeLabel(nextSuggestion),
            detail: "Accepting or rejecting this item moves review straight to the next pending suggestion.",
            previewLabel: "Next item",
            previewText: summarizeSuggestionText(nextSuggestion.originalText || nextSuggestion.resultText || "Next review item", 84),
            followupTitle: activeIndex + 1 === pendingSuggestions.length - 1 ? "Then queue complete" : "",
            followupStatusLabel: activeIndex + 1 === pendingSuggestions.length - 1 ? "Queue complete" : "",
            followupDetail: activeIndex + 1 === pendingSuggestions.length - 1 ? "After reviewing the final pending item, recovery and next queues appear." : ""
        };
    }

    function getQueueTransitionPreviewSummary(queueTransitionData) {
        if (!queueTransitionData) {
            return "";
        }
        var previewLabel = queueTransitionData.previewLabel || "";
        var previewText = queueTransitionData.previewText || "";
        if (previewLabel && previewText) {
            return previewLabel + ": " + previewText;
        }
        return previewText || previewLabel;
    }

    function appendQueueTransitionPreview(parent, className, queueTransitionData) {
        if (!parent || !className || !queueTransitionData) {
            return null;
        }
        var previewSummary = getQueueTransitionPreviewSummary(queueTransitionData);
        if (!previewSummary) {
            return null;
        }
        var previewNode = append(parent, "div", "", className);
        if (queueTransitionData.previewLabel) {
            append(previewNode, "span", "", className + "-label", queueTransitionData.previewLabel + ":");
        }
        if (queueTransitionData.previewText) {
            append(previewNode, "span", "", className + "-text", " " + queueTransitionData.previewText);
        }
        if (!queueTransitionData.previewLabel && !queueTransitionData.previewText) {
            previewNode.textContent = previewSummary;
        }
        return previewNode;
    }

    function markQueueOpenedSuggestion(suggestionId) {
        if (editor.__aiQueueOpenedTimer) {
            clearTimeout(editor.__aiQueueOpenedTimer);
            editor.__aiQueueOpenedTimer = null;
        }
        editor.__aiRecentlyOpenedQueueSuggestionId = suggestionId || null;
        updateActiveSuggestionDecorations();
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(false);
        }
        if (!suggestionId) {
            return false;
        }
        editor.__aiQueueOpenedTimer = setTimeout(function () {
            if (editor.__aiRecentlyOpenedQueueSuggestionId === suggestionId) {
                editor.__aiRecentlyOpenedQueueSuggestionId = null;
                updateActiveSuggestionDecorations();
                if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                    renderReviewPanel(false);
                }
            }
            editor.__aiQueueOpenedTimer = null;
        }, 1800);
        return true;
    }

    function clearQueueOpenedSuggestion(options) {
        options = options || {};
        var hadState = !!editor.__aiRecentlyOpenedQueueSuggestionId;
        if (editor.__aiQueueOpenedTimer) {
            clearTimeout(editor.__aiQueueOpenedTimer);
            editor.__aiQueueOpenedTimer = null;
        }
        editor.__aiRecentlyOpenedQueueSuggestionId = null;
        if (!hadState) {
            return false;
        }
        if (!options.skipUpdate) {
            updateActiveSuggestionDecorations();
        }
        if (!options.skipRender && editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(false);
        }
        return true;
    }

    function buildInlineQueueBoundaryAnnouncement(currentSuggestionId, direction) {
        var suggestion = findSuggestionById(currentSuggestionId);
        var typeFilter = getInlineReviewTypeFilter(currentSuggestionId);
        var queueLabel = typeFilter && typeFilter !== "all"
            ? getSuggestionTypeLabel(typeFilter) + " review queue"
            : "AI review queue";
        var prefix = direction === "previous" || direction === "first"
            ? "Already at the first pending item in the " + queueLabel + "."
            : "Already at the last pending item in the " + queueLabel + ".";
        if (!suggestion) {
            return prefix;
        }
        return prefix + " " + buildSuggestionAnnouncement(suggestion, "Still reviewing");
    }

    function buildInlineQueueCompleteAnnouncement(actionLabel, suggestionId) {
        var suggestion = findSuggestionById(suggestionId);
        var lead = suggestion
            ? buildSuggestionAnnouncement(suggestion, actionLabel)
            : (actionLabel || "Updated") + " AI suggestion.";
        return lead + " Review queue complete.";
    }

    function buildCompletionPreviewReason(suggestion) {
        if (!suggestion || !suggestion.reason) {
            return "";
        }
        return summarizeSuggestionText(suggestion.reason, 110);
    }

    function buildCompletionPreviewResult(suggestion) {
        if (!suggestion) {
            return "";
        }
        var resultText = summarizeSuggestionText(suggestion.resultText || "", 96);
        var originalText = summarizeSuggestionText(suggestion.originalText || "", 96);
        if (!resultText || resultText === originalText) {
            return "";
        }
        return resultText;
    }

    function buildCompletionPreviewChangeLabel(suggestion) {
        if (!suggestion) {
            return "";
        }
        switch (getSuggestionTypeValue(suggestion.suggestionType)) {
            case "proofread":
                return "Surface edit";
            case "rewrite":
                return "Text rewrite";
            case "translate":
                return "Language change";
            case "summarize":
            case "shorten":
                return "Condensed draft";
            case "expand":
                return "Expanded draft";
        }
        var current = normalizeText(suggestion.originalText || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
        var result = normalizeText(suggestion.resultText || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
        if (current && result && current === result) {
            return "Surface edit";
        }
        return "Text change";
    }

    function buildCompletionPreviewImpactLabel(suggestion) {
        if (!suggestion) {
            return "";
        }
        var typeValue = getSuggestionTypeValue(suggestion.suggestionType);
        var current = normalizeText(suggestion.originalText || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
        var result = normalizeText(suggestion.resultText || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
        if (!current || !result) {
            return "";
        }
        if (current === result || typeValue === "proofread") {
            return "Low impact";
        }
        if (typeValue === "translate" || typeValue === "summarize" || typeValue === "shorten" || typeValue === "expand") {
            return "High impact";
        }
        if (typeValue === "rewrite") {
            return "Medium impact";
        }
        if (current.indexOf(result) >= 0 || result.indexOf(current) >= 0) {
            return "Medium impact";
        }
        var currentWords = current.split(/\s+/);
        var resultWords = result.split(/\s+/);
        var currentMap = {};
        var overlap = 0;
        for (var currentWordIndex = 0; currentWordIndex < currentWords.length; currentWordIndex++) {
            currentMap[currentWords[currentWordIndex]] = (currentMap[currentWords[currentWordIndex]] || 0) + 1;
        }
        for (var resultWordIndex = 0; resultWordIndex < resultWords.length; resultWordIndex++) {
            var word = resultWords[resultWordIndex];
            if (currentMap[word]) {
                currentMap[word]--;
                overlap++;
            }
        }
        var overlapRatio = overlap / Math.max(currentWords.length, resultWords.length, 1);
        return overlapRatio >= 0.45 ? "Medium impact" : "High impact";
    }

    function getNormalizedTextWordCount(text) {
        var clean = normalizeText(text || "");
        return clean ? clean.split(/\s+/).length : 0;
    }

    function getNormalizedTextSentenceCount(text) {
        var clean = normalizeText(text || "");
        if (!clean) {
            return 0;
        }
        var matches = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
        return matches && matches.length ? matches.length : 1;
    }

    function formatCountNoun(count, singular) {
        return count + " " + singular + (count === 1 ? "" : "s");
    }

    function buildReviewChangeGlanceData(suggestion) {
        if (!suggestion) {
            return null;
        }
        var pills = [];
        var changeLabel = buildCompletionPreviewChangeLabel(suggestion);
        var impactLabel = buildCompletionPreviewImpactLabel(suggestion);
        var scopeLabel = getSuggestionScopeLabel(suggestion);
        if (changeLabel) {
            pills.push({
                kind: "change",
                text: changeLabel
            });
        }
        if (impactLabel) {
            pills.push({
                kind: "impact",
                text: impactLabel
            });
        }
        if (scopeLabel) {
            pills.push({
                kind: "scope",
                text: scopeLabel
            });
        }
        var currentWordCount = getNormalizedTextWordCount(suggestion.originalText || "");
        var resultWordCount = getNormalizedTextWordCount(suggestion.resultText || "");
        var currentSentenceCount = getNormalizedTextSentenceCount(suggestion.originalText || "");
        var resultSentenceCount = getNormalizedTextSentenceCount(suggestion.resultText || "");
        var detail = "";
        if (currentWordCount && resultWordCount && currentSentenceCount && resultSentenceCount) {
            if (currentWordCount === resultWordCount && currentSentenceCount === resultSentenceCount) {
                detail = "Keeps " + formatCountNoun(resultWordCount, "word") + " across " + formatCountNoun(resultSentenceCount, "sentence") + ".";
            }
            else if (currentSentenceCount === resultSentenceCount) {
                detail = "Moves from " + formatCountNoun(currentWordCount, "word") + " to " + formatCountNoun(resultWordCount, "word") + " across " + formatCountNoun(resultSentenceCount, "sentence") + ".";
            }
            else {
                detail = "Moves from " + formatCountNoun(currentWordCount, "word") + " across " + formatCountNoun(currentSentenceCount, "sentence") + " to " + formatCountNoun(resultWordCount, "word") + " across " + formatCountNoun(resultSentenceCount, "sentence") + ".";
            }
        }
        else if (currentWordCount && resultWordCount) {
            detail = "Moves from " + formatCountNoun(currentWordCount, "word") + " to " + formatCountNoun(resultWordCount, "word") + ".";
        }
        else if (currentSentenceCount && resultSentenceCount) {
            detail = "Moves from " + formatCountNoun(currentSentenceCount, "sentence") + " to " + formatCountNoun(resultSentenceCount, "sentence") + ".";
        }
        if (!pills.length && !detail) {
            return null;
        }
        return {
            title: "Change at a glance",
            pills: pills,
            detail: detail
        };
    }

    function buildCompletionPreviewDiffParts(currentText, resultText) {
        var current = normalizeText(currentText || "");
        var result = normalizeText(resultText || "");
        if (!current || !result || current === result) {
            return null;
        }
        var prefixLength = 0;
        var maxPrefix = Math.min(current.length, result.length);
        while (prefixLength < maxPrefix && current.charAt(prefixLength) === result.charAt(prefixLength)) {
            prefixLength++;
        }
        var suffixLength = 0;
        var maxCurrentSuffix = current.length - prefixLength;
        var maxResultSuffix = result.length - prefixLength;
        while (
            suffixLength < maxCurrentSuffix &&
            suffixLength < maxResultSuffix &&
            current.charAt(current.length - 1 - suffixLength) === result.charAt(result.length - 1 - suffixLength)
        ) {
            suffixLength++;
        }
        return {
            currentLead: current.substring(0, prefixLength),
            currentChange: current.substring(prefixLength, current.length - suffixLength),
            currentTrail: suffixLength ? current.substring(current.length - suffixLength) : "",
            resultLead: result.substring(0, prefixLength),
            resultChange: result.substring(prefixLength, result.length - suffixLength),
            resultTrail: suffixLength ? result.substring(result.length - suffixLength) : ""
        };
    }

    function appendCompletionPreviewLine(parent, kind, text, diffParts) {
        var label = kind === "result" ? "Suggested" : "Current";
        var line = append(parent, "div", "", "rte-ai-review-empty-preview-line is-" + kind);
        append(line, "span", "", "rte-ai-review-empty-preview-line-label", label + ":");
        var content = append(line, "span", "", "rte-ai-review-empty-preview-line-text");
        if (!text) {
            return line;
        }
        if (!diffParts) {
            content.innerText = text;
            return line;
        }
        var lead = kind === "result" ? diffParts.resultLead : diffParts.currentLead;
        var change = kind === "result" ? diffParts.resultChange : diffParts.currentChange;
        var trail = kind === "result" ? diffParts.resultTrail : diffParts.currentTrail;
        if (lead) {
            append(content, "span", "", "rte-ai-review-empty-preview-segment", lead);
        }
        if (change) {
            append(content, "span", "", "rte-ai-review-empty-preview-delta is-" + kind, change);
        }
        if (trail) {
            append(content, "span", "", "rte-ai-review-empty-preview-segment", trail);
        }
        if (!lead && !change && !trail) {
            content.innerText = text;
        }
        return line;
    }

    function appendReviewCompareDeltaText(parent, kind, text, diffParts) {
        var content = append(parent, "div", "", "rte-ai-review-item-compare-text");
        var value = text || "";
        if (!value) {
            content.innerText = kind === "result" ? "Suggested text unavailable." : "Original selection unavailable.";
            return content;
        }
        if (!diffParts) {
            content.innerText = value;
            return content;
        }
        var lead = kind === "result" ? diffParts.resultLead : diffParts.currentLead;
        var change = kind === "result" ? diffParts.resultChange : diffParts.currentChange;
        var trail = kind === "result" ? diffParts.resultTrail : diffParts.currentTrail;
        if (lead) {
            append(content, "span", "", "rte-ai-review-item-compare-segment", lead);
        }
        if (change) {
            append(content, "span", "", "rte-ai-review-item-compare-delta is-" + kind, change);
        }
        if (trail) {
            append(content, "span", "", "rte-ai-review-item-compare-segment", trail);
        }
        if (!lead && !change && !trail) {
            content.innerText = value;
        }
        return content;
    }

    function updateReviewCondensedPreviewOpenHint(preview, suggestion, panel) {
        if (!preview || !suggestion) {
            return;
        }
        var item = preview.closest ? preview.closest(".rte-ai-review-item") : null;
        var actionNode = preview.querySelector(".rte-ai-review-item-condensed-open-pill");
        var detailNode = preview.querySelector(".rte-ai-review-item-condensed-entry-detail");
        if (!actionNode) {
            return;
        }
        var focusLabel = getReviewFocusActionDisplayLabel(suggestion, getPreferredReviewActionFocus(panel))
            || getReviewFocusActionDisplayLabel(suggestion, "")
            || "Locate";
        actionNode.innerText = focusLabel;
        if (detailNode) {
            detailNode.innerText = "Press Enter to reopen this suggestion and land on " + focusLabel + ".";
        }
        if (item && item.setAttribute) {
            item.setAttribute("data-rte-ai-review-open-action-label", focusLabel);
        }
    }

    function syncReviewCondensedPreviewShortcutModule(preview, suggestion, panel) {
        if (!preview || !suggestion) {
            return;
        }
        var moduleNode = preview.querySelector ? preview.querySelector(".rte-ai-review-item-condensed-shortcuts") : null;
        var shortcutText = getReviewCardSupplementalShortcutHint(suggestion, getPreferredReviewActionFocus(panel));
        if (!shortcutText) {
            if (moduleNode && moduleNode.parentNode) {
                moduleNode.parentNode.removeChild(moduleNode);
            }
            return;
        }
        if (!moduleNode) {
            moduleNode = append(preview, "div", "", "rte-ai-review-item-condensed-shortcuts");
        }
        var titleNode = moduleNode.querySelector ? moduleNode.querySelector(".rte-ai-review-item-condensed-shortcuts-title") : null;
        if (!titleNode) {
            titleNode = append(moduleNode, "span", "", "rte-ai-review-item-condensed-shortcuts-title");
        }
        titleNode.textContent = "More keys";
        var bodyNode = moduleNode.querySelector ? moduleNode.querySelector(".rte-ai-review-item-condensed-shortcuts-body") : null;
        if (!bodyNode) {
            bodyNode = append(moduleNode, "div", "", "rte-ai-review-shortcuts rte-ai-review-item-condensed-shortcuts-body");
        }
        renderReviewShortcutDisplayContent(bodyNode, shortcutText);
        applyReviewShortcutDisplayState(bodyNode, "card");
        moduleNode.setAttribute("aria-label", "More keys. " + (bodyNode.textContent || ""));
    }

    function appendReviewCondensedPreviewQueueSection(parent, queuePositionData) {
        if (!parent || !queuePositionData) {
            return null;
        }
        var queueNode = append(parent, "div", "", "rte-ai-review-item-condensed-queue is-" + (queuePositionData.role || ""));
        append(queueNode, "div", "", "rte-ai-review-item-condensed-queue-title", queuePositionData.roleLabel);
        var queueMeta = append(queueNode, "div", "", "rte-ai-review-item-condensed-queue-meta");
        append(queueMeta, "span", "", "rte-ai-review-item-queue-pill is-role", queuePositionData.roleLabel);
        append(queueMeta, "span", "", "rte-ai-review-item-queue-pill is-position", queuePositionData.queueLabel);
        append(queueNode, "div", "", "rte-ai-review-item-condensed-queue-detail", queuePositionData.detail);
        return queueNode;
    }

    function appendReviewCondensedPreviewTransitionSection(parent, queueTransitionData) {
        if (!parent || !queueTransitionData) {
            return null;
        }
        var transitionNode = append(parent, "div", "", "rte-ai-review-item-condensed-transition");
        append(transitionNode, "div", "", "rte-ai-review-item-condensed-transition-title", queueTransitionData.title);
        var transitionMeta = append(transitionNode, "div", "", "rte-ai-review-item-condensed-transition-meta");
        append(transitionMeta, "span", "", "rte-ai-review-item-transition-pill is-status", queueTransitionData.statusLabel);
        append(transitionMeta, "span", "", "rte-ai-review-item-transition-pill is-position", queueTransitionData.queueLabel);
        if (queueTransitionData.typeLabel) {
            append(transitionMeta, "span", "", "rte-ai-review-item-transition-pill is-type", queueTransitionData.typeLabel);
        }
        if (queueTransitionData.scopeLabel) {
            append(transitionMeta, "span", "", "rte-ai-review-item-transition-pill is-scope", queueTransitionData.scopeLabel);
        }
        append(transitionNode, "div", "", "rte-ai-review-item-condensed-transition-detail", queueTransitionData.detail);
        appendQueueTransitionPreview(transitionNode, "rte-ai-review-item-condensed-transition-preview", queueTransitionData);
        if (queueTransitionData.followupTitle) {
            var followupNode = append(transitionNode, "div", "", "rte-ai-review-item-condensed-transition-followup");
            append(followupNode, "div", "", "rte-ai-review-item-condensed-transition-followup-title", queueTransitionData.followupTitle);
            var followupMeta = append(followupNode, "div", "", "rte-ai-review-item-condensed-transition-followup-meta");
            if (queueTransitionData.followupStatusLabel) {
                append(followupMeta, "span", "", "rte-ai-review-item-transition-pill is-followup", queueTransitionData.followupStatusLabel);
            }
            append(followupNode, "div", "", "rte-ai-review-item-condensed-transition-followup-detail", queueTransitionData.followupDetail);
        }
        return transitionNode;
    }

    function buildReviewCondensedPreviewMetaData(suggestion, options) {
        if (!suggestion) {
            return [];
        }
        options = options || {};
        var sharedUpdateCount = options.sharedUpdateCount || 0;
        var pills = [];
        pills.push({
            kind: "status",
            text: suggestion.status === "pending" ? "Ready to review" : getSuggestionStatusLabel(suggestion.status)
        });
        if (sharedUpdateCount) {
            pills.push({
                kind: "remote",
                text: sharedUpdateCount > 1 ? sharedUpdateCount + " shared updates" : "Shared update"
            });
        }
        if (suggestion.suggestionType && getSuggestionTypeValue(suggestion.suggestionType) !== "other") {
            pills.push({
                kind: "type",
                text: getSuggestionTypeLabel(suggestion.suggestionType)
            });
        }
        if (suggestion.language) {
            pills.push({
                kind: "language",
                text: getTranslateLanguageLabel(suggestion.language)
            });
        }
        var scopeLabel = getSuggestionScopeLabel(suggestion);
        if (scopeLabel) {
            pills.push({
                kind: "scope",
                text: suggestion.status === "pending" ? scopeLabel + " draft" : scopeLabel
            });
        }
        if (suggestion.status === "pending") {
            pills.push({
                kind: "steps",
                text: "1 step"
            });
        }
        return pills;
    }

    function buildReviewCondensedPreviewAriaLabel(suggestion, options) {
        if (!suggestion) {
            return "";
        }
        options = options || {};
        var parts = ["Proposed edit", "Current and suggested text"];
        var originalText = options.originalText || summarizeSuggestionText(suggestion.originalText || "", 72) || "Original selection unavailable.";
        var resultText = options.resultText || summarizeSuggestionText(suggestion.resultText || "", 72) || "Suggested text unavailable.";
        var metaData = options.previewMetaData || buildReviewCondensedPreviewMetaData(suggestion, options);
        if (metaData && metaData.length) {
            for (var metaIndex = 0; metaIndex < metaData.length; metaIndex++) {
                if (metaData[metaIndex] && metaData[metaIndex].text) {
                    parts.push(metaData[metaIndex].text);
                }
            }
        }
        parts.push("Current");
        parts.push(originalText);
        parts.push("Suggested");
        parts.push(resultText);
        var reasonText = options.reasonText || buildCompletionPreviewReason(suggestion);
        if (reasonText) {
            parts.push("Why");
            parts.push(reasonText);
        }
        if (options.changeGlance) {
            parts.push(options.changeGlance.title);
            if (options.changeGlance.pills && options.changeGlance.pills.length) {
                for (var glanceIndex = 0; glanceIndex < options.changeGlance.pills.length; glanceIndex++) {
                    if (options.changeGlance.pills[glanceIndex] && options.changeGlance.pills[glanceIndex].text) {
                        parts.push(options.changeGlance.pills[glanceIndex].text);
                    }
                }
            }
            if (options.changeGlance.detail) {
                parts.push(options.changeGlance.detail);
            }
        }
        if (options.queuePositionData) {
            parts.push(options.queuePositionData.roleLabel);
            parts.push(options.queuePositionData.queueLabel);
            parts.push(options.queuePositionData.detail);
        }
        parts.push("Review handoff");
        var focusLabel = getReviewFocusActionDisplayLabel(suggestion, options.preferredAction || getPreferredReviewActionFocus(options.panel))
            || getReviewFocusActionDisplayLabel(suggestion, "")
            || "Locate";
        parts.push("Enter target " + focusLabel);
        parts.push("Press Enter to reopen this suggestion and land on " + focusLabel);
        var shortcutText = getReviewCardSupplementalShortcutHint(suggestion, options.preferredAction || getPreferredReviewActionFocus(options.panel));
        if (shortcutText) {
            parts.push("More keys");
            parts.push(shortcutText);
        }
        if (options.queueTransitionData) {
            parts.push(options.queueTransitionData.title);
            parts.push(options.queueTransitionData.statusLabel);
            parts.push(options.queueTransitionData.queueLabel);
            if (options.queueTransitionData.typeLabel) {
                parts.push(options.queueTransitionData.typeLabel);
            }
            if (options.queueTransitionData.scopeLabel) {
                parts.push(options.queueTransitionData.scopeLabel);
            }
            parts.push(options.queueTransitionData.detail);
            parts.push(getQueueTransitionPreviewSummary(options.queueTransitionData));
            if (options.queueTransitionData.followupTitle) {
                parts.push(options.queueTransitionData.followupTitle);
            }
            if (options.queueTransitionData.followupDetail) {
                parts.push(options.queueTransitionData.followupDetail);
            }
        }
        return parts.join(". ");
    }

    function updateReviewCondensedPreviewAria(item, suggestion, panel) {
        if (!item || !suggestion || !item.setAttribute) {
            return;
        }
        var preferredAction = getPreferredReviewActionFocus(panel);
        var typeFilter = getReviewSuggestionTypeFilter(suggestion);
        var filteredPendingSuggestions = getFilteredPendingSuggestions(typeFilter);
        if (!filteredPendingSuggestions.length && typeFilter !== "all") {
            filteredPendingSuggestions = getFilteredPendingSuggestions("all");
        }
        var queuePositionData = buildReviewQueuePositionData(filteredPendingSuggestions, editor.__aiActiveSuggestionId, suggestion);
        var queueTransitionData = buildReviewQueueTransitionData(filteredPendingSuggestions, editor.__aiActiveSuggestionId, suggestion);
        var changeGlance = buildReviewChangeGlanceData(suggestion);
        var sharedUpdateCount = getSuggestionRemoteUpdateCount(suggestion.id);
        var originalText = summarizeSuggestionText(suggestion.originalText || "", 72) || "Original selection unavailable.";
        var resultText = summarizeSuggestionText(suggestion.resultText || "", 72) || "Suggested text unavailable.";
        var baseAria = buildReviewCondensedPreviewAriaLabel(suggestion, {
            panel: panel,
            preferredAction: preferredAction,
            previewMetaData: buildReviewCondensedPreviewMetaData(suggestion, { sharedUpdateCount: sharedUpdateCount }),
            queuePositionData: queuePositionData,
            queueTransitionData: queueTransitionData,
            changeGlance: changeGlance,
            originalText: originalText,
            resultText: resultText,
            reasonText: buildCompletionPreviewReason(suggestion)
        });
        item.setAttribute("data-rte-ai-review-base-aria-label", baseAria);
        item.setAttribute("aria-label", baseAria);
    }

    function updateVisibleReviewCondensedPreviewOpenHints(panel) {
        var panelNode = panel && panel.isConnected
            ? panel
            : (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected ? editor.__aiReviewPanel : null);
        if (!panelNode) {
            return;
        }
        var preferredAction = getPreferredReviewActionFocus(panelNode);
        var items = panelNode.querySelectorAll(".rte-ai-review-item.is-condensed");
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var suggestionId = item.getAttribute("data-rte-ai-review-id") || "";
            if (!suggestionId) {
                continue;
            }
            var suggestion = findSuggestionById(suggestionId);
            updateReviewCondensedPreviewAria(item, suggestion, panelNode);
            updateReviewCondensedPreviewOpenHint(item, suggestion, panelNode);
            syncReviewCondensedPreviewShortcutModule(item, suggestion, panelNode);
            item.title = getReviewCardShortcutTitle(suggestion, preferredAction);
        }
    }

    function updateVisibleInlineReviewFocusHints() {
        var editable = editor.getEditable ? editor.getEditable() : null;
        if (!editable || !editable.querySelectorAll) {
            return;
        }
        var wrappers = editable.querySelectorAll(".rte-ai-inline-preview");
        for (var i = 0; i < wrappers.length; i++) {
            var wrapper = wrappers[i];
            if (!wrapper || wrapper.classList.contains("is-review-active")) {
                continue;
            }
            var suggestionId = wrapper.getAttribute("data-rte-ai-suggestion-id") || "";
            if (!suggestionId || (editor.__aiReviewEmptyPreviewSuggestionId && suggestionId === editor.__aiReviewEmptyPreviewSuggestionId)) {
                continue;
            }
            var suggestion = findSuggestionById(suggestionId);
            if (!suggestion) {
                continue;
            }
            var typeFilter = getInlineReviewTypeFilter(suggestionId);
            var filteredPendingSuggestions = getFilteredPendingSuggestions(typeFilter);
            var queuePositionData = buildReviewQueuePositionData(filteredPendingSuggestions, editor.__aiActiveSuggestionId, suggestion);
            var queueTransitionData = buildReviewQueueTransitionData(filteredPendingSuggestions, editor.__aiActiveSuggestionId, suggestion);
            var reviewFocusLabel = getReviewFocusActionDisplayLabel(suggestion, getPreferredReviewActionFocus()) || getReviewFocusActionDisplayLabel(suggestion, "");
            var reviewLabel = "Open this AI suggestion in review" + (reviewFocusLabel ? " and focus " + reviewFocusLabel : "");
            var reasonText = buildCompletionPreviewReason(suggestion);
            var reviewButton = wrapper.querySelector ? wrapper.querySelector("[data-rte-ai-action=\"review\"]") : null;
            if (reviewButton) {
                updateInlineReviewActionButtonState(reviewButton, "Review", reviewLabel);
            }
            var glanceData = buildReviewChangeGlanceData(suggestion);
            var compareGlanceData = buildInlinePreviewCompareGlanceData(glanceData);
            var focusChip = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-focus") : null;
            var currentChip = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-current") : null;
            var typeChip = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-type") : null;
            var languageChip = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-language") : null;
            var scopeChip = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-scope") : null;
            var remoteChip = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-remote") : null;
            var glanceNode = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-glance") : null;
            var reasonNode = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-reason") : null;
            var shortcutsChip = wrapper.querySelector ? wrapper.querySelector(".rte-ai-inline-preview-shortcuts") : null;
            if (reviewFocusLabel) {
                if (!focusChip) {
                    focusChip = document.createElement("span");
                    focusChip.className = "rte-ai-inline-preview-focus";
                    var focusAnchor = remoteChip || scopeChip || languageChip || typeChip || currentChip;
                    if (focusAnchor && focusAnchor.nextSibling) {
                        wrapper.insertBefore(focusChip, focusAnchor.nextSibling);
                    }
                    else {
                        wrapper.appendChild(focusChip);
                    }
                }
                focusChip.textContent = "Focus " + reviewFocusLabel;
                focusChip.setAttribute("aria-label", "Review opens on " + reviewFocusLabel);
            }
            else if (focusChip && focusChip.parentNode) {
                focusChip.parentNode.removeChild(focusChip);
            }
            if (glanceData && glanceData.pills && glanceData.pills.length) {
                if (!glanceNode) {
                    glanceNode = document.createElement("span");
                    glanceNode.className = "rte-ai-inline-preview-glance";
                    var glanceAnchor = scopeChip || typeChip || currentChip;
                    if (glanceAnchor && glanceAnchor.nextSibling) {
                        wrapper.insertBefore(glanceNode, glanceAnchor.nextSibling);
                    }
                    else {
                        wrapper.appendChild(glanceNode);
                    }
                }
                while (glanceNode.firstChild) {
                    glanceNode.removeChild(glanceNode.firstChild);
                }
                for (var glanceIndex = 0; glanceIndex < glanceData.pills.length; glanceIndex++) {
                    var glancePill = glanceData.pills[glanceIndex];
                    if (!glancePill || !glancePill.text || glancePill.kind === "scope") {
                        continue;
                    }
                    append(glanceNode, "span", "", "rte-ai-review-item-glance-pill is-" + glancePill.kind, glancePill.text);
                }
                if (!glanceNode.childNodes.length && glanceNode.parentNode) {
                    glanceNode.parentNode.removeChild(glanceNode);
                    glanceNode = null;
                }
            }
            else if (glanceNode && glanceNode.parentNode) {
                glanceNode.parentNode.removeChild(glanceNode);
            }
            syncInlinePreviewCompareHeaderNode(wrapper, suggestion);
            syncInlinePreviewCompareMetaNode(wrapper, suggestion);
            syncInlinePreviewCompareGlanceNode(wrapper, compareGlanceData);
            reasonNode = syncInlinePreviewReasonNode(wrapper, reasonNode, suggestion);
            shortcutsChip = syncInlinePreviewShortcutNode(wrapper, shortcutsChip);
            syncInlinePreviewActionSummaryNode(wrapper, {
                suggestion: suggestion,
                sharedUpdateCount: getSuggestionRemoteUpdateCount(suggestionId),
                queueTransitionData: queueTransitionData
            });
            syncInlinePreviewActionGroupHeaders(wrapper, {
                suggestion: suggestion,
                sharedUpdateCount: getSuggestionRemoteUpdateCount(suggestionId)
            });
            wrapper.setAttribute("aria-label", buildInlineSuggestionAriaLabel(suggestion, {
                remoteUpdateCount: getSuggestionRemoteUpdateCount(suggestionId),
                glanceLabels: glanceData ? glanceData.pills.map(function (pill) { return pill.text; }) : [],
                glanceDetail: glanceData ? glanceData.detail : "",
                compareLabel: "Proposed edit. Current and suggested text.",
                reasonText: reasonText,
                focusLabel: reviewFocusLabel,
                queueRoleLabel: queuePositionData ? queuePositionData.roleLabel : "",
                queueRoleDetail: queuePositionData ? queuePositionData.detail : "",
                transitionLabel: queueTransitionData ? (queueTransitionData.title + ". " + queueTransitionData.statusLabel + ". " + queueTransitionData.queueLabel + ". " + getQueueTransitionPreviewSummary(queueTransitionData)) : "",
                followupLabel: queueTransitionData && queueTransitionData.followupTitle ? (queueTransitionData.followupTitle + ". " + queueTransitionData.followupDetail) : ""
            }));
        }
    }

    function appendReviewCondensedPreview(parent, suggestion, panel, options) {
        if (!parent || !suggestion) {
            return null;
        }
        options = options || {};
        var queuePositionData = options.queuePositionData || null;
        var queueTransitionData = options.queueTransitionData || null;
        var previewMetaData = buildReviewCondensedPreviewMetaData(suggestion, options);
        var glanceData = buildReviewChangeGlanceData(suggestion);
        var originalText = summarizeSuggestionText(suggestion.originalText || "", 72) || "Original selection unavailable.";
        var resultText = summarizeSuggestionText(suggestion.resultText || "", 72) || "Suggested text unavailable.";
        var reasonText = buildCompletionPreviewReason(suggestion);
        var diffParts = buildCompletionPreviewDiffParts(originalText, resultText);
        var preview = append(parent, "div", "", "rte-ai-review-item-condensed-preview");
        var previewHeader = append(preview, "div", "", "rte-ai-review-item-condensed-preview-header");
        append(previewHeader, "div", "", "rte-ai-review-item-condensed-preview-title", "Proposed edit");
        append(previewHeader, "div", "", "rte-ai-review-item-condensed-preview-detail", "Current and suggested text");
        if (previewMetaData && previewMetaData.length) {
            var previewMeta = append(preview, "div", "", "rte-ai-review-item-condensed-preview-meta");
            for (var metaIndex = 0; metaIndex < previewMetaData.length; metaIndex++) {
                var metaPill = previewMetaData[metaIndex];
                if (!metaPill || !metaPill.text) {
                    continue;
                }
                append(previewMeta, "span", "", "rte-ai-review-item-condensed-preview-pill is-" + (metaPill.kind || "other"), metaPill.text);
            }
        }
        var currentLine = append(preview, "div", "", "rte-ai-review-item-condensed-preview-line is-current");
        append(currentLine, "span", "", "rte-ai-review-item-condensed-preview-label", "Current");
        appendReviewCompareDeltaText(currentLine, "current", originalText, diffParts);
        var resultLine = append(preview, "div", "", "rte-ai-review-item-condensed-preview-line is-result");
        append(resultLine, "span", "", "rte-ai-review-item-condensed-preview-label", "Suggested");
        appendReviewCompareDeltaText(resultLine, "result", resultText, diffParts);
        if (reasonText) {
            var reason = append(preview, "div", "", "rte-ai-review-item-condensed-reason");
            append(reason, "span", "", "rte-ai-review-item-condensed-reason-label", "Why");
            append(reason, "div", "", "rte-ai-review-item-condensed-reason-copy", reasonText);
        }
        if (glanceData && glanceData.pills && glanceData.pills.length) {
            var glance = append(preview, "div", "", "rte-ai-review-item-condensed-glance");
            append(glance, "div", "", "rte-ai-review-item-condensed-glance-title", "Change at a glance");
            var glanceMeta = append(glance, "div", "", "rte-ai-review-item-condensed-glance-meta");
            for (var glanceIndex = 0; glanceIndex < glanceData.pills.length; glanceIndex++) {
                var glancePill = glanceData.pills[glanceIndex];
                append(glanceMeta, "span", "", "rte-ai-review-item-glance-pill is-" + glancePill.kind, glancePill.text);
            }
            if (glanceData.detail) {
                append(glance, "div", "", "rte-ai-review-item-condensed-glance-detail", glanceData.detail);
            }
        }
        appendReviewCondensedPreviewQueueSection(preview, queuePositionData);
        var entry = append(preview, "div", "", "rte-ai-review-item-condensed-entry");
        append(entry, "div", "", "rte-ai-review-item-condensed-entry-title", "Review handoff");
        var openHint = append(entry, "div", "", "rte-ai-review-item-condensed-open");
        append(openHint, "span", "", "rte-ai-review-item-condensed-open-label", "Enter target");
        append(openHint, "span", "", "rte-ai-review-item-condensed-open-pill");
        append(entry, "div", "", "rte-ai-review-item-condensed-entry-detail");
        updateReviewCondensedPreviewOpenHint(entry, suggestion, panel);
        syncReviewCondensedPreviewShortcutModule(entry, suggestion, panel);
        appendReviewCondensedPreviewTransitionSection(preview, queueTransitionData);
        return preview;
    }

    function buildReviewEmptyState(counts, filteredPendingCount, typeFilter, showResolved, nextOverallPendingId, pendingCountsByType, typeOptions) {
        var hasResolved = !!(counts.accepted || counts.rejected || counts.stale);
        var preferredQueueFocusAction = getPreferredReviewActionFocus();
        var undoableDecision = getUndoableReviewDecision();
        var undoContext = getUndoDecisionContext(undoableDecision);
        var undoAction = undoableDecision ? {
            id: "undo-last",
            label: undoContext.actionLabel,
            focusActionLabel: getRecoveryDecisionFocusActionDisplayLabel(undoableDecision, preferredQueueFocusAction)
        } : null;
        if (typeFilter !== "all" && !filteredPendingCount) {
            var nextTypeActions = [];
            var nextTypePreviews = [];
            var nextQueueLabels = [];
            var options = typeOptions || [];
            var countsByType = pendingCountsByType || {};
            for (var optionIndex = 0; optionIndex < options.length; optionIndex++) {
                var option = options[optionIndex];
                if (!option || option.value === "all" || option.value === typeFilter) {
                    continue;
                }
                var optionCount = countsByType[option.value] || 0;
                if (!optionCount) {
                    continue;
                }
                var previewSuggestionId = getNextPendingSuggestionId(option.value, "");
                var previewSuggestion = previewSuggestionId ? findSuggestionById(previewSuggestionId) : null;
                var previewText = previewSuggestion
                    ? summarizeSuggestionText(previewSuggestion.originalText || previewSuggestion.resultText || "", 84)
                    : "";
                var previewResultText = buildCompletionPreviewResult(previewSuggestion);
                var changeLabel = buildCompletionPreviewChangeLabel(previewSuggestion);
                var impactLabel = buildCompletionPreviewImpactLabel(previewSuggestion);
                var scopeLabel = previewSuggestion ? getSuggestionScopeLabel(previewSuggestion) : "";
                var languageLabel = previewSuggestion && previewSuggestion.language ? getTranslateLanguageLabel(previewSuggestion.language) : "";
                var reasonText = buildCompletionPreviewReason(previewSuggestion);
                nextQueueLabels.push(option.label + " (" + optionCount + ")");
                nextTypeActions.push({
                    id: "go-type",
                    label: "Go to " + option.label + " (" + optionCount + ")",
                    typeValue: option.value,
                    suggestionId: previewSuggestionId,
                    focusAction: preferredQueueFocusAction,
                    focusActionLabel: getReviewFocusActionDisplayLabel(previewSuggestion, preferredQueueFocusAction)
                });
                if (previewText) {
                    nextTypePreviews.push({
                        label: option.label + " next",
                        text: previewText,
                        typeValue: option.value,
                        suggestionId: previewSuggestionId,
                        actionLabel: "Go to " + option.label + " (" + optionCount + ")",
                        focusAction: preferredQueueFocusAction,
                        pendingCountLabel: optionCount + " pending",
                        changeLabel: changeLabel,
                        impactLabel: impactLabel,
                        focusActionLabel: getReviewFocusActionDisplayLabel(previewSuggestion, preferredQueueFocusAction),
                        scopeLabel: scopeLabel,
                        languageLabel: languageLabel,
                        resultText: previewResultText,
                        reasonText: reasonText
                    });
                }
            }
            var filteredTypeLabel = getSuggestionTypeLabel(typeFilter);
            return {
                title: filteredTypeLabel + " queue complete",
                detail: counts.pending
                    ? "No pending " + filteredTypeLabel.toLowerCase() + " suggestions remain. Continue into another AI queue, switch back to all types, or review resolved items."
                    : "No pending " + filteredTypeLabel.toLowerCase() + " suggestions remain, and the overall AI review queue is complete.",
                announceMessage: counts.pending
                    ? (nextQueueLabels.length === 1
                        ? filteredTypeLabel + " queue complete. Next queue: " + nextQueueLabels[0] + "."
                        : nextQueueLabels.length > 1
                            ? filteredTypeLabel + " queue complete. Next queues available: " + nextQueueLabels.join(", ") + "."
                            : filteredTypeLabel + " queue complete. Pending AI review remains in other queues.")
                    : filteredTypeLabel + " queue complete. Overall AI review queue complete.",
                previewItems: nextTypePreviews,
                actions: nextTypeActions.concat([
                    counts.pending && nextOverallPendingId ? {
                        id: "next-overall",
                        label: "Next pending overall",
                        suggestionId: nextOverallPendingId,
                        focusAction: preferredQueueFocusAction,
                        focusActionLabel: getReviewFocusActionDisplayLabel(findSuggestionById(nextOverallPendingId), preferredQueueFocusAction)
                    } : null,
                    undoAction,
                    { id: "all-types", label: "All types" },
                    hasResolved && !showResolved ? { id: "show-resolved", label: "Show resolved" } : null,
                    { id: "open-chat", label: "AI Chat" }
                ])
            };
        }
        if (!counts.pending) {
            return {
                title: "Review queue complete",
                detail: hasResolved
                    ? "All AI suggestions have been reviewed. You can inspect resolved items or open AI Chat to generate more suggestions."
                    : "There are no pending AI suggestions right now. Open AI Chat to create a new review pass.",
                announceMessage: hasResolved
                    ? "Review queue complete. All AI suggestions have been reviewed."
                    : "Review queue complete. No pending AI suggestions remain.",
                actions: [
                    undoAction,
                    hasResolved && !showResolved ? { id: "show-resolved", label: "Show resolved" } : null,
                    { id: "open-chat", label: "AI Chat" }
                ]
            };
        }
        return {
            title: "No suggestions in this view",
            detail: "Suggestions from Ask AI or the chat panel stay here until you accept or reject them.",
            announceMessage: "",
            actions: [
                undoAction,
                typeFilter !== "all" ? { id: "all-types", label: "All types" } : null,
                hasResolved && !showResolved ? { id: "show-resolved", label: "Show resolved" } : null,
                { id: "open-chat", label: "AI Chat" }
            ]
        };
    }

    function getReviewOverviewStatusLabel(counts, filteredPendingCount, typeFilter) {
        if (!counts || !counts.total) {
            return "No suggestions";
        }
        if (typeFilter !== "all" && filteredPendingCount > 0) {
            return getSuggestionTypeLabel(typeFilter) + " queue";
        }
        if (counts.pending > 0) {
            return "Reviewing";
        }
        if (counts.stale > 0) {
            return "Needs refresh";
        }
        return "Queue complete";
    }

    function getReviewOverviewTitle(counts, filteredPendingCount, typeFilter, activePendingPosition) {
        if (!counts || !counts.total) {
            return "Ask AI to create a review queue.";
        }
        if (activePendingPosition && activePendingPosition.total && activePendingPosition.index) {
            return "Item " + activePendingPosition.index + " of " + activePendingPosition.total + " is active now.";
        }
        if (typeFilter !== "all" && filteredPendingCount > 0) {
            return filteredPendingCount + " " + getSuggestionTypeLabel(typeFilter).toLowerCase() + " item" + (filteredPendingCount === 1 ? "" : "s") + " ready to review.";
        }
        if (counts.pending > 0) {
            return counts.pending + " pending item" + (counts.pending === 1 ? "" : "s") + " ready for review.";
        }
        return "Everything in this queue has been reviewed for now.";
    }

    function getReviewOverviewDetail(counts, filteredPendingCount, typeFilter, activityNotice) {
        if (!counts || !counts.total) {
            return "Use Ask AI, AI Chat, or inline review actions to generate reviewable changes.";
        }
        var details = [];
        if (typeFilter !== "all") {
            details.push("Showing only " + getSuggestionTypeLabel(typeFilter).toLowerCase() + " suggestions.");
        }
        else {
            details.push("Showing every AI suggestion in this editor.");
        }
        if (activityNotice && activityNotice.count) {
            details.push(activityNotice.count + " shared update" + (activityNotice.count === 1 ? "" : "s") + " waiting.");
        }
        else if (counts.stale > 0) {
            details.push(counts.stale + " suggestion" + (counts.stale === 1 ? "" : "s") + " may need refresh.");
        }
        else if (counts.pending > 0 && typeFilter !== "all" && filteredPendingCount !== counts.pending) {
            details.push(counts.pending + " total pending across all queues.");
        }
        return details.join(" ");
    }

    function getReviewItemStateTitle(suggestion, isCurrent, isQueueOpenedItem) {
        if (!suggestion) {
            return "AI suggestion";
        }
        if (suggestion.status === "pending" && isQueueOpenedItem) {
            return "Opened from queue switcher";
        }
        if (suggestion.status === "pending" && isCurrent) {
            return "Ready to review now";
        }
        if (suggestion.status === "accepted") {
            return "Accepted change";
        }
        if (suggestion.status === "rejected") {
            return "Rejected change";
        }
        if (suggestion.status === "stale") {
            return "Needs refresh";
        }
        return getSuggestionStatusLabel(suggestion.status);
    }

    function getReviewItemStateDetail(suggestion, isCurrent, isQueueOpenedItem, sharedUpdateCount) {
        if (!suggestion) {
            return "";
        }
        var details = [];
        if (suggestion.status === "pending" && isCurrent) {
            details.push("This is the active item in the current queue.");
        }
        else if (suggestion.status === "pending" && isQueueOpenedItem) {
            details.push("This item was opened from the queue-complete handoff.");
        }
        else if (suggestion.status === "stale") {
            details.push("Review the latest editor text before deciding.");
        }
        else if (suggestion.status === "accepted" || suggestion.status === "rejected") {
            details.push("This decision stays in history until you reopen it.");
        }
        var scopeLabel = suggestion.sourceLabel || (suggestion.snapshot && suggestion.snapshot.hasSelection ? "Selection suggestion" : "Document suggestion");
        if (scopeLabel) {
            details.push(scopeLabel + ".");
        }
        if (sharedUpdateCount) {
            details.push(sharedUpdateCount > 1 ? sharedUpdateCount + " shared updates are waiting." : "A shared update is waiting.");
        }
        return details.join(" ");
    }

    function buildReviewEmptyHintText(primaryActionLabel, hasQueueSwitcher) {
        var text = "";
        if (!primaryActionLabel) {
            text = "Press Tab for available actions.";
        }
        else {
            text = hasQueueSwitcher
            ? "Press Enter to " + primaryActionLabel + ". J/K or Left/Right switch queues. Home/End jump queues. Tab for more actions."
            : "Press Enter to " + primaryActionLabel + ". Tab for more actions.";
        }
        var undoContext = getUndoDecisionContext();
        var redoContext = getRedoDecisionContext();
        return hasUndoableReviewShortcut()
            ? text.replace(/\.$/, "") + ". Press U to " + undoContext.shortcutLabel + "." + (hasRedoableReviewShortcut() ? " Press Shift+U to " + redoContext.shortcutLabel + "." : "")
            : (hasRedoableReviewShortcut()
                ? text.replace(/\.$/, "") + ". Press Shift+U to " + redoContext.shortcutLabel + "."
                : text);
    }

    function buildReviewEmptyShortcutText(primaryActionLabel, options) {
        options = options || {};
        var undoContext = getUndoDecisionContext();
        var redoContext = getRedoDecisionContext();
        if (!primaryActionLabel) {
            var emptyParts = [];
            if (hasUndoableReviewShortcut()) {
                emptyParts.push("U " + undoContext.shortcutLabel);
            }
            if (hasRedoableReviewShortcut()) {
                emptyParts.push("Shift+U " + redoContext.shortcutLabel);
            }
            emptyParts.push("Esc close");
            return "Shortcuts: " + emptyParts.join(", ");
        }
        var parts = ["Enter " + primaryActionLabel];
        if (options.queueSwitcher) {
            parts.push("J/K or Left/Right switch queues");
            parts.push("Home/End jump queues");
        }
        if (hasUndoableReviewShortcut()) {
            parts.push("U " + undoContext.shortcutLabel);
        }
        if (hasRedoableReviewShortcut()) {
            parts.push("Shift+U " + redoContext.shortcutLabel);
        }
        parts.push("Tab more actions");
        parts.push("Esc close");
        return "Shortcuts: " + parts.join(", ");
    }

    function getReviewEmptyControlShortcutTitle(label, options) {
        options = options || {};
        var parts = ["Enter activates " + (label || "this action") + (options.focusLabel ? " and focuses " + options.focusLabel : "") + "."];
        if (options.queueSwitcher) {
            parts.push("J/K or Left/Right switch queues. Home/End jump queues.");
        }
        parts.push("Tab moves to more actions.");
        var undoContext = getUndoDecisionContext();
        var redoContext = getRedoDecisionContext();
        var title = parts.join(" ");
        if (hasUndoableReviewShortcut()) {
            title = title.replace(/\.$/, "") + " U undoes " + undoContext.decisionLabel + " decision.";
        }
        if (hasRedoableReviewShortcut()) {
            title = title.replace(/\.$/, "") + " Shift+U redoes " + redoContext.decisionLabel + " decision.";
        }
        return title;
    }

    function getReviewEmptyControlShortcutKeys(options) {
        options = options || {};
        var keys = options.queueSwitcher
            ? "Enter Space J K ArrowLeft ArrowRight Home End"
            : "Enter Space";
        return appendUndoShortcutKeys(keys);
    }

    function announceReviewStatus(message) {
        var node = ensureReviewStatusNode();
        var text = normalizeText(message || "");
        if (!node || !text) {
            return false;
        }

        if (editor.__aiReviewStatusTimer) {
            clearTimeout(editor.__aiReviewStatusTimer);
        }
        node.textContent = "";
        editor.__aiReviewStatusTimer = setTimeout(function () {
            if (node) {
                node.textContent = text;
            }
        }, 30);
        return true;
    }

    function createChatSessionId() {
        return "chat-" + new Date().getTime().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    }

    function getChatHistoryStorageKey() {
        var storageKey = getPersistenceStorageKey();
        return storageKey ? (storageKey + ".ChatSessions") : "";
    }

    function cloneChatMessageForStorage(message) {
        if (!message) {
            return null;
        }
        var copy = {
            role: message.role || "assistant",
            text: normalizeText(message.text || ""),
            scope: message.scope === "selection" ? "selection" : "document",
            timestamp: message.timestamp || 0,
            isError: !!message.isError
        };
        if (message.snapshot) {
            copy.snapshot = {
                hasSelection: !!message.snapshot.hasSelection
            };
        }
        if (message.resolved) {
            try {
                copy.resolved = JSON.parse(JSON.stringify(message.resolved));
            }
            catch (ignore) {
            }
        }
        return copy;
    }

    function restoreChatMessageFromStorage(raw) {
        if (!raw) {
            return null;
        }
        return {
            role: raw.role || "assistant",
            text: normalizeText(raw.text || ""),
            scope: raw.scope === "selection" ? "selection" : "document",
            resolved: raw.resolved || null,
            snapshot: raw.snapshot ? { hasSelection: !!raw.snapshot.hasSelection } : null,
            timestamp: raw.timestamp || 0,
            isError: !!raw.isError
        };
    }

    function cloneChatMessagesForStorage(messages) {
        var items = [];
        var source = messages || [];
        var startIndex = Math.max(0, source.length - 24);
        for (var i = startIndex; i < source.length; i++) {
            var cloned = cloneChatMessageForStorage(source[i]);
            if (cloned) {
                items.push(cloned);
            }
        }
        return items;
    }

    function restoreChatMessagesFromStorage(messages) {
        var items = [];
        var source = messages || [];
        for (var i = 0; i < source.length; i++) {
            var restored = restoreChatMessageFromStorage(source[i]);
            if (restored) {
                items.push(restored);
            }
        }
        return items;
    }

    function buildChatSessionTitle(messages) {
        var items = messages || [];
        for (var i = 0; i < items.length; i++) {
            if (items[i] && items[i].role === "user" && normalizeText(items[i].text || "")) {
                return truncateText(normalizeText(items[i].text || ""), 34);
            }
        }
        for (var j = 0; j < items.length; j++) {
            if (items[j] && normalizeText(items[j].text || "")) {
                return truncateText(normalizeText(items[j].text || ""), 34);
            }
        }
        return "New chat";
    }

    function cloneChatSessionRecord(record) {
        if (!record || !record.id) {
            return null;
        }
        return {
            id: record.id,
            title: normalizeText(record.title || ""),
            scope: record.scope === "selection" ? "selection" : "document",
            updatedAt: record.updatedAt || 0,
            messageCount: record.messageCount || 0,
            exchangeCount: record.exchangeCount || 0,
            messages: cloneChatMessagesForStorage(record.messages || [])
        };
    }

    function buildChatSessionRecordFromState(state) {
        if (!state || !state.sessionId || !state.messages || !state.messages.length) {
            return null;
        }
        return {
            id: state.sessionId,
            title: buildChatSessionTitle(state.messages),
            scope: state.scope === "selection" ? "selection" : "document",
            updatedAt: new Date().getTime(),
            messageCount: state.messages.length,
            exchangeCount: getChatExchangeCount(state.messages),
            messages: cloneChatMessagesForStorage(state.messages)
        };
    }

    function normalizeChatSessionStore(store) {
        var normalized = {
            version: "2026-05-31",
            activeSessionId: store && store.activeSessionId ? store.activeSessionId : "",
            sessions: []
        };
        var source = store && store.sessions ? store.sessions : [];
        for (var i = 0; i < source.length; i++) {
            var session = cloneChatSessionRecord(source[i]);
            if (session) {
                normalized.sessions.push(session);
            }
        }
        normalized.sessions.sort(function (left, right) {
            return (right.updatedAt || 0) - (left.updatedAt || 0);
        });
        if (normalized.sessions.length > 6) {
            normalized.sessions = normalized.sessions.slice(0, 6);
        }
        return normalized;
    }

    function getChatSessionStore() {
        if (!editor.__aiChatSessionStore) {
            var parsed = null;
            var storageKey = getChatHistoryStorageKey();
            if (storageKey && window.localStorage) {
                try {
                    parsed = JSON.parse(window.localStorage.getItem(storageKey) || "null");
                }
                catch (ignore) {
                }
            }
            editor.__aiChatSessionStore = normalizeChatSessionStore(parsed || {});
        }
        return editor.__aiChatSessionStore;
    }

    function persistChatSessionStore() {
        var storageKey = getChatHistoryStorageKey();
        editor.__aiChatSessionStore = normalizeChatSessionStore(getChatSessionStore());
        if (storageKey && window.localStorage) {
            try {
                window.localStorage.setItem(storageKey, JSON.stringify(editor.__aiChatSessionStore));
            }
            catch (ignore) {
            }
        }
        return editor.__aiChatSessionStore;
    }

    function persistChatState(state) {
        if (!state) {
            return false;
        }
        var store = getChatSessionStore();
        var nextSessions = [];
        var currentRecord = buildChatSessionRecordFromState(state);
        if (currentRecord) {
            nextSessions.push(currentRecord);
        }
        for (var i = 0; i < store.sessions.length; i++) {
            var session = store.sessions[i];
            if (!session || session.id === state.sessionId) {
                continue;
            }
            nextSessions.push(session);
        }
        store.activeSessionId = state.sessionId || store.activeSessionId || "";
        store.sessions = nextSessions;
        persistChatSessionStore();
        return true;
    }

    function getChatSessionsForApi(options) {
        options = options || {};
        var maxCount = parseInt(options.maxCount, 10);
        var sessions = getRecentChatSessions(getChatState(), maxCount > 0 ? maxCount : 6);
        var result = [];
        for (var i = 0; i < sessions.length; i++) {
            var copy = cloneChatSessionRecord(sessions[i]);
            if (!copy) {
                continue;
            }
            copy.active = copy.id === getChatState().sessionId;
            if (options.includeMessages !== true) {
                delete copy.messages;
            }
            result.push(copy);
        }
        return result;
    }

    function loadChatSessionForApi(sessionId, options) {
        options = options || {};
        var loaded = restoreChatSessionIntoState(getChatState(), sessionId, options.statusText || "Loaded a recent AI chat.");
        if (loaded && isChatPanelOpen()) {
            renderChatPanel(options.focusComposer !== false);
        }
        return loaded;
    }

    function clearChatSessionsForApi(options) {
        options = options || {};
        var storageKey = getChatHistoryStorageKey();
        editor.__aiChatSessionStore = normalizeChatSessionStore({});
        if (storageKey && window.localStorage) {
            try {
                window.localStorage.removeItem(storageKey);
            }
            catch (ignore) {
            }
        }
        var state = getChatState();
        state.messages = [];
        state.draft = "";
        state.busy = false;
        state.status = options.statusText || "Cleared AI chat history.";
        state.sessionVersion = (state.sessionVersion || 0) + 1;
        state.sessionId = createChatSessionId();
        getChatSessionStore().activeSessionId = state.sessionId;
        persistChatSessionStore();
        if (isChatPanelOpen()) {
            renderChatPanel(options.focusComposer === true);
        }
        return true;
    }

    function getRecentChatSessions(state, maxCount) {
        var store = getChatSessionStore();
        var sessions = store.sessions.slice();
        var currentRecord = buildChatSessionRecordFromState(state);
        var seen = {};
        var visible = [];
        var limit = maxCount || 4;
        if (currentRecord) {
            visible.push(currentRecord);
            seen[currentRecord.id] = true;
        }
        for (var i = 0; i < sessions.length && visible.length < limit; i++) {
            if (!sessions[i] || seen[sessions[i].id]) {
                continue;
            }
            visible.push(cloneChatSessionRecord(sessions[i]));
            seen[sessions[i].id] = true;
        }
        return visible;
    }

    function restoreChatSessionIntoState(state, sessionId, statusText) {
        if (!state || !sessionId) {
            return false;
        }
        var store = getChatSessionStore();
        var target = null;
        for (var i = 0; i < store.sessions.length; i++) {
            if (store.sessions[i] && store.sessions[i].id === sessionId) {
                target = store.sessions[i];
                break;
            }
        }
        if (!target) {
            return false;
        }
        state.sessionId = target.id;
        state.messages = restoreChatMessagesFromStorage(target.messages || []);
        state.draft = "";
        state.scope = target.scope === "selection" ? "selection" : "document";
        state.busy = false;
        state.status = statusText || "Loaded a recent AI chat.";
        state.sessionVersion = (state.sessionVersion || 0) + 1;
        persistChatState(state);
        return true;
    }

    function getChatState() {
        if (!editor.__aiChatState) {
            var snapshot = captureSelectionSnapshot();
            var store = getChatSessionStore();
            var activeSession = null;
            for (var i = 0; i < store.sessions.length; i++) {
                if (store.sessions[i] && store.sessions[i].id === store.activeSessionId) {
                    activeSession = store.sessions[i];
                    break;
                }
            }
            if (!activeSession && store.activeSessionId) {
                editor.__aiChatState = {
                    messages: [],
                    draft: "",
                    scope: snapshot.hasSelection ? "selection" : "document",
                    busy: false,
                    status: "",
                    sessionVersion: 0,
                    sessionId: store.activeSessionId
                };
            }
            else if (!activeSession && store.sessions.length) {
                activeSession = store.sessions[0];
            }
            if (!editor.__aiChatState) {
                editor.__aiChatState = activeSession
                ? {
                    messages: restoreChatMessagesFromStorage(activeSession.messages || []),
                    draft: "",
                    scope: activeSession.scope === "selection" ? "selection" : "document",
                    busy: false,
                    status: "",
                    sessionVersion: 0,
                    sessionId: activeSession.id
                }
                : {
                    messages: [],
                    draft: "",
                    scope: snapshot.hasSelection ? "selection" : "document",
                    busy: false,
                    status: "",
                    sessionVersion: 0,
                    sessionId: createChatSessionId()
                };
            }
        }
        return editor.__aiChatState;
    }

    function resetChatConversationState(state, statusText) {
        if (!state) {
            return;
        }
        state.messages = [];
        state.draft = "";
        state.busy = false;
        state.status = statusText || "";
        state.sessionVersion = (state.sessionVersion || 0) + 1;
        state.sessionId = createChatSessionId();
        persistChatState(state);
    }

    function resolveChatScope() {
        var state = getChatState();
        var snapshot = captureSelectionSnapshot();
        var scope = state.scope === "selection" && snapshot.hasSelection ? "selection" : "document";
        var source = scope === "selection"
            ? (snapshot.text || snapshot.wholeText)
            : snapshot.wholeText;
        return {
            scope: scope,
            snapshot: snapshot,
            source: source,
            summary: truncateText(source, 180) || "The document is currently empty."
        };
    }

    function rememberChatReturnFocus() {
        var active = document.activeElement;
        if (!active || active === document.body || active === document.documentElement) {
            return;
        }
        if (editor.__aiChatPanel && editor.__aiChatPanel.contains && editor.__aiChatPanel.contains(active)) {
            return;
        }
        if (typeof active.focus === "function") {
            editor.__aiChatReturnFocusNode = active;
        }
    }

    function restoreChatReturnFocus(target) {
        if (target && target.isConnected !== false && typeof target.focus === "function" && !target.disabled) {
            try {
                target.focus({ preventScroll: true });
            }
            catch (ignore) {
                try {
                    target.focus();
                }
                catch (focusError) {
                }
            }
            if (document.activeElement === target) {
                return true;
            }
        }
        if (editor && typeof editor.focus === "function") {
            try {
                editor.focus();
                return true;
            }
            catch (ignoreEditorFocus) {
            }
        }
        return false;
    }

    function closeChatPanel(options) {
        options = options || {};
        var returnFocusNode = editor.__aiChatReturnFocusNode || null;
        if (editor.__aiChatPanel && editor.__aiChatPanel.parentNode) {
            editor.__aiChatPanel.parentNode.removeChild(editor.__aiChatPanel);
        }
        if (editor.__aiChatShell && editor.__aiChatShell.classList) {
            editor.__aiChatShell.classList.remove("rte-ai-chat-host");
        }
        if (editor.__aiChatShell && editor.__aiChatShell.style) {
            editor.__aiChatShell.style.minHeight = typeof editor.__aiChatOriginalMinHeight === "string"
                ? editor.__aiChatOriginalMinHeight
                : "";
        }
        editor.__aiChatPanel = null;
        editor.__aiChatShell = null;
        editor.__aiChatOriginalMinHeight = null;
        if (!options.preserveReturnFocus) {
            editor.__aiChatReturnFocusNode = null;
        }
        if (options.restoreFocus) {
            restoreChatReturnFocus(returnFocusNode);
        }
    }

    function captureChatPanelFocusState(panel) {
        if (!panel || !panel.contains || !document.activeElement || !panel.contains(document.activeElement)) {
            return null;
        }
        var active = document.activeElement;
        if (active.classList && active.classList.contains("rte-ai-chat-input")) {
            return { kind: "composer" };
        }
        var headerAction = active.getAttribute("data-rte-ai-chat-header-action");
        if (headerAction) {
            return { kind: "header-action", value: headerAction };
        }
        var scopeTarget = active.getAttribute("data-rte-ai-chat-scope-target");
        if (scopeTarget) {
            return { kind: "scope", value: scopeTarget };
        }
        var promptId = active.getAttribute("data-rte-ai-chat-prompt-id");
        if (promptId) {
            return { kind: "quick", value: promptId };
        }
        var sessionId = active.getAttribute("data-rte-ai-chat-session-id");
        if (sessionId) {
            return { kind: "session", value: sessionId };
        }
        var actionId = active.getAttribute("data-rte-ai-chat-action");
        if (actionId) {
            if (active.closest && active.closest(".rte-ai-chat-composer-actions")) {
                return { kind: "composer-action", value: actionId };
            }
            var messageNode = active.closest ? active.closest(".rte-ai-chat-message") : null;
            if (messageNode) {
                return {
                    kind: "message-action",
                    value: actionId,
                    exchangeIndex: messageNode.getAttribute("data-rte-ai-chat-exchange-index") || "",
                    threadRole: messageNode.getAttribute("data-rte-ai-chat-thread-role") || ""
                };
            }
        }
        if (active === panel) {
            return { kind: "panel" };
        }
        return null;
    }

    function findChatPanelFocusTarget(panel, descriptor) {
        if (!panel || !descriptor || !descriptor.kind) {
            return null;
        }
        var i = 0;
        var nodes;
        switch (descriptor.kind) {
        case "composer":
            return panel.querySelector(".rte-ai-chat-input");
        case "panel":
            return panel;
        case "header-action":
            nodes = panel.querySelectorAll("[data-rte-ai-chat-header-action]");
            for (i = 0; i < nodes.length; i++) {
                if ((nodes[i].getAttribute("data-rte-ai-chat-header-action") || "") === descriptor.value) {
                    return nodes[i];
                }
            }
            return null;
        case "scope":
            nodes = panel.querySelectorAll("[data-rte-ai-chat-scope-target]");
            for (i = 0; i < nodes.length; i++) {
                if ((nodes[i].getAttribute("data-rte-ai-chat-scope-target") || "") === descriptor.value) {
                    return nodes[i];
                }
            }
            return null;
        case "quick":
            nodes = panel.querySelectorAll("[data-rte-ai-chat-prompt-id]");
            for (i = 0; i < nodes.length; i++) {
                if ((nodes[i].getAttribute("data-rte-ai-chat-prompt-id") || "") === descriptor.value) {
                    return nodes[i];
                }
            }
            return null;
        case "session":
            nodes = panel.querySelectorAll("[data-rte-ai-chat-session-id]");
            for (i = 0; i < nodes.length; i++) {
                if ((nodes[i].getAttribute("data-rte-ai-chat-session-id") || "") === descriptor.value) {
                    return nodes[i];
                }
            }
            return null;
        case "composer-action":
            nodes = panel.querySelectorAll(".rte-ai-chat-composer-actions [data-rte-ai-chat-action]");
            for (i = 0; i < nodes.length; i++) {
                if ((nodes[i].getAttribute("data-rte-ai-chat-action") || "") === descriptor.value) {
                    return nodes[i];
                }
            }
            return null;
        case "message-action":
            nodes = panel.querySelectorAll(".rte-ai-chat-message [data-rte-ai-chat-action]");
            for (i = 0; i < nodes.length; i++) {
                var messageNode = nodes[i].closest ? nodes[i].closest(".rte-ai-chat-message") : null;
                if (!messageNode) {
                    continue;
                }
                if ((nodes[i].getAttribute("data-rte-ai-chat-action") || "") !== descriptor.value) {
                    continue;
                }
                if ((messageNode.getAttribute("data-rte-ai-chat-exchange-index") || "") !== (descriptor.exchangeIndex || "")) {
                    continue;
                }
                if ((messageNode.getAttribute("data-rte-ai-chat-thread-role") || "") !== (descriptor.threadRole || "")) {
                    continue;
                }
                return nodes[i];
            }
            return null;
        default:
            return null;
        }
    }

    function restoreChatPanelFocus(panel, descriptor) {
        var target = findChatPanelFocusTarget(panel, descriptor);
        if (!target || target.disabled) {
            return false;
        }
        try {
            target.focus({ preventScroll: true });
        }
        catch (ignore) {
            try {
                target.focus();
            }
            catch (focusError) {
                return false;
            }
        }
        return document.activeElement === target;
    }

    function captureChatFeedScrollState(panel) {
        if (!panel || !panel.querySelector) {
            return null;
        }
        var feed = panel.querySelector(".rte-ai-chat-feed");
        if (!feed || typeof feed.scrollTop === "undefined") {
            return null;
        }
        var maxScroll = Math.max(0, (feed.scrollHeight || 0) - (feed.clientHeight || 0));
        var scrollTop = Math.max(0, feed.scrollTop || 0);
        return {
            scrollTop: scrollTop,
            stickToBottom: maxScroll <= 0 || (maxScroll - scrollTop) <= 24
        };
    }

    function restoreChatFeedScroll(feed, scrollState) {
        if (!feed || !scrollState || typeof feed.scrollTop === "undefined") {
            return false;
        }
        if (scrollState.stickToBottom) {
            feed.scrollTop = feed.scrollHeight;
            return true;
        }
        var maxScroll = Math.max(0, (feed.scrollHeight || 0) - (feed.clientHeight || 0));
        feed.scrollTop = Math.max(0, Math.min(scrollState.scrollTop || 0, maxScroll));
        return true;
    }

    function isChatPanelOpen() {
        return !!(editor.__aiChatPanel && editor.__aiChatPanel.isConnected);
    }

    function openChatPanel(options) {
        options = options || {};
        closeReviewPanel();
        if (!isChatPanelOpen()) {
            rememberChatReturnFocus();
        }
        return renderChatPanel(!!options.focusComposer);
    }

    function toggleChatPanel(options) {
        if (editor.__aiChatPanel && editor.__aiChatPanel.isConnected) {
            closeChatPanel({ restoreFocus: true });
            return false;
        }
        return openChatPanel(options);
    }

    function runChatPrompt(promptText) {
        var state = getChatState();
        var cleanPrompt = normalizeText(promptText || state.draft);
        if (!cleanPrompt || state.busy) {
            return false;
        }

        var context = resolveChatScope();
        state.scope = context.scope;
        state.draft = "";
        state.busy = true;
        state.status = context.scope === "selection"
            ? "Thinking about the current selection..."
            : "Thinking about the current document...";
        var requestSessionVersion = state.sessionVersion || 0;
        state.messages.push({
            role: "user",
            text: cleanPrompt,
            scope: context.scope,
            snapshot: context.snapshot,
            timestamp: new Date().getTime()
        });
        persistChatState(state);
        renderChatPanel(false);

        resolveAction("chat-panel", {
            snapshot: context.snapshot,
            source: context.source,
            prompt: cleanPrompt,
            mode: "chat",
            scope: context.scope
        }).then(function (resolved) {
            if ((state.sessionVersion || 0) !== requestSessionVersion) {
                return;
            }
            state.busy = false;
            state.status = resolved && resolved.operations && resolved.operations.length
                ? "AI response ready. Preview or apply the suggested change from the chat."
                : "AI response ready.";
            state.messages.push({
                role: "assistant",
                text: resolved && (resolved.message || resolved.result) ? (resolved.message || resolved.result) : "No response returned.",
                scope: context.scope,
                resolved: resolved,
                snapshot: context.snapshot,
                timestamp: new Date().getTime()
            });
            persistChatState(state);
            if (isChatPanelOpen()) {
                renderChatPanel(false);
            }
        }).catch(function (error) {
            console.error("AI chat failed", error);
            if ((state.sessionVersion || 0) !== requestSessionVersion) {
                return;
            }
            state.busy = false;
            state.status = "AI chat failed.";
            state.messages.push({
                role: "assistant",
                text: "I could not finish that request. Try again or shorten the prompt.",
                scope: context.scope,
                isError: true,
                timestamp: new Date().getTime()
            });
            persistChatState(state);
            if (isChatPanelOpen()) {
                renderChatPanel(false);
            }
        });

        return true;
    }

    function applyChatMessage(message, mode) {
        if (!message || !message.resolved) {
            return false;
        }
        var snapshot = captureSelectionSnapshot();
        var resolved = message.resolved;
        var resultText = getPrimaryResolvedText(resolved);
        var applied = false;
        var selectionRequiredModes = {
            preview: true,
            selection: true
        };

        if (selectionRequiredModes[mode] && !snapshot.hasSelection) {
            getChatState().status = mode === "preview"
                ? "Select text before previewing this chat suggestion inline."
                : "Select text before replacing selection from chat.";
            renderChatPanel(false);
            return false;
        }

        if (mode === "plan" && resolved && resolved.operations && resolved.operations.length) {
            for (var operationIndex = 0; operationIndex < resolved.operations.length; operationIndex++) {
                var operation = resolved.operations[operationIndex];
                if (operation && (operation.type === "preview-suggestion" || operation.type === "replace-selection") && !snapshot.hasSelection) {
                    getChatState().status = "Select text before applying this selection-based chat suggestion.";
                    renderChatPanel(false);
                    return false;
                }
            }
        }

        if (mode === "plan") {
            applied = executeResolvedAction(resolved, { snapshot: snapshot });
        }
        else if (resultText) {
            if (mode === "preview") {
                var previewResolved = buildResolvedActionFromText(resultText, "selection-preview", resolved, resolved.request || null, resolved.action || null);
                if (previewResolved && previewResolved.operations && previewResolved.operations[0] && !previewResolved.operations[0].reason) {
                    previewResolved.operations[0].reason = getPrimaryResolvedReason(resolved);
                }
                applied = executeResolvedAction(previewResolved, { snapshot: snapshot });
            }
            else if (mode === "selection") {
                applied = executeResolvedAction(buildResolvedActionFromText(resultText, "selection", resolved, resolved.request || null, resolved.action || null), { snapshot: snapshot });
            }
            else if (mode === "insert") {
                applied = executeResolvedAction(buildResolvedActionFromText(resultText, "insert", resolved, resolved.request || null, resolved.action || null), { snapshot: snapshot });
            }
            else if (mode === "document") {
                applied = executeResolvedAction(buildResolvedActionFromText(resultText, "document", resolved, resolved.request || null, resolved.action || null), { snapshot: snapshot });
            }
        }

        if (applied) {
            getChatState().status = mode === "preview"
                ? "Previewed the AI suggestion inline from chat."
                : "Applied the AI chat suggestion.";
            renderChatPanel(false);
        }
        return applied;
    }

    function copyTextToClipboard(text) {
        var clean = normalizeText(text || "");
        if (!clean) {
            return Promise.resolve(false);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(clean).then(function () {
                return true;
            }).catch(function () {
                return fallbackCopyText(clean);
            });
        }

        return Promise.resolve(fallbackCopyText(clean));
    }

    function fallbackCopyText(text) {
        if (!document || !document.body || !document.createElement) {
            return false;
        }

        var previousActive = document.activeElement && document.activeElement !== document.body
            ? document.activeElement
            : null;
        var previousSelectionStart = null;
        var previousSelectionEnd = null;
        if (previousActive && typeof previousActive.selectionStart === "number" && typeof previousActive.selectionEnd === "number") {
            previousSelectionStart = previousActive.selectionStart;
            previousSelectionEnd = previousActive.selectionEnd;
        }

        var textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "readonly");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        var copied = false;
        try {
            copied = !!document.execCommand("copy");
        }
        catch (ignore) {
            copied = false;
        }

        document.body.removeChild(textarea);
        if (previousActive && previousActive.focus && previousActive.isConnected !== false) {
            try {
                previousActive.focus({ preventScroll: true });
            }
            catch (ignoreFocus) {
                try {
                    previousActive.focus();
                }
                catch (ignoreFocusFallback) {
                }
            }
            if (previousSelectionStart !== null
                && previousSelectionEnd !== null
                && previousActive.setSelectionRange) {
                try {
                    previousActive.setSelectionRange(previousSelectionStart, previousSelectionEnd);
                }
                catch (ignoreSelection) {
                }
            }
        }
        return copied;
    }

    function copyChatMessageText(message) {
        return copyTextToClipboard(message && message.text ? message.text : "").then(function (copied) {
            var state = getChatState();
            state.status = copied
                ? "Copied the AI response."
                : "Could not copy the AI response.";
            renderChatPanel(false);
            return copied;
        });
    }

    function getChatMessageRoleLabel(message) {
        if (message && message.isError) {
            return "Issue";
        }
        return message && message.role === "user" ? "You" : "AI";
    }

    function getChatMessageThreadRoleLabel(threadRole) {
        if (threadRole === "request") {
            return "Request";
        }
        if (threadRole === "response") {
            return "Response";
        }
        return "";
    }

    function getChatMessageScopeLabel(message) {
        return message && message.scope === "selection" ? "Selection" : "Document";
    }

    function getChatMessageTypeLabel(message) {
        if (!message) {
            return "";
        }
        if (message.isError) {
            return "Needs retry";
        }
        if (message.role === "user") {
            return "Prompt";
        }
        var resolved = message.resolved || null;
        var operations = resolved && resolved.operations ? resolved.operations : [];
        var resultText = resolved ? getPrimaryResolvedText(resolved) : "";
        if (operations.length) {
            return "Reviewable change";
        }
        if (resultText) {
            return "Draft";
        }
        return "Answer";
    }

    function buildChatMessageSupportingCopy(message) {
        if (!message) {
            return "";
        }
        var scopeLabel = getChatMessageScopeLabel(message).toLowerCase();
        if (message.isError) {
            return "This request hit an issue. Try again or adjust the prompt.";
        }
        if (message.role === "user") {
            return "Sent with " + scopeLabel + " context.";
        }
        var resolved = message.resolved || null;
        var operations = resolved && resolved.operations ? resolved.operations : [];
        var resultText = resolved ? getPrimaryResolvedText(resolved) : "";
        if (operations.length) {
            return "Ready for preview, apply, or insert from the " + scopeLabel + " context.";
        }
        if (resultText) {
            return "Drafted from the " + scopeLabel + " context.";
        }
        return "Response grounded in the " + scopeLabel + " context.";
    }

    function buildChatMessageContextCardData(message) {
        if (!message || message.isError || !message.snapshot) {
            return null;
        }
        var sourceText = message.scope === "selection"
            ? (message.snapshot.text || message.snapshot.wholeText || "")
            : (message.snapshot.wholeText || "");
        sourceText = normalizeText(sourceText || "");
        if (!sourceText) {
            return null;
        }
        var paragraphCount = getChatContextParagraphCount(sourceText);
        return {
            title: message.scope === "selection" ? "Using current selection" : "Using current document",
            scopeLabel: message.scope === "selection" ? "Selection context" : "Document context",
            wordLabel: getChatContextWordCount(sourceText) + " words",
            paragraphLabel: paragraphCount > 1 ? paragraphCount + " paragraphs" : "",
            copy: summarizeSuggestionText(sourceText, 180)
        };
    }

    function buildChatMessageContextCardAriaLabel(contextCardData) {
        if (!contextCardData) {
            return "";
        }
        var parts = [];
        if (contextCardData.title) {
            parts.push(contextCardData.title);
        }
        if (contextCardData.scopeLabel) {
            parts.push(contextCardData.scopeLabel);
        }
        if (contextCardData.wordLabel) {
            parts.push(contextCardData.wordLabel);
        }
        if (contextCardData.paragraphLabel) {
            parts.push(contextCardData.paragraphLabel);
        }
        if (contextCardData.copy) {
            parts.push(contextCardData.copy);
        }
        return parts.join(". ");
    }

    function getChatMessageStateTitle(message) {
        if (!message) {
            return "";
        }
        if (message.isError) {
            return "Reply needs retry";
        }
        if (message.role === "user") {
            return "Prompt sent";
        }
        var resolved = message.resolved || null;
        var operations = resolved && resolved.operations ? resolved.operations : [];
        var resultText = resolved ? getPrimaryResolvedText(resolved) : "";
        if (operations.length) {
            return "Reviewable change prepared";
        }
        if (resultText) {
            return "Draft prepared";
        }
        return "Answer ready";
    }

    function getChatMessageStateDetail(message) {
        if (!message) {
            return "";
        }
        var scopeLabel = getChatMessageScopeLabel(message).toLowerCase();
        if (message.isError) {
            return "This " + scopeLabel + " request hit an issue. Adjust the prompt or try again.";
        }
        if (message.role === "user") {
            return "Waiting on AI for the current " + scopeLabel + " context.";
        }
        var resolved = message.resolved || null;
        var operations = resolved && resolved.operations ? resolved.operations : [];
        var resultText = resolved ? getPrimaryResolvedText(resolved) : "";
        if (operations.length) {
            return "Preview, replace, or insert this " + scopeLabel + " change from the latest reply.";
        }
        if (resultText) {
            return "Reuse or adapt this drafted " + scopeLabel + " response.";
        }
        return "Read the answer grounded in the current " + scopeLabel + " context.";
    }

    function buildChatMessageActionState(message, currentSnapshot) {
        var resolved = message && message.resolved ? message.resolved : null;
        var operations = resolved && resolved.operations ? resolved.operations : [];
        var resultText = resolved ? getPrimaryResolvedText(resolved) : "";
        var hasSelection = currentSnapshot && typeof currentSnapshot.hasSelection === "boolean"
            ? !!currentSnapshot.hasSelection
            : !!(message && message.snapshot && message.snapshot.hasSelection);
        var selectionDependentPlan = false;
        for (var operationIndex = 0; operationIndex < operations.length; operationIndex++) {
            var operation = operations[operationIndex];
            if (operation && (operation.type === "preview-suggestion" || operation.type === "replace-selection")) {
                selectionDependentPlan = true;
                break;
            }
        }
        return {
            operations: operations,
            resultText: resultText,
            hasSelection: hasSelection,
            selectionDependentPlan: selectionDependentPlan,
            canApplyPlan: !!operations.length && (!selectionDependentPlan || hasSelection),
            canPreview: !!resultText && hasSelection,
            canReplaceSelection: !!resultText && hasSelection,
            canInsert: !!resultText,
            canReplaceDocument: !!resultText && !hasSelection
        };
    }

    function getChatMessageActionSummary(message, currentSnapshot) {
        if (!message || !message.resolved) {
            return null;
        }
        var actionState = buildChatMessageActionState(message, currentSnapshot);
        if (actionState.operations.length && actionState.canPreview) {
            return {
                title: "Best next step: Preview",
                detail: "Check the inline diff first, then replace the selection or apply the prepared plan if it looks right."
            };
        }
        if (actionState.operations.length && actionState.canApplyPlan) {
            return {
                title: "Best next step: Apply the prepared plan",
                detail: "Run the structured change directly or use the insert and document actions below if you want a different handoff."
            };
        }
        if (actionState.operations.length && actionState.canInsert) {
            return {
                title: "Best next step: Insert below",
                detail: "Select text to preview or replace this change inline, or insert the prepared draft below the current content."
            };
        }
        if (actionState.resultText && actionState.canReplaceSelection) {
            return {
                title: "Best next step: Replace or preview",
                detail: "Use the prepared draft to preview inline, replace the selection, or insert a follow-up below."
            };
        }
        if (actionState.resultText) {
            return {
                title: "Best next step: Reuse this draft",
                detail: "Insert the draft below or replace the full document, depending on how broad the change should be."
            };
        }
        return null;
    }

    function getChatRecommendedActionId(message, currentSnapshot) {
        if (!message || !message.resolved) {
            return "";
        }
        var actionState = buildChatMessageActionState(message, currentSnapshot);
        if (actionState.operations.length && actionState.canPreview) {
            return "preview";
        }
        if (actionState.operations.length && actionState.canApplyPlan) {
            return "apply";
        }
        if (actionState.operations.length && actionState.canInsert) {
            return "insert";
        }
        if (actionState.resultText && actionState.canReplaceSelection) {
            return "selection";
        }
        if (actionState.resultText && actionState.canInsert) {
            return "insert";
        }
        return "";
    }

    function getChatRecommendedActionLabel(actionId) {
        if (actionId === "preview") {
            // 2026-05-20 (v20260520h): "Preview inline" → "Preview". The
            // "inline" qualifier was always true (the diff IS always inline
            // in the editor), so the word carried no extra signal; chat
            // assistant message buttons now match the AI dialog primary
            // ("Preview") for vocabulary parity.
            return "Preview";
        }
        if (actionId === "apply") {
            return "Apply";
        }
        if (actionId === "selection") {
            return "Replace selection";
        }
        if (actionId === "insert") {
            return "Insert below";
        }
        if (actionId === "document") {
            return "Replace document";
        }
        return "";
    }

    function getChatActionButtonDisplayLabel(actionId) {
        if (actionId === "copy") {
            return "Copy text";
        }
        return getChatRecommendedActionLabel(actionId);
    }

    function getChatActionButtonDetail(actionId, message, currentSnapshot) {
        var actionState = buildChatMessageActionState(message, currentSnapshot);
        if (actionId === "copy") {
            return "Copy this prepared AI reply without changing the document.";
        }
        if (actionId === "apply") {
            return "Run the prepared plan directly in the editor.";
        }
        if (actionId === "preview") {
            return actionState.hasSelection
                ? "Show this change inline in the editor before deciding it."
                : "Select text to preview this change inline in the editor.";
        }
        if (actionId === "selection") {
            return actionState.hasSelection
                ? "Replace the current selection with this prepared draft."
                : "Select text before replacing selection with this prepared draft.";
        }
        if (actionId === "insert") {
            return actionState.hasSelection
                ? "Insert this prepared draft below the current selection."
                : "Insert this prepared draft below the current content.";
        }
        if (actionId === "document") {
            return "Replace the full document with this prepared draft.";
        }
        return "";
    }

    function syncChatActionButtonAccessibility(button, actionId, message, recommendedActionId, currentSnapshot) {
        if (!button) {
            return;
        }
        var label = getChatActionButtonDisplayLabel(actionId)
            || (button.innerText || button.textContent || "").replace(/\s+/g, " ").trim()
            || "Action";
        var detail = getChatActionButtonDetail(actionId, message, currentSnapshot);
        var isRecommended = !!(actionId && recommendedActionId && actionId === recommendedActionId);
        var parts = [label];
        if (detail) {
            parts.push(detail);
        }
        if (isRecommended) {
            parts.push("Recommended next step.");
        }
        button.setAttribute("aria-label", parts.join(". "));
        button.title = detail
            ? label + " - " + detail + (isRecommended ? " Recommended next step." : "")
            : label + (isRecommended ? " - Recommended next step." : "");
    }

    function getChatRecommendedGroupKey(recommendedActionId) {
        if (recommendedActionId === "apply" || recommendedActionId === "preview" || recommendedActionId === "selection") {
            return "primary";
        }
        if (recommendedActionId === "insert" || recommendedActionId === "document") {
            return "secondary";
        }
        return "";
    }

    function getChatActionGroupDetail(groupKey, message, recommendedActionId, currentSnapshot) {
        if (groupKey === "utility") {
            return "Copy this prepared reply without changing the document.";
        }
        if (!message || !message.resolved) {
            return "";
        }
        var actionState = buildChatMessageActionState(message, currentSnapshot);
        if (groupKey === "primary") {
            if (recommendedActionId === "preview") {
                return "Check the inline diff first, then apply or replace the selection from this group.";
            }
            if (recommendedActionId === "apply") {
                return "Run the prepared plan directly, or switch to the document handoff actions below if you want a different outcome.";
            }
            if (recommendedActionId === "selection") {
                return "Replace the selection first, or preview the inline diff before writing this change back.";
            }
            if (actionState.operations.length) {
                return "Run the prepared plan directly from this group.";
            }
            if (actionState.resultText && actionState.hasSelection) {
                return "Preview the draft or write it back into the current selection from this group.";
            }
            return "Use this group to preview or apply the prepared change.";
        }
        if (groupKey === "secondary") {
            if (actionState.resultText && actionState.hasSelection) {
                return "Insert this prepared draft below the selection when you want a follow-up instead of a replacement.";
            }
            if (recommendedActionId === "insert") {
                return "Insert this draft below first, or replace the full document if the whole page should change.";
            }
            if (recommendedActionId === "document") {
                return "Replace the full document, or insert this draft below if you want a lighter handoff.";
            }
            if (actionState.resultText) {
                return "Insert this prepared draft below or replace the full document without opening inline review.";
            }
        }
        return "";
    }

    function getChatActionGroupTitle(groupKey, message, recommendedActionId) {
        var recommendedGroupKey = getChatRecommendedGroupKey(recommendedActionId);
        if (recommendedGroupKey && groupKey === recommendedGroupKey) {
            return "Recommended next step";
        }
        if (groupKey === "utility") {
            return "Copy only";
        }
        if (!message || !message.resolved) {
            if (groupKey === "primary") {
                return "Preview and apply";
            }
            if (groupKey === "secondary") {
                return "Other ways to use";
            }
            return "";
        }
        var resolved = message.resolved || null;
        var operations = resolved && resolved.operations ? resolved.operations : [];
        var resultText = resolved ? getPrimaryResolvedText(resolved) : "";
        if (groupKey === "primary") {
            if (operations.length) {
                return "Apply in editor";
            }
            if (resultText) {
                return "Use this draft";
            }
            return "Preview and apply";
        }
        if (groupKey === "secondary") {
            if (operations.length) {
                return "Other ways to apply";
            }
            if (resultText) {
                return "Other ways to use this draft";
            }
        }
        return "";
    }

    function getChatActionGroupInfo(groupKey, recommendedActionId, message, currentSnapshot) {
        var info = {
            title: "",
            badge: "",
            recommended: false,
            detail: ""
        };
        info.title = getChatActionGroupTitle(groupKey, message, recommendedActionId);
        var recommendedGroupKey = getChatRecommendedGroupKey(recommendedActionId);
        if (recommendedGroupKey && groupKey === recommendedGroupKey) {
            info.badge = getChatRecommendedActionLabel(recommendedActionId);
            info.recommended = !!info.badge;
        }
        info.detail = getChatActionGroupDetail(groupKey, message, recommendedActionId, currentSnapshot);
        return info;
    }

    function appendChatActionGroupHeader(group, groupInfo, groupKey) {
        if (!group || !groupInfo) {
            return null;
        }
        if (!group.getElementsByTagName("button").length) {
            return null;
        }
        group.setAttribute("data-rte-ai-chat-group-key", groupKey || "");
        if (groupInfo.recommended) {
            group.setAttribute("data-rte-ai-chat-group-recommended", "true");
        }
        var headerClass = "rte-ai-chat-message-action-group-header";
        if (groupInfo.recommended) {
            headerClass += " is-recommended";
        }
        var header = append(group, "div", "", headerClass);
        append(header, "div", "", "rte-ai-chat-message-action-group-title", groupInfo.title || "");
        if (groupInfo.badge) {
            append(header, "span", "", "rte-ai-chat-message-action-group-badge", groupInfo.badge);
        }
        if (group.firstChild !== header) {
            group.insertBefore(header, group.firstChild);
        }
        if (groupInfo.detail) {
            var detailNode = append(group, "div", "", "rte-ai-chat-message-action-group-detail", groupInfo.detail);
            if (header.nextSibling !== detailNode) {
                group.insertBefore(detailNode, header.nextSibling);
            }
        }
        return header;
    }

    function orderChatActionGroups(actionsNode, recommendedActionId) {
        if (!actionsNode || !actionsNode.querySelectorAll) {
            return;
        }
        var recommendedGroupKey = getChatRecommendedGroupKey(recommendedActionId);
        var groups = actionsNode.querySelectorAll(".rte-ai-chat-message-action-group");
        if (!groups || !groups.length) {
            return;
        }
        var byKey = {};
        for (var groupIndex = 0; groupIndex < groups.length; groupIndex++) {
            var groupNode = groups[groupIndex];
            var groupKey = groupNode.getAttribute("data-rte-ai-chat-group-key") || "";
            if (groupKey) {
                byKey[groupKey] = groupNode;
            }
        }
        var order = [];
        if (recommendedGroupKey) {
            order.push(recommendedGroupKey);
        }
        var defaultOrder = ["primary", "secondary", "utility"];
        for (var orderIndex = 0; orderIndex < defaultOrder.length; orderIndex++) {
            if (order.indexOf(defaultOrder[orderIndex]) === -1) {
                order.push(defaultOrder[orderIndex]);
            }
        }
        for (var appendIndex = 0; appendIndex < order.length; appendIndex++) {
            if (byKey[order[appendIndex]]) {
                actionsNode.appendChild(byKey[order[appendIndex]]);
            }
        }
    }

    function orderChatRecommendedActionButton(actionsNode, recommendedActionId) {
        if (!actionsNode || !recommendedActionId || !actionsNode.querySelector) {
            return;
        }
        var recommendedGroupKey = getChatRecommendedGroupKey(recommendedActionId);
        if (!recommendedGroupKey) {
            return;
        }
        var recommendedGroup = actionsNode.querySelector('.rte-ai-chat-message-action-group[data-rte-ai-chat-group-key="' + recommendedGroupKey + '"]');
        if (!recommendedGroup || !recommendedGroup.querySelector) {
            return;
        }
        var recommendedButton = recommendedGroup.querySelector('.rte-ai-chat-action-button[data-rte-ai-chat-action="' + recommendedActionId + '"]');
        if (!recommendedButton) {
            return;
        }
        var groupHeader = recommendedGroup.querySelector(".rte-ai-chat-message-action-group-header");
        var firstButton = recommendedGroup.querySelector(".rte-ai-chat-action-button");
        if (!firstButton || firstButton === recommendedButton) {
            return;
        }
        if (groupHeader && groupHeader.nextSibling) {
            recommendedGroup.insertBefore(recommendedButton, groupHeader.nextSibling);
            return;
        }
        recommendedGroup.insertBefore(recommendedButton, firstButton);
    }

    function buildChatActionGroupAriaLabel(groupNode, groupInfo) {
        if (!groupNode) {
            return "";
        }
        var parts = [];
        if (groupInfo && groupInfo.title) {
            parts.push(groupInfo.title + " group");
        }
        if (groupInfo && groupInfo.recommended && groupInfo.badge) {
            parts.push(groupInfo.badge + " recommended");
        }
        if (groupInfo && groupInfo.detail) {
            parts.push(groupInfo.detail);
        }
        var actionButtons = groupNode.querySelectorAll ? groupNode.querySelectorAll(".rte-ai-chat-action-button") : [];
        var actionLabels = [];
        for (var actionIndex = 0; actionIndex < actionButtons.length; actionIndex++) {
            var buttonLabel = (actionButtons[actionIndex].innerText || actionButtons[actionIndex].textContent || "").replace(/\s+/g, " ").trim();
            if (buttonLabel) {
                actionLabels.push(buttonLabel);
            }
        }
        if (actionLabels.length) {
            parts.push("Actions: " + actionLabels.join(", "));
        }
        return parts.join(". ");
    }

    function syncChatActionAccessibility(actionsNode, recommendedActionId, message, currentSnapshot) {
        if (!actionsNode || !actionsNode.querySelectorAll) {
            return;
        }
        var recommendedLabel = getChatRecommendedActionLabel(recommendedActionId);
        actionsNode.setAttribute("role", "group");
        actionsNode.setAttribute("aria-label", recommendedLabel
            ? "AI chat actions. Recommended next step: " + recommendedLabel + "."
            : "AI chat actions");
        var groupNodes = actionsNode.querySelectorAll(".rte-ai-chat-message-action-group");
        for (var groupIndex = 0; groupIndex < groupNodes.length; groupIndex++) {
            var groupNode = groupNodes[groupIndex];
            var groupKey = groupNode.getAttribute("data-rte-ai-chat-group-key") || "";
            var firstButton = groupNode.querySelector ? groupNode.querySelector(".rte-ai-chat-action-button") : null;
            var groupInfo = getChatActionGroupInfo(groupKey, recommendedActionId, message, currentSnapshot);
            if (!firstButton) {
                groupNode.removeAttribute("role");
                groupNode.removeAttribute("aria-label");
                continue;
            }
            groupNode.setAttribute("role", "group");
            var groupAriaLabel = buildChatActionGroupAriaLabel(groupNode, groupInfo);
            if (groupAriaLabel) {
                groupNode.setAttribute("aria-label", groupAriaLabel);
            }
            else {
                groupNode.removeAttribute("aria-label");
            }
        }
    }

    function getChatMessageSourceText(message) {
        if (!message || !message.snapshot) {
            return "";
        }
        return message.scope === "selection"
            ? (message.snapshot.text || message.snapshot.wholeText || "")
            : (message.snapshot.wholeText || "");
    }

    function getChatMessageSourcePreviewText(message) {
        return summarizeSuggestionText(getChatMessageSourceText(message), 120);
    }

    function buildChatResolvedPreviewGlanceData(message) {
        if (!message || !message.resolved) {
            return null;
        }
        var suggestionType = message.resolved.request && message.resolved.request.mode
            ? getSuggestionTypeValue(message.resolved.request.mode)
            : "";
        return buildInlinePreviewCompareGlanceData({
            originalText: getChatMessageSourceText(message),
            resultText: getPrimaryResolvedText(message.resolved),
            suggestionType: suggestionType,
            snapshot: message.snapshot || null,
            scope: message.scope || ""
        });
    }

    function buildChatResolvedPreviewData(message, currentSnapshot) {
        if (!message || !message.resolved) {
            return null;
        }
        var resultText = summarizeSuggestionText(getPrimaryResolvedText(message.resolved), 120);
        if (!resultText) {
            return null;
        }
        var sourceText = getChatMessageSourcePreviewText(message);
        var operations = message.resolved.operations || [];
        var operationMeta = operations.length ? getOperationDisplayMeta(operations[0]) : null;
        var operationCount = operations.length;
        var targetLabel = operationMeta && operationMeta.title ? operationMeta.title : (message.scope === "selection" ? "Selection draft" : "Document draft");
        var recommendedActionId = getChatRecommendedActionId(message, currentSnapshot);
        var actionSummary = getChatMessageActionSummary(message, currentSnapshot);
        var previewPlanItems = buildChatPreviewPlanItems(message, recommendedActionId, currentSnapshot);
        var changeGlance = buildChatResolvedPreviewGlanceData(message);
        return {
            title: operationMeta && operationMeta.title ? operationMeta.title : "Prepared draft",
            sourceText: sourceText,
            resultText: resultText,
            reasonText: summarizeSuggestionText(getPrimaryResolvedReason(message.resolved), 110),
            statusLabel: operationCount ? "Ready to review" : "Draft ready",
            scopeLabel: message.scope === "selection" ? "Selection draft" : "Document draft",
            stepLabel: (operationCount || 1) + " step" + ((operationCount || 1) === 1 ? "" : "s"),
            targetLabel: targetLabel,
            diffParts: sourceText && sourceText !== resultText ? buildCompletionPreviewDiffParts(sourceText, resultText) : null,
            changeGlance: changeGlance,
            planLeadTitle: actionSummary ? "Best next step" : "",
            planLeadLabel: recommendedActionId ? getChatRecommendedActionLabel(recommendedActionId) : "",
            planLeadDetail: actionSummary ? actionSummary.detail : "",
            planItems: previewPlanItems.slice(0, 3),
            planFollowupTitle: buildChatPreviewPlanFollowupTitle(message, previewPlanItems),
            hiddenPlanCount: Math.max(0, previewPlanItems.length - 3)
        };
    }

    function buildChatPreviewPlanFollowupTitle(message, previewPlanItems) {
        if (!previewPlanItems || !previewPlanItems.length) {
            return "";
        }
        var resolved = message && message.resolved ? message.resolved : null;
        var operations = resolved && resolved.operations ? resolved.operations : [];
        if (operations.length) {
            return "Other ways to apply this change";
        }
        return "Other ways to use this draft";
    }

    function buildChatPreviewPlanItemData(message, actionId, currentSnapshot) {
        if (!actionId) {
            return null;
        }
        var label = getChatRecommendedActionLabel(actionId);
        if (!label) {
            return null;
        }
        return {
            label: label,
            detail: getChatActionButtonDetail(actionId, message, currentSnapshot)
        };
    }

    function buildChatPreviewPlanItemAriaLabel(planItem) {
        if (!planItem) {
            return "";
        }
        var parts = [];
        if (planItem.label) {
            parts.push(planItem.label);
        }
        if (planItem.detail) {
            parts.push(planItem.detail);
        }
        return parts.join(". ");
    }

    function buildChatPreviewPlanItems(message, recommendedActionId, currentSnapshot) {
        if (!message || !message.resolved) {
            return [];
        }
        var actionState = buildChatMessageActionState(message, currentSnapshot);
        var actionIds = [];
        if (actionState.canApplyPlan) {
            actionIds.push("apply");
        }
        if (actionState.canPreview) {
            actionIds.push("preview");
        }
        if (actionState.canReplaceSelection) {
            actionIds.push("selection");
        }
        if (actionState.canInsert) {
            actionIds.push("insert");
        }
        if (actionState.canReplaceDocument) {
            actionIds.push("document");
        }
        var items = [];
        for (var actionIndex = 0; actionIndex < actionIds.length; actionIndex++) {
            var actionId = actionIds[actionIndex];
            if (!actionId || actionId === recommendedActionId) {
                continue;
            }
            var itemData = buildChatPreviewPlanItemData(message, actionId, currentSnapshot);
            if (!itemData || !itemData.label) {
                continue;
            }
            var exists = false;
            for (var itemIndex = 0; itemIndex < items.length; itemIndex++) {
                if (items[itemIndex] && items[itemIndex].label === itemData.label) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                items.push(itemData);
            }
        }
        return items;
    }

    function buildChatResolvedPreviewAriaLabel(resolvedPreview) {
        if (!resolvedPreview) {
            return "";
        }
        var parts = [];
        if (resolvedPreview.title) {
            parts.push(resolvedPreview.title);
        }
        if (resolvedPreview.statusLabel) {
            parts.push(resolvedPreview.statusLabel);
        }
        if (resolvedPreview.scopeLabel) {
            parts.push(resolvedPreview.scopeLabel);
        }
        if (resolvedPreview.stepLabel) {
            parts.push(resolvedPreview.stepLabel);
        }
        if (resolvedPreview.targetLabel) {
            parts.push(resolvedPreview.targetLabel);
        }
        parts.push("Proposed edit");
        parts.push("Current and suggested text");
        if (resolvedPreview.sourceText && resolvedPreview.sourceText !== resolvedPreview.resultText) {
            parts.push("Current");
            parts.push(resolvedPreview.sourceText);
        }
        parts.push("Suggested");
        parts.push(resolvedPreview.resultText);
        if (resolvedPreview.reasonText) {
            parts.push("Why this change");
            parts.push(resolvedPreview.reasonText);
        }
        if (resolvedPreview.changeGlance) {
            if (resolvedPreview.changeGlance.title) {
                parts.push(resolvedPreview.changeGlance.title);
            }
            if (resolvedPreview.changeGlance.pills && resolvedPreview.changeGlance.pills.length) {
                for (var glancePillIndex = 0; glancePillIndex < resolvedPreview.changeGlance.pills.length; glancePillIndex++) {
                    if (resolvedPreview.changeGlance.pills[glancePillIndex] && resolvedPreview.changeGlance.pills[glancePillIndex].text) {
                        parts.push(resolvedPreview.changeGlance.pills[glancePillIndex].text);
                    }
                }
            }
            if (resolvedPreview.changeGlance.detail) {
                parts.push(resolvedPreview.changeGlance.detail);
            }
        }
        if (resolvedPreview.planLeadTitle || resolvedPreview.planLeadLabel || resolvedPreview.planLeadDetail || (resolvedPreview.planItems && resolvedPreview.planItems.length)) {
            parts.push("What happens next");
            if (resolvedPreview.planLeadTitle) {
                parts.push(resolvedPreview.planLeadTitle);
            }
            if (resolvedPreview.planLeadLabel) {
                parts.push(resolvedPreview.planLeadLabel);
            }
            if (resolvedPreview.planLeadDetail) {
                parts.push(resolvedPreview.planLeadDetail);
            }
            if (resolvedPreview.planFollowupTitle) {
                parts.push(resolvedPreview.planFollowupTitle);
            }
            if (resolvedPreview.planItems && resolvedPreview.planItems.length) {
                for (var planIndex = 0; planIndex < resolvedPreview.planItems.length; planIndex++) {
                    var planItem = resolvedPreview.planItems[planIndex];
                    if (!planItem) {
                        continue;
                    }
                    if (planItem.label) {
                        parts.push(planItem.label);
                    }
                    if (planItem.detail) {
                        parts.push(planItem.detail);
                    }
                }
            }
            if (resolvedPreview.hiddenPlanCount) {
                parts.push("+" + resolvedPreview.hiddenPlanCount + " more");
            }
        }
        return parts.join(". ");
    }

    function summarizeChatPromptCopy(text) {
        var clean = normalizeText(text || "");
        if (!clean) {
            return "";
        }
        if (clean.length <= 92) {
            return clean;
        }
        return clean.substring(0, 89).replace(/\s+\S*$/, "") + "...";
    }

    function getChatPromptIntentLabel(prompt) {
        var promptId = prompt && prompt.id ? String(prompt.id).toLowerCase() : "";
        var promptLabel = prompt && prompt.label ? String(prompt.label).toLowerCase() : "";
        var promptText = prompt && prompt.prompt ? String(prompt.prompt).toLowerCase() : "";
        var combined = promptId + " " + promptLabel + " " + promptText;
        if (/translate|spanish|french|german|italian|portuguese|japanese/.test(combined)) {
            return "Language";
        }
        if (/proofread|review|cleaner|grammar/.test(combined)) {
            return "Review";
        }
        if (/heading|title|subheading|structure/.test(combined)) {
            return "Structure";
        }
        if (/expand|supporting paragraph|detail/.test(combined)) {
            return "Expand";
        }
        if (/summarize|summary/.test(combined)) {
            return "Summary";
        }
        return "Starter";
    }

    function getChatPromptToneClass(prompt) {
        var intentLabel = getChatPromptIntentLabel(prompt).toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return intentLabel || "starter";
    }

    function getChatMessageIntentLabel(message) {
        if (!message || !message.text) {
            return "Custom";
        }
        var intentLabel = getChatPromptIntentLabel({ prompt: message.text || "" });
        return intentLabel === "Starter" ? "Custom" : intentLabel;
    }

    function getChatUserPromptBadgeLabel(message) {
        return getChatMessageIntentLabel(message) + " request";
    }

    function getPreviousChatUserMessage(messages, messageIndex) {
        if (!messages || !messages.length || typeof messageIndex !== "number") {
            return null;
        }
        for (var index = messageIndex - 1; index >= 0; index--) {
            if (messages[index] && messages[index].role === "user" && !messages[index].isError) {
                return messages[index];
            }
        }
        return null;
    }

    function buildChatAssistantRequestCardData(messages, messageIndex) {
        var requestMessage = getPreviousChatUserMessage(messages, messageIndex);
        if (!requestMessage) {
            return null;
        }
        return {
            title: "Responding to " + getChatUserPromptBadgeLabel(requestMessage),
            scopeLabel: getChatMessageScopeLabel(requestMessage),
            detail: "Latest user turn",
            promptText: requestMessage.text || ""
        };
    }

    function buildChatUserPromptCardAriaLabel(message, messages, messageIndex) {
        if (!message || message.isError || message.role !== "user") {
            return "";
        }
        var parts = ["What you asked"];
        var promptBadge = getChatUserPromptBadgeLabel(message);
        if (promptBadge) {
            parts.push(promptBadge);
        }
        var scopeLabel = getChatMessageScopeLabel(message);
        if (scopeLabel) {
            parts.push(scopeLabel);
        }
        var promptExchangeLabel = getChatMessageExchangeLabel(messages, messageIndex);
        if (promptExchangeLabel) {
            parts.push(promptExchangeLabel);
        }
        if (message.text) {
            parts.push(message.text);
        }
        return parts.join(". ");
    }

    function buildChatAssistantRequestCardAriaLabel(requestCardData, exchangeLabel) {
        if (!requestCardData) {
            return "";
        }
        var parts = [];
        if (requestCardData.title) {
            parts.push(requestCardData.title);
        }
        if (requestCardData.scopeLabel) {
            parts.push(requestCardData.scopeLabel);
        }
        if (requestCardData.detail) {
            parts.push(requestCardData.detail);
        }
        if (exchangeLabel) {
            parts.push(exchangeLabel);
        }
        if (requestCardData.promptText) {
            parts.push(requestCardData.promptText);
        }
        return parts.join(". ");
    }

    function buildChatMessageAriaLabel(messages, messageIndex, currentSnapshot) {
        if (!messages || typeof messageIndex !== "number" || !messages[messageIndex]) {
            return "";
        }
        var message = messages[messageIndex];
        var parts = [];
        var roleLabel = getChatMessageRoleLabel(message);
        var threadRoleLabel = getChatMessageThreadRoleLabel(getChatMessageThreadRole(messages, messageIndex));
        var scopeLabel = getChatMessageScopeLabel(message);
        var typeLabel = getChatMessageTypeLabel(message);
        var exchangeLabel = getChatMessageExchangeLabel(messages, messageIndex);
        var stateTitle = getChatMessageStateTitle(message);
        var stateDetail = getChatMessageStateDetail(message);
        if (roleLabel) {
            parts.push(roleLabel);
        }
        parts.push("Turn " + (messageIndex + 1));
        if (threadRoleLabel) {
            parts.push(threadRoleLabel);
        }
        if (scopeLabel) {
            parts.push(scopeLabel);
        }
        if (typeLabel) {
            parts.push(typeLabel);
        }
        if (exchangeLabel) {
            parts.push(exchangeLabel);
        }
        if (isCurrentChatExchange(messages, messageIndex)) {
            parts.push("Current exchange");
        }
        if (stateTitle) {
            parts.push(stateTitle);
        }
        if (stateDetail) {
            parts.push(stateDetail);
        }
        if (message.role === "user" && !message.isError) {
            parts.push("What you asked");
            if (message.text) {
                parts.push(summarizeChatPromptCopy(message.text) || message.text);
            }
            var contextCardData = buildChatMessageContextCardData(message);
            if (contextCardData) {
                if (contextCardData.title) {
                    parts.push(contextCardData.title);
                }
                if (contextCardData.wordLabel) {
                    parts.push(contextCardData.wordLabel);
                }
                if (contextCardData.paragraphLabel) {
                    parts.push(contextCardData.paragraphLabel);
                }
            }
        }
        else if (message.role === "assistant" && !message.isError) {
            var requestCardData = buildChatAssistantRequestCardData(messages, messageIndex);
            if (requestCardData && requestCardData.title) {
                parts.push(requestCardData.title);
            }
            if (requestCardData && requestCardData.promptText) {
                parts.push(summarizeChatPromptCopy(requestCardData.promptText) || requestCardData.promptText);
            }
            var actionSummary = getChatMessageActionSummary(message, currentSnapshot);
            if (actionSummary && actionSummary.title) {
                parts.push(actionSummary.title);
            }
        }
        return parts.join(". ");
    }

    function buildChatMessageStateCardAriaLabel(message) {
        if (!message) {
            return "";
        }
        var parts = [];
        var kicker = message.isError ? "Conversation issue" : (message.role === "user" ? "User prompt" : "Assistant response");
        var stateTitle = getChatMessageStateTitle(message);
        var stateDetail = getChatMessageStateDetail(message);
        if (kicker) {
            parts.push(kicker);
        }
        if (stateTitle) {
            parts.push(stateTitle);
        }
        if (stateDetail) {
            parts.push(stateDetail);
        }
        return parts.join(". ");
    }

    function getChatMessageThreadRole(messages, messageIndex) {
        if (!messages || typeof messageIndex !== "number" || !messages[messageIndex]) {
            return "";
        }
        var message = messages[messageIndex];
        if (message.isError) {
            return "";
        }
        if (message.role === "user") {
            var nextMessage = messages[messageIndex + 1];
            if (nextMessage && nextMessage.role === "assistant" && !nextMessage.isError) {
                return "request";
            }
        }
        if (message.role === "assistant") {
            var previousMessage = messages[messageIndex - 1];
            if (previousMessage && previousMessage.role === "user" && !previousMessage.isError) {
                return "response";
            }
        }
        return "";
    }

    function getChatMessageExchangeIndex(messages, messageIndex) {
        if (!messages || typeof messageIndex !== "number" || messageIndex < 0) {
            return 0;
        }
        var exchangeIndex = 0;
        for (var index = 0; index <= messageIndex; index++) {
            if (messages[index] && messages[index].role === "user" && !messages[index].isError) {
                exchangeIndex++;
            }
        }
        return exchangeIndex;
    }

    function getChatMessageExchangeLabel(messages, messageIndex) {
        var exchangeIndex = getChatMessageExchangeIndex(messages, messageIndex);
        return exchangeIndex ? ("Exchange " + exchangeIndex) : "";
    }

    function isCurrentChatExchange(messages, messageIndex) {
        var exchangeIndex = getChatMessageExchangeIndex(messages, messageIndex);
        var latestExchangeIndex = getChatExchangeCount(messages);
        return !!exchangeIndex && exchangeIndex === latestExchangeIndex;
    }

    function getChatExchangeResponseMessageIndex(messages, requestIndex) {
        if (!messages || !messages.length || typeof requestIndex !== "number" || !messages[requestIndex]) {
            return -1;
        }
        var requestMessage = messages[requestIndex];
        if (requestMessage.isError || requestMessage.role !== "user" || getChatMessageThreadRole(messages, requestIndex) !== "request") {
            return -1;
        }
        var exchangeIndex = getChatMessageExchangeIndex(messages, requestIndex);
        for (var index = requestIndex + 1; index < messages.length; index++) {
            if (!messages[index] || messages[index].isError) {
                continue;
            }
            if (messages[index].role === "user") {
                break;
            }
            if (
                messages[index].role === "assistant"
                && getChatMessageThreadRole(messages, index) === "response"
                && getChatMessageExchangeIndex(messages, index) === exchangeIndex
            ) {
                return index;
            }
        }
        return -1;
    }

    function buildChatExchangeBannerData(messages, messageIndex, currentSnapshot) {
        if (!messages || typeof messageIndex !== "number" || !messages[messageIndex]) {
            return null;
        }
        var message = messages[messageIndex];
        if (message.isError || message.role !== "user" || getChatMessageThreadRole(messages, messageIndex) !== "request") {
            return null;
        }
        var responseIndex = getChatExchangeResponseMessageIndex(messages, messageIndex);
        var nextMessage = responseIndex >= 0 ? messages[responseIndex] : null;
        var intentLabel = getChatMessageIntentLabel(message);
        var actionLabel = "";
        var changeGlance = null;
        var detailParts = [];
        if (nextMessage && nextMessage.role === "assistant" && !nextMessage.isError) {
            var recommendedActionId = getChatRecommendedActionId(nextMessage, currentSnapshot);
            actionLabel = getChatRecommendedActionLabel(recommendedActionId);
            changeGlance = buildChatResolvedPreviewGlanceData(nextMessage);
            if (actionLabel) {
                detailParts.push(actionLabel + " is the recommended next step.");
            }
            if (changeGlance && changeGlance.detail) {
                detailParts.push(changeGlance.detail);
            }
        }
        return {
            title: (intentLabel === "Custom" ? "Custom" : intentLabel) + " exchange",
            exchangeLabel: getChatMessageExchangeLabel(messages, messageIndex),
            scopeLabel: getChatMessageScopeLabel(message),
            statusLabel: nextMessage && nextMessage.role === "assistant" && !nextMessage.isError ? "Reply linked" : "Waiting on reply",
            actionLabel: actionLabel,
            changeGlance: changeGlance,
            detail: detailParts.join(" "),
            isCurrent: isCurrentChatExchange(messages, messageIndex)
        };
    }

    function buildChatExchangeBannerAriaLabel(bannerData) {
        if (!bannerData) {
            return "";
        }
        var parts = [];
        if (bannerData.title) {
            parts.push(bannerData.title);
        }
        if (bannerData.exchangeLabel) {
            parts.push(bannerData.exchangeLabel);
        }
        if (bannerData.scopeLabel) {
            parts.push(bannerData.scopeLabel);
        }
        if (bannerData.statusLabel) {
            parts.push(bannerData.statusLabel);
        }
        if (bannerData.actionLabel) {
            parts.push("Best next step");
            parts.push(bannerData.actionLabel);
        }
        if (bannerData.changeGlance) {
            parts.push(bannerData.changeGlance.title || "Change at a glance");
            if (bannerData.changeGlance.pills && bannerData.changeGlance.pills.length) {
                for (var glanceIndex = 0; glanceIndex < bannerData.changeGlance.pills.length; glanceIndex++) {
                    if (bannerData.changeGlance.pills[glanceIndex] && bannerData.changeGlance.pills[glanceIndex].text) {
                        parts.push(bannerData.changeGlance.pills[glanceIndex].text);
                    }
                }
            }
            if (bannerData.changeGlance.detail) {
                parts.push(bannerData.changeGlance.detail);
            }
        }
        if (bannerData.isCurrent) {
            parts.push("Current exchange");
        }
        if (bannerData.detail) {
            parts.push(bannerData.detail);
        }
        return parts.join(". ");
    }

    function buildChatExchangeGroupAriaLabel(messages, requestIndex, currentSnapshot) {
        if (!messages || typeof requestIndex !== "number" || !messages[requestIndex]) {
            return "";
        }
        var requestMessage = messages[requestIndex];
        if (requestMessage.isError || requestMessage.role !== "user" || getChatMessageThreadRole(messages, requestIndex) !== "request") {
            return "";
        }
        var bannerData = buildChatExchangeBannerData(messages, requestIndex, currentSnapshot);
        var responseIndex = getChatExchangeResponseMessageIndex(messages, requestIndex);
        var outcomeData = responseIndex >= 0 ? buildChatExchangeOutcomeData(messages, responseIndex, currentSnapshot) : null;
        var parts = ["AI chat exchange"];
        if (bannerData && bannerData.exchangeLabel) {
            parts.push(bannerData.exchangeLabel);
        }
        if (bannerData && bannerData.title) {
            parts.push(bannerData.title);
        }
        if (bannerData && bannerData.scopeLabel) {
            parts.push(bannerData.scopeLabel + " thread");
        }
        if (requestMessage.text) {
            parts.push("Request");
            parts.push(summarizeChatPromptCopy(requestMessage.text));
        }
        if (outcomeData) {
            if (outcomeData.statusLabel) {
                parts.push(outcomeData.statusLabel);
            }
            if (outcomeData.actionLabel) {
                parts.push("Best next step");
                parts.push(outcomeData.actionLabel);
            }
            if (outcomeData.changeGlance) {
                parts.push(outcomeData.changeGlance.title || "Change at a glance");
                if (outcomeData.changeGlance.pills && outcomeData.changeGlance.pills.length) {
                    for (var glanceIndex = 0; glanceIndex < outcomeData.changeGlance.pills.length; glanceIndex++) {
                        if (outcomeData.changeGlance.pills[glanceIndex] && outcomeData.changeGlance.pills[glanceIndex].text) {
                            parts.push(outcomeData.changeGlance.pills[glanceIndex].text);
                        }
                    }
                }
                if (outcomeData.changeGlance.detail) {
                    parts.push(outcomeData.changeGlance.detail);
                }
            }
        }
        else if (bannerData && bannerData.statusLabel) {
            parts.push(bannerData.statusLabel);
        }
        if (bannerData && bannerData.isCurrent) {
            parts.push("Current exchange");
        }
        return parts.join(". ");
    }

    function buildChatExchangeOutcomeData(messages, messageIndex, currentSnapshot) {
        if (!messages || typeof messageIndex !== "number" || !messages[messageIndex]) {
            return null;
        }
        var message = messages[messageIndex];
        if (message.isError || message.role !== "assistant" || getChatMessageThreadRole(messages, messageIndex) !== "response") {
            return null;
        }
        var resolved = message.resolved || null;
        var operations = resolved && resolved.operations ? resolved.operations : [];
        var resultText = resolved ? getPrimaryResolvedText(resolved) : "";
        var recommendedActionId = getChatRecommendedActionId(message, currentSnapshot);
        var stepCount = operations.length ? operations.length : (resultText ? 1 : 0);
        var changeGlance = buildChatResolvedPreviewGlanceData(message);
        var detailParts = [];
        if (changeGlance && changeGlance.detail) {
            detailParts.push(changeGlance.detail);
        }
        var actionSummaryDetail = (getChatMessageActionSummary(message, currentSnapshot) || {}).detail || getChatMessageStateDetail(message);
        if (actionSummaryDetail) {
            detailParts.push(actionSummaryDetail);
        }
        var statusLabel = "Reply ready";
        if (operations.length) {
            statusLabel = "Ready to review";
        }
        else if (resultText) {
            statusLabel = "Draft ready";
        }
        return {
            title: "Exchange outcome",
            detail: detailParts.join(" "),
            exchangeLabel: getChatMessageExchangeLabel(messages, messageIndex),
            scopeLabel: getChatMessageScopeLabel(message),
            statusLabel: statusLabel,
            stepLabel: stepCount ? (stepCount + " step" + (stepCount === 1 ? "" : "s")) : "",
            actionLabel: getChatRecommendedActionLabel(recommendedActionId),
            changeGlance: changeGlance,
            isCurrent: isCurrentChatExchange(messages, messageIndex)
        };
    }

    function buildChatExchangeOutcomeAriaLabel(outcomeData) {
        if (!outcomeData) {
            return "";
        }
        var parts = [];
        if (outcomeData.title) {
            parts.push(outcomeData.title);
        }
        if (outcomeData.exchangeLabel) {
            parts.push(outcomeData.exchangeLabel);
        }
        if (outcomeData.statusLabel) {
            parts.push(outcomeData.statusLabel);
        }
        if (outcomeData.scopeLabel) {
            parts.push(outcomeData.scopeLabel);
        }
        if (outcomeData.stepLabel) {
            parts.push(outcomeData.stepLabel);
        }
        if (outcomeData.actionLabel) {
            parts.push(outcomeData.actionLabel);
        }
        if (outcomeData.changeGlance) {
            parts.push(outcomeData.changeGlance.title || "Change at a glance");
            if (outcomeData.changeGlance.pills && outcomeData.changeGlance.pills.length) {
                for (var glanceIndex = 0; glanceIndex < outcomeData.changeGlance.pills.length; glanceIndex++) {
                    if (outcomeData.changeGlance.pills[glanceIndex] && outcomeData.changeGlance.pills[glanceIndex].text) {
                        parts.push(outcomeData.changeGlance.pills[glanceIndex].text);
                    }
                }
            }
        }
        if (outcomeData.isCurrent) {
            parts.push("Current exchange");
        }
        if (outcomeData.detail) {
            parts.push(outcomeData.detail);
        }
        return parts.join(". ");
    }

    function getChatContextWordCount(text) {
        var clean = normalizeText(text || "");
        return clean ? clean.split(/\s+/).length : 0;
    }

    function getChatContextParagraphCount(text) {
        var clean = normalizeText(text || "");
        return clean ? clean.split(/\n+/).filter(function (part) {
            return !!part;
        }).length : 0;
    }

    function getChatContextPreviewTitle(context) {
        return context && context.scope === "selection" ? "Selected passage" : "Document snapshot";
    }

    function getActiveChatPrompt(state, prompts) {
        var draft = normalizeText(state && state.draft ? state.draft : "");
        if (!draft || !prompts || !prompts.length) {
            return null;
        }
        for (var promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
            var prompt = prompts[promptIndex];
            if (prompt && normalizeText(prompt.prompt || "") === draft) {
                return prompt;
            }
        }
        return null;
    }

    function getChatEffectiveStatusText(state, context) {
        var statusText = normalizeText(state && state.status ? state.status : "");
        if (!statusText) {
            return "";
        }
        var scope = context && context.scope === "selection" ? "selection" : "document";
        if (/^select text first to use selection scope\.?$/i.test(statusText)) {
            return scope === "selection"
                ? "Chat will use the current selection."
                : "Select text to switch AI Chat back to selection scope.";
        }
        if (/^chat will use the current selection\.?$/i.test(statusText)) {
            return scope === "selection"
                ? "Chat will use the current selection."
                : "Selection scope is unavailable right now. Chat will use the whole document until you select text again.";
        }
        if (/^chat will use the whole document\.?$/i.test(statusText)) {
            return "Chat will use the whole document.";
        }
        return state.status;
    }

    function getChatStatusTone(state, context) {
        if (state && state.busy) {
            return "busy";
        }
        var statusText = normalizeText(getChatEffectiveStatusText(state, context)).toLowerCase();
        if (!statusText) {
            return "idle";
        }
        if (/could not|issue|error|select text first/.test(statusText)) {
            return "error";
        }
        if (/started|loaded|ready|will use|copied|previewed|applied/.test(statusText)) {
            return "ready";
        }
        return "idle";
    }

    function buildChatComposerStatusText(state, context, activePrompt) {
        if (state && state.busy) {
            return "Thinking through the current " + (context && context.scope === "selection" ? "selection" : "document") + "...";
        }
        var effectiveStatusText = getChatEffectiveStatusText(state, context);
        if (effectiveStatusText) {
            return effectiveStatusText;
        }
        var scopeLabel = context && context.scope === "selection" ? "selection" : "document";
        if (activePrompt && activePrompt.label) {
            return "Ready to run the " + activePrompt.label + " starter on the current " + scopeLabel + ".";
        }
        if (normalizeText(state && state.draft ? state.draft : "")) {
            return "Custom prompt ready for the current " + scopeLabel + ".";
        }
        return "Ready to ask about the current " + scopeLabel + ".";
    }

    function buildChatComposerMetaPills(state, context, activePrompt) {
        var pills = [];
        var exchangeCount = getChatExchangeCount(state && state.messages ? state.messages : []);
        var messageCount = state && state.messages ? state.messages.length : 0;
        appendChatHeaderMetaPill(pills, context && context.scope === "selection" ? "Selection context" : "Document context", "is-scope");
        appendChatHeaderMetaPill(pills, exchangeCount + " exchange" + (exchangeCount === 1 ? "" : "s"), "is-exchanges");
        appendChatHeaderMetaPill(pills, messageCount + " message" + (messageCount === 1 ? "" : "s"), "is-messages");
        appendChatHeaderMetaPill(pills, "Enter sends", "is-send");
        if (activePrompt) {
            appendChatHeaderMetaPill(pills, "Starter: " + (activePrompt.label || activePrompt.id || "Prompt"), "is-starter");
        }
        else if (normalizeText(state && state.draft ? state.draft : "")) {
            appendChatHeaderMetaPill(pills, "Custom prompt", "is-custom");
        }
        else {
            appendChatHeaderMetaPill(pills, "Ready for a new ask", "is-prompt");
        }
        appendChatHeaderMetaPill(pills, String(normalizeText(state && state.draft ? state.draft : "").length) + " chars", "is-count");
        return pills;
    }

    function buildChatComposerData(state, context, activePrompt) {
        var statusTone = getChatStatusTone(state, context);
        return {
            title: "Compose",
            statusTone: statusTone,
            statusLabel: statusTone === "busy" ? "Working" : (statusTone === "error" ? "Needs attention" : (statusTone === "ready" ? "Ready" : "Compose")),
            statusText: buildChatComposerStatusText(state, context, activePrompt),
            metaPills: buildChatComposerMetaPills(state, context, activePrompt)
        };
    }

    function buildChatComposerAriaLabel(composerData) {
        if (!composerData) {
            return "";
        }
        var parts = [];
        if (composerData.title) {
            parts.push(composerData.title);
        }
        if (composerData.statusLabel) {
            parts.push(composerData.statusLabel);
        }
        if (composerData.statusText) {
            parts.push(composerData.statusText);
        }
        if (composerData.metaPills && composerData.metaPills.length) {
            for (var i = 0; i < composerData.metaPills.length; i++) {
                if (composerData.metaPills[i] && composerData.metaPills[i].text) {
                    parts.push(composerData.metaPills[i].text);
                }
            }
        }
        return parts.join(". ");
    }

    function buildChatSendActionData(state, context, activePrompt) {
        var scopeLabel = context && context.scope === "selection" ? "selection" : "document";
        var hasCustomDraft = !!normalizeText(state && state.draft ? state.draft : "");
        if (state && state.busy) {
            return {
                text: "Thinking...",
                disabled: true,
                ariaLabel: "Send disabled while AI Chat is thinking about the current " + scopeLabel + ".",
                title: "AI Chat is thinking about the current " + scopeLabel + "."
            };
        }
        if (activePrompt && activePrompt.label) {
            return {
                text: "Send starter",
                disabled: false,
                ariaLabel: "Send starter. Send the " + activePrompt.label + " starter for the current " + scopeLabel + ".",
                title: "Send the " + activePrompt.label + " starter for the current " + scopeLabel + "."
            };
        }
        if (hasCustomDraft) {
            return {
                text: "Send prompt",
                disabled: false,
                ariaLabel: "Send prompt. Send the custom prompt for the current " + scopeLabel + ".",
                title: "Send the custom prompt for the current " + scopeLabel + "."
            };
        }
        return {
            text: "Send",
            disabled: true,
            ariaLabel: "Send disabled. Type a prompt or load a starter for the current " + scopeLabel + " first.",
            title: "Type a prompt or load a starter for the current " + scopeLabel + " first."
        };
    }

    function buildChatComposerActionsAriaLabel(sendActionData) {
        return "Compose actions. Open Ask AI. " + (sendActionData && sendActionData.ariaLabel ? sendActionData.ariaLabel : "Send.");
    }

    function getLatestChatMessage(state) {
        if (!state || !state.messages || !state.messages.length) {
            return null;
        }
        return state.messages[state.messages.length - 1] || null;
    }

    function getChatExchangeCount(messages) {
        if (!messages || !messages.length) {
            return 0;
        }
        var exchangeCount = 0;
        for (var index = 0; index < messages.length; index++) {
            if (messages[index] && messages[index].role === "user" && !messages[index].isError) {
                exchangeCount++;
            }
        }
        return exchangeCount;
    }

    function appendChatConversationSummaryPill(pills, text, className) {
        if (!pills || !text) {
            return;
        }
        for (var i = 0; i < pills.length; i++) {
            if (pills[i] && pills[i].text === text) {
                return;
            }
        }
        pills.push({
            text: text,
            className: className || ""
        });
    }

    function buildChatConversationSummaryChangeText(changeGlance) {
        if (!changeGlance) {
            return "";
        }
        var pills = changeGlance.pills || [];
        var changeLabel = "";
        var impactLabel = "";
        for (var i = 0; i < pills.length; i++) {
            var pill = pills[i];
            if (!pill || !pill.text) {
                continue;
            }
            if (!changeLabel && pill.kind === "change") {
                changeLabel = pill.text;
            }
            else if (!impactLabel && pill.kind === "impact") {
                impactLabel = pill.text;
            }
        }
        var detailParts = [];
        if (changeLabel && impactLabel) {
            detailParts.push("This is a " + impactLabel.toLowerCase() + " " + changeLabel.toLowerCase() + ".");
        }
        else if (changeLabel) {
            detailParts.push("This is a " + changeLabel.toLowerCase() + ".");
        }
        else if (impactLabel) {
            detailParts.push("This is " + impactLabel.toLowerCase() + ".");
        }
        if (changeGlance.detail) {
            detailParts.push(changeGlance.detail);
        }
        return detailParts.join(" ");
    }

    function buildChatConversationSummaryData(state, context) {
        var latestMessage = getLatestChatMessage(state);
        if (!latestMessage) {
            return null;
        }
        var currentSnapshot = context && context.snapshot ? context.snapshot : null;
        var scopeLabel = context && context.scope === "selection" ? "selection" : "document";
        var scopePill = scopeLabel === "selection" ? "Selection thread" : "Document thread";
        var messageCount = state && state.messages ? state.messages.length : 0;
        var exchangeCount = getChatExchangeCount(state && state.messages ? state.messages : []);
        var exchangeLabel = exchangeCount + " exchange" + (exchangeCount === 1 ? "" : "s");
        var messageLabel = messageCount + " message" + (messageCount === 1 ? "" : "s");
        var threadLead = exchangeCount
            ? (exchangeLabel + ", " + messageLabel)
            : messageLabel;
        var title = "Prompt sent to AI";
        var statusLabel = "Conversation live";
        var detailParts = [];
        var pills = [];
        if (state && state.busy) {
            title = "Working on your latest request";
            statusLabel = "Working";
            detailParts.push(threadLead + " in this " + scopeLabel + " thread.");
            detailParts.push("The assistant is preparing the next reply.");
        }
        else if (latestMessage.isError) {
            title = "Latest reply needs attention";
            statusLabel = "Needs attention";
            detailParts.push(threadLead + " in this " + scopeLabel + " thread.");
            detailParts.push("Adjust the prompt or try again.");
        }
        else if (latestMessage.role === "assistant") {
            var resolved = latestMessage.resolved || null;
            var operations = resolved && resolved.operations ? resolved.operations : [];
            var resultText = resolved ? getPrimaryResolvedText(resolved) : "";
            var recommendedActionId = getChatRecommendedActionId(latestMessage, currentSnapshot);
            var recommendedActionLabel = getChatRecommendedActionLabel(recommendedActionId);
            var changeGlance = buildChatResolvedPreviewGlanceData(latestMessage);
            var changeSummaryText = buildChatConversationSummaryChangeText(changeGlance);
            var actionSummary = getChatMessageActionSummary(latestMessage, currentSnapshot);
            detailParts.push(threadLead + " in this " + scopeLabel + " thread.");
            if (operations.length) {
                title = "Latest review exchange is ready";
                statusLabel = "Ready to review";
            }
            else if (resultText) {
                title = "Latest draft exchange is ready";
                statusLabel = "Draft ready";
            }
            else {
                title = "Latest reply is ready";
                statusLabel = "Reply ready";
            }
            if (recommendedActionLabel) {
                detailParts.push(recommendedActionLabel + " is the recommended next step.");
                appendChatConversationSummaryPill(pills, recommendedActionLabel, "is-action");
            }
            if (changeGlance && changeGlance.pills && changeGlance.pills.length) {
                for (var changePillIndex = 0; changePillIndex < changeGlance.pills.length; changePillIndex++) {
                    var changePill = changeGlance.pills[changePillIndex];
                    if (!changePill || !changePill.text) {
                        continue;
                    }
                    appendChatConversationSummaryPill(pills, changePill.text, changePill.kind ? ("is-" + changePill.kind) : "");
                }
            }
            if (changeSummaryText) {
                detailParts.push(changeSummaryText);
            }
            else if (actionSummary && actionSummary.detail) {
                detailParts.push(actionSummary.detail);
            }
        }
        else {
            detailParts.push(threadLead + " in this " + scopeLabel + " thread.");
        }
        pills.unshift({
            text: messageLabel,
            className: "is-count"
        });
        pills.unshift({
            text: exchangeLabel,
            className: "is-exchanges"
        });
        pills.unshift({
            text: scopePill,
            className: "is-scope"
        });
        pills.unshift({
            text: statusLabel,
            className: "is-status"
        });
        return {
            title: title,
            detail: detailParts.join(" "),
            statusLabel: statusLabel,
            scopeLabel: scopePill,
            exchangeLabel: exchangeLabel,
            messageLabel: messageLabel,
            actionLabel: latestMessage.role === "assistant" ? getChatRecommendedActionLabel(getChatRecommendedActionId(latestMessage, currentSnapshot)) : "",
            changeGlance: latestMessage.role === "assistant" ? buildChatResolvedPreviewGlanceData(latestMessage) : null,
            pills: pills
        };
    }

    function buildChatConversationSummaryAriaLabel(summaryData) {
        if (!summaryData) {
            return "";
        }
        var parts = ["AI chat feed summary"];
        if (summaryData.title) {
            parts.push(summaryData.title);
        }
        if (summaryData.statusLabel) {
            parts.push(summaryData.statusLabel);
        }
        if (summaryData.scopeLabel) {
            parts.push(summaryData.scopeLabel);
        }
        if (summaryData.exchangeLabel) {
            parts.push(summaryData.exchangeLabel);
        }
        if (summaryData.messageLabel) {
            parts.push(summaryData.messageLabel);
        }
        if (summaryData.actionLabel) {
            parts.push("Best next step");
            parts.push(summaryData.actionLabel);
        }
        if (summaryData.changeGlance) {
            parts.push(summaryData.changeGlance.title || "Change at a glance");
            var glancePills = summaryData.changeGlance.pills || [];
            for (var i = 0; i < glancePills.length; i++) {
                if (glancePills[i] && glancePills[i].text) {
                    parts.push(glancePills[i].text);
                }
            }
            if (summaryData.changeGlance.detail) {
                parts.push(summaryData.changeGlance.detail);
            }
        }
        return parts.join(". ");
    }

    function buildChatFeedIntroData(state, context, activePrompt) {
        var scopeLabel = context && context.scope === "selection" ? "selection" : "document";
        var exchangeCount = getChatExchangeCount(state && state.messages ? state.messages : []);
        var messageCount = state && state.messages ? state.messages.length : 0;
        var hasCustomDraft = !!normalizeText(state && state.draft ? state.draft : "");
        var detail = "Your first answer, draft, or reviewable change for the current " + scopeLabel + " will appear here.";
        var metaPills = [
            {
                text: "Waiting for first ask",
                className: "is-status"
            }
        ];
        if (activePrompt && activePrompt.label) {
            metaPills[0] = {
                text: "Starter ready",
                className: "is-status"
            };
            metaPills.push({
                text: activePrompt.label + " starter",
                className: "is-starter"
            });
            detail = "Press Enter to send the " + activePrompt.label + " starter for the current " + scopeLabel + ", or edit it in Compose first.";
        }
        else if (hasCustomDraft) {
            metaPills[0] = {
                text: "Draft ready",
                className: "is-status"
            };
            metaPills.push({
                text: "Custom prompt",
                className: "is-custom"
            });
            detail = "Press Enter to send your custom prompt for the current " + scopeLabel + ", or keep editing it in Compose.";
        }
        metaPills.push(
            {
                text: exchangeCount + " exchange" + (exchangeCount === 1 ? "" : "s"),
                className: "is-exchanges"
            },
            {
                text: messageCount + " message" + (messageCount === 1 ? "" : "s"),
                className: "is-count"
            }
        );
        return {
            title: "First exchange",
            detail: detail,
            metaPills: metaPills
        };
    }

    function buildChatFeedIntroAriaLabel(feedIntroData) {
        if (!feedIntroData) {
            return "";
        }
        var parts = [];
        if (feedIntroData.title) {
            parts.push(feedIntroData.title);
        }
        if (feedIntroData.metaPills && feedIntroData.metaPills.length) {
            for (var i = 0; i < feedIntroData.metaPills.length; i++) {
                if (feedIntroData.metaPills[i] && feedIntroData.metaPills[i].text) {
                    parts.push(feedIntroData.metaPills[i].text);
                }
            }
        }
        if (feedIntroData.detail) {
            parts.push(feedIntroData.detail);
        }
        return parts.join(". ");
    }

    function buildChatFeedSectionAriaLabel(state, context, activePrompt) {
        var parts = ["Conversation"];
        if (state && state.messages && state.messages.length) {
            var summaryData = buildChatConversationSummaryData(state, context);
            if (summaryData && summaryData.title) {
                parts.push(summaryData.title);
            }
            if (summaryData && summaryData.statusLabel) {
                parts.push(summaryData.statusLabel);
            }
            if (summaryData && summaryData.scopeLabel) {
                parts.push(summaryData.scopeLabel);
            }
            if (summaryData && summaryData.exchangeLabel) {
                parts.push(summaryData.exchangeLabel);
            }
            if (summaryData && summaryData.messageLabel) {
                parts.push(summaryData.messageLabel);
            }
            if (summaryData && summaryData.actionLabel) {
                parts.push("Best next step");
                parts.push(summaryData.actionLabel);
            }
            if (summaryData && summaryData.detail) {
                parts.push(summaryData.detail);
            }
            return parts.join(". ");
        }
        var feedIntroData = buildChatFeedIntroData(state, context, activePrompt);
        if (feedIntroData.title) {
            parts.push(feedIntroData.title);
        }
        if (feedIntroData.metaPills && feedIntroData.metaPills.length) {
            for (var i = 0; i < feedIntroData.metaPills.length; i++) {
                if (feedIntroData.metaPills[i] && feedIntroData.metaPills[i].text) {
                    parts.push(feedIntroData.metaPills[i].text);
                }
            }
        }
        if (feedIntroData.detail) {
            parts.push(feedIntroData.detail);
        }
        return parts.join(". ");
    }

    function getChatConversationSummaryTitle(state, context) {
        var summaryData = buildChatConversationSummaryData(state, context);
        return summaryData ? summaryData.title : "";
    }

    function getChatConversationSummaryDetail(state, context) {
        var summaryData = buildChatConversationSummaryData(state, context);
        return summaryData ? summaryData.detail : "";
    }

    function getChatConversationSummaryStatus(state, context) {
        var summaryData = buildChatConversationSummaryData(state, context);
        return summaryData ? summaryData.statusLabel : "";
    }

    function getChatHeaderStatusLabel(state, context) {
        var tone = getChatStatusTone(state, context);
        if (tone === "busy") {
            return "Working";
        }
        if (tone === "error") {
            return "Needs attention";
        }
        return "Ready";
    }

    function getChatHeaderSummaryText(state, context, activePrompt) {
        var scopeLabel = context && context.scope === "selection" ? "selection" : "document";
        var messageCount = state && state.messages ? state.messages.length : 0;
        var exchangeCount = getChatExchangeCount(state && state.messages ? state.messages : []);
        var threadLead = exchangeCount
            ? (exchangeCount + " exchange" + (exchangeCount === 1 ? "" : "s") + ", " + messageCount + " message" + (messageCount === 1 ? "" : "s"))
            : (messageCount + " message" + (messageCount === 1 ? "" : "s"));
        if (state && state.busy) {
            if (messageCount) {
                return threadLead + " in this conversation for the current " + scopeLabel + ". Preparing the next reply.";
            }
            return "Preparing help for the current " + scopeLabel + ".";
        }
        if (activePrompt && activePrompt.label) {
            return activePrompt.label + " starter is loaded for the current " + scopeLabel + ".";
        }
        if (!messageCount && normalizeText(state && state.draft ? state.draft : "")) {
            return "Custom prompt is ready for the current " + scopeLabel + ".";
        }
        if (messageCount) {
            return threadLead + " in this conversation for the current " + scopeLabel + ". " + getChatConversationSummaryTitle(state) + ".";
        }
        return "Ask, rewrite, or review the current " + scopeLabel + " in place.";
    }

    function appendChatHeaderMetaPill(pills, text, className) {
        if (!pills || !text) {
            return;
        }
        for (var i = 0; i < pills.length; i++) {
            if (pills[i] && pills[i].text === text) {
                return;
            }
        }
        pills.push({
            text: text,
            className: className || ""
        });
    }

    function buildChatHeaderMetaPills(state, context, activePrompt) {
        var pills = [];
        var scopeThreadLabel = context && context.scope === "selection" ? "Selection thread" : "Document thread";
        var messageCount = state && state.messages ? state.messages.length : 0;
        var exchangeCount = getChatExchangeCount(state && state.messages ? state.messages : []);
        var conversationSummary = buildChatConversationSummaryData(state, context);
        appendChatHeaderMetaPill(pills, scopeThreadLabel, "is-scope");
        appendChatHeaderMetaPill(pills, exchangeCount + " exchange" + (exchangeCount === 1 ? "" : "s"), "is-exchanges");
        appendChatHeaderMetaPill(pills, messageCount + " message" + (messageCount === 1 ? "" : "s"), "is-messages");
        appendChatHeaderMetaPill(pills, getChatContextWordCount(context && context.source ? context.source : "") + " words", "is-words");
        if (conversationSummary && conversationSummary.actionLabel) {
            appendChatHeaderMetaPill(pills, conversationSummary.actionLabel, "is-action");
        }
        else {
            appendChatHeaderMetaPill(
                pills,
                activePrompt && activePrompt.label ? activePrompt.label + " starter" : (normalizeText(state && state.draft ? state.draft : "") ? "Custom draft" : "Ready for a new ask"),
                "is-prompt"
            );
        }
        return pills;
    }

    function buildChatHeaderData(state, context, activePrompt) {
        return {
            statusLabel: getChatHeaderStatusLabel(state, context),
            scopeFocusLabel: context && context.scope === "selection" ? "Selection focus" : "Document focus",
            subtitle: getChatHeaderSummaryText(state, context, activePrompt),
            metaPills: buildChatHeaderMetaPills(state, context, activePrompt)
        };
    }

    function buildChatHeaderAriaLabel(titleText, headerData) {
        var parts = [];
        if (titleText) {
            parts.push(titleText);
        }
        if (!headerData) {
            return parts.join(". ");
        }
        if (headerData.statusLabel) {
            parts.push(headerData.statusLabel);
        }
        if (headerData.scopeFocusLabel) {
            parts.push(headerData.scopeFocusLabel);
        }
        if (headerData.subtitle) {
            parts.push(headerData.subtitle);
        }
        if (headerData.metaPills && headerData.metaPills.length) {
            for (var i = 0; i < headerData.metaPills.length; i++) {
                if (headerData.metaPills[i] && headerData.metaPills[i].text) {
                    parts.push(headerData.metaPills[i].text);
                }
            }
        }
        return parts.join(". ");
    }

    function buildChatContextData(context) {
        var scopeIsSelection = context && context.scope === "selection";
        var hasSelection = !!(context && context.snapshot && context.snapshot.hasSelection);
        var sourceText = context && context.source ? context.source : "";
        var previewMetaPills = [
            {
                text: getChatContextWordCount(sourceText) + " words",
                className: "is-words"
            },
            {
                text: normalizeText(sourceText).length + " chars",
                className: "is-chars"
            }
        ];
        var paragraphCount = getChatContextParagraphCount(sourceText);
        if (paragraphCount > 1) {
            previewMetaPills.push({
                text: paragraphCount + " paragraphs",
                className: "is-paragraphs"
            });
        }
        return {
            title: "Context",
            detail: scopeIsSelection
                ? "Using the selected passage as the active source. Switch to document to widen the ask."
                : (hasSelection
                    ? "Using the whole document as the active source. Switch to selection to narrow the ask."
                    : "Using the whole document as the active source. Select text any time to narrow the ask."),
            summaryPills: [
                {
                    text: scopeIsSelection ? "Selection active" : "Document active",
                    className: scopeIsSelection ? "is-selection" : "is-document"
                },
                {
                    text: hasSelection ? "Selection available" : "No current selection",
                    className: hasSelection ? "is-available" : "is-empty"
                }
            ],
            previewTitle: getChatContextPreviewTitle(context),
            previewMetaPills: previewMetaPills,
            previewSummary: context && context.summary ? context.summary : "The document is currently empty.",
            scopeIsSelection: scopeIsSelection,
            hasSelection: hasSelection
        };
    }

    function buildChatContextAriaLabel(contextData) {
        if (!contextData) {
            return "";
        }
        var parts = [];
        if (contextData.title) {
            parts.push(contextData.title);
        }
        if (contextData.summaryPills && contextData.summaryPills.length) {
            for (var i = 0; i < contextData.summaryPills.length; i++) {
                if (contextData.summaryPills[i] && contextData.summaryPills[i].text) {
                    parts.push(contextData.summaryPills[i].text);
                }
            }
        }
        if (contextData.detail) {
            parts.push(contextData.detail);
        }
        if (contextData.previewTitle) {
            parts.push(contextData.previewTitle);
        }
        if (contextData.previewMetaPills && contextData.previewMetaPills.length) {
            for (var previewMetaIndex = 0; previewMetaIndex < contextData.previewMetaPills.length; previewMetaIndex++) {
                if (contextData.previewMetaPills[previewMetaIndex] && contextData.previewMetaPills[previewMetaIndex].text) {
                    parts.push(contextData.previewMetaPills[previewMetaIndex].text);
                }
            }
        }
        if (contextData.previewSummary) {
            parts.push(contextData.previewSummary);
        }
        return parts.join(". ");
    }

    function buildChatContextBarAriaLabel(contextData) {
        if (!contextData) {
            return "";
        }
        var parts = ["Context scope switch"];
        if (contextData.summaryPills && contextData.summaryPills.length) {
            for (var i = 0; i < contextData.summaryPills.length; i++) {
                if (contextData.summaryPills[i] && contextData.summaryPills[i].text) {
                    parts.push(contextData.summaryPills[i].text);
                }
            }
        }
        return parts.join(". ");
    }

    function buildChatContextScopeButtonAriaLabel(scopeId, contextData) {
        var useSelection = scopeId === "selection";
        if (useSelection) {
            if (!contextData || !contextData.hasSelection) {
                return "Use selection. Unavailable until text is selected.";
            }
            return contextData.scopeIsSelection
                ? "Use selection. Active scope. AI Chat is using the current selection."
                : "Use selection. Available scope. Switch AI Chat to the current selection.";
        }
        return contextData && contextData.scopeIsSelection
            ? "Use document. Available scope. Switch AI Chat to the whole document."
            : "Use document. Active scope. AI Chat is using the whole document.";
    }

    function buildChatContextPreviewAriaLabel(contextData) {
        if (!contextData) {
            return "";
        }
        var parts = [];
        if (contextData.previewTitle) {
            parts.push(contextData.previewTitle);
        }
        if (contextData.previewMetaPills && contextData.previewMetaPills.length) {
            for (var i = 0; i < contextData.previewMetaPills.length; i++) {
                if (contextData.previewMetaPills[i] && contextData.previewMetaPills[i].text) {
                    parts.push(contextData.previewMetaPills[i].text);
                }
            }
        }
        if (contextData.previewSummary) {
            parts.push(contextData.previewSummary);
        }
        return parts.join(". ");
    }

    function buildChatQuickStartData(state, prompts, activePrompt, context) {
        var promptCount = prompts && prompts.length ? prompts.length : 0;
        var hasCustomDraft = !!normalizeText(state && state.draft ? state.draft : "");
        var scopeLabel = context && context.scope === "selection" ? "selection" : "document";
        var stateLabel = activePrompt
            ? ((activePrompt.label || activePrompt.id || "Prompt") + " starter")
            : (hasCustomDraft ? "Custom prompt" : "Ready to choose");
        var detail = activePrompt
            ? "Press Enter in Compose to send the loaded starter for the current " + scopeLabel + ", or edit it first."
            : (hasCustomDraft
                ? "Keep writing your prompt for the current " + scopeLabel + ", or switch to a starter before you send."
                : "Choose a starter for the current " + scopeLabel + " or keep typing your own prompt in Compose.");
        return {
            title: "Quick starts",
            detail: detail,
            metaPills: [
                {
                    text: scopeLabel === "selection" ? "Selection context" : "Document context",
                    className: "is-scope"
                },
                {
                    text: promptCount + " starters",
                    className: "is-count"
                },
                {
                    text: stateLabel,
                    className: activePrompt ? "is-active" : (hasCustomDraft ? "is-custom" : "is-ready")
                }
            ]
        };
    }

    function buildChatQuickStartAriaLabel(quickStartData) {
        if (!quickStartData) {
            return "";
        }
        var parts = [];
        if (quickStartData.title) {
            parts.push(quickStartData.title);
        }
        if (quickStartData.metaPills && quickStartData.metaPills.length) {
            for (var i = 0; i < quickStartData.metaPills.length; i++) {
                if (quickStartData.metaPills[i] && quickStartData.metaPills[i].text) {
                    parts.push(quickStartData.metaPills[i].text);
                }
            }
        }
        if (quickStartData.detail) {
            parts.push(quickStartData.detail);
        }
        return parts.join(". ");
    }

    function buildChatQuickButtonAriaLabel(prompt, isActivePrompt, context) {
        var parts = [];
        var label = prompt && (prompt.label || prompt.id) ? (prompt.label || prompt.id) : "Prompt";
        var scopeLabel = context && context.scope === "selection" ? "selection" : "document";
        parts.push(label);
        var intentLabel = getChatPromptIntentLabel(prompt);
        if (intentLabel) {
            parts.push(intentLabel + " starter");
        }
        var copy = summarizeChatPromptCopy(prompt && prompt.prompt ? prompt.prompt : "");
        if (copy) {
            parts.push(copy);
        }
        parts.push(isActivePrompt
            ? "Current starter loaded in Compose for the current " + scopeLabel
            : "Loads this starter into Compose for the current " + scopeLabel);
        return parts.join(". ");
    }

    function buildChatQuickRowAriaLabel(context) {
        return "Starter buttons for the current " + (context && context.scope === "selection" ? "selection" : "document");
    }

    function buildChatEmptyStateData(context, prompts) {
        var capabilityCards = [
            {
                title: "Ask and explore",
                copy: "Get answers, summaries, headings, or rewrite direction grounded in the current context."
            },
            {
                title: "Prepare reviewable edits",
                copy: "Preview inline changes, apply structured plans, or turn responses into review-ready suggestions."
            },
            {
                title: "Use starters or type your own",
                copy: "Choose one of the curated quick starts above or write a custom prompt in the composer below."
            }
        ];
        // 2026-05-15 (v20260515a): empty-state detail trimmed from 117 chars
        // ("Use the current document as context, ask for guidance, or prepare
        // reviewable edits before they touch the page.") to a calm 41-char
        // one-liner ("Ask anything about the current document."). The
        // earlier copy stamped marketing voice — "context", "reviewable
        // edits", "before they touch the page" — onto an empty conversation
        // where the user has not yet typed a single character. Same shape
        // Claude side-panel ("Type a message to start.") / ChatGPT side-
        // panel ("How can I help you today?") / Notion AI empty composer
        // ship: one short line that names the action, not the architecture.
        // The capability-cards data is still attached to emptyStateData.aria
        // so screen-reader users hear the long form via the aria-label.
        return {
            title: "Start with AI Chat",
            detail: context.scope === "selection"
                ? "Ask anything about the current selection."
                : "Ask anything about the current document.",
            metaPills: [
                {
                    text: context.scope === "selection" ? "Selection context" : "Document context",
                    className: "is-scope"
                },
                {
                    text: (prompts && prompts.length ? prompts.length : 0) + " starters",
                    className: "is-prompts"
                },
                {
                    text: getChatContextWordCount(context.source) + " words in scope",
                    className: "is-size"
                }
            ],
            capabilityCards: capabilityCards
        };
    }

    function buildChatEmptyCapabilityAriaLabel(capabilityCard) {
        if (!capabilityCard) {
            return "";
        }
        var parts = [];
        if (capabilityCard.title) {
            parts.push(capabilityCard.title);
        }
        if (capabilityCard.copy) {
            parts.push(capabilityCard.copy);
        }
        return parts.join(". ");
    }

    function buildChatEmptyStateAriaLabel(emptyStateData) {
        if (!emptyStateData) {
            return "";
        }
        var parts = [];
        if (emptyStateData.title) {
            parts.push(emptyStateData.title);
        }
        if (emptyStateData.detail) {
            parts.push(emptyStateData.detail);
        }
        if (emptyStateData.metaPills && emptyStateData.metaPills.length) {
            for (var i = 0; i < emptyStateData.metaPills.length; i++) {
                if (emptyStateData.metaPills[i] && emptyStateData.metaPills[i].text) {
                    parts.push(emptyStateData.metaPills[i].text);
                }
            }
        }
        if (emptyStateData.capabilityCards && emptyStateData.capabilityCards.length) {
            for (var cardIndex = 0; cardIndex < emptyStateData.capabilityCards.length; cardIndex++) {
                parts.push(buildChatEmptyCapabilityAriaLabel(emptyStateData.capabilityCards[cardIndex]));
            }
        }
        return parts.join(". ");
    }

    function clearChatNode(node) {
        if (!node) {
            return;
        }
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function syncChatPillGroup(node, pills, className) {
        if (!node) {
            return;
        }
        clearChatNode(node);
        var list = pills || [];
        for (var i = 0; i < list.length; i++) {
            if (!list[i] || !list[i].text) {
                continue;
            }
            append(node, "span", "", className + (list[i].className ? " " + list[i].className : ""), list[i].text);
        }
    }

    function syncChatDraftAwareUi(panel, state, context, prompts) {
        if (!panel) {
            return;
        }
        var activePrompt = getActiveChatPrompt(state, prompts);
        var contextData = buildChatContextData(context);
        var headerData = buildChatHeaderData(state, context, activePrompt);
        var emptyStateData = !state.messages.length ? buildChatEmptyStateData(context, prompts) : null;
        var composerData = buildChatComposerData(state, context, activePrompt);
        var quickStartData = buildChatQuickStartData(state, prompts, activePrompt, context);
        var feedIntroData = !state.messages.length ? buildChatFeedIntroData(state, context, activePrompt) : null;
        var sendActionData = buildChatSendActionData(state, context, activePrompt);

        var headerNode = panel.querySelector(".rte-ai-chat-header");
        if (headerNode) {
            headerNode.setAttribute("aria-label", buildChatHeaderAriaLabel(config.text_aichat || "AI Chat", headerData));
        }
        var headerStatusNode = panel.querySelector(".rte-ai-chat-header-status.is-status");
        if (headerStatusNode) {
            headerStatusNode.innerHTML = "";
            headerStatusNode.innerText = headerData.statusLabel;
        }
        var headerScopeNode = panel.querySelector(".rte-ai-chat-header-status.is-scope");
        if (headerScopeNode) {
            headerScopeNode.innerHTML = "";
            headerScopeNode.innerText = headerData.scopeFocusLabel;
        }
        var headerSubtitleNode = panel.querySelector(".rte-ai-chat-subtitle");
        if (headerSubtitleNode) {
            headerSubtitleNode.innerHTML = "";
            headerSubtitleNode.innerText = headerData.subtitle;
        }
        syncChatPillGroup(panel.querySelector(".rte-ai-chat-header-meta"), headerData.metaPills, "rte-ai-chat-header-meta-pill");

        var contextSectionNode = panel.querySelector(".rte-ai-chat-context-shell");
        if (contextSectionNode) {
            contextSectionNode.setAttribute("aria-label", buildChatContextAriaLabel(contextData));
            // 2026-05-15 (v20260515a): keep `is-no-selection-actionable`
            // class in sync as the editor's selection state changes (e.g.
            // user selects text after the panel was opened with no
            // selection). CSS hides the scope row when the class is on.
            contextSectionNode.classList.toggle("is-no-selection-actionable", !contextData.hasSelection);
        }
        var contextBarNode = panel.querySelector(".rte-ai-chat-context-bar");
        if (contextBarNode) {
            contextBarNode.setAttribute("aria-label", buildChatContextBarAriaLabel(contextData));
        }
        var contextScopeButtons = panel.querySelectorAll(".rte-ai-chat-scope-button");
        if (contextScopeButtons.length > 0) {
            contextScopeButtons[0].disabled = !contextData.hasSelection;
            contextScopeButtons[0].setAttribute("aria-label", buildChatContextScopeButtonAriaLabel("selection", contextData));
            if (contextData.scopeIsSelection) {
                contextScopeButtons[0].classList.add("is-active");
            }
            else {
                contextScopeButtons[0].classList.remove("is-active");
            }
        }
        if (contextScopeButtons.length > 1) {
            contextScopeButtons[1].setAttribute("aria-label", buildChatContextScopeButtonAriaLabel("document", contextData));
            if (contextData.scopeIsSelection) {
                contextScopeButtons[1].classList.remove("is-active");
            }
            else {
                contextScopeButtons[1].classList.add("is-active");
            }
        }
        syncChatPillGroup(panel.querySelector(".rte-ai-chat-context-summary-meta"), contextData.summaryPills, "rte-ai-chat-context-summary-pill");
        var contextSummaryTextNode = panel.querySelector(".rte-ai-chat-context-summary-text");
        if (contextSummaryTextNode) {
            contextSummaryTextNode.innerHTML = "";
            contextSummaryTextNode.innerText = contextData.detail;
        }
        var contextPreviewNode = panel.querySelector(".rte-ai-chat-context-preview");
        if (contextPreviewNode) {
            contextPreviewNode.className = "rte-ai-chat-context-preview is-" + (context && context.scope === "selection" ? "selection" : "document");
            contextPreviewNode.setAttribute("aria-label", buildChatContextPreviewAriaLabel(contextData));
        }
        var contextPreviewTitleNode = panel.querySelector(".rte-ai-chat-context-preview-title");
        if (contextPreviewTitleNode) {
            contextPreviewTitleNode.innerHTML = "";
            contextPreviewTitleNode.innerText = contextData.previewTitle;
        }
        syncChatPillGroup(panel.querySelector(".rte-ai-chat-context-preview-meta"), contextData.previewMetaPills, "rte-ai-chat-context-preview-pill");
        var contextPreviewCopyNode = panel.querySelector(".rte-ai-chat-context-preview-copy");
        if (contextPreviewCopyNode) {
            contextPreviewCopyNode.innerHTML = "";
            contextPreviewCopyNode.innerText = contextData.previewSummary;
        }

        var quickSectionNode = panel.querySelector(".rte-ai-chat-quick-shell");
        if (quickSectionNode) {
            quickSectionNode.setAttribute("aria-label", buildChatQuickStartAriaLabel(quickStartData));
        }
        var quickRowNode = panel.querySelector(".rte-ai-chat-quick-row");
        if (quickRowNode) {
            quickRowNode.setAttribute("aria-label", buildChatQuickRowAriaLabel(context));
        }
        var quickButtons = panel.querySelectorAll(".rte-ai-chat-quick-button");
        for (var quickIndex = 0; quickIndex < quickButtons.length && quickIndex < prompts.length; quickIndex++) {
            var quickPrompt = prompts[quickIndex];
            var quickIsActive = !!(state.draft && quickPrompt && quickPrompt.prompt && normalizeText(state.draft) === normalizeText(quickPrompt.prompt));
            if (quickIsActive) {
                quickButtons[quickIndex].classList.add("is-active");
            }
            else {
                quickButtons[quickIndex].classList.remove("is-active");
            }
            quickButtons[quickIndex].setAttribute("aria-label", buildChatQuickButtonAriaLabel(quickPrompt, quickIsActive, context));
        }
        syncChatPillGroup(panel.querySelector(".rte-ai-chat-quick-summary-meta"), quickStartData.metaPills, "rte-ai-chat-quick-summary-pill");
        var quickSummaryTextNode = panel.querySelector(".rte-ai-chat-quick-summary-text");
        if (quickSummaryTextNode) {
            quickSummaryTextNode.innerHTML = "";
            quickSummaryTextNode.innerText = quickStartData.detail;
        }

        var composerSectionNode = panel.querySelector(".rte-ai-chat-compose-shell");
        if (composerSectionNode) {
            composerSectionNode.setAttribute("aria-label", buildChatComposerAriaLabel(composerData));
        }
        var composerInputNode = panel.querySelector(".rte-ai-chat-input");
        if (composerInputNode) {
            composerInputNode.setAttribute("aria-label", "Compose next AI request for the current " + (context && context.scope === "selection" ? "selection" : "document"));
        }
        var composerMetaNode = panel.querySelector(".rte-ai-chat-composer-meta");
        if (composerMetaNode) {
            composerMetaNode.setAttribute("aria-label", (composerData.metaPills || []).map(function (pill) {
                return pill && pill.text ? pill.text : "";
            }).filter(function (text) {
                return !!text;
            }).join(". "));
        }
        syncChatPillGroup(composerMetaNode, composerData.metaPills, "rte-ai-chat-composer-pill");
        var composerStatusNode = panel.querySelector(".rte-ai-chat-status");
        if (composerStatusNode) {
            composerStatusNode.className = "rte-ai-chat-status is-" + composerData.statusTone;
            composerStatusNode.setAttribute("aria-label", composerData.statusLabel + ". " + composerData.statusText);
        }
        var composerStatusPillNode = panel.querySelector(".rte-ai-chat-status-pill");
        if (composerStatusPillNode) {
            composerStatusPillNode.className = "rte-ai-chat-status-pill is-" + composerData.statusTone;
            composerStatusPillNode.innerHTML = "";
            composerStatusPillNode.innerText = composerData.statusLabel;
        }
        var composerStatusTextNode = panel.querySelector(".rte-ai-chat-status-text");
        if (composerStatusTextNode) {
            composerStatusTextNode.innerHTML = "";
            composerStatusTextNode.innerText = composerData.statusText;
        }
        var composerActionsNode = panel.querySelector(".rte-ai-chat-composer-actions");
        if (composerActionsNode) {
            composerActionsNode.setAttribute("aria-label", buildChatComposerActionsAriaLabel(sendActionData));
        }
        var sendButtonNode = panel.querySelector(".rte-ai-chat-send-button");
        if (sendButtonNode) {
            sendButtonNode.disabled = !!sendActionData.disabled;
            sendButtonNode.setAttribute("aria-label", sendActionData.ariaLabel);
            sendButtonNode.title = sendActionData.title;
            // 2026-05-08: keep the send-glyph icon when re-syncing the
            // dynamic label text. Swap to spinner during busy state so
            // users see live progress instead of a stuck "Thinking..." label.
            sendButtonNode.classList.toggle("is-busy", !!state.busy);
            setReviewV2ButtonContent(sendButtonNode, state.busy ? "spinner" : "send", sendActionData.text);
        }

        if (!state.messages.length && feedIntroData) {
            var feedSectionNode = panel.querySelector(".rte-ai-chat-feed-shell");
            if (feedSectionNode) {
                feedSectionNode.setAttribute("aria-label", buildChatFeedSectionAriaLabel(state, context, activePrompt));
            }
            var feedIntroNode = panel.querySelector(".rte-ai-chat-feed-intro");
            if (feedIntroNode) {
                feedIntroNode.setAttribute("aria-label", buildChatFeedIntroAriaLabel(feedIntroData));
            }
            var feedIntroTitleNode = panel.querySelector(".rte-ai-chat-feed-intro-title");
            if (feedIntroTitleNode) {
                feedIntroTitleNode.innerHTML = "";
                feedIntroTitleNode.innerText = feedIntroData.title;
            }
            var feedIntroDetailNode = panel.querySelector(".rte-ai-chat-feed-intro-detail");
            if (feedIntroDetailNode) {
                feedIntroDetailNode.innerHTML = "";
                feedIntroDetailNode.innerText = feedIntroData.detail;
            }
            syncChatPillGroup(panel.querySelector(".rte-ai-chat-feed-intro-meta"), feedIntroData.metaPills, "rte-ai-chat-feed-intro-pill");

            var emptyStateNode = panel.querySelector(".rte-ai-chat-empty");
            if (emptyStateNode && emptyStateData) {
                emptyStateNode.setAttribute("aria-label", buildChatEmptyStateAriaLabel(emptyStateData));
            }
            var emptyTitleNode = panel.querySelector(".rte-ai-chat-empty-title");
            if (emptyTitleNode && emptyStateData) {
                emptyTitleNode.innerHTML = "";
                emptyTitleNode.innerText = emptyStateData.title;
            }
            var emptyDetailNode = panel.querySelector(".rte-ai-chat-empty-detail");
            if (emptyDetailNode && emptyStateData) {
                emptyDetailNode.innerHTML = "";
                emptyDetailNode.innerText = emptyStateData.detail;
            }
            syncChatPillGroup(panel.querySelector(".rte-ai-chat-empty-meta"), emptyStateData ? emptyStateData.metaPills : [], "rte-ai-chat-empty-pill");
        }
    }

    function syncOpenChatPanelFromEditor() {
        if (!editor || !editor.__aiChatPanel || !editor.__aiChatPanel.isConnected) {
            return;
        }
        var state = getChatState();
        if (state && state.messages && state.messages.length) {
            renderChatPanel(false);
            return;
        }
        syncChatDraftAwareUi(
            editor.__aiChatPanel,
            state,
            resolveChatScope(),
            config.aiToolkitChatPrompts || []
        );
    }

    function scheduleOpenChatPanelSync() {
        if (!editor) {
            return;
        }
        if (editor.__aiChatSyncTimer) {
            clearTimeout(editor.__aiChatSyncTimer);
        }
        editor.__aiChatSyncTimer = setTimeout(function () {
            editor.__aiChatSyncTimer = 0;
            syncOpenChatPanelFromEditor();
        }, 0);
    }

    function bindAiToolkitLiveSyncTargets() {
        if (!editor || !editor.getEditable) {
            return;
        }
        var editable = editor.getEditable ? editor.getEditable() : null;
        var liveSyncHandler = editor.__aiToolkitLiveSyncHandler || (editor.__aiToolkitLiveSyncHandler = function () {
            scheduleOpenChatPanelSync();
            scheduleOpenDialogSync();
        });
        if (editable && editable.addEventListener && editor.__aiToolkitLiveSyncEditable !== editable) {
            editable.addEventListener("input", liveSyncHandler);
            editable.addEventListener("keyup", liveSyncHandler);
            editable.addEventListener("mouseup", liveSyncHandler);
            editable.addEventListener("focus", liveSyncHandler);
            editor.__aiToolkitLiveSyncEditable = editable;
        }
        var editableDoc = editable && editable.ownerDocument ? editable.ownerDocument : null;
        if (editableDoc && editableDoc.addEventListener && editor.__aiToolkitLiveSyncDocument !== editableDoc) {
            editableDoc.addEventListener("selectionchange", liveSyncHandler);
            editor.__aiToolkitLiveSyncDocument = editableDoc;
        }
    }

    function syncOpenDialogFromEditor() {
        if (!editor || !editor.__aiDialog || !editor.__aiDialog.isConnected || typeof editor.__aiDialog.__aiSyncFromEditor !== "function") {
            return;
        }
        editor.__aiDialog.__aiSyncFromEditor();
    }

    function scheduleOpenDialogSync() {
        if (!editor) {
            return;
        }
        if (editor.__aiDialogSyncTimer) {
            clearTimeout(editor.__aiDialogSyncTimer);
        }
        editor.__aiDialogSyncTimer = setTimeout(function () {
            editor.__aiDialogSyncTimer = 0;
            syncOpenDialogFromEditor();
        }, 0);
    }

    function renderChatPanel(focusComposer) {
        var shell = getEditorShell();
        if (!shell) {
            return false;
        }

        var preservedFocus = !focusComposer ? captureChatPanelFocusState(editor.__aiChatPanel) : null;
        var preservedScroll = !focusComposer ? captureChatFeedScrollState(editor.__aiChatPanel) : null;
        var state = getChatState();
        var context = resolveChatScope();
        var prompts = config.aiToolkitChatPrompts || [];
        var activePrompt = getActiveChatPrompt(state, prompts);

        closeChatPanel({ preserveReturnFocus: true });
        editor.__aiChatOriginalMinHeight = shell.style ? (shell.style.minHeight || "") : "";
        shell.classList.add("rte-ai-chat-host");
        if (shell.style) {
            // 2026-05-25 (v20260525a): pulled the desired-height floor down
            // again to track the composer compaction landed today. The
            // composer's Send button moved INSIDE the textarea (was a
            // stacked second row beneath it, ~36 + 8 gap = ~44px), the
            // textarea min-height dropped from the 52-108 the override
            // cascade actually produced to 44px, and `resize: none` killed
            // the handle since the inline Send overlay would otherwise
            // occlude it. Net composer height: ~114px stacked → ~62px
            // inline. The empty-state chat panel now ends at ~420px tall;
            // the prior 440/480 floor was reserving editor-shell height
            // for a panel whose contents have moved up the page.
            // Earlier baseline:
            //   v20260518a: 560/660 → 440/480 after the chat composer's
            //               first set of compactions.
            // 2026-06-02 (v20260602a): floor pulled down again after the
            // Pass 49 chat-panel compactness pass: outer padding 16→12,
            // empty-state card chrome flattened (no border / gradient /
            // box-shadow), feed-shell padding 12/13→10/11. Empty-state
            // panel now sits at ~350px content tall, so the 420 floor
            // was reserving ~70px of editor-shell height for empty
            // panel chrome. Drop the floor to 320/360 (mobile/desktop)
            // so the editor shell isn't artificially padded for a
            // panel whose contents already fit.
            // 2026-06-04 (v20260604a): Pass 51 collapsed the empty Chat
            // panel from ~263px to ~215px (feed-shell padding/min-height
            // drop). The 320/360 floor was reserving ~50-100px of
            // editor-shell height for chrome that no longer exists.
            // Drop the floor to match the new natural empty-panel height.
            var desiredHeight = window.innerWidth <= 900 ? 260 : 280;
            shell.style.minHeight = Math.max(shell.offsetHeight || 0, desiredHeight) + "px";
        }
        editor.__aiChatShell = shell;

        var panel = append(shell, "div", "", "rte-ai-chat-panel");
        panel.setAttribute("role", "complementary");
        panel.setAttribute("aria-label", config.text_aichat || "AI Chat");
        panel.tabIndex = -1;
        editor.__aiChatPanel = panel;
        panel.onkeydown = function (e) {
            if (e.key === "Escape") {
                e.preventDefault();
                closeChatPanel({ restoreFocus: true });
            }
        };

        // 2026-05-08 redesign: stripped this panel down to the basics. The
        // earlier build crammed an "Assistant workspace / READY / DOCUMENT
        // FOCUS / V202605xxx" eyebrow row, a paragraph subtitle, a 5-pill
        // header-meta row, a decorative hero panel, a context preview card,
        // a context summary pill row, a "Quick starts" section label, a
        // quick-start summary row, a "Conversation" section label, a feed
        // intro card, and an empty-state capability grid into the same panel.
        // Two screenshots in a row prompted "hard to use, hard to understand".
        // Now: header (icon + title + new chat + close), scope toggle, quick
        // chips, conversation area, composer.
        var headerData = buildChatHeaderData(state, context, activePrompt);
        var headerTitleText = config.text_aichat || "AI Chat";
        var header = append(panel, "div", "", "rte-ai-chat-header is-minimal");
        header.setAttribute("role", "group");
        header.setAttribute("aria-label", buildChatHeaderAriaLabel(headerTitleText, headerData));
        var headerCopy = append(header, "div", "", "rte-ai-chat-header-copy");
        var titleRow = append(headerCopy, "div", "", "rte-ai-chat-title-row");
        var titleIcon = append(titleRow, "span", "", "rte-ai-chat-title-icon");
        titleIcon.innerHTML = config.svgCode_aiassist_chat || config.svgCode_aiassist || "";
        append(titleRow, "div", "", "rte-ai-chat-title", headerTitleText);
        var headerActions = append(header, "div", "", "rte-ai-chat-header-actions");
        // 2026-05-15 (v20260515c): New chat button → icon-only. Sat next
        // to a close [X] icon-only button on the same 420px header row,
        // so painting the refresh icon plus a "New chat" text label was
        // a third unequal-width affordance fighting the close button for
        // header chrome attention. Same shape Claude side-panel / ChatGPT
        // side-panel / Notion AI ship — a single refresh / + glyph with
        // hover title + aria-label for affordance, no inline text. Saves
        // ~70px wide on the header row so the title + close pair land at
        // their natural left/right edges. The icon-only class triggers
        // the same compact padding rule the chat scope buttons use.
        var clearButton = append(headerActions, "button", "", "secondary rte-ai-chat-header-button is-icon-only");
        clearButton.type = "button";
        clearButton.setAttribute("data-rte-ai-chat-header-action", "new-chat");
        clearButton.title = "Start a fresh chat";
        clearButton.setAttribute("aria-label", "Start a fresh chat");
        setReviewV2ButtonContent(clearButton, "refresh", "");
        clearButton.onclick = function () {
            resetChatConversationState(state, "Started a fresh AI chat.");
            renderChatPanel(true);
        };
        var closeButton = append(headerActions, "button", "", "rte-ai-panel-close-button");
        closeButton.type = "button";
        closeButton.setAttribute("data-rte-ai-chat-header-action", "close");
        closeButton.setAttribute("aria-label", "Close AI chat");
        closeButton.title = "Close";
        closeButton.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
        closeButton.onclick = function () {
            closeChatPanel({ restoreFocus: true });
        };

        // Compact scope toggle. No preview card, no summary pills, no detail
        // copy — just two buttons that flip the scope.
        // 2026-05-15 (v20260515a): when there is no editor selection the
        // toggle has nothing to toggle — the Selection button is disabled
        // (no selected text exists), Document is the default + only active
        // choice, so the 38px row + 10px gap (48px tall) was rendering a
        // segmented control whose state was already forced. Same shape
        // Claude side-panel / ChatGPT side-panel ship — the scope chip only
        // appears when there's actually a scope to pick. CSS hides the row
        // via the `is-no-selection-actionable` class; the moment the user
        // selects text the class drops and the toggle reappears. DOM stays
        // intact so syncChatDraftAwareUi selectors (`.rte-ai-chat-context-
        // shell` / `.rte-ai-chat-context-bar` / `.rte-ai-chat-scope-button`)
        // keep resolving without each call site needing a null guard.
        // Saves ~48px tall on every fresh-open chat panel.
        var contextData = buildChatContextData(context);
        var contextSection = append(panel, "div", "", "rte-ai-chat-stack rte-ai-chat-context-shell is-minimal" + (context.snapshot.hasSelection ? "" : " is-no-selection-actionable"));
        contextSection.setAttribute("role", "group");
        contextSection.setAttribute("aria-label", buildChatContextAriaLabel(contextData));
        var contextBar = append(contextSection, "div", "", "rte-ai-chat-context-bar");
        contextBar.setAttribute("role", "group");
        contextBar.setAttribute("aria-label", buildChatContextBarAriaLabel(contextData));
        // 2026-05-13 (v20260513c): scope buttons demoted to icon-only.
        // The cursor-T (Selection) and document (Document) glyphs alone
        // are the same icon vocabulary the Ask AI dialog has used since
        // v20260509j, so muscle memory carries across the two AI surfaces.
        // At the 390px chat panel width the labeled buttons were eating
        // ~140px (35%) of the context row for a binary toggle that has
        // exactly two options; icon-only drops that to ~70px (18%) and
        // lets the panel breathe. Hover title + aria-label still surface
        // the long form for affordance and screen readers. Same compact
        // segmented control Notion AI inline composer / Tiptap AI bubble
        // use for their "selection vs document" scope picker.
        var selectionButton = append(contextBar, "button", "", "rte-ai-chat-scope-button is-icon-only" + (contextData.scopeIsSelection ? " is-active" : ""));
        selectionButton.type = "button";
        selectionButton.disabled = !context.snapshot.hasSelection;
        selectionButton.setAttribute("data-rte-ai-chat-scope-target", "selection");
        selectionButton.setAttribute("aria-label", buildChatContextScopeButtonAriaLabel("selection", contextData));
        selectionButton.title = "Use selection";
        setReviewV2ButtonContent(selectionButton, "cursorText", "");
        selectionButton.onclick = function () {
            var currentSnapshot = captureSelectionSnapshot();
            state.scope = "selection";
            state.status = currentSnapshot.hasSelection ? "Chat will use the current selection." : "Select text first to use selection scope.";
            renderChatPanel(true);
        };
        var documentButton = append(contextBar, "button", "", "rte-ai-chat-scope-button is-icon-only" + (!contextData.scopeIsSelection ? " is-active" : ""));
        documentButton.type = "button";
        documentButton.setAttribute("data-rte-ai-chat-scope-target", "document");
        documentButton.setAttribute("aria-label", buildChatContextScopeButtonAriaLabel("document", contextData));
        documentButton.title = "Use document";
        setReviewV2ButtonContent(documentButton, "document", "");
        documentButton.onclick = function () {
            state.scope = "document";
            state.status = "Chat will use the whole document.";
            renderChatPanel(true);
        };

        // Quick-start chips. No section label, no summary pills, just chips.
        // 2026-05-13 (v20260513c): chips are only rendered on the empty
        // state. The chips are called "quick STARTS" — once a user has
        // sent any message they've already started, and the chip row
        // above the conversation feed becomes a permanently-visible
        // 30px row of suggestions the user has already declined.
        // Same shape Claude side-panel / ChatGPT side-panel / Notion AI
        // ship — starter suggestions land on the empty state and step
        // out of the way once a conversation exists. The chip section
        // is still appended pre-message so syncChatDraftAwareUi /
        // restoreChatPanelFocus selectors that walk
        // `.rte-ai-chat-quick-shell` still resolve; once the conversation
        // begins the section is suppressed via the is-conversation flag
        // and CSS hides the row. Power users still get the chips back
        // every time they hit "New chat" (which clears state.messages).
        var quickStartData = buildChatQuickStartData(state, prompts, activePrompt, context);
        var quickSection = append(panel, "div", "", "rte-ai-chat-stack rte-ai-chat-quick-shell is-minimal" + (state.messages.length ? " is-conversation" : ""));
        quickSection.setAttribute("role", "group");
        quickSection.setAttribute("aria-label", buildChatQuickStartAriaLabel(quickStartData));
        var quickRow = append(quickSection, "div", "", "rte-ai-chat-quick-row");
        quickRow.setAttribute("role", "group");
        quickRow.setAttribute("aria-label", buildChatQuickRowAriaLabel(context));
        for (var p = 0; p < prompts.length; p++) {
            (function (prompt) {
                var isActivePrompt = !!(state.draft && prompt.prompt && normalizeText(state.draft) === normalizeText(prompt.prompt));
                var quickButton = append(quickRow, "button", "", "rte-ai-chat-quick-button is-chip" + (isActivePrompt ? " is-active" : ""));
                quickButton.type = "button";
                quickButton.setAttribute("data-rte-ai-chat-prompt-tone", getChatPromptToneClass(prompt));
                quickButton.setAttribute("data-rte-ai-chat-prompt-id", prompt.id || prompt.label || String(p));
                quickButton.title = prompt.prompt || "";
                quickButton.setAttribute("aria-label", buildChatQuickButtonAriaLabel(prompt, isActivePrompt, context));
                // Tone-matched icon + label. The same setReviewV2ButtonContent
                // helper used by every other AI button keeps the gap and
                // alignment consistent.
                setReviewV2ButtonContent(quickButton, getChatPromptToneIconKey(prompt), prompt.label || prompt.id || "Prompt");
                quickButton.onclick = function () {
                    state.draft = prompt.prompt || "";
                    state.status = "Loaded the " + (prompt.label || prompt.id || "starter prompt") + " quick start.";
                    renderChatPanel(true);
                };
            })(prompts[p]);
        }

        var recentSessions = getRecentChatSessions(state, 4);
        if (recentSessions.length > 1) {
            var historySection = append(panel, "div", "", "rte-ai-chat-stack rte-ai-chat-history-shell is-minimal");
            historySection.setAttribute("role", "group");
            historySection.setAttribute("aria-label", "Recent AI chats");
            var historyRow = append(historySection, "div", "", "rte-ai-chat-quick-row rte-ai-chat-history-row");
            for (var s = 0; s < recentSessions.length; s++) {
                (function (session, index) {
                    var isActiveSession = session.id === state.sessionId;
                    var sessionButton = append(historyRow, "button", "", "rte-ai-chat-quick-button is-chip" + (isActiveSession ? " is-active" : ""));
                    sessionButton.type = "button";
                    sessionButton.setAttribute("data-rte-ai-chat-session-id", session.id);
                    sessionButton.title = (session.title || "Recent chat") + " - " + (session.exchangeCount || 0) + " exchange" + ((session.exchangeCount || 0) === 1 ? "" : "s");
                    sessionButton.setAttribute("aria-label", (isActiveSession ? "Current chat. " : "Open recent chat. ") + (session.title || "Recent chat") + ". " + (session.messageCount || 0) + " message" + ((session.messageCount || 0) === 1 ? "" : "s") + ".");
                    setReviewV2ButtonContent(sessionButton, isActiveSession ? "history" : "chat", (index === 0 && isActiveSession ? "Current" : "Recent") + ": " + (session.title || "Chat"));
                    sessionButton.onclick = function () {
                        if (isActiveSession) {
                            return;
                        }
                        if (restoreChatSessionIntoState(state, session.id, "Loaded a recent AI chat.")) {
                            renderChatPanel(true);
                        }
                    };
                })(recentSessions[s], s);
            }
        }

        // Conversation feed. No section label, no separate intro card, no
        // capability grid — when the conversation is empty we just show a
        // calm one-liner ("Ask anything about the current selection.").
        var feedSection = append(panel, "div", "", "rte-ai-chat-stack rte-ai-chat-feed-shell is-minimal");
        feedSection.setAttribute("role", "group");
        feedSection.setAttribute("aria-label", buildChatFeedSectionAriaLabel(state, context, activePrompt));
        var feed = append(feedSection, "div", "", "rte-ai-chat-feed");
        if (!state.messages.length) {
            var emptyStateData = buildChatEmptyStateData(context, prompts);
            var emptyState = append(feed, "div", "", "rte-ai-chat-empty is-minimal is-flat");
            emptyState.setAttribute("role", "group");
            emptyState.setAttribute("aria-label", buildChatEmptyStateAriaLabel(emptyStateData));
            // 2026-05-09 (v20260509j): dropped the 200x140 hero illustration
            // SVG from the empty state. With the scope toggle in the
            // header row + quick-start chips directly above this hint,
            // users already see ~5 visual anchors before they ever read
            // a turn — adding a 6th illustration was decorative noise
            // that pushed the composer below the fold on short panels.
            // Same shape ChatGPT side-panel / Claude side-panel use:
            // an empty conversation feed reads as a calm hint line, not
            // a marketing splash. Detached node kept so any external
            // integration that walks .rte-ai-chat-empty-art still
            // resolves without throwing.
            var emptyArt = document.createElement("div");
            emptyArt.className = "rte-ai-chat-empty-art is-detached";
            emptyArt.setAttribute("aria-hidden", "true");
            // 2026-05-20 (v20260520a): empty-state hint now points at the
            // quick-start chips above. Pre-pass the hint was a single line
            // ("Ask anything about the current document.") that gave
            // first-time users no signal about the unlabeled row of small
            // label-only pills directly above it — the chips read as
            // decorative tags rather than one-click starters. Appending
            // "—or tap a quick start above." links the two surfaces so the
            // empty state names BOTH the composer (Ask anything) and the
            // chip row (a quick start) as valid next steps. Same shape
            // Claude side-panel / ChatGPT side-panel ship: the empty hint
            // names every clickable affordance on the panel. Zero added
            // chrome — the existing single `.rte-ai-chat-empty-detail` line
            // grows from ~32 chars to ~52 chars and still wraps at the
            // ~320px max-width set by the existing CSS rule. Chips visible
            // only on empty state, so when conversation begins the
            // reference drops with the chips.
            var hasQuickStarts = !!(prompts && prompts.length);
            var emptyHintBase = context.scope === "selection"
                ? "Ask anything about the current selection"
                : "Ask anything about the current document";
            append(emptyState, "div", "", "rte-ai-chat-empty-detail",
                hasQuickStarts ? (emptyHintBase + " — or tap a quick start above.") : (emptyHintBase + "."));
        }
        var activeExchangeGroup = null;
        var activeExchangeIndex = 0;
        for (var i = 0; i < state.messages.length; i++) {
            // 2026-05-08: feed summary card (status/scope/exchange/message
            // pills above the first turn) folded into the per-message header
            // for legibility — kept the data shape for syncChatDraftAwareUi
            // queries to noop gracefully when the node is absent.
            if (false && i === 0) {
                var feedSummaryData = buildChatConversationSummaryData(state, context);
                var feedSummary = append(feed, "div", "", "rte-ai-chat-feed-summary");
                if (feedSummaryData) {
                    feedSummary.setAttribute("role", "group");
                    feedSummary.setAttribute("aria-label", buildChatConversationSummaryAriaLabel(feedSummaryData));
                }
                append(feedSummary, "div", "", "rte-ai-chat-feed-summary-title", feedSummaryData ? feedSummaryData.title : getChatConversationSummaryTitle(state, context));
                append(feedSummary, "div", "", "rte-ai-chat-feed-summary-detail", feedSummaryData ? feedSummaryData.detail : getChatConversationSummaryDetail(state, context));
                var feedSummaryMeta = append(feedSummary, "div", "", "rte-ai-chat-feed-summary-meta");
                var feedSummaryPills = feedSummaryData && feedSummaryData.pills && feedSummaryData.pills.length
                    ? feedSummaryData.pills
                    : [
                        { text: getChatConversationSummaryStatus(state, context), className: "is-status" },
                        { text: context.scope === "selection" ? "Selection thread" : "Document thread", className: "is-scope" },
                        { text: getChatExchangeCount(state.messages) + " exchange" + (getChatExchangeCount(state.messages) === 1 ? "" : "s"), className: "is-exchanges" },
                        { text: state.messages.length + " message" + (state.messages.length === 1 ? "" : "s"), className: "is-count" }
                    ];
                for (var feedSummaryPillIndex = 0; feedSummaryPillIndex < feedSummaryPills.length; feedSummaryPillIndex++) {
                    var feedSummaryPill = feedSummaryPills[feedSummaryPillIndex];
                    if (!feedSummaryPill || !feedSummaryPill.text) {
                        continue;
                    }
                    append(
                        feedSummaryMeta,
                        "span",
                        "",
                        "rte-ai-chat-feed-summary-pill" + (feedSummaryPill.className ? " " + feedSummaryPill.className : ""),
                        feedSummaryPill.text
                    );
                }
            }
            (function (message, messageIndex) {
                var threadRole = getChatMessageThreadRole(state.messages, messageIndex);
                var currentExchangeIndex = getChatMessageExchangeIndex(state.messages, messageIndex);
                var exchangeLabel = getChatMessageExchangeLabel(state.messages, messageIndex);
                var currentExchange = isCurrentChatExchange(state.messages, messageIndex);
                var exchangeContainer = feed;
                if (threadRole === "request") {
                    activeExchangeGroup = append(feed, "div", "", "rte-ai-chat-exchange-group");
                    if (exchangeLabel) {
                        activeExchangeGroup.setAttribute("data-rte-ai-chat-exchange-index", exchangeLabel);
                    }
                    if (currentExchange) {
                        activeExchangeGroup.setAttribute("data-rte-ai-chat-current-exchange", "true");
                    }
                    activeExchangeGroup.setAttribute("role", "group");
                    activeExchangeGroup.setAttribute("aria-label", buildChatExchangeGroupAriaLabel(state.messages, messageIndex, context.snapshot));
                    activeExchangeIndex = currentExchangeIndex;
                    exchangeContainer = activeExchangeGroup;
                }
                else if (threadRole === "response" && activeExchangeGroup && activeExchangeIndex === currentExchangeIndex) {
                    exchangeContainer = activeExchangeGroup;
                }
                else {
                    activeExchangeGroup = null;
                    activeExchangeIndex = 0;
                }
                // Per-exchange banner (title + scope/status/action/glance
                // pills + detail) folded into per-message header. Each banner
                // adds 5–8 visible pills per turn, which is what made longer
                // conversations look like a wall of badges.
                var exchangeBannerData = buildChatExchangeBannerData(state.messages, messageIndex, context.snapshot);
                if (false && exchangeBannerData) {
                    var exchangeBanner = append(exchangeContainer, "div", "", "rte-ai-chat-exchange-banner");
                    if (exchangeBannerData.exchangeLabel) {
                        exchangeBanner.setAttribute("data-rte-ai-chat-exchange-index", exchangeBannerData.exchangeLabel);
                    }
                    if (exchangeBannerData.isCurrent) {
                        exchangeBanner.setAttribute("data-rte-ai-chat-current-exchange", "true");
                    }
                    exchangeBanner.setAttribute("role", "group");
                    exchangeBanner.setAttribute("aria-label", buildChatExchangeBannerAriaLabel(exchangeBannerData));
                    append(exchangeBanner, "div", "", "rte-ai-chat-exchange-title", exchangeBannerData.title);
                    var exchangeMeta = append(exchangeBanner, "div", "", "rte-ai-chat-exchange-meta");
                    if (exchangeBannerData.exchangeLabel) {
                        append(exchangeMeta, "span", "", "rte-ai-chat-exchange-pill is-exchange", exchangeBannerData.exchangeLabel);
                    }
                    append(exchangeMeta, "span", "", "rte-ai-chat-exchange-pill is-scope", exchangeBannerData.scopeLabel);
                    append(exchangeMeta, "span", "", "rte-ai-chat-exchange-pill is-status", exchangeBannerData.statusLabel);
                    if (exchangeBannerData.actionLabel) {
                        append(exchangeMeta, "span", "", "rte-ai-chat-exchange-pill is-action", exchangeBannerData.actionLabel);
                    }
                    if (exchangeBannerData.changeGlance && exchangeBannerData.changeGlance.pills && exchangeBannerData.changeGlance.pills.length) {
                        for (var exchangeGlanceIndex = 0; exchangeGlanceIndex < exchangeBannerData.changeGlance.pills.length; exchangeGlanceIndex++) {
                            var exchangeGlancePill = exchangeBannerData.changeGlance.pills[exchangeGlanceIndex];
                            if (!exchangeGlancePill || !exchangeGlancePill.text) {
                                continue;
                            }
                            append(
                                exchangeMeta,
                                "span",
                                "",
                                "rte-ai-chat-exchange-pill" + (exchangeGlancePill.kind ? " is-" + exchangeGlancePill.kind : ""),
                                exchangeGlancePill.text
                            );
                        }
                    }
                    if (exchangeBannerData.isCurrent) {
                        append(exchangeMeta, "span", "", "rte-ai-chat-exchange-pill is-current", "Current exchange");
                    }
                    if (exchangeBannerData.detail) {
                        append(exchangeBanner, "div", "", "rte-ai-chat-exchange-detail", exchangeBannerData.detail);
                    }
                }
                var item = append(exchangeContainer, "div", "", "rte-ai-chat-message is-" + message.role + " is-minimal" + (message.isError ? " is-error" : ""));
                item.setAttribute("role", "group");
                item.setAttribute("aria-label", buildChatMessageAriaLabel(state.messages, messageIndex, context.snapshot));
                if (threadRole) {
                    item.setAttribute("data-rte-ai-chat-thread-role", threadRole);
                    item.setAttribute("data-rte-ai-chat-exchange-index", String(currentExchangeIndex));
                    if (currentExchange) {
                        item.setAttribute("data-rte-ai-chat-current-exchange", "true");
                    }
                }
                // Single role label per message ("You" / "AI"). The earlier
                // build also stamped scope/type/turn pills, an aria meta line,
                // a "User prompt" or "Assistant response" state card, a prompt
                // card with an extra header, and a context card with word and
                // paragraph counts. All of that has been folded into one
                // role row + body for legibility.
                var messageHeader = append(item, "div", "", "rte-ai-chat-message-header is-minimal");
                // Small avatar circle next to each message role label. SVG
                // glyphs differ for user vs assistant vs error, hue inherited
                // from the role's CSS color via currentColor.
                var avatarKind = message.isError ? "error" : message.role;
                var avatar = append(messageHeader, "span", "", "rte-ai-chat-message-avatar is-" + avatarKind);
                avatar.setAttribute("aria-hidden", "true");
                avatar.innerHTML = avatarKind === "user"
                    ? '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="8" cy="5.5" r="2.8"/><path d="M8 9.4c-2.8 0-5.2 1.5-5.2 3.4 0 .4.3.7.7.7h9c.4 0 .7-.3.7-.7 0-1.9-2.4-3.4-5.2-3.4z"/></svg>'
                    : (avatarKind === "error"
                        ? '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5M8 11.2v.1"/></svg>'
                        : '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="3" y="5" width="10" height="8" rx="2"/><circle cx="8" cy="3" r="0.9"/><line x1="8" y1="3.9" x2="8" y2="5" stroke="currentColor" stroke-width="1"/><circle cx="6" cy="9" r="1.1" fill="#ffffff"/><circle cx="10" cy="9" r="1.1" fill="#ffffff"/></svg>');
                append(messageHeader, "span", "", "rte-ai-chat-message-role is-" + (message.isError ? "error" : message.role), getChatMessageRoleLabel(message));
                append(item, "div", "", "rte-ai-chat-message-text", message.text || "");
                // 2026-05-08: per-message Copy + Regenerate row for assistant
                // turns. Lets users grab the AI output without reaching into
                // the underlying editor, and re-run a request without typing
                // the whole prompt again. Hidden on user / error messages.
                if (message.role === "assistant" && !message.isError && message.text) {
                    var msgActions = append(item, "div", "", "rte-ai-chat-message-actions-row");
                    var msgCopyBtn = append(msgActions, "button", "", "rte-ai-chat-message-action is-copy");
                    msgCopyBtn.type = "button";
                    msgCopyBtn.title = "Copy message text";
                    setReviewV2ButtonContent(msgCopyBtn, "checkAll", "Copy");
                    msgCopyBtn.onclick = (function (text, btn) {
                        return function (e) {
                            if (e && e.stopPropagation) e.stopPropagation();
                            var nav = window.navigator;
                            var copied = false;
                            try {
                                if (nav && nav.clipboard && nav.clipboard.writeText) {
                                    nav.clipboard.writeText(text);
                                    copied = true;
                                }
                            } catch (ignore) {}
                            if (!copied) {
                                // Fallback: range-copy via a hidden textarea.
                                var ta = document.createElement("textarea");
                                ta.value = text;
                                ta.style.position = "fixed";
                                ta.style.left = "-9999px";
                                document.body.appendChild(ta);
                                ta.select();
                                try { document.execCommand("copy"); copied = true; } catch (e2) {}
                                document.body.removeChild(ta);
                            }
                            if (copied) {
                                btn.classList.add("is-just-copied");
                                setReviewV2ButtonContent(btn, "check", "Copied");
                                setTimeout(function () {
                                    btn.classList.remove("is-just-copied");
                                    setReviewV2ButtonContent(btn, "checkAll", "Copy");
                                }, 1400);
                            }
                        };
                    })(message.text || "", msgCopyBtn);
                    // Regenerate: re-run the user prompt that produced this
                    // assistant turn. Walk back to find the most recent user
                    // message (almost always at messageIndex-1).
                    var precedingUserPrompt = "";
                    for (var pIdx = messageIndex - 1; pIdx >= 0; pIdx--) {
                        if (state.messages[pIdx] && state.messages[pIdx].role === "user" && !state.messages[pIdx].isError) {
                            precedingUserPrompt = state.messages[pIdx].text || "";
                            break;
                        }
                    }
                    if (precedingUserPrompt) {
                        var msgRegenBtn = append(msgActions, "button", "", "rte-ai-chat-message-action is-regen");
                        msgRegenBtn.type = "button";
                        msgRegenBtn.title = "Regenerate response";
                        setReviewV2ButtonContent(msgRegenBtn, "refresh", "Regenerate");
                        msgRegenBtn.onclick = (function (prompt) {
                            return function (e) {
                                if (e && e.stopPropagation) e.stopPropagation();
                                state.draft = prompt;
                                runChatPrompt(prompt);
                            };
                        })(precedingUserPrompt);
                    }
                }
                if (false && message.role === "user" && !message.isError) {
                    // legacy context card path retained behind a permanent
                    // false guard so the block below remains valid JS without
                    // restructuring the surrounding closure indices.
                    var contextCardData = buildChatMessageContextCardData(message);
                    if (contextCardData) {
                        var contextCard = append(item, "div", "", "rte-ai-chat-message-context-card is-user");
                        contextCard.setAttribute("role", "group");
                        contextCard.setAttribute("aria-label", buildChatMessageContextCardAriaLabel(contextCardData));
                        var contextHeader = append(contextCard, "div", "", "rte-ai-chat-message-context-header");
                        append(contextHeader, "div", "", "rte-ai-chat-message-context-title", contextCardData.title);
                        var contextMeta = append(contextHeader, "div", "", "rte-ai-chat-message-context-meta");
                        append(contextMeta, "span", "", "rte-ai-chat-message-context-pill is-scope", contextCardData.scopeLabel);
                        append(contextMeta, "span", "", "rte-ai-chat-message-context-pill is-words", contextCardData.wordLabel);
                        if (contextCardData.paragraphLabel) {
                            append(contextMeta, "span", "", "rte-ai-chat-message-context-pill is-paragraphs", contextCardData.paragraphLabel);
                        }
                        append(contextCard, "div", "", "rte-ai-chat-message-context-copy", contextCardData.copy);
                    }
                }
                // Request card on assistant messages used to repeat the
                // user's prompt under a "What you asked" header. Removed to
                // declutter — the user's own message above already shows it.
                if (false && message.role === "assistant" && !message.isError) {
                    var requestCardData = buildChatAssistantRequestCardData(state.messages, messageIndex);
                    if (requestCardData) {
                        var requestCard = append(item, "div", "", "rte-ai-chat-message-request-card");
                        var requestExchangeLabel = getChatMessageExchangeLabel(state.messages, messageIndex);
                        requestCard.setAttribute("role", "group");
                        requestCard.setAttribute("aria-label", buildChatAssistantRequestCardAriaLabel(requestCardData, requestExchangeLabel));
                        var requestHeader = append(requestCard, "div", "", "rte-ai-chat-message-request-header");
                        append(requestHeader, "div", "", "rte-ai-chat-message-request-title", requestCardData.title);
                        var requestMeta = append(requestHeader, "div", "", "rte-ai-chat-message-request-meta");
                        append(requestMeta, "span", "", "rte-ai-chat-message-request-pill is-scope", requestCardData.scopeLabel);
                        append(requestMeta, "span", "", "rte-ai-chat-message-request-pill is-detail", requestCardData.detail);
                        if (requestExchangeLabel) {
                            append(requestMeta, "span", "", "rte-ai-chat-message-request-pill is-exchange", requestExchangeLabel);
                        }
                        append(requestCard, "div", "", "rte-ai-chat-message-request-body", requestCardData.promptText);
                    }
                }

                if (message.role === "assistant" && message.resolved) {
                    var resolvedPreview = buildChatResolvedPreviewData(message, context.snapshot);
                    // 2026-05-08 (v20260508t): the per-message preview card
                    // (title + 4 meta pills + current/result compare lines +
                    // why card + change-glance + plan lead/items/followups)
                    // duplicated information already conveyed by the message
                    // bubble + smart Apply button. Two screenshots in a row
                    // came back as "hard to use" with the card present.
                    // Render path is preserved behind a permanent false guard
                    // so syncChatDraftAwareUi and downstream queries that look
                    // up these nodes keep noop'ing safely.
                    if (false && resolvedPreview) {
                        var previewCard = append(item, "div", "", "rte-ai-chat-message-preview");
                        previewCard.setAttribute("role", "group");
                        previewCard.setAttribute("aria-label", buildChatResolvedPreviewAriaLabel(resolvedPreview));
                        var previewHeader = append(previewCard, "div", "", "rte-ai-chat-message-preview-header");
                        append(previewHeader, "div", "", "rte-ai-chat-message-preview-title", resolvedPreview.title);
                        var previewMeta = append(previewCard, "div", "", "rte-ai-chat-message-preview-meta");
                        append(previewMeta, "span", "", "rte-ai-chat-message-preview-pill is-status", resolvedPreview.statusLabel);
                        append(previewMeta, "span", "", "rte-ai-chat-message-preview-pill is-scope", resolvedPreview.scopeLabel);
                        append(previewMeta, "span", "", "rte-ai-chat-message-preview-pill is-steps", resolvedPreview.stepLabel);
                        append(previewMeta, "span", "", "rte-ai-chat-message-preview-pill is-target", resolvedPreview.targetLabel);
                        var previewCompare = append(previewCard, "div", "", "rte-ai-chat-message-preview-compare");
                        var previewCompareHeader = append(previewCompare, "div", "", "rte-ai-chat-message-preview-compare-header");
                        append(previewCompareHeader, "div", "", "rte-ai-chat-message-preview-compare-title", "Proposed edit");
                        append(previewCompareHeader, "div", "", "rte-ai-chat-message-preview-compare-detail", "Current and suggested text");
                        if (resolvedPreview.sourceText && resolvedPreview.sourceText !== resolvedPreview.resultText) {
                            appendCompletionPreviewLine(previewCompare, "current", resolvedPreview.sourceText, resolvedPreview.diffParts);
                        }
                        appendCompletionPreviewLine(previewCompare, "result", resolvedPreview.resultText, resolvedPreview.diffParts);
                        if (resolvedPreview.reasonText) {
                            var previewReason = append(previewCard, "div", "", "rte-ai-chat-message-preview-reason-card");
                            append(previewReason, "div", "", "rte-ai-chat-message-preview-reason-label", "Why this change");
                            append(previewReason, "div", "", "rte-ai-chat-message-preview-reason", resolvedPreview.reasonText);
                        }
                        if (resolvedPreview.changeGlance) {
                            var previewGlance = append(previewCard, "div", "", "rte-ai-chat-message-preview-glance");
                            append(previewGlance, "div", "", "rte-ai-chat-message-preview-glance-title", resolvedPreview.changeGlance.title || "Change at a glance");
                            if (resolvedPreview.changeGlance.pills && resolvedPreview.changeGlance.pills.length) {
                                var previewGlanceMeta = append(previewGlance, "div", "", "rte-ai-chat-message-preview-glance-meta");
                                for (var previewGlanceIndex = 0; previewGlanceIndex < resolvedPreview.changeGlance.pills.length; previewGlanceIndex++) {
                                    var previewGlancePill = resolvedPreview.changeGlance.pills[previewGlanceIndex];
                                    if (!previewGlancePill || !previewGlancePill.text) {
                                        continue;
                                    }
                                    append(previewGlanceMeta, "span", "", "rte-ai-review-item-glance-pill is-" + (previewGlancePill.kind || "other"), previewGlancePill.text);
                                }
                            }
                            if (resolvedPreview.changeGlance.detail) {
                                append(previewGlance, "div", "", "rte-ai-chat-message-preview-glance-detail", resolvedPreview.changeGlance.detail);
                            }
                        }
                        if ((resolvedPreview.planLeadTitle || resolvedPreview.planLeadLabel || resolvedPreview.planLeadDetail)
                            || (resolvedPreview.planItems && resolvedPreview.planItems.length)) {
                            var previewPlan = append(previewCard, "div", "", "rte-ai-chat-message-preview-plan");
                            append(previewPlan, "div", "", "rte-ai-chat-message-preview-plan-title", "What happens next");
                            if (resolvedPreview.planLeadTitle || resolvedPreview.planLeadLabel || resolvedPreview.planLeadDetail) {
                                var previewPlanLead = append(previewPlan, "div", "", "rte-ai-chat-message-preview-plan-lead");
                                if (resolvedPreview.planLeadTitle) {
                                    append(previewPlanLead, "div", "", "rte-ai-chat-message-preview-plan-lead-title", resolvedPreview.planLeadTitle);
                                }
                                if (resolvedPreview.planLeadLabel) {
                                    var previewPlanLeadMeta = append(previewPlanLead, "div", "", "rte-ai-chat-message-preview-plan-items");
                                    append(previewPlanLeadMeta, "span", "", "rte-ai-chat-message-preview-plan-item is-recommended", resolvedPreview.planLeadLabel);
                                }
                                if (resolvedPreview.planLeadDetail) {
                                    append(previewPlanLead, "div", "", "rte-ai-chat-message-preview-plan-lead-detail", resolvedPreview.planLeadDetail);
                                }
                            }
                            if (resolvedPreview.planItems && resolvedPreview.planItems.length) {
                                if (resolvedPreview.planFollowupTitle) {
                                    append(previewPlan, "div", "", "rte-ai-chat-message-preview-plan-followup-title", resolvedPreview.planFollowupTitle);
                                }
                                var previewPlanItems = append(previewPlan, "div", "", "rte-ai-chat-message-preview-plan-followups");
                                for (var planIndex = 0; planIndex < resolvedPreview.planItems.length; planIndex++) {
                                    var planItem = resolvedPreview.planItems[planIndex];
                                    if (!planItem) {
                                        continue;
                                    }
                                    var followup = append(previewPlanItems, "div", "", "rte-ai-chat-message-preview-plan-followup");
                                    var followupAriaLabel = buildChatPreviewPlanItemAriaLabel(planItem);
                                    if (followupAriaLabel) {
                                        followup.setAttribute("role", "group");
                                        followup.setAttribute("aria-label", followupAriaLabel);
                                    }
                                    append(followup, "div", "", "rte-ai-chat-message-preview-plan-followup-label", planItem.label || "");
                                    if (planItem.detail) {
                                        append(followup, "div", "", "rte-ai-chat-message-preview-plan-followup-detail", planItem.detail);
                                    }
                                }
                                if (resolvedPreview.hiddenPlanCount) {
                                    append(previewPlanItems, "div", "", "rte-ai-chat-message-preview-plan-followup is-more", "+" + resolvedPreview.hiddenPlanCount + " more");
                                }
                            }
                        }
                    }
                    var actions = append(item, "div", "", "rte-ai-chat-message-actions");
                    var actionSummary = getChatMessageActionSummary(message, context.snapshot);
                    var previewOwnsHandoff = resolvedPreview
                        && (resolvedPreview.planLeadTitle
                            || resolvedPreview.planLeadLabel
                            || resolvedPreview.planLeadDetail
                            || (resolvedPreview.planItems && resolvedPreview.planItems.length));
                    // 2026-05-08 (v20260508t): the action summary stack
                    // (title + detail) duplicates the smart-Apply button's
                    // own label ("Replace selection", "Apply 3 pending steps",
                    // "Re-run from source"). Drop the extra card; users see
                    // the same hint on the primary button.
                    if (false && actionSummary && !previewOwnsHandoff) {
                        var actionSummaryNode = append(actions, "div", "", "rte-ai-chat-message-action-summary");
                        append(actionSummaryNode, "div", "", "rte-ai-chat-message-action-summary-title", actionSummary.title);
                        append(actionSummaryNode, "div", "", "rte-ai-chat-message-action-summary-detail", actionSummary.detail);
                    }
                    var recommendedActionId = getChatRecommendedActionId(message, context.snapshot);
                    var utilityActions = append(actions, "div", "", "rte-ai-chat-message-action-group is-utility");
                    var primaryActions = append(actions, "div", "", "rte-ai-chat-message-action-group is-primary");
                    var secondaryActions = append(actions, "div", "", "rte-ai-chat-message-action-group is-secondary");
                    var actionState = buildChatMessageActionState(message, context.snapshot);
                    var markRecommendedChatAction = function (button, actionId) {
                        if (!button || !actionId || actionId !== recommendedActionId) {
                            return;
                        }
                        button.className += " is-recommended";
                        button.setAttribute("data-rte-ai-chat-recommended", "true");
                    };
                    var copyButton = append(utilityActions, "button", "", "secondary rte-ai-chat-action-button is-copy", "Copy text");
                    copyButton.type = "button";
                    copyButton.setAttribute("data-rte-ai-chat-action", "copy");
                    copyButton.onclick = function () {
                        copyChatMessageText(message);
                    };
                    syncChatActionButtonAccessibility(copyButton, "copy", message, recommendedActionId, context.snapshot);

                    if (actionState.canApplyPlan) {
                        var planButton = append(primaryActions, "button", "", "secondary rte-ai-chat-action-button is-apply", "Apply");
                        planButton.type = "button";
                        planButton.setAttribute("data-rte-ai-chat-action", "apply");
                        planButton.onclick = function () {
                            applyChatMessage(message, "plan");
                        };
                        markRecommendedChatAction(planButton, "apply");
                        syncChatActionButtonAccessibility(planButton, "apply", message, recommendedActionId, context.snapshot);
                    }
                    if (actionState.canPreview) {
                        // 2026-05-20 (v20260520h): "Preview inline" → "Preview".
                        var previewButton = append(primaryActions, "button", "", "secondary rte-ai-chat-action-button is-preview", "Preview");
                        previewButton.type = "button";
                        previewButton.setAttribute("data-rte-ai-chat-action", "preview");
                        previewButton.onclick = function () {
                            applyChatMessage(message, "preview");
                        };
                        markRecommendedChatAction(previewButton, "preview");
                        syncChatActionButtonAccessibility(previewButton, "preview", message, recommendedActionId, context.snapshot);

                    }
                    if (actionState.canReplaceSelection) {
                        var replaceSelectionButton = append(primaryActions, "button", "", "secondary rte-ai-chat-action-button is-selection", "Replace selection");
                        replaceSelectionButton.type = "button";
                        replaceSelectionButton.setAttribute("data-rte-ai-chat-action", "selection");
                        replaceSelectionButton.onclick = function () {
                            applyChatMessage(message, "selection");
                        };
                        markRecommendedChatAction(replaceSelectionButton, "selection");
                        syncChatActionButtonAccessibility(replaceSelectionButton, "selection", message, recommendedActionId, context.snapshot);
                    }
                    if (actionState.canInsert) {
                        var insertButton = append(secondaryActions, "button", "", "secondary rte-ai-chat-action-button is-insert", "Insert below");
                        insertButton.type = "button";
                        insertButton.setAttribute("data-rte-ai-chat-action", "insert");
                        insertButton.onclick = function () {
                            applyChatMessage(message, "insert");
                        };
                        markRecommendedChatAction(insertButton, "insert");
                        syncChatActionButtonAccessibility(insertButton, "insert", message, recommendedActionId, context.snapshot);

                        if (actionState.canReplaceDocument) {
                            var replaceDocumentButton = append(secondaryActions, "button", "", "secondary rte-ai-chat-action-button is-document", "Replace document");
                            replaceDocumentButton.type = "button";
                            replaceDocumentButton.setAttribute("data-rte-ai-chat-action", "document");
                            replaceDocumentButton.onclick = function () {
                                applyChatMessage(message, "document");
                            };
                            markRecommendedChatAction(replaceDocumentButton, "document");
                            syncChatActionButtonAccessibility(replaceDocumentButton, "document", message, recommendedActionId, context.snapshot);
                        }
                    }
                    appendChatActionGroupHeader(utilityActions, getChatActionGroupInfo("utility", recommendedActionId, message, context.snapshot), "utility");
                    appendChatActionGroupHeader(primaryActions, getChatActionGroupInfo("primary", recommendedActionId, message, context.snapshot), "primary");
                    appendChatActionGroupHeader(secondaryActions, getChatActionGroupInfo("secondary", recommendedActionId, message, context.snapshot), "secondary");
                    orderChatActionGroups(actions, recommendedActionId);
                    orderChatRecommendedActionButton(actions, recommendedActionId);
                    syncChatActionAccessibility(actions, recommendedActionId, message, context.snapshot);

                    // 2026-05-08 (v20260508t): "More" toggle. Hides the
                    // alternative apply paths (Preview inline / Insert below /
                    // Replace document) until the user opts in. Defaults
                    // visible: Copy text, Apply (smart), Replace selection.
                    // CSS controls the hide; this button only flips a class
                    // on the message item. Only render when there is at least
                    // one alt button to hide.
                    var hasMoreOptions = !!(actionState.canPreview || actionState.canInsert || actionState.canReplaceDocument);
                    if (hasMoreOptions) {
                        var moreToggleHost = primaryActions.children.length ? primaryActions : (secondaryActions.children.length ? secondaryActions : utilityActions);
                        var moreToggle = append(moreToggleHost, "button", "", "secondary rte-ai-chat-action-button rte-ai-chat-message-action-toggle-more");
                        moreToggle.type = "button";
                        moreToggle.setAttribute("data-rte-ai-chat-action", "more");
                        moreToggle.setAttribute("aria-expanded", "false");
                        moreToggle.title = "More apply options";
                        setReviewV2ButtonContent(moreToggle, "more", "More");
                        moreToggle.onclick = (function (host) {
                            return function (e) {
                                if (e && e.stopPropagation) e.stopPropagation();
                                var expanded = host.classList.toggle("is-show-more");
                                moreToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
                            };
                        })(item);
                    }
                }
                if (message.role === "assistant" && !message.isError) {
                    var exchangeOutcomeData = buildChatExchangeOutcomeData(state.messages, messageIndex, context.snapshot);
                    // 2026-05-08 (v20260508t): the per-exchange outcome card
                    // (title + status/scope/steps/action/change pills + detail)
                    // came after every successful assistant turn and added a
                    // second wall of badges below the message bubble.
                    // Information already lives on the smart Apply button
                    // label and the message text — drop the card.
                    if (false && exchangeOutcomeData && exchangeContainer !== feed) {
                        var exchangeOutcome = append(exchangeContainer, "div", "", "rte-ai-chat-exchange-outcome");
                        exchangeOutcome.setAttribute("role", "group");
                        var exchangeOutcomeAriaLabel = buildChatExchangeOutcomeAriaLabel(exchangeOutcomeData);
                        if (exchangeOutcomeAriaLabel) {
                            exchangeOutcome.setAttribute("aria-label", exchangeOutcomeAriaLabel);
                        }
                        if (exchangeOutcomeData.exchangeLabel) {
                            exchangeOutcome.setAttribute("data-rte-ai-chat-exchange-index", exchangeOutcomeData.exchangeLabel);
                        }
                        if (exchangeOutcomeData.isCurrent) {
                            exchangeOutcome.setAttribute("data-rte-ai-chat-current-exchange", "true");
                        }
                        append(exchangeOutcome, "div", "", "rte-ai-chat-exchange-outcome-title", exchangeOutcomeData.title);
                        var exchangeOutcomeMeta = append(exchangeOutcome, "div", "", "rte-ai-chat-exchange-outcome-meta");
                        append(exchangeOutcomeMeta, "span", "", "rte-ai-chat-exchange-outcome-pill is-status", exchangeOutcomeData.statusLabel);
                        append(exchangeOutcomeMeta, "span", "", "rte-ai-chat-exchange-outcome-pill is-scope", exchangeOutcomeData.scopeLabel);
                        if (exchangeOutcomeData.stepLabel) {
                            append(exchangeOutcomeMeta, "span", "", "rte-ai-chat-exchange-outcome-pill is-steps", exchangeOutcomeData.stepLabel);
                        }
                        if (exchangeOutcomeData.actionLabel) {
                            append(exchangeOutcomeMeta, "span", "", "rte-ai-chat-exchange-outcome-pill is-action", exchangeOutcomeData.actionLabel);
                        }
                        if (exchangeOutcomeData.changeGlance && exchangeOutcomeData.changeGlance.pills && exchangeOutcomeData.changeGlance.pills.length) {
                            for (var exchangeGlanceIndex = 0; exchangeGlanceIndex < exchangeOutcomeData.changeGlance.pills.length; exchangeGlanceIndex++) {
                                var exchangeGlancePill = exchangeOutcomeData.changeGlance.pills[exchangeGlanceIndex];
                                if (!exchangeGlancePill || !exchangeGlancePill.text) {
                                    continue;
                                }
                                append(exchangeOutcomeMeta, "span", "", "rte-ai-chat-exchange-outcome-pill is-" + (exchangeGlancePill.kind || "other"), exchangeGlancePill.text);
                            }
                        }
                        if (exchangeOutcomeData.isCurrent) {
                            append(exchangeOutcomeMeta, "span", "", "rte-ai-chat-exchange-outcome-pill is-current", "Current exchange");
                        }
                        append(exchangeOutcome, "div", "", "rte-ai-chat-exchange-outcome-detail", exchangeOutcomeData.detail);
                    }
                }
            })(state.messages[i], i);
        }

        // Compose row: just a textarea + send/open-dialog buttons. The workspace
        // header above already shows scope/exchange/message/ready pills and the
        // status badge, so we deliberately don't render a second copy of those
        // pills here — earlier builds did and it made the panel look like two
        // stacked dialogs.
        var composerData = buildChatComposerData(state, context, activePrompt);
        var sendActionData = buildChatSendActionData(state, context, activePrompt);
        var composerSection = append(panel, "div", "", "rte-ai-chat-stack rte-ai-chat-compose-shell");
        composerSection.setAttribute("role", "group");
        composerSection.setAttribute("aria-label", buildChatComposerAriaLabel(composerData));
        var composer = append(composerSection, "div", "", "rte-ai-chat-composer");
        var composerArea = append(composer, "textarea", "", "rte-ai-chat-input");
        // 2026-05-18 (v20260518a): rows=1 so the at-rest textarea height
        // is governed by min-height (36px from the CSS pass-32 override)
        // instead of the default browser rows=2 baseline that was pushing
        // the at-rest composer to ~50px. The textarea still grows with
        // content because CSS does not pin a fixed height — only the
        // minimum drops. Same shape Notion AI / Claude / ChatGPT
        // composers ship — single-line input that grows on type.
        composerArea.rows = 1;
        // 2026-05-15 (v20260515c): "Ask AI…  Enter to send, Shift+Enter
        // for newline." → "Ask anything…". The Enter / Shift+Enter
        // shortcut is universal convention across every modern chat
        // composer (Claude, ChatGPT, Notion AI, Linear's command palette,
        // Cursor) — teaching it inside the placeholder repeats what the
        // user already knows from the first chat surface they ever used.
        // 51 chars → 14 chars. Same shape Claude composer ("Ask
        // anything") / ChatGPT composer ("Message ChatGPT") / Notion AI
        // ("Tell AI what to do…") ship.
        composerArea.placeholder = "Ask anything…";
        composerArea.setAttribute("aria-label", "Compose next AI request for the current " + (context.scope === "selection" ? "selection" : "document"));
        composerArea.value = state.draft || "";
        composerArea.disabled = !!state.busy;
        composerArea.oninput = function () {
            state.draft = composerArea.value;
            if (!state.busy) {
                state.status = "";
            }
            syncChatDraftAwareUi(panel, state, resolveChatScope(), prompts);
        };
        composerArea.onkeydown = function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                var keydownContext = resolveChatScope();
                var keydownPrompt = getActiveChatPrompt(state, prompts);
                var keydownSendAction = buildChatSendActionData(state, keydownContext, keydownPrompt);
                if (keydownSendAction.disabled) {
                    state.status = keydownSendAction.title;
                    syncChatDraftAwareUi(panel, state, keydownContext, prompts);
                    return;
                }
                runChatPrompt(composerArea.value);
            }
        };

        var composerActions = append(composer, "div", "", "rte-ai-chat-composer-actions");
        composerActions.setAttribute("role", "group");
        composerActions.setAttribute("aria-label", buildChatComposerActionsAriaLabel(sendActionData));
        // 2026-05-13 (v20260513b): "Open Ask AI" button removed from the
        // visible composer row. The button opened the single-shot Ask AI
        // dialog (preset to rewrite/document) — a different surface that
        // does the same job the chat composer is already doing, just with
        // a fixed Action picker instead of a free-form prompt. With both
        // buttons fighting for the composer row's width the Send primary
        // was rendering at ~50% of the row, half the natural prominence,
        // and first-time users hit "Open Ask AI" expecting it to send the
        // prompt they had just typed (and instead got a separate dialog
        // with their draft gone). The dialog is still reachable from the
        // toolbar AI button → "Ask AI" item, so power users haven't lost
        // a path; the chat surface now reads as one focused conversation
        // input. Same shape Claude side-panel / ChatGPT side-panel use:
        // the composer has ONE primary action (Send), no second button
        // bouncing the user to another surface. Detached node kept for
        // any external integration that walks
        // `[data-rte-ai-chat-action="open-dialog"]`.
        var askAiButton = document.createElement("button");
        askAiButton.type = "button";
        askAiButton.className = "secondary rte-ai-chat-action-button is-open-dialog is-detached";
        askAiButton.setAttribute("data-rte-ai-chat-action", "open-dialog");
        setReviewV2ButtonContent(askAiButton, "external", "Open Ask AI");
        askAiButton.onclick = function () {
            openDialog({
                useDocument: state.scope !== "selection",
                presetMode: "rewrite"
            });
        };
        var sendButton = append(composerActions, "button", "", "rte-ai-chat-send-button" + (state.busy ? " is-busy" : ""));
        sendButton.type = "button";
        sendButton.setAttribute("data-rte-ai-chat-action", "send");
        sendButton.disabled = !!sendActionData.disabled;
        sendButton.setAttribute("aria-label", sendActionData.ariaLabel);
        sendButton.title = sendActionData.title;
        // Send glyph + label, OR spinner glyph + "Thinking..." when state.busy.
        // The label string is dynamic so we re-use setReviewV2ButtonContent.
        setReviewV2ButtonContent(sendButton, state.busy ? "spinner" : "send", sendActionData.text);
        sendButton.onclick = function () {
            runChatPrompt(composerArea.value);
        };

        if (focusComposer) {
            setTimeout(function () {
                if (composerArea && composerArea.focus) {
                    composerArea.focus();
                    try {
                        composerArea.selectionStart = composerArea.selectionEnd = composerArea.value.length;
                    }
                    catch (ignore) {
                    }
                }
            }, 0);
        }

        persistChatState(state);
        if (feed && typeof feed.scrollTop !== "undefined" && (!preservedScroll || !restoreChatFeedScroll(feed, preservedScroll))) {
            feed.scrollTop = feed.scrollHeight;
        }
        if (!focusComposer && preservedFocus && !restoreChatPanelFocus(panel, preservedFocus) && panel && panel.focus) {
            try {
                panel.focus({ preventScroll: true });
            }
            catch (ignorePanelFocus) {
                try {
                    panel.focus();
                }
                catch (ignorePanelFocusFallback) {
                }
            }
        }
        return true;
    }

    function getSuggestionCounts() {
        var counts = {
            total: 0,
            pending: 0,
            accepted: 0,
            rejected: 0,
            stale: 0
        };
        var suggestions = getSuggestionStore();
        for (var i = 0; i < suggestions.length; i++) {
            counts.total++;
            if (counts.hasOwnProperty(suggestions[i].status)) {
                counts[suggestions[i].status]++;
            }
        }
        return counts;
    }

    function matchesReviewTypeFilter(suggestion, typeFilter) {
        if (!typeFilter || typeFilter === "all") {
            return true;
        }
        return getSuggestionTypeValue(suggestion && suggestion.suggestionType || "") === typeFilter;
    }

    function getReviewTypeOptions(suggestions) {
        var map = { all: "All types" };
        for (var i = 0; i < suggestions.length; i++) {
            var typeValue = getSuggestionTypeValue(suggestions[i] && suggestions[i].suggestionType || "");
            if (!map[typeValue]) {
                map[typeValue] = getSuggestionTypeLabel(typeValue);
            }
        }
        var options = [{ value: "all", label: map.all }];
        var keys = [];
        for (var key in map) {
            if (map.hasOwnProperty(key) && key !== "all") {
                keys.push(key);
            }
        }
        keys.sort();
        for (var k = 0; k < keys.length; k++) {
            options.push({ value: keys[k], label: map[keys[k]] });
        }
        return options;
    }

    function getPendingSuggestionCountsByType(suggestions) {
        var counts = { all: 0 };
        for (var i = 0; i < suggestions.length; i++) {
            if (suggestions[i].status !== "pending") {
                continue;
            }
            counts.all++;
            var typeValue = getSuggestionTypeValue(suggestions[i].suggestionType || "");
            counts[typeValue] = (counts[typeValue] || 0) + 1;
        }
        return counts;
    }

    function getFilteredPendingSuggestions(typeFilter) {
        var suggestions = getSuggestionStore().slice();
        var filtered = [];
        for (var i = 0; i < suggestions.length; i++) {
            if (suggestions[i].status === "pending" && matchesReviewTypeFilter(suggestions[i], typeFilter)) {
                filtered.push(suggestions[i]);
            }
        }
        return sortReviewSuggestions(filtered);
    }

    function getNextPendingSuggestionId(typeFilter, currentId) {
        var pending = getFilteredPendingSuggestions(typeFilter);
        if (!pending.length) {
            return "";
        }
        if (!currentId) {
            return pending[0].id;
        }
        for (var i = 0; i < pending.length; i++) {
            if (pending[i].id === currentId) {
                if (pending[i + 1]) {
                    return pending[i + 1].id;
                }
                return pending.length > 1 ? pending[0].id : "";
            }
        }
        return pending[0].id;
    }

    function getPreviousPendingSuggestionId(typeFilter, currentId) {
        var pending = getFilteredPendingSuggestions(typeFilter);
        if (!pending.length) {
            return "";
        }
        if (!currentId) {
            return pending[0].id;
        }
        for (var i = 0; i < pending.length; i++) {
            if (pending[i].id === currentId) {
                if (pending[i - 1]) {
                    return pending[i - 1].id;
                }
                return pending.length > 1 ? pending[pending.length - 1].id : "";
            }
        }
        return pending[0].id;
    }

    function locateNextPendingSuggestion(typeFilter, currentId) {
        var nextSuggestionId = getNextPendingSuggestionId(typeFilter, currentId);
        if (!nextSuggestionId) {
            return false;
        }
        return locateSuggestion(nextSuggestionId);
    }

    function locatePreviousPendingSuggestion(typeFilter, currentId) {
        var previousSuggestionId = getPreviousPendingSuggestionId(typeFilter, currentId);
        if (!previousSuggestionId) {
            return false;
        }
        return locateSuggestion(previousSuggestionId);
    }

    function activateNextPendingSuggestion(typeFilter, currentId, options) {
        var nextSuggestionId = getNextPendingSuggestionId(typeFilter, currentId);
        if (!nextSuggestionId) {
            return false;
        }
        return activateReviewSuggestion(nextSuggestionId, options || {});
    }

    function activatePreviousPendingSuggestion(typeFilter, currentId, options) {
        var previousSuggestionId = getPreviousPendingSuggestionId(typeFilter, currentId);
        if (!previousSuggestionId) {
            return false;
        }
        return activateReviewSuggestion(previousSuggestionId, options || {});
    }

    function getInlineReviewTypeFilter(currentSuggestionId) {
        var reviewState = getReviewState();
        var typeFilter = reviewState.typeFilter || "all";
        var suggestion = findSuggestionById(currentSuggestionId);
        if (suggestion && typeFilter !== "all" && !matchesReviewTypeFilter(suggestion, typeFilter)) {
            typeFilter = getSuggestionTypeValue(suggestion.suggestionType || "");
        }
        return typeFilter || "all";
    }

    function getNextInlineReviewSuggestionId(currentSuggestionId) {
        var typeFilter = getInlineReviewTypeFilter(currentSuggestionId);
        var nextSuggestionId = getNextPendingSuggestionId(typeFilter, currentSuggestionId);
        if (!nextSuggestionId && typeFilter !== "all") {
            nextSuggestionId = getNextPendingSuggestionId("all", currentSuggestionId);
        }
        return nextSuggestionId;
    }

    function getPreviousInlineReviewSuggestionId(currentSuggestionId) {
        var typeFilter = getInlineReviewTypeFilter(currentSuggestionId);
        var previousSuggestionId = getPreviousPendingSuggestionId(typeFilter, currentSuggestionId);
        if (!previousSuggestionId && typeFilter !== "all") {
            previousSuggestionId = getPreviousPendingSuggestionId("all", currentSuggestionId);
        }
        return previousSuggestionId;
    }

    function getFirstInlineReviewSuggestionId(currentSuggestionId) {
        var typeFilter = getInlineReviewTypeFilter(currentSuggestionId);
        var pending = getFilteredPendingSuggestions(typeFilter);
        if (!pending.length && typeFilter !== "all") {
            pending = getFilteredPendingSuggestions("all");
        }
        return pending.length ? pending[0].id : "";
    }

    function getLastInlineReviewSuggestionId(currentSuggestionId) {
        var typeFilter = getInlineReviewTypeFilter(currentSuggestionId);
        var pending = getFilteredPendingSuggestions(typeFilter);
        if (!pending.length && typeFilter !== "all") {
            pending = getFilteredPendingSuggestions("all");
        }
        return pending.length ? pending[pending.length - 1].id : "";
    }

    function locatePreviousInlineReviewSuggestion(currentSuggestionId, options) {
        var previousSuggestionId = getPreviousInlineReviewSuggestionId(currentSuggestionId);
        if (!previousSuggestionId) {
            return false;
        }
        return locateSuggestion(previousSuggestionId, options);
    }

    function locateNextInlineReviewSuggestion(currentSuggestionId, options) {
        var nextSuggestionId = getNextInlineReviewSuggestionId(currentSuggestionId);
        if (!nextSuggestionId) {
            return false;
        }
        return locateSuggestion(nextSuggestionId, options);
    }

    function locateFirstInlineReviewSuggestion(currentSuggestionId, options) {
        var firstSuggestionId = getFirstInlineReviewSuggestionId(currentSuggestionId);
        if (!firstSuggestionId) {
            return false;
        }
        return locateSuggestion(firstSuggestionId, options);
    }

    function locateLastInlineReviewSuggestion(currentSuggestionId, options) {
        var lastSuggestionId = getLastInlineReviewSuggestionId(currentSuggestionId);
        if (!lastSuggestionId) {
            return false;
        }
        return locateSuggestion(lastSuggestionId, options);
    }

    function getReviewTargetSuggestionId(typeFilter) {
        var activeSuggestion = getActiveSuggestion();
        if (activeSuggestion && activeSuggestion.status === "pending" && matchesReviewTypeFilter(activeSuggestion, typeFilter)) {
            return activeSuggestion.id;
        }
        return getNextPendingSuggestionId(typeFilter, "");
    }

    function getPendingSuggestionPosition(typeFilter, suggestionId) {
        var pending = getFilteredPendingSuggestions(typeFilter);
        var result = {
            id: suggestionId || "",
            index: 0,
            total: pending.length
        };
        if (!suggestionId || !pending.length) {
            return result;
        }
        for (var i = 0; i < pending.length; i++) {
            if (pending[i].id === suggestionId) {
                result.index = i + 1;
                return result;
            }
        }
        return result;
    }

    function getReviewSuggestionTypeFilter(suggestion) {
        var reviewState = getReviewState();
        var typeFilter = reviewState.typeFilter || "all";
        if (suggestion && typeFilter !== "all" && !matchesReviewTypeFilter(suggestion, typeFilter)) {
            typeFilter = getSuggestionTypeValue(suggestion.suggestionType || "");
        }
        return typeFilter || "all";
    }

    function getPendingReviewActionPresentation(suggestion, actionName, typeFilter) {
        if (!suggestion || suggestion.status !== "pending" || (actionName !== "accept" && actionName !== "reject")) {
            return null;
        }
        typeFilter = typeFilter || getReviewSuggestionTypeFilter(suggestion);
        var pending = getFilteredPendingSuggestions(typeFilter);
        if (!pending.length && typeFilter !== "all") {
            pending = getFilteredPendingSuggestions("all");
        }
        var suggestionIndex = -1;
        for (var pendingIndex = 0; pendingIndex < pending.length; pendingIndex++) {
            if (pending[pendingIndex] && pending[pendingIndex].id === suggestion.id) {
                suggestionIndex = pendingIndex;
                break;
            }
        }
        var verb = actionName === "accept" ? "Accept" : "Reject";
        if (suggestionIndex === -1 || !pending.length) {
            return {
                text: verb,
                label: verb + " this AI change"
            };
        }
        if (suggestionIndex === pending.length - 1) {
            return {
                text: verb + " & finish",
                label: verb + " & finish this AI change and finish the current review queue"
            };
        }
        return {
            text: verb + " & next",
            label: verb + " & next this AI change and move to the next review item"
        };
    }

    function getReviewShortcutDecisionCopy(suggestion) {
        var acceptLabel = getReviewFocusActionDisplayLabel(suggestion, "accept") || "Accept";
        var rejectLabel = getReviewFocusActionDisplayLabel(suggestion, "reject") || "Reject";
        return {
            acceptLabel: acceptLabel,
            rejectLabel: rejectLabel,
            acceptHint: acceptLabel.replace(/^([A-Z])/, function (match) {
                return match.toLowerCase();
            }),
            rejectHint: rejectLabel.replace(/^([A-Z])/, function (match) {
                return match.toLowerCase();
            })
        };
    }

    function applyReviewDecision(suggestionId, action, options) {
        options = options || {};
        if (!suggestionId) {
            return false;
        }
        var handled = false;
        if (action === "accept") {
            handled = acceptInlineSuggestion(suggestionId);
        }
        else if (action === "reject") {
            handled = rejectInlineSuggestion(suggestionId);
        }
        if (handled) {
            renderReviewPanel(true, {
                focusAction: options.focusAction || ""
            });
        }
        return handled;
    }

    function runReviewShortcutAction(typeFilter, action, options) {
        var suggestionId = getReviewTargetSuggestionId(typeFilter);
        if (!suggestionId) {
            return false;
        }
        return applyReviewDecision(suggestionId, action, options);
    }

    function acceptAllPendingSuggestions() {
        var suggestions = getSuggestionStore().slice();
        var handled = false;
        for (var i = 0; i < suggestions.length; i++) {
            if (suggestions[i].status === "pending" && acceptInlineSuggestion(suggestions[i].id)) {
                handled = true;
            }
        }
        return handled;
    }

    function acceptPendingSuggestionsByType(typeFilter) {
        if (!typeFilter || typeFilter === "all") {
            return acceptAllPendingSuggestions();
        }

        var suggestions = getSuggestionStore().slice();
        var handled = false;
        for (var i = 0; i < suggestions.length; i++) {
            if (suggestions[i].status === "pending" && matchesReviewTypeFilter(suggestions[i], typeFilter) && acceptInlineSuggestion(suggestions[i].id)) {
                handled = true;
            }
        }
        return handled;
    }

    function rejectAllPendingSuggestions() {
        var suggestions = getSuggestionStore().slice();
        var handled = false;
        for (var i = 0; i < suggestions.length; i++) {
            if (suggestions[i].status === "pending" && rejectInlineSuggestion(suggestions[i].id)) {
                handled = true;
            }
        }
        return handled;
    }

    function rejectPendingSuggestionsByType(typeFilter) {
        if (!typeFilter || typeFilter === "all") {
            return rejectAllPendingSuggestions();
        }

        var suggestions = getSuggestionStore().slice();
        var handled = false;
        for (var i = 0; i < suggestions.length; i++) {
            if (suggestions[i].status === "pending" && matchesReviewTypeFilter(suggestions[i], typeFilter) && rejectInlineSuggestion(suggestions[i].id)) {
                handled = true;
            }
        }
        return handled;
    }

    function locateSuggestion(suggestionId, options) {
        options = options || {};
        clearPreviewStateIfMissing();
        var suggestion = findSuggestionById(suggestionId);
        var wrapper = suggestion ? getSuggestionWrapper(suggestion.id) : null;
        if (!suggestion || !wrapper) {
            if (suggestion && suggestion.status === "pending") {
                suggestion.status = "stale";
                suggestion.decidedAt = suggestion.decidedAt || new Date().getTime();
            }
            if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
                renderReviewPanel(false);
            }
            return false;
        }

        if (!options.openedQueue && editor.__aiRecentlyOpenedQueueSuggestionId && editor.__aiRecentlyOpenedQueueSuggestionId !== suggestion.id) {
            clearQueueOpenedSuggestion({ skipUpdate: true, skipRender: true });
        }
        setActiveSuggestionId(suggestion.id);
        clearSuggestionRemoteUpdate(suggestion.id);
        if (options.openedQueue) {
            markQueueOpenedSuggestion(suggestion.id);
        }
        var pendingPosition = getPendingSuggestionPosition(getInlineReviewTypeFilter(suggestion.id), suggestion.id);
        var announcementOptions = {
            positionLabel: pendingPosition.total
                ? "Item " + pendingPosition.index + " of " + pendingPosition.total
                : "",
            remoteUpdateCount: getSuggestionRemoteUpdateCount(suggestion.id)
        };
        announceReviewStatus(options.openedQueue
            ? buildQueueOpenAnnouncement(suggestion, announcementOptions)
            : buildSuggestionAnnouncement(suggestion, "Reviewing", announcementOptions));
        wrapper.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        wrapper.classList.add("is-focused");
        setTimeout(function () {
            if (wrapper && wrapper.classList) {
                wrapper.classList.remove("is-focused");
            }
        }, 1400);
        editor.focus();
        var restoredInlineAction = !!(options.focusInlineAction && focusInlineSuggestionAction(suggestion.id, options.focusInlineAction));
        if (!restoredInlineAction) {
            focusInlineSuggestionWrapper(wrapper);
        }
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            renderReviewPanel(false);
        }
        return true;
    }

    function activateReviewSuggestion(suggestionId, options) {
        options = options || {};
        var suggestion = findSuggestionById(suggestionId);
        if (!suggestion) {
            return false;
        }
        if (!options.openedQueue && editor.__aiRecentlyOpenedQueueSuggestionId && editor.__aiRecentlyOpenedQueueSuggestionId !== suggestion.id) {
            clearQueueOpenedSuggestion({ skipUpdate: true, skipRender: true });
        }
        setActiveSuggestionId(suggestion.id);
        clearSuggestionRemoteUpdate(suggestion.id);
        if (options.openedQueue) {
            markQueueOpenedSuggestion(suggestion.id);
        }
        if (options.locate) {
            return locateSuggestion(suggestion.id, { openedQueue: !!options.openedQueue });
        }
        var pendingPosition = getPendingSuggestionPosition(getInlineReviewTypeFilter(suggestion.id), suggestion.id);
        var announcementOptions = {
            positionLabel: pendingPosition.total
                ? "Item " + pendingPosition.index + " of " + pendingPosition.total
                : "",
            remoteUpdateCount: getSuggestionRemoteUpdateCount(suggestion.id)
        };
        announceReviewStatus(options.openedQueue
            ? buildQueueOpenAnnouncement(suggestion, announcementOptions)
            : buildSuggestionAnnouncement(suggestion, "Reviewing", announcementOptions));
        renderReviewPanel(!!options.focusPanel, {
            focusAction: options.focusAction || ""
        });
        return true;
    }

    function revealActiveReviewItem(feed, focusItem, focusAction) {
        if (!feed || !editor.__aiActiveSuggestionId || !feed.querySelector) {
            return null;
        }
        var activeItem = feed.querySelector('[data-rte-ai-review-id="' + editor.__aiActiveSuggestionId + '"]');
        if (!activeItem || !activeItem.scrollIntoView) {
            return null;
        }
        activeItem.scrollIntoView({ block: "nearest", inline: "nearest" });
        if (focusItem) {
            var target = activeItem;
            if (focusAction && activeItem.querySelector) {
                var actionTarget = activeItem.querySelector('[data-rte-ai-review-action="' + focusAction + '"]');
                if (!actionTarget || actionTarget.disabled || !actionTarget.focus) {
                    actionTarget = activeItem.querySelector(".rte-ai-review-action-button.is-primary:not([disabled])")
                        || activeItem.querySelector('[data-rte-ai-review-action="locate"]:not([disabled])')
                        || activeItem.querySelector('[data-rte-ai-review-action]:not([disabled])');
                }
                if (actionTarget && !actionTarget.disabled && actionTarget.focus) {
                    target = actionTarget;
                }
            }
            if (target && target.focus) {
                target.focus();
            }
        }
        return activeItem;
    }

    function focusPrimaryReviewAction(suggestionId, preferredAction) {
        var panel = editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected ? editor.__aiReviewPanel : null;
        if (!panel || !panel.querySelector || !suggestionId) {
            return false;
        }
        var item = panel.querySelector('[data-rte-ai-review-id="' + suggestionId + '"]');
        if (!item) {
            return false;
        }
        var suggestion = findSuggestionById(suggestionId);
        var actionOrder = [];
        if (preferredAction) {
            actionOrder.push(preferredAction);
        }
        else {
            actionOrder.push(getDefaultReviewActionName(suggestion));
        }
        if (suggestion && suggestion.status === "pending") {
            actionOrder.push("accept");
            actionOrder.push("reject");
        }
        actionOrder.push("locate");

        var seen = {};
        for (var i = 0; i < actionOrder.length; i++) {
            var actionName = actionOrder[i];
            if (!actionName || seen[actionName]) {
                continue;
            }
            seen[actionName] = true;
            var actionButton = item.querySelector('[data-rte-ai-review-action="' + actionName + '"]');
            if (actionButton && !actionButton.disabled && actionButton.focus) {
                actionButton.focus();
                return true;
            }
        }
        if (item.focus) {
            item.focus();
            return true;
        }
        return false;
    }

    function focusDefaultReviewCardAction(suggestionId, preferredAction) {
        var suggestion = findSuggestionById(suggestionId);
        if (!suggestion) {
            return false;
        }
        var focusAction = preferredAction || getDefaultReviewActionName(suggestion);
        if (editor.__aiActiveSuggestionId === suggestion.id && focusPrimaryReviewAction(suggestion.id, focusAction)) {
            return true;
        }
        return activateReviewSuggestion(suggestion.id, {
            focusPanel: true,
            focusAction: focusAction || ""
        });
    }

    function getPreferredReviewActionFocus(panel) {
        var focusRoot = panel && panel.isConnected
            ? panel
            : (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected ? editor.__aiReviewPanel : null);
        var currentFocus = document.activeElement;
        if (focusRoot && currentFocus && currentFocus.getAttribute && focusRoot.contains(currentFocus)) {
            return currentFocus.getAttribute("data-rte-ai-review-action") || "";
        }
        return editor.__aiLastReviewActionFocus || "";
    }

    function activateReviewSuggestionWithDefaultActionFocus(suggestionId, options) {
        options = options || {};
        var suggestion = findSuggestionById(suggestionId);
        if (!suggestion) {
            return false;
        }
        var focusAction = options.focusAction || getPreferredReviewActionFocus();
        return activateReviewSuggestion(suggestion.id, {
            focusPanel: !!options.focusPanel,
            focusAction: focusAction || getDefaultReviewActionName(suggestion),
            openedQueue: !!options.openedQueue,
            locate: !!options.locate
        });
    }

    function navigateReviewActionFocus(typeFilter, currentSuggestionId, actionName, direction) {
        var targetSuggestionId = "";
        if (direction === "next") {
            targetSuggestionId = getNextPendingSuggestionId(typeFilter, currentSuggestionId);
        }
        else if (direction === "previous") {
            targetSuggestionId = getPreviousPendingSuggestionId(typeFilter, currentSuggestionId);
        }
        else if (direction === "first") {
            targetSuggestionId = getReviewTargetSuggestionId(typeFilter);
        }
        else if (direction === "last") {
            var pending = getFilteredPendingSuggestions(typeFilter);
            targetSuggestionId = pending.length ? pending[pending.length - 1].id : "";
        }
        if (!targetSuggestionId) {
            return false;
        }
        return activateReviewSuggestion(targetSuggestionId, {
            focusPanel: true,
            focusAction: actionName || ""
        });
    }

    function hasUndoableReviewShortcut() {
        return !!getUndoableReviewDecision();
    }

    function hasRedoableReviewShortcut() {
        return !!getRedoableReviewDecision();
    }

    function appendUndoShortcutTitle(text) {
        var undoContext = getUndoDecisionContext();
        var redoContext = getRedoDecisionContext();
        var title = text;
        if (hasUndoableReviewShortcut()) {
            title = title.replace(/\.$/, "") + ". U undoes " + undoContext.decisionLabel + " decision.";
        }
        if (hasRedoableReviewShortcut()) {
            title = title.replace(/\.$/, "") + ". Shift+U redoes " + redoContext.decisionLabel + " decision.";
        }
        return title;
    }

    function appendUndoShortcutHint(text) {
        var undoContext = getUndoDecisionContext();
        var hint = text;
        if (hasUndoableReviewShortcut()) {
            hint += " | U " + undoContext.shortcutLabel;
        }
        if (hasRedoableReviewShortcut()) {
            hint += " | Shift+U " + getRedoDecisionContext().shortcutLabel;
        }
        return hint;
    }

    function appendUndoShortcutKeys(keys) {
        var result = keys;
        if (hasUndoableReviewShortcut()) {
            result += " U";
        }
        if (hasRedoableReviewShortcut()) {
            result += " Shift+U";
        }
        return result;
    }

    function getReviewActionShortcutKeys(actionName) {
        switch (actionName) {
            case "accept":
                return "Enter Space A";
            case "reject":
                return "Enter Space R";
            case "undo":
                return "Enter Space U";
            case "redo":
                return "Enter Space Shift+U";
            case "locate":
                return "Enter Space";
            default:
                return "Enter Space";
        }
    }

    function getReviewActionShortcutTitle(actionName, suggestion, label) {
        var undoContext = getUndoDecisionContext();
        var redoContext = getRedoDecisionContext();
        var decisionCopy = getReviewShortcutDecisionCopy(suggestion);
        var title = (label || "").replace(/\.$/, "");
        if (!title) {
            title = actionName === "locate" ? "Locate" : "Review action";
        }
        if (actionName === "accept") {
            return title + ". Enter or Space activates this action. A uses " + decisionCopy.acceptLabel + ".";
        }
        if (actionName === "reject") {
            return title + ". Enter or Space activates this action. R uses " + decisionCopy.rejectLabel + ".";
        }
        if (actionName === "undo") {
            return title + ". Enter or Space activates this action." + (undoContext ? " U " + undoContext.shortcutLabel + "." : "");
        }
        if (actionName === "redo") {
            return title + ". Enter or Space activates this action." + (redoContext ? " Shift+U " + redoContext.shortcutLabel + "." : "");
        }
        return title + ". Enter or Space activates this action.";
    }

    function getReviewActionShortcutHint(actionName, suggestion) {
        var undoContext = getUndoDecisionContext();
        var redoContext = getRedoDecisionContext();
        var decisionCopy = getReviewShortcutDecisionCopy(suggestion);
        if (actionName === "accept") {
            return appendUndoShortcutHint("Shortcuts: Enter " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
        }
        if (actionName === "reject") {
            return appendUndoShortcutHint("Shortcuts: Enter " + decisionCopy.rejectHint + " | A " + decisionCopy.acceptHint + " | J/K move | Home/End jump");
        }
        if (actionName === "undo") {
            return appendUndoShortcutHint("Shortcuts: Enter " + undoContext.shortcutLabel + " | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
        }
        if (actionName === "redo") {
            return appendUndoShortcutHint("Shortcuts: Enter " + redoContext.shortcutLabel + " | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
        }
        if (actionName === "locate") {
            return appendUndoShortcutHint("Shortcuts: Enter locate | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
        }
        return appendUndoShortcutHint("Shortcuts: J/K move | Enter focus action | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | Home/End jump");
    }

    function getReviewCardShortcutTitle(suggestion, preferredAction) {
        var decisionCopy = getReviewShortcutDecisionCopy(suggestion);
        if (!suggestion || suggestion.status !== "pending") {
            return appendUndoShortcutTitle("Enter focuses Locate. J/K move items. Home/End jump.");
        }
        var focusLabel = getReviewFocusActionDisplayLabel(suggestion, preferredAction) || decisionCopy.acceptLabel;
        return appendUndoShortcutTitle("Enter focuses " + focusLabel + ". A uses " + decisionCopy.acceptLabel + ". R uses " + decisionCopy.rejectLabel + ". J/K move items. Home/End jump.");
    }

    function getReviewCardShortcutHint(suggestion, preferredAction) {
        var decisionCopy = getReviewShortcutDecisionCopy(suggestion);
        if (!suggestion || suggestion.status !== "pending") {
            return appendUndoShortcutHint("Shortcuts: Enter focus Locate | J/K move | Home/End jump");
        }
        var focusLabel = getReviewFocusActionDisplayLabel(suggestion, preferredAction) || decisionCopy.acceptLabel;
        return appendUndoShortcutHint("Shortcuts: Enter focus " + focusLabel + " | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
    }

    function getReviewCardSupplementalShortcutHint(suggestion, preferredAction) {
        var decisionCopy = getReviewShortcutDecisionCopy(suggestion);
        if (!suggestion || suggestion.status !== "pending") {
            return appendUndoShortcutHint("Shortcuts: J/K move | Home/End jump");
        }
        return appendUndoShortcutHint("Shortcuts: A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
    }

    function resolveReviewFocusActionName(suggestion, preferredAction) {
        if (!suggestion) {
            return "";
        }
        var redoable = getRedoableReviewDecision();
        var undoable = getUndoableReviewDecision();
        var actionOrder = [];
        if (preferredAction) {
            actionOrder.push(preferredAction);
        }
        actionOrder.push(getDefaultReviewActionName(suggestion));
        if (suggestion.status === "pending") {
            actionOrder.push("accept");
            actionOrder.push("reject");
            if (undoable) {
                actionOrder.push("undo");
            }
            if (redoable && redoable.suggestion && redoable.suggestion.id === suggestion.id) {
                actionOrder.push("redo");
            }
        }
        actionOrder.push("locate");
        var seen = {};
        for (var i = 0; i < actionOrder.length; i++) {
            var actionName = actionOrder[i];
            if (!actionName || seen[actionName]) {
                continue;
            }
            seen[actionName] = true;
            if ((actionName === "accept" || actionName === "reject") && suggestion.status === "pending") {
                return actionName;
            }
            if (actionName === "undo" && suggestion.status === "pending" && undoable) {
                return actionName;
            }
            if (actionName === "redo" && suggestion.status === "pending" && redoable && redoable.suggestion && redoable.suggestion.id === suggestion.id) {
                return actionName;
            }
            if (actionName === "locate" && (suggestion.status === "pending" || suggestion.status === "stale")) {
                return actionName;
            }
        }
        return "";
    }

    function getReviewFocusActionDisplayLabel(suggestion, preferredAction) {
        var actionName = resolveReviewFocusActionName(suggestion, preferredAction);
        if (actionName === "undo") {
            return getUndoDecisionContext().actionLabel || "Undo";
        }
        if (actionName === "redo") {
            return getRedoDecisionContext().actionLabel || "Redo";
        }
        if (actionName === "reject") {
            return (getPendingReviewActionPresentation(suggestion, "reject") || {}).text || "Reject";
        }
        if (actionName === "accept") {
            return (getPendingReviewActionPresentation(suggestion, "accept") || {}).text || "Accept";
        }
        if (actionName === "locate") {
            return "Locate";
        }
        return "";
    }

    function getReviewActionGroupName(actionName) {
        switch (actionName) {
            case "accept":
            case "reject":
                return "decision";
            case "undo":
            case "redo":
                return "recovery";
            case "locate":
                return "locate";
            default:
                return "";
        }
    }

    function getReviewActionButtonDisplayOrder(groupName, actionName, targetActionName) {
        var baseOrder;
        switch (groupName) {
            case "locate":
                baseOrder = ["locate"];
                break;
            case "decision":
                baseOrder = ["accept", "reject"];
                break;
            case "recovery":
                baseOrder = ["undo", "redo"];
                break;
            default:
                baseOrder = [];
                break;
        }
        var defaultIndex = baseOrder.indexOf(actionName);
        if (defaultIndex === -1) {
            return baseOrder.length + 1;
        }
        if (!targetActionName) {
            return defaultIndex + 1;
        }
        var targetIndex = baseOrder.indexOf(targetActionName);
        if (targetIndex === -1) {
            return defaultIndex + 1;
        }
        if (actionName === targetActionName) {
            return 1;
        }
        var displayOrder = 2;
        for (var orderIndex = 0; orderIndex < baseOrder.length; orderIndex++) {
            if (baseOrder[orderIndex] === targetActionName) {
                continue;
            }
            if (baseOrder[orderIndex] === actionName) {
                return displayOrder;
            }
            displayOrder++;
        }
        return defaultIndex + 1;
    }

    function getReviewActionGroupDisplayLabel(groupName) {
        switch (groupName) {
            case "locate":
                return "Locate";
            case "decision":
                return "Decide";
            case "recovery":
                return "Recover";
            default:
                return "";
        }
    }

    function getReviewActionGroupDisplayOrder(groupName, currentGroupName) {
        var baseOrder = ["locate", "decision", "recovery"];
        var defaultIndex = baseOrder.indexOf(groupName);
        if (defaultIndex === -1) {
            return baseOrder.length + 1;
        }
        if (!currentGroupName) {
            return defaultIndex + 1;
        }
        var currentIndex = baseOrder.indexOf(currentGroupName);
        if (currentIndex === -1) {
            return defaultIndex + 1;
        }
        if (groupName === currentGroupName) {
            return 1;
        }
        var displayOrder = 2;
        for (var index = 0; index < baseOrder.length; index++) {
            if (baseOrder[index] === currentGroupName) {
                continue;
            }
            if (baseOrder[index] === groupName) {
                return displayOrder;
            }
            displayOrder++;
        }
        return defaultIndex + 1;
    }

    function buildReviewActionGroupDetail(groupName, options) {
        options = options || {};
        var queueTransitionData = options.queueTransitionData || null;
        if (groupName === "decision") {
            if (queueTransitionData) {
                return queueTransitionData.statusLabel + ". " + queueTransitionData.detail;
            }
            return "Accept or reject this AI change from the current review queue.";
        }
        if (groupName === "locate") {
            return "Find this suggestion in the editor without deciding it yet.";
        }
        if (groupName === "recovery") {
            if (options.targetActionName === "undo" && options.undoSummaryText) {
                return options.undoSummaryText;
            }
            if (options.targetActionName === "redo" && options.redoSummaryText) {
                return options.redoSummaryText;
            }
            if (options.undoSummaryText || options.redoSummaryText) {
                return "Undo or redo a recent AI review decision without leaving this card.";
            }
            return "Recover from a recent AI review action without leaving this card.";
        }
        return "";
    }

    function buildReviewActionSummaryData(options) {
        options = options || {};
        var suggestion = options.suggestion || null;
        if (!suggestion) {
            return null;
        }
        var targetActionName = options.targetActionName || "";
        var currentGroupName = getReviewActionGroupName(targetActionName);
        var focusLabel = getReviewFocusActionDisplayLabel(suggestion, targetActionName);
        var groupLabel = getReviewActionGroupDisplayLabel(currentGroupName);
        if (!currentGroupName || !focusLabel || !groupLabel) {
            return null;
        }
        return {
            title: "Action handoff",
            pills: [groupLabel + " lane", "Enter focuses " + focusLabel],
            detail: buildReviewActionGroupDetail(currentGroupName, options)
        };
    }

    function buildReviewActionSummaryAriaLabel(summaryData) {
        if (!summaryData) {
            return "";
        }
        var parts = [];
        if (summaryData.title) {
            parts.push(summaryData.title);
        }
        if (summaryData.pills && summaryData.pills.length) {
            for (var pillIndex = 0; pillIndex < summaryData.pills.length; pillIndex++) {
                if (summaryData.pills[pillIndex]) {
                    parts.push(summaryData.pills[pillIndex]);
                }
            }
        }
        if (summaryData.detail) {
            parts.push(summaryData.detail);
        }
        return parts.join(". ");
    }

    function syncActiveReviewActionSummary(preferredAction) {
        var panel = editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected ? editor.__aiReviewPanel : null;
        if (!panel || !panel.querySelector) {
            return false;
        }
        var item = panel.querySelector(".rte-ai-review-item.is-active");
        var suggestion = getActiveSuggestion();
        var actionsNode = item && item.querySelector ? item.querySelector(".rte-ai-review-item-actions") : null;
        if (!item || !suggestion || !actionsNode) {
            return false;
        }
        var targetActionName = resolveReviewFocusActionName(suggestion, preferredAction || getPreferredReviewActionFocus(panel));
        var currentGroupName = getReviewActionGroupName(targetActionName);
        var typeFilter = getReviewSuggestionTypeFilter(suggestion);
        var filteredPendingSuggestions = getFilteredPendingSuggestions(typeFilter);
        if (!filteredPendingSuggestions.length && typeFilter !== "all") {
            filteredPendingSuggestions = getFilteredPendingSuggestions("all");
        }
        var queueTransitionData = buildReviewQueueTransitionData(filteredPendingSuggestions, editor.__aiActiveSuggestionId, suggestion);
        var undoableReviewDecision = suggestion.status === "pending" ? getUndoableReviewDecision() : null;
        var redoableReviewDecision = getRedoableReviewDecision();
        var isRedoTarget = !!(redoableReviewDecision && redoableReviewDecision.suggestion && redoableReviewDecision.suggestion.id === suggestion.id && suggestion.status === "pending");
        var summaryOptions = {
            suggestion: suggestion,
            targetActionName: targetActionName,
            queueTransitionData: queueTransitionData,
            undoSummaryText: undoableReviewDecision ? buildUndoDecisionSummaryText(undoableReviewDecision) : "",
            redoSummaryText: isRedoTarget ? buildRedoDecisionSummaryText(redoableReviewDecision) : ""
        };
        var summaryData = buildReviewActionSummaryData(summaryOptions);
        var summaryNode = actionsNode.querySelector ? actionsNode.querySelector(".rte-ai-review-item-action-summary") : null;
        if (summaryData) {
            if (!summaryNode) {
                summaryNode = document.createElement("span");
                summaryNode.className = "rte-ai-review-item-action-summary";
            }
            while (summaryNode.firstChild) {
                summaryNode.removeChild(summaryNode.firstChild);
            }
            summaryNode.setAttribute("aria-label", buildReviewActionSummaryAriaLabel(summaryData));
            append(summaryNode, "span", "", "rte-ai-review-item-action-summary-title", summaryData.title);
            if (summaryData.pills && summaryData.pills.length) {
                var summaryPillsNode = append(summaryNode, "span", "", "rte-ai-review-item-action-summary-pills");
                for (var summaryPillIndex = 0; summaryPillIndex < summaryData.pills.length; summaryPillIndex++) {
                    if (!summaryData.pills[summaryPillIndex]) {
                        continue;
                    }
                    append(summaryPillsNode, "span", "", "rte-ai-review-item-action-summary-pill", summaryData.pills[summaryPillIndex]);
                }
            }
            if (summaryData.detail) {
                append(summaryNode, "span", "", "rte-ai-review-item-action-summary-detail", summaryData.detail);
            }
            if (actionsNode.firstChild !== summaryNode) {
                actionsNode.insertBefore(summaryNode, actionsNode.firstChild);
            }
            actionsNode.setAttribute("aria-label", "AI review actions. " + buildReviewActionSummaryAriaLabel(summaryData));
        }
        else {
            if (summaryNode && summaryNode.parentNode) {
                summaryNode.parentNode.removeChild(summaryNode);
            }
            actionsNode.setAttribute("aria-label", "AI review actions");
        }
        var focusLabel = getReviewFocusActionDisplayLabel(suggestion, targetActionName);
        var groupNodes = actionsNode.querySelectorAll(".rte-ai-review-item-action-group");
        var orderedGroups = [];
        for (var groupIndex = 0; groupIndex < groupNodes.length; groupIndex++) {
            var groupNode = groupNodes[groupIndex];
            if (!groupNode) {
                continue;
            }
            var groupName = groupNode.getAttribute("data-rte-ai-review-action-group")
                || (groupNode.classList.contains("is-decision") ? "decision" : (groupNode.classList.contains("is-recovery") ? "recovery" : (groupNode.classList.contains("is-locate") ? "locate" : "")));
            if (!groupName) {
                continue;
            }
            var firstButton = groupNode.querySelector ? groupNode.querySelector(".rte-ai-review-action-button") : null;
            if (!firstButton) {
                var staleHeader = groupNode.querySelector ? groupNode.querySelector(".rte-ai-review-item-action-group-header") : null;
                var staleDetail = groupNode.querySelector ? groupNode.querySelector(".rte-ai-review-item-action-group-detail") : null;
                if (staleHeader && staleHeader.parentNode) {
                    staleHeader.parentNode.removeChild(staleHeader);
                }
                if (staleDetail && staleDetail.parentNode) {
                    staleDetail.parentNode.removeChild(staleDetail);
                }
                groupNode.setAttribute("data-rte-ai-review-action-group-current", "false");
                groupNode.classList.remove("is-current-lane");
                groupNode.removeAttribute("aria-label");
                continue;
            }
            orderedGroups.push(groupNode);
            var displayLabel = getReviewActionGroupDisplayLabel(groupName);
            var headerNode = groupNode.querySelector ? groupNode.querySelector(".rte-ai-review-item-action-group-header") : null;
            if (!headerNode) {
                headerNode = document.createElement("span");
                headerNode.className = "rte-ai-review-item-action-group-header";
                if (groupNode.firstChild) {
                    groupNode.insertBefore(headerNode, groupNode.firstChild);
                }
                else {
                    groupNode.appendChild(headerNode);
                }
            }
            var titleNode = headerNode.querySelector ? headerNode.querySelector(".rte-ai-review-item-action-group-title") : null;
            if (!titleNode) {
                titleNode = document.createElement("span");
                titleNode.className = "rte-ai-review-item-action-group-title";
                headerNode.appendChild(titleNode);
            }
            titleNode.textContent = displayLabel;
            var badgeNode = headerNode.querySelector ? headerNode.querySelector(".rte-ai-review-item-action-group-badge") : null;
            if (!badgeNode) {
                badgeNode = document.createElement("span");
                badgeNode.className = "rte-ai-review-item-action-group-badge";
                headerNode.appendChild(badgeNode);
            }
            var detailNode = groupNode.querySelector ? groupNode.querySelector(".rte-ai-review-item-action-group-detail") : null;
            if (!detailNode) {
                detailNode = document.createElement("span");
                detailNode.className = "rte-ai-review-item-action-group-detail";
                if (firstButton) {
                    groupNode.insertBefore(detailNode, firstButton);
                }
                else {
                    groupNode.appendChild(detailNode);
                }
            }
            var isCurrentGroup = !!currentGroupName && groupName === currentGroupName;
            var detailText = buildReviewActionGroupDetail(groupName, summaryOptions);
            groupNode.style.removeProperty("order");
            groupNode.setAttribute("data-rte-ai-review-action-group-current", isCurrentGroup ? "true" : "false");
            groupNode.classList.toggle("is-current-lane", isCurrentGroup);
            if (isCurrentGroup && focusLabel) {
                var badgeText = "Enter: " + focusLabel;
                badgeNode.textContent = badgeText;
                badgeNode.style.display = "";
                badgeNode.setAttribute("aria-label", "Current action lane. " + badgeText);
            }
            else {
                badgeNode.textContent = "";
                badgeNode.style.display = "none";
                badgeNode.removeAttribute("aria-label");
            }
            if (detailText) {
                detailNode.textContent = detailText;
                detailNode.style.display = "";
            }
            else {
                detailNode.textContent = "";
                detailNode.style.display = "none";
            }
            var groupAriaLabel = displayLabel ? displayLabel + " lane" : "";
            if (isCurrentGroup && focusLabel) {
                groupAriaLabel += (groupAriaLabel ? ". " : "") + "Current action lane. Enter focuses " + focusLabel;
            }
            if (detailText) {
                groupAriaLabel += (groupAriaLabel ? ". " : "") + detailText;
            }
            if (groupAriaLabel) {
                groupNode.setAttribute("aria-label", groupAriaLabel);
            }
            else {
                groupNode.removeAttribute("aria-label");
            }
        }
        orderedGroups.sort(function (a, b) {
            var aGroupName = a.getAttribute("data-rte-ai-review-action-group")
                || (a.classList.contains("is-decision") ? "decision" : (a.classList.contains("is-recovery") ? "recovery" : (a.classList.contains("is-locate") ? "locate" : "")));
            var bGroupName = b.getAttribute("data-rte-ai-review-action-group")
                || (b.classList.contains("is-decision") ? "decision" : (b.classList.contains("is-recovery") ? "recovery" : (b.classList.contains("is-locate") ? "locate" : "")));
            return getReviewActionGroupDisplayOrder(aGroupName, currentGroupName) - getReviewActionGroupDisplayOrder(bGroupName, currentGroupName);
        });
        for (var orderedGroupIndex = 0; orderedGroupIndex < orderedGroups.length; orderedGroupIndex++) {
            actionsNode.appendChild(orderedGroups[orderedGroupIndex]);
        }
        return true;
    }

    function syncActiveReviewEnterTarget(preferredAction) {
        var panel = editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected ? editor.__aiReviewPanel : null;
        if (!panel || !panel.querySelectorAll) {
            return false;
        }
        var item = panel.querySelector(".rte-ai-review-item.is-active");
        var suggestion = getActiveSuggestion();
        var targetActionName = resolveReviewFocusActionName(suggestion, preferredAction || getPreferredReviewActionFocus(panel));
        var groupedButtons = {};
        var buttons = panel.querySelectorAll(".rte-ai-review-action-button[data-rte-ai-review-action]");
        for (var buttonIndex = 0; buttonIndex < buttons.length; buttonIndex++) {
            var button = buttons[buttonIndex];
            if (!button || !button.getAttribute) {
                continue;
            }
            var actionName = button.getAttribute("data-rte-ai-review-action") || "";
            var isTarget = !!item && item.contains(button) && !!targetActionName && actionName === targetActionName && !button.disabled;
            var groupNode = button.closest ? button.closest(".rte-ai-review-item-action-group") : null;
            var groupName = groupNode && groupNode.classList
                ? (groupNode.classList.contains("is-decision") ? "decision" : (groupNode.classList.contains("is-recovery") ? "recovery" : (groupNode.classList.contains("is-locate") ? "locate" : "")))
                : "";
            if (isTarget && groupNode && groupName) {
                if (!groupedButtons[groupName]) {
                    groupedButtons[groupName] = [];
                }
                groupedButtons[groupName].push(button);
            }
            else if (groupNode && groupName && item && item.contains(button)) {
                if (!groupedButtons[groupName]) {
                    groupedButtons[groupName] = [];
                }
                groupedButtons[groupName].push(button);
            }
            var ariaLabel = (button.getAttribute("aria-label") || button.textContent || "").replace(/\.\s*Current Enter target\.$/i, "");
            var title = (button.getAttribute("title") || ariaLabel).replace(/\.\s*Current Enter target\.$/i, "");
            button.setAttribute("data-rte-ai-review-enter-target", isTarget ? "true" : "false");
            button.classList.toggle("is-enter-target", isTarget);
            if (isTarget) {
                button.setAttribute("data-rte-ai-review-enter-target-label", "Enter");
                if (ariaLabel && !/current enter target/i.test(ariaLabel)) {
                    button.setAttribute("aria-label", ariaLabel + ". Current Enter target.");
                }
                if (title && !/current enter target/i.test(title)) {
                    button.title = title + ". Current Enter target.";
                }
            }
            else {
                button.removeAttribute("data-rte-ai-review-enter-target-label");
                if (ariaLabel) {
                    button.setAttribute("aria-label", ariaLabel);
                }
                if (title) {
                    button.title = title;
                }
            }
        }
        if (!item) {
            return false;
        }
        for (var groupName in groupedButtons) {
            if (!groupedButtons.hasOwnProperty(groupName)) {
                continue;
            }
            var groupNode = item.querySelector(".rte-ai-review-item-action-group.is-" + groupName);
            var groupButtons = groupedButtons[groupName];
            if (!groupNode || !groupButtons || !groupButtons.length) {
                continue;
            }
            groupButtons.sort(function (a, b) {
                var aActionName = a.getAttribute("data-rte-ai-review-action") || "";
                var bActionName = b.getAttribute("data-rte-ai-review-action") || "";
                return getReviewActionButtonDisplayOrder(groupName, aActionName, targetActionName) - getReviewActionButtonDisplayOrder(groupName, bActionName, targetActionName);
            });
            for (var orderedIndex = 0; orderedIndex < groupButtons.length; orderedIndex++) {
                groupNode.appendChild(groupButtons[orderedIndex]);
            }
        }
        return true;
    }

    function getRecoveryDecisionFocusActionDisplayLabel(decision, preferredAction) {
        if (!decision || !decision.suggestion) {
            return "";
        }
        var reopenedSuggestion = {};
        for (var key in decision.suggestion) {
            if (Object.prototype.hasOwnProperty.call(decision.suggestion, key)) {
                reopenedSuggestion[key] = decision.suggestion[key];
            }
        }
        reopenedSuggestion.status = "pending";
        return getReviewFocusActionDisplayLabel(reopenedSuggestion, preferredAction);
    }

    function getReviewFocusShortcutHint(actionName, suggestion) {
        var undoContext = getUndoDecisionContext();
        var redoContext = getRedoDecisionContext();
        var decisionCopy = getReviewShortcutDecisionCopy(suggestion);
        if (actionName === "accept") {
            return appendUndoShortcutHint("Shortcuts: Enter focus " + decisionCopy.acceptLabel + " | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
        }
        if (actionName === "reject") {
            return appendUndoShortcutHint("Shortcuts: Enter focus " + decisionCopy.rejectLabel + " | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
        }
        if (actionName === "undo") {
            return appendUndoShortcutHint("Shortcuts: Enter focus " + undoContext.actionLabel + " | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
        }
        if (actionName === "redo") {
            return appendUndoShortcutHint("Shortcuts: Enter focus " + redoContext.actionLabel + " | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
        }
        if (actionName === "locate") {
            return appendUndoShortcutHint("Shortcuts: Enter focus Locate | J/K move | Home/End jump");
        }
        return appendUndoShortcutHint("Shortcuts: J/K move | Enter focus action | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | Home/End jump");
    }

    function getReviewFocusShortcutTitle(actionName, suggestion) {
        var undoContext = getUndoDecisionContext();
        var redoContext = getRedoDecisionContext();
        var decisionCopy = getReviewShortcutDecisionCopy(suggestion);
        if (actionName === "accept") {
            return appendUndoShortcutTitle("Enter focuses " + decisionCopy.acceptLabel + ". A uses " + decisionCopy.acceptLabel + ". R uses " + decisionCopy.rejectLabel + ". J/K move items. Home/End jump.");
        }
        if (actionName === "reject") {
            return appendUndoShortcutTitle("Enter focuses " + decisionCopy.rejectLabel + ". A uses " + decisionCopy.acceptLabel + ". R uses " + decisionCopy.rejectLabel + ". J/K move items. Home/End jump.");
        }
        if (actionName === "undo") {
            return appendUndoShortcutTitle("Enter focuses " + undoContext.actionLabel + ". A uses " + decisionCopy.acceptLabel + ". R uses " + decisionCopy.rejectLabel + ". J/K move items. Home/End jump.");
        }
        if (actionName === "redo") {
            return appendUndoShortcutTitle("Enter focuses " + redoContext.actionLabel + ". A uses " + decisionCopy.acceptLabel + ". R uses " + decisionCopy.rejectLabel + ". J/K move items. Home/End jump.");
        }
        if (actionName === "locate") {
            return appendUndoShortcutTitle("Enter focuses Locate. J/K move items. Home/End jump.");
        }
        return appendUndoShortcutTitle("Enter focuses action. A uses " + decisionCopy.acceptLabel + ". R uses " + decisionCopy.rejectLabel + ". J/K move items. Home/End jump.");
    }

    function getReviewPanelShortcutHint(suggestion, preferredAction) {
        return getReviewFocusShortcutHint(resolveReviewFocusActionName(suggestion, preferredAction), suggestion);
    }

    function getReviewPanelShortcutTitle(suggestion, preferredAction) {
        return getReviewFocusShortcutTitle(resolveReviewFocusActionName(suggestion, preferredAction), suggestion);
    }

    function getReviewControlLabel(control) {
        if (!control || !control.getAttribute) {
            return "this control";
        }
        var label = control.getAttribute("data-rte-ai-review-shortcut-label")
            || control.getAttribute("aria-label")
            || control.innerText
            || control.textContent
            || control.title
            || control.getAttribute("data-rte-ai-review-focus-key")
            || "this control";
        return String(label || "this control").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "") || "this control";
    }

    function getReviewControlShortcutTitle(control) {
        var decisionCopy = getReviewShortcutDecisionCopy(getActiveSuggestion());
        return appendUndoShortcutTitle("Enter activates " + getReviewControlLabel(control) + ". A uses " + decisionCopy.acceptLabel + ". R uses " + decisionCopy.rejectLabel + ". J/K move items. Home/End jump.");
    }

    function getReviewControlShortcutHint(control) {
        var decisionCopy = getReviewShortcutDecisionCopy(getActiveSuggestion());
        return appendUndoShortcutHint("Shortcuts: Enter " + getReviewControlLabel(control) + " | A " + decisionCopy.acceptHint + " | R " + decisionCopy.rejectHint + " | J/K move | Home/End jump");
    }

    function getDefaultReviewActionName(suggestion) {
        if (!suggestion) {
            return "";
        }
        var redoable = getRedoableReviewDecision();
        if (suggestion.status === "pending" && redoable && redoable.suggestion && redoable.suggestion.id === suggestion.id) {
            return "redo";
        }
        return suggestion.status === "pending" ? "accept" : "locate";
    }

    function renderReviewShortcutDisplayContent(node, text) {
        if (!node) {
            return;
        }
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
        if (!text) {
            return;
        }
        var rawText = String(text || "");
        var prefixMatch = rawText.match(/^Shortcuts:\s*/i);
        var ownerDocument = node.ownerDocument || document;
        var contentText = prefixMatch ? rawText.substring(prefixMatch[0].length) : rawText;
        if (prefixMatch) {
            var label = ownerDocument.createElement("span");
            label.className = "rte-ai-review-shortcuts-label";
            label.innerText = "Shortcuts:";
            node.appendChild(label);
            node.appendChild(ownerDocument.createTextNode(" "));
        }
        var pieces = contentText.split(/(\s+\|\s+|\s+-\s+)/);
        for (var pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
            var piece = pieces[pieceIndex];
            if (!piece) {
                continue;
            }
            if (/^\s+[\|\-]\s+$/.test(piece)) {
                var separator = ownerDocument.createElement("span");
                separator.className = "rte-ai-review-shortcuts-separator";
                separator.innerText = piece.replace(/^\s+|\s+$/g, "");
                node.appendChild(separator);
                continue;
            }
            var segment = ownerDocument.createElement("span");
            segment.className = "rte-ai-review-shortcuts-segment";
            var segmentText = piece.replace(/^\s+|\s+$/g, "");
            var firstSpace = segmentText.indexOf(" ");
            if (firstSpace > 0) {
                var keyNode = ownerDocument.createElement("span");
                keyNode.className = "rte-ai-review-shortcuts-key";
                keyNode.innerText = segmentText.substring(0, firstSpace);
                segment.appendChild(keyNode);
                segment.appendChild(ownerDocument.createTextNode(" "));
                var copyNode = ownerDocument.createElement("span");
                copyNode.className = "rte-ai-review-shortcuts-copy";
                copyNode.innerText = segmentText.substring(firstSpace + 1);
                segment.appendChild(copyNode);
            }
            else {
                segment.innerText = segmentText;
            }
            node.appendChild(segment);
        }
    }

    function applyReviewShortcutDisplayState(node, stateName) {
        if (!node) {
            return;
        }
        var activeState = stateName || "";
        if (activeState) {
            node.setAttribute("data-rte-ai-review-shortcut-action", activeState);
        }
        else {
            node.removeAttribute("data-rte-ai-review-shortcut-action");
        }
        node.classList.remove("is-action-focused");
        node.classList.remove("is-card-focused");
        node.classList.remove("is-panel-focused");
        node.classList.remove("is-control-focused");
        if (activeState === "card") {
            node.classList.add("is-card-focused");
        }
        else if (activeState === "panel") {
            node.classList.add("is-panel-focused");
        }
        else if (activeState === "control") {
            node.classList.add("is-control-focused");
        }
        else if (activeState) {
            node.classList.add("is-action-focused");
        }
    }

    function syncActiveReviewShortcutModule(text, stateName) {
        var panel = editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected ? editor.__aiReviewPanel : null;
        if (!panel || !panel.querySelector) {
            return false;
        }
        var item = panel.querySelector(".rte-ai-review-item.is-active");
        var actionsNode = item && item.querySelector ? item.querySelector(".rte-ai-review-item-actions") : null;
        var moduleNode = actionsNode && actionsNode.querySelector ? actionsNode.querySelector(".rte-ai-review-item-shortcuts") : null;
        if (!item || !actionsNode || !text) {
            if (moduleNode && moduleNode.parentNode) {
                moduleNode.parentNode.removeChild(moduleNode);
            }
            return false;
        }
        if (!moduleNode) {
            moduleNode = document.createElement("div");
            moduleNode.className = "rte-ai-review-item-shortcuts";
        }
        var titleNode = moduleNode.querySelector ? moduleNode.querySelector(".rte-ai-review-item-shortcuts-title") : null;
        if (!titleNode) {
            titleNode = document.createElement("span");
            titleNode.className = "rte-ai-review-item-shortcuts-title";
            moduleNode.appendChild(titleNode);
        }
        titleNode.textContent = "Keyboard guide";
        var bodyNode = moduleNode.querySelector ? moduleNode.querySelector(".rte-ai-review-item-shortcuts-body") : null;
        if (!bodyNode) {
            bodyNode = document.createElement("div");
            bodyNode.className = "rte-ai-review-shortcuts rte-ai-review-item-shortcuts-body";
            moduleNode.appendChild(bodyNode);
        }
        renderReviewShortcutDisplayContent(bodyNode, text || "");
        applyReviewShortcutDisplayState(bodyNode, stateName);
        var ariaText = String(text || "").replace(/^Shortcuts:\s*/i, "");
        moduleNode.setAttribute("aria-label", ariaText ? "Keyboard guide. " + ariaText : "Keyboard guide");
        var summaryNode = actionsNode.querySelector ? actionsNode.querySelector(".rte-ai-review-item-action-summary") : null;
        if (summaryNode && summaryNode.parentNode === actionsNode) {
            if (summaryNode.nextSibling !== moduleNode) {
                if (summaryNode.nextSibling) {
                    actionsNode.insertBefore(moduleNode, summaryNode.nextSibling);
                }
                else {
                    actionsNode.appendChild(moduleNode);
                }
            }
        }
        else if (actionsNode.firstChild !== moduleNode) {
            if (actionsNode.firstChild) {
                actionsNode.insertBefore(moduleNode, actionsNode.firstChild);
            }
            else {
                actionsNode.appendChild(moduleNode);
            }
        }
        return true;
    }

    function setReviewShortcutDisplay(text, stateName) {
        var node = editor.__aiReviewShortcutDisplayNode;
        if (!node) {
            return;
        }
        renderReviewShortcutDisplayContent(node, text || "");
        applyReviewShortcutDisplayState(node, stateName);
        syncActiveReviewShortcutModule(text || "", stateName);
    }

    function updateReviewShortcutDisplay(actionName) {
        var activeAction = actionName || "";
        setReviewShortcutDisplay(getReviewActionShortcutHint(activeAction, getActiveSuggestion()), activeAction);
        syncActiveReviewActionSummary(activeAction);
        syncActiveReviewEnterTarget(activeAction);
        updateVisibleReviewCondensedPreviewOpenHints();
        updateVisibleInlineReviewFocusHints();
    }

    function updateReviewCardShortcutDisplay(suggestion) {
        var preferredAction = getPreferredReviewActionFocus();
        setReviewShortcutDisplay(getReviewCardShortcutHint(suggestion, preferredAction), "card");
        syncActiveReviewActionSummary(preferredAction);
        syncActiveReviewEnterTarget(preferredAction);
        updateVisibleReviewCondensedPreviewOpenHints();
        updateVisibleInlineReviewFocusHints();
    }

    function updateReviewPanelShortcutDisplay(suggestion, preferredAction) {
        var resolvedPreferredAction = preferredAction || getPreferredReviewActionFocus();
        setReviewShortcutDisplay(getReviewPanelShortcutHint(suggestion, resolvedPreferredAction), "panel");
        syncActiveReviewActionSummary(resolvedPreferredAction);
        syncActiveReviewEnterTarget(resolvedPreferredAction);
        updateVisibleReviewCondensedPreviewOpenHints();
        updateVisibleInlineReviewFocusHints();
    }

    function updateReviewControlShortcutDisplay(control) {
        setReviewShortcutDisplay(getReviewControlShortcutHint(control), "control");
        syncActiveReviewActionSummary(getPreferredReviewActionFocus());
        syncActiveReviewEnterTarget(getPreferredReviewActionFocus());
        updateVisibleReviewCondensedPreviewOpenHints();
        updateVisibleInlineReviewFocusHints();
    }

    function getReviewShortcutDisplayId() {
        if (!editor.__aiReviewShortcutDisplayId) {
            editor.__aiReviewShortcutDisplayId = "rte-ai-review-shortcuts-" + String(Math.floor(Math.random() * 1000000000));
        }
        return editor.__aiReviewShortcutDisplayId;
    }

    function linkReviewShortcutDisplayTarget(node) {
        if (!node || !node.setAttribute) {
            return;
        }
        var ids = [getReviewShortcutDisplayId()];
        var extraIds = node.getAttribute("data-rte-ai-review-extra-describedby") || "";
        if (extraIds) {
            var parts = extraIds.split(/\s+/);
            for (var i = 0; i < parts.length; i++) {
                if (parts[i] && ids.indexOf(parts[i]) < 0) {
                    ids.push(parts[i]);
                }
            }
        }
        node.setAttribute("aria-describedby", ids.join(" "));
    }

    function bindReviewControlShortcutFocus(control, typeFilter) {
        if (!control) {
            return;
        }
        var controlTag = control.tagName ? control.tagName.toUpperCase() : "";
        var isButtonLikeControl = controlTag === "BUTTON" || control.getAttribute("role") === "button";
        if (isButtonLikeControl) {
            control.setAttribute("aria-keyshortcuts", appendUndoShortcutKeys("Enter Space A R J K Home End"));
            control.title = getReviewControlShortcutTitle(control);
        }
        var previousOnFocus = control.onfocus;
        control.onfocus = function (e) {
            linkReviewShortcutDisplayTarget(control);
            if (isButtonLikeControl) {
                updateReviewControlShortcutDisplay(control);
            }
            else {
                updateReviewPanelShortcutDisplay();
            }
            if (previousOnFocus) {
                previousOnFocus.call(this, e);
            }
        };
        if (!isButtonLikeControl) {
            return;
        }
        control.onkeydown = function (e) {
            var key = (e.key || "").toLowerCase();
            var handled = false;
            var boundaryDirection = "";
            if (key === "a") {
                handled = runReviewShortcutAction(typeFilter, "accept", { focusAction: getPreferredReviewActionFocus() });
            }
            else if (key === "r") {
                handled = runReviewShortcutAction(typeFilter, "reject", { focusAction: getPreferredReviewActionFocus() });
            }
            else if (key === "u" && e.shiftKey && hasRedoableReviewShortcut()) {
                handled = redoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
            }
            else if (key === "u" && hasUndoableReviewShortcut()) {
                handled = undoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
            }
            else if (e.key === "ArrowDown" || key === "j") {
                boundaryDirection = "next";
                var nextSuggestionId = getNextPendingSuggestionId(typeFilter, editor.__aiActiveSuggestionId);
                handled = !!(nextSuggestionId && activateReviewSuggestionWithDefaultActionFocus(nextSuggestionId, {
                    focusPanel: true,
                    focusAction: getPreferredReviewActionFocus()
                }));
            }
            else if (e.key === "ArrowUp" || key === "k") {
                boundaryDirection = "previous";
                var previousSuggestionId = getPreviousPendingSuggestionId(typeFilter, editor.__aiActiveSuggestionId);
                handled = !!(previousSuggestionId && activateReviewSuggestionWithDefaultActionFocus(previousSuggestionId, {
                    focusPanel: true,
                    focusAction: getPreferredReviewActionFocus()
                }));
            }
            else if (e.key === "Home") {
                boundaryDirection = "first";
                var firstSuggestionId = getReviewTargetSuggestionId(typeFilter);
                handled = !!(firstSuggestionId && activateReviewSuggestionWithDefaultActionFocus(firstSuggestionId, {
                    focusPanel: true,
                    focusAction: getPreferredReviewActionFocus()
                }));
            }
            else if (e.key === "End") {
                boundaryDirection = "last";
                var pending = getFilteredPendingSuggestions(typeFilter);
                var lastSuggestionId = pending.length ? pending[pending.length - 1].id : "";
                handled = !!(lastSuggestionId && activateReviewSuggestionWithDefaultActionFocus(lastSuggestionId, {
                    focusPanel: true,
                    focusAction: getPreferredReviewActionFocus()
                }));
            }
            if (handled || boundaryDirection) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (!handled && boundaryDirection) {
                announceReviewStatus(buildInlineQueueBoundaryAnnouncement(editor.__aiActiveSuggestionId, boundaryDirection));
            }
        };
    }

    function bindReviewActionButtonNavigation(button, typeFilter, suggestionId, actionName) {
        if (!button) {
            return;
        }
        button.setAttribute("aria-keyshortcuts", getReviewActionShortcutKeys(actionName));
        button.title = getReviewActionShortcutTitle(actionName, findSuggestionById(suggestionId), button.getAttribute("aria-label") || button.textContent || "");
        button.onfocus = function () {
            editor.__aiLastReviewActionFocus = actionName || "";
            linkReviewShortcutDisplayTarget(button);
            updateReviewShortcutDisplay(actionName);
        };
        button.onkeydown = function (e) {
            var key = (e.key || "").toLowerCase();
            var handled = false;
            var boundaryDirection = "";
            if (key === "a") {
                handled = applyReviewDecision(suggestionId, "accept", { focusAction: getPreferredReviewActionFocus() });
            }
            else if (key === "r") {
                handled = applyReviewDecision(suggestionId, "reject", { focusAction: getPreferredReviewActionFocus() });
            }
            else if (key === "u" && e.shiftKey && hasRedoableReviewShortcut()) {
                handled = redoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
            }
            else if (key === "u" && hasUndoableReviewShortcut()) {
                handled = undoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
            }
            else if (e.key === "ArrowDown" || key === "j") {
                boundaryDirection = "next";
                handled = navigateReviewActionFocus(typeFilter, suggestionId, actionName, "next");
            }
            else if (e.key === "ArrowUp" || key === "k") {
                boundaryDirection = "previous";
                handled = navigateReviewActionFocus(typeFilter, suggestionId, actionName, "previous");
            }
            else if (e.key === "Home") {
                boundaryDirection = "first";
                handled = navigateReviewActionFocus(typeFilter, suggestionId, actionName, "first");
            }
            else if (e.key === "End") {
                boundaryDirection = "last";
                handled = navigateReviewActionFocus(typeFilter, suggestionId, actionName, "last");
            }
            if (handled || boundaryDirection) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (!handled && boundaryDirection) {
                announceReviewStatus(buildInlineQueueBoundaryAnnouncement(suggestionId, boundaryDirection));
            }
        };
    }

    function previewReviewEmptySuggestionTarget(suggestionId) {
        clearPreviewStateIfMissing();
        var suggestion = suggestionId ? findSuggestionById(suggestionId) : null;
        var wrapper = suggestion ? getSuggestionWrapper(suggestion.id) : null;
        if (!suggestion || suggestion.status !== "pending" || !wrapper) {
            return false;
        }
        setActiveSuggestionId(suggestion.id, { preserveEmptyPreview: true });
        if (wrapper.scrollIntoView) {
            wrapper.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        }
        wrapper.classList.add("is-focused");
        if (editor.__aiReviewEmptyPreviewTimer) {
            clearTimeout(editor.__aiReviewEmptyPreviewTimer);
        }
        editor.__aiReviewEmptyPreviewTimer = setTimeout(function () {
            if (wrapper && wrapper.classList) {
                wrapper.classList.remove("is-focused");
            }
        }, 1200);
        return true;
    }

    function getVisibleTopChromeOffset(shell) {
        if (!document || !document.querySelectorAll || !window) {
            return 0;
        }
        var nodes;
        try {
            nodes = document.querySelectorAll("header, nav, [data-rte-ai-sticky-offset], [data-rte-sticky-offset], .topbar, .topnav, .site-header, .navbar, [class*='SiteHeader'], [class*='site-header']");
        } catch (e) {
            return 0;
        }
        var viewportLimit = Math.min(window.innerHeight || 900, 320);
        var maxBottom = 0;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (!node || node === shell || (shell && shell.contains && shell.contains(node))) {
                continue;
            }
            var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
            if (!rect || rect.height < 8 || rect.width < 80) {
                continue;
            }
            if (rect.top > 24 || rect.bottom <= 0 || rect.bottom > viewportLimit) {
                continue;
            }
            var style = window.getComputedStyle ? window.getComputedStyle(node) : null;
            if (style && (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") <= 0.01)) {
                continue;
            }
            maxBottom = Math.max(maxBottom, rect.bottom);
        }
        return Math.max(0, Math.ceil(maxBottom));
    }

    function syncReviewPanelTopChromeOffset(shell) {
        if (!shell || !shell.style) {
            return;
        }
        var offset = getVisibleTopChromeOffset(shell);
        if (offset > 0) {
            shell.style.setProperty("--rte-ai-detected-top-chrome", offset + "px");
        } else {
            shell.style.removeProperty("--rte-ai-detected-top-chrome");
        }
    }

    function closeReviewPanel() {
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.parentNode) {
            editor.__aiReviewPanel.parentNode.removeChild(editor.__aiReviewPanel);
        }
        if (editor.__aiReviewShell && editor.__aiReviewShell.classList) {
            editor.__aiReviewShell.classList.remove("rte-ai-review-host");
        }
        if (editor.__aiReviewShell && editor.__aiReviewShell.style) {
            editor.__aiReviewShell.style.minHeight = typeof editor.__aiReviewOriginalMinHeight === "string"
                ? editor.__aiReviewOriginalMinHeight
                : "";
            editor.__aiReviewShell.style.removeProperty("--rte-ai-detected-top-chrome");
        }
        editor.__aiReviewPanel = null;
        editor.__aiReviewSubtitleNode = null;
        editor.__aiReviewSyncBadgeNode = null;
        editor.__aiReviewSyncButton = null;
        editor.__aiLastReviewActionFocus = "";
        editor.__aiReviewShell = null;
        editor.__aiReviewOriginalMinHeight = null;
        editor.__aiLastReviewEmptyAnnouncement = "";
        if (editor.__aiReviewEmptyPreviewTimer) {
            clearTimeout(editor.__aiReviewEmptyPreviewTimer);
            editor.__aiReviewEmptyPreviewTimer = null;
        }
        clearQueueOpenedSuggestion({ skipUpdate: true, skipRender: true });
        if (editor.__aiReviewEmptyPreviewSuggestionId) {
            setActiveSuggestionId(null);
        }
        editor.__aiReviewPrimaryEmptyAction = null;
        editor.__aiReviewMoveEmptyPreviewFocus = null;
    }

    function openReviewPanel(options) {
        options = options || {};
        closeChatPanel();
        refreshRemoteReviewState(true);
        return renderReviewPanel(!!options.focusPanel);
    }

    function toggleReviewPanel(options) {
        if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) {
            closeReviewPanel();
            return false;
        }
        return openReviewPanel(options);
    }

    // 2026-05-08: redesigned AI Review window. After several rounds of CSS
    // polish kept hitting "messy / too long / too plain" feedback, the root
    // cause was the legacy renderer emitting ~12 distinct sections (queue
    // overview, status pills row, progress bar, summary stat boxes, filter
    // group cards, keyboard lane, recovery zone, next-queue zone, utility
    // zone, exchange banners, queue transition cards, recovery handoff).
    // This V2 path replaces all of that with a flat 4-zone panel:
    //
    //   1. Header (icon + "AI Review" + count badge + close)
    //   2. Toolbar (type filter + Show resolved + Accept all + Reject all)
    //   3. Body (empty state OR sorted list of items)
    //   4. Each item is a single card; click it to expand inline with
    //      before/after compare + Why card + Locate / Accept / Reject.
    //
    // Reuses existing data + handlers (getSuggestionStore, getReviewState,
    // applyReviewDecision, locateSuggestion, accept/rejectPending...
    // ByType) so no behavioural change. Customers who depend on the legacy
    // tree can flip it back via:
    //   RTE_DefaultConfig.aiToolkitReviewLegacyLayout = true
    // 2026-05-08: inline SVG icon library used by the V2 panel. Each entry is
    // a self-contained SVG string that inherits hue from `currentColor`, so
    // CSS controls the colour per button state (hover, disabled, accept,
    // reject, etc.). Stroke 2 px / lucide-style proportions.
    var REVIEW_V2_ICONS = {
        eyeOn: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
        eyeOff: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>',
        checkAll: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 13l4 4L14 8"/><path d="M10 13l4 4L22 8"/></svg>',
        check: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 12 10 18 20 6"/></svg>',
        x: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>',
        target: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
        bulb: '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/></svg>',
        arrowRight: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>',
        // 2026-05-08 family-pack additions used by AI Chat composer + Ask AI
        // dialog. Keeps the icon vocabulary consistent across all three AI
        // windows so users learn the visual language once.
        send: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor"/></svg>',
        sparkles: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><path d="M12 8 13.4 10.6 16 12l-2.6 1.4L12 16l-1.4-2.6L8 12l2.6-1.4L12 8z" fill="currentColor"/></svg>',
        refresh: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10"/></svg>',
        external: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
        trash: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
        // 2026-05-08 second batch — used for scope toggles, tabs, dropdowns,
        // and dialog headers across all three AI windows.
        cursorText: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4h2a3 3 0 0 1 3 3v0a3 3 0 0 0 3 3h0M9 20h2a3 3 0 0 0 3-3v0a3 3 0 0 1 3-3h0"/><line x1="11" y1="4" x2="11" y2="20"/></svg>',
        document: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
        inbox: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
        history: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/><polyline points="12 7 12 12 15 14"/></svg>',
        filter: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
        bot: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="14" r="1.3" fill="currentColor"/><circle cx="15" cy="14" r="1.3" fill="currentColor"/><line x1="12" y1="4" x2="12" y2="8"/><circle cx="12" cy="3" r="1.2" fill="currentColor"/><line x1="4" y1="13" x2="2" y2="13"/><line x1="22" y1="13" x2="20" y2="13"/></svg>',
        chat: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        wand: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4V2M15 14v-2M8 9h2M20 9h2M17.8 11.8L19 13M15 9h0M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5"/></svg>',
        // 2026-05-08 third batch — quick-start chip tones + Send spinner.
        list: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
        globe: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
        heading: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4v16M18 4v16M6 12h12"/></svg>',
        plus: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
        pencil: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
        spinner: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" class="rte-ai-spinner-svg"><path d="M12 3a9 9 0 1 0 9 9" /></svg>',
        // 2026-05-08 (v20260508t): kebab glyph for the "More" toggle that
        // hides alternative apply paths on chat messages and the Ask AI
        // dialog, so the default surface only shows Copy / Apply / Discard.
        more: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg>',
        // 2026-06-03 (v20260603a): clipboard glyph for the Ask AI dialog
        // result corner — Pass 50 adds a real "copy AI output to system
        // clipboard" affordance next to "Edit prompt". Pre-pass the only
        // copy was the apply-row icon-only Copy button which writes the
        // result back into the SOURCE field for chain-refinement; there
        // was no one-click way to grab the AI suggestion for use outside
        // the editor. Same shape Notion AI / Claude / ChatGPT ship — a
        // tiny clipboard pill in the result corner that copies the text
        // and briefly flips to a check glyph as confirmation.
        clipboard: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="3" width="8" height="3" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>',
        // 2026-05-20 (v20260520e) — Pass 58: refine-chip iconography. Pre-pass
        // the three iteration chips (Try again / Shorter / Longer) plus Why
        // disclosure were text-only pills, so the eye had to read each label
        // even on the third visit. Notion AI / Claude inline / Tiptap AI
        // bubble all prefix their refine chips with a 12-13px glyph so the
        // chip is recognised at a glance (↻ ↘ ↗ ?). Reusing the existing
        // `refresh` glyph for "Try again" + three new glyphs below covers
        // the four chips.
        shrink: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        expand: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        info: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="1" fill="currentColor"/></svg>'
    };

    // Map a quick-start prompt's tone to an icon key. Falls back to wand.
    function getChatPromptToneIconKey(prompt) {
        if (!prompt) return "wand";
        var tone = (prompt.tone || prompt.intent || prompt.id || "").toLowerCase();
        if (tone.indexOf("summar") !== -1) return "list";
        if (tone.indexOf("proofread") !== -1 || tone.indexOf("review") !== -1) return "pencil";
        if (tone.indexOf("translate") !== -1 || tone.indexOf("language") !== -1) return "globe";
        if (tone.indexOf("heading") !== -1 || tone.indexOf("structure") !== -1 || tone.indexOf("outline") !== -1) return "heading";
        if (tone.indexOf("expand") !== -1 || tone.indexOf("support") !== -1 || tone.indexOf("add") !== -1) return "plus";
        return "wand";
    }

    // Replace a button's text content with an [icon, label] pair so CSS can
    // size them via flex children. Idempotent: safe to call after an
    // `append(..., text)` that already wrote textContent.
    function setReviewV2ButtonContent(btn, iconKey, label) {
        if (!btn) return;
        btn.textContent = "";
        if (iconKey && REVIEW_V2_ICONS[iconKey]) {
            var iconSpan = btn.ownerDocument.createElement("span");
            iconSpan.className = "rte-ai-review-v2-action-icon";
            iconSpan.setAttribute("aria-hidden", "true");
            iconSpan.innerHTML = REVIEW_V2_ICONS[iconKey];
            btn.appendChild(iconSpan);
        }
        if (label) {
            var labelSpan = btn.ownerDocument.createElement("span");
            labelSpan.className = "rte-ai-review-v2-action-label";
            labelSpan.textContent = label;
            btn.appendChild(labelSpan);
        }
    }

    function renderReviewPanelV2(focusPanel) {
        var shell = getEditorShell();
        if (!shell) return false;

        var state = getReviewState();
        var suggestions = getSuggestionStore().slice();
        var counts = getSuggestionCounts();
        var typeOptions = getReviewTypeOptions(suggestions);
        var typeFilter = state.typeFilter || "all";
        var hasCurrentFilter = false;
        for (var ti = 0; ti < typeOptions.length; ti++) {
            if (typeOptions[ti].value === typeFilter) { hasCurrentFilter = true; break; }
        }
        if (!hasCurrentFilter) {
            typeFilter = "all";
            state.typeFilter = "all";
        }
        var hasOpen = counts.pending > 0 || counts.stale > 0;
        // Tab state: "pending" (default), "resolved", "all". Persisted on
        // the review state so tab choice survives across renders.
        var activeTab = state.activeTab || "pending";
        if (activeTab !== "pending" && activeTab !== "resolved" && activeTab !== "all") {
            activeTab = "pending";
        }
        // If the queue auto-completes, jump the user to Resolved so they
        // see what just landed instead of an empty Pending state.
        if (activeTab === "pending" && !hasOpen && counts.total > 0) {
            activeTab = "resolved";
            state.activeTab = "resolved";
        }
        var pendingCountForTabs = counts.pending + counts.stale;
        var resolvedCountForTabs = counts.accepted + counts.rejected;

        closeReviewPanel();
        editor.__aiReviewOriginalMinHeight = shell.style ? (shell.style.minHeight || "") : "";
        shell.classList.add("rte-ai-review-host");
        syncReviewPanelTopChromeOffset(shell);
        if (shell.style) {
            var desiredHeight = window.innerWidth <= 900 ? 460 : 520;
            shell.style.minHeight = Math.max(shell.offsetHeight || 0, desiredHeight) + "px";
        }
        editor.__aiReviewShell = shell;

        var panel = append(shell, "div", "", "rte-ai-review-panel rte-ai-review-v2");
        panel.setAttribute("role", "complementary");
        panel.setAttribute("aria-label", config.text_aireview || "AI Review");
        panel.tabIndex = -1;
        editor.__aiReviewPanel = panel;
        panel.onkeydown = function (e) {
            if (e.key === "Escape") {
                e.preventDefault();
                closeReviewPanel();
                editor.focus();
            }
        };

        // Header
        var header = append(panel, "div", "", "rte-ai-review-v2-header");
        var iconWrap = append(header, "span", "", "rte-ai-review-v2-icon");
        iconWrap.innerHTML = config.svgCode_aiassist_review || config.svgCode_aiassist || "";
        append(header, "div", "", "rte-ai-review-v2-title", config.text_aireview || "AI Review");
        // Pending count moved into the "To review" tab badge below; the
        // header pill would have duplicated that signal.
        var closeBtn = append(header, "button", "", "rte-ai-review-v2-close");
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "Close AI review");
        closeBtn.title = "Close";
        closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
        closeBtn.onclick = function () {
            closeReviewPanel();
            editor.focus();
        };

        // Tab strip: Pending (n) · Resolved (n). Two clear modes — review
        // queue vs. decision history — replaces the older "Show resolved"
        // toggle which mixed both states into one list.
        var tabs = append(panel, "div", "", "rte-ai-review-v2-tabs");
        tabs.setAttribute("role", "tablist");

        function makeTab(tabId, iconKey, label, count) {
            var tab = append(tabs, "button", "", "rte-ai-review-v2-tab" + (activeTab === tabId ? " is-active" : ""));
            tab.type = "button";
            tab.setAttribute("role", "tab");
            tab.setAttribute("aria-selected", activeTab === tabId ? "true" : "false");
            tab.setAttribute("data-rte-ai-review-tab", tabId);
            // Icon (inbox / clock) sits before the label for instant
            // recognisability — same pattern as Linear / Gmail tab rows.
            if (iconKey && REVIEW_V2_ICONS[iconKey]) {
                var iconSpan = tab.ownerDocument.createElement("span");
                iconSpan.className = "rte-ai-review-v2-tab-icon";
                iconSpan.setAttribute("aria-hidden", "true");
                iconSpan.innerHTML = REVIEW_V2_ICONS[iconKey];
                tab.appendChild(iconSpan);
            }
            var labelSpan = tab.ownerDocument.createElement("span");
            labelSpan.className = "rte-ai-review-v2-tab-label";
            labelSpan.textContent = label;
            tab.appendChild(labelSpan);
            if (typeof count === "number") {
                var countSpan = tab.ownerDocument.createElement("span");
                countSpan.className = "rte-ai-review-v2-tab-count" + (count > 0 ? " is-active" : "");
                countSpan.textContent = String(count);
                tab.appendChild(countSpan);
            }
            tab.onclick = function () {
                if (activeTab === tabId) return;
                getReviewState().activeTab = tabId;
                renderReviewPanelV2(true);
            };
            return tab;
        }

        makeTab("pending", "inbox", "To review", pendingCountForTabs);
        makeTab("resolved", "history", "History", resolvedCountForTabs);
        makeTab("all", "filter", "All", counts.total);

        // Toolbar: type filter + (on Pending tab only) Accept all / Reject all
        var toolbar = append(panel, "div", "", "rte-ai-review-v2-toolbar");
        if (typeOptions.length > 1) {
            var sel = append(toolbar, "select", "", "rte-ai-review-v2-select");
            for (var oi = 0; oi < typeOptions.length; oi++) {
                var opt = append(sel, "option", "", "", typeOptions[oi].label);
                opt.value = typeOptions[oi].value;
            }
            sel.value = typeFilter;
            sel.onchange = function () {
                getReviewState().typeFilter = sel.value || "all";
                renderReviewPanelV2(true);
            };
        }
        var pendingForBatch = 0;
        for (var pi = 0; pi < suggestions.length; pi++) {
            if (suggestions[pi].status === "pending" && matchesReviewTypeFilter(suggestions[pi], typeFilter)) {
                pendingForBatch++;
            }
        }
        if (activeTab === "pending") {
            // Spacer pushes the batch buttons to the right edge so the type
            // dropdown sits flush left and the destructive batch actions
            // group together at the right.
            append(toolbar, "div", "", "rte-ai-review-v2-toolbar-spacer");
            var acceptAllBtn = append(toolbar, "button", "", "rte-ai-review-v2-batch is-accept");
            acceptAllBtn.type = "button";
            acceptAllBtn.disabled = !pendingForBatch;
            setReviewV2ButtonContent(acceptAllBtn, "checkAll", "Accept all");
            acceptAllBtn.onclick = function () {
                if (acceptPendingSuggestionsByType(typeFilter)) renderReviewPanelV2(true);
            };
            var rejectAllBtn = append(toolbar, "button", "", "rte-ai-review-v2-batch is-reject");
            rejectAllBtn.type = "button";
            rejectAllBtn.disabled = !pendingForBatch;
            setReviewV2ButtonContent(rejectAllBtn, "x", "Reject all");
            rejectAllBtn.onclick = function () {
                if (rejectPendingSuggestionsByType(typeFilter)) renderReviewPanelV2(true);
            };
        }

        // Body
        var body = append(panel, "div", "", "rte-ai-review-v2-body");

        // Filter visible suggestions: type filter + active tab gate
        var visible = [];
        for (var si = 0; si < suggestions.length; si++) {
            if (suggestions[si].changeType && suggestions[si].changeType !== "ai-preview") continue;
            if (!matchesReviewTypeFilter(suggestions[si], typeFilter)) continue;
            var st = suggestions[si].status;
            var isOpen = (st === "pending" || st === "stale");
            if (activeTab === "pending" && !isOpen) continue;
            if (activeTab === "resolved" && isOpen) continue;
            // "all" tab: include everything
            visible.push(suggestions[si]);
        }
        // Pending first, resolved after; within each group, newest first.
        visible.sort(function (a, b) {
            var aOpen = a.status === "pending" || a.status === "stale";
            var bOpen = b.status === "pending" || b.status === "stale";
            if (aOpen !== bOpen) return aOpen ? -1 : 1;
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
        var activeId = editor.__aiActiveSuggestionId || "";
        var activeFound = false;
        for (var ai = 0; ai < visible.length; ai++) {
            if (visible[ai].id === activeId) { activeFound = true; break; }
        }
        if (!activeFound) {
            for (var di = 0; di < visible.length; di++) {
                if (visible[di].status === "pending" || visible[di].status === "stale") {
                    setActiveSuggestionId(visible[di].id);
                    activeId = visible[di].id;
                    break;
                }
            }
        }
        var activeV2Suggestion = findSuggestionById(activeId);
        var resolvedProgress = counts.total ? Math.max(0, Math.min(100, Math.round((resolvedCountForTabs / counts.total) * 100))) : 0;
        var queueScopeLabel = typeFilter === "all" ? "All types" : getSuggestionTypeLabel(typeFilter);
        var v2Center = append(panel, "div", "", "rte-ai-review-v2-center");
        panel.insertBefore(v2Center, body);
        v2Center.setAttribute("role", "group");
        v2Center.setAttribute("aria-label", "AI review summary");
        function appendReviewV2CenterTile(className, label, value, detail) {
            var tile = append(v2Center, "div", "", "rte-ai-review-v2-center-tile " + className);
            append(tile, "span", "", "rte-ai-review-v2-center-label", label);
            append(tile, "span", "", "rte-ai-review-v2-center-value", value);
            append(tile, "span", "", "rte-ai-review-v2-center-detail", detail);
            return tile;
        }
        appendReviewV2CenterTile("is-queue", "Queue", pendingForBatch + " pending", queueScopeLabel + (activeTab === "pending" ? " to review" : " filter"));
        appendReviewV2CenterTile("is-progress", "Progress", resolvedProgress + "% done", resolvedCountForTabs + " resolved of " + counts.total);
        var nextV2Value = activeV2Suggestion
            ? ((activeV2Suggestion.status === "pending" || activeV2Suggestion.status === "stale") ? "Review current" : "Inspect item")
            : (pendingForBatch ? "Pick an item" : (counts.total ? "All caught up" : "Start with Ask AI"));
        var nextV2Detail = activeV2Suggestion
            ? summarizeSuggestionText(activeV2Suggestion.originalText || activeV2Suggestion.resultText || "AI suggestion", 72)
            : (pendingForBatch ? "Select a card below to compare the change." : (counts.total ? "History keeps accepted and rejected changes." : "AI suggestions will appear here."));
        var nextV2Tile = appendReviewV2CenterTile("is-next", "Next step", nextV2Value, nextV2Detail);
        if (activeV2Suggestion) {
            var focusV2Button = append(nextV2Tile, "button", "", "rte-ai-review-v2-center-action", "Focus");
            focusV2Button.type = "button";
            focusV2Button.setAttribute("aria-label", "Focus the current AI review item");
            focusV2Button.onclick = function () {
                setActiveSuggestionId(activeId);
                renderReviewPanelV2(true);
            };
        }

        if (!visible.length) {
            var empty = append(body, "div", "", "rte-ai-review-v2-empty");
            if (counts.total === 0) {
                // Truly empty store — guide the user to AI Chat / Ask AI.
                append(empty, "div", "", "rte-ai-review-v2-empty-art is-prompt");
                append(empty, "div", "", "rte-ai-review-v2-empty-title", "No AI suggestions yet");
                append(empty, "div", "", "rte-ai-review-v2-empty-detail", "Ask AI or AI Chat will drop suggestions here for you to accept or reject.");
            } else if (activeTab === "pending") {
                // History exists but Pending is empty — celebrate.
                append(empty, "div", "", "rte-ai-review-v2-empty-art is-clear");
                append(empty, "div", "", "rte-ai-review-v2-empty-title", "Nothing to review");
                append(empty, "div", "", "rte-ai-review-v2-empty-detail", "You're all caught up. Switch to History to see past decisions.");
            } else if (activeTab === "resolved") {
                append(empty, "div", "", "rte-ai-review-v2-empty-title", "No history yet");
                append(empty, "div", "", "rte-ai-review-v2-empty-detail", "Decisions you make on the To review tab will show up here.");
            } else {
                append(empty, "div", "", "rte-ai-review-v2-empty-title", "No suggestions match this filter");
                append(empty, "div", "", "rte-ai-review-v2-empty-detail", "Try a different type, or pick a different tab.");
            }
        } else {
            for (var vi = 0; vi < visible.length; vi++) {
                (function (sug) {
                    var item = append(body, "div", "", "rte-ai-review-v2-item is-" + sug.status + (sug.id === activeId ? " is-active" : ""));
                    item.setAttribute("data-rte-ai-review-id", sug.id);
                    item.setAttribute("role", "group");

                    var head = append(item, "div", "", "rte-ai-review-v2-item-head");
                    append(head, "span", "", "rte-ai-review-v2-item-status is-" + sug.status, getSuggestionStatusLabel(sug.status));
                    if (sug.suggestionType && sug.suggestionType !== "other") {
                        append(head, "span", "", "rte-ai-review-v2-item-type", getSuggestionTypeLabel(sug.suggestionType));
                    }
                    if (sug.snapshot && sug.snapshot.hasSelection) {
                        append(head, "span", "", "rte-ai-review-v2-item-scope", "Selection");
                    } else {
                        append(head, "span", "", "rte-ai-review-v2-item-scope", "Document");
                    }

                    var titleText = summarizeSuggestionText(sug.originalText || sug.resultText || "AI suggestion", 120);
                    append(item, "div", "", "rte-ai-review-v2-item-title", titleText);

                    if (sug.id === activeId) {
                        if (sug.originalText && sug.resultText && normalizeText(sug.originalText) !== normalizeText(sug.resultText)) {
                            var compare = append(item, "div", "", "rte-ai-review-v2-compare");
                            var before = append(compare, "div", "", "rte-ai-review-v2-before");
                            append(before, "span", "", "rte-ai-review-v2-compare-label", "Current");
                            append(before, "div", "", "rte-ai-review-v2-compare-text", normalizeText(sug.originalText));
                            // Decorative arrow on the centerline of the
                            // grid pointing from Current -> Suggested.
                            var compareArrow = append(compare, "span", "", "rte-ai-review-v2-compare-arrow");
                            compareArrow.setAttribute("aria-hidden", "true");
                            compareArrow.innerHTML = REVIEW_V2_ICONS.arrowRight;
                            var after = append(compare, "div", "", "rte-ai-review-v2-after");
                            append(after, "span", "", "rte-ai-review-v2-compare-label", "Suggested");
                            append(after, "div", "", "rte-ai-review-v2-compare-text", normalizeText(sug.resultText));
                        }
                        if (sug.reason) {
                            var reason = append(item, "div", "", "rte-ai-review-v2-reason");
                            var reasonLabel = append(reason, "span", "", "rte-ai-review-v2-reason-label");
                            var bulbWrap = reason.ownerDocument.createElement("span");
                            bulbWrap.className = "rte-ai-review-v2-reason-icon";
                            bulbWrap.setAttribute("aria-hidden", "true");
                            bulbWrap.innerHTML = REVIEW_V2_ICONS.bulb;
                            reasonLabel.appendChild(bulbWrap);
                            var reasonLabelText = reason.ownerDocument.createElement("span");
                            reasonLabelText.textContent = "Why";
                            reasonLabel.appendChild(reasonLabelText);
                            append(reason, "span", "", "rte-ai-review-v2-reason-text", sug.reason);
                        }
                        var actions = append(item, "div", "", "rte-ai-review-v2-actions");
                        var locateBtn = append(actions, "button", "", "rte-ai-review-v2-action is-locate");
                        locateBtn.type = "button";
                        setReviewV2ButtonContent(locateBtn, "target", "Locate");
                        locateBtn.onclick = function (e) {
                            if (e && e.stopPropagation) e.stopPropagation();
                            locateSuggestion(sug.id);
                        };
                        if (sug.status === "pending" || sug.status === "stale") {
                            var acceptBtn = append(actions, "button", "", "rte-ai-review-v2-action is-accept");
                            acceptBtn.type = "button";
                            setReviewV2ButtonContent(acceptBtn, "check", "Accept");
                            acceptBtn.onclick = function (e) {
                                if (e && e.stopPropagation) e.stopPropagation();
                                applyReviewDecision(sug.id, "accept", { focusAction: "accept" });
                            };
                            var rejectBtn = append(actions, "button", "", "rte-ai-review-v2-action is-reject");
                            rejectBtn.type = "button";
                            setReviewV2ButtonContent(rejectBtn, "x", "Reject");
                            rejectBtn.onclick = function (e) {
                                if (e && e.stopPropagation) e.stopPropagation();
                                applyReviewDecision(sug.id, "reject", { focusAction: "reject" });
                            };
                        }
                    }

                    item.onclick = function (e) {
                        if (e && e.target && e.target.closest && e.target.closest(".rte-ai-review-v2-action")) return;
                        if (sug.id === activeId) return;
                        setActiveSuggestionId(sug.id);
                        renderReviewPanelV2(true);
                    };
                })(visible[vi]);
            }
        }

        if (focusPanel) {
            try { panel.focus({ preventScroll: true }); }
            catch (e) { try { panel.focus(); } catch (ee) {} }
        }
        return true;
    }

    function renderReviewPanel(focusPanel, focusOptions) {
        // 2026-05-08 redesign — see renderReviewPanelV2 above. Customers who
        // depend on the legacy queue-overview / recovery / next-queue layout
        // can opt back in via `RTE_DefaultConfig.aiToolkitReviewLegacyLayout`.
        if (config.aiToolkitReviewLegacyLayout !== true) {
            return renderReviewPanelV2(focusPanel);
        }
        focusOptions = focusOptions || {};
        clearPreviewStateIfMissing();
        var shell = getEditorShell();
        if (!shell) {
            return false;
        }
        var previousReviewPanel = editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected ? editor.__aiReviewPanel : null;
        var activeElement = document.activeElement;
        var activeReviewItemNode = previousReviewPanel && activeElement && activeElement.closest
            ? activeElement.closest("[data-rte-ai-review-id]")
            : null;
        var preserveReviewControlFocusKey = !!(!focusPanel
            && previousReviewPanel
            && activeElement
            && activeElement.getAttribute
            && activeElement.getAttribute("data-rte-ai-review-focus-key")
            && previousReviewPanel.contains(activeElement))
            ? (activeElement.getAttribute("data-rte-ai-review-focus-key") || "")
            : "";
        var preserveActiveReviewItemFocus = !!(!focusPanel
            && previousReviewPanel
            && activeReviewItemNode
            && activeReviewItemNode.getAttribute
            && activeReviewItemNode.getAttribute("data-rte-ai-review-id") === editor.__aiActiveSuggestionId
            && previousReviewPanel.contains(activeElement));
        var preserveActiveReviewAction = preserveActiveReviewItemFocus
            && activeElement
            && activeElement !== activeReviewItemNode
            && activeElement.getAttribute
            ? (activeElement.getAttribute("data-rte-ai-review-action") || "")
            : "";
        var requestedReviewActionFocus = focusOptions.focusAction || "";

        var reviewState = getReviewState();
        var suggestions = getSuggestionStore().slice();
        var counts = getSuggestionCounts();
        var activityNotice = getReviewActivityNotice();
        var hasOpenSuggestions = counts.pending > 0 || counts.stale > 0;
        var showResolved = reviewState.showResolved || (!hasOpenSuggestions && counts.total > 0) || !!activityNotice;
        var typeOptions = getReviewTypeOptions(suggestions);
        var pendingCountsByType = getPendingSuggestionCountsByType(suggestions);
        var typeFilter = reviewState.typeFilter || "all";
        var hasCurrentTypeFilter = false;
        for (var typeIndex = 0; typeIndex < typeOptions.length; typeIndex++) {
            if (typeOptions[typeIndex].value === typeFilter) {
                hasCurrentTypeFilter = true;
                break;
            }
        }
        if (!hasCurrentTypeFilter) {
            typeFilter = "all";
            reviewState.typeFilter = "all";
        }
        var visible = [];
        for (var i = 0; i < suggestions.length; i++) {
            // Human Track Changes entries share the ledger but render in their own UI —
            // skip them here so the AI review drawer only shows AI suggestions.
            if (suggestions[i].changeType && suggestions[i].changeType !== "ai-preview") continue;
            var isStatusVisible = showResolved || suggestions[i].status === "pending" || suggestions[i].status === "stale";
            var hasRemoteUpdate = getSuggestionRemoteUpdateCount(suggestions[i].id) > 0;
            if (isStatusVisible && (matchesReviewTypeFilter(suggestions[i], typeFilter) || hasRemoteUpdate)) {
                visible.push(suggestions[i]);
            }
        }
        visible = sortReviewSuggestions(visible);
        var filteredPendingCount = 0;
        for (var visibleIndex = 0; visibleIndex < visible.length; visibleIndex++) {
            if (visible[visibleIndex].status === "pending" && matchesReviewTypeFilter(visible[visibleIndex], typeFilter)) {
                filteredPendingCount++;
            }
        }
        var nextOverallPendingId = getNextPendingSuggestionId("all", "");
        var activeFilteredSuggestionId = getReviewTargetSuggestionId(typeFilter);
        var undoableReviewDecision = getUndoableReviewDecision();
        var redoableReviewDecision = getRedoableReviewDecision();
        setActiveSuggestionId(activeFilteredSuggestionId || null);
        var activePendingPosition = getPendingSuggestionPosition(typeFilter, activeFilteredSuggestionId);
        var nextPendingSuggestionId = getNextPendingSuggestionId(typeFilter, activeFilteredSuggestionId);

        closeReviewPanel();
        editor.__aiReviewOriginalMinHeight = shell.style ? (shell.style.minHeight || "") : "";
        shell.classList.add("rte-ai-review-host");
        syncReviewPanelTopChromeOffset(shell);
        if (shell.style) {
            var desiredHeight = window.innerWidth <= 900 ? 460 : 520;
            shell.style.minHeight = Math.max(shell.offsetHeight || 0, desiredHeight) + "px";
        }
        editor.__aiReviewShell = shell;

        var panel = append(shell, "div", "", "rte-ai-review-panel");
        panel.setAttribute("role", "complementary");
        panel.setAttribute("aria-label", config.text_aireview || "AI Review");
        panel.setAttribute("aria-keyshortcuts", appendUndoShortcutKeys("Enter Space A R J K Home End"));
        panel.tabIndex = -1;
        editor.__aiReviewPanel = panel;
        editor.__aiReviewPrimaryEmptyAction = null;
        panel.onkeydown = function (e) {
            var key = (e.key || "").toLowerCase();
            var targetTag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
            if (e.key === "Escape") {
                e.preventDefault();
                closeReviewPanel();
                editor.focus();
                return;
            }
            if (e.ctrlKey || e.metaKey || e.altKey || targetTag === "INPUT" || targetTag === "TEXTAREA" || targetTag === "SELECT" || targetTag === "BUTTON") {
                return;
            }
            if (!getReviewTargetSuggestionId(typeFilter) && editor.__aiReviewMoveEmptyPreviewFocus && (key === "arrowdown" || key === "j" || key === "arrowup" || key === "k" || key === "arrowright" || key === "arrowleft" || key === "home" || key === "end")) {
                e.preventDefault();
                if (key === "arrowdown" || key === "j" || key === "arrowright") {
                    editor.__aiReviewMoveEmptyPreviewFocus("next");
                }
                else if (key === "arrowup" || key === "k" || key === "arrowleft") {
                    editor.__aiReviewMoveEmptyPreviewFocus("previous");
                }
                else if (key === "home") {
                    editor.__aiReviewMoveEmptyPreviewFocus("first");
                }
                else if (key === "end") {
                    editor.__aiReviewMoveEmptyPreviewFocus("last");
                }
            }
            else if (key === "arrowdown" || key === "j") {
                e.preventDefault();
                var nextPanelSuggestionId = getNextPendingSuggestionId(typeFilter, editor.__aiActiveSuggestionId);
                if (nextPanelSuggestionId) {
                    activateReviewSuggestionWithDefaultActionFocus(nextPanelSuggestionId, {
                        focusPanel: true,
                        focusAction: getPreferredReviewActionFocus(panel)
                    });
                }
                else if (editor.__aiActiveSuggestionId) {
                    announceReviewStatus(buildInlineQueueBoundaryAnnouncement(editor.__aiActiveSuggestionId, "next"));
                }
            }
            else if (key === "arrowup" || key === "k") {
                e.preventDefault();
                var previousPanelSuggestionId = getPreviousPendingSuggestionId(typeFilter, editor.__aiActiveSuggestionId);
                if (previousPanelSuggestionId) {
                    activateReviewSuggestionWithDefaultActionFocus(previousPanelSuggestionId, {
                        focusPanel: true,
                        focusAction: getPreferredReviewActionFocus(panel)
                    });
                }
                else if (editor.__aiActiveSuggestionId) {
                    announceReviewStatus(buildInlineQueueBoundaryAnnouncement(editor.__aiActiveSuggestionId, "previous"));
                }
            }
            else if (key === "home") {
                e.preventDefault();
                var firstPanelSuggestionId = getReviewTargetSuggestionId(typeFilter);
                if (firstPanelSuggestionId && firstPanelSuggestionId !== editor.__aiActiveSuggestionId) {
                    activateReviewSuggestionWithDefaultActionFocus(firstPanelSuggestionId, {
                        focusPanel: true,
                        focusAction: getPreferredReviewActionFocus(panel)
                    });
                }
                else if (editor.__aiActiveSuggestionId) {
                    announceReviewStatus(buildInlineQueueBoundaryAnnouncement(editor.__aiActiveSuggestionId, "first"));
                }
            }
            else if (key === "end") {
                e.preventDefault();
                var pendingPanelSuggestions = getFilteredPendingSuggestions(typeFilter);
                var lastPanelSuggestionId = pendingPanelSuggestions.length ? pendingPanelSuggestions[pendingPanelSuggestions.length - 1].id : "";
                if (lastPanelSuggestionId && lastPanelSuggestionId !== editor.__aiActiveSuggestionId) {
                    activateReviewSuggestionWithDefaultActionFocus(lastPanelSuggestionId, {
                        focusPanel: true,
                        focusAction: getPreferredReviewActionFocus(panel)
                    });
                }
                else if (editor.__aiActiveSuggestionId) {
                    announceReviewStatus(buildInlineQueueBoundaryAnnouncement(editor.__aiActiveSuggestionId, "last"));
                }
            }
            else if (key === "enter" || key === " ") {
                e.preventDefault();
                var currentSuggestionId = getReviewTargetSuggestionId(typeFilter);
                if (currentSuggestionId) {
                    focusDefaultReviewCardAction(currentSuggestionId, getPreferredReviewActionFocus(panel));
                }
                else if (editor.__aiReviewPrimaryEmptyAction && editor.__aiReviewPrimaryEmptyAction.isConnected && !editor.__aiReviewPrimaryEmptyAction.disabled) {
                    editor.__aiReviewPrimaryEmptyAction.click();
                }
            }
            else if (key === "a") {
                e.preventDefault();
                runReviewShortcutAction(typeFilter, "accept", { focusAction: getPreferredReviewActionFocus(panel) });
            }
            else if (key === "r") {
                e.preventDefault();
                runReviewShortcutAction(typeFilter, "reject", { focusAction: getPreferredReviewActionFocus(panel) });
            }
            else if (key === "u" && e.shiftKey && redoableReviewDecision) {
                e.preventDefault();
                redoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus(panel) });
            }
            else if (key === "u" && undoableReviewDecision) {
                e.preventDefault();
                undoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus(panel) });
            }
        };

        var header = append(panel, "div", "", "rte-ai-review-header");
        var headerCopy = append(header, "div", "", "rte-ai-review-header-copy");
        var headerEyebrow = append(headerCopy, "div", "", "rte-ai-review-header-eyebrow");
        append(headerEyebrow, "span", "", "rte-ai-review-header-kicker", "Review workspace");
        append(headerEyebrow, "span", "", "rte-ai-review-header-status is-status", getReviewOverviewStatusLabel(counts, filteredPendingCount, typeFilter));
        if (typeFilter !== "all") {
            append(headerEyebrow, "span", "", "rte-ai-review-header-status is-filter", getSuggestionTypeLabel(typeFilter) + " queue");
        }
        if (activityNotice && activityNotice.count) {
            append(headerEyebrow, "span", "", "rte-ai-review-header-status is-remote", activityNotice.count + " shared");
        }
        var titleRow = append(headerCopy, "div", "", "rte-ai-review-title-row");
        var titleIcon = append(titleRow, "span", "", "rte-ai-review-title-icon");
        titleIcon.innerHTML = config.svgCode_aiassist_review || config.svgCode_aiassist || "";
        append(titleRow, "div", "", "rte-ai-review-title", config.text_aireview || "AI Review");
        if (hasRemoteReviewSync()) {
            editor.__aiReviewSyncBadgeNode = append(titleRow, "span", "", "rte-ai-review-sync-badge", "");
        }
        editor.__aiReviewSubtitleNode = append(headerCopy, "div", "", "rte-ai-review-subtitle", getReviewSyncLabel());
        var headerMeta = append(headerCopy, "div", "", "rte-ai-review-header-meta");
        if (activePendingPosition.total && activePendingPosition.index) {
            append(headerMeta, "span", "", "rte-ai-review-header-meta-pill is-current", "Item " + activePendingPosition.index + " of " + activePendingPosition.total);
        }
        if (counts.pending > 0) {
            append(headerMeta, "span", "", "rte-ai-review-header-meta-pill is-pending", (typeFilter !== "all" ? filteredPendingCount : counts.pending) + (typeFilter !== "all" ? " in this view" : " pending now"));
        }
        else if (counts.stale > 0) {
            append(headerMeta, "span", "", "rte-ai-review-header-meta-pill is-stale", counts.stale + " need refresh");
        }
        else {
            append(headerMeta, "span", "", "rte-ai-review-header-meta-pill is-complete", "Queue complete");
        }
        if (typeFilter !== "all" && counts.pending > 0 && filteredPendingCount !== counts.pending) {
            append(headerMeta, "span", "", "rte-ai-review-header-meta-pill is-total", counts.pending + " total pending");
        }
        var headerActions = append(header, "div", "", "rte-ai-review-header-actions");
        var headerGroupContext = null;
        var headerGroupMove = null;
        var headerGroupRecover = null;
        var headerUtility = append(headerActions, "div", "", "rte-ai-review-header-utility");
        if (hasRemoteReviewSync()) {
            headerGroupContext = headerGroupContext || appendReviewHeaderGroup(headerActions, "rte-ai-review-header-group is-context", "Context");
            var syncButton = append(headerGroupContext, "button", "", "secondary rte-ai-review-header-button is-sync", "Sync now");
            syncButton.type = "button";
            syncButton.setAttribute("data-rte-ai-review-focus-key", "sync-now");
            syncButton.onclick = function () {
                refreshRemoteReviewState(true);
            };
            editor.__aiReviewSyncButton = syncButton;
        }
        var latestRemoteSuggestionId = getLatestRemoteSuggestionId();
        if (latestRemoteSuggestionId && findSuggestionById(latestRemoteSuggestionId)) {
            headerGroupContext = headerGroupContext || appendReviewHeaderGroup(headerActions, "rte-ai-review-header-group is-context", "Context");
            var newestSharedButton = append(headerGroupContext, "button", "", "secondary rte-ai-review-header-button is-shared", "Newest shared");
            newestSharedButton.type = "button";
            newestSharedButton.setAttribute("data-rte-ai-review-focus-key", "newest-shared");
            newestSharedButton.setAttribute("aria-label", "Jump to the newest shared AI review update");
            newestSharedButton.onclick = function () {
                locateSuggestion(latestRemoteSuggestionId);
            };
        }
        if (activeFilteredSuggestionId) {
            headerGroupContext = headerGroupContext || appendReviewHeaderGroup(headerActions, "rte-ai-review-header-group is-context", "Context");
            var currentPendingButton = append(headerGroupContext, "button", "", "secondary rte-ai-review-header-button is-locate-current", "Locate current");
            currentPendingButton.type = "button";
            currentPendingButton.setAttribute("data-rte-ai-review-focus-key", "locate-current");
            currentPendingButton.setAttribute("aria-label", "Locate the current active AI review item in the editor");
            currentPendingButton.onclick = function () {
                locateSuggestion(activeFilteredSuggestionId);
            };
        }
        var previousPendingSuggestionId = getPreviousPendingSuggestionId(typeFilter, activeFilteredSuggestionId);
        if (previousPendingSuggestionId) {
            headerGroupMove = headerGroupMove || appendReviewHeaderGroup(headerActions, "rte-ai-review-header-group is-move", "Navigate");
            var previousPendingButton = append(headerGroupMove, "button", "", "secondary rte-ai-review-header-button is-nav", "Previous");
            previousPendingButton.type = "button";
            previousPendingButton.setAttribute("data-rte-ai-review-focus-key", "previous-pending");
            previousPendingButton.setAttribute("aria-label", "Jump to the previous pending AI review item in the current filter");
            previousPendingButton.onclick = function () {
                activateReviewSuggestionWithDefaultActionFocus(previousPendingSuggestionId, { focusPanel: true });
            };
        }
        if (nextPendingSuggestionId) {
            headerGroupMove = headerGroupMove || appendReviewHeaderGroup(headerActions, "rte-ai-review-header-group is-move", "Navigate");
            var nextPendingButton = append(headerGroupMove, "button", "", "secondary rte-ai-review-header-button is-nav", "Next pending");
            nextPendingButton.type = "button";
            nextPendingButton.setAttribute("data-rte-ai-review-focus-key", "next-pending");
            nextPendingButton.setAttribute("aria-label", "Jump to the next pending AI review item in the current filter");
            nextPendingButton.onclick = function () {
                activateReviewSuggestionWithDefaultActionFocus(nextPendingSuggestionId, { focusPanel: true });
            };
        }
        if (undoableReviewDecision) {
            var undoContext = getUndoDecisionContext(undoableReviewDecision);
            headerGroupRecover = headerGroupRecover || appendReviewHeaderGroup(headerActions, "rte-ai-review-header-group is-recover", "Recover");
            var undoButton = append(headerGroupRecover, "button", "", "secondary rte-ai-review-header-button is-undo", undoContext.actionLabel);
            undoButton.type = "button";
            undoButton.setAttribute("data-rte-ai-review-focus-key", "undo-last");
            undoButton.setAttribute("data-rte-ai-review-shortcut-label", undoContext.shortcutLabel);
            undoButton.setAttribute("aria-label", "Undo the " + undoContext.detailLabel + (undoContext.summaryText ? " for \"" + undoContext.summaryText + "\"" : "") + " and reopen it in AI Review");
            undoButton.onclick = function () {
                undoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
            };
        }
        if (redoableReviewDecision) {
            var redoContext = getRedoDecisionContext(redoableReviewDecision);
            headerGroupRecover = headerGroupRecover || appendReviewHeaderGroup(headerActions, "rte-ai-review-header-group is-recover", "Recover");
            var redoButton = append(headerGroupRecover, "button", "", "secondary rte-ai-review-header-button is-redo", redoContext.actionLabel);
            redoButton.type = "button";
            redoButton.setAttribute("data-rte-ai-review-focus-key", "redo-last");
            redoButton.setAttribute("data-rte-ai-review-shortcut-label", redoContext.shortcutLabel);
            redoButton.setAttribute("aria-label", "Redo the " + redoContext.detailLabel + (redoContext.summaryText ? " for \"" + redoContext.summaryText + "\"" : "") + " in AI Review");
            redoButton.onclick = function () {
                redoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
            };
        }
        var closeButton = append(headerUtility, "button", "", "rte-ai-panel-close-button is-review-close");
        closeButton.type = "button";
        closeButton.setAttribute("data-rte-ai-review-focus-key", "close-review");
        closeButton.setAttribute("aria-label", "Close AI review");
        closeButton.title = "Close";
        closeButton.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
        closeButton.onclick = function () {
            closeReviewPanel();
        };
        updateReviewSyncUi();

        var overviewSection = append(panel, "div", "", "rte-ai-review-stack rte-ai-review-overview");
        appendPanelSectionLabel(overviewSection, "rte-ai-review-section-label is-overview", "Queue overview");
        var reviewedCount = counts.accepted + counts.rejected + counts.stale;
        var progressPercent = counts.total ? Math.max(0, Math.min(100, Math.round((reviewedCount / counts.total) * 100))) : 0;
        var overviewHero = append(overviewSection, "div", "", "rte-ai-review-overview-hero");
        var overviewStatusRow = append(overviewHero, "div", "", "rte-ai-review-overview-status-row");
        append(overviewStatusRow, "span", "", "rte-ai-review-overview-pill is-status", getReviewOverviewStatusLabel(counts, filteredPendingCount, typeFilter));
        append(overviewStatusRow, "span", "", "rte-ai-review-overview-pill is-progress", reviewedCount + " of " + counts.total + " reviewed");
        if (typeFilter !== "all") {
            append(overviewStatusRow, "span", "", "rte-ai-review-overview-pill is-filter", getSuggestionTypeLabel(typeFilter) + " focus");
        }
        if (activityNotice && activityNotice.count) {
            append(overviewStatusRow, "span", "", "rte-ai-review-overview-pill is-remote", activityNotice.count + " shared");
        }
        append(overviewHero, "div", "", "rte-ai-review-overview-title", getReviewOverviewTitle(counts, filteredPendingCount, typeFilter, activePendingPosition));
        append(overviewHero, "div", "", "rte-ai-review-overview-detail", getReviewOverviewDetail(counts, filteredPendingCount, typeFilter, activityNotice));
        var overviewProgress = append(overviewHero, "div", "", "rte-ai-review-overview-progress");
        var overviewProgressBar = append(overviewProgress, "div", "", "rte-ai-review-overview-progress-bar");
        var overviewProgressFill = append(overviewProgressBar, "span", "", "rte-ai-review-overview-progress-fill");
        overviewProgressFill.style.width = progressPercent + "%";
        append(overviewProgress, "span", "", "rte-ai-review-overview-progress-label", progressPercent + "% complete");
        var summary = append(overviewSection, "div", "", "rte-ai-review-summary");
        append(summary, "span", "", "rte-ai-review-summary-pill is-pending", counts.pending + " pending");
        append(summary, "span", "", "rte-ai-review-summary-pill is-accepted", counts.accepted + " accepted");
        append(summary, "span", "", "rte-ai-review-summary-pill is-rejected", counts.rejected + " rejected");
        if (counts.stale) {
            append(summary, "span", "", "rte-ai-review-summary-pill is-stale", counts.stale + " stale");
        }
        if (activePendingPosition.total && activePendingPosition.index) {
            append(summary, "span", "", "rte-ai-review-summary-pill is-current", "Item " + activePendingPosition.index + " of " + activePendingPosition.total);
        }
        if (typeFilter !== "all") {
            append(summary, "span", "", "rte-ai-review-summary-pill is-filtered", getSuggestionTypeLabel(typeFilter) + " filter - " + filteredPendingCount + " pending");
        }
        if (activityNotice) {
            append(summary, "span", "", "rte-ai-review-summary-pill is-remote", activityNotice.count + " new shared");
        }
        var activeCenterSuggestion = findSuggestionById(activeFilteredSuggestionId);
        var currentQueueLabel = typeFilter === "all" ? "All queues" : getSuggestionTypeLabel(typeFilter);
        var visiblePendingLabel = typeFilter === "all" ? counts.pending : filteredPendingCount;
        var nextCenterActionLabel = activeCenterSuggestion
            ? (getReviewFocusActionDisplayLabel(activeCenterSuggestion, getPreferredReviewActionFocus(panel)) || "Review item")
            : (nextOverallPendingId ? "Open next queue" : (counts.pending ? "Choose queue" : "All clear"));
        var nextCenterDetail = activeCenterSuggestion
            ? (activePendingPosition && activePendingPosition.total && activePendingPosition.index
                ? "Item " + activePendingPosition.index + " of " + activePendingPosition.total + " in " + currentQueueLabel.toLowerCase() + "."
                : "Current suggestion is ready.")
            : (nextOverallPendingId
                ? "There are pending suggestions outside this filter."
                : (counts.pending ? "Pick a queue filter to continue." : "No pending AI suggestions remain."));
        var reviewCenter = append(overviewSection, "div", "", "rte-ai-review-center");
        reviewCenter.setAttribute("role", "group");
        reviewCenter.setAttribute("aria-label", "AI review center summary");
        function appendReviewCenterTile(className, label, value, detail) {
            var tile = append(reviewCenter, "div", "", "rte-ai-review-center-tile " + className);
            append(tile, "div", "", "rte-ai-review-center-label", label);
            append(tile, "div", "", "rte-ai-review-center-value", value);
            append(tile, "div", "", "rte-ai-review-center-detail", detail);
            return tile;
        }
        appendReviewCenterTile("is-queue", "Queue", visiblePendingLabel + " pending", currentQueueLabel + (typeFilter !== "all" && counts.pending !== filteredPendingCount ? " - " + counts.pending + " total pending" : ""));
        appendReviewCenterTile("is-progress", "Progress", progressPercent + "% done", reviewedCount + " reviewed of " + counts.total + " total");
        var nextCenterTile = appendReviewCenterTile("is-next", "Next step", nextCenterActionLabel, nextCenterDetail);
        if (activeFilteredSuggestionId || nextOverallPendingId) {
            var nextCenterButton = append(nextCenterTile, "button", "", "rte-ai-review-center-action", activeFilteredSuggestionId ? "Focus" : "Open");
            nextCenterButton.type = "button";
            nextCenterButton.setAttribute("data-rte-ai-review-focus-key", activeFilteredSuggestionId ? "center-focus-current" : "center-open-next");
            nextCenterButton.setAttribute("aria-label", activeFilteredSuggestionId ? "Focus the current AI review item" : "Open the next pending AI review queue");
            nextCenterButton.onclick = function () {
                if (activeFilteredSuggestionId) {
                    activateReviewSuggestionWithDefaultActionFocus(activeFilteredSuggestionId, {
                        focusPanel: true,
                        focusAction: getPreferredReviewActionFocus()
                    });
                }
                else if (nextOverallPendingId) {
                    reviewState.typeFilter = "all";
                    activateReviewSuggestionWithDefaultActionFocus(nextOverallPendingId, {
                        focusPanel: true,
                        focusAction: getPreferredReviewActionFocus(),
                        openedQueue: true
                    });
                }
            };
        }
        var redoDecisionSummaryText = buildRedoDecisionSummaryText(redoableReviewDecision);
        if (redoDecisionSummaryText) {
            var redoSummaryContext = getRedoDecisionContext(redoableReviewDecision);
            append(overviewSection, "div", "", "rte-ai-review-summary-detail is-redo", redoDecisionSummaryText + " Press Shift+U to " + redoSummaryContext.shortcutLabel + ".");
            var redoHistoryItems = getRedoDecisionHistorySummaries(2);
            if (redoHistoryItems.length) {
                var redoHistoryList = append(overviewSection, "div", "", "rte-ai-review-summary-history is-redo");
                append(redoHistoryList, "div", "", "rte-ai-review-summary-history-title", "Then");
                for (var redoHistoryIndex = 0; redoHistoryIndex < redoHistoryItems.length; redoHistoryIndex++) {
                    var redoHistoryItem = redoHistoryItems[redoHistoryIndex];
                    var redoHistoryRow = append(redoHistoryList, "div", "", "rte-ai-review-summary-history-item");
                    append(redoHistoryRow, "div", "", "rte-ai-review-summary-history-label", redoHistoryItem.label);
                    append(redoHistoryRow, "div", "", "rte-ai-review-summary-history-detail", redoHistoryItem.detail);
                }
            }
        }

        if (activityNotice) {
            var activityCard = append(overviewSection, "div", "", "rte-ai-review-activity-card");
            var activityCopy = append(activityCard, "div", "", "rte-ai-review-activity-copy");
            append(activityCopy, "div", "", "rte-ai-review-activity-title", activityNotice.title);
            append(activityCopy, "div", "", "rte-ai-review-activity-detail", activityNotice.detail);
            var dismissActivityButton = append(activityCard, "button", "", "secondary rte-ai-review-activity-button", "Got it");
            dismissActivityButton.type = "button";
            dismissActivityButton.setAttribute("data-rte-ai-review-focus-key", "dismiss-activity");
            dismissActivityButton.setAttribute("aria-label", "Dismiss shared AI review update notice");
            dismissActivityButton.onclick = function () {
                markReviewActivitySeen();
                renderReviewPanel(true);
            };
        }

        var navigationSection = append(panel, "div", "", "rte-ai-review-stack rte-ai-review-navigation");
        appendPanelSectionLabel(navigationSection, "rte-ai-review-section-label is-controls", "Filter and batch");
        var controls = append(navigationSection, "div", "", "rte-ai-review-controls");
        var scopeControls = null;
        if (typeOptions.length > 1) {
            scopeControls = appendReviewControlGroup(controls, "rte-ai-review-control-group is-scope", "Queue scope");
            var typeFilterSelect = append(scopeControls, "select", "", "rte-ai-review-filter-select");
            typeFilterSelect.setAttribute("data-rte-ai-review-focus-key", "type-filter");
            for (var optionIndex = 0; optionIndex < typeOptions.length; optionIndex++) {
                var typeOption = append(typeFilterSelect, "option", "", "", typeOptions[optionIndex].label);
                typeOption.value = typeOptions[optionIndex].value;
            }
            typeFilterSelect.value = typeFilter;
            typeFilterSelect.onchange = function () {
                reviewState.typeFilter = typeFilterSelect.value || "all";
                renderReviewPanel(true);
            };
        }
        var visibilityControls = appendReviewControlGroup(controls, "rte-ai-review-control-group is-visibility", "Visibility");
        var filterButton = append(visibilityControls, "button", "", "secondary rte-ai-review-control-button is-toggle-resolved", showResolved ? "Pending only" : "Show resolved");
        filterButton.type = "button";
        filterButton.setAttribute("data-rte-ai-review-focus-key", "toggle-resolved");
        filterButton.onclick = function () {
            reviewState.showResolved = !showResolved;
            renderReviewPanel(true);
        };
        var batchControls = appendReviewControlGroup(controls, "rte-ai-review-control-group is-batch", "Batch review");
        var acceptAllButton = append(batchControls, "button", "", "secondary rte-ai-review-control-button is-accept-batch", "Accept all");
        acceptAllButton.type = "button";
        acceptAllButton.setAttribute("data-rte-ai-review-focus-key", "accept-all");
        acceptAllButton.disabled = typeFilter === "all" ? !counts.pending : !filteredPendingCount;
        if (typeFilter !== "all") {
            acceptAllButton.innerText = "Accept filtered";
        }
        acceptAllButton.onclick = function () {
            if (acceptPendingSuggestionsByType(typeFilter)) {
                renderReviewPanel(true);
            }
        };
        var rejectAllButton = append(batchControls, "button", "", "secondary rte-ai-review-control-button is-reject-batch", "Reject all");
        rejectAllButton.type = "button";
        rejectAllButton.setAttribute("data-rte-ai-review-focus-key", "reject-all");
        rejectAllButton.disabled = typeFilter === "all" ? !counts.pending : !filteredPendingCount;
        if (typeFilter !== "all") {
            rejectAllButton.innerText = "Reject filtered";
        }
        rejectAllButton.onclick = function () {
            if (rejectPendingSuggestionsByType(typeFilter)) {
                renderReviewPanel(true);
            }
        };

        if (typeOptions.length > 1) {
            var quickFilters = append(scopeControls || controls, "div", "", "rte-ai-review-type-chips");
            for (var chipIndex = 0; chipIndex < typeOptions.length; chipIndex++) {
                var chipOption = typeOptions[chipIndex];
                var chipCount = pendingCountsByType[chipOption.value] || 0;
                if (chipOption.value !== "all" && chipCount === 0 && chipOption.value !== typeFilter) {
                    continue;
                }
                var chipLabel = chipOption.label + " (" + chipCount + ")";
                var chipButton = append(quickFilters, "button", "", "rte-ai-review-type-chip" + (chipOption.value === typeFilter ? " is-active" : ""), chipLabel);
                chipButton.type = "button";
                chipButton.setAttribute("data-rte-ai-review-focus-key", "type-chip-" + chipOption.value);
                chipButton.setAttribute("aria-pressed", chipOption.value === typeFilter ? "true" : "false");
                chipButton.onclick = (function (value) {
                    return function () {
                        reviewState.typeFilter = value;
                        renderReviewPanel(true);
                    };
                })(chipOption.value);
            }
        }

        appendPanelSectionLabel(navigationSection, "rte-ai-review-section-label is-shortcuts", "Keyboard lane");
        var shortcutsNode = append(navigationSection, "div", "", "rte-ai-review-shortcuts", "");
        shortcutsNode.id = getReviewShortcutDisplayId();
        editor.__aiReviewShortcutDisplayNode = shortcutsNode;
        panel.onfocus = function () {
            linkReviewShortcutDisplayTarget(panel);
            panel.title = getReviewPanelShortcutTitle(findSuggestionById(getReviewTargetSuggestionId(typeFilter)), getPreferredReviewActionFocus(panel));
            updateReviewPanelShortcutDisplay(findSuggestionById(getReviewTargetSuggestionId(typeFilter)), getPreferredReviewActionFocus(panel));
        };
        if (panel.querySelectorAll) {
            var reviewFocusControls = panel.querySelectorAll("[data-rte-ai-review-focus-key]");
            for (var reviewFocusIndex = 0; reviewFocusIndex < reviewFocusControls.length; reviewFocusIndex++) {
                bindReviewControlShortcutFocus(reviewFocusControls[reviewFocusIndex], typeFilter);
            }
        }
        if (requestedReviewActionFocus || preserveActiveReviewAction) {
            updateReviewShortcutDisplay(requestedReviewActionFocus || preserveActiveReviewAction);
        }
        else if (activeFilteredSuggestionId) {
            updateReviewCardShortcutDisplay(findSuggestionById(activeFilteredSuggestionId));
        }
        else {
            panel.title = getReviewPanelShortcutTitle(findSuggestionById(getReviewTargetSuggestionId(typeFilter)), getPreferredReviewActionFocus(panel));
            updateReviewPanelShortcutDisplay(findSuggestionById(getReviewTargetSuggestionId(typeFilter)), getPreferredReviewActionFocus(panel));
        }

        var contentSection = append(panel, "div", "", "rte-ai-review-stack rte-ai-review-content");
        appendPanelSectionLabel(contentSection, "rte-ai-review-section-label is-feed", visible.length ? "Review items" : "Recovery and next queues");
        var feed = append(contentSection, "div", "", "rte-ai-review-feed");
        if (!visible.length) {
            var emptyState = buildReviewEmptyState(counts, filteredPendingCount, typeFilter, showResolved, nextOverallPendingId, pendingCountsByType, typeOptions);
            var primaryEmptyActionLabel = "";
            var emptyHintNode = null;
            var emptyPreviewButtons = [];
            function getEmptyPrimaryActionLabel(node, fallbackLabel) {
                var parts = [fallbackLabel || ""];
                if (node && node.getAttribute) {
                    var focusLabel = node.getAttribute("data-rte-ai-empty-focus-label") || "";
                    var changeLabel = node.getAttribute("data-rte-ai-preview-change-label") || "";
                    var impactLabel = node.getAttribute("data-rte-ai-preview-impact-label") || "";
                    if (focusLabel) {
                        parts.push("focus " + focusLabel);
                    }
                    if (changeLabel) {
                        parts.push(changeLabel);
                    }
                    if (impactLabel) {
                        parts.push(impactLabel);
                    }
                }
                return parts.filter(function (part) {
                    return !!part;
                }).join(", ");
            }
            function getEmptyPreviewPosition(node) {
                var total = emptyPreviewButtons.length;
                if (!node || !total) {
                    return { index: 0, total: total };
                }
                for (var positionIndex = 0; positionIndex < total; positionIndex++) {
                    if (emptyPreviewButtons[positionIndex] === node) {
                        return { index: positionIndex + 1, total: total };
                    }
                }
                return { index: 0, total: total };
            }
            function updateEmptyStateGuidance(label) {
                var hasQueueSwitcher = emptyPreviewButtons.length > 1;
                if (emptyHintNode) {
                    emptyHintNode.innerText = buildReviewEmptyHintText(label, hasQueueSwitcher);
                }
                setReviewShortcutDisplay(buildReviewEmptyShortcutText(label, { queueSwitcher: hasQueueSwitcher }), "");
            }
            function getEmptyActionGroupInfo(action) {
                var actionId = action && action.id ? action.id : "";
                if (actionId === "go-type" || actionId === "next-overall" || actionId === "all-types") {
                    return { key: "queue", label: "Next queues" };
                }
                if (actionId === "undo-last") {
                    return { key: "recovery", label: "Recover" };
                }
                return { key: "utility", label: "More" };
            }
            function setPrimaryEmptyTarget(node, label, options) {
                options = options || {};
                for (var previewCleanupIndex = 0; previewCleanupIndex < emptyPreviewButtons.length; previewCleanupIndex++) {
                    var previewButton = emptyPreviewButtons[previewCleanupIndex];
                    previewButton.removeAttribute("data-rte-ai-primary-empty");
                    previewButton.removeAttribute("aria-current");
                    previewButton.setAttribute("aria-pressed", "false");
                    previewButton.tabIndex = -1;
                    if (previewButton.classList && previewButton.classList.contains("is-primary-target")) {
                        previewButton.classList.remove("is-primary-target");
                    }
                    if (previewButton.__aiCurrentBadge && previewButton.__aiCurrentBadge.parentNode) {
                        previewButton.__aiCurrentBadge.parentNode.removeChild(previewButton.__aiCurrentBadge);
                    }
                    previewButton.__aiCurrentBadge = null;
                    if (previewButton.__aiQueueBadge && previewButton.__aiQueueBadge.parentNode) {
                        previewButton.__aiQueueBadge.parentNode.removeChild(previewButton.__aiQueueBadge);
                    }
                    previewButton.__aiQueueBadge = null;
                }
                if (editor.__aiReviewPrimaryEmptyAction && editor.__aiReviewPrimaryEmptyAction !== node) {
                    editor.__aiReviewPrimaryEmptyAction.removeAttribute("data-rte-ai-primary-empty");
                    if (editor.__aiReviewPrimaryEmptyAction.classList && editor.__aiReviewPrimaryEmptyAction.classList.contains("is-primary-target")) {
                        editor.__aiReviewPrimaryEmptyAction.classList.remove("is-primary-target");
                    }
                }
                editor.__aiReviewPrimaryEmptyAction = node || null;
                if (node) {
                    node.setAttribute("data-rte-ai-primary-empty", "true");
                    node.setAttribute("aria-pressed", "true");
                    node.tabIndex = 0;
                    if (node.classList && node.classList.contains("rte-ai-review-empty-preview")) {
                        node.classList.add("is-primary-target");
                        node.setAttribute("aria-current", "true");
                        var currentBadgeHost = node.__aiPreviewMetaNode || (node.querySelector ? node.querySelector(".rte-ai-review-empty-preview-meta") : null);
                        if (currentBadgeHost) {
                            node.__aiCurrentBadge = append(currentBadgeHost, "span", "", "rte-ai-review-empty-preview-pill is-current", "Current");
                            var queuePosition = getEmptyPreviewPosition(node);
                            if (queuePosition.total > 1) {
                                node.__aiQueueBadge = append(currentBadgeHost, "span", "", "rte-ai-review-empty-preview-pill is-queue", "Queue " + queuePosition.index + " of " + queuePosition.total);
                            }
                        }
                    }
                }
                var previousLabel = primaryEmptyActionLabel;
                primaryEmptyActionLabel = getEmptyPrimaryActionLabel(node, label || "");
                if (node && node.getAttribute) {
                    previewReviewEmptySuggestionTarget(node.getAttribute("data-rte-ai-preview-suggestion-id") || "");
                }
                updateEmptyStateGuidance(primaryEmptyActionLabel);
                if (options.announce && primaryEmptyActionLabel && primaryEmptyActionLabel !== previousLabel) {
                    announceReviewStatus("Completion handoff moved to " + primaryEmptyActionLabel + ".");
                }
            }
            function moveEmptyPreviewFocus(direction) {
                if (emptyPreviewButtons.length < 2) {
                    return false;
                }
                var currentIndex = 0;
                for (var previewButtonIndex = 0; previewButtonIndex < emptyPreviewButtons.length; previewButtonIndex++) {
                    if (emptyPreviewButtons[previewButtonIndex] === document.activeElement || emptyPreviewButtons[previewButtonIndex] === editor.__aiReviewPrimaryEmptyAction) {
                        currentIndex = previewButtonIndex;
                        break;
                    }
                }
                var nextIndex = currentIndex;
                if (direction === "next") {
                    nextIndex = Math.min(emptyPreviewButtons.length - 1, currentIndex + 1);
                }
                else if (direction === "previous") {
                    nextIndex = Math.max(0, currentIndex - 1);
                }
                else if (direction === "first") {
                    nextIndex = 0;
                }
                else if (direction === "last") {
                    nextIndex = emptyPreviewButtons.length - 1;
                }
                if (nextIndex === currentIndex || !emptyPreviewButtons[nextIndex]) {
                    if (direction === "next" || direction === "last") {
                        announceReviewStatus("Already at the last available completion queue.");
                    }
                    else if (direction === "previous" || direction === "first") {
                        announceReviewStatus("Already at the first available completion queue.");
                    }
                    return false;
                }
                emptyPreviewButtons[nextIndex].focus();
                return true;
            }
            editor.__aiReviewMoveEmptyPreviewFocus = moveEmptyPreviewFocus;
            function handleEmptyStateAction(action) {
                if (!action) {
                    return;
                }
                if (action.id === "show-resolved") {
                    reviewState.showResolved = true;
                    renderReviewPanel(true);
                }
                else if (action.id === "go-type") {
                    reviewState.typeFilter = action.typeValue || "all";
                    var firstSuggestionId = action.suggestionId || getNextPendingSuggestionId(reviewState.typeFilter, "");
                    if (firstSuggestionId) {
                        activateReviewSuggestionWithDefaultActionFocus(firstSuggestionId, {
                            focusPanel: true,
                            focusAction: action.focusAction || getPreferredReviewActionFocus(),
                            openedQueue: true
                        });
                    }
                    else {
                        renderReviewPanel(true);
                    }
                }
                else if (action.id === "next-overall") {
                    reviewState.typeFilter = "all";
                    if (action.suggestionId) {
                        activateReviewSuggestionWithDefaultActionFocus(action.suggestionId, {
                            focusPanel: true,
                            focusAction: action.focusAction || getPreferredReviewActionFocus(),
                            openedQueue: true
                        });
                    }
                    else {
                        renderReviewPanel(true);
                    }
                }
                else if (action.id === "all-types") {
                    reviewState.typeFilter = "all";
                    renderReviewPanel(true);
                }
                else if (action.id === "undo-last") {
                    undoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
                }
                else if (action.id === "open-chat") {
                    openChatPanel({ focusComposer: true });
                }
            }
            var emptyAnnouncementKey = emptyState.title + "|" + emptyState.detail + "|" + emptyState.actions.map(function (action) {
                return action ? action.label : "";
            }).join("|");
            if (emptyState.announceMessage && editor.__aiLastReviewEmptyAnnouncement !== emptyAnnouncementKey) {
                announceReviewStatus(emptyState.announceMessage);
                editor.__aiLastReviewEmptyAnnouncement = emptyAnnouncementKey;
            }
            var emptyCard = append(feed, "div", "", "rte-ai-review-empty");
            var undoDecisionSummaryText = buildUndoDecisionSummaryText(undoableReviewDecision);
            var hasQueuePreviews = !!(emptyState.previewItems && emptyState.previewItems.length);
            var hasRecoveryState = !!undoDecisionSummaryText;
            emptyCard.classList.toggle("is-queue-complete", hasQueuePreviews);
            emptyCard.classList.toggle("is-recoverable", hasRecoveryState);
            var emptyHero = append(emptyCard, "div", "", "rte-ai-review-empty-hero");
            var emptyStatusRow = append(emptyHero, "div", "", "rte-ai-review-empty-status-row");
            append(emptyStatusRow, "span", "", "rte-ai-review-empty-status-pill " + (hasQueuePreviews ? "is-ready" : (hasRecoveryState ? "is-recovery" : "is-clear")), hasQueuePreviews ? "Queue complete" : (hasRecoveryState ? "Recovery available" : "All clear"));
            if (hasQueuePreviews) {
                append(emptyStatusRow, "span", "", "rte-ai-review-empty-status-pill is-count", emptyState.previewItems.length === 1 ? "1 next queue" : (emptyState.previewItems.length + " next queues"));
            }
            append(emptyHero, "div", "", "rte-ai-review-empty-title", emptyState.title);
            append(emptyHero, "div", "", "rte-ai-review-empty-detail", emptyState.detail);
            emptyHintNode = append(emptyHero, "div", "", "rte-ai-review-empty-hint", "");
            if (undoDecisionSummaryText) {
                var recoverySection = append(emptyCard, "div", "", "rte-ai-review-empty-zone is-recovery");
                appendPanelSectionLabel(recoverySection, "rte-ai-review-section-label is-recovery", "Recovery");
                append(recoverySection, "div", "", "rte-ai-review-empty-detail rte-ai-review-empty-undo-detail", undoDecisionSummaryText);
                var undoHistoryItems = getUndoDecisionHistorySummaries(3);
                if (undoHistoryItems.length) {
                    var undoHistoryList = append(recoverySection, "div", "", "rte-ai-review-empty-undo-history");
                    append(undoHistoryList, "div", "", "rte-ai-review-empty-undo-history-title", "Then");
                    for (var undoHistoryIndex = 0; undoHistoryIndex < undoHistoryItems.length; undoHistoryIndex++) {
                        var undoHistoryItem = undoHistoryItems[undoHistoryIndex];
                        var undoHistoryRow = append(undoHistoryList, "div", "", "rte-ai-review-empty-undo-history-item");
                        append(undoHistoryRow, "div", "", "rte-ai-review-empty-undo-history-label", undoHistoryItem.label);
                        append(undoHistoryRow, "div", "", "rte-ai-review-empty-undo-history-detail", undoHistoryItem.detail);
                    }
                }
            }
            if (emptyState.previewItems && emptyState.previewItems.length) {
                var previewSection = append(emptyCard, "div", "", "rte-ai-review-empty-zone is-next");
                appendPanelSectionLabel(previewSection, "rte-ai-review-section-label is-feed", emptyState.previewItems.length > 1 ? "Next queues" : "Next queue");
                var emptyPreviewList = append(previewSection, "div", "", "rte-ai-review-empty-previews");
                emptyPreviewList.setAttribute("role", "toolbar");
                emptyPreviewList.setAttribute("aria-label", "Next review queues");
                for (var previewIndex = 0; previewIndex < emptyState.previewItems.length; previewIndex++) {
                    var previewItem = emptyState.previewItems[previewIndex];
                    var previewTag = previewItem.typeValue ? "button" : "div";
                    var previewRow = append(emptyPreviewList, previewTag, "", "rte-ai-review-empty-preview" + (previewItem.typeValue ? " is-actionable" : ""));
                    if (previewTag === "button") {
                        previewRow.type = "button";
                        previewRow.tabIndex = -1;
                        previewRow.setAttribute("aria-pressed", "false");
                        previewRow.setAttribute("aria-setsize", String(emptyState.previewItems.length));
                        previewRow.setAttribute("aria-posinset", String(previewIndex + 1));
                        previewRow.setAttribute("aria-keyshortcuts", getReviewEmptyControlShortcutKeys({
                            queueSwitcher: emptyState.previewItems.length > 1
                        }));
                        previewRow.title = getReviewEmptyControlShortcutTitle(previewItem.actionLabel || previewItem.label || "Open next queue", {
                            focusLabel: previewItem.focusActionLabel,
                            queueSwitcher: emptyState.previewItems.length > 1
                        });
                        var previewAriaParts = [previewItem.actionLabel || previewItem.label || "Open next queue"];
                        if (previewItem.focusActionLabel) {
                            previewAriaParts.push("Focus " + previewItem.focusActionLabel);
                        }
                        if (previewItem.pendingCountLabel) {
                            previewAriaParts.push(previewItem.pendingCountLabel);
                        }
                        if (previewItem.changeLabel) {
                            previewAriaParts.push(previewItem.changeLabel);
                        }
                        if (previewItem.impactLabel) {
                            previewAriaParts.push(previewItem.impactLabel);
                        }
                        if (previewItem.scopeLabel) {
                            previewAriaParts.push(previewItem.scopeLabel);
                        }
                        if (previewItem.languageLabel) {
                            previewAriaParts.push(previewItem.languageLabel);
                        }
                        if (previewItem.text) {
                            previewAriaParts.push("Current: " + previewItem.text);
                        }
                        if (previewItem.resultText) {
                            previewAriaParts.push("Suggested: " + previewItem.resultText);
                        }
                        if (previewItem.reasonText) {
                            previewAriaParts.push("Why this next: " + previewItem.reasonText);
                        }
                        previewRow.setAttribute("aria-label", previewAriaParts.join(". "));
                        previewRow.setAttribute("data-rte-ai-primary-label", previewItem.actionLabel || previewItem.label || "Open next queue");
                        if (previewItem.focusActionLabel) {
                            previewRow.setAttribute("data-rte-ai-empty-focus-label", previewItem.focusActionLabel);
                        }
                        if (previewItem.changeLabel) {
                            previewRow.setAttribute("data-rte-ai-preview-change-label", previewItem.changeLabel);
                        }
                        if (previewItem.impactLabel) {
                            previewRow.setAttribute("data-rte-ai-preview-impact-label", previewItem.impactLabel);
                        }
                        if (previewItem.suggestionId) {
                            previewRow.setAttribute("data-rte-ai-preview-suggestion-id", previewItem.suggestionId);
                        }
                        previewRow.onclick = (function (item) {
                            return function () {
                                handleEmptyStateAction({
                                    id: "go-type",
                                    typeValue: item.typeValue,
                                    suggestionId: item.suggestionId,
                                    focusAction: item.focusAction || ""
                                });
                            };
                        })(previewItem);
                        previewRow.onfocus = function () {
                            linkReviewShortcutDisplayTarget(this);
                            setPrimaryEmptyTarget(this, this.getAttribute("data-rte-ai-primary-label") || this.innerText || "", {
                                announce: emptyPreviewButtons.length > 1
                            });
                        };
                        previewRow.onkeydown = function (e) {
                            var previewKey = (e.key || "").toLowerCase();
                            if (previewKey === "u" && e.shiftKey && hasRedoableReviewShortcut()) {
                                e.preventDefault();
                                e.stopPropagation();
                                redoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
                            }
                            else if (previewKey === "u" && hasUndoableReviewShortcut()) {
                                e.preventDefault();
                                e.stopPropagation();
                                undoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
                            }
                            else if (e.key === "ArrowRight" || e.key === "ArrowDown" || previewKey === "j") {
                                e.preventDefault();
                                moveEmptyPreviewFocus("next");
                            }
                            else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || previewKey === "k") {
                                e.preventDefault();
                                moveEmptyPreviewFocus("previous");
                            }
                            else if (e.key === "Home") {
                                e.preventDefault();
                                moveEmptyPreviewFocus("first");
                            }
                            else if (e.key === "End") {
                                e.preventDefault();
                                moveEmptyPreviewFocus("last");
                            }
                        };
                        emptyPreviewButtons.push(previewRow);
                        if (!editor.__aiReviewPrimaryEmptyAction) {
                            setPrimaryEmptyTarget(previewRow, previewItem.actionLabel || previewItem.label || "");
                        }
                    }
                    append(previewRow, "div", "", "rte-ai-review-empty-preview-label", previewItem.label || "Next queue");
                    var previewMeta = append(previewRow, "div", "", "rte-ai-review-empty-preview-meta");
                    previewRow.__aiPreviewMetaNode = previewMeta;
                    if (previewItem.pendingCountLabel) {
                        append(previewMeta, "span", "", "rte-ai-review-empty-preview-pill", previewItem.pendingCountLabel);
                    }
                    if (previewItem.focusActionLabel) {
                        append(previewMeta, "span", "", "rte-ai-review-empty-preview-pill is-focus", "Focus " + previewItem.focusActionLabel);
                    }
                    if (previewItem.changeLabel) {
                        append(previewMeta, "span", "", "rte-ai-review-empty-preview-pill is-change", previewItem.changeLabel);
                    }
                    if (previewItem.impactLabel) {
                        append(previewMeta, "span", "", "rte-ai-review-empty-preview-pill is-impact", previewItem.impactLabel);
                    }
                    if (previewItem.scopeLabel) {
                        append(previewMeta, "span", "", "rte-ai-review-empty-preview-pill", previewItem.scopeLabel);
                    }
                    if (previewItem.languageLabel) {
                        append(previewMeta, "span", "", "rte-ai-review-empty-preview-pill", previewItem.languageLabel);
                    }
                    var previewDiffParts = buildCompletionPreviewDiffParts(previewItem.text, previewItem.resultText);
                    appendCompletionPreviewLine(previewRow, "current", previewItem.text || "", previewDiffParts);
                    if (previewItem.resultText) {
                        appendCompletionPreviewLine(previewRow, "result", previewItem.resultText, previewDiffParts);
                    }
                    if (previewItem.reasonText) {
                        append(previewRow, "div", "", "rte-ai-review-empty-preview-reason", "Why this next: " + previewItem.reasonText);
                    }
                }
            }
            var emptyActions = [];
            for (var emptyActionIndex = 0; emptyActionIndex < emptyState.actions.length; emptyActionIndex++) {
                if (emptyState.actions[emptyActionIndex]) {
                    emptyActions.push(emptyState.actions[emptyActionIndex]);
                }
            }
            if (emptyActions.length) {
                var actionSection = append(emptyCard, "div", "", "rte-ai-review-empty-zone is-actions");
                appendPanelSectionLabel(actionSection, "rte-ai-review-section-label is-controls", "Actions");
                var emptyActionsRow = append(actionSection, "div", "", "rte-ai-review-empty-actions");
                var emptyActionGroups = {};
                for (var emptyButtonIndex = 0; emptyButtonIndex < emptyActions.length; emptyButtonIndex++) {
                    (function (action) {
                        var actionGroupInfo = getEmptyActionGroupInfo(action);
                        if (!emptyActionGroups[actionGroupInfo.key]) {
                            emptyActionGroups[actionGroupInfo.key] = append(emptyActionsRow, "div", "", "rte-ai-review-empty-action-group is-" + actionGroupInfo.key);
                            emptyActionGroups[actionGroupInfo.key].setAttribute("data-rte-ai-empty-group-label", actionGroupInfo.label);
                        }
                        var isPrimaryEmptyAction = emptyButtonIndex === 0;
                        var button = append(emptyActionGroups[actionGroupInfo.key], "button", "", (isPrimaryEmptyAction && !editor.__aiReviewPrimaryEmptyAction ? "rte-ai-review-control-button is-primary" : "secondary rte-ai-review-control-button"), "");
                        append(button, "span", "", "rte-ai-review-empty-action-label", action.label);
                        if (action.focusActionLabel) {
                            append(button, "span", "", "rte-ai-review-empty-action-pill is-focus", "Focus " + action.focusActionLabel);
                        }
                        button.type = "button";
                        if (action.id) {
                            button.setAttribute("data-rte-ai-empty-action-id", action.id);
                        }
                        button.setAttribute("aria-keyshortcuts", getReviewEmptyControlShortcutKeys());
                        button.title = getReviewEmptyControlShortcutTitle(action.label || "", {
                            focusLabel: action.focusActionLabel
                        });
                        if (action.focusActionLabel) {
                            button.setAttribute("data-rte-ai-empty-focus-label", action.focusActionLabel);
                        }
                        if (action.suggestionId) {
                            button.setAttribute("data-rte-ai-preview-suggestion-id", action.suggestionId);
                        }
                        if (isPrimaryEmptyAction) {
                            button.setAttribute("data-rte-ai-primary-button", "true");
                        }
                        if (isPrimaryEmptyAction && !editor.__aiReviewPrimaryEmptyAction) {
                            setPrimaryEmptyTarget(button, action.label || "");
                        }
                        button.onfocus = function () {
                            linkReviewShortcutDisplayTarget(button);
                            if (action.id === "go-type" || action.id === "next-overall") {
                                previewReviewEmptySuggestionTarget(action.suggestionId || "");
                            }
                            updateEmptyStateGuidance(getEmptyPrimaryActionLabel(button, action.label || ""));
                        };
                        button.onkeydown = function (e) {
                            if ((e.key || "").toLowerCase() === "u" && e.shiftKey && hasRedoableReviewShortcut()) {
                                e.preventDefault();
                                e.stopPropagation();
                                redoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
                            }
                            else if ((e.key || "").toLowerCase() === "u" && hasUndoableReviewShortcut()) {
                                e.preventDefault();
                                e.stopPropagation();
                                undoLastReviewDecision({ focusPanel: true, focusAction: getPreferredReviewActionFocus() });
                            }
                        };
                        button.onclick = function () {
                            handleEmptyStateAction(action);
                        };
                    })(emptyActions[emptyButtonIndex]);
                }
            }
            var emptyHintLabel = primaryEmptyActionLabel || (emptyActions[0] ? emptyActions[0].label : "");
            updateEmptyStateGuidance(emptyHintLabel);
        }
        else {
            editor.__aiLastReviewEmptyAnnouncement = "";
            editor.__aiReviewPrimaryEmptyAction = null;
            editor.__aiReviewMoveEmptyPreviewFocus = null;
        }

        var lastReviewFeedSectionKey = "";
        for (var s = 0; s < visible.length; s++) {
            (function (suggestion) {
                var isQueueOpenedItem = editor.__aiRecentlyOpenedQueueSuggestionId === suggestion.id;
                var queuePositionData = buildReviewQueuePositionData(visible, editor.__aiActiveSuggestionId, suggestion);
                var feedSectionData = buildReviewFeedSectionData(visible, editor.__aiActiveSuggestionId, suggestion, queuePositionData);
                if (feedSectionData && feedSectionData.key !== lastReviewFeedSectionKey) {
                    var feedSection = append(feed, "div", "", "rte-ai-review-feed-section is-" + feedSectionData.key);
                    var feedSectionMeta = append(feedSection, "div", "", "rte-ai-review-feed-section-meta");
                    var feedSectionTitle = append(feedSectionMeta, "div", "", "rte-ai-review-feed-section-title", feedSectionData.label);
                    feedSectionTitle.setAttribute("role", "heading");
                    feedSectionTitle.setAttribute("aria-level", "3");
                    if (feedSectionData.countLabel) {
                        append(feedSectionMeta, "span", "", "rte-ai-review-feed-section-pill", feedSectionData.countLabel);
                    }
                    if (feedSectionData.detail) {
                        append(feedSection, "div", "", "rte-ai-review-feed-section-detail", feedSectionData.detail);
                    }
                    lastReviewFeedSectionKey = feedSectionData.key;
                }
                var queueTransitionData = buildReviewQueueTransitionData(visible, editor.__aiActiveSuggestionId, suggestion);
                var isActiveReviewItem = editor.__aiActiveSuggestionId === suggestion.id;
                var isCondensedReviewItem = !isActiveReviewItem && !isQueueOpenedItem;
                var item = append(feed, "div", "", "rte-ai-review-item is-" + suggestion.status + (isActiveReviewItem ? " is-active" : "") + (isQueueOpenedItem ? " is-opened" : "") + (isCondensedReviewItem ? " is-condensed" : ""));
                item.setAttribute("data-rte-ai-review-id", suggestion.id);
                item.setAttribute("data-rte-ai-review-density", isCondensedReviewItem ? "condensed" : "expanded");
                if (queuePositionData && queuePositionData.role) {
                    item.setAttribute("data-rte-ai-review-queue-role", queuePositionData.role);
                }
                item.setAttribute("role", "button");
                item.tabIndex = editor.__aiActiveSuggestionId === suggestion.id ? 0 : -1;
                item.setAttribute("aria-keyshortcuts", appendUndoShortcutKeys(suggestion.status === "pending" ? "Enter Space A R J K Home End" : "Enter Space J K Home End"));
                item.title = getReviewCardShortcutTitle(suggestion, getPreferredReviewActionFocus(panel));
                var sharedUpdateCount = getSuggestionRemoteUpdateCount(suggestion.id);
                if (editor.__aiActiveSuggestionId === suggestion.id) {
                    item.setAttribute("aria-current", "true");
                }
                item.onclick = function (e) {
                    if (e && e.target && e.target.closest && e.target.closest(".rte-ai-review-item-actions")) {
                        return;
                    }
                    var preferredAction = getPreferredReviewActionFocus(panel);
                    var currentFocus = document.activeElement;
                    if (currentFocus && currentFocus.getAttribute && panel.contains(currentFocus)) {
                        preferredAction = currentFocus.getAttribute("data-rte-ai-review-action") || preferredAction;
                    }
                    if (focusDefaultReviewCardAction(suggestion.id, preferredAction)) {
                        return;
                    }
                    activateReviewSuggestion(suggestion.id, { focusPanel: true });
                };
                item.onfocus = function () {
                    linkReviewShortcutDisplayTarget(item);
                    item.title = getReviewCardShortcutTitle(suggestion, getPreferredReviewActionFocus(panel));
                    updateReviewCardShortcutDisplay(suggestion);
                    if (isCondensedReviewItem) {
                        updateReviewCondensedPreviewOpenHint(item, suggestion, panel);
                    }
                };
                var stateCard = append(item, "div", "", "rte-ai-review-item-state is-" + suggestion.status + (isActiveReviewItem ? " is-current" : "") + (isQueueOpenedItem ? " is-opened" : ""));
                append(stateCard, "div", "", "rte-ai-review-item-state-kicker", suggestion.status === "pending" ? "Review item" : "Review history");
                append(stateCard, "div", "", "rte-ai-review-item-state-title", getReviewItemStateTitle(suggestion, isActiveReviewItem, isQueueOpenedItem));
                append(stateCard, "div", "", "rte-ai-review-item-state-detail", getReviewItemStateDetail(suggestion, isActiveReviewItem, isQueueOpenedItem, sharedUpdateCount));
                if (queuePositionData) {
                    var queueCard = append(item, "div", "", "rte-ai-review-item-queue-card is-" + queuePositionData.role);
                    append(queueCard, "div", "", "rte-ai-review-item-queue-title", queuePositionData.roleLabel);
                    var queueMeta = append(queueCard, "div", "", "rte-ai-review-item-queue-meta");
                    append(queueMeta, "span", "", "rte-ai-review-item-queue-pill is-role", queuePositionData.roleLabel);
                    append(queueMeta, "span", "", "rte-ai-review-item-queue-pill is-position", queuePositionData.queueLabel);
                    append(queueCard, "div", "", "rte-ai-review-item-queue-detail", queuePositionData.detail);
                }
                if (queueTransitionData) {
                    var transitionCard = append(item, "div", "", "rte-ai-review-item-transition-card");
                    append(transitionCard, "div", "", "rte-ai-review-item-transition-title", queueTransitionData.title);
                    var transitionMeta = append(transitionCard, "div", "", "rte-ai-review-item-transition-meta");
                    append(transitionMeta, "span", "", "rte-ai-review-item-transition-pill is-status", queueTransitionData.statusLabel);
                    append(transitionMeta, "span", "", "rte-ai-review-item-transition-pill is-position", queueTransitionData.queueLabel);
                    if (queueTransitionData.typeLabel) {
                        append(transitionMeta, "span", "", "rte-ai-review-item-transition-pill is-type", queueTransitionData.typeLabel);
                    }
                    if (queueTransitionData.scopeLabel) {
                        append(transitionMeta, "span", "", "rte-ai-review-item-transition-pill is-scope", queueTransitionData.scopeLabel);
                    }
                    append(transitionCard, "div", "", "rte-ai-review-item-transition-detail", queueTransitionData.detail);
                    appendQueueTransitionPreview(transitionCard, "rte-ai-review-item-transition-preview", queueTransitionData);
                    if (queueTransitionData.followupTitle) {
                        var transitionFollowup = append(transitionCard, "div", "", "rte-ai-review-item-transition-followup");
                        append(transitionFollowup, "div", "", "rte-ai-review-item-transition-followup-title", queueTransitionData.followupTitle);
                        var transitionFollowupMeta = append(transitionFollowup, "div", "", "rte-ai-review-item-transition-followup-meta");
                        if (queueTransitionData.followupStatusLabel) {
                            append(transitionFollowupMeta, "span", "", "rte-ai-review-item-transition-pill is-followup", queueTransitionData.followupStatusLabel);
                        }
                        append(transitionFollowup, "div", "", "rte-ai-review-item-transition-followup-detail", queueTransitionData.followupDetail);
                    }
                }

                var meta = append(item, "div", "", "rte-ai-review-item-meta");
                append(meta, "span", "", "rte-ai-review-item-status is-" + suggestion.status, getSuggestionStatusLabel(suggestion.status));
                append(meta, "span", "", "rte-ai-review-item-stamp", suggestion.sourceLabel || (suggestion.snapshot && suggestion.snapshot.hasSelection ? "Selection suggestion" : "Document suggestion"));
                if (isActiveReviewItem) {
                    append(meta, "span", "", "rte-ai-review-item-stamp is-current", "Current");
                }
                if (isQueueOpenedItem) {
                    append(meta, "span", "", "rte-ai-review-item-stamp is-opened", "Queue opened");
                }
                if (suggestion.suggestionType && suggestion.suggestionType !== "other") {
                    append(meta, "span", "", "rte-ai-review-item-stamp is-type", getSuggestionTypeLabel(suggestion.suggestionType));
                }
                if (suggestion.language) {
                    append(meta, "span", "", "rte-ai-review-item-stamp is-language", getTranslateLanguageLabel(suggestion.language));
                }
                if (sharedUpdateCount) {
                    append(meta, "span", "", "rte-ai-review-item-stamp is-remote", sharedUpdateCount > 1 ? sharedUpdateCount + " shared updates" : "Shared update");
                }

                var summary = append(item, "div", "", "rte-ai-review-item-summary");
                append(summary, "div", "", "rte-ai-review-item-title", summarizeSuggestionText(suggestion.originalText || suggestion.resultText || "AI suggestion", 80));
                if (isCondensedReviewItem) {
                    appendReviewCondensedPreview(summary, suggestion, panel, {
                        queuePositionData: queuePositionData,
                        queueTransitionData: queueTransitionData,
                        sharedUpdateCount: sharedUpdateCount
                    });
                }
                var changeGlance = buildReviewChangeGlanceData(suggestion);
                if (changeGlance) {
                    var glanceCard = append(summary, "div", "", "rte-ai-review-item-glance-card");
                    append(glanceCard, "div", "", "rte-ai-review-item-glance-title", changeGlance.title);
                    if (changeGlance.pills && changeGlance.pills.length) {
                        var glanceMeta = append(glanceCard, "div", "", "rte-ai-review-item-glance-meta");
                        for (var glanceIndex = 0; glanceIndex < changeGlance.pills.length; glanceIndex++) {
                            var glancePill = changeGlance.pills[glanceIndex];
                            append(glanceMeta, "span", "", "rte-ai-review-item-glance-pill is-" + glancePill.kind, glancePill.text);
                        }
                    }
                    if (changeGlance.detail) {
                        append(glanceCard, "div", "", "rte-ai-review-item-glance-detail", changeGlance.detail);
                    }
                }
                if (suggestion.reason) {
                    var reasonCard = append(summary, "div", "", "rte-ai-review-item-reason-card");
                    append(reasonCard, "div", "", "rte-ai-review-item-reason-label", "Why AI suggested this");
                    append(reasonCard, "div", "", "rte-ai-review-item-reason", suggestion.reason);
                }
                var compare = append(item, "div", "", "rte-ai-review-item-compare");
                var compareHeader = append(compare, "div", "", "rte-ai-review-item-compare-header");
                append(compareHeader, "div", "", "rte-ai-review-item-compare-title", "Compare change");
                append(compareHeader, "div", "", "rte-ai-review-item-compare-detail", "Original and suggested text");
                var compareDiffParts = buildCompletionPreviewDiffParts(suggestion.originalText || "", suggestion.resultText || "");
                var beforeNode = append(compare, "div", "", "rte-ai-review-item-before");
                appendReviewCompareDeltaText(beforeNode, "current", normalizeText(suggestion.originalText || ""), compareDiffParts);
                var afterNode = append(compare, "div", "", "rte-ai-review-item-after");
                appendReviewCompareDeltaText(afterNode, "result", normalizeText(suggestion.resultText || ""), compareDiffParts);
                var undoCardContext = isActiveReviewItem && suggestion.status === "pending" && undoableReviewDecision ? getUndoDecisionContext(undoableReviewDecision) : null;
                var undoCardSummaryText = undoCardContext ? buildUndoDecisionSummaryText(undoableReviewDecision) : "";
                var undoCardHistoryItems = undoCardContext ? getUndoDecisionHistorySummaries(1) : [];
                if (undoCardContext) {
                    var undoNoteNode = append(item, "div", "", "rte-ai-review-item-undo-note", undoCardSummaryText + " Press U to " + undoCardContext.shortcutLabel + ".");
                    var undoNoteId = ensureReviewRecoveryNodeId(undoNoteNode, "undo-note", suggestion.id);
                }
                var undoHistoryNode = null;
                if (undoCardHistoryItems.length) {
                    undoHistoryNode = appendReviewItemRecoveryHistory(item, undoCardHistoryItems, "undo");
                    ensureReviewRecoveryNodeId(undoHistoryNode, "undo-history", suggestion.id);
                }
                var isRedoTarget = !!(redoableReviewDecision && redoableReviewDecision.suggestion && redoableReviewDecision.suggestion.id === suggestion.id && suggestion.status === "pending");
                var redoCardContext = isRedoTarget ? getRedoDecisionContext(redoableReviewDecision) : null;
                var redoCardSummaryText = redoCardContext ? buildRedoDecisionSummaryText(redoableReviewDecision) : "";
                var redoNoteId = "";
                if (redoCardContext) {
                    var redoNoteNode = append(item, "div", "", "rte-ai-review-item-redo-note", redoCardSummaryText + " Press Shift+U to " + redoCardContext.shortcutLabel + ".");
                    redoNoteId = ensureReviewRecoveryNodeId(redoNoteNode, "redo-note", suggestion.id);
                }
                var redoHistoryNode = null;
                var redoCardHistoryItems = redoCardContext ? getRedoDecisionHistorySummaries(1) : [];
                if (redoCardHistoryItems.length) {
                    redoHistoryNode = appendReviewItemRecoveryHistory(item, redoCardHistoryItems, "redo");
                    ensureReviewRecoveryNodeId(redoHistoryNode, "redo-history", suggestion.id);
                }
                item.setAttribute("aria-label", buildReviewItemAriaLabel(suggestion, {
                    isCurrent: editor.__aiActiveSuggestionId === suggestion.id,
                    queueOpened: isQueueOpenedItem,
                    queueRoleLabel: queuePositionData ? queuePositionData.roleLabel : "",
                    queuePositionLabel: queuePositionData ? queuePositionData.queueLabel : "",
                    transitionLabel: queueTransitionData ? (queueTransitionData.title + ". " + queueTransitionData.statusLabel + ". " + queueTransitionData.queueLabel + ". " + getQueueTransitionPreviewSummary(queueTransitionData) + (queueTransitionData.followupTitle ? ". " + queueTransitionData.followupTitle + ". " + queueTransitionData.followupDetail : "")) : "",
                    changeSummary: changeGlance ? (changeGlance.title + ". " + (changeGlance.pills || []).map(function (pill) { return pill.text; }).join(". ") + (changeGlance.detail ? ". " + changeGlance.detail : "")) : "",
                    remoteUpdateCount: sharedUpdateCount,
                    undoLabel: undoCardSummaryText,
                    undoNextLabel: undoCardHistoryItems.length ? "Undo after this: " + undoCardHistoryItems[0].detail : "",
                    redoLabel: redoCardSummaryText,
                    redoNextLabel: redoCardHistoryItems.length ? "Redo after this: " + redoCardHistoryItems[0].detail : ""
                }));
                item.setAttribute("data-rte-ai-review-base-aria-label", item.getAttribute("aria-label") || "");
                if (isCondensedReviewItem) {
                    updateReviewCondensedPreviewAria(item, suggestion, panel);
                    updateReviewCondensedPreviewOpenHint(item, suggestion, panel);
                }

                var actions = append(item, "div", "", "rte-ai-review-item-actions");
                var locateActions = append(actions, "div", "", "rte-ai-review-item-action-group is-locate");
                locateActions.setAttribute("data-rte-ai-review-action-group", "locate");
                var decisionActions = append(actions, "div", "", "rte-ai-review-item-action-group is-decision");
                decisionActions.setAttribute("data-rte-ai-review-action-group", "decision");
                var recoveryActions = append(actions, "div", "", "rte-ai-review-item-action-group is-recovery");
                recoveryActions.setAttribute("data-rte-ai-review-action-group", "recovery");
                var locateButton = append(locateActions, "button", "", "secondary rte-ai-review-action-button is-locate", "Locate");
                locateButton.type = "button";
                locateButton.setAttribute("data-rte-ai-review-action", "locate");
                locateButton.disabled = suggestion.status !== "pending" && suggestion.status !== "stale";
                locateButton.onclick = function () {
                    locateSuggestion(suggestion.id);
                };
                bindReviewActionButtonNavigation(locateButton, typeFilter, suggestion.id, "locate");

                if (suggestion.status === "pending") {
                    var acceptActionPresentation = getPendingReviewActionPresentation(suggestion, "accept", typeFilter) || { text: "Accept", label: "Accept this AI change" };
                    var acceptButton = append(decisionActions, "button", "", "rte-ai-review-action-button is-primary is-accept", acceptActionPresentation.text);
                    acceptButton.type = "button";
                    acceptButton.setAttribute("data-rte-ai-review-action", "accept");
                    acceptButton.setAttribute("aria-label", acceptActionPresentation.label);
                    acceptButton.title = acceptActionPresentation.label;
                    acceptButton.onclick = function () {
                        applyReviewDecision(suggestion.id, "accept", { focusAction: "accept" });
                    };
                    bindReviewActionButtonNavigation(acceptButton, typeFilter, suggestion.id, "accept");

                    var rejectActionPresentation = getPendingReviewActionPresentation(suggestion, "reject", typeFilter) || { text: "Reject", label: "Reject this AI change" };
                    var rejectButton = append(decisionActions, "button", "", "secondary rte-ai-review-action-button is-reject", rejectActionPresentation.text);
                    rejectButton.type = "button";
                    rejectButton.setAttribute("data-rte-ai-review-action", "reject");
                    rejectButton.setAttribute("aria-label", rejectActionPresentation.label);
                    rejectButton.title = rejectActionPresentation.label;
                    rejectButton.onclick = function () {
                        applyReviewDecision(suggestion.id, "reject", { focusAction: "reject" });
                    };
                    bindReviewActionButtonNavigation(rejectButton, typeFilter, suggestion.id, "reject");

                    if (undoCardContext) {
                        var undoButton = append(recoveryActions, "button", "", "secondary rte-ai-review-action-button is-undo", undoCardContext.actionLabel);
                        undoButton.type = "button";
                        undoButton.setAttribute("data-rte-ai-review-action", "undo");
                        if (undoNoteId) {
                            undoButton.setAttribute("data-rte-ai-review-extra-describedby", undoNoteId + (undoHistoryNode && undoHistoryNode.id ? " " + undoHistoryNode.id : ""));
                        }
                        undoButton.onclick = function () {
                            undoLastReviewDecision({ focusPanel: true, focusAction: "undo" });
                        };
                        bindReviewActionButtonNavigation(undoButton, typeFilter, suggestion.id, "undo");
                    }

                    if (redoCardContext) {
                        var redoActionButton = append(recoveryActions, "button", "", "secondary rte-ai-review-action-button is-redo", redoCardContext.actionLabel);
                        redoActionButton.type = "button";
                        redoActionButton.setAttribute("data-rte-ai-review-action", "redo");
                        if (redoNoteId) {
                            redoActionButton.setAttribute("data-rte-ai-review-extra-describedby", redoNoteId + (redoHistoryNode && redoHistoryNode.id ? " " + redoHistoryNode.id : ""));
                        }
                        redoActionButton.onclick = function () {
                            redoLastReviewDecision({ focusPanel: true, focusAction: "redo" });
                        };
                        bindReviewActionButtonNavigation(redoActionButton, typeFilter, suggestion.id, "redo");
                    }
                }
            })(visible[s]);
        }

        var shouldRestoreReviewFocus = !!focusPanel || preserveActiveReviewItemFocus || !!requestedReviewActionFocus;
        var focusedReviewItem = revealActiveReviewItem(feed, shouldRestoreReviewFocus, requestedReviewActionFocus || preserveActiveReviewAction);
        syncActiveReviewActionSummary(requestedReviewActionFocus || preserveActiveReviewAction || getPreferredReviewActionFocus(panel));
        syncActiveReviewEnterTarget(requestedReviewActionFocus || preserveActiveReviewAction || getPreferredReviewActionFocus(panel));

        var historyEntries = getReviewLogEntries().slice(0, 6);
        if (historyEntries.length) {
            append(feed, "div", "", "rte-ai-review-history-title", "Recent activity");
            for (var h = 0; h < historyEntries.length; h++) {
                var entry = historyEntries[h];
                var historyTone = getReviewLogEventToneClass(entry);
                var historyItem = append(feed, "div", "", "rte-ai-review-history-entry is-" + historyTone);
                historyItem.setAttribute("data-rte-ai-review-event", entry.eventType || "suggestion-updated");
                var historyHeader = append(historyItem, "div", "", "rte-ai-review-history-header");
                append(historyHeader, "span", "", "rte-ai-review-history-event is-" + historyTone, getReviewLogEventLabel(entry));
                var historyMetaParts = [];
                if (entry.sourceLabel) {
                    historyMetaParts.push(entry.sourceLabel);
                }
                if (entry.suggestionType && entry.suggestionType !== "other") {
                    historyMetaParts.push(getSuggestionTypeLabel(entry.suggestionType));
                }
                if (entry.language) {
                    historyMetaParts.push(getTranslateLanguageLabel(entry.language));
                }
                append(historyHeader, "div", "", "rte-ai-review-history-meta", historyMetaParts.join(" - ") || "AI review");
                append(historyItem, "div", "", "rte-ai-review-history-text", summarizeSuggestionText(entry.resultText || entry.originalText || "AI review event", 120));
            }
        }

        if (shouldRestoreReviewFocus) {
            setTimeout(function () {
                var restoredControl = null;
                if (preserveReviewControlFocusKey && panel && panel.querySelector) {
                    restoredControl = panel.querySelector('[data-rte-ai-review-focus-key="' + preserveReviewControlFocusKey + '"]');
                    if (restoredControl && restoredControl.disabled) {
                        restoredControl = null;
                    }
                    if (restoredControl && restoredControl.focus) {
                        restoredControl.focus();
                    }
                }
                if (!restoredControl && editor.__aiReviewPrimaryEmptyAction && editor.__aiReviewPrimaryEmptyAction.isConnected && !editor.__aiReviewPrimaryEmptyAction.disabled && editor.__aiReviewPrimaryEmptyAction.focus) {
                    editor.__aiReviewPrimaryEmptyAction.focus();
                }
                else if (!restoredControl && !focusedReviewItem && panel && panel.focus) {
                    panel.focus();
                }
            }, 0);
        }
        return true;
    }

    function openDialog(options) {
        options = options || {};
        if (editor.__aiDialog && editor.__aiDialog.isConnected) {
            editor.__aiDialog.close();
        }

        var snapshot = captureSelectionSnapshot();
        var dialoginner = editor.createDialog(config.text_aiassist || "Ask AI", "rte-panel-aiassist");
        dialoginner.__aiSnapshot = snapshot;
        editor.__aiDialog = dialoginner;
        dialoginner.__aiOperationStates = {};
        dialoginner.__aiPlanStale = false;
        dialoginner.__aiPlanStaleReason = "";
        dialoginner.__aiPlanStaleAction = "";

        dialoginner._onclose = function () {
            if (editor.__aiDialog === dialoginner) {
                editor.__aiDialog = null;
            }
        };

        // 2026-05-13 (v20260513c): the header mode chip ("Proofread",
        // "Translate · Spanish") is no longer painted into the dialog
        // header. The Action select directly below the title already
        // shows the active mode — and selecting a different mode in
        // the dropdown is the only way to change it — so the chip was
        // a second copy of the same fact. The Translate language was
        // the only extra signal the chip carried; the Language select
        // sitting right next to the Action select already shows it,
        // so nothing's lost. Same shape Notion AI / Tiptap / ChatGPT
        // inline edit ship — one title, no mode pill, the dropdown is
        // the single source of truth for "what AI will run". Detached
        // chip node kept so updateModeHelp's writes noop safely
        // without each call site needing a guard.
        var modeChip = document.createElement("span");
        modeChip.className = "rte-ai-dialog-mode-chip is-detached";
        modeChip.setAttribute("aria-hidden", "true");

        var grid = append(dialoginner, "div", "", "demo-ai-dialog-grid");
        var dialogIdSuffix = String(Date.now()) + "-" + String(Math.floor(Math.random() * 1000000));
        var modeHelpId = "rte-ai-mode-help-" + dialogIdSuffix;
        var sourceHelpId = "rte-ai-source-help-" + dialogIdSuffix;
        var resultHelpId = "rte-ai-result-help-" + dialogIdSuffix;
        var guidanceId = "rte-ai-apply-guidance-" + dialogIdSuffix;
        var statusId = "rte-ai-dialog-status-" + dialogIdSuffix;
        grid.setAttribute("role", "form");
        grid.setAttribute("aria-label", "Ask AI controls");

        var compactControls = append(grid, "div", "", "demo-ai-compact-controls");
        compactControls.setAttribute("role", "group");
        compactControls.setAttribute("aria-label", "Ask AI setup");

        // 2026-05-08 compact pass: dropped the per-field uppercase mini-labels
        // ("Action" / "Language" / "Use" / blank-spacer) and the duplicate
        // mode-help paragraph. The select labels its own value, the scope
        // buttons label themselves, and the help string moved to the
        // select's title attribute (still surfaced on hover).
        var actionField = append(compactControls, "div", "", "demo-ai-field demo-ai-action-field");
        var modeSelect = append(actionField, "select");
        modeSelect.setAttribute("aria-label", "AI action");
        // 2026-05-17 (v20260517a): the mode help line is back on-screen,
        // attached directly to the dialog grid (full-width row under the
        // controls strip). The prior hover-only `title` attribute meant
        // first-time users picked Proofread / Justify / Summarize from a
        // 7-row dropdown without ever seeing what each mode does — a
        // discoverability gap Notion AI / Tiptap / CKEditor all close
        // with a one-line caption below their action picker. Compact
        // 11px muted text, single line, ~14px reserved height. Pre-result
        // the caption is the only context users have for the active mode
        // until they paste text — so the cost of 14px is paid back by
        // removing "what does this do?" friction. */
        // 2026-05-20 (v20260520g) — Pass 59: detached. The caption text
        // is now mirrored into the dialog header subtitle (see
        // `ensureDialogHeaderCaption` / `updateModeHelp`). The node stays
        // in DOM (and is appended to the grid below) so any external
        // integration that walks `.demo-ai-mode-caption` or reads
        // `modeHelp.innerText` keeps resolving — `is-detached` collapses
        // it visually (`display: none !important`) so the grid no longer
        // pays ~15px of vertical chrome for a row whose text now lives
        // in the dialog header. */
        var modeHelp = document.createElement("div");
        modeHelp.className = "demo-ai-mode-caption is-detached";
        modeHelp.id = modeHelpId;

        var languageField = append(compactControls, "div", "", "demo-ai-field demo-ai-language-field");
        var languageSelect = append(languageField, "select");
        languageSelect.setAttribute("aria-label", "Translation target language");
        populateDialogModes();
        if (options.presetMode) {
            // 2026-05-19 (v20260519a): only honor presetMode when it
            // matches a known option value. The "Draft" menu item
            // (id: "open-dialog") calls runQuickAction which falls back
            // to `presetMode: action.resolverMode || actionId` — that
            // resolves to "open-dialog", which is NOT a valid mode value.
            // Assigning `modeSelect.value = "open-dialog"` silently
            // unselects every option (selectedIndex -> -1), and
            // downstream the title / caption / language-visibility
            // logic all branch on a now-empty `modeSelect.value`. Guard
            // the assignment so an unrecognised preset is a no-op and
            // the default first option remains selected.
            var presetIsValid = false;
            for (var presetIndex = 0; presetIndex < modeSelect.options.length; presetIndex++) {
                if (modeSelect.options[presetIndex].value === options.presetMode) {
                    presetIsValid = true;
                    break;
                }
            }
            if (presetIsValid) {
                modeSelect.value = options.presetMode;
            }
        }
        if (modeSelect.options.length && modeSelect.selectedIndex < 0) {
            modeSelect.selectedIndex = 0;
        }
        updateModeHelp();
        modeSelect.setAttribute("aria-describedby", modeHelpId);

        var scopeField = append(compactControls, "div", "", "demo-ai-field demo-ai-scope-field");
        // 2026-05-17 (v20260523a): Selection / Document segmented control
        // swapped for a single labeled <select>. The earlier icon-only
        // pair (cursor-T / document glyph, since v20260509j) gave no
        // text affordance — first-time users couldn't tell what either
        // glyph meant without hovering for the tooltip. The select
        // option labels carry both the scope name AND the live char
        // count ("Selection · 124 chars" / "Document · 2.4K chars") so
        // users see WHAT AI will run on AND HOW BIG it is in one glance,
        // killing the duplicate "Document · 117 chars" mode-caption row
        // that v20260522a needed to compensate for the icon-only ambiguity.
        // The original buttons stay in the DOM (detached, see below) so
        // external integrations that walk `[data-rte-ai-dialog-action=
        // "load-selection"]` / `"load-document"` keep resolving, and
        // every syncDialogScopeUi / setBusyState pass that toggles
        // `.disabled` / `aria-pressed` on them keeps working as a no-op
        // off-screen. Customers who want the icon segmented control back
        // can override with `.demo-ai-scope-select { display: none }` +
        // `.demo-ai-scope-row.is-detached { display: flex !important }`.
        var scopeSelect = append(scopeField, "select", "", "demo-ai-scope-select");
        scopeSelect.setAttribute("aria-label", "Source for Ask AI");
        scopeSelect.setAttribute("data-rte-ai-dialog-action", "scope");
        var scopeOptionSelection = append(scopeSelect, "option", "", "", "Selection");
        scopeOptionSelection.value = "selection";
        var scopeOptionDocument = append(scopeSelect, "option", "", "", "Document");
        scopeOptionDocument.value = "document";

        // 2026-06-01 (v20260601a): scope caption surfaced inline when only
        // one scope is valid (no editor selection captured). Pre-pass the
        // <select> rendered with a disabled "Selection (none)" option +
        // one valid "Document · X chars" option whenever the user opened
        // Ask AI without selecting text first — a picker that couldn't
        // actually be picked. Same shape the AI Chat panel has had since
        // v20260515a, where the scope chip is suppressed via
        // `is-no-selection-actionable` until a selection exists, and the
        // shape every reference inline AI surface ships (Notion AI inline
        // composer, Claude inline edit, Tiptap AI bubble — scope picker
        // only appears when the choice is meaningful). The caption keeps
        // the live char count visible so users still see WHAT AI will
        // run on, just without the grey-out chevron noise. The select
        // remains in the DOM (toggled via display) so every onchange /
        // disabled / aria-label sync path keeps resolving without each
        // call site needing a null guard.
        var scopeCaption = append(scopeField, "span", "", "demo-ai-scope-caption");
        scopeCaption.setAttribute("aria-hidden", "true");

        var loadRow = scopeField.ownerDocument.createElement("div");
        loadRow.className = "demo-actions-row demo-ai-scope-row is-detached";
        loadRow.setAttribute("role", "group");
        loadRow.setAttribute("aria-label", "Source scope");
        var loadSelectionButton = scopeField.ownerDocument.createElement("button");
        loadSelectionButton.type = "button";
        loadSelectionButton.className = "is-icon-only";
        loadSelectionButton.setAttribute("data-rte-ai-dialog-action", "load-selection");
        loadSelectionButton.title = "Use selection";
        loadSelectionButton.setAttribute("aria-label", "Use selection");
        setReviewV2ButtonContent(loadSelectionButton, "cursorText", "");
        loadRow.appendChild(loadSelectionButton);
        var loadDocumentButton = scopeField.ownerDocument.createElement("button");
        loadDocumentButton.type = "button";
        loadDocumentButton.className = "secondary is-icon-only";
        loadDocumentButton.setAttribute("data-rte-ai-dialog-action", "load-document");
        loadDocumentButton.title = "Use document";
        loadDocumentButton.setAttribute("aria-label", "Use document");
        setReviewV2ButtonContent(loadDocumentButton, "document", "");
        loadRow.appendChild(loadDocumentButton);
        // 2026-05-17 (v20260523a): append the legacy scope row to
        // scopeField so external integrations that walk
        // `dialog.querySelector('[data-rte-ai-dialog-action="load-selection"]')`
        // / `"load-document"` keep resolving. The row is hidden via the
        // `.demo-ai-scope-row.is-detached` CSS rule below; the new
        // labeled <select> above is the visible scope control.
        scopeField.appendChild(loadRow);

        var runField = append(compactControls, "div", "", "demo-ai-field demo-ai-run-field");
        var runRow = append(runField, "div", "", "demo-actions-row demo-ai-run-row");
        runRow.setAttribute("role", "group");
        runRow.setAttribute("aria-label", "Ask AI run actions");
        var runButton = append(runRow, "button", "", "is-primary");
        runButton.type = "button";
        runButton.setAttribute("data-rte-ai-dialog-action", "run");
        // Sparkle glyph + "Generate" — same icon vocabulary as AI Chat
        // composer's Send and AI Review V2's Accept buttons.
        setReviewV2ButtonContent(runButton, "sparkles", "Generate");
        // 2026-05-09 (v20260509j): surface the Ctrl/Cmd+Enter shortcut on
        // hover and to screen readers. Same idiom every modern AI surface
        // uses (ChatGPT Send: "Send (⌘↵)", Notion AI Generate: "Generate
        // (Ctrl+Enter)"). aria-keyshortcuts is the WAI-ARIA standard way
        // to advertise a keyboard shortcut so screen readers announce
        // "Generate, Control+Enter" alongside the button name.
        runButton.title = "Generate AI suggestion (Ctrl+Enter)";
        runButton.setAttribute("aria-keyshortcuts", "Control+Enter");
        // 2026-05-17 (v20260517a): visible Ctrl+↵ / ⌘↵ chip baked into
        // the Generate button. Pre-v20260517a the shortcut only lived in
        // the title attribute, which never reaches users who navigate
        // by keyboard — they couldn't find it without hover. Same affordance
        // ChatGPT composer's "Send ⌘↵" and Linear's command palette
        // ship: a tiny muted glyph at the trailing edge of the primary
        // button. Mac / non-Mac glyph is chosen at dialog-open time
        // from navigator.platform so the hint matches the actual key
        // the user would press. */
        var isMacOs = /Mac|iPad|iPhone|iPod/i.test((navigator.platform || "") + " " + (navigator.userAgent || ""));
        var runKbdLabel = isMacOs ? "⌘⏎" : "Ctrl ⏎";
        function refreshRunKbdHint() {
            if (!runButton) return;
            var existing = runButton.querySelector(".demo-ai-kbd-hint");
            if (existing) existing.parentNode.removeChild(existing);
            var kbd = runButton.ownerDocument.createElement("span");
            kbd.className = "demo-ai-kbd-hint";
            kbd.setAttribute("aria-hidden", "true");
            kbd.textContent = runKbdLabel;
            runButton.appendChild(kbd);
        }
        refreshRunKbdHint();
        // 2026-05-08 (v20260508s): Copy demoted to an icon-only button so
        // Generate dominates the run row. Label moved to title/aria-label
        // for hover + screen readers. Frees ~80px of horizontal space at
        // 540px dialog width.
        var copyButton = append(runRow, "button", "", "secondary is-icon-only");
        copyButton.type = "button";
        copyButton.title = "Copy result into source";
        copyButton.setAttribute("aria-label", "Copy result into source");
        copyButton.setAttribute("data-rte-ai-dialog-action", "copy-to-source");
        setReviewV2ButtonContent(copyButton, "checkAll", "");

        var scopeHint = document.createElement("span");

        // 2026-05-20 (v20260520c): caption restored to the visible grid.
        // The v20260530a removal relied on the Action select's `title`
        // attribute carrying the mode description, but a hover tooltip on
        // a closed <select> is a discoverability dead-end — keyboard users
        // never see it, touch users never see it, and even mouse users
        // have to learn to hover the SELECT (not its label) to find it.
        // First-time users meet a dropdown listing "Proofread / Rewrite /
        // Translate / Improve writing / Shorten / Expand / Summarize" with
        // zero explanation of how Rewrite differs from Improve writing,
        // or what "Justify" / "Improve writing" do at all. Same affordance
        // every reference inline composer ships — Notion AI's "Tell AI
        // what to do..." caption, Linear command palette's description
        // line, Slack composer's hint row — one quiet line directly under
        // the picker that names what the active choice does. Pays ~14px
        // pre-result for a non-trivial clarity gain; auto-hidden post-
        // result via the existing `:not(.is-pre-result) .demo-ai-mode-
        // caption { display: none }` rule (the result textarea IS the
        // explanation once output lands). The caption rides as the second
        // row of the grid (`grid-row: 2` in CSS), so it sits between the
        // controls strip and the source textarea where the user is about
        // to look next.
        grid.appendChild(modeHelp);

        var textGrid = append(grid, "div", "", "demo-ai-text-grid");
        textGrid.setAttribute("role", "group");
        textGrid.setAttribute("aria-label", "Ask AI source and result");

        // 2026-05-09 (v20260509j): dropped the "Source" / "Result"
        // text-tag spans. They had no CSS rule (the class was
        // .demo-ai-text-tag while the styled label is .demo-ai-text-label),
        // so they rendered as un-styled inline text above each textarea
        // — adding visual noise without legible affordance. The textarea
        // placeholder + the chrome (editable left / readonly right with
        // tinted background) already distinguish input from output, and
        // the textarea aria-label still announces the field role for
        // screen readers. Saves ~14px of vertical space per field.
        var sourceField = append(textGrid, "div", "", "demo-ai-field demo-ai-source-field");
        // 2026-05-13 (v20260513a) baseline: inline "Source" / "Result" labels
        // above each textarea, hidden pre-result via the .is-pre-result rule.
        // 2026-05-20 (v20260520j) — Pass 62: Source label always detached.
        // Pre-result it was already hidden (CSS .is-pre-result cascade); the
        // remaining showing case was post-result + source-expanded, but the
        // user only reaches that flow by clicking the "Edit" toggle pill —
        // which already names the field's role ("Edit the prompt and retry").
        // Restating "Source" 4px above the textarea was a third copy of the
        // same fact (toggle label + textarea placeholder + this eyebrow).
        // Saves ~16px vertical when the user expands source for retry/refine.
        // Detached node kept in DOM so external integrations that walk
        // `.demo-ai-source-field .demo-ai-text-label-inline` keep resolving.
        append(sourceField, "span", "", "demo-ai-text-label-inline is-detached", "Source");
        var sourceHelp = append(sourceField, "span", "", "demo-ai-field-help is-detached", "Edit the source text or prompt that Ask AI will use.");
        sourceHelp.id = sourceHelpId;
        var sourceArea = append(sourceField, "textarea");
        sourceArea.setAttribute("aria-label", "Source text for Ask AI");
        sourceArea.setAttribute("aria-describedby", sourceHelpId + " " + modeHelpId);
        // 2026-05-26 (v20260526a): reparent the run-row (Generate + Copy
        // buttons) from the compact-controls strip INTO the source field,
        // immediately after the source textarea. CSS positions it as an
        // absolutely-anchored 32x32 round icon overlay at the textarea's
        // bottom-right corner — same affordance the AI Chat composer
        // adopted in v20260525a (v2.0.4.9) and every reference inline
        // composer ships (Notion AI, ChatGPT inline edit, Tiptap AI
        // bubble, Claude inline edit, CKEditor 5 AI Assistant). Pre-pass
        // the Generate primary sat at the top of the dialog on its own
        // 36px row with the Action/Scope selects, so users typing INTO
        // the source textarea had to look UP to find Generate — exactly
        // the friction the chat composer fix called out. With the
        // reparent: (1) the controls strip drops to just Action + Scope,
        // its row height collapses from ~36px to ~26px (no Generate
        // forcing the floor); (2) Generate sits where users' eyes
        // already are after typing a prompt; (3) Ctrl+Enter still
        // routes through the same runButton.onclick path. Copy stays
        // in the same runRow so the post-result "Copy result into
        // source" affordance keeps working when the user expands
        // source via the Edit prompt disclosure. Reparent is structural
        // only — every `var` reference (runRow, runButton, copyButton)
        // still resolves, and every selector / focus walker that
        // targets `.demo-ai-run-row` / `[data-rte-ai-dialog-action="run"]`
        // keeps working. Customers who want the prior top-row Generate
        // back can override with `.demo-ai-source-field .demo-ai-run-row
        // { position: static !important }` and remove the source-field
        // padding-right reserve.
        sourceField.appendChild(runRow);
        // 2026-05-17 (v20260520b): rows=1 so the CSS min-height: 36px floor
        // is the binding constraint. Without this, the browser default
        // rows=2 sizes the textarea to ~47px at the dialog's 13px font /
        // 18.85px line-height, overriding the 36px floor that v20260513a
        // set. Same fix v20260518a (v2.0.4.1) applied to the chat composer
        // textarea — the at-rest input reads as one calm row, not a
        // 2-row paragraph box. Source still grows freely as the user
        // pastes long text (resize handle on, no max-height set) and
        // refreshSource sets multi-line content directly.
        sourceArea.rows = 1;
        // 2026-05-15 (v20260515e): trimmed from "Type or paste text —
        // Ctrl+Enter to generate." (47 chars) to "Type or paste text…"
        // (19 chars). The Ctrl/Cmd+Enter shortcut is still surfaced on
        // the Generate button via title + aria-keyshortcuts (since
        // v20260509j) and is universal keyboard convention every modern
        // AI surface uses — the placeholder no longer doubles as a
        // keyboard tutorial. Same shape Notion AI ("Tell AI what to
        // do…") / Claude composer / ChatGPT composer ship — one calm
        // verb phrase, no inline shortcut hint.
        // Earlier baseline:
        //   v20260509j: 95 → 47 chars after the scope toggle landed.
        sourceArea.placeholder = "Type or paste text…";

        // 2026-06-03 (v20260603a): live character counter pinned to the
        // bottom-LEFT corner of the source textarea. Pre-pass users
        // typed a prompt with no signal about how much they were
        // feeding to AI — short fragments and long documents looked
        // identical at the dialog level once the textarea auto-grew.
        // The pre-result mode caption WAS surfacing scope + chars
        // (v20260519a), but that line was dropped from the visible grid
        // in v20260530a; only the Action select's title attribute (hover
        // tooltip) carried the description, with no live char count.
        // Same shape Notion AI inline composer / ChatGPT composer /
        // Claude composer ship — a tiny muted counter pinned to the
        // textarea corner that grows / shrinks as the user types. The
        // bottom-right corner is owned by the Generate icon-overlay
        // (since v20260526a), so the counter rides bottom-LEFT where
        // there's nothing else. Hidden when source is empty so the
        // fresh-open dialog stays clean; appears the moment text
        // exists. Zero added vertical chrome (rides inside the
        // textarea's existing padding).
        var sourceCounter = append(sourceField, "span", "", "demo-ai-source-counter");
        sourceCounter.setAttribute("aria-hidden", "true");
        function refreshSourceCounter() {
            if (!sourceCounter) {
                return;
            }
            var text = sourceArea.value || "";
            var len = text.length;
            if (!len) {
                sourceCounter.textContent = "";
                sourceCounter.classList.remove("is-visible");
                return;
            }
            var label = len > 999
                ? (Math.round(len / 100) / 10) + "K chars"
                : len + (len === 1 ? " char" : " chars");
            sourceCounter.textContent = label;
            sourceCounter.classList.add("is-visible");
        }

        // 2026-05-13 (v20260513a): Result field appended after Source so
        // the result lands BELOW the source-edit area when source is
        // expanded, but a CSS order flip + `is-source-collapsed` class
        // hide the Source by default post-result and bubble Result to
        // the top of the stack. The flow:
        //   Pre-result: only Source visible (full-width prompt input).
        //   Post-result default: only Result visible. A small "Source ▸"
        //     toggle in the result header expands Source for retry/edit.
        // Same shape Notion AI inline composer uses — post-result the
        // prompt collapses out of the way and Result owns the visual
        // weight; click the input to re-prompt.
        sourceField.style.order = "2";
        var resultField = append(textGrid, "div", "", "demo-ai-field demo-ai-result-field");
        resultField.style.order = "1";
        var resultHead = append(resultField, "div", "", "demo-ai-result-head");
        // 2026-05-13 (v20260513d): "RESULT" eyebrow label-inline dropped
        // from the result-head. The readonly tinted textarea background +
        // the right-aligned "Edit prompt" disclosure already mark this
        // textarea as the AI output. The 10px uppercase eyebrow added
        // ~12px of vertical chrome above the result for no informational
        // gain — same shape Notion AI / Tiptap AI bubble / ChatGPT inline
        // edit ship, where the AI output is the visible primary and the
        // only header chrome is a disclosure for retry. Detached label
        // node kept so any external integration that walks
        // `.demo-ai-result-head .demo-ai-text-label-inline` resolves
        // without throwing.
        var resultLabel = document.createElement("span");
        resultLabel.className = "demo-ai-text-label-inline is-detached";
        resultLabel.innerText = "Result";
        var resultHelp = append(resultField, "span", "", "demo-ai-field-help is-detached", "Review the generated AI suggestion before applying it.");
        resultHelp.id = resultHelpId;
        // 2026-06-03 (v20260603a): real "Copy to clipboard" affordance
        // pinned to the result corner, sibling to the "Edit prompt"
        // disclosure. Pre-pass the only copy path was the apply-row
        // icon-only Copy button which writes the AI output back into
        // the SOURCE field for chain-refinement (a power feature
        // users rarely guess); grabbing the AI suggestion for use
        // OUTSIDE the editor required a manual select-all + Ctrl+C
        // inside the readonly textarea. Same shape every reference
        // inline AI surface ships — Notion AI / Claude / ChatGPT /
        // Tiptap all surface a one-click clipboard button on the AI
        // output. The button briefly flips to a check glyph + "Copied"
        // text as success confirmation, then restores after 1.4s.
        // Hidden pre-result automatically because the entire result
        // field is hidden via the `.is-pre-result .demo-ai-result-field`
        // cascade.
        var copyClipboardButton = append(resultHead, "button", "", "demo-ai-clipboard-toggle");
        copyClipboardButton.type = "button";
        copyClipboardButton.setAttribute("data-rte-ai-dialog-action", "copy-clipboard");
        copyClipboardButton.title = "Copy AI output to clipboard";
        copyClipboardButton.setAttribute("aria-label", "Copy AI output to clipboard");
        setReviewV2ButtonContent(copyClipboardButton, "clipboard", "Copy");
        var copyClipboardResetTimer = null;
        copyClipboardButton.onclick = function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            if (!normalizeText(resultArea.value)) {
                return;
            }
            copyTextToClipboard(resultArea.value).then(function (copied) {
                if (!copied) {
                    return;
                }
                copyClipboardButton.classList.add("is-copied");
                setReviewV2ButtonContent(copyClipboardButton, "check", "Copied");
                if (copyClipboardResetTimer) {
                    clearTimeout(copyClipboardResetTimer);
                }
                copyClipboardResetTimer = setTimeout(function () {
                    copyClipboardButton.classList.remove("is-copied");
                    setReviewV2ButtonContent(copyClipboardButton, "clipboard", "Copy");
                    copyClipboardResetTimer = null;
                }, 1400);
            });
        };

        // 2026-05-20 (v20260520e) — Pass 58: "?" rationale button pinned to
        // the result-head corner, sibling to Copy + Edit prompt. Replaces
        // the "Why" refine chip in the apply row (detached above). Same
        // glyph idiom Notion AI / Tiptap use — a small info pill on the
        // AI output corner that opens the rationale panel. Toggles the same
        // `.is-collapsed` class on `insightGrid` that the legacy chip did,
        // mirrors aria-expanded across detailsToggle + the detached chip so
        // screen readers see one disclosure state regardless of which
        // control the keyboard landed on.
        var whyButton = append(resultHead, "button", "", "demo-ai-clipboard-toggle demo-ai-why-toggle");
        whyButton.type = "button";
        whyButton.setAttribute("data-rte-ai-dialog-action", "why");
        whyButton.title = "Why this AI suggestion?";
        whyButton.setAttribute("aria-label", "Show why this AI suggestion was generated");
        whyButton.setAttribute("aria-expanded", "false");
        setReviewV2ButtonContent(whyButton, "info", "");

        var sourceToggle = append(resultHead, "button", "", "demo-ai-source-toggle");
        sourceToggle.type = "button";
        sourceToggle.setAttribute("aria-expanded", "false");
        sourceToggle.setAttribute("aria-controls", "rte-ai-source-" + Date.now());
        // 2026-05-13 (v20260513b): "Source" → "Edit prompt". The earlier
        // label read as a field name ("Source" is what you read, not what
        // you do), so first-time users skipped past it expecting a third
        // label below Result. "Edit prompt" reads as an action — same
        // affordance Notion AI's "Edit prompt" disclosure uses post-result.
        // 2026-05-20 (v20260520i) — Pass 61: trim visible label "Edit prompt"
        // → "Edit". The CSS chevron `::before` (▸ / rotated ▾) is the
        // disclosure affordance — pre-pass the label "Edit prompt" was
        // saying the same thing twice (open the prompt + edit the prompt).
        // "Edit" preserves the verb-action shape Pass v20260513b adopted,
        // saves ~30px horizontal real estate in the result-head pill row,
        // and the title attribute ("Edit the prompt and retry") still
        // surfaces the long form on hover + to screen readers via
        // aria-label.
        sourceToggle.title = "Edit the prompt and retry";
        sourceToggle.setAttribute("aria-label", "Edit the prompt and retry");
        sourceToggle.innerText = "Edit";
        sourceField.id = sourceToggle.getAttribute("aria-controls");
        sourceToggle.onclick = function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var expanded = grid.classList.toggle("is-source-expanded");
            sourceToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
            if (expanded) sourceArea.focus();
        };
        var resultArea = append(resultField, "textarea");
        resultArea.readOnly = true;
        resultArea.setAttribute("aria-label", "AI suggestion result");
        resultArea.setAttribute("aria-describedby", resultHelpId + " " + statusId);
        // 2026-05-17 (v20260520b): rows=1 lets the CSS min-height: 52px
        // floor (since v20260513a) actually bind. Browser default rows=2
        // sized the readonly textarea to ~62-67px (2 lines @ 13px /
        // 18.85px line-height + 21/4 padding for the corner pill inset +
        // 2px border), which overrode the intended 52px floor. With
        // rows=1 the result textarea sits at exactly 52px when output is
        // 1-2 short lines and auto-grows as AI suggestions expand. Saves
        // ~10-15px on every post-result dialog.
        resultArea.rows = 1;
        // 2026-05-09 (v20260509j): trimmed from "AI output will appear
        // here after you click Generate." (52 chars) to "Output appears
        // here." (20 chars). Same idiom Notion AI's inline composer
        // uses ("AI response..."). At 20 chars it never line-wraps
        // inside the textarea even at 320px viewport.
        resultArea.placeholder = "Output appears here.";

        var oldPreview = document.createElement("pre");
        var newPreview = document.createElement("pre");

        // 2026-05-30 (v20260530a): refine chips no longer paint a SEPARATE
        // row above the apply row. They are now created on a detached
        // container, then reparented INTO the apply row immediately after
        // applyRowMoreToggle is built (see the move block below) so the
        // post-result dialog reads as ONE compact action bar:
        //   [Apply primary]  [Try again] [Shorter] [Longer] [Why ▸]  [⋯]
        // Same visual idiom Notion AI inline composer / Claude inline edit
        // / Tiptap AI bubble ship — primary action and refinements share
        // one row, not two stacked rows. Saves ~29px of post-result vertical
        // chrome (the prior dedicated refine row claimed ~26px chip height
        // + 3px grid gap). The chips keep their `data-rte-ai-dialog-action`
        // attrs, their `setBusyState` gate, the same `runRefinementInstruction`
        // / `onclick` plumbing, and the same Why disclosure mechanics — the
        // change is structural only. The `refineRow` div is kept on the
        // grid with `is-detached` so any external integration that walks
        // `.demo-ai-refine-row` still finds the node. Customers who want
        // the prior stacked layout back can override with one CSS rule
        // documented in the v20260530a comment block at the end of
        // aitoolkit.css.
        // 2026-05-28 (v20260528b) baseline: introduced the dedicated refine
        // row directly under the result textarea.
        var refineRow = document.createElement("div");
        refineRow.className = "demo-ai-refine-row is-detached";
        refineRow.setAttribute("role", "group");
        refineRow.setAttribute("aria-label", "Refine AI suggestion");
        // Keep the (now empty) refineRow attached to the dialog grid so any
        // external integration that walks `.demo-ai-refine-row` from the
        // dialog root keeps resolving. The `is-detached` class collapses it
        // visually (display: none !important).
        grid.appendChild(refineRow);
        // 2026-05-20 (v20260520e) — Pass 58: refine chips gain icon prefixes
        // so the eye recognises each chip without re-reading the label. Pre-
        // pass three text-only pills ("Try again / Shorter / Longer") sat at
        // the same visual weight in the apply row alongside the Apply primary
        // — even on the third visit a user had to read each label to find
        // the right one. Same shape every reference inline composer ships
        // (Notion AI: ↻ Retry, ↘ Shorter, ↗ Longer; Claude inline edit; Tiptap
        // AI bubble). The icon spans use the same `.rte-ai-review-v2-action-
        // icon` chrome class as every other dialog button so chip + button
        // typography stays coherent. The chip's existing
        // `data-rte-ai-dialog-action` attr is untouched so every selector /
        // setBusyState / focus-traversal walker keeps resolving.
        var refineRetryChip = append(refineRow, "button", "", "secondary demo-ai-refine-chip");
        refineRetryChip.type = "button";
        refineRetryChip.title = "Re-run with the same prompt";
        refineRetryChip.setAttribute("data-rte-ai-dialog-action", "refine-retry");
        setReviewV2ButtonContent(refineRetryChip, "refresh", "Try again");
        var refineShorterChip = append(refineRow, "button", "", "secondary demo-ai-refine-chip");
        refineShorterChip.type = "button";
        refineShorterChip.title = "Make the suggestion shorter";
        refineShorterChip.setAttribute("data-rte-ai-dialog-action", "refine-shorter");
        setReviewV2ButtonContent(refineShorterChip, "shrink", "Shorter");
        var refineLongerChip = append(refineRow, "button", "", "secondary demo-ai-refine-chip");
        refineLongerChip.type = "button";
        refineLongerChip.title = "Expand the suggestion with more detail";
        refineLongerChip.setAttribute("data-rte-ai-dialog-action", "refine-longer");
        setReviewV2ButtonContent(refineLongerChip, "expand", "Longer");
        // 2026-05-29 (v20260529a): "Why" disclosure folded into the refine
        // chip row as a 4th ghost chip — the standalone Details toggle row
        // that previously sat on its own line between the chip strip and
        // the Apply row drops off the screen as its visible interaction
        // moves here. Pre-pass the post-result dialog painted four stacked
        // rows below the result textarea (refine chips → Details toggle →
        // [optional insight grid] → Apply row → status); each chip / row
        // claimed its own grid track + 3px gap, so the Details toggle alone
        // ate ~26px of vertical chrome for a one-button affordance. Same
        // shape Notion AI inline composer / Tiptap AI bubble ship for post-
        // result iteration — refinement options AND the rationale
        // disclosure live in one chip strip directly under the suggestion,
        // not two separate rows. The chip toggles the same `.is-collapsed`
        // class on `insightGrid` that detailsToggle owns, and mirrors its
        // aria-expanded / aria-controls plumbing, so external integrations
        // that walk either `.demo-ai-details-toggle` (kept hidden in DOM
        // for selector compatibility) or `.demo-ai-insight-grid` keep
        // resolving. Visually pushed to the trailing edge via
        // `margin-left: auto` so the three iteration chips cluster left
        // and the rationale disclosure sits right — keyboard-Tab order
        // still flows refine-retry → refine-shorter → refine-longer →
        // refine-why, then continues to the Apply primary, matching
        // reading order.
        // 2026-05-20 (v20260520e) — Pass 58: Why disclosure DEMOTED from the
        // apply row's chip strip into a quiet `?` icon-only button anchored
        // to the result-head corner, sibling to "Copy" and "Edit prompt".
        // Pre-pass Why rode as the 4th refine chip beside Try again /
        // Shorter / Longer, which competed visually with the Apply primary
        // and made the apply row read as 6 equal-weight controls. Why is a
        // RATIONALE affordance, not an iteration affordance — it explains
        // the result, so it belongs *next to* the result, not in the action
        // bar. Same shape Notion AI inline composer / Tiptap AI bubble ship
        // — a tiny "?" pill on the AI output corner that opens the
        // explanation panel. Reuses the same `.is-collapsed` toggle on
        // `insightGrid` + aria-expanded mirroring across detailsToggle, so
        // every external integration that walks
        // `.demo-ai-refine-why-chip` keeps resolving (chip kept in DOM,
        // detached & hidden via CSS — same pattern v20260530a / Pass 50
        // used for the detached refineRow). The chip retains its
        // `data-rte-ai-dialog-action="refine-why"` for selector
        // compatibility; the icon-only button uses its own selector
        // `[data-rte-ai-dialog-action="why"]`.
        var refineWhyChip = document.createElement("button");
        refineWhyChip.type = "button";
        refineWhyChip.className = "secondary demo-ai-refine-chip demo-ai-refine-why-chip is-detached";
        refineWhyChip.innerText = "Why";
        refineWhyChip.title = "Show why this AI suggestion was generated";
        refineWhyChip.setAttribute("data-rte-ai-dialog-action", "refine-why");
        refineWhyChip.setAttribute("aria-expanded", "false");

        // Refine the *result*: the current AI output becomes the new
        // source (same as the Copy icon does post-result) with a short
        // instruction prepended that nudges the model toward the
        // requested transformation. Source field stays collapsed behind
        // the "Edit prompt" disclosure so the temporary instruction
        // doesn't visually clutter the dialog — users see Result before
        // and after the refinement, same shape Claude / ChatGPT / Notion
        // AI ship. If there is no result yet, the chips no-op (they're
        // hidden via .is-pre-result anyway, but the guard protects any
        // programmatic caller).
        function runRefinementInstruction(instruction) {
            if (!normalizeText(resultArea.value)) {
                return;
            }
            sourceArea.value = instruction + "\n\n" + resultArea.value;
            handleDialogSourceEdit();
            if (runButton && !runButton.disabled && runButton.onclick) {
                runButton.onclick();
            }
        }
        refineRetryChip.onclick = function () {
            if (runButton && !runButton.disabled && runButton.onclick) {
                runButton.onclick();
            }
        };
        refineShorterChip.onclick = function () {
            runRefinementInstruction("Rewrite to be noticeably shorter and more concise while keeping the meaning intact.");
        };
        refineLongerChip.onclick = function () {
            runRefinementInstruction("Expand with more supporting detail, examples, and depth while keeping the same voice.");
        };
        // 2026-05-29 (v20260529a): Why chip click handler mirrors the
        // detailsToggle that was previously the only entry point to the
        // insight grid. Toggle the same `.is-collapsed` class, mirror
        // aria-expanded across both nodes so screen readers see one
        // disclosure state regardless of which control the keyboard
        // landed on, and keep the detailsToggle's listener wired (we
        // hide it in CSS rather than removing the DOM node, so any
        // existing integration that walks `.demo-ai-details-toggle`
        // still has a node to find).
        refineWhyChip.onclick = function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var stillCollapsed = insightGrid.classList.toggle("is-collapsed");
            var isOpen = !stillCollapsed;
            refineWhyChip.setAttribute("aria-expanded", isOpen ? "true" : "false");
            if (whyButton && whyButton.setAttribute) {
                whyButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
                whyButton.classList.toggle("is-active", isOpen);
            }
            if (detailsToggle && detailsToggle.setAttribute) {
                detailsToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            }
        };
        whyButton.onclick = function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var stillCollapsed = insightGrid.classList.toggle("is-collapsed");
            var isOpen = !stillCollapsed;
            whyButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
            whyButton.classList.toggle("is-active", isOpen);
            if (refineWhyChip && refineWhyChip.setAttribute) {
                refineWhyChip.setAttribute("aria-expanded", isOpen ? "true" : "false");
            }
            if (detailsToggle && detailsToggle.setAttribute) {
                detailsToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
            }
        };

        var applyRow = append(grid, "div", "", "demo-actions-row demo-ai-apply-row");
        applyRow.setAttribute("role", "group");
        applyRow.setAttribute("aria-label", "Ask AI apply actions");
        var applyPlanButton = append(applyRow, "button", "", "is-primary");
        applyPlanButton.type = "button";
        applyPlanButton.disabled = true;
        applyPlanButton.setAttribute("data-rte-ai-dialog-action", "apply");
        // 2026-05-22 (v20260522a): surface the Ctrl/Cmd+Enter apply shortcut
        // on hover + to screen readers. Mirrors the Generate button's
        // affordance pattern (since v20260509j) — title attribute for
        // mouse users, aria-keyshortcuts for screen readers. The
        // dialog-level keydown handler (added below) fires this button
        // when the shortcut hits from anywhere in the dialog outside the
        // source textarea.
        applyPlanButton.title = "Apply AI suggestion (Ctrl+Enter)";
        applyPlanButton.setAttribute("aria-keyshortcuts", "Control+Enter");
        setReviewV2ButtonContent(applyPlanButton, "check", "Apply");
        var acceptSelectionButton = append(applyRow, "button", "", "");
        acceptSelectionButton.type = "button";
        acceptSelectionButton.disabled = !snapshot.hasSelection;
        acceptSelectionButton.setAttribute("data-rte-ai-dialog-action", "selection");
        setReviewV2ButtonContent(acceptSelectionButton, "check", "Replace selection");
        var previewSelectionButton = append(applyRow, "button", "", "secondary");
        previewSelectionButton.type = "button";
        previewSelectionButton.disabled = !snapshot.hasSelection;
        previewSelectionButton.setAttribute("data-rte-ai-dialog-action", "preview");
        setReviewV2ButtonContent(previewSelectionButton, "eyeOn", "Preview");
        var acceptBelowButton = append(applyRow, "button", "", "secondary");
        acceptBelowButton.type = "button";
        acceptBelowButton.setAttribute("data-rte-ai-dialog-action", "insert");
        setReviewV2ButtonContent(acceptBelowButton, "arrowRight", "Insert below");
        var acceptDocumentButton = append(applyRow, "button", "", "secondary");
        acceptDocumentButton.type = "button";
        acceptDocumentButton.setAttribute("data-rte-ai-dialog-action", "document");
        // 2026-05-20 (v20260520h): "Replace doc" → "Replace document". The
        // abbreviation read as developer shorthand; the full word costs ~28px
        // of horizontal real estate at the apply row, but this button only
        // appears behind the ⋯ More toggle so the row's spare space is
        // available. Vocabulary now matches getOperationPlanButtonLabel's
        // primary path ("Replace document") and the chat panel's secondary
        // button ("Replace document").
        setReviewV2ButtonContent(acceptDocumentButton, "checkAll", "Replace document");
        // 2026-05-08 (v20260508t): "More" toggle pinned just before Discard.
        // Hides Replace selection / Preview / Insert below / Replace doc by
        // default so the default surface only shows Apply (smart primary) +
        // Discard. Same pattern lives on chat assistant messages so both AI
        // windows share a vocabulary. Hidden buttons stay in the DOM and
        // keep their accessibility / recommended-action wiring intact.
        // 2026-05-24 (v20260524a): More toggle → icon-only kebab. Pre-pass
        // the toggle carried both the ⋯ glyph AND the "More" text label,
        // claiming ~70px on the apply row (icon + 4px gap + text + padding).
        // The kebab glyph is the universal "more options" affordance every
        // modern AI surface uses (Notion AI inline composer, ChatGPT inline
        // edit, Linear's command palette, Slack message hover) — the text
        // was redundant once a user recognised the dot row. Dropping the
        // label drops the toggle to a square 32px button and lets the
        // smart-primary Apply button claim the freed ~38px so its label
        // ("Replace selection" / "Apply 3 pending steps" / "Re-run from
        // source") never truncates at 440px frame width. Hover title +
        // aria-label still surface the long-form for affordance and
        // screen readers.
        var applyRowMoreToggle = append(applyRow, "button", "", "secondary demo-ai-apply-more-toggle is-icon-only");
        applyRowMoreToggle.type = "button";
        applyRowMoreToggle.setAttribute("data-rte-ai-dialog-action", "more");
        applyRowMoreToggle.setAttribute("aria-expanded", "false");
        applyRowMoreToggle.title = "More apply options";
        applyRowMoreToggle.setAttribute("aria-label", "More apply options");
        setReviewV2ButtonContent(applyRowMoreToggle, "more", "");
        applyRowMoreToggle.onclick = function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            var expanded = applyRow.classList.toggle("is-show-more");
            applyRowMoreToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        };

        // 2026-05-30 (v20260530a): reparent the iteration refine chips from
        // the detached refineRow into the apply row, inserting them just
        // before the kebab `applyRowMoreToggle` so DOM order reads:
        //   Apply (primary) → alt-apply buttons (hidden by default) →
        //   Try again → Shorter → Longer → ⋯ kebab
        // CSS hides the alt-apply buttons in the default non-`is-show-more`
        // state, so the visible default is:
        //   [Apply primary]  [↻ Try again] [↘ Shorter] [↗ Longer]  [⋯]
        // One cohesive action bar instead of two stacked rows — matches the
        // affordance Notion AI / Claude inline edit / Tiptap AI bubble ship.
        // 2026-05-20 (v20260520e) — Pass 58: refineWhyChip dropped from the
        // apply row reparent. The Why disclosure moved to the `?` icon
        // button anchored to the result-head corner (whyButton above) so
        // the rationale affordance sits next to the result it explains.
        // The chip itself stays detached + hidden (created with
        // `is-detached`) for selector compatibility.
        applyRow.insertBefore(refineRetryChip, applyRowMoreToggle);
        applyRow.insertBefore(refineShorterChip, applyRowMoreToggle);
        applyRow.insertBefore(refineLongerChip, applyRowMoreToggle);

        // 2026-05-09 (v20260509j): Discard trash button detached from the
        // visible apply row. The dialog frame already renders an X close
        // button at top-right via editor.createDialog, and the ESC
        // keydown handler dismisses on the keyboard — three close
        // affordances in the same dialog confused first-time users
        // about whether the trash meant "throw away the suggestion I
        // just applied" vs "close without applying" (the same
        // dual-affordance ambiguity earlier passes called out for the
        // kebab More toggle). Same shape Notion AI inline composer /
        // ChatGPT inline edit / Tiptap AI bubble use: the close X is
        // the single dismissal affordance. Kept as a detached node so
        // existing focus-traversal arrays (orderedButtons,
        // remainingButtons, actionButtons) and disable-state syncs noop
        // without each call site having to be split between detached
        // and live render paths. Saves ~30px of horizontal real estate
        // on the apply row.
        var rejectButton = document.createElement("button");
        rejectButton.type = "button";
        rejectButton.className = "secondary is-detached";
        rejectButton.setAttribute("data-rte-ai-dialog-action", "reject");
        setReviewV2ButtonContent(rejectButton, "trash", "Discard");

        // Keep a compact recommended-action strip in the dialog. The primary
        // button still carries the same recommendation, but this summary gives
        // keyboard and screen-reader users a stable place to confirm the next
        // step and available alternatives.
        var applyGuidance = document.createElement("div");
        applyGuidance.id = guidanceId;
        applyGuidance.className = "demo-ai-apply-guidance";
        applyGuidance.style.display = "none";
        applyGuidance.setAttribute("role", "group");
        applyGuidance.setAttribute("aria-label", "Best next step");
        var applyGuidanceHeader = append(applyGuidance, "div", "", "demo-ai-apply-guidance-header");
        var applyGuidanceTitle = append(applyGuidanceHeader, "span", "", "demo-ai-apply-guidance-title", "Next");
        var applyGuidanceBadge = append(applyGuidanceHeader, "span", "", "demo-ai-apply-guidance-badge");
        var applyGuidanceDetail = append(applyGuidance, "div", "", "demo-ai-apply-guidance-detail");
        grid.appendChild(applyGuidance);

        var status = append(grid, "div", "", "demo-ai-dialog-status");
        status.id = statusId;
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        status.setAttribute("aria-atomic", "true");

        var detailsToggle = append(grid, "button", "", "demo-ai-details-toggle", "Details");
        detailsToggle.type = "button";
        detailsToggle.setAttribute("aria-expanded", "false");
        detailsToggle.setAttribute("aria-controls", "rte-ai-details-" + dialogIdSuffix);
        detailsToggle.title = "Show why and the operation plan";

        var insightGrid = append(grid, "div", "", "demo-ai-insight-grid is-collapsed");
        insightGrid.id = detailsToggle.getAttribute("aria-controls");
        // 2026-05-29 (v20260529a): the Why chip created above (before
        // detailsToggle) shares the same disclosure target. Wire its
        // aria-controls now that the insightGrid id has been minted so
        // screen readers can announce the relationship from either
        // control. The detailsToggle node itself is hidden via CSS
        // (the chip is now the visible affordance) but kept in DOM
        // for selector compatibility.
        if (refineWhyChip && refineWhyChip.setAttribute) {
            refineWhyChip.setAttribute("aria-controls", insightGrid.id);
        }
        if (whyButton && whyButton.setAttribute) {
            whyButton.setAttribute("aria-controls", insightGrid.id);
        }

        // 2026-05-24 (v20260524a): reading order — Details disclosure and
        // its insight panel pulled above the Apply row so the flow reads
        // result → (optional) Why → Apply. Pre-pass the order was
        // result → Apply → status → Details, which forced users curious
        // about the rationale to scroll past the action buttons before
        // they could open the explanation. Same shape Notion AI inline
        // composer / Tiptap AI bubble / ChatGPT inline edit ship — the
        // "Why this change" affordance sits next to the suggestion, NOT
        // below the accept/reject controls. status stays where it is
        // (below applyRow) so transient feedback ("Apply succeeded",
        // "Generation failed") remains a quiet trailing line. The DOM
        // reordering is structural-only — every `var` reference above
        // still resolves, and every selector / focus-traversal walker
        // that targets `.demo-ai-details-toggle` / `.demo-ai-insight-grid`
        // keeps working. Customers who want the prior order back can
        // override with two `order` rules on `.demo-ai-dialog-grid > *`.
        grid.insertBefore(detailsToggle, applyRow);
        grid.insertBefore(insightGrid, applyRow);

        detailsToggle.onclick = function () {
            var isOpen = insightGrid.classList.toggle("is-collapsed");
            detailsToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
        };

        var reasonPanel = append(insightGrid, "div", "", "demo-ai-reason-panel");
        reasonPanel.setAttribute("role", "group");
        reasonPanel.setAttribute("aria-label", "AI rationale");
        append(reasonPanel, "label", "", "", "Why");
        var reasonCopy = append(reasonPanel, "div", "", "demo-ai-reason-copy", "The reason will appear here once a suggestion is generated.");

        var planPanel = append(insightGrid, "div", "", "demo-ai-plan-panel");
        planPanel.setAttribute("role", "group");
        planPanel.setAttribute("aria-label", "AI operation plan");
        append(planPanel, "label", "", "", "Plan");
        var planNote = document.createElement("div");
        var planStatus = append(planPanel, "div", "", "demo-ai-plan-status");
        var planStatusMessage = append(planStatus, "span", "", "demo-ai-plan-status-message");
        var planStatusAction = append(planStatus, "button", "", "secondary demo-ai-plan-status-action", "Re-run");
        planStatusAction.type = "button";
        planStatusAction.style.display = "none";
        planStatusAction.setAttribute("data-rte-ai-dialog-action", "rerun");
        var planSummary = append(planPanel, "div", "", "demo-ai-plan-summary");
        var planList = append(planPanel, "ul", "", "demo-ai-plan-list");

        function getDialogResolvedAction(mode) {
            var latest = dialoginner.__aiResolved;
            if (latest && latest.operations && latest.operations.length) {
                return latest;
            }
            return buildResolvedActionFromText(resultArea.value, mode, latest || null, latest ? latest.request : null, latest ? latest.action : null);
        }

        function populateDialogModes() {
            var modes = getDialogModes();
            modeSelect.innerHTML = "";
            // 2026-05-20 (v20260520g) — Pass 59: group the 7-mode picker
            // into 2 <optgroup> sections so the dropdown reads as one
            // semantic cluster per intent ("Edit text" vs "Transform")
            // instead of a flat alphabetical list. Pre-pass first-time
            // users met a single-column dropdown of 7 verbs ("Proofread /
            // Rewrite / Translate / Explain rewrite / Shorten / Expand /
            // Summarize") at the same visual weight — no hint that
            // Translate is a category-different operation from Proofread,
            // and no signal that Shorten/Expand are sibling intents.
            // Same shape Notion AI / CKEditor 5 / Linear command palette
            // ship — grouped action menus with section titles. Modes
            // without an explicit `group` fall into the "Edit text"
            // default so customer-registered legacy modes still appear.
            // 2026-05-20 (v20260520g): explicit group assignments — kept
            // here (not in `aiToolkitDialogModes`) because the default
            // mode list ships without `group` fields, so the JS guarantees
            // a sensible grouping even if no customer override applies. */
            var groupAssignments = {
                proofread: "Edit text",
                rewrite: "Edit text",
                shorten: "Edit text",
                expand: "Edit text",
                translate: "Transform",
                summarize: "Transform",
                justify: "Transform"
            };
            var groupOrder = ["Edit text", "Transform"];
            var groupedModes = {};
            var ungrouped = [];
            for (var giIndex = 0; giIndex < modes.length; giIndex++) {
                var mode = modes[giIndex];
                var groupName = mode.group || groupAssignments[mode.id] || "";
                if (!groupName) {
                    ungrouped.push(mode);
                    continue;
                }
                if (!groupedModes[groupName]) {
                    groupedModes[groupName] = [];
                    if (groupOrder.indexOf(groupName) === -1) {
                        groupOrder.push(groupName);
                    }
                }
                groupedModes[groupName].push(mode);
            }
            function appendOption(parent, mode) {
                var option = append(parent, "option", "", "", mode.title || mode.id);
                option.value = mode.id;
                // 2026-05-20 (v20260520c): per-option tooltip carrying the
                // mode description ("Clean up grammar...", "Rewrite for
                // clarity...") so hovering an option in the open picker
                // surfaces what it does. Same affordance Notion AI /
                // Linear / Slack composer dropdowns ship.
                if (mode.description) {
                    option.title = mode.description;
                }
            }
            for (var goIndex = 0; goIndex < groupOrder.length; goIndex++) {
                var bucket = groupedModes[groupOrder[goIndex]];
                if (!bucket || !bucket.length) continue;
                var group = append(modeSelect, "optgroup");
                group.label = groupOrder[goIndex];
                for (var bIndex = 0; bIndex < bucket.length; bIndex++) {
                    appendOption(group, bucket[bIndex]);
                }
            }
            for (var uIndex = 0; uIndex < ungrouped.length; uIndex++) {
                appendOption(modeSelect, ungrouped[uIndex]);
            }
            // 2026-05-19 (v20260519a): defensively force the first option
            // to be the selected one after populating. Without this the
            // <select> opens with selectedIndex=-1 in some host contexts
            // (observed when the dialog is created on a focus-traversal
            // path that disconnects the select briefly during append) so
            // `modeSelect.value` reads "" — and every downstream piece
            // that branches on `modeSelect.value === "translate"` etc.
            // sees an empty string. The first option is the visible
            // default anyway (browsers paint it selected on render); we
            // just need the DOM property to match so the title/caption/
            // language-visibility flows resolve at dialog-open. */
            if (modeSelect.options.length && modeSelect.selectedIndex < 0) {
                modeSelect.selectedIndex = 0;
            }
            populateTranslateLanguages();
            updateModeHelp();
        }

        function populateTranslateLanguages() {
            var languages = getTranslateLanguages();
            languageSelect.innerHTML = "";
            for (var index = 0; index < languages.length; index++) {
                var option = append(languageSelect, "option", "", "", languages[index].label || languages[index].value);
                option.value = languages[index].value || languages[index].label;
            }
            if (options.presetLanguage) {
                languageSelect.value = options.presetLanguage;
            }
            if (!languageSelect.value && languages.length) {
                languageSelect.value = languages[0].value || languages[0].label;
            }
        }

        function updateLanguageVisibility() {
            var showLanguage = modeSelect.value === "translate";
            languageField.style.display = showLanguage ? "" : "none";
            if (compactControls && compactControls.classList) {
                compactControls.classList.toggle("is-no-language", !showLanguage);
            }
        }

        // 2026-05-19 (v20260519a): build the trailing scope+scale tail
        // (" · On selection, 124 chars") for the pre-result mode caption.
        // Reads sourceArea.value when present (user typed/loaded text),
        // else falls back to the captured snapshot at the requested scope.
        // Returns "" if there's nothing to operate on yet (empty source
        // with no snapshot), so the caption stays clean on a fresh-open
        // dialog with no editor selection.
        // 2026-05-22 (v20260522a): tightened the wording from the verbose
        // " · On selection, 124 chars" to "Selection · 124 chars" so
        // updateModeHelp can swap the entire caption to the scope summary
        // (dropping the redundant mode description) once there's text to
        // run AI on. The leading " · " separator is no longer prepended
        // here; updateModeHelp owns the join.
        function buildModeContextSuffix() {
            if (!sourceArea) {
                return "";
            }
            var requestedScope = dialoginner.__aiSourceScope === "selection" ? "selection" : "document";
            var snapshot = dialoginner.__aiSnapshot;
            var liveText = sourceArea.value || "";
            var effectiveScope = requestedScope;
            var charCount = 0;
            if (liveText) {
                charCount = liveText.length;
                if (!dialoginner.__aiSourceLinkedToEditor) {
                    // User typed directly into the source area — show
                    // "Typed" so they know the scope toggle won't
                    // overwrite their input unless they click reload.
                    effectiveScope = "typed";
                }
            }
            else if (snapshot) {
                var fallback = requestedScope === "selection"
                    ? (snapshot.text || "")
                    : (snapshot.wholeText || "");
                charCount = fallback.length;
                if (requestedScope === "selection" && !snapshot.hasSelection) {
                    effectiveScope = "document";
                    charCount = (snapshot.wholeText || "").length;
                }
            }
            if (!charCount) {
                return "";
            }
            var countLabel = charCount > 999
                ? (Math.round(charCount / 100) / 10) + "K"
                : String(charCount);
            var scopeLabel;
            if (effectiveScope === "typed") {
                scopeLabel = "Typed prompt";
            }
            else if (effectiveScope === "selection") {
                scopeLabel = "Selection";
            }
            else {
                scopeLabel = "Document";
            }
            return scopeLabel + " · " + countLabel + " chars";
        }

        // 2026-05-19 (v20260519a): mirror the active AI mode into the
        // dialog frame's header title so the surface name reads as
        // "Ask AI · Proofread" / "Ask AI · Translate (Spanish)" instead
        // of the static "Ask AI". The header span was rendered by
        // __UI_CreateDialogFrame in rte.js as `.rte-dialog-header-text`
        // inside `.rte-dialog-header`, both children of dialoginner.
        // Falls back to the static title when no mode label resolves
        // (e.g. an extension registered a mode without a title).
        // 2026-05-20 (v20260520g) — Pass 59: append a one-line mode
        // description caption inside the dialog header, sibling to the
        // title span. Replaces the prior grid-row caption (kept detached
        // for selector compatibility) so the dialog saves ~21px of
        // pre-result vertical chrome (15px caption row + 6px grid gap)
        // and reads as one coherent surface card. Same idiom Notion AI
        // inline composer / Linear command palette / Slack composer ship
        // — title and one-line description share the header chrome, with
        // a thin "·" divider between them. The caption auto-hides
        // post-result via the `:not(.is-pre-result)` cascade on the
        // dialog grid (mirrored via dialoginner.classList toggle below).
        function ensureDialogHeaderCaption() {
            if (!dialoginner || !dialoginner.querySelector) {
                return null;
            }
            var header = dialoginner.querySelector("rte-dialog-header");
            if (!header) {
                return null;
            }
            var caption = header.querySelector(".rte-ai-dialog-header-caption");
            if (caption) return caption;
            caption = dialoginner.ownerDocument.createElement("span");
            caption.className = "rte-ai-dialog-header-caption";
            caption.setAttribute("aria-hidden", "true");
            // Insert after the title text so the natural reading order is
            // [title][divider+caption][close X]. The header's
            // `justify-content: space-between` (theme default) is overridden
            // for `.rte-panel-aiassist` headers in CSS so the caption sits
            // next to the title rather than drifting to the close X.
            var titleSpan = header.querySelector("rte-dialog-header-text");
            if (titleSpan && titleSpan.parentNode === header) {
                // 2026-05-20 (v20260520g) — Pass 59: drop the inline
                // `flex:999` that `__UI_CreateDialogFrame` sets on the
                // title span. Pre-pass the title would consume every
                // spare pixel in the header row, squeezing the new
                // caption span to a width of 0 (or below its content
                // width). With the title at natural width (`flex: 0 0
                // auto` via the override below), the caption can claim
                // the row's spare space and truncate gracefully when
                // both don't fit. The title is short ("Proofread",
                // "Translate (Spanish)") so giving it natural width
                // costs nothing visually but unblocks the caption.
                if (titleSpan.style) {
                    titleSpan.style.flex = "0 0 auto";
                    titleSpan.style.whiteSpace = "nowrap";
                }
                if (titleSpan.nextSibling) {
                    header.insertBefore(caption, titleSpan.nextSibling);
                } else {
                    header.appendChild(caption);
                }
            } else {
                header.appendChild(caption);
            }
            return caption;
        }

        function updateDialogFrameTitle(modeLabel) {
            if (!dialoginner || !dialoginner.querySelector) {
                return;
            }
            // __UI_CreateDialogFrame in rte.js renders the header as a
            // <rte-dialog-header> custom element containing a
            // <rte-dialog-header-text> custom element (NOT classes — the
            // CSS targets the tag name directly). The header is appended
            // to dialoginner and our content is appended after.
            var titleSpan = dialoginner.querySelector("rte-dialog-header rte-dialog-header-text")
                || dialoginner.querySelector("rte-dialog-header-text");
            if (!titleSpan) {
                return;
            }
            // 2026-05-31 (v20260531a): drop the "Ask AI · " prefix from the
            // visible title. Pre-pass the title row read as "Ask AI ·
            // Proofread" / "Ask AI · Translate (Spanish)" — but the gradient
            // AI toolbar button that opens this dialog already names the
            // surface, and the only thing changing across renders is the
            // active mode after the "·". The prefix was the third place
            // "Ask AI" landed in the same screen (toolbar button hover,
            // dialog header, and the Action select's surrounding panel).
            // Same shape Notion AI inline composer ("Improve writing"),
            // Claude inline edit ("Make shorter"), ChatGPT inline edit
            // ("Rewrite") use — the surface name is implied by entry
            // context; the title names ONLY the active mode. Falls back
            // to the configured surface name when no mode has resolved
            // yet (first paint before populateDialogModes returns), so
            // the dialog never opens with an empty title. Aria-label
            // keeps the full "Ask AI · Mode" form for screen readers
            // since that's the role-name they announce on dialog open;
            // visual users see the shorter form.
            var base = config.text_aiassist || "Ask AI";
            var resolvedLabel = modeLabel || "";
            if (resolvedLabel && modeSelect.value === "translate") {
                resolvedLabel = resolvedLabel + " (" + getTranslateLanguageLabel(languageSelect.value || "spanish") + ")";
            }
            titleSpan.innerText = resolvedLabel || base;
            if (dialoginner.setAttribute) {
                dialoginner.setAttribute("aria-label", resolvedLabel ? (base + " · " + resolvedLabel) : base);
            }
        }

        function updateModeHelp() {
            // 2026-05-08: visible mode-help paragraph removed from the
            // dialog. Same text now lives on the action select's title
            // attribute (browser tooltip) plus the detached modeHelp node
            // so downstream callers that read modeHelp.innerText still
            // resolve to the latest hint.
            var modes = getDialogModes();
            var helpText = "Run this AI mode against the current source text.";
            var modeLabel = "";
            for (var index = 0; index < modes.length; index++) {
                if (modes[index].id === modeSelect.value) {
                    modeLabel = modes[index].title || modes[index].id;
                    if (modes[index].id === "translate") {
                        helpText = (modes[index].description || "Prepare a translated draft in the selected language.") + " Current target: " + getTranslateLanguageLabel(languageSelect.value || "spanish") + ".";
                    }
                    else {
                        helpText = modes[index].description || "Run this AI mode against the current source text.";
                    }
                    break;
                }
            }
            // 2026-05-17 (v20260523a): caption reverts to the mode
            // DESCRIPTION as its single signal. Previously (v20260522a)
            // the caption swapped to a scope+count suffix once text was
            // loaded — but now the new labeled scope <select> shows
            // scope + count in its closed-state label ("Document · 124
            // chars"), so the caption is free to carry the discoverability
            // signal it was originally designed for: what the active mode
            // actually does ("Clean up grammar, spacing, and readability
            // issues.").
            //
            // Empty-source fresh-open still shows the same description;
            // post-result the caption stays hidden via the existing
            // `.demo-ai-dialog-grid:not(.is-pre-result) .demo-ai-mode-caption
            // { display: none }` rule.
            //
            // `buildModeContextSuffix` is still called below to keep its
            // detached node legacy intact (modeChip writes), so existing
            // integrations and the scopeHint readback path remain
            // wired without each call site needing to be split between
            // caption-fed and select-fed flows.
            modeHelp.innerText = helpText;
            if (modeSelect && modeSelect.setAttribute) {
                modeSelect.setAttribute("title", helpText);
            }
            // 2026-05-20 (v20260520g) — Pass 59: mirror the mode help text
            // into the dialog header subtitle so the description rides next
            // to the title instead of as a separate grid row. The grid-row
            // caption node (`modeHelp` / `.demo-ai-mode-caption`) is still
            // updated above so any external integration that reads
            // `modeHelp.innerText` keeps resolving — the node is moved
            // off-screen via CSS (`.is-detached-caption` class on the grid)
            // but stays writable. Helper text is wrapped in a thin "·"
            // separator that lives in CSS (`::before` on the caption), so
            // the JS only writes the bare description.
            var headerCaption = ensureDialogHeaderCaption();
            if (headerCaption) {
                headerCaption.innerText = helpText || "";
            }
            // 2026-05-19 (v20260519a): dialog frame title now reflects
            // the active mode ("Ask AI · Proofread" / "Ask AI · Translate
            // (Spanish)") instead of the static "Ask AI". Earlier baseline
            // forced the user's eye to read two pieces of info — the
            // frame title ("Ask AI") plus the Action dropdown ("Proofread")
            // — to know what the dialog was about to do. Same idiom Notion
            // AI / Linear's command palette use: the surface title names
            // the active command, not the surface category. The Action
            // dropdown remains the switcher; the frame title now mirrors
            // the dropdown value so both surfaces reinforce the same
            // signal at a glance. Zero vertical cost (rides on existing
            // dialog header).
            updateDialogFrameTitle(modeLabel);
            // 2026-05-17 (v20260517a): mode-aware source placeholder. The
            // generic "Type or paste text…" placeholder gave no signal
            // about what the active mode would do — same friction Notion AI
            // closes by saying "Tell AI what to write…" vs "Improve writing
            // for…" depending on the active command. Updating the
            // placeholder per mode is a near-zero-cost discoverability win
            // that costs no vertical real estate. */
            if (sourceArea && !sourceArea.value) {
                var modeId = modeSelect.value || "";
                var placeholders = {
                    proofread: "Paste text to proofread…",
                    rewrite: "Paste text to rewrite…",
                    shorten: "Paste text to shorten…",
                    expand: "Paste text to expand…",
                    summarize: "Paste text to summarize…",
                    translate: "Paste text to translate…",
                    justify: "Paste text to rewrite + explain…",
                    explain: "Paste text to explain…"
                };
                sourceArea.placeholder = placeholders[modeId] || "Type or paste text…";
            }
            // 2026-05-08 (v20260508s): refresh the header mode-name chip.
            // For Translate the chip carries the target language so users
            // see "Translate · Spanish" instead of just "Translate".
            if (modeChip) {
                var chipLabel = modeLabel || "";
                if (modeLabel && modeSelect.value === "translate") {
                    chipLabel = modeLabel + " · " + getTranslateLanguageLabel(languageSelect.value || "spanish");
                }
                modeChip.innerText = chipLabel;
                modeChip.style.display = chipLabel ? "" : "none";
            }
            updateLanguageVisibility();
        }

        function getOperationExecutionState(index) {
            return dialoginner.__aiOperationStates && dialoginner.__aiOperationStates["step-" + index]
                ? dialoginner.__aiOperationStates["step-" + index]
                : "";
        }

        function setOperationExecutionState(index, state) {
            dialoginner.__aiOperationStates = dialoginner.__aiOperationStates || {};
            dialoginner.__aiOperationStates["step-" + index] = state || "";
        }

        function expandDialogDetails() {
            if (insightGrid && insightGrid.classList && insightGrid.classList.contains("is-collapsed")) {
                insightGrid.classList.remove("is-collapsed");
                if (detailsToggle && detailsToggle.setAttribute) {
                    detailsToggle.setAttribute("aria-expanded", "true");
                }
            }
        }

        function markPlanStale(message, actionType) {
            dialoginner.__aiPlanStale = true;
            dialoginner.__aiPlanStaleReason = message || "Editor changed. Re-run to refresh.";
            dialoginner.__aiPlanStaleAction = actionType === "source" ? "source" : "editor";
            status.innerText = dialoginner.__aiPlanStaleReason;
            renderOperationPlan(dialoginner.__aiResolved);
            updatePreview();
            expandDialogDetails();
        }

        function getDialogSourceTextForScope(snapshotValue, scope) {
            if (!snapshotValue) {
                return "";
            }
            return scope === "selection"
                ? (snapshotValue.text || snapshotValue.wholeText || "")
                : (snapshotValue.wholeText || "");
        }

        function isDialogDetachedSelectionScopeActiveWithoutLiveSelection(snapshotValue, scope) {
            return scope === "selection"
                && (!snapshotValue || !snapshotValue.hasSelection)
                && !dialoginner.__aiSourceLinkedToEditor
                && !!normalizeText(sourceArea.value);
        }

        function buildDialogScopeHint(snapshotValue, scope) {
            if (scope === "selection") {
                return snapshotValue && snapshotValue.hasSelection
                    ? "Selection ready"
                    : (isDialogDetachedSelectionScopeActiveWithoutLiveSelection(snapshotValue, scope)
                        ? "Selection source loaded - select text to apply inline"
                        : "No selection - using whole document");
            }
            if (snapshotValue && snapshotValue.hasSelection) {
                return "Whole document loaded - selection available";
            }
            return "Whole document loaded";
        }

        function getDialogEffectiveSourceScope(snapshotValue, scope) {
            return scope === "selection" && snapshotValue && snapshotValue.hasSelection
                ? "selection"
                : "document";
        }

        function isSelectionDependentOperation(operation) {
            return !!operation && (operation.type === "preview-suggestion" || operation.type === "replace-selection");
        }

        function hasSelectionDependentOperations(operations, indexes) {
            var list = indexes && indexes.length ? indexes : null;
            if (!list) {
                for (var operationIndex = 0; operationIndex < operations.length; operationIndex++) {
                    if (isSelectionDependentOperation(operations[operationIndex])) {
                        return true;
                    }
                }
                return false;
            }
            for (var index = 0; index < list.length; index++) {
                if (isSelectionDependentOperation(operations[list[index]])) {
                    return true;
                }
            }
            return false;
        }

        function getDialogRunScope(snapshotValue) {
            var requestedScope = dialoginner.__aiSourceScope === "selection" ? "selection" : "document";
            return dialoginner.__aiSourceLinkedToEditor
                ? getDialogEffectiveSourceScope(snapshotValue, requestedScope)
                : requestedScope;
        }

        function getDialogActionScope(resolved, requestedScope, sourceScope) {
            if (dialoginner.__aiPlanStale) {
                return dialoginner.__aiSourceLinkedToEditor ? sourceScope : requestedScope;
            }
            if (resolved && resolved.request) {
                return resolved.request.scope === "selection" ? "selection" : "document";
            }
            return dialoginner.__aiSourceLinkedToEditor ? sourceScope : requestedScope;
        }

        function buildDialogScopeButtonAriaLabel(scopeId, snapshotValue, activeScope, selectionScopeHeld) {
            var useSelection = scopeId === "selection";
            if (useSelection) {
                if (selectionScopeHeld) {
                    return "Use selection. Active scope. Ask AI is keeping the current selection-based source. Select text to apply or reload it again.";
                }
                if (!snapshotValue || !snapshotValue.hasSelection) {
                    return "Use selection. Unavailable until text is selected.";
                }
                return activeScope === "selection"
                    ? "Use selection. Active scope. Ask AI is using the current selection."
                    : "Use selection. Available scope. Switch Ask AI to the current selection.";
            }
            return activeScope === "selection"
                ? "Use document. Available scope. Switch Ask AI to the whole document."
                : "Use document. Active scope. Ask AI is using the whole document.";
        }

        function syncDialogScopeUi() {
            var scope = dialoginner.__aiSourceScope === "selection" ? "selection" : "document";
            var effectiveScope = getDialogEffectiveSourceScope(dialoginner.__aiSnapshot, scope);
            var selectionScopeHeld = isDialogDetachedSelectionScopeActiveWithoutLiveSelection(dialoginner.__aiSnapshot, scope);
            var activeScope = selectionScopeHeld ? "selection" : effectiveScope;
            if (scopeHint) {
                scopeHint.innerText = buildDialogScopeHint(dialoginner.__aiSnapshot, scope);
            }
            if (loadSelectionButton) {
                loadSelectionButton.disabled = !dialoginner.__aiSnapshot || !dialoginner.__aiSnapshot.hasSelection;
            }
            if (loadSelectionButton && loadSelectionButton.setAttribute) {
                loadSelectionButton.setAttribute("aria-pressed", activeScope === "selection" ? "true" : "false");
                loadSelectionButton.setAttribute("aria-label", buildDialogScopeButtonAriaLabel("selection", dialoginner.__aiSnapshot, activeScope, selectionScopeHeld));
            }
            if (loadDocumentButton && loadDocumentButton.setAttribute) {
                loadDocumentButton.setAttribute("aria-pressed", activeScope === "document" ? "true" : "false");
                loadDocumentButton.setAttribute("aria-label", buildDialogScopeButtonAriaLabel("document", dialoginner.__aiSnapshot, activeScope, selectionScopeHeld));
            }
            // 2026-05-20 (v20260520i) — Pass 61: scope option labels drop the
            // " · 124 chars" / " · 2.4K chars" suffix. The source textarea
            // already paints a live `.demo-ai-source-counter` pill in its
            // bottom-left corner (since v20260603a) that shows the exact char
            // count as the user types or loads text — two signals delivering
            // the same fact was visual noise. The scope select now names the
            // scope only; the counter names the size. Same shape Notion AI
            // inline composer / Tiptap AI bubble ship — scope picker shows
            // scope name, size lives next to the input. Selection option is
            // still disabled when no editor selection was captured (surfaced
            // inside the dropdown rather than hidden behind hover tooltip);
            // the parenthetical "(none)" qualifier is preserved so the
            // disabled state reads as deliberate, not broken.
            if (scopeSelect) {
                var snap = dialoginner.__aiSnapshot;
                var hasSelection = !!(snap && snap.hasSelection);
                var docChars = snap ? (snap.wholeText || "").length : 0;
                scopeOptionSelection.disabled = !hasSelection;
                scopeOptionSelection.text = hasSelection
                    ? "Selection"
                    : "Selection (none)";
                scopeOptionDocument.text = "Document";
                scopeSelect.value = activeScope === "selection" ? "selection" : "document";
                scopeSelect.setAttribute("title", buildDialogScopeHint(snap, scope));
                // 2026-06-01 (v20260601a): swap the <select> for a quiet inline
                // caption whenever only one scope is valid (no editor selection
                // captured). The select rendered with a disabled "Selection
                // (none)" option felt like a picker that couldn't be picked —
                // hide it and surface the same Document scope info as plain
                // text so the user sees WHAT AI will run on without a chevron
                // promising a choice. When selection appears, the select
                // returns. is-scope-implicit on compactControls drives the CSS
                // toggle so both nodes stay in DOM.
                // 2026-05-20 (v20260520i) — Pass 61: caption mirrors the option
                // label — scope name only, no char-count suffix.
                if (scopeCaption) {
                    scopeCaption.innerText = "Document";
                }
                if (compactControls && compactControls.classList) {
                    if (hasSelection) {
                        compactControls.classList.remove("is-scope-implicit");
                    }
                    else {
                        compactControls.classList.add("is-scope-implicit");
                    }
                }
            }
        }

        function formatDialogScopeCount(n) {
            if (!n) return "0";
            if (n > 999) return (Math.round(n / 100) / 10) + "K chars";
            return n + " chars";
        }

        function markDialogSourceDetached() {
            dialoginner.__aiSourceLinkedToEditor = false;
        }

        function hasDialogSelectionContentChanged(previousSnapshot, liveSnapshot) {
            return normalizeText(previousSnapshot && previousSnapshot.text ? previousSnapshot.text : "")
                !== normalizeText(liveSnapshot && liveSnapshot.text ? liveSnapshot.text : "");
        }

        // 2026-05-13 (v20260513e): status messages trimmed of repeated
        // boilerplate. The earlier "The editor selection cleared. Re-run
        // Ask AI to refresh this suggestion." (62 chars) duplicated the
        // dialog title ("Ask AI") and stamped redundant articles. With
        // the status row sitting directly below the Result/Apply row,
        // the user already knows which dialog they're in — the message
        // just needs to name the thing that changed and the action.
        // Same shape ChatGPT inline edit / Notion AI status lines ship
        // ("Selection changed. Retry.", "Document edited. Refresh.").
        function getDialogEditorChangeMessage(scope, liveSnapshot, previousSnapshot) {
            if (scope === "selection") {
                if (previousSnapshot && previousSnapshot.hasSelection && liveSnapshot && !liveSnapshot.hasSelection) {
                    return "Selection cleared. Re-run to refresh.";
                }
                if (previousSnapshot && liveSnapshot && previousSnapshot.hasSelection && liveSnapshot.hasSelection
                    && areRangesEquivalent(previousSnapshot.range, liveSnapshot.range)
                    && hasDialogSelectionContentChanged(previousSnapshot, liveSnapshot)) {
                    return "Selection text changed. Re-run to refresh.";
                }
                return "Selection changed. Re-run to refresh.";
            }
            return "Document changed. Re-run to refresh.";
        }

        function getDialogSourceChangeMessage(sourceText) {
            return normalizeText(sourceText)
                ? "Source changed. Re-run to refresh."
                : "Source cleared. Reload from the editor or type source text before re-running.";
        }

        function getDialogModeChangeMessage() {
            return "Mode changed. Re-run to refresh.";
        }

        function getDialogLanguageChangeMessage(language) {
            return "Language → " + getTranslateLanguageLabel(language || "spanish") + ". Re-run to refresh.";
        }

        function getDialogScopeChangeMessage(scope) {
            return "Scope → " + (scope === "selection" ? "selection" : "document") + ". Re-run to refresh.";
        }

        function getDialogEditorReloadMessage(scope) {
            return "Reloaded from " + (scope === "selection" ? "selection" : "document") + ". Re-run to refresh.";
        }

        function getDialogDetachedEditorChangeMessage(scope, liveSnapshot, previousSnapshot) {
            if (scope === "selection") {
                if (previousSnapshot && previousSnapshot.hasSelection && liveSnapshot && !liveSnapshot.hasSelection) {
                    return "Selection cleared. Re-run to refresh.";
                }
                if (previousSnapshot && liveSnapshot && previousSnapshot.hasSelection && liveSnapshot.hasSelection
                    && areRangesEquivalent(previousSnapshot.range, liveSnapshot.range)
                    && hasDialogSelectionContentChanged(previousSnapshot, liveSnapshot)) {
                    return "Selection text changed. Re-run to refresh.";
                }
                return "Selection changed. Re-run to refresh.";
            }
            return "Document changed. Re-run to refresh.";
        }

        function getPendingOperationIndexes(operations) {
            var pending = [];
            for (var index = 0; index < operations.length; index++) {
                if (getOperationExecutionState(index) !== "done" && getOperationExecutionState(index) !== "skipped") {
                    pending.push(index);
                }
            }
            return pending;
        }

        function getDialogSinglePendingOperationType() {
            var operations = dialoginner.__aiResolved && dialoginner.__aiResolved.operations
                ? dialoginner.__aiResolved.operations
                : [];
            var pendingIndexes = getPendingOperationIndexes(operations);
            if (pendingIndexes.length !== 1) {
                return "";
            }
            var operation = operations[pendingIndexes[0]];
            return operation && operation.type ? operation.type : "";
        }

        function getDialogActionState() {
            var resolved = dialoginner.__aiResolved || null;
            var operations = resolved && resolved.operations ? resolved.operations : [];
            var pendingIndexes = getPendingOperationIndexes(operations);
            var requestedScope = dialoginner.__aiSourceScope === "selection" ? "selection" : "document";
            var sourceScope = getDialogEffectiveSourceScope(dialoginner.__aiSnapshot, requestedScope);
            var hasSelection = !!(dialoginner.__aiSnapshot && dialoginner.__aiSnapshot.hasSelection);
            var hasResult = !!normalizeText(resultArea.value);
            var actionScope = getDialogActionScope(resolved, requestedScope, sourceScope);
            var pendingSelectionDependent = hasSelectionDependentOperations(operations, pendingIndexes);
            return {
                hasSource: !!normalizeText(sourceArea.value),
                hasResult: hasResult,
                hasSelection: hasSelection,
                isStale: !!dialoginner.__aiPlanStale,
                requestedScope: requestedScope,
                scope: sourceScope,
                actionScope: actionScope,
                staleAction: dialoginner.__aiPlanStaleAction === "source" ? "source" : "editor",
                operations: operations,
                pendingIndexes: pendingIndexes,
                pendingSelectionDependent: pendingSelectionDependent,
                canApplyPlan: !!pendingIndexes.length && (!pendingSelectionDependent || hasSelection),
                canPreview: hasResult && actionScope === "selection" && hasSelection,
                canReplaceSelection: hasResult && actionScope === "selection" && hasSelection,
                canInsert: hasResult,
                canReplaceDocument: hasResult && actionScope === "document",
                pendingOperationType: pendingIndexes.length === 1 && operations[pendingIndexes[0]] && operations[pendingIndexes[0]].type
                    ? operations[pendingIndexes[0]].type
                    : ""
            };
        }

        function getDialogActionDetail(actionId, actionState) {
            actionState = actionState || getDialogActionState();
            if (actionId === "load-selection") {
                return actionState.hasSelection
                    ? "Reload the current editor selection into Ask AI."
                    : "Select text in the editor, then reload it into Ask AI.";
            }
            if (actionId === "load-document") {
                return "Reload the current editor document into Ask AI.";
            }
            if (actionId === "run") {
                return actionState.hasSource
                    ? "Generate a new AI suggestion from the current source text using the selected mode."
                    : "Load or type source text, then run Ask AI to generate a suggestion.";
            }
            if (actionId === "rerun") {
                return actionState.staleAction === "source"
                    ? "Refresh this suggestion from the current dialog source before applying it."
                    : "Refresh this suggestion from the current editor state before applying it.";
            }
            if (actionId === "copy-to-source") {
                return actionState.hasResult
                    ? "Copy the current AI result back into the source field before rerunning it."
                    : "Run Ask AI first, then copy the generated result back into the source field.";
            }
            if (actionId === "apply") {
                if (actionState.pendingIndexes.length > 1) {
                    return actionState.pendingSelectionDependent && !actionState.hasSelection
                        ? "Select text before applying this selection-based AI plan."
                        : "Run the remaining " + actionState.pendingIndexes.length + "-step AI plan directly in the editor.";
                }
                switch (actionState.pendingOperationType) {
                    case "preview-suggestion":
                        return actionState.hasSelection
                            ? "Show the prepared inline diff in the editor before deciding it."
                            : "Select text before previewing this prepared inline diff in the editor.";
                    case "replace-selection":
                        return actionState.hasSelection
                            ? "Replace the current selection with this prepared draft."
                            : "Select text before replacing it with this prepared draft.";
                    case "replace-document":
                        return "Replace the full document with this prepared draft.";
                    case "insert-below":
                        return actionState.hasSelection
                            ? "Insert this prepared draft below the current selection."
                            : "Insert this prepared draft below the current content.";
                    case "add-comment":
                        return "Add this prepared AI comment without rewriting the document body.";
                    default:
                        return "Run the prepared AI plan directly in the editor.";
                }
            }
            if (actionId === "selection") {
                return actionState.hasSelection
                    ? "Replace the current selection with this prepared draft."
                    : "Select text before replacing it with this prepared draft.";
            }
            if (actionId === "preview") {
                return actionState.hasSelection
                    ? "Show this change inline in the editor before deciding it."
                    : "Select text to preview this change inline in the editor.";
            }
            if (actionId === "insert") {
                return actionState.hasSelection
                    ? "Insert this prepared draft below the current selection."
                    : "Insert this prepared draft below the current content.";
            }
            if (actionId === "document") {
                return "Replace the full document with this prepared draft.";
            }
            if (actionId === "reject") {
                return "Dismiss this prepared suggestion without changing the document.";
            }
            return "";
        }

        function getDialogActionLabel(actionId, actionState) {
            actionState = actionState || getDialogActionState();
            if (actionId === "load-selection") {
                return "Use selection";
            }
            if (actionId === "load-document") {
                return "Whole document";
            }
            if (actionId === "selection") {
                return actionState.hasSelection ? "Replace selection" : "Select text to replace";
            }
            if (actionId === "preview") {
                // 2026-05-20 (v20260520h): "Preview inline" → "Preview" for
                // dialog action labels. See getOperationPlanButtonLabel.
                return actionState.hasSelection ? "Preview" : "Select text to preview";
            }
            return "";
        }

        function getDialogReadyCoveredActions(actionState, recommended) {
            var covered = {};
            if (!recommended || !recommended.actionId) {
                return covered;
            }
            if (recommended.actionId === "apply") {
                switch (actionState.pendingOperationType) {
                    case "preview-suggestion":
                        covered.preview = true;
                        break;
                    case "replace-selection":
                        covered.selection = true;
                        break;
                    case "replace-document":
                        covered.document = true;
                        break;
                    case "insert-below":
                        covered.insert = true;
                        break;
                }
                return covered;
            }
            covered[recommended.actionId] = true;
            return covered;
        }

        function addDialogReadyAlternative(alternatives, covered, actionId, label) {
            if (!label || covered[actionId]) {
                return;
            }
            for (var index = 0; index < alternatives.length; index++) {
                if ((alternatives[index] || "").toLowerCase() === label.toLowerCase()) {
                    return;
                }
            }
            alternatives.push(label);
        }

        function formatDialogReadyAlternatives(alternatives) {
            if (!alternatives || !alternatives.length) {
                return "";
            }
            if (alternatives.length === 1) {
                return alternatives[0];
            }
            if (alternatives.length === 2) {
                return alternatives[0] + " or " + alternatives[1];
            }
            return alternatives.slice(0, alternatives.length - 1).join(", ") + ", or " + alternatives[alternatives.length - 1];
        }

        function getDialogReadyAlternativeLabels(actionState, recommended) {
            actionState = actionState || getDialogActionState();
            if (!actionState.hasResult || actionState.isStale) {
                return [];
            }
            if (actionState.actionScope === "selection" && !actionState.hasSelection) {
                return ["select text to apply inline"];
            }
            var alternatives = [];
            var covered = getDialogReadyCoveredActions(actionState, recommended);
            var pendingOperationType = actionState.pendingOperationType || "";
            if (actionState.actionScope === "selection") {
                if (actionState.hasSelection && pendingOperationType !== "preview-suggestion") {
                    addDialogReadyAlternative(alternatives, covered, "preview", "preview inline");
                }
                if (actionState.hasSelection && pendingOperationType !== "replace-selection") {
                    addDialogReadyAlternative(alternatives, covered, "selection", "replace the selection");
                }
                if (actionState.canInsert && pendingOperationType !== "insert-below") {
                    addDialogReadyAlternative(alternatives, covered, "insert", "insert below");
                }
                return alternatives;
            }
            if (actionState.actionScope === "document") {
                if (actionState.canReplaceDocument && pendingOperationType !== "replace-document") {
                    addDialogReadyAlternative(alternatives, covered, "document", "replace the document");
                }
                if (actionState.canInsert && pendingOperationType !== "insert-below") {
                    addDialogReadyAlternative(alternatives, covered, "insert", "insert below");
                }
            }
            return alternatives;
        }

        function getDialogReadyStatusMessage(actionState) {
            // 2026-05-08 (v20260508s): trimmed from a 2-3 sentence help
            // paragraph to a one-line "Ready · <next step>" pill so the
            // status bar stops dominating the bottom of the dialog. The
            // longer alternative-actions copy still lives on each apply
            // button's title/aria-label for screen readers and hover.
            actionState = actionState || getDialogActionState();
            var recommended = getDialogRecommendedActionInfo(actionState);
            var recommendedLabel = recommended && recommended.label
                ? (recommended.label || "").replace(/\s+/g, " ").trim()
                : "";
            if (recommendedLabel) {
                return "Ready · " + recommendedLabel;
            }
            if (actionState.actionScope === "selection" && !actionState.hasSelection) {
                return "Ready · Insert below";
            }
            return "Ready";
        }

        function getDialogRecommendedSummaryDetail(actionState, recommended) {
            actionState = actionState || getDialogActionState();
            recommended = recommended || getDialogRecommendedActionInfo(actionState);
            var detail = recommended && recommended.detail ? (recommended.detail || "").replace(/\s+/g, " ").trim() : "";
            var alternativeText = formatDialogReadyAlternatives(getDialogReadyAlternativeLabels(actionState, recommended));
            if (alternativeText) {
                detail += (detail ? " " : "") + "Other available actions: " + alternativeText + ".";
            }
            return detail;
        }

        function syncDialogApplyRowOrder(recommended) {
            if (!applyRow || !applyRow.appendChild) {
                return;
            }
            // 2026-05-30 (v20260530a): include the refine chips and the kebab
            // "More" toggle in the ordered list so this function's
            // `appendChild` re-shuffle preserves the intended row layout:
            //   [Apply primary] → [alt-apply hidden] →
            //   [refine chips] → [kebab] → [reject detached]
            // Pre-pass the array only listed the apply-family buttons, so
            // appendChild moved them to the end of the row and pushed the
            // refine chips + kebab to the front — exactly the layout bug a
            // post-pass live check surfaced (Apply at x=789, refine-retry
            // at x=494 inside a 420px row). Including the chips + kebab
            // keeps the visible default reading as:
            //   [Apply primary]  [Try again] [Shorter] [Longer] [Why ▸]  [⋯]
            var orderedButtons = [
                applyPlanButton, acceptSelectionButton, previewSelectionButton,
                acceptBelowButton, acceptDocumentButton,
                refineRetryChip, refineShorterChip, refineLongerChip, refineWhyChip,
                applyRowMoreToggle, rejectButton
            ];
            if (recommended && recommended.button && recommended.button.parentNode === applyRow) {
                orderedButtons = [recommended.button];
                var remainingButtons = [
                    applyPlanButton, acceptSelectionButton, previewSelectionButton,
                    acceptBelowButton, acceptDocumentButton,
                    refineRetryChip, refineShorterChip, refineLongerChip, refineWhyChip,
                    applyRowMoreToggle, rejectButton
                ];
                for (var buttonIndex = 0; buttonIndex < remainingButtons.length; buttonIndex++) {
                    if (remainingButtons[buttonIndex] !== recommended.button) {
                        orderedButtons.push(remainingButtons[buttonIndex]);
                    }
                }
            }
            for (var index = 0; index < orderedButtons.length; index++) {
                if (orderedButtons[index] && orderedButtons[index].parentNode === applyRow) {
                    applyRow.appendChild(orderedButtons[index]);
                }
            }
        }

        function syncDialogActionButtonAccessibility(button, actionId, actionState, isRecommended) {
            if (!button) {
                return;
            }
            var label = (button.innerText || button.textContent || "").replace(/\s+/g, " ").trim() || getDialogActionLabel(actionId, actionState) || "Action";
            var detail = getDialogActionDetail(actionId, actionState);
            var recommendedInfo = isRecommended ? {
                actionId: actionId,
                label: label,
                detail: detail
            } : null;
            var alternativeText = recommendedInfo
                ? formatDialogReadyAlternatives(getDialogReadyAlternativeLabels(actionState, recommendedInfo))
                : "";
            var parts = [label];
            if (detail) {
                parts.push(detail);
            }
            if (alternativeText) {
                parts.push("Other available actions: " + alternativeText + ".");
            }
            if (isRecommended) {
                parts.push("Recommended next step.");
                button.setAttribute("data-rte-ai-dialog-recommended", "true");
            }
            else {
                button.removeAttribute("data-rte-ai-dialog-recommended");
            }
            button.setAttribute("aria-label", parts.join(". "));
            var titleParts = [label];
            if (detail) {
                titleParts.push(detail);
            }
            if (alternativeText) {
                titleParts.push("Other available actions: " + alternativeText + ".");
            }
            if (isRecommended) {
                titleParts.push("Recommended next step.");
            }
            // 2026-05-22 (v20260522a): preserve any pre-set keyboard shortcut
            // hint on the button by reading aria-keyshortcuts (the WAI-ARIA
            // attribute set at button-create time for Generate / Apply).
            // Without this, the dynamic title rewrite below would drop the
            // "(Ctrl+Enter)" suffix added at button creation, so the
            // shortcut would only be discoverable via screen-reader
            // announcement of aria-keyshortcuts and never via mouse hover.
            // Formatting matches the Generate button's pre-existing title
            // suffix ("Generate AI suggestion (Ctrl+Enter)").
            var keyHint = button.getAttribute && button.getAttribute("aria-keyshortcuts");
            if (keyHint) {
                var keyHintLabel = keyHint
                    .replace(/Control\+/gi, "Ctrl+")
                    .replace(/Meta\+/gi, "Cmd+");
                titleParts.push("(" + keyHintLabel + ")");
            }
            button.title = titleParts.join(" - ");
        }

        function getDialogRecommendedActionInfo(actionState) {
            actionState = actionState || getDialogActionState();
            var canLoadSelectionSource = !!normalizeText(getDialogSourceTextForScope(dialoginner.__aiSnapshot, "selection"))
                && !!(dialoginner.__aiSnapshot && dialoginner.__aiSnapshot.hasSelection);
            var canLoadDocumentSource = !!normalizeText(getDialogSourceTextForScope(dialoginner.__aiSnapshot, "document"));
            if (!actionState.hasSource) {
                var preferredLoadButton = actionState.scope === "selection" ? loadSelectionButton : loadDocumentButton;
                var preferredLoadActionId = actionState.scope === "selection" ? "load-selection" : "load-document";
                var preferredLoadAvailable = preferredLoadActionId === "load-selection" ? canLoadSelectionSource : canLoadDocumentSource;
                if (preferredLoadAvailable && preferredLoadButton && !preferredLoadButton.disabled) {
                    return {
                        actionId: preferredLoadActionId,
                        button: preferredLoadButton,
                        label: getDialogActionLabel(preferredLoadActionId, actionState) || "Load source",
                        detail: getDialogActionDetail(preferredLoadActionId, actionState)
                    };
                }
                if (canLoadDocumentSource && loadDocumentButton && !loadDocumentButton.disabled) {
                    return {
                        actionId: "load-document",
                        button: loadDocumentButton,
                        label: (loadDocumentButton.innerText || loadDocumentButton.textContent || "").replace(/\s+/g, " ").trim() || "Whole document",
                        detail: getDialogActionDetail("load-document", actionState)
                    };
                }
                if (canLoadSelectionSource && loadSelectionButton && !loadSelectionButton.disabled) {
                    return {
                        actionId: "load-selection",
                        button: loadSelectionButton,
                        label: (loadSelectionButton.innerText || loadSelectionButton.textContent || "").replace(/\s+/g, " ").trim() || "Use selection",
                        detail: getDialogActionDetail("load-selection", actionState)
                    };
                }
            }
            if (actionState.isStale && planStatusAction && planStatusAction.style.display !== "none" && !planStatusAction.disabled) {
                return {
                    actionId: "rerun",
                    button: planStatusAction,
                    label: (planStatusAction.innerText || planStatusAction.textContent || "").replace(/\s+/g, " ").trim() || (actionState.staleAction === "source" ? "Re-run from source" : "Re-run from editor"),
                    detail: getDialogActionDetail("rerun", actionState)
                };
            }
            if (!actionState.hasResult && runButton && !runButton.disabled && normalizeText(sourceArea.value)) {
                return {
                    actionId: "run",
                    button: runButton,
                    label: "Ask AI",
                    detail: getDialogActionDetail("run", actionState)
                };
            }
            if (actionState.pendingIndexes.length && applyPlanButton && !applyPlanButton.disabled) {
                return {
                    actionId: "apply",
                    button: applyPlanButton,
                    label: (applyPlanButton.innerText || applyPlanButton.textContent || "").replace(/\s+/g, " ").trim() || "Apply",
                    detail: getDialogActionDetail("apply", actionState)
                };
            }
            if (previewSelectionButton && previewSelectionButton.style.display !== "none" && !previewSelectionButton.disabled) {
                return {
                    actionId: "preview",
                    button: previewSelectionButton,
                    label: (previewSelectionButton.innerText || previewSelectionButton.textContent || "").replace(/\s+/g, " ").trim() || "Preview",
                    detail: getDialogActionDetail("preview", actionState)
                };
            }
            if (acceptSelectionButton && acceptSelectionButton.style.display !== "none" && !acceptSelectionButton.disabled) {
                return {
                    actionId: "selection",
                    button: acceptSelectionButton,
                    label: (acceptSelectionButton.innerText || acceptSelectionButton.textContent || "").replace(/\s+/g, " ").trim() || "Replace selection",
                    detail: getDialogActionDetail("selection", actionState)
                };
            }
            if (acceptDocumentButton && acceptDocumentButton.style.display !== "none" && !acceptDocumentButton.disabled) {
                return {
                    actionId: "document",
                    button: acceptDocumentButton,
                    label: (acceptDocumentButton.innerText || acceptDocumentButton.textContent || "").replace(/\s+/g, " ").trim() || "Replace document",
                    detail: getDialogActionDetail("document", actionState)
                };
            }
            if (acceptBelowButton && acceptBelowButton.style.display !== "none" && !acceptBelowButton.disabled) {
                return {
                    actionId: "insert",
                    button: acceptBelowButton,
                    label: (acceptBelowButton.innerText || acceptBelowButton.textContent || "").replace(/\s+/g, " ").trim() || "Insert below",
                    detail: getDialogActionDetail("insert", actionState)
                };
            }
            return null;
        }

        function syncDialogRecommendedActionUi(actionState) {
            actionState = actionState || getDialogActionState();
            var recommended = getDialogRecommendedActionInfo(actionState);
            syncDialogApplyRowOrder(recommended);
            var actionButtons = [loadSelectionButton, loadDocumentButton, runButton, copyButton, planStatusAction, applyPlanButton, acceptSelectionButton, previewSelectionButton, acceptBelowButton, acceptDocumentButton, rejectButton];
            for (var index = 0; index < actionButtons.length; index++) {
                var button = actionButtons[index];
                var actionId = button && button.getAttribute ? button.getAttribute("data-rte-ai-dialog-action") || (button === planStatusAction ? "rerun" : "") : "";
                syncDialogActionButtonAccessibility(button, actionId, actionState, !!(recommended && button === recommended.button));
            }
            // 2026-05-20 (v20260520a): when the smart-primary recommendation
            // is an alternative apply action (Replace doc / Insert below /
            // Replace selection / Preview) because applyPlanButton is
            // disabled — typically post-result with no editor selection —
            // promote the recommended alt to the visible primary slot and
            // hide the dimmed disabled Apply. Pre-pass the apply row sat
            // with a faded blue "Select text to preview" (disabled) as the
            // only visible primary, while the actually-actionable Replace
            // doc / Insert below were hidden behind the "More" toggle. Same
            // shape Notion AI / ChatGPT inline edit / Tiptap AI bubble ship:
            // the visible primary always names a doable next step. The
            // `is-alt-recommended` class on the apply row is the hook the
            // CSS uses to re-skin the recommended button as primary blue and
            // suppress the disabled Apply.
            if (applyRow && applyRow.classList) {
                var altRecommended = !!(recommended && recommended.actionId && recommended.actionId !== "apply"
                    && recommended.button && recommended.button.parentNode === applyRow
                    && applyPlanButton && applyPlanButton.disabled);
                applyRow.classList.toggle("is-alt-recommended", altRecommended);
            }
            if (!recommended) {
                applyGuidance.style.display = "none";
                applyGuidanceBadge.innerText = "";
                applyGuidanceDetail.innerText = "";
                applyGuidance.setAttribute("aria-label", "No recommended Ask AI follow-up action yet.");
                return;
            }
            applyGuidance.style.display = "";
            applyGuidanceTitle.innerText = "Best next step";
            applyGuidanceBadge.innerText = recommended.label || "";
            var summaryDetail = getDialogRecommendedSummaryDetail(actionState, recommended);
            applyGuidanceDetail.innerText = summaryDetail || "";
            applyGuidance.setAttribute("aria-label", "Best next step: " + (recommended.label || "Action") + "." + (summaryDetail ? " " + summaryDetail : ""));
        }

        function rerunDialogPlanFromEditor() {
            var scope = dialoginner.__aiSourceScope || (dialoginner.__aiSnapshot && dialoginner.__aiSnapshot.hasSelection ? "selection" : "document");
            refreshSource(scope);
            runButton.onclick();
        }

        function rerunDialogPlanFromSource() {
            runButton.onclick();
        }

        function executeDialogOperations(operations, message) {
            if (!operations || !operations.length) {
                return false;
            }
            var handled = executeOperations(operations, { snapshot: dialoginner.__aiSnapshot, resolved: dialoginner.__aiResolved });
            if (handled) {
                status.innerText = message || "Applied the selected AI step.";
            }
            return handled;
        }

        function renderOperationPlan(resolved) {
            var operations = resolved && resolved.operations ? resolved.operations : [];
            var actionState = getDialogActionState();
            planList.innerHTML = "";
            planStatusMessage.innerText = dialoginner.__aiPlanStale
                ? (dialoginner.__aiPlanStaleReason || "Editor changed. Re-run to refresh.")
                : "";
            var isMissingSourceForRerun = dialoginner.__aiPlanStaleAction === "source" && !normalizeText(sourceArea.value);
            planStatusAction.innerText = dialoginner.__aiPlanStaleAction === "source"
                ? "Re-run from source"
                : "Re-run from editor";
            planStatusAction.style.display = dialoginner.__aiPlanStale && !isMissingSourceForRerun ? "" : "none";
            planStatusAction.disabled = isMissingSourceForRerun;
            planStatus.className = dialoginner.__aiPlanStale
                ? "demo-ai-plan-status is-stale"
                : "demo-ai-plan-status";
            if (!operations.length) {
                var emptyItem = append(planList, "li", "", "demo-ai-plan-item is-empty");
                append(emptyItem, "span", "", "demo-ai-plan-type", "No plan yet");
                append(emptyItem, "span", "", "demo-ai-plan-copy", "Run Ask AI to see the steps the editor will apply.");
                planSummary.innerText = "";
                planStatusAction.style.display = "none";
                applyPlanButton.disabled = true;
                applyPlanButton.innerText = "Apply";
                return;
            }

            var doneCount = 0;
            var skippedCount = 0;
            for (var index = 0; index < operations.length; index++) {
                var operation = operations[index];
                var display = getOperationDisplayMeta(operation);
                var item = append(planList, "li", "", "demo-ai-plan-item");
                var header = append(item, "div", "", "demo-ai-plan-header");
                append(header, "span", "", "demo-ai-plan-type", display.title);
                var stepState = getOperationExecutionState(index);
                if (stepState) {
                    append(header, "span", "", "demo-ai-plan-state is-" + stepState, stepState === "done" ? "Applied" : "Skipped");
                    if (stepState === "done") {
                        doneCount++;
                    }
                    else if (stepState === "skipped") {
                        skippedCount++;
                    }
                }
                var copy = display.copy;
                if (operation.reason) {
                    copy += " Reason: " + operation.reason;
                }
                append(item, "span", "", "demo-ai-plan-copy", copy);
                var actions = append(item, "div", "", "demo-ai-plan-actions");
                if (stepState !== "done") {
                    var selectionStepBlocked = isSelectionDependentOperation(operation) && !actionState.hasSelection;
                    var runStepLabel = selectionStepBlocked ? getSelectionRequiredPlanButtonLabel([operation]) : getSingleOperationPlanButtonLabel(operation);
                    var runStepButton = append(actions, "button", "", "secondary demo-ai-plan-button", runStepLabel);
                    runStepButton.type = "button";
                    runStepButton.disabled = !!dialoginner.__aiPlanStale || selectionStepBlocked;
                    syncPlanButtonAccessibility(
                        runStepButton,
                        runStepLabel,
                        getPlanOperationButtonDetail(operation, actionState),
                        dialoginner.__aiPlanStale
                            ? "Currently unavailable until Ask AI is rerun."
                            : (selectionStepBlocked ? "Currently unavailable until text is selected in the editor." : "")
                    );
                    runStepButton.onclick = (function (stepIndex, stepOperation, stepTitle) {
                        return function () {
                            if (executeDialogOperations([stepOperation], "Applied \"" + stepTitle + "\".")) {
                                setOperationExecutionState(stepIndex, "done");
                                markPlanStale("Applied \"" + stepTitle + "\". Re-run to refresh the remaining plan.", "editor");
                            }
                        };
                    })(index, operation, display.title);
                }
                if (stepState !== "done") {
                    var skipButton = append(actions, "button", "", "secondary demo-ai-plan-button", stepState === "skipped" ? "Include step" : "Skip step");
                    skipButton.type = "button";
                    skipButton.disabled = !!dialoginner.__aiPlanStale;
                    syncPlanButtonAccessibility(
                        skipButton,
                        skipButton.innerText || skipButton.textContent || "Skip step",
                        stepState === "skipped"
                            ? "Add this step back into the pending AI plan."
                            : "Skip this step from the pending AI plan.",
                        dialoginner.__aiPlanStale ? "Currently unavailable until Ask AI is rerun." : ""
                    );
                    skipButton.onclick = (function (stepIndex, isSkipped) {
                        return function () {
                            setOperationExecutionState(stepIndex, isSkipped ? "" : "skipped");
                            status.innerText = isSkipped ? "Included the step back into the pending AI plan." : "Skipped this step from the pending AI plan.";
                            renderOperationPlan(dialoginner.__aiResolved);
                        };
                    })(index, stepState === "skipped");
                }
            }

            var pendingIndexes = getPendingOperationIndexes(operations);
            var pendingOperations = [];
            for (var pendingIndex = 0; pendingIndex < pendingIndexes.length; pendingIndex++) {
                pendingOperations.push(operations[pendingIndexes[pendingIndex]]);
            }
            planSummary.innerText = pendingIndexes.length + " pending"
                + " \u2022 " + doneCount + " applied"
                + " \u2022 " + skippedCount + " skipped";
            applyPlanButton.disabled = !pendingIndexes.length || !!dialoginner.__aiPlanStale || !actionState.canApplyPlan;
            if (dialoginner.__aiPlanStale) {
                applyPlanButton.innerText = "Re-run to refresh plan";
            }
            else if (!pendingIndexes.length) {
                applyPlanButton.innerText = "No pending steps";
            }
            else if (actionState.pendingSelectionDependent && !actionState.hasSelection) {
                applyPlanButton.innerText = getSelectionRequiredPlanButtonLabel(pendingOperations);
            }
            else if (pendingIndexes.length === operations.length) {
                applyPlanButton.innerText = getOperationPlanButtonLabel(resolved);
            }
            else {
                applyPlanButton.innerText = "Apply " + pendingIndexes.length + " pending steps";
            }
        }

        function setBusyState(isBusy, message) {
            var text = message || "";
            runButton.disabled = !!isBusy || !normalizeText(sourceArea.value);
            copyButton.disabled = !!isBusy || !normalizeText(resultArea.value);
            loadSelectionButton.disabled = !!isBusy || !dialoginner.__aiSnapshot || !dialoginner.__aiSnapshot.hasSelection;
            loadDocumentButton.disabled = !!isBusy;
            if (scopeSelect) {
                scopeSelect.disabled = !!isBusy;
            }
            modeSelect.disabled = !!isBusy;
            sourceArea.readOnly = !!isBusy;
            planStatusAction.disabled = !!isBusy;
            applyPlanButton.disabled = !!isBusy || applyPlanButton.disabled;
            acceptSelectionButton.disabled = !!isBusy || acceptSelectionButton.disabled;
            previewSelectionButton.disabled = !!isBusy || previewSelectionButton.disabled;
            acceptBelowButton.disabled = !!isBusy || acceptBelowButton.disabled;
            acceptDocumentButton.disabled = !!isBusy || acceptDocumentButton.disabled;
            rejectButton.disabled = !!isBusy || rejectButton.disabled;
            var planButtons = planList.querySelectorAll ? planList.querySelectorAll(".demo-ai-plan-button") : [];
            for (var i = 0; i < planButtons.length; i++) {
                planButtons[i].disabled = !!isBusy;
            }
            // 2026-05-28 (v20260528b): refinement chips (Try again /
            // Shorter / Longer) ride the same busy gate as Generate.
            // While streaming a suggestion the chips would otherwise
            // accept clicks that queue a second runButton.onclick before
            // the first stream resolves — same race the Generate button
            // guards against. Disable all three for the duration of the
            // request; updatePreview re-enables them once a result is
            // present (and hides them again pre-result via CSS).
            if (refineRetryChip) refineRetryChip.disabled = !!isBusy || !normalizeText(resultArea.value);
            if (refineShorterChip) refineShorterChip.disabled = !!isBusy || !normalizeText(resultArea.value);
            if (refineLongerChip) refineLongerChip.disabled = !!isBusy || !normalizeText(resultArea.value);
            // 2026-05-29 (v20260529a): Why chip is a disclosure (no
            // network round-trip), but rides the busy gate so the chip
            // strip reads as a uniform cluster — all 4 chips share the
            // same disabled-while-thinking opacity drop. Once the
            // suggestion lands, Why re-enables independent of result
            // text presence (insight grid may still carry stale
            // reason/plan content from the prior run).
            if (refineWhyChip) refineWhyChip.disabled = !!isBusy;
            // 2026-05-20 (v20260520e) — Pass 58: whyButton (`?` pill on the
            // result corner) mirrors the detached refineWhyChip's busy gate
            // so the visible disclosure dims while AI is regenerating.
            if (whyButton) whyButton.disabled = !!isBusy;
            // 2026-05-15 (v20260515e): Generate button now carries the busy
            // affordance directly — spinner glyph + "Thinking..." label, same
            // idiom the AI Chat send button has used since v20260508. The
            // earlier build only disabled the button and showed "Generating
            // suggestion..." text in the status row below the apply row, so
            // the user's eye (which is on the button they just clicked) saw
            // nothing change. With the inline spinner the busy state reads
            // at a glance; the status row stays empty so two copies of the
            // same fact don't compete. updatePreview() restores the idle
            // "Generate" / "Regenerate" label + sparkles glyph the moment
            // setBusyState(false) is called.
            if (isBusy) {
                runButton.classList.add("is-busy");
                setReviewV2ButtonContent(runButton, "spinner", "Thinking...");
            } else {
                runButton.classList.remove("is-busy");
            }
            status.innerText = text;
            syncDialogRecommendedActionUi();
        }

        function refreshSource(scope) {
            dialoginner.__aiSourceScope = scope === "selection" ? "selection" : "document";
            dialoginner.__aiSourceLinkedToEditor = true;
            dialoginner.__aiSnapshot = captureSelectionSnapshot();
            sourceArea.value = getDialogSourceTextForScope(dialoginner.__aiSnapshot, dialoginner.__aiSourceScope);
            dialoginner.__aiLastLinkedSourceText = sourceArea.value;
            // 2026-06-03 (v20260603a): scope toggle / live-sync just
            // rewrote the source field — refresh the bottom-left
            // char counter so it tracks the new loaded text.
            refreshSourceCounter();
            syncDialogScopeUi();
            updatePreview();
            // 2026-05-19 (v20260519a): scope/source just changed, so the
            // pre-result caption's "On selection, 124 chars" tail is
            // stale. Re-run updateModeHelp to refresh the suffix without
            // re-touching modeSelect.
            updateModeHelp();
        }

        function updatePreview() {
            var actionState = getDialogActionState();
            var hasResult = actionState.hasResult;
            var hasSource = actionState.hasSource;
            var isStale = actionState.isStale;
            // 2026-05-09 (v20260509j): mark the dialog grid as
            // pre-result when no AI output has landed yet. CSS uses
            // this to collapse the empty Details toggle / insight grid
            // (pre-result there's nothing to disclose — clicking
            // Details would surface an empty Why panel + a "No plan
            // yet" placeholder, which is exactly the broken-feeling
            // affordance prior passes called out). The flag clears the
            // moment Generate produces output. Same idiom Notion AI /
            // Tiptap use — "Why this?" only appears once a suggestion
            // exists.
            if (grid && grid.classList) {
                if (hasResult || isStale) {
                    grid.classList.remove("is-pre-result");
                } else {
                    grid.classList.add("is-pre-result");
                }
            }
            // 2026-05-20 (v20260520g) — Pass 59: mirror the pre-result state
            // onto the dialog outer wrapper (the element carrying
            // `.rte-panel-aiassist`) so the header subtitle (which lives
            // inside the same dialog) can read the state via a same-element
            // selector. createDialog returns `dialoginner` (rte-dialog-inner)
            // whose parentNode is `rte-dialog-outer.rte-panel-aiassist`.
            // Pre-pass the only pre-result indicator was the `is-pre-result`
            // class on the grid; the header's caption needs to know the same
            // state to auto-hide post-result.
            var dialogOuter = dialoginner && dialoginner.parentNode;
            if (dialogOuter && dialogOuter.classList) {
                if (hasResult || isStale) {
                    dialogOuter.classList.remove("is-pre-result");
                } else {
                    dialogOuter.classList.add("is-pre-result");
                }
            }
            var pendingOperationType = actionState.pendingOperationType;
            var actionScope = hasResult || isStale ? actionState.actionScope : actionState.scope;
            var showsSelectionAction = actionScope === "selection" && pendingOperationType !== "replace-selection";
            var showsPreviewAction = actionScope === "selection" && pendingOperationType !== "preview-suggestion";
            var showsInsertAction = actionState.canInsert && pendingOperationType !== "insert-below";
            var showsDocumentAction = actionState.canReplaceDocument && pendingOperationType !== "replace-document";
            oldPreview.innerText = normalizeText(sourceArea.value) || "Load text from the editor to start a preview.";
            newPreview.innerText = hasResult ? resultArea.value : "Run Ask AI to generate a suggestion preview.";
            var primaryReasonText = getPrimaryResolvedReason(dialoginner.__aiResolved) || "";
            reasonCopy.innerText = primaryReasonText || "This suggestion does not include an explicit AI rationale yet.";
            renderOperationPlan(dialoginner.__aiResolved);
            // 2026-05-13 (v20260513b): Details toggle hidden when the
            // resolved action returned no rationale AND no operation plan.
            // Earlier the toggle was shown unconditionally post-result, but
            // for the common single-step proofread/rewrite flow (resolver
            // returns just `{result, operations}` with no `reason` and a
            // 1-step plan that's already implied by the smart Apply label)
            // expanding Details surfaced the placeholder "This suggestion
            // does not include an explicit AI rationale yet." + a single
            // "Replace selection" step — exactly the broken-feeling
            // affordance prior passes called out for the pre-result Details
            // and the empty Apply row. Same idiom Notion AI / Tiptap use —
            // "Why this?" only appears when the model actually returned a
            // reason. Multi-step agentic plans (where there ARE operations
            // worth exposing) keep the toggle. Hidden via inline style so
            // the same node can be flipped back the moment a richer
            // resolver returns content. */
            if (detailsToggle && detailsToggle.style) {
                var resolvedDialog = dialoginner.__aiResolved;
                var planOpCount = resolvedDialog && resolvedDialog.operations ? resolvedDialog.operations.length : 0;
                var hasDetailsContent = !!primaryReasonText || planOpCount > 1;
                detailsToggle.style.display = (hasResult && hasDetailsContent) ? "" : "none";
                if (!hasDetailsContent && insightGrid && insightGrid.classList && !insightGrid.classList.contains("is-collapsed")) {
                    insightGrid.classList.add("is-collapsed");
                    detailsToggle.setAttribute("aria-expanded", "false");
                }
            }
            acceptSelectionButton.innerText = getDialogActionLabel("selection", actionState) || "Replace selection";
            previewSelectionButton.innerText = getDialogActionLabel("preview", actionState) || "Preview";
            acceptSelectionButton.style.display = showsSelectionAction ? "" : "none";
            previewSelectionButton.style.display = showsPreviewAction ? "" : "none";
            acceptBelowButton.style.display = showsInsertAction ? "" : "none";
            acceptDocumentButton.style.display = showsDocumentAction ? "" : "none";
            // 2026-05-08 (v20260508t): hide the "More" toggle when none of
            // the four alt apply paths are applicable in the current state
            // (typically: no selection + no result yet). Otherwise users
            // would click "More" and get an empty reveal. When nothing to
            // reveal, also collapse the row so the next applicable state
            // starts clean.
            if (applyRowMoreToggle) {
                // 2026-05-20 (v20260520g) — Pass 59: surface the live count of
                // hidden apply options on the kebab's title + aria-label so
                // users discover *what's behind the dots* on hover or with a
                // screen reader, instead of clicking blind. Pre-pass the
                // tooltip read as "More apply options" — accurate but content-
                // free; now it reads "More apply options (3): Replace
                // selection, Insert below, Replace doc" so the count + the
                // names live where the affordance is. Same shape Notion AI's
                // command palette / Linear's command menu / Slack's kebab
                // overflow ship: the overflow trigger names its contents on
                // hover. The visible glyph stays the universal ⋯, so the
                // visual chrome is unchanged.
                var moreOptionNames = [];
                if (showsSelectionAction) moreOptionNames.push("Replace selection");
                if (showsPreviewAction) moreOptionNames.push("Preview");
                if (showsInsertAction) moreOptionNames.push("Insert below");
                if (showsDocumentAction) moreOptionNames.push("Replace document");
                var moreCount = moreOptionNames.length;
                var anyMoreAvailable = moreCount > 0;
                applyRowMoreToggle.style.display = anyMoreAvailable ? "" : "none";
                if (anyMoreAvailable) {
                    var moreTooltip = "More apply options (" + moreCount + "): " + moreOptionNames.join(", ");
                    applyRowMoreToggle.title = moreTooltip;
                    applyRowMoreToggle.setAttribute("aria-label", moreTooltip);
                    applyRowMoreToggle.setAttribute("data-rte-ai-more-count", String(moreCount));
                }
                if (!anyMoreAvailable && applyRow.classList.contains("is-show-more")) {
                    applyRow.classList.remove("is-show-more");
                    applyRowMoreToggle.setAttribute("aria-expanded", "false");
                }
            }
            acceptSelectionButton.disabled = isStale || !actionState.canReplaceSelection;
            previewSelectionButton.disabled = isStale || !actionState.canPreview;
            acceptBelowButton.disabled = isStale || !actionState.canInsert;
            acceptDocumentButton.disabled = isStale || !actionState.canReplaceDocument;
            runButton.disabled = !hasSource;
            copyButton.disabled = !hasResult;
            rejectButton.disabled = !hasResult;
            // 2026-05-08 (v20260508s): clarify the run button — when a
            // result already exists the button re-runs the same source, so
            // call it Regenerate. Also flips when the plan goes stale.
            var runLabel = (hasResult || isStale) ? "Regenerate" : "Generate";
            setReviewV2ButtonContent(runButton, "sparkles", runLabel);
            // 2026-05-17 (v20260517a): re-attach the keyboard hint chip,
            // since setReviewV2ButtonContent clears textContent and loses
            // the previous kbd span. */
            refreshRunKbdHint();
            syncDialogRecommendedActionUi(actionState);
        }

        function syncDialogFromEditor() {
            if (!dialoginner.isConnected || editor.__aiDialog !== dialoginner) {
                return;
            }

            var scope = dialoginner.__aiSourceScope === "selection" ? "selection" : "document";
            var isLinkedToEditor = !!dialoginner.__aiSourceLinkedToEditor;
            var previousSnapshot = dialoginner.__aiSnapshot || captureSelectionSnapshot();
            var liveSnapshot = captureSelectionSnapshot();
            var previousLiveSourceText = getDialogSourceTextForScope(previousSnapshot, scope);
            var liveSourceText = getDialogSourceTextForScope(liveSnapshot, scope);
            var selectionChanged = scope === "selection" && (
                !!previousSnapshot.hasSelection !== !!liveSnapshot.hasSelection
                || !areRangesEquivalent(previousSnapshot.range, liveSnapshot.range)
                || previousLiveSourceText !== liveSourceText
            );
            var editorSourceChanged = scope === "document"
                ? (previousSnapshot.wholeText || "") !== (liveSnapshot.wholeText || "")
                : selectionChanged;
            var uiChanged = editorSourceChanged || !!previousSnapshot.hasSelection !== !!liveSnapshot.hasSelection;

            dialoginner.__aiSnapshot = liveSnapshot;
            if (isLinkedToEditor) {
                dialoginner.__aiLastLinkedSourceText = liveSourceText;
            }

            if (!uiChanged) {
                return;
            }

            syncDialogScopeUi();

            if (isLinkedToEditor) {
                sourceArea.value = liveSourceText;
                // 2026-06-03 (v20260603a): live editor sync rewrote source —
                // keep the bottom-left char counter in sync.
                refreshSourceCounter();
                if (editorSourceChanged && normalizeText(resultArea.value) && !dialoginner.__aiPlanStale) {
                    markPlanStale(getDialogEditorChangeMessage(scope, liveSnapshot, previousSnapshot), "editor");
                    return;
                }
            }
            else if (editorSourceChanged && normalizeText(resultArea.value) && !dialoginner.__aiPlanStale) {
                markPlanStale(getDialogDetachedEditorChangeMessage(scope, liveSnapshot, previousSnapshot), "source");
                return;
            }

            updatePreview();
            // 2026-05-19 (v20260519a): live selection/document change in
            // the editor — refresh the caption tail with the new
            // scope/char count so the pre-result dialog tracks the
            // editor's current state.
            updateModeHelp();
        }

        function handleDialogSourceEdit() {
            markDialogSourceDetached();
            // 2026-06-03 (v20260603a): keep the bottom-left char counter
            // in sync with every keystroke / paste / programmatic write
            // into the source textarea. Cheap (.value.length) so safe
            // to fire on every input event.
            refreshSourceCounter();
            if (normalizeText(resultArea.value)) {
                markPlanStale(getDialogSourceChangeMessage(sourceArea.value), "source");
                return;
            }
            updatePreview();
            // 2026-05-19 (v20260519a): typed-prompt edits change the
            // caption's char count + flip the scope label from
            // selection/document to "typed prompt".
            updateModeHelp();
        }

        function handleDialogRequestChange(message) {
            if (normalizeText(resultArea.value)) {
                markPlanStale(message, "source");
                return;
            }
            updatePreview();
        }

        function handleDialogScopeChange(scope) {
            var targetScope = scope === "selection" ? "selection" : "document";
            var previousScope = dialoginner.__aiSourceScope === "selection" ? "selection" : "document";
            var previousSourceText = normalizeText(sourceArea.value);
            var wasLinkedToEditor = !!dialoginner.__aiSourceLinkedToEditor;

            refreshSource(targetScope);

            if (!normalizeText(resultArea.value)) {
                return;
            }

            var currentSourceText = normalizeText(sourceArea.value);
            if (previousScope !== targetScope) {
                markPlanStale(getDialogScopeChangeMessage(targetScope), "editor");
                return;
            }

            if (!wasLinkedToEditor || previousSourceText !== currentSourceText) {
                markPlanStale(getDialogEditorReloadMessage(targetScope), "editor");
            }
        }

        loadSelectionButton.onclick = function () {
            handleDialogScopeChange("selection");
        };

        loadDocumentButton.onclick = function () {
            handleDialogScopeChange("document");
        };

        // 2026-05-17 (v20260523a): visible scope select drives the same
        // handleDialogScopeChange path the detached buttons used. The
        // buttons still fire from their own onclick handlers above so
        // any external integration that programmatically clicks
        // `[data-rte-ai-dialog-action="load-selection"]` keeps working.
        if (scopeSelect) {
            scopeSelect.onchange = function () {
                handleDialogScopeChange(scopeSelect.value);
            };
        }

        planStatusAction.onclick = function () {
            if (dialoginner.__aiPlanStaleAction === "source") {
                rerunDialogPlanFromSource();
                return;
            }
            rerunDialogPlanFromEditor();
        };

        modeSelect.onchange = function () {
            updateModeHelp();
            handleDialogRequestChange(getDialogModeChangeMessage());
        };

        languageSelect.onchange = function () {
            updateModeHelp();
            handleDialogRequestChange(getDialogLanguageChangeMessage(languageSelect.value));
        };

        runButton.onclick = function () {
            var liveSnapshot = captureSelectionSnapshot();
            dialoginner.__aiSnapshot = liveSnapshot;
            if (dialoginner.__aiSourceLinkedToEditor) {
                sourceArea.value = getDialogSourceTextForScope(liveSnapshot, dialoginner.__aiSourceScope);
                dialoginner.__aiLastLinkedSourceText = sourceArea.value;
                // 2026-06-03 (v20260603a): generate-time re-link to editor
                // rewrote source — refresh char counter to match.
                refreshSourceCounter();
            }
            syncDialogScopeUi();
            if (!normalizeText(sourceArea.value)) {
                status.innerText = "Load or type source text before running Ask AI.";
                updatePreview();
                return;
            }
            // 2026-05-15 (v20260515e): empty status string — the Generate
            // button itself now flips to spinner + "Thinking..." (see
            // setBusyState above), so painting "Generating suggestion..."
            // in the status row below the apply row was a second copy of
            // the same fact. Same shape Notion AI inline composer / Tiptap
            // AI bubble ship: the action button carries the busy state,
            // no separate status string.
            setBusyState(true, "");
            resolveAction(modeSelect.value, {
                snapshot: liveSnapshot,
                source: sourceArea.value,
                scope: getDialogRunScope(liveSnapshot),
                mode: modeSelect.value,
                language: languageSelect.value
            }).then(function (resolved) {
                dialoginner.__aiResolved = resolved;
                dialoginner.__aiOperationStates = {};
                dialoginner.__aiPlanStale = false;
                dialoginner.__aiPlanStaleReason = "";
                dialoginner.__aiPlanStaleAction = "";
                resultArea.value = getPrimaryResolvedText(resolved) || "";
                updatePreview();
                // 2026-05-17 (v20260517a): the "Ready · Replace doc" message
                // that lived here duplicated the smart Apply button's label
                // — the apply row's primary already says "Replace doc" /
                // "Replace selection" / "Apply 3 pending steps" via the
                // syncDialogRecommendedActionUi pass. Showing the same fact
                // twice (once on the button, once in the status row below)
                // burned ~17px of vertical space without adding information.
                // Same shape Notion AI / Tiptap inline composers ship — the
                // primary button is the single source of "what AI suggests
                // you do next"; no echo strip below. Empty status hides
                // entirely via the `.demo-ai-dialog-status:empty` rule
                // (added 2026-05-09). The status row still surfaces actual
                // signal: stale-plan warnings (markPlanStale), error
                // messages from the resolver, and "No suggestion returned."
                // when the model produced empty output. */
                setBusyState(false, resultArea.value ? "" : "No suggestion returned.");
            }).catch(function (error) {
                console.error("AI Toolkit dialog run failed", error);
                dialoginner.__aiResolved = null;
                dialoginner.__aiOperationStates = {};
                dialoginner.__aiPlanStale = false;
                dialoginner.__aiPlanStaleReason = "";
                dialoginner.__aiPlanStaleAction = "";
                resultArea.value = "";
                updatePreview();
                setBusyState(false, "AI suggestion failed.");
            });
        };

        copyButton.onclick = function () {
            if (!normalizeText(resultArea.value)) {
                return;
            }
            sourceArea.value = resultArea.value;
            handleDialogSourceEdit();
        };

        sourceArea.oninput = function () {
            handleDialogSourceEdit();
        };

        // 2026-05-08 (v20260508s): Ctrl/Cmd+Enter from inside the Source
        // textarea triggers Generate. Matches the keyboard idiom used by
        // most modern AI dialogs (CKEditor, ChatGPT, Notion AI). The
        // hint is surfaced in the Source placeholder so users discover it.
        sourceArea.onkeydown = function (event) {
            if (!event) return;
            if ((event.ctrlKey || event.metaKey) && event.keyCode === 13) {
                event.preventDefault();
                if (runButton && !runButton.disabled && runButton.onclick) {
                    runButton.onclick();
                }
            }
        };

        applyPlanButton.onclick = function () {
            var operations = dialoginner.__aiResolved && dialoginner.__aiResolved.operations ? dialoginner.__aiResolved.operations : [];
            var pendingIndexes = getPendingOperationIndexes(operations);
            var pendingOperations = [];
            for (var i = 0; i < pendingIndexes.length; i++) {
                pendingOperations.push(operations[pendingIndexes[i]]);
            }
            if (pendingOperations.length && executeDialogOperations(pendingOperations, "Applied the pending AI plan.")) {
                for (var j = 0; j < pendingIndexes.length; j++) {
                    setOperationExecutionState(pendingIndexes[j], "done");
                }
                dialoginner.close();
            }
        };

        acceptSelectionButton.onclick = function () {
            if (executeResolvedAction(buildResolvedActionFromText(resultArea.value, "selection", getDialogResolvedAction("selection"), dialoginner.__aiResolved ? dialoginner.__aiResolved.request : null, dialoginner.__aiResolved ? dialoginner.__aiResolved.action : null), { snapshot: dialoginner.__aiSnapshot })) {
                dialoginner.close();
            }
        };

        previewSelectionButton.onclick = function () {
            var previewResolved = buildResolvedActionFromText(resultArea.value, "selection-preview", getDialogResolvedAction("selection-preview"), dialoginner.__aiResolved ? dialoginner.__aiResolved.request : null, dialoginner.__aiResolved ? dialoginner.__aiResolved.action : null);
            if (previewResolved && previewResolved.operations && previewResolved.operations[0] && !previewResolved.operations[0].reason) {
                previewResolved.operations[0].reason = getPrimaryResolvedReason(dialoginner.__aiResolved);
            }
            if (executeResolvedAction(previewResolved, { snapshot: dialoginner.__aiSnapshot })) {
                dialoginner.close();
            }
        };

        acceptBelowButton.onclick = function () {
            if (executeResolvedAction(buildResolvedActionFromText(resultArea.value, "insert", getDialogResolvedAction("insert"), dialoginner.__aiResolved ? dialoginner.__aiResolved.request : null, dialoginner.__aiResolved ? dialoginner.__aiResolved.action : null), { snapshot: dialoginner.__aiSnapshot })) {
                dialoginner.close();
            }
        };

        acceptDocumentButton.onclick = function () {
            if (executeResolvedAction(buildResolvedActionFromText(resultArea.value, "document", getDialogResolvedAction("document"), dialoginner.__aiResolved ? dialoginner.__aiResolved.request : null, dialoginner.__aiResolved ? dialoginner.__aiResolved.action : null), { snapshot: dialoginner.__aiSnapshot })) {
                dialoginner.close();
            }
        };

        rejectButton.onclick = function () {
            dialoginner.close();
        };

        // 2026-05-22 (v20260522a): dialog-level Ctrl/Cmd+Enter binding so
        // the keyboard shortcut works post-result outside the source
        // textarea. Pre-pass the only Ctrl+Enter binding lived on the
        // source textarea (since v20260508s, where it triggered Generate).
        // Once a result lands, users typically tab away from source to read
        // the result — pressing Ctrl+Enter from anywhere else in the
        // dialog used to do nothing. Now the same shortcut fires the
        // currently-active primary apply action: applyPlanButton when
        // enabled (the normal post-result case), else the alt-recommended
        // primary the v20260520a smart-primary pass surfaces (typically
        // Replace doc when there's no selection). When the source textarea
        // owns focus the binding short-circuits — the sourceArea handler
        // (Generate) continues to win, so source-edit + regenerate flow
        // is unchanged. Same shortcut idiom Notion AI / ChatGPT inline
        // edit / Tiptap AI bubble ship — Ctrl+Enter accepts the AI
        // suggestion from anywhere inside the suggestion surface.
        dialoginner.addEventListener("keydown", function (event) {
            if (!event) return;
            if (!((event.ctrlKey || event.metaKey) && event.keyCode === 13)) return;
            var target = event.target;
            if (target === sourceArea) return; // sourceArea owns Generate
            // Find the active primary apply button. If applyPlanButton is
            // visible+enabled, fire that. Otherwise look for the
            // alt-recommended button promoted to primary by
            // syncDialogRecommendedActionUi.
            var primary = null;
            if (applyPlanButton && !applyPlanButton.disabled && applyPlanButton.offsetParent !== null) {
                primary = applyPlanButton;
            }
            else if (applyRow && applyRow.classList && applyRow.classList.contains("is-alt-recommended")) {
                var recommended = applyRow.querySelector('[data-rte-ai-dialog-recommended="true"]:not([disabled])');
                if (recommended && recommended.offsetParent !== null) {
                    primary = recommended;
                }
            }
            if (primary && typeof primary.onclick === "function") {
                event.preventDefault();
                primary.onclick();
            }
        });

        dialoginner.__aiSourceLinkedToEditor = true;
        dialoginner.__aiLastLinkedSourceText = "";
        dialoginner.__aiSyncFromEditor = syncDialogFromEditor;
        bindAiToolkitLiveSyncTargets();
        refreshSource(options.useDocument ? "document" : (snapshot.hasSelection ? "selection" : "document"));
        updatePreview();
        if (options.autoRun) {
            runButton.onclick();
        }
        // 2026-05-09 (v20260509j): auto-focus Generate on dialog open
        // when source is pre-loaded (the common path — selection or
        // document was captured at open time). Users open the dialog
        // after selecting text and expect to hit Enter to generate
        // (muscle memory from Notion AI inline composer, Tiptap AI
        // bubble, ChatGPT inline edit, and every IDE command palette).
        // setTimeout(fn, 0) so the focus lands after createDialog's own
        // initial focus pass. When no source is loaded yet (rare —
        // only possible if the editor is empty AND document scope was
        // forced), focus falls back to the Action select so the user
        // can change mode or expand Source to type. Wrapped in
        // try/catch so customer button overrides can't break dialog
        // open.
        try {
            setTimeout(function () {
                try {
                    if (normalizeText(sourceArea.value) && runButton && !runButton.disabled && runButton.focus) {
                        runButton.focus();
                    } else if (sourceArea && sourceArea.focus) {
                        // 2026-05-17 (v20260517a): empty-source path now
                        // focuses the prompt textarea instead of the action
                        // select. Prior baseline landed focus on the
                        // mode dropdown — but the user has already picked
                        // a mode (either from the quick menu they just
                        // clicked through, or via the dialog open API).
                        // What they actually want next is to start
                        // typing their prompt. Landing focus on the
                        // textarea makes the caret blink in the empty
                        // input the user is about to fill — same shape
                        // Notion AI inline composer / ChatGPT inline edit
                        // / Tiptap AI bubble use. mode select is still
                        // one Shift+Tab away.
                        sourceArea.focus();
                    } else if (modeSelect && modeSelect.focus) {
                        modeSelect.focus();
                    }
                } catch (innerErr) { /* noop */ }
            }, 0);
        } catch (outerErr) { /* noop */ }
    }
}
