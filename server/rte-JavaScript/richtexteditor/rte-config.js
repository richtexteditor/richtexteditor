/**
 * @license Copyright (c) 2003-2026, richtexteditor - Richscripts Inc. All rights reserved.
 * For licensing, see http://richtexteditor.com/license.aspx
 */

if (!window.RTE_DefaultConfig) window.RTE_DefaultConfig = { };

RTE_DefaultConfig.editablePaddingTop = 2;
RTE_DefaultConfig.editablePaddingBottom = 2;
RTE_DefaultConfig.editablePaddingLeft = 2;
RTE_DefaultConfig.editablePaddingRight = 2;

// 2026-05-08: empty-editor placeholder ("Type something…" hint that
// disappears the moment the user starts typing). Off by default — set
// `placeholder: "Your text here"` to opt in. The placeholder layer is
// rendered as a `::before` pseudo-element on the editable when the
// content area is empty; muted slate-grey so it stays distinguishable
// from real placeholder content like greyed-out templates.
RTE_DefaultConfig.placeholder = "";
RTE_DefaultConfig.placeholderShowOnlyWhenEditable = true;
RTE_DefaultConfig.placeholderColor = "#94a3b8";

RTE_DefaultConfig.zIndexFullPage = "9999";
RTE_DefaultConfig.zIndexFloat = "99999";
RTE_DefaultConfig.zIndexDialog = "999999";
RTE_DefaultConfig.zIndexDropDown = "9999999";

RTE_DefaultConfig.fontNameDropDownMinWidth = "90px";
RTE_DefaultConfig.fontNameDropDownMaxWidth = "140px";

RTE_DefaultConfig.tooltipAttribute = "rte-tooltip";    //change to "no-tooltip" to hide tooltip

RTE_DefaultConfig.timeoutAddToUndo = 900; //When uses types fast, wait 900ms to add undo item.
RTE_DefaultConfig.skin = "default";     // default, rounded-corner, gray or blue. Sets the skin for how the toolbar is draw. Create your custom skin or choose from predefined skins.
RTE_DefaultConfig.toolbar = "default"; // default, basic or full. Auto configures the toolbar with a set of buttons on desktop.
RTE_DefaultConfig.toolbarMobile = "mobile";   // The toolbar set on mobile devices. 
RTE_DefaultConfig.maxWidthForMobile = 992; // When the screen (browser window) gets smaller than 992, editor should have mobile toolbar.

RTE_DefaultConfig.urlType = "default";  //default(do nothing),absolute(all change to http(s)://...),relative(all change to /...)

RTE_DefaultConfig.enableDragDrop = true; // Enables or disables drag-and-drop support for the editor.
RTE_DefaultConfig.enableObjectResizing = true; //Specifies whether or not to allow the users resize an object winthin the RichTextEditor.
RTE_DefaultConfig.toggleBorder = true; //Specifies the ToggleBorder state. ToggleBorder is a handy function which allows you to see the borders without setting things to border = 1 or something like that in code.
RTE_DefaultConfig.readOnly = false; //Gets or sets a value which indicates whether the RichTextEditor should be an active HTML editor, or a read-only document viewer.
RTE_DefaultConfig.commentsOnly = false; //Comments-only review mode: when true, the editor blocks document edits but still allows inline comments. Toggle at runtime via editor.setCommentsOnly(true).
RTE_DefaultConfig.autoLinkOnType = true; // When true, typing a URL/email followed by space auto-wraps it in an <a> tag.
RTE_DefaultConfig.showFloatLinkUrlPreview = true; // Show clickable URL preview in the float toolbar when caret is in an <a>.
RTE_DefaultConfig.backspaceOutdent = true; // When true, Backspace at column 0 of an <li> outdents instead of merging.
RTE_DefaultConfig.stickyToolbar = false; // When true, the editor toolbar sticks to the top of the viewport when scrolled past.
RTE_DefaultConfig.altTextHint = true; // When true, images missing alt text show a dashed amber outline in the editing surface.
RTE_DefaultConfig.blockDragHandles = true; // When true, hovering over a block shows a ⋮⋮ drag handle for reordering (Notion-style). Set false to disable.
RTE_DefaultConfig.autoGrow = false; // When true, the editor auto-expands to fit content instead of showing an inner scrollbar.
RTE_DefaultConfig.autoHeadingAnchors = true; // Auto-assign stable slug IDs to h1-h6 elements so deep-links / TOC navigation work.
RTE_DefaultConfig.copyHeadingLink = true; // Show a 🔗 "copy link" icon on hover over h1-h6 in the editor.
RTE_DefaultConfig.smartPasteToast = true; // Show a brief "Cleaned from Word / Google Docs" toast after a successful paste-cleanup.
RTE_DefaultConfig.smartLinkPaste = true;  // Paste a URL while text is selected -> wrap the selection in <a href> instead of replacing it. Matches Google Docs / Notion / TipTap behavior.
RTE_DefaultConfig.aiContextMenu = true; // Right-click on selected text shows Ask AI / Rewrite / Summarize / Translate (when AI Toolkit is loaded).
RTE_DefaultConfig.tableColumnResize = true; // Hover near a table column border to drag-resize the column.
RTE_DefaultConfig.tableRowResize = true; // Hover near a table row's bottom edge to drag-resize its height.
RTE_DefaultConfig.imageHoverQuickBar = true; // Show a small "Alt / Replace / X" floating bar when hovering an inline <img>.
RTE_DefaultConfig.inlineMath = true; // When true, editor.applyMathMarkup() wraps $...$ runs in <span class="rte-math-inline" data-tex="..."> so a math renderer (KaTeX/MathJax) can target them.
RTE_DefaultConfig.imageLazyLoad = true; // Newly-inserted <img> tags get loading="lazy" + decoding="async" so big documents stay responsive.
RTE_DefaultConfig.documentUploadAccept = ".txt,.text,.rtf,.md,.markdown,.html,.htm,.pdf,.doc,.docx,.odt,.xls,.xlsx,.csv,.tsv,.json,.xml,.zip,.rar"; // Default Insert Document chooser filter.
RTE_DefaultConfig.fileUploadLocalObjectUrl = true; // Without file_upload_handler, local document files insert as temporary blob: links instead of failing.
// Reading-mode persistence key. Default is session-only so refresh restores the toolbar.
// Set to true for per-editor localStorage persistence, or to a custom string to share state across editors.
// RTE_DefaultConfig.readingModePersistenceKey = false;
RTE_DefaultConfig.spellcheck = true; // When true, the browser's spellcheck wavy underline is enabled inside the editor.
RTE_DefaultConfig.wordCountGoal = 0; // When > 0, the status bar shows progress toward the target word count.
RTE_DefaultConfig.restrictedEditingMode = false; // When true, the editor is locked except for spans tagged data-rte-editable="true".
RTE_DefaultConfig.text_restrictedediting = "Restricted editing";
RTE_DefaultConfig.svgCode_restrictedediting = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

// 2026-05-19 New toolbar entries (icons + labels) for the editor-experience push.
RTE_DefaultConfig.text_printpreview = "Print preview";
RTE_DefaultConfig.svgCode_printpreview = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="6" rx="1"/><path d="M7 14h10v6H7z"/><path d="M6 9h12a1 1 0 0 1 1 1v5H5v-5a1 1 0 0 1 1-1z"/><circle cx="16" cy="12" r="0.6" fill="currentColor"/></svg>';
RTE_DefaultConfig.text_readingmode = "Reading mode";
RTE_DefaultConfig.svgCode_readingmode = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h7a3 3 0 0 1 3 3v12"/><path d="M21 5h-7a3 3 0 0 0-3 3v12"/></svg>';
RTE_DefaultConfig.text_highlight = "Highlight";
RTE_DefaultConfig.svgCode_highlight = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4l6 6-9 9H5v-6z"/><path d="M14 4l-9 9"/></svg>';
RTE_DefaultConfig.text_sortlines = "Sort lines";
RTE_DefaultConfig.svgCode_sortlines = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l3-3 3 3"/><path d="M10 4v16"/><path d="M17 17l-3 3-3-3"/><path d="M14 20V4"/></svg>';

// Smart typography: auto-convert common typing patterns to typographic glyphs.
// Master switch + per-feature toggles. Skipped inside <code>/<pre>/<kbd>.
RTE_DefaultConfig.smartTypography = true;
RTE_DefaultConfig.smartTypographyDashes = true;     // "--" -> em-dash
RTE_DefaultConfig.smartTypographyEllipsis = true;   // "..." -> ellipsis
RTE_DefaultConfig.smartTypographyTrademarks = true; // "(c)" -> copyright, "(r)" -> registered, "(tm)" -> trademark
RTE_DefaultConfig.smartTypographyQuotes = true;     // straight quotes -> curly, apostrophe-aware


// Show keyboard shortcuts in toolbar tooltips. Applied at end of file once
// all text_* defaults are populated. Toggle via showKeyboardShortcutsInTooltips.
RTE_DefaultConfig.showKeyboardShortcutsInTooltips = true;

RTE_DefaultConfig.editorResizeMode = "both"; //both, height or none. Gets or sets the resize mode.
RTE_DefaultConfig.showPlusButton = true; // Specifies whether to display the editor plus button.
RTE_DefaultConfig.showTagList = true; // Specifies whether to display the tag selector in the editor bottom bar.
RTE_DefaultConfig.showStatistics = true; //Specifies whether to display the content statistics in the editor bottom bar.
RTE_DefaultConfig.statisticsCounters = "words,characters"; // Controls which counters appear in the bottom bar. Supported values: words, characters, none.
RTE_DefaultConfig.showSelectedBlock = true;    //show selected paragraph as [__rte_select_block]{...}
RTE_DefaultConfig.focusOnLoad = false; // Specifies whether the editor grabs focus when the page loads. If this property is set to true then the editor will take focus, if it is set to false it will not.
RTE_DefaultConfig.allowScriptCode = false; //Specifies whether to strip all script elements and script contents from the html to prevent javaScript injection. When this property is set to false (the default) Rich Text Editor strips all script elements and script contents from the html.
RTE_DefaultConfig.showFloatTextToolBar = true;  // Specifies whether to display the FloatTextToolBar.
RTE_DefaultConfig.showFloatLinkToolBar = true; // Specifies whether to display the FloatLinkToolBar.
RTE_DefaultConfig.showFloatImageToolBbar = true; // Specifies whether to display the FloatImageToolBbar.
RTE_DefaultConfig.showFloatTableToolBar = true; // Specifies whether to display the FloatTableToolBar.
RTE_DefaultConfig.showFloatParagraph = false; // Specifies whether to display the FloatParagraph.
RTE_DefaultConfig.maxHTMLLength = 0; // Gets or sets the maximum number of characters including the HTML tags allowed in the RichTextEditor. Default is -1, indicating no maximum.
RTE_DefaultConfig.maxTextLength = 0; //Gets or sets the maximum number of characters excluding the HTML tags allowed in the RichTextEditor. Default is -1, indicating no maximum.
RTE_DefaultConfig.tagWhiteList = [];  // The white list contains a list of tags that can be used in the editor.
RTE_DefaultConfig.tagBlackList = [];  // The black list contains a list of tags that cannot be used in the editor.

RTE_DefaultConfig.tabSpaces = 4;	//Gets or sets the number of spaces to be inserted when the user hits the "tab" key.
RTE_DefaultConfig.enterKeyTag = "p" // Determines what happens when the "enter" key is pressed in the editor. div, p or br.

RTE_DefaultConfig.pasteMode = "Auto"; // Specifies the manner in which the editor handles pasted text. Auto,Disabled,PasteText,PasteWord.
RTE_DefaultConfig.markdownShortcutsEnabled = true; // Enables Markdown-style block shortcuts such as "# ", "> ", "- ", "1. ", and "---" + Enter.
RTE_DefaultConfig.markdownInlineEnabled = true; // Enables inline Markdown autoformat: **bold**, __bold__, *italic*, _italic_, `code`, ~~strike~~ (fires when the closing delimiter is typed).

RTE_DefaultConfig.floatParagraphPos = "left";//left or right
RTE_DefaultConfig.floatParagraphPosX = 0; //x offset
RTE_DefaultConfig.floatParagraphPosY = 0; //y offset
RTE_DefaultConfig.url_base = "/richtexteditor"; // Specifies a base URL of richtexteditor
RTE_DefaultConfig.contentCssUrl = "%url_base%/runtime/richtexteditor_content.css"; // Specifies the location of the style sheet that will be used by the editable area.
RTE_DefaultConfig.previewCssUrl = "%url_base%/runtime/richtexteditor_preview.css"; // Specifies the location of the style sheet that will be used by the preview window.
RTE_DefaultConfig.previewScriptUrl = "%url_base%/runtime/richtexteditor_preview.js"; // Specifies the location of javascript file that will be used by the preview window.
RTE_DefaultConfig.helpUrl = "%url_base%/runtime/help.htm"

RTE_DefaultConfig.contentCssText = "";//"body{background-color:#eee}"; 	Gets or sets inline CSS text that will be used by the editable area. 	//TODO:add api example
RTE_DefaultConfig.previewCssText = "";//"body{background-color:#eee}"; 	Gets or sets inline CSS text that will be used by the preview window. //TODO:add api example

