<template>
  <div class="toolbar">
    <button
      class="icon-btn"
      title="New Connection"
      @click="emit('new')"
    >
      <i class="pi pi-plus"></i>
    </button>

    <button
      class="icon-btn"
      title="Disconnect"
      @click="emit('disconnect')"
    >
      <i class="pi pi-power-off"></i>
    </button>

    <button
      class="icon-btn"
      title="Reconnect"
      @click="emit('reconnect')"
    >
      <i class="pi pi-refresh"></i>
    </button>

    <button
      class="icon-btn danger"
      title="Close"
      @click="emit('close')"
    >
      <i class="pi pi-times"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'new'): void
  (e: 'disconnect'): void
  (e: 'reconnect'): void
  (e: 'close'): void
}>()
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  height: 36px;
  background: #2b2b2b;
  padding: 0 6px;
  gap: 4px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #cfcfcf;
  cursor: pointer;
  border-radius: 4px;
}

.icon-btn:hover {
  background: #3a3a3a;
}

.icon-btn.danger {
  color: #ff6b6b;
}
</style>
