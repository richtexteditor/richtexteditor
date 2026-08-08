if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Footnotes. Inline reference markers plus an auto-numbered notes
// section at the end of the document — the citation apparatus legal briefs,
// academic papers, standards and long-form publishing are written with.
//
// Both premium competitors charge for this:
//   - CKEditor 5 footnotes: "To use this premium feature, you need to activate
//     it with proper credentials"; available in the Essential, Professional and
//     Custom plans.
//   - TinyMCE footnotes: "This plugin is only available for paid TinyMCE
//     subscriptions" (premium plugin, TinyMCE 6.2+).
// Froala, Quill and Lexical ship nothing equivalent.
//
// Design notes:
//   - The marker is an ATOMIC contenteditable=false <sup>, so arrow keys and
//     backspace treat it as one unit and the caret can never land inside the
//     number and corrupt it.
//   - Numbers are written as LITERAL TEXT, not CSS counters. multilevellist.js
//     deliberately went the other way, but the trade-off inverts here: a
//     footnote's whole job is to survive leaving the editor (publishing, PDF,
//     an RSS feed, someone else's page), and a CSS-counter number is invisible
//     the moment the stylesheet does not travel with it. So we renumber on
//     every mutation instead — see syncFootnotes().
//   - Marker order is DOCUMENT order, and the <li> notes are re-sorted to match,
//     so cutting a paragraph and pasting it earlier renumbers both ends.
//   - Deleting a marker deletes its note; deleting the last marker removes the
//     whole section. No orphans are left in the saved HTML.
//   - The notes section IS content and is meant to persist in getHTMLCode()
//     output — same contract as multilevellist's root class, and unlike the
//     presentational overlays (pagination/typewriter) which are stripped around
//     every serialize.
RTE_DefaultConfig.plugin_footnotes = RTE_Plugin_Footnotes;

// Heading rendered above the notes section. Set to "" to omit the heading.
if (typeof RTE_DefaultConfig.footnotesTitle === "undefined") RTE_DefaultConfig.footnotesTitle = "Footnotes";
// "decimal" | "lower-roman" | "upper-roman" | "lower-alpha" | "upper-alpha".
if (typeof RTE_DefaultConfig.footnotesNumbering === "undefined") RTE_DefaultConfig.footnotesNumbering = "decimal";
// Prefix/suffix wrapped around the marker number, e.g. "[" and "]".
if (typeof RTE_DefaultConfig.footnotesMarkerPrefix === "undefined") RTE_DefaultConfig.footnotesMarkerPrefix = "";
if (typeof RTE_DefaultConfig.footnotesMarkerSuffix === "undefined") RTE_DefaultConfig.footnotesMarkerSuffix = "";

