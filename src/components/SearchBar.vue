<script setup>
import { BaseIcon } from '.';
import { usePokemonsStore } from '@/stores/pokemons';
const { filterPokemons } = usePokemonsStore();

const inputSearch = ( { target }) => {
    const inputValue = target.value;
    filterPokemons(inputValue);
}
</script>

<template>
    <section class="transition-colors w-full md:w-1/2 lg:w-64 h-100 px-4 border border-gray-400 bg-white dark:bg-gray-900 rounded-xl shadow-md">
        <input type="text" class="w-full bg-transparent py-2 px-3 outline-none text-black dark:text-gray-300" :placeholder="$t('searchPokemon')"  @input="inputSearch">
        <base-icon
            :stroke-width="1.5"
            icon-class="absolute bottom-2 right-2 w-6"
            class-path="stroke-gray-600 dark:stroke-gray-100"
            d="m17 17 4 4M3 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0z"
        />
    </section>
</template>

<style scoped>
[placeholder]:focus::-webkit-input-placeholder {
    transition: text-indent 0.4s 0.4s ease; 
    text-indent: -100%;
    opacity: 1;
 }
</style>
