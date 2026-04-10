

if (!RTE_DefaultConfig.svgCode_html2pdf) {
	RTE_DefaultConfig.svgCode_html2pdf = '<svg viewBox="-2 -2 36 36" fill="#5F6368"><polygon points="30 11 30 9 22 9 22 23 24 23 24 17 29 17 29 15 24 15 24 11 30 11"></polygon><path d="M8,9H2V23H4V18H8a2,2,0,0,0,2-2V11A2,2,0,0,0,8,9Zm0,7H4V11H8Z"></path><path d="M16,23H12V9h4a4,4,0,0,1,4,4v6A4,4,0,0,1,16,23Zm-2-2h2a2,2,0,0,0,2-2V13a2,2,0,0,0-2-2H14Z"></path><title>PDF</title></svg>'
}

RTE_DefaultConfig.plugin_html2pdf = RTE_Plugin_Html2PDF;

function RTE_Plugin_Html2PDF() {

	var scripturl = "https://raw.githack.com/eKoopmans/html2pdf/master/dist/html2pdf.bundle.js";

	var obj = this;

	var config, editor;

	obj.PluginName = "Html2PDF";

	obj.InitConfig = function (argconfig) {
		config = argconfig;
	}
	obj.InitEditor = function (argeditor) {
		editor = argeditor;

		editor.attachEvent("exec_command_html2pdf", function (state, cmd, value) {
			console.log(state, cmd, value);
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

			var opt = {
				margin: 0.5,
				filename: 'myfile.pdf',
				image: { type: 'jpeg', quality: 0.98 },
				html2canvas: { scale: 2 },
				jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
			};

			var promimg = win.html2pdf().set(opt).from(win.document.body).outputImg();
			promimg.then(function (img) {

				var dataurl = img.getAttribute('src');
				if (dataurl.indexOf("base64") == -1) {
					div2.innerHTML = "Error, no data.";
					return;
				}

				var imgblob = dataURLToBlob(dataurl);
				console.log(imgblob);
				var imgurl = URL.createObjectURL(imgblob);
				img.setAttribute("src", imgurl);

				var prom = win.html2pdf().set(opt).from(win.document.body).outputPdf();
				prom.then(function (str) {

					console.log("done", str.length)

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
			+ "<script src='" + editor.htmlEncode(scripturl) + "'></script></head><body style='padding:10px;margin:0px'>"
			+ editor.getHTMLCode() + "</body>"
			+ "<script>window.onload=function(){setTimeout(function(){parent.html2pdf_callback(window)},100)}</script></html>")
		iframe.contentDocument.close();

	}
}








if (!RTE_DefaultConfig.svgCode_imageeditor) {
	RTE_DefaultConfig.svgCode_imageeditor = '<svg viewBox="-2 -2 20 20" fill="#5F6368"><style>.st0{fill:#f6f6f6}.st1{fill:#424242}.st2{fill:none}.st3{fill:#f0eff1}</style><path class="st0" d="M1 0v6H0v10h10v-1h6V0z" id="outline"/><g id="icon_x5F_bg"><path class="st1" d="M2 5h1v1H2zM2 3h1v1H2zM2 1h1v1H2zM4 1h1.001v1H4zM6 1h1v1H6zM8 1h1v1H8zM10 1h1v1h-1zM12 1h1v1h-1zM14 1h1v1h-1zM14 3h1v1h-1zM14 5h1v1h-1zM14 7h1v1h-1zM14 9h1v1h-1zM14 10.999h1V12h-1zM14 13h1v1h-1zM12 13h1v1h-1zM11 11V5H5v1H4V4h8v7z"/><circle class="st1" cx="6.192" cy="9.807" r=".807"/><path class="st1" d="M1 7v8h8V7H1zm1 7.001v-.28l2.537-1.463L7.554 14l.001.001H2zm6-.93l-3.463-1.982L2 12.491v-4.49h6v5.07zM10 13h1v1h-1z"/></g><g id="icon_x5F_fg"><path class="st2" d="M2 14h5.554v.001H2z"/><path class="st3" d="M11 5v6h-1V6H5V5z"/><path class="st3" d="M2 12.491l2.537-1.402L8 13.071v-5.07H2v4.49zM6.192 9a.807.807 0 1 1 .001 1.615A.807.807 0 0 1 6.192 9z"/><path class="st3" d="M2 13.721V14h5.554l-3.017-1.742z"/></g></svg>';
}

RTE_DefaultConfig.plugin_imageeditor = RTE_Plugin_ImageEditor;

function RTE_Plugin_ImageEditor() {



	var obj = this;

	var config, editor;

	obj.PluginName = "ImageEditor";

	obj.InitConfig = function (argconfig) {
		config = argconfig;
	}
	obj.InitEditor = function (argeditor) {
		editor = argeditor;

		editor.attachEvent("exec_command_imageeditor", function (state, cmd, value) {
			obj.DoImageEditor();
			state.returnValue = true;
		});

		editor.toolbarFactoryMap["imageeditor"] = function (cmd) {
			var span = editor.createToolbarButton(cmd);
			span.style.backgroundColor = ''
			return span;
		};

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

	obj.DoImageEditor = function () {

		var img = editor.getSelectedControl();
		if (!img)
			return;

		var dialoginner = editor.createDialog("ImageEditor", "rte-dialog-imageeditor");

		dialoginner.style.width = "90%";
		dialoginner.style.height = "90%";


		var scriptbase = config.url_base + "/plugins/tui.image-editor/";

		window.rte_image_editor_callback = function (win) {
			console.log(win);
			var options = {
				includeUI: {
					loadImage: {
						path: img.src,
						name: 'RteImage'
					},
					//locale: locale_ru_RU,
					theme: {
						// main icons
						'menu.normalIcon.path': scriptbase + 'svg/icon-d.svg',
						'menu.activeIcon.path': scriptbase + 'svg/icon-b.svg',
						'menu.disabledIcon.path': scriptbase + 'svg/icon-a.svg',
						'menu.hoverIcon.path': scriptbase + 'svg/icon-c.svg',
						// submenu icons
						'submenu.normalIcon.path': scriptbase + 'svg/icon-d.svg',
						'submenu.normalIcon.name': 'icon-d',
						'submenu.activeIcon.path': scriptbase + 'svg/icon-c.svg',
						'submenu.activeIcon.name': 'icon-c'
					},
					//initMenu: 'filter',
					menuBarPosition: 'bottom'
				},

				cssMaxWidth: 700,
				cssMaxHeight: 500,
				selectionStyle: {
					cornerSize: 20,
					rotatingPointOffset: 70
				}
			};
			var imgeditor = new win.tui.ImageEditor(win.document.querySelector('#tui-image-editor'), options);

			var btns = win.document.querySelector('.tui-image-editor-header-buttons');
			btns.innerHTML = '';
			var savebtn = __Append(btns, "button", "");
			savebtn.innerText = "Save";
			savebtn.onclick = function () {

				var dataurl = imgeditor.toDataURL();
				if (!config.file_upload_handler) {
					img.src = dataurl;
					editor.notifySelectionChange();
					dialoginner.close();
					return;
				}

				var file = dataURLToBlob(dataurl);

				config.file_upload_handler(file, function (url, error) {
					if (url) {
						img.src = url;
						editor.notifySelectionChange();
						dialoginner.close();
						return;
					}
					if (error) {
						//TODO:retry dialog or cancel
						alert("upload failed , TODO:show retry dialog or cancel");
					}
					else {
						alert("Developer warning : ");
					}
				});


			}

		}

		iframe = __Append(dialoginner, "iframe", "align-self:center;flex:99;width:100%;height:100%px;border:0px;", "rte-editable");
		iframe.contentDocument.open("text/html");
		iframe.contentDocument.write("<html><head><base href='" + editor.htmlEncode(location.href) + "'/>"
			+ "<link id='url-css-preview' rel='stylesheet' href='" + editor.htmlEncode(scriptbase + "tui-color-picker.min.css") + "'/>"
			+ "<link id='url-css-preview' rel='stylesheet' href='" + editor.htmlEncode(scriptbase + "tui-image-editor.min.css") + "'/>"
			+ "<script src='" + editor.htmlEncode(scriptbase + "fabric.min.js") + "'></script>"
			+ "<script src='" + editor.htmlEncode(scriptbase + "tui-color-picker.min.js") + "'></script>"
			+ "<script src='" + editor.htmlEncode(scriptbase + "tui-code-snippet.min.js") + "'></script>"
			+ "<script src='" + editor.htmlEncode(scriptbase + "tui-image-editor.min.js") + "'></script>"
			+ "</head><body style='padding:10px;margin:0px'><div id='tui-image-editor'></div></body>"
			+ "<script>window.onload=function(){setTimeout(function(){parent.rte_image_editor_callback(window)},100)}</script></html>")
		iframe.contentDocument.close();
	}
}







if (!RTE_DefaultConfig.svgCode_insertcode) {
	RTE_DefaultConfig.svgCode_insertcode = '<svg viewBox="-2 -2 20 20" fill="#5F6368"><path fill-rule="evenodd" d="M4 1h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2zm0 1a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V3a1 1 0 00-1-1H4z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M8.646 5.646a.5.5 0 01.708 0l2 2a.5.5 0 010 .708l-2 2a.5.5 0 01-.708-.708L10.293 8 8.646 6.354a.5.5 0 010-.708zm-1.292 0a.5.5 0 00-.708 0l-2 2a.5.5 0 000 .708l2 2a.5.5 0 00.708-.708L5.707 8l1.647-1.646a.5.5 0 000-.708z" clip-rule="evenodd"/></svg>';
}

RTE_DefaultConfig.plugin_insertcode = RTE_Plugin_InsertCode;

function RTE_Plugin_InsertCode() {


	var dp = { sh: { Toolbar: {}, Utils: {}, RegexLib: {}, Brushes: {}, Version: '1.5.1' } };
	dp.InsertCode = dp.sh;


	dp.sh.Utils.CopyStyles = function (destDoc, sourceDoc) {
		var links = sourceDoc.getElementsByTagName('link'); for (var i = 0; i < links.length; i++)
			if (links[i].rel.toLowerCase() == 'stylesheet')
				destDoc.write('<link type="text/css" rel="stylesheet" href="' + links[i].href + '"></link>');
	}
	dp.sh.Utils.FixForBlogger = function (str) { return (dp.sh.isBloggerMode == true) ? str.replace(/<br\s*\/?>|&lt;br\s*\/?&gt;/gi, '\n') : str; }
	dp.sh.RegexLib = { MultiLineCComments: new RegExp('/\\*[\\s\\S]*?\\*/', 'gm'), SingleLineCComments: new RegExp('//.*$', 'gm'), SingleLinePerlComments: new RegExp('#.*$', 'gm'), DoubleQuotedString: new RegExp('"(?:\\.|(\\\\\\")|[^\\""\\n])*"', 'g'), SingleQuotedString: new RegExp("'(?:\\.|(\\\\\\')|[^\\''\\n])*'", 'g') }; dp.sh.Match = function (value, index, css) { this.value = value; this.index = index; this.length = value.length; this.css = css; }
	dp.sh.Highlighter = function () { this.noGutter = false; this.addControls = true; this.collapse = false; this.tabsToSpaces = true; this.wrapColumn = 80; this.showColumns = true; }
	dp.sh.Highlighter.SortCallback = function (m1, m2) {
		if (m1.index < m2.index)
			return -1; else if (m1.index > m2.index)
			return 1; else {
			if (m1.length < m2.length)
				return -1; else if (m1.length > m2.length)
				return 1;
		}
		return 0;
	}
	dp.sh.Highlighter.prototype.CreateElement = function (name) { var result = document.createElement(name); result.highlighter = this; return result; }
	dp.sh.Highlighter.prototype.GetMatches = function (regex, css) {
		var index = 0; var match = null; while ((match = regex.exec(this.code)) != null)
			this.matches[this.matches.length] = new dp.sh.Match(match[0], match.index, css);
	}
	dp.sh.Highlighter.prototype.AddBit = function (str, css) {
		if (str == null || str.length == 0)
			return; var span = this.CreateElement('SPAN'); str = str.replace(/ /g, '&nbsp;'); str = str.replace(/</g, '&lt;'); str = str.replace(/\n/gm, '&nbsp;<br>'); if (css != null) {
				if ((/br/gi).test(str)) {
					var lines = str.split('&nbsp;<br>'); for (var i = 0; i < lines.length; i++) {
						span = this.CreateElement('SPAN'); span.className = css; span.innerHTML = lines[i]; this.div.appendChild(span); if (i + 1 < lines.length)
							this.div.appendChild(this.CreateElement('BR'));
					}
				}
				else { span.className = css; span.innerHTML = str; this.div.appendChild(span); }
			}
		else { span.innerHTML = str; this.div.appendChild(span); }
	}
	dp.sh.Highlighter.prototype.IsInside = function (match) {
		if (match == null || match.length == 0)
			return false; for (var i = 0; i < this.matches.length; i++) {
				var c = this.matches[i]; if (c == null)
					continue; if ((match.index > c.index) && (match.index < c.index + c.length))
					return true;
			}
		return false;
	}
	dp.sh.Highlighter.prototype.ProcessRegexList = function () {
		for (var i = 0; i < this.regexList.length; i++)
			this.GetMatches(this.regexList[i].regex, this.regexList[i].css);
	}
	dp.sh.Highlighter.prototype.ProcessSmartTabs = function (code) {
		var lines = code.split('\n'); var result = ''; var tabSize = 4; var tab = '\t'; function InsertSpaces(line, pos, count) {
			var left = line.substr(0, pos); var right = line.substr(pos + 1, line.length); var spaces = ''; for (var i = 0; i < count; i++)
				spaces += ' '; return left + spaces + right;
		}
		function ProcessLine(line, tabSize) {
			if (line.indexOf(tab) == -1)
				return line; var pos = 0; while ((pos = line.indexOf(tab)) != -1) { var spaces = tabSize - pos % tabSize; line = InsertSpaces(line, pos, spaces); }
			return line;
		}
		for (var i = 0; i < lines.length; i++)
			result += ProcessLine(lines[i], tabSize) + '\n'; return result;
	}
	dp.sh.Highlighter.prototype.SwitchToList = function () {
		var html = this.div.innerHTML.replace(/<(br)\/?>/gi, '\n'); var lines = html.split('\n'); if (this.addControls == true)
			this.bar.appendChild(dp.sh.Toolbar.Create(this)); if (this.showColumns) {
				var div = this.CreateElement('div'); var columns = this.CreateElement('div'); var showEvery = 10; var i = 1; while (i <= 150) {
					if (i % showEvery == 0) { div.innerHTML += i; i += (i + '').length; }
					else { div.innerHTML += '&middot;'; i++; }
				}
				columns.className = 'columns'; columns.appendChild(div); this.bar.appendChild(columns);
			}
		for (var i = 0, lineIndex = this.firstLine; i < lines.length - 1; i++, lineIndex++) { var li = this.CreateElement('LI'); var span = this.CreateElement('SPAN'); li.className = (i % 2 == 0) ? 'alt' : ''; span.innerHTML = lines[i] + '&nbsp;'; li.appendChild(span); this.ol.appendChild(li); }
		this.div.innerHTML = '';
	}
	dp.sh.Highlighter.prototype.Highlight = function (code) {
		function Trim(str) { return str.replace(/^\s*(.*?)[\s\n]*$/g, '$1'); }
		function Chop(str) { return str.replace(/\n*$/, '').replace(/^\n*/, ''); }
		function Unindent(str) {
			var lines = dp.sh.Utils.FixForBlogger(str).split('\n'); var indents = new Array(); var regex = new RegExp('^\\s*', 'g'); var min = 1000; for (var i = 0; i < lines.length && min > 0; i++) {
				if (Trim(lines[i]).length == 0)
					continue; var matches = regex.exec(lines[i]); if (matches != null && matches.length > 0)
					min = Math.min(matches[0].length, min);
			}
			if (min > 0)
				for (var i = 0; i < lines.length; i++)
					lines[i] = lines[i].substr(min); return lines.join('\n');
		}
		function Copy(string, pos1, pos2) { return string.substr(pos1, pos2 - pos1); }
		var pos = 0; if (code == null)
			code = ''; this.originalCode = code; this.code = Chop(Unindent(code)); this.div = this.CreateElement('DIV'); this.bar = this.CreateElement('DIV'); this.ol = this.CreateElement('OL'); this.matches = new Array(); this.div.className = 'dp-highlighter'; this.div.highlighter = this; this.bar.className = 'bar'; this.ol.start = this.firstLine; if (this.CssClass != null)
			this.ol.className = this.CssClass; if (this.collapse)
			this.div.className += ' collapsed'; if (this.noGutter)
			this.div.className += ' nogutter'; if (this.tabsToSpaces == true)
			this.code = this.ProcessSmartTabs(this.code); this.ProcessRegexList(); if (this.matches.length == 0) { this.AddBit(this.code, null); this.SwitchToList(); this.div.appendChild(this.bar); this.div.appendChild(this.ol); return; }
		this.matches = this.matches.sort(dp.sh.Highlighter.SortCallback); for (var i = 0; i < this.matches.length; i++)
			if (this.IsInside(this.matches[i]))
				this.matches[i] = null; for (var i = 0; i < this.matches.length; i++) {
					var match = this.matches[i]; if (match == null || match.length == 0)
						continue; this.AddBit(Copy(this.code, pos, match.index), null); this.AddBit(match.value, match.css); pos = match.index + match.length;
				}
		this.AddBit(this.code.substr(pos), null); this.SwitchToList(); this.div.appendChild(this.bar); this.div.appendChild(this.ol);
	}
	dp.sh.Highlighter.prototype.GetKeywords = function (str) { return '\\b' + str.replace(/ /g, '\\b|\\b') + '\\b'; }
	dp.sh.BloggerMode = function () { dp.sh.isBloggerMode = true; }
	dp.sh.HighlightAll = function (element, showGutter, showControls, collapseAll, firstLine, showColumns) {
		function FindValue() {
			var a = arguments; for (var i = 0; i < a.length; i++) {
				if (a[i] == null)
					continue; if (typeof (a[i]) == 'string' && a[i] != '')
					return a[i] + ''; if (typeof (a[i]) == 'object' && a[i].value != '')
					return a[i].value + '';
			}
			return null;
		}
		function IsOptionSet(value, list) {
			for (var i = 0; i < list.length; i++)
				if (list[i] == value)
					return true; return false;
		}
		function GetOptionValue(name, list, defaultValue) {
			var regex = new RegExp('^' + name + '\\[(\\w+)\\]$', 'gi'); var matches = null; for (var i = 0; i < list.length; i++)
				if ((matches = regex.exec(list[i])) != null)
					return matches[1]; return defaultValue;
		}
		function FindTagsByName(list, name, tagName) {
			var tags = document.getElementsByTagName(tagName); for (var i = 0; i < tags.length; i++)
				if (tags[i].getAttribute('name') == name)
					list.push(tags[i]);
		}
		var elements = [element]; var highlighter = null; var registered = {}; var propertyName = 'innerHTML';

		for (var brush in dp.sh.Brushes) {
			var aliases = dp.sh.Brushes[brush].Aliases; if (aliases == null)
				continue; for (var i = 0; i < aliases.length; i++)
				registered[aliases[i]] = brush;
		}

		for (var i = 0; i < elements.length; i++) {
			var element = elements[i]; var options = FindValue(element.attributes['class'], element.className, element.attributes['language'], element.language); var language = ''; if (options == null)
				continue; options = options.split(':'); language = options[0].toLowerCase(); if (registered[language] == null)
				continue; highlighter = new dp.sh.Brushes[registered[language]](); element.style.display = 'none'; highlighter.noGutter = (showGutter == null) ? IsOptionSet('nogutter', options) : !showGutter; highlighter.addControls = (showControls == null) ? !IsOptionSet('nocontrols', options) : showControls; highlighter.collapse = (collapseAll == null) ? IsOptionSet('collapse', options) : collapseAll; highlighter.showColumns = (showColumns == null) ? IsOptionSet('showcolumns', options) : showColumns; var headNode = document.getElementsByTagName('head')[0]; if (highlighter.Style && headNode) {
					var styleNode = document.createElement('style'); styleNode.setAttribute('type', 'text/css'); if (styleNode.styleSheet) { styleNode.styleSheet.cssText = highlighter.Style; }
					else { var textNode = document.createTextNode(highlighter.Style); styleNode.appendChild(textNode); }
					headNode.appendChild(styleNode);
				}
			highlighter.firstLine = (firstLine == null) ? parseInt(GetOptionValue('firstline', options, 1)) : firstLine; highlighter.Highlight(element[propertyName]); highlighter.source = element; element.parentNode.insertBefore(highlighter.div, element);
		}
	}


	dp.sh.Brushes.JScript = function () { var keywords = 'abstract boolean break byte case catch char class const continue debugger ' + 'default delete do double else enum export extends false final finally float ' + 'for function goto if implements import in instanceof int interface long native ' + 'new null package private protected public return short static super switch ' + 'synchronized this throw throws transient true try typeof var void volatile while with'; this.regexList = [{ regex: dp.sh.RegexLib.SingleLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.MultiLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string' }, { regex: dp.sh.RegexLib.SingleQuotedString, css: 'string' }, { regex: new RegExp('^\\s*#.*', 'gm'), css: 'preprocessor' }, { regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword' }]; this.CssClass = 'dp-c'; }
	dp.sh.Brushes.JScript.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.JScript.Aliases = ['js', 'jscript', 'javascript'];

	dp.sh.Brushes.Java = function () { var keywords = 'abstract assert boolean break byte case catch char class const ' + 'continue default do double else enum extends ' + 'false final finally float for goto if implements import ' + 'instanceof int interface long native new null ' + 'package private protected public return ' + 'short static strictfp super switch synchronized this throw throws true ' + 'transient try void volatile while'; this.regexList = [{ regex: dp.sh.RegexLib.SingleLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.MultiLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string' }, { regex: dp.sh.RegexLib.SingleQuotedString, css: 'string' }, { regex: new RegExp('\\b([\\d]+(\\.[\\d]+)?|0x[a-f0-9]+)\\b', 'gi'), css: 'number' }, { regex: new RegExp('(?!\\@interface\\b)\\@[\\$\\w]+\\b', 'g'), css: 'annotation' }, { regex: new RegExp('\\@interface\\b', 'g'), css: 'keyword' }, { regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword' }]; this.CssClass = 'dp-j'; this.Style = '.dp-j .annotation { color: #646464; }' + '.dp-j .number { color: #C00000; }'; }
	dp.sh.Brushes.Java.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.Java.Aliases = ['java'];

	dp.sh.Brushes.Cpp = function () { var datatypes = 'ATOM BOOL BOOLEAN BYTE CHAR COLORREF DWORD DWORDLONG DWORD_PTR ' + 'DWORD32 DWORD64 FLOAT HACCEL HALF_PTR HANDLE HBITMAP HBRUSH ' + 'HCOLORSPACE HCONV HCONVLIST HCURSOR HDC HDDEDATA HDESK HDROP HDWP ' + 'HENHMETAFILE HFILE HFONT HGDIOBJ HGLOBAL HHOOK HICON HINSTANCE HKEY ' + 'HKL HLOCAL HMENU HMETAFILE HMODULE HMONITOR HPALETTE HPEN HRESULT ' + 'HRGN HRSRC HSZ HWINSTA HWND INT INT_PTR INT32 INT64 LANGID LCID LCTYPE ' + 'LGRPID LONG LONGLONG LONG_PTR LONG32 LONG64 LPARAM LPBOOL LPBYTE LPCOLORREF ' + 'LPCSTR LPCTSTR LPCVOID LPCWSTR LPDWORD LPHANDLE LPINT LPLONG LPSTR LPTSTR ' + 'LPVOID LPWORD LPWSTR LRESULT PBOOL PBOOLEAN PBYTE PCHAR PCSTR PCTSTR PCWSTR ' + 'PDWORDLONG PDWORD_PTR PDWORD32 PDWORD64 PFLOAT PHALF_PTR PHANDLE PHKEY PINT ' + 'PINT_PTR PINT32 PINT64 PLCID PLONG PLONGLONG PLONG_PTR PLONG32 PLONG64 POINTER_32 ' + 'POINTER_64 PSHORT PSIZE_T PSSIZE_T PSTR PTBYTE PTCHAR PTSTR PUCHAR PUHALF_PTR ' + 'PUINT PUINT_PTR PUINT32 PUINT64 PULONG PULONGLONG PULONG_PTR PULONG32 PULONG64 ' + 'PUSHORT PVOID PWCHAR PWORD PWSTR SC_HANDLE SC_LOCK SERVICE_STATUS_HANDLE SHORT ' + 'SIZE_T SSIZE_T TBYTE TCHAR UCHAR UHALF_PTR UINT UINT_PTR UINT32 UINT64 ULONG ' + 'ULONGLONG ULONG_PTR ULONG32 ULONG64 USHORT USN VOID WCHAR WORD WPARAM WPARAM WPARAM ' + 'char bool short int __int32 __int64 __int8 __int16 long float double __wchar_t ' + 'clock_t _complex _dev_t _diskfree_t div_t ldiv_t _exception _EXCEPTION_POINTERS ' + 'FILE _finddata_t _finddatai64_t _wfinddata_t _wfinddatai64_t __finddata64_t ' + '__wfinddata64_t _FPIEEE_RECORD fpos_t _HEAPINFO _HFILE lconv intptr_t ' + 'jmp_buf mbstate_t _off_t _onexit_t _PNH ptrdiff_t _purecall_handler ' + 'sig_atomic_t size_t _stat __stat64 _stati64 terminate_function ' + 'time_t __time64_t _timeb __timeb64 tm uintptr_t _utimbuf ' + 'va_list wchar_t wctrans_t wctype_t wint_t signed'; var keywords = 'break case catch class const __finally __exception __try ' + 'const_cast continue private public protected __declspec ' + 'default delete deprecated dllexport dllimport do dynamic_cast ' + 'else enum explicit extern if for friend goto inline ' + 'mutable naked namespace new noinline noreturn nothrow ' + 'register reinterpret_cast return selectany ' + 'sizeof static static_cast struct switch template this ' + 'thread throw true false try typedef typeid typename union ' + 'using uuid virtual void volatile whcar_t while'; this.regexList = [{ regex: dp.sh.RegexLib.SingleLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.MultiLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string' }, { regex: dp.sh.RegexLib.SingleQuotedString, css: 'string' }, { regex: new RegExp('^ *#.*', 'gm'), css: 'preprocessor' }, { regex: new RegExp(this.GetKeywords(datatypes), 'gm'), css: 'datatypes' }, { regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword' }]; this.CssClass = 'dp-cpp'; this.Style = '.dp-cpp .datatypes { color: #2E8B57; font-weight: bold; }'; }
	dp.sh.Brushes.Cpp.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.Cpp.Aliases = ['cpp', 'c', 'c++'];

	dp.sh.Brushes.CSharp = function () { var keywords = 'abstract as base bool break byte case catch char checked class const ' + 'continue decimal default delegate do double else enum event explicit ' + 'extern false finally fixed float for foreach get goto if implicit in int ' + 'interface internal is lock long namespace new null object operator out ' + 'override params private protected public readonly ref return sbyte sealed set ' + 'short sizeof stackalloc static string struct switch this throw true try ' + 'typeof uint ulong unchecked unsafe ushort using virtual void while'; this.regexList = [{ regex: dp.sh.RegexLib.SingleLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.MultiLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string' }, { regex: dp.sh.RegexLib.SingleQuotedString, css: 'string' }, { regex: new RegExp('^\\s*#.*', 'gm'), css: 'preprocessor' }, { regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword' }]; this.CssClass = 'dp-c'; this.Style = '.dp-c .vars { color: #d00; }'; }
	dp.sh.Brushes.CSharp.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.CSharp.Aliases = ['c#', 'c-sharp', 'csharp'];

	dp.sh.Brushes.CSS = function () { var keywords = 'ascent azimuth background-attachment background-color background-image background-position ' + 'background-repeat background baseline bbox border-collapse border-color border-spacing border-style border-top ' + 'border-right border-bottom border-left border-top-color border-right-color border-bottom-color border-left-color ' + 'border-top-style border-right-style border-bottom-style border-left-style border-top-width border-right-width ' + 'border-bottom-width border-left-width border-width border cap-height caption-side centerline clear clip color ' + 'content counter-increment counter-reset cue-after cue-before cue cursor definition-src descent direction display ' + 'elevation empty-cells float font-size-adjust font-family font-size font-stretch font-style font-variant font-weight font ' + 'height letter-spacing line-height list-style-image list-style-position list-style-type list-style margin-top ' + 'margin-right margin-bottom margin-left margin marker-offset marks mathline max-height max-width min-height min-width orphans ' + 'outline-color outline-style outline-width outline overflow padding-top padding-right padding-bottom padding-left padding page ' + 'page-break-after page-break-before page-break-inside pause pause-after pause-before pitch pitch-range play-during position ' + 'quotes richness size slope src speak-header speak-numeral speak-punctuation speak speech-rate stemh stemv stress ' + 'table-layout text-align text-decoration text-indent text-shadow text-transform unicode-bidi unicode-range units-per-em ' + 'vertical-align visibility voice-family volume white-space widows width widths word-spacing x-height z-index'; var values = 'above absolute all always aqua armenian attr aural auto avoid baseline behind below bidi-override black blink block blue bold bolder ' + 'both bottom braille capitalize caption center center-left center-right circle close-quote code collapse compact condensed ' + 'continuous counter counters crop cross crosshair cursive dashed decimal decimal-leading-zero default digits disc dotted double ' + 'embed embossed e-resize expanded extra-condensed extra-expanded fantasy far-left far-right fast faster fixed format fuchsia ' + 'gray green groove handheld hebrew help hidden hide high higher icon inline-table inline inset inside invert italic ' + 'justify landscape large larger left-side left leftwards level lighter lime line-through list-item local loud lower-alpha ' + 'lowercase lower-greek lower-latin lower-roman lower low ltr marker maroon medium message-box middle mix move narrower ' + 'navy ne-resize no-close-quote none no-open-quote no-repeat normal nowrap n-resize nw-resize oblique olive once open-quote outset ' + 'outside overline pointer portrait pre print projection purple red relative repeat repeat-x repeat-y rgb ridge right right-side ' + 'rightwards rtl run-in screen scroll semi-condensed semi-expanded separate se-resize show silent silver slower slow ' + 'small small-caps small-caption smaller soft solid speech spell-out square s-resize static status-bar sub super sw-resize ' + 'table-caption table-cell table-column table-column-group table-footer-group table-header-group table-row table-row-group teal ' + 'text-bottom text-top thick thin top transparent tty tv ultra-condensed ultra-expanded underline upper-alpha uppercase upper-latin ' + 'upper-roman url visible wait white wider w-resize x-fast x-high x-large x-loud x-low x-slow x-small x-soft xx-large xx-small yellow'; var fonts = '[mM]onospace [tT]ahoma [vV]erdana [aA]rial [hH]elvetica [sS]ans-serif [sS]erif'; this.regexList = [{ regex: dp.sh.RegexLib.MultiLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string' }, { regex: dp.sh.RegexLib.SingleQuotedString, css: 'string' }, { regex: new RegExp('\\#[a-zA-Z0-9]{3,6}', 'g'), css: 'value' }, { regex: new RegExp('(-?\\d+)(\.\\d+)?(px|em|pt|\:|\%|)', 'g'), css: 'value' }, { regex: new RegExp('!important', 'g'), css: 'important' }, { regex: new RegExp(this.GetKeywordsCSS(keywords), 'gm'), css: 'keyword' }, { regex: new RegExp(this.GetValuesCSS(values), 'g'), css: 'value' }, { regex: new RegExp(this.GetValuesCSS(fonts), 'g'), css: 'value' }]; this.CssClass = 'dp-css'; this.Style = '.dp-css .value { color: black; }' + '.dp-css .important { color: red; }'; }
	dp.sh.Highlighter.prototype.GetKeywordsCSS = function (str) { return '\\b([a-z_]|)' + str.replace(/ /g, '(?=:)\\b|\\b([a-z_\\*]|\\*|)') + '(?=:)\\b'; }
	dp.sh.Highlighter.prototype.GetValuesCSS = function (str) { return '\\b' + str.replace(/ /g, '(?!-)(?!:)\\b|\\b()') + '\:\\b'; }
	dp.sh.Brushes.CSS.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.CSS.Aliases = ['css'];

	dp.sh.Brushes.Php = function () { var funcs = 'abs acos acosh addcslashes addslashes ' + 'array_change_key_case array_chunk array_combine array_count_values array_diff ' + 'array_diff_assoc array_diff_key array_diff_uassoc array_diff_ukey array_fill ' + 'array_filter array_flip array_intersect array_intersect_assoc array_intersect_key ' + 'array_intersect_uassoc array_intersect_ukey array_key_exists array_keys array_map ' + 'array_merge array_merge_recursive array_multisort array_pad array_pop array_product ' + 'array_push array_rand array_reduce array_reverse array_search array_shift ' + 'array_slice array_splice array_sum array_udiff array_udiff_assoc ' + 'array_udiff_uassoc array_uintersect array_uintersect_assoc ' + 'array_uintersect_uassoc array_unique array_unshift array_values array_walk ' + 'array_walk_recursive atan atan2 atanh base64_decode base64_encode base_convert ' + 'basename bcadd bccomp bcdiv bcmod bcmul bindec bindtextdomain bzclose bzcompress ' + 'bzdecompress bzerrno bzerror bzerrstr bzflush bzopen bzread bzwrite ceil chdir ' + 'checkdate checkdnsrr chgrp chmod chop chown chr chroot chunk_split class_exists ' + 'closedir closelog copy cos cosh count count_chars date decbin dechex decoct ' + 'deg2rad delete ebcdic2ascii echo empty end ereg ereg_replace eregi eregi_replace error_log ' + 'error_reporting escapeshellarg escapeshellcmd eval exec exit exp explode extension_loaded ' + 'feof fflush fgetc fgetcsv fgets fgetss file_exists file_get_contents file_put_contents ' + 'fileatime filectime filegroup fileinode filemtime fileowner fileperms filesize filetype ' + 'floatval flock floor flush fmod fnmatch fopen fpassthru fprintf fputcsv fputs fread fscanf ' + 'fseek fsockopen fstat ftell ftok getallheaders getcwd getdate getenv gethostbyaddr gethostbyname ' + 'gethostbynamel getimagesize getlastmod getmxrr getmygid getmyinode getmypid getmyuid getopt ' + 'getprotobyname getprotobynumber getrandmax getrusage getservbyname getservbyport gettext ' + 'gettimeofday gettype glob gmdate gmmktime ini_alter ini_get ini_get_all ini_restore ini_set ' + 'interface_exists intval ip2long is_a is_array is_bool is_callable is_dir is_double ' + 'is_executable is_file is_finite is_float is_infinite is_int is_integer is_link is_long ' + 'is_nan is_null is_numeric is_object is_readable is_real is_resource is_scalar is_soap_fault ' + 'is_string is_subclass_of is_uploaded_file is_writable is_writeable mkdir mktime nl2br ' + 'parse_ini_file parse_str parse_url passthru pathinfo readlink realpath rewind rewinddir rmdir ' + 'round str_ireplace str_pad str_repeat str_replace str_rot13 str_shuffle str_split ' + 'str_word_count strcasecmp strchr strcmp strcoll strcspn strftime strip_tags stripcslashes ' + 'stripos stripslashes stristr strlen strnatcasecmp strnatcmp strncasecmp strncmp strpbrk ' + 'strpos strptime strrchr strrev strripos strrpos strspn strstr strtok strtolower strtotime ' + 'strtoupper strtr strval substr substr_compare'; var keywords = 'and or xor __FILE__ __LINE__ array as break case ' + 'cfunction class const continue declare default die do else ' + 'elseif empty enddeclare endfor endforeach endif endswitch endwhile ' + 'extends for foreach function include include_once global if ' + 'new old_function return static switch use require require_once ' + 'var while __FUNCTION__ __CLASS__ ' + '__METHOD__ abstract interface public implements extends private protected throw'; this.regexList = [{ regex: dp.sh.RegexLib.SingleLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.MultiLineCComments, css: 'comment' }, { regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string' }, { regex: dp.sh.RegexLib.SingleQuotedString, css: 'string' }, { regex: new RegExp('\\$\\w+', 'g'), css: 'vars' }, { regex: new RegExp(this.GetKeywords(funcs), 'gmi'), css: 'func' }, { regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword' }]; this.CssClass = 'dp-c'; }
	dp.sh.Brushes.Php.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.Php.Aliases = ['php'];

	dp.sh.Brushes.Python = function () {
		var keywords = 'and assert break class continue def del elif else ' + 'except exec finally for from global if import in is ' + 'lambda not or pass print raise return try yield while'; var special = 'None True False self cls class_'
		this.regexList = [{ regex: dp.sh.RegexLib.SingleLinePerlComments, css: 'comment' }, { regex: new RegExp("^\\s*@\\w+", 'gm'), css: 'decorator' }, { regex: new RegExp("(['\"]{3})([^\\1])*?\\1", 'gm'), css: 'comment' }, { regex: new RegExp('"(?!")(?:\\.|\\\\\\"|[^\\""\\n\\r])*"', 'gm'), css: 'string' }, { regex: new RegExp("'(?!')*(?:\\.|(\\\\\\')|[^\\''\\n\\r])*'", 'gm'), css: 'string' }, { regex: new RegExp("\\b\\d+\\.?\\w*", 'g'), css: 'number' }, { regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword' }, { regex: new RegExp(this.GetKeywords(special), 'gm'), css: 'special' }]; this.CssClass = 'dp-py'; this.Style = '.dp-py .builtins { color: #ff1493; }' + '.dp-py .magicmethods { color: #808080; }' + '.dp-py .exceptions { color: brown; }' + '.dp-py .types { color: brown; font-style: italic; }' + '.dp-py .commonlibs { color: #8A2BE2; font-style: italic; }';
	}
	dp.sh.Brushes.Python.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.Python.Aliases = ['py', 'python'];

	dp.sh.Brushes.Xml = function () { this.CssClass = 'dp-xml'; this.Style = '.dp-xml .cdata { color: #ff1493; }' + '.dp-xml .tag, .dp-xml .tag-name { color: #069; font-weight: bold; }' + '.dp-xml .attribute { color: red; }' + '.dp-xml .attribute-value { color: blue; }'; }
	dp.sh.Brushes.Xml.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.Xml.Aliases = ['xml', 'xhtml', 'xslt', 'html', 'xhtml']; dp.sh.Brushes.Xml.prototype.ProcessRegexList = function () {
		function push(array, value) { array[array.length] = value; }
		var index = 0; var match = null; var regex = null; this.GetMatches(new RegExp('(\&lt;|<)\\!\\[[\\w\\s]*?\\[(.|\\s)*?\\]\\](\&gt;|>)', 'gm'), 'cdata'); this.GetMatches(new RegExp('(\&lt;|<)!--\\s*.*?\\s*--(\&gt;|>)', 'gm'), 'comments'); regex = new RegExp('([:\\w-\.]+)\\s*=\\s*(".*?"|\'.*?\'|\\w+)*|(\\w+)', 'gm'); while ((match = regex.exec(this.code)) != null) {
			if (match[1] == null) { continue; }
			push(this.matches, new dp.sh.Match(match[1], match.index, 'attribute')); if (match[2] != undefined) { push(this.matches, new dp.sh.Match(match[2], match.index + match[0].indexOf(match[2]), 'attribute-value')); }
		}
		this.GetMatches(new RegExp('(\&lt;|<)/*\\?*(?!\\!)|/*\\?*(\&gt;|>)', 'gm'), 'tag'); regex = new RegExp('(?:\&lt;|<)/*\\?*\\s*([:\\w-\.]+)', 'gm'); while ((match = regex.exec(this.code)) != null) { push(this.matches, new dp.sh.Match(match[1], match.index + match[0].indexOf(match[1]), 'tag-name')); }
	}

	dp.sh.Brushes.Vb = function () { var keywords = 'AddHandler AddressOf AndAlso Alias And Ansi As Assembly Auto ' + 'Boolean ByRef Byte ByVal Call Case Catch CBool CByte CChar CDate ' + 'CDec CDbl Char CInt Class CLng CObj Const CShort CSng CStr CType ' + 'Date Decimal Declare Default Delegate Dim DirectCast Do Double Each ' + 'Else ElseIf End Enum Erase Error Event Exit False Finally For Friend ' + 'Function Get GetType GoSub GoTo Handles If Implements Imports In ' + 'Inherits Integer Interface Is Let Lib Like Long Loop Me Mod Module ' + 'MustInherit MustOverride MyBase MyClass Namespace New Next Not Nothing ' + 'NotInheritable NotOverridable Object On Option Optional Or OrElse ' + 'Overloads Overridable Overrides ParamArray Preserve Private Property ' + 'Protected Public RaiseEvent ReadOnly ReDim REM RemoveHandler Resume ' + 'Return Select Set Shadows Shared Short Single Static Step Stop String ' + 'Structure Sub SyncLock Then Throw To True Try TypeOf Unicode Until ' + 'Variant When While With WithEvents WriteOnly Xor'; this.regexList = [{ regex: new RegExp('\'.*$', 'gm'), css: 'comment' }, { regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string' }, { regex: new RegExp('^\\s*#.*', 'gm'), css: 'preprocessor' }, { regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword' }]; this.CssClass = 'dp-vb'; }
	dp.sh.Brushes.Vb.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.Vb.Aliases = ['vb', 'vb.net'];

	dp.sh.Brushes.Ruby = function () {
		var keywords = 'alias and BEGIN begin break case class def define_method defined do each else elsif ' + 'END end ensure false for if in module new next nil not or raise redo rescue retry return ' + 'self super then throw true undef unless until when while yield'; var builtins = 'Array Bignum Binding Class Continuation Dir Exception FalseClass File::Stat File Fixnum Fload ' + 'Hash Integer IO MatchData Method Module NilClass Numeric Object Proc Range Regexp String Struct::TMS Symbol ' + 'ThreadGroup Thread Time TrueClass'
		this.regexList = [{ regex: dp.sh.RegexLib.SingleLinePerlComments, css: 'comment' }, { regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string' }, { regex: dp.sh.RegexLib.SingleQuotedString, css: 'string' }, { regex: new RegExp(':[a-z][A-Za-z0-9_]*', 'g'), css: 'symbol' }, { regex: new RegExp('(\\$|@@|@)\\w+', 'g'), css: 'variable' }, { regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword' }, { regex: new RegExp(this.GetKeywords(builtins), 'gm'), css: 'builtin' }]; this.CssClass = 'dp-rb'; this.Style = '.dp-rb .symbol { color: #a70; }' + '.dp-rb .variable { color: #a70; font-weight: bold; }';
	}
	dp.sh.Brushes.Ruby.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.Ruby.Aliases = ['ruby', 'rails', 'ror'];

	dp.sh.Brushes.Sql = function () { var funcs = 'abs avg case cast coalesce convert count current_timestamp ' + 'current_user day isnull left lower month nullif replace right ' + 'session_user space substring sum system_user upper user year'; var keywords = 'absolute action add after alter as asc at authorization begin bigint ' + 'binary bit by cascade char character check checkpoint close collate ' + 'column commit committed connect connection constraint contains continue ' + 'create cube current current_date current_time cursor database date ' + 'deallocate dec decimal declare default delete desc distinct double drop ' + 'dynamic else end end-exec escape except exec execute false fetch first ' + 'float for force foreign forward free from full function global goto grant ' + 'group grouping having hour ignore index inner insensitive insert instead ' + 'int integer intersect into is isolation key last level load local max min ' + 'minute modify move name national nchar next no numeric of off on only ' + 'open option order out output partial password precision prepare primary ' + 'prior privileges procedure public read real references relative repeatable ' + 'restrict return returns revoke rollback rollup rows rule schema scroll ' + 'second section select sequence serializable set size smallint static ' + 'statistics table temp temporary then time timestamp to top transaction ' + 'translation trigger true truncate uncommitted union unique update values ' + 'varchar varying view when where with work'; var operators = 'all and any between cross in join like not null or outer some'; this.regexList = [{ regex: new RegExp('--(.*)$', 'gm'), css: 'comment' }, { regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string' }, { regex: dp.sh.RegexLib.SingleQuotedString, css: 'string' }, { regex: new RegExp(this.GetKeywords(funcs), 'gmi'), css: 'func' }, { regex: new RegExp(this.GetKeywords(operators), 'gmi'), css: 'op' }, { regex: new RegExp(this.GetKeywords(keywords), 'gmi'), css: 'keyword' }]; this.CssClass = 'dp-sql'; this.Style = '.dp-sql .func { color: #ff1493; }' + '.dp-sql .op { color: #808080; }'; }
	dp.sh.Brushes.Sql.prototype = new dp.sh.Highlighter(); dp.sh.Brushes.Sql.Aliases = ['sql'];


	var obj = this;

	var config, editor;

	obj.PluginName = "InsertCode";

	obj.InitConfig = function (argconfig) {
		config = argconfig;
	}
	obj.InitEditor = function (argeditor) {
		editor = argeditor;

		editor.attachEvent("exec_command_insertcode", function (state, cmd, value) {
			console.log(state, cmd, value);
			obj.DoShowDialog();
			state.returnValue = true;
		});

		editor.toolbarFactoryMap["insertcode"] = function (cmd) {
			//console.log(cmd);
			var span = editor.createToolbarButton(cmd);
			span.style.backgroundColor = ''
			return span;
		};

	}

	function __Append(parent, tagname, csstext, cssclass) {
		var tag = parent.ownerDocument.createElement(tagname);
		if (csstext) tag.style.cssText = csstext;
		if (cssclass) tag.className = cssclass;
		parent.appendChild(tag);
		return tag;
	}


	obj.DoShowDialog = function () {

		var dialoginner = editor.createDialog(editor.getLangText("insertcode"), "rte-dialog-insertcode");

		var div2 = __Append(dialoginner, "div", "position:relative;text-align:center;");
		__Append(div2, "label").innerText = editor.getLangText("language") + ":";
		var sel_lang = __Append(div2, "select", "width:200px;");

		sel_lang.options.add(new Option("Plain Text", ""));

		for (var brush in dp.sh.Brushes) {
			var aliases = dp.sh.Brushes[brush].Aliases;

			if (aliases == null)
				continue;
			sel_lang.options.add(new Option(aliases, brush));


			var b = sessionStorage.getItem("rte-insertcode-lang")
			if (b) sel_lang.value = b;
		}


		var div1 = __Append(dialoginner, "div", "position:relative;text-align:center;");
		var textarea = __Append(div1, "textarea", "width:100%;min-width:300px;height:200px")

		var divfooter = __Append(dialoginner, "rte-dialog-footer", null, "rte-dialog-footer-center");

		var btn = __Append(divfooter, "rte-dialog-button")
		btn.innerText = "Insert";

		setTimeout(function () {
			textarea.focus();
		}, 300);

		btn.onclick = function () {
			dialoginner.close();

			sessionStorage.setItem("rte-insertcode-lang", sel_lang.value)

			if (sel_lang.value != "") {
				var b = dp.sh.Brushes[sel_lang.value];

				textarea.language = b.Aliases[0] + ":nocontrols";
				textarea.name = "rteinsertcode" + new Date().getTime();
				textarea.innerHTML = textarea.value;
				dp.sh.HighlightAll(textarea);

				var tag = textarea.previousSibling

				var p = editor.insertRootParagraph()
				p.innerHTML = '<div class="dp-highlighter">' + tag.innerHTML + "</div>";
			}
			else {
				var p = editor.insertRootParagraph()
				p.innerText = textarea.value;
			}

			editor.focus();
		}
	}
}








RTE_DefaultConfig.plugin_insertemoji = RTE_Plugin_InsertEmoji;

function RTE_Plugin_InsertEmoji() {

	function CharToHTMLCode(ch) {
		if (ch.length > 2)
			return ch;

		if (ch.length == 1 || ch.charCodeAt(1) == 0xfe0f)
			return "&#" + ch.charCodeAt(0) + ";"

		if (ch.charCodeAt(1) == 0xfe0f) {
			return "&#" + ch.charCodeAt(0) + ";"
		}

		var offset = ch.charCodeAt(0) - 0xd83c;
		if (offset < 0 && offset > 3)//not support
			return ch;

		var second = ch.charCodeAt(1) - 0xdc04;
		var f = offset * 0x400 + second + 0x1f004;
		return "&#x" + f.toString(16) + ";"
	}


	var groupnames = ["smileys", "people", "animals", "food", "travel", "activities", "objects", "symbols"]
	var emojistrs = ["😀#grinning face|😃#grinning face with big eyes|😄#grinning face with smiling eyes|😁#beaming face with smiling eyes|😆#grinning squinting face|😅#grinning face with sweat|🤣#rolling on the floor laughing|😂#face with tears of joy|🙂#slightly smiling face|🙃#upside-down face|😉#winking face|😊#smiling face with smiling eyes|😇#smiling face with halo|😍#smiling face with heart-eyes|🤩#star-struck|😘#face blowing a kiss|😗#kissing face|😚#kissing face with closed eyes|😙#kissing face with smiling eyes|😋#face savoring food|😛#face with tongue|😜#winking face with tongue|🤪#zany face|😝#squinting face with tongue|🤑#money-mouth face|🤗#hugging face|🤭#face with hand over mouth|🤫#shushing face|🤔#thinking face|🤐#zipper-mouth face|🤨#face with raised eyebrow|😐#neutral face|😑#expressionless face|😶#face without mouth|😏#smirking face|😒#unamused face|🙄#face with rolling eyes|😬#grimacing face|🤥#lying face|😌#relieved face|😔#pensive face|😪#sleepy face|🤤#drooling face|😴#sleeping face|😷#face with medical mask|🤒#face with thermometer|🤕#face with head-bandage|🤢#nauseated face|🤮#face vomiting|🤧#sneezing face|😵#dizzy face|🤯#exploding head|🤠#cowboy hat face|😎#smiling face with sunglasses|🤓#nerd face|🧐#face with monocle|😕#confused face|😟#worried face|🙁#slightly frowning face|☹️#frowning face|😮#face with open mouth|😯#hushed face|😲#astonished face|😳#flushed face|😦#frowning face with open mouth|😧#anguished face|😨#fearful face|😰#anxious face with sweat|😥#sad but relieved face|😢#crying face|😭#loudly crying face|😱#face screaming in fear|😖#confounded face|😣#persevering face|😞#disappointed face|😓#downcast face with sweat|😩#weary face|😫#tired face|😤#face with steam from nose|😡#pouting face|😠#angry face|🤬#face with symbols on mouth|😈#smiling face with horns|👿#angry face with horns|💀#skull|☠️#skull and crossbones|💩#pile of poo|🤡#clown face|👹#ogre|👺#goblin|👻#ghost|👽#alien|👾#alien monster|🤖#robot|😺#grinning cat|😸#grinning cat with smiling eyes|😹#cat with tears of joy|😻#smiling cat with heart-eyes|😼#cat with wry smile|😽#kissing cat|🙀#weary cat|😿#crying cat|😾#pouting cat|🙈#see-no-evil monkey|🙉#hear-no-evil monkey|🙊#speak-no-evil monkey|💋#kiss mark|💌#love letter|💘#heart with arrow|💝#heart with ribbon|💖#sparkling heart|💗#growing heart|💓#beating heart|💞#revolving hearts|💕#two hearts|💟#heart decoration|❣️#heart exclamation|💔#broken heart|❤️#red heart|🧡#orange heart|💛#yellow heart|💚#green heart|💙#blue heart|💜#purple heart|🖤#black heart|💯#hundred points|💢#anger symbol|💥#collision|💫#dizzy|💦#sweat droplets|💨#dashing away|💣#bomb|💬#speech balloon|💭#thought balloon|💤#zzz", "👋#waving hand|🤚#raised back of hand|✋#raised hand|🖖#vulcan salute|👌#OK hand|✌️#victory hand|🤞#crossed fingers|🤟#love-you gesture|🤘#sign of the horns|🤙#call me hand|👈#backhand index pointing left|👉#backhand index pointing right|👆#backhand index pointing up|🖕#middle finger|👇#backhand index pointing down|☝️#index pointing up|👍#thumbs up|👎#thumbs down|✊#raised fist|👊#oncoming fist|🤛#left-facing fist|🤜#right-facing fist|👏#clapping hands|🙌#raising hands|👐#open hands|🤲#palms up together|🤝#handshake|🙏#folded hands|✍️#writing hand|💅#nail polish|🤳#selfie|💪#flexed biceps|👂#ear|👃#nose|🧠#brain|👀#eyes|👅#tongue|👄#mouth|👶#baby|🧒#child|👦#boy|👧#girl|🧑#person|👱#person with blond hair|👨#man|🧔#man with beard|👩#woman|🧓#older person|👴#old man|👵#old woman|🙍#person frowning|🙎#person pouting|🙅#person gesturing NO|🙆#person gesturing OK|💁#person tipping hand|🙋#person raising hand|🙇#person bowing|🤦#person facepalming|🤷#person shrugging|👮#police officer|💂#guard|👷#construction worker|🤴#prince|👸#princess|👳#person wearing turban|👲#person with skullcap|🧕#woman with headscarf|🤵#person in tuxedo|👰#person with veil|🤰#pregnant woman|🤱#breast-feeding|👼#baby angel|🎅#Santa Claus|🤶#Mrs. Claus|🧙#mage|🧚#fairy|🧛#vampire|🧜#merperson|🧝#elf|🧞#genie|🧟#zombie|💆#person getting massage|💇#person getting haircut|🚶#person walking|🏃#person running|💃#woman dancing|🕺#man dancing|👯#people with bunny ears|🧖#person in steamy room|🧗#person climbing|🤺#person fencing|🏇#horse racing|⛷️#skier|🏂#snowboarder|🏄#person surfing|🚣#person rowing boat|🏊#person swimming|⛹️#person bouncing ball|🚴#person biking|🚵#person mountain biking|🤸#person cartwheeling|🤼#people wrestling|🤽#person playing water polo|🤾#person playing handball|🤹#person juggling|🧘#person in lotus position|🛀#person taking bath|🛌#person in bed|👭#women holding hands|👫#woman and man holding hands|👬#men holding hands|💏#kiss|💑#couple with heart|👪#family|👤#bust in silhouette|👥#busts in silhouette|👣#footprints", "🐵#monkey face|🐒#monkey|🦍#gorilla|🐶#dog face|🐕#dog|🐩#poodle|🐺#wolf|🦊#fox|🐱#cat face|🐈#cat|🦁#lion|🐯#tiger face|🐅#tiger|🐆#leopard|🐴#horse face|🐎#horse|🦄#unicorn|🦓#zebra|🦌#deer|🐮#cow face|🐂#ox|🐃#water buffalo|🐄#cow|🐷#pig face|🐖#pig|🐗#boar|🐽#pig nose|🐏#ram|🐑#ewe|🐐#goat|🐪#camel|🐫#two-hump camel|🦒#giraffe|🐘#elephant|🦏#rhinoceros|🐭#mouse face|🐁#mouse|🐀#rat|🐹#hamster|🐰#rabbit face|🐇#rabbit|🦔#hedgehog|🦇#bat|🐻#bear|🐨#koala|🐼#panda|🐾#paw prints|🦃#turkey|🐔#chicken|🐓#rooster|🐣#hatching chick|🐤#baby chick|🐥#front-facing baby chick|🐦#bird|🐧#penguin|🦅#eagle|🦆#duck|🦉#owl|🐸#frog|🐊#crocodile|🐢#turtle|🦎#lizard|🐍#snake|🐲#dragon face|🐉#dragon|🦕#sauropod|🦖#T-Rex|🐳#spouting whale|🐋#whale|🐬#dolphin|🐟#fish|🐠#tropical fish|🐡#blowfish|🦈#shark|🐙#octopus|🐚#spiral shell|🐌#snail|🦋#butterfly|🐛#bug|🐜#ant|🐝#honeybee|🐞#lady beetle|🦗#cricket|🦂#scorpion|💐#bouquet|🌸#cherry blossom|💮#white flower|🌹#rose|🥀#wilted flower|🌺#hibiscus|🌻#sunflower|🌼#blossom|🌷#tulip|🌱#seedling|🌲#evergreen tree|🌳#deciduous tree|🌴#palm tree|🌵#cactus|🌾#sheaf of rice|🌿#herb|☘️#shamrock|🍀#four leaf clover|🍁#maple leaf|🍂#fallen leaf|🍃#leaf fluttering in wind", "🍇#grapes|🍈#melon|🍉#watermelon|🍊#tangerine|🍋#lemon|🍌#banana|🍍#pineapple|🍎#red apple|🍏#green apple|🍐#pear|🍑#peach|🍒#cherries|🍓#strawberry|🥝#kiwi fruit|🍅#tomato|🥥#coconut|🥑#avocado|🍆#eggplant|🥔#potato|🥕#carrot|🌽#ear of corn|🥒#cucumber|🥦#broccoli|🍄#mushroom|🥜#peanuts|🌰#chestnut|🍞#bread|🥐#croissant|🥖#baguette bread|🥨#pretzel|🥞#pancakes|🧀#cheese wedge|🍖#meat on bone|🍗#poultry leg|🥩#cut of meat|🥓#bacon|🍔#hamburger|🍟#french fries|🍕#pizza|🌭#hot dog|🥪#sandwich|🌮#taco|🌯#burrito|🥙#stuffed flatbread|🥚#egg|🍳#cooking|🥘#shallow pan of food|🍲#pot of food|🥣#bowl with spoon|🥗#green salad|🍿#popcorn|🥫#canned food|🍱#bento box|🍘#rice cracker|🍙#rice ball|🍚#cooked rice|🍛#curry rice|🍜#steaming bowl|🍝#spaghetti|🍠#roasted sweet potato|🍢#oden|🍣#sushi|🍤#fried shrimp|🍥#fish cake with swirl|🍡#dango|🥟#dumpling|🥠#fortune cookie|🥡#takeout box|🦀#crab|🦐#shrimp|🦑#squid|🍦#soft ice cream|🍧#shaved ice|🍨#ice cream|🍩#doughnut|🍪#cookie|🎂#birthday cake|🍰#shortcake|🥧#pie|🍫#chocolate bar|🍬#candy|🍭#lollipop|🍮#custard|🍯#honey pot|🍼#baby bottle|🥛#glass of milk|☕#hot beverage|🍵#teacup without handle|🍶#sake|🍾#bottle with popping cork|🍷#wine glass|🍸#cocktail glass|🍹#tropical drink|🍺#beer mug|🍻#clinking beer mugs|🥂#clinking glasses|🥃#tumbler glass|🥤#cup with straw|🥢#chopsticks|🍴#fork and knife|🥄#spoon|🔪#kitchen knife|🏺#amphora", "🌍#globe showing Europe-Africa|🌎#globe showing Americas|🌏#globe showing Asia-Australia|🌐#globe with meridians|🗾#map of Japan|⛰️#mountain|🌋#volcano|🗻#mount fuji|🏠#house|🏡#house with garden|🏢#office building|🏣#Japanese post office|🏤#post office|🏥#hospital|🏦#bank|🏨#hotel|🏩#love hotel|🏪#convenience store|🏫#school|🏬#department store|🏭#factory|🏯#Japanese castle|🏰#castle|💒#wedding|🗼#Tokyo tower|🗽#Statue of Liberty|⛪#church|🕌#mosque|🕍#synagogue|⛩️#shinto shrine|🕋#kaaba|⛲#fountain|⛺#tent|🌁#foggy|🌃#night with stars|🌄#sunrise over mountains|🌅#sunrise|🌆#cityscape at dusk|🌇#sunset|🌉#bridge at night|♨️#hot springs|🎠#carousel horse|🎡#ferris wheel|🎢#roller coaster|💈#barber pole|🎪#circus tent|🚂#locomotive|🚃#railway car|🚄#high-speed train|🚅#bullet train|🚆#train|🚇#metro|🚈#light rail|🚉#station|🚊#tram|🚝#monorail|🚞#mountain railway|🚋#tram car|🚌#bus|🚍#oncoming bus|🚎#trolleybus|🚐#minibus|🚑#ambulance|🚒#fire engine|🚓#police car|🚔#oncoming police car|🚕#taxi|🚖#oncoming taxi|🚗#automobile|🚘#oncoming automobile|🚙#sport utility vehicle|🚚#delivery truck|🚛#articulated lorry|🚜#tractor|🛵#motor scooter|🚲#bicycle|🛴#kick scooter|🚏#bus stop|⛽#fuel pump|🚨#police car light|🚥#horizontal traffic light|🚦#vertical traffic light|🛑#stop sign|🚧#construction|⚓#anchor|⛵#sailboat|🛶#canoe|🚤#speedboat|⛴️#ferry|🚢#ship|✈️#airplane|🛫#airplane departure|🛬#airplane arrival|💺#seat|🚁#helicopter|🚟#suspension railway|🚠#mountain cableway|🚡#aerial tramway|🚀#rocket|🛸#flying saucer|⌛#hourglass done|⏳#hourglass not done|⌚#watch|⏰#alarm clock|⏱️#stopwatch|⏲️#timer clock|🕛#twelve o’clock|🕧#twelve-thirty|🕐#one o’clock|🕜#one-thirty|🕑#two o’clock|🕝#two-thirty|🕒#three o’clock|🕞#three-thirty|🕓#four o’clock|🕟#four-thirty|🕔#five o’clock|🕠#five-thirty|🕕#six o’clock|🕡#six-thirty|🕖#seven o’clock|🕢#seven-thirty|🕗#eight o’clock|🕣#eight-thirty|🕘#nine o’clock|🕤#nine-thirty|🕙#ten o’clock|🕥#ten-thirty|🕚#eleven o’clock|🕦#eleven-thirty|🌑#new moon|🌒#waxing crescent moon|🌓#first quarter moon|🌔#waxing gibbous moon|🌕#full moon|🌖#waning gibbous moon|🌗#last quarter moon|🌘#waning crescent moon|🌙#crescent moon|🌚#new moon face|🌛#first quarter moon face|🌜#last quarter moon face|☀️#sun|🌝#full moon face|🌞#sun with face|⭐#star|🌟#glowing star|🌠#shooting star|🌌#milky way|☁️#cloud|⛅#sun behind cloud|⛈️#cloud with lightning and rain|🌀#cyclone|🌈#rainbow|🌂#closed umbrella|☂️#umbrella|☔#umbrella with rain drops|⛱️#umbrella on ground|⚡#high voltage|❄️#snowflake|☃️#snowman|⛄#snowman without snow|☄️#comet|🔥#fire|💧#droplet|🌊#water wave", "🎃#jack-o-lantern|🎄#Christmas tree|🎆#fireworks|🎇#sparkler|✨#sparkles|🎈#balloon|🎉#party popper|🎊#confetti ball|🎋#tanabata tree|🎍#pine decoration|🎎#Japanese dolls|🎏#carp streamer|🎐#wind chime|🎑#moon viewing ceremony|🎀#ribbon|🎁#wrapped gift|🎫#ticket|🏆#trophy|🏅#sports medal|🥇#1st place medal|🥈#2nd place medal|🥉#3rd place medal|⚽#soccer ball|⚾#baseball|🏀#basketball|🏐#volleyball|🏈#american football|🏉#rugby football|🎾#tennis|🎳#bowling|🏏#cricket game|🏑#field hockey|🏒#ice hockey|🏓#ping pong|🏸#badminton|🥊#boxing glove|🥋#martial arts uniform|🥅#goal net|⛳#flag in hole|⛸️#ice skate|🎣#fishing pole|🎽#running shirt|🎿#skis|🛷#sled|🥌#curling stone|🎯#direct hit|🎱#pool 8 ball|🔮#crystal ball|🎮#video game|🎰#slot machine|🎲#game die|♠️#spade suit|♥️#heart suit|♦️#diamond suit|♣️#club suit|🃏#joker|🀄#mahjong red dragon|🎴#flower playing cards|🎭#performing arts|🎨#artist palette", "👓#glasses|👔#necktie|👕#t-shirt|👖#jeans|🧣#scarf|🧤#gloves|🧥#coat|🧦#socks|👗#dress|👘#kimono|👙#bikini|👚#woman’s clothes|👛#purse|👜#handbag|👝#clutch bag|🎒#backpack|👞#man’s shoe|👟#running shoe|👠#high-heeled shoe|👡#woman’s sandal|👢#woman’s boot|👑#crown|👒#woman’s hat|🎩#top hat|🎓#graduation cap|🧢#billed cap|⛑️#rescue worker’s helmet|📿#prayer beads|💄#lipstick|💍#ring|💎#gem stone|🔇#muted speaker|🔈#speaker low volume|🔉#speaker medium volume|🔊#speaker high volume|📢#loudspeaker|📣#megaphone|📯#postal horn|🔔#bell|🔕#bell with slash|🎼#musical score|🎵#musical note|🎶#musical notes|🎤#microphone|🎧#headphone|📻#radio|🎷#saxophone|🎸#guitar|🎹#musical keyboard|🎺#trumpet|🎻#violin|🥁#drum|📱#mobile phone|📲#mobile phone with arrow|☎️#telephone|📞#telephone receiver|📟#pager|📠#fax machine|🔋#battery|🔌#electric plug|💻#laptop|⌨️#keyboard|💽#computer disk|💾#floppy disk|💿#optical disk|📀#dvd|🎥#movie camera|🎬#clapper board|📺#television|📷#camera|📸#camera with flash|📹#video camera|📼#videocassette|🔍#magnifying glass tilted left|🔎#magnifying glass tilted right|💡#light bulb|🔦#flashlight|🏮#red paper lantern|📔#notebook with decorative cover|📕#closed book|📖#open book|📗#green book|📘#blue book|📙#orange book|📚#books|📓#notebook|📒#ledger|📃#page with curl|📜#scroll|📄#page facing up|📰#newspaper|📑#bookmark tabs|🔖#bookmark|💰#money bag|💴#yen banknote|💵#dollar banknote|💶#euro banknote|💷#pound banknote|💸#money with wings|💳#credit card|💹#chart increasing with yen|✉️#envelope|📧#e-mail|📨#incoming envelope|📩#envelope with arrow|📤#outbox tray|📥#inbox tray|📦#package|📫#closed mailbox with raised flag|📪#closed mailbox with lowered flag|📬#open mailbox with raised flag|📭#open mailbox with lowered flag|📮#postbox|✏️#pencil|✒️#black nib|📝#memo|💼#briefcase|📁#file folder|📂#open file folder|📅#calendar|📆#tear-off calendar|📇#card index|📈#chart increasing|📉#chart decreasing|📊#bar chart|📋#clipboard|📌#pushpin|📍#round pushpin|📎#paperclip|📏#straight ruler|📐#triangular ruler|✂️#scissors|🔒#locked|🔓#unlocked|🔏#locked with pen|🔐#locked with key|🔑#key|🔨#hammer|⛏️#pick|⚒️#hammer and pick|⚔️#crossed swords|🔫#pistol|🏹#bow and arrow|🔧#wrench|🔩#nut and bolt|⚙️#gear|⚖️#balance scale|🔗#link|⛓️#chains|⚗️#alembic|🔬#microscope|🔭#telescope|📡#satellite antenna|💉#syringe|💊#pill|🚪#door|🚽#toilet|🚿#shower|🛁#bathtub|🛒#shopping cart|🚬#cigarette|⚰️#coffin|⚱️#funeral urn|🗿#moai", "🏧#ATM sign|🚮#litter in bin sign|🚰#potable water|♿#wheelchair symbol|🚹#men’s room|🚺#women’s room|🚻#restroom|🚼#baby symbol|🚾#water closet|🛂#passport control|🛃#customs|🛄#baggage claim|🛅#left luggage|⚠️#warning|🚸#children crossing|⛔#no entry|🚫#prohibited|🚳#no bicycles|🚭#no smoking|🚯#no littering|🚱#non-potable water|🚷#no pedestrians|📵#no mobile phones|🔞#no one under eighteen|☢️#radioactive|☣️#biohazard|⬆️#up arrow|↗️#up-right arrow|➡️#right arrow|↘️#down-right arrow|⬇️#down arrow|↙️#down-left arrow|⬅️#left arrow|↖️#up-left arrow|↕️#up-down arrow|↔️#left-right arrow|↩️#right arrow curving left|↪️#left arrow curving right|⤴️#right arrow curving up|⤵️#right arrow curving down|🔃#clockwise vertical arrows|🔄#counterclockwise arrows button|🔙#BACK arrow|🔚#END arrow|🔛#ON! arrow|🔜#SOON arrow|🔝#TOP arrow|🛐#place of worship|⚛️#atom symbol|✡️#star of David|☸️#wheel of dharma|☯️#yin yang|✝️#latin cross|☦️#orthodox cross|☪️#star and crescent|☮️#peace symbol|🕎#menorah|🔯#dotted six-pointed star|♈#Aries|♉#Taurus|♊#Gemini|♋#Cancer|♌#Leo|♍#Virgo|♎#Libra|♏#Scorpio|♐#Sagittarius|♑#Capricorn|♒#Aquarius|♓#Pisces|⛎#Ophiuchus|🔀#shuffle tracks button|🔁#repeat button|🔂#repeat single button|▶️#play button|⏩#fast-forward button|⏭️#next track button|⏯️#play or pause button|◀️#reverse button|⏪#fast reverse button|⏮️#last track button|🔼#upwards button|⏫#fast up button|🔽#downwards button|⏬#fast down button|⏸️#pause button|⏹️#stop button|⏺️#record button|⏏️#eject button|🎦#cinema|🔅#dim button|🔆#bright button|📶#antenna bars|📳#vibration mode|📴#mobile phone off|♀️#female sign|♂️#male sign|✖️#multiply|➕#plus|➖#minus|➗#divide|‼️#double exclamation mark|⁉️#exclamation question mark|❓#question mark|❔#white question mark|❕#white exclamation mark|❗#exclamation mark|〰️#wavy dash|💱#currency exchange|💲#heavy dollar sign|⚕️#medical symbol|♻️#recycling symbol|⚜️#fleur-de-lis|🔱#trident emblem|📛#name badge|🔰#Japanese symbol for beginner|⭕#hollow red circle|✅#check mark button|☑️#check box with check|✔️#check mark|❌#cross mark|❎#cross mark button|➰#curly loop|➿#double curly loop|〽️#part alternation mark|✳️#eight-spoked asterisk|✴️#eight-pointed star|❇️#sparkle|©️#copyright|®️#registered|™️#trade mark|🔟#keycap: 10|🔠#input latin uppercase|🔡#input latin lowercase|🔢#input numbers|🔣#input symbols|🔤#input latin letters|🆎#AB button (blood type)|🆑#CL button|🆒#COOL button|🆓#FREE button|ℹ️#information|🆔#ID button|Ⓜ️#circled M|🆕#NEW button|🆖#NG button|🆗#OK button|🆘#SOS button|🆙#UP! button|🆚#VS button|🈁#Japanese “here” button|🈶#Japanese “not free of charge” button|🈯#Japanese “reserved” button|🉐#Japanese “bargain” button|🈹#Japanese “discount” button|🈚#Japanese “free of charge” button|🈲#Japanese “prohibited” button|🉑#Japanese “acceptable” button|🈸#Japanese “application” button|🈴#Japanese “passing grade” button|🈳#Japanese “vacancy” button|㊗️#Japanese “congratulations” button|㊙️#Japanese “secret” button|🈺#Japanese “open for business” button|🈵#Japanese “no vacancy” button|🔴#red circle|🔵#blue circle|⚫#black circle|⚪#white circle|⬛#black large square|⬜#white large square|◼️#black medium square|◻️#white medium square|◾#black medium-small square|◽#white medium-small square|▪️#black small square|▫️#white small square|🔶#large orange diamond|🔷#large blue diamond|🔸#small orange diamond|🔹#small blue diamond|🔺#red triangle pointed up|🔻#red triangle pointed down|💠#diamond with a dot|🔘#radio button|🔳#white square button|🔲#black square button"]
	var emojidata = null;

	function MakeEmojiData() {
		if (emojidata)
			return;
		emojidata = [];
		for (var groupindex = 0; groupindex < groupnames.length; groupindex++) {
			var emojiitems = [];
			var emojigroup = { index: groupindex, name: groupnames[groupindex], items: emojiitems };
			var emojiarr = emojistrs[groupindex].split('|');
			for (var ei = 0; ei < emojiarr.length; ei++) {
				var emojistr = emojiarr[ei];
				var pair = emojistr.split('#')
				emojiitems.push({ emoji: pair[0], keyword: pair[1] });
			}
			emojidata.push(emojigroup);
		}
		//console.log(emojidata);
	}

	var obj = this;

	var config, editor;

	obj.PluginName = "InsertEmoji";

	obj.InitConfig = function (argconfig) {
		config = argconfig;
	}
	obj.InitEditor = function (argeditor) {
		editor = argeditor;

		editor.toolbarFactoryMap["insertemoji"] = function (cmd) {
			return editor.createToolbarItemDropDownPanel(cmd, function (panel) {

				MakeEmojiData()

				panel.style.width = "360px";
				panel.style.height = "420px";
				panel.style.display = "flex";
				panel.style.flexDirection = "column";

				panel.onclick = function (e) {
					if (e.target.nodeName == "GSPAN") {
						editor.closeCurrentPopup();
						var htmlcode = e.target.getAttribute("htmlcode");
						console.log("insert emoji", htmlcode)
						editor.insertHTML(htmlcode);
						editor.collapse(false);
						editor.focus();
					}
				}

				var selecteditem = null;
				var toselectitem = null;
				function clear_selecteditem() {
					if (selecteditem != null) {
						selecteditem.style.backgroundColor = "";
						selecteditem = null;
					}
				}
				function set_selecteditem() {
					clear_selecteditem();
					selecteditem = toselectitem; selecteditem.style.backgroundColor = "#e6e6e6";
					toselectitem = null;
				}
				var tid_sel = 0;

				panel.onmouseover = function (e) {
					for (var node = e.target; node != panel; node = node.parentNode) {
						if (node.nodeName == "GITEM") {
							if (node == toselectitem)
								return;
							toselectitem = node;
							clearTimeout(tid_sel);
							tid_sel = setTimeout(set_selecteditem, 10);
							return;
						}
					}
				}
				panel.onmouseout = function () {
					clearTimeout(tid_sel);
					tid_sel = setTimeout(clear_selecteditem, 10)
				}

				var searchbar = __Append(panel, "label", "margin:5px;position:relative;");
				searchbar.setAttribute("id", "emojis_searchbar");
				var searchbox = __Append(searchbar, "input", "width:100%;padding:5px 20px;border:solid 1px #ccc;border-radius:5px;");
				searchbox.setAttribute("placeholder", editor.getLangText("searchemojis"));

				var tid_key = 0;
				searchbox.onchange = searchbox.onkeyup = searchbox.onkeypress = searchbox.onpaste = function () {
					clearTimeout(tid_key);
					tid_key = setTimeout(show_result, 100);
				}
				function show_result() {
					var keyword = searchbox.value.trim().toLowerCase();
					if (!keyword) {
						tabpanel.style.display =
							grouppanel.style.display = "";
						resultpanel.style.display = "none";
						return;
					}

					tabpanel.style.display =
						grouppanel.style.display = "none";
					resultpanel.style.display = "flex";
					resultpanel.innerHTML = "";

					var resultline = __Append(resultpanel, "div", "width:100%;padding:3px;margin-top:5px;color:darkblue;text-align:center;");

					var itemindex = 0;


					for (var gi = 0; gi < emojidata.length; gi++) {
						var group = emojidata[gi];
						for (var ii = 0; ii < group.items.length; ii++) {
							var item = group.items[ii];

							if (!item.keyword || item.keyword.indexOf(keyword) == -1)
								continue;

							itemindex++;

							//if (itemindex > 20)break;
							var gitem = __Append(resultpanel, "gitem", "width:32px;height:32px;margin:2px", "rte-flex-column-center")
							var gspan = __Append(gitem, "gspan", "");
							var htmlcode = CharToHTMLCode(item.emoji);
							gspan.setAttribute("title", item.emoji + " " + item.keyword)
							gspan.setAttribute("htmlcode", htmlcode)
							gspan.innerHTML = htmlcode;
						}
					}

					resultline.innerText = itemindex + " items";

				}

				searchbox.focus();

				panel.setAttribute("id", "emoji-picker");

				var tabpanel = __Append(panel, "div");

				var resultpanel = __Append(panel, "div", "display:none;flex-direction:row;flex-wrap:wrap;overflow-y:scroll;padding-bottom:55px");

				var grouppanel = __Append(panel, "div", "overflow-y:scroll;padding-bottom:55px;flex:999");

				var groupdivs = [];

				for (var gi = 0; gi < emojidata.length; gi++) {
					var group = emojidata[gi];
					var gdiv = __Append(grouppanel, "div", "padding:3px;margin-top:5px;color:darkblue;");
					groupdivs.push(gdiv);
					gdiv.innerText = group.name[0].toUpperCase() + group.name.substring(1);

					gdiv = __Append(grouppanel, "div", "display:flex;flex-direction:row;flex-wrap:wrap;");

					for (var itemindex = 0; itemindex < group.items.length; itemindex++) {
						var item = group.items[itemindex];
						//if (itemindex > 20)break;
						var gitem = __Append(gdiv, "gitem", "width:32px;height:32px;margin:2px", "rte-flex-column-center")
						var gspan = __Append(gitem, "gspan", "");
						var htmlcode = CharToHTMLCode(item.emoji);
						gspan.setAttribute("title", item.emoji + " " + item.keyword)
						gspan.setAttribute("htmlcode", htmlcode)
						gspan.innerHTML = htmlcode;
					}
				}

				var tabui = __Append(tabpanel, "rte-tabui");
				tabui.setAttribute("id", "emoji-picker");
				var tabuitoolbar = __Append(tabui, "rte-tabui-toolbar");
				var tabuibtns = [];
				function CreateTabBtn(group) {
					var btn = __Append(tabuitoolbar, "rte-tabui-toolbar-button", "width:32px;text-align:center;margin:4px")
					tabuibtns.push(btn);
					btn.setAttribute("title", group.name);
					btn.innerHTML = group.items[0].emoji
					btn.onclick = function () {
						grouppanel.scrollTop = groupdivs[group.index].getBoundingClientRect().top - grouppanel.getBoundingClientRect().top + grouppanel.scrollTop;
						grouppanel.onscroll();
					}
					btn.group = group;
				}
				for (var gi = 0; gi < emojidata.length; gi++) {
					var group = emojidata[gi];
					CreateTabBtn(group)
				}

				var lastactivebtn = null;
				grouppanel.onscroll = function () {
					var ptop = grouppanel.getBoundingClientRect().top;
					console.log(ptop);
					if (lastactivebtn) lastactivebtn.className = "";
					for (var bi = 0; bi < tabuibtns.length; bi++) {
						var btn = tabuibtns[bi];
						var gdiv = groupdivs[btn.group.index];
						if (gdiv.getBoundingClientRect().top > ptop) {
							lastactivebtn = tabuibtns[btn.group.index - 1] || btn;
							lastactivebtn.className = "rte-ui-active";
							return;
						}
					}

					lastactivebtn = tabuibtns[tabuibtns.length - 1];
					lastactivebtn.className = "rte-ui-active";
				}
				grouppanel.onscroll();


			})
		};

	}

	function __Append(parent, tagname, csstext, cssclass) {
		var tag = parent.ownerDocument.createElement(tagname);
		if (csstext) tag.style.cssText = csstext;
		if (cssclass) tag.className = cssclass;
		parent.appendChild(tag);
		return tag;
	}


}






RTE_DefaultConfig.plugin_insertgallery = RTE_Plugin_InsertGallery;

function RTE_Plugin_InsertGallery() {
    var obj = this;
    var config;
    var editor;

    obj.PluginName = "InsertGallery";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (!config.galleryImages) {
            config.galleryImages = [];
        }
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_insertgallery", function (state) {
            state.returnValue = true;
            obj.DoInsertGallery();
        });
    };

    function append(parent, tagName, cssText, className) {
        var tag = parent.ownerDocument.createElement(tagName);
        if (cssText) {
            tag.style.cssText = cssText;
        }
        if (className) {
            tag.className = className;
        }
        parent.appendChild(tag);
        return tag;
    }

    function clear(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function getFileName(url) {
        var value = String(url || "").split("#")[0].split("?")[0];
        var lastSlash = value.lastIndexOf("/");
        var name = lastSlash >= 0 ? value.substring(lastSlash + 1) : value;
        try {
            name = decodeURIComponent(name);
        } catch (ex) {
        }
        return name || "Image";
    }

    function getMetaText(item) {
        if (item.meta) {
            return item.meta;
        }
        if (item.alt) {
            return item.alt;
        }
        return item.url;
    }

    function normalizeGalleryItem(item) {
        var normalized = null;

        if (typeof item === "string") {
            normalized = {
                url: item,
                thumbnail: item,
                name: getFileName(item)
            };
        } else if (item instanceof Array) {
            normalized = {
                url: item[0],
                thumbnail: item[0],
                name: item[1] || getFileName(item[0]),
                meta: item[2] || ""
            };
        } else if (item && typeof item === "object") {
            var url = item.url || item.src || item.href;
            if (!url) {
                return null;
            }

            normalized = {
                url: url,
                thumbnail: item.thumbnail || item.thumb || item.preview || url,
                name: item.name || item.text || item.title || getFileName(url),
                meta: item.meta || item.description || item.alt || ""
            };
        }

        if (!normalized || !normalized.url) {
            return null;
        }

        if (!normalized.thumbnail) {
            normalized.thumbnail = normalized.url;
        }

        if (!normalized.name) {
            normalized.name = getFileName(normalized.url);
        }

        return normalized;
    }

    function uploadFiles(fileList, onUploaded, onFinished, onFailed) {
        var files = [];
        var handler = window.rte_file_upload_handler;
        var i;

        for (i = 0; i < fileList.length; i++) {
            files.push(fileList[i]);
        }

        if (!files.length) {
            onFinished();
            return;
        }

        if (typeof handler !== "function") {
            if (onFailed) {
                onFailed("Upload handler is not configured.");
            }
            onFinished();
            return;
        }

        var index = 0;

        function next() {
            if (index >= files.length) {
                onFinished();
                return;
            }

            var file = files[index];
            handler(file, function (url, error) {
                if (url) {
                    onUploaded(url, file, index, files);
                } else if (onFailed) {
                    onFailed(error || ("Upload failed for " + file.name), file);
                }

                index++;
                next();
            }, index, files);
        }

        next();
    }

    obj.DoInsertGallery = function () {
        var dialoginner = editor.createDialog(editor.getLangText("insertgallerytitle") || "Image gallery", "rte-dialog-insertgallery");
        var closeDialog = typeof dialoginner.close === "function" ? function () {
            dialoginner.close();
        } : function () {
            editor.closeCurrentPopup();
        };

        var browser = append(dialoginner, "div", "", "rte-gallery-browser");
        var header = append(browser, "div", "", "rte-dialog-browser-header");
        var kicker = append(header, "div", "", "rte-dialog-browser-kicker");
        kicker.innerText = "Media Library";
        var title = append(header, "div", "", "rte-dialog-browser-title");
        title.innerText = "Image gallery";
        var copy = append(header, "div", "", "rte-dialog-browser-copy");
        copy.innerText = "Browse uploaded assets, filter by name, and insert the selected image into the editor.";

        var toolbar = append(browser, "div", "", "rte-gallery-browser-toolbar");
        var path = append(toolbar, "div", "", "rte-gallery-browser-path");
        path.innerText = "/";
        var type = append(toolbar, "div", "", "rte-gallery-browser-type");
        type.innerText = "Image Files";

        var uploadButton = append(toolbar, "button", "", "rte-gallery-browser-button");
        uploadButton.type = "button";
        uploadButton.innerText = "Upload";

        var refreshButton = append(toolbar, "button", "", "rte-gallery-browser-button");
        refreshButton.type = "button";
        refreshButton.innerText = "Refresh";

        var search = append(toolbar, "input", "", "rte-gallery-browser-search");
        search.type = "search";
        search.placeholder = "Search images";

        var fileInput = append(toolbar, "input", "display:none;");
        fileInput.type = "file";
        fileInput.accept = "image/*,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg";
        fileInput.multiple = true;

        var status = append(browser, "div", "", "rte-gallery-browser-status");
        var surface = append(browser, "div", "", "rte-gallery-browser-surface");
        var grid = append(surface, "div", "", "rte-gallery-browser-grid");
        var empty = append(surface, "div", "", "rte-gallery-browser-empty");
        empty.innerText = "No images match this search. Upload a file or adjust the filter.";

        var footer = append(browser, "div", "", "rte-gallery-browser-footer");
        var footerText = append(footer, "div", "", "rte-gallery-browser-footer-text");
        footerText.innerText = "Choose an image to enable insert.";

        var cancelButton = append(footer, "button", "", "rte-gallery-browser-button");
        cancelButton.type = "button";
        cancelButton.innerText = "Cancel";

        var insertButton = append(footer, "button", "", "rte-gallery-browser-button rte-gallery-browser-button-primary");
        insertButton.type = "button";
        insertButton.innerText = "Insert";
        insertButton.disabled = true;

        var selectedUrl = "";

        function getNormalizedItems() {
            var list = [];
            var items = config.galleryImages || [];
            var i;
            for (i = 0; i < items.length; i++) {
                var normalized = normalizeGalleryItem(items[i]);
                if (normalized) {
                    list.push(normalized);
                }
            }
            return list;
        }

        function getFilteredItems() {
            var keyword = search.value.replace(/^\s+|\s+$/g, "").toLowerCase();
            var items = getNormalizedItems();
            if (!keyword) {
                return items;
            }

            return items.filter(function (item) {
                return (item.name && item.name.toLowerCase().indexOf(keyword) >= 0)
                    || (item.meta && item.meta.toLowerCase().indexOf(keyword) >= 0)
                    || (item.url && item.url.toLowerCase().indexOf(keyword) >= 0);
            });
        }

        function updateStatus(items) {
            var selectedName = "";
            var i;
            for (i = 0; i < items.length; i++) {
                if (items[i].url === selectedUrl) {
                    selectedName = items[i].name;
                    break;
                }
            }

            status.innerText = items.length + " item" + (items.length === 1 ? "" : "s") + " available."
                + (selectedName ? " " + selectedName + " selected." : " No image selected.");
            footerText.innerText = selectedName ? ("Ready to insert " + selectedName + ".") : "Choose an image to enable insert.";
            insertButton.disabled = !selectedName;
        }

        function insertSelected() {
            if (!selectedUrl) {
                return;
            }
            editor.insertImageByUrl(selectedUrl);
            closeDialog();
            editor.focus();
        }

        function render() {
            clear(grid);
            var items = getFilteredItems();
            var i;

            empty.style.display = items.length ? "none" : "block";

            for (i = 0; i < items.length; i++) {
                (function (item) {
                    var card = append(grid, "button", "", "rte-gallery-browser-card");
                    card.type = "button";
                    if (item.url === selectedUrl) {
                        card.classList.add("is-selected");
                    }

                    var selection = append(card, "div", "", "rte-gallery-browser-selection");
                    selection.innerText = item.url === selectedUrl ? "Selected" : "";

                    var thumb = append(card, "div", "", "rte-gallery-browser-thumbnail");
                    var image = append(thumb, "img", "", "rte-gallery-browser-thumbnail-image");
                    image.src = item.thumbnail;
                    image.alt = item.name;

                    var name = append(card, "div", "", "rte-gallery-browser-name");
                    name.innerText = item.name;

                    var meta = append(card, "div", "", "rte-gallery-browser-meta");
                    meta.innerText = getMetaText(item);

                    card.onclick = function () {
                        selectedUrl = item.url;
                        render();
                    };

                    card.ondblclick = function () {
                        selectedUrl = item.url;
                        insertSelected();
                    };
                })(items[i]);
            }

            if (selectedUrl) {
                var stillVisible = false;
                for (i = 0; i < items.length; i++) {
                    if (items[i].url === selectedUrl) {
                        stillVisible = true;
                        break;
                    }
                }
                if (!stillVisible) {
                    selectedUrl = "";
                }
            }

            updateStatus(items);
        }

        uploadButton.onclick = function () {
            fileInput.click();
        };

        fileInput.onchange = function () {
            var lastUploaded = "";
            status.innerText = "Uploading images...";

            uploadFiles(fileInput.files, function (url) {
                lastUploaded = url;
                config.galleryImages.unshift(url);
            }, function () {
                if (lastUploaded) {
                    selectedUrl = lastUploaded;
                }
                fileInput.value = "";
                render();
            }, function (error) {
                status.innerText = error || "Upload failed.";
            });
        };

        refreshButton.onclick = render;
        search.oninput = render;
        cancelButton.onclick = closeDialog;
        insertButton.onclick = insertSelected;

        render();
        search.focus();
    };
}


RTE_DefaultConfig.plugin_inserttemplate = RTE_Plugin_InsertTemplate;

function RTE_Plugin_InsertTemplate() {
    var obj = this;
    var config;
    var editor;

    obj.PluginName = "InsertTemplate";

    obj.InitConfig = function (argconfig) {
        config = argconfig;
        if (!config.htmlTemplates) {
            config.htmlTemplates = [];
        }
    };

    obj.InitEditor = function (argeditor) {
        editor = argeditor;

        editor.attachEvent("exec_command_inserttemplate", function (state) {
            state.returnValue = true;
            obj.DoInsertTemplate();
        });
    };

    function append(parent, tagName, cssText, className) {
        var tag = parent.ownerDocument.createElement(tagName);
        if (cssText) {
            tag.style.cssText = cssText;
        }
        if (className) {
            tag.className = className;
        }
        parent.appendChild(tag);
        return tag;
    }

    function clear(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function stripHtml(html) {
        var div = document.createElement("div");
        div.innerHTML = html || "";
        return div.innerText || div.textContent || "";
    }

    function normalizeTemplateItem(item, index) {
        if (item instanceof Array) {
            return {
                id: "template-" + index,
                title: item[0] || ("Template " + (index + 1)),
                html: item[1] || "",
                meta: item[2] || ""
            };
        }

        if (item && typeof item === "object") {
            return {
                id: item.id || ("template-" + index),
                title: item.title || item.name || item.text || ("Template " + (index + 1)),
                html: item.html || item.content || "",
                meta: item.meta || item.description || ""
            };
        }

        if (typeof item === "string") {
            return {
                id: "template-" + index,
                title: "Template " + (index + 1),
                html: item,
                meta: ""
            };
        }

        return null;
    }

    function scalePreview(body, canvas) {
        var maxWidth = 206;
        var maxHeight = 166;
        var width = Math.max(canvas.scrollWidth, 1);
        var height = Math.max(canvas.scrollHeight, 1);
        var scale = Math.min(1, maxWidth / width, maxHeight / height);

        canvas.style.transformOrigin = "top left";
        canvas.style.transform = "scale(" + scale + ")";
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
    }

    obj.DoInsertTemplate = function () {
        var dialoginner = editor.createDialog(editor.getLangText("inserttemplatetitle") || "Insert template", "rte-dialog-inserttemplate");
        var closeDialog = typeof dialoginner.close === "function" ? function () {
            dialoginner.close();
        } : function () {
            editor.closeCurrentPopup();
        };

        var browser = append(dialoginner, "div", "", "rte-dialog-browser");
        var header = append(browser, "div", "", "rte-dialog-browser-header");
        var kicker = append(header, "div", "", "rte-dialog-browser-kicker");
        kicker.innerText = "Content Blocks";
        var title = append(header, "div", "", "rte-dialog-browser-title");
        title.innerText = "Insert template";
        var copy = append(header, "div", "", "rte-dialog-browser-copy");
        copy.innerText = "Preview reusable layouts, search by name, and replace the current editor content with a selected template.";

        var toolbar = append(browser, "div", "", "rte-dialog-browser-toolbar");
        var search = append(toolbar, "input", "", "rte-dialog-browser-search");
        search.type = "search";
        search.placeholder = "Search templates";
        var count = append(toolbar, "div", "", "rte-dialog-browser-count");

        var scrollpanel = append(browser, "div", "", "rte-dialog-browser-scrollpanel");
        var grid = append(scrollpanel, "div", "", "rte-dialog-browser-grid rte-template-grid");
        var empty = append(scrollpanel, "div", "", "rte-dialog-browser-empty");
        empty.innerText = "No templates match the current filter.";

        var footer = append(browser, "div", "", "rte-gallery-browser-footer");
        var footerText = append(footer, "div", "", "rte-gallery-browser-footer-text");
        footerText.innerText = "Select a template to replace the current content.";

        var cancelButton = append(footer, "button", "", "rte-gallery-browser-button");
        cancelButton.type = "button";
        cancelButton.innerText = "Cancel";

        var applyButton = append(footer, "button", "", "rte-gallery-browser-button rte-gallery-browser-button-primary");
        applyButton.type = "button";
        applyButton.innerText = "Replace Content";
        applyButton.disabled = true;

        var selectedId = "";

        function getTemplates() {
            var list = [];
            var items = config.htmlTemplates || [];
            var i;
            for (i = 0; i < items.length; i++) {
                var normalized = normalizeTemplateItem(items[i], i);
                if (normalized && normalized.html) {
                    list.push(normalized);
                }
            }
            return list;
        }

        function getFilteredTemplates() {
            var keyword = search.value.replace(/^\s+|\s+$/g, "").toLowerCase();
            var items = getTemplates();
            if (!keyword) {
                return items;
            }

            return items.filter(function (item) {
                var plainText = stripHtml(item.html).toLowerCase();
                return item.title.toLowerCase().indexOf(keyword) >= 0
                    || plainText.indexOf(keyword) >= 0
                    || (item.meta && item.meta.toLowerCase().indexOf(keyword) >= 0);
            });
        }

        function updateFooter(items) {
            var selectedTemplate = null;
            var i;
            for (i = 0; i < items.length; i++) {
                if (items[i].id === selectedId) {
                    selectedTemplate = items[i];
                    break;
                }
            }

            count.innerText = items.length + " template" + (items.length === 1 ? "" : "s");
            footerText.innerText = selectedTemplate
                ? ("Ready to replace the editor content with " + selectedTemplate.title + ".")
                : "Select a template to replace the current content.";
            applyButton.disabled = !selectedTemplate;
        }

        function applySelected() {
            var items = getTemplates();
            var i;
            for (i = 0; i < items.length; i++) {
                if (items[i].id === selectedId) {
                    editor.setHTMLCode(items[i].html);
                    closeDialog();
                    editor.focus();
                    return;
                }
            }
        }

        function render() {
            clear(grid);
            var items = getFilteredTemplates();
            var i;

            empty.style.display = items.length ? "none" : "block";

            for (i = 0; i < items.length; i++) {
                (function (item) {
                    var card = append(grid, "button", "", "rte-dialog-browser-card");
                    card.type = "button";
                    if (item.id === selectedId) {
                        card.classList.add("is-selected");
                    }

                    var preview = append(card, "div", "", "rte-template-card-preview");
                    var previewBody = append(preview, "div", "", "rte-template-card-preview-body");
                    var canvas = append(previewBody, "div", "", "rte-template-card-preview-canvas");
                    canvas.innerHTML = item.html;
                    scalePreview(previewBody, canvas);

                    var footer = append(card, "div", "", "rte-template-card-footer");
                    var title = append(footer, "div", "", "rte-template-card-title");
                    title.innerText = item.title;
                    var meta = append(footer, "div", "", "rte-template-card-meta");
                    meta.innerText = item.meta || stripHtml(item.html).substring(0, 80) || "Reusable template";

                    card.onclick = function () {
                        selectedId = item.id;
                        render();
                    };

                    card.ondblclick = function () {
                        selectedId = item.id;
                        applySelected();
                    };
                })(items[i]);
            }

            if (selectedId) {
                var visible = false;
                for (i = 0; i < items.length; i++) {
                    if (items[i].id === selectedId) {
                        visible = true;
                        break;
                    }
                }
                if (!visible) {
                    selectedId = "";
                }
            }

            updateFooter(items);
        }

        search.oninput = render;
        cancelButton.onclick = closeDialog;
        applyButton.onclick = applySelected;

        render();
        search.focus();
    };
}


RTE_DefaultConfig.plugin_zz_richtextbox_dialog_style = RTE_Plugin_RichTextBoxDialogStyle;

function RTE_Plugin_RichTextBoxDialogStyle() {
    var obj = this;

    obj.PluginName = "RichTextBoxDialogStyle";

    obj.InitConfig = function (config) {
        if (!config.imageItems) {
            config.imageItems = [];
        }
        if (!config.galleryImages) {
            config.galleryImages = [];
        }
        if (!config.htmlTemplates) {
            config.htmlTemplates = [];
        }
        if (!config.documentItems) {
            config.documentItems = [];
        }
    };

    obj.InitEditor = function () {
    };

    function append(parent, tagName, cssText, className) {
        var tag = parent.ownerDocument.createElement(tagName);
        if (cssText) {
            tag.style.cssText = cssText;
        }
        if (className) {
            tag.className = className;
        }
        parent.appendChild(tag);
        return tag;
    }

    function getUrlValue(input) {
        return input && input.value ? input.value.replace(/^\s+|\s+$/g, "") : "";
    }

    function getUrlHost(value) {
        try {
            return new URL(value, window.location.href).hostname || "";
        } catch (ex) {
            return "";
        }
    }

    function getUrlFileName(value) {
        var clean = String(value || "").split("#")[0].split("?")[0];
        var slash = clean.lastIndexOf("/");
        var fileName = slash >= 0 ? clean.substring(slash + 1) : clean;
        try {
            fileName = decodeURIComponent(fileName);
        } catch (ex) {
        }
        return fileName || "";
    }

    function getExtension(value) {
        var fileName = getUrlFileName(value);
        var dot = fileName.lastIndexOf(".");
        if (dot < 0) {
            return "LINK";
        }
        return fileName.substring(dot + 1).toUpperCase().substring(0, 4);
    }

    function ensureUploadIntro(panel, className, message) {
        if (!panel || panel.querySelector("." + className)) {
            return;
        }
        var intro = append(panel, "div", "", className);
        intro.innerText = message;
    }

    function bindInput(input, handler, flagName) {
        if (input[flagName]) {
            return false;
        }

        if (input.addEventListener) {
            input.addEventListener("input", handler);
        } else {
            input.onkeyup = handler;
            input.onchange = handler;
            input.onpaste = handler;
        }

        input[flagName] = true;
        return true;
    }

    function ensureImagePreview(panel, urlLine) {
        if (!panel || !urlLine) {
            return;
        }

        var input = urlLine.querySelector("input[type='text']");
        if (!input) {
            return;
        }

        if (!input.placeholder) {
            input.placeholder = "https://example.com/image.jpg";
        }

        var preview = panel.querySelector(".rte-insertimage-preview");
        if (!preview) {
            preview = append(panel, "div", "", "rte-insertimage-preview is-empty");
            var image = append(preview, "img", "", "rte-insertimage-preview-image");
            image.alt = "Image preview";
            append(preview, "div", "", "rte-insertimage-preview-caption");
        }

        if (input.__rteRichTextBoxImagePreviewBound) {
            return;
        }

        var previewImage = preview.querySelector(".rte-insertimage-preview-image");
        var previewCaption = preview.querySelector(".rte-insertimage-preview-caption");

        function updatePreview() {
            var value = getUrlValue(input);
            if (!value) {
                preview.classList.add("is-empty");
                preview.classList.remove("is-error");
                previewImage.removeAttribute("src");
                previewCaption.innerText = "Enter an image URL to preview it here.";
                return;
            }

            preview.classList.remove("is-empty");
            preview.classList.remove("is-error");
            previewCaption.innerText = "Loading preview...";
            previewImage.src = value;
        }

        previewImage.onload = function () {
            preview.classList.remove("is-empty");
            preview.classList.remove("is-error");
            previewCaption.innerText = "Ready to insert this image.";
        };

        previewImage.onerror = function () {
            preview.classList.remove("is-empty");
            preview.classList.add("is-error");
            previewCaption.innerText = "Preview unavailable for this URL.";
        };

        bindInput(input, updatePreview, "__rteRichTextBoxImagePreviewBound");
        updatePreview();
    }

    function ensureDocumentPreview(panel, urlLine) {
        if (!panel || !urlLine) {
            return;
        }

        var input = urlLine.querySelector("input[type='text']");
        if (!input) {
            return;
        }

        if (!input.placeholder) {
            input.placeholder = "https://example.com/files/proposal.pdf";
        }

        var preview = panel.querySelector(".rte-insertdocument-preview");
        if (!preview) {
            preview = append(panel, "div", "", "rte-insertdocument-preview is-empty");
            var icon = append(preview, "div", "", "rte-insertdocument-preview-icon");
            append(icon, "div", "", "rte-insertdocument-preview-ext");
            var body = append(preview, "div", "", "rte-insertdocument-preview-body");
            append(body, "div", "", "rte-insertdocument-preview-title");
            append(body, "div", "", "rte-insertdocument-preview-meta");
        }

        if (input.__rteRichTextBoxDocumentPreviewBound) {
            return;
        }

        var ext = preview.querySelector(".rte-insertdocument-preview-ext");
        var title = preview.querySelector(".rte-insertdocument-preview-title");
        var meta = preview.querySelector(".rte-insertdocument-preview-meta");

        function updatePreview() {
            var value = getUrlValue(input);
            if (!value) {
                preview.classList.add("is-empty");
                ext.innerText = "DOC";
                title.innerText = "No document selected";
                meta.innerText = "Enter a document URL to preview the inserted link.";
                return;
            }

            preview.classList.remove("is-empty");
            ext.innerText = getExtension(value);
            title.innerText = getUrlFileName(value) || value;

            var host = getUrlHost(value);
            meta.innerText = host
                ? ("Source: " + host + "  |  The editor inserts a clickable link.")
                : "The editor inserts a clickable link at the current cursor position.";
        }

        bindInput(input, updatePreview, "__rteRichTextBoxDocumentPreviewBound");
        updatePreview();
    }

    function enhanceInsertImagePanels(root) {
        var panels = [];
        var i;

        if (root.classList && root.classList.contains("rte-panel-insertimage")) {
            panels.push(root);
        }

        if (root.querySelectorAll) {
            var nested = root.querySelectorAll(".rte-panel-insertimage");
            for (i = 0; i < nested.length; i++) {
                panels.push(nested[i]);
            }
        }

        for (i = 0; i < panels.length; i++) {
            var panel = panels[i];
            panel.classList.add("rte-richtextbox-dialog");

            var uploadTab = panel.querySelector(".fileuploader-dragdrop");
            if (uploadTab) {
                ensureUploadIntro(uploadTab, "rte-insertimage-intro", "Drop an image here or click anywhere in this panel to browse.");
            }

            var urlTab = panel.querySelector(".rte_insertimage_byurl");
            if (urlTab) {
                ensureUploadIntro(urlTab, "rte-insertimage-intro", "Paste a hosted image URL and verify the preview before inserting.");
                ensureImagePreview(urlTab, urlTab.querySelector(".rte-dialog-line-url"));
            }

            var actionButton = panel.querySelector(".rte-dialog-line-action .rte-dialog-button");
            if (actionButton && actionButton.innerText === "Insert") {
                actionButton.innerText = "Insert image";
            }
        }
    }

    function enhanceInsertDocumentPanels(root) {
        var panels = [];
        var i;

        if (root.classList && root.classList.contains("rte-panel-insertdocument")) {
            panels.push(root);
        }

        if (root.querySelectorAll) {
            var nested = root.querySelectorAll(".rte-panel-insertdocument");
            for (i = 0; i < nested.length; i++) {
                panels.push(nested[i]);
            }
        }

        for (i = 0; i < panels.length; i++) {
            var panel = panels[i];
            panel.classList.add("rte-richtextbox-dialog");

            var uploadTab = panel.querySelector(".fileuploader-dragdrop");
            if (uploadTab) {
                ensureUploadIntro(uploadTab, "rte-insertdocument-intro", "Upload a local file or drag it into the dialog to create a document link.");
            }

            var urlTab = panel.querySelector(".rte_insertdocument_byurl");
            if (urlTab) {
                ensureUploadIntro(urlTab, "rte-insertdocument-intro", "Paste a hosted file URL and review the link details before inserting.");
                ensureDocumentPreview(urlTab, urlTab.querySelector(".rte-dialog-line-url"));
            }

            var actionLine = panel.querySelector(".rte-dialog-line-action");
            if (actionLine) {
                actionLine.classList.add("rte-insertdocument-actions");
            }

            var actionButton = panel.querySelector(".rte-dialog-line-action .rte-dialog-button");
            if (actionButton && actionButton.innerText === "Insert") {
                actionButton.innerText = "Insert document";
            }
            if (actionButton && actionButton.innerText === "Update") {
                actionButton.innerText = "Update document";
            }
        }
    }

    function patchTree(root) {
        if (!root || root.nodeType !== 1) {
            return;
        }

        enhanceInsertImagePanels(root);
        enhanceInsertDocumentPanels(root);
    }

    function start() {
        patchTree(document.documentElement);

        if (!window.MutationObserver) {
            return;
        }

        var observer = new MutationObserver(function (mutations) {
            var i;
            var j;
            for (i = 0; i < mutations.length; i++) {
                for (j = 0; j < mutations[i].addedNodes.length; j++) {
                    patchTree(mutations[i].addedNodes[j]);
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === "loading") {
        if (document.addEventListener) {
            document.addEventListener("DOMContentLoaded", start);
        } else {
            window.attachEvent("onload", start);
        }
    } else {
        start();
    }
}



//END of all_plugins.js 