<script setup>
/**
 * El panel blanco con borde y sombra que usan todas las secciones de la ficha.
 * Estaba copiado literal seis veces; cualquier retoque obligaba a buscarlas
 * todas.
 */
</script>

<template>
  <section
    class="p-4 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
  >
    <slot />
  </section>
</template>
