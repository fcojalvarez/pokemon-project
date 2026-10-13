<script setup>
/**
 * Un sprite con sus marcas encima, como en la tarjeta de la Pokédex: shiny
 * arriba a la derecha, Dinamax abajo a la izquierda y Gigamax abajo a la
 * derecha (hay especies que pueden las dos).
 *
 * Las marcas guardan con el sprite la proporción que tienen en la Pokédex y
 * en la cadena evolutiva a 96 px (la de Max, 18 px; la de shiny, al 90 %),
 * así que en una fila de 48 px salen a la mitad. Con scale y no con otro
 * tamaño de letra o de svg, para que no se descuadren.
 */
import { computed } from 'vue'
import BaseSprite from '../base/BaseSprite.vue'
import ShinyMark from './ShinyMark.vue'
import MaxMark from './MaxMark.vue'

const props = defineProps({
  src: { type: String, default: null },
  /** Lado del sprite en px. */
  lado: { type: Number, default: 48 },
  shiny: Boolean,
  dynamax: Boolean,
  gigantamax: Boolean,
  /** El aura de oscuro (ver BaseSprite). */
  oscuro: Boolean
})

const escalaShiny = computed(() => (0.9 * props.lado) / 96)
const escalaMax = computed(() => props.lado / 96)
</script>

<template>
  <!-- `isolate`: el z-10 de las marcas solo compite con el sprite. -->
  <span class="relative isolate shrink-0" :style="{ width: `${lado}px`, height: `${lado}px` }">
    <base-sprite
      :src="src"
      :oscuro="oscuro"
      class="w-full h-full"
      img-class="drop-shadow-contorno dark:drop-shadow-none"
    />
    <shiny-mark
      v-if="shiny"
      variant="dex"
      class="absolute top-0 right-0 z-10 origin-top-right"
      :style="{ transform: `scale(${escalaShiny})` }"
      :label="$t('pokemon.shinyLegend')"
    />
    <max-mark
      v-if="dynamax"
      variant="dynamax"
      :size="18"
      class="absolute bottom-0 left-0 z-10 origin-bottom-left text-gray-800 dark:text-gray-200"
      :style="{ transform: `scale(${escalaMax})` }"
    />
    <max-mark
      v-if="gigantamax"
      variant="gigantamax"
      :size="18"
      class="absolute bottom-0 right-0 z-10 origin-bottom-right text-gray-800 dark:text-gray-200"
      :style="{ transform: `scale(${escalaMax})` }"
    />
  </span>
</template>
