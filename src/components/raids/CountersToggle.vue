<script setup>
/**
 * El botón de abajo de la tarjeta de un jefe: abre y cierra su panel de
 * counters. Abierto o cerrado dice lo mismo: lo cuenta la flecha. Con el
 * texto a la vista no hace falta la leyenda de «toca la flecha», y al ir en
 * su propia fila deja la de arriba para el nombre.
 *
 * Va dentro de la tarjeta, que es un enlace a la ficha: por eso el clic no
 * sigue hasta él.
 */
import BaseChevron from '../base/BaseChevron.vue'

defineProps({
  open: Boolean,
  /** Para el lector de pantalla: de qué jefe son los contrincantes. */
  bossName: { type: String, required: true }
})

const emit = defineEmits(['toggle'])
</script>

<template>
  <button
    type="button"
    class="w-full h-8 flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800"
    :aria-expanded="open"
    :aria-label="`${$t('raids.countersButton')}: ${bossName}`"
    @click.prevent.stop="emit('toggle')"
  >
    {{ $t('raids.countersButton') }}
    <base-chevron :open="open" size="w-3.5 h-3.5" />
  </button>
</template>
