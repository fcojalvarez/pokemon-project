<script setup>
/**
 * El botón de la tarjeta de un jefe: abre y cierra su panel de counters.
 * Abierto o cerrado dice lo mismo: lo cuenta la flecha. Con el texto a la
 * vista no hace falta la leyenda de «toca la flecha».
 *
 * En móvil va en su propia fila, bajo el nombre, relleno de gris y sin borde:
 * con borde pesaba más que el propio Pokémon. Desde md va a la derecha de la
 * tarjeta, en la fila del nombre (ver LiveMonCard), y la tarjeta mide un
 * tercio menos.
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
    class="w-full h-7 md:w-auto md:h-8 md:px-3 flex items-center justify-center gap-1.5 rounded-xl border border-transparent md:border-gray-300 md:dark:border-gray-600 bg-gray-100 dark:bg-gray-800 md:bg-transparent md:dark:bg-transparent text-xs font-medium md:font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-700"
    :aria-expanded="open"
    :aria-label="`${$t('raids.countersButton')}: ${bossName}`"
    @click.prevent.stop="emit('toggle')"
  >
    {{ $t('raids.countersButton') }}
    <base-chevron :open="open" size="w-3.5 h-3.5" />
  </button>
</template>
