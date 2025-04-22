<script setup>
import { ref } from 'vue'
import DataTable from "../components/DataTable.vue";

const instrumentHeaders = ref([
  {title: 'Name', align: 'start', sortable: true, key: 'name'},
  {title: 'Status', align: 'end', sortable: true, key: 'status'},
  {title: 'Telescope', align: 'end', sortable: true, key: 'telescope'},
  {title: 'Optical Elements', align: 'end', sortable: true, key: 'optical_element_groups'},
  {title: 'Modes', align: 'end', sortable: true, key: 'operation_modes'}
])

</script>

<template>
  <v-container fluid>
    <h1>Instrument Data:</h1>
    <data-table
      apiKey="instruments"
      :headers=instrumentHeaders
    ></data-table>
  </v-container>
</template>
<style>

</style>
