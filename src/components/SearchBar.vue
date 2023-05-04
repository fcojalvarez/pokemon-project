<script setup>
const arrPokemonsName = JSON.parse(localStorage.getItem('pokemonsName'));

const inputSearch = ( { target }) => {
    const inputValue = target.value;
    // Filter pokemons in store
}
</script>

<template>
    <section class="w-full">
        <input type="text" class="bg-transparent border-b-2 mb-8 py-2 px-3 w-full outline-none" :placeholder="$t('searchPokemon')" :dataAutocomplete="arrPokemonsName" @input="inputSearch">
        <img src="../assets/icons/search.svg" alt="search icon.value" class="absolute bottom-10 right-2" type="submit">
    </section>
</template>

<style scoped>
[placeholder]:focus::-webkit-input-placeholder {
    transition: text-indent 0.4s 0.4s ease; 
    text-indent: -100%;
    opacity: 1;
 }
</style>
