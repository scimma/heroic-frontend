<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { fetchApiCall } from '@/utils/api'
import { useFiltersStore } from '@/stores/filters'
import { DataSet, Timeline } from 'vis-timeline/standalone';
import StatusTimelineLegend from '@/components/global/StatusTimelineLegend.vue';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import "@/assets/timeline.css"

const props = defineProps({
  apiEndpoint: {
    type: String,
    required: true
  },
  telescope: {
    type: String,
    required: true
  },
  instrument: {
    type: String,
    required: false
  }
})

const ONEDAY = 3600 * 1000 * 24;
const filtersStore = useFiltersStore()
const timelineDiv = ref(null);
const historicalItems = ref([]);
const plannedItems = ref([]);
const telescopeDarkIntervals = ref({});
var timeline = null;

const options = {
  groupOrder: 'id',
  stack: false,
  maxHeight: '450px',
  minHeight: '120px',
  width: '1160px',
  align: 'left',
  dataAttributes: ['toggle', 'html'],
  selectable: false,
  zoomKey: 'ctrlKey',
  tooltip: {
    overflowMethod: 'flip'
  }
};

function toTooltip(item) {
  let tooltip = '<h4>' + item.status + '</h4>';
  if (item.reason) {
    tooltip += '<br /><p>' + item.reason + '</p>';
  }
  if (item.optical_element_groups && Object.keys(item.optical_element_groups).length != 0) {
    tooltip += '<br /><pre>' + (JSON.stringify(item.optical_element_groups, null, 2) || '') + '</pre>';
  }
  if (item.operation_modes && Object.keys(item.operation_modes).length != 0) {
    tooltip += '<br /><pre>' + (JSON.stringify(item.operation_modes, null, 2) || '') + '</pre>';
  }
  return tooltip;
}

const start = computed(() => {
  return filtersStore.queryParams.base.start || new Date(Date.now() - (ONEDAY * 7)).toISOString();
})

const startMinusOne = computed(() => {
  return new Date(new Date(start.value).getTime() - ONEDAY).toISOString();
})

const end = computed(() => {
  return filtersStore.queryParams.base.end || new Date(Date.now() + ONEDAY).toISOString();
})

const endPlusOne = computed(() => {
  return new Date(new Date(end.value).getTime() + ONEDAY).toISOString();
})

const timelineData = computed(() => {
  let visData = new DataSet();
  if (historicalItems.value) {
    var lastItem;
    // Statues are in a list ordered by soonest first
    historicalItems.value.forEach(item => {
      if (lastItem) {
        visData.add({
          group: 'status',
          start: item.date,
          end: lastItem.date,
          className: item.status,
          title: toTooltip(item),
          toggle: 'tooltip',
          html: true,
          type: 'range'
        });
      }
      else {
        visData.add({
          group: 'status',
          start: item.date,
          end: end.value,
          className: item.status,
          title: toTooltip(item),
          toggle: 'tooltip',
          html: true,
          type: 'range'
        });
      }
      lastItem = item;
    })
  }
  // Layer the planned future items over the top of the last current item
  if (plannedItems.value) {
    // Planned statues are in a list ordered by soonest first
    plannedItems.value.forEach(item => {
      let capped_start = new Date(item.start);
      if (capped_start < new Date()) {
        capped_start = new Date();
      }
      visData.add({
        group: 'status',
        start: capped_start.toISOString(),
        end: item.end,
        className: item.status,
        title: toTooltip(item),
        toggle: 'tooltip',
        html: true,
        type: 'range'
      });
    })
  }
  if (telescopeDarkIntervals.value && telescopeDarkIntervals.value[props.telescope]) {
    let sunUpStart = null;
    telescopeDarkIntervals.value[props.telescope].forEach(interval => {
      if (sunUpStart) {
        let statusItem = {
          group: 'status',
          start: sunUpStart,
          end: interval[0],
          className: 'sun-up',
          title: 'Sun up',
          toggle: 'tooltip',
          type: 'background'
        };
        let visItem = { ...statusItem };
        visData.add(statusItem);
        if (filtersStore.visibilityResults && filtersStore.visibilityResults[props.telescope]) {
          visItem['group'] = 'visibility';
          visData.add(visItem);
        }
      }
      sunUpStart = interval[1];
    })

  }
  if (filtersStore.visibilityResults && filtersStore.visibilityResults[props.telescope]) {
    filtersStore.visibilityResults[props.telescope].forEach(visibleRange => {
      visData.add({
        group: 'visibility',
        className: 'VISIBLE',
        start: visibleRange[0],
        end: visibleRange[1],
        title: 'Visible',
        type: 'range'
      });
    })
  }
  return visData;
})

