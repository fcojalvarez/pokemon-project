<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLiveStore } from '../stores/live'
import { dexFromImage } from '../utils/liveFeed'
import { useGameDataStore } from '../stores/gameData'
import BaseEmptyState from '../components/base/BaseEmptyState.vue'
import BaseErrorMessage from '../components/base/BaseErrorMessage.vue'
import BasePillButton from '../components/base/BasePillButton.vue'
import BaseSidebar from '../components/base/BaseSidebar.vue'
import BaseFilterList from '../components/base/BaseFilterList.vue'
import BaseSegmented from '../components/base/BaseSegmented.vue'
import DataFreshness from '../components/shared/DataFreshness.vue'
import SkeletonLoader from '../components/base/SkeletonLoader.vue'
import MaxMark from '../components/pokemon/MaxMark.vue'
import RaidCountersPanel from '../components/raids/RaidCountersPanel.vue'
import MaxTeamPanel from '../components/raids/MaxTeamPanel.vue'
import CountersToggle from '../components/raids/CountersToggle.vue'
import RocketLineup from '../components/raids/RocketLineup.vue'
import { rocketPorGrupo } from '../utils/rocket'
import { gigamaxSpriteId } from '../utils/gigamax'
import { useMedia } from '../composables/useMedia'
import MarkLegend from '../components/pokemon/MarkLegend.vue'
import LiveMonCard from '../components/pokemon/LiveMonCard.vue'
import { spriteUrl } from '../utils/sprites'
import { maxCounters } from '../utils/maxBattle'
import { useTranslate } from '../composables/useTranslate'
import { entre, useFiltrosEnUrl } from '../composables/useFiltrosEnUrl'
import { formatDuration } from '../utils/time'
import { plainText } from '../utils/gameText'
import { vDifuminado } from '../composables/useDifuminado'

const live = useLiveStore()
const gameData = useGameDataStore()
// Antigüedad de los combates Max, con el reloj de `live` para que avance.
// Con el reloj de 30 s: el «hace X min» no necesita más, y con el de cada
// segundo la vista entera se volvía a pintar una vez por segundo.
const edadMax = computed(() => gameData.maxLiveEdad(live.statusClock))
const maxCaducado = computed(() => gameData.maxLiveCaducado(live.statusClock))
const route = useRoute()
const { t, te, locale, localName } = useTranslate()

const tab = ref('raids')

/**
 * Pokémon al que se llega señalado desde su ficha.
 *
 * La ficha dice «sale en incursiones» y hasta ahora había que venir aquí y
 * buscarlo a ojo entre cincuenta tarjetas. Ahora se abre la pestaña que toca y
 * se le pone un aro.
 *
 * El aro se quita solo: es para encontrarlo al llegar, no una marca
 * permanente que confunda al que siga navegando por la vista.
 */
const destacado = ref(null)
let temporizador = null

