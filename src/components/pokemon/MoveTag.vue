<script setup>
/**
 * Un movimiento con su icono de tipo y, cuando lo tiene, de dónde sale.
 *
 * Los sitios que pintaban movimientos (rankings PvE y PvP, counters de
 * incursión, mejores conjuntos y repertorio de la ficha) repetían el mismo
 * bloque de icono + nombre. Aquí está una sola vez, y con ello la procedencia
 * se marca en todos a la vez.
 *
 * El color es la información: ámbar = élite, morado = legacy, fucsia =
 * exclusivo de supermega. Siempre acompañado de `title` y, en los contenedores
 * que listan movimientos, de un <move-legend> que lo explica.
 */
import { computed } from 'vue'
import TypeIcons from '../base/TypeIcons.vue'
import { useTranslate } from '../../composables/useTranslate'

const props = defineProps({
  name: { type: String, required: true },
  type: { type: String, default: null },
  size: { type: String, default: '10' },
  // Solo con MT Élite.
  elite: Boolean,
  // Ni con MT Élite: vino de un evento y ya no vuelve.
  legacy: Boolean,
  // Exclusivo de la supermegaevolución.
  mega: Boolean,
  // Píldora con borde completo (repertorio de la ficha). Sin esto se pinta en
  // línea, que es lo que piden los listados apretados de los rankings.
  chip: Boolean,
  hideIcon: Boolean
})

const { t } = useTranslate()

/**
 * Un movimiento no es élite y legacy a la vez, pero si algún día lo fuera,
 * manda legacy: es la condición más restrictiva.
 */
const origin = computed(() => {
  if (props.mega) return 'mega'
  if (props.legacy) return 'legacy'
  if (props.elite) return 'elite'
  return null
})

/**
 * Colores medidos contra fondo blanco y gray-900. Texto >= 4.5:1 y borde
 * >= 3:1 en los dos temas. Ojo con el ámbar: amber-500 sobre blanco se queda
 * en 2.15:1 y por eso el borde claro es amber-600.
 */
const COLORS = {
  mega: {
    chip: 'border-fuchsia-600 dark:border-fuchsia-400 text-fuchsia-700 dark:text-fuchsia-300',
    line: 'border-fuchsia-600 dark:border-fuchsia-400'
  },
  legacy: {
    chip: 'border-violet-600 dark:border-violet-400 text-violet-700 dark:text-violet-300',
    line: 'border-violet-600 dark:border-violet-400'
  },
  elite: {
    chip: 'border-amber-600 dark:border-amber-500 text-amber-700 dark:text-amber-300',
    line: 'border-amber-600 dark:border-amber-500'
  }
}

const styling = computed(() => {
  const color = origin.value ? COLORS[origin.value] : null
  if (props.chip) {
    return [
      'px-2 py-0.5 rounded-full border',
      color ? color.chip : 'border-gray-300 dark:border-gray-600'
    ]
  }
  // En línea el borde completo pesa demasiado: basta con subrayarlo.
  return color ? ['border-b-2', color.line] : []
})

const hint = computed(() => (origin.value ? t(`moves.${origin.value}Help`) : null))
</script>

<template>
  <span
    :class="['inline-flex items-center gap-1 min-w-0 text-mini', styling]"
    :title="hint"
  >
    <type-icons v-if="!hideIcon && type" :types="[type]" :size="size" />
    <span class="truncate">{{ name }}</span>
  </span>
</template>
