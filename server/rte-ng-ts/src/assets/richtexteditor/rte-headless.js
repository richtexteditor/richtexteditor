/*
 * RichTextEditor — Headless API  (rte-headless.js)
 * ------------------------------------------------------------------
 * Optional, un-obfuscated companion to rte.js. It lets you run the editor with
 * NO built-in toolbar/chrome and drive everything from your own UI — the same
 * "bring your own interface" model as headless frameworks, but on top of the
 * full RichTextEditor engine (commands, plugins, collaboration, AI, etc.).
 *
 * What you get:
 *   - a chrome-less editing surface (toolbar / sub-toolbar / status bar hidden)
 *   - run(command, value)         -> dispatch any RTE command
 *   - isActive(name) / state()    -> query active formatting for your buttons
 *   - can(command)                -> queryCommandEnabled (undo/redo/...)
 *   - on("update" | "change" | "selectionchange" | "focus" | "blur", cb)
 *   - getHTML / setHTML / getText / setText / getMarkdown / setMarkdown / getJSON
 *
 * Example:
 *   var hl = RTEHeadless("#editor", { value: "<p>Hello</p>" });
 *   hl.on("update", function (s) {
 *     boldBtn.classList.toggle("is-active", s.bold);
 *   });
 *   boldBtn.addEventListener("mousedown", function (e) {
 *     e.preventDefault();          // keep the editor selection
 *     hl.run("bold");
 *   });
 *
 * Loads after rte-config.js + rte.js (+ optional plugins). Ships un-obfuscated
 * on purpose, like rte-config.js — you are meant to read and extend it.
 */
