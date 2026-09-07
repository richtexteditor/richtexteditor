if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-08-02 Content sanitizer.
//
// The editor core already does most of the hard part: it strips inline event
// handlers (onerror/onload/ontoggle/onfocus) and rejects javascript: on links
// and form actions. Verified by loading a battery of payloads — none of them
// executed inside the editor.
//
// But "nothing executes in the editor" is the wrong bar. The bar is "nothing
// executes in the application that renders what the editor SAVED", because that
// is the shape every deployment has: user A writes content, it is stored, and
// user B's browser renders it. Three constructs survived the core filter into
// saved output, and one of them is live stored XSS:
//
//   <iframe srcdoc="&lt;script&gt;...">   -- EXECUTES when rendered downstream
//   <object data="javascript:...">         -- script-bearing URL kept verbatim
//   <style>@import "javascript:..."</style>-- CSS injection / exfiltration
//
// So this filters on the way in AND on the way out. Output is the guaranteed
// path: it is what gets stored, it runs against a detached copy so it can never
// disturb the caret, and it means content that arrived before this plugin
// existed is cleaned on its next save.
//
// This is a defence in depth, not a licence to render untrusted HTML without
// server-side checks — see the note in the docs.
//
// API:
//   editor.sanitizeHtml(html)     -> cleaned HTML string
//   editor.getSanitizerReport()   -> what the last pass removed
// Config:
//   config.contentSanitizer = false          // disable entirely
//   config.sanitizerAllowStyleTags = true    // keep <style> in content
//   config.sanitizerAllowIframes = false     // drop <iframe> outright
//   config.sanitizerAllowedIframeHosts = ["www.youtube.com"]
//   config.sanitizerAllowTags = ["custom-el", "x-*", /^ui-/]
//   config.sanitizerAllowAttributes = ["my-attr", "data-cms-*"]
//        exact names, "*" wildcards, or RegExp -- see buildMatcher()
RTE_DefaultConfig.plugin_sanitizer = RTE_Plugin_Sanitizer;
if (typeof RTE_DefaultConfig.contentSanitizer === "undefined") RTE_DefaultConfig.contentSanitizer = true;

