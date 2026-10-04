<script setup>
/**
 * Puestos en PvP, por liga, y con el mejor de cada una: su conjunto
 * recomendado con cuántos rápidos hacen falta para cada cargado (contar
 * rápidos es la base del PvP) y a quién gana y con quién pierde.
 *
 * De entrada, solo los puestos de las tres ligas, que se comparan de un
 * vistazo. Ataques y rivales, tras «Ver ataques y rivales»: con todo abierto
 * la sección ocupaba tres pantallas y casi siempre interesa una liga.
 */
import { computed, ref } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import MoveTag from '../MoveTag.vue'
import BaseNivel from '../../base/BaseNivel.vue'
import BaseChevron from '../../base/BaseChevron.vue'
import { useTranslate, formatDecimal } from '../../../composables/useTranslate'

const props = defineProps({
  /** pvpPorLiga de useFichaDatos: [{ league, entries, conjunto, gana, pierde }]. */
  porLiga: { type: Array, required: true },
  /** conNombre de useFichaDatos. */
  conNombre: { type: Function, required: true },
  /** Los rankings PvP se piden aparte: hasta que llegan, no se sabe si está. */
  listo: Boolean
})

const { t, localName } = useTranslate()

const conDetalles = ref(false)
const hayDetalles = computed(() =>
  props.porLiga.some((liga) => liga.conjunto || liga.gana.length || liga.pierde.length)
)

/** Plegada: el mejor puesto de cada liga, del mejor al peor. */
const resumen = computed(() => {
  if (!props.listo) return t('common.loading')
  if (!props.porLiga.length) return t('pokemon.noPvpRank')
  return props.porLiga
    .map((liga) => liga.entries[0])
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => `${t(`top.${entry.league}`)} #${entry.rank}`)
    .join(' · ')
})
</script>

<template>
  <ficha-seccion id="pvp" :title="$t('pokemon.pvpRanks')" :summary="resumen">
    <p v-if="!listo" class="mt-2 text-mini text-gray-600 dark:text-gray-300">
      {{ $t('common.loading') }}
    </p>
    <p v-else-if="!porLiga.length" class="mt-2 text-mini text-gray-600 dark:text-gray-300">
      {{ $t('pokemon.noPvpRank') }}
    </p>
    <ul v-else class="mt-2 flex flex-col gap-1.5">
      <li
        v-for="liga in porLiga"
        :key="liga.league"
        class="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
      >
        <span class="block font-semibold">{{ $t(`top.${liga.league}`) }}</span>
        <span v-for="entry in liga.entries" :key="entry.id" class="flex items-center gap-2 mt-0.5">
          <span
            v-if="conNombre(entry.id, liga.entries.length > 1)"
            class="min-w-0 text-gray-600 dark:text-gray-300"
            >{{ localName(entry) }}</span
          >
          <span class="ml-auto shrink-0 inline-flex items-center gap-1.5">
            <base-nivel :rank="entry.rank" pequena />
            #{{ entry.rank }} · <strong>{{ formatDecimal(entry.score) }}</strong>
          </span>
        </span>

        <template v-if="conDetalles && liga.conjunto">
          <span class="block mt-2 text-mini text-gray-600 dark:text-gray-300">
            {{ $t('pokemon.pvpCombat.fastPerCharged') }}
          </span>
          <ul class="mt-1 flex flex-col gap-1">
            <li
              v-for="cargado in liga.conjunto.cargados"
              :key="cargado.id"
              class="flex flex-wrap items-center gap-x-1.5 gap-y-1"
            >
              <move-tag
                chip
                :name="localName(liga.conjunto.rapido)"
                :type="liga.conjunto.rapido.type"
              />
              <span aria-hidden="true" class="text-gray-500">→</span>
              <move-tag chip :name="localName(cargado)" :type="cargado.type" />
              <span v-if="cargado.cuenta" class="ml-auto shrink-0">
                {{
                  $t('pokemon.pvpCombat.count', {
                    n: cargado.cuenta.veces,
                    turnos: cargado.cuenta.turnos
                  })
                }}
              </span>
            </li>
          </ul>
        </template>
        <!--
          A quién gana y con quién pierde: un ✓ verde y un ✕ rojo delante. Con
          los rótulos en el mismo gris que los nombres no se distinguía lo bueno
          de lo malo. El rótulo sigue ahí para el lector de pantalla.
        -->
        <dl
          v-if="conDetalles && (liga.gana.length || liga.pierde.length)"
          class="mt-2 flex flex-col gap-1"
        >
          <div v-if="liga.gana.length" class="flex gap-1.5">
            <dt class="shrink-0 w-4 text-center font-bold text-green-700 dark:text-green-400">
              <span aria-hidden="true">✓</span
              ><span class="sr-only">{{ $t('pokemon.pvpCombat.wins') }}</span>
            </dt>
            <dd>{{ liga.gana.map(localName).join(' · ') }}</dd>
          </div>
          <div v-if="liga.pierde.length" class="flex gap-1.5">
            <dt class="shrink-0 w-4 text-center font-bold text-red-700 dark:text-red-400">
              <span aria-hidden="true">✕</span
              ><span class="sr-only">{{ $t('pokemon.pvpCombat.loses') }}</span>
            </dt>
            <dd>{{ liga.pierde.map(localName).join(' · ') }}</dd>
          </div>
        </dl>
      </li>
    </ul>
    <button
      v-if="listo && hayDetalles"
      type="button"
      class="mt-2 ver-mas"
      :aria-expanded="conDetalles"
      @click="conDetalles = !conDetalles"
    >
      {{ $t(conDetalles ? 'pokemon.pvpCombat.hideDetails' : 'pokemon.pvpCombat.showDetails') }}
      <base-chevron :open="conDetalles" size="w-3.5 h-3.5" />
    </button>
  </ficha-seccion>
</template>
