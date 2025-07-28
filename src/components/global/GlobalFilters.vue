<script setup>
import { ref, computed } from 'vue'
import DatePicker from '@vuepic/vue-datepicker';
import { useFiltersStore } from '@/stores/filters'
import { fetchApiCall } from '@/utils/api'
import TelescopeSelect from './TelescopeSelect.vue'
import { watchDebounced } from '@vueuse/core';

const drawer = ref(true)
const rail = ref(true)
const searchTargetErrors = ref();
const searchTargetSuccess = ref();
const filtersStore = useFiltersStore()
const minorPlanetFields = ['epoch_of_elements', 'orbital_inclination', 'longitude_of_ascending_node', 'argument_of_perihelion', 'mean_distance', 'eccentricity', 'mean_anomaly']
const cometFields = ['epoch_of_elements', 'orbital_inclination', 'longitude_of_ascending_node', 'argument_of_perihelion', 'perihelion_distance', 'eccentricity', 'epoch_of_perihelion']
const majorPlanetFields = ['epoch_of_elements', 'orbital_inclination', 'longitude_of_ascending_node', 'argument_of_perihelion', 'mean_distance', 'eccentricity', 'mean_anomaly', 'daily_motion']

function setDateRange(offset_start, offset_end) {
  filtersStore.queryParams.base.start = new Date(Date.now() + (3600 * 1000 * 24 * offset_start)).toISOString();
  filtersStore.queryParams.base.end = new Date(Date.now() + (3600 * 1000 * 24 * offset_end)).toISOString();
}

function jdToMjd(jd) {
  return jd - 2400000.5;
}

function fillInTarget(targetData) {
  filtersStore.queryParams.siderealTarget.ra = targetData.ra_d || targetData.ra || null
  filtersStore.queryParams.siderealTarget.dec = targetData.dec_c || targetData.dec || null
  filtersStore.queryParams.siderealTarget.proper_motion_ra = targetData.pmra || null
  filtersStore.queryParams.siderealTarget.proper_motion_dec = targetData.pmdec || null
  filtersStore.queryParams.siderealTarget.parallax = targetData.plx_value || null
  filtersStore.queryParams.nonSiderealTarget.epoch_of_elements = targetData.epoch_jd ? jdToMjd(targetData.epoch_jd) : null;
  filtersStore.queryParams.nonSiderealTarget.longitude_of_ascending_node = targetData.ascending_node || null;
  filtersStore.queryParams.nonSiderealTarget.orbital_inclination = targetData.inclination || null;
  filtersStore.queryParams.nonSiderealTarget.argument_of_perihelion = targetData.argument_of_perihelion || null;
  filtersStore.queryParams.nonSiderealTarget.eccentricity = targetData.eccentricity || null;
  filtersStore.queryParams.nonSiderealTarget.mean_distance = targetData.semimajor_axis || null;
  filtersStore.queryParams.nonSiderealTarget.mean_anomaly = targetData.mean_anomaly || null;
  filtersStore.queryParams.nonSiderealTarget.daily_motion = targetData.mean_daily_motion || null;
  filtersStore.queryParams.nonSiderealTarget.perihelion_distance = targetData.perihelion_distance || null;
  filtersStore.queryParams.nonSiderealTarget.epoch_of_perihelion = targetData.perihelion_date_jd ? jdToMjd(targetData.perihelion_date_jd) : null;
}

function clearTargetErrors() {
  searchTargetErrors.value = null;
  searchTargetSuccess.value = undefined;
}

function onChangeTargetType() {
  // Reset the target fields to null and remove any target from the search bar when switching target types
  filtersStore.targetName = null;
  if(filtersStore.targetType == 'SIDEREAL') {
    filtersStore.nonSiderealType = null;
  }
  else {
    filtersStore.nonSiderealType = 'MPC_MINOR_PLANET';
  }
  clearTargetErrors();
  fillInTarget({});
}

