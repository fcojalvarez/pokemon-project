<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '../lib/supabaseClient';
import { EvolPokemonItem } from '../components/index';
import PokemonMegas from './pokemon/PokemonMegas.vue';
import PokemonExtraInfo from './pokemon/PokemonExtraInfo.vue';
import ShinyLegend from './pokemon/ShinyLegend.vue';
import TradeLegend from './pokemon/TradeLegend.vue';
import { useGameDataStore } from '../stores/gameData';
import { useLiveStore } from '../stores/live';
import TypeIcons from './base/TypeIcons.vue';
import { spriteUrl } from '../utils/sprites';
import BaseSprite from './base/BaseSprite.vue';
import SkeletonLoader from './base/SkeletonLoader.vue';

const pokemon = ref(null);
const route = useRoute();
const isShowShiny = ref(false);
const gameData = useGameDataStore();
const live = useLiveStore();

const evolutionFamilies = computed(() => Object.keys(pokemon.value?.evolution_info || {}));

// ?form=charizard_mega_y muestra esa forma concreta en vez del Pokémon base,
// sin necesidad de una ruta aparte.
const formId = computed(() => route.query.form || null);
const form = computed(() => formId.value ? gameData.byId.get(formId.value) || null : null);

/**
 * Las megas son de la última evolución de la rama, no del Pokémon que estés
 * viendo: desde Pichu hay que enseñar las de Raichu.
 */
const lastOfFamily = (familyKey) => {
    const chain = pokemon.value?.evolution_info?.[familyKey] || [];
    return chain[chain.length - 1] || null;
};


/**
 * El Pokémon base con la forma que espera EvolPokemonItem. Hace falta cuando
 * no tiene cadena evolutiva pero sí mega (Rayquaza, Absol…): así se ve
 * base → megaenergía → mega en vez de la mega suelta.
 */
/**
 * Con una sola rama la cadena ocupa toda la tarjeta; solo se parte en columnas
 * cuando hay varias (Eevee, Wurmple…). Si no, se desperdicia media pantalla y
 * los nombres se recortan.
 */
/**
 * ¿Hay en esta cadena alguna evolución que salga gratis al intercambiar?
 * La leyenda del icono solo aparece si el icono aparece.
 */
const hayEvolucionPorIntercambio = computed(() =>
    Object.values(pokemon.value?.evolution_info ?? {}).some((familia) =>
        (familia ?? []).some((uno) => uno.no_candy_cost_if_traded)
    )
);

const familyColumnClass = computed(() =>
    evolutionFamilies.value.length > 1 ? 'w-full sm:w-1/2' : 'w-full'
);

const baseAsChainItem = computed(() => {
    const p = pokemon.value;
    if(!p) return null;
    return {
        pokemon_id: p.pokemon_id,
        name: p.name,
        types: p.types,
        is_shiny_released: p.is_shiny_released,
        sprites: p.sprites
    };
});

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

    if(pokemonId) await getPokemon(pokemonId);
    window.scrollTo({ top: 0, behavior: "smooth" });
})

watch(() => route.params.id, async(newId) => {
    const pokemonIdFromRoute = Number(newId);
    if(pokemonIdFromRoute && pokemon.value?.pokemon_id !== pokemonIdFromRoute) {
        await getPokemon(pokemonIdFromRoute);
    }
})
</script>

