<script setup>
/**
 * Leyenda de las marcas de la rejilla de la Pokédex: «Liberado: ✦ Shiny,
 * ✕ Dinamax, ✕ Gigamax». Antes eran «Shiny liberado · Dinamax · Gigamax», y
 * con el «liberado» solo detrás del shiny no se entendía qué quería decir la
 * marca Dinamax. Es la misma línea que lleva la cabecera de la ficha, así que
 * se lee igual en los dos sitios.
 *
 * Las marcas son los mismos componentes que las pintan sobre el sprite, al
 * tamaño de la leyenda (ver ShinyLegend y MaxLegend, que siguen en uso donde
 * solo hay un tipo de marca).
 */
import ShinyMark from './ShinyMark.vue'
import MaxMark from './MaxMark.vue'

defineProps({
  variant: { type: String, default: 'dex' }
})
</script>

<template>
  <p class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-mini text-gray-600 dark:text-gray-300">
    <span>{{ $t('pokemon.released') }}:</span>
    <span class="flex items-center gap-1">
      <shiny-mark :variant="variant" size="text-mini" inline :scale="0.65" aria-hidden="true" />
      {{ $t('pokemon.releasedShiny') }},
    </span>
    <span class="flex items-center gap-1">
      <max-mark variant="dynamax" :size="15" class="shrink-0" aria-hidden="true" />
      {{ $t('max.legendDynamax') }},
    </span>
    <span class="flex items-center gap-1">
      <max-mark variant="gigantamax" :size="15" class="shrink-0" aria-hidden="true" />
      {{ $t('max.legendGigantamax') }}
    </span>
  </p>
</template>
