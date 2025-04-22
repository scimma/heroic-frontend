<script setup>
import NavBar from './components/global/NavBar.vue'

</script>

<template>
  <v-app>
    <nav-bar />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<style scoped>

</style>
