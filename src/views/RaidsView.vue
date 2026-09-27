<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { dexFromImage, useLiveStore } from '../stores/live'
import { useGameDataStore } from '../stores/gameData'
import {
  BaseEmptyState,
  BaseErrorMessage,
  BasePillButton,
  DataFreshness,
  SkeletonLoader
} from '../components/index'
import MaxMark from '../components/pokemon/MaxMark.vue'
import RaidCountersPanel from '../components/raids/RaidCountersPanel.vue'
import MaxTeamPanel from '../components/raids/MaxTeamPanel.vue'
import { useMedia } from '../composables/useMedia'
import MaxLegend from '../components/pokemon/MaxLegend.vue'
import BaseChevron from '../components/base/BaseChevron.vue'
import ShinyLegend from '../components/pokemon/ShinyLegend.vue'
import LiveMonCard from '../components/pokemon/LiveMonCard.vue'
import { spriteUrl } from '../utils/sprites'
import { maxCounters } from '../utils/maxBattle'
import { useTranslate } from '../composables/useTranslate'
import { entre, useFiltrosEnUrl } from '../composables/useFiltrosEnUrl'
import { formatDuration } from '../utils/time'

const live = useLiveStore()
const gameData = useGameDataStore()
// Antigüedad de los combates Max, con el reloj de `live` para que avance.
const edadMax = computed(() => gameData.maxLiveEdad(live.now))
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
  temporizador = setTimeout(() => { destacado.value = null }, 6000)
}
const openBoss = ref(null)
/** Qué jefe Max tiene el equipo recomendado abierto. */
const openMax = ref(null)

const TABS = ['raids', 'eggs', 'research']

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
    group: { valor: filtro, defecto: 'all', leer: (texto) => (/^[\w-]+$/.test(texto) ? texto : undefined) }
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

const slug = (texto) => String(texto).toLowerCase().replace(/[^a-z0-9]+/g, '-')

const idIncursion = (grupo) => `nivel-${slug(grupo.name)}`
const idMax = (grupo) => `max-${grupo.tier}`
const idHuevo = (grupo) => `huevos-${slug(grupo.name)}`
const idTarea = (grupo) => `tareas-${slug(grupo.type)}`

/** Los grupos de la pestaña, con cuántos tiene cada uno, y «Todas» delante. */
const filtros = computed(() => {
  let grupos
  if (tab.value === 'raids') {
    grupos = [
      ...live.raidsByTier.map((grupo) => ({
        id: idIncursion(grupo),
        label: grupo.shadow ? t('raids.tiers.shadow') : tierLabel(grupo.name),
        count: grupo.list.length
      })),
      ...maxPorNivel.value.map((grupo) => ({
        id: idMax(grupo),
        label: `Max · ${t('max.tier', { n: grupo.tier })}`,
        count: grupo.list.length
      }))
    ]
  } else if (tab.value === 'eggs') {
    grupos = live.eggsByType.map((grupo) => ({ id: idHuevo(grupo), label: grupo.name, count: grupo.list.length }))
  } else {
    grupos = researchGroups.value.map((grupo) => ({ id: idTarea(grupo), label: grupo.label, count: grupo.list.length }))
  }
  if (!grupos.length) return []
  const total = grupos.reduce((suma, grupo) => suma + grupo.count, 0)
  return [{ id: 'all', label: t(`raids.all.${tab.value}`), count: total }, ...grupos]
})

/** Sin barra lateral no hay filtro que tocar: se ve todo. */
const seVe = (id) => !ancho.value || filtro.value === 'all' || filtro.value === id

const incursionesVisibles = computed(() => live.raidsByTier.filter((grupo) => seVe(idIncursion(grupo))))
const maxVisibles = computed(() => maxPorNivel.value.filter((grupo) => seVe(idMax(grupo))))
const huevosVisibles = computed(() => live.eggsByType.filter((grupo) => seVe(idHuevo(grupo))))
const tareasVisibles = computed(() => researchGroups.value.filter((grupo) => seVe(idTarea(grupo))))

const jefeAbierto = computed(() => live.raids.find((raid) => raid.name === openBoss.value) ?? null)
const climaAbierto = computed(() => (jefeAbierto.value?.boostedWeather ?? []).map((w) => weatherLabel(w.name)))

const bossTypes = (boss) => (boss.types ?? []).map((type) => type.name)

/**
 * Nombre de un Pokémon en español. LeekDuck los publica en inglés y con la
 * forma entre paréntesis; se usa el mismo traductor que los títulos de evento
 * para que «Shadow Machop» o «Hisuian Samurott» salgan igual en toda la app.
 */
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
    available: disponibles
  })
})

