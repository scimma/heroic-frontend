import { defineStore } from "pinia";
import { fetchApiCall } from '@/utils/api'

export const useFiltersStore = defineStore("filters", {
  state() {
    return {
      queryParams: {
        base: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          end: new Date().toISOString(), // Now
          telescopes: ['ligo.hanford.h1', 'ligo.livingston.l1', 'virgo.cascina.v1', 'kagra.kamioka.k1'], // All GW detectors
          max_airmass: 2.0,
          min_lunar_distance: 0.0,
          max_lunar_phase: 1.0,
        },
        siderealTarget: {
          ra: 197.450375, // NGC 4993 (host of GW170817)
          dec: -23.38148,  // NGC 4993 (host of GW170817)
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
      targetName: 'NGC 4993',  // Default to NGC 4993 (GW170817 host)
      targetType: 'SIDEREAL',
      nonSiderealType: null,
      visibilityAbort: null,
      airmassAbort: null,
      loadingVisibility: false,
      loadingAirmass: false,
      visibilityResults: null,
      visibilityErrors: {},
      airmassResults: null,
      airmassErrors: {},
      // GW visibility
      loadingGWVisibility: false,
      gwVisibilityResults: null,
      gwVisibilityErrors: {},
      gwVisibilityAbort: null
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
      
      // Check if we have the required target coordinates
      if (this.targetType === 'SIDEREAL' && (!queryPayload.ra || !queryPayload.dec)) {
        this.loadingVisibility = false;
        this.visibilityErrors = {'Error': 'Target coordinates (RA/Dec) are required'};
        return;
      }
      
      this.loadingVisibility = true;
      this.visibilityResults = null;
      this.filteredTelescopes = Object.values(this.telescopes);
      this.airmassResults = null;  // Also clear the airmass results since querying visibility then queries airmass after
      this.visibilityErrors = {};
      const url = import.meta.env.VITE_HEROIC_URL + 'api/visibility/intervals';
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
        const url = import.meta.env.VITE_HEROIC_URL + 'api/visibility/airmass';
        fetchApiCall({url: url, method: 'POST', body:queryPayload, signal:this.airmassAbort.signal, successCallback: (data) => {
          this.airmassResults = data;
          this.loadingAirmass = false;
          this.airmassAbort = null;
        }, failCallback: (errors) => {
          this.airmassErrors = errors;
          this.loadingAirmass = false;
          this.airmassAbort = null;
        }})
      }
    },
    async queryGWVisibility() {
      // Cancel any existing query
      if (this.gwVisibilityAbort) {
        this.gwVisibilityAbort.abort();
      }
      
      this.gwVisibilityAbort = new AbortController();
      
      // Check if we have required coordinates
      if (!this.queryParams.siderealTarget.ra || !this.queryParams.siderealTarget.dec) {
        this.gwVisibilityErrors = {'Error': 'RA and Dec coordinates are required for GW visibility'};
        return;
      }
      
      // Build query payload
      let queryPayload = {
        ra: this.queryParams.siderealTarget.ra,
        dec: this.queryParams.siderealTarget.dec,
        start: this.queryParams.base.start,
        end: this.queryParams.base.end,
        time_resolution_minutes: 30 // Default 30 minute resolution
      };
      
      // Add specific telescopes if selected
      if (this.queryParams.base.telescopes && this.queryParams.base.telescopes.length > 0) {
        // Filter to only include GW detectors
        const gwTelescopes = this.queryParams.base.telescopes.filter(t => 
          t.includes('ligo') || t.includes('virgo') || t.includes('kagra')
        );
        if (gwTelescopes.length > 0) {
          queryPayload.telescopes = gwTelescopes;
        }
      }
      
      this.loadingGWVisibility = true;
      this.gwVisibilityErrors = {};
      
      const url = import.meta.env.VITE_HEROIC_URL + 'api/gw/visibility';
      fetchApiCall({
        url: url, 
        method: 'POST', 
        body: queryPayload, 
        signal: this.gwVisibilityAbort.signal,
        successCallback: (data) => {
          this.gwVisibilityResults = data;
          this.loadingGWVisibility = false;
          this.gwVisibilityAbort = null;
        }, 
        failCallback: (errors) => {
          if (errors.name != 'AbortError') {
            this.gwVisibilityErrors = errors;
            this.loadingGWVisibility = false;
            this.gwVisibilityAbort = null;
          }
        }
      });
    }
  }
});
