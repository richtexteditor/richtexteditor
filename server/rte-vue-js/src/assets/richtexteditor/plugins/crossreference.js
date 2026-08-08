if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Cross-references. "See clause 3.2", "Figure 4", "as described in
// Scope of Work (page 7)" — references that keep pointing at the right thing
// after the document is edited around them.
//
// This is the piece that makes the rest of the document suite hold together.
// Legal numbering renumbers clauses, the table of contents re-derives itself,
// footnotes renumber — and until now a sentence saying "see clause 3.2" stayed
// frozen at 3.2 while the clause it meant became 4.1. A stale cross-reference in
// a contract is not cosmetic; it changes what the contract says.
//
// Competitive position (checked 2026-07-27): CKEditor 5 ships Bookmarks
// (in-text anchors) and its own auto-updating table of contents, but describes
// auto-updating cross-references as a PLANNED enhancement rather than a current
// feature. TinyMCE documents no cross-reference plugin. Word has had this for
// decades and it is table stakes for contract and specification work.
//
// Design notes:
//   - A reference is an atomic contenteditable=false chip carrying the target id
//     and the display format. The visible text is REAL TEXT, recomputed on every
//     mutation, so the saved HTML stands alone outside the editor (same reasoning
//     as footnotes.js).
//   - A reference whose target has been deleted renders a visible error rather
//     than silently keeping its last value. Word does this too, and it is the
//     right call: a wrong-but-plausible clause number is far more dangerous than
//     an obviously broken one.
RTE_DefaultConfig.plugin_crossreference = RTE_Plugin_CrossReference;

// Shown when the target no longer exists.
if (typeof RTE_DefaultConfig.crossRefMissingText === "undefined") RTE_DefaultConfig.crossRefMissingText = "[reference not found]";
// Prefixes used when auto-numbering tables and figures.
if (typeof RTE_DefaultConfig.crossRefTableLabel === "undefined") RTE_DefaultConfig.crossRefTableLabel = "Table";
if (typeof RTE_DefaultConfig.crossRefFigureLabel === "undefined") RTE_DefaultConfig.crossRefFigureLabel = "Figure";

