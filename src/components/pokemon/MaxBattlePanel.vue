<script setup>
/**
 * Combates Max de este Pokémon: qué Ataque Max le toca, cuál es su ataque
 * Gigamax si lo tiene, y cuánto cuesta dejar los tres al máximo.
 *
 * El Ataque Max no se elige: lo decide el tipo principal, así que se enseña
 * como un dato y no como una lista de opciones. Del coste se da el total de
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
import { maxCounters } from '../../utils/maxBattle'

const props = defineProps({
  /** Entrada del roster con la forma que se está viendo. */
  entry: { type: Object, default: null }
})

const gameData = useGameDataStore()
const { t, localName } = useTranslate()

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

/**
 * Con quién ganarle si sale de jefe en un combate Max: el mismo equipo que
 * «Ahora en juego» (uno que aguante y los que pegan, solo Max liberados), con
 * los que hoy están en los nodos marcados.
 */
const equipo = computed(() => {
  if (!maxInfo.value || !gameData.isReady) return null
  const disponibles = new Set((gameData.maxLive?.pokemon ?? []).map((uno) => uno.dex))
  const salida = maxCounters(props.entry, gameData.roster, gameData.chart, { limit: 6, available: disponibles })
  return salida.tanks.length || salida.attackers.length ? salida : null
})

const comoConseguir = (quien) => {
  if (quien.availableNow) return t('max.availableNow')
  if (quien.availableFrom) return t('max.availableVia', { pokemon: localName(quien.availableFrom) })
  return null
}

/** Plegada: el ataque Max (y el Gigamax, si lo tiene). */
const resumen = computed(() => {
  const info = maxInfo.value
  if (!info) return ''
  return [info.maxMove && localName(info.maxMove), info.gmaxMove && localName(info.gmaxMove)].filter(Boolean).join(' · ')
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

    <!--
      El ataque Max no se elige: lo marca el tipo principal. Por eso se
      enseña como un dato, no como una lista de opciones.
    -->
    <dl class="mt-3 flex flex-col gap-2">
      <div
        v-if="maxInfo.maxMove"
        class="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
      >
        <dt class="text-xs text-gray-600 dark:text-gray-300">{{ $t('max.maxMove') }}</dt>
        <dd class="flex items-center gap-2 text-sm font-semibold">
          <type-icons :types="[maxInfo.maxMove.type]" size="16" />
          {{ localName(maxInfo.maxMove) }}
        </dd>
      </div>

      <div
        v-if="maxInfo.gmaxMove"
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
      <h3 class="text-xs font-bold text-gray-600 dark:text-gray-300">
        {{ $t('max.upgradeTitle') }}
      </h3>
      <ul class="mt-2 flex flex-col gap-1.5">
        <li
          v-for="row in upgradeRows"
          :key="row.key"
          class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs"
        >
          <span class="font-semibold">{{ row.label }}</span>
          <span class="ml-auto text-gray-600 dark:text-gray-300 text-right">
            {{ row.total.mp }} {{ $t('max.particles') }}
            <template v-if="row.total.candy"> · {{ row.total.candy }} {{ $t('max.candy') }}</template>
            <template v-if="row.total.xl"> · {{ row.total.xl }} {{ $t('max.candyXl') }}</template>
          </span>
        </li>
      </ul>
      <p class="mt-2 text-mini text-gray-600 dark:text-gray-300">
        {{ $t('max.upgradeNote') }}
      </p>
    </div>

    <div v-if="equipo" class="mt-4 pt-3 border-t border-gray-300 dark:border-gray-700">
      <h3 class="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
        {{ $t('max.teamAgainst', { pokemon: localName(entry) }) }}
      </h3>
      <max-team-panel :boss-name="localName(entry)" :team="equipo" :how-to-get="comoConseguir" />
    </div>
  </ficha-seccion>

</template>
