<script setup>
/**
 * Las líneas Max de una fila del Top: su Ataque Max (el Gigamax, en fucsia) y
 * debajo los rápidos que lo dan. Con «Todos», un bloque así por cada Ataque
 * Max. La pintan igual la lista (móvil) y la tabla (escritorio ancho).
 *
 * El Ataque Max lleva el mismo sangrado que el borde y el relleno de la
 * píldora de debajo, para que sus iconos queden en la misma columna.
 */
import TypeIcons from '../base/TypeIcons.vue'
import MoveTag from '../pokemon/MoveTag.vue'
import { localName } from '../../composables/useTranslate'

defineProps({
  /** row.maxLines de useTopFilas: [{ max, gigamax, rapidos }]. */
  lines: { type: Array, required: true },
  /** Clases de cada bloque. */
  lineClass: { type: String, default: 'min-w-0' }
})
</script>

<template>
  <div v-for="linea in lines" :key="linea.max.id" :class="lineClass">
    <p
      class="flex items-center gap-1 pl-[9px] text-xs font-semibold"
      :class="
        linea.gigamax
          ? 'text-fuchsia-700 dark:text-fuchsia-300'
          : 'text-gray-800 dark:text-gray-100'
      "
      :title="linea.gigamax ? $t('moves.gigamaxHelp') : null"
    >
      <type-icons :types="[linea.max.type]" size="10" />
      {{ localName(linea.max) }}
    </p>
    <span class="mt-1 flex flex-wrap gap-1.5">
      <move-tag
        v-for="rapido in linea.rapidos"
        :key="rapido.id"
        chip
        :name="localName(rapido)"
        :type="rapido.type"
      />
    </span>
  </div>
</template>
