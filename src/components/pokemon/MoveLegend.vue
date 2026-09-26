<script setup>
/**
 * Leyenda de colores de <move-tag>. Va dentro del contenedor que lista
 * movimientos: sin ella, un borde ámbar no le dice nada a nadie.
 *
 * Solo pinta las procedencias que de verdad aparecen en ese contenedor, para
 * no explicar un color que no se ve.
 *
 * Va solo el nombre («Élite», «Legacy»): la frase entera ocupaba dos líneas
 * encima del ranking y empujaba la tabla fuera de pantalla. La explicación
 * sigue estando, en el `title`, igual que en cada movimiento.
 */
import { computed } from 'vue'

const props = defineProps({
  elite: { type: Boolean, default: true },
  legacy: { type: Boolean, default: true },
  mega: { type: Boolean, default: false }
})

/**
 * Mismos colores que MoveTag. Aquí el punto va relleno y no como anillo: es la
 * única muestra del color en toda la pantalla, así que cuanto más superficie
 * de color, más fácil es casarlo con el subrayado del movimiento.
 */
const COLORS = {
  elite: 'bg-amber-500 dark:bg-amber-400',
  legacy: 'bg-violet-600 dark:bg-violet-400',
  mega: 'bg-fuchsia-600 dark:bg-fuchsia-400'
}

const shown = computed(() =>
  ['elite', 'legacy', 'mega'].filter((key) => props[key]).map((key) => ({
    key,
    dot: COLORS[key]
  }))
)
</script>

<template>
  <ul v-if="shown.length" class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <li
      v-for="item in shown"
      :key="item.key"
      class="flex items-center gap-1.5 text-mini text-gray-500 dark:text-gray-400"
      :title="$t(`moves.${item.key}Help`)"
    >
      <span :class="['w-3 h-3 rounded-full shrink-0', item.dot]" aria-hidden="true"></span>
      {{ $t(`moves.${item.key}`) }}
    </li>
  </ul>
</template>
