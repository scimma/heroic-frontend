<script setup>
import { onMounted } from 'vue';
import NavBar from './components/global/NavBar.vue'
import GlobalFilters from './components/global/GlobalFilters.vue';
import { fetchApiCall } from '@/utils/api'
import { useFiltersStore } from '@/stores/filters'


const filtersStore = useFiltersStore()


onMounted(async () => {
  // Fetch the telescope options from the API to populate the telescope select field
  const url = import.meta.env.VITE_HEROIC_API_URL + 'observatories' + '/?limit=1000';
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    let telescopes = {};
    data.results.forEach(observatory => {
      observatory.sites.forEach(site => {
        site.telescopes.forEach(telescope => {
          telescopes[telescope.id] = telescope;
          telescopes[telescope.id]['observatory_name'] = observatory.name;
          telescopes[telescope.id]['site_name'] = site.name;
          telescopes[telescope.id]['weather_url'] = site.weather_url;
          telescopes[telescope.id]['elevation'] = site.elevation;
          telescopes[telescope.id]['timezone'] = site.timezone;
        })
      })
    })
    filtersStore.telescopes = telescopes;
    filtersStore.filteredTelescopes = Object.values(telescopes);
  }})
})

</script>

<template>
  <v-app>
    <nav-bar />
    <global-filters />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped>

</style>
