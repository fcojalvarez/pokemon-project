<script setup>
/**
 * Versión instalada, al pie del menú lateral y de Ajustes.
 *
 * La versión sale de package.json (vite.config.js la inyecta), así que al
 * subir versión solo hay que tocarla ahí. El build cambia en cada despliegue;
 * la versión solo cuando se sube a mano. Con los dos se sabe exactamente qué
 * hay instalado.
 */
defineProps({
  tag: { type: String, default: 'p' }
})

const version = import.meta.env.VITE_APP_VERSION
const build = import.meta.env.VITE_APP_BUILD
</script>

<template>
  <component :is="tag" v-if="version" class="text-mini text-gray-600 dark:text-gray-300">
    v{{ version }}<template v-if="build"> · {{ build }}</template>
  </component>
</template>
