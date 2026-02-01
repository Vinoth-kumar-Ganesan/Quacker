<script setup>
import { ref, watchEffect } from "vue";
import Tree from "primevue/tree";
import ContextMenu from "primevue/contextmenu";
import Button from 'primevue/button';

const emit = defineEmits(['openFolder', 'openFile','openSqlEditor']);

const emitOpenFolder = () => {
  emit('openFolder');
};

const emitOpenFile = (filePath,tableName) => {
  emit('openFile', filePath,tableName);
};

const emitOpenSqlEditor = (filePath,schema) => {
  emit('openSqlEditor', filePath,schema);
};

/* -----------------------------
   Props
------------------------------*/
const props = defineProps({
  schemas: {
    type: Array,
    required: true
  }
});

/* -----------------------------
   State
------------------------------*/
const treeNodes = ref([]);
const selectedNode = ref(null);
const selectedKeys = ref({});
const contextMenu = ref(null);

/* -----------------------------
   Build Tree (example logic)
------------------------------*/
function buildPrimeTree(schemas) {
  return schemas.map((schema, sIndex) => ({
    key: `schema-${sIndex}`,
    label: schema.title,
    icon: "pi pi-folder",
    type: "schema",         
    children: schema.tables.map((table, tIndex) => ({
      key: `schema-${sIndex}-table-${tIndex}`,
      label: table.table,
      icon: "pi pi-database",
      type: "table",
      filePath: table.file_path,
      children: table.columns.map((col, cIndex) => ({
        key: `schema-${sIndex}-table-${tIndex}-col-${cIndex}`,
        label: col.name,
        icon: "pi pi-tag",
        type: "column",
        data: { data_type: col.data_type },
        leaf: true
      }))
    }))
  }));
}

watchEffect(() => {
  treeNodes.value = buildPrimeTree(props.schemas);
});

/* -----------------------------
   Context Menu (Schema only)
------------------------------*/
const folderMenuItems = [

  {
    label: "Open Sql Editor",
    icon: "pi pi-pencil",
    command: () => openSqlEditor(selectedNode.value)
  },
  { separator: true },
  {
    label: "Refresh",
    icon: "pi pi-refresh",
    command: () => refreshSchema(selectedNode.value)
  },
  {
    label: "Delete",
    icon: "pi pi-trash",
    command: () => deleteSchema(selectedNode.value)
  }
];

/* -----------------------------
   Actions (mock)
------------------------------*/
function refreshSchema(node) {
  console.log("Refresh schema:", node.label);
}

function openSqlEditor(node) {
  console.log("open Sql editor:", node);
  emitOpenSqlEditor(node.filePath,props.schemas);
}

function deleteSchema(node) {
  console.log("Delete schema:", node.label);
}

function onDoubleClick(event, node) {
  console.log("double Clicked");
  console.log(node.filePath);
  if(node.type =="table"){
    emitOpenFile(node.filePath,node.label);
  }
}

function onRightClick(event, node) {
  event.preventDefault()
  event.stopPropagation()
  console.log("Right Clicked");

  if(node.type =="schema"){
    console.log(node.label);
    contextMenu.value.show(event)
    selectedNode.value = node
  }
}
</script>

<template>
  <ContextMenu ref="contextMenu" :model="folderMenuItems" />
  <div
    v-if="!treeNodes || treeNodes.length === 0"
    class="flex items-center justify-center h-40 text-gray-500 text-sm"
    style=" display: flex;
    padding-top: 270px;
    flex-direction: column;
    align-items: center;"
  >
    Please open a folder or file.
    <div style="margin-top: 10px;">
        <Button label="Open" @click="emitOpenFolder"></Button>
    </div>
  </div>
  <Tree
  v-else
    :value="treeNodes"
    contextMenu
    :filter="true" 
    filterMode="lenient"
    selectionMode="single"
    v-model:selectionKeys="selectedKeys"
    class="w-full"
    :pt="{
      nodeContent: ({ context }) => ({
        onDblclick: (e) => onDoubleClick(e, context.node),
        onContextmenu: (e) => onRightClick(e, context.node)
      })
    }"
    >
    <template #default="{ node }">
      <span class="flex items-center gap-2">
        <span>{{ node.label }}</span>
        <small
          v-if="node.type === 'column'"
          class="text-gray-500"
        >
          ({{ node.data.data_type }})
        </small>
      </span>
    </template>
  </Tree>
</template>
<style>
.p-tree-node-label{
  font-size: 12px;
}
.p-tree {
  padding: 0px !important;
}
</style>