if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Merge fields. Placeholders that stand in for data — recipient name,
// invoice total, order date — so one document becomes a template you can render
// against many records. The basis of mail merge, invoice runs, personalised
// letters and contract generation.
//
// Premium in both majors:
//   - CKEditor 5 merge fields: "Unlock this feature with selected CKEditor Plans".
//   - TinyMCE mergetags: "This plugin is only available for paid TinyMCE
//     subscriptions".
//
// Design notes:
//   - A field is an ATOMIC contenteditable=false span. The caret steps over it,
//     backspace removes the whole thing, and it can never be half-deleted into
//     "{{customer.na}}" — which would silently stop resolving at merge time.
//   - PREVIEW MODE IS PRESENTATIONAL AND MUST NEVER REACH THE SAVED HTML. This
//     is the whole risk of the feature: if previewing with sample data and then
//     saving wrote "Ada Lovelace" into the template where {{Customer name}} used
//     to be, the user would destroy their template by looking at it. So the
//     serializers are wrapped and every chip is restored to its label for the
//     duration of the call — the same contract pagination.js uses for its
//     overlay.
//   - renderMergeFields(data) works on a DETACHED CLONE. Producing the merged
//     output must not touch the document being edited.
RTE_DefaultConfig.plugin_mergefields = RTE_Plugin_MergeFields;

// Field definitions. Replace these with your own — they are examples, not a
// meaningful default schema. `sample` may be a string or a function.
if (typeof RTE_DefaultConfig.mergeFields === "undefined") {
    RTE_DefaultConfig.mergeFields = [
        { id: "recipient.name", label: "Recipient name", sample: "Ada Lovelace" },
        { id: "recipient.email", label: "Recipient email", sample: "ada@example.com" },
        { id: "company.name", label: "Company name", sample: "Analytical Engines Ltd" },
        { id: "document.title", label: "Document title", sample: "Statement of Work" },
        { id: "date.today", label: "Today's date", sample: function () { return new Date().toLocaleDateString(); } }
    ];
}
// Wrappers shown around the label so a field is visually obvious as a placeholder.
if (typeof RTE_DefaultConfig.mergeFieldPrefix === "undefined") RTE_DefaultConfig.mergeFieldPrefix = "{{";
if (typeof RTE_DefaultConfig.mergeFieldSuffix === "undefined") RTE_DefaultConfig.mergeFieldSuffix = "}}";
// What renderMergeFields does with a field the data has no value for:
// "placeholder" leaves it visible, "empty" removes it. Defaults to leaving it
// visible, because a silently blank invoice line is worse than an obvious one.
if (typeof RTE_DefaultConfig.mergeFieldMissing === "undefined") RTE_DefaultConfig.mergeFieldMissing = "placeholder";

