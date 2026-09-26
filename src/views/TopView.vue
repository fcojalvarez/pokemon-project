<script setup>
import { computed, onMounted, ref } from 'vue'
import { useGameDataStore } from '../stores/gameData'
import {
  BaseEmptyState,
  BaseErrorMessage,
  BaseFilterSelect,
  BasePillButton,
  SpinnerComponent
} from '../components/index'
import AttackerList from '../components/rankings/AttackerList.vue'
import MoveLegend from '../components/pokemon/MoveLegend.vue'
import BaseChevron from '../components/base/BaseChevron.vue'
import { useTranslate } from '../composables/useTranslate'

const gameData = useGameDataStore()
const { t } = useTranslate()

const mode = ref('pve')
const type = ref('all')
const sortBy = ref('dps')
const league = ref('great')
const abierto = ref(false)
const includeMega = ref(true)
const includeShadow = ref(true)
/**
 * Los legacy ya no se pueden conseguir. Va encendido porque es el ranking
 * teórico de siempre; apagándolo sale el que de verdad está a tu alcance.
 */
const includeLegacy = ref(true)
/** Los élite solo salen con MT Élite o en eventos: mismo trato que los legacy. */
const includeElite = ref(true)

// Dinamax va justo detrás de incursiones: las dos son PvE, y el PvP es lo
// que se sale del grupo.
const modeOptions = computed(() => [
  { value: 'pve', label: t('top.pve') },
  { value: 'max', label: t('max.tabTitle') },
  { value: 'pvp', label: t('top.pvp') }
])

const typeOptions = computed(() => [
  { value: 'all', label: mode.value === 'pve' ? t('top.overall') : t('top.allTypes') },
  ...gameData.types.map((type) => ({ value: type, label: t(`types.${type}`) }))
])

const sortOptions = computed(() => [
  { value: 'dps', label: t('top.dps') },
  { value: 'tdo', label: t('top.tdo') },
  { value: 'er', label: t('top.er') }
])

const leagueOptions = computed(() => [
  { value: 'great', label: `${t('top.great')} · ${t('top.capGreat')}` },
  { value: 'ultra', label: `${t('top.ultra')} · ${t('top.capUltra')}` },
  { value: 'master', label: `${t('top.master')} · ${t('top.capMaster')}` }
])

const sortHelp = computed(() => t(`top.${sortBy.value}Help`))

/** Si la pestaña activa tiene algo que pintar; si no, sale el vacío. */
const rowsShown = computed(() =>
  mode.value === 'max' ? maxRows.value.length
    : mode.value === 'pve' ? pveRows.value.length
      : pvpRows.value.length
)

const pveRows = computed(() => {
  if (!gameData.isReady || mode.value !== 'pve') return []
  const rankings = gameData.pveRankings({
    includeMega: includeMega.value,
    includeShadow: includeShadow.value,
    includeLegacy: includeLegacy.value,
    includeElite: includeElite.value,
    sortBy: sortBy.value,
    limit: 50
  })
  return type.value === 'all' ? rankings.overall : rankings.byType[type.value] ?? []
})

const pvpRows = computed(() => {
  if (!gameData.isReady || mode.value !== 'pvp') return []
  const rows = gameData.pvp[league.value] ?? []
  return type.value === 'all' ? rows : rows.filter((row) => row.types.includes(type.value))
})

/**
 * Top de Dinamax por tipo, ordenado por ataque base.
 *
 * Aquí no se puede calcular un DPS como en el PvE: los ataques Max no publican
 * potencia, el daño lo resuelve el cliente del juego a partir del nivel del
 * movimiento. Lo que sí es cierto es que todos los Dinamax de un mismo tipo
 * usan el MISMO Ataque Max, así que dentro de un tipo la variable del ataque
 * se cancela y solo queda el ataque base: por eso este orden sí es honesto
 * dentro de cada tipo, y por eso no se comparan tipos entre sí.
 *
 * El filtro va por tipo PRINCIPAL, que es el que decide el Ataque Max: a
 * Charizard (fuego/volador) le toca Maxignición, no Maxiciclón, así que
 * listarlo entre los voladores mentiría.
 */
