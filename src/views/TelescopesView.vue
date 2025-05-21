<script setup>
import { ref, computed } from 'vue'
import { useFiltersStore } from '@/stores/filters'

const filtersStore = useFiltersStore()
const searchText = ref('');

const telescopeHeaders = ref([
  {title: 'Name', align: 'start', sortable: true, key: 'name', value: 'name'},
  {title: 'Site', align: 'start', sortable: true, key: 'site', value: 'site'},
  {title: 'Aperture (m)', align: 'end', sortable: true, key: 'aperture'},
  {title: 'Status', align: 'end', sortable: true, key: 'status'},
  {title: 'Latitude', align: 'end', sortable: true, key: 'latitude'},
  {title: 'Longitude', align: 'end', sortable: true, key: 'longitude'}
])

function generateItemLink(item) {
  var detailPage = 'telescopeDetail';
  return { name: detailPage, params: { id: item.id } };
}

const filteredTelescopes = computed(() => {
  if (filtersStore.filteredTelescopes && searchText.value) {
    const searchTerm = searchText.value.toLowerCase();
    return filtersStore.filteredTelescopes.filter(item => item['name'].toLowerCase().includes(searchTerm) || item['id'].toLowerCase().includes(searchTerm))
  }
  return filtersStore.filteredTelescopes;
})

</script>

<template>
  <v-container fluid>
    <v-row class="pb-1">
      <v-col cols="4">
        <h1>Filtered Telescope Data:</h1>
      </v-col>
      <v-col offset="2" cols="4">
        <v-text-field v-model="searchText" prepend-inner-icon="mdi-magnify" label="search" variant="outlined" hide-details single-line clearable></v-text-field>
      </v-col>
      <v-col cols="2" align="right" style="align-content: center;">
        <p>Showing: {{ filteredTelescopes.length }} / {{ filtersStore.telescopes ? Object.keys(filtersStore.telescopes).length: 0 }}</p>
      </v-col>
    </v-row>
    <v-data-table-virtual
      :headers="telescopeHeaders"
      :items="filteredTelescopes"
      item-key="id"
    >
      <template #item.name="{ item }">
        <router-link :to="generateItemLink(item)">{{ item.name }}</router-link>
      </template>
    </v-data-table-virtual>
  </v-container>
</template>
<style>

</style>
