import { defineStore } from "pinia";
import { fetchApiCall } from '@/utils/api'

export const useFiltersStore = defineStore("filters", {
  state() {
    return {
      queryParams: {
        base: {
          start: null,
          end: null,
          telescopes: null,
          max_airmass: 2.0,
          min_lunar_distance: 0.0,
          max_lunar_phase: 1.0,
        },
        siderealTarget: {
          ra: null,
          dec: null,
          proper_motion_ra: null,
          proper_motion_dec: null,
          epoch: 2000.0,
          parallax: null
        },
        nonSiderealTarget: {
          epoch_of_elements: null,
          epoch_of_perihelion: null,
          orbital_inclination: null,
          longitude_of_ascending_node: null,
          longitude_of_perihelion: null,
          argument_of_perihelion: null,
          mean_distance: null,
          perihelion_distance: null,
          eccentricity: null,
          mean_anomaly: null,
          daily_motion: null
        }
      },
      telescopes: null,
      filteredTelescopes: [],
      targetName: null,
      targetType: 'SIDEREAL',
      nonSiderealType: null,
      visibilityAbort: null,
      airmassAbort: null,
      loadingVisibility: false,
      loadingAirmass: false,
      visibilityResults: null,
      visibilityErrors: {},
      airmassResults: null,
      airmassErrors: {}
    };
  },
  getters: {
    getInstrument: (state) => (inst_id) => {
      return state.getTelescopeForInstrument(inst_id).instruments.filter(inst => inst.id == inst_id)[0] || {};
    },
    getTelescopeForInstrument: (state) => (inst_id) => {
      let telescope_id = inst_id.split('.').slice(0, 3).join('.');
      return state.telescopes ? state.telescopes[telescope_id] || {} : {};
    },
    visilibityInput(state) {
      let queryPayload = Object.fromEntries(Object.entries(state.queryParams.base).filter(([key, value]) => value == 0 || value))
      if (state.targetType == 'SIDEREAL') {
        queryPayload = Object.assign(
          queryPayload,
          Object.fromEntries(Object.entries(state.queryParams.siderealTarget).filter(([key, value]) => value == 0 || value))
        )
      }
      else {
        queryPayload = Object.assign(
          queryPayload,
          Object.fromEntries(Object.entries(state.queryParams.nonSiderealTarget).filter(([key, value]) => value == 0 || value))
        )
      }
      return queryPayload;
    }
  },
  actions: {
    async queryVisibilityAndAirmass() {
      if (this.loadingVisibility && this.visibilityAbort) {
        this.visibilityAbort.signal.onabort = () => {
          this.queryVisibility();
        }
        this.visibilityAbort.abort();
      }
      else {
        this.queryVisibility();
      }
    },
    async queryVisibility() {
      this.visibilityAbort = new AbortController();
      let queryPayload = this.visilibityInput;
      this.loadingVisibility = true;
      this.visibilityResults = null;
      this.filteredTelescopes = Object.values(this.telescopes);
      this.airmassResults = null;  // Also clear the airmass results since querying visibility then queries airmass after
      this.visibilityErrors = {};
      const url = import.meta.env.VITE_HEROIC_API_URL + 'visibility/intervals';
      fetchApiCall({url: url, method: 'POST', body:queryPayload, signal:this.visibilityAbort.signal, successCallback: (data) => {
        this.visibilityResults = data;
        this.loadingVisibility = false;
        this.visibilityAbort = null;
        var telescopesWithVisibility = Object.keys(data).filter(key => data[key].length);
        if (telescopesWithVisibility) {
          if (this.telescopes){
            this.filteredTelescopes = Object.values(this.telescopes).filter(obj => telescopesWithVisibility.includes(obj['id']))
          }
          this.queryAirmass(telescopesWithVisibility);
        }
      }, failCallback: (errors) => {
        if (errors.name != 'AbortError'){
          this.visibilityErrors = errors;
          this.loadingVisibility = false;
          this.visibilityAbort = null;
        }
        console.error('Failed to get target visibility intervals: ' + errors);
      }})
    },
    async queryAirmass(telescopesOverride) {

      if (this.loadingAirmass) {
        this.airmassAbort.abort();
      }
      if (this.filteredTelescopes.length == 0) {
        this.airmassErrors = {'Error': 'No telescopes have visibility. Please edit your parameters and try again.'};
        this.loadingAirmass = false;
      }
      else {
        this.airmassAbort = new AbortController();
        let queryPayload = this.visilibityInput;
        queryPayload.telescopes = telescopesOverride;
        this.loadingAirmass = true;
        this.airmassErrors = {};
        const url = import.meta.env.VITE_HEROIC_API_URL + 'visibility/airmass';
        fetchApiCall({url: url, method: 'POST', body:queryPayload, signal:this.airmassAbort.signal, successCallback: (data) => {
          this.airmassResults = data;
          this.loadingAirmass = false;
          this.airmassAbort = null;
        }, failCallback: (errors) => {
          this.airmassErrors = errors;
          console.error('Failed to get target airmass: ' + errors);
          this.loadingAirmass = false;
          this.airmassAbort = null;
        }})
      }
    }
  }
});
