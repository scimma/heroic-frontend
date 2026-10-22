<script setup>
import { ref, computed, watch } from 'vue'
import { useFiltersStore } from '@/stores/filters'
import { useUserStore } from '@/stores/user'
import { fetchApiCall } from '@/utils/api'
import InstrumentSelect from '@/components/global/InstrumentSelect.vue'

const filtersStore = useFiltersStore()
const userStore = useUserStore()
const reductionLevel = ref('raw');
const mode = ref('all');
const instruments = ref(null);
const rowLimit = ref(2000);
const loadingArchive = ref(false);
const archiveSearches = ref(null);
const archiveErrors = ref({});
const frameSearch = ref('');

const reductionLevelOptions = [
  {title: 'Raw', value: 'raw'},
  {title: 'Processed', value: 'processed'},
]

const modeOptions = [
  {title: 'Imager', value: 'imaging'},
  {title: 'Spectrograph', value: 'spectroscopy'},
  {title: 'All', value: 'all'}
]

// Maps from frame id/filename and archive to an archive specific URL for that frame
const archiveFrameUrls = {
  lco: frame => frame.id && 'https://archive-api.lco.global/frames/' + frame.id + '/',
  noirlab: frame => frame.id && 'https://astroarchive.noirlab.edu/api/header/' + frame.id + '/',
  gemini: frame => frame.filename && 'https://archive.gemini.edu/searchform/' + frame.filename
}

const frameHeaders = [
  {title: 'Observation Date', align: 'start', sortable: true, key: 'observation_date', value: frame => frame.observation_date ? new Date(frame.observation_date).toISOString().slice(0, 19).replace('T', ' ') : ''},
  {title: 'Telescope', align: 'start', sortable: true, key: 'telescope'},
  {title: 'Instrument', align: 'start', sortable: true, key: 'instrument'},
  {title: 'Archive', align: 'start', sortable: true, key: 'archive'},
  {title: 'File', align: 'start', sortable: true, key: 'filename'},
  {title: 'Filter', align: 'start', sortable: true, key: 'filter'},
  {title: 'Target', align: 'start', sortable: true, key: 'target_name'},
  {title: 'RA', align: 'end', sortable: true, key: 'ra'},
  {title: 'Dec', align: 'end', sortable: true, key: 'dec'},
  {title: 'Proposal', align: 'start', sortable: true, key: 'proposal_id'},
  {title: 'Exposure (s)', align: 'end', sortable: true, key: 'exposure_time'}
]

function isArchiveInstrument(instrument, telescope) {
  // Instruments without supported modes have no archive searches, and selected telescopes limit the instruments that can be searched
  const telescopes = filtersStore.queryParams.base.telescopes;
  if (telescopes && telescopes.length > 0 && !telescopes.includes(telescope.id)) {
    return false;
  }
  if (mode.value == 'imaging') {
    return instrument.supported_modes.includes('imager');
  }
  if (mode.value == 'spectroscopy') {
    return instrument.supported_modes.includes('spectrograph');
  }
  return instrument.supported_modes.length > 0;
}

function searchDescription(search) {
  let description = search.archive + ' ' + search.mode;
  if (search.instruments.length <= 3) {
    description += ' (' + search.instruments.join(', ') + ')';
  }
  else {
    description += ' (' + search.instruments.length + ' instruments)';
  }
  return description;
}

// The archive searches by target name instead of position when given one, so only fall back to the name without a sidereal position
const archiveTarget = computed(() => {
  if (filtersStore.isSiderealTargetComplete) {
    return {ra: filtersStore.queryParams.siderealTarget.ra, dec: filtersStore.queryParams.siderealTarget.dec};
  }
  if (filtersStore.targetName) {
    return {target_name: filtersStore.targetName};
  }
  return null;
})

const queryWarnings = computed(() => {
  let warnings = [];
  if (!userStore.loggedIn) {
    warnings.push('Must be logged in to query the archives');
  }
  if (!filtersStore.isDateComplete) {
    warnings.push('Must set a date range in the filters');
  }
  if (!archiveTarget.value) {
    warnings.push('Must set a sidereal target position or a target name in the filters');
  }
  return warnings;
})

const archiveErrorMessages = computed(() => {
  return Object.entries(archiveErrors.value).map(([field, error]) => {
    const message = [].concat(error).join(' ');
    return (field == 'non_field_errors' || field == 'detail') ? message : field + ': ' + message;
  });
})

