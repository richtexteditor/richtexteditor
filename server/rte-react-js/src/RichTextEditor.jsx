import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import {
  loadRichTextEditorAssets,
  normalizeStructuredContent,
} from "./richTextEditorBridge";

const RichTextEditor = forwardRef(function RichTextEditor(
  {
    assetBasePath = "/richtexteditor",
    config,
    defaultValue,
    onChange,
    onError,
    onReady,
    value,
    valueFormat = "html",
    ...divProps
  },
  forwardedRef
) {
  const hostRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const valueFormatRef = useRef(valueFormat);
  const configRef = useRef(config || {});
  const initialValueRef = useRef(value !== undefined ? value : defaultValue);

  useEffect(() => {
    onChangeRef.current = onChange;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
    valueFormatRef.current = valueFormat;
    configRef.current = config || {};
  });

  useImperativeHandle(
    forwardedRef,
    () => ({
      getEditor: () => editorRef.current,
      focus: () => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      },
      getJSON: () => (editorRef.current ? editorRef.current.getJSON() : null),
      setJSON: (nextValue) => {
        if (editorRef.current) {
          editorRef.current.setJSON(nextValue);
        }
      },
      getHTMLCode: () => (editorRef.current ? editorRef.current.getHTMLCode() : ""),
      setHTMLCode: (nextValue) => {
        if (editorRef.current) {
          editorRef.current.setHTMLCode(nextValue || "");
        }
      },
    }),
    []
  );

  useEffect(() => {
    let disposed = false;
    let changeHandler = null;
    const activeHost = hostRef.current;

    loadRichTextEditorAssets(assetBasePath)
      .then(() => {
        if (disposed || !activeHost) {
          return;
        }

        const editor = new window.RichTextEditor(activeHost, configRef.current);
        editorRef.current = editor;

        const initialValue = initialValueRef.current;
        if (initialValue !== undefined) {
          if (valueFormatRef.current === "json") {
            editor.setJSON(initialValue);
          } else {
            editor.setHTMLCode(normalizeStructuredContent(initialValue));
          }
        }

        changeHandler = () => {
          if (!onChangeRef.current) {
            return;
          }

          const nextValue =
            valueFormatRef.current === "json" ? editor.getJSON() : editor.getHTMLCode();
          onChangeRef.current(nextValue, editor);
        };

        editor.attachEvent("change", changeHandler);

        if (onReadyRef.current) {
          onReadyRef.current(editor);
        }
      })
      .catch((error) => {
        if (!disposed && onErrorRef.current) {
          onErrorRef.current(error);
        }
      });

    return () => {
      disposed = true;

      if (editorRef.current && changeHandler && typeof editorRef.current.detachEvent === "function") {
        editorRef.current.detachEvent("change", changeHandler);
      }

      if (activeHost) {
        activeHost.innerHTML = "";
      }

      editorRef.current = null;
    };
  }, [assetBasePath]);

  useEffect(() => {
    if (!editorRef.current || value === undefined) {
      return;
    }

    const nextHtml = normalizeStructuredContent(value);
    if (editorRef.current.getHTMLCode() !== nextHtml) {
      if (valueFormat === "json") {
        editorRef.current.setJSON(value);
      } else {
        editorRef.current.setHTMLCode(nextHtml);
      }
    }
  }, [value, valueFormat]);

  return <div {...divProps} ref={hostRef} />;
});

export default RichTextEditor;
