<script setup>
    import { ref, watch, computed } from 'vue';
    import { BaseIcon, SpinnerComponent } from '.';
    import { useRoute, useRouter } from 'vue-router';
    import useDetectOutsideClick from '../composables/useDetectOutsideClick';
    import { usePokemonsStore } from '@/stores/pokemons';
    import { supabase } from '../lib/supabaseClient';
    import { useMainStore } from '../stores/main';
    import { storeToRefs } from 'pinia';

    const mainStore = useMainStore();
    const { isDarkMode } = storeToRefs(mainStore);
    const { filterPokemons, setIsSearching } = usePokemonsStore();
    const route = useRoute();
    const router = useRouter();

    const inputValue = ref(null);
    const isShowModalSearch = ref(false);
    const isLoadingPokemonNames = ref(true);
    const pokemonsNamesArr = ref([]);
    const pokemonsNamesArrFiltered = ref([]);
    const isPokemonView = ref(false);
    const searchBarRef = ref();

    const scrollbarBackground = computed(() => isDarkMode.value? '#111827' : '#fff');
    const scrollbarThumbBorder = computed(() => isDarkMode.value? '#33333350' : '#33333350');
    const scrollbarThumbBackground = computed(() => isDarkMode.value? '#cccccc80' : '#cccccc80');

    const inputSearch = () => {
        setIsSearching(inputValue.value);
        filterPokemons(inputValue.value);
    }

    const inputSearchModal = async() => {
        setIsSearching(true);
        isShowModalSearch.value = true;
        isLoadingPokemonNames.value = true;
        
        setIsSearching(inputValue.value);
        const pokemonsResponse = await filterPokemons(inputValue.value, true);
        pokemonsNamesArrFiltered.value = pokemonsResponse;
        isLoadingPokemonNames.value = false;
    }

    const goToPokemonPage = (pokemonId) => {
        pokemonId && router.push(`/pokemon/${pokemonId}`);
        inputValue.value = null;
        isShowModalSearch.value = false;
    }

    const getPokemonsNames = async() => {
        const {data: pokemonsNames } = await supabase.from('pokemons').select('pokemon_id, name').order('pokemon_id', { ascending: true })

        pokemonsNamesArr.value = pokemonsNames;
    }

    useDetectOutsideClick(searchBarRef, (e) => {
        const isClickInSearch = e.target.id === 'input-search';
        
        if(!isShowModalSearch.value || isClickInSearch ) return;
        
        isShowModalSearch.value = false;
    })

    watch(route, (newRoute) => {
        const isViewPokemon = newRoute.name === 'PokemonPage' 
        isPokemonView.value = isViewPokemon;
        if(!isViewPokemon) isShowModalSearch.value = false;
        inputValue.value = null;
    })
</script>

<template>
    <section class="relative transition-colors w-full mr-1 md:w-6/12 lg:w-64 h-100 px-4 border border-gray-400 bg-white dark:bg-gray-900 rounded-xl shadow-md">
        <input id="input-search" type="text" v-model="inputValue" class="w-full bg-transparent py-2 px-3 mt-2 md:mt-0 outline-none text-black dark:text-gray-300" :placeholder="$t('searchPokemon')"  @input="isPokemonView? inputSearchModal() : inputSearch()">
        <base-icon
            :stroke-width="1.5"
            icon-class="hidden sm:block xs:absolute bottom-4 md:bottom-2 right-4 w-6"
            class-path="stroke-gray-600 dark:stroke-gray-100"
            d="m17 17 4 4M3 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0z"
        />
        <section ref="searchBarRef" v-if="isShowModalSearch" class="search-modal absolute left-0 z-40 overflow-y-scroll mt-5 w-full min-h-[120px] max-h-96 m-0 py-2 border border-gray-400 bg-white dark:bg-gray-900 dark:text-white rounded-xl shadow-md">
            <SpinnerComponent v-if="isLoadingPokemonNames"/>

            <template v-else>
                <span
                    @click="goToPokemonPage(pokemon_id)"
                    v-for="({name, pokemon_id}) in pokemonsNamesArrFiltered"
                    :key="pokemon_id" class="px-4 block py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
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
}

::-webkit-scrollbar-track {
    background: v-bind(scrollbarBackground);
}

::-webkit-scrollbar-thumb {
    border: 1px solid v-bind(scrollbarThumbBorder);
    background: v-bind(scrollbarThumbBackground);
    border-radius: 20px;
}
</style>
