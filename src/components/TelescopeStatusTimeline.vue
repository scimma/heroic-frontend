<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { fetchApiCall } from '@/utils/api'
import { useFiltersStore } from '@/stores/filters'
import { DataSet, Timeline } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';


const props = defineProps({
  telescope: {
    type: String,
    required: true
  }
})

const ONEDAY = 3600 * 1000 * 24;
const filtersStore = useFiltersStore()
const timelineDiv = ref(null);
const telescopeStatuses = ref([]);
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
    overflowMethod: 'cap'
  }
};

function statusTooltip(status) {
  return '<h4>' + status.status + '</h4><br><p>' + (status.reason || '') + '</p>';
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
  if (telescopeStatuses.value) {
    var lastStatus;
    // Statues are in a list ordered by soonest first
    telescopeStatuses.value.forEach(status => {
      if (lastStatus) {
        visData.add({
          group: 'status',
          start: status.date,
          end: lastStatus.date,
          className: status.status,
          title: statusTooltip(status),
          toggle: 'tooltip',
          html: true,
          type: 'range'
        });
      }
      else {
        visData.add({
          group: 'status',
          start: status.date,
          end: end.value,
          className: status.status,
          title: statusTooltip(status),
          toggle: 'tooltip',
          html: true,
          type: 'range'
        });
      }
      lastStatus = status;
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
  if (telescopeStatuses.value){
    plotGroups.add({
      id: 'status',
      content: 'Status',
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

async function loadTelescopeStatus () {
  const url = import.meta.env.VITE_HEROIC_API_URL + 'telescope-statuses' + '/?limit=1000&telescope=' + props.telescope + '&start=' + start.value + '&end=' + end.value;
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    telescopeStatuses.value = data.results;
  }})
}

async function loadTelescopeDarkIntervals () {
  const url = import.meta.env.VITE_HEROIC_API_URL + 'telescopes/' + props.telescope + '/dark_intervals/?start=' + startMinusOne.value + '&end=' + endPlusOne.value;
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

watch(() => filtersStore.$state.visibilityResults, async () => {
  await loadTelescopeStatus();
  await loadTelescopeDarkIntervals();
  timeline.setGroups(new DataSet([]));
  timeline.setItems(new DataSet([]));
  timeline.setGroups(timelineGroups.value);
  timeline.setItems(timelineData.value);
  timeline.setWindow(start.value, end.value);
}, {immediate: true})

watch(() => filtersStore.$state.visibilityErrors, async () => {
  if (Object.keys(filtersStore.$state.visibilityErrors).length > 0){
    await loadTelescopeStatus();
    await loadTelescopeDarkIntervals();
    timeline.setGroups(new DataSet([]));
    timeline.setItems(new DataSet([]));
    timeline.setGroups(timelineGroups.value);
    timeline.setItems(timelineData.value);
  }
})

</script>
<template>
  <div ref="timelineDiv"></div>
</template>
<style>
.vis-time-axis .vis-text {
  color: #b3b3b3 !important;
}
.vis-labelset .vis-label {
  color: #b3b3b3 !important;
}
.vis-item.VISIBLE {
  background-color: rgb(185, 115, 234);
  border-color: rgb(167, 71, 234);
}
.vis-item.AVAILABLE {
  background-color: lightblue;
  border-color: lightblue;
}
.vis-item.UNAVAILABLE {
  background-color: lightcoral;
  border-color: lightcoral;
}
.vis-item.SCHEDULABLE {
  background-color: lightgreen;
  border-color: lightgreen;
}
.vis-item.sun-up {
  background-color: lightyellow !important;
}
</style>
