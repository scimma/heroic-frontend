<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <v-app-bar>
    <v-app-bar-title>HEROIC</v-app-bar-title>
    <template v-slot:append>
      <router-link
        to="/"
        class="navbar-item"
      >
        Home
      </router-link>
      <router-link
        to="/visibility"
        class="navbar-item"
      >
        Target Visibility
      </router-link>
      <router-link
        to="/telescopes"
        class="navbar-item"
      >
        Telescopes
      </router-link>
      <router-link
        to="/instruments"
        class="navbar-item"
      >
        Instruments
      </router-link>
      <router-link
        to="/about"
        class="navbar-item"
      >
        About
      </router-link>
    </template>
  </v-app-bar>
</template>
<style scoped>

.navbar-item {
  width: 200px;
  text-align:center;
}

.router-link-active {
  background-color: hsla(160, 100%, 37%, 0.1);;
}

</style>
