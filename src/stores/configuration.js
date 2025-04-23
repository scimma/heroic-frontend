import { defineStore } from "pinia";

export const useConfigurationStore = defineStore("configuration", () => {
  return {
    isConfigLoaded: false,
    heroicApiBaseUrl: '',
  };
});
