var pendingLoadsByBasePath = {};

var INLINE_CONTAINER_TAGS = {
    a: true,
    abbr: true,
    b: true,
    big: true,
    cite: true,
    code: true,
    del: true,
    em: true,
    font: true,
    i: true,
    label: true,
    mark: true,
    q: true,
    s: true,
    small: true,
    span: true,
    strike: true,
    strong: true,
    sub: true,
    sup: true,
    u: true
};

var BLOCK_CONTAINER_TAGS = {
    article: true,
    aside: true,
    div: true,
    footer: true,
    header: true,
    main: true,
    section: true
};

var HTML_ENTITY_MAP = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
};

var HTML_VOID_TAGS = {
    area: true,
    base: true,
    br: true,
    col: true,
    embed: true,
    hr: true,
    img: true,
    input: true,
    link: true,
    meta: true,
    param: true,
    source: true,
    track: true,
    wbr: true
};

var BLOCK_NODE_TYPES = {
    blockquote: true,
    bulletList: true,
    codeBlock: true,
    footnotes: true,
    heading: true,
    horizontalRule: true,
    htmlBlock: true,
    image: true,
    orderedList: true,
    pageBreak: true,
    paragraph: true,
    tableOfContents: true,
    taskList: true,
    table: true
};

var INLINE_NODE_TYPES = {
    footnoteReference: true,
    hardBreak: true,
    htmlInline: true,
    image: true,
    mergeField: true,
    text: true
};

var MARK_TYPES = {
    bold: true,
    code: true,
    italic: true,
    link: true,
    strike: true,
    subscript: true,
    superscript: true,
    textStyle: true,
    underline: true
};

function ensureBrowserEnvironment() {
    if (typeof window === "undefined" || typeof document === "undefined") {
        throw new Error("RichTextEditor integrations require a browser environment.");
    }
}

function ensureRichTextEditorConstructor() {
    ensureBrowserEnvironment();
    if (!window.RichTextEditor) {
        throw new Error("RichTextEditor core is not loaded. Serve the /richtexteditor assets or load rte.js before mounting the framework wrapper.");
    }
    return window.RichTextEditor;
}

function isArray(value) {
    return Object.prototype.toString.call(value) === "[object Array]";
}

function getElementTagName(node) {
    return node && node.tagName ? String(node.tagName).toLowerCase() : "";
}

function normalizePlainText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function getPlainTextFromHtml(html) {
    return normalizePlainText(
        decodeHtmlEntities(String(html || ""))
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<[^>]+>/g, " ")
    );
}

// Characters that are conventionally counted one-per-word because the script
// does not delimit words with spaces: CJK ideographs (incl. Ext A + compat),
// Japanese hiragana/katakana, and the ideographic iteration marks. Hangul is
// intentionally excluded — Korean is written with inter-word spaces, so it is
// counted as whitespace-delimited tokens like Latin text (matching Word/Docs).
var CJK_WORD_CHAR = /[々〇぀-ヿ㐀-䶿一-鿿豈-﫿]/g;

function countWords(value) {
    var normalized = normalizePlainText(value);
    if (!normalized) {
        return 0;
    }

    var cjkMatches = normalized.match(CJK_WORD_CHAR);
    var cjkCount = cjkMatches ? cjkMatches.length : 0;

    // Strip the per-character scripts, then count the remaining whitespace-
    // delimited tokens (Latin, Cyrillic, Korean, digits, etc.).
    var tokenized = cjkCount ? normalized.replace(CJK_WORD_CHAR, " ") : normalized;
    var tokenCount = tokenized.split(/\s+/).filter(Boolean).length;

    return cjkCount + tokenCount;
}

function countCharactersNoSpaces(value) {
    return normalizePlainText(value).replace(/\s/g, "").length;
}

function normalizeMarkdownShortcutText(value) {
    return String(value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/^\s+|\s+$/g, "");
}

