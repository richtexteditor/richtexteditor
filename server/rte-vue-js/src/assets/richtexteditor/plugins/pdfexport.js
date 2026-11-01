if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-08-02 PDF export that produces REAL TEXT.
//
// The existing html2pdf path renders the document with html2canvas and drops a
// JPEG onto each page. It is pixel-accurate, which is genuinely the right answer
// when the layout is the point — but the resulting PDF is a picture:
//
//   - nothing is selectable, copyable or searchable
//   - screen readers find an empty document (a hard accessibility failure, and
//     an outright blocker for anyone shipping into government or education)
//   - links are painted, not clickable
//   - a text-only page costs hundreds of KB instead of a few
//   - zooming or printing shows resampling artefacts
//
// This writes the PDF file format directly: no library, no canvas, no network.
// Both exporters stay available and neither changes the other's behaviour —
// `exportpdf` is vector, `html2pdf` remains raster.
//
// Why writing PDF by hand is reasonable here: a text PDF is a small object graph
// plus a content stream, and the 14 standard fonts need no embedding at all. The
// hard part of a PDF generator is font subsetting, and using the base-14 fonts
// removes it entirely.
//
// API:
//   editor.getPdfBytes(options)          -> Uint8Array
//   editor.exportToPdf(filename, options)-> triggers a download
// Command: exec_command "exportpdf".
// Config:
//   config.pdfExport = false                 // disable
//   config.pdfExportFileName = "report"
//   config.pdfExportFont = "helvetica"        // helvetica | times | courier
//   config.pdfExportBaseFontSize = 11         // points
//   config.pdfExportTitle / pdfExportAuthor   // document metadata
RTE_DefaultConfig.plugin_pdfexport = RTE_Plugin_PdfExport;
if (typeof RTE_DefaultConfig.pdfExport === "undefined") RTE_DefaultConfig.pdfExport = true;

