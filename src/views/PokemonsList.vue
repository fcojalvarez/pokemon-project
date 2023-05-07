<script setup>
import { PokemonView } from '../components/index';

import { storeToRefs } from 'pinia';
import { usePokemonsStore } from '@/stores/pokemons';

const pokemonStore = usePokemonsStore();
const { pokemonsFiltered } = storeToRefs(pokemonStore);
</script>

<template>
    <section class="flex flex-wrap px-4">
        <div
            v-for="{ name, id } in pokemonsFiltered"
            class="w-4/8 md:w-3/8 p-8 m-auto"
            :key="id"
        >
            <PokemonView :id="id" :name="name" class="w-32"/>
        </div>
    </section>   
</template>
