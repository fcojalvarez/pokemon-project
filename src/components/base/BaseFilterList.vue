<script setup>
/**
 * Lista de filtros de un clic, con cuántos hay de cada uno, para la barra
 * lateral (el tipo en Eventos, los grupos de cada pestaña en Incursiones).
 *
 * Cada opción es un botón con aria-pressed: se elige una y las demás se
 * apagan. El nombre accesible lleva la cuenta («Incursiones de nivel 5 (4)»).
 * La cuenta es opcional: las pestañas de encima (En marcha, Semana…) usan la
 * misma lista sin ella, para que la barra lateral tenga un solo aspecto.
 */
defineProps({
  modelValue: { type: [String, Number], default: null },
  /** [{ value, label, count? }] */
  options: { type: Array, required: true }
})

defineEmits(['update:modelValue'])
</script>

<template>
  <ul class="flex flex-col gap-0.5">
    <li v-for="option in options" :key="option.value">
      <button
        type="button"
        class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm text-left rounded-lg transition-colors"
        :class="
          modelValue === option.value
            ? 'bg-gray-500 dark:bg-gray-600 text-white'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800'
        "
        :aria-label="option.count == null ? undefined : `${option.label} (${option.count})`"
        :aria-pressed="modelValue === option.value"
        @click="$emit('update:modelValue', option.value)"
      >
        <span class="min-w-0">{{ option.label }}</span>
        <!-- «(n)», como todas las cuentas de la app. -->
        <span
          v-if="option.count != null"
          class="shrink-0 text-mini tabular-nums"
          :class="modelValue === option.value ? 'text-white' : 'text-gray-600 dark:text-gray-300'"
          >({{ option.count }})</span
        >
      </button>
    </li>
  </ul>
</template>
