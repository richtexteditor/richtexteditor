if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-08-15 Import styles from the page's own stylesheets.
//
// The four Quick Styles dropdowns (inlineStyles / paragraphStyles / imageStyles
// / linkStyles) have always been hand-configured, and the shipped defaults are
// placeholders — "my-cls-mark", "my-cls-quote" — that mean nothing in a real
// integration. Every team wiring this editor into an existing design system
// therefore retypes their own class list into config before the dropdowns are
// worth opening. TinyMCE removes that step with `importcss`; this is our
// equivalent.
//
// Design notes:
//   - OPT-IN (`importStyles = true`). Silently rewriting the Styles menu out of
//     whatever CSS happens to be on the page would be a surprising default, and
//     on a utility-CSS site it would be a catastrophic one.
//   - The ELEMENT QUALIFIER decides the bucket: `img.hero` is an image style,
//     `a.cta` a link style, `p.lede` a paragraph style. An unqualified `.foo`
//     cannot be placed, so it goes in both the inline and paragraph menus —
//     the author picks by what they have selected.
//   - Cross-origin stylesheets throw a SecurityError on `.cssRules`, and it is
//     thrown on ACCESS, not returned as null. One un-caught sheet from a CDN
//     kills the whole scan, which is the classic way this feature fails.
//   - `@media` / `@supports` blocks hold their own `cssRules`; a design system's
//     responsive variants live in there, so the walk recurses.
//   - There is a HARD CAP. A Tailwind or Bootstrap page exposes thousands of
//     atomic classes, and a dropdown with 4,000 entries is not a feature. When
//     the cap truncates, it says so via console + `getImportedStyles().truncated`
//     rather than quietly showing the first hundred as if that were all of them.
RTE_DefaultConfig.plugin_importstyles = RTE_Plugin_ImportStyles;

// Master switch.
if (typeof RTE_DefaultConfig.importStyles === "undefined") RTE_DefaultConfig.importStyles = false;

// Which stylesheets to read. null = all readable ones. A string/RegExp is
// matched against the sheet's href ("site.css", /theme/), a function gets the
// CSSStyleSheet.
if (typeof RTE_DefaultConfig.importStylesSheets === "undefined") RTE_DefaultConfig.importStylesSheets = null;

// Classes never imported: the editor's own chrome, and the other editors'
// (a page migrating from CKEditor/TinyMCE still has their CSS loaded).
if (typeof RTE_DefaultConfig.importStylesExclude === "undefined") {
    RTE_DefaultConfig.importStylesExclude = /^(rte[-_]|ck[-_]|cke[-_]|mce[-_]|tox[-_]|js[-_]|is[-_]|has[-_])/i;
}

// Per-class predicate. Return false to skip, a string to override the label.
// function (className, selectorText, bucket) {}
if (typeof RTE_DefaultConfig.importStylesFilter === "undefined") RTE_DefaultConfig.importStylesFilter = null;

// Replace the configured styles instead of appending to them.
if (typeof RTE_DefaultConfig.importStylesReplace === "undefined") RTE_DefaultConfig.importStylesReplace = false;

// Ceiling per dropdown.
if (typeof RTE_DefaultConfig.importStylesLimit === "undefined") RTE_DefaultConfig.importStylesLimit = 100;

