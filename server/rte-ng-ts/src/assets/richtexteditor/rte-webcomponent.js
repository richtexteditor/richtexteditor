/*
 * RichTextEditor — Web Component  (rte-webcomponent.js)
 * ------------------------------------------------------------------
 * 2026-08-30. Optional, un-obfuscated companion to rte.js: registers
 * <rich-text-editor> as a custom element.
 *
 * Why. We ship first-class React, Vue, Angular and Svelte bindings and a
 * headless core — and nothing at all for the pages that use none of those.
 * TinyMCE ships <tinymce-editor> for exactly that audience: Rails and Laravel
 * templates, Blazor, Django, plain HTML, htmx, and any framework whose bindings
 * we will never write. One custom element covers all of them, because every
 * framework knows how to render an unknown tag with attributes.
 *
 *   <script src="richtexteditor/rte-config.js"></script>
 *   <script src="richtexteditor/rte.js"></script>
 *   <script src="richtexteditor/rte-webcomponent.js"></script>
 *
 *   <form method="post">
 *     <rich-text-editor name="body" value="<p>Hello</p>"></rich-text-editor>
 *     <button>Save</button>
 *   </form>
 *
 * That form posts `body=<p>Hello</p>` with no glue code — the element is
 * form-associated, so the browser submits it like a <textarea>. `required`,
 * form reset and `form.elements.body` work for the same reason.
 *
 * Attributes: value, name, toolbar, height, width, readonly, disabled,
 *             required, shadow, config (JSON)
 * Properties: .value, .editor, .ready (a Promise), .form, .name
 * Events:     input, change (both bubble and cross a shadow boundary)
 * Methods:    focus(), checkValidity(), reportValidity()
 *
 * Design notes:
 *   - LIGHT DOM by default. A shadow root would encapsulate the chrome away from
 *     the page's own theme overrides, which integrators legitimately rely on,
 *     and it is the more surprising default. `shadow` opts in, and then
 *     plugins/shadowdom.js copies the editor's stylesheets across the boundary —
 *     without that plugin a shadowed instance renders a 43,000-pixel toolbar,
 *     measured, so this element refuses to enable `shadow` silently if the
 *     plugin is absent: it warns and stays in the light DOM rather than
 *     rendering something visibly broken.
 *   - `value` is a PROPERTY first. Reading the attribute back after the user
 *     types is the classic custom-element bug — the attribute holds the initial
 *     value only, exactly like <input value>, and the property holds the truth.
 *   - The editor is created in connectedCallback and destroyed in
 *     disconnectedCallback, because SPA routers move elements in and out of the
 *     DOM constantly and a leaked iframe per navigation is a real memory bug.
 *     Moving an element (rather than removing it) re-creates it with the value
 *     preserved.
 */
