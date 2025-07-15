<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router';
import { useFiltersStore } from '@/stores/filters'
import TelescopeStatusTimeline from '@/components/TelescopeStatusTimeline.vue'

const filtersStore = useFiltersStore()

const route = useRoute();

const telescopeData = computed(() => {
  if (filtersStore.telescopes) {
    return filtersStore.telescopes[route.params.id] || {};
  }
  return {};
})

const observatorySiteLabel = computed(() => {
  return telescopeData.value ? telescopeData.value.observatory_name + ' > ' + telescopeData.value.site_name : '';
})

const currentTwilight = computed(() => {
  if (telescopeData.value && telescopeData.value.next_twilight && telescopeData.value.next_twilight.length > 1) {
    return telescopeData.value.next_twilight[0];
  }
  return null;
})

const nextTwilight = computed(() => {
  if (telescopeData.value && telescopeData.value.next_twilight) {
    if (telescopeData.value.next_twilight.length > 1) {
      return telescopeData.value.next_twilight[1];
    }
    return telescopeData.value.next_twilight[0];
  }
  return null;
})

function generateItemLink(item) {
  var detailPage = 'instrumentDetail';
  return { name: detailPage, params: { id: item.id } };
}

</script>

<template>
  <v-container fluid>
    <h4 class="label-text ml-2" style="margin-bottom:-6px;">
      {{ observatorySiteLabel }}
      <v-btn v-if="telescopeData.weather_url" color="blue-darken-2" icon="mdi-weather-cloudy-arrow-right" variant="text" v-tooltip="telescopeData.weather_url" :href="telescopeData.weather_url" target="_blank"></v-btn>
    </h4>
    <h1>
      {{ telescopeData.name }}
      <v-btn v-if="telescopeData.telescope_url" color="blue-darken-2" icon="mdi-open-in-new" variant="text" v-tooltip="telescopeData.telescope_url" :href="telescopeData.telescope_url" target="_blank"></v-btn>
    </h1>
    <v-divider thickness="3"></v-divider>
    <v-row>
      <v-col cols="9" class="large-text">
        <v-row class="mt-2 ml-2">
          <p class="label-text">Latitude: </p>
          <b class="ml-2">{{ telescopeData.latitude }}</b>
        </v-row>
        <v-row class="mt-2 ml-2">
          <p class="label-text">Longitude: </p>
          <b class="ml-2">{{ telescopeData.longitude }}</b>
        </v-row>
        <v-row class="mt-2 ml-2">
          <p class="label-text">Aperture: </p>
          <b class="ml-2">{{ telescopeData.aperture }} meters</b>
        </v-row>
        <v-row class="mt-2 ml-2">
          <p class="label-text">Current Status: </p>
          <b class="ml-2">{{ telescopeData.status }}</b>
        </v-row>
        <v-row class="mt-2 ml-2" v-if="currentTwilight">
          <p class="label-text">Current Twilight: </p>
          <b class="ml-2">Now to {{ new Date(currentTwilight[1]).toGMTString() }}</b>
        </v-row>
        <v-row class="mt-2 ml-2" v-if="nextTwilight">
          <p class="label-text">Next Twilight: </p>
          <b class="ml-2">{{ new Date(nextTwilight[0]).toGMTString() }} to {{ new Date(nextTwilight[1]).toGMTString() }}</b>
        </v-row>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-row class="mt-2 ml-2">
          <v-table style="width:1150px;">
            <thead>
              <tr>
                <th class="text-left">Instruments</th>
                <th class="text-left border-left">Status</th>
                <th class="text-left border-left">Optical Element Types</th>
                <th class="text-left border-left">Operation Modes</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="inst in telescopeData.instruments"
                :key="inst.id"
              >
                <td><router-link :to="generateItemLink(inst)">{{ inst.name }}</router-link></td>
                <td class="border-left">{{ inst.status }}</td>
                <td class="border-left">{{ Object.keys(inst.optical_element_groups).join(', ') }}</td>
                <td class="border-left">{{ Object.keys(inst.operation_modes).join(', ') }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-row>
      </v-col>
    </v-row>
    <v-row>
      <telescope-status-timeline
        :telescope="route.params.id"
        class="pt-4 pl-4"
      ></telescope-status-timeline>
    </v-row>
  </v-container>
</template>
<style scoped>
.border-left {
  border-left: 1px solid dimgray;
}

.large-text {
  font-size: 1.4rem;
  color: lightgray;
}

.label-text {
  color: darkgray;
}

</style>
