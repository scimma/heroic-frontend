<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import DatePicker from '@vuepic/vue-datepicker';
import { fetchApiCall, capitalize } from '@/utils/api'
import { useUserStore } from '@/stores/user';
import TelescopeSelect from '@/components/global/TelescopeSelect.vue'
import InstrumentSelect from '@/components/global/InstrumentSelect.vue';
import StatusTimelineLegend from '@/components/global/StatusTimelineLegend.vue';
import { DataSet, Timeline } from 'vis-timeline/standalone';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import "@/assets/timeline.css"

const props = defineProps({
  apiEndpoint: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  parentKey: {
    type: String,
    required: true
  },
  start: {
    type: String,
    default: () => (new Date()).toISOString()
  },
  end: {
    type: String,
    required: false
  },
  telescopes: {
    type: Array,
    required: false
  },
  editable: {
    type: Boolean,
    default: false
  }
})

const userStore = useUserStore()

const timelineDiv = ref(null);

const apiItems = ref([]);
const keySet = new Set();

const deleteDialog = ref(false);
const deleteDialogCallback = ref(null);
const deleteDialogItem = ref(null);

const addDialog = ref(false);
const addDialogCallback = ref(null);
const addDialogItem = ref(null);

var last_end = new Date();
var timeline = null;
const visItems = new DataSet();
const visGroups = new DataSet();


const helpText = computed(() => {
  return 'Click the plus button or double click within the timeline to add a planned ' + props.type + '.<br />Click on a ' + props.type + " and then the 'x' button next to it to delete it."
})

const deleteDialogText = computed(() => {
  if (deleteDialogItem) {
    return 'Are you sure you want to delete planned ' + props.type + ' of ' + deleteDialogItem.value.className + ' on ' + props.parentKey + ' ' + deleteDialogItem.value.group + '?';
  }
  return 'Are you sure you want to delete this planned ' + props.parentKey + ' ' + props.type + '?';
})

const options = {
  groupOrder: 'id',
  stack: false,
  maxHeight: '900px',
  minHeight: '120px',
  width: '1160px',
  align: 'left',
  dataAttributes: ['toggle', 'html'],
  selectable: props.editable,
  editable: props.editable,
  zoomKey: 'ctrlKey',
  tooltip: {
    overflowMethod: 'cap'
  },
  onRemove: function (item, callback) {
    deleteDialogItem.value = item;
    deleteDialogCallback.value = callback;
    deleteDialog.value = true;
  },
  onAdd: function (item, callback) {
    item.status = 'AVAILABLE';
    item.end = new Date(item.start);
    item.end.setDate(item.start.getDate() + 1);
    addDialogItem.value = item;
    addDialogCallback.value = callback;
    addDialog.value = true;
  },
};

function onAddItem() {
  var item = {status: 'AVAILABLE'};
  addDialogItem.value = item;
  addDialogCallback.value = null;
  addDialog.value = true;
}

function toTooltip(item) {
  let tooltip = '<h4>' + item.status + '</h4>';
  if (item.reason) {
    tooltip += '<br /><p>' + item.reason + '</p>';
  }
  if (item.optical_element_groups && Object.keys(item.optical_element_groups).length != 0) {
    tooltip += '<br /><p>' + (JSON.stringify(item.optical_element_groups) || '') + '</p>';
  }
  if (item.operation_modes && Object.keys(item.operation_modes).length != 0) {
    tooltip += '<br /><p>' + (JSON.stringify(item.operation_modes) || '') + '</p>';
  }
  return tooltip;
}

function setupVisItems() {
  last_end = new Date();
  if (apiItems.value) {
    // Planned statues are in a list ordered by soonest first
    apiItems.value.forEach(item => {
      keySet.add(item[props.parentKey])
      if (new Date(item.end) > last_end) {
        last_end = new Date(item.end);
      }
      visItems.add({
        group: item[props.parentKey],
        start: item.start,
        raw: item,
        end: item.end,
        className: item.status,
        title: toTooltip(item),
        editable: { updateTime: false, updateGroup: false, remove: props.editable },
        toggle: 'tooltip',
        html: true,
        type: 'range'
      });
    })
  }
}

