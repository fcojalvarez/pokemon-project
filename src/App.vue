<script setup>
import { HeaderComponent, FooterComponent } from './components/index';

// Se enfoca a mano en vez de dejar que el navegador siga el `#contenido`: con
// el historial del router, cambiar el hash dispara una navegación.
const saltarAlContenido = (event) => {
    event.preventDefault();
    document.getElementById('contenido')?.focus();
};
</script>

<template>
  <div class="transition-colors min-h-screen bg-gray-100 dark:bg-gray-700 px-8 md:px-16 xl:px-24 2xl:px-32">
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-white focus:text-gray-900 focus:shadow-md"
      @click="saltarAlContenido"
    >
      {{ $t('a11y.skipToContent') }}
    </a>

    <!-- Con el fondo de la página: sin él, al bajar, los nombres pasaban por detrás
         del buscador y se leían entre los botones. -->
    <HeaderComponent class="mb-6 pt-6 sticky top-0 z-20 bg-gray-100 dark:bg-gray-700 transition-colors" />

    <!-- tabindex -1: recibe el foco del enlace de salto sin entrar en el orden del tabulador. -->
    <main id="contenido" tabindex="-1" class="min-h-[74vh] mb-4 focus:outline-none">
      <RouterView />
    </main>

    <footer class="py-12 mt-auto">
      <FooterComponent />
    </footer>
  </div>
</template>
