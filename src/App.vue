<script setup>
import EditorLayout from "./layouts/EditorLayout.vue";
import { ModuleRegistry } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import { ref } from "vue";
import SqlEditor from "./components/SqlEditor.vue";

ModuleRegistry.registerModules([AllCommunityModule]);

</script>
<template>
  <EditorLayout></EditorLayout>
</template>
<style>

</style>