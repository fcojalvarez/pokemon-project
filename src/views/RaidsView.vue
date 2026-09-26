<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
import LiveMonCard from '../components/pokemon/LiveMonCard.vue'
import { spriteUrl } from '../utils/sprites'
import { useTranslate } from '../composables/useTranslate'

const live = useLiveStore()
const gameData = useGameDataStore()
const router = useRouter()
const { t, te } = useTranslate()

const tab = ref('raids')
const openBoss = ref(null)

const TABS = ['raids', 'eggs', 'research']

const bossTypes = (boss) => (boss.types ?? []).map((type) => type.name)

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

const goToPokemon = (dex) => dex && router.push(`/pokemon/${dex}`)

onMounted(() => {
  live.load()
  gameData.load()
})
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
      <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('raids.intro') }}</p>
      <div class="flex items-center gap-2">
        <data-freshness :age-ms="live.cacheAge" :stale="live.isStale" />

      </div>
    </div>

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
    <p class="flex items-center gap-1.5 text-mini text-gray-600 dark:text-gray-400 mb-3">
      <!-- Mismo glifo y mismo color que en <live-mon-card>. -->
      <span class="text-gray-600 dark:text-gray-100 leading-none" aria-hidden="true">✦</span>
      {{ $t('pokemon.shinyLegend') }}
    </p>

    <spinner-component v-if="live.status === 'loading'" />

    <base-error-message
      v-else-if="live.status === 'error'"
      :message="$t('common.error')"
      :detail="live.error"
    />

    <!-- ---------- Incursiones ---------- -->
    <template v-else-if="tab === 'raids'">
      <base-empty-state v-if="live.raidsByTier.length === 0" :message="$t('raids.noRaids')" />

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
        <div class="grid grid-cols-[repeat(auto-fill,minmax(195px,1fr))] gap-2">
          <template v-for="boss in group.list" :key="boss.name">
            <live-mon-card
              :name="boss.name"
              :image="boss.image"
              :dex="dexFromImage(boss.image)"
              :combat-power="boss.combatPower?.normal"
              :can-be-shiny="boss.canBeShiny"
              :shadow="group.shadow"
              :badge="group.shadow ? tierLabel(boss.tier) : null"
            >
              <button
                type="button"
                class="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800"
                :aria-expanded="openBoss === boss.name"
                :aria-label="`${$t('raids.counters')}: ${boss.name}`"
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
                  <span class="text-mini text-gray-600 dark:text-gray-400">{{ $t('raids.weakTo') }}</span>
                  <type-icons :types="weaknesses" size="14" />
                </span>
                <span v-if="boss.boostedWeather?.length" class="flex items-center gap-2">
                  <span class="text-mini text-gray-600 dark:text-gray-400">{{ $t('raids.boostedBy') }}</span>
                  <span class="text-mini">{{ boss.boostedWeather.map((w) => weatherLabel(w.name)).join(' · ') }}</span>
                </span>
              </div>

              <ol class="mt-2 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-1.5">
                <li
                  v-for="counter in counters"
                  :key="`${counter.id}-${counter.fast.id}-${counter.charged.id}`"
                  class="flex items-center gap-2 p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-150 hover:dark:bg-gray-700"
                  @click="goToPokemon(counter.dex)"
                >
                  <img
                    :src="spriteUrl(counter.spriteId)"
                    :alt="counter.nameEs"
                    class="w-8 h-8 shrink-0"
                    loading="lazy"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-semibold truncate">{{ counter.nameEs }}</div>
                    <div class="flex flex-wrap gap-1.5 text-mini text-gray-600 dark:text-gray-400">
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
            :name="egg.name"
            :image="egg.image"
            :dex="dexFromImage(egg.image)"
            :combat-power="egg.combatPower"
            :can-be-shiny="egg.canBeShiny"
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
                :name="reward.name"
                :image="reward.image"
                :dex="dexFromImage(reward.image)"
                :combat-power="reward.combatPower"
                :can-be-shiny="reward.canBeShiny"
              />
            </div>
          </article>
        </div>
      </section>
    </template>

  </section>
</template>