RTE_DefaultConfig.editorBodyCssClass = "";  //Gets or sets the class of editing area to switch styles.
RTE_DefaultConfig.editorBodyCssText = "";   // Gets or sets inline CSS text that will be used by the editable body.

RTE_DefaultConfig.paragraphClass = null;	// auto add class name to new paragraphs
RTE_DefaultConfig.insertTableTag = "<table style='width:100%;border-collapse:collapse'></table>"; // Default table attributes when inserting a table.
RTE_DefaultConfig.insertRowTag = "<tr></tr>"; // Default row attributes when creating table row.
RTE_DefaultConfig.insertCellTag = "<td><br/></td>"; // Default cell attributes when inserting a cell.



RTE_DefaultConfig.insertOrderedListItems = [["decimal", "1,2,3,4,5"], ["lower-alpha", "a,b,c,d,e"], ["upper-alpha", "A,B,C,D,E"], ["lower-roman", "ⅰ,ⅱ,ⅲ,ⅳ,ⅴ"], ["upper-roman", "Ⅰ,Ⅱ,Ⅲ,Ⅳ,Ⅴ"]];

RTE_DefaultConfig.insertUnorderedListItems = [["disc", "Disc"], ["circle", "Circle"], ["square", "Square"]];

RTE_DefaultConfig.fontSizeItems = "8,9,10,11,12,13,14,16,18,24,36,48,60,72,96";// A predefined set of font sizes.
RTE_DefaultConfig.fontNameItems = "Arial,Arial Black,Comic Sans MS,Courier New,Tahoma,Georgia,Helvetica, Segoe UI,Sans-Serif,Impact,Times New Roman,Verdana";// A predefined set of font names.
RTE_DefaultConfig.lineHeightItems = "100%,150%,200%,250%,300%,350%,400%,450%,500%,600%"// A predefined set of line height items.
// all text name shall be lower case


RTE_DefaultConfig.paragraphItems = "Normal,H1,H2,H3,H4,H5,H6"// A predefined set of format blocks.

RTE_DefaultConfig.characterItems = [
	{ tab: "Unicode", items: ["&#402;", "&#913;", "&#914;", "&#915;", "&#916;", "&#917;", "&#918;", "&#919;", "&#920;", "&#921;", "&#922;", "&#923;", "&#924;", "&#925;", "&#926;", "&#927;", "&#928;", "&#929;", "&#931;", "&#932;", "&#933;", "&#934;", "&#935;", "&#936;", "&#937;", "&#945;", "&#946;", "&#947;", "&#948;", "&#949;", "&#950;", "&#951;", "&#952;", "&#953;", "&#954;", "&#955;", "&#956;", "&#957;", "&#958;", "&#959;", "&#960;", "&#961;", "&#962;", "&#963;", "&#964;", "&#965;", "&#966;", "&#967;", "&#968;", "&#969;", "&#977;", "&#978;", "&#982;", "&#8226;", "&#8230;", "&#8242;", "&#8243;", "&#8254;", "&#8260;", "&#8472;", "&#8465;", "&#8476;", "&#8482;", "&#8501;", "&#8592;", "&#8593;", "&#8594;", "&#8595;", "&#8596;", "&#8629;", "&#8656;", "&#8657;", "&#8658;", "&#8659;", "&#8660;", "&#8704;", "&#8706;", "&#8707;", "&#8709;", "&#8711;", "&#8712;", "&#8713;", "&#8715;", "&#8719;", "&#8722;", "&#8722;", "&#8727;", "&#8730;", "&#8733;", "&#8734;", "&#8736;", "&#8869;", "&#8870;", "&#8745;", "&#8746;", "&#8747;", "&#8756;", "&#8764;", "&#8773;", "&#8773;", "&#8800;", "&#8801;", "&#8804;", "&#8805;", "&#8834;", "&#8835;", "&#8836;", "&#8838;", "&#8839;", "&#8853;", "&#8855;", "&#8869;", "&#8901;", "&#8968;", "&#8969;", "&#8970;", "&#8971;", "&#9001;", "&#9002;", "&#9674;", "&#9824;", "&#9827;", "&#9829;", "&#9830;"] }
	, { tab: "ASCII", from: 33, to: 126 }
	, { tab: "European", from: 192, to: 255 }
	, { tab: "Roma", from: 913, to: 1014 }
	, { tab: "Webdings", font: "Webdings", from: 33, to: 255 }, { tab: "Wingdings", font: "Wingdings", from: 33, to: 255 }, { tab: "Symbol", font: "Symbol", from: 33, to: 255 }]; // A predefined set of characters.


RTE_DefaultConfig.foreColorItems = ["#000000", "#993300", "#333300", "#003300", "#003366", "#000080", "#333399", "#333333",
	"#800000", "#ff6600", "#808000", "#008000", "#008080", "#0000ff", "#666699", "#808080",
	"#ff0000", "#ff9900", "#99cc00", "#339966", "#33cccc", "#3366ff", "#800080", "#999999",
	"#ff00ff", "#ffcc00", "#ffff00", "#00ff00", "#00ffff", "#00ccff", "#993366", "#c0c0c0",
	"#ff99cc", "#ffcc99", "#ffff99", "#ccffcc", "#ccffff", "#99ccff", "#cc99ff", "#ffffff"];

RTE_DefaultConfig.backColorItems = ["#000000", "#993300", "#333300", "#003300", "#003366", "#000080", "#333399", "#333333",
	"#800000", "#ff6600", "#808000", "#008000", "#008080", "#0000ff", "#666699", "#808080",
	"#ff0000", "#ff9900", "#99cc00", "#339966", "#33cccc", "#3366ff", "#800080", "#999999",
	"#ff00ff", "#ffcc00", "#ffff00", "#00ff00", "#00ffff", "#00ccff", "#993366", "#c0c0c0",
	"#ff99cc", "#ffcc99", "#ffff99", "#ccffcc", "#ccffff", "#99ccff", "#cc99ff", "#ffffff"];

RTE_DefaultConfig.linkItems = [
	"https://www.intel.com"
	,
	"https://www.ibm.com"
	,
	"https://www.microsoft.com"
	,
	"https://www.google.com"
	,
	"https://www.apple.com"
] // A predefined set of links.

RTE_DefaultConfig.imageItems = [
	"https://richtexteditor.com/uploads/1.jpg",
	"https://richtexteditor.com/uploads/2.jpg",
	"https://richtexteditor.com/uploads/3.jpg",
	"https://richtexteditor.com/uploads/4.jpg",
	"https://richtexteditor.com/uploads/5.jpg",
	"https://richtexteditor.com/uploads/6.jpg"
]	// For insert image by URL


RTE_DefaultConfig.galleryImages = [
	"https://richtexteditor.com/uploads/1.jpg",
	"https://richtexteditor.com/uploads/2.jpg",
	"https://richtexteditor.com/uploads/3.jpg",
	"https://richtexteditor.com/uploads/4.jpg",
	"https://richtexteditor.com/uploads/5.jpg",
	"https://richtexteditor.com/uploads/6.jpg"
]; // Default images for gallery Images dialog. 

RTE_DefaultConfig.htmlTemplates = [
	["My Doc 1", "<h2>MyTitleMyTitleMyTitleMyTitleMyTitleMyTitleMyTitle</h2><p>Paragraph 1 </p><p>Paragraph 2 </p><p>Paragraph 3 </p><p>Paragraph 4 </p><p>Paragraph 5 </p>"]
	,
	["My Doc 1", "<h2>MyTitleMyTitleMyTitle</h2><p>Paragraph 1 </p><p>Paragraph 2 </p><p>Paragraph 3 </p><p>Paragraph 4 </p><p>Paragraph 5 </p>"]
];// Default html Templates for html Templates dialog.

// Slash command menu — type "/" at the start of a line or after whitespace to open an inline command picker.
// Set slashCommandEnabled to false to disable. Set slashCommandIncludeAi to false to hide AI actions from the menu.
// Register extra commands at runtime via editor.slashCommands.register({ id, section, title, description, keywords, iconSvg, run }).
RTE_DefaultConfig.slashCommandEnabled = true;
RTE_DefaultConfig.slashCommandIncludeAi = true;
RTE_DefaultConfig.slashCommands = null; // optional array of extra command defs, loaded declaratively at init.

// Mention plugin — type a trigger character ("@" by default) at the start of a line or after whitespace
// to open an async autocomplete picker. Provide one of:
//   - mentionStaticList: an array of { id, label, subtitle?, avatarUrl? } — fastest way to prototype
//   - mentionSource: function (query, ctx) { return Promise<Array<...>> } — wire to a /api/users endpoint
// Register extra triggers (e.g. "#" for tags, "[[" for wiki links) at runtime via
// editor.mentions.register({ trigger, source, renderItem?, renderInsert?, insertClass? }).
RTE_DefaultConfig.mentionEnabled = true;
RTE_DefaultConfig.mentionTrigger = "@";
RTE_DefaultConfig.mentionDebounceMs = 150;
RTE_DefaultConfig.mentionMaxItems = 8;
RTE_DefaultConfig.mentionStaticList = null;
RTE_DefaultConfig.mentionSource = null;
RTE_DefaultConfig.mentionTriggers = null;
RTE_DefaultConfig.mentionInsertClass = "rte-mention";

// Tracked changes (human "suggesting" mode) — when enabled and a currentUser is configured,
// the "Suggesting mode" toolbar button toggles wrapping of all typed inserts/deletes in
// colored tracked-change spans. Each entry is added to editor.reviewLedger so the existing
// AI Review drawer surfaces both AI and human suggestions in one unified list. Format
// changes (bold, heading, list) are NOT tracked in v1 — they apply directly.
//
// To use:
//   config.trackChangesEnabled = true;
//   config.currentUser = { id: "alice", name: "Alice Lee", color: "#2563eb" };
// then call editor.trackedChanges.enable() or click the toolbar button.
RTE_DefaultConfig.trackChangesEnabled = true;
RTE_DefaultConfig.currentUser = null; // { id, name, color } — required to track changes
RTE_DefaultConfig.trackChangesInsertClass = "rte-tc rte-tc-insert";
RTE_DefaultConfig.trackChangesDeleteClass = "rte-tc rte-tc-delete";

// Comments — select text, click the "Comment" toolbar button (or call editor.comments.add()),
// type a note. The selection is wrapped in a highlighted <span class="rte-comment"> and a
// sidebar opens for replies / resolve / delete. Comments ride the shared reviewLedger with
// changeType: "comment" so they persist to localStorage and to the optional server endpoint.
// Requires config.currentUser — same one used by Track Changes.
RTE_DefaultConfig.commentsEnabled = true;
RTE_DefaultConfig.commentHighlightBg = "#fff9c4";
RTE_DefaultConfig.commentHighlightBorder = "#f9a825";

// Revision history — click the clock icon in the toolbar (or press Ctrl+Shift+H) to open the
// version browser. Snapshots are stored in localStorage keyed by aiToolkitPersistenceKey.
// Set revisionHistoryAutoSnapshotMs to a non-zero value (e.g. 30000 for 30s) to auto-capture
// when typing pauses. Set revisionHistoryUrl to POST snapshots to your server.
RTE_DefaultConfig.revisionHistoryEnabled = true;
RTE_DefaultConfig.revisionHistoryMaxEntries = 50;
RTE_DefaultConfig.revisionHistoryAutoSnapshotMs = 0;
RTE_DefaultConfig.revisionHistoryUrl = "";

// Yjs collaboration (Option B: presence + shared review ledger; NO content CRDT in v1).
// Yjs + a provider (y-websocket / y-webrtc / y-indexeddb) are PEER DEPENDENCIES — customers
// load them separately and call editor.collab.attach({ doc, provider, user }).
// The plugin handles: awareness (live cursors + presence), and bridging editor.reviewLedger
// into a shared Y.Map so AI suggestions, tracked changes, and comments replicate across peers.
RTE_DefaultConfig.collabEnabled = true;
RTE_DefaultConfig.collabLedgerMapName = "reviewLedger";
RTE_DefaultConfig.collabShowPresence = true;
RTE_DefaultConfig.collabShowRemoteCursors = true;


RTE_DefaultConfig.inlineStyles = [["Red", "color:red", "color:red"], ["Bold", "font-weight:bold", "font-weight:bold"], ["Mark", "my-cls-mark"], ["Warning", "my-cls-warning"]]; // Default CSS styles for inline styles dropdown. 
RTE_DefaultConfig.paragraphStyles = [["Red", "color:red", "color:red"], ["Bold", "font-weight:bold", "font-weight:bold"], ["Quote", "my-cls-quote"], ["LargeCenter", "my-cls-largecenter"]]; // Default CSS styles for paragraph styles dropdown. 
RTE_DefaultConfig.imageStyles = [["Border", "border: 1px solid #ddd; border-radius: 4px; padding: 5px;"], ["grayscale", "filter: grayscale(100%);"], ["Shadow", "box-shadow:0 0 8px gray"], ["Margin10", "margin:10px"], ["Padding:10", "padding:10px"]
	, ["Rounded Corners", "border-radius: 10px;"], ["Rounded Images", "border-radius: 50%;"], ["Thumbnail Image", "border: 1px solid #ddd; border-radius: 4px; padding: 5px;width:150px"]// Default CSS styles for image Styles dropdown. 
];
RTE_DefaultConfig.linkStyles = [["Margin10", "margin:10px"], ["Padding:10", "padding:10px"], ["BigText", "font-size:36px"]]; // Default CSS styles for link Styles dropdown. 




