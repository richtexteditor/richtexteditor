import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import {
  RichTextEditorInput,
  RichTextEditorInstance,
  RichTextEditorStructuredDocument,
  RichTextEditorValueFormat,
  loadRichTextEditorAssets,
  normalizeStructuredContent,
} from './rich-text-editor-bridge';

export interface RichTextEditorChangeEvent {
  editor: RichTextEditorInstance;
  value: string | RichTextEditorStructuredDocument;
}

@Component({
  selector: 'app-rich-text-editor',
  template: '<div #host class="editor-host"></div>',
  styles: [
    `
      :host {
        display: block;
        min-height: 380px;
      }

      .editor-host {
        min-height: 380px;
        border-radius: 18px;
        overflow: hidden;
      }
    `,
  ],
})
export class RichTextEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() assetBasePath = '/assets/richtexteditor';
  @Input() config: Record<string, unknown> = {};
  @Input() value: RichTextEditorInput | null = null;
  @Input() valueFormat: RichTextEditorValueFormat = 'html';

  @Output() change = new EventEmitter<RichTextEditorChangeEvent>();
  @Output() error = new EventEmitter<Error>();
  @Output() ready = new EventEmitter<RichTextEditorInstance>();

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  private changeHandler: (() => void) | null = null;
  private editor: RichTextEditorInstance | null = null;

  async ngAfterViewInit(): Promise<void> {
    try {
      await loadRichTextEditorAssets(this.assetBasePath);

      this.editor = new window.RichTextEditor!(this.hostRef.nativeElement, this.config || {});

      if (this.value !== null && this.value !== undefined) {
        this.syncEditor(this.value);
      }

      this.changeHandler = () => {
        if (!this.editor) {
          return;
        }

        const nextValue =
          this.valueFormat === 'json' ? this.editor.getJSON() : this.editor.getHTMLCode();
        this.change.emit({ editor: this.editor, value: nextValue });
      };

      this.editor.attachEvent('change', this.changeHandler);
      this.ready.emit(this.editor);
    } catch (loadError) {
      this.error.emit(loadError as Error);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor) {
      return;
    }

    if (changes['value'] || changes['valueFormat']) {
      this.syncEditor(this.value);
    }
  }

  ngOnDestroy(): void {
    if (this.editor && this.changeHandler && typeof this.editor.detachEvent === 'function') {
      this.editor.detachEvent('change', this.changeHandler);
    }

    this.hostRef.nativeElement.innerHTML = '';
    this.editor = null;
    this.changeHandler = null;
  }

  focus(): void {
    if (this.editor) {
      this.editor.focus();
    }
  }

  getEditor(): RichTextEditorInstance | null {
    return this.editor;
  }

  getHTMLCode(): string {
    return this.editor ? this.editor.getHTMLCode() : '';
  }

  getJSON(): RichTextEditorStructuredDocument | null {
    return this.editor ? this.editor.getJSON() : null;
  }

  setHTMLCode(value: string): void {
    if (this.editor) {
      this.editor.setHTMLCode(value || '');
    }
  }

  setJSON(value: RichTextEditorInput): void {
    if (this.editor) {
      this.editor.setJSON(value);
    }
  }

  private syncEditor(nextValue: RichTextEditorInput | null): void {
    if (!this.editor || nextValue === null || nextValue === undefined) {
      return;
    }

    const nextHtml = normalizeStructuredContent(nextValue);
    if (this.editor.getHTMLCode() !== nextHtml) {
      if (this.valueFormat === 'json') {
        this.editor.setJSON(nextValue);
      } else {
        this.editor.setHTMLCode(nextHtml);
      }
    }
  }
}
