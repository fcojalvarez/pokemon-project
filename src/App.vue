<script setup>
import { onBeforeMount } from 'vue';

import { HeaderComponent } from './components/index';
import { status200 } from './utils/Settings';
import { useFetch } from './composables/useFetch';

const { get } = useFetch();

onBeforeMount(async() => {
  const { data, status} = await get('pogoApi', 'api_hashes.json');
  
  if(status === status200) {
    console.log(data);
  }

})
</script>

<template>
  <HeaderComponent class="mb-6" />

  <RouterView />
</template>

<style scoped>
</style>
