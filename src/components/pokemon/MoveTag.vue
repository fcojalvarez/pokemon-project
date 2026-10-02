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
 * que listan movimientos, de un <move-legend> que lo explica. Los colores y
 * por qué son esos, en utils/moveOrigins.js.
 */
import { computed } from 'vue'
import TypeIcons from '../base/TypeIcons.vue'
import { useTranslate } from '../../composables/useTranslate'
import { COLORES_ORIGEN } from '../../utils/moveOrigins'

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
  if (props.mega) return 'mega'
  if (props.legacy) return 'legacy'
  if (props.elite) return 'elite'
  return null
})

const styling = computed(() => {
  const color = origin.value ? COLORES_ORIGEN[origin.value] : null
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
  <span :class="['inline-flex items-center gap-1 min-w-0 text-mini', styling]" :title="hint">
    <type-icons v-if="!hideIcon && type" :types="[type]" :size="size" />
    <span class="truncate">{{ name }}</span>
  </span>
</template>
