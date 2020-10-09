﻿
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





