<template>
  <div class="toolbar">
    <button class="btn run" @click="emitRun">
      ▶ Run
    </button>

    <button class="btn cancel" @click="emitCancel">
      ✖ Cancel
    </button>
    
    <button class="btn" @click="emitformatSql">
      🧹 Format SQL
    </button>

    <div class="separator"></div>

    <button class="btn" @click="emitQueryBuilder">
      🧩 Query Builder
    </button>

    <button class="btn" @click="emitExplain">
      ℹ Explain
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * Emitted events:
 * - run
 * - cancel
 * - format-sql
 * - query-builder
 * - explain
 */

const emit = defineEmits<{
  (e: "run"): void
  (e: "cancel"): void
  (e: "format-sql"): void
  (e: "query-builder"): void
  (e: "explain"): void
}>()

const emitRun = () => emit("run")
const emitCancel = () => emit("cancel")
const emitformatSql = () => emit("format-sql")
const emitQueryBuilder = () => emit("query-builder")
const emitExplain = () => emit("explain")
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border: 1px solid #d0d0d0;
  background: #f3f3f3;
  box-shadow: inset 0 1px 0 #ffffff;
  font-family: "Segoe UI", Tahoma, Arial, sans-serif;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 13px;
  background: #ffffff;
  border: 1px solid #c8c8c8;
  border-radius: 2px;
  cursor: pointer;
  color: #333;
  user-select: none;
}

.btn:hover {
  background: #eaeaea;
}

.btn:active {
  background: #dcdcdc;
}

.btn.run {
  color: #107c10;
  font-weight: 600;
}

.btn.cancel {
  color: #c50f1f;
}

.separator {
  width: 1px;
  height: 20px;
  background: #c8c8c8;
  margin: 0 4px;
}
</style>
