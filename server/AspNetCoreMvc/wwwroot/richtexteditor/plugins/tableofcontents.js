if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Table of contents. An insertable, self-updating contents block
// built from the document's headings, with links that jump to them.
//
// Premium in both majors:
//   - CKEditor 5 table of contents: "Unlock this feature with selected CKEditor
//     Plans". Their pitch is that "the list stays up-to-date automatically as
//     the user works on the document", which is the bar this has to clear.
//   - TinyMCE tableofcontents: "This plugin is only available for paid TinyMCE
//     subscriptions".
//
// This editor already ships documentoutline.js, but that is a NAVIGATION PANEL
// beside the editor — chrome, not content. It never lands in the saved HTML.
// A table of contents is the opposite: it is part of the document you publish
// or print, so it has to survive getHTMLCode() and read correctly with no
// JavaScript running.
//
// Design notes:
//   - The block is contenteditable=false and rebuilt from the headings on every
//     mutation, so it cannot drift from the document. Hand-editing generated
//     content is a trap, so the block simply is not editable; delete it as a
//     unit and re-insert to move it.
//   - Entry text and numbers are written as REAL TEXT into the block (the same
//     reasoning as footnotes.js): the saved HTML has to stand alone once it
//     leaves the editor, where no script will regenerate anything.
//   - Headings inside generated regions (this block, the footnotes section) are
//     skipped, otherwise the TOC lists its own title.
//   - Page numbers are shown when pagination.js is loaded AND page view is on,
//     via editor.getPageOfElement(). Outside page view a page number would be a
//     fiction, so none is written.
RTE_DefaultConfig.plugin_tableofcontents = RTE_Plugin_TableOfContents;

// Heading above the list. Set to "" to omit it.
if (typeof RTE_DefaultConfig.tocTitle === "undefined") RTE_DefaultConfig.tocTitle = "Contents";
// Heading levels included, inclusive.
if (typeof RTE_DefaultConfig.tocMinLevel === "undefined") RTE_DefaultConfig.tocMinLevel = 1;
if (typeof RTE_DefaultConfig.tocMaxLevel === "undefined") RTE_DefaultConfig.tocMaxLevel = 3;
// "auto" = page numbers when page view is on | true = always try | false = never.
if (typeof RTE_DefaultConfig.tocPageNumbers === "undefined") RTE_DefaultConfig.tocPageNumbers = "auto";

