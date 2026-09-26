<script setup>
/**
 * Leyenda de colores de <move-tag>. Va dentro del contenedor que lista
 * movimientos: sin ella, un borde ámbar no le dice nada a nadie.
 *
 * Solo pinta las procedencias que de verdad aparecen en ese contenedor, para
 * no explicar un color que no se ve.
 */
import { computed } from 'vue'

const props = defineProps({
  elite: { type: Boolean, default: true },
  legacy: { type: Boolean, default: true },
  mega: { type: Boolean, default: false }
})

// Mismos colores que MoveTag, con el mismo cuidado de contraste.
const COLORS = {
  elite: 'border-amber-600 dark:border-amber-500',
  legacy: 'border-violet-600 dark:border-violet-400',
  mega: 'border-fuchsia-600 dark:border-fuchsia-400'
}

const shown = computed(() =>
  ['elite', 'legacy', 'mega'].filter((key) => props[key]).map((key) => ({
    key,
    border: COLORS[key]
  }))
)
</script>

<template>
  <ul v-if="shown.length" class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <li
      v-for="item in shown"
      :key="item.key"
      class="flex items-center gap-1.5 text-mini text-gray-500 dark:text-gray-400"
    >
      <span :class="['w-3 h-3 rounded-full border-2 shrink-0', item.border]" aria-hidden="true"></span>
      {{ $t(`moves.${item.key}`) }}: {{ $t(`moves.${item.key}Help`) }}
    </li>
  </ul>
</template>
