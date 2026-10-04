<script setup>
/**
 * Combates Max de este Pokémon: qué Ataque Max le da cada ataque rápido, cuál
 * es su ataque Gigamax si lo tiene, y cuánto cuesta dejar los tres al máximo.
 *
 * El Ataque Max de un Dinamax es del tipo de su ataque rápido, así que se
 * enseña uno por cada tipo de rápido que tenga. El Gigamax es fijo. Del coste se da el total de
 * los tres niveles y no el desglose, porque lo que se decide antes de empezar
 * es si merece la pena gastarse las partículas en este Pokémon.
 */
import { computed } from 'vue'
import { useGameDataStore } from '../../stores/gameData'
import { useTranslate } from '../../composables/useTranslate'
import FichaSeccion from './FichaSeccion.vue'
import TypeIcons from '../base/TypeIcons.vue'
import MaxMark from './MaxMark.vue'
import MaxTeamPanel from '../raids/MaxTeamPanel.vue'
import StabBadge from '../base/StabBadge.vue'
import { maxCounters } from '../../utils/maxBattle'
import { calcCP } from '../../utils/formulas'

const props = defineProps({
  /** Entrada del roster con la forma que se está viendo. */
  entry: { type: Object, default: null }
})

const gameData = useGameDataStore()
const { t, localName, formatNumber } = useTranslate()

const maxInfo = computed(() =>
  gameData.isReady && props.entry ? gameData.maxInfoFor(props.entry) : null
)

/**
 * Coste de subir un movimiento Max de nivel, aplanado para la tabla. El primer
 * nivel viene con un coste simbólico (1 partícula, 1 caramelo) porque es el
 * desbloqueo, pero se enseña igual: forma parte del total que hay que pagar.
 */
const SLOTS = [
  { key: 'attack', label: 'max.slotAttack' },
  { key: 'guard', label: 'max.slotGuard' },
  { key: 'spirit', label: 'max.slotSpirit' }
]

const upgradeRows = computed(() => {
  const costs = maxInfo.value?.costs
  if (!costs) return []
  return SLOTS.map(({ key, label }) => {
    const niveles = costs[key] ?? []
    return {
      key,
      label: t(label),
      total: {
        mp: niveles.reduce((suma, n) => suma + (n.mpCost ?? 0), 0),
        candy: niveles.reduce((suma, n) => suma + (n.candyCost ?? 0), 0),
        xl: niveles.reduce((suma, n) => suma + (n.xlCandyCost ?? 0), 0)
      },
      levels: niveles.length
    }
  }).filter((fila) => fila.levels > 0)
})

/** Las columnas de caramelos solo si algún movimiento los pide. */
const conCaramelos = computed(() => upgradeRows.value.some((row) => row.total.candy))
const conXl = computed(() => upgradeRows.value.some((row) => row.total.xl))

/**
 * Con quién ganarle si sale de jefe en un combate Max: el mismo equipo que
 * «Ahora en juego» (uno que aguante y los que pegan, solo Max liberados), con
 * los que hoy están en los nodos marcados.
 */
const equipo = computed(() => {
  if (!maxInfo.value || !gameData.isReady) return null
  const disponibles = new Set((gameData.maxLive?.pokemon ?? []).map((uno) => uno.dex))
  const salida = maxCounters(props.entry, gameData.roster, gameData.chart, {
    limit: 6,
    available: disponibles,
    ...gameData.datosMax()
  })
  return salida.tanks.length || salida.attackers.length ? salida : null
})

/**
 * El PC de un 100 % de lo que sale de un combate Max: siempre a nivel 20, sin
 * potenciar por el clima. El Gigamax tiene las mismas estadísticas, así que es
 * el mismo número. Es lo que se mira al atraparlo, por eso va también plegado.
 */
const pc100 = computed(() => {
  const stats = props.entry?.stats
  return stats?.atk ? calcCP(stats, { atk: 15, def: 15, hp: 15 }, 20) : null
})

/** Los Ataques Max de sus rápidos, sin el Gigamax ni el exclusivo (van aparte). */
const deRapidos = computed(() =>
  (maxInfo.value?.opciones ?? []).filter((opcion) => !opcion.gigamax && !opcion.exclusivo)
)
/** Zacian y Zamazenta coronados y Eternatus: su Ataque Max propio, fijo. */
const exclusivo = computed(
  () => (maxInfo.value?.opciones ?? []).find((opcion) => opcion.exclusivo) ?? null
)
const nombresRapidos = (opcion) => opcion.rapidos.map((rapido) => localName(rapido)).join(' / ')

/** Plegada: el PC de un 100 %, los Ataques Max (y el Gigamax, si lo tiene). */
const resumen = computed(() => {
  const info = maxInfo.value
  if (!info) return ''
  return [
    pc100.value && t('max.cp100Short', { cp: pc100.value }),
    ...deRapidos.value.map((opcion) => localName(opcion.max)),
    exclusivo.value && localName(exclusivo.value.max),
    info.gmaxMove && localName(info.gmaxMove)
  ]
    .filter(Boolean)
    .join(' · ')
})
</script>

