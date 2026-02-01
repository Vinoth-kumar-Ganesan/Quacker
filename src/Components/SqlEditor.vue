<template>
  <SqlEditorToolbar
    @run="onRun"
    @cancel="onCancel"
    @query-builder="onQueryBuilder"
    @explain="onExplain"
    @format-sql="onFormat"
  />
  <div ref="editorEl" class="sql-editor"></div>
</template>

<script setup lang="ts">
import * as monaco from "monaco-editor"
import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from "vue"
import SqlEditorToolbar from "./SqlEditorToolbar.vue"
import { showSqlQueryBuilder } from "../Utility/SqlQueryBuilder"
import { format } from "sql-formatter"

/* ============================= */
/* Types                         */
/* ============================= */

interface ColumnMeta {
  name: string
  data_type: string
}

interface TableMeta {
  table: string
  file_path: string
  columns: ColumnMeta[]
}

/* ============================= */
/* Props                         */
/* ============================= */

const props = defineProps<{
  schema: TableMeta[]
  modelValue?: string
  onExecute?: (sql: string) => void
}>()

/* ============================= */
/* Monaco Editor                 */
/* ============================= */

const editorEl = ref<HTMLDivElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

/* ============================= */
/* SQL Completion (GLOBAL SAFE)  */
/* ============================= */

const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE",
  "GROUP BY", "ORDER BY",
  "INSERT", "UPDATE", "DELETE",
  "JOIN", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN",
  "LIMIT", "OFFSET",
  "AND", "OR", "NOT",
  "COUNT", "SUM", "AVG", "MIN", "MAX"
]

const schemaRef = shallowRef<TableMeta[]>([])

/**
 * 🔒 GLOBAL SINGLETON GUARD
 * Prevents duplicate providers across:
 * - component reopens
 * - route changes
 * - Vite HMR
 */
const COMPLETION_KEY = "__monaco_sql_completion_registered__"

function ensureSqlCompletionRegistered() {
  const g = globalThis as any
  if (g[COMPLETION_KEY]) return
  g[COMPLETION_KEY] = true

  monaco.languages.registerCompletionItemProvider("sql", {
    triggerCharacters: [" ", ","],

    provideCompletionItems(model, position) {
      const schema = schemaRef.value

      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }

      const suggestions: monaco.languages.CompletionItem[] = []

      /* Keywords */
      for (const k of SQL_KEYWORDS) {
        suggestions.push({
          label: k,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: k,
          range
        })
      }

      /* Tables */
      for (const t of schema) {
        suggestions.push({
          label: t.table,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: t.table,
          detail: "table",
          range
        })
      }

      /* Columns */
      for (const t of schema) {
        for (const c of t.columns) {
          suggestions.push({
            label: `${t.table}.${c.name}`,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: `${t.table}.${c.name}`,
            detail: c.data_type,
            range
          })

          suggestions.push({
            label: c.name,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: c.name,
            detail: `${c.data_type} (${t.table})`,
            range
          })
        }
      }

      return { suggestions }
    }
  })

  console.log("✅ Monaco SQL completion registered once")
}

/* ============================= */
/* Toolbar Actions               */
/* ============================= */

function onRun() {
  const sql = getEffectiveSql()
  if (!sql) return
  props.onExecute?.(sql)
}

function onCancel() {
  console.log("Cancel execution")
}

function onFormat() {
  if (!editor) return
  const model = editor.getModel()
  if (!model) return

  const sql = model.getValue()
  if (!sql.trim()) return

  const formatted = format(sql, {
    language: "postgresql",
    uppercase: true,
    indent: "  "
  })

  editor.executeEdits("sql-format", [
    {
      range: model.getFullModelRange(),
      text: formatted,
      forceMoveMarkers: true
    }
  ])

  editor.pushUndoStop()
}

function onQueryBuilder() {
  const normalizedSchema =
    props.schema.reduce<Record<string, string[]>>((acc, curr) => {
      acc[curr.table] = curr.columns.map(c => c.name)
      return acc
    }, {})

  showSqlQueryBuilder({
    schema: normalizedSchema,
    title: "SQL Query Builder",

    initialBaseTable: props.schema[0]?.table,
    initialBaseAlias: props.schema[0]?.table?.[0] ?? "t",

    onQueryGenerated(sql) {
      if (!editor) return
      const model = editor.getModel()
      const pos = editor.getPosition()
      if (!model || !pos) return

      editor.executeEdits("sql-query-builder", [
        {
          range: new monaco.Range(
            pos.lineNumber,
            pos.column,
            pos.lineNumber,
            pos.column
          ),
          text: sql + "\n",
          forceMoveMarkers: true
        }
      ])

      editor.focus()
    }
  })
}

function onExplain() {
  console.log("Explain query")
}

/* ============================= */
/* SQL Extraction                */
/* ============================= */

function getEffectiveSql(): string {
  if (!editor) return ""
  const model = editor.getModel()
  const sel = editor.getSelection()
  if (!model || !sel) return ""

  return sel.isEmpty()
    ? model.getValue()
    : model.getValueInRange(sel)
}

/* ============================= */
/* Lifecycle                     */
/* ============================= */

onMounted(() => {
  schemaRef.value = props.schema
  ensureSqlCompletionRegistered()

  editor = monaco.editor.create(editorEl.value!, {
    value: props.modelValue ?? "SELECT * FROM ",
    language: "sql",
    theme: "vs-dark",
    automaticLayout: true,
    fontSize: 14,
    minimap: { enabled: false }
  })

  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
    onRun
  )
})

onBeforeUnmount(() => {
  editor?.dispose()
})

/* ============================= */
/* Reactivity                    */
/* ============================= */

watch(
  () => props.schema,
  schema => {
    schemaRef.value = schema
  },
  { deep: true }
)
</script>

<style scoped>
.sql-editor {
  width: 100%;
  height: 100%;
}
</style>
