if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

RTE_DefaultConfig.plugin_yjscollab = RTE_Plugin_YjsCollab;

// Yjs collaboration — Option B scope:
//   • Awareness (live cursors + presence)
//   • Shared reviewLedger (AI suggestions, tracked changes, comments all sync)
//
// NOT in scope:
//   • Concurrent text editing (no content-level CRDT binding — see v1.1 / Option C)
//
// Yjs is a PEER DEPENDENCY. Customers load Y.Doc + a provider themselves; this plugin
// binds to whatever they pass in.
function RTE_Plugin_YjsCollab() {
    var obj = this;
    var config;
    var editor;
    var session = null; // { doc, provider, awareness, ledgerMap, user, cleanup[] }
    var remoteOrigin = {}; // sentinel used to tag ledger writes coming from Yjs
    var echoGuard = false;
    var overlay = null;
    var presencePanel = null;

    obj.PluginName = "YjsCollab";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.collabEnabled === false) return;

        config.collabLedgerMapName = config.collabLedgerMapName || "reviewLedger";
        config.collabShowPresence = config.collabShowPresence !== false;
        config.collabShowRemoteCursors = config.collabShowRemoteCursors !== false;
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.collabEnabled === false) return;

        editor.collab = {
            attach: function (options) { return attach(options); },
            detach: function () { return detach(); },
            isAttached: function () { return !!session; },
            getSession: function () { return session; },
            peers: function () { return session ? getRemotePeers() : []; },
            setUser: function (user) { if (session) updateLocalUser(user); }
        };

        injectStyles();
    };

    function attach(options) {
        if (session) detach();
        options = options || {};
        var doc = options.doc;
        var provider = options.provider;
        if (!doc || typeof doc.getMap !== "function") {
            console.warn("yjscollab: attach() requires a Y.Doc via options.doc");
            return null;
        }
        if (!provider || !provider.awareness) {
            console.warn("yjscollab: attach() requires a provider with an awareness field");
            return null;
        }

        var user = options.user || config.currentUser || { id: "user", name: "User", color: "#2563eb" };
        var ledgerMap = doc.getMap(config.collabLedgerMapName);

        // textSync modes:
        //   false / unset → awareness/presence/ledger only.
        //   true          → legacy shared-Y.Text snapshot mode (last-write-
        //                   wins on same-paragraph conflicts; kept for
        //                   back-compat).
        //   "crdt"        → per-node Yjs CRDT via crdt-engine.js. Falls
        //                   back to legacy mode (with console.warn) if
        //                   the engine bundle isn't loaded.
        var requestedTextSync = options.textSync;
        if (requestedTextSync === undefined) {
            requestedTextSync = config.collabTextSync === "crdt"
                ? "crdt"
                : (config.collabTextSync === true);
        }
        var textSyncMode;       // "off" | "legacy" | "crdt"
        var textMap = null;
        var crdtBinding = null;
        if (requestedTextSync === "crdt") {
            var Crdt = (typeof window !== "undefined") ? window.RichTextEditorCrdt : null;
            if (Crdt && typeof Crdt.attachCrdtBinding === "function") {
                textSyncMode = "crdt";
            } else {
                console.warn("yjscollab: textSync \"crdt\" requested but richtexteditor/plugins/crdt-engine.js is not loaded — falling back to legacy snapshot mode.");
                textSyncMode = "legacy";
                textMap = doc.getText(config.collabTextName || "richtextbox.body");
            }
        } else if (requestedTextSync === true) {
            textSyncMode = "legacy";
            textMap = doc.getText(config.collabTextName || "richtextbox.body");
        } else {
            textSyncMode = "off";
        }

        session = {
            doc: doc,
            provider: provider,
            awareness: provider.awareness,
            ledgerMap: ledgerMap,
            textMap: textMap,
            textSyncEnabled: textSyncMode !== "off",
            textSyncMode: textSyncMode,
            crdtBinding: crdtBinding,
            user: user,
            cleanup: []
        };

        // Set our initial awareness state.
        session.awareness.setLocalStateField("user", {
            id: user.id,
            name: user.name,
            color: user.color
        });

        // Subscribe to selection changes so our caret pos is broadcast.
        wireSelectionBroadcast();

        // Subscribe to awareness for remote peers.
        wireAwarenessSubscription();

        // Bridge reviewLedger <-> Y.Map.
        if (editor.reviewLedger) {
            wireLedgerBridge();
            seedLedgerFromRemote();
        }

        // Wire text sync per the requested mode. For "crdt" the engine
        // owns Y.XmlFragment ↔ DOM mirroring + selection preservation;
        // we retain awareness, presence panel, remote-cursor overlay,
        // and the review ledger bridge.
        if (session.textSyncMode === "crdt") {
            try {
                session.crdtBinding = window.RichTextEditorCrdt.attachCrdtBinding({
                    editable: editor.getEditable(),
                    ydoc: doc,
                    provider: provider,
                    awareness: provider.awareness,
                    fragmentName: options.fragmentName || "default",
                    // Forward the app's Yjs module so the engine builds nodes with
                    // the SAME Yjs instance as `doc` (avoids the dual-Yjs
                    // "Unexpected content type" crash). Falls back to window.Y.
                    Y: options.Y || (typeof window !== "undefined" ? window.Y : null)
                });
                session.cleanup.push(function () {
                    try { session.crdtBinding && session.crdtBinding.dispose(); }
                    catch (ignore) { }
                });
            } catch (err) {
                console.warn("yjscollab: CRDT engine attach failed; falling back to legacy mode.", err);
                session.textSyncMode = "legacy";
                session.textMap = doc.getText(config.collabTextName || "richtextbox.body");
                wireTextSync();
            }
        } else if (session.textSyncMode === "legacy" && session.textMap) {
            wireTextSync();
        }

        // Mount overlay + presence panel.
        if (config.collabShowRemoteCursors) mountOverlay();
        if (config.collabShowPresence) mountPresencePanel();
        renderPresence();
        renderRemoteCursors();

        return session;
    }

    function detach() {
        if (!session) return;
        for (var i = 0; i < session.cleanup.length; i++) {
            try { session.cleanup[i](); } catch (err) { }
        }
        try { session.awareness.setLocalState(null); } catch (ignore) { }
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
        if (presencePanel && presencePanel.parentNode) presencePanel.parentNode.removeChild(presencePanel);
        presencePanel = null;
        session = null;
    }

    function updateLocalUser(user) {
        if (!session) return;
        session.user = user;
        session.awareness.setLocalStateField("user", {
            id: user.id, name: user.name, color: user.color
        });
    }

    // --- awareness / selection broadcast ---

    function wireSelectionBroadcast() {
        var editdoc = editor.getDocument();
        var broadcast = function () {
            if (!session) return;
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0) {
                session.awareness.setLocalStateField("caret", null);
                return;
            }
            var range = sel.getRangeAt(0);
            var caret = serializeCaret(range);
            session.awareness.setLocalStateField("caret", caret);
        };
        editdoc.addEventListener("selectionchange", broadcast);
        editdoc.addEventListener("input", broadcast);
        session.cleanup.push(function () {
            editdoc.removeEventListener("selectionchange", broadcast);
            editdoc.removeEventListener("input", broadcast);
        });
    }

    // Serialize a caret as (blockIndex, offsetInBlock) — simple, robust under single-writer
    // assumptions (Option B scope). Falls back to viewport coordinates if the math fails.
    function serializeCaret(range) {
        var editable = editor.getEditable();
        var block = range.startContainer;
        while (block && block.parentNode !== editable) {
            if (!block.parentNode) return null;
            block = block.parentNode;
        }
        if (!block) return null;
        var blocks = Array.prototype.slice.call(editable.children);
        var blockIndex = blocks.indexOf(block);
        if (blockIndex < 0) return null;

        // Character offset inside this block.
        var offset = 0;
        var walker = editor.getDocument().createTreeWalker(block, NodeFilter.SHOW_TEXT);
        var n;
        while ((n = walker.nextNode())) {
            if (n === range.startContainer) {
                offset += range.startOffset;
                return { blockIndex: blockIndex, offset: offset, collapsed: range.collapsed };
            }
            offset += n.nodeValue.length;
        }
        // startContainer is not a text node — treat as start of block.
        return { blockIndex: blockIndex, offset: 0, collapsed: range.collapsed };
    }

    function deserializeCaret(caret) {
        if (!caret) return null;
        var editable = editor.getEditable();
        var block = editable.children[caret.blockIndex];
        if (!block) return null;
        var remaining = caret.offset;
        var walker = editor.getDocument().createTreeWalker(block, NodeFilter.SHOW_TEXT);
        var n;
        while ((n = walker.nextNode())) {
            if (remaining <= n.nodeValue.length) {
                var range = editor.getDocument().createRange();
                range.setStart(n, remaining);
                range.collapse(true);
                return range;
            }
            remaining -= n.nodeValue.length;
        }
        // Past the end — position at end of block.
        var range2 = editor.getDocument().createRange();
        range2.selectNodeContents(block);
        range2.collapse(false);
        return range2;
    }

    function wireAwarenessSubscription() {
        var handler = function () { renderRemoteCursors(); renderPresence(); };
        session.awareness.on("change", handler);
        session.cleanup.push(function () { session.awareness.off("change", handler); });
    }

    function getRemotePeers() {
        var map = session.awareness.getStates();
        var me = session.awareness.clientID;
        var peers = [];
        map.forEach(function (state, clientId) {
            if (clientId === me || !state || !state.user) return;
            peers.push({ clientId: clientId, user: state.user, caret: state.caret || null });
        });
        return peers;
    }

    // --- ledger bridge ---

    // ---- text sync (opt-in MVP) ----
    //
    // Treats the editor's full HTML as an opaque Y.Text string. CRDT merges
    // concurrent inserts/deletes at character level, so two users typing in
    // different parts of the document converge without losing either edit.
    //
    // Tradeoffs (documented, not fixed by this MVP):
    //   • Remote updates re-set the whole body → caret snaps back to start
    //   • HTML character offsets don't align with rendered caret offsets
    //   • Toolbar actions that mutate DOM sync on the next 250ms push, not instantly
    //
    // The production-grade binding is per-node (y-xml-fragment) and is planned.
    // This MVP closes the biggest procurement-checkbox gap today.
    function wireTextSync() {
        var applying = false;          // guard: we're pushing into the editor from Y.Text
        var pushing = false;           // guard: we're pushing into Y.Text from the editor
        var pendingPushTimer = null;
        var lastKnownHtml = null;

        function currentEditorHtml() {
            return editor && editor.getHTMLCode ? editor.getHTMLCode() : "";
        }

        // Capture the local caret as a serializable offset BEFORE we replace
        // the body, then restore it AFTER. With a whole-HTML-string sync, the
        // caret would otherwise snap to position 0 on every remote update.
        // We use a character offset into the textContent of the editable body —
        // it's not perfect (HTML structure changes can shift it) but it's
        // dramatically better than the unconditional jump-to-start behaviour.
        function captureCaretOffset() {
            try {
                var doc = editor.getDocument && editor.getDocument();
                var body = doc && doc.body;
                if (!body) return null;
                var sel = doc.getSelection ? doc.getSelection() : null;
                if (!sel || sel.rangeCount === 0) return null;
                var range = sel.getRangeAt(0);
                if (!body.contains(range.startContainer)) return null;
                var pre = doc.createRange();
                pre.selectNodeContents(body);
                pre.setEnd(range.startContainer, range.startOffset);
                return pre.toString().length;
            } catch (e) { return null; }
        }

        function restoreCaretOffset(offset) {
            if (offset == null) return;
            try {
                var doc = editor.getDocument && editor.getDocument();
                var body = doc && doc.body;
                if (!body) return;
                var walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
                var charsLeft = offset;
                var targetNode = null;
                var targetOffset = 0;
                while (walker.nextNode()) {
                    var node = walker.currentNode;
                    var len = node.nodeValue ? node.nodeValue.length : 0;
                    if (charsLeft <= len) {
                        targetNode = node;
                        targetOffset = charsLeft;
                        break;
                    }
                    charsLeft -= len;
                }
                if (!targetNode) {
                    // overflow — drop caret at end of body
                    var lastText = null;
                    var w2 = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
                    while (w2.nextNode()) lastText = w2.currentNode;
                    if (!lastText) return;
                    targetNode = lastText;
                    targetOffset = lastText.nodeValue.length;
                }
                var sel = doc.getSelection ? doc.getSelection() : null;
                if (!sel) return;
                var range = doc.createRange();
                range.setStart(targetNode, targetOffset);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) { /* swallow — best-effort caret restore */ }
        }

        function setEditorHtml(html) {
            if (!editor || !editor.setHTMLCode) return;
            var savedCaret = captureCaretOffset();
            applying = true;
            try { editor.setHTMLCode(html); }
            finally { applying = false; }
            // Restore on the next tick so the editor's own setHTMLCode finishes
            // its DOM swap + selection clearing before we reassert the caret.
            setTimeout(function () { restoreCaretOffset(savedCaret); }, 0);
        }

        // Initial sync: if Y.Text is empty, seed from the editor. Otherwise pull remote.
        var remoteInitial = session.textMap.toString();
        if (remoteInitial && remoteInitial.length > 0) {
            setEditorHtml(remoteInitial);
            lastKnownHtml = remoteInitial;
        } else {
            var localInitial = currentEditorHtml();
            if (localInitial) {
                session.textMap.insert(0, localInitial);
            }
            lastKnownHtml = localInitial;
        }

        // Y.Text → editor.
        var onTextChange = function (event, transaction) {
            if (pushing) return;
            // Ignore our own transactions — they're already in the editor.
            if (transaction && transaction.local) return;
            var fresh = session.textMap.toString();
            if (fresh === lastKnownHtml) return;
            setEditorHtml(fresh);
            lastKnownHtml = fresh;
            // 2026-05-28 setEditorHtml writes into editable.innerHTML; if that
            // path replaced the iframe body element (e.g. on first-paint after
            // a skin remount), our MutationObserver is now stranded on a
            // detached node. Re-attach to the live body.
            ensureMutationObserverAttached();
        };
        session.textMap.observe(onTextChange);
        session.cleanup.push(function () { session.textMap.unobserve(onTextChange); });

        // Editor DOM → Y.Text. Debounced so bursts collapse to one CRDT diff.
        var onEditorMutation = function () {
            if (applying) return;
            if (pendingPushTimer) return;
            // 2026-05-28 Re-attach observer if the body was remounted since last
            // mutation. Cheap no-op when body is unchanged.
            ensureMutationObserverAttached();
            pendingPushTimer = setTimeout(function () {
                pendingPushTimer = null;
                if (!session || !session.textMap) return;
                var current = currentEditorHtml();
                if (current === lastKnownHtml) return;

                // Minimal diff against lastKnownHtml — compute common prefix and
                // suffix so concurrent remote edits outside the local change
                // area are preserved. Not a full CRDT binding but it keeps us
                // from stomping on simultaneous work.
                var oldStr = lastKnownHtml || "";
                var newStr = current;
                var prefix = 0;
                var maxPrefix = Math.min(oldStr.length, newStr.length);
                while (prefix < maxPrefix && oldStr.charCodeAt(prefix) === newStr.charCodeAt(prefix)) prefix++;
                var suffix = 0;
                var maxSuffix = Math.min(oldStr.length - prefix, newStr.length - prefix);
                while (suffix < maxSuffix
                    && oldStr.charCodeAt(oldStr.length - 1 - suffix) === newStr.charCodeAt(newStr.length - 1 - suffix)) suffix++;

                var delLen = oldStr.length - prefix - suffix;
                var insStr = newStr.substring(prefix, newStr.length - suffix);

                pushing = true;
                try {
                    session.doc.transact(function () {
                        if (delLen > 0) session.textMap.delete(prefix, delLen);
                        if (insStr.length > 0) session.textMap.insert(prefix, insStr);
                    }, session.user && session.user.id);
                } finally {
                    pushing = false;
                    lastKnownHtml = newStr;
                }
            }, 250);
        };

        // Observe DOM mutations. The editor's iframe body is a moving target
        // (some rte skins remount it), so we re-attach when we notice the body
        // node changed since the last attach.
        var mutationObserver = null;
        var observedBody = null;
        function attachMutationObserver() {
            var editdoc = editor.getDocument && editor.getDocument();
            var body = editdoc && editdoc.body;
            if (!body || typeof MutationObserver !== "function") return;
            // Already attached to this exact body node? Nothing to do.
            if (mutationObserver && observedBody === body) return;
            // Body remounted (or first attach): disconnect old observer and
            // start a new one on the live body.
            if (mutationObserver) {
                try { mutationObserver.disconnect(); } catch (ignore) { }
                mutationObserver = null;
            }
            mutationObserver = new MutationObserver(onEditorMutation);
            mutationObserver.observe(body, { childList: true, characterData: true, subtree: true, attributes: true });
            observedBody = body;
        }
        attachMutationObserver();
        // 2026-05-28 Keep the observer alive across body remounts. Re-attach
        // is a no-op when the body is unchanged (cheap), so we can call it
        // whenever we might be about to write — guarantees the comment above
        // matches actual behavior.
        function ensureMutationObserverAttached() { attachMutationObserver(); }

        // Also push on blur as a safety net (mutation observer can miss compositionend in some edge cases).
        var blurHandler = function () { onEditorMutation(); };
        if (editor.attachEvent) editor.attachEvent("blur", blurHandler);

        session.cleanup.push(function () {
            if (pendingPushTimer) { clearTimeout(pendingPushTimer); pendingPushTimer = null; }
            if (mutationObserver) { mutationObserver.disconnect(); mutationObserver = null; }
            if (editor.detachEvent) { try { editor.detachEvent("blur", blurHandler); } catch (e) { } }
        });
    }

    function wireLedgerBridge() {
        var ledger = editor.reviewLedger;
        var originalAdd = ledger.add;
        var originalUpdate = ledger.update;
        var originalRemove = ledger.remove;

        ledger.add = function (entry) {
            var result = originalAdd.call(ledger, entry);
            if (result && !echoGuard) session.ledgerMap.set(result.id, cloneEntry(result));
            return result;
        };
        ledger.update = function (id, patch) {
            var result = originalUpdate.call(ledger, id, patch);
            if (result && !echoGuard) session.ledgerMap.set(result.id, cloneEntry(result));
            return result;
        };
        ledger.remove = function (id) {
            var result = originalRemove.call(ledger, id);
            if (result && !echoGuard) session.ledgerMap.delete(id);
            return result;
        };

        var observer = function (event) {
            echoGuard = true;
            try {
                event.keysChanged.forEach(function (key) {
                    var change = event.changes.keys.get(key);
                    if (!change) return;
                    if (change.action === "delete") {
                        originalRemove.call(ledger, key);
                    } else {
                        var value = session.ledgerMap.get(key);
                        if (!value) return;
                        // Upsert: remove any local copy first to avoid duplicate IDs mid-merge.
                        originalRemove.call(ledger, key);
                        originalAdd.call(ledger, value);
                    }
                });
            } finally {
                echoGuard = false;
            }
            if (ledger.refreshPanel) ledger.refreshPanel();
        };
        session.ledgerMap.observe(observer);
        session.cleanup.push(function () {
            session.ledgerMap.unobserve(observer);
            ledger.add = originalAdd;
            ledger.update = originalUpdate;
            ledger.remove = originalRemove;
        });
    }

    function seedLedgerFromRemote() {
        if (!editor.reviewLedger || !session.ledgerMap) return;
        echoGuard = true;
        try {
            session.ledgerMap.forEach(function (value, key) {
                // If not already local, add it.
                if (!editor.reviewLedger.get(key)) {
                    editor.reviewLedger.add(value);
                }
            });
        } finally {
            echoGuard = false;
        }
    }

    function cloneEntry(entry) {
        // JSON clone strips functions/refs; safe for Yjs sync.
        try { return JSON.parse(JSON.stringify(entry)); }
        catch (err) { return entry; }
    }

    // --- overlay / cursor rendering ---

    function mountOverlay() {
        if (overlay && overlay.parentNode) return;
        overlay = document.createElement("div");
        overlay.className = "rte-collab-overlay";
        overlay.setAttribute("aria-hidden", "true");
        document.body.appendChild(overlay);
        var reposition = function () { renderRemoteCursors(); };
        window.addEventListener("scroll", reposition, true);
        window.addEventListener("resize", reposition);
        session.cleanup.push(function () {
            window.removeEventListener("scroll", reposition, true);
            window.removeEventListener("resize", reposition);
        });
    }

    function renderRemoteCursors() {
        if (!session || !overlay) return;
        overlay.innerHTML = "";
        var peers = getRemotePeers();
        var iframe = editor.iframe;
        var ir = iframe.getBoundingClientRect();

        for (var i = 0; i < peers.length; i++) {
            var peer = peers[i];
            if (!peer.caret) continue;
            var range = null;
            try { range = deserializeCaret(peer.caret); } catch (ignore) { }
            if (!range) continue;
            var rects = range.getClientRects();
            var rect = rects && rects.length ? rects[0] : range.getBoundingClientRect();
            if (!rect || (!rect.top && !rect.left)) continue;

            var caretEl = document.createElement("div");
            caretEl.className = "rte-collab-caret";
            // Viewport coordinates (the overlay is position:fixed). Do NOT add
            // pageX/YOffset: a page-absolute caret inside an absolute overlay on
            // <body> extends document height on scrolled/tall pages and, with the
            // scroll re-render below, runs away (host page ballooned to ~83000px).
            caretEl.style.left = (ir.left + rect.left) + "px";
            caretEl.style.top = (ir.top + rect.top) + "px";
            caretEl.style.height = (rect.height || 18) + "px";
            caretEl.style.background = peer.user.color;

            var label = document.createElement("div");
            label.className = "rte-collab-caret-label";
            label.textContent = peer.user.name;
            label.style.background = peer.user.color;
            caretEl.appendChild(label);

            overlay.appendChild(caretEl);
        }
    }

    // --- presence panel ---

    function mountPresencePanel() {
        if (presencePanel && presencePanel.parentNode) return;
        presencePanel = document.createElement("div");
        presencePanel.className = "rte-collab-presence";
        var shell = getEditorShell();
        if (shell && shell.parentNode) {
            shell.parentNode.insertBefore(presencePanel, shell);
        } else {
            document.body.appendChild(presencePanel);
        }
    }

    function renderPresence() {
        if (!session || !presencePanel) return;
        presencePanel.innerHTML = "";
        var all = [{ user: session.user, self: true }].concat(
            getRemotePeers().map(function (p) { return { user: p.user, self: false }; })
        );
        var title = document.createElement("span");
        title.className = "rte-collab-presence-title";
        title.textContent = "Online (" + all.length + ")";
        presencePanel.appendChild(title);
        for (var i = 0; i < all.length; i++) {
            var u = all[i].user;
            var chip = document.createElement("span");
            chip.className = "rte-collab-presence-chip" + (all[i].self ? " is-self" : "");
            chip.style.background = u.color;
            chip.title = u.name + (all[i].self ? " (you)" : "");
            chip.textContent = initialsOf(u.name || u.id || "?");
            presencePanel.appendChild(chip);
        }
    }

    function getEditorShell() {
        var el = editor.iframe;
        while (el && el !== document.body) {
            if (el.classList && el.classList.contains("richtexteditor")) return el;
            el = el.parentNode;
        }
        return null;
    }

    function initialsOf(label) {
        var parts = String(label).trim().split(/\s+/);
        if (!parts[0]) return "?";
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    // --- styles ---

    function injectStyles() {
        if (document.querySelector("style[data-rte-collab]")) return;
        var style = document.createElement("style");
        style.setAttribute("data-rte-collab", "1");
        style.textContent = [
            ".rte-collab-overlay{position:fixed;top:0;left:0;pointer-events:none;z-index:2147482900}",
            ".rte-collab-caret{position:absolute;width:2px;pointer-events:none}",
            ".rte-collab-caret-label{position:absolute;top:-18px;left:0;padding:1px 6px;border-radius:4px;color:#fff;font:10px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;white-space:nowrap;font-weight:600;letter-spacing:.01em;box-shadow:0 1px 2px rgba(15,23,42,.15)}",
            ".rte-collab-presence{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px 10px 0 0;background:#f4f7ff;border:1px solid rgba(71,85,155,.15);border-bottom:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#33506f;margin:0}",
            ".rte-collab-presence-title{font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#475569}",
            ".rte-collab-presence-chip{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;color:#fff;font-size:10px;font-weight:700;box-shadow:0 0 0 2px #fff;letter-spacing:.02em}",
            ".rte-collab-presence-chip.is-self{outline:2px solid rgba(15,23,42,.25);outline-offset:1px}"
        ].join("\n");
        document.head.appendChild(style);
    }
}