RTE_DefaultConfig.toolbar_default = "{bold,italic,underline,forecolor,backcolor}|{justifyleft,justifycenter,justifyright,justifyfull}|{insertorderedlist,insertunorderedlist,indent,outdent,insertblockquote,insertemoji}|{aiassist}"
	+ " #{paragraphs:toggle,fontname:toggle,fontsize:toggle,inlinestyle,lineheight}"
	+ " / {removeformat,cut,copy,paste,delete,find}|{insertlink,insertchars,inserttable,insertimage,insertvideo,insertdocument,inserttemplate,insertcode}|{preview,code,selectall}"
	+ "#{toggleborder,fullscreenenter,fullscreenexit,undo,redo,togglemore}"; // Default set of buttons that appears in the rich text editor's toolbar on desktop.

RTE_DefaultConfig.toolbar_mobile = "{bold,italic,underline|fontname:toggle,fontsize:toggle,menu_paragraphop|forecolor,backcolor}"
	+ "{insertlink,insertemoji,inserttable,insertimage,removeformat}"
	+ "|{aiassist}#{toggleborder,fullscreenenter,fullscreenexit,undo,redo,togglemore}";  // Default set of buttons that appears in the rich text editor's toolbar on mobile.

RTE_DefaultConfig.toolbar_basic = "{bold,italic,underline}|{fontname,fontsize}|{insertlink,insertemoji,insertimage,insertvideo}|removeformat|code"
	+ "#{toggleborder,fullscreenenter,fullscreenexit,undo,redo,togglemore}"; // Basic set of buttons that appears in the rich text editor's toolbar.

RTE_DefaultConfig.toolbar_full = "{bold,italic,underline,forecolor,backcolor}|{justifyleft,justifycenter,justifyright,justifyfull}|{insertorderedlist,insertunorderedlist,indent,outdent}{superscript,subscript}|{aiassist}"
	+ " #{paragraphs:toggle,fontname:toggle,fontsize:toggle,inlinestyle,lineheight}"
	+ " / {spellcheck,insertcomment,removeformat,cut,copy,paste,delete,find}|{insertlink,unlink,insertblockquote,insertemoji,insertchars,inserttable,menu_tablecell,menu_tablerow,menu_tablecolumn,insertimage,insertgallery,insertvideo,insertdocument,inserttemplate,insertcode}"
	+ "#{preview,code,selectall}"
	+ " /{paragraphs:dropdown | fontname:dropdown | fontsize:dropdown} {paragraphstyle,toggle_paragraphop,menu_paragraphop}"
	+ "#{insertmergefield,insertfootnote,inserttoc,insertpagebreak,revisionhistory,newdoc,save,toggleborder,fullscreenenter,fullscreenexit,undo,redo,togglemore}"; // Full set of buttons that appears in the rich text editor's toolbar.

RTE_DefaultConfig.toolbar_richtextboxjs = RTE_DefaultConfig.toolbar_full; // Compatibility alias for older demo pages still referencing the temporary preset name.

RTE_DefaultConfig.toolbar_office = "<@COMMON,ribbonpaste,pastetext,pasteword,{save,new,print}/{cut,copy,delete,find}/{undo,redo|formatpainter}><@FORMAT,[fontname,fontsize]/{bold,italic,underlinemenu|forecolor,backcolor}/{superscript,subscript,changecase|removeformat,cleancode,selectall}><@PARAGRAPHS,[paragraphs,styles]/{justifymenu,lineheight,ltr,rtl,insertlinemenu}/{insertorderedlist,insertunorderedlist,indent,outdent,insertblockquote}><@INSERT,ribbontable,insertgallery,insertimage,{insertform,insertbox,insertlayer,insertfieldset,pageproperties,help,toggleborder,fullscreen}/{insertlink,unlink,insertanchor,insertimagemap,insertdate,insertchars,virtualkeyboard}/{inserttemplate,insertdocument,insertvideo,syntaxhighlighter,insertyoutube,html5,googlemap}>";

RTE_DefaultConfig.subtoolbar_more = "{strike,superscript,subscript,ucase,lcase,titlecase,inserthorizontalrule,highlight,sortlines,insertcallout,insertcolumns,inserttoggle,inserttodolist,insertmath,insertdiagram,insertbookmark,insertdatechip,spellcheck,emailexport,readaloud,html2pdf,insertdate} #{newdoc,load,save,print,printpreview,readingmode,help}"; // A set of buttons that appears in the subtoolbar of default toolbar set.
RTE_DefaultConfig.subtoolbar_more_full = "{strike,ucase,lcase,titlecase,inserthorizontalrule,highlight,sortlines,html2pdf,insertdate} #{newdoc,save,print,printpreview,readingmode,help}";// A set of buttons that appears in the subtoolbar of full toolbar set.
RTE_DefaultConfig.subtoolbar_more_mobile = "{save} #{newdoc,help}"; // A set of buttons that appears in the subtoolbar of mobile toolbar set.
RTE_DefaultConfig.subtoolbar_paste = "pasteauto,pastetext,pasteword";  // A set of buttons that appears in the rich text editor's paste subtoolbar.
RTE_DefaultConfig.subtoolbar_paragraphop = "{justifyleft,justifycenter,justifyright,insertorderedlist,insertunorderedlist,indent,outdent,insertblockquote}"   // A set of buttons that appears in the rich text editor's paragraph subtoolbar.
RTE_DefaultConfig.subtoolbar_table = "controlsizeauto,controlsize100,controlsize75,controlsize50,tabledistributecolumns,tabledistributerows,tableproperties,tabledelete";   // A set of buttons that appears in the table subtoolbar.
RTE_DefaultConfig.subtoolbar_tablerow = "tablerowinsertabove,tablerowinsertbelow,tablerowdelete";  // A set of buttons that appears in the tablerow subtoolbar.
RTE_DefaultConfig.subtoolbar_tablecell = "tablecellmerge,tablecellsplitver,tablecellsplithor,tablecellforecolor,tablecellbackcolor,tablecelltype,tablecellproperties"; // A set of buttons that appears in the tablecell subtoolbar.

// Icons + tooltips for the table/cell commands added 2026-06-18 (Lucide-style line icons).
RTE_DefaultConfig.text_tablecellproperties = "Cell Properties";
RTE_DefaultConfig.text_tableproperties = "Table Properties";
RTE_DefaultConfig.text_tablecelltype = "Toggle Header Cell";
RTE_DefaultConfig.text_tabledistributecolumns = "Distribute Columns";
RTE_DefaultConfig.text_tabledistributerows = "Distribute Rows";
RTE_DefaultConfig.svgCode_tablecellproperties = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14"/><path d="M5 12h14"/><path d="M5 17h14"/><circle cx="9" cy="7" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="8" cy="17" r="1.7"/></svg>';
RTE_DefaultConfig.svgCode_tableproperties = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-2.82-1.17l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 13.5H4.5a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.17-2.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 2.82-1.17V2.5a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-1.17 2.82h.09a2 2 0 0 1 0 4h-.09z"/></svg>';
RTE_DefaultConfig.svgCode_tablecelltype = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="3" y="4" width="18" height="5" rx="1.5" fill="currentColor" stroke="none"/><path d="M3 9h18"/><path d="M12 9v11"/></svg>';
RTE_DefaultConfig.svgCode_tabledistributecolumns = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M9 5v14"/><path d="M15 5v14"/></svg>';
RTE_DefaultConfig.svgCode_tabledistributerows = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 9.67h18"/><path d="M3 14.33h18"/></svg>';
RTE_DefaultConfig.subtoolbar_tablecolumn = "tablecolumninsertleft,tablecolumninsertright,tablecolumndelete"; // A set of buttons that appears in the tablecolumn subtoolbar.
RTE_DefaultConfig.subtoolbar_tableinsert = "tablerowinsertabove,tablerowinsertbelow,tablecolumninsertleft,tablecolumninsertright"; // A set of buttons that appears in the tableinsert subtoolbar.
RTE_DefaultConfig.subtoolbar_tabledelete = "tablecolumndelete,tablerowdelete,tabledelete"; // A set of buttons that appears in the tabledelete subtoolbar.
RTE_DefaultConfig.subtoolbar_controlsize = "controlsize,controlsizeauto,controlsize100,controlsize75,controlsize50,controlsize25"; // A set of buttons that appears in the controlsize subtoolbar.
RTE_DefaultConfig.subtoolbar_justify = "justifyleft,justifycenter,justifyright";  // A set of buttons that appears in the justify subtoolbar.
RTE_DefaultConfig.subtoolbar_controljustify = "justifyleft,justifycenter,justifyright,floatleft,floatright";  // A set of buttons that appears in the controljustify subtoolbar.
RTE_DefaultConfig.subtoolbar_floatparagraph = "pmoveup,pmovedown,pduplicate,pdelete,pmore"; // The default tool buttons of floatparagraph.

// Text-selection float toolbar. Kept compact like Google Docs / Notion /
// TinyMCE quickbars: formatting first, link, then remove-format LAST (it's
// destructive — it used to lead the toolbar). Font name/size pickers were
// removed from the bubble (no major editor puts them there; they remain on
// the main toolbar) — add "{fontname:toggle,fontsize:toggle}|" back here if
// you preferred the old behaviour.
RTE_DefaultConfig.controltoolbar_TEXT = "{bold,italic,underline,strike}|{forecolor,backcolor}|{insertlink}|removeformat"  // A set of buttons that appears in the text selection float toolbar.
RTE_DefaultConfig.controltoolbar_A = "{linkstyle,insertlink,unlink}"; // A set of buttons that appears in the link selection float toolbar.
RTE_DefaultConfig.controltoolbar_TD = "{tableheader,menu_tablecell,menu_tablerow,menu_tablecolumn,menu_table}";//"{menu_tablecell,menu_tableinsert,menu_tabledelete,menu_table}",
RTE_DefaultConfig.controltoolbar_IMG = "{menu_controlsize,imagecaption,controlalt,controlinsertlink,controleditlink,controlopenlink,controlunlink}/{menu_controljustify,imagestyle,imageeditor,delete}";//justifyleft,justifycenter,justifyright
RTE_DefaultConfig.controltoolbar_IFRAME = "{menu_controlsize,menu_controljustify,insertvideo,delete}"; // A set of buttons that appears in the video / iframe float toolbar.

