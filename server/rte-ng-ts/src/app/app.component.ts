import { Component, ViewChild } from '@angular/core';

import {
  createStructuredContent,
  fromMarkdown,
  renderHTML,
  RichTextEditorStructuredDocument,
  toMarkdown,
} from './rich-text-editor-bridge';
import {
  RichTextEditorChangeEvent,
  RichTextEditorComponent,
} from './rich-text-editor.component';

const createWelcomeDocument = (): RichTextEditorStructuredDocument => ({
  type: 'doc',
  version: 2,
  format: 'richtexteditor-json',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Angular wrapper demo' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This starter uses a reusable Angular component instead of manually instantiating ' },
        { type: 'text', text: 'window.RichTextEditor', marks: [{ type: 'code' }] },
        { type: 'text', text: ' inside the app component.' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Declarative wrapper' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Asset autoloading' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'JSON bridge for app state' }] }],
        },
      ],
    },
  ],
});

const createAlternateDocument = (): RichTextEditorStructuredDocument => ({
  type: 'doc',
  version: 2,
  format: 'richtexteditor-json',
  content: [
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Structured content restored' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'The Angular starter can restore content from ' },
        { type: 'text', text: 'setJSON()', marks: [{ type: 'code' }] },
        { type: 'text', text: ' and keep a semantic document snapshot in component state.' },
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
              text: 'That brings Angular to the same integration level as the React and Vue demos.',
            },
          ],
        },
      ],
    },
  ],
});

const markdownDocument = `## Markdown import

This Angular starter can restore **Markdown** into the shared JSON model.

- Markdown
- Structured state
- Static HTML rendering

> That keeps Angular aligned with the React and Vue demos.`;

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild('editorRef') editorComponent?: RichTextEditorComponent;

  title = 'RichTextEditor for Angular';
  documentModel: RichTextEditorStructuredDocument = createWelcomeDocument();
  status = 'Loading editor assets...';

  get htmlPreview(): string {
    return this.documentModel.html || '';
  }

  get jsonPreview(): string {
    return JSON.stringify(this.documentModel, null, 2);
  }

  get markdownPreview(): string {
    return toMarkdown(this.documentModel);
  }

  get renderedPreview(): string {
    return renderHTML(this.documentModel);
  }

  handleEditorChange(event: RichTextEditorChangeEvent): void {
    this.documentModel =
      typeof event.value === 'string' ? createStructuredContent(event.value) : event.value;
  }

  handleEditorReady(editor: { getJSON(): RichTextEditorStructuredDocument }): void {
    this.documentModel = editor.getJSON();
    this.status = 'Editor ready';
  }

  handleEditorError(error: Error): void {
    this.status = error.message;
  }

  loadWelcomeDocument(): void {
    this.documentModel = createWelcomeDocument();
  }

  loadStructuredDocument(): void {
    this.documentModel = createAlternateDocument();
  }

  loadMarkdownDocument(): void {
    this.documentModel = fromMarkdown(markdownDocument);
  }

  focusEditor(): void {
    this.editorComponent?.focus();
  }
}
