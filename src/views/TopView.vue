<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useGameDataStore } from '../stores/gameData'
import BaseEmptyState from '../components/base/BaseEmptyState.vue'
import BaseErrorMessage from '../components/base/BaseErrorMessage.vue'
import BaseDropdown from '../components/base/BaseDropdown.vue'
import BaseSidebar from '../components/base/BaseSidebar.vue'
import SkeletonLoader from '../components/base/SkeletonLoader.vue'
import AttackerList from '../components/rankings/AttackerList.vue'
import AttackerTable from '../components/rankings/AttackerTable.vue'
import TopCalculo from '../components/rankings/TopCalculo.vue'
import MoveLegend from '../components/pokemon/MoveLegend.vue'
import StabBadge from '../components/base/StabBadge.vue'
import IconoPapel from '../components/base/IconoPapel.vue'
import BaseChevron from '../components/base/BaseChevron.vue'
import BaseSegmented from '../components/base/BaseSegmented.vue'
import { useMedia } from '../composables/useMedia'
import { entre, lista, useFiltrosEnUrl } from '../composables/useFiltrosEnUrl'
import { useTranslate } from '../composables/useTranslate'
import { useTopFilas } from '../composables/useTopFilas'

const gameData = useGameDataStore()
const { t } = useTranslate()

const mode = ref('pve')
const type = ref('all')

/** Los papeles de las tres letras del Top Max, en el orden de la fila. */
const PAPELES = ['atacante', 'tanque', 'sanador']

/**
 * La letra de cada puesto: en PvE, PvP y Gimnasio (el Max lleva sus tres
 * letras de papel). La lista de un tipo de PvE es más corta y lleva cortes
 * más cortos; en PvP y Gimnasio filtrar por tipo no cambia el puesto.
 */
const nivel = computed(() =>
  mode.value === 'max' ? '' : mode.value === 'pve' && type.value !== 'all' ? 'tipo' : 'general'
)
const sortBy = ref('dps')
const league = ref('great')
// Desde xl, barra lateral fija con los filtros y el ranking en tabla.
const ancho = useMedia('(min-width: 1280px)')
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
  // Gimnasio: los oscuros y las megas no defienden, así que solo los ataques.
  if (mode.value === 'gym')
    return [
      { clave: 'legacy', valor: includeLegacy, texto: 'moves.legacy', ayuda: 'top.legacyHelp' },
      { clave: 'elite', valor: includeElite, texto: 'moves.elite', ayuda: 'top.eliteHelp' }
    ]
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
  mode: { valor: mode, defecto: 'pve', leer: entre(['pve', 'max', 'gym', 'pvp']) },
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

const typeOptions = computed(() => [
  { value: 'all', label: t('common.all') },
  ...gameData.types.map((type) => ({ value: type, label: t(`types.${type}`) }))
])

/**
 * Qué significa cada orden va dentro del desplegable, bajo cada opción: es
 * cuando se está eligiendo. Debajo del selector lo descuadraba frente a Tipo
 * e Incluir.
 */
const sortOptions = computed(() =>
  ['dps', 'tdo', 'er'].map((valor) => ({
    value: valor,
    label: t(`top.${valor}`),
    description: t(`top.${valor}Help`)
  }))
)

/**
 * En móvil los filtros van plegados, como en la Pokédex: abiertos se comían
 * la primera pantalla entera (tres desplegables y cuatro botones, unos 740 px)
 * antes del primer atacante. Cerrados queda una línea con lo elegido.
 */
const movil = useMedia('(max-width: 639px)')
const filtrosAbiertos = ref(false)

const etiqueta = (opciones, valor) =>
  opciones.find((opcion) => opcion.value === valor)?.label ?? valor

/**
 * Arriba, a la vista, solo PvE o PvP. Dentro de los filtros, lo primero es su
 * variante: Incursiones, Max o Gimnasio con PvE, la liga con PvP. Antes eran
 * cinco botones al mismo nivel que mezclaban las dos cosas. Al volver a PvE
 * se vuelve a lo último que había; la liga ya se recuerda.
 */