const timelineGroups = computed(() => {
  let plotGroups = new DataSet();
  if (historicalItems.value || plannedItems.value){
    plotGroups.add({
      id: 'status',
      content: props.instrument ? 'Instrument Status': 'Telescope Status',
      title: 'status'
    });
  }
  if (filtersStore.visibilityResults && filtersStore.visibilityResults[props.telescope]) {
    plotGroups.add({
      id: 'visibility',
      content: 'Target Visibility',
      title: 'visibility'
    });
  }
  return plotGroups;
})

async function loadHistoricalAPIItems () {
  let url = import.meta.env.VITE_HEROIC_URL + 'api/' + props.apiEndpoint + '/?limit=1000&telescope=' + props.telescope + '&start=' + start.value + '&end=' + end.value;
  if (props.instrument) {
    url += '&instrument=' + props.instrument;
  }
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    historicalItems.value = data.results;
  }})
}

async function loadPlannedAPIItems () {
  // Planned future items is only valid in the future, so cap query from now
  if (new Date(end.value) > new Date()) {
    let capped_start = new Date(start.value);
    if (capped_start < new Date()) {
      capped_start = new Date();
    }
    let url = import.meta.env.VITE_HEROIC_URL + 'api/planned-' + props.apiEndpoint + '/?limit=1000&telescope=' + props.telescope + '&end_after=' + capped_start.toISOString() + '&start_before=' + end.value;
    if (props.instrument) {
      url += '&instrument=' + props.instrument;
    }
    await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
      plannedItems.value = data.results;
    }})
  }
}

async function loadTelescopeDarkIntervals () {
  const url = import.meta.env.VITE_HEROIC_URL + 'api/telescopes/' + props.telescope + '/dark_intervals/?start=' + startMinusOne.value + '&end=' + endPlusOne.value;
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    telescopeDarkIntervals.value = data;
  }})
}

function timelineSetup() {
  timeline = new Timeline(timelineDiv.value, new DataSet([]), options);
}

onMounted(async () => {
  timelineSetup();
})

watch([() => filtersStore.queryParams.base.start, () => filtersStore.queryParams.base.end, () => props.telescope, () => props.instrument], async () => {
  // When start/end date is changed or prop telescope is changed, reload telescope status
  if (props.telescope) {
    await loadHistoricalAPIItems();
    await loadPlannedAPIItems();
    await loadTelescopeDarkIntervals();
    timeline.setGroups(new DataSet([]));
    timeline.setItems(new DataSet([]));
    timeline.setGroups(timelineGroups.value);
    timeline.setItems(timelineData.value);
    timeline.setWindow(start.value, end.value);
  }
}, {immediate: true})

watch([() => filtersStore.$state.visibilityErrors, () => filtersStore.$state.visibilityResults], async () => {
  timeline.setGroups(new DataSet([]));
  timeline.setItems(new DataSet([]));
  timeline.setGroups(timelineGroups.value);
  timeline.setItems(timelineData.value);
  timeline.setWindow(start.value, end.value);
})

</script>
<template>
  <div ref="timelineDiv"></div>
  <status-timeline-legend :include-visibility="true" :include-sun="true" max-width="1160px" style="width: 100%"></status-timeline-legend>
</template>
<style>
</style>
