<template>
  <div class="container">
    <div ref="gridEl" class="ag-theme-quartz grid"></div>

    <!-- Bottom Status Bar -->
    <div class="status-bar">
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
import { ref, onMounted, onBeforeUnmount, computed } from "vue"
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
  table: string
  file_path: string
  columns: Array<{
    name: string
    data_type: string
  }>
}>()

/* ============================================================
   STATE
============================================================ */

const gridEl = ref<HTMLDivElement | null>(null)
let gridApi: GridApi | null = null

const loadedCount = ref(0)
const totalCount = ref(0)

/* ============================================================
   FIXED ROW NUMBER COLUMN
============================================================ */

const rowNumberCol: ColDef = {
  headerName: "#",
  width: 70,
  pinned: "left",
  lockPinned: true,
  sortable: false,
  filter: false,
  resizable: false,
  suppressMenu: true,
  cellStyle: {
    textAlign: "center",
    backgroundColor: "#0f172a",
    color: "#94a3b8",
    fontWeight: "bold"
  },
  valueGetter: params =>
    params.node?.rowIndex != null
      ? params.node.rowIndex + 1
      : ""
}

/* ============================================================
   DUCKDB → AG GRID COLUMN RESOLUTION
============================================================ */

function resolveDuckDbColumnDef(
  col: { name: string; data_type: string }
): ColDef {
  const type = col.data_type.toUpperCase()

  if (type === "BOOLEAN") {
    return {
      field: col.name,
      sortable: true,
      filter: "agSetColumnFilter"
    }
  }

  if (
    type.includes("INT") ||
    type.includes("FLOAT") ||
    type.includes("DOUBLE") ||
    type.includes("DECIMAL")
  ) {
    return {
      field: col.name,
      sortable: true,
      filter: "agNumberColumnFilter"
    }
  }

  if (type === "DATE" || type.startsWith("TIMESTAMP")) {
    return {
      field: col.name,
      sortable: true,
      filter: "agDateColumnFilter"
    }
  }

  return {
    field: col.name,
    sortable: true,
    filter: "agTextColumnFilter"
  }
}

/* ============================================================
   COLUMN DEFS
============================================================ */

const columnDefs = computed<ColDef[]>(() => [
  rowNumberCol,
  ...props.columns.map(resolveDuckDbColumnDef)
])

/* ============================================================
   SQL BUILDERS
============================================================ */

function escapeString(v: string) {
  return v.replace(/'/g, "''")
}

function buildWhereClause(filterModel: any) {
  const clauses: string[] = []

  for (const field in filterModel) {
    const f = filterModel[field]

    switch (f.filterType) {
      case "number":
        if (f.type === "equals") clauses.push(`${field} = ${f.filter}`)
        if (f.type === "greaterThan") clauses.push(`${field} > ${f.filter}`)
        if (f.type === "lessThan") clauses.push(`${field} < ${f.filter}`)
        if (f.type === "inRange")
          clauses.push(`${field} BETWEEN ${f.filter} AND ${f.filterTo}`)
        break

      case "text":
        if (f.type === "contains")
          clauses.push(`${field} ILIKE '%${escapeString(f.filter)}%'`)
        if (f.type === "equals")
          clauses.push(`${field} = '${escapeString(f.filter)}'`)
        break

      case "date":
        clauses.push(`${field} = DATE '${f.dateFrom}'`)
        break
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

function buildSQL(params: any) {
  const where = buildWhereClause(params.filterModel)
  const orderBy = buildOrderBy(params.sortModel)
  const limit = params.endRow - params.startRow
  const offset = params.startRow

  return `
SELECT *
FROM ${props.table}
${where}
${orderBy}
LIMIT ${limit}
OFFSET ${offset}
`.trim()
}

function buildCountSQL(filterModel: any) {
  const where = buildWhereClause(filterModel)
  return `SELECT COUNT(*) AS count FROM ${props.table} ${where}`.trim()
}

/* ============================================================
   GRID OPTIONS
============================================================ */

const gridOptions: GridOptions = {
  rowModelType: "infinite",
  cacheBlockSize: 100,
  maxBlocksInCache: 5,

  onFilterChanged: resetOnQueryChange,
  onSortChanged: resetOnQueryChange
}

/* ============================================================
   DATASOURCE
============================================================ */

const datasource = {
  async getRows(params: any) {
    try {
      const query = buildSQL(params)
      console.log("Sql Query : "+query);
      const result = await invoke<any>("execute_sql", {
        sql: query,
        table: props.table,
        file_path: props.file_path
      })

      const rows = Array.isArray(result)
        ? result
        : result?.rows ?? []

      // 🔑 Correct loaded count (no accumulation bug)
      loadedCount.value = params.startRow + rows.length

      const lastRow =
        rows.length < (params.endRow - params.startRow)
          ? params.startRow + rows.length
          : -1

      params.successCallback(rows, lastRow)
    } catch (err) {
      console.error("DuckDB query failed:", err)
      params.failCallback()
    }
  }
}

/* ============================================================
   TOTAL COUNT (FILTER AWARE)
============================================================ */

async function loadTotalCount(filterModel: any) {
  const sql = buildCountSQL(filterModel)

  const result = await invoke<any>("execute_sql", {
    sql,
    table: props.table,
    file_path: props.file_path
  })

  totalCount.value = Array.isArray(result)
    ? result[0]?.count ?? 0
    : result?.rows?.[0]?.count ?? 0
}

/* ============================================================
   RESET ON FILTER / SORT CHANGE
============================================================ */

function resetOnQueryChange() {
  loadedCount.value = 0
  gridApi?.refreshInfiniteCache()

  const filterModel = gridApi?.getFilterModel() ?? {}
  loadTotalCount(filterModel)
}

/* ============================================================
   LIFECYCLE
============================================================ */

onMounted(async () => {
  if (!gridEl.value) return

  gridApi = createGrid(gridEl.value, gridOptions)

  gridApi.setGridOption("columnDefs", columnDefs.value)
  gridApi.setGridOption("datasource", datasource)

  // initial total count (no filters)
  await loadTotalCount({})
})

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

/* Bottom status bar */
.status-bar {
  height: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  background: #020617;
  color: #cbd5f5;
  border-top: 1px solid #1e293b;
}
</style>