//RTE_DefaultConfig.svgCode_menu_tablerow='<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.21 15c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 001.852-2.14c0-1.51-1.162-2.46-3.014-2.46H5.843V15h4.368zM7.908 6.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H7.908V6.673zm0 6.788v-2.864h1.73c1.216 0 1.88.492 1.88 1.415 0 .943-.643 1.449-1.832 1.449H7.907z"/></svg>';
RTE_DefaultConfig.pngCode_ribbonbg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAABiCAYAAAB+koVqAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAACB0RVh0U29mdHdhcmUATWFjcm9tZWRpYSBGaXJld29ya3MgTVi7kSokAAAAFnRFWHRDcmVhdGlvbiBUaW1lADA1LzA2LzEynpvHdgAAAeNJREFUeJzt3bFtw0AUBcFP4/qv1InhRA4kOaAauE0IAjMVMFs8no46vn8e7wGATWtm5vfxvPo5ALiZNTPzfBkhAOxZMzPvt4AAsOcTkKsfA4C7OQNy9VMAcDteYQGQeIUFQCIgACSfMxAFAWCPBQJAIiAAJH6FBUCyZmZeVz8FALezZmYefz6mCMAeN9EBSL6ufgAA7klAAEgEBIBkzcwcVz8FALdjgQCQCAgAiYAAkKyZcQgCwDaH6AAkXmEBkAgIAIlXWAAkZ0AOCQFgj1dYACQCAkDiHggAiUN0ABILBIDEGQgAiYAAkDgDASCxQABIBASAREAASAQEgMQhOgCJi4QAJF5hAZBYIAAkFggAiYAAkAgIAImAAJCch+hO0QHYZIEAkAgIAIlPmQCQWCAAJJ+b6DYIAHssEAASAQEgERAAEgEBIBEQABL3QABILBAAEgEBIPGXtgAkFggAiQUCQGKBAJAICACJgACQCAgAiZvoACQWCACJBQJAYoEAkAgIAImAAJAICACJgACQCAgAiYAAkAgIAMl5kfBwlRCAPRYIAImAAJAICACJgACQrJnxOV4AtlkgACTnAjFBANhkgQCQCAgAib+0BSCxQABIBASAxD0QABILBIBEQABIBASA5B+/giW9vHXuqwAAAABJRU5ErkJggg==';
RTE_DefaultConfig._allimageindexdata = 'save,newdoc,print,find,fit,cleanup,unformat,spell,cut,copy,paste,pastetext,pasteword,delete,undo,redo,insertpagebreak,insertdate,timer,specialchar,keyboard,div,layer,groupbox,image,gallery,flash,media,document,template,youtube,insrow_t,insrow_b,delrow,inscol_l,inscol_r,delcol,inscell,delcell,row,cell,mrgcell,spltcell,break,paragraph,textarea,textbox,passwordfield,hiddenfield,listbox,dropdownbox,optionbutton,checkbox,imagebutton,submit,reset,pushbutton,page,bold,italic,under,left,center,right,justifyfull,justifynone,numlist,bullist,indent,outdent,superscript,subscript,strike,ucase,lcase,rule,link,unlink,anchor,imagemap,borders,selectall,selectnone,help,code,overline,forecolor,backcolor,inserttable,insertform,blockquote,formatpainter,lineheight,dir_ltr,dir_rtl,preview,design,htmlview,map,topline,bottomline,html5';
RTE_DefaultConfig.pngCode_all = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAf4CAMAAAAedghIAAAAA3NCSVQICAjb4U/gAAADAFBMVEX////ZnjQ2VZUgQIAPL2AAAABYed9AcMA4WKIgQIAhOmozMzMgMEAAAAAhOmoAAAAAAACiz/mAqOBYed8AAAAAAABPdppBQUEAAABmmcw/aKAQEBAAAABgke5AeOA/aKAsUcIgULBcnAAAAADL1ei9yN+lsdg2VZUAAADd5O/B2vnL1eh2ltFzi7IAAADs8vzd5O9gke5Yed9AeOAkSIkAAADw+P84jsQ2VZUAAAD////w+P///4T/88vs8vz89LPw8Ov/8KD//wDc6//q6OTp8m3d5O/P4/zZ2uD01KfB2vnw2IDu1pvc1sjL1ejg2IDj0Z7Uzsfw0GDFzt3MzMzrxLuiz/nMzJm9yN+wyP/gyGDAxcuZzP+ux+7QyID/srLwwECwwd2l2QO9vr3GxGC8vqqxvc6Hw/2bvu9mzP/QuHDlsXfQuFC0tLTypZOnxDimtMzwsBCkrv+lsdipsbuUse3QqKCQsP+dr8yRreLIqWeQqPCaqb2op5iLvwBisfmkpaKAqPGAqOCVpLlRsvfZnjTvj3iwoICUnbvDmk2fpUr/iFCUnaqZmcxcp+h3nO+ZmZnMmQCYmIB6leGQoxOBlbd2ltE2pP/AkCCElJxmmcyykjLseFxgke5unkz/cFCMjIpgkOBblMyUjHNzi7JSjO//aD9cnACCgoaEhG5WhN5xgptlg7I4jsQAmf8gkPDoYkF7e3tQg7aQeGC9bypYed/iXF5wd4xHe+lgeLBTeMJAeOBqb8F0c3LUXjBic5f/UgxPdppTcbCcaSU1bv5AcMDlSyZmZmZTZ4JAaLBKZZw/aKAwaMBwYFBwYED6OStWXmpAYJBZWVrWOD0iWuI4WKJDWXAwWLBkU0dXV0GnPkE2VZVTU1IsUcL/IhI1T4YgULBKSkoBUc3lHSQySmIkSInQHiRBQUE3QWkgQKD4DQCvHiMgQIBGPCYhOmrNDw4zMzMKK/+YFhm2DRIgMEAPL2B/ERRqEBEjIyIgGCAAAP8ICIgQEBAAAMwICAgAAADrm4BRAAABAHRSTlMAEREREREiIiIiIiIiIjMzRFVVVVVmd3d3iIiIiJmZmZmZqqq7u7u7u8zMzMzMzN3d3d3d3d3u7u7u////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////0P/PPgAAAAlwSFlzAAAK8AAACvABQqw0mAAAACB0RVh0U29mdHdhcmUATWFjcm9tZWRpYSBGaXJld29ya3MgTVi7kSokAAAgAElEQVR4nO2dCUAb153/p7vrbbfbxPm3SY9td7vbbXNs02237Wab0VrIFZFk2ZaNJdsQgR1FtUKc4JAAQRjZRlLi4PxlIBCR4IRGYIipcJu4ToIBYy12iAQ+AsSGJuBgOXJkNzahuSrbLPq/Y443b8Zn7ADp/wsaaT76vfM3eu/Nm4thPrWysh566KHijRs3VlXt3LmTgw9lFLNYqu7du2moYg4f7+ZgQUYVx3SDVT0cLM54mWOmwZ083Jixk2PmE1KIWPqJnX0crMp4aGdX9+HBwRMndnaP8BDksrgKZbJbgDsB64WKdHcPChDY9SbjJn3L4OAhEVZV9cZbdLqWE4dOEPDIR/n5VuvwiRMnjnPQsbO7p6enbwTqOA8nWTYohyPXLIHYG64YSR0ctJKUg95YLCbCXM7DXq8cqjQkdGGo0cmhSieHKo1OT0IvZ2igITQ00xAwAwW9nEgYE3SOKpsMpdtygZ/Ai2TpqKJ0uZF0EeaqNOnptnxTJCIymwlVsik34hSYycnq0i25NmDo9/J2ThijWq3zRvz5XHibP9fp9PqbI0DeZg561ZyHNWpdMw/9ttx8YNgMTZsi3Obt5x1sMtkiPGxGTK0zbsn2Rt4UoEqt1hqzst8r9EaO+zmoxf7ZCF48YxiYl+OR41ACm3R5G2Aj42roI2Gr6qSw5OXy9wyNMF60FORnbQ0n4bJaNHX4t/YM9fW1NnSOnHQIhhqVcevJoQZWZdzNmzobWLOz86S3wWBy7j7p5fMDEjh58hh6Gx3ik9GloxS26nS2hhEepju3XipMd/LJN4T6+vqOQRjq7BsavbzamzSBtg+0frkuIK/LyjGW1ACG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';

RTE_DefaultConfig.svgCode_default = '<svg viewBox="2 1 20 20"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>';
RTE_DefaultConfig.svgCode_insertcode = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 7 3 12 8 17"/><polyline points="16 7 21 12 16 17"/><line x1="14" y1="5" x2="10" y2="19"/></svg>';
RTE_DefaultConfig.svgCode_aiassist = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><defs><linearGradient id="rte-ai-robot-face" x1="5.2" y1="6.2" x2="18.8" y2="17.2" gradientUnits="userSpaceOnUse"><stop stop-color="#38bdf8"/><stop offset=".55" stop-color="#2563eb"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><path d="M12 4.2V2.5" stroke="#f59e0b" stroke-width="1.7" stroke-linecap="round"/><rect x="5.2" y="6.2" width="13.6" height="11" rx="3.1" fill="url(#rte-ai-robot-face)" stroke="#1d4ed8" stroke-width="1.35"/><circle cx="9.4" cy="11.4" r="1.2" fill="#fef3c7"/><circle cx="14.6" cy="11.4" r="1.2" fill="#fef3c7"/><path d="M9.7 14.5c.7.55 1.45.82 2.3.82s1.6-.27 2.3-.82" stroke="#ffffff" stroke-width="1.55" stroke-linecap="round"/><path d="M7.2 19.4l1.1-2.2M16.8 19.4l-1.1-2.2" stroke="#2563eb" stroke-width="1.55" stroke-linecap="round"/></svg>';
RTE_DefaultConfig.svgCode_aiassist = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><defs><linearGradient id="rte-ai-bot-v4-shell" x1="4.2" y1="5.8" x2="19.8" y2="18.4" gradientUnits="userSpaceOnUse"><stop stop-color="#22d3ee"/><stop offset=".52" stop-color="#2563eb"/><stop offset="1" stop-color="#4338ca"/></linearGradient><linearGradient id="rte-ai-bot-v4-visor" x1="7.8" y1="9" x2="16.2" y2="13.8" gradientUnits="userSpaceOnUse"><stop stop-color="#f8fafc"/><stop offset="1" stop-color="#bfdbfe"/></linearGradient></defs><path d="M12 2.6v2.3" stroke="#f59e0b" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="2.6" r=".9" fill="#fbbf24"/><path d="M4.9 12.2h-1a1.4 1.4 0 010-2.8h1M19.1 9.4h1a1.4 1.4 0 010 2.8h-1" stroke="#2563eb" stroke-width="1.25" stroke-linecap="round"/><rect x="5.2" y="5.9" width="13.6" height="12.2" rx="4" fill="url(#rte-ai-bot-v4-shell)" stroke="#1e40af" stroke-width="1.15"/><rect x="7.6" y="8.8" width="8.8" height="5.2" rx="2.6" fill="url(#rte-ai-bot-v4-visor)" opacity=".98"/><circle cx="10.2" cy="11.4" r=".9" fill="#0f172a"/><circle cx="13.8" cy="11.4" r=".9" fill="#0f172a"/><path d="M9.5 15.3c.78.52 1.6.78 2.5.78s1.72-.26 2.5-.78" stroke="#eff6ff" stroke-width="1.35" stroke-linecap="round"/><path d="M7.7 20.2l1.15-2.15M16.3 20.2l-1.15-2.15" stroke="#2563eb" stroke-width="1.45" stroke-linecap="round"/><path d="M18.6 5.1l.45-.95.45.95.95.45-.95.45-.45.95-.45-.95-.95-.45z" fill="#fde68a"/></svg>';
RTE_DefaultConfig.svgCode_empty = '<svg viewBox="0 0 20 20"></svg>';
RTE_DefaultConfig.svgCode_close = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
RTE_DefaultConfig.svgCode_DialogClose = '<svg viewBox="0 0 18 18"><path fill="currentColor" d="M11.5,9.5l5-5c0.2-0.2,0.2-0.6-0.1-0.9l-1-1c-0.3-0.3-0.7-0.3-0.9-0.1l-5,5l-5-5C4.3,2.3,3.9,2.4,3.6,2.6l-1,1 C2.4,3.9,2.3,4.3,2.5,4.5l5,5l-5,5c-0.2,0.2-0.2,0.6,0.1,0.9l1,1c0.3,0.3,0.7,0.3,0.9,0.1l5-5l5,5c0.2,0.2,0.6,0.2,0.9-0.1l1-1 c0.3-0.3,0.3-0.7,0.1-0.9L11.5,9.5z"/></svg>';


RTE_DefaultConfig.svgCode_bold = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h7a4 4 0 0 1 0 8H6z"/><path d="M6 12h8a4 4 0 0 1 0 8H6z"/></svg>';
RTE_DefaultConfig.svgCode_italic = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>';
RTE_DefaultConfig.svgCode_underline = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="21" x2="20" y2="21"/></svg>';
RTE_DefaultConfig.svgCode_link = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
RTE_DefaultConfig.svgCode_removeformat = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M5 20h6"/><path d="M13 4L8 20"/><line x1="15" y1="15" x2="20" y2="20"/><line x1="20" y1="15" x2="15" y2="20"/></svg>';
RTE_DefaultConfig.svgCode_justifyleft = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>';
RTE_DefaultConfig.svgCode_justifycenter = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="5" y1="18" x2="19" y2="18"/></svg>';
RTE_DefaultConfig.svgCode_justifyright = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>';
RTE_DefaultConfig.svgCode_justifyfull = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
RTE_DefaultConfig.svgCode_justify = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path d="M4 14.5a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm0-3a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm0-3a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5zm0-3a.5.5 0 01.5-.5h11a.5.5 0 010 1h-11a.5.5 0 01-.5-.5z" clip-rule="evenodd"/></svg>';
RTE_DefaultConfig.svgCode_indent = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8 7 12 3 16"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="18" x2="11" y2="18"/></svg>';
RTE_DefaultConfig.svgCode_outdent = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 8 3 12 7 16"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="18" x2="11" y2="18"/></svg>';
RTE_DefaultConfig.svgCode_insertorderedlist = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6.5 16.5c0-.8-1.5-.8-1.5 0M4.5 19h2c0-1-1.5-1-1.5-2"/></svg>';
RTE_DefaultConfig.svgCode_insertunorderedlist = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>';
RTE_DefaultConfig.svgCode_insertblockquote = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2-1 3.5-3 4.5"/><path d="M20 11h-5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2-1 3.5-3 4.5"/></svg>';
RTE_DefaultConfig.svgCode_code = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
RTE_DefaultConfig.svgCode_inserttable = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>';
RTE_DefaultConfig.svgCode_toggleborder = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h2M10 4h4M18 4h2M20 6v2M20 16v2M18 20h2M10 20h4M4 20h2M4 18v-2M4 8V6" stroke-dasharray="0.1 0" /><path d="M9 9h6v6H9z" stroke-dasharray="2 2"/></svg>';
RTE_DefaultConfig.svgCode_subscript = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5l8 9M12 5l-8 9"/><path d="M20 21h-4c0-2 3-2.5 3-4.2 0-.8-.7-1.3-1.5-1.3s-1.5.5-1.5 1.3"/></svg>';
RTE_DefaultConfig.svgCode_superscript = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l8 9M12 7l-8 9"/><path d="M20 9h-4c0-2 3-2.5 3-4.2 0-.8-.7-1.3-1.5-1.3S16 4 16 4.8"/></svg>';
RTE_DefaultConfig.svgCode_strike = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>';
RTE_DefaultConfig.svgCode_insertimage = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
RTE_DefaultConfig.svgCode_paragraph = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path d="M13.9,1.6H5.7c-2.3,0-4.1,1.6-4.1,3.6s1.8,3.6,4.1,3.6v5.1h1.2V2.6h2.9v11.2H11V2.6h2.9V1.6z M5.7,7.7 c-1.6,0-2.9-1.1-2.9-2.6s1.3-2.6,2.9-2.6V7.7z"/></svg>';
RTE_DefaultConfig.svgCode_fullscreenenter = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
RTE_DefaultConfig.svgCode_fullscreenexit = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';
RTE_DefaultConfig.svgCode_insertgallery = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="14" height="14" rx="2"/><circle cx="11.5" cy="11.5" r="1.5"/><path d="M21 16l-4-4-4 4"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>';
RTE_DefaultConfig.svgCode_insertvideo = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 8l5 4-5 4z" fill="currentColor"/></svg>';
RTE_DefaultConfig.svgCode_insertlink = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
RTE_DefaultConfig.svgCode_unlink = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M5.17 11.75l-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="16" y1="19" x2="16" y2="22"/><line x1="19" y1="16" x2="22" y2="16"/></svg>';
RTE_DefaultConfig.svgCode_lcase = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4,12h3v6h2v-6h3v-2H4V12L4,12z M10,6v2h4v10h2V8h4V6H10L10,6z"/></svg>';
RTE_DefaultConfig.svgCode_ucase = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.4,6v2h3.2v10h1.6V8h3.2V6H12.4L12.4,6z M3.5,6v2h3.2v10h1.6V8h3.2V6H3.5L3.5,6z"/></svg>';
// 2026-05-08: title-case command icon. Capital "T" with a lowercase "c"
// underneath, distinguishing it from upper-case (two capital T glyphs)
// and lower-case (two lowercase t glyphs). Same #5F6368 fill as the
// other text-transform commands so the toolbar reads as a coherent set.
RTE_DefaultConfig.svgCode_titlecase = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4,6v2h3.2v10h1.6V8H12V6H4z"/><path d="M16,11.5c-0.6,0-1.2,0.2-1.6,0.6V11h-1.2v7h1.2v-3.5c0-0.8,0.5-1.4,1.3-1.4c0.7,0,1.1,0.4,1.1,1.2V18h1.2v-3.7C18,12.5,17.2,11.5,16,11.5z"/></svg>';
RTE_DefaultConfig.svgCode_copy = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
RTE_DefaultConfig.svgCode_paste = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>';
RTE_DefaultConfig.svgCode_pastetext = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
RTE_DefaultConfig.svgCode_pasteword = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 12l1.3 5 1.7-3.5L12.7 17 14 12"/></svg>';
RTE_DefaultConfig.svgCode_pasteauto = RTE_DefaultConfig.svgCode_paste;

