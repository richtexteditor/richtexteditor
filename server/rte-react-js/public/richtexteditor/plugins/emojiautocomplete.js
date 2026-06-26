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
    smile: "😄", smiley: "😃", grin: "😁", laughing: "😆", satisfied: "😆", joy: "😂", rofl: "🤣",
    sweat_smile: "😅", wink: "😉", blush: "😊", innocent: "😇", heart_eyes: "😍", star_struck: "🤩",
    kissing_heart: "😘", yum: "😋", stuck_out_tongue: "😛", zany: "🤪", thinking: "🤔", shush: "🤫",
    neutral_face: "😐", expressionless: "😑", no_mouth: "😶", smirk: "😏", unamused: "😒", roll_eyes: "🙄",
    grimacing: "😬", relieved: "😌", pensive: "😔", sleepy: "😪", sleeping: "😴", mask: "😷",
    face_with_thermometer: "🤒", nauseated_face: "🤢", sneezing_face: "🤧", dizzy_face: "😵",
    exploding_head: "🤯", cowboy: "🤠", sunglasses: "😎", nerd: "🤓", monocle: "🧐", confused: "😕",
    worried: "😟", slightly_frowning_face: "🙁", open_mouth: "😮", astonished: "😲", flushed: "😳",
    fearful: "😨", cold_sweat: "😰", cry: "😢", sob: "😭", scream: "😱", confounded: "😖", persevere: "😣",
    disappointed: "😞", sweat: "😓", weary: "😩", tired_face: "😫", triumph: "😤", rage: "😡", angry: "😠",
    cursing_face: "🤬", smiling_imp: "😈", imp: "👿", skull: "💀", poop: "💩", hankey: "💩", clown: "🤡",
    ghost: "👻", alien: "👽", robot: "🤖", heart_eyes_cat: "😻", see_no_evil: "🙈", hear_no_evil: "🙉",
    speak_no_evil: "🙊",
    heart: "❤️", orange_heart: "🧡", yellow_heart: "💛", green_heart: "💚", blue_heart: "💙",
    purple_heart: "💜", black_heart: "🖤", broken_heart: "💔", two_hearts: "💕", sparkling_heart: "💖",
    heartpulse: "💗", cupid: "💘", gift_heart: "💝", revolving_hearts: "💞", kiss: "💋",
    "+1": "👍", thumbsup: "👍", "-1": "👎", thumbsdown: "👎", ok_hand: "👌", punch: "👊", fist: "✊",
    facepunch: "👊", wave: "👋", raised_hand: "✋", raised_hands: "🙌", pray: "🙏", clap: "👏",
    muscle: "💪", point_up: "☝️", point_down: "👇", point_left: "👈", point_right: "👉", v: "✌️",
    crossed_fingers: "🤞", handshake: "🤝", writing_hand: "✍️", selfie: "🤳", nail_care: "💅", eyes: "👀",
    fire: "🔥", star: "⭐", star2: "🌟", sparkles: "✨", zap: "⚡", boom: "💥", collision: "💥",
    dizzy: "💫", sweat_drops: "💦", droplet: "💧", snowflake: "❄️", sunny: "☀️", cloud: "☁️",
    rainbow: "🌈", umbrella: "☔", ocean: "🌊", sun_with_face: "🌞", full_moon: "🌕", crescent_moon: "🌙",
    tada: "🎉", confetti_ball: "🎊", balloon: "🎈", gift: "🎁", trophy: "🏆", medal: "🏅", crown: "👑",
    gem: "💎", rocket: "🚀", airplane: "✈️", car: "🚗", rotating_light: "🚨",
    "100": "💯", white_check_mark: "✅", heavy_check_mark: "✔️", ballot_box_with_check: "☑️", x: "❌",
    warning: "⚠️", no_entry: "⛔", question: "❓", exclamation: "❗", bulb: "💡", lock: "🔒", key: "🔑",
    mag: "🔍", bell: "🔔", recycle: "♻️", heavy_plus_sign: "➕", heavy_minus_sign: "➖",
    coffee: "☕", tea: "🍵", beer: "🍺", beers: "🍻", wine_glass: "🍷", cocktail: "🍸", pizza: "🍕",
    hamburger: "🍔", fries: "🍟", taco: "🌮", cake: "🎂", birthday: "🎂", cookie: "🍪", doughnut: "🍩",
    apple: "🍎", banana: "🍌", strawberry: "🍓", avocado: "🥑", bread: "🍞", cheese: "🧀",
    dog: "🐶", cat: "🐱", mouse: "🐭", rabbit: "🐰", bear: "🐻", panda_face: "🐼", koala: "🐨",
    tiger: "🐯", lion: "🦁", cow: "🐮", pig: "🐷", frog: "🐸", monkey_face: "🐵", chicken: "🐔",
    penguin: "🐧", bird: "🐦", unicorn: "🦄", bee: "🐝", bug: "🐛", butterfly: "🦋", snail: "🐌",
    book: "📖", books: "📚", memo: "📝", pencil: "📝", email: "✉️", envelope: "✉️", calendar: "📅",
    chart: "📊", bar_chart: "📊", chart_with_upwards_trend: "📈", clipboard: "📋", pushpin: "📌",
    paperclip: "📎", scissors: "✂️", hammer: "🔨", wrench: "🔧", gear: "⚙️", nut_and_bolt: "🔩",
    bomb: "💣", hourglass: "⌛", watch: "⌚", alarm_clock: "⏰", moneybag: "💰", dollar: "💵",
    credit_card: "💳", chart_increasing: "📈", link: "🔗", mag_right: "🔎", telescope: "🔭",
    microscope: "🔬", syringe: "💉", pill: "💊", phone: "📞", telephone: "📞", iphone: "📱",
    computer: "💻", keyboard: "⌨️", printer: "🖨️", camera: "📷", movie_camera: "🎥", tv: "📺",
    seedling: "🌱", evergreen_tree: "🌲", deciduous_tree: "🌳", palm_tree: "🌴", cactus: "🌵",
    four_leaf_clover: "🍀", rose: "🌹", sunflower: "🌻", tulip: "🌷", blossom: "🌼", herb: "🌿",
    musical_note: "🎵", notes: "🎶", microphone: "🎤", headphones: "🎧", guitar: "🎸", trumpet: "🎺",
    soccer: "⚽", basketball: "🏀", football: "🏈", baseball: "⚾", tennis: "🎾", "8ball": "🎱",
    dart: "🎯", video_game: "🎮", game_die: "🎲", trophy2: "🏆",
    sos: "🆘", new: "🆕", ok: "🆗", up: "🆙", cool: "🆒", free: "🆓",
    arrow_up: "⬆️", arrow_down: "⬇️", arrow_left: "⬅️", arrow_right: "➡️", arrow_forward: "▶️",
    bangbang: "‼️", interrobang: "⁉️", grey_question: "❔", grey_exclamation: "❕"
};