function RTE_Plugin_CrossReference() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var queued = false;
    var idSeq = 0;

    obj.PluginName = "CrossReference";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_insertcrossreference", function (state) {
            state.returnValue = true;
            var v = state && state.value;
            if (v && typeof v === "object") obj.Insert(v.target, v.format);
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", function () { setup(); queue(); }); } catch (e) {}
        setTimeout(function () { setup(); queue(); }, 0);

        // Public API.
        editor.listCrossReferenceTargets = function () { return obj.Targets(); };
        editor.insertCrossReference = function (targetId, format) { return obj.Insert(targetId, format); };
        editor.updateCrossReferences = function () { return refresh(); };
        editor.getCrossReferences = function () { return obj.List(); };
        editor.getCrossReferenceCss = function () { return css(); };
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
        editable.addEventListener("click", function (e) {
            var chip = closestClass(e.target, "rte-xref", editable);
            if (!chip) return;
            e.preventDefault();
            var t = resolveTarget(chip.getAttribute("data-xref-target"));
            if (!t) return;
            try { t.el.scrollIntoView({ block: "center" }); } catch (e2) { t.el.scrollIntoView(); }
        });
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function queue() {
        if (queued) return;
        queued = true;
        setTimeout(function () { queued = false; refresh(); }, 0);
    }

    function closestClass(node, cls, root) {
        while (node && node !== root) {
            if (node.nodeType === 1 && node.classList && node.classList.contains(cls)) return node;
            node = node.parentNode;
        }
        return null;
    }

    function newId(prefix) {
        return prefix + Math.floor(Math.random() * 1e9).toString(36) + (idSeq++).toString(36);
    }

    function ensureId(el, prefix) {
        var id = el.getAttribute("id");
        if (id) return id;
        id = newId(prefix);
        el.setAttribute("id", id);
        return id;
    }

    // ---- targets ---------------------------------------------------------

    // Everything in the document that can be referred to, in document order.
    obj.Targets = function () {
        var editable = getEditable();
        if (!editable) return [];
        var out = [];

        var headings = editable.querySelectorAll("h1,h2,h3,h4,h5,h6");
        for (var i = 0; i < headings.length; i++) {
            var h = headings[i];
            // Generated regions are not referable content.
            if (h.closest && (h.closest("nav.rte-toc") || h.closest("section.rte-footnotes"))) continue;
            var text = (h.textContent || "").trim();
            if (!text) continue;
            out.push({ id: ensureId(h, "rte-h-"), type: "heading", label: text, number: null });
        }

        // Legal-numbered clauses: the number is derived from position, exactly
        // like the CSS counters that render it.
        var roots = editable.querySelectorAll("ol.rte-legal-list");
        for (var r = 0; r < roots.length; r++) collectClauses(roots[r], [], out);

        var notes = editable.querySelectorAll("li.rte-fn-note[data-fn-id]");
        for (var n = 0; n < notes.length; n++) {
            out.push({
                id: ensureId(notes[n], "rte-fn-"),
                type: "footnote",
                label: (noteText(notes[n]) || "footnote"),
                number: notes[n].getAttribute("data-fn-number")
            });
        }

        var tables = editable.querySelectorAll("table");
        var tnum = 0;
        for (var t = 0; t < tables.length; t++) {
            tnum++;
            var cap = tables[t].querySelector("caption");
            out.push({
                id: ensureId(tables[t], "rte-tbl-"),
                type: "table",
                label: (cap && cap.textContent.trim()) || (String(config.crossRefTableLabel) + " " + tnum),
                number: String(tnum)
            });
        }

        var figs = editable.querySelectorAll("figure, img");
        var fnum = 0;
        for (var f = 0; f < figs.length; f++) {
            // An <img> inside a <figure> is the same figure, counted once.
            if (figs[f].nodeName === "IMG" && figs[f].closest && figs[f].closest("figure")) continue;
            fnum++;
            var fc = figs[f].querySelector ? figs[f].querySelector("figcaption") : null;
            out.push({
                id: ensureId(figs[f], "rte-fig-"),
                type: "figure",
                label: (fc && fc.textContent.trim()) || (String(config.crossRefFigureLabel) + " " + fnum),
                number: String(fnum)
            });
        }
        return out;
    };

    function collectClauses(ol, path, out) {
        var idx = 0;
        for (var i = 0; i < ol.children.length; i++) {
            var li = ol.children[i];
            if (li.nodeName !== "LI") continue;
            idx++;
            var here = path.concat([idx]);
            var first = firstLineText(li);
            out.push({
                id: ensureId(li, "rte-cl-"),
                type: "clause",
                label: first || ("clause " + here.join(".")),
                number: here.join(".")
            });
            for (var c = 0; c < li.children.length; c++) {
                if (li.children[c].nodeName === "OL") collectClauses(li.children[c], here, out);
            }
        }
    }

    // The clause's own text, excluding any nested sub-list.
    function firstLineText(li) {
        var s = "";
        for (var i = 0; i < li.childNodes.length; i++) {
            var n = li.childNodes[i];
            if (n.nodeType === 1 && (n.nodeName === "OL" || n.nodeName === "UL")) break;
            s += n.textContent || "";
        }
        return s.trim().replace(/\s+/g, " ").slice(0, 80);
    }

    function noteText(note) {
        var clone = note.cloneNode(true);
        var backs = clone.querySelectorAll ? clone.querySelectorAll("a.rte-fn-back") : [];
        for (var i = 0; i < backs.length; i++) if (backs[i].parentNode) backs[i].parentNode.removeChild(backs[i]);
        return (clone.textContent || "").replace(/↩/g, "").trim().slice(0, 80);
    }

    function resolveTarget(id) {
        if (!id) return null;
        var list = obj.Targets();
        for (var i = 0; i < list.length; i++) {
            if (list[i].id !== id) continue;
            var editable = getEditable();
            var el = editable ? editable.querySelector("#" + id.replace(/["\\\]\[]/g, "\\$&")) : null;
            if (!el) return null;
            var t = list[i];
            t.el = el;
            return t;
        }
        return null;
    }

    // ---- insert ----------------------------------------------------------

    // format: "text" | "number" | "page" | "position" | "label"
    obj.Insert = function (targetId, format) {
        var doc = getDoc();
        var editable = getEditable();
        if (!doc || !editable) return false;
        var target = resolveTarget(targetId);
        if (!target) return false;
        format = String(format || "text");

        var chip = doc.createElement("span");
        chip.className = "rte-xref";
        chip.setAttribute("data-xref-target", targetId);
        chip.setAttribute("data-xref-format", format);
        chip.setAttribute("contenteditable", "false");
        chip.textContent = displayFor(target, format, chip);

        var placed = false;
        try {
            if (typeof editor.insertElement === "function") { editor.insertElement(chip); placed = true; }
        } catch (e) {}
        if (!placed) {
            try {
                var sel = editor.getSelection();
                if (sel && sel.rangeCount) {
                    var r = sel.getRangeAt(0);
                    r.collapse(false);
                    r.insertNode(chip);
                    r.setStartAfter(chip); r.collapse(true);
                    sel.removeAllRanges(); sel.addRange(r);
                    placed = true;
                }
            } catch (e) {}
        }
        if (!placed) editable.appendChild(chip);
        // Recompute now that the chip is actually IN the document. The text set
        // above was computed while it was still detached, and the "position"
        // format compares the chip against its target — on a detached node that
        // comparison is meaningless, so a reference to something earlier in the
        // document displayed "below" until the next refresh happened to fix it.
        refresh();
        fireChange();
        return targetId;
    };

    function displayFor(target, format, chip) {
        if (!target) return String(config.crossRefMissingText);
        switch (format) {
            case "number":
                if (target.number) return target.number;
                return target.label;                       // headings have no number
            case "label":
                // "Table 2" / "Figure 3" / "clause 3.2" style
                if (target.type === "table") return String(config.crossRefTableLabel) + " " + target.number;
                if (target.type === "figure") return String(config.crossRefFigureLabel) + " " + target.number;
                if (target.type === "clause") return "clause " + target.number;
                if (target.type === "footnote") return "footnote " + target.number;
                return target.label;
            case "page":
                var p = null;
                try {
                    if (typeof editor.getPageOfElement === "function") p = editor.getPageOfElement(target.el);
                } catch (e) { p = null; }
                // No page view means no honest page number; keep whatever was
                // last computed rather than inventing or blanking one.
                if (p) return String(p);
                var prev = chip ? chip.getAttribute("data-xref-last-page") : null;
                return prev || "?";
            case "position":
                return positionOf(target.el, chip);
            default:
                return target.label;
        }
    }

    // "above" / "below" relative to the reference itself.
    function positionOf(targetEl, chip) {
        if (!targetEl || !chip) return "above";
        try {
            var pos = chip.compareDocumentPosition(targetEl);
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) return "above";
            if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return "below";
        } catch (e) {}
        return "above";
    }

    // ---- refresh ---------------------------------------------------------

    function chips() {
        var editable = getEditable();
        if (!editable) return [];
        return Array.prototype.slice.call(editable.querySelectorAll("span.rte-xref[data-xref-target]"));
    }

    function refresh() {
        var list = chips();
        if (!list.length) return [];
        // Build the target index once rather than per chip.
        var targets = obj.Targets();
        var byId = {};
        for (var t = 0; t < targets.length; t++) byId[targets[t].id] = targets[t];
        var editable = getEditable();

        var out = [];
        for (var i = 0; i < list.length; i++) {
            var chip = list[i];
            var id = chip.getAttribute("data-xref-target");
            var fmt = chip.getAttribute("data-xref-format") || "text";
            var target = byId[id] || null;
            if (target) {
                target.el = editable.querySelector("#" + id.replace(/["\\\]\[]/g, "\\$&"));
            }
            var text = displayFor(target, fmt, chip);
            if (chip.textContent !== text) chip.textContent = text;
            if (target) {
                chip.classList.remove("rte-xref-broken");
                if (fmt === "page" && /^\d+$/.test(text)) chip.setAttribute("data-xref-last-page", text);
            } else {
                // Visible failure beats a plausible wrong number.
                chip.classList.add("rte-xref-broken");
            }
            out.push({ target: id, format: fmt, text: text, resolved: !!target });
        }
        return out;
    }

    obj.List = function () {
        var list = chips();
        var out = [];
        for (var i = 0; i < list.length; i++) {
            out.push({
                target: list[i].getAttribute("data-xref-target"),
                format: list[i].getAttribute("data-xref-format") || "text",
                text: list[i].textContent,
                resolved: !list[i].classList.contains("rte-xref-broken")
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
            "span.rte-xref{color:#1474ea;cursor:pointer;border-bottom:1px dotted #9dc2f5;" +
            "user-select:none;}" +
            "span.rte-xref:hover{border-bottom-style:solid;}" +
            "span.rte-xref.rte-xref-broken{color:#c81e1e;background:rgba(200,30,30,.09);" +
            "border-bottom:1px solid #e59b9b;border-radius:2px;padding:0 .15em;}"
        );
    }

    function injectStyles(doc) {
        if (!doc) return;
        var existing = doc.getElementById("rte-xref-styles");
        var text = css();
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        var st = doc.createElement("style");
        st.id = "rte-xref-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
