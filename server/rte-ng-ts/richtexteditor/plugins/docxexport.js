if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-08-02 Real .docx export, in the browser, with no library and no server.
//
// The asymmetry this closes: `documentimport.js` reads a genuine OOXML package
// client-side, but the only export was `wordexport.js`, which wraps the HTML in
// an MSO-flavoured container and names it .doc. Word opens that, but it is not
// a .docx — it round-trips badly, some corporate policies block HTML-with-a-doc
// extension outright, and Word nags on save. A real .docx was only available
// through a server route that ships with the marketing site, not with the
// product.
//
// So: import real OOXML, export real OOXML, same page, no upload.
//
// This deliberately emits exactly what documentimport.js reads back — same
// hyperlink relationships, same numbering ids, same footnote/comment parts,
// same revision conventions — so HTML -> .docx -> HTML is a genuine round trip
// rather than two features that happen to share a file extension.
//
// API:
//   editor.getDocxBlob(options)            -> Promise<Blob>
//   editor.exportToDocx(filename, options) -> Promise<string>  (downloads)
// Command: exec_command "exportdocx".
// Config:
//   config.docxExport = false                 // disable
//   config.docxExportFileName = "report"
//   config.docxExportTitle / docxExportAuthor
RTE_DefaultConfig.plugin_docxexport = RTE_Plugin_DocxExport;
if (typeof RTE_DefaultConfig.docxExport === "undefined") RTE_DefaultConfig.docxExport = true;

