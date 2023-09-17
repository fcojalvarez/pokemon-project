<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '../lib/supabaseClient';
import { typesSVG } from '../utils/Settings';
import { BaseIcon, BaseCheckbox } from '../components/index';

const pokemon = ref(null);
const route = useRoute();
const isShowShiny = ref(false);

const getPokemon = async(pokemonId) => {
    const { data: [ pokemonFinded ] } = await supabase.from('pokemons').select('*').eq('pokemon_id', pokemonId);

    pokemon.value = {...pokemonFinded};
}

onMounted(async() => {
    const pokemonId = Number(route.params.id);
    
    if(pokemonId) await getPokemon(pokemonId);
    window.scrollTo({ top: 0, behavior: "smooth" });
    console.log(pokemon.value);
})

watch(route, async(newRoute) => {
    const pokemonIdFromRoute = Number(newRoute.params.id);
    if(pokemon.value.pokemon_id !== pokemonIdFromRoute) {
        await getPokemon(pokemonIdFromRoute);
    }
})
</script>

<template>
    <section v-if="pokemon" class="py-12 px-2 sm:px12 md:px-24 w-100 bg-white dark:bg-gray-900 rounded-xl border border-gray-300 shadow-md m-2">
        <section class="flex text-gray-800 dark:text-gray-200">
            <h1 class="font-bold">
                <span>{{ `#${ pokemon.pokemon_id?.toString().padStart(3, '0') }`}}</span>
                {{ pokemon.name }}
            </h1>
            
            <section class="my-auto ml-2 flex">
                <base-icon
                    v-if="pokemon.types"
                    view-box="0 0 512 512"
                    width="14" height="14"
                    :fill-path="typesSVG[pokemon.types[0]].color"
                    :d="typesSVG[pokemon.types[0]].icon"
                />
                <base-icon
                    v-if="pokemon.types && pokemon.types[1]"
                    view-box="0 0 512 512"
                    width="14" height="14"
                    icon-class="ml-2"
                    :fill-path="typesSVG[pokemon.types[1]].color"
                    :d="typesSVG[pokemon.types[1]].icon"
                />
            </section>
            
            <section><!-- TODO: badges --></section>
        </section>

        <section>
            <base-checkbox
                v-model="isShowShiny"
                name="show_shiny" :input-label="$t('viewShiny')"
                class="mt-4 flex justify-end"
                is-label-left=""
            />

            <img
                :src="isShowShiny? pokemon.sprites.male_shiny : pokemon.sprites.male"
                :alt="`${pokemon.name} ${$t('image')}`"
                class="h-64 w-64 mx-auto drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark"
                loading="lazy"
            >
        </section>

        <section><!-- evolutions --></section>

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
        </section>
    </section>
</template>
