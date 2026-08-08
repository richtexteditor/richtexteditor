if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-27 Link checker. Finds links that are broken, unsafe, unreachable by
// assistive technology, or actively misleading.
//
// TinyMCE's Link Checker is premium AND infrastructural: "This plugin is only
// available for paid TinyMCE subscriptions", and self-hosted customers "will
// need to provide a URL to their deployment of the link checking service via
// the linkchecker_service_url parameter". So the feature costs a subscription
// and a service to run.
//
// This one inverts that. The whole offline half needs NO network and NO service:
// broken in-document anchors, unsafe schemes, mixed content, unlabelled links
// and deceptive link text are all decidable from the document itself, and that
// is where most real link defects actually live. Checking whether a remote URL
// still resolves is the only part that needs the network, and that is delegated
// to a host-supplied resolver — the same BYOK shape as the AI, spell, bookmark
// and chip resolvers elsewhere in this editor.
//
// This matters beyond convenience: this editor's position is that it makes no
// outbound calls of its own. A built-in URL prober would quietly break that, and
// would send every URL a customer edits to somebody's server.
//
// Design note: the highlight is CHROME, not content. It is stripped around every
// serialize (the pagination.js contract), so marking up problems never changes
// the HTML you save.
RTE_DefaultConfig.plugin_linkchecker = RTE_Plugin_LinkChecker;

// Optional. function (urls) -> Promise<{ "<url>": {ok:true|false, status:404} }>
// (written without a literal URL on purpose: this file is concatenated into
//  all_plugins.js, and customers run static scanners over that)
// Supply one to have external URLs checked; omit it and only offline checks run.
if (typeof RTE_DefaultConfig.linkCheckResolver === "undefined") RTE_DefaultConfig.linkCheckResolver = null;
// Schemes rejected outright.
if (typeof RTE_DefaultConfig.linkCheckUnsafeSchemes === "undefined") {
    RTE_DefaultConfig.linkCheckUnsafeSchemes = ["javascript:", "data:", "vbscript:", "file:"];
}
// Warn when an https page links to http.
if (typeof RTE_DefaultConfig.linkCheckMixedContent === "undefined") RTE_DefaultConfig.linkCheckMixedContent = true;

