<script setup>
import { onMounted, ref} from 'vue';
import { RouterLink } from 'vue-router'
import { useUserStore } from '@/stores/user';
import { fetchApiCall } from '@/utils/api'

const userStore = useUserStore()
const revokeTokenDialog = ref(false);

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
  width: 200px;
  text-align:center;
}

.router-link-active {
  background-color: hsla(160, 100%, 37%, 0.1);;
}

</style>