const senalar = (dex) => {
  clearTimeout(temporizador)
  // Que no se quede escondido tras un filtro.
  filtro.value = 'all'
  destacado.value = dex
  // Tras pintar, se lleva a la vista; el aro aguanta unos segundos.
  requestAnimationFrame(() => {
    document.getElementById(`mon-${dex}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
  temporizador = setTimeout(() => {
    destacado.value = null
  }, 6000)
}
const openBoss = ref(null)
/** Qué jefe Max tiene el equipo recomendado abierto. */
const openMax = ref(null)

const TABS = ['raids', 'eggs', 'research', 'rocket']

// La pestaña, en la URL (?tab=, la misma que usan los enlaces desde la ficha).
// El ?dex= con el que se llega señalando a un Pokémon es de un solo uso: al
// cambiar de pestaña se quita, para no volver a señalarlo.
/** Qué grupo de la pestaña se ve: 'all', o el id de uno (nivel, km, tipo de tarea). */
const filtro = ref('all')

// En la URL, para volver de una ficha con la misma pestaña y el mismo grupo.
// Antes del watch de abajo: si no, al leer la pestaña de la URL se borraría el
// grupo que también viene en ella.
useFiltrosEnUrl(
  {
    tab: { valor: tab, defecto: 'raids', leer: entre(TABS) },
    group: {
      valor: filtro,
      defecto: 'all',
      leer: (texto) => (/^[\w-]+$/.test(texto) ? texto : undefined)
    }
  },
  { quitar: ['dex'] }
)

// Cada pestaña tiene sus grupos: el elegido en otra no existe aquí.
watch(tab, () => {
  filtro.value = 'all'
})

/**
 * Como en el Top y en Eventos: en escritorio ancho, las pestañas van en una
 * barra lateral fija, y debajo los grupos de la pestaña con cuántos hay en
 * cada uno para quedarse solo con uno de un clic. Entre incursiones, oscuras y
 * combates Max la página pasaba de 2000 px. Por debajo, pestañas arriba y se
 * ve todo.
 */
const ancho = useMedia('(min-width: 1280px)')

const tabLabel = (name) => t(`raids.tab${name.charAt(0).toUpperCase()}${name.slice(1)}`)
/** Las pestañas, para el selector segmentado de móvil y tablet. */
const tabOptions = computed(() => TABS.map((name) => ({ value: name, label: tabLabel(name) })))

const slug = (texto) =>
  String(texto)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')

const idIncursion = (grupo) => `nivel-${slug(grupo.name)}`
const idMax = (grupo) => `max-${grupo.tier}`
const idHuevo = (grupo) => `huevos-${slug(grupo.name)}`
const idTarea = (grupo) => `tareas-${slug(grupo.type)}`
const idRocket = (grupo) => `rocket-${grupo.grupo}`

/** Las alineaciones del Team GO Rocket: Giovanni, los líderes y los reclutas. */
const rocketGrupos = computed(() =>
  rocketPorGrupo(live.rocket, (tipo) => (te(`types.${tipo}`) ? t(`types.${tipo}`) : tipo))
)
/** Qué alineación tiene los counters abiertos (por su nombre, que es único). */
const openRocket = ref(null)

/** Los grupos de la pestaña, con cuántos tiene cada uno, y «Todas» delante. */
const filtros = computed(() => {
  let grupos
  if (tab.value === 'raids') {
    grupos = [
      ...live.raidsByTier.map((grupo) => ({
        value: idIncursion(grupo),
        label: grupo.shadow ? t('raids.tiers.shadow') : tierLabel(grupo.name),
        count: grupo.list.length
      })),
      ...maxPorNivel.value.map((grupo) => ({
        value: idMax(grupo),
        label: `Max · ${t('max.tier', { n: grupo.tier })}`,
        count: grupo.list.length
      }))
    ]
  } else if (tab.value === 'eggs') {
    grupos = live.eggsByType.map((grupo) => ({
      value: idHuevo(grupo),
      label: grupo.name,
      count: grupo.list.length
    }))
  } else if (tab.value === 'rocket') {
    grupos = rocketGrupos.value.map((grupo) => ({
      value: idRocket(grupo),
      label: t(`raids.rocket.groups.${grupo.grupo}`),
      count: grupo.list.length
    }))
  } else {
    grupos = researchGroups.value.map((grupo) => ({
      value: idTarea(grupo),
      label: grupo.label,
      count: grupo.list.length
    }))
  }
  if (!grupos.length) return []
  const total = grupos.reduce((suma, grupo) => suma + grupo.count, 0)
  return [{ value: 'all', label: t(`raids.all.${tab.value}`), count: total }, ...grupos]
})

/** Sin barra lateral no hay filtro que tocar: se ve todo. */
const seVe = (id) => !ancho.value || filtro.value === 'all' || filtro.value === id

const incursionesVisibles = computed(() =>
  live.raidsByTier.filter((grupo) => seVe(idIncursion(grupo)))
)
const maxVisibles = computed(() => maxPorNivel.value.filter((grupo) => seVe(idMax(grupo))))
const huevosVisibles = computed(() => live.eggsByType.filter((grupo) => seVe(idHuevo(grupo))))
const tareasVisibles = computed(() => researchGroups.value.filter((grupo) => seVe(idTarea(grupo))))
const rocketVisibles = computed(() => rocketGrupos.value.filter((grupo) => seVe(idRocket(grupo))))

/** La leyenda del final: las marcas Max solo en la pestaña que tiene combates Max. */
const marcasLeyenda = computed(() =>
  tab.value === 'raids' && maxVisibles.value.length ? ['shiny', 'dynamax', 'gigantamax'] : ['shiny']
)

/**
 * En móvil no hay barra lateral y cada pestaña es una lista larga: una fila de
 * chips fija arriba lleva a cada grupo. Solo salta, no filtra, para que siga
 * viéndose todo al bajar. Son los grupos de la barra lateral sin «Todas».
 */
const atajos = computed(() => filtros.value.filter((opcion) => opcion.value !== 'all'))
const irACategoria = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

const jefeAbierto = computed(() => live.raids.find((raid) => raid.name === openBoss.value) ?? null)
const climaAbierto = computed(() =>
  (jefeAbierto.value?.boostedWeather ?? []).map((w) => weatherLabel(w.name))
)

const bossTypes = (boss) => (boss.types ?? []).map((type) => type.name)

/** Tipos de un jefe Max: el feed no los trae, salen de su especie. */
const tiposMax = (dex) => gameData.baseByDex(dex)?.types ?? []

/** A qué es débil, de más a menos daño, para la tarjeta del jefe. */
const debilDe = (tipos) =>
  tipos.length && gameData.isReady ? gameData.matchups(tipos).weak.map((entry) => entry.type) : []

/**
 * A quién llevar contra el jefe Max abierto.
 *
 * Un equipo Max son tres: uno que aguante usando Maxibarrera y dos pegando.
 * Por eso salen dos listas. Solo entran Pokémon que puedan dinamaxizar, que
 * en un combate Max no cabe nadie más.
 */
const equipoMax = computed(() => {
  if (!openMax.value || !gameData.isReady) return null
  const jefe = gameData.baseByDex(openMax.value)
  if (!jefe) return null

  // Marca cuáles están hoy en los nodos, y cuáles se alcanzan evolucionando
  // algo que sí está: el mejor counter no sirve de nada si no hay dónde
  // conseguirlo en forma Dinamax.
  const disponibles = new Set((gameData.maxLive?.pokemon ?? []).map((uno) => uno.dex))

  return maxCounters(jefe, gameData.roster, gameData.chart, {
    limit: 6,
    available: disponibles,
    ...gameData.datosMax()
  })
})

/**
 * Los Pokémon que hay ahora mismo en los nodos energéticos, por nivel.
 *
 * Esto no sale del GAME_MASTER: él dice quién PUEDE dinamaxizar, no quién
 * ESTÁ hoy. Lo escribe un workflow cada tres horas leyendo Snacknap, que es
 * la única fuente que publica el roster entero y no solo lo que alguien ha
 * escaneado cerca.
 *
 * El nombre y el sprite se resuelven aquí contra el roster: la fuente da el
 * número de Pokédex, que es lo que no se rompe.
 */
const maxPorNivel = computed(() => {
  const vivos = gameData.maxLive?.pokemon ?? []
  if (!vivos.length) return []

  const grupos = new Map()
  for (const uno of vivos) {
    const entry = gameData.baseByDex(uno.dex)
    if (!grupos.has(uno.tier)) grupos.set(uno.tier, [])
    grupos.get(uno.tier).push({
      ...uno,
      // Sin entrada en el roster, el nombre de la fuente (en inglés) para los dos.
      name: entry?.name ?? uno.name,
      nameEs: entry?.nameEs ?? uno.name,
      // Un jefe Gigamax sale gigamaxizado, que es como se ve en el combate.
      image: entry
        ? spriteUrl(uno.gigantamax ? gigamaxSpriteId(entry.spriteId) : entry.spriteId)
        : null
    })
  }

  // De menor a mayor, como las incursiones de arriba: si no, cada sección se leía al revés.
  return [...grupos.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([tier, list]) => ({
      tier,
      list: list.sort((a, b) => (b.cp?.max ?? 0) - (a.cp?.max ?? 0))
    }))
})

const toggleBoss = (boss) => {
  openBoss.value = openBoss.value === boss.name ? null : boss.name
}

/** Counters del jefe abierto, con la efectividad real contra sus tipos. */
const counters = computed(() => {
  const boss = jefeAbierto.value
  return boss && gameData.isReady ? gameData.counters(bossTypes(boss), { limit: 10 }) : []
})

const weaknesses = computed(() => {
  const boss = jefeAbierto.value
  return boss && gameData.isReady
    ? gameData.matchups(bossTypes(boss)).weak.map((entry) => entry.type)
    : []
})

const tierLabel = (tier) => (te(`raids.tiers.${tier}`) ? t(`raids.tiers.${tier}`) : tier)

const weatherLabel = (name) => {
  const key = `raids.weather.${String(name).toLowerCase()}`
  return te(key) ? t(key) : name
}

const researchGroups = computed(() => {
  const groups = new Map()
  for (const task of live.research) {
    const type = task.type ?? 'misc'
    if (!groups.has(type)) groups.set(type, [])
    groups.get(type).push(task)
  }
  return [...groups.entries()]
    .map(([type, list]) => ({
      type,
      // Un tipo que aún no está traducido sale tal cual, pero con mayúscula:
      // «rocket» y «training» se colaron así en la lista.
      label: te(`raids.researchTypes.${type}`)
        ? t(`raids.researchTypes.${type}`)
        : type.charAt(0).toUpperCase() + type.slice(1),
      list
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale()))
})

/** Las tareas llegan en inglés: se traducen con las frases del juego. */
const taskText = (html) => gameData.translateText(plainText(html))

// Llegada desde la ficha: ?tab=raids&dex=113
watch(
  () => route.query,
  (query) => {
    const pestana = String(query.tab ?? '')
    if (TABS.includes(pestana)) tab.value = pestana
    const dex = Number(query.dex)
    if (Number.isInteger(dex) && dex > 0) senalar(dex)
  },
  { immediate: true }
)

onUnmounted(() => clearTimeout(temporizador))

onMounted(() => {
  live.load()
  gameData.load()
})
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">
      {{ $t('nav.raidsTitle') }}
    </h1>

    <p class="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
      {{ $t('raids.intro') }}
    </p>

    <!-- Solo salta si los datos se han quedado viejos. -->
    <data-freshness :age-ms="live.cacheAge" :stale="live.isStale" class="mb-3" />

    <div :class="ancho ? 'grid grid-cols-[240px_minmax(0,1fr)] gap-6 items-start' : ''">
      <!-- En escritorio ancho, barra lateral con las pestañas y los grupos de la pestaña -->
      <base-sidebar v-if="ancho">
        <div class="flex flex-col gap-2">
          <base-pill-button
            v-for="name in TABS"
            :key="name"
            :active="tab === name"
            @click="tab = name"
          >
            {{ tabLabel(name) }}
          </base-pill-button>
        </div>
        <!-- Como el tipo en Eventos: un clic, con cuántos hay de cada uno. -->
        <base-filter-list
          v-if="filtros.length"
          v-model="filtro"
          role="group"
          :aria-label="tabLabel(tab)"
          :options="filtros"
        />
      </base-sidebar>

      <div class="min-w-0">
        <base-segmented v-if="!ancho" v-model="tab" :options="tabOptions" class="mb-3" />

        <!--
          En móvil no hay barra lateral y las pestañas son listas largas: una
          fila de chips fija arriba lleva a cada grupo. Son los mismos grupos
          de la barra lateral, pero aquí solo saltan, no filtran.
          top-16 / sm:top-14: justo debajo de la cabecera fija (64 px en móvil, 56 desde sm).
        -->
        <!--
          Mientras carga, el hueco de la fila de grupos: al llegar los datos
          aparecía de golpe y bajaba toda la lista.
        -->
        <div
          v-if="!ancho && (live.status === 'loading' || live.status === 'idle')"
          class="py-2 mb-3 flex gap-2 overflow-hidden"
          aria-hidden="true"
        >
          <span
            v-for="(medida, i) in ['w-24', 'w-24', 'w-24', 'w-20']"
            :key="i"
            class="esqueleto shrink-0 h-[30px] rounded-full"
            :class="medida"
          ></span>
        </div>
        <nav
          v-else-if="live.status === 'ready' && !ancho && atajos.length > 1"
          :aria-label="tabLabel(tab)"
          class="sticky top-16 sm:top-14 z-10 -mx-4 py-2 mb-3 bg-gray-100 dark:bg-gray-700"
        >
          <!-- Lo que se desliza va dentro: la máscara del difuminado no puede tapar el fondo fijo. -->
          <div v-difuminado class="px-4 flex gap-2 overflow-x-auto [scrollbar-width:none]">
            <button
              v-for="atajo in atajos"
              :key="atajo.value"
              type="button"
              class="shrink-0 px-3 py-1.5 text-xs rounded-full border border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
              @click="irACategoria(atajo.value)"
            >
              {{ atajo.label }}
              <!-- Entre paréntesis: con «Nivel 1» o «5 km» delante, «Nivel 1 4» no se leía. -->
              <span class="text-mini text-gray-600 dark:text-gray-300 tabular-nums"
                >({{ atajo.count }})</span
              >
            </button>
          </div>
        </nav>

        <skeleton-loader v-if="live.status === 'loading' || live.status === 'idle'">
          <section v-for="grupo in 2" :key="grupo" class="mb-5">
            <span class="esqueleto block h-4 w-20 mb-2 rounded-full"></span>
            <div class="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
              <div
                v-for="n in 4"
                :key="n"
                class="flex flex-wrap items-center gap-2 p-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <span class="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center"
                  ><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span
                ></span>
                <span class="flex-1 flex flex-col gap-1.5">
                  <span class="esqueleto h-3 w-3/4 rounded-full"></span>
                  <span class="esqueleto h-2.5 w-1/2 rounded-full"></span>
                </span>
                <span class="esqueleto basis-full h-8 rounded-xl"></span>
              </div>
            </div>
          </section>
        </skeleton-loader>

        <base-error-message
          v-else-if="live.status === 'error'"
          :message="$t('common.error')"
          :detail="live.error"
        />

        <!-- ---------- Incursiones ---------- -->
        <template v-else-if="tab === 'raids'">
          <base-empty-state
            v-if="live.raidsByTier.length === 0 && maxPorNivel.length === 0"
            :message="$t('raids.noRaids')"
          />

          <section
            v-for="group in incursionesVisibles"
            :id="idIncursion(group)"
            :key="group.name"
            class="mb-5 scroll-mt-36"
          >
            <h2 class="text-sm font-bold mb-2">
              {{ group.shadow ? $t('raids.tiers.shadow') : tierLabel(group.name) }}
            </h2>

            <!--
              El panel de counters se cuela como un hijo más de la rejilla ocupando
              todas las columnas, justo detrás de su jefe. Así el desplegable usa
              el ancho entero en vez de estrecharse dentro de una tarjeta, y la
              rejilla no se descuadra.
            -->
            <div class="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
              <template v-for="boss in group.list" :key="boss.name">
                <live-mon-card
                  :id="`mon-${dexFromImage(boss.image)}`"
                  :highlight="destacado === dexFromImage(boss.image)"
                  :name="gameData.nombreEs(boss.name)"
                  :image="boss.image"
                  :dex="dexFromImage(boss.image)"
                  :combat-power="boss.combatPower?.normal"
                  :can-be-shiny="gameData.shinyReleased(dexFromImage(boss.image), boss.canBeShiny)"
                  :shadow="group.shadow"
                  :badge="group.shadow ? tierLabel(boss.tier) : null"
                  :tipos="bossTypes(boss)"
                  :debil="debilDe(bossTypes(boss))"
                >
                  <template #pie>
                    <counters-toggle
                      icono
                      :open="openBoss === boss.name"
                      :boss-name="gameData.nombreEs(boss.name)"
                      @toggle="toggleBoss(boss)"
                    />
                  </template>
                </live-mon-card>

                <raid-counters-panel
                  v-if="openBoss === boss.name"
                  class="col-span-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  :weaknesses="weaknesses"
                  :weather="climaAbierto"
                  :counters="counters"
                />
              </template>
            </div>
          </section>

          <!--
            Los combates Max son incursiones al fin y al cabo, así que van aquí y
            no en una pestaña aparte. Con su propio encabezado porque se juegan
            distinto: tres Pokémon, uno aguantando y dos pegando.
          -->
          <template v-if="maxVisibles.length">
            <h2 class="mt-6 text-sm font-bold">{{ $t('max.battlesTitle') }}</h2>
            <data-freshness :age-ms="edadMax" :stale="maxCaducado" class="mb-2" />
            <p class="text-mini text-gray-600 dark:text-gray-300 mb-2">
              {{ $t('max.globalPool') }}
            </p>

            <section
              v-for="grupo in maxVisibles"
              :id="idMax(grupo)"
              :key="grupo.tier"
              class="mb-5 scroll-mt-36"
            >
              <h3 class="text-sm font-bold mb-2">
                {{ $t('max.tier', { n: grupo.tier }) }}
                <span class="font-normal text-gray-600 dark:text-gray-300 tabular-nums"
                  >· {{ grupo.list.length }}</span
                >
              </h3>
              <!--
                Un carrusel por nivel, como los huevos: solo el nivel 1 eran 32
                tarjetas a una columna, unas veinte pantallas. Desde md hay
                sitio y van en rejilla. El equipo del jefe abierto sale debajo
                de su nivel, a todo el ancho.
              -->
              <div
                v-difuminado
                class="-mx-4 px-4 py-1 flex gap-2 overflow-x-auto snap-x scroll-px-4 [scrollbar-width:none] md:mx-0 md:px-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] md:overflow-visible"
              >
                <live-mon-card
                  v-for="uno in grupo.list"
                  :id="`mon-${uno.dex}`"
                  :key="`${grupo.tier}-${uno.dex}`"
                  class="shrink-0 w-44 snap-start md:w-auto"
                  :highlight="destacado === uno.dex"
                  :name="localName(uno)"
                  :image="uno.image"
                  :dex="uno.dex"
                  :combat-power="uno.cp"
                  :can-be-shiny="uno.canBeShiny"
                  :tipos="tiposMax(uno.dex)"
                  :debil="debilDe(tiposMax(uno.dex))"
                  ancha
                >
                  <max-mark
                    :variant="uno.gigantamax ? 'gigantamax' : 'dynamax'"
                    :size="15"
                    class="shrink-0 text-gray-600 dark:text-gray-300"
                  />
                  <template #pie>
                    <counters-toggle
                      icono
                      :open="openMax === uno.dex"
                      :boss-name="localName(uno)"
                      @toggle="openMax = openMax === uno.dex ? null : uno.dex"
                    />
                  </template>
                </live-mon-card>
              </div>
              <template v-for="uno in grupo.list" :key="`equipo-${grupo.tier}-${uno.dex}`">
                <max-team-panel
                  v-if="openMax === uno.dex && equipoMax"
                  class="mt-2 p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950"
                  :boss-name="localName(uno)"
                  :team="equipoMax"
                />
              </template>
            </section>

            <p class="text-mini text-gray-600 dark:text-gray-300">
              {{ $t('max.liveSource') }}
              <template v-if="edadMax != null">{{
                $t('max.updatedAgo', { age: formatDuration(edadMax) })
              }}</template>
            </p>
          </template>
        </template>

        <!-- ---------- Huevos ---------- -->
        <template v-else-if="tab === 'eggs'">
          <base-empty-state v-if="live.eggsByType.length === 0" :message="$t('raids.noEggs')" />

          <section
            v-for="group in huevosVisibles"
            :id="idHuevo(group)"
            :key="group.name"
            class="mb-5 scroll-mt-36"
          >
            <h2 class="text-sm font-bold mb-2">
              {{ group.name }}
              <span class="font-normal text-gray-600 dark:text-gray-300 tabular-nums"
                >· {{ group.list.length }}</span
              >
            </h2>
            <!--
              Un carrusel por distancia: cada huevo es una fila que se desliza
              y se ven todas las distancias sin bajar mucho. Antes, solo 1 km
              eran 27 tarjetas a dos columnas. Desde md hay sitio y bajan de
              línea.
            -->
            <div
              v-difuminado
              class="-mx-4 px-4 py-1 flex gap-2 overflow-x-auto snap-x scroll-px-4 [scrollbar-width:none] md:mx-0 md:px-0 md:flex-wrap md:overflow-visible"
            >
              <live-mon-card
                v-for="egg in group.list"
                :key="`${group.name}-${egg.name}`"
                :id="`mon-${dexFromImage(egg.image)}`"
                class="snap-start"
                vertical
                :highlight="destacado === dexFromImage(egg.image)"
                :name="gameData.nombreEs(egg.name)"
                :image="egg.image"
                :dex="dexFromImage(egg.image)"
                :combat-power="egg.combatPower"
                :can-be-shiny="gameData.shinyReleased(dexFromImage(egg.image), egg.canBeShiny)"
              />
            </div>
          </section>
        </template>

        <!-- ---------- Team GO Rocket ---------- -->
        <template v-else-if="tab === 'rocket'">
          <base-empty-state v-if="rocketGrupos.length === 0" :message="$t('raids.noRocket')" />
          <template v-else>
            <p class="mb-3 text-mini text-gray-600 dark:text-gray-300">
              {{ $t('raids.rocket.intro') }}
            </p>
            <section
              v-for="grupo in rocketVisibles"
              :id="idRocket(grupo)"
              :key="grupo.grupo"
              class="mb-5 scroll-mt-36"
            >
              <h2 class="text-sm font-bold mb-2">{{ $t(`raids.rocket.groups.${grupo.grupo}`) }}</h2>
              <div class="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-2 items-start">
                <rocket-lineup
                  v-for="lineup in grupo.list"
                  :key="lineup.name"
                  :lineup="lineup"
                  :open="openRocket === lineup.name"
                  @toggle="openRocket = openRocket === lineup.name ? null : lineup.name"
                />
              </div>
            </section>
          </template>
        </template>

        <!-- ---------- Tareas ---------- -->
        <template v-else>
          <base-empty-state v-if="researchGroups.length === 0" :message="$t('raids.noResearch')" />

          <!-- scroll-mt: al saltar desde los chips, que el título no quede debajo de la cabecera y de ellos. -->
          <section
            v-for="group in tareasVisibles"
            :id="idTarea(group)"
            :key="group.type"
            class="mb-5 scroll-mt-36"
          >
            <h2 class="text-sm font-bold mb-2">{{ group.label }}</h2>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-2 items-start">
              <article
                v-for="(task, index) in group.list"
                :key="`${group.type}-${index}`"
                class="p-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
              >
                <p class="text-xs font-semibold mb-1">{{ taskText(task.text) }}</p>
                <!-- Las recompensas, sin caja: antes eran tarjetas dentro de la tarjeta. -->
                <div class="flex flex-wrap gap-1">
                  <live-mon-card
                    vertical
                    sin-caja
                    v-for="reward in task.rewards"
                    :key="reward.name"
                    :id="`mon-${dexFromImage(reward.image)}`"
                    :highlight="destacado === dexFromImage(reward.image)"
                    :name="gameData.nombreEs(reward.name)"
                    :image="reward.image"
                    :dex="dexFromImage(reward.image)"
                    :combat-power="reward.combatPower"
                    :can-be-shiny="
                      gameData.shinyReleased(dexFromImage(reward.image), reward.canBeShiny)
                    "
                  />
                </div>
              </article>
            </div>
          </section>
        </template>

        <!-- Qué significan las marcas de las tarjetas: al final, para no quitar sitio arriba. -->
        <mark-legend v-if="live.status === 'ready'" :marcas="marcasLeyenda" class="mt-8" />
      </div>
    </div>
  </section>
</template>
