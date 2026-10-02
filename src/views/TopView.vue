<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useGameDataStore } from '../stores/gameData'
import BaseEmptyState from '../components/base/BaseEmptyState.vue'
import BaseErrorMessage from '../components/base/BaseErrorMessage.vue'
import BaseDropdown from '../components/base/BaseDropdown.vue'
import BasePillButton from '../components/base/BasePillButton.vue'
import BaseSidebar from '../components/base/BaseSidebar.vue'
import SkeletonLoader from '../components/base/SkeletonLoader.vue'
import AttackerList from '../components/rankings/AttackerList.vue'
import AttackerTable from '../components/rankings/AttackerTable.vue'
import TopCalculo from '../components/rankings/TopCalculo.vue'
import MoveLegend from '../components/pokemon/MoveLegend.vue'
import StabBadge from '../components/base/StabBadge.vue'
import BaseChevron from '../components/base/BaseChevron.vue'
import { useMedia } from '../composables/useMedia'
import { entre, lista, useFiltrosEnUrl } from '../composables/useFiltrosEnUrl'
import { useTranslate } from '../composables/useTranslate'
import { useTopFilas } from '../composables/useTopFilas'

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
 * Los botones de «Incluir» de cada modo. En Dinamax solo hay uno, los
 * legendarios; en PvP, ninguno.
 */
const incluir = computed(() => {
  if (mode.value === 'pve') {
    return [
      { clave: 'mega', valor: includeMega, texto: 'top.megas' },
      { clave: 'shadow', valor: includeShadow, texto: 'top.shadows' },
      { clave: 'legacy', valor: includeLegacy, texto: 'moves.legacy', ayuda: 'top.legacyHelp' },
      { clave: 'elite', valor: includeElite, texto: 'moves.elite', ayuda: 'top.eliteHelp' }
    ]
  }
  if (mode.value === 'max')
    return [
      {
        clave: 'legendary',
        valor: includeLegendary,
        texto: 'top.legendaries',
        ayuda: 'top.legendaryHelp'
      }
    ]
  return []
})

/**
 * La selección va en la URL (en inglés, como las rutas): al ir a una ficha y
 * volver, el Top sale igual. «Incluir» se guarda como lo que se quita
 * (?without=legacy,elite), que es lo raro.
 */
