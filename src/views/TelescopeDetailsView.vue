<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router';
import { fetchApiCall } from '@/utils/api'

const route = useRoute();
const telescopeData = ref({})

async function loadTelescope(telescopeId) {
  const url = import.meta.env.VITE_HEROIC_API_URL + 'telescopes/' + telescopeId + '/';
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    telescopeData.value = data;
  }})
}

const formattedTelescopeData = computed(() => {
  return JSON.stringify(telescopeData.value, null, 4);
})

onMounted(async () => {
  loadTelescope(route.params.id);
})

</script>

<template>
  <v-container fluid>
    <h1>Telescope {{ route.params.id }} Data:</h1>
    <v-textarea
      :model-value="formattedTelescopeData"
      auto-grow
      readonly
      >
    </v-textarea>
  </v-container>
</template>
<style>

</style>
