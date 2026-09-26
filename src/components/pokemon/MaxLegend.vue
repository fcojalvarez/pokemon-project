<script setup>
/**
 * Qué significan las dos marcas Max que llevan los Pokémon en la rejilla.
 *
 * Usa el mismo componente que las pinta sobre el sprite, al tamaño de la
 * leyenda: si cambia el símbolo, cambia en los dos sitios a la vez.
 */
import MaxMark from './MaxMark.vue'
</script>

<template>
  <p class="flex items-center gap-3 text-mini text-gray-600 dark:text-gray-400">
    <span class="flex items-center gap-1.5">
      <max-mark variant="dynamax" :size="15" class="shrink-0" aria-hidden="true" />
      {{ $t('max.legendDynamax') }}
    </span>
    <span class="flex items-center gap-1.5">
      <max-mark variant="gigantamax" :size="15" class="shrink-0" aria-hidden="true" />
      {{ $t('max.legendGigantamax') }}
    </span>
  </p>
</template>
