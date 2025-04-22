<script setup>
import { onMounted, ref, provide } from 'vue'
import DatePicker from '@vuepic/vue-datepicker';
import { fetchApiCall } from '@/utils/api'
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  GridComponent
} from 'echarts/components';
import VChart, { THEME_KEY } from 'vue-echarts';

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  DataZoomComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  GridComponent
]);

provide(THEME_KEY, 'dark');

const airmassPlot = ref(null);
const telescopeOptions = ref();
const targetType = ref('SIDEREAL');
const nonSiderealType = ref('MPC_MINOR_PLANET')
const searchTarget = ref();
const searchTargetErrors = ref();
const searchTargetSuccess = ref();
const loadingQuery = ref(false);
const queryErrors = ref({});

// The payload for the visibility query API
const payload = ref({
  start: new Date(),
  end: new Date(Date.now() + (3600 * 1000 * 24)),
  telescopes: null,
  max_airmass: 2.0,
  min_lunar_distance: 0.0,
  max_lunar_phase: 1.0,
});

const siderealTargetPayload = ref({
  ra: null,
  dec: null,
  proper_motion_ra: null,
  proper_motion_dec: null,
  epoch: 2000.0,
  parallax: null
})

const nonsiderealTargetPayload = ref({
  epoch_of_elements: null,
  epoch_of_perihelion: null,
  orbital_inclination: null,
  longitude_of_ascending_node: null,
  longitude_of_perihelion: null,
  argument_of_perihelion: null,
  mean_distance: null,
  perihelion_distance: null,
  eccentricity: null,
  mean_anomaly: null,
  daily_motion: null
})

const airmassChartUpdateOptions = ref({
  replaceMerge: ['series', 'legend']
})

const airmassChartOptions = ref({
  title: {
    text: '',
  },
  tooltip: {
    trigger: 'axis'
  },
  legend: {
    data: []
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  dataZoom: [
    {
      type: 'inside',
      filterMode: 'none'
    },
    {
      type: 'slider',
      show: true,
      xAxisIndex: [0],
      filterMode: 'none'
    }
  ],
  toolbox: {
    feature: {
      dataZoom: {
        yAxisIndex: 'none',
        filterMode: 'none'
      },
      saveAsImage: {}
    }
  },
  xAxis: {
    type: 'time',
  },
  yAxis: {
    type: 'value',
    name: 'Airmass',
    nameLocation: 'middle',
    inverse: true,
    scale: true
  },
  series: [
  ]
});


onMounted(async () => {
  // Fetch the telescope options from the API to populate the telescope select field
  const url = import.meta.env.VITE_HEROIC_API_URL + 'telescopes' + '/?limit=1000';
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    telescopeOptions.value = data.results;
  }})
})

async function queryVisibility() {
  // hit the HEROIC airmass API and generate a plot from results
  loadingQuery.value = true;
  queryErrors.value = {};
  let queryPayload = Object.fromEntries(Object.entries(payload.value).filter(([key, value]) => value == 0 || value))
  if (targetType.value == 'SIDEREAL') {
    queryPayload = Object.assign(
      queryPayload,
      Object.fromEntries(Object.entries(siderealTargetPayload.value).filter(([key, value]) => value == 0 || value))
    )
  }
  else {
    queryPayload = Object.assign(
      queryPayload,
      Object.fromEntries(Object.entries(nonsiderealTargetPayload.value).filter(([key, value]) => value == 0 || value))
    )
  }
  const url = import.meta.env.VITE_HEROIC_API_URL + 'visibility/airmass';
  await fetchApiCall({url: url, method: 'POST', body:queryPayload, successCallback: (data) => {
    console.log(data);
    airmassChartOptions.value.series = []
    airmassChartOptions.value.legend.data = []
    for (const telescope in data) {
      let previousTime = new Date(data[telescope].times[0]);
      let dataArray = [];
      for (let i = 0; i < data[telescope].times.length; i++) {
        let currentTime = new Date(data[telescope].times[i]);
        // If the times are more than 20 minutes apart, start a new series since its no longer continuous
        if (((currentTime - previousTime) / 1000.0 / 60.0) > 20) {
          airmassChartOptions.value.series.push({
            name: telescope,
            type: 'line',
            data: [...dataArray]
          })
          dataArray = []
        }
        dataArray.push([data[telescope].times[i], data[telescope].airmasses[i]])
        previousTime = currentTime;
      }
      if (dataArray) {
        airmassChartOptions.value.series.push({
          name: telescope,
          type: 'line',
          data: [...dataArray]
        })
      }
      airmassChartOptions.value.legend.data.push(telescope)
    }
    loadingQuery.value = false;
  }, failCallback: (errors) => {
    airmassChartOptions.value.series = []
    airmassChartOptions.value.legend.data = []
    queryErrors.value = errors;
    console.error('Failed to get target airmass: ' + errors);
    loadingQuery.value = false;
  }})
}

