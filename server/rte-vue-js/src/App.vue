<script setup>
import { computed, ref } from "vue";

import RichTextEditor from "./components/RichTextEditor.vue";
import { fromMarkdown, renderHTML, toMarkdown } from "./richTextEditorBridge";

const welcomeDocument = {
  type: "doc",
  version: 2,
  format: "richtexteditor-json",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Vue wrapper demo" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This starter uses " },
        { type: "text", text: "v-model", marks: [{ type: "code" }] },
        { type: "text", text: " with the richer structured content bridge." },
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Declarative mount" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Asset autoloading" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "JSON-first app state" }] }],
        },
      ],
    },
  ],
};

const alternateDocument = {
  type: "doc",
  version: 2,
  format: "richtexteditor-json",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "JSON payload restored" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "The editor can hydrate directly from " },
        { type: "text", text: "setJSON()", marks: [{ type: "code" }] },
        { type: "text", text: " and then regenerate HTML for rendering and export." },
      ],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "HTML preview", marks: [{ type: "bold" }] },
        { type: "text", text: " remains available, but the app now owns a semantic document tree." },
      ],
    },
  ],
};

const markdownDocument = `## Markdown import

This Vue starter can restore **Markdown** into the structured JSON model and render static HTML previews.

1. Markdown in
2. JSON in state
3. HTML for rendering

> The renderer works without calling the live editor instance.`;

const editorRef = ref();
const documentModel = ref(welcomeDocument);
const status = ref("Loading editor assets...");

const htmlPreview = computed(() => documentModel.value?.html || "");
const markdownPreview = computed(() => toMarkdown(documentModel.value));
const jsonPreview = computed(() => JSON.stringify(documentModel.value, null, 2));
const renderedPreview = computed(() => renderHTML(documentModel.value));

function handleReady(editor) {
  documentModel.value = editor.getJSON();
  status.value = "Editor ready";
}

function handleError(error) {
  status.value = error.message;
}

function loadWelcome() {
  documentModel.value = welcomeDocument;
}

function loadAlternateDocument() {
  documentModel.value = alternateDocument;
}

function loadMarkdownDocument() {
  documentModel.value = fromMarkdown(markdownDocument);
}

function focusEditor() {
  if (editorRef.value) {
    editorRef.value.focus();
  }
}
</script>

<template>
  <main class="app-shell">
    <section class="hero">
      <div>
        <p class="eyebrow">v2.1 foundation</p>
        <h1>RichTextEditor for Vue</h1>
        <p class="lede">
          This starter keeps the application state in the JSON bridge format while the editor
          continues to render interoperable HTML.
        </p>
      </div>
      <div class="status-chip">{{ status }}</div>
    </section>

    <section class="workspace">
      <article class="editor-card">
        <div class="toolbar-row">
          <button @click="loadWelcome">Load welcome doc</button>
          <button @click="loadAlternateDocument">Load JSON sample</button>
          <button @click="loadMarkdownDocument">Load Markdown sample</button>
          <button @click="focusEditor">Focus editor</button>
        </div>

        <RichTextEditor
          ref="editorRef"
          v-model="documentModel"
          value-format="json"
          asset-base-path="/richtexteditor"
          class="editor-frame"
          @ready="handleReady"
          @error="handleError"
        />
      </article>

      <div class="preview-grid">
        <article class="preview-card">
          <h2>HTML output</h2>
          <textarea :value="htmlPreview" readonly />
        </article>

        <article class="preview-card">
          <h2>Markdown output</h2>
          <textarea :value="markdownPreview" readonly />
        </article>

        <article class="preview-card">
          <h2>JSON output</h2>
          <textarea :value="jsonPreview" readonly />
        </article>

        <article class="preview-card">
          <h2>Static HTML render</h2>
          <div class="rendered-preview" v-html="renderedPreview"></div>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 40px 24px 56px;
}

.hero,
.workspace {
  max-width: 1180px;
  margin: 0 auto;
}

.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.hero h1 {
  margin: 0;
  font-size: clamp(2.1rem, 4vw, 3.4rem);
  line-height: 1;
}

.lede {
  max-width: 680px;
  margin: 14px 0 0;
  color: var(--text-soft);
  font-size: 1.05rem;
}

.status-chip {
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(25, 87, 165, 0.08);
  border: 1px solid rgba(25, 87, 165, 0.14);
  color: var(--accent-dark);
  font-weight: 600;
}

.workspace {
  display: grid;
  gap: 20px;
}

.editor-card,
.preview-card {
  border-radius: 24px;
  border: 1px solid var(--panel-border);
  background: var(--panel-background);
  box-shadow: 0 18px 40px rgba(18, 62, 110, 0.08);
  backdrop-filter: blur(8px);
}

.editor-card {
  padding: 18px;
}

.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.toolbar-row button {
  padding: 10px 14px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font: inherit;
  cursor: pointer;
  transition: transform 150ms ease, background 150ms ease;
}

.toolbar-row button:hover {
  background: var(--accent-dark);
  transform: translateY(-1px);
}

.editor-frame {
  min-height: 380px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.preview-card {
  padding: 18px;
}

.preview-card h2 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.preview-card textarea {
  width: 100%;
  min-height: 260px;
  resize: vertical;
  border: 1px solid rgba(18, 62, 110, 0.14);
  border-radius: 16px;
  padding: 14px;
  background: rgba(246, 248, 251, 0.9);
  color: var(--text-main);
  font: 13px/1.5 "Cascadia Code", "Consolas", monospace;
}

.rendered-preview {
  min-height: 260px;
  border: 1px solid rgba(18, 62, 110, 0.14);
  border-radius: 16px;
  padding: 18px;
  background: rgba(246, 248, 251, 0.9);
  color: var(--text-main);
}

.rendered-preview :deep(:first-child) {
  margin-top: 0;
}

.rendered-preview :deep(:last-child) {
  margin-bottom: 0;
}

@media (max-width: 900px) {
  .hero {
    align-items: start;
    flex-direction: column;
  }

  .preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