async function callSearchTarget () {
  // search for target parameters from simbad2k service and prefill the fields if found
  searchTargetErrors.value = null;
  let url = import.meta.env.VITE_SIMBAD2K_API_URL + filtersStore.targetName + '?target_type=' + filtersStore.targetType;
  if (filtersStore.targetType == 'NON_SIDEREAL') {
    url = url + '&scheme=' + filtersStore.nonSiderealType;
  }
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    fillInTarget(data);
    if (data.error) {
      // In this case, the API has not found a result, so inform the user of that
      searchTargetErrors.value = data.error;
    }
    else {
      searchTargetSuccess.value = 'Found target:' + data.name;
    }
  }, failCallback: (response) => {
    let error = response.error || response;
    searchTargetErrors.value = error;
    console.error('Failed to get target details for ' + searchTarget.value + ' from simbad2k: ' + error);
  }})
}

const dateString = computed(() => {
  var ds = '';
  if (filtersStore.queryParams.base.start) {
    ds += filtersStore.queryParams.base.start.split('.')[0].replace('T', ' ');
  }
  ds += ' - ';
  if (filtersStore.queryParams.base.end) {
    ds += filtersStore.queryParams.base.end.split('.')[0].replace('T', ' ');
  }
  return ds;
})

const dateClass = computed(() => {
  if (filtersStore.queryParams.base.start && filtersStore.queryParams.base.end) {
    return 'fields-complete';
  }
  return 'fields-error';
})

const targetString = computed(() => {
  var ts = '';
  if (targetClass.value == 'fields-error') {
    ts += 'No target specified';
  }
  else{
    if (filtersStore.targetName && searchTargetSuccess.value) {
      ts += filtersStore.targetName + ': ';
    }
    if (filtersStore.targetType == 'SIDEREAL'){
      ts += filtersStore.queryParams.siderealTarget.ra + ' ra, ' + filtersStore.queryParams.siderealTarget.dec + ' dec';
    }
    else {
      ts += filtersStore.nonSiderealType;
    }
  }
  return ts;
})

const targetClass = computed(() => {
  if (filtersStore.targetType == 'SIDEREAL'){
    if (filtersStore.queryParams.siderealTarget.ra && filtersStore.queryParams.siderealTarget.dec) {
      return 'fields-complete';
    }
  }
  else{
    var fields = [];
    if (filtersStore.nonSiderealType == 'MPC_MINOR_PLANET') {
      fields = minorPlanetFields;
    }
    else if (filtersStore.nonSiderealType == 'MPC_COMET') {
      fields = cometFields;
    }
    else if (filtersStore.nonSiderealType == 'JPL_MAJOR_PLANET'){
      fields = majorPlanetFields;
    }
    if (fields.every(field => filtersStore.queryParams.nonSiderealTarget[field] != null)) {
      return 'fields-complete';
    }
  }
  return 'fields-error';
})

const constraintsString = computed(() => {
  var cs = '';
  if (filtersStore.queryParams.base.max_airmass){
    cs += filtersStore.queryParams.base.max_airmass.toFixed(1) + ' airmass; ';
  }
  if (filtersStore.queryParams.base.max_lunar_phase){
    cs += filtersStore.queryParams.base.max_lunar_phase.toFixed(1);
  }
  if (filtersStore.queryParams.base.min_lunar_distance != 0) {
    cs += ' / ' + filtersStore.queryParams.base.min_lunar_distance.toFixed(1);
  }
  cs += ' lunar phase'
  if (filtersStore.queryParams.base.min_lunar_distance != 0) {
    cs += ' / distance';
  }
  return cs;
})

const telescopesString = computed(() => {
  if (filtersStore.queryParams.base.telescopes == null || filtersStore.queryParams.base.telescopes.length == 0){
    return 'All Telescopes';
  }
  else {
    return filtersStore.queryParams.base.telescopes.length.toString() + ' / ' + Object.keys(filtersStore.telescopes).length.toString() + ' Telescopes selected';
  }
})

// Watch for changes and trigger visibility queries
watchDebounced(() => filtersStore.$state.queryParams, () => {
  if (dateClass.value == 'fields-complete' && targetClass.value == 'fields-complete') {
    filtersStore.queryVisibilityAndAirmass();
  }
}, { debounce: 500, deep: true, immediate: true })


</script>

