<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { ItemPokemonList, ScrollUpButton, SpinnerComponent } from '../components/index';
import ShinyLegend from '../components/pokemon/ShinyLegend.vue';
import PokedexFilters from '../components/pokemon/PokedexFilters.vue';
import { storeToRefs } from 'pinia';
import { usePokemonsStore } from '@/stores/pokemons';
import { MAX_LENGH_POKEMONS,NEXT_LOAD_LENGTH_ITEMS, DISTANCE_TO_BOTTOM_PAGE } from '../utils/Settings';

const pokemonStore = usePokemonsStore();
const { pokemons, isLoading, isSearching, filters } = storeToRefs(pokemonStore);
const { getPokemons, addPokemons } = pokemonStore;

const currentPokemonsLength = computed(() => pokemons.value.length );
const isAllPokemonsLoaded = ref(false);

const scrollHandler = async({target: {scrollingElement: {scrollTop, scrollHeight}}}) => {
    if(scrollTop > (scrollHeight - DISTANCE_TO_BOTTOM_PAGE) && !isAllPokemonsLoaded.value ) {
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

// passive: le dice al navegador que el listener no va a hacer preventDefault,
// así no tiene que esperarnos para desplazar la página. Se nota en móvil.
// Al cambiar de filtros la store reinicia el listado: aquí hay que soltar la
// bandera de "ya no hay más" o el scroll infinito se quedaría muerto.
watch(filters, () => { isAllPokemonsLoaded.value = false; }, { deep: true });

onMounted(async() => {
    if(pokemons.value.length === 0) await getPokemons();
    document.addEventListener('scroll', scrollHandler, { passive: true });
})
onUnmounted(() => {
    document.removeEventListener('scroll', scrollHandler);
})
</script>

<template>
    <section class="flex flex-wrap">
        <!-- La leyenda va dentro de los filtros: comparten la primera línea. -->
        <pokedex-filters class="px-4 pt-3">
            <shiny-legend v-if="pokemons.length > 0" variant="dex" />
        </pokedex-filters>

        <template v-if="pokemons.length > 0">
            <div
                v-for="{ name, pokemon_id, is_released, types, sprites, is_shiny_released } in pokemons"
                class="w-4/8 md:w-3/8 p-4 mx-auto"
                :key="pokemon_id"
            >
                <ItemPokemonList :id="pokemon_id" :image="sprites.male" :name="name" :is_released="is_released" :types="types" :is_shiny_released="is_shiny_released" class="w-32 md:w-48"/>
            </div>
        </template>

        <section v-if="isLoading" class="flex items-center w-screen min-h-full">
            <SpinnerComponent />
        </section>
        
        <scroll-up-button />
    </section>   
</template>
