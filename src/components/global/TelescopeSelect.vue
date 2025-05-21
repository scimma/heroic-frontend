<script setup>
import { ref, computed } from 'vue'
import { useFiltersStore } from '@/stores/filters'

const filtersStore = useFiltersStore()
const selectAllBtnStates = ref({})
const indeterminateStates = ref({})


const telescopesByObservatory = computed(() => {
  if (filtersStore.telescopes){
    let telescopes = {};
    Object.values(filtersStore.telescopes).forEach(telescope => {
      let observatory = telescope.id.split('.')[0] + ': ' + telescope.observatory_name;
      let site = telescope.id.split('.')[1] + ': ' + telescope.site_name;
      if (!(observatory in telescopes)){
        telescopes[observatory] = {};
      }
      if (!(site in telescopes[observatory])) {
        telescopes[observatory][site] = [];
      }
      telescopes[observatory][site].push({
        'id': telescope.id,
        'telescope': telescope.id.split('.')[2],
        'name': telescope.name,
        'site': telescope.site,
        'observatory': telescope.observatory
      })
    })
    return telescopes;
  }
  return [];
})

const telescopeOptions = computed(() => {
  const telescopes = telescopesByObservatory.value;
  let telescopeItems = [];
  for (const [observatory, sites] of Object.entries(telescopes)) {
    telescopeItems.push({
      props: {observatory: observatory}
    });
    for (const [site, telescopes] of Object.entries(sites)) {
      telescopeItems.push({
        props: {site: site}
      });
      telescopeItems.push(...telescopes);
      telescopeItems.push({
        props: { divider: true}
      });
    }
  }
  return telescopeItems;
})


function updateIndeterminateForObservatory(observatory) {
  const telescopes = telescopesByObservatory.value;
  let numSelected = 0;
  let totalNum = 0;
  if (telescopes[observatory]) {
    for (const site of Object.values(telescopes[observatory])) {
      for (const telescope of site) {
        totalNum += 1;
        if (filtersStore.queryParams.base.telescopes && filtersStore.queryParams.base.telescopes.includes(telescope.id)) {
          numSelected += 1;
        }
      }
    }
    if (numSelected > 0 && totalNum != numSelected) {
      indeterminateStates.value[observatory] = true;
    }
    else {
      indeterminateStates.value[observatory] = false;
    }
  }
  else {
    indeterminateStates.value[observatory] = false;
  }
}


function selectAllObservatory(selected, observatory) {
  const telescopes = telescopesByObservatory.value;
  if (telescopes[observatory]) {
    if (filtersStore.queryParams.base.telescopes == null) {
      filtersStore.queryParams.base.telescopes = [];
    }
    indeterminateStates.value[observatory] = false;
    for (const site of Object.values(telescopes[observatory])) {
      for (const telescope of site) {
        let index = filtersStore.queryParams.base.telescopes.indexOf(telescope.id);
        if (selected && index == -1) {
          filtersStore.queryParams.base.telescopes.push(telescope.id);
        }
        else if (!selected && index > -1) {
          filtersStore.queryParams.base.telescopes.splice(index, 1);
        }
      }
    }
    if (filtersStore.queryParams.base.telescopes.length == 0) {
      filtersStore.queryParams.base.telescopes = null;
    }
  }
}

</script>

<template>
  <v-select
    class="mt-6"
    variant="outlined"
    v-model="filtersStore.queryParams.base.telescopes"
    :items="telescopeOptions"
    item-value="id"
    item-title="id"
    label="Telescopes"
    v-tooltip:top="'Optional filter on Telescopes'"
    chips
    closable-chips
    multiple
    clearable
    >
    <template #item="data">
      <v-list-subheader v-if="data.props.observatory" class="pl-2 pt-10">
        <v-row>
          <v-col cols="5">
            <b style="font-size:1.2rem;">{{ data.props.observatory }}</b>
          </v-col>
          <v-col cols="2" offset="2" style="align-content:center;">
            <p class="pl-8">Select All: </p>
          </v-col>
          <v-col cols="1">
            <v-checkbox-btn v-model="selectAllBtnStates[data.props.observatory]" class="pl-4" density="compact" :indeterminate="indeterminateStates[data.props.observatory]" @update:modelValue="selectAllObservatory($event, data.props.observatory)"></v-checkbox-btn>
          </v-col>
        </v-row>
      </v-list-subheader>
      <v-list-subheader v-else-if="data.props.site">
        {{ data.props.site }}
      </v-list-subheader>
      <v-divider v-else-if="data.props.divider" />
      <v-list-item v-else v-bind="data.props" class="pl-6" @click=updateIndeterminateForObservatory(data.item.raw.observatory)>
        <v-list-item-subtitle>
          {{ data.item.id }}
        </v-list-item-subtitle>
      </v-list-item>
    </template>
  </v-select>
</template>
<style scoped>

.menu-chevron {
  left: -6px;
}

</style>
