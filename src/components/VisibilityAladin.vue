<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { useFiltersStore } from '@/stores/filters'
import A from 'aladin-lite';

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  mocHeatmap: {
    // { telescopeId: { max_order, num_bins, dark_hours, moc: { "<binValue>": { "<order>": [pixels] } } } }
    type: Object,
    default: null
  },
  contour: {
    // GeoJSON FeatureCollection of credible-level contours (MultiLineString, [ra,dec] deg)
    type: Object,
    default: null
  }
})

const filtersStore = useFiltersStore()

const aladinDiv = ref(null);
let aladin = null;

// Tooltip showing the heatmap value under the cursor: { label, x, y } or null
const hoverValue = ref(null);

// Visibility heatmap MOC layers, one color per telescope
let heatmapMocs = [];
// Bumped on every clear so layers that are still loading when a newer render
// happens can remove themselves once their async parse finishes
let heatmapGeneration = 0;

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

function telescopeHues() {
  // Map each telescope id to a distinct hue using evenly spaced unique hues
  const telescopes = props.mocHeatmap ? Object.keys(props.mocHeatmap) : [];
  const hues = uniqueHues(telescopes.length);
  const result = {};
  telescopes.forEach((telescope, index) => {
    result[telescope] = hues[index];
  });
  return result;
}

// Encode the visibility value (0-1) as lightness within the telescope's hue.
// Using an opaque color per bin (rather than varying layer opacity) avoids the
// bright/dark seam artifacts that come from stacking many semi-transparent fills.
function binColor(hue, value) {
  return `hsl(${hue}, 100%, ${25 + value * 55}%)`;
}

// Per-bin moc, color and average-hours/night label for a telescope's heatmap
function heatmapBins(telescope) {
  const hue = telescopeHues()[telescope];
  const { moc: bins, num_bins: numBins, dark_hours: darkHours } = props.mocHeatmap[telescope];
  const start = filtersStore.queryParams.base.start;
  const end = filtersStore.queryParams.base.end;
  const days = start && end ? (new Date(end) - new Date(start)) / 86400000 : 1;
  const numDays = days > 0 ? days : 1;
  // Each bin key is its upper visibility fraction (0-1); use the bin midpoint to
  // estimate the average hours of visibility per night
  return Object.keys(bins).map(binValue => {
    const upper = parseFloat(binValue);
    const midFraction = Math.max(0, upper - 0.5 / numBins);
    const avgPerNight = midFraction * darkHours / numDays;
    return { upper, moc: bins[binValue], color: binColor(hue, upper), label: `~${avgPerNight.toFixed(1)} hours/night` };
  });
}

const heatmapLegend = computed(() => {
  if (!props.mocHeatmap) return [];
  return Object.keys(props.mocHeatmap).map(telescope => ({
    telescope,
    // Highest visibility (most hours/night) first
    bins: heatmapBins(telescope).sort((a, b) => b.upper - a.upper)
  }));
});

const contourLegend = computed(() => {
  if (!props.contour || !props.contour.features) return [];
  return props.contour.features.map(feature => ({
    label: `${feature.properties.credible_level}% credible region`,
    color: contourColor(feature.properties.credible_level)
  }));
});

function clearHeatmap() {
  if (!aladin) return;
  // Invalidate any layers still loading so their success callback deletes them
  heatmapGeneration++;
  // .delete() removes the MOC from the WASM renderer (removeOverlay() only takes
  // it out of the layer list but leaves it drawn on the view)
  heatmapMocs.forEach(moc => moc.delete());
  heatmapMocs = [];
}

function addHeatmapMoc(mocJson, color, label) {
  const generation = heatmapGeneration;
  // successCallback is the 3rd positional arg of MOCFromJSON and fires once the
  // MOC has been parsed and drawn into the renderer
  const moc = A.MOCFromJSON(mocJson, {
    fill: true,
    perimeter: false,
    edge: true,
    lineWidth: 2,
    fillColor: color,
    color: color,
    opacity: 1
  }, (loadedMoc) => {
    // Remember the bin's label so it can be shown when hovering over the region
    loadedMoc.binLabel = label;
    if (generation !== heatmapGeneration) {
      // Cleared while still loading; remove now that it exists in the renderer
      loadedMoc.delete();
    } else {
      // Track the loaded MOC so we can delete() it on the next clear
      heatmapMocs.push(loadedMoc);
    }
  });
  // addMOC sets the MOC's view and triggers the async parse/draw (and the callback)
  aladin.addMOC(moc);
}

