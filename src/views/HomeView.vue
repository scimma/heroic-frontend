<script setup>
import WorldMap from "../components/WorldMap.vue";
import { useFiltersStore } from '@/stores/filters'

const filtersStore = useFiltersStore()

</script>

<template>
  <v-container fluid>
    <world-map
      :telescopes="filtersStore.filteredTelescopes"
    ></world-map>
  </v-container>
</template>
<style>

</style>