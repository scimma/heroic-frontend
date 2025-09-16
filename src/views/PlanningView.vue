<script setup>
import PlannedTimeline from '@/components/PlannedTimeline.vue';
import { useFiltersStore } from '@/stores/filters'

const filtersStore = useFiltersStore()

</script>
<template>
  <planned-timeline
    type="status"
    parent-key="telescope"
    api-endpoint="planned-telescope-statuses"
    :editable="false"
    :start="filtersStore.queryParams.base.start || (new Date()).toISOString()"
    :end="filtersStore.queryParams.base.end || null"
    :telescopes="filtersStore.queryParams.base.telescopes"
  ></planned-timeline>
  <br />
  <planned-timeline
    type="capability"
    parent-key="instrument"
    api-endpoint="planned-instrument-capabilities"
    :editable="false"
    :start="filtersStore.queryParams.base.start || (new Date()).toISOString()"
    :end="filtersStore.queryParams.base.end || null"
    :telescopes="filtersStore.queryParams.base.telescopes"
    ></planned-timeline>
</template>
<style>

</style>
