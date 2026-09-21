if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

RTE_DefaultConfig.plugin_nodetypes = RTE_Plugin_NodeTypes;

// 2026-09-04 Custom node type registry.
//
// WHAT THE GAP ACTUALLY IS. Measured before this was designed, rather than
// assumed. A custom element with data-* attributes already survives more of this
// editor than expected:
//
//   setHTML -> getHTML round trip ......... survives, attributes intact
//   contenteditable="false" atomicity ..... preserved
//   undo of an editor-driven delete ....... restored, attributes intact
//   sanitizer ............................. already extensible via
//                                           config.sanitizerAllowTags / -Attributes
//   markdown export ....................... DEGRADES to the element's text
//   .docx export .......................... DEGRADES to the element's text
//   an API to declare any of this ......... DID NOT EXIST
//
// So the gap is not "you cannot put your own element in the document" - you can.
// The gap is that nothing lets you DECLARE that the element is a node type, and
// therefore nothing downstream can treat it deliberately. Degrading to text in
// Markdown and .docx is a defensible default; having no way to say what should
// happen instead is not.
//
// This registry is that declaration. Register a type once and it gets:
//   - its tags and attributes allowed through the sanitizer automatically
//   - atomicity enforced and repaired (chips stop being atomic the moment
//     contenteditable is lost, and then the caret edits their internals)
//   - JSON serialization of every instance, for saving state outside the HTML
//   - a Markdown representation you control instead of raw text content
//
// ORDERING NOTE: plugins initialise in alphabetical bundle order. "nodetypes"
// sorts BEFORE "sanitizer" and BEFORE "slashcommand", so this file must NOT call
// editor.slashCommands.register() from init - it would silently no-op. Feeding
// the sanitizer works precisely because we run first: we write config before
// sanitizer.js reads it.
function RTE_Plugin_NodeTypes() {
    var obj = this;
    var config;
    var editor;
    var types = [];          // registration order
    var byName = {};
    var enforceTimer = 0;
    var originalToMarkdown = null;

    obj.PluginName = "NodeTypes";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.nodeTypesEnabled === false) return;

        // Types can be declared in config so a host does not have to wait for an
        // editor instance to exist.
        if (Array.isArray(config.nodeTypes)) {
            for (var i = 0; i < config.nodeTypes.length; i++) registerType(config.nodeTypes[i]);
        }
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.nodeTypesEnabled === false) return;

        editor.nodeTypes = {
            find: function (name) { return findInstances(name); },
            get: function (name) { return byName[name] || null; },
            insert: function (name, data) { return insertNode(name, data); },
            list: function () { return types.map(describe); },
            register: function (def) { return registerType(def); },
            serialize: function () { return serializeAll(); },
            typeOf: function (el) { var t = typeFor(el); return t ? t.name : null; },
            unregister: function (name) { return unregisterType(name); }
        };

        // Atomicity is a live invariant, not a one-off: a paste, an undo or a
        // competing plugin can strip contenteditable and the node silently stops
        // behaving like one unit.
        //
        // Observed rather than event-driven, deliberately. setHTML() does not
        // fire "change", so an invariant hung off editor events is not enforced
        // on loaded content at all - which is the most common way a node enters
        // the document. Measured: with only the "change" handler, a node loaded
        // via setHTML never gained contenteditable="false".
        editor.attachEvent("change", function () { scheduleEnforce(); });
        observeEditable();

        wrapMarkdown();

        // Deferred deliberately. Plugins initialise in alphabetical bundle order:
        // docxexport (19) runs BEFORE nodetypes (49), but pdfexport (51) and
        // wordexport (72) run AFTER, so editor.getPdfBytes does not exist yet at
        // this point. Wrapping now would silently miss PDF entirely - the same
        // ordering trap that makes slashCommands.register() a no-op from here.
        // A zero-delay timeout lands after every plugin has initialised.
        setTimeout(installExportHooks, 0);

        enforceAll();
    };

    // ------------------------------------------------------------ registration

    function registerType(def) {
        if (!def || !def.name) return false;
        if (typeof def.match !== "string" && typeof def.match !== "function") return false;
        if (byName[def.name]) unregisterType(def.name);

        var type = {
            name: def.name,
            match: def.match,
            atomic: def.atomic !== false,       // atomic by default
            inline: !!def.inline,
            toJSON: typeof def.toJSON === "function" ? def.toJSON : null,
            fromJSON: typeof def.fromJSON === "function" ? def.fromJSON : null,
            toMarkdown: typeof def.toMarkdown === "function" ? def.toMarkdown : null,
            // Export representations. toExportHTML covers .docx and PDF at once;
            // toDocx / toPdf override it per format when they differ.
            toExportHTML: typeof def.toExportHTML === "function" ? def.toExportHTML : null,
            toDocx: typeof def.toDocx === "function" ? def.toDocx : null,
            toPdf: typeof def.toPdf === "function" ? def.toPdf : null,
            toWord: typeof def.toWord === "function" ? def.toWord : null,
            allowTags: def.allowTags || [],
            allowAttributes: def.allowAttributes || []
        };
        types.push(type);
        byName[type.name] = type;
        feedSanitizer(type);
        if (editor) { enforceAll(); }
        return true;
    }

    function unregisterType(name) {
        if (!byName[name]) return false;
        types = types.filter(function (t) { return t.name !== name; });
        delete byName[name];
        return true;
    }

    function describe(t) {
        return {
            name: t.name, atomic: t.atomic, inline: t.inline,
            hasToJSON: !!t.toJSON, hasFromJSON: !!t.fromJSON, hasToMarkdown: !!t.toMarkdown,
            hasExportHTML: !!(t.toExportHTML || t.toDocx || t.toPdf),
            instances: findInstances(t.name).length
        };
    }

    // The sanitizer is an allowlist: an unknown tag is dropped on input, on
    // output and from the live DOM. A registered type that did not feed the
    // allowlist would be deleted by the editor's own security layer, so this is
    // wired automatically rather than left to the host to remember.
    function feedSanitizer(type) {
        if (!config) return;
        mergeInto("sanitizerAllowTags", type.allowTags);
        mergeInto("sanitizerAllowAttributes", type.allowAttributes);
    }

    function mergeInto(key, values) {
        if (!values || !values.length) return;
        var list = config[key];
        if (!Array.isArray(list)) list = list ? [list] : [];
        for (var i = 0; i < values.length; i++) {
            if (list.indexOf(values[i]) === -1) list.push(values[i]);
        }
        config[key] = list;
    }

    // ------------------------------------------------------------- instances

    function matches(type, el) {
        if (!el || el.nodeType !== 1) return false;
        if (typeof type.match === "string") {
            try { return el.matches(type.match); } catch (e) { return false; }
        }
        try { return !!type.match(el); } catch (e) { return false; }
    }

    function typeFor(el) {
        for (var i = 0; i < types.length; i++) {
            if (matches(types[i], el)) return types[i];
        }
        return null;
    }

    function editable() {
        return editor && editor.getEditable ? editor.getEditable() : null;
    }

    function findInstances(name) {
        var root = editable();
        var type = byName[name];
        var out = [];
        if (!root || !type) return out;
        // Include the root's own children: querySelectorAll finds descendants
        // only, and a node pasted at the top level is a child of the root. That
        // exact blind spot is why the accessibility checker used to miss
        // top-level images.
        var all = root.querySelectorAll("*");
        for (var i = 0; i < all.length; i++) {
            if (matches(type, all[i])) out.push(all[i]);
        }
        return out;
    }

    function allInstances() {
        var root = editable();
        var out = [];
        if (!root) return out;
        var all = root.querySelectorAll("*");
        for (var i = 0; i < all.length; i++) {
            var t = typeFor(all[i]);
            if (t) out.push({ type: t, el: all[i] });
        }
        return out;
    }

    function insertNode(name, data) {
        var type = byName[name];
        if (!type || !type.fromJSON || !editor) return null;
        var produced = type.fromJSON(data || {});
        var html = typeof produced === "string" ? produced : (produced && produced.outerHTML);
        if (!html) return null;
        editor.insertHTML(html);
        scheduleEnforce();
        return html;
    }

    function serializeAll() {
        var out = [];
        var found = allInstances();
        for (var i = 0; i < found.length; i++) {
            var t = found[i].type, el = found[i].el;
            out.push({
                name: t.name,
                data: t.toJSON ? safe(t.toJSON, el, {}) : readDataAttributes(el)
            });
        }
        return out;
    }

    function readDataAttributes(el) {
        var data = {};
        var attrs = el.attributes;
        for (var i = 0; attrs && i < attrs.length; i++) {
            if (attrs[i].name.indexOf("data-") === 0) data[attrs[i].name] = attrs[i].value;
        }
        return data;
    }

    function safe(fn, arg, fallback) {
        try { return fn(arg); } catch (e) { return fallback; }
    }

    // -------------------------------------------------------------- atomicity

    function observeEditable() {
        var root = editable();
        if (!root || typeof MutationObserver === "undefined") return;
        var observer = new MutationObserver(function () { scheduleEnforce(); });
        observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["contenteditable"] });
    }

    function scheduleEnforce() {
        clearTimeout(enforceTimer);
        enforceTimer = setTimeout(enforceAll, 60);
    }

    function enforceAll() {
        var found = allInstances();
        for (var i = 0; i < found.length; i++) {
            if (found[i].type.atomic && found[i].el.getAttribute("contenteditable") !== "false") {
                found[i].el.setAttribute("contenteditable", "false");
            }
        }
    }

    // ----------------------------------------------------------------- export

    // .docx and PDF both build from the live editable, so the same swap the
    // Markdown path uses works here: replace each registered node with the HTML
    // the type says represents it, export, then put the originals back.
    //
    // Unlike Markdown these are partly ASYNCHRONOUS - getDocxBlob returns a
    // Promise - so the restore has to wait for the result to settle. Restoring
    // synchronously would put the originals back while the exporter was still
    // reading the DOM.
    function installExportHooks() {
        wrapExport("getDocxBlob", "toDocx");
        wrapExport("exportToDocx", "toDocx");
        wrapExport("getPdfBytes", "toPdf");
        wrapExport("exportToPdf", "toPdf");
        wrapExport("downloadPdf", "toPdf");
        // wordexport.js sorts at 72 - after this file at 49 - which is exactly
        // why the install is deferred. It builds from editor.getHTMLCode(), and
        // getHTMLCode() serializes the live DOM, so the same swap reaches it.
        wrapExport("getWordDocument", "toWord");
        wrapExport("exportToWord", "toWord");
        wrapExport("downloadWord", "toWord");
    }

    function wrapExport(apiName, hookName) {
        if (!editor || typeof editor[apiName] !== "function") return;
        var original = editor[apiName];
        editor[apiName] = function () {
            var args = arguments;
            var found = allInstances().filter(function (f) {
                return f.type[hookName] || f.type.toExportHTML;
            });
            if (!found.length) return original.apply(editor, args);

            var restore = swapNodes(found, hookName);
            var result;
            try {
                result = original.apply(editor, args);
            } catch (e) {
                restore();
                throw e;
            }
            if (result && typeof result.then === "function") {
                return result.then(function (v) { restore(); return v; },
                                   function (e) { restore(); throw e; });
            }
            restore();
            return result;
        };
    }

    // Replaces each instance with its declared export HTML and returns an
    // idempotent restore function.
    function swapNodes(found, hookName) {
        var doc = editor.getDocument();
        var swaps = [];
        var savedRange = null;
        try {
            var sel = doc.getSelection();
            if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
        } catch (e) { savedRange = null; }

        for (var i = 0; i < found.length; i++) {
            var el = found[i].el;
            var fn = found[i].type[hookName] || found[i].type.toExportHTML;
            var html = fn ? safe(fn, el, null) : null;
            if (html === null || html === undefined) continue;
            var holder = doc.createElement(found[i].type.inline ? "span" : "div");
            holder.innerHTML = String(html);
            el.parentNode.insertBefore(holder, el);
            el.parentNode.removeChild(el);
            swaps.push({ holder: holder, original: el });
        }

        var done = false;
        return function () {
            if (done) return;
            done = true;
            for (var j = swaps.length - 1; j >= 0; j--) {
                var s = swaps[j];
                if (s.holder.parentNode) {
                    s.holder.parentNode.insertBefore(s.original, s.holder);
                    s.holder.parentNode.removeChild(s.holder);
                }
            }
            if (savedRange) {
                try {
                    var sel2 = doc.getSelection();
                    sel2.removeAllRanges();
                    sel2.addRange(savedRange);
                } catch (e) { /* selection may no longer be placeable */ }
            }
        };
    }

    // --------------------------------------------------------------- markdown

    // The core's markdown engine takes a root element, but the public
    // editor.toMarkdown() closes over the live editable and accepts no argument,
    // so there is no way to hand it a modified clone. The only seam is to swap
    // registered nodes for their markdown text in the live DOM, convert, and put
    // the originals back.
    //
    // That mutates the document the user is editing, so it is wrapped in
    // try/finally: if a host's toMarkdown throws, the originals are restored
    // anyway. Selection is saved and restored for the same reason.
    function wrapMarkdown() {
        if (!editor || typeof editor.toMarkdown !== "function") return;
        originalToMarkdown = editor.toMarkdown;
        editor.toMarkdown = function () {
            var found = allInstances().filter(function (f) { return f.type.toMarkdown; });
            if (!found.length) return originalToMarkdown.call(editor);

            var doc = editor.getDocument();
            var swaps = [];
            var tokens = [];
            var savedRange = null;
            try {
                var sel = doc.getSelection();
                if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
            } catch (e) { savedRange = null; }

            try {
                for (var i = 0; i < found.length; i++) {
                    var el = found[i].el;
                    var md = safe(found[i].type.toMarkdown, el, null);
                    if (md === null || md === undefined) continue;
                    // An ALPHANUMERIC sentinel, not the markdown itself. The core
                    // engine escapes markdown punctuation in text content, so a
                    // hook returning "**Approval**" would emit "\*\*Approval\*\*".
                    // The sentinel has nothing to escape; the real markdown is
                    // substituted into the finished string instead.
                    var token = "RTENODETYPETOKEN" + i + "ENDRTENODETYPETOKEN";
                    var holder = doc.createElement(found[i].type.inline ? "span" : "p");
                    holder.textContent = token;
                    el.parentNode.insertBefore(holder, el);
                    el.parentNode.removeChild(el);
                    swaps.push({ holder: holder, original: el });
                    tokens.push({ token: token, markdown: String(md) });
                }
                var out = originalToMarkdown.call(editor);
                for (var k = 0; k < tokens.length; k++) {
                    out = out.split(tokens[k].token).join(tokens[k].markdown);
                }
                return out;
            } finally {
                for (var j = swaps.length - 1; j >= 0; j--) {
                    var s = swaps[j];
                    if (s.holder.parentNode) {
                        s.holder.parentNode.insertBefore(s.original, s.holder);
                        s.holder.parentNode.removeChild(s.holder);
                    }
                }
                if (savedRange) {
                    try {
                        var sel2 = doc.getSelection();
                        sel2.removeAllRanges();
                        sel2.addRange(savedRange);
                    } catch (e) { /* selection may no longer be placeable */ }
                }
            }
        };
    }
}