RTE_DefaultConfig.svgCode_save = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
RTE_DefaultConfig.svgCode_load = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

RTE_DefaultConfig.svgCode_fontname = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path d="M5,6h1L4,1H3L1,6h1l0.4-1h2.2L5,6z M2.8,4l0.7-1.8L4.2,4H2.8z M15,15H5v-1h10V15z M14.4,12.8c-0.2,0-0.4-0.2-0.4-0.4V5h-0.3L7,11.7c0,0-1,1-1.5,1V13H8v-0.3H7.6c-0.2,0-0.5-0.4,0.2-1L9,10.5h3v1.9c0,0.2-0.2,0.4-0.4,0.4c0,0,0,0,0,0h-0.4V13h3.5v-0.3H14.4z M9.5,10L12,7.5V10H9.5z M2.4,12.4l-0.7-0.7l10-10l0.7,0.7L2.4,12.4z"/></svg>';
RTE_DefaultConfig.svgCode_fontsize = '<svg viewBox="-2 -2 20 20" fill="currentColor"><polygon points="7.9,4.2 5.6,1.8 3.2,4.2 2.8,3.7 5.6,0.9 8.4,3.7 "/><polygon points="5.6,8.7 2.8,5.9 3.2,5.5 5.6,7.8 7.9,5.5 8.4,5.9 "/><path d="M15,14.6l-0.8-2.5H9.8L9,14.6H7.5l3.7-11h1.7l3.7,11H15z M13.7,10.6l-1.7-5l-1.7,5H13.7z"/></svg>';
RTE_DefaultConfig.svgCode_redo = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>';
RTE_DefaultConfig.svgCode_undo = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>';
RTE_DefaultConfig.svgCode_delete = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
RTE_DefaultConfig.svgCode_find = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
RTE_DefaultConfig.svgCode_preview = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
RTE_DefaultConfig.svgCode_insertdocument = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
RTE_DefaultConfig.svgCode_inserttemplate = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>';
// 2026-06-04 Modern block-type commands (callout / columns / toggle), backed by blocktypes.js plugin.
RTE_DefaultConfig.svgCode_insertcallout = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="26" height="20" rx="2"/><path d="M16 12v6"/><path d="M16 21h.01"/></svg>';
RTE_DefaultConfig.svgCode_insertcolumns = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="9" height="22" rx="1"/><rect x="19" y="5" width="9" height="22" rx="1"/></svg>';
RTE_DefaultConfig.svgCode_inserttoggle = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8l8 8-8 8"/></svg>';
// 2026-06-04 Equation-editor command, backed by mathdialog.js plugin.
RTE_DefaultConfig.svgCode_insertmath = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h13l-7 19"/><path d="M20 15h8"/><path d="M20 22h8"/></svg>';
// 2026-06-04 Bookmark preview card, backed by bookmarkcard.js plugin.
RTE_DefaultConfig.svgCode_insertbookmark = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="24" height="18" rx="2"/><path d="M4 13h24"/><circle cx="9" cy="10" r=".9" fill="currentColor"/></svg>';
// 2026-06-04 Spell check, backed by spellcheck.js plugin.
RTE_DefaultConfig.svgCode_spellcheck = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 22l7-15 7 15"/><path d="M8 16h8"/><path d="M21 21l2 2 4-4"/></svg>';
// 2026-06-04 Smart chips, backed by smartchips.js plugin.
RTE_DefaultConfig.svgCode_insertdatechip = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="6" width="24" height="22" rx="2"/><path d="M4 12h24"/><path d="M10 3v6"/><path d="M22 3v6"/></svg>';
RTE_DefaultConfig.svgCode_insertchip = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="26" height="12" rx="6"/><circle cx="10" cy="16" r="2"/><path d="M16 16h8"/></svg>';
// 2026-06-04 Email toolkit, backed by emailtoolkit.js plugin.
RTE_DefaultConfig.svgCode_emailexport = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="24" height="18" rx="2"/><path d="M5 9l11 8 11-8"/></svg>';
RTE_DefaultConfig.svgCode_insertdiagram = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="9" height="7" rx="1"/><rect x="19" y="4" width="9" height="7" rx="1"/><rect x="11.5" y="21" width="9" height="7" rx="1"/><path d="M8.5 11v4h15v-4M16 15v6"/></svg>';
RTE_DefaultConfig.svgCode_readaloud = '<svg viewBox="-2 -2 36 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12v8h5l7 5V7l-7 5H5z"/><path d="M22 11a5 5 0 010 9"/><path d="M26 8a9 9 0 010 15"/></svg>';
RTE_DefaultConfig.svgCode_print = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
RTE_DefaultConfig.svgCode_newdoc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';
RTE_DefaultConfig.svgCode_lineheight = '<svg viewBox="-2 -2 36 36" fill="currentColor"><rect width="13" height="2" x="17" y="6"></rect><rect width="10" height="2" x="17" y="12"></rect><rect width="13" height="2" x="17" y="18"></rect><rect width="10" height="2" x="17" y="24"></rect><polygon points="11.59 13.41 8 9.83 8 9.83 4.41 13.42 3 12 8 7 13 12 11.59 13.41"></polygon><polygon points="11.59 18.59 8 22.17 8 22.17 4.41 18.58 3 20 8 25 13 20 11.59 18.59"></polygon></svg>';
RTE_DefaultConfig.svgCode_insertemoji = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
RTE_DefaultConfig.svgCode_insertchars = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20h4l-2.3-2.6a6 6 0 1 1 8.6 0L14 20h4"/></svg>';
RTE_DefaultConfig.svgCode_selectall = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';
RTE_DefaultConfig.svgCode_inserthorizontalrule = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>';
RTE_DefaultConfig.svgCode_insertdate = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
RTE_DefaultConfig.svgCode_forecolor = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.6,12.6h1.2l-4.3-9.8H9.3L5,12.6h1.2l1-2.3h5.4L13.6,12.6z M7.8,9.2l2.1-4.8H10l2.1,4.8L7.8,9.2z M3.8,14.4h12.3v2.3H3.8V14.4z"/></svg>';
RTE_DefaultConfig.svgCode_backcolor = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3.8,14.4h12.3v2.3H3.8V14.4z"/><path d="M15.8,8.1c0-0.1,0-0.2-0.1-0.3L11,3.1c0,0-0.1,0-0.1-0.1V2H9.9v1.5L4.1,8.2C3.9,8.3,3.8,8.6,4,8.8l4.6,4.6c0.1,0.1,0.2,0.2,0.4,0.2h0c0.1,0,0.3,0,0.4-0.1l5.3-4.3v2c0,0.3,0.2,0.5,0.5,0.5c0.3,0,0.5-0.2,0.5-0.5V8.1C15.8,8.1,15.8,8.1,15.8,8.1z M9.1,12.4L5.2,8.5l4.6-3.8v2.1h1.1V4.5L14.5,8L9.1,12.4z"/></svg>';
RTE_DefaultConfig.svgCode_help = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
RTE_DefaultConfig.svgCode_tableheader = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><rect x="3" y="3" width="18" height="6" fill="currentColor" opacity="0.25" stroke="none"/></svg>';
RTE_DefaultConfig.svgCode_menu_tablecell = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>';
RTE_DefaultConfig.svgCode_menu_tablerow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><rect x="3" y="9" width="18" height="6" fill="currentColor" opacity="0.18" stroke="none"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>';
RTE_DefaultConfig.svgCode_menu_tablecolumn = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><rect x="9" y="3" width="6" height="18" fill="currentColor" opacity="0.18" stroke="none"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>';

