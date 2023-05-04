<script setup>
import { onBeforeMount } from 'vue';
import { usePokemons } from './composables/usePokemons';

import {HeaderComponent } from './components/index';

const { getPokemonsName } = usePokemons();

onBeforeMount(() => {
  const pokemonsName = JSON.parse(localStorage.getItem('pokemonsName'));
  if(pokemonsName.length ===  0) {
    getPokemonsName();
  }
})
</script>

<template>
  <HeaderComponent />

  <RouterView />
</template>

<style scoped>
</style>