function RTE_Plugin_ImportStyles() {
    var obj = this;
    var config, editor;
    var imported = null;
    var scannedDocs = [];

    obj.PluginName = "ImportStyles";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        // Public API — usable even with importStyles off, so an integrator can
        // inspect what WOULD be imported before switching it on.
        editor.importStyles = function (options) { return run(options || {}); };
        editor.getImportedStyles = function () { return imported; };
        editor.scanStylesheetClasses = function (options) {
            activeOptions = options || {};
            try { return collect(); } finally { activeOptions = {}; }
        };

        if (!config.importStyles) return;

        // The host document's sheets are ready now; the editing document's are
        // not, so scan again once it exists. The dropdown panels read config
        // when they OPEN, so a later scan still lands.
        run({});
        try { editor.attachEvent("ready", function () { run({}); }); } catch (e) {}
        setTimeout(function () { run({}); }, 0);
    };

    // ---- buckets ---------------------------------------------------------

    var IMAGE_TAGS = { img: 1, figure: 1, picture: 1 };
    var LINK_TAGS = { a: 1 };
    var INLINE_TAGS = { span: 1, strong: 1, b: 1, em: 1, i: 1, code: 1, mark: 1, small: 1, sub: 1, sup: 1, abbr: 1, q: 1, cite: 1 };
    var BLOCK_TAGS = { p: 1, div: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, blockquote: 1, li: 1, ul: 1, ol: 1, pre: 1, section: 1, article: 1, aside: 1, figcaption: 1, td: 1, th: 1, table: 1 };

    var TARGETS = [
        { key: "imageStyles", tags: IMAGE_TAGS },
        { key: "linkStyles", tags: LINK_TAGS },
        { key: "inlineStyles", tags: INLINE_TAGS },
        { key: "paragraphStyles", tags: BLOCK_TAGS }
    ];

    // The last class in the selector is the one the author would apply; the
    // element qualifier immediately before it says what it applies TO.
    // "article .card p.lede:hover" -> tag "p", class "lede".
    var SELECTOR_RE = /^([a-zA-Z][\w-]*)?\.([\w-]+)$/;

    function parseSelector(selector) {
        // Only the rightmost compound matters; strip pseudo-classes/elements
        // and attribute filters, which are states of a class, not new classes.
        var simple = String(selector)
            .replace(/\[[^\]]*\]/g, "")
            .replace(/::?[\w-]+(\([^)]*\))?/g, "")
            .trim();
        var parts = simple.split(/[\s>+~]+/);
        var last = parts[parts.length - 1] || "";
        // A compound like "p.lede.wide" has no single applicable class.
        if ((last.match(/\./g) || []).length !== 1) return null;
        var m = last.match(SELECTOR_RE);
        if (!m) return null;
        return { tag: (m[1] || "").toLowerCase(), cls: m[2] };
    }

    function bucketsFor(tag) {
        if (!tag) return ["inlineStyles", "paragraphStyles"];   // unqualified: offer both
        for (var i = 0; i < TARGETS.length; i++) if (TARGETS[i].tags[tag]) return [TARGETS[i].key];
        return [];
    }

    // ---- stylesheet walk -------------------------------------------------

    // The editor's own CSS must never reach the Styles menu, and the reliable
    // axis for that is ORIGIN, not class name. A first cut filtered by class
    // prefix and imported 77 classes — the theme's `richtexteditor`/`colordiv`,
    // and 1,788 rules of `aitoolkit.css` — because plugin CSS does not agree on
    // one prefix. Where a sheet came from is unambiguous:
    //   - anything served out of the editor's own asset folder,
    //   - any <style> the editor injected (its nodes carry rte-/__rte ids),
    //   - any anonymous <style> inside the EDITING document, which is only ever
    //     editor-injected — a site's content CSS arrives there via contentCssUrl
    //     and therefore has an href.
    function isEditorSheet(sheet, isEditingDoc) {
        var href = sheet.href || "";
        if (/\/richtexteditor\//i.test(href)) return true;
        var node = sheet.ownerNode;
        var id = (node && node.id) || "";
        if (/^(rte[-_]|__rte)/i.test(id)) return true;
        if (isEditingDoc && !href) return true;
        return false;
    }

    // Options passed to editor.importStyles() win over config. The editor copies
    // config at construction time, so mutating the caller's config object later
    // does NOT reach this plugin — an API that quietly ignored its arguments
    // would be worse than no API at all.
    var activeOptions = {};
    function setting(name) {
        return (activeOptions && name in activeOptions) ? activeOptions[name] : config["importStyles" + name.charAt(0).toUpperCase() + name.slice(1)];
    }

    function wantSheet(sheet, isEditingDoc) {
        if (isEditorSheet(sheet, isEditingDoc)) return false;
        var want = setting("sheets");
        if (!want) return true;
        var href = sheet.href || "";
        if (typeof want === "function") return !!want(sheet);
        if (want instanceof RegExp) return want.test(href);
        return href.indexOf(String(want)) >= 0;
    }

    function excluded(cls) {
        var ex = setting("exclude");
        if (!ex) return false;
        if (ex instanceof RegExp) return ex.test(cls);
        if (typeof ex === "function") return !!ex(cls);
        return cls.indexOf(String(ex)) === 0;
    }

    function walkRules(rules, out) {
        if (!rules) return;
        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            // @media / @supports carry their own rule list.
            if (rule.cssRules && !rule.selectorText) { walkRules(rule.cssRules, out); continue; }
            if (!rule.selectorText) continue;
            var selectors = rule.selectorText.split(",");
            for (var s = 0; s < selectors.length; s++) {
                var parsed = parseSelector(selectors[s]);
                if (!parsed || excluded(parsed.cls)) continue;
                out.push({ cls: parsed.cls, tag: parsed.tag, selector: selectors[s].trim() });
            }
        }
    }

    function documents() {
        var docs = [];
        if (typeof document !== "undefined") docs.push({ doc: document, editing: false });
        try {
            var d = editor.getDocument && editor.getDocument();
            if (d && d !== document) docs.push({ doc: d, editing: true });
        } catch (e) {}
        return docs;
    }

    function collect() {
        var found = [];
        var unreadable = 0;
        var docs = documents();
        for (var d = 0; d < docs.length; d++) {
            var sheets = docs[d].doc.styleSheets || [];
            for (var i = 0; i < sheets.length; i++) {
                var sheet = sheets[i];
                if (!wantSheet(sheet, docs[d].editing)) continue;
                var rules = null;
                try {
                    // Throws SecurityError for a cross-origin sheet. This must
                    // not abort the scan — a single CDN font sheet would
                    // otherwise silently empty the whole Styles menu.
                    rules = sheet.cssRules || sheet.rules;
                } catch (e) { unreadable++; continue; }
                walkRules(rules, found);
            }
        }
        return { classes: found, unreadableSheets: unreadable, documents: docs.length };
    }

    // "my-cls-large-center" -> "Large Center"; "lede" -> "Lede".
    function humanize(cls) {
        var text = String(cls).replace(/^(my[-_]cls[-_]|u[-_]|c[-_])/i, "").replace(/[-_]+/g, " ").trim();
        if (!text) text = cls;
        return text.replace(/\b\w/g, function (ch) { return ch.toUpperCase(); });
    }

    function alreadyListed(list, value) {
        for (var i = 0; i < list.length; i++) if (list[i] && list[i][1] === value) return true;
        return false;
    }

    // ---- apply -----------------------------------------------------------

    function run(options) {
        activeOptions = options || {};
        var scan = collect();
        var limit = Math.max(0, parseInt(setting("limit"), 10) || 0) || Infinity;
        var replace = !!setting("replace");
        var filter = setting("filter");

        var buckets = {};
        var truncated = {};
        for (var t = 0; t < TARGETS.length; t++) buckets[TARGETS[t].key] = [];

        var seen = {};
        for (var i = 0; i < scan.classes.length; i++) {
            var item = scan.classes[i];
            var targets = bucketsFor(item.tag);
            for (var b = 0; b < targets.length; b++) {
                var key = targets[b];
                var dedupeKey = key + "|" + item.cls;
                if (seen[dedupeKey]) continue;

                var label = humanize(item.cls);
                if (typeof filter === "function") {
                    var verdict = filter(item.cls, item.selector, key);
                    if (verdict === false) continue;
                    if (typeof verdict === "string" && verdict) label = verdict;
                }

                seen[dedupeKey] = true;
                if (buckets[key].length >= limit) { truncated[key] = (truncated[key] || 0) + 1; continue; }
                // Two-element form = apply as a class (the three-element form is
                // for inline CSS); this is what the dropdowns already expect.
                buckets[key].push([label, item.cls]);
            }
        }

        var applied = {};
        for (var k = 0; k < TARGETS.length; k++) {
            var name = TARGETS[k].key;
            var incoming = buckets[name];
            if (replace) {
                config[name] = incoming;
            } else {
                if (!config[name]) config[name] = [];
                for (var j = 0; j < incoming.length; j++) {
                    if (!alreadyListed(config[name], incoming[j][1])) config[name].push(incoming[j]);
                }
            }
            applied[name] = incoming.length;
        }

        // A cap that hides work is a lie about coverage. Say what was dropped.
        var dropped = 0;
        for (var key2 in truncated) if (truncated.hasOwnProperty(key2)) dropped += truncated[key2];
        if (dropped) {
            try {
                console.warn("[RichTextEditor] importStyles: " + dropped + " class(es) omitted — " +
                    "importStylesLimit is " + limit + " per dropdown. Raise the limit or narrow " +
                    "importStylesSheets / importStylesFilter.");
            } catch (e) {}
        }

        imported = {
            applied: applied,
            truncated: truncated,
            droppedCount: dropped,
            unreadableSheets: scan.unreadableSheets,
            documentsScanned: scan.documents,
            replaced: !!replace
        };
        activeOptions = {};
        return imported;
    }
}