(function (global) {
    "use strict";

    if (!global.customElements || !global.HTMLElement) return;
    if (global.customElements.get("rich-text-editor")) return;

    var OBSERVED = ["value", "readonly", "disabled", "height", "width", "toolbar", "name"];

    function RichTextEditorElement() {
        var self = Reflect.construct(HTMLElement, [], RichTextEditorElement);
        self._editor = null;
        self._value = "";
        self._host = null;
        self._ready = null;
        self._resolveReady = null;
        self._isReady = false;
        self._everConnected = false;
        self._internals = null;
        self._fallbackInput = null;
        try { if (self.attachInternals) self._internals = self.attachInternals(); } catch (e) {}
        return self;
    }

    RichTextEditorElement.prototype = Object.create(HTMLElement.prototype);
    RichTextEditorElement.prototype.constructor = RichTextEditorElement;
    Object.setPrototypeOf(RichTextEditorElement, HTMLElement);

    Object.defineProperty(RichTextEditorElement, "observedAttributes", {
        get: function () { return OBSERVED; }
    });
    // Makes the browser submit, reset and validate this element like a textarea.
    Object.defineProperty(RichTextEditorElement, "formAssociated", { get: function () { return true; } });

    var proto = RichTextEditorElement.prototype;

    // ------------------------------------------------------------- properties

    Object.defineProperty(proto, "value", {
        get: function () {
            if (this._editor) {
                try { return this._editor.getHTMLCode(); } catch (e) {}
            }
            return this._value;
        },
        set: function (html) {
            this._value = html == null ? "" : String(html);
            if (this._editor) {
                try { this._editor.setHTMLCode(this._value); } catch (e) {}
            }
            this._syncFormValue();
        }
    });

    Object.defineProperty(proto, "editor", { get: function () { return this._editor; } });

    // Resolves when the editing surface exists — the only safe moment to call
    // editor APIs from page script.
    //
    // `_isReady` is not redundant with `_ready`: the element becomes ready during
    // connectedCallback, which runs BEFORE any page script can touch `.ready`.
    // Without the flag, the resolve fired into nothing and the promise handed out
    // afterwards never settled — an await that hangs forever. Caught by the first
    // run of the test suite, which simply stopped.
    Object.defineProperty(proto, "ready", {
        get: function () {
            var self = this;
            if (this._isReady) return Promise.resolve(this._editor);
            if (!this._ready) {
                this._ready = new Promise(function (resolve) { self._resolveReady = resolve; });
            }
            return this._ready;
        }
    });

    Object.defineProperty(proto, "name", {
        get: function () { return this.getAttribute("name") || ""; },
        set: function (v) { this.setAttribute("name", v); }
    });

    Object.defineProperty(proto, "form", {
        get: function () { return this._internals ? this._internals.form : this.closest("form"); }
    });

    // ------------------------------------------------------------- lifecycle

    proto.connectedCallback = function () {
        if (this._editor) return;
        if (!global.RichTextEditor) {
            console.error("<rich-text-editor>: rte.js must be loaded before rte-webcomponent.js.");
            return;
        }
        // Only on the FIRST connect. A re-connect (an SPA router moving the
        // element, a drag between containers) must keep what the user typed —
        // the attribute still holds the ORIGINAL seed, so re-reading it here
        // silently threw the edits away and restored stale text. Found by the
        // unmount/remount check in the test suite.
        if (!this._everConnected && this.hasAttribute("value")) this._value = this.getAttribute("value") || "";
        if (!this._everConnected) {
            // <textarea>-style progressive enhancement: markup written between the
            // tags is the initial document when no value attribute seeds one. The
            // children are consumed either way - until 2026-09-02 they were left
            // in the light DOM and rendered as stray content beside the editor.
            var seed = "";
            var kids = Array.prototype.slice.call(this.childNodes);
            for (var ki = 0; ki < kids.length; ki++) {
                var kid = kids[ki];
                if (kid.nodeType === 1) seed += kid.outerHTML;
                else if (kid.nodeType === 3) seed += kid.data;
                try { this.removeChild(kid); } catch (e) { }
            }
            if (!this.hasAttribute("value") && seed.trim()) this._value = seed;
        }
        this._everConnected = true;

        var mount = this;
        if (this.hasAttribute("shadow")) {
            // Refuse to render something visibly broken: without the shadow-DOM
            // style plugin the toolbar is unstyled and 43,000 px tall.
            if (this._shadowStylingAvailable()) {
                var root = this.shadowRoot || this.attachShadow({ mode: "open" });
                mount = document.createElement("div");
                root.appendChild(mount);
            }
            else {
                console.warn("<rich-text-editor shadow>: plugins/shadowdom.js is not loaded, so the " +
                    "editor would render unstyled inside a shadow root. Staying in the light DOM.");
            }
        }

        this._host = document.createElement("div");
        mount.appendChild(this._host);

        var config = this._buildConfig();
        this._editor = new global.RichTextEditor(this._host, config);
        this._bind();
        this._syncFormValue();
        this._waitForReady();
    };

    proto.disconnectedCallback = function () {
        // An SPA router unmounts and remounts constantly; a leaked iframe per
        // navigation is a real memory bug, not a theoretical one.
        this._value = this.value;
        if (this._editor) {
            try { if (typeof this._editor.destroy === "function") this._editor.destroy(); } catch (e) {}
            this._editor = null;
        }
        if (this._host && this._host.parentNode) this._host.parentNode.removeChild(this._host);
        this._host = null;
        this._ready = null;
        this._resolveReady = null;
        this._isReady = false;
    };

    proto.attributeChangedCallback = function (name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (name === "value") {
            // Like <input value>, the attribute seeds the initial value; once the
            // user has typed, the property is the truth and setting the attribute
            // again is an explicit reset by the page.
            this.value = newValue || "";
        }
        else if (name === "readonly" || name === "disabled") {
            this._applyReadOnly();
        }
        else if (name === "name") {
            this._syncFormValue();
        }
        else if (this._editor) {
            // height / width / toolbar need a rebuild; they are construction-time
            // config, and pretending otherwise would silently do nothing.
            var value = this.value;
            this.disconnectedCallback();
            this._value = value;
            this.connectedCallback();
        }
    };

    // Called by the browser when the containing form is reset.
    proto.formResetCallback = function () {
        this.value = this.getAttribute("value") || "";
    };

    proto.formDisabledCallback = function () { this._applyReadOnly(); };

    // -------------------------------------------------------------- behaviour

    proto.focus = function () {
        try {
            if (this._editor && this._editor.getEditable) {
                var editable = this._editor.getEditable();
                if (editable && editable.ownerDocument && editable.ownerDocument.defaultView) {
                    editable.ownerDocument.defaultView.focus();
                    editable.focus();
                    return;
                }
            }
        }
        catch (e) {}
        HTMLElement.prototype.focus.call(this);
    };

    proto.checkValidity = function () { return this._internals ? this._internals.checkValidity() : true; };
    proto.reportValidity = function () { return this._internals ? this._internals.reportValidity() : true; };

    proto._buildConfig = function () {
        var config = global.RTE_CreateConfig ? global.RTE_CreateConfig() : {};
        var raw = this.getAttribute("config");
        if (raw) {
            try {
                var extra = JSON.parse(raw);
                for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) config[k] = extra[k];
            }
            catch (e) {
                console.error("<rich-text-editor>: the config attribute is not valid JSON.", e);
            }
        }
        if (this.hasAttribute("toolbar")) config.toolbar = this.getAttribute("toolbar");
        if (this.hasAttribute("height")) config.height = this.getAttribute("height");
        if (this.hasAttribute("width")) config.width = this.getAttribute("width");
        if (this._isReadOnly()) config.readOnly = true;
        if (this._value) config.value = this._value;
        return config;
    };

    proto._isReadOnly = function () {
        return this.hasAttribute("readonly") || this.hasAttribute("disabled")
            || !!(this._internals && this._internals.form && this._internals.form.disabled);
    };

    proto._applyReadOnly = function () {
        if (!this._editor) return;
        var readOnly = this._isReadOnly();
        try {
            if (typeof this._editor.setReadOnly === "function") this._editor.setReadOnly(readOnly);
            else this._editor.readOnly = readOnly;
        }
        catch (e) {}
    };

    proto._shadowStylingAvailable = function () {
        return !!(global.RTE_DefaultConfig && global.RTE_DefaultConfig.plugin_shadowdom);
    };

    proto._bind = function () {
        var self = this;
        var emit = function (type) {
            self._syncFormValue();
            // composed:true so a listener outside a shadow boundary still hears it.
            self.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
        };
        try {
            this._editor.attachEvent("change", function () { emit("input"); });
        }
        catch (e) {}
        try {
            this._editor.attachEvent("blur", function () { emit("change"); });
        }
        catch (e) {}
    };

    proto._waitForReady = function () {
        var self = this;
        var tries = 0;
        var timer = setInterval(function () {
            var alive = false;
            try { alive = !!(self._editor && self._editor.getEditable()); } catch (e) {}
            if (alive || ++tries > 200) {
                clearInterval(timer);
                if (self._value) { try { self._editor.setHTMLCode(self._value); } catch (e) {} }
                self._applyReadOnly();
                self._syncFormValue();
                self._isReady = true;
                if (self._resolveReady) self._resolveReady(self._editor);
            }
        }, 25);
    };

    // Form participation. ElementInternals is the modern path; the hidden input
    // keeps older browsers submitting the right thing instead of nothing at all.
    proto._syncFormValue = function () {
        var name = this.getAttribute("name");
        var value = this.value;
        if (this._internals && this._internals.setFormValue) {
            try { this._internals.setFormValue(name ? value : null); } catch (e) {}
            this._syncValidity(value);
            return;
        }
        if (!name) return;
        if (!this._fallbackInput) {
            this._fallbackInput = document.createElement("input");
            this._fallbackInput.type = "hidden";
            this.appendChild(this._fallbackInput);
        }
        this._fallbackInput.name = name;
        this._fallbackInput.value = value;
    };

    proto._syncValidity = function (value) {
        if (!this._internals || !this._internals.setValidity) return;
        var required = this.hasAttribute("required");
        // "Empty" for a rich-text field means no text and no media — an empty
        // <p> is what the editor puts in a blank document, and treating that as
        // filled makes `required` meaningless.
        var empty = !String(value || "").replace(/<[^>]*>/g, "").replace(/&nbsp;|\s/g, "")
            && !/<(img|table|iframe|video|audio|hr)\b/i.test(value || "");
        try {
            if (required && empty) this._internals.setValidity({ valueMissing: true }, "Please fill out this field.", this._host || this);
            else this._internals.setValidity({});
        }
        catch (e) {}
    };

    global.customElements.define("rich-text-editor", RichTextEditorElement);
    global.RichTextEditorElement = RichTextEditorElement;
})(typeof window !== "undefined" ? window : this);
