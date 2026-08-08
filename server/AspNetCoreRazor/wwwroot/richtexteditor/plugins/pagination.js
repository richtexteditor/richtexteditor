if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-17 Pagination / page view. Renders the editable as a stack of paper
// pages — the "print layout" view Word and Google Docs have, and the feature
// CKEditor and Tiptap both sell as a paid add-on.
//
// Design constraint (same as the typewriter/focus plugin): this is PURELY
// PRESENTATIONAL. It never mutates content and nothing it draws is serialized:
//   - page geometry is applied as styles on the editable (width/padding/background)
//   - page boundaries, page numbers, and header/footer text are drawn in an
//     overlay layer that is contenteditable="false", aria-hidden, pointer-events
//     none, and stripped around every serialize call as a belt-and-braces guard.
// Turning page view off restores the editable exactly as it was.
//
// Geometry comes from the document's own page setup when the host app supplies
// one (editor.getDocumentPageSetup() / config), so the on-screen page matches
// what html2pdf and the Word export produce: format (A4/Letter/Legal),
// orientation, margins, and optional header/footer HTML.
//
// Forced breaks: any element carrying data-rte-page-break (what the
// insertpagebreak toolbar command inserts) starts a new page, exactly as it
// does on export.
RTE_DefaultConfig.plugin_pagination = RTE_Plugin_Pagination;

// Off by default — page view is a deliberate mode, not a surprise.
if (typeof RTE_DefaultConfig.paginationEnabled === "undefined") RTE_DefaultConfig.paginationEnabled = false;
// Paper format when the document carries no page setup: A4 | Letter | Legal.
if (typeof RTE_DefaultConfig.pageFormat === "undefined") RTE_DefaultConfig.pageFormat = "A4";
if (typeof RTE_DefaultConfig.pageOrientation === "undefined") RTE_DefaultConfig.pageOrientation = "portrait";
// Margins in inches (Word's default is 1in all round).
if (typeof RTE_DefaultConfig.pageMargins === "undefined") RTE_DefaultConfig.pageMargins = { top: 1, right: 1, bottom: 1, left: 1 };
if (typeof RTE_DefaultConfig.paginationShowPageNumbers === "undefined") RTE_DefaultConfig.paginationShowPageNumbers = true;
// "Page 3" vs "Page 3 of 12".
if (typeof RTE_DefaultConfig.paginationShowPageCount === "undefined") RTE_DefaultConfig.paginationShowPageCount = true;

