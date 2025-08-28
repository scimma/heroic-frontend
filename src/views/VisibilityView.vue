<script setup>
import { ref, provide, watch, computed, onMounted } from 'vue'
import { useFiltersStore } from '@/stores/filters'
import GWVisibilityChart from '@/components/GWVisibilityChart.vue'
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
const seriesIndexToTelescope = ref([]);
const filtersStore = useFiltersStore()

// Check if any GW detectors are selected or available
const hasGWDetectors = computed(() => {
  if (!filtersStore.telescopes) return false;
  
  const allGWDetectors = Object.keys(filtersStore.telescopes).filter(id => 
    id.includes('ligo') || id.includes('virgo') || id.includes('kagra')
  );
  
  // If specific telescopes are selected, check if any are GW
  if (filtersStore.queryParams.base.telescopes && filtersStore.queryParams.base.telescopes.length > 0) {
    return filtersStore.queryParams.base.telescopes.some(t => 
      t.includes('ligo') || t.includes('virgo') || t.includes('kagra')
    );
  }
  
  // Otherwise, check if any GW detectors exist
  return allGWDetectors.length > 0;
});

// Check if we should show GW visibility
const showGWVisibility = computed(() => {
  return hasGWDetectors.value && 
         !!filtersStore.queryParams.base.start && 
         !!filtersStore.queryParams.base.end;
});

// Query GW visibility when appropriate
watch([() => filtersStore.queryParams.base.start, () => filtersStore.queryParams.base.end, 
       () => filtersStore.queryParams.siderealTarget.ra, () => filtersStore.queryParams.siderealTarget.dec,
       () => filtersStore.queryParams.base.telescopes], () => {
  if (showGWVisibility.value && filtersStore.queryParams.siderealTarget.ra && filtersStore.queryParams.siderealTarget.dec) {
    filtersStore.queryGWVisibility();
  }
}, { deep: true, immediate: true });

// Also query on mount if conditions are met
onMounted(() => {
  if (showGWVisibility.value && filtersStore.queryParams.siderealTarget.ra && filtersStore.queryParams.siderealTarget.dec) {
    filtersStore.queryGWVisibility();
  }
});

const airmassChartUpdateOptions = ref({
  replaceMerge: ['series', 'legend']
})

var tooltipCallback = (seriesArray) => {
  var date = null;
  var bulk =  '';
  seriesArray.forEach(series => {
    bulk += '<div style="margin: 10px 0 0;line-height:1;"><div class="ec-tooltip-base" style="float:left;">';
    bulk += series.marker;
    bulk += '</div>';
    bulk += '<span class="ec-tooltip-text" style="margin-left:2px;float:left;">' + seriesIndexToTelescope.value[series.seriesIndex] + '</span>';
    bulk += '<span class="ec-tooltip-value">' + series.data[1] + '</span></div>';
    bulk += '<div style="clear:both;">';
    bulk += '</div>'
    date = series.axisValueLabel;
  })
  let tooltip = '<div class="ec-tooltip-base">';
  tooltip += '<div class="ec-tooltip-text" style="line-height:1;">' + date + '</div>';
  tooltip += bulk;
  tooltip += '</div><div style="clear:both;"></div>';
  return tooltip;
}

const airmassChartOptions = ref({
  title: {
    text: '',
  },
  tooltip: {
    trigger: 'axis',
    formatter: tooltipCallback
  },
  legend: {
    data: [],
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


watch(() => filtersStore.$state.airmassResults, () => {
  const data = filtersStore.$state.airmassResults
  if (data) {
    seriesIndexToTelescope.value = [];
    airmassChartOptions.value.series = [];
    airmassChartOptions.value.legend.data = [];
    for (const telescope in data) {
      let condensedName = telescope.split('.').slice(0, 2).join('.');
      let previousTime = new Date(data[telescope].times[0]);
      let dataArray = [];
      for (let i = 0; i < data[telescope].times.length; i++) {
        let currentTime = new Date(data[telescope].times[i]);
        // If the times are more than 20 minutes apart, start a new series since its no longer continuous
        if (((currentTime - previousTime) / 1000.0 / 60.0) > 20) {
          airmassChartOptions.value.series.push({
            name: condensedName,
            type: 'line',
            data: [...dataArray]
          })
          seriesIndexToTelescope.value.push(telescope);
          dataArray = []
        }
        dataArray.push([data[telescope].times[i], data[telescope].airmasses[i]])
        previousTime = currentTime;
      }
      if (dataArray) {
        airmassChartOptions.value.series.push({
          name: condensedName,
          type: 'line',
          data: [...dataArray]
        })
        seriesIndexToTelescope.value.push(telescope);
      }
      airmassChartOptions.value.legend.data.push(condensedName)
    }
  }
}, {immediate: true})

watch(() => filtersStore.$state.airmassErrors, () => {
  if (Object.keys(filtersStore.$state.airmassErrors).length > 0){
    airmassChartOptions.value.series = []
    airmassChartOptions.value.legend.data = []
  }
})

</script>

<template>
  <v-container fluid>
    <!-- GW Visibility Section -->
    <v-row v-if="showGWVisibility" class="mb-6">
      <v-col cols="12">
        <v-card color="grey-darken-4" class="pa-4">
          <v-card-title class="text-h5">
            Gravitational Wave Network Visibility
          </v-card-title>
          <v-card-text>
            <div v-if="!filtersStore.queryParams.siderealTarget.ra || !filtersStore.queryParams.siderealTarget.dec" class="text-center py-8">
              <v-icon size="64" color="grey">mdi-target</v-icon>
              <h3 class="mt-4">Target Coordinates Required</h3>
              <p class="text-grey mt-2">Please enter RA and Dec coordinates to see GW network visibility</p>
            </div>
            <GWVisibilityChart 
              v-else
              :gw-data="filtersStore.gwVisibilityResults"
              :loading="filtersStore.loadingGWVisibility"
            />
            <div v-if="filtersStore.gwVisibilityErrors && Object.keys(filtersStore.gwVisibilityErrors).length > 0" class="mt-4 text-error">
              GW Error: {{ filtersStore.gwVisibilityErrors }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Traditional Visibility Section -->
    <v-row>
      <v-col align="center" v-if="filtersStore.airmassResults">
        <h2>Airmass Plot</h2>
        <v-chart class="chart" :option="airmassChartOptions" :update-options="airmassChartUpdateOptions" autoresize/>
      </v-col>
      <v-col align="center" v-else-if="filtersStore.loadingAirmass || filtersStore.loadingVisibility">
        <h1 class="mt-10">
          Loading visibility data
          <v-progress-linear indeterminate></v-progress-linear>
        </h1>
      </v-col>
      <v-col align="center" v-else>
        <h1 class="mt-10">You must fill in Target details and a date range to generate visibility</h1>
        <div v-if="filtersStore.visibilityErrors && Object.keys(filtersStore.visibilityErrors).length > 0" class="mt-4 text-error">
          Error: {{ filtersStore.visibilityErrors }}
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>
<style>

.ec-tooltip-base {
  margin: 0px 0 0;
  line-height: 1;
}

.ec-tooltip-text {
  font-size: 14px;
  color: #666;
  font-weight: 400;
}

.ec-tooltip-value {
  float: right;
  margin-left: 20px;
  font-size: 14px;
  color: #666;
  font-weight: 900;
}

.chart {
  max-height: 500px;
  min-height: 500px;
}

</style>
