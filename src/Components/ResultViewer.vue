<template>
  <div class="container">
    <!-- ERROR VIEW -->
    <div v-if="error" class="error-box">
      <pre>{{ error }}</pre>
    </div>

    <!-- GRID -->
    <div
      v-else
      ref="gridEl"
      class="ag-theme-quartz grid"
    ></div>

    <!-- STATUS BAR -->
    <div v-if="!error" class="status-bar">
      <span>
        Loaded:
        <strong>{{ loadedCount }}</strong>
      </span>
      <span>
        Total:
        <strong>{{ totalCount }}</strong>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue"
import {
  createGrid,
  GridApi,
  GridOptions,
  ColDef
} from "ag-grid-community"
import { invoke } from "@tauri-apps/api/core"

import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-quartz.css"

/* ============================================================
   PROPS
============================================================ */

const props = defineProps<{
  sql: string
}>()

/* ============================================================
   STATE
============================================================ */

const gridEl = ref<HTMLDivElement | null>(null)
let gridApi: GridApi | null = null

const loadedCount = ref(0)
const totalCount = ref(0)
const error = ref<string | null>(null)

/* ============================================================
   ROW NUMBER COLUMN
============================================================ */

const rowNumberCol: ColDef = {
  headerName: "#",
  width: 70,
  pinned: "left",
  sortable: false,
  filter: false,
  valueGetter: p =>
    p.node?.rowIndex != null ? p.node.rowIndex + 1 : ""
}

/* ============================================================
   SQL HELPERS
============================================================ */

function escapeString(v: string) {
  return v.replace(/'/g, "''")
}

function buildWhereClause(filterModel: any) {
  const clauses: string[] = []

  for (const field in filterModel) {
    const f = filterModel[field]

    if (f.filterType === "text" && f.type === "contains") {
      clauses.push(`${field} ILIKE '%${escapeString(f.filter)}%'`)
    }

    if (f.filterType === "number" && f.type === "equals") {
      clauses.push(`${field} = ${f.filter}`)
    }
  }

  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""
}

function buildOrderBy(sortModel: any[]) {
  if (!sortModel.length) return ""
  return (
    "ORDER BY " +
    sortModel.map(s => `${s.colId} ${s.sort.toUpperCase()}`).join(", ")
  )
}

function buildPagedSQL(params: any) {
  const where = buildWhereClause(params.filterModel)
  const orderBy = buildOrderBy(params.sortModel)
  const limit = params.endRow - params.startRow
  const offset = params.startRow

  return `
SELECT *
FROM (
  ${props.sql}
) t
${where}
${orderBy}
LIMIT ${limit}
OFFSET ${offset}
`.trim()
}

function buildCountSQL(filterModel: any) {
  const where = buildWhereClause(filterModel)

  return `
SELECT COUNT(*) AS count
FROM (
  ${props.sql}
) t
${where}
`.trim()
}

/* ============================================================
   GRID OPTIONS
============================================================ */

const gridOptions: GridOptions = {
  rowModelType: "infinite",
  cacheBlockSize: 100,
  onFilterChanged: reset,
  onSortChanged: reset
}

/* ============================================================
   DATASOURCE
============================================================ */

const datasource = {
  async getRows(params: any) {
    try {
      const sql = buildPagedSQL(params)

      const result = await invoke<any>("execute_sql", { sql })

      const rows = Array.isArray(result)
        ? result
        : result?.rows ?? []

      loadedCount.value = params.startRow + rows.length

      const lastRow =
        rows.length < params.endRow - params.startRow
          ? loadedCount.value
          : -1

      params.successCallback(rows, lastRow)
    } catch (e: any) {
      error.value = e?.message ?? String(e)
      params.failCallback()
    }
  }
}

/* ============================================================
   INITIAL LOAD & SCHEMA RESOLUTION
============================================================ */

async function initGrid() {
  error.value = null
  loadedCount.value = 0
  totalCount.value = 0

  try {
    // Probe query to get schema
    const probeSql = `SELECT * FROM (${props.sql}) t LIMIT 1`
    const probe = await invoke<any>("execute_sql", { sql: probeSql })

    const row = Array.isArray(probe)
      ? probe[0]
      : probe?.rows?.[0]

    if (!row) throw new Error("Query returned no rows")

    const columnDefs: ColDef[] = [
      rowNumberCol,
      ...Object.keys(row).map(key => ({
        field: key,
        sortable: true,
        filter: true
      }))
    ]

    if (!gridEl.value) return

    gridApi?.destroy()
    gridApi = createGrid(gridEl.value, gridOptions)

    gridApi.setGridOption("columnDefs", columnDefs)
    gridApi.setGridOption("datasource", datasource)

    await loadTotalCount()
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  }
}

async function loadTotalCount() {
  const sql = buildCountSQL(gridApi?.getFilterModel() ?? {})

  const result = await invoke<any>("execute_sql", { sql })

  totalCount.value = Array.isArray(result)
    ? result[0]?.count ?? 0
    : result?.rows?.[0]?.count ?? 0
}

function reset() {
  loadedCount.value = 0
  gridApi?.refreshInfiniteCache()
  loadTotalCount()
}

/* ============================================================
   LIFECYCLE
============================================================ */

onMounted(initGrid)

watch(
  () => props.sql,
  () => initGrid()
)

onBeforeUnmount(() => {
  gridApi?.destroy()
})
</script>

<style scoped>
.container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.grid {
  flex: 1;
}

.status-bar {
  height: 32px;
  display: flex;
  justify-content: space-between;
  padding: 0 12px;
  background: #020617;
  color: #cbd5f5;
  font-size: 12px;
}

.error-box {
  flex: 1;
  background: #020617;
  color: #f87171;
  padding: 12px;
  font-family: monospace;
  overflow: auto;
}
</style>
