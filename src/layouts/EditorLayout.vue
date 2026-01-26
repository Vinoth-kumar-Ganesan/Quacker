<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue"
import { createApp } from "vue"

import Splitter from "primevue/splitter"
import SplitterPanel from "primevue/splitterpanel"

import { DockPanel, Widget } from "@lumino/widgets"
import "@lumino/default-theme/style/index.css"

import SqlEditor from "../components/SqlEditor.vue"
import CSVViewer from "../Components/CSVViewer.vue"

const dockHost = ref<HTMLDivElement | null>(null)

let dock: DockPanel | null = null
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!dockHost.value) return

  dock = new DockPanel()
  dock.id = "editor-dock"
  dock.node.style.width = "100%"
  dock.node.style.height = "100%"

  // ---- Widgets ----
  const sql1 = createVueWidget(SqlEditor, "SQL Editor")
  const sql2 = createVueWidget(SqlEditor, "SQL Editor 1")
  const csv = createVueWidget(CSVViewer,"CSV Viewer")
  //const csv = createPlainWidget("CSV Viewer")

  dock.addWidget(sql1)
  dock.addWidget(sql2)
  dock.addWidget(csv, { mode: "split-bottom", ref: sql1 })

  Widget.attach(dock, dockHost.value)

  // 🔑 Refresh editor when tab changes
    dock.tabBars().forEach(tabBar => {
        tabBar.currentChanged.connect((_, args) => {
            const w = args.currentTitle?.owner as any
            w?.__vue?.refresh?.()
        })
    })


  // 🔑 Resize handling (PrimeVue Splitter)
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

/* ============================= */
/* Helpers                       */
/* ============================= */

function createVueWidget(component: any, title: string): Widget {
  const widget = new Widget()
  widget.title.label = title
  widget.title.closable = true

  const container = document.createElement("div")
  container.style.height = "100%"
  container.style.width = "100%"
  widget.node.appendChild(container)

  const app = createApp(component)
  const vueInstance = app.mount(container) as any

  // attach Vue instance to widget
  ;(widget as any).__vue = vueInstance

  widget.disposed.connect(() => {
    app.unmount()
  })

  return widget
}

function createPlainWidget(title: string): Widget {
  const w = new Widget()
  w.title.label = title
  w.title.closable = true
  w.node.innerHTML = `<div style="padding:8px">CSV Viewer</div>`
  return w
}
</script>

<template>
    <div class="card" style="height: 100vh">
        <div class="editor-container">
            <div ref="dockHost" class="dock-host"></div>
        </div>
    </div>
</template>

<style scoped>
.editor-container {
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.dock-host {
  position: absolute;
  inset: 0;
}

.result-container {
  height: 100%;
  background-color: #0f172a;
  color: white;
  padding: 8px;
}
</style>
