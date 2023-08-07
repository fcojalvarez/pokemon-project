<script setup>
import { onBeforeMount, ref } from 'vue';

import { HeaderComponent, SpinnerComponent } from './components/index';
import { status200 } from './utils/Settings';
import { useFetch } from './composables/fetch';
import { useLocalStorage } from './composables/localStorage';

const { getPogoApi } = useFetch();
const { getJsonToLocalStorage, setJsonToLocalStorage } = useLocalStorage();

const isLoading = ref(true);

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
  isLoading.value = false;
}

onBeforeMount(async() => {
  await getHashesPogoApi();
})
</script>

<template>
  <section class="bg-white dark:bg-gray-900 px-8 md:px-16 xl:px-24 2xl:px-32">
    <HeaderComponent class="mb-6 pt-6" />
  
    <section v-if="isLoading" class="flex justify-center items-center w-100 h-screen">
      <SpinnerComponent />
    </section>
    <RouterView v-else />
  </section>
</template>

<style scoped>
</style>
