<script setup>
    import { ref, watch, computed } from 'vue';
    import { BaseIcon, SpinnerComponent } from '.';
    import { useRoute, useRouter } from 'vue-router';
    import useDetectOutsideClick from '../composables/useDetectOutsideClick';
    import { usePokemonsStore } from '@/stores/pokemons';
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
    const pokemonsNamesArrFiltered = ref([]);
    // Solo en la Pokédex el buscador filtra la rejilla que hay debajo. En el
    // resto de páginas no hay lista que filtrar, así que abre el desplegable
    // de resultados y desde ahí se salta a la ficha.
    const isListView = computed(() => route.name === 'PokemonList');
    const searchBarRef = ref();

    const scrollbarBackground = computed(() => isDarkMode.value? '#111827' : '#fff');
    const scrollbarThumbBorder = computed(() => isDarkMode.value? '#33333350' : '#33333350');
    const scrollbarThumbBackground = computed(() => isDarkMode.value? '#cccccc80' : '#cccccc80');

    const inputSearch = () => {
        setIsSearching(true);
        filterPokemons(inputValue.value);
    }

    const inputSearchModal = async() => {
        setIsSearching(true);
        isShowModalSearch.value = true;
        isLoadingPokemonNames.value = true;
        
        const pokemonsResponse = await filterPokemons(inputValue.value, true);
        pokemonsNamesArrFiltered.value = pokemonsResponse;
        setIsSearching(false);
        isLoadingPokemonNames.value = false;
    }

    const goToPokemonPage = (pokemonId) => {
        pokemonId && router.push(`/pokemon/${pokemonId}`);
        inputValue.value = null;
        isShowModalSearch.value = false;
    }

    /**
     * Navegación con teclado por los resultados (patrón combobox): el foco se
     * queda en el campo y las flechas mueven la opción activa, que se anuncia
     * con aria-activedescendant.
     */
    const activeIndex = ref(-1);
    const hasResults = computed(() => isShowModalSearch.value && !isLoadingPokemonNames.value && pokemonsNamesArrFiltered.value.length > 0);
    const activeId = computed(() => hasResults.value && activeIndex.value >= 0 ? `search-option-${activeIndex.value}` : undefined);

    watch(pokemonsNamesArrFiltered, () => { activeIndex.value = -1; });

    const onKeydown = (event) => {
        if (isListView.value) return;
        if (event.key === 'Escape') {
            isShowModalSearch.value = false;
            return;
        }
        if (!hasResults.value) return;
        const last = pokemonsNamesArrFiltered.value.length - 1;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            activeIndex.value = activeIndex.value >= last ? 0 : activeIndex.value + 1;
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            activeIndex.value = activeIndex.value <= 0 ? last : activeIndex.value - 1;
        } else if (event.key === 'Enter' && activeIndex.value >= 0) {
            event.preventDefault();
            goToPokemonPage(pokemonsNamesArrFiltered.value[activeIndex.value].pokemon_id);
        }
    }

    useDetectOutsideClick(searchBarRef, (e) => {
        const isClickInSearch = e.target.id === 'input-search';
        
        if(!isShowModalSearch.value || isClickInSearch ) return;
        
        isShowModalSearch.value = false;
    })

    // Al cambiar de página, el buscador enseña la búsqueda de la Pokédex si la
    // URL la trae (?q=, al volver atrás) y se vacía si no. Solo al cambiar de
    // página, no con cada tecla: la URL se actualiza mientras se escribe y, si
    // se copiara de vuelta, podría pisar lo último tecleado.
    watch(() => route.path, () => {
        if(isListView.value) isShowModalSearch.value = false;
        inputValue.value = isListView.value && route.query.q ? String(route.query.q) : null;
    }, { immediate: true })
</script>

<template>
    <!-- El anillo de foco va en la caja entera y no en el campo, que queda
         metido dentro del borde y se veía como un segundo recuadro. -->
    <!-- Menos relleno en móvil: con 28 px por lado, en la ficha a 320 px solo
         cabía la «B» de «Buscar». -->
    <section class="relative transition-colors w-full px-2 md:px-4 border border-gray-400 bg-white dark:bg-gray-900 rounded-xl shadow-md focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-blue-600 dark:focus-within:outline-blue-300">
        <input
            id="input-search"
            type="text"
            v-model="inputValue"
            autocomplete="off"
            class="w-full bg-transparent py-2 px-1.5 md:px-3 mt-2 md:mt-0 outline-none focus-visible:outline-none text-black dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            :placeholder="$t('searchPokemon')"
            :aria-label="$t('a11y.search')"
            :role="isListView ? undefined : 'combobox'"
            :aria-expanded="isListView ? undefined : isShowModalSearch"
            :aria-controls="isListView ? undefined : 'search-results'"
            :aria-autocomplete="isListView ? undefined : 'list'"
            :aria-activedescendant="activeId"
            @input="isListView? inputSearch() : inputSearchModal()"
            @keydown="onKeydown"
        >
        <base-icon
            :stroke-width="1.5"
            icon-class="hidden sm:block xs:absolute bottom-4 md:bottom-2 right-4 w-6"
            class-path="stroke-gray-600 dark:stroke-gray-100"
            d="m17 17 4 4M3 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0z"
        />

        <section ref="searchBarRef" v-if="isShowModalSearch" class="absolute left-0 z-40 mt-5 w-full  m-0 py-2 border border-gray-400 bg-white dark:bg-gray-900 dark:text-white rounded-xl shadow-md">
           <div class="overflow-y-scroll search-modal min-h-[120px] max-h-96">
                <SpinnerComponent v-if="isLoadingPokemonNames"/>

                <ul v-else id="search-results" role="listbox" :aria-label="$t('a11y.searchResults')">
                    <li
                        v-for="({name, pokemon_id}, index) in pokemonsNamesArrFiltered"
                        :id="`search-option-${index}`"
                        :key="pokemon_id"
                        role="option"
                        :aria-selected="index === activeIndex"
                        class="px-4 block py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        :class="index === activeIndex ? 'bg-gray-100 dark:bg-gray-700' : ''"
                        @click="goToPokemonPage(pokemon_id)"
                    >
                        {{ name }}
                    </li>
                </ul>
           </div>
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
