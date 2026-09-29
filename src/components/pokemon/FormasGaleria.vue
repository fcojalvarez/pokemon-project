<script setup>
/**
 * Botón «Formas y disfraces» de la ficha, con su galería en un modal.
 *
 * La ficha enseña una sola imagen por especie, y había cosas que no se veían:
 * los motivos de Vivillon, las formas de Zygarde, los dos Rockruff o los
 * disfraces. Aquí salen todas las del juego, en normal o en variocolor, con la
 * estrella en las que tienen el variocolor liberado. El juego trae también
 * disfraces que aún no han salido: se enseñan igual, avisándolo.
 *
 * Los datos se piden al abrir la ficha (no al arrancar la app) y el botón solo
 * sale si el Pokémon tiene más de una variante.
 *
 * Las formas regionales (y la normal) ya tienen sus píldoras en la cabecera de
 * la ficha, que llevan a la ficha de cada una: con `sin-regionales` aquí no se
 * repiten. Si solo quedan disfraces, el botón y el modal se llaman así.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { cargarFormas } from '../../stores/gameData'
import { iconoForma } from '../../utils/formas'
import { useTranslate } from '../../composables/useTranslate'
import BaseModal from '../base/BaseModal.vue'
import BasePillButton from '../base/BasePillButton.vue'
import ShinyMark from './ShinyMark.vue'

const props = defineProps({
  dex: { type: Number, required: true },
  name: { type: String, required: true },
  sinRegionales: Boolean
})

const { locale, intlLocale } = useTranslate()
const todas = ref({})
const abierta = ref(false)
const shiny = ref(false)
/** La que se ve en grande, o null con la cuadrícula (ver `pasar`). */
const ampliada = ref(null)

onMounted(async () => {
  todas.value = await cargarFormas()
})
watch(() => props.dex, () => {
  abierta.value = false
  shiny.value = false
  ampliada.value = null
})
// Al cerrar, la próxima vez vuelve a la cuadrícula.
watch(abierta, (valor) => {
  if (!valor) ampliada.value = null
})

/** La normal («pm89») y las regionales («pm89.fALOLA», «pm128.fPALDEA_AQUA»). */
const REGIONAL = /^pm\d+(\.f(ALOLA|GALARIAN|HISUIAN|PALDEA)\w*)?$/
/**
 * Las megas y las primigenias tampoco: ya salen en la línea evolutiva, con su
 * enlace a la ficha de cada una.
 */
const MEGA = /\.f(MEGA|PRIMAL)/
const variantes = computed(() => {
  const v = todas.value?.[props.dex]
  if (!v) return null
  const formas = v.formas.filter((uno) => !MEGA.test(uno.f) && !(props.sinRegionales && REGIONAL.test(uno.f)))
  return { ...v, formas }
})
const total = computed(() => (variantes.value ? variantes.value.formas.length + variantes.value.disfraces.length : 0))
/** Sin las regionales puede quedar un solo disfraz, y también vale la pena verlo. */
const minimo = computed(() => (props.sinRegionales ? 1 : 2))
const soloDisfraces = computed(() => Boolean(variantes.value) && !variantes.value.formas.length)

const grupos = computed(() => {
  const v = variantes.value
  if (!v) return []
  return [
    { clave: 'formas', lista: v.formas },
    { clave: 'disfraces', lista: v.disfraces }
  ].filter((grupo) => grupo.lista.length)
})

const nombre = (uno) => (locale() === 'en' ? uno.en : uno.es)

/**
 * Una en grande: en la cuadrícula los iconos van a 64 px y no se aprecian los
 * detalles del disfraz. Con las flechas se pasa a la anterior o la siguiente,
 * de formas a disfraces sin volver atrás.
 */
