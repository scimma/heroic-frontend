<script setup>
import { onMounted, ref, computed} from 'vue';
import { RouterLink, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user';
import { fetchApiCall } from '@/utils/api'

const route = useRoute()
const userStore = useUserStore()
const revokeTokenDialog = ref(false);

const userManagesObservatories = computed(() => {
  return userStore.loggedIn && userStore.profile && userStore.profile.managed_observatories;
})

function login() {
  // Login is a multi-step process through Hop-admin, so set a flag here so we know we are in the middle of a login process
  userStore.clearUserData();
  userStore.midLogin = true;
  location.href = import.meta.env.VITE_HEROIC_URL + 'auth/authenticate';
}

function logout() {
  userStore.clearUserData();
  location.href = import.meta.env.VITE_HEROIC_URL + 'auth/logout';
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(userStore.profile.api_token);
  }
  catch (err) {
    console.error('Failed to copy your api_token to clipboard - it is: ' + userStore.profile.api_token);
  }
}

async function revokeToken() {
  const url = import.meta.env.VITE_HEROIC_URL + 'api/revoke_api_token/';
  await fetchApiCall({url: url, method: 'POST', credentials: 'include', successCallback: (data) => {
      getProfile();
    }})

}

async function getProfile() {
  const url = import.meta.env.VITE_HEROIC_URL + 'api/profile/';
  await fetchApiCall({url: url, method: 'GET', credentials: 'include', successCallback: (profile) => {
    userStore.profile = profile;
    userStore.midLogin = false;
    userStore.loggedIn = true;
  }})
}