function setupVisGroups() {
  keySet.forEach(key => {
    visGroups.add({
      id: key,
      content: '<a href=/' + props.parentKey + 's/' + key + ' >' + key + '</a>',
      title: key
    });
  })
}

async function loadAPIItems () {
  // Planned future items are only valid in the future, so cap query from now
  let url = import.meta.env.VITE_HEROIC_URL + 'api/' + props.apiEndpoint + '/?limit=1000&end_after=' + props.start;
  if (props.end) {
    url += '&start_before=' + props.end;
  }
  if (props.telescopes && !props.editable) {
    // Filter by telescope here
    props.telescopes.forEach(telescope => {
      url += '&telescope=' + telescope;
    })
  }
  if (props.editable) {
    userStore.profile.managed_observatories.forEach(observatory => {
      url += '&observatory=' + observatory;
    })
  }
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    apiItems.value = data.results;
  }})
}

async function deleteAPIItem(id) {top
  let url = import.meta.env.VITE_HEROIC_URL + 'api/' + props.apiEndpoint + '/' + id + '/';
  const response = await fetchApiCall({url: url, method: 'DELETE', credentials: 'include'});
  if (response && response.ok) {
    return true;
  }
  return false;
}

async function createAPIItem (item) {
  let url = import.meta.env.VITE_HEROIC_URL + 'api/' + props.apiEndpoint + '/';
  const response = await fetchApiCall({url: url, method: 'POST', body: item, credentials: 'include'});
  if (response) {
    return response;
  }
  return null;
}

function timelineSetup() {
  visItems.clear();
  visGroups.clear();
  keySet.clear();
  setupVisItems();
  setupVisGroups();
  timeline.setData({items: visItems, groups: visGroups});
  timeline.setWindow((new Date()).toISOString(), last_end.toISOString());
}

function timelineInitialization() {
  timeline = new Timeline(timelineDiv.value, new DataSet([]), options);
}

async function deleteItem(item) {
  if (item) {
    let success = await deleteAPIItem(item.raw.id)
    if (success) {
      // remove from the already loaded list
      apiItems.value = apiItems.value.filter(obj => obj.id !== item.raw.id);
      deleteDialogCallback.value(item);
    }
  }
  else {
    deleteDialogCallback.value(null);
  }

  deleteDialog.value = false;
}

async function addItem(item) {
  if (item) {
    let apiItem = {
      start: item.start,
      end: item.end,
      status: item.status
    }
    if (props.parentKey === 'telescope') {
      apiItem.telescope = item.group;
      apiItem.reason = item.reason || '';
    }
    else if (props.parentKey === 'instrument') {
      apiItem.instrument = item.group;
    }
    let addedItem = await createAPIItem(apiItem)
    if (addedItem) {
      // If the group didn't exist before, add it to the timeline groups data here
      if (!keySet.has(item.group)) {
        keySet.add(item.group);
        visGroups.add({
          id: item.group,
          content: '<a href=/' + props.parentKey + 's/' + item.group + ' >' + item.group + '</a>',
          title: item.group
        })
      }
      // Add the item to the already loaded list
      apiItems.value.push(addedItem);
      item.raw = addedItem;
      item.className = addedItem.status;
      item.title = toTooltip(addedItem);
      item.editable = { updateTime: false, updateGroup: false, remove: props.editable };
      item.toggle = 'tooltip';
      item.html = true;
      item.type=  'range';
      delete item.content;
      if (addDialogCallback.value) {
        addDialogCallback.value(item);
      }
      else {
        // In this case there was no callback from the timeline, so add the item to the timeline data here
        visItems.add(item);
      }
    }
  }
  else if (addDialogCallback.value) {
    addDialogCallback.value(null);
  }
  addDialog.value = false;
}

