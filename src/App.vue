<script setup>
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open } from '@tauri-apps/plugin-dialog';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';
import EditorLayout from "./layouts/EditorLayout.vue";
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import ExplorerHeader from "./Components/ExplorerHeader.vue";
import SchemaTree from "./components/SchemaTree.vue";

ModuleRegistry.registerModules([AllCommunityModule]);

var schemas = [];

function createFolder() {
  console.log("New folder clicked");
  createConnection();
}

function uploadFile() {
  console.log("Upload clicked");
}


async function createConnection() {
  console.log('New connection')

  const folderPath = await open({
    directory: true,
    multiple: false,
  });

  if (folderPath) {
    var tables  = await invoke("load_csv_folder",{
      folderPath: folderPath
    });
    console.log("Selected folder:", folderPath);
    console.log("Loaded tables:", tables)

    var tableschema  = await invoke("get_csv_schemas");
    console.log("Loaded tableschema:", tableschema)

    schemas = tableschema.reduce((acc, curr) => {
      // Map the columns array to only include the 'name' property
      acc[curr.table] = curr.columns.map(col => col.name);
      return acc;
    }, {});
    
    // new SchemaTree(document.getElementById("schemaTree"), tableschema, {
    //   onTableSelect: (tableName) => {
    //     console.log("Load CSV for:", tableName);
    //     // invoke("load_csv_table", { tableName });
    //   }
    // });

    console.log("Loaded schema:", schema)
  }
}

function disconnectDb() {
  console.log('Disconnected')
}

function reconnectDb() {
  console.log('Reconnected')
}

function closeEditor() {
  console.log('Editor closed')
}

</script>
<template>
  <Splitter style="height: 100vh; width: 100vw;">
    <SplitterPanel 
      :size="20"
      class="flex items-center justify-center"
    >
      <ExplorerHeader
        @new-folder="createFolder"
        @upload="uploadFile"
      />
      <SchemaTree :schemas="schemas" />
    </SplitterPanel>
    
    <SplitterPanel 
      :size="80"
      class="flex items-center justify-center"
      :style="{ backgroundColor: '#0f172a' }"
    >
      <EditorLayout></EditorLayout>
    </SplitterPanel>
  </Splitter>
</template>
<style>

</style>