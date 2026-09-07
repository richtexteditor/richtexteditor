/*
 * RichTextEditor — Watchdog  (rte-watchdog.js)
 * ------------------------------------------------------------------
 * 2026-08-30. Optional, un-obfuscated companion to rte.js: keeps an editor alive
 * across an unexpected error, and — more importantly — keeps the author's text.
 *
 * Why this exists. CKEditor 5 ships `Watchdog`; nothing here did. The gap is not
 * a feature-list checkbox, it is the worst five seconds a writer can have: an
 * uncaught exception leaves the editing surface half-dead — keystrokes land but
 * commands throw, or the iframe stops accepting input — and the page looks fine,
 * so nobody reloads until an hour of writing is already gone.
 *
 * What it does:
 *   - snapshots the content on an interval and after every change, so there is
 *     always a recent known-good document to restore;
 *   - notices an uncaught error or rejection that came from the editor's own
 *     code, and re-checks the editing surface before believing it;
 *   - destroys and recreates the instance, then puts the snapshot back;
 *   - refuses to do that forever. Restarting into the same crash is a loop that
 *     eats the document a little more each pass, so after `crashNumberLimit`
 *     crashes without a quiet period in between it stops, reports
 *     "crashedPermanently", and holds the last snapshot for the host page to
 *     save somewhere it trusts.
 *
 * What it deliberately does NOT do: guess. An error thrown by unrelated page code
 * is none of its business — restarting the editor because an analytics script
 * threw would destroy the selection, the undo stack and any in-progress dialog
 * for no reason. Only errors whose stack names an editor script, or a genuinely
 * unresponsive editing surface, count as a crash. `getDiagnostics()` reports the
 * errors it saw and ignored, so a real crash that was filtered out is findable
 * rather than invisible.
 *
 *   var wd = new RichTextEditorWatchdog();
 *   wd.on("restart", function (info) { console.log("recovered", info.crashes); });
 *   wd.on("crashedPermanently", function (info) { saveDraft(info.data); });
 *   wd.create(document.getElementById("host"), RTE_CreateConfig());
 *   wd.editor            // the live instance — re-read it after a restart
 *   wd.getData()         // last known-good HTML, valid even while crashed
 *
 * Loads after rte-config.js + rte.js. Un-obfuscated on purpose: recovery policy
 * is something an integrator should be able to read and change.
 */
