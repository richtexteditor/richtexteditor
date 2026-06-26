const pendingLoadsByBasePath = {};

const INLINE_CONTAINER_TAGS = {
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
  u: true,
};

const BLOCK_CONTAINER_TAGS = {
  article: true,
  aside: true,
  div: true,
  footer: true,
  header: true,
  main: true,
  section: true,
};

function isArray(value) {
  return Object.prototype.toString.call(value) === "[object Array]";
}

function getElementTagName(node) {
  return node && node.tagName ? String(node.tagName).toLowerCase() : "";
}

function normalizePlainText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getDocumentBody(html) {
  if (document.implementation && document.implementation.createHTMLDocument) {
    const doc = document.implementation.createHTMLDocument("");
    doc.body.innerHTML = html || "";
    return doc.body;
  }

  if (typeof DOMParser !== "undefined") {
    return new DOMParser()
      .parseFromString(`<!doctype html><html><body>${html || ""}</body></html>`, "text/html")
      .body;
  }

  return null;
}

function getPlainTextFromHtml(html) {
  const container = getDocumentBody(html);
  if (!container) {
    return normalizePlainText(String(html || "").replace(/<[^>]+>/g, " "));
  }

  return normalizePlainText(container.textContent || "");
}

function copyAttributes(attrs) {
  if (!attrs) {
    return undefined;
  }

  const next = {};
  let hasValues = false;

  for (const key of Object.keys(attrs)) {
    const value = attrs[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }

    next[key] = value;
    hasValues = true;
  }

  return hasValues ? next : undefined;
}

function cloneMark(mark) {
  return {
    type: mark.type,
    attrs: copyAttributes(mark.attrs || {}),
  };
}

function cloneMarks(marks) {
  if (!marks || !marks.length) {
    return undefined;
  }

  const next = [];
  for (let index = 0; index < marks.length; index += 1) {
    next.push(cloneMark(marks[index]));
  }
  return next;
}

function getMarkKey(mark) {
  return `${mark.type}:${JSON.stringify(mark.attrs || {})}`;
}

function appendMark(marks, mark) {
  const next = marks.slice();
  const markKey = getMarkKey(mark);

  for (let index = 0; index < next.length; index += 1) {
    if (getMarkKey(next[index]) === markKey) {
      return next;
    }
  }

  next.push(cloneMark(mark));
  return next;
}

function sameMarks(left, right) {
  const leftLength = left ? left.length : 0;
  const rightLength = right ? right.length : 0;

  if (leftLength !== rightLength) {
    return false;
  }

  for (let index = 0; index < leftLength; index += 1) {
    if (getMarkKey(left[index]) !== getMarkKey(right[index])) {
      return false;
    }
  }

  return true;
}

function createNode(type, options = {}) {
  const node = { type };

  if (options.attrs) {
    const attrs = copyAttributes(options.attrs);
    if (attrs) {
      node.attrs = attrs;
    }
  }

  if (options.content && options.content.length) {
    node.content = options.content;
  }

  if (options.html) {
    node.html = options.html;
  }

  if (options.marks && options.marks.length) {
    node.marks = options.marks;
  }

  if (options.text) {
    node.text = options.text;
  }

  return node;
}

function mergeAdjacentTextNodes(nodes) {
  const merged = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const current = nodes[index];
    if (!current) {
      continue;
    }

    if (current.type === "text" && current.text) {
      const last = merged.length ? merged[merged.length - 1] : null;
      if (last && last.type === "text" && sameMarks(last.marks, current.marks)) {
        last.text += current.text;
        continue;
      }
    }

    merged.push(current);
  }

  return merged;
}

export function createStructuredContent(editorOrHtml) {
  let html = "";
  let text = "";

  if (typeof editorOrHtml === "string") {
    html = editorOrHtml;
    text = getPlainTextFromHtml(html);
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
    html: html || "",
    text: text || "",
    content: parseStructuredContentHtml(html || ""),
  };
}

export function parseStructuredContentHtml(html) {
  const root = getDocumentBody(html);
  if (!root) {
    return [];
  }

  return parseBlockNodes(root.childNodes);
}

