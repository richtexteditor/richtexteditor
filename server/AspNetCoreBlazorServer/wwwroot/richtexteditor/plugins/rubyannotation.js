if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

RTE_DefaultConfig.plugin_rubyannotation = RTE_Plugin_RubyAnnotation;

// 2026-09-04 Ruby annotation (phonetic guides above base text).
//
// Furigana in Japanese, pinyin/bopomofo in Chinese, ruby glosses in academic
// typesetting. Word has it, Lexical ships a RubyExtension, and it was the one
// item in the Lexical feature gap register worth scheduling: small, self
// contained, and an i18n/accessibility feature rather than a novelty.
//
// The markup is standard HTML, not an invention:
//
//   <ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>
//
// The <rp> parentheses are the accessibility half and are why they are emitted
// by default: a browser or assistive technology with no ruby support falls back
// to rendering "漢字(かんじ)" inline instead of running the reading straight
// into the base text as "漢字かんじ". Copy-paste to a plain-text target gets the
// same readable fallback.
//
// ruby/rt/rp are ALREADY in the sanitizer allowlist (checked, not assumed), so
// the markup survives sanitisation with no allowlist change.
function RTE_Plugin_RubyAnnotation() {
    var obj = this;
    var config;
    var editor;

    obj.PluginName = "RubyAnnotation";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (config.rubyAnnotationEnabled === false) return;

        if (typeof config.rubyAnnotationParentheses !== "boolean") config.rubyAnnotationParentheses = true;

        // BOTH toolbars. config.toolbar defaults to "default", which resolves to
        // toolbar_default, so appending only to toolbar_full would leave the
        // button unreachable for every host that never configured a toolbar -
        // the mistake that shipped inlinecode invisible for a whole release.
        // The default toolbar gets it in the overflow set, where a niche
        // typographic feature belongs; toolbar_full gets it inline.
        appendToolbarCommand("toolbar_full", "#{rubyannotation}");
        appendSubToolbarCommand("subtoolbar_more", "rubyannotation");
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.rubyAnnotationEnabled === false) return;

        editor.ruby = {
            add: function (reading) { return applyRuby(reading); },
            get: function () { var r = findRubyAtSelection(); return r ? readingOf(r) : null; },
            isRuby: function () { return !!findRubyAtSelection(); },
            open: function () { obj.OpenRubyDialog(); },
            remove: function () { return removeRuby(); }
        };

        injectStyles();

        editor.toolbarFactoryMap = editor.toolbarFactoryMap || {};
        editor.toolbarFactoryMap["rubyannotation"] = function (cmd) {
            return editor.createToolbarButton(cmd);
        };

        editor.attachEvent("exec_command_rubyannotation", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            obj.OpenRubyDialog();
        });
    };

    function appendToolbarCommand(toolbar, item) {
        if (!config[toolbar]) return;
        if (config[toolbar].indexOf(item) !== -1) return;
        config[toolbar] = config[toolbar] + item;
    }

    // subtoolbar_* entries are a braced, comma-separated list rather than the
    // "#{name}" form the main toolbars use.
    function appendSubToolbarCommand(toolbar, name) {
        var val = config[toolbar];
        if (!val || val.indexOf(name) !== -1) return;
        var i = val.indexOf("}");
        if (i === -1) return;
        config[toolbar] = val.substring(0, i) + "," + name + val.substring(i);
    }

    // Ruby has no default styling worth relying on: browsers vary in whether the
    // reading is sized down at all, and <rp> must be hidden wherever ruby DOES
    // render or the parentheses show up twice.
    function injectStyles() {
        var hostDoc = config.container.ownerDocument;
        if (hostDoc.getElementById("rte-ruby-style")) return;
        var style = hostDoc.createElement("style");
        style.id = "rte-ruby-style";
        style.innerHTML = [
            ".rte-ruby-annotated{ruby-position:over;}",
            ".rte-ruby-annotated>rt{font-size:.55em;line-height:1.15;opacity:.85;user-select:none;}",
            "@supports (display:ruby){.rte-ruby-annotated>rp{display:none;}}"
        ].join("");
        hostDoc.head.appendChild(style);
        // A <style> element's rules are dropped under a strict style-src; this
        // re-injects them through the CSSOM in that case only. Missed in 2.9.0,
        // found by auditing the FULL bundle rather than a sample of plugins.
        if (editor && typeof editor.ensureStyleSheetLive === "function") {
            editor.ensureStyleSheetLive(hostDoc, style, "rte-ruby-style", style.textContent);
        }
    }

    function editableRoot() {
        return editor && editor.getEditable ? editor.getEditable() : null;
    }

    function currentRange() {
        var doc = editor.getDocument();
        try {
            var sel = doc.getSelection();
            if (!sel || !sel.rangeCount) return null;
            return sel.getRangeAt(0);
        } catch (e) { return null; }
    }

    function findRubyAtSelection() {
        var range = currentRange();
        var root = editableRoot();
        if (!range || !root) return null;
        var node = range.startContainer;
        while (node && node !== root) {
            if (node.nodeType === 1 && node.nodeName === "RUBY") return node;
            node = node.parentNode;
        }
        return null;
    }

    function readingOf(rubyEl) {
        var rt = rubyEl.querySelector("rt");
        return rt ? (rt.textContent || "") : "";
    }

    function baseOf(rubyEl) {
        var out = "";
        for (var i = 0; i < rubyEl.childNodes.length; i++) {
            var n = rubyEl.childNodes[i];
            if (n.nodeType === 3) out += n.nodeValue;
            else if (n.nodeType === 1 && n.nodeName !== "RT" && n.nodeName !== "RP") out += n.textContent || "";
        }
        return out;
    }

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function buildRuby(base, reading) {
        var parens = config.rubyAnnotationParentheses;
        return '<ruby class="rte-ruby-annotated">' + esc(base) +
            (parens ? "<rp>(</rp>" : "") +
            "<rt>" + esc(reading) + "</rt>" +
            (parens ? "<rp>)</rp>" : "") +
            "</ruby>";
    }

    function applyRuby(reading) {
        var existing = findRubyAtSelection();
        if (existing) {
            var rt = existing.querySelector("rt");
            if (!rt) {
                rt = existing.ownerDocument.createElement("rt");
                existing.appendChild(rt);
            }
            rt.textContent = String(reading == null ? "" : reading);
            editor.focus();
            return existing;
        }
        var range = currentRange();
        if (!range || range.collapsed) return null;
        var base = String(range.toString() || "");
        if (!base) return null;
        editor.insertHTML(buildRuby(base, reading));
        editor.focus();
        return true;
    }

    // Unwrap back to the base text, discarding the reading and the <rp> fallback
    // parentheses. Without dropping <rp> the text would read "漢字()".
    function removeRuby() {
        var rubyEl = findRubyAtSelection();
        if (!rubyEl) return false;
        var doc = rubyEl.ownerDocument;
        var text = doc.createTextNode(baseOf(rubyEl));
        rubyEl.parentNode.insertBefore(text, rubyEl);
        rubyEl.parentNode.removeChild(rubyEl);
        editor.focus();
        return true;
    }

    function append(parent, tag, cssText, className) {
        var el = parent.ownerDocument.createElement(tag);
        if (cssText) el.style.cssText = cssText;
        if (className) el.className = className;
        parent.appendChild(el);
        return el;
    }

    obj.OpenRubyDialog = function () {
        var existing = findRubyAtSelection();
        var range = currentRange();
        var baseText = existing ? baseOf(existing) : (range ? String(range.toString() || "") : "");

        var dlg = editor.createDialog(
            (editor.getLangText && editor.getLangText("rubyannotationtitle")) || "Ruby annotation",
            "rte-dialog-ruby"
        );
        var close = typeof dlg.close === "function" ? function () { dlg.close(); } : function () { editor.closeCurrentPopup(); };

        var wrap = append(dlg, "div", "padding:14px;min-width:340px;font:13px -apple-system,Segoe UI,sans-serif");

        append(wrap, "div", "font-weight:600;margin-bottom:4px").innerText = "Base text";
        var baseView = append(wrap, "div",
            "padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;min-height:20px;word-break:break-word");
        baseView.textContent = baseText;

        append(wrap, "div", "font-weight:600;margin:10px 0 4px").innerText = "Reading";
        var input = append(wrap, "input",
            "width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:13px inherit");
        input.type = "text";
        input.value = existing ? readingOf(existing) : "";
        input.placeholder = "e.g. かんじ";

        var note = append(wrap, "div", "font-size:11px;color:#94a3b8;margin-top:6px");
        note.innerText = baseText
            ? "Shown above the base text. Parentheses are emitted for readers without ruby support."
            : "Select the text to annotate first, then reopen this dialog.";

        var footer = append(wrap, "div", "display:flex;justify-content:space-between;gap:8px;margin-top:14px");
        var left = append(footer, "div", "display:flex;gap:8px");
        if (existing) {
            var rm = append(left, "button", "padding:6px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#b91c1c;cursor:pointer");
            rm.type = "button"; rm.textContent = "Remove";
            rm.onclick = function () { removeRuby(); close(); };
        }
        var right = append(footer, "div", "display:flex;gap:8px");
        var cancel = append(right, "button", "padding:6px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer");
        cancel.type = "button"; cancel.textContent = "Cancel"; cancel.onclick = close;
        var ok = append(right, "button", "padding:6px 14px;border:1px solid #1d67ba;border-radius:8px;background:#1d67ba;color:#fff;cursor:pointer");
        ok.type = "button"; ok.textContent = existing ? "Update" : "Add";
        ok.disabled = !baseText;

        ok.onclick = function () {
            var reading = input.value.trim();
            if (!reading || !baseText) { close(); return; }
            applyRuby(reading);
            close();
        };

        setTimeout(function () { input.focus(); }, 0);
    };
}
