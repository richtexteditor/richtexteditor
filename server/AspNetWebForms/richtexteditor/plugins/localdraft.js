if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-06 Local draft autosave + crash recovery. Complements the core
// server-oriented config.autoSave by persisting the document to localStorage as
// you type, so a refresh / crash / accidental navigation never loses work — the
// next load offers to restore the unsaved draft (Gmail / Notion style).
//
// Opt-in: enable by setting config.localDraft to `true` or to an options object:
//   config.localDraft = {
//     key: "my-doc",          // storage key (default: editor id or page path)
//     intervalMs: 2500,       // debounce between saves (default 2500)
//     ttlMs: 1209600000,      // drop drafts older than this (default 14 days)
//     promptRestore: true     // show the built-in restore bar (default true)
//   }
//
// The host app can also drive it via the API and clear the draft after a real
// save: editor.saveLocalDraft(), editor.hasLocalDraft(), editor.getLocalDraft(),
// editor.restoreLocalDraft(), editor.clearLocalDraft().
RTE_DefaultConfig.plugin_localdraft = RTE_Plugin_LocalDraft;
if (typeof RTE_DefaultConfig.localDraft === "undefined") RTE_DefaultConfig.localDraft = false;

function RTE_Plugin_LocalDraft() {
    var obj = this;
    var config, editor;
    var opts = null, key = null, timer = null, baseline = "", bar = null, attached = false, boundDoc = null;

    obj.PluginName = "LocalDraft";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        // Public API works regardless of the opt-in flag.
        editor.saveLocalDraft = function () { return save(true); };
        editor.hasLocalDraft = function () { return !!read(); };
        editor.getLocalDraft = function () { return read(); };
        editor.clearLocalDraft = function () { try { store().removeItem(resolveKey()); } catch (e) {} hideBar(); return true; };
        editor.restoreLocalDraft = function () {
            var d = read(); if (!d) return false;
            try { editor.setHTMLCode(d.html); } catch (e) { return false; }
            try { if (typeof editor.fireChange === "function") editor.fireChange(); } catch (e) {}
            hideBar();
            return true;
        };

        if (!config.localDraft) return;   // disabled — API still available
        opts = (typeof config.localDraft === "object") ? config.localDraft : {};
        key = resolveKey();

        // Capture the initial (server-provided) content as the baseline so we
        // only offer a restore when the draft actually differs from it.
        var startup = function () {
            if (attached) return;   // fires from both "ready" and the timeout — run once
            baseline = safeGetHTML();
            maybeOfferRestore();
            attach();
        };
        try { editor.attachEvent("ready", startup); } catch (e) {}
        // The editor recreates its document/body after init and on aftersethtml;
        // re-bind the doc-level input listener each time so autosave never goes
        // deaf to plain typing on a stale document.
        try { editor.attachEvent("ready", bindDoc); } catch (e) {}
        try { editor.attachEvent("aftersethtml", bindDoc); } catch (e) {}
        setTimeout(startup, 0);
    };

    var changeHandler = function () { schedule(); };

    function bindDoc() {
        if (!config || !config.localDraft) return;
        var doc = editor.getDocument();
        if (doc && doc !== boundDoc) {
            try { doc.addEventListener("input", changeHandler, true); } catch (e) {}
            boundDoc = doc;
        }
    }

    function attach() {
        if (attached) return;   // startup can fire from both "ready" and the timeout
        attached = true;
        try { editor.attachEvent("change", changeHandler); } catch (e) {}
        try { editor.attachEvent("keyup", changeHandler); } catch (e) {}
        bindDoc();
        // Last-chance save when the page is hidden / unloaded.
        try {
            window.addEventListener("beforeunload", function () { save(false); }, false);
            window.addEventListener("pagehide", function () { save(false); }, false);
        } catch (e) {}
    }

    function intervalMs() { var n = opts && +opts.intervalMs; return (n && n > 250) ? n : 2500; }
    function ttlMs() { var n = opts && +opts.ttlMs; return (n && n > 0) ? n : 14 * 24 * 60 * 60 * 1000; }

    function resolveKey() {
        if (opts && opts.key) return "rte-draft:" + opts.key;
        var id = "";
        try { var ed = editor.getEditable(); id = (ed && (ed.id || (ed.getAttribute && ed.getAttribute("data-rte-id")))) || ""; } catch (e) {}
        if (!id) { try { id = location.pathname; } catch (e) { id = "default"; } }
        return "rte-draft:" + id;
    }

    function store() { return window.localStorage; }

    function schedule() {
        if (timer) return;
        timer = setTimeout(function () { timer = null; save(false); }, intervalMs());
    }

    function safeGetHTML() {
        try { return editor.getHTMLCode() || ""; } catch (e) { return ""; }
    }

    function save(force) {
        if (!config || !config.localDraft) return false;
        var html = safeGetHTML();
        // Don't persist an empty doc or one identical to the server baseline.
        if (!force && (html === baseline || isBlank(html))) return false;
        var rec = { html: html, t: nowMs() };
        try { store().setItem(resolveKey(), JSON.stringify(rec)); return true; }
        catch (e) { return false; }
    }

    function read() {
        try {
            var raw = store().getItem(resolveKey());
            if (!raw) return null;
            var rec = JSON.parse(raw);
            if (!rec || typeof rec.html !== "string") return null;
            if (rec.t && (nowMs() - rec.t) > ttlMs()) { try { store().removeItem(resolveKey()); } catch (e) {} return null; }
            return rec;
        } catch (e) { return null; }
    }

    function isBlank(html) {
        if (!html) return true;
        var t = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").replace(/\s+/g, "");
        return t.length === 0;
    }

    function nowMs() {
        // Date.now is available in the browser; guard just in case.
        try { return Date.now(); } catch (e) { return 0; }
    }

    function maybeOfferRestore() {
        if (opts && opts.promptRestore === false) return;
        var d = read();
        if (!d) return;
        if (d.html === baseline || isBlank(d.html)) return;
        showBar(d);
    }

    // --- Compact restore bar in the host page ---
    function showBar(draft) {
        hideBar();
        var host = hostElement();
        if (!host || !host.parentNode) return;
        var when = friendlyTime(draft.t);
        bar = document.createElement("div");
        bar.className = "rte-localdraft-bar";
        bar.setAttribute("data-rte-localdraft", "1");
        // Announce the recovery offer to assistive tech.
        bar.setAttribute("role", "status");
        bar.setAttribute("aria-live", "polite");
        var msg = document.createElement("span");
        msg.className = "rte-localdraft-message";
        msg.textContent = "An unsaved draft" + (when ? (" from " + when) : "") + " was found.";
        var restore = mkBtn("Restore", "primary");
        var discard = mkBtn("Discard", "secondary");
        restore.onclick = function () { editor.restoreLocalDraft(); };
        discard.onclick = function () { editor.clearLocalDraft(); };
        bar.appendChild(msg); bar.appendChild(restore); bar.appendChild(discard);
        host.parentNode.insertBefore(bar, host);
    }
    function mkBtn(label, tone) {
        var b = document.createElement("button");
        b.type = "button"; b.textContent = label;
        b.className = "rte-localdraft-button is-" + tone;
        return b;
    }
    function hideBar() { if (bar && bar.parentNode) { bar.parentNode.removeChild(bar); } bar = null; }

    function hostElement() {
        // The editor's top-level wrapper in the host page (the iframe's container).
        try {
            var doc = editor.getDocument();
            var frame = doc && doc.defaultView && doc.defaultView.frameElement;
            if (frame) {
                var n = frame;
                // climb to the editor's outer container if present
                for (var i = 0; i < 4 && n.parentNode; i++) {
                    if (n.parentNode && /rte[_-](outer|container|wrapper)/i.test(n.parentNode.className || "")) return n.parentNode;
                    n = n.parentNode;
                }
                return frame;
            }
        } catch (e) {}
        try { return editor.getEditable(); } catch (e) { return null; }
    }

    function friendlyTime(t) {
        if (!t) return "";
        try {
            var d = new Date(t);
            var diff = (nowMs() - t) / 1000;
            if (diff < 60) return "just now";
            if (diff < 3600) return Math.round(diff / 60) + " min ago";
            if (diff < 86400) return Math.round(diff / 3600) + " hr ago";
            return d.toLocaleString();
        } catch (e) { return ""; }
    }
}