function getMarkdownShortcutAction(value) {
    var source = normalizeMarkdownShortcutText(value);
    if (!source) {
        return null;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(source)) {
        return {
            kind: "horizontalRule",
            token: source
        };
    }

    if (/^(?:```|~~~)([A-Za-z0-9_-]+)?$/.test(source)) {
        return {
            kind: "codeBlock",
            token: source
        };
    }

    var taskListMatch = source.match(/^(?:(-|\*|\+)\s+)?\[( |x|X)\]$/);
    if (taskListMatch) {
        return {
            kind: "taskList",
            checked: taskListMatch[2].toLowerCase() === "x",
            token: source
        };
    }

    if (/^#{1,6}$/.test(source)) {
        return {
            kind: "heading",
            level: source.length,
            token: source
        };
    }

    if (source === ">" || source === "&gt;") {
        return {
            kind: "blockquote",
            token: source
        };
    }

    if (/^(?:-|\*|\+)$/.test(source)) {
        return {
            kind: "bulletList",
            token: source
        };
    }

    if (/^\d+[.)]$/.test(source)) {
        return {
            kind: "orderedList",
            token: source
        };
    }

    return null;
}

function getInlineMarkdownShortcutAction(value) {
    var source = String(value || "").replace(/\u00a0/g, " ");
    if (!source) {
        return null;
    }

    var patterns = [
        {
            kind: "link",
            command: "link",
            regex: /(^|[\s(\[{>])\[([^\]\n]+?)\]\((\S+?)\)$/
        },
        {
            kind: "bold",
            command: "bold",
            regex: /(^|[\s(\[{>])(\*\*|__)([^\s](?:[^\n]*?[^\s])?)\2$/
        },
        {
            kind: "strike",
            command: "strike",
            regex: /(^|[\s(\[{>])(~~)([^\s](?:[^\n]*?[^\s])?)~~$/
        },
        {
            kind: "code",
            command: "code",
            regex: /(^|[\s(\[{>])(`)([^`\n]+?)`$/
        },
        {
            kind: "italic",
            command: "italic",
            regex: /(^|[\s(\[{>])(\*|_)([^\s*_](?:[^\n]*?[^\s*_])?)\2$/
        }
    ];

    for (var index = 0; index < patterns.length; index++) {
        var pattern = patterns[index];
        var match = pattern.regex.exec(source);
        if (!match) {
            continue;
        }

        var prefix = match[1] || "";
        var marker = match[2] || "";
        var content = match[3] || "";
        var href = null;
        if (pattern.kind === "link") {
            marker = "[]()";
            content = match[2] || "";
            href = normalizeInlineMarkdownLinkHref(match[3] || "");
            if (!href) {
                continue;
            }
        }
        var rangeStart = match.index + prefix.length;
        var rangeEnd = source.length;
        var action = {
            kind: pattern.kind,
            command: pattern.command,
            content: content,
            marker: marker,
            token: source.slice(rangeStart, rangeEnd),
            rangeStart: rangeStart,
            rangeEnd: rangeEnd,
            textStart: rangeStart + marker.length,
            textEnd: rangeEnd - marker.length
        };
        if (href) {
            action.href = href;
            action.textStart = rangeStart + 1;
            action.textEnd = action.textStart + content.length;
        }
        return action;
    }

    return null;
}

function normalizeInlineMarkdownLinkHref(value) {
    var href = String(value || "").replace(/^\s+|\s+$/g, "");
    if (!href || /[\r\n]/.test(href)) {
        return null;
    }

    var normalized = href.replace(/[\u0000-\u0020]+/g, "").toLowerCase();
    if (!normalized) {
        return null;
    }

    if (normalized.indexOf("javascript:") === 0 || normalized.indexOf("vbscript:") === 0) {
        return null;
    }

    if (normalized.indexOf("data:") === 0 && normalized.indexOf("data:image/") !== 0) {
        return null;
    }

    return href;
}

function createTextStatistics(text, selectedText) {
    var plainText = String(text || "");
    var selection = String(selectedText || "");

    return {
        characters: plainText.length,
        charactersNoSpaces: countCharactersNoSpaces(plainText),
        words: countWords(plainText),
        selectedCharacters: selection.length,
        selectedCharactersNoSpaces: countCharactersNoSpaces(selection),
        selectedWords: countWords(selection)
    };
}

function countSentences(value) {
    var normalized = normalizePlainText(value);
    if (!normalized) {
        return 0;
    }

    var matches = normalized.match(/[^.!?]+(?:[.!?]+|$)/g);
    if (!matches) {
        return 0;
    }

    var count = 0;
    for (var index = 0; index < matches.length; index++) {
        if (normalizePlainText(matches[index])) {
            count += 1;
        }
    }

    return count;
}

function roundMetric(value) {
    return Math.round(value * 10) / 10;
}

var PAGE_SETUP_FORMATS = {
    A3: { width: "297mm", height: "420mm" },
    A4: { width: "210mm", height: "297mm" },
    A5: { width: "148mm", height: "210mm" },
    Legal: { width: "8.5in", height: "14in" },
    Letter: { width: "8.5in", height: "11in" },
    Tabloid: { width: "11in", height: "17in" }
};

function normalizePageMeasurement(value) {
    if (value == null || value === "") {
        return undefined;
    }

    if (typeof value === "number" && isFinite(value)) {
        return String(value) + "px";
    }

    var normalized = String(value).replace(/^\s+|\s+$/g, "");
    return normalized || undefined;
}

function normalizePageOrientation(value) {
    var normalized = String(value || "").toLowerCase();
    if (normalized === "landscape") {
        return "landscape";
    }
    if (normalized === "portrait") {
        return "portrait";
    }
    return undefined;
}

function normalizePageFormat(value) {
    var normalized = String(value || "").replace(/^\s+|\s+$/g, "");
    if (!normalized) {
        return undefined;
    }

    var upper = normalized.toUpperCase();
    if (PAGE_SETUP_FORMATS[upper]) {
        return upper;
    }

    var title = normalized.charAt(0).toUpperCase() + normalized.substring(1).toLowerCase();
    if (PAGE_SETUP_FORMATS[title]) {
        return title;
    }

    return normalized;
}

function normalizePageMargins(value) {
    if (!value || typeof value !== "object") {
        return undefined;
    }

    var margins = {};
    var sides = ["top", "right", "bottom", "left"];
    for (var index = 0; index < sides.length; index++) {
        var side = sides[index];
        var measurement = normalizePageMeasurement(value[side]);
        if (measurement) {
            margins[side] = measurement;
        }
    }

    return Object.keys(margins).length ? margins : undefined;
}

function clonePageSetup(pageSetup) {
    if (!pageSetup || typeof pageSetup !== "object") {
        return null;
    }

    var clone = {};
    for (var key in pageSetup) {
        if (!Object.prototype.hasOwnProperty.call(pageSetup, key)) {
            continue;
        }

        if (key === "margins" && pageSetup.margins && typeof pageSetup.margins === "object") {
            clone.margins = Object.assign({}, pageSetup.margins);
            continue;
        }

        clone[key] = pageSetup[key];
    }

    return clone;
}

function normalizeDocumentPageSetup(pageSetup) {
    if (pageSetup == null) {
        return null;
    }

    if (typeof pageSetup !== "object") {
        return null;
    }

    var normalized = {};
    var format = normalizePageFormat(pageSetup.format);
    var orientation = normalizePageOrientation(pageSetup.orientation);
    var width = normalizePageMeasurement(pageSetup.width);
    var height = normalizePageMeasurement(pageSetup.height);
    var margins = normalizePageMargins(pageSetup.margins);
    var headerHtml = typeof pageSetup.headerHtml === "string" ? pageSetup.headerHtml : undefined;
    var footerHtml = typeof pageSetup.footerHtml === "string" ? pageSetup.footerHtml : undefined;

    if (format) {
        normalized.format = format;
    }
    if (orientation) {
        normalized.orientation = orientation;
    }

    if ((!width || !height) && format && PAGE_SETUP_FORMATS[format]) {
        width = width || PAGE_SETUP_FORMATS[format].width;
        height = height || PAGE_SETUP_FORMATS[format].height;
    }

    if (width) {
        normalized.width = width;
    }
    if (height) {
        normalized.height = height;
    }
    if (margins) {
        normalized.margins = margins;
    }
    if (headerHtml !== undefined) {
        normalized.headerHtml = headerHtml;
    }
    if (footerHtml !== undefined) {
        normalized.footerHtml = footerHtml;
    }

    return Object.keys(normalized).length ? normalized : null;
}

function getPageSetupFromDocument(documentModel) {
    if (!documentModel || typeof documentModel !== "object") {
        return null;
    }

    return normalizeDocumentPageSetup(documentModel.attrs && documentModel.attrs.pageSetup);
}

function getDocumentPageSetup(value) {
    return getPageSetupFromDocument(createStructuredDocument(value));
}

function setDocumentPageSetup(value, pageSetup) {
    var documentModel = createStructuredDocument(value);
    var nextPageSetup = normalizeDocumentPageSetup(pageSetup);
    var nextDocument = {
        type: "doc",
        version: documentModel.version,
        format: documentModel.format,
        content: documentModel.content || []
    };

    if (documentModel.attrs && typeof documentModel.attrs === "object") {
        nextDocument.attrs = Object.assign({}, documentModel.attrs);
    }

    if (nextPageSetup) {
        if (!nextDocument.attrs) {
            nextDocument.attrs = {};
        }
        nextDocument.attrs.pageSetup = nextPageSetup;
    } else if (nextDocument.attrs) {
        delete nextDocument.attrs.pageSetup;
        if (!Object.keys(nextDocument.attrs).length) {
            delete nextDocument.attrs;
        }
    }

    return createStructuredDocument(nextDocument);
}

function buildPageSetupMetadataAttributes(pageSetup) {
    var attrs = {
        "data-rte-page-setup": "true",
        contenteditable: "false",
        style: "display:none"
    };

    if (!pageSetup) {
        return attrs;
    }

    if (pageSetup.format) {
        attrs["data-format"] = pageSetup.format;
    }
    if (pageSetup.orientation) {
        attrs["data-orientation"] = pageSetup.orientation;
    }
    if (pageSetup.width) {
        attrs["data-width"] = pageSetup.width;
    }
    if (pageSetup.height) {
        attrs["data-height"] = pageSetup.height;
    }
    if (pageSetup.headerHtml !== undefined) {
        attrs["data-header-html"] = pageSetup.headerHtml;
    }
    if (pageSetup.footerHtml !== undefined) {
        attrs["data-footer-html"] = pageSetup.footerHtml;
    }

    var margins = pageSetup.margins || {};
    if (margins.top) {
        attrs["data-margin-top"] = margins.top;
    }
    if (margins.right) {
        attrs["data-margin-right"] = margins.right;
    }
    if (margins.bottom) {
        attrs["data-margin-bottom"] = margins.bottom;
    }
    if (margins.left) {
        attrs["data-margin-left"] = margins.left;
    }

    return attrs;
}

function serializePageSetupMetadata(pageSetup) {
    if (!pageSetup) {
        return "";
    }

    return "<div" + buildAttributeString(buildPageSetupMetadataAttributes(pageSetup)) + "></div>";
}

function parsePageSetupNode(node) {
    if (!node || node.nodeType !== 1) {
        return null;
    }

    return normalizeDocumentPageSetup({
        footerHtml: node.getAttribute("data-footer-html"),
        format: node.getAttribute("data-format"),
        headerHtml: node.getAttribute("data-header-html"),
        height: node.getAttribute("data-height"),
        margins: {
            top: node.getAttribute("data-margin-top"),
            right: node.getAttribute("data-margin-right"),
            bottom: node.getAttribute("data-margin-bottom"),
            left: node.getAttribute("data-margin-left")
        },
        orientation: node.getAttribute("data-orientation"),
        width: node.getAttribute("data-width")
    });
}

function collectDocumentMetrics(nodes, metrics) {
    var content = isArray(nodes) ? nodes : [];

    for (var index = 0; index < content.length; index++) {
        var node = content[index];
        if (!node || typeof node !== "object") {
            continue;
        }

        switch (node.type) {
            case "paragraph":
                metrics.paragraphs += 1;
                break;
            case "heading":
                metrics.headings += 1;
                break;
            case "image":
                metrics.images += 1;
                break;
            case "table":
                metrics.tables += 1;
                break;
        }

        var marks = isArray(node.marks) ? node.marks : [];
        for (var markIndex = 0; markIndex < marks.length; markIndex++) {
            if (marks[markIndex] && marks[markIndex].type === "link") {
                metrics.links += 1;
            }
        }

        if (isArray(node.content) && node.content.length) {
            collectDocumentMetrics(node.content, metrics);
        }
    }
}

function createDocumentMetrics(text, selectedText, documentModel, options) {
    var stats = createTextStatistics(text, selectedText);
    var metrics = {
        characters: stats.characters,
        charactersNoSpaces: stats.charactersNoSpaces,
        words: stats.words,
        selectedCharacters: stats.selectedCharacters,
        selectedCharactersNoSpaces: stats.selectedCharactersNoSpaces,
        selectedWords: stats.selectedWords,
        paragraphs: 0,
        sentences: countSentences(text),
        headings: 0,
        images: 0,
        tables: 0,
        links: 0,
        estimatedReadingMinutes: 0
    };

    if (documentModel) {
        collectDocumentMetrics(documentModel.content || [], metrics);
    }

    var wordsPerMinute = options && parseFloat(options.wordsPerMinute, 10);
    if (!wordsPerMinute || wordsPerMinute < 1) {
        wordsPerMinute = 200;
    }

    if (metrics.words > 0) {
        metrics.estimatedReadingMinutes = roundMetric(metrics.words / wordsPerMinute);
        if (metrics.estimatedReadingMinutes === 0) {
            metrics.estimatedReadingMinutes = 0.1;
        }
    }

    return metrics;
}

function getTextStatistics(value, options) {
    var selectionText = options && options.selectionText;
    var documentModel = null;
    var plainText = "";

    if (value && typeof value === "object" && value.type === "doc") {
        documentModel = createStructuredDocument(value);
    }
    else if (typeof value === "string") {
        if (/<[a-z!\/?][^>]*>/i.test(value)) {
            documentModel = createStructuredDocument(value);
        }
        else {
            plainText = normalizePlainText(value);
        }
    }
    else if (value != null) {
        documentModel = createStructuredDocument(value);
    }

    if (documentModel) {
        plainText = normalizePlainText(documentModel.text || renderTextContent(documentModel.content || []));
    }

    return createTextStatistics(plainText, selectionText);
}

function getDocumentMetrics(value, options) {
    var selectionText = options && options.selectionText;
    var documentModel = null;
    var plainText = "";

    if (value && typeof value === "object" && value.type === "doc") {
        documentModel = createStructuredDocument(value);
    }
    else if (typeof value === "string") {
        if (/<[a-z!\/?][^>]*>/i.test(value)) {
            documentModel = createStructuredDocument(value);
        }
        else {
            plainText = normalizePlainText(value);
        }
    }
    else if (value != null) {
        documentModel = createStructuredDocument(value);
    }

    if (documentModel) {
        plainText = normalizePlainText(documentModel.text || renderTextContent(documentModel.content || []));
    }

    return createDocumentMetrics(plainText, selectionText, documentModel, options);
}

function slugifyOutlineText(value) {
    var normalized = String(value || "").toLowerCase();
    normalized = normalized.replace(/[^a-z0-9]+/g, "-");
    normalized = normalized.replace(/^-+|-+$/g, "");
    return normalized || "section";
}

function buildUniqueOutlineId(baseId, usedIds) {
    var normalized = String(baseId || "").replace(/^\s+|\s+$/g, "");
    if (!normalized) {
        normalized = "section";
    }

    var candidate = normalized;
    var suffix = 2;
    while (usedIds[candidate]) {
        candidate = normalized + "-" + suffix;
        suffix += 1;
    }

    usedIds[candidate] = true;
    return candidate;
}

function collectDocumentOutline(nodes, items, usedIds, parentPath) {
    var content = isArray(nodes) ? nodes : [];

    for (var index = 0; index < content.length; index++) {
        var node = content[index];
        if (!node || typeof node !== "object") {
            continue;
        }

        var path = parentPath + ".content[" + index + "]";

        if (node.type === "heading") {
            var headingAttrs = node.attrs || {};
            var level = parseInt(headingAttrs.level, 10) || 1;
            if (level < 1) {
                level = 1;
            }
            if (level > 6) {
                level = 6;
            }

            var text = normalizePlainText(getNodeTextContent(node));
            if (!text) {
                text = "Untitled Section";
            }

            items.push({
                id: buildUniqueOutlineId(headingAttrs.id || slugifyOutlineText(text), usedIds),
                level: level,
                path: path,
                text: text
            });
        }

        if (isArray(node.content) && node.content.length) {
            collectDocumentOutline(node.content, items, usedIds, path);
        }
    }
}

function normalizeDocumentHeadingIdsNodeList(nodes, usedIds) {
    var content = isArray(nodes) ? nodes : [];
    var normalized = [];

    for (var index = 0; index < content.length; index++) {
        var node = cloneStructuredNode(content[index]);
        if (!node || typeof node !== "object") {
            normalized.push(node);
            continue;
        }

        if (node.type === "heading") {
            var headingAttrs = node.attrs ? Object.assign({}, node.attrs) : {};
            var text = normalizePlainText(getNodeTextContent(node));
            if (!text) {
                text = "Untitled Section";
            }
            headingAttrs.id = buildUniqueOutlineId(headingAttrs.id || slugifyOutlineText(text), usedIds);
            node.attrs = headingAttrs;
        }

        if (isArray(node.content) && node.content.length) {
            node.content = normalizeDocumentHeadingIdsNodeList(node.content, usedIds);
        }

        normalized.push(node);
    }

    return normalized;
}

function normalizeDocumentHeadingIds(documentModel) {
    if (!documentModel || typeof documentModel !== "object") {
        return documentModel;
    }

    var clone = {
        type: documentModel.type,
        version: documentModel.version,
        format: documentModel.format
    };

    if (documentModel.attrs && typeof documentModel.attrs === "object") {
        clone.attrs = Object.assign({}, documentModel.attrs);
    }
    if (documentModel.html !== undefined) {
        clone.html = documentModel.html;
    }
    if (documentModel.text !== undefined) {
        clone.text = documentModel.text;
    }

    clone.content = normalizeDocumentHeadingIdsNodeList(documentModel.content || [], {});
    return clone;
}

function getDocumentOutline(value) {
    var documentModel = createStructuredDocument(value);
    var items = [];
    collectDocumentOutline(documentModel.content || [], items, {}, "content");
    return items;
}

function normalizeHeadingLevelOption(value, fallback) {
    var level = parseInt(value, 10);
    if (isNaN(level)) {
        level = fallback;
    }
    if (level < 1) {
        level = 1;
    }
    if (level > 6) {
        level = 6;
    }
    return level;
}

function getFilteredDocumentOutline(value, options) {
    var outline = isArray(value) ? value : getDocumentOutline(value);
    var minLevel = normalizeHeadingLevelOption(options && options.minLevel, 1);
    var maxLevel = normalizeHeadingLevelOption(options && options.maxLevel, 6);
    if (maxLevel < minLevel) {
        maxLevel = minLevel;
    }

    var filtered = [];
    for (var index = 0; index < outline.length; index++) {
        var item = outline[index];
        if (!item || typeof item !== "object") {
            continue;
        }

        var level = normalizeHeadingLevelOption(item.level, minLevel);
        if (level < minLevel || level > maxLevel) {
            continue;
        }

        filtered.push({
            id: item.id,
            level: level,
            path: item.path,
            text: item.text
        });
    }

    return filtered;
}

function cloneTableOfContentsEntry(item) {
    var clone = {
        id: item.id,
        level: item.level,
        path: item.path,
        text: item.text
    };
    if (item.itemIndex !== undefined) {
        clone.itemIndex = item.itemIndex;
    }
    if (item.indexLabel !== undefined) {
        clone.indexLabel = item.indexLabel;
    }
    return clone;
}

function normalizeOrderedListType(value) {
    var normalized = String(value || "").replace(/^\s+|\s+$/g, "");
    if (!normalized) {
        return undefined;
    }
    if (normalized === "1" || normalized === "A" || normalized === "a" || normalized === "I" || normalized === "i") {
        return normalized;
    }

    switch (normalized.toLowerCase()) {
        case "decimal":
            return "1";
        case "upper-alpha":
        case "upper-latin":
            return "A";
        case "lower-alpha":
        case "lower-latin":
            return "a";
        case "upper-roman":
            return "I";
        case "lower-roman":
            return "i";
        default:
            return undefined;
    }
}

function normalizeTableOfContentsIndexMode(value) {
    var normalized = String(value || "").toLowerCase();
    if (normalized === "linear" || normalized === "hierarchical") {
        return normalized;
    }
    return "none";
}

function buildTableOfContentsTreeFromItems(items) {
    var roots = [];
    var stack = [];

    for (var index = 0; index < items.length; index++) {
        var item = items[index];
        var current = cloneTableOfContentsEntry(item);
        current.children = [];

        while (stack.length && stack[stack.length - 1].level >= current.level) {
            stack.pop();
        }

        if (stack.length) {
            stack[stack.length - 1].children.push(current);
        }
        else {
            roots.push(current);
        }

        stack.push(current);
    }

    return roots;
}

function assignLinearTableOfContentsIndexes(items) {
    var counter = 0;

    function visit(nodes) {
        var list = isArray(nodes) ? nodes : [];
        for (var index = 0; index < list.length; index++) {
            var item = list[index];
            if (!item || typeof item !== "object") {
                continue;
            }

            counter += 1;
            item.itemIndex = counter;
            item.indexLabel = String(counter);
            if (isArray(item.children) && item.children.length) {
                visit(item.children);
            }
        }
    }

    visit(items);
}

function assignHierarchicalTableOfContentsIndexesToFlatItems(items) {
    var list = isArray(items) ? items : [];
    var stack = [];
    var rootIndex = 0;

    for (var index = 0; index < list.length; index++) {
        var item = list[index];
        if (!item || typeof item !== "object") {
            continue;
        }

        while (stack.length && stack[stack.length - 1].level >= item.level) {
            stack.pop();
        }

        if (!stack.length) {
            rootIndex += 1;
            item.itemIndex = rootIndex;
            item.indexLabel = String(rootIndex);
        }
        else {
            var parent = stack[stack.length - 1];
            parent.childCount += 1;
            item.itemIndex = parent.childCount;
            item.indexLabel = parent.indexLabel + "." + item.itemIndex;
        }

        stack.push({
            childCount: 0,
            indexLabel: item.indexLabel,
            level: item.level
        });
    }
}

function applyTableOfContentsIndexMode(items, options) {
    var list = isArray(items) ? items : [];
    var indexMode = normalizeTableOfContentsIndexMode(options && options.indexMode);
    if (indexMode === "hierarchical") {
        assignHierarchicalTableOfContentsIndexesToFlatItems(list);
    }
    else if (indexMode === "linear") {
        assignLinearTableOfContentsIndexes(list);
    }
    return list;
}

function getTableOfContents(value, options) {
    var outline = applyTableOfContentsIndexMode(getFilteredDocumentOutline(value, options), options);
    var tree = buildTableOfContentsTreeFromItems(outline);
    return tree;
}

function collectFootnotes(nodes, items, parentPath) {
    var content = isArray(nodes) ? nodes : [];

    for (var index = 0; index < content.length; index++) {
        var node = content[index];
        if (!node || typeof node !== "object") {
            continue;
        }

        var path = parentPath + ".content[" + index + "]";
        if (node.type === "footnoteItem") {
            var attrs = node.attrs || {};
            var number = parseInt(attrs.number, 10) || items.length + 1;
            items.push({
                id: String(attrs.id || ("rte-footnote-item-" + number)),
                number: number,
                path: path,
                refId: attrs.refId ? String(attrs.refId) : ("rte-footnote-ref-" + number),
                text: normalizePlainText(getNodeTextContent(node))
            });
        }

        if (isArray(node.content) && node.content.length) {
            collectFootnotes(node.content, items, path);
        }
    }
}

function getFootnotes(value) {
    var documentModel = createStructuredDocument(value);
    var items = [];
    collectFootnotes(documentModel.content || [], items, "content");
    items.sort(function (a, b) {
        if (a.number !== b.number) {
            return a.number - b.number;
        }
        return a.path < b.path ? -1 : (a.path > b.path ? 1 : 0);
    });
    return items;
}

function cloneStructuredNode(node) {
    if (!node || typeof node !== "object") {
        return node;
    }

    var clone = {};
    for (var key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) {
            continue;
        }

        if (key === "attrs") {
            clone.attrs = node.attrs ? Object.assign({}, node.attrs) : undefined;
            continue;
        }

        if (key === "marks") {
            var marks = node.marks || [];
            clone.marks = [];
            for (var markIndex = 0; markIndex < marks.length; markIndex++) {
                var mark = marks[markIndex];
                if (!mark || typeof mark !== "object") {
                    continue;
                }

                clone.marks.push({
                    type: mark.type,
                    attrs: mark.attrs ? Object.assign({}, mark.attrs) : undefined
                });
            }
            continue;
        }

        if (key === "content") {
            var content = node.content || [];
            clone.content = [];
            for (var contentIndex = 0; contentIndex < content.length; contentIndex++) {
                clone.content.push(cloneStructuredNode(content[contentIndex]));
            }
            continue;
        }

        clone[key] = node[key];
    }

    return clone;
}

function syncTableOfContentsNodeList(nodes, items, options) {
    var list = isArray(nodes) ? nodes : [];
    var synced = [];
    var titleOverride = options && typeof options.title === "string" ? options.title : null;
    var includeTitle = options && options.includeTitle === false ? false : undefined;
    var ordered = options && options.ordered === true ? true : (options && options.ordered === false ? false : undefined);
    var orderedListType = normalizeOrderedListType(options && options.orderedListType);

    for (var index = 0; index < list.length; index++) {
        var sourceNode = list[index];
        var node = cloneStructuredNode(sourceNode);

        if (node && node.type === "tableOfContents") {
            var attrs = node.attrs ? Object.assign({}, node.attrs) : {};
            attrs.items = [];
            for (var itemIndex = 0; itemIndex < items.length; itemIndex++) {
                attrs.items.push(cloneTableOfContentsEntry(items[itemIndex]));
            }
            if (titleOverride !== null) {
                attrs.title = titleOverride;
            }
            if (includeTitle !== undefined) {
                attrs.includeTitle = includeTitle;
            }
            if (ordered !== undefined) {
                attrs.ordered = ordered;
            }
            if (orderedListType !== undefined) {
                attrs.orderedListType = orderedListType;
            }
            else if (ordered === false && Object.prototype.hasOwnProperty.call(attrs, "orderedListType")) {
                delete attrs.orderedListType;
            }
            node.attrs = attrs;
        }

        if (node && isArray(node.content) && node.content.length) {
            node.content = syncTableOfContentsNodeList(node.content, items, options);
        }

        synced.push(node);
    }

    return synced;
}

function syncTableOfContents(value, options) {
    var documentModel = createStructuredDocument(value);
    var items = applyTableOfContentsIndexMode(getFilteredDocumentOutline(documentModel, options), options);
    var content = syncTableOfContentsNodeList(documentModel.content || [], items, options);

    return createStructuredDocument({
        type: "doc",
        version: documentModel.version,
        format: documentModel.format,
        content: content
    });
}

function decodeHtmlEntities(value) {
    return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, function (match, entity) {
        var normalized = String(entity || "").toLowerCase();

        if (normalized.charAt(0) === "#") {
            var isHex = normalized.charAt(1) === "x";
            var codePoint = parseInt(normalized.substring(isHex ? 2 : 1), isHex ? 16 : 10);
            if (!isNaN(codePoint)) {
                try {
                    return String.fromCodePoint(codePoint);
                } catch (error) {
                    return match;
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(HTML_ENTITY_MAP, normalized)) {
            return HTML_ENTITY_MAP[normalized];
        }

        return match;
    });
}

function kebabToCamelCase(value) {
    return String(value || "").replace(/-([a-z])/g, function (match, letter) {
        return letter.toUpperCase();
    });
}

function parseStyleText(value) {
    var style = {};
    var declarations = String(value || "").split(";");

    for (var index = 0; index < declarations.length; index++) {
        var declaration = declarations[index];
        if (!declaration) {
            continue;
        }

        var separatorIndex = declaration.indexOf(":");
        if (separatorIndex < 0) {
            continue;
        }

        var key = kebabToCamelCase(declaration.substring(0, separatorIndex).replace(/^\s+|\s+$/g, ""));
        var cssValue = declaration.substring(separatorIndex + 1).replace(/^\s+|\s+$/g, "");
        if (!key || !cssValue) {
            continue;
        }

        style[key] = cssValue;
    }

    return style;
}

function createVirtualTextNode(value) {
    var decoded = decodeHtmlEntities(value);
    return {
        childNodes: [],
        nodeType: 3,
        nodeValue: decoded,
        outerHTML: "",
        textContent: decoded
    };
}

function createVirtualElementNode(tagName, attrs) {
    var attributeMap = attrs || {};
    var normalizedTagName = String(tagName || "").toLowerCase();

    return {
        _attrs: attributeMap,
        childNodes: [],
        getAttribute: function (name) {
            var normalizedName = String(name || "").toLowerCase();
            return Object.prototype.hasOwnProperty.call(attributeMap, normalizedName) ? attributeMap[normalizedName] : null;
        },
        nodeType: 1,
        outerHTML: "",
        style: parseStyleText(attributeMap.style || ""),
        tagName: normalizedTagName.toUpperCase(),
        textContent: ""
    };
}

function parseHtmlAttributes(source) {
    var attrs = {};
    var pattern = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    var match = null;

    while ((match = pattern.exec(source || ""))) {
        var name = String(match[1] || "").toLowerCase();
        if (!name) {
            continue;
        }

        var value = match[2];
        if (value === undefined) {
            value = match[3];
        }
        if (value === undefined) {
            value = match[4];
        }

        attrs[name] = decodeHtmlEntities(value === undefined ? "" : value);
    }

    return attrs;
}

function finalizeVirtualNode(node) {
    if (!node) {
        return null;
    }

    if (node.nodeType === 3) {
        node.textContent = node.nodeValue || "";
        node.outerHTML = escapeHtml(node.nodeValue || "");
        return node;
    }

    var childHtml = "";
    var textContent = "";

    for (var index = 0; index < node.childNodes.length; index++) {
        var child = finalizeVirtualNode(node.childNodes[index]);
        if (!child) {
            continue;
        }

        childHtml += child.nodeType === 3 ? escapeHtml(child.nodeValue || "") : child.outerHTML || "";
        textContent += child.textContent || "";
    }

    node.textContent = textContent;

    var tagName = getElementTagName(node);
    if (!tagName) {
        node.outerHTML = childHtml;
        return node;
    }

    if (tagName === "body") {
        node.outerHTML = childHtml;
        return node;
    }

    var attrs = node._attrs || {};
    var attrString = buildAttributeString(attrs);
    if (HTML_VOID_TAGS[tagName]) {
        node.outerHTML = "<" + tagName + attrString + " />";
        return node;
    }

    node.outerHTML = "<" + tagName + attrString + ">" + childHtml + "</" + tagName + ">";
    return node;
}

function createVirtualDocumentBody(html) {
    var root = createVirtualElementNode("body", {});
    var stack = [root];
    var tokenPattern = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?[^>]+>|[^<]+/gi;
    var match = null;

    while ((match = tokenPattern.exec(String(html || "")))) {
        var token = match[0];
        if (!token) {
            continue;
        }

        if (/^<!--/.test(token) || /^<!doctype/i.test(token)) {
            continue;
        }

        if (token.charAt(0) !== "<") {
            var textNode = createVirtualTextNode(token);
            textNode.parentNode = stack[stack.length - 1];
            stack[stack.length - 1].childNodes.push(textNode);
            continue;
        }

        if (/^<\//.test(token)) {
            var closeTagMatch = /^<\s*\/\s*([^\s>\/]+)/.exec(token);
            if (!closeTagMatch) {
                continue;
            }

            var closingTag = String(closeTagMatch[1] || "").toLowerCase();
            while (stack.length > 1) {
                var currentTag = getElementTagName(stack[stack.length - 1]);
                stack.pop();
                if (currentTag === closingTag) {
                    break;
                }
            }

            continue;
        }

        var openTagMatch = /^<\s*([^\s>\/]+)/.exec(token);
        if (!openTagMatch) {
            continue;
        }

        var tagName = String(openTagMatch[1] || "").toLowerCase();
        var attrSource = token
            .replace(/^<\s*[^\s>\/]+/, "")
            .replace(/\/?\s*>$/, "");
        var element = createVirtualElementNode(tagName, parseHtmlAttributes(attrSource));
        element.parentNode = stack[stack.length - 1];
        stack[stack.length - 1].childNodes.push(element);

        if (!HTML_VOID_TAGS[tagName] && !/\/\s*>$/.test(token)) {
            stack.push(element);
        }
    }

    return finalizeVirtualNode(root);
}

function getDocumentBody(html) {
    if (typeof document !== "undefined" && document.implementation && document.implementation.createHTMLDocument) {
        var doc = document.implementation.createHTMLDocument("");
        doc.body.innerHTML = html || "";
        return doc.body;
    }

    if (typeof DOMParser !== "undefined") {
        return new DOMParser().parseFromString("<!doctype html><html><body>" + (html || "") + "</body></html>", "text/html").body;
    }

    return createVirtualDocumentBody(html);
}

function copyAttributes(attrs) {
    var next = {};
    var hasValues = false;
    for (var key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) {
            continue;
        }

        if (attrs[key] === undefined || attrs[key] === null || attrs[key] === "") {
            continue;
        }

        next[key] = attrs[key];
        hasValues = true;
    }

    return hasValues ? next : undefined;
}

function cloneMark(mark) {
    return {
        type: mark.type,
        attrs: copyAttributes(mark.attrs || {})
    };
}

function cloneMarks(marks) {
    if (!marks || !marks.length) {
        return undefined;
    }

    var next = [];
    for (var index = 0; index < marks.length; index++) {
        next.push(cloneMark(marks[index]));
    }
    return next;
}

function getMarkKey(mark) {
    return mark.type + ":" + JSON.stringify(mark.attrs || {});
}

function appendMark(marks, mark) {
    var next = marks.slice();
    var markKey = getMarkKey(mark);

    for (var index = 0; index < next.length; index++) {
        if (getMarkKey(next[index]) === markKey) {
            return next;
        }
    }

    next.push(cloneMark(mark));
    return next;
}

function sameMarks(left, right) {
    var leftLength = left ? left.length : 0;
    var rightLength = right ? right.length : 0;

    if (leftLength !== rightLength) {
        return false;
    }

    for (var index = 0; index < leftLength; index++) {
        if (getMarkKey(left[index]) !== getMarkKey(right[index])) {
            return false;
        }
    }

    return true;
}

function mergeAdjacentTextNodes(nodes) {
    var merged = [];

    for (var index = 0; index < nodes.length; index++) {
        var current = nodes[index];
        if (!current) {
            continue;
        }

        if (current.type === "text" && current.text) {
            var last = merged.length ? merged[merged.length - 1] : null;
            if (last && last.type === "text" && sameMarks(last.marks, current.marks)) {
                last.text += current.text;
                continue;
            }
        }

        merged.push(current);
    }

    return merged;
}

function createNode(type, options) {
    var node = { type: type };
    var source = options || {};

    if (source.attrs) {
        var attrs = copyAttributes(source.attrs);
        if (attrs) {
            node.attrs = attrs;
        }
    }

    if (source.content && source.content.length) {
        node.content = source.content;
    }

    if (source.text) {
        node.text = source.text;
    }

    if (source.marks && source.marks.length) {
        node.marks = source.marks;
    }

    if (source.html) {
        node.html = source.html;
    }

    return node;
}

function createStructuredContent(editorOrHtml) {
    var html = "";
    var text = "";
    var attrs = undefined;

    if (typeof editorOrHtml === "string") {
        html = editorOrHtml;
        text = getPlainTextFromHtml(html);
        var parsedPageSetup = parseStructuredDocumentAttributes(html);
        if (parsedPageSetup && parsedPageSetup.pageSetup) {
            attrs = parsedPageSetup;
        }
    } else if (editorOrHtml) {
        html = editorOrHtml.getHTMLCode ? editorOrHtml.getHTMLCode() : "";
        text = editorOrHtml.getPlainText ? editorOrHtml.getPlainText() : "";
        if (!text) {
            text = getPlainTextFromHtml(html);
        }
    }

    return {
        type: "doc",
        version: 2,
        format: "richtexteditor-json",
        attrs: attrs,
        html: html || "",
        text: text || "",
        content: parseStructuredContentHtml(html || "")
    };
}

function parseStructuredDocumentAttributes(html) {
    var root = getDocumentBody(html);
    if (!root || !root.childNodes) {
        return null;
    }

    for (var index = 0; index < root.childNodes.length; index++) {
        var node = root.childNodes[index];
        if (!node || node.nodeType !== 1) {
            continue;
        }

        if (hasElementAttributeValue(node, "data-rte-page-setup", "true")) {
            var pageSetup = parsePageSetupNode(node);
            if (pageSetup) {
                return { pageSetup: pageSetup };
            }
        }
    }

    return null;
}

function parseStructuredContentHtml(html) {
    var root = getDocumentBody(html);
    if (!root) {
        return [];
    }

    return parseBlockNodes(root.childNodes);
}

function parseBlockNodes(nodeList) {
    var blocks = [];
    var inlineBuffer = [];

    function flushInlineBuffer() {
        if (!inlineBuffer.length) {
            return;
        }

        blocks.push(createNode("paragraph", {
            content: mergeAdjacentTextNodes(inlineBuffer)
        }));
        inlineBuffer = [];
    }

    for (var index = 0; index < nodeList.length; index++) {
        var node = nodeList[index];

        if (!node) {
            continue;
        }

        if (node.nodeType === 3) {
            var text = node.nodeValue || "";
            if (text.replace(/\s+/g, "") !== "") {
                inlineBuffer = inlineBuffer.concat(parseInlineNode(node, []));
            }
            continue;
        }

        if (node.nodeType !== 1) {
            continue;
        }

        var tagName = getElementTagName(node);

        if (tagName === "br" || INLINE_CONTAINER_TAGS[tagName]) {
            inlineBuffer = inlineBuffer.concat(parseInlineNode(node, []));
            continue;
        }

        flushInlineBuffer();

        var blockNode = parseBlockNode(node);
        if (!blockNode) {
            continue;
        }

        if (isArray(blockNode)) {
            for (var childIndex = 0; childIndex < blockNode.length; childIndex++) {
                blocks.push(blockNode[childIndex]);
            }
            continue;
        }

        blocks.push(blockNode);
    }

    flushInlineBuffer();
    return blocks;
}

function parseBlockNode(node) {
    var tagName = getElementTagName(node);
    var blockAlign = getElementTextAlignment(node, true);

    if (hasElementAttributeValue(node, "data-rte-page-setup", "true")) {
        return null;
    }

    if (hasElementAttributeValue(node, "data-rte-page-break", "true")) {
        return parsePageBreakNode(node);
    }

    if (hasElementAttributeValue(node, "data-rte-toc", "true")) {
        return parseTableOfContentsNode(node);
    }

    if (hasElementAttributeValue(node, "data-rte-footnotes", "true")) {
        return parseFootnotesNode(node);
    }

    if (BLOCK_CONTAINER_TAGS[tagName]) {
        var childBlocks = parseBlockNodes(node.childNodes);
        if (childBlocks.length) {
            return childBlocks;
        }

        return null;
    }

    if (tagName === "p") {
        return createNode("paragraph", {
            attrs: blockAlign ? { align: blockAlign } : undefined,
            content: parseInlineChildren(node)
        });
    }

    if (/^h[1-6]$/.test(tagName)) {
        return createNode("heading", {
            attrs: createHeadingAttrs(parseInt(tagName.charAt(1), 10) || 1, blockAlign),
            content: parseInlineChildren(node)
        });
    }

    if (tagName === "blockquote") {
        return createNode("blockquote", {
            content: parseBlockNodes(node.childNodes)
        });
    }

    if (tagName === "pre") {
        return createNode("codeBlock", {
            text: node.textContent || ""
        });
    }

    if (tagName === "ul") {
        if (isTaskListElement(node)) {
            return createNode("taskList", {
                content: parseTaskListItems(node)
            });
        }

        return createNode("bulletList", {
            content: parseListItems(node)
        });
    }

    if (tagName === "ol") {
        var startValue = node.getAttribute("start");
        var orderedListType = normalizeOrderedListType(getElementAttribute(node, "type"));
        if (!orderedListType && node.style && typeof node.style.listStyleType === "string") {
            orderedListType = normalizeOrderedListType(node.style.listStyleType);
        }
        var orderedListAttrs = {};
        if (startValue) {
            orderedListAttrs.start = parseInt(startValue, 10) || 1;
        }
        if (orderedListType) {
            orderedListAttrs.orderedListType = orderedListType;
        }
        return createNode("orderedList", {
            attrs: Object.keys(orderedListAttrs).length ? orderedListAttrs : undefined,
            content: parseListItems(node)
        });
    }

    if (tagName === "li") {
        return createNode("listItem", {
            content: parseBlockNodes(node.childNodes)
        });
    }

    if (tagName === "hr") {
        return createNode("horizontalRule");
    }

    if (tagName === "img") {
        return parseImageNode(node);
    }

    if (tagName === "table") {
        return createNode("table", {
            content: parseTableRows(node)
        });
    }

    return createNode("htmlBlock", {
        html: node.outerHTML || "",
        text: normalizePlainText(node.textContent || "")
    });
}

function parsePageBreakNode(element) {
    var attrs = {};
    var labelText = normalizePlainText(element.textContent || "");
    if (labelText) {
        attrs.label = labelText;
    }

    return createNode("pageBreak", {
        attrs: attrs
    });
}

function parseTableOfContentsNode(element) {
    var items = [];
    var listRoot = null;
    var ordered = false;
    var orderedListType;

    var orderedLists = findDescendantsByTagName(element, "ol");
    if (orderedLists.length) {
        listRoot = orderedLists[0];
        ordered = true;
        orderedListType = normalizeOrderedListType(getElementAttribute(listRoot, "type"));
    }
    else {
        var unorderedLists = findDescendantsByTagName(element, "ul");
        if (unorderedLists.length) {
            listRoot = unorderedLists[0];
        }
    }

    if (listRoot) {
        collectTableOfContentsItemsFromList(listRoot, 1, items);
    }
    else {
        var anchors = findDescendantsByTagName(element, "a");
        for (var index = 0; index < anchors.length; index++) {
            var anchor = anchors[index];
            var href = getElementAttribute(anchor, "href");
            if (!href || href.charAt(0) !== "#") {
                continue;
            }

            var parent = anchor.parentNode;
            var marginLeft = 0;
            if (parent && parent.style && typeof parent.style.marginLeft === "string") {
                marginLeft = parseInt(parent.style.marginLeft, 10) || 0;
            }

            items.push({
                id: href.substring(1),
                level: Math.max(1, Math.floor(marginLeft / 16) + 1),
                text: normalizePlainText(anchor.textContent || "")
            });
        }
    }

    var attrs = {};
    var titleNode = getFirstElementChild(element, "div");
    var titleText = titleNode ? normalizePlainText(titleNode.textContent || "") : "";
    if (titleText) {
        attrs.title = titleText;
    }
    else {
        attrs.includeTitle = false;
    }
    if (items.length) {
        attrs.items = items;
    }
    if (ordered) {
        attrs.ordered = true;
    }
    if (orderedListType) {
        attrs.orderedListType = orderedListType;
    }

    return createNode("tableOfContents", {
        attrs: attrs
    });
}

function collectTableOfContentsItemsFromList(listNode, level, items) {
    var children = listNode && listNode.childNodes ? listNode.childNodes : [];
    for (var index = 0; index < children.length; index++) {
        var child = children[index];
        if (!child || child.nodeType !== 1 || getElementTagName(child) !== "li") {
            continue;
        }

        var anchors = findDescendantsByTagName(child, "a");
        var anchor = anchors.length ? anchors[0] : null;
        if (anchor) {
            var href = getElementAttribute(anchor, "href");
            if (href && href.charAt(0) === "#") {
                items.push({
                    id: href.substring(1),
                    level: level,
                    text: normalizePlainText(anchor.textContent || "")
                });
            }
        }

        var nestedList = getFirstElementChild(child, "ol") || getFirstElementChild(child, "ul");
        if (nestedList) {
            collectTableOfContentsItemsFromList(nestedList, level + 1, items);
        }
    }
}

function parseFootnoteItemNode(element) {
    var attrs = {};
    var number = parseInt(getElementAttribute(element, "data-rte-footnote-item"), 10) || 0;
    if (number) {
        attrs.number = number;
    }
    if (getElementAttribute(element, "id")) {
        attrs.id = getElementAttribute(element, "id");
    }

    var childNodes = [];
    var children = element.childNodes || [];
    for (var index = 0; index < children.length; index++) {
        var child = children[index];
        if (!child) {
            continue;
        }

        if (child.nodeType === 1 && getElementTagName(child) === "a") {
            var href = getElementAttribute(child, "href");
            if (href && href.charAt(0) === "#") {
                attrs.refId = href.substring(1);
                continue;
            }
        }

        childNodes.push(child);
    }

    var content = parseBlockNodes(childNodes);
    if (!content.length) {
        content = [createNode("paragraph", {
            content: [createNode("text", { text: normalizePlainText(element.textContent || "") })]
        })];
    }

    return createNode("footnoteItem", {
        attrs: attrs,
        content: content
    });
}

function parseFootnotesNode(element) {
    var attrs = {};
    var titleNode = getFirstElementChild(element, "div");
    var titleText = titleNode ? normalizePlainText(titleNode.textContent || "") : "";
    if (titleText) {
        attrs.title = titleText;
    }

    var list = getFirstElementChild(element, "ol") || getFirstElementChild(element, "ul");
    var items = [];
    if (list) {
        var itemElements = getElementChildElements(list, "li");
        for (var index = 0; index < itemElements.length; index++) {
            items.push(parseFootnoteItemNode(itemElements[index]));
        }
    }

    return createNode("footnotes", {
        attrs: attrs,
        content: items
    });
}

function parseListItems(listElement) {
    var items = [];

    for (var index = 0; index < listElement.childNodes.length; index++) {
        var child = listElement.childNodes[index];
        if (child && child.nodeType === 1 && getElementTagName(child) === "li") {
            items.push(parseBlockNode(child));
        }
    }

    return items;
}

function isTaskListElement(element) {
    if (!element || getElementTagName(element) !== "ul") {
        return false;
    }

    if (String(element.getAttribute("data-rte-task-list") || "").toLowerCase() === "true") {
        return true;
    }

    for (var index = 0; index < element.childNodes.length; index++) {
        var child = element.childNodes[index];
        if (!child || child.nodeType !== 1 || getElementTagName(child) !== "li") {
            continue;
        }

        if (findTaskListCheckbox(child)) {
            return true;
        }
    }

    return false;
}

function findTaskListCheckbox(listItemElement) {
    if (!listItemElement || listItemElement.nodeType !== 1) {
        return null;
    }

    for (var index = 0; index < listItemElement.childNodes.length; index++) {
        var child = listItemElement.childNodes[index];
        if (!child || child.nodeType !== 1) {
            continue;
        }

        if (getElementTagName(child) === "input" && String(child.getAttribute("type") || "").toLowerCase() === "checkbox") {
            return child;
        }

        if (getElementTagName(child) === "label") {
            for (var nestedIndex = 0; nestedIndex < child.childNodes.length; nestedIndex++) {
                var nestedChild = child.childNodes[nestedIndex];
                if (nestedChild && nestedChild.nodeType === 1 && getElementTagName(nestedChild) === "input" && String(nestedChild.getAttribute("type") || "").toLowerCase() === "checkbox") {
                    return nestedChild;
                }
            }
        }
    }

    return null;
}

function parseTaskListItems(listElement) {
    var items = [];

    for (var index = 0; index < listElement.childNodes.length; index++) {
        var child = listElement.childNodes[index];
        if (child && child.nodeType === 1 && getElementTagName(child) === "li") {
            items.push(parseTaskListItem(child));
        }
    }

    return items;
}

function parseTaskListItem(listItemElement) {
    var attrs = {};
    var checkbox = findTaskListCheckbox(listItemElement);
    var childNodes = [];

    if (checkbox) {
        attrs.checked = checkbox.checked || String(checkbox.getAttribute("checked") || "").toLowerCase() === "checked";
    }

    for (var index = 0; index < listItemElement.childNodes.length; index++) {
        var child = listItemElement.childNodes[index];
        if (!child) {
            continue;
        }

        if (child === checkbox) {
            continue;
        }

        if (child.nodeType === 3 && !normalizePlainText(child.nodeValue || "")) {
            continue;
        }

        if (child.nodeType === 1 && getElementTagName(child) === "label" && checkbox && child.contains(checkbox)) {
            for (var nestedIndex = 0; nestedIndex < child.childNodes.length; nestedIndex++) {
                var nestedChild = child.childNodes[nestedIndex];
                if (!nestedChild || nestedChild === checkbox) {
                    continue;
                }

                childNodes.push(nestedChild);
            }
            continue;
        }

        childNodes.push(child);
    }

    var content = parseBlockNodes(childNodes);
    if (!content.length) {
        content = [createNode("paragraph", {
            content: parseInlineChildren(listItemElement)
        })];
    }

    return createNode("taskItem", {
        attrs: attrs,
        content: content
    });
}

function parseTableRows(tableElement) {
    var rows = [];

    function collectRows(node) {
        for (var index = 0; index < node.childNodes.length; index++) {
            var child = node.childNodes[index];
            if (!child || child.nodeType !== 1) {
                continue;
            }

            var tagName = getElementTagName(child);
            if (tagName === "tr") {
                rows.push(parseTableRow(child));
                continue;
            }

            if (tagName === "thead" || tagName === "tbody" || tagName === "tfoot") {
                collectRows(child);
            }
        }
    }

    collectRows(tableElement);
    return rows;
}

function parseTableRow(rowElement) {
    var cells = [];

    for (var index = 0; index < rowElement.childNodes.length; index++) {
        var cell = rowElement.childNodes[index];
        if (!cell || cell.nodeType !== 1) {
            continue;
        }

        var tagName = getElementTagName(cell);
        if (tagName === "td" || tagName === "th") {
            cells.push(parseTableCell(cell));
        }
    }

    return createNode("tableRow", {
        content: cells
    });
}

function parseTableCell(cellElement) {
    var attrs = {};
    var colspan = cellElement.getAttribute("colspan");
    var rowspan = cellElement.getAttribute("rowspan");

    if (getElementTagName(cellElement) === "th") {
        attrs.header = true;
    }

    var align = getElementTextAlignment(cellElement, false);
    if (align === "left" || align === "center" || align === "right") {
        attrs.align = align;
    }

    if (colspan) {
        attrs.colspan = parseInt(colspan, 10) || 1;
    }

    if (rowspan) {
        attrs.rowspan = parseInt(rowspan, 10) || 1;
    }

    return createNode("tableCell", {
        attrs: attrs,
        content: parseBlockNodes(cellElement.childNodes)
    });
}

function createHeadingAttrs(level, align) {
    var attrs = {
        level: level
    };

    if (align) {
        attrs.align = align;
    }

    return attrs;
}

function normalizeTextAlignment(value, allowJustify) {
    var normalized = String(value || "").toLowerCase().replace(/^\s+|\s+$/g, "");
    if (normalized === "left" || normalized === "center" || normalized === "right") {
        return normalized;
    }
    if (allowJustify && normalized === "justify") {
        return normalized;
    }
    return "";
}

function getElementTextAlignment(element, allowJustify) {
    var styleTextAlign = "";

    if (element && element.style && typeof element.style.textAlign === "string") {
        styleTextAlign = element.style.textAlign;
    }

    return normalizeTextAlignment(styleTextAlign || (element ? element.getAttribute("align") : ""), allowJustify);
}

function getElementAttribute(element, name) {
    if (!element || typeof element.getAttribute !== "function") {
        return "";
    }

    return element.getAttribute(name) || "";
}

function hasElementAttributeValue(element, name, value) {
    return String(getElementAttribute(element, name)).toLowerCase() === String(value || "").toLowerCase();
}

function getElementChildElements(element, tagName) {
    var results = [];
    var normalizedTagName = tagName ? String(tagName).toLowerCase() : "";

    if (!element || !element.childNodes) {
        return results;
    }

    for (var index = 0; index < element.childNodes.length; index++) {
        var child = element.childNodes[index];
        if (!child || child.nodeType !== 1) {
            continue;
        }

        if (!normalizedTagName || getElementTagName(child) === normalizedTagName) {
            results.push(child);
        }
    }

    return results;
}

function getFirstElementChild(element, tagName) {
    var children = getElementChildElements(element, tagName);
    return children.length ? children[0] : null;
}

function findDescendantsByTagName(element, tagName, results) {
    var matches = results || [];
    var normalizedTagName = String(tagName || "").toLowerCase();

    if (!element || !element.childNodes) {
        return matches;
    }

    for (var index = 0; index < element.childNodes.length; index++) {
        var child = element.childNodes[index];
        if (!child || child.nodeType !== 1) {
            continue;
        }

        if (getElementTagName(child) === normalizedTagName) {
            matches.push(child);
        }

        findDescendantsByTagName(child, normalizedTagName, matches);
    }

    return matches;
}

function parseImageNode(element) {
    return createNode("image", {
        attrs: {
            src: element.getAttribute("src") || "",
            alt: element.getAttribute("alt") || "",
            title: element.getAttribute("title") || "",
            width: element.getAttribute("width") || "",
            height: element.getAttribute("height") || ""
        }
    });
}

function parseInlineChildren(element, marks) {
    return mergeAdjacentTextNodes(parseInlineNodes(element.childNodes, marks || []));
}

function parseMergeFieldNode(element, activeMarks) {
    var name = getElementAttribute(element, "data-rte-merge-field");
    var label = normalizePlainText(element.textContent || "");
    var attrs = {
        name: name
    };

    if (label) {
        attrs.label = label;
    }

    return createNode("mergeField", {
        attrs: attrs,
        marks: activeMarks.length ? activeMarks.slice() : undefined
    });
}

function parseFootnoteReferenceNode(element, activeMarks) {
    var number = parseInt(getElementAttribute(element, "data-rte-footnote-ref"), 10) || 0;
    var link = getFirstElementChild(element, "a");
    var targetId = link ? String(getElementAttribute(link, "href")).replace(/^#/, "") : "";
    var attrs = {
        number: number
    };

    if (getElementAttribute(element, "id")) {
        attrs.id = getElementAttribute(element, "id");
    }

    if (targetId) {
        attrs.targetId = targetId;
    }

    return createNode("footnoteReference", {
        attrs: attrs,
        marks: activeMarks.length ? activeMarks.slice() : undefined
    });
}

function parseInlineNodes(nodeList, activeMarks) {
    var nodes = [];

    for (var index = 0; index < nodeList.length; index++) {
        nodes = nodes.concat(parseInlineNode(nodeList[index], activeMarks));
    }

    return nodes;
}

function parseInlineNode(node, activeMarks) {
    if (!node) {
        return [];
    }

    if (node.nodeType === 3) {
        if (!node.nodeValue) {
            return [];
        }

        return [createNode("text", {
            text: node.nodeValue,
            marks: activeMarks.length ? activeMarks.slice() : undefined
        })];
    }

    if (node.nodeType !== 1) {
        return [];
    }

    var tagName = getElementTagName(node);
    if (tagName === "br") {
        return [createNode("hardBreak")];
    }

    if (getElementAttribute(node, "data-rte-merge-field")) {
        return [parseMergeFieldNode(node, activeMarks)];
    }

    if (tagName === "sup" && getElementAttribute(node, "data-rte-footnote-ref")) {
        return [parseFootnoteReferenceNode(node, activeMarks)];
    }

    if (tagName === "img") {
        return [parseImageNode(node)];
    }

    var marks = activeMarks.slice();
    var extractedMarks = extractElementMarks(node);
    for (var index = 0; index < extractedMarks.length; index++) {
        marks = appendMark(marks, extractedMarks[index]);
    }

    return parseInlineNodes(node.childNodes, marks);
}

function extractElementMarks(element) {
    var marks = [];
    var tagName = getElementTagName(element);
    var style = element.style || {};
    var textDecoration = style.textDecorationLine || style.textDecoration || "";
    var styleAttrs = {};

    function pushMark(type, attrs) {
        marks.push({
            type: type,
            attrs: copyAttributes(attrs || {})
        });
    }

    if (tagName === "strong" || tagName === "b") {
        pushMark("bold");
    }

    if (tagName === "em" || tagName === "i") {
        pushMark("italic");
    }

    if (tagName === "u") {
        pushMark("underline");
    }

    if (tagName === "s" || tagName === "strike" || tagName === "del") {
        pushMark("strike");
    }

    if (tagName === "code") {
        pushMark("code");
    }

    if (tagName === "sub") {
        pushMark("subscript");
    }

    if (tagName === "sup") {
        pushMark("superscript");
    }

    if (tagName === "a") {
        pushMark("link", {
            href: element.getAttribute("href") || "",
            rel: element.getAttribute("rel") || "",
            target: element.getAttribute("target") || "",
            title: element.getAttribute("title") || ""
        });
    }

    if (style.fontWeight && (/bold|[5-9]00/).test(style.fontWeight)) {
        pushMark("bold");
    }

    if (style.fontStyle === "italic") {
        pushMark("italic");
    }

    if (textDecoration.indexOf("underline") >= 0) {
        pushMark("underline");
    }

    if (textDecoration.indexOf("line-through") >= 0) {
        pushMark("strike");
    }

    if (style.color) {
        styleAttrs.color = style.color;
    }

    if (style.backgroundColor) {
        styleAttrs.backgroundColor = style.backgroundColor;
    } else if (tagName === "mark") {
        styleAttrs.backgroundColor = "#fff2ac";
    }

    if (style.fontSize) {
        styleAttrs.fontSize = style.fontSize;
    }

    if (style.fontFamily) {
        styleAttrs.fontFamily = style.fontFamily;
    }

    if (!styleAttrs.color && element.getAttribute("color")) {
        styleAttrs.color = element.getAttribute("color");
    }

    if (!styleAttrs.fontFamily && element.getAttribute("face")) {
        styleAttrs.fontFamily = element.getAttribute("face");
    }

    if (!styleAttrs.fontSize && element.getAttribute("size")) {
        styleAttrs.fontSize = element.getAttribute("size");
    }

    if (tagName === "small" && !styleAttrs.fontSize) {
        styleAttrs.fontSize = "0.85em";
    }

    if (tagName === "big" && !styleAttrs.fontSize) {
        styleAttrs.fontSize = "1.15em";
    }

    if (copyAttributes(styleAttrs)) {
        pushMark("textStyle", styleAttrs);
    }

    return marks;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
}

function buildAttributeString(attrs) {
    var result = "";

    if (!attrs) {
        return result;
    }

    for (var key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) {
            continue;
        }

        var value = attrs[key];
        if (value === undefined || value === null || value === "") {
            continue;
        }

        // Drop URL-bearing attributes with a dangerous protocol (javascript:,
        // vbscript:, non-image data:) so structured content from an untrusted
        // source cannot render an executable href/src. The element (link text /
        // image) is still emitted, just without the unsafe destination.
        if ((key === "href" || key === "src") && normalizeInlineMarkdownLinkHref(value) === null) {
            continue;
        }

        result += " " + key + '="' + escapeAttribute(value) + '"';
    }

    return result;
}

function renderTableOfContentsList(items, ordered, orderedListType) {
    var tagName = ordered ? "ol" : "ul";
    var attributes = "";
    if (ordered && orderedListType) {
        attributes = ' type="' + escapeAttribute(orderedListType) + '"';
    }

    var html = "<" + tagName + attributes + ' style="margin:0;padding-left:22px;color:#1e293b;">';
    for (var index = 0; index < items.length; index++) {
        var item = items[index] || {};
        html += '<li style="margin:6px 0;"><a href="#' + escapeAttribute(item.id || "") + '" style="color:#1d4ed8;text-decoration:none;">' + escapeHtml(item.text || "") + "</a>";
        if (isArray(item.children) && item.children.length) {
            html += renderTableOfContentsList(item.children, ordered, orderedListType);
        }
        html += "</li>";
    }
    html += "</" + tagName + ">";
    return html;
}

function buildStyleString(attrs) {
    if (!attrs) {
        return "";
    }

    var styles = [];
    if (attrs.color) {
        styles.push("color: " + attrs.color);
    }
    if (attrs.backgroundColor) {
        styles.push("background-color: " + attrs.backgroundColor);
    }
    if (attrs.fontSize) {
        styles.push("font-size: " + attrs.fontSize);
    }
    if (attrs.fontFamily) {
        styles.push("font-family: " + attrs.fontFamily);
    }

    return styles.join("; ");
}

function serializeInlineNodes(nodes) {
    var html = "";

    for (var index = 0; index < (nodes || []).length; index++) {
        html += serializeNode(nodes[index], true);
    }

    return html;
}

function serializeBlockNodes(nodes) {
    var html = "";

    for (var index = 0; index < (nodes || []).length; index++) {
        html += serializeNode(nodes[index], false);
    }

    return html;
}

function serializeListItemContent(nodes) {
    if (!nodes || !nodes.length) {
        return "";
    }

    if (nodes.length === 1 && nodes[0].type === "paragraph") {
        return serializeInlineNodes(nodes[0].content || []);
    }

    return serializeBlockNodes(nodes);
}

function serializeTableCellContent(nodes) {
    if (!nodes || !nodes.length) {
        return "";
    }

    if (nodes.length === 1 && nodes[0].type === "paragraph") {
        return serializeInlineNodes(nodes[0].content || []);
    }

    return serializeBlockNodes(nodes);
}

function applyMark(mark, html) {
    var attrs = mark.attrs || {};

    if (mark.type === "bold") {
        return "<strong>" + html + "</strong>";
    }

    if (mark.type === "italic") {
        return "<em>" + html + "</em>";
    }

    if (mark.type === "underline") {
        return "<u>" + html + "</u>";
    }

    if (mark.type === "strike") {
        return "<s>" + html + "</s>";
    }

    if (mark.type === "code") {
        return "<code>" + html + "</code>";
    }

    if (mark.type === "subscript") {
        return "<sub>" + html + "</sub>";
    }

    if (mark.type === "superscript") {
        return "<sup>" + html + "</sup>";
    }

    if (mark.type === "link") {
        return "<a" + buildAttributeString({
            href: attrs.href,
            rel: attrs.rel,
            target: attrs.target,
            title: attrs.title
        }) + ">" + html + "</a>";
    }

    if (mark.type === "textStyle") {
        var style = buildStyleString(attrs);
        return style ? '<span style="' + escapeAttribute(style) + '">' + html + "</span>" : html;
    }

    return html;
}

function serializeNode(node, inlineMode) {
    if (!node || typeof node !== "object") {
        return "";
    }

    if (node.type === "doc") {
        return serializeBlockNodes(node.content || []);
    }

    if (node.type === "text") {
        var textHtml = escapeHtml(node.text || "");
        var marks = node.marks || [];

        for (var markIndex = marks.length - 1; markIndex >= 0; markIndex--) {
            textHtml = applyMark(marks[markIndex], textHtml);
        }

        return textHtml;
    }

    if (node.type === "hardBreak") {
        return "<br />";
    }

    if (node.type === "mergeField") {
        var mergeAttrs = node.attrs || {};
        var mergeName = String(mergeAttrs.name || "");
        var mergeLabel = String(mergeAttrs.label || mergeName || "");
        return '<span data-rte-merge-field="' + escapeAttribute(mergeName) + '" contenteditable="false" style="display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border:1px solid #bfdbfe;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:0.95em;font-weight:600;white-space:nowrap;">' + escapeHtml(mergeLabel) + "</span>";
    }

    if (node.type === "footnoteReference") {
        var referenceAttrs = node.attrs || {};
        var referenceNumber = parseInt(referenceAttrs.number, 10) || 1;
        var referenceId = String(referenceAttrs.id || ("rte-footnote-ref-" + referenceNumber));
        var referenceTargetId = String(referenceAttrs.targetId || ("rte-footnote-item-" + referenceNumber));
        return '<sup id="' + escapeAttribute(referenceId) + '" data-rte-footnote-ref="' + escapeAttribute(referenceNumber) + '" style="font-size:0.75em;line-height:1;vertical-align:super;"><a href="#' + escapeAttribute(referenceTargetId) + '" style="color:#1d4ed8;text-decoration:none;">[' + escapeHtml(referenceNumber) + "]</a></sup>";
    }

    if (node.type === "image") {
        return "<img" + buildAttributeString(node.attrs || {}) + " />";
    }

    if (node.type === "paragraph") {
        var paragraphAttrs = buildBlockAlignmentAttributes(node, true);
        return inlineMode
            ? serializeInlineNodes(node.content || [])
            : "<p" + buildAttributeString(paragraphAttrs) + ">" + serializeInlineNodes(node.content || []) + "</p>";
    }

    if (node.type === "heading") {
        var level = 1;
        var headingAttrs = node.attrs || {};
        if (node.attrs && node.attrs.level) {
            level = parseInt(node.attrs.level, 10) || 1;
        }
        if (level < 1) {
            level = 1;
        }
        if (level > 6) {
            level = 6;
        }

        var headingHtmlAttrs = buildBlockAlignmentAttributes(node, true);
        if (headingAttrs.id) {
            headingHtmlAttrs.id = headingAttrs.id;
        }

        return "<h" + level + buildAttributeString(headingHtmlAttrs) + ">" + serializeInlineNodes(node.content || []) + "</h" + level + ">";
    }

    if (node.type === "blockquote") {
        return "<blockquote>" + serializeBlockNodes(node.content || []) + "</blockquote>";
    }

    if (node.type === "codeBlock") {
        return "<pre><code>" + escapeHtml(node.text || "") + "</code></pre>";
    }

    if (node.type === "bulletList") {
        return "<ul>" + serializeBlockNodes(node.content || []) + "</ul>";
    }

    if (node.type === "orderedList") {
        var listAttrs = {};
        if (node.attrs && node.attrs.start) {
            listAttrs.start = node.attrs.start;
        }
        if (node.attrs) {
            var normalizedOrderedListType = normalizeOrderedListType(node.attrs.orderedListType);
            if (normalizedOrderedListType) {
                listAttrs.type = normalizedOrderedListType;
            }
        }
        return "<ol" + buildAttributeString(listAttrs) + ">" + serializeBlockNodes(node.content || []) + "</ol>";
    }

    if (node.type === "listItem") {
        return "<li>" + serializeListItemContent(node.content || []) + "</li>";
    }

    if (node.type === "taskList") {
        return '<ul data-rte-task-list="true">' + serializeBlockNodes(node.content || []) + "</ul>";
    }

    if (node.type === "taskItem") {
        var checkboxAttrs = { type: "checkbox", disabled: "disabled" };
        if (node.attrs && node.attrs.checked) {
            checkboxAttrs.checked = "checked";
        }
        return "<li data-rte-task-item=\"true\"><input" + buildAttributeString(checkboxAttrs) + " />" + serializeListItemContent(node.content || []) + "</li>";
    }

    if (node.type === "horizontalRule") {
        return "<hr />";
    }

    if (node.type === "pageBreak") {
        var pageBreakAttrs = node.attrs || {};
        var pageBreakLabel = String(pageBreakAttrs.label || "Page Break");
        return '<div data-rte-page-break="true" contenteditable="false" style="position:relative;text-align:center;border-top:2px dashed #94a3b8;margin:18px 0 14px;padding:0;height:0;line-height:0;user-select:none;"><span style="position:relative;top:-0.75em;display:inline-block;padding:0 10px;background:#fff;color:#64748b;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;line-height:1.6;">' + escapeHtml(pageBreakLabel) + "</span></div>";
    }

    if (node.type === "tableOfContents") {
        var tocAttrs = node.attrs || {};
        var tocItems = isArray(tocAttrs.items) ? tocAttrs.items : [];
        var tocTitle = String(tocAttrs.title || "Table of Contents");
        var tocIncludeTitle = tocAttrs.includeTitle !== false;
        var tocOrdered = tocAttrs.ordered === true;
        var tocOrderedListType = normalizeOrderedListType(tocAttrs.orderedListType);
        var tocHtml = "";
        if (tocIncludeTitle) {
            tocHtml += '<div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#475569;margin-bottom:10px;">' + escapeHtml(tocTitle) + "</div>";
        }
        tocHtml += renderTableOfContentsList(buildTableOfContentsTreeFromItems(tocItems), tocOrdered, tocOrderedListType);
        return '<div data-rte-toc="true" contenteditable="false" style="margin:18px 0;padding:16px 18px;border:1px solid #dbeafe;border-radius:16px;background:#f8fbff;">' + tocHtml + "</div>";
    }

    if (node.type === "footnotes") {
        var footnotesAttrs = node.attrs || {};
        var footnotesTitle = String(footnotesAttrs.title || "Footnotes");
        return '<div data-rte-footnotes="true" style="margin-top:24px;padding-top:14px;border-top:1px solid #cbd5e1;"><div style="margin-bottom:10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#475569;">' + escapeHtml(footnotesTitle) + "</div><ol style=\"margin:0;padding-left:22px;color:#334155;\">" + serializeBlockNodes(node.content || []) + "</ol></div>";
    }

    if (node.type === "footnoteItem") {
        var footnoteItemAttrs = node.attrs || {};
        var footnoteItemNumber = parseInt(footnoteItemAttrs.number, 10) || 1;
        var footnoteItemId = String(footnoteItemAttrs.id || ("rte-footnote-item-" + footnoteItemNumber));
        var footnoteRefId = String(footnoteItemAttrs.refId || ("rte-footnote-ref-" + footnoteItemNumber));
        return '<li id="' + escapeAttribute(footnoteItemId) + '" data-rte-footnote-item="' + escapeAttribute(footnoteItemNumber) + '" style="margin:0 0 10px 0;line-height:1.7;">' + serializeListItemContent(node.content || []) + ' <a href="#' + escapeAttribute(footnoteRefId) + '" style="color:#1d4ed8;text-decoration:none;">&#8617;</a></li>';
    }

    if (node.type === "table") {
        return "<table>" + serializeBlockNodes(node.content || []) + "</table>";
    }

    if (node.type === "tableRow") {
        return "<tr>" + serializeBlockNodes(node.content || []) + "</tr>";
    }

    if (node.type === "tableCell") {
        var cellTag = node.attrs && node.attrs.header ? "th" : "td";
        var cellAttrs = {};

        if (node.attrs) {
            if (node.attrs.align) {
                cellAttrs.align = node.attrs.align;
                cellAttrs.style = "text-align: " + node.attrs.align;
            }
            if (node.attrs.colspan) {
                cellAttrs.colspan = node.attrs.colspan;
            }
            if (node.attrs.rowspan) {
                cellAttrs.rowspan = node.attrs.rowspan;
            }
        }

        return "<" + cellTag + buildAttributeString(cellAttrs) + ">" + serializeTableCellContent(node.content || []) + "</" + cellTag + ">";
    }

    if (node.type === "htmlBlock" || node.type === "htmlInline") {
        return node.html || "";
    }

    if (isArray(node.content)) {
        return inlineMode ? serializeInlineNodes(node.content) : serializeBlockNodes(node.content);
    }

    if (typeof node.html === "string") {
        return node.html;
    }

    if (typeof node.text === "string") {
        return escapeHtml(node.text);
    }

    return "";
}

function serializeStructuredContent(value) {
    if (value == null) {
        return "";
    }

    if (typeof value === "string") {
        var trimmed = value.trim();
        if (trimmed && (trimmed.charAt(0) === "{" || trimmed.charAt(0) === "[")) {
            try {
                return serializeStructuredContent(JSON.parse(trimmed));
            } catch (error) {
                return value;
            }
        }

        return value;
    }

    if (typeof value !== "object") {
        return String(value);
    }

    if (value.type === "doc" && isArray(value.content)) {
        var normalizedDocument = normalizeDocumentHeadingIds(value);
        return serializePageSetupMetadata(normalizeDocumentPageSetup(normalizedDocument.attrs && normalizedDocument.attrs.pageSetup)) + serializeBlockNodes(normalizedDocument.content);
    }

    if (value.type && value.type !== "doc") {
        return serializeNode(value, false);
    }

    if (isArray(value.content)) {
        var normalizedContentDocument = normalizeDocumentHeadingIds({
            type: "doc",
            version: typeof value.version === "number" ? value.version : 2,
            format: value.format || "richtexteditor-json",
            attrs: value.attrs,
            content: value.content
        });
        return serializePageSetupMetadata(normalizeDocumentPageSetup(normalizedContentDocument.attrs && normalizedContentDocument.attrs.pageSetup)) + serializeBlockNodes(normalizedContentDocument.content);
    }

    if (value.content && typeof value.content.html === "string") {
        return value.content.html;
    }

    if (typeof value.html === "string") {
        return value.html;
    }

    return "";
}

function normalizeStructuredContent(value) {
    return serializeStructuredContent(value);
}

function createValidationIssue(path, message) {
    return {
        message: message,
        path: path
    };
}

function createAccessibilityIssue(path, code, message, severity) {
    return {
        code: code,
        message: message,
        path: path,
        severity: severity || "warning"
    };
}

function buildBlockAlignmentAttributes(node, allowJustify) {
    var align = node && node.attrs ? normalizeTextAlignment(node.attrs.align, allowJustify) : "";
    if (!align) {
        return {};
    }

    return {
        align: align,
        style: "text-align: " + align
    };
}

function isStructuredNodeObject(value) {
    return !!value && typeof value === "object" && !isArray(value);
}

function createValidationDocument(value) {
    if (value == null) {
        return createStructuredDocument(value);
    }

    if (typeof value === "string") {
        return createStructuredDocument(value);
    }

    if (!isStructuredNodeObject(value)) {
        return createStructuredDocument(String(value));
    }

    if (value.type === "doc") {
        return {
            type: "doc",
            version: typeof value.version === "number" ? value.version : 2,
            format: typeof value.format === "string" ? value.format : "richtexteditor-json",
            attrs: value.attrs && typeof value.attrs === "object" ? Object.assign({}, value.attrs) : undefined,
            html: typeof value.html === "string" ? value.html : undefined,
            text: typeof value.text === "string" ? value.text : undefined,
            content: isArray(value.content) ? value.content : []
        };
    }

    if (value.type && value.type !== "doc") {
        return {
            type: "doc",
            version: 2,
            format: "richtexteditor-json",
            content: [value]
        };
    }

    if (isArray(value.content)) {
        return {
            type: "doc",
            version: typeof value.version === "number" ? value.version : 2,
            format: typeof value.format === "string" ? value.format : "richtexteditor-json",
            attrs: value.attrs && typeof value.attrs === "object" ? Object.assign({}, value.attrs) : undefined,
            html: typeof value.html === "string" ? value.html : undefined,
            text: typeof value.text === "string" ? value.text : undefined,
            content: value.content
        };
    }

    if (value.content && isStructuredNodeObject(value.content)) {
        return {
            type: "doc",
            version: typeof value.version === "number" ? value.version : 2,
            format: typeof value.format === "string" ? value.format : "richtexteditor-json",
            attrs: value.attrs && typeof value.attrs === "object" ? Object.assign({}, value.attrs) : undefined,
            html: typeof value.html === "string" ? value.html : undefined,
            text: typeof value.text === "string" ? value.text : undefined,
            content: [value.content]
        };
    }

    return createStructuredDocument(serializeStructuredContent(value));
}

function validateMark(mark, path, issues) {
    if (!isStructuredNodeObject(mark)) {
        issues.push(createValidationIssue(path, "Marks must be objects."));
        return;
    }

    if (typeof mark.type !== "string" || !mark.type) {
        issues.push(createValidationIssue(path + ".type", "Marks require a type."));
        return;
    }

    if (!MARK_TYPES[mark.type]) {
        issues.push(createValidationIssue(path + ".type", 'Unsupported mark type "' + mark.type + '".'));
    }

    if (mark.type === "link") {
        if (!mark.attrs || typeof mark.attrs.href !== "string" || !mark.attrs.href) {
            issues.push(createValidationIssue(path + ".attrs.href", "Link marks require a non-empty href."));
        }
    }
}

function validateNodeChildren(node, path, mode, issues) {
    if (!isArray(node.content)) {
        issues.push(createValidationIssue(path + ".content", "Node content must be an array."));
        return;
    }

    for (var index = 0; index < node.content.length; index++) {
        validateNode(node.content[index], path + ".content[" + index + "]", mode, issues);
    }
}

function validateNode(node, path, mode, issues) {
    if (!isStructuredNodeObject(node)) {
        issues.push(createValidationIssue(path, "Nodes must be objects."));
        return;
    }

    if (typeof node.type !== "string" || !node.type) {
        issues.push(createValidationIssue(path + ".type", "Nodes require a type."));
        return;
    }

    if (node.marks) {
        if (!isArray(node.marks)) {
            issues.push(createValidationIssue(path + ".marks", "Marks must be an array."));
        } else {
            for (var markIndex = 0; markIndex < node.marks.length; markIndex++) {
                validateMark(node.marks[markIndex], path + ".marks[" + markIndex + "]", issues);
            }
        }
    }

    if (mode === "inline" && !INLINE_NODE_TYPES[node.type]) {
        issues.push(createValidationIssue(path + ".type", 'Inline content cannot contain "' + node.type + '" nodes.'));
    }

    if (mode === "block" && !(BLOCK_NODE_TYPES[node.type] || node.type === "footnoteItem" || node.type === "tableRow" || node.type === "tableCell" || node.type === "listItem" || node.type === "taskItem")) {
        issues.push(createValidationIssue(path + ".type", 'Block content cannot contain "' + node.type + '" nodes.'));
    }

    if (node.type === "text") {
        if (typeof node.text !== "string") {
            issues.push(createValidationIssue(path + ".text", "Text nodes require a string text value."));
        }
        if (node.content) {
            issues.push(createValidationIssue(path + ".content", "Text nodes cannot contain child content."));
        }
        return;
    }

    if (node.type === "hardBreak") {
        if (node.content) {
            issues.push(createValidationIssue(path + ".content", "Hard break nodes cannot contain child content."));
        }
        return;
    }

    if (node.type === "mergeField") {
        if (!node.attrs || typeof node.attrs.name !== "string" || !node.attrs.name) {
            issues.push(createValidationIssue(path + ".attrs.name", "Merge field nodes require a non-empty name."));
        }
        return;
    }

    if (node.type === "footnoteReference") {
        if (!node.attrs || typeof node.attrs.number !== "number" || node.attrs.number < 1) {
            issues.push(createValidationIssue(path + ".attrs.number", "Footnote reference nodes require a positive number."));
        }
        return;
    }

    if (node.type === "image") {
        if (!node.attrs || typeof node.attrs.src !== "string" || !node.attrs.src) {
            issues.push(createValidationIssue(path + ".attrs.src", "Image nodes require a non-empty src."));
        }
        return;
    }

    if (node.type === "heading") {
        if (!node.attrs || typeof node.attrs.level !== "number" || node.attrs.level < 1 || node.attrs.level > 6) {
            issues.push(createValidationIssue(path + ".attrs.level", "Heading nodes require a level between 1 and 6."));
        }
        if (node.attrs && node.attrs.align !== undefined) {
            if (typeof node.attrs.align !== "string" || !/^(left|center|right|justify)$/.test(String(node.attrs.align).toLowerCase())) {
                issues.push(createValidationIssue(path + ".attrs.align", 'Heading nodes require align to be "left", "center", "right", or "justify" when provided.'));
            }
        }
        validateNodeChildren(node, path, "inline", issues);
        return;
    }

    if (node.type === "paragraph") {
        if (node.attrs && node.attrs.align !== undefined) {
            if (typeof node.attrs.align !== "string" || !/^(left|center|right|justify)$/.test(String(node.attrs.align).toLowerCase())) {
                issues.push(createValidationIssue(path + ".attrs.align", 'Paragraph nodes require align to be "left", "center", "right", or "justify" when provided.'));
            }
        }
        validateNodeChildren(node, path, "inline", issues);
        return;
    }

    if (node.type === "blockquote") {
        validateNodeChildren(node, path, "block", issues);
        return;
    }

    if (node.type === "codeBlock") {
        if (typeof node.text !== "string") {
            issues.push(createValidationIssue(path + ".text", "Code block nodes require a string text value."));
        }
        return;
    }

    if (node.type === "bulletList" || node.type === "orderedList") {
        if (node.type === "orderedList" && node.attrs && node.attrs.start !== undefined) {
            if (typeof node.attrs.start !== "number" || node.attrs.start < 1) {
                issues.push(createValidationIssue(path + ".attrs.start", "Ordered lists require a positive numeric start value."));
            }
        }
        if (node.type === "orderedList" && node.attrs && node.attrs.orderedListType !== undefined) {
            if (typeof node.attrs.orderedListType !== "string" || normalizeOrderedListType(node.attrs.orderedListType) !== node.attrs.orderedListType) {
                issues.push(createValidationIssue(path + ".attrs.orderedListType", 'Ordered lists require orderedListType to be one of "1", "A", "a", "I", or "i" when provided.'));
            }
        }

        if (!isArray(node.content)) {
            issues.push(createValidationIssue(path + ".content", "List nodes require a content array."));
            return;
        }

        for (var listIndex = 0; listIndex < node.content.length; listIndex++) {
            var listItem = node.content[listIndex];
            if (!listItem || listItem.type !== "listItem") {
                issues.push(createValidationIssue(path + ".content[" + listIndex + "]", "Lists can only contain listItem nodes."));
                continue;
            }
            validateNode(listItem, path + ".content[" + listIndex + "]", "block", issues);
        }
        return;
    }

    if (node.type === "listItem") {
        validateNodeChildren(node, path, "block", issues);
        return;
    }

    if (node.type === "taskList") {
        if (!isArray(node.content)) {
            issues.push(createValidationIssue(path + ".content", "Task lists require a content array."));
            return;
        }

        for (var taskItemIndex = 0; taskItemIndex < node.content.length; taskItemIndex++) {
            var taskItem = node.content[taskItemIndex];
            if (!taskItem || taskItem.type !== "taskItem") {
                issues.push(createValidationIssue(path + ".content[" + taskItemIndex + "]", "Task lists can only contain taskItem nodes."));
                continue;
            }
            validateNode(taskItem, path + ".content[" + taskItemIndex + "]", "block", issues);
        }
        return;
    }

    if (node.type === "taskItem") {
        if (node.attrs && node.attrs.checked !== undefined && typeof node.attrs.checked !== "boolean") {
            issues.push(createValidationIssue(path + ".attrs.checked", "Task items require a boolean checked attribute when provided."));
        }
        validateNodeChildren(node, path, "block", issues);
        return;
    }

    if (node.type === "horizontalRule") {
        return;
    }

    if (node.type === "pageBreak") {
        if (node.content) {
            issues.push(createValidationIssue(path + ".content", "Page break nodes cannot contain child content."));
        }
        return;
    }

    if (node.type === "tableOfContents") {
        var tocItems = node.attrs && node.attrs.items;
        if (!isArray(tocItems)) {
            issues.push(createValidationIssue(path + ".attrs.items", "Table of contents nodes require an items array."));
            return;
        }

        for (var tocIndex = 0; tocIndex < tocItems.length; tocIndex++) {
            var tocItem = tocItems[tocIndex];
            if (!isStructuredNodeObject(tocItem)) {
                issues.push(createValidationIssue(path + ".attrs.items[" + tocIndex + "]", "Table of contents items must be objects."));
                continue;
            }
            if (typeof tocItem.id !== "string" || !tocItem.id) {
                issues.push(createValidationIssue(path + ".attrs.items[" + tocIndex + "].id", "Table of contents items require a non-empty id."));
            }
            if (typeof tocItem.text !== "string" || !tocItem.text) {
                issues.push(createValidationIssue(path + ".attrs.items[" + tocIndex + "].text", "Table of contents items require non-empty text."));
            }
            if (typeof tocItem.level !== "number" || tocItem.level < 1 || tocItem.level > 6) {
                issues.push(createValidationIssue(path + ".attrs.items[" + tocIndex + "].level", "Table of contents items require a level between 1 and 6."));
            }
        }
        return;
    }

    if (node.type === "footnotes") {
        if (!isArray(node.content)) {
            issues.push(createValidationIssue(path + ".content", "Footnotes nodes require a content array."));
            return;
        }

        for (var footnoteIndex = 0; footnoteIndex < node.content.length; footnoteIndex++) {
            var footnoteItem = node.content[footnoteIndex];
            if (!footnoteItem || footnoteItem.type !== "footnoteItem") {
                issues.push(createValidationIssue(path + ".content[" + footnoteIndex + "]", "Footnotes can only contain footnoteItem nodes."));
                continue;
            }
            validateNode(footnoteItem, path + ".content[" + footnoteIndex + "]", "block", issues);
        }
        return;
    }

    if (node.type === "footnoteItem") {
        if (!node.attrs || typeof node.attrs.number !== "number" || node.attrs.number < 1) {
            issues.push(createValidationIssue(path + ".attrs.number", "Footnote items require a positive number."));
        }
        validateNodeChildren(node, path, "block", issues);
        return;
    }

    if (node.type === "table") {
        if (!isArray(node.content)) {
            issues.push(createValidationIssue(path + ".content", "Table nodes require a content array."));
            return;
        }

        for (var rowIndex = 0; rowIndex < node.content.length; rowIndex++) {
            var row = node.content[rowIndex];
            if (!row || row.type !== "tableRow") {
                issues.push(createValidationIssue(path + ".content[" + rowIndex + "]", "Tables can only contain tableRow nodes."));
                continue;
            }
            validateNode(row, path + ".content[" + rowIndex + "]", "block", issues);
        }
        return;
    }

    if (node.type === "tableRow") {
        if (!isArray(node.content)) {
            issues.push(createValidationIssue(path + ".content", "Table rows require a content array."));
            return;
        }

        for (var cellIndex = 0; cellIndex < node.content.length; cellIndex++) {
            var cell = node.content[cellIndex];
            if (!cell || cell.type !== "tableCell") {
                issues.push(createValidationIssue(path + ".content[" + cellIndex + "]", "Table rows can only contain tableCell nodes."));
                continue;
            }
            validateNode(cell, path + ".content[" + cellIndex + "]", "block", issues);
        }
        return;
    }

    if (node.type === "tableCell") {
        if (node.attrs && node.attrs.align !== undefined) {
            if (typeof node.attrs.align !== "string" || !/^(left|center|right)$/.test(String(node.attrs.align).toLowerCase())) {
                issues.push(createValidationIssue(path + ".attrs.align", 'Table cells require align to be "left", "center", or "right" when provided.'));
            }
        }
        validateNodeChildren(node, path, "block", issues);
        return;
    }

    if (node.type === "htmlBlock" || node.type === "htmlInline") {
        if (typeof node.html !== "string") {
            issues.push(createValidationIssue(path + ".html", "HTML nodes require an html string."));
        }
        return;
    }

    issues.push(createValidationIssue(path + ".type", 'Unsupported node type "' + node.type + '".'));
}

function validateStructuredContent(value) {
    var documentModel = createValidationDocument(value);
    var issues = [];

    if (documentModel.type !== "doc") {
        issues.push(createValidationIssue("type", 'Structured content roots must use the "doc" type.'));
    }

    if (typeof documentModel.version !== "number") {
        issues.push(createValidationIssue("version", "Structured content documents require a numeric version."));
    }

    if (typeof documentModel.format !== "string" || !documentModel.format) {
        issues.push(createValidationIssue("format", "Structured content documents require a format string."));
    }

    var pageSetup = normalizeDocumentPageSetup(documentModel.attrs && documentModel.attrs.pageSetup);
    if (documentModel.attrs && documentModel.attrs.pageSetup && !pageSetup) {
        issues.push(createValidationIssue("attrs.pageSetup", "Document pageSetup metadata must be an object when provided."));
    }
    if (pageSetup) {
        if (pageSetup.orientation !== undefined && pageSetup.orientation !== "portrait" && pageSetup.orientation !== "landscape") {
            issues.push(createValidationIssue("attrs.pageSetup.orientation", 'Document pageSetup orientation must be "portrait" or "landscape".'));
        }
        if ((pageSetup.width && !pageSetup.height) || (!pageSetup.width && pageSetup.height)) {
            issues.push(createValidationIssue("attrs.pageSetup", "Document pageSetup width and height should be provided together when using custom dimensions."));
        }
    }

    if (!isArray(documentModel.content)) {
        issues.push(createValidationIssue("content", "Structured content documents require a content array."));
    } else {
        for (var index = 0; index < documentModel.content.length; index++) {
            validateNode(documentModel.content[index], "content[" + index + "]", "block", issues);
        }
    }

    return {
        document: documentModel,
        issues: issues,
        valid: issues.length === 0
    };
}

function getNodeTextContent(node) {
    if (!node) {
        return "";
    }

    if (typeof node === "string") {
        return node;
    }

    if (node.type === "text") {
        return String(node.text || "");
    }

    if (node.type === "codeBlock") {
        return String(node.text || "");
    }

    if (node.type === "mergeField") {
        return String((node.attrs && (node.attrs.label || node.attrs.name)) || "");
    }

    if (node.type === "footnoteReference") {
        return String((node.attrs && node.attrs.number) || "");
    }

    var text = "";
    var content = isArray(node.content) ? node.content : [];
    for (var index = 0; index < content.length; index++) {
        text += getNodeTextContent(content[index]) + " ";
    }

    return normalizePlainText(text);
}

// Plain-text rendering for a content node list (the children of a document).
// Used as a fallback when a structured-document model carries no precomputed
// `.text`, e.g. when getTextStatistics/getDocumentMetrics are handed a bare
// array or object rather than an HTML string or { type: "doc" } model.
function renderTextContent(nodes) {
    var content = isArray(nodes) ? nodes : [];
    var text = "";
    for (var index = 0; index < content.length; index++) {
        text += getNodeTextContent(content[index]) + " ";
    }

    return normalizePlainText(text);
}

function tableHasHeaderCell(node) {
    if (!node || !isArray(node.content)) {
        return false;
    }

    for (var rowIndex = 0; rowIndex < node.content.length; rowIndex++) {
        var row = node.content[rowIndex];
        if (!row || !isArray(row.content)) {
            continue;
        }

        for (var cellIndex = 0; cellIndex < row.content.length; cellIndex++) {
            var cell = row.content[cellIndex];
            if (cell && cell.attrs && cell.attrs.header === true) {
                return true;
            }
        }
    }

    return false;
}

function auditAccessibilityNode(node, path, issues, state) {
    if (!isStructuredNodeObject(node) || typeof node.type !== "string" || !node.type) {
        return;
    }

    if (node.type === "image") {
        var altText = normalizePlainText(node.attrs && node.attrs.alt);
        if (!altText) {
            issues.push(createAccessibilityIssue(
                path + ".attrs.alt",
                "image-missing-alt",
                "Images should include meaningful alt text, or be marked decorative outside the structured-content model.",
                "warning"
            ));
        }
    }

    if (node.type === "heading") {
        var headingText = normalizePlainText(getNodeTextContent(node));
        var headingLevel = node.attrs && node.attrs.level;
        if (!headingText) {
            issues.push(createAccessibilityIssue(
                path + ".content",
                "heading-empty",
                "Headings should contain readable text.",
                "error"
            ));
        }
        if (typeof headingLevel === "number") {
            if (state.lastHeadingLevel && headingLevel > state.lastHeadingLevel + 1) {
                issues.push(createAccessibilityIssue(
                    path + ".attrs.level",
                    "heading-level-skip",
                    "Heading levels should not skip intermediate levels.",
                    "warning"
                ));
            }
            state.lastHeadingLevel = headingLevel;
        }
    }

    if (node.type === "table" && !tableHasHeaderCell(node)) {
        issues.push(createAccessibilityIssue(
            path,
            "table-missing-header",
            "Tables should include at least one header cell.",
            "warning"
        ));
    }

    if (!isArray(node.content)) {
        return;
    }

    for (var index = 0; index < node.content.length; index++) {
        auditAccessibilityNode(node.content[index], path + ".content[" + index + "]", issues, state);
    }
}

function auditAccessibility(value) {
    var documentModel = createStructuredDocument(value);
    var issues = [];
    var state = {
        lastHeadingLevel: 0
    };

    for (var index = 0; index < documentModel.content.length; index++) {
        auditAccessibilityNode(documentModel.content[index], "content[" + index + "]", issues, state);
    }

    return {
        document: documentModel,
        issues: issues,
        valid: !issues.some(function (issue) {
            return issue && issue.severity === "error";
        })
    };
}

function createLinkAuditIssue(path, code, message, severity, href) {
    var issue = {
        code: code,
        message: message,
        path: path,
        severity: severity || "warning"
    };

    if (href !== undefined) {
        issue.href = href;
    }

    return issue;
}

function normalizeLinkAuditOptions(options) {
    var normalized = options && typeof options === "object" ? options : {};
    var allowedProtocols = isArray(normalized.allowedProtocols)
        ? normalized.allowedProtocols
        : ["http:", "https:", "mailto:", "tel:"];
    var allowedDomains = isArray(normalized.allowedDomains) ? normalized.allowedDomains : [];

    return {
        allowedProtocols: allowedProtocols.map(function (protocol) {
            var value = String(protocol || "").toLowerCase();
            return value && value.charAt(value.length - 1) === ":" ? value : value + ":";
        }).filter(Boolean),
        allowedDomains: allowedDomains.map(function (domain) {
            return String(domain || "").toLowerCase();
        }).filter(Boolean),
        requireHttps: normalized.requireHttps === true,
        flagNewWindowWithoutRel: normalized.flagNewWindowWithoutRel !== false
    };
}

function getLinkHostname(href) {
    if (typeof URL === "undefined") {
        return "";
    }

    try {
        return new URL(href).hostname.toLowerCase();
    } catch (error) {
        return "";
    }
}

function isAllowedLinkDomain(hostname, allowedDomains) {
    if (!allowedDomains.length || !hostname) {
        return true;
    }

    for (var index = 0; index < allowedDomains.length; index++) {
        var domain = allowedDomains[index];
        if (hostname === domain || hostname.slice(-(domain.length + 1)) === "." + domain) {
            return true;
        }
    }

    return false;
}

function auditLinkMark(mark, path, issues, options) {
    var attrs = mark && mark.attrs ? mark.attrs : {};
    var href = String(attrs.href || "").replace(/^\s+|\s+$/g, "");
    var target = String(attrs.target || "").toLowerCase();
    var rel = String(attrs.rel || "").toLowerCase();

    if (!href) {
        issues.push(createLinkAuditIssue(path + ".attrs.href", "link-empty-href", "Links should include a destination URL.", "error", href));
        return;
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
        var protocol = href.replace(/^([a-z][a-z0-9+.-]*:).*$/i, "$1").toLowerCase();
        if (options.allowedProtocols.indexOf(protocol) < 0) {
            issues.push(createLinkAuditIssue(path + ".attrs.href", "link-disallowed-protocol", "Links should use an approved URL protocol.", "error", href));
            return;
        }

        if (options.requireHttps && protocol === "http:") {
            issues.push(createLinkAuditIssue(path + ".attrs.href", "link-insecure-http", "Public links should use HTTPS.", "warning", href));
        }

        var hostname = getLinkHostname(href);
        if (hostname && !isAllowedLinkDomain(hostname, options.allowedDomains)) {
            issues.push(createLinkAuditIssue(path + ".attrs.href", "link-domain-not-allowed", "Links should point to an approved domain.", "warning", href));
        }
    } else if (/^[a-z][a-z0-9+.-]*$/i.test(href)) {
        issues.push(createLinkAuditIssue(path + ".attrs.href", "link-malformed-url", "Links should use a valid absolute URL, relative URL, anchor, email, or phone destination.", "error", href));
    }

    if (options.flagNewWindowWithoutRel && target === "_blank" && rel.indexOf("noopener") < 0) {
        issues.push(createLinkAuditIssue(path + ".attrs.rel", "link-missing-noopener", 'Links that open in a new window should include rel="noopener".', "warning", href));
    }
}

function auditLinksNode(node, path, issues, options) {
    if (!isStructuredNodeObject(node)) {
        return;
    }

    var marks = isArray(node.marks) ? node.marks : [];
    for (var markIndex = 0; markIndex < marks.length; markIndex++) {
        if (marks[markIndex] && marks[markIndex].type === "link") {
            auditLinkMark(marks[markIndex], path + ".marks[" + markIndex + "]", issues, options);
        }
    }

    if (!isArray(node.content)) {
        return;
    }

    for (var index = 0; index < node.content.length; index++) {
        auditLinksNode(node.content[index], path + ".content[" + index + "]", issues, options);
    }
}

function auditLinks(value, options) {
    var documentModel = createStructuredDocument(value);
    var issues = [];
    var normalizedOptions = normalizeLinkAuditOptions(options);

    for (var index = 0; index < documentModel.content.length; index++) {
        auditLinksNode(documentModel.content[index], "content[" + index + "]", issues, normalizedOptions);
    }

    return {
        document: documentModel,
        issues: issues,
        valid: !issues.some(function (issue) {
            return issue && issue.severity === "error";
        })
    };
}

function cloneStructuredDocument(documentModel) {
    return JSON.parse(JSON.stringify(documentModel || createStructuredContent("")));
}

function resolveAccessibilityIssueNodePath(issue) {
    if (!issue || typeof issue.path !== "string") {
        return "";
    }

    if (issue.code === "image-missing-alt") {
        return issue.path.replace(/\.attrs\.alt$/, "");
    }

    if (issue.code === "heading-empty") {
        return issue.path.replace(/\.content$/, "");
    }

    if (issue.code === "heading-level-skip") {
        return issue.path.replace(/\.attrs\.level$/, "");
    }

    return issue.path;
}

function parseStructuredPath(path) {
    var parts = [];
    if (typeof path !== "string" || !path) {
        return parts;
    }

    path.replace(/([^[.\]]+)|\[(\d+)\]/g, function (_, key, index) {
        parts.push(typeof index === "string" ? parseInt(index, 10) : key);
        return _;
    });

    return parts;
}

function getValueAtStructuredPath(root, path) {
    var parts = parseStructuredPath(path);
    var current = root;
    for (var index = 0; index < parts.length; index++) {
        if (current == null) {
            return null;
        }
        current = current[parts[index]];
    }
    return current == null ? null : current;
}

function ensureStructuredTextNode(text) {
    return {
        type: "text",
        text: normalizePlainText(text)
    };
}

function findPreviousHeadingLevel(documentModel, targetPath) {
    var targetNodePath = resolveAccessibilityIssueNodePath({ path: targetPath });
    var lastHeadingLevel = 0;
    var found = false;

    function visit(node, path) {
        if (found || !isStructuredNodeObject(node)) {
            return;
        }

        if (path === targetNodePath) {
            found = true;
            return;
        }

        if (node.type === "heading" && node.attrs && typeof node.attrs.level === "number") {
            lastHeadingLevel = node.attrs.level;
        }

        if (!isArray(node.content)) {
            return;
        }

        for (var index = 0; index < node.content.length; index++) {
            visit(node.content[index], path + ".content[" + index + "]");
            if (found) {
                return;
            }
        }
    }

    if (documentModel && isArray(documentModel.content)) {
        for (var rootIndex = 0; rootIndex < documentModel.content.length; rootIndex++) {
            visit(documentModel.content[rootIndex], "content[" + rootIndex + "]");
            if (found) {
                break;
            }
        }
    }

    return lastHeadingLevel;
}

function repairAccessibilityIssue(value, issue, options) {
    var documentModel = createStructuredDocument(value);
    var workingDocument = cloneStructuredDocument(documentModel);
    var normalizedIssue = issue || {};
    var nodePath = resolveAccessibilityIssueNodePath(normalizedIssue);
    var node = getValueAtStructuredPath(workingDocument, nodePath);
    var normalizedOptions = options || {};

    if (!node || typeof normalizedIssue.code !== "string") {
        return workingDocument;
    }

    if (normalizedIssue.code === "image-missing-alt") {
        var altText = normalizePlainText(normalizedOptions.altText);
        if (!altText) {
            return workingDocument;
        }
        node.attrs = node.attrs || {};
        node.attrs.alt = altText;
        return workingDocument;
    }

    if (normalizedIssue.code === "heading-empty") {
        var headingText = normalizePlainText(normalizedOptions.headingText);
        if (!headingText) {
            return workingDocument;
        }
        node.content = [ensureStructuredTextNode(headingText)];
        return workingDocument;
    }

    if (normalizedIssue.code === "heading-level-skip") {
        var targetLevel = typeof normalizedOptions.targetLevel === "number"
            ? normalizedOptions.targetLevel
            : Math.min(6, Math.max(1, findPreviousHeadingLevel(workingDocument, nodePath) + 1 || 1));
        node.attrs = node.attrs || {};
        node.attrs.level = targetLevel;
        return workingDocument;
    }

    if (normalizedIssue.code === "table-missing-header") {
        if (!isArray(node.content) || !node.content.length || !node.content[0] || !isArray(node.content[0].content)) {
            return workingDocument;
        }
        for (var cellIndex = 0; cellIndex < node.content[0].content.length; cellIndex++) {
            var cell = node.content[0].content[cellIndex];
            if (!isStructuredNodeObject(cell)) {
                continue;
            }
            cell.attrs = cell.attrs || {};
            cell.attrs.header = true;
        }
        return workingDocument;
    }

    return workingDocument;
}

function createStructuredDocument(value) {
    if (value == null) {
        return createStructuredContent("");
    }

    if (typeof value === "string") {
        var trimmed = value.trim();
        if (trimmed && (trimmed.charAt(0) === "{" || trimmed.charAt(0) === "[")) {
            try {
                return createStructuredDocument(JSON.parse(trimmed));
            } catch (error) {
                return createStructuredContent(value);
            }
        }

        return createStructuredContent(value);
    }

    if (typeof value !== "object") {
        return createStructuredContent(String(value));
    }

    if (value.type === "doc" && isArray(value.content)) {
        var normalizedDocument = normalizeDocumentHeadingIds({
            type: "doc",
            version: typeof value.version === "number" ? value.version : 2,
            format: value.format || "richtexteditor-json",
            attrs: value.attrs && typeof value.attrs === "object" ? Object.assign({}, value.attrs, {
                pageSetup: normalizeDocumentPageSetup(value.attrs.pageSetup) || undefined
            }) : undefined,
            content: value.content
        });
        var docHtml = serializeStructuredContent(normalizedDocument);
        return {
            type: normalizedDocument.type,
            version: normalizedDocument.version,
            format: normalizedDocument.format,
            attrs: normalizedDocument.attrs,
            html: docHtml,
            text: getPlainTextFromHtml(docHtml),
            content: normalizedDocument.content
        };
    }

    return createStructuredContent(serializeStructuredContent(value));
}

function normalizeMarkdownSource(markdown) {
    return String(markdown || "").replace(/\r\n?/g, "\n");
}

function stripMarkdownIndent(line, maxIndent) {
    var index = 0;
    var limit = Math.max(0, maxIndent || 0);

    while (index < line.length && index < limit && line.charAt(index) === " ") {
        index++;
    }

    return line.substring(index);
}

function getMarkdownListMatch(line) {
    var bulletMatch = /^(\s*)([-+*])\s+(.*)$/.exec(line);
    if (bulletMatch) {
        var taskState = getMarkdownTaskState(bulletMatch[3]);
        return {
            indent: bulletMatch[1].length,
            ordered: false,
            start: 1,
            text: taskState ? taskState.text : bulletMatch[3],
            marker: bulletMatch[2],
            contentIndent: bulletMatch[1].length + bulletMatch[2].length + 1,
            taskState: taskState ? taskState.checked : null
        };
    }

    var orderedMatch = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
    if (orderedMatch) {
        return {
            indent: orderedMatch[1].length,
            ordered: true,
            start: parseInt(orderedMatch[2], 10) || 1,
            text: orderedMatch[3],
            marker: orderedMatch[2] + ".",
            contentIndent: orderedMatch[1].length + orderedMatch[2].length + 2,
            taskState: null
        };
    }

    return null;
}

function getMarkdownTaskState(text) {
    var match = /^\[( |x|X)\]\s+(.*)$/.exec(String(text || ""));
    if (!match) {
        return null;
    }

    return {
        checked: match[1].toLowerCase() === "x",
        text: match[2]
    };
}

function getMarkdownLineIndent(line) {
    var match = /^(\s*)/.exec(line);
    return match ? match[1].length : 0;
}

function isMarkdownFence(line) {
    return /^\s*```/.test(line || "");
}

function isMarkdownHeading(line) {
    return /^\s{0,3}#{1,6}\s+/.test(line || "");
}

function isMarkdownHorizontalRule(line) {
    var trimmed = String(line || "").trim();
    return /^(\*\s*){3,}$/.test(trimmed) || /^(-\s*){3,}$/.test(trimmed) || /^(_\s*){3,}$/.test(trimmed);
}

function isMarkdownBlockquote(line) {
    return /^\s{0,3}>/.test(line || "");
}

function splitMarkdownTableRow(line) {
    var text = String(line || "").replace(/^\s+|\s+$/g, "");
    var cells = [];
    var current = "";
    var escaped = false;
    var hasLeadingPipe = text.charAt(0) === "|";
    var hasTrailingPipe = text.charAt(text.length - 1) === "|";

    if (hasLeadingPipe) {
        text = text.substring(1);
    }
    if (hasTrailingPipe) {
        text = text.substring(0, text.length - 1);
    }

    for (var index = 0; index < text.length; index++) {
        var character = text.charAt(index);
        if (escaped) {
            current += character;
            escaped = false;
            continue;
        }
        if (character === "\\") {
            current += character;
            escaped = true;
            continue;
        }
        if (character === "|") {
            cells.push(current.replace(/^\s+|\s+$/g, ""));
            current = "";
            continue;
        }
        current += character;
    }

    cells.push(current.replace(/^\s+|\s+$/g, ""));
    return cells;
}

function isMarkdownTableDelimiterCell(cellText) {
    return /^:?-{3,}:?$/.test(String(cellText || "").replace(/\s+/g, ""));
}

function parseMarkdownTableAlignment(cellText) {
    var normalized = String(cellText || "").replace(/\s+/g, "");
    if (/^:-{3,}:$/.test(normalized)) {
        return "center";
    }
    if (/^:-{3,}$/.test(normalized)) {
        return "left";
    }
    if (/^-{3,}:$/.test(normalized)) {
        return "right";
    }
    return "";
}

function getMarkdownTableMatch(lines, index) {
    if (!lines || index + 1 >= lines.length) {
        return null;
    }

    var headerLine = lines[index];
    var dividerLine = lines[index + 1];
    if (isMarkdownBlankLine(headerLine) || isMarkdownBlankLine(dividerLine)) {
        return null;
    }
    if (isMarkdownBlockStarter(headerLine) || isMarkdownFence(headerLine) || isMarkdownHeading(headerLine) || isMarkdownHorizontalRule(headerLine) || isMarkdownBlockquote(headerLine)) {
        return null;
    }
    if (String(headerLine).indexOf("|") === -1 || String(dividerLine).indexOf("|") === -1) {
        return null;
    }

    var headerCells = splitMarkdownTableRow(headerLine);
    var dividerCells = splitMarkdownTableRow(dividerLine);
    if (!headerCells.length || headerCells.length !== dividerCells.length) {
        return null;
    }

    for (var cellIndex = 0; cellIndex < dividerCells.length; cellIndex++) {
        if (!isMarkdownTableDelimiterCell(dividerCells[cellIndex])) {
            return null;
        }
    }

    return {
        alignments: dividerCells.map(parseMarkdownTableAlignment),
        headerCells: headerCells,
        columnCount: headerCells.length
    };
}

function isMarkdownBlockStarter(line) {
    return isMarkdownFence(line) || isMarkdownHeading(line) || isMarkdownHorizontalRule(line) || isMarkdownBlockquote(line) || !!getMarkdownListMatch(line);
}

function isMarkdownBlankLine(line) {
    return String(line || "").trim() === "";
}

function parseMarkdownBlocksFromLines(lines) {
    return parseMarkdownBlocks({ lines: lines, index: 0 });
}

function parseMarkdownBlocks(state) {
    var nodes = [];

    while (state.index < state.lines.length) {
        var line = state.lines[state.index];

        if (isMarkdownBlankLine(line)) {
            state.index++;
            continue;
        }

        if (isMarkdownFence(line)) {
            nodes.push(parseMarkdownCodeBlock(state));
            continue;
        }

        if (isMarkdownHeading(line)) {
            nodes.push(parseMarkdownHeading(state));
            continue;
        }

        if (isMarkdownHorizontalRule(line)) {
            state.index++;
            nodes.push(createNode("horizontalRule"));
            continue;
        }

        if (isMarkdownBlockquote(line)) {
            nodes.push(parseMarkdownBlockquote(state));
            continue;
        }

        var tableMatch = getMarkdownTableMatch(state.lines, state.index);
        if (tableMatch) {
            nodes.push(parseMarkdownTable(state, tableMatch));
            continue;
        }

        var listMatch = getMarkdownListMatch(line);
        if (listMatch) {
            nodes.push(parseMarkdownList(state, listMatch));
            continue;
        }

        nodes.push(parseMarkdownParagraph(state));
    }

    return nodes;
}

function parseMarkdownCodeBlock(state) {
    var infoMatch = /^\s*```(.*)$/.exec(state.lines[state.index] || "");
    var language = infoMatch && infoMatch[1] ? infoMatch[1].replace(/\s+$/, "") : "";
    var buffer = [];

    state.index++;

    while (state.index < state.lines.length && !isMarkdownFence(state.lines[state.index])) {
        buffer.push(state.lines[state.index]);
        state.index++;
    }

    if (state.index < state.lines.length) {
        state.index++;
    }

    return createNode("codeBlock", {
        attrs: language ? { language: language } : undefined,
        text: buffer.join("\n")
    });
}

function parseMarkdownHeading(state) {
    var match = /^\s{0,3}(#{1,6})\s+(.*)$/.exec(state.lines[state.index] || "");
    var level = match ? match[1].length : 1;
    var text = match ? match[2].replace(/\s+#+\s*$/, "") : "";

    state.index++;

    return createNode("heading", {
        attrs: { level: level },
        content: parseMarkdownInline(text, [])
    });
}

function parseMarkdownBlockquote(state) {
    var lines = [];

    while (state.index < state.lines.length) {
        var line = state.lines[state.index];
        if (isMarkdownBlankLine(line)) {
            lines.push("");
            state.index++;
            continue;
        }

        if (!isMarkdownBlockquote(line)) {
            break;
        }

        lines.push(String(line).replace(/^\s{0,3}>\s?/, ""));
        state.index++;
    }

    return createNode("blockquote", {
        content: parseMarkdownBlocksFromLines(lines)
    });
}

function parseMarkdownList(state, firstMatch) {
    var items = [];
    var ordered = firstMatch.ordered;
    var listIndent = firstMatch.indent;
    var start = firstMatch.start;
    var isTaskList = !ordered && firstMatch.taskState !== null;

    while (state.index < state.lines.length) {
        var match = getMarkdownListMatch(state.lines[state.index]);
        if (!match || match.indent !== listIndent || match.ordered !== ordered || (!!isTaskList !== (match.taskState !== null))) {
            break;
        }

        items.push(parseMarkdownListItem(state, match, isTaskList));
    }

    return createNode(isTaskList ? "taskList" : (ordered ? "orderedList" : "bulletList"), {
        attrs: ordered && start !== 1 ? { start: start } : undefined,
        content: items
    });
}

function parseMarkdownListItem(state, match, isTaskList) {
    var itemLines = [match.text];

    state.index++;

    while (state.index < state.lines.length) {
        var line = state.lines[state.index];
        if (isMarkdownBlankLine(line)) {
            itemLines.push("");
            state.index++;
            continue;
        }

        var nextMatch = getMarkdownListMatch(line);
        if (nextMatch && nextMatch.indent === match.indent && nextMatch.ordered === match.ordered) {
            break;
        }

        var currentIndent = getMarkdownLineIndent(line);
        if (currentIndent > match.indent) {
            itemLines.push(stripMarkdownIndent(line, match.contentIndent));
            state.index++;
            continue;
        }

        if (match.indent === 0 && !nextMatch && !isMarkdownBlockStarter(line)) {
            itemLines.push(line);
            state.index++;
            continue;
        }

        break;
    }

    var itemContent = parseMarkdownBlocksFromLines(itemLines);
    if (!itemContent.length) {
        itemContent = [createNode("paragraph", {
            content: parseMarkdownInline(match.text, [])
        })];
    }

    return createNode(isTaskList ? "taskItem" : "listItem", {
        attrs: isTaskList ? { checked: !!match.taskState } : undefined,
        content: itemContent
    });
}

function parseMarkdownParagraph(state) {
    var lines = [];

    while (state.index < state.lines.length) {
        var line = state.lines[state.index];
        if (isMarkdownBlankLine(line)) {
            break;
        }

        if (lines.length && isMarkdownBlockStarter(line)) {
            break;
        }

        lines.push(line);
        state.index++;
    }

    return createNode("paragraph", {
        content: parseMarkdownParagraphLines(lines)
    });
}

function parseMarkdownTable(state, match) {
    var rows = [];
    rows.push(createNode("tableRow", {
        content: parseMarkdownTableCells(match.headerCells, true, match.alignments)
    }));

    state.index += 2;

    while (state.index < state.lines.length) {
        var line = state.lines[state.index];
        if (isMarkdownBlankLine(line) || String(line).indexOf("|") === -1) {
            break;
        }

        var rowCells = splitMarkdownTableRow(line);
        if (rowCells.length !== match.columnCount) {
            break;
        }

        rows.push(createNode("tableRow", {
            content: parseMarkdownTableCells(rowCells, false, match.alignments)
        }));
        state.index++;
    }

    return createNode("table", {
        content: rows
    });
}

function parseMarkdownTableCells(cellTexts, isHeaderRow, alignments) {
    var cells = [];

    for (var index = 0; index < cellTexts.length; index++) {
        var attrs = isHeaderRow ? { header: true } : undefined;
        var align = alignments && alignments[index];
        if (align) {
            attrs = attrs || {};
            attrs.align = align;
        }
        cells.push(createNode("tableCell", {
            attrs: attrs,
            content: [createNode("paragraph", {
                content: parseMarkdownInline(cellTexts[index], [])
            })]
        }));
    }

    return cells;
}

function parseMarkdownParagraphLines(lines) {
    var nodes = [];
    var insertHardBreak = false;

    for (var index = 0; index < lines.length; index++) {
        var line = String(lines[index] || "");
        var hasHardBreak = false;

        if (/\\$/.test(line)) {
            line = line.replace(/\\$/, "");
            hasHardBreak = true;
        } else if (/\s{2,}$/.test(line)) {
            line = line.replace(/\s+$/, "");
            hasHardBreak = true;
        }

        if (nodes.length) {
            nodes.push(insertHardBreak ? createNode("hardBreak") : createNode("text", { text: " " }));
        }

        nodes = nodes.concat(parseMarkdownInline(line, []));
        insertHardBreak = hasHardBreak;
    }

    return mergeAdjacentTextNodes(nodes);
}

function isMarkdownEscaped(value, index) {
    var slashCount = 0;
    for (var cursor = index - 1; cursor >= 0 && value.charAt(cursor) === "\\"; cursor--) {
        slashCount++;
    }
    return slashCount % 2 === 1;
}

function findMarkdownClosingDelimiter(value, delimiter, startIndex) {
    var cursor = startIndex;

    while (cursor < value.length) {
        var matchIndex = value.indexOf(delimiter, cursor);
        if (matchIndex < 0) {
            return -1;
        }

        if (!isMarkdownEscaped(value, matchIndex)) {
            return matchIndex;
        }

        cursor = matchIndex + delimiter.length;
    }

    return -1;
}

function createMarkdownTextNode(text, marks) {
    if (!text) {
        return null;
    }

    return createNode("text", {
        text: text,
        marks: cloneMarks(marks || [])
    });
}

function parseMarkdownInline(value, activeMarks) {
    var text = String(value || "");
    var nodes = [];
    var index = 0;

    while (index < text.length) {
        if (text.charAt(index) === "\\" && index + 1 < text.length) {
            var escapedNode = createMarkdownTextNode(text.charAt(index + 1), activeMarks);
            if (escapedNode) {
                nodes.push(escapedNode);
            }
            index += 2;
            continue;
        }

        if (text.substr(index, 2) === "![") {
            var imageToken = parseMarkdownImage(text, index);
            if (imageToken) {
                nodes.push(createNode("image", {
                    attrs: {
                        src: imageToken.src,
                        alt: imageToken.alt
                    }
                }));
                index = imageToken.nextIndex;
                continue;
            }
        }

        if (text.charAt(index) === "[") {
            var linkToken = parseMarkdownLink(text, index);
            if (linkToken) {
                var linkMarks = appendMark(activeMarks || [], {
                    type: "link",
                    attrs: { href: linkToken.href }
                });
                nodes = nodes.concat(parseMarkdownInline(linkToken.label, linkMarks));
                index = linkToken.nextIndex;
                continue;
            }
        }

        if (text.charAt(index) === "`") {
            var codeEnd = findMarkdownClosingDelimiter(text, "`", index + 1);
            if (codeEnd > index + 1) {
                nodes.push(createNode("text", {
                    text: text.substring(index + 1, codeEnd),
                    marks: appendMark(activeMarks || [], { type: "code" })
                }));
                index = codeEnd + 1;
                continue;
            }
        }

        var strongDelimiter = text.substr(index, 2);
        if (strongDelimiter === "**" || strongDelimiter === "__") {
            var strongEnd = findMarkdownClosingDelimiter(text, strongDelimiter, index + 2);
            if (strongEnd > index + 2) {
                nodes = nodes.concat(parseMarkdownInline(
                    text.substring(index + 2, strongEnd),
                    appendMark(activeMarks || [], { type: "bold" })
                ));
                index = strongEnd + 2;
                continue;
            }
        }

        var emphasisDelimiter = text.charAt(index);
        if (emphasisDelimiter === "*" || emphasisDelimiter === "_") {
            var emphasisEnd = findMarkdownClosingDelimiter(text, emphasisDelimiter, index + 1);
            if (emphasisEnd > index + 1) {
                nodes = nodes.concat(parseMarkdownInline(
                    text.substring(index + 1, emphasisEnd),
                    appendMark(activeMarks || [], { type: "italic" })
                ));
                index = emphasisEnd + 1;
                continue;
            }
        }

        // Search for the next special character AFTER the current position. The
        // current character is either an ordinary character, or a special one
        // (`[`, `*`, `_`, backtick) that just failed to form a token above — in
        // the latter case it must be emitted as literal text. Starting the scan
        // at index + 1 guarantees the cursor always advances by at least one
        // character; scanning from `index` would return `index` for a dangling
        // special char and spin forever (e.g. fromMarkdown("[object Object]")).
        var nextSpecialIndex = findNextMarkdownSpecial(text, index + 1);
        var plainText = text.substring(index, nextSpecialIndex < 0 ? text.length : nextSpecialIndex);
        var textNode = createMarkdownTextNode(plainText, activeMarks);
        if (textNode) {
            nodes.push(textNode);
        }

        index = nextSpecialIndex < 0 ? text.length : nextSpecialIndex;
    }

    return mergeAdjacentTextNodes(nodes);
}

function parseMarkdownImage(value, startIndex) {
    var closeBracket = value.indexOf("]", startIndex + 2);
    if (closeBracket < 0 || value.charAt(closeBracket + 1) !== "(") {
        return null;
    }

    var closeParen = findMarkdownClosingDelimiter(value, ")", closeBracket + 2);
    if (closeParen < 0) {
        return null;
    }

    // Reject dangerous URL protocols (javascript:, vbscript:, non-image data:)
    // so they never reach the rendered HTML or the structured src attribute.
    // An unsafe source makes the token invalid → it falls back to literal text.
    var src = normalizeInlineMarkdownLinkHref(value.substring(closeBracket + 2, closeParen));
    if (src === null) {
        return null;
    }

    return {
        alt: value.substring(startIndex + 2, closeBracket),
        src: src,
        nextIndex: closeParen + 1
    };
}

function parseMarkdownLink(value, startIndex) {
    var closeBracket = value.indexOf("]", startIndex + 1);
    if (closeBracket < 0 || value.charAt(closeBracket + 1) !== "(") {
        return null;
    }

    var closeParen = findMarkdownClosingDelimiter(value, ")", closeBracket + 2);
    if (closeParen < 0) {
        return null;
    }

    // Reject dangerous URL protocols (javascript:, vbscript:, non-image data:)
    // so they never reach the rendered HTML or the structured href attribute.
    // An unsafe href makes the token invalid → it falls back to literal text.
    var href = normalizeInlineMarkdownLinkHref(value.substring(closeBracket + 2, closeParen));
    if (href === null) {
        return null;
    }

    return {
        label: value.substring(startIndex + 1, closeBracket),
        href: href,
        nextIndex: closeParen + 1
    };
}

function findNextMarkdownSpecial(value, startIndex) {
    for (var index = startIndex; index < value.length; index++) {
        var char = value.charAt(index);
        if (char === "\\" || char === "[" || char === "*" || char === "_" || char === "`") {
            return index;
        }

        if (char === "!" && value.charAt(index + 1) === "[") {
            return index;
        }
    }

    return -1;
}

function fromMarkdown(markdown) {
    var source = normalizeMarkdownSource(markdown);
    var content = parseMarkdownBlocksFromLines(source.split("\n"));
    var html = serializeBlockNodes(content);

    return {
        type: "doc",
        version: 2,
        format: "richtexteditor-json",
        html: html,
        text: getPlainTextFromHtml(html),
        content: content
    };
}

function escapeMarkdownText(value) {
    return String(value || "").replace(/([\\`*_\\[\\]])/g, "\\$1");
}

function escapeMarkdownCodeText(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

function wrapMarkdownMark(content, mark) {
    if (!mark || !mark.type) {
        return content;
    }

    if (mark.type === "bold") {
        return "**" + content + "**";
    }

    if (mark.type === "italic") {
        return "*" + content + "*";
    }

    if (mark.type === "strike") {
        return "~~" + content + "~~";
    }

    if (mark.type === "code") {
        return "`" + escapeMarkdownCodeText(content) + "`";
    }

    if (mark.type === "link" && mark.attrs && mark.attrs.href) {
        return "[" + content + "](" + String(mark.attrs.href) + ")";
    }

    if (mark.type === "underline") {
        return "<u>" + content + "</u>";
    }

    if (mark.type === "subscript") {
        return "<sub>" + content + "</sub>";
    }

    if (mark.type === "superscript") {
        return "<sup>" + content + "</sup>";
    }

    if (mark.type === "textStyle") {
        var style = buildStyleString(mark.attrs || {});
        return style ? '<span style="' + escapeAttribute(style) + '">' + content + "</span>" : content;
    }

    return content;
}

function serializeMarkdownInlineNodes(nodes) {
    var markdown = "";

    for (var index = 0; index < nodes.length; index++) {
        var node = nodes[index];
        if (!node) {
            continue;
        }

        if (node.type === "text") {
            var hasCodeMark = false;
            var marks = node.marks || [];
            for (var markIndex = 0; markIndex < marks.length; markIndex++) {
                if (marks[markIndex].type === "code") {
                    hasCodeMark = true;
                    break;
                }
            }

            var content = hasCodeMark ? String(node.text || "") : escapeMarkdownText(node.text || "");
            for (var activeIndex = 0; activeIndex < marks.length; activeIndex++) {
                content = wrapMarkdownMark(content, marks[activeIndex]);
            }
            markdown += content;
            continue;
        }

        if (node.type === "hardBreak") {
            markdown += "  \n";
            continue;
        }

        if (node.type === "mergeField") {
            var mergeFieldAttrs = node.attrs || {};
            markdown += "{{" + String(mergeFieldAttrs.name || mergeFieldAttrs.label || "") + "}}";
            continue;
        }

        if (node.type === "footnoteReference") {
            var footnoteReferenceAttrs = node.attrs || {};
            markdown += "[^" + String(footnoteReferenceAttrs.number || 1) + "]";
            continue;
        }

        if (node.type === "image") {
            var imageAttrs = node.attrs || {};
            markdown += "![" + String(imageAttrs.alt || "") + "](" + String(imageAttrs.src || "") + ")";
            continue;
        }

        if (node.type === "htmlInline") {
            markdown += node.html || "";
            continue;
        }

        if (isArray(node.content)) {
            markdown += serializeMarkdownInlineNodes(node.content);
            continue;
        }

        markdown += serializeNode(node, true);
    }

    return markdown;
}

function normalizeMarkdownListItemText(value) {
    return String(value || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
}

function escapeMarkdownTableCellText(value) {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/\|/g, "\\|")
        .replace(/\r?\n/g, "<br>");
}

function isSimpleMarkdownTableCell(node) {
    if (!node || node.type !== "tableCell" || (node.attrs && (node.attrs.colspan || node.attrs.rowspan))) {
        return false;
    }

    var content = node.content || [];
    if (content.length !== 1 || content[0].type !== "paragraph") {
        return false;
    }

    var inlineNodes = content[0].content || [];
    for (var index = 0; index < inlineNodes.length; index++) {
        var inlineNode = inlineNodes[index];
        if (!inlineNode) {
            continue;
        }
        if (inlineNode.type === "hardBreak") {
            continue;
        }
        if (inlineNode.type !== "text" && inlineNode.type !== "image" && inlineNode.type !== "htmlInline") {
            return false;
        }
    }

    return true;
}

function serializeMarkdownTable(node) {
    var rows = node && node.content ? node.content : [];
    if (!rows.length) {
        return "";
    }

    var headerRow = rows[0];
    if (!headerRow || headerRow.type !== "tableRow" || !headerRow.content || !headerRow.content.length) {
        return "";
    }

    var columnCount = headerRow.content.length;
    var normalizedRows = [];

    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        var row = rows[rowIndex];
        if (!row || row.type !== "tableRow" || !row.content || row.content.length !== columnCount) {
            return "";
        }

        var cells = [];
        for (var cellIndex = 0; cellIndex < row.content.length; cellIndex++) {
            var cell = row.content[cellIndex];
            if (!isSimpleMarkdownTableCell(cell)) {
                return "";
            }
            cells.push(escapeMarkdownTableCellText(serializeMarkdownInlineNodes(cell.content[0].content || [])));
        }
        normalizedRows.push(cells);
    }

    var headerCells = normalizedRows[0];
    var dividerCells = [];
    for (var dividerIndex = 0; dividerIndex < columnCount; dividerIndex++) {
        var headerCellNode = headerRow.content[dividerIndex];
        var align = headerCellNode && headerCellNode.attrs && headerCellNode.attrs.align ? String(headerCellNode.attrs.align).toLowerCase() : "";
        if (!align && rows.length > 1) {
            var firstBodyCell = rows[1] && rows[1].content ? rows[1].content[dividerIndex] : null;
            align = firstBodyCell && firstBodyCell.attrs && firstBodyCell.attrs.align ? String(firstBodyCell.attrs.align).toLowerCase() : "";
        }

        if (align === "left") {
            dividerCells.push(":---");
            continue;
        }
        if (align === "center") {
            dividerCells.push(":---:");
            continue;
        }
        if (align === "right") {
            dividerCells.push("---:");
            continue;
        }

        dividerCells.push("---");
    }

    var parts = [
        "| " + headerCells.join(" | ") + " |",
        "| " + dividerCells.join(" | ") + " |"
    ];

    for (var bodyIndex = 1; bodyIndex < normalizedRows.length; bodyIndex++) {
        parts.push("| " + normalizedRows[bodyIndex].join(" | ") + " |");
    }

    return parts.join("\n");
}

function indentMarkdown(value, indent) {
    var text = String(value || "");
    if (!text) {
        return "";
    }

    return indent + text.replace(/\n/g, "\n" + indent);
}

function serializeMarkdownListItem(blocks, prefix) {
    if (!blocks.length) {
        return prefix.trim();
    }

    var firstBlock = blocks[0];
    var firstLine = "";
    var trailingBlocks = [];

    if (firstBlock.type === "paragraph") {
        firstLine = prefix + normalizeMarkdownListItemText(serializeMarkdownInlineNodes(firstBlock.content || []));
        trailingBlocks = blocks.slice(1);
    } else {
        firstLine = prefix.trim();
        trailingBlocks = blocks.slice();
    }

    if (!trailingBlocks.length) {
        return firstLine;
    }

    var nested = serializeMarkdownBlocks(trailingBlocks);
    if (!nested) {
        return firstLine;
    }

    return firstLine + "\n" + indentMarkdown(nested, new Array(prefix.length + 1).join(" "));
}

function serializeMarkdownFootnoteItem(node) {
    var attrs = node && node.attrs ? node.attrs : {};
    var number = String(attrs.number || 1);
    var blocks = node && node.content ? node.content : [];
    if (!blocks.length) {
        return "[^" + number + "]:";
    }

    var firstBlock = blocks[0];
    var rest = blocks.slice(1);
    var firstLine = "[^" + number + "]:";

    if (firstBlock.type === "paragraph") {
        firstLine += " " + normalizeMarkdownListItemText(serializeMarkdownInlineNodes(firstBlock.content || []));
    } else {
        rest = blocks.slice();
    }

    if (!rest.length) {
        return firstLine;
    }

    var nested = serializeMarkdownBlocks(rest);
    if (!nested) {
        return firstLine;
    }

    return firstLine + "\n" + indentMarkdown(nested, "    ");
}

function serializeMarkdownBlocks(nodes) {
    var parts = [];

    for (var index = 0; index < nodes.length; index++) {
        var node = nodes[index];
        if (!node) {
            continue;
        }

        if (node.type === "paragraph") {
            if (node.attrs && normalizeTextAlignment(node.attrs.align, true)) {
                parts.push(serializeNode(node, false));
                continue;
            }
            parts.push(serializeMarkdownInlineNodes(node.content || []));
            continue;
        }

        if (node.type === "heading") {
            var level = node.attrs && node.attrs.level ? parseInt(node.attrs.level, 10) : 1;
            if (!level || level < 1) {
                level = 1;
            }
            if (level > 6) {
                level = 6;
            }
            if (node.attrs && normalizeTextAlignment(node.attrs.align, true)) {
                parts.push(serializeNode(node, false));
                continue;
            }
            parts.push(new Array(level + 1).join("#") + " " + serializeMarkdownInlineNodes(node.content || []));
            continue;
        }

        if (node.type === "blockquote") {
            var quoted = serializeMarkdownBlocks(node.content || []);
            parts.push(quoted ? indentMarkdown(quoted, "> ") : ">");
            continue;
        }

        if (node.type === "codeBlock") {
            var language = node.attrs && (node.attrs.language || node.attrs.lang) ? String(node.attrs.language || node.attrs.lang) : "";
            parts.push("```" + language + "\n" + String(node.text || "") + "\n```");
            continue;
        }

        if (node.type === "bulletList" || node.type === "orderedList") {
            var listParts = [];
            var start = node.type === "orderedList" && node.attrs && node.attrs.start ? parseInt(node.attrs.start, 10) || 1 : 1;
            var listItems = node.content || [];
            for (var itemIndex = 0; itemIndex < listItems.length; itemIndex++) {
                var prefix = node.type === "orderedList" ? (start + itemIndex) + ". " : "- ";
                listParts.push(serializeMarkdownListItem(listItems[itemIndex].content || [], prefix));
            }
            parts.push(listParts.join("\n"));
            continue;
        }

        if (node.type === "taskList") {
            var taskListParts = [];
            var taskItems = node.content || [];
            for (var taskIndex = 0; taskIndex < taskItems.length; taskIndex++) {
                var taskPrefix = "- [" + (taskItems[taskIndex] && taskItems[taskIndex].attrs && taskItems[taskIndex].attrs.checked ? "x" : " ") + "] ";
                taskListParts.push(serializeMarkdownListItem(taskItems[taskIndex].content || [], taskPrefix));
            }
            parts.push(taskListParts.join("\n"));
            continue;
        }

        if (node.type === "horizontalRule") {
            parts.push("---");
            continue;
        }

        if (node.type === "pageBreak") {
            parts.push(serializeNode(node, false));
            continue;
        }

        if (node.type === "tableOfContents") {
            var tableOfContentsAttrs = node.attrs || {};
            var tocItems = isArray(tableOfContentsAttrs.items) ? tableOfContentsAttrs.items : [];
            var tocParts = [];
            var tocOrdered = tableOfContentsAttrs.ordered === true;
            if (tableOfContentsAttrs.includeTitle !== false && tableOfContentsAttrs.title) {
                tocParts.push("**" + escapeMarkdownText(String(tableOfContentsAttrs.title)) + "**");
            }
            for (var tocIndex = 0; tocIndex < tocItems.length; tocIndex++) {
                var tocItem = tocItems[tocIndex] || {};
                var tocIndent = new Array(Math.max(0, (parseInt(tocItem.level, 10) || 1) - 1) * 3 + 1).join(" ");
                var marker = tocOrdered ? "1." : "-";
                tocParts.push(tocIndent + marker + " [" + escapeMarkdownText(String(tocItem.text || "")) + "](#" + String(tocItem.id || "") + ")");
            }
            parts.push(tocParts.join("\n"));
            continue;
        }

        if (node.type === "footnotes") {
            var footnoteParts = [];
            var footnoteItems = node.content || [];
            for (var footnoteIndex = 0; footnoteIndex < footnoteItems.length; footnoteIndex++) {
                footnoteParts.push(serializeMarkdownFootnoteItem(footnoteItems[footnoteIndex]));
            }
            parts.push(footnoteParts.join("\n"));
            continue;
        }

        if (node.type === "image") {
            var attrs = node.attrs || {};
            parts.push("![" + String(attrs.alt || "") + "](" + String(attrs.src || "") + ")");
            continue;
        }

        if (node.type === "table") {
            var markdownTable = serializeMarkdownTable(node);
            parts.push(markdownTable || serializeNode(node, false));
            continue;
        }

        if (node.type === "htmlBlock") {
            parts.push(node.html || "");
            continue;
        }

        parts.push(serializeNode(node, false));
    }

    return parts.join("\n\n").replace(/\n{3,}/g, "\n\n");
}

function toMarkdown(value) {
    var documentModel = createStructuredDocument(value);
    return serializeMarkdownBlocks(documentModel.content || []).replace(/^\s+|\s+$/g, "");
}

function renderHTML(value) {
    return serializeStructuredContent(value);
}

function installStructuredContentBridge() {
    var RichTextEditor = ensureRichTextEditorConstructor();

    RichTextEditor.prototype.getJSON = function () {
        return createStructuredContent(this);
    };

    RichTextEditor.prototype.setJSON = function (value) {
        this.setHTMLCode(serializeStructuredContent(value));
        return this;
    };

    RichTextEditor.fromMarkdown = fromMarkdown;
    RichTextEditor.getDocumentPageSetup = getDocumentPageSetup;
    RichTextEditor.getDocumentMetrics = getDocumentMetrics;
    RichTextEditor.getDocumentOutline = getDocumentOutline;
    RichTextEditor.getFootnotes = getFootnotes;
    RichTextEditor.getTableOfContents = getTableOfContents;
    RichTextEditor.repairAccessibilityIssue = repairAccessibilityIssue;
    RichTextEditor.renderHTML = renderHTML;
    RichTextEditor.setDocumentPageSetup = setDocumentPageSetup;
    RichTextEditor.syncTableOfContents = syncTableOfContents;
    RichTextEditor.toMarkdown = toMarkdown;
    RichTextEditor.auditAccessibility = auditAccessibility;
    RichTextEditor.validateStructuredContent = validateStructuredContent;
    RichTextEditor.prototype.getDocumentPageSetup = function () {
        return getDocumentPageSetup(this.getJSON());
    };
    RichTextEditor.prototype.setDocumentPageSetup = function (pageSetup) {
        this.setJSON(setDocumentPageSetup(this.getJSON(), pageSetup));
        return this;
    };
    RichTextEditor.prototype.getDocumentMetrics = function () {
        return getDocumentMetrics(this.getJSON());
    };
    RichTextEditor.prototype.getFootnotes = function () {
        return getFootnotes(this.getJSON());
    };
    // Declared on RichTextEditorInstance but previously absent from the
    // bridge — the only two instance methods with no implementation anywhere.
    RichTextEditor.prototype.getTextStatistics = function () {
        var selectionText = "";
        try { selectionText = this.getSelectedText ? (this.getSelectedText() || "") : ""; } catch (e) { }
        return getTextStatistics(this.getJSON(), { selectionText: selectionText });
    };
    RichTextEditor.prototype.getSelectionStatistics = function () {
        var selectionText = "";
        try { selectionText = this.getSelectedText ? (this.getSelectedText() || "") : ""; } catch (e) { }
        return getTextStatistics(selectionText, { selectionText: selectionText });
    };

    return RichTextEditor;
}

function ensureStylesheet(href) {
    if (document.querySelector('link[data-rte-style="' + href + '"]')) {
        return;
    }

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-rte-style", href);
    document.head.appendChild(link);
}

function loadScript(src) {
    return new Promise(function (resolve, reject) {
        var existing = document.querySelector('script[data-rte-script="' + src + '"]');
        if (existing) {
            if (existing.getAttribute("data-rte-loaded") === "true") {
                resolve(existing);
                return;
            }

            existing.addEventListener("load", function () {
                resolve(existing);
            }, { once: true });
            existing.addEventListener("error", function () {
                reject(new Error("Failed to load " + src));
            }, { once: true });
            return;
        }

        var script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.setAttribute("data-rte-script", src);
        script.onload = function () {
            script.setAttribute("data-rte-loaded", "true");
            resolve(script);
        };
        script.onerror = function () {
            reject(new Error("Failed to load " + src));
        };

        document.head.appendChild(script);
    });
}

function trimTrailingSlash(value) {
    return value ? value.replace(/\/+$/, "") : "";
}

function loadRichTextEditorAssets(options) {
    ensureBrowserEnvironment();

    var basePath = trimTrailingSlash(options && options.basePath ? options.basePath : "/richtexteditor");

    if (window.RichTextEditor) {
        return Promise.resolve(installStructuredContentBridge());
    }

    if (!pendingLoadsByBasePath[basePath]) {
        ensureStylesheet(basePath + "/rte_theme_default.css");
        pendingLoadsByBasePath[basePath] = loadScript(basePath + "/rte.js")
            .then(function () {
                return loadScript(basePath + "/plugins/all_plugins.js");
            })
            .then(function () {
                return installStructuredContentBridge();
            });
    }

    return pendingLoadsByBasePath[basePath];
}

function createEditor(element, config) {
    installStructuredContentBridge();
    return new window.RichTextEditor(element, config || {});
}

function getEditorValue(editor, format) {
    return format === "json" ? editor.getJSON() : editor.getHTMLCode();
}

function setEditorValue(editor, value, format) {
    if (format === "json") {
        editor.setJSON(value);
        return;
    }

    editor.setHTMLCode(serializeStructuredContent(value));
}

window.RichTextEditorStructuredBridge = {
    createEditor: createEditor,
    createStructuredDocument: createStructuredDocument,
    createStructuredContent: createStructuredContent,
    ensureRichTextEditorConstructor: ensureRichTextEditorConstructor,
    fromMarkdown: fromMarkdown,
    getEditorValue: getEditorValue,
    installStructuredContentBridge: installStructuredContentBridge,
    loadRichTextEditorAssets: loadRichTextEditorAssets,
    normalizeStructuredContent: normalizeStructuredContent,
    parseStructuredContentHtml: parseStructuredContentHtml,
    renderHTML: renderHTML,
    serializeStructuredContent: serializeStructuredContent,
    setEditorValue: setEditorValue,
    toMarkdown: toMarkdown,
    validateStructuredContent: validateStructuredContent
};