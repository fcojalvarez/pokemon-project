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
import { COLORES_ORIGEN, ORIGENES } from '../../utils/moveOrigins'
import IconoClima from '../base/IconoClima.vue'

// Lo que devuelve origenesPresentes(): quien la usa pasa lo que se ve.
const props = defineProps({
  elite: Boolean,
  legacy: Boolean,
  mega: Boolean,
  /** Top de incursiones: explica la cifra en ámbar, la que va con clima. */
  clima: Boolean
})

const shown = computed(() =>
  ORIGENES.filter((key) => props[key]).map((key) => ({
    key,
    dot: COLORES_ORIGEN[key].dot
  }))
)
</script>

<template>
  <ul v-if="shown.length || clima" class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <li
      v-for="item in shown"
      :key="item.key"
      class="flex items-center gap-1.5 text-mini text-gray-600 dark:text-gray-300"
      :title="$t(`moves.${item.key}Help`)"
    >
      <span :class="['w-3 h-3 rounded-full shrink-0', item.dot]" aria-hidden="true"></span>
      {{ $t(`moves.${item.key}`) }}
    </li>
    <li
      v-if="clima"
      class="flex items-center gap-1.5 text-mini text-gray-600 dark:text-gray-300"
      :title="$t('top.weatherLegendHelp')"
    >
      <icono-clima clima="clear" class="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
      {{ $t('top.weatherLegend') }}
    </li>
  </ul>
</template>
