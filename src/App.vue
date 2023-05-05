<script setup>
import { onBeforeMount } from 'vue';
import { usePokemons } from './composables/usePokemons';

import { HeaderComponent } from './components/index';

const { getPokemonsName } = usePokemons();

onBeforeMount(() => {
  getPokemonsName();
})
</script>

<template>
  <HeaderComponent class="mb-6" />

  <RouterView />
</template>

<style scoped>
</style>
