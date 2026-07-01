<script setup>
import { ref, onMounted } from 'vue'
import { useFiltersStore } from '@/stores/filters'
import { fetchApiCall } from '@/utils/api'
import { watchDebounced } from '@vueuse/core'
import VisibilityAladin from '@/components/VisibilityAladin.vue'

const filtersStore = useFiltersStore()

const eventId = ref('');
const submittedEventId = ref('');
const loadingContour = ref(false);
const loadingSkymap = ref(false);
const skymapByTelescope = ref(null);
const contour = ref(null);
const eventIdError = ref('');
const skymapError = ref('');

async function fetchSkymap() {
  if (!filtersStore.isDateComplete) {
    skymapError.value = '';
    skymapError.value = 'Must specify a date range to view a visibility skymap.'
    return;
  }
  else if(filtersStore.queryParams.base.telescopes?.length != 1) {
    skymapError.value = '';
    skymapError.value = 'Must select a single telescope to view a visibility skymap.';
    return;
  }
  loadingSkymap.value = true;
  // Clear any previous error on retry
  skymapError.value = '';
  let url = import.meta.env.VITE_HEROIC_URL + 'api/visibility/skymap/';
  url += `?nside=32&start=${filtersStore.queryParams.base.start}&end=${filtersStore.queryParams.base.end}`;
  url += `&time_resolution=10&airmass=${filtersStore.queryParams.base.max_airmass}`
  if (filtersStore.queryParams.base.telescopes && filtersStore.queryParams.base.telescopes.length > 0) {
    filtersStore.queryParams.base.telescopes.forEach(telescope => {
      url += `&telescopes=${telescope}`;
    })
  }
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    skymapByTelescope.value = data;
    loadingSkymap.value = false;
  }, failCallback: (error, status) => {
    loadingSkymap.value = false;
    let message = error?.detail || error?.error || error?.message || (typeof error === 'string' ? error : '');
    if (!message && error && typeof error === 'object') {
      // Field-validation map, e.g. { start: ["This field is required."] }
      message = Object.entries(error).map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`).join(' | ');
    }
    skymapError.value = message || (status ? `Failed to load skymap (status ${status})` : 'Failed to load skymap');
  }})
}

onMounted(() => {
  fetchSkymap();
})

// Refetch the skymap whenever the date range or selected telescopes change
watchDebounced(() => [filtersStore.queryParams.base.start, filtersStore.queryParams.base.end, filtersStore.queryParams.base.max_airmass, filtersStore.queryParams.base.telescopes], () => {
  fetchSkymap();
}, { debounce: 500, deep: true })

async function viewContourMap() {
  if (!eventId.value) {
    return;
  }
  submittedEventId.value = eventId.value;
  // Clear any previously displayed contour and error before fetching the new one
  contour.value = null;
  eventIdError.value = '';
  loadingContour.value = true;
  const url = import.meta.env.VITE_TREASUREMAP_URL + `api/v1/gw_contour?graceid=${eventId.value}`;
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    contour.value = data;
    loadingContour.value = false;
  }, failCallback: (error, status) => {
    if (status === 404) {
      eventIdError.value = 'No event with that ID was found';
    }
    loadingContour.value = false;
  }})
}
</script>
<template>
  <v-container fluid>
    <v-alert
      v-if="skymapError"
      type="warning"
      closable
      class="mb-2"
      @click:close="skymapError = ''"
    >
      {{ skymapError }}
    </v-alert>
    <v-row no-gutters align="center" class="mb-3">
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="eventId"
          variant="outlined"
          label="GW Event ID"
          placeholder="e.g. S230518h"
          density="compact"
          hide-details="auto"
          clearable
          :error-messages="eventIdError"
          @update:model-value="eventIdError = ''"
          @keyup.enter="viewContourMap"
        ></v-text-field>
      </v-col>
      <v-col cols="auto" class="pl-2">
        <v-btn color="primary" :disabled="!eventId" @click="viewContourMap">
          View Contour Map
        </v-btn>
      </v-col>
    </v-row>
    <v-row no-gutters v-if="skymapByTelescope || submittedEventId">
      <v-col>
        <visibility-aladin
          :moc-heatmap="skymapByTelescope"
          :contour="contour"
          :loading="loadingContour || loadingSkymap"
        ></visibility-aladin>
      </v-col>
    </v-row>
  </v-container>
</template>