(function (global) {
    "use strict";

    // logical state name -> how to query it on the editor document.
    // "state" uses queryCommandState; "block" matches queryCommandValue("formatBlock").
    var STATE_MAP = {
        bold: { kind: "state", q: "bold" },
        italic: { kind: "state", q: "italic" },
        underline: { kind: "state", q: "underline" },
        strike: { kind: "state", q: "strikethrough" },
        strikethrough: { kind: "state", q: "strikethrough" },
        subscript: { kind: "state", q: "subscript" },
        superscript: { kind: "state", q: "superscript" },
        ul: { kind: "state", q: "insertunorderedlist" },
        unorderedlist: { kind: "state", q: "insertunorderedlist" },
        ol: { kind: "state", q: "insertorderedlist" },
        orderedlist: { kind: "state", q: "insertorderedlist" },
        justifyleft: { kind: "state", q: "justifyleft" },
        justifycenter: { kind: "state", q: "justifycenter" },
        justifyright: { kind: "state", q: "justifyright" },
        justifyfull: { kind: "state", q: "justifyfull" },
        h1: { kind: "block", q: "h1" },
        h2: { kind: "block", q: "h2" },
        h3: { kind: "block", q: "h3" },
        h4: { kind: "block", q: "h4" },
        h5: { kind: "block", q: "h5" },
        h6: { kind: "block", q: "h6" },
        p: { kind: "block", q: "p" },
        paragraph: { kind: "block", q: "p" },
        blockquote: { kind: "block", q: "blockquote" },
        pre: { kind: "block", q: "pre" }
    };

    // keys included in the snapshot returned by state() when no list is given.
    var DEFAULT_STATE_KEYS = [
        "bold", "italic", "underline", "strike", "ul", "ol",
        "justifyleft", "justifycenter", "justifyright",
        "blockquote", "h1", "h2", "h3", "p"
    ];

    function resolveTarget(target) {
        if (typeof target === "string") {
            return (typeof document !== "undefined") ? document.querySelector(target) : null;
        }
        return target || null;
    }

    function HeadlessController(editor, options) {
        this.editor = editor;            // escape hatch: the underlying RichTextEditor
        this._opts = options || {};
        this._handlers = {};             // event name -> [cb]
        this._scheduled = false;
        this._destroyed = false;
        this._wire();
    }

    // The contentEditable document we query formatting state against.
    HeadlessController.prototype._doc = function () {
        try {
            var ifr = this.editor && this.editor.iframe;
            if (!ifr) {
                return null;
            }
            return ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document) || null;
        } catch (e) {
            return null;
        }
    };

    HeadlessController.prototype._wire = function () {
        var self = this;
        // Coalesce bursts into a single "update". setTimeout (not rAF) on purpose:
        // requestAnimationFrame is paused in background/hidden tabs, which would
        // latch _scheduled and silently drop every later update (collab, tests,
        // off-screen editors). A ~16ms timer fires in every context.
        function emitUpdate() {
            if (self._destroyed || self._scheduled) {
                return;
            }
            self._scheduled = true;
            setTimeout(function () {
                self._scheduled = false;
                if (!self._destroyed) {
                    self._emit("update", self.state());
                }
            }, 16);
        }
        this._emitUpdate = emitUpdate;

        ["selectionchange", "change", "focus", "blur"].forEach(function (evt) {
            try {
                self.editor.attachEvent(evt, function (a, b) {
                    self._emit(evt, a, b);
                    if (evt === "selectionchange" || evt === "change") {
                        emitUpdate();
                    }
                });
            } catch (e) { /* event surface differs by build; ignore */ }
        });

        // Robust fallback: bind native listeners on the editor document so the
        // "update" (active-state) snapshot stays in sync with EVERY caret/selection
        // move and keystroke, even if a given build doesn't route them through the
        // editor's own event hook. Coalesced by emitUpdate's per-frame guard.
        var doc = this._doc();
        if (doc && doc.addEventListener) {
            // Only drive the coalesced "update" snapshot here; the editor's own
            // hook owns the "change" event, so we don't double-emit it.
            this._docListeners = [
                ["selectionchange", function () { emitUpdate(); }],
                ["mouseup", function () { emitUpdate(); }],
                ["keyup", function () { emitUpdate(); }],
                ["input", function () { emitUpdate(); }]
            ];
            for (var i = 0; i < this._docListeners.length; i++) {
                try { doc.addEventListener(this._docListeners[i][0], this._docListeners[i][1], true); } catch (e) {}
            }
            this._boundDoc = doc;
        }
    };

    HeadlessController.prototype.on = function (name, cb) {
        if (typeof cb === "function") {
            (this._handlers[name] = this._handlers[name] || []).push(cb);
        }
        return this;
    };

    HeadlessController.prototype.off = function (name, cb) {
        var list = this._handlers[name];
        if (list) {
            this._handlers[name] = cb ? list.filter(function (f) { return f !== cb; }) : [];
        }
        return this;
    };

    HeadlessController.prototype._emit = function (name) {
        var list = this._handlers[name];
        if (!list || !list.length) {
            return;
        }
        var args = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < list.length; i++) {
            try {
                list[i].apply(this, args);
            } catch (e) {
                if (global.console) { global.console.error(e); }
            }
        }
    };

    // Dispatch any RichTextEditor command (same names the toolbar uses), chainable.
    HeadlessController.prototype.run = function (command, value) {
        try {
            this.editor.execCommand(command, value);
        } catch (e) {
            if (global.console) { global.console.error(e); }
        }
        if (this._emitUpdate) { this._emitUpdate(); }
        return this;
    };
    HeadlessController.prototype.cmd = HeadlessController.prototype.run;

    HeadlessController.prototype.isActive = function (name) {
        var spec = STATE_MAP[String(name || "").toLowerCase()];
        var doc = this._doc();
        if (!spec || !doc) {
            return false;
        }
        try {
            if (spec.kind === "state") {
                return !!doc.queryCommandState(spec.q);
            }
            var v = String(doc.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "");
            return v === spec.q;
        } catch (e) {
            return false;
        }
    };

    HeadlessController.prototype.can = function (command) {
        var doc = this._doc();
        if (!doc) {
            return false;
        }
        try {
            return !!doc.queryCommandEnabled(command);
        } catch (e) {
            return false;
        }
    };

    // Snapshot of active formatting for binding a custom toolbar.
    HeadlessController.prototype.state = function (keys) {
        keys = keys || DEFAULT_STATE_KEYS;
        var out = {};
        for (var i = 0; i < keys.length; i++) {
            out[keys[i]] = this.isActive(keys[i]);
        }
        out.canUndo = this.can("undo");
        out.canRedo = this.can("redo");
        return out;
    };

    // ---- content I/O (thin pass-throughs to the public editor API) ----
    HeadlessController.prototype.getHTML = function () {
        return this.editor.getHTMLCode ? this.editor.getHTMLCode() : "";
    };
    HeadlessController.prototype.setHTML = function (html) {
        if (this.editor.setHTMLCode) { this.editor.setHTMLCode(html == null ? "" : html); }
        if (this._emitUpdate) { this._emitUpdate(); }
        return this;
    };
    HeadlessController.prototype.getText = function () {
        return this.editor.getText ? this.editor.getText() : "";
    };
    HeadlessController.prototype.setText = function (text) {
        if (this.editor.setText) { this.editor.setText(text == null ? "" : text); }
        if (this._emitUpdate) { this._emitUpdate(); }
        return this;
    };
    HeadlessController.prototype.getMarkdown = function () {
        return this.editor.toMarkdown ? this.editor.toMarkdown() : "";
    };
    HeadlessController.prototype.setMarkdown = function (markdown) {
        if (this.editor.fromMarkdown) { this.editor.fromMarkdown(markdown == null ? "" : markdown); }
        if (this._emitUpdate) { this._emitUpdate(); }
        return this;
    };
    HeadlessController.prototype.getJSON = function () {
        return this.editor.getJSON ? this.editor.getJSON() : null;   // requires the structured-content bridge
    };
    HeadlessController.prototype.getStatistics = function () {
        return this.editor.getStatistics ? this.editor.getStatistics() : null;
    };
    HeadlessController.prototype.isEmpty = function () {
        return String(this.getText() || "").replace(/\s+/g, "").length === 0;
    };

    HeadlessController.prototype.focus = function () {
        try { this.editor.focus(); } catch (e) { /* ignore */ }
        return this;
    };

    HeadlessController.prototype.destroy = function () {
        this._destroyed = true;
        this._handlers = {};
        if (this._boundDoc && this._docListeners) {
            for (var i = 0; i < this._docListeners.length; i++) {
                try { this._boundDoc.removeEventListener(this._docListeners[i][0], this._docListeners[i][1], true); } catch (e) {}
            }
        }
        this._docListeners = null;
        this._boundDoc = null;
        try { if (this.editor.prepareDestroy) { this.editor.prepareDestroy(); } } catch (e) { /* ignore */ }
        return this;
    };

    var _cssInjected = false;
    function injectHeadlessCss() {
        if (_cssInjected || typeof document === "undefined") {
            return;
        }
        _cssInjected = true;
        var css =
            ".rte-headless rte-toolbar,.rte-headless rte-subtoolbar,.rte-headless rte-bottom{display:none !important;}" +
            ".rte-headless{border:0 !important;background:transparent !important;}";
        var style = document.createElement("style");
        style.setAttribute("data-rte-headless", "");
        style.appendChild(document.createTextNode(css));
        (document.head || document.documentElement).appendChild(style);
    }

    // Factory: build a chrome-less editor and return a HeadlessController.
    function createHeadless(target, options) {
        options = options || {};
        if (typeof global.RichTextEditor !== "function") {
            throw new Error("rte-headless: RichTextEditor (rte.js) must be loaded before rte-headless.js.");
        }
        var el = resolveTarget(target);
        if (!el) {
            throw new Error("rte-headless: target element not found.");
        }

        // Start from the standard config so plugins/commands still work, then
        // strip the chrome. A single-space toolbar definition parses to ZERO
        // items (an empty string would fall back to the full toolbar).
        var cfg = (typeof global.RTE_CreateConfig === "function") ? global.RTE_CreateConfig() : {};
        if (options.config) {
            for (var k in options.config) {
                if (Object.prototype.hasOwnProperty.call(options.config, k)) {
                    cfg[k] = options.config[k];
                }
            }
        }
        cfg.toolbar = "headless";
        cfg.toolbar_headless = " ";
        cfg.toolbarMobile = "headless";
        if (options.showStatistics !== true) {
            cfg.showStatistics = false;
        }

        injectHeadlessCss();
        var editor = new global.RichTextEditor(el, cfg);
        if (editor.container && editor.container.classList) {
            editor.container.classList.add("rte-headless");
        }
        if (options.value != null && editor.setHTMLCode) {
            editor.setHTMLCode(options.value);
        }
        return new HeadlessController(editor, options);
    }

    // ---- exports ----
    if (typeof global !== "undefined") {
        global.RTEHeadless = createHeadless;
        if (typeof global.RichTextEditor === "function") {
            global.RichTextEditor.headless = createHeadless;
        }
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            RTEHeadless: createHeadless,
            _internals: {
                STATE_MAP: STATE_MAP,
                DEFAULT_STATE_KEYS: DEFAULT_STATE_KEYS,
                HeadlessController: HeadlessController
            }
        };
    }
})(typeof window !== "undefined" ? window : this);
