if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

RTE_DefaultConfig.plugin_dictation = RTE_Plugin_Dictation;

if (!RTE_DefaultConfig.svgCode_dictation) {
    // Solid microphone glyph, stroke-matched to the default toolbar icon set.
    RTE_DefaultConfig.svgCode_dictation = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/><path d="M8 21h8"/></svg>';
}

/**
 * Dictation plugin — converts microphone input to text via the Web Speech
 * API and inserts it into the editor. Toolbar toggle button; click to start,
 * click again to stop. Interim results render live under the cursor so the
 * user sees what the browser heard before committing.
 *
 * Browser support: Chrome, Edge, Opera, Safari (via webkitSpeechRecognition).
 * Firefox does not ship a SpeechRecognition implementation — we detect and
 * hide the toolbar button when unsupported.
 *
 * Config:
 *   config.dictationLang           — BCP-47 language, default navigator.language
 *   config.dictationContinuous     — default true; when false, one utterance then stops
 *   config.dictationInterimResults — default true; show partial transcript live
 *   config.dictationAutoPunctuation— default true; auto-capitalize sentences + add periods
 */
function RTE_Plugin_Dictation() {
    var obj = this;
    var config;
    var editor;
    var recognition = null;
    var listening = false;
    var button = null;
    var interimNode = null;

    obj.PluginName = "Dictation";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        // Opt-in: require dictationEnabled===true (set via Tag Helper attribute
        // `enable-dictation="true"` or by the host JS). The feature is opt-in
        // because it requires microphone permission — we don't want a visible
        // mic button on every editor that ships the plugin JS.
        if (config.dictationEnabled !== true) return;
        if (!isSupported()) return;

        if (typeof config.dictationContinuous !== "boolean") config.dictationContinuous = true;
        if (typeof config.dictationInterimResults !== "boolean") config.dictationInterimResults = true;
        if (typeof config.dictationAutoPunctuation !== "boolean") config.dictationAutoPunctuation = true;
        config.dictationLang = config.dictationLang || (typeof navigator !== "undefined" ? navigator.language : "en-US");

        appendToolbarCommand("toolbar_default", "#{dictation}");
        appendToolbarCommand("toolbar_full", "#{dictation}");
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.dictationEnabled !== true) return;
        if (!isSupported()) return;

        editor.dictation = {
            start: start,
            stop: stop,
            toggle: toggle,
            isListening: function () { return listening; },
            isSupported: function () { return true; }
        };

        editor.toolbarFactoryMap["dictation"] = createButton;

        editor.attachEvent("exec_command_dictation", function () { toggle(); });

        // Stop recognition when the editor is torn down.
        editor.attachEvent("destroy", function () { if (recognition) try { recognition.abort(); } catch (e) { } });
    };

    function isSupported() {
        return typeof window !== "undefined"
            && (typeof window.SpeechRecognition === "function"
             || typeof window.webkitSpeechRecognition === "function");
    }

    function appendToolbarCommand(key, token) {
        var current = config[key] || "";
        if (current.indexOf(token) !== -1) return;
        config[key] = current ? current + " " + token : token;
    }

    function createButton(cmd) {
        button = editor.createToolbarButton(cmd, {
            tooltip: "Dictate (click to start/stop)",
            svgcode: config.svgCode_dictation
        });
        return button;
    }

    function buildRecognition() {
        var Impl = window.SpeechRecognition || window.webkitSpeechRecognition;
        var r = new Impl();
        r.continuous = !!config.dictationContinuous;
        r.interimResults = !!config.dictationInterimResults;
        r.lang = config.dictationLang;

        r.onresult = function (event) {
            var finalTranscript = "";
            var interimTranscript = "";
            for (var i = event.resultIndex; i < event.results.length; i++) {
                var result = event.results[i];
                if (result.isFinal) finalTranscript += result[0].transcript;
                else interimTranscript += result[0].transcript;
            }
            if (finalTranscript) {
                insertFinal(finalTranscript);
            }
            if (interimTranscript) {
                renderInterim(interimTranscript);
            } else if (finalTranscript) {
                clearInterim();
            }
        };

        r.onend = function () {
            // If we're supposed to be listening (not user-stopped) restart —
            // some browsers stop after a silence window even in continuous mode.
            if (listening) {
                try { r.start(); return; } catch (e) { /* ignore: race with user-stop */ }
            }
            listening = false;
            updateButton();
            clearInterim();
        };

        r.onerror = function (event) {
            listening = false;
            updateButton();
            clearInterim();
            if (event && event.error === "not-allowed") {
                notify("Microphone permission denied. Enable it in your browser site settings to dictate.");
            } else if (event && event.error === "no-speech") {
                // benign; user didn't speak — no toast
            } else if (event && event.error) {
                notify("Dictation error: " + event.error);
            }
        };

        return r;
    }

    function start() {
        if (!isSupported() || listening) return;
        if (!recognition) recognition = buildRecognition();
        try { recognition.start(); }
        catch (e) {
            // start() throws if already started; reset and retry.
            try { recognition.abort(); } catch (e2) { }
            recognition = buildRecognition();
            try { recognition.start(); } catch (e3) { return; }
        }
        listening = true;
        updateButton();
    }

    function stop() {
        if (!recognition || !listening) return;
        listening = false;   // set first so onend doesn't auto-restart
        try { recognition.stop(); } catch (e) { /* ignore */ }
        updateButton();
        clearInterim();
    }

    function toggle() {
        if (listening) stop();
        else start();
    }

    function insertFinal(text) {
        if (!text) return;
        var normalized = normalize(text, true);
        if (!normalized) return;
        try {
            if (editor.insertText) editor.insertText(normalized);
            else if (editor.insertHTML) editor.insertHTML(escapeHtml(normalized));
        } catch (e) { }
    }

    function renderInterim(text) {
        if (!text || !config.dictationInterimResults) return;
        var normalized = normalize(text, false);
        if (!interimNode) {
            var doc = editor.getDocument ? editor.getDocument() : document;
            interimNode = doc.createElement("span");
            interimNode.setAttribute("data-rte-dictation-interim", "true");
            interimNode.style.cssText = "opacity:.55;color:#0f8b8d;font-style:italic;pointer-events:none;user-select:none;";
            try {
                var sel = editor.getSelection();
                if (sel && sel.rangeCount > 0) {
                    var range = sel.getRangeAt(0);
                    range.collapse(true);
                    range.insertNode(interimNode);
                }
            } catch (e) { }
        }
        if (interimNode) interimNode.textContent = " " + normalized;
    }

    function clearInterim() {
        if (interimNode && interimNode.parentNode) {
            interimNode.parentNode.removeChild(interimNode);
        }
        interimNode = null;
    }

    function updateButton() {
        if (!button) return;
        button.classList.toggle("rte-dictation-on", listening);
        button.setAttribute("aria-pressed", listening ? "true" : "false");
        button.setAttribute("title", listening ? "Dictating… (click to stop)" : "Dictate (click to start/stop)");
        ensureStyles();
    }

    var stylesInjected = false;
    function ensureStyles() {
        if (stylesInjected) return;
        stylesInjected = true;
        var css = ".rte-dictation-on { position: relative; background: linear-gradient(180deg,#fee2e2,#fecaca); box-shadow: inset 0 0 0 1px #f87171; }"
                + ".rte-dictation-on::after { content: ''; position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: #dc2626; box-shadow: 0 0 0 0 rgba(220,38,38,.6); animation: rte-dictation-pulse 1.4s infinite; }"
                + "@@keyframes rte-dictation-pulse { 0%{box-shadow:0 0 0 0 rgba(220,38,38,.6);} 70%{box-shadow:0 0 0 6px rgba(220,38,38,0);} 100%{box-shadow:0 0 0 0 rgba(220,38,38,0);} }";
        // Note: the "@@" above is a literal pass-through for Razor safety; at
        // runtime we ship with a single @ via this replace:
        css = css.replace(/@@keyframes/g, "@keyframes");
        var style = document.createElement("style");
        style.setAttribute("data-rte-dictation", "1");
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    function normalize(text, isFinal) {
        if (!text) return "";
        var t = text.replace(/\s+/g, " ");
        if (!isFinal) return t.trim();
        // Final chunks: collapse leading whitespace, apply light auto-punctuation.
        t = t.replace(/^\s+/, "");
        if (config.dictationAutoPunctuation) {
            // Capitalize first letter.
            if (t.length > 0 && /[a-z]/.test(t[0])) {
                t = t[0].toUpperCase() + t.substring(1);
            }
            // Ensure trailing space so consecutive dictations don't glue words together.
            if (!/[.!?,;:]$/.test(t)) t += ".";
            t += " ";
        } else {
            if (!/\s$/.test(t)) t += " ";
        }
        return t;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function notify(msg) {
        try {
            if (editor && editor.showAlert) { editor.showAlert(msg); return; }
        } catch (e) { }
        if (typeof window !== "undefined" && window.console) window.console.warn("[dictation]", msg);
    }
}
