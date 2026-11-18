if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};

// 2026-11-01 Drawing: sketch with a pen, a marker or an eraser in a dialog and insert the result as
// an image; double-click it later to keep drawing. Closes the gap with Tiptap's "Drawing" example.
//
// The image is a PNG, so it exports to Word, PDF and email like any other picture. The strokes ride
// along in data-rte-drawing (canvas coordinates, one decimal), so a saved and reloaded drawing is
// still editable. Pointer events: mouse, pen and touch draw the same way.
//   toolbar item: insertdrawing      API: editor.openDrawingDialog([img])
//   config.drawingWidth / drawingHeight: the canvas size in CSS pixels (640 x 360)
//   config.drawingColors: the colour swatches
// tools/plugins/drawing.mjs
RTE_DefaultConfig.plugin_drawing = RTE_Plugin_Drawing;
RTE_DefaultConfig.drawingWidth = RTE_DefaultConfig.drawingWidth || 640;
RTE_DefaultConfig.drawingHeight = RTE_DefaultConfig.drawingHeight || 360;
RTE_DefaultConfig.drawingColors = RTE_DefaultConfig.drawingColors || ["#1f2328", "#0969da", "#cf222e", "#1a7f37", "#bc4c00", "#8250df"];
RTE_DefaultConfig.text_insertdrawing = RTE_DefaultConfig.text_insertdrawing || "Drawing";
RTE_DefaultConfig.svgCode_insertdrawing = RTE_DefaultConfig.svgCode_insertdrawing || '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 25c3-6 6-9 9-6s-1 7 3 8 6-6 10-9"/><path d="M21 5l6 6-11 11-7 1 1-7z"/></svg>';

