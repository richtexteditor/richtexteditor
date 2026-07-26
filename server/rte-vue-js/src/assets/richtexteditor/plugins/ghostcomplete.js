if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-06 AI ghost-text autocomplete. GitHub-Copilot / Notion-AI-style inline
// completion: after you pause typing, a greyed suggestion appears after the caret
// continuing your sentence; press Tab to accept it, Esc (or just keep typing) to
// dismiss. Distinct from the command-driven AI Toolkit — this is ambient,
// inline, and hands-free.
//
// Bring-your-own-key: supply config.ghostTextResolver(context) returning a string
// (or a Promise of one). `context` = { before, after, full } around the caret.
// Nothing ships a model or makes network calls on its own.
//
//   config.ghostText = true | { delayMs, minChars, maxContext }
//   config.ghostTextResolver = async ({ before }) => " the rest of the sentence"
//
// Serialization-safe: the suggestion lives in a contenteditable=false
// `<span class="rte-ghost">` decoration that is never part of the saved content —
// getHTMLCode / getJSON are wrapped to strip any ghost span, and the caret is
// always kept BEFORE the ghost so typing and saving behave normally.
RTE_DefaultConfig.plugin_ghostcomplete = RTE_Plugin_GhostComplete;
if (typeof RTE_DefaultConfig.ghostText === "undefined") RTE_DefaultConfig.ghostText = false;
if (typeof RTE_DefaultConfig.ghostTextResolver === "undefined") RTE_DefaultConfig.ghostTextResolver = null;

