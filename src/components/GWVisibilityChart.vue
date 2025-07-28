<script setup>
import { ref, watch, computed } from 'vue'
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  GridComponent,
  MarkLineComponent,
  MarkAreaComponent
} from 'echarts/components';
import VChart from 'vue-echarts';

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  DataZoomComponent,
  TooltipComponent,
  LegendComponent,
  ToolboxComponent,
  GridComponent,
  MarkLineComponent,
  MarkAreaComponent
]);

const props = defineProps({
  gwData: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const chartOptions = ref({
  backgroundColor: 'transparent',
  title: {
    text: 'GW Network Detectability Range',
    left: 'center',
    textStyle: {
      color: '#e0e0e0'
    }
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    textStyle: {
      color: '#e0e0e0'
    },
    formatter: function(params) {
      let time = new Date(params[0].axisValueLabel).toUTCString();
      let html = `<div style="font-weight: bold;">${time}</div>`;
      
      params.forEach(param => {
        if (param.seriesName === 'Max Distance') {
          html += `<div>${param.marker} ${param.seriesName}: <b>${param.value[1]} Mpc</b></div>`;
        } else if (param.seriesName === 'Active Detectors') {
          html += `<div>${param.marker} ${param.seriesName}: <b>${param.value[1]}</b></div>`;
        }
      });
      
      // Add detector details if available
      if (params[0].data && params[0].data[2]) {
        html += `<div style="margin-top: 5px;">Detectors: ${params[0].data[2].join(', ')}</div>`;
      }
      
      return html;
    }
  },
  legend: {
    data: ['Max Distance', 'Active Detectors'],
    top: 40,
    textStyle: {
      color: '#e0e0e0'
    }
  },
  grid: [
    {
      left: '3%',
      right: '4%',
      bottom: '35%',
      containLabel: true
    },
    {
      left: '3%',
      right: '4%',
      top: '65%',
      bottom: '3%',
      containLabel: true
    }
  ],
  xAxis: [
    {
      type: 'time',
      gridIndex: 0,
      axisLabel: {
        show: false
      },
      axisTick: {
        show: false
      }
    },
    {
      type: 'time',
      gridIndex: 1,
      position: 'bottom',
      axisLabel: {
        formatter: function(value) {
          let date = new Date(value);
          return date.toISOString().replace('T', '\n').slice(0, -5);
        },
        color: '#e0e0e0'
      }
    }
  ],
  yAxis: [
    {
      type: 'value',
      name: 'Max Distance @ SNR=10 (Mpc)',
      nameLocation: 'middle',
      nameGap: 50,
      gridIndex: 0,
      min: 0,
      axisLabel: {
        color: '#e0e0e0'
      },
      nameTextStyle: {
        color: '#e0e0e0'
      }
    },
    {
      type: 'value',
      name: 'Active Detectors',
      nameLocation: 'middle',
      nameGap: 50,
      gridIndex: 1,
      min: -0.5,
      max: 4.5,
      interval: 1,
      axisLabel: {
        color: '#e0e0e0'
      },
      nameTextStyle: {
        color: '#e0e0e0'
      }
    }
  ],
  dataZoom: [
    {
      type: 'inside',
      xAxisIndex: [0, 1],
      filterMode: 'none'
    },
    {
      type: 'slider',
      show: true,
      xAxisIndex: [0, 1],
      bottom: 60,
      filterMode: 'none',
      textStyle: {
        color: '#e0e0e0'
      }
    }
  ],
  toolbox: {
    feature: {
      dataZoom: {
        yAxisIndex: 'none'
      },
      saveAsImage: {}
    }
  },
  series: []
});

const chartUpdateOptions = ref({
  replaceMerge: ['series']
});

// Process data when it changes
watch(() => props.gwData, (newData) => {
  if (newData && newData.timeline) {
    updateChart(newData);
  }
}, { immediate: true });

function updateChart(data) {
  const distanceData = [];
  const detectorCountData = [];
  const markAreas = [];
  
  // Colors for different detector counts
  const detectorColors = ['#ff4444', '#ff8844', '#ffcc44', '#44ff44', '#4444ff'];
  
  data.timeline.forEach((point, index) => {
    const time = new Date(point.time).getTime();
    distanceData.push([time, point.max_distance_snr10_mpc, point.active_detectors]);
    detectorCountData.push([time, point.network_count]);
    
    // Create mark areas for detector count visualization
    if (index < data.timeline.length - 1) {
      const nextTime = new Date(data.timeline[index + 1].time).getTime();
      const colorIndex = Math.min(point.network_count, detectorColors.length - 1);
      markAreas.push([
        {
          xAxis: time,
          itemStyle: {
            color: detectorColors[colorIndex],
            opacity: 0.2
          }
        },
        {
          xAxis: nextTime
        }
      ]);
    }
  });
  
  chartOptions.value.series = [
    {
      name: 'Max Distance',
      type: 'line',
      data: distanceData,
      xAxisIndex: 0,
      yAxisIndex: 0,
      smooth: true,
      lineStyle: {
        width: 3,
        color: '#44aaff'
      },
      markArea: {
        silent: true,
        data: markAreas
      }
    },
    {
      name: 'Active Detectors',
      type: 'line',
      step: 'end',
      data: detectorCountData,
      xAxisIndex: 1,
      yAxisIndex: 1,
      lineStyle: {
        width: 2,
        color: '#ffaa44'
      }
    }
  ];
  
  // Add query info to title
  if (data.query_info) {
    chartOptions.value.title.subtext = 
      `RA: ${data.query_info.ra}°, Dec: ${data.query_info.dec}° | ` +
      `${data.query_info.start} to ${data.query_info.end}`;
    chartOptions.value.title.subtextStyle = {
      color: '#aaa'
    };
  }
}

const hasData = computed(() => {
  return props.gwData && props.gwData.timeline && props.gwData.timeline.length > 0;
});
</script>

<template>
  <div class="gw-visibility-chart">
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <v-chart 
      v-if="hasData" 
      class="chart" 
      :option="chartOptions" 
      :update-options="chartUpdateOptions" 
      autoresize
    />
    <div v-else-if="!loading" class="no-data">
      <p>No GW visibility data available</p>
    </div>
  </div>
</template>

<style scoped>
.gw-visibility-chart {
  width: 100%;
  min-height: 600px;
}

.chart {
  height: 600px;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  color: #999;
}
</style>