function RTE_Plugin_Pagination() {
    var obj = this;
    var config, editor;
    var active = false;
    var overlay = null;
    var boundDoc = null;
    var wrapped = false;
    var raf = 0;
    var pageCount = 1;
    var lastSignature = "";

    obj.PluginName = "Pagination";

    // 96 CSS px per inch is the CSS reference pixel — the same basis html2pdf
    // and the browser's own print pipeline use.
    var DPI = 96;
    var MM_PER_IN = 25.4;

    var FORMATS = {
        a4: { w: 210 / MM_PER_IN, h: 297 / MM_PER_IN },
        letter: { w: 8.5, h: 11 },
        legal: { w: 8.5, h: 14 },
        a3: { w: 297 / MM_PER_IN, h: 420 / MM_PER_IN },
        a5: { w: 148 / MM_PER_IN, h: 210 / MM_PER_IN },
        tabloid: { w: 11, h: 17 }
    };

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        active = !!config.paginationEnabled;
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", schedule); } catch (e) {}

        // Public API.
        editor.setPageView = function (on) { active = !!on; apply(); return active; };
        editor.togglePageView = function () { active = !active; apply(); return active; };
        editor.isPageView = function () { return active; };
        editor.getPageCount = function () { if (active) paginate(); return pageCount; };
        // Let the host change paper without rebuilding the editor.
        editor.setPageSetup = function (setup) {
            if (setup && typeof setup === "object") {
                if (setup.format) config.pageFormat = setup.format;
                if (setup.orientation) config.pageOrientation = setup.orientation;
                if (setup.margins) config.pageMargins = setup.margins;
                if (typeof setup.headerHtml === "string") config.pageHeaderHtml = setup.headerHtml;
                if (typeof setup.footerHtml === "string") config.pageFooterHtml = setup.footerHtml;
            }
            lastSignature = "";
            apply();
            return geometry();
        };
        editor.getPageGeometry = function () { return geometry(); };
        // 2026-07-27 Which page is this element on? Added for the table-of-contents
        // plugin, which pairs page numbers with its entries the way a word
        // processor does. Returns null when page view is off, because outside
        // page view a "page number" would be a fiction.
        editor.getPageOfElement = function (el) { return pageOfElement(el); };

        setTimeout(setup, 0);
        setTimeout(schedule, 250);
    };

    // Re-runnable: the editor can recreate its document/body (setHTML, mode
    // switches), so every hook re-attaches defensively.
    function setup() {
        var doc = getDoc();
        if (doc) {
            injectStyles(doc);
            if (doc !== boundDoc) {
                doc.addEventListener("input", schedule, true);
                doc.addEventListener("keyup", schedule, true);
                boundDoc = doc;
                var win = doc.defaultView || doc.parentWindow;
                if (win) { try { win.addEventListener("resize", schedule, true); } catch (e) {} }
            }
        }
        wrapSerializers();
        apply();
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    // ---- geometry -------------------------------------------------------

    // Prefer the document's own page setup (so screen matches export), then
    // config, then the A4 default.
    function pageSetup() {
        var s = null;
        try { if (typeof editor.getDocumentPageSetup === "function") s = editor.getDocumentPageSetup(); } catch (e) { s = null; }
        if (!s || typeof s !== "object") s = {};
        return {
            format: s.format || config.pageFormat || "A4",
            orientation: s.orientation || config.pageOrientation || "portrait",
            margins: s.margins || config.pageMargins || { top: 1, right: 1, bottom: 1, left: 1 },
            headerHtml: typeof s.headerHtml === "string" ? s.headerHtml : (config.pageHeaderHtml || ""),
            footerHtml: typeof s.footerHtml === "string" ? s.footerHtml : (config.pageFooterHtml || "")
        };
    }

    // Margins may arrive as inches (number) or a CSS length string.
    function toPx(v, fallbackIn) {
        if (typeof v === "number" && isFinite(v)) return v * DPI;
        if (typeof v === "string") {
            var m = /^\s*(-?[\d.]+)\s*(mm|cm|in|px|pt)?\s*$/.exec(v);
            if (m) {
                var n = parseFloat(m[1]);
                switch (m[2]) {
                    case "mm": return (n / MM_PER_IN) * DPI;
                    case "cm": return (n * 10 / MM_PER_IN) * DPI;
                    case "pt": return (n / 72) * DPI;
                    case "px": return n;
                    default: return n * DPI; // bare number or "in"
                }
            }
        }
        return (fallbackIn || 0) * DPI;
    }

    function geometry() {
        var s = pageSetup();
        var f = FORMATS[String(s.format).toLowerCase()] || FORMATS.a4;
        var wIn = f.w, hIn = f.h;
        if (String(s.orientation).toLowerCase() === "landscape") { var t = wIn; wIn = hIn; hIn = t; }
        var m = s.margins || {};
        var g = {
            pageWidth: Math.round(wIn * DPI),
            pageHeight: Math.round(hIn * DPI),
            marginTop: Math.round(toPx(m.top, 1)),
            marginRight: Math.round(toPx(m.right, 1)),
            marginBottom: Math.round(toPx(m.bottom, 1)),
            marginLeft: Math.round(toPx(m.left, 1)),
            format: s.format,
            orientation: s.orientation,
            headerHtml: s.headerHtml,
            footerHtml: s.footerHtml
        };
        // The usable text column on one page.
        g.contentHeight = Math.max(120, g.pageHeight - g.marginTop - g.marginBottom);
        g.contentWidth = Math.max(120, g.pageWidth - g.marginLeft - g.marginRight);
        return g;
    }

    // ---- apply / teardown ----------------------------------------------

    function apply() {
        var ed = getEditable();
        if (!ed) return;
        if (!active) { teardown(ed); return; }
        var g = geometry();
        // The editable becomes the paper column: fixed content width, page
        // margins as padding, and a top offset so the first page has a margin.
        ed.classList.add("rte-page-view");
        ed.style.width = g.contentWidth + "px";
        ed.style.paddingLeft = g.marginLeft + "px";
        ed.style.paddingRight = g.marginRight + "px";
        ed.style.paddingTop = g.marginTop + "px";
        ed.style.paddingBottom = g.marginBottom + "px";
        ed.style.margin = "24px auto";
        ed.style.boxSizing = "content-box";
        ed.style.background = "#fff";
        ed.style.minHeight = g.contentHeight + "px";
        schedule();
    }

    function teardown(ed) {
        ed = ed || getEditable();
        if (ed) {
            ed.classList.remove("rte-page-view");
            var props = ["width", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "margin", "boxSizing", "background", "minHeight"];
            for (var i = 0; i < props.length; i++) ed.style[props[i]] = "";
        }
        removeOverlay();
        pageCount = 1;
        lastSignature = "";
    }

    function schedule() {
        if (!active) return;
        if (raf) return;
        var doc = getDoc();
        var win = (doc && (doc.defaultView || doc.parentWindow)) || window;
        var rq = (win && typeof win.requestAnimationFrame === "function")
            ? function (f) { return win.requestAnimationFrame(f); }
            : function (f) { return setTimeout(f, 16); };
        raf = rq(function () { raf = 0; paginate(); });
    }

    // ---- pagination -----------------------------------------------------

    // Block-level pagination: walk the top-level blocks and cut a page whenever
    // the running height would overflow the usable page height, or when a
    // forced break is hit. A block taller than a page simply owns its page(s) —
    // we never split a block, matching how the print pipeline behaves for
    // unbreakable content.
    // All offsets here are raw offsetTop values (the editable's children share an
    // offsetParent, so they're directly comparable). "origin" is where the first
    // block actually sits, which is NOT zero — it's the editable's content box
    // start. Everything is measured from there so page 1 gets a full page of
    // content rather than a page minus the top margin.
    function contentOrigin(ed) {
        var kids = ed.children;
        for (var i = 0; i < kids.length; i++) {
            var el = kids[i];
            if (el && el.nodeType === 1 && !(el.getAttribute && el.getAttribute("data-rte-page-overlay") === "true")) {
                return el.offsetTop;
            }
        }
        return ed.offsetTop;
    }

    // Map an element to its 1-based page number, using the same break offsets the
    // overlay draws so the number always agrees with the boundary the user sees.
    // Walks up to the element's top-level block, because computeBreaks measures
    // offsetTop of the editable's own children.
    function pageOfElement(el) {
        if (!active || !el) return null;
        var ed = getEditable();
        if (!ed) return null;
        var block = el;
        while (block && block.parentNode && block.parentNode !== ed) block = block.parentNode;
        if (!block || block.parentNode !== ed) return null;
        var breaks = computeBreaks(ed, geometry());
        var top = block.offsetTop;
        var page = 1;
        for (var i = 0; i < breaks.length; i++) if (breaks[i] <= top) page++;
        return page;
    }

    function computeBreaks(ed, g) {
        var breaks = [];
        var kids = ed.children;
        if (!kids || !kids.length) return breaks;

        // Build the list of real content blocks once, so we can use the NEXT
        // block's top as this block's effective bottom. offsetHeight is a
        // border-box measure and excludes margins, so summing it undercounts the
        // flow by every collapsed margin — which would let a page overflow.
        var blocks = [];
        for (var k = 0; k < kids.length; k++) {
            var kid = kids[k];
            if (!kid || kid.nodeType !== 1) continue;
            if (kid.getAttribute && kid.getAttribute("data-rte-page-overlay") === "true") continue;
            blocks.push(kid);
        }
        if (!blocks.length) return breaks;

        var pageTop = blocks[0].offsetTop;   // offsetTop where the current page's content starts
        var i, el, top, bottom;

        for (i = 0; i < blocks.length; i++) {
            el = blocks[i];
            top = el.offsetTop;
            // Effective bottom = where the following block begins (captures the
            // margin gap); for the last block fall back to its own box bottom.
            bottom = (i + 1 < blocks.length) ? blocks[i + 1].offsetTop : (top + el.offsetHeight);

            // Forced break: this element starts a new page.
            var forced = el.hasAttribute && (el.hasAttribute("data-rte-page-break") ||
                (el.querySelector && !!el.querySelector("[data-rte-page-break]")));
            if (forced && top > pageTop) {
                breaks.push(top);
                pageTop = top;
                continue;
            }

            // Natural overflow: cut before this block.
            if (bottom - pageTop > g.contentHeight) {
                if (top > pageTop) {
                    breaks.push(top);
                    pageTop = top;
                }
                // A single over-tall block: advance whole pages past it so the
                // following content lands on a fresh page rather than cascading.
                while (bottom - pageTop > g.contentHeight) {
                    pageTop += g.contentHeight;
                    breaks.push(pageTop);
                }
            }
        }
        return breaks;
    }

    function paginate() {
        if (!active) return;
        var ed = getEditable(), doc = getDoc();
        if (!ed || !doc) return;
        var g = geometry();
        var breaks = computeBreaks(ed, g);
        pageCount = breaks.length + 1;

        // Cheap change-detection so we don't rebuild the overlay on every keystroke.
        var sig = g.pageWidth + "x" + g.pageHeight + "|" + g.contentHeight + "|" + breaks.join(",") + "|" + ed.offsetHeight;
        if (sig === lastSignature) return;
        lastSignature = sig;

        render(doc, ed, g, breaks);
    }

    // ---- overlay rendering ----------------------------------------------

    function ensureOverlay(doc, ed) {
        if (overlay && overlay.parentNode) return overlay;
        overlay = doc.createElement("div");
        overlay.setAttribute("data-rte-page-overlay", "true");
        overlay.setAttribute("contenteditable", "false");
        overlay.setAttribute("aria-hidden", "true");
        overlay.className = "rte-page-overlay";
        // Sits in the same offset parent as the editable's children so the
        // boundary offsets line up without extra math.
        (ed.parentNode || doc.body || doc.documentElement).appendChild(overlay);
        return overlay;
    }

    function removeOverlay() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
    }

    // Header/footer HTML may use {page} and {total} placeholders, the same
    // convention Word and Tiptap's paged view use.
    function expand(html, page, total) {
        return String(html)
            .replace(/\{\s*page\s*\}/gi, String(page))
            .replace(/\{\s*total\s*\}/gi, String(total));
    }

    // Coordinate model: `breaks` and `origin` are raw offsetTop values in the
    // editable's offsetParent space. The overlay is pinned at the editable's own
    // offset, so overlay-local y = absoluteOffset - ed.offsetTop.
    function render(doc, ed, g, breaks) {
        var ov = ensureOverlay(doc, ed);
        while (ov.firstChild) ov.removeChild(ov.firstChild);

        var edTop = ed.offsetTop;
        var origin = contentOrigin(ed);
        var starts = [origin].concat(breaks);
        var total = starts.length;

        // Cover from the top of the editable to the bottom of the last page.
        var lastBottom = starts[total - 1] + g.contentHeight + g.marginBottom;
        ov.style.position = "absolute";
        ov.style.left = ed.offsetLeft + "px";
        ov.style.top = edTop + "px";
        ov.style.width = ed.offsetWidth + "px";
        ov.style.height = Math.max(ed.offsetHeight, lastBottom - edTop) + "px";
        ov.style.pointerEvents = "none";
        ov.style.zIndex = "1";

        var i, y;

        // A separator per break: the visual gap between two sheets of paper. The
        // break offset is where the NEXT page's content starts, so the gap is
        // drawn just above it (in the bottom-margin band of the previous page).
        for (i = 0; i < breaks.length; i++) {
            y = breaks[i] - edTop - Math.round(g.marginTop / 2);
            var sep = doc.createElement("div");
            sep.className = "rte-page-sep";
            sep.style.top = y + "px";
            ov.appendChild(sep);
        }

        for (i = 0; i < starts.length; i++) {
            var pageNo = i + 1;
            var contentTop = starts[i] - edTop;          // page's first line
            var contentBottom = contentTop + g.contentHeight;

            if (config.paginationShowPageNumbers) {
                var label = doc.createElement("div");
                label.className = "rte-page-num";
                label.style.top = (contentBottom + 6) + "px";
                label.appendChild(doc.createTextNode(
                    config.paginationShowPageCount ? ("Page " + pageNo + " of " + total) : ("Page " + pageNo)
                ));
                ov.appendChild(label);
            }

            if (g.headerHtml) {
                var h = doc.createElement("div");
                h.className = "rte-page-hf rte-page-header";
                h.style.top = (contentTop - Math.round(g.marginTop / 2)) + "px";
                h.innerHTML = expand(g.headerHtml, pageNo, total);
                ov.appendChild(h);
            }
            if (g.footerHtml) {
                var f = doc.createElement("div");
                f.className = "rte-page-hf rte-page-footer";
                f.style.top = (contentBottom + Math.round(g.marginBottom / 3)) + "px";
                f.innerHTML = expand(g.footerHtml, pageNo, total);
                ov.appendChild(f);
            }
        }
    }

    // ---- styles ---------------------------------------------------------

    function injectStyles(doc) {
        if (!doc || doc.getElementById("rte-pagination-styles")) return;
        var css =
            // The paper itself: a white column with a soft shadow on a grey desk.
            ".rte-page-view{box-shadow:0 1px 4px rgba(15,23,42,.16),0 8px 28px rgba(15,23,42,.10);}" +
            // Grey "desk" behind the page so the paper edge reads clearly.
            "body.rte-page-desk{background:#f1f5f9;}" +
            ".rte-page-overlay{position:absolute;pointer-events:none;}" +
            // Page boundary. Content flows continuously, so this is a crisp rule
            // drawn across the column (the way Word's page-break line reads) —
            // never a filled band, which would cover the text underneath.
            ".rte-page-sep{position:absolute;left:-24px;right:-24px;height:0;" +
            "border-top:1px dashed #94a3b8;}" +
            ".rte-page-num{position:absolute;right:8px;font:600 10px/1.4 'Segoe UI',system-ui,sans-serif;" +
            "letter-spacing:.04em;color:#94a3b8;text-transform:uppercase;}" +
            ".rte-page-hf{position:absolute;left:0;right:0;font:400 11px/1.4 'Segoe UI',system-ui,sans-serif;color:#64748b;}" +
            ".rte-page-header{text-align:left;}" +
            ".rte-page-footer{text-align:center;}" +
            "@media print{.rte-page-overlay{display:none !important;}" +
            ".rte-page-view{box-shadow:none !important;margin:0 !important;width:auto !important;}}";
        var st = doc.createElement("style");
        st.id = "rte-pagination-styles";
        st.appendChild(doc.createTextNode(css));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }

    // ---- serialization guard --------------------------------------------

    // The overlay lives next to the editable, not inside it, so it should never
    // serialize. This is the belt-and-braces guard for hosts where the editable
    // IS the body (inline mode), where "next to" can still mean "inside".
    function stripFor() {
        var ed = getEditable();
        if (!ed) return function () {};
        var nodes = ed.querySelectorAll ? ed.querySelectorAll("[data-rte-page-overlay]") : [];
        var parked = [];
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            parked.push({ node: n, parent: n.parentNode, next: n.nextSibling });
            if (n.parentNode) n.parentNode.removeChild(n);
        }
        return function restore() {
            for (var j = 0; j < parked.length; j++) {
                var p = parked[j];
                if (p.parent) p.parent.insertBefore(p.node, p.next || null);
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
                if (typeof orig !== "function" || orig.__rtePgWrapped) return;
                var w = function () {
                    var restore = stripFor();
                    try { return orig.apply(editor, arguments); } finally { restore(); }
                };
                w.__rtePgWrapped = true;
                editor[name] = w;
                did = true;
            })(names[i]);
        }
        if (did) wrapped = true;
    }
}
