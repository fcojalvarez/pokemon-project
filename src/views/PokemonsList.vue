<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { ItemPokemonList, ScrollUpButton } from '../components/index';
import ShinyLegend from '../components/pokemon/ShinyLegend.vue';
import MaxLegend from '../components/pokemon/MaxLegend.vue';
import PokedexFilters from '../components/pokemon/PokedexFilters.vue';
import { storeToRefs } from 'pinia';
import { usePokemonsStore } from '@/stores/pokemons';
import { MAX_LENGH_POKEMONS,NEXT_LOAD_LENGTH_ITEMS, DISTANCE_TO_BOTTOM_PAGE, typesSVG } from '../utils/Settings';
import { entre, lista, useFiltrosEnUrl } from '../composables/useFiltrosEnUrl';
import { useRoute } from 'vue-router';

const pokemonStore = usePokemonsStore();
const route = useRoute();
const { pokemons, isLoading, isSearching, filters, searchTerm } = storeToRefs(pokemonStore);
const { getPokemons, addPokemons, setFilters, clearFilters, filterPokemons, setIsSearching } = pokemonStore;

/**
 * Los filtros, en la URL: un enlace o una recarga conservan la selección.
 *
 * Cada campo escribe en la store, pero los que llegan juntos (al entrar con
 * una URL con varios) se agrupan en una sola llamada a setFilters, que es la
 * que consulta a Supabase. Si ya están así en la store (al volver de una
 * ficha), no se toca nada: la lista y el scroll siguen como estaban.
 */
let pendiente = null;
const aplicar = (cambio) => {
    const iguales = Object.entries(cambio).every(([clave, valor]) => JSON.stringify(filters.value[clave]) === JSON.stringify(valor));
    if (iguales) return;
    const primero = !pendiente;
    pendiente = { ...(pendiente ?? {}), ...cambio };
    if (primero) queueMicrotask(() => { const junto = pendiente; pendiente = null; setFilters(junto); });
};
const filtro = (clave) => computed({ get: () => filters.value[clave], set: (valor) => aplicar({ [clave]: valor }) });
const SOLO = { shiny: 'onlyShiny', shadow: 'onlyShadow', dynamax: 'onlyDynamax', gigantamax: 'onlyGigantamax' };
const solo = computed({
    get: () => Object.entries(SOLO).filter(([, clave]) => filters.value[clave]).map(([nombre]) => nombre),
    set: (nombres) => aplicar(Object.fromEntries(Object.entries(SOLO).map(([nombre, clave]) => [clave, nombres.includes(nombre)])))
});
// La búsqueda también, como ?q=. Al restaurarla desde la URL se busca igual
// que si se hubiera escrito en el buscador.
const busqueda = computed({
    get: () => searchTerm.value,
    set: (texto) => { setIsSearching(Boolean(texto)); filterPokemons(texto); }
});
const { habiaFiltros } = useFiltrosEnUrl({
    q: { valor: busqueda, defecto: '' },
    kinds: { valor: filtro('types'), defecto: [], ...lista(Object.keys(typesSVG)) },
    gen: { valor: filtro('generation'), defecto: null, leer: (texto) => (/^[1-9]$/.test(texto) ? Number(texto) : undefined), escribir: (valor) => (valor ? String(valor) : '') },
    rarity: { valor: filtro('rarity'), defecto: null, leer: entre(['standard', 'legendary', 'mythic']), escribir: (valor) => valor ?? '' },
    only: { valor: solo, defecto: [], ...lista(Object.keys(SOLO)) }
});

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

/**
 * La URL manda. Al volver atrás (del navegador o de la app) trae los filtros y
 * la búsqueda, que se escriben en ella al aplicarlos, y se restauran. Al
 * entrar desde el menú llega sin nada: entonces se limpian también en la
 * store, que si no seguía aplicando lo de la visita anterior.
 */
const hayAlgoAplicado = () =>
    Boolean(searchTerm.value) || JSON.stringify(filters.value) !== JSON.stringify({
        types: [], generation: null, rarity: null, onlyShiny: false, onlyShadow: false, onlyDynamax: false, onlyGigantamax: false
    });
const limpiar = () => {
    if (searchTerm.value) { setIsSearching(false); filterPokemons(''); }
    if (hayAlgoAplicado()) clearFilters();
};
if (!habiaFiltros && hayAlgoAplicado()) limpiar();
// Pulsar «Pokédex» en el menú estando ya en la Pokédex: misma página, URL limpia.
watch(() => route.query, (query) => {
    if (!Object.keys(query).length && hayAlgoAplicado()) limpiar();
});

// passive: le dice al navegador que el listener no va a hacer preventDefault,
// así no tiene que esperarnos para desplazar la página. Se nota en móvil.
// Al cambiar de filtros la store reinicia el listado: aquí hay que soltar la
// bandera de "ya no hay más" o el scroll infinito se quedaría muerto.
watch(filters, () => { isAllPokemonsLoaded.value = false; }, { deep: true });

onMounted(async() => {
    // Con filtros en la URL, la primera carga la hace setFilters (ver arriba).
    if(pokemons.value.length === 0 && !habiaFiltros) await getPokemons();
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
        <pokedex-filters class="pt-3">
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

        <!--
            Esqueletos con la misma caja que una tarjeta de verdad: al cargar la
            siguiente tanda con el scroll, la rejilla ya tiene el hueco hecho y
            no salta. Al entrar se pinta una pantalla entera; al hacer scroll,
            una fila corta al final de lo que ya hay.
        -->
        <template v-if="isLoading">
            <p class="sr-only" role="status">{{ $t('common.loading') }}</p>
            <div
                v-for="n in (pokemons.length ? 10 : 20)"
                :key="`esqueleto-${n}`"
                class="w-4/8 md:w-3/8 p-4 mx-auto"
                aria-hidden="true"
            >
                <div class="w-32 md:w-48 p-2">
                    <div class="w-24 h-24 mx-auto flex items-center justify-center">
                        <div class="w-[76%] h-[76%] rounded-full esqueleto"></div>
                    </div>
                    <div class="mt-3 h-5 flex items-center justify-center gap-1">
                        <span class="h-3 w-8 rounded-full esqueleto"></span>
                        <span class="h-3.5 w-16 rounded-full esqueleto"></span>
                    </div>
                    <div class="mt-1 flex justify-center gap-1">
                        <span class="w-3.5 h-3.5 rounded-full esqueleto"></span>
                        <span class="w-3.5 h-3.5 rounded-full esqueleto"></span>
                    </div>
                </div>
            </div>
        </template>
        
        <scroll-up-button />
    </section>   
</template>
