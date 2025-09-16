<script setup>
import PlannedTimeline from '@/components/PlannedTimeline.vue';

</script>
<template>
  <planned-timeline type="status" parent-key="telescope" api-endpoint="planned-telescope-statuses" :editable="true"></planned-timeline>
  <br />
  <planned-timeline type="capability" parent-key="instrument" api-endpoint="planned-instrument-capabilities" :editable="true"></planned-timeline>
</template>
<style>

</style>