const excluidos = computed({
  get: () =>
    [
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
  kind: {
    valor: type,
    defecto: 'all',
    leer: (texto) => (/^[a-z]+$/.test(texto) ? texto : undefined)
  },
  sort: { valor: sortBy, defecto: 'dps', leer: entre(['dps', 'tdo', 'er']) },
  league: { valor: league, defecto: 'great', leer: entre(['great', 'ultra', 'master']) },
  without: {
    valor: excluidos,
    defecto: [],
    ...lista(['mega', 'shadow', 'legacy', 'elite', 'legendary'])
  }
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

const etiqueta = (opciones, valor) =>
  opciones.find((opcion) => opcion.value === valor)?.label ?? valor

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
    (mode.value === 'pve'
      ? excluidos.value.filter((quitado) => quitado !== 'legendary').length
      : 0) +
    (mode.value === 'max' && !includeLegendary.value ? 1 : 0)
)

const { pveRows, pvpRows, maxRows, filasVisibles, origenes, leyendaMax } = useTopFilas({
  mode,
  type,
  sortBy,
  league,
  includeMega,
  includeShadow,
  includeLegacy,
  includeElite,
  includeLegendary
})

/** Si la pestaña activa tiene algo que pintar; si no, sale el vacío. */
const rowsShown = computed(() => filasVisibles.value.length)

onMounted(() => gameData.load())

// Los rankings PvP se piden aparte, la primera vez que se entra en ese modo.
const esperandoPvp = computed(() => mode.value === 'pvp' && gameData.isReady && !gameData.pvpListo)
watch(
  esperandoPvp,
  (esperando) => {
    if (esperando) gameData.cargarPvp()
  },
  { immediate: true }
)
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
      {{ $t('nav.top') }}
    </h1>

    <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3">
      {{
        mode === 'max'
          ? $t('max.tabIntro')
          : mode === 'pve'
          ? $t('top.pveIntro')
          : $t('top.pvpIntro')
      }}
    </p>

    <!--
      Desde xl (1280 px), los filtros van en una barra lateral que se queda
      fija al hacer scroll (si la pantalla tiene altura para ella) y el ranking
      en tabla a su derecha. Sin overflow propio: si recortara, las opciones de
      los desplegables quedarían encerradas dentro de la barra. Por debajo, todo
      en una columna, filtros arriba y lista de tarjetas.
    -->
    <div :class="ancho ? 'grid grid-cols-[280px_minmax(0,1fr)] gap-6 items-start' : ''">
      <base-sidebar :activa="ancho">
        <!-- Móvil: una línea con lo elegido y el botón que abre los filtros. -->
        <div v-if="movil" class="flex items-center gap-3 mb-3">
          <p
            class="flex-1 min-w-0 text-mini text-gray-600 dark:text-gray-300 truncate"
            :title="resumenFiltros"
          >
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
              >{{ filtrosCambiados }}</span
            >
            <base-chevron :open="filtrosAbiertos" />
          </button>
        </div>

        <div
          v-show="!movil || filtrosAbiertos"
          id="filtros-top"
          :class="
            ancho
              ? 'contents'
              : movil
              ? 'mb-3 p-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900'
              : ''
          "
        >
          <div
            :class="
              ancho
                ? 'flex flex-col gap-3'
                : 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 mb-3'
            "
          >
            <base-dropdown v-model="mode" :label="$t('top.mode')" :options="modeOptions" />
            <base-dropdown v-model="type" buscable :label="$t('top.type')" :options="typeOptions" />
            <!--
            En la tabla también se ordena pulsando las cabeceras; los dos van a
            la par. Lo que significa cada orden va justo debajo del selector.
          -->
            <!-- A dos columnas va solo en su fila: a media anchura se cortaba («Daño por segundo (…»). -->
            <div v-if="mode === 'pve'" class="min-w-0 xs:col-span-2 sm:col-span-1">
              <base-dropdown v-model="sortBy" :label="$t('top.sortBy')" :options="sortOptions" />
              <p class="mt-1.5 text-mini text-gray-600 dark:text-gray-300">{{ sortHelp }}</p>
            </div>
            <base-dropdown
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
          <div v-if="incluir.length" :class="ancho ? '' : 'mb-3'">
            <span
              id="incluir-top"
              class="block mb-1 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300"
              >{{ $t('top.include') }}</span
            >

            <div
              role="group"
              aria-labelledby="incluir-top"
              class="grid gap-2"
              :class="ancho ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'"
            >
              <base-pill-button
                v-for="opcion in incluir"
                :key="opcion.clave"
                :class="boton"
                casilla
                :active="opcion.valor.value"
                :title="opcion.ayuda ? $t(opcion.ayuda) : undefined"
                @click="opcion.valor.value = !opcion.valor.value"
              >
                {{ $t(opcion.texto) }}
              </base-pill-button>
            </div>
          </div>
        </div>

        <move-legend :class="ancho ? '' : 'mb-3'" v-bind="origenes" />

        <top-calculo
          v-if="ancho && mode === 'pve'"
          class="pt-3 border-t border-gray-300 dark:border-gray-700"
        />
      </base-sidebar>

      <div class="min-w-0">
        <!-- Filas con la forma de las de verdad: sprite, nombre, ataques y métrica. -->
        <skeleton-loader
          v-if="
            gameData.status === 'loading' ||
            gameData.status === 'idle' ||
            (esperandoPvp && gameData.estadoAparte.pvp !== 'error')
          "
        >
          <div class="flex flex-col gap-2">
            <div
              v-for="n in 8"
              :key="n"
              class="flex items-center gap-3 p-2 pr-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
            >
              <span class="w-6 shrink-0 flex justify-end"
                ><span class="esqueleto h-3 w-3 rounded-full"></span
              ></span>
              <span class="w-12 h-12 shrink-0 flex items-center justify-center"
                ><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span
              ></span>
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
          v-else-if="
            gameData.status === 'error' || (esperandoPvp && gameData.estadoAparte.pvp === 'error')
          "
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
          :rows="pvpRows"
          sort-by="score"
          unit=""
          :show-bar="false"
          :show-secondary="false"
        />

        <!-- Cómo se calcula el top Max: debajo de la lista, encima de la leyenda. -->
        <top-calculo
          v-if="gameData.isReady && mode === 'max' && rowsShown"
          modo="max"
          class="mt-3"
        />

        <!-- Leyenda del Max: solo lo que sale en la lista. -->
        <div
          v-if="gameData.isReady && mode === 'max' && rowsShown"
          class="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700 text-mini text-gray-600 dark:text-gray-300"
        >
          <p id="leyenda-max" class="mb-1.5 text-xs font-semibold text-gray-800 dark:text-gray-100">
            {{ $t('legend.title') }}:
          </p>
          <!-- Un significado por fila. -->
          <ul aria-labelledby="leyenda-max" class="flex flex-col gap-1.5">
            <li v-if="leyendaMax.stab" class="flex items-center gap-1.5">
              <stab-badge />
              {{ $t('max.stabLegend') }}
            </li>
            <!-- Sin marca junto al nombre: el Gigamax se reconoce por su borde, su ataque y su sprite. -->
            <li v-if="leyendaMax.gigantamax" class="flex items-center gap-1.5">
              <span
                class="w-5 h-3.5 shrink-0 rounded border-2 border-fuchsia-500 dark:border-fuchsia-400"
                aria-hidden="true"
              ></span>
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