<template>
    <section v-if="pokemon" class="pt-4 pb-10 px-6 sm:px-12 md:px-24 bg-white dark:bg-gray-900 rounded-xl border border-gray-300 shadow-md">
        <!--
            Cabecera con el nombre: antes la ficha empezaba por la cadena
            evolutiva y el Pokémon actual solo se distinguía por un fondo gris.
        -->
        <header class="flex items-center gap-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <base-sprite
                :src="hero.image"
                :lazy="false"
                class="w-20 h-20 shrink-0"
                img-class="drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark"
            />
            <div class="min-w-0">
                <span class="block text-xs text-gray-600 dark:text-gray-300">#{{ hero.number }}</span>
                <h1 class="text-2xl font-bold leading-tight text-gray-900 dark:text-gray-100">{{ hero.name }}</h1>
                <type-icons :types="hero.types" size="14" with-label class="mt-1.5 flex-wrap text-gray-700 dark:text-gray-200" />
            </div>
        </header>

        <!-- Las leyendas a la izquierda y el botón a la derecha, misma línea. -->
        <section class="mt-4 flex items-center justify-between gap-3">
            <span class="flex flex-wrap items-center gap-x-4 gap-y-1">
                <shiny-legend v-if="pokemon.is_shiny_released" variant="evolution" />
                <trade-legend :show="hayEvolucionPorIntercambio" />
            </span>

            <!--
                Es un interruptor, así que es un <button> con aria-pressed: como
                <section> con @click no se podía usar con el teclado ni había
                forma de saber si estaba activado.

                Activado va en gris-700 sobre blanco (10,3:1); en gris-500 se
                quedaba en 4,39:1 y el texto no se leía bien en modo claro.
            -->
            <button
                type="button"
                :aria-pressed="isShowShiny"
                @click="isShowShiny = !isShowShiny"
                :class="[
                    isShowShiny
                        ? 'bg-gray-700 dark:bg-gray-600 text-white border-gray-700 dark:border-gray-200'
                        : 'text-gray-800 dark:text-gray-200 border-gray-800 dark:border-gray-200',
                    'shrink-0 border w-28 rounded-xl py-1 px-2 text-center ml-auto cursor-pointer transition-colors'
                ]"
            >
                {{ $t('viewShiny') }}
            </button>

        </section>

        <section class="my-3 flex justify-center flex-wrap">
            <section
                v-for="evolFamilyKey in evolutionFamilies"
                :key="evolFamilyKey"
                class="flex flex-col flex-wrap sm:flex-row items-center"
                :class="familyColumnClass"
            >
                <evol-pokemon-item
                    :pokemon="evolPokemon"
                    v-for="(evolPokemon, index) in pokemon.evolution_info[evolFamilyKey]"
                    :key="`${evolFamilyKey}-${evolPokemon.pokemon_id}-${index}`"
                    :position-info="{index: index + 1, length: pokemon.evolution_info[evolFamilyKey].length }"
                    :is-show-shiny="isShowShiny"
                    :is-active="!form && evolPokemon.pokemon_id === pokemon.pokemon_id"
                />

                <!-- Las megas cierran la cadena, no van en una sección aparte. -->
                <pokemon-megas
                    v-if="lastOfFamily(evolFamilyKey)"
                    :dex="lastOfFamily(evolFamilyKey).pokemon_id"
                    :is-show-shiny="isShowShiny"
                    :is-shiny-released="lastOfFamily(evolFamilyKey).is_shiny_released"
                    :active-form-id="formId"
                />
            </section>

            <!--
                Especies sin evoluciones pero con mega (Rayquaza, Absol…):
                la cadena es el propio Pokémon y su mega.
            -->
            <section
                v-if="evolutionFamilies.length === 0"
                class="flex flex-col flex-wrap sm:flex-row w-full items-center"
            >
                <evol-pokemon-item
                    v-if="baseAsChainItem"
                    :pokemon="baseAsChainItem"
                    :is-show-shiny="isShowShiny"
                    :is-active="!form"
                />

                <pokemon-megas
                    :dex="pokemon.pokemon_id"
                    :is-show-shiny="isShowShiny"
                    :is-shiny-released="pokemon.is_shiny_released"
                    :active-form-id="formId"
                />
            </section>
        </section>

        <pokemon-extra-info :pokemon="pokemon" :form-id="formId" />
