<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue"
import { createApp } from "vue"
import { DockPanel, Widget } from "@lumino/widgets"
import "@lumino/default-theme/style/index.css"

import Splitter from "primevue/splitter"
import SplitterPanel from "primevue/splitterpanel"

import SchemaTree from "../Components/SchemaTree.vue"
import SqlEditor from "../components/SqlEditor.vue"
import CSVViewer from "../Components/CSVViewer.vue"
import ResultViewer from "../Components/ResultViewer.vue"

import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"

/* ============================= */
/* State                         */
/* ============================= */

const dockHost = ref<HTMLDivElement | null>(null)
const schemas = ref<any[]>([])

let dock: DockPanel | null = null
let resizeObserver: ResizeObserver | null = null

/* ============================= */
/* Explorer Actions              */
/* ============================= */

async function createConnection() {
  const folderPath = await open({
    directory: true,
    multiple: false
  })

  if (!folderPath) return

  await invoke("load_csv_folder", { folderPath })
  const tableSchemas = await invoke("get_csv_schemas")

  schemas.value = [
    {
      title: folderPath,
      tables: tableSchemas
    }
  ]
}

function uploadFile() {
  console.log("Upload clicked")
}

function disconnectDb() {
  console.log("Disconnected")
}

function reconnectDb() {
  console.log("Reconnected")
}

function handleOpenFolder() {
  createConnection()
}

/* ============================= */
/* Dock Helpers                  */
/* ============================= */

function findWidgetByTitle(title: string): Widget | undefined {
  return [...dock!.layout.widgets()].find(w => w.title.label === title)
}

function attachTabRefresh() {
  dock!.tabBars().forEach(tabBar => {
    tabBar.currentChanged.connect((_, args) => {
      const w = args.currentTitle?.owner as any
      w?.__vue?.refresh?.()
    })
  })
}

/* ============================= */
/* Widget Creation               */
/* ============================= */

function createVueWidget(
  component: any,
  title: string,
  props: Record<string, any> = {}
): Widget {
  const widget = new Widget()
  widget.title.label = title
  widget.title.closable = true

  const container = document.createElement("div")
  container.style.width = "100%"
  container.style.height = "100%"
  widget.node.appendChild(container)

  const app = createApp(component, {
    ...props,
    onExecute: (sql: string) => {
      console.log("Execute SQL:", sql)
      runQuery(sql)
    }
  })

  const vueInstance = app.mount(container) as any
  ;(widget as any).__vue = vueInstance

  widget.disposed.connect(() => app.unmount())

  return widget
}

/* ============================= */
/* Dock Actions                  */
/* ============================= */

function handleOpenFile(filepath: string, tableName: string) {
  if (!dock) return

  const schema = schemas.value
    .flatMap(s => s.tables)
    .find(t => t.table === tableName)

  if (!schema) return

  const existing = findWidgetByTitle(tableName)
  if (existing) {
    dock.activateWidget(existing)
    return
  }

  const widget = createVueWidget(CSVViewer, tableName, {
    table: schema.table,
    file_path: schema.file_path,
    columns: schema.columns
  })

  const refWidget = dock.currentWidget
  if (refWidget) {
    dock.addWidget(widget, { mode: "split-top", ref: refWidget })
  } else {
    dock.addWidget(widget)
  }

  dock.activateWidget(widget)
}

function handleOpenSqlEditor(filepath: string, schema: any) {
  if (!dock) return

  const existing = findWidgetByTitle(filepath)
  if (existing) {
    dock.activateWidget(existing)
    return
  }

  const widget = createVueWidget(SqlEditor, filepath, {
    schema: schema[0].tables
  })

  dock.addWidget(widget)
  dock.activateWidget(widget)
}


/* ============================= */
/* Backend                       */
/* ============================= */

function runQuery(sql: string) {
  console.log("Run query:", sql)
    if (!dock) return

  const widget = createVueWidget(ResultViewer, sql , {
    sql: sql
  })

  dock.addWidget(widget,{
    mode: "split-bottom"
  })
  dock.activateWidget(widget)
}

/* ============================= */
/* Lifecycle                     */
/* ============================= */

onMounted(() => {
  if (!dockHost.value) return

  dock = new DockPanel()
  dock.id = "editor-dock"
  dock.node.style.width = "100%"
  dock.node.style.height = "100%"

  Widget.attach(dock, dockHost.value)
  attachTabRefresh()

  resizeObserver = new ResizeObserver(() => {
    dock?.update()
    const w = dock?.currentWidget as any
    w?.__vue?.refresh?.()
  })

  resizeObserver.observe(dockHost.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  dock?.dispose()
  dock = null
})
</script>

<template>
  <Splitter style="height: 100vh; width: 100vw">
    <SplitterPanel :size="20">
      <SchemaTree
        :schemas="schemas"
        @openFolder="handleOpenFolder"
        @openFile="handleOpenFile"
        @open-sql-editor="handleOpenSqlEditor"
      />
    </SplitterPanel>

    <SplitterPanel :size="80" :style="{ backgroundColor: '#0f172a' }">
      <div class="editor-container">
        <div ref="dockHost" class="dock-host"></div>
      </div>
    </SplitterPanel>
  </Splitter>
</template>

<style scoped>
.editor-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.dock-host {
  position: absolute;
  inset: 0;
}
</style>
