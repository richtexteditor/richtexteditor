if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-06-05 Emoji :shortcode: autocomplete (GitHub / Slack / Discord style).
// Two behaviours, both client-side, no data bundled beyond a curated shortcode
// map:
//   1. Type a complete `:shortcode:` (closing colon) -> replaced with the emoji.
//   2. Type `:` + a partial query -> a popup of matches appears; Arrow keys move,
//      Enter/Tab insert, Esc dismisses.
// Complements the existing emoji picker (insertemoji) with inline, keyboard-only
// entry. Extend or replace the map via config.emojiShortcodes.
RTE_DefaultConfig.plugin_emojiautocomplete = RTE_Plugin_EmojiAutocomplete;
RTE_DefaultConfig.emojiAutocompleteEnabled = (typeof RTE_DefaultConfig.emojiAutocompleteEnabled === "undefined")
    ? true : RTE_DefaultConfig.emojiAutocompleteEnabled;
RTE_DefaultConfig.emojiShortcodes = RTE_DefaultConfig.emojiShortcodes || {
    smile: "\ud83d\ude04", smiley: "\ud83d\ude03", grin: "\ud83d\ude01", laughing: "\ud83d\ude06", satisfied: "\ud83d\ude06", joy: "\ud83d\ude02", rofl: "\ud83e\udd23",
    sweat_smile: "\ud83d\ude05", wink: "\ud83d\ude09", blush: "\ud83d\ude0a", innocent: "\ud83d\ude07", heart_eyes: "\ud83d\ude0d", star_struck: "\ud83e\udd29",
    kissing_heart: "\ud83d\ude18", yum: "\ud83d\ude0b", stuck_out_tongue: "\ud83d\ude1b", zany: "\ud83e\udd2a", thinking: "\ud83e\udd14", shush: "\ud83e\udd2b",
    neutral_face: "\ud83d\ude10", expressionless: "\ud83d\ude11", no_mouth: "\ud83d\ude36", smirk: "\ud83d\ude0f", unamused: "\ud83d\ude12", roll_eyes: "\ud83d\ude44",
    grimacing: "\ud83d\ude2c", relieved: "\ud83d\ude0c", pensive: "\ud83d\ude14", sleepy: "\ud83d\ude2a", sleeping: "\ud83d\ude34", mask: "\ud83d\ude37",
    face_with_thermometer: "\ud83e\udd12", nauseated_face: "\ud83e\udd22", sneezing_face: "\ud83e\udd27", dizzy_face: "\ud83d\ude35",
    exploding_head: "\ud83e\udd2f", cowboy: "\ud83e\udd20", sunglasses: "\ud83d\ude0e", nerd: "\ud83e\udd13", monocle: "\ud83e\uddd0", confused: "\ud83d\ude15",
    worried: "\ud83d\ude1f", slightly_frowning_face: "\ud83d\ude41", open_mouth: "\ud83d\ude2e", astonished: "\ud83d\ude32", flushed: "\ud83d\ude33",
    fearful: "\ud83d\ude28", cold_sweat: "\ud83d\ude30", cry: "\ud83d\ude22", sob: "\ud83d\ude2d", scream: "\ud83d\ude31", confounded: "\ud83d\ude16", persevere: "\ud83d\ude23",
    disappointed: "\ud83d\ude1e", sweat: "\ud83d\ude13", weary: "\ud83d\ude29", tired_face: "\ud83d\ude2b", triumph: "\ud83d\ude24", rage: "\ud83d\ude21", angry: "\ud83d\ude20",
    cursing_face: "\ud83e\udd2c", smiling_imp: "\ud83d\ude08", imp: "\ud83d\udc7f", skull: "\ud83d\udc80", poop: "\ud83d\udca9", hankey: "\ud83d\udca9", clown: "\ud83e\udd21",
    ghost: "\ud83d\udc7b", alien: "\ud83d\udc7d", robot: "\ud83e\udd16", heart_eyes_cat: "\ud83d\ude3b", see_no_evil: "\ud83d\ude48", hear_no_evil: "\ud83d\ude49",
    speak_no_evil: "\ud83d\ude4a",
    heart: "\u2764\ufe0f", orange_heart: "\ud83e\udde1", yellow_heart: "\ud83d\udc9b", green_heart: "\ud83d\udc9a", blue_heart: "\ud83d\udc99",
    purple_heart: "\ud83d\udc9c", black_heart: "\ud83d\udda4", broken_heart: "\ud83d\udc94", two_hearts: "\ud83d\udc95", sparkling_heart: "\ud83d\udc96",
    heartpulse: "\ud83d\udc97", cupid: "\ud83d\udc98", gift_heart: "\ud83d\udc9d", revolving_hearts: "\ud83d\udc9e", kiss: "\ud83d\udc8b",
    "+1": "\ud83d\udc4d", thumbsup: "\ud83d\udc4d", "-1": "\ud83d\udc4e", thumbsdown: "\ud83d\udc4e", ok_hand: "\ud83d\udc4c", punch: "\ud83d\udc4a", fist: "\u270a",
    facepunch: "\ud83d\udc4a", wave: "\ud83d\udc4b", raised_hand: "\u270b", raised_hands: "\ud83d\ude4c", pray: "\ud83d\ude4f", clap: "\ud83d\udc4f",
    muscle: "\ud83d\udcaa", point_up: "\u261d\ufe0f", point_down: "\ud83d\udc47", point_left: "\ud83d\udc48", point_right: "\ud83d\udc49", v: "\u270c\ufe0f",
    crossed_fingers: "\ud83e\udd1e", handshake: "\ud83e\udd1d", writing_hand: "\u270d\ufe0f", selfie: "\ud83e\udd33", nail_care: "\ud83d\udc85", eyes: "\ud83d\udc40",
    fire: "\ud83d\udd25", star: "\u2b50", star2: "\ud83c\udf1f", sparkles: "\u2728", zap: "\u26a1", boom: "\ud83d\udca5", collision: "\ud83d\udca5",
    dizzy: "\ud83d\udcab", sweat_drops: "\ud83d\udca6", droplet: "\ud83d\udca7", snowflake: "\u2744\ufe0f", sunny: "\u2600\ufe0f", cloud: "\u2601\ufe0f",
    rainbow: "\ud83c\udf08", umbrella: "\u2614", ocean: "\ud83c\udf0a", sun_with_face: "\ud83c\udf1e", full_moon: "\ud83c\udf15", crescent_moon: "\ud83c\udf19",
    tada: "\ud83c\udf89", confetti_ball: "\ud83c\udf8a", balloon: "\ud83c\udf88", gift: "\ud83c\udf81", trophy: "\ud83c\udfc6", medal: "\ud83c\udfc5", crown: "\ud83d\udc51",
    gem: "\ud83d\udc8e", rocket: "\ud83d\ude80", airplane: "\u2708\ufe0f", car: "\ud83d\ude97", rotating_light: "\ud83d\udea8",
    "100": "\ud83d\udcaf", white_check_mark: "\u2705", heavy_check_mark: "\u2714\ufe0f", ballot_box_with_check: "\u2611\ufe0f", x: "\u274c",
    warning: "\u26a0\ufe0f", no_entry: "\u26d4", question: "\u2753", exclamation: "\u2757", bulb: "\ud83d\udca1", lock: "\ud83d\udd12", key: "\ud83d\udd11",
    mag: "\ud83d\udd0d", bell: "\ud83d\udd14", recycle: "\u267b\ufe0f", heavy_plus_sign: "\u2795", heavy_minus_sign: "\u2796",
    coffee: "\u2615", tea: "\ud83c\udf75", beer: "\ud83c\udf7a", beers: "\ud83c\udf7b", wine_glass: "\ud83c\udf77", cocktail: "\ud83c\udf78", pizza: "\ud83c\udf55",
    hamburger: "\ud83c\udf54", fries: "\ud83c\udf5f", taco: "\ud83c\udf2e", cake: "\ud83c\udf82", birthday: "\ud83c\udf82", cookie: "\ud83c\udf6a", doughnut: "\ud83c\udf69",
    apple: "\ud83c\udf4e", banana: "\ud83c\udf4c", strawberry: "\ud83c\udf53", avocado: "\ud83e\udd51", bread: "\ud83c\udf5e", cheese: "\ud83e\uddc0",
    dog: "\ud83d\udc36", cat: "\ud83d\udc31", mouse: "\ud83d\udc2d", rabbit: "\ud83d\udc30", bear: "\ud83d\udc3b", panda_face: "\ud83d\udc3c", koala: "\ud83d\udc28",
    tiger: "\ud83d\udc2f", lion: "\ud83e\udd81", cow: "\ud83d\udc2e", pig: "\ud83d\udc37", frog: "\ud83d\udc38", monkey_face: "\ud83d\udc35", chicken: "\ud83d\udc14",
    penguin: "\ud83d\udc27", bird: "\ud83d\udc26", unicorn: "\ud83e\udd84", bee: "\ud83d\udc1d", bug: "\ud83d\udc1b", butterfly: "\ud83e\udd8b", snail: "\ud83d\udc0c",
    book: "\ud83d\udcd6", books: "\ud83d\udcda", memo: "\ud83d\udcdd", pencil: "\ud83d\udcdd", email: "\u2709\ufe0f", envelope: "\u2709\ufe0f", calendar: "\ud83d\udcc5",
    chart: "\ud83d\udcca", bar_chart: "\ud83d\udcca", chart_with_upwards_trend: "\ud83d\udcc8", clipboard: "\ud83d\udccb", pushpin: "\ud83d\udccc",
    paperclip: "\ud83d\udcce", scissors: "\u2702\ufe0f", hammer: "\ud83d\udd28", wrench: "\ud83d\udd27", gear: "\u2699\ufe0f", nut_and_bolt: "\ud83d\udd29",
    bomb: "\ud83d\udca3", hourglass: "\u231b", watch: "\u231a", alarm_clock: "\u23f0", moneybag: "\ud83d\udcb0", dollar: "\ud83d\udcb5",
    credit_card: "\ud83d\udcb3", chart_increasing: "\ud83d\udcc8", link: "\ud83d\udd17", mag_right: "\ud83d\udd0e", telescope: "\ud83d\udd2d",
    microscope: "\ud83d\udd2c", syringe: "\ud83d\udc89", pill: "\ud83d\udc8a", phone: "\ud83d\udcde", telephone: "\ud83d\udcde", iphone: "\ud83d\udcf1",
    computer: "\ud83d\udcbb", keyboard: "\u2328\ufe0f", printer: "\ud83d\udda8\ufe0f", camera: "\ud83d\udcf7", movie_camera: "\ud83c\udfa5", tv: "\ud83d\udcfa",
    seedling: "\ud83c\udf31", evergreen_tree: "\ud83c\udf32", deciduous_tree: "\ud83c\udf33", palm_tree: "\ud83c\udf34", cactus: "\ud83c\udf35",
    four_leaf_clover: "\ud83c\udf40", rose: "\ud83c\udf39", sunflower: "\ud83c\udf3b", tulip: "\ud83c\udf37", blossom: "\ud83c\udf3c", herb: "\ud83c\udf3f",
    musical_note: "\ud83c\udfb5", notes: "\ud83c\udfb6", microphone: "\ud83c\udfa4", headphones: "\ud83c\udfa7", guitar: "\ud83c\udfb8", trumpet: "\ud83c\udfba",
    soccer: "\u26bd", basketball: "\ud83c\udfc0", football: "\ud83c\udfc8", baseball: "\u26be", tennis: "\ud83c\udfbe", "8ball": "\ud83c\udfb1",
    dart: "\ud83c\udfaf", video_game: "\ud83c\udfae", game_die: "\ud83c\udfb2", trophy2: "\ud83c\udfc6",
    sos: "\ud83c\udd98", new: "\ud83c\udd95", ok: "\ud83c\udd97", up: "\ud83c\udd99", cool: "\ud83c\udd92", free: "\ud83c\udd93",
    arrow_up: "\u2b06\ufe0f", arrow_down: "\u2b07\ufe0f", arrow_left: "\u2b05\ufe0f", arrow_right: "\u27a1\ufe0f", arrow_forward: "\u25b6\ufe0f",
    bangbang: "\u203c\ufe0f", interrobang: "\u2049\ufe0f", grey_question: "\u2754", grey_exclamation: "\u2755"
};

