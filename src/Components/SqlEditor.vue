<template>
  <div class="sql-editor-root">
    <div class="card flex justify-center editor-toolbar">
      <Button
        icon="pi pi-chevron-right"
        @click="RunQuery"
        class="toolbar-btn"
      />
      <Button
        icon="pi pi-caret-right"
        @click="RunQueryInNewTab"
        class="toolbar-btn"
      />
      <Button
        icon="pi pi-sliders-h"
        @click="OpenQueryBuilderUI"
        class="toolbar-btn"
      />
    </div>

    <div class="sql-editor-container">
      <textarea ref="editorEl"></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import Button from "primevue/button";
import CodeMirror from "codemirror";
import "primeicons/primeicons.css";

/* =============================
   CodeMirror 5 – Core & Theme
============================= */

import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";

/* =============================
   SQL Mode & Autocomplete
============================= */

import "codemirror/mode/sql/sql";
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/hint/sql-hint";

/* =============================
   STATE
============================= */

const editorEl = ref(null);
let editor = null;

const schema = ref({});
const sqlValue = ref("");

/* =============================
   TOOLBAR ACTIONS
============================= */

const RunQuery = () => {
  console.log("run query");
};

const RunQueryInNewTab = () => {
  console.log("run query in new tab");
};

const OpenQueryBuilderUI = () => {
  console.log("open query builder");
};

/* =============================
   EXTERNAL API
============================= */

function setSchema(value) {
  schema.value = value || {};
}

function setSqlValue(value) {
  sqlValue.value = value || "";
  editor?.setValue(sqlValue.value);
}

function getSqlValue() {
  return editor ? editor.getValue() : sqlValue.value;
}

/* =============================
   HELPERS
============================= */

function extractTables(sql) {
  const map = {};
  const regex = /\b(from|join)\s+(\w+)(?:\s+(\w+))?/gi;
  let match;

  while ((match = regex.exec(sql))) {
    const table = match[2];
    const alias = match[3];
    map[alias || table] = table;
  }
  return map;
}

function getCurrentWord(cm) {
  const cursor = cm.getCursor();
  const line = cm.getLine(cursor.line);
  const left = line.slice(0, cursor.ch);
  const match = left.match(/[\w.]+$/);
  return match ? match[0] : "";
}

/* =============================
   AUTOCOMPLETE
============================= */

function sqlHint(cm) {
  const sql = cm.getValue();
  const tables = extractTables(sql);
  const word = getCurrentWord(cm);
  const cursor = cm.getCursor();

  let list = [];

  if (word.includes(".")) {
    const [alias, colPrefix] = word.split(".");
    const table = tables[alias];

    if (table && schema.value[table]) {
      list = schema.value[table]
        .filter(c => c.startsWith(colPrefix))
        .map(c => `${alias}.${c}`);
    }
  } else if (
    /\b(from|join)\s+\w*$/i.test(
      sql.slice(0, cm.indexFromPos(cursor))
    )
  ) {
    list = Object.keys(schema.value);
  } else {
    const keywords = Object.keys(
      CodeMirror.resolveMode("text/x-sql").keywords
    );

    list = keywords
      .concat(Object.keys(schema.value))
      .filter(w =>
        w.toLowerCase().startsWith(word.toLowerCase())
      );
  }

  return {
    list,
    from: CodeMirror.Pos(cursor.line, cursor.ch - word.length),
    to: cursor
  };
}

/* =============================
   EDITOR INITIALIZATION
============================= */

onMounted(() => {
  editor = CodeMirror.fromTextArea(editorEl.value, {
    mode: "text/x-sql",
    theme: "dracula",
    lineNumbers: true,
    lineWrapping: true,
    autofocus: true,
    extraKeys: {
      "Ctrl-Space": cm => cm.showHint({ hint: sqlHint })
    }
  });

  editor.setValue(sqlValue.value);

  editor.on("inputRead", (cm, change) => {
    if (/[\w.]/.test(change.text[0])) {
      cm.showHint({
        hint: sqlHint,
        completeSingle: false
      });
    }
  });

  editor.on("change", cm => {
    sqlValue.value = cm.getValue();
  });
});

onBeforeUnmount(() => {
  editor?.toTextArea();
  editor = null;
});

/* =============================
   EXPOSE
============================= */

defineExpose({
  setSchema,
  setSqlValue,
  getSqlValue,
  refresh() {
    editor?.refresh();
  }
});
</script>

<style scoped>
.sql-editor-root {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  gap: 8px;
  padding: 6px;
  border-bottom: 1px solid #333;
}

.toolbar-btn {
  color: #facc15;
}

.sql-editor-container {
  flex: 1;
  display: flex;
}

.sql-editor-container :deep(.CodeMirror) {
  height: 100%;
  font-size: 13px;
}

.lm-TabBar-tabLabel .pi {
  font-family: "primeicons" !important;
}
</style>
