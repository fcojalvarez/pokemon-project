<script setup>
import { computed, onMounted, ref } from 'vue'
import { useGameDataStore } from '../stores/gameData'
import {
  BaseEmptyState,
  BaseErrorMessage,
  BaseFilterSelect,
  BasePillButton,
  SkeletonLoader
} from '../components/index'
import AttackerList from '../components/rankings/AttackerList.vue'
import AttackerTable from '../components/rankings/AttackerTable.vue'
import TopCalculo from '../components/rankings/TopCalculo.vue'
import MoveLegend from '../components/pokemon/MoveLegend.vue'
import { useMedia } from '../composables/useMedia'
import { entre, lista, useFiltrosEnUrl } from '../composables/useFiltrosEnUrl'
import { useTranslate } from '../composables/useTranslate'

const gameData = useGameDataStore()
const { t } = useTranslate()

const mode = ref('pve')
const type = ref('all')
const sortBy = ref('dps')
const league = ref('great')
// Desde xl, barra lateral fija con los filtros y el ranking en tabla.
const ancho = useMedia('(min-width: 1280px)')
// Los botones de «Incluir»: más bajos en la barra lateral, que es estrecha.
const boton = computed(() => (ancho.value ? 'h-9 w-full text-xs' : 'h-11 w-full text-sm'))
const includeMega = ref(true)
const includeShadow = ref(true)
/**
 * Los legacy ya no se pueden conseguir. Va encendido porque es el ranking
 * teórico de siempre; apagándolo sale el que de verdad está a tu alcance.
 */
const includeLegacy = ref(true)
/** Los élite solo salen con MT Élite o en eventos: mismo trato que los legacy. */
const includeElite = ref(true)

/**
 * La selección va en la URL (en inglés, como las rutas): al ir a una ficha y
 * volver, el Top sale igual. «Incluir» se guarda como lo que se quita
 * (?without=legacy,elite), que es lo raro.
 */
const excluidos = computed({
  get: () => [
    !includeMega.value && 'mega',
    !includeShadow.value && 'shadow',
    !includeLegacy.value && 'legacy',
    !includeElite.value && 'elite'
  ].filter(Boolean),
  set: (quitados) => {
    includeMega.value = !quitados.includes('mega')
    includeShadow.value = !quitados.includes('shadow')
    includeLegacy.value = !quitados.includes('legacy')
    includeElite.value = !quitados.includes('elite')
  }
})
useFiltrosEnUrl({
  mode: { valor: mode, defecto: 'pve', leer: entre(['pve', 'max', 'pvp']) },
  kind: { valor: type, defecto: 'all', leer: (texto) => (/^[a-z]+$/.test(texto) ? texto : undefined) },
  sort: { valor: sortBy, defecto: 'dps', leer: entre(['dps', 'tdo', 'er']) },
  league: { valor: league, defecto: 'great', leer: entre(['great', 'ultra', 'master']) },
  without: { valor: excluidos, defecto: [], ...lista(['mega', 'shadow', 'legacy', 'elite']) }
})

// Dinamax va justo detrás de incursiones: las dos son PvE, y el PvP es lo
// que se sale del grupo.
const modeOptions = computed(() => [
  { value: 'pve', label: t('top.pve') },
  { value: 'max', label: t('max.tabTitle') },
  { value: 'pvp', label: t('top.pvp') }
])