const maxRows = computed(() => {
  if (!gameData.isReady || mode.value !== 'max') return []

  const vistos = new Set()
  const candidatos = []
  for (const entry of gameData.roster) {
    if (!entry.dynamax && !entry.gigantamax) continue
    if (type.value !== 'all' && entry.types?.[0] !== type.value) continue
    // Los Pikachu con gorro comparten stats con el normal: una fila basta.
    if (vistos.has(entry.dex)) continue
    vistos.add(entry.dex)
    candidatos.push(entry)
  }

  return candidatos
    .sort((a, b) => (b.stats?.atk ?? 0) - (a.stats?.atk ?? 0))
    .slice(0, 50)
    .map((entry, indice) => {
      const info = gameData.maxInfoFor(entry)
      return {
        id: entry.id,
        rank: indice + 1,
        dex: entry.dex,
        spriteId: entry.spriteId,
        nameEs: entry.nameEs,
        types: entry.types,
        moves: [info?.gmaxMove, info?.maxMove].filter(Boolean).map((movimiento) => ({
          id: movimiento.id,
          nameEs: movimiento.nameEs,
          type: movimiento.type
        })),
        value: entry.stats?.atk ?? 0
      }
    })
})

const moveName = (id) => gameData.moves[id]?.nameEs ?? id
const moveType = (id) => gameData.moves[id]?.type ?? 'normal'

/**
 * Las filas de PvP llegan de pvpoke con otra forma (movimientos por id y una
 * puntuación en vez de DPS). Se traducen aquí a lo que espera AttackerList,
 * que es quien pinta los dos rankings.
 */
const pvpAsRows = computed(() =>
  pvpRows.value.map((row) => {
    const entry = gameData.byId.get(row.id)
    const elite = new Set(entry?.eliteMoves ?? [])
    const legacy = new Set(entry?.legacyMoves ?? [])
    const mega = new Set(entry?.megaMoves ?? [])
    return {
      id: row.id,
      rank: row.rank,
      dex: entry?.dex ?? null,
      spriteId: entry?.spriteId ?? 0,
      nameEs: row.nameEs,
      types: row.types,
      moves: (row.moveset ?? []).map((id) => ({
        id,
        nameEs: moveName(id),
        type: moveType(id),
        elite: elite.has(id),
        legacy: legacy.has(id),
        mega: mega.has(id)
      })),
      value: row.score
    }
  })
)

/**
 * Qué procedencias de movimiento salen en la tabla que se está viendo.
 *
 * La leyenda solo explica los colores que de verdad aparecen: si en ese top no
 * hay ningún legacy, decir qué significa el morado sobra y despista.
 */
const filasVisibles = computed(() =>
  mode.value === 'max' ? maxRows.value : mode.value === 'pve' ? pveRows.value : pvpAsRows.value
)

const origenes = computed(() => {
  const marcas = { elite: false, legacy: false, mega: false }
  for (const fila of filasVisibles.value) {
    const movimientos = fila.moves ?? [fila.fast, fila.charged].filter(Boolean)
    for (const m of movimientos) {
      if (m?.elite) marcas.elite = true
      if (m?.legacy) marcas.legacy = true
      if (m?.mega) marcas.mega = true
    }
  }
  return marcas
})

