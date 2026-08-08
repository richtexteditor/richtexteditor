if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Margin line numbers. Numbers every visual line in the left gutter,
// the way a word processor does for pleadings, statutes, transcripts and any
// document people cite by line ("page 4, lines 12-15").
//
// Court filing rules in several jurisdictions REQUIRE numbered lines, which is
// why every serious document editor has this and no browser editor does:
// CKEditor 5 and TinyMCE both document nothing equivalent. It pairs with
// pagination.js — with page view on, numbering can restart at each page, which
// is what the filing rules actually specify.
//
// Design notes:
//   - VISUAL lines, not blocks. A paragraph that wraps over four lines gets four
//     numbers, because that is what "line 12" means to the person citing it.
//     Found via Range.getClientRects(), which returns one rect per line box.
//   - Purely presentational. The overlay is contenteditable=false and stripped
//     around every serialize (the pagination.js contract), so numbering the lines
//     never changes a byte of the HTML you save.
//   - Recompute is rAF-throttled and skipped when the geometry signature is
//     unchanged, because this measures every line box in the document and would
//     otherwise run on every keystroke.
RTE_DefaultConfig.plugin_linenumbers = RTE_Plugin_LineNumbers;

// "continuous" | "page" (restart each page, needs pagination) | "block"
if (typeof RTE_DefaultConfig.lineNumberRestart === "undefined") RTE_DefaultConfig.lineNumberRestart = "continuous";
// Show every Nth number. 1 = every line; 5 is the common pleading convention.
if (typeof RTE_DefaultConfig.lineNumberInterval === "undefined") RTE_DefaultConfig.lineNumberInterval = 1;
// First number.
if (typeof RTE_DefaultConfig.lineNumberStart === "undefined") RTE_DefaultConfig.lineNumberStart = 1;
// Gutter width in px.
if (typeof RTE_DefaultConfig.lineNumberGutter === "undefined") RTE_DefaultConfig.lineNumberGutter = 38;

