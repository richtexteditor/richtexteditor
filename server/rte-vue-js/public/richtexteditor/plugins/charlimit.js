if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-09 Character / word limit enforcement. The built-in statistics readout
// DISPLAYS counts; this ENFORCES a maximum (comment boxes, form fields, social
// limits) — blocks typing past the cap, truncates over-long pastes, and shows a
// live "remaining" counter that turns red near/over the limit. Library-free.
//
// API:
//   editor.getCharCount()      -> number (characters as the reader sees them: spaces count, line breaks do not, an
//                                 emoji counts once; the same number as getStatistics().characters)
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

        // The public insert obeys the cap too (a host's "insert snippet" button went straight past
        // it). Over-long content is cut to what fits, as plain text, the same way a paste is.
        if (config.charLimitEnforce !== false && typeof editor.insertHTML === "function") {
            var origInsertHTML = editor.insertHTML;
            editor.insertHTML = function (html) {
                if (!maxChars()) return origInsertHTML.apply(this, arguments);
                var probe = document.createElement("div");
                probe.innerHTML = __RTE_TT(String(html == null ? "" : html));
                var add = visibleLength(probe.textContent);
                var remaining = maxChars() - countChars() + selectionLength();
                if (add <= remaining) return origInsertHTML.apply(this, arguments);
                flash();
                if (remaining <= 0) return false;
                return origInsertHTML.call(this, escapeHtml(fitVisible(probe.textContent, remaining)));
            };
        }

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
            doc.addEventListener("drop", onDrop, true);
        }
        doc.addEventListener("input", function () { refresh(); }, true);
        mountCounter();
        refresh();
    }

    function maxChars() { var n = parseInt(config.maxLength, 10); return n > 0 ? n : 0; }
    function maxWords() { var n = parseInt(config.maxWords, 10); return n > 0 ? n : 0; }

    function plainText() {
        try {
            // 2026-10-15 ask getText(): it leaves out page-break labels (a two-word page plus a break counted five
            // words) and plugins' on-screen-only text. tools/wordcount/page-break-not-text.mjs
            if (typeof editor.getText === "function") { var gt = editor.getText(); if (typeof gt === "string") return gt; }
            var ed = editor.getEditable();
            return ed ? (ed.innerText || ed.textContent || "") : "";
        } catch (e) { return ""; }
    }
    // 2026-11-02 The same rule as the core's getStatistics. This counted innerText, whose newlines differ per engine: on
    // <p>a</p><p><br></p><p>b</p> the status bar said 2 and this said 7 (6 in WebKit), so empty lines used up the limit.
    // tools/charlimit/char-count-line-breaks.mjs
    function visibleLength(text) {
        var visible = String(text == null ? "" : text).replace(/[\r\n]+/g, "");
        var astral = visible.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
        return visible.length - (astral ? astral.length : 0);
    }
    // The start of text holding at most n visible characters: line breaks come along free, an emoji is never split.
    function fitVisible(text, n) {
        var out = "", used = 0, parts = String(text == null ? "" : text).match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/g) || [];
        for (var i = 0; i < parts.length; i++) {
            var free = parts[i] === "\n" || parts[i] === "\r";
            if (!free && used >= n) break;
            out += parts[i];
            if (!free) used++;
        }
        return out;
    }
    function countChars() { return visibleLength(plainText()); }
    // Same rules as the core status bar: each CJK character is a word (those scripts have no
    // spaces, so "你好世界" was 1), and a token of punctuation alone ("—", "!") is not a word.
    function countWords() {
        var t = plainText();
        var cjk = /[\u3005\u3007\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
        var m = t.match(cjk);
        var n = m ? m.length : 0;
        var tokens = t.replace(cjk, " ").split(/\s+/);
        for (var i = 0; i < tokens.length; i++) {
            if (/[^!-\/:-@\[-`{-~\xa1-\xbf\u2000-\u206f\u3000-\u303f\uff01-\uff0f]/.test(tokens[i])) n++;
        }
        return n;
    }

    function onBeforeInput(e) {
        var t = e.inputType || "";
        var isInsert = t === "insertText" || t === "insertReplacementText" ||
            t === "insertCompositionText" || t === "insertParagraph" || t === "insertLineBreak";
        if (!isInsert) return; // deletes / formatting always allowed
        // A line break costs nothing, so Enter still works at the limit.
        var addLen = visibleLength(e.data);
        // Allow if it shrinks/replaces a selection that frees room — approximate by
        // checking current count; if already at/over the char cap, block inserts.
        if (maxChars() && t !== "insertParagraph" && t !== "insertLineBreak") {
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
        // stopImmediatePropagation as well as preventDefault: the core paste handler inserts the
        // clipboard itself and ignores defaultPrevented, so the full paste landed past the cap.
        if (remaining <= 0) { e.preventDefault(); e.stopImmediatePropagation(); flash(); return; }
        var cd = e.clipboardData || window.clipboardData;
        if (!cd) return;
        var text = "";
        try { text = cd.getData("text/plain") || ""; } catch (er) { return; }
        if (visibleLength(text) > remaining) {
            // Truncate the paste to what fits.
            e.preventDefault();
            e.stopImmediatePropagation();
            var fit = fitVisible(text, remaining);
            try { if (typeof editor.insertHTML === "function") editor.insertHTML(escapeHtml(fit).replace(/\n/g, "<br>")); }
            catch (e2) {}
            flash();
        }
    }

    // A drop has no caret to truncate at, so content that would pass the cap is refused whole
    // (the core drop handler inserts it itself, so the event must not reach it).
    function onDrop(e) {
        if (!maxChars()) return;
        var dt = e.dataTransfer;
        if (!dt) return;
        var add = 0;
        try {
            var text = dt.getData("text/plain");
            if (!text) {
                var probe = document.createElement("div");
                probe.innerHTML = __RTE_TT(dt.getData("text/html") || "");
                text = probe.textContent || "";
            }
            add = visibleLength(text);
        } catch (er) { return; }
        if (!add) return;
        if (countChars() + add > maxChars()) {
            e.preventDefault();
            e.stopImmediatePropagation();
            flash();
        }
    }

    function hasSelection() {
        try { var s = editor.getSelection(); return s && s.rangeCount > 0 && !s.isCollapsed; } catch (e) { return false; }
    }
    function selectionLength() {
        try { var s = editor.getSelection(); return s && !s.isCollapsed ? visibleLength(s.toString()) : 0; } catch (e) { return 0; }
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
        // A <style> ELEMENT is governed by style-src: under a strict policy the browser
        // drops its rules, leaving this plugin's UI unstyled. The element above stays
        // the path everyone else takes; this re-injects through the CSSOM only when
        // the policy actually emptied it.
        if (editor && typeof editor.ensureStyleSheetLive === "function") {
            editor.ensureStyleSheetLive(doc, st, "rte-charlimit-st", st.textContent);
        }
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
