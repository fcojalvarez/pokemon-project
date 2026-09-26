<script setup>
/**
 * Una sección de la ficha que se pliega: tarjeta con su título y, cerrada, una
 * línea de resumen con lo más importante («Debilidades: Roca ×2.56 · Agua…»),
 * para que muchas veces no haga falta abrirla.
 *
 * Toda la cabecera es el botón, con el chevrón a la derecha. En escritorio no
 * hay botón: la sección va siempre abierta y el título es solo un título.
 */
import { computed } from 'vue'
import BaseChevron from '../base/BaseChevron.vue'
import { useFichaSecciones } from '../../composables/useFichaSecciones'

const props = defineProps({
  /** Clave con la que se guarda si está abierta. La misma en todas las fichas. */
  id: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, default: '' }
})

const { estaAbierta, alternar, esEscritorio } = useFichaSecciones()
const abierta = computed(() => estaAbierta(props.id))
const panelId = computed(() => `seccion-${props.id}`)
</script>

<template>
  <section class="border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900">
    <h2 class="text-sm font-bold">
      <span v-if="esEscritorio" class="flex items-center gap-2 px-4 pt-4">
        {{ title }}<slot name="titulo" />
      </span>
      <button
        v-else
        type="button"
        class="w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-xl hover:bg-gray-50 hover:dark:bg-gray-800/60"
        :aria-expanded="abierta"
        :aria-controls="panelId"
        @click="alternar(id)"
      >
        <span class="flex-1 min-w-0">
          <span class="flex items-center gap-2">{{ title }}<slot name="titulo" /></span>
          <span
            v-if="!abierta && summary"
            class="block mt-0.5 text-xs font-normal text-gray-600 dark:text-gray-300 truncate"
          >{{ summary }}</span>
        </span>
        <!-- Mismo trazo que el resto de desplegables de la app; gira al abrir -->
        <base-chevron :open="abierta" size="w-5 h-5" class="text-gray-600 dark:text-gray-300" />
      </button>
    </h2>
    <div v-show="abierta" :id="panelId" class="px-4 pb-4" :class="esEscritorio ? '' : '-mt-1'">
      <slot />
    </div>
  </section>
</template>
