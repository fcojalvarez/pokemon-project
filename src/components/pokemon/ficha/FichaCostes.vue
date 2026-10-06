<script setup>
/** Avisos (no se puede intercambiar, puede ser oscuro…) y lo que cuesta cada cosa. */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import { useTranslate } from '../../../composables/useTranslate'
import iconoCaramelo from '../../../assets/icons/candy_icon.png'
import BaseMegaEnergyIcon from '../../base/BaseMegaEnergyIcon.vue'
import IconoMascara from '../../base/IconoMascara.vue'
import ConversionDibujo from '../ConversionDibujo.vue'
import { useGameDataStore } from '../../../stores/gameData'
import { conversionesDeEspecie } from '../../../utils/cambiosForma'

const props = defineProps({
  /** Claves de pokemon.flags.* (useFichaDatos). */
  flags: { type: Array, required: true },
  /** Filas de coste (useFichaDatos). */
  costs: { type: Array, required: true },
  /** Número de la especie: los colores de su megaenergía. */
  dexMega: { type: Number, default: null },
  /** La forma que se ve (la `entrada` de useFichaDatos): para sus fusiones o cambios de forma. */
  entrada: { type: Object, default: null }
})

const { t, tc, formatNumber, localName } = useTranslate()

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

const gameData = useGameDataStore()

/**
 * Las fusiones o cambios de forma de la especie (Necrozma con Solgaleo y
 * Lunala, Zacian a Espada Suprema…), con lo que cuestan: en la ficha de
 * cualquiera de sus formas.
 */
const conversiones = computed(() => {
  const dex = props.entrada?.dex
  if (!dex || !gameData.isReady) return []
  const ids = (gameData.formsByDex.get(dex) ?? []).map((forma) => forma.id)
  return conversionesDeEspecie(ids).filter((c) => gameData.byId.get(c.a))
})
const tipoConversiones = computed(() => conversiones.value[0]?.tipo ?? null)

/** Lo que cuesta, en piezas con su icono: energía, caramelos, polvo o células. */
const costeConversion = (c) =>
  [
    c.energia && {
      n: formatNumber(c.cantidad),
      icono: 'energia',
      texto: t(`pokemon.conversion.energyShort.${c.energia}`)
    },
    c.caramelos && { n: formatNumber(c.caramelos), icono: 'candy' },
    c.caramelosCon && {
      n: `+ ${formatNumber(c.caramelosCon)}`,
      icono: 'candy',
      texto: gameData.byId.get(c.con) ? localName(gameData.byId.get(c.con)) : ''
    },
    c.polvo && { n: formatNumber(c.polvo), signo: '✧' },
    c.celulas && { n: formatNumber(c.celulas), texto: t('pokemon.conversion.cellsShort') }
  ].filter(Boolean)

/** «Volver: 10 caramelos · 2.000 polvo» o «Volver: gratis». */
const vueltaTexto = (vuelta) => {
  const partes = [
    vuelta.caramelos &&
      `${formatNumber(vuelta.caramelos)} ${tc('candy', vuelta.caramelos).toLowerCase()}`,
    vuelta.polvo && `${formatNumber(vuelta.polvo)} ${t('pokemon.stardust')}`
  ].filter(Boolean)
  return `${t('pokemon.conversion.back')}: ${
    partes.length ? partes.join(' · ') : t('pokemon.conversion.free')
  }`
}

const titulo = computed(() => {
  if (props.flags.length && (props.costs.length || conversiones.value.length))
    return t('pokemon.statusAndCosts')
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
      <h3 v-if="costs.length || conversiones.length" class="subtitulo">
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
                <!-- El PNG del juego es blanco: como máscara, del color del texto (en claro no se veía). -->
                <icono-mascara
                  v-if="pieza.icono === 'candy'"
                  :src="iconoCaramelo"
                  class="w-3.5 h-3.5"
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

    <!-- Fusiones o cambios de forma: una tarjeta por cada uno, con sus dibujos y lo que cuesta. -->
    <div v-if="conversiones.length" class="mt-4">
      <h3 class="subtitulo">{{ $t(`pokemon.conversion.${tipoConversiones}`) }}</h3>
      <ul class="mt-2 flex flex-col gap-2">
        <li
          v-for="c in conversiones"
          :key="`${c.desde}-${c.a}`"
          class="p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
        >
          <conversion-dibujo :conversion="c" tam="sm" />
          <p
            class="mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs font-semibold tabular-nums"
          >
            <span
              v-for="(pieza, i) in costeConversion(c)"
              :key="i"
              class="inline-flex items-center gap-1"
            >
              {{ pieza.n }}
              <svg
                v-if="pieza.icono === 'energia'"
                viewBox="0 0 24 24"
                class="w-3.5 h-3.5 text-amber-500"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
              </svg>
              <icono-mascara
                v-else-if="pieza.icono === 'candy'"
                :src="iconoCaramelo"
                class="w-3.5 h-3.5"
              />
              <span
                v-else-if="pieza.signo"
                aria-hidden="true"
                class="font-normal text-gray-600 dark:text-gray-300"
                >{{ pieza.signo }}</span
              >
              <span v-if="pieza.texto" class="font-normal">{{ pieza.texto }}</span>
            </span>
          </p>
          <p
            v-if="c.vuelta && c.tipo !== 'fusion'"
            class="mt-1 text-center text-mini text-gray-600 dark:text-gray-300"
          >
            {{ vueltaTexto(c.vuelta) }}
          </p>
        </li>
      </ul>
      <p
        v-if="tipoConversiones === 'fusion'"
        class="mt-2 text-mini text-gray-600 dark:text-gray-300"
      >
        {{ $t('pokemon.conversion.unfuseFree') }} {{ $t('pokemon.conversion.energyNote') }}
        {{ $t('pokemon.conversion.keeps') }}
      </p>
    </div>
  </ficha-seccion>
</template>