function RTE_Plugin_Drawing() {
    var obj = this;
    var config, editor;

    obj.PluginName = "Drawing";

    // the words read config.text_ keys (language packs), English as the fallback
    function pText(key, fallback) {
        return (config && config["text_" + key]) || fallback;
    }
    function listText(key, fallback, i) {
        var arr = String(pText(key, fallback)).split(",");
        return (arr[i] || fallback.split(",")[i] || "").trim();
    }

    obj.InitConfig = function (argconfig) { config = argconfig; };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;
        editor.openDrawingDialog = function (img) { obj.OpenDialog(img || null); };
        editor.attachEvent("exec_command_insertdrawing", function (state) {
            state.returnValue = true;
            obj.OpenDialog(null);
        });
        // double-click a drawing to keep drawing (bound through the editor so it survives a document swap)
        var onDbl = function (e) {
            var t = e.target;
            if (t && t.nodeType === 1 && t.nodeName === "IMG" && t.classList.contains("rte-drawing")) {
                e.preventDefault();
                e.stopPropagation();
                obj.OpenDialog(t);
            }
        };
        if (typeof editor.bindEditableEvent === "function") editor.bindEditableEvent("dblclick", onDbl, true);
        else { try { editor.getEditable().addEventListener("dblclick", onDbl, true); } catch (e) { /* ignore */ } }
    };

    function append(parent, tag, cssText, className) {
        var el = parent.ownerDocument.createElement(tag);
        if (cssText) el.style.cssText = cssText;
        if (className) el.className = className;
        parent.appendChild(el);
        return el;
    }
    function escAttr(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function readStrokes(img) {
        try {
            var d = JSON.parse(img.getAttribute("data-rte-drawing") || "");
            if (d && d.s && d.s.length !== undefined) return d;
        } catch (e) { /* not a drawing we can read: start empty */ }
        return null;
    }

    // one stroke: { t: "pen" | "marker" | "eraser", c: colour, w: width, p: [[x, y], ...] }
    function paintStroke(g, s) {
        if (!s.p || !s.p.length) return;
        g.save();
        g.globalCompositeOperation = s.t === "eraser" ? "destination-out" : "source-over";
        g.globalAlpha = s.t === "marker" ? 0.35 : 1;
        g.strokeStyle = s.c;
        g.fillStyle = s.c;
        g.lineWidth = s.w;
        g.lineCap = "round";
        g.lineJoin = "round";
        if (s.p.length === 1) {
            g.beginPath();
            g.arc(s.p[0][0], s.p[0][1], s.w / 2, 0, Math.PI * 2);
            g.fill();
        }
        else {
            g.beginPath();
            g.moveTo(s.p[0][0], s.p[0][1]);
            for (var i = 1; i < s.p.length - 1; i++) {
                var mx = (s.p[i][0] + s.p[i + 1][0]) / 2, my = (s.p[i][1] + s.p[i + 1][1]) / 2;
                g.quadraticCurveTo(s.p[i][0], s.p[i][1], mx, my);
            }
            var last = s.p[s.p.length - 1];
            g.lineTo(last[0], last[1]);
            g.stroke();
        }
        g.restore();
    }
    function paintAll(g, strokes, w, h) {
        g.clearRect(0, 0, w, h);
        for (var i = 0; i < strokes.length; i++) paintStroke(g, strokes[i]);
    }

    // the drawn area plus a margin, in canvas coordinates; null when nothing visible was drawn
    function inkBounds(strokes, w, h) {
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (var i = 0; i < strokes.length; i++) {
            var s = strokes[i];
            if (s.t === "eraser") continue;
            for (var j = 0; j < s.p.length; j++) {
                var r = s.w / 2;
                x0 = Math.min(x0, s.p[j][0] - r); y0 = Math.min(y0, s.p[j][1] - r);
                x1 = Math.max(x1, s.p[j][0] + r); y1 = Math.max(y1, s.p[j][1] + r);
            }
        }
        if (x0 === Infinity) return null;
        var pad = 12;
        x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad));
        x1 = Math.min(w, Math.ceil(x1 + pad)); y1 = Math.min(h, Math.ceil(y1 + pad));
        return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
    }

    function exportPng(doc, strokes, w, h) {
        var b = inkBounds(strokes, w, h);
        if (!b) return null;
        var scale = 2; // crisp on high-density screens
        var c = doc.createElement("canvas");
        c.width = b.w * scale;
        c.height = b.h * scale;
        var g = c.getContext("2d");
        g.setTransform(scale, 0, 0, scale, -b.x * scale, -b.y * scale);
        for (var i = 0; i < strokes.length; i++) paintStroke(g, strokes[i]);
        return { src: c.toDataURL("image/png"), w: b.w, h: b.h };
    }

    obj.OpenDialog = function (existing) {
        var W = config.drawingWidth | 0 || 640, H = config.drawingHeight | 0 || 360;
        var saved = existing ? readStrokes(existing) : null;
        var strokes = saved ? saved.s.slice() : [];
        var history = [];
        var tool = "pen", color = (config.drawingColors && config.drawingColors[0]) || "#1f2328", size = 4;

        var dlg = editor.createDialog(pText("drawingtitle", "Insert / edit drawing"), "rte-dialog-drawing");
        var close = typeof dlg.close === "function" ? function () { dlg.close(); } : function () { editor.closeCurrentPopup(); };
        var doc = dlg.ownerDocument;
        var wrap = append(dlg, "div", "padding:12px 14px;width:min(" + (W + 30) + "px, calc(100vw - 48px));box-sizing:border-box;font:13px system-ui,-apple-system,'Segoe UI',sans-serif");

        var bar = append(wrap, "div", "display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:8px");
        bar.setAttribute("role", "toolbar");
        bar.setAttribute("aria-label", pText("drawingtools", "Drawing tools"));
        var btnCss = "min-width:32px;height:30px;padding:0 9px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;color:#1f2328;cursor:pointer;font:12px system-ui,sans-serif";
        function pressed(list, on) {
            for (var i = 0; i < list.length; i++) {
                var p = list[i] === on;
                list[i].setAttribute("aria-pressed", p ? "true" : "false");
                list[i].style.borderColor = p ? "#0969da" : "#cbd5e1";
                list[i].style.boxShadow = p ? "0 0 0 2px rgba(9,105,218,.25)" : "none";
            }
        }
        var toolBtns = [];
        [["pen", pText("drawingpen", "Pen")], ["marker", pText("drawingmarker", "Marker")], ["eraser", pText("drawingeraser", "Eraser")]].forEach(function (t) {
            var b = append(bar, "button", btnCss);
            b.type = "button";
            b.textContent = t[1];
            b.setAttribute("data-rte-drawing-tool", t[0]);
            b.onclick = function () { tool = t[0]; pressed(toolBtns, b); };
            toolBtns.push(b);
        });
        pressed(toolBtns, toolBtns[0]);

        append(bar, "span", "width:1px;height:22px;background:#e2e8f0;margin:0 2px");
        var colorBtns = [];
        (config.drawingColors || []).forEach(function (c, i) {
            var b = append(bar, "button", "width:26px;height:26px;padding:0;border:2px solid #cbd5e1;border-radius:999px;cursor:pointer;background:" + c);
            b.type = "button";
            b.setAttribute("data-rte-drawing-color", c);
            b.setAttribute("aria-label", listText("drawingcolors", "Black,Blue,Red,Green,Orange,Purple", i) || c);
            b.title = b.getAttribute("aria-label");
            b.onclick = function () { color = c; if (tool === "eraser") { tool = "pen"; pressed(toolBtns, toolBtns[0]); } pressed(colorBtns, b); };
            colorBtns.push(b);
        });
        if (colorBtns.length) pressed(colorBtns, colorBtns[0]);

        append(bar, "span", "width:1px;height:22px;background:#e2e8f0;margin:0 2px");
        var sizeLabel = append(bar, "label", "display:inline-flex;align-items:center;gap:5px");
        append(sizeLabel, "span").textContent = pText("drawingsize", "Thickness");
        var sizeSel = append(sizeLabel, "select", "height:30px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:12px system-ui,sans-serif");
        [2, 4, 8, 14].forEach(function (v, i) {
            var o = append(sizeSel, "option");
            o.value = String(v);
            o.textContent = listText("drawingsizes", "Thin,Medium,Thick,Very thick", i);
        });
        sizeSel.value = String(size);
        sizeSel.onchange = function () { size = parseInt(sizeSel.value, 10) || 4; };

        append(bar, "span", "flex:1");
        var undoBtn = append(bar, "button", btnCss);
        undoBtn.type = "button";
        undoBtn.textContent = pText("drawingundo", "Undo stroke");
        var clearBtn = append(bar, "button", btnCss);
        clearBtn.type = "button";
        clearBtn.textContent = pText("drawingclear", "Clear");

        var canvas = append(wrap, "canvas", "display:block;width:100%;height:auto;aspect-ratio:" + W + " / " + H + ";background:#fff;border:1px solid #cbd5e1;border-radius:8px;touch-action:none;cursor:crosshair", "rte-drawing-canvas");
        var dpr = Math.min(2, (doc.defaultView && doc.defaultView.devicePixelRatio) || 1);
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", pText("drawingcanvas", "Drawing area: draw with a mouse, a pen or a finger"));
        var g = canvas.getContext("2d");
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        function repaint() { g.setTransform(dpr, 0, 0, dpr, 0, 0); paintAll(g, strokes, W, H); undoBtn.disabled = !history.length; }
        function remember() { history.push(strokes.slice()); }
        undoBtn.onclick = function () { if (history.length) { strokes = history.pop(); repaint(); } };
        clearBtn.onclick = function () { if (strokes.length) { remember(); strokes = []; repaint(); } };

        var live = null;
        function at(e) {
            var r = canvas.getBoundingClientRect();
            var x = (e.clientX - r.left) * (W / (r.width || W)), y = (e.clientY - r.top) * (H / (r.height || H));
            return [Math.round(Math.max(0, Math.min(W, x)) * 10) / 10, Math.round(Math.max(0, Math.min(H, y)) * 10) / 10];
        }
        canvas.addEventListener("pointerdown", function (e) {
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
            remember();
            live = { t: tool, c: color, w: tool === "marker" ? size * 3 : (tool === "eraser" ? size * 3 : size), p: [at(e)] };
            strokes.push(live);
            repaint();
        });
        canvas.addEventListener("pointermove", function (e) {
            if (!live) return;
            var pt = at(e), lp = live.p[live.p.length - 1];
            if (Math.abs(pt[0] - lp[0]) + Math.abs(pt[1] - lp[1]) < 1) return;
            live.p.push(pt);
            repaint();
        });
        function end() { live = null; }
        canvas.addEventListener("pointerup", end);
        canvas.addEventListener("pointercancel", end);
        canvas.addEventListener("lostpointercapture", end);

        var altLabel = append(wrap, "label", "display:flex;align-items:center;gap:8px;margin-top:10px");
        append(altLabel, "span", "white-space:nowrap").textContent = pText("drawingalt", "Description (alt text)");
        var alt = append(altLabel, "input", "flex:1;min-width:0;height:30px;padding:0 8px;border:1px solid #cbd5e1;border-radius:7px;font:13px system-ui,sans-serif", "rte-drawing-alt");
        alt.type = "text";
        alt.value = existing ? (existing.getAttribute("alt") || "") : "";
        alt.placeholder = pText("drawingaltdefault", "Drawing");

        var footer = append(wrap, "div", "display:flex;justify-content:flex-end;gap:8px;margin-top:12px");
        var cancel = append(footer, "button", "padding:6px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer");
        cancel.type = "button";
        cancel.textContent = pText("cancel", "Cancel");
        cancel.onclick = close;
        var ok = append(footer, "button", "padding:6px 14px;border:1px solid #0969da;border-radius:8px;background:#0969da;color:#fff;cursor:pointer", "rte-drawing-insert");
        ok.type = "button";
        ok.textContent = existing ? pText("update", "Update") : pText("insert", "Insert");

        wrap.addEventListener("keydown", function (e) {
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "z" || e.key === "Z") && e.target.nodeName !== "INPUT") {
                e.preventDefault();
                e.stopPropagation();
                undoBtn.onclick();
            }
        });

        ok.onclick = function () {
            var png = exportPng(doc, strokes, W, H);
            var altText = alt.value.trim() || pText("drawingaltdefault", "Drawing");
            if (!png) {
                // nothing left to show: an existing drawing that was cleared is removed
                close();
                if (existing && existing.parentNode) {
                    try { editor.commitBookmark(); } catch (e) { /* ignore */ }
                    existing.parentNode.removeChild(existing);
                    try { editor.recordUndo(); } catch (e) { /* ignore */ }
                }
                editor.focus();
                return;
            }
            var data = JSON.stringify({ v: 1, w: W, h: H, s: strokes });
            close();
            if (existing && existing.parentNode) {
                try { editor.commitBookmark(); } catch (e) { /* ignore */ }
                existing.setAttribute("src", png.src);
                existing.setAttribute("width", String(png.w));
                existing.setAttribute("height", String(png.h));
                existing.setAttribute("alt", altText);
                existing.setAttribute("data-rte-drawing", data);
                try { editor.recordUndo(); } catch (e) { /* ignore */ }
                editor.focus();
                return;
            }
            editor.focus();
            editor.insertHTML('<img class="rte-drawing" src="' + png.src + '" width="' + png.w + '" height="' + png.h
                + '" alt="' + escAttr(altText) + '" data-rte-drawing="' + escAttr(data) + '" />');
        };

        repaint();
        setTimeout(function () { try { toolBtns[0].focus(); } catch (e) { /* ignore */ } }, 0);
    };
}
