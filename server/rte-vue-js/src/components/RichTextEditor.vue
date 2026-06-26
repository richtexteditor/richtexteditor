<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import { loadRichTextEditorAssets, normalizeStructuredContent } from "../richTextEditorBridge";

const props = defineProps({
  assetBasePath: {
    type: String,
    default: "/richtexteditor",
  },
  config: {
    type: Object,
    default: () => ({}),
  },
  defaultValue: {
    type: [String, Object],
    default: undefined,
  },
  modelValue: {
    type: [String, Object],
    default: undefined,
  },
  valueFormat: {
    type: String,
    default: "html",
  },
});

const emit = defineEmits(["change", "error", "ready", "update:modelValue"]);

const hostRef = ref(null);
const editorRef = ref(null);

let changeHandler = null;

function syncEditor(nextValue) {
  if (!editorRef.value) {
    return;
  }

  const nextHtml = normalizeStructuredContent(nextValue);
  if (editorRef.value.getHTMLCode() !== nextHtml) {
    if (props.valueFormat === "json") {
      editorRef.value.setJSON(nextValue);
    } else {
      editorRef.value.setHTMLCode(nextHtml);
    }
  }
}

function getEditor() {
  return editorRef.value;
}

defineExpose({
  focus() {
    if (editorRef.value) {
      editorRef.value.focus();
    }
  },
  getEditor,
  getHTMLCode() {
    return editorRef.value ? editorRef.value.getHTMLCode() : "";
  },
  getJSON() {
    return editorRef.value ? editorRef.value.getJSON() : null;
  },
  setHTMLCode(nextValue) {
    if (editorRef.value) {
      editorRef.value.setHTMLCode(nextValue || "");
    }
  },
  setJSON(nextValue) {
    if (editorRef.value) {
      editorRef.value.setJSON(nextValue);
    }
  },
});

onMounted(async () => {
  try {
    await loadRichTextEditorAssets(props.assetBasePath);

    if (!hostRef.value) {
      return;
    }

    const editor = new window.RichTextEditor(hostRef.value, props.config || {});
    editorRef.value = editor;

    const initialValue = props.modelValue !== undefined ? props.modelValue : props.defaultValue;
    if (initialValue !== undefined) {
      if (props.valueFormat === "json") {
        editor.setJSON(initialValue);
      } else {
        editor.setHTMLCode(normalizeStructuredContent(initialValue));
      }
    }

    changeHandler = () => {
      const nextValue = props.valueFormat === "json" ? editor.getJSON() : editor.getHTMLCode();
      emit("update:modelValue", nextValue);
      emit("change", nextValue, editor);
    };

    editor.attachEvent("change", changeHandler);
    emit("ready", editor);
  } catch (error) {
    emit("error", error);
  }
});

watch(
  () => props.modelValue,
  (nextValue) => {
    if (props.modelValue === undefined) {
      return;
    }

    syncEditor(nextValue);
  },
  { deep: true }
);

watch(
  () => props.valueFormat,
  () => {
    if (props.modelValue === undefined) {
      return;
    }

    syncEditor(props.modelValue);
  }
);

onBeforeUnmount(() => {
  if (editorRef.value && changeHandler && typeof editorRef.value.detachEvent === "function") {
    editorRef.value.detachEvent("change", changeHandler);
  }

  if (hostRef.value) {
    hostRef.value.innerHTML = "";
  }

  editorRef.value = null;
});
</script>

<template>
  <div ref="hostRef" class="editor-host"></div>
</template>
