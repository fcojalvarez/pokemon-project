<script setup>
/**
 * Botón-pastilla con estado activo: las pestañas de incursiones y los
 * interruptores de megas/oscuros del Top son el mismo botón.
 */
defineProps({
  active: Boolean
})
</script>

<template>
  <button
    type="button"
    class="zona-tactil px-3 py-1.5 text-xs rounded-xl border border-gray-400 shadow-md transition-colors"
    :class="
      active
        ? 'bg-gray-500 dark:bg-gray-600 text-white'
        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800'
    "
    :aria-pressed="active"
  >
    <slot />
  </button>
</template>
