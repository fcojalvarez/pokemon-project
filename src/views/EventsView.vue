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
import { entre, useFiltrosEnUrl } from '../composables/useFiltrosEnUrl'
import { useMedia } from '../composables/useMedia'

const live = useLiveStore()
const gameData = useGameDataStore()
const { t, te, locale } = useTranslate()

// Mismo corte que el Top: en escritorio ancho, filtros en una barra lateral.
const ancho = useMedia('(min-width: 1280px)')

const tab = ref('active')
const typeFilter = ref('all')

// Ni pasados ni sin fecha: uno que ya terminó no sirve para nada, y los que
// LeekDuck publica sin fechas no se pueden ni situar en el tiempo.
const TABS = ['active', 'upcoming']

// En la URL, para volver de un evento con la misma pestaña y el mismo tipo.
// Antes del watch de abajo: si no, al leer la pestaña de la URL se borraría el
// tipo que también viene en ella.
useFiltrosEnUrl({
  view: { valor: tab, defecto: 'active', leer: entre(TABS) },
  kind: { valor: typeFilter, defecto: 'all', leer: (texto) => (/^[\w-]+$/.test(texto) ? texto : undefined) }
})

const source = computed(() => live[tab.value] ?? [])

const typeLabel = (eventType, heading) => {
  const key = `events.types.${eventType}`
  return te(key) ? t(key) : gameData.autoTranslate(heading) || t('events.types.event')
}

const typeOptions = computed(() => {
  const seen = new Map()
  for (const event of source.value) {
    const previo = seen.get(event.eventType)
    seen.set(event.eventType, {
      label: previo?.label ?? typeLabel(event.eventType, event.heading),
      count: (previo?.count ?? 0) + 1
    })
  }
  return [
    { value: 'all', label: `${t('common.all')} (${source.value.length})`, name: t('common.all'), count: source.value.length },
    ...[...seen.entries()]
      .map(([value, { label, count }]) => ({ value, label, name: label, count }))
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

const rejilla = computed(() =>
  ancho.value ? 'grid grid-cols-2 2xl:grid-cols-3 gap-3' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'
)

const list = computed(() =>
  typeFilter.value === 'all'
    ? source.value
    : source.value.filter((event) => event.eventType === typeFilter.value)
)

// También el roster: las tarjetas lo necesitan para traducir el nombre del
// Pokémon del título y para sacar su sprite. Sin esto, entrando directo a
// /events los títulos se quedaban a medio traducir.
onMounted(() => {
  live.load()
  gameData.load()
})
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">{{ $t('nav.events') }}</h1>

    <!--
      En escritorio ancho, como en el Top: barra lateral fija con las pestañas y
      los tipos (un clic, con cuántos hay de cada uno) y las tarjetas a su
      derecha. Por debajo, pestañas y desplegable encima de la lista.
    -->
    <div :class="ancho ? 'grid grid-cols-[240px_minmax(0,1fr)] gap-6 items-start' : ''">
      <aside
        :class="ancho
          ? '[@media(min-height:720px)]:sticky top-[104px] flex flex-col gap-4 p-4 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900'
          : ''"
      >
        <div :class="ancho ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2 mb-3'">
          <base-pill-button
            v-for="name in TABS"
            :key="name"
            :active="tab === name"
            @click="tab = name"
          >
            {{ $t(`events.${name}`) }}
          </base-pill-button>
        </div>

        <div v-if="ancho" role="group" aria-labelledby="eventos-tipo">
          <span
            id="eventos-tipo"
            class="block mb-1 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300"
          >
            {{ $t('events.filterType') }}
          </span>
          <ul class="flex flex-col gap-0.5">
            <li v-for="option in typeOptions" :key="option.value">
              <button
                type="button"
                class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm text-left rounded-lg transition-colors"
                :class="typeFilter === option.value
                  ? 'bg-gray-500 dark:bg-gray-600 text-white'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800'"
                :aria-label="option.label"
                :aria-pressed="typeFilter === option.value"
                @click="typeFilter = option.value"
              >
                <span class="min-w-0">{{ option.name }}</span>
                <span
                  class="shrink-0 text-mini tabular-nums"
                  :class="typeFilter === option.value ? 'text-white' : 'text-gray-600 dark:text-gray-300'"
                >{{ option.count }}</span>
              </button>
            </li>
          </ul>
        </div>

        <div v-else class="flex flex-wrap items-end gap-3 mb-4">
          <base-filter-select
            v-model="typeFilter"
            :label="$t('events.filterType')"
            :options="typeOptions"
            class="flex-1 min-w-[180px] max-w-xs"
          />
        </div>
      </aside>

      <div class="min-w-0">
        <!-- Solo salta si los datos se han quedado viejos. -->
        <data-freshness :age-ms="live.cacheAge" :stale="live.isStale" class="mb-3" />

        <p v-if="mostrarNotaMax" class="text-mini text-gray-600 dark:text-gray-300 mb-3">
          {{ $t('max.battlesNote') }}
        </p>

        <skeleton-loader v-if="live.status === 'loading' || live.status === 'idle'">
          <div :class="rejilla">
            <div
              v-for="n in 6"
              :key="n"
              class="p-3 sm:p-4 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
            >
              <span class="esqueleto block -mx-3 -mt-3 mb-2.5 h-24 sm:-mx-4 sm:-mt-4 sm:mb-3 sm:h-32 rounded-t-xl rounded-b-none"></span>
              <div class="flex gap-4 items-start">
                <span class="esqueleto w-14 h-[4.5rem] sm:w-16 sm:h-20 shrink-0 rounded-xl"></span>
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

        <div v-else :class="rejilla">
          <event-card v-for="event in list" :key="event.eventID" :event="event" />
        </div>
      </div>
    </div>
  </section>
</template>
