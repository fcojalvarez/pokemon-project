<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { PokemonView, ScrollUpButton, SpinnerComponent } from '../components/index';
import { storeToRefs } from 'pinia';
import { usePokemonsStore } from '@/stores/pokemons';
const pokemonStore = usePokemonsStore();
const { pokemonsFiltered, isAllPokemonsLoad, isLoading } = storeToRefs(pokemonStore);

const scrollToLoad = 5000;
const totalScroll = ref(scrollToLoad);

const scrollHandlerEvent = () => {
    if(isAllPokemonsLoad.value) return;

    if(Math.round(window.pageYOffset) > totalScroll.value) {
        totalScroll.value += scrollToLoad;
        pokemonStore.getPokemonsToScroll(pokemonsFiltered.value.length );
    }
}

onMounted(() => {
    window.addEventListener('scroll', scrollHandlerEvent);
})
onUnmounted(() => {
    window.removeEventListener('scroll', scrollHandlerEvent);
})
</script>

<template>
    <section class="flex flex-wrap">
        <SpinnerComponent v-if="isLoading" />
        <template v-else>
            <div
                v-for="{ name, id, isReleased, types, is_released_shiny } in pokemonsFiltered"
                class="w-4/8 md:w-3/8 p-4 m-auto"
                :key="id"
                :scroll="scrollHandlerEvent"
            >
                <PokemonView :id="id" :name="name" :isReleased="isReleased" :types="types" :is_released_shiny="is_released_shiny" class="w-32"/>
            </div>
            <scroll-up-button />
        </template>
    </section>   
</template>
