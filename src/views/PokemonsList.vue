<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { ItemPokemonList, ScrollUpButton, SpinnerComponent } from '../components/index';
import { storeToRefs } from 'pinia';
import { usePokemonsStore } from '@/stores/pokemons';
const pokemonStore = usePokemonsStore();
const { pokemons, isLoading } = storeToRefs(pokemonStore);
const { getPokemons, addPokemons } = pokemonStore;

const currentPokemonsLength = computed(() => pokemons.value.length );
const NEXT_LOAD_LENGTH_ITEMS = 150;

const scrollHandler = async({target: {scrollingElement: {scrollTop, scrollHeight}}}) => {

    if(scrollTop > (scrollHeight - 2000) ) {
        if(!isLoading.value){
            await addPokemons({
                start: currentPokemonsLength.value,
                end: currentPokemonsLength.value + NEXT_LOAD_LENGTH_ITEMS
            });
            currentPokemonsLength.value =+ NEXT_LOAD_LENGTH_ITEMS;
        }
    }
}

onMounted(async() => {
    await getPokemons();
    document.addEventListener('scroll', scrollHandler);
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
                class="w-4/8 md:w-3/8 p-4 m-auto"
                :key="id"
                :scroll="scrollHandlerEvent"
            >
                <ItemPokemonList :id="pokemon_id" :image="sprites.male" :name="name" :is_relased="is_relased" :types="types" :is_shiny_relased="is_shiny_relased" class="w-48"/>
            </div>
        </template>

        <section v-if="isLoading" class="w-screen">
            <SpinnerComponent />
        </section>
        
        <scroll-up-button />
    </section>   
</template>
