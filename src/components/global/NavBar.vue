<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <v-app-bar>
    <v-app-bar-title>
      HER
      <img
        class="scimma-o"
        src="https://scimma.org/static/imgs/logos/logo_transparent.png"
        height="28px"
        width="28px">
      </img>
      IC
    </v-app-bar-title>
    <template v-slot:append>
      <router-link
        to="/"
        class="navbar-item"
      >
        <v-icon class="pr-2 pb-1" icon="mdi-home" size="small"></v-icon>
        Home
      </router-link>
      <router-link
        to="/visibility"
        class="navbar-item"
      >
        <v-icon class="pr-2 pb-1" icon="mdi-eye-outline" size="small"></v-icon>
        Target Visibility
      </router-link>
      <router-link
        to="/telescopes"
        class="navbar-item"
      >
        <v-icon class="pr-2 pb-1" icon="mdi-telescope" size="small"></v-icon>
        Telescopes
      </router-link>
      <router-link
        to="/instruments"
        class="navbar-item"
      >
        <v-icon class="pr-2 pb-1" icon="mdi-camera" size="small"></v-icon>
        Instruments
      </router-link>
      <router-link
        to="/about"
        class="navbar-item"
      >
        <v-icon class="pr-2 pb-1" icon="mdi-help" size="small"></v-icon>
        About
      </router-link>
    </template>
  </v-app-bar>
</template>
<style scoped>

.scimma-o {
  position: relative;
  top: 6px;
  margin-left: -4px;
  margin-right: -4px;
}

.navbar-item {
  width: 200px;
  text-align:center;
}

.router-link-active {
  background-color: hsla(160, 100%, 37%, 0.1);;
}

</style>
