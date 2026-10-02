<script setup>
/** Puestos en PvP, por liga. */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import { useTranslate } from '../../../composables/useTranslate'

const props = defineProps({
  /** pvpPorLiga de useFichaDatos: [{ league, entries }]. */
  porLiga: { type: Array, required: true },
  /** conNombre de useFichaDatos. */
  conNombre: { type: Function, required: true },
  /** Los rankings PvP se piden aparte: hasta que llegan, no se sabe si está. */
  listo: Boolean
})

const { t, localName } = useTranslate()

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
          <span class="ml-auto shrink-0">
            #{{ entry.rank }} · <strong>{{ entry.score.toFixed(1) }}</strong>
          </span>
        </span>
      </li>
    </ul>
  </ficha-seccion>
</template>
