if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-08-30 Shadow DOM support — make the editor usable inside a shadow root.
//
// TinyMCE documents shadow-DOM support as a supported integration; we had none
// under any name. Design systems, micro-frontends and anything built as a custom
// element put their markup inside a shadow root, and that is where this editor
// was quietly broken.
//
// Measured before writing a line of it, on a real instance in Chromium:
//
//   | mounted in            | toolbar height | font              |
//   |-----------------------|----------------|-------------------|
//   | the page (light DOM)  | 82 px          | system-ui         |
//   | a shadow root         | 45,468 px      | Times New Roman   |
//
// So it is not "mostly fine". The editor CONSTRUCTS, the iframe appears, and
// setHTMLCode/getHTMLCode round-trip correctly — which is exactly why this was
// never noticed — but a style boundary is a wall: `<link rel=stylesheet>` in the
// document head does not cross into a shadow root, so every rule in
// rte_theme_default.css misses, and the toolbar renders as a 45,000-pixel column
// of unstyled buttons.
//
// The fix is to put the editor's own stylesheets on the inside of the wall too.
//
// Design notes:
//   - <link> clones, not fetch + CSSStyleSheet. Constructing a stylesheet means
//     fetching the CSS with JS, which needs CORS on a CDN-hosted theme and fails
//     closed — a cloned <link> hits the HTTP cache, needs no CORS, and works on
//     every browser that has shadow DOM at all. adoptedStyleSheets is used only
//     for sheets already adopted by the document, which have no URL to clone.
//   - Only the EDITOR's stylesheets are copied. Cloning the whole head into a
//     shadow root would undo the encapsulation the integrator chose it for. A
//     sheet counts as ours by origin — served from the folder rte.js was loaded
//     from — plus an `rte-`/`__rte` element id, the same origin-based test that
//     importstyles.js had to arrive at after prefix matching failed.
//   - A MutationObserver keeps watching the head. Plugins inject their styles
//     lazily, when their panel first opens — the accessibility checker and the AI
//     toolkit both do — so a one-shot copy at init produces a styled toolbar and
//     an unstyled dialog half an hour later, which is a worse bug to diagnose
//     than a wholly unstyled editor.
//   - Nothing is copied when the editor is NOT in a shadow root, and the
//     observer is not even created. This plugin must cost nothing for the 99%.
RTE_DefaultConfig.plugin_shadowdom = RTE_Plugin_ShadowDom;

// Copy the editor's stylesheets into the shadow root that contains it.
if (typeof RTE_DefaultConfig.shadowStyleAdoption === "undefined") RTE_DefaultConfig.shadowStyleAdoption = true;
// Extra stylesheet URLs to copy in as well (an integrator's own skin overrides).
if (typeof RTE_DefaultConfig.shadowStyleSources === "undefined") RTE_DefaultConfig.shadowStyleSources = null;