function RTE_Plugin_PdfExport() {
    // An ordered list item's number in its list style: 1, a..z then aa (CSS lower-alpha), i/I roman.
    function listNumber(n, kind) {
        if (kind === "a" || kind === "A") {
            var t = "";
            for (var k = n; k > 0; k = Math.floor((k - 1) / 26)) t = String.fromCharCode(97 + (k - 1) % 26) + t;
            return t ? (kind === "A" ? t.toUpperCase() : t) : String(n); // 0 and below: a number, never ""
        }
        if ((kind === "i" || kind === "I") && n > 0 && n < 4000) {
            var r = "", vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1], sy = ["m", "cm", "d", "cd", "c", "xc", "l", "xl", "x", "ix", "v", "iv", "i"];
            for (var q = 0; q < vals.length; q++) while (n >= vals[q]) { r += sy[q]; n -= vals[q]; }
            return kind === "I" ? r.toUpperCase() : r;
        }
        return String(n);
    }

    var obj = this;
    var config, editor;

    obj.PluginName = "PdfExport";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.pdfExport === false) return;

        editor.getPdfBytes = function (options) { return buildPdf(options || {}); };
        // 2026-10-26 The standard PDF fonts encode Western European Latin only (WinAnsi): every other character -
        // Chinese, Japanese, Korean, Cyrillic, Greek, Arabic... - was written as "?", silently. Until fonts can be
        // embedded: getPdfUnsupportedText() says which characters a vector export would lose, and exportToPdf() (the
        // toolbar's Export PDF) hands such a document to the html2pdf raster export when that plugin is loaded, which
        // draws every script. Set pdfExportRasterFallback = false to always write the vector PDF.
        // tools/pdf/pdf-nonlatin-fallback.mjs
        editor.getPdfUnsupportedText = function (options) { return unsupportedText(options || {}); };
        // Fetches a TrueType font from a URL you choose and uses it for the text the standard fonts cannot draw.
        // Resolves true when it is usable; nothing is fetched unless this is called. tools/pdf/pdf-unicode-font.mjs
        editor.loadPdfFont = function (url) {
            return fetch(url).then(function (r) { if (!r.ok) throw new Error("pdfexport: font " + url + " returned " + r.status); return r.arrayBuffer(); })
                .then(function (buf) { var bytes = new Uint8Array(buf); parseTrueType(bytes); config.pdfExportUnicodeFont = bytes; return true; });
        };
        editor.exportToPdf = function (filename, options) {
            var lost = unsupportedText(options || {});
            if (lost) {
                var raster = config.pdfExportRasterFallback !== false && editor.toolbarFactoryMap && editor.toolbarFactoryMap["html2pdf"];
                if (window.console && console.warn) {
                    console.warn("pdfexport: the vector PDF cannot encode " + lost.length + " character(s) of this document (" +
                        lost.slice(0, 20) + (lost.length > 20 ? "..." : "") + "); its standard fonts cover Western European Latin only. " +
                        (raster ? "Exporting with the html2pdf raster export instead." : "They are written as \"?\". Load the html2pdf plugin for a raster export that keeps them."));
                }
                if (raster) { editor.execCommand("html2pdf"); return null; }
            }
            var bytes = buildPdf(options || {});
            var base = sanitizeName(filename) || sanitizeName(config.pdfExportFileName) || defaultBase();
            return download(bytes, base + ".pdf");
        };
        editor.downloadPdf = editor.exportToPdf;

        editor.attachEvent("exec_command_exportpdf", function (state) {
            state.returnValue = true;
            state.stopBubble = true;
            try { editor.exportToPdf(); }
            catch (e) { if (window.console) console.error("pdfexport:", e); }
        });

        // The slash-menu entry lives in slashcommand.js, gated on
        // `typeof editor.exportToPdf === "function"`. Registering from here
        // instead would silently do nothing: plugins initialise in bundle
        // order, "pdfexport" sorts before "slashcommand", and
        // editor.slashCommands does not exist yet at this point.
    };

    // ---------------------------------------------------------------- units
    var PT_PER_IN = 72;
    var PAGE_SIZES = {           // points, portrait
        letter: [612, 792], legal: [612, 1008], tabloid: [792, 1224],
        a3: [842, 1191], a4: [595, 842], a5: [420, 595]
    };

    function toPoints(v, fallback) {
        if (typeof v === "number" && isFinite(v)) return v * PT_PER_IN;   // bare number = inches
        if (typeof v !== "string") return fallback;
        var m = /^\s*(-?[\d.]+)\s*(mm|cm|in|px|pt)?\s*$/.exec(v);
        if (!m) return fallback;
        var n = parseFloat(m[1]);
        if (!isFinite(n)) return fallback;
        switch (m[2]) {
            case "mm": return n * PT_PER_IN / 25.4;
            case "cm": return n * PT_PER_IN / 2.54;
            case "pt": return n;
            case "px": return n * 0.75;                                   // CSS px at 96dpi
            default: return n * PT_PER_IN;
        }
    }

    function pageGeometry(options) {
        var setup = null;
        try { if (typeof editor.getDocumentPageSetup === "function") setup = editor.getDocumentPageSetup(); }
        catch (e) { setup = null; }
        setup = setup || {};
        var fmt = String(options.format || setup.format || "letter").toLowerCase();
        var size = PAGE_SIZES[fmt] || PAGE_SIZES.letter;
        var landscape = String(options.orientation || setup.orientation || "").toLowerCase() === "landscape";
        var w = landscape ? size[1] : size[0];
        var h = landscape ? size[0] : size[1];
        var m = options.margins || setup.margins || {};
        var half = PT_PER_IN / 2;
        return {
            width: w, height: h,
            margin: {
                top: toPoints(m.top, half), right: toPoints(m.right, half),
                bottom: toPoints(m.bottom, half), left: toPoints(m.left, half)
            }
        };
    }

    // ---------------------------------------------------------------- fonts
    //
    // The base-14 fonts need no embedding, but a viewer would then lay text out
    // with ITS metrics while this code wrapped lines using its own. The two
    // disagree and text overruns the margin. Fixing it by shipping AFM width
    // tables would add ~1500 lines of data; instead the widths are measured here
    // and written into the font object as /Widths, which a viewer is required to
    // honour. Layout and rendering then use the same numbers by construction.
    //
    // Measurement is accurate because the base-14 fonts are metric-compatible
    // with fonts every browser has: Helvetica/Arial, Times/Times New Roman,
    // Courier/Courier New were designed to share advance widths.
    var FONT_FAMILIES = {
        helvetica: { css: "Arial, Helvetica, sans-serif", faces: ["Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique"] },
        times: { css: '"Times New Roman", Times, serif', faces: ["Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic"] },
        courier: { css: '"Courier New", Courier, monospace', faces: ["Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique"] }
    };
    var FIRST_CHAR = 32, LAST_CHAR = 255;

    var widthCache = {};
    function widthsFor(familyKey, styleIndex) {
        var key = familyKey + ":" + styleIndex;
        if (widthCache[key]) return widthCache[key];
        var fam = FONT_FAMILIES[familyKey] || FONT_FAMILIES.helvetica;
        var canvas = widthsFor.canvas || (widthsFor.canvas = document.createElement("canvas"));
        var g = canvas.getContext("2d");
        // 1000 units per em is the PDF glyph space; measuring at 100px and
        // scaling by 10 keeps sub-unit rounding away from the result.
        var weight = (styleIndex & 1) ? "bold " : "";
        var slant = (styleIndex & 2) ? "italic " : "";
        g.font = weight + slant + "100px " + fam.css;
        var out = [];
        for (var c = FIRST_CHAR; c <= LAST_CHAR; c++) {
            var w = g.measureText(String.fromCharCode(c)).width;
            out.push(Math.round(w * 10));
        }
        widthCache[key] = out;
        return out;
    }

    function charWidth(familyKey, styleIndex, code) {
        if (code < FIRST_CHAR || code > LAST_CHAR) code = 63;   // '?'
        return widthsFor(familyKey, styleIndex)[code - FIRST_CHAR] || 500;
    }

    function textWidth(str, familyKey, styleIndex, size) {
        var total = 0;
        for (var i = 0; i < str.length; i++) total += charWidth(familyKey, styleIndex, str.charCodeAt(i));
        return total * size / 1000;
    }

    // ------------------------------------------------------------ embedded Unicode font
    //
    // 2026-10-26 The base-14 fonts encode Western European Latin only. With a TrueType font supplied
    // (config.pdfExportUnicodeFont / options.unicodeFont: the bytes of a .ttf, or editor.loadPdfFont(url)),
    // text the base fonts cannot draw - Chinese, Japanese, Korean, Cyrillic, Greek... - is written in that font
    // instead: a Type0 / CIDFontType2 font with Identity-H encoding and a ToUnicode map, so it stays vector,
    // selectable and searchable. The font is subset: every glyph keeps its ID (so CIDToGIDMap stays Identity)
    // but only the outlines the document uses are kept. tools/pdf/pdf-unicode-font.mjs
    var activeUni = null;      // { font, used: { gid: codepoint } } while one export runs
    var parsedFonts = [];      // [{ bytes, font }] - a parse is reused for the same bytes

    function u16(b, o) { return (b[o] << 8) | b[o + 1]; }
    function s16(b, o) { var v = u16(b, o); return v & 0x8000 ? v - 0x10000 : v; }
    function u32(b, o) { return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]; }

    function parseTrueType(input) {
        var b = input instanceof Uint8Array ? input : new Uint8Array(input);
        for (var pi = 0; pi < parsedFonts.length; pi++) if (parsedFonts[pi].bytes === b) return parsedFonts[pi].font;
        var tag0 = u32(b, 0);
        if (tag0 !== 0x00010000 && tag0 !== 0x74727565) {
            throw new Error(tag0 === 0x4F54544F ? "pdfexport: the Unicode font has CFF (PostScript) outlines; supply a TrueType (.ttf) font"
                : tag0 === 0x74746366 ? "pdfexport: the Unicode font is a collection (.ttc); supply a single .ttf font"
                : "pdfexport: the Unicode font is not a TrueType font");
        }
        var tables = {}, n = u16(b, 4);
        for (var i = 0; i < n; i++) {
            var rec = 12 + i * 16;
            var tag = String.fromCharCode(b[rec], b[rec + 1], b[rec + 2], b[rec + 3]);
            tables[tag] = { offset: u32(b, rec + 8), length: u32(b, rec + 12) };
        }
        ["head", "hhea", "hmtx", "maxp", "cmap", "loca", "glyf"].forEach(function (t) {
            if (!tables[t]) throw new Error("pdfexport: the Unicode font has no '" + t + "' table");
        });
        var head = tables.head.offset, hhea = tables.hhea.offset;
        var font = {
            bytes: b, tables: tables,
            units: u16(b, head + 18),
            bbox: [s16(b, head + 36), s16(b, head + 38), s16(b, head + 40), s16(b, head + 42)],
            longLoca: s16(b, head + 50) === 1,
            numGlyphs: u16(b, tables.maxp.offset + 4),
            numHMetrics: u16(b, hhea + 34),
            ascent: s16(b, hhea + 4), descent: s16(b, hhea + 6), capHeight: 0, italicAngle: 0
        };
        if (tables["OS/2"]) {
            var os2 = tables["OS/2"].offset;
            font.ascent = s16(b, os2 + 68); font.descent = s16(b, os2 + 70);
            if (u16(b, os2) >= 2 && tables["OS/2"].length >= 90) font.capHeight = s16(b, os2 + 88);
        }
        if (!font.capHeight) font.capHeight = font.ascent;
        if (tables.post) font.italicAngle = s16(b, tables.post.offset + 4);
        // cmap: a Unicode subtable, format 12 (full range) preferred over format 4 (BMP)
        var cmap = tables.cmap.offset, best = null, bestFmt = 0;
        for (var c = 0, nc = u16(b, cmap + 2); c < nc; c++) {
            var pid = u16(b, cmap + 4 + c * 8), eid = u16(b, cmap + 6 + c * 8), off = cmap + u32(b, cmap + 8 + c * 8);
            var fmt = u16(b, off);
            var unicode = pid === 0 || (pid === 3 && (eid === 1 || eid === 10));
            if (!unicode || (fmt !== 4 && fmt !== 12)) continue;
            if (fmt > bestFmt) { best = off; bestFmt = fmt; }
        }
        if (!best) throw new Error("pdfexport: the Unicode font has no Unicode character map");
        var lookup = {};
        font.gidFor = function (cp) {
            if (lookup[cp] !== undefined) return lookup[cp];
            var g = 0;
            if (bestFmt === 12) {
                var groups = u32(b, best + 12);
                for (var k = 0; k < groups; k++) {
                    var go = best + 16 + k * 12, start = u32(b, go), end = u32(b, go + 4);
                    if (cp >= start && cp <= end) { g = u32(b, go + 8) + (cp - start); break; }
                }
            } else if (cp <= 0xFFFF) {
                var segX2 = u16(b, best + 6), ends = best + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
                for (var s = 0; s < segX2 / 2; s++) {
                    if (cp > u16(b, ends + s * 2)) continue;
                    var st = u16(b, starts + s * 2);
                    if (cp < st) break;
                    var ro = u16(b, ranges + s * 2);
                    if (!ro) g = (cp + s16(b, deltas + s * 2)) & 0xFFFF;
                    else {
                        var gi = u16(b, ranges + s * 2 + ro + (cp - st) * 2);
                        g = gi ? (gi + s16(b, deltas + s * 2)) & 0xFFFF : 0;
                    }
                    break;
                }
            }
            if (g >= font.numGlyphs) g = 0;
            lookup[cp] = g;
            return g;
        };
        font.advance = function (gid) {
            var hm = font.tables.hmtx.offset;
            var i2 = gid < font.numHMetrics ? gid : font.numHMetrics - 1;
            return u16(b, hm + i2 * 4);
        };
        parsedFonts.push({ bytes: b, font: font });
        if (parsedFonts.length > 4) parsedFonts.shift();
        return font;
    }

    function glyphRange(font, gid) {
        var b = font.bytes, loca = font.tables.loca.offset;
        var a = font.longLoca ? u32(b, loca + gid * 4) : u16(b, loca + gid * 2) * 2;
        var z = font.longLoca ? u32(b, loca + gid * 4 + 4) : u16(b, loca + gid * 2 + 2) * 2;
        return [font.tables.glyf.offset + a, z - a];
    }

    // A font with every glyph ID kept but only the used outlines (plus the components of composite glyphs and
    // .notdef); tables a CIDFontType2 needs: head, hhea, hmtx, maxp, loca, glyf, and the hinting tables if present.
    function subsetTrueType(font, usedGids) {
        var b = font.bytes, keep = { 0: true }, stack = [];
        for (var k in usedGids) { keep[k] = true; stack.push(+k); }
        while (stack.length) {
            var gid = stack.pop(), r = glyphRange(font, gid);
            if (r[1] < 10 || s16(b, r[0]) >= 0) continue;           // empty or simple glyph
            var p = r[0] + 10, more = true;
            while (more) {
                var flags = u16(b, p), comp = u16(b, p + 2);
                if (!keep[comp]) { keep[comp] = true; stack.push(comp); }
                p += 4 + ((flags & 1) ? 4 : 2) + ((flags & 8) ? 2 : (flags & 0x40) ? 4 : (flags & 0x80) ? 8 : 0);
                more = !!(flags & 0x20);
            }
        }
        var glyfParts = [], locaOut = new Uint8Array((font.numGlyphs + 1) * 4), at = 0;
        function put32(arr, o, v) { arr[o] = (v >>> 24) & 255; arr[o + 1] = (v >>> 16) & 255; arr[o + 2] = (v >>> 8) & 255; arr[o + 3] = v & 255; }
        for (var g = 0; g < font.numGlyphs; g++) {
            put32(locaOut, g * 4, at);
            if (!keep[g]) continue;
            var gr = glyphRange(font, g);
            if (gr[1] <= 0) continue;
            var len = (gr[1] + 3) & ~3;
            var part = new Uint8Array(len); part.set(b.subarray(gr[0], gr[0] + gr[1]));
            glyfParts.push(part); at += len;
        }
        put32(locaOut, font.numGlyphs * 4, at);
        var glyfOut = new Uint8Array(at), q = 0;
        for (var gp = 0; gp < glyfParts.length; gp++) { glyfOut.set(glyfParts[gp], q); q += glyfParts[gp].length; }
        var out = {};
        ["head", "hhea", "hmtx", "maxp", "cvt ", "fpgm", "prep"].forEach(function (t) {
            if (font.tables[t]) out[t] = b.slice(font.tables[t].offset, font.tables[t].offset + font.tables[t].length);
        });
        out.head[50] = 0; out.head[51] = 1;                      // indexToLocFormat: long
        out.head[8] = out.head[9] = out.head[10] = out.head[11] = 0;   // checkSumAdjustment, set below
        out.loca = locaOut; out.glyf = glyfOut;
        var tags = Object.keys(out).sort(), numT = tags.length, dirLen = 12 + numT * 16, total = dirLen;
        tags.forEach(function (t) { total += (out[t].length + 3) & ~3; });
        var f = new Uint8Array(total);
        put32(f, 0, 0x00010000);
        var es = Math.floor(Math.log(numT) / Math.LN2), sr = Math.pow(2, es) * 16;
        f[4] = numT >> 8; f[5] = numT & 255; f[6] = sr >> 8; f[7] = sr & 255; f[8] = es >> 8; f[9] = es & 255;
        var rs = numT * 16 - sr; f[10] = rs >> 8; f[11] = rs & 255;
        function checksum(arr) { var sum = 0; for (var i = 0; i < arr.length; i += 4) sum = (sum + (((arr[i] << 24) >>> 0) + ((arr[i + 1] || 0) << 16) + ((arr[i + 2] || 0) << 8) + (arr[i + 3] || 0))) >>> 0; return sum; }
        var pos = dirLen, headPos = 0;
        tags.forEach(function (t, i) {
            var rec = 12 + i * 16;
            for (var c = 0; c < 4; c++) f[rec + c] = t.charCodeAt(c);
            put32(f, rec + 4, checksum(out[t])); put32(f, rec + 8, pos); put32(f, rec + 12, out[t].length);
            f.set(out[t], pos);
            if (t === "head") headPos = pos;
            pos += (out[t].length + 3) & ~3;
        });
        put32(f, headPos + 8, (0xB1B0AFBA - checksum(f)) >>> 0);
        return f;
    }

    function hex4(n) { return ("000" + n.toString(16).toUpperCase()).slice(-4); }
    // The glyph IDs of a string in the active Unicode font, as a PDF hex string; records each for the ToUnicode map.
    function uniHex(str) {
        var out = "";
        for (var i = 0; i < str.length; i++) {
            var cp = str.codePointAt(i);
            if (cp > 0xFFFF) i++;
            var gid = activeUni.font.gidFor(cp);
            activeUni.used[gid] = cp;
            out += hex4(gid);
        }
        return "<" + out + ">";
    }
    function uniWidth(str, size) {
        var total = 0;
        for (var i = 0; i < str.length; i++) {
            var cp = str.codePointAt(i);
            if (cp > 0xFFFF) i++;
            total += activeUni.font.advance(activeUni.font.gidFor(cp));
        }
        return total * size / activeUni.font.units;
    }
    // Can the base fonts draw this character? (the same test toWinAnsi applies)
    function winEncodable(ch) { return ch === "?" || toWinAnsi(ch).indexOf("?") < 0; }
    // East Asian characters: a line may break between any two of them.
    function breaksAnywhere(cp) {
        return (cp >= 0x2E80 && cp <= 0x9FFF) || (cp >= 0xAC00 && cp <= 0xD7AF) || (cp >= 0xF900 && cp <= 0xFAFF) ||
            (cp >= 0xFF00 && cp <= 0xFFEF) || (cp >= 0x3000 && cp <= 0x303F) || (cp >= 0x20000 && cp <= 0x2FA1F);
    }
    // Splits a token into pieces drawn by the base fonts ({ text }) and by the Unicode font ({ text, uni: true }),
    // with every East Asian character its own piece so a line can break there.
    function uniPieces(tok) {
        var pieces = [], cur = null;
        for (var i = 0; i < tok.length; i++) {
            var cp = tok.codePointAt(i), ch = String.fromCodePoint(cp);
            if (cp > 0xFFFF) i++;
            var uni = !winEncodable(ch) && activeUni.font.gidFor(cp) !== 0;
            if (uni && breaksAnywhere(cp)) { cur = null; pieces.push({ text: ch, uni: true }); continue; }
            if (!cur || cur.uni !== uni) { cur = { text: "", uni: uni }; pieces.push(cur); }
            cur.text += ch;
        }
        return pieces;
    }

    // ------------------------------------------------------------ PDF string
    //
    // WinAnsiEncoding covers Latin-1 plus the printable range of CP1252. A
    // character outside it has no glyph in a base-14 font, so it is transliterated
    // rather than written as a byte the viewer would render as garbage.
    var WINANSI_EXTRA = {
        0x20AC: 128, 0x201A: 130, 0x0192: 131, 0x201E: 132, 0x2026: 133, 0x2020: 134,
        0x2021: 135, 0x02C6: 136, 0x2030: 137, 0x0160: 138, 0x2039: 139, 0x0152: 140,
        0x017D: 142, 0x2018: 145, 0x2019: 146, 0x201C: 147, 0x201D: 148, 0x2022: 149,
        0x2013: 150, 0x2014: 151, 0x02DC: 152, 0x2122: 153, 0x0161: 154, 0x203A: 155,
        0x0153: 156, 0x017E: 158, 0x0178: 159
    };
    function toWinAnsi(str) {
        var out = "";
        for (var i = 0; i < str.length; i++) {
            var cp = str.charCodeAt(i);
            if (cp < 256) { out += String.fromCharCode(cp); continue; }
            var mapped = WINANSI_EXTRA[cp];
            if (mapped) { out += String.fromCharCode(mapped); continue; }
            // Common shapes that would otherwise become "?" for no good reason.
            if (cp === 0x00A0) { out += " "; continue; }
            if (cp >= 0x2000 && cp <= 0x200A) { out += " "; continue; }
            if (cp === 0x2212) { out += "-"; continue; }
            // 2026-10-26 invisible format characters (zero-width space / joiners, word joiner, BOM) have no glyph to
            // draw: drop them instead of printing "?" in the middle of Latin text.
            if ((cp >= 0x200B && cp <= 0x200F) || cp === 0x2060 || cp === 0xFEFF) continue;
            out += "?";
        }
        return out;
    }
    // The characters (each once, in document order) that toWinAnsi would write as "?": what a vector export of the
    // serialized document, its title and its running header / footer would lose.
    function unsupportedText(options, ignoreFont) {
        var text = "";
        try {
            var box = document.createElement("div");
            box.innerHTML = __RTE_TT(editor.getHTMLCode() || "");
            text = box.textContent || "";
        } catch (e) { text = ""; }
        text += " " + (options.title || config.pdfExportTitle || "") + " " + (options.headerText || config.pdfExportHeader || "") +
            " " + (options.footerText || config.pdfExportFooter || "");
        var seen = {}, out = "";
        var uniFont = ignoreFont ? null : uniFontFrom(options);
        for (var i = 0; i < text.length; i++) {
            var ch = text.charAt(i), code = text.charCodeAt(i);
            if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length) { ch = text.substr(i, 2); i++; }
            if (seen[ch] || ch === "?") continue;
            if (toWinAnsi(ch).indexOf("?") >= 0 && !(uniFont && uniFont.gidFor(ch.codePointAt(0)))) { seen[ch] = 1; out += ch; }
        }
        return out;
    }
    // 2026-10-26 A PDF text string (title, author, bookmark, alt text, link or comment description) is not drawn with
    // a font, so it can carry any script as UTF-16BE: <FEFF...>. These went through WinAnsi like the page text and a
    // Chinese title, Russian bookmark or Japanese alt text - what a screen reader announces - became "???". Strings
    // WinAnsi can carry keep the plain (...) form. tools/pdf/pdf-unicode-strings.mjs
    function pdfText(str) {
        var t = String(str == null ? "" : str);
        var win = toWinAnsi(t);
        if (win.indexOf("?") < 0 || win.split("?").length === t.split("?").length) return "(" + escapeString(win) + ")";
        var hex = "<FEFF";
        for (var i = 0; i < t.length; i++) hex += ("000" + t.charCodeAt(i).toString(16).toUpperCase()).slice(-4);
        return hex + ">";
    }
    // A URI is ASCII: percent-encode anything else (it became "?").
    function pdfUri(href) {
        return String(href || "").replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\x00-\x7F]/g, function (c) {
            try { return encodeURIComponent(c); } catch (e) { return ""; }
        });
    }
    function escapeString(str) {
        return str.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    }

    // ------------------------------------------------------------- PDF writer
    function PdfWriter() {
        this.objects = [];        // 1-based; objects[i] is the body of object i+1
    }
    PdfWriter.prototype.alloc = function () { this.objects.push(null); return this.objects.length; };
    PdfWriter.prototype.set = function (id, body) { this.objects[id - 1] = body; };
    PdfWriter.prototype.add = function (body) { var id = this.alloc(); this.set(id, body); return id; };

    // Assembled as BYTES, not as a string: a content stream can hold binary
    // (an embedded JPEG), and /Length plus the xref offsets are byte counts. A
    // string-based assembler is correct right up until the first image, then
    // silently produces a file no reader will open.
    PdfWriter.prototype.build = function (rootId, infoId) {
        var chunks = [], length = 0;
        function push(part) {
            var bytes = (typeof part === "string") ? latin1Bytes(part) : part;
            chunks.push(bytes); length += bytes.length;
            return length;
        }
        push("%PDF-1.4\n");
        // A binary comment marks the file as binary for transfer agents.
        push(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));

        var offsets = [];
        for (var i = 0; i < this.objects.length; i++) {
            offsets[i] = length;
            push((i + 1) + " 0 obj\n");
            var body = this.objects[i];
            if (body && body.stream) {
                var data = (typeof body.stream === "string") ? latin1Bytes(body.stream) : body.stream;
                push(body.dict.replace("/Length 0", "/Length " + data.length) + "\nstream\n");
                push(data);
                push("\nendstream\n");
            } else {
                push(body + "\n");
            }
            push("endobj\n");
        }
        var xrefAt = length;
        var xref = "xref\n0 " + (this.objects.length + 1) + "\n0000000000 65535 f \n";
        for (var j = 0; j < offsets.length; j++) {
            xref += pad10(offsets[j]) + " 00000 n \n";
        }
        push(xref);
        push("trailer\n<< /Size " + (this.objects.length + 1) + " /Root " + rootId + " 0 R /Info " + infoId + " 0 R >>\n");
        push("startxref\n" + xrefAt + "\n%%EOF\n");

        var out = new Uint8Array(length), at = 0;
        for (var k = 0; k < chunks.length; k++) { out.set(chunks[k], at); at += chunks[k].length; }
        return out;
    };
    function pad10(n) { var s = String(n); while (s.length < 10) s = "0" + s; return s; }
    function latin1Bytes(str) {
        var out = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xFF;
        return out;
    }

    // ---------------------------------------------------------------- layout
    //
    // A flat list of positioned draw operations is produced first, then paged.
    // Keeping measurement and pagination apart is what makes "keep this heading
    // with the paragraph under it" and "repeat a table header row" possible at
    // all; doing both in one pass forces every decision to be final immediately.

    function styleOf(node, inherited) {
        var s = {
            bold: inherited.bold, italic: inherited.italic, underline: inherited.underline,
            strike: inherited.strike, size: inherited.size, color: inherited.color,
            mono: inherited.mono, link: inherited.link, lang: inherited.lang, comment: inherited.comment || null
        };
        // 2026-10-17 a run's language: the nearest lang attribute. tools/pdf/inline-lang.mjs
        var nodeLang = node.getAttribute ? node.getAttribute("lang") : "";
        if (nodeLang) s.lang = nodeLang;
        var tag = node.tagName ? node.tagName.toLowerCase() : "";
        if (tag === "b" || tag === "strong") s.bold = true;
        if (tag === "i" || tag === "em") s.italic = true;
        if (tag === "u" || tag === "ins") s.underline = true;
        if (tag === "s" || tag === "strike" || tag === "del") s.strike = true;
        if (tag === "code" || tag === "kbd" || tag === "samp" || tag === "pre") s.mono = true;
        if (tag === "a" && node.getAttribute("href")) { s.link = node.getAttribute("href"); s.color = [0, 0.33, 0.8]; s.underline = true; }
        if (node.getAttribute && node.getAttribute("data-comment")) s.comment = { text: node.getAttribute("data-comment"), author: node.getAttribute("data-comment-author") || "" };
        if (tag === "sup" || tag === "sub") s.size = s.size * 0.75;

        var css = node.style;
        if (css) {
            if (/bold|^[6-9]00$/.test(css.fontWeight || "")) s.bold = true;
            if (css.fontStyle === "italic" || css.fontStyle === "oblique") s.italic = true;
            if ((css.textDecorationLine || css.textDecoration || "").indexOf("underline") >= 0) s.underline = true;
            if ((css.textDecorationLine || css.textDecoration || "").indexOf("line-through") >= 0) s.strike = true;
            if (css.color) { var c = parseColor(css.color); if (c) s.color = c; }
            if (css.fontSize) { var fs = toPoints(css.fontSize, null); if (fs) s.size = fs; }
        }
        return s;
    }

    function parseColor(value) {
        var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.replace(/\s/g, ""));
        if (m) {
            var hex = m[1];
            if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
            return [parseInt(hex.substr(0, 2), 16) / 255, parseInt(hex.substr(2, 2), 16) / 255, parseInt(hex.substr(4, 2), 16) / 255];
        }
        var rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);
        if (rgb) return [rgb[1] / 255, rgb[2] / 255, rgb[3] / 255];
        return null;
    }

    var HEADING_SCALE = { h1: 2, h2: 1.6, h3: 1.35, h4: 1.15, h5: 1, h6: 0.9 };

    function Layout(geom, baseSize, familyKey) {
        this.geom = geom;
        this.baseSize = baseSize;
        this.family = familyKey;
        this.contentWidth = geom.width - geom.margin.left - geom.margin.right;
        this.blocks = [];          // { type, ... } in document order
    }

    // Collect the inline runs of a block, splitting into words for wrapping.
    Layout.prototype.runsOf = function (node, inherited) {
        var runs = [];
        var self = this;
        (function walk(n, style) {
            for (var i = 0; i < n.childNodes.length; i++) {
                var c = n.childNodes[i];
                if (c.nodeType === 3) {
                    var text = (c.nodeValue || "").replace(/\s+/g, " ");
                    if (text) runs.push({ text: text, style: style });
                    continue;
                }
                if (c.nodeType !== 1) continue;
                var tag = c.tagName.toLowerCase();
                if (tag === "br") { runs.push({ br: true, style: style }); continue; }
                if (tag === "img") { runs.push({ img: c, style: style }); continue; }
                if (tag === "script" || tag === "style") continue;
                walk(c, styleOf(c, style));
            }
        })(node, inherited);
        return runs;
    };

    // Break runs into laid-out lines that fit `width`.
    Layout.prototype.wrap = function (runs, width, lineHeightFactor) {
        var lines = [], line = [], used = 0, self = this;
        var maxSize = this.baseSize;

        function flush() {
            // Trailing spaces must not count toward a line's width, or a
            // right-aligned or centred line drifts by the width of the space.
            while (line.length && /^\s+$/.test(line[line.length - 1].text || "")) line.pop();
            lines.push({ parts: line, width: used, size: maxSize });
            line = []; used = 0; maxSize = self.baseSize;
        }

        for (var r = 0; r < runs.length; r++) {
            var run = runs[r];
            if (run.br) { flush(); continue; }
            if (run.img) {
                var dims = imageDims(run.img, width);
                if (line.length) flush();
                lines.push({ parts: [{ img: run.img, w: dims.w, h: dims.h, style: run.style }], width: dims.w, size: dims.h, image: true });
                continue;
            }
            var styleIndex = (run.style.bold ? 1 : 0) | (run.style.italic ? 2 : 0);
            var family = run.style.mono ? "courier" : this.family;
            // Split keeping the separators, so a space that ends a line can be
            // dropped while a space between two words on the same line is kept.
            var tokens = run.text.split(/(\s+)/);
            for (var t = 0; t < tokens.length; t++) {
                var whole = tokens[t];
                if (!whole) continue;
                var pieces = activeUni && !/^\s+$/.test(whole) ? uniPieces(whole) : [{ text: whole, uni: false }];
                for (var pc = 0; pc < pieces.length; pc++) {
                    var tok = pieces[pc].text, isUni = pieces[pc].uni;
                    var w = isUni ? uniWidth(tok, run.style.size) : textWidth(toWinAnsi(tok), family, styleIndex, run.style.size);
                    // a piece that continues a word (no space before it) may still wrap: CJK breaks anywhere
                    if (used + w > width && line.length && !/^\s+$/.test(tok) && (pc === 0 || isUni)) {
                        flush();
                        // A wrapped line never starts with the space that caused it.
                        if (/^\s+$/.test(tok)) continue;
                    }
                    line.push({ text: tok, style: run.style, family: family, styleIndex: styleIndex, w: w, uni: isUni });
                    used += w;
                    if (run.style.size > maxSize) maxSize = run.style.size;
                }
            }
        }
        if (line.length) flush();
        if (!lines.length) lines.push({ parts: [], width: 0, size: this.baseSize });
        for (var i = 0; i < lines.length; i++) lines[i].height = lines[i].image ? lines[i].size : lines[i].size * lineHeightFactor;
        return lines;
    };

    function imageDims(img, maxWidth) {
        var w = img.naturalWidth || img.width || 0;
        var h = img.naturalHeight || img.height || 0;
        if (!w || !h) return { w: 0, h: 0 };
        var pw = w * 0.75, ph = h * 0.75;                 // CSS px -> points
        if (pw > maxWidth) { ph = ph * maxWidth / pw; pw = maxWidth; }
        return { w: pw, h: ph };
    }

    // ------------------------------------------------------------ block walk
    Layout.prototype.run = function (root) {
        var self = this;
        var base = { bold: false, italic: false, underline: false, strike: false, size: this.baseSize, color: [0, 0, 0], mono: false, link: null };

    // A block indented in the editor carries margin-left (or padding-left, per
    // indentUseMargin). Before 2026-09-04 the PDF honoured an indent only when
    // it was spelled <blockquote>, because that was the only way the editor
    // could express one. Points, since that is the PDF's unit: 1px = 0.75pt.
    function cssIndentPt(node) {
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
        return px * 0.75;
    }

        // The language a block is written in: its own lang, the nearest ancestor's inside the content, or - when its
        // whole text is one <span lang> - that span's. "" when none is set.
        function blockLang(node) {
            for (var n = node; n && n.nodeType === 1 && n.tagName.toLowerCase() !== "body"; n = n.parentNode) {
                if (n.getAttribute("lang")) return n.getAttribute("lang");
            }
            var el = null, k = node.childNodes;
            for (var i = 0; i < k.length; i++) {
                if (k[i].nodeType === 3 && k[i].nodeValue.replace(/[\s\u200b\u00a0]/g, "")) return "";
                if (k[i].nodeType === 1) { if (el) return ""; el = k[i]; }
            }
            return el && el.getAttribute("lang") ? el.getAttribute("lang") : "";
        }
        function block(node, style, indent, listMarker, listId, listOrdered, roleOverride) {
            var tag = node.tagName.toLowerCase();
            var s = styleOf(node, style);
            var align = "left";
            var ta = (node.style && node.style.textAlign) || "";
            if (ta === "center" || ta === "right" || ta === "justify") align = ta;

            if (HEADING_SCALE[tag]) { s.size = self.baseSize * HEADING_SCALE[tag]; s.bold = true; }
            if (tag === "pre") s.mono = true;

            var width = self.contentWidth - indent;
            var runs = self.runsOf(node, s);
            var lines = self.wrap(runs, width, tag === "pre" ? 1.25 : 1.4);
            self.blocks.push({
                type: "text", lines: lines, indent: indent, align: align,
                // 2026-10-15 the block's own language, for /Lang on its structure element. tools/pdf/paragraph-lang.mjs
                lang: blockLang(node),
                spaceBefore: HEADING_SCALE[tag] ? s.size * 0.6 : self.baseSize * 0.35,
                spaceAfter: HEADING_SCALE[tag] ? s.size * 0.3 : self.baseSize * 0.35,
                marker: listMarker || null, markerStyle: s,
                // A heading alone at the foot of a page is the classic ugly
                // break; it is pinned to what follows it.
                keepWithNext: !!HEADING_SCALE[tag],
                rule: tag === "blockquote" ? "quote" : null,
                // Semantics for the tag tree. A PDF whose text is selectable but
                // untagged still fails an accessibility audit: assistive
                // technology gets a flat stream with no headings, no list
                // structure and no reliable reading order.
                // roleOverride carries the quotation down to the paragraphs INSIDE a
                // <blockquote>. The role was only ever emitted for a blockquote
                // holding inline text directly - and the editor writes
                // <blockquote><p>...</p></blockquote>, so in practice every
                // blockquote we produce was tagged /P and the quotation was absent
                // from the accessibility tree we publish claims about.
                role: roleOverride || (HEADING_SCALE[tag] ? "H" + tag.charAt(1) : (tag === "blockquote" ? "BlockQuote" : "P")),
                listId: listId || null, listOrdered: !!listOrdered
            });
        }

        function walk(node, style, indent, roleOverride) {
            for (var i = 0; i < node.childNodes.length; i++) {
                var c = node.childNodes[i];
                if (c.nodeType === 3) {
                    if (!(c.nodeValue || "").trim()) continue;
                    // Loose text directly under the root still deserves a block.
                    self.blocks.push({ type: "text", lines: self.wrap([{ text: c.nodeValue.replace(/\s+/g, " "), style: style }], self.contentWidth - indent, 1.4), indent: indent, align: "left", spaceBefore: 0, spaceAfter: self.baseSize * 0.35 });
                    continue;
                }
                if (c.nodeType !== 1) continue;
                var tag = c.tagName.toLowerCase();
                if (tag === "script" || tag === "style" || tag === "noscript") continue;

                if (c.getAttribute && c.getAttribute("data-rte-page-break") !== null) { self.blocks.push({ type: "pagebreak" }); continue; }
                if (c.style && /always|page/.test(c.style.pageBreakBefore || c.style.breakBefore || "")) self.blocks.push({ type: "pagebreak" });

                if (tag === "hr") { self.blocks.push({ type: "rule", indent: indent }); continue; }
                if (tag === "ul" || tag === "ol") {
                    var counter = parseInt(c.getAttribute("start"), 10);
                    if (isNaN(counter)) counter = 1;
                    // 2026-10-04 a lettered / Roman list is numbered the way the editor shows it (it was
                    // always 1. 2. 3.). tools/pdf/list-markers.mjs
                    var lst = String((c.style && c.style.listStyleType) || "").toLowerCase(), typ = c.getAttribute("type") || "";
                    var kind = /^(lower-alpha|lower-latin)$/.test(lst) || typ === "a" ? "a"
                        : /^(upper-alpha|upper-latin)$/.test(lst) || typ === "A" ? "A"
                        : lst === "lower-roman" || typ === "i" ? "i"
                        : lst === "upper-roman" || typ === "I" ? "I" : "1";
                    // Every item of one list shares an id so the tag tree can
                    // rebuild a single <L> around them; without it each item
                    // becomes an isolated paragraph and a screen reader never
                    // announces "list, 4 items".
                    var listId = "L" + (self.listSeq = (self.listSeq || 0) + 1);
                    for (var li = 0; li < c.childNodes.length; li++) {
                        var item = c.childNodes[li];
                        if (item.nodeType !== 1 || item.tagName.toLowerCase() !== "li") continue;
                        var marker = tag === "ol" ? listNumber(counter++, kind) + "." : "\u2022";
                        // 2026-10-15 a task item shows whether it is done: every item got the plain bullet, so a printed
                        // checklist lost every tick. The standard fonts have no ballot box, so "[x]" / "[ ]".
                        // tools/pdf/task-list-marks.mjs
                        if (c.classList && c.classList.contains("rte-task-list")) marker = item.getAttribute("data-checked") === "true" ? "[x]" : "[ ]";
                        // The item's own text, then any nested list one level in.
                        block(item, styleOf(item, style), indent + self.baseSize * 1.6, marker, listId, tag === "ol");
                        walkNestedLists(item, styleOf(item, style), indent + self.baseSize * 1.6);
                    }
                    continue;
                }
                if (tag === "table") { self.table(c, styleOf(c, style), indent); continue; }
                if (tag === "img") {
                    var dims = imageDims(c, self.contentWidth - indent);
                    if (dims.w) self.blocks.push({ type: "text", role: "Figure", alt: c.getAttribute("alt") || "", lines: [{ parts: [{ img: c, w: dims.w, h: dims.h, style: style }], width: dims.w, size: dims.h, height: dims.h, image: true }], indent: indent, align: "left", spaceBefore: 4, spaceAfter: 4 });
                    continue;
                }
                if (isBlockTag(tag)) {
                    var own = (tag === "blockquote" ? self.baseSize * 1.5 : 0) + cssIndentPt(c);
                    var childRole = (tag === "blockquote") ? "BlockQuote" : roleOverride;
                    // 2026-10-15 a block holding just an image - the shape the editor gives every inserted picture,
                    // <p><img></p> - is a Figure with its alt text. Only an <img> sitting directly at block level was;
                    // inside a <p> it was an inline run, so the PDF had no Figure and no /Alt (WCAG 1.1.1, PDF/UA).
                    // tools/pdf/figure-alt.mjs
                    var soleImgs = c.getElementsByTagName("img");
                    if (soleImgs.length === 1 && !(c.textContent || "").replace(/[\s\u200b\u00a0]/g, "") && !hasBlockChildren(c)) {
                        var fdims = imageDims(soleImgs[0], self.contentWidth - indent - own);
                        if (fdims.w) {
                            var falign = String((c.style && c.style.textAlign) || "").toLowerCase();
                            self.blocks.push({ type: "text", role: "Figure", alt: soleImgs[0].getAttribute("alt") || "", lines: [{ parts: [{ img: soleImgs[0], w: fdims.w, h: fdims.h, style: style }], width: fdims.w, size: fdims.h, height: fdims.h, image: true }], indent: indent + own, align: falign === "center" || falign === "right" ? falign : "left", spaceBefore: 4, spaceAfter: 4 });
                            continue;
                        }
                    }
                    if (hasBlockChildren(c)) { walk(c, styleOf(c, style), indent + own, childRole); continue; }
                    block(c, style, indent + own, null, null, false, childRole);
                    continue;
                }
                // Inline content sitting directly under a container.
                block(c, style, indent, null);
            }
        }

        function walkNestedLists(item, style, indent) {
            for (var i = 0; i < item.childNodes.length; i++) {
                var c = item.childNodes[i];
                if (c.nodeType !== 1) continue;
                var tag = c.tagName.toLowerCase();
                if (tag === "ul" || tag === "ol") walk({ childNodes: [c] }, style, indent);
            }
        }

        walk(root, base, 0);
        return this.blocks;
    };

    function isBlockTag(tag) {
        return /^(p|div|h[1-6]|blockquote|pre|section|article|header|footer|main|aside|figure|figcaption|dl|dd|dt|li|address)$/.test(tag);
    }
    function hasBlockChildren(node) {
        for (var i = 0; i < node.childNodes.length; i++) {
            var c = node.childNodes[i];
            if (c.nodeType === 1 && (isBlockTag(c.tagName.toLowerCase()) || /^(ul|ol|table|hr)$/.test(c.tagName.toLowerCase()))) return true;
        }
        return false;
    }

    Layout.prototype.table = function (node, style, indent) {
        var self = this;
        var rows = [];
        var trs = node.getElementsByTagName("tr");
        var maxCells = 0;
        // 2026-10-15 rowspan: covered[col] = rows a cell above still covers there. Cells in the rows below skip those
        // columns (they were placed from column 0, shifting a row left under the wrong header), and each covered
        // position becomes an empty placeholder cell so the grid stays aligned. tools/pdf/table-rowspan.mjs
        var covered = {};
        for (var r = 0; r < trs.length; r++) {
            var cells = [];
            for (var c = 0; c < trs[r].childNodes.length; c++) {
                var cell = trs[r].childNodes[c];
                if (cell.nodeType !== 1) continue;
                var tag = cell.tagName.toLowerCase();
                if (tag !== "td" && tag !== "th") continue;
                // 2026-10-15 colspan: a cell starts at its grid column and spans its columns. tools/pdf/table-colspan.mjs
                var span = Math.max(1, Math.min(50, parseInt(cell.getAttribute("colspan"), 10) || 1));
                var rspan = Math.max(1, Math.min(500, parseInt(cell.getAttribute("rowspan"), 10) || 1));
                cells.push({ node: cell, header: tag === "th", span: span, rowspan: rspan });
            }
            var placed = [], gridCols = 0;
            for (var gc = 0; gc < cells.length; gc++) {
                while (covered[gridCols] > 0) { placed.push({ placeholder: true, start: gridCols, span: 1, header: false }); gridCols++; }
                cells[gc].start = gridCols;
                placed.push(cells[gc]);
                if (cells[gc].rowspan > 1) for (var rc = gridCols; rc < gridCols + cells[gc].span; rc++) covered[rc] = cells[gc].rowspan;
                gridCols += cells[gc].span;
            }
            // covered columns after the row's last cell
            for (var tail in covered) if (+tail >= gridCols && covered[tail] > 0) { placed.push({ placeholder: true, start: +tail, span: 1, header: false }); if (+tail + 1 > gridCols) gridCols = +tail + 1; }
            // this row is done: each covering cell has one row fewer left (a cell covering from THIS row still needs
            // its own count, so it was set to rowspan and drops to rowspan - 1 here)
            for (var dc in covered) { covered[dc]--; if (covered[dc] <= 0) delete covered[dc]; }
            placed.sort(function (p1, p2) { return p1.start - p2.start; });
            cells = cells.length ? placed : cells;
            if (cells.length) { rows.push(cells); if (gridCols > maxCells) maxCells = gridCols; }
        }
        if (!rows.length) return;

        var width = this.contentWidth - indent;
        var colWidth = width / maxCells;
        // 2026-10-15 column widths follow the <colgroup> (% or px), scaled to the table's width on the page: every
        // table was split into equal columns. A table without one keeps equal columns. tools/pdf/table-col-widths.mjs
        var colWidths = [], cg = [], cw = 0;
        for (var ck = 0; ck < node.children.length; ck++) if (node.children[ck].tagName && node.children[ck].tagName.toLowerCase() === "colgroup") {
            for (var cj = 0; cj < node.children[ck].children.length; cj++) if (node.children[ck].children[cj].tagName.toLowerCase() === "col") cg.push(node.children[ck].children[cj]);
        }
        if (cg.length === maxCells) {
            for (var cq = 0; cq < cg.length; cq++) {
                var cv = (cg[cq].style && cg[cq].style.width) || cg[cq].getAttribute("width") || "", cm = /^\s*([\d.]+)(%|px)?\s*$/.exec(cv);
                if (!cm || !(parseFloat(cm[1]) > 0)) { colWidths = []; break; }
                colWidths.push(parseFloat(cm[1]));
            }
            for (var cs2 = 0; cs2 < colWidths.length; cs2++) cw += colWidths[cs2];
            if (cw > 0) colWidths = colWidths.map(function (v) { return v / cw * width; });
        }
        if (colWidths.length !== maxCells) { colWidths = []; for (var ce = 0; ce < maxCells; ce++) colWidths.push(colWidth); }
        function spanWidth(start, span) { var s = 0; for (var sw = start; sw < start + span && sw < colWidths.length; sw++) s += colWidths[sw]; return s; }
        var pad = 4;
        var laid = [];
        for (var i = 0; i < rows.length; i++) {
            var out = [], tallest = 0;
            for (var j = 0; j < rows[i].length; j++) {
                if (rows[i][j].placeholder) { out.push({ lines: [], header: false, start: rows[i][j].start, span: 1, placeholder: true }); continue; }
                var cs = styleOf(rows[i][j].node, style);
                if (rows[i][j].header) cs.bold = true;
                var lines = self.wrap(self.runsOf(rows[i][j].node, cs), spanWidth(rows[i][j].start, rows[i][j].span) - pad * 2, 1.35);
                var h = 0;
                for (var k = 0; k < lines.length; k++) h += lines[k].height;
                if (h > tallest) tallest = h;
                out.push({ lines: lines, header: rows[i][j].header, start: rows[i][j].start, span: rows[i][j].span, rowspan: rows[i][j].rowspan || 1 });
            }
            laid.push({ cells: out, height: tallest + pad * 2, header: rows[i][0] && !rows[i][0].placeholder && rows[i][0].header });
        }
        this.blocks.push({
            type: "table", rows: laid, colWidth: colWidth, colWidths: colWidths, cols: maxCells,
            indent: indent, pad: pad,
            spaceBefore: this.baseSize * 0.5, spaceAfter: this.baseSize * 0.5
        });
    };

    // ------------------------------------------------------------- rendering
    // 2026-10-15 the document language, read by the tagger to mark blocks in other languages
    var pdfDocLang = "en";
    // Marks each live comment's text in the copy as a data-comment span (see buildPdf).
    function markCommentsForPdf(host) {
        var live = editor.getEditable().querySelectorAll("[data-comment-id]");
        if (!live.length || !editor.reviewLedger) return;
        var ledger = {};
        editor.reviewLedger.list().forEach(function (e) { if (e.changeType === "comment") ledger[e.id] = e; });
        var done = {};
        for (var i = 0; i < live.length; i++) {
            var id = live[i].getAttribute("data-comment-id"), entry = ledger[id], phrase = live[i].textContent || "";
            if (!entry || !phrase || done[id]) continue;
            done[id] = true;
            var w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null, false), tn, at = -1;
            while ((tn = w.nextNode())) { at = tn.data.indexOf(phrase); if (at !== -1) break; }
            if (at === -1) continue;
            var rng = document.createRange();
            rng.setStart(tn, at); rng.setEnd(tn, at + phrase.length);
            var name = (entry.author && entry.author.name) || "RichTextEditor user";
            var mark = document.createElement("span");
            mark.setAttribute("data-comment", entry.text || "");
            mark.setAttribute("data-comment-author", name);
            try { rng.surroundContents(mark); } catch (er) { /* no mark */ }
        }
    }
    function uniFontFrom(options) {
        var src = (options && options.unicodeFont) || config.pdfExportUnicodeFont;
        if (!src) return null;
        try { return parseTrueType(src); }
        catch (e) { if (window.console && console.warn) console.warn(e.message); return null; }
    }
    function buildPdf(options) {
        activeUni = null;
        var uniFont = uniFontFrom(options);
        if (uniFont && unsupportedText(options, true)) activeUni = { font: uniFont, used: {} };
        try { return buildPdfWith(options); } finally { activeUni = null; }
    }
    function buildPdfWith(options) {
        pdfDocLang = String((options && options.lang) || document.documentElement.lang || "en").toLowerCase();
        var familyKey = String(options.font || config.pdfExportFont || "helvetica").toLowerCase();
        if (!FONT_FAMILIES[familyKey]) familyKey = "helvetica";
        var baseSize = Number(options.fontSize || config.pdfExportBaseFontSize || 11);
        if (!isFinite(baseSize) || baseSize <= 0) baseSize = 11;
        var geom = pageGeometry(options);

        // getHTMLCode() is the SERIALIZED document: presentational plugins strip
        // their own chrome from it. Reading the live DOM instead would bake page
        // overlays, watermarks and formatting marks into the PDF.
        var host = document.createElement("div");
        host.innerHTML = __RTE_TT(editor.getHTMLCode() || "");
        var liveLists = editor.getEditable().querySelectorAll("ol,ul"), exportLists = host.querySelectorAll("ol,ul");
        if (liveLists.length === exportLists.length) for (var li = 0; li < liveLists.length; li++) {
            var listStyle = liveLists[li].ownerDocument.defaultView.getComputedStyle(liveLists[li]).listStyleType;
            if (listStyle) exportLists[li].style.listStyleType = listStyle;
        }

        // 2026-10-21 comments reach the PDF as /Text notes: their anchors and text are marked in the copy first,
        // as in the Word export. tools/pdf/comments.mjs
        try { markCommentsForPdf(host); } catch (cmErr) { /* the PDF without notes */ }
        var layout = new Layout(geom, baseSize, familyKey);
        var blocks = layout.run(host);

        var pages = paginate(blocks, geom, baseSize);
        return emit(pages, geom, familyKey, baseSize, options);
    }

    function paginate(blocks, geom, baseSize) {
        var usableTop = geom.height - geom.margin.top;
        var usableBottom = geom.margin.bottom;
        var pages = [], current = [], y = usableTop;

        function newPage() { pages.push(current); current = []; y = usableTop; }

        for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i];
            if (b.type === "pagebreak") { if (current.length) newPage(); continue; }

            if (b.type === "rule") {
                if (y - baseSize < usableBottom) newPage();
                y -= baseSize * 0.6;
                current.push({ op: "rule", y: y, indent: b.indent });
                y -= baseSize * 0.6;
                continue;
            }

            if (b.type === "table") {
                y -= b.spaceBefore;
                for (var r = 0; r < b.rows.length; r++) {
                    var row = b.rows[r];
                    if (y - row.height < usableBottom) {
                        newPage();
                        // Repeat the header row on the continuation page, or the
                        // rest of the table arrives as unlabelled numbers.
                        if (b.rows[0] && b.rows[0].header && r > 0) {
                            current.push({ op: "row", row: b.rows[0], y: y, block: b });
                            y -= b.rows[0].height;
                        }
                    }
                    current.push({ op: "row", row: row, y: y, block: b });
                    y -= row.height;
                }
                y -= b.spaceAfter;
                continue;
            }

            y -= b.spaceBefore;
            for (var l = 0; l < b.lines.length; l++) {
                var line = b.lines[l];
                if (y - line.height < usableBottom) newPage();
                current.push({ op: "line", line: line, y: y, block: b, first: l === 0 });
                y -= line.height;
            }
            y -= b.spaceAfter;

            // keepWithNext: if a heading ended up as the last thing on the page,
            // move it to the next one rather than orphaning it.
            if (b.keepWithNext && current.length && blocks[i + 1] && blocks[i + 1].type !== "pagebreak") {
                var nextHeight = estimateFirstLine(blocks[i + 1]);
                if (y - nextHeight < usableBottom) {
                    var moved = [];
                    while (current.length && current[current.length - 1].block === b) moved.unshift(current.pop());
                    if (current.length) {
                        newPage();
                        for (var m = 0; m < moved.length; m++) {
                            moved[m].y = y;
                            current.push(moved[m]);
                            y -= moved[m].line.height;
                        }
                    } else {
                        // Already at the top of a page: nothing to gain by moving.
                        for (var m2 = 0; m2 < moved.length; m2++) current.push(moved[m2]);
                    }
                }
            }
        }
        if (current.length || !pages.length) pages.push(current);
        return pages;
    }

    function estimateFirstLine(block) {
        if (block.type === "table") return block.rows[0] ? block.rows[0].height : 0;
        if (block.lines && block.lines[0]) return block.lines[0].height;
        return 0;
    }

    // Type0 font over a CIDFontType2 subset: Identity-H codes are glyph IDs, /W carries the widths layout used,
    // and ToUnicode maps each glyph back to its character for copy, search and screen readers.
    function addUnicodeFont(pdf, uni) {
        var font = uni.font, scale = 1000 / font.units;
        var gids = Object.keys(uni.used).map(Number).sort(function (a, b) { return a - b; });
        var sub = subsetTrueType(font, uni.used);
        var fileId = pdf.add({ dict: "<< /Length1 " + sub.length + " /Length 0 >>", stream: sub });
        var name = "/RTEUNI+EmbeddedUnicode";
        var descId = pdf.add("<< /Type /FontDescriptor /FontName " + name + " /Flags 4 /FontBBox [" +
            font.bbox.map(function (v) { return Math.round(v * scale); }).join(" ") + "] /ItalicAngle " + font.italicAngle +
            " /Ascent " + Math.round(font.ascent * scale) + " /Descent " + Math.round(font.descent * scale) +
            " /CapHeight " + Math.round(font.capHeight * scale) + " /StemV 80 /FontFile2 " + fileId + " 0 R >>");
        var w = gids.map(function (g) { return g + " [" + Math.round(font.advance(g) * scale) + "]"; }).join(" ");
        var cidId = pdf.add("<< /Type /Font /Subtype /CIDFontType2 /BaseFont " + name +
            " /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor " + descId +
            " 0 R /DW 1000 /W [" + w + "] /CIDToGIDMap /Identity >>");
        var cmap = "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n" +
            "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n" +
            "1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n";
        for (var i = 0; i < gids.length; i += 100) {
            var chunk = gids.slice(i, i + 100);
            cmap += chunk.length + " beginbfchar\n";
            for (var j = 0; j < chunk.length; j++) {
                var cp = uni.used[chunk[j]], u = cp > 0xFFFF ? hex4(0xD800 + ((cp - 0x10000) >> 10)) + hex4(0xDC00 + ((cp - 0x10000) & 0x3FF)) : hex4(cp);
                cmap += "<" + hex4(chunk[j]) + "> <" + u + ">\n";
            }
            cmap += "endbfchar\n";
        }
        cmap += "endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend";
        var tuId = pdf.add({ dict: "<< /Length 0 >>", stream: cmap });
        return pdf.add("<< /Type /Font /Subtype /Type0 /BaseFont " + name + " /Encoding /Identity-H /DescendantFonts [" +
            cidId + " 0 R] /ToUnicode " + tuId + " 0 R >>");
    }

    function emit(pages, geom, familyKey, baseSize, options) {
        var pdf = new PdfWriter();
        var fam = FONT_FAMILIES[familyKey];
        var mono = FONT_FAMILIES.courier;

        // Font objects: four faces of the body family plus four of Courier, each
        // carrying the widths this layout was computed with.
        var fontIds = {}, fontRes = [];
        function addFont(name, key, styleIndex, alias) {
            var widths = widthsFor(key, styleIndex);
            var id = pdf.add("<< /Type /Font /Subtype /Type1 /BaseFont /" + name +
                " /Encoding /WinAnsiEncoding /FirstChar " + FIRST_CHAR + " /LastChar " + LAST_CHAR +
                " /Widths [" + widths.join(" ") + "] >>");
            fontIds[alias] = id;
            fontRes.push("/" + alias + " " + id + " 0 R");
        }
        for (var s = 0; s < 4; s++) {
            addFont(fam.faces[s], familyKey, s, "F" + s);
            addFont(mono.faces[s], "courier", s, "M" + s);
        }

        var images = {}, imageRes = [];
        function imageRef(img) {
            var src = img.getAttribute("src") || "";
            if (images[src]) return images[src];
            var data = encodeImage(img);
            if (!data) return null;
            var id = pdf.add({
                dict: "<< /Type /XObject /Subtype /Image /Width " + data.width + " /Height " + data.height +
                    " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length 0 >>",
                stream: data.bytes
            });
            var alias = "Im" + (imageRes.length + 1);
            images[src] = { id: id, alias: alias };
            imageRes.push("/" + alias + " " + id + " 0 R");
            return images[src];
        }

        var pageIds = [], contentIds = [], annotIds = [];
        for (var p = 0; p < pages.length; p++) {
            pageIds.push(pdf.alloc());
            contentIds.push(pdf.alloc());
            annotIds.push([]);
        }
        var pagesId = pdf.alloc();

        var allMarks = [], heads = [], linkAnnots = [];
        for (var pi = 0; pi < pages.length; pi++) {
            var tagger = new Tagger(pi);
            var draw = renderPage(pages[pi], geom, familyKey, baseSize, imageRef, pi + 1, pages.length, options, tagger);
            for (var hd = 0; hd < (draw.headings || []).length; hd++) { draw.headings[hd].page = pi; heads.push(draw.headings[hd]); }
            pdf.set(contentIds[pi], { dict: "<< /Length 0 >>", stream: draw.content });
            allMarks.push(draw.marks);
            for (var a = 0; a < draw.links.length; a++) {
                var lk = draw.links[a];
                // 2026-10-15 each link annotation is in the tag tree: /StructParent (keys after the pages'), /Contents
                // naming it, and a Link element built in buildStructTree. They were click targets a screen reader
                // could not find (PDF/UA 7.18, Matterhorn 28-011 / 28-004). tools/pdf/link-tags.mjs
                var lsp = pages.length + linkAnnots.length;
                var lid = pdf.add("<< /Type /Annot /Subtype /Link /Rect [" +
                    fixed(lk.x0) + " " + fixed(lk.y0) + " " + fixed(lk.x1) + " " + fixed(lk.y1) +
                    "] /Border [0 0 0] /StructParent " + lsp + " /Contents " + pdfText(String(lk.text || lk.href).replace(/\s+/g, " ").trim() || lk.href) +
                    " /A << /S /URI /URI (" + escapeString(pdfUri(lk.href)) + ") >> >>");
                annotIds[pi].push(lid);
                linkAnnots.push({ id: lid, page: pi, key: lsp, owner: lk.owner });
            }
            for (var cm = 0; cm < (draw.comments || []).length; cm++) {
                var cmt = draw.comments[cm];
                // 2026-10-21 a note is tagged like a link (PDF/UA 7.18, the rule the link tags already follow): it has a
                // /StructParent key, a Note element names it, and the parent tree maps the key to that element. tools/pdf/comments.mjs
                var noteKey = pages.length + linkAnnots.length;
                var noteId = pdf.add("<< /Type /Annot /Subtype /Text /Rect [" + fixed(cmt.x0) + " " + fixed(cmt.y0) + " " + fixed(cmt.x1) + " " + fixed(cmt.y1) + "]" +
                    " /Contents " + pdfText(cmt.text) + " /T " + pdfText(cmt.author) + " /Name /Note /Open false /C [1 1 0] /StructParent " + noteKey + " >>");
                annotIds[pi].push(noteId);
                linkAnnots.push({ id: noteId, page: pi, key: noteKey, owner: null, note: true });
            }
        }

        if (activeUni && Object.keys(activeUni.used).length) fontRes.push("/U0 " + addUnicodeFont(pdf, activeUni) + " 0 R");

        var struct = buildStructTree(pdf, allMarks, pageIds, linkAnnots);

        for (var pj = 0; pj < pages.length; pj++) {
            pdf.set(pageIds[pj], "<< /Type /Page /Parent " + pagesId + " 0 R /MediaBox [0 0 " +
                fixed(geom.width) + " " + fixed(geom.height) + "] /Resources << /Font << " + fontRes.join(" ") + " >>" +
                (imageRes.length ? " /XObject << " + imageRes.join(" ") + " >>" : "") +
                " >> /Contents " + contentIds[pj] + " 0 R /StructParents " + pj +
                (annotIds[pj].length ? " /Annots [" + annotIds[pj].map(function (id) { return id + " 0 R"; }).join(" ") + "] /Tabs /S" : "") +
                " >>");
        }
        pdf.set(pagesId, "<< /Type /Pages /Count " + pages.length + " /Kids [" +
            pageIds.map(function (id) { return id + " 0 R"; }).join(" ") + "] >>");

        // 2026-10-15 bookmarks from the headings, nested by level, each opening its heading's page at the heading
        // (Word and Chrome export them; a long report had nothing but scrolling - WCAG 2.4.5, PDF2).
        // tools/pdf/outline-bookmarks.mjs
        var outlineId = 0;
        if (heads.length) {
            outlineId = pdf.alloc();
            var oroot = { id: outlineId, kids: [] }, ostack = [oroot], onodes = [];
            for (var oh = 0; oh < heads.length; oh++) {
                var on = { h: heads[oh], id: pdf.alloc(), kids: [], parent: null };
                while (ostack.length > 1 && ostack[ostack.length - 1].h.level >= on.h.level) ostack.pop();
                on.parent = ostack[ostack.length - 1];
                on.parent.kids.push(on);
                ostack.push(on);
                onodes.push(on);
            }
            var ocount = function (n) { var c = n.kids.length; for (var k = 0; k < n.kids.length; k++) c += ocount(n.kids[k]); return c; };
            for (var oi = 0; oi < onodes.length; oi++) {
                var n = onodes[oi], sib = n.parent.kids, at = sib.indexOf(n);
                pdf.set(n.id, "<< /Title " + pdfText(n.h.title) + " /Parent " + n.parent.id + " 0 R" +
                    (at > 0 ? " /Prev " + sib[at - 1].id + " 0 R" : "") + (at < sib.length - 1 ? " /Next " + sib[at + 1].id + " 0 R" : "") +
                    (n.kids.length ? " /First " + n.kids[0].id + " 0 R /Last " + n.kids[n.kids.length - 1].id + " 0 R /Count " + ocount(n) : "") +
                    " /Dest [" + pageIds[n.h.page] + " 0 R /XYZ null " + fixed(n.h.y) + " null] >>");
            }
            pdf.set(outlineId, "<< /Type /Outlines /First " + oroot.kids[0].id + " 0 R /Last " + oroot.kids[oroot.kids.length - 1].id + " 0 R /Count " + ocount(oroot) + " >>");
        }

        var title = options.title || config.pdfExportTitle || document.title || "Document";
        var author = options.author || config.pdfExportAuthor || "";
        // /MarkInfo and /StructTreeRoot declare the file tagged. DisplayDocTitle
        // makes the viewer show the document's title rather than its filename,
        // which PDF/UA requires and which is the difference between a screen
        // reader announcing "Quarterly Report" and "Export-260802-1431.pdf".
        var catalogId = pdf.add("<< /Type /Catalog /Pages " + pagesId + " 0 R" +
            " /Lang (" + escapeString(String(options.lang || document.documentElement.lang || "en")) + ")" +
            " /MarkInfo << /Marked true >>" +
            (outlineId ? " /Outlines " + outlineId + " 0 R" : "") +
            " /StructTreeRoot " + struct.rootId + " 0 R" +
            " /ViewerPreferences << /DisplayDocTitle true >> >>");
        var infoId = pdf.add("<< /Title " + pdfText(String(title)) +
            (author ? " /Author " + pdfText(String(author)) : "") +
            " /Producer (RichTextEditor) /Creator (RichTextEditor) /CreationDate (" + pdfDate(new Date()) + ") >>");

        return pdf.build(catalogId, infoId);
    }

    // Turn the per-page marked-content records into a structure tree.
    //
    // The tree is built from the marks rather than from the block list because a
    // single block can be split across pages: its structure element then holds
    // several marked-content references, each naming the page it lives on.
    function buildStructTree(pdf, allMarks, pageIds, linkAnnots) {
        var rootId = pdf.alloc();
        var nodes = [];                 // { id, role, kids, extra, children, parent }
        var parentTree = [];            // per page: array of struct ids by MCID

        function node(role, extra) {
            var n = { id: pdf.alloc(), role: role, kids: [], extra: extra || "", children: [], parent: null, seq: [] };
            nodes.push(n);
            return n;
        }

        var docNode = node("Document");
        var listNodes = new Map();      // listId -> L node
        var itemNodes = new Map();      // block  -> LI node
        var labelNodes = new Map();     // block  -> Lbl node
        var bodyNodes = new Map();      // block  -> P / LBody / Figure node
        var tableNodes = new Map();     // block  -> Table node
        var rowNodes = new Map();       // row    -> TR node
        var cellNodes = new Map();      // row    -> { col -> TD/TH node }
        var linkNodes = new Map();      // link owner -> Link node (2026-10-17, tools/pdf/link-order.mjs)

        for (var p = 0; p < allMarks.length; p++) {
            var marks = allMarks[p];
            parentTree[p] = [];
            for (var m = 0; m < marks.length; m++) {
                var owner = marks[m].owner, mcid = marks[m].mcid;
                var target = resolve(owner);
                target.kids.push({ page: p, mcid: mcid });
                target.seq.push({ mcr: { page: p, mcid: mcid } });
                parentTree[p][mcid] = target.id;
            }
        }

        // The parent is recorded when the child is attached. Searching for it
        // afterwards would be a scan of every node for every node.
        function attach(parent, child) {
            if (child.parent) return;
            child.parent = parent;
            parent.children.push(child);
            parent.seq.push({ elem: child });
        }
        // a Link element per link annotation, under the paragraph / cell holding it
        var linkKeys = [];
        for (var la = 0; la < (linkAnnots || []).length; la++) {
            if (linkAnnots[la].note) {
                // a comment note: a Note element under the document, its OBJR and its parent-tree key
                var nte = node("Note");
                attach(docNode, nte);
                nte.objr = linkAnnots[la];
                linkKeys.push(linkAnnots[la].key + " " + nte.id + " 0 R");
                continue;
            }
            var lnk;
            if (linkAnnots[la].owner && linkAnnots[la].owner.kind === "link") lnk = resolve(linkAnnots[la].owner);
            else { lnk = node("Link"); attach(resolve(linkAnnots[la].owner), lnk); }
            lnk.objr = linkAnnots[la];
            linkKeys.push(linkAnnots[la].key + " " + lnk.id + " 0 R");
        }

        function resolve(owner) {
            // 2026-10-17 a link's words: their own Link element under the paragraph or cell, created where they occur
            if (owner.kind === "link") {
                var ln = linkNodes.get(owner);
                if (!ln) { ln = node("Link"); linkNodes.set(owner, ln); attach(resolve(owner.parent), ln); }
                return ln;
            }
            if (owner.kind === "cell") {
                var table = tableNodes.get(owner.block);
                if (!table) { table = node("Table"); tableNodes.set(owner.block, table); attach(docNode, table); }
                var row = rowNodes.get(owner.row);
                if (!row) { row = node("TR"); rowNodes.set(owner.row, row); attach(table, row); }
                var perRow = cellNodes.get(owner.row);
                if (!perRow) { perRow = {}; cellNodes.set(owner.row, perRow); }
                if (!perRow[owner.col]) {
                    // A header cell must be TH, not TD: it is what lets a screen
                    // reader announce "Revenue, 1,240" instead of just "1,240".
                    // 2026-10-15 table attributes belong in /A << /O /Table >> (where PDF/UA checkers read them; /Scope
                    // sat on the element), with /ColSpan for a merged cell. tools/pdf/table-colspan.mjs
                    var tattr = (owner.header ? " /Scope /Column" : "") + (owner.span > 1 ? " /ColSpan " + owner.span : "") + (owner.rowspan > 1 ? " /RowSpan " + owner.rowspan : "");
                    perRow[owner.col] = node(owner.header ? "TH" : "TD", tattr ? " /A << /O /Table" + tattr + " >>" : "");
                    attach(row, perRow[owner.col]);
                }
                return perRow[owner.col];
            }

            var block = owner.block;
            var container = docNode;
            if (block.listId) {
                var listNode = listNodes.get(block.listId);
                if (!listNode) { listNode = node("L"); listNodes.set(block.listId, listNode); attach(docNode, listNode); }
                var itemNode = itemNodes.get(block);
                if (!itemNode) { itemNode = node("LI"); itemNodes.set(block, itemNode); attach(listNode, itemNode); }
                container = itemNode;
            }

            if (owner.kind === "lbl") {
                var lbl = labelNodes.get(block);
                if (!lbl) { lbl = node("Lbl"); labelNodes.set(block, lbl); attach(container, lbl); }
                return lbl;
            }

            var body = bodyNodes.get(block);
            if (!body) {
                if (block.listId) {
                    body = node("LBody");
                } else {
                    // A figure with no alt text is an accessibility failure, but
                    // an EMPTY /Alt is a worse one: it tells assistive tech the
                    // image is decorative when nobody decided that.
                    var extra = block.role === "Figure"
                        ? " /Alt " + pdfText(block.alt || "Image")
                        : "";
                    // 2026-10-15 a block in another language says so, or it is read with the document's
                    // pronunciation (WCAG 3.1.2, PDF/UA 7.2). tools/pdf/paragraph-lang.mjs
                    var docLang = pdfDocLang;
                    var bl = String(block.lang || "").replace(/[^A-Za-z0-9-]/g, "");
                    if (bl && bl.toLowerCase() !== docLang) extra += " /Lang (" + bl + ")";
                    body = node(block.role || "P", extra);
                }
                bodyNodes.set(block, body);
                attach(container, body);
            }
            return body;
        }

        // Emit. /K lists child elements and marked-content references in reading order (2026-10-17: child elements
        // used to come first, so a Link sat at the start of its paragraph). tools/pdf/link-order.mjs
        for (var n = 0; n < nodes.length; n++) {
            var nd = nodes[n];
            var kids = [];
            for (var k = 0; k < nd.seq.length; k++) {
                var sq = nd.seq[k];
                if (sq.elem) kids.push(sq.elem.id + " 0 R");
                else kids.push("<< /Type /MCR /Pg " + pageIds[sq.mcr.page] + " 0 R /MCID " + sq.mcr.mcid + " >>");
            }
            if (nd.objr) kids.push("<< /Type /OBJR /Obj " + nd.objr.id + " 0 R /Pg " + pageIds[nd.objr.page] + " 0 R >>");
            var parentRef = nd.parent ? nd.parent.id : rootId;
            pdf.set(nd.id, "<< /Type /StructElem /S /" + nd.role + " /P " + parentRef + " 0 R" + nd.extra +
                (kids.length ? " /K [" + kids.join(" ") + "]" : "") + " >>");
        }

        // ParentTree: a number tree keyed by each page's /StructParents value,
        // whose value is the list of owning structure elements indexed by MCID.
        var numsParts = [];
        for (var pt = 0; pt < parentTree.length; pt++) {
            var arr = parentTree[pt] || [];
            var refs = [];
            for (var q = 0; q < arr.length; q++) refs.push((arr[q] || docNode.id) + " 0 R");
            numsParts.push(pt + " [" + refs.join(" ") + "]");
        }
        var parentTreeId = pdf.add("<< /Nums [" + numsParts.concat(linkKeys).join(" ") + "] >>");

        pdf.set(rootId, "<< /Type /StructTreeRoot /K [" + docNode.id + " 0 R]" +
            " /ParentTree " + parentTreeId + " 0 R /ParentTreeNextKey " + (parentTree.length + linkKeys.length) + " >>");

        return { rootId: rootId };
    }

    function pdfDate(d) {
        function two(n) { return (n < 10 ? "0" : "") + n; }
        return "D:" + d.getFullYear() + two(d.getMonth() + 1) + two(d.getDate()) +
            two(d.getHours()) + two(d.getMinutes()) + two(d.getSeconds()) + "Z";
    }
    function fixed(n) { return (Math.round(n * 100) / 100).toString(); }

    // Marked content for the structure tree.
    //
    // Tagging is what separates "a screen reader can read the words" from "a
    // screen reader knows this is a level-2 heading, followed by a 4-item list,
    // followed by a table with header cells". Section 508 and EN 301 549 both
    // require the second. Purely decorative output (rules, cell borders, the
    // running header) is marked as an Artifact instead, which removes it from
    // the reading order rather than reading "line, line, line" to the user.
    function Tagger(pageIndex) {
        this.pageIndex = pageIndex;
        this.next = 0;
        this.marks = [];       // { owner, mcid } in reading order
    }
    Tagger.prototype.open = function (out, role, owner) {
        var mcid = this.next++;
        this.marks.push({ owner: owner, mcid: mcid, role: role });
        out.push("/" + role + " << /MCID " + mcid + " >> BDC");
        return mcid;
    };
    Tagger.prototype.close = function (out) { out.push("EMC"); };
    Tagger.prototype.artifact = function (out, fn) {
        out.push("/Artifact BMC");
        fn();
        out.push("EMC");
    };

    function renderPage(ops, geom, familyKey, baseSize, imageRef, pageNumber, pageCount, options, tagger) {
        var out = [], links = [], headings = []; links.comments = []; links.seenComments = {};
        var left = geom.margin.left;

        for (var i = 0; i < ops.length; i++) {
            var op = ops[i];
            // 2026-10-15 where each heading starts, for the bookmarks. tools/pdf/outline-bookmarks.mjs
            if (op.op === "line" && op.first && op.block && /^H[1-6]$/.test(op.block.role || "")) {
                var htext = (op.block.lines || []).map(function (ln) { return (ln.parts || []).map(function (pt) { return pt.text || ""; }).join(""); }).join(" ").replace(/\s+/g, " ").trim();
                if (htext) headings.push({ level: +op.block.role.charAt(1), title: htext, y: op.y });
            }
            if (op.op === "rule") {
                // A horizontal rule is decoration, not content.
                tagger.artifact(out, function () {
                    out.push("0.8 0.8 0.8 RG 0.5 w " + fixed(left + op.indent) + " " + fixed(op.y) + " m " +
                        fixed(geom.width - geom.margin.right) + " " + fixed(op.y) + " l S");
                });
                continue;
            }
            if (op.op === "row") { renderRow(op, geom, out, left, imageRef, links, tagger); continue; }
            renderLine(op, geom, out, left, familyKey, imageRef, links, tagger);
        }

        // Running header/footer, drawn after the body so they always sit on top.
        // Both are artifacts: repeating them into the reading order on every
        // page is one of the most common findings in a PDF accessibility audit.
        var hf = headerFooter(options);
        if (hf.header || hf.footer) {
            tagger.artifact(out, function () {
                if (hf.header) drawRunning(out, hf.header, geom, geom.height - geom.margin.top * 0.55, familyKey, baseSize * 0.85, pageNumber, pageCount);
                if (hf.footer) drawRunning(out, hf.footer, geom, geom.margin.bottom * 0.55, familyKey, baseSize * 0.85, pageNumber, pageCount);
            });
        }

        return { content: out.join("\n"), links: links, marks: tagger.marks, headings: headings, comments: links.comments };
    }

    function headerFooter(options) {
        var setup = null;
        try { if (typeof editor.getDocumentPageSetup === "function") setup = editor.getDocumentPageSetup(); } catch (e) {}
        setup = setup || {};
        return {
            header: options.headerText || config.pdfExportHeader || plainText(setup.headerHtml) || "",
            footer: options.footerText || config.pdfExportFooter || plainText(setup.footerHtml) || ""
        };
    }
    function plainText(html) {
        if (!html || typeof html !== "string") return "";
        var d = document.createElement("div");
        d.innerHTML = __RTE_TT(html);
        return (d.textContent || "").replace(/\s+/g, " ").trim();
    }

    function drawRunning(out, template, geom, y, familyKey, size, pageNumber, pageCount) {
        var text = String(template).replace(/\{page\}/g, pageNumber).replace(/\{total\}/g, pageCount);
        var win = toWinAnsi(text);
        var w = textWidth(win, familyKey, 0, size);
        var x = (geom.width - w) / 2;
        out.push("BT /F0 " + fixed(size) + " Tf 0.4 0.4 0.4 rg " + fixed(x) + " " + fixed(y) + " Td (" + escapeString(win) + ") Tj ET");
    }

    function renderLine(op, geom, out, left, familyKey, imageRef, links, tagger) {
        var line = op.line, block = op.block;
        var x = left + (block.indent || 0);
        var avail = geom.width - geom.margin.right - x;
        if (block.align === "center") x += (avail - line.width) / 2;
        else if (block.align === "right") x += avail - line.width;

        if (block.rule === "quote" && !line.image) {
            // The quote bar is decoration.
            var barX = fixed(left + block.indent - 8);
            var run = function () {
                out.push("0.8 0.8 0.85 RG 2 w " + barX + " " + fixed(op.y - line.height + 4) +
                    " m " + barX + " " + fixed(op.y + line.size * 0.8) + " l S");
            };
            if (tagger) tagger.artifact(out, run); else run();
        }

        // A list marker belongs to the FIRST line only; repeating it on a wrapped
        // continuation line turns one bullet into several.
        if (op.first && block.marker) {
            var ms = block.markerStyle || { size: line.size, color: [0, 0, 0] };
            var mw = textWidth(block.marker, familyKey, 0, ms.size);
            if (tagger) tagger.open(out, "Lbl", { kind: "lbl", block: block });
            out.push("BT /F0 " + fixed(ms.size) + " Tf " + colorOp(ms.color) + " " +
                fixed(x - mw - 6) + " " + fixed(op.y - line.size * 0.85) + " Td (" + escapeString(toWinAnsi(block.marker)) + ") Tj ET");
            if (tagger) tagger.close(out);
        }

        // Text of the block itself. Figures carry /Alt on the structure element
        // rather than in the content stream.
        //
        // A table cell renders through this function with a SYNTHETIC block
        // (just indent/align), so the owner has to be the cell descriptor the
        // caller supplied. Passing the synthetic block instead makes every cell
        // a top-level paragraph and the table loses its structure entirely.
        var lineOwner = op.cell || { kind: "body", block: block };
        var lineOpen = false;
        if (tagger) { tagger.open(out, line.image ? "Figure" : "Span", lineOwner); lineOpen = true; }

        // Wrapping split the text into words, but emitting one BT/Tj block per
        // WORD is wrong twice over: the content stream balloons, and text
        // extractors that infer spacing from separate show-operations can lose
        // the spaces between them, so copying a paragraph out of the PDF yields
        // "onelongrunofwords". Adjacent parts that share a font, size and colour
        // are merged back into a single run, spaces included.
        var segments = [];
        var cursor = x;
        for (var i = 0; i < line.parts.length; i++) {
            var part = line.parts[i];
            if (part.img) { segments.push({ img: part, x: cursor, w: part.w }); cursor += part.w; continue; }
            var st = part.style;
            var alias = part.uni ? "U0" : (st.mono ? "M" : "F") + part.styleIndex;
            var last = segments.length ? segments[segments.length - 1] : null;
            var mergeable = last && !last.img && last.alias === alias && last.style.size === st.size &&
                sameColor(last.style.color, st.color) && last.style.underline === st.underline &&
                last.style.strike === st.strike && last.style.link === st.link && (last.style.lang || "") === (st.lang || "") &&
                // 2026-10-21 a commented run is its own segment: merged into its neighbours it lost its note (tools/pdf/comments.mjs)
                (last.style.comment ? last.style.comment.text + "|" + last.style.comment.author : "") === (st.comment ? st.comment.text + "|" + st.comment.author : "");
            if (mergeable) { last.text += part.text; last.w += part.w; }
            else { segments.push({ text: part.text, style: st, alias: alias, x: cursor, w: part.w }); }
            cursor += part.w;
        }

        var baseline = op.y - line.size * 0.85;
        for (var s = 0; s < segments.length; s++) {
            var seg = segments[s];
            if (seg.img) {
                var ref = imageRef(seg.img.img);
                if (ref) {
                    out.push("q " + fixed(seg.w) + " 0 0 " + fixed(seg.img.h) + " " + fixed(seg.x) + " " +
                        fixed(op.y - seg.img.h) + " cm /" + ref.alias + " Do Q");
                }
                continue;
            }
            // A run of pure whitespace still advanced the cursor; drawing it
            // would only add an empty operation.
            if (!seg.text || /^\s+$/.test(seg.text)) continue;
            var sst = seg.style;
            // 2026-10-17 a link's words are marked content of their own, owned by the Link element, so the Link holds
            // its text at its place in the paragraph (PDF/UA 7.18.5). tools/pdf/link-order.mjs
            var linkOwner = null;
            if (tagger && !line.image && sst.link) {
                if (lineOpen) { tagger.close(out); lineOpen = false; }
                linkOwner = { kind: "link", parent: lineOwner };
                tagger.open(out, "Span", linkOwner);
            } else if (tagger && !lineOpen) {
                tagger.open(out, "Span", lineOwner); lineOpen = true;
            }
            // 2026-10-17 a run in another language than its block (a French phrase in an English sentence) is drawn
            // inside marked content with a /Lang property, so it is read with the right pronunciation (WCAG 3.1.2,
            // PDF/UA 7.2). The paragraph's own /Lang is on its structure element. tools/pdf/inline-lang.mjs
            var runLang = String(sst.lang || "").replace(/[^A-Za-z0-9-]/g, "");
            var langMark = runLang && runLang.toLowerCase() !== String(block.lang || pdfDocLang || "").toLowerCase();
            if (langMark) out.push("/Span << /Lang (" + runLang + ") >> BDC");
            if (seg.alias === "U0") {
                out.push("BT /U0 " + fixed(sst.size) + " Tf " + colorOp(sst.color) +
                    (sst.bold ? " " + colorStroke(sst.color) + " 2 Tr " + fixed(sst.size * 0.03) + " w" : "") + " " +
                    (sst.italic ? "1 0 0.21 1 " + fixed(seg.x) + " " + fixed(baseline) + " Tm " : fixed(seg.x) + " " + fixed(baseline) + " Td ") +
                    // the render mode outlives ET: reset it, or every later run is stroked too
                    uniHex(seg.text) + " Tj" + (sst.bold ? " 0 Tr" : "") + " ET");
            } else {
                out.push("BT /" + seg.alias + " " + fixed(sst.size) + " Tf " + colorOp(sst.color) + " " +
                    fixed(seg.x) + " " + fixed(baseline) + " Td (" + escapeString(toWinAnsi(seg.text)) + ") Tj ET");
            }
            if (langMark) out.push("EMC");
            if (sst.underline) {
                out.push(colorStroke(sst.color) + " 0.5 w " + fixed(seg.x) + " " + fixed(baseline - sst.size * 0.12) +
                    " m " + fixed(seg.x + seg.w) + " " + fixed(baseline - sst.size * 0.12) + " l S");
            }
            if (sst.strike) {
                out.push(colorStroke(sst.color) + " 0.5 w " + fixed(seg.x) + " " + fixed(baseline + sst.size * 0.28) +
                    " m " + fixed(seg.x + seg.w) + " " + fixed(baseline + sst.size * 0.28) + " l S");
            }
            if (sst.comment) {
                var cmKey = sst.comment.text + "|" + sst.comment.author;
                if (!links.seenComments[cmKey]) { links.seenComments[cmKey] = true; links.comments.push({ x0: seg.x, y0: baseline - 2, x1: seg.x + 12, y1: baseline + 10, text: sst.comment.text, author: sst.comment.author }); }
            }
            if (sst.link) {
                links.push({ href: sst.link, x0: seg.x, y0: baseline - 2, x1: seg.x + seg.w, y1: baseline + sst.size, text: seg.text || "", owner: linkOwner || lineOwner });
            }
            if (linkOwner) tagger.close(out);
        }
        if (tagger && lineOpen) tagger.close(out);
    }

    function sameColor(a, b) {
        a = a || [0, 0, 0]; b = b || [0, 0, 0];
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    }

    function renderRow(op, geom, out, left, imageRef, links, tagger) {
        var block = op.block, row = op.row;
        var x = left + block.indent;
        var top = op.y, bottom = op.y - row.height;

        for (var c = 0; c < row.cells.length; c++) {
            var cspan = row.cells[c].span || 1, cstart = row.cells[c].start != null ? row.cells[c].start : c;
            var cellX = x, cellW = 0;
            for (var wi = 0; wi < cstart + cspan; wi++) {
                var colw = block.colWidths && block.colWidths[wi] != null ? block.colWidths[wi] : block.colWidth;
                if (wi < cstart) cellX += colw; else cellW += colw;
            }
            // Shading and borders are decoration; only the cell TEXT belongs to
            // the reading order.
            var paint = function () {
                if (row.header) {
                    out.push("0.94 0.95 0.97 rg " + fixed(cellX) + " " + fixed(bottom) + " " +
                        fixed(cellW) + " " + fixed(row.height) + " re f");
                }
                out.push("0.75 0.78 0.82 RG 0.5 w " + fixed(cellX) + " " + fixed(bottom) + " " +
                    fixed(cellW) + " " + fixed(row.height) + " re S");
            };
            if (tagger) tagger.artifact(out, paint); else paint();

            // One structure element per CELL, identified by the row object and
            // column index so a table split across pages still resolves to the
            // right TD (and a repeated header row to the right TH).
            var cellOwner = { kind: "cell", block: block, row: row, col: cstart, span: cspan, rowspan: row.cells[c].rowspan || 1, header: !!row.cells[c].header };
            var cy = top - block.pad;
            var lines = row.cells[c].lines;
            for (var l = 0; l < lines.length; l++) {
                renderLine({ line: lines[l], y: cy, block: { indent: 0, align: "left" }, first: l === 0, cell: cellOwner },
                    { width: cellX + cellW + geom.margin.right, margin: { right: geom.margin.right } },
                    out, cellX + block.pad, "helvetica", imageRef, links, tagger);
                cy -= lines[l].height;
            }
        }
    }

    function colorOp(c) { c = c || [0, 0, 0]; return fixed(c[0]) + " " + fixed(c[1]) + " " + fixed(c[2]) + " rg"; }
    function colorStroke(c) { c = c || [0, 0, 0]; return fixed(c[0]) + " " + fixed(c[1]) + " " + fixed(c[2]) + " RG"; }

    // Every image is re-encoded to JPEG through a canvas. PNG could be embedded
    // as FlateDecode without re-encoding, but only for a narrow set of colour
    // types and never with an alpha channel; routing everything through one path
    // means GIF, WEBP, BMP and SVG all work rather than only some of them.
    // Transparent pixels are composited onto white, which is what the page is.
    function encodeImage(img) {
        try {
            var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
            if (!w || !h) return null;
            var max = 2000;
            var scale = Math.min(1, max / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement("canvas");
            canvas.width = cw; canvas.height = ch;
            var g = canvas.getContext("2d");
            g.fillStyle = "#ffffff";
            g.fillRect(0, 0, cw, ch);
            g.drawImage(img, 0, 0, cw, ch);
            var uri = canvas.toDataURL("image/jpeg", 0.92);
            var comma = uri.indexOf(",");
            if (comma < 0) return null;
            var binary = atob(uri.slice(comma + 1));
            var bytes = new Uint8Array(binary.length);
            for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return { bytes: bytes, width: cw, height: ch };
        } catch (e) {
            // A cross-origin image taints the canvas. Skipping it is correct:
            // there is no way to read its pixels, and failing the whole export
            // over one decorative image would be worse.
            return null;
        }
    }

    // ------------------------------------------------------------- downloads
    function sanitizeName(name) {
        if (!name || typeof name !== "string") return "";
        return name.replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 120);
    }
    function defaultBase() {
        var d = new Date();
        function two(n) { return (n < 10 ? "0" : "") + n; }
        return "Export-" + String(d.getFullYear()).slice(2) + two(d.getMonth() + 1) + two(d.getDate()) +
            "-" + two(d.getHours()) + two(d.getMinutes()) + two(d.getSeconds());
    }
    function download(bytes, filename) {
        var blob = new Blob([bytes], { type: "application/pdf" });
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