function RTE_Plugin_MergeFields() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var preview = false;
    var wrapped = false;

    obj.PluginName = "MergeFields";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_insertmergefield", function (state) {
            state.returnValue = true;
            obj.Insert(state && state.value);
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0);

        // Public API.
        editor.getMergeFieldDefinitions = function () { return definitions().slice(); };
        editor.insertMergeField = function (id) { return obj.Insert(id); };
        editor.listMergeFields = function () { return obj.List(); };
        editor.setMergeFieldPreview = function (on) { return applyPreview(!!on); };
        editor.toggleMergeFieldPreview = function () { return applyPreview(!preview); };
        editor.isMergeFieldPreview = function () { return preview; };
        editor.renderMergeFields = function (data) { return obj.Render(data); };
        editor.getMergeFieldCss = function () { return css(); };
    };

    function setup() {
        var doc = getDoc();
        if (!doc) return;
        injectStyles(doc);
        wrapSerializers();
        if (doc === boundDoc) return;
        boundDoc = doc;
        // Content replaced wholesale: any chips that arrived with it should show
        // whatever mode we are currently in.
        refreshAll();
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function definitions() {
        var list = config.mergeFields;
        return Object.prototype.toString.call(list) === "[object Array]" ? list : [];
    }

    function findDefinition(id) {
        var list = definitions();
        for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
        return null;
    }

    function labelFor(id) {
        var def = findDefinition(id);
        var text = def && def.label ? def.label : id;
        return String(config.mergeFieldPrefix || "") + text + String(config.mergeFieldSuffix || "");
    }

    function sampleFor(id) {
        var def = findDefinition(id);
        if (!def) return "";
        var s = def.sample;
        if (typeof s === "function") {
            try { return String(s(id)); } catch (e) { return ""; }
        }
        return s == null ? "" : String(s);
    }

    // ---- insert ----------------------------------------------------------

    obj.Insert = function (id) {
        var doc = getDoc();
        var editable = getEditable();
        if (!doc || !editable) return false;
        if (!id) {
            var first = definitions()[0];
            if (!first) return false;
            id = first.id;
        }
        var span = doc.createElement("span");
        span.className = "rte-merge-field";
        span.setAttribute("data-merge-field", id);
        span.setAttribute("contenteditable", "false");
        span.textContent = preview ? sampleFor(id) : labelFor(id);
        if (preview) span.className += " rte-merge-preview";

        var placed = false;
        try {
            if (typeof editor.insertElement === "function") { editor.insertElement(span); placed = true; }
        } catch (e) {}
        if (!placed) {
            try {
                var sel = editor.getSelection();
                if (sel && sel.rangeCount) {
                    var r = sel.getRangeAt(0);
                    r.collapse(false);
                    r.insertNode(span);
                    r.setStartAfter(span); r.collapse(true);
                    sel.removeAllRanges(); sel.addRange(r);
                    placed = true;
                }
            } catch (e) {}
        }
        if (!placed) editable.appendChild(span);
        fireChange();
        return id;
    };

    // ---- inspect ---------------------------------------------------------

    function chips() {
        var editable = getEditable();
        if (!editable) return [];
        return Array.prototype.slice.call(editable.querySelectorAll("span.rte-merge-field[data-merge-field]"));
    }

    obj.List = function () {
        var out = [];
        var seen = {};
        var list = chips();
        for (var i = 0; i < list.length; i++) {
            var id = list[i].getAttribute("data-merge-field");
            var def = findDefinition(id);
            out.push({
                id: id,
                label: def && def.label ? def.label : id,
                known: !!def,      // a chip pasted from a template built elsewhere may not be defined here
                count: (seen[id] = (seen[id] || 0) + 1)
            });
        }
        return out;
    };

    // ---- preview ---------------------------------------------------------

    function applyPreview(on) {
        preview = !!on;
        refreshAll();
        return preview;
    }

    function refreshAll() {
        var list = chips();
        for (var i = 0; i < list.length; i++) setChipText(list[i]);
    }

    function setChipText(chip) {
        var id = chip.getAttribute("data-merge-field");
        if (preview) {
            chip.textContent = sampleFor(id);
            if (chip.classList) chip.classList.add("rte-merge-preview");
        } else {
            chip.textContent = labelFor(id);
            if (chip.classList) chip.classList.remove("rte-merge-preview");
        }
    }

    // ---- render ----------------------------------------------------------

    // Produce merged HTML for one record. Works on a clone: rendering output
    // must never mutate the template being edited.
    obj.Render = function (data) {
        var editable = getEditable();
        if (!editable) return "";
        var clone = editable.cloneNode(true);
        var list = clone.querySelectorAll("span.rte-merge-field[data-merge-field]");
        for (var i = 0; i < list.length; i++) {
            var chip = list[i];
            var id = chip.getAttribute("data-merge-field");
            var value = lookup(data, id);
            if (value == null) {
                if (String(config.mergeFieldMissing) === "empty") {
                    if (chip.parentNode) chip.parentNode.removeChild(chip);
                } else {
                    // Leave it obvious rather than silently blank.
                    chip.textContent = labelFor(id);
                }
                continue;
            }
            var text = chip.ownerDocument.createTextNode(String(value));
            if (chip.parentNode) chip.parentNode.replaceChild(text, chip);
        }
        return clone.innerHTML;
    };

    // Supports both flat keys ({"recipient.name": "..."}) and nested objects
    // ({recipient: {name: "..."}}), because both are natural shapes for callers.
    function lookup(data, id) {
        if (!data || typeof data !== "object") return null;
        if (Object.prototype.hasOwnProperty.call(data, id)) return data[id];
        var parts = String(id).split(".");
        var cur = data;
        for (var i = 0; i < parts.length; i++) {
            if (cur == null || typeof cur !== "object") return null;
            if (!Object.prototype.hasOwnProperty.call(cur, parts[i])) return null;
            cur = cur[parts[i]];
        }
        return cur == null ? null : cur;
    }

    // ---- serialization safety -------------------------------------------

    // Restore every chip to its LABEL for the duration of a serialize call, then
    // put the preview text back. Without this, saving while preview is on writes
    // sample data into the template permanently.
    function stripFor() {
        if (!preview) return function () {};
        var list = chips();
        var parked = [];
        for (var i = 0; i < list.length; i++) {
            parked.push({ chip: list[i], text: list[i].textContent });
            list[i].textContent = labelFor(list[i].getAttribute("data-merge-field"));
            if (list[i].classList) list[i].classList.remove("rte-merge-preview");
        }
        return function restore() {
            for (var j = 0; j < parked.length; j++) {
                parked[j].chip.textContent = parked[j].text;
                if (parked[j].chip.classList) parked[j].chip.classList.add("rte-merge-preview");
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
                if (typeof orig !== "function" || orig.__rteMfWrapped) return;
                var w = function () {
                    var restore = stripFor();
                    try { return orig.apply(editor, arguments); } finally { restore(); }
                };
                w.__rteMfWrapped = true;
                editor[name] = w;
                did = true;
            })(names[i]);
        }
        if (did) wrapped = true;
    }

    function fireChange() {
        try { if (typeof editor.updateDesign === "function") editor.updateDesign(); } catch (e) {}
        try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
    }

    // ---- styles ----------------------------------------------------------

    function css() {
        return (
            "span.rte-merge-field{display:inline-block;padding:0 .35em;border-radius:3px;" +
            "background:#e8f0fe;color:#1a4fa0;border:1px solid #c3d8f7;" +
            "font-size:.94em;white-space:nowrap;user-select:none;cursor:default;}" +
            "span.rte-merge-field.rte-merge-preview{background:#eef7ed;color:#1e6b32;border-color:#c6e3c8;}"
        );
    }

    function injectStyles(doc) {
        if (!doc) return;
        var existing = doc.getElementById("rte-merge-field-styles");
        var text = css();
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        var st = doc.createElement("style");
        st.id = "rte-merge-field-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
