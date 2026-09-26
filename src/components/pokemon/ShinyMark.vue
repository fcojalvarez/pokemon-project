<script setup>
import { computed } from 'vue'
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
const props = defineProps({
  // 'dex' = tarjeta de la Pokédex · 'evolution' = cadena evolutiva y megas.
  variant: { type: String, default: 'dex' },
  // Para la leyenda, que va en una línea de texto y no encima de un sprite.
  size: { type: String, default: null },
  /**
   * Alineada dentro de una línea de texto (leyendas, insignias, tarjetas).
   * Sobre un sprite no hace falta: ahí se coloca en absoluto.
   */
  inline: Boolean,
  /**
   * Escala cuando va en línea. 0,7 es el punto medio: en 0,9 la marca pesaba
   * más que el texto de la insignia y en 0,55 ya no se apreciaba.
   */
  scale: { type: Number, default: 0.7 }
})

/**
 * La marca se sale de su caja: una de sus dos filas tiene alto de línea cero,
 * así que su centro visual no coincide con el de la caja y `items-center` la
 * deja descolocada. El desvío está medido sobre el render y es simétrico entre
 * las dos variantes, porque tienen el orden de las filas invertido. En em para
 * que aguante un cambio de tamaño.
 *
 * Vive aquí y no en cada sitio que la usa: estaba repetido y se iba
 * desalineando de uno en uno cada vez que aparecía en un sitio nuevo.
 */
const NUDGE = { dex: '-0.231em', evolution: '0.202em' }

const inlineStyle = computed(() =>
  props.inline
    ? { transform: `translateY(${NUDGE[props.variant] ?? '0'}) scale(${props.scale})` }
    : null
)
</script>

<template>
  <span
    v-if="variant === 'evolution'"
    :class="[
      'text-center text-gray-600 dark:text-gray-100',
      inline ? 'inline-block shrink-0 origin-center' : 'block',
      size || 'text-mini'
    ]"
    :style="inlineStyle"
  >
    <span class="block leading-none">✦✦</span>
    <span>✦</span>
  </span>

  <span
    v-else
    :class="[
      'text-center text-gray-500 dark:text-gray-200',
      inline ? 'inline-block shrink-0 origin-center' : 'block',
      size || 'text-sm'
    ]"
    :style="inlineStyle"
  >
    <span>✦</span>
    <span class="block leading-none">✦✦</span>
  </span>
</template>
