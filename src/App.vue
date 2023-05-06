<script setup>
import { onBeforeMount } from 'vue';

import { HeaderComponent } from './components/index';
import { status200 } from './utils/Settings';
import { useFetch } from './composables/useFetch';
import { useLocalStorage } from './composables/useLocalStorage';

const { getPogoApi } = useFetch();
const { getJsonToLocalStorage, setJsonToLocalStorage } = useLocalStorage();

const getHashesPogoApi = async() => {
  const { data, status } = await getPogoApi('/api/v1/api_hashes.json');
  
  if(status === status200) {
    const apiHashesJsonLS = getJsonToLocalStorage('api_hashes');

    checkHashes(data, apiHashesJsonLS);
  }
}

const checkHashes = (data, apiHashesJsonLS) => {
  Object.values(data).forEach( ({ api_filename, hash_md5, full_path }) => {
    const hashMd5Localstorage = apiHashesJsonLS && apiHashesJsonLS[api_filename]?.hash_md5;

    if(hashMd5Localstorage && hashMd5Localstorage === hash_md5 ) return;
    getPogoApi(full_path);
  });

  setJsonToLocalStorage('api_hashes', data);
}

onBeforeMount(async() => {
  getHashesPogoApi();

})
</script>

<template>
  <HeaderComponent class="mb-6" />

  <RouterView />
</template>

<style scoped>
</style>