const archiveFrames = computed(() => {
  if (!archiveSearches.value) {
    return [];
  }

  return archiveSearches.value.flatMap((search, searchIndex) => search.frames.map((frame, frameIndex) => ({
    ...frame,
    key: searchIndex + '.' + frameIndex,
    archive: search.archive,
    archive_url: archiveFrameUrls[search.archive]?.(frame),
    match: search.match
  })));
})

const failedSearches = computed(() => {
  return archiveSearches.value ? archiveSearches.value.filter(search => search.error) : [];
})

const truncatedSearches = computed(() => {
  return archiveSearches.value ? archiveSearches.value.filter(search => search.truncated) : [];
})

async function queryArchive() {
  loadingArchive.value = true;
  archiveErrors.value = {};
  let queryPayload = {
    ...archiveTarget.value,
    start: filtersStore.queryParams.base.start,
    end: filtersStore.queryParams.base.end,
    mode: mode.value,
    reduction_level: reductionLevel.value,
    row_limit: rowLimit.value
  };
  if (filtersStore.queryParams.base.telescopes && filtersStore.queryParams.base.telescopes.length > 0) {
    queryPayload.telescopes = filtersStore.queryParams.base.telescopes;
  }
  if (instruments.value && instruments.value.length > 0) {
    queryPayload.instruments = instruments.value;
  }
  const url = import.meta.env.VITE_HEROIC_URL + 'api/archive/query/';
  await fetchApiCall({url: url, method: 'POST', credentials: 'include', body: queryPayload, successCallback: (data) => {
    archiveSearches.value = data.searches;
    loadingArchive.value = false;
  }, failCallback: (errors) => {
    archiveErrors.value = errors instanceof Error ? {detail: errors.message} : errors;
    archiveSearches.value = null;
    loadingArchive.value = false;
  }})
}