function RTE_Plugin_ShadowDom() {
    var obj = this;
    var config, editor;
    var root = null;
    var observer = null;
    var copied = null;

    obj.PluginName = "ShadowDom";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        // Public API — useful even outside a shadow root, for a host page that
        // wants to style a second root (a dialog portal, a preview pane).
        editor.getShadowRoot = function () { return findRoot(); };
        editor.isInShadowDom = function () { return !!findRoot(); };
        editor.adoptEditorStyles = function (target) { return adopt(target || findRoot(), true); };
        editor.getAdoptedStyleCount = function () { return copied ? copied.size : 0; };

        if (config && config.shadowStyleAdoption === false) return;

        // The chrome is built asynchronously; the container may not exist yet.
        whenReady(function () {
            root = findRoot();
            if (!root) return;
            copied = new (window.Set || Array)();
            adopt(root, false);
            watchHead(root);
        });
    };

    obj.Destroy = function () {
        if (observer) { try { observer.disconnect(); } catch (e) {} observer = null; }
    };

    // ------------------------------------------------------------------ lookup

    // The editor's container is the element the integrator passed in; from the
    // editing iframe it is the nearest ancestor carrying the editor's own class.
    function container() {
        try {
            var editable = editor.getEditable();
            var frame = editable && editable.ownerDocument && editable.ownerDocument.defaultView
                ? editable.ownerDocument.defaultView.frameElement : null;
            if (!frame) return null;
            var node = frame;
            while (node) {
                if (node.classList && node.classList.contains("richtexteditor")) return node;
                node = node.parentNode || node.host;
            }
            return frame;
        }
        catch (e) { return null; }
    }

    function findRoot() {
        var el = container();
        if (!el || typeof el.getRootNode !== "function") return null;
        var r = el.getRootNode();
        // A DocumentFragment with a `host` is a shadow root; a plain document is not.
        return (r && r.host && r !== document) ? r : null;
    }

    function whenReady(callback) {
        if (container()) { callback(); return; }
        var tries = 0;
        var timer = window.setInterval(function () {
            if (container() || ++tries > 100) { window.clearInterval(timer); callback(); }
        }, 50);
    }

    // ------------------------------------------------------------------ adopt

    // Where rte.js itself was served from. Everything under that folder is ours.
    function assetBase() {
        try {
            var scripts = document.getElementsByTagName("script");
            for (var i = 0; i < scripts.length; i++) {
                var src = scripts[i].src || "";
                if (/(^|\/)rte(\.min)?\.js(\?|$)/.test(src)) return src.replace(/[^\/]*$/, "");
            }
        }
        catch (e) {}
        return null;
    }

    function isOurs(node) {
        var id = String(node.id || "");
        if (/^rte[-_]|^__rte/.test(id)) return true;
        var href = node.href || "";
        if (!href) {
            // An inline <style> with no id and no href is what bundlers (Vite,
            // webpack style-loader) inject for an imported theme. Recognise it by
            // its content, or a shadow-root editor is unstyled (39,726 px toolbar,
            // Times New Roman) exactly as before this plugin existed. 2026-09-02.
            if (node.tagName === "STYLE") {
                var css = node.textContent || "";
                return /[.]richtexteditor|rte-toolbar|rte-editor|rte-dialog|[.]rte-a11y/.test(css);
            }
            return false;
        }
        var base = assetBase();
        if (base && href.indexOf(base) === 0) return true;
        // Fall back to the file names this product actually ships, so an
        // integrator who renamed or re-hosted the folder still gets styled
        // chrome rather than a silent 45,000-pixel toolbar.
        return /rte_theme|rte_mobile|richtexteditor_content|richtexteditor_preview|aitoolkit/.test(href);
    }

    function extraSources() {
        var list = (config && config.shadowStyleSources) || null;
        if (!list) return [];
        return typeof list === "string" ? [list] : list;
    }

    function key(node) {
        return (node.href || "") + "|" + (node.id || "") + "|" + (node.textContent || "").length;
    }

    function has(k) {
        return copied && (copied.has ? copied.has(k) : copied.indexOf(k) >= 0);
    }

    function remember(k) {
        if (!copied) return;
        if (copied.add) copied.add(k); else copied.push(k);
    }

    function adopt(target, force) {
        if (!target) return 0;
        if (!copied) copied = new (window.Set || Array)();
        var added = 0;
        var nodes = document.querySelectorAll("link[rel~=stylesheet],style");

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (!isOurs(node)) continue;
            var k = key(node);
            if (!force && has(k)) continue;
            if (has(k)) continue;
            target.appendChild(cloneSheet(node, target));
            remember(k);
            added++;
        }

        var extras = extraSources();
        for (var e = 0; e < extras.length; e++) {
            var ek = "extra|" + extras[e];
            if (has(ek)) continue;
            var link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = extras[e];
            link.setAttribute("data-rte-adopted", "1");
            target.appendChild(link);
            remember(ek);
            added++;
        }

        // Sheets the page adopted programmatically have no URL to clone, so they
        // are re-adopted by reference where the browser supports it.
        try {
            if (target.adoptedStyleSheets && document.adoptedStyleSheets && document.adoptedStyleSheets.length) {
                var merged = target.adoptedStyleSheets.slice();
                for (var a = 0; a < document.adoptedStyleSheets.length; a++) {
                    if (merged.indexOf(document.adoptedStyleSheets[a]) < 0) merged.push(document.adoptedStyleSheets[a]);
                }
                target.adoptedStyleSheets = merged;
            }
        }
        catch (e2) {}

        return added;
    }

    function cloneSheet(node, target) {
        if (node.tagName === "LINK") {
            var link = document.createElement("link");
            link.rel = "stylesheet";
            // Resolved (absolute) href — a relative one would resolve against the
            // document anyway, but being explicit survives a <base> element.
            link.href = node.href;
            if (node.media) link.media = node.media;
            link.setAttribute("data-rte-adopted", "1");
            return link;
        }
        var style = document.createElement("style");
        style.textContent = node.textContent;
        if (node.id) style.setAttribute("data-rte-source-id", node.id);
        style.setAttribute("data-rte-adopted", "1");
        return style;
    }

    // A plugin's <style> arrives when its panel first opens, long after init.
    function watchHead(target) {
        if (!window.MutationObserver) return;
        observer = new MutationObserver(function (records) {
            var interesting = false;
            for (var i = 0; i < records.length && !interesting; i++) {
                var added = records[i].addedNodes || [];
                for (var j = 0; j < added.length; j++) {
                    var n = added[j];
                    if (n.nodeType !== 1) continue;
                    if ((n.tagName === "STYLE" || n.tagName === "LINK") && isOurs(n)) { interesting = true; break; }
                }
            }
            if (interesting) adopt(target, false);
        });
        observer.observe(document.head || document.documentElement, { childList: true, subtree: true });
    }
}
