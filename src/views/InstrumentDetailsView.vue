<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router';
import { useFiltersStore } from '@/stores/filters'


const filtersStore = useFiltersStore()

const route = useRoute();

const instrumentData = computed(() => {
  if (filtersStore.telescopes) {
    return filtersStore.getInstrument(route.params.id);
  }
  return {};
})

const telescopeData = computed(() => {
  if (filtersStore.telescopes) {
    return filtersStore.getTelescopeForInstrument(route.params.id) || {};
  }
  return {};
})

</script>

<template>
  <v-container fluid>
    <h4 class="label-text ml-2" style="margin-bottom:-6px;" v-if="telescopeData">
      {{ telescopeData.observatory_name }} > {{ telescopeData.site_name }} >
      <router-link :to="{name: 'telescopeDetail', params: {id: telescopeData.id}}">{{ telescopeData.name }}</router-link>
    </h4>
    <h1>
      {{ instrumentData.name }}
      <v-btn v-if="instrumentData.instrument_url" color="blue-darken-2" icon="mdi-open-in-new" variant="text" v-tooltip="instrumentData.instrument_url" :href="instrumentData.instrument_url" target="_blank"></v-btn>
    </h1>
    <v-divider thickness="3"></v-divider>
    <v-row>
      <v-col cols="9" class="large-text">
        <v-row class="mt-2 ml-2">
          <p class="label-text">Status: </p>
          <b class="ml-2">{{ instrumentData.status }}</b>
        </v-row>
      </v-col>
    </v-row>
    <v-row class="mt-5 ml-2" v-if="filtersStore.telescopes">
      <v-table style="width:1150px;">
        <thead>
          <tr>
            <th class="text-left" style="width: 16%;">Optical Element Type</th>
            <th class="text-left border-left">Elements</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="oe_type in Object.keys(instrumentData.optical_element_groups)"
            :key="oe_type"
          >
            <td>{{ oe_type }}</td>
            <td class="border-left">{{ instrumentData.optical_element_groups[oe_type].options.map(obj => obj.name).join(', ') }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-row>
    <v-row class="mt-7 ml-2" v-if="filtersStore.telescopes">
      <v-table style="width:1150px;">
        <thead>
          <tr>
            <th class="text-left" style="width: 16%;">Operation Mode</th>
            <th class="text-left border-left">Options</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="mode in Object.keys(instrumentData.operation_modes)"
            :key="mode"
          >
            <td>{{ mode }}</td>
            <td class="border-left">{{ instrumentData.operation_modes[mode].options.map(obj => obj.name).join(', ') }}</td>
          </tr>
        </tbody>
      </v-table>
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
