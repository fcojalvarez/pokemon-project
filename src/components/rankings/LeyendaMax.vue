<script setup>
/**
 * La leyenda del Top Max: solo lo que sale en la lista (STAB, borde Gigamax)
 * y las tres letras de papel. En escritorio va en la barra lateral, como la
 * de incursiones; en el móvil, debajo de la lista.
 */
import StabBadge from '../base/StabBadge.vue'
import IconoPapel from '../base/IconoPapel.vue'

defineProps({
  /** { stab, gigantamax } de useTopFilas: qué marcas hay en la lista. */
  marcas: { type: Object, required: true }
})

const PAPELES = ['atacante', 'tanque', 'sanador']
</script>

<template>
  <div class="text-mini text-gray-600 dark:text-gray-300">
    <p id="leyenda-max" class="mb-1.5 text-xs font-semibold text-gray-800 dark:text-gray-100">
      {{ $t('legend.title') }}:
    </p>
    <!-- Un significado por fila. -->
    <ul aria-labelledby="leyenda-max" class="flex flex-col gap-1.5">
      <li v-if="marcas.stab" class="flex items-center gap-1.5">
        <stab-badge />
        {{ $t('max.stabLegend') }}
      </li>
      <!-- Sin marca junto al nombre: el Gigamax se reconoce por su borde, su ataque y su sprite. -->
      <li v-if="marcas.gigantamax" class="flex items-center gap-1.5">
        <span
          class="w-5 h-3.5 shrink-0 rounded border-2 border-fuchsia-500 dark:border-fuchsia-400"
          aria-hidden="true"
        ></span>
        {{ $t('max.gmaxBorderLegend') }}
      </li>
      <!-- Las tres letras de cada fila: un papel por línea, con su icono. -->
      <li v-for="papel in PAPELES" :key="papel" class="flex items-center gap-1.5">
        <icono-papel :papel="papel" class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        {{ $t(`max.rolesLegend.${papel}`) }}
      </li>
    </ul>
  </div>
</template>