function RTE_Plugin_TableOfContents() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var queued = false;
    var idSeq = 0;

    obj.PluginName = "TableOfContents";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_inserttoc", function (state) {
            state.returnValue = true;
            obj.Insert();
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", function () { setup(); queue(); }); } catch (e) {}
        setTimeout(function () { setup(); queue(); }, 0);

        // Public API.
        editor.insertTableOfContents = function () { return obj.Insert(); };
        editor.updateTableOfContents = function () { return rebuild(); };
        editor.removeTableOfContents = function () { return obj.Remove(); };
        editor.hasTableOfContents = function () { return !!block(); };
        editor.getTableOfContents = function () { return obj.List(); };
        editor.getTocCss = function () { return css(); };
    };

    function setup() {
        var doc = getDoc();
        if (!doc) return;
        injectStyles(doc);
        if (doc === boundDoc) return;
        boundDoc = doc;
        var editable = getEditable();
        if (!editable) return;
        editable.addEventListener("keyup", queue);
        editable.addEventListener("cut", queue);
        editable.addEventListener("paste", queue);
        editable.addEventListener("drop", queue);
        // Clicking an entry scrolls to its heading. The block is not editable, so
        // the anchors would otherwise do nothing inside the iframe.
        editable.addEventListener("click", function (e) {
            var a = closestClass(e.target, "rte-toc-link", editable);
            if (!a) return;
            e.preventDefault();
            var target = editable.querySelector("#" + cssEscapeId(a.getAttribute("data-toc-target")));
            if (!target) return;
            try { target.scrollIntoView({ block: "center" }); } catch (e2) { target.scrollIntoView(); }
        });
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    // setTimeout not rAF: a hidden iframe or background tab never fires rAF, and
    // the contents would silently stop updating.
    function queue() {
        if (queued) return;
        queued = true;
        setTimeout(function () { queued = false; rebuild(); }, 0);
    }

    function closestClass(node, cls, root) {
        while (node && node !== root) {
            if (node.nodeType === 1 && node.classList && node.classList.contains(cls)) return node;
            node = node.parentNode;
        }
        return null;
    }

    function cssEscapeId(s) { return String(s || "").replace(/["\\\]\[]/g, "\\$&"); }

    function block() {
        var editable = getEditable();
        return editable ? editable.querySelector("nav.rte-toc") : null;
    }

    // ---- heading collection ---------------------------------------------

    function levelRange() {
        var min = Math.max(1, Math.min(6, parseInt(config.tocMinLevel, 10) || 1));
        var max = Math.max(min, Math.min(6, parseInt(config.tocMaxLevel, 10) || 3));
        return { min: min, max: max };
    }

    function headings() {
        var editable = getEditable();
        if (!editable) return [];
        var r = levelRange();
        var sel = [];
        for (var l = r.min; l <= r.max; l++) sel.push("h" + l);
        var all = editable.querySelectorAll(sel.join(","));
        var out = [];
        for (var i = 0; i < all.length; i++) {
            var h = all[i];
            // Skip generated regions, or the TOC lists its own "Contents" title
            // and the footnotes section heading.
            if (h.closest && (h.closest("nav.rte-toc") || h.closest("section.rte-footnotes"))) continue;
            if (!(h.textContent || "").trim()) continue;   // empty heading = noise
            out.push(h);
        }
        return out;
    }

    function ensureHeadingId(h) {
        var id = h.getAttribute("id");
        if (id && id.indexOf("rte-h-") === 0) return id;
        if (id) return id;   // respect an id the author already chose
        id = "rte-h-" + Math.floor(Math.random() * 1e9).toString(36) + (idSeq++).toString(36);
        h.setAttribute("id", id);
        return id;
    }

    function wantPageNumbers() {
        var mode = config.tocPageNumbers;
        if (mode === false) return false;
        if (typeof editor.getPageOfElement !== "function") return false;
        if (mode === true) return true;
        // "auto": only in page view, where the numbers mean something.
        try { return typeof editor.isPageView === "function" && editor.isPageView(); } catch (e) { return false; }
    }

    // ---- build -----------------------------------------------------------

    obj.Insert = function () {
        var doc = getDoc();
        var editable = getEditable();
        if (!doc || !editable) return false;
        var existing = block();
        if (existing) { rebuild(); return true; }   // one per document

        var nav = doc.createElement("nav");
        nav.className = "rte-toc";
        nav.setAttribute("contenteditable", "false");
        nav.setAttribute("data-rte-toc", "1");

        var placed = false;
        try {
            if (typeof editor.insertElement === "function") { editor.insertElement(nav); placed = true; }
        } catch (e) {}
        if (!placed) editable.insertBefore(nav, editable.firstChild);

        rebuild();
        fireChange();
        return true;
    };

    obj.Remove = function () {
        var b = block();
        if (!b || !b.parentNode) return false;
        b.parentNode.removeChild(b);
        fireChange();
        return true;
    };

    function rebuild() {
        var nav = block();
        if (!nav) return [];
        var doc = getDoc();
        if (!doc) return [];

        var hs = headings();
        var r = levelRange();
        var pages = wantPageNumbers();

        // Carry forward the page numbers already in the block, keyed by heading.
        // Without this, opening a document that was saved in page view and then
        // rebuilding with page view OFF silently deletes numbers that were
        // computed for real — destroying part of the saved document just by
        // loading it. Stale-until-you-re-enter-page-view matches how a word
        // processor treats a contents field; silently losing them does not.
        var priorPages = {};
        var priorItems = nav.querySelectorAll("li.rte-toc-item");
        for (var p = 0; p < priorItems.length; p++) {
            var pa = priorItems[p].querySelector("a.rte-toc-link");
            var pp = priorItems[p].querySelector(".rte-toc-page");
            if (pa && pp) {
                var n = parseInt(pp.textContent, 10);
                if (n) priorPages[pa.getAttribute("data-toc-target")] = n;
            }
        }

        // Rebuild the inner list wholesale. The block is not editable, so there
        // is no caret inside it to preserve.
        while (nav.firstChild) nav.removeChild(nav.firstChild);

        var title = String(config.tocTitle == null ? "" : config.tocTitle);
        if (title) {
            var h = doc.createElement("div");
            h.className = "rte-toc-title";
            h.textContent = title;
            nav.appendChild(h);
        }

        if (!hs.length) {
            var empty = doc.createElement("div");
            empty.className = "rte-toc-empty";
            empty.textContent = "No headings yet.";
            nav.appendChild(empty);
            return [];
        }

        var ol = doc.createElement("ol");
        ol.className = "rte-toc-list";
        var out = [];
        for (var i = 0; i < hs.length; i++) {
            var head = hs[i];
            var level = parseInt(head.nodeName.substring(1), 10) || 1;
            var id = ensureHeadingId(head);
            var text = (head.textContent || "").trim();

            var li = doc.createElement("li");
            li.className = "rte-toc-item rte-toc-l" + (level - r.min + 1);

            var a = doc.createElement("a");
            a.className = "rte-toc-link";
            a.setAttribute("href", "#" + id);
            a.setAttribute("data-toc-target", id);
            a.textContent = text;
            li.appendChild(a);

            var page = null;
            if (pages) {
                try { page = editor.getPageOfElement(head); } catch (e) { page = null; }
            }
            // Could not compute one (page view off) but this entry already had a
            // number: keep it rather than throw it away.
            if (!page && priorPages[id]) page = priorPages[id];
            if (page) {
                var span = doc.createElement("span");
                span.className = "rte-toc-page";
                span.textContent = String(page);
                li.appendChild(span);
            }
            ol.appendChild(li);
            out.push({ id: id, level: level, text: text, page: page });
        }
        nav.appendChild(ol);
        return out;
    }

    obj.List = function () {
        var nav = block();
        if (!nav) return [];
        var items = nav.querySelectorAll("li.rte-toc-item");
        var out = [];
        for (var i = 0; i < items.length; i++) {
            var a = items[i].querySelector("a.rte-toc-link");
            var p = items[i].querySelector(".rte-toc-page");
            var cls = items[i].className.match(/rte-toc-l(\d+)/);
            out.push({
                id: a ? a.getAttribute("data-toc-target") : null,
                level: cls ? parseInt(cls[1], 10) : 1,
                text: a ? a.textContent : "",
                page: p ? parseInt(p.textContent, 10) : null
            });
        }
        return out;
    };

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }

    // ---- styles ----------------------------------------------------------

    function css() {
        return (
            "nav.rte-toc{margin:0 0 1.4em;padding:.9em 1.1em;border:1px solid #ddd;border-radius:6px;" +
            "background:#fafbfc;}" +
            "nav.rte-toc .rte-toc-title{font-weight:700;margin-bottom:.45em;}" +
            "nav.rte-toc .rte-toc-empty{color:#888;font-style:italic;}" +
            "ol.rte-toc-list{list-style:none;margin:0;padding:0;counter-reset:rte-toc;}" +
            "ol.rte-toc-list>li{counter-increment:rte-toc;margin:.16em 0;display:flex;align-items:baseline;gap:.5em;}" +
            // A leader line between the entry and its page number, the way a
            // printed contents page sets it.
            "ol.rte-toc-list>li>a{color:#1474ea;text-decoration:none;cursor:pointer;}" +
            "ol.rte-toc-list>li>a:hover{text-decoration:underline;}" +
            "ol.rte-toc-list>li:has(>.rte-toc-page)>a::after{content:'';flex:1 1 auto;margin:0 .4em;" +
            "border-bottom:1px dotted #bbb;transform:translateY(-.25em);display:inline-block;min-width:1.5em;}" +
            "ol.rte-toc-list>li>a{flex:1 1 auto;display:flex;align-items:baseline;}" +
            ".rte-toc-page{flex:0 0 auto;color:#666;font-variant-numeric:tabular-nums;}" +
            ".rte-toc-l2{padding-left:1.3em;}" +
            ".rte-toc-l3{padding-left:2.6em;}" +
            ".rte-toc-l4{padding-left:3.9em;}" +
            ".rte-toc-l5{padding-left:5.2em;}" +
            ".rte-toc-l6{padding-left:6.5em;}"
        );
    }

    function injectStyles(doc) {
        if (!doc) return;
        var existing = doc.getElementById("rte-toc-styles");
        var text = css();
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        var st = doc.createElement("style");
        st.id = "rte-toc-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
