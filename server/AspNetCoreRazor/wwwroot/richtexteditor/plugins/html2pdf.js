

if (!RTE_DefaultConfig.svgCode_html2pdf) {
	RTE_DefaultConfig.svgCode_html2pdf = '<svg viewBox="-2 -2 36 36" fill="#5F6368"><polygon points="30 11 30 9 22 9 22 23 24 23 24 17 29 17 29 15 24 15 24 11 30 11"></polygon><path d="M8,9H2V23H4V18H8a2,2,0,0,0,2-2V11A2,2,0,0,0,8,9Zm0,7H4V11H8Z"></path><path d="M16,23H12V9h4a4,4,0,0,1,4,4v6A4,4,0,0,1,16,23Zm-2-2h2a2,2,0,0,0,2-2V13a2,2,0,0,0-2-2H14Z"></path><title>PDF</title></svg>'
}

RTE_DefaultConfig.plugin_html2pdf = RTE_Plugin_Html2PDF;

// Where to load the html2pdf renderer from. Leave null to use the pinned copy
// shipped in <url_base>/plugins/vendor/. Set it to serve the bundle from your own
// CDN, a versioned asset path, or a different build.
if (typeof RTE_DefaultConfig.html2pdfScriptUrl === "undefined") RTE_DefaultConfig.html2pdfScriptUrl = null;