/** Cómo conseguirlo hoy: directamente, evolucionando, o de ninguna forma. */
const comoConseguir = (quien) => {
  if (quien.availableNow) return t('max.availableNow')
  if (quien.availableFrom) return t('max.availableVia', { pokemon: localName(quien.availableFrom) })
  return null
}

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
      image: entry ? spriteUrl(entry.spriteId) : null
    })
  }

  // De mayor a menor: los de nivel 5 son los que se buscan.
  return [...grupos.entries()]
    .sort((a, b) => b[0] - a[0])
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
  if (!openBoss.value || !gameData.isReady) return []
  const boss = live.raids.find((raid) => raid.name === openBoss.value)
  return boss ? gameData.counters(bossTypes(boss), { limit: 10 }) : []
})

/** Qué procedencias aparecen entre los counters, para la leyenda de colores. */
const counterOrigins = computed(() => {
  const moves = counters.value.flatMap((counter) => [counter.fast, counter.charged])
  return {
    elite: moves.some((move) => move?.elite),
    legacy: moves.some((move) => move?.legacy),
    mega: moves.some((move) => move?.mega)
  }
})

const weaknesses = computed(() => {
  if (!openBoss.value || !gameData.isReady) return []
  const boss = live.raids.find((raid) => raid.name === openBoss.value)
  return boss ? gameData.matchups(bossTypes(boss)).weak.map((entry) => entry.type) : []
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
      label: te(`raids.researchTypes.${type}`) ? t(`raids.researchTypes.${type}`) : type,
      list
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale()))
})

