<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useLiveStore } from '../stores/live'
import { useGameDataStore } from '../stores/gameData'
import {
  BaseEmptyState,
  BaseErrorMessage,
  BaseFilterSelect,
  BasePillButton,
  DataFreshness,
  SkeletonLoader
} from '../components/index'
import EventCard from '../components/events/EventCard.vue'
import { useTranslate } from '../composables/useTranslate'

const live = useLiveStore()
const gameData = useGameDataStore()
const { t, te, locale } = useTranslate()

const tab = ref('active')
const typeFilter = ref('all')

// Ni pasados ni sin fecha: uno que ya terminó no sirve para nada, y los que
// LeekDuck publica sin fechas no se pueden ni situar en el tiempo.
const TABS = ['active', 'upcoming']

const source = computed(() => live[tab.value] ?? [])

const typeLabel = (eventType, heading) => {
  const key = `events.types.${eventType}`
  return te(key) ? t(key) : heading || t('events.types.event')
}

const typeOptions = computed(() => {
  const seen = new Map()
  for (const event of source.value) {
    seen.set(event.eventType, typeLabel(event.eventType, event.heading))
  }
  return [
    { value: 'all', label: `${t('common.all')} (${source.value.length})` },
    ...[...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale()))
  ]
})

// Al cambiar de pestaña el tipo elegido puede no existir ahí.
watch(tab, () => {
  typeFilter.value = 'all'
})

/** Si lo que se está viendo son combates Max, se avisa de lo que no se sabe. */
const TIPOS_MAX = ['max-mondays', 'max-battles']
const mostrarNotaMax = computed(() => TIPOS_MAX.includes(typeFilter.value))

const list = computed(() =>
  typeFilter.value === 'all'
    ? source.value
    : source.value.filter((event) => event.eventType === typeFilter.value)
)

// También el roster: las tarjetas lo necesitan para traducir el nombre del
// Pokémon del título y para sacar su sprite. Sin esto, entrando directo a
// /eventos los títulos se quedaban a medio traducir.
onMounted(() => {
  live.load()
  gameData.load()
})
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ $t('nav.events') }}</h1>

    <div class="flex flex-wrap gap-2 mb-3">
      <base-pill-button
        v-for="name in TABS"
        :key="name"
        :active="tab === name"
        @click="tab = name"
      >
        {{ $t(`events.${name}`) }}
      </base-pill-button>
    </div>

    <div class="flex flex-wrap items-end gap-3 mb-4">
      <base-filter-select
        v-model="typeFilter"
        :label="$t('events.filterType')"
        :options="typeOptions"
        class="flex-1 min-w-[180px] max-w-xs"
      />
    </div>

    <!-- Solo salta si los datos se han quedado viejos. -->
    <data-freshness :age-ms="live.cacheAge" :stale="live.isStale" class="mb-3" />

    <p v-if="mostrarNotaMax" class="text-mini text-gray-600 dark:text-gray-300 mb-3">
      {{ $t('max.battlesNote') }}
    </p>

    <skeleton-loader v-if="live.status === 'loading' || live.status === 'idle'">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <div
          v-for="n in 6"
          :key="n"
          class="p-4 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
        >
          <div class="flex gap-3 items-start">
            <span class="esqueleto w-20 h-14 shrink-0 rounded-xl"></span>
            <div class="flex-1 flex flex-col gap-2">
              <span class="esqueleto h-4 w-20 rounded-full"></span>
              <span class="esqueleto h-3.5 w-full rounded-full"></span>
              <span class="esqueleto h-3.5 w-3/5 rounded-full"></span>
            </div>
          </div>
          <div class="flex gap-2 mt-3">
            <span class="esqueleto h-5 w-24 rounded-full"></span>
            <span class="esqueleto h-5 w-28 rounded-full"></span>
          </div>
          <span class="esqueleto block h-3 w-2/3 mt-3 rounded-full"></span>
        </div>
      </div>
    </skeleton-loader>

    <base-error-message
      v-else-if="live.status === 'error'"
      :message="$t('common.error')"
      :detail="live.error"
    />

    <base-empty-state v-else-if="list.length === 0" :message="$t('common.empty')" />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      <event-card v-for="event in list" :key="event.eventID" :event="event" />
    </div>
  </section>
</template>
