<script setup>
import { ref, provide, watch } from 'vue'
import { useFiltersStore } from '@/stores/filters'
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
