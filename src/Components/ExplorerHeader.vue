<template>
  <div class="explorer-header">
    <span class="title">EXPLORER</span>

    <div class="actions">
      <button
        class="icon-btn"
        title="New Folder"
        @click="$emit('new-folder')"
      >
        <svg viewBox="0 0 24 24">
          <path
            d="M10 4H4c-1.1 0-2 .9-2 2v12c0 
               1.1.9 2 2 2h16c1.1 
               0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zM13 
               13h-2v2H9v-2H7v-2h2V9h2v2h2v2z"
          />
        </svg>
      </button>

      <button
        class="icon-btn"
        title="Upload"
        @click="$emit('upload')"
      >
        <svg viewBox="0 0 24 24">
          <path
            d="M5 20h14v-2H5v2zM12 
               2l-5.5 5.5h3.5V15h4V7.5H17.5L12 2z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
defineEmits(["new-folder", "upload"]);
</script>

<style scoped>
.explorer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  background: linear-gradient(180deg, #0f172a, #020617);
  border-bottom: 1px solid #1e293b;
}

.title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #94a3b8;
}

.actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.icon-btn svg {
  width: 18px;
  height: 18px;
  fill: #94a3b8;
}

.icon-btn:hover {
  background-color: #1e293b;
}

.icon-btn:hover svg {
  fill: #e5e7eb;
}
</style>
