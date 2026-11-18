<script setup>
import { computed, nextTick } from 'vue'
import { useFiltersStore } from '@/stores/filters'

const model = defineModel()
const filtersStore = useFiltersStore()

const props = defineProps({
  observatoryFilter: {
    type: Array,
    required: false
  },
  multiple: {
    type: Boolean,
    default: true
  },
  includeTooltip: {
    type: Boolean,
    default: false
  }
})

const tooltip = computed(() => {
  if (props.includeTooltip) {
    return 'Optional filter on Telescopes';
  }
  return null;
})

const telescopesByObservatory = computed(() => {
  if (filtersStore.telescopes){
    let telescopes = {};
    Object.values(filtersStore.telescopes).forEach(telescope => {
      if (!props.observatoryFilter || props.observatoryFilter.includes(telescope.observatory)) {
        let observatory = telescope.observatory + ': ' + telescope.observatory_name;
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
          'observatory': observatory
        })
      }
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

const selectAllStates = computed(() => {
  let states = {};
  const telescopes = telescopesByObservatory.value;
  for (const observatory of Object.keys(telescopes)) {
    let numSelected = 0;
    let totalNum = 0;
    for (const site of Object.values(telescopes[observatory])) {
      for (const telescope of site) {
        totalNum += 1;
        if (model.value && model.value.includes(telescope.id)) {
          numSelected += 1;
        }
      }
    }
    states[observatory] = {
      selected: numSelected > 0 && totalNum == numSelected,
      indeterminate: numSelected > 0 && totalNum != numSelected
    };
  }
  return states;
})

async function selectAllObservatory(selected, observatory) {
  const telescopes = telescopesByObservatory.value;
  if (telescopes[observatory]) {
    if (model.value == null) {
      model.value = [];
      await nextTick();
    }
    for (const site of Object.values(telescopes[observatory])) {
      for (const telescope of site) {
        let index = model.value.indexOf(telescope.id);
        if (selected && index == -1) {
          model.value.push(telescope.id);
        }
        else if (!selected && index > -1) {
          model.value.splice(index, 1);
        }
      }
    }
    if (model.value.length == 0) {
      model.value = null;
    }
  }
}

</script>

<template>
  <v-select
    variant="outlined"
    v-model="model"
    :items="telescopeOptions"
    item-value="id"
    item-title="telescope"
    label="Telescopes"
    v-tooltip:top="{ text: tooltip || '', disabled: !tooltip }"
    :chips="props.multiple"
    closable-chips
    :multiple="props.multiple"
    :clearable="props.multiple"
    >
    <template #item="data">
      <v-list-subheader v-if="data.props.observatory" class="pl-2 pt-10">
        <v-row dense>
          <v-col>
            <b style="font-size:1.2rem;">{{ data.props.observatory }}</b>
          </v-col>
          <v-col v-if="props.multiple" style="align-content:center;">
            <p class="pl-8">Select All: </p>
          </v-col>
          <v-col v-if="props.multiple">
            <v-checkbox-btn :model-value="selectAllStates[data.props.observatory].selected" class="pl-4" density="compact" :indeterminate="selectAllStates[data.props.observatory].indeterminate" @update:modelValue="selectAllObservatory($event, data.props.observatory)"></v-checkbox-btn>
          </v-col>
        </v-row>
      </v-list-subheader>
      <v-list-subheader v-else-if="data.props.site">
        {{ data.props.site }}
      </v-list-subheader>
      <v-divider v-else-if="data.props.divider" />
      <v-list-item v-else v-bind="data.props" class="pl-6">
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
