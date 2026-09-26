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
import { computed } from 'vue'
import ShinyMark from './ShinyMark.vue'

const props = defineProps({
  variant: { type: String, default: 'dex' }
})

/** Se reduce con scale y no con font-size, para no descuadrar la marca. */
const SCALE = 0.65

/**
 * Las estrellas se salen de su caja: la fila con alto de línea cero no ocupa
 * espacio, así que el centro de lo que se ve no es el centro de la caja y
 * `items-center` alinearía lo que no toca. El desvío es simétrico entre las
 * dos variantes porque tienen el orden de las filas invertido; los valores
 * están medidos sobre el render, en em para que aguanten un cambio de tamaño.
 */
const NUDGE = { dex: '-0.231em', evolution: '0.202em' }

const markStyle = computed(() => ({
  // translate primero y scale después: así el ajuste no se reescala.
  transform: `translateY(${NUDGE[props.variant] ?? '0'}) scale(${SCALE})`
}))
</script>

<template>
  <p class="flex items-center gap-2 text-mini text-gray-600 dark:text-gray-400">
    <shiny-mark
      :variant="variant"
      size="text-mini"
      class="shrink-0 origin-center"
      :style="markStyle"
      aria-hidden="true"
    />
    {{ $t('pokemon.shinyLegend') }}
  </p>
</template>
