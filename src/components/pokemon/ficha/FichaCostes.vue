<script setup>
/** Avisos (no se puede intercambiar, puede ser oscuro…) y lo que cuesta cada cosa. */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import { useTranslate } from '../../../composables/useTranslate'

const props = defineProps({
  /** Claves de pokemon.flags.* (useFichaDatos). */
  flags: { type: Array, required: true },
  /** Filas de coste (useFichaDatos). */
  costs: { type: Array, required: true }
})

const { t, tc, formatNumber } = useTranslate()

const costeTexto = (row) => {
  if (row.texto) return row.texto
  if (row.candy)
    return `${formatNumber(row.candy)} ${tc('candy', row.candy).toLowerCase()}${
      row.dust ? ` · ${formatNumber(row.dust)} ${t('pokemon.stardust')}` : ''
    }`
  if (row.energy) return `${formatNumber(row.energy)} ${t('megaenergy')}`
  return `${formatNumber(row.km)} ${t('unitDistance')}`
}

const titulo = computed(() => {
  if (props.flags.length && props.costs.length) return t('pokemon.statusAndCosts')
  return props.flags.length ? t('pokemon.status') : t('pokemon.costs')
})

/** Plegada: los avisos y el primer coste. */
const resumen = computed(() => {
  const avisos = props.flags.map((flag) => t(`pokemon.flags.${flag}`))
  const primero = props.costs[0]
  return [...avisos, primero && `${t(`pokemon.costLabels.${primero.key}`)}: ${costeTexto(primero)}`]
    .filter(Boolean)
    .join(' · ')
})
</script>

<template>
  <ficha-seccion id="costes" :title="titulo" :summary="resumen">
    <div v-if="flags.length" :class="costs.length ? 'mb-4' : ''">
      <h3 v-if="costs.length" class="text-xs font-bold text-gray-600 dark:text-gray-300">
        {{ $t('pokemon.status') }}
      </h3>
      <div class="flex flex-wrap gap-1.5 mt-2">
        <span
          v-for="flag in flags"
          :key="flag"
          class="px-2 py-0.5 text-mini rounded-full border border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-300"
        >
          {{ $t(`pokemon.flags.${flag}`) }}
        </span>
      </div>
    </div>

    <div v-if="costs.length">
      <h3 v-if="flags.length" class="text-xs font-bold text-gray-600 dark:text-gray-300">
        {{ $t('pokemon.costs') }}
      </h3>
      <ul class="mt-2 flex flex-col gap-1.5">
        <!--
          flex-wrap: si etiqueta y valor no caben en una línea, el valor baja
          a la siguiente, a la derecha. Antes la etiqueta se encogía hasta
          cero y «Purificar» acababa debajo de «3 caramelos».
        -->
        <li
          v-for="row in costs"
          :key="row.key"
          class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
        >
          <span>{{ $t(`pokemon.costLabels.${row.key}`) }}</span>
          <strong class="ml-auto text-right whitespace-nowrap">{{ costeTexto(row) }}</strong>
        </li>
      </ul>
    </div>
  </ficha-seccion>
</template>
