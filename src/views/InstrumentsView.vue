<script setup>
import { ref, computed } from 'vue'
import { useFiltersStore } from '@/stores/filters'

const filtersStore = useFiltersStore()
const searchText = ref('');

const instrumentHeaders = ref([
  {title: 'Name', align: 'start', sortable: true, key: 'name', value: 'name'},
  {title: 'Status', align: 'end', sortable: true, key: 'status'},
  {title: 'Telescope', align: 'end', sortable: true, key: 'telescope'},
  {title: 'Optical Elements', align: 'end', sortable: true, key: 'optical_element_groups'},
  {title: 'Modes', align: 'end', sortable: true, key: 'operation_modes'}
])

const filteredInstruments = computed(() => {
  if (baseFilteredInstruments.value && searchText.value) {
    const searchTerm = searchText.value.toLowerCase();
    return baseFilteredInstruments.value.filter(item => item['name'].toLowerCase().includes(searchTerm) || item['id'].toLowerCase().includes(searchTerm))
  }
  return baseFilteredInstruments.value;
})

const baseFilteredInstruments = computed(() => {
  var instruments = [];
  filtersStore.filteredTelescopes.forEach(telescope => {
    instruments.push(...telescope.instruments);
  })
  return instruments;
})

const totalInstrumentCount = computed(() => {
  var instrumentTotal = 0;
  if (filtersStore.telescopes){
    Object.values(filtersStore.telescopes).forEach(telescope => {
      instrumentTotal += telescope.instruments.length;
    })
  }
  return instrumentTotal;
})

function generateItemLink(item) {
  var detailPage = 'instrumentDetail';
  return { name: detailPage, params: { id: item.id } };
}

</script>

<template>
  <v-container fluid>
    <v-row class="pb-1">
      <v-col cols="5">
        <h1>Filtered Instrument Data:</h1>
      </v-col>
      <v-col offset="1" cols="4">
        <v-text-field v-model="searchText" prepend-inner-icon="mdi-magnify" label="search" variant="outlined" hide-details single-line clearable></v-text-field>
      </v-col>
      <v-col cols="2" align="right" style="align-content: center;">
        <p>Showing: {{ filteredInstruments.length }} / {{ totalInstrumentCount }}</p>
      </v-col>
    </v-row>
    <v-data-table-virtual
      :headers="instrumentHeaders"
      :items="filteredInstruments"
      item-key="id"
    >
      <template #item.name="{ item }">
        <router-link :to="generateItemLink(item)">{{ item.name }}</router-link>
      </template>
      <template #item.optical_element_groups="{ item }">
        {{ Object.keys(item.optical_element_groups).join(', ') }}
      </template>
      <template #item.operation_modes="{ item }">
        {{ Object.keys(item.operation_modes).join(', ') }}
      </template>
    </v-data-table-virtual>
  </v-container>
</template>
<style>

</style>
