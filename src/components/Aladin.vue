<script setup>
import { ref, watch, onMounted } from 'vue';
import { useFiltersStore } from '@/stores/filters'
import A from 'aladin-lite';
import P from 'aladin-lite';

const props = defineProps({
  pointings: {
    type: Array,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  dateOrder: {
    type: String,
    default: 'desc'
  }
})

const filtersStore = useFiltersStore()

const selectedIds = defineModel();
const aladinDiv = ref(null);
const overlays = ref({});
const pointingToPolygon = ref({});
let aladin = null;

const emit = defineEmits(['refresh-table']);

onMounted(() => {
  // Initialize Aladin Lite once the component is mounted
  aladin = A.aladin(aladinDiv.value, {
    survey: 'P/DSS2/color', // Initial survey
    fov: 0.5, // Initial field of view in degrees
  });
  if (filtersStore.isSiderealTargetComplete) {
    aladin.gotoRaDec(filtersStore.queryParams.siderealTarget.ra, filtersStore.queryParams.siderealTarget.dec);
    aladin.setZoomFactor(0.1);
  }
  else {
    aladin.setZoomFactor(1);
  }
  // Scheme for linking up selection between the aladin overlays and table of pointings
  aladin.on('objectClicked', function(object, xyMouseCoords) {
    if (object) {
      let index = selectedIds.value.indexOf(object.pointing.id);
      if (index != -1) {
        selectedIds.value.splice(index, 1);
        object.selectionColor = object.originalColor;
        object.color = object.originalColor;
        object.lineWidth = 2;
        emit('refresh-table');
      }
      else {
        selectedIds.value.push(object.pointing.id);
        object.selectionColor = '#ffffff';
        object.color = '#ffffff';
        object.lineWidth = 4;
        emit('refresh-table');
      }
    }
    else {
      selectedIds.value = [];
      emit('refresh-table');
    }
    
  })

});

function getPointing(id) {
  return props.pointings.filter(pointing => pointing.id == id)[0];
}

function uniqueHues(numItems) {
  if (numItems < 1) {
    numItems = 1;
  }
  const hues = [];
  for (let i = 0; i < numItems; i++) {
    hues.push((i * (360.0 / numItems)) % 360);
  }
  return hues;
}

function addOverlaysFromPointings() {
    // First clear the existing overlays from the map
    aladin.removeOverlays();
    overlays.value = {};
    pointingToPolygon.value = {};
    let overlaysToAdd = {};
    // Then get a list of all pointings we plan to add
    props.pointings.forEach(pointing => {
        let instrument = pointing.instrument.substr(pointing.instrument.indexOf('.', 2)+1);
        if (!(instrument in overlays.value)) {
            overlaysToAdd[instrument] = [];
            overlays.value[instrument] = A.graphicOverlay({name: instrument, color: '#f00', lineWidth: 2});;
        }
        let footprint = pointing.field.substring(pointing.field.indexOf('((')+2, pointing.field.length-2).split(',');
        footprint = footprint.map(fp => {
            return fp.trim().split(' ').map(Number);
        })
        overlaysToAdd[instrument].push([pointing, footprint]);
    })
    // Get a set of unique colors for those pointings per instrument they are associated with
    const huesArray = uniqueHues(Object.keys(overlaysToAdd).length);
    Object.keys(overlays.value).forEach((instrument, hueIndex) => {
      const numFootprints = overlaysToAdd[instrument].length - 1;
        overlaysToAdd[instrument].forEach(([pointing, footprint], index) => {
          // Set the lightness to be lighter the more recent the pointing is, between 15% and 75%
          const lightness = props.dateOrder == 'desc' ? (((numFootprints - index) / numFootprints) * 60) + 15: (((index) / numFootprints) * 60) + 15
          let color = `hsl(${huesArray[hueIndex]}, 100%, ${lightness}%)`;
          let polygon = A.polygon(footprint, {color: color, selectionColor: color, onClick: 'ignore', popupTitle:`${instrument}: ${pointing.date}`, popupDesc: `${pointing.ra}, ${pointing.dec}`})
          polygon.pointing = pointing;
          polygon.originalColor = color;
          pointingToPolygon.value[pointing.id] = polygon;
          overlays.value[instrument].addFootprints(polygon);
        })
        aladin.addOverlay(overlays.value[instrument]);
    })
}

function selectPointings() {
  // Cannot just programmatically select/deselect overlays in aladin, so need to change the selection and normal color
  // and keep track of the selected set ourselves
  Object.keys(pointingToPolygon.value).forEach(pointingId => {
    if (selectedIds.value.includes(parseInt(pointingId))) {
      pointingToPolygon.value[pointingId].selectionColor = '#ffffff';
      pointingToPolygon.value[pointingId].color = '#ffffff';
      pointingToPolygon.value[pointingId].lineWidth = 4;
    }
    else {
      pointingToPolygon.value[pointingId].selectionColor = pointingToPolygon.value[pointingId].originalColor;
      pointingToPolygon.value[pointingId].color = pointingToPolygon.value[pointingId].originalColor;
      pointingToPolygon.value[pointingId].lineWidth = 2;
    }
  })
}

watch(
  () => props.pointings, () => {
    addOverlaysFromPointings();
  }
);

watch(
  () => selectedIds.value, () => {
    selectPointings();
    // Move visualization to the last selected pointing
    const pointing = getPointing(selectedIds.value[selectedIds.value.length - 1]);
    if (pointing) {
      aladin.gotoRaDec(pointing.ra, pointing.dec);
    }
  }, {deep: true}
);

watch(
  () => [filtersStore.queryParams.siderealTarget.ra, filtersStore.queryParams.siderealTarget.dec], () => {
    aladin.gotoRaDec(filtersStore.queryParams.siderealTarget.ra, filtersStore.queryParams.siderealTarget.dec);
    aladin.setZoomFactor(0.1);
  }
);

</script>

<template>
  <!-- Container for Aladin Lite -->
  <div style="position: relative; height:400px;">
    <div ref="aladinDiv" style="height: 100%;">
    </div>
    <v-progress-circular v-if="props.loading" class="progress-overlay" indeterminate size="100" width="5" color="secondary"></v-progress-circular>
  </div>
</template>
<style>
.progress-overlay {
  position:absolute;
  display:flex;
  justify-self:center;
  align-self:center;
  top:0;
  bottom:0;
  left:0;
  right:0;
  z-index:999;
}
</style>