/** El texto de la tarea viene envuelto en <span>. */
const plainText = (html) => String(html).replace(/<[^>]*>/g, '').trim()

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
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ $t('nav.raids') }}</h1>

    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <p class="text-sm text-gray-600 dark:text-gray-300">{{ $t('raids.intro') }}</p>
    </div>

    <!-- Solo salta si los datos se han quedado viejos. -->
    <data-freshness :age-ms="live.cacheAge" :stale="live.isStale" class="mb-3" />

    <div :class="ancho ? 'grid grid-cols-[240px_minmax(0,1fr)] gap-6 items-start' : ''">
      <!-- En escritorio ancho, barra lateral con las pestañas y los grupos de la pestaña -->
      <aside
        v-if="ancho"
        class="[@media(min-height:720px)]:sticky top-[104px] flex flex-col gap-4 p-4 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
      >
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
        <ul v-if="filtros.length" role="group" :aria-label="tabLabel(tab)" class="flex flex-col gap-0.5">
          <li v-for="opcion in filtros" :key="opcion.id">
            <button
              type="button"
              class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm text-left rounded-lg transition-colors"
              :class="filtro === opcion.id
                ? 'bg-gray-500 dark:bg-gray-600 text-white'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800'"
              :aria-label="`${opcion.label} (${opcion.count})`"
              :aria-pressed="filtro === opcion.id"
              @click="filtro = opcion.id"
            >
              <span class="min-w-0">{{ opcion.label }}</span>
              <span
                class="shrink-0 text-mini tabular-nums"
                :class="filtro === opcion.id ? 'text-white' : 'text-gray-600 dark:text-gray-300'"
              >{{ opcion.count }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <div class="min-w-0">
        <div v-if="!ancho" class="flex flex-wrap gap-2 mb-4">
          <base-pill-button
            v-for="name in TABS"
            :key="name"
            :active="tab === name"
            @click="tab = name"
          >
            {{ tabLabel(name) }}
          </base-pill-button>
        </div>

        <!--
          La estrella que llevan las tarjetas solo tenía `title`, que en móvil no
          existe. Aquí se dice con palabras.
        -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
          <shiny-legend variant="dex" />
          <!-- Una vez por pestaña: repetirla en cada nivel era más ruido que ayuda. -->
          <p v-if="tab === 'raids'" class="text-mini text-gray-600 dark:text-gray-300">
            {{ $t('raids.tapForCounters') }}
          </p>
        </div>

        <skeleton-loader v-if="live.status === 'loading' || live.status === 'idle'">
          <section v-for="grupo in 2" :key="grupo" class="mb-5">
            <span class="esqueleto block h-4 w-20 mb-2 rounded-full"></span>
            <div class="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
              <div
                v-for="n in 4"
                :key="n"
                class="flex items-center gap-2 p-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <span class="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center"><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span></span>
                <span class="flex-1 flex flex-col gap-1.5">
                  <span class="esqueleto h-3 w-3/4 rounded-full"></span>
                  <span class="esqueleto h-2.5 w-1/2 rounded-full"></span>
                </span>
                <span class="esqueleto w-8 h-8 shrink-0 rounded-xl"></span>
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
            :key="group.name"
            class="mb-5"
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
                >
                  <button
                    type="button"
                    class="shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800"
                    :aria-expanded="openBoss === boss.name"
                    :aria-label="`${$t('raids.counters')}: ${gameData.nombreEs(boss.name)}`"
                    @click.prevent.stop="toggleBoss(boss)"
                  >
                    <!-- Con panel lateral la flecha apunta hacia él; si no, abre hacia abajo. -->
                    <base-chevron :open="openBoss === boss.name" size="w-3.5 h-3.5" />
                  </button>
                </live-mon-card>

                <raid-counters-panel
                  v-if="openBoss === boss.name"
                  class="col-span-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  :weaknesses="weaknesses"
                  :weather="climaAbierto"
                  :counters="counters"
                  :origins="counterOrigins"
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
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6">
              <h2 class="text-sm font-bold">{{ $t('max.battlesTitle') }}</h2>
              <max-legend />
            </div>
            <data-freshness :age-ms="edadMax" :stale="gameData.maxLiveCaducado(live.now)" class="mb-2" />
            <p class="text-mini text-gray-600 dark:text-gray-300 mb-2">{{ $t('max.tapForTeam') }}</p>

            <section
            v-for="grupo in maxVisibles"
            :key="grupo.tier"
            class="mb-5"
          >
              <h3 class="text-sm font-bold mb-2">
                {{ $t('max.tier', { n: grupo.tier }) }}
                <span class="font-normal text-gray-600 dark:text-gray-300">({{ grupo.list.length }})</span>
              </h3>
              <div class="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
                <template v-for="uno in grupo.list" :key="`${grupo.tier}-${uno.dex}`">
                  <live-mon-card
                    :id="`mon-${uno.dex}`"
                    :highlight="destacado === uno.dex"
                    :name="localName(uno)"
                    :image="uno.image"
                    :dex="uno.dex"
                    :combat-power="uno.cp"
                    :can-be-shiny="uno.canBeShiny"
                  >
                    <max-mark
                      :variant="uno.gigantamax ? 'gigantamax' : 'dynamax'"
                      :size="15"
                      class="shrink-0 text-gray-600 dark:text-gray-300"
                    />
                    <button
                      type="button"
                      class="shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800"
                      :aria-expanded="openMax === uno.dex"
                      :aria-label="`${$t('max.team')}: ${localName(uno)}`"
                      @click.prevent.stop="openMax = openMax === uno.dex ? null : uno.dex"
                    >
                      <base-chevron :open="openMax === uno.dex" size="w-3.5 h-3.5" />
                    </button>
                  </live-mon-card>

                  <!--
                    El equipo ocupa la fila entera: al lado de una tarjeta de 160px
                    no cabría, y así queda debajo del jefe al que pertenece.
                  -->
                  <max-team-panel
                    v-if="openMax === uno.dex && equipoMax"
                    class="col-span-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950"
                    :boss-name="localName(uno)"
                    :team="equipoMax"
                    :how-to-get="comoConseguir"
                  />
                </template>
              </div>
            </section>

            <p class="text-mini text-gray-600 dark:text-gray-300">
              {{ $t('max.liveSource') }}
              <template v-if="edadMax != null">{{ $t('max.updatedAgo', { age: formatDuration(edadMax) }) }}</template>
            </p>
          </template>        </template>

        <!-- ---------- Huevos ---------- -->
        <template v-else-if="tab === 'eggs'">
          <base-empty-state v-if="live.eggsByType.length === 0" :message="$t('raids.noEggs')" />

          <section
            v-for="group in huevosVisibles"
            :key="group.name"
            class="mb-5"
          >
            <h2 class="text-sm font-bold mb-2">{{ group.name }}</h2>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
              <live-mon-card
                v-for="egg in group.list"
                :key="`${group.name}-${egg.name}`"
                :id="`mon-${dexFromImage(egg.image)}`"
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

        <!-- ---------- Tareas ---------- -->
        <template v-else>
          <base-empty-state v-if="researchGroups.length === 0" :message="$t('raids.noResearch')" />

          <section
            v-for="group in tareasVisibles"
            :key="group.type"
            class="mb-5"
          >
            <h2 class="text-sm font-bold mb-2">{{ group.label }}</h2>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-2 items-start">
              <article
                v-for="(task, index) in group.list"
                :key="`${group.type}-${index}`"
                class="p-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
              >
                <p class="text-xs font-semibold mb-2">{{ taskText(task.text) }}</p>
                <div class="grid grid-cols-[repeat(auto-fill,minmax(135px,1fr))] gap-1.5">
                  <live-mon-card
                    v-for="reward in task.rewards"
                    :key="reward.name"
                    :id="`mon-${dexFromImage(reward.image)}`"
                    :highlight="destacado === dexFromImage(reward.image)"
                    :name="gameData.nombreEs(reward.name)"
                    :image="reward.image"
                    :dex="dexFromImage(reward.image)"
                    :combat-power="reward.combatPower"
                    :can-be-shiny="gameData.shinyReleased(dexFromImage(reward.image), reward.canBeShiny)"
                  />
                </div>
              </article>
            </div>
          </section>
        </template>
      </div>
    </div>
  </section>
</template>
