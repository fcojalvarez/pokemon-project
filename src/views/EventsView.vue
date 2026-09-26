<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useLiveStore } from '../stores/live'
import { useGameDataStore } from '../stores/gameData'
import {
  BaseEmptyState,
  BaseErrorMessage,
  BaseFilterSelect,
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

// Sin 'past': un evento que ya terminó no sirve para nada.
const TABS = ['active', 'upcoming', 'undated']

/** Estado del evento. Va en desplegable, como el tipo, y comparten fila. */
const stateOptions = computed(() =>
  TABS.map((name) => ({
    value: name,
    label: `${t(`events.${name}`)} (${(live[name] ?? []).length})`
  }))
)

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
    <!-- Estado y tipo, a partes iguales: son los dos filtros de la vista. -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      <base-filter-select
        v-model="tab"
        :label="$t('events.filterState')"
        :options="stateOptions"
      />
      <base-filter-select
        v-model="typeFilter"
        :label="$t('events.filterType')"
        :options="typeOptions"
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
