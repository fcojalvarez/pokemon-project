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
import BaseCard from '../base/BaseCard.vue'
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

/**
 * Un icono por sección, para reconocerla de un vistazo esté donde esté: cada
 * uno ordena la ficha a su gusto y, plegadas, eran todas la misma tarjeta
 * gris. Trazos de 24×24, como el resto de iconos de línea de la app.
 */
const ICONOS = {
  // Chincheta de mapa
  donde: [
    'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z',
    'M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z'
  ],
  // Monedas
  costes: ['M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z', 'M18.1 10.4A6 6 0 1 1 10.3 18', 'M7 6h1v4'],
  // Flechas hacia fuera: crecer
  max: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7'],
  // Línea que sube
  pc: ['M22 7l-8.5 8.5-5-5L2 17', 'M16 7h6v6'],
  // Espadas cruzadas
  pve: [
    'M14.5 17.5L3 6V3h3l11.5 11.5',
    'M13 19l6-6',
    'M16 16l4 4',
    'M19 21l2-2',
    'M9.5 17.5L21 6V3h-3L6.5 14.5',
    'M11 19l-6-6',
    'M8 16l-4 4',
    'M5 21l-2-2'
  ],
  // Copa
  pvp: [
    'M8 21h8',
    'M12 17v4',
    'M7 4h10v5a5 5 0 0 1-10 0z',
    'M17 5h3v2a3 3 0 0 1-3 3',
    'M7 5H4v2a3 3 0 0 0 3 3'
  ],
  // Barras
  pvpIv: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  // Rayo
  ataques: ['M13 2L4 14h7l-1 8 9-12h-7z'],
  // Pulso
  efectos: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  // Escudo tachado
  debilidades: ['M12 3l9 4v5c0 5-4 8-9 9-5-1-9-4-9-9V7z', 'M9 9l6 6', 'M15 9l-6 6'],
  // Diana
  ganarle: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
    'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'
  ],
  // Dos columnas
  comparar: ['M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z', 'M12 3v18']
}
const icono = computed(() => ICONOS[props.id] ?? null)
</script>

<template>
  <!--
    El id y el tabindex dejan saltar aquí con un enlace a #ficha-…: el
    scroll-mt deja la sección por debajo de la cabecera fija.
  -->
  <base-card :id="`ficha-${id}`" tabindex="-1" padding="" class="scroll-mt-28 focus:outline-none">
    <h2 class="text-sm font-bold">
      <span v-if="esEscritorio" class="flex items-center gap-2 px-4 pt-4">
        <span
          v-if="icono"
          class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          aria-hidden="true"
          ><svg
            viewBox="0 0 24 24"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path v-for="(d, i) in icono" :key="i" :d="d" /></svg
        ></span>
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
        <span
          v-if="icono"
          class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          aria-hidden="true"
          ><svg
            viewBox="0 0 24 24"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path v-for="(d, i) in icono" :key="i" :d="d" /></svg
        ></span>
        <span class="flex-1 min-w-0">
          <span class="flex items-center gap-2">{{ title }}<slot name="titulo" /></span>
          <span
            v-if="!abierta && summary"
            class="block mt-0.5 text-xs font-normal leading-snug text-gray-600 dark:text-gray-300 line-clamp-2"
            >{{ summary }}</span
          >
        </span>
        <!-- Mismo trazo que el resto de desplegables de la app; gira al abrir -->
        <base-chevron :open="abierta" size="w-5 h-5" class="text-gray-600 dark:text-gray-300" />
      </button>
    </h2>
    <div v-show="abierta" :id="panelId" class="px-4 pb-4" :class="esEscritorio ? '' : '-mt-1'">
      <slot />
    </div>
  </base-card>
</template>