function RTE_Plugin_GhostComplete() {
    var obj = this;
    var config, editor;
    var opts = null, boundDoc = null, wrapped = false;
    var timer = null, reqToken = 0, busy = false;
    var ghostEl = null, ghostText = "";

    obj.PluginName = "GhostComplete";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        opts = (typeof config.ghostText === "object" && config.ghostText) ? config.ghostText : {};

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0); setTimeout(setup, 200);

        // Public API.
        editor.setGhostTextResolver = function (fn) { config.ghostTextResolver = (typeof fn === "function") ? fn : null; };
        editor.requestGhostText = function () {
            // Manual invocation (slash menu / API) with no resolver configured
            // used to be a silent no-op — surface a transient setup hint so
            // the user learns WHY nothing happened and how to enable it.
            if (typeof config.ghostTextResolver !== "function") { showSetupHint(); return; }
            scheduleRequest(0);
        };
        editor.acceptGhostText = function () { return accept(); };
        editor.dismissGhostText = function () { clearGhost(); };
        editor.hasGhostText = function () { return !!ghostEl; };
    };

    function enabled() { return !!config.ghostText && typeof config.ghostTextResolver === "function"; }

    function setup() {
        var doc = editor.getDocument(); if (!doc) return;
        injectStyles(doc);
        if (doc !== boundDoc) {
            doc.addEventListener("keydown", onKeyDown, true);
            doc.addEventListener("input", onInput, true);
            doc.addEventListener("mousedown", onPointerDown, true);
            // Touch devices have no Tab key — tapping the suggestion accepts it.
            doc.addEventListener("touchstart", onPointerDown, true);
            boundDoc = doc;
        }
        wrapSerializers();
    }

    function delayMs() { var n = opts && +opts.delayMs; return (n && n >= 0) ? n : 600; }
    function minChars() { var n = opts && +opts.minChars; return (n && n > 0) ? n : 3; }
    function maxContext() { var n = opts && +opts.maxContext; return (n && n > 0) ? n : 2000; }

    function onInput() {
        if (busy) return;
        clearGhost();           // any edit invalidates a showing suggestion
        if (!enabled()) return;
        scheduleRequest(delayMs());
    }

    function onKeyDown(e) {
        if (!ghostEl) {
            // Allow manual trigger: nothing here; ghost only shows after a pause.
            return;
        }
        if (e.key === "Tab") { e.preventDefault(); e.stopPropagation(); accept(); return; }
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); clearGhost(); return; }
        // Arrow / navigation keys dismiss; character keys are handled by onInput.
        if (/^Arrow|^Home$|^End$|^PageUp$|^PageDown$/.test(e.key)) { clearGhost(); }
    }

    // Pointer/touch on the suggestion accepts it (the only way on mobile, and a
    // handy shortcut on desktop); a pointer anywhere else dismisses it.
    function onPointerDown(e) {
        if (!ghostEl) return;
        var t = e.target;
        if (t === ghostEl || (ghostEl.contains && ghostEl.contains(t))) {
            e.preventDefault(); e.stopPropagation();
            accept();
        } else {
            clearGhost();
        }
    }

    function scheduleRequest(ms) {
        if (timer) { clearTimeout(timer); timer = null; }
        if (!enabled()) return;
        timer = setTimeout(runRequest, ms);
    }

    function runRequest() {
        timer = null;
        if (!enabled() || ghostEl) return;
        var ctx = caretContext();
        if (!ctx || ctx.before.replace(/\s/g, "").length < minChars()) return;

        var token = ++reqToken;
        var out;
        try { out = config.ghostTextResolver({ before: ctx.before, after: ctx.after, full: ctx.full }); }
        catch (e) { return; }

        Promise.resolve(out).then(function (text) {
            if (token !== reqToken) return;        // superseded by newer input
            if (ghostEl) return;                   // already showing
            if (typeof text !== "string") return;
            text = text.replace(/\r/g, "");
            if (!text) return;
            // Only show if the caret is still collapsed where we measured.
            showGhost(text);
        }, function () { /* resolver failed — stay silent */ });
    }

    // The text immediately around the caret (within the current block), trimmed
    // to maxContext characters of left-context.
    function caretContext() {
        try {
            var sel = editor.getSelection();
            if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return null;
            var editable = editor.getEditable(); if (!editable) return null;
            var r = sel.getRangeAt(0);
            // before = text from block start to caret; after = caret to block end.
            var block = blockOf(r.startContainer, editable) || editable;
            var beforeRange = r.cloneRange();
            beforeRange.setStart(block, 0);
            var afterRange = r.cloneRange();
            afterRange.setEnd(block, block.childNodes.length);
            var before = textOf(beforeRange);
            var after = textOf(afterRange);
            if (before.length > maxContext()) before = before.slice(before.length - maxContext());
            return { before: before, after: after, full: textOf(rangeOfNode(editable)) };
        } catch (e) { return null; }
    }

    function rangeOfNode(node) { var d = editor.getDocument(); var r = d.createRange(); r.selectNodeContents(node); return r; }
    function textOf(range) {
        try {
            var frag = range.cloneContents();
            // strip any ghost spans from the measured text
            var ghosts = frag.querySelectorAll ? frag.querySelectorAll(".rte-ghost") : [];
            for (var i = 0; i < ghosts.length; i++) ghosts[i].parentNode.removeChild(ghosts[i]);
            var tmp = editor.getDocument().createElement("div");
            tmp.appendChild(frag);
            return tmp.textContent || "";
        } catch (e) { return ""; }
    }
    function blockOf(node, editable) {
        var n = (node && node.nodeType === 3) ? node.parentNode : node;
        while (n && n !== editable) {
            if (n.nodeType === 1 && /^(P|H[1-6]|LI|BLOCKQUOTE|PRE|TD|TH|DIV|FIGCAPTION)$/.test(n.nodeName)) return n;
            n = n.parentNode;
        }
        return null;
    }

    function showGhost(text) {
        var doc = editor.getDocument(), sel = editor.getSelection();
        if (!doc || !sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
        busy = true;
        try {
            var r = sel.getRangeAt(0);
            var span = doc.createElement("span");
            span.className = "rte-ghost";
            span.setAttribute("contenteditable", "false");
            span.setAttribute("data-rte-ghost", "1");
            // The suggestion is unconfirmed, predicted text — hide it from the
            // accessibility tree so screen readers don't read it as real content.
            span.setAttribute("aria-hidden", "true");
            span.textContent = text;
            r.insertNode(span);
            ghostEl = span; ghostText = text;
            // keep the caret BEFORE the ghost so typing/saving are unaffected
            var cr = doc.createRange();
            cr.setStartBefore(span); cr.collapse(true);
            sel.removeAllRanges(); sel.addRange(cr);
        } catch (e) { ghostEl = null; ghostText = ""; }
        finally { busy = false; }
    }

    function clearGhost() {
        if (!ghostEl) return;
        busy = true;
        try {
            var sel = editor.getSelection();
            var caret = null;
            if (sel && sel.rangeCount) { var c = sel.getRangeAt(0); caret = { n: c.startContainer, o: c.startOffset }; }
            if (ghostEl.parentNode) ghostEl.parentNode.removeChild(ghostEl);
            // restore caret if it still resolves
            try { if (caret && caret.n) { var d = editor.getDocument(), nr = d.createRange(); nr.setStart(caret.n, Math.min(caret.o, (caret.n.length != null ? caret.n.length : caret.o))); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); } } catch (e2) {}
        } catch (e) {}
        finally { ghostEl = null; ghostText = ""; busy = false; }
    }

    function accept() {
        if (!ghostEl) return false;
        var text = ghostText;
        var doc = editor.getDocument(), sel = editor.getSelection();
        busy = true;
        try {
            // caret is before the ghost; remove ghost, then insert real text so it
            // lands on the native undo stack.
            if (ghostEl.parentNode) ghostEl.parentNode.removeChild(ghostEl);
            ghostEl = null; ghostText = "";
            var done = false;
            try { done = doc.execCommand("insertText", false, text); } catch (e) { done = false; }
            if (!done && sel && sel.rangeCount) {
                var r = sel.getRangeAt(0);
                var tn = doc.createTextNode(text);
                r.insertNode(tn);
                var cr = doc.createRange(); cr.setStartAfter(tn); cr.collapse(true);
                sel.removeAllRanges(); sel.addRange(cr);
            }
        } catch (e) {} finally { busy = false; }
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
        return true;
    }

    function showSetupHint() {
        try {
            var ifr = editor.iframe || (editor.getDocument && editor.getDocument().defaultView && editor.getDocument().defaultView.frameElement);
            var host = ifr && ifr.parentNode ? ifr.parentNode : document.body;
            if (host.querySelector && host.querySelector(".rte-ghost-hint")) return;
            var tip = (host.ownerDocument || document).createElement("div");
            tip.className = "rte-ghost-hint";
            tip.setAttribute("role", "status");
            tip.textContent = "AI completion isn't configured — supply config.ghostTextResolver (or editor.setGhostTextResolver) to enable inline suggestions.";
            tip.style.cssText = "position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:20;" +
                "max-width:90%;padding:7px 14px;border-radius:8px;background:#1f2937;color:#f9fafb;" +
                "font:12px/1.5 -apple-system,Segoe UI,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25);pointer-events:none";
            try { if (host !== document.body && (host.ownerDocument.defaultView || window).getComputedStyle(host).position === "static") host.style.position = "relative"; } catch (e2) {}
            host.appendChild(tip);
            setTimeout(function () { try { if (tip.parentNode) tip.parentNode.removeChild(tip); } catch (e3) {} }, 4500);
        } catch (e) {}
    }

    function injectStyles(doc) {
        if (!doc || doc.getElementById("rte-ghost-styles")) return;
        var css = ".rte-ghost{color:#9aa3b2;opacity:.85;font-style:normal;" +
                  "user-select:none;-webkit-user-select:none;cursor:pointer;white-space:pre-wrap;}";
        var st = doc.createElement("style");
        st.id = "rte-ghost-styles";
        st.appendChild(doc.createTextNode(css));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }

    function stripFor() {
        var ed = editor.getEditable(); if (!ed) return function () {};
        var ghosts = ed.querySelectorAll(".rte-ghost");
        var parents = [];
        for (var i = 0; i < ghosts.length; i++) { parents.push([ghosts[i], ghosts[i].nextSibling, ghosts[i].parentNode]); ghosts[i].parentNode.removeChild(ghosts[i]); }
        return function restore() {
            for (var j = 0; j < parents.length; j++) {
                var node = parents[j][0], ref = parents[j][1], par = parents[j][2];
                if (par) { try { par.insertBefore(node, ref); } catch (e) {} }
            }
        };
    }
    function wrapSerializers() {
        if (wrapped) return;
        var names = ["getHTMLCode", "getJSON", "getHTMLContent"];
        var did = false;
        for (var i = 0; i < names.length; i++) {
            (function (name) {
                var orig = editor[name];
                if (typeof orig !== "function" || orig.__rteGhostWrapped) return;
                var w = function () { var restore = stripFor(); try { return orig.apply(editor, arguments); } finally { restore(); } };
                w.__rteGhostWrapped = true;
                editor[name] = w;
                did = true;
            })(names[i]);
        }
        if (did) wrapped = true;
    }
}