function RTE_Plugin_EmojiAutocomplete() {
    var obj = this;
    var config, editor, editable, editdoc;
    var pop = null, items = [], sel = 0, queryStart = -1, queryNode = null, lastFix = null;

    obj.PluginName = "EmojiAutocomplete";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        editable = editor.getEditable();
        editdoc = editor.getDocument();
        if (!editable || !editdoc) return;
        // 2026-10-03 Bound through editor.bindDocumentEvent, so the listeners follow the live document:
        // shell plugins move the iframe during the init loop, and listeners added to editdoc here stayed
        // on the dead document (this feature never fired). tools/keyboard/plugin-listeners.mjs
        var on = function (type, fn, capture) {
            if (editor.bindDocumentEvent) editor.bindDocumentEvent(type, fn, capture);
            else editor.getDocument().addEventListener(type, fn, capture);
        };
        on("input", onInput, false);
        // keydown in capture so we intercept nav keys before the editor does.
        on("keydown", onKeyDown, true);
        on("blur", function () { setTimeout(closePopup, 150); }, true);
        // the references held above go stale with the document
        editor.attachEvent("documentreplaced", function () { editable = editor.getEditable(); editdoc = editor.getDocument(); });
    };

    function map() { return config.emojiShortcodes || {}; }

    function getCaret() {
        var s = editor.getSelection();
        if (!s || s.rangeCount === 0 || !s.isCollapsed) return null;
        var r = s.getRangeAt(0);
        if (r.startContainer.nodeType !== 3) return null;
        // never inside code / pre
        var p = r.startContainer.parentNode;
        while (p && p !== editable) { if (p.nodeName === "CODE" || p.nodeName === "PRE") return null; p = p.parentNode; }
        return r;
    }

    function onInput() {
        if (!config.emojiAutocompleteEnabled) return;
        var r = getCaret();
        if (!r) { closePopup(); return; }
        var node = r.startContainer, off = r.startOffset;
        var before = node.data.slice(0, off);

        // 1. complete :shortcode: -> immediate replace
        var full = /(^|[^a-z0-9_])(:[a-z0-9_+\-]{1,30}:)$/i.exec(before);
        if (full) {
            var code = full[2].slice(1, -1).toLowerCase();
            var emo = map()[code];
            if (emo) {
                replaceRange(node, off - full[2].length, off, emo);
                closePopup();
                return;
            }
        }
        // 2. partial :query -> popup
        var part = /(^|[^a-z0-9_])(:)([a-z0-9_+\-]{1,30})$/i.exec(before);
        if (part) {
            var q = part[3].toLowerCase();
            queryNode = node; queryStart = off - q.length - 1; // include the ":"
            showMatches(q, r);
        } else {
            closePopup();
        }
    }

    function showMatches(q, range) {
        var m = map(), keys = Object.keys(m), starts = [], contains = [];
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (k.indexOf(q) === 0) starts.push(k);
            else if (k.indexOf(q) !== -1) contains.push(k);
        }
        // de-dupe emoji glyphs while keeping the first (best) shortcode
        var ordered = starts.concat(contains), seen = {}, list = [];
        for (var j = 0; j < ordered.length && list.length < 8; j++) {
            var emo = m[ordered[j]];
            if (seen[emo]) continue;
            seen[emo] = 1; list.push({ code: ordered[j], emo: emo });
        }
        if (!list.length) { closePopup(); return; }
        items = list; sel = 0;
        renderPopup(range);
    }

    function renderPopup(range) {
        var hostDoc = document;
        if (!pop) {
            pop = hostDoc.createElement("div");
            pop.className = "rte-emoji-pop";
            pop.setAttribute("role", "listbox");
            pop.setAttribute("aria-label", ((typeof config !== "undefined" && config && config.text_emoji_suggest) || "Emoji suggestions"));
            pop.style.cssText = "position:fixed;z-index:2147483600;";
            hostDoc.body.appendChild(pop);
        }
        // 2026-10-17 appended to the page body, outside the editor, so rte-dark could not reach it: mirrored (and
        // rte-auto-dark under a dark system setting). tools/emoji/emoji-autocomplete-dark.mjs
        var popDark = false;
        try {
            var hk = editor.container && editor.container.classList;
            popDark = !!hk && (hk.contains("rte-dark") || (hk.contains("rte-auto-dark") && !hk.contains("rte-light") && !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)));
        } catch (x) { popDark = false; }
        pop.className = "rte-emoji-pop" + (popDark ? " rte-emoji-pop-dark" : "");
        pop.innerHTML = __RTE_TT("");
        items.forEach(function (it, i) {
            var row = hostDoc.createElement("div");
            row.className = "rte-emoji-pop-row" + (i === sel ? " is-active" : "");
            row.setAttribute("role", "option");
            row.setAttribute("aria-selected", i === sel ? "true" : "false");
            var glyph = hostDoc.createElement("span");
            glyph.className = "rte-emoji-pop-glyph";
            glyph.textContent = it.emo;
            var code = hostDoc.createElement("span");
            code.className = "rte-emoji-pop-code";
            code.textContent = ":" + it.code + ":";
            row.appendChild(glyph);
            row.appendChild(code);
            row.onmousedown = function (e) { e.preventDefault(); sel = i; commit(); };
            row.onmouseenter = function () { sel = i; highlightRows(); };
            pop.appendChild(row);
        });
        // position near the caret (iframe rect + caret rect)
        try {
            var cr = range.getBoundingClientRect();
            var fe = editdoc.defaultView && editdoc.defaultView.frameElement;
            var fr = fe ? fe.getBoundingClientRect() : { left: 0, top: 0, width: 0 };
            // the caret rect is in iframe pixels, which are scaled on screen inside a
            // transform:scale() ancestor; the popup lives in the host body (viewport pixels)
            var k = fe && fe.offsetWidth && fr.width > 0 ? fr.width / fe.offsetWidth : 1;
            var x = fr.left + cr.left * k, y = fr.top + cr.bottom * k + 4;
            var vw = hostDoc.documentElement.clientWidth, vh = hostDoc.documentElement.clientHeight;
            pop.style.left = Math.max(4, Math.min(x, vw - 290)) + "px";
            pop.style.top = Math.max(4, Math.min(y, vh - 20)) + "px";
            pop.style.display = "block";
        } catch (e) { /* ignore */ }
    }

    function highlightRows() {
        if (!pop) return;
        var rows = pop.childNodes;
        for (var i = 0; i < rows.length; i++) {
            rows[i].classList.toggle("is-active", i === sel);
            rows[i].setAttribute("aria-selected", i === sel ? "true" : "false");
        }
    }

    function onKeyDown(e) {
        // 2026-10-03 Ctrl/Cmd+Z straight after a conversion gives the typed shortcode back (":smile:"),
        // as autocorrect does for its corrections - the editor's own undo would also take back the
        // typing it was grouped with. Any other key forgets the conversion.
        // tools/keyboard/emoji-autocomplete.mjs
        if (lastFix) {
            var isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.code === "KeyZ" || e.key === "z" || e.key === "Z");
            if (isUndo && undoLastFix()) { e.preventDefault(); e.stopPropagation(); return; }
            if (!/^(Control|Meta|Shift|Alt|CapsLock)$/.test(e.key)) lastFix = null;
        }
        if (!pop || pop.style.display === "none" || !items.length) return;
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); e.stopPropagation(); sel = (sel + 1) % items.length; highlightRows(); break;
            case "ArrowUp": e.preventDefault(); e.stopPropagation(); sel = (sel - 1 + items.length) % items.length; highlightRows(); break;
            case "Enter":
            case "Tab": e.preventDefault(); e.stopPropagation(); commit(); break;
            case "Escape": e.preventDefault(); e.stopPropagation(); closePopup(); break;
        }
    }

    // Put the typed shortcode back over the emoji the last conversion wrote - only while the caret is
    // still right behind that emoji and the emoji is untouched.
    function undoLastFix() {
        var f = lastFix;
        lastFix = null;
        if (!f || !f.node.parentNode || f.node.data !== f.emo) return false;
        var s = editor.getSelection();
        if (!s || !s.rangeCount || !s.isCollapsed) return false;
        var r = s.getRangeAt(0), here = r.startContainer, off = r.startOffset;
        var behind = (here === f.node && off === f.node.data.length) ||
            (here.nodeType === 3 && off === 0 && here.previousSibling === f.node) ||
            (here === f.node.parentNode && here.childNodes[off - 1] === f.node);
        if (!behind) return false;
        f.node.data = f.typed;
        var c = editor.getDocument().createRange();
        c.setStart(f.node, f.typed.length);
        c.collapse(true);
        s.removeAllRanges();
        s.addRange(c);
        if (typeof editor.fireChange === "function") { try { editor.fireChange(); } catch (e) { /* ignore */ } }
        return true;
    }

    function commit() {
        if (!items.length || !queryNode || queryStart < 0) { closePopup(); return; }
        var it = items[sel] || items[0];
        var r = getCaret();
        if (!r || r.startContainer !== queryNode) { closePopup(); return; }
        replaceRange(queryNode, queryStart, r.startOffset, it.emo);
        closePopup();
    }

    function replaceRange(node, start, end, text) {
        try {
            var data = node.data;
            var head = data.slice(0, start), tail = data.slice(end);
            var parent = node.parentNode; if (!parent) return;
            var frag = editdoc.createDocumentFragment();
            if (head) frag.appendChild(editdoc.createTextNode(head));
            var emoNode = editdoc.createTextNode(text);
            frag.appendChild(emoNode);
            var tailNode = tail ? editdoc.createTextNode(tail) : null;
            if (tailNode) frag.appendChild(tailNode);
            parent.replaceChild(frag, node);
            lastFix = { node: emoNode, emo: text, typed: data.slice(start, end) };
            var rr = editdoc.createRange();
            if (tailNode) rr.setStart(tailNode, 0); else rr.setStartAfter(emoNode);
            rr.collapse(true);
            var s = editor.getSelection();
            if (s) { s.removeAllRanges(); s.addRange(rr); }
            if (typeof editor.fireChange === "function") { try { editor.fireChange(); } catch (e) {} }
        } catch (e) { /* ignore */ }
    }

    function closePopup() {
        if (pop) pop.style.display = "none";
        items = []; sel = 0; queryStart = -1; queryNode = null;
    }
}
