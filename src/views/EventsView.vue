<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useLiveStore } from '../stores/live'
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
const { t, te } = useTranslate()

const tab = ref('active')
const typeFilter = ref('all')

const TABS = ['active', 'upcoming', 'undated', 'past']

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

const list = computed(() =>
  typeFilter.value === 'all'
    ? source.value
    : source.value.filter((event) => event.eventType === typeFilter.value)
)

onMounted(() => live.load())
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{{ $t('events.intro') }}</p>

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
      <button
        type="button"
        class="h-11 px-4 text-xs rounded-xl border border-gray-400 shadow-md bg-white dark:bg-gray-900 hover:bg-gray-150 hover:dark:bg-gray-800"
        @click="live.load({ force: true })"
      >
        {{ $t('common.update') }}
      </button>

      <data-freshness :age-ms="live.cacheAge" :stale="live.isStale" />
    </div>

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
