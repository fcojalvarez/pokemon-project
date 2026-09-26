<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { ItemPokemonList, ScrollUpButton, SpinnerComponent } from '../components/index';
import ShinyLegend from '../components/pokemon/ShinyLegend.vue';
import MaxLegend from '../components/pokemon/MaxLegend.vue';
import PokedexFilters from '../components/pokemon/PokedexFilters.vue';
import { storeToRefs } from 'pinia';
import { usePokemonsStore } from '@/stores/pokemons';
import { MAX_LENGH_POKEMONS,NEXT_LOAD_LENGTH_ITEMS, DISTANCE_TO_BOTTOM_PAGE } from '../utils/Settings';

const pokemonStore = usePokemonsStore();
const { pokemons, isLoading, isSearching, filters, searchTerm } = storeToRefs(pokemonStore);
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
        <!-- Oculto a la vista: la Pokédex se reconoce sola, pero la página
             necesita su h1 para quien navega por encabezados. -->
        <h1 class="sr-only">{{ $t('nav.pokedex') }}</h1>
        <p class="sr-only" role="status">
            <template v-if="searchTerm && !isLoading">{{ $tc('a11y.pokemonCount', pokemons.length, { n: pokemons.length }) }}</template>
        </p>

        <!-- La leyenda va dentro de los filtros: comparten la primera línea. -->
        <pokedex-filters class="px-4 pt-3">
            <!-- Las leyendas comparten el hueco de la izquierda y bajan de
                 línea solas cuando no caben. -->
            <span v-if="pokemons.length > 0" class="flex flex-wrap items-center gap-x-4 gap-y-1">
                <shiny-legend variant="dex" />
                <max-legend />
            </span>
        </pokedex-filters>

        <template v-if="pokemons.length > 0">
            <div
                v-for="{ name, pokemon_id, is_released, types, sprites, is_shiny_released, can_dynamax, can_gigantamax } in pokemons"
                class="w-4/8 md:w-3/8 p-4 mx-auto"
                :key="pokemon_id"
            >
                <ItemPokemonList :id="pokemon_id" :image="sprites.male" :name="name" :is_released="is_released" :types="types" :is_shiny_released="is_shiny_released" :can_dynamax="can_dynamax" :can_gigantamax="can_gigantamax" class="w-32 md:w-48"/>
            </div>
        </template>

        <section v-if="isLoading" class="flex items-center w-screen min-h-full">
            <SpinnerComponent />
        </section>
        
        <scroll-up-button />
    </section>   
</template>
