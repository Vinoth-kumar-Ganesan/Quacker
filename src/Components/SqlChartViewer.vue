<template>
  <div class="app">
    <!-- LEFT DOCK PANEL -->
    <div :class="['dock', { closed: dockClosed }]">
      <div class="dock-header">
        <span class="dock-title">Chart Options</span>
        <button class="toggle-btn" @click="toggleDock">☰</button>
      </div>

      <div class="dock-content">
        <input v-model="chartTitle" placeholder="Chart title..." />

        <select v-if="showX" v-model="xCol">
          <option
            v-for="c in columns"
            :key="c"
            :value="c"
            :disabled="scatterOnlyNumeric && !numericColumns.includes(c)"
          >
            X: {{ c }}
          </option>
        </select>

        <select v-if="showY" v-model="yCol">
          <option
            v-for="c in columns"
            :key="c"
            :value="c"
            :disabled="scatterOnlyNumeric && !numericColumns.includes(c)"
          >
            Y: {{ c }}
          </option>
        </select>

        <select v-if="showZ" v-model="zCol">
          <option v-for="c in columns" :key="c" :value="c">
            Z: {{ c }}
          </option>
        </select>

        <div class="group" v-for="(charts, group) in chartRegistry" :key="group">
          <div class="group-title">{{ group }}</div>
          <div
            v-for="chart in charts"
            :key="chart.label"
            class="chart-item"
            @click="selectChart(chart)"
          >
            {{ chart.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT PANEL -->
    <div class="main">
      <div ref="chartEl" class="chart"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import * as echarts from "echarts"
import { invoke } from "@tauri-apps/api/core"

/* =====================================================
   PROPS
===================================================== */
const props = defineProps<{ sql: string }>()

/* =====================================================
   STATE
===================================================== */
const chartEl = ref<HTMLElement | null>(null)
let chart: echarts.ECharts

const dockClosed = ref(false)
const chartTitle = ref("")

const rows = ref<any[]>([])
const columns = ref<string[]>([])
const numericColumns = ref<string[]>([])

const xCol = ref("")
const yCol = ref("")
const zCol = ref("")

const activeChart = ref<any>(null)
const loading = ref(false)
const error = ref<string | null>(null)

/* =====================================================
   LARGE DATA FLAG
===================================================== */
const isLarge = computed(() => rows.value.length > 5000)

/* =====================================================
   CHART REGISTRY
===================================================== */
const chartRegistry = {
  Bar: [
    { label: "Bar", axes: ["x", "y"], renderer: barBasic },
    { label: "Stacked Bar", axes: ["x", "y", "z"], renderer: barStacked }
  ],
  Line: [
    { label: "Line", axes: ["x", "y"], renderer: lineBasic },
    { label: "Smooth Line", axes: ["x", "y"], renderer: lineSmooth },
    { label: "Area Line", axes: ["x", "y"], renderer: lineArea }
  ],
  Pie: [
    { label: "Pie", axes: ["x", "y"], renderer: pieBasic },
    { label: "Pie", axes: ["x", "y"], renderer: pieDoughtnut }
  ],
  Scatter: [
    { label: "Scatter", axes: ["x", "y"], renderer: scatterBasic }
  ]
}

/* =====================================================
   AXIS VISIBILITY
===================================================== */
const showX = computed(() => activeChart.value?.axes.includes("x"))
const showY = computed(() => activeChart.value?.axes.includes("y"))
const showZ = computed(() => activeChart.value?.axes.includes("z"))

const scatterOnlyNumeric = computed(
  () => activeChart.value?.label === "Scatter"
)

/* =====================================================
   BASE OPTION
===================================================== */
function baseOption() {
  return {
    animation: !isLarge.value,
    title: {
      text: chartTitle.value,
      left: "center",
      textStyle: { color: "#eaeaea" }
    },
    legend: {
      top: 28,
      textStyle: { color: "#ccc" }
    },
    dataset: {
      source: rows.value
    }
  }
}

/* =====================================================
   RENDERERS
===================================================== */
function barBasic(x: string, y: string) {
  return {
    ...baseOption(),
    xAxis: { type: "category", name: x },
    yAxis: { type: "value", name: y },
    series: [{
      type: "bar",
      name: y,
      encode: { x, y },
      large: isLarge.value
    }]
  }
}

function barStacked(x: string, y: string, z: string) {
  return {
    ...baseOption(),
    xAxis: { type: "category", name: x },
    yAxis: { type: "value" },
    series: [
      { type: "bar", name: y, stack: "t", encode: { x, y } },
      { type: "bar", name: z, stack: "t", encode: { x, y: z } }
    ]
  }
}

function lineBasic(x: string, y: string) {
  return {
    ...baseOption(),
    xAxis: { type: "category", name: x },
    yAxis: { type: "value", name: y },
    series: [{
      type: "line",
      name: y,
      encode: { x, y },
      sampling: isLarge.value ? "lttb" : undefined,
      symbol: isLarge.value ? "none" : "circle"
    }]
  }
}

function lineSmooth(x: string, y: string) {
  return {
    ...baseOption(),
    xAxis: { type: "category", name: x },
    yAxis: { type: "value", name: y },
    series: [{
      type: "line",
      smooth: true,
      name: y,
      encode: { x, y },
      sampling: isLarge.value ? "lttb" : undefined,
      symbol: isLarge.value ? "none" : "circle"
    }]
  }
}

function lineArea(x: string, y: string) {
  return {
    ...lineBasic(x, y),
    series: [{
      type: "line",
      name: y,
      areaStyle: {},
      encode: { x, y }
    }]
  }
}

function pieBasic(x: string, y: string) {
  return {
    ...baseOption(),
    legend: { orient: "vertical", left: "left" },
    series: [{
      type: "pie",
      name: y,
      radius: "60%",
      data: rows.value.slice(0, 50).map(r => ({
        name: r[x],
        value: r[y]
      }))
    }]
  }
}

function pieDoughtnut(x: string, y: string) {
  return {
    ...baseOption(),
    legend: { orient: "vertical", left: "left" },
    series: [{
      type: "pie",
      name: y,
      radius: ['40%', '70%'],
      data: rows.value.slice(0, 50).map(r => ({
        name: r[x],
        value: r[y]
      }))
    }]
  }
}

function scatterBasic(x: string, y: string) {
  return {
    ...baseOption(),
    xAxis: { type: "value", name: x },
    yAxis: { type: "value", name: y },
    series: [{
      type: "scatter",
      name: `${y} vs ${x}`,
      encode: { x, y },
      large: isLarge.value
    }]
  }
}

/* =====================================================
   SQL EXECUTION
===================================================== */
async function executeSql() {
  if (!props.sql?.trim()) return

  loading.value = true
  error.value = null

  try {
    const result = await invoke<any>("execute_sql", { sql: props.sql })

    let normalized: any[] = []

    if (Array.isArray(result)) {
      normalized = result
    } else if (result?.columns && result?.rows) {
      normalized = result.rows.map((r: any[]) =>
        Object.fromEntries(result.columns.map((c: string, i: number) => [c, r[i]]))
      )
    }

    if (!normalized.length) throw new Error("Query returned no data")

    rows.value = normalized
    columns.value = Object.keys(normalized[0])
    numericColumns.value = columns.value.filter(
      c => typeof normalized[0][c] === "number"
    )

    if (!xCol.value) xCol.value = columns.value[0]
    if (!yCol.value) yCol.value = numericColumns.value[0]
    if (!zCol.value) zCol.value = numericColumns.value[1]

  } catch (e: any) {
    error.value = e?.message ?? "SQL execution failed"
    rows.value = []
  } finally {
    loading.value = false
  }
}

/* =====================================================
   CHART CONTROL
===================================================== */
function selectChart(chartDef: any) {
  activeChart.value = chartDef
  render()
}

function render() {
  if (!chart || !activeChart.value || !rows.value.length) return

  const option = activeChart.value.renderer(
    xCol.value,
    yCol.value,
    zCol.value
  )

  chart.setOption(option, true)
  chart.resize()
}

function toggleDock() {
  dockClosed.value = !dockClosed.value
  chart.resize()
}

/* =====================================================
   WATCHERS (RENDER ONLY)
===================================================== */
watch([xCol, yCol, zCol, chartTitle], render)

/* =====================================================
   MOUNT
===================================================== */
onMounted(async () => {
  chart = echarts.init(chartEl.value!, "dark")
  await executeSql()
  if (rows.value.length) {
    selectChart(chartRegistry.Bar[0])
  }
})
</script>

<style scoped>
.app {
  display: flex;
  height: 100%;
  background: #121212;
  color: #eaeaea;
}

.dock {
  width: 300px;
  background: #1e1e1e;
  border-right: 1px solid #2a2a2a;
  transition: width 0.25s;
  display: flex;
  flex-direction: column;
}

.dock.closed {
  width: 42px;
}

.dock-header {
  display: flex;
  justify-content: space-between;
  padding: 10px;
}

.dock-title {
  font-weight: 600;
}

.dock-content {
  padding: 10px;
  overflow-y: auto;
}

.chart-item {
  padding: 6px;
  cursor: pointer;
  border-radius: 4px;
}

.chart-item:hover {
  background: #2a2a2a;
}

.group-title {
  margin-top: 12px;
  font-weight: 600;
}

input, select {
  width: 100%;
  margin-bottom: 6px;
  background: #121212;
  color: #fff;
  border: 1px solid #444;
  padding: 6px;
}

.main {
  flex: 1;
  padding: 10px;
}

.chart {
  height: 100%;
  background: #1e1e1e;
  border-radius: 6px;
}
</style>
