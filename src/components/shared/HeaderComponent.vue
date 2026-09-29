<script setup>
    import { computed, ref } from 'vue';
    import { useRoute, useRouter } from 'vue-router';
    import SearchBar from '../SearchBar.vue';
    import ToggleDarkMode from '../ToggleDarkMode.vue';
    import BaseIcon from '../base/BaseIcon.vue';
    import NavMenu from './NavMenu.vue';
    import SettingsMenu from './SettingsMenu.vue';

    const route = useRoute();

    // Solo en la ficha de un Pokémon: entre páginas principales se navega
    // con el menú, así que ahí el botón de volver no pinta nada.
    const isPokemonView = computed(() => route.name === 'PokemonPage');

    const router = useRouter();

    // Con el buscador abierto el modo oscuro queda debajo: fuera del
    // tabulador, para no enfocar un botón que no se ve.
    const buscadorTapa = ref(false);

    /**
     * El logo lleva a la Pokédex como recién abierta. Llegar a «/» sin nada en
     * la URL ya le quita filtros y búsqueda (PokemonsList); si ya se está ahí
     * tal cual, lo único que falta es volver arriba.
     */
    const irAlInicio = () => {
        if (route.path === '/' && !Object.keys(route.query).length) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

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
            class="back-btn shrink-0 rounded-xl hover:bg-gray-200 hover:dark:bg-gray-800"
            :class="{ 'back-btn-visible': isPokemonView }"
            :tabindex="isPokemonView && !buscadorTapa ? 0 : -1"
            :aria-hidden="!isPokemonView || buscadorTapa || undefined"
            :inert="buscadorTapa || undefined"
            :aria-label="$t('back')"
            @click="volver"
        >
            <div class="flex justify-center items-center h-full text-gray-500 dark:text-gray-300">
                <base-icon
                    width="20" height="20"
                    :stroke-width="1.5" color="currentColor"
                    d="M21 12H3m0 0 8.5-8.5M3 12l8.5 8.5"
                />
            </div>
        </button>

        <!--
            El icono y el nombre, en el centro de la cabecera (de toda ella, no
            del hueco que queda: por eso va absoluto). Lleva a la Pokédex.
            Se aparta mientras el buscador está abierto, que lo tapa.
        -->
        <router-link
            to="/"
            class="marca absolute z-[5] inset-y-0 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-1 rounded-xl text-gray-800 dark:text-gray-100 transition-opacity"
            :class="buscadorTapa ? 'opacity-0 pointer-events-none' : ''"
            :tabindex="buscadorTapa ? -1 : undefined"
            :aria-hidden="buscadorTapa || undefined"
            :aria-label="`PoGoDex, ${$t('appTagline')}`"
            @click="irAlInicio"
        >
            <!--
                El pin a la izquierda y, a su lado, el nombre y «para Pokémon GO»
                debajo. El nombre accesible va entero en aria-label. font-black
                explícito en el nombre: base.css pone font-weight normal a cada
                elemento con *, y no se heredaba.
            -->
            <!-- Igual en todas las vistas; en móvil, algo más pequeño para que en la ficha quepa entre volver y la lupa. -->
            <img src="/icons/favicon.svg" alt="" width="32" height="32" class="w-6 h-6 sm:w-8 sm:h-8 shrink-0">
            <span class="flex flex-col">
                <span class="font-['PoGoDex_Marca',monospace] font-black text-[15px] sm:text-lg leading-none tracking-tight">PoGoDex</span>
                <span class="mt-0.5 text-[9px] sm:text-[10px] leading-none sm:tracking-wide text-gray-600 dark:text-gray-300">{{ $t('appTagline') }}</span>
            </span>
        </router-link>
        <!--
            El buscador y el modo oscuro comparten hueco. El buscador es una
            lupa (absoluta, a la izquierda del hueco) que al abrirse lo llena
            entero y tapa el modo oscuro; ver SearchBar. Igual en todos los
            anchos: en escritorio iba desplegado y con caja, y los botones con
            caja y texto, y la cabecera no se parecía a la del móvil.
            El hueco del buscador cruza el centro y va después: sin el z-[5] del
            logo, le quitaba los clics. El buscador abierto (z-10) queda encima.
        -->
        <div class="relative flex-1 min-w-0 flex items-stretch gap-3">
            <search-bar
                v-if="!route.meta.sinNavegacion"
                id="search-bar"
                class="min-w-0"
                :class="{ 'buscar-sobre-volver': isPokemonView }"
                @tapa="buscadorTapa = $event"
            />

            <!--
                En móvil el modo oscuro vive en Ajustes (SettingsMenu). El
                tema de arranque lo pone main.js.
            -->
            <toggle-dark-mode
                class="hidden sm:flex shrink-0 ml-auto"
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
/* Solo la flecha en gris y sin caja, como la lupa y los ajustes, y
   con la lupa pegada: sin el gap-3 y los dos en 36 px (la lupa, abajo). Con
   el ancho de siempre, entre los dos iconos quedaban 23 px de aire. */
.back-btn-visible {
    margin-right: -0.75rem;
    max-width: 36px;
    width: 36px;
    opacity: 1;
}
/*
 * En la ficha, el buscador abierto se come también el botón de
 * volver: crece hacia la izquierda lo que mide el botón (36 px, sin hueco). .buscador-abierto lo pone SearchBar en su raíz; el estilo con scope
 * de aquí le llega porque la raíz de un hijo lleva también el del padre.
 */
.buscar-sobre-volver.buscador-abierto {
    left: -36px;
    width: calc(100% + 36px);
    transition: width 0.25s ease, left 0.25s ease, background-color 0.15s, color 0.15s;
}
/*
 * La lupa de SearchBar, en la ficha, en un hueco de 36 px como el de volver y
 * con el icono centrado. Arrimarla a la izquierda dentro del de 50 dejaba el
 * anillo de foco descentrado respecto al icono.
 */
.buscar-sobre-volver:not(.buscador-abierto) {
    width: 36px;
}
.buscar-sobre-volver:not(.buscador-abierto) :deep(> button:first-child) {
    width: 100%;
}
@media (prefers-reduced-motion: reduce) {
    .back-btn { transition: none; }
}
</style>
