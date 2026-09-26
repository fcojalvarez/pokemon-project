<script setup>
/**
 * Desde cuándo son los datos en vivo.
 *
 * Las incursiones, huevos y tareas del feed no llevan fecha propia: lo único
 * que dice si siguen valiendo es cuándo se descargaron. Sin esto, la app podía
 * enseñar los jefes de hace una semana sin distinguirlos de los de hoy.
 */
import { computed } from 'vue'
import { formatDuration } from '../../utils/time'

const props = defineProps({
  /** Antigüedad en ms. null mientras no se haya descargado nada. */
  ageMs: { type: Number, default: null },
  stale: Boolean
})

const age = computed(() => (props.ageMs == null ? null : formatDuration(props.ageMs)))
</script>

<template>
  <p
    v-if="age"
    class="flex items-center gap-1.5 text-mini"
    :class="stale ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-gray-600 dark:text-gray-400'"
  >
    <span v-if="stale" aria-hidden="true">⚠</span>
    {{ stale ? $t('common.staleData', { age }) : $t('common.updatedAgo', { age }) }}
  </p>
</template>
