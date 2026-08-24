if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-08-15 Multi-root editing — one toolbar, several editable regions.
//
// The CMS / page-builder case: a page has a title, a summary and a body, and the
// author wants one toolbar that acts on whichever region they are in, not three
// stacked toolbars eating the viewport.
//
// SCOPE — read this before assuming parity with CKEditor's multi-root:
//   This editor edits <body> inside an IFRAME and has no div/inline mode. One
//   instance therefore owns exactly one editable document, and every plugin,
//   the selection model and the CRDT binding are written against that
//   assumption. Making a single instance own N editables is a core rewrite, not
//   a plugin.
//   What this does instead is COORDINATE several ordinary instances: they share
//   one visible toolbar and one group-level API. That covers the layout and the
//   workflow, which is what the feature is actually for.
//   What it does NOT do, and cannot without core work:
//     - a shared undo stack (Ctrl+Z undoes within the focused region only),
//     - a selection spanning two regions,
//     - one collaboration session across regions (each root syncs separately).
//   Those are stated in getCapabilities() as well as here, so an integrator
//   finds out from the API rather than from a bug report.
//
// Design notes:
//   - Toolbars are SHOWN/HIDDEN, not rebuilt or re-pointed. Each instance's
//     toolbar already drives its own editor correctly; re-routing commands
//     across instances would mean reimplementing every command's notion of
//     "current editor" and would break the moment a plugin cached one.
//   - Moving the active toolbar into a shared host is optional. DOM moves
//     preserve listeners, so the toolbar keeps working, but a host that is
//     positioned or scrolled differently can change the float-panel anchoring —
//     hence opt-in rather than default.
//   - Registration is by GROUP NAME in a module-level registry, because plugins
//     are constructed per instance and have no other way to see each other.
RTE_DefaultConfig.plugin_multiroot = RTE_Plugin_MultiRoot;

// Instances sharing a group name act as one multi-root editor. null = off.
if (typeof RTE_DefaultConfig.multiRootGroup === "undefined") RTE_DefaultConfig.multiRootGroup = null;
// A name for this root in the group API. Defaults to the container's id.
if (typeof RTE_DefaultConfig.multiRootName === "undefined") RTE_DefaultConfig.multiRootName = null;
// Element (or its id) to move the active toolbar into. null = leave in place.
if (typeof RTE_DefaultConfig.multiRootToolbarHost === "undefined") RTE_DefaultConfig.multiRootToolbarHost = null;

// group name -> { roots: [entry], active: entry }
if (!window.__RTE_MultiRootGroups) window.__RTE_MultiRootGroups = {};