async function callSearchTarget () {
  // search for target parameters from simbad2k service and prefill the fields if found
  searchTargetErrors.value = null;
  let url = import.meta.env.VITE_SIMBAD2K_API_URL + searchTarget.value + '?target_type=' + targetType.value;
  if (targetType.value == 'NON_SIDEREAL') {
    url = url + '&scheme=' + nonSiderealType.value;
  }
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    console.log(data)
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

function fillInTarget(targetData) {
  siderealTargetPayload.value.ra = targetData.ra_d || targetData.ra || null
  siderealTargetPayload.value.dec = targetData.dec_c || targetData.dec || null
  siderealTargetPayload.value.proper_motion_ra = targetData.pmra || null
  siderealTargetPayload.value.proper_motion_dec = targetData.pmdec || null
  siderealTargetPayload.value.parallax = targetData.plx_value || null
  nonsiderealTargetPayload.value.epoch_of_elements = targetData.epoch_jd ? targetData.epoch_jd - 2400000.5 : null;
  nonsiderealTargetPayload.value.longitude_of_ascending_node = targetData.ascending_node || null;
  nonsiderealTargetPayload.value.orbital_inclination = targetData.inclination || null;
  nonsiderealTargetPayload.value.argument_of_perihelion = targetData.argument_of_perihelion || null;
  nonsiderealTargetPayload.value.eccentricity = targetData.eccentricity || null;
  nonsiderealTargetPayload.value.mean_distance = targetData.semimajor_axis || null;
  nonsiderealTargetPayload.value.mean_anomaly = targetData.mean_anomaly || null;
  nonsiderealTargetPayload.value.daily_motion = targetData.mean_daily_motion || null;
  nonsiderealTargetPayload.value.perihelion_distance = targetData.perihelion_distance || null;
  nonsiderealTargetPayload.value.epoch_of_perihelion = targetData.perihelion_date_jd ? targetData.perihelion_date_jd - 2400000.5 : null;
}

function clearTargetErrors() {
  searchTargetErrors.value = null;
  searchTargetSuccess.value = undefined;
}

function onChangeTargetType() {
  // Reset the target fields to null and remove any target from the search bar when switching target types
  searchTarget.value = null;
  clearTargetErrors();
  fillInTarget({});
}

</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="5">
        <v-row>
          <v-col cols="7">
            <h2>Target Visibility Query</h2>
          </v-col>
          <v-col cols="5">
            <v-btn
              :loading="loadingQuery"
              variant="tonal"
              @click="queryVisibility"
              >Plot Visibility
            </v-btn>
          </v-col>
        </v-row>
        <v-divider class="mt-2" thickness="2"></v-divider>
        <v-alert v-if="queryErrors.non_field_errors" type="error" :text="queryErrors.non_field_errors.join(', ')" closable></v-alert>
        <v-form>
          <v-row>
            <v-col cols="5">
              <div class="datepicker-group mt-6">
                <v-label v-if="payload.start" id="start-dp-label" class="datepicker-label">Start Date</v-label> 
                <DatePicker v-model="payload.start" id="start-dt-picker" model-type="iso" placeholder="Start Date" label="Start" required dark></DatePicker>
              </div>
              <div class="datepicker-group mt-6">
                <v-label v-if="payload.end" id="end-dp-label" class="datepicker-label">End Date</v-label> 
                <DatePicker v-model="payload.end" model-type="iso" placeholder="End Date" required dark></DatePicker>
              </div>
              <v-select
                class="mt-6"
                variant="outlined"
                v-model="payload.telescopes"
                :items="telescopeOptions"
                item-value="id"
                item-title="id"
                label="Telescopes"
                v-tooltip:top="'Optional filter on Telescopes'"
                chips
                multiple>
              </v-select>
              <v-number-input
                label="Max Airmass"
                control-variant="stacked"
                v-model="payload.max_airmass"
                :min="1"
                :max="10"
                :step="0.1"
                :precision="1"
              >
              </v-number-input>
              <v-number-input
                label="Max Lunar Phase"
                control-variant="stacked"
                v-model="payload.max_lunar_phase"
                :min="0"
                :max="1"
                :step="0.1"
                :precision="1"
              >
              </v-number-input>
              <v-number-input
                label="Min Lunar Distance"
                control-variant="stacked"
                v-model="payload.min_lunar_distance"
                :min="0"
                :max="180"
                :step="1"
              >
              </v-number-input>
            </v-col>
            <v-col cols="6" offset="1">
              <v-btn-toggle class="mt-4" v-model="targetType" color="deep-purple-accent-4" density="compact" group @update:modelValue="onChangeTargetType">
                <v-btn value="SIDEREAL">Sidereal</v-btn>
                <v-btn value="NON_SIDEREAL">Non-Sidereal</v-btn>
              </v-btn-toggle>
              <v-btn-toggle class="mt-4 button-stack" v-if="targetType=='NON_SIDEREAL'" v-model="nonSiderealType" color="deep-purple-accent-4" group>
                <v-btn value="MPC_MINOR_PLANET" size="large">MPC Minor Planet</v-btn>
                <v-btn value="MPC_COMET" size="large">MPC Comet</v-btn>
                <v-btn value="JPL_MAJOR_PLANET" size="large">JPL Major Planet</v-btn>
              </v-btn-toggle>
              <v-text-field
                class="mt-4"
                variant="outlined"
                label="Prefill Target"
                v-model="searchTarget"
                :error-messages="searchTargetErrors"
                :base-color="searchTargetSuccess ? 'success': undefined"
                :color="searchTargetSuccess ? 'success': undefined"
                :messages="searchTargetSuccess"
                @input="clearTargetErrors"
              >
                <template v-slot:append-inner>
                  <v-btn :disabled="!searchTarget" @click="callSearchTarget">Search</v-btn>
                </template>
              </v-text-field>
              <div v-if="targetType=='SIDEREAL'" class="mt-4">
                <v-number-input
                  label="Right Ascension (decimal degrees)"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="siderealTargetPayload.ra"
                  :min="0"
                  :max="360"
                  :precision="9"
                  :error-messages="queryErrors.ra"
                >
                </v-number-input>
                <v-number-input
                  class="mt-2"
                  label="Declination (decimal degrees)"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="siderealTargetPayload.dec"
                  :min="-90"
                  :max="90"
                  :precision="9"
                  :error-messages="queryErrors.dec"
                >
                </v-number-input>
                <v-number-input
                  class="mt-2"
                  label="Proper Motion RA (mas/yr)"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="siderealTargetPayload.proper_motion_ra"
                  :min="-20000"
                  :max="20000"
                  :precision="9"
                  :error-messages="queryErrors.proper_motion_ra"
                >
                </v-number-input>
                <v-number-input
                  class="mt-2"
                  label="Proper Motion Dec (mas/yr)"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="siderealTargetPayload.proper_motion_dec"
                  :min="-20000"
                  :max="20000"
                  :precision="9"
                  :error-messages="queryErrors.proper_motion_dec"
                >
                </v-number-input>
                <v-number-input
                  class="mt-2"
                  label="Epoch"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="siderealTargetPayload.epoch"
                  :min="1900"
                  :max="2100"
                  :precision="2"
                  :error-messages="queryErrors.epoch"
                >
                </v-number-input>
                <v-number-input
                  class="mt-2"
                  label="Parallax (mas)"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="siderealTargetPayload.parallax"
                  :min="-2000"
                  :max="2000"
                  :precision="2"
                  :error-messages="queryErrors.parallax"
                >
                </v-number-input>
              </div>
              <div v-if="targetType=='NON_SIDEREAL'" class="mt-4">
                <v-number-input
                  class="mt-2"
                  label="Epoch of Elements"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="nonsiderealTargetPayload.epoch_of_elements"
                  :min="10000"
                  :max="100000"
                  :precision="1"
                  :error-messages="queryErrors.epoch_of_elements"
                >
                </v-number-input>
                <v-number-input
                  class="mt-2"
                  label="Orbital Inclination"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="nonsiderealTargetPayload.orbital_inclination"
                  :min="0"
                  :max="180"
                  :precision="17"
                  :error-messages="queryErrors.orbital_inclination"
                >
                </v-number-input>
                <v-number-input
                  class="mt-2"
                  label="Longitude of Ascending Node"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="nonsiderealTargetPayload.longitude_of_ascending_node"
                  :min="0"
                  :max="360"
                  :precision="17"
                  :error-messages="queryErrors.longitude_of_ascending_node"
                >
                </v-number-input>
                <v-number-input
                  class="mt-2"
                  label="Argument of Perihelion"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="nonsiderealTargetPayload.argument_of_perihelion"
                  :min="0"
                  :max="360"
                  :precision="17"
                  :error-messages="queryErrors.argument_of_perihelion"
                >
                </v-number-input>
                <v-number-input
                  class="mt-2"
                  label="Eccentricity"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="nonsiderealTargetPayload.eccentricity"
                  :min="0"
                  :precision="17"
                  :error-messages="queryErrors.eccentricity"
                >
                </v-number-input>
                <v-number-input
                  v-if="nonSiderealType!='MPC_COMET'"
                  class="mt-2"
                  label="Mean Distance"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="nonsiderealTargetPayload.mean_distance"
                  :min="0"
                  :precision="17"
                  :error-messages="queryErrors.mean_distance"
                >
                </v-number-input>
                <v-number-input
                  v-if="nonSiderealType=='MPC_COMET'"
                  class="mt-2"
                  label="Perihelion Distance"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="nonsiderealTargetPayload.perihelion_distance"
                  :min="0"
                  :precision="17"
                  :error-messages="queryErrors.perihelion_distance"
                >
                </v-number-input>
                <v-number-input
                  v-if="nonSiderealType!='MPC_COMET'"
                  class="mt-2"
                  label="Mean Anomaly"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="nonsiderealTargetPayload.mean_anomaly"
                  :min="0"
                  :max="360"
                  :precision="17"
                  :error-messages="queryErrors.mean_anomaly"
                >
                </v-number-input>
                <v-number-input
                  v-if="nonSiderealType=='MPC_COMET'"
                  class="mt-2"
                  label="Epoch of Perihelion"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="nonsiderealTargetPayload.epoch_of_perihelion"
                  :min="361"
                  :max="240000"
                  :precision="7"
                  :error-messages="queryErrors.epoch_of_perihelion"
                >
                </v-number-input>
                <v-number-input
                  v-if="nonSiderealType=='JPL_MAJOR_PLANET'"
                  class="mt-2"
                  label="Daily Motion"
                  variant="outlined"
                  density="compact"
                  control-variant="hidden"
                  v-model="nonsiderealTargetPayload.daily_motion"
                  :min="0"
                  :precision="17"
                  :error-messages="queryErrors.daily_motion"
                >
                </v-number-input>
              </div>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" :align="'center'">
              <v-btn
                :loading="loadingQuery"
                size="x-large"
                variant="tonal"
                @click="queryVisibility"
                >Plot Visibility
              </v-btn>
            </v-col>
          </v-row>
        </v-form>
      </v-col>
      <v-col cols="6" align="center">
        <h2>Airmass Plot</h2>
        <v-chart class="chart" :option="airmassChartOptions" :update-options="airmassChartUpdateOptions" autoresize/>
      </v-col>
    </v-row>
  </v-container>
</template>
<style>

.chart {
  max-height: 500px;
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