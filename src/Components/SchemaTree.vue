<script setup>
import { ref, watchEffect } from "vue";
import Tree from "primevue/tree";
import ContextMenu from "primevue/contextmenu";

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
    type: "schema",           // 👈 important
    children: schema.tables.map((table, tIndex) => ({
      key: `schema-${sIndex}-table-${tIndex}`,
      label: table.table,
      icon: "pi pi-database",
      type: "table",
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
    label: "Refresh",
    icon: "pi pi-refresh",
    command: () => refreshSchema(selectedNode.value)
  },
  {
    label: "Rename",
    icon: "pi pi-pencil",
    command: () => renameSchema(selectedNode.value)
  },
  { separator: true },
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

function renameSchema(node) {
  console.log("Rename schema:", node.label);
}

function deleteSchema(node) {
  console.log("Delete schema:", node.label);
}

function onDoubleClick(event, node) {
  console.log("double Clicked");
  // if (event.originalEvent) {
  //   event.originalEvent.preventDefault();
  // }

  // if (event.node?.type === "schema") {
  //   selectedNode.value = event.node;

  //   selectedKeys.value = {
  //     [event.node.key]: true
  //   };

  //   contextMenu.value.show(event.originalEvent);
  // }
}
</script>

<template>
  <ContextMenu ref="contextMenu" :model="folderMenuItems" />

  <Tree
    :value="treeNodes"
    contextMenu
    selectionMode="single"
    v-model:selectionKeys="selectedKeys"
    class="w-full"
    :pt="{
      nodeContent: ({ context }) => ({
        onDblclick: (e) => onDoubleClick(e, context.node)
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
