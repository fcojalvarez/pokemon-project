<script setup>
import { usePokemonStore } from '../stores/pokemon';

const pokemon = usePokemonStore();

</script>

<template>
    <section class="flex flex-wrap px-4">
        {{ pokemonsFilteredByName }}
        <div v-for="pokemon in pokemon.pokemonsFiltered" class="w-4/8 md:w-3/8 p-8 m-auto" :key="pokemon.id">
                {{ pokemon.name }}
        </div>
    </section>   
</template>

<style scoped>
</style>
