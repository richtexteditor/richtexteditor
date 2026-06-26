if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-05 Read-aloud (text-to-speech). The speech-OUT complement to the
// dictation plugin's speech-IN, and an accessibility win alongside the
// accessibility checker. Uses the browser-native Web Speech API
// (window.speechSynthesis) — no library bundled, no backend, no API key.
//
// editor.execCommand("readaloud") toggles a non-modal control bar (play/pause,
// stop, voice, rate). It reads the current selection if there is one, else the
// whole document, sentence by sentence, and highlights each sentence in the
// editor as it is spoken (via the native selection, so document content is
// never modified). Public API: editor.readAloud(opts) / editor.stopReadAloud().
RTE_DefaultConfig.plugin_readaloud = RTE_Plugin_ReadAloud;
RTE_DefaultConfig.readAloudRate = RTE_DefaultConfig.readAloudRate || 1.0;
RTE_DefaultConfig.readAloudHighlight = (typeof RTE_DefaultConfig.readAloudHighlight === "undefined")
    ? true : RTE_DefaultConfig.readAloudHighlight;

function RTE_Plugin_ReadAloud() {
    var obj = this;
    var config, editor;
    var bar = null, playBtn, statusEl, voiceSel, rateSel;
    var queue = [], qIndex = 0, speaking = false, paused = false;
    var savedRange = null;

    obj.PluginName = "ReadAloud";

    function synth() { return window.speechSynthesis || null; }
    function supported() { return !!synth() && typeof window.SpeechSynthesisUtterance === "function"; }

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        editor.readAloud = function (opts) { obj.Start(opts || {}); };
        editor.stopReadAloud = function () { obj.Stop(); };
        editor.attachEvent("exec_command_readaloud", function (state) {
            state.returnValue = true;
            if (!supported()) { obj.NotifyUnsupported(); return; }
            if (bar) obj.CloseBar(); else obj.OpenBar();
        });
        // Stop speech if the editor is torn down / page hidden.
        try {
            window.addEventListener("pagehide", function () { obj.Stop(); });
            document.addEventListener("visibilitychange", function () { if (document.hidden) obj.Pause(); });
        } catch (e) { /* ignore */ }
    };

    obj.NotifyUnsupported = function () {
        try {
            var d = editor.createDialog((editor.getLangText && editor.getLangText("readaloudtitle")) || "Read aloud", "rte-dialog-readaloud");
            var w = d.ownerDocument.createElement("div");
            w.style.cssText = "padding:16px;min-width:320px;font:13px -apple-system,Segoe UI,sans-serif";
            w.textContent = "This browser does not provide a speech synthesizer (Web Speech API). Read-aloud is unavailable here.";
            d.appendChild(w);
        } catch (e) { /* ignore */ }
    };

    // ---- text + offset map over the editable (for sentence highlighting) ----
    function buildMap() {
        var editable = editor.getEditable();
        var doc = editable.ownerDocument;
        var walker = doc.createTreeWalker(editable, NodeFilter.SHOW_TEXT, {
            acceptNode: function (n) {
                var p = n.parentNode;
                while (p && p !== editable) {
                    var nn = p.nodeName;
                    if (nn === "SCRIPT" || nn === "STYLE" || nn === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
                    p = p.parentNode;
                }
                return n.data && n.data.length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        var nodes = [], full = "", n;
        while ((n = walker.nextNode())) { nodes.push({ node: n, start: full.length, len: n.data.length }); full += n.data; }
        function locate(offset) {
            for (var i = 0; i < nodes.length; i++) {
                var e = nodes[i];
                if (offset <= e.start + e.len) return { node: e.node, offset: Math.max(0, offset - e.start) };
            }
            var last = nodes[nodes.length - 1];
            return last ? { node: last.node, offset: last.len } : null;
        }
        function globalOffset(node, off) {
            for (var i = 0; i < nodes.length; i++) if (nodes[i].node === node) return nodes[i].start + off;
            return -1;
        }
        return { full: full, locate: locate, globalOffset: globalOffset, hasNodes: nodes.length > 0 };
    }

    // Split [text] into sentence segments with absolute offsets (base added).
    function splitSentences(text, base) {
        var segs = [], re = /[^.!?\n。！？]*[.!?\n。！？]+|\S[^.!?\n]*$/g, m;
        while ((m = re.exec(text)) !== null) {
            if (m[0] && /\S/.test(m[0])) segs.push({ text: m[0], start: base + m.index, end: base + m.index + m[0].length });
            if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-length
        }
        if (!segs.length && /\S/.test(text)) segs.push({ text: text, start: base, end: base + text.length });
        return segs;
    }

    // ---- speak queue ----
    obj.Start = function (opts) {
        if (!supported()) { obj.NotifyUnsupported(); return; }
        obj.Stop(); // reset any prior run
        var map = buildMap();
        if (!map.hasNodes) { setStatus("Nothing to read"); return; }
        // Selection range -> read just the selection; else whole doc.
        var sel = editor.getSelection ? editor.getSelection() : null;
        var rStart = 0, rEnd = map.full.length;
        try {
            if (sel && sel.rangeCount && !sel.isCollapsed) {
                var rg = sel.getRangeAt(0);
                var gs = map.globalOffset(rg.startContainer, rg.startOffset);
                var ge = map.globalOffset(rg.endContainer, rg.endOffset);
                if (gs >= 0 && ge >= 0 && ge > gs) { rStart = gs; rEnd = ge; }
            }
        } catch (e) { /* full doc */ }
        savedRange = (sel && sel.rangeCount) ? sel.getRangeAt(0).cloneRange() : null;
        var slice = map.full.substring(rStart, rEnd);
        queue = splitSentences(slice, rStart);
        if (!queue.length) { setStatus("Nothing to read"); return; }
        qIndex = 0; speaking = true; paused = false;
        obj._map = map; obj._opts = opts || {};
        updatePlayBtn();
        speakNext();
    };

    function speakNext() {
        var s = synth();
        if (!s || qIndex >= queue.length) { obj.Stop(); return; }
        var seg = queue[qIndex];
        var u = new SpeechSynthesisUtterance(seg.text);
        var rate = (obj._opts && obj._opts.rate) || (rateSel && parseFloat(rateSel.value)) || config.readAloudRate || 1.0;
        u.rate = Math.min(2, Math.max(0.5, rate));
        var v = chosenVoice();
        if (v) u.voice = v;
        u.onstart = function () { if (config.readAloudHighlight !== false) highlight(seg); setStatus("Reading… (" + (qIndex + 1) + "/" + queue.length + ")"); };
        u.onend = function () { if (!speaking) return; qIndex++; speakNext(); };
        u.onerror = function () { if (!speaking) return; qIndex++; speakNext(); };
        try { s.speak(u); } catch (e) { qIndex++; speakNext(); }
    }

    function highlight(seg) {
        try {
            var map = obj._map; if (!map) return;
            var a = map.locate(seg.start), b = map.locate(seg.end);
            if (!a || !b) return;
            var doc = editor.getDocument();
            var r = doc.createRange();
            r.setStart(a.node, a.offset); r.setEnd(b.node, b.offset);
            var sel = editor.getSelection();
            if (sel) { sel.removeAllRanges(); sel.addRange(r); }
        } catch (e) { /* ignore */ }
    }

    obj.Pause = function () {
        var s = synth(); if (!s || !speaking) return;
        if (!paused) { try { s.pause(); } catch (e) {} paused = true; updatePlayBtn(); setStatus("Paused"); }
    };
    obj.Resume = function () {
        var s = synth(); if (!s || !speaking) return;
        if (paused) { try { s.resume(); } catch (e) {} paused = false; updatePlayBtn(); setStatus("Reading…"); }
    };
    obj.Stop = function () {
        var s = synth();
        speaking = false; paused = false; queue = []; qIndex = 0;
        if (s) { try { s.cancel(); } catch (e) {} }
        // restore the user's caret/selection
        try {
            if (savedRange) { var sel = editor.getSelection(); if (sel) { sel.removeAllRanges(); sel.addRange(savedRange); } }
        } catch (e) { /* ignore */ }
        savedRange = null;
        updatePlayBtn(); setStatus("");
    };

    // ---- voices ----
    function loadVoices() {
        var s = synth(); if (!s || !voiceSel) return;
        var voices = s.getVoices() || [];
        if (!voices.length) return;
        var cur = voiceSel.value;
        voiceSel.innerHTML = "";
        voices.forEach(function (v, i) {
            var o = voiceSel.ownerDocument.createElement("option");
            o.value = v.name; o.textContent = v.name + " (" + v.lang + ")";
            if (v.default) o.textContent += " (default)";
            voiceSel.appendChild(o);
        });
        if (cur) voiceSel.value = cur;
    }
    function chosenVoice() {
        var s = synth(); if (!s) return null;
        var voices = s.getVoices() || [];
        if (obj._opts && obj._opts.voice) { for (var i = 0; i < voices.length; i++) if (voices[i].name === obj._opts.voice) return voices[i]; }
        if (voiceSel && voiceSel.value) { for (var j = 0; j < voices.length; j++) if (voices[j].name === voiceSel.value) return voices[j]; }
        return null;
    }

    // ---- non-modal control bar ----
    function btn(parent, label, title) {
        var b = parent.ownerDocument.createElement("button");
        b.type = "button"; b.textContent = label; if (title) b.title = title;
        b.className = "rte-readaloud-button";
        parent.appendChild(b); return b;
    }
    obj.OpenBar = function () {
        if (bar) return;
        var d = document;
        bar = d.createElement("div");
        bar.className = "rte-readaloud-bar";
        var title = d.createElement("span"); title.className = "rte-readaloud-title"; title.textContent = "Read"; bar.appendChild(title);
        playBtn = btn(bar, "Play", "Play / Pause");
        var stopBtn = btn(bar, "Stop", "Stop");
        voiceSel = d.createElement("select"); voiceSel.className = "rte-readaloud-voice"; voiceSel.title = "Voice"; bar.appendChild(voiceSel);
        rateSel = d.createElement("select"); rateSel.className = "rte-readaloud-rate"; rateSel.title = "Speed";
        ["0.75", "1", "1.25", "1.5", "2"].forEach(function (r) { var o = d.createElement("option"); o.value = r; o.textContent = r + "x"; if (r === "1") o.selected = true; rateSel.appendChild(o); });
        bar.appendChild(rateSel);
        statusEl = d.createElement("span"); statusEl.className = "rte-readaloud-status"; bar.appendChild(statusEl);
        var closeBtn = btn(bar, "Close", "Close"); closeBtn.className += " is-close";
        d.body.appendChild(bar);

        loadVoices();
        var s = synth(); if (s && typeof s.addEventListener === "function") s.addEventListener("voiceschanged", loadVoices);

        playBtn.onclick = function () {
            if (!speaking) { obj.Start({}); }
            else if (paused) { obj.Resume(); }
            else { obj.Pause(); }
        };
        stopBtn.onclick = function () { obj.Stop(); };
        closeBtn.onclick = function () { obj.CloseBar(); };
        // Auto-start reading immediately on open.
        obj.Start({});
    };
    obj.CloseBar = function () {
        obj.Stop();
        if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
        bar = null; playBtn = statusEl = voiceSel = rateSel = null;
    };

    function updatePlayBtn() { if (playBtn) playBtn.textContent = (speaking && !paused) ? "Pause" : "Play"; }
    function setStatus(t) { if (statusEl) statusEl.textContent = t; }
}
