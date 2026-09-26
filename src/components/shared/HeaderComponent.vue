<script setup>
    import { computed } from 'vue';
    import { useRoute } from 'vue-router';
    import { SearchBar, ToggleDarkMode, BaseIcon, NavMenu } from '../index';
    import { useMainStore } from '../../stores/main';
    import { storeToRefs } from 'pinia';

    const mainStore = useMainStore();
    const { isDarkMode } = storeToRefs(mainStore);
    const route = useRoute();

    // Solo en la ficha de un Pokémon: entre páginas principales se navega
    // con el menú, así que ahí el botón de volver no pinta nada.
    const isPokemonView = computed(() => route.name === 'PokemonPage');
</script>

<template>
    <!--
        Todo son elementos de una fila flex: el botón de volver crece desde cero
        y empuja a la barra de búsqueda, que se encoge. Así, entre el botón de
        volver y el de menú, nunca se pueden tapar entre ellos.
    -->
    <header class="h-20 md:h-16 flex items-stretch gap-3">
        <button
            class="back-btn shrink-0 border-gray-400 rounded-xl shadow-md bg-white dark:bg-gray-900 hover:bg-gray-150 hover:dark:bg-gray-800"
            :class="{ 'back-btn-visible': isPokemonView }"
            :tabindex="isPokemonView ? 0 : -1"
            :aria-hidden="!isPokemonView"
            :aria-label="$t('back')"
            @click="$router.push('/')"
        >
            <div class="flex md:hidden justify-center items-center h-full">
                <base-icon
                    width="20" height="20"
                    stroke-width="1.5" :color="isDarkMode?'#fff':'#666'"
                    d="M21 12H3m0 0 8.5-8.5M3 12l8.5 8.5"
                />
            </div>

            <span class="hidden md:block text-gray-800 dark:text-white whitespace-nowrap">
                {{ $t('back') }}
            </span>
        </button>

        <search-bar id="search-bar" class="flex-1 min-w-0 md:max-w-lg" />

        <!-- ml-auto: en escritorio el buscador topa en max-w-lg y el hueco
             que sobra empuja estos dos botones a la derecha. -->
        <!-- En móvil el modo oscuro va dentro del menú: aquí le quitaba al
             buscador el sitio que necesita. -->
        <toggle-dark-mode class="hidden md:flex shrink-0 ml-auto px-4 cursor-pointer" />

        <nav-menu class="shrink-0" />
    </header>
</template>

<style scoped>
.back-btn {
    max-width: 0;
    opacity: 0;
    padding: 0;
    border-width: 0;
    overflow: hidden;
    transition: max-width 0.3s ease, opacity 0.25s ease, padding 0.3s ease;
}
.back-btn-visible {
    max-width: 60px;
    opacity: 1;
    padding: 9px 16px;
    border-width: 1px;
}
@media (min-width: 768px) {
    .back-btn-visible {
        max-width: 150px;
        padding: 8px 16px;
    }
}
@media (prefers-reduced-motion: reduce) {
    .back-btn { transition: none; }
}
</style>
