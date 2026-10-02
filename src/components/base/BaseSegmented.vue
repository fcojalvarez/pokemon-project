<script setup>
/**
 * Selector segmentado: las pestañas de una página (Incursiones / Huevos /
 * Misiones, En marcha / Próximos) en partes iguales, con la elegida en blanco
 * sobre gris.
 *
 * Antes eran pastillas como las de los grupos de debajo (Nivel 1, Nivel 3…),
 * una fila encima de otra, y no se distinguía qué cambiaba la página y qué
 * solo saltaba. Cada parte es un botón con aria-pressed, como las pastillas.
 */
defineProps({
  modelValue: { type: String, required: true },
  /** [{ value, label }] */
  options: { type: Array, required: true }
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div
    class="grid gap-1 p-1 rounded-[14px] bg-gray-200 dark:bg-gray-800"
    :style="{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="zona-tactil min-w-0 px-2 py-2 rounded-[10px] text-xs sm:text-sm truncate transition-colors"
      :class="modelValue === option.value
        ? 'bg-white dark:bg-gray-600 shadow-sm font-semibold text-gray-900 dark:text-white'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-700'"
      :aria-pressed="modelValue === option.value"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
