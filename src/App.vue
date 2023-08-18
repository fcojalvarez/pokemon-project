<script setup>
import { onBeforeMount } from 'vue';
import { storeToRefs } from 'pinia';

import { HeaderComponent, SpinnerComponent } from './components/index';
import { status200 } from './utils/Settings';
import { useFetch } from './composables/fetch';
import { useLocalStorage } from './composables/localStorage';
import { usePokemonsStore } from './stores/pokemons';

const { getPogoApi } = useFetch();
const pokemonStore = usePokemonsStore();
const { isLoading } = storeToRefs(pokemonStore);
const { createPokemonData } = pokemonStore;
const { getJsonToLocalStorage, setJsonToLocalStorage } = useLocalStorage();

const getHashesPogoApi = async() => {
  const { data, status } = await getPogoApi('/api/v1/api_hashes.json');
  
  if(status === status200) {
    const apiHashesJsonLS = await getJsonToLocalStorage('api_hashes');

    await checkHashesLocalToLS(data, apiHashesJsonLS);
  }
}

const checkHashesLocalToLS = (data, apiHashesJsonLS) => {
  let isNewContent = false;
  Object.values(data).forEach( async({ api_filename, hash_md5, full_path }) => {
    const hashMd5Localstorage = apiHashesJsonLS && apiHashesJsonLS[api_filename]?.hash_md5;
    if(hashMd5Localstorage === hash_md5 ) return;
    await getPogoApi(full_path);
    isNewContent = true;
  });
  setJsonToLocalStorage('api_hashes', data)
  createPokemonData(isNewContent);
}

onBeforeMount(async() => {
  await getHashesPogoApi();
  const isDarkModeLS = JSON.parse(await getJsonToLocalStorage('isDarkMode')) || false;
  isDarkModeLS && document.documentElement.classList.toggle('dark');
})
</script>

<template>
  <section class="min-h-screen bg-white dark:bg-gray-900 px-8 md:px-16 xl:px-24 2xl:px-32">
    <HeaderComponent class="mb-6 pt-6 sticky top-0 z-10" />
    
    <section v-if="isLoading" class="flex justify-center items-center w-100 h-screen">
      <SpinnerComponent />
    </section>
    <RouterView v-else />
  </section>
</template>