const ultimoPve = ref(mode.value === 'pvp' ? 'pve' : mode.value)
watch(mode, (nuevo) => {
  if (nuevo !== 'pvp') ultimoPve.value = nuevo
})
const familia = computed({
  get: () => (mode.value === 'pvp' ? 'pvp' : 'pve'),
  set: (valor) => {
    mode.value = valor === 'pvp' ? 'pvp' : ultimoPve.value
  }
})
const familiaOptions = computed(() => [
  { value: 'pve', label: t('top.short.pve') },
  { value: 'pvp', label: t('top.short.pvp') }
])
const pveKindOptions = computed(() => [
  { value: 'pve', label: t('top.raids') },
  { value: 'max', label: t('top.short.max') },
  { value: 'gym', label: t('top.short.gym') }
])
const leagueOptions = computed(() =>
  ['great', 'ultra', 'master'].map((liga) => ({ value: liga, label: t(`top.${liga}`) }))
)

/**
 * «Incluir» como desplegable de varias: la lista de lo marcado. Cada opción
 * lleva al lado qué es («Ataques que ya no se aprenden»), que antes iba en un
 * title que en el móvil no se veía.
 */
const incluirOptions = computed(() =>
  incluir.value.map((opcion) => ({
    value: opcion.clave,
    label: t(opcion.texto),
    description: t(`top.includeHelp.${opcion.clave}`)
  }))
)
const incluidos = computed({
  get: () => incluir.value.filter((opcion) => opcion.valor.value).map((opcion) => opcion.clave),
  set: (lista) => {
    for (const opcion of incluir.value) opcion.valor.value = lista.includes(opcion.clave)
  }
})

/** Lo que hay en los filtros, en una línea: primero la variante (Incursiones, Max o la liga). */
const resumenFiltros = computed(() => {
  const variante =
    mode.value === 'pvp'
      ? etiqueta(leagueOptions.value, league.value)
      : etiqueta(pveKindOptions.value, mode.value)
  const partes = [variante, etiqueta(typeOptions.value, type.value)]
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
  } else if (mode.value === 'gym') {
    const quitados = [
      !includeLegacy.value && t('moves.legacy'),
      !includeElite.value && t('moves.elite')
    ].filter(Boolean)
    if (quitados.length) partes.push(t('top.without', { list: quitados.join(', ') }))
  }
  return partes.join(' · ')
})

/**
 * Cuántos filtros no están como vienen, para el contador del botón. La
 * variante (Incursiones, Max, la liga) no cuenta: es qué ranking se ve, no
 * un filtro sobre él, y ya la dice el resumen.
 */
const filtrosCambiados = computed(
  () =>
    (type.value !== 'all' ? 1 : 0) +
    (mode.value === 'pve' && sortBy.value !== 'dps' ? 1 : 0) +
    (mode.value === 'pve'
      ? excluidos.value.filter((quitado) => quitado !== 'legendary').length
      : 0) +
    (mode.value === 'max' && !includeLegendary.value ? 1 : 0) +
    (mode.value === 'gym' ? [!includeLegacy.value, !includeElite.value].filter(Boolean).length : 0)
)

