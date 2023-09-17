<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { ItemPokemonList, ScrollUpButton, SpinnerComponent } from '../components/index';
import { storeToRefs } from 'pinia';
import { usePokemonsStore } from '@/stores/pokemons';
import { createPokemonData } from '@/utils/PokemonDDBB';

const pokemonStore = usePokemonsStore();
const { pokemons, isLoading, isSearching } = storeToRefs(pokemonStore);
const { getPokemons, addPokemons } = pokemonStore;

const currentPokemonsLength = computed(() => pokemons.value.length );
const NEXT_LOAD_LENGTH_ITEMS = 150;
const MAX_LENGH_POKEMONS = 1017;
const isAllPokemonsLoaded = ref(false);

const scrollHandler = async({target: {scrollingElement: {scrollTop, scrollHeight}}}) => {
    const distanceToBottomPage = 2000;

    if(scrollTop > (scrollHeight - distanceToBottomPage) && !isAllPokemonsLoaded.value ) {
        if(!isLoading.value && !isSearching.value){
            const end = currentPokemonsLength.value + NEXT_LOAD_LENGTH_ITEMS > MAX_LENGH_POKEMONS
                ? MAX_LENGH_POKEMONS 
                : currentPokemonsLength.value + NEXT_LOAD_LENGTH_ITEMS;

            isAllPokemonsLoaded.value = currentPokemonsLength.value + NEXT_LOAD_LENGTH_ITEMS > MAX_LENGH_POKEMONS;

            await addPokemons({
                start: currentPokemonsLength.value,
                end: end
            });
        }
    }
}

onMounted(async() => {
    await getPokemons();
    document.addEventListener('scroll', scrollHandler);
    createPokemonData();
})
onUnmounted(() => {
    document.removeEventListener('scroll', scrollHandler);
})
</script>

<template>
    <section class="flex flex-wrap">
        <template v-if="pokemons.length > 0">
            <div
                v-for="{ id, name, pokemon_id, is_relased, types, sprites, is_shiny_relased } in pokemons"
                class="w-4/8 md:w-3/8 p-4 mx-auto"
                :key="id"
                :scroll="scrollHandlerEvent"
            >
                <ItemPokemonList :id="pokemon_id" :image="sprites.male" :name="name" :is_relased="is_relased" :types="types" :is_shiny_relased="is_shiny_relased" class="w-32 md:w-48"/>
            </div>
        </template>

        <section v-if="isLoading" class="w-screen">
            <SpinnerComponent />
        </section>
        
        <scroll-up-button />
    </section>   
</template>
