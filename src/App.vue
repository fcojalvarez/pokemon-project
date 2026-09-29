<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import HeaderComponent from './components/shared/HeaderComponent.vue';
import FooterComponent from './components/shared/FooterComponent.vue';
import BottomNav from './components/shared/BottomNav.vue';
import UpdatePrompt from './components/shared/UpdatePrompt.vue';
import { useRoute } from 'vue-router';

// El panel de sugerencias va sin barra de secciones (meta.sinNavegacion).
const route = useRoute();

// Con la página ya bajada, la cabecera fija lleva una línea debajo: sin ella
// el contenido pasaba por detrás cortado a ras de los botones, sin separación.
const bajada = ref(false);
const alDesplazar = () => { bajada.value = window.scrollY > 4; };
onMounted(() => {
    alDesplazar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
});
onUnmounted(() => window.removeEventListener('scroll', alDesplazar));

// Se enfoca a mano en vez de dejar que el navegador siga el `#contenido`: con
// el historial del router, cambiar el hash dispara una navegación.
const saltarAlContenido = (event) => {
    event.preventDefault();
    document.getElementById('contenido')?.focus();
};
</script>

<template>
  <!-- En móvil, hueco abajo para la barra de secciones (BottomNav). -->
  <div class="transition-colors min-h-screen bg-gray-100 dark:bg-gray-700 px-4 sm:px-8 md:px-16 xl:px-24 2xl:px-32" :class="route.meta.sinNavegacion ? '' : 'pb-[calc(88px+env(safe-area-inset-bottom))] sm:pb-0'">
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-white focus:text-gray-900 focus:shadow-md"
      @click="saltarAlContenido"
    >
      {{ $t('a11y.skipToContent') }}
    </a>

    <!-- Con el fondo de la página: sin él, al bajar, los nombres pasaban por detrás
         del buscador y se leían entre los botones. -->
    <!--
      El alto de los botones sale de h-16 / sm:h-14 (HeaderComponent) menos este
      relleno: 48 px en móvil y 40 desde sm. El mismo arriba y abajo, para que
      los botones queden centrados entre el borde y la línea de abajo. La
      línea es una sombra y no un borde para no quitarles ni un píxel. Va a
      sangre (-mx con el mismo px del contenedor) para cruzar la pantalla.
    -->
    <HeaderComponent
      class="mb-2 py-2 sm:mb-4 sticky top-0 z-20 bg-gray-100 dark:bg-gray-700 transition-[color,background-color,box-shadow] -mx-4 px-4 sm:-mx-8 sm:px-8 md:-mx-16 md:px-16 xl:-mx-24 xl:px-24 2xl:-mx-32 2xl:px-32"
      :class="bajada ? 'shadow-[0_1px_0_0_#d1d5db] dark:shadow-[0_1px_0_0_#4b5563]' : ''"
    />

    <!-- tabindex -1: recibe el foco del enlace de salto sin entrar en el orden del tabulador. -->
    <main id="contenido" tabindex="-1" class="min-h-[74vh] mb-4 focus:outline-none">
      <RouterView />
    </main>

    <footer class="py-12 mt-auto">
      <FooterComponent />
    </footer>

    <BottomNav v-if="!route.meta.sinNavegacion" />

    <!-- El aviso de versión nueva (usePwaUpdate). -->
    <UpdatePrompt />
  </div>
</template>