function RTE_Plugin_DocxExport() {
    var obj = this;
    var config, editor;

    obj.PluginName = "DocxExport";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.docxExport === false) return;

        editor.getDocxBlob = function (options) { return buildDocx(options || {}); };
        editor.exportToDocx = function (filename, options) {
            return buildDocx(options || {}).then(function (blob) {
                var base = sanitizeName(filename) || sanitizeName(config.docxExportFileName) || defaultBase();
                return download(blob, base + ".docx");
            });
        };

        editor.attachEvent("exec_command_exportdocx", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            try {
                editor.exportToDocx().catch(function (e) { if (window.console) console.error("docxexport:", e); });
            } catch (e) { if (window.console) console.error("docxexport:", e); }
        });
        // The slash entry lives in slashcommand.js, gated on the API being
        // present: plugins initialise in bundle order and "docxexport" sorts
        // before "slashcommand", so registering from here would silently do
        // nothing.
    };

    // ------------------------------------------------------------- XML basics
    var NS = {
        w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
        r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        m: "http://schemas.openxmlformats.org/officeDocument/2006/math"
    };
    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            // XML 1.0 permits only tab, newline and carriage return below 0x20.
            // ONE stray control character makes the whole package unreadable —
            // Word refuses to open the file rather than skipping the character.
            // Written as \u escapes on purpose: a literal control byte in the
            // source is invisible, survives copy-paste, and turns this file
            // binary to every text tool that touches it.
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
    }

    // --------------------------------------------------------------- ZIP part
    //
    // Deflate through CompressionStream — the mirror image of the
    // DecompressionStream the importer uses, so the two halves rest on the same
    // platform capability. Entries fall back to STORED when compression is
    // unavailable, which is a valid ZIP and still opens in Word.
    var CRC_TABLE = (function () {
        var t = [], c, n, k;
        for (n = 0; n < 256; n++) {
            c = n;
            for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            t[n] = c >>> 0;
        }
        return t;
    })();
    function crc32(bytes) {
        var crc = 0xFFFFFFFF;
        for (var i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }
    function utf8Bytes(str) { return new TextEncoder().encode(str); }

    function deflateRaw(bytes) {
        if (typeof CompressionStream === "undefined") return Promise.resolve(null);
        try {
            var cs = new CompressionStream("deflate-raw");
            var writer = cs.writable.getWriter();
            writer.write(bytes);
            writer.close();
            return new Response(cs.readable).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
        } catch (e) { return Promise.resolve(null); }
    }

    function zip(entries) {
        // entries: [{ name, bytes }]
        var jobs = entries.map(function (e) {
            return deflateRaw(e.bytes).then(function (comp) {
                var useDeflate = comp && comp.length < e.bytes.length;
                return {
                    name: e.name, raw: e.bytes,
                    data: useDeflate ? comp : e.bytes,
                    method: useDeflate ? 8 : 0
                };
            });
        });
        return Promise.all(jobs).then(function (items) {
            var locals = [], central = [], offset = 0;
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                var nameBytes = utf8Bytes(it.name);
                var crc = crc32(it.raw);
                var lh = new DataView(new ArrayBuffer(30));
                lh.setUint32(0, 0x04034b50, true);
                lh.setUint16(4, 20, true);
                // Bit 11 marks the name as UTF-8. Without it a non-ASCII entry
                // name is read in the archive's legacy code page.
                lh.setUint16(6, 0x0800, true);
                lh.setUint16(8, it.method, true);
                lh.setUint32(14, crc, true);
                lh.setUint32(18, it.data.length, true);
                lh.setUint32(22, it.raw.length, true);
                lh.setUint16(26, nameBytes.length, true);
                var ch = new DataView(new ArrayBuffer(46));
                ch.setUint32(0, 0x02014b50, true);
                ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
                ch.setUint16(8, 0x0800, true);
                ch.setUint16(10, it.method, true);
                ch.setUint32(16, crc, true);
                ch.setUint32(20, it.data.length, true);
                ch.setUint32(24, it.raw.length, true);
                ch.setUint16(28, nameBytes.length, true);
                ch.setUint32(42, offset, true);
                locals.push(new Uint8Array(lh.buffer), nameBytes, it.data);
                central.push(new Uint8Array(ch.buffer), nameBytes);
                offset += 30 + nameBytes.length + it.data.length;
            }
            var centralSize = central.reduce(function (n, b) { return n + b.length; }, 0);
            var eocd = new DataView(new ArrayBuffer(22));
            eocd.setUint32(0, 0x06054b50, true);
            eocd.setUint16(8, items.length, true);
            eocd.setUint16(10, items.length, true);
            eocd.setUint32(12, centralSize, true);
            eocd.setUint32(16, offset, true);
            return new Blob(locals.concat(central, [new Uint8Array(eocd.buffer)]),
                { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        });
    }

    // ------------------------------------------------------------- conversion
    function Builder() {
        this.rels = [];            // { id, type, target, mode }
        this.media = [];           // { name, bytes }
        this.footnotes = [];       // { id, text }
        this.endnotes = [];
        this.comments = [];        // { id, author, initials, text }
        this.numbering = {};       // numId -> "bullet" | "decimal"
        this.relSeq = 0;
        this.noteSeq = 1;          // 0 and -1 are reserved for the separators
        this.commentSeq = 0;
        this.numSeq = 0;
    }
    Builder.prototype.rel = function (type, target, mode) {
        var id = "rId" + (++this.relSeq);
        this.rels.push({ id: id, type: type, target: target, mode: mode });
        return id;
    };

    var HEADING = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 };

    function styleFrom(node, inherited) {
        var s = {
            bold: inherited.bold, italic: inherited.italic, underline: inherited.underline,
            strike: inherited.strike, sizeHalfPoints: inherited.sizeHalfPoints,
            color: inherited.color, highlight: inherited.highlight, vertAlign: inherited.vertAlign,
            mono: inherited.mono, font: inherited.font,
            // 2026-10-15 small caps, letter spacing and the phrase's language were not exported. tools/docx/run-props.mjs
            smallCaps: inherited.smallCaps, spacingTw: inherited.spacingTw, lang: inherited.lang
        };
        if (node.getAttribute && node.getAttribute("lang")) s.lang = String(node.getAttribute("lang")).replace(/[^A-Za-z0-9-]/g, "");
        var tag = node.tagName ? node.tagName.toLowerCase() : "";
        if (tag === "b" || tag === "strong") s.bold = true;
        if (tag === "i" || tag === "em") s.italic = true;
        if (tag === "u") s.underline = true;
        if (tag === "s" || tag === "strike") s.strike = true;
        if (tag === "sup") s.vertAlign = "superscript";
        if (tag === "sub") s.vertAlign = "subscript";
        if (tag === "code" || tag === "kbd" || tag === "samp" || tag === "pre") s.mono = true;
        // <mark> carries no inline style, so the CSS branch below never sees it
        // and highlighted text was dropped entirely on export. Word's own
        // default highlight is yellow.
        if (tag === "mark") s.highlight = s.highlight || "FFFF00";

        var css = node.style;
        if (css) {
            if (/bold|^[6-9]00$/.test(css.fontWeight || "")) s.bold = true;
            if (css.fontStyle === "italic") s.italic = true;
            var deco = css.textDecorationLine || css.textDecoration || "";
            if (deco.indexOf("underline") >= 0) s.underline = true;
            if (deco.indexOf("line-through") >= 0) s.strike = true;
            if (css.color) { var c = hexColor(css.color); if (c) s.color = c; }
            if (css.backgroundColor) { var h = hexColor(css.backgroundColor); if (h) s.highlight = h; }
            // Font family was read by nothing, so an exported document lost every
            // typeface choice. Word wants ONE family name, not a CSS stack.
            if (css.fontFamily) {
                var fam = String(css.fontFamily).split(",")[0].replace(/^\s*['"]?|['"]?\s*$/g, "");
                if (fam) s.font = fam;
            }
            if (/small-caps/.test(css.fontVariant || "") || /small-caps/.test(css.fontVariantCaps || "")) s.smallCaps = true;
            if (css.letterSpacing && css.letterSpacing !== "normal") {
                var lsm = /^\s*(-?[\d.]+)\s*(px|pt|em)?\s*$/.exec(css.letterSpacing);
                if (lsm) { var lsPx = parseFloat(lsm[1]) * (lsm[2] === "pt" ? 4 / 3 : lsm[2] === "em" ? 16 : 1); s.spacingTw = Math.round(lsPx * 15); }
            }
            if (css.fontSize) {
                var pt = cssToPoints(css.fontSize);
                // w:sz is in HALF-POINTS. Writing points here makes every
                // exported document render at half its intended size.
                if (pt) s.sizeHalfPoints = Math.round(pt * 2);
            }
        }
        return s;
    }
    function hexColor(v) {
        var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(v).replace(/\s/g, ""));
        if (m) {
            var hex = m[1];
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            return hex.toUpperCase();
        }
        var rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(String(v));
        if (!rgb) return null;
        function two(n) { var s = Number(n).toString(16).toUpperCase(); return s.length < 2 ? "0" + s : s; }
        return two(rgb[1]) + two(rgb[2]) + two(rgb[3]);
    }
    function cssToPoints(v) {
        var m = /^\s*([\d.]+)\s*(px|pt|em|rem|%)?\s*$/.exec(String(v));
        if (!m) return null;
        var n = parseFloat(m[1]);
        if (!isFinite(n)) return null;
        switch (m[2]) {
            case "pt": return n;
            case "em": case "rem": return n * 11;
            case "%": return n / 100 * 11;
            default: return n * 0.75;
        }
    }

    function runProps(s) {
        var p = "";
        // One rFonts element only: mono wins, because <code> inside a styled span
        // should still read as code.
        var fontName = s.mono ? "Consolas" : (s.font || "");
        if (fontName) p += '<w:rFonts w:ascii="' + esc(fontName) + '" w:hAnsi="' + esc(fontName) + '"/>';
        if (s.bold) p += "<w:b/>";
        if (s.italic) p += "<w:i/>";
        if (s.smallCaps) p += "<w:smallCaps/>";
        if (s.underline) p += '<w:u w:val="single"/>';
        if (s.strike) p += "<w:strike/>";
        if (s.color) p += '<w:color w:val="' + s.color + '"/>';
        if (s.spacingTw) p += '<w:spacing w:val="' + s.spacingTw + '"/>';
        if (s.highlight) p += '<w:shd w:val="clear" w:color="auto" w:fill="' + s.highlight + '"/>';
        if (s.vertAlign) p += '<w:vertAlign w:val="' + s.vertAlign + '"/>';
        if (s.sizeHalfPoints) p += '<w:sz w:val="' + s.sizeHalfPoints + '"/><w:szCs w:val="' + s.sizeHalfPoints + '"/>';
        if (s.lang) p += '<w:lang w:val="' + s.lang + '"/>';
        return p ? "<w:rPr>" + p + "</w:rPr>" : "";
    }

    // A run's text must preserve its spaces, or Word collapses the leading and
    // trailing ones and words run together across formatting boundaries.
    function textRun(text, s, deleted) {
        if (!text) return "";
        var parts = String(text).split("\n");
        var out = "";
        for (var i = 0; i < parts.length; i++) {
            if (i) out += "<w:r>" + runProps(s) + "<w:br/></w:r>";
            if (!parts[i]) continue;
            var tag = deleted ? "w:delText" : "w:t";
            out += "<w:r>" + runProps(s) + "<" + tag + ' xml:space="preserve">' + esc(parts[i]) + "</" + tag + ">";
            out += "</w:r>";
        }
        return out;
    }

    function stamp(node) {
        var author = node.getAttribute("data-author") || node.getAttribute("data-comment-author") || "RichTextEditor";
        var date = node.getAttribute("data-date") || new Date().toISOString().replace(/\.\d+Z$/, "Z");
        return ' w:author="' + esc(author) + '" w:date="' + esc(date) + '"';
    }

    // Inline content of one block-level element.
    function inlineXml(node, style, b, revSeq) {
        var out = "";
        for (var i = 0; i < node.childNodes.length; i++) {
            var c = node.childNodes[i];
            if (c.nodeType === 3) {
                var t = (c.nodeValue || "").replace(/[\r\n\t]+/g, " ");
                if (t) out += textRun(t, style, false);
                continue;
            }
            if (c.nodeType !== 1) continue;
            var tag = c.tagName.toLowerCase();
            if (tag === "script" || tag === "style") continue;
            if (tag === "br") { out += "<w:r>" + runProps(style) + "<w:br/></w:r>"; continue; }

            // Equations: the editor stores LaTeX in data-tex. Emitting the span's
            // visible text would put "\frac{a}{b}" into the document as prose.
            if (c.getAttribute && c.getAttribute("data-tex")) {
                out += ommlFromTex(c.getAttribute("data-tex"));
                continue;
            }
            // Footnote / endnote markers written by the importer and the
            // footnotes plugin.
            if ((tag === "sup" || tag === "span") && c.getAttribute("data-footnote")) {
                out += noteRun(b, "footnote", c.getAttribute("data-footnote"));
                continue;
            }
            if ((tag === "sup" || tag === "span") && c.getAttribute("data-endnote")) {
                out += noteRun(b, "endnote", c.getAttribute("data-endnote"));
                continue;
            }
            if (c.classList && c.classList.contains("rte-fn-ref")) {
                var id = c.getAttribute("data-fn-id");
                var body = id ? noteBodyFor(node.ownerDocument, id) : "";
                out += noteRun(b, "footnote", body || (c.textContent || ""));
                continue;
            }
            if (tag === "img") { out += imageXml(c, b); continue; }

            var next = styleFrom(c, style);

            if (tag === "a" && c.getAttribute("href")) {
                var href = c.getAttribute("href");
                var inner = inlineXml(c, next, b, revSeq);
                if (href.charAt(0) === "#") {
                    out += '<w:hyperlink w:anchor="' + esc(href.slice(1)) + '">' + inner + "</w:hyperlink>";
                } else {
                    // The address lives in the rels part; a hyperlink carries
                    // only an r:id. This is the same indirection the importer
                    // resolves on the way in.
                    var rid = b.rel("hyperlink", href, "External");
                    out += '<w:hyperlink r:id="' + rid + '">' + inner + "</w:hyperlink>";
                }
                continue;
            }
            if (tag === "ins" || tag === "del") {
                var isDel = tag === "del";
                var body2 = "";
                // Deleted text goes in w:delText, never w:t.
                (function collect(n, st) {
                    for (var j = 0; j < n.childNodes.length; j++) {
                        var k = n.childNodes[j];
                        if (k.nodeType === 3) { body2 += textRun((k.nodeValue || "").replace(/[\r\n\t]+/g, " "), st, isDel); continue; }
                        if (k.nodeType === 1) collect(k, styleFrom(k, st));
                    }
                })(c, next);
                out += "<w:" + tag + ' w:id="' + (revSeq.n++) + '"' + stamp(c) + ">" + body2 + "</w:" + tag + ">";
                continue;
            }
            if (c.getAttribute && c.getAttribute("data-comment")) {
                var cid = b.commentSeq++;
                b.comments.push({
                    id: cid,
                    author: c.getAttribute("data-comment-author") || "RichTextEditor user",
                    initials: c.getAttribute("data-comment-initials") || "RTE",
                    text: c.getAttribute("data-comment")
                });
                out += '<w:commentRangeStart w:id="' + cid + '"/>' +
                    inlineXml(c, next, b, revSeq) +
                    '<w:commentRangeEnd w:id="' + cid + '"/>' +
                    '<w:r><w:commentReference w:id="' + cid + '"/></w:r>';
                continue;
            }
            out += inlineXml(c, next, b, revSeq);
        }
        return out;
    }

    function noteBodyFor(doc, id) {
        try {
            var el = doc.querySelector('.rte-fn-note[data-fn-id="' + id + '"]');
            if (!el) return "";
            // 2026-10-15 without the "back to reference" arrow link: it was written into the Word footnote, and every
            // round trip added another arrow to the note. tools/docx/footnote-text.mjs
            var copy = el.cloneNode(true), backs = copy.querySelectorAll(".rte-fn-back");
            for (var i = 0; i < backs.length; i++) backs[i].parentNode.removeChild(backs[i]);
            return (copy.textContent || "").replace(/\s+/g, " ").trim();
        } catch (e) { return ""; }
    }
    function noteRun(b, kind, text) {
        var id = b.noteSeq++;
        (kind === "endnote" ? b.endnotes : b.footnotes).push({ id: id, text: text || "" });
        return '<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:' + kind + 'Reference w:id="' + id + '"/></w:r>';
    }

    function imageXml(img, b) {
        var data = encodeImage(img);
        if (!data) return "";
        var name = "image" + (b.media.length + 1) + ".png";
        b.media.push({ name: name, bytes: data.bytes });
        var rid = b.rel("image", "media/" + name);
        // EMU: 914400 per inch, and a CSS pixel is 1/96 inch.
        // 2026-10-15 the size on the page is the image's width / height (attribute, or a px style), not its natural
        // pixels: a picture resized in the editor came back full size. One given: the other keeps the ratio.
        // tools/docx/image-alt-size.mjs
        var dw = cssPx(img.getAttribute("width")) || cssPx(img.style && img.style.width), dh = cssPx(img.getAttribute("height")) || cssPx(img.style && img.style.height);
        if (dw && !dh) dh = dw * data.height / data.width;
        if (dh && !dw) dw = dh * data.width / data.height;
        var cx = Math.round((dw || data.width) * 914400 / 96);
        var cy = Math.round((dh || data.height) * 914400 / 96);
        var docPrId = b.media.length;
        return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" ' +
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
            '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
            '<wp:docPr id="' + docPrId + '" name="Picture ' + docPrId + '" descr="' + esc(img.getAttribute("alt") || "") + '"/>' +
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
            '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
            '<pic:nvPicPr><pic:cNvPr id="' + docPrId + '" name="Picture ' + docPrId + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
            '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
            '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
            "</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>";
    }

    // a plain number or a px length; a percentage or em cannot be turned into a page size here
    function cssPx(v) { var r = /^\s*([\d.]+)\s*(px)?\s*$/.exec(v == null ? "" : String(v)); return r ? parseFloat(r[1]) : 0; }

    function encodeImage(img) {
        try {
            var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
            if (!w || !h) return null;
            var scale = Math.min(1, 1600 / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale)), chh = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement("canvas");
            canvas.width = cw; canvas.height = chh;
            canvas.getContext("2d").drawImage(img, 0, 0, cw, chh);
            var uri = canvas.toDataURL("image/png");
            var comma = uri.indexOf(",");
            if (comma < 0) return null;
            var bin = atob(uri.slice(comma + 1));
            var bytes = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return { bytes: bytes, width: cw, height: chh };
        } catch (e) {
            // Cross-origin images taint the canvas and cannot be read. Dropping
            // one decorative image beats failing the whole export.
            return null;
        }
    }

    // --------------------------------------------------------------- OMML out
    //
    // A compact LaTeX -> OMML writer, matching the reader in documentimport.js
    // so equations survive the round trip instead of arriving as their source.
    var TEX_GLYPH = {
        alpha: "\u03b1", beta: "\u03b2", gamma: "\u03b3", delta: "\u03b4", epsilon: "\u03b5", zeta: "\u03b6", eta: "\u03b7",
        theta: "\u03b8", iota: "\u03b9", kappa: "\u03ba", lambda: "\u03bb", mu: "\u03bc", nu: "\u03bd", xi: "\u03be", pi: "\u03c0",
        rho: "\u03c1", sigma: "\u03c3", tau: "\u03c4", upsilon: "\u03c5", phi: "\u03c6", varphi: "\u03c6", chi: "\u03c7",
        psi: "\u03c8", omega: "\u03c9", Gamma: "\u0393", Delta: "\u0394", Theta: "\u0398", Lambda: "\u039b", Xi: "\u039e",
        Pi: "\u03a0", Sigma: "\u03a3", Phi: "\u03a6", Psi: "\u03a8", Omega: "\u03a9",
        pm: "\xb1", mp: "\u2213", times: "\xd7", div: "\xf7", cdot: "\u22c5", neq: "\u2260", leq: "\u2264", geq: "\u2265",
        approx: "\u2248", equiv: "\u2261", propto: "\u221d", infty: "\u221e", partial: "\u2202", nabla: "\u2207",
        to: "\u2192", rightarrow: "\u2192", leftarrow: "\u2190", Rightarrow: "\u21d2", Leftrightarrow: "\u21d4",
        "in": "\u2208", notin: "\u2209", subset: "\u2282", subseteq: "\u2286", cup: "\u222a", cap: "\u2229",
        emptyset: "\u2205", forall: "\u2200", exists: "\u2203", neg: "\xac", land: "\u2227", lor: "\u2228",
        dots: "\u2026", ldots: "\u2026", cdots: "\u22ef", langle: "\u27e8", rangle: "\u27e9",
        lfloor: "\u230a", rfloor: "\u230b", lceil: "\u2308", rceil: "\u2309", quad: " ", ",": " ", ";": " "
    };
    var TEX_FUNCS = /^(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|log|ln|lg|exp|det|dim|gcd|arg|max|min|sup|inf)$/;

    function ommlFromTex(tex) {
        var src = String(tex || "").trim();
        if (!src) return "";
        var i = 0;
        function mrun(t) { return t ? "<m:r><m:t>" + esc(t) + "</m:t></m:r>" : ""; }
        function group() {
            skipWs();
            if (src.charAt(i) === "{") { i++; return until("}"); }
            return one();
        }
        function skipWs() { while (i < src.length && /\s/.test(src.charAt(i))) i++; }
        function one() {
            skipWs();
            if (src.charAt(i) === "\\") return command();
            var ch = src.charAt(i++);
            return mrun(ch);
        }
        function until(close) {
            var out = "", depth = 0;
            while (i < src.length) {
                var ch = src.charAt(i);
                if (ch === "{") depth++;
                if (ch === close && depth === 0) { i++; break; }
                if (ch === close) depth--;
                out += token();
            }
            return out;
        }
        function command() {
            i++;  // backslash
            var m = /^[A-Za-z]+/.exec(src.slice(i));
            var name = m ? m[0] : src.charAt(i);
            i += name.length;
            switch (name) {
                case "frac": case "dfrac": case "tfrac":
                    return "<m:f><m:fPr/><m:num>" + group() + "</m:num><m:den>" + group() + "</m:den></m:f>";
                case "sqrt": {
                    skipWs();
                    var deg = "";
                    if (src.charAt(i) === "[") { i++; deg = until("]"); }
                    return "<m:rad><m:radPr><m:degHide m:val=\"" + (deg ? "0" : "1") + "\"/></m:radPr>" +
                        "<m:deg>" + deg + "</m:deg><m:e>" + group() + "</m:e></m:rad>";
                }
                case "sum": case "prod": case "int": case "oint": case "bigcup": case "bigcap": {
                    var chr = { sum: "\u2211", prod: "\u220f", "int": "\u222b", oint: "\u222e", bigcup: "\u22c3", bigcap: "\u22c2" }[name];
                    var sub = "", sup = "";
                    for (var g = 0; g < 2; g++) {
                        skipWs();
                        if (src.charAt(i) === "_") { i++; sub = group(); }
                        else if (src.charAt(i) === "^") { i++; sup = group(); }
                        else break;
                    }
                    return '<m:nary><m:naryPr><m:chr m:val="' + chr + '"/>' +
                        '<m:subHide m:val="' + (sub ? "0" : "1") + '"/><m:supHide m:val="' + (sup ? "0" : "1") + '"/></m:naryPr>' +
                        "<m:sub>" + sub + "</m:sub><m:sup>" + sup + "</m:sup><m:e>" + rest() + "</m:e></m:nary>";
                }
                case "left": {
                    var open = fence();
                    var inner = "", depth = 0;
                    while (i < src.length) {
                        if (src.slice(i, i + 5) === "\\left") depth++;
                        if (src.slice(i, i + 6) === "\\right") {
                            if (depth === 0) { i += 6; var close = fence(); return delim(open, close, inner); }
                            depth--;
                        }
                        inner += token();
                    }
                    return delim(open, ")", inner);
                }
                case "right": fence(); return "";
                case "lim": {
                    skipWs();
                    var lim = "";
                    if (src.charAt(i) === "_") { i++; lim = group(); }
                    return "<m:limLow><m:e>" + mrun("lim") + "</m:e><m:lim>" + lim + "</m:lim></m:limLow>";
                }
                case "operatorname":
                    return "<m:func><m:funcPr/><m:fName>" + group() + "</m:fName><m:e>" + group() + "</m:e></m:func>";
                case "hat": case "vec": case "tilde": case "bar": case "overline": case "dot": case "ddot": {
                    var mark = { hat: "\u0302", vec: "\u20d7", tilde: "\u0303", dot: "\u0307", ddot: "\u0308" }[name];
                    if (name === "bar" || name === "overline") return "<m:bar><m:barPr><m:pos m:val=\"top\"/></m:barPr><m:e>" + group() + "</m:e></m:bar>";
                    return '<m:acc><m:accPr><m:chr m:val="' + mark + '"/></m:accPr><m:e>' + group() + "</m:e></m:acc>";
                }
                case "underline":
                    return "<m:bar><m:barPr><m:pos m:val=\"bot\"/></m:barPr><m:e>" + group() + "</m:e></m:bar>";
                case "boxed":
                    return "<m:borderBox><m:e>" + group() + "</m:e></m:borderBox>";
                case "text": case "mathrm": case "mathbf": case "mathit":
                    return group();
                case "\\":
                    return mrun(" ");
                default:
                    if (TEX_FUNCS.test(name)) {
                        return "<m:func><m:funcPr/><m:fName>" + mrun(name) + "</m:fName><m:e>" + group() + "</m:e></m:func>";
                    }
                    if (TEX_GLYPH[name] !== undefined) return mrun(TEX_GLYPH[name]);
                    return mrun(name);
            }
        }
        function fence() {
            skipWs();
            if (src.charAt(i) === "\\") { i++; var m2 = /^[A-Za-z]+|^./.exec(src.slice(i)); var n2 = m2 ? m2[0] : ""; i += n2.length; return TEX_GLYPH[n2] || n2; }
            return src.charAt(i++);
        }
        function delim(open, close, inner) {
            return '<m:d><m:dPr><m:begChr m:val="' + esc(open) + '"/><m:endChr m:val="' + esc(close) + '"/></m:dPr><m:e>' + inner + "</m:e></m:d>";
        }
        function rest() {
            var out = "";
            while (i < src.length && src.charAt(i) !== "}") out += token();
            return out;
        }
        function token() {
            skipWs();
            if (i >= src.length) return "";
            var ch = src.charAt(i);
            if (ch === "\\") return command();
            if (ch === "{") { i++; return until("}"); }
            if (ch === "^" || ch === "_") {
                i++;
                var arg = group();
                return ch === "^"
                    ? "<m:sSup><m:sSupPr/><m:e>" + mrun("") + "</m:e><m:sup>" + arg + "</m:sup></m:sSup>"
                    : "<m:sSub><m:sSubPr/><m:e>" + mrun("") + "</m:e><m:sub>" + arg + "</m:sub></m:sSub>";
            }
            // Plain text, up to the next construct. Superscripts and subscripts
            // bind to the character before them, so the last character is peeled
            // off and handled as a base when one follows.
            var run = "";
            while (i < src.length && !/[\\{}^_]/.test(src.charAt(i))) run += src.charAt(i++);
            if ((src.charAt(i) === "^" || src.charAt(i) === "_") && run) {
                var base = run.slice(-1);
                run = run.slice(0, -1);
                var op = src.charAt(i); i++;
                var sup = group();
                // A base can carry both scripts.
                skipWs();
                var other = "";
                if ((src.charAt(i) === "^" || src.charAt(i) === "_") && src.charAt(i) !== op) { var op2 = src.charAt(i); i++; other = group(); }
                var head = mrun(run);
                if (other) {
                    return head + "<m:sSubSup><m:sSubSupPr/><m:e>" + mrun(base) + "</m:e><m:sub>" +
                        (op === "_" ? sup : other) + "</m:sub><m:sup>" + (op === "^" ? sup : other) + "</m:sup></m:sSubSup>";
                }
                return head + (op === "^"
                    ? "<m:sSup><m:sSupPr/><m:e>" + mrun(base) + "</m:e><m:sup>" + sup + "</m:sup></m:sSup>"
                    : "<m:sSub><m:sSubPr/><m:e>" + mrun(base) + "</m:e><m:sub>" + sup + "</m:sub></m:sSub>");
            }
            return mrun(run);
        }
        var body = "";
        while (i < src.length) body += token();
        return "<m:oMath>" + body + "</m:oMath>";
    }

    // ----------------------------------------------------------- block walker
    function blocksXml(root, b) {
        var out = "";
        var revSeq = { n: 1 };
        var base = { bold: false, italic: false, underline: false, strike: false, sizeHalfPoints: 0, color: null, highlight: null, vertAlign: null, mono: false };


        // A block indented in the editor carries margin-left (or padding-left,
        // per indentUseMargin). Word expresses the same thing as w:ind, in
        // TWIPS. Before 2026-09-04 indentation reached Word only when it was
        // spelled <blockquote>, which dragged the Quote style along with it -
        // so indented body text arrived italic and accent-coloured.
        // 1px = 0.75pt and 1pt = 20 twips, hence px * 15.
        // a signed CSS length in twips (1px = 15 twips); 0 when it is not a plain length
        function lengthTwips(raw) {
            var m = /^\s*(-?[\d.]+)\s*(px|pt|in|cm|mm|em|rem)?\s*$/i.exec(raw == null ? "" : String(raw));
            if (!m) return 0;
            var n = parseFloat(m[1]), u = (m[2] || "px").toLowerCase();
            var px = u === "px" ? n : u === "pt" ? n * 4 / 3 : u === "in" ? n * 96 : u === "cm" ? n * 37.795 : u === "mm" ? n * 3.7795 : n * 16;
            return Math.round(px * 15);
        }
        function indentTwips(node) {
            if (!node || !node.style) return 0;
            var raw = node.style.marginLeft || node.style.paddingLeft || "";
            var m = /^\s*(-?[\d.]+)\s*([a-z%]*)\s*$/i.exec(raw);
            if (!m) return 0;
            var n = parseFloat(m[1]);
            if (!n || n <= 0) return 0;
            var unit = (m[2] || "px").toLowerCase();
            var px = unit === "px" ? n
                : unit === "pt" ? n * (4 / 3)
                : unit === "in" ? n * 96
                : unit === "cm" ? n * 37.795
                : unit === "mm" ? n * 3.7795
                : (unit === "em" || unit === "rem") ? n * 16
                : 0;
            return Math.round(px * 15);
        }

        function para(node, style, opts) {
            opts = opts || {};
            var pr = "";
            if (opts.heading) pr += '<w:pStyle w:val="Heading' + opts.heading + '"/>';
            if (opts.quote) pr += '<w:pStyle w:val="Quote"/><w:ind w:left="720"/>';
            if (opts.pre) pr += '<w:pStyle w:val="Code"/>';
            if (opts.caption) pr += '<w:pStyle w:val="Caption"/>';
            if (opts.numId) pr += "<w:numPr><w:ilvl w:val=\"" + (opts.level || 0) + "\"/><w:numId w:val=\"" + opts.numId + "\"/></w:numPr>";
            if (opts.pageBreakBefore) pr += "<w:pageBreakBefore/>";
            // 2026-10-15 direction, line height and first-line / hanging indent were not written (only the left indent
            // and alignment were): an RTL paragraph came back left-to-right, double spacing came back single.
            // pPr order is bidi, spacing, ind, jc. tools/docx/paragraph-props.mjs
            if (node && node.getAttribute && (String(node.getAttribute("dir") || "").toLowerCase() === "rtl" || (node.style && node.style.direction === "rtl"))) pr += "<w:bidi/>";
            var lhRaw = node && node.style ? String(node.style.lineHeight || "") : "", lhm;
            if ((lhm = /^\s*([\d.]+)\s*$/.exec(lhRaw)) && parseFloat(lhm[1]) > 0) pr += '<w:spacing w:line="' + Math.round(parseFloat(lhm[1]) * 240) + '" w:lineRule="auto"/>';
            else if ((lhm = /^\s*([\d.]+)%\s*$/.exec(lhRaw)) && parseFloat(lhm[1]) > 0) pr += '<w:spacing w:line="' + Math.round(parseFloat(lhm[1]) * 2.4) + '" w:lineRule="auto"/>';
            else if ((lhm = /^\s*([\d.]+)(px|pt)\s*$/.exec(lhRaw)) && parseFloat(lhm[1]) > 0) pr += '<w:spacing w:line="' + Math.round(parseFloat(lhm[1]) * (lhm[2] === "pt" ? 20 : 15)) + '" w:lineRule="exact"/>';
            // Independent of the Quote style: a real blockquote already got
            // its w:ind above, so only emit this for everything else.
            if (!opts.quote) {
                var indTw = indentTwips(node);
                var tiTw = lengthTwips(node && node.style ? node.style.textIndent : "");
                if (indTw > 0 || tiTw) pr += '<w:ind' + (indTw > 0 ? ' w:left="' + indTw + '"' : "") + (tiTw > 0 ? ' w:firstLine="' + tiTw + '"' : tiTw < 0 ? ' w:hanging="' + (-tiTw) + '"' : "") + '/>';
            }
            var align = node && node.style ? node.style.textAlign : "";
            if (align === "center" || align === "right") pr += '<w:jc w:val="' + align + '"/>';
            else if (align === "justify") pr += '<w:jc w:val="both"/>';
            var inner = node ? inlineXml(node, style, b, revSeq) : "";
            return "<w:p>" + (pr ? "<w:pPr>" + pr + "</w:pPr>" : "") + inner + "</w:p>";
        }

        function list(node, style, level, pendingBreak) {
            // 2026-10-15 a task list: Word has no plain-text checklist, so each item is an indented paragraph that
            // starts with a ballot box, open (U+2610) or ticked (U+2612), as Google Docs exports it. It went out as an
            // ordinary bulleted list and every tick was lost. tools/docx/task-list.mjs
            if (node.classList && node.classList.contains("rte-task-list")) {
                var txml = "";
                for (var ti = 0; ti < node.childNodes.length; ti++) {
                    var tli = node.childNodes[ti];
                    if (tli.nodeType !== 1 || tli.tagName.toLowerCase() !== "li") continue;
                    var town = tli.ownerDocument.createElement("p");
                    for (var tk = 0; tk < tli.childNodes.length; tk++) {
                        var tch = tli.childNodes[tk];
                        if (tch.nodeType === 1 && (/^(ul|ol)$/.test(tch.tagName.toLowerCase()) || (tch.classList && tch.classList.contains("rte-task-checkbox")))) continue;
                        town.appendChild(tch.cloneNode(true));
                    }
                    var ticked = tli.getAttribute("data-checked") === "true";
                    town.insertBefore(tli.ownerDocument.createTextNode((ticked ? "\u2612" : "\u2610") + " "), town.firstChild);
                    town.style.marginLeft = (24 * (level + 1)) + "px";
                    txml += para(town, styleFrom(tli, style), { pageBreakBefore: pendingBreak });
                    pendingBreak = false;
                    for (var tj = 0; tj < tli.childNodes.length; tj++) {
                        var tsub = tli.childNodes[tj];
                        if (tsub.nodeType === 1 && /^(ul|ol)$/.test(tsub.tagName.toLowerCase())) txml += list(tsub, style, Math.min(8, level + 1), false);
                    }
                }
                return txml;
            }
            var ordered = node.tagName.toLowerCase() === "ol";
            // One numId per list, so two adjacent lists restart rather than
            // continuing each other's numbering.
            var numId = ++b.numSeq;
            b.numbering[numId] = ordered ? "decimal" : "bullet";
            // 2026-10-04 an <ol start> starts its level there (it was always 1, so a list continued
            // after a paragraph restarted in Word). tools/docx/ordered-start.mjs
            var startAt = ordered ? parseInt(node.getAttribute("start"), 10) : 1;
            if (isNaN(startAt)) startAt = 1;
            if (startAt !== 1) (b.numStart || (b.numStart = {}))[numId] = { level: level, start: startAt };
            // 2026-10-04 a lettered / Roman list keeps its numbering style in Word (it was always decimal).
            // tools/docx/list-formats.mjs
            if (ordered) {
                var lst = String((node.style && node.style.listStyleType) || "").toLowerCase(), typ = node.getAttribute("type") || "";
                var wf = /^(lower-alpha|lower-latin)$/.test(lst) || typ === "a" ? "lowerLetter"
                    : /^(upper-alpha|upper-latin)$/.test(lst) || typ === "A" ? "upperLetter"
                    : lst === "lower-roman" || typ === "i" ? "lowerRoman"
                    : lst === "upper-roman" || typ === "I" ? "upperRoman" : "";
                if (wf) (b.numFmtAt || (b.numFmtAt = {}))[numId] = { level: level, fmt: wf };
            }
            var xml = "";
            for (var i = 0; i < node.childNodes.length; i++) {
                var li = node.childNodes[i];
                if (li.nodeType !== 1 || li.tagName.toLowerCase() !== "li") continue;
                // Serialise the item's OWN content only. para() walks every
                // descendant, so passing the whole <li> emitted the nested list's
                // text here AND again as its own items below - a round trip turned
                // "xx" with a child "yy" into "xxyy". Content duplication, not loss.
                var own = li.ownerDocument.createElement("li");
                for (var k = 0; k < li.childNodes.length; k++) {
                    var ch = li.childNodes[k];
                    if (ch.nodeType === 1 && /^(ul|ol)$/.test(ch.tagName.toLowerCase())) continue;
                    own.appendChild(ch.cloneNode(true));
                }
                xml += para(own, styleFrom(li, style), { numId: numId, level: level, pageBreakBefore: pendingBreak });
                pendingBreak = false;
                for (var j = 0; j < li.childNodes.length; j++) {
                    var sub = li.childNodes[j];
                    if (sub.nodeType === 1 && /^(ul|ol)$/.test(sub.tagName.toLowerCase())) {
                        xml += list(sub, style, Math.min(8, level + 1), false);
                    }
                }
            }
            return xml;
        }

        // 2026-10-15 the table's width and its column widths: a 30% / 70% layout came back as equal columns and a
        // full-width table as shrink-to-fit. <col> widths (% of a 6.5in text column, or px) become <w:gridCol> twips;
        // a % table width becomes <w:tblW w:type="pct"> (fiftieths of a percent). tools/docx/table-widths.mjs
        var TEXT_TWIPS = 9360;
        function tableGrid(node) {
            var cols = [], kids = node.children;
            for (var i = 0; i < kids.length; i++) if (kids[i].tagName && kids[i].tagName.toLowerCase() === "colgroup") {
                for (var j = 0; j < kids[i].children.length; j++) if (kids[i].children[j].tagName.toLowerCase() === "col") cols.push(kids[i].children[j]);
            }
            if (!cols.length) return "";
            var tw = [];
            for (var k = 0; k < cols.length; k++) {
                var w = (cols[k].style && cols[k].style.width) || cols[k].getAttribute("width") || "", m;
                if ((m = /^\s*([\d.]+)%\s*$/.exec(w))) tw.push(Math.round(parseFloat(m[1]) / 100 * TEXT_TWIPS));
                else if ((m = /^\s*([\d.]+)(px)?\s*$/.exec(w))) tw.push(Math.round(parseFloat(m[1]) * 15));
                else return ""; // one column without a usable width: leave the layout to Word
            }
            return "<w:tblGrid>" + tw.map(function (t) { return '<w:gridCol w:w="' + t + '"/>'; }).join("") + "</w:tblGrid>";
        }
        function tableWidth(node) {
            var m = /^\s*([\d.]+)%\s*$/.exec((node.style && node.style.width) || node.getAttribute("width") || "");
            return m ? '<w:tblW w:w="' + Math.round(parseFloat(m[1]) * 50) + '" w:type="pct"/>' : '<w:tblW w:w="0" w:type="auto"/>';
        }
        function table(node, style) {
            var xml = '<w:tbl><w:tblPr>' + tableWidth(node) +
                '<w:tblBorders>' +
                ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (s) {
                    return '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>';
                }).join("") +
                "</w:tblBorders></w:tblPr>" + tableGrid(node);
            var trs = node.getElementsByTagName("tr");
            // 2026-10-15 rowspan: Word marks the first cell <w:vMerge w:val="restart"/> and puts an empty <w:vMerge/>
            // continuation cell at the same grid column in every row it covers. It was not written at all, so a
            // merged cell came back split. down[col] = { left: rows still covered, span: its colspan }.
            // tools/docx/merged-cells.mjs
            var down = {};
            function continuation(col) { var d = down[col]; d.left--; var s = d.span; if (!d.left) delete down[col]; return '<w:tc><w:tcPr>' + (s > 1 ? '<w:gridSpan w:val="' + s + '"/>' : '') + '<w:vMerge/></w:tcPr><w:p/></w:tc>'; }
            for (var r = 0; r < trs.length; r++) {
                var cells = [];
                for (var c = 0; c < trs[r].childNodes.length; c++) {
                    var cell = trs[r].childNodes[c];
                    if (cell.nodeType !== 1) continue;
                    var t = cell.tagName.toLowerCase();
                    if (t === "td" || t === "th") cells.push({ node: cell, header: t === "th" });
                }
                if (!cells.length) continue;
                // A header row must repeat when the table splits across pages,
                // or the continuation arrives as unlabelled numbers.
                var isHeader = cells.length && cells[0].header;
                xml += "<w:tr>" + (isHeader ? "<w:trPr><w:tblHeader/></w:trPr>" : "");
                var gcol = 0;
                for (var k = 0; k < cells.length; k++) {
                    while (down[gcol]) { var dspan = down[gcol].span; xml += continuation(gcol); gcol += dspan; }
                    var span = parseInt(cells[k].node.getAttribute("colspan") || "1", 10) || 1;
                    var rspan = parseInt(cells[k].node.getAttribute("rowspan") || "1", 10) || 1;
                    if (rspan > 1) down[gcol] = { left: rspan - 1, span: span };
                    var cs = styleFrom(cells[k].node, style);
                    if (cells[k].header) cs.bold = true;
                    var body = "";
                    var kids = cells[k].node.childNodes, hasBlock = false;
                    for (var q = 0; q < kids.length; q++) {
                        if (kids[q].nodeType === 1 && /^(p|div|ul|ol|table|h[1-6]|blockquote)$/.test(kids[q].tagName.toLowerCase())) { hasBlock = true; break; }
                    }
                    body = hasBlock ? walk(cells[k].node, cs) : para(cells[k].node, cs, {});
                    // A table cell may never be empty in OOXML.
                    if (!body) body = "<w:p/>";
                    xml += "<w:tc><w:tcPr>" +
                        (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : "") +
                        (rspan > 1 ? '<w:vMerge w:val="restart"/>' : "") +
                        (cells[k].header ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F3F7"/>' : "") +
                        "</w:tcPr>" + body + "</w:tc>";
                    gcol += span;
                }
                // merges from above that reach past this row's last cell
                for (var tail = gcol; tail < gcol + 64; tail++) { if (down[tail]) { var tspan = down[tail].span; xml += continuation(tail); tail += tspan - 1; } }
                xml += "</w:tr>";
            }
            return xml + "</w:tbl><w:p/>";
        }

        function walk(node, style) {
            var xml = "", pendingBreak = false;
            for (var i = 0; i < node.childNodes.length; i++) {
                var c = node.childNodes[i];
                if (c.nodeType === 3) {
                    if ((c.nodeValue || "").trim()) xml += "<w:p>" + textRun(c.nodeValue.replace(/\s+/g, " "), style, false) + "</w:p>";
                    continue;
                }
                if (c.nodeType !== 1) continue;
                var tag = c.tagName.toLowerCase();
                if (tag === "script" || tag === "style" || tag === "noscript") continue;
                if (c.classList && (c.classList.contains("rte-footnotes") || c.classList.contains("rte-fn-note"))) continue;

                if (c.getAttribute("data-rte-page-break") !== null || /always|page/.test((c.style && (c.style.pageBreakBefore || c.style.breakBefore)) || "")) {
                    pendingBreak = true;
                    // 2026-10-15 the editor's marker is only a marker: its label ("Insert Page Break") was written
                    // into the Word document as a paragraph of text. tools/docx/page-breaks.mjs
                    if (c.getAttribute("data-rte-page-break") !== null) continue;
                }

                if (tag === "hr") { xml += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C8CDD4"/></w:pBdr></w:pPr></w:p>'; continue; }
                if (tag === "ul" || tag === "ol") { xml += list(c, style, 0, pendingBreak); pendingBreak = false; continue; }
                // 2026-10-04 captions are Word captions: a table's above it (it was dropped), an image's in its own
                // paragraph after the picture (it ran on in the picture's). tools/docx/captions.mjs
                if (tag === "table") {
                    var tcap = c.caption; // its OWN caption, not a nested table's (2026-10-05 review)
                    if (tcap && (tcap.textContent || "").replace(/\s+/g, "")) xml += para(tcap, styleFrom(tcap, style), { caption: true });
                    xml += table(c, style); continue;
                }
                var ownFcap = null;
                if (tag === "figure") for (var fci = 0; fci < c.children.length; fci++) if (c.children[fci].tagName.toLowerCase() === "figcaption") { ownFcap = c.children[fci]; break; }
                if (tag === "figure" && ownFcap) {
                    var fcap = ownFcap;
                    // the caption is taken out for the picture's paragraph and put back (the image export
                    // keys on the original <img>, so a clone lost the picture)
                    var fcapParent = fcap.parentNode, fcapNext = fcap.nextSibling;
                    fcapParent.removeChild(fcap);
                    try { xml += para(c, styleFrom(c, style), { pageBreakBefore: pendingBreak }); }
                    finally { fcapParent.insertBefore(fcap, fcapNext); }
                    pendingBreak = false;
                    if ((fcap.textContent || "").replace(/\s+/g, "")) xml += para(fcap, styleFrom(fcap, style), { caption: true });
                    continue;
                }
                if (HEADING[tag]) { xml += para(c, styleFrom(c, style), { heading: HEADING[tag], pageBreakBefore: pendingBreak }); pendingBreak = false; continue; }
                if (tag === "blockquote") { xml += para(c, styleFrom(c, style), { quote: true, pageBreakBefore: pendingBreak }); pendingBreak = false; continue; }
                if (tag === "pre") { xml += para(c, styleFrom(c, style), { pre: true, pageBreakBefore: pendingBreak }); pendingBreak = false; continue; }
                if (tag === "p" || tag === "div" || tag === "section" || tag === "article" || tag === "figure" || tag === "address") {
                    if (hasBlockChild(c)) { xml += walk(c, styleFrom(c, style)); continue; }
                    xml += para(c, styleFrom(c, style), { pageBreakBefore: pendingBreak });
                    pendingBreak = false;
                    continue;
                }
                xml += para(c, styleFrom(c, style), { pageBreakBefore: pendingBreak });
                pendingBreak = false;
            }
            return xml;
        }

        function hasBlockChild(node) {
            for (var i = 0; i < node.childNodes.length; i++) {
                var c = node.childNodes[i];
                if (c.nodeType === 1 && /^(p|div|ul|ol|table|h[1-6]|blockquote|pre|hr|section|article)$/.test(c.tagName.toLowerCase())) return true;
            }
            return false;
        }

        out = walk(root, base);
        return out || "<w:p/>";
    }

    // ------------------------------------------------------------- assembling
    function sectionXml() {
        var setup = null;
        try { if (typeof editor.getDocumentPageSetup === "function") setup = editor.getDocumentPageSetup(); } catch (e) {}
        setup = setup || {};
        var SIZES = { letter: [12240, 15840], legal: [12240, 20160], tabloid: [15840, 24480], a3: [16838, 23811], a4: [11906, 16838], a5: [8391, 11906] };
        var size = SIZES[String(setup.format || "letter").toLowerCase()] || SIZES.letter;
        var landscape = String(setup.orientation || "").toLowerCase() === "landscape";
        var w = landscape ? size[1] : size[0], h = landscape ? size[0] : size[1];
        function twips(v, fallback) {
            if (typeof v === "number" && isFinite(v)) return Math.round(v * 1440);
            var m = /^\s*(-?[\d.]+)\s*(mm|cm|in|px|pt)?\s*$/.exec(String(v || ""));
            if (!m) return fallback;
            var n = parseFloat(m[1]);
            switch (m[2]) {
                case "mm": return Math.round(n * 1440 / 25.4);
                case "cm": return Math.round(n * 1440 / 2.54);
                case "pt": return Math.round(n * 20);
                case "px": return Math.round(n * 15);
                default: return Math.round(n * 1440);
            }
        }
        var mg = setup.margins || {};
        return '<w:sectPr><w:pgSz w:w="' + w + '" w:h="' + h + '"' + (landscape ? ' w:orient="landscape"' : "") + "/>" +
            '<w:pgMar w:top="' + twips(mg.top, 1440) + '" w:right="' + twips(mg.right, 1440) +
            '" w:bottom="' + twips(mg.bottom, 1440) + '" w:left="' + twips(mg.left, 1440) +
            '" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
    }

    // 2026-10-04 The copy's <img> elements are NEW and have not loaded: exported straight after setHTMLCode()
    // an image without width/height had naturalWidth 0 and was silently dropped. The copy is made first and
    // its images are waited for (load or error, 5 s at most). tools/docx/unsized-image.mjs
    function buildDocx(options) {
        // 2026-10-05 a failure here (getHTMLCode, the copy) rejects the promise instead of throwing (review)
        try { return buildDocxPrepared(options); } catch (e) { return Promise.reject(e); }
    }
    function buildDocxPrepared(options) {
        var host = document.createElement("div");
        // getHTMLCode() is the serialized document: presentational
        // plugins strip their own chrome from it, so page overlays,
        // watermarks and formatting marks never reach the file.
        host.innerHTML = editor.getHTMLCode() || "";
        // Resolve class-based list styling in the editing document, before the
        // export copy leaves the stylesheet's scope. Do not change saved HTML.
        var liveLists = editor.getEditable().querySelectorAll("ol,ul"), exportLists = host.querySelectorAll("ol,ul");
        if (liveLists.length === exportLists.length) for (var li = 0; li < liveLists.length; li++) {
            var listStyle = liveLists[li].ownerDocument.defaultView.getComputedStyle(liveLists[li]).listStyleType;
            if (listStyle) exportLists[li].style.listStyleType = listStyle;
        }
        document.body.appendChild(host);
        host.style.cssText = "position:absolute;left:-99999px;top:0;width:800px;";
        var pending = [].slice.call(host.querySelectorAll("img")).filter(function (im) { return !(im.complete && im.naturalWidth); });
        var ready = !pending.length ? Promise.resolve() : Promise.all(pending.map(function (im) {
            return new Promise(function (done) {
                im.addEventListener("load", done); im.addEventListener("error", done); setTimeout(done, 5000);
            });
        }));
        return ready.then(function () { return buildFromHost(host, options); });
    }
    function buildFromHost(host, options) {
        return new Promise(function (resolve, reject) {
            try {

                var b = new Builder();
                var body = blocksXml(host, b);
                host.parentNode.removeChild(host);

                var files = [];
                function put(name, xml) { files.push({ name: name, bytes: utf8Bytes(xml) }); }

                var hasFootnotes = b.footnotes.length > 0;
                var hasEndnotes = b.endnotes.length > 0;
                var hasComments = b.comments.length > 0;

                put("[Content_Types].xml",
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
                    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
                    '<Default Extension="xml" ContentType="application/xml"/>' +
                    '<Default Extension="png" ContentType="image/png"/>' +
                    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
                    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
                    '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
                    (hasFootnotes ? '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>' : "") +
                    (hasEndnotes ? '<Override PartName="/word/endnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml"/>' : "") +
                    (hasComments ? '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>' : "") +
                    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
                    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
                    "</Types>");

                put("_rels/.rels",
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                    '<Relationship Id="rIdDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
                    '<Relationship Id="rIdCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
                    '<Relationship Id="rIdApp" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
                    "</Relationships>");

                var relBase = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
                var relXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
                    '<Relationship Id="rIdStyles" Type="' + relBase + 'styles" Target="styles.xml"/>' +
                    '<Relationship Id="rIdNum" Type="' + relBase + 'numbering" Target="numbering.xml"/>' +
                    (hasFootnotes ? '<Relationship Id="rIdFn" Type="' + relBase + 'footnotes" Target="footnotes.xml"/>' : "") +
                    (hasEndnotes ? '<Relationship Id="rIdEn" Type="' + relBase + 'endnotes" Target="endnotes.xml"/>' : "") +
                    (hasComments ? '<Relationship Id="rIdCm" Type="' + relBase + 'comments" Target="comments.xml"/>' : "");
                for (var i = 0; i < b.rels.length; i++) {
                    var rl = b.rels[i];
                    relXml += '<Relationship Id="' + rl.id + '" Type="' + relBase + rl.type + '" Target="' + esc(rl.target) + '"' +
                        (rl.mode ? ' TargetMode="' + rl.mode + '"' : "") + "/>";
                }
                put("word/_rels/document.xml.rels", relXml + "</Relationships>");

                put("word/document.xml",
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<w:document xmlns:w="' + NS.w + '" xmlns:r="' + NS.r + '" xmlns:m="' + NS.m + '">' +
                    "<w:body>" + body + sectionXml() + "</w:body></w:document>");

                put("word/styles.xml", stylesXml());
                put("word/numbering.xml", numberingXml(b));

                if (hasFootnotes) put("word/footnotes.xml", notesXml(b.footnotes, "footnote"));
                if (hasEndnotes) put("word/endnotes.xml", notesXml(b.endnotes, "endnote"));
                if (hasComments) put("word/comments.xml", commentsXml(b.comments));

                var title = options.title || config.docxExportTitle || document.title || "Document";
                var author = options.author || config.docxExportAuthor || "RichTextEditor";
                put("docProps/core.xml",
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"' +
                    ' xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"' +
                    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
                    "<dc:title>" + esc(title) + "</dc:title><dc:creator>" + esc(author) + "</dc:creator>" +
                    '<cp:lastModifiedBy>' + esc(author) + "</cp:lastModifiedBy>" +
                    '<dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().replace(/\.\d+Z$/, "Z") + "</dcterms:created>" +
                    "</cp:coreProperties>");
                put("docProps/app.xml",
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
                    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
                    "<Application>RichTextEditor</Application></Properties>");

                for (var mi = 0; mi < b.media.length; mi++) {
                    files.push({ name: "word/media/" + b.media[mi].name, bytes: b.media[mi].bytes });
                }

                zip(files).then(resolve, reject);
            } catch (e) {
                // 2026-10-05 the hidden copy never stays in the page (review)
                if (host && host.parentNode) host.parentNode.removeChild(host);
                reject(e);
            }
        });
    }

    function stylesXml() {
        var heads = "";
        for (var i = 1; i <= 6; i++) {
            var sz = [36, 30, 26, 24, 22, 20][i - 1];
            heads += '<w:style w:type="paragraph" w:styleId="Heading' + i + '">' +
                '<w:name w:val="heading ' + i + '"/><w:basedOn w:val="Normal"/>' +
                '<w:pPr><w:outlineLvl w:val="' + (i - 1) + '"/><w:spacing w:before="240" w:after="120"/></w:pPr>' +
                '<w:rPr><w:b/><w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr></w:style>';
        }
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<w:styles xmlns:w="' + NS.w + '">' +
            '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>' +
            '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
            heads +
            '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:color w:val="4A5568"/></w:rPr></w:style>' +
            '<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr></w:style>' +
            '<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:i/><w:color w:val="44546A"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>' +
            "</w:styles>";
    }

    function numberingXml(b) {
        var abstracts = "", nums = "";
        var ids = Object.keys(b.numbering);
        for (var i = 0; i < ids.length; i++) {
            var numId = ids[i], fmt = b.numbering[numId];
            var levels = "";
            for (var lvl = 0; lvl < 9; lvl++) {
                // Word distinguishes bullets from numbers ONLY here; the
                // document body stores every list identically.
                levels += '<w:lvl w:ilvl="' + lvl + '">' +
                    '<w:start w:val="' + (b.numStart && b.numStart[numId] && b.numStart[numId].level === lvl ? b.numStart[numId].start : 1) + '"/>' +
                    '<w:numFmt w:val="' + (fmt === "bullet" ? "bullet" : (b.numFmtAt && b.numFmtAt[numId] && b.numFmtAt[numId].level === lvl ? b.numFmtAt[numId].fmt : "decimal")) + '"/>' +
                    '<w:lvlText w:val="' + (fmt === "bullet" ? "\uF0B7" : "%" + (lvl + 1) + ".") + '"/>' +
                    '<w:lvlJc w:val="left"/>' +
                    '<w:pPr><w:ind w:left="' + (720 * (lvl + 1)) + '" w:hanging="360"/></w:pPr>' +
                    (fmt === "bullet" ? '<w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr>' : "") +
                    "</w:lvl>";
            }
            abstracts += '<w:abstractNum w:abstractNumId="' + numId + '">' + levels + "</w:abstractNum>";
            nums += '<w:num w:numId="' + numId + '"><w:abstractNumId w:val="' + numId + '"/></w:num>';
        }
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<w:numbering xmlns:w="' + NS.w + '">' + abstracts + nums + "</w:numbering>";
    }

    function notesXml(notes, kind) {
        // Ids 0 and -1 are the separator rules Word draws above notes. They are
        // not content, but the part is malformed without them.
        var xml = '<w:' + kind + ' w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:' + kind + ">" +
            '<w:' + kind + ' w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:' + kind + ">";
        for (var i = 0; i < notes.length; i++) {
            xml += '<w:' + kind + ' w:id="' + notes[i].id + '"><w:p><w:r>' +
                '<w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:' + kind + 'Ref/></w:r>' +
                '<w:r><w:t xml:space="preserve"> ' + esc(notes[i].text) + "</w:t></w:r></w:p></w:" + kind + ">";
        }
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            "<w:" + kind + "s xmlns:w=\"" + NS.w + "\">" + xml + "</w:" + kind + "s>";
    }

    function commentsXml(comments) {
        var xml = "";
        for (var i = 0; i < comments.length; i++) {
            var c = comments[i];
            xml += '<w:comment w:id="' + c.id + '" w:author="' + esc(c.author) + '" w:initials="' + esc(c.initials) +
                '" w:date="' + new Date().toISOString().replace(/\.\d+Z$/, "Z") + '">' +
                "<w:p><w:r><w:t xml:space=\"preserve\">" + esc(c.text) + "</w:t></w:r></w:p></w:comment>";
        }
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<w:comments xmlns:w="' + NS.w + '">' + xml + "</w:comments>";
    }

    // ------------------------------------------------------------- downloads
    function sanitizeName(name) {
        if (!name || typeof name !== "string") return "";
        return name.replace(/\.docx?$/i, "").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 120);
    }
    function defaultBase() {
        var d = new Date();
        function two(n) { return (n < 10 ? "0" : "") + n; }
        return "Export-" + String(d.getFullYear()).slice(2) + two(d.getMonth() + 1) + two(d.getDate()) +
            "-" + two(d.getHours()) + two(d.getMinutes()) + two(d.getSeconds());
    }
    function download(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        return filename;
    }
}
