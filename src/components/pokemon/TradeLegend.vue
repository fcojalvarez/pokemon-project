<script setup>
/**
 * Qué significa la Poké Ball de intercambio en la cadena evolutiva.
 *
 * El icono iba acompañado de su texto dentro de la columna del Pokémon, pero
 * ahí no cabe y se partía. Aquí se dice una sola vez, con sitio de sobra.
 *
 * Solo se pinta si en esa cadena hay alguna evolución por intercambio; si no,
 * explicaría un icono que no se ve.
 */
defineProps({
  show: { type: Boolean, default: true }
})
</script>

<template>
  <p v-if="show" class="flex items-center gap-1.5 text-mini text-gray-600 dark:text-gray-400">
    <!-- Mismo icono y mismo tratamiento que en <evol-pokemon-item>. -->
    <img
      src="../../assets/icons/ic_trade_ball.png"
      class="invert dark:invert-0 w-3.5 h-3.5 shrink-0 drop-shadow"
      alt=""
    >
    {{ $t('evolutions.tradeLegend') }}
  </p>
</template>
