<script setup>
    import { ref, watch, computed } from 'vue';
    import { BaseIcon, SpinnerComponent } from '.';
    import { useRoute, useRouter } from 'vue-router';
    import useDetectOutsideClick from '../composables/useDetectOutsideClick';
    import { useMedia } from '../composables/useMedia';
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

    /**
     * En móvil el buscador se queda plegado en una lupa: abierto ocupaba media
     * cabecera todo el rato. Al tocarla crece hacia la derecha hasta el menú,
     * tapando el modo oscuro, y se vuelve a plegar al salir si está vacío. Con
     * algo escrito sigue abierto: en la Pokédex eso es lo que filtra la rejilla.
     * En escritorio sobra sitio y está siempre abierto.
     */
    const emit = defineEmits(['tapa']);
    const esMovil = useMedia('(max-width: 767px)');
    const abierto = ref(false);
    const plegado = computed(() => esMovil.value && !abierto.value);
    watch(() => esMovil.value && abierto.value, (tapa) => emit('tapa', tapa), { immediate: true });

    const inputRef = ref();
    const lupaRef = ref();
    // El foco, en el mismo toque: si se deja para después del repintado, el
    // Safari del iPhone no saca el teclado.
    const abrir = () => {
        abierto.value = true;
        inputRef.value?.focus();
    }
    const cerrar = ({ devolverFoco = false } = {}) => {
        abierto.value = false;
        isShowModalSearch.value = false;
        if (devolverFoco) lupaRef.value?.focus();
    }
    // La ✕ vacía y pliega. En la Pokédex además deja la rejilla sin filtro.
    const vaciarYCerrar = () => {
        const habiaTexto = Boolean(inputValue.value);
        inputValue.value = null;
        if (habiaTexto && isListView.value) inputSearch();
        cerrar({ devolverFoco: true });
    }
    const alSalir = (event) => {
        if (!esMovil.value || inputValue.value) return;
        if (event.currentTarget.contains(event.relatedTarget)) return;
        cerrar();
    }

    const scrollbarBackground = computed(() => isDarkMode.value? '#111827' : '#fff');
    const scrollbarThumbBorder = computed(() => isDarkMode.value? '#33333350' : '#33333350');
    const scrollbarThumbBackground = computed(() => isDarkMode.value? '#cccccc80' : '#cccccc80');

    const inputSearch = () => {
        setIsSearching(true);
        filterPokemons(inputValue.value);
    }

    // Solo cuenta la respuesta a lo último que se ha escrito: si no, la de
    // «sir» podía llegar después que la de «sirfetchd» y quedarse en pantalla.
    let ultimaBusqueda = 0;
    const inputSearchModal = async() => {
        setIsSearching(true);
        isShowModalSearch.value = true;
        isLoadingPokemonNames.value = true;

        const esta = ++ultimaBusqueda;
        const pokemonsResponse = await filterPokemons(inputValue.value, true);
        if(esta !== ultimaBusqueda) return;
        pokemonsNamesArrFiltered.value = pokemonsResponse;
        setIsSearching(false);
        isLoadingPokemonNames.value = false;
    }

    const goToPokemonPage = (pokemonId) => {
        pokemonId && router.push(`/pokemon/${pokemonId}`);
        inputValue.value = null;
        cerrar();
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
        if (event.key === 'Escape') {
            // Primero cierra los resultados; con ellos ya cerrados, pliega.
            if (!isListView.value && isShowModalSearch.value) isShowModalSearch.value = false;
            else if (esMovil.value && !inputValue.value) cerrar({ devolverFoco: true });
            return;
        }
        if (isListView.value) return;
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
        abierto.value = Boolean(inputValue.value);
    }, { immediate: true })
</script>

<template>
    <!-- El anillo de foco va en la caja entera y no en el campo, que queda
         metido dentro del borde y se veía como un segundo recuadro. -->
    <!-- Menos relleno en móvil: con 28 px por lado, en la ficha a 320 px solo
         cabía la «B» de «Buscar». -->
    <!-- En móvil, sin relleno a la izquierda: la lupa ocupa el cuadrado entero
         del botón plegado y queda en el mismo sitio al abrirse. -->
    <section
        class="buscador relative flex items-center gap-2 transition-colors w-full md:px-4 border border-gray-400 bg-white dark:bg-gray-900 rounded-xl shadow-md focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-blue-600 dark:focus-within:outline-blue-300"
        :class="{ 'buscador-abierto pr-1': abierto, 'overflow-hidden': plegado }"
        @focusout="alSalir"
    >
        <button
            ref="lupaRef"
            type="button"
            class="md:hidden shrink-0 self-stretch w-12 flex items-center justify-center"
            :class="abierto ? 'pointer-events-none' : 'cursor-pointer'"
            :tabindex="abierto ? -1 : 0"
            :aria-hidden="abierto || undefined"
            :aria-label="$t('a11y.openSearch')"
            :aria-expanded="abierto"
            @click="abrir"
        >
            <base-icon
                :stroke-width="1.5"
                icon-class="w-6"
                class-path="stroke-gray-600 dark:stroke-gray-100"
                d="m17 17 4 4M3 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0z"
            />
        </button>
        <input
            id="input-search"
            ref="inputRef"
            type="text"
            v-model="inputValue"
            autocomplete="off"
            class="flex-1 min-w-0 bg-transparent py-2 px-1.5 md:px-3 outline-none focus-visible:outline-none text-black dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            :placeholder="$t('searchPokemon')"
            :aria-label="$t('a11y.search')"
            :role="isListView ? undefined : 'combobox'"
            :aria-expanded="isListView ? undefined : isShowModalSearch"
            :aria-controls="isListView ? undefined : 'search-results'"
            :aria-autocomplete="isListView ? undefined : 'list'"
            :aria-activedescendant="activeId"
            :tabindex="plegado ? -1 : undefined"
            :aria-hidden="plegado || undefined"
            @input="isListView? inputSearch() : inputSearchModal()"
            @keydown="onKeydown"
        >
        <button
            v-if="esMovil && abierto"
            type="button"
            class="zona-tactil shrink-0 w-9 h-9 rounded-lg text-gray-600 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800"
            :aria-label="$t('a11y.closeSearch')"
            @click="vaciarYCerrar"
        >
            <span aria-hidden="true">✕</span>
        </button>
        <base-icon
            :stroke-width="1.5"
            icon-class="hidden md:block shrink-0 w-6"
            class-path="stroke-gray-600 dark:stroke-gray-100"
            d="m17 17 4 4M3 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0z"
        />

        <section ref="searchBarRef" v-if="isShowModalSearch" class="absolute left-0 top-full z-40 mt-2 w-full py-2 border border-gray-400 bg-white dark:bg-gray-900 dark:text-white rounded-xl shadow-md">
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
/* Plegado mide lo mismo que los botones de modo oscuro y menú. Va encima del
   de modo oscuro (HeaderComponent) y al abrirse lo tapa. */
@media (max-width: 767px) {
    .buscador {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        z-index: 10;
        width: 50px;
        transition: width 0.25s ease, background-color 0.15s, color 0.15s;
    }
    .buscador-abierto {
        width: 100%;
    }
    .buscador input {
        transition: opacity 0.2s ease;
    }
    .buscador:not(.buscador-abierto) input {
        opacity: 0;
    }
}
@media (prefers-reduced-motion: reduce) {
    .buscador, .buscador input { transition: none; }
}
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
