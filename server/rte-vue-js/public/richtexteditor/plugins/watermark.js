if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-07-28 Watermark. Draws DRAFT / CONFIDENTIAL / a customer name behind the
// content — the marking that tells a reader at a glance not to treat a document
// as final or not to circulate it.
//
// Design notes:
//   - PRESENTATIONAL. The watermark is an overlay, never content, and it is
//     stripped around every serialize. That is the whole point: a watermark
//     baked into the saved HTML would survive into a published page long after
//     the document stopped being a draft, and worse, "CONFIDENTIAL" written into
//     content is trivially deleted while a rendering-layer mark is not.
//   - It also does NOT print by default. Screen marking and print marking are
//     different decisions: config.watermarkPrint opts in.
//   - Rendered as an SVG data URI background rather than DOM text, so it cannot
//     be selected, cannot be caught by find-and-replace, and cannot land in a
//     copy-paste of the document body.
RTE_DefaultConfig.plugin_watermark = RTE_Plugin_Watermark;

if (typeof RTE_DefaultConfig.watermarkText === "undefined") RTE_DefaultConfig.watermarkText = "DRAFT";
if (typeof RTE_DefaultConfig.watermarkColor === "undefined") RTE_DefaultConfig.watermarkColor = "#94a3b8";
if (typeof RTE_DefaultConfig.watermarkOpacity === "undefined") RTE_DefaultConfig.watermarkOpacity = 0.18;
if (typeof RTE_DefaultConfig.watermarkAngle === "undefined") RTE_DefaultConfig.watermarkAngle = -30;
if (typeof RTE_DefaultConfig.watermarkFontSize === "undefined") RTE_DefaultConfig.watermarkFontSize = 48;
// "tile" repeats across the page; "single" draws one centred mark.
if (typeof RTE_DefaultConfig.watermarkMode === "undefined") RTE_DefaultConfig.watermarkMode = "tile";
// Include the watermark when printing / exporting to PDF via the print pipeline.
if (typeof RTE_DefaultConfig.watermarkPrint === "undefined") RTE_DefaultConfig.watermarkPrint = false;
// Optional image watermark (data URI or URL); overrides the text when set.
if (typeof RTE_DefaultConfig.watermarkImage === "undefined") RTE_DefaultConfig.watermarkImage = null;

