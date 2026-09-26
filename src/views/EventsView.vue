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
  SpinnerComponent
} from '../components/index'
import EventCard from '../components/events/EventCard.vue'
import { useTranslate } from '../composables/useTranslate'

const live = useLiveStore()
const gameData = useGameDataStore()
const { t, te } = useTranslate()

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
      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
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

    <p v-if="mostrarNotaMax" class="text-mini text-gray-500 dark:text-gray-400 mb-3">
      {{ $t('max.battlesNote') }}
    </p>

    <spinner-component v-if="live.status === 'loading'" />

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
