<script setup>
import { onMounted } from 'vue';
import { ItemPokemonList, ScrollUpButton, SpinnerComponent } from '../components/index';
import { storeToRefs } from 'pinia';
import { usePokemonsStore } from '@/stores/pokemons';
const pokemonStore = usePokemonsStore();
const { pokemons, isLoading } = storeToRefs(pokemonStore);

onMounted(async() => {

})
</script>

<template>
    <section class="flex flex-wrap">
        <SpinnerComponent v-if="isLoading" />
        <template v-else>
            <div
                v-for="{ id, name, pokemon_id, is_relased, types, sprites, is_shiny_relased } in pokemons"
                class="w-4/8 md:w-3/8 p-4 m-auto"
                :key="id"
                :scroll="scrollHandlerEvent"
            >
                <ItemPokemonList :id="pokemon_id" :image="sprites.male" :name="name" :is_relased="is_relased" :types="types" :is_shiny_relased="is_shiny_relased" class="w-32"/>
            </div>
            <scroll-up-button />
        </template>
    </section>   
</template>
