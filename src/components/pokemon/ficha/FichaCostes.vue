<script setup>
/** Avisos (no se puede intercambiar, puede ser oscuro…) y lo que cuesta cada cosa. */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import { useTranslate } from '../../../composables/useTranslate'
import iconoCaramelo from '../../../assets/icons/candy_icon.png'
import BaseMegaEnergyIcon from '../../base/BaseMegaEnergyIcon.vue'

const props = defineProps({
  /** Claves de pokemon.flags.* (useFichaDatos). */
  flags: { type: Array, required: true },
  /** Filas de coste (useFichaDatos). */
  costs: { type: Array, required: true },
  /** Número de la especie: los colores de su megaenergía. */
  dexMega: { type: Number, default: null }
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

/**
 * El valor de una fila en piezas, cada una con su icono: el caramelo del
 * juego, ✧ para el polvo y la piedra de megaenergía con los colores de la especie. La palabra va aparte, para
 * el lector de pantalla. Antes iba todo escrito («25 caramelos · 10.000
 * polvo») y las seis filas eran cajas iguales que costaba comparar.
 */
const piezas = (row) => {
  if (row.texto) return [{ texto: row.texto }]
  if (row.candy) {
    const lista = [
      { n: formatNumber(row.candy), icono: 'candy', palabra: tc('candy', row.candy).toLowerCase() }
    ]
    if (row.dust)
      lista.push({ n: formatNumber(row.dust), signo: '✧', palabra: t('pokemon.stardust') })
    return lista
  }
  if (row.energy) return [{ n: formatNumber(row.energy), icono: 'mega', palabra: t('megaenergy') }]
  return [{ texto: `${formatNumber(row.km)} ${t('unitDistance')}` }]
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
      <h3 v-if="costs.length" class="subtitulo">
        {{ $t('pokemon.status') }}
      </h3>
      <div class="flex flex-wrap gap-1.5 mt-2">
        <span v-for="flag in flags" :key="flag" class="insignia">
          {{ $t(`pokemon.flags.${flag}`) }}
        </span>
      </div>
    </div>

    <div v-if="costs.length">
      <h3 v-if="flags.length" class="subtitulo">
        {{ $t('pokemon.costs') }}
      </h3>
      <ul class="mt-1 divide-y divide-gray-300 dark:divide-gray-700">
        <!-- flex-wrap: si etiqueta y valor no caben, el valor baja, a la derecha. -->
        <li
          v-for="row in costs"
          :key="row.key"
          class="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2 text-xs"
        >
          <span>{{ $t(`pokemon.costLabels.${row.key}`) }}</span>
          <strong
            class="ml-auto flex items-center gap-2.5 text-right whitespace-nowrap tabular-nums"
          >
            <span v-for="(pieza, i) in piezas(row)" :key="i" class="flex items-center gap-1">
              <template v-if="pieza.texto">{{ pieza.texto }}</template>
              <template v-else>
                {{ pieza.n }}
                <img
                  v-if="pieza.icono === 'candy'"
                  :src="iconoCaramelo"
                  alt=""
                  aria-hidden="true"
                  class="w-3.5 h-3.5 object-contain"
                />
                <base-mega-energy-icon
                  v-else-if="pieza.icono === 'mega'"
                  :dex="dexMega"
                  class="w-3.5 h-3.5"
                />
                <span
                  v-else
                  aria-hidden="true"
                  class="font-normal text-gray-600 dark:text-gray-300"
                  >{{ pieza.signo }}</span
                >
                <span class="sr-only">{{ pieza.palabra }}</span>
              </template>
            </span>
          </strong>
        </li>
      </ul>
    </div>
  </ficha-seccion>
</template>
