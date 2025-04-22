<script setup>
import { ref, onMounted } from 'vue'
import WorldMap from "../components/WorldMap.vue";
import { fetchApiCall } from '@/utils/api'

// const telescopes = [
//   {
//     "id": "lco.tst.doma-1m0a",
//     "instruments": [
//       {
//         "id": "lco.tst.doma-1m0a.fa01",
//         "name": "First Instrument 01",
//         "available": true,
//         "telescope": "lco.tst.doma-1m0a",
//         "status": "SCHEDULABLE",
//         "optical_element_groups": {
//           "now": true
//         },
//         "operation_modes": {}
//       }
//     ],
//     "name": "COJ 1m telescope 1",
//     "aperture": 1.0,
//     "latitude": -31.272932,
//     "longitude": 149.070648,
//     "horizon": 15.0,
//     "positive_ha_limit": 4.6,
//     "negative_ha_limit": -4.6,
//     "zenith_blind_spot": 0.0,
//     "site": "lco.tst",
//     "status": "AVAILABLE"
//   },
//   {
//     "id": "lco.tst.doma-1m0b",
//     "instruments": [
//       {
//         "id": "lco.tst.doma-1m0b.fa02",
//         "name": "First Instrument 02",
//         "available": true,
//         "telescope": "lco.tst.doma-1m0b",
//         "status": "SCHEDULABLE",
//         "optical_element_groups": {
//           "now": true
//         },
//         "operation_modes": {}
//       }
//     ],
//     "name": "COJ 1m telescope 2",
//     "aperture": 1.0,
//     "latitude": -31.272931,
//     "longitude": 149.070647,
//     "horizon": 15.0,
//     "positive_ha_limit": 4.6,
//     "negative_ha_limit": -4.6,
//     "zenith_blind_spot": 0.0,
//     "site": "lco.tst",
//     "status": "UNAVAILABLE"
//   },
//   {
//     "id": "lco.tst2.doma-1m0a",
//     "instruments": [],
//     "name": "LSC  1m 1",
//     "aperture": 1.0,
//     "latitude": -30.1674472222,
//     "longitude": -70.8046805556,
//     "horizon": 15.0,
//     "positive_ha_limit": 4.6,
//     "negative_ha_limit": -4.6,
//     "zenith_blind_spot": 0.0,
//     "site": "lco.tst2"
//   }
// ]

const telescopes = ref([])

async function getTelescopes() {
  const url = import.meta.env.VITE_HEROIC_API_URL + 'telescopes' + '/?limit=1000';
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    telescopes.value = data.results;
  }})
}


onMounted(async () => {
  getTelescopes();
})

</script>

<template>
  <v-container fluid>
    <world-map
      :telescopes="telescopes"
    ></world-map>
  </v-container>
</template>
<style>

</style>