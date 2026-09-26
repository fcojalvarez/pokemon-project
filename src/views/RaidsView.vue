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
  MoveTag,
  SpinnerComponent,
  TypeIcons
} from '../components/index'
import MoveLegend from '../components/pokemon/MoveLegend.vue'
import MaxMark from '../components/pokemon/MaxMark.vue'
import MaxLegend from '../components/pokemon/MaxLegend.vue'
import BaseChevron from '../components/base/BaseChevron.vue'
import ShinyLegend from '../components/pokemon/ShinyLegend.vue'
import LiveMonCard from '../components/pokemon/LiveMonCard.vue'
import { spriteUrl } from '../utils/sprites'
import { maxCounters } from '../utils/maxBattle'
import { useTranslate } from '../composables/useTranslate'

const live = useLiveStore()
const gameData = useGameDataStore()
const route = useRoute()
const { t, te } = useTranslate()

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
  if (quien.availableFrom) return t('max.availableVia', { pokemon: quien.availableFrom.nameEs })
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
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
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
      <div class="flex items-center gap-2">

      </div>
    </div>

    <!-- Solo salta si los datos se han quedado viejos. -->
    <data-freshness :age-ms="live.cacheAge" :stale="live.isStale" class="mb-3" />

    <div class="flex flex-wrap gap-2 mb-4">
      <base-pill-button
        v-for="name in TABS"
        :key="name"
        :active="tab === name"
        @click="tab = name"
      >
        {{ $t(`raids.tab${name.charAt(0).toUpperCase()}${name.slice(1)}`) }}
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

    <spinner-component v-if="live.status === 'loading'" />

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

      <section v-for="group in live.raidsByTier" :key="group.name" class="mb-5">
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
                class="shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800"
                :aria-expanded="openBoss === boss.name"
                :aria-label="`${$t('raids.counters')}: ${gameData.nombreEs(boss.name)}`"
                @click.prevent.stop="toggleBoss(boss)"
              >
                <span aria-hidden="true">{{ openBoss === boss.name ? '▴' : '▾' }}</span>
              </button>
            </live-mon-card>

            <div
              v-if="openBoss === boss.name"
              class="col-span-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span v-if="weaknesses.length" class="flex items-center gap-2">
                  <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('raids.weakTo') }}</span>
                  <type-icons :types="weaknesses" size="14" />
                </span>
                <span v-if="boss.boostedWeather?.length" class="flex items-center gap-2">
                  <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('raids.boostedBy') }}</span>
                  <span class="text-mini">{{ boss.boostedWeather.map((w) => weatherLabel(w.name)).join(' · ') }}</span>
                </span>
              </div>

              <ol class="mt-2 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-1.5">
                <li
                  v-for="counter in counters"
                  :key="`${counter.id}-${counter.fast.id}-${counter.charged.id}`"
                >
                  <component
                    :is="counter.dex ? 'router-link' : 'div'"
                    :to="counter.dex ? `/pokemon/${counter.dex}` : undefined"
                    class="flex items-center gap-2 p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-150 hover:dark:bg-gray-700"
                  >
                  <img
                    :src="spriteUrl(counter.spriteId)"
                    alt=""
                    class="w-8 h-8 shrink-0"
                    loading="lazy"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-semibold truncate">{{ counter.nameEs }}</div>
                    <div class="flex flex-wrap gap-1.5 text-mini text-gray-600 dark:text-gray-300">
                      <move-tag
                        chip
                        :name="counter.fast.nameEs"
                        hide-icon
                        :elite="counter.fast.elite"
                        :legacy="counter.fast.legacy"
                      />
                      <move-tag
                        chip
                        :name="counter.charged.nameEs"
                        hide-icon
                        :elite="counter.charged.elite"
                        :legacy="counter.charged.legacy"
                        :mega="counter.charged.mega"
                      />
                    </div>
                  </div>
                  <span class="text-xs font-bold shrink-0">{{ counter.dps.toFixed(1) }}</span>
                  </component>
                </li>
              </ol>

              <move-legend
                v-if="counterOrigins.elite || counterOrigins.legacy || counterOrigins.mega"
                class="mt-2"
                :elite="counterOrigins.elite"
                :legacy="counterOrigins.legacy"
                :mega="counterOrigins.mega"
              />
            </div>
          </template>
        </div>
      </section>
      <!--
        Los combates Max son incursiones al fin y al cabo, así que van aquí y
        no en una pestaña aparte. Con su propio encabezado porque se juegan
        distinto: tres Pokémon, uno aguantando y dos pegando.
      -->
      <template v-if="maxPorNivel.length">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-6">
          <h2 class="text-sm font-bold">{{ $t('max.battlesTitle') }}</h2>
          <max-legend />
        </div>
        <p class="text-mini text-gray-600 dark:text-gray-300 mb-2">{{ $t('max.tapForTeam') }}</p>

        <section v-for="grupo in maxPorNivel" :key="grupo.tier" class="mb-5">
          <h3 class="text-sm font-bold mb-2">
            {{ $t('max.tier', { n: grupo.tier }) }}
            <span class="font-normal text-gray-600 dark:text-gray-300">({{ grupo.list.length }})</span>
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
            <template v-for="uno in grupo.list" :key="`${grupo.tier}-${uno.dex}`">
              <live-mon-card
                :id="`mon-${uno.dex}`"
                :highlight="destacado === uno.dex"
                :name="uno.nameEs"
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
                  class="shrink-0 px-1.5 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800"
                  :aria-expanded="openMax === uno.dex"
                  :aria-label="`${$t('max.team')}: ${uno.nameEs}`"
                  @click.prevent.stop="openMax = openMax === uno.dex ? null : uno.dex"
                >
                  <base-chevron :open="openMax === uno.dex" size="w-3 h-3" />
                </button>
              </live-mon-card>

              <!--
                El equipo ocupa la fila entera: al lado de una tarjeta de 160px
                no cabría, y así queda debajo del jefe al que pertenece.
              -->
              <div
                v-if="openMax === uno.dex && equipoMax"
                class="col-span-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-950"
              >
                <p class="text-mini text-gray-600 dark:text-gray-300 mb-3">
                  {{ $t('max.teamIntro', { pokemon: uno.nameEs }) }}
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 class="text-xs font-bold mb-2">{{ $t('max.tank') }}</h4>
                    <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5">
                      <live-mon-card
                        v-for="quien in equipoMax.tanks"
                        :key="`t-${quien.id}`"
                        :name="quien.nameEs"
                        :image="spriteUrl(quien.spriteId)"
                        :dex="quien.dex"
                        :badge="comoConseguir(quien)"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 class="text-xs font-bold mb-2">{{ $t('max.attackers') }}</h4>
                    <base-empty-state
                      v-if="equipoMax.attackers.length === 0"
                      :message="$t('max.noAttackers')"
                    />
                    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-1.5">
                      <live-mon-card
                        v-for="quien in equipoMax.attackers"
                        :key="`a-${quien.id}`"
                        :name="quien.nameEs"
                        :image="spriteUrl(quien.spriteId)"
                        :dex="quien.dex"
                        :badge="comoConseguir(quien)"
                      />
                    </div>
                  </div>
                </div>

                <p class="mt-3 text-mini text-gray-600 dark:text-gray-300">
                  {{ $t('max.teamNote') }}
                </p>
              </div>
            </template>
          </div>
        </section>

        <p class="text-mini text-gray-600 dark:text-gray-300">
          {{ $t('max.liveSource') }}
        </p>
      </template>
    </template>

    <!-- ---------- Huevos ---------- -->
    <template v-else-if="tab === 'eggs'">
      <base-empty-state v-if="live.eggsByType.length === 0" :message="$t('raids.noEggs')" />

      <section v-for="group in live.eggsByType" :key="group.name" class="mb-5">
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

      <section v-for="group in researchGroups" :key="group.type" class="mb-5">
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

  </section>
</template>
