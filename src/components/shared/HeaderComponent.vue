<script setup>
    import { computed, ref } from 'vue';
    import { useRoute, useRouter } from 'vue-router';
    import { SearchBar, ToggleDarkMode, BaseIcon, NavMenu } from '../index';
    import SettingsMenu from './SettingsMenu.vue';
    import { useMainStore } from '../../stores/main';
    import { storeToRefs } from 'pinia';

    const mainStore = useMainStore();
    const { isDarkMode } = storeToRefs(mainStore);
    const route = useRoute();

    // Solo en la ficha de un Pokémon: entre páginas principales se navega
    // con el menú, así que ahí el botón de volver no pinta nada.
    const isPokemonView = computed(() => route.name === 'PokemonPage');

    const router = useRouter();

    // En móvil, con el buscador abierto el modo oscuro queda debajo: fuera del
    // tabulador, para no enfocar un botón que no se ve.
    const buscadorTapa = ref(false);

    /**
     * Vuelve a donde se estaba: el Top, los eventos, otra ficha… Antes iba
     * siempre a la Pokédex. Si se entró directamente a la ficha (un enlace
     * compartido) no hay a dónde volver dentro de la app, y entonces sí se va
     * a la Pokédex. El router guarda la página anterior en history.state.back.
     */
    const volver = () => {
        if (window.history.state?.back) router.back();
        else router.push('/');
    };
</script>

<template>
    <!--
        Todo son elementos de una fila flex: el botón de volver crece desde cero
        y empuja a la barra de búsqueda, que se encoge. Así, entre el botón de
        volver y el de menú, nunca se pueden tapar entre ellos.
    -->
    <header class="relative h-16 sm:h-14 flex items-stretch gap-3">
        <button
            class="back-btn shrink-0 rounded-xl hover:bg-gray-200 hover:dark:bg-gray-800 md:border-gray-400 md:shadow-md md:bg-white md:dark:bg-gray-900 md:hover:bg-gray-150"
            :class="{ 'back-btn-visible': isPokemonView }"
            :tabindex="isPokemonView ? 0 : -1"
            :aria-hidden="!isPokemonView"
            :aria-label="$t('back')"
            @click="volver"
        >
            <div class="flex md:hidden justify-center items-center h-full">
                <base-icon
                    width="20" height="20"
                    :stroke-width="1.5" :color="isDarkMode?'#d1d5db':'#6b7280'"
                    d="M21 12H3m0 0 8.5-8.5M3 12l8.5 8.5"
                />
            </div>

            <span class="hidden md:block text-gray-800 dark:text-white whitespace-nowrap">
                {{ $t('back') }}
            </span>
        </button>

        <!--
            El icono y el nombre, en el centro de la cabecera (de toda ella, no
            del hueco que queda: por eso va absoluto). Lleva a la Pokédex.
            Entre md y lg no cabe: el buscador ya va desplegado y los botones
            de la derecha llevan texto, y se encontraban en el medio. En
            móvil se aparta mientras el buscador está abierto, que lo tapa.
        -->
        <router-link
            to="/"
            class="marca absolute inset-y-0 left-1/2 -translate-x-1/2 flex md:hidden lg:flex items-center gap-1.5 sm:gap-2 px-1 rounded-xl font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100 transition-opacity"
            :class="buscadorTapa ? 'opacity-0 pointer-events-none' : ''"
            :tabindex="buscadorTapa ? -1 : undefined"
            :aria-hidden="buscadorTapa || undefined"
        >
            <img src="/icons/favicon.svg" alt="" width="28" height="28" class="w-6 h-6 sm:w-7 sm:h-7">
            <!-- En la ficha de un móvil muy estrecho, con volver y la lupa a la izquierda, solo cabe el icono. -->
            <span :class="isPokemonView ? 'max-[379px]:sr-only' : ''">PoGoDex</span>
        </router-link>
        <!--
            El buscador y el modo oscuro comparten hueco. En escritorio van en
            fila, como siempre: el buscador topa en max-w-lg y el ml-auto manda
            el modo oscuro a la derecha. En móvil el buscador es una lupa
            (absoluta, a la izquierda del hueco) que al abrirse lo llena entero
            y tapa el modo oscuro; ver SearchBar.
        -->
        <div class="relative flex-1 min-w-0 flex items-stretch gap-3">
            <!-- Desde lg, que no llegue al centro, donde va el nombre: la mitad del hueco, o menos con el botón de volver al lado. -->
            <search-bar
                v-if="!route.meta.sinNavegacion"
                id="search-bar"
                class="md:flex-1 min-w-0 md:max-w-lg"
                :class="isPokemonView ? 'lg:max-w-[min(32rem,calc(50%-7rem))]' : 'lg:max-w-[min(32rem,calc(50%-2rem))]'"
                @tapa="buscadorTapa = $event"
            />

            <!--
                En móvil el modo oscuro vive en Ajustes (SettingsMenu). Se
                oculta pero sigue montado: es quien aplica al arrancar el
                tema guardado o el del sistema.
            -->
            <toggle-dark-mode
                class="hidden sm:flex shrink-0 ml-auto px-4 cursor-pointer"
                :inert="buscadorTapa || undefined"
                :aria-hidden="buscadorTapa || undefined"
            />
        </div>

        <!-- En móvil, Ajustes en vez del menú: las secciones ya están en la barra de abajo. -->
        <settings-menu class="sm:hidden shrink-0 ml-auto" />
        <nav-menu class="hidden sm:flex shrink-0" />
    </header>
</template>

<style scoped>
.back-btn {
    max-width: 0;
    opacity: 0;
    padding: 0;
    border-width: 0;
    overflow: hidden;
    /* Oculto mide 0, pero el gap-3 de la fila seguía dejando 12 px antes del
       buscador y este no quedaba alineado con el contenido. */
    margin-right: -0.75rem;
    transition: max-width 0.3s ease, opacity 0.25s ease, padding 0.3s ease, margin 0.3s ease;
}
/* En móvil, solo la flecha en gris y sin caja, como la lupa y los ajustes. */
.back-btn-visible {
    margin-right: 0;
    max-width: 44px;
    width: 44px;
    opacity: 1;
}
/* Desde md lleva el texto «Volver», y ahí sí con su caja. */
@media (min-width: 768px) {
    .back-btn-visible {
        width: auto;
        max-width: 150px;
        padding: 8px 16px;
        border-width: 1px;
    }
}
@media (prefers-reduced-motion: reduce) {
    .back-btn { transition: none; }
}
</style>
