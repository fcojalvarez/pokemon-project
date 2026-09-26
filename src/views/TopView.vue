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
import { useTranslate } from '../composables/useTranslate'

const gameData = useGameDataStore()
const { t } = useTranslate()

const mode = ref('pve')
const type = ref('all')
const sortBy = ref('dps')
const league = ref('great')
const includeMega = ref(true)
const includeShadow = ref(true)

const modeOptions = computed(() => [
  { value: 'pve', label: t('top.pve') },
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

const pveRows = computed(() => {
  if (!gameData.isReady || mode.value !== 'pve') return []
  const rankings = gameData.pveRankings({
    includeMega: includeMega.value,
    includeShadow: includeShadow.value,
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

onMounted(() => gameData.load())
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
      {{ mode === 'pve' ? $t('top.pveIntro') : $t('top.pvpIntro') }}
    </p>

    <div class="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
      <base-filter-select v-model="mode" :label="$t('top.mode')" :options="modeOptions" />
      <base-filter-select v-model="type" :label="$t('top.type')" :options="typeOptions" />
      <base-filter-select
        v-if="mode === 'pve'"
        v-model="sortBy"
        :label="$t('top.sortBy')"
        :options="sortOptions"
      />
      <base-filter-select
        v-else
        v-model="league"
        :label="$t('top.league')"
        :options="leagueOptions"
      />
    </div>

    <div v-if="mode === 'pve'" class="flex flex-wrap items-center gap-2 mb-4">
      <base-pill-button :active="includeMega" @click="includeMega = !includeMega">
        {{ $t('top.megas') }}
      </base-pill-button>
      <base-pill-button :active="includeShadow" @click="includeShadow = !includeShadow">
        {{ $t('top.shadows') }}
      </base-pill-button>
      <span class="text-mini text-gray-500 dark:text-gray-400">{{ sortHelp }}</span>
    </div>

    <spinner-component v-if="gameData.status === 'loading'" />

    <base-error-message
      v-else-if="gameData.status === 'error'"
      :message="$t('common.error')"
      :detail="gameData.error"
    />

    <!-- PvE -->
    <attacker-list v-else-if="mode === 'pve'" :rows="pveRows" :sort-by="sortBy" />

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
      v-if="gameData.isReady && (mode === 'pve' ? pveRows.length === 0 : pvpRows.length === 0)"
      :message="$t('common.empty')"
    />

    <details v-if="mode === 'pve'" class="mt-6 text-sm text-gray-600 dark:text-gray-400">
      <summary class="cursor-pointer py-2">{{ $t('top.howCalculated') }}</summary>
      <p class="mt-2">{{ $t('top.method1') }}</p>
      <p class="mt-2">{{ $t('top.method2') }}</p>
      <p class="mt-2">{{ $t('top.method3') }}</p>
    </details>
  </section>
</template>
