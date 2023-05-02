<script setup>
import { ref } from 'vue';
const arrPokemonsName = JSON.parse(localStorage.getItem('pokemonsName'));
let arrPokemonsNameFiltered = ref([]); 

const filterByInput = ( { target }) => {
    const inputValue = target.value;

    arrPokemonsNameFiltered.value = arrPokemonsName.filter( pokemonName => pokemonName.toLowerCase().includes(inputValue))
}
</script>.value

<template>
    <form autocomplete="false" action="">
        <input type="text" class="bg-transparent border-b-2 py-2 px-3 w-full outline-none relative" placeholder="Busca tu pokémon..." :dataAutocomplete="arrPokemonsName" @input="filterByInput">
        <img src="../assets/icons/search.svg" alt="search icon.value" class="absolute bottom-2 right-3" type="submit">

        <ul class="w-full bg-white max-h-48 overflow-scroll">
            <li v-for="pokemonName in arrPokemonsNameFiltered" :key="pokemonName" class="text-red-400 px-8 py-2">{{ pokemonName }}</li>
        </ul>
    </form>
</template>

<style scoped>
[placeholder]:focus::-webkit-input-placeholder {
    transition: text-indent 0.4s 0.4s ease; 
    text-indent: -100%;
    opacity: 1;
 }
</style>
