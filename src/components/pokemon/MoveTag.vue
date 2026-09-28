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
 * exclusivo de supermega o ataque Gigamax (no salen nunca juntos: en los
 * combates Max no entran megas). Siempre acompañado de `title` y, en los contenedores
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
  // Ataque Gigamax: fijo, no depende del rápido.
  gigamax: Boolean,
  // Píldora con borde completo. Es lo que se usa en toda la app: el subrayado
  // suelto se leía peor y costaba distinguir el ámbar del morado de un vistazo.
  chip: Boolean,
  hideIcon: Boolean
})

const { t } = useTranslate()

/**
 * Un movimiento no es élite y legacy a la vez, pero si algún día lo fuera,
 * manda legacy: es la condición más restrictiva.
 */
const origin = computed(() => {
  if (props.gigamax) return 'gigamax'
  if (props.mega) return 'mega'
  if (props.legacy) return 'legacy'
  if (props.elite) return 'elite'
  return null
})

/**
 * Colores medidos contra fondo blanco y gray-900.
 *
 * El texto de las píldoras va siempre >= 4.5:1. El subrayado del élite es la
 * excepción a propósito: en amber-600 llegaba a 3,19:1 pero se leía marrón y
 * dejaba de parecer amarillo, que es justo lo que tiene que distinguirlo del
 * morado del legacy. Se usa amber-500, que es amarillo de verdad, y la
 * identificación no queda colgando del color: cada movimiento lleva su
 * `title` y todos los contenedores que los listan llevan un <move-legend> que
 * lo dice con palabras.
 */
const COLORS = {
  gigamax: {
    chip: 'border-fuchsia-600 dark:border-fuchsia-400 text-fuchsia-700 dark:text-fuchsia-300',
    line: 'border-fuchsia-600 dark:border-fuchsia-400'
  },
  mega: {
    chip: 'border-fuchsia-600 dark:border-fuchsia-400 text-fuchsia-700 dark:text-fuchsia-300',
    line: 'border-fuchsia-600 dark:border-fuchsia-400'
  },
  legacy: {
    chip: 'border-violet-600 dark:border-violet-400 text-violet-700 dark:text-violet-300',
    line: 'border-violet-600 dark:border-violet-400'
  },
  elite: {
    chip: 'border-amber-500 dark:border-amber-400 text-amber-700 dark:text-amber-300',
    line: 'border-amber-500 dark:border-amber-400'
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