function RTE_Plugin_LineNumbers() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var active = false;
    var overlay = null;
    var raf = 0;
    var lastSignature = "";
    var wrapped = false;
    var lineCount = 0;

    obj.PluginName = "LineNumbers";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_linenumbers", function (state) {
            state.returnValue = true;
            obj.Toggle();
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", function () { setup(); schedule(); }); } catch (e) {}
        setTimeout(setup, 0);

        // Public API.
        editor.setLineNumbers = function (on) { active = !!on; apply(); return active; };
        editor.toggleLineNumbers = function () { return obj.Toggle(); };
        editor.isLineNumbers = function () { return active; };
        editor.getLineCount = function () { if (active) render(); return lineCount; };
        editor.setLineNumberOptions = function (o) {
            if (o && typeof o === "object") {
                if (o.restart != null) config.lineNumberRestart = o.restart;
                if (o.interval != null) config.lineNumberInterval = o.interval;
                if (o.start != null) config.lineNumberStart = o.start;
                if (o.gutter != null) config.lineNumberGutter = o.gutter;
            }
            lastSignature = "";
            apply();
            return {
                restart: config.lineNumberRestart, interval: config.lineNumberInterval,
                start: config.lineNumberStart, gutter: config.lineNumberGutter
            };
        };
        editor.getLineNumbersCss = function () { return css(); };
    };

    obj.Toggle = function () { active = !active; apply(); return active; };

    function setup() {
        var doc = getDoc();
        if (!doc) return;
        injectStyles(doc);
        wrapSerializers();
        if (doc === boundDoc) return;
        boundDoc = doc;
        doc.addEventListener("input", schedule, true);
        doc.addEventListener("keyup", schedule, true);
        var win = doc.defaultView || doc.parentWindow;
        if (win) win.addEventListener("resize", schedule);
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function apply() {
        var editable = getEditable();
        if (editable && editable.classList) {
            if (active) editable.classList.add("rte-linenumbers-on");
            else editable.classList.remove("rte-linenumbers-on");
        }
        if (editable) {
            // Reserve the gutter by padding the editable, so text does not sit
            // under the numbers.
            editable.style.paddingLeft = active ? (parseInt(config.lineNumberGutter, 10) + 12) + "px" : "";
        }
        if (active) { lastSignature = ""; render(); }
        else removeOverlay();
    }

    function schedule() {
        if (!active) return;
        if (raf) return;
        var doc = getDoc();
        var win = (doc && (doc.defaultView || doc.parentWindow)) || window;
        var rq = (win && typeof win.requestAnimationFrame === "function")
            ? function (f) { return win.requestAnimationFrame(f); }
            : function (f) { return setTimeout(f, 16); };
        raf = rq(function () { raf = 0; render(); });
    }

    // ---- line discovery --------------------------------------------------

    // One entry per VISUAL line: its top offset relative to the editable, and
    // which top-level block it belongs to.
    function measureLines() {
        var doc = getDoc();
        var editable = getEditable();
        if (!doc || !editable) return [];
        var lines = [];
        var kids = editable.children;
        var edRect = editable.getBoundingClientRect();
        var scrollTop = editable.scrollTop || 0;

        for (var i = 0; i < kids.length; i++) {
            var block = kids[i];
            if (block.nodeType !== 1) continue;
            if (block.getAttribute && (block.getAttribute("data-rte-linenumbers") === "true" ||
                                       block.getAttribute("data-rte-page-overlay") === "true")) continue;
            if (!block.textContent && !block.querySelector("img,table,hr")) {
                // Empty block still occupies one line.
                var br = block.getBoundingClientRect();
                if (br.height > 0) lines.push({ top: br.top - edRect.top + scrollTop, block: i });
                continue;
            }
            var rects = lineRectsOf(doc, block);
            for (var r = 0; r < rects.length; r++) {
                lines.push({ top: rects[r] - edRect.top + scrollTop, block: i });
            }
        }
        return lines;
    }

    // Distinct line-box tops inside one block. getClientRects() on a range over
    // the block's contents yields a rect per line box; identical tops are the
    // same line split across inline elements, so they collapse.
    function lineRectsOf(doc, block) {
        var tops = [];
        var seen = {};
        try {
            var range = doc.createRange();
            range.selectNodeContents(block);
            var rects = range.getClientRects();
            for (var i = 0; i < rects.length; i++) {
                var rc = rects[i];
                if (!rc || rc.height <= 0 || rc.width <= 0) continue;
                // Round: sub-pixel differences within one line are common.
                var key = Math.round(rc.top);
                if (seen[key]) continue;
                seen[key] = true;
                tops.push(rc.top);
            }
        } catch (e) {}
        if (!tops.length) {
            var br = block.getBoundingClientRect();
            if (br.height > 0) tops.push(br.top);
        }
        tops.sort(function (a, b) { return a - b; });
        return tops;
    }

    // ---- render ----------------------------------------------------------

    function render() {
        if (!active) return;
        var doc = getDoc();
        var editable = getEditable();
        if (!doc || !editable) return;

        var lines = measureLines();
        lineCount = lines.length;

        var restart = String(config.lineNumberRestart || "continuous");
        var interval = Math.max(1, parseInt(config.lineNumberInterval, 10) || 1);
        var start = parseInt(config.lineNumberStart, 10);
        if (isNaN(start)) start = 1;

        // Page boundaries, only when both page view and pagination are present.
        var breaks = [];
        if (restart === "page") {
            try {
                if (typeof editor.isPageView === "function" && editor.isPageView() &&
                    typeof editor.getPageOfElement === "function") {
                    breaks = null;   // signalled by using getPageOfElement per line below
                }
            } catch (e) {}
        }

        var sig = lines.length + "|" + restart + "|" + interval + "|" + start + "|" +
                  (lines.length ? Math.round(lines[lines.length - 1].top) : 0) + "|" + editable.offsetHeight;
        if (sig === lastSignature && overlay && overlay.parentNode) return;
        lastSignature = sig;

        var ov = ensureOverlay(doc, editable);
        while (ov.firstChild) ov.removeChild(ov.firstChild);
        ov.style.width = parseInt(config.lineNumberGutter, 10) + "px";

        var n = start;
        var lastPage = null;
        var lastBlock = null;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];

            if (restart === "block") {
                if (lastBlock !== null && line.block !== lastBlock) n = start;
                lastBlock = line.block;
            } else if (restart === "page") {
                var page = pageOfLine(editable, line);
                if (lastPage !== null && page !== lastPage) n = start;
                lastPage = page;
            }

            if ((n - start) % interval === 0) {
                var tag = doc.createElement("div");
                tag.className = "rte-linenumber";
                tag.style.top = Math.round(line.top) + "px";
                tag.textContent = String(n);
                ov.appendChild(tag);
            }
            n++;
        }
    }

    function pageOfLine(editable, line) {
        // Resolve through the block the line belongs to; pagination measures
        // top-level children, which is exactly what line.block indexes.
        try {
            var block = editable.children[line.block];
            if (block && typeof editor.getPageOfElement === "function") {
                var p = editor.getPageOfElement(block);
                if (p) return p;
            }
        } catch (e) {}
        return 1;
    }

    function ensureOverlay(doc, editable) {
        if (overlay && overlay.parentNode) return overlay;
        overlay = doc.createElement("div");
        overlay.setAttribute("data-rte-linenumbers", "true");
        overlay.setAttribute("contenteditable", "false");
        overlay.setAttribute("aria-hidden", "true");
        overlay.className = "rte-linenumber-gutter";
        (editable.parentNode || doc.body || doc.documentElement).appendChild(overlay);
        return overlay;
    }

    function removeOverlay() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
        lastSignature = "";
    }

    // ---- serialization safety -------------------------------------------

    function stripFor() {
        var editable = getEditable();
        if (!editable) return function () {};
        var doc = getDoc();
        var nodes = doc ? doc.querySelectorAll("[data-rte-linenumbers]") : [];
        var parked = [];
        for (var i = 0; i < nodes.length; i++) {
            var nd = nodes[i];
            parked.push({ node: nd, parent: nd.parentNode, next: nd.nextSibling });
            if (nd.parentNode) nd.parentNode.removeChild(nd);
        }
        // The gutter padding is ours too, and would otherwise leak into any
        // serializer that reads inline styles off the editable.
        var pad = editable.style.paddingLeft;
        editable.style.paddingLeft = "";
        return function restore() {
            editable.style.paddingLeft = pad;
            for (var j = 0; j < parked.length; j++) {
                if (parked[j].parent) parked[j].parent.insertBefore(parked[j].node, parked[j].next || null);
            }
        };
    }

    function wrapSerializers() {
        if (wrapped) return;
        var names = ["getHTMLCode", "getJSON", "getHTMLContent", "getText"];
        var did = false;
        for (var i = 0; i < names.length; i++) {
            (function (name) {
                var orig = editor[name];
                if (typeof orig !== "function" || orig.__rteLnWrapped) return;
                var w = function () {
                    var restore = stripFor();
                    try { return orig.apply(editor, arguments); } finally { restore(); }
                };
                w.__rteLnWrapped = true;
                editor[name] = w;
                did = true;
            })(names[i]);
        }
        if (did) wrapped = true;
    }

    // ---- styles ----------------------------------------------------------

    function css() {
        return (
            ".rte-linenumber-gutter{position:absolute;left:0;top:0;pointer-events:none;" +
            "user-select:none;z-index:2;}" +
            ".rte-linenumber{position:absolute;right:6px;text-align:right;width:100%;" +
            "font-size:11px;line-height:1;color:#8a94a6;font-variant-numeric:tabular-nums;" +
            "font-family:Consolas,Menlo,monospace;}" +
            ".rte-linenumbers-on{position:relative;}"
        );
    }

    function injectStyles(doc) {
        if (!doc) return;
        var existing = doc.getElementById("rte-linenumber-styles");
        var text = css();
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        var st = doc.createElement("style");
        st.id = "rte-linenumber-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
