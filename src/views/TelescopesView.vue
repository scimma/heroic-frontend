<script setup>
import { ref } from 'vue'
import DataTable from "../components/DataTable.vue";

const telescopeHeaders = ref([
  {title: 'Name', align: 'start', sortable: true, key: 'name'},
  {title: 'Site', align: 'start', sortable: true, key: 'site'},
  {title: 'Aperture (m)', align: 'end', sortable: true, key: 'aperture'},
  {title: 'Status', align: 'end', sortable: true, key: 'status'},
  {title: 'Latitude', align: 'end', sortable: true, key: 'latitude'},
  {title: 'Longitude', align: 'end', sortable: true, key: 'longitude'}
])

</script>

<template>
  <v-container fluid>
    <h1>Telescope Data:</h1>
    <data-table
      apiKey="telescopes"
      :headers=telescopeHeaders
    ></data-table>
  </v-container>
</template>
<style>

</style>
