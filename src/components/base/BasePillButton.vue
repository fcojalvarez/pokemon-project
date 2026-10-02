<script setup>
/**
 * Botón-pastilla con estado activo: las pestañas de incursiones y los
 * interruptores de megas/oscuros del Top son el mismo botón.
 *
 * Con `casilla` se pinta como una casilla de «meter o no meter» (el «Incluir»
 * del Top): encendido, fondo claro, borde oscuro y una ✓; apagado, borde
 * discontinuo. Relleno de gris oscuro, como una pestaña elegida, los cuatro
 * encendidos de fábrica parecían desactivados.
 */
defineProps({
  active: Boolean,
  casilla: Boolean
})
</script>

<template>
  <button
    type="button"
    class="zona-tactil px-3 py-1.5 text-xs rounded-xl border transition-colors"
    :class="
      casilla
        ? active
          ? 'border-gray-600 dark:border-gray-300 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold'
          : 'border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800'
        : active
        ? 'border-gray-400 shadow-md bg-gray-500 dark:bg-gray-600 text-white'
        : 'border-gray-400 shadow-md bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800'
    "
    :aria-pressed="active"
  >
    <span v-if="casilla && active" aria-hidden="true" class="mr-1.5">✓</span><slot />
  </button>
</template>