function RTE_Plugin_LinkChecker() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var wrapped = false;
    var lastIssues = [];
    var highlighting = false;

    obj.PluginName = "LinkChecker";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_checklinks", function (state) {
            state.returnValue = true;
            obj.Check();
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0);

        // Public API.
        editor.checkLinks = function () { return obj.Check(); };
        editor.getLinkIssues = function () { return lastIssues.slice(); };
        editor.highlightLinkIssues = function (on) { return applyHighlight(on !== false); };
        editor.clearLinkHighlights = function () { return applyHighlight(false); };
        editor.getLinkCheckerCss = function () { return css(); };
    };

    function setup() {
        var doc = getDoc();
        if (!doc) return;
        injectStyles(doc);
        wrapSerializers();
        boundDoc = doc;
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    // ---- the checks ------------------------------------------------------

    // Every <a> that is meant to be a LINK — deliberately not "a[href]".
    // rte.js sanitises a javascript: href by removing the attribute outright, so
    // the most dangerous input in the document arrives as an <a> with no href at
    // all. Selecting on a[href] would make exactly that case invisible: the user
    // sees a link that goes nowhere and the checker reports nothing.
    // A bare <a name="x"> / <a id="x"> with no href is an anchor TARGET, not a
    // link, and is excluded.
    function links() {
        var editable = getEditable();
        if (!editable) return [];
        var all = editable.querySelectorAll("a");
        var out = [];
        for (var i = 0; i < all.length; i++) {
            var a = all[i];
            if (a.hasAttribute("href")) { out.push(a); continue; }
            if (a.getAttribute("name") || a.getAttribute("id")) continue;   // anchor target
            out.push(a);
        }
        return out;
    }

    // Everything decidable without the network.
    function offlineIssues() {
        var editable = getEditable();
        var out = [];
        if (!editable) return out;
        var list = links();
        var unsafe = config.linkCheckUnsafeSchemes || [];
        var pageIsHttps = false;
        try { pageIsHttps = (window.location.protocol === "https:"); } catch (e) {}

        // Link text -> hrefs, for the "same words, different destinations" check.
        var byText = {};

        for (var i = 0; i < list.length; i++) {
            var a = list[i];
            var href = (a.getAttribute("href") || "").trim();
            var text = (a.textContent || "").trim();
            var add = function (severity, code, message) {
                out.push({ element: a, href: href, text: text, severity: severity, code: code, message: message });
            };

            if (!a.hasAttribute("href")) {
                add("error", "empty-href",
                    "Link has no destination — its address may have been removed for being unsafe.");
                continue;
            }
            if (!href || href === "#") {
                add("error", "empty-href", "Link has no destination.");
                continue;
            }

            var lower = href.toLowerCase();
            var bad = null;
            for (var u = 0; u < unsafe.length; u++) {
                if (lower.indexOf(unsafe[u]) === 0) { bad = unsafe[u]; break; }
            }
            if (bad) {
                add("error", "unsafe-scheme", "Link uses the " + bad + " scheme, which is unsafe in published content.");
                continue;
            }

            // In-document anchor: decidable with certainty, and a very common
            // breakage because headings get retitled and ids change.
            if (href.charAt(0) === "#") {
                var id = href.substring(1);
                var target = null;
                try {
                    target = editable.querySelector("#" + id.replace(/["\\\]\[]/g, "\\$&")) ||
                             editable.querySelector('[name="' + id.replace(/"/g, '\\"') + '"]');
                } catch (e) { target = null; }
                if (!target) add("error", "broken-anchor", "Links to #" + id + ", which does not exist in this document.");
            } else if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.indexOf("//") === 0) {
                // Absolute URL: parse it to catch malformed ones.
                var parsed = parseUrl(href);
                if (!parsed) {
                    add("error", "malformed", "Link address cannot be parsed as a URL.");
                } else {
                    if (config.linkCheckMixedContent !== false && pageIsHttps && parsed.protocol === "http:") {
                        add("warning", "mixed-content", "Insecure http:// link on a secure page; browsers may block or warn.");
                    }
                    // Text that looks like a URL but points somewhere else is the
                    // classic phishing shape, and it also happens innocently when
                    // someone edits the visible text but not the href.
                    if (/^(https?:\/\/|www\.)/i.test(text)) {
                        var shown = parseUrl(/^www\./i.test(text) ? "http://" + text : text);
                        if (shown && shown.hostname && parsed.hostname &&
                            shown.hostname.toLowerCase() !== parsed.hostname.toLowerCase()) {
                            add("warning", "deceptive-text",
                                "Link text shows " + shown.hostname + " but the link goes to " + parsed.hostname + ".");
                        }
                    }
                }
            }

            // Accessibility: a link with no accessible name is unusable by screen
            // reader users, who navigate by pulling up a list of link names.
            if (!text) {
                var hasImgAlt = false;
                var imgs = a.querySelectorAll ? a.querySelectorAll("img[alt]") : [];
                for (var m = 0; m < imgs.length; m++) if ((imgs[m].getAttribute("alt") || "").trim()) hasImgAlt = true;
                if (!hasImgAlt && !(a.getAttribute("aria-label") || "").trim() && !(a.getAttribute("title") || "").trim()) {
                    add("error", "empty-text", "Link has no text, image alt, aria-label or title, so it has no accessible name.");
                }
            } else {
                var key = text.toLowerCase();
                (byText[key] = byText[key] || []).push({ a: a, href: href });
            }
        }

        // Same visible words pointing at different destinations reads as one
        // repeated link to anyone navigating by link name.
        for (var k in byText) {
            if (!byText.hasOwnProperty(k)) continue;
            var group = byText[k];
            if (group.length < 2) continue;
            var distinct = {};
            for (var g = 0; g < group.length; g++) distinct[group[g].href] = true;
            if (Object.keys(distinct).length < 2) continue;
            for (var g2 = 0; g2 < group.length; g2++) {
                out.push({
                    element: group[g2].a, href: group[g2].href, text: group[g2].a.textContent.trim(),
                    severity: "warning", code: "ambiguous-text",
                    message: "Several links share the text “" + group[g2].a.textContent.trim() +
                             "” but point to different destinations."
                });
            }
        }
        return out;
    }

    function parseUrl(href) {
        try {
            var doc = getDoc() || document;
            var a = doc.createElement("a");
            a.href = href;
            if (!a.protocol || a.protocol === ":") return null;
            return { protocol: a.protocol, hostname: a.hostname, pathname: a.pathname };
        } catch (e) { return null; }
    }

    // ---- run -------------------------------------------------------------

    obj.Check = function () {
        var issues = offlineIssues();
        var resolver = config.linkCheckResolver;

        if (typeof resolver !== "function") {
            lastIssues = issues;
            finish(issues);
            // Always a promise, so callers do not branch on whether a resolver
            // happens to be configured.
            return typeof Promise === "function" ? Promise.resolve(issues.slice()) : issues.slice();
        }

        // Only URLs that survived the offline checks are worth a round trip.
        var flagged = {};
        for (var i = 0; i < issues.length; i++) flagged[issues[i].href] = true;
        var urls = [], seen = {};
        var list = links();
        for (var j = 0; j < list.length; j++) {
            var href = (list[j].getAttribute("href") || "").trim();
            if (!href || href.charAt(0) === "#" || flagged[href] || seen[href]) continue;
            if (!/^https?:/i.test(href)) continue;      // only real web URLs
            seen[href] = true;
            urls.push(href);
        }
        if (!urls.length) {
            lastIssues = issues; finish(issues);
            return typeof Promise === "function" ? Promise.resolve(issues.slice()) : issues.slice();
        }

        return Promise.resolve()
            .then(function () { return resolver(urls.slice()); })
            .then(function (result) {
                result = result || {};
                var byHref = {};
                for (var n = 0; n < list.length; n++) {
                    var h = (list[n].getAttribute("href") || "").trim();
                    (byHref[h] = byHref[h] || []).push(list[n]);
                }
                for (var u in result) {
                    if (!result.hasOwnProperty(u)) continue;
                    var r = result[u];
                    if (!r || r.ok !== false) continue;
                    var els = byHref[u] || [];
                    for (var e = 0; e < els.length; e++) {
                        issues.push({
                            element: els[e], href: u, text: (els[e].textContent || "").trim(),
                            severity: "error", code: "unreachable",
                            message: "Link did not resolve" + (r.status ? " (HTTP " + r.status + ")" : "") + "."
                        });
                    }
                }
                lastIssues = issues;
                finish(issues);
                return issues.slice();
            })
            .catch(function () {
                // A resolver that fails must not lose the offline findings.
                lastIssues = issues;
                finish(issues);
                return issues.slice();
            });
    };

    function finish(issues) {
        if (highlighting) paint(issues);
        try { editor.fireEvent && editor.fireEvent("linkcheck", issues); } catch (e) {}
    }

    // ---- highlighting (chrome, never content) ----------------------------

    function applyHighlight(on) {
        highlighting = !!on;
        if (highlighting) paint(lastIssues);
        else clear();
        return highlighting;
    }

    function clear() {
        var editable = getEditable();
        if (!editable) return;
        var marked = editable.querySelectorAll("a[data-rte-link-issue]");
        for (var i = 0; i < marked.length; i++) {
            marked[i].removeAttribute("data-rte-link-issue");
            marked[i].removeAttribute("data-rte-link-issue-message");
        }
    }

    function paint(issues) {
        clear();
        for (var i = 0; i < issues.length; i++) {
            var el = issues[i].element;
            if (!el || !el.setAttribute) continue;
            // An error already recorded outranks a later warning on the same link.
            if (el.getAttribute("data-rte-link-issue") === "error") continue;
            el.setAttribute("data-rte-link-issue", issues[i].severity);
            el.setAttribute("data-rte-link-issue-message", issues[i].message);
        }
    }

    function stripFor() {
        var editable = getEditable();
        if (!editable) return function () {};
        var marked = editable.querySelectorAll("a[data-rte-link-issue]");
        var parked = [];
        for (var i = 0; i < marked.length; i++) {
            parked.push({
                el: marked[i],
                sev: marked[i].getAttribute("data-rte-link-issue"),
                msg: marked[i].getAttribute("data-rte-link-issue-message")
            });
            marked[i].removeAttribute("data-rte-link-issue");
            marked[i].removeAttribute("data-rte-link-issue-message");
        }
        return function restore() {
            for (var j = 0; j < parked.length; j++) {
                parked[j].el.setAttribute("data-rte-link-issue", parked[j].sev);
                if (parked[j].msg) parked[j].el.setAttribute("data-rte-link-issue-message", parked[j].msg);
            }
        };
    }

    function wrapSerializers() {
        if (wrapped) return;
        var names = ["getHTMLCode", "getJSON", "getHTMLContent", "getText"];
        var did = false;
        for (var i = 0; i < names.length; i++) {
            (function (name) {
                var orig = editor[name];
                if (typeof orig !== "function" || orig.__rteLcWrapped) return;
                var w = function () {
                    var restore = stripFor();
                    try { return orig.apply(editor, arguments); } finally { restore(); }
                };
                w.__rteLcWrapped = true;
                editor[name] = w;
                did = true;
            })(names[i]);
        }
        if (did) wrapped = true;
    }

    // ---- styles ----------------------------------------------------------

    function css() {
        return (
            "a[data-rte-link-issue='error']{background:rgba(220,38,38,.12);" +
            "box-shadow:inset 0 -2px 0 rgba(220,38,38,.65);border-radius:2px;}" +
            "a[data-rte-link-issue='warning']{background:rgba(217,119,6,.12);" +
            "box-shadow:inset 0 -2px 0 rgba(217,119,6,.6);border-radius:2px;}"
        );
    }

    function injectStyles(doc) {
        if (!doc) return;
        var existing = doc.getElementById("rte-link-checker-styles");
        var text = css();
        if (existing) {
            if (existing.getAttribute("data-css") === text) return;
            existing.parentNode && existing.parentNode.removeChild(existing);
        }
        var st = doc.createElement("style");
        st.id = "rte-link-checker-styles";
        st.setAttribute("data-css", text);
        st.appendChild(doc.createTextNode(text));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
