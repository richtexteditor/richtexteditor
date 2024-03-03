<script setup>

import { ref } from 'vue'

</script>

<script>

const rteref = ref();
var rte;

function showHtmlCode() {
  alert(rte.getHTMLCode());
}

export default {
  data() {
    return {
      message: 'RichTextEditor Demo:'
    }
  },
  methods: {

  },
  mounted() {
    var div = rteref.value;
    rte = new RichTextEditor(div);
    rte.setHTMLCode("Hello World!");
  },
}
</script>

<template>
  <div>

    <div style="text-align: center;font-size:1.5em;margin-top:1em;">
      {{ message }}
    </div>
    <div ref="rteref"><!--Don't change Inner HTML because VUE will delete RTE UI--></div>


    <button @click="showHtmlCode()">showHtmlCode</button>

  </div>
</template>

<style scoped></style>
