if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-09 Character / word limit enforcement. The built-in statistics readout
// DISPLAYS counts; this ENFORCES a maximum (comment boxes, form fields, social
// limits) — blocks typing past the cap, truncates over-long pastes, and shows a
// live "remaining" counter that turns red near/over the limit. Library-free.
//
// API:
//   editor.getCharCount()      -> number (characters, no markup)
//   editor.getWordCount()      -> number
//   editor.getRemainingChars() -> number | null   (null when no maxLength set)
//   editor.isOverLimit()       -> boolean
// Events: fires editor "charlimit" with { chars, words, overChars, overWords }.
// Config:
//   config.maxLength = 0                 // max characters (0 / unset = no limit)
//   config.maxWords = 0                  // max words (0 / unset = no limit)
//   config.charLimitEnforce = true        // block input past the limit
//   config.charLimitShowCounter = true    // show the floating counter
RTE_DefaultConfig.plugin_charlimit = RTE_Plugin_CharLimit;

function RTE_Plugin_CharLimit() {
    var obj = this;
    var config, editor, counterEl = null;

    obj.PluginName = "CharLimit";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.getCharCount = function () { return countChars(); };
        editor.getWordCount = function () { return countWords(); };
        editor.getRemainingChars = function () { return maxChars() ? Math.max(0, maxChars() - countChars()) : null; };
        editor.isOverLimit = function () {
            return (maxChars() && countChars() > maxChars()) || (maxWords() && countWords() > maxWords());
        };

        if (!maxChars() && !maxWords()) return; // dormant unless a limit is configured

        // The iframe editable may not exist at InitEditor time — bind setup now
        // AND on "created", with an idempotency guard so we never double-bind.
        setup();
        try { editor.attachEvent("created", setup); } catch (e) {}
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", function () { setup(); refresh(); }); } catch (e) {}
        // The editor may rebuild the iframe (new document) after init/created; a
        // couple of deferred retries bind the FINAL document once it stabilizes
        // (the idempotency guard makes re-runs cheap no-ops).
        if (typeof setTimeout === "function") { setTimeout(setup, 0); setTimeout(setup, 300); }
    };

    function setup() {
        // Bind on the iframe DOCUMENT (not the body): the editor recreates the
        // editable body on init / setHTMLCode, which would orphan body-level
        // listeners. The document is stable; capture-phase catches body events.
        var doc = editor.getDocument && editor.getDocument();
        if (!doc || doc.__rteCharLimitBound) { mountCounter(); refresh(); return; }
        doc.__rteCharLimitBound = true;
        if (config.charLimitEnforce !== false) {
            doc.addEventListener("beforeinput", onBeforeInput, true);
            doc.addEventListener("paste", onPaste, true);
        }
        doc.addEventListener("input", function () { refresh(); }, true);
        mountCounter();
        refresh();
    }

    function maxChars() { var n = parseInt(config.maxLength, 10); return n > 0 ? n : 0; }
    function maxWords() { var n = parseInt(config.maxWords, 10); return n > 0 ? n : 0; }

    function plainText() {
        try {
            var ed = editor.getEditable();
            return ed ? (ed.innerText || ed.textContent || "") : "";
        } catch (e) { return ""; }
    }
    function countChars() { return plainText().replace(/\r\n/g, "\n").length; }
    function countWords() { var t = plainText().trim(); return t ? t.split(/\s+/).length : 0; }

    function onBeforeInput(e) {
        var t = e.inputType || "";
        var isInsert = t === "insertText" || t === "insertReplacementText" ||
            t === "insertCompositionText" || t === "insertParagraph" || t === "insertLineBreak";
        if (!isInsert) return; // deletes / formatting always allowed
        var addLen = t === "insertParagraph" || t === "insertLineBreak" ? 1 : ((e.data || "").length || 0);
        // Allow if it shrinks/replaces a selection that frees room — approximate by
        // checking current count; if already at/over the char cap, block inserts.
        if (maxChars()) {
            var cur = countChars();
            if (cur >= maxChars() || cur + addLen > maxChars()) {
                // Permit replacing a selection (net change may be <= 0).
                if (!hasSelection() || cur + addLen > maxChars() + selectionLength()) { e.preventDefault(); flash(); return; }
            }
        }
        if (maxWords() && t !== "insertParagraph" && countWords() >= maxWords() && /\s$/.test(e.data || " ")) {
            // block starting a NEW word past the word cap
            if (countWords() >= maxWords()) { e.preventDefault(); flash(); return; }
        }
    }

    function onPaste(e) {
        if (!maxChars()) return;
        var remaining = maxChars() - countChars() + selectionLength();
        if (remaining <= 0) { e.preventDefault(); flash(); return; }
        var cd = e.clipboardData || window.clipboardData;
        if (!cd) return;
        var text = "";
        try { text = cd.getData("text/plain") || ""; } catch (er) { return; }
        if (text.length > remaining) {
            // Truncate the paste to what fits.
            e.preventDefault();
            var fit = text.slice(0, remaining);
            try { if (typeof editor.insertHTML === "function") editor.insertHTML(escapeHtml(fit).replace(/\n/g, "<br>")); }
            catch (e2) {}
            flash();
        }
    }

    function hasSelection() {
        try { var s = editor.getSelection(); return s && s.rangeCount > 0 && !s.isCollapsed; } catch (e) { return false; }
    }
    function selectionLength() {
        try { var s = editor.getSelection(); return s && !s.isCollapsed ? (s.toString() || "").length : 0; } catch (e) { return 0; }
    }

    function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

    function mountCounter() {
        if (config.charLimitShowCounter === false) return;
        if (counterEl && counterEl.parentNode) return;
        var host = findHost();
        if (!host) return;
        injectStyles(host.ownerDocument);
        counterEl = host.ownerDocument.createElement("div");
        counterEl.className = "rte-charlimit-counter";
        counterEl.setAttribute("aria-live", "polite");
        host.appendChild(counterEl);
    }

    function findHost() {
        try {
            // The iframe lives in the MAIN document inside a positioned wrapper —
            // the right place for an absolutely-positioned overlay counter.
            var ifr = editor.iframe || (editor.getDocument && editor.getDocument().defaultView && editor.getDocument().defaultView.frameElement);
            if (ifr) {
                var w = ifr.parentNode;
                while (w && w.nodeType === 1) {
                    var cs = (w.ownerDocument.defaultView || window).getComputedStyle(w);
                    if (cs && cs.position !== "static") return w;
                    if (w.className && typeof w.className === "string" && /rte[_-](outer|container|wrapper)/i.test(w.className)) {
                        try { if (cs && cs.position === "static") w.style.position = "relative"; } catch (e) {}
                        return w;
                    }
                    w = w.parentNode;
                }
                if (ifr.parentNode) { try { ifr.parentNode.style.position = ifr.parentNode.style.position || "relative"; } catch (e) {} return ifr.parentNode; }
            }
            return null;
        } catch (e) { return null; }
    }

    function injectStyles(doc) {
        if (doc.querySelector("style[data-rte-charlimit]")) return;
        var st = doc.createElement("style");
        st.setAttribute("data-rte-charlimit", "1");
        st.textContent = ".rte-charlimit-counter{position:absolute;right:10px;bottom:6px;z-index:5;font:11px -apple-system,Segoe UI,sans-serif;color:#64748b;background:rgba(255,255,255,.85);padding:1px 7px;border-radius:9px;pointer-events:none}" +
            ".rte-charlimit-counter.is-near{color:#b45309}.rte-charlimit-counter.is-over{color:#dc2626;font-weight:600}";
        (doc.head || doc.documentElement).appendChild(st);
    }

    function refresh() {
        var chars = countChars(), words = countWords();
        var overChars = maxChars() ? Math.max(0, chars - maxChars()) : 0;
        var overWords = maxWords() ? Math.max(0, words - maxWords()) : 0;
        if (counterEl) {
            var txt = "";
            if (maxChars()) txt = chars + " / " + maxChars();
            else if (maxWords()) txt = words + " / " + maxWords() + " words";
            counterEl.textContent = txt;
            counterEl.classList.remove("is-near", "is-over");
            if ((maxChars() && chars > maxChars()) || (maxWords() && words > maxWords())) counterEl.classList.add("is-over");
            else if ((maxChars() && chars >= maxChars() * 0.9) || (maxWords() && words >= maxWords() * 0.9)) counterEl.classList.add("is-near");
        }
        try { if (typeof editor.fireEvent === "function") editor.fireEvent("charlimit", { chars: chars, words: words, overChars: overChars, overWords: overWords }); } catch (e) {}
    }

    function flash() {
        if (!counterEl) return;
        counterEl.classList.add("is-over");
        try {
            counterEl.animate([{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(0)" }], { duration: 160 });
        } catch (e) {}
    }
}
