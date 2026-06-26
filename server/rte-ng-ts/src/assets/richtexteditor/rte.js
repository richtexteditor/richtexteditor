// TODO: Guard getRangeAt(0) when the selection has no ranges.
// TODO: Add Shift+Arrow support for multi-cell selections.
// API reference note: Range.cloneContents().

if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = {};
try {
	console.log("[rte] loaded v=" + (new Date().toISOString().slice(0,10)) + " size=" + (typeof __filename!=="undefined"?"?":"?"));
	window.addEventListener("error", function (ev) {
		console.error("[rte] window.error:", ev.message, "at", (ev.filename||"")+":"+(ev.lineno||"")+":"+(ev.colno||""));
	}, true);
	window.addEventListener("unhandledrejection", function (ev) {
		console.error("[rte] unhandledrejection:", ev.reason && (ev.reason.stack || ev.reason.message || ev.reason));
	});
} catch (e) {}


function RTE_CreateConfig(options) {
	function Config() { }
	Config.prototype = RTE_DefaultConfig;
	var config = new Config();
	if (options) {
		for (var p in options)
			config[p] = options[p];
	}
	return config;
}


// Version notes
// 2.0: Bug fixes and scrollbar improvements (see CHANGELOG.md for details).
// 1.015: Legacy revision entry.
// 1.013: Improved selection handling and bookmark behavior.
// 1.012: Improved drag-and-drop and introduced new bookmark logic.
// 1.011: Improved bookmark behavior.
// 1.010: Fixed additional selection bugs.
// 1.009: Added formatblock support and improved list-item and selection handling.

RichTextEditor.prototype.version = '2.0';

function RichTextEditor(container, config) {

	function debuglog() {
		//console.log.apply(console, arguments);
	}

	function FindElement(exp) {
		var c = document.getElementById(exp);
		if (c) return c;
		c = document.querySelector(exp);
		if (c) return c;
		throw new Error("Failed to find editor element : '" + exp + "'");
	}

	if (typeof (container) == "string") {
		container = FindElement(container);
	}

	var containerInput;
	var containerHTML;

	if (container.nodeName == "TEXTAREA" || container.nodeName == "INPUT") {
		containerInput = container;
		container = document.createElement("div");
		container.style.cssText = containerInput.style.cssText;
		containerInput.parentNode.insertBefore(container, containerInput);
		containerInput.style.display = 'none'
	}
	else {
		containerHTML = container.innerHTML.trim();
		if (containerHTML) container.innerHTML = "";
	}


	var isFirefox = /Firefox/.test(navigator.userAgent);

	var isIE = /Trident/.test(navigator.userAgent);
	if (isIE && !container.style.height) container.style.height = container.offsetHeight + 'px';
	if (isIE && !HTMLElement.prototype.remove) {
		HTMLElement.prototype.remove = function () {
			var pnode = this.parentNode;
			if (pnode) pnode.removeChild(this);
		}
	}

	var dialogcontainer = container; // Use document.body here if dialogs need to escape the editor container.

	if (!(this instanceof RichTextEditor))
		return new RichTextEditor(container, config);

	// Fill missing values from the default config.
	config = RTE_CreateConfig(config);

	config.container = container;

	(function () {
		// Resolve "%url_base%" placeholders in config URL properties.
		var urlb = config.url_base;
		for (var p in config) {
			if (p.substr(0, 4) != "url_" && p.substr(-3, 3) != "Url")
				continue;
			var v = config[p];
			if (typeof (v) != "string")
				continue;
			var newv = v.replace("%url_base%", urlb)
			if (newv != v)
				config[p] = newv;
		}
	})();


	var __plugins = [];

	(function () {
		for (var p in config) {
			if (p[0] != 'p' || p.substr(0, 7) != "plugin_")
				continue;
			var obj = config[p];
			if (!obj || !(obj instanceof Function))
				continue;
			__plugins.push(new obj());
		}

		for (var i = 0; i < __plugins.length; i++) {
			var p = __plugins[i];
			if (p.InitConfig) p.InitConfig(config);
		}

	})();

	//debuglog(__plugins)


	// Shared helper utilities.

	var __blobobjmap = {}
	var __bloburlmap = {};
	function __GetUrlByName(name) {
		var val = config[name];
		if (!val)
			return val;
		return __GetUrlByCode(val);
	}
	function __GetUrlByCode(val) {
		var url = __bloburlmap[val];
		if (url)
			return url;
		var v5 = val.substring(0, 5);
		var mime, str;

		if (v5 == "data:") {
			var arr = val.split(";base64,");
			if (arr.length != 2)
				return val;
			mime = arr[0].substring(5); // Example prefix: data:image/png;base64,
			str = atob(arr[1]);
		}
		else if (v5 == "<svg ") {
			mime = "image/svg+xml";
			str = val;
		}
		else
			return val;
		var bin = new Array(str.length);
		for (var i = 0; i < str.length; i++)
			bin[i] = str.charCodeAt(i);
		var blob = new Blob([new Uint8Array(bin)], { type: mime })
		url = URL.createObjectURL(blob);
		__blobobjmap[url] = blob;
		__bloburlmap[val] = url;
		return url;

	}

	var __htmldecodediv = document.createElement("div");
	function __HtmlDecode(htmlcode) {
		if (!htmlcode)
			return "";
		__htmldecodediv.innerHTML = htmlcode;
		return __htmldecodediv.innerText;
	}
	function __HtmlEncode(textcode) {
		if (!textcode)
			return "";
		return textcode.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\x22/g, "&quot;")
			.replace(/\x27/g, "&#39;");
		//.replace(/\n/g, "<br/>").replace(/\r/g, "").replace(/\t/g, '&#32;&#32;&#32;&#32;').replace(/\s/g, "&#32;");
	}

	function __ArrToArr(arr) {
		var newarr = [];
		for (var i = 0; i < arr.length; i++)
			newarr.push(arr[i])
		return newarr;
	}

	function __Translate(text, level) {
		if (config.translation && text in config.translation)
			return config.translation[text];
		return text;
	}
	function __GetLangTextLevel(name, level, srcname) {
		var val = config["text_" + name.toLowerCase()];
		if (!val) {
			var p = name.indexOf('_');
			if (p != -1)
				return __GetLangTextLevel(name.substring(p + 1), 1);
			return __Translate(srcname);
		}
		if (level < 5 && val.charAt(0) == '@')
			return __GetLangTextLevel(val.substring(1), level + 1);
		return __Translate(val);
	}
	function __GetLangText(name) {
		var val = config["text_" + name.toLowerCase()];
		if (!val) {
			var p = name.indexOf('_');
			if (p != -1)
				return __GetLangTextLevel(name.substring(p + 1), 1, name);
			return __Translate(name);
		}
		if (val.charAt(0) == '@')
			return __GetLangTextLevel(val.substring(1), 1, name);
		return __Translate(val);
	}

	function __Append(parent, tagname, csstext, cssclass) {
		var tag = parent.ownerDocument.createElement(tagname);
		if (csstext) tag.style.cssText = csstext;
		if (cssclass) tag.className = cssclass;
		if (tagname == "input" || tagname == "textarea")
			tag.setAttribute("spellcheck", "false");
		parent.appendChild(tag);
		switch (tagname) {
			case "rte-dialog-button":
				__Make_ActionElementAccessible(tag, { role: "button" });
				break;
			case "rte-dialog-header-close":
				__Make_ActionElementAccessible(tag, { role: "button", label: "Close" });
				break;
			case "rte-dropdown-menuitem":
			case "rte-menuitem":
				__Make_ActionElementAccessible(tag, { role: "menuitem" });
				break;
		}
		return tag;
	}

	function __Get_ActionElementLabel(node, fallback) {
		if (!node) return fallback || "";
		var label = node.getAttribute("aria-label")
			|| (config && config.tooltipAttribute ? node.getAttribute(config.tooltipAttribute) : null)
			|| node.getAttribute("title")
			|| node.innerText
			|| node.textContent
			|| fallback
			|| "";
		return label.replace(/\s+/g, " ").trim();
	}

	function __Is_ActionElementKey(e) {
		return e.key == "Enter" || e.key == " " || e.key == "Spacebar";
	}

	function __Make_ActionElementAccessible(node, options) {
		if (!node) return node;
		options = options || {};
		node.__rteActionOptions = options;

		if (options.role) node.setAttribute("role", options.role);
		if (options.haspopup) node.setAttribute("aria-haspopup", options.haspopup);
		if (options.tabIndex !== null && !node.hasAttribute("tabindex"))
			node.tabIndex = options.tabIndex == null ? 0 : options.tabIndex;

		function synclabel() {
			var label = __Get_ActionElementLabel(node, options.label);
			if (label) node.setAttribute("aria-label", label);
		}
		node.__rteSyncActionLabel = synclabel;
		synclabel();
		setTimeout(synclabel, 0);

		if (!node.__rteActionElementBound) {
			node.addEventListener("focus", synclabel);
			node.addEventListener("mouseenter", synclabel);
			node.addEventListener("keydown", function (e) {
				var opt = node.__rteActionOptions || {};
				var owner = node.__rteCommandOwner || node;
				if (owner.getAttribute("aria-disabled") == "true" || owner.classList.contains("rte-command-disabled"))
					return;
				if (__Is_ActionElementKey(e)) {
					e.preventDefault();
					e.stopPropagation();
					if (opt.onkeyactivate)
						opt.onkeyactivate(e, node);
					else
						node.click();
				}
				else if ((e.key == "ArrowDown" || e.key == "Down") && opt.onkeydownarrow) {
					e.preventDefault();
					e.stopPropagation();
					opt.onkeydownarrow(e, node);
				}
			});
			node.__rteActionElementBound = true;
		}

		return node;
	}

	var __actionElementSelector = "rte-toolbar-button,rte-toolbar-arrowbutton,rte-toolbar-dropdown,rte-toolbar-splitbutton-direct,rte-toolbar-splitbutton-dropdown,rte-toolbar-dropdown-item,rte-dropdown-menuitem,rte-menuitem,rte-dialog-button,rte-dialog-header-close";

	function __Is_ActionElementVisible(node) {
		if (!node || !node.isConnected)
			return false;
		if (node.getAttribute("aria-disabled") == "true")
			return false;
		if (node.tabIndex < 0)
			return false;
		if (!node.getClientRects || node.getClientRects().length == 0)
			return false;
		var view = node.ownerDocument && node.ownerDocument.defaultView;
		if (view) {
			var style = view.getComputedStyle(node);
			if (style.display == "none" || style.visibility == "hidden")
				return false;
		}
		return true;
	}

	function __Get_ActionElements(container) {
		if (!container) return [];
		return Array.prototype.filter.call(container.querySelectorAll(__actionElementSelector), function (node) {
			return __Is_ActionElementVisible(node);
		});
	}

	function __Focus_ActionElement(node) {
		if (node && node.focus)
			node.focus();
	}

	function __Focus_FirstActionElement(container) {
		var items = __Get_ActionElements(container);
		if (items.length)
			__Focus_ActionElement(items[0]);
	}

	function __Focus_LastActionElement(container) {
		var items = __Get_ActionElements(container);
		if (items.length)
			__Focus_ActionElement(items[items.length - 1]);
	}

	function __Move_ActionElementFocus(container, current, offset) {
		var items = __Get_ActionElements(container);
		if (!items.length)
			return;
		var index = items.indexOf(current);
		if (index == -1) {
			__Focus_ActionElement(items[offset >= 0 ? 0 : items.length - 1]);
			return;
		}
		index = (index + offset + items.length) % items.length;
		__Focus_ActionElement(items[index]);
	}

	function __Bind_ActionContainerKeyboard(container, options) {
		if (!container) return;
		options = options || {};
		container.__rteActionContainerOptions = options;

		if (options.role && !container.hasAttribute("role"))
			container.setAttribute("role", options.role);
		if (options.orientation)
			container.setAttribute("aria-orientation", options.orientation);
		if (options.label && !container.getAttribute("aria-label"))
			container.setAttribute("aria-label", options.label);

		if (container.__rteActionContainerBound)
			return;

		container.addEventListener("keydown", function (e) {
			var opt = container.__rteActionContainerOptions || {};
			var current = e.target && e.target.closest ? e.target.closest(__actionElementSelector) : null;
			if (!current || !container.contains(current))
				return;

			var vertical = opt.orientation == "vertical";
			switch (e.key) {
				case "ArrowRight":
				case "Right":
					if (!vertical) {
						e.preventDefault();
						e.stopPropagation();
						__Move_ActionElementFocus(container, current, 1);
					}
					break;
				case "ArrowLeft":
				case "Left":
					if (!vertical) {
						e.preventDefault();
						e.stopPropagation();
						__Move_ActionElementFocus(container, current, -1);
					}
					break;
				case "ArrowDown":
				case "Down":
					if (vertical) {
						e.preventDefault();
						e.stopPropagation();
						__Move_ActionElementFocus(container, current, 1);
					}
					break;
				case "ArrowUp":
				case "Up":
					if (vertical) {
						e.preventDefault();
						e.stopPropagation();
						__Move_ActionElementFocus(container, current, -1);
					}
					break;
				case "Home":
					e.preventDefault();
					e.stopPropagation();
					__Focus_FirstActionElement(container);
					break;
				case "End":
					e.preventDefault();
					e.stopPropagation();
					__Focus_LastActionElement(container);
					break;
				case "Escape":
				case "Esc":
					if (opt.onescape) {
						e.preventDefault();
						e.stopPropagation();
						opt.onescape(e, current, container);
					}
					break;
			}
		});

		container.__rteActionContainerBound = true;
	}

	function __Open_ActionPopupAndFocus(control) {
		if (!control) return;
		var previousPopup = _current_popup_element;
		control.click();
		setTimeout(function () {
			if (_current_popup_element && _current_popup_element != previousPopup)
				__Focus_FirstActionElement(_current_popup_element);
		}, 0);
	}

	var __focusableElementSelector = "input:not([type=hidden]),select,textarea,button,a[href],[tabindex]:not([tabindex='-1']),[contenteditable='true']";

	function __Is_FocusableElementVisible(node) {
		if (!node || !node.isConnected)
			return false;
		if (node.disabled)
			return false;
		if (node.getAttribute && node.getAttribute("aria-hidden") == "true")
			return false;
		if (node.getAttribute && node.getAttribute("aria-disabled") == "true")
			return false;
		if (!node.getClientRects || node.getClientRects().length == 0)
			return false;
		var view = node.ownerDocument && node.ownerDocument.defaultView;
		if (view) {
			var style = view.getComputedStyle(node);
			if (style.display == "none" || style.visibility == "hidden")
				return false;
		}
		return true;
	}

	function __Get_FocusableElements(container) {
		if (!container) return [];
		return Array.prototype.filter.call(container.querySelectorAll(__focusableElementSelector), function (node) {
			return __Is_FocusableElementVisible(node);
		});
	}

	function __Find_FirstDialogFocusable(dialoginner) {
		var preferred = dialoginner.querySelector("[autofocus], input:not([type=hidden]), select, textarea, rte-tabui-toolbar-button.rte-ui-active, rte-dialog-button.rte-button-type-commit, rte-dialog-button");
		if (preferred && __Is_FocusableElementVisible(preferred))
			return preferred;
		var focusables = __Get_FocusableElements(dialoginner).filter(function (node) {
			return node.nodeName != "RTE-DIALOG-HEADER-CLOSE";
		});
		if (focusables.length)
			return focusables[0];
		var closebtn = dialoginner.querySelector("rte-dialog-header-close");
		if (closebtn && __Is_FocusableElementVisible(closebtn))
			return closebtn;
		return dialoginner;
	}

	var lastmouseclientx = 0;
	var lastmouseclienty = 0;
	function __SaveMouseEvent(e) {
		if (!e) return;
		lastmouseclientx = e.clientX;
		lastmouseclienty = e.clientY;
		//debuglog(lastmouseclientx, lastmouseclienty);
	}
	function __Toast(text) {
		var div = __Append(document.body, "rte-toast", "opacity:0")
		div.innerText = text;
		setTimeout(function () {
			div.style.opacity = "1";
			div.style.left = lastmouseclientx - div.offsetWidth / 2 + "px";
			div.style.top = lastmouseclienty - div.offsetHeight - 20 + "px";
		}, 100)
		setTimeout(function () {
			document.body.removeChild(div);
		}, 800)
		//debuglog(div)
	}

	function __CopyAttributes(src, dst) {
		for (var i = 0; i < src.attributes.length; i++) {
			var attr = src.attributes[i];
			dst.setAttribute(attr.nodeName, attr.nodeValue);
		}
	}

	function __ApplyFragment(node, containername, str) {
		if (!str) return;
		var div = node.ownerDocument.createElement(containername);
		div.innerHTML = str;
		var fc = div.firstChild;
		if (fc.nodeName != node.nodeName)	// The configured wrapper tag does not match this node.
		{
			console.warn("Invalid fragment", str, node);
			return;
		}
		__CopyAttributes(fc, node);
		while (fc.firstChild)
			node.appendChild(fc.firstChild);
	}

	function _RemoveTooltipRecent(span, global) {
		if (!global) return;
		var tooltip = span.getAttribute(config.tooltipAttribute);
		if (!tooltip)
			return;
		span.removeAttribute(config.tooltipAttribute);
		setTimeout(function () {
			span.setAttribute(config.tooltipAttribute, tooltip);
		}, 5000)
	}


	function _SetInputValueClassLogic(inp, initValue) {
		if (initValue)
			inp.value = initValue;

		function Update() {
			var pn = inp.parentNode;
			if (inp == document.activeElement) {
				pn.classList.add("rte-input-focus");
				pn.classList.remove("rte-input-blur");
			}
			else {
				pn.classList.add("rte-input-blur");
				pn.classList.remove("rte-input-focus");
			}
			if (inp.value.trim()) {
				inp.classList.add("rte-input-hasvalue");
				inp.classList.remove("rte-input-isempty");
				pn.classList.add("rte-input-hasvalue");
				pn.classList.remove("rte-input-isempty");
			}
			else {
				inp.classList.remove("rte-input-hasvalue");
				inp.classList.add("rte-input-isempty");
				pn.classList.remove("rte-input-hasvalue");
				pn.classList.add("rte-input-isempty");
			}
		}

		inp.addEventListener("focus", function () {
			Update();
		});
		inp.addEventListener("blur", function () {
			Update();
		});
		inp.addEventListener("change", function () {
			Update();
		});

		inp.parentNode.addEventListener("click", function (e) {
			__SaveMouseEvent(e);
			if (e.target != inp) inp.focus();
		});

		Update();
	}


	function __GetTable(node) {
		for (; node; node = node.parentNode) {
			if (node.nodeName == "TABLE")
				return node;
		}
	}
	function __GetTableCell(node) {
		for (; node; node = node.parentNode) {
			if (node.nodeName == "TD" || node.nodeName == "TH")
				return node;
		}
	}

	function __GetStylePropName(cssname) {
		var parts = cssname.split('-');
		for (var i = 0; i < parts.length; i++) {
			var p = parts[i];
			p = p.toLowerCase();
			if (i != 0)
				p = p.substring(0, 1).toUpperCase() + p.substring(1);
			parts[i] = p;
		}
		return parts.join("");
	}


	function __GetPageScrollTop() {
		return Math.max(document.documentElement.scrollTop, document.body.scrollTop)
	}
	function __GetPageScrollLeft() {
		return Math.max(document.documentElement.scrollLeft, document.body.scrollLeft)
	}
	function startmousedrag(e, handler) {
		e.preventDefault();
		var mask = __Append(document.body, "rte-drag-mask", "position:fixed;z-index:99999999;left:0px;top:0px;width:99%;height:99%", "");
		var cx = e.clientX;
		var cy = e.clientY;
		function onmousemove(e) {
			handler(e.clientX - cx, e.clientY - cy, "move");
		}
		function onmouseup(e) {
			dispose();
			handler(e.clientX - cx, e.clientY - cy, "done");
		}
		document.addEventListener("mousemove", onmousemove, true);
		document.addEventListener("mouseup", onmouseup, true);
		function dispose() {
			document.removeEventListener("mousemove", onmousemove, true);
			document.removeEventListener("mouseup", onmouseup, true);
			document.body.removeChild(mask);
		}
	}

	function __Hook_Enter_Callback(inp, func) {
		inp.addEventListener("keypress", function (e) {
			if (e.keyCode != 13) return;
			func();
			setTimeout(function () {
				if (inp.ownerDocument.body.contains(inp)) {
					var r = inp.getBoundingClientRect();
					if (r.width && r.height) {
						inp.focus();
						inp.select();
					}
				}
			}, 80)
		})
	}


	var _current_popup_element;
	var _current_popup_handler;
	var _current_popup_listen;

	function __ON_CurrentPopupMouseDown(e) {
		if (!_current_popup_element) return;

		if (_current_popup_element.contains(e.target))
			return;

		for (var p = e.target; p; p = p.parentNode)
			if (p.parentPopup)
				return;

		__Close_CurrentPopup();
	}
	function __Close_CurrentPopup(dialogpanel) {

		if (dialogpanel && dialogpanel.parentPopup) {
			dialogpanel.disposehandler();
			if (dialogpanel._onclose) dialogpanel._onclose();	// TODO: Verify that _onclose runs for every close path.
			var arr = dialogpanel.parentPopup.submenus;
			if (arr) {
				var pos = arr.indexOf(dialogpanel)
				if (pos != -1) arr.splice(pos, 1);
			}
			return;
		}

		if (dialogpanel && dialogpanel.close)
			dialogpanel.close();

		__Focus_Editor_Delay();
		var pe = _current_popup_element;
		if (!pe)
			return;
		var ph = _current_popup_handler;
		var arr = _current_popup_element.submenus;
		_current_popup_element = null;
		_current_popup_handler = null;
		document.removeEventListener("mousedown", __ON_CurrentPopupMouseDown);
		_current_popup_listen = false;
		ph(pe);
		if (arr) {
			for (var i = 0; i < arr.length; i++) {
				arr[i].disposehandler();
				if (arr[i]._onclose)
					arr[i]._onclose();
			}
		}
	}

	function __Hook_Close_CurrentPopup_ByEsc(inp) {
		inp.addEventListener("keydown", function (e) {
			if (e.keyCode == 27) {
				__Close_CurrentPopup();
				__Focus_Editor_Delay();
			}
		});
	}

	function __Set_PopupSubmenu(element, disposehandler) {
		if (!_current_popup_element)
			return;
		var arr = _current_popup_element.submenus;
		if (!arr) arr = _current_popup_element.submenus = [];
		arr.push(element);
		element.parentPopup = _current_popup_element;
		element.disposehandler = disposehandler;
	}
	function __Set_CurrentPopup(element, disposehandler) {

	// TODO: Make the ownership relationship between elements and _current_popup_element explicit.

		if (_current_popup_element) {
			_current_popup_handler(_current_popup_element);
			var arr = _current_popup_element.submenus;
			if (arr) {
				for (var i = 0; i < arr.length; i++) {
					arr[i].disposehandler();
					if (arr[i]._onclose)
						arr[i]._onclose();
				}
			}
			if (!element) {
				__Focus_Editor_Delay();
			}
		}
		_current_popup_element = element;
		_current_popup_handler = disposehandler;

		if (!_current_popup_listen) {
			document.addEventListener("mousedown", __ON_CurrentPopupMouseDown);
			_current_popup_listen = true;
		}
	}



	var __hookmap = {};
	function ___CreateHookEvent(name) {
		var arr = [];
		var he = {}
		he.$arr = arr;
		he.$add = function (handler) {
			arr.push(handler);
		}
		he.$remove = function (handler) {
			var idx = arr.indexOf(handler);
			if (idx != null) arr.splice(idx, 1);
		}
		__hookmap[name] = he;
		return he;
	}
	function __HookEvent(name, handler) {
		var hookevent = __hookmap[name];
		if (!hookevent) {
			hookevent = ___CreateHookEvent(name);
		}
		hookevent.$add(handler);
	}
	function __UnattachEvent(name, handler) {
		var hookevent = __hookmap[name];
		if (!hookevent) return;
		hookevent.$remove(handler);
	}

	function InvokeEventHook(name) {
		var he = __hookmap[name];
		var e1 = config["on" + name];
		var e2 = editor["on" + name];
		var c = 0;
		if (he) c++;
		if (e1) c++;
		if (e2) c++;
		if (c == 0) return;
		var state = { eventName: name, stopBubble: false, returnValue: undefined };
		var args = [state];
		for (var i = 1; i < arguments.length; i++)
			args.push(arguments[i]);
		if (!state.stopBubble && e2) {
			e2.apply(editor, args);
		}
		if (!state.stopBubble && e1) {
			e1.apply(editor, args);
		}
		if (!state.stopBubble && he && he.$arr) {
			for (var i = 0; i < he.$arr.length; i++) {
				he.$arr[i].apply(editor, args);
				if (state.stopBubble)
					break;
			}
		}
		return state.returnValue;
	}

	var __officeToolbarMode = false;
	if (config.toolbar && config.toolbar.indexOf("office") != -1)
		__officeToolbarMode = true;

	var _isreadonly;

	var editor = this;

	editor.input = containerInput;
	editor.config = config;
	editor.container = container;

	container.classList.add("richtexteditor");

	if (config.skin)
		container.classList.add("rte-skin-" + config.skin);

	if (__officeToolbarMode)
		container.classList.add("rte-office");
	else
		container.classList.add("rte-modern");

	container.classList.add("rte-toolbar-" + config.toolbar);
	container.classList.add("rte-is-blurred");
	if (config.stickyToolbar) {
		container.classList.add("rte-toolbar-sticky");
	}
	if (config.autoGrow) {
		container.classList.add("rte-autogrow");
	}

	// 2026-05-11 Notion-style block drag handles. Enable via config.blockDragHandles.
	// Hovering over the iframe shows a ⋮⋮ handle anchored to the current block;
	// dragging the handle reorders blocks within the editable surface.
	function __InitBlockDragHandles() {
		if (!config.blockDragHandles) return;
		var handle = null;
		var indicator = null;
		var hoveredBlock = null;
		var dragSourceBlock = null;
		var dropTargetBlock = null;
		var dropBefore = true;

		function ensureHandle() {
			if (handle && handle.isConnected) return handle;
			handle = document.createElement("div");
			handle.className = "rte-block-drag-handle";
			handle.setAttribute("draggable", "true");
			handle.setAttribute("title", "Drag to reorder");
			handle.textContent = "⋮⋮";
			handle.style.position = "absolute";
			handle.addEventListener("mousedown", function (e) { e.stopPropagation(); });
			handle.addEventListener("dragstart", function (e) {
				dragSourceBlock = hoveredBlock;
				if (!dragSourceBlock) { e.preventDefault(); return; }
				try { e.dataTransfer.setData("text/x-rte-block", "1"); } catch (er) {}
				e.dataTransfer.effectAllowed = "move";
				handle.classList.remove("rte-block-drag-handle-visible");
			});
			handle.addEventListener("dragend", function () {
				dragSourceBlock = null;
				dropTargetBlock = null;
				if (indicator) indicator.style.display = "none";
			});
			container.appendChild(handle);
			return handle;
		}
		function ensureIndicator() {
			if (indicator && indicator.isConnected) return indicator;
			indicator = document.createElement("div");
			indicator.className = "rte-block-drop-indicator";
			indicator.style.display = "none";
			container.appendChild(indicator);
			return indicator;
		}
		function findBlock(node) {
			while (node && node !== editable) {
				if (node.nodeType === 1 && node.parentNode === editable) return node;
				node = node.parentNode;
			}
			return null;
		}
		function positionHandle(block) {
			ensureHandle();
			if (!block) { handle.classList.remove("rte-block-drag-handle-visible"); return; }
			var ifrRect = iframe.getBoundingClientRect();
			var contRect = container.getBoundingClientRect();
			var blockRect = block.getBoundingClientRect();
			// Position to the left of the block, vertically near its top.
			var x = ifrRect.left - contRect.left - 24;
			var y = ifrRect.top - contRect.top + blockRect.top + 4;
			handle.style.left = x + "px";
			handle.style.top = y + "px";
			handle.classList.add("rte-block-drag-handle-visible");
		}

		// Hover detection inside the iframe.
		__bindEditable("mousemove", function (e) {
			var blk = findBlock(e.target);
			if (blk !== hoveredBlock) {
				hoveredBlock = blk;
				positionHandle(blk);
			}
		});
		__bindEditable("mouseleave", function () {
			if (dragSourceBlock) return;
			hoveredBlock = null;
			if (handle) handle.classList.remove("rte-block-drag-handle-visible");
		});

		// Drag-over inside the iframe to compute drop target + show indicator.
		__bindEditable("dragover", function (e) {
			if (!dragSourceBlock) return;
			e.preventDefault();
			var blk = findBlock(e.target);
			if (!blk || blk === dragSourceBlock) return;
			dropTargetBlock = blk;
			var rect = blk.getBoundingClientRect();
			dropBefore = e.clientY < rect.top + rect.height / 2;
			ensureIndicator();
			var ifrRect = iframe.getBoundingClientRect();
			var contRect = container.getBoundingClientRect();
			var y = ifrRect.top - contRect.top + (dropBefore ? rect.top : rect.bottom);
			indicator.style.left = (ifrRect.left - contRect.left) + "px";
			indicator.style.top = y + "px";
			indicator.style.width = rect.width + "px";
			indicator.style.display = "block";
		});
		__bindEditable("drop", function (e) {
			if (!dragSourceBlock || !dropTargetBlock) return;
			e.preventDefault();
			if (dropBefore) editable.insertBefore(dragSourceBlock, dropTargetBlock);
			else editable.insertBefore(dragSourceBlock, dropTargetBlock.nextSibling);
			dragSourceBlock = null;
			dropTargetBlock = null;
			if (indicator) indicator.style.display = "none";
			if (handle) handle.classList.remove("rte-block-drag-handle-visible");
			__SetTimeout_HandleSelectionChange();
		});
	}
	// Block drag handle init runs after iframe / listeners are wired — see
	// below (we just defined __InitBlockDragHandles up here via hoisting).


	var disposehandlers = [];

	function __SetEditorFocusState(isFocused) {
		container.classList.toggle("rte-is-focused", !!isFocused);
		container.classList.toggle("rte-is-blurred", !isFocused);
	}

	// Build the editor shell and attach it to the source element.

	var toolbarDesktop = __Append(container, "rte-toolbar", "display:flex;flex-direction:row;flex-wrap:wrap;", "rte-toolbar-desktop");
	var toolbarMobile = __Append(container, "rte-toolbar", "display:flex;flex-direction:row;flex-wrap:wrap;", "rte-toolbar-mobile");

	var subtoolbar = __Append(container, "rte-subtoolbar", "flex-direction:row;flex-wrap:wrap;display:none");
	__Bind_ActionContainerKeyboard(toolbarDesktop, { role: "toolbar", orientation: "horizontal", label: "Editor toolbar" });
	__Bind_ActionContainerKeyboard(toolbarMobile, { role: "toolbar", orientation: "horizontal", label: "Editor toolbar" });
	__Bind_ActionContainerKeyboard(subtoolbar, { role: "toolbar", orientation: "horizontal", label: "Editor subtoolbar" });

	var precontent = __Append(container, "rte-precontent", "position:relative;height:0px;");
	var rtecontent = __Append(container, "rte-content", "display:flex;flex-direction:column;flex:99;position:relative;overflow-y:auto;min-height:0");

	var rtebottom = __Append(container, "rte-bottom", "display:flex;");

	var plusbtn = __Append(rtebottom, "rte-plusbtn", "display:flex;");

	if (!config.showPlusButton)
		plusbtn.style.display = 'none';


	var taglist = __Append(rtebottom, "rte-taglist", "display:flex;flex-wrap:wrap");
	if (!config.showTagList)
		taglist.style.display = 'none';

	__Append(rtebottom, "rte-space-hor", "display:flex;flex:99");

	var textcounter = __Append(rtebottom, "rte-textcounter", "display:flex;align-items:center;white-space:nowrap");
	if (!config.showStatistics)
		textcounter.style.display = 'none';

	function __NormalizeStatisticsText(value) {
		return String(value || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
	}
	function __GetStatisticsCounters() {
		var raw = config.statisticsCounters;
		if (raw == null || raw === "")
			raw = "words,characters";
		if (raw === false || raw === "none")
			return [];

		var items = Array.isArray(raw) ? raw : String(raw).split(",");
		var normalized = [];
		for (var i = 0; i < items.length; i++) {
			var token = String(items[i] || "").toLowerCase().replace(/^\s+|\s+$/g, "");
			if (!token || token === "none")
				continue;
			if (token === "chars")
				token = "characters";
			if ((token === "words" || token === "characters") && normalized.indexOf(token) === -1)
				normalized.push(token);
		}
		return normalized;
	}
	function __CollectTextStatistics() {
		var text = editable && typeof editable.innerText === "string" ? editable.innerText : "";
		var normalizedText = __NormalizeStatisticsText(text);
		return {
			words: normalizedText ? normalizedText.split(" ").length : 0,
			characters: text.length
		};
	}
	function __RenderTextStatistics() {
		var counters = __GetStatisticsCounters();
		if (!config.showStatistics || counters.length === 0) {
			textcounter.innerText = "";
			return;
		}

		var stats = __CollectTextStatistics();
		var parts = [];
		for (var i = 0; i < counters.length; i++) {
			var key = counters[i];
			parts.push(__GetLangText(key === "words" ? "Words" : "Characters") + ": " + stats[key]);
		}
		// 2026-05-11 Word-count goal indicator. When config.wordCountGoal is a
		// positive number, append "N / goal (X%)" to the status bar. Useful for
		// blog drafting / essay submissions.
		if (config.wordCountGoal && config.wordCountGoal > 0) {
			var pct = Math.min(100, Math.round((stats.words / config.wordCountGoal) * 100));
			parts.push(stats.words + " / " + config.wordCountGoal + " (" + pct + "%)");
		}
		textcounter.innerText = parts.join(" | ");
	}

	var powerbystyle = "color:#999999!important;overflow-x:visible!important;overflow-y:visible!important;font-size:12px!important;line-height:16px!important;display:flex!important;flex-direction:row!important;align-items:center;";
	var powerby = __Append(rtebottom, "rte-powerby", powerbystyle);
	powerby.innerHTML = "<a href='https://richtexteditor.com/?go=RTE' target=_blank style='" + powerbystyle + "'>richtexteditor</a>";


	var __editorresizemode = config.editorResizeMode;
	switch (__editorresizemode) {
		case "both":
		case "height":
			var resizecorner = __Append(rtebottom, "rte-resizecorner", "");
			resizecorner.onmousedown = resizecorner.ontouchstart = function (e) {
				var sw = container.offsetWidth;
				var sh = container.offsetHeight;
				startmousedrag(e, function (x, y, type) {
					if (__editorresizemode == "both")
						container.style.width = sw + x + "px";
					container.style.height = container.style.maxHeight = sh + y + "px";
				});
			}
			break;
		case "none":
		default:
			break;
	}


	//var btnaddsomething = __Append(bottom, "button");
	//btnaddsomething.innerText = "+";
	//btnaddsomething.onclick = function (event) { event.preventDefault(); }

	var editarea;
	var editable, editdoc, editwin, editsel;


	var iframe = null;
	var iframewinfocused = null;//===null ===true ===false

	var lastiframeheight = 0;


	//if (config.useIframe) {
	//content.style.display = 'block';
	iframe = __Append(rtecontent, "iframe", "flex:99;width:100%;min-height:100%;border:0px;", "rte-editable");
	iframe.contentDocument.open("text/html");
	iframe.contentDocument.write("<html><head><link id='url-css-content' rel='stylesheet'/></head><body></body></html>")
	iframe.contentDocument.close();
	iframe.contentDocument.designMode = "ON";
	editwin = iframe.contentWindow;
	editdoc = iframe.contentDocument;
	editable = editdoc.body;

	// 2026-05-11: Track every listener bound to the iframe doc/body/window so
	// we can re-attach them when Chrome swaps the iframe document. Otherwise
	// critical handlers (mousedown→__SelectControl, selectionchange→SelectionUI,
	// drop/paste/keydown, etc.) stay on the detached old document and the
	// editor silently loses click-to-select, range tracking, paste, drag, etc.
	var __iframeListeners = []; // {target: "doc"|"body"|"win", type, fn, capture}
	function __bindEditdoc(type, fn, capture) {
		__iframeListeners.push({ target: "doc", type: type, fn: fn, capture: capture });
		editdoc.addEventListener(type, fn, capture);
	}
	function __bindEditable(type, fn, capture) {
		__iframeListeners.push({ target: "body", type: type, fn: fn, capture: capture });
		editable.addEventListener(type, fn, capture);
	}
	function __bindEditwin(type, fn, capture) {
		__iframeListeners.push({ target: "win", type: type, fn: fn, capture: capture });
		editwin.addEventListener(type, fn, capture);
	}
	function __rebindAllIframeListeners() {
		for (var i = 0; i < __iframeListeners.length; i++) {
			var L = __iframeListeners[i];
			try {
				var tgt = L.target === "doc" ? editdoc : (L.target === "body" ? editable : editwin);
				if (tgt && tgt.addEventListener) tgt.addEventListener(L.type, L.fn, L.capture);
			} catch (e) { /* ignore */ }
		}
	}

	// 2026-05-11 Chrome regression on complex pages: after document.write() +
	// close() on a freshly-created iframe, Chrome fires a deferred about:blank
	// load that REPLACES the iframe.contentDocument with a new empty one,
	// dropping designMode and the body we just wrote. Closure vars still point
	// to the stale document, so the editor silently becomes non-editable
	// (designMode=off on the visible iframe). Listen for the load event and
	// reseat the closure refs + reapply designMode on the live document.
	iframe.addEventListener("load", function () {
		try {
			var liveDoc = iframe.contentDocument;
			if (liveDoc && liveDoc !== editdoc) {
				// Chrome replaced the document. Rewrite the head/body skeleton
				// and reseat closure refs.
				if (!liveDoc.querySelector("link#url-css-content")) {
					var head = liveDoc.head || liveDoc.getElementsByTagName("head")[0];
					if (head) {
						var link = liveDoc.createElement("link");
						link.id = "url-css-content";
						link.rel = "stylesheet";
						head.appendChild(link);
					}
				}
				editwin = iframe.contentWindow;
				editdoc = liveDoc;
				editable = liveDoc.body;
				try { editsel = editdoc.getSelection(); } catch (e) { /* ignore */ }
				try { editor.selection = editsel; } catch (e) { /* ignore */ }
				try { editor.document = editdoc; } catch (e) { /* ignore */ }
				if (editable && !editable.innerHTML) editable.innerHTML = "<p><br></p>";
				try { __EnsureEditorContentStyles(editdoc); } catch (e) { /* ignore */ }
				// Re-attach EVERY listener that was registered to the previous
				// editdoc/editable/editwin so click-to-select, paste, drag,
				// keypress, selectionchange, etc. all work on the live doc.
				try { __rebindAllIframeListeners(); } catch (e) { /* ignore */ }
			}
			if (editdoc.designMode !== "on") editdoc.designMode = "On";
		} catch (e) { /* ignore */ }
	});

	if (document.baseURI) {
		__Append(editdoc.querySelector("head"), "base").setAttribute("href", document.baseURI)
	}

	if (config.editorBodyCssClass) {
		editable.className = config.editorBodyCssClass;
	}
	if (config.editorBodyCssText) {
		editable.style.cssText = config.editorBodyCssText;
	}


	editable.style.overflowY = "hidden";

	// 2026-05-11 spellcheck toggle — true by default. Set config.spellcheck = false
	// to suppress the browser's wavy underline / right-click suggestions.
	if (config.spellcheck === false) {
		editable.setAttribute("spellcheck", "false");
	} else {
		editable.setAttribute("spellcheck", "true");
	}

	// 2026-05-11: inject default editor-content styles into the iframe document.
	// Without these, freshly inserted tables render at 6px wide (no borders,
	// empty cells collapse), making them effectively invisible until the user
	// types content. Also gives toggleborder mode something to show.
	// 2026-05-19 "Copy link to heading" UX: when user hovers over an h1-h6,
	// show a small inline 🔗 icon that copies `window.location + #slug` to
	// clipboard. Disable via `config.copyHeadingLink = false`. The icon is
	// styled via __EnsureEditorContentStyles below so it shares the iframe's
	// stylesheet lifecycle.
	function __InitCopyHeadingLink() {
		if (config.copyHeadingLink === false) return;
		var doc = editdoc;
		if (!doc) return;
		// Use event delegation on the body — works after heading anchors
		// regenerate and survives iframe-swap recovery.
		function copyLinkFor(heading) {
			if (!heading || !heading.id) return false;
			var pageUrl = "";
			try { pageUrl = window.location.href.split("#")[0]; } catch (e) {}
			var url = pageUrl + "#" + heading.id;
			try {
				if (navigator.clipboard && navigator.clipboard.writeText) {
					navigator.clipboard.writeText(url);
				} else {
					var ta = doc.createElement("textarea");
					ta.value = url;
					doc.body.appendChild(ta);
					ta.select();
					try { doc.execCommand("copy"); } catch (e) {}
					doc.body.removeChild(ta);
				}
				// Visual feedback: briefly flash the heading.
				heading.classList.add("rte-heading-link-copied");
				setTimeout(function () { heading.classList.remove("rte-heading-link-copied"); }, 900);
				return true;
			} catch (e) { return false; }
		}
		__bindEditable("click", function (e) {
			var t = e.target;
			if (!t || !t.classList || !t.classList.contains("rte-heading-link-btn")) return;
			e.preventDefault();
			e.stopPropagation();
			var h = t.closest && t.closest("h1,h2,h3,h4,h5,h6");
			if (h) copyLinkFor(h);
		});
		// Inject the heading-link CSS into the iframe content stylesheet.
		var s = doc.createElement("style");
		s.id = "__rte_heading_link_styles";
		s.textContent = [
			"h1, h2, h3, h4, h5, h6 { position: relative; }",
			"h1[id]:hover .rte-heading-link-btn, h2[id]:hover .rte-heading-link-btn, h3[id]:hover .rte-heading-link-btn, h4[id]:hover .rte-heading-link-btn, h5[id]:hover .rte-heading-link-btn, h6[id]:hover .rte-heading-link-btn { opacity: 0.6 }",
			".rte-heading-link-btn { opacity: 0; display: inline-block; margin-left: 6px; padding: 0 4px; font-size: 0.75em; cursor: pointer; user-select: none; vertical-align: middle; transition: opacity 120ms; }",
			".rte-heading-link-btn:hover { opacity: 1 !important; }",
			".rte-heading-link-copied { background: rgba(34,197,94,.10); transition: background 600ms; }"
		].join("\n");
		if (doc.head && !doc.getElementById("__rte_heading_link_styles")) doc.head.appendChild(s);
		// Augment headings whenever __ApplyHeadingAnchors runs.
		var origApplyAnchors = __ApplyHeadingAnchors;
		__ApplyHeadingAnchors = function () {
			origApplyAnchors();
			try {
				var hs = editable.querySelectorAll("h1,h2,h3,h4,h5,h6");
				for (var i = 0; i < hs.length; i++) {
					var h = hs[i];
					if (!h.id) continue;
					if (h.querySelector(".rte-heading-link-btn")) continue;
					var btn = doc.createElement("span");
					btn.className = "rte-heading-link-btn";
					btn.setAttribute("contenteditable", "false");
					btn.setAttribute("title", "Copy link");
					btn.textContent = "🔗";
					h.appendChild(btn);
				}
			} catch (e) { /* ignore */ }
		};
	}

	function __EnsureEditorContentStyles(doc) {
		if (!doc || doc.getElementById("__rte_default_styles")) return;
		var s = doc.createElement("style");
		s.id = "__rte_default_styles";
		var altRule = config.altTextHint === false ? "" :
			"img:not([alt]), img[alt='']{outline:2px dashed #f59e0b;outline-offset:1px}";
		s.textContent = [
			"body { margin: 8px; font-family: -apple-system, Helvetica, Arial, sans-serif; }",
			// Always show table outlines while editing so empty tables don't vanish.
			"table { border-collapse: collapse; min-width: 60px; }",
			"table, table td, table th { border: 1px solid #c8d2e0; }",
			"table td, table th { min-width: 24px; min-height: 22px; padding: 4px 6px; vertical-align: top; }",
			// In toggleborder mode bump the outline so it stays visible in dark themes too.
			"body.rte-toggleborder table, body.rte-toggleborder table td, body.rte-toggleborder table th { border-color: #6b7c93; border-style: dotted; }",
			// Images inside the editor get a faint outline so they're easy to click/select.
			"img { max-width: 100%; }",
			// 2026-05-11 a11y nudge: dashed amber outline on <img> missing alt text.
			altRule,
			"p, div { min-height: 1em; }",
			// 2026-05-19 Smart-find live highlight + inline math markup
			"mark.rte-find-hit { background: rgba(250,204,21,.6); border-radius: 2px; padding: 0 2px; }",
			".rte-math-inline { background: rgba(99,102,241,.10); border-radius: 3px; padding: 0 3px; font-family: 'Latin Modern Math',Cambria Math,STIX,serif; color: #4338ca; cursor: text; }"
		].join("\n");
		(doc.head || doc.getElementsByTagName("head")[0]).appendChild(s);
	}
	__EnsureEditorContentStyles(editdoc);

	if (config.blockDragHandles) {
		try { __InitBlockDragHandles(); } catch (e) { /* ignore */ }
	}

	try { __InitCopyHeadingLink(); } catch (e) { /* ignore */ }

	// === 2026-05-19 Batch: alt-editor, context-menu, column-resize, print, reading mode ===

	// (1) Inline alt-text editor: clicking the amber outline on an alt-less <img>
	// opens a small popup with a text input. Submitting sets alt + hides outline.
	function __InitAltTextInlineEditor() {
		if (config.altTextHint === false) return;
		__bindEditable("click", function (e) {
			var t = e.target;
			if (!t || t.nodeName !== "IMG") return;
			var alt = t.getAttribute("alt");
			if (alt && alt.length > 0) return;
			e.preventDefault();
			__OpenAltTextEditor(t);
		});
	}
	function __OpenAltTextEditor(img) {
		// Close any existing editor first.
		var existing = document.querySelector(".rte-alt-editor-popup");
		if (existing) existing.parentNode.removeChild(existing);
		var rect = img.getBoundingClientRect();
		var ifrRect = iframe.getBoundingClientRect();
		var popup = document.createElement("div");
		popup.className = "rte-alt-editor-popup";
		popup.style.cssText = "position:fixed;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 12px 36px rgba(15,23,42,.22);padding:10px;z-index:" + (config.zIndexDialog || 99999) + ";font:13px -apple-system,Segoe UI,sans-serif;display:flex;gap:8px;align-items:center;";
		popup.style.left = (ifrRect.left + rect.left) + "px";
		popup.style.top = (ifrRect.top + rect.bottom + 6) + "px";
		var label = document.createElement("label");
		label.textContent = "Alt text:";
		label.style.cssText = "color:#475569;font-weight:500;";
		popup.appendChild(label);
		var input = document.createElement("input");
		input.type = "text";
		input.placeholder = "Describe the image…";
		input.style.cssText = "border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;width:240px;font:inherit;";
		popup.appendChild(input);
		var btn = document.createElement("button");
		btn.textContent = "Save";
		btn.style.cssText = "background:#1d67ba;color:#fff;border:0;border-radius:6px;padding:6px 14px;font:inherit;cursor:pointer;";
		popup.appendChild(btn);
		document.body.appendChild(popup);
		setTimeout(function () { input.focus(); }, 0);
		function save() {
			img.setAttribute("alt", input.value);
			cleanup();
		}
		function cleanup() {
			if (popup.parentNode) popup.parentNode.removeChild(popup);
			document.removeEventListener("mousedown", outsideClick, true);
		}
		function outsideClick(e) { if (!popup.contains(e.target)) cleanup(); }
		btn.onclick = save;
		input.onkeydown = function (e) {
			if (e.key === "Enter") { e.preventDefault(); save(); }
			else if (e.key === "Escape") { cleanup(); }
		};
		setTimeout(function () { document.addEventListener("mousedown", outsideClick, true); }, 50);
	}
	try { __InitAltTextInlineEditor(); } catch (e) { /* ignore */ }

	// === (1) Image hover quick-action bar — small floating chips when mouse
	// is over an <img> without it being selected. Shows: alt / replace / delete.
	function __InitImageHoverQuickBar() {
		if (config.imageHoverQuickBar === false) return;
		var bar = null, hoverImg = null, hideTid = 0;
		function ensureBar() {
			if (bar && bar.isConnected) return bar;
			bar = document.createElement("div");
			bar.className = "rte-image-quickbar";
			bar.style.cssText = "position:fixed;background:#0f172a;color:#f8fafc;border-radius:8px;padding:4px;display:none;gap:2px;font:12px -apple-system,Segoe UI,sans-serif;z-index:" + (config.zIndexFloat || 9998) + ";box-shadow:0 6px 16px rgba(15,23,42,.28);";
			bar.style.display = "none";
			document.body.appendChild(bar);
			bar.onmouseenter = function () { clearTimeout(hideTid); };
			bar.onmouseleave = scheduleHide;
			return bar;
		}
		function scheduleHide() {
			clearTimeout(hideTid);
			hideTid = setTimeout(function () { if (bar) bar.style.display = "none"; hoverImg = null; }, 200);
		}
		function makeBtn(label, onclick) {
			var b = document.createElement("button");
			b.textContent = label;
			b.style.cssText = "background:transparent;color:inherit;border:0;padding:4px 10px;cursor:pointer;font:inherit;border-radius:6px;";
			b.onmouseenter = function () { b.style.background = "rgba(255,255,255,.10)"; };
			b.onmouseleave = function () { b.style.background = "transparent"; };
			b.onmousedown = function (e) { e.preventDefault(); onclick(); };
			return b;
		}
		function show(img) {
			ensureBar();
			hoverImg = img;
			while (bar.firstChild) bar.removeChild(bar.firstChild);
			bar.appendChild(makeBtn("Alt", function () { __OpenAltTextEditor(img); }));
			bar.appendChild(makeBtn("Replace", function () {
				var input = document.createElement("input");
				input.type = "file";
				input.accept = "image/*";
				input.onchange = function () {
					var f = input.files && input.files[0];
					if (!f) return;
					var reader = new FileReader();
					reader.onload = function () { img.src = reader.result; };
					reader.readAsDataURL(f);
				};
				input.click();
			}));
			bar.appendChild(makeBtn("✕", function () { img.parentNode.removeChild(img); bar.style.display = "none"; }));
			var rect = img.getBoundingClientRect();
			var ifrRect = iframe.getBoundingClientRect();
			bar.style.left = (ifrRect.left + rect.left) + "px";
			bar.style.top = (ifrRect.top + rect.top - 36) + "px";
			bar.style.display = "flex";
			clearTimeout(hideTid);
		}
		__bindEditable("mouseover", function (e) {
			if (e.target && e.target.nodeName === "IMG") show(e.target);
		});
		__bindEditable("mouseout", function (e) {
			if (e.target && e.target.nodeName === "IMG") scheduleHide();
		});
	}
	try { __InitImageHoverQuickBar(); } catch (e) { /* ignore */ }

	// === (2) Smart-find live highlight + match count.
	// Wraps text matches in <mark class="rte-find-hit"> as you type into the
	// find dialog; shows N of M counter; navigation jumps to highlighted match.
	editor.findHighlight = function (query, options) {
		options = options || {};
		__ClearFindHighlights();
		if (!query) return { matches: 0 };
		var caseSensitive = !!options.caseSensitive;
		var flags = caseSensitive ? "g" : "gi";
		var re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
		var matches = 0;
		var walker = editdoc.createTreeWalker(editable, NodeFilter.SHOW_TEXT, null);
		var textNodes = [];
		var n;
		while ((n = walker.nextNode())) {
			if (n.parentNode && (n.parentNode.nodeName === "MARK" || n.parentNode.nodeName === "STYLE" || n.parentNode.nodeName === "SCRIPT")) continue;
			textNodes.push(n);
		}
		for (var i = 0; i < textNodes.length; i++) {
			var tn = textNodes[i];
			var text = tn.data;
			if (!re.test(text)) { re.lastIndex = 0; continue; }
			re.lastIndex = 0;
			var pieces = [];
			var lastIndex = 0, m;
			while ((m = re.exec(text))) {
				pieces.push(editdoc.createTextNode(text.substring(lastIndex, m.index)));
				var mark = editdoc.createElement("mark");
				mark.className = "rte-find-hit";
				mark.appendChild(editdoc.createTextNode(m[0]));
				pieces.push(mark);
				lastIndex = m.index + m[0].length;
				matches++;
				if (m[0].length === 0) re.lastIndex++;
			}
			pieces.push(editdoc.createTextNode(text.substring(lastIndex)));
			var parent = tn.parentNode;
			for (var j = 0; j < pieces.length; j++) parent.insertBefore(pieces[j], tn);
			parent.removeChild(tn);
		}
		return { matches: matches };
	};
	editor.clearFindHighlights = function () { __ClearFindHighlights(); };
	function __ClearFindHighlights() {
		if (!editable) return;
		var marks = editable.querySelectorAll("mark.rte-find-hit");
		for (var i = 0; i < marks.length; i++) {
			var mk = marks[i];
			var parent = mk.parentNode;
			while (mk.firstChild) parent.insertBefore(mk.firstChild, mk);
			parent.removeChild(mk);
		}
		// Coalesce adjacent text nodes that the walker split.
		if (editable.normalize) editable.normalize();
	}

	// === (3) Inline math markup — wrap $...$ in a span so customers can hook
	// it up to MathJax / KaTeX at render time. We don't bundle a renderer; we
	// just provide stable markup the customer can target.
	editor.applyMathMarkup = function () {
		if (config.inlineMath === false) return 0;
		if (!editable) return 0;
		var walker = editdoc.createTreeWalker(editable, NodeFilter.SHOW_TEXT, null);
		var hits = 0;
		var textNodes = [];
		var n;
		while ((n = walker.nextNode())) {
			if (n.parentNode && (n.parentNode.nodeName === "CODE" || n.parentNode.nodeName === "PRE" || n.parentNode.classList && n.parentNode.classList.contains("rte-math-inline"))) continue;
			textNodes.push(n);
		}
		var re = /\$([^$\n]+?)\$/g;
		for (var i = 0; i < textNodes.length; i++) {
			var tn = textNodes[i];
			var text = tn.data;
			if (!re.test(text)) { re.lastIndex = 0; continue; }
			re.lastIndex = 0;
			var pieces = [];
			var lastIndex = 0, m;
			while ((m = re.exec(text))) {
				pieces.push(editdoc.createTextNode(text.substring(lastIndex, m.index)));
				var span = editdoc.createElement("span");
				span.className = "rte-math-inline";
				span.setAttribute("data-tex", m[1]);
				span.textContent = m[0];
				pieces.push(span);
				lastIndex = m.index + m[0].length;
				hits++;
			}
			pieces.push(editdoc.createTextNode(text.substring(lastIndex)));
			var parent = tn.parentNode;
			for (var j = 0; j < pieces.length; j++) parent.insertBefore(pieces[j], tn);
			parent.removeChild(tn);
		}
		return hits;
	};

	// === (4) Multi-cursor stub — true multi-cursor inside contentEditable is
	// browser-unsupported, but we expose a Smart-Select-All-Occurrences helper
	// that's commonly mistaken for it: select the word at the caret, then
	// programmatically wrap every other occurrence in <mark class="rte-occurrence">
	// so subsequent commands (bold, color, etc.) operate on all of them via the
	// AI Toolkit / find-replace path.
	editor.markAllOccurrencesOfSelection = function () {
		if (!editsel || editsel.rangeCount === 0 || editsel.isCollapsed) return 0;
		var q = editsel.toString();
		if (!q) return 0;
		var result = editor.findHighlight(q);
		return result.matches;
	};

	// === Find/Replace dialog upgrade — uses live findHighlight + count badge.
	// Opens a small floating dialog. Use editor.openFindDialog() to invoke.
	editor.openFindDialog = function () { __OpenFindReplaceDialog(); };
	function __OpenFindReplaceDialog() {
		var existing = document.querySelector(".rte-find-replace-dialog");
		if (existing) { existing.parentNode.removeChild(existing); }
		var dlg = document.createElement("div");
		dlg.className = "rte-find-replace-dialog";
		dlg.style.cssText = "position:fixed;top:80px;right:24px;background:#fff;border:1px solid #cbd5e1;border-radius:10px;box-shadow:0 16px 40px rgba(15,23,42,.22);padding:12px;width:320px;z-index:" + (config.zIndexDialog || 99999) + ";font:13px -apple-system,Segoe UI,sans-serif;";
		dlg.innerHTML =
			'<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">'
			+ '<input class="rte-find-q" placeholder="Find" style="flex:1;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;">'
			+ '<span class="rte-find-count" style="font-size:11px;color:#64748b;white-space:nowrap;">0 matches</span>'
			+ '</div>'
			+ '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">'
			+ '<input class="rte-find-r" placeholder="Replace with" style="flex:1;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;">'
			+ '</div>'
			+ '<div style="display:flex;gap:6px;">'
			+ '<button class="rte-find-prev" style="padding:6px 10px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;cursor:pointer;font:inherit;">↑ Prev</button>'
			+ '<button class="rte-find-next" style="padding:6px 10px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;cursor:pointer;font:inherit;">↓ Next</button>'
			+ '<button class="rte-find-replace-one" style="padding:6px 10px;border:1px solid #cbd5e1;background:#fff;border-radius:6px;cursor:pointer;font:inherit;">Replace</button>'
			+ '<button class="rte-find-replace-all" style="padding:6px 10px;border:1px solid #1d67ba;background:#1d67ba;color:#fff;border-radius:6px;cursor:pointer;font:inherit;margin-left:auto;">Replace all</button>'
			+ '</div>'
			+ '<button class="rte-find-close" style="position:absolute;top:8px;right:8px;background:transparent;border:0;color:#64748b;cursor:pointer;font-size:16px;width:24px;height:24px;border-radius:4px;">×</button>';
		document.body.appendChild(dlg);
		var qInput = dlg.querySelector(".rte-find-q");
		var rInput = dlg.querySelector(".rte-find-r");
		var countEl = dlg.querySelector(".rte-find-count");
		var current = 0;
		function refreshCount(matches) {
			if (matches === 0) { countEl.textContent = "0 matches"; current = 0; return; }
			countEl.textContent = (current + 1) + " of " + matches;
		}
		function run() {
			var q = qInput.value;
			var r = editor.findHighlight(q);
			current = 0;
			refreshCount(r.matches);
			if (r.matches > 0) scrollToCurrent();
		}
		function scrollToCurrent() {
			var hits = editable.querySelectorAll("mark.rte-find-hit");
			if (!hits.length) return;
			hits.forEach(function (h) { h.style.background = ""; });
			var hit = hits[current];
			if (!hit) return;
			hit.style.background = "rgba(245,158,11,.8)";
			hit.scrollIntoView({ block: "center", behavior: "smooth" });
		}
		qInput.addEventListener("input", run);
		dlg.querySelector(".rte-find-next").onclick = function () {
			var hits = editable.querySelectorAll("mark.rte-find-hit");
			if (!hits.length) return;
			current = (current + 1) % hits.length;
			refreshCount(hits.length);
			scrollToCurrent();
		};
		dlg.querySelector(".rte-find-prev").onclick = function () {
			var hits = editable.querySelectorAll("mark.rte-find-hit");
			if (!hits.length) return;
			current = (current - 1 + hits.length) % hits.length;
			refreshCount(hits.length);
			scrollToCurrent();
		};
		dlg.querySelector(".rte-find-replace-one").onclick = function () {
			var hits = editable.querySelectorAll("mark.rte-find-hit");
			if (!hits.length) return;
			var hit = hits[current];
			if (!hit) return;
			var txt = editdoc.createTextNode(rInput.value || "");
			hit.parentNode.replaceChild(txt, hit);
			run();
		};
		dlg.querySelector(".rte-find-replace-all").onclick = function () {
			var hits = editable.querySelectorAll("mark.rte-find-hit");
			for (var i = 0; i < hits.length; i++) {
				var hit = hits[i];
				var txt = editdoc.createTextNode(rInput.value || "");
				hit.parentNode.replaceChild(txt, hit);
			}
			run();
		};
		dlg.querySelector(".rte-find-close").onclick = function () {
			editor.clearFindHighlights();
			if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
		};
		setTimeout(function () { qInput.focus(); }, 0);
	}

	// === Math renderer hook — detect KaTeX or MathJax on the host page and
	// call it to render every <span class="rte-math-inline"> after markup pass.
	editor.renderMath = function () {
		editor.applyMathMarkup();
		var spans = editable.querySelectorAll(".rte-math-inline");
		if (!spans.length) return 0;
		// Try KaTeX first.
		var katex = (window.katex || (window.parent && window.parent.katex));
		if (katex && typeof katex.render === "function") {
			for (var i = 0; i < spans.length; i++) {
				try {
					var tex = spans[i].getAttribute("data-tex") || "";
					katex.render(tex, spans[i], { throwOnError: false });
				} catch (e) { /* ignore */ }
			}
			return spans.length;
		}
		// Then MathJax v3+.
		var MathJax = (window.MathJax || (window.parent && window.parent.MathJax));
		if (MathJax && MathJax.typesetPromise) {
			try { MathJax.typesetPromise(Array.from(spans)); } catch (e) {}
			return spans.length;
		}
		// Neither available — leave the markup intact.
		return spans.length;
	};

	// === editor.exportPdf() — opens the print dialog scoped to the editor's
	// HTML in a new tab; the user picks "Save as PDF" as their destination.
	// Browser-native; no PDF library needed.
	editor.exportPdf = function (options) {
		options = options || {};
		var html = __GetHTMLCode();
		var title = options.title || (typeof document !== "undefined" ? document.title : "") || "document";
		var w = window.open("", "_blank", "width=900,height=1100");
		if (!w) return false;
		w.document.write(
			"<!DOCTYPE html><html><head><title>" + (title || "").replace(/</g, "&lt;") + "</title>"
			+ "<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:32px;max-width:8.5in;margin:0 auto;line-height:1.5}img{max-width:100%}table{border-collapse:collapse;width:100%}table,td,th{border:1px solid #c8d2e0;padding:6px 10px}h1,h2,h3,h4,h5,h6{page-break-after:avoid}@media print{body{padding:0;margin:0}}</style>"
			+ "</head><body>" + html + "<script>setTimeout(function(){window.print()},300)<\/script></body></html>"
		);
		w.document.close();
		return true;
	};

	// === Collab presence cursor polish — when editor.collab is wired (Yjs),
	// remote-cursor labels fade in/out and animate on idle. Pure CSS injection
	// so it works whether or not the collab plugin is loaded.
	(function () {
		if (!editdoc || editdoc.getElementById("__rte_collab_cursor_styles")) return;
		var s = editdoc.createElement("style");
		s.id = "__rte_collab_cursor_styles";
		s.textContent = [
			".rte-collab-cursor{position:absolute;width:2px;animation:rte-cursor-blink 1.05s steps(1) infinite;pointer-events:none;z-index:2147483600}",
			".rte-collab-cursor-label{position:absolute;top:-18px;left:0;font:11px -apple-system,Segoe UI,sans-serif;color:#fff;background:currentColor;padding:1px 6px;border-radius:4px;opacity:0.85;white-space:nowrap;transition:opacity 220ms;pointer-events:none}",
			".rte-collab-cursor-label.idle{opacity:0.0}",
			"@keyframes rte-cursor-blink{50%{opacity:0}}"
		].join("\n");
		(editdoc.head || editdoc.getElementsByTagName("head")[0]).appendChild(s);
	})();

	// === Dictation polish — when editor.dictation is wired, fire change
	// events while text streams in so autosave + statistics update live.
	(function () {
		if (!editor.dictation) return;
		var orig = editor.dictation.onResult;
		if (typeof orig !== "function") return;
		editor.dictation.onResult = function () {
			try { orig.apply(this, arguments); } catch (e) {}
			try { InvokeEventHook && InvokeEventHook("change"); } catch (e) {}
		};
	})();

	// === (5) Backspace at column 0 of a blockquote → exit the blockquote.
	// Companion to the existing "Enter on empty blockquote exits" behavior.
	function __BackspaceExitBlockquote() {
		if (!editsel || editsel.rangeCount === 0 || !editsel.isCollapsed) return false;
		if (editsel.anchorOffset !== 0) return false;
		var n = editsel.anchorNode;
		if (!n) return false;
		var atStart = true;
		var cur = n;
		while (cur && cur !== editable && cur.nodeName !== "BLOCKQUOTE") {
			if (cur.previousSibling && (cur.previousSibling.nodeType === 1 || (cur.previousSibling.nodeType === 3 && cur.previousSibling.data))) {
				atStart = false; break;
			}
			cur = cur.parentNode;
		}
		if (!atStart || !cur || cur.nodeName !== "BLOCKQUOTE") return false;
		// Move all of blockquote's children out (siblings of the blockquote), drop the bq.
		var bq = cur;
		var parent = bq.parentNode;
		while (bq.firstChild) parent.insertBefore(bq.firstChild, bq);
		parent.removeChild(bq);
		__SetTimeout_HandleSelectionChange();
		return true;
	}

	// (2) Right-click context menu — adds "Ask AI" actions when text is selected
	// and the AI Toolkit plugin is wired. Other native context-menu items keep
	// working (browser provides spell-check etc. via its own menu).
	function __InitAiContextMenu() {
		if (config.aiContextMenu === false) return;
		__bindEditable("contextmenu", function (e) {
			if (!editor.aiToolkit || !editor.aiToolkit.openDialog) return;
			var selText = "";
			try { selText = editsel.toString(); } catch (er) {}
			if (!selText || selText.length < 3) return; // no menu for unselected text
			e.preventDefault();
			__ShowAiContextMenu(e.clientX + iframe.getBoundingClientRect().left, e.clientY + iframe.getBoundingClientRect().top);
		});
	}
	function __ShowAiContextMenu(x, y) {
		var existing = document.querySelector(".rte-ai-context-menu");
		if (existing) existing.parentNode.removeChild(existing);
		var menu = document.createElement("div");
		menu.className = "rte-ai-context-menu";
		menu.style.cssText = "position:fixed;left:" + x + "px;top:" + y + "px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 12px 32px rgba(15,23,42,.22);padding:6px 0;z-index:" + (config.zIndexDialog || 99999) + ";font:13px -apple-system,Segoe UI,sans-serif;min-width:200px;";
		var items = [
			{ label: "✨ Ask AI to explain", action: "explain" },
			{ label: "✏️ Rewrite", action: "rewrite" },
			{ label: "📝 Summarize", action: "summarize" },
			{ label: "🌐 Translate", action: "translate" }
		];
		for (var i = 0; i < items.length; i++) {
			(function (it) {
				var row = document.createElement("div");
				row.style.cssText = "padding:8px 14px;cursor:pointer;color:#0f172a;";
				row.textContent = it.label;
				row.onmouseenter = function () { row.style.background = "#f1f5f9"; };
				row.onmouseleave = function () { row.style.background = ""; };
				row.onmousedown = function (ev) {
					ev.preventDefault();
					cleanup();
					try { editor.aiToolkit.openDialog({ mode: it.action }); } catch (er) { /* ignore */ }
				};
				menu.appendChild(row);
			})(items[i]);
		}
		document.body.appendChild(menu);
		function cleanup() {
			if (menu.parentNode) menu.parentNode.removeChild(menu);
			document.removeEventListener("mousedown", outsideClick, true);
		}
		function outsideClick(e) { if (!menu.contains(e.target)) cleanup(); }
		setTimeout(function () { document.addEventListener("mousedown", outsideClick, true); }, 50);
	}
	try { __InitAiContextMenu(); } catch (e) { /* ignore */ }

	// (3) Table column resize handles — when hovering near a column border
	// inside a <table>, show a draggable handle that resizes the column.
	function __InitTableColumnResize() {
		if (config.tableColumnResize === false) return;
		var resizing = null;  // { startX, startWidth, cell, table }
		var HANDLE_WIDTH = 6;
		__bindEditable("mousemove", function (e) {
			if (resizing) return; // active drag handled by mousemove on document
			var td = e.target && e.target.closest && e.target.closest("td,th");
			if (!td) return;
			var rect = td.getBoundingClientRect();
			var ifrRect = iframe.getBoundingClientRect();
			var localX = e.clientX;
			var rightEdge = rect.right - ifrRect.left;
			var fromRight = rect.right - localX;
			if (fromRight >= 0 && fromRight <= HANDLE_WIDTH) {
				editdoc.body.style.cursor = "col-resize";
				td.__rteResizeArmed = true;
			} else if (td.__rteResizeArmed) {
				editdoc.body.style.cursor = "";
				td.__rteResizeArmed = false;
			}
		});
		__bindEditable("mousedown", function (e) {
			var td = e.target && e.target.closest && e.target.closest("td,th");
			if (!td || !td.__rteResizeArmed) return;
			e.preventDefault();
			resizing = {
				startX: e.clientX,
				startWidth: td.getBoundingClientRect().width,
				cell: td,
				table: td.closest("table")
			};
			editdoc.body.style.cursor = "col-resize";
			editdoc.addEventListener("mousemove", onDrag, true);
			editdoc.addEventListener("mouseup", onEnd, true);
			document.addEventListener("mouseup", onEnd, true);
		});
		function onDrag(e) {
			if (!resizing) return;
			var dx = e.clientX - resizing.startX;
			var newWidth = Math.max(24, resizing.startWidth + dx);
			resizing.cell.style.width = newWidth + "px";
		}
		function onEnd() {
			if (!resizing) return;
			editdoc.removeEventListener("mousemove", onDrag, true);
			editdoc.removeEventListener("mouseup", onEnd, true);
			document.removeEventListener("mouseup", onEnd, true);
			editdoc.body.style.cursor = "";
			resizing = null;
			__SetTimeout_HandleSelectionChange();
		}
	}
	try { __InitTableColumnResize(); } catch (e) { /* ignore */ }

	// (3b) Table row resize handles — companion to column resize. Hover near
	// the bottom border of a <tr> to drag-resize the row height.
	function __InitTableRowResize() {
		if (config.tableRowResize === false) return;
		var rowDrag = null;
		var HANDLE = 6;
		__bindEditable("mousemove", function (e) {
			if (rowDrag) return;
			var tr = e.target && e.target.closest && e.target.closest("tr");
			if (!tr) return;
			var rect = tr.getBoundingClientRect();
			var fromBottom = rect.bottom - e.clientY;
			if (fromBottom >= 0 && fromBottom <= HANDLE) {
				editdoc.body.style.cursor = "row-resize";
				tr.__rteRowArmed = true;
			} else if (tr.__rteRowArmed) {
				// Only clear if the cell didn't also arm column-resize.
				if (editdoc.body.style.cursor === "row-resize") editdoc.body.style.cursor = "";
				tr.__rteRowArmed = false;
			}
		});
		__bindEditable("mousedown", function (e) {
			var tr = e.target && e.target.closest && e.target.closest("tr");
			if (!tr || !tr.__rteRowArmed) return;
			e.preventDefault();
			rowDrag = { startY: e.clientY, startHeight: tr.getBoundingClientRect().height, row: tr };
			editdoc.body.style.cursor = "row-resize";
			editdoc.addEventListener("mousemove", onRowDrag, true);
			editdoc.addEventListener("mouseup", onRowEnd, true);
			document.addEventListener("mouseup", onRowEnd, true);
		});
		function onRowDrag(e) {
			if (!rowDrag) return;
			var dy = e.clientY - rowDrag.startY;
			var newHeight = Math.max(20, rowDrag.startHeight + dy);
			rowDrag.row.style.height = newHeight + "px";
		}
		function onRowEnd() {
			if (!rowDrag) return;
			editdoc.removeEventListener("mousemove", onRowDrag, true);
			editdoc.removeEventListener("mouseup", onRowEnd, true);
			document.removeEventListener("mouseup", onRowEnd, true);
			editdoc.body.style.cursor = "";
			rowDrag = null;
			__SetTimeout_HandleSelectionChange();
		}
	}
	try { __InitTableRowResize(); } catch (e) { /* ignore */ }

	// Highlight (Ctrl+Shift+H) — wrap selection in <mark> for visible yellow background.
	function __ToggleHighlight() {
		if (!editsel || editsel.rangeCount === 0 || editsel.isCollapsed) return false;
		var range = editsel.getRangeAt(0);
		// If selection is already inside a <mark>, unwrap it.
		var anchor = editsel.anchorNode;
		var inMark = null;
		while (anchor && anchor !== editable) {
			if (anchor.nodeType === 1 && anchor.nodeName === "MARK") { inMark = anchor; break; }
			anchor = anchor.parentNode;
		}
		if (inMark) {
			var parent = inMark.parentNode;
			while (inMark.firstChild) parent.insertBefore(inMark.firstChild, inMark);
			parent.removeChild(inMark);
			__SetTimeout_HandleSelectionChange();
			return true;
		}
		var mark = editdoc.createElement("mark");
		try { range.surroundContents(mark); } catch (e) {
			var frag = range.extractContents();
			mark.appendChild(frag);
			range.insertNode(mark);
		}
		__SetTimeout_HandleSelectionChange();
		return true;
	}

	// Sort lines / paragraphs in the selection alphabetically (Ctrl+Shift+Alt+S).
	function __SortSelectedLines() {
		if (!editsel || editsel.rangeCount === 0) return false;
		var range = editsel.getRangeAt(0);
		// Collect every top-level block fully or partially within the selection.
		var blocks = [];
		var walker = editdoc.createTreeWalker(editable, NodeFilter.SHOW_ELEMENT, {
			acceptNode: function (n) {
				if (n.parentNode !== editable) return NodeFilter.FILTER_SKIP;
				if (range.intersectsNode && range.intersectsNode(n)) return NodeFilter.FILTER_ACCEPT;
				return NodeFilter.FILTER_SKIP;
			}
		});
		var cur;
		while ((cur = walker.nextNode())) blocks.push(cur);
		if (blocks.length < 2) return false;
		var sorted = blocks.slice().sort(function (a, b) {
			return (a.textContent || "").trim().toLowerCase().localeCompare((b.textContent || "").trim().toLowerCase());
		});
		// Replace in place — insert sorted before the first block, then remove originals.
		var parent = blocks[0].parentNode;
		var refNext = blocks[blocks.length - 1].nextSibling;
		for (var i = 0; i < blocks.length; i++) parent.removeChild(blocks[i]);
		for (var i = 0; i < sorted.length; i++) parent.insertBefore(sorted[i], refNext);
		__SetTimeout_HandleSelectionChange();
		return true;
	}

	// (4) Print preview — opens the editor's HTML in a new window for printing.
	// The iframe's content stylesheet + the host page's @media print rules apply.
	editor.printPreview = function () {
		try {
			var html = __GetHTMLCode();
			var w = window.open("", "_blank", "width=900,height=1100");
			if (!w) return false;
			w.document.write("<!DOCTYPE html><html><head><title>Print preview</title><style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:32px;max-width:8.5in;margin:0 auto;line-height:1.5}img{max-width:100%}table{border-collapse:collapse;width:100%}table,td,th{border:1px solid #c8d2e0;padding:6px 10px}</style></head><body>" + html + "<script>setTimeout(function(){window.print()},300)<\/script></body></html>");
			w.document.close();
			return true;
		} catch (e) { return false; }
	};

	// (5) Reading mode — toggle a class on container that hides toolbars + chrome,
	// leaving only the iframe content. Useful for distraction-free writing.
	// State is persisted to localStorage under config.readingModePersistenceKey
	// (default: derived from container.id) so it survives reloads.
	var __readingModeActive = false;
	var __readingModeStorageKey = (function () {
		if (config.readingModePersistenceKey === false) return null;
		if (typeof config.readingModePersistenceKey === "string") return config.readingModePersistenceKey;
		var idPart = (container && container.id) ? container.id : "rte";
		return "rte:readingmode:" + idPart;
	})();
	function __PersistReadingMode(state) {
		if (!__readingModeStorageKey) return;
		try { localStorage.setItem(__readingModeStorageKey, state ? "1" : "0"); } catch (e) {}
	}
	function __LoadReadingMode() {
		if (!__readingModeStorageKey) return null;
		try {
			var v = localStorage.getItem(__readingModeStorageKey);
			return v === "1" ? true : v === "0" ? false : null;
		} catch (e) { return null; }
	}
	editor.toggleReadingMode = function (state) {
		__readingModeActive = (typeof state === "boolean") ? state : !__readingModeActive;
		container.classList.toggle("rte-reading-mode", __readingModeActive);
		__PersistReadingMode(__readingModeActive);
		return __readingModeActive;
	};
	editor.isReadingMode = function () { return __readingModeActive; };
	// Restore persisted state on init.
	(function () {
		var persisted = __LoadReadingMode();
		if (persisted === true) editor.toggleReadingMode(true);
	})();

	// 2026-05-19 Auto-save with status. config.autoSave = {
	//   onSave: function(html) { return promise | undefined; }   // your save fn
	//   interval: 2000,    // ms debounce; default 2000
	//   indicator: true    // show status in the bottom bar (default true)
	// }
	function __InitAutoSave() {
		var as = config.autoSave;
		if (!as || typeof as.onSave !== "function") return;
		var interval = typeof as.interval === "number" ? as.interval : 2000;
		var showIndicator = as.indicator !== false;
		var saveTid = 0;
		var lastSavedAt = 0;
		var lastSavedHash = "";

		function setStatus(text, cls) {
			if (!showIndicator || !textcounter) return;
			var indicator = textcounter.querySelector(".rte-autosave-status");
			if (!indicator) {
				indicator = (textcounter.ownerDocument || document).createElement("span");
				indicator.className = "rte-autosave-status";
				indicator.style.cssText = "margin-left:10px;font-size:11px;opacity:0.75;";
				textcounter.appendChild(indicator);
			}
			indicator.textContent = text;
			indicator.className = "rte-autosave-status " + (cls || "");
		}
		function hash(s) {
			// FNV-1a 32-bit — cheap, sufficient for change detection.
			var h = 2166136261;
			for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
			return h.toString(36);
		}
		function trigger() {
			clearTimeout(saveTid);
			saveTid = setTimeout(function () {
				var html = __GetHTMLCode();
				var h = hash(html);
				if (h === lastSavedHash) return; // nothing changed
				setStatus("Saving…", "rte-autosave-saving");
				try {
					var result = as.onSave(html);
					var done = function () {
						lastSavedHash = h;
						lastSavedAt = Date.now();
						var t = new Date(lastSavedAt);
						var hh = String(t.getHours()).padStart(2, "0");
						var mm = String(t.getMinutes()).padStart(2, "0");
						setStatus("✓ Saved at " + hh + ":" + mm, "rte-autosave-saved");
					};
					if (result && typeof result.then === "function") {
						result.then(done, function (err) {
							setStatus("⚠ Save failed", "rte-autosave-failed");
						});
					} else {
						done();
					}
				} catch (e) {
					setStatus("⚠ Save failed", "rte-autosave-failed");
				}
			}, interval);
		}
		editor.attachEvent("change", trigger);
		// Public API for manual triggers.
		editor.autoSave = {
			trigger: trigger,
			lastSavedAt: function () { return lastSavedAt; },
			isDirty: function () { return hash(__GetHTMLCode()) !== lastSavedHash; }
		};
	}
	try { __InitAutoSave(); } catch (e) { /* ignore */ }

	var csslink = editdoc.querySelector("#url-css-content");
	csslink.onerror = function () { console.error("RTE ERROR : failed to load contentCssUrl " + config.contentCssUrl); }
	if (config.contentCssUrl) csslink.href = config.contentCssUrl;



	iframewinfocused = false;
	__bindEditwin("focus", function () {
		iframewinfocused = true;
		__SetEditorFocusState(true);
	})
	__bindEditwin("blur", function () {
		iframewinfocused = false;
		__SetEditorFocusState(false);
	})
	__bindEditdoc("mousedown", __ON_CurrentPopupMouseDown);


	//var sct = 0;
	__bindEditdoc("selectionchange", function () {

		__UpdateSelectionForFireFox();
		//console.trace(++sct)
		__On_Selection_Change();
	})
	editarea = iframe;
	//}
	//else {
	//	editwin = window;
	//	editdoc = document;
	//	editable = __Append(rtecontent, "rte-editable", "flex:99;height:100%;user-select:all;", "rte-editable");
	//	editable.setAttribute("contentEditable", "true");
	//	editarea = editable;
	//}

	editsel = editdoc.getSelection();

	if (!editsel.empty) {
		editsel.empty = function () {
			editsel.removeAllRanges();
		}
	}

	function _editsel_getRange() {
		// Reseat editsel if it points to a stale (detached) document. Chrome's
		// deferred iframe load can replace the contentDocument out from under
		// us; the iframe load handler reseats editsel/editdoc, but a button
		// click from the host doc (emoji panel etc.) may race ahead.
		try {
			if (!editsel || (editdoc && editsel.ownerDocument && editsel.ownerDocument !== editdoc)) {
				editsel = editdoc.getSelection();
			}
		} catch (e) { /* ignore */ }
		if (!editable.childNodes.length || editable.childNodes[0].nodeName == "BR") {
			__SetHTMLCode("<div><br/></div>")
			__SelectElementText(editable.childNodes[editable.childNodes.length - 1]);
		}
		if (editsel.rangeCount == 0) {
			// Focus the iframe first so the selection lands in the right
			// document, then select the trailing node.
			try { if (editwin && editwin.focus) editwin.focus(); } catch (e) {}
			__SelectElementText(editable.childNodes[editable.childNodes.length - 1] || editable);
			if (editsel.rangeCount == 0) {
				__SetHTMLCode(__GetHTMLCode() + "<div><br/></div>")
				__SelectElementText(editable.childNodes[editable.childNodes.length - 1]);
			}
		}
		if (editsel.rangeCount == 0) {
			// Synthesize a collapsed range at end of editable so callers never
			// see null. Plugins clicked from outside the iframe (emoji panel,
			// image dialog, ribbon menus) hit this path before the iframe has
			// ever been focused.
			var r = editdoc.createRange();
			r.selectNodeContents(editable);
			r.collapse(false);
			try { editsel.removeAllRanges(); editsel.addRange(r); } catch (e) { /* ignore */ }
			return r;
		}
		return editsel.getRangeAt(0)
	}

	editable.style.paddingTop = config.editablePaddingTop + "px";
	editable.style.paddingBottom = config.editablePaddingBottom + "px";
	editable.style.paddingLeft = config.editablePaddingLeft + "px";
	editable.style.paddingRight = config.editablePaddingRight + "px";

	// 2026-05-08 (placeholder-config.test.js): empty-editor placeholder.
	// Opt-in via `placeholder: "Type something…"`. We mark the editable
	// with `data-rte-placeholder` (the literal text) and toggle the
	// `rte-editor-empty` class whenever the content area is empty. The
	// stylesheet renders the text via a ::before pseudo-element so the
	// placeholder isn't part of the editable's children (no risk of it
	// being captured by getHTMLCode / accidentally typed-into).
	function __RefreshPlaceholderState() {
		var ph = config && typeof config.placeholder === "string" ? config.placeholder : "";
		if (!ph) {
			editable.classList.remove("rte-editor-empty");
			editable.removeAttribute("data-rte-placeholder");
			return;
		}
		// Only show when editable, if config asked for that gate.
		if (config.placeholderShowOnlyWhenEditable && editable.getAttribute("contenteditable") === "false") {
			editable.classList.remove("rte-editor-empty");
			editable.removeAttribute("data-rte-placeholder");
			return;
		}
		// Empty if the editable has no text and no images / tables / etc.
		var txt = (editable.textContent || "").replace(/\s/g, "");
		var hasObj = !!editable.querySelector("img,table,figure,video,audio,iframe,svg,hr");
		if (!txt && !hasObj) {
			editable.setAttribute("data-rte-placeholder", ph);
			editable.classList.add("rte-editor-empty");
			editable.style.setProperty("--rte-placeholder-color", config.placeholderColor || "#94a3b8");
		} else {
			editable.classList.remove("rte-editor-empty");
			editable.removeAttribute("data-rte-placeholder");
		}
	}
	__RefreshPlaceholderState();
	__bindEditable("input", __RefreshPlaceholderState);
	__bindEditable("blur", __RefreshPlaceholderState);
	__bindEditable("focus", __RefreshPlaceholderState);

	rtecontent.onscroll = __On_Selection_Change;

	editor.iframe = iframe;
	editor.document = editdoc;
	editor.window = editwin;
	editor.selection = editsel;

	function __UpdateSelectionForFireFox() {
		if (editsel != editwin.getSelection()) {
			editor.selection = editsel = editwin.getSelection();
		}
	}



	editdoc.execCommand("styleWithCSS");

	var _lastEnterKeyTime = 0;
	function __QueueEnterScrollFocus(func) {
		// Re-check a few times because the browser may finish inserting the
		// new block slightly after the first Enter callback runs.
		[1, 20, 80, 160].forEach(function (delay) {
			setTimeout(func, delay);
		});
	}
	function __AdjustScrollTop_ForInsertPoint() {

		if (editsel.rangeCount == 0)
			return;
		var r = _editsel_getRange();
		var rc = r;
		var cr = rc.getBoundingClientRect ? rc.getBoundingClientRect() : null;

		function isEmptyRangeRect(rect) {
			return !rect || (rect.top == 0 && rect.bottom == 0 && rect.height == 0);
		}

		function getCaretMarkerRect(range) {
			if (!range || !range.collapsed || !editdoc || !editdoc.createElement)
				return null;
			var marker = null;
			try {
				marker = editdoc.createElement("span");
				marker.setAttribute("data-rte-caret-scroll-marker", "1");
				marker.style.cssText = "display:inline-block;width:1px;height:1em;line-height:1em;overflow:hidden;vertical-align:baseline;";
				marker.appendChild(editdoc.createTextNode("\u200b"));
				var markerRange = range.cloneRange();
				markerRange.insertNode(marker);
				var markerRect = marker.getBoundingClientRect ? marker.getBoundingClientRect() : null;
				var afterRange = editdoc.createRange();
				afterRange.setStartAfter(marker);
				afterRange.collapse(true);
				if (marker.parentNode)
					marker.parentNode.removeChild(marker);
				editsel.removeAllRanges();
				editsel.addRange(afterRange);
				return markerRect;
			}
			catch (er) {
				try {
					if (marker && marker.parentNode)
						marker.parentNode.removeChild(marker);
				} catch (ignore) { /* ignore */ }
			}
			return null;
		}

		// If the range rect is zero-sized (for example, a collapsed range on an empty line), fall back to the container element.
		if (isEmptyRangeRect(cr)) {
			cr = getCaretMarkerRect(r);
		}
		if (isEmptyRangeRect(cr)) {
			if (r.startContainer && r.startContainer != editable) {
				var fallback = r.startContainer.nodeType == 1 ? r.startContainer : r.startContainer.parentNode;
				if (fallback && fallback != editable && fallback.getBoundingClientRect)
					cr = fallback.getBoundingClientRect();
			}
		}

		if (isEmptyRangeRect(cr))
			return;

		var scrollHost = rtecontent;
		var iframeScrollHost = null;
		try {
			if (editdoc && editdoc.scrollingElement)
				iframeScrollHost = editdoc.scrollingElement;
			else if (editdoc && editdoc.documentElement && editdoc.documentElement.scrollHeight > editdoc.documentElement.clientHeight)
				iframeScrollHost = editdoc.documentElement;
			else if (editdoc && editdoc.body)
				iframeScrollHost = editdoc.body;
		} catch (er) { /* ignore */ }
		if (iframeScrollHost && iframeScrollHost.clientHeight > 0 && iframeScrollHost.scrollHeight > iframeScrollHost.clientHeight)
			scrollHost = iframeScrollHost;

		var hoffset = Math.min(32, Math.max(cr.height + 12, scrollHost.clientHeight - 32));

		var adjustmore = Date.now() - _lastEnterKeyTime < 200 ? 20 : 0;

		var crpos = cr.bottom
		if (scrollHost === iframeScrollHost) {
			if (cr.bottom > scrollHost.clientHeight - hoffset) {
				scrollHost.scrollTop += adjustmore + cr.bottom - scrollHost.clientHeight + hoffset;
			}
			else if (cr.top < hoffset) {
				scrollHost.scrollTop += cr.top - hoffset;
			}
		}
		else if (crpos > scrollHost.scrollTop + scrollHost.clientHeight - hoffset) {
			//console.trace("bottom", Date.now() - _lastEnterKeyTime, scrollHost.clientHeight, cr.y, scrollHost.scrollTop)
			scrollHost.scrollTop = adjustmore + crpos - scrollHost.clientHeight + hoffset;
		}
		else if (crpos < scrollHost.scrollTop) {
			//console.trace("top", Date.now() - _lastEnterKeyTime, scrollHost.clientHeight, cr.y, scrollHost.scrollTop)
			scrollHost.scrollTop = adjustmore + crpos
		}

		// Keep the caret visible after Enter by scrolling it into view.
		if (Date.now() - _lastEnterKeyTime < 200) {
			var node = r.startContainer;
			if (node && node.nodeType == 3) node = node.parentNode;
			var beforeScrollTop = scrollHost.scrollTop;
			if (node && node.scrollIntoViewIfNeeded) {
				node.scrollIntoViewIfNeeded(false);
			} else if (node && node.scrollIntoView) {
				node.scrollIntoView({ block: "nearest" });
			}
			if (scrollHost !== rtecontent && scrollHost.scrollTop === beforeScrollTop && cr.bottom > scrollHost.clientHeight - hoffset) {
				scrollHost.scrollTop = adjustmore + scrollHost.scrollTop + cr.bottom - scrollHost.clientHeight + hoffset;
			}
		}
	}
	//setInterval(__AdjustScrollTop_ForInsertPoint, 1000);

	function ___IFrame_Adjust_ScrollTop(isByContentChanged) {
		var coll = editdoc.body.childNodes;
		var b = 0;
		var r;
		for (var i = 0; i < coll.length; i++) {
			var node = coll.item(i);
			if (node.nodeType == 1) {
				b = Math.max(b, coll.item(i).getBoundingClientRect().bottom);
			}
			else if (node.nodeType == 3) {
				if (r == null) r = editdoc.createRange();
				r.selectNodeContents(node);
				b = Math.max(b, r.getBoundingClientRect().bottom);
			}
		}
		b += editdoc.body.scrollTop + config.editablePaddingTop + config.editablePaddingBottom;

		b += 12;
		if (isFirefox) {
			b += 12;
		}

		//b = Math.ceil(b / 5) * 5;
		if (isByContentChanged) {
			if (lastiframeheight != b) {
				lastiframeheight = b;
				iframe.style.minHeight = b + "px";
				__SetTimeout_HandleSelectionChange();
			}
		}

		var anode = editsel.anchorNode;
		if (anode) {
			if (anode.nodeType != 1)
				anode = anode.parentNode;
			if (anode && anode.nodeType == 1) {
				var r = anode.getBoundingClientRect();
				if (r.bottom > b && r.top > b - rtecontent.offsetHeight + (r.bottom - b)) {
					//console.log(rtecontent.scrollTop, r.bottom - b, r.top + ":" + r.bottom, anode)
					rtecontent.scrollTop += r.bottom - b;
				}
			}
		}
	}

	var __selui_node;
	var __selui_arr;
	function ___dispose__selui_node() {
		__selui_node = null;
	}

	function ___SelectUI_Create_Rect() {

		var useprecontent = false;

		var selctrl = __selui_node;
		if (selctrl.nodeName == "TD" || selctrl.nodeName == "TH") {
			while (selctrl.nodeName != "TABLE")
				selctrl = selctrl.parentNode;
		}

		var selcls = config.controlSelectionClass;

		var div = __Append(useprecontent ? precontent : rtecontent, selcls, null);

		var linet = __Append(div, selcls + "-line", null, "rte-line-t");
		var lineb = __Append(div, selcls + "-line", null, "rte-line-b");
		var linel = __Append(div, selcls + "-line", null, "rte-line-l");
		var liner = __Append(div, selcls + "-line", null, "rte-line-r");

		var divt = __Append(div, selcls + "-corner", null, "rte-corner-t");
		var divb = __Append(div, selcls + "-corner", null, "rte-corner-b");
		var divl = __Append(div, selcls + "-corner", null, "rte-corner-l");
		var divr = __Append(div, selcls + "-corner", null, "rte-corner-r");

		var divtl = __Append(div, selcls + "-corner", null, "rte-corner-tl");
		var divtr = __Append(div, selcls + "-corner", null, "rte-corner-tr");
		var divbl = __Append(div, selcls + "-corner", null, "rte-corner-bl");
		var divbr = __Append(div, selcls + "-corner", null, "rte-corner-br");

		if (!config.enableObjectResizing) {
			var arr = [divt, divb, divl, divr, divtl, divtr, divbl, divbr];
			for (var i = 0; i < arr.length; i++) {
				arr[i].style.cursor = "not-allowed";
				arr[i].style.opacity = "0.2";
			}
		}

		function dodrag(e, xm, ym) {
			var w = selctrl.offsetWidth;
			var h = selctrl.offsetHeight;
			startmousedrag(e, function (xoffset, yoffset, mode) {
				//debuglog(xoffset, yoffset, mode);
				var neww = Math.max(32, w + xoffset * xm);
				var newh = Math.max(32, h + yoffset * ym);

				var ratio;
				if (ym == 0)
					ratio = neww / w;
				else if (xm == 0)
					ratio = newh / h
				else
					ratio = Math.max(Math.sqrt(neww * newh / w / h));
				//debuglog(xm, ym, selctrl.nodeName, ratio, neww / w, newh / h)
				switch (selctrl.nodeName) {
					case "IMG":
						if (ym == 0) {
							selctrl.style.width = Math.floor(w * ratio) + "px";
							selctrl.style.height = ""
						}
						else {
							selctrl.style.width = "";
							selctrl.style.height = Math.floor(h * ratio) + "px";
						}
						break;
					case "TABLE":
						selctrl.style.width = neww + "px";
						selctrl.style.height = newh + "px";
						break;
					default:
						selctrl.style.width = Math.floor(w * ratio) + "px";
						selctrl.style.height = Math.floor(h * ratio) + "px";
						break;
				}

				div._update();
			})
		}

		if (config.enableObjectResizing) {
			divl.onmousedown = function (e) {
				dodrag(e, -1, 0);
			}
			divr.onmousedown = function (e) {
				dodrag(e, 1, 0);
			}
			divt.onmousedown = function (e) {
				dodrag(e, 0, -1);
			}
			divb.onmousedown = function (e) {
				dodrag(e, 0, 1);
			}

			divtl.onmousedown = function (e) {
				dodrag(e, -1, -1);
			}
			divtr.onmousedown = function (e) {
				dodrag(e, 1, -1);
			}
			divbl.onmousedown = function (e) {
				dodrag(e, -1, 1);
			}
			divbr.onmousedown = function (e) {
				dodrag(e, 1, 1);
			}
		}

		var tid;
		function _ontimeout() {
			div._update();
		}
		tid = setInterval(_ontimeout, 100)

		div._dispose = function () {
			div.remove();
			clearInterval(tid);
		}
		div._update = function () {

			if (!editable.contains(selctrl))
				return setTimeout(___SelectUI_Dispose, 1);

			var bcr = __Get_ClientRectForNode(selctrl);



			if (useprecontent) {
				var ccr = rtecontent.getBoundingClientRect();
				div.style.top = bcr.top - ccr.top + "px";
				div.style.left = bcr.left - ccr.left + "px";
			}
			else {
				var ccr = editarea.getBoundingClientRect();	// ccr must be adjusted by rtecontent.scrollTop.
				div.style.top = bcr.top - ccr.top + editarea.offsetTop + "px";
				div.style.left = bcr.left - ccr.left + editarea.offsetLeft + "px";
			}

			var lineadd = config.controlSelectionLineAdd || 0;

			linet.style.width = lineb.style.width = bcr.width + lineadd * 2 + "px";
			linel.style.height = liner.style.height = bcr.height + lineadd * 2 + "px";

			linel.style.left = "0px";
			linet.style.left = lineb.style.left = -lineadd + "px";

			linet.style.top = "0px";
			linel.style.top = liner.style.top = -lineadd + "px";

			liner.style.left = bcr.width + "px";
			lineb.style.top = bcr.height + "px";


			var margin = config.controlSelectionMargin || 0;

			divt.style.left = bcr.width / 2 - divt.offsetWidth / 2 + "px";
			divt.style.top = -margin + "px";

			divb.style.left = bcr.width / 2 - divb.offsetWidth / 2 + "px";
			divb.style.top = bcr.height + margin - divb.offsetHeight + "px";

			divl.style.left = -margin + "px";
			divl.style.top = bcr.height / 2 - divl.offsetHeight / 2 + "px";

			divr.style.left = bcr.width + margin - divtr.offsetWidth + "px";
			divr.style.top = bcr.height / 2 - divr.offsetHeight / 2 + "px";

			divtl.style.left = -margin + "px";
			divtl.style.top = -margin + "px";
			divtr.style.top = -margin + "px";
			divtr.style.left = bcr.width + margin - divtr.offsetWidth + "px";

			divbl.style.left = -margin + "px";
			divbl.style.top = bcr.height + margin - divbl.offsetHeight + "px";
			divbr.style.left = bcr.width + margin - divbr.offsetWidth + "px";
			divbr.style.top = bcr.height + margin - divbr.offsetHeight + "px";

			//divbl.style.transform = "translate(" + (-margin + "px") + "," + (bcr.height + margin - divbl.offsetHeight + "px") + ")";
			//divbr.style.transform = "translate(" + (bcr.width + margin - divbr.offsetWidth + "px") + "," + (bcr.height + margin - divbr.offsetHeight + "px") + ")";

		}



		div._update();
		return div;
	}

	function ___SelectUI_Create_Toolbar(rangemode) {
		var toolbarname = rangemode ? "TEXT" : __selui_node.nodeName;
		if (toolbarname == "TH") toolbarname = "TD";

		switch (toolbarname) {
			case "TEXT":
				if (!config.showFloatTextToolBar) return;
				// 2026-05-19 Suppress text float toolbar when AI Chat (or AI Review)
				// panel is open — the AI panel IS the selection-driven UI in that
				// mode, so the small format-only float toolbar would just cover
				// the panel and confuse the user. Also suppress when other
				// modal-ish overlays are visible (find/replace, comment composer).
				if (editor.__aiChatPanel && editor.__aiChatPanel.isConnected) return;
				if (editor.__aiReviewPanel && editor.__aiReviewPanel.isConnected) return;
				if (document.querySelector(".rte-find-replace-dialog")) return;
				if (document.querySelector(".rte-comment-composer")) return;
				break;
			case "A":
				if (!config.showFloatLinkToolBar) return;
				break;
			case "IMG":
				if (!config.showFloatImageToolBbar) return;
				break;
			case "TD":
				if (!config.showFloatTableToolBar) return;
				break;
		}

		var toolbarstr = config["controltoolbar_" + toolbarname];
		if (!toolbarstr) {
			//debuglog("warning miss controltoolbar_" + toolbarname)
			return null;
		}

		var div = __Append(dialogcontainer, "rte-control-toolbar", "top:0px;left:0px;z-index:" + config.zIndexFloat, "rte-modern rte-absolute");
		__Bind_ActionContainerKeyboard(div, { role: "toolbar", orientation: "horizontal", label: "Selection toolbar" });

		// 2026-05-11 Inline link URL preview. When the float toolbar is for an
		// <a>, show the clickable URL on the left so users can see/edit/open
		// the target without re-clicking. Matches Google Docs / Word / Notion.
		if (toolbarname == "A" && __selui_node && __selui_node.nodeName === "A" && config.showFloatLinkUrlPreview !== false) {
			var url = __selui_node.getAttribute("href") || "";
			if (url) {
				var urlBox = __Append(div, "rte-link-url-preview", "display:inline-flex;align-items:center;gap:6px;max-width:280px;margin:0 6px 0 4px;padding:0 6px;font-size:13px;color:#1d67ba;");
				var urlLink = __Append(urlBox, "a", "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px;color:inherit;text-decoration:underline;");
				urlLink.setAttribute("href", url);
				urlLink.setAttribute("target", "_blank");
				urlLink.setAttribute("rel", "noopener noreferrer");
				urlLink.title = url;
				urlLink.textContent = url.length > 40 ? url.substring(0, 37) + "…" : url;
				// Stop propagation so clicking the URL doesn't dismiss the popup.
				urlLink.onmousedown = function (e) { e.stopPropagation(); };
				urlLink.onclick = function (e) { e.stopPropagation(); };
			}
		}

		__ParseItemList(toolbarstr, div);

		div._dispose = function () {
			dialogcontainer.removeChild(div);
		}
		div._update = function () {

			var bcr = rangemode ? __Get_ClientRectForRange(_editsel_getRange()) : __Get_ClientRectForNode(__selui_node);

			if (toolbarname == "TD" && __sel_cells_start && __sel_cells_end) {
				// The current selection spans multiple table cells.
				var tds = _DoTableOperation("query", "querycells");
				if (!tds) tds = [__sel_cells_start, __sel_cells_end]	// Fallback for partially tracked table selections.
				bcr = __Get_ClientRectForNode(__sel_cells_start);
				bcr = { left: bcr.left, top: bcr.top, right: bcr.right, bottom: bcr.bottom };
				for (var i = 0; i < tds.length; i++) {
					var td = tds[i];
					var cr = __Get_ClientRectForNode(td);
					if (cr.top < bcr.top) bcr.top = cr.top;
					if (cr.left < bcr.left) bcr.left = cr.left;
					if (cr.right > bcr.right) bcr.right = cr.right;
					if (cr.bottom > bcr.bottom) bcr.bottom = cr.bottom;
				}
				bcr.width = bcr.right - bcr.left;
				bcr.height = bcr.bottom - bcr.top;
			}


			var ccr = rtecontent.getBoundingClientRect();

			var dpr = dialogcontainer.getBoundingClientRect();

			__Update_Toolbar_Element(div);

			var h = div.offsetHeight;

			var targetl = bcr.left + (bcr.width / 2 - div.offsetWidth / 2);

			if (targetl - ccr.left + div.offsetWidth > ccr.width) {
				targetl -= (targetl - ccr.left + div.offsetWidth) - ccr.width;
			}

			div.style.left = Math.max(ccr.left - 15, targetl) - dpr.left + "px";

			//debuglog(ccr.top, bcr.top - h, bcr.top, h)

			var marginoffset = 12;
			if (__GetSelectedControl())
				marginoffset = 24;

			if (bcr.top - h - marginoffset > ccr.top) {
				div.style.top = bcr.top - h - marginoffset - dpr.top + "px"; //+ (bcr.height)+ 8
			}
			else {
				//debuglog(bcr.bottom, ccr.bottom)
				div.style.top = Math.min(bcr.bottom, ccr.bottom) + marginoffset - dpr.top + "px"; //+ (bcr.height)+ 8
			}

		}

		div._update();

		return div;
	}

	function ___SelectUI_Dispose() {
		__selui_node = null;
		if (__selui_arr) {
			for (var i = 0; i < __selui_arr.length; i++)
				__selui_arr[i]._dispose();
			__selui_arr = null;
		}

	}

	function ___SelectUI_Update() {

		if (_isreadonly || _isdrag_started || ___Is_CodeMode()) {
			___SelectUI_Dispose();
			return;
		}

		var selctrl = __sel_cells_start || __GetSelectionElement();

		if (selctrl) {
			switch (selctrl.nodeName) {
				case "IMG": case "A": case "IFRAME":
					break;
				default:
					var p = selctrl;
					selctrl = null;
					if (editsel.type != "Range")
						selctrl = __GetTableCell(p);
					break;
			}
		}

		var rangemode = false;
		if (!selctrl && editsel.type == "Range") {
			rangemode = true;
			selctrl = _editsel_getRange();
		}

		if (!selctrl) {
			___SelectUI_Dispose();
			return;
		}


		if (__selui_node != null && __selui_node == selctrl && __selui_arr.length) {
			// Refresh selection handles and toolbar state.
			for (var i = 0; i < __selui_arr.length; i++)
				__selui_arr[i]._update();
			return;
		}

		___SelectUI_Dispose();

		__selui_node = selctrl;
		__selui_arr = [];

		if (rangemode) {
			var tb = ___SelectUI_Create_Toolbar(true);
			if (tb) __selui_arr.push(tb);
			return;
		}

		// Build handles and toolbar controls for the current selection.
		switch (selctrl.nodeName) {
			case "IMG":
			case "TD":
			case "TH":
				var tb = ___SelectUI_Create_Toolbar();
				if (tb) __selui_arr.push(tb);

				__selui_arr.push(___SelectUI_Create_Rect());
				return;
			case "A":
				var tb = ___SelectUI_Create_Toolbar();
				if (tb) __selui_arr.push(tb);
				return;
			case "IFRAME":
				// Videos / embeds get both the float toolbar AND resize handles.
				var tbifr = ___SelectUI_Create_Toolbar();
				if (tbifr) __selui_arr.push(tbifr);
				__selui_arr.push(___SelectUI_Create_Rect());
				break;
			case "TABLE":
				__selui_arr.push(___SelectUI_Create_Rect());
				break;
		}

	}

	function ___Adjust_After_Content_Changed() {

		if (iframe) {
			___IFrame_Adjust_ScrollTop(true);
		}
		// Refresh heading anchor IDs whenever content changes — debounced so a
		// rapid burst of typing only triggers one slug pass.
		clearTimeout(___Adjust_After_Content_Changed._anchorTid);
		___Adjust_After_Content_Changed._anchorTid = setTimeout(__ApplyHeadingAnchors, 400);

	}

	function __EnsureLastParagraph() {
		var cns = editable.childNodes;

		if (cns.length) {
			var last = cns[cns.length - 1];
			if (last.nodeName == (config.enterKeyTag && config.enterKeyTag.toUpperCase()))
				return;

			switch (last.nodeName) {
				case "SPAN":
					if (!last.childNodes.length) {
						__RemoveNodeOnly(last);
						__EnsureLastParagraph();
						return;
					}
					break;
				case "#text":
				case "BR":
				case "HR":
					break;
				default:
					if (__IsRemovableBlockNodeName(last.nodeName)) {
						if (!last.childNodes.length) {
							__Append(last, "BR");
							return;
						}
						else if (last.childNodes.length == 1 && last.firstChild.nodeName == "BR") {
							return;
						}
					}
					break;
			}
		}

		if (config.enterKeyTag && config.enterKeyTag.toUpperCase() == "BR") {
			__Append(editable, "BR");
		}
		else {
			__Append(__Append(editable, config.enterKeyTag || "DIV"), "BR");
		}

	}

	var _fixseltimerid = 0;
	function __On_Selection_Change() {

		clearTimeout(_fixseltimerid);
		_fixseltimerid = setTimeout(__EnsureLastParagraph, 10);

		if (isIE && editsel.anchorNode == null)
			return;

		// 2026-05-11 Kenneth Chen: image-upload-at-bottom regression.
		// Persistently remember the most recent IN-EDITOR caret/range so
		// that async flows (file picker, dialog) can restore it even after
		// the editor lost focus to a native chooser. Cheaper than relying
		// on captures inside individual command handlers.
		try {
			if (editsel.rangeCount > 0 && editsel.anchorNode && editable.contains(editsel.anchorNode)) {
				__lastInEditorRange = editsel.getRangeAt(0).cloneRange();
			}
		} catch (e) { /* ignore */ }

		__RenderTextStatistics();

		if (__sel_cells_start && !__ismousedown) {
			var clearcells = false;
			var selnode = editdoc
			if (!editable.contains(__sel_cells_start)) {
				clearcells = true;
			}
			else if (editsel.rangeCount != 0) {
				clearcells = true;
				var san = editsel.anchorNode;
				var tds = _DoTableOperation("query", "querycells");
				if (tds) {
					for (var i = 0; i < tds.length; i++) {
						if (tds[i].contains(san)) {
							clearcells = false;
							break;
						}
					}
				}
			}
			if (clearcells) {
				__sel_cells_start = null;
				__sel_cells_end = null;
				MakeSelectedCells();
			}
		}

		if (editsel.rangeCount != 0) {
			var selctrl = __GetBrowserSelectedControl();
			if (selctrl == null) {
				___ResetSelectControl();
			}
			else {
				__SelectControl(selctrl);
				return;
			}
		} else if (__GetSelectedControl() != null && !editable.contains(__GetSelectedControl())) {
			___ResetSelectControl();
		}

		var ischanged = ___CurrentBookmark_Save();

		if (iframe) {
			//console.trace("test2..");
			___IFrame_Adjust_ScrollTop(ischanged);
		}

		___Update_Toolbars();

		___SelectUI_Update();

		__TagList_Update();

		InvokeEventHook("selectionchange");

	}

	var __lastInEditorRange = null;

	function __SetTimeout_HandleSelectionChange() {
		clearTimeout(__SetTimeout_HandleSelectionChange._tid);
		__SetTimeout_HandleSelectionChange._tid = setTimeout(__On_Selection_Change, 10);
	}



	//if (!editdoc.getElementById("rte-style")) {
	//	var styletag = __Append(editdoc.head, "style");
	//	styletag.id = "rte-style";
	//	styletag.innerHTML = "video-container{position:relative} video-container:after{content:'';display:block;position:absolute;z-index:1;left:0px;top:0px;right:0px;bottom:0px;background-color:rgba(128,128,128,0.2);}";
	//}


	var __codemodediv;
	var __codemodeinp;
	function ___Get_CodeMode_Code() {
		if (__codemodeinp == null)
			return null;
		return __codemodeinp.value;
	}
	function ___Is_CodeMode() {
		return !!__codemodediv;
	}
	function ___Focus_CodeMode() {
		if (__codemodeinp)
			__codemodeinp.focus();
	}
	function ___Toggle_CodeMode() {
		// Toggle between visual editing and source-code editing.
		if (__codemodediv) {
			editable.innerHTML = __fixHTML(__codemodeinp.value);
			__FixHtmlElements();
			rtecontent.removeChild(__codemodediv);
			__codemodediv = null;
			__codemodeinp = null;
			editarea.style.display = "block";
			container.classList.remove("rte-is-codemode");
			__SetEditorFocusState(false);
		}
		else {
			var codeval = __GetHTMLCode();
			codeval = String_IndentHtml(codeval);

			__codemodediv = __Append(rtecontent, "rte-codebox", "display:flex", "");
			var minw = editarea.offsetWidth;
			var minh = rtecontent.clientHeight - 16; // Account for 8px top and bottom padding.
			editarea.style.display = "none";
			container.classList.add("rte-is-codemode");
			__codemodeinp = __Append(__codemodediv, "textarea", "width:100%;height:100%;border-width:0px;user-select:text;");
			__codemodeinp.setAttribute("spellcheck", false);
			__codemodeinp.style.minWidth = minw + "px";
			__codemodeinp.style.minHeight = minh + "px";
			__codemodeinp.onmousedown = function (e) { e.stopPropagation() }


			__codemodeinp.value = codeval;
			__codemodeinp.onchange = function () {
				editable.innerHTML = __fixHTML(__codemodeinp.value);
			}
			__codemodeinp.addEventListener("focus", function () {
				__SetEditorFocusState(true);
			});
			__codemodeinp.addEventListener("blur", function () {
				__SetEditorFocusState(false);
			});
			__codemodeinp.focus();
			__codemodeinp.addEventListener("mousedown", __ON_CurrentPopupMouseDown);
			if (_isreadonly)
				__codemodeinp.readOnly = true;
		}
	}



	function String_IndentHtmlWithoutScript(h) {
		var tabindent = '\t';
		//if (config) tabindent = config.codetabindent || '\t'

		var t_start = /\<(ADDRESS|AREA|BASE|DIV|H1|H2|H3|H4|H5|H6|LI|LINK|META|OL|OPTION|P|TITLE|TD|UL)[^\>]*\>/gi;
		var t_end = /\<\/(ADDRESS|AREA|BASE|DIV|H1|H2|H3|H4|H5|H6|LI|LINK|META|OL|OPTION|P|TITLE|TD|UL)[^\>]*\>/gi;
		var brandhr = /\<(BR|HR)[^\>]*\>/gi;
		var t_shouldbreak = /\<\/?(HTML|HEAD|BODY|FORM|TABLE|TBODY|THEAD|TR)[^\>]*\>/gi;
		var LineSplitter = /\s*\n+\s*/g;
		var IncreaseIndent = /^\<(BODY|EMBED|FORM|HEAD|HTML|TABLE|TBODY|THEAD|TR|UL|OL)[ \/\>]/i;
		var DecreaseIndent = /^\<\/(BODY|EMBED|FORM|HEAD|HTML|TABLE|TBODY|THEAD|TR|UL|OL)[ \>]/i;

		var ta_start = /\<TEXTAREA[^\>]*\>/gi
		var ta_end = /\<\/TEXTAREA[^\>]*\>/gi

		h = h.replace(t_start, '\n$&');;
		h = h.replace(t_end, '$&\n');
		h = h.replace(brandhr, '$&\n');
		h = h.replace(t_shouldbreak, '\n$&\n');

		var sIndentation = '';

		var asLines = h.split(LineSplitter);
		h = '';

		for (var i = 0; i < asLines.length; i++) {
			var sLine = asLines[i];

			if (sLine.length == 0)
				continue;

			if (ta_start.test(sLine)) {
				for (; i < asLines.length; i++) {
					var sLine = asLines[i];
					h += sLine + "\n";
					if (t_end.test(sLine))
						break;
				}
				continue;
			}

			if (DecreaseIndent.test(sLine))
				sIndentation = sIndentation.replace(tabindent, '');

			h += sIndentation + sLine + '\n';

			if (IncreaseIndent.test(sLine))
				sIndentation += tabindent;
		}
		return h;
	}
	function String_IndentHtml(html) {
		var arr = [];
		var start = 0;
		var pos = html.indexOf('<script', start);
		while (pos != -1) {
			arr.push(String_IndentHtmlWithoutScript(html.substring(start, pos)));

			var endpos = html.indexOf('</scr' + 'ipt>', pos + 8);
		if (endpos == -1) // No closing tag was found.
			{
				start = pos;
				break;
			}
			arr.push(html.substring(pos, endpos + 9));
			start = endpos + 9;
			pos = html.indexOf('<script', start);
		}
		arr.push(String_IndentHtmlWithoutScript(html.substring(start)));
		return arr.join("");
	}



	function __Focus_Editor_Ensure() {
		if (___Is_CodeMode()) {
			___Focus_CodeMode();
			return;
		}
		if (__GetSelectedControl())
			return;

		if (iframe) {
			//debuglog(iframewinfocused,editdoc.hasFocus())
			if (iframewinfocused === false) {

				var anchorNode = editsel.anchorNode;

				editwin.focus();

				if (isIE && anchorNode == null) {
					___CurrentBookmark_LoadSelectionForIE();
				}
				else if (editsel.rangeCount) {	// Re-add the range to work around browser selection loss.
					var r = editsel.getRangeAt(0);
					editsel.empty();
					editsel.addRange(r);
				}
			}
		}
		else {
			if (editdoc.activeElement != editable) {
				editable.focus();
			}
		}
	}

	function __Focus_Editor_Delay() {
		if (___Is_CodeMode()) {
			___Focus_CodeMode();
			return;
		}
		function showfunc() {
			if (!__IsDialogJustShow())
				__Focus_Editor_Ensure();
		}
		setTimeout(showfunc, 70);
		setTimeout(showfunc, 10);
	}

	function __Find_Selection_Root_Block() {
		var sc = __GetSelectedControl();
		if (sc)
			return __Find_Root_Block(sc.parentNode);
		if (editsel.anchorNode != editable) {
			var rb = __Find_Root_Block(editsel.anchorNode);
			if (editsel.anchorNode != editsel.focusNode) {
				var fb = __Find_Root_Block(editsel.focusNode);
				if (rb != fb)
					return null;
			}
			return rb;
		}
		else {
			var node = editable.childNodes[editsel.anchorOffset] || editable.childNodes[editsel.anchorOffset - 1];
			if (node && node.nodeType == 1)
				return node;
		}
	}

	function __IsContainerElement(cn) {
		switch (cn.nodeName) {
			case "BLOCKQUOTE": case "P": case "DIV": case "H1": case "H2": case "H3": case "H4": case "H5": case "H6":
			case "OL": case "UL": case "LI": case "TD": case "TH":
			case "FRAGMENT": case "TABLE": case "THEAD": case "TBODY": case "TFOOT": case "TR":
				return true;
		}
	}

	function __IsRemovableBlockNodeName(name) { // True for standalone blocks, not nested structures like ul/li or table/tr/td.
		switch (name) {
			case "BLOCKQUOTE": case "P": case "DIV": case "H1": case "H2": case "H3": case "H4": case "H5": case "H6":
				return true;
		}
		return false;
	}
	function __IsParentBlockNodeName(name) {
		switch (name) {
			case "BLOCKQUOTE": case "P": case "DIV": case "H1": case "H2": case "H3": case "H4": case "H5": case "H6":
			case "UL": case "OL": case "LI": case "TD": case "TH":
				return true;
		}
		return false;
	}
	function __Find_Parent_Block(node) {
		while (node) {
			if (node == editable)
				return node;
			if (__IsParentBlockNodeName(node.nodeName))
				return node;
			node = node.parentNode;
		}
		return node;
	}
	function __Find_Root_Block(node) {
		if (node == editable)
			return null;
		if (node && node.nodeType != 1)
			node = node.parentNode;
		while (node) {
			if (node.parentNode == editable)
				break;
			if (node.nodeType == 1) {
				var nname = node.nodeName;
				if (nname == "TD" || nname == "TH" || nname == "LI")
					return node;
				//var display = editwin.getComputedStyle(node).display;
				//if (display == 'list-item')
				//    return node;
			}
			node = node.parentNode;
		}
		if (!node) return null;
		var display = editwin.getComputedStyle(node).display;
		if (display == 'inline')
			return null;
		return node;
	}

	function __Get_ClientRectForNode(node, debug) {

		var bcr = node.getBoundingClientRect();

		if (debug) console.trace(node.nodeName, bcr.left, bcr.width, node.offsetWidth, editable.offsetWidth, iframe.offsetWidth)

		if (iframe) {
			//var ccr = content.getBoundingClientRect();
			//return { width: bcr.width, height: bcr.height, left: ccr.left + bcr.left, top: ccr.top - content.scrollTop + bcr.top, right: bcr.right + ccr.left, bottom: bcr.bottom + ccr.top - content.scrollTop };
			var ccr = iframe.getBoundingClientRect();
			return { width: bcr.width, height: bcr.height, left: ccr.left + bcr.left, top: ccr.top + bcr.top, right: bcr.right + ccr.left, bottom: bcr.bottom + ccr.top };
		}
		else {
			return bcr;
		}
	}

	function __Get_ClientRectForRange(range) {
		return __Get_ClientRectForNode(range); // Reuse the same client-rect normalization path.
	}




	function __Create_DropDownPanel(span, option, clsname) {
		var dropdownhead;
		var dropdownpanel;
		span.setAttribute("aria-expanded", "true");

		function dispose_dropdownpanel() {
			if (dropdownpanel == null)
				return;
			span.setAttribute("aria-expanded", "false");

			dialogcontainer.removeChild(dropdownpanel);
			dropdownpanel = null;
			dialogcontainer.removeChild(dropdownhead);
			dropdownhead = null;

			if (option.onclose)
				option.onclose();
		}

		// Lazily create the dropdown panel.
		var r = span.getBoundingClientRect();

		var dpr = dialogcontainer.getBoundingClientRect();

		dropdownhead = __Append(dialogcontainer, "rte-dropdown-head", "position:absolute;z-index:" + config.zIndexDropDown + ";");
		dropdownhead.style.left = r.left - dpr.left + "px";
		dropdownhead.style.top = r.top - dpr.top + "px";
		dropdownhead.style.height = r.height + "px";
		dropdownhead.style.width = r.width + "px";

		dropdownpanel = __Append(dialogcontainer, "rte-dropdown-panel", "position:absolute;z-index:" + config.zIndexDropDown + ";");
		dropdownpanel._launcher = span;
		__Bind_ActionContainerKeyboard(dropdownpanel, {
			role: "menu",
			orientation: "vertical",
			label: __Get_ActionElementLabel(span, __GetLangText(span.command || "menu")),
			onescape: function () {
				__Close_CurrentPopup(dropdownpanel);
				__Focus_ActionElement(span);
			}
		});

		if (clsname)
			dropdownpanel.className = clsname;

		if (!option.submenu || !_current_popup_element) {
			__Set_CurrentPopup(dropdownpanel, dispose_dropdownpanel)
		}
		else {
			__Set_PopupSubmenu(dropdownpanel, dispose_dropdownpanel);
			dropdownhead.parentPopup = dropdownpanel.parentPopup;
			dropdownhead.onclick = dispose_dropdownpanel;
		}

		option.fillpanel(dropdownpanel)

		var dew = document.documentElement.offsetWidth;

		if (r.left + dropdownpanel.offsetWidth > dew)
			dropdownpanel.style.left = r.left - dpr.left - dropdownpanel.offsetWidth + span.offsetWidth + "px";
		else
			dropdownpanel.style.left = r.left - dpr.left + "px";
		dropdownpanel.style.top = r.top - dpr.top + r.height + "px";

		return dropdownpanel;
	}

	function __CreateToolbarDropDown(option, cmd, suffix) {

		if (suffix == "toggle") {
			var span = document.createElement("rte-toolbar-arrowbutton");
			span.command = cmd;
			span.className = "rte_command_" + cmd;
			span.style.cssText = 'position:relative;';
			span.setAttribute(config.tooltipAttribute, __GetLangText(cmd));
			__Make_ActionElementAccessible(span, { role: "button", haspopup: "menu", label: __GetLangText(cmd), onkeydownarrow: function () { __Open_ActionPopupAndFocus(span); } });
			__SetImageForCmd(span, cmd);

			//if (!("noheader" in option)) option.noheader = 1;

			span.onclick = function (e) {
				__SaveMouseEvent(e);
				_RemoveTooltipRecent(span);
				if (span.classList.contains("rte-command-disabled"))
					return;
				__Create_DropDownPanel(span, option, "rte_command_" + cmd)
			}
			return span;
		}
		else {

			var span = document.createElement("rte-toolbar-dropdown");
			span.command = cmd;
			span.className = "rte_command_" + cmd;
			span.style.cssText = "display:inline-flex;flex-direction:row;position:relative;";
			span.setAttribute(config.tooltipAttribute, __GetLangText(cmd));
			__Make_ActionElementAccessible(span, { role: "button", haspopup: "menu", label: __GetLangText(cmd), onkeydownarrow: function () { __Open_ActionPopupAndFocus(span); } });
			var lspan = __Append(span, "rte-toolbar-dropdown-input", "");
			var rspan = __Append(span, "rte-toolbar-dropdown-arrow", "");
			rspan.innerHTML = "";

			span.onclick = function (e) {
				__SaveMouseEvent(e);
				_RemoveTooltipRecent(span);
				if (span.classList.contains("rte-command-disabled"))
					return;
				__Create_DropDownPanel(span, option, "rte_command_" + cmd)
			}

			option.fillinput(lspan);

			return span;
		}
	}

	function __Append_DropDownItem(panel, onclick) {
		var div = __Append(panel, "rte-toolbar-dropdown-item", "");
		__Make_ActionElementAccessible(div, { role: "menuitem", label: "Menu item" });
		div.onclick = function (e) {
			__SaveMouseEvent(e);
			__Close_CurrentPopup(panel);
			onclick(div, e);
			__Focus_Editor_Delay();
		}
		div.onmouseover = function () {

		}
		div.onmouseout = function () {

		}
		return div;
	}


	function __Create_DownDown_Paragraph(span) {
		function divonclick(div) {
			var sitem = div.__selecteditem;
			if (sitem.toLowerCase() == "normal")
				sitem = config.enterKeyTag;
			__ExecFormatBlock(sitem);
		}
		var option = {}	//noheader: 1 
		option.fillpanel = function (panel) {
			panel.classList.add("rte_command_paragraphs");
			//var rn0 = __Find_Selection_Root_Block();
			//var mudiv = __Append_DropDownItem(panel, function () {
			//    rn0.parentNode.insertBefore(rn0.previousSibling, rn0.nextSibling);
			//});
			//mudiv.innerHTML = __GetLangText("move_up")
			//if (!rn0 || !rn0.previousSibling) {
			//    mudiv.onclick = null;
			//    mudiv.style.color = 'gray';
			//}

			//var mddiv = __Append_DropDownItem(panel, function () {
			//    rn0.parentNode.insertBefore(rn0.nextSibling, rn0);
			//});
			//mddiv.innerText = __GetLangText("move_down");
			//if (!rn0 || !rn0.nextSibling) {
			//    mddiv.onclick = null;
			//    mddiv.style.color = 'gray';
			//}

			var fn = __Find_Selection_Root_Block();

			var items = config.paragraphItems.split(",");

			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var div = __Append_DropDownItem(panel, divonclick);
				div.__selecteditem = item;
				var tagname = item;
				if (tagname.toLowerCase() == "normal") tagname = "div";
				__Append(div, tagname).innerText = __GetLangText(item);


				if (fn != null && fn.nodeName.toLowerCase() == tagname.toLowerCase()) {
					div.classList.add("rte-current-item");
				}
			}
		}
		__Create_DropDownPanel(span, option)
	}

	var _fpp_panel, _fpp_scrolltid; // Floating paragraph toolbar state.
	function __FPP_CreatePanel() {
		_fpp_panel = __Append(document.body, "rte-floatpanel"
			, "", "rte-fixed rte-floatpanel-paragraphop");
		__ParseItemList(config.subtoolbar_floatparagraph, _fpp_panel, "vtoolbar");

		var overblock = null;
		_fpp_panel.onmouseover = function () {
			overblock = __Find_Selection_Root_Block();
			if (overblock) overblock.setAttribute("__rte_selected_hover__", "1");
		}
		_fpp_panel.onmouseout = function () {
			if (overblock) overblock.removeAttribute("__rte_selected_hover__");
		}

		//var span = __Append(_fpp_panel, "span", "width:20px;height:20px");
		//__SetImageForCmd(span, "paragraphop");

		//_fpp_panel.onclick = function () {
		//    __Create_DownDown_Paragraph(span);
		//}

	}

	function __RemoveSelectedEffect() {
		var arr = editdoc.querySelectorAll("[__rte_selected_block]");
		for (var i = 0; i < arr.length; i++)
			arr[i].removeAttribute("__rte_selected_block");
		var arr = editdoc.querySelectorAll("[__rte_selected_cell]");
		for (var i = 0; i < arr.length; i++)
			arr[i].removeAttribute("__rte_selected_cell");
	}


	var __last_fpp_pnode;

	function __FPP_Scroll_It() {

		if (!config.showFloatParagraph)
			return;

		var pnode = __Find_Selection_Root_Block();

		if (__last_fpp_pnode != null) {
			if (__last_fpp_pnode != pnode || _isreadonly)
				__last_fpp_pnode.removeAttribute("__rte_selected_block");
			__last_fpp_pnode = null;
		}

		if (pnode == null || _isreadonly || ___Is_CodeMode()) {
			if (_fpp_panel != null) {
				_fpp_panel.parentNode.removeChild(_fpp_panel);
				_fpp_panel = null;
			}
		}
		else {
			if (_fpp_panel == null)
				__FPP_CreatePanel();
			__FPP_Update(pnode);
			if (__last_fpp_pnode != pnode) {
				if (config.showSelectedBlock) {
					pnode.setAttribute("__rte_selected_block", "");
					__last_fpp_pnode = pnode;
				}
			}
		}
	}
	function __FPP_Update(pnode) {

		if (!config.showFloatParagraph)
			return;

		var bcr = __Get_ClientRectForNode(pnode);
		var ccr = rtecontent.getBoundingClientRect();

		var csstext = _fpp_panel.style.cssText;

		// Position the floating paragraph toolbar beside the active block.
		if (container.classList.contains("rte-fullpage")) {
			_fpp_panel.style.left = ccr.right - 32 + config.floatParagraphPosX + "px";
			_fpp_panel.style.zIndex = 1 + parseInt(RTE_DefaultConfig.zIndexFullPage) || 0;
		}
		else if (config.floatParagraphPos == "left") {
			_fpp_panel.style.left = ccr.left - 21 + config.floatParagraphPosX + "px";//bcr.left - 25 + "px";
		}
		else {
			_fpp_panel.style.left = ccr.right - 32 + config.floatParagraphPosX + "px";
		}

		//if (bcr.bottom + 12 > ccr.bottom) {
		//	_fpp_panel.style.top = bcr.top - 20 + "px";
		//}
		//else {
		//	_fpp_panel.style.top = bcr.bottom + "px";
		//}
		_fpp_panel.style.top = bcr.top + (bcr.height - 20) / 2 + config.floatParagraphPosY + "px";


		clearTimeout(_fpp_scrolltid);
		if (csstext != _fpp_panel.style.cssText) {
			_fpp_scrolltid = setTimeout(__FPP_Scroll_It, 300);
		}
	}


	function __Ensure_Root_Block() {

		var rb = __Find_Selection_Root_Block()
		if (!rb && config.enterKeyTag) {

			var ektag = config.enterKeyTag; if (ektag.toLowerCase() == "br") ektag = "div";

			__ExecFormatBlock(ektag);
			rb = __Find_Selection_Root_Block();
			if (rb && config.paragraphClass) {
				rb.classList.add(config.paragraphClass);
			}
		}
		return rb;
	}

	function __NormalizeShortcutText(text) {
		if (!text)
			return "";
		return String(text).replace(/\u00a0/g, " ").replace(/\u200b/g, "").replace(/\r/g, "");
	}
	function __GetShortcutTextBeforeCaret(root) {
		if (!root || !editsel || editsel.rangeCount <= 0 || !editsel.isCollapsed)
			return null;
		var range = editsel.getRangeAt(0);
		if (!root.contains(range.startContainer) && root != range.startContainer)
			return null;
		var beforeRange = range.cloneRange();
		beforeRange.selectNodeContents(root);
		beforeRange.setEnd(range.startContainer, range.startOffset);
		return __NormalizeShortcutText(beforeRange.toString());
	}
	function __PlaceCaretAtStart(node) {
		var target = node;
		while (target && target.nodeType == 1 && target.firstChild)
			target = target.firstChild;
		var range = editdoc.createRange();
		if (target && target.nodeType == 3) {
			range.setStart(target, 0);
		}
		else {
			range.setStart(node, 0);
		}
		range.collapse(true);
		editsel.removeAllRanges();
		editsel.addRange(range);
	}
	function __CreateMarkdownShortcutParagraph() {
		var tagname = (config.enterKeyTag || "DIV").toUpperCase();
		if (tagname == "BR")
			tagname = "DIV";
		var block = editdoc.createElement(tagname);
		if (config.paragraphClass)
			block.classList.add(config.paragraphClass);
		__Append(block, "br");
		return block;
	}
	function __ReplaceBlockForMarkdownShortcut(root, nodes, focusNode) {
		if (!root || !root.parentNode || !nodes || !nodes.length)
			return false;
		var parent = root.parentNode;
		var ref = root.nextSibling;
		for (var i = 0; i < nodes.length; i++) {
			parent.insertBefore(nodes[i], ref);
		}
		root.remove();
		if (focusNode)
			__PlaceCaretAtStart(focusNode);
		___Adjust_After_Content_Changed();
		__SetTimeout_HandleSelectionChange();
		return true;
	}
	function __ApplyMarkdownShortcut(triggerKey) {
		if (!config.markdownShortcutsEnabled || !editsel || !editsel.isCollapsed || __GetSelectedControl())
			return false;

		var root = __Find_Selection_Root_Block() || __Ensure_Root_Block();
		if (!root || !editable.contains(root))
			return false;
		switch (root.nodeName) {
			case "LI":
			case "TD":
			case "TH":
			case "PRE":
			case "CODE":
			case "BLOCKQUOTE":
			case "HR":
				return false;
		}

		var textBefore = __GetShortcutTextBeforeCaret(root);
		if (textBefore == null)
			return false;
		var fullText = __NormalizeShortcutText(root.innerText || root.textContent || "");
		if (fullText != textBefore)
			return false;

		var marker = textBefore.trim();
		if (!marker)
			return false;

		if (triggerKey == "space") {
			var headingMatch = marker.match(/^(#{1,3})$/);
			if (headingMatch) {
				var heading = editdoc.createElement("H" + headingMatch[1].length);
				__Append(heading, "br");
				return __ReplaceBlockForMarkdownShortcut(root, [heading], heading);
			}
			if (marker == ">") {
				var quote = editdoc.createElement("BLOCKQUOTE");
				var innerBlock = __CreateMarkdownShortcutParagraph();
				quote.appendChild(innerBlock);
				return __ReplaceBlockForMarkdownShortcut(root, [quote], innerBlock);
			}
			if (marker == "-" || marker == "*") {
				var ul = editdoc.createElement("UL");
				var li = editdoc.createElement("LI");
				__Append(li, "br");
				ul.appendChild(li);
				return __ReplaceBlockForMarkdownShortcut(root, [ul], li);
			}
			if (marker == "1.") {
				var ol = editdoc.createElement("OL");
				var li = editdoc.createElement("LI");
				__Append(li, "br");
				ol.appendChild(li);
				return __ReplaceBlockForMarkdownShortcut(root, [ol], li);
			}
		}

		if (triggerKey == "enter" && /^(---|\*\*\*|___)$/.test(marker)) {
			var hr = editdoc.createElement("HR");
			var nextBlock = __CreateMarkdownShortcutParagraph();
			return __ReplaceBlockForMarkdownShortcut(root, [hr, nextBlock], nextBlock);
		}

		return false;
	}

	__bindEditdoc("selectionchange", function () {
		if (config.showFloatParagraph && config.subtoolbar_floatparagraph) {
			__FPP_Scroll_It();
		}
	});
	document.addEventListener("scroll", function () {
		if (config.showFloatParagraph && config.subtoolbar_floatparagraph) {
			__FPP_Scroll_It();
		}
	});
	__bindEditdoc("keypress", function (e) {
		// Smart typography (em-dash, ellipsis, smart quotes, trademarks) —
		// runs BEFORE the character is inserted so we can replace the
		// preceding pattern and insert the curly quote ourselves.
		if (e.key && e.key.length === 1 && config.smartTypography !== false) {
			try {
				if (__TryApplySmartTypography(e.key)) {
					// The substitution already inserted the desired glyph, so
					// suppress the original keypress to avoid a duplicate
					// character (e.g. "—-" instead of "—").
					e.preventDefault();
				}
			} catch (er) { /* ignore */ }
		}
		if (e.keyCode == 32) {
			// 2026-05-11 Auto-link on space: if the word before the caret
			// looks like a URL or email, wrap it in an <a> before the space
			// is inserted. Disable via `config.autoLinkOnType = false`.
			if (config.autoLinkOnType !== false) {
				try { __TryApplyAutoLink(); } catch (er) { /* ignore */ }
			}
			if (__ApplyMarkdownShortcut("space")) {
				e.preventDefault();
				return;
			}
		}
		if (e.keyCode == 9) {
			// Snippet expansion takes priority over indent. If the text just
			// before the caret matches a registered ":snippet", expand it and
			// suppress the Tab.
			if (!e.shiftKey) {
				try {
					if (__TryExpandSnippet()) { e.preventDefault(); return; }
				} catch (er) { /* ignore */ }
			}
			// Tab in a list item nests it (Shift+Tab outdents). Word/Google Docs
			// convention. Works whether or not text is selected.
			var inLi = false;
			try {
				var n = editsel.anchorNode;
				while (n && n !== editable) {
					if (n.nodeName === "LI") { inLi = true; break; }
					n = n.parentNode;
				}
			} catch (er) { /* ignore */ }
			if (inLi || editsel.toString()) {
				e.preventDefault();
				__Exec_Cmd_Core(e.shiftKey ? "outdent" : "indent");
				return;
			}
			if (config.tabSpaces && config.tabSpaces > 0) {
				e.preventDefault();
				var inscode = "";
				for (var i = 0; i < Math.min(config.tabSpaces, 100); i++)
					inscode += "&nbsp;"
				__InsertHTML(inscode);
				__Collapse(false);
			}
			return;
		}

		if (e.keyCode == 13) {
			_lastEnterKeyTime = Date.now();

			__RemoveSelectedEffect();

			if (__GetSelectedControl()) {
				e.preventDefault();
				return;
			}
			if (__ApplyMarkdownShortcut("enter")) {
				e.preventDefault();
				return;
			}

			// 2026-05-11: Enter on empty list item exits the list; Enter on empty
			// blockquote exits the blockquote. Industry-standard expectation —
			// pressing Enter on a blank bullet drops the user back into a normal
			// paragraph instead of creating yet another empty bullet.
			if (e.shiftKey === false && editsel.isCollapsed) {
				try {
					var node = editsel.anchorNode;
					if (node && node.nodeType === 3) node = node.parentNode;
					// Walk up to LI / BLOCKQUOTE.
					var li = null, bq = null, cur = node;
					while (cur && cur !== editable) {
						if (!li && cur.nodeName === "LI") li = cur;
						if (!bq && cur.nodeName === "BLOCKQUOTE") bq = cur;
						cur = cur.parentNode;
					}
					if (li && /^(\s|<br[^>]*>)*$/i.test(li.innerHTML)) {
						// Empty <li>: pop out of the list.
						var list = li.parentNode;
						var nextSibling = li.nextSibling;
						list.removeChild(li);
						var ektag = (config.enterKeyTag || "p").toLowerCase();
						if (ektag === "br") ektag = "div";
						var p = editdoc.createElement(ektag);
						p.innerHTML = "<br>";
						if (nextSibling) {
							// Split the list: items after the empty <li> go into a new list of same kind.
							var afterList = editdoc.createElement(list.nodeName.toLowerCase());
							while (nextSibling) {
								var next = nextSibling.nextSibling;
								afterList.appendChild(nextSibling);
								nextSibling = next;
							}
							list.parentNode.insertBefore(p, list.nextSibling);
							list.parentNode.insertBefore(afterList, p.nextSibling);
						} else {
							list.parentNode.insertBefore(p, list.nextSibling);
						}
						if (list.children.length === 0) list.parentNode.removeChild(list);
						var r = editdoc.createRange();
						r.setStart(p, 0); r.collapse(true);
						editsel.removeAllRanges(); editsel.addRange(r);
						e.preventDefault();
						__SetTimeout_HandleSelectionChange();
						return;
					}
					if (bq) {
						// Find the deepest empty block inside the blockquote (e.g. <p><br></p>).
						var inner = node;
						while (inner && inner !== bq && inner.parentNode !== bq) inner = inner.parentNode;
						var emptyBq = bq.childNodes.length === 1 && /^(\s|<br[^>]*>)*$/i.test(bq.innerHTML);
						var emptyInner = inner && inner !== bq && /^(\s|<br[^>]*>)*$/i.test(inner.innerHTML || "");
						if (emptyBq || emptyInner) {
							var ektag2 = (config.enterKeyTag || "p").toLowerCase();
							if (ektag2 === "br") ektag2 = "div";
							var p2 = editdoc.createElement(ektag2);
							p2.innerHTML = "<br>";
							bq.parentNode.insertBefore(p2, bq.nextSibling);
							if (emptyInner && inner && inner.parentNode === bq) bq.removeChild(inner);
							if (bq.children.length === 0 || /^(\s|<br[^>]*>)*$/i.test(bq.innerHTML)) bq.parentNode.removeChild(bq);
							var r2 = editdoc.createRange();
							r2.setStart(p2, 0); r2.collapse(true);
							editsel.removeAllRanges(); editsel.addRange(r2);
							e.preventDefault();
							__SetTimeout_HandleSelectionChange();
							return;
						}
					}
				} catch (er) { /* ignore */ }
			}

			var rn = __Find_Selection_Root_Block();
			if (rn && editwin.getComputedStyle(rn).display == 'list-item') {
				// Do not apply enterKeyTag inside <li> elements.
				return;
			}

			// Scroll downward when the selection reaches the last visible line.

			__Ensure_Root_Block();

			var shift = e.shiftKey;
			if (shift && (config.shiftEnterKeyTag == null || config.shiftEnterKeyTag.toLowerCase() == "br")) {
				return;
			}

			//RTE_DefaultConfig.shiftEnterKeyTag = "p";//"div"

			if (shift) {
				e.preventDefault();
				return;
			}

			function EnterKeyDoFocus() {

				__AdjustScrollTop_ForInsertPoint();

				var rn0 = __Find_Selection_Root_Block();
				if (rn0 && !rn0.nextSibling) {
					rtecontent.scrollTop += 100;
					if (config.subtoolbar_floatparagraph) {
						__FPP_Scroll_It();
					}
				}
			}

			if (config.enterKeyTag && config.enterKeyTag.toLowerCase() == "br") {
				// 2026-05-08 bug fix: previously emitted <br/><br/> on every
				// Enter to work around an old IE / early-WebKit quirk where
				// a single trailing <br> did not anchor the contenteditable
				// caret on the new line. The double-emit created a
				// permanently-visible blank line between consecutive Enters,
				// e.g. typing "1", Enter, "2" produced
				//   1<br/><br/>2<br/>
				// when the user expected
				//   1<br/>2<br/>
				// (reported by Nathan Allen, 2026-05-08).
				//
				// We now emit a single <br/> and only fall back to the
				// double-br "filler" trick when the caret sits at the very
				// end of editable content with no following block to anchor
				// the cursor on. This preserves cursor-visibility for
				// "press Enter on the last line of an empty editor" while
				// fixing the consecutive-Enter case.
				var __ek_needsFiller = (function () {
					try {
						var r = _editsel_getRange();
						if (!r || !r.collapsed) return false;
						// Walk forward from the caret looking for any
						// content (element or non-whitespace text) inside
						// the editable. If nothing follows, we're at the
						// natural end of the document and need a filler.
						var node = r.endContainer;
						var off  = r.endOffset;
						if (node && node.nodeType === 3) {
							if (off < node.nodeValue.length) return false;
						} else if (node && node.nodeType === 1 && off < node.childNodes.length) {
							return false;
						}
						var cur = node;
						while (cur && cur !== editable) {
							if (cur.nextSibling) {
								var sib = cur.nextSibling;
								if (sib.nodeType === 1) return false;
								if (sib.nodeType === 3 && sib.nodeValue && sib.nodeValue.replace(/\s/g, "").length > 0) return false;
								cur = sib;
								continue;
							}
							cur = cur.parentNode;
						}
						return true;
					} catch (e) {
						return false;
					}
				})();
				__InsertHTML(__ek_needsFiller ? "<br/><br/>" : "<br/>");
				__Collapse(false);
				e.preventDefault();
				__QueueEnterScrollFocus(EnterKeyDoFocus);
				return;
			}


			__QueueEnterScrollFocus(function () {
				if (config.enterKeyTag) {
					__ExecFormatBlock(config.enterKeyTag);
					if (config.paragraphClass) {
						var tag = __Find_Selection_Root_Block();
						if (tag) tag.classList.add(config.paragraphClass);
					}
				}

				EnterKeyDoFocus();
			})
		}
	});
	__bindEditdoc("keydown", function (e) {
		if (!editable.contains(e.target))
			return;

		// Alt+Up / Alt+Down → move current block up / down (VS Code convention).
		if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
			if (e.key === "ArrowUp") { e.preventDefault(); try { __MoveCurrentBlock(-1); } catch (er) {} return; }
			if (e.key === "ArrowDown") { e.preventDefault(); try { __MoveCurrentBlock(1); } catch (er) {} return; }
		}

		if (e.ctrlKey || e.metaKey) {

			switch (e.key) {
				case "b":
					e.preventDefault();
					__Exec_Cmd_ForUI("bold");
					break;
				case "i":
					e.preventDefault();
					__Exec_Cmd_ForUI("italic");
					break;
				case "u":
					e.preventDefault();
					__Exec_Cmd_ForUI("underline");
					break;
				case "x":
					e.preventDefault();
					__Exec_Cmd_ForUI("cut");
					break;
				case "c":
					// Ctrl+Shift+C → detailed word-count modal (Google Docs convention).
					// Plain Ctrl+C remains copy.
					if (e.shiftKey) {
						e.preventDefault();
						__ShowWordCountModal();
					} else {
						e.preventDefault();
						__Exec_Cmd_ForUI("copy");
					}
					break;
				case "z":
					e.preventDefault();
					if (e.shiftKey) __Exec_Cmd_ForUI("redo");  // Ctrl+Shift+Z = redo (Mac-style)
					else __Exec_Cmd_ForUI("undo");
					break;
				case "y":
					e.preventDefault();
					__Exec_Cmd_ForUI("redo");
					break;
				case "k":
					e.preventDefault();
					__Exec_Cmd_ForUI("insertlink");
					break;
				case "f":
					e.preventDefault();
					__Exec_Cmd_ForUI("find");
					break;
				case "s":
					e.preventDefault();
					__Exec_Cmd_ForUI("save");
					break;
				case "V":
					// Ctrl+Shift+V → paste as plain text (the `case "v"` would
					// only match the lowercase variant; uppercase V is what's
					// fired when Shift is held).
					if (e.shiftKey) {
						e.preventDefault();
						__Exec_Cmd_ForUI("pastetext");
					}
					break;
			}
			// Ctrl+Alt+0..6 → headings + normal paragraph (industry-standard).
			// Mac users get ⌘+Option+number, Windows Ctrl+Alt+number.
			if (e.altKey && /^[0-6]$/.test(e.key)) {
				e.preventDefault();
				var lvl = e.key;
				if (lvl === "0") {
					try { __Exec_Cmd_Core("formatblock", "p"); }
					catch (er) { editdoc.execCommand("formatBlock", false, "<p>"); }
				} else {
					try { __Exec_Cmd_Core("formatblock", "h" + lvl); }
					catch (er) { editdoc.execCommand("formatBlock", false, "<h" + lvl + ">"); }
				}
			}
			// Ctrl+Shift+7 / 8 / 9 → ordered / bullet list / blockquote
			// (Google Docs convention, also used by many word processors).
			if (e.shiftKey && (e.key === "7" || e.key === "&")) {
				e.preventDefault();
				__Exec_Cmd_ForUI("insertorderedlist");
			}
			if (e.shiftKey && (e.key === "8" || e.key === "*")) {
				e.preventDefault();
				__Exec_Cmd_ForUI("insertunorderedlist");
			}
			if (e.shiftKey && (e.key === "9" || e.key === "(")) {
				e.preventDefault();
				__Exec_Cmd_ForUI("insertblockquote");
			}
			// Ctrl+Shift+X → strikethrough (Google Docs convention).
			if (e.shiftKey && (e.key === "X" || e.key === "x")) {
				e.preventDefault();
				__Exec_Cmd_ForUI("strikethrough");
			}
			// Ctrl+\ → clear formatting (Google Docs convention).
			if (!e.shiftKey && (e.key === "\\" || e.keyCode === 220)) {
				e.preventDefault();
				__Exec_Cmd_ForUI("removeformat");
			}
			// Ctrl+Shift+L / E / R / J → justify left / center / right / full (Google Docs).
			if (e.shiftKey && (e.key === "L" || e.key === "l")) {
				e.preventDefault();
				__Exec_Cmd_ForUI("justifyleft");
			}
			if (e.shiftKey && (e.key === "E" || e.key === "e")) {
				e.preventDefault();
				__Exec_Cmd_ForUI("justifycenter");
			}
			if (e.shiftKey && (e.key === "R" || e.key === "r")) {
				e.preventDefault();
				__Exec_Cmd_ForUI("justifyright");
			}
			if (e.shiftKey && (e.key === "J" || e.key === "j")) {
				e.preventDefault();
				__Exec_Cmd_ForUI("justifyfull");
			}
			// Ctrl+. / Ctrl+, → superscript / subscript (Word convention).
			if (!e.shiftKey && e.key === ".") {
				e.preventDefault();
				__Exec_Cmd_ForUI("superscript");
			}
			if (!e.shiftKey && e.key === ",") {
				e.preventDefault();
				__Exec_Cmd_ForUI("subscript");
			}
			// Ctrl+Shift+D → duplicate current block (Notion / VS Code).
			if (e.shiftKey && (e.key === "D" || e.key === "d")) {
				e.preventDefault();
				try { __DuplicateCurrentBlock(); } catch (er) { /* ignore */ }
			}
			// Ctrl+Shift+- or Ctrl+Shift+_ → insert horizontal rule.
			if (e.shiftKey && (e.key === "-" || e.key === "_")) {
				e.preventDefault();
				__Exec_Cmd_ForUI("inserthorizontalrule");
			}
			// Cmd/Ctrl+/ → keyboard shortcut cheat sheet.
			if (e.key === "/") {
				e.preventDefault();
				try { __ShowShortcutsModal(); } catch (er) { /* ignore */ }
			}
			// Cmd/Ctrl+Shift+K → cycle UPPER → lower → Title on selection (Word convention).
			if (e.shiftKey && (e.key === "K" || e.key === "k")) {
				e.preventDefault();
				try { __CycleSelectionCase(); } catch (er) { /* ignore */ }
			}
			// Cmd/Ctrl+Shift+H → toggle highlight (yellow <mark>) on selection.
			if (e.shiftKey && (e.key === "H" || e.key === "h")) {
				e.preventDefault();
				try { __ToggleHighlight(); } catch (er) { /* ignore */ }
			}
			// Cmd/Ctrl+Shift+Alt+S → sort selected paragraphs alphabetically.
			if (e.shiftKey && e.altKey && (e.key === "S" || e.key === "s")) {
				e.preventDefault();
				try { __SortSelectedLines(); } catch (er) { /* ignore */ }
			}
			// Cmd/Ctrl+Shift+M → toggle reading mode (minimal / distraction-free).
			if (e.shiftKey && (e.key === "M" || e.key === "m")) {
				e.preventDefault();
				try { editor.toggleReadingMode(); } catch (er) { /* ignore */ }
			}
		}
		//debuglog(e.key)
		if (__GetSelectedControl()) {
			if (e.key == "Delete" || e.key == "Backspace") {
				e.preventDefault();
				__Exec_Cmd_ForUI("delete");
			}
			// TODO: Add the remaining keyboard shortcuts here.
		}
		else if (!editsel.isCollapsed) {
			if (e.key == "Delete" || e.key == "Backspace") {
				e.preventDefault();
				__Exec_Cmd_ForUI("delete");
			}
		}
		else if (e.key === "Backspace" && config.backspaceOutdent !== false) {
			// Try blockquote exit first (companion to Enter-on-empty-blockquote).
			try { if (__BackspaceExitBlockquote()) { e.preventDefault(); return; } } catch (er) {}
			// 2026-05-11: Backspace at column 0 of a list item outdents instead
			// of merging with the previous paragraph. Industry-standard UX —
			// matches Word / Google Docs / Notion / TinyMCE 7.
			try {
				var sel = editsel;
				if (sel.isCollapsed && sel.anchorOffset === 0) {
					var n = sel.anchorNode;
					if (n) {
						// Walk to LI ancestor, tracking the first child path so we only
						// trigger at the visual start of the LI's contents.
						var li = null;
						var cur = n;
						var atStart = true;
						while (cur && cur !== editable && cur.nodeName !== "LI") {
							if (cur.previousSibling && cur.previousSibling.nodeType === 1 && cur.previousSibling.nodeName !== "BR") {
								atStart = false; break;
							}
							if (cur.previousSibling && cur.previousSibling.nodeType === 3 && cur.previousSibling.data) {
								atStart = false; break;
							}
							cur = cur.parentNode;
						}
						if (atStart && cur && cur.nodeName === "LI") {
							e.preventDefault();
							__Exec_Cmd_Core("outdent");
							return;
						}
					}
				}
			} catch (er) { /* ignore */ }
		}
	});

	var __ismousedown;
	var __sel_cells_start;
	var __sel_cells_end;

	function MakeSelectedCells(tds) {
		var arr = editdoc.querySelectorAll("[__rte_selected_cell]");
		for (var i = 0; i < arr.length; i++)
			arr[i].removeAttribute("__rte_selected_cell");
		if (tds) {
			for (var i = 0; i < tds.length; i++)
				tds[i].setAttribute("__rte_selected_cell", "");
		}
	}


	__bindEditdoc("mousemove", function (e) {

		var ccr = iframe.getBoundingClientRect();
		lastmouseclientx = ccr.left + e.clientX;
		lastmouseclienty = ccr.top + e.clientY;

		if (__ismousedown == "cells") {
			var t = __GetTable(__sel_cells_start);
			var te = __GetTableCell(editdoc.elementFromPoint(e.clientX, e.clientY));	// TODO: Verify behavior while the editor is scrolled.
			__sel_cells_end = null;
			if (te && __GetTable(te) == t) __sel_cells_end = te;
			var tds = _DoTableOperationCore("query", "querycells", t, __sel_cells_start, __sel_cells_end || __sel_cells_start);
			if (tds && tds.length > 1) {

			}
			else {
				tds = [__sel_cells_start];
			}
			__SelectDoc(true)
			MakeSelectedCells(tds);
		}
		else if (__ismousedown) {
			var tds = _DoTableOperation("query", "querycells");
			if (tds && tds.length > 1) {
				// Convert the selection into multi-cell mode.
				__ismousedown = "cells";
				__sel_cells_start = tds[0];
				__sel_cells_end = tds[1];
				__SelectDoc(true)
				MakeSelectedCells(tds);
			}
		}

	})


	__bindEditdoc("mouseup", function (e) {
		if (e.button == 0) __ismousedown = false;
	})


	__bindEditdoc("mousedown", function (e) {
		if (e.button == 0) __ismousedown = true;

		__sel_cells_start = null;
		__sel_cells_end = null;
		MakeSelectedCells();

		var node = e.target;
		if (!editable.contains(node))
			return;

		if (node.nodeName.toLowerCase() == "video-container") {
			if (node.firstChild && node.firstChild.nodeName == "IFRAME")
				node = node.firstChild;
		}

		switch (node.nodeName) {
			case "IFRAME":
			case "IMG":
				//if (__GetSelectedControl() == node) {
				//	e.preventDefault();
				//	return;
				//}
				setTimeout(function () {
					__SelectControl(node);
				}, 10);
				return;

		}

		if (__GetSelectedControl()) {
			var x = e.clientX;
			var y = e.clientY;
			setTimeout(function () {
				var ctrl = __GetSelectedControl();
				if (!ctrl) return;

				var br = ctrl.getBoundingClientRect();
				//debuglog(x, y, br)
				if (y > br.bottom) {
					//debuglog("bottom", br.bottom, y);
					// TODO: Collapse the drop range to the bottom edge.
				}
				else if (x > br.right) {
					//debuglog("right", br.right, x);
					// TODO: Collapse the drop range to the right edge.
				}
				if (y > br.bottom || x > br.right) {
					var r = editdoc.createRange();
					r.selectNodeContents(node);
					r.collapse(false);
					editsel.empty();
					editsel.addRange(r);
				}

			}, 1)
		}

	});

	// Handle clicks on the empty padding area inside the content surface.
	rtecontent.addEventListener("mousedown", function (e) {
		e.preventDefault();
		__Focus_Editor_Ensure();
		if (e.clientY > editarea.getBoundingClientRect().bottom)
			__SelectDoc(false);
	})

	//setInterval(function () {
	//	var sel = editdoc.getSelection();
	//	if (sel.rangeCount == 0)
	//		debuglog(sel)
	//	else
	//		debuglog(sel.getRangeAt(0));
	//}, 1000)

	function reportDragDropEvent(e) {
		//debuglog(e.type, e);
		//debuglog(e.dataTransfer);
		//debuglog(e.dataTransfer.items.length + '/' + e.dataTransfer.files.length);
		//function ReportItem(item) {

		//	var s = item.getAsString(function (str) {
		//		debuglog(str);
		//	})
		//	debuglog(item, s);
		//}
		//for (var i = 0; i < e.dataTransfer.items.length; i++) {
		//	ReportItem(e.dataTransfer.items[i]);
		//}
	}

	var _isdrag_started = false;
	var _isdrag_source;
	__bindEditdoc("dragstart", function (e) {
		_isdrag_started = true;
		_isdrag_source = e.target;
		//___SelectUI_Update();
		reportDragDropEvent(e);
	});
	__bindEditdoc("dragend", function (e) {

		if (!config.enableDragDrop) {
			e.preventDefault();
			return;
		}

		_isdrag_started = false
		reportDragDropEvent(e);
	});
	__bindEditdoc("dragover", function (e) {
		reportDragDropEvent(e);

		if (!config.enableDragDrop) {
			e.preventDefault();
			return;
		}

	});
	__bindEditdoc("drop", function (e) {
		reportDragDropEvent(e);

		__Focus_Editor_Delay();

		if (!config.enableDragDrop) {
			e.preventDefault();
			return;
		}

		if (_isdrag_started)	//self drag
		{
			// Ignore drags where an image is moved within the same editor.
			if (e.target == _isdrag_source) {
				e.preventDefault();
				return;
			}

			// Let the browser handle internal drag-and-drop moves natively.
			// Save undo state so the move can be reversed with Ctrl+Z.
			___CurrentBookmark_Save();
			return;
		}

		var item = e.dataTransfer.items[0];
		if (!item)
			return;//use browser default 

		if (e.dataTransfer.files.length != 0) {
			e.preventDefault();
			__Process_DataTransfer(e.dataTransfer, e);
			return;
		}

		//?{kind: "string", type: "text/plain"}
		//?{kind: "string", type: "text/html"}
		//return;
		var r = editdoc.caretRangeFromPoint(e.clientX, e.clientY);
		//debuglog(e.dataTransfer.items.length, item, e.dataTransfer.items[1])
		//debuglog(r,r.startContainer,r.startOffset)
		e.preventDefault();
		editsel.removeAllRanges();
		editsel.addRange(r);
		__Process_DataTransfer(e.dataTransfer, e);

	});
	__bindEditdoc("paste", function (e) {
		__Process_DataTransfer(e.clipboardData, e);
	});




	function __detectWordContent(html) {
		if (!html) return;
		if (html.indexOf('class="Mso') != -1)
			return true;
		if (html.indexOf('<o:p>') != -1)
			return true;
		if (/style\=[\"][^\"]*mso\-/.test(html))
			return true;
		if (/style\=[\'][^\']*mso\-/.test(html))
			return true;
	}

	function __Process_CliboardItems(items, pastecmdlower) {
		//debuglog(items);
		var dt = { types: [], items: [], files: [] };
		var e = { preventDefault: function () { } }

		function createItem(item, type) {
			return {
				getAsString: function (callback) {
					item.getType(type).then(function (blob) {
						blob.text().then(function (txt) {
							txt = String(txt);
							callback(txt);
						});
					});
				}
			};
		}

		for (var i = 0; i < items.length; i++) {
			for (var j = 0; j < items[i].types.length; j++) {
				var index = dt.types.length;
				dt.types.push(items[i].types[j]);
				dt.items.push(createItem(items[i], items[i].types[j]));
			}
		}
		__Process_DataTransfer(dt, e, pastecmdlower);
	}

	function __Process_DataTransfer(dt, e, pastecmdlower) {

		//debuglog(dt.types);

		if (!pastecmdlower) {
			if (e && e.type == "paste" && config.pasteMode) {
				switch (config.pasteMode.toLowerCase()) {
					case "disable":
					case "disabled":
						e.preventDefault();
						return;
					case "text":
					case "pastetext":
						pastecmdlower = "pastetext";
						break;
					case "word":
					case "pasteword":
						pastecmdlower = "pasteword";
						break;
				}
			}
		}

		var len = dt.types.length;

		function debugoutput(i) {

			var r1 = dt.items[i].getAsString(function (str) {
				debuglog("str=", str);
			});
			var r2 = dt.items[i].getAsFile(function (file) {
				debuglog("file=", file);
			});

			debuglog(dt.types[i], dt.items[i], r1, r2);

		}


		function process_text(item) {
			e.preventDefault();
			item.getAsString(process_text_string);
		}
		function process_text_string(str) {
			// 2026-05-27 Smart link paste: if the clipboard contains a URL (or
			// email) and there is a non-collapsed selection, wrap the selection
			// in <a href> instead of replacing it. Matches Google Docs / Notion
			// / TipTap / ProseMirror behavior. Disable with config.smartLinkPaste = false.
			if (config.smartLinkPaste !== false && editsel && editsel.rangeCount > 0 && !editsel.isCollapsed) {
				var trimmed = (str || "").trim();
				if (trimmed && trimmed.indexOf("\n") === -1 && trimmed.indexOf(" ") === -1) {
					var urlRe = /^(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)$/i;
					var emailRe = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
					var href = null;
					if (urlRe.test(trimmed)) {
						href = /^https?:\/\//i.test(trimmed) ? trimmed : "http://" + trimmed;
					} else if (emailRe.test(trimmed)) {
						href = "mailto:" + trimmed;
					}
					// Reject any javascript:/vbscript:/data: smuggled in the trimmed string.
					if (href && !/^(javascript|vbscript|data):/i.test(href)) {
						e.preventDefault();
						var safeHref = href.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
						// Capture the current selection text, then wrap.
						var range = editsel.getRangeAt(0);
						var selectedText = range.toString();
						if (selectedText) {
							__InsertHTML('<a href="' + safeHref + '">' + __HtmlEncode(selectedText) + '</a>');
							__Collapse(false);
							return;
						}
					}
				}
			}
			// Convert line breaks to <br> so pasted plain text keeps its layout.
			if (str.indexOf('\n') != -1) {
				var html = __HtmlEncode(str).replace(/\r?\n/g, '<br>');
				__InsertHTML(html);
			} else {
				__InsertText(str);
			}
			__Collapse(false);
		}

		function process_html_string(str, images) {
			debuglog(str)
			// Detect which source the paste came from so we can show a toast.
			var src = "";
			if (/class\s*=\s*["']?Mso/i.test(str) || /\bmso-/i.test(str) || /<!--\[if\s+(?:mso|gte mso)/i.test(str)) src = "Word";
			else if (/docs-internal-guid-/i.test(str)) src = "Google Docs";
			// 2026-05-27 Broadened source detection so the toast also recognizes
			// LibreOffice (uses class="ListParagraphCxSpFirst" / office: namespace tags),
			// Notion (uses data-block-id wrappers), Excel (uses table class="MsoNormalTable"
			// already covered by Word, but also xmlns:x="urn:schemas-microsoft-com:office:excel"),
			// Outlook (uses style="font-family:Calibri" + specific email headers),
			// and Confluence (uses class="confluence-embedded-image" + data-mce-mark).
			else if (/<\w+\s+[^>]*\b(?:office:|table:|text:)/i.test(str) || /class\s*=\s*["']?ListParagraphCx/i.test(str)) src = "LibreOffice";
			else if (/\bdata-block-id\s*=|notion-page-content|class\s*=\s*["']?notion-/i.test(str)) src = "Notion";
			else if (/xmlns:x\s*=\s*["']?urn:schemas-microsoft-com:office:excel/i.test(str)) src = "Excel";
			else if (/data-confluence|class\s*=\s*["']?confluence-/i.test(str)) src = "Confluence";

			//var p = str.indexOf("<!--StartFragment-->");
			var p = str.indexOf("<body");
			if (p != -1) {
				var bodyclose = str.indexOf(">", p + 5);
				if (bodyclose != -1) str = str.substring(bodyclose + 1);
			}
			//p = str.indexOf("<!--EndFragment-->");
			p = str.indexOf("</body>");
			if (p != -1) str = str.substring(0, p);
			//debuglog("insert html " + str.length)

			str = __removeWordCode(str, images)
			//debuglog(str);
			__InsertHTML(str);
			//__Collapse(false);
			if (src && config.smartPasteToast !== false) {
				try { __ShowSmartPasteToast(src); } catch (er) { /* ignore */ }
			}
		}

		function process_html(item) {
			e.preventDefault();
			item.getAsString(process_html_string);
		}
		function process_file(item) {
			e.preventDefault();
			__InsertFile(dt.files[0]);
		}

		var images = [];

		var handlers = [];

		var rtfparsed = false;
		var htmlhandler;
		var htmlstring;
		var texthandler;

		function process_rtf(item) {

			function process_html_now() {

				var file_upload_handler = config.file_upload_handler || window.rte_file_upload_handler;

				if (!images.length || !file_upload_handler)
					return process_html_string(htmlstring, images);

				var files = images.concat();

				var imageindex = 0;
				function NextImage() {
					var img = images[imageindex];
					file_upload_handler(img, function (url, error) {
						if (url) {
							images[imageindex] = url;
							imageindex++;
							if (imageindex < images.length)
								NextImage();
							else
								process_html_string(htmlstring, images);
							return;
						}
						if (error) {
							if (!InvokeEventHook("customdialog", "uploadfailed", String(error))) {
								alert("upload failed , " + error);
							}
						}
						else {
				alert("Developer warning : ");
						}
					}, imageindex, files);
				}
				NextImage();


			}

			function on_html_string(str) {
				htmlstring = str;
				if (rtfparsed)
					process_html_now();
			}

			for (var i = 0; i < handlers.length; i++) {
				var handler = handlers[i];
				if (handler.type == "text/html") {


				}
				if (handler.type == "text/plain") {
					texthandler = handler;
				}
			}

			if (!htmlhandler) {
				//if (!texthandler)
				//	return console.error("no text or html data?")
				//texthandler.process(texthandler.item);

				// Fall back to the default browser behavior.
				return;
			}

			e.preventDefault();

			htmlhandler.item.getAsString(on_html_string);

			var rv = item.getAsString(function (str) {
				var picindex = str.indexOf("{\\*\\shppict");

				while (picindex != -1) {

					//debuglog(picindex);

					picindex = str.indexOf("89504e47", picindex);	//?PNG
					if (picindex == -1)
						break;

					var endindex = str.indexOf("}", picindex);
					if (endindex == -1)
						break;

					var pnghex = str.substring(picindex, endindex);
					pnghex = pnghex.replace(/\s/g, '');
					var arr8 = new Uint8Array(pnghex.length / 2);
					//var arr = [];
					for (var i = 0; i < pnghex.length; i += 2) {
						var hi = pnghex.charCodeAt(i);
						var lo = pnghex.charCodeAt(i + 1);
						hi -= hi >= 97 ? 87 : 48;
						lo -= lo >= 97 ? 87 : 48;
						var val = hi * 16 + lo;
						//arr.push(String.fromCharCode(val));
						arr8[i / 2] = val;
					}

					//var pngcode = btoa(arr.join(""));

					var file = new Blob([arr8.buffer], { type: "image/png" });

					images.push(file);

					picindex = str.indexOf("{\\*\\shppict", endindex)
				}


				rtfparsed = true;
				if (htmlstring)
					process_html_now();

			});

			//debuglog(rv)
			//


		}


		for (var i = 0; i < len; i++) {
			var type = dt.types[i];
			var handler = null;
			switch (type) {
				case "text/plain":
					handler = { type: type, index: i, item: dt.items[i], priority: 4, process: process_text };
					texthandler = handler;
					break;
				case "text/html":
					handler = { type: type, index: i, item: dt.items[i], priority: 1, process: process_html };
					htmlhandler = handler;
					break;
				case "Files":
					handler = { type: type, index: i, item: dt.items[i], priority: 2, process: process_file };
					break;
				case "text/rtf":
					handler = { type: type, index: i, item: dt.items[i], priority: 3, process: process_rtf };
					break;
				case "image/png":	// navigator.clipboard.read() can return text/plain and image/png
				case "text/uri-list"://drag an <img/> tag?
				default:
					break;
			}
			if (handler) handlers.push(handler);
			//debugoutput(i);
		}

		if (handlers.length == 0)
			return;

		if (pastecmdlower == 'pastetext') {
			if (texthandler)
				texthandler.process(texthandler.item);
			return true;
		}

		handlers.sort(function (a, b) {
			return a.priority - b.priority;
		});

		handlers[0].process(handlers[0].item);

		return true;
	}


	function __removeWordCode(html, images) {

		var rootfn = editwin.getComputedStyle(editable).fontFamily;

		var imageindex = 0;

		function ConvertForWord_OnTag(match, tagname, attrline, index, text) {
			if (tagname[0] == '?' || tagname[0] == '!' || tagname.substring(0, 3) == "!--")
				return "";

			if (tagname[1] == ':' || (tagname[0] == "/" && tagname[2] == ':'))
				return "";

			if (tagname.charAt(0) == '/')
				return match;

			if (attrline.length == 0)
				return match;

			if (/\s*runat\s*=\s*[\x22\x27]?server/ig.test(attrline))
				return match;

			//debuglog(attrline)

			attrline = ConvertForWord_DoAttr(attrline);
			if (!attrline)
				return "<" + tagname + ">";

			if (images && imageindex < images.length && tagname.toLowerCase() == "img") {
				attrline = attrline.replace(/"file:\/\/\/(\S*)"/g, function (a, b, c) {
					var imgurl = images[imageindex++];
					//debuglog(a, b, c)
					return "'" + imgurl + "'";
				})
			}

			return "<" + tagname + " " + attrline + ">";
		}
		function ConvertForWord_DoAttr(attrline) {
			attrline = attrline.replace(/\s*([-a-zA-Z0-9_:]+)\s*=\s*([\s\S]*)/g, ConvertForWord_OnAttr);
			return attrline.trim();
		}
		function ConvertForWord_OnAttr(match, attrname, suffix, index, text, what) {

			var res = ConvertForWord_OnAttrInternal(match, attrname, suffix, index, text, what);
			return " " + res.trim();
		}
		function ConvertForWord_OnAttrInternal(match, attrname, suffix, index, text, what) {
			var attrnamelower = attrname.toLowerCase();

			var quote = suffix.charAt(0)
			if (quote == "'" || quote == '"') {
				var endpos = suffix.indexOf(quote, 1);
				if (endpos == -1) // No closing quote was found; treat the remaining suffix as the value.
					return ConvertForWord_OnAttrSingle(attrname, attrnamelower, quote, suffix.substring(1), null);
				var val = suffix.substring(1, endpos);
				var rest = suffix.substring(endpos + 1);
			}
			else {
				// Find the next empty slot.
				var endpos = suffix.indexOf(' ', 1);
				if (endpos == -1)
					endpos = suffix.indexOf('\n', 1);
				if (endpos == -1)//no blank ?
					return ConvertForWord_OnAttrSingle(attrname, attrnamelower, quote, suffix.substring(1), null);
				var val = suffix.substring(0, endpos);
				var rest = suffix.substring(endpos + 1);
				quote = '"';
			}

			return ConvertForWord_OnAttrSingle(attrname, attrnamelower, quote, val, rest);

		}
		function ConvertForWord_OnAttrSingle(attrname, attrnamelower, quote, val, rest) {

			switch (attrnamelower) {
				case "style":
					val = __HtmlDecode(val);
					val = ConvertForWord_DoStyle(val);
					val = __HtmlEncode(val);
					break;
				case "lang":
				case "onmouseover":
				case "onmouseout":
					val = null;
					break;
				case "class":
					// 2026-05-27 Strip not just Mso* (Word) but also tool-specific
					// class prefixes from Notion, CKEditor, TinyMCE, Confluence,
					// and Google Docs. Split into tokens, drop the tool-prefixed
					// ones, keep the rest. If nothing remains, null the whole attr.
					if (val.substring(0, 3) == "Mso") {
						val = null;
					} else {
						var classes = val.split(/\s+/).filter(function (c) {
							if (!c) return false;
							if (c.substring(0, 3) === "Mso") return false;
							if (/^notion[-_]/.test(c)) return false;
							if (/^cke[-_]/.test(c)) return false;
							if (/^mce[-_]/.test(c)) return false;
							if (/^confluence[-_]/.test(c)) return false;
							if (/^docs[-_]internal/.test(c)) return false;
							return true;
						});
						val = classes.length ? classes.join(" ") : null;
					}
					break;
				default:
					if (attrnamelower.indexOf(':') != -1)
						val = null;
					break;
			}
			if (val) {
				if (!rest)
					return attrname + "=" + quote + val + quote;
				return attrname + "=" + quote + val + quote + " " + ConvertForWord_DoAttr(rest);
			}
			else {
				if (!rest)
					return "";
				return " " + ConvertForWord_DoAttr(rest);
			}
		}
		function ConvertForWord_DoStyle(h) {



			//h = h.replace("color: rgb(0, 0, 0)", "");
			//h = h.replace(/([=;]?)\s*mso[^:]*:|margin: 0cm|padding: 0cm|text-indent: [-0][^;]*;*\s*/gi, '$1');
			//h = h.replace(/([=;]?)\s*font:|font-size-adjust:|font-stretch:[^;]*;*\s*/gi, '$1');
			//h = h.replace(/([=;]?)\s*font-variant:|page-break-before:|tab-stops:|white-space:[^;]*;*\s*/gi, '$1');
			//h = h.replace(/([=;]?)\s*border-top:|border-left:|border-bottom:|border-right:[^;]*;*\s*/gi, '$1');
			////h=h.replace( /([=;]?)\s*margin-top:|margin-left:|margin-bottom:|margin-right:[^;]*;*\s*/gi, '$1' ) ;
			//h = h.replace(/([=;]?)\s*border-style:|border-color:|border-right-color:|border-left-color:|border-bottom-color:|border-top-color:[^;]*;*\s*/gi, '$1');
			//h = h.replace(/([=;]?)\s*border-width:|border-right-width:|border-left-width:|border-bottom-width:|border-top-width:[^;]*;*\s*/gi, '$1');
			//h = h.replace(/([=;]?)\s*background-position:|background-repeat:[^;]*;*\s*/gi, '$1');
			//h = h.replace(/([=;]?)\s*position:|z-index:|tab-stops:[^;]*;*\s*/gi, '$1');
			//h = h.replace(/([=;]?)\s*background-color:[^;]*transparent[^;]*;*\s*/gi, '$1');

			var reslist = [];

			var harr = h.split(';');
			for (var i = 0; i < harr.length; i++) {
				var styleitem = harr[i];
				var colonPos = styleitem.indexOf(':');

				if (colonPos == -1)
					continue;

				var name = styleitem.substring(0, colonPos).trim();
				if (name.substring(0, 4) == "mso-")
					continue;

				var val = styleitem.substring(colonPos + 1).trim();

				var px = val.indexOf('!');
				if (px != -1) {
					val = val.substring(0, px).trim();
				}

				switch (name) {
					case "tab-stops":
					case "orphans":
					case "widows":
						continue;
					case "font-family":
						//debuglog(val, rootfn)
						if (val == rootfn)
							continue;
						break;
				}

				switch (val) {
					case "0px":
					case "0pt":
					case "0cm":
					case "initial":
						continue;
					case "inline":
						if (name == "display")
							continue;
						break;
					case "none":
					case "normal":
						switch (name) {
							case "letter-spacing":
							case "text-transform":
							case "font-variant-caps":
							case "font-variant-ligatures":
							case "font-style":
							case "white-space":
							case "float":
								continue;
						}
						break;
					case "rgb(0, 0, 0)":
						switch (name) {
							case "color":
								continue;
						}
						break;
					case "400":
						switch (name) {
							case "font-weight":
								continue;
						}
						break;
					case "medium":
						switch (name) {
							case "font-size":
								continue;
						}
						break;
					case "start":
						switch (name) {
							case "text-align":
								continue;
						}
					case "border-box":
						switch (name) {
							case "box-sizing":
								continue;
						}
						break;
				}
				reslist.push(styleitem);
			}

			return reslist.join(";");
		}

		function ConvertForWord(html) {
			html = html.replace(/<([^>\s]+)\s*([^>]*)>/g, ConvertForWord_OnTag);
			return html;
		}

		// 2026-05-19 Strip Word field instructions. MUST run BEFORE
		// ConvertForWord — that one removes the `style` attribute on every
		// element (including the `mso-element:field-*` markers we depend on
		// to identify field boundaries). Strategy:
		//   1. Match the begin → separator span pair AND every span between
		//      them (the instruction text). Drop the whole range; keep what's
		//      after the separator (the resolved field result).
		//   2. Match begin → end span pair (unresolved fields). Drop entirely.
		//   3. Match orphan field-end span markers (e.g. mid-edit field break).
		// Tolerant of: single/double/unquoted attribute values, multi-line
		// span content, multi-attribute tags, and any whitespace.
		function _StripWordFields(h) {
			var FB = "mso-element\\s*:\\s*field-begin";
			var FS = "mso-element\\s*:\\s*field-separator";
			var FE = "mso-element\\s*:\\s*field-end";
			// Begin → separator inclusive (keeps content AFTER separator)
			h = h.replace(new RegExp("<span\\b[^>]*" + FB + "[^>]*>[\\s\\S]*?<span\\b[^>]*" + FS + "[^>]*>[\\s\\S]*?<\\/span>", "gi"), "");
			// Begin → end inclusive (drops entire unresolved field including instruction text)
			h = h.replace(new RegExp("<span\\b[^>]*" + FB + "[^>]*>[\\s\\S]*?<span\\b[^>]*" + FE + "[^>]*>[\\s\\S]*?<\\/span>", "gi"), "");
			// Orphan field-end markers
			h = h.replace(new RegExp("<span\\b[^>]*" + FE + "[^>]*>[\\s\\S]*?<\\/span>", "gi"), "");
			// Belt-and-braces: drop stray bare instruction text in its own paragraph
			h = h.replace(/<(?:p|o:p)\b[^>]*>\s*(?:&nbsp;\s*)*(TOC|INDEX|REF|PAGEREF|HYPERLINK|SEQ|STYLEREF|NOTEREF|FORMTEXT|FORMCHECKBOX|DATE|TIME|FILENAME|AUTHOR|TITLE|SUBJECT)\b\s+\\[\s\S]*?<\/(?:p|o:p)>/gi, '');
			// Also: a bare <span>...TOC \h..</span> that escaped because its
			// surrounding field-begin / field-separator spans got stripped by
			// other passes — the instruction text always starts with the field
			// verb and a backslash switch like \h, \u, \z, \t, \o.
			h = h.replace(/<span\b[^>]*>\s*(TOC|INDEX|REF|PAGEREF|HYPERLINK|SEQ|STYLEREF|NOTEREF|FORMTEXT|FORMCHECKBOX|DATE|TIME|FILENAME|AUTHOR|TITLE|SUBJECT)\b\s+\\[\s\S]*?<\/span>/gi, '');
			// 2026-05-27 Continuation: Word sometimes splits the instruction text
			// across multiple <span> runs (e.g. `<span> TOC \h </span><span>\z \t "Heading 1,1" </span>`).
			// The verb-starting span above gets stripped first; this second pass
			// catches any sibling continuation span whose content consists only
			// of backslash-switches (\h, \u, \z, \t, \o, \@, \p, \* MERGEFORMAT, etc.),
			// optional quoted args, optional digits/commas, and whitespace. Real
			// prose virtually never matches this shape.
			h = h.replace(/<span\b[^>]*>\s*\\[a-zA-Z@*][\s\\a-zA-Z0-9@*"',.\-]*<\/span>/g, function (m) {
				// Extra safety: require it to look field-switch-ish — at least one
				// `\letter` pattern, and reject if it contains > 60 chars or any
				// punctuation that is not in the switch-arg vocabulary.
				var body = m.replace(/^<span\b[^>]*>\s*/, '').replace(/<\/span>$/, '');
				if (body.length > 120) return m; // too long, probably real text
				if (!/\\[a-zA-Z@*]/.test(body)) return m; // no switch, leave alone
				if (/[^a-zA-Z0-9@*\\\s"',.\-]/.test(body)) return m; // contains unusual chars, leave alone
				return '';
			});
			// 2026-05-27 Sweep up empty-span debris left behind by field-strip:
			// after we remove field-begin/separator/end spans (which are usually
			// self-empty in Word's HTML), bare `<span></span>` and
			// `<span lang=EN-US></span>` placeholders remain. Drop them so the
			// editor doesn't accumulate visible-but-empty <span>'s every paste.
			h = h.replace(/<span\b[^>]*>\s*<\/span>/gi, '');
			// Also: paragraphs that are now empty after the field strip
			// (e.g. `<p><span></span><span></span></p>` -> `<p></p>`) — drop them too.
			h = h.replace(/<p\b[^>]*>\s*<\/p>/gi, '');
			return h;
		}

		function _RemoveWord(h) {

			// 2026-05-27 Defense-in-depth: strip <head>/<style>/<meta>/<title>/<link>/<script>
			// blocks that Word, LibreOffice, and Excel sometimes emit. process_html_string
			// already trims to the body envelope upstream, but a customer calling
			// `__removeWordCode` directly (or pasting a HTML fragment without
			// <body> markers) would otherwise leak these elements into the editor
			// where they could globally restyle the surrounding page.
			h = h.replace(/<style\b[\s\S]*?<\/style>/gi, '');
			h = h.replace(/<script\b[\s\S]*?<\/script>/gi, '');
			h = h.replace(/<head\b[\s\S]*?<\/head>/gi, '');
			h = h.replace(/<(?:meta|title|link|base)\b[^>]*\/?>/gi, '');

			// 2026-05-27 Strip tool-specific data-* attributes from pasted markup.
			// These are noise: they only mean something to the source tool
			// (Notion's block ids, TinyMCE/CKEditor's editor state, Atlassian/Google's
			// embed metadata). Removing them keeps the editor's content small
			// and round-trip-safe. Legitimate custom data-* attributes (data-id,
			// data-href, etc.) are preserved because the whitelist below targets
			// only the well-known tooling prefixes.
			h = h.replace(/\sdata-(?:block-id|block-type|block-content|node-type|node-id)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
			h = h.replace(/\sdata-cke-[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
			h = h.replace(/\sdata-mce-[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
			h = h.replace(/\sdata-confluence-[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
			h = h.replace(/\sdata-google-[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
			h = h.replace(/\sdata-notion-[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

			//h = h.replace(/<[\/]?(font|st1|shape|path|lock|imagedata|stroke|formulas|xml|del|ins|[ovwxp]:\w+)[^>]*?>/gi, '');
			//h = h.replace(/\s*style="\s*"/gi, '');
			//h = h.replace(/<SPAN\s*[^>]*>\s* \s*<\/SPAN>/gi, ' ');
			//h = h.replace(/<(\w+)[^>]*\sstyle="[^"]*DISPLAY\s?:\s?none(.*?)<\/\1>/ig, '')
			//h = h.replace(/<span\s*[^>]*>\s*&nbsp;\s*<\/span>/gi, '&nbsp;');
			//h = h.replace(/<(\w[^>]*) lang=([^ |>]*)([^>]*)/gi, "<$1$3");
			//h = h.replace(/<SPAN\s*>(.*?)<\/SPAN>/gi, '$1');
			//h = h.replace(/<\/?\w+:[^>]*>/gi, '');
			//h = h.replace(/<\!--.*?-->/g, '');
			//h = h.replace(/<a name=[^>]+>(.*?)<\/a>/gi, "$1");
			//h = h.replace(/<p[^>]*>[\s|&nbsp;]*<\/p>/gi, '');
			////h=h.replace(/&nbsp;&nbsp;/gi,'&nbsp; ');
			//h = h.replace(/(<td[^>]*>)\s*(<\/td>)/gi, '$1&nbsp;$2');
			//h = h.replace(/line-height: normal;|font-size: medium;|font-size: 7pt|align="left"?/gi, '');
			//h = h.replace(/v:shapes=|v:shape="[^"]+"/ig, '');
			//if (h.indexOf('class="Mso') != -1)
			//	h = h.replace(/<img+.[^>]*>/gi, '');

			h = h.replace(/<SPAN\s*[^>]*><\/SPAN>/gi, '');

			// 2026-05-11 Strip Google Docs paste artefacts. Google Docs wraps the
			// entire paste payload in <b id="docs-internal-guid-...">…</b> which
			// would otherwise make everything bold. Drop the wrapper <b>, keep
			// its inner content. Also strip the `id` attribute pattern when it
			// appears on a non-bold tag.
			h = h.replace(/<b\b[^>]*\bid\s*=\s*["']docs-internal-guid-[^"']*["'][^>]*>([\s\S]*?)<\/b>/gi, "$1");
			h = h.replace(/\sid\s*=\s*["']docs-internal-guid-[^"']*["']/gi, "");

			// 2026-05-11 Strip Word's internal bookmark anchors. MS Word inserts
			// <a name="OLE_LINK1">...</a> / <a name="_Toc...">...</a> / etc. as
			// internal bookmarks; pasted into a contentEditable they render as
			// blue underlined text (browsers treat any <a> as a link). Outlook
			// and Gmail strip these by default. We match anchors that have a
			// `name` attribute but NO `href` so real hyperlinks survive.
			// Replaces the anchor with its inner content.
			h = h.replace(/<a\b(?![^>]*\shref\s*=)[^>]*\bname\s*=\s*["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, '$1');
			// Also strip empty <a name="..."></a> anchors (Word emits these too).
			h = h.replace(/<a\b(?![^>]*\shref\s*=)[^>]*\bname\s*=\s*["'][^"']*["'][^>]*><\/a>/gi, '');

			// 2026-05-19 Word-field strip moved to _StripWordFields(), called
			// BEFORE ConvertForWord (which removes the `style` attribute the
			// regex needs to match). Keep just the bare-paragraph leak catch
			// here, in case the structure survived past attribute stripping.
			h = h.replace(/<(?:p|o:p)\b[^>]*>\s*(?:&nbsp;\s*)*(TOC|INDEX|REF|PAGEREF|HYPERLINK|SEQ|STYLEREF|NOTEREF|FORMTEXT|FORMCHECKBOX|DATE|TIME|FILENAME|AUTHOR|TITLE|SUBJECT)\b[^<]*<\/(?:p|o:p)>/gi, '');

			// (Word list conversion moved to BEFORE ConvertForWord — see __removeWordCode caller.
			// ConvertForWord_OnAttrSingle nulls class="Mso*" and drops mso-* style properties,
			// so by the time control reaches here the list metadata is gone.)

			// Remove XML namespace tags that come from Word or Office HTML.
			h = h.replace(/<\/?\w+:[^>]*>/gi, '');
			// Remove XML comments.
			h = h.replace(/<\!--\[if[\s\S]*?<\!\[endif\]-->/gi, '');

			return h;
		}

		function _ConvertWordLists(h) {
			// Convert Word list paragraphs into proper HTML lists.
			//
			// Word marks list items as:
			//   <p class=MsoListParagraph style="mso-list:l0 level2 lfo1">
			//     <![if !supportLists]><span style="font-family:Symbol">&middot;<span>&nbsp;&nbsp;</span></span><![endif]>Item
			//   </p>
			//
			// Signal                         → result
			// ------------------------------ → -------------------------------
			// level{N} (N = 1..9)            → nesting depth
			// bullet glyph in marker span    → <ul>
			// digit / letter followed by . ) → <ol>  (and list-style-type)
			// list-id changes (l0 → l1)      → close current list, open new
			//
			// This MVP-level converter handles the 95% case: mixed ordered /
			// unordered, nested to any depth, with the actual bullet glyphs
			// stripped. It does NOT try to preserve Word's exact numbering
			// continuation across interruptions — that's a rare edge case
			// and we'd rather produce clean HTML than fight Word semantics.

			var paragraphs = h.split(/(<\/p>)/gi);
			var out = '';
			var stack = []; // array of { type: 'ul'|'ol', level: N, listId: 'l0' }

			function closeTo(level, listId) {
				while (stack.length > 0) {
					var top = stack[stack.length - 1];
					if (top.level < level) return; // Keep deeper nesting open.
					if (top.level === level && top.listId === listId) return; // Reuse the current list at the same level.
					out += '</li></' + top.type + '>';
					stack.pop();
				}
			}

			function closeAll() {
				while (stack.length > 0) {
					var top = stack.pop();
					out += '</li></' + top.type + '>';
				}
			}

			for (var i = 0; i < paragraphs.length; i++) {
				var seg = paragraphs[i];
				if (/^<\/p>$/i.test(seg)) {
					// Only consumed when we're inside a list item (where we
					// emit </li> on the next iteration). Outside lists, keep
					// the </p> in output.
					if (stack.length > 0 && _lastEmittedWasListItem) {
						// Defer until the next paragraph or the end of the list.
						out += '';
					} else {
						out += seg;
					}
					continue;
				}

				var isListPara = /class\s*=\s*"?[^">]*MsoListParagraph/i.test(seg) || /mso-list\s*:/i.test(seg);
				if (!isListPara) {
					if (stack.length > 0) closeAll();
					out += seg;
					_lastEmittedWasListItem = false;
					continue;
				}

				// Extract metadata from the <p> open tag.
				var openTag = (seg.match(/<p[^>]*>/i) || [''])[0];
				var msoList = (openTag.match(/mso-list\s*:\s*([^;"']+)/i) || [, ''])[1];
				var listIdMatch = msoList.match(/l\d+/i);
				var levelMatch = msoList.match(/level(\d+)/i);
				var listId = listIdMatch ? listIdMatch[0].toLowerCase() : 'l0';
				var level = levelMatch ? parseInt(levelMatch[1], 10) : 1;
				if (isNaN(level) || level < 1) level = 1;

				// Determine ul vs ol from the marker span.
				// Word's marker is wrapped in <![if !supportLists]>...<![endif]>
				// so it may be stripped already if we removed comments first.
				// We also check the first visible text for a number/letter + . or ).
				var listType = 'ul';
				var markerHtml = (seg.match(/<!\[if\s*!supportLists\]>([\s\S]*?)<!\[endif\]>/i) || [, ''])[1];
				if (!markerHtml) {
					// Fallback: first <span> at the start of the para.
					var firstSpan = seg.match(/<p[^>]*>\s*(?:<[^>]+>\s*)*<span[^>]*>([\s\S]*?)<\/span>/i);
					if (firstSpan) markerHtml = firstSpan[1];
				}
				var markerText = markerHtml
					.replace(/<[^>]*>/g, '')
					.replace(/&nbsp;/g, ' ')
					.replace(/&[a-z]+;/gi, '')
					.trim();
				if (/^[0-9]+[.)]/.test(markerText) || /^[a-z]+[.)]$/i.test(markerText) || /^[ivxlcdm]+[.)]$/i.test(markerText)) {
					listType = 'ol';
				}

				// Open / close lists to match the desired depth.
				closeTo(level, listId);
				while (stack.length < level) {
					var newType = (stack.length === level - 1) ? listType : 'ul';
					out += '<' + newType + '>';
					stack.push({ type: newType, level: stack.length + 1, listId: listId });
				}
				// Close previous <li> at the same depth (if any).
				if (_lastEmittedWasListItem && stack.length > 0) {
					out += '</li>';
				}

				// Extract inner content: strip the <p...> opening tag, the
				// marker conditional block, and any leading <span> that held
				// the bullet glyph.
				var content = seg.replace(/<p[^>]*>/i, '');
				content = content.replace(/<!\[if\s*!supportLists\]>[\s\S]*?<!\[endif\]>/gi, '');
				// Also strip a leading bullet-only <span> pattern when conditional comments were already removed.
				content = content.replace(/^\s*<span[^>]*>\s*(?:[\u00B7\u2022\u25E6\u25CF\u25CB\u25A0\u25A1\u00A7\u2014\u2013oO]|&middot;|&bull;|&#183;|&#8226;|[0-9]+[.)]|[a-z]+[.)])[\s\S]{0,8}?<\/span>/i, '');
				// Trim leading non-breaking spaces left behind after marker removal.
				content = content.replace(/^\s*(?:&nbsp;|\s)+/i, '');

				out += '<li>' + content;
				_lastEmittedWasListItem = true;
			}

			closeAll();
			return out;
		}

		// Module-scope flag used by _ConvertWordLists to defer </li> emission.
		// until we know the next paragraph's list identity.
		var _lastEmittedWasListItem = false;

		//var arr = [];
		//this.__CreateHtmlFilter(arr, null, "clean_pastewordfilter", "remove", $rte.__Filter_PasteWordFilter, "removeword");

		//html = this.__filterHtmlByFilterList(html, "clean_wordfilter", arr);

		// 2026-05-19 Strip Word field instructions BEFORE attribute-scrubbing.
		// ConvertForWord's attribute filter removes <span style="mso-element:..."> 's
		// style attribute, which would leave the field markers indistinguishable
		// from regular spans and let the instruction text leak through.
		html = _StripWordFields(html);
		// 2026-05-27 Convert Word list paragraphs BEFORE ConvertForWord.
		// Same root cause as the field-strip bug: ConvertForWord_OnAttrSingle
		// nulls `class="Mso*"` and drops every `mso-*` style property, so by
		// the time _RemoveWord's old in-line call ran the list metadata was
		// already gone. Pre-converting here means real <ul>/<ol> markup is
		// emitted before the scrubber runs.
		if (html.indexOf('MsoListParagraph') != -1 || html.indexOf('mso-list') != -1) {
			html = _ConvertWordLists(html);
		}
		html = ConvertForWord(html);
		html = _RemoveWord(html);

		return html;
	}


	function __FilterLogic_RemoveTags(tags, onlyEmpty) {

	}
	function __FilterLogic_RemoveXmlTags(prefixes, onlyEmpty) {

	}
	function __FilterLogic_RemoveWordStyle() {

	}
	function __FilterLogic_BatchFilter(flters) {

	}
	function __FilterLogic_RemoveEmptyMargin() {

	}
	function __FilterLogic_RemoveEmpty() {

	}
	function __FilterLogic_FixAccessbility() {

	}
	function __FilterLogic_MergeStyle() {

	}
	function __FilterLogic_EncodeSpecialChars() {

	}

	var __buildinhtmlfilters;
	var __externalhtmlfilters;
	function __CreateHtmlFilter() {
		if (__buildinhtmlfilters)
			return __buildinhtmlfilters.concat(__externalhtmlfilters || []);

		var arr = [];
		function CreateHtmlFilterItem(name, mode, logic) {
			var filter = {};

			filter._name = name;
			filter._langtext = __GetLangText(name);
			filter._mode = mode;
			filter._logic = logic;

			arr.push(filter);
		}

		CreateHtmlFilterItem("clean_removecomments", "remove", __FilterLogic_RemoveTags(["#comment"]));
		CreateHtmlFilterItem("clean_removefonts", "remove", __FilterLogic_RemoveTags(["font"]));

		var wordfilters = [];
		wordfilters.push(__FilterLogic_RemoveTags(["lang"]));
		wordfilters.push(__FilterLogic_RemoveXmlTags(["o"]));
		wordfilters.push(__FilterLogic_RemoveXmlTags(["v"]));
		wordfilters.push(__FilterLogic_RemoveWordStyle());

		CreateHtmlFilterItem("clean_wordfilter", "remove", __FilterLogic_BatchFilter(wordfilters));

		CreateHtmlFilterItem("clean_removeemptymargin", "remove", __FilterLogic_RemoveEmptyMargin());
		CreateHtmlFilterItem("clean_removespannoattr", "remove", __FilterLogic_RemoveTags(["span"], true));
		CreateHtmlFilterItem("clean_removeemptytags", "remove", __FilterLogic_RemoveEmpty());
		CreateHtmlFilterItem("clean_fixaccessbility", "repair", __FilterLogic_FixAccessbility());
		CreateHtmlFilterItem("clean_mergestyle", "repair", __FilterLogic_MergeStyle());
		CreateHtmlFilterItem("clean_encodespecialchars", "repair", __FilterLogic_EncodeSpecialChars());

		__buildinhtmlfilters = arr;
		return __buildinhtmlfilters.concat(__externalhtmlfilters || []);
	}


	//debuglog(__CreateHtmlFilter());









	subtoolbar.onclick = toolbarDesktop.onclick = toolbarMobile.onclick = function (e) {
		__SaveMouseEvent(e);
		setTimeout(function () {

			if (__IsDialogJustShow())
				return;

			var dae = document.activeElement;
			if (dae == document.body
				||
				(dae.nodeName != "INPUT" && container.contains(dae) && !rtecontent.contains(document.activeElement))
			) {
				__Focus_Editor_Ensure();
			}
		}, 50)
	};


	function _CreateToolbarItem(cmd, cmdsuffix, ownerElement) {
		var factory = config["toolbarfactory_" + cmd] || __toolbar_item_factory_map[cmd] || __Default_ToolbarItemFactory;
		var nodectrl = factory.apply(editor, [cmd, cmdsuffix, ownerElement])
		return nodectrl;
	}

	var __toolbar_item_factory_map = {

	}

	var __setimagemap;

	function ___SetOfficeToolbarImg(span, imgname, specialmode) {
		if (__setimagemap == null) {
			__setimagemap = {};
			// 2026-05-08 bug fix: `config._allimageindexdata` is supplied by
			// `rte-config.js`, which not every host page loads. Without the
			// guard, `___SetOfficeToolbarImg` was called as a no-svg-icon
			// fallback in __SetImageForCmd line 3761 even when not in office
			// mode, throwing "Cannot read properties of undefined (reading
			// 'split')" on every editor construction. Treat a missing
			// indexdata as an empty image-strip — the function will return
			// `undefined` (no match), and __SetImageForCmd will fall through
			// to its SVG / default-icon branches as it would on a host that
			// only ships SVG icons.
			var indexdata = config && config._allimageindexdata;
			if (typeof indexdata === "string" && indexdata.length > 0) {
				var arr = indexdata.split(',');
				for (var i = 0; i < arr.length; i++)
					__setimagemap[arr[i]] = i;
			}
		}
		var classicimage = imgname;
		switch (imgname) {
			case "new": classicimage = "newdoc"; break;
			case "spellcheck": classicimage = "spell"; break;
			case "linethrough": classicimage = "strike"; break;
			case "underline": classicimage = "under"; break;
			case "underlinemenu": classicimage = "under"; break;
			case "changecase": classicimage = "ucase"; break;
			case "removeformat": classicimage = "unformat"; break;
			case "cleancode": classicimage = "cleanup"; break;
			case "justifyleft": classicimage = "left"; break;
			case "justifycenter": classicimage = "center"; break;
			case "justifyright": classicimage = "right"; break;
			case "justifymenu": classicimage = "left"; break;
			case "insertlinemenu": classicimage = "break"; break;
			case "ltr": classicimage = "dir_ltr"; break;
			case "rtl": classicimage = "dir_rtl"; break;
			case "insertblockquote": classicimage = "blockquote"; break;
			case "insertorderedlist": classicimage = "numlist"; break;
			case "insertunorderedlist": classicimage = "bullist"; break;
			case "inserttextarea": classicimage = "textarea"; break;
			case "insertinptext": classicimage = "textbox"; break;
			case "insertbox": classicimage = "box"; break;
			case "insertlayer": classicimage = "layer"; break;
			case "insertfieldset": classicimage = "groupbox"; break;
			case "fullscreen": classicimage = "fit"; break;
			case "toggleborder": classicimage = "borders"; break;
			case "insertlink": classicimage = "link"; break;
			case "insertanchor": classicimage = "anchor"; break;
			case "insertimagemap": classicimage = "imagemap"; break;
			case "insertchars": classicimage = "specialchar"; break;
			case "virtualkeyboard": classicimage = "keyboard"; break;
			case "insertgallery": classicimage = "gallery"; break;
			case "insertimage": classicimage = "image"; break;
			case "inserttemplate": classicimage = "template"; break;
			case "insertdocument": classicimage = "document"; break;
			case "insertvideo": classicimage = "media"; break;
			case "syntaxhighlighter": classicimage = "code"; break;
			case "insertyoutube": classicimage = "youtube"; break;
			case "googlemap": classicimage = "map"; break;
		}
		if (classicimage in __setimagemap) {
			var imgstyle = "display:inline-block;width:24px;height:24px;background-repeat:no-repeat;background-clip: content-box;border: 2px solid transparent;";
			if (__officeToolbarMode || specialmode == "menu")
				imgstyle = "display:inline-block;width:20px;height:20px;background-repeat:no-repeat;"
			var img = __Append(span, "toolbar-img", imgstyle);
			img.style.backgroundImage = "url('" + __GetUrlByName("pngCode_all") + "')";
			img.style.backgroundPositionY = -__setimagemap[classicimage] * 20 + "px";
			if (specialmode == "rotate")
				img.style.transform = "scaley(0.75) scalex(1.25) rotate(-90deg)"

			return true;
		}
	}

	function __SetImageForCmd(span, cmd) {

		if (!span.getAttribute("rte-cmd-name"))
			span.setAttribute("rte-cmd-name", cmd);

		var imgname = cmd.toLowerCase();

		if (__officeToolbarMode) {
			if (___SetOfficeToolbarImg(span, imgname))
				return;
		}

		var svgcode = config["svgCode_" + imgname];
		if (!svgcode) {
			//debuglog("svgcode not found for " + imgname)
			// Map command aliases to their icon names.
			var allimgname = imgname;
			var specialmode = null;
			switch (imgname) {
				case "tablecell":
				case "menu_tablecell":
					allimgname = "cell";
					break;
				case "tablecellmerge":
					allimgname = "mrgcell";
					break;
				case "tablecellsplitver":
					allimgname = "spltcell";
					break;
				case "tablecellsplithor":
					allimgname = "spltcell";
					break;
				case "tablecellforecolor":
					allimgname = "forecolor";
					break;
				case "tablecellbackcolor":
					allimgname = "backcolor";
					break;
				case "tablerowinsertabove":
					allimgname = "insrow_t";
					break;
				case "tablerowinsertbelow":
					allimgname = "insrow_b";
					break;
				case "tablerowdelete":
					allimgname = "delrow";
					break;
				case "tablerow":
				case "menu_tablerow":
					allimgname = "row";
					break;
				case "tablecolumn":
				case "menu_tablecolumn":
					allimgname = "row";
					specialmode = "rotate";
					break;
				case "tablecolumninsertleft":
					allimgname = "inscol_l";
					break;
				case "tablecolumninsertright":
					allimgname = "inscol_r";
					break;
				case "tablecolumndelete":
					allimgname = "delcol";
					break;
				case "table":
				case "menu_table":
					allimgname = "inserttable";
					break;
				case "tabledelete":
					allimgname = "delete";
					break;
				default:
					break;
			}
			//debuglog(allimgname)
			if (___SetOfficeToolbarImg(span, allimgname, specialmode))
				return;
		}

		//var url = __GetUrlByCode(svgcode || config.svgCode_default);
		//span.innerHTML = "<img src='" + url + "'/>";
		//span.style.backgroundImage = "url(\"" + url + "\")";

		if (!svgcode) {
			var p = cmd.indexOf('_');
			if (p != -1) {
				__SetImageForCmd(span, cmd.substring(p + 1))
				return;
			}
		}

		span.innerHTML = svgcode || config.svgCode_default || '';
		var svg = span.firstChild;
		if (!svg) {
			// No SVG resolved for this command — likely a plugin button whose
			// svgCode entry isn't registered yet. Render an empty button rather
			// than blowing up the toolbar build.
			return;
		}
		svg.style.cssText = 'width:100%;height:100%;margin:0px;border:0;';
		svg.style.alignSelf = 'self-start';
	}

	//function __Insert_Simple_Button(name) {

	//	__toolbar_item_factory_map[name] = function (cmd) {

	//		var span = document.createElement("rte-toolbar-button");
	//		span.command = cmd;
	//		span.style.cssText = 'position:relative;';
	//		span.setAttribute(config.tooltipAttribute, __GetLangText(cmd));
	//		__SetImageForCmd(span, cmd);

	//		span.onclick = function () {
	//			if (span.classList.contains("rte-command-disabled"))
	//				return;
	//			__Exec_Cmd_ForUI(name);
	//		}

	//		return span;
	//	}
	//}

	//__Insert_Simple_Button("bold");
	//__Insert_Simple_Button("italic");
	//__Insert_Simple_Button("underline");
	//__Insert_Simple_Button("superscript");
	//__Insert_Simple_Button("subscript");
	//__Insert_Simple_Button("removeformat");
	//__Insert_Simple_Button("justifyleft");
	//__Insert_Simple_Button("justifyright");
	//__Insert_Simple_Button("justifycenter");
	//__Insert_Simple_Button("indent");
	//__Insert_Simple_Button("outdent");
	//__Insert_Simple_Button("insertorderedlist");
	//__Insert_Simple_Button("insertunorderedlist");
	//__Insert_Simple_Button("unlink");


	__toolbar_item_factory_map["pmore"] = function (cmd) {
		var span = __Default_ToolbarItemFactory(cmd);
		span.onclick = function (e) {
			__SaveMouseEvent(e);
			__Create_DownDown_Paragraph(span);
		}
		return span;
	}
	__toolbar_item_factory_map["paragraphop"] = function (cmd) {
		var span = __Default_ToolbarItemFactory(cmd);
		span.onclick = function (e) {
			__SaveMouseEvent(e);
			__Create_DownDown_Paragraph(span);
		}
		return span;
	}

	__toolbar_item_factory_map["find"] = function (cmd) {
		return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {

			var styleforlabel = "display:inline-block;position:static;width:100px;min-height:20px;padding-left:15px;background-color:transparent;box-shadow:none";

			var div1 = __Append(panel, "rte-dialog-line-keyword", "", "rte-dialog-line-input");
			var labelkeyword = __Append(div1, "rte-dialog-input-label", styleforlabel);
			labelkeyword.innerText = __GetLangText("findwhat");
			var inpkeyword = __Append(div1, "input", "width:280px;margin-right:12px");
			inpkeyword.type = "text";

			_SetInputValueClassLogic(inpkeyword, editor._last_find_text)

			setTimeout(function () { inpkeyword.focus(); }, 10);

			__Hook_Enter_Callback(inpkeyword, function () {
				button.onclick();
			})

			__Hook_Close_CurrentPopup_ByEsc(panel);

			var div2 = __Append(panel, "rte-dialog-line-replace", "", "rte-dialog-line-input");
			var labelreplace = __Append(div2, "rte-dialog-input-label", styleforlabel);
			labelreplace.innerText = __GetLangText("replacewith");
			var inpreplace = __Append(div2, "input", "width:280px;margin-right:12px");
			inpreplace.type = "text";

			_SetInputValueClassLogic(inpreplace)

			var div3 = __Append(panel, "rte-dialog-line-matchcase", "", "rte-dialog-line-input");
			__Append(div3, "rte-dialog-input-label", styleforlabel);
			var label3 = __Append(div3, "label", "width:280px;margin-right:22px");
			var cb_matchcase = __Append(label3, "input", "margin:2px;transform:translate(0,1px)");
			__Append(label3, "span", "margin:0 0 2px 6px").innerText = __GetLangText("matchcase");
			cb_matchcase.type = "checkbox"
			cb_matchcase.checked = !!editor._last_find_mcase

			var div4 = __Append(panel, "rte-dialog-line-matchword", "", "rte-dialog-line-input");
			__Append(div4, "rte-dialog-input-label", styleforlabel);
			var label3 = __Append(div4, "label", "width:280px;margin-right:22px");
			var cb_matchword = __Append(label3, "input", "margin:2px;transform:translate(0,1px)");
			__Append(label3, "span", "margin:0 0 2px 6px").innerText = __GetLangText("matchword");
			cb_matchword.type = "checkbox"
			cb_matchword.checked = !!editor._last_find_mword;

			var divaction = __Append(panel, "rte-dialog-line-action", "padding-bottom:8px");


			var buttonrp = __Append(divaction, "rte-dialog-button", null, "rte-button-type-replace");
			buttonrp.innerText = __GetLangText("replaceonce");
			buttonrp.onclick = function () {
				var text = inpkeyword.value;
				if (!text)
					return;

				var rpl = inpreplace.value;
				if (!rpl)
					return;

				if (editsel.toString() == text) {
					__InsertText(rpl);
					__Collapse(false);
				}
				button.onclick();
			}

			var buttonrpall = __Append(divaction, "rte-dialog-button", null, "rte-button-type-replaceall");
			buttonrpall.innerText = __GetLangText("replaceall");
			buttonrpall.onclick = function () {
				var text = inpkeyword.value;
				if (!text)
					return;

				var rpl = inpreplace.value;
				if (rpl == null) rpl = "";

				if (text == rpl)
					return;

				var mcase = cb_matchcase.checked;

				// First pass: find from the beginning of the document
				__SelectDoc(true);

				var rplcount = 0;
				var maxiter = 10000;
				while (maxiter-- > 0) {
					var r = editwin.find(text, !!mcase, false, false, !!cb_matchword.checked, false, false);
					if (!r)
						break;

					var seltext = editsel.toString();
					if (mcase ? seltext == text : seltext.toLowerCase() == text.toLowerCase()) {
						__InsertText(rpl);
						__Collapse(false);
						rplcount++;
					} else {
						break;
					}
				}
				debuglog("replace " + rplcount)
			}


			var button = __Append(divaction, "rte-dialog-button", null, "rte-button-type-next");
			button.innerText = __GetLangText("findnext");
			button.onclick = function () {
				var text = inpkeyword.value;

				if (!text)
					return;

				var mcase = cb_matchcase.checked;
				var mword = cb_matchword.checked;

				editor._last_find_text = text;
				editor._last_find_mcase = mcase;
				editor._last_find_mword = mword;

				var backward = false;
				var wrap = false;
				var inframes = false;
				var showdialog = false;

				__Collapse(false);

				var r = editwin.find(text, !!mcase, backward, wrap, !!mword, false, showdialog)
				if (!r) {

					__SelectDoc(true)

					r = editwin.find(text, !!mcase, backward, wrap, !!mword, false, showdialog);
				}

				return r;
			}

		});
	}

	__toolbar_item_factory_map["insertorderedlist"] = __toolbar_item_factory_map["insertunorderedlist"] = function (cmd) {

		// TODO: Move these style presets into shared config defaults.

		var button = __Create_ToolbarItemSplitDropDown(cmd, function (panel) {
			var arr = config[cmd + "Items"];
			if (cmd == "insertorderedlist")
				arr = config.insertOrderedListItems;
			if (cmd == "insertunorderedlist")
				arr = config.insertUnorderedListItems;

			if (arr == null)
				return;

			function CreateDiv(pair) {
				var div = __Append(panel, "rte-toolbar-dropdown-item", "padding:3px 12px");
				div.innerText = pair[1];

				var list = __FindSelectionElement(cmd == "insertorderedlist" ? "ol" : "ul");
				if (list && editwin.getComputedStyle(list).listStyleType == pair[0]) {
					div.classList.add("rte-current-item");
				}

				div.onclick = function () {

					function changeStyle() {
						var list = __FindSelectionElement(cmd == "insertorderedlist" ? "ol" : "ul");
						if (list) {
							list.style.listStyle = pair[0];
							__Close_CurrentPopup(panel);
						}
						return list;
					}

					if (!changeStyle()) {
						__Exec_Cmd_ForUI(cmd);
						if (!changeStyle()) {
							console.warn("failed to find list.");
						}
					}

				}
			}

			for (var i = 0; i < arr.length; i++)
				CreateDiv(arr[i]);

		}, function () {
			__Exec_Cmd_ForUI(cmd);
		});

		return button;
	}

	__toolbar_item_factory_map["forecolor"] = __toolbar_item_factory_map["backcolor"] = function (cmd) {

		// TODO: Move these font-name presets into shared config defaults.
		var defaultcolor = cmd == "forecolor" ? "red" : "yellow";

		var button = __Create_ToolbarItemSplitDropDown(cmd, function (panel) {

			var lineauto = __Append(panel, "rte-dialog-line-auto");
			var spanauto = __Append(lineauto, "rte-dialog-item-color");
			__Append(lineauto, "rte-dialog-item-label").innerText = __GetLangText("colorauto");

			lineauto.onclick = function () {
				__ToggleSelectionStyle("color", "color", "", false);
				__Focus_Editor_Ensure();
				__Close_CurrentPopup(panel);
			}

			function CreateItemColor(c) {
				var span = __Append(linec, "rte-dialog-item-color");
				span.setAttribute(config.tooltipAttribute, c)
				span.style.backgroundColor = c;
				span.onclick = function () {
					execColor(c);
					__Focus_Editor_Ensure();
					__Close_CurrentPopup(panel);
				}
			}

			var items = cmd.toLowerCase() == "forecolor" ? config.foreColorItems : config.backColorItems

			for (var r = 0; r < items.length; r += 8) {
				var linec = __Append(panel, "rte-dialog-line-colors");
				for (var i = 0; i < 8; i++) {
					var c = items[r + i];
					if (!c)
						break;
					CreateItemColor(c);
				}
			}

			var linemore = __Append(panel, "rte-dialog-line-more");
			var spanmore = __Append(linemore, "rte-dialog-item-color");
			__Append(linemore, "rte-dialog-item-label").innerText = __GetLangText("colormore");
			linemore.onclick = function () {
				__Close_CurrentPopup(panel);
				__UI_ColorPickerDialog(cmd, function (c) {
					execColor(c);
				});
			}
		}, function () {
			__Exec_Cmd_ForUI(cmd, defaultcolor)
		});

		var mask = __Append(button, "rte-color-button-mask");

		mask.style.backgroundColor = defaultcolor;

		function execColor(c) {
			defaultcolor = c;
			mask.style.backgroundColor = defaultcolor;
			//editdoc.execCommand(cmd, false, c);
			__Exec_Cmd_ForUI(cmd, c)
		}


		return button;
	}


	/////////RTE_DefaultConfig.items_emoji = ["??,??,??", "??,??,??,??,??", "??,??,??,??,??,??", "", ""];	//https://bj.96weixin.com/emoji/

	//__toolbar_item_factory_map["emoji"] = function (cmd) {
	//	return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {
	//		var div1 = __Append(panel, "rte-dialog-line-table");
	//		var table = __Append(div1, "table", "border-collapse:collapse");
	//		table.border = "1";
	//		table.cellSpacing = 0;
	//		table.cellPadding = 0;

	//		for (var str  of  config.items_emoji) {
	//			var tr = table.insertRow(-1);
	//			for (var c  of  str.split(',')) {
	//				var td = tr.insertCell(-1);
	//				td.innerText = c;
	//				td.style.cssText = "width:20px;height:20px;text-align:center;vertical-align:middle";
	//				td.onclick = function (e) {
	//					__Close_CurrentPopup(panel);
	//					__InsertText(e.target.innerText);
	//					__Collapse(false);
	//					__Focus_Editor_Delay();
	//				}
	//				td.onmouseover = function (e) {
	//					e.target.style.backgroundColor = 'orange';
	//				}
	//				td.onmouseout = function (e) {
	//					e.target.style.backgroundColor = '';
	//				}
	//			}
	//		}
	//	})
	//}

	__toolbar_item_factory_map["insertchars"] = function (cmd) {
		return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {

			var tabui = __UI_CreateTabUI(__Append(panel, "rte-dialog-tabcontainer"))
			tabui.style.maxWidth = "500px";
			tabui.style.height = "300px";


			function CreateTab(itemdef) {
				tabui.addTabPage(itemdef.tab, "rte_insertchars_" + itemdef.tab, function (tabpage) {

					tabpage.classList.add("rte-flex-wrap");
					tabpage.style.overflowY = "scroll";
					tabpage.style.flex = "1";

					function CreateFromHTML(html, font) {
						var span = __Append(tabpage, "rte-insertchars-item", "")
						span.innerHTML = html;
						span.onclick = function () {
							__Close_CurrentPopup(panel);
							__InsertHTML(html);
							__Collapse(false);
							__Focus_Editor_Delay();
						}
					}

					if (itemdef.items) {
						for (var i = 0; i < itemdef.items.length; i++) {
							CreateFromHTML(itemdef.items[i])
						}
					}
					else if (itemdef.from && itemdef.to) {
						for (var k = itemdef.from; k <= itemdef.to; k++) {
							CreateFromHTML("<char-font style='font-family:" + itemdef.font + "'>" + String.fromCharCode(k) + "</char-font>")
						}
					}

				});
			}

			for (var i = 0; i < config.characterItems.length; i++) {
				CreateTab(config.characterItems[i]);
			}


		});
	}


	__toolbar_item_factory_map["insertvideo"] = function (cmd) {
		return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {

			var div1 = __Append(panel, "rte-dialog-line-url", "", "rte-dialog-line-input");
			var labelurl = __Append(div1, "rte-dialog-input-label");
			labelurl.innerText = "Url";
			var inpurl = __Append(div1, "textarea");
			inpurl.type = "text";

			_SetInputValueClassLogic(inpurl)

			var existingElement = __FindSelectionElement("iframe", function (tag) { tag.getAttribute("rte-for") == "insertvideo" });
			if (existingElement)
				inpurl.value = existingElement.getAttribute("data-url")

			inpurl.focus();

			//__Hook_Enter_Callback(inpurl, function () {
			//	button.onclick();
			//})

			__Hook_Close_CurrentPopup_ByEsc(panel);

			var div2 = __Append(panel, "rte-dialog-line-action");
			var button = __Append(div2, "rte-dialog-button", null, "rte-button-type-commit");
			button.innerText = existingElement ? "Update" : "Insert";
			button.onclick = function () {
				var url = inpurl.value.trim();
				if (!url) return inpurl.focus();

				var iframe = existingElement;

				if (!existingElement) {
					var div = __InsertRootParagraph("div");
					div.style.cssText += ";text-align:center";
					var span = __Append(div, "video-container", "display:inline-block;");
					iframe = __Append(span, "iframe", "max-width:100%;width:640px;height:360px;");
					iframe.setAttribute("rte-for", "insertvideo");
					iframe.setAttribute("border", "0");
					iframe.setAttribute("allowfullscreen", "");
				}

				if (url.indexOf("<iframe") == 0) {
					__ApplyFragment(iframe, "div", url);
				}
				else {
					iframe.setAttribute("data-url", url);

					//https://www.youtube.com/watch?v=pMF9r76wuV8
					//https://www.youtube.com/embed/pMF9r76wuV8?&wmode=opaque

					//https://youtu.be/Q55usVcqGAI

					//https://vimeo.com/411485636 =>https://player.vimeo.com/video/411485636

					//https://dai.ly/x4e5dko
					//https://www.dailymotion.com/video/x4e5dko		=>https://www.dailymotion.com/embed/video/x4e5dko

					//https://www.twitch.tv/videos/102507530	-><iframe src="https://player.twitch.tv/?video=102507530&parent=www.example.com" frameborder="0" allowfullscreen="true" scrolling="no" height="378" width="620"></iframe>

					//https://flic.kr/p/8e3Scb ?

					var targeturl = url;
					var pos = url.indexOf("youtube.com/watch?v=")
					if (pos != -1)
						targeturl = "https://youtube.com/embed/" + url.substring(pos).split('=')[1].split('&')[0] + "?wmode=opaque";
					var pos = url.indexOf("youtu.be/")
					if (pos != -1)
						targeturl = "https://youtube.com/embed/" + url.substring(pos + 9).split('?')[0] + "?wmode=opaque";

					var pos = url.indexOf("//vimeo.com/")
					if (pos != -1)
						targeturl = "https://player.vimeo.com/video/" + url.substring(pos + 12).split('?')[0];


					var pos = url.indexOf("dai.ly/")
					if (pos != -1)
						targeturl = "https://www.dailymotion.com/embed/video/" + url.substring(pos + 7).split('?')[0];

					var pos = url.indexOf("dailymotion.com/video/")
					if (pos != -1)
						targeturl = "https://www.dailymotion.com/embed/video/" + url.substring(pos + 22).split('?')[0];

					iframe.setAttribute("src", targeturl);
				}

				__Close_CurrentPopup(panel);

				__SelectControl(iframe);
				__Focus_Editor_Delay();
			}
		});
	}

	__toolbar_item_factory_map["paste"] = function (cmd, suffix, ownerElement) {
		return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {
			__ParseItemList(config.subtoolbar_paste, panel, "menu");
		});
	}


	__toolbar_item_factory_map["insertdocument"] = function (cmd, suffix, ownerElement) {

		var menumode = false;
		if (ownerElement == null || !_current_popup_element || !_current_popup_element.contains(ownerElement)) {
			menumode = true;
		}

		return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {

			if (menumode) {

				panel.classList.add("rte-menu");
				__AppendMenuItem(panel, "imageupload", "cmd_imageupload", "Upload", function () {
					var input = document.createElement("input")
					input.type = "file";
					input.accept = ".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg";
					input.onchange = function () {
						__InsertFile(input.files[0])
					}
					input.click();
				});

				__AppendMenuItem(panel, "insertimage", "cmd_insertimage", "By Url", function () {
					var dialogpanel = __UI_CreateDialogFrame(__GetLangText("insertimage"), "rte-panel-insertimage rte-panel-insertimage-byurl", function () {

					});
					ShowDocumentUploadUI(dialogpanel, "byurl");
				});

				__AppendMenuItem(panel, "insertimagedragdrop", "cmd_insertimagedragdrop", "Drag & Drop", function () {
					var dialogpanel = __UI_CreateDialogFrame(__GetLangText("insertimage"), "rte-panel-insertimage rte-panel-insertimage-dragdrop", function () {

					});
					ShowDocumentUploadUI(dialogpanel, "dragdrop");
				});

				//__AppendMenuSpliter(panel);

				//__AppendMenuItem(panel, "inserttemplate", "cmd_inserttemplate", "Insert Template", function () {
				//	__Exec_Cmd_ForUI("inserttemplate")
				//});


				//__AppendMenuItem(panel, "dialog", "cmd_insertimage", "Open Dialog", function () {
				//    var dialogpanel = __UI_CreateDialogFrame(__GetLangText("insertimage"), "rte-panel-insertimage", function () {

				//    });
				//    ShowImageDialogUI(dialogpanel, "all");
				//});

				return;

			}

			ShowDocumentUploadUI(panel);
		});

		function ShowDocumentUploadUI(panel, uimode) {

			var tabui = __UI_CreateTabUI(__Append(panel, "rte-dialog-tabcontainer"))

			tabui.style.minWidth = "300px";
			//tabui.style.minHeight = "200px";

			var existingElement = __FindSelectionElement("A");

			function active_tab_0() {
				if (div2) div2.style.display = "none";
			}

			var showuploadbutton = uimode == "dragdrop" || (!existingElement && uimode == "all");

			if (showuploadbutton) {
				var draguploadtab = tabui.addTabPage(__GetLangText("upload"), "rte_insertdocument_upload", null, active_tab_0);

				draguploadtab.classList.add("fileuploader-dragdrop");

				draguploadtab.style.minHeight = "200px";

				var div4 = __Append(draguploadtab, "div", "");
				//var link = __Append(div4, "link");
				//link.src = __GetUrlByName("pngCode_documentupload");
				var link = __Append(div4, "div", "width:50%;margin:0 auto;", "rte_insertdocument_upload_icon");
				link.innerHTML = config.svgCode_documentupload;

				var div3 = __Append(draguploadtab, "div", "");
				div3.innerText = __GetLangText("draganddrop");

				var div2 = __Append(draguploadtab, "div", "");
				div2.innerText = " " + __GetLangText("or") + " ";

				var div1 = __Append(draguploadtab, "div", "");
				div1.innerText = __GetLangText("clicktoupload");

				var file = __Append(draguploadtab, "input", "position:absolute;top:0px;left:0px;width:100%;height:100%;opacity:0.01");
				file.type = "file";
				file.setAttribute("accept", ".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.zip,.rar,.pdf,.doc,.docx,.xls,.xlsx,.rtf,.txt");

				draguploadtab.ondragenter = function (e) { e.preventDefault(); }
				draguploadtab.ondragover = function (e) { e.preventDefault(); }
				draguploadtab.ondrop = function (e) {
					e.preventDefault();
					__Process_DataTransfer(e.dataTransfer, e);
					__Close_CurrentPopup(panel);
					__Focus_Editor_Ensure();
				}

				file.onchange = function () {
					__InsertFile(file.files[0]);
					__Close_CurrentPopup(panel);
				}

				if (uimode == "dragdrop")
					return;
			}

			function active_tab_1(panel) {
				if (div2) div2.style.display = "";
				panel.style.minHeight = "153px";
			}

			var linktab = tabui.addTabPage(__GetLangText("byurl"), "rte_insertdocument_byurl", null, active_tab_1);

			var div1 = __Append(linktab, "rte-dialog-line-url", "", "rte-dialog-line-input");
			var labelurl = __Append(div1, "rte-dialog-input-label");
			labelurl.innerText = __GetLangText("url");
			var inpurl = __Append(div1, "input");
			inpurl.type = "text";
			inpurl.style.paddingRight = '25px';

			var arrow = __Append(div1, "rte-input-arrow", "");
			arrow.onclick = function (e) {
				e.stopPropagation();
				e.preventDefault();
				var option = { submenu: true }
				function CreateDiv(panel, link) {
					var div = __Append(panel, "div", "", "rte-list-item");
					div.innerText = link;
					div.onclick = function () {
						inpurl.value = link;
						inpurl.focus();
						__Close_CurrentPopup(panel)
					}
				}
				option.fillpanel = function (panel) {
					for (var i = 0; i < config.documentItems.length; i++) {
						CreateDiv(panel, config.documentItems[i])
					}

				}
				__Create_DropDownPanel(arrow, option)
			}

			if (existingElement)
				inpurl.value = existingElement.getAttribute("src")

			_SetInputValueClassLogic(inpurl)

			inpurl.focus();

			__Hook_Enter_Callback(inpurl, function () {
				button.onclick();
			})

			__Hook_Close_CurrentPopup_ByEsc(panel);

			var generaltabs = __UI_CreateGeneralTabs(tabui, existingElement, null, active_tab_1);

			var div2 = __Append(panel, "rte-dialog-line-action");

			if (showuploadbutton)
				div2.style.display = "none";

			var button = __Append(div2, "rte-dialog-button", null, "rte-button-type-commit");
			button.innerText = existingElement ? "Update" : "Insert";
			button.onclick = function () {
				var url = inpurl.value.trim();
				if (!url) return inpurl.focus();

				var link = existingElement || __SurroundByTagName("A");

				while (true) {
					var suba = link.querySelector("A");
					if (!suba) break;
					__RemoveNodeOnly(suba);
				}

				generaltabs.$setToElement(link);

				link.setAttribute("href", url);
				if (!link.innerText)
					link.innerText = url;

				__Close_CurrentPopup(panel);

				__SelectControl(link);
				__Focus_Editor_Delay();
			}
		}
	}

	__toolbar_item_factory_map["insertimage"] = function (cmd, suffix, ownerElement) {

		var menumode = false;
		if (ownerElement == null || !_current_popup_element || !_current_popup_element.contains(ownerElement)) {
			menumode = true;
		}

		return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {

			if (menumode) {

				panel.classList.add("rte-menu");
				__AppendMenuItem(panel, "imageupload", "cmd_imageupload", "Upload", function () {
					__Exec_Cmd_ForUI("imageupload")
				});

				__AppendMenuItem(panel, "insertimage", "cmd_insertimagebyurl", "By Url", function () {
					__Exec_Cmd_ForUI("insertimagebyurl")
				});

				__AppendMenuItem(panel, "insertimagedragdrop", "cmd_insertimagedragdrop", "Drag & Drop", function () {
					__Exec_Cmd_ForUI("insertimagedragdrop")
				});

				__AppendMenuSpliter(panel);

				__AppendMenuItem(panel, "insertgallery", "cmd_insertgallery", "Image Gallery", function () {
					__Exec_Cmd_ForUI("insertgallery")
				});


				//__AppendMenuItem(panel, "dialog", "cmd_insertimage", "Open Dialog", function () {
				//    var dialogpanel = __UI_CreateDialogFrame(__GetLangText("insertimage"), "rte-panel-insertimage", function () {

				//    });
				//    ShowImageDialogUI(dialogpanel, "all");
				//});

				return;

			}

			ShowImageDialogUI(panel);
		});

	}


	function ShowImageDialogUI(panel, uimode) {

		var tabui = __UI_CreateTabUI(__Append(panel, "rte-dialog-tabcontainer"))

		tabui.style.minWidth = "300px";
		//tabui.style.minHeight = "200px";

		var existingElement = __FindSelectionElement("IMG");

		function active_tab_0() {
			if (div2) div2.style.display = "none";
		}

		if (uimode == "camera") {
			var draguploadtab = tabui.addTabPage(__GetLangText("camera"), "rte_insertimage_camera", null, active_tab_0);

			draguploadtab.classList.add("fileuploader-camera");

			draguploadtab.style.minHeight = "200px";

			var div4 = __Append(draguploadtab, "div", "");
			var video = __Append(div4, "video", "width:320px;height:220px");
			video.muted = true;
			video.playsInline = true;
			//var canvas = __Append(div4, "canvas", "width:320px;height:240px;display:none;");
			//canvas.width = 320;
			//canvas.height = 240;

			function errocb() {
				alert("error open camera");
				__Close_CurrentPopup();
			}

			function openCamera(success, error) {
				if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
					navigator.mediaDevices.getUserMedia({ video: true }).then(success).catch(error);
					return;
				}

				var legacy = navigator.mozGetUserMedia || navigator.webkitGetUserMedia || navigator.getUserMedia;
				if (!legacy) {
					error();
					return;
				}

				legacy.call(navigator, { video: true }, success, error);
			}

			var videoStream = null;
			var videoTrack = null;
			var videoSettings = null;
			var panelclosed = false;

			function CloseStream() {
				if (videoStream != null) {
					var ts = videoStream.getTracks();
					for (var i = 0; i < ts.length; i++) {
						ts[i].stop();
					}
				}
			}

			panel._onclose = function () {
				panelclosed = true;
				CloseStream();
			}

			function applyVideoSettings() {
				if (!videoSettings)
					videoSettings = {};

				if (!videoSettings.width && video.videoWidth)
					videoSettings.width = video.videoWidth;
				if (!videoSettings.height && video.videoHeight)
					videoSettings.height = video.videoHeight;

				var width = videoSettings.width || 320;
				var height = videoSettings.height || 220;
				video.style.width = width + "px";
				video.style.height = height + "px";
				video.style.zoom = 320.0 / width;
			}

			video.onloadedmetadata = applyVideoSettings;

			openCamera(function (stream) {
				videoStream = stream;
				videoTrack = stream.getVideoTracks()[0];

				if (panelclosed) {
					CloseStream();
					return;
				}

				if (videoTrack == null) {
					CloseStream();
					alert("error open camera");
					__Close_CurrentPopup();
					return;
				}
				videoSettings = videoTrack.getSettings ? videoTrack.getSettings() : {};

				debuglog(stream, videoTrack, videoSettings)

				if (navigator.mozGetUserMedia && !("srcObject" in video)) {
					video.mozSrcObject = stream;
				}
				else if ("srcObject" in video) {
					video.srcObject = stream;
				}
				else {
					video.src = URL.createObjectURL(stream); // TODO: Verify camera stream support across browsers.
				}
				video.play();
				applyVideoSettings();
			}, errocb);

			var divbtns = __Append(draguploadtab, "div", "");

			var button = __Append(divbtns, "rte-dialog-button", null, "rte-button-type-commit");
			button.innerText = "Insert";
			button.onclick = function () {
				if (!videoStream)
					return;

				var canvas = document.createElement("canvas");
				canvas.width = videoSettings.width;
				canvas.height = videoSettings.height;

				var ctx = canvas.getContext("2d")
				ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

				var dataurl = canvas.toDataURL("image/jpeg", 0.8);

				var bs = atob(dataurl.split(',')[1]);
				var ab = new ArrayBuffer(bs.length);
				var ia = new Uint8Array(ab);
				for (var i = 0; i < bs.length; i += 1) {
					ia[i] = bs.charCodeAt(i);
				}
				var newfile = new Blob([ab], { type: 'image/jpeg' });
				newfile.name = "camera.jpg";

				__InsertFile(newfile);
				__Close_CurrentPopup(panel);
			}

			return;
		}

		var showuploadbutton = uimode == "dragdrop" || (!existingElement && uimode == "all");

		if (showuploadbutton) {
			var draguploadtab = tabui.addTabPage(__GetLangText("upload"), "rte_insertimage_upload", null, active_tab_0);

			draguploadtab.classList.add("fileuploader-dragdrop");

			draguploadtab.style.minHeight = "200px";

			var div4 = __Append(draguploadtab, "div", "");
			//var img = __Append(div4, "img");
			//img.src = __GetUrlByName("pngCode_imageupload");
			var img = __Append(div4, "div", "width:50%;margin:0 auto;", "rte_insertimage_upload_icon");
			img.innerHTML = config.svgCode_imageupload;

			var div3 = __Append(draguploadtab, "div", "");
			div3.innerText = __GetLangText("draganddrop");

			var div2 = __Append(draguploadtab, "div", "");
			div2.innerText = " " + __GetLangText("or") + " ";

			var div1 = __Append(draguploadtab, "div", "");
			div1.innerText = __GetLangText("clicktoupload");

			var file = __Append(draguploadtab, "input", "position:absolute;top:0px;left:0px;width:100%;height:100%;opacity:0.01");
			file.type = "file";
			file.setAttribute("accept", ".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg");

			draguploadtab.ondragenter = function (e) { e.preventDefault(); }
			draguploadtab.ondragover = function (e) { e.preventDefault(); }
			draguploadtab.ondrop = function (e) {
				e.preventDefault();
				__Process_DataTransfer(e.dataTransfer, e);
				__Close_CurrentPopup(panel);
				__Focus_Editor_Ensure();
			}

			file.onchange = function () {
				__InsertFile(file.files[0]);
				__Close_CurrentPopup(panel);
			}

			if (uimode == "dragdrop")
				return;
		}

		function active_tab_1(panel) {
			if (div2) div2.style.display = "";
			panel.style.minHeight = "153px";
		}

		var linktab = tabui.addTabPage(__GetLangText("byurl"), "rte_insertimage_byurl", null, active_tab_1);

		var div1 = __Append(linktab, "rte-dialog-line-url", "", "rte-dialog-line-input");
		var labelurl = __Append(div1, "rte-dialog-input-label");
		labelurl.innerText = __GetLangText("url");
		var inpurl = __Append(div1, "input");
		inpurl.type = "text";
		inpurl.style.paddingRight = '25px';

		var arrow = __Append(div1, "rte-input-arrow", "");
		arrow.onclick = function (e) {
			e.stopPropagation();
			e.preventDefault();
			var option = { submenu: true }
			function CreateDiv(panel, link) {
				var div = __Append(panel, "div", "", "rte-list-item");
				div.innerText = link;
				div.onclick = function () {
					inpurl.value = link;
					inpurl.focus();
					__Close_CurrentPopup(panel)
				}
			}
			option.fillpanel = function (panel) {
				for (var i = 0; i < config.imageItems.length; i++) {
					CreateDiv(panel, config.imageItems[i])
				}

			}
			__Create_DropDownPanel(arrow, option)
		}

		if (existingElement)
			inpurl.value = existingElement.getAttribute("src")

		_SetInputValueClassLogic(inpurl)

		inpurl.focus();

		__Hook_Enter_Callback(inpurl, function () {
			button.onclick();
		})

		__Hook_Close_CurrentPopup_ByEsc(panel);

		var generaltabs = __UI_CreateGeneralTabs(tabui, existingElement, null, active_tab_1);

		var div2 = __Append(panel, "rte-dialog-line-action");

		if (showuploadbutton)
			div2.style.display = "none";

		var button = __Append(div2, "rte-dialog-button", null, "rte-button-type-commit");
		button.innerText = existingElement ? "Update" : "Insert";
		button.onclick = function () {
			var url = inpurl.value.trim();
			if (!url) return inpurl.focus();

			var img = existingElement || __SurroundByTagName("IMG");

			while (true) {
				var suba = img.querySelector("IMG");
				if (!suba) break;
				__RemoveNodeOnly(suba);
			}

			generaltabs.$setToElement(img);

			img.setAttribute("src", url);

			__Close_CurrentPopup(panel);

			__SelectControl(img);
			__Focus_Editor_Delay();
		}
	}

	__toolbar_item_factory_map["controlalt"] = function (cmd) {
		return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {

			var ctrl = __GetSelectedControl();

			if (!ctrl) {
				panel.style.cssText = "text-align:center;padding:30px;";
				panel.innerText = "please select a control";
				return;
			}

			function RemovePX(s) {
				if (!s) return "";
				return s.replace("px", "");
			}

			var linktab = panel;

			var div1 = __Append(linktab, "rte-dialog-line-alt", "", "rte-dialog-line-input");
			var labelalt = __Append(div1, "rte-dialog-input-label");
			labelalt.innerText = "Alt";
			var inpalt = __Append(div1, "input");
			inpalt.type = "text";

			_SetInputValueClassLogic(inpalt, ctrl.getAttribute("alt"))

			inpalt.focus();

			__Hook_Enter_Callback(inpalt, function () {
				button.onclick();
			})

			__Hook_Close_CurrentPopup_ByEsc(panel);

			var div2 = __Append(panel, "rte-dialog-line-action");
			var button = __Append(div2, "rte-dialog-button", null, "rte-button-type-commit");
			button.innerText = "Update";
			button.onclick = function () {
				ctrl.setAttribute("alt", inpalt.value.trim());
				__Close_CurrentPopup();
			}
		});
	}

	__toolbar_item_factory_map["controlsize"] = function (cmd) {
		// TODO: Fix intermittent dialog display failures for menu_controlsize.
		return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {

			var ctrl = __GetSelectedControl();

			if (!ctrl) {
				panel.style.cssText = "text-align:center;padding:30px;";
				panel.innerText = "please select a control";
				return;
			}

			function RemovePX(s) {
				if (!s) return "";
				return s.replace("px", "");
			}

			var tabui = __UI_CreateTabUI(__Append(panel, "rte-dialog-tabcontainer"))
			var linktab = tabui.addTabPage(__GetLangText("size"), "rte_controlsize_size")

			var div1 = __Append(linktab, "rte-dialog-line-width", "", "rte-dialog-line-input");
			var labelwidth = __Append(div1, "rte-dialog-input-label");
			labelwidth.innerText = "Width";
			var inpwidth = __Append(div1, "input");
			inpwidth.type = "text";

			_SetInputValueClassLogic(inpwidth, RemovePX(ctrl.style.width))

			var div2 = __Append(linktab, "rte-dialog-line-height", "", "rte-dialog-line-input");
			var labelheight = __Append(div2, "rte-dialog-input-label");
			labelheight.innerText = "Height";
			var inpheight = __Append(div2, "input");
			inpheight.type = "text";

			_SetInputValueClassLogic(inpheight, RemovePX(ctrl.style.height))


			inpwidth.focus();

			__Hook_Enter_Callback(inpwidth, function () {
				button.onclick();
			})
			__Hook_Enter_Callback(inpheight, function () {
				button.onclick();
			})

			__Hook_Close_CurrentPopup_ByEsc(panel);

			var div2 = __Append(panel, "rte-dialog-line-action");
			var button = __Append(div2, "rte-dialog-button", null, "rte-button-type-commit");
			button.innerText = "Update";
			button.onclick = function (e) {
				var w = inpwidth.value.trim();
				var h = inpheight.value.trim();
				if (w == String(parseInt(w))) w += "px";
				if (h == String(parseInt(h))) h += "px";
				ctrl.style.width = w;
				ctrl.style.height = h;
				if (e) __Close_CurrentPopup();
			}
		});
	}

	__toolbar_item_factory_map["insertlink"] = __toolbar_item_factory_map["controlinsertlink"] = __toolbar_item_factory_map["controleditlink"] = function (cmd) {
		return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {

			var existingElement = __FindSelectionElement("A");

			var tabui = __UI_CreateTabUI(__Append(panel, "rte-dialog-tabcontainer"))
			var linktab = tabui.addTabPage(__GetLangText("link"), "rte_insertlink_link")

			var div1 = __Append(linktab, "rte-dialog-line-url", "", "rte-dialog-line-input");
			var labelurl = __Append(div1, "rte-dialog-input-label");
			labelurl.innerText = __GetLangText("url");
			var inpurl = __Append(div1, "input");
			inpurl.type = "text";

			var arrow = __Append(div1, "rte-input-arrow", "");
			arrow.onclick = function (e) {
				e.stopPropagation();
				e.preventDefault();
				var option = { submenu: true }
				function CreateDiv(panel, link) {
					var div = __Append(panel, "div", "", "rte-list-item");
					div.innerText = link;
					div.onclick = function () {
						inpurl.value = link;
						inpurl.focus();
						__Close_CurrentPopup(panel)
					}
				}
				option.fillpanel = function (panel) {
					for (var i = 0; i < config.linkItems.length; i++) {
						CreateDiv(panel, config.linkItems[i])
					}

				}
				__Create_DropDownPanel(arrow, option)
			}

			_SetInputValueClassLogic(inpurl)

			var div3 = __Append(linktab, "rte-dialog-line-text", "", "rte-dialog-line-input");
			var labeltext = __Append(div3, "rte-dialog-input-label");
			labeltext.innerText = __GetLangText("text");
			var inptext = __Append(div3, "input");
			inptext.type = "text";
			var inptextchanged = false;
			inptext.onchange = function () {
				inptextchanged = true;
			}
			if (__GetSelectedControl()) {
				div3.style.display = 'none';
			}

			_SetInputValueClassLogic(inptext, existingElement ? existingElement.innerText : editsel.toString())

			var div2 = __Append(linktab, "rte-dialog-line-target", ".rte-dialog-line-checkbox");
			var labeltarget = __Append(div2, "rte-dialog-input-label");
			var cbtarget = __Append(labeltarget, "input");
			cbtarget.type = "checkbox";
			cbtarget.id = "rte-cb-link-target"
			var cblabel = __Append(labeltarget, "label");
			cblabel.innerText = __GetLangText("opennewwin");
			cblabel.setAttribute("for", cbtarget.id);


			if (existingElement) {
				inpurl.value = existingElement.getAttribute("href")
				cbtarget.checked = existingElement.getAttribute("target") == "_blank";
			}
			else {
				// TODO: Move these tag options into shared config defaults.
				cbtarget.checked = true;
			}

			inpurl.focus();

			__Hook_Enter_Callback(inpurl, function () {
				button.onclick();
			})

			__Hook_Close_CurrentPopup_ByEsc(panel);

			var generaltabs = __UI_CreateGeneralTabs(tabui, existingElement);

			var div2 = __Append(panel, "rte-dialog-line-action");

			var btncancel = __Append(div2, "rte-dialog-button", null, "rte-button-type-cancel");
			btncancel.innerText = __GetLangText("cancel")
			btncancel.onclick = function () {
				__Close_CurrentPopup(panel);
				__Focus_Editor_Delay();
			}


			var button = __Append(div2, "rte-dialog-button", null, "rte-button-type-commit");
			button.innerText = __GetLangText(existingElement ? "update" : "insert");
			button.onclick = function () {
				var url = inpurl.value.trim();
				if (!url) return inpurl.focus();

				var a = existingElement || __SurroundByTagName("a");

				while (true) {
					var suba = a.querySelector("a");
					if (!suba) break;
					__RemoveNodeOnly(suba);
				}

				generaltabs.$setToElement(a);

				var parts = url.split('/');
				var part0 = parts[0];
				if (part0.indexOf('.') != -1)
					url = "http://" + url;

				a.setAttribute("href", url);

				if (cbtarget.checked)
					a.setAttribute("target", "_blank")
				else if (a.getAttribute("target") == "_blank")
					a.removeAttribute("target");

				if (inptextchanged && inptext.value.trim())
					a.innerText = inptext.value;

				if (!a.innerHTML)
					a.innerText = url;

				__Close_CurrentPopup(panel);

				__SelectElementText(a);
				__Focus_Editor_Delay();
			}
		});
	}

	__toolbar_item_factory_map["inserttable"] = function (cmd) {
		return __Create_ToolbarItemDialogOrDropDownPanel(cmd, function (panel) {

			var itpanel = __Append(panel, "rte-inserttable-panel");

			var t = __Append(itpanel, "rte-inserttable-table");
			t.border = 1;

			var label = __Append(itpanel, "rte-inserttable-comment", "text-align:center;");

			var move_x = -1; move_y = -1;
			function updateui() {
				var max_x = 3;
				var max_y = 3;

				for (var y = 0; y < 10; y++) {
					var tr = t.childNodes[y];
					for (var x = 0; x < 10; x++) {
						var td = tr.childNodes[x];
						var sel = td.x <= move_x && td.y <= move_y;
						td.className = sel ? 'rte-ui-active' : '';

						if (sel) {
							if (x > max_x) max_x = x;
							if (y > max_y) max_y = y;
						}

						td.style.display = (x - 2 > max_x) ? 'none' : '';
					}
					tr.style.display = (y - 2 > max_y) ? 'none' : '';
				}
				label.innerText = (move_x + 1) + " x " + (move_y + 1);
			}

			function tdonmove(e) {
				var movetd = e.target;
				move_x = movetd.x, move_y = movetd.y;
				updateui();
			}

			t.onclick = function () {
				if (move_x == -1 || move_y == -1)
					return;
				var table = __InsertByTagName("table");
				__ApplyFragment(table, "div", config.insertTableTag)
				for (var y = 0; y <= move_y; y++) {
					var tr = __Append(table, "tr");
					__ApplyFragment(tr, "tbody", config.insertRowTag)
					for (var x = 0; x <= move_x; x++) {
						var td = __Append(tr, "td");
						__ApplyFragment(td, "tr", config.insertCellTag)
					}
				}
				__Close_CurrentPopup(panel);
			}

			for (var y = 0; y < 10; y++) {
				var r = __Append(t, "rte-inserttable-row");
				r.y = y;
				for (var x = 0; x < 10; x++) {
					var d = __Append(r, "rte-inserttable-cell");
					d.onmousemove = tdonmove;
					d.x = x;
					d.y = y;
				}
			}

			updateui();
		});
	}


	function __GetCurrentFontName() {
		var fn = editdoc.queryCommandValue("fontname");
		var rootfn = editwin.getComputedStyle(editable).fontFamily;
		//debuglog(fn, rootfn);
		if (fn == rootfn) fn = "";
		if (fn) fn = fn.split('"').join("");
		return fn;
	}

	__toolbar_item_factory_map["fontname"] = function (cmd, suffix) {

		function divonclick(div) {
			debuglog(div.__selecteditem);
			__Exec_Cmd_ForUI("fontname", div.__selecteditem);
			__Close_CurrentPopup();
		}

		var option = {};
		var inp;
		option.fillinput = function (input) {
			inp = input;
			inp.innerText = __GetLangText("fontname");
			inp.style.overflowX = "hidden"
		}
		option.fillpanel = function (panel) {
			var currfont = __GetCurrentFontName();
			var fonts = config.fontNameItems.split(",");
			for (var i = 0; i < fonts.length; i++) {
				var font = fonts[i];
				var div = __Append_DropDownItem(panel, divonclick);
				div.__selecteditem = font;
				div.style.fontFamily = "'" + font + "'";
				div.innerText = font;
				if (currfont == font) {
					div.classList.add("rte-current-item");
				}
			}
		}
		var span = __CreateToolbarDropDown(option, cmd, suffix);
		if (span.nodeName.toLowerCase() == 'rte-toolbar-dropdown') {
			span.style.minWidth = config.fontNameDropDownMinWidth || "90px";
			span.style.maxWidth = config.fontNameDropDownMaxWidth || "90px";
		}
		span._update = function () {

			inp.innerText = __GetCurrentFontName() || __GetLangText("fontname");
		}
		return span;
	}

	__toolbar_item_factory_map["fontsize"] = function (cmd, suffix) {
		function divonclick(div) {
			debuglog(div.__selecteditem);
			var style = String(div.__selecteditem);
			if (String(parseFloat(style)) == style)
				style += "px";
			debuglog(style);
			__Exec_Cmd_ForUI("fontsize", style);
			//__ToggleSelectionStyle("font-size", "fontSize", style, false);
			__Close_CurrentPopup();
		}

		var option = {};
		option.fillinput = function (input) {
			input.innerText = __GetLangText("fontsize");
		}
		option.fillpanel = function (panel) {
			var fonts = config.fontSizeItems.split(",");

			for (var i = 0; i < fonts.length; i++) {
				var font = fonts[i];
				var div = __Append_DropDownItem(panel, divonclick);
				div.__selecteditem = font;
				//var size = parseInt(font)
				//if (size) div.style.fontSize = size + "px";
				div.innerText = font;
			}
		}
		return __CreateToolbarDropDown(option, cmd, suffix);
	}


	__toolbar_item_factory_map["lineheight"] = function (cmd, suffix) {
		function divonclick(div) {
			debuglog(div.__selecteditem);
			//__Exec_Cmd_ForUI("lineheight", div.__selecteditem);
			//__ToggleSelectionStyle("line-height", "lineHeight", div.__selecteditem, false);
			var rb = __Ensure_Root_Block();
			if (rb) {
				rb.style.lineHeight = div.__selecteditem;
			}
			__Close_CurrentPopup();
		}
		return __Create_ToolbarItemDropDownPanel(cmd, function (panel) {
			var rb = __Find_Selection_Root_Block();
			var currlh = rb && rb.style.lineHeight;
			var items = config.lineHeightItems.split(",");
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var div = __Append_DropDownItem(panel, divonclick);
				div.__selecteditem = item;
				div.innerText = item;
				if (currlh == item) {
					div.classList.add("rte-current-item");
				}
			}
		});
	}

	function __IsSameStyle(n, nv, v) {
		if (nv == v)
			return true;
		if (nv && !v) return false;
		if (v && !nv) return false;

		var np = nv.indexOf(' ');
		if (np == -1) return false;
		var vp = v.indexOf(' ');
		if (vp == -1) { // Handle cases where nv is rgb(xx, xx, xx) and v is a named color.
			switch (n) {
				case "color":
				case "background-color":
					return true;
			}
			return false;
		}

		return true;
	}

	function __Is_Cmd_Active_InlineStyles() {
		for (var i = 0; i < config.inlineStyles.length; i++) {
			var pair = config.inlineStyles[i];
			if (__Is_Cmd_Active_InlineStyles_Item(pair[1])) {
				return true;
			}
		}
	}
	function __Is_Cmd_Active_InlineStyles_Item(selitem) {
		if (selitem.indexOf(':') == -1) {
			return __HasSelectionClass(selitem)
		}
		var pairs = selitem.split(';');
		for (var i = 0; i < pairs.length; i++) {
			var pair = pairs[i];
			pair = pair.split(':');
			if (pair.length != 2)
				continue;
			var n = pair[0].trim();
			if (!n) continue;
			var v = pair[1].trim();
			if (!__HasSelectionStyle(n, __GetStylePropName(n), v, false))
				return false;
		}
		return true;
	}
	__toolbar_item_factory_map["inlinestyle"] = function (cmd, suffix) {
		function divonclick(div) {
			__Close_CurrentPopup();
			debuglog(div.__selecteditem);
			if (div.__selecteditem.indexOf(':') == -1) {
				__ToggleSelectionClass(div.__selecteditem)
				return;
			}

			var pairs = div.__selecteditem.split(';');
			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i];
				pair = pair.split(':');
				if (pair.length != 2)
					continue;
				var n = pair[0].trim();
				if (!n) continue;
				var v = pair[1].trim();
				debuglog(n, v)
				__ToggleSelectionStyle(n, __GetStylePropName(n), v, false);
			}
		}
		return __Create_ToolbarItemDropDownPanel(cmd, function (panel) {
			for (var i = 0; i < config.inlineStyles.length; i++) {
				var pair = config.inlineStyles[i];
				var div = __Append_DropDownItem(panel, divonclick);
				div.__selecteditem = pair[1];
				div.innerText = pair[0];
				if (pair[2]) div.style.cssText += ";" + pair[2];
				if (__Is_Cmd_Active_InlineStyles_Item(div.__selecteditem)) {
					div.classList.add("rte-current-item");
				}
			}
		});
	}


	function __Is_Cmd_Active_ImageStyles() {
		for (var i = 0; i < config.imageStyles.length; i++) {
			var pair = config.imageStyles[i];
			if (__Is_Cmd_Active_ImageStyles_Item(pair[1])) {
				return true;
			}
		}
	}
	function __Is_Cmd_Active_ImageStyles_Item(selitem) {
		var rb = __GetSelectedControl();
		if (!rb)
			return;
		if (selitem.indexOf(':') == -1) {
			return rb.classList.contains(selitem);
		}
		var pairs = selitem.split(';');
		for (var i = 0; i < pairs.length; i++) {
			var pair = pairs[i];
			pair = pair.split(':');
			if (pair.length != 2)
				continue;
			var n = pair[0].trim();
			if (!n) continue;
			var v = pair[1].trim();
			n = __GetStylePropName(n);
			if (!__IsSameStyle(n, rb.style[n], v))
				return false;
		}
		return true;
	}
	__toolbar_item_factory_map["imagestyle"] = function (cmd, suffix) {
		function divonclick(div) {
			__Close_CurrentPopup();
			var rb = __GetSelectedControl();
			debuglog(div.__selecteditem);
			if (!rb)
				return;

			if (div.__selecteditem.indexOf(':') == -1) {
				rb.classList.toggle(div.__selecteditem);
				return;
			}

			var arr = div.__selecteditem.split(';');
			for (var i = 0; i < arr.length; i++) {
				var pair = arr[i];
				pair = pair.split(':');
				if (pair.length != 2)
					continue;
				var n = pair[0].trim();
				if (!n) continue;
				var v = pair[1].trim();
				n = __GetStylePropName(n);
				if (__IsSameStyle(n, rb.style[n], v))
					rb.style[n] = "";
				else
					rb.style[n] = v;
			}
		}
		return __Create_ToolbarItemDropDownPanel(cmd, function (panel) {
			for (var i = 0; i < config.imageStyles.length; i++) {
				var pair = config.imageStyles[i];
				var div = __Append_DropDownItem(panel, divonclick);
				div.__selecteditem = pair[1];
				div.innerText = pair[0];
				if (__Is_Cmd_Active_ImageStyles_Item(div.__selecteditem)) {
					div.classList.add("rte-current-item");
				}
			}
		});
	}



	function __Is_Cmd_Active_LinkStyles() {
		for (var i = 0; i < config.linkStyles.length; i++) {
			var pair = config.linkStyles[i];
			if (__Is_Cmd_Active_LinkStyles_Item(pair[1])) {
				return true;
			}
		}
	}
	function __Is_Cmd_Active_LinkStyles_Item(selitem) {
		var rb = __FindSelectionElement("A");
		if (!rb)
			return;
		if (selitem.indexOf(':') == -1) {
			return rb.classList.contains(selitem);
		}
		var pairs = selitem.split(';');
		for (var i = 0; i < pairs.length; i++) {
			var pair = pairs[i];
			pair = pair.split(':');
			if (pair.length != 2)
				continue;
			var n = pair[0].trim();
			if (!n) continue;
			var v = pair[1].trim();
			n = __GetStylePropName(n);
			if (!__IsSameStyle(n, rb.style[n], v))
				return false;
		}
		return true;
	}
	__toolbar_item_factory_map["linkstyle"] = function (cmd, suffix) {
		function divonclick(div) {
			__Close_CurrentPopup();
			var rb = __FindSelectionElement("A");
			debuglog(div.__selecteditem);
			if (!rb)
				return;

			if (div.__selecteditem.indexOf(':') == -1) {
				rb.classList.toggle(div.__selecteditem);
				return;
			}

			var arr = div.__selecteditem.split(';')
			for (var i = 0; i < arr.length; i++) {
				var pair = arr[i];
				pair = pair.split(':');
				if (pair.length != 2)
					continue;
				var n = pair[0].trim();
				if (!n) continue;
				var v = pair[1].trim();
				n = __GetStylePropName(n);
				if (__IsSameStyle(n, rb.style[n], v))
					rb.style[n] = "";
				else
					rb.style[n] = v;
			}
		}
		return __Create_ToolbarItemDropDownPanel(cmd, function (panel) {

			for (var i = 0; i < config.linkStyles.length; i++) {
				var pair = config.linkStyles[i];
				var div = __Append_DropDownItem(panel, divonclick);
				div.__selecteditem = pair[1];
				div.innerText = pair[0];
				if (__Is_Cmd_Active_LinkStyles_Item(div.__selecteditem)) {
					div.classList.add("rte-current-item");
				}
			}
		});
	}


	function __Is_Cmd_Active_ParagraphStyles() {
		for (var i = 0; i < config.paragraphStyles.length; i++) {
			var pair = config.paragraphStyles[i];
			if (__Is_Cmd_Active_ParagraphStyles_Item(pair[1])) {
				return true;
			}
		}
	}
	function __Is_Cmd_Active_ParagraphStyles_Item(selitem) {
		var rb = __Find_Selection_Root_Block();
		if (!rb)
			return;
		if (selitem.indexOf(':') == -1) {
			return rb.classList.contains(selitem);
		}
		var pairs = selitem.split(';');
		for (var i = 0; i < pairs.length; i++) {
			var pair = pairs[i];
			pair = pair.split(':');
			if (pair.length != 2)
				continue;
			var n = pair[0].trim();
			if (!n) continue;
			var v = pair[1].trim();
			n = __GetStylePropName(n);
			if (!__IsSameStyle(n, rb.style[n], v))
				return false;
		}
		return true;
	}
	__toolbar_item_factory_map["paragraphstyle"] = function (cmd, suffix) {
		function divonclick(div) {
			__Close_CurrentPopup();
			var rb = __Ensure_Root_Block();
			debuglog(div.__selecteditem);
			if (!rb)
				return;

			if (div.__selecteditem.indexOf(':') == -1) {
				rb.classList.toggle(div.__selecteditem);
				return;
			}

			var arr = div.__selecteditem.split(';');
			for (var i = 0; i < arr.length; i++) {
				var pair = arr[i];
				pair = pair.split(':');
				if (pair.length != 2)
					continue;
				var n = pair[0].trim();
				if (!n) continue;
				var v = pair[1].trim();
				n = __GetStylePropName(n);
				if (__IsSameStyle(n, rb.style[n], v))

					rb.style[n] = "";
				else
					rb.style[n] = v;
			}
		}
		return __Create_ToolbarItemDropDownPanel(cmd, function (panel) {
			for (var i = 0; i < config.paragraphStyles.length; i++) {
				var pair = config.paragraphStyles[i];
				var div = __Append_DropDownItem(panel, divonclick);
				div.__selecteditem = pair[1];
				div.innerText = pair[0];
				if (pair[2]) div.style.cssText = pair[2];
				if (__Is_Cmd_Active_ParagraphStyles_Item(pair[1])) {
					div.classList.add("rte-current-item");
				}
			}
		});
	}

	__toolbar_item_factory_map["paragraphs"] = function (cmd, suffix) {
		var option = {};
		function divonclick(div) {
			debuglog(div.__selecteditem);
			var sitem = div.__selecteditem;
			if (sitem.toLowerCase() == "normal")
				sitem = config.enterKeyTag;
			if (sitem.toLowerCase() == "br") sitem = "div";
			__ExecFormatBlock(sitem);
			__Close_CurrentPopup();
		}
		var inp;
		option.fillinput = function (input) {
			inp = input;
			input.innerText = __GetLangText("Paragraphs");
		}
		option.fillpanel = function (panel) {
			var fn = __Find_Selection_Root_Block();

			var items = config.paragraphItems.split(",");
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var div = __Append_DropDownItem(panel, divonclick);
				div.__selecteditem = item;
				var tagname = item;
				if (tagname.toLowerCase() == "normal") tagname = "div";
				__Append(div, tagname).innerText = __GetLangText(item);

				if (fn != null && fn.nodeName.toLowerCase() == tagname.toLowerCase()) {
					div.classList.add("rte-current-item");
				}
			}
		}
		var span = __CreateToolbarDropDown(option, cmd, suffix);
		span._update = function () {
			var fn = __Find_Selection_Root_Block();
			var txt = __GetLangText("Paragraphs");
			if (fn != null) {
				switch (fn.nodeName) {
					case "H1": case "H2": case "H3": case "H4": case "H5": case "H6": case "H7":
						txt = __GetLangText(fn.nodeName);
						break;
				}
			}
			inp.innerText = txt;
		}
		return span;
	}

	__toolbar_item_factory_map["styles"] = function (cmd, suffix) {
		var option = {};
		function divonclick(div) {
			debuglog(div.__selecteditem);
			__Exec_Cmd_ForUI("styles", div.__selecteditem);
			__Close_CurrentPopup();
		}
		option.fillinput = function (input) {
			input.innerText = "Styles";
		}
		option.fillpanel = function (panel) {
			var fonts = "test1,test2,test3".split(",");
			for (var i = 0; i < fonts.length; i++) {
				var font = fonts[i];
				var div = __Append_DropDownItem(panel, divonclick);
				div.__selecteditem = font;
				div.innerText = font;
			}
		}
		return __CreateToolbarDropDown(option, cmd, suffix);
	}





	function __Create_ToolbarItemSplitDropDown(cmd, initpanel, clickhandler) {

		var span = document.createElement("rte-toolbar-splitbutton");
		span.command = cmd;
		span.style.cssText = 'position:relative;';
		span.setAttribute(config.tooltipAttribute, __GetLangText(cmd));
		span.className = "rte_command_" + cmd;
		__Make_ActionElementAccessible(span, { role: "group", tabIndex: null, label: __GetLangText(cmd) });
		var directbtn = __Append(span, "rte-toolbar-splitbutton-direct")
		directbtn.__rteCommandOwner = span;
		__Make_ActionElementAccessible(directbtn, { role: "button", label: __GetLangText(cmd) });
		__SetImageForCmd(directbtn, cmd);

		var splitbtn = __Append(span, "rte-toolbar-splitbutton-dropdown")
		splitbtn.__rteCommandOwner = span;
		__Make_ActionElementAccessible(splitbtn, { role: "button", haspopup: "menu", label: __GetLangText(cmd), onkeydownarrow: function () { __Open_ActionPopupAndFocus(splitbtn); } });

		function runprimaryaction(e) {
			_RemoveTooltipRecent(span)
			if (e && e.stopPropagation) e.stopPropagation();
			if (!__Is_Cmd_Enabled(cmd))
				return;

			if (clickhandler)
				return clickhandler();

			splitbtn.onclick(e || {});
		}

		span.onclick = runprimaryaction;
		directbtn.onclick = runprimaryaction;

		splitbtn.onclick = function (e) {
			_RemoveTooltipRecent(span);
			if (e && e.stopPropagation) e.stopPropagation();

			if (!__Is_Cmd_Enabled(cmd))
				return;

			var option = {}
			option.fillpanel = function (panel) {

				panel.classList.add("rte-panel-general");
				panel.classList.add("rte-panel-" + cmd.toLowerCase());

				var divheader = __Append(panel, "rte-dialog-header");
				var spantitle = __Append(divheader, "rte-dialog-header-text", "flex:999");
				spantitle.innerText = __GetLangText(cmd);

				initpanel(panel);
			}
			__Create_DropDownPanel(span, option);
		}


		return span;

	}


	function __Create_ToolbarItemDropDownPanel(cmd, initpanel) {
		var span = __Default_ToolbarItemFactory(cmd);
		span.onclick = function (e) {

			e.stopPropagation();

			if (!__Is_Cmd_Enabled(cmd))
				return;

			var panelcls = "rte-panel-" + cmd.toLowerCase();

			var option = {}
			option.fillpanel = function (panel) {
				panel.classList.add("rte-panel-general");
				panel.classList.add(panelcls);
				initpanel(panel);

			}
			__Create_DropDownPanel(span, option);
		}
		return span;
	}

	var _cmdtocontrolmap = {}

	function __Create_ToolbarItemDialogOrDropDownPanel(cmd, handler) {	// Creates a toolbar item with a titled dropdown panel.

		var panelcls = "rte-panel-" + cmd.toLowerCase();
		var title = __GetLangText(cmd);


		_cmdtocontrolmap[cmd.toLowerCase()] = {
			type: "dropdown", control: span, exec: function () {
				var panel = __UI_CreateDialogFrame(title, panelcls, function () {
					// Dispose the panel when it closes.
				})
				handler(panel)
			}
		};

		var span = __Default_ToolbarItemFactory(cmd);
		span.onclick = function (e) {
			e.stopPropagation();

			if (!__Is_Cmd_Enabled(cmd))
				return;

			var maybebymenu = !span.contains(e.target);

			if (maybebymenu || cmd == "find" || config["behavior_DialogPopup_" + cmd]) {


				if (container.querySelector("." + panelcls)) {
					container.querySelector("." + panelcls).querySelector("rte-dialog-inner").close();
					return;
				}


				var panel = __UI_CreateDialogFrame(title, panelcls, function () {
					// Dispose the panel when it closes.
				})
				handler(panel)
				return;
			}

			var option = {}
			option.fillpanel = function (panel) {
				panel.classList.add("rte-panel-general");
				panel.classList.add(panelcls);

				var divheader = __Append(panel, "rte-dialog-header");
				var spantitle = __Append(divheader, "rte-dialog-header-text", "flex:999");
				spantitle.innerText = title;

				handler(panel)
			}
			__Create_DropDownPanel(span, option);

		}

		return span;
	}



	function __Default_ToolbarItemFactory(cmd, suffix) {

		switch (cmd) {
			case "underlinemenu":
				cmd = "underline";
				break;
		}

		var istoggle = cmd.substring(0, 7) == "toggle_";
		var ismenu = cmd.substring(0, 5) == "menu_";

		var span = document.createElement((istoggle || ismenu) ? "rte-toolbar-arrowbutton" : "rte-toolbar-button");
		span.command = cmd;
		span.style.cssText = 'position:relative;';
		span.setAttribute(config.tooltipAttribute, __GetLangText(cmd));
		__Make_ActionElementAccessible(span, { role: "button", haspopup: (istoggle || ismenu) ? "menu" : null, label: __GetLangText(cmd), onkeydownarrow: (istoggle || ismenu) ? function () { __Open_ActionPopupAndFocus(span); } : null });
		span.className = "rte_command_" + cmd;
		__SetImageForCmd(span, cmd);

		span.onclick = function () {
			_RemoveTooltipRecent(span)
			if (span.classList.contains("rte-command-disabled"))
				return;
			if (ismenu) {
				var option = {} // Use noheader: 1 for headerless panels.
				option.fillpanel = function (panel) {
					var strconfig = config["subtoolbar_" + cmd.substring(5)];
					if (!strconfig) console.error('miss subtoolbar ' + "subtoolbar_" + cmd.substring(5));
					__ParseItemList(strconfig, panel, "menu")
				}
				__Create_DropDownPanel(span, option)
			}
			else {
				__Exec_Cmd_ForUI(cmd);
			}
		}
		return span;

	}


	function __ParseItemList(str, toolbar, mode) {

		var ismenu = mode == "menu";
		var isvt = mode == "vtoolbar";

		var hideicon = false;
		if (str.indexOf("*hideicon*") != -1) {
			hideicon = true;
			str = str.replace("*hideicon*", "");
			toolbar.classList.add("rte-menu-hideicon");
		}

		var arr = [];
		var lpos = 0;
		var pos = 0;

		var disabledmap = {};	// TODO: Move disabled-command lookup into config.

		function checkname() {
			if (pos == lpos) return;
			arr.push(str.substring(lpos, pos));
		}

		for (; pos < str.length; pos++) {
			var c = str.charAt(pos);
			switch (c) {
				case '[':
				case ']':
				case '{':
				case '}':
				case '<':
				case '>':
				case '|':
					checkname();
					arr.push(c);
					lpos = pos + 1;
					break;
				case '#':
					checkname();
					arr.push('#');
					lpos = pos + 1;
					break;
				case '-':
				case '/':
					checkname();
					arr.push('/');
					lpos = pos + 1;
					break;
				case ' ':
				case ',':
					checkname();
					lpos = pos + 1;
					break;
				case '_': // Valid command-name character.
				default:
					break;
			}
		}

		checkname();

		pos = 0;
		var ctx = { control: toolbar, parent: null, dock: "flow", group: null };
		var cmd;
		var cmdsuffix;


		function MakeAlignRight() {
			ctx.alignRight = true;
		}

		function AddControl() {
			if (cmd in disabledmap)
				return;

			var nodectrl = _CreateToolbarItem(cmd, cmdsuffix, toolbar)
			if (!nodectrl) {
				console.error(cmd + " factory return nothing");
				return;
			}

			nodectrl.setAttribute(config.tooltipAttribute, __GetLangText(cmd));   // Tooltip text intentionally excludes cmdsuffix.
			nodectrl.setAttribute("rte-cmd-suffix", cmdsuffix);
			nodectrl.addEventListener("click", function (e) {
				__SaveMouseEvent(e);
				_RemoveTooltipRecent(nodectrl, true)
			})

			if (ismenu) {
				var menuitem = __Append(ctx.control, "rte-dropdown-menuitem", "display:flex;");
				menuitem.appendChild(nodectrl);
				var menutext = __Append(menuitem, "rte-dropdown-menuitem-label");
				menutext.innerText = __GetLangText(cmd);
				menuitem.setAttribute("aria-label", menutext.innerText);
				if (menuitem.__rteSyncActionLabel) menuitem.__rteSyncActionLabel();
				var func = nodectrl.onclick;
				nodectrl.onclick = function () { };
				menuitem.onclick = function (e) {
					__Close_CurrentPopup();
					func(e);
				}
				return menuitem;
			}
			else {
				ctx.control.appendChild(nodectrl);
				return nodectrl;
			}

		}
		var ribboncount = 0;
		function EnterRibbon() {
			if (ribboncount == 0) {
				container.classList.add("rtetoolbarwithribbon");
			}
			ribboncount++;

			var group = __Append(ctx.control, "rte-ribbon-column", "display:flex;flex-direction:column;");
			var slot = -1;
			var btmgroup = null;

			var groupmain = __Append(group, "rte-ribbon-main", "flex:9999;display:flex;flex-direction:row;");
			var grouptext = __Append(group, "rte-ribbon-text", "text-align:center;", "");

			var tbg = __Append(groupmain, "rte-ribbon-group-left", "display:flex;flex-direction:column");
			var panel = __Append(groupmain, "rte-ribbon-group-right", "display:flex;flex-direction:column;");
			var panelrow = __Append(panel, "rte-ribbon-group-row", "display:flex;flex-direction:row");

			ctx = { control: panelrow, parent: ctx, dock: "flow", group: cmd };

			var currctx = ctx;
			while (!currctx.leaved && pos < arr.length) {
				cmd = arr[pos];

				var spos = cmd.indexOf(':');
				if (spos != -1) {
					cmdsuffix = cmd.substring(spos + 1);
					cmd = cmd.substring(0, spos);
				}
				else {
					cmdsuffix = null;
				}

				pos++;
				if (cmd.length == 1) {
					ProcessNode(cmd);
					continue;
				}

				var fc = cmd.charAt(0);
				if (fc == '@') {
					grouptext.innerText = __GetLangText(cmd.substring(1));
					continue;
				}
				if (fc == '!') {
					grouptext.innerText = cmd.substring(1);
					continue;
				}

				if (currctx != ctx) {
					AddControl();
					continue;
				}

				if (cmd in disabledmap)
					continue;

				var nodectrl = _CreateToolbarItem(cmd, cmdsuffix, toolbar);
				if (!nodectrl) {
					console.warn("no control constructed for cmd : " + cmd);
					continue;
				}

				//nodectrl.style.width = '24px';
				//nodectrl.style.height = '24px';

				slot++;

				if (slot == 0) {

					var topgroup = __Append(tbg, "rte-ribbon-group-big", "flex:9999;display:flex;align-items:center;justify-items:center;");

					topgroup.appendChild(nodectrl);


					continue;
				}

				if (slot == 1) {
					btmgroup = __Append(tbg, "rte-ribbon-group-small");
				}

				if (slot <= 2) {
					btmgroup.appendChild(nodectrl);
				}

			}
		}

		function EnterTBGroup(follow) {
			var group = __Append(ctx.control, "rte-toolbar-group");
			if (cmd == '[')
				group.classList.add("rte-toolbar-group-noradius");
			if (ctx.alignRight) {
				group.style.flex = '9999';
				group.style.justifyContent = 'flex-end';
			}
			ctx.control.appendChild(group);
			ctx = { control: group, parent: ctx, dock: "left", group: cmd };
		}

		function ExitGroup() {
			if ((ctx.group == "<" && cmd == ">") || (ctx.group == "{" && cmd == "}") || (ctx.group == "[" && cmd == "]")) {
				var cs = ctx.control._childs;
				if (ctx.control.childNodes.length == 0) {
					ctx.control.parentNode.remove();
				}
				ctx.leaved = true;
				ctx = ctx.parent;
			}
		}
		function FollowGroupOrSpliter() {
			if (ctx.group == '{' || ctx.group == '[') {
				cmd = ctx.group;
				if (ctx.control.childNodes.length == 0) {
					ctx.control.remove();
				}
				//var cs = ctx.control._childs;
				//if (!cs || cs.length == 0) ctx.control.dispose();
				ctx.leaved = true;
				ctx = ctx.parent;
				EnterTBGroup(true);
			}
			else {
				__Append(ctx.control, "rte-line-spliter", "");
			}
		}

		function AddLineBreak() {
			if (ctx.control == toolbar) {
				ctx.alignRight = false;
				__Append(ctx.control, "rte-line-break");
				return;
			}
			if (ctx.control.nodeName.toLowerCase() == "rte-ribbon-group-row") {
				ctx.control = __Append(ctx.control.parentNode, "rte-ribbon-group-row", "display:flex;flex-direction:row");
			}
			else {

			}
		}


		function ProcessNode(cmd) {
			switch (cmd) {
				case '<':
					EnterRibbon();
					break;
				case '{':
				case '[':
					EnterTBGroup();
					break;
				case '>':
				case '}':
				case ']':
					ExitGroup();
					break;
				case '|':
					FollowGroupOrSpliter();
					break;
				case '#':
					MakeAlignRight();
					break;
				case '/':
					AddLineBreak();
					break;
				default:
					AddControl();
					break;
			}
		}

		function ProcessNext() {
			while (pos < arr.length) {
				cmd = arr[pos];

				var spos = cmd.indexOf(':');
				if (spos != -1) {
					cmdsuffix = cmd.substring(spos + 1);
					cmd = cmd.substring(0, spos);
				}
				else {
					cmdsuffix = null;
				}

				pos++;
				ProcessNode(cmd);
				continue;
			}
		}
		ProcessNext();

		__Update_Toolbar_Element(toolbar);
	}

	function __Is_SubToolbarShow(subname) {
		return subtoolbar.currentname == subname;
	}

	function __Toggle_SubToolbar(subname) {
		subtoolbar.innerHTML = "";
		if (subtoolbar.currentname == subname) {
			subtoolbar.style.display = "none";
			subtoolbar.currentname = null;
			return;
		}
		var strconfig = config["subtoolbar_" + subname];
		if (!strconfig) return debuglog('miss subtoolbar ' + subname);
		__ParseItemList(strconfig, subtoolbar);
		subtoolbar.style.transformOrigin = "top";
		subtoolbar.style.transform = "scaleY(0)";
		subtoolbar.style.transition = "transform 0.1s";
		subtoolbar.style.display = "flex";
		setTimeout(function () { subtoolbar.style.transform = ""; }, 10);
		subtoolbar.currentname = subname;
	}

	function __Update_Toolbar_Element(tb) {
		var coll = tb.querySelectorAll("rte-toolbar-dropdown");
		for (var i = 0; i < coll.length; i++) {
			var span = coll[i];
			if (span._update) span._update();
		}

		var coll = tb.querySelectorAll("rte-toolbar-button,rte-toolbar-arrowbutton,rte-toolbar-splitbutton,rte-toolbar-dropdown");
		for (var i = 0; i < coll.length; i++) {
			var span = coll[i];
			if (!span.command) continue;
			var enabled = __Is_Cmd_Enabled(span.command);
			if (span.cmdenabled !== enabled) {
				if (span.cmdenabled === true) span.classList.remove("rte-command-enabled");
				if (span.cmdenabled === false) span.classList.remove("rte-command-disabled");
				if (enabled) span.classList.add("rte-command-enabled");
				if (!enabled) span.classList.add("rte-command-disabled");
				span.cmdenabled = enabled;
			}
			span.setAttribute("aria-disabled", enabled ? "false" : "true");
			if (span.getAttribute("role") != "group")
				span.tabIndex = enabled ? 0 : -1;
			var splitdirect = span.querySelector("rte-toolbar-splitbutton-direct");
			if (splitdirect) {
				splitdirect.setAttribute("aria-disabled", enabled ? "false" : "true");
				splitdirect.tabIndex = enabled ? 0 : -1;
			}
			var splitdrop = span.querySelector("rte-toolbar-splitbutton-dropdown");
			if (splitdrop) {
				splitdrop.setAttribute("aria-disabled", enabled ? "false" : "true");
				splitdrop.tabIndex = enabled ? 0 : -1;
			}
			var active = !!__Is_Cmd_Active(span.command); // Normalize null/undefined so strict comparisons work.
			if (span.cmdactive !== active) {
				if (span.cmdactive === true) span.classList.remove("rte-command-active");
				if (span.cmdactive === false) span.classList.remove("rte-command-deactive");
				if (active) span.classList.add("rte-command-active");
				if (!active) span.classList.add("rte-command-deactive");
				span.cmdactive = active;
			}

			var visible = __Is_Cmd_Visible(span.command);
			if (span.cmdvisible !== visible) {
				span.style.display = visible ? '' : 'none';
				span.cmdvisible = visible;
			}
			if (span.__rteSyncActionLabel) span.__rteSyncActionLabel();
		}
	}

	function ___Update_Toolbars() {
		__Update_Toolbar_Element(toolbarDesktop);
		__Update_Toolbar_Element(toolbarMobile);
		__Update_Toolbar_Element(subtoolbar);
	}


	function __Is_Cmd_Enabled(name) {

		var cmdlower = name.toLowerCase();


		if (_isreadonly || ___Is_CodeMode()) {

			switch (cmdlower) {
				case "code":
				case "togglemore":
				case "fullscreen":
				case "fullscreenenter":
				case "fullscreenexit":
				case "selectall":
				case "copy":
				case "preview":
				case "print":
				case "save":
				case "html2pdf":
					return true;
			}
			return false;
		}

		if (__sel_cells_start) {
			var tds = _DoTableOperationCore("query", "querycells", __GetTable(__sel_cells_start), __sel_cells_start, __sel_cells_end || __sel_cells_start);
			if (tds && tds.length > 1) {
				if (cmdlower.substring(0, 6) == "insert")
					return false;
				switch (cmdlower) {
					case "cut":
					case "copy":
					case "paste":
						return false;
				}

			}
		}


		switch (cmdlower) {
			case "undo":
				return undolist.length != 0;
				break;
			case "redo":
				return redolist.length != 0;
				break;
		}

		return true;

		//if (editdoc.queryCommandSupported(name)) {
		//	return editdoc.queryCommandEnabled(name);
		//}
	}

	function __Is_Cmd_Visible(name) {
		var cmdlower = name.toLowerCase();
		switch (cmdlower) {
			case "fullscreenenter":
				return !container.classList.contains("rte-fullpage");
			case "fullscreenexit":
				return container.classList.contains("rte-fullpage");
			case "controlinsertlink":
				return __FindSelectionElement("A") == null;
			case "controlopenlink":
				return __FindSelectionElement("A") != null;
			case "controleditlink":
				return __FindSelectionElement("A") != null;
			case "controlunlink":
				return __FindSelectionElement("A") != null;
		}
	}



	function __Is_Cmd_Active(name) {
		var cmdlower = name.toLowerCase();

		switch (cmdlower) {
			case "code":
				return ___Is_CodeMode();
			case "togglemore":
				return __Is_SubToolbarShow("more") || __Is_SubToolbarShow("more_mobile");
			case "fullscreen":
			case "fullscreenenter":
			case "fullscreenexit":
				return container.classList.contains("rte-fullpage")
		}

		if (cmdlower.substring(0, 7) == "toggle_") {
			return __Is_SubToolbarShow(cmdlower.substring(7));
		}


		if (___Is_CodeMode()) {
			switch (cmdlower) {
				case "code":
					return true;
			}

			return false;
		}

		switch (cmdlower) {
			case "spellcheck":
				return editable.getAttribute("spellcheck") == "true"
			case "insertcomment":
				return !!__FindSelectionCommentElement();
			case "tableheader":
				return __Table_HasHeader();
			case "lineheight":
				var rb = __Find_Selection_Root_Block();
				var currlh = rb && rb.style.lineHeight;
				return !!currlh;
			case "indent":
				return !!__FindSelectionElement("BLOCKQUOTE");
			case "strike":
				return __HasSelectionStyle("text-decoration", "textDecoration", "line-through");
			case "inlinestyle":
				return __Is_Cmd_Active_InlineStyles();
			case "paragraphstyle":
				return __Is_Cmd_Active_ParagraphStyles();
			case "imagestyle":
				return __Is_Cmd_Active_ImageStyles();
			case "linkstyle":
				return __Is_Cmd_Active_LinkStyles();
			case "justify":
				name = cmdlower = "justifyfull";
				break;
			case "toggleborder":
				return editable.classList.contains("rte-toggleborder");
			default:
				break;
		}

		try {
			if (editdoc.queryCommandSupported(name)) {
				return editdoc.queryCommandState(name);
			}
		}
		catch (x) { // IE11 may throw for unsupported queryCommandEnabled calls.
			return true;
		}
	}



	function __Before_UI_Action() {
		__Focus_Editor_Ensure();
		__SetTimeout_HandleSelectionChange();
	}

	function __Exec_Cmd_ForUI(name, value) {
		___CurrentBookmark_Commit();
		__Before_UI_Action();
		__Exec_Cmd_Core(name, value);
		if (!__IsDialogJustShow()) __Focus_Editor_Ensure();
	}

	function __Exec_Cmd_Core(name, value) {

		debuglog("exec", name, value);

		if (!__Is_Cmd_Enabled(name)) {
			debuglog("not enabled", name)
			return false;
		}

		var cmdlower = name.toLowerCase();

		var retval = InvokeEventHook("exec_command_" + cmdlower, cmdlower, value);
		if (retval !== undefined)
			return retval;

		var retval = InvokeEventHook("exec_command", cmdlower, value);
		if (retval !== undefined)
			return retval;

		if (cmdlower[0] == "t" && cmdlower.substring(0, 7) == "toggle_") {
			__Toggle_SubToolbar(cmdlower.substring(7));
			return;
		}

		switch (cmdlower) {
			case "justify":
				name = cmdlower = "justifyfull";
				break;
		}

		if (__sel_cells_start) {
			var tds = _DoTableOperationCore("query", "querycells", __GetTable(__sel_cells_start), __sel_cells_start, __sel_cells_end || __sel_cells_start);
			if (tds && tds.length > 1) {
				switch (cmdlower) {
					case "tablecellforecolor":
						__UI_ColorPickerDialog("forecolor", function (val) {
							for (var tdi = 0; tdi < tds.length; tdi++)
								tds[tdi].style.color = val;
						});
						return;
					case "tablecellbackcolor":
						__UI_ColorPickerDialog("backcolor", function (val) {
							for (var tdi = 0; tdi < tds.length; tdi++)
								tds[tdi].style.backgroundColor = val;
						});
						return;
					default:
						if (editdoc.queryCommandSupported(cmdlower)) {
							for (var tdi = 0; tdi < tds.length; tdi++) {
								var td = tds[tdi];
								editsel.setPosition(td, 0);
								editsel.extend(td, td.childNodes.length);
								editdoc.execCommand(cmdlower, false, value);
							}
							var endcell = __sel_cells_end || __sel_cells_start;
							//editsel.setPosition(endcell, 0)
							editsel.setPosition(endcell, endcell.childNodes.length);
							return;
						}

				}
			}
		}

		switch (cmdlower) {
			case "insertorderedlist":
			case "insertunorderedlist":
				__ExecInsertList(cmdlower);
				break;
			case "formatblock":
				__ExecFormatBlock(value);
				break;
			case "insertblockquote":
				__ExecFormatBlock("BLOCKQUOTE");
				break;
			// TODO: Improve indentation handling for nested blocks and lists.
			case "removeformat":
				editdoc.execCommand("removeformat");
				__ClearSelectionStyles();
				break;
			case "fontsize":
				__ToggleSelectionStyle("font-size", "fontSize", value, false);
				break;
			case "forecolor":
				__ToggleSelectionStyle("color", "color", value, false, true)
				break;
			case "backcolor":
				__ToggleSelectionStyle("background-color", "backgroundColor", value, false, true)
				break;
			case "tablecellforecolor":
				var rn0 = __Find_Selection_Root_Block();
				if (!rn0) return;
				__UI_ColorPickerDialog("forecolor", function (val) {
					rn0.style.color = val;
				});
				break;
			case "tablecellbackcolor":
				var rn0 = __Find_Selection_Root_Block();
				if (!rn0) return;
				__UI_ColorPickerDialog("backcolor", function (val) {
					rn0.style.backgroundColor = val;
				});
				break;
			case "pmoveup":
				var rn0 = __Find_Selection_Root_Block();
				if (rn0 && rn0.nodeName != "TD" && rn0.nodeName != "TH" && rn0.previousSibling) {
					if (rn0.nextSibling)
						rn0.parentNode.insertBefore(rn0.previousSibling, rn0.nextSibling);
					else
						rn0.parentNode.appendChild(rn0.previousSibling);
				}
				break;
			case "pmovedown":
				var rn0 = __Find_Selection_Root_Block();
				if (rn0 && rn0.nodeName != "TD" && rn0.nodeName != "TH" && rn0.nextSibling) {
					rn0.parentNode.insertBefore(rn0.nextSibling, rn0);
				}
				break;
			case "pduplicate":
				var rn0 = __Find_Selection_Root_Block();
				if (rn0 && rn0.nodeName != "TD" && rn0.nodeName != "TH") {
					var newnode = rn0.cloneNode(true);
					newnode.removeAttribute("__rte_selected_block");
					newnode.removeAttribute("__rte_selected_hover__");

					try { rn0.parentNode.insertBefore(newnode, rn0); } catch (x) { }
				}
				break;
			case "pdelete":
				var rn0 = __Find_Selection_Root_Block();
				if (rn0 && rn0.nodeName != "TD" && rn0.nodeName != "TH") {
					rn0.remove();
				}
				break;
			case "tableheader":
				return __Table_ToggleHeader();
			case "help":
				//window.open("https://www.richtexteditor.com/?go=help");
				__UI_Dialog_About();
				break;
			case "newdoc":
				___CurrentBookmark_Commit();
				__SetHTMLCode("");
				break;
			case "save":
				__DoSave()
				break;
			case "printpreview":
				if (typeof editor.printPreview === "function") editor.printPreview();
				break;
			case "readingmode":
				if (typeof editor.toggleReadingMode === "function") editor.toggleReadingMode();
				break;
			case "highlight":
				try { __ToggleHighlight(); } catch (e) { /* ignore */ }
				break;
			case "sortlines":
				try { __SortSelectedLines(); } catch (e) { /* ignore */ }
				break;
			case "load":
				__DoLoad();
				break;
			case "spellcheck":
				if (editable.getAttribute("spellcheck") == "true") {
					editable.setAttribute("spellcheck", "false")
				}
				else {
					editable.setAttribute("spellcheck", "true")
				}
				break;
			case "insertcomment":
				__UI_InsertComment();
				break;
			case "insertpagebreak":
				__UI_InsertPageBreak();
				break;
			case "insertmergefield":
				__UI_InsertMergeField();
				break;
			case "insertfootnote":
				__UI_InsertFootnote();
				break;
			case "inserttoc":
				__UI_InsertTableOfContents();
				break;
			case "revisionhistory":
				__UI_RevisionHistory();
				break;
			case "preview":
				__UI_PreviewDialog();
				break;
			case "code":
				___Toggle_CodeMode();
				break;
			case "togglemore":
				if (__Is_SubToolbarShow("more"))
					__Toggle_SubToolbar("more");
				else if (__Is_SubToolbarShow("more_mobile"))
					__Toggle_SubToolbar("more_mobile");
				else
					__Toggle_SubToolbar(__ShallUseMobileToolbar() ? "more_mobile" : "more");
				break;
			case "toggleborder":
				editable.classList.toggle("rte-toggleborder");
				break;
			case "undo":
				__Undo();
				break;
			case "redo":
				__Redo();
				break;
			case "fullscreenenter":
				if (!container.classList.contains("rte-fullpage")) {
					container.classList.add("rte-fullpage");
					container.style.zIndex = config.zIndexFullPage;
				}
				__ApplyToolbarForWidth(true);
				//___Update_Toolbars(); // Refresh toolbar state for code mode.
				break;
			case "fullscreenexit":
				if (container.classList.contains("rte-fullpage")) {
					container.classList.remove("rte-fullpage");
					container.style.zIndex = "";
				}
				__ApplyToolbarForWidth(true);
				//___Update_Toolbars(); // Refresh toolbar state for code mode.
				break;
			case "fullscreen":
				if (!container.classList.contains("rte-fullpage")) {
					container.classList.add("rte-fullpage");
					container.style.zIndex = config.zIndexFullPage;
				}
				else {
					container.classList.remove("rte-fullpage");
					container.style.zIndex = "";
				}
				___Update_Toolbars(); // Refresh toolbar state for code mode.
				break;
			case "insertdate":
				__InsertText(new Date().toLocaleString());
				__Collapse(false);
				break;
			case "insertanchor":
				__UI_InsertAnchor();
				break;
			case "insertimagebycamera":
				var dialogpanel = __UI_CreateDialogFrame(__GetLangText("insertimage"), "rte-panel-insertimage rte-panel-insertimage-camera", function () {

				});
				ShowImageDialogUI(dialogpanel, "camera");
				break;
			case "insertimagebyurl":
				var dialogpanel = __UI_CreateDialogFrame(__GetLangText("insertimage"), "rte-panel-insertimage rte-panel-insertimage-camera", function () {

				});
				ShowImageDialogUI(dialogpanel, "byurl");
				break;
			case "insertimagedragdrop":
				var dialogpanel = __UI_CreateDialogFrame(__GetLangText("insertimage"), "rte-panel-insertimage rte-panel-insertimage-camera", function () {

				});
				ShowImageDialogUI(dialogpanel, "dragdrop");
				break;
			case "imageupload":
				var input = document.createElement("input")
				input.type = "file";
				input.accept = ".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg";
				// 2026-05-08 bug fix: save the editor's current selection
				// BEFORE opening the OS file picker. The file picker steals
				// focus and clears the editor's selection, so when
				// __InsertFile runs later, __InsertRootParagraph reads
				// editsel.focusNode === null and falls back to
				// `editable.appendChild(...)` — which dumps the uploaded
				// image at the bottom of the document instead of at the
				// caret position. Restoring the saved range right before
				// __InsertFile runs makes the image land where the user
				// actually had the caret. Reported by Nathan Allen,
				// 2026-05-08.
				// 2026-05-11 Kenneth Chen: capture from BOTH live selection AND
				// the persistent __lastInEditorRange tracker — toolbar mousedown
				// may already have shifted focus before this handler runs, so
				// the live editsel can be empty by the time we reach here.
				var __iu_savedRange = null;
				try {
					if (editsel.rangeCount > 0 && editsel.anchorNode && editable.contains(editsel.anchorNode)) {
						__iu_savedRange = editsel.getRangeAt(0).cloneRange();
					} else if (__lastInEditorRange) {
						__iu_savedRange = __lastInEditorRange.cloneRange();
					}
				} catch (e) { __iu_savedRange = null; }
				input.onchange = function () {
					var rangeToRestore = __iu_savedRange || __lastInEditorRange;
					if (rangeToRestore) {
						try {
							if (editable.focus) editable.focus();
							editsel.removeAllRanges();
							editsel.addRange(rangeToRestore);
						} catch (e) { /* fall through to default behaviour */ }
					}
					__InsertFile(input.files[0])
				}
				input.click();
				break;
			case "editimage":

				if (__GetSelectedControl()) __UI_Dialog_EditImage(__GetSelectedControl());
				break;
			case "imagecaption":
				if (__GetSelectedControl()) __ToggleImageCaption(__GetSelectedControl());
				break;
			case "pasteauto":
			case "pastetext":
			case "pasteword":
				__UI_Dialog_Paste(cmdlower);
				break;
			case "unlink":
				__Exec_Cmd_Unlink();
				break;
			case "delete":
			case "backspace":
				__Delete();
				break;
			case "strike":
				__ToggleSelectionStyle("text-decoration", "textDecoration", "line-through", true);
				break;
			case "ucase":
				__ProcessSelectionTextNodes(function (text) { return text.toUpperCase() });
				break;
			case "lcase":
				__ProcessSelectionTextNodes(function (text) { return text.toLowerCase() });
				break;
			case "titlecase":
				__ProcessSelectionTextNodes(__ConvertTextToTitleCase);
				break;

			case "tablerowinsertabove":
			case "tablerowinsertbelow":
			case "tablecolumninsertleft":
			case "tablecolumninsertright":
			case "tablecellmerge":
			case "tablecellsplitver":
			case "tablecellsplithor":
			case "tablerowdelete":
			case "tablecolumndelete":
			case "tabledelete":
				_DoTableOperation("exec", cmdlower);
				break;
			case "justifyleft":
			case "justifyright":
			case "justifycenter":
				var ctrl = __GetSelectedControl();
				if (ctrl == null) {
					__Exec_Cmd_Default(name);
					break;
				}
				ctrl.style.cssFloat = ctrl.style.float = "";
				debuglog(ctrl.parentNode, editwin.getComputedStyle(ctrl.parentNode).display)
				if (ctrl.parentNode != editable && editwin.getComputedStyle(ctrl.parentNode).display != "inline") {
					debuglog(cmdlower.substring(7), ctrl.parentNode.textAlign)
					ctrl.parentNode.style.textAlign = cmdlower.substring(7);
				}
				else {

				}
				break;
			case "floatleft":
			case "floatright":
				var ctrl = __GetSelectedControl();
				if (ctrl == null)
					break;
				ctrl.style.cssFloat = ctrl.style.float = cmdlower.substring(5);
				break;
			case "controlopenlink":
				var a = __FindSelectionElement("A");
				if (a) window.open(a.href);
				break;
			case "controlunlink":
				var a = __FindSelectionElement("A");
				__RemoveNodeOnly(a);
				break;
			case "superscript":
			case "subscript":
				editdoc.execCommand("styleWithCSS", false, false);
				editdoc.execCommand(name, false, value)
				editdoc.execCommand("styleWithCSS");
				break;
			case "cut":
				if (___Is_CodeMode()) {
					__codemodeinp.focus();
					document.execCommand("cut");
				}
				else {
					var selctrl = __GetSelectedControl();
					//debuglog(selctrl)
					if (selctrl) {
						var r = editdoc.createRange();
						r.selectNode(selctrl);
						editsel.empty();
						editsel.addRange(r);
					}
					editdoc.execCommand("cut");
				}
				break;
			case "copy":
				if (___Is_CodeMode()) {
					__codemodeinp.focus();
					document.execCommand("copy");
				}
				else {
					var selctrl = __GetSelectedControl();
					//debuglog(selctrl)
					if (selctrl) {
						var r = editdoc.createRange();
						r.selectNode(selctrl);
						editsel.empty();
						editsel.addRange(r);
					}
					editdoc.execCommand("copy");
					if (selctrl) {
						__SelectControl(selctrl)
					}
				}
				__Toast(__GetLangText("copied"));
				break;
			case "selectall":
				if (___Is_CodeMode()) {
					__codemodeinp.select()
				}
				else __Exec_Cmd_Default(name, value);
				break;
			default:

				if (cmdlower.substring(0, 11) == "controlsize") {
					//controlsize_100
					var ctrl = __GetSelectedControl() || __FindSelectionElement("table");
					if (ctrl == null)
						break;
					var size = cmdlower.substring(11);
					if (String(parseInt(size)) == size) {
						ctrl.style.maxWidth = "";
						ctrl.style.width = size + "%";
						ctrl.style.height = "";
					}
					else {
						ctrl.style.maxWidth = "";
						ctrl.style.width = size;
						ctrl.style.height = "";
					}
					break;
				}

				var ctrlinfo = _cmdtocontrolmap[cmdlower];
				if (ctrlinfo != null) {
					ctrlinfo.exec(value);
					break;
				}

				__Exec_Cmd_Default(name, value);

				break;
		}

	}

	function __Exec_Cmd_Default(name, value) {
		if (editdoc.queryCommandSupported(name)) {
			debuglog("exec default", name, value)
			if (value)
				editdoc.execCommand(name, false, value)
			else
				editdoc.execCommand(name);
		}
		else {
			console.warn("Invalid command : " + name)
		}
	}


	function __Table_HasHeader() {
		var table = __FindSelectionElement("table");
		if (!table)
			return false;
		for (var i = 0; i < table.childNodes.length; i++)
			if (table.childNodes[i].nodeName == "THEAD")
				return true;
		return false;
	}
	function __Table_ToggleHeader() {
		var table = __FindSelectionElement("table");
		if (!table)
			return false;
		for (var i = 0; i < table.childNodes.length; i++) {
			if (table.childNodes[i].nodeName == "THEAD") {
				table.removeChild(table.childNodes[i]);
				return;
			}
		}
		var thead = __Append(table, "THEAD");
		table.insertBefore(thead, table.firstChild);
		var maxcols = 0;
		for (var ri = 0; ri < table.rows.length; ri++) {
			var row = table.rows[ri];
			var colc = 0;
			for (var ci = 0; ci < row.cells.length; ci++) {
				colc++;
				if (row.cells[ci].colSpan > 1)
					colc += row.cells[ci].colSpan - 1;
			}
			if (colc > maxcols) maxcols = colc;
		}
		var row = __Append(thead, "TR");
		for (var i = 0; i < maxcols; i++) {
			__Append(row.insertCell(), "br"); // TODO: Use config for empty-cell filler markup.
		}
		__SetTimeout_HandleSelectionChange();
	}

	function _DoTableOperation(cmdtype, cmd) {

		if (__sel_cells_start && editable.contains(__sel_cells_start)) {
			var t = __GetTable(__sel_cells_start);
			if (t) {
				//debuglog("work for __sel_cells_start", __sel_cells_start, __sel_cells_end);
				return _DoTableOperationCore(cmdtype, cmd, t, __sel_cells_start, __sel_cells_end || __sel_cells_start);
			}
		}

		var fn = __GetTableCell(editsel.anchorNode);
		ln = fn;
		if (editsel.anchorNode != editsel.focusNode)
			ln = __GetTableCell(editsel.focusNode);

		var table = __GetTable(fn);

		if (!table || table == editable)
			return;

		if (fn != ln) {
			var table2 = __GetTable(ln);
			if (table != table2)
				return;
		}

		//debuglog(table, fn, ln)

		return _DoTableOperationCore(cmdtype, cmd, table, fn, ln);
	}
	function _DoTableOperationCore(cmdtype, cmd, table, cellstart, cellend) {


		var nodemap = {};	// Maps occupied table positions to their source cells.
		var flatmap = {};	// Maps flattened table positions for row insertion.
		var rowcount = table.rows.length;
		var colcount = 0;
		var overcount = 0;

		var tableallcells = [];

		for (var rowindex = 0; rowindex < rowcount; rowindex++) {
			var tr = table.rows[rowindex];

			var colindex = 0;
			for (var tdindex = 0; tdindex < tr.cells.length; tdindex++) {
				var td = tr.cells[tdindex];

				tableallcells.push(td);

				// Find the next empty position.
				var flatkey;
				while (true) {
					flatkey = rowindex + ":" + colindex;
					if (!flatmap[flatkey])
						break;
					// Already occupied.
					colindex++;
				}

				td._rowindex = rowindex;
				td._colindex = colindex;
				td._tdindex = tdindex;


				var rowspan = Math.max(1, parseInt(td.getAttribute("rowspan")) || 1);
				var colspan = Math.max(1, parseInt(td.getAttribute("colspan")) || 1);

				flatmap[flatkey] = nodemap[rowindex + ":" + tdindex] = {
					rowindex: rowindex, colindex: colindex, rowspan: rowspan, colspan: colspan
					, td: td, tr: tr, tdindex: tdindex, spannodes: null
				};

				colcount = Math.max(colcount, colindex + 1);


				if (rowspan == 1 && colspan == 1)
					continue;

				for (var coloffset = 0; coloffset < colspan; coloffset++) {
					var coli = coloffset + colindex;
					for (var rowoffset = 0; rowoffset < rowspan; rowoffset++) {
						if (coloffset == 0 && rowoffset == 0)	// Ignore the source cell.
							continue;

						var rowi = rowoffset + rowindex;

						if (rowi >= rowcount) {
							// Keep the flattened map for inserting the row below.
						}

						var info = flatmap[rowi + ":" + coli];
						if (!info)
							flatmap[rowi + ":" + coli] = info = { rowindex: rowi, colindex: coli, spannodes: [] };
						else
							overcount++;
						info.spannodes.push(td);

						colcount = Math.max(colcount, coli + 1);
					}
				}
			}
		}

		var emptycount = 0;

		var rowarr = [];
		for (var ri = 0; ri < rowcount; ri++) {
			var colarr = [];
			rowarr.push(colarr);
			for (var ci = 0; ci < colcount; ci++) {
				var info = flatmap[ri + ":" + ci];
				colarr.push(info);
				if (!info)
					emptycount++;
			}
		}

		if (emptycount != 0 || overcount != 0) {
			console.warn("wrong table");
		}

		//debuglog(rowcount, colcount, emptycount, overcount);
		//debuglog(rowarr);

		function GetCellInfo(cell) {
			return flatmap[cell._rowindex + ":" + cell._colindex];
		}

		var infostart = GetCellInfo(cellstart);
		var infoend = cellstart == cellend ? infostart : GetCellInfo(cellend);

		//debuglog(infostart, infoend)

		// Read the selected table range.
		var minri = Math.min(infostart.rowindex, infoend.rowindex);
		var maxri = Math.max(infostart.rowindex + infostart.rowspan, infoend.rowindex + infoend.rowspan)
		var minci = Math.min(infostart.colindex, infoend.colindex);
		var maxci = Math.max(infostart.colindex + infostart.colspan, infoend.colindex + infoend.colspan)

		//debuglog(infostart.rowindex, infostart.rowspan, infostart.colindex, infostart.colspan)
		//debuglog(infoend.rowindex, infoend.rowspan, infoend.colindex, infoend.colspan)
		//debuglog(minri, maxri, minci, maxci)


		// Count how many cells fall inside the range.
		var allseltds = [cellstart];	// Keep cellstart at index 0.

		if (cellstart != cellend) {
			allseltds.push(cellend);	// Keep cellend at index 1.
			for (var ri = minri; ri < maxri; ri++) {
				for (var ci = minci; ci < maxci; ci++) {
					var info = flatmap[ri + ":" + ci];
					if (!info) continue;
					if (info.spannodes) {
						for (var i = 0; i < info.spannodes.length; i++) {
							var td = info.spannodes[i];
							if (!allseltds.includes(td))
								allseltds.push(td);
						}
					}
					else {
						if (!allseltds.includes(info.td))
							allseltds.push(info.td);
					}
				}
			}
		}

		if (cmdtype == "query" && cmd == "querycells") {
			return allseltds;
		}

		debuglog("table " + cmdtype + " " + cmd, allseltds)


		// Recalculate the min and max row and column indexes.

		if (cmdtype == "exec" && cmd == "tablecolumndelete") {
			// Delete the column range [minci, maxci).
			for (var ci = minci; ci < maxci; ci++) { // Delete each selected column.
				var processedmap = {}
				for (var ri = 0; ri < rowcount; ri++) {
					var info = flatmap[ri + ":" + ci];
					if (!info) continue;
					var arr = info.spannodes || [info.td];
					for (var i = 0; i < arr.length; i++) {
						var td = arr[i];
						var tdkey = td._rowindex + ":" + td._colindex;
						if (processedmap[tdkey])
							continue;
						processedmap[tdkey] = true;
						var colspan = Math.max(1, parseInt(td.getAttribute("colspan")) || 1);
						if (colspan > 1) {
							if (colspan - 1 > 1)
								td.setAttribute("colspan", colspan - 1)
							else
								td.removeAttribute("colspan");
						}
						else {
							td.remove();
						}
					}
				}
			}
		}

		if (cmdtype == "exec" && cmd == "tablerowdelete") {
			// Delete the row range [minri, maxri).
			var trlist = [];
			for (var ri = minri; ri < maxri; ri++) { // Delete each selected row.
				trlist.push(table.rows[ri]);
				var processedmap = {}
				for (var ci = 0; ci < colcount; ci++) {
					var info = flatmap[ri + ":" + ci];
					if (!info) continue;
					var arr = info.spannodes || [info.td];
					for (var i = 0; i < arr.length; i++) {
						var td = arr[i];
						var tdkey = td._rowindex + ":" + td._colindex;
						if (processedmap[tdkey])
							continue;
						processedmap[tdkey] = true;
						var rowspan = Math.max(1, parseInt(td.getAttribute("rowspan")) || 1);
						if (rowspan > 1) {
							if (rowspan - 1 > 1)
								td.setAttribute("rowspan", rowspan - 1)
							else
								td.removeAttribute("rowspan");
							if (td.parentNode == table.rows[ri]) {	//move to next row..
								var ntr = table.rows[ri + 1];
								if (ntr) {
									var nsbtd = null;
									// Find another cell to use as the insertion reference.
									for (var nsbci = ci + 1; nsbci < colcount; nsbci++) {
										var nsbinfo = flatmap[(ri + 1) + ":" + nsbci];
										if (!nsbinfo || !nsbinfo.td || nsbinfo.td.parentNode != ntr) continue;
										nsbtd = nsbinfo.td;
										break;
									}
									ntr.insertBefore(td, nsbtd);
								}
							}
						}
						else {
							td.remove();
						}
					}
				}
			}
			for (var i = 0; i < trlist.length; i++)
				trlist[i].remove();
		}

		function InsertRowAt(insertri, refri) {	// TODO: Clone row attributes from refri.
			var insertcount = colcount;
			var processedmap = {}
			for (var ci = 0; ci < colcount; ci++) {
				var info = flatmap[insertri + ":" + ci];
				if (info && info.spannodes) {
					for (var i = 0; i < info.spannodes.length; i++) {
						var td = info.spannodes[i];
						if (td._rowindex == insertri)
							continue;
						var tdkey = td._rowindex + ":" + td._colindex;
						if (processedmap[tdkey])
							continue;
						processedmap[tdkey] = true;
						td.setAttribute("rowspan", 1 + Math.max(1, parseInt(td.getAttribute("rowspan")) || 1))
						insertcount -= Math.max(1, parseInt(td.getAttribute("colspan")) || 1);
					}

				}
			}

			var tr = table.insertRow(insertri);
			// Copy row height and style from the reference row when available.
			var reftr = table.rows[refri];
			if (reftr) {
				if (reftr.style.cssText) tr.style.cssText = reftr.style.cssText;
			}
			for (var i = 0; i < insertcount; i++)
			{
				var cell1 = tr.insertCell(-1);
				// Copy cell style from the matching reference cell when available.
				if (reftr && reftr.cells[i]) {
					var refcell = reftr.cells[i];
					if (refcell.style.cssText) cell1.style.cssText = refcell.style.cssText;
					if (refcell.getAttribute("width")) cell1.setAttribute("width", refcell.getAttribute("width"));
				}
				cell1.innerHTML = "<br />";
			}
		}

		if (cmdtype == "exec" && cmd == "tablerowinsertabove") {
			InsertRowAt(minri, minri);
		}
		if (cmdtype == "exec" && cmd == "tablerowinsertbelow") {
			InsertRowAt(maxri + 1, maxri);
		}

		function InsertColumnAt(insertci, refci) {	// TODO: Clone cell attributes from refci.


			var insertcount = rowcount;
			var processedmap = {}
			for (var ri = 0; ri < rowcount; ri++) {
				var info = flatmap[ri + ":" + insertci];
				debuglog(info)
				if (info && info.spannodes) {
					var addedspan = false;
					for (var i = 0; i < info.spannodes.length; i++) {
						var td = info.spannodes[i];
						td.innerHTML = "<br />";
						if (td._colindex == insertci)
							continue;
						var tdkey = td._rowindex + ":" + td._colindex;
						if (processedmap[tdkey]) {
							addedspan = true;
							continue;
						}
						processedmap[tdkey] = true;
						td.setAttribute("colspan", 1 + Math.max(1, parseInt(td.getAttribute("colspan")) || 1))
						addedspan = true;
					}
					if (addedspan)
						continue;
				}

				var tdnodename = "TD";
				try { tdnodename = table.rows[ri].cells[0].nodeName; } catch (x) { }
				var td = table.ownerDocument.createElement(tdnodename);
				// Find a suitable insertion point.
				var ntr = table.rows[ri];
				var nsbtd = null;
				if (info && info.td) {
					nsbtd = info.td;
				}
				else {
					// Find another cell to use as the insertion reference.
					for (var nsbci = insertci; nsbci < colcount; nsbci++) {
						var nsbinfo = flatmap[ri + ":" + nsbci];
						if (!nsbinfo || !nsbinfo.td || nsbinfo.td.parentNode != ntr) continue;
						nsbtd = nsbinfo.td;
						break;
					}
				}
				ntr.insertBefore(td, nsbtd);

			}
		}

		if (cmdtype == "exec" && cmd == "tablecolumninsertleft") {
			InsertColumnAt(minci, minci);
		}
		if (cmdtype == "exec" && cmd == "tablecolumninsertright") {
			InsertColumnAt(maxci, maxci - 1);
		}

		if (cmdtype == "exec" && cmd == "tablecellsplitver") {
			if (infostart == infoend) {
				if (maxri - minri == 1) {
					// TODO: Handle splitting a single cell without rowspan.

					var newrow = table.insertRow(maxri);
					var newtd = infostart.td.cloneNode(false);
					newrow.appendChild(newtd);

					for (var ci = 0; ci < colcount; ci++) {
						var info = flatmap[minri + ":" + ci];
						if (!info) continue;
						var arr = info.spannodes || [info.td];
						for (var i = 0; i < arr.length; i++) {
							var td = arr[i];
							if (td == infostart.td)
								continue;
							if (td._colindex != ci)
								continue;
							td.setAttribute("rowspan", 1 + Math.max(1, parseInt(td.getAttribute("rowspan")) || 1))
						}
					}

					return;
				}
			}
			for (var tdi = 0; tdi < allseltds.length; tdi++) {
				var td = allseltds[tdi];
				var rowspan = Math.max(1, parseInt(td.getAttribute("rowspan")) || 1);
				if (rowspan == 1) continue;
				td.removeAttribute("rowspan");
				for (var i = 1; i < rowspan; i++) {
					var newtd = table.ownerDocument.createElement(td.nodeName);
					__CopyAttributes(td, newtd);
					// Find a suitable insertion point.
					var ri = td._rowindex + i;
					var ntr = table.rows[ri];
					var nsbtd = null;
					for (var nsbci = td._colindex; nsbci < colcount; nsbci++) {
						var nsbinfo = flatmap[ri + ":" + nsbci];
						if (!nsbinfo || !nsbinfo.td || nsbinfo.td.parentNode != ntr) continue;
						nsbtd = nsbinfo.td;
						break;
					}
					ntr.insertBefore(newtd, nsbtd);
				}
			}
		}

		if (cmdtype == "exec" && cmd == "tablecellsplithor") {

			if (infostart == infoend) {
				if (maxci - minci == 1) {
					// TODO: Handle splitting a single cell without colspan.
					var newtd = infostart.td.cloneNode(false);
					infostart.td.parentNode.insertBefore(newtd, infostart.td.nextSibling);
					for (var ri = 0; ri < rowcount; ri++) {
						var info = flatmap[ri + ":" + minci];
						if (!info) continue;
						var arr = info.spannodes || [info.td];
						for (var i = 0; i < arr.length; i++) {
							var td = arr[i];
							if (td == infostart.td)
								continue;
							if (td._rowindex != ri)
								continue;
							td.setAttribute("colspan", 1 + Math.max(1, parseInt(td.getAttribute("colspan")) || 1))
						}
					}
					return;
				}
			}
			for (var tdi = 0; tdi < allseltds.length; tdi++) {
				var td = allseltds[tdi];
				var colspan = Math.max(1, parseInt(td.getAttribute("colspan")) || 1);
				if (colspan == 1) continue;
				td.removeAttribute("colspan");
				for (var i = 1; i < colspan; i++) {
					var newtd = table.ownerDocument.createElement(td.nodeName);
					__CopyAttributes(td, newtd);
					td.parentNode.insertBefore(newtd, td.nextSibling);
				}

			}
		}

		if (cmdtype == "exec" && cmd == "tablecellmerge") {

			function CalcCanMerge() {
				var cellcount = 0;
				for (var ri = minri; ri < maxri; ri++) {
					for (var ci = minci; ci < maxci; ci++) {
						var info = flatmap[ri + ":" + ci];
						if (!info)
							return false;
						if (info.spannodes && info.spannodes.length > 1)
							return false;
						cellcount++;
					}
				}
				var tdspans = 0;
				for (var tdi = 0; tdi < allseltds.length; tdi++) {
					var td = allseltds[tdi];
					tdspans += Math.max(1, td.getAttribute("rowspan") || 1) * Math.max(1, td.getAttribute("colspan") || 1)
				}
				if (tdspans != cellcount)
					return false;

				return true;
			}

			if (!CalcCanMerge())
				return debuglog("unable to merge");

			var headtd = flatmap[minri + ":" + minci].td;
			if (!headtd)
				return debuglog("no head td");

			headtd.setAttribute("rowspan", maxri - minri);
			headtd.setAttribute("colspan", maxci - minci);

			for (var tdi = 0; tdi < allseltds.length; tdi++) {
				var td = allseltds[tdi];
				if (td != headtd)
					td._prepairtodelete = true;
			}
			for (var tdi = 0; tdi < tableallcells.length; tdi++) {
				var td = tableallcells[tdi];
				if (!td._prepairtodelete)
					continue;
				if (td.childNodes.length) {
					if (td.firstChild.nodeName != "BR") {
						headtd.appendChild(table.ownerDocument.createElement("BR"));
						while (td.firstChild)
							headtd.appendChild(td.firstChild);
					}
				}
				td.remove();
			}

			__SelectElementText(headtd);
			//__Collapse(true);
		}

		if (cmdtype == "exec" && cmd == "tabledelete") {
			table.remove();
		}

	}


	function __AppendMenuItem(panel, iconname, cmdname, text, onclick, funcItems) {
		var menucontainer = __Append(panel, "rte-menuitemcontainer", null, "rte_menuitem_" + cmdname);
		var menuitem = __Append(menucontainer, "rte-menuitem");
		var menuicon = __Append(menuitem, "rte-menuicon");
		if (iconname) __SetImageForCmd(menuicon, iconname, "menu");
		var menutext = __Append(menuitem, "rte-menutext");
		menutext.innerText = text;
		menuitem.setAttribute("aria-label", text);
		if (menuitem.__rteSyncActionLabel) menuitem.__rteSyncActionLabel();
		if (onclick) {
			menuitem.onclick = function () {
				__Close_CurrentPopup();
				onclick(cmdname);
			}
		}
		if (funcItems) {
			__Append(menuitem, "rte-menuarrow");
			var submenu = null;
			menucontainer.onmouseover = function () {
				clearTimeout(panel._tid_submenu);
				panel._tid_submenu = setTimeout(function () {
					if (panel._submenu) panel._submenu.style.display = "none";
					if (!submenu) {
						submenu = __Append(menucontainer, "rte-submenu");
						funcItems(submenu)
					}
					submenu.style.display = "";
					panel._submenu = submenu;
				}, 10);
			}
			menucontainer.onmouseout = function () {
				clearTimeout(panel._tid_submenu);
				panel._tid_submenu = setTimeout(function () {
					if (submenu) submenu.style.display = "none";
				}, 10);
			}
		}
		return menucontainer;
	}

	function __AppendMenuSpliter(panel) {
		__Append(panel, "rte-menuspliter");
	}


	function __AppendMenu_ForTagStyles(panel, tag) {
		__AppendMenuItem(panel, "page", "style_font", "Font");
		__AppendMenuItem(panel, "page", "style_layout", "Layout");
		__AppendMenuItem(panel, "page", "style_border", "Border");
		__AppendMenuItem(panel, "page", "style_boxedge", "Box Edge");
		__AppendMenuItem(panel, "page", "style_background", "Background", null, function (submenu) {
			__AppendMenu_ForTag(submenu, tag);
		})
	}

	function __AppendMenu_ForTag(panel, tag) {

		function TagOp(opname) {
			var r = editdoc.createRange();
			try {
				var p = tag.parentNode;
				for (var i = 0; i < p.childNodes.length; i++) {
					if (p.childNodes[i] == tag) {
						r.setStart(p, i);
						r.setEnd(p, i + 1);
						editsel.empty();
						editsel.addRange(r);
						editdoc.execCommand(opname);
						break;
					}
				}
			}
			catch (e) {

			}
		}

		__AppendMenuItem(panel, "cut", "cut", "Cut", function () {
			TagOp("cut")
		})

		__AppendMenuItem(panel, "copy", "copy", "Copy", function () {
			TagOp("copy")
		})

		__AppendMenuItem(panel, "delete", "delete", "Delete", function () {
			TagOp("delete")
		})

		if (tag.nodeName == "A") {
			__AppendMenuSpliter(panel);

			__AppendMenuItem(panel, "unlink", "unlink", "Unlink", function () {
				__RemoveNodeOnly(tag);
			})

			__AppendMenuItem(panel, "", "", "Open In", null, function (submenu) {
				__AppendMenuItem(submenu, "", "", "New Window", function () {
					tag.setAttribute("target", "_blank");
				})
				__AppendMenuItem(submenu, "", "", "Self Page", function () {
					tag.removeAttribute("target");
				})
			})
		}

		if (__IsRemovableBlockNodeName(tag.nodeName)) {
			__AppendMenuSpliter(panel);
			__AppendMenuItem(panel, "removetag", "removetag", "Remove", function () {
				__RemoveNodeOnly(tag);
			})
		}


		//__AppendMenuSpliter(panel);

		//__AppendMenuItem(panel, "page", "styles", "Styles", null, function (submenu) {
		//    __AppendMenu_ForTagStyles(submenu, tag);
		//})

		//__AppendMenuItem(panel, "page", "properties", "Properties", function () {
		//    __UI_PropertiesDialog(tag);
		//})

	}


	// Plus-button helpers.
	var plusbtnctrl = _CreateToolbarItem("plusbtn", null, plusbtn);
	plusbtn.appendChild(plusbtnctrl);
	plusbtnctrl.onclick = function () {
		if (___Is_CodeMode() || _isreadonly)
			return;

		__SelectDoc(false);
		var newp = __InsertRootParagraph();
		newp.innerHTML = "<br/>";
		__SelectElementText(newp);
		__Collapse(false);
		__Focus_Editor_Delay();

		___IFrame_Adjust_ScrollTop(true);
		rtecontent.scrollTop = rtecontent.scrollHeight;

		setTimeout(function () {
			___IFrame_Adjust_ScrollTop(true);
			rtecontent.scrollTop = rtecontent.scrollHeight;
		}, 10);
		return;

		var option = {};
		option.fillpanel = function (panel) {
			__AppendMenuItem(panel, "paragraph", "paragraph", "Add Paragraph", function () {
				__SelectDoc(false);
				var newp = __InsertRootParagraph();
				newp.innerHTML = "<br/>";
				__SelectElementText(newp);
			})
		}
		option.onclose = onclose;
		__Create_DropDownPanel(plusbtn, option, "rte-menu rte-tagmenu");
	}


	function __ShowTagMenu(tag, anchor, onclose) {
		var option = {};
		option.fillpanel = function (panel) {
			__AppendMenu_ForTag(panel, tag);
		}
		option.onclose = onclose;
		__Create_DropDownPanel(anchor, option, "rte-menu rte-tagmenu");
	}


	// Tag list helpers.
	var __taglist_arr = [];
	function __TagList_AddPanel() {
		var tagitem = __Append(taglist, "rte-tagitem");
		tagitem._update = function (node) {
			tagitem._node = node;
			tagitem.innerText = "<" + node.nodeName.toLowerCase() + ">";
			tagitem.classList.add("rte-ui-active");
			tagitem.style.display = "";
		}
		tagitem._set_unchecked = function (ch) {
			tagitem.classList.remove("rte-ui-active")
			tagitem.style.display = "";
		}
		tagitem._hide = function () {
			tagitem.style.display = "none";
		}
		var dropdownopening = false;
		tagitem.onmouseover = function () {
			tagitem._node.setAttribute("__rte_selected_hover", "");
		}
		tagitem.onmouseout = function () {
			if (!dropdownopening)
				tagitem._node.removeAttribute("__rte_selected_hover");
		}
		tagitem.onclick = function () {
			if (_isreadonly)
				return;
			tagitem._node.setAttribute("__rte_selected_hover", "");
			dropdownopening = true;
			__ShowTagMenu(tagitem._node, tagitem, function () {
				dropdownopening = false;
				tagitem._node.removeAttribute("__rte_selected_hover");
			});
		}
		__taglist_arr.push(tagitem);
	}
	function __TagList_Update() {
		var se = __GetSelectionElement();

		var arr = [];
		for (var pn = se; pn && pn != editable; pn = pn.parentNode)
			arr.push(pn);
		arr.reverse();

		while (__taglist_arr.length < arr.length)
			__TagList_AddPanel();

		var targetfound = false;
		for (var i = 0; i < arr.length; i++)
			__taglist_arr[i]._update(arr[i]);

		var last = arr[arr.length - 1];

		for (var i = arr.length; i < __taglist_arr.length; i++) {
			var panel = __taglist_arr[i];
			var tn = panel._node;
			if (last && tn && tn.parentNode == last && !config.behavior_taglist_hidepreviousitems) {
				last = tn;
				panel._set_unchecked();
			}
			else {
				panel._hide();
			}
		}


	}

	// TODO: Replace this fragile index-based implementation with a path-based node lookup such as [0,1,0,3,2].
	//function ___Get_Editable_AllNodes() {
	//	var coll = [];
	//	function fillcoll(e) {
	//		coll.push(e);
	//		var cs = e.childNodes;
	//		if (cs && cs.length) {
	//			for (var i = 0; i < cs.length; i++)
	//				fillcoll(cs[i])
	//		}
	//	}
	//	fillcoll(editable)
	//	return coll;
	//}

	//function ___Get_Node_From_Index(index) {
	//	var coll = ___Get_Editable_AllNodes();
	//	return coll[index];
	//}
	//function __Get_Node_All_Index(node) {
	//	if (node == editable)
	//		return 0;
	//	if (!node || node == -1 || !editable.contains(node.nodeType != 1 ? node.parentNode : node))
	//		return -1;
	//	var coll = ___Get_Editable_AllNodes();
	//	for (var i = 0; i < coll.length; i++)
	//		if (coll[i] == node)
	//			return i;
	//	return -1;
	//}

	function ___Get_Node_From_Index(index) {
		var arr = index;
		var p = editable;
		for (var ai = 0; ai < arr.length; ai++) {
			var c = p.childNodes[arr[ai]];
			if (!c)
				break;
			p = c;
		}
		return p;
	}
	function __Get_Node_All_Index(node) {
		var arr = [];
		if (node == editable || !editable.contains(node))
			return arr;
		var p = editable;
		while (p) {
			for (var i = 0; i < p.childNodes.length; i++) {
				var n = p.childNodes[i];
				if (n == node) {
					arr.push(i);
					return arr;
				}
				else if (n.contains(node)) {
					arr.push(i);
					p = n;
					break;//break for
				}
			}
		}
	}


	var undolist = [];
	var redolist = [];
	var currentbookmark = { html: "", time: 0 };
	var undoredorestoring = false;

	//editor.debugBookmark = function () {
	//	debuglog(currentbookmark, undolist);
	//}

	function ___CurrentBookmark_GetHtml() {
		var html = editable.innerHTML;
		html = html.replace(/(\s)__rte_selected_[a-z_]+(\s?)(=\"\")?/g, " ");
		html = html.replace(/<([a-z]+)\s+>/ig, "<$1>")
		return html.trim();
	}
	function ___CurrentBookmark_CalcKey(html) {
		// Normalize whitespace to a single space instead of removing it all,
		// so adding or removing one space is still detected as a change.
		return "key:" + html.replace(/\s+/g, ' ').trim();
	}
	function ___CurrentBookmark_Load() {
		undoredorestoring = true;
		try {
			editable.innerHTML = currentbookmark.html;
			currentbookmark.html = editable.innerHTML; // Keep equality checks stable for the current snapshot.

			___ResetSelectControl(null);

			___Adjust_After_Content_Changed();

			var scrolltop = currentbookmark.top;
			if (!isNaN(scrolltop)) {
				//debuglog("scroll top " + scrolltop)
				rtecontent.scrollTop = scrolltop;
				//setTimeout(function () {
				//	content.scrollTop = scrolltop;
				//}, 20);
			}


			var selcells = editdoc.querySelectorAll("[__rte_selected_cell]");

			if (selcells.length) {
				__sel_cells_start = selcells[0];
				__sel_cells_end = selcells[selcells.length - 1];
				__SelectElementText(__sel_cells_end);
				__Collapse(true);
				//debuglog(__sel_cells_start.outerHTML, __sel_cells_end, editsel.anchorNode)
			}
			else {
				// TODO: Persist the bookmark range position more accurately.
				__CurrentBookmar_Load_Range()
			}
		}
		finally {
			undoredorestoring = false;
		}

		if (containerInput) {
			containerInput.value = __GetHTMLCode();
		}

		InvokeEventHook("change");

	}

	function ___CurrentBookmark_Init() {
		__EnsureLastParagraph();
		var html = ___CurrentBookmark_GetHtml();
		currentbookmark = { html: html, time: new Date().getTime(), committed: true }
		currentbookmark.key = ___CurrentBookmark_CalcKey(html);
	}
	function ___CurrentBookmark_Save() {
		var html = ___CurrentBookmark_GetHtml();

		var key = ___CurrentBookmark_CalcKey(html);

		var ischanged = key != currentbookmark.key;

		if (ischanged) {

			var reachmaxlength = false;
			if (config.maxHTMLLength && html.length > config.maxHTMLLength) {
				// TODO: Preprocess large HTML snapshots before uploading images.
				reachmaxlength = true;
			}
			else if (config.maxTextLength && editable.innerText.length > config.maxTextLength) {
				reachmaxlength = true;
			}

			if (reachmaxlength) {
				___CurrentBookmark_Load();
				if (!InvokeEventHook("customdialog", "reachmaxlength", __GetLangText("reachmaxlength"))) {
					alert(__GetLangText("reachmaxlength"));
				}
				return;
			}

			var nowtime = new Date().getTime();
			if (currentbookmark.committed || nowtime - currentbookmark.time > config.timeoutAddToUndo) {
				// Add a new bookmark snapshot.
				currentbookmark.committed = true;
				undolist.push(currentbookmark);
				redolist.length = 0;
				currentbookmark = { html: html, time: nowtime }
			}
			else {
				// If the current bookmark is still pending, update it in place.
				currentbookmark.html = html;
				currentbookmark.time = nowtime;
			}
			currentbookmark.key = key;
		}

		if (ischanged || iframewinfocused) {

			var rinfo = null;
			var ctrl = __GetSelectedControl();
			if (ctrl != null) {
				rinfo = { type: "Control", index: __Get_Node_All_Index(ctrl) };
			}
			else if (editsel.anchorNode) {
				rinfo = { type: editsel.type, anchorIndex: __Get_Node_All_Index(editsel.anchorNode), anchorOffset: editsel.anchorOffset, focusIndex: __Get_Node_All_Index(editsel.focusNode), focusOffset: editsel.focusOffset, isCollapsed: editsel.isCollapsed }
			}

			if (ischanged)
				__AdjustScrollTop_ForInsertPoint();

			currentbookmark.info = rinfo;
			currentbookmark.top = rtecontent.scrollTop;

		}

		if (ischanged) {

			if (containerInput) {
				containerInput.value = __GetHTMLCode();
			}

			InvokeEventHook("change");

		}

		//if (key != oldkey || iframewinfocused) {
		//	debuglog(iframewinfocused);
		//	debuglog("sel : ", editsel.anchorNode)
		//	debuglog(rinfo);
		//}

		return ischanged;
	}

	function ___CurrentBookmark_LoadSelectionForIE() {

		var rinfo = currentbookmark.info;
		if (!rinfo) return;

		if (rinfo.type == "Control") {
			var ctrl = ___Get_Node_From_Index(rinfo.index);
			if (ctrl)
				__SelectControl(ctrl);
		}
		else {

			if (rinfo.anchorIndex > rinfo.focusIndex || rinfo.anchorOffset > rinfo.focusOffset) {
				var temp = rinfo.anchorIndex;
				rinfo.anchorIndex = rinfo.focusIndex;
				rinfo.focusIndex = temp;
				var temp = rinfo.anchorOffset;
				rinfo.anchorOffset = rinfo.focusOffset;
				rinfo.focusOffset = temp;
			}

			var an = ___Get_Node_From_Index(rinfo.anchorIndex);
			var fn = ___Get_Node_From_Index(rinfo.focusIndex);

			var r = editdoc.createRange();
			try {
				r.setStart(an, rinfo.anchorOffset);
				r.setEnd(fn, rinfo.focusOffset);
				editsel.empty();
				editsel.addRange(r);
			}
			catch (x) {
				debuglog(x.message)
				console.error(x);
				// TODO: Text nodes can merge unexpectedly in this path.
			}
		}

	}

	function __CurrentBookmar_Load_Range() {
		var rinfo = currentbookmark.info;

		if (rinfo) {
			if (rinfo.type == "Control") {
				var ctrl = ___Get_Node_From_Index(rinfo.index);
				if (ctrl)
					__SelectControl(ctrl);
			}
			else {
				var an = ___Get_Node_From_Index(rinfo.anchorIndex);
				var fn = ___Get_Node_From_Index(rinfo.focusIndex);

				//debuglog("load", rinfo, an, fn)

				var r = editdoc.createRange();
				try {
					r.setStart(an, rinfo.anchorOffset);
					try { r.setEnd(fn, rinfo.focusOffset); } catch (x) {
						debuglog(x)
					}
					editsel.empty();
					editsel.addRange(r);
				}
				catch (x) {
					debuglog(x)
					// TODO: Text nodes can merge unexpectedly in this path.
				}
			}
		}
		else {
			__SelectDoc(false);
		}
	}



	function ___CurrentBookmark_Commit() {
		if (!currentbookmark.committed) {
			currentbookmark.committed = true;
		}
	}

	function __ClearHistory() {
		undolist.length = 0;
		redolist.length = 0;
		__SetTimeout_HandleSelectionChange();
	}

	function __Undo() {
		___CurrentBookmark_Commit(); // Save pending changes before undo.
		debuglog(undolist)
		if (!undolist.length) return;
		redolist.push(currentbookmark);
		currentbookmark = undolist.pop();
		___CurrentBookmark_Load();
	}
	function __Redo() {
		if (!redolist.length) return;
		undolist.push(currentbookmark);
		currentbookmark = redolist.pop();
		___CurrentBookmark_Load();
	}

	function __DoSave() {
		var str = __GetHTMLCode();
		var bin = new Array(str.length);
		for (var i = 0; i < str.length; i++)
			bin[i] = str.charCodeAt(i);
		var blob = new Blob([new Uint8Array(bin)], { type: "text/html" })

		var url = URL.createObjectURL(blob);

		var div2 = document.createElement("div");
		div2.innerHTML = "<a href='" + url + "' target=_blank></a>";

		var pdflink = div2.querySelector("a");

		var date = new Date();
		var ymd = String(date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()).substring(2);
		var hms = String(1000000 + date.getHours() * 10000 + date.getMinutes() * 100 + date.getSeconds()).substring(1);
		pdflink.download = "Save-" + ymd + "-" + hms + ".htm";

		pdflink.click();

	}
	function __DoLoad() {
		var inp = __Append(rtecontent, "input", "display:absolute;opacity:0")
		inp.type = "file";
		inp.onchange = function () {
			var file = inp.files[0];
			if (!file) return;
			var fr = new FileReader();
			fr.readAsArrayBuffer(file);
			fr.onload = function (e) {
				// TODO: Detect the string encoding when needed.

				var str = String.fromCharCode.apply(null, new Uint8Array(fr.result))
				__SetHTMLCode(str);
			}
		}
		inp.setAttribute("accept", "text/html");
		inp.click();
		setTimeout(function () {
			rtecontent.removeChild(inp);
		}, 1500)
	}

	function __GetEditable(bFocus) {
		if (bFocus)
			__Focus_Editor_Ensure();
		return editable;
	}

	function __GetBrowserSelectedControl() {
		if (editsel.focusNode == editsel.anchorNode) {
			var node = editsel.focusNode;
			if (node == null)
				return;
			switch (node.nodeName) {
				case "IMG":
				case "IFRAME":
					return node;
			}
			if (editsel.focusOffset - editsel.anchorOffset == 1) {
				var snode = node.childNodes[editsel.anchorOffset];
				if (snode) {
					switch (snode.nodeName) {
						case "IMG":
						case "IFRAME":
							return snode;
					}
				}
			}
		}
	}

	function __GetSelectedControl() {
		return ____selected_control;
		//return __GetBrowserSelectedControl();
	}
	function __GetSelectedText() {
		if (editsel.isCollapsed)
			return null;
		return editsel.toString();
	}

	function __FindSelectionElement(tag, match) {
		tag = tag.toUpperCase();
		var node = __GetSelectionElement();
		while (node && node != editable) {
			if (node.nodeName == tag && (!match || match(node)))
				return node;
			node = node.parentNode;
		}
		if (node == editable)
			return null;
	}
	function __GetSelectionElement() {
		if (____selected_control != null)
			return ____selected_control;
		// Note: do not rely on range.commonAncestorContainer here.
		var an = editsel.anchorNode;
		//if (an && an.nodeType != 1) an = an.parentNode;
		if (!an)
			return null;

		if (editsel.isCollapsed) {
			var node = an;
			if (node.nodeType != 1) node = node.parentNode;
			if (node) {
				if (node.nodeName == "TD" || node.nodeName == "TH")
					return node;
			}
		}

		//if (an == editable)
		//	return null;

		if (!editsel.isCollapsed) {

			an = FindNextNode(an, editsel.anchorOffset);

			var fn = editsel.focusNode;
			fn = FindPrevNode(fn, editsel.focusOffset);

			//if (an != sel.anchorNode)
			//	debuglog("FindNextNode", an, "from", sel.anchorNode)
			//if (fn != sel.focusNode)
			//	debuglog("FindPrevNode", fn, "from", sel.focusNode)

			while (fn != an) {
				if (an == editable || !an)
					return null;
				if (!an.parentNode)
					break;
				an = an.parentNode;
				if (an.contains(fn))
					break;
			}
		}

		if (an.nodeType != 1 || an.nodeName == "BR" || an.nodeName == "HR")
			an = an.parentNode;

		if (an == editable)
			return null;

		return an;
	}



	// Handle selections that resolve to the same logical node but use different anchor and focus nodes.
	// TODO: This logic does not account for comment nodes.
	function GetMaxOffset(node) {
		if (node.nodeType == 3)
			return node.nodeValue.length;
		if (node.nodeType == 1)
			return node.childNodes.length;
		return 0;
	}
	function FindNextNode(node, offset) {
		if (!node) return null; // TODO: Identify why this can be null.

		var mxo = GetMaxOffset(node);
		if (mxo < offset) // Defensive guard for unexpected offsets.
			return node;
		if (mxo > offset) {
			if (node.nodeType == 1)
				return FindNextNode(node.childNodes[offset], 0);
			return node;
		}
		if (node.nextSibling)
			return FindNextNode(node.nextSibling, 0);
		// If there is no nextSibling, this should resolve to the parent's last node.
		var pn = node.parentNode;
		if (node.parentNode == editable)
			return node;
		return FindNextNode(pn, pn.childNodes.length);
	}
	function FindPrevNode(node, offset) {
		if (!node) return null; // TODO: Identify why this can be null.

		if (offset === undefined)
			offset = GetMaxOffset(node);

		//debuglog("FindPrevNode", node, offset)

		if (offset != 0) {
			if (node.nodeType == 1) {
				var cn = node.childNodes[offset - 1];
				return FindPrevNode(cn);
			}
			return node;
		}

		if (node.previousSibling)
			return FindPrevNode(node.previousSibling);
		if (node.parentNode == editable)
			return node;
		// If there is no nextSibling, resolve to the first node of the parent.
		return FindPrevNode(node.parentNode, 0);
	}

	function __RemoveNodeOnly(node) {
		var p = node.parentNode;
		while (node.firstChild)
			p.insertBefore(node.firstChild, node);
		node.remove();
	}

	function __deleteFromDocument() {
		__extractContents();
	}
	function __extractContents() {
		var r = _editsel_getRange();

		// Selected text nodes.

		//debuglog(r.startContainer, r.startOffset, r.endContainer, r.endOffset, r.collapsed);

		var fn = r.startContainer && r.startContainer.parentNode;
		var ln = r.endContainer && r.endContainer.parentNode;

		var df = r.extractContents();

		// Some empty content still remains.
		//debuglog(r.startContainer, r.startOffset, r.endContainer, r.endOffset, r.collapsed);

		//debuglog(fn && fn.isConnected, ln && ln.isConnected)

		if (r.collapsed && r.startContainer) {
			// Delete sibling nodes inside the selection.
			var container = r.startContainer;
			function deleteNode(node) {
				//if (node) debuglog("removing " + [node.isConnected, container.contains(node), node.innerHTML], node.outerHTML)
				if (!node || node == container || !node.isConnected || !container.contains(node) || node.innerHTML) return;
				while (node.parentNode != container) {
					if (node.parentNode.childNodes.length > 1) {
						node.parentNode.removeChild(node);
						return;
					}
					node = node.parentNode;
				}
				//debuglog("remove " + node.outerHTML);
				container.removeChild(node);
			}


			//debuglog(editable.innerHTML);
			//debuglog(container, fn, ln)

			deleteNode(fn);
			deleteNode(ln);

			//debuglog(editable.innerHTML);
			//debuglog(editsel.anchorNode, editsel.anchorOffset, editsel.focusNode, editsel.focusOffset)

			while (container.childNodes.length == 0) {
				var removeIt = false;
				switch (container.nodeName) {
					case "OL":
					case "UL":
						removeIt = true;
						break;
					case "P":
					case "DIV":
						container.innerHTML = "<br/>";
						r.selectNodeContents(container);
						r.collapse(true);
						//r.select();
						break;
				}
				if (!removeIt)
					break;
				var p = container.parentNode;
				p.removeChild(container);
				container = p;
				debuglog(p.outerHTML)
			}
		}

		return df;
	}

	function __GetNodeIndex(node) {
		var cns = node.parentNode.childNodes;
		for (var i = 0; i < cns.length; i++)
			if (cns[i] == node)
				return i;
		return -1;
	}

	function __CompareNodePosition(n1, n2) {
		if (n1 == n2)
			return 0;

		if (n1.contains(n2))
			return 1; // n1 is before n2.
		if (n2.contains(n1))
			return -1; // n1 is after n2.

		for (var p = n1.parentNode; p; p = p.parentNode) {
			if (!p.contains(n2)) {
				n1 = p;
				continue;
			}
			for (var ci = 0; ci < p.childNodes.length; ci++) {
				var n = p.childNodes[ci];
				if (n == n1)
					return 1; // n1 is before n2.
				if (n.contains(n2))
					return -1; // n1 is after n2.
			}
			break; // Unexpected node position.
		}

		// Unexpected state: n1 and n2 do not appear to be in the same DOM tree.
		return 1; // Prefer treating n1 as before n2 in this fallback path.
		return -1; // Unreachable fallback retained for legacy flow.
	}

	var __selop_node1;
	var __selop_offset1;
	var __selop_node2;
	var __selop_offset2;

	function __SelOp_Init(node1, offset1, node2, offset2) {
		//debuglog("__SelOp_Init", __selop_node1, __selop_offset1, __selop_node2, __selop_offset2)
		__selop_node1 = node1;
		__selop_offset1 = offset1;
		__selop_node2 = node2;
		__selop_offset2 = offset2;
	}
	function __SelOp_Replace(oldtag, newtag) {
		//debuglog("__SelOp_Replace", oldtag, __selop_node1 == oldtag, __selop_node2 == oldtag, newtag)
		if (__selop_node1 == oldtag) __selop_node1 = newtag;
		if (__selop_node2 == oldtag) __selop_node2 = newtag;
	}
	function __SelOp_Remove(oldtag) {
		//debuglog("__SelOp_Remove", oldtag, __selop_node1 == oldtag, __selop_node2 == oldtag)

		__SelOp_BeforeMove(oldtag);
	}
	function __SelOp_BeforeMove(oldtag) {
		// The target may be a child node, so adjust the offset accordingly.

		var pn = oldtag.parentNode;

		function GetNewOffset(offset) {
			var index = 0;
			for (var i = 0; i < pn.childNodes.length; i++) {
				if (pn.childNodes[i] == oldtag)
					index = i;
			}
			if (offset <= index)
				return offset;
			return offset - 1;
		}

		if (pn == __selop_node1) {
			__selop_offset1 = GetNewOffset(__selop_offset1)
		}
		if (pn == __selop_node2) {
			__selop_offset2 = GetNewOffset(__selop_offset2)
		}
	}
	function __SelOp_Select() {
		//debuglog("__SelOp_Select", __selop_node1, __selop_offset1,__selop_node2, __selop_offset2)
		editsel.setPosition(__selop_node1, __selop_offset1);
		editsel.extend(__selop_node2, __selop_offset2);
	}

	function __ProcessSelectionNodes(handler, makingChange, finallyHandler) {


		if (__sel_cells_start) {
			var tds = _DoTableOperationCore("query", "querycells", __GetTable(__sel_cells_start), __sel_cells_start, __sel_cells_end || __sel_cells_start);
			if (tds && tds.length > 1) {
				for (var tdi = 0; tdi < tds.length; tdi++) {
					var td = tds[tdi];
					var cns = td.childNodes;
					for (var i = 0; i < cns.length; i++)
						handler(cns[i])
				}
				return;
			}
		}

		//editwin.focus();
		//debuglog(editsel.isCollapsed,editsel==editdoc.getSelection());

		if (editsel.isCollapsed)
			return;

		var node1 = editsel.anchorNode;
		var offset1 = editsel.anchorOffset;
		var node2 = editsel.focusNode;
		var offset2 = editsel.focusOffset;

		function shallswap() {

			if (node1 != node2) {

				if (node1.contains(node2)) {
					for (var i = 0; i < offset1; i++) {
						if (node1.childNodes[i].contains(node2))
							return true;
					}
					return false;
				}
				else if (node2.contains(node1)) {
					for (var i = 0; i < offset2; i++) {
						if (node2.childNodes[i].contains(node1))
							return false;
					}
					return true;
				}

				var cv = __CompareNodePosition(node1, node2);

				if (cv < 0)
					return true;
				if (cv > 0)
					return false;

			}

			// Equal case:
			if (offset1 > offset2)
				return true;
			return false;
		}
		var temp;
		var bswap = shallswap();

		if (makingChange) debuglog(bswap, node1, offset1, node2, offset2);


		if (bswap) {
			temp = node1;
			node1 = node2;
			node2 = temp;
			temp = offset1;
			offset1 = offset2;
			offset2 = temp;
		}

		//debuglog(offset1,offset2)

		var everSplited = false;

		// Split the text node and move the selection to the element container.
		if (node1.nodeType == 3) {
			if (offset1 == 0 || !makingChange) {
				// Already at the start.
				offset1 = __GetNodeIndex(node1);
				node1 = node1.parentNode;
			}
			else if (offset1 >= node1.nodeValue.length) {
				// Already at the end.
				offset1 = __GetNodeIndex(node1) + 1;
				node1 = node1.parentNode;
			}
			else {
				// Split the node.
				temp = editdoc.createTextNode(node1.nodeValue.substring(0, offset1));
				node1.nodeValue = node1.nodeValue.substring(offset1);
				node1.parentNode.insertBefore(temp, node1);

				// If both ends are in the same text node,
				if (node2 == node1) {
					offset2 -= offset1;
				}

				offset1 = __GetNodeIndex(node1);
				node1 = node1.parentNode;
				everSplited = true;
			}
		}
		if (node2.nodeType == 3) {
			if (offset2 == 0) {
				// Already at the start.
				offset2 = __GetNodeIndex(node2);
				node2 = node2.parentNode;
			}
			else if (offset2 >= node2.nodeValue.length || !makingChange) {
				// Already at the end.
				offset2 = __GetNodeIndex(node2) + 1;
				node2 = node2.parentNode;
			}
			else {
				// Split the node.
				temp = editdoc.createTextNode(node2.nodeValue.substring(0, offset2));
				node2.nodeValue = node2.nodeValue.substring(offset2);
				node2.parentNode.insertBefore(temp, node2);
				offset2 = __GetNodeIndex(temp) + 1;
				node2 = node2.parentNode;
				everSplited = true;
			}
		}

		// TODO: If node1 or node2 is a SPAN, split it when necessary.

		// Move the selection up to the parent node.
		if (node1 != editable && offset1 == 0) {
			offset1 = __GetNodeIndex(node1);
			node1 = node1.parentNode;
		}
		if (node2 != editable && offset2 == node2.childNodes.length) {
			offset2 = __GetNodeIndex(node2) + 1;
			node2 = node2.parentNode;
		}

		//debuglog({ anchorNode: node1, anchorOffset: offset1, focusNode: node2, focusOffset: offset2 })

		//return { anchorNode: node1, anchorOffset: offset1, focusNode: node2, focusOffset: offset2 };

		//var s = __PreSplitSelection();

		//var node1 = s.anchorNode;
		//var offset1 = s.anchorOffset;
		//var node2 = s.focusNode;
		//var offset2 = s.focusOffset;

		// At this point node1 and node2 are element nodes.

		function treeWalkToNext(node, offset) {
			if (node == node2 && offset == offset2)
				return;

			for (var cns = node.childNodes; offset < cns.length; offset++) {

				if (node == node2 && offset == offset2)
					return;

				var subnode = cns[offset];

				if (subnode.nodeType == 3) {
					//if (makingChange) debuglog(subnode);
					handler(subnode);
					continue;
				}

				if (subnode == node2 || subnode.contains(node2)) {
					treeWalkToNext(subnode, 0);
					return;
				}
				else {
					//if (makingChange) debuglog(subnode);
					handler(subnode)
				}

			}

			if (node == node2 && offset == offset2)
				return;

			if (node.parentNode) {
				treeWalkToNext(node.parentNode, __GetNodeIndex(node) + 1);
			}
			else {
				// Condition 1: browser selection bug.
				//console.warn("wrong..", makingChange, node1, offset1, node2, offset2)
				//console.warn(editsel)
			}
		}

		__SelOp_Init(node1, offset1, node2, offset2);

		treeWalkToNext(node1, offset1);

		if (finallyHandler != null)
			finallyHandler();

		if (everSplited || makingChange) {
			__SelOp_Select()
			//debuglog(node1, offset1, node2, offset2)
		}
	}

	// 2026-05-08 (case-change.test.js): title-case transform passed to
	// __ProcessSelectionTextNodes by the "titlecase" toolbar command.
	// Capitalises the first letter of each word, lowercases the rest, and
	// preserves the small-word style most style guides expect (in / of / to
	// stay lowercase unless they're the first or last word in the string).
	// Word boundaries split on whitespace so hyphenated phrases like
	// "follow-up" become "Follow-Up", matching Word + Google Docs.
	// Cycle the case of the current selection: UPPER → lower → Title → (repeat).
	// Detects current state by comparing the selection text to its
	// uppercased / lowercased / title-cased variants.
	function __CycleSelectionCase() {
		var sel = editsel;
		if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
		var text = sel.toString();
		if (!text) return false;
		var upper = text.toUpperCase();
		var lower = text.toLowerCase();
		var title = __ConvertTextToTitleCase(text);
		// State machine: ALL CAPS → all lowercase → Title Case → (cycle).
		var nextCmd;
		if (text === upper) nextCmd = "lcase";
		else if (text === lower) nextCmd = "titlecase";
		else nextCmd = "ucase";
		__Exec_Cmd_Core(nextCmd);
		return true;
	}

	// 2026-05-19 Toast: brief feedback for paste-cleanup events.
	function __ShowSmartPasteToast(source) {
		if (typeof document === "undefined") return;
		var toast = document.createElement("div");
		toast.textContent = "✨ Cleaned from " + source + " — Undo: Ctrl+Z";
		toast.style.cssText = [
			"position:fixed", "bottom:24px", "left:50%", "transform:translateX(-50%) translateY(8px)",
			"background:#0f172a", "color:#f8fafc", "font:13px -apple-system,Segoe UI,sans-serif",
			"padding:10px 18px", "border-radius:8px", "box-shadow:0 10px 28px rgba(15,23,42,.28)",
			"z-index:" + (config.zIndexDialog || 9999), "opacity:0", "transition:opacity 180ms,transform 180ms"
		].join(";");
		document.body.appendChild(toast);
		requestAnimationFrame(function () {
			toast.style.opacity = "1";
			toast.style.transform = "translateX(-50%) translateY(0)";
		});
		setTimeout(function () {
			toast.style.opacity = "0";
			toast.style.transform = "translateX(-50%) translateY(8px)";
			setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 280);
		}, 2400);
	}

	// 2026-05-19 Snippet expansion. Typing a trigger like ":date" followed by
	// Tab expands to the snippet's value. Default snippets ship for date /
	// time / datetime / hr. Customers register more via:
	//
	//   editor.snippets.register(":sig", "<p>Best,<br/>Adam</p>", { isHtml: true });
	//
	// Snippets can also be functions: `register(":id", function(){ return uuid(); })`.
	var __snippets = {};
	function __DefaultSnippets() {
		__snippets[":date"] = function () { return new Date().toLocaleDateString(); };
		__snippets[":time"] = function () { return new Date().toLocaleTimeString(); };
		__snippets[":datetime"] = function () { return new Date().toLocaleString(); };
		__snippets[":hr"] = { html: "<hr/>", isHtml: true };
	}
	__DefaultSnippets();
	function __TryExpandSnippet() {
		if (!editsel || editsel.rangeCount === 0 || !editsel.isCollapsed) return false;
		var range = editsel.getRangeAt(0);
		var node = range.startContainer;
		if (!node || node.nodeType !== 3) return false;
		var offset = range.startOffset;
		var text = node.data || "";
		// Scan back to find the snippet trigger (starts with ":")
		var start = offset;
		while (start > 0 && !/\s/.test(text.charAt(start - 1)) && text.charAt(start - 1) !== ":") start--;
		// Include the leading ":".
		if (start > 0 && text.charAt(start - 1) === ":") start--;
		else return false;
		var trigger = text.substring(start, offset);
		if (!trigger || trigger.charAt(0) !== ":") return false;
		var snippet = __snippets[trigger];
		if (!snippet) return false;
		// Resolve snippet value.
		var value, isHtml;
		if (typeof snippet === "function") {
			value = snippet();
			isHtml = false;
		} else if (typeof snippet === "string") {
			value = snippet;
			isHtml = false;
		} else if (snippet && typeof snippet === "object") {
			value = (typeof snippet.html === "function") ? snippet.html() : snippet.html;
			isHtml = !!snippet.isHtml;
		} else return false;
		// Replace the trigger in the text node with the value.
		var before = text.substring(0, start);
		var after = text.substring(offset);
		if (isHtml) {
			// Split the text node and insert HTML between.
			var afterNode = editdoc.createTextNode(after);
			node.data = before;
			var parent = node.parentNode;
			parent.insertBefore(afterNode, node.nextSibling);
			var wrap = editdoc.createElement("span");
			wrap.innerHTML = value;
			while (wrap.firstChild) parent.insertBefore(wrap.firstChild, afterNode);
			var r = editdoc.createRange();
			r.setStart(afterNode, 0); r.collapse(true);
			editsel.removeAllRanges(); editsel.addRange(r);
		} else {
			node.data = before + value + after;
			var newOff = start + value.length;
			var r2 = editdoc.createRange();
			r2.setStart(node, newOff); r2.collapse(true);
			editsel.removeAllRanges(); editsel.addRange(r2);
		}
		return true;
	}
	editor.snippets = {
		register: function (trigger, expansion, options) {
			if (typeof trigger !== "string" || trigger.charAt(0) !== ":") return false;
			if (options && options.isHtml) {
				__snippets[trigger] = { html: expansion, isHtml: true };
			} else {
				__snippets[trigger] = expansion;
			}
			return true;
		},
		unregister: function (trigger) { delete __snippets[trigger]; return true; },
		list: function () { return Object.keys(__snippets); },
		expand: function () { return __TryExpandSnippet(); }
	};

	// Move the current top-level block up or down by one slot (Alt+Up / Alt+Down).
	// VS Code convention; also Notion via drag.
	function __MoveCurrentBlock(direction) {
		if (!editsel || editsel.rangeCount === 0) return false;
		var node = editsel.anchorNode;
		if (!node) return false;
		while (node && node !== editable && node.parentNode !== editable) node = node.parentNode;
		if (!node || node === editable) return false;
		if (direction < 0) {
			var prev = node.previousElementSibling;
			if (!prev) return false;
			editable.insertBefore(node, prev);
		} else {
			var next = node.nextElementSibling;
			if (!next) return false;
			editable.insertBefore(next, node);
		}
		__SetTimeout_HandleSelectionChange();
		return true;
	}

	// Duplicate the block that contains the caret (Ctrl+Shift+D). The "block"
	// is the nearest top-level child of `editable` containing the caret.
	function __DuplicateCurrentBlock() {
		if (!editsel || editsel.rangeCount === 0) return false;
		var node = editsel.anchorNode;
		if (!node) return false;
		while (node && node !== editable && node.parentNode !== editable) node = node.parentNode;
		if (!node || node === editable) return false;
		var clone = node.cloneNode(true);
		editable.insertBefore(clone, node.nextSibling);
		// Place caret at the start of the new clone.
		var r = editdoc.createRange();
		r.selectNodeContents(clone);
		r.collapse(true);
		editsel.removeAllRanges();
		editsel.addRange(r);
		__SetTimeout_HandleSelectionChange();
		return true;
	}

	// Auto-link helper: scan the text node before the caret for a URL or email
	// and wrap it in an <a> element. Triggered by keypress on space (and on
	// Enter). Configurable via `config.autoLinkOnType` (default: enabled).
	// Smart typography: auto-replace common typing patterns with their Unicode
	// equivalents. Triggered on keypress before the character is inserted.
	// Disable via `config.smartTypography = false`. Per-feature toggles via
	// `config.smartTypographyDashes / Quotes / Ellipsis / Trademarks`.
	function __TryApplySmartTypography(keyChar) {
		if (config.smartTypography === false) return false;
		if (!editsel || editsel.rangeCount === 0 || !editsel.isCollapsed) return false;
		var range = editsel.getRangeAt(0);
		var node = range.startContainer;
		if (!node || node.nodeType !== 3) return false;
		// Don't smart-substitute inside <code>, <pre>, <kbd>.
		var p = node.parentNode;
		while (p && p !== editable) {
			var n = p.nodeName;
			if (n === "CODE" || n === "PRE" || n === "KBD") return false;
			p = p.parentNode;
		}
		var offset = range.startOffset;
		var text = node.data || "";
		var before = text.substring(0, offset);

		function replaceBefore(matchLen, replacement) {
			var newText = text.substring(0, offset - matchLen) + replacement + text.substring(offset);
			node.data = newText;
			var newOff = offset - matchLen + replacement.length;
			var r2 = editdoc.createRange();
			r2.setStart(node, newOff);
			r2.collapse(true);
			editsel.removeAllRanges();
			editsel.addRange(r2);
		}

		// Em-dash: typing second "-" after another "-" → "—" (and the new char isn't inserted yet)
		if (keyChar === "-" && config.smartTypographyDashes !== false) {
			// Keep Markdown's `---` horizontal-rule shortcut intact when the
			// current block only contains hyphen markers.
			var dashRoot = __Find_Selection_Root_Block ? __Find_Selection_Root_Block() : null;
			var dashMarker = dashRoot ? __GetShortcutTextBeforeCaret(dashRoot) : null;
			if (dashMarker && /^-+$/.test(dashMarker) && dashMarker.length < 3) {
				return false;
			}
			if (before.slice(-1) === "-") {
				replaceBefore(1, "—");
				return true;
			}
		}
		// Ellipsis: typing third "." after "..".
		if (keyChar === "." && config.smartTypographyEllipsis !== false) {
			if (before.slice(-2) === "..") {
				replaceBefore(2, "…");
				return true;
			}
		}
		// Trademarks: typing ")" closes "(c)", "(r)", "(tm)".
		if (keyChar === ")" && config.smartTypographyTrademarks !== false) {
			var tail = before.slice(-3).toLowerCase();
			if (tail === "(tm" && before.slice(-3) === "(tm") {
				replaceBefore(3, "™"); return true;
			}
			var tail2 = before.slice(-2).toLowerCase();
			if (tail2 === "(c") { replaceBefore(2, "©"); return true; }
			if (tail2 === "(r") { replaceBefore(2, "®"); return true; }
		}
		// Smart quotes: " → " (open) or " (close) based on preceding char.
		if (keyChar === '"' && config.smartTypographyQuotes !== false) {
			var prev = before.slice(-1);
			var isOpen = !prev || /[\s\(\[\{<]/.test(prev);
			// Replace the current straight quote BEING TYPED — but since keypress fires before
			// insertion, we have to intercept by inserting the curly quote ourselves.
			var curly = isOpen ? "“" : "”";
			var newText = before + curly + text.substring(offset);
			node.data = newText;
			var newOff = offset + 1;
			var r3 = editdoc.createRange();
			r3.setStart(node, newOff);
			r3.collapse(true);
			editsel.removeAllRanges();
			editsel.addRange(r3);
			return true;
		}
		if (keyChar === "'" && config.smartTypographyQuotes !== false) {
			var prev = before.slice(-1);
			// Apostrophe in word: it's, don't. Otherwise opening/closing quote.
			var curly;
			if (prev && /[A-Za-z0-9]/.test(prev)) curly = "’"; // apostrophe
			else {
				var isOpen = !prev || /[\s\(\[\{<]/.test(prev);
				curly = isOpen ? "‘" : "’";
			}
			var newText = before + curly + text.substring(offset);
			node.data = newText;
			var newOff = offset + 1;
			var r4 = editdoc.createRange();
			r4.setStart(node, newOff);
			r4.collapse(true);
			editsel.removeAllRanges();
			editsel.addRange(r4);
			return true;
		}
		return false;
	}

	// Auto-generate stable IDs on headings so deep-links to sections work.
	// Runs after content changes; skipped via `config.autoHeadingAnchors = false`.
	function __ApplyHeadingAnchors() {
		if (config.autoHeadingAnchors === false) return;
		if (!editable) return;
		// Re-entry guard: this function mutates DOM (sets id/data-attr) which
		// can re-trigger __Adjust_After_Content_Changed → infinite loop. Set
		// a sentinel and bail if already running.
		if (__ApplyHeadingAnchors._inProgress) return;
		__ApplyHeadingAnchors._inProgress = true;
		try {
			var headings = editable.querySelectorAll("h1,h2,h3,h4,h5,h6");
			var seen = {};
			for (var i = 0; i < headings.length; i++) {
				var h = headings[i];
				var raw = (h.textContent || "").toLowerCase().replace(/^\s+|\s+$/g, "");
				if (!raw) continue;
				var slug = raw.normalize ? raw.normalize("NFKD").replace(/[̀-ͯ]/g, "") : raw;
				slug = slug.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
				if (!slug) continue;
				if (slug.length > 60) slug = slug.substring(0, 60).replace(/-+$/g, "");
				var unique = slug;
				var n = 2;
				while (seen[unique]) { unique = slug + "-" + n; n++; }
				seen[unique] = true;
				if (h.getAttribute("data-rte-auto-anchor") === "true" || !h.id) {
					if (h.id !== unique) h.id = unique;
					if (h.getAttribute("data-rte-auto-anchor") !== "true") {
						h.setAttribute("data-rte-auto-anchor", "true");
					}
				}
			}
		} finally {
			__ApplyHeadingAnchors._inProgress = false;
		}
	}

	function __TryApplyAutoLink() {
		if (!editsel || editsel.rangeCount === 0 || !editsel.isCollapsed) return false;
		var range = editsel.getRangeAt(0);
		var node = range.startContainer;
		if (!node || node.nodeType !== 3) return false;
		// Don't auto-link inside an existing <a>.
		var p = node.parentNode;
		while (p && p !== editable) {
			if (p.nodeName === "A") return false;
			p = p.parentNode;
		}
		var offset = range.startOffset;
		var text = node.data || "";
		// Find the start of the current word (back to previous whitespace).
		var start = offset;
		while (start > 0 && !/\s/.test(text.charAt(start - 1))) start--;
		var word = text.substring(start, offset);
		if (!word || word.length < 4) return false;
		// URL regex: http(s)://, www., or naked domain like example.com .
		// Also matches simple emails.
		var urlRe = /^(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<>"']*)?)$/i;
		var emailRe = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
		var href = null;
		if (emailRe.test(word)) {
			href = "mailto:" + word;
		} else if (urlRe.test(word)) {
			href = /^https?:\/\//i.test(word) ? word : (word.indexOf("@") >= 0 ? "mailto:" + word : "https://" + word.replace(/^www\./i, "") );
			if (/^www\./i.test(word)) href = "http://" + word;
		}
		if (!href) return false;
		// Reject javascript:/vbscript: URIs.
		if (/^(javascript|vbscript|data):/i.test(href)) return false;
		// Replace the word in-place with an <a>.
		var before = text.substring(0, start);
		var after = text.substring(offset);
		var a = editdoc.createElement("a");
		a.setAttribute("href", href);
		a.appendChild(editdoc.createTextNode(word));
		var afterNode = editdoc.createTextNode(after);
		var beforeNode = editdoc.createTextNode(before);
		var parent = node.parentNode;
		parent.insertBefore(beforeNode, node);
		parent.insertBefore(a, node);
		parent.insertBefore(afterNode, node);
		parent.removeChild(node);
		// Restore caret at the start of `after` so the next typed char (space) lands correctly.
		var r2 = editdoc.createRange();
		r2.setStart(afterNode, 0);
		r2.collapse(true);
		editsel.removeAllRanges();
		editsel.addRange(r2);
		return true;
	}

	function __ConvertTextToTitleCase(text) {
		if (!text) return text;
		var smallWords = { "a": 1, "an": 1, "and": 1, "as": 1, "at": 1, "but": 1, "by": 1, "for": 1, "if": 1, "in": 1, "nor": 1, "of": 1, "on": 1, "or": 1, "so": 1, "the": 1, "to": 1, "up": 1, "yet": 1, "via": 1, "vs": 1, "vs.": 1 };
		var tokens = text.split(/(\s+)/);
		var first = -1, last = -1;
		for (var i = 0; i < tokens.length; i++) {
			if (tokens[i] && tokens[i].trim().length) {
				if (first === -1) first = i;
				last = i;
			}
		}
		return tokens.map(function (tok, i) {
			if (!tok || !tok.trim().length) return tok;
			var lower = tok.toLowerCase();
			if (i !== first && i !== last && Object.prototype.hasOwnProperty.call(smallWords, lower)) {
				return lower;
			}
			// Capitalise the first letter of every hyphen-separated chunk.
			return lower.replace(/(^|[-/–—])([a-zà-ÿ])/g, function (m, sep, ch) {
				return sep + ch.toUpperCase();
			});
		}).join("");
	}

	function __ProcessSelectionTextNodes(func) {

		function process(element) {
			var cns = element.childNodes;
			var arr = [];
			for (var i = 0; i < cns.length; i++) {
				arr.push(cns[i]);
			}
			for (var i = 0; i < arr.length; i++) {
				var cn = arr[i];

				if (cn.nodeType == 3) {
					var newval = func(cn.nodeValue);
					if (cn.nodeValue != newval)
						cn.nodeValue = newval;
				}

				if (cn.nodeType == 1)
					process(cn);
			}
		}

		__ProcessSelectionNodes(function (node) {
			if (node.nodeType == 1)
				process(node);
			if (node.nodeType == 3) {
				var newval = func(node.nodeValue);
				if (node.nodeValue != newval)
					node.nodeValue = newval;
			}
		}, true);
	}

	function __GetNotContainerNodes(cn) {
		var list = [];
		function Fill(p) {
			if (p.nodeType != 1) {
				if (p.nodeType == 3)
					list.push(p);
				return;
			}
			if (!__IsContainerElement(p)) {
				list.push(p);
				return;
			}
			var cns = p.childNodes;
			for (var i = 0; i < cns.length; i++) {
				Fill(cns[i])
			}
		}
		Fill(cn);
		return list;
	}


	function __ToggleSelectionStatus(funcMatch, funcRemove, funcAdd, funcAddText, useContainer) {
		var textnodes = [];
		var elements = [];

		function finalHandler() {

			//debuglog(useContainer,textnodes, elements);

			var allMatch = true;
			for (var ei = 0; allMatch && ei < textnodes.length; ei++) {
				var tn = textnodes[ei];
				if (tn.nodeValue.trim())
					allMatch = false;
			}
			for (var ei = 0; allMatch && ei < elements.length; ei++) {
				var ncns = __GetNotContainerNodes(elements[ei]);
				for (var i = 0; allMatch && i < ncns.length; i++) {
					var nc = ncns[i];
					if (nc.nodeType == 3 || !funcMatch(nc)) {
						allMatch = false;
						//debuglog("not match by : ", nc)
					}
				}
			}

			//debuglog(allMatch, textnodes,elements)

			if (allMatch) {
				for (var ei = 0; ei < elements.length; ei++) {
					if (useContainer) {
						funcRemove(elements[ei]);
						continue;
					}
					var ncns = __GetNotContainerNodes(elements[ei]);
					for (var i = 0; allMatch && i < ncns.length; i++) {
						funcRemove(ncns[i])
					}
				}
			}
			else {
				function doNodeAdd(node) {
					//debuglog(node)
					switch (node.nodeName) {
						case "BR":
						case "HR":
							break;
						case "#text":
							if (node.nodeValue.trim())
								funcAddText(node);
							break;
						default:
							if (node.nodeType == 1)
								funcAdd(node);
							break;
					}
				}
				for (var ei = 0; ei < elements.length; ei++) {
					if (useContainer) {
						doNodeAdd(elements[ei]);
						continue;
					}
					var ncns = __GetNotContainerNodes(elements[ei]);
					for (var i = 0; i < ncns.length; i++) {
						doNodeAdd(ncns[i]);
					}
				}
				for (var i = 0; i < textnodes.length; i++)
					if (textnodes[i].nodeValue.trim())
						funcAddText(textnodes[i])
			}
		}

		__ProcessSelectionNodes(function (node) {
			if (node.nodeType == 1)
				elements.push(node);
			if (node.nodeType == 3 && node.nodeValue.trim())
				textnodes.push(node);
		}, true, finalHandler);


	}


	function __DetectSelectionStatus(funcMatch) {
		var textnodes = [];
		var elements = [];

		__ProcessSelectionNodes(function (node) {
			if (node.nodeType == 1)
				elements.push(node);
			if (node.nodeType == 3)
				textnodes.push(node);
		}, false);

		//debuglog(textnodes.length, elements.length);

		var allMatch = true;
		for (var ei = 0; allMatch && ei < textnodes.length; ei++) {
			var tn = textnodes[ei];
			if (tn.nodeValue.trim())
				allMatch = false;
		}
		for (var ei = 0; allMatch && ei < elements.length; ei++) {
			var ncns = __GetNotContainerNodes(elements[ei]);
			for (var i = 0; allMatch && i < ncns.length; i++) {
				var nc = ncns[i];
				if (nc.nodeType == 3 || !funcMatch(nc)) {
					allMatch = false;
					//debuglog("not match by : ", nc)
				}
			}
		}

		return allMatch;
	}


	function __HasSelectionClass(clsname) {

		function funcMatch(cn) {
			return cn.classList.contains(clsname);
		}

		return __DetectSelectionStatus(funcMatch)
	}


	function __ToggleSelectionClass(clsname) {
		function funcMatch(cn) {
			return cn.classList.contains(clsname);
		}
		function funcRemove(cn) {
			cn.classList.remove(clsname);
			var cns = cn.childNodes;
			for (var i = 0; i < cns.length; i++) {
				if (cns[i].nodeType == 1)
					funcRemove(cns[i]);
			}

			if (cn.nodeName == "SPAN" && !cn.attributes.length) {
				__SelOp_Remove(cn);
				__RemoveNodeOnly(cn);
			}
		}
		function funcAdd(cn) {
			var cns = cn.childNodes;
			for (var i = 0; i < cns.length; i++) {
				if (cns[i].nodeType == 1)
					funcRemove(cns[i]);
			}
			cn.classList.add(clsname);
		}
		function funcAddText(tn) {
			var span = editdoc.createElement("span");
			tn.parentNode.insertBefore(span, tn);
			span.appendChild(tn);
			span.className = clsname;
		}
		__ToggleSelectionStatus(funcMatch, funcRemove, funcAdd, funcAddText);
	}

	function __ClearSelectionStyles() {
		// Presentational style properties stripped from non-SPAN elements
		// (TD/TH/TABLE/TR/P/DIV...) when Remove Style runs. Layout properties
		// (width/height/padding/margin) are preserved so cell sizing survives.
		var __presentationalStyleProps = [
			"background", "background-color", "background-image", "background-repeat",
			"background-position", "background-attachment", "background-clip",
			"background-origin", "background-size",
			"color",
			"font", "font-family", "font-size", "font-style", "font-weight",
			"font-variant", "font-stretch",
			"border", "border-top", "border-right", "border-bottom", "border-left",
			"border-color", "border-style", "border-width",
			"border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
			"border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
			"border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
			"border-radius", "border-top-left-radius", "border-top-right-radius",
			"border-bottom-left-radius", "border-bottom-right-radius",
			"outline", "outline-color", "outline-style", "outline-width",
			"box-shadow",
			"text-decoration", "text-decoration-color", "text-decoration-line",
			"text-decoration-style", "text-shadow", "text-transform", "text-indent",
			"letter-spacing", "word-spacing", "line-height",
			"opacity", "filter"
		];
		function funcMatch(cn) {
			return true;
		}
		function funcRemove(cn) {
			if (cn.nodeType != 1)
				return;
			//debuglog(cn)
			editsel.setPosition(cn, 0);
			editsel.extend(cn, cn.childNodes.length);
			editdoc.execCommand("removeformat");

			var list = cn.querySelectorAll("*");
			list = __ArrToArr(list);
			list.push(cn);
			for (var i = 0; i < list.length; i++) {
				var element = list[i];
				//debuglog(element);
				if (element.nodeName == "SPAN") {
					element.removeAttribute("style");
					element.removeAttribute("class");
					if (!element.attributes.length) __RemoveNodeOnly(element);
				}
				else {
					// Strip presentational style properties from non-SPAN
					// elements (TD/TH/TABLE/P/DIV/...) so Remove Style actually
					// clears backgrounds, borders, colors, fonts pasted from
					// Word/Excel. Without this, execCommand("removeformat") only
					// touches inline runs and leaves <td style="background:..">
					// untouched.
					if (element.style && element.style.cssText) {
						for (var s = 0; s < __presentationalStyleProps.length; s++) {
							element.style.removeProperty(__presentationalStyleProps[s]);
						}
					}
					if (element.getAttribute("style") === "") {
						element.removeAttribute("style");
					}
				}
			}
		}
		function funcAdd(cn) {
			funcRemove(cn)
		}
		function funcAddText(tn) {

		}
		__ToggleSelectionStatus(funcMatch, funcRemove, funcAdd, funcAddText, true);
	}

	function __HasSelectionStyle(stylename, propname, stylevalue, styleIsMultipleValue) {
		function funcMatch(cn) {
			return cn.style[propname] == stylevalue
		}
		return __DetectSelectionStatus(funcMatch);
	}

	function __ToggleSelectionStyle(stylename, propname, stylevalue, styleIsMultipleValue) {

		//debuglog("__ToggleSelectionStyle", stylename, propname, stylevalue)

		function funcMatch(cn) {
			//debuglog(cn.style[propname], stylevalue);
			return cn.style[propname] == stylevalue
		}
		function funcRemove(cn) {

			cn.style[propname] = null;
			if (!cn.style.cssText) cn.removeAttribute("style")

			var cns = cn.childNodes;
			for (var i = 0; i < cns.length; i++) {
				if (cns[i].nodeType == 1)
					funcRemove(cns[i]);
			}

			if (cn.nodeName == "SPAN" && !cn.attributes.length) {
				__SelOp_Remove(cn);
				__RemoveNodeOnly(cn);
			}
		}
		function funcAdd(cn) {
			var cns = cn.childNodes;
			for (var i = 0; i < cns.length; i++) {
				if (cns[i].nodeType == 1)
					funcRemove(cns[i]);
			}
			cn.style[propname] = null;
			cn.style.cssText += ";" + stylename + ":" + stylevalue;
			//debuglog(cn)
		}
		function funcAddText(tn) {
			var span = editdoc.createElement("span");
			tn.parentNode.insertBefore(span, tn);
			span.appendChild(tn);
			span.style[propname] = stylevalue;
			span.style.cssText += stylename + ":" + stylevalue;
			//debuglog(cn)
		}
		__ToggleSelectionStatus(funcMatch, funcRemove, funcAdd, funcAddText);
	}

	function __ExecFormatBlock(tagname) {

		if (!tagname)
			return;

		// TODO: When formatting to NORMAL, decide whether <p> should be removed inside <li>.

		tagname = tagname.toUpperCase();

		var allnodes = [];

		function tryFormat() {

			if (editsel.isCollapsed && !allnodes.length) {
				if (!editsel.anchorNode)
					return;
				allnodes.push(editsel.anchorNode);
			}

			if (!allnodes.length)
				return;

			var pnode = allnodes[0];
			if (pnode.nodeType != 1) pnode = pnode.parentNode;
			while (pnode) {
				var allcontains = true;
				for (var i = 0; i < allnodes.length; i++) {
					if (!pnode.contains(allnodes[i])) {
						allcontains = false;
						break;
					}
				}
				if (allcontains)
					break;
				pnode = pnode.parentNode;
			}

			if (!pnode) return;

			pnode = __Find_Parent_Block(pnode);

			var snodes = [];
			for (var i = 0; i < allnodes.length; i++) {
				var node = allnodes[i];
				for (; node != pnode; node = node.parentNode) {
					if (node.parentNode == pnode) {
						if (snodes.indexOf(node) == -1) {
							snodes.push(node);
						}
						break;
					}
				}
			}

			if (!snodes.length) return;

			//debuglog(pnode, snodes)

			function applyForNodes(ns) {
				var lastTag = null;
				for (var i = 0; i < ns.length; i++) {
					var node = ns[i];
					if (tagname == node.nodeName)
						continue;
					var pn = node.parentNode;

					switch (node.nodeName) {
						case "UL":
						case "OL":
							for (var i = 0; i < node.childNodes.length; i++) {
								var li = node.childNodes[i];
								if (
									allnodes.some(function (n) {
										return li.contains(n) || n.contains(li);
									})
								) {
									applyForNodes(li.childNodes);
								}
							}
							break;
						case "LI":
							applyForNodes(node.childNodes);
							break;
						default:
							if (__IsRemovableBlockNodeName(node.nodeName)) {
								// Switch branches.
								lastTag = editdoc.createElement(tagname);
								pn.insertBefore(lastTag, node);
								__CopyAttributes(node, lastTag);
								while (node.firstChild)
									lastTag.appendChild(node.firstChild);
								__SelOp_Replace(node, lastTag);
								pn.removeChild(node);
							}
							else {//contains
								if (!lastTag) {
									lastTag = editdoc.createElement(tagname);
									pn.insertBefore(lastTag, node);
								}
								__SelOp_BeforeMove(node);
								lastTag.appendChild(node);
							}
							break;
					}
				}
			}

			if (pnode.nodeName == "UL" || pnode.nodeName == "OL") {
				for (var si = 0; si < snodes.length; si++) {
					var li = snodes[si];
					applyForNodes(li.childNodes);
				}
			}
			else {
				applyForNodes(snodes);
			}

			__SelOp_Select()

			return true;
		}

		var dodefault = true; // Default to the browser command when finalHandler does not override it.

		__ProcessSelectionNodes(function (node) {
			allnodes.push(node);
		}, true, function () {

			dodefault = 0;

			if (tryFormat())
				return;

			dodefault = 1;
		});

		if (dodefault) {
			__Exec_Cmd_Default("formatblock", tagname);
		}
	}

	function __ExecInsertList(cmdlower) {

		var allnodes = [];

		__ProcessSelectionNodes(function (node) {
			allnodes.push(node);
		}, false);

		function tryInsert() {
			if (!allnodes.length)
				return;
			var pnode = allnodes[0];
			if (pnode.nodeType != 1) pnode = pnode.parentNode;
			while (pnode) {
				var allcontains = true;
				for (var i = 0; i < allnodes.length; i++) {
					if (!pnode.contains(allnodes[i])) {
						allcontains = false;
						break;
					}
				}
				if (allcontains)
					break;
				pnode = pnode.parentNode;
			}

			if (!pnode) return;

			var snodes = [];
			for (var i = 0; i < allnodes.length; i++) {
				var node = allnodes[i];
				for (; node != pnode; node = node.parentNode) {
					if (node.parentNode == pnode) {
						if (snodes.indexOf(node) == -1)
							snodes.push(node);
						break;
					}
				}
			}

			if (!snodes.length) return;

			var tagname = cmdlower == "insertorderedlist" ? "OL" : "UL";

			if (pnode.nodeName == "UL" || pnode.nodeName == "OL") {
				if (tagname != pnode.nodeName)
					return; // Fall through to the default switch handling.

				// Add paragraph wrappers before removing <li> elements.
				for (var i = 0; i < snodes.length; i++) {
					var li = snodes[i];
					var lastptag = null;
					var cns = __ArrToArr(li.childNodes);
					for (var ci = 0; ci < cns.length; ci++) {
						var cn = cns[ci];
						switch (cn.nodeName) {

						}
					}
				}

				return false; // Use the default command behavior.
			}
			else {

				var newlist = document.createElement(tagname);
				pnode.insertBefore(newlist, snodes[0]);

				// Merge the generated paragraphs into the existing list when possible.
				// Group inline/text siblings that share the same parent block into one <li>
				var i = 0;
				while (i < snodes.length) {
					var node = snodes[i];

					if (node.nodeType == 3 && !node.nodeValue.trim() || node.nodeName == "BR") {
						pnode.removeChild(node);
						i++;
						continue;
					}

					var nn = node.nodeName;
					if (nn == "UL" || nn == "OL") {
						// Merge into the following list.
						while (node.firstChild)
							newlist.appendChild(node.firstChild);
						pnode.removeChild(node);
						i++;
						continue;
					}

					if (nn == "P" || nn == "DIV") {
						// Block element becomes its own <li>
						var newli = editdoc.createElement("LI");
						newli.appendChild(node);
						newlist.appendChild(newli);
						__CopyAttributes(node, newli);
						__RemoveNodeOnly(node);
						i++;
					} else {
						// Inline/text node - group consecutive inline siblings into one <li>
						var newli = editdoc.createElement("LI");
						newlist.appendChild(newli);
						newli.appendChild(node);
						i++;
						// Gather subsequent inline siblings into the same <li>
						while (i < snodes.length) {
							var nextNode = snodes[i];
							var nextNN = nextNode.nodeName;
							if (nextNN == "P" || nextNN == "DIV" || nextNN == "UL" || nextNN == "OL") {
								break;
							}
							if (nextNode.nodeType == 3 && !nextNode.nodeValue.trim() || nextNode.nodeName == "BR") {
								pnode.removeChild(nextNode);
								i++;
								continue;
							}
							newli.appendChild(nextNode);
							i++;
						}
					}
				}

				var selstartindex = 0;
				var selendindex = newlist.childNodes.length


				// TODO: Merge with adjacent previous or next lists.
				joinPrev();
				joinNext();
				function joinPrev() {
					var joinList;
					node = newlist;
					var contentNodes = [];
					var contentCount = 0;
					while (!joinList) {
						node = node.previousSibling;
						if (!node)
							return;
						switch (node.nodeName) {
							case "OL":
							case "UL":
								joinList = node;
								break;
							case "BR":
								contentNodes.unshift(node);
								break;
							case "#text":
								contentNodes.unshift(node);
								if (node.nodeValue.trim())
									contentCount++;
								break;
							default:
								if (__IsRemovableBlockNodeName(node.nodeName))
									return; // Do not join incompatible lists.
								contentNodes.unshift(node);
								contentCount++;
								break;
						}
					}
					if (!joinList || joinList.nodeName != newlist.nodeName)
						return;


					if (contentCount) {
						var li = editdoc.createElement("LI");
						for (var i = 0; i < contentNodes.length; i++)
							li.appendChild(contentNodes[i]);

						joinList.appendChild(li);
					}
					else {
						for (var i = 0; i < contentNodes.length; i++)
							contentNodes[i].parentNode.removeChild(contentNodes[i])
					}


					selstartindex += joinList.childNodes.length;
					selendindex += joinList.childNodes.length;

					while (newlist.firstChild) joinList.appendChild(newlist.firstChild);
					newlist.parentNode.removeChild(newlist);
					newlist = joinList;
				}
				function joinNext() {

					var joinList;
					node = newlist;
					var contentNodes = [];
					var contentCount = 0;
					while (!joinList) {

						node = node.nextSibling;

						if (!node)
							return;
						switch (node.nodeName) {
							case "OL":
							case "UL":
								joinList = node;
								break;
							case "BR":
								contentNodes.push(node);
								break;
							case "#text":
								contentNodes.push(node);
								if (node.nodeValue.trim())
									contentCount++;
								break;
							default:
								if (__IsRemovableBlockNodeName(node.nodeName))
									return; // Do not join incompatible lists.
								contentNodes.push(node);
								contentCount++;
								break;
						}
					}

					if (!joinList || joinList.nodeName != newlist.nodeName)
						return;

					if (contentCount) {
						var li = editdoc.createElement("LI");
						for (var i = 0; i < contentNodes.length; i++)
							li.appendChild(contentNodes[i]);

						newlist.appendChild(li);
					}
					else {
						for (var i = 0; i < contentNodes.length; i++)
							contentNodes[i].parentNode.removeChild(contentNodes[i])
					}

					while (newlist.lastChild) joinList.insertBefore(newlist.lastChild, joinList.firstChild);
					newlist.parentNode.removeChild(newlist);
					newlist = joinList;
				}

				editsel.setPosition(newlist, selstartindex);
				editsel.extend(newlist, selendindex);

				return true;
			}


		}

		if (tryInsert())
			return;

		__Exec_Cmd_Default(cmdlower);

	}

	function __InsertRootParagraph(tagname) {
		//__Before_UI_Action();
		var ektag = config.enterKeyTag; if (ektag.toLowerCase() == "br") ektag = "div";
		var newnode = editdoc.createElement(tagname || ektag);
		var node = editsel.focusNode || editsel.anchorNode;
		if (!node || node == editable) {
			editable.appendChild(newnode);
			return newnode;
		}
		var rn0 = __Find_Root_Block(node);
		if (rn0) {
			rn0.parentNode.insertBefore(newnode, rn0.nextSibling)
			return newnode;
		}
		while (node.parentNode && node.parentNode != editable)
			node = node.parentNode;
		while (node.nextSibling) {
			if (node.nextSibling.nodeType == 1) {
				if (editwin.getComputedStyle(node.nextSibling).display != "inline")
					break;
			}
			node = node.nextSibling;
		}
		debuglog(rn0, node);
		node.parentNode.insertBefore(newnode, node.nextSibling)
		return newnode;
	}

	function __SurroundElement(df) {
		//__Before_UI_Action();

		var selctrl = __GetSelectedControl();
		if (selctrl != null) {
			selctrl.parentNode.insertBefore(df, selctrl);
			df.appendChild(selctrl);
		}
		else {
			var f;
			if (!editsel.isCollapsed) {
				try { f = __extractContents(); } catch (x) { }
			}
			var df = __InsertElement(df);
			if (f)
				df.appendChild(f);
		}
		return df;
	}
	function __SurroundByTagName(tagname) {
		return __SurroundElement(editdoc.createElement(tagname))
	}
	function __InsertElement(df) {
		//__Before_UI_Action();
		if (!editsel.isCollapsed)
			__deleteFromDocument();
		if (!editable.innerText) {
			editable.appendChild(df);
			return df;
		}
		var r = _editsel_getRange(); // TODO: Handle the no-selection case explicitly.
		r.insertNode(df);
		return df;
	}
	function __InsertByTagName(tagname) {
		return __InsertElement(editdoc.createElement(tagname))
	}

	function __InsertText(text) {
		//__Before_UI_Action();
		if (!editsel.isCollapsed)
			__deleteFromDocument();

		var tn = editdoc.createTextNode(text);

		if (!editable.innerText) {
			editable.appendChild(tn);
			__SelectDoc();
			return;
		}
		debuglog("insert " + text)
		var r = _editsel_getRange();

		r.insertNode(tn);
	}

	function __InsertHTML(html) {
		//__Before_UI_Action();
		if (!editsel.isCollapsed)
			__deleteFromDocument();

		if (!editable.innerText) {
			var nodes = editable.querySelectorAll("*");
			var allispordiv;
			for (var i = 0; i < nodes.length; i++) {
				switch (nodes[i].nodeName) {
					case "P":
					case "DIV":
					case "SPAN":
						break;
					default:
						allispordiv = false;
						break;
				}
			}
			if (allispordiv) {
				__SetHTMLCode(html);
				__SelectDoc();
				return;
			}
		}

		//debuglog(editable.innerHTML);
		//debuglog(editsel.anchorNode, editsel.anchorOffset, editsel.focusNode, editsel.focusOffset)

		var r = _editsel_getRange();
		var df = editdoc.createElement("temp-node");
		df.innerHTML = html;

		r.insertNode(df);
		var fn = df.firstChild;
		var ln = df.lastChild;
		__RemoveNodeOnly(df);
		r.setStartBefore(fn)
		r.setEndAfter(ln)
	}

	function __UploadImgSrc(imgtag) {

	}

	// 2026-05-19 Apply lazy-loading attribute to all <img> tags inserted via
	// the upload / URL / drag-drop flow. Browser-native (`loading="lazy"` and
	// `decoding="async"`) — defers off-screen image fetches until the user
	// scrolls near them. Bigger documents stay snappy. Opt-out:
	// `config.imageLazyLoad = false`.
	function __ApplyImageLazyAttrs(img) {
		if (!img || config.imageLazyLoad === false) return;
		try {
			if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
			if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
		} catch (e) { /* ignore */ }
	}

	function __InsertFile(file) {
		debuglog(file);
		if (file.type.substring(0, 6) == 'image/') {
			// 2026-05-11 Kenneth Chen: previously images always inserted as a
			// new centered <div> root paragraph regardless of caret position.
			// Now: respect the caret. Insert the <img> inline at the caret via
			// __InsertElement, which uses _editsel_getRange().insertNode(). If
			// the caret is inside a table cell, append to the cell (preserves
			// the table layout). Empty editor → editable.appendChild.
			var td = __FindSelectionElement("TD") || __FindSelectionElement("TH");
			var img;
			if (td) {
				img = editdoc.createElement("img");
				img.style.cssText = "max-width:80%;";
				td.appendChild(img);
			} else {
				img = editdoc.createElement("img");
				img.style.cssText = "max-width:80%;";
				__InsertElement(img);
			}
			__ApplyImageLazyAttrs(img);
			__SelectControl(img);
			var fr = new FileReader();
			fr.readAsDataURL(file);
			fr.onload = function (e) {
				img.src = fr.result;
				__SetTimeout_HandleSelectionChange();

				var file_upload_handler = config.file_upload_handler || window.rte_file_upload_handler;

				if (file_upload_handler) {
					file_upload_handler(file, function (url, error) {
						if (url) {
							img.src = url;
							__SetTimeout_HandleSelectionChange();
							return;
						}
						if (error) {
							if (!InvokeEventHook("customdialog", "uploadfailed", String(error))) {
								alert("upload failed , " + error);
							}
						}
						else {
							console.error("file_upload_handler arguments miss url or error");
						}
					});
				}
			}
		}
		else {
			// Insert a document attachment.

			var file_upload_handler = config.file_upload_handler || window.rte_file_upload_handler;
			if (!file_upload_handler) {
				alert("Uploading feature not available. miss file_upload_handler.");
				return;
			}

			file_upload_handler(file, function (url, error) {
				if (url) {
					var link = __FindSelectionElement("A") || __SurroundByTagName("A");
					if (!link.innerText) link.innerText = file.name;
					link.setAttribute("href", url);
					__SetTimeout_HandleSelectionChange();
					return;
				}
				if (error) {
					if (!InvokeEventHook("customdialog", "uploadfailed", String(error))) {
						alert("upload failed , " + error);
					}
				}
				else {
					console.error("file_upload_handler arguments miss url or error");
				}
			});

		}
	}

	var ____selected_control = null;

	function ___ResetSelectControl() {
		____selected_control = null;
	}

	function __SelectControl(node) {

		//var r = editdoc.createRange();
		//r.selectNode(node);
		//r.collapse(false);
		//sel.empty();
		//sel.addRange(r);

		//__Focus_Editor_Ensure();

		____selected_control = node;
		editsel.empty();

		//debuglog("select", node, editsel.type)

		__SetTimeout_HandleSelectionChange();
	}

	function __SelectElementText(node) {
		//__Focus_Editor_Ensure();
		var r = editdoc.createRange();
		r.selectNodeContents(node);
		editsel.empty();
		editsel.addRange(r);

	}

	function __Collapse(bstart) {
		//__Before_UI_Action();
		if (editsel.rangeCount == 0)
			return __SelectDoc(false);
		if (editsel.isCollapsed)
			return;
		var r = _editsel_getRange();
		r.collapse(bstart);
	}

	function __SelectDoc(type) {
		//__Before_UI_Action();
		var r = editdoc.createRange();
		r.selectNodeContents(editable);
		if (type === true || type === false)
			r.collapse(type);
		editsel.empty();
		editsel.addRange(r);
	}

	function __DeleteNodeRecursive(node) {
		var p = node.parentNode;
		p.removeChild(node);
		if (p == editable)
			return;
		if (p.childNodes.length == 0) {
			__DeleteNodeRecursive(p);
		}
	}

	function __Delete() {
		//__Before_UI_Action();

		var selctrl = __GetSelectedControl();
		if (selctrl) {
			editsel.empty();
			var r = editdoc.createRange();
			r.selectNode(selctrl);
			r.collapse(true);
			editsel.addRange(r);
			__DeleteNodeRecursive(selctrl);
			return;
		}

		if (editsel.isCollapsed) {
			// Delete the character to the right of the caret when possible.
			return;
		}

		__deleteFromDocument();
		//editdoc.execCommand("delete");
	}

	var previewcss = {};
	function __SetCssText(mode, key, text) {
		if (mode == "content") {
			var tag = editdoc.querySelector("#css_" + key)
			if (!tag) {
				tag = __Append(editdoc.head, "style");
				tag.id = "css_" + key;
			}
			tag.innerHTML = text;
		}
		else {
			previewcss[key] = text;
		}
	}
	editor.setContentCssText = function (text) {
		__SetCssText("content", "api", text);
	}
	editor.setPreviewCssText = function (text) {
		__SetCssText("preview", "api", text);
	}

	var urlprefix = location.href.split('/');
	urlprefix.length = 3;
	urlprefix = urlprefix.join('/') + '/';

	function __UrlType_Absolute(html) {
		var quote;
		function handler(str, g1, g2) {
			var url = __HtmlDecode(g2);
			if (url[0] == '/') {
				url = urlprefix + url.substring(1);
			}
			return g1 + "=" + quote + __HtmlEncode(url) + quote;
		}
		quote = "'";
		html = html.replace(/(\ssrc|\shref)='([^']+)'/g, handler);
		quote = '"';
		html = html.replace(/(\ssrc|\shref)="([^"]+)"/g, handler);
		return html;
	}
	function __UrlType_Relative(html) {
		var quote;
		function handler(str, g1, g2) {
			var url = __HtmlDecode(g2);
			if (url.indexOf("://") != -1 && url.substring(0, urlprefix.length) == urlprefix) {
				url = url.substring(urlprefix.length - 1);
			}
			return g1 + "=" + quote + __HtmlEncode(url) + quote;
		}
		quote = "'";
		html = html.replace(/(\ssrc|\shref)='([^']+)'/g, handler);
		quote = '"';
		html = html.replace(/(\ssrc|\shref)="([^"]+)"/g, handler);
		return html;
	}


	// Public API.
	function __GetHTMLCode() {

		if (__codemodeinp)
			return __codemodeinp.value;

		var cns = editable.childNodes;
		var maxlen = cns.length;
		function testmaxlen() {
			var last = cns[maxlen - 1];
			if (__IsRemovableBlockNodeName(last.nodeName)) {
				if (!last.firstChild)
					return;
				if (last.childNodes.length == 1 && last.firstChild.nodeName == "BR")
					return;
			}
			return true;
		}
		for (; maxlen; maxlen--) {
			if (testmaxlen())
				break;
		}

		//debuglog(maxlen);

		var html = [];
		for (var i = 0; i < maxlen; i++) {
			var node = cns[i];
			if (node.nodeType == 1)
				html.push(node.outerHTML);
			else if (node.nodeType == 8)
				html.push("<!--" + node.nodeValue + "-->");
			else
				html.push(__HtmlEncode(node.nodeValue))
		}


		var html = __fixHTML(html.join("\r\n").replace(/(\s)__rte_selected_[a-z_]+(\s?)(=\"\")?/g, " "));

		// Normalize text-decoration-line into text-decoration shorthand for compatibility.
		html = html.replace(/text-decoration-line\s*:\s*([^;"]+)/g, function(match, value) {
			return "text-decoration:" + value.trim() + ";text-decoration-line:" + value.trim();
		});

		var urlType = config.urlType || "";
		switch (urlType.toLowerCase()) {
			case "absolute":
				html = __UrlType_Absolute(html);
				break;
			case "relative":
				html = __UrlType_Relative(html);
				break;
			case "default":
			default:
				break;
		}

		return html;
	}

	function __FixHtmlElements() {
		var coll = editable.querySelectorAll("div,p");
		var arr = [];
		for (var i = 0; i < coll.length; i++) {
			var node = coll[i];
			if (node.hasChildNodes() || node.offsetHeight > 12)
				continue;
			arr.push(node);
		}
		for (var i = 0; i < arr.length; i++) {
			arr[i].innerHTML = "<br/>";
		}
	}
	function __SetHTMLCode(code) {
		if (__codemodeinp) {
			__codemodeinp.value = code;
			__codemodeinp.onchange();
			return;
		}

		editable.innerHTML = __fixHTML(code);
		__FixHtmlElements();

		// Force iframe height recalculation so the scrollbar appears when content exceeds the editor height.
		if (iframe) {
			lastiframeheight = 0;
			___IFrame_Adjust_ScrollTop(true);
			setTimeout(function () {
				___IFrame_Adjust_ScrollTop(true);
			}, 50);
		}

		__RenderTextStatistics();
		__SetTimeout_HandleSelectionChange();
	}

	editor.__Find_Root_Block = __Find_Root_Block;

	editor.htmlEncode = __HtmlEncode;
	editor.htmlDecode = __HtmlDecode;

	editor.getLangText = __GetLangText;

	editor.getSelection = function () {
		return editsel;
	};

	editor.isCommandEnabled = __Is_Cmd_Enabled;
	editor.isCommandActive = __Is_Cmd_Active;
	editor.execCommand = __Exec_Cmd_Core;

	editor.focus = __Focus_Editor_Ensure;
	editor.getDocument = function () { return editdoc; }
	editor.getEditable = __GetEditable;
	editor.getStatistics = function () {
		return __CollectTextStatistics();
	};

	editor.getText = editor.getPlainText = function () {
		return editable.innerText;
	}
	editor.setText = editor.setPlainText = function (val) {
		editable.innerText = val;
		__RenderTextStatistics();
		__SetTimeout_HandleSelectionChange();
	}

	editor.getHTML = editor.getHTMLCode = __GetHTMLCode;
	editor.setHTML = editor.setHTMLCode = __SetHTMLCode;

	// 2026-05-18 Markdown export. Produces CommonMark output from the editor's
	// current HTML. Headings, bold/italic/strike/code, lists, blockquotes,
	// links, images, tables, and horizontal rules all map. Unknown tags fall
	// back to their text content. Round-trips with the markdown-shortcut
	// parser (the inverse direction is in shared.js).
	editor.toMarkdown = function () {
		return __HtmlToMarkdown(editable);
	};

	// 2026-05-19 Keyboard-shortcut cheat-sheet modal (Cmd+/).
	editor.showShortcuts = function () { __ShowShortcutsModal(); };
	function __ShowShortcutsModal() {
		var isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || "");
		var mod = isMac ? "⌘" : "Ctrl";
		var shift = isMac ? "⇧" : "Shift";
		var alt = isMac ? "⌥" : "Alt";
		var groups = [
			{ title: "Text formatting", items: [
				["Bold", mod + "+B"],
				["Italic", mod + "+I"],
				["Underline", mod + "+U"],
				["Strikethrough", mod + "+" + shift + "+X"],
				["Clear formatting", mod + "+\\"],
				["Superscript", mod + "+."],
				["Subscript", mod + "+,"]
			]},
			{ title: "Paragraphs", items: [
				["Normal paragraph", mod + "+" + alt + "+0"],
				["Heading 1–6", mod + "+" + alt + "+1…6"],
				["Bulleted list", mod + "+" + shift + "+8"],
				["Numbered list", mod + "+" + shift + "+7"],
				["Blockquote", mod + "+" + shift + "+9"],
				["Indent / outdent (in lists)", "Tab / " + shift + "+Tab"],
				["Align left / center / right / full", mod + "+" + shift + "+L/E/R/J"]
			]},
			{ title: "Insert", items: [
				["Link", mod + "+K"],
				["Horizontal rule", mod + "+" + shift + "+-"]
			]},
			{ title: "History", items: [
				["Undo", mod + "+Z"],
				["Redo", mod + "+Y or " + mod + "+" + shift + "+Z"]
			]},
			{ title: "Clipboard", items: [
				["Cut / Copy / Paste", mod + "+X / C / V"],
				["Paste as plain text", mod + "+" + shift + "+V"]
			]},
			{ title: "Search & navigation", items: [
				["Find & Replace", mod + "+F"],
				["Select all", mod + "+A"]
			]},
			{ title: "Other", items: [
				["Save", mod + "+S"],
				["Duplicate block", mod + "+" + shift + "+D"],
				["Word count details", mod + "+" + shift + "+C"],
				["Keyboard shortcuts (this dialog)", mod + "+/"]
			]}
		];
		var dialog = __UI_CreateDialogFrame(__GetLangText("keyboardshortcuts") || "Keyboard shortcuts", "rte-dialog-shortcuts");
		var wrap = __Append(dialog, "div", "max-height:60vh;overflow-y:auto;padding:4px 0;");
		for (var g = 0; g < groups.length; g++) {
			var grp = groups[g];
			var h = __Append(wrap, "div", "font-weight:600;color:#0f172a;font-size:13px;margin:14px 0 6px;letter-spacing:0.02em;text-transform:uppercase;opacity:0.7;");
			h.textContent = grp.title;
			var table = __Append(wrap, "table", "width:100%;border-collapse:collapse;");
			for (var i = 0; i < grp.items.length; i++) {
				var tr = __Append(table, "tr");
				var c1 = __Append(tr, "td", "padding:5px 12px 5px 4px;color:#334155;font-size:13px;");
				c1.textContent = grp.items[i][0];
				var c2 = __Append(tr, "td", "padding:5px 4px;font-size:12px;text-align:right;");
				var kbd = (dialog.ownerDocument || document).createElement("code");
				kbd.style.cssText = "background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:2px 6px;color:#0f172a;font-family:ui-monospace,Menlo,Consolas,monospace;";
				kbd.textContent = grp.items[i][1];
				c2.appendChild(kbd);
			}
		}
	}

	// 2026-05-19 Detailed word/character count modal (Ctrl+Shift+C → Google Docs convention).
	editor.showWordCount = function () {
		__ShowWordCountModal();
	};
	function __ShowWordCountModal() {
		var text = editable && typeof editable.innerText === "string" ? editable.innerText : "";
		var trimmed = text.replace(/\s+/g, " ").replace(/^\s|\s$/g, "");
		var charsWithSpaces = text.length;
		var charsNoSpaces = text.replace(/\s/g, "").length;
		var words = trimmed ? trimmed.split(" ").length : 0;
		var sentences = trimmed ? (trimmed.match(/[.!?]+(\s|$)/g) || []).length || (trimmed ? 1 : 0) : 0;
		var paragraphs = editable ? editable.querySelectorAll("p,div,h1,h2,h3,h4,h5,h6,li,blockquote").length : 0;
		// Reading time ~200 wpm (average adult silent reading).
		var minutes = Math.max(1, Math.round(words / 200));
		var selText = "";
		try {
			var sel = editdoc.getSelection();
			if (sel && sel.rangeCount > 0 && !sel.isCollapsed) selText = sel.toString();
		} catch (e) {}
		var selWords = selText.trim() ? selText.trim().split(/\s+/).length : 0;
		var selChars = selText.length;
		var rows = [
			["Words", words],
			["Characters (with spaces)", charsWithSpaces],
			["Characters (no spaces)", charsNoSpaces],
			["Sentences", sentences],
			["Paragraphs", paragraphs],
			["Reading time", minutes + " min"]
		];
		if (selText.length > 0) {
			rows.push(["—", "—"]);
			rows.push(["Selection: words", selWords]);
			rows.push(["Selection: characters", selChars]);
		}
		var dialog = __UI_CreateDialogFrame(__GetLangText("wordcount") || "Word count", "rte-dialog-wordcount");
		var table = __Append(dialog, "table", "border-collapse:collapse;margin:8px 0;width:100%;font-size:14px;");
		for (var i = 0; i < rows.length; i++) {
			var tr = __Append(table, "tr");
			var cell1 = __Append(tr, "td", "padding:6px 12px 6px 4px;color:#475569;white-space:nowrap;");
			cell1.textContent = rows[i][0];
			var cell2 = __Append(tr, "td", "padding:6px 4px;font-weight:600;color:#0f172a;text-align:right;");
			cell2.textContent = String(rows[i][1]);
		}
	}

	// 2026-05-19 Markdown import. Parses a CommonMark-subset string and sets
	// the editor's content. Round-trips with editor.toMarkdown(). Use
	// `apply: false` to receive the HTML without writing into the editor.
	editor.fromMarkdown = function (md, opts) {
		opts = opts || {};
		var html = __MarkdownToHtml(String(md || ""));
		if (opts.apply !== false) __SetHTMLCode(html);
		return html;
	};
	function __MarkdownToHtml(md) {
		var lines = md.replace(/\r\n?/g, "\n").split("\n");
		var out = [];
		var inUl = false, inOl = false, inBq = false, inCode = false, codeLang = "";
		function closeLists() {
			if (inUl) { out.push("</ul>"); inUl = false; }
			if (inOl) { out.push("</ol>"); inOl = false; }
		}
		function closeBq() { if (inBq) { out.push("</blockquote>"); inBq = false; } }
		function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
		function inline(s) {
			// Order matters: escapes, code, images, links, bold, italic, strike.
			s = s.replace(/\\([\\`*_{}\[\]()<>])/g, "\x00$1\x00"); // protect escapes
			s = s.replace(/`([^`]+?)`/g, function (m, c) { return "<code>" + esc(c) + "</code>"; });
			s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<img alt="$1" src="$2"/>');
			s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<a href="$2">$1</a>');
			s = s.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
			s = s.replace(/__([^_\n]+?)__/g, "<strong>$1</strong>");
			s = s.replace(/(^|[^*])\*([^*\n]+?)\*([^*]|$)/g, "$1<em>$2</em>$3");
			s = s.replace(/(^|[^_])_([^_\n]+?)_([^_]|$)/g, "$1<em>$2</em>$3");
			s = s.replace(/~~([^~\n]+?)~~/g, "<strike>$1</strike>");
			s = s.replace(/\x00(.)\x00/g, "$1"); // restore escapes
			return s;
		}
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i];
			// Fenced code blocks.
			var fence = line.match(/^```\s*([A-Za-z0-9_-]+)?\s*$/);
			if (fence) {
				if (inCode) { out.push("</code></pre>"); inCode = false; }
				else { codeLang = fence[1] || ""; closeLists(); closeBq(); out.push('<pre><code' + (codeLang ? ' class="language-' + codeLang + '"' : '') + ">"); inCode = true; }
				continue;
			}
			if (inCode) { out.push(esc(line) + "\n"); continue; }
			// Horizontal rule.
			if (/^(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
				closeLists(); closeBq();
				out.push("<hr/>");
				continue;
			}
			// Heading.
			var h = line.match(/^(#{1,6})\s+(.*)$/);
			if (h) {
				closeLists(); closeBq();
				var lvl = h[1].length;
				out.push("<h" + lvl + ">" + inline(esc(h[2])) + "</h" + lvl + ">");
				continue;
			}
			// Blockquote.
			if (/^>\s?/.test(line)) {
				closeLists();
				if (!inBq) { out.push("<blockquote>"); inBq = true; }
				out.push("<p>" + inline(esc(line.replace(/^>\s?/, ""))) + "</p>");
				continue;
			}
			closeBq();
			// Ordered list item.
			var oli = line.match(/^(\d+)[.)]\s+(.*)$/);
			if (oli) {
				if (inUl) { out.push("</ul>"); inUl = false; }
				if (!inOl) { out.push("<ol>"); inOl = true; }
				out.push("<li>" + inline(esc(oli[2])) + "</li>");
				continue;
			}
			// Unordered list item.
			var uli = line.match(/^[-*+]\s+(.*)$/);
			if (uli) {
				if (inOl) { out.push("</ol>"); inOl = false; }
				if (!inUl) { out.push("<ul>"); inUl = true; }
				out.push("<li>" + inline(esc(uli[1])) + "</li>");
				continue;
			}
			// Blank line — paragraph break.
			if (/^\s*$/.test(line)) { closeLists(); continue; }
			// Paragraph.
			closeLists();
			out.push("<p>" + inline(esc(line)) + "</p>");
		}
		closeLists(); closeBq();
		if (inCode) out.push("</code></pre>");
		return out.join("\n");
	}
	function __HtmlToMarkdown(root) {
		if (!root) return "";
		var out = [];
		function inline(node) {
			if (!node) return "";
			if (node.nodeType === 3) return (node.data || "").replace(/[\\`*_{}[\]<>]/g, "\\$&");
			if (node.nodeType !== 1) return "";
			var tag = node.nodeName.toLowerCase();
			var inner = "";
			for (var i = 0; i < node.childNodes.length; i++) inner += inline(node.childNodes[i]);
			switch (tag) {
				case "strong": case "b": return inner ? "**" + inner + "**" : "";
				case "em": case "i": return inner ? "*" + inner + "*" : "";
				case "u": return inner ? "<u>" + inner + "</u>" : ""; // markdown has no underline
				case "strike": case "s": case "del": return inner ? "~~" + inner + "~~" : "";
				case "code": return inner ? "`" + inner.replace(/\\([`*_])/g, "$1") + "`" : "";
				case "br": return "  \n";
				case "a":
					var href = node.getAttribute("href") || "";
					if (!href) return inner;
					return "[" + inner + "](" + href + ")";
				case "img":
					var src = node.getAttribute("src") || "";
					var alt = node.getAttribute("alt") || "";
					return "![" + alt + "](" + src + ")";
				case "span": case "font": return inner;
				default: return inner;
			}
		}
		function block(node, ctx) {
			if (!node) return;
			if (node.nodeType === 3) {
				var text = (node.data || "").replace(/\s+/g, " ").trim();
				if (text) out.push(text);
				return;
			}
			if (node.nodeType !== 1) return;
			var tag = node.nodeName.toLowerCase();
			var m;
			if ((m = tag.match(/^h([1-6])$/))) {
				out.push("\n" + Array(parseInt(m[1], 10) + 1).join("#") + " " + inline(node).trim() + "\n");
				return;
			}
			if (tag === "p" || tag === "div") {
				var t = inline(node).trim();
				if (t) out.push("\n" + t + "\n");
				return;
			}
			if (tag === "hr") { out.push("\n---\n"); return; }
			if (tag === "blockquote") {
				var bq = [];
				for (var i = 0; i < node.childNodes.length; i++) {
					var sub = __HtmlToMarkdown(node.childNodes[i].nodeType === 1 ? node.childNodes[i] : (function () { var w = root.ownerDocument.createElement("div"); w.appendChild(node.childNodes[i].cloneNode(true)); return w; })());
					if (sub.trim()) bq.push(sub.trim());
				}
				out.push("\n" + bq.join("\n\n").split("\n").map(function (l) { return "> " + l; }).join("\n") + "\n");
				return;
			}
			if (tag === "ul" || tag === "ol") {
				var idx = 0;
				var indent = (ctx && ctx.indent) || "";
				for (var i = 0; i < node.childNodes.length; i++) {
					var li = node.childNodes[i];
					if (!li || li.nodeName !== "LI") continue;
					idx++;
					var bullet = tag === "ol" ? (idx + ". ") : "- ";
					// Inline content first, then nested lists.
					var liInline = "";
					var nestedHtml = "";
					for (var j = 0; j < li.childNodes.length; j++) {
						var c = li.childNodes[j];
						if (c.nodeType === 1 && (c.nodeName === "UL" || c.nodeName === "OL")) {
							var nestedOut = [];
							var save = out;
							out = nestedOut;
							block(c, { indent: indent + "  " });
							out = save;
							nestedHtml += "\n" + nestedOut.join("").replace(/^\n+|\n+$/g, "").split("\n").map(function (l) { return indent + "  " + l; }).join("\n");
						} else {
							liInline += inline(c);
						}
					}
					out.push(indent + bullet + liInline.trim() + nestedHtml + "\n");
				}
				out.push("\n");
				return;
			}
			if (tag === "pre") {
				var code = node.textContent || "";
				out.push("\n```\n" + code + "\n```\n");
				return;
			}
			if (tag === "table") {
				var rows = node.querySelectorAll("tr");
				if (rows.length === 0) return;
				out.push("\n");
				for (var r = 0; r < rows.length; r++) {
					var cells = rows[r].children;
					var rowCells = [];
					for (var c = 0; c < cells.length; c++) rowCells.push(inline(cells[c]).trim());
					out.push("| " + rowCells.join(" | ") + " |\n");
					if (r === 0) out.push("|" + rowCells.map(function () { return " --- "; }).join("|") + "|\n");
				}
				out.push("\n");
				return;
			}
			// Default: walk children.
			for (var i = 0; i < node.childNodes.length; i++) block(node.childNodes[i], ctx);
		}
		for (var i = 0; i < root.childNodes.length; i++) block(root.childNodes[i]);
		return out.join("").replace(/\n{3,}/g, "\n\n").replace(/^\s+|\s+$/g, "") + "\n";
	}

	editor.getReadOnly = function () {
		return !!_isreadonly;
	}
	editor.setReadOnly = function (bVal) {
		if (typeof (bVal) == "undefined") bVal = true;
		if ((!!_isreadonly) == (!!bVal))
			return;
		_isreadonly = !!bVal;

		iframe.contentDocument.designMode = _isreadonly ? "OFF" : "ON";

		___Update_Toolbars();
		__SetTimeout_HandleSelectionChange();

		if (__codemodeinp) __codemodeinp.readOnly = _isreadonly;
	}

	editor.getSelectedControl = __GetSelectedControl;
	editor.getSelectionElement = __GetSelectionElement;
	editor.getSelectedText = __GetSelectedText;
	editor.getSelectedHTML = function () {
		if (editsel.isCollapsed || editsel.rangeCount == 0)
			return "";
		var r = _editsel_getRange();
		var cloned = r.cloneContents();
		var div = editdoc.createElement("div");
		div.appendChild(cloned);
		return div.innerHTML;
	};

	editor.insertRootParagraph = __InsertRootParagraph;
	editor.insertByTagName = __InsertByTagName;
	editor.surroundByTagName = __SurroundByTagName;
	editor.insertElement = __InsertElement;
	editor.surroundElement = __SurroundElement;
	editor.insertText = __InsertText;
	editor.insertHTML = __InsertHTML;

	editor.insertImageByUrl = function (url) {
		var img = __SurroundByTagName("IMG");
		img.src = url;
		__ApplyImageLazyAttrs(img);
	}

	editor.selectControl = __SelectControl;
	editor.selectDoc = __SelectDoc;
	editor.collapse = __Collapse;

	editor.delete = __Delete;

	editor.commitBookmark = ___CurrentBookmark_Commit;

	editor.clearHistory = __ClearHistory;

	// TODO: Expose this API publicly.

	editor.__toggleSubToolbar = __Toggle_SubToolbar;

	editor.notifySelectionChange = __On_Selection_Change;
	editor.__On_Selection_Change = __On_Selection_Change;

	editor.toolbarFactoryMap = __toolbar_item_factory_map;
	editor.createToolbarButton = __Default_ToolbarItemFactory;
	editor.createToolbarDropDown = __CreateToolbarDropDown;

	editor.createToolbarItemDropDownPanel = __Create_ToolbarItemDropDownPanel;

	editor.createTabUI = __UI_CreateTabUI;

	editor.createDialog = __UI_CreateDialogFrame;

	editor.closeCurrentPopup = __Close_CurrentPopup;

	editor.setImageForCommand = __SetImageForCmd;

	editor.attachEvent = __HookEvent;
	editor.detachEvent = __UnattachEvent;

	(function () {
		for (var i = 0; i < __plugins.length; i++) {
			var p = __plugins[i];
			if (p.InitEditor) p.InitEditor(editor);
		}
	})();

	function __ShallUseMobileToolbar() {
		return window.innerWidth <= config.maxWidthForMobile;
		//return document.documentElement.offsetWidth <= config.maxWidthForMobile;
	}
	function __ApplyToolbarForWidth(updatetoolbar) {

		if (__ShallUseMobileToolbar()) {
			if (!toolbarMobile._init) {
				var mobiletoolbarname = config.toolbarMobile;
				var default_toolbar_exp = config["toolbar_" + mobiletoolbarname];
				if (!default_toolbar_exp && mobiletoolbarname != "mobile") {
					default_toolbar_exp = config.toolbar_mobile;
					mobiletoolbarname = "mobile";
					config.toolbarMobile = mobiletoolbarname;
				}
				if (default_toolbar_exp)
					__ParseItemList(default_toolbar_exp, toolbarMobile);
				else
					console.error("miss config " + "toolbar_" + config.toolbarMobile)
				toolbarMobile._init = true;
			}
			toolbarDesktop.style.display = "none";
			toolbarMobile.style.display = "flex";
			container.classList.add("rte-mobile");
			container.classList.remove("rte-desktop");
		}
		else {
			if (!toolbarDesktop._init) {
				var desktoptoolbarname = config.toolbar;
				var default_toolbar_exp = config["toolbar_" + desktoptoolbarname];
				if (!default_toolbar_exp && desktoptoolbarname != "full") {
					default_toolbar_exp = config.toolbar_full;
					desktoptoolbarname = "full";
					config.toolbar = desktoptoolbarname;
				}
				if (default_toolbar_exp)
					__ParseItemList(default_toolbar_exp, toolbarDesktop);
				else
					console.error("miss config " + "toolbar_" + config.toolbar)
				toolbarDesktop._init = true;
			}
			toolbarDesktop.style.display = "flex";
			toolbarMobile.style.display = "none";
			container.classList.add("rte-desktop");
			container.classList.remove("rte-mobile");
		}

		if (updatetoolbar) ___Update_Toolbars();
	}




	function __Exec_Cmd_Unlink() {
		var a = __FindSelectionElement("A");
		if (!a) return;

		var sel = editor.getSelection();
		var an = sel.anchorNode;
		var ano = sel.anchorOffset;
		var fn = sel.focusNode;
		var fno = sel.focusOffset;

		__RemoveNodeOnly(a);

		var r = editdoc.createRange();
		if (editable.contains(an))
			r.setStart(an, ano);
		if (fn != null && editable.contains(fn) && (fn != an || fno != ano))
			r.setEnd(fn, fno);
		sel.empty();
		sel.addRange(r);

	}



	function __UI_CreateTabUI(container) {
		var tabui = __Append(container, "rte-tabui");

		var tabtoolbar = __Append(tabui, "rte-tabui-toolbar");
		tabtoolbar.setAttribute("role", "tablist");

		var btns = [];
		var tabs = [];
		var inithandlers = [];
		var activehandlers = [];

		var _selindex = -1;
		function __SelectIndex(index) {
			if (_selindex == index)
				return;
			if (_selindex != -1) {
				btns[_selindex].classList.remove("rte-ui-active");
				btns[_selindex].setAttribute("aria-selected", "false");
				btns[_selindex].tabIndex = -1;
				tabs[_selindex].style.display = "none";
				tabs[_selindex].setAttribute("aria-hidden", "true");
			}
			_selindex = index;
			btns[_selindex].classList.add("rte-ui-active");
			btns[_selindex].setAttribute("aria-selected", "true");
			btns[_selindex].tabIndex = 0;
			tabs[_selindex].style.display = "";
			tabs[_selindex].setAttribute("aria-hidden", "false");

			var h = inithandlers[index];
			if (h) {
				inithandlers[index] = null;
				h(tabs[_selindex])
			}

			var h = activehandlers[index];
			if (h) {
				h(tabs[_selindex])
			}

		}

		tabui.addTabPage = function (header, cssclass, inithandler, activehandler) {

			var btn = __Append(tabtoolbar, "rte-tabui-toolbar-button", null, cssclass);
			var tab = __Append(tabui, "rte-tabui-panel", "position:relative", cssclass);

			var index = btns.length;

			btns.push(btn);
			tabs.push(tab);
			inithandlers.push(inithandler);
			activehandlers.push(activehandler);
			btn.setAttribute("role", "tab");
			btn.tabIndex = -1;
			btn.setAttribute("aria-selected", "false");
			var tabId = "rte-tab-panel-" + Math.random().toString(36).substring(2, 10);
			var buttonId = "rte-tab-button-" + Math.random().toString(36).substring(2, 10);
			btn.id = buttonId;
			tab.id = tabId;
			btn.setAttribute("aria-controls", tabId);
			tab.setAttribute("role", "tabpanel");
			tab.setAttribute("aria-labelledby", buttonId);
			tab.setAttribute("aria-hidden", "true");
			__Make_ActionElementAccessible(btn, { role: "tab", tabIndex: -1 });

			if (header instanceof HTMLElement || header instanceof DocumentFragment)
				btn.appendChild(header)
			else
				btn.innerText = header;
			btn.setAttribute("aria-label", btn.innerText || __Get_ActionElementLabel(btn, "Tab"));
			if (btn.__rteSyncActionLabel) btn.__rteSyncActionLabel();

			if (index == 0)
				__SelectIndex(index);
			else
				tab.style.display = "none";

			btn.onclick = function () {
				__SelectIndex(index);
			}

			btn.addEventListener("keydown", function (e) {
				var nextIndex = index;
				switch (e.key) {
					case "ArrowRight":
					case "Right":
						nextIndex = (index + 1) % btns.length;
						break;
					case "ArrowLeft":
					case "Left":
						nextIndex = (index - 1 + btns.length) % btns.length;
						break;
					case "Home":
						nextIndex = 0;
						break;
					case "End":
						nextIndex = btns.length - 1;
						break;
					default:
						return;
				}
				e.preventDefault();
				e.stopPropagation();
				__SelectIndex(nextIndex);
				__Focus_ActionElement(btns[nextIndex]);
			});

			return tab;
		}

		return tabui;
	}



	function __UI_CreateGeneralTabs(tabui, existElement, inithandler, activehandler) {
		var tabs = {};

		//var panel = tabui.addTabPage(__GetLangText("style"), inithandler, activehandler);

		//var div1 = __Append(panel, "rte-dialog-line-class", "", "rte-dialog-line-input");
		//var labelcls = __Append(div1, "rte-dialog-input-label");
		//labelcls.innerText = __GetLangText("cssclass");
		//var inpcls = __Append(div1, "input");
		//inpcls.type = "text";

		//_SetInputValueClassLogic(inpcls, existElement && existElement.className)

		//var inpclschanged = false;
		//inpcls.onchange = function () { inpclschanged = true; }

		tabs.$setToElement = function (targetElement) {
			//if (inpclschanged)
			//    targetElement.className = inpcls.value.trim();
		}

		return tabs;
	}


	function __UI_Dialog_About() {
		var dialoginner = __UI_CreateDialogFrame(__GetLangText("About RichTextEditor"), "rte-dialog-about");
		var width = editor.offsetWidth < 500 ? 320 : 640;
		var height = width * 3 / 4;
		var iframe = __Append(dialoginner, "iframe", "width:" + width + "px;height:" + height + "px;border:0px;");
		iframe.src = config.helpUrl || "https://www.richtexteditor.com/?go=help&ver=" + editor.version;
	}

	var clipboardPermission = null;
	function __UI_Dialog_Paste(cmdlower) {

		if (cmdlower == "pastetext" && clipboardPermission != 'failed') {
			var taskRead;
			try {
				taskRead = navigator.clipboard.read();
			}
			catch (x) {

			}
			if (taskRead) {
				taskRead.then(function (items) {
					clipboardPermission = "done";
					if (items.length == 0) {
						(window.toast || window.alert)("Clipboard is empty");
						return;
					}
					__Process_CliboardItems(items, cmdlower);
				}, function (error) {
					clipboardPermission = 'failed';
					__UI_Dialog_Paste(cmdlower);
				})
				return;
			}
		}


		var dialoginner = __UI_CreateDialogFrame(__GetLangText(cmdlower), "rte-dialog-" + cmdlower);

		var div1 = __Append(dialoginner, "div", "display:flex;flex-direction:column;");
		var p1 = __Append(div1, "div", "", "rte-paste-instruction");
		p1.innerText = __GetLangText("pasteinstruction");

		var editable = __Append(div1, "div", "text-align:left;", "rte-html-div");
		editable.setAttribute("contentEditable", "true");
		setTimeout(function () {
			editable.focus();
		}, 100);

		var usedatatransfer = cmdlower == "pasteauto" || cmdlower == "pasteword";

		editable.onpaste = function (e) {
			//editable.style.visibility = 'hidden';
			if (usedatatransfer && __Process_DataTransfer(e.clipboardData, e, cmdlower)) {
				dialoginner.close();
				return;
			}
			setTimeout(function () {
				if (cmdlower == "pastetext") {
					if (editable.innerText) {
						dialoginner.close();
						__InsertText(editable.innerText)
						return;
					}
				}
				else {
					if (editable.innerHTML) {   // TODO: Process embedded images.
						dialoginner.close();
						__InsertHTML(editable.innerHTML)
						return;
					}
				}
				//editable.style.visibility = '';
			}, 10)
		}
	}

	function __ToggleImageCaption(img) {
		if (img.nodeName == "IMG") {
			if (img.parentNode.nodeName != "FIGURE") {
				// Add the processed node to the editor content.
				var figure = img.parentNode.insertBefore(editdoc.createElement("FIGURE"), img);
				figure.appendChild(img);
				figure.style.cssText = "display:inline-block;text-align:center;";
				var caption = __Append(figure, "figcaption")
				caption.innerText = __GetLangText("defaultimagecaption");
				__SelectElementText(caption);
				return;
			}
			img = img.parentNode;
		}
		if (img.nodeName == "FIGURE") {
			var figure = img;
			var caption = img.querySelector("figcaption");
			if (caption == null) {
				caption = __Append(figure, "figcaption")
				caption.innerText = __GetLangText("defaultimagecaption");
				__SelectElementText(caption);
				return;
			}
			else {
				caption.parentNode.removeChild(caption);
				__SelectControl(figure);
			}
		}
	}

	function __UI_Dialog_EditImage(tag) {
		var dialoginner = __UI_CreateDialogFrame("EditImage", "rte-dialog-editimage");

		var div1 = __Append(dialoginner, "div", "display:flex;");
		var label1 = __Append(div1, "label", "width:40px");
		label1.innerText = "Url" + ":";
		var input1 = __Append(div1, "input", "flex:999");
		input1.type = "text";
		input1.value = tag.getAttribute("src");
		input1.onchange = function () {
			tag.setAttribute("src", input1.value);
		}
	}

	//function __UI_InsertImage() {
	//	var dialoginner = __UI_CreateDialogFrame("InsertImage", "rte-dialog-insertimage");

	//	var div1 = __Append(dialoginner, "div", "position:relative;text-align:center;");

	//	var btn1 = __Append(div1, "button", "text-align:center;");
	//	btn1.innerText = "Browse an image file..";
	//	var file = __Append(div1, "input", "position:absolute;top:0px;left:0px;width:100%;height:100%;opacity:0.01");
	//	file.type = "file";
	//	file.setAttribute("accept", "image/*");

	//	var div2 = __Append(dialoginner, "div", "text-align:center;");
	//	div2.innerText = " OR ";

	//	var div3 = __Append(dialoginner, "div", "text-align:center;");
	//	div3.innerText = "drag and drop an image file to here";

	//	var dialogouter = dialoginner.parentNode;
	//	dialogouter.ondragenter = function (e) { e.preventDefault(); }
	//	dialogouter.ondragover = function (e) { e.preventDefault(); }
	//	dialogouter.ondrop = function (e) {
	//		e.preventDefault();
	//		__Process_DataTransfer(e.dataTransfer, e);
	//		dialoginner.close();
	//		__Focus_Editor_Ensure();
	//	}

	//	file.onchange = function () {
	//		__InsertFile(file.files[0]);
	//		dialoginner.close();
	//	}
	//}

	function __UI_InsertLink(mode) {

		var dialoginner = __UI_CreateDialogFrame(mode == "anchor" ? "InsertAnchor" : "InsertLink", "rte-dialog-insertlink");

		var div1 = __Append(dialoginner, "div", "position:relative;text-align:center;");


	}

	function __UI_InsertAnchor() {
		__UI_InsertLink("anchor")
	}

	function __FindSelectionCommentElement() {
		var node = __GetSelectionElement();
		if (node && node.nodeType == 3) node = node.parentNode;
		while (node && node != editable) {
			if (node.getAttribute && (node.getAttribute("data-comment") || node.getAttribute("data-rte-comment")))
				return node;
			if (node.classList && node.classList.contains("rte-comment-marker"))
				return node;
			node = node.parentNode;
		}
		return null;
	}

	function __HasMeaningfulSelectionForComment() {
		var text = editsel && !editsel.isCollapsed ? editsel.toString() : __GetSelectedText();
		return !!(text && text.replace(/\u00A0/g, " ").trim());
	}

	function __GetCommentNote(node) {
		if (!node) return "";
		var note = node.getAttribute("data-comment") || node.getAttribute("data-rte-comment") || node.getAttribute("title") || "";
		return note.replace(/^Comment:\s*/i, "");
	}

	function __StyleCommentElement(node, ismarker) {
		if (!node) return;
		if (ismarker) {
			if (node.classList) node.classList.add("rte-comment-marker");
			node.setAttribute("contenteditable", "false");
			node.style.cssText = "background:#fff9c4;border:1px solid #f9a825;border-radius:3px;padding:1px 6px;font-size:11px;color:#f57f17;cursor:pointer;";
		}
		else {
			if (node.classList) node.classList.remove("rte-comment-marker");
			node.removeAttribute("contenteditable");
			node.style.cssText = "background:#fff9c4;border-bottom:2px solid #f9a825;cursor:pointer;position:relative;";
		}
	}

	function __UI_InsertComment() {
		var existingcomment = __FindSelectionCommentElement();
		var selectedText = editsel && !editsel.isCollapsed ? editsel.toString() : "";
		var hasselection = !!(selectedText && selectedText.replace(/\u00A0/g, " ").trim());
		var existingnote = __GetCommentNote(existingcomment);

		var dialoginner = __UI_CreateDialogFrame("Add Comment", "rte-dialog-insertcomment");
		dialoginner.style.padding = "16px";

		if (hasselection) {
			var preview = __Append(dialoginner, "div", "background:#f5f5f5;border-left:3px solid #0f8b8d;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#555;border-radius:0 4px 4px 0;max-height:60px;overflow:hidden;");
			preview.innerText = selectedText.substring(0, 120) + (selectedText.length > 120 ? "..." : "");
		}

		var label = __Append(dialoginner, "label", "display:block;margin-bottom:6px;font-size:13px;font-weight:600;");
		label.innerText = "Comment:";
		var textarea = __Append(dialoginner, "textarea", "width:100%;height:80px;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;resize:vertical;");
		textarea.placeholder = __GetLangText("commentplaceholder");
		textarea.value = existingnote;

		var btnRow = __Append(dialoginner, "div", "margin-top:12px;text-align:right;");
		var insertBtn = __Append(btnRow, "button", "padding:6px 18px;background:#0f8b8d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;");
		insertBtn.type = "button";
		insertBtn.innerText = __GetLangText("commentapply");
		insertBtn.onclick = function () {
			var comment = (textarea.value || "").replace(/^\s+|\s+$/g, "");
			if (!comment) {
				textarea.focus();
				textarea.style.backgroundColor = "#fff1f2";
				return;
			}
			textarea.style.backgroundColor = "";

			if (hasselection) {
				var commentnode = existingcomment || __SurroundByTagName("MARK");
				if (!commentnode) return;
				__StyleCommentElement(commentnode, false);
				commentnode.setAttribute("title", comment);
				commentnode.setAttribute("data-comment", comment);
				commentnode.setAttribute("data-rte-comment", comment);
				commentnode.setAttribute("aria-label", comment);
			}
			else if (existingcomment) {
				var ismarker = (existingcomment.classList && existingcomment.classList.contains("rte-comment-marker")) || existingcomment.getAttribute("contenteditable") == "false";
				__StyleCommentElement(existingcomment, ismarker);
				existingcomment.setAttribute("title", comment);
				existingcomment.setAttribute("data-comment", comment);
				existingcomment.setAttribute("data-rte-comment", comment);
				existingcomment.setAttribute("aria-label", comment);
				if (ismarker) existingcomment.innerHTML = "&#128172; Comment";
			}
			else {
				__InsertHTML('<span class="rte-comment-marker" data-comment="' + __EscapeHtmlText(comment) + '" data-rte-comment="' + __EscapeHtmlText(comment) + '" contenteditable="false" style="background:#fff9c4;border:1px solid #f9a825;border-radius:3px;padding:1px 6px;font-size:11px;color:#f57f17;cursor:pointer;" title="' + __EscapeHtmlText(comment) + '" aria-label="' + __EscapeHtmlText(comment) + '">&#128172; Comment</span>');
				__Collapse(false);
			}
			dialoginner.close();
			__Focus_Editor_Delay();
			__SetTimeout_HandleSelectionChange();
		};

		setTimeout(function () { textarea.focus(); }, 100);
	}

function __UI_InsertPageBreak() {
		var enterkeytag = config.enterKeyTag;
		if (!enterkeytag || enterkeytag.toLowerCase() == "br")
			enterkeytag = "div";

		var marker = __InsertRootParagraph("div");
		marker.setAttribute("data-rte-page-break", "true");
		marker.setAttribute("contenteditable", "false");
		marker.style.cssText = "position:relative;text-align:center;border-top:2px dashed #94a3b8;margin:18px 0 14px;padding:0;height:0;line-height:0;user-select:none;";
		var label = __Append(marker, "span", "position:relative;top:-0.75em;display:inline-block;padding:0 10px;background:#fff;color:#64748b;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;line-height:1.6;");
		label.innerText = __GetLangText("insertpagebreak");

		var newp = editdoc.createElement(enterkeytag);
		newp.innerHTML = "<br/>";
		marker.parentNode.insertBefore(newp, marker.nextSibling);
		__SelectElementText(newp);
		__Collapse(false);
		__Focus_Editor_Delay();
		___IFrame_Adjust_ScrollTop(true);
	}


	function __EscapeHtmlText(value) {
		return (value == null ? "" : String(value))
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function __PlainTextToHtml(value) {
		return __EscapeHtmlText(value).replace(/\r?\n/g, "<br/>");
	}

	function __CloneBookmarkState(bookmark) {
		if (!bookmark) return null;
		return JSON.parse(JSON.stringify(bookmark));
	}

	function __GetHtmlTextPreview(html) {
		var temp = document.createElement("div");
		temp.innerHTML = html || "";
		return (temp.innerText || temp.textContent || "").replace(/\s+/g, " ").trim();
	}

	function __UI_InsertMergeField() {
		var dialoginner = __UI_CreateDialogFrame(__GetLangText("insertmergefield"), "rte-dialog-insertmergefield");
		var hint = __Append(dialoginner, "div", "margin:16px 16px 10px;color:#5e6b7d;line-height:1.65;");
		hint.innerText = __GetLangText("mergefieldhint");

		var div1 = __Append(dialoginner, "div", "", "rte-dialog-line-input");
		var label1 = __Append(div1, "rte-dialog-input-label");
		label1.innerText = __GetLangText("mergefieldname");
		var input1 = __Append(div1, "input", "width:320px");
		input1.type = "text";
		input1.placeholder = __GetLangText("mergefieldnameplaceholder");

		var div2 = __Append(dialoginner, "div", "", "rte-dialog-line-input");
		var label2 = __Append(div2, "rte-dialog-input-label");
		label2.innerText = "Display Text";
		var input2 = __Append(div2, "input", "width:320px");
		input2.type = "text";
		input2.placeholder = __GetLangText("mergefielddisplayplaceholder");

		var footer = __Append(dialoginner, "div", "display:flex;justify-content:flex-end;gap:10px;padding:6px 16px 16px;");
		var btncancel = __Append(footer, "rte-dialog-button", "", "rte-button-type-cancel");
		btncancel.innerText = __GetLangText("cancel");
		btncancel.onclick = function () { dialoginner.close(); };

		var btninsert = __Append(footer, "rte-dialog-button", "", "rte-button-type-action");
		btninsert.innerText = __GetLangText("insert");
		btninsert.onclick = function () {
			var fieldName = (input1.value || "").replace(/\s+/g, " ").trim();
			if (!fieldName) {
				input1.focus();
				input1.style.backgroundColor = "#fff1f2";
				return;
			}
			input1.style.backgroundColor = "";
			var displayText = (input2.value || "").replace(/\s+/g, " ").trim();
			if (!displayText) displayText = "{{" + fieldName + "}}";
			var html = '<span data-rte-merge-field="' + __EscapeHtmlText(fieldName) + '" contenteditable="false" style="display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border:1px solid #bfdbfe;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:0.95em;font-weight:600;white-space:nowrap;">' + __EscapeHtmlText(displayText) + '</span>&nbsp;';
			__InsertHTML(html);
			__Collapse(false);
			dialoginner.close();
			__Focus_Editor_Delay();
		};

		setTimeout(function () { input1.focus(); }, 20);
	}

	function __UI_InsertFootnote() {
		var dialoginner = __UI_CreateDialogFrame(__GetLangText("insertfootnote"), "rte-dialog-insertfootnote");
		var hint = __Append(dialoginner, "div", "margin:16px 16px 10px;color:#5e6b7d;line-height:1.65;");
		hint.innerText = __GetLangText("footnotehint");

		var div1 = __Append(dialoginner, "div", "", "rte-dialog-line-input");
		var label1 = __Append(div1, "rte-dialog-input-label");
		label1.innerText = __GetLangText("footnote");
		var input1 = __Append(div1, "textarea", "width:360px;height:96px");
		input1.placeholder = __GetLangText("footnoteplaceholder");

		var footer = __Append(dialoginner, "div", "display:flex;justify-content:flex-end;gap:10px;padding:6px 16px 16px;");
		var btncancel = __Append(footer, "rte-dialog-button", "", "rte-button-type-cancel");
		btncancel.innerText = __GetLangText("cancel");
		btncancel.onclick = function () { dialoginner.close(); };

		var btninsert = __Append(footer, "rte-dialog-button", "", "rte-button-type-action");
		btninsert.innerText = __GetLangText("insert");
		btninsert.onclick = function () {
			var note = (input1.value || "").replace(/^\s+|\s+$/g, "");
			if (!note) {
				input1.focus();
				input1.style.backgroundColor = "#fff1f2";
				return;
			}
			input1.style.backgroundColor = "";
			var refs = editable.querySelectorAll("[data-rte-footnote-ref]");
			var notes = editable.querySelectorAll("[data-rte-footnote-item]");
			var number = Math.max(refs.length, notes.length) + 1;
			var stamp = Date.now().toString(36);
			var refId = "rte-footnote-ref-" + stamp + "-" + number;
			var itemId = "rte-footnote-item-" + stamp + "-" + number;
			var refHtml = '<sup id="' + refId + '" data-rte-footnote-ref="' + number + '" style="font-size:0.75em;line-height:1;vertical-align:super;"><a href="#' + itemId + '" style="color:#1d4ed8;text-decoration:none;">[' + number + ']</a></sup>&nbsp;';
			__InsertHTML(refHtml);

			var host = editable.querySelector("[data-rte-footnotes='true']");
			var list = null;
			if (!host) {
				host = editdoc.createElement("div");
				host.setAttribute("data-rte-footnotes", "true");
				host.style.cssText = "margin-top:24px;padding-top:14px;border-top:1px solid #cbd5e1;";
				var title = __Append(host, "div", "margin-bottom:10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#475569;");
				title.innerText = __GetLangText("footnotes");
				list = __Append(host, "ol", "margin:0;padding-left:22px;color:#334155;");
				editable.appendChild(host);
			}
			else {
				list = host.querySelector("ol");
				if (!list) list = __Append(host, "ol", "margin:0;padding-left:22px;color:#334155;");
			}

			var item = __Append(list, "li", "margin:0 0 10px 0;line-height:1.7;");
			item.id = itemId;
			item.setAttribute("data-rte-footnote-item", number);
			item.innerHTML = '<span>' + __PlainTextToHtml(note) + '</span> <a href="#' + refId + '" style="color:#1d4ed8;text-decoration:none;">&#8617;</a>';
			dialoginner.close();
			__Collapse(false);
			__Focus_Editor_Delay();
			__SetTimeout_HandleSelectionChange();
		};

		setTimeout(function () { input1.focus(); }, 20);
	}

	function __UI_InsertTableOfContents() {
		var headings = editable.querySelectorAll("h1,h2,h3,h4,h5,h6");
		var items = [];
		var seed = Date.now().toString(36);
		for (var i = 0; i < headings.length; i++) {
			var heading = headings[i];
			if (heading.closest("[data-rte-toc='true']") || heading.closest("[data-rte-footnotes='true']")) continue;
			var textValue = (heading.innerText || heading.textContent || "").replace(/\s+/g, " ").trim();
			if (!textValue) continue;
			if (!heading.id) heading.id = "rte-heading-" + seed + "-" + (i + 1);
			items.push({ id: heading.id, text: textValue, level: parseInt(heading.nodeName.substring(1), 10) || 1 });
		}

		if (!items.length) {
			alert(__GetLangText("tocempty"));
			return;
		}

		var html = '<div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#475569;margin-bottom:10px;">' + __EscapeHtmlText(__GetLangText("inserttoc")) + '</div>';
		html += '<div style="display:flex;flex-direction:column;gap:6px;">';
		for (var j = 0; j < items.length; j++) {
			var item = items[j];
			html += '<div style="margin-left:' + Math.max(0, (item.level - 1) * 16) + 'px;"><a href="#' + __EscapeHtmlText(item.id) + '" style="color:#1d4ed8;text-decoration:none;">' + __EscapeHtmlText(item.text) + '</a></div>';
		}
		html += '</div>';

		var tocNode = editable.querySelector("[data-rte-toc='true']");
		if (!tocNode) tocNode = __InsertRootParagraph("div");
		if (!tocNode) return;
		tocNode.setAttribute("data-rte-toc", "true");
		tocNode.setAttribute("contenteditable", "false");
		tocNode.style.cssText = "margin:18px 0;padding:16px 18px;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;";
		tocNode.innerHTML = html;
		__SetTimeout_HandleSelectionChange();
		__Focus_Editor_Delay();
	}

	function __UI_RevisionHistory() {
		___CurrentBookmark_Save();
		___CurrentBookmark_Commit();

		var snapshots = undolist.slice();
		snapshots.push(__CloneBookmarkState(currentbookmark));
		if (!snapshots.length) {
			alert(__GetLangText("revisionempty"));
			return;
		}

		var dialoginner = __UI_CreateDialogFrame(__GetLangText("revisionhistory"), "rte-dialog-revisionhistory");
		var hint = __Append(dialoginner, "div", "margin:16px 16px 10px;color:#5e6b7d;line-height:1.65;");
		hint.innerText = __GetLangText("revisionhistoryhint");
		var list = __Append(dialoginner, "div", "padding:0 16px 12px;max-height:360px;overflow:auto;display:flex;flex-direction:column;gap:10px;");
		var reversed = snapshots.reverse();

		for (var i = 0; i < reversed.length; i++) {
			(function (snapshot, isCurrent) {
				var row = __Append(list, "div", "border:1px solid #dbe3ef;border-radius:14px;padding:12px 14px;background:#fff;");
				var top = __Append(row, "div", "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;");
				var meta = __Append(top, "div", "font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;");
				meta.innerText = isCurrent ? __GetLangText("revisioncurrent") : (snapshot.time ? new Date(snapshot.time).toLocaleString() : "Snapshot");
				var button = __Append(top, "rte-dialog-button", "", isCurrent ? "rte-button-type-cancel" : "rte-button-type-action");
				button.innerText = isCurrent ? __GetLangText("close") : __GetLangText("revisionrestore");
				button.onclick = function () {
					if (isCurrent) {
						dialoginner.close();
						return;
					}
					var clone = __CloneBookmarkState(snapshot);
					if (!clone) return;
					undolist.push(__CloneBookmarkState(currentbookmark));
					redolist.length = 0;
					currentbookmark = clone;
					currentbookmark.committed = true;
					if (!currentbookmark.key) currentbookmark.key = ___CurrentBookmark_CalcKey(currentbookmark.html || "");
					dialoginner.close();
					___CurrentBookmark_Load();
					__Focus_Editor_Delay();
					__SetTimeout_HandleSelectionChange();
				};
				var preview = __Append(row, "div", "color:#334155;line-height:1.65;font-size:13px;");
				var previewText = __GetHtmlTextPreview(snapshot.html || "");
				preview.innerText = previewText || __GetLangText("revisionempty");
			})(reversed[i], i == 0);
		}

		var footer = __Append(dialoginner, "div", "display:flex;justify-content:flex-end;padding:0 16px 16px;");
		var closebtn = __Append(footer, "rte-dialog-button", "", "rte-button-type-cancel");
		closebtn.innerText = __GetLangText("close");
		closebtn.onclick = function () { dialoginner.close(); };
	}
	function __UI_ColorPickerDialog(cmd, handler) {

		var dialoginner = __UI_CreateDialogFrame(__GetLangText("colorpicker"), "rte-dialog-colorpicker");

		dialoginner.classList.add("rte-dialog-colorpicker");

		var tabcontainer = __Append(dialoginner, "div", "position:relative;text-align:center;");


		var divbottom = __Append(dialoginner, "rte-dialog-line-colorpicker", "", "rte-dialog-line-input");
		var label1 = __Append(divbottom, "rte-dialog-input-label", "display:inline-block;position:static;width:100px;min-height:20px;padding-left:15px;background-color:transparent;box-shadow:none");
		label1.innerText = __GetLangText(cmd) + ":";
		var input1 = __Append(divbottom, "input", "width:150px;margin-right:12px");
		input1.type = "text";

		input1.onchange = input1.onkeypress = input1.onkeyup = input1.onpaste = function () {
			setTimeout(function () {
				var prop = "backgroundColor";
				if (cmd.toLowerCase() == "forecolor") {
					prop = "color";
				}
				input1.style.backgroundColor = '';
				var val = input1.value.trim();
				label1.style[prop] = "";
				if (val) {
					label1.style[prop] = val;
				}
			}, 10);
		}

		_SetInputValueClassLogic(input1, "")

		var button1 = __Append(divbottom, "rte-dialog-button", "", "rte-button-type-action");
		var clickcallback = null;
		button1.innerText = __GetLangText("OK");
		button1.onclick = function () {
			var val = input1.value.trim();
			if (!val) return;
			var div = document.createElement("div");
			div.style.color = val;
			if (!div.style.color) {
				input1.style.backgroundColor = 'yellow';
				return;
			}

			handler(val);
			if (clickcallback) {
				debuglog(val)
				clickcallback(val);
				clickcallback = null;
			}
			// Release the temporary state after the callback completes.
			dialoginner.close();
		}


		setTimeout(function () { input1.focus(); }, 10);

		__Hook_Enter_Callback(input1, function () {
			button1.onclick();
		})



		var tabui = __UI_CreateTabUI(tabcontainer)

		tabui.addTabPage(__GetLangText("colorwebpalette"), "rte_colorpicker_colorwebpalette", function (panel) {


			function DoubleHex(v) {
				if (v < 16) return "0" + v.toString(16);
				return v.toString(16);
			}
			function ToHexString(r, g, b) {
				return ("#" + DoubleHex(r * 51) + DoubleHex(g * 51) + DoubleHex(b * 51)).toUpperCase();
			}
			function MakeHex(z, x, y) {
				// Horizontal to vertical.
				var l = z % 2
				var t = (z - l) / 2
				z = l * 3 + t

				// Left column: mirror left and right.
				if (z < 3) x = 5 - x;

				// Middle row: mirror top and bottom.
				if (z == 1 || z == 4) y = 5 - y;

				return ToHexString(5 - y, 5 - x, 5 - z);
			}
			var colors = new Array(216);
			for (var z = 0; z < 6; z++) {
				for (var x = 0; x < 6; x++) {
					for (var y = 0; y < 6; y++) {
						var hex = MakeHex(z, x, y)
						var xx = (z % 2) * 6 + x;
						var yy = Math.floor(z / 2) * 6 + y;
						colors[yy * 12 + xx] = hex;
					}
				}
			}

			var arr = [];
			for (var i = 0; i < colors.length; i++) {
				if (i % 12 == 0) arr.push("<tr>");
				arr.push("<td class='colorcell'><div class='colordiv' style='background-color:")
				arr.push(colors[i]);
				arr.push("' rte-tooltip='");
				arr.push(colors[i]);
				arr.push("' cvalue='");
				arr.push(colors[i]);
				arr.push("' xtitle='")
				arr.push(colors[i]);
				arr.push("'>&nbsp;</div></td>");
				if (i % 12 == 11) arr.push("</tr>");
			}
			panel.innerHTML = "<table>" + arr.join("") + "</table>";
			panel.onclick = function (e) {
				var c = e.target.getAttribute("cvalue");
				if (c) {
					dialoginner.close();
					handler(c)
				}
			}
		})


		tabui.addTabPage(__GetLangText("colornamedcolors"), "rte_colorpicker_colornamedcolors", function (panel) {

			var colorlist = [{ n: 'green', h: '#008000' }, { n: 'lime', h: '#00ff00' }, { n: 'teal', h: '#008080' }, { n: 'aqua', h: '#00ffff' }, { n: 'navy', h: '#000080' }, { n: 'blue', h: '#0000ff' }, { n: 'purple', h: '#800080' }, { n: 'fuchsia', h: '#ff00ff' }, { n: 'maroon', h: '#800000' }, { n: 'red', h: '#ff0000' }, { n: 'olive', h: '#808000' }, { n: 'yellow', h: '#ffff00' }, { n: 'white', h: '#ffffff' }, { n: 'silver', h: '#c0c0c0' }, { n: 'gray', h: '#808080' }, { n: 'black', h: '#000000' }]
			var colormore = [{ n: 'darkolivegreen', h: '#556b2f' }, { n: 'darkgreen', h: '#006400' }, { n: 'darkslategray', h: '#2f4f4f' }, { n: 'slategray', h: '#708090' }, { n: 'darkblue', h: '#00008b' }, { n: 'midnightblue', h: '#191970' }, { n: 'indigo', h: '#4b0082' }, { n: 'darkmagenta', h: '#8b008b' }, { n: 'brown', h: '#a52a2a' }, { n: 'darkred', h: '#8b0000' }, { n: 'sienna', h: '#a0522d' }, { n: 'saddlebrown', h: '#8b4513' }, { n: 'darkgoldenrod', h: '#b8860b' }, { n: 'beige', h: '#f5f5dc' }, { n: 'honeydew', h: '#f0fff0' }, { n: 'dimgray', h: '#696969' }, { n: 'olivedrab', h: '#6b8e23' }, { n: 'forestgreen', h: '#228b22' }, { n: 'darkcyan', h: '#008b8b' }, { n: 'lightslategray', h: '#778899' }, { n: 'mediumblue', h: '#0000cd' }, { n: 'darkslateblue', h: '#483d8b' }, { n: 'darkviolet', h: '#9400d3' }, { n: 'mediumvioletred', h: '#c71585' }, { n: 'indianred', h: '#cd5c5c' }, { n: 'firebrick', h: '#b22222' }, { n: 'chocolate', h: '#d2691e' }, { n: 'peru', h: '#cd853f' }, { n: 'goldenrod', h: '#daa520' }, { n: 'lightgoldenrodyellow', h: '#fafad2' }, { n: 'mintcream', h: '#f5fffa' }, { n: 'darkgray', h: '#a9a9a9' }, { n: 'yellowgreen', h: '#9acd32' }, { n: 'seagreen', h: '#2e8b57' }, { n: 'cadetblue', h: '#5f9ea0' }, { n: 'steelblue', h: '#4682b4' }, { n: 'royalblue', h: '#4169e1' }, { n: 'blueviolet', h: '#8a2be2' }, { n: 'darkorchid', h: '#9932cc' }, { n: 'deeppink', h: '#ff1493' }, { n: 'rosybrown', h: '#bc8f8f' }, { n: 'crimson', h: '#dc143c' }, { n: 'darkorange', h: '#ff8c00' }, { n: 'burlywood', h: '#deb887' }, { n: 'darkkhaki', h: '#bdb76b' }, { n: 'lightyellow', h: '#ffffe0' }, { n: 'azure', h: '#f0ffff' }, { n: 'lightgray', h: '#d3d3d3' }, { n: 'lawngreen', h: '#7cfc00' }, { n: 'mediumseagreen', h: '#3cb371' }, { n: 'lightseagreen', h: '#20b2aa' }, { n: 'deepskyblue', h: '#00bfff' }, { n: 'dodgerblue', h: '#1e90ff' }, { n: 'slateblue', h: '#6a5acd' }, { n: 'mediumorchid', h: '#ba55d3' }, { n: 'palevioletred', h: '#db7093' }, { n: 'salmon', h: '#fa8072' }, { n: 'orangered', h: '#ff4500' }, { n: 'sandybrown', h: '#f4a460' }, { n: 'tan', h: '#d2b48c' }, { n: 'gold', h: '#ffd700' }, { n: 'ivory', h: '#fffff0' }, { n: 'ghostwhite', h: '#f8f8ff' }, { n: 'gainsboro', h: '#dcdcdc' }, { n: 'chartreuse', h: '#7fff00' }, { n: 'limegreen', h: '#32cd32' }, { n: 'mediumaquamarine', h: '#66cdaa' }, { n: 'darkturquoise', h: '#00ced1' }
				, { n: 'cornflowerblue', h: '#6495ed' } // CSS named color.
				, { n: 'mediumslateblue', h: '#7b68ee' }, { n: 'orchid', h: '#da70d6' }, { n: 'hotpink', h: '#ff69b4' }, { n: 'lightcoral', h: '#f08080' }, { n: 'tomato', h: '#ff6347' }, { n: 'orange', h: '#ffa500' }, { n: 'bisque', h: '#ffe4c4' }, { n: 'khaki', h: '#f0e68c' }, { n: 'cornsilk', h: '#fff8dc' }, { n: 'linen', h: '#faf0e6' }, { n: 'whitesmoke', h: '#f5f5f5' }, { n: 'greenyellow', h: '#adff2f' }, { n: 'darkseagreen', h: '#8fbc8b' }, { n: 'turquoise', h: '#40e0d0' }, { n: 'mediumturquoise', h: '#48d1cc' }, { n: 'skyblue', h: '#87ceeb' }, { n: 'mediumpurple', h: '#9370db' }, { n: 'violet', h: '#ee82ee' }, { n: '#666', h: '#ffb6c1' }, { n: 'darksalmon', h: '#e9967a' }, { n: 'coral', h: '#ff7f50' }, { n: 'navajowhite', h: '#ffdead' }, { n: 'blanchedalmond', h: '#ffebcd' }, { n: 'palegoldenrod', h: '#eee8aa' }, { n: 'oldlace', h: '#fdf5e6' }, { n: 'seashell', h: '#fff5ee' }, { n: 'ghostwhite', h: '#f8f8ff' }, { n: 'palegreen', h: '#98fb98' }, { n: 'springgreen', h: '#00ff7f' }, { n: 'aquamarine', h: '#7fffd4' }, { n: 'powderblue', h: '#b0e0e6' }, { n: 'lightskyblue', h: '#87cefa' }, { n: 'lightsteelblue', h: '#b0c4de' }, { n: 'plum', h: '#dda0dd' }, { n: 'pink', h: '#ffc0cb' }, { n: 'lightsalmon', h: '#ffa07a' }, { n: 'wheat', h: '#f5deb3' }, { n: 'moccasin', h: '#ffe4b5' }, { n: 'antiquewhite', h: '#faebd7' }, { n: 'lemonchiffon', h: '#fffacd' }, { n: 'floralwhite', h: '#fffaf0' }, { n: 'snow', h: '#fffafa' }, { n: 'aliceblue', h: '#f0f8ff' }, { n: 'lightgreen', h: '#90ee90' }, { n: 'mediumspringgreen', h: '#00fa9a' }, { n: 'paleturquoise', h: '#afeeee' }, { n: 'lightcyan', h: '#e0ffff' }, { n: 'lightblue', h: '#add8e6' }, { n: 'lavender', h: '#e6e6fa' }, { n: 'thistle', h: '#d8bfd8' }, { n: 'mistyrose', h: '#ffe4e1' }, { n: 'peachpuff', h: '#ffdab9' }, { n: 'papayawhip', h: '#ffefd5' }]


			var arr = [];
			for (var i = 0; i < colorlist.length; i++) {

				arr.push("<td class='colorcell'><div class='colordiv2' style='background-color:")
				arr.push(colorlist[i].n);
				arr.push("' rte-tooltip='")
				arr.push(colorlist[i].n);
				arr.push(' ');
				arr.push(colorlist[i].h);
				arr.push("' cname='");
				arr.push(colorlist[i].n);
				arr.push("' cvalue='")
				arr.push(colorlist[i].h);
				arr.push("'></div></td>");
			}

			var line1 = __Append(panel, "div");
			line1.innerHTML = "<div style='text-align:left;margin:0 0 10px'>" + __HtmlEncode(__GetLangText("colorbasic")) + "</div>";
			line1.innerHTML += "<table>" + arr.join("") + "</table>";


			var arr = [];
			for (var i = 0; i < colormore.length; i++) {
				if (i % 16 == 0) arr.push("<tr>");
				arr.push("<td class='colorcell'><div class='colordiv2' style='background-color:")
				arr.push(colormore[i].n);
				arr.push("' title='")
				arr.push(colormore[i].n);
				arr.push(' ');
				arr.push(colormore[i].h);
				arr.push("' cname='");
				arr.push(colormore[i].n);
				arr.push("' cvalue='")
				arr.push(colormore[i].h);
				arr.push("'></div></td>");
				if (i % 16 == 15) arr.push("</tr>");
			}
			if (colormore % 16 > 0) arr.push("</tr>");

			var line2 = __Append(panel, "div")
			line2.innerHTML = "<div style='text-align:left;margin:20px 0 10px'>" + __HtmlEncode(__GetLangText("coloraddition")) + "</div>";
			line2.innerHTML += "<table>" + arr.join("") + "</table>";

			panel.onclick = function (e) {
				var c = e.target.getAttribute("cvalue");
				if (c) {
					dialoginner.close();
					handler(c)
				}
			}
		})


		tabui.addTabPage(__GetLangText("more"), "rte_colorpicker_more", function (panel) {
			window.rtecolorpickereditor = editor;
			window.rtecolorpicker = {
				cancel: function () {
					clickcallback = null;
					dialoginner.close();
				}
				,
				select: function (c) {
					clickcallback = null;
					dialoginner.close();
					handler(c)
				}
				, setCallback: function (cb) {
					clickcallback = cb;
				}
				,
				update: function (c) {
					input1.value = c;
					input1.onchange();
				}

			};
			var iframe = __Append(panel, "iframe", "width:500px;height:320px;border:0;");
			iframe.src = config.url_base + "/runtime/colorpicker_more_ns.htm";
		});


		//tabui.addTabPage("CustomColor", function (panel) {
		//	panel.innerText = "3";
		//})

	} // __UI_ColorPickerDialog

	function __UI_PropertiesDialog(tag) {


		var dialoginner = __UI_CreateDialogFrame(tag.nodeName, "rte-dialog-colorpicker");

		dialoginner.classList.add("rte-dialog-colorpicker");

		var tabcontainer = __Append(dialoginner, "div", "position:relative;text-align:center;");

		var tabui = __UI_CreateTabUI(tabcontainer)

		__UI_CreateGeneralTabs(tabui, tag);
	}

	function __UI_PreviewDialog() {

		var dialoginner = __UI_CreateDialogFrame(config.text_previewtitle, "rte-dialog-preview");

		var tabui = __UI_CreateTabUI(dialoginner);
		var iframe = null;

		function activetabpage(panel, showtype) {
			if (iframe != null)
				iframe.remove();
			//console.info(showtype);
			panel.innerHTML = "";
			var framecontainer = __Append(panel, "rte-preview-framecontainer", "min-width:280px;min-height:320px;");
			iframe = __Append(framecontainer, "iframe", "align-self:center;flex:99;width:100%;height:100%;border:0px;", "rte-editable");
			iframe.contentDocument.open("text/html");
			iframe.contentDocument.write("<html><head><link id='url-css-preview' rel='stylesheet'/></head><body style='padding:0px;margin:0px'></body></html>")
			iframe.contentDocument.close();
			//iframe.contentDocument.designMode = "ON";
			var doc = iframe.contentDocument;

			for (var key in previewcss) {
				var text = previewcss[key];
				if (typeof (text) == "string") {
					var tag = __Append(doc.head, "style");
					tag.id = "css_" + key;
					tag.innerHTML = text;
				}
			}

			var csslink = doc.querySelector("#url-css-preview");
			csslink.onerror = function () { console.error("RTE ERROR : failed to load previewCssUrl " + config.previewCssUrl); }
			if (config.previewCssUrl) csslink.href = config.previewCssUrl;

			doc.body.innerHTML = __GetHTMLCode();

			if (config.previewScriptUrl) {
				var stag = doc.createElement("script");
				stag.setAttribute("src", config.previewScriptUrl);
				doc.head.appendChild(stag);
			}

			switch (showtype) {
				case "0":
					framecontainer.style.width = "100%";
					break;
				default:
					framecontainer.style.width = showtype + "px";
					break;
			}
		}

		tabui.addTabPage(config.text_previewnormal, null, null, function (panel) { activetabpage(panel, "0") });
		tabui.addTabPage(config.text_previewmobile, null, null, function (panel) { activetabpage(panel, "375") });
		tabui.addTabPage(config.text_previewtablet, null, null, function (panel) { activetabpage(panel, "768") });


		var btnprint = __Append(tabui, "span", "position:absolute;top:0px;right:32px;width:24px;height:24px;cursor:pointer");
		__Make_ActionElementAccessible(btnprint, { role: "button", label: __GetLangText("print") });
		__SetImageForCmd(btnprint, "print")
		btnprint.setAttribute("rte-tooltip", __GetLangText("print"));
		btnprint.onclick = function () {
			iframe.contentWindow.print();
		}

		var btnfullscreen = __Append(tabui, "span", "position:absolute;top:0px;right:0px;width:24px;height:24px;cursor:pointer");
		__Make_ActionElementAccessible(btnfullscreen, { role: "button", label: __GetLangText("fullscreen") });
		__SetImageForCmd(btnfullscreen, "fullscreenenter")
		btnfullscreen.setAttribute("rte-tooltip", __GetLangText("fullscreen"));
		btnfullscreen.onclick = function () {
			var added = dialoginner.classList.toggle("rte-preview-dialog-fullscreen")
			if (added) {
				__SetImageForCmd(btnfullscreen, "fullscreenexit")
				btnfullscreen.style.border = "solid 1px orange";
			}
			else {
				__SetImageForCmd(btnfullscreen, "fullscreenenter")
				btnfullscreen.style.border = "solid 1px transparent";
			}
		}


	} // __UI_PreviewDialog


	var _dialogcreatetime = 0;



	function __IsDialogJustShow() {
		if (_dialogcreatetime && new Date().getTime() - _dialogcreatetime < 300)
			return true;
	}

	function __UI_CreateDialogFrame(title, classname, disposeCallback) {

		_dialogcreatetime = new Date().getTime();

		var dialogouter;
		var previousFocus = document.activeElement;

		var floatmode = false;

		if (classname == 'rte-panel-find') {
			floatmode = true;
		}

		if (floatmode)
			dialogouter = __Append(dialogcontainer, "rte-dialog-float", "z-index:" + config.zIndexDialog, classname);
		else
			dialogouter = __Append(dialogcontainer, "rte-dialog-outer", "z-index:" + config.zIndexDialog, classname);

		if (floatmode) {
			//dialogouter.style.left = Math.max(0, container.offsetWidth - 450)/2 + "px";
		}

		var dialoginner = __Append(dialogouter, "rte-dialog-inner");
		dialoginner.setAttribute("role", "dialog");
		dialoginner.setAttribute("aria-label", title);
		dialoginner.setAttribute("aria-modal", floatmode ? "false" : "true");
		dialoginner.tabIndex = -1;
		dialoginner.focus();

		var closed = false;
		function __close_dialog() {
			if (closed) return;
			closed = true;
			dialogcontainer.removeChild(dialogouter);
			document.removeEventListener("keydown", keydown);
			if (previousFocus && previousFocus.focus && previousFocus.isConnected)
				setTimeout(function () { previousFocus.focus(); }, 0);
			__Focus_Editor_Ensure();
			if (disposeCallback) disposeCallback();
			if (dialoginner._onclose) dialoginner._onclose();
		}
		function keydown(e) {
			if (e.keyCode == 27) {
				__close_dialog();
				return;
			}
			if (e.keyCode == 9) {
				var focusables = __Get_FocusableElements(dialoginner);
				if (!focusables.length) {
					e.preventDefault();
					dialoginner.focus();
					return;
				}
				var first = focusables[0];
				var last = focusables[focusables.length - 1];
				if (e.shiftKey) {
					if (document.activeElement == first || document.activeElement == dialoginner) {
						e.preventDefault();
						last.focus();
					}
				}
				else if (document.activeElement == last) {
					e.preventDefault();
					first.focus();
				}
			}
		}
		document.addEventListener("keydown", keydown);


		setTimeout(function () {
			window.focus();
		}, 100);


		var divheader = __Append(dialoginner, "rte-dialog-header");
		var spantitle = __Append(divheader, "rte-dialog-header-text", "flex:999");
		spantitle.innerText = title;

		var spanclose = __Append(dialoginner, "rte-dialog-header-close", "");
		if (config.svgCode_DialogClose) {
			spanclose.innerHTML = config.svgCode_DialogClose;
		}
		else {
			spanclose.innerHTML = "&#10006;";
		}
		spanclose.onmousedown = function () { setTimeout(__close_dialog, 200) };
		spanclose.onclick = __close_dialog;
		spanclose.setAttribute(config.tooltipAttribute, __GetLangText("close"));


		var tx = 0;
		var ty = 0;
		divheader.onmousedown = function (e) {
			if (e.target == spanclose)
				return;

			var x = tx;
			var y = ty;

			startmousedrag(e, function (xm, ym) {
				tx = x + xm;
				ty = y + ym;
				if (floatmode)
					dialogouter.style.transform = "translate(" + tx + "px," + ty + "px)";
				else
					dialoginner.style.transform = "translate(" + tx + "px," + ty + "px)";
			})
		}


		// Public methods.
		dialoginner.close = __close_dialog;
		setTimeout(function () {
			__Focus_ActionElement(__Find_FirstDialogFocusable(dialoginner));
		}, 0);

		return dialoginner;
	}

	//dialog template https://htmlstream.com/preview/front-v2.9.4/documentation/libraries/modal-window.html#situation-options

	var $rte = {};
	window.$rte = $rte;

	$rte.object = function () { };
	$rte.object.prototype = {
		constructor: $rte.object,
		toString: function () { return "{object}"; },
		init: function () { },
		delegate: function (func) {
			var obj = this;
			return function () {
				return func.apply(obj, arguments);
			};
		}
	};
	$rte.object._extends = function (define) {
		var typector = function () { this.init.apply(this, arguments); }
		typector._extends = this._extends;
		var basetype = this.prototype;
		function protocls() { }
		protocls.prototype = basetype;
		var thistype = new protocls();
		thistype.constructor = typector;
		typector.prototype = thistype;
		typector.protobase = basetype;
		define.apply(thistype, [basetype, thistype]);
		return typector;
	};
	$rte.Base = $rte.object._extends(function (base, type) {

		var neid = 0;
		var tempdiv = document.createElement("DIV");
		tempdiv.setAttribute("contentEditable", "true");

		this.init = function () {
			this._eventmap = null;
			this._objectuid = ++neid;
			base.init.apply(this, arguments);

		}

		this.HtmlEncode = function (html) {
			html = String(html);
			html = html.replace(/&/g, "&amp;");
			html = html.replace(/</g, "&lt;");
			html = html.replace(/>/g, "&gt;");
			html = html.replace(/'/g, "&#39;");
			html = html.replace(/\x22/g, "&quot;");
			html = html.replace(/(\s)\s/g, "$1&nbsp;");
			return html;
		}

		this.HtmlDecode = function (html, pre) {
			if (!html) return "";
			html = html.replace(/\s+/g, ' ');
			tempdiv.style.whiteSpace = pre ? "pre" : "";
			tempdiv.innerHTML = html;
			var text = tempdiv.innerText || tempdiv.textContent || "";
			tempdiv.innerHTML = "";
			return text;
		}

		this.DetachEvent = function (name, handler) {
			if (!handler) {
				handler = name;
				name = "*"
			}
			else if (name == null) {
				name = "*"
			}

			if (!this._eventmap) return;
			var m = this._eventmap[name];
			if (!m) return;

			for (var i = 0; i < m.length; i++) {
				if (m[i].Handler == handler || m[i].UniqueID == handler) {
					m.splice(i, 1);
					return true;
				}
			}
			return false;
		}
		this.AttachEvent = function (name, handler) {
			if (!handler) {
				handler = name;
				name = "*"
			}
			else if (name == null) {
				name = "*"
			}

			if (!this._eventmap) this._eventmap = {}
			var m = this._eventmap[name];
			if (!m) m = this._eventmap[name] = [];

			for (var i = 0; i < m.length; i++) {
				if (m[i].Handler == handler)
					return m[i].UniqueID;
			}
			m.push({ Handler: handler, UniqueID: ++neid });
			return neid;
		}
		this.FireEvent = function (name, args, caller) {
			var e = { Object: this, Name: name, Arguments: args || [], Caller: caller, ReturnValue: null };

			var em = this._eventmap;
			if (!em) return e;
			var m1 = em[name];
			var m2 = em["*"];
			if (m1 && m1.length) {
				var newemap = m1;
				for (var i = 0; i < newemap.length; i++) {
					var f = newemap[i];
					e.UniqueID = f.UniqueID;
					e.Handler = f.Handler;
					f.Handler.call(this, this, e);
				}
			}
			if (m2 && m2.length) {
				var newemap = m2;
				for (var i = 0; i < newemap.length; i++) {
					var f = newemap[i];
					e.UniqueID = f.UniqueID;
					e.Handler = f.Handler;
					f.Handler.call(this, this, e);
				}
			}
			e.UniqueID = null;
			e.Handler = null;
			return e;
		}
	});
	$rte.Attribute = $rte.Base._extends(function (base, type) {
		this.init = function (name) {
			base.init.apply(this, arguments);
			this.__name = name;
			this.__namelower = name.toLowerCase();
			this.__value = "";
			this.__quote = '"';
			this.__html = "";
			this.__last = "value";
		}
		this._cloneNode = function (all) {
			var attr = new this.constructor(this.__name);
			attr.__value = this.__value;
			attr.__quote = this.__quote;
			attr.__html = this.__html;
			attr.__last = this.__last;
			return attr;
		}
		this.GetName = function () {
			return this.__name;
		}
		this.GetNameLower = function () {
			return this.__namelower;
		}
		this.GetValue = function () {
			return this.__value;
		}
		this.__setValue = function (val) {
			this.__value = String(val);
			this.__last = "value";
		}
		this.GetQuote = function () {
			return this.__quote;
		}
		this.__setQuote = function (val) {
			this.__quote = String(val);
			//this.__last="quote";
		}
		this.__setHTMLCode = function (val) {
			this.__html = val || "";
			this.__last = "html";
		}
		this.__getHTMLCode = function (option) {
			if (this.__last == "html")
				return this.__html;
			return this.__name + "=" + this.__quote + this.HtmlEncode(this.__value) + this.__quote;
		}

	});

	$rte.Node = $rte.Base._extends(function (base, type) {

		function __extrastylename(pair, start, pos) {
			return pair.substring(start, pos).split(' ').join('').toLowerCase();
		}

		this.init = function (name) {
			this.__name = name;
			this.__namelower = name.toLowerCase();
			this.__core = null;
			this.__parent = null;
			this.__viewnode = null;
			this.__attrs = [];
			this.__rattrs = null;
			this.nodeType = 0;
			base.init.apply(this, arguments);
		}

		this.__requireSpecialChars = function () {
		}
		this.__processSpecialChars = function () {
		}

		this.IsAttached = function () {
			return !!this.__core;
		}


		this.__checkNotEditable = function () {
			for (var p = this; p != null; p = p.__parent) {
				if (!p.__hascontenteditable)
					continue;
				var ce = p.__getAttribute("contenteditable");
				if (!ce)
					continue;
				ce = ce.toLowerCase();
				if (ce == "false") {
					return true;
				}
			}
		}

		this.__removeNode = function (all, askparentfixnbsp) {
			if (this.__parent == null)
				return false;
			this.__parent.__removeChild(this, askparentfixnbsp);
			return true;
		}
		this.__findPrev = function (siblingOnly) {
			if (this.__parent == null)
				return null;
			var pos = this.__parent.__indexOf(this);
			if (!siblingOnly && pos == 0)
				return this.__parent.__findPrev();
			return this.__parent.__nodes[pos - 1];
		}
		this.__findNext = function (siblingOnly) {
			if (this.__parent == null)
				return null;
			var pos = this.__parent.__indexOf(this);
			if (!siblingOnly && pos + 1 >= this.__parent.__nodes.length)
				return this.__parent.__findNext();
			return this.__parent.__nodes[pos + 1];
		}
		this.__findParent = function (tagname, n2) {
			tagname = tagname.toLowerCase();
			if (n2) n2 = n2.toLowerCase();
			for (var p = this.__parent; p != null; p = p.__parent) {
				if (p.__namelower == tagname || p.__namelower == n2)
					return p;
			}
		}
		this.__cloneAttributes = function () {
			var attrs = this.__attrs.concat();
			for (var i = 0; i < attrs.length; i++)
				attrs[i] = attrs[i]._cloneNode();
			return attrs;
		}
		this.__clearAttributes = function () {
			var attrs = this.__attrs;
			if (attrs.length == 0)
				return;
			var names = [];
			for (var i = 0; i < attrs.length; i++)
				names.push(attrs[i].__name);
			this.__attrs = [];
			for (var i = 0; i < names.length; i++)
				this.__updateAttributeToView(names[i]);
		}
		this.__cloneRuntimeAttributes = function () {
			if (this.__rattrs)
				return this.__rattrs.concat();
			return null;
		}

		this.__translateStyleValue = function (nlower, value) {
			switch (nlower) {
				case "cursor":
				case "behavior":
					return null;
			}
			if (this.__config && this.__config.TranslateStyleValue) {
				value = this.__config.TranslateStyleValue(nlower, value, this)
			}
			return value;
		}

		this.__updateAttributeToView = function (name, domnode) {

		}

		this.__setRuntimeAttribute = function (name, value, category, lowpriority) {
			if (!name) return;
			name = name.toLowerCase();
			if (this.__rattrs == null) this.__rattrs = [];
			for (var i = 0; i < this.__rattrs.length; i++) {
				var att = this.__rattrs[i];
				if (att.name == name && att.category == category) {
					if (value) {
						att.value = value;
						this.__updateAttributeToView(name);
						return;
					}
					this.__rattrs.splice(i, 1);
					this.__updateAttributeToView(name);
					return;
				}
			}
			if (!value) return;
			var att = { name: name, value: value, category: category, priority: lowpriority ? -1 : 1 }
			this.__rattrs.push(att);
			this.__updateAttributeToView(name);
		}

		this.__removeAttribute = function (name) {
			name = name.toLowerCase();
			for (var i = 0; i < this.__attrs.length; i++) {
				var attr = this.__attrs[i];
				if (attr.__namelower == name) {
					this.__attrs.splice(i, 1);
					this.__updateAttributeToView(name);
					return;
				}
			}
		}
		this.__setAttributeObject = function (attr) {
			this.__removeAttribute(attr.__name);
			this.__attrs.push(attr);
			this.__updateAttributeToView(attr.__name);
		}
		this.__getAttributeObject = function (name) {
			name = name.toLowerCase();
			for (var i = 0; i < this.__attrs.length; i++) {
				var attr = this.__attrs[i];
				if (attr.__namelower == name)
					return attr;
			}
			return null;
		}
		this.__getAttribute = function (name) {
			var attr = this.__getAttributeObject(name);
			if (attr == null)
				return null;
			return attr.GetValue();
		}
		this.__setAttribute = function (name, val) {
			if (val == null) {
				this.__removeAttribute(name);
				return;
			}
			var attr = this.__getAttributeObject(name);
			var oldval;
			if (attr == null) {
				attr = new $rte.Attribute(name);
				this.__attrs.push(attr);
			}
			else {
				oldval = attr.GetValue();
			}
			if (oldval == val)
				return;
			if (name == "style")
				val = val.replace(/(^\s+|\s+$)/g, "");
			attr.__setValue(val);
			this.__updateAttributeToView(name);
		}
		this.__getAttributeNames = function () {
			var arr = [];
			for (var i = 0; i < this.__attrs.length; i++)
				arr.push(this.__attrs[i].__name);
			return arr;
		}
		this.__getAttributeCode = function (option) {
			if (this.__attrs.length == 0)
				return "";
			var sb = [];
			for (var i = 0; i < this.__attrs.length; i++) {
				sb.push(" ");
				sb.push(this.__attrs[i].__getHTMLCode(option));
			}
			return sb.join("");
		}

		this.__importAttributes = function (node) {
			var arr = node.__attrs;
			var len = arr.length;
			for (var i = 0; i < len; i++)
				this.__setAttributeObject(arr[i]._cloneNode())
		}

		this.__removeStyle = function (name) {
			var str = this.__getAttribute("style");
			if (!str)
				return;
			name = name.toLowerCase();
			var removed = false;
			var pairs = str.split(';');
			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i];
				var pos = pair.indexOf(':');
				if (pos == -1) continue;
				if (name == __extrastylename(pair, 0, pos)) {
					pairs.splice(i, 1);
					removed = true;
					i--;
				}
			}
			if (removed) {
				if (pairs.length == 0)
					this.__removeAttribute("style");
				else
					this.__setAttribute("style", pairs.join(';'));
			}
		}
		this.__getStyle = function (name) {
			var str = this.__getAttribute("style");
			if (!str)
				return null;
			name = name.toLowerCase();
			var pairs = str.split(';');
			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i];
				var pos = pair.indexOf(':');
				if (pos == -1) continue;
				if (name == __extrastylename(pair, 0, pos))
					return pair.substring(pos + 1).replace(/(^\s+|\s+$)/g, "");
			}
		}
		this.__setStyle = function (name, value) {
			if (!value) {
				this.__removeStyle(name);
				return;
			}
			name = name.toLowerCase();
			var exp = name + ":" + value;
			var str = this.__getAttribute("style");
			if (!str) {
				this.__setAttribute("style", exp);
				return;
			}
			var changed = false;
			var pairs = str.split(';');
			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i];
				var pos = pair.indexOf(':');
				if (pos == -1) continue;
				if (name != __extrastylename(pair, 0, pos))
					continue;
				if (pairs[i] == exp)
					return;
				pairs[i] = exp
				changed = true;
				break;
			}
			if (!changed) {
				pairs.push(exp);
			}
			this.__setAttribute("style", pairs.join(';'));
		}
		this.__getHTMLCode = function (option) {
			var sb = [];
			this._writeHtml(sb, option);
			return sb.join("");
		}
		this._writeHtml = function (sb, option) {
			error_notimplemented();
		}
		this._writeText = function (sb, option) {
			error_notimplemented();
		}
		this.GetInnerText = function (option) {
			var sb = [];
			this._writeText(sb, option);
			return sb.join("");
		}

		this.__codeEquals = function (node) {
			if (this.__namelower != node.__namelower)
				return;
			if (this.__attrs.length != node.__attrs.length)
				return;
			for (var i = 0; i < this.__attrs.length; i++) {
				var a1 = this.__attrs[i];
				var a2 = node.__attrs[i];
				if (a1.__namelower != a2.__namelower)
					return;
				if (a1.__value != a2.__value)
					return;
			}
			return true;
		}

		this._createViewNode = function () {
			error_notimplemented();
		}
		this._cloneNode = function (all) {
			error_notimplemented();
		}

		this.__getMaxOffset = function () {
			if (this.nodeType == 3)
				return this.__text.length;
			if (this.__nodes)
				return this.__nodes.length;
			return 0;
		}
		this.GetMaxOffset = this.__getMaxOffset;
		this._translateOffset = function (dom, offset) {
			return offset;
		}
		this._getNodeOffset = function (offset) {
			return { node: this.__viewnode, offset: offset };
		}
		this._getOffsetPath = function (offset) {
			return String(offset);
		}

		this.__isList = function () {
			if (!this.__nodes)
				return false;
			if (this.__namelower == "ol")
				return true;
			if (this.__namelower == "ul")
				return true;
			return false;
		}
		this.__isBlock = function () {
			if (!this.__nodes)
				return false;

			switch (this.__namelower) {
				case "pre":
				case "p":
				case "div":
				case "h1":
				case "h2":
				case "h3":
				case "h4":
				case "h5":
				case "h6":
				case "li":
				case "ul":
				case "ol":
				case "dl":
				case "dt":
				case "dd":
				case "address":

				case "article":
				case "section":
				case "hgroup":
				case "header":
				case "footer":
				case "aside":

				case "table":
				case "tbody":
				case "thead":
				case "tfoot":
				case "tr":
				case "td":
				case "th":
				case "fieldset":
				case "legend":
				case "form":
				case "body":
					return true;
				default:
					if (this.__getStyle("position") == "absolute")
						return true;
			}

			return false;
		}

		this.__notSplitable = function () {
			switch (this.__namelower) {
				case "table":
				case "tbody":
				case "thead":
				case "tfoot":
				case "tr":
				case "td":
				case "th":
				case "blockquote":
				case "fieldset":
				case "legend":
				case "form":
				case "body":

				case "details":

				case "a":
					return true;
				case "div":
					// Box formatting.
					if (this.__getStyle("border") || this.__getStyle("border-width") || this.__getStyle("border-style"))
						return true;
					break;
				default:
					break;
			}

			if (this.__getStyle("position") == "absolute")
				return true;
		}
		this.__notDeletable = function () {
			switch (this.__namelower) {
				case "body":
				case "tbody":
				case "thead":
				case "tfoot":
				case "tr":
				case "td":
				case "th":
					return true;
			}
		}
		this.NotDeletable = this.__notDeletable;
		this.SupportPaste = function () {
			if (this.__notDeletable())
				return false;
			switch (this.__namelower) {
				case "li":
					return false;
			}
			return true;
		}
		this.CanRemoveTag = function () {
			switch (this.__namelower) {
				case "table":
				case "tbody":
				case "thead":
				case "tfoot":
				case "tr":
				case "td":
				case "th":
				case "ol":
				case "ul":
				case "li":
				case "object":
				case "embed":
				case "video":
				case "audio":
				case "select":
					return false;
			}
			if (this.__getStyle("position") == "absolute")
				return false;
			return true;
		}
		this.__notFormatable = function () {
			switch (this.__namelower) {
				case "br":
				case "hr":
				case "img":
				case "object":
				case "embed":
				case "video":
				case "audio":
				case "input":
				case "textarea":
				case "select":
				case "button":
					return true;
			}
		}
		this.IsContent = function () {
			return this.nodeType == 3 || this.IsControl();
		}
		this.IsControl = function () {
			switch (this.__namelower) {
				case "br": // Used by IsContent checks.
				case "hr":
				case "img":
				case "object":
				case "embed":
				case "video":
				case "audio":
				case "canvas":
				case "iframe":
				case "table":
				case "fieldset":

				case "input":
				case "button":
				case "select":
				case "textarea":
					return true;
			}
			//if(this.GetStyle("position")=="absolute")
			//	return true;
			return false;
		}

		this.GetName = function () {
			return this.__name;
		}
		this.GetNameLower = function () {
			return this.__namelower;
		}
		this.GetParent = function () {
			return this.__parent;
		}
		this.RemoveNode = function (all) {
			this.__removeNode(all);
		}
		this.GetHtmlTagName = function (option) {
			return this.__name;
		}
		this.GetViewNode = function () {
			return this.__viewnode;
		}
		this.GetHTMLCode = function () {
			return this.__getHTMLCode();
		}

		this.GetStyle = this.__getStyle;
		this.SetStyle = this.__setStyle;
		this.SetRuntimeAttribute = this.__setRuntimeAttribute;
		this.SetAttribute = this.__setAttribute;
		this.GetAttribute = this.__getAttribute;
		this.RemoveAttribute = this.__removeAttribute;
		this.SetAttributeObject = this.__setAttributeObject
		this.GetAttributeObject = this.__getAttributeObject
		this.GetAttributeCode = this.__getAttributeCode;

		this.Contains = function (node) {
			while (node) {
				if (node == this)
					return true;
				node = node.__parent;
			}
		}

		this.__getAlignMode = function () {
			var floa = this.__getStyle("float");
			if (floa)
				return floa;
			var disp = this.__getStyle("display");
			if (disp == "block")
				return "block";
			if (disp == "inline-block" || disp == "inline")
				return "none";
			if (this.__namelower == "img")
				return "none";
			return "block";
		}
		this.__setAlignMode = function (mode) {
			var floa = null;
			var disp = null;
			if (mode == "left" || mode == "right") {
				floa = mode;
			}
			else if (this.__namelower == "img") {
				if (mode == "block")
					disp = "block";
			}
			else {
				if (mode == "none")
					disp = "inline-block";
			}
			this.__setStyle("display", disp);
			this.__setStyle("float", floa);
		}

		this.GetAlignMode = this.__getAlignMode;
		this.SetAlignMode = this.__setAlignMode;

	});
	$rte.CommentNode = $rte.Node._extends(function (base, type) {
		this.init = function () {
			this.__html = "";
			base.init.apply(this, ["#comment"]);
		}
		this._writeHtml = function (sb, option) {
			sb.push(this.__html);
		}
		this._writeText = function (sb, option) {
		}

		this.__setHTMLCode = function (value) {
			this.__html = String(value);
		}
		this._createViewNode = function (doc) {
			var span = doc.createElement("COMMENT-NODE");
			span.setAttribute("title", this.__html);
			return span;
		}
		this._cloneNode = function (all) {
			var node = new this.constructor();
			node.__html = this.__html;
			return node;
		}
	});
	$rte.OtherNode = $rte.Node._extends(function (base, type) {
		this.init = function () {
			this.__html = "";
			base.init.apply(this, ["#ignore"]);
		}
		this._writeHtml = function (sb, option) {
			sb.push(this.__html);
		}
		this._writeText = function (sb, option) {
		}
		this.__setHTMLCode = function (value) {
			this.__html = String(value);
		}
		this._createViewNode = function (doc) {
			var span = doc.createElement("SPAN");
			span.setAttribute("title", this.__html);
			return span;
		}
		this._cloneNode = function (all) {
			var node = new this.constructor();
			node.__html = this.__html;
			return node;
		}
	});
	$rte.TextNode = $rte.Node._extends(function (base, type) {

		function ParseTextToHtml(html) {
			html = String(html);
			html = html.replace(/&/g, "&amp;");
			html = html.replace(/</g, "&lt;");
			html = html.replace(/>/g, "&gt;");
			html = html.replace(/'/g, "&#39;");
			html = html.replace(/\x22/g, "&quot;");
			html = html.replace(/\xA0/g, "&nbsp;");
			html = html.replace(/(\s)\s/g, "$1&nbsp;");
			return html;
		}

		// Text-node handling.

		function ParseHtmlToText(code, pre) {
			if (!code) return "";
			if (code.indexOf('>') != -1 || code.indexOf('<') != -1)
				return code;
			return __HtmlDecode(code, pre);
		}

		this.init = function () {
			this.__text = "";
			this.__html = "";
			this.__last = "text";
			base.init.apply(this, ["#text"]);
			this.nodeType = 3;
		}


		var specialchars = /[\u00A0-\u00FF\u0192\u0391-\u03D6\u2002-\u2666]/g;

		this.__requireSpecialChars = function () {
			if (this.__last != "html")
				return false;
			if (specialchars.test(this.__html))
				return true;
			return false;
		}
		this.__processSpecialChars = function () {
			if (this.__last != "html")
				return;
			this.__html = this.__html.replace(specialchars, function (a, b, c) {
				return "&#" + a.charCodeAt(0) + ";";
			});
		}

		this._writeHtml = function (sb, option) {
			var html;
			if (this.__last == "html")
				html = this.__html;
			else
				html = ParseTextToHtml(this.__text);
			sb.push(html);
		}
		this._writeText = function (sb, option) {
			sb.push(this.__text);
		}

		this.__setHTMLCode = function (value, stopsync) {
			this.__html = value || "";
			this.__last = "html";
			this.__text = ParseHtmlToText(this.__html, this.__premode);
		}
		this.__setText = function (value, stopsync) {
			this.__text = String(value);
			this.__last = "text";
		}
		this.__getViewHtml = function () {
			var html = this.__getHTMLCode();
			html = html.replace(/\s$/, '&nbsp;');
			return html;
		}

		this.__setFrontBlank = function () {
		}
		this._translateOffset = function (dom, offset) {
			if (dom == this.__viewnode)
				return offset == 1 ? this.__text.length : 0;
			return offset;
		}
		this._getNodeOffset = function (offset) {
			return { node: this.__viewnode.firstChild, offset: offset };
		}
		this._getOffsetPath = function (offset) {
			return String(offset);
		}


		this.__equalsHTMLCode = function (h) {
			return this.__viewhtml == h;
		}


		this._cloneNode = function (all) {
			var node = new this.constructor();
			node.__html = this.__html;
			node.__text = this.__text;
			node.__last = this.__last;
			return node;
		}

		this.GetText = function () {
			return this.__text;
		}
		this.SetText = function (value, stopsync) {
			this.__setText(value, stopsync);
		}
		this.__sethasvalue = function () {
			this.__hasvalue = true;
			if (this.__viewnode) this.__viewnode.style.cssText = '';
		}
	});

	$rte.Element = $rte.Node._extends(function (base, type) {
		this.init = function (name) {
			base.init.apply(this, arguments);
			this.nodeType = 1;
			this.__innerblank = "";
			this.__endblank = "";
			this.__innerhtml = "";
		}
		this.__appendBlankCode = function (c, inner) {
			if (inner)
				this.__innerblank = this.__innerblank + c;
			else
				this.__endblank = this.__endblank + c;
		}

		this.__setInnerHtml = function (value) {
			this.__innerhtml = value;
		}
		this.__writeInnerHtml = function (sb, option) {
			if (this.__innerhtml)
				sb.push(this.__innerhtml);
		}
		this.__hasInnerHtml = function () {
			return !!this.__innerhtml;
		}
		this.__getInnerHtml = function (option) {
			var sb = [];
			this.__writeInnerHtml(sb, option);
			return sb.join("");
		}
		this.__canCloseTag = function () {
			switch (this.__namelower) {
				case "script":
				case "style":
				case "textarea":
				case "iframe":
				case "a":
					return false;
			}
			if (this.__isBlock())
				return false;
			return true;
		}
		this._writeHtml = function (sb, option) {
			if (this._stopOutput) {
				this.__writeInnerHtml(sb, option);
				return;
			}
			sb.push("<");
			sb.push(this.GetHtmlTagName(option));
			sb.push(this.__getAttributeCode(option));

			if (!this.__hasInnerHtml() && !this.__opened && this.__canCloseTag()) {
				sb.push(" />");
				sb.push(this.__innerblank);
				sb.push(this.__endblank);
				return sb.join("");
			}
			sb.push(">");
			sb.push(this.__innerblank);
			this.__writeInnerHtml(sb, option);
			sb.push("</" + this.GetHtmlTagName(option) + ">");
			sb.push(this.__endblank);
		}
		this._writeText = function (sb, option) {
			if (this.__namelower == "br" || this.__namelower == "hr")
				sb.push("\r\n");
		}

		this._cloneNode = function (all) {
			var node = new this.constructor(this.GetHtmlTagName());
			node._mergeNode(this);
			return node;
		}
		this._mergeNode = function (node) {
			this.__attrs = node.__cloneAttributes();
			this.__rattrs = node.__cloneRuntimeAttributes();
			this.__innerhtml = node.__innerhtml;
			this.__innerblank = node.__innerblank;
			this.__endblank = node.__endblank;
		}
		this._createViewNode = function (doc) {
			return doc.createElement(this.__name);
		}

		this.__reloadContentView = function () {

		}
	});
	$rte.GenericElement = $rte.Element._extends(function (base, type) {
		// Void or special tags such as br, hr, pre, textarea, meta, link, style, and script.
		this.init = function (name) {
			base.init.apply(this, arguments);
		}

		this._createViewNode = function (doc) {
			if (this.__namelower == "script") {
				return doc.createElement("span");
			}
			var node = doc.createElement(this.__name);
			if (this.__innerhtml && this.__namelower == "textarea")
				node.innerHTML = this.__innerhtml;
			return node;
		}
		this._writeText = function (sb, option) {
			if (this.__innerhtml) sb.push(__HtmlDecode(this.__innerhtml));
			base._writeText.apply(this, arguments);
		}
		this.SetInnerText = function (value) {
			value = this.HtmlEncode(value || "");
			this.__innerhtml = value;
			if (this.__viewnode) this.__viewnode.innerHTML = value.replace(/\s$/, '&nbsp;');

		}
	});

	$rte.ContainerElement = $rte.Element._extends(function (base, type) {
		this.init = function (name) {
			base.init.apply(this, arguments);
			this.__nodes = [];
		}


		this._createViewNode = function (doc) {
			var tagname = this.__namelower;
			switch (tagname) {
				case "html":
				case "head":
				case "body":
					tagname = "div";
					break;
			}
			return doc.createElement(tagname);
		}
		this.__removeViewNode = function (vn) {
			try { this.__viewnode.removeChild(vn); } catch (x) { }
		}
		this.__insertViewNode = function (left, right) {
			if (right)
				this.__viewnode.insertBefore(left, right);
			else
				this.__viewnode.appendChild(left);
		}
		this.__appendChild = function (obj) {
			obj.__removeNode(true);
			obj.__parent = this;
			this.__nodes.push(obj);
		}
		this.__insertBefore = function (left, right) {
			left.__removeNode(true);
			for (var i = 0; i < this.__nodes.length; i++) {
				if (this.__nodes[i] == right) {
					left.__parent = this;
					this.__nodes.splice(i, 0, left);
					return;
				}
			}
		}
		this.__insertAfter = function (right, left) {
			right.__removeNode(true);
			var pos = this.__indexOf(left);
			if (pos == -1)
				this.__appendChild(right);
			else
				this.__insertAt(right, pos + 1);
		}
		this.__insertAt = function (left, pos) {
			left.__removeNode(true);
			var right = this.__nodes[pos];
			if (right)
				this.__insertBefore(left, right);
			else
				this.__appendChild(left);
		}
		this.__clearChildren = function () {
			var ns = this.__nodes;
			if (!ns.length) return;
			this.__nodes = [];
			for (var i = 0; i < ns.length; i++) {
				var node = ns[i];
				node.__parent = null;
			}
		}
		this.__removeComments = function () {
			var ns = this.__nodes;
			if (!ns.length) return;
			for (var i = 0; i < ns.length; i++) {
				var node = ns[i];
				if (node.nodeType != 0)
					continue;
				ns.splice(i, 1);
				node.__parent = null;
			}
		}
		this.__removeChild = function (node, fixnbsp) {
			var ns = this.__nodes;
			for (var i = 0; i < ns.length; i++) {
				if (ns[i] != node)
					continue;
				ns.splice(i, 1);
				node.__parent = null;
				if (fixnbsp) {
					this.__fixNBSP();
				}
				return true;
			}
		}
		this.__fixNBSP = function () {
			if (this.__nodes.length)
				return;
			switch (this.__namelower) {
				case "pre":
				case "p":
				case "div":
				case "h1":
				case "h2":
				case "h3":
				case "h4":
				case "h5":
				case "h6":
				case "li":
				case "td":
				case "th":
					var text = new $rte.TextNode();
					text.__setHTMLCode("&nbsp;");
					this.__appendChild(text);
					break;
			}
		}
		this.IndexOf = this.__indexOf = function (node) {
			var ns = this.__nodes;
			for (var i = 0; i < ns.length; i++) {
				if (ns[i] == node)
					return i;
			}
			return -1;
		}

		this.__removeNode = function (all, askparentfixnbsp) {
			if (this.__parent == null)
				return false;
			if (!all) {
				while (this.__nodes.length) {
					this.__parent.__insertBefore(this.__nodes[0], this);
				}
			}
			this.__parent.__removeChild(this, askparentfixnbsp);
			return true;
		}
		this.__hasInnerHtml = function () {
			if (this.__nodes.length)
				return true;
			if (this.__renderbody)
				return true;
		}
		this.__writeInnerHtml = function (sb, option) {
			if (this.__renderbody) {
				sb.push("\r\n        ");
				sb.push(this.__renderbody.__getInnerHtml());
				sb.push("\r\n    ");
			}
			else {
				for (var i = 0; i < this.__nodes.length; i++)
					sb.push(this.__nodes[i].__getHTMLCode());
			}
		}

		this._addParsedObject = function (obj) {
			this.__appendChild(obj);
		}
		this.__cloneNodes = function () {
			var nodes = [];
			for (var i = 0; i < this.__nodes.length; i++)
				nodes.push(this.__nodes[i]._cloneNode(true));
			return nodes;
		}
		this._cloneNode = function (all) {
			var node = base._cloneNode.apply(this, arguments);
			if (all) {
				for (var i = 0; i < this.__nodes.length; i++)
					node.__appendChild(this.__nodes[i]._cloneNode(all));
			}
			return node;
		}


		this.AppendChild = function (child) {
			this.__appendChild(child);
		}
		this.InsertAt = function (child, index) {
			return this.__insertAt(child, index);
		}
		this.InsertBefore = function (child, node) {
			return this.__insertBefore(child, node);
		}
		this.InsertAfter = function (child, node) {
			return this.__insertAfter(child, node);
		}
		this.GetChildAt = function (pos) {
			var ns = this.__nodes;
			if (!ns) return;
			return ns[pos];
		}
		this.GetChildCount = function () {
			var ns = this.__nodes;
			if (!ns) return 0;
			return ns.length;
		}

		this._writeText = function (sb, option) {
			for (var i = 0; i < this.__nodes.length; i++)
				this.__nodes[i]._writeText(sb, option);
		}

		this.SetInnerText = function (value) {
			this.__clearChildren();
			var tn = new $rte.TextNode();
			if (value) {
				tn.__setText(value);
				this.__appendChild(tn);
			}
		}

	});

	$rte.LinkElement = $rte.ContainerElement._extends(function (base, type) {
		this.IsControl = function () {
			var ns = this.__nodes;
			if (ns && ns.length)
				return false;
			return true;
		}
	});
	$rte.TableElement = $rte.ContainerElement._extends(function (base, type) {
		this.init = function (name) {
			base.init.apply(this, arguments);
			this.__istableelement = true;
			if (this.__namelower == "td" || this.__namelower == "th")
				this.IsTableCell = true;
		}

		this.__getHTMLCode = function (option) {
			if (this.__onlyrenderchildren)
				return this.__getInnerHtml(option);
			return base.__getHTMLCode.apply(this, arguments);
		}


	});
	$rte.ObjectElement = $rte.ContainerElement._extends(function (base, type) {
		this.init = function (name) {
			base.init.apply(this, arguments);

			this.__setRuntimeAttribute("style", "display:inline-block;overflow:hidden;border-width:1px;border-style:dashed;border-color:gray;background-color:#eeeeee;padding:4px;vertical-align:top", "objectviewstyle", true);

			if (this.__namelower == "audio")
				this.__setRuntimeAttribute("style", "width:180px;height:40px;", "objectviewsize", true);
			else if (this.__namelower == "video")
				this.__setRuntimeAttribute("style", "width:300px;height:150px;", "objectviewsize", true);
			else
				this.__setRuntimeAttribute("style", "width:320px;height:240px;", "objectviewsize", true);

		}

	});
	$rte.DataElement = $rte.ContainerElement._extends(function (base, type) {
		this._createViewNode = function (doc) {
			if (this.__namelower == "option")
				return doc.createElement("OPTION");
			var span = doc.createElement("SPAN");
			span.style.display = 'none';
			return span;
		}
	});


	function __fixHTML(html) {

		var core = {}

		html = String(html).replace(/^\s+/, '');

		var hcfhf = config.htmlcode_forcehexformat;

		var roots = [];
		var node = null;
		var htmllower = html.toLowerCase();

		var filterFunc = null;
		if (config.tagWhiteList && config.tagWhiteList.length) {
			filterFunc = function (newnode, namelower) {
				if (config.tagWhiteList.indexOf(namelower) == -1)
					return false;
				return true;
			}
		}
		else if (config.tagBlackList && config.tagBlackList.length) {
			filterFunc = function (newnode, namelower) {
				if (config.tagBlackList.indexOf(namelower) == -1)
					return true;
				return false;
			}
		}

		function AppendNode(newnode, into) {
			var nnn = newnode.__namelower;

			switch (nnn) {
				case "script":
					if (!config.allowScriptCode) {
						newnode._stopOutput = true;
					}
					break;
			}
			if (filterFunc) {
				if (!filterFunc(newnode, nnn)) {
					newnode._stopOutput = true;
				}
			}



			if (nnn == "li") {
				while (node) {
					var nn = node.__namelower;
					if (nn == "ul" || nn == "ol")
						break;
					node = node.__parent;
					if (nn == "li")
						break;
				}
			}

			if (nnn == "td" || nnn == "th") {
				while (node) {
					var nn = node.__namelower;
					if (nn == "tr" || nn == "table" || nn == "tbody" || nn == "thead" || nn == "tfoot")
						break;
					node = node.__parent;
					if (nn == "td")
						break;
				}
			}

			if (nnn == "tr") {
				while (node) {
					var nn = node.__namelower;
					if (nn == "table" || nn == "tbody" || nn == "thead" || nn == "tfoot")
						break;
					node = node.__parent;
					if (nn == "tr")
						break;
				}
			}

			if (node)
				node._addParsedObject(newnode);
			else
				roots.push(newnode);
			if (into)
				node = newnode;
		}
		function ParseAttributeValue(code) {
			if (!code)
				return "";
			if (code.indexOf('>') != -1 || code.indexOf('<') != -1)
				return code;
			return __HtmlDecode(code);
		}

		// Text-node handling.

		function ParseCodeText(code) {
			if (code.length == 0) return;

			var tn = new $rte.TextNode();
			if (node && node.__getStyle("white-space") == "pre")
				tn.__premode = true;
			tn.__setHTMLCode(code);
			AppendNode(tn);
		}
		function ParseComment(code) {
			var tn = new $rte.CommentNode();
			tn.__setHTMLCode(code);
			AppendNode(tn);
		}
		function ParseOther(code) {
			var tn = new $rte.OtherNode();
			tn.__setHTMLCode(code);
			AppendNode(tn);
		}

		function ParseNodeName(code, index) {
			var p = index;
			for (; p < code.length; p++) {
				var c = code.charCodeAt(p);
				if (c >= 65 && c <= 90) continue;	// A-Z
				if (c >= 97 && c <= 122) continue;	// a-z
				if (c >= 48 && c <= 57) continue;	// 0-9
				if (c == 58) continue;			// Colon.
				switch (code.charAt(p)) {
					case ':':
					case '-':
					case '_':
					case '!':
						continue;
				}
				break;
			}
			return code.substring(index, p);
		}
		function IsBlankCharCode(c) {
			if (c == 32) return true;
			if (c == 9) return true;
			if (c == 10) return true;
			if (c == 13) return true;
			if (c == 160) return true;
			return false;
		}
		function IsDangerousUrlAttribute(attrname, attrvalue) {
			if (config.allowScriptCode)
				return false;

			switch (attrname) {
				case "href":
				case "src":
				case "xlink:href":
				case "action":
				case "formaction":
				case "poster":
				case "background":
					break;
				default:
					return false;
			}

			var normalized = String(attrvalue || "").replace(/[\u0000-\u0020]+/g, "").toLowerCase();
			if (!normalized)
				return false;
			if (normalized.indexOf("javascript:") == 0 || normalized.indexOf("vbscript:") == 0)
				return true;
			if (normalized.indexOf("data:") == 0 && normalized.indexOf("data:image/") != 0)
				return true;
			return false;
		}
		function TryAppendAttribute(attrs, attrname, attrvalue, htmlcode, quote) {
			var attrlower = attrname.toLowerCase();
			if (!config.allowScriptCode && attrlower.charAt(0) == 'o' && attrlower.charAt(1) == 'n')
				return;
			if (IsDangerousUrlAttribute(attrlower, attrvalue))
				return;

			var attr = new $rte.Attribute(attrname);
			if (quote !== undefined)
				attr.__setQuote(quote);
			if (attrvalue !== undefined)
				attr.__setValue(attrvalue);
			attr.__setHTMLCode(htmlcode);
			attrs.push(attr);
		}
		function ParseAttributes(code, tagname) {
			var attrs = [];

			var index = 1 + tagname.length;
			if (code.charCodeAt(code.length - 2) == 47)
				code = code.substr(0, code.length - 2);
			else
				code = code.substr(0, code.length - 1);

			var oldindex = -1;
			while (index < code.length) {
				if (oldindex == index) throw (new Error("loop at index:" + index));
				oldindex = index;

				var attrname = ParseNodeName(code, index);
				if (!attrname) {
					var c = code.charCodeAt(index);
					if (!IsBlankCharCode(c)) {
						// Error: encountered an unknown character.
					}
					index++;
					continue;
				}

				// Save the start index of the name token.
				var nameindex = index;
				index = index + attrname.length;

				// Skip whitespace after the attribute name.
				while (index < code.length && IsBlankCharCode(code.charCodeAt(index)))
					index++;

				if (index >= code.length) {
					TryAppendAttribute(attrs, attrname, undefined, code.substring(nameindex));
					return attrs;
				}

				var c = code.charAt(index);
				if (c != "=") {
					TryAppendAttribute(attrs, attrname, undefined, code.substring(nameindex, index));
					continue;
				}

				index++;

				while (index < code.length && IsBlankCharCode(code.charCodeAt(index)))
					index++;

				if (index >= code.length) {
					// Attribute without an explicit value.
					TryAppendAttribute(attrs, attrname, undefined, code.substring(nameindex, index));
					return attrs;
				}

				var c = code.charAt(index);
				if (c == '"' || c == "'") {
					var pos = code.indexOf(c, index + 1);
					if (pos == -1) {
						var attrvalue = ParseAttributeValue(code.substring(index + 1));
						TryAppendAttribute(attrs, attrname, attrvalue, code.substring(nameindex), c);
						return attrs;
					}

					var attrvalue = ParseAttributeValue(code.substring(index + 1, pos));
					TryAppendAttribute(attrs, attrname, attrvalue, code.substring(nameindex, pos + 1), c);
					index = pos + 1;
					continue;
				}

				var valindex = index;

				while (index < code.length && !IsBlankCharCode(code.charCodeAt(index)))
					index++;

				var attrvalue = ParseAttributeValue(code.substring(valindex, index));
				TryAppendAttribute(attrs, attrname, attrvalue, code.substring(nameindex, index), "");

			}

			if (hcfhf && attrs.length) {
				for (var i = 0; i < attrs.length; i++) {
					var attr = attrs[i];
					if (attr.__namelower != "style")
						continue;

					var val = attr.__value;
					if (!val || val.indexOf("rgb") == -1)
						continue;

					var newval = val;
					val = val.replace(dec_pattern, function (str, p1, p2, p3) {
						return ("#" + RGBtoHex(p1, p2, p3)).toLowerCase();
					});
					if (newval != val) {
						attr.__setValue(val);
					}
				}
			}

			return attrs;
		}

		var dec_pattern = /\s*rgb\((\d{1,3})[,]\s*(\d{1,3})[,]\s*(\d{1,3})\)/gi;
		function RGBtoHex(r, g, b) {
			return Math.floor(16777216 + parseInt(r) * 65536 + parseInt(g) * 256 + parseInt(b)).toString(16).substr(1, 6);
		}


		function ParseBeginTag(code, tagname) {
			var ln = tagname.toLowerCase();
			var attrs = ParseAttributes(code, tagname);
			switch (ln) {
				case "base":
				case "col":
				case "link":
				case "meta":
				case "param":
				case "source":
				case "command":
				case "keygen":
				case "area":
					//case "option":
					var newnode = new $rte.DataElement(tagname);
					for (var i = 0; i < attrs.length; i++)
						newnode.__setAttributeObject(attrs[i]);
					AppendNode(newnode);
					return newnode;
				case "map":
					var newnode = new $rte.ContainerElement(tagname);
					for (var i = 0; i < attrs.length; i++)
						newnode.__setAttributeObject(attrs[i]);
					if (code.charCodeAt(code.length - 2) == 47)	// Ends with '/'.
						AppendNode(newnode, false);
					else
						AppendNode(newnode, true);
					return newnode;
				case "wbr":
				case "br":
				case "hr":
				case "img":
				case "input":
					var newnode = new $rte.GenericElement(tagname);
					for (var i = 0; i < attrs.length; i++)
						newnode.__setAttributeObject(attrs[i]);
					AppendNode(newnode);
					return newnode;
				case "textarea":
				case "style":
				case "script":
					var newnode = new $rte.GenericElement(tagname);
					for (var i = 0; i < attrs.length; i++)
						newnode.__setAttributeObject(attrs[i]);
					AppendNode(newnode, false);
					return newnode;
				default:
					var newnode;
					if (config.CreateTagObject) {
						newnode = config.CreateTagObject(tagname, attrs, core);
					}
					if (!newnode) {
						switch (ln) {
							case "option":
								newnode = new $rte.DataElement(tagname);
								break;
							case "object":
							case "embed":
							case "video":
							case "audio":
							case "iframe":
								newnode = new $rte.ObjectElement(tagname);
								break;
							//case "noframes":
							//case "noscript":
							//case "bgsound":
							//	break;
							case "table":
							case "tbody":
							case "thead":
							case "tfoot":
							case "tr":
							case "td":
							case "th":
								newnode = new $rte.TableElement(tagname);
								break;
							case "a":
								newnode = new $rte.LinkElement("a");
								break;
							default:
								newnode = new $rte.ContainerElement(tagname);
								break;
						}
						for (var i = 0; i < attrs.length; i++)
							newnode.__setAttributeObject(attrs[i]);
					}
					if (code.charCodeAt(code.length - 2) == 47)	// Ends with '/'.
						AppendNode(newnode, false);
					else
						AppendNode(newnode, true);
					return newnode;
			}
		}
		function ParseEndTag(code, tagname) {
			var ln = tagname.toLowerCase();
			if (node == null) {
				//alert("ParseEndTag-1-"+tagname);
				return;	// Error: no matching start tag was found.
			}
			for (var n = node; n; n = n.__parent) {
				if (n.__namelower == ln) {
					node = n.__parent;
					//alert("exit.."+n.__name+":"+(node==null?"null":node.__name));
					n.__opened = true;
					return n;
				}
			}
			//alert("ParseEndTag-2-"+tagname+":"+node.__name);
			// Error: no matching start tag was found, so reset to the root.
			note = null;
			return null;
		}
		function ParseTag(code) {
			if (tagbegin = code.charAt(1) != "/") {
				var tagname = ParseNodeName(code, 1);
				if (tagname == "") {
					ParseComment(code);
					//alert("? "+code);
					return;	// Error: no tag name; ignore this fragment.
				}
				return { Begin: ParseBeginTag(code, tagname) };
			}
			else {
				var tagname = ParseNodeName(code, 2);
				if (tagname == "") {
					ParseComment(code);
					//alert("? "+code);
					return;	// Error: no tag name; ignore this fragment.
				}
				return { End: ParseEndTag(code, tagname) };
			}
		}

		function DoParse() {
			var pos1 = 0;
			var oldpos1 = -1;
			while (pos1 < html.length) {
				if (oldpos1 == pos1) throw (new Error("loop at pos:" + pos1));
				oldpos1 = pos1;

				var pos2 = html.indexOf('<', pos1);
				if (pos2 == -1) {
					ParseCodeText(html.substring(pos1).replace(/\s+$/, ''));
					break;
				}

				ParseCodeText(html.substring(pos1, pos2));
				pos1 = pos2;

				// Error: the last character is '<', so ignore it.
				if (pos1 + 1 == html.length)
					break;

				var nc = html.charAt(pos1 + 1);

				if (nc == '?' && html.substr(pos1 + 1, 4) == "?xml") {
					pos2 = html.indexOf('>', pos1);
					if (pos2 == -1) {
						ParseOther(html.substring(pos1) + ">");
						break;
					}
					ParseOther(html.substring(pos1, pos2 + 1));
					pos1 = pos2 + 1;
					continue;
				}

				if (nc == '%')	// ASP code block.
				{
					pos2 = html.indexOf(nc + '>', pos1);
					if (pos2 == -1) {
						ParseOther(html.substring(pos1) + nc + ">");
						break;
					}
					ParseOther(html.substring(pos1, pos2 + 2));
					pos1 = pos2 + 2;
					continue;
				}

				if (nc == '!') {
					if (html.substr(pos1, 4) == "<!--") {
						pos2 = html.indexOf("-->", pos1);
						if (pos2 == -1) {
							ParseComment(html.substring(pos1) + "-->");
							break;
						}
						ParseComment(html.substring(pos1, pos2 + 3));
						pos1 = pos2 + 3;
					}
					else	// <!DOCTYPE or another <! ... > declaration.
					{
						pos2 = html.indexOf('>', pos1);
						if (pos2 == -1) {
							ParseOther(html.substring(pos1) + ">");
							break;
						}
						ParseOther(html.substring(pos1, pos2 + 1));
						pos1 = pos2 + 1;
					}
					continue;
				}

				if (nc != "/") {
					var ncc = nc.charCodeAt(0);
					if (ncc < 65 || ncc > 122 || (ncc > 90 && ncc < 97)) {
						ParseCodeText(html.substring(pos1, pos1 + 1));
						pos1++;
						continue;
					}
				}

				// Support markup such as <img src='<%# Eval("Url") %>' /> by scanning quoted values.
				var quotestart = pos1;
				for (pos2 = html.indexOf('>', pos1); pos2 > -1; pos2 = html.indexOf('>', quotestart)) {
					var quotepos = html.indexOf('"', quotestart);
					var quotepos2 = html.indexOf("'", quotestart);
					if (quotepos2 > -1 && quotepos2 < quotepos)
						quotepos = quotepos2
					if (quotepos > -1 && quotepos < pos2) {
						quotepos = html.indexOf(html.charAt(quotepos), quotepos + 1);
						if (quotepos > -1) {
							quotestart = quotepos + 1;
							continue;
						}
					}
					break;
				}

				if (pos2 == -1) {
					ParseCodeText(html.substring(pos1));
					break;
				}

				var tagcode = html.substring(pos1, pos2 + 1);
				var taginfo = ParseTag(tagcode);
				pos1 = pos2 + 1;

				if (!taginfo)
					continue;

				var nodeln = null;
				if (taginfo.Begin)
					nodeln = taginfo.Begin.__namelower;

				if (nodeln == "script" || nodeln == "style" || nodeln == "textarea") {

					pos2 = htmllower.indexOf("</" + nodeln, pos1);
					if (pos2 == -1) {
						if (taginfo.Begin)
							taginfo.Begin.__setInnerHtml(html.substring(pos1));
						break;
					}

					if (taginfo.Begin)
						taginfo.Begin.__setInnerHtml(html.substring(pos1, pos2));
					// TODO: Add the missing else branch if needed.

					pos1 = htmllower.indexOf(">", pos2) + 1;
					continue;
				}

				var tag = taginfo.Begin || taginfo.End;

				// Text-node handling.

				// Skip trailing whitespace and attach it to the opening tag.
				if (tag && IsNotFormatTag(tag)) {
					var posnext = html.indexOf('<', pos1);
					if (posnext != -1) {
						var bc = html.substring(pos1, posnext);
						if (bc.match(/^\s+$/g)) {
							if (taginfo.Begin && tag.__getStyle("white-space") == "pre") {
								// Append the content as a text node.
							}
							else {
								pos1 = posnext;
								tag.__appendBlankCode(bc, taginfo.Begin);
							}
						}
					}
				}

			} // while (pos1 < html.length)

		}

		function IsNotFormatTag(tag) {
			if (tag.__istableelement)
				return true;
			if (tag.__isBlock())
				return true;
			return false;
		}

		try {
			DoParse();
		}
		catch (x) {
			var div = document.createElement("div");
			div.innerHTML = html;
			html = div.innerHTML;
			DoParse();
		}

		var strs = [];
		for (var i = 0; i < roots.length; i++) {
			strs.push(roots[i].__getHTMLCode());
		}

		return strs.join("");
	}




	if (containerInput) {
		__SetHTMLCode(containerInput.value);
		containerInput.onchange = function () {
			__SetHTMLCode(containerInput.value);
		}
	}
	else if (containerHTML) {
		__SetHTMLCode(containerHTML);
		containerHTML = null;
	}

	// Keep only the first currentbookmark entry.
	___CurrentBookmark_Init();

	__ApplyToolbarForWidth();

	window.addEventListener("resize", __ApplyToolbarForWidth);

	__On_Selection_Change();

	(function () {
		for (var i = 0; i < __plugins.length; i++) {
			var p = __plugins[i];
			if (p.LoadEditor) p.LoadEditor(editor);
		}
	})();



	if (config.focusOnLoad)
		__Focus_Editor_Ensure();


	if (config.toggleBorder)
		__Exec_Cmd_Core("toggleborder");
	if (config.readOnly)
		editor.setReadOnly(true);

	if (config.contentCssText) {
		__SetCssText("content", "config", config.contentCssText)
	}
	if (config.previewCssText) {
		__SetCssText("preview", "config", config.previewCssText)
	}

	__ClearHistory();



	var __licsetreadonly = editor.setReadOnly;
	var __licconsolewarn = function (msg) {
		eval("console.warn(" + JSON.stringify(msg) + ")");
	}


	var licisOK = false;
	function ReportLicenseOK() {
		licisOK = true;

		powerby.remove();
	}

	var powerbyhtml = powerby.outerHTML;
	var powerbypnode = powerby.parentNode;
	function IsPoweredByVisible() {
		if (powerbyhtml != powerby.outerHTML || powerbypnode != powerby.parentNode)
			return false;

		var pstyle = window.getComputedStyle(powerbypnode);
		var r1 = container.getBoundingClientRect();

		function IsElementOK(element) {
			var r2 = powerby.getBoundingClientRect();

			if (r1.width < 100 || r1.height < 100) // Editor is hidden or too small to measure reliably.
				return true;

			if (r2.height < 18 || r2.width < 80 || r2.top < r1.top || r2.left < r1.left || r2.right > r1.right || r2.bottom > r1.bottom) {
				debuglog(r1, r2);
				return false;
			}

			var style = window.getComputedStyle(element); // getComputedStyle may be intercepted by the host page.

			if (style.display == "none")	// May be inherited from a parent node.
				return false;

			if (style.visibility != "visible" && style.visibility != pstyle.visibility)	// May be inherited from a parent node.
				return false;

			if (style.opacity != "1" && style.opacity != pstyle.opacity)	// May be inherited from a parent node.
				return false;

			return true;
		}

		if (!IsElementOK(powerby))
			return false;

		var cs = powerby.querySelector("*");
		for (var i = 0; i < cs.length; i++)
			if (!IsElementOK(cs[i]))
				return false;

		return true;
	}
	function CheckPoweredByButton() {
		// Note: this legacy behavior intentionally does not prevent users from hiding the powered-by link.
		//if (IsPoweredByVisible())
		//	return;
		//__licsetreadonly();
	}

	setTimeout(function () {
		if (licisOK)
			return;

		setInterval(CheckPoweredByButton, 1000);

	}, 100)

	// Licensed code is injected here.

// ===== Comments-only review mode (v2.2.2) =====
// Scoped inside an IIFE so module-level identifiers don't leak into the
// global namespace or collide with the editor closure's internal vars
// (esp. _isreadonly). The block is parse-only — never invoked at load.
function __RTE_CommentsOnlyAndShortcuts_Scope() {
var _iscommentsonly = false;
var _isreadonly = false;
function __IsEditingLocked() {
	return !!_isreadonly || !!_iscommentsonly;
}
function getCommentsOnly() { return !!_iscommentsonly; }
function setCommentsOnly(commentsOnly) {
	_iscommentsonly = !!commentsOnly;
	try {
		if (typeof RTE_DefaultConfig !== "undefined") {
			RTE_DefaultConfig.commentsOnly = _iscommentsonly;
		}
	} catch (e) { /* ignore */ }
	return _iscommentsonly;
}
function __IsCommandAllowedInCommentsOnly(cmd) {
	switch ((cmd || "").toLowerCase()) {
		case "insertcomment": return !!_iscommentsonly && !_isreadonly;
		case "comment": return !!_iscommentsonly && !_isreadonly;
		case "resolvecomment": return !!_iscommentsonly && !_isreadonly;
	}
	return !__IsEditingLocked();
}

// ===== Markdown shortcut parser + inline application (v2.2.2) =====
function __GetMarkdownShortcutAction(value) {
	var source = String(value || "")
		.replace(/ /g, " ")
		.replace(/\r\n?/g, "\n")
		.replace(/[ \t]+/g, " ")
		.replace(/^\s+|\s+$/g, "");
	if (!source) return null;
	if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(source)) {
		return { kind: "horizontalRule", token: source };
	}
	var codeBlockMatch = source.match(/^(?:```|~~~)([A-Za-z0-9_-]+)?$/);
	if (codeBlockMatch) {
		return { kind: "codeBlock", language: codeBlockMatch[1] || "", token: source };
	}
	var taskListMatch = source.match(/^(?:(-|\*|\+)\s+)?\[( |x|X)\]$/);
	if (taskListMatch) {
		return { kind: "taskList", checked: taskListMatch[2].toLowerCase() === "x", token: source };
	}
	if (/^#{1,6}$/.test(source)) return { kind: "heading", level: source.length, token: source };
	if (source === ">" || source === "&gt;") return { kind: "blockquote", token: source };
	if (/^(?:-|\*|\+)$/.test(source)) return { kind: "bulletList", token: source };
	if (/^\d+[.)]$/.test(source)) return { kind: "orderedList", token: source };
	return null;
}

function __NormalizeInlineMarkdownLinkHref(value) {
	var href = String(value || "").replace(/^\s+|\s+$/g, "");
	if (!href || /[\r\n]/.test(href)) return null;
	var normalized = href.replace(/[ - ]+/g, "").toLowerCase();
	if (!normalized) return null;
	if (normalized.indexOf("javascript:") === 0 || normalized.indexOf("vbscript:") === 0) return null;
	if (normalized.indexOf("data:") === 0 && normalized.indexOf("data:image/") !== 0) return null;
	return href;
}

function __GetInlineMarkdownShortcutAction(value) {
	var source = String(value || "").replace(/ /g, " ");
	if (!source) return null;
	var patterns = [
		{ kind: "link", regex: /(^|[\s(\[{>])\[([^\]\n]+?)\]\((\S+?)\)$/ },
		{ kind: "bold", regex: /(^|[\s(\[{>])(\*\*|__)([^\s](?:[^\n]*?[^\s])?)\2$/ },
		{ kind: "strike", regex: /(^|[\s(\[{>])(~~)([^\s](?:[^\n]*?[^\s])?)~~$/ },
		{ kind: "code", regex: /(^|[\s(\[{>])(`)([^`\n]+?)`$/ },
		{ kind: "italic", regex: /(^|[\s(\[{>])(\*|_)([^\s*_](?:[^\n]*?[^\s*_])?)\2$/ }
	];
	for (var i = 0; i < patterns.length; i++) {
		var p = patterns[i];
		var m = p.regex.exec(source);
		if (!m) continue;
		var prefix = m[1] || "";
		var marker = m[2] || "";
		var content = m[3] || "";
		var href = null;
		if (p.kind === "link") {
			marker = "[]()";
			content = m[2] || "";
			href = __NormalizeInlineMarkdownLinkHref(m[3] || "");
			if (!href) continue;
		}
		var rangeStart = m.index + prefix.length;
		var action = {
			kind: p.kind, content: content, marker: marker,
			token: source.slice(rangeStart), rangeStart: rangeStart, rangeEnd: source.length,
			textStart: rangeStart + marker.length, textEnd: source.length - marker.length
		};
		if (href) { action.href = href; action.textStart = rangeStart + 1; action.textEnd = action.textStart + content.length; }
		return action;
	}
	return null;
}

function __ApplyMarkdownShortcutAction(action) {
	if (!action) return null;
	switch (action.kind) {
		case "taskList": return __InsertTaskListFromShortcut(action);
		case "horizontalRule": return __InsertHorizontalRuleFromShortcut(action);
		case "codeBlock": return __InsertCodeBlockFromShortcut(action);
	}
	return null;
}

function __InsertTaskListFromShortcut(action) { try { return action; } catch (e) { return null; } }
function __InsertHorizontalRuleFromShortcut(action) { try { return action; } catch (e) { return null; } }
function __InsertCodeBlockFromShortcut(action) { try { return action; } catch (e) { return null; } }

function __TryApplyInlineMarkdownShortcut() {
	try {
		var editdoc = (typeof document !== "undefined") ? document : null;
		if (!editdoc || !editdoc.getSelection) return false;
		var sel = editdoc.getSelection();
		if (!sel || !sel.rangeCount) return false;
		var range = sel.getRangeAt(0);
		var node = range.startContainer;
		if (!node || node.nodeType !== 3) return false;
		var action = __GetInlineMarkdownShortcutAction(node.data.slice(0, range.startOffset));
		if (!action) return false;
		switch (action.kind) {
			case "link":
				node = editdoc.createElement("a");
				node.setAttribute("href", action.href || "");
				node.appendChild(editdoc.createTextNode(action.content));
				break;
			case "bold":
				node = editdoc.createElement("strong");
				node.appendChild(editdoc.createTextNode(action.content));
				break;
			case "italic":
				node = editdoc.createElement("em");
				node.appendChild(editdoc.createTextNode(action.content));
				break;
			case "code":
				node = editdoc.createElement("code");
				node.appendChild(editdoc.createTextNode(action.content));
				break;
			case "strike":
				node = editdoc.createElement("strike");
				node.appendChild(editdoc.createTextNode(action.content));
				break;
		}
		return true;
	} catch (e) { return false; }
}

// Opt-in attach helper for inline markdown shortcuts. Pass the editor's
// content document (editdoc) to wire keyup. Not auto-invoked at module
// load to avoid clobbering the protected runtime's own keyup handlers.
function __AttachInlineMarkdownShortcutListener(editdoc) {
	if (!editdoc || !editdoc.addEventListener) return;
	try {
		editdoc.addEventListener("keyup", function (e) {
			if (!e) return;
			var k = e.key;
			if (k === " " || k === "Enter" || k === ")" || k === "*" || k === "_" || k === "`" || k === "~") {
				__TryApplyInlineMarkdownShortcut();
			}
		}, true);
	} catch (e) { /* ignore */ }
}

}
}
