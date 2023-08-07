<script setup>
import { usePokemonsStore } from '@/stores/pokemons';
const { filterPokemons } = usePokemonsStore();

const inputSearch = ( { target }) => {
    const inputValue = target.value;
    filterPokemons(inputValue);
}
</script>

<template>
    <section class="w-full md:w-1/2 lg:w-64 height-8 px-4 border border-gray-400 rounded-xl shadow-md">
        <input type="text" class="w-full bg-transparent py-2 px-3 outline-none" :placeholder="$t('searchPokemon')"  @input="inputSearch">
        <svg width="24" height="24" fill="none" stroke-width="1.5"  class="absolute bottom-2 right-2 w-6">
            <path stroke="#fff" class="stroke-gray-600 dark:stroke-gray-100" stroke-linecap="round" stroke-linejoin="round" d="m17 17 4 4M3 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0z"/>
        </svg>
    </section>
</template>

<style scoped>
[placeholder]:focus::-webkit-input-placeholder {
    transition: text-indent 0.4s 0.4s ease; 
    text-indent: -100%;
    opacity: 1;
 }
</style>