RTE_DefaultConfig.svgCode_menu_table = RTE_DefaultConfig.svgCode_inserttable;
RTE_DefaultConfig.svgCode_camera = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
RTE_DefaultConfig.svgCode_cut = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>';
RTE_DefaultConfig.svgCode_insertimagedragdrop = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 3"/><circle cx="9" cy="9" r="1.5"/><path d="M21 14l-5-4-6 6"/></svg>';
RTE_DefaultConfig.svgCode_imagescale = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9l-4 4M9 9V6M9 9H6M15 15l4-4M15 15v3M15 15h3" stroke-width="1.6"/></svg>';
RTE_DefaultConfig.svgCode_linkstyle = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
RTE_DefaultConfig.svgCode_imagecaption = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="13" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="M21 12l-5-4-7 6"/><line x1="3" y1="20" x2="15" y2="20"/></svg>';
RTE_DefaultConfig.svgCode_imagestyle = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path fill="#f6f6f6" d="M.572 9.992l6.414-6.415 1.5 1.5 4.5-4.5 2.414 2.414-4.5 4.5 1.5 1.5-6.415 6.415-5.413-5.414z" /><path fill="#424242" d="M6 14l-4-4.008 3-2.992 4.001 3.993-3.001 3.007zm5-5.008l-4-3.992-1 .991 3.986 4.009 1.014-1.008zm3-6.001l-1.014-.991-3.984 3.991.998 1 4-4z"/></svg>';
RTE_DefaultConfig.svgCode_controlopenlink = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
RTE_DefaultConfig.svgCode_controleditlink = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
RTE_DefaultConfig.svgCode_controlalt = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/><path d="M13 7h6"/></svg>';
RTE_DefaultConfig.svgCode_controlsize = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path fill="#f6f6f6" d="M16 7h-2v7h-7v2h-7v-7h2v-7h7v-2h7v7z"/><path fill="currentColor" d="M13 3v10h-10v-10h10zm-1 8l-1.5-1.549-2 1.549-2.5-3.126-2 2.21v1.916h8v-1zm0-7h-8v4.084l2-2.21 2.5 3.126 2-1 1.5 1v-5zm-2 1h-2v2h2v-2zm5 1l-.019-5h-4.981v1h4v4h1zm-14 4l.019 5h4.981v-1h-4v-4h-1z"/><path fill="#F0EFF1" d="M12 12h-8v-1.916l2-2.21 2.5 3.126 2-1.549 1.5 1.549v1zm0-8v5l-1.5-1-2 1-2.5-3.126-2 2.21v-4.084h8zm-2 1h-2v2h2v-2z" id="iconFg"/></svg>';
RTE_DefaultConfig.svgCode_controlsizeauto = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path fill-rule="evenodd" d="M0 3.5A1.5 1.5 0 011.5 2h13A1.5 1.5 0 0116 3.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 010 12.5v-9zM1.5 3a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h13a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-13z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M2 4.5a.5.5 0 01.5-.5h3a.5.5 0 010 1H3v2.5a.5.5 0 01-1 0v-3zm12 7a.5.5 0 01-.5.5h-3a.5.5 0 010-1H13V8.5a.5.5 0 011 0v3z" clip-rule="evenodd"/></svg>';
RTE_DefaultConfig.svgCode_controlsize100 = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path d="M8,10.5c0,1.8-2.1,3.1-3.7,2.2L2,15l-1-1l2.3-2.3C1.4,8,7.9,6.4,8,10.5z M5.5,9c-1.9,0-1.9,3,0,3C7.4,12,7.4,9,5.5,9z M13.1,4.9c0.4,2.7-3.6,2.7-3.2,0C9.6,2.3,13.5,2.3,13.1,4.9z M12.1,4.9c0.2-1.7-1.4-1.7-1.2,0C10.7,6.6,12.3,6.6,12.1,4.9z M9.4,4.9c0.4,2.7-3.6,2.7-3.2,0C5.8,2.3,9.7,2.3,9.4,4.9z M8.3,4.9c0.2-1.7-1.4-1.7-1.2,0	C6.9,6.6,8.6,6.6,8.3,4.9z M5.3,6.9H2.8V6.2h0.8v-2H2.8V3.5c0.4,0,0.9-0.1,0.9-0.5h0.9v3.2h0.8V6.9z M15,1v8H8.6C8.5,8.6,8.2,8.3,7.9,8H14V2H2v6h1.1C2.8,8.3,2.5,8.6,2.4,9H1V1H15z"/></svg>';
RTE_DefaultConfig.svgCode_controlsize75 = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path d="M8,10.5c0,1.8-2.1,3.1-3.7,2.2L2,15l-1-1l2.3-2.3C1.4,8,7.9,6.4,8,10.5z M5.5,9c-1.9,0-1.9,3,0,3C7.4,12,7.4,9,5.5,9z M13.2,5.6c0,1.5-2,1.6-3,1.2V5.9h0.1c2.2,1.3,2.6-1.5,0-0.7V3h2.8v0.7h-1.8v0.6C12.1,4.3,13.3,4.5,13.2,5.6z M9.4,3.8L7.7,6.9H6.6l1.8-3.1h-2V3h3V3.8z M15,1v8H8.6C8.5,8.6,8.2,8.3,7.9,8H14V2H2v6h1.1C2.8,8.3,2.5,8.6,2.4,9H1V1H15z"/></svg>';
RTE_DefaultConfig.svgCode_controlsize50 = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path d="M8,10.5c0,1.8-2.1,3.1-3.7,2.2L2,15l-1-1l2.3-2.3C1.4,8,7.9,6.4,8,10.5z M5.5,9c-1.9,0-1.9,3,0,3C7.4,12,7.4,9,5.5,9z M13.3,4.9c0.4,2.7-3.6,2.7-3.2,0C9.7,2.3,13.7,2.3,13.3,4.9z M12.3,4.9c0.2-1.7-1.4-1.7-1.2,0C10.9,6.6,12.5,6.6,12.3,4.9z M9.4,5.6c0,1.5-2,1.6-3,1.2V5.9h0.1c2.2,1.3,2.6-1.5,0-0.7V3h2.8v0.7H7.5v0.6C8.3,4.3,9.5,4.5,9.4,5.6z M15,1v8H8.6C8.5,8.6,8.2,8.3,7.9,8H14V2H2v6h1.1C2.8,8.3,2.5,8.6,2.4,9H1V1H15z"/></svg>';
RTE_DefaultConfig.svgCode_controlsize25 = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path d="M8,10.5c0,1.8-2.1,3.1-3.7,2.2L2,15l-1-1l2.3-2.3C1.4,8,7.9,6.4,8,10.5z M5.5,9c-1.9,0-1.9,3,0,3C7.4,12,7.4,9,5.5,9z M13.2,5.6c0,1.5-2,1.6-3,1.2V5.9h0.1c2.2,1.3,2.6-1.5,0-0.7V3h2.8v0.7h-1.8v0.6C12.1,4.3,13.3,4.5,13.2,5.6z M9.5,6.9h-3V6.2C8,5.6,9.4,2.7,6.7,4H6.6V3.2c2.9-1.2,3.7,1.6,1.2,3h1.7V6.9z M15,1v8H8.6C8.5,8.6,8.2,8.3,7.9,8H14V2H2v6h1.1C2.8,8.3,2.5,8.6,2.4,9H1V1H15z"/></svg>';
RTE_DefaultConfig.svgCode_togglemore = RTE_DefaultConfig.svgCode_more = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.5 13a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0-5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0-5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" clip-rule="evenodd"/></svg>';
RTE_DefaultConfig.svgCode_inlinestyle = '<svg viewBox="-2 -2 20 20" fill="currentColor"><path d="M5.9,13.6h1v1h-1V13.6z M3.9,10.6h1v-1h-1V10.6z M7.9,14.6h1v-1h-1V14.6z M3.9,12.6h1v-1h-1V12.6z	 M3.9,14.6h1v-1h-1V14.6z M13.9,14.6h1v-1h-1V14.6z M9.9,14.6h1v-1h-1V14.6z M11.9,14.6h1v-1h-1V14.6z M14.9,3.6v9h-2v-2H9.4l-1.6,2	h-2l7-9H14.9z M12.9,6.1l-2.3,2.9h2.3V6.1z"/><path d="M6.9,5.6h-2v2h-2v-2h-2v-2h2v-2h2v2h2V5.6z"/></svg>';
RTE_DefaultConfig.svgCode_floatleft = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="9" height="9" rx="1"/><line x1="14" y1="5" x2="21" y2="5"/><line x1="14" y1="9" x2="21" y2="9"/><line x1="3" y1="17" x2="21" y2="17"/><line x1="3" y1="21" x2="21" y2="21"/></svg>';
RTE_DefaultConfig.svgCode_floatright = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="4" width="9" height="9" rx="1"/><line x1="3" y1="5" x2="10" y2="5"/><line x1="3" y1="9" x2="10" y2="9"/><line x1="3" y1="17" x2="21" y2="17"/><line x1="3" y1="21" x2="21" y2="21"/></svg>'
RTE_DefaultConfig.svgCode_pmoveup = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
RTE_DefaultConfig.svgCode_pmovedown = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
RTE_DefaultConfig.svgCode_plusbtn = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M 9.9999997,4.3983051 A 0.62241054,0.62241054 0 0 0 9.3775887,5.0207156 V 9.3775893 H 5.0207156 a 0.62241067,0.62241067 0 0 0 0,1.2448207 h 4.3568731 v 4.356874 a 0.62241054,0.62241054 0 0 0 1.2448213,0 V 10.62241 h 4.356874 a 0.62241067,0.62241067 0 0 0 0,-1.2448207 H 10.62241 V 5.0207156 A 0.62241054,0.62241054 0 0 0 9.9999997,4.3983051 Z" clip-rule="evenodd"/></svg>'
RTE_DefaultConfig.svgCode_imageupload = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 17l-5-5-6 6"/><path d="M12 3v8"/><path d="M8.5 6.5L12 3l3.5 3.5"/></svg>'
RTE_DefaultConfig.svgCode_documentupload = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M12 17V9"/><path d="M8.5 12.5L12 9l3.5 3.5"/></svg>';

RTE_DefaultConfig.svgCode_tablecellmerge = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="21" y2="12"/><polyline points="6 9 9 12 6 15"/><polyline points="18 9 15 12 18 15"/></svg>';
RTE_DefaultConfig.svgCode_tablecellsplitver = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="21" y2="12"/><polyline points="11 9 8 12 11 15"/><polyline points="13 9 16 12 13 15"/></svg>';
RTE_DefaultConfig.svgCode_tablecellsplithor = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="21"/><polyline points="9 11 12 8 15 11"/><polyline points="9 13 12 16 15 13"/></svg>';
RTE_DefaultConfig.svgCode_tablecellforecolor = '<svg viewBox="-2 -2 20 20"><path fill="currentColor" d="M14,13v2h-2v-2H14z M7,15h2v-2H7V15z M2,15h2v-2H2V15z M11,12l-0.8-2.5H5.8L5,12H3.5L7.2,1h1.7 l3.7,11H11z M9.7,8L8,3L6.3,8H9.7z"/></svg>';
RTE_DefaultConfig.svgCode_tablecellbackcolor = '<svg viewBox="-2 -2 20 20"><path fill="currentColor" d="M15,1v9h-5V9h4V2H7v4H6V1H15z M1,15h8V7H1V15z M8,3v3h2v2h3V3H8z"/></svg>';
RTE_DefaultConfig.svgCode_tablerowinsertabove = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="10" width="18" height="11" rx="1"/><line x1="9" y1="10" x2="9" y2="21"/><line x1="15" y1="10" x2="15" y2="21"/><line x1="3" y1="15.5" x2="21" y2="15.5"/><line x1="12" y1="3" x2="12" y2="7"/><line x1="10" y1="5" x2="14" y2="5"/></svg>';
RTE_DefaultConfig.svgCode_tablerowinsertbelow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="11" rx="1"/><line x1="9" y1="3" x2="9" y2="14"/><line x1="15" y1="3" x2="15" y2="14"/><line x1="3" y1="8.5" x2="21" y2="8.5"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="10" y1="19" x2="14" y2="19"/></svg>';
RTE_DefaultConfig.svgCode_tablecolumninsertleft = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="3" width="11" height="18" rx="1"/><line x1="10" y1="9" x2="21" y2="9"/><line x1="10" y1="15" x2="21" y2="15"/><line x1="15.5" y1="3" x2="15.5" y2="21"/><line x1="3" y1="12" x2="7" y2="12"/><line x1="5" y1="10" x2="5" y2="14"/></svg>';
RTE_DefaultConfig.svgCode_tablecolumninsertright = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="11" height="18" rx="1"/><line x1="3" y1="9" x2="14" y2="9"/><line x1="3" y1="15" x2="14" y2="15"/><line x1="8.5" y1="3" x2="8.5" y2="21"/><line x1="17" y1="12" x2="21" y2="12"/><line x1="19" y1="10" x2="19" y2="14"/></svg>';
RTE_DefaultConfig.svgCode_tablecolumndelete = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="12" y1="8" x2="12" y2="16" stroke-width="2.5"/></svg>';
RTE_DefaultConfig.svgCode_tablerowdelete = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="8" y1="12" x2="16" y2="12" stroke-width="2.5"/></svg>';
RTE_DefaultConfig.svgCode_tabledelete = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="16" y1="16" x2="22" y2="22"/><line x1="22" y1="16" x2="16" y2="22"/></svg>';
RTE_DefaultConfig.svgCode_tableautosize = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><path d="M16 16l5 5M21 16v5h-5" stroke-width="1.5"/></svg>';
RTE_DefaultConfig.svgCode_pduplicate = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
RTE_DefaultConfig.svgCode_paragraphstyle = '<svg viewBox="-2 -2 20 20"><path fill="#424242" d="M12,1v3H9V1H12z M12,4v3h3V4H12z M1,15h1v-1H1V15z M1,9h1V8H1V9z M1,11h1v-1H1V11z M1,13h1v-1H1V13z M1,7h1V6H1V7z M1,5h1V4H1V5z M3,15h1v-1H3V15z M5,15h1v-1H5V15z M7,15h1v-1H7V15z M9,15h1v-1H9V15z M11,15h1v-1h-1V15z"/><path fill="#424242" d="M7.7,3H6.3L3,13h1.5l0.7-2h3.7l0.7,2H11L7.7,3z M5.7,9.5l1.3-4l1.3,4H5.7z"/></svg>';
RTE_DefaultConfig.svgCode_paragraphop = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4a5 5 0 0 0 0 10"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="16" y1="4" x2="16" y2="20"/><line x1="10" y1="4" x2="18" y2="4"/></svg>';

