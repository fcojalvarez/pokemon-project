<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
import StabBadge from '../components/base/StabBadge.vue'
import { POTENCIA_MAX, mejorRapido, pesoAtaqueMax } from '../utils/maxBattle'
import BaseChevron from '../components/base/BaseChevron.vue'
import { useMedia } from '../composables/useMedia'
import { entre, lista, useFiltrosEnUrl } from '../composables/useFiltrosEnUrl'
import { useTranslate } from '../composables/useTranslate'
import { gigamaxSpriteId } from '../utils/gigamax'

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
 * En Dinamax, los legendarios (y míticos) solo salen en combates Max de
 * cinco estrellas y en fechas contadas: apagándolo queda lo que se puede
 * conseguir cualquier día en un nodo energético.
 */
const includeLegendary = ref(true)

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
    !includeElite.value && 'elite',
    !includeLegendary.value && 'legendary'
  ].filter(Boolean),
  set: (quitados) => {
    includeMega.value = !quitados.includes('mega')
    includeShadow.value = !quitados.includes('shadow')
    includeLegacy.value = !quitados.includes('legacy')
    includeElite.value = !quitados.includes('elite')
    includeLegendary.value = !quitados.includes('legendary')
  }
})
useFiltrosEnUrl({
  mode: { valor: mode, defecto: 'pve', leer: entre(['pve', 'max', 'pvp']) },
  kind: { valor: type, defecto: 'all', leer: (texto) => (/^[a-z]+$/.test(texto) ? texto : undefined) },
  sort: { valor: sortBy, defecto: 'dps', leer: entre(['dps', 'tdo', 'er']) },
  league: { valor: league, defecto: 'great', leer: entre(['great', 'ultra', 'master']) },
  without: { valor: excluidos, defecto: [], ...lista(['mega', 'shadow', 'legacy', 'elite', 'legendary']) }
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

/**
 * En móvil los filtros van plegados, como en la Pokédex: abiertos se comían
 * la primera pantalla entera (tres desplegables y cuatro botones, unos 740 px)
 * antes del primer atacante. Cerrados queda una línea con lo elegido.
 */
const movil = useMedia('(max-width: 639px)')
const filtrosAbiertos = ref(false)

const etiqueta = (opciones, valor) => opciones.find((opcion) => opcion.value === valor)?.label ?? valor

const resumenFiltros = computed(() => {
  const partes = [etiqueta(modeOptions.value, mode.value), etiqueta(typeOptions.value, type.value)]
  if (mode.value === 'pve') {
    // La sigla: «Daño por segundo (DPS)» entero no cabe en la línea.
    partes.push(sortBy.value.toUpperCase())
    const quitados = [
      !includeMega.value && t('top.megas'),
      !includeShadow.value && t('top.shadows'),
      !includeLegacy.value && t('moves.legacy'),
      !includeElite.value && t('moves.elite')
    ].filter(Boolean)
    if (quitados.length) partes.push(t('top.without', { list: quitados.join(', ') }))
  } else if (mode.value === 'max') {
    if (!includeLegendary.value) partes.push(t('top.without', { list: t('top.legendaries') }))
  } else if (mode.value === 'pvp') {
    partes.push(t(`top.${league.value}`))
  }
  return partes.join(' · ')
})

/** Cuántos filtros no están como vienen, para el contador del botón. */
const filtrosCambiados = computed(
  () =>
    (type.value !== 'all' ? 1 : 0) +
    (mode.value === 'pve' && sortBy.value !== 'dps' ? 1 : 0) +
    (mode.value === 'pvp' && league.value !== 'great' ? 1 : 0) +
    (mode.value === 'pve' ? excluidos.value.filter((quitado) => quitado !== 'legendary').length : 0) +
    (mode.value === 'max' && !includeLegendary.value ? 1 : 0)
)

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
 * Top de Dinamax, ordenado por ataque base.
 *
 * Aquí no se puede calcular un DPS como en el PvE: los ataques Max no publican
 * potencia, el daño lo resuelve el cliente del juego a partir del nivel del
 * movimiento. Lo que sí se sabe es el tipo: el Ataque Max de un Dinamax es del
 * tipo de su ataque RÁPIDO, y todos los de un tipo son el mismo ataque. Así
 * que dentro de un tipo la potencia se cancela y queda el ataque base, con el
 * STAB (×1,2 si el Pokémon es de ese tipo).
 *
 * Con un tipo elegido salen todos los que pueden sacar ese Ataque Max, sean o
 * no de ese tipo, con los rápidos que llevan a él. Con «Todos», por ataque
 * base, con todos sus Ataques Max: sin tipo no se comparan ataques distintos.
 *
 * Dinamax y Gigamax van en filas distintas, cada una con su marca: son
 * Pokémon distintos en el juego (hay especies que solo han salido en una de
 * las dos, y otras en las dos), y el Gigamax pega con su ataque propio, fijo,
 * sea cual sea su rápido. Por eso en su fila va el mejor rápido (el que antes
 * llena el medidor).
 *
 * Cada fila lleva, bajo el nombre, su Ataque Max (o su ataque Gigamax) y
 * debajo los rápidos con los que se saca. Con «Todos», una línea así por cada
 * Ataque Max que tenga.
 */
const chipRapido = (movimiento) => ({ id: movimiento.id, name: movimiento.name, nameEs: movimiento.nameEs, type: movimiento.type })

/**
 * Una línea de la fila: el Ataque Max y los rápidos que lo dan. Con un ataque
 * fijo (Gigamax o exclusivo), el mejor rápido para llenar el medidor.
 */
const lineaMax = (opcion, entry) => ({
  max: opcion.max,
  gigamax: opcion.gigamax,
  rapidos: opcion.gigamax || opcion.exclusivo
    ? [mejorRapido(entry, gameData.moves)].filter(Boolean).map(chipRapido)
    : opcion.rapidos.map(chipRapido)
})

const maxRows = computed(() => {
  if (!gameData.isReady || mode.value !== 'max') return []

  const vistos = new Set()
  const filas = []
  for (const entry of gameData.roster) {
    if (!entry.dynamax && !entry.gigantamax) continue
    if (!includeLegendary.value && (entry.legendary || entry.mythical)) continue
    const opciones = gameData.maxInfoFor(entry)?.opciones ?? []
    // Una fila por cada Ataque Max que pueda usar: cada uno pega distinto (el
    // STAB y la potencia cambian), así que con «Todos» se ve de verdad en qué
    // puesto queda Alakazam con Maxionda y en cuál con Maxipuño.
    for (const opcion of opciones) {
      if (type.value !== 'all' && opcion.max.type !== type.value) continue
      const version = opcion.gigamax ? 'gigantamax' : 'dynamax'
      // Los Pikachu con gorro comparten stats con el normal: una fila basta.
      const clave = `${entry.dex}-${version}-${opcion.max.id}`
      if (vistos.has(clave)) continue
      vistos.add(clave)
      filas.push({
        entry,
        version,
        maxId: opcion.max.id,
        maxLines: [lineaMax(opcion, entry)],
        stab: opcion.stab,
        // Potencia × ataque × STAB, en la escala del ataque: el de un Dinamax
        // sin STAB (base + 15 de IV). Un Gigamax pega 450 en vez de 350.
        value: pesoAtaqueMax(entry, opcion) / POTENCIA_MAX
      })
    }
  }

  return filas
    .sort((a, b) => b.value - a.value)
    .slice(0, 50)
    .map(({ entry, version, maxId, maxLines, stab, value }, indice) => ({
      id: `${entry.id}-${maxId}`,
      version,
      maxLines,
      rank: indice + 1,
      dex: entry.dex,
      // La fila Gigamax, con su sprite gigamaxizado.
      spriteId: version === 'gigantamax' ? gigamaxSpriteId(entry.spriteId) : entry.spriteId,
      name: entry.name,
      nameEs: entry.nameEs,
      types: entry.types,
      moves: [],
      stab,
      value
    }))
})

/** Qué marcas explica la leyenda del pie: solo las que salen en la lista. */
const leyendaMax = computed(() => ({
  stab: maxRows.value.some((fila) => fila.stab),
  gigantamax: maxRows.value.some((fila) => fila.version === 'gigantamax')
}))

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
      // Para el halo morado del oscuro, como en el PvE.
      shadow: Boolean(entry?.shadow),
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

// Los rankings PvP se piden aparte, la primera vez que se entra en ese modo.
const esperandoPvp = computed(() => mode.value === 'pvp' && gameData.isReady && !gameData.pvpListo)
watch(esperandoPvp, (esperando) => { if (esperando) gameData.cargarPvp() }, { immediate: true })
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">{{ $t('nav.top') }}</h1>

    <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3">
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
        <!-- Móvil: una línea con lo elegido y el botón que abre los filtros. -->
        <div v-if="movil" class="flex items-center gap-3 mb-3">
          <p class="flex-1 min-w-0 text-mini text-gray-600 dark:text-gray-300 truncate" :title="resumenFiltros">
            {{ resumenFiltros }}
          </p>
          <button
            type="button"
            class="zona-tactil [--zona:-8px_-3px] shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border border-gray-400 shadow-md transition-colors bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800"
            :aria-expanded="filtrosAbiertos"
            aria-controls="filtros-top"
            @click="filtrosAbiertos = !filtrosAbiertos"
          >
            {{ $t('filters.title') }}
            <span
              v-if="filtrosCambiados"
              class="px-1.5 rounded-full bg-gray-600 dark:bg-gray-500 text-white text-mini"
            >{{ filtrosCambiados }}</span>
            <base-chevron :open="filtrosAbiertos" />
          </button>
        </div>

        <div
          v-show="!movil || filtrosAbiertos"
          id="filtros-top"
          :class="ancho ? 'contents' : movil ? 'mb-3 p-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900' : ''"
        >
        <div :class="ancho ? 'flex flex-col gap-3' : 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 mb-3'">
          <base-filter-select v-model="mode" :label="$t('top.mode')" :options="modeOptions" />
          <base-filter-select v-model="type" buscable :label="$t('top.type')" :options="typeOptions" />
          <!--
            En la tabla también se ordena pulsando las cabeceras; los dos van a
            la par. Lo que significa cada orden va justo debajo del selector.
          -->
          <!-- A dos columnas va solo en su fila: a media anchura se cortaba («Daño por segundo (…»). -->
          <div v-if="mode === 'pve'" class="min-w-0 xs:col-span-2 sm:col-span-1">
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

        <!-- En Dinamax solo hay un «Incluir»: los legendarios. -->
        <div v-else-if="mode === 'max'" :class="ancho ? '' : 'mb-3'">
          <span
            id="incluir-top-max"
            class="block mb-1 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300"
          >{{ $t('top.include') }}</span>
          <div
            role="group"
            aria-labelledby="incluir-top-max"
            class="grid gap-2"
            :class="ancho ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'"
          >
            <base-pill-button
              :class="boton"
              :active="includeLegendary"
              :title="$t('top.legendaryHelp')"
              @click="includeLegendary = !includeLegendary"
            >
              {{ $t('top.legendaries') }}
            </base-pill-button>
          </div>
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
        <skeleton-loader v-if="gameData.status === 'loading' || gameData.status === 'idle' || (esperandoPvp && gameData.estadoAparte.pvp !== 'error')">
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
          v-else-if="gameData.status === 'error' || (esperandoPvp && gameData.estadoAparte.pvp === 'error')"
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
          Dinamax: la métrica es el ataque base (con el STAB, si hay tipo) y los
          movimientos, los rápidos que dan el Ataque Max (o todos, con «Todos»).
        -->
        <attacker-list
          v-else-if="mode === 'max'"
          :rows="maxRows"
          sort-by="value"
          :unit="$t('max.damageUnit')"
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

        <!-- Cómo se calcula el top Max: debajo de la lista, encima de la leyenda. -->
        <top-calculo v-if="gameData.isReady && mode === 'max' && rowsShown" modo="max" class="mt-3" />

        <!-- Leyenda del Max: solo lo que sale en la lista. -->
        <div
          v-if="gameData.isReady && mode === 'max' && rowsShown"
          class="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700 text-mini text-gray-600 dark:text-gray-300"
        >
        <p id="leyenda-max" class="mb-1.5 text-xs font-semibold text-gray-800 dark:text-gray-100">{{ $t('legend.title') }}:</p>
        <!-- Un significado por fila. -->
        <ul aria-labelledby="leyenda-max" class="flex flex-col gap-1.5">
          <li v-if="leyendaMax.stab" class="flex items-center gap-1.5">
            <stab-badge />
            {{ $t('max.stabLegend') }}
          </li>
          <!-- Sin marca junto al nombre: el Gigamax se reconoce por su borde, su ataque y su sprite. -->
          <li v-if="leyendaMax.gigantamax" class="flex items-center gap-1.5">
            <span class="w-5 h-3.5 shrink-0 rounded border-2 border-fuchsia-500 dark:border-fuchsia-400" aria-hidden="true"></span>
            {{ $t('max.gmaxBorderLegend') }}
          </li>
        </ul>
        </div>

        <base-empty-state
          v-if="gameData.isReady && !rowsShown"
          :message="mode === 'max' && type !== 'all' ? $t('max.noneOfType') : $t('common.empty')"
        />

        <top-calculo v-if="!ancho && mode === 'pve'" class="mt-6" />
      </div>
    </div>
  </section>
</template>