function RTE_Plugin_Footnotes() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var syncQueued = false;

    obj.PluginName = "Footnotes";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_insertfootnote", function (state) {
            state.returnValue = true;
            obj.InsertFootnote();
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        // Content replaced wholesale (setHTMLCode / load): re-bind and renumber,
        // because the incoming HTML may already carry markers from a prior save.
        try { editor.attachEvent("aftersethtml", function () { setup(); queueSync(); }); } catch (e) {}
        setTimeout(function () { setup(); queueSync(); }, 0);

        // Public API.
        editor.insertFootnote = function (text) { return obj.InsertFootnote(text); };
        editor.getFootnotes = function () { return obj.List(); };
        editor.syncFootnotes = function () { return syncFootnotes(); };
        editor.getFootnotesCss = function () { return css(); };
    };

    function setup() {
        var doc = getDoc();
        if (!doc) return;
        injectStyles(doc);
        if (doc !== boundDoc) { bindEditable(); boundDoc = doc; }
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function bindEditable() {
        var editable = getEditable();
        if (!editable) return;
        // Any content mutation can add, remove or move a marker. Renumbering is
        // cheap (a querySelectorAll plus text writes) so we just resync rather
        // than trying to detect which edit mattered.
        editable.addEventListener("keyup", queueSync);
        editable.addEventListener("cut", queueSync);
        editable.addEventListener("paste", queueSync);
        editable.addEventListener("drop", queueSync);
        // Clicking a marker jumps to its note, and clicking the backlink returns.
        editable.addEventListener("click", function (e) {
            var ref = closestClass(e.target, "rte-fn-ref", editable);
            var back = closestClass(e.target, "rte-fn-back", editable);
            var target = null;
            if (ref) target = noteFor(ref.getAttribute("data-fn-id"));
            else if (back) target = refFor(back.getAttribute("data-fn-id"));
            if (!target) return;
            e.preventDefault();
            try { target.scrollIntoView({ block: "center" }); } catch (e2) { target.scrollIntoView(); }
            flash(target);
        });
    }

    // Coalesce bursts of edits into one renumber. setTimeout, not rAF: the
    // editor may live in a background tab or a hidden iframe, where rAF never
    // fires and the numbering would silently stop updating.
    function queueSync() {
        if (syncQueued) return;
        syncQueued = true;
        setTimeout(function () { syncQueued = false; syncFootnotes(); }, 0);
    }

    function closestClass(node, cls, root) {
        while (node && node !== root) {
            if (node.nodeType === 1 && node.classList && node.classList.contains(cls)) return node;
            node = node.parentNode;
        }
        return null;
    }

    function newId() {
        return "fn" + Math.floor(Math.random() * 1e9).toString(36) + (idSeq++).toString(36);
    }
    var idSeq = 0;

    // ---- lookups ---------------------------------------------------------

    function refs() {
        var editable = getEditable();
        if (!editable) return [];
        // Document order is exactly what querySelectorAll returns, which is what
        // the numbering is defined by.
        return Array.prototype.slice.call(editable.querySelectorAll("sup.rte-fn-ref[data-fn-id]"));
    }

    function section() {
        var editable = getEditable();
        return editable ? editable.querySelector("section.rte-footnotes") : null;
    }

    function noteFor(id) {
        var sec = section();
        return sec ? sec.querySelector('li.rte-fn-note[data-fn-id="' + cssEscape(id) + '"]') : null;
    }

    function refFor(id) {
        var editable = getEditable();
        return editable ? editable.querySelector('sup.rte-fn-ref[data-fn-id="' + cssEscape(id) + '"]') : null;
    }

    function cssEscape(s) { return String(s).replace(/["\\]/g, "\\$&"); }

    // ---- insert ----------------------------------------------------------

    obj.InsertFootnote = function (text) {
        var doc = getDoc();
        var editable = getEditable();
        if (!doc || !editable) return null;

        var id = newId();
        var sup = doc.createElement("sup");
        sup.className = "rte-fn-ref";
        sup.setAttribute("data-fn-id", id);
        sup.setAttribute("contenteditable", "false");
        sup.setAttribute("id", "fnref-" + id);
        sup.textContent = "0"; // placeholder; syncFootnotes writes the real number

        // Drop the marker at the caret. insertElement keeps the editor's own
        // undo/selection bookkeeping honest, which hand-splicing would not.
        var placed = false;
        try {
            if (typeof editor.insertElement === "function") { editor.insertElement(sup); placed = true; }
        } catch (e) {}
        if (!placed) {
            try {
                var sel = editor.getSelection();
                if (sel && sel.rangeCount) {
                    var range = sel.getRangeAt(0);
                    range.collapse(false);
                    range.insertNode(sup);
                    range.setStartAfter(sup);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    placed = true;
                }
            } catch (e) {}
        }
        if (!placed) { editable.appendChild(sup); }

        var note = ensureSection(doc).querySelector("ol.rte-fn-list");
        var li = doc.createElement("li");
        li.className = "rte-fn-note";
        li.setAttribute("data-fn-id", id);
        li.setAttribute("id", "fn-" + id);
        // The note text sits DIRECTLY in the <li>. An earlier revision wrapped it
        // in <span class="rte-fn-text">, which was actively harmful: an empty
        // inline element is a caret trap — the caret at offset 0 of an empty span
        // resolves to the parent, so the first thing the user typed landed
        // OUTSIDE the span and getFootnotes() reported the note as empty while
        // the note visibly had text.
        if (text != null && String(text) !== "") li.appendChild(doc.createTextNode(String(text)));
        var back = doc.createElement("a");
        back.className = "rte-fn-back";
        back.setAttribute("data-fn-id", id);
        back.setAttribute("href", "#fnref-" + id);
        back.setAttribute("contenteditable", "false");
        back.setAttribute("title", "Back to reference");
        back.textContent = "\u21a9";
        li.appendChild(back);
        note.appendChild(li);

        syncFootnotes();
        // Put the caret at the START of the new note so the user can just type
        // the citation. Offset 0 of the <li> itself, which is a block and so
        // holds a caret reliably, unlike an empty inline wrapper.
        try {
            var r = doc.createRange();
            r.setStart(li, 0);
            r.collapse(true);
            var s2 = editor.getSelection();
            s2.removeAllRanges();
            s2.addRange(r);
            if (typeof editor.focus === "function") editor.focus();
        } catch (e) {}
        fireChange();
        return id;
    };

    function ensureSection(doc) {
        var editable = getEditable();
        var sec = section();
        if (sec) return sec;
        sec = doc.createElement("section");
        sec.className = "rte-footnotes";
        var title = String(config.footnotesTitle == null ? "" : config.footnotesTitle);
        if (title) {
            var h = doc.createElement("h2");
            h.className = "rte-fn-title";
            h.textContent = title;
            sec.appendChild(h);
        }
        var ol = doc.createElement("ol");
        ol.className = "rte-fn-list";
        sec.appendChild(ol);
        editable.appendChild(sec);
        return sec;
    }

    // ---- the renumber / reconcile pass -----------------------------------

    // Single source of truth: the markers present in the document, in order.
    // Everything else (note order, note existence, both sets of numbers) is
    // derived from that list, so there is no state to drift.
    function syncFootnotes() {
        var doc = getDoc();
        var sec = section();
        var list = refs();

        if (!list.length) {
            // Last marker went away: drop the section rather than leaving an
            // empty "Footnotes" heading in the saved HTML.
            if (sec && sec.parentNode) sec.parentNode.removeChild(sec);
            return [];
        }
        if (!doc) return [];
        if (!sec) sec = ensureSection(doc);
        var ol = sec.querySelector("ol.rte-fn-list");
        if (!ol) { ol = doc.createElement("ol"); ol.className = "rte-fn-list"; sec.appendChild(ol); }

        var seen = {};
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var ref = list[i];
            var id = ref.getAttribute("data-fn-id");
            // A copy/paste of a marker duplicates its id; re-key the duplicate so
            // the two markers do not fight over one note.
            if (seen[id]) {
                var fresh = newId();
                ref.setAttribute("data-fn-id", fresh);
                ref.setAttribute("id", "fnref-" + fresh);
                id = fresh;
            }
            seen[id] = true;

            var num = String(i + 1);
            var label = String(config.footnotesMarkerPrefix || "") + num + String(config.footnotesMarkerSuffix || "");
            if (ref.textContent !== label) ref.textContent = label;
            ref.setAttribute("data-fn-number", num);
            if (ref.getAttribute("contenteditable") !== "false") ref.setAttribute("contenteditable", "false");
            if (ref.getAttribute("id") !== "fnref-" + id) ref.setAttribute("id", "fnref-" + id);

            var note = ol.querySelector('li.rte-fn-note[data-fn-id="' + cssEscape(id) + '"]');
            if (!note) {
                // Marker with no note — a paste from elsewhere, or a note the
                // user deleted by hand. Give it an empty note to write into.
                note = doc.createElement("li");
                note.className = "rte-fn-note";
                note.setAttribute("data-fn-id", id);
                note.setAttribute("id", "fn-" + id);
            }
            note.setAttribute("data-fn-number", num);
            // Append in marker order — this both inserts new notes and re-sorts
            // existing ones to match a reordered document.
            ol.appendChild(note);
            out.push({ id: id, number: i + 1, text: noteText(note) });
        }

        // Drop notes whose marker is gone.
        var notes = Array.prototype.slice.call(ol.querySelectorAll("li.rte-fn-note"));
        for (var j = 0; j < notes.length; j++) {
            if (!seen[notes[j].getAttribute("data-fn-id")]) ol.removeChild(notes[j]);
        }

        if (ol.getAttribute("data-numbering") !== config.footnotesNumbering) {
            ol.setAttribute("data-numbering", config.footnotesNumbering);
        }
        return out;
    }

    // Read the WHOLE <li> minus the backlink rather than one designated child.
    // The user can type anywhere in the note, and documents saved by an earlier
    // revision still carry a .rte-fn-text wrapper, so anything that trusts a
    // single container reports empty text for notes that plainly have some.
    function noteText(note) {
        if (!note) return "";
        var clone = note.cloneNode(true);
        var backs = clone.querySelectorAll ? clone.querySelectorAll("a.rte-fn-back") : [];
        for (var i = 0; i < backs.length; i++) {
            if (backs[i].parentNode) backs[i].parentNode.removeChild(backs[i]);
        }
        return (clone.textContent || "").replace(/\u21a9/g, "").trim();
    }

    obj.List = function () {
        var sec = section();
        if (!sec) return [];
        var out = [];
        var notes = sec.querySelectorAll("li.rte-fn-note");
        for (var i = 0; i < notes.length; i++) {
            out.push({
                id: notes[i].getAttribute("data-fn-id"),
                number: parseInt(notes[i].getAttribute("data-fn-number"), 10) || (i + 1),
                text: noteText(notes[i])
            });
        }
        return out;
    };

    function flash(el) {
        if (!el || !el.classList) return;
        el.classList.add("rte-fn-flash");
        setTimeout(function () { try { el.classList.remove("rte-fn-flash"); } catch (e) {} }, 900);
    }

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }

    // ---- styles ----------------------------------------------------------

    function css() {
        var numbering = String(config.footnotesNumbering || "decimal");
        return (
            "sup.rte-fn-ref{cursor:pointer;font-size:.72em;line-height:0;vertical-align:super;" +
            "color:#1474ea;font-weight:700;padding:0 .12em;user-select:none;}" +
            "sup.rte-fn-ref:hover{text-decoration:underline;}" +
            "section.rte-footnotes{margin-top:2em;padding-top:.85em;border-top:1px solid #ddd;" +
            "font-size:.88em;color:#333;}" +
            "section.rte-footnotes h2.rte-fn-title{font-size:1em;font-weight:700;margin:0 0 .5em;}" +
            "ol.rte-fn-list{list-style:" + numbering + ";padding-left:1.6em;margin:0;}" +
            "ol.rte-fn-list>li{margin:.25em 0;}" +
            "a.rte-fn-back{text-decoration:none;color:#1474ea;cursor:pointer;user-select:none;}" +
            ".rte-fn-flash{background:#fff3b0;transition:background .5s ease;}"
        );
    }

    function injectStyles(doc) {
        if (!doc) return;
        var existing = doc.getElementById("rte-footnotes-styles");
        var text = css();
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        var st = doc.createElement("style");
        st.id = "rte-footnotes-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