function renderHeatmap() {
  if (!aladin) return;
  clearHeatmap();
  if (!props.mocHeatmap) return;
  Object.keys(props.mocHeatmap).forEach(telescope => {
    heatmapBins(telescope).forEach(bin => {
      addHeatmapMoc(bin.moc, bin.color, bin.label);
    });
  });
}

// GW credible-level contour polylines, drawn on the 2D canvas above the MOC layers
let contourOverlay = null;

function contourColor(credibleLevel) {
  // Distinct colors so the credible levels are distinguishable over the heatmap
  return credibleLevel >= 90 ? '#ffffff' : '#00ff00';
}

function renderContour() {
  if (!aladin) return;
  // Remove any existing contour overlay and recreate it so it is re-added on top
  // of the current MOC layers (re-rendering the heatmap can otherwise leave the
  // contour hidden or dropped)
  if (contourOverlay) {
    aladin.view.removeOverlay(contourOverlay);
    contourOverlay = null;
  }
  if (!props.contour || !props.contour.features) return;
  contourOverlay = A.graphicOverlay({ name: 'GW Contour', color: '#ffffff', lineWidth: 2 });
  aladin.addOverlay(contourOverlay);
  props.contour.features.forEach(feature => {
    const color = contourColor(feature.properties.credible_level);
    // MultiLineString: one entry per (closed) ring of the credible region
    feature.geometry.coordinates.forEach(ring => {
      contourOverlay.add(A.polyline(ring, { color: color, lineWidth: 2 }));
    });
  });
}

onMounted(() => {
  // Initialize Aladin Lite once the component is mounted
  aladin = A.aladin(aladinDiv.value, {
    survey: 'P/DSS2/color', // Initial survey
    fov: 0.5, // Initial field of view in degrees
    cooFrame: 'icrs'
  });
  // Zoom out to the whole sky so the full heatmap is visible
  aladin.setFoV(180);
  // Show the heatmap value in a tooltip when hovering over a bin region
  aladin.on('mouseMove', (e) => {
    if (e.ra === undefined) {
      hoverValue.value = null;
      return;
    }
    const hit = heatmapMocs.find(moc => moc.ready && moc.contains(e.ra, e.dec));
    hoverValue.value = hit ? { label: hit.binLabel, x: e.x, y: e.y } : null;
  });
  if (props.mocHeatmap) {
    renderHeatmap();
  }
  if (props.contour) {
    renderContour();
  }
});

watch(
  () => props.mocHeatmap, () => {
    renderHeatmap();
    // Re-draw the contour so it stays on top of the refreshed MOC layers
    renderContour();
  }
);

watch(
  () => props.contour, () => {
    renderContour();
  }
);

</script>

<template>
  <!-- Container for Aladin Lite -->
  <div style="position: relative; height:400px;" @mouseleave="hoverValue = null">
    <div ref="aladinDiv" style="height: 100%;">
    </div>
    <div
      v-if="hoverValue"
      class="heatmap-tooltip"
      :style="{ left: hoverValue.x + 'px', top: hoverValue.y + 'px' }"
    >
      {{ hoverValue.label }}
    </div>
    <v-progress-circular v-if="props.loading" class="progress-overlay" indeterminate size="100" width="5" color="secondary"></v-progress-circular>
    <div v-if="heatmapLegend.length || contourLegend.length" class="heatmap-legend">
      <div v-for="group in heatmapLegend" :key="group.telescope" class="heatmap-legend-group">
        <div class="heatmap-legend-title">{{ group.telescope }}</div>
        <div v-for="bin in group.bins" :key="bin.upper" class="heatmap-legend-item">
          <span class="heatmap-legend-swatch" :style="{ backgroundColor: bin.color }"></span>
          {{ bin.label }}
        </div>
      </div>
      <div v-for="item in contourLegend" :key="item.label" class="heatmap-legend-item">
        <span class="heatmap-legend-swatch" :style="{ backgroundColor: item.color }"></span>
        {{ item.label }}
      </div>
    </div>
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

.heatmap-tooltip {
  position: absolute;
  z-index: 1000;
  transform: translate(12px, 12px);
  pointer-events: none;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.heatmap-legend {
  position: absolute;
  top: 40px;
  right: 4px;
  max-height: 92%;
  overflow-y: auto;
  z-index: 999;
  background: rgba(0, 0, 0, 0.6);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #fff;
}

.heatmap-legend-group {
  margin-bottom: 6px;
}

.heatmap-legend-title {
  font-weight: bold;
  margin-bottom: 2px;
}

.heatmap-legend-item {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.heatmap-legend-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 6px;
  border-radius: 2px;
}
</style>