(function (global) {
    "use strict";

    var STATE_INITIALIZING = "initializing";
    var STATE_READY = "ready";
    var STATE_CRASHED = "crashed";
    var STATE_PERMANENT = "crashedPermanently";
    var STATE_DESTROYED = "destroyed";

    function RichTextEditorWatchdog(options) {
        if (!(this instanceof RichTextEditorWatchdog)) return new RichTextEditorWatchdog(options);
        options = options || {};

        this.state = STATE_INITIALIZING;
        this.editor = null;
        this.crashes = [];

        this._host = null;
        this._config = null;
        this._data = "";
        this._listeners = {};
        this._ignoredErrors = [];
        this._timer = null;
        this._destroyed = false;

        // How many crashes without a quiet stretch before giving up. CKEditor's
        // default is 3 and the reasoning holds: one crash is an accident, three
        // in a row is a bug that restarting will not fix.
        this._crashNumberLimit = typeof options.crashNumberLimit === "number" ? options.crashNumberLimit : 3;
        // A crash this long after the previous one starts the count again.
        this._minimumNonErrorTimePeriod = typeof options.minimumNonErrorTimePeriod === "number"
            ? options.minimumNonErrorTimePeriod : 5000;
        this._saveInterval = typeof options.saveInterval === "number" ? options.saveInterval : 5000;

        // Swap these to supervise something other than a plain `new RichTextEditor`
        // (a framework wrapper, a headless instance, a preconfigured factory).
        this._creator = typeof options.creator === "function"
            ? options.creator
            : function (host, config) { return new global.RichTextEditor(host, config); };
        this._destructor = typeof options.destructor === "function"
            ? options.destructor
            : function (editor) { if (editor && typeof editor.destroy === "function") editor.destroy(); };

        // Which scripts count as "ours". An error is only a crash if its stack
        // names one of them — see the comment at the top of the file.
        this._ownScriptPattern = options.ownScriptPattern instanceof RegExp
            ? options.ownScriptPattern
            : /(^|[\/\\])(rte|rte-headless|rte-watchdog|all_plugins)([.\-][\w.]*)?\.js|RTE_Plugin_|RichTextEditor/;

        var self = this;
        this._onError = function (event) { self._handleError(event && event.error, event && event.message, event); };
        this._onRejection = function (event) {
            var reason = event && event.reason;
            self._handleError(reason instanceof Error ? reason : null, String(reason && reason.message || reason || ""), event);
        };
        global.addEventListener("error", this._onError);
        global.addEventListener("unhandledrejection", this._onRejection);
    }

    var proto = RichTextEditorWatchdog.prototype;

    // ------------------------------------------------------------------ events

    proto.on = function (name, callback) {
        if (typeof callback !== "function") return this;
        (this._listeners[name] = this._listeners[name] || []).push(callback);
        return this;
    };

    proto.off = function (name, callback) {
        var list = this._listeners[name];
        if (!list) return this;
        for (var i = list.length - 1; i >= 0; i--) if (list[i] === callback) list.splice(i, 1);
        return this;
    };

    proto._emit = function (name, payload) {
        var list = (this._listeners[name] || []).slice();
        for (var i = 0; i < list.length; i++) {
            // A throwing listener must not take down the recovery it was told about.
            try { list[i].call(this, payload); } catch (e) {}
        }
    };

    // ------------------------------------------------------------- lifecycle

    proto.create = function (host, config) {
        if (this._destroyed) throw new Error("This watchdog has been destroyed.");
        this._host = host || this._host;
        this._config = config || this._config;
        return this._start();
    };

    proto._start = function () {
        var self = this;
        this.editor = this._creator(this._host, this._config);
        this.state = STATE_READY;

        // Snapshot on change AND on a timer. Change alone misses the case that
        // matters most — a crash mid-edit that stops change events firing — and
        // the timer alone can be up to `saveInterval` stale.
        try {
            this.editor.attachEvent("change", function () { self._snapshot(); });
        } catch (e) {}
        this._snapshot();
        if (this._saveInterval > 0) {
            this._timer = global.setInterval(function () { self._snapshot(); }, this._saveInterval);
        }

        this._emit("ready", { editor: this.editor });
        return this.editor;
    };

    proto.destroy = function () {
        if (this._destroyed) return;
        this._destroyed = true;
        this.state = STATE_DESTROYED;
        if (this._timer) { global.clearInterval(this._timer); this._timer = null; }
        global.removeEventListener("error", this._onError);
        global.removeEventListener("unhandledrejection", this._onRejection);
        try { this._destructor(this.editor); } catch (e) {}
        this.editor = null;
        this._emit("destroy", {});
    };

    // ------------------------------------------------------------------- data

    proto.getData = function () { return this._data; };

    proto._snapshot = function () {
        if (!this.editor) return;
        try {
            var html = this.editor.getHTMLCode();
            // A crashing editor can start returning "" or null. Overwriting a good
            // snapshot with that is how a recovery feature loses the document it
            // exists to protect, so empty never replaces non-empty.
            if (typeof html === "string" && (html || !this._data)) this._data = html;
        } catch (e) {}
    };

    proto.getDiagnostics = function () {
        return {
            state: this.state,
            crashes: this.crashes.slice(),
            ignoredErrors: this._ignoredErrors.slice(),
            dataLength: this._data.length
        };
    };

    // ------------------------------------------------------------------ crash

    // Is the editing surface still usable? An error is only half the evidence:
    // plenty of exceptions are thrown by a feature and leave editing perfectly
    // fine, and restarting for those costs the author their selection and undo
    // history for nothing.
    proto.isEditorResponsive = function () {
        var editor = this.editor;
        if (!editor) return false;
        try {
            var editable = editor.getEditable();
            if (!editable || !editable.ownerDocument) return false;
            // The iframe was removed, or its document was replaced under us.
            if (!editable.ownerDocument.defaultView) return false;
            if (!editable.ownerDocument.body || !editable.ownerDocument.body.contains(editable)) {
                if (editable !== editable.ownerDocument.body) return false;
            }
            // Still attached to the page the host element lives in?
            var frame = editable.ownerDocument.defaultView.frameElement;
            if (frame && !frame.ownerDocument.documentElement.contains(frame)) return false;
            if (typeof editor.getHTMLCode !== "function") return false;
            editor.getHTMLCode();
            return true;
        }
        catch (e) { return false; }
    };

    proto._isOwnError = function (error, message) {
        var stack = (error && error.stack) || "";
        var where = stack + " " + (message || "") + " " + ((error && error.fileName) || "");
        return this._ownScriptPattern.test(where);
    };

    proto._handleError = function (error, message, event) {
        if (this._destroyed || this.state === STATE_PERMANENT) return;

        var mine = this._isOwnError(error, message);
        // An error from elsewhere still gets a health check — a crash can surface
        // as a foreign stack (a framework's error boundary, a rethrow) — but it
        // only counts if the editing surface is genuinely broken.
        var responsive = this.isEditorResponsive();
        if (!mine && responsive) {
            this._ignoredErrors.push({ message: String(message || (error && error.message) || ""), at: Date.now() });
            if (this._ignoredErrors.length > 50) this._ignoredErrors.shift();
            return;
        }
        if (mine && responsive) {
            // Ours, but the editor still works: record it, do not restart.
            this._ignoredErrors.push({
                message: String(message || (error && error.message) || ""),
                at: Date.now(), own: true, restarted: false
            });
            if (this._ignoredErrors.length > 50) this._ignoredErrors.shift();
            this._emit("error", { error: error, message: message, restarting: false, event: event });
            return;
        }

        this._crash(error, message, event);
    };

    proto._crash = function (error, message, event) {
        var now = Date.now();
        var last = this.crashes.length ? this.crashes[this.crashes.length - 1].at : 0;
        // A crash after a long quiet stretch is a new incident, not a loop.
        if (last && (now - last) > this._minimumNonErrorTimePeriod) this.crashes = [];

        this.crashes.push({ at: now, message: String(message || (error && error.message) || "") });
        this.state = STATE_CRASHED;
        this._emit("error", { error: error, message: message, restarting: true, event: event });

        if (this.crashes.length > this._crashNumberLimit) {
            this.state = STATE_PERMANENT;
            if (this._timer) { global.clearInterval(this._timer); this._timer = null; }
            this._emit("crashedPermanently", { data: this._data, crashes: this.crashes.slice() });
            return;
        }

        this.restart();
    };

    proto.restart = function () {
        if (this._destroyed) return null;
        var data = this._data;

        if (this._timer) { global.clearInterval(this._timer); this._timer = null; }
        try { this._destructor(this.editor); } catch (e) {}
        this.editor = null;

        // The old instance leaves its chrome in the host element; a fresh editor
        // built on top of that would stack two toolbars.
        try { if (this._host) this._host.innerHTML = ""; } catch (e) {}

        try {
            this._start();
        }
        catch (e) {
            this.state = STATE_PERMANENT;
            this._emit("crashedPermanently", { data: data, crashes: this.crashes.slice(), error: e });
            return null;
        }

        if (data) {
            try { this.editor.setHTMLCode(data); this._data = data; } catch (e) {}
        }
        this._emit("restart", { editor: this.editor, crashes: this.crashes.length, data: data });
        return this.editor;
    };

    global.RichTextEditorWatchdog = RichTextEditorWatchdog;
    if (global.RichTextEditor) global.RichTextEditor.Watchdog = RichTextEditorWatchdog;
    if (typeof module !== "undefined" && module.exports) module.exports = RichTextEditorWatchdog;
})(typeof window !== "undefined" ? window : this);
