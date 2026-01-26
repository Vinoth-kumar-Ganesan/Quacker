<template>
  <div class="csv-viewer">
    <!-- AG Grid -->
    <ag-grid-vue
      class="ag-theme-alpine grid"
      :columnDefs="columnDefs"
      :rowData="rowData"
      :defaultColDef="defaultColDef"
      :animateRows="true"
      :rowBuffer="20"
      :suppressRowClickSelection="true"
    />
  </div>
</template>

<script setup>
import { ref } from "vue";
import Papa from "papaparse";
import { AgGridVue } from "ag-grid-vue3";


const columnDefs = ref([]);
const rowData = ref([]);
const rowCount = ref(0);

const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  minWidth: 120,
};

function onFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    worker: true, // important for large files
    complete: (results) => {
      buildGrid(results.data);
    },
    error: (err) => {
      console.error("CSV parse error:", err);
    },
  });
}

function buildGrid(data) {
  if (!data.length) return;

  columnDefs.value = Object.keys(data[0]).map((key) => ({
    field: key,
    headerName: key,
  }));

  rowData.value = data;
  rowCount.value = data.length;
}
</script>

<style scoped>
.csv-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #ddd;
}

.grid {
  flex: 1;
  width: 100%;
}
</style>
