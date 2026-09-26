<script setup>
/**
 * Select de filtro con la estética del resto de controles.
 *
 * Mantiene la interfaz de antes (modelValue, label, options) para no tocar las
 * vistas, pero por dentro ya no hay `<select>` nativo: lo pinta BaseDropdown,
 * que se ve igual en todos los navegadores y plataformas.
 */
import BaseDropdown from './BaseDropdown.vue'

defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  options: { type: Array, required: true }
})

defineEmits(['update:modelValue'])
</script>

<template>
  <base-dropdown
    :model-value="modelValue"
    :label="label"
    :options="options"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