<template>
  <!-- ---------- Combates Max ---------- -->
  <ficha-seccion v-if="maxInfo" id="max" :title="$t('max.title')" :summary="resumen">
    <template #titulo>
      <span class="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
        <max-mark variant="dynamax" :size="18" />
        <max-mark v-if="maxInfo.gigantamax" variant="gigantamax" :size="18" />
      </span>
    </template>

    <p class="mt-2 text-xs text-gray-600 dark:text-gray-300">
      {{ $t('max.intro') }}
    </p>

    <dl class="mt-3 flex flex-col gap-2">
      <div
        v-if="pc100"
        class="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
      >
        <dt class="text-xs text-gray-600 dark:text-gray-300">{{ $t('max.cp100') }}</dt>
        <dd class="text-sm font-semibold tabular-nums">
          {{ formatNumber(pc100) }}
          <span class="text-[0.8em] font-normal text-gray-600 dark:text-gray-300">{{
            $t('raids.cpRange')
          }}</span>
        </dd>
      </div>
    </dl>

    <!--
      Un Ataque Max por cada tipo de ataque rápido: con qué rápido se saca cada
      uno. El STAB, marcado, y explicado debajo.
    -->
    <template v-if="deRapidos.length">
      <h3 class="mt-3 mb-1.5 subtitulo">
        {{ $t('max.byFastMove') }}
      </h3>
      <ul class="flex flex-col gap-1.5">
        <li
          v-for="opcion in deRapidos"
          :key="opcion.max.id"
          class="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
        >
          <span class="flex items-center gap-1.5 min-w-0 text-gray-600 dark:text-gray-300">
            <type-icons :types="[opcion.rapidos[0].type]" size="13" />
            {{ nombresRapidos(opcion) }}
          </span>
          <span class="flex items-center gap-1.5 shrink-0 text-sm font-semibold">
            <span aria-hidden="true" class="text-gray-500">→</span>
            <type-icons :types="[opcion.max.type]" size="16" />
            {{ localName(opcion.max) }}
            <stab-badge v-if="opcion.stab" />
          </span>
        </li>
      </ul>
      <p
        v-if="deRapidos.some((opcion) => opcion.stab)"
        class="mt-1.5 flex items-start gap-1.5 text-mini text-gray-600 dark:text-gray-300"
      >
        <stab-badge class="mt-px" />
        <span>{{ $t('max.stabHelp') }}</span>
      </p>
    </template>

    <dl v-if="exclusivo" class="mt-3 flex flex-col gap-2">
      <div
        class="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
      >
        <dt class="text-xs text-gray-600 dark:text-gray-300">{{ $t('max.exclusiveMove') }}</dt>
        <dd class="flex items-center gap-2 text-sm font-semibold">
          <type-icons :types="[exclusivo.max.type]" size="16" />
          {{ localName(exclusivo.max) }}
          <stab-badge v-if="exclusivo.stab" />
        </dd>
      </div>
    </dl>

    <dl v-if="maxInfo.gmaxMove" class="mt-2 flex flex-col gap-2">
      <div
        class="flex items-center justify-between gap-2 p-2 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950 border border-fuchsia-300 dark:border-fuchsia-800"
      >
        <dt class="text-xs text-gray-600 dark:text-gray-300">{{ $t('max.gmaxMove') }}</dt>
        <dd class="flex items-center gap-2 text-sm font-semibold">
          <type-icons :types="[maxInfo.gmaxMove.type]" size="16" />
          {{ localName(maxInfo.gmaxMove) }}
        </dd>
      </div>
    </dl>

    <!--
      Coste total de dejar cada movimiento Max al máximo. Se da el total y no
      el desglose por nivel porque lo que se decide antes de empezar es si
      merece la pena gastarse las partículas en este Pokémon.
    -->
    <div v-if="upgradeRows.length" class="mt-4 pt-3 border-t border-gray-300 dark:border-gray-700">
      <h3 class="subtitulo">
        {{ $t('max.upgradeTitle') }}
      </h3>
      <!--
        Una tabla y no una frase por movimiento: en móvil la frase
        («1800 Partículas Max · 150 Caramelos · 40 Caramelos XL») se partía en
        dos líneas en cada fila, y así los números quedan alineados.
      -->
      <table class="mt-2 w-full text-xs tabular-nums">
        <thead>
          <tr class="text-mini text-gray-600 dark:text-gray-300 align-bottom">
            <th scope="col" class="sr-only">{{ $t('max.upgradeTitle') }}</th>
            <th scope="col" class="pb-1 pl-2 font-normal text-right">{{ $t('max.particles') }}</th>
            <th v-if="conCaramelos" scope="col" class="pb-1 pl-2 font-normal text-right">
              {{ $t('max.candy') }}
            </th>
            <th v-if="conXl" scope="col" class="pb-1 pl-2 font-normal text-right">
              {{ $t('max.candyXl') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in upgradeRows"
            :key="row.key"
            class="border-t border-gray-200 dark:border-gray-800"
          >
            <th scope="row" class="py-1 text-left font-semibold">{{ row.label }}</th>
            <td class="py-1 pl-2 text-right">{{ formatNumber(row.total.mp) }}</td>
            <td v-if="conCaramelos" class="py-1 pl-2 text-right">
              {{ row.total.candy ? formatNumber(row.total.candy) : '—' }}
            </td>
            <td v-if="conXl" class="py-1 pl-2 text-right">
              {{ row.total.xl ? formatNumber(row.total.xl) : '—' }}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="mt-2 text-mini text-gray-600 dark:text-gray-300">
        {{ $t('max.upgradeNote') }}
      </p>
    </div>

    <div v-if="equipo" class="mt-4 pt-3 border-t border-gray-300 dark:border-gray-700">
      <h3 class="subtitulo mb-2">
        {{ $t('max.teamAgainst', { pokemon: localName(entry) }) }}
      </h3>
      <max-team-panel :boss-name="localName(entry)" :team="equipo" />
    </div>
  </ficha-seccion>
</template>