function downloadResults() {
  const blob = new Blob([JSON.stringify(archiveSearches.value, null, 2)], {type: 'application/json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'archive_results.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

// Drop selected instruments that can no longer be searched once the telescope filter or instrument type changes
watch([() => filtersStore.queryParams.base.telescopes, mode], () => {
  if (instruments.value) {
    const remaining = instruments.value.filter(id => isArchiveInstrument(filtersStore.getInstrument(id), filtersStore.getTelescopeForInstrument(id)));
    instruments.value = remaining.length > 0 ? remaining : null;
  }
}, { deep: true })

</script>
<template>
  <v-container fluid class="archive-container">
    <v-alert v-if="queryWarnings.length" class="flex-0-0 mb-2" type="warning" density="compact">
      <div v-for="warning in queryWarnings" :key="warning">{{ warning }}</div>
    </v-alert>
    <v-row class="flex-grow-0 mb-1" dense>
      <v-col cols="10">
        <instrument-select class="w-100" v-model="instruments" :instrument-filter="isArchiveInstrument" placeholder="All Instruments" persistent-placeholder hide-details></instrument-select>
      </v-col>
      <v-col cols="2">
        <v-number-input
          label="Row Limit"
          variant="outlined"
          control-variant="stacked"
          v-model="rowLimit"
          v-tooltip:top="'Maximum number of frames returned by each archive search'"
          :min="1"
          :max="10000"
          :step="100"
          hide-details
        >
        </v-number-input>
      </v-col>
    </v-row>
    <v-row class="flex-grow-0" dense align="center">
      <v-col cols="2">
        <v-select label="Reduction Level" variant="outlined" v-model="reductionLevel" :items="reductionLevelOptions" hide-details></v-select>
      </v-col>
      <v-col cols="2">
        <v-select label="Instrument Type" variant="outlined" v-model="mode" :items="modeOptions" hide-details></v-select>
      </v-col>
      <v-col class="query-col d-flex align-center">
        <v-btn class="flex-shrink-0" color="primary" size="large" prepend-icon="mdi-archive-search-outline" :disabled="queryWarnings.length > 0" :loading="loadingArchive" @click="queryArchive">Query Archives</v-btn>
        <p v-if="archiveTarget" class="text-caption text-medium-emphasis text-truncate ml-2">
          <span v-if="archiveTarget.target_name">By target name: {{ archiveTarget.target_name }}</span>
          <span v-else>By position: {{ archiveTarget.ra }}, {{ archiveTarget.dec }}</span>
        </p>
      </v-col>
    </v-row>
    <v-alert v-if="archiveErrorMessages.length" class="mb-2" type="error" density="compact">
      <div v-for="message in archiveErrorMessages" :key="message">{{ message }}</div>
    </v-alert>
    <div v-if="archiveSearches" class="d-flex align-center mb-1">
      <span class="text-medium-emphasis">{{ archiveFrames.length }} frames from {{ archiveSearches.length }} archive searches.</span>
      <v-menu v-if="failedSearches.length" location="bottom start" :close-on-content-click="false" persistent no-click-animation>
        <template v-slot:activator="{ props }">
          <a class="ml-3 text-warning cursor-pointer" v-bind="props">
            <v-icon class="pb-1" icon="mdi-alert" size="small"></v-icon>
            {{ failedSearches.length }} Archive {{ failedSearches.length == 1 ? 'search' : 'searches' }} failed
          </a>
        </template>
        <v-card title="Failed archive searches" density="compact" max-width="700" border="warning md opacity-100">
          <v-card-text>
            <ul class="pl-4">
              <li v-for="search in failedSearches" :key="searchDescription(search)">{{ searchDescription(search) }}: {{ search.error }}</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-menu>
      <v-menu v-if="truncatedSearches.length" location="bottom start" :close-on-content-click="false" persistent no-click-animation>
        <template v-slot:activator="{ props }">
          <a class="ml-3 text-info cursor-pointer" v-bind="props">
            <v-icon class="pb-1" icon="mdi-information" size="small"></v-icon>
            {{ truncatedSearches.length }} Archive {{ truncatedSearches.length == 1 ? 'search' : 'searches' }} reached the row limit
          </a>
        </template>
        <v-card title="Archive searches with more frames than the row limit" density="compact" max-width="700" border="info md opacity-100">
          <v-card-text>
            <ul class="pl-4">
              <li v-for="search in truncatedSearches" :key="searchDescription(search)">{{ searchDescription(search) }}</li>
            </ul>
          </v-card-text>
        </v-card>
      </v-menu>
      <v-btn
        class="ml-auto mr-2"
        variant="outlined"
        icon="mdi-download"
        v-tooltip:top="'Download API Results'"
        @click="downloadResults"
      ></v-btn>
      <v-text-field
        style="max-width: 300px;"
        label="Filter results"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        v-model="frameSearch"
        hide-details
        clearable
      >
      </v-text-field>
    </div>
    <v-data-table-virtual
      class="archive-table mt-2"
      height="100%"
      :headers="frameHeaders"
      :items="archiveFrames"
      :search="frameSearch"
      item-value="key"
      :sort-by="[{key: 'observation_date', order: 'desc'}]"
      :loading="loadingArchive"
      loading-text="Querying archives..."
      :no-data-text="archiveSearches ? 'No frames found' : 'Set the filters and press Query Archives to search for frames'"
      density="compact"
      fixed-header
      hover
    >
      <template #item.telescope="{ item }">
        <router-link v-if="item.telescope && item.telescope.split('.').length == 3" :to="{ name: 'telescopeDetail', params: { id: item.telescope } }" v-tooltip:top="item.telescope">{{ item.telescope.slice(item.telescope.indexOf('.') + 1) }}</router-link>
        <span v-else>{{ item.telescope }}</span>
      </template>
      <template #item.instrument="{ item }">
        <router-link v-if="item.instrument && item.instrument.split('.').length == 4" :to="{ name: 'instrumentDetail', params: { id: item.instrument } }" v-tooltip:top="item.instrument">{{ item.instrument.slice(item.instrument.lastIndexOf('.') + 1) }}</router-link>
        <span v-else>{{ item.instrument }}</span>
      </template>
      <template #item.ra="{ item }">
        <span v-if="item.ra != null" v-tooltip:top="String(item.ra)">{{ Number(item.ra).toFixed(5) }}</span>
      </template>
      <template #item.dec="{ item }">
        <span v-if="item.dec != null" v-tooltip:top="String(item.dec)">{{ Number(item.dec).toFixed(5) }}</span>
      </template>
      <template #item.archive="{ item }">
        <a v-if="item.archive_url" :href="item.archive_url" target="_blank" rel="noopener noreferrer">{{ item.archive }}</a>
        <span v-else>{{ item.archive }}</span>
      </template>
      <template #item.filename="{ item }">
        <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.filename || 'Download' }}</a>
        <span v-else>{{ item.filename }}</span>
      </template>
    </v-data-table-virtual>
  </v-container>
</template>
<style scoped>
.archive-container {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - var(--v-layout-top) - var(--acknowledgements-height));
}

.query-col {
  min-width: 0;
}

.archive-table {
  flex: 1;
  min-height: 0;
}
</style>