function RTE_Plugin_Html2PDF() {

	// The html2pdf renderer (jsPDF + html2canvas) is ~900 KB, so it is loaded on
	// demand rather than bundled — but it is served from YOUR OWN assets by
	// default, alongside the rest of the editor.
	//
	// It used to be pulled from a GitHub raw-CDN URL that tracked a branch rather
	// than a release. That meant PDF export required a public network round-trip
	// (so it failed offline / air-gapped), demanded a third-party `script-src`
	// entry in any Content-Security-Policy, and could change underneath the
	// product with no version pin. The bundled copy is pinned at html2pdf.js
	// 0.14.0.
	//
	// Resolution order:
	//   1. config.html2pdfScriptUrl        — explicit override (absolute or relative)
	//   2. <url_base>/plugins/vendor/...   — the copy shipped with the editor
	//   3. a pinned CDN URL                — last resort if url_base is unknown
	var VENDOR_PATH = "/plugins/vendor/html2pdf.bundle.min.js";
	// 2026-07-31 There is deliberately NO built-in CDN fallback any more.
	//
	// A fallback that silently reaches a third-party CDN when url_base happens to
	// be unset is the worst of both worlds: it hides a misconfiguration, and it
	// puts a public URL in a file that security-scanned deployments must ship.
	// Failing loudly is better -- the host either serves the vendored copy or
	// points html2pdfScriptUrl wherever it wants, including its own CDN.

	// The script tag is written into a generated iframe whose base URL is not the
	// host page, so the URL has to be absolute by the time it is injected.
	function absoluteUrl(url) {
		try { return new URL(url, document.baseURI || location.href).href; }
		catch (e) { return url; }
	}

	function resolveScriptUrl() {
		if (config && config.html2pdfScriptUrl) return absoluteUrl(config.html2pdfScriptUrl);
		var base = config && config.url_base ? String(config.url_base).replace(/\/+$/, "") : "";
		if (base) return absoluteUrl(base + VENDOR_PATH);
		// No url_base and no explicit override: resolve against the page instead
		// of reaching outside. If that 404s the failure is visible and local,
		// which is what a misconfigured deployment should look like.
		return absoluteUrl("." + VENDOR_PATH);
	}

	var obj = this;

	var config, editor;

	obj.PluginName = "Html2PDF";

	obj.InitConfig = function (argconfig) {
		config = argconfig;
	}
	obj.InitEditor = function (argeditor) {
		editor = argeditor;

		editor.attachEvent("exec_command_html2pdf", function (state, cmd, value) {
			obj.DoHtml2PDF();
			state.returnValue = true;
		});

		editor.toolbarFactoryMap["html2pdf"] = function (cmd) {
			//console.log(cmd);
			var span = editor.createToolbarButton(cmd);
			span.style.backgroundColor = ''
			return span;
		};

	}

	// Paper size / orientation / margins for the exported PDF, taken from the
	// document's page setup when it has one. Returns the historical
	// letter/portrait/0.5in defaults otherwise, so documents without a page
	// setup export exactly as they always have.
	obj.GetPdfPageOptions = function () {
		var fallback = { format: 'letter', orientation: 'portrait', margin: 0.5 };

		var setup = null;
		try {
			if (editor && typeof editor.getDocumentPageSetup === "function") setup = editor.getDocumentPageSetup();
		} catch (e) { setup = null; }
		if (!setup || typeof setup !== "object") return fallback;

		// jsPDF understands these page-format names.
		var SUPPORTED = { a3: 1, a4: 1, a5: 1, letter: 1, legal: 1, tabloid: 1 };
		var fmt = String(setup.format || "").toLowerCase();
		var orientation = String(setup.orientation || "").toLowerCase() === "landscape" ? "landscape" : fallback.orientation;

		var result = {
			format: SUPPORTED[fmt] ? fmt : fallback.format,
			orientation: orientation,
			margin: fallback.margin
		};

		// Margins are emitted in inches, matching jsPDF's unit: 'in'.
		var m = setup.margins;
		if (m && typeof m === "object") {
			var top = __ToInches(m.top), right = __ToInches(m.right);
			var bottom = __ToInches(m.bottom), left = __ToInches(m.left);
			if (top !== null && right !== null && bottom !== null && left !== null) {
				result.margin = [top, right, bottom, left];
			}
		}
		return result;
	};

	// Accepts a bare number (already inches) or a CSS length string.
	function __ToInches(v) {
		if (typeof v === "number" && isFinite(v)) return v;
		if (typeof v !== "string") return null;
		var m = /^\s*(-?[\d.]+)\s*(mm|cm|in|px|pt)?\s*$/.exec(v);
		if (!m) return null;
		var n = parseFloat(m[1]);
		if (!isFinite(n)) return null;
		switch (m[2]) {
			case "mm": return n / 25.4;
			case "cm": return n / 2.54;
			case "pt": return n / 72;
			case "px": return n / 96;
			default: return n; // bare number or explicit "in"
		}
	}

	function __Append(parent, tagname, csstext, cssclass) {
		var tag = parent.ownerDocument.createElement(tagname);
		if (csstext) tag.style.cssText = csstext;
		if (cssclass) tag.className = cssclass;
		parent.appendChild(tag);
		return tag;
	}


	function dataURLToBlob(dataurl) {
		var arr = dataurl.split(',');
		var mime = arr[0].match(/:(.*?);/)[1];
		var bstr = atob(arr[1]);
		var n = bstr.length;
		var u8arr = new Uint8Array(n);
		while (n--) {
			u8arr[n] = bstr.charCodeAt(n);
		}
		return new Blob([u8arr], { type: mime });
	}

	obj.DoHtml2PDF = function () {

		var dialoginner = editor.createDialog("Html2PDF", "rte-dialog-html2pdf");

		var div2 = __Append(dialoginner, "div", "position:relative;text-align:center;");

		div2.innerHTML = "Loading...";

		var imgrect = __Append(dialoginner, "div", "position:relative;text-align:center;")

		window.html2pdf_callback = function (win) {

			if (!win.html2pdf) {
				div2.innerHTML = "Failed to load script.";
				return;
			}

			div2.innerHTML = "Exporting...";

			// Honor the document's own page setup (paper size, orientation and
			// margins) so the exported PDF matches the paginated page view and the
			// Word export instead of always emitting US Letter. Falls back to the
			// previous fixed letter/portrait/0.5in defaults when the document
			// carries no page setup, so existing integrations are unaffected.
			var page = obj.GetPdfPageOptions();

			var opt = {
				margin: page.margin,
				filename: 'myfile.pdf',
				image: { type: 'jpeg', quality: 0.98 },
				html2canvas: { scale: 2 },
				jsPDF: { unit: 'in', format: page.format, orientation: page.orientation }
			};

			var promimg = win.html2pdf().set(opt).from(win.document.body).outputImg();
			promimg.then(function (img) {

				var dataurl = img.getAttribute('src');
				if (dataurl.indexOf("base64") == -1) {
					div2.innerHTML = "Error, no data.";
					return;
				}

				var imgblob = dataURLToBlob(dataurl);
				var imgurl = URL.createObjectURL(imgblob);
				img.setAttribute("src", imgurl);

				var prom = win.html2pdf().set(opt).from(win.document.body).outputPdf();
				prom.then(function (str) {
					var bin = new Array(str.length);
					for (var i = 0; i < str.length; i++)
						bin[i] = str.charCodeAt(i);
					var blob = new Blob([new Uint8Array(bin)], { type: "application/pdf" })
					var url = URL.createObjectURL(blob);
					div2.innerHTML = Math.ceil(str.length / 1024) + "KB Exported<br/><a href='" + url + "' target=_blank>Download PDF</a>";

					var pdflink = div2.querySelector("a");

					var date = new Date();
					var ymd = String(date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()).substring(2);
					var hms = String(1000000 + date.getHours() * 10000 + date.getMinutes() * 100 + date.getSeconds()).substring(1);
					pdflink.download = "Export-" + ymd + "-" + hms + ".pdf";

					//a.rel = 'noopener'

					pdflink.click();

					img.style.cssText = "max-width:300px;max-height:200px;margin:5px;padding:10px;border:solid 1px #eee;box-shadow:2px 2px 6px #eee"
					imgrect.appendChild(img)

					__Append(imgrect, "br");
					var imglink = __Append(imgrect, "a");
					imglink.setAttribute("href", imgurl);
					imglink.setAttribute("target", "_blank");
					imglink.download = "Export-" + ymd + "-" + hms + ".jpg";
					imglink.innerText = "Download Img";

					//dialoginner.close();

				}).catch(function (x) {
					console.error(x);
				})

			}).catch(function (x) {
				console.error(x);
			})


		}

		var div1 = __Append(dialoginner, "div", "position:relative;text-align:center;");

		iframe = __Append(div1, "iframe", "align-self:center;flex:99;width:100%;height:0px;border:0px;", "rte-editable");
		iframe.contentDocument.open("text/html");
		iframe.contentDocument.write("<html><head><link id='url-css-preview' rel='stylesheet' href='" + editor.htmlEncode(config.previewCssUrl) + "'/>"
			+ "<script src='" + editor.htmlEncode(resolveScriptUrl()) + "'></script></head><body style='padding:10px;margin:0px'>"
			+ editor.getHTMLCode() + "</body>"
			+ "<script>window.onload=function(){setTimeout(function(){parent.html2pdf_callback(window)},100)}</script></html>")
		iframe.contentDocument.close();

	}
}




