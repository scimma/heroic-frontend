<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import L from 'leaflet'
import 'leaflet.markercluster/dist/leaflet.markercluster.js'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import terminator from '@joergdietrich/leaflet.terminator';

const router = useRouter();

const props = defineProps({
  telescopes: {
    type: Array,
    required: true
  }
})

let imageMap = null;
const leafletDiv = ref(null);
let markers = null;

const GOOD_COLOR = 'darkgreen';
const PARTIAL_COLOR = 'goldenrod';
const BAD_COLOR = 'darkred';

onMounted(() => {
  leafletSetup();
  loadTelescopeIcons();
})

watch(() => props.telescopes, () => {
  loadTelescopeIcons();
})


function createTelescopeIcon(telescope) {
  var color = telescope.status === 'AVAILABLE' || telescope.status === 'SCHEDULABLE' ? GOOD_COLOR: BAD_COLOR
  return L.divIcon({
    className: 'custom-div-icon',
    html: "<div class='marker-pin' style='background:" + color + ";'></div><i class='mdi mdi-telescope'></i>",
    iconSize: [30, 42],
    iconAnchor: [15, 42]
  });
}

function loadTelescopeIcons() {
  if (markers) {
    imageMap.removeLayer(markers);
    markers = null;
  }
  markers = L.markerClusterGroup({
    iconCreateFunction: function(cluster) {
      var childrenMarkers = cluster.getAllChildMarkers();
      var color;
      if (childrenMarkers.every((el) => (el.telescopeStatus === 'AVAILABLE' || el.telescopeStatus === 'SCHEDULABLE'))) {
        color = GOOD_COLOR;
      }
      else if(childrenMarkers.every((el) => el.telescopeStatus === 'UNAVAILABLE')) {
        color = BAD_COLOR;
      }
      else {
        color = PARTIAL_COLOR
      }
      var markerClass = 'marker-group';
      if (cluster.getChildCount() >= 10) {
        markerClass = 'marker-group-big';
      }
      return L.divIcon({
        className: 'custom-div-icon',
        html: "<div class='marker-pin' style='background:" + color + ";'></div><i class='" + markerClass + "'>" + cluster.getChildCount() + "</i>"
      })
    }
  });
  for (var i = 0; i < props.telescopes.length; i++) {
    const telescope = props.telescopes[i];
    var marker = L.marker(new L.LatLng(telescope.latitude, telescope.longitude), {title: telescope.name, icon: createTelescopeIcon(telescope)});
    marker.telescopeStatus = telescope.status;
    var popup = document.createElement('a');
    popup.textContent = telescope.name;
    popup.style.cursor = 'pointer';
    popup.addEventListener('click', function() {
      goToTelescope(telescope.id);
    })
    marker.bindPopup(popup);
    markers.addLayer(marker);
  }
  imageMap.addLayer(markers);
}

function goToTelescope(id) {
  router.push({name: 'telescopeDetail', params: {id: id}});
}

function leafletSetup(){
  // Create leaflet map (here referred to as image)
  imageMap = L.map(leafletDiv.value, {minZoom: 2, maxZoom: 10, dragging: false}).setView([0, 0], 2);
  imageMap.on('zoomend', function(e) {
    if (e.target._zoom == 2) {
      // Snap back to center at minimum zoom to fill screen
      imageMap.setView([0, 0], 2);
    }
  })
  terminator().addTo(imageMap);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {noWrap: true}).addTo(imageMap);
}

</script>
<template>
  <div ref="leafletDiv" class="world-map"></div>
</template>
<style>
.world-map {
    height: 80vh;
    width: 1024px;
    margin-left: auto;
    margin-right: auto;
}

.available-telescope {
  color: white;
}

.unavailable-telescope {
  color: orangered;
}

.marker-pin {
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 50% 0;
  background: darkgreen;
  position: absolute;
  transform: rotate(-45deg);
  left: 50%;
  top: 50%;
  margin: -15px 0 0 -15px;
}

.marker-pin::after {
    content: '';
    width: 24px;
    height: 24px;
    margin: 3px 0 0 3px;
    position: absolute;
    border-radius: 50%;
 }

.custom-div-icon i {
   position: absolute;
   font-size: 22px;
   left: 0;
   right: 0;
   margin: 4px auto;
   text-align: center;
}

.marker-group {
  bottom: -15px;

}

.marker-group-big {
  bottom: -15px;
  margin-left: -6px !important;
}

</style>