function parseBlockNodes(nodeList) {
  const blocks = [];
  let inlineBuffer = [];

  function flushInlineBuffer() {
    if (!inlineBuffer.length) {
      return;
    }

    blocks.push(
      createNode("paragraph", {
        content: mergeAdjacentTextNodes(inlineBuffer),
      })
    );
    inlineBuffer = [];
  }

  for (let index = 0; index < nodeList.length; index += 1) {
    const node = nodeList[index];

    if (!node) {
      continue;
    }

    if (node.nodeType === 3) {
      const text = node.nodeValue || "";
      if (text.replace(/\s+/g, "") !== "") {
        inlineBuffer = inlineBuffer.concat(parseInlineNode(node, []));
      }
      continue;
    }

    if (node.nodeType !== 1) {
      continue;
    }

    const tagName = getElementTagName(node);

    if (tagName === "br" || INLINE_CONTAINER_TAGS[tagName]) {
      inlineBuffer = inlineBuffer.concat(parseInlineNode(node, []));
      continue;
    }

    flushInlineBuffer();

    const blockNode = parseBlockNode(node);
    if (!blockNode) {
      continue;
    }

    if (isArray(blockNode)) {
      for (let childIndex = 0; childIndex < blockNode.length; childIndex += 1) {
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
  const tagName = getElementTagName(node);

  if (BLOCK_CONTAINER_TAGS[tagName]) {
    const childBlocks = parseBlockNodes(node.childNodes);
    return childBlocks.length ? childBlocks : null;
  }

  if (tagName === "p") {
    return createNode("paragraph", {
      content: parseInlineChildren(node),
    });
  }

  if (/^h[1-6]$/.test(tagName)) {
    return createNode("heading", {
      attrs: { level: parseInt(tagName.charAt(1), 10) || 1 },
      content: parseInlineChildren(node),
    });
  }

  if (tagName === "blockquote") {
    return createNode("blockquote", {
      content: parseBlockNodes(node.childNodes),
    });
  }

  if (tagName === "pre") {
    return createNode("codeBlock", {
      text: node.textContent || "",
    });
  }

  if (tagName === "ul") {
    return createNode("bulletList", {
      content: parseListItems(node),
    });
  }

  if (tagName === "ol") {
    const startValue = node.getAttribute("start");
    return createNode("orderedList", {
      attrs: startValue ? { start: parseInt(startValue, 10) || 1 } : undefined,
      content: parseListItems(node),
    });
  }

  if (tagName === "li") {
    return createNode("listItem", {
      content: parseBlockNodes(node.childNodes),
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
      content: parseTableRows(node),
    });
  }

  return createNode("htmlBlock", {
    html: node.outerHTML || "",
    text: normalizePlainText(node.textContent || ""),
  });
}

function parseListItems(listElement) {
  const items = [];

  for (let index = 0; index < listElement.childNodes.length; index += 1) {
    const child = listElement.childNodes[index];
    if (child && child.nodeType === 1 && getElementTagName(child) === "li") {
      items.push(parseBlockNode(child));
    }
  }

  return items;
}

function parseTableRows(tableElement) {
  const rows = [];

  function collectRows(node) {
    for (let index = 0; index < node.childNodes.length; index += 1) {
      const child = node.childNodes[index];
      if (!child || child.nodeType !== 1) {
        continue;
      }

      const tagName = getElementTagName(child);
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
  const cells = [];

  for (let index = 0; index < rowElement.childNodes.length; index += 1) {
    const child = rowElement.childNodes[index];
    if (!child || child.nodeType !== 1) {
      continue;
    }

    const tagName = getElementTagName(child);
    if (tagName === "td" || tagName === "th") {
      cells.push(parseTableCell(child));
    }
  }

  return createNode("tableRow", {
    content: cells,
  });
}

function parseTableCell(cellElement) {
  const attrs = {};
  const colspan = cellElement.getAttribute("colspan");
  const rowspan = cellElement.getAttribute("rowspan");

  if (getElementTagName(cellElement) === "th") {
    attrs.header = true;
  }

  if (colspan) {
    attrs.colspan = parseInt(colspan, 10) || 1;
  }

  if (rowspan) {
    attrs.rowspan = parseInt(rowspan, 10) || 1;
  }

  return createNode("tableCell", {
    attrs,
    content: parseBlockNodes(cellElement.childNodes),
  });
}

function parseImageNode(element) {
  return createNode("image", {
    attrs: {
      src: element.getAttribute("src") || "",
      alt: element.getAttribute("alt") || "",
      title: element.getAttribute("title") || "",
      width: element.getAttribute("width") || "",
      height: element.getAttribute("height") || "",
    },
  });
}

function parseInlineChildren(element, marks) {
  return mergeAdjacentTextNodes(parseInlineNodes(element.childNodes, marks || []));
}

function parseInlineNodes(nodeList, activeMarks) {
  let nodes = [];

  for (let index = 0; index < nodeList.length; index += 1) {
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

    return [
      createNode("text", {
        text: node.nodeValue,
        marks: activeMarks.length ? activeMarks.slice() : undefined,
      }),
    ];
  }

  if (node.nodeType !== 1) {
    return [];
  }

  const tagName = getElementTagName(node);
  if (tagName === "br") {
    return [createNode("hardBreak")];
  }

  if (tagName === "img") {
    return [parseImageNode(node)];
  }

  let marks = activeMarks.slice();
  const extractedMarks = extractElementMarks(node);
  for (let index = 0; index < extractedMarks.length; index += 1) {
    marks = appendMark(marks, extractedMarks[index]);
  }

  return parseInlineNodes(node.childNodes, marks);
}

function extractElementMarks(element) {
  const marks = [];
  const tagName = getElementTagName(element);
  const style = element.style || {};
  const textDecoration = style.textDecorationLine || style.textDecoration || "";
  const styleAttrs = {};

  function pushMark(type, attrs) {
    marks.push({
      type,
      attrs: copyAttributes(attrs || {}),
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
      title: element.getAttribute("title") || "",
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
  if (!attrs) {
    return "";
  }

  let result = "";

  for (const key of Object.keys(attrs)) {
    const value = attrs[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }

    result += ` ${key}="${escapeAttribute(value)}"`;
  }

  return result;
}

function buildStyleString(attrs) {
  if (!attrs) {
    return "";
  }

  const styles = [];
  if (attrs.color) {
    styles.push(`color: ${attrs.color}`);
  }
  if (attrs.backgroundColor) {
    styles.push(`background-color: ${attrs.backgroundColor}`);
  }
  if (attrs.fontSize) {
    styles.push(`font-size: ${attrs.fontSize}`);
  }
  if (attrs.fontFamily) {
    styles.push(`font-family: ${attrs.fontFamily}`);
  }

  return styles.join("; ");
}

function serializeInlineNodes(nodes) {
  let html = "";

  for (let index = 0; index < (nodes || []).length; index += 1) {
    html += serializeNode(nodes[index], true);
  }

  return html;
}

function serializeBlockNodes(nodes) {
  let html = "";

  for (let index = 0; index < (nodes || []).length; index += 1) {
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
  const attrs = mark.attrs || {};

  if (mark.type === "bold") {
    return `<strong>${html}</strong>`;
  }

  if (mark.type === "italic") {
    return `<em>${html}</em>`;
  }

  if (mark.type === "underline") {
    return `<u>${html}</u>`;
  }

  if (mark.type === "strike") {
    return `<s>${html}</s>`;
  }

  if (mark.type === "code") {
    return `<code>${html}</code>`;
  }

  if (mark.type === "subscript") {
    return `<sub>${html}</sub>`;
  }

  if (mark.type === "superscript") {
    return `<sup>${html}</sup>`;
  }

  if (mark.type === "link") {
    return `<a${buildAttributeString({
      href: attrs.href,
      rel: attrs.rel,
      target: attrs.target,
      title: attrs.title,
    })}>${html}</a>`;
  }

  if (mark.type === "textStyle") {
    const style = buildStyleString(attrs);
    return style ? `<span style="${escapeAttribute(style)}">${html}</span>` : html;
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
    let textHtml = escapeHtml(node.text || "");
    const marks = node.marks || [];

    for (let index = marks.length - 1; index >= 0; index -= 1) {
      textHtml = applyMark(marks[index], textHtml);
    }

    return textHtml;
  }

  if (node.type === "hardBreak") {
    return "<br />";
  }

  if (node.type === "image") {
    return `<img${buildAttributeString(node.attrs || {})} />`;
  }

  if (node.type === "paragraph") {
    return inlineMode
      ? serializeInlineNodes(node.content || [])
      : `<p>${serializeInlineNodes(node.content || [])}</p>`;
  }

  if (node.type === "heading") {
    let level = 1;
    if (node.attrs && node.attrs.level) {
      level = parseInt(node.attrs.level, 10) || 1;
    }
    level = Math.min(6, Math.max(1, level));
    return `<h${level}>${serializeInlineNodes(node.content || [])}</h${level}>`;
  }

  if (node.type === "blockquote") {
    return `<blockquote>${serializeBlockNodes(node.content || [])}</blockquote>`;
  }

  if (node.type === "codeBlock") {
    return `<pre><code>${escapeHtml(node.text || "")}</code></pre>`;
  }

  if (node.type === "bulletList") {
    return `<ul>${serializeBlockNodes(node.content || [])}</ul>`;
  }

  if (node.type === "orderedList") {
    const listAttrs = {};
    if (node.attrs && node.attrs.start) {
      listAttrs.start = node.attrs.start;
    }
    return `<ol${buildAttributeString(listAttrs)}>${serializeBlockNodes(node.content || [])}</ol>`;
  }

  if (node.type === "listItem") {
    return `<li>${serializeListItemContent(node.content || [])}</li>`;
  }

  if (node.type === "horizontalRule") {
    return "<hr />";
  }

  if (node.type === "table") {
    return `<table>${serializeBlockNodes(node.content || [])}</table>`;
  }

  if (node.type === "tableRow") {
    return `<tr>${serializeBlockNodes(node.content || [])}</tr>`;
  }

  if (node.type === "tableCell") {
    const cellTag = node.attrs && node.attrs.header ? "th" : "td";
    const cellAttrs = {};

    if (node.attrs) {
      if (node.attrs.colspan) {
        cellAttrs.colspan = node.attrs.colspan;
      }
      if (node.attrs.rowspan) {
        cellAttrs.rowspan = node.attrs.rowspan;
      }
    }

    return `<${cellTag}${buildAttributeString(cellAttrs)}>${serializeTableCellContent(
      node.content || []
    )}</${cellTag}>`;
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

export function serializeStructuredContent(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed && (trimmed.startsWith("{") || trimmed.startsWith("["))) {
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
    return serializeBlockNodes(value.content);
  }

  if (value.type && value.type !== "doc") {
    return serializeNode(value, false);
  }

  if (isArray(value.content)) {
    return serializeBlockNodes(value.content);
  }

  if (value.content && typeof value.content.html === "string") {
    return value.content.html;
  }

  if (typeof value.html === "string") {
    return value.html;
  }

  return "";
}

export function normalizeStructuredContent(value) {
  return serializeStructuredContent(value);
}

export function createStructuredDocument(value) {
  if (value == null) {
    return createStructuredContent("");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed && (trimmed.startsWith("{") || trimmed.startsWith("["))) {
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
    const docHtml = serializeStructuredContent(value);
    return {
      type: "doc",
      version: typeof value.version === "number" ? value.version : 2,
      format: value.format || "richtexteditor-json",
      html: docHtml,
      text: getPlainTextFromHtml(docHtml),
      content: value.content,
    };
  }

  return createStructuredContent(serializeStructuredContent(value));
}

function normalizeMarkdownSource(markdown) {
  return String(markdown || "").replace(/\r\n?/g, "\n");
}

function stripMarkdownIndent(line, maxIndent) {
  let index = 0;
  const limit = Math.max(0, maxIndent || 0);

  while (index < line.length && index < limit && line.charAt(index) === " ") {
    index += 1;
  }

  return line.substring(index);
}

function getMarkdownListMatch(line) {
  const bulletMatch = /^(\s*)([-+*])\s+(.*)$/.exec(line);
  if (bulletMatch) {
    return {
      indent: bulletMatch[1].length,
      ordered: false,
      start: 1,
      text: bulletMatch[3],
      marker: bulletMatch[2],
      contentIndent: bulletMatch[1].length + bulletMatch[2].length + 1,
    };
  }

  const orderedMatch = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
  if (orderedMatch) {
    return {
      indent: orderedMatch[1].length,
      ordered: true,
      start: parseInt(orderedMatch[2], 10) || 1,
      text: orderedMatch[3],
      marker: `${orderedMatch[2]}.`,
      contentIndent: orderedMatch[1].length + orderedMatch[2].length + 2,
    };
  }

  return null;
}

function getMarkdownLineIndent(line) {
  const match = /^(\s*)/.exec(line);
  return match ? match[1].length : 0;
}

function isMarkdownFence(line) {
  return /^\s*```/.test(line || "");
}

function isMarkdownHeading(line) {
  return /^\s{0,3}#{1,6}\s+/.test(line || "");
}

function isMarkdownHorizontalRule(line) {
  const trimmed = String(line || "").trim();
  return /^(\*\s*){3,}$/.test(trimmed) || /^(-\s*){3,}$/.test(trimmed) || /^(_\s*){3,}$/.test(trimmed);
}

function isMarkdownBlockquote(line) {
  return /^\s{0,3}>/.test(line || "");
}

function isMarkdownBlockStarter(line) {
  return isMarkdownFence(line)
    || isMarkdownHeading(line)
    || isMarkdownHorizontalRule(line)
    || isMarkdownBlockquote(line)
    || !!getMarkdownListMatch(line);
}

function isMarkdownBlankLine(line) {
  return String(line || "").trim() === "";
}

function parseMarkdownBlocksFromLines(lines) {
  return parseMarkdownBlocks({ lines, index: 0 });
}

function parseMarkdownBlocks(state) {
  const nodes = [];

  while (state.index < state.lines.length) {
    const line = state.lines[state.index];

    if (isMarkdownBlankLine(line)) {
      state.index += 1;
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
      state.index += 1;
      nodes.push(createNode("horizontalRule"));
      continue;
    }

    if (isMarkdownBlockquote(line)) {
      nodes.push(parseMarkdownBlockquote(state));
      continue;
    }

    const listMatch = getMarkdownListMatch(line);
    if (listMatch) {
      nodes.push(parseMarkdownList(state, listMatch));
      continue;
    }

    nodes.push(parseMarkdownParagraph(state));
  }

  return nodes;
}

function parseMarkdownCodeBlock(state) {
  const infoMatch = /^\s*```(.*)$/.exec(state.lines[state.index] || "");
  const language = infoMatch && infoMatch[1] ? infoMatch[1].replace(/\s+$/, "") : "";
  const buffer = [];

  state.index += 1;

  while (state.index < state.lines.length && !isMarkdownFence(state.lines[state.index])) {
    buffer.push(state.lines[state.index]);
    state.index += 1;
  }

  if (state.index < state.lines.length) {
    state.index += 1;
  }

  return createNode("codeBlock", {
    attrs: language ? { language } : undefined,
    text: buffer.join("\n"),
  });
}

function parseMarkdownHeading(state) {
  const match = /^\s{0,3}(#{1,6})\s+(.*)$/.exec(state.lines[state.index] || "");
  const level = match ? match[1].length : 1;
  const text = match ? match[2].replace(/\s+#+\s*$/, "") : "";

  state.index += 1;

  return createNode("heading", {
    attrs: { level },
    content: parseMarkdownInline(text, []),
  });
}

function parseMarkdownBlockquote(state) {
  const lines = [];

  while (state.index < state.lines.length) {
    const line = state.lines[state.index];
    if (isMarkdownBlankLine(line)) {
      lines.push("");
      state.index += 1;
      continue;
    }

    if (!isMarkdownBlockquote(line)) {
      break;
    }

    lines.push(String(line).replace(/^\s{0,3}>\s?/, ""));
    state.index += 1;
  }

  return createNode("blockquote", {
    content: parseMarkdownBlocksFromLines(lines),
  });
}

function parseMarkdownList(state, firstMatch) {
  const items = [];
  const ordered = firstMatch.ordered;
  const listIndent = firstMatch.indent;
  const start = firstMatch.start;

  while (state.index < state.lines.length) {
    const match = getMarkdownListMatch(state.lines[state.index]);
    if (!match || match.indent !== listIndent || match.ordered !== ordered) {
      break;
    }

    items.push(parseMarkdownListItem(state, match));
  }

  return createNode(ordered ? "orderedList" : "bulletList", {
    attrs: ordered && start !== 1 ? { start } : undefined,
    content: items,
  });
}

function parseMarkdownListItem(state, match) {
  const itemLines = [match.text];

  state.index += 1;

  while (state.index < state.lines.length) {
    const line = state.lines[state.index];
    if (isMarkdownBlankLine(line)) {
      itemLines.push("");
      state.index += 1;
      continue;
    }

    const nextMatch = getMarkdownListMatch(line);
    if (nextMatch && nextMatch.indent === match.indent && nextMatch.ordered === match.ordered) {
      break;
    }

    const currentIndent = getMarkdownLineIndent(line);
    if (currentIndent > match.indent) {
      itemLines.push(stripMarkdownIndent(line, match.contentIndent));
      state.index += 1;
      continue;
    }

    if (match.indent === 0 && !nextMatch && !isMarkdownBlockStarter(line)) {
      itemLines.push(line);
      state.index += 1;
      continue;
    }

    break;
  }

  let itemContent = parseMarkdownBlocksFromLines(itemLines);
  if (!itemContent.length) {
    itemContent = [createNode("paragraph", {
      content: parseMarkdownInline(match.text, []),
    })];
  }

  return createNode("listItem", {
    content: itemContent,
  });
}

function parseMarkdownParagraph(state) {
  const lines = [];

  while (state.index < state.lines.length) {
    const line = state.lines[state.index];
    if (isMarkdownBlankLine(line)) {
      break;
    }

    if (lines.length && isMarkdownBlockStarter(line)) {
      break;
    }

    lines.push(line);
    state.index += 1;
  }

  return createNode("paragraph", {
    content: parseMarkdownParagraphLines(lines),
  });
}

function parseMarkdownParagraphLines(lines) {
  let nodes = [];
  let insertHardBreak = false;

  for (let index = 0; index < lines.length; index += 1) {
    let line = String(lines[index] || "");
    let hasHardBreak = false;

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
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && value.charAt(cursor) === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function findMarkdownClosingDelimiter(value, delimiter, startIndex) {
  let cursor = startIndex;

  while (cursor < value.length) {
    const matchIndex = value.indexOf(delimiter, cursor);
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
    text,
    marks: cloneMarks(marks || []),
  });
}

function parseMarkdownInline(value, activeMarks) {
  const text = String(value || "");
  let nodes = [];
  let index = 0;

  while (index < text.length) {
    if (text.charAt(index) === "\\" && index + 1 < text.length) {
      const escapedNode = createMarkdownTextNode(text.charAt(index + 1), activeMarks);
      if (escapedNode) {
        nodes.push(escapedNode);
      }
      index += 2;
      continue;
    }

    if (text.substr(index, 2) === "![") {
      const imageToken = parseMarkdownImage(text, index);
      if (imageToken) {
        nodes.push(createNode("image", {
          attrs: {
            src: imageToken.src,
            alt: imageToken.alt,
          },
        }));
        index = imageToken.nextIndex;
        continue;
      }
    }

    if (text.charAt(index) === "[") {
      const linkToken = parseMarkdownLink(text, index);
      if (linkToken) {
        const linkMarks = appendMark(activeMarks || [], {
          type: "link",
          attrs: { href: linkToken.href },
        });
        nodes = nodes.concat(parseMarkdownInline(linkToken.label, linkMarks));
        index = linkToken.nextIndex;
        continue;
      }
    }

    if (text.charAt(index) === "`") {
      const codeEnd = findMarkdownClosingDelimiter(text, "`", index + 1);
      if (codeEnd > index + 1) {
        nodes.push(createNode("text", {
          text: text.substring(index + 1, codeEnd),
          marks: appendMark(activeMarks || [], { type: "code" }),
        }));
        index = codeEnd + 1;
        continue;
      }
    }

    const strongDelimiter = text.substr(index, 2);
    if (strongDelimiter === "**" || strongDelimiter === "__") {
      const strongEnd = findMarkdownClosingDelimiter(text, strongDelimiter, index + 2);
      if (strongEnd > index + 2) {
        nodes = nodes.concat(parseMarkdownInline(
          text.substring(index + 2, strongEnd),
          appendMark(activeMarks || [], { type: "bold" }),
        ));
        index = strongEnd + 2;
        continue;
      }
    }

    const emphasisDelimiter = text.charAt(index);
    if (emphasisDelimiter === "*" || emphasisDelimiter === "_") {
      const emphasisEnd = findMarkdownClosingDelimiter(text, emphasisDelimiter, index + 1);
      if (emphasisEnd > index + 1) {
        nodes = nodes.concat(parseMarkdownInline(
          text.substring(index + 1, emphasisEnd),
          appendMark(activeMarks || [], { type: "italic" }),
        ));
        index = emphasisEnd + 1;
        continue;
      }
    }

    const nextSpecialIndex = findNextMarkdownSpecial(text, index);
    const plainText = text.substring(index, nextSpecialIndex < 0 ? text.length : nextSpecialIndex);
    const textNode = createMarkdownTextNode(plainText, activeMarks);
    if (textNode) {
      nodes.push(textNode);
    }

    index = nextSpecialIndex < 0 ? text.length : nextSpecialIndex;
  }

  return mergeAdjacentTextNodes(nodes);
}

function parseMarkdownImage(value, startIndex) {
  const closeBracket = value.indexOf("]", startIndex + 2);
  if (closeBracket < 0 || value.charAt(closeBracket + 1) !== "(") {
    return null;
  }

  const closeParen = findMarkdownClosingDelimiter(value, ")", closeBracket + 2);
  if (closeParen < 0) {
    return null;
  }

  return {
    alt: value.substring(startIndex + 2, closeBracket),
    src: value.substring(closeBracket + 2, closeParen),
    nextIndex: closeParen + 1,
  };
}

function parseMarkdownLink(value, startIndex) {
  const closeBracket = value.indexOf("]", startIndex + 1);
  if (closeBracket < 0 || value.charAt(closeBracket + 1) !== "(") {
    return null;
  }

  const closeParen = findMarkdownClosingDelimiter(value, ")", closeBracket + 2);
  if (closeParen < 0) {
    return null;
  }

  return {
    label: value.substring(startIndex + 1, closeBracket),
    href: value.substring(closeBracket + 2, closeParen),
    nextIndex: closeParen + 1,
  };
}

function findNextMarkdownSpecial(value, startIndex) {
  for (let index = startIndex; index < value.length; index += 1) {
    const char = value.charAt(index);
    if (char === "\\" || char === "[" || char === "*" || char === "_" || char === "`") {
      return index;
    }

    if (char === "!" && value.charAt(index + 1) === "[") {
      return index;
    }
  }

  return -1;
}

export function fromMarkdown(markdown) {
  const source = normalizeMarkdownSource(markdown);
  const content = parseMarkdownBlocksFromLines(source.split("\n"));
  const html = serializeBlockNodes(content);

  return {
    type: "doc",
    version: 2,
    format: "richtexteditor-json",
    html,
    text: getPlainTextFromHtml(html),
    content,
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
    return `**${content}**`;
  }

  if (mark.type === "italic") {
    return `*${content}*`;
  }

  if (mark.type === "strike") {
    return `~~${content}~~`;
  }

  if (mark.type === "code") {
    return `\`${escapeMarkdownCodeText(content)}\``;
  }

  if (mark.type === "link" && mark.attrs && mark.attrs.href) {
    return `[${content}](${String(mark.attrs.href)})`;
  }

  if (mark.type === "underline") {
    return `<u>${content}</u>`;
  }

  if (mark.type === "subscript") {
    return `<sub>${content}</sub>`;
  }

  if (mark.type === "superscript") {
    return `<sup>${content}</sup>`;
  }

  if (mark.type === "textStyle") {
    const style = buildStyleString(mark.attrs || {});
    return style ? `<span style="${escapeAttribute(style)}">${content}</span>` : content;
  }

  return content;
}

function serializeMarkdownInlineNodes(nodes) {
  let markdown = "";

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node) {
      continue;
    }

    if (node.type === "text") {
      let hasCodeMark = false;
      const marks = node.marks || [];
      for (let markIndex = 0; markIndex < marks.length; markIndex += 1) {
        if (marks[markIndex].type === "code") {
          hasCodeMark = true;
          break;
        }
      }

      let content = hasCodeMark ? String(node.text || "") : escapeMarkdownText(node.text || "");
      for (let activeIndex = 0; activeIndex < marks.length; activeIndex += 1) {
        content = wrapMarkdownMark(content, marks[activeIndex]);
      }
      markdown += content;
      continue;
    }

    if (node.type === "hardBreak") {
      markdown += "  \n";
      continue;
    }

    if (node.type === "image") {
      const imageAttrs = node.attrs || {};
      markdown += `![${String(imageAttrs.alt || "")}](${String(imageAttrs.src || "")})`;
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
  return String(value || "").replace(/\s+/g, " ").trim();
}

function indentMarkdown(value, indent) {
  const text = String(value || "");
  if (!text) {
    return "";
  }

  return `${indent}${text.replace(/\n/g, `\n${indent}`)}`;
}

function serializeMarkdownListItem(blocks, prefix) {
  if (!blocks.length) {
    return prefix.trimEnd();
  }

  const firstBlock = blocks[0];
  let firstLine = "";
  let trailingBlocks = [];

  if (firstBlock.type === "paragraph") {
    firstLine = prefix + normalizeMarkdownListItemText(serializeMarkdownInlineNodes(firstBlock.content || []));
    trailingBlocks = blocks.slice(1);
  } else {
    firstLine = prefix.trimEnd();
    trailingBlocks = blocks.slice();
  }

  if (!trailingBlocks.length) {
    return firstLine;
  }

  const nested = serializeMarkdownBlocks(trailingBlocks);
  if (!nested) {
    return firstLine;
  }

  return `${firstLine}\n${indentMarkdown(nested, " ".repeat(prefix.length))}`;
}

function serializeMarkdownBlocks(nodes) {
  const parts = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node) {
      continue;
    }

    if (node.type === "paragraph") {
      parts.push(serializeMarkdownInlineNodes(node.content || []));
      continue;
    }

    if (node.type === "heading") {
      let level = node.attrs && node.attrs.level ? parseInt(node.attrs.level, 10) : 1;
      if (!level || level < 1) {
        level = 1;
      }
      if (level > 6) {
        level = 6;
      }
      parts.push(`${"#".repeat(level)} ${serializeMarkdownInlineNodes(node.content || [])}`);
      continue;
    }

    if (node.type === "blockquote") {
      const quoted = serializeMarkdownBlocks(node.content || []);
      parts.push(quoted ? indentMarkdown(quoted, "> ") : ">");
      continue;
    }

    if (node.type === "codeBlock") {
      const language = node.attrs && (node.attrs.language || node.attrs.lang)
        ? String(node.attrs.language || node.attrs.lang)
        : "";
      parts.push(`\`\`\`${language}\n${String(node.text || "")}\n\`\`\``);
      continue;
    }

    if (node.type === "bulletList" || node.type === "orderedList") {
      const listParts = [];
      const start = node.type === "orderedList" && node.attrs && node.attrs.start
        ? parseInt(node.attrs.start, 10) || 1
        : 1;
      const listItems = node.content || [];
      for (let itemIndex = 0; itemIndex < listItems.length; itemIndex += 1) {
        const prefix = node.type === "orderedList" ? `${start + itemIndex}. ` : "- ";
        listParts.push(serializeMarkdownListItem(listItems[itemIndex].content || [], prefix));
      }
      parts.push(listParts.join("\n"));
      continue;
    }

    if (node.type === "horizontalRule") {
      parts.push("---");
      continue;
    }

    if (node.type === "image") {
      const attrs = node.attrs || {};
      parts.push(`![${String(attrs.alt || "")}](${String(attrs.src || "")})`);
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

export function toMarkdown(value) {
  const documentModel = createStructuredDocument(value);
  return serializeMarkdownBlocks(documentModel.content || []).trim();
}

export function renderHTML(value) {
  return serializeStructuredContent(value);
}

export function installStructuredContentBridge() {
  if (!window.RichTextEditor) {
    throw new Error("RichTextEditor core is not loaded.");
  }

  window.RichTextEditor.prototype.getJSON = function getJSON() {
    return createStructuredContent(this);
  };

  window.RichTextEditor.prototype.setJSON = function setJSON(value) {
    this.setHTMLCode(serializeStructuredContent(value));
    return this;
  };

  window.RichTextEditor.fromMarkdown = fromMarkdown;
  window.RichTextEditor.renderHTML = renderHTML;
  window.RichTextEditor.toMarkdown = toMarkdown;
}

function ensureStylesheet(href) {
  if (document.querySelector(`link[data-rte-style="${href}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-rte-style", href);
  document.head.appendChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-rte-script="${src}"]`);
    if (existing) {
      if (existing.getAttribute("data-rte-loaded") === "true") {
        resolve(existing);
        return;
      }

      existing.addEventListener("load", () => resolve(existing), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.setAttribute("data-rte-script", src);
    script.onload = () => {
      script.setAttribute("data-rte-loaded", "true");
      resolve(script);
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export async function loadRichTextEditorAssets(basePath = "/richtexteditor") {
  const normalizedBasePath = basePath.replace(/\/+$/, "");
  if (window.RichTextEditor) {
    installStructuredContentBridge();
    return window.RichTextEditor;
  }

  if (!pendingLoadsByBasePath[normalizedBasePath]) {
    ensureStylesheet(`${normalizedBasePath}/rte_theme_default.css`);
    pendingLoadsByBasePath[normalizedBasePath] = loadScript(`${normalizedBasePath}/rte.js`)
      .then(() => loadScript(`${normalizedBasePath}/plugins/all_plugins.js`))
      .then(() => {
        installStructuredContentBridge();
        return window.RichTextEditor;
      });
  }

  return pendingLoadsByBasePath[normalizedBasePath];
}