const todasEnOrden = computed(() => grupos.value.flatMap((grupo) => grupo.lista))
const posicion = computed(() => todasEnOrden.value.findIndex((uno) => uno.f === ampliada.value?.f))
const pasar = (paso) => {
  const lista = todasEnOrden.value
  const siguiente = lista[(posicion.value + paso + lista.length) % lista.length]
  if (siguiente) ampliada.value = siguiente
}
const fecha = (texto) => new Date(texto).toLocaleDateString(intlLocale(), { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<template>
  <button
    v-if="total >= minimo"
    type="button"
    class="shrink-0 border border-gray-400 dark:border-gray-600 rounded-xl py-1 px-2 text-xs text-gray-800 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800"
    @click="abierta = true"
  >
    <template v-if="soloDisfraces">{{ $t('forms.costumesButton', { n: total }) }}</template>
    <template v-else>
      <span class="sm:hidden">{{ $t('forms.buttonShort', { n: total }) }}</span>
      <span class="hidden sm:inline">{{ $t('forms.button', { n: total }) }}</span>
    </template>
  </button>

  <base-modal :open="abierta" :title="$t(soloDisfraces ? 'forms.costumesTitle' : 'forms.title', { pokemon: name })" size="sm:max-w-3xl" @close="abierta = false">
    <div class="p-4">
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <base-pill-button :active="!shiny" @click="shiny = false">{{ $t('forms.normal') }}</base-pill-button>
        <base-pill-button :active="shiny" @click="shiny = true">{{ $t('forms.shiny') }}</base-pill-button>
        <p class="basis-full sm:basis-auto sm:ml-auto text-mini text-gray-600 dark:text-gray-300">
          {{ $t('forms.note') }}
        </p>
      </div>

      <!-- En grande -->
      <div v-if="ampliada" class="flex flex-col items-center gap-3 py-2">
        <img
          :src="iconoForma(ampliada.f, { shiny })"
          crossorigin="anonymous"
          :alt="nombre(ampliada)"
          class="w-56 h-56 sm:w-72 sm:h-72 object-contain"
        />
        <p class="text-base font-bold text-center">{{ nombre(ampliada) }}</p>
        <p v-if="ampliada.s" class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <shiny-mark variant="dex" size="text-mini" :label="$t('pokemon.shinyLegend')" />
          {{ $t('forms.shinySince', { date: fecha(ampliada.s) }) }}
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="w-10 h-10 rounded-xl border border-gray-400 dark:border-gray-600 hover:bg-gray-150 hover:dark:bg-gray-700"
            :aria-label="$t('forms.previous')"
            @click="pasar(-1)"
          >←</button>
          <span class="text-mini text-gray-600 dark:text-gray-300 tabular-nums">{{ posicion + 1 }} / {{ todasEnOrden.length }}</span>
          <button
            type="button"
            class="w-10 h-10 rounded-xl border border-gray-400 dark:border-gray-600 hover:bg-gray-150 hover:dark:bg-gray-700"
            :aria-label="$t('forms.next')"
            @click="pasar(1)"
          >→</button>
        </div>
        <base-pill-button @click="ampliada = null">{{ $t('forms.back') }}</base-pill-button>
      </div>

      <section v-for="grupo in grupos" v-else :key="grupo.clave" class="mb-4 last:mb-0">
        <h3 class="text-sm font-bold mb-2">
          {{ $t(`forms.${grupo.clave}`) }}
          <span class="font-normal text-gray-600 dark:text-gray-300">({{ grupo.lista.length }})</span>
        </h3>
        <ul class="grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
          <li v-for="uno in grupo.lista" :key="uno.f">
            <button
              type="button"
              class="w-full h-full flex flex-col items-center gap-1 p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-center hover:bg-gray-150 hover:dark:bg-gray-800"
              :aria-label="$t('forms.enlarge', { name: nombre(uno) })"
              @click="ampliada = uno"
            >
            <span class="relative w-16 h-16">
              <img
                :src="iconoForma(uno.f, { shiny })"
                crossorigin="anonymous"
                alt=""
                class="w-full h-full object-contain"
                loading="lazy"
                decoding="async"
              />
              <shiny-mark
                v-if="uno.s"
                variant="dex"
                size="text-mini"
                class="absolute -top-1 -right-1 scale-75 origin-top-right"
                :title="$t('pokemon.shinyLegend')"
                :label="$t('pokemon.shinyLegend')"
              />
            </span>
            <span class="text-mini font-semibold leading-tight break-words hyphens-auto">{{ nombre(uno) }}</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </base-modal>
</template>
