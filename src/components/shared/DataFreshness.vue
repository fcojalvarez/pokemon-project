<script setup>
/**
 * Aviso de que los datos en vivo se han quedado viejos.
 *
 * Las incursiones, huevos y tareas del feed no llevan fecha propia: lo único
 * que dice si siguen valiendo es cuándo se descargaron. Sin esto, la app podía
 * enseñar los jefes de hace una semana sin distinguirlos de los de hoy.
 *
 * Solo aparece cuando están caducados. El «Actualizado hace 0 s» de siempre
 * sobraba: ahora la store se refresca sola, así que decir la antigüedad cuando
 * está al día no informa de nada y ocupa una línea.
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
    v-if="age && stale"
    class="flex items-center gap-1.5 text-mini text-amber-700 dark:text-amber-400 font-semibold"
  >
    <span aria-hidden="true">⚠</span>
    {{ $t('common.staleData', { age }) }}
  </p>
</template>
