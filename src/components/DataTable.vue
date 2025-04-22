<script setup>
import { ref } from 'vue'
import { fetchApiCall } from '@/utils/api'


const props = defineProps({
  apiKey: {
    type: String,
    required: true
  },
  headers: {
    type: Array,
    required: true
  }
})

const itemsPerPage = ref(10)

const search = ref('')
const serverItems = ref([])
const loading = ref(true)
const totalItems = ref(0)

function generateItemLink(item) {
  var detailPage = props.apiKey.slice(0, -1) + 'Detail';
  return { name: detailPage, params: { id: item.id } };
}

async function loadItems ({ page, itemsPerPage, sortBy }) {
  loading.value = true
  let offset = (page-1) * itemsPerPage;

  const url = import.meta.env.VITE_HEROIC_API_URL + props.apiKey + '/?limit=' + itemsPerPage + '&offset=' + offset;
  await fetchApiCall({url: url, method: 'GET', successCallback: (data) => {
    serverItems.value = data.results;
    totalItems.value = data.count;
    loading.value = false;
  }})
}

</script>
<template>
  <v-data-table-server
    v-model:items-per-page="itemsPerPage"
    :headers="props.headers"
    :items="serverItems"
    :items-length="totalItems"
    :loading="loading"
    :search="search"
    item-value="name"
    @update:options="loadItems"
  >
    <template #item.name="{ item }">
      <router-link :to="generateItemLink(item)">{{ item.name }}</router-link>
    </template>
  </v-data-table-server>
</template>
  