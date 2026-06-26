if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-09 Readability statistics. An instant, LOCAL, no-API writing-assistant
// readout (Hemingway / Yoast style) that complements the built-in word/char
// count: Flesch Reading Ease, Flesch-Kincaid Grade Level, reading time, and the
// sentence/word/syllable breakdown. Pure computation — works offline, no key,
// no library. Read-only (never mutates the document).
//
// API:
//   editor.getReadabilityStats(text?)  -> { words, sentences, syllables, characters,
//        avgWordsPerSentence, avgSyllablesPerWord, fleschReadingEase, fleschKincaidGrade,
//        readingTimeMinutes, readingTimeText, easeLabel }
//   editor.countSyllables(word)        -> number (heuristic)
// Command: exec_command "readability" opens a stats dialog. Slash: "/readability".
// Config:
//   config.readabilityStats = false           // disable
//   config.readabilityWordsPerMinute = 200     // reading-speed for the time estimate
RTE_DefaultConfig.plugin_readabilitystats = RTE_Plugin_ReadabilityStats;
if (typeof RTE_DefaultConfig.readabilityStats === "undefined") RTE_DefaultConfig.readabilityStats = true;

function RTE_Plugin_ReadabilityStats() {
    var obj = this;
    var config, editor;

    obj.PluginName = "ReadabilityStats";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.readabilityStats === false) return;

        editor.countSyllables = function (w) { return countSyllables(w); };
        editor.getReadabilityStats = function (text) { return compute(text != null ? String(text) : currentText()); };

        editor.attachEvent("exec_command_readability", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            openDialog();
        });

        if (editor.slashCommands && typeof editor.slashCommands.register === "function") {
            try {
                editor.slashCommands.register({
                    id: "readability-stats",
                    title: "Readability statistics",
                    description: "Flesch reading ease, grade level, and reading time",
                    keywords: ["readability", "flesch", "grade", "reading", "stats", "score"],
                    action: function () { openDialog(); }
                });
            } catch (e) {}
        }
    };

    function currentText() {
        try {
            var ed = editor.getEditable && editor.getEditable();
            if (ed) return ed.innerText || ed.textContent || "";
        } catch (e) {}
        return "";
    }

    // Heuristic English syllable counter (good enough for Flesch metrics).
    function countSyllables(word) {
        word = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
        if (!word) return 0;
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
        var m = word.match(/[aeiouy]{1,2}/g);
        return m ? m.length : 1;
    }

    function compute(text) {
        text = String(text || "").replace(/\s+/g, " ").trim();
        var wordTokens = text ? text.split(/\s+/) : [];
        var words = wordTokens.length;
        // Sentences: terminal . ! ? (collapsed runs). At least 1 if there is text.
        var sentenceMatches = text.match(/[^.!?]+[.!?]+/g);
        var sentences = sentenceMatches ? sentenceMatches.length : (words ? 1 : 0);
        if (words && sentences === 0) sentences = 1;
        var syllables = 0;
        for (var i = 0; i < wordTokens.length; i++) syllables += countSyllables(wordTokens[i]);
        var characters = text.replace(/\s/g, "").length;

        var wps = sentences ? words / sentences : 0;
        var spw = words ? syllables / words : 0;
        var ease = words ? (206.835 - 1.015 * wps - 84.6 * spw) : 0;
        var grade = words ? (0.39 * wps + 11.8 * spw - 15.59) : 0;
        ease = Math.round(ease * 10) / 10;
        grade = Math.round(grade * 10) / 10;

        var wpm = parseInt(config.readabilityWordsPerMinute, 10) || 200;
        var minutes = words / wpm;
        var readingTimeText = minutes < 1 ? (Math.max(1, Math.round(minutes * 60)) + " sec") : (Math.round(minutes) + " min");

        return {
            words: words, sentences: sentences, syllables: syllables, characters: characters,
            avgWordsPerSentence: Math.round(wps * 10) / 10,
            avgSyllablesPerWord: Math.round(spw * 100) / 100,
            fleschReadingEase: ease,
            fleschKincaidGrade: Math.max(0, grade),
            readingTimeMinutes: Math.round(minutes * 10) / 10,
            readingTimeText: readingTimeText,
            easeLabel: easeLabel(ease)
        };
    }

    function easeLabel(ease) {
        if (ease >= 90) return "Very easy (5th grade)";
        if (ease >= 80) return "Easy (6th grade)";
        if (ease >= 70) return "Fairly easy (7th grade)";
        if (ease >= 60) return "Standard (8–9th grade)";
        if (ease >= 50) return "Fairly difficult (10–12th grade)";
        if (ease >= 30) return "Difficult (college)";
        return "Very difficult (college graduate)";
    }

    function openDialog() {
        var s = compute(currentText());
        try {
            var d = editor.createDialog((editor.getLangText && editor.getLangText("readabilitytitle")) || "Readability statistics", "rte-dialog-readability");
            var doc = d.ownerDocument;
            var wrap = doc.createElement("div");
            wrap.style.cssText = "padding:14px 18px;min-width:340px;font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a";

            var rows = [
                ["Flesch Reading Ease", s.fleschReadingEase + "  —  " + s.easeLabel, true],
                ["Flesch–Kincaid Grade", String(s.fleschKincaidGrade), false],
                ["Reading time", s.readingTimeText, false],
                ["Words", String(s.words), false],
                ["Sentences", String(s.sentences), false],
                ["Avg words / sentence", String(s.avgWordsPerSentence), false],
                ["Avg syllables / word", String(s.avgSyllablesPerWord), false],
                ["Characters (no spaces)", String(s.characters), false]
            ];
            for (var i = 0; i < rows.length; i++) {
                var r = doc.createElement("div");
                r.style.cssText = "display:flex;justify-content:space-between;gap:24px;padding:6px 0;border-bottom:1px solid #eef2f7" + (rows[i][2] ? ";font-weight:600;font-size:14px" : "");
                var k = doc.createElement("span"); k.textContent = rows[i][0]; k.style.color = "#475569";
                var v = doc.createElement("span"); v.textContent = rows[i][1]; v.style.textAlign = "right";
                r.appendChild(k); r.appendChild(v); wrap.appendChild(r);
            }
            d.appendChild(wrap);
        } catch (e) {
            if (window.console) console.warn("readabilitystats:", s);
        }
    }
}
