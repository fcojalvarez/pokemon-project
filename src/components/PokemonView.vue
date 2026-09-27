<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '../lib/supabaseClient';
import PokemonExtraInfo from './pokemon/PokemonExtraInfo.vue';
import EvolutionChain from './pokemon/EvolutionChain.vue';
import ShinyLegend from './pokemon/ShinyLegend.vue';
import { useGameDataStore } from '../stores/gameData';
import { useLiveStore } from '../stores/live';
import BaseCard from './base/BaseCard.vue';
import TypeIcons from './base/TypeIcons.vue';
import { spriteUrl } from '../utils/sprites';
import BaseSprite from './base/BaseSprite.vue';
import SkeletonLoader from './base/SkeletonLoader.vue';

const pokemon = ref(null);
const route = useRoute();
const isShowShiny = ref(false);
const gameData = useGameDataStore();
const live = useLiveStore();

// ?form=charizard_mega_y muestra esa forma concreta en vez del Pokémon base,
// sin necesidad de una ruta aparte.
const formId = computed(() => route.query.form || null);
const form = computed(() => formId.value ? gameData.byId.get(formId.value) || null : null);

/**
 * Lo que va en la cabecera: el Pokémon que se está viendo, o la forma si la
 * URL pide una (megas y supermegas tienen su propia pantalla).
 */
const hero = computed(() => {
    const p = pokemon.value;
    if(!p) return null;
    const f = form.value;
    return {
        number: String(p.pokemon_id).padStart(3, '0'),
        name: f?.nameEs || p.name,
        types: f?.types || p.types || [],
        image: f
            ? spriteUrl(f.spriteId, { shiny: isShowShiny.value })
            : (isShowShiny.value ? p.sprites?.male_shiny : p.sprites?.male)
    };
});

// El título de la pestaña lo pone el router para las páginas fijas; aquí
// depende de qué Pokémon se cargue.
watch(() => hero.value?.name, (name) => {
    if(name) document.title = `${name} · PogoDex`;
}, { immediate: true });

const getPokemon = async(pokemonId) => {
    const { data, error } = await supabase.from('pokemons').select('*').eq('pokemon_id', pokemonId).limit(1);

    if(error) console.error(error);

    const [ pokemonFinded ] = data || [];
    if(pokemonFinded) pokemon.value = {...pokemonFinded};
}

onMounted(async() => {
    const pokemonId = Number(route.params.id);

    // Los rankings, la tabla de tipos y los datos en vivo se cargan una sola
    // vez por sesión: las stores ignoran las llamadas repetidas.
    gameData.load();
    live.load();

    // El scroll arriba lo hace el router (scrollBehavior). Aquí había un
    // scrollTo suave que, si se volvía atrás antes de que acabara, seguía
    // subiendo y pisaba el scroll recuperado de la página anterior.
    if(pokemonId) await getPokemon(pokemonId);
})

watch(() => route.params.id, async(newId) => {
    const pokemonIdFromRoute = Number(newId);
    if(pokemonIdFromRoute && pokemon.value?.pokemon_id !== pokemonIdFromRoute) {
        await getPokemon(pokemonIdFromRoute);
    }
})
</script>

