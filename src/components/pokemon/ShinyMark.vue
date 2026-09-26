<script setup>
/**
 * La marca de "variocolor liberado" que llevan los Pokémon.
 *
 * Hay dos, y son las que ya había: la tarjeta de la Pokédex pinta una estrella
 * sobre dos, y la cadena evolutiva dos sobre una, con otro tamaño y otro gris.
 * Se conservan tal cual estaban; lo único que hace este componente es tenerlas
 * en un sitio para que <shiny-legend> pueda usar exactamente la misma que haya
 * en la vista donde se enseña la leyenda.
 *
 * (Que difieran entre sí es anterior a esto. Unificarlas sería un cambio
 * visual en los listados, así que queda a tu criterio.)
 */
defineProps({
  // 'dex' = tarjeta de la Pokédex · 'evolution' = cadena evolutiva y megas.
  variant: { type: String, default: 'dex' },
  // Para la leyenda, que va en una línea de texto y no encima de un sprite.
  size: { type: String, default: null }
})
</script>

<template>
  <span
    v-if="variant === 'evolution'"
    :class="['block text-center text-gray-600 dark:text-gray-100', size || 'text-mini']"
  >
    <span class="block leading-none">✦✦</span>
    <span>✦</span>
  </span>

  <span
    v-else
    :class="['block text-center text-gray-500 dark:text-gray-200', size || 'text-sm']"
  >
    <span>✦</span>
    <span class="block leading-none">✦✦</span>
  </span>
</template>
