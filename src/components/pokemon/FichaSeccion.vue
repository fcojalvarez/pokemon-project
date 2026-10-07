<script setup>
/**
 * Una sección de la ficha que se pliega: tarjeta con su título y, cerrada, una
 * línea de resumen con lo más importante («Debilidades: Roca ×2.56 · Agua…»),
 * para que muchas veces no haga falta abrirla.
 *
 * Toda la cabecera es el botón, con el chevrón a la derecha. En escritorio no
 * hay botón: la sección va siempre abierta y el título es solo un título.
 *
 * Con `ayuda`, junto al título sale un «?» que despliega la explicación de la
 * sección. Antes iba siempre a la vista, en gris: se lee una vez y luego
 * estorba.
 */
import { ICONOS_FICHA as ICONOS } from '../../utils/iconosFicha'
import { computed, ref } from 'vue'
import BotonAyuda from '../base/BotonAyuda.vue'
import BaseChevron from '../base/BaseChevron.vue'
import BaseCard from '../base/BaseCard.vue'
import { useFichaSecciones } from '../../composables/useFichaSecciones'

const props = defineProps({
  /** Clave con la que se guarda si está abierta. La misma en todas las fichas. */
  id: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  /** Explicación de la sección, tras un «?». Uno o varios párrafos. */
  ayuda: { type: [String, Array], default: '' }
})

const ayudaAbierta = ref(false)
const parrafos = computed(() => [props.ayuda].flat().filter(Boolean))

const { estaAbierta, alternar, esEscritorio } = useFichaSecciones()
const abierta = computed(() => estaAbierta(props.id))
const panelId = computed(() => `seccion-${props.id}`)

const icono = computed(() => ICONOS[props.id] ?? null)
</script>

<template>
  <!--
    El id y el tabindex dejan saltar aquí con un enlace a #ficha-…: el
    scroll-mt deja la sección por debajo de la cabecera fija.
  -->
  <base-card :id="`ficha-${id}`" tabindex="-1" padding="" class="scroll-mt-28 focus:outline-none">
    <h2 class="relative text-sm font-bold">
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
        <boton-ayuda
          v-if="parrafos.length"
          v-model:abierta="ayudaAbierta"
          :controla="`${panelId}-ayuda`"
          :tema="title"
        />
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
      <!--
        En el móvil, el «?» encima del botón de la cabecera (no dentro: un botón
        no puede llevar otro), a la izquierda del chevrón. Solo con la sección
        abierta, cuando no hay resumen que pisar.
      -->
      <boton-ayuda
        v-if="parrafos.length && !esEscritorio && abierta"
        v-model:abierta="ayudaAbierta"
        :controla="`${panelId}-ayuda`"
        :tema="title"
        class="absolute top-1/2 -translate-y-1/2 right-12"
      />
    </h2>
    <div v-show="abierta" :id="panelId" class="px-4 pb-4" :class="esEscritorio ? '' : '-mt-1'">
      <div
        v-if="parrafos.length"
        v-show="ayudaAbierta"
        :id="`${panelId}-ayuda`"
        class="mt-1 mb-2 flex flex-col gap-1 text-mini text-gray-600 dark:text-gray-300"
      >
        <p v-for="(p, i) in parrafos" :key="i">{{ p }}</p>
      </div>
      <slot />
    </div>
  </base-card>
</template>