RTE_DefaultConfig.svgCode_removetag = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M5 20h6"/><path d="M13 4L8 20"/><line x1="15" y1="15" x2="20" y2="20"/><line x1="20" y1="15" x2="15" y2="20"/></svg>';
RTE_DefaultConfig.svgCode_toggle_paragraph = RTE_DefaultConfig.svgCode_paragraph;
RTE_DefaultConfig.svgCode_menu_paragraph = RTE_DefaultConfig.svgCode_paragraph;
RTE_DefaultConfig.svgCode_toggle_paragraphop = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="17" x2="9" y2="17"/></svg>';
RTE_DefaultConfig.svgCode_menu_paragraphop = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="17" y2="17"/><polyline points="16,15 19,18 22,15"/></svg>';
RTE_DefaultConfig.svgCode_paragraphs = RTE_DefaultConfig.svgCode_paragraph;
RTE_DefaultConfig.svgCode_controljustify = RTE_DefaultConfig.svgCode_justify;
RTE_DefaultConfig.svgCode_editimage = RTE_DefaultConfig.svgCode_insertimage;
RTE_DefaultConfig.svgCode_controlinsertlink = RTE_DefaultConfig.svgCode_insertlink;
RTE_DefaultConfig.svgCode_controlunlink = RTE_DefaultConfig.svgCode_unlink;
RTE_DefaultConfig.svgCode_pdelete = RTE_DefaultConfig.svgCode_delete;
RTE_DefaultConfig.svgCode_pmore = RTE_DefaultConfig.svgCode_more;
RTE_DefaultConfig.svgCode_insertpagebreak = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12a1 1 0 0 1 1 1v5H5V3a1 1 0 0 1 1-1z"/><path d="M6 22h12a1 1 0 0 0 1-1v-5H5v5a1 1 0 0 0 1 1z"/><line x1="3" y1="12" x2="5" y2="12"/><line x1="7" y1="12" x2="9" y2="12"/><line x1="11" y1="12" x2="13" y2="12"/><line x1="15" y1="12" x2="17" y2="12"/><line x1="19" y1="12" x2="21" y2="12"/></svg>';
RTE_DefaultConfig.svgCode_insertmergefield = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4l-4 4 4 4"/><path d="M16 4l4 4-4 4"/><line x1="4" y1="8" x2="20" y2="8"/><line x1="7" y1="16" x2="17" y2="16"/><line x1="7" y1="20" x2="17" y2="20"/></svg>';
RTE_DefaultConfig.svgCode_insertfootnote = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="11" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>';
RTE_DefaultConfig.svgCode_inserttoc = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="17" y2="7"/><line x1="3" y1="12" x2="17" y2="12"/><line x1="3" y1="17" x2="17" y2="17"/><circle cx="20" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="20" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="20" cy="17" r="1" fill="currentColor" stroke="none"/></svg>';
RTE_DefaultConfig.svgCode_inserttodolist = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="13" y1="8" x2="21" y2="8"/><line x1="13" y1="16" x2="21" y2="16"/><polyline points="3 8 5.5 10.5 10 5.5"/><polyline points="3 16 5.5 18.5 10 13.5"/></svg>';
RTE_DefaultConfig.svgCode_importword = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 13 10 18 12 13 14 18 16 13"/></svg>';
RTE_DefaultConfig.svgCode_exportword = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 13 10 18 12 13 14 18 16 13"/></svg>';
RTE_DefaultConfig.svgCode_insertmention = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.6 7.2"/></svg>';
RTE_DefaultConfig.svgCode_insertcomment = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4v12a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2z"/><line x1="7" y1="7" x2="17" y2="7"/><line x1="7" y1="11" x2="17" y2="11"/><line x1="7" y1="15" x2="13" y2="15"/></svg>';
RTE_DefaultConfig.svgCode_trackchanges = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="9 12 11 14.5 15.5 9.5"/></svg>';
RTE_DefaultConfig.svgCode_revisionhistory = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.5 14a9 9 0 1 0 1.3-5.3L1 10"/><polyline points="12 7 12 12 16 14"/></svg>';
RTE_DefaultConfig.svgCode_multilevellist = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="11" y1="6" x2="21" y2="6"/><line x1="11" y1="12" x2="21" y2="12"/><line x1="11" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="7" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/></svg>';
RTE_DefaultConfig.svgCode_spellcheck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12l4 4 8-9"/><path d="M4 6h7"/><path d="M7.5 3.5v5"/></svg>';
RTE_DefaultConfig.svgCode_ltr = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="18" y2="6"/><line x1="4" y1="11" x2="18" y2="11"/><line x1="4" y1="16" x2="12" y2="16"/><polyline points="14,18 18,14 14,10"/></svg>';
RTE_DefaultConfig.svgCode_rtl = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="20" y2="6"/><line x1="6" y1="11" x2="20" y2="11"/><line x1="12" y1="16" x2="20" y2="16"/><polyline points="10,10 6,14 10,18"/></svg>';
RTE_DefaultConfig.svgCode_styles = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5h12"/><path d="M9 5v14"/><path d="M5 19h8"/><path d="M15 9h4"/><path d="M15 13h4"/><path d="M15 17h4"/></svg>';
RTE_DefaultConfig.svgCode_insertanchor = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v10"/><path d="M8.5 8.5H15.5"/><path d="M6 13.5a6 6 0 0 0 12 0"/><path d="M9 19h6"/></svg>';
RTE_DefaultConfig.svgCode_tablecell = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/><rect x="12" y="12" width="8" height="8" fill="currentColor" fill-opacity="0.12" stroke="none"/></svg>';
RTE_DefaultConfig.svgCode_tablerow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="4" y1="14" x2="20" y2="14"/><rect x="4" y="10" width="16" height="4" fill="currentColor" fill-opacity="0.12" stroke="none"/></svg>';
RTE_DefaultConfig.svgCode_tablecolumn = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="10" y1="4" x2="10" y2="20"/><line x1="14" y1="4" x2="14" y2="20"/><rect x="10" y="4" width="4" height="16" fill="currentColor" fill-opacity="0.12" stroke="none"/></svg>';

RTE_DefaultConfig.controlSelectionClass = "rte-control-selected"
RTE_DefaultConfig.controlSelectionMargin = 7;
RTE_DefaultConfig.controlSelectionLineAdd = 3;


RTE_DefaultConfig.text_language = "Language";

RTE_DefaultConfig.text_ok = "OK";
RTE_DefaultConfig.text_cancel = "Cancel";

RTE_DefaultConfig.text_normal = "Normal"
RTE_DefaultConfig.text_h1 = "Headline 1"
RTE_DefaultConfig.text_h2 = "Headline 2"
RTE_DefaultConfig.text_h3 = "Headline 3"
RTE_DefaultConfig.text_h4 = "Headline 4"
RTE_DefaultConfig.text_h5 = "Headline 5"
RTE_DefaultConfig.text_h6 = "Headline 6"
RTE_DefaultConfig.text_h7 = "Headline 7"

RTE_DefaultConfig.text_close = "Close";

RTE_DefaultConfig.text_bold = "Bold";
RTE_DefaultConfig.text_italic = "Italic";
RTE_DefaultConfig.text_underline = "Underline";
RTE_DefaultConfig.text_strike = "Strike Line";
RTE_DefaultConfig.text_superscript = "Superscript";
RTE_DefaultConfig.text_subscript = "Subcript";
RTE_DefaultConfig.text_ucase = "Upper Case";
RTE_DefaultConfig.text_lcase = "Lower Case";
RTE_DefaultConfig.text_titlecase = "Title Case";

// 2026-05-08: SVG icons + localised labels for the live document-outline,
// content-minimap, and accessibility-checker panels. Each plugin reads
// these defaults at toolbar-build time so customers can re-skin or
// translate without forking the plugin source.
RTE_DefaultConfig.svgCode_documentoutline = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="20" y2="6"/><line x1="9" y1="11" x2="20" y2="11"/><line x1="12" y1="16" x2="20" y2="16"/><line x1="3" y1="6" x2="3.5" y2="6"/><line x1="6" y1="11" x2="6.5" y2="11"/><line x1="9" y1="16" x2="9.5" y2="16"/></svg>';
RTE_DefaultConfig.text_documentoutline = "Document outline";
RTE_DefaultConfig.text_documentoutlinehint = "Live table of contents — click any heading to jump to it.";

RTE_DefaultConfig.svgCode_contentminimap = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="6" y1="7" x2="14" y2="7"/><line x1="6" y1="11" x2="18" y2="11"/><line x1="6" y1="15" x2="12" y2="15"/><line x1="6" y1="19" x2="16" y2="19"/></svg>';
RTE_DefaultConfig.text_contentminimap = "Content minimap";
RTE_DefaultConfig.text_contentminimaphint = "Bird's-eye view of the document — drag the highlight box to scroll.";

RTE_DefaultConfig.svgCode_accessibilitychecker = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="7" r="1.4" fill="currentColor"/><path d="M9 11.5h6"/><path d="M12 11.5v8"/><path d="M9 19.5l3-4 3 4"/></svg>';
RTE_DefaultConfig.text_accessibilitychecker = "Accessibility checker";
RTE_DefaultConfig.text_accessibilitycheckerhint = "Scan the document for missing alt text, empty headings, low contrast, and other a11y issues.";

RTE_DefaultConfig.text_removeformat = "Remove Format";

RTE_DefaultConfig.text_insertlink = "Insert Link";
RTE_DefaultConfig.text_openlink = "Open Link";
RTE_DefaultConfig.text_editlink = "Edit Link";
RTE_DefaultConfig.text_unlink = "Remove Link";

RTE_DefaultConfig.text_controlinsertlink = "@insertlink";
RTE_DefaultConfig.text_controleditlink = "@editlink";
RTE_DefaultConfig.text_controlopenlink = "@openlink";
RTE_DefaultConfig.text_controlunlink = "@unlink";

RTE_DefaultConfig.text_lineheight = "Line Height";

RTE_DefaultConfig.text_indent = "Indent";
RTE_DefaultConfig.text_outdent = "Outdent";

RTE_DefaultConfig.text_insertblockquote = "Block Quote";

RTE_DefaultConfig.text_insertorderedlist = "Ordered List";
RTE_DefaultConfig.text_insertunorderedlist = "Unordered List";

RTE_DefaultConfig.text_inserthorizontalrule = "Insert Horizontal Rule";
RTE_DefaultConfig.text_insertdate = "Insert Date";
RTE_DefaultConfig.text_inserttable = "Insert Table";
RTE_DefaultConfig.text_insertimage = "Insert Image";
RTE_DefaultConfig.text_insertvideo = "Insert Video";

RTE_DefaultConfig.text_insertcode = "Insert Code";
RTE_DefaultConfig.text_insertmergefield = "Insert Merge Field";
RTE_DefaultConfig.text_insertfootnote = "Insert Footnote";
RTE_DefaultConfig.text_inserttoc = "Insert Table of Contents";
RTE_DefaultConfig.text_revisionhistory = "Revision History";
RTE_DefaultConfig.text_mergefieldhint = "Insert a client-side merge placeholder into the document.";
RTE_DefaultConfig.text_mergefieldname = "Field Name";
RTE_DefaultConfig.text_mergefieldnameplaceholder = "FirstName";
RTE_DefaultConfig.text_mergefielddisplayplaceholder = "{{FirstName}}";
RTE_DefaultConfig.text_footnote = "Footnote";
RTE_DefaultConfig.text_footnotehint = "Add a footnote reference at the cursor and store the note at the bottom of the document.";
RTE_DefaultConfig.text_footnoteplaceholder = "Type the footnote text here.";
RTE_DefaultConfig.text_footnotes = "Footnotes";
RTE_DefaultConfig.text_tocempty = "Add at least one heading before inserting a table of contents.";
RTE_DefaultConfig.text_revisionhistoryhint = "Restore an earlier client-side snapshot from the current undo history.";
RTE_DefaultConfig.text_revisionrestore = "Restore";
RTE_DefaultConfig.text_revisioncurrent = "Current";
RTE_DefaultConfig.text_revisionempty = "No text captured in this snapshot.";

RTE_DefaultConfig.text_html2pdf = "Create PDF";
RTE_DefaultConfig.text_insertemoji = "Insert Emoji";
RTE_DefaultConfig.text_insertchars = "Special characters";
RTE_DefaultConfig.text_characters = "Characters";
RTE_DefaultConfig.text_words = "Words";

RTE_DefaultConfig.text_styles = "Styles";// Quick Styles dropdown (named block looks).
RTE_DefaultConfig.text_inlinestyles = "Text styles";// Quick Styles applied to the selection.
RTE_DefaultConfig.text_fontname = "Font";
RTE_DefaultConfig.text_fontsize = "Size";
RTE_DefaultConfig.text_forecolor = "Text Color";
RTE_DefaultConfig.text_backcolor = "Back Color";

RTE_DefaultConfig.text_justify = "Justify"
RTE_DefaultConfig.text_justifyleft = "Justify Left"
RTE_DefaultConfig.text_justifyright = "Justify Right"
RTE_DefaultConfig.text_justifycenter = "Justify Center"
RTE_DefaultConfig.text_justifyfull = "Justify Full"
RTE_DefaultConfig.text_justifynone = "Justify None"

RTE_DefaultConfig.text_delete = "Delete";
RTE_DefaultConfig.text_save = "Save file";

RTE_DefaultConfig.text_selectall = "Select All";

RTE_DefaultConfig.text_code = "HTML Code";
RTE_DefaultConfig.text_preview = "Preview";
RTE_DefaultConfig.text_print = "Print";
RTE_DefaultConfig.text_undo = "Undo";
RTE_DefaultConfig.text_redo = "Redo";
RTE_DefaultConfig.text_more = "More...";
RTE_DefaultConfig.text_newdoc = "New Doc";
RTE_DefaultConfig.text_help = "Help";

RTE_DefaultConfig.text_fullscreenenter = "Fit to Window";
RTE_DefaultConfig.text_fullscreenexit = "Exit Full Screen";
RTE_DefaultConfig.text_fullscreen = "@text_fullscreenenter";

RTE_DefaultConfig.text_imageeditor = "Image Editor";


RTE_DefaultConfig.text_imagestyle = "Image Styles";
RTE_DefaultConfig.text_inlinestyle = "Inline Styles";
RTE_DefaultConfig.text_paragraphstyle = "Paragraph Styles";

RTE_DefaultConfig.text_linkstyle = "Link Styles";
RTE_DefaultConfig.text_link = "Link";
RTE_DefaultConfig.text_style = "Styles";
RTE_DefaultConfig.text_cssclass = "Css Classes";
RTE_DefaultConfig.text_url = "Url";
RTE_DefaultConfig.text_byurl = "By Url";
RTE_DefaultConfig.text_upload = "Upload";
RTE_DefaultConfig.text_size = "Size";

RTE_DefaultConfig.text_text = "Text";

RTE_DefaultConfig.text_opennewwin = "Open in new tab";