function RTE_Plugin_MultiRoot() {
    var obj = this;
    var config, editor;
    var entry = null;

    obj.PluginName = "MultiRoot";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        var group = config.multiRootGroup;
        if (!group) return;                       // opt-in

        entry = {
            name: config.multiRootName || containerId() || ("root" + (groupOf(group).roots.length + 1)),
            editor: editor,
            container: container(),
            group: group
        };
        groupOf(group).roots.push(entry);

        editor.multiRoot = api(group);

        // Wait for the toolbar to exist before hiding anything.
        setTimeout(function () { bindFocus(); settle(group); }, 0);
        try { editor.attachEvent("ready", function () { bindFocus(); settle(group); }); } catch (e) {}
    };

    function groupOf(name) {
        // `listeners` lives on the GROUP, not in this closure. Every root builds
        // its own copy of this plugin, so an instance-local list means a callback
        // registered through one root's API never hears an activation fired by a
        // different root — the subscriber silently lags by one event, or misses
        // everything, depending on which root the user clicks.
        if (!window.__RTE_MultiRootGroups[name]) {
            window.__RTE_MultiRootGroups[name] = { roots: [], active: null, listeners: [] };
        }
        var g = window.__RTE_MultiRootGroups[name];
        if (!g.listeners) g.listeners = [];
        return g;
    }

    // The editor exposes its host element as `container` (a property, not a
    // getter — there is no getContainer()). Falling back through the iframe
    // covers any build where that property is absent, rather than silently
    // returning null and leaving every toolbar visible.
    function container() {
        try {
            if (editor.container) return editor.container;
            if (editor.iframe) {
                var n = editor.iframe.parentNode;
                while (n && !(n.classList && n.classList.contains("richtexteditor"))) n = n.parentNode;
                return n || null;
            }
        } catch (e) {}
        return null;
    }

    function containerId() {
        var c = container();
        return c && c.id ? c.id : null;
    }

    // ---- toolbar visibility ----------------------------------------------

    function toolbarsOf(root) {
        var c = root.container;
        if (!c) return [];
        return [].slice.call(c.querySelectorAll("rte-toolbar"));
    }

    function setVisible(root, visible) {
        var bars = toolbarsOf(root);
        for (var i = 0; i < bars.length; i++) {
            var bar = bars[i];
            if (visible) {
                // Restore whatever the editor's own responsive logic had chosen
                // (desktop vs mobile bar), rather than forcing display:flex on
                // both and showing two toolbars at once.
                if (bar.__rteMultiRootPrevDisplay !== undefined) {
                    bar.style.display = bar.__rteMultiRootPrevDisplay;
                    delete bar.__rteMultiRootPrevDisplay;
                }
            } else {
                if (bar.__rteMultiRootPrevDisplay === undefined) {
                    bar.__rteMultiRootPrevDisplay = bar.style.display;
                }
                bar.style.display = "none";
            }
        }
    }

    function settle(groupName) {
        var g = groupOf(groupName);
        if (!g.roots.length) return;
        if (!g.active) g.active = g.roots[0];
        for (var i = 0; i < g.roots.length; i++) {
            setVisible(g.roots[i], g.roots[i] === g.active);
        }
        hostToolbar(g.active);
    }

    function hostToolbar(root) {
        var hostRef = config.multiRootToolbarHost;
        if (!hostRef || !root) return;
        var host = (typeof hostRef === "string") ? document.getElementById(hostRef) : hostRef;
        if (!host) return;
        var bars = toolbarsOf(root);
        for (var i = 0; i < bars.length; i++) {
            // Moving a node keeps its listeners, so the toolbar stays live.
            if (bars[i].parentNode !== host) host.appendChild(bars[i]);
        }
    }

    // ---- focus tracking ---------------------------------------------------

    function bindFocus() {
        var doc;
        try { doc = editor.getDocument(); } catch (e) { return; }
        if (!doc || doc.__rteMultiRootBound) return;
        doc.__rteMultiRootBound = true;

        var activate = function () {
            if (!entry) return;
            var g = groupOf(entry.group);
            if (g.active === entry) return;
            g.active = entry;
            settle(entry.group);
            fire(entry.group, entry);
        };

        // focusin bubbles; focus does not.
        doc.addEventListener("focusin", activate, true);
        doc.addEventListener("mousedown", activate, true);
    }

    function fire(groupName, root) {
        var list = groupOf(groupName).listeners;
        for (var i = 0; i < list.length; i++) {
            try { list[i]({ active: root.name, editor: root.editor }); } catch (e) {}
        }
    }

    // ---- group API --------------------------------------------------------

    function api(groupName) {
        var g = groupOf(groupName);
        return {
            group: groupName,

            getRoots: function () {
                return g.roots.map(function (r) { return r.name; });
            },

            getActive: function () {
                return g.active ? g.active.name : null;
            },

            getEditor: function (name) {
                for (var i = 0; i < g.roots.length; i++) if (g.roots[i].name === name) return g.roots[i].editor;
                return null;
            },

            focusRoot: function (name) {
                var target = null;
                for (var i = 0; i < g.roots.length; i++) if (g.roots[i].name === name) target = g.roots[i];
                if (!target) return false;
                g.active = target;
                settle(groupName);
                try { target.editor.focus(); } catch (e) {}
                fire(groupName, target);
                return true;
            },

            // The whole document, one entry per root — what a CMS saves.
            getHTML: function () {
                var out = {};
                for (var i = 0; i < g.roots.length; i++) {
                    try { out[g.roots[i].name] = g.roots[i].editor.getHTMLCode(); } catch (e) { out[g.roots[i].name] = null; }
                }
                return out;
            },

            setHTML: function (map) {
                if (!map) return false;
                for (var i = 0; i < g.roots.length; i++) {
                    var r = g.roots[i];
                    if (!(r.name in map)) continue;
                    try { r.editor.setHTMLCode(map[r.name]); } catch (e) {}
                }
                return true;
            },

            onActiveChange: function (fn) {
                if (typeof fn !== "function") return function () {};
                g.listeners.push(fn);
                return function () {
                    var at = g.listeners.indexOf(fn);
                    if (at >= 0) g.listeners.splice(at, 1);
                };
            },

            // Say plainly what this does and does not do, so an integrator does
            // not discover the limits from a support ticket.
            getCapabilities: function () {
                return {
                    sharedToolbar: true,
                    sharedGroupApi: true,
                    perRootUndo: true,
                    sharedUndoStack: false,
                    selectionAcrossRoots: false,
                    sharedCollaborationSession: false,
                    note: "Each root is a separate editor instance sharing one visible toolbar. " +
                          "Undo, selection and collaboration are per-root; the editor edits an " +
                          "iframe body, so a single instance cannot own several editables without core changes."
                };
            }
        };
    }
}
