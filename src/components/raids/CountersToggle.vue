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
  bossName: { type: String, required: true },
  /**
   * Solo el icono, en un botón cuadrado: en la tarjeta de jefe comparte fila
   * con sus debilidades. Abierto, relleno, porque no hay flecha que gire.
   */
  icono: Boolean
})

const emit = defineEmits(['toggle'])
</script>

<template>
  <button
    v-if="icono"
    type="button"
    class="zona-tactil shrink-0 boton w-9 !px-0"
    :class="open ? 'boton-activo' : ''"
    :aria-expanded="open"
    :aria-label="`${$t('raids.countersButton')}: ${bossName}`"
    :title="$t('raids.countersButton')"
    @click.prevent.stop="emit('toggle')"
  >
    <!-- Dos espadas cruzadas: a quién llevar al combate. -->
    <svg
      viewBox="0 0 24 24"
      class="w-4 h-4"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />
      <path d="M9.5 17.5 21 6V3h-3L6.5 14.5M11 19l-6-6M8 16l-4 4M5 21l-2-2" />
    </svg>
  </button>
  <button
    v-else
    type="button"
    class="boton"
    :class="open ? 'boton-activo' : ''"
    :aria-expanded="open"
    :aria-label="`${$t('raids.countersButton')}: ${bossName}`"
    @click.prevent.stop="emit('toggle')"
  >
    {{ $t('raids.countersButton') }}
    <base-chevron :open="open" size="w-3.5 h-3.5" />
  </button>
</template>
