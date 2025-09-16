<script setup>
import { computed } from 'vue'

const props = defineProps({
  includeVisibility: {
    type: Boolean,
    default: false
  },
  includeSun: {
    type: Boolean,
    default: false
  },
  maxWidth: {
    type: String,
    default: "800px"
  }
})

const baseLegendItems = {
  AVAILABLE: 'Available',
  SCHEDULABLE: 'Queue Schedulable',
  UNAVAILABLE: 'Not Available',
}

const legendItems = computed(() => {
  var items = {...baseLegendItems};
  if (props.includeVisibility) {
    items.VISIBLE = 'Target Visible';
  }
  if (props.includeSun) {
    items.SUNUP = 'Sun Up';
  }
  return items;
})

</script>
<template>
  <div class="timeline-legend">
    <v-list class="d-flex flex-row justify-center dark-background" variant="text" :max-width="props.maxWidth">
        <v-list-item v-for="(text, className) in legendItems">
            <span class="legend-item mb-1 mr-1" :class="className"></span>
            {{ text }}
        </v-list-item>
      </v-list>
  </div>
</template>
<style>

.dark-background {
  background: var(--v-theme-background);
}

.legend-item {
    width: 18px;
    height: 12px;
    display: inline-block;
    vertical-align: middle !important;
}

.VISIBLE {
  background-color: rgb(185, 115, 234);
  border-color: rgb(167, 71, 234);
}
.AVAILABLE {
  background-color: cyan;
  border-color: cyan;
}
.UNAVAILABLE {
  background-color: coral;
  border-color: coral;
}
.SCHEDULABLE {
  background-color: lightgreen;
  border-color: lightgreen;
}
.SUNUP {
  background-color: lightyellow !important;
}
</style>
