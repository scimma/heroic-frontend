import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state() {
    return {
      loggedIn: false,
      midLogin: false,
      csrfToken: '',
      profile: {},
    };
  },
  actions: {
    clearUserData() {
      this.loggedIn = false;
      this.midLogin = false;
      this.profile = {};
      this.csrfToken = '';
    }
  },
  persist: true
});