onMounted(async () => {
  await loadAPIItems();
  timelineInitialization();
  timelineSetup();
})

watch([() => props.start, () => props.end, () => props.telescopes], async () => {
  // When start/end date is changed, reload the planned data
  await loadAPIItems();
  timelineSetup();
}, { deep: true })

</script>
<template>
  <div class="mt-3">
    <h1 align="center">{{ props.editable ? 'Manage ': ''}}Planned {{ capitalize(props.type) }}
      <v-tooltip v-if="props.editable" location="bottom">
        <template v-slot:activator="{ props }">
          <v-icon v-bind="props" icon="mdi-information-variant" color="primary" size="x-small" class="info-button"></v-icon>
        </template>
        <span v-html="helpText"></span>
      </v-tooltip>
      <v-btn v-if="props.editable" icon="mdi-plus" variant="tonal" color="green" v-tooltip:bottom="'Add Planned ' + capitalize(props.type)" @click="onAddItem"></v-btn>
    </h1>
  </div>
  <div ref="timelineDiv" class="ml-4 mt-3">
  </div>
  <v-dialog v-model="deleteDialog" width="auto">
    <v-card max-width="600" :text="deleteDialogText" :title="'Delete Planned' + capitalize(props.type) + '?'">
      <template v-slot:actions>
        <v-btn text="No" variant="outlined" @click="deleteItem(null)"></v-btn>
        <v-spacer></v-spacer>
        <v-btn text="Delete" variant="outlined" @click="deleteItem(deleteDialogItem)"></v-btn>
      </template>
    </v-card>
  </v-dialog>
  <v-dialog v-model="addDialog" width="auto" height="80%">
    <v-card width="600" :title="'Add Planned ' + capitalize(props.type)">
      <v-card-text>
        <v-row>
          <v-col cols="6">
            <v-label id="add-item-start-dp-label" class="datepicker-label">{{addDialogItem.start ? "Start Date": ""}}</v-label> 
            <DatePicker v-model="addDialogItem.start" id="add-item-start-dt-picker" model-type="iso" placeholder="Start Date" label="Start" required dark></DatePicker>
          </v-col>
          <v-col cols="6">
            <v-label id="add-item-end-dp-label" class="datepicker-label">{{addDialogItem.end ? "End Date": ""}}</v-label> 
            <DatePicker v-model="addDialogItem.end" id="add-item-end-dt-picker" model-type="iso" placeholder="End Date" label="End" required dark></DatePicker>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="6">
            <v-select v-model="addDialogItem.status" label="Status" :items="['SCHEDULABLE', 'AVAILABLE', 'UNAVAILABLE']" variant="outlined"></v-select>
          </v-col>
          <v-col cols="6">
            <telescope-select v-if="props.parentKey === 'telescope'" v-model="addDialogItem.group" :multiple="false" :observatory-filter="userStore.profile.managed_observatories"></telescope-select>
            <instrument-select v-if="props.parentKey === 'instrument'" v-model="addDialogItem.group" :multiple="false" :observatory-filter="userStore.profile.managed_observatories"></instrument-select>
          </v-col>
        </v-row>
        <v-row v-if="props.parentKey === 'telescope'">
          <v-col>
            <v-textarea v-model="addDialogItem.reason" label="Reason" variant="outlined" rows="2"></v-textarea>
          </v-col>
        </v-row>
      </v-card-text>
      <template v-slot:actions>
        <v-btn text="No" variant="outlined" @click="addItem(null)" class="ml-3"></v-btn>
        <v-spacer></v-spacer>
        <v-btn text="Add" variant="outlined"  @click="addItem(addDialogItem)" class="mr-3"></v-btn>
      </template>
    </v-card>
  </v-dialog>
  <status-timeline-legend class="ml-4" max-width="1160px"></status-timeline-legend>
</template>
<style>
</style>