onMounted(() => gameData.load())
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
      {{ mode === 'max' ? $t('max.tabIntro') : mode === 'pve' ? $t('top.pveIntro') : $t('top.pvpIntro') }}
    </p>

    <div class="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
      <base-filter-select v-model="mode" :label="$t('top.mode')" :options="modeOptions" />
      <base-filter-select v-model="type" :label="$t('top.type')" :options="typeOptions" />
      <base-filter-select
        v-if="mode === 'pve'"
        v-model="sortBy"
        :label="$t('top.sortBy')"
        :options="sortOptions"
      />
      <base-filter-select
        v-else-if="mode === 'pvp'"
        v-model="league"
        :label="$t('top.league')"
        :options="leagueOptions"
      />
    </div>

    <!--
      Mismo trato que los selectores de arriba: etiqueta encima y botones del
      mismo alto repartidos en rejilla. Sueltos en una fila parecían de otro
      orden, y son el tercer filtro de la vista.
    -->
    <div v-if="mode === 'pve'" class="mb-3">
      <span
        id="incluir-top"
        class="block mb-1 text-mini uppercase tracking-wider text-gray-500 dark:text-gray-400"
      >{{ $t('top.include') }}</span>

      <div
        role="group"
        aria-labelledby="incluir-top"
        class="grid grid-cols-2 sm:grid-cols-4 gap-2"
      >
        <base-pill-button
          class="h-11 w-full text-sm"
          :active="includeMega"
          @click="includeMega = !includeMega"
        >
          {{ $t('top.megas') }}
        </base-pill-button>
        <base-pill-button
          class="h-11 w-full text-sm"
          :active="includeShadow"
          @click="includeShadow = !includeShadow"
        >
          {{ $t('top.shadows') }}
        </base-pill-button>
        <base-pill-button
          class="h-11 w-full text-sm"
          :active="includeLegacy"
          :title="$t('top.legacyHelp')"
          @click="includeLegacy = !includeLegacy"
        >
          {{ $t('moves.legacy') }}
        </base-pill-button>
        <base-pill-button
          class="h-11 w-full text-sm"
          :active="includeElite"
          :title="$t('top.eliteHelp')"
          @click="includeElite = !includeElite"
        >
          {{ $t('moves.elite') }}
        </base-pill-button>
      </div>

      <p class="mt-2 text-mini text-gray-500 dark:text-gray-400">{{ sortHelp }}</p>
    </div>

    <move-legend
      v-if="origenes.elite || origenes.legacy || origenes.mega"
      class="mb-3"
      :elite="origenes.elite"
      :legacy="origenes.legacy"
      :mega="origenes.mega"
    />

    <spinner-component v-if="gameData.status === 'loading'" />

    <base-error-message
      v-else-if="gameData.status === 'error'"
      :message="$t('common.error')"
      :detail="gameData.error"
    />

    <!-- PvE -->
    <attacker-list v-else-if="mode === 'pve'" :rows="pveRows" :sort-by="sortBy" />

    <!--
      Dinamax: la métrica es el ataque base y los movimientos que se enseñan
      son el Ataque Max (y el Gigamax, si lo tiene).
    -->
    <attacker-list
      v-else-if="mode === 'max'"
      :rows="maxRows"
      sort-by="value"
      :unit="$t('attack')"
      :show-secondary="false"
    />

    <!-- PvP: la misma lista, sin barra ni métrica de apoyo (no hay DPS aquí). -->
    <attacker-list
      v-else
      :rows="pvpAsRows"
      sort-by="score"
      unit=""
      :show-bar="false"
      :show-secondary="false"
    />

    <base-empty-state
      v-if="gameData.isReady && !rowsShown"
      :message="mode === 'max' && type !== 'all' ? $t('max.noneOfType') : $t('common.empty')"
    />

    <details
      v-if="mode === 'pve'"
      class="mt-6 text-sm text-gray-600 dark:text-gray-400"
      @toggle="abierto = $event.target.open"
    >
      <!--
        El triángulo nativo apunta a la derecha; aquí apunta hacia abajo, como
        el resto de desplegables de la app. Mismo sitio (delante del texto) y
        mismo tamaño que tenía: lo único que cambia es hacia dónde mira.
      -->
      <summary class="flex items-center gap-2 cursor-pointer py-2 marcador-propio">
        <base-chevron :open="abierto" />
        {{ $t('top.howCalculated') }}
      </summary>
      <p class="mt-2">{{ $t('top.method1') }}</p>
      <p class="mt-2">{{ $t('top.method2') }}</p>
      <p class="mt-2">{{ $t('top.method3') }}</p>
    </details>
  </section>
</template>

<style scoped>
.marcador-propio {
  list-style: none;
}

/* Safari no entiende `list-style` en un <summary>. */
.marcador-propio::-webkit-details-marker {
  display: none;
}
</style>
