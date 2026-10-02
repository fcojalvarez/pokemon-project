<script setup>
/**
 * El panel blanco con borde y sombra que usan las tarjetas de la ficha, sus
 * secciones y el panel de filtros de la Pokédex. Estaba copiado literal en
 * cada uno; cualquier retoque obligaba a buscarlas todas.
 *
 * `padding` cambia el relleno (las secciones plegables lo ponen dentro, en la
 * cabecera y el cuerpo) y `as` la etiqueta.
 */
defineProps({
  as: { type: String, default: 'section' },
  padding: { type: String, default: 'p-4' }
})
</script>

<template>
  <component
    :is="as"
    class="border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
    :class="padding"
  >
    <slot />
  </component>
</template>
