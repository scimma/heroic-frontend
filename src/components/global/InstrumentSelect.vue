<script setup>
import { ref, computed, nextTick } from 'vue'
import { useFiltersStore } from '@/stores/filters'

const model = defineModel()
const filtersStore = useFiltersStore()
const selectAllBtnStates = ref({})

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
    return 'Optional filter on Instruments';
  }
  return null;
})

const instrumentsByObservatory = computed(() => {
  if (filtersStore.telescopes){
    let instruments = {};
    Object.values(filtersStore.telescopes).forEach(telescope => {
      if (!props.observatoryFilter || props.observatoryFilter.includes(telescope.observatory)) {
        let observatory = telescope.observatory + ': ' + telescope.observatory_name;
        let site = telescope.id.split('.')[1] + ': ' + telescope.site_name;
        if (!(observatory in instruments)){
          instruments[observatory] = {};
        }
        if (!(site in instruments[observatory])) {
          instruments[observatory][site] = {};
        }
        telescope.instruments.forEach(instrument => {
          let tel_id = telescope.id.split('.')[2] + ': ' + telescope.name;
          if (!(tel_id in instruments[observatory][site])) {
            instruments[observatory][site][tel_id] = []
          }
          instruments[observatory][site][tel_id].push({
            'id': instrument.id,
            'instrument': instrument.id.split('.')[3],
            'name': instrument.name,
            'telescope': telescope.id.split('.')[2],
            'site': telescope.site,
            'observatory': telescope.observatory
          })
        })
      }
    })
    return instruments;
  }
  return {};
})

const instrumentOptions = computed(() => {
  const instruments = instrumentsByObservatory.value;
  let instrumentItems = [];
  for (const [observatory, sites] of Object.entries(instruments)) {
    instrumentItems.push({
      props: {observatory: observatory}
    });
    for (const [site, telescopes] of Object.entries(sites)) {
      instrumentItems.push({
        props: {site: site}
      });
      for (const [telescope, instruments] of Object.entries(telescopes)) {
        instrumentItems.push({
          props: {telescope: telescope}
        });
        instrumentItems.push(...instruments);
      }
      instrumentItems.push({
        props: { divider: true}
      });
    }
  }
  return instrumentItems;
})

const indeterminateStates = computed(() => {
  let states = {};
  const instruments = instrumentsByObservatory.value;
  for (const observatory of Object.keys(instruments)) {
    let numSelected = 0;
    let totalNum = 0;
    for (const site of Object.values(instruments[observatory])) {
      for (const telescope of Object.values(instruments[observatory][site])) {
        for (const instrument of telescope) {
          totalNum += 1;
          if (model.value && model.value.includes(instrument.id)) {
            numSelected += 1;
          }
        }
      }
    }
    if (numSelected > 0 && totalNum != numSelected) {
      states[observatory] = true;
    }
    else {
      states[observatory] = false;
    }
  }
  return states;
})

async function selectAllObservatory(selected, observatory) {
  const instruments = instrumentsByObservatory.value;
  if (instruments[observatory]) {
    if (model.value == null) {
      model.value = [];
      await nextTick();
    }
    for (const site of Object.values(instruments[observatory])) {
      for (const telescope of Object.values(instruments[observatory][site])) {
        for (const instrument of telescope) {
          let index = model.value.indexOf(instrument.id);
          if (selected && index == -1) {
            model.value.push(instrument.id);
          }
          else if (!selected && index > -1) {
            model.value.splice(index, 1);
          }
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
    :items="instrumentOptions"
    item-value="id"
    item-title="instrument"
    label="Instruments"
    v-tooltip:top="tooltip"
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
            <v-checkbox-btn v-model="selectAllBtnStates[data.props.observatory]" class="pl-4" density="compact" :indeterminate="indeterminateStates[data.props.observatory]" @update:modelValue="selectAllObservatory($event, data.props.observatory)"></v-checkbox-btn>
          </v-col>
        </v-row>
      </v-list-subheader>
      <v-list-subheader v-else-if="data.props.site">
        {{ data.props.site }}
      </v-list-subheader>
      <v-list-subheader v-else-if="data.props.telescope">
        {{ data.props.telescope }}
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