RTE_DefaultConfig.text_insert = "Insert";
RTE_DefaultConfig.text_update = "Update";

RTE_DefaultConfig.text_find = "Find&Replace";
RTE_DefaultConfig.text_findwhat = "Find";
RTE_DefaultConfig.text_replacewith = "Replace";

RTE_DefaultConfig.text_findnext = "Next";
RTE_DefaultConfig.text_replaceonce = "Replace";
RTE_DefaultConfig.text_replaceall = "Replace All";
RTE_DefaultConfig.text_matchcase = "Match Case";
RTE_DefaultConfig.text_matchword = "Match Word";

RTE_DefaultConfig.text_move_down = "Move Down";
RTE_DefaultConfig.text_move_up = "Move Up";

RTE_DefaultConfig.text_controlsizeauto = "Auto size"
RTE_DefaultConfig.text_controlsize100 = "100% width"
RTE_DefaultConfig.text_controlsize75 = "75% width"
RTE_DefaultConfig.text_controlsize50 = "50% width"
RTE_DefaultConfig.text_controlsize25 = "25% width"

RTE_DefaultConfig.text_controlsize = "Set Size"

RTE_DefaultConfig.text_controlalt = "Alt text"

RTE_DefaultConfig.text_controljustify = "Justify";

RTE_DefaultConfig.text_imagecaption = "Image Caption";

RTE_DefaultConfig.text_tablecellmerge = "Merge Cells"

RTE_DefaultConfig.text_tablecellsplitver = "Split Cells Vertical"
RTE_DefaultConfig.text_tablecellsplithor = "Split Cells Horizontal"

RTE_DefaultConfig.text_tablecellforecolor = "Cell Text Color"
RTE_DefaultConfig.text_tablecellbackcolor = "Cell Back Color"
RTE_DefaultConfig.text_tablerowinsertabove = "Insert Row Above"
RTE_DefaultConfig.text_tablerowinsertbelow = "Insert Row Below"
RTE_DefaultConfig.text_tablecolumninsertleft = "Insert Column Left"
RTE_DefaultConfig.text_tablecolumninsertright = "Insert Column Right"
RTE_DefaultConfig.text_tablecolumndelete = "Delete Column"
RTE_DefaultConfig.text_tablerowdelete = "Delete Row"
RTE_DefaultConfig.text_tabledelete = "Delete Table"
RTE_DefaultConfig.text_tableautosize = "Auto Size"
RTE_DefaultConfig.text_tableheader = "Table Header"

RTE_DefaultConfig.text_plusbtn = "Add a new paragraph"

RTE_DefaultConfig.text_paste = "Paste";
RTE_DefaultConfig.text_pasteauto = "Paste";
RTE_DefaultConfig.text_pastetext = "Paste Text";
RTE_DefaultConfig.text_pasteashtml = "Paste as Html";
RTE_DefaultConfig.text_pasteword = "Paste Word";
RTE_DefaultConfig.text_pasteinstruction = "Please use CTRL+V to paste the content into the box below. \r\nThe content will be cleaned automatically.";

RTE_DefaultConfig.text_paragraphop = "Paragraphs";
RTE_DefaultConfig.text_paragraphs = "Paragraphs";
RTE_DefaultConfig.text_pmoveup = "Move Up";
RTE_DefaultConfig.text_pmovedown = "Move Down";
RTE_DefaultConfig.text_pduplicate = "Duplicate";
RTE_DefaultConfig.text_pdelete = "Delete";
RTE_DefaultConfig.text_pmore = "More..";

RTE_DefaultConfig.text_togglemore = "More..";
RTE_DefaultConfig.text_toggleborder = "Toggle Border";

RTE_DefaultConfig.text_cut = "Cut";
RTE_DefaultConfig.text_copy = "Copy";
RTE_DefaultConfig.text_copied = "copied";

RTE_DefaultConfig.text_insertgallery = "Insert Gallery";
RTE_DefaultConfig.text_insertdocument = "Insert Document";
RTE_DefaultConfig.text_insertcallout = "Callout";
RTE_DefaultConfig.text_insertcolumns = "Columns";
RTE_DefaultConfig.text_inserttoggle = "Toggle List";
RTE_DefaultConfig.text_insertmath = "Equation";
RTE_DefaultConfig.text_insertmathtitle = "Insert / edit equation";
RTE_DefaultConfig.text_insertmathlabel = "TeX / LaTeX";
RTE_DefaultConfig.text_insertmathpreview = "Preview";
RTE_DefaultConfig.text_insertbookmark = "Bookmark";
RTE_DefaultConfig.text_insertbookmarktitle = "Insert bookmark";
RTE_DefaultConfig.text_insertbookmarklabel = "Link URL";
RTE_DefaultConfig.text_spellcheck = "Spell Check";
RTE_DefaultConfig.text_spellchecktitle = "Spelling";
RTE_DefaultConfig.text_spellchecknative = "Browser spell-check is on — misspellings are underlined as you type.";
RTE_DefaultConfig.text_spellcheckclean = "No spelling issues found.";
RTE_DefaultConfig.text_insertdatechip = "Date Chip";
RTE_DefaultConfig.text_insertchip = "Smart Chip";
RTE_DefaultConfig.text_insertdatechiptitle = "Date";
RTE_DefaultConfig.text_insertchiptitle = "Insert chip";
RTE_DefaultConfig.text_emailexport = "Email HTML";
RTE_DefaultConfig.text_emailexporttitle = "Export email HTML";
RTE_DefaultConfig.text_insertdiagram = "Diagram";
RTE_DefaultConfig.text_insertdiagramtitle = "Insert / edit diagram";
RTE_DefaultConfig.text_insertdiagramlabel = "Mermaid";
RTE_DefaultConfig.text_insertdiagrampreview = "Preview";
RTE_DefaultConfig.text_readaloud = "Read aloud";
RTE_DefaultConfig.text_readaloudtitle = "Read aloud";
RTE_DefaultConfig.text_inserttodolist = "To-do list";
RTE_DefaultConfig.text_calloutplaceholder = "Callout text";
RTE_DefaultConfig.text_columnplaceholder = "Column";
RTE_DefaultConfig.text_toggleplaceholder = "Toggle title";
RTE_DefaultConfig.text_togglebodyplaceholder = "Hidden content";
RTE_DefaultConfig.text_inserttemplate = "Insert Template";
RTE_DefaultConfig.text_insertcomment = "Insert Comment";
RTE_DefaultConfig.text_insertpagebreak = "Insert Page Break";
RTE_DefaultConfig.text_comment = "Comment";
RTE_DefaultConfig.text_commenthint = "Add a comment to the current selection or insert a marker at the caret.";
RTE_DefaultConfig.text_commentselection = "Selected text";
RTE_DefaultConfig.text_commentplaceholder = "Type your comment...";
RTE_DefaultConfig.text_commentapply = "Add Comment";

RTE_DefaultConfig.text_previewtitle = "Preview";
RTE_DefaultConfig.text_previewnormal = "Normal";
RTE_DefaultConfig.text_previewmobile = "Mobile";
RTE_DefaultConfig.text_previewtablet = "Tablet";

RTE_DefaultConfig.text_table = "Table";
RTE_DefaultConfig.text_tablecell = "Table Cell";
RTE_DefaultConfig.text_tablerow = "Table Row";
RTE_DefaultConfig.text_tablecolumn = "Table Column";

RTE_DefaultConfig.text_colorauto = "Automatic";

RTE_DefaultConfig.text_colormore = "More Colors...";
RTE_DefaultConfig.text_colorpicker = "Color Picker";

RTE_DefaultConfig.text_colorwebpalette = "Web Palette";

RTE_DefaultConfig.text_colornamedcolors = "Named Colors";

RTE_DefaultConfig.text_colorbasic = "Basic";
RTE_DefaultConfig.text_coloraddition = "Addition";

RTE_DefaultConfig.text_draganddrop = "Drag and drop";
RTE_DefaultConfig.text_or = "or";
RTE_DefaultConfig.text_clicktoupload = "Click to upload";

RTE_DefaultConfig.text_defaultimagecaption = "Default Image Caption";

RTE_DefaultConfig.text_searchemojis = "Search";


RTE_DefaultConfig.text_insertgallerytitle = "@insertgallery";
RTE_DefaultConfig.text_inserttemplatetitle = "@inserttemplate";

RTE_DefaultConfig.text_reachmaxlength = "The text to be added has reached the character limit for this field.";

RTE_DefaultConfig.translation = RTE_DefaultConfig.translation || {

};

RTE_DefaultConfig.plugin_insertcomment = function () {
    var obj = this;
    obj.PluginName = "InsertComment";
    obj.InitConfig = function () {};
    obj.InitEditor = function (editor) {
        editor.attachEvent("exec_command_insertcomment", function (state) {
            var edDoc = editor.document;
            var sel = edDoc.defaultView.getSelection();
            var selectedText = sel && !sel.isCollapsed ? sel.toString() : "";

            var dialoginner = editor.createDialog("Add Comment", "rte-dialog-insertcomment");
            dialoginner.style.padding = "16px";
            if (selectedText) {
                var preview = document.createElement("div");
                preview.style.cssText = "background:#f5f5f5;border-left:3px solid #0f8b8d;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#555;border-radius:0 4px 4px 0;max-height:60px;overflow:hidden;";
                preview.innerText = selectedText.substring(0, 120) + (selectedText.length > 120 ? "..." : "");
                dialoginner.appendChild(preview);
            }
            var label = document.createElement("label");
            label.innerText = "Comment:";
            label.style.cssText = "display:block;margin-bottom:6px;font-size:13px;font-weight:600;";
            dialoginner.appendChild(label);
            var textarea = document.createElement("textarea");
            textarea.placeholder = "Type your comment...";
            textarea.style.cssText = "width:100%;height:80px;padding:8px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;resize:vertical;";
            dialoginner.appendChild(textarea);
            var btnRow = document.createElement("div");
            btnRow.style.cssText = "margin-top:12px;text-align:right;";
            var insertBtn = document.createElement("button");
            insertBtn.innerText = "Add Comment";
            insertBtn.type = "button";
            insertBtn.style.cssText = "padding:6px 18px;background:#0f8b8d;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;";
            insertBtn.onclick = function () {
                var comment = textarea.value.replace(/^\s+|\s+$/g, "");
                if (comment && selectedText) {
                    var range = sel.getRangeAt(0);
                    var mark = edDoc.createElement("mark");
                    mark.style.cssText = "background:#fff9c4;border-bottom:2px solid #f9a825;cursor:pointer;position:relative;";
                    mark.setAttribute("title", comment);
                    mark.setAttribute("data-comment", comment);
                    try { range.surroundContents(mark); } catch (e) {}
                } else if (comment) {
                    editor.insertHTML('<span class="rte-comment-marker" contenteditable="false" style="background:#fff9c4;border:1px solid #f9a825;border-radius:3px;padding:1px 6px;font-size:11px;color:#f57f17;cursor:pointer;" title="' + comment.replace(/"/g, "&quot;") + '">&#128172; Comment</span>');
                }
                dialoginner.close();
                editor.focus();
            };
            btnRow.appendChild(insertBtn);
            dialoginner.appendChild(btnRow);
            setTimeout(function () { textarea.focus(); }, 100);
            state.returnValue = true;
        });
        editor.toolbarFactoryMap["insertcomment"] = function (cmd) {
            return editor.createToolbarButton(cmd);
        };
    };
};

// === Apply keyboard shortcut hints to tooltips (must run AFTER text_* defaults). ===
(function () {
	if (!RTE_DefaultConfig.showKeyboardShortcutsInTooltips) return;
	var isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");
	var mod = isMac ? "⌘" : "Ctrl";
	var shift = isMac ? "⇧" : "Shift";
	function add(cmd, key) {
		var base = RTE_DefaultConfig["text_" + cmd];
		if (!base || / \(.+\)$/.test(base)) return;
		RTE_DefaultConfig["text_" + cmd] = base + " (" + key + ")";
	}
	add("bold", mod + "+B");
	add("italic", mod + "+I");
	add("underline", mod + "+U");
	add("undo", mod + "+Z");
	add("redo", mod + "+" + shift + "+Z");
	add("copy", mod + "+C");
	add("cut", mod + "+X");
	add("paste", mod + "+V");
	add("selectall", mod + "+A");
	add("find", mod + "+F");
	add("insertlink", mod + "+K");
	add("pastetext", mod + "+" + shift + "+V");
	add("insertorderedlist", mod + "+" + shift + "+7");
	add("insertunorderedlist", mod + "+" + shift + "+8");
	add("insertblockquote", mod + "+" + shift + "+9");
	add("strikethrough", mod + "+" + shift + "+X");
	add("removeformat", mod + "+\\");
	add("justifyleft", mod + "+" + shift + "+L");
	add("justifycenter", mod + "+" + shift + "+E");
	add("justifyright", mod + "+" + shift + "+R");
	add("justifyfull", mod + "+" + shift + "+J");
	add("superscript", mod + "+.");
	add("subscript", mod + "+,");
	add("inserthorizontalrule", mod + "+" + shift + "+-");
	add("highlight", mod + "+" + shift + "+H");
	add("readingmode", mod + "+" + shift + "+M");
})();
