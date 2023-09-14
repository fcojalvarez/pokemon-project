<script setup>
import { ref, watch } from 'vue';
import { BaseIcon, SpinnerComponent } from '.';
import { useRoute, useRouter } from 'vue-router';
import { usePokemonsStore } from '@/stores/pokemons';
import { supabase } from '../lib/supabaseClient';

const { filterPokemons } = usePokemonsStore();
const route = useRoute();
const router = useRouter();

const inputValue = ref(null);
const isShowModalSearch = ref(false);
const isLoadingPokemonNames = ref(false);
const pokemonsNamesArr = ref([]);
const pokemonsNamesArrFiltered = ref([]);
const isPokemonView = ref(false);

const inputSearch = () => {
    filterPokemons(inputValue.value);
}

const inputSearchModal = async() => {
    isShowModalSearch.value = true;
    isLoadingPokemonNames.value = true;
    
    if(pokemonsNamesArr.value.length === 0) await getPokemonsNames();
    isLoadingPokemonNames.value = false;
    
    pokemonsNamesArrFiltered.value = pokemonsNamesArr.value.filter(({name}) => name.toLowerCase().includes(inputValue.value.trim().toLowerCase()));
}

const goToPokemonPage = (pokemonId) => {
    pokemonId && router.push(`/pokemon/${pokemonId}`);
    inputValue.value = null;
    isShowModalSearch.value = false;
}

const getPokemonsNames = async() => {
    const {data: pokemonsNames, error } = await supabase.from('pokemons').select('pokemon_id, name').order('pokemon_id', { ascending: true })

    pokemonsNamesArr.value = pokemonsNames;
}

watch(route, (newRoute) => {
    const pokemonPage = 'PokemonPage';
    if(newRoute.name === pokemonPage) {
        isPokemonView.value = true;
        inputValue.value = null;
    }
})
</script>

<template>
    <section class="relative transition-colors w-full mr-1 md:w-6/12 lg:w-64 h-100 px-4 border border-gray-400 bg-white dark:bg-gray-900 rounded-xl shadow-md">
        <input type="text" v-model="inputValue" class="w-full bg-transparent py-2 px-3 mt-2 md:mt-0 outline-none text-black dark:text-gray-300" :placeholder="$t('searchPokemon')"  @input="isPokemonView? inputSearchModal() : inputSearch()">
        <base-icon
            :stroke-width="1.5"
            icon-class="absolute bottom-4 md:bottom-2 right-4 w-6"
            class-path="stroke-gray-600 dark:stroke-gray-100"
            d="m17 17 4 4M3 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0z"
        />
        <section v-if="isShowModalSearch" class="search-modal absolute left-0 z-40 overflow-y-scroll mt-5 w-full max-h-96 m-0 py-2 border border-gray-400 bg-white dark:bg-gray-900 rounded-xl shadow-md">
            <SpinnerComponent v-if="isLoadingPokemonNames"/>
            <template v-else>
                <span
                    @click="goToPokemonPage(pokemon_id)"
                    v-for="({name, pokemon_id}) in pokemonsNamesArrFiltered"
                    :key="pokemon_id" class="px-4 block py-2 cursor-pointer hover:bg-gray-100"
                >
                    {{ name }}
                </span>
            </template>
        </section>
    </section>
</template>

<style scoped>
[placeholder]:focus::-webkit-input-placeholder {
    transition: text-indent 0.4s 0.4s ease; 
    text-indent: -100%;
    opacity: 1;
}
::-webkit-scrollbar {
    width: 8px;
    position: absolute;
    right: 2rem;
}

::-webkit-scrollbar-track {
    background: #fff;
}

::-webkit-scrollbar-thumb {
    border: 1px solid #33333360;
    background: #cccccc70;
    border-radius: 20px;
}
</style>