const { pveRows, pvpRows, maxRows, gymRows, filasVisibles, origenes, leyendaMax } = useTopFilas({
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

/** Mientras no hay ranking que enseñar: el esqueleto de la lista y el de la leyenda. */
const cargando = computed(
  () =>
    gameData.status === 'loading' ||
    gameData.status === 'idle' ||
    (esperandoPvp.value && gameData.estadoAparte.pvp !== 'error')
)
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

    <!--
      Siempre el alto de dos líneas en móvil: la de PvE ocupa dos y la de PvP
      una, y al cambiar de pestaña todo lo de debajo saltaba. Desde sm caben
      todas en una.
    -->
    <p class="min-h-[2lh] sm:min-h-0 text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3">
      {{
        mode === 'max'
          ? $t('max.tabIntro')
          : mode === 'gym'
          ? $t('top.gym.intro')
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
        <!-- PvE o PvP, siempre a la vista; en móvil, debajo, el resumen y el botón. -->
        <base-segmented
          v-model="familia"
          role="group"
          :aria-label="$t('top.mode')"
          :options="familiaOptions"
          :class="ancho ? '' : 'mb-2'"
        />
        <div v-if="movil" class="flex items-center gap-3 mb-3">
          <p
            class="flex-1 min-w-0 text-mini text-gray-600 dark:text-gray-300 truncate"
            :title="resumenFiltros"
          >
            {{ resumenFiltros }}
          </p>
          <button
            type="button"
            class="zona-tactil [--zona:-8px_-3px] shrink-0 boton gap-2"
            :aria-expanded="filtrosAbiertos"
            aria-controls="filtros-top"
            @click="filtrosAbiertos = !filtrosAbiertos"
          >
            {{ $t('filters.more') }}
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
          <!-- La variante, lo primero: Incursiones o Max, o la liga. -->
          <div :class="ancho ? '' : 'mb-3'">
            <span id="variante-top" class="rotulo block mb-1">{{
              $t(mode === 'pvp' ? 'top.league' : 'top.pveKind')
            }}</span>
            <base-segmented
              v-if="mode === 'pvp'"
              v-model="league"
              role="group"
              aria-labelledby="variante-top"
              :options="leagueOptions"
            />
            <base-segmented
              v-else
              v-model="mode"
              role="group"
              aria-labelledby="variante-top"
              :options="pveKindOptions"
            />
          </div>

          <div
            :class="
              ancho
                ? 'flex flex-col gap-3'
                : 'grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 mb-3'
            "
          >
            <base-dropdown v-model="type" buscable :label="$t('top.type')" :options="typeOptions" />
            <!-- En la tabla también se ordena pulsando las cabeceras; los dos van a la par. -->
            <base-dropdown
              v-if="mode === 'pve'"
              v-model="sortBy"
              :label="$t('top.sortBy')"
              :options="sortOptions"
            />
            <base-dropdown
              v-if="incluir.length"
              v-model="incluidos"
              multiple
              :label="$t('top.include')"
              :vacio="$t('top.includeNone')"
              :options="incluirOptions"
              :class="mode === 'pve' ? 'xs:col-span-2 sm:col-span-1' : ''"
            />
          </div>
        </div>

        <!--
          La leyenda sale con el ranking: mientras carga, su hueco, para que la
          lista no baje de golpe al llegar (empujaba todo 28 px).
        -->
        <div
          v-if="cargando"
          :class="ancho ? '' : 'mb-3'"
          class="h-4 flex items-center gap-3"
          aria-hidden="true"
        >
          <span v-for="n in 3" :key="n" class="esqueleto h-3 w-14 rounded-full"></span>
        </div>
        <move-legend v-else :class="ancho ? '' : 'mb-3'" v-bind="origenes" />

        <top-calculo
          v-if="ancho && mode === 'pve'"
          class="pt-3 border-t border-gray-300 dark:border-gray-700"
        />
      </base-sidebar>

      <div class="min-w-0">
        <!-- Filas con la forma de las de verdad: sprite, nombre, ataques y métrica. -->
        <skeleton-loader v-if="cargando">
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
          :nivel="nivel"
        />

        <!-- PvE -->
        <attacker-list
          v-else-if="mode === 'pve'"
          :rows="pveRows"
          :sort-by="sortBy"
          :nivel="nivel"
        />

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

        <!-- Gimnasio: la puntuación de defensor (0–100) y, debajo, sus PS y su defensa. -->
        <attacker-list
          v-else-if="mode === 'gym'"
          :rows="gymRows"
          sort-by="value"
          :unit="$t('top.gym.unit')"
          :nivel="nivel"
        />

        <!-- PvP: la misma lista, sin barra ni métrica de apoyo (no hay DPS aquí). -->
        <attacker-list
          v-else
          :rows="pvpRows"
          sort-by="score"
          unit=""
          :show-bar="false"
          :show-secondary="false"
          :nivel="nivel"
        />

        <!-- Cómo se calcula el top Max (y el de gimnasio): debajo de la lista. -->
        <top-calculo
          v-if="gameData.isReady && (mode === 'max' || mode === 'gym') && rowsShown"
          :modo="mode"
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
            <!-- Las tres letras de cada fila: un papel por línea, con su icono. -->
            <li v-for="papel in PAPELES" :key="papel" class="flex items-center gap-1.5">
              <icono-papel :papel="papel" class="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              {{ $t(`max.rolesLegend.${papel}`) }}
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
