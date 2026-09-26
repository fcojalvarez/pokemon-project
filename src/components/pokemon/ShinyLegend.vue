<script setup>
/**
 * Qué significan las estrellas que llevan los Pokémon.
 *
 * El shiny sale en los mismos sitios que el normal, así que no hace falta una
 * sección aparte explicando dónde conseguirlo: basta con aclarar el icono.
 *
 * La marca viene de <shiny-mark>, el mismo componente que la pinta encima de
 * los Pokémon, y se usa sin tocarle nada por dentro: su espaciado sale de que
 * una fila tenga alto de línea normal y la otra cero, así que cualquier
 * "arreglo" del line-height la separa y deja de ser la misma marca.
 */
import ShinyMark from './ShinyMark.vue'

defineProps({
  variant: { type: String, default: 'dex' }
})

/**
 * Se reduce con scale y no con font-size, para no descuadrar la marca. El
 * ajuste vertical lo hace <shiny-mark> con `inline`: estaba aquí, y cada vez
 * que la marca aparecía en un sitio nuevo había que volver a copiar el número.
 */
const SCALE = 0.65
</script>

<template>
  <p class="flex items-center gap-2 text-mini text-gray-600 dark:text-gray-300">
    <shiny-mark
      :variant="variant"
      size="text-mini"
      inline
      :scale="SCALE"
      aria-hidden="true"
    />
    {{ $t('pokemon.shinyLegend') }}
  </p>
</template>