onMounted(async () => {
  // If we were in the middle of logging in, attempt to grab the csrf token and profile details
  if (userStore.midLogin) {
    await getProfile();
  }
})

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
      <v-menu>
        <template v-slot:activator="{ props }">
          <button type="button" class="navbar-item" :class="{ 'navbar-group-active': ['home', 'visibility'].includes(route.name) }" v-bind="props">
            <v-icon class="pr-2 pb-1" icon="mdi-eye-outline" size="small"></v-icon>
            Visibility
            <v-icon class="pl-1 pb-1" icon="mdi-menu-down" size="small"></v-icon>
          </button>
        </template>
        <v-list>
          <v-list-item>
            <router-link to="/" class="navbar-item">
              <v-icon class="pr-2 pb-1" icon="mdi-map" size="small"></v-icon>
              Site Map
            </router-link>
          </v-list-item>
          <v-list-item>
            <router-link to="/visibility" class="navbar-item">
              <v-icon class="pr-2 pb-1" icon="mdi-eye-outline" size="small"></v-icon>
              Target Visibility Plot
            </router-link>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-menu>
        <template v-slot:activator="{ props }">
          <button type="button" class="navbar-item" :class="{ 'navbar-group-active': ['telescopes', 'telescopeDetail', 'instruments', 'instrumentDetail'].includes(route.name) }" v-bind="props">
            <v-icon class="pr-2 pb-1" icon="mdi-table" size="small"></v-icon>
            Data Tables
            <v-icon class="pl-1 pb-1" icon="mdi-menu-down" size="small"></v-icon>
          </button>
        </template>
        <v-list>
          <v-list-item>
            <router-link to="/telescopes" class="navbar-item">
              <v-icon class="pr-2 pb-1" icon="mdi-telescope" size="small"></v-icon>
              Telescopes
            </router-link>
          </v-list-item>
          <v-list-item>
            <router-link to="/instruments" class="navbar-item">
              <v-icon class="pr-2 pb-1" icon="mdi-camera" size="small"></v-icon>
              Instruments
            </router-link>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-menu>
        <template v-slot:activator="{ props }">
          <button type="button" class="navbar-item" :class="{ 'navbar-group-active': ['pointings', 'gw-contour-map'].includes(route.name) }" v-bind="props">
            <v-icon class="pr-2 pb-1" icon="mdi-eye-outline" size="small"></v-icon>
            Pointing
            <v-icon class="pl-1 pb-1" icon="mdi-menu-down" size="small"></v-icon>
          </button>
        </template>
        <v-list>
          <v-list-item>
            <router-link to="/pointings" class="navbar-item">
              <v-icon class="pr-2 pb-1" icon="mdi-eye-outline" size="small"></v-icon>
              Pointing
            </router-link>
          </v-list-item>
          <v-list-item>
            <router-link to="/gw-contour-map" class="navbar-item">
              <v-icon class="pr-2 pb-1" icon="mdi-map-outline" size="small"></v-icon>
              GW Contour Map
            </router-link>
          </v-list-item>
        </v-list>
      </v-menu>
      <router-link
        to="/archive"
        class="navbar-item"
      >
        <v-icon class="pr-2 pb-1" icon="mdi-archive-search-outline" size="small"></v-icon>
        Archive
      </router-link>
      <v-menu v-if="userManagesObservatories">
        <template v-slot:activator="{ props }">
          <button type="button" class="navbar-item" :class="{ 'navbar-group-active': ['planning', 'planning-management'].includes(route.name) }" v-bind="props">
            <v-icon class="pr-2 pb-1" icon="mdi-calendar" size="small"></v-icon>
            Planning
            <v-icon class="pl-1 pb-1" icon="mdi-menu-down" size="small"></v-icon>
          </button>
        </template>
        <v-list>
          <v-list-item>
            <router-link to="/planning" class="navbar-item">
              <v-icon class="pr-2 pb-1" icon="mdi-calendar" size="small"></v-icon>
              Planning
            </router-link>
          </v-list-item>
          <v-list-item>
            <router-link to="/planning-management" class="navbar-item">
              <v-icon class="pr-2 pb-1" icon="mdi-calendar" size="small"></v-icon>
              Planning Management
            </router-link>
          </v-list-item>
        </v-list>
      </v-menu>
      <router-link
        v-else
        to="/planning"
        class="navbar-item"
      >
        <v-icon class="pr-2 pb-1" icon="mdi-calendar" size="small"></v-icon>
        Planning
      </router-link>
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn icon="mdi-account" variant="text" v-bind="props">
            <template v-slot>
              <v-icon :color="userStore.loggedIn ? 'success': 'text'"></v-icon>
            </template>
          </v-btn>
        </template>
        <v-list>
          <v-list-item v-if="userStore.loggedIn">
            <v-btn prepend-icon="mdi-account" readonly>{{ userStore.profile.email }}</v-btn>
          </v-list-item>
          <v-list-item v-if="userStore.loggedIn">
            <v-btn prepend-icon="mdi-content-copy" @click="copyToken()">Copy Token</v-btn>
          </v-list-item>
          <v-list-item v-if="userStore.loggedIn">
            <v-dialog v-model="revokeTokenDialog" max-width="400" persistent>
              <template v-slot:activator="{ props: activatorProps }">
                <v-btn v-bind="activatorProps" prepend-icon="mdi-lock-reset" variant="text" color="error">Revoke Token
                  <template v-slot:prepend>
                    <v-icon color="error"></v-icon>
                  </template>
                </v-btn>
              </template>
              <v-card prepend-icon="mdi-lock-reset" text="Are you sure you would you like to revoke and regenerate your HEROIC API Token?" title="Revoke API Token?">
                <template v-slot:actions>
                  <v-spacer></v-spacer>
                  <v-btn @click="revokeTokenDialog=false">No</v-btn>
                  <v-btn @click="revokeTokenDialog=false;revokeToken()">Yes</v-btn>
                </template>
              </v-card>
            </v-dialog>
          </v-list-item>
          <v-list-item v-if="userStore.loggedIn">
            <v-btn prepend-icon="mdi-logout" @click="logout">Logout</v-btn>
          </v-list-item>
          <v-list-item v-if="!userStore.loggedIn">
            <v-btn @click="login">Login</v-btn>
          </v-list-item>
          <v-divider class="my-1"></v-divider>
          <v-list-item>
            <router-link to="/about" class="navbar-item">
              <v-icon class="pr-2 pb-1" icon="mdi-certificate-outline" size="small"></v-icon>
              Acknowledgements
            </router-link>
          </v-list-item>
        </v-list>
      </v-menu>
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
  width: 180px;
  text-align:center;
}

/* Match the global link styling for the menu activator buttons */
button.navbar-item {
  color: hsla(160, 100%, 37%, 1);
  transition: 0.4s;
  padding: 3px;
}

@media (hover: hover) {
  button.navbar-item:hover {
    background-color: hsla(160, 100%, 37%, 0.2);
  }
}

.router-link-active, .navbar-group-active {
  background-color: hsla(160, 100%, 37%, 0.2);;
}

</style>
