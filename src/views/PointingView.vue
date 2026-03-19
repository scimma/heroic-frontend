<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useFiltersStore } from '@/stores/filters'
import { fetchApiCall } from '@/utils/api'
import Aladin from '@/components/Aladin.vue'
import { watchDebounced } from '@vueuse/core';

const filtersStore = useFiltersStore()
const tableId = ref(0);
const loadingPointings = ref(true);
const pointingResults = ref([]);
const pointingsPerPage = ref(100);
const totalPointings = ref(0);
const selectedIds = ref([]);
const currentDateSort = ref('desc')
const sortOrder = ref([
  {key: 'date', order:'desc'}
])

const pointingHeaders = ref([
  {title: 'Date', align: 'start', sortable: true, key: 'date', value: 'date'},
  {title: 'Telescope', align: 'start', sortable: true, key: 'telescope', value: 'telescope'},
  {title: 'Instrument', align: 'start', sortable: true, key: 'instrument', value: 'instrument'},
  {title: 'Center RA', align: 'end', sortable: false, key: 'ra'},
  {title: 'Center Dec', align: 'end', sortable: false, key: 'dec'}
])

onMounted(async () => {
  if (filtersStore.isDateComplete || filtersStore.isSiderealTargetComplete) {
    await loadPointings({page:1, itemsPerPage:pointingsPerPage.value, sortBy:[{key: 'date', order: 'desc'}]})
  }
})

async function loadPointings({page, itemsPerPage, sortBy}) {
  loadingPointings.value = true;
  const offset = itemsPerPage * (page - 1);
  // Fetch the telescope options from the API to populate the telescope select field
  let url = import.meta.env.VITE_HEROIC_URL + 'api/telescope-pointings' + `/?limit=${itemsPerPage}&offset=${offset}`;
  if (filtersStore.isSiderealTargetComplete) {
    url += `&field_search=${filtersStore.queryParams.siderealTarget.ra},${filtersStore.queryParams.siderealTarget.dec}`;
  }
  if (filtersStore.isDateComplete) {
    url += `&start=${filtersStore.queryParams.base.start}&end=${filtersStore.queryParams.base.end}`;
  }
  if (filtersStore.queryParams.base.telescopes && filtersStore.queryParams.base.telescopes.length > 0) {
    filtersStore.queryParams.base.telescopes.forEach(telescope => {
      url += `&telescope=${telescope}`;
    })
  }
  if (sortBy.length > 0) {
    let order = '';
    if (sortBy[0].order === 'desc') {
      order += '-';
    }
    order += sortBy[0].key;
    if (sortBy[0].key != 'date') {
      // Add on a secondary sort order by -date (default) for other sorts
      order += ',-date';
      currentDateSort.value = 'desc';
    }
    else {
      currentDateSort.value = sortBy[0].order;
    }
    url += `&ordering=${order}`;
  }
  else {
    currentDateSort.value = 'desc';
  }
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    totalPointings.value = data.count;
    pointingResults.value = data.results;
    loadingPointings.value = false;
  }})
}


function generateTelescopeLink(item) {
  var detailPage = 'telescopeDetail';
  return { name: detailPage, params: { id: item.telescope } };
}

function generateInstrumentLink(item) {
  var detailPage = 'instrumentDetail';
  return { name: detailPage, params: { id: item.instrument } };
}

function isoToDateString(isoDate) {
  let date = new Date(isoDate);
  return date.toUTCString();
}

const selectRow = (event, { item }) => {
  const id = item.id;
  let index = selectedIds.value.indexOf(id);
  if (index != -1) {
    selectedIds.value.splice(index, 1);
  }
  else if(event.ctrlKey) {
    selectedIds.value.push(id);
  }
  else {
    selectedIds.value = [id];
  }
}

const tableRowProps = ({ item }) => {
  if (selectedIds.value.includes(item.id)) {
    return { class: 'selected-row' };
  }
  return { class: '' };
}

function forceTableRefresh() {
  nextTick(() => {
    tableId.value += 1;
  })
}

// Watch for changes to target and date range to trigger getting pointings from API
watchDebounced(() => [filtersStore.queryParams.base.start, filtersStore.queryParams.base.end], async () => {
  if (filtersStore.isDateComplete) {
    loadPointings({page:1, itemsPerPage:pointingsPerPage.value, sortBy:[{key: 'date', order: 'desc'}]});
  }
}, { debounce: 500})

watchDebounced(() => [filtersStore.queryParams.siderealTarget.ra, filtersStore.queryParams.siderealTarget.dec], async () => {
  if (filtersStore.isSiderealTargetComplete) {
    loadPointings({page:1, itemsPerPage:pointingsPerPage.value, sortBy:[{key: 'date', order: 'desc'}]});
  }
}, { debounce: 500})

watchDebounced(() => filtersStore.queryParams.base.telescopes, async (newItems, oldItems) => {
  if (filtersStore.isDateComplete || filtersStore.isSiderealTargetComplete) {
    if ((newItems && newItems.length > 0) || (oldItems && oldItems.length > 0)) {
      loadPointings({page:1, itemsPerPage:pointingsPerPage.value, sortBy:[{key: 'date', order: 'desc'}]});
    }
  }
}, { debounce: 500})

</script>
<template>
  <v-container fluid>
    <v-row no-gutters v-if="!filtersStore.isDateComplete && !filtersStore.isSiderealTargetComplete">
      <v-alert type="warning">Must set a sidereal target or date range to see pointing data</v-alert>
    </v-row>
    <v-row no-gutters v-else-if="!filtersStore.isTargetComplete">
      <h1>Pointing data in date range</h1>
    </v-row>
    <v-row no-gutters v-else>
      <v-col>
        <div class="pointing-container">
          <aladin :pointings="pointingResults" :loading="loadingPointings" v-model="selectedIds" :date-order="currentDateSort" @refreshTable="forceTableRefresh"></aladin>
          <v-data-table-server
            class="pointing-table"
            :headers="pointingHeaders"
            :items="pointingResults"
            :id="tableId"
            item-key="id"
            :items-length="totalPointings"
            :loading="loadingPointings"
            :sort-by="sortOrder"
            initial-sort-order='desc'
            must-sort
            hover
            :items-per-page-options="[10, 25, 100, 1000]"
            v-model:items-per-page="pointingsPerPage"
            :row-props="tableRowProps"
            @click:row="selectRow"
            @update:options="loadPointings"
          >
            <template #item.date="{ item }">
              {{ isoToDateString(item.date) }}
            </template>
            <template #item.telescope="{ item }">
              <router-link :to="generateTelescopeLink(item)">{{ item.telescope }}</router-link>
            </template>
            <template #item.instrument="{ item }">
              <router-link :to="generateInstrumentLink(item)">{{ item.instrument }}</router-link>
            </template>
          </v-data-table-server>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>
<style>
.selected-row {
  background-color: rgb(28, 68, 91);
}

.pointing-container {
  display: flex;
  flex-direction: column;
  height: 87vh;
}

.pointing-table {
  overflow-y: auto;
  flex: 1;
  margin-top: 2px;
}
</style>
