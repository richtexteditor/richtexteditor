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
    var obj = this;
    var config, editor;

    obj.PluginName = "PdfExport";

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        if (config.pdfExport === false) return;

        editor.getPdfBytes = function (options) { return buildPdf(options || {}); };
        editor.exportToPdf = function (filename, options) {
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
            out += "?";
        }
        return out;
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
            mono: inherited.mono, link: inherited.link
        };
        var tag = node.tagName ? node.tagName.toLowerCase() : "";
        if (tag === "b" || tag === "strong") s.bold = true;
        if (tag === "i" || tag === "em") s.italic = true;
        if (tag === "u" || tag === "ins") s.underline = true;
        if (tag === "s" || tag === "strike" || tag === "del") s.strike = true;
        if (tag === "code" || tag === "kbd" || tag === "samp" || tag === "pre") s.mono = true;
        if (tag === "a" && node.getAttribute("href")) { s.link = node.getAttribute("href"); s.color = [0, 0.33, 0.8]; s.underline = true; }
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
                var tok = tokens[t];
                if (!tok) continue;
                var w = textWidth(toWinAnsi(tok), family, styleIndex, run.style.size);
                if (used + w > width && line.length && !/^\s+$/.test(tok)) {
                    flush();
                    // A wrapped line never starts with the space that caused it.
                    if (/^\s+$/.test(tok)) continue;
                }
                line.push({ text: tok, style: run.style, family: family, styleIndex: styleIndex, w: w });
                used += w;
                if (run.style.size > maxSize) maxSize = run.style.size;
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

        function block(node, style, indent, listMarker, listId, listOrdered) {
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
                role: HEADING_SCALE[tag] ? "H" + tag.charAt(1) : (tag === "blockquote" ? "BlockQuote" : "P"),
                listId: listId || null, listOrdered: !!listOrdered
            });
        }

        function walk(node, style, indent) {
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
                    var counter = parseInt(c.getAttribute("start") || "1", 10) || 1;
                    // Every item of one list shares an id so the tag tree can
                    // rebuild a single <L> around them; without it each item
                    // becomes an isolated paragraph and a screen reader never
                    // announces "list, 4 items".
                    var listId = "L" + (self.listSeq = (self.listSeq || 0) + 1);
                    for (var li = 0; li < c.childNodes.length; li++) {
                        var item = c.childNodes[li];
                        if (item.nodeType !== 1 || item.tagName.toLowerCase() !== "li") continue;
                        var marker = tag === "ol" ? (counter++) + "." : "•";
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
                    if (hasBlockChildren(c)) { walk(c, styleOf(c, style), indent + (tag === "blockquote" ? self.baseSize * 1.5 : 0)); continue; }
                    block(c, style, indent + (tag === "blockquote" ? self.baseSize * 1.5 : 0), null);
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
        for (var r = 0; r < trs.length; r++) {
            var cells = [];
            for (var c = 0; c < trs[r].childNodes.length; c++) {
                var cell = trs[r].childNodes[c];
                if (cell.nodeType !== 1) continue;
                var tag = cell.tagName.toLowerCase();
                if (tag !== "td" && tag !== "th") continue;
                cells.push({ node: cell, header: tag === "th" });
            }
            if (cells.length) { rows.push(cells); if (cells.length > maxCells) maxCells = cells.length; }
        }
        if (!rows.length) return;

        var width = this.contentWidth - indent;
        var colWidth = width / maxCells;
        var pad = 4;
        var laid = [];
        for (var i = 0; i < rows.length; i++) {
            var out = [], tallest = 0;
            for (var j = 0; j < rows[i].length; j++) {
                var cs = styleOf(rows[i][j].node, style);
                if (rows[i][j].header) cs.bold = true;
                var lines = self.wrap(self.runsOf(rows[i][j].node, cs), colWidth - pad * 2, 1.35);
                var h = 0;
                for (var k = 0; k < lines.length; k++) h += lines[k].height;
                if (h > tallest) tallest = h;
                out.push({ lines: lines, header: rows[i][j].header });
            }
            laid.push({ cells: out, height: tallest + pad * 2, header: rows[i][0] && rows[i][0].header });
        }
        this.blocks.push({
            type: "table", rows: laid, colWidth: colWidth, cols: maxCells,
            indent: indent, pad: pad,
            spaceBefore: this.baseSize * 0.5, spaceAfter: this.baseSize * 0.5
        });
    };

    // ------------------------------------------------------------- rendering
    function buildPdf(options) {
        var familyKey = String(options.font || config.pdfExportFont || "helvetica").toLowerCase();
        if (!FONT_FAMILIES[familyKey]) familyKey = "helvetica";
        var baseSize = Number(options.fontSize || config.pdfExportBaseFontSize || 11);
        if (!isFinite(baseSize) || baseSize <= 0) baseSize = 11;
        var geom = pageGeometry(options);

        // getHTMLCode() is the SERIALIZED document: presentational plugins strip
        // their own chrome from it. Reading the live DOM instead would bake page
        // overlays, watermarks and formatting marks into the PDF.
        var host = document.createElement("div");
        host.innerHTML = editor.getHTMLCode() || "";

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

        var allMarks = [];
        for (var pi = 0; pi < pages.length; pi++) {
            var tagger = new Tagger(pi);
            var draw = renderPage(pages[pi], geom, familyKey, baseSize, imageRef, pi + 1, pages.length, options, tagger);
            pdf.set(contentIds[pi], { dict: "<< /Length 0 >>", stream: draw.content });
            allMarks.push(draw.marks);
            for (var a = 0; a < draw.links.length; a++) {
                var lk = draw.links[a];
                annotIds[pi].push(pdf.add("<< /Type /Annot /Subtype /Link /Rect [" +
                    fixed(lk.x0) + " " + fixed(lk.y0) + " " + fixed(lk.x1) + " " + fixed(lk.y1) +
                    "] /Border [0 0 0] /A << /S /URI /URI (" + escapeString(toWinAnsi(lk.href)) + ") >> >>"));
            }
        }

        var struct = buildStructTree(pdf, allMarks, pageIds);

        for (var pj = 0; pj < pages.length; pj++) {
            pdf.set(pageIds[pj], "<< /Type /Page /Parent " + pagesId + " 0 R /MediaBox [0 0 " +
                fixed(geom.width) + " " + fixed(geom.height) + "] /Resources << /Font << " + fontRes.join(" ") + " >>" +
                (imageRes.length ? " /XObject << " + imageRes.join(" ") + " >>" : "") +
                " >> /Contents " + contentIds[pj] + " 0 R /StructParents " + pj +
                (annotIds[pj].length ? " /Annots [" + annotIds[pj].map(function (id) { return id + " 0 R"; }).join(" ") + "]" : "") +
                " >>");
        }
        pdf.set(pagesId, "<< /Type /Pages /Count " + pages.length + " /Kids [" +
            pageIds.map(function (id) { return id + " 0 R"; }).join(" ") + "] >>");

        var title = options.title || config.pdfExportTitle || document.title || "Document";
        var author = options.author || config.pdfExportAuthor || "";
        // /MarkInfo and /StructTreeRoot declare the file tagged. DisplayDocTitle
        // makes the viewer show the document's title rather than its filename,
        // which PDF/UA requires and which is the difference between a screen
        // reader announcing "Quarterly Report" and "Export-260802-1431.pdf".
        var catalogId = pdf.add("<< /Type /Catalog /Pages " + pagesId + " 0 R" +
            " /Lang (" + escapeString(String(options.lang || document.documentElement.lang || "en")) + ")" +
            " /MarkInfo << /Marked true >>" +
            " /StructTreeRoot " + struct.rootId + " 0 R" +
            " /ViewerPreferences << /DisplayDocTitle true >> >>");
        var infoId = pdf.add("<< /Title (" + escapeString(toWinAnsi(String(title))) + ")" +
            (author ? " /Author (" + escapeString(toWinAnsi(String(author))) + ")" : "") +
            " /Producer (RichTextEditor) /Creator (RichTextEditor) /CreationDate (" + pdfDate(new Date()) + ") >>");

        return pdf.build(catalogId, infoId);
    }

    // Turn the per-page marked-content records into a structure tree.
    //
    // The tree is built from the marks rather than from the block list because a
    // single block can be split across pages: its structure element then holds
    // several marked-content references, each naming the page it lives on.
    function buildStructTree(pdf, allMarks, pageIds) {
        var rootId = pdf.alloc();
        var nodes = [];                 // { id, role, kids, extra, children, parent }
        var parentTree = [];            // per page: array of struct ids by MCID

        function node(role, extra) {
            var n = { id: pdf.alloc(), role: role, kids: [], extra: extra || "", children: [], parent: null };
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

        for (var p = 0; p < allMarks.length; p++) {
            var marks = allMarks[p];
            parentTree[p] = [];
            for (var m = 0; m < marks.length; m++) {
                var owner = marks[m].owner, mcid = marks[m].mcid;
                var target = resolve(owner);
                target.kids.push({ page: p, mcid: mcid });
                parentTree[p][mcid] = target.id;
            }
        }

        // The parent is recorded when the child is attached. Searching for it
        // afterwards would be a scan of every node for every node.
        function attach(parent, child) {
            if (child.parent) return;
            child.parent = parent;
            parent.children.push(child);
        }

        function resolve(owner) {
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
                    perRow[owner.col] = node(owner.header ? "TH" : "TD", owner.header ? " /Scope /Column" : "");
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
                        ? " /Alt (" + escapeString(toWinAnsi(block.alt || "Image")) + ")"
                        : "";
                    body = node(block.role || "P", extra);
                }
                bodyNodes.set(block, body);
                attach(container, body);
            }
            return body;
        }

        // Emit. /K holds child elements first, then marked-content references.
        for (var n = 0; n < nodes.length; n++) {
            var nd = nodes[n];
            var kids = [];
            for (var c = 0; c < nd.children.length; c++) kids.push(nd.children[c].id + " 0 R");
            for (var k = 0; k < nd.kids.length; k++) {
                kids.push("<< /Type /MCR /Pg " + pageIds[nd.kids[k].page] + " 0 R /MCID " + nd.kids[k].mcid + " >>");
            }
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
        var parentTreeId = pdf.add("<< /Nums [" + numsParts.join(" ") + "] >>");

        pdf.set(rootId, "<< /Type /StructTreeRoot /K [" + docNode.id + " 0 R]" +
            " /ParentTree " + parentTreeId + " 0 R /ParentTreeNextKey " + parentTree.length + " >>");

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
        var out = [], links = [];
        var left = geom.margin.left;

        for (var i = 0; i < ops.length; i++) {
            var op = ops[i];
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

        return { content: out.join("\n"), links: links, marks: tagger.marks };
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
        d.innerHTML = html;
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
        if (tagger) tagger.open(out, line.image ? "Figure" : "Span", op.cell || { kind: "body", block: block });

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
            var alias = (st.mono ? "M" : "F") + part.styleIndex;
            var last = segments.length ? segments[segments.length - 1] : null;
            var mergeable = last && !last.img && last.alias === alias && last.style.size === st.size &&
                sameColor(last.style.color, st.color) && last.style.underline === st.underline &&
                last.style.strike === st.strike && last.style.link === st.link;
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
            out.push("BT /" + seg.alias + " " + fixed(sst.size) + " Tf " + colorOp(sst.color) + " " +
                fixed(seg.x) + " " + fixed(baseline) + " Td (" + escapeString(toWinAnsi(seg.text)) + ") Tj ET");
            if (sst.underline) {
                out.push(colorStroke(sst.color) + " 0.5 w " + fixed(seg.x) + " " + fixed(baseline - sst.size * 0.12) +
                    " m " + fixed(seg.x + seg.w) + " " + fixed(baseline - sst.size * 0.12) + " l S");
            }
            if (sst.strike) {
                out.push(colorStroke(sst.color) + " 0.5 w " + fixed(seg.x) + " " + fixed(baseline + sst.size * 0.28) +
                    " m " + fixed(seg.x + seg.w) + " " + fixed(baseline + sst.size * 0.28) + " l S");
            }
            if (sst.link) {
                links.push({ href: sst.link, x0: seg.x, y0: baseline - 2, x1: seg.x + seg.w, y1: baseline + sst.size });
            }
        }
        if (tagger) tagger.close(out);
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
            var cellX = x + c * block.colWidth;
            // Shading and borders are decoration; only the cell TEXT belongs to
            // the reading order.
            var paint = function () {
                if (row.header) {
                    out.push("0.94 0.95 0.97 rg " + fixed(cellX) + " " + fixed(bottom) + " " +
                        fixed(block.colWidth) + " " + fixed(row.height) + " re f");
                }
                out.push("0.75 0.78 0.82 RG 0.5 w " + fixed(cellX) + " " + fixed(bottom) + " " +
                    fixed(block.colWidth) + " " + fixed(row.height) + " re S");
            };
            if (tagger) tagger.artifact(out, paint); else paint();

            // One structure element per CELL, identified by the row object and
            // column index so a table split across pages still resolves to the
            // right TD (and a repeated header row to the right TH).
            var cellOwner = { kind: "cell", block: block, row: row, col: c, header: !!row.cells[c].header };
            var cy = top - block.pad;
            var lines = row.cells[c].lines;
            for (var l = 0; l < lines.length; l++) {
                renderLine({ line: lines[l], y: cy, block: { indent: 0, align: "left" }, first: l === 0, cell: cellOwner },
                    { width: cellX + block.colWidth + geom.margin.right, margin: { right: geom.margin.right } },
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
