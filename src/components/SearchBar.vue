<script setup>
import { usePokemonsStore } from '@/stores/pokemons';
const { filterPokemons } = usePokemonsStore();

const inputSearch = ( { target }) => {
    const inputValue = target.value;
    filterPokemons(inputValue);
}
</script>

<template>
    <section class="w-full md:w-1/2 lg:w-64 height-8">
        <input type="text" class="w-full bg-transparent border-b py-2 px-3 outline-none" :placeholder="$t('searchPokemon')" :dataAutocomplete="arrPokemonsName" @input="inputSearch">
        <img src="../assets/icons/search-icon.svg" alt="$('search')" class="absolute bottom-2 right-2 w-5" type="submit">
    </section>
</template>

<style scoped>
[placeholder]:focus::-webkit-input-placeholder {
    transition: text-indent 0.4s 0.4s ease; 
    text-indent: -100%;
    opacity: 1;
 }
</style>