<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    :location="$vuetify.display.mobile ? 'bottom' : undefined"
    width="512"
    permanent
    @click="rail = false"
  >
    <v-list-item variant="outlined" nav>
      <v-list-item-title>
        <v-row>
          <v-col cols="3" style="font-size:1.2rem;">Filters</v-col>
          <v-col cols="3" offset="1" style="min-height: 44px;" v-if="!rail">
            Visibility:
            <v-progress-circular v-if="filtersStore.loadingVisibility" class="ml-1" color="primary" size="18" indeterminate></v-progress-circular>
            <v-icon v-else-if="filtersStore.visibilityResults" color="green-darken-2" icon="mdi-checkbox-outline" size="18"></v-icon>
            <v-icon v-else-if="Object.keys(filtersStore.visibilityErrors).length" color="red-darken-2" icon="mdi-close-box-outline" size="18" v-tooltip="JSON.stringify(filtersStore.visibilityErrors)"></v-icon>
            <v-icon v-else icon="mdi-checkbox-blank-outline" size="18"></v-icon>
          </v-col>
          <v-col cols="3" offset="1" style="min-height: 44px;" v-if="!rail">
            Airmass:
            <v-progress-circular v-if="filtersStore.loadingAirmass" class="ml-1" color="primary" size="18" indeterminate></v-progress-circular>
            <v-icon v-else-if="filtersStore.airmassResults" color="green-darken-2" icon="mdi-checkbox-outline" size="18"></v-icon>
            <v-icon v-else-if="Object.keys(filtersStore.airmassErrors).length" color="red-darken-2" icon="mdi-close-box-outline" size="18" v-tooltip="JSON.stringify(filtersStore.airmassErrors)"></v-icon>
            <v-icon v-else icon="mdi-checkbox-blank-outline" size="18"></v-icon>
          </v-col>
        </v-row>
      </v-list-item-title>
      <template v-slot:append>
        <v-btn
          class="menu-chevron"
          :icon="rail ? 'mdi-chevron-right': 'mdi-chevron-left'"
          variant="text"
          @click.stop="rail = !rail"
        ></v-btn>
      </template>
    </v-list-item>
    <v-expansion-panels v-if="!rail">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-row>
            <v-col cols="3">
              <p>Date Range:</p>
            </v-col>
            <v-col cols="9" v-if="filtersStore.queryParams.base.start || filtersStore.queryParams.base.end">
              <p :class="dateClass">{{ dateString }}</p>
            </v-col>
          </v-row>
        </v-expansion-panel-title>
        <v-expansion-panel-text class="filter-panel">
          <v-btn-group class="mt-2" variant="outlined" divided>
            <v-btn value="plus1day" @click="setDateRange(0, 1)">Next Day</v-btn>
            <v-btn value="plus7day" @click="setDateRange(0, 7)">Next Week</v-btn>
            <v-btn value="last1day" @click="setDateRange(-1, 0)">Past Day</v-btn>
            <v-btn value="last7day" @click="setDateRange(-7, 0)">Past Week</v-btn>
          </v-btn-group>
          <div class="datepicker-group mt-3">
            <v-label v-if="filtersStore.queryParams.base.start" id="start-dp-label" class="datepicker-label">Start Date</v-label> 
            <DatePicker v-model="filtersStore.queryParams.base.start" id="start-dt-picker" model-type="iso" placeholder="Start Date" label="Start" required dark></DatePicker>
          </div>
          <div class="datepicker-group mt-3">
            <v-label v-if="filtersStore.queryParams.base.end" id="end-dp-label" class="datepicker-label">End Date</v-label> 
            <DatePicker v-model="filtersStore.queryParams.base.end" model-type="iso" placeholder="End Date" required dark></DatePicker>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-row>
            <v-col cols="3">
              <p>Target:</p>
            </v-col>
            <v-col cols="9">
              <p :class="targetClass">{{ targetString }}</p>
            </v-col>
          </v-row>
        </v-expansion-panel-title>
        <v-expansion-panel-text class="filter-panel">
          <v-row>
            <v-col class="pr-0 pl-0" cols="6">
              <v-btn-toggle class="mt-4" v-model="filtersStore.targetType" color="deep-purple-accent-4" density="compact" rounded="0" group mandatory style="height:66px;" @update:modelValue="onChangeTargetType">
                <v-btn value="SIDEREAL">Sidereal</v-btn>
                <v-btn value="NON_SIDEREAL">Non-Sidereal</v-btn>
              </v-btn-toggle>
            </v-col>
            <v-col class="pr-0 pl-0" cols="6">
              <v-btn-toggle class="mt-4 button-stack" :disabled="filtersStore.targetType=='SIDEREAL'" v-model="filtersStore.nonSiderealType" color="deep-purple-accent-4" rounded="0" group>
                <v-btn value="MPC_MINOR_PLANET" size="large">MPC Minor Planet</v-btn>
                <v-btn value="MPC_COMET" size="large">MPC Comet</v-btn>
                <v-btn value="JPL_MAJOR_PLANET" size="large">JPL Major Planet</v-btn>
              </v-btn-toggle>
            </v-col>
          </v-row>
          <v-text-field
            class="mt-4"
            variant="outlined"
            label="Prefill Target"
            v-model="filtersStore.targetName"
            :error-messages="searchTargetErrors"
            :base-color="searchTargetSuccess ? 'success': undefined"
            :color="searchTargetSuccess ? 'success': undefined"
            :messages="searchTargetSuccess"
            @input="clearTargetErrors"
          >
            <template v-slot:append-inner>
              <v-btn :disabled="!filtersStore.targetName" @click="callSearchTarget">Search</v-btn>
            </template>
          </v-text-field>
          <div v-if="filtersStore.targetType=='SIDEREAL'" class="mt-4">
            <v-number-input
              label="Right Ascension (decimal degrees)"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.siderealTarget.ra"
              :min="0"
              :max="360"
              :precision="9"
              :error-messages="filtersStore.visibilityErrors.ra"
            >
            </v-number-input>
            <v-number-input
              class="mt-2"
              label="Declination (decimal degrees)"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.siderealTarget.dec"
              :min="-90"
              :max="90"
              :precision="9"
              :error-messages="filtersStore.visibilityErrors.dec"
            >
            </v-number-input>
            <v-number-input
              class="mt-2"
              label="Proper Motion RA (mas/yr)"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.siderealTarget.proper_motion_ra"
              :min="-20000"
              :max="20000"
              :precision="9"
              :error-messages="filtersStore.visibilityErrors.proper_motion_ra"
            >
            </v-number-input>
            <v-number-input
              class="mt-2"
              label="Proper Motion Dec (mas/yr)"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.siderealTarget.proper_motion_dec"
              :min="-20000"
              :max="20000"
              :precision="9"
              :error-messages="filtersStore.visibilityErrors.proper_motion_dec"
            >
            </v-number-input>
            <v-number-input
              class="mt-2"
              label="Epoch"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.siderealTarget.epoch"
              :min="1900"
              :max="2100"
              :precision="2"
              :error-messages="filtersStore.visibilityErrors.epoch"
            >
            </v-number-input>
            <v-number-input
              class="mt-2"
              label="Parallax (mas)"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.siderealTarget.parallax"
              :min="-2000"
              :max="2000"
              :precision="2"
              :error-messages="filtersStore.visibilityErrors.parallax"
            >
            </v-number-input>
          </div>
          <div v-if="filtersStore.targetType=='NON_SIDEREAL'" class="mt-4">
            <v-number-input
              class="mt-2"
              label="Epoch of Elements"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.nonSiderealTarget.epoch_of_elements"
              :min="10000"
              :max="100000"
              :precision="1"
              :error-messages="filtersStore.visibilityErrors.epoch_of_elements"
            >
            </v-number-input>
            <v-number-input
              class="mt-2"
              label="Orbital Inclination"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.nonSiderealTarget.orbital_inclination"
              :min="0"
              :max="180"
              :precision="17"
              :error-messages="filtersStore.visibilityErrors.orbital_inclination"
            >
            </v-number-input>
            <v-number-input
              class="mt-2"
              label="Longitude of Ascending Node"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.nonSiderealTarget.longitude_of_ascending_node"
              :min="0"
              :max="360"
              :precision="17"
              :error-messages="filtersStore.visibilityErrors.longitude_of_ascending_node"
            >
            </v-number-input>
            <v-number-input
              class="mt-2"
              label="Argument of Perihelion"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.nonSiderealTarget.argument_of_perihelion"
              :min="0"
              :max="360"
              :precision="17"
              :error-messages="filtersStore.visibilityErrors.argument_of_perihelion"
            >
            </v-number-input>
            <v-number-input
              class="mt-2"
              label="Eccentricity"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.nonSiderealTarget.eccentricity"
              :min="0"
              :precision="17"
              :error-messages="filtersStore.visibilityErrors.eccentricity"
            >
            </v-number-input>
            <v-number-input
              v-if="filtersStore.nonSiderealType!='MPC_COMET'"
              class="mt-2"
              label="Mean Distance"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.nonSiderealTarget.mean_distance"
              :min="0"
              :precision="17"
              :error-messages="filtersStore.visibilityErrors.mean_distance"
            >
            </v-number-input>
            <v-number-input
              v-if="filtersStore.nonSiderealType=='MPC_COMET'"
              class="mt-2"
              label="Perihelion Distance"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.nonSiderealTarget.perihelion_distance"
              :min="0"
              :precision="17"
              :error-messages="filtersStore.visibilityErrors.perihelion_distance"
            >
            </v-number-input>
            <v-number-input
              v-if="filtersStore.nonSiderealType!='MPC_COMET'"
              class="mt-2"
              label="Mean Anomaly"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.nonSiderealTarget.mean_anomaly"
              :min="0"
              :max="360"
              :precision="17"
              :error-messages="filtersStore.visibilityErrors.mean_anomaly"
            >
            </v-number-input>
            <v-number-input
              v-if="filtersStore.nonSiderealType=='MPC_COMET'"
              class="mt-2"
              label="Epoch of Perihelion"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.nonSiderealTarget.epoch_of_perihelion"
              :min="361"
              :max="240000"
              :precision="7"
              :error-messages="filtersStore.visibilityErrors.epoch_of_perihelion"
            >
            </v-number-input>
            <v-number-input
              v-if="filtersStore.nonSiderealType=='JPL_MAJOR_PLANET'"
              class="mt-2"
              label="Daily Motion"
              variant="outlined"
              density="compact"
              control-variant="hidden"
              v-model="filtersStore.queryParams.nonSiderealTarget.daily_motion"
              :min="0"
              :precision="17"
              :error-messages="filtersStore.visibilityErrors.daily_motion"
            >
            </v-number-input>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-row>
            <v-col cols="3">
              <p>Constraints:</p>
            </v-col>
            <v-col cols="9">
              <p class="fields-complete">{{ constraintsString }}</p>
            </v-col>
          </v-row>
        </v-expansion-panel-title>
        <v-expansion-panel-text class="filter-panel">
          <v-number-input
            class="mt-2"
            label="Max Airmass"
            control-variant="stacked"
            v-model="filtersStore.queryParams.base.max_airmass"
            :min="1"
            :max="10"
            :step="0.1"
            :precision="1"
          >
          </v-number-input>
          <v-number-input
            label="Max Lunar Phase"
            control-variant="stacked"
            v-model="filtersStore.queryParams.base.max_lunar_phase"
            :min="0"
            :max="1"
            :step="0.1"
            :precision="1"
          >
          </v-number-input>
          <v-number-input
            label="Min Lunar Distance"
            control-variant="stacked"
            v-model="filtersStore.queryParams.base.min_lunar_distance"
            :min="0"
            :max="180"
            :step="1"
          >
          </v-number-input>
        </v-expansion-panel-text>
      </v-expansion-panel>
      <v-expansion-panel>
        <v-expansion-panel-title>
          <v-row>
            <v-col cols="3">
              <p>Telescopes:</p>
            </v-col>
            <v-col cols="9">
              <p class="fields-complete">{{ telescopesString }}</p>
            </v-col>
          </v-row>        
        </v-expansion-panel-title>
        <v-expansion-panel-text class="filter-panel">
          <telescope-select></telescope-select>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-navigation-drawer>
</template>
<style scoped>

.menu-chevron {
  left: -6px;
}

.fields-complete {
  color: darkcyan;
}

.fields-error {
  color: red;
}

.filter-panel {
  background-color: rgb(18, 18, 18);
}

.datepicker-group {
  position: relative;
}

.button-stack {
  flex-direction: column;
  padding-left:12px;
  height: auto !important;
}

.datepicker-label {
  z-index: 2;
  position:absolute;
  font-size:small;
  top:-12px;
  left: 8px;
  background-color: var(--vt-c-black);
}

</style>