function RTE_Plugin_EmojiAutocomplete() {
    var obj = this;
    var config, editor, editable, editdoc;
    var pop = null, items = [], sel = 0, queryStart = -1, queryNode = null;

    obj.PluginName = "EmojiAutocomplete";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        editable = editor.getEditable();
        editdoc = editor.getDocument();
        if (!editable || !editdoc) return;
        editdoc.addEventListener("input", onInput, false);
        // keydown in capture so we intercept nav keys before the editor does.
        editdoc.addEventListener("keydown", onKeyDown, true);
        editdoc.addEventListener("blur", function () { setTimeout(closePopup, 150); }, true);
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
            pop.setAttribute("aria-label", "Emoji suggestions");
            pop.style.cssText = "position:fixed;z-index:2147483600;";
            hostDoc.body.appendChild(pop);
        }
        pop.innerHTML = "";
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
            var fr = (editdoc.defaultView && editdoc.defaultView.frameElement) ? editdoc.defaultView.frameElement.getBoundingClientRect() : { left: 0, top: 0 };
            var x = fr.left + cr.left, y = fr.top + cr.bottom + 4;
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
        if (!pop || pop.style.display === "none" || !items.length) return;
        switch (e.key) {
            case "ArrowDown": e.preventDefault(); e.stopPropagation(); sel = (sel + 1) % items.length; highlightRows(); break;
            case "ArrowUp": e.preventDefault(); e.stopPropagation(); sel = (sel - 1 + items.length) % items.length; highlightRows(); break;
            case "Enter":
            case "Tab": e.preventDefault(); e.stopPropagation(); commit(); break;
            case "Escape": e.preventDefault(); e.stopPropagation(); closePopup(); break;
        }
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