<!-- 
        <section class="text-gray-800 dark:text-gray-200 flex flex-wrap justify-between my-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-300 shadow-md">
            <h3 class="my-2 w-full font-bold text-lg">{{ $t('stats') }}</h3>
            <section class="my-1">
                <span class="block my-2 font-bold">{{ $t('attack') }}:
                    <span>{{ pokemon.stats.base_attack }}</span>
                </span>
                <span class="block my-2 font-bold">{{ $t('defense') }}: 
                    <span>{{ pokemon.stats.base_defense }}</span>
                </span>
                <span class="block my-2 font-bold">{{ $t('stamina') }}:
                    <span>{{ pokemon.stats.base_stamina }}</span>
                </span>
            </section>
            <section class="my-1">
                <span class="block my-2 font-bold">{{ $t('maxCP') }} (lvl 40):
                    <span>{{ pokemon.stats.max_cp_lvl_40 }}</span>
                </span>
                <span class="block my-2 font-bold">{{ $t('maxCP') }} (lvl 50):
                    <span>{{ pokemon.stats.max_cp_lvl_50 }}</span>
                </span>
            </section>
            <section class="w-full my-1">
                <span class="block my-2 font-bold">
                    {{ pokemon.buddy.mega_rewards }} {{ $t('megaenergy') }}
                    <span class="text-xs">( {{ $t('each') }} {{ pokemon.buddy.candy_distance }}km )</span>
                </span>
                <span class="block my-2 font-bold">
                    {{ pokemon.buddy.candy_rewards }} {{ $t('candy') }}
                    <span class="text-xs">
                         ( {{ $t('each', pokemon.buddy.candy_rewards >1 ? 1: 2) }} {{ pokemon.buddy.candy_distance }}km )
                    </span>
                </span>
            </section>
        </section>

        <section class="text-gray-800 dark:text-gray-200 flex flex-wrap justify-between my-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-300 shadow-md">
            <h3 class="my-2 w-full font-bold text-lg">{{ $t('encounterData') }}</h3>
            <section class="my-1">
                <span class="block my-2 font-bold">{{ $t('attackProbability') }}:
                    <span>{{ pokemon.pokemon_encounter_data.attack_probability }}</span>
                </span>
                <span class="block my-2 font-bold">{{ $t('defense') }}: 
                    <span>{{ pokemon.stats.base_defense }}</span>
                </span>
                <span class="block my-2 font-bold">{{ $t('stamina') }}:
                    <span>{{ pokemon.stats.base_stamina }}</span>
                </span>
            </section>
            <section class="my-1">
                <span class="block my-2 font-bold">{{ $t('maxCP') }}:
                    <span>{{ pokemon.stats.max_cp_lvl_40 }}</span>
                </span>
                <span class="block my-2 font-bold">{{ $t('maxCP') }}:
                    <span>{{ pokemon.stats.max_cp_lvl_50 }}</span>
                </span>
            </section>

            <section class="w-full my-1">
                <span class="block my-2 font-bold">
                    {{ pokemon.buddy.mega_rewards }} {{ $t('megaenergy') }}
                    <span class="text-xs">( {{ $t('each') }} {{ pokemon.buddy.candy_distance }}km )</span>
                </span>
                <span class="block my-2 font-bold">
                    {{ pokemon.buddy.candy_rewards }} {{ $t('candy') }}
                    <span class="text-xs">
                         ( {{ $t('each', pokemon.buddy.candy_rewards >1 ? 1: 2) }} {{ pokemon.buddy.candy_distance }}km )
                    </span>
                </span>
            </section>
        </section> -->
    </section>

    <!-- Mientras llega el Pokémon: cabecera y cadena evolutiva con su forma. -->
    <skeleton-loader v-else class="pt-4 pb-10 px-6 sm:px-12 md:px-24 bg-white dark:bg-gray-900 rounded-xl border border-gray-300 shadow-md">
        <div class="flex items-center gap-4 pt-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <span class="w-20 h-20 shrink-0 flex items-center justify-center"><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span></span>
            <span class="flex flex-col gap-2">
                <span class="esqueleto h-3 w-10 rounded"></span>
                <span class="esqueleto h-6 w-40 rounded"></span>
                <span class="flex gap-2">
                    <span class="esqueleto h-3.5 w-16 rounded"></span>
                    <span class="esqueleto h-3.5 w-16 rounded"></span>
                </span>
            </span>
        </div>
        <div class="mt-4 flex items-center justify-between">
            <span class="esqueleto h-3.5 w-28 rounded"></span>
            <span class="esqueleto h-8 w-28 rounded-xl"></span>
        </div>
        <div class="my-6 flex flex-col items-center gap-10">
            <div v-for="n in 3" :key="n" class="flex flex-col items-center gap-3">
                <span class="w-24 h-24 flex items-center justify-center"><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span></span>
                <span class="esqueleto h-3.5 w-28 rounded"></span>
            </div>
        </div>
    </skeleton-loader>
</template>