function RTE_Plugin_Sanitizer() {
    var obj = this;
    var config, editor;
    var wrapped = false;
    // Cumulative, not per-call. The input pass cleans the content and the
    // output pass then legitimately finds nothing left to remove, so a
    // last-call-wins report answers "was anything stripped?" with a confident
    // and completely wrong "no".
    var report = { removedTags: [], removedAttributes: [], calls: 0, lastPasses: 0 };
    var liveGuards = [];

    obj.PluginName = "Sanitizer";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.contentSanitizer === false) return;

        editor.sanitizeHtml = function (html) { return sanitizeHtml(String(html == null ? "" : html)); };
        editor.getSanitizerReport = function () { return JSON.parse(JSON.stringify(report)); };

        // The core does not isolate plugin init: one throw in here and the
        // editor never finishes building. A filter is defence in depth, so it
        // must never be the reason the product fails to load.
        function install() {
            try { wrapSerializers(); wrapSetters(); } catch (e) {}
            try { bindPaste(); } catch (e) {}
            try { guardLiveDom(); } catch (e) {}
        }
        install();
        // The editable is created asynchronously, and collaboration attaches
        // later still — so re-install until it takes.
        try { editor.attachEvent("ready", install); } catch (e) {}
        setTimeout(install, 0);
        setTimeout(install, 400);
    };

    // ------------------------------------------------------------- policy
    //
    // Allowlist, not blocklist. A blocklist is a promise to have thought of
    // every element HTML will ever gain; an allowlist fails closed.
    var ALLOWED_TAGS = {};
    (
        "p,div,span,br,hr,h1,h2,h3,h4,h5,h6," +
        "b,strong,i,em,u,s,strike,del,ins,mark,small,sub,sup,abbr,cite,q,dfn,kbd,samp,var,time,data," +
        "bdi,bdo,wbr,ruby,rt,rp," +
        "ul,ol,li,dl,dt,dd," +
        "table,thead,tbody,tfoot,tr,td,th,caption,colgroup,col," +
        "blockquote,pre,code,figure,figcaption," +
        "section,article,header,footer,main,aside,nav,address,details,summary," +
        "a,img,picture,source,video,audio,track,map,area," +
        // Chips, task lists and the code plugin put these in content.
        "input,label,button," +
        // Inline SVG (icons, diagrams). Its dangerous children are dropped below.
        "svg,g,path,circle,ellipse,rect,line,polyline,polygon,text,tspan,defs,marker," +
        "linearGradient,radialGradient,stop,clipPath,mask,pattern,use,symbol,title,desc"
    ).split(",").forEach(function (t) { ALLOWED_TAGS[t] = true; });

    // Removed WITH their contents: their text is markup, not prose.
    var DROP_WHOLE = {
        script: 1, noscript: 1, template: 1, object: 1, embed: 1, applet: 1,
        base: 1, meta: 1, link: 1, frame: 1, frameset: 1, "foreignobject": 1,
        // <title>/<desc> are legal in SVG and harmless; kept in ALLOWED_TAGS.
        xml: 1, "script:": 1
    };

    var ALLOWED_ATTRS = {};
    (
        "id,class,style,title,lang,dir,translate,hidden,tabindex,role," +
        // contenteditable is what keeps a footnote marker, merge field or smart
        // chip ATOMIC — stripping it silently makes those editable character by
        // character. It executes nothing, so there is no reason to remove it.
        // sandbox is a restriction, never a capability; dropping it would make
        // an embed MORE powerful.
        "contenteditable,spellcheck,autocomplete,draggable,sandbox,allowfullscreen,allow,frameborder,scrolling," +
        "href,src,srcset,sizes,alt,width,height,loading,decoding,referrerpolicy," +
        "target,rel,download,type,value,name,placeholder,checked,disabled,readonly," +
        "colspan,rowspan,headers,scope,span,align,valign,bgcolor,border,cellpadding,cellspacing," +
        "start,reversed,datetime,cite,open,controls,autoplay,loop,muted,playsinline,poster,preload,kind,srclang,label," +
        "usemap,ismap,coords,shape," +
        // SVG presentation
        "viewbox,xmlns,fill,stroke,stroke-width,stroke-linecap,stroke-linejoin,stroke-dasharray," +
        "d,cx,cy,r,rx,ry,x,y,x1,y1,x2,y2,points,transform,opacity,fill-rule,clip-rule," +
        "gradientunits,offset,stop-color,stop-opacity,text-anchor,font-size,font-family,font-weight," +
        "preserveaspectratio,version"
    ).split(",").forEach(function (a) { ALLOWED_ATTRS[a] = true; });

    // Attributes whose value is a URL and must therefore be scheme-checked.
    var URL_ATTRS = { href: 1, src: 1, action: 1, formaction: 1, poster: 1, cite: 1, data: 1, longdesc: 1, background: 1, ping: 1, srcset: 1 };
    var SAFE_SCHEMES = /^(https?|mailto|tel|ftp|sms|callto|webcal|geo|bitcoin):/i;
    var IMAGE_DATA_URI = /^data:image\/(png|jpe?g|gif|webp|bmp|x-icon|avif);base64,[a-z0-9+/=\s]+$/i;
    // Deliberately NOT allowed as a data: type: image/svg+xml. An SVG data URI
    // is a document, and a document can carry script.

    function isSafeUrl(value, tag, attr) {
        // Control characters and whitespace are stripped first: "java\\u0009script:"
        // and "java\\nscript:" are both parsed as javascript: by browsers, so a
        // scheme test on the raw string is trivially bypassed. Written as
        // escapes — a literal control byte here would be invisible in source.
        var v = String(value == null ? "" : value).replace(/[\u0000-\u0020\u007F-\u00A0]+/g, "").trim();
        if (!v) return false;

        // <use> resolves its reference by FETCHING it. The only legitimate form
        // in editor content is a same-document fragment (#icon-id) pointing at a
        // <symbol>/<defs> in the same markup — nobody authoring a document means
        // to reference a remote SVG. Left unrestricted it is a beacon that fires
        // in every reader's browser for content one author saved, which is the
        // same class of problem as an embedded remote logo or analytics pixel
        // (see the no-external-calls hardening). Browsers additionally refuse
        // cross-origin <use>, but relying on that is relying on someone else's
        // policy to enforce ours.
        if (tag === "use") return v.charAt(0) === "#";

        // Fragments, absolute paths and query-only URLs carry no scheme.
        if (/^[#?/]/.test(v)) return true;

        var scheme = /^([a-z][a-z0-9+.\-]*):/i.exec(v);
        if (!scheme) return true;                       // no scheme at all: relative

        if (IMAGE_DATA_URI.test(v)) {
            // A data: URI is only ever acceptable where an IMAGE is expected.
            return tag === "img" || tag === "source" || attr === "poster" || attr === "srcset";
        }
        if (/^blob:/i.test(v)) {
            return tag === "img" || tag === "video" || tag === "audio" || tag === "source";
        }
        return SAFE_SCHEMES.test(v);
    }

    // A style attribute can carry script in legacy engines and can exfiltrate
    // through url(). Values are filtered rather than the attribute dropped,
    // because style is how nearly all editor formatting is expressed.
    function cleanStyle(value) {
        // Whole DECLARATIONS are dropped, not fragments of them. Editing a value
        // in place leaves debris that is both invalid CSS and misleading:
        // removing "javascript:" from url(javascript:foo()) yields url(foo()),
        // which then reads as a harmless relative URL and passes the very check
        // that was supposed to catch it. Nesting also defeats surgical removal —
        // expression(f(1)) has an inner ")" that ends the match early.
        var out = [];
        var decls = String(value == null ? "" : value).split(";");
        for (var i = 0; i < decls.length; i++) {
            var d = decls[i];
            if (!d.trim()) continue;
            if (/expression\s*\(|(javascript|vbscript|livescript)\s*:|-moz-binding|behaviou?r\s*:|@import|-o-link/i.test(d)) continue;
            var url = /url\s*\(\s*(['"]?)([^'")]*)\1\s*\)/i.exec(d);
            if (url && !isSafeUrl(url[2], "img", "src")) continue;
            out.push(d.trim());
        }
        return out.join("; ");
    }

    // Embeds are a legitimate feature (autoembed), so iframes cannot simply be
    // dropped. But an INJECTED iframe is still a phishing surface even though
    // it cannot script the parent: it can navigate the top window, open popups
    // and submit forms.
    //
    // With no host allowlist configured, the compromise is to keep https frames
    // and force a sandbox that permits what a video embed needs and nothing
    // else. Top-navigation, popups, modals and forms are all withheld. Setting
    // sanitizerAllowedIframeHosts is still the stronger control.
    var DEFAULT_IFRAME_SANDBOX = "allow-scripts allow-same-origin allow-presentation";

    function iframeAllowed(el) {
        if (config.sanitizerAllowIframes === false) return false;
        var src = el.getAttribute("src") || "";
        if (!/^https?:/i.test(src)) return false;
        var hosts = config.sanitizerAllowedIframeHosts;
        if (!hosts || !hosts.length) {
            if (!el.hasAttribute("sandbox")) el.setAttribute("sandbox", DEFAULT_IFRAME_SANDBOX);
            return true;
        }
        try {
            var host = new URL(src).hostname.toLowerCase();
            for (var i = 0; i < hosts.length; i++) {
                var h = String(hosts[i]).toLowerCase();
                if (host === h || host.slice(-(h.length + 1)) === "." + h) return true;
            }
        } catch (e) {}
        return false;
    }

    // Build a name matcher from a config list. Entries may be:
    //   "my-widget"   an exact name
    //   "my-*"        a wildcard, where * matches any run of characters
    //   /^my-/        a RegExp
    // The wildcard form is what makes this a workable answer to CKEditor's General
    // HTML Support: without it an integrator has to enumerate every tag and
    // attribute a CMS might emit, by name, which nobody does -- so the content gets
    // unwrapped instead and the integrator concludes the editor destroys it.
    //
    // A pattern widens what is KEPT, never what is executed: on* handlers,
    // javascript: URLs, <script> and iframe[srcdoc] are all handled before this is
    // consulted, so allowing a tag or attribute by pattern cannot re-open those.
    //
    // Wildcards are matched by hand rather than compiled to a RegExp, so a config
    // value can never be a regex-injection vector and no escaping table has to be
    // kept correct.
    function buildMatcher(list) {
        var literal = {};
        var globs = [];
        var regexps = [];
        (list || []).forEach(function (entry) {
            if (entry instanceof RegExp) { regexps.push(entry); return; }
            var t = String(entry).toLowerCase();
            if (t.indexOf("*") === -1) { literal[t] = true; return; }
            globs.push(t.split("*"));
        });
        function globMatches(parts, name) {
            // parts came from splitting on "*": they must appear in order, the first
            // anchored at the start and the last at the end.
            var first = parts[0];
            if (name.lastIndexOf(first, 0) !== 0) return false;
            var last = parts[parts.length - 1];
            if (last) {
                if (name.length < last.length) return false;
                if (name.indexOf(last, name.length - last.length) === -1) return false;
            }
            var pos = first.length;
            for (var i = 1; i < parts.length; i++) {
                if (!parts[i]) continue;
                var at = name.indexOf(parts[i], pos);
                if (at === -1) return false;
                pos = at + parts[i].length;
            }
            return true;
        }
        return function (name) {
            if (literal[name]) return true;
            for (var i = 0; i < globs.length; i++) if (globMatches(globs[i], name)) return true;
            for (var j = 0; j < regexps.length; j++) if (regexps[j].test(name)) return true;
            return false;
        };
    }

    // --------------------------------------------------------------- engine
    function sanitizeNode(root, report) {
        var allowExtra = buildMatcher(config.sanitizerAllowTags);
        var attrExtra = buildMatcher(config.sanitizerAllowAttributes);
        var allowStyleTag = config.sanitizerAllowStyleTags === true;

        // Collect first: removing nodes while walking a live list skips siblings.
        var all = [];
        (function collect(n) {
            for (var i = 0; i < n.childNodes.length; i++) {
                var c = n.childNodes[i];
                if (c.nodeType === 1) { all.push(c); collect(c); }
                else if (c.nodeType === 8) all.push(c);   // checked, see commentEscapes()
            }
        })(root);

        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            if (!el.parentNode) continue;                 // already removed with an ancestor

            if (el.nodeType === 8) {
                // Comments used to be removed wholesale, on the stated grounds that
                // "comments can hide markup". That reason does not survive testing:
                // serialise <!--<script>alert(1)</script>--> and re-parse it and the
                // script is inert -- a well-formed comment is just text.
                //
                // What IS unsafe is a narrow, enumerable set of comment DATA that
                // cannot survive serialisation, because the serialiser writes the
                // data verbatim between <!-- and -->. Re-parsing then ends the
                // comment early and the remainder becomes live markup:
                //
                //   "--> <img src=x onerror=...>"  -> <!----> <img ...>-->   ESCAPES
                //   "--!> <img ...>"               -> <!----!> <img ...>-->  ESCAPES
                //   "> <img ...>"                  -> <!--> <img ...>-->     ESCAPES
                //   "-> <img ...>"                 -> <!---> <img ...>-->    ESCAPES
                //
                // That is the WHATWG serialisation constraint, not a heuristic, so
                // it can be enumerated rather than guessed at. Everything else is
                // kept, which is what lets a CMS round-trip its own markers and lets
                // an email template keep its Outlook conditional comments -- the
                // mechanism emailtoolkit.js needs and could not previously rely on.
                if (commentEscapes(el.data)) {
                    note(report.removedTags, "#comment");
                    el.parentNode.removeChild(el);
                }
                continue;
            }

            var tag = (el.localName || el.nodeName || "").toLowerCase();

            if (tag === "style") {
                if (!allowStyleTag) { note(report.removedTags, "style"); el.parentNode.removeChild(el); continue; }
            } else if (tag === "iframe") {
                // srcdoc is an inline document and is never needed for an embed.
                // This is the construct that actually executed downstream.
                if (el.hasAttribute("srcdoc")) { note(report.removedAttributes, "iframe[srcdoc]"); el.removeAttribute("srcdoc"); }
                if (!iframeAllowed(el)) { note(report.removedTags, "iframe"); el.parentNode.removeChild(el); continue; }
            } else if (tag === "title" || tag === "desc") {
                // Legal inside <svg> (they supply its accessible name), which is
                // why they are in ALLOWED_TAGS. But the allowance was
                // unqualified, so a document-level <title> from a pasted or
                // set full HTML document survived into SAVED content while
                // <style>/<meta>/<link> beside it were stripped. Head-level
                // markup has no business in body content; keep these only where
                // they are actually valid.
                if (!el.closest || !el.closest("svg")) {
                    note(report.removedTags, tag);
                    el.parentNode.removeChild(el);
                    continue;
                }
            } else if (DROP_WHOLE[tag]) {
                note(report.removedTags, tag);
                el.parentNode.removeChild(el);
                continue;
            } else if (!ALLOWED_TAGS[tag] && !allowExtra(tag)) {
                // Unknown element: unwrap rather than delete, so the words a
                // user typed inside a stray tag are not silently lost.
                note(report.removedTags, tag);
                unwrap(el);
                continue;
            }

            var attrs = [];
            for (var a = 0; a < el.attributes.length; a++) attrs.push(el.attributes[a]);
            for (var k = 0; k < attrs.length; k++) {
                var name = attrs[k].name.toLowerCase();
                var value = attrs[k].value;

                // Any event handler, including ones invented after this ships.
                if (name.indexOf("on") === 0) { note(report.removedAttributes, name); el.removeAttribute(attrs[k].name); continue; }
                // Namespaced links are a classic bypass: xlink:href on <use>.
                if (name === "xlink:href" || name === "xmlns:xlink") {
                    if (!isSafeUrl(value, tag, name)) { note(report.removedAttributes, name); el.removeAttribute(attrs[k].name); }
                    continue;
                }
                if (name === "srcdoc") { note(report.removedAttributes, "srcdoc"); el.removeAttribute(attrs[k].name); continue; }
                if (name === "style") { el.setAttribute("style", cleanStyle(value)); continue; }
                if (name.indexOf("data-") === 0 || name.indexOf("aria-") === 0) continue;

                if (URL_ATTRS[name]) {
                    if (!isSafeUrl(value, tag, name)) { note(report.removedAttributes, tag + "[" + name + "]"); el.removeAttribute(attrs[k].name); }
                    continue;
                }
                if (!ALLOWED_ATTRS[name] && !attrExtra(name)) {
                    note(report.removedAttributes, name);
                    el.removeAttribute(attrs[k].name);
                }
            }

            // A link that opens a new tab without rel="noopener" hands the
            // opener window to the destination.
            if (tag === "a" && (el.getAttribute("target") || "").toLowerCase() === "_blank") {
                var rel = (el.getAttribute("rel") || "").toLowerCase();
                if (rel.indexOf("noopener") < 0) el.setAttribute("rel", (rel ? rel + " " : "") + "noopener noreferrer");
            }
        }
        return root;
    }

    function unwrap(el) {
        var parent = el.parentNode;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    }
    function note(list, what) { if (list.indexOf(what) < 0) list.push(what); }

    function sanitizeHtml(html) {
        var out = html;
        report.calls++;
        // Parsing into an inert document means nothing loads or executes while
        // we inspect it -- innerHTML on a live div would fire <img onerror>
        // before the first line of this ran.
        for (var pass = 0; pass < 3; pass++) {
            var doc = new DOMParser().parseFromString("<body>" + out + "</body>", "text/html");
            sanitizeNode(doc.body, report);
            var next = doc.body.innerHTML;
            report.lastPasses = pass + 1;
            // Re-parsing can RESURRECT markup: the classic mutation-XSS trick is
            // content that is inert in one parse and dangerous once the
            // serializer has rewritten it. Loop until it stops changing.
            if (next === out) break;
            out = next;
        }
        return out;
    }

    // ------------------------------------------------------------- plumbing
    function wrapSerializers() {
        if (wrapped) return;
        var names = ["getHTMLCode", "getHTMLContent"];
        var did = false;
        for (var i = 0; i < names.length; i++) {
            (function (name) {
                var orig = editor[name];
                if (typeof orig !== "function" || orig.__rteSanitized) return;
                var w = function () {
                    var html = orig.apply(editor, arguments);
                    if (typeof html !== "string") return html;
                    return sanitizeHtml(html);
                };
                w.__rteSanitized = true;
                editor[name] = w;
                did = true;
            })(names[i]);
        }
        if (did) wrapped = true;
    }

    function wrapSetters() {
        var names = ["setHTMLCode", "setHTMLContent"];
        for (var i = 0; i < names.length; i++) {
            (function (name) {
                var orig = editor[name];
                if (typeof orig !== "function" || orig.__rteSanitizedIn) return;
                var w = function (html) {
                    var args = [].slice.call(arguments);
                    if (typeof html === "string") args[0] = sanitizeHtml(html);
                    return orig.apply(editor, args);
                };
                w.__rteSanitizedIn = true;
                editor[name] = w;
            })(names[i]);
        }
    }

    // Paste is the other way hostile markup arrives — and cleaning up AFTERWARDS
    // is not good enough, which measurement made obvious: pasting
    // <iframe srcdoc="<script>…"> executed 70ms after the paste, long before a
    // post-paste pass could run. The saved document was clean, so there was no
    // stored XSS, but script had already run in the editing session under the
    // host page's origin. Post-hoc cleaning cannot prevent execution; only
    // keeping the markup out of the live DOM can.
    //
    // The editor has its own paste pipeline (pasteMode, Word cleanup), and
    // replacing it wholesale would throw that away. So this intercepts ONLY
    // clipboard HTML carrying something that executes on insertion. A Word
    // paste — heavy with <style> and mso- rules but no handlers — is left
    // entirely alone and keeps its normal cleanup path.
    function executesOnInsert(html) {
        return /\son[a-z]+\s*=/i.test(html)                    // any inline handler
            || /<\s*(script|iframe|object|embed|base)\b/i.test(html)
            || /srcdoc\s*=/i.test(html)                        // a document inside an attribute
            || /(javascript|vbscript)\s*:/i.test(html)
            || /data:\s*text\/html/i.test(html);
        // <style> is deliberately NOT here: it cannot execute script, and
        // listing it would intercept every paste from Word.
    }

    // Content can enter the editable without passing through setHTMLCode or
    // paste at all. The case that matters is real-time collaboration: a remote
    // peer's edits are applied straight to the DOM by the sync engine, so a
    // malicious collaborator could push <iframe srcdoc> into the shared
    // document and execute script in every other participant's browser.
    // Measured: the payload ran locally AND replicated to the peer with its
    // onerror attribute intact.
    //
    // THREAT MODEL -- read this before tightening or loosening the rule below.
    //
    // An escaping comment CANNOT BE AUTHORED AS AN HTML STRING. Feed
    // `<!--x--> <img src=q onerror=...>-->` to setHTMLCode and the parser yields
    // comment("x") + text + a normal <img> element, which the element/attribute
    // filters already handle. The ONLY way to obtain a comment node whose data
    // escapes is programmatic DOM construction -- document.createComment(), or a
    // sync layer building nodes directly.
    //
    // That is why the guard lives on the DOM-level paths (the sanitise pass and the
    // live-DOM MutationObserver) and why the string paths need nothing extra. Both
    // string directions were measured: sender getHTMLCode, receiver setHTMLCode, and
    // the receiver's live DOM all yield zero executable attributes, because
    // wrapSerializers() and wrapSetters() filter on the way out and on the way in.
    //
    // The previous rule here deleted EVERY comment, justified only by the remark
    // "comments can hide markup". That is false -- serialise
    // <!--<script>alert(1)</script>--> and re-parse it and the script is inert -- and
    // it cost the product CMS round-tripping and Outlook conditional comments (the
    // mechanism emailtoolkit.js needs) for as long as nobody re-checked it. An
    // unexplained restriction outlives its reason, so this one is written down.
    //
    // A comment's data is written verbatim between <!-- and -->, so data that
    // contains a terminator (or opens with one) breaks out of the comment when the
    // serialised output is re-parsed, turning the remainder into live markup.
    // Module scope on purpose: both the sanitiser pass and the live-DOM
    // MutationObserver below need it, and they must agree exactly on what is unsafe.
    // Deliberately conservative -- it rejects rather than rewrites, because silently
    // editing someone's comment text is its own kind of surprise.
    function commentEscapes(data) {
        var d = String(data == null ? "" : data);
        if (d.indexOf("-->") !== -1) return true;
        if (d.indexOf("--!>") !== -1) return true;
        if (d.charAt(0) === ">") return true;
        if (d.charAt(0) === "-" && d.charAt(1) === ">") return true;
        return false;
    }

    // A MutationObserver is the only place to catch every arrival path — sync,
    // drop, a third-party plugin, host-page code. It is honest to say this
    // narrows the window rather than closing it completely: the observer runs
    // as a microtask, so it beats anything that executes on a load or error
    // event (which is how srcdoc and onerror fire), but it cannot pre-empt
    // something that executes synchronously during insertion.
    //
    // Cost is kept near zero for the common case: text-node insertions from
    // typing are rejected on the first check and never walk a subtree.
    var DANGER_TAGS = /^(script|iframe|object|embed|base|meta|link|form)$/;

    function hasExecutableAttr(el) {
        if (!el.attributes) return false;
        for (var i = 0; i < el.attributes.length; i++) {
            var n = el.attributes[i].name.toLowerCase();
            if (n.indexOf("on") === 0 || n === "srcdoc") return true;
            if ((n === "href" || n === "src" || n === "data" || n === "action" || n === "xlink:href") &&
                /(javascript|vbscript)\s*:|data:\s*text\/html/i.test(el.attributes[i].value || "")) return true;
        }
        return false;
    }

    function looksDangerous(el) {
        if (DANGER_TAGS.test(el.localName || "")) return true;
        if (hasExecutableAttr(el)) return true;
        var kids = el.getElementsByTagName ? el.getElementsByTagName("*") : [];
        for (var i = 0; i < kids.length; i++) {
            if (DANGER_TAGS.test(kids[i].localName || "") || hasExecutableAttr(kids[i])) return true;
        }
        return false;
    }

    function guardLiveDom() {
        if (config.sanitizerGuardLiveDom === false) return;
        var ed = null;
        try { ed = editor.getEditable(); } catch (e) { return; }
        if (!ed || ed.__rteLiveGuard) return;
        ed.__rteLiveGuard = true;

        var mo = new MutationObserver(function (records) {
            var suspect = false;
            for (var i = 0; i < records.length && !suspect; i++) {
                var rec = records[i];
                if (rec.type === "attributes") {
                    var n = (rec.attributeName || "").toLowerCase();
                    if (n.indexOf("on") === 0 || n === "srcdoc" || hasExecutableAttr(rec.target)) suspect = true;
                    continue;
                }
                for (var a = 0; a < rec.addedNodes.length; a++) {
                    var node = rec.addedNodes[a];
                    // Comments are preserved now, so an injected comment whose data
                    // escapes on re-parse has to wake the sanitiser. This loop used
                    // to skip every non-element node, which was safe only while
                    // comments were being deleted unconditionally. The CRDT sync
                    // path is exactly how a node arrives here without passing the
                    // input filter -- that is the path that produced the stored XSS.
                    if (node.nodeType === 8) {
                        if (commentEscapes(node.data)) { suspect = true; break; }
                        continue;
                    }
                    if (node.nodeType !== 1) continue;      // typing inserts text: free
                    if (looksDangerous(node)) { suspect = true; break; }
                }
            }
            if (!suspect) return;
            try { sanitizeNode(ed, report); } catch (e) {}
        });
        mo.observe(ed, { childList: true, subtree: true, attributes: true });
        liveGuards.push(mo);
    }

    function bindPaste() {
        var ed = null;
        try { ed = editor.getEditable(); } catch (e) { return; }
        if (!ed || ed.__rteSanitizePaste) return;
        ed.__rteSanitizePaste = true;

        ed.addEventListener("paste", function (e) {
            var dt = e.clipboardData || window.clipboardData;
            if (!dt) return;
            var html = "";
            try { html = dt.getData("text/html") || ""; } catch (x) { return; }
            if (!html || !executesOnInsert(html)) return;      // normal paste: untouched

            // Dangerous: it must never reach the live DOM at all.
            e.preventDefault();
            e.stopImmediatePropagation();
            var clean = sanitizeHtml(html);
            try { editor.insertHTML(clean); }
            catch (x) { try { editor.insertText(dt.getData("text/plain") || ""); } catch (y) {} }
        }, true);

        // Defence in depth for anything that still lands another way (drop, a
        // path this plugin does not see). Two passes because a single
        // setTimeout(0) can run BEFORE the browser has finished inserting —
        // measured, and the reason the first version cleaned nothing.
        function sweep() {
            var run = function () { try { sanitizeNode(ed, report); } catch (e) {} };
            setTimeout(run, 0);
            setTimeout(run, 250);
        }
        ed.addEventListener("paste", sweep, false);
        ed.addEventListener("drop", sweep, true);
    }
}
