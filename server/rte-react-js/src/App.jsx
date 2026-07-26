import './App.css';

import { useRef, useState } from 'react';

import RichTextEditor from './RichTextEditor';
import {
  createStructuredContent,
  fromMarkdown,
  renderHTML,
  toMarkdown,
} from './richTextEditorBridge';

const welcomeDocument = `<h2>React wrapper demo</h2>
<p>This editor is mounted declaratively and the wrapper autoloads the RichTextEditor assets from <code>/richtexteditor</code>.</p>
<ul>
  <li>Controlled HTML value</li>
  <li>Live JSON snapshot</li>
  <li>No manual script tags in app code</li>
</ul>`;

const jsonDocument = {
  type: 'doc',
  version: 2,
  format: 'richtexteditor-json',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Structured payload' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This document was restored from a ' },
        { type: 'text', text: 'node-based', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' JSON model instead of a plain HTML wrapper.' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Heading node' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Paragraph node' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'List nodes with nested blocks' }] }],
        },
      ],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'RichTextEditor still keeps HTML interoperability, but the document model is now semantic enough for app state and future APIs.',
            },
          ],
        },
      ],
    },
  ],
};

const markdownDocument = `## Markdown import

This starter can now restore content from **Markdown** and keep the semantic JSON model in sync.

- Headings
- Lists
- [Links](https://richtexteditor.com)

> Static rendering now works without a live editor instance.`;

const initialDocument = createStructuredContent(welcomeDocument);

function App() {
  const editorRef = useRef(null);
  const [htmlValue, setHtmlValue] = useState(initialDocument.html || welcomeDocument);
  const [jsonValue, setJsonValue] = useState(initialDocument);
  const [markdownValue, setMarkdownValue] = useState(toMarkdown(initialDocument));
  const [renderedHtml, setRenderedHtml] = useState(renderHTML(initialDocument));
  const [status, setStatus] = useState('Loading editor assets...');

  function syncDocument(documentModel, nextHtml) {
    const resolvedHtml = nextHtml !== undefined ? nextHtml : renderHTML(documentModel);
    setHtmlValue(resolvedHtml);
    setJsonValue(documentModel);
    setMarkdownValue(toMarkdown(documentModel));
    setRenderedHtml(renderHTML(documentModel));
  }

  function handleChange(nextHtml, editor) {
    syncDocument(editor.getJSON(), nextHtml);
  }

  function handleReady(editor) {
    syncDocument(editor.getJSON());
    setStatus('Editor ready');
  }

  function handleError(error) {
    setStatus(error.message);
  }

  function loadWelcome() {
    const documentModel = createStructuredContent(welcomeDocument);
    syncDocument(documentModel, welcomeDocument);
  }

  function loadJsonDocument() {
    if (editorRef.current) {
      editorRef.current.setJSON(jsonDocument);
      syncDocument(editorRef.current.getJSON(), editorRef.current.getHTMLCode());
    }
  }

  function loadMarkdownDocument() {
    const documentModel = fromMarkdown(markdownDocument);
    if (editorRef.current) {
      editorRef.current.setJSON(documentModel);
      syncDocument(editorRef.current.getJSON(), editorRef.current.getHTMLCode());
      return;
    }

    syncDocument(documentModel);
  }

  function focusEditor() {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }

  function refreshJson() {
    if (editorRef.current) {
      syncDocument(editorRef.current.getJSON(), editorRef.current.getHTMLCode());
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">v2.1 foundation</p>
          <h1>RichTextEditor for React</h1>
          <p className="lede">
            This starter uses a declarative wrapper with asset autoloading and a structured
            content bridge on top of the existing editor core.
          </p>
        </div>
        <div className="status-chip">{status}</div>
      </section>

      <section className="workspace">
        <div className="editor-card">
          <div className="toolbar-row">
            <button onClick={loadWelcome}>Load HTML sample</button>
            <button onClick={loadJsonDocument}>Load JSON sample</button>
            <button onClick={loadMarkdownDocument}>Load Markdown sample</button>
            <button onClick={refreshJson}>Refresh JSON</button>
            <button onClick={focusEditor}>Focus editor</button>
          </div>

          <RichTextEditor
            ref={editorRef}
            assetBasePath="/richtexteditor"
            className="editor-host"
            value={htmlValue}
            onChange={handleChange}
            onReady={handleReady}
            onError={handleError}
            style={{ minHeight: 380 }}
          />
        </div>

        <div className="preview-grid">
          <article className="preview-card">
            <h2>HTML output</h2>
            <textarea readOnly value={htmlValue} />
          </article>

          <article className="preview-card">
            <h2>Markdown output</h2>
            <textarea readOnly value={markdownValue} />
          </article>

          <article className="preview-card">
            <h2>JSON output</h2>
            <textarea readOnly value={JSON.stringify(jsonValue, null, 2)} />
          </article>

          <article className="preview-card">
            <h2>Static HTML render</h2>
            <div className="rendered-preview" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
          </article>
        </div>
      </section>
    </main>
  );
}

export default App;