<template>
    <!--
        La ficha son tarjetas sueltas sobre el fondo, sin una tarjeta grande que
        las envuelva: cabecera, cadena evolutiva y las secciones de datos. Desde
        lg las secciones van en dos columnas (ver <pokemon-extra-info>).
    -->
    <div v-if="pokemon" class="flex flex-col gap-3 lg:gap-4">
        <base-card class="!pb-3 lg:!px-6">
            <!--
                Cabecera con el nombre: antes la ficha empezaba por la cadena
                evolutiva y el Pokémon actual solo se distinguía por un fondo gris.
            -->
            <header class="flex items-center gap-4 pb-3 border-b border-gray-300 dark:border-gray-700">
                <base-sprite
                    :src="hero.image"
                    :lazy="false"
                    class="w-20 h-20 shrink-0"
                    img-class="drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark"
                />
                <div class="min-w-0">
                    <span class="block text-xs text-gray-600 dark:text-gray-300">#{{ hero.number }}</span>
                    <h1 class="text-2xl font-bold leading-tight text-gray-900 dark:text-gray-100">{{ hero.name }}</h1>
                    <type-icons :types="hero.types" size="14" with-label class="mt-1.5 flex-wrap text-gray-800 dark:text-gray-200" />
                </div>
            </header>

            <!-- La leyenda a la izquierda y el botón a la derecha, misma línea. -->
            <div class="mt-3 flex items-center justify-between gap-3">
                <shiny-legend v-if="pokemon.is_shiny_released" variant="evolution" />

                <!--
                    Es un interruptor, así que es un <button> con aria-pressed.
                    Activado va en gris-700 sobre blanco (10,3:1); en gris-500 se
                    quedaba en 4,39:1 y el texto no se leía bien en modo claro.
                -->
                <button
                    type="button"
                    :aria-pressed="isShowShiny"
                    @click="isShowShiny = !isShowShiny"
                    :class="[
                        isShowShiny
                            ? 'bg-gray-700 dark:bg-gray-600 text-white border-gray-700 dark:border-gray-600'
                            : 'text-gray-800 dark:text-gray-200 border-gray-400 dark:border-gray-600',
                        'shrink-0 border w-28 rounded-xl py-1 px-2 text-center ml-auto cursor-pointer transition-colors'
                    ]"
                >
                    {{ $t('viewShiny') }}
                </button>
            </div>
        </base-card>

        <!-- Cadena evolutiva: en línea desde lg; en móvil, lo que sale de varias formas baja -->
        <base-card class="!px-2 !pb-4 lg:!px-6 lg:!pb-6">
            <h2 class="px-2 lg:px-0 text-sm font-bold text-gray-800 dark:text-gray-200">{{ $t('pokemon.evolutionLine') }}</h2>
            <div class="mt-4">
                <evolution-chain :pokemon="pokemon" :form-id="formId" :shiny="isShowShiny" />
            </div>
        </base-card>

        <pokemon-extra-info :pokemon="pokemon" :form-id="formId" />
    </div>

    <!-- Mientras llega el Pokémon: las mismas tarjetas, con su forma. -->
    <skeleton-loader v-else class="flex flex-col gap-3 lg:gap-4">
        <base-card>
            <div class="flex items-center gap-4 pb-3 border-b border-gray-300 dark:border-gray-700">
                <span class="w-20 h-20 shrink-0 flex items-center justify-center"><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span></span>
                <span class="flex flex-col gap-2">
                    <span class="esqueleto h-3 w-10 rounded-full"></span>
                    <span class="esqueleto h-6 w-40 rounded-full"></span>
                    <span class="flex gap-2">
                        <span class="esqueleto h-3.5 w-16 rounded-full"></span>
                        <span class="esqueleto h-3.5 w-16 rounded-full"></span>
                    </span>
                </span>
            </div>
            <div class="mt-3 flex items-center justify-between">
                <span class="esqueleto h-3.5 w-28 rounded-full"></span>
                <span class="esqueleto h-8 w-28 rounded-xl"></span>
            </div>
        </base-card>
        <base-card>
            <div class="flex items-center justify-center gap-4 py-2">
                <template v-for="n in 3" :key="n">
                    <span v-if="n > 1" class="esqueleto h-0.5 w-8 rounded-full"></span>
                    <span class="flex flex-col items-center gap-2">
                        <span class="w-16 h-16 lg:w-24 lg:h-24 flex items-center justify-center"><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span></span>
                        <span class="esqueleto h-3 w-16 rounded-full"></span>
                    </span>
                </template>
            </div>
        </base-card>
        <div v-for="n in 4" :key="`s${n}`" class="border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900 px-4 py-3.5 flex items-center gap-3">
            <span class="flex-1 flex flex-col gap-1.5">
                <span class="esqueleto h-3.5 w-32 rounded-full"></span>
                <span class="esqueleto h-3 w-48 rounded-full"></span>
            </span>
            <span class="esqueleto w-5 h-5 rounded-full"></span>
        </div>
    </skeleton-loader>
</template>
