<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router';
import { fetchApiCall } from '@/utils/api'

const route = useRoute();
const instrumentData = ref({})

async function loadInstrument(instrumentId) {
  const url = import.meta.env.VITE_HEROIC_API_URL + 'instruments/' + instrumentId + '/';
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    instrumentData.value = data;
  }})
}

const formattedInstrumentData = computed(() => {
  return JSON.stringify(instrumentData.value, null, 4);
})

onMounted(async () => {
  loadInstrument(route.params.id);
})

</script>

<template>
  <v-container fluid>
    <h1>Instrument {{ route.params.id }} Data:</h1>
    <v-textarea
      :model-value="formattedInstrumentData"
      auto-grow
      readonly
      >
    </v-textarea>
  </v-container>
</template>
<style>

</style>