function RTE_Plugin_Watermark() {
    var obj = this;
    var config, editor;
    var boundDoc = null;
    var active = false;
    var wrapped = false;

    obj.PluginName = "Watermark";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_watermark", function (state) {
            state.returnValue = true;
            obj.Toggle();
        });

        setup();
        try { editor.attachEvent("ready", setup); } catch (e) {}
        try { editor.attachEvent("aftersethtml", setup); } catch (e) {}
        setTimeout(setup, 0);

        editor.setWatermark = function (on) { active = !!on; apply(); return active; };
        editor.toggleWatermark = function () { active = !active; apply(); return active; };
        editor.isWatermark = function () { return active; };
        editor.setWatermarkOptions = function (o) {
            if (o && typeof o === "object") {
                var keys = ["watermarkText", "watermarkColor", "watermarkOpacity", "watermarkAngle",
                            "watermarkFontSize", "watermarkMode", "watermarkPrint", "watermarkImage"];
                var short = { text: 0, color: 1, opacity: 2, angle: 3, fontSize: 4, mode: 5, print: 6, image: 7 };
                for (var k in o) {
                    if (!o.hasOwnProperty(k)) continue;
                    if (short[k] !== undefined) config[keys[short[k]]] = o[k];
                    else if (keys.indexOf(k) >= 0) config[k] = o[k];
                }
            }
            apply();
            return obj.Options();
        };
        editor.getWatermarkOptions = function () { return obj.Options(); };
    };

    obj.Options = function () {
        return {
            text: config.watermarkText, color: config.watermarkColor,
            opacity: config.watermarkOpacity, angle: config.watermarkAngle,
            fontSize: config.watermarkFontSize, mode: config.watermarkMode,
            print: config.watermarkPrint, image: config.watermarkImage
        };
    };

    function setup() {
        var doc = getDoc();
        if (!doc) return;
        wrapSerializers();
        if (doc !== boundDoc) boundDoc = doc;
        if (active) apply();
    }

    function getDoc() { try { return editor.getDocument(); } catch (e) { return null; } }
    function getEditable() { try { return editor.getEditable(); } catch (e) { return null; } }

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    }

    // An SVG data URI, so the mark is a background image: unselectable,
    // uncopyable, and invisible to find-and-replace.
    function backgroundUri() {
        if (config.watermarkImage) return String(config.watermarkImage);
        var text = String(config.watermarkText == null ? "" : config.watermarkText);
        if (!text) return null;
        var size = parseInt(config.watermarkFontSize, 10) || 48;
        var angle = parseFloat(config.watermarkAngle);
        if (isNaN(angle)) angle = -30;
        // Tile big enough that rotated text does not clip at the edges.
        var w = Math.max(240, text.length * size * 0.72);
        var h = Math.max(160, size * 3.2);
        var svg =
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + Math.round(w) + '" height="' + Math.round(h) + '">' +
            '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" ' +
            'transform="rotate(' + angle + ' ' + Math.round(w / 2) + ' ' + Math.round(h / 2) + ')" ' +
            'font-family="Segoe UI, Arial, sans-serif" font-size="' + size + '" font-weight="700" ' +
            'fill="' + esc(config.watermarkColor || "#94a3b8") + '">' + esc(text) + '</text></svg>';
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    }

    function apply() {
        var editable = getEditable();
        var doc = getDoc();
        if (!editable || !doc) return;
        injectStyles(doc);

        if (!active) {
            editable.style.backgroundImage = "";
            editable.style.backgroundRepeat = "";
            editable.style.backgroundPosition = "";
            editable.removeAttribute("data-rte-watermark");
            return;
        }
        var uri = backgroundUri();
        if (!uri) return;
        var single = String(config.watermarkMode) === "single";
        editable.setAttribute("data-rte-watermark", "true");
        editable.style.backgroundImage = "url(\"" + uri + "\")";
        editable.style.backgroundRepeat = single ? "no-repeat" : "repeat";
        editable.style.backgroundPosition = single ? "center center" : "0 0";
        // Opacity has to live on the background, not the element, or the text
        // on top fades with it.
        var op = parseFloat(config.watermarkOpacity);
        editable.style.opacity = "";
        var st = doc.getElementById("rte-watermark-dynamic");
        if (!st) {
            st = doc.createElement("style");
            st.id = "rte-watermark-dynamic";
            (doc.head || doc.documentElement).appendChild(st);
        }
        st.textContent =
            "[data-rte-watermark]{background-blend-mode:multiply;}" +
            "[data-rte-watermark]::before{content:'';position:absolute;inset:0;pointer-events:none;" +
            "background-image:inherit;background-repeat:inherit;background-position:inherit;" +
            "opacity:" + (isNaN(op) ? 0.18 : op) + ";z-index:0;}" +
            (config.watermarkPrint
                ? ""
                : "@media print{[data-rte-watermark]{background-image:none !important;}" +
                  "[data-rte-watermark]::before{display:none !important;}}");
    }

    // ---- serialization safety -------------------------------------------

    // The watermark lives in inline styles on the editable, so a serializer that
    // reads them would carry DRAFT into the saved document. Park them.
    function stripFor() {
        var editable = getEditable();
        if (!editable || !active) return function () {};
        var bg = editable.style.backgroundImage;
        var rep = editable.style.backgroundRepeat;
        var pos = editable.style.backgroundPosition;
        var attr = editable.getAttribute("data-rte-watermark");
        editable.style.backgroundImage = "";
        editable.style.backgroundRepeat = "";
        editable.style.backgroundPosition = "";
        editable.removeAttribute("data-rte-watermark");
        return function restore() {
            editable.style.backgroundImage = bg;
            editable.style.backgroundRepeat = rep;
            editable.style.backgroundPosition = pos;
            if (attr) editable.setAttribute("data-rte-watermark", attr);
        };
    }

    function wrapSerializers() {
        if (wrapped) return;
        var names = ["getHTMLCode", "getJSON", "getHTMLContent", "getText"];
        var did = false;
        for (var i = 0; i < names.length; i++) {
            (function (name) {
                var orig = editor[name];
                if (typeof orig !== "function" || orig.__rteWmWrapped) return;
                var w = function () {
                    var restore = stripFor();
                    try { return orig.apply(editor, arguments); } finally { restore(); }
                };
                w.__rteWmWrapped = true;
                editor[name] = w;
                did = true;
            })(names[i]);
        }
        if (did) wrapped = true;
    }

    function injectStyles(doc) {
        if (!doc || doc.getElementById("rte-watermark-styles")) return;
        var st = doc.createElement("style");
        st.id = "rte-watermark-styles";
        st.appendChild(doc.createTextNode("[data-rte-watermark]{position:relative;}"));
        (doc.head || doc.getElementsByTagName("head")[0] || doc.documentElement).appendChild(st);
    }
}