const typeOptions = computed(() => [
  { value: 'all', label: t('common.all') },
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
        name: entry.name,
        nameEs: entry.nameEs,
        types: entry.types,
        moves: [info?.gmaxMove, info?.maxMove].filter(Boolean).map((movimiento) => ({
          id: movimiento.id,
          name: movimiento.name,
          nameEs: movimiento.nameEs,
          type: movimiento.type
        })),
        value: entry.stats?.atk ?? 0
      }
    })
})

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
      name: row.name,
      nameEs: row.nameEs,
      types: row.types,
      // Sin el movimiento en moves.json queda el id, que es mejor que nada.
      moves: (row.moveset ?? []).map((id) => ({
        id,
        name: gameData.moves[id]?.name ?? id,
        nameEs: gameData.moves[id]?.nameEs ?? id,
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
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ $t('nav.top') }}</h1>

    <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
      {{ mode === 'max' ? $t('max.tabIntro') : mode === 'pve' ? $t('top.pveIntro') : $t('top.pvpIntro') }}
    </p>

    <!--
      Desde xl (1280 px), los filtros van en una barra lateral que se queda
      fija al hacer scroll (si la pantalla tiene altura para ella) y el ranking
      en tabla a su derecha. Sin overflow propio: si recortara, las opciones de
      los desplegables quedarían encerradas dentro de la barra. Por debajo, todo
      en una columna, filtros arriba y lista de tarjetas.
    -->
    <div :class="ancho ? 'grid grid-cols-[280px_minmax(0,1fr)] gap-6 items-start' : ''">
      <aside
        :class="ancho
          ? '[@media(min-height:720px)]:sticky top-[104px] flex flex-col gap-4 p-4 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900'
          : ''"
      >
        <div :class="ancho ? 'flex flex-col gap-3' : 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 mb-3'">
          <base-filter-select v-model="mode" :label="$t('top.mode')" :options="modeOptions" />
          <base-filter-select v-model="type" buscable :label="$t('top.type')" :options="typeOptions" />
          <!--
            En la tabla también se ordena pulsando las cabeceras; los dos van a
            la par. Lo que significa cada orden va justo debajo del selector.
          -->
          <div v-if="mode === 'pve'" class="min-w-0">
            <base-filter-select
              v-model="sortBy"
              :label="$t('top.sortBy')"
              :options="sortOptions"
            />
            <p class="mt-1.5 text-mini text-gray-600 dark:text-gray-300">{{ sortHelp }}</p>
          </div>
          <base-filter-select
            v-else-if="mode === 'pvp'"
            v-model="league"
            :label="$t('top.league')"
            :options="leagueOptions"
          />
        </div>

        <!--
          Mismo trato que los selectores: etiqueta encima y botones del mismo
          alto repartidos en rejilla.
        -->
        <div v-if="mode === 'pve'" :class="ancho ? '' : 'mb-3'">
          <span
            id="incluir-top"
            class="block mb-1 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300"
          >{{ $t('top.include') }}</span>

          <div
            role="group"
            aria-labelledby="incluir-top"
            class="grid gap-2"
            :class="ancho ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'"
          >
            <base-pill-button
              :class="boton"
              :active="includeMega"
              @click="includeMega = !includeMega"
            >
              {{ $t('top.megas') }}
            </base-pill-button>
            <base-pill-button
              :class="boton"
              :active="includeShadow"
              @click="includeShadow = !includeShadow"
            >
              {{ $t('top.shadows') }}
            </base-pill-button>
            <base-pill-button
              :class="boton"
              :active="includeLegacy"
              :title="$t('top.legacyHelp')"
              @click="includeLegacy = !includeLegacy"
            >
              {{ $t('moves.legacy') }}
            </base-pill-button>
            <base-pill-button
              :class="boton"
              :active="includeElite"
              :title="$t('top.eliteHelp')"
              @click="includeElite = !includeElite"
            >
              {{ $t('moves.elite') }}
            </base-pill-button>
          </div>
        </div>

        <move-legend
          v-if="origenes.elite || origenes.legacy || origenes.mega"
          :class="ancho ? '' : 'mb-3'"
          :elite="origenes.elite"
          :legacy="origenes.legacy"
          :mega="origenes.mega"
        />

        <top-calculo v-if="ancho && mode === 'pve'" class="pt-3 border-t border-gray-300 dark:border-gray-700" />
      </aside>

      <div class="min-w-0">
        <!-- Filas con la forma de las de verdad: sprite, nombre, ataques y métrica. -->
        <skeleton-loader v-if="gameData.status === 'loading' || gameData.status === 'idle'">
          <div class="flex flex-col gap-2">
            <div
              v-for="n in 8"
              :key="n"
              class="flex items-center gap-3 p-2 pr-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
            >
              <span class="w-6 shrink-0 flex justify-end"><span class="esqueleto h-3 w-3 rounded-full"></span></span>
              <span class="w-12 h-12 shrink-0 flex items-center justify-center"><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span></span>
              <span class="flex-1 min-w-0 flex flex-col gap-2">
                <span class="esqueleto h-3.5 w-2/5 rounded-full"></span>
                <span class="flex gap-1.5">
                  <span class="esqueleto h-5 w-20 rounded-full"></span>
                  <span class="esqueleto h-5 w-24 rounded-full"></span>
                </span>
              </span>
              <span class="w-[72px] shrink-0 flex flex-col items-end gap-1.5">
                <span class="esqueleto h-4 w-14 rounded-full"></span>
                <span class="esqueleto h-1 w-full rounded-full"></span>
                <span class="esqueleto h-3 w-10 rounded-full"></span>
              </span>
            </div>
          </div>
        </skeleton-loader>

        <base-error-message
          v-else-if="gameData.status === 'error'"
          :message="$t('common.error')"
          :detail="gameData.error"
        />

        <!-- Escritorio ancho: una tabla para los tres modos. -->
        <attacker-table
          v-else-if="ancho && rowsShown"
          v-model:sort-by="sortBy"
          :rows="filasVisibles"
          :mode="mode"
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

        <top-calculo v-if="!ancho && mode === 'pve'" class="mt-6" />
      </div>
    </div>
  </section>
</template>
