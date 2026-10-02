<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useLiveStore } from '../stores/live'
import { useGameDataStore } from '../stores/gameData'
import BaseEmptyState from '../components/base/BaseEmptyState.vue'
import BaseErrorMessage from '../components/base/BaseErrorMessage.vue'
import BasePillButton from '../components/base/BasePillButton.vue'
import BaseSidebar from '../components/base/BaseSidebar.vue'
import BaseFilterList from '../components/base/BaseFilterList.vue'
import BaseSegmented from '../components/base/BaseSegmented.vue'
import DataFreshness from '../components/shared/DataFreshness.vue'
import SkeletonLoader from '../components/base/SkeletonLoader.vue'
import EventCard from '../components/events/EventCard.vue'
import EventDetail from '../components/events/EventDetail.vue'
import { cargarNoticias } from '../stores/gameData'
import { useTranslate } from '../composables/useTranslate'
import { entre, useFiltrosEnUrl } from '../composables/useFiltrosEnUrl'
import { useMedia } from '../composables/useMedia'
import { useEventos } from '../composables/useEventos'

const live = useLiveStore()
const gameData = useGameDataStore()
const { t, locale } = useTranslate()
const { tipoDeEvento, bonusDeEvento } = useEventos()

// Mismo corte que el Top: en escritorio ancho, filtros en una barra lateral.
const ancho = useMedia('(min-width: 1280px)')

const tab = ref('active')
const typeFilter = ref('all')
/** El evento con el detalle abierto (tarjeta en grande y noticia oficial). */
const abierto = ref(null)

/** Bonus de la noticia oficial de cada evento, para enseñarlos en su tarjeta. */
const noticias = ref(null)

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

/** Los tipos de la pestaña, con cuántos hay de cada uno, y «Todos» delante. */
const typeOptions = computed(() => {
  const seen = new Map()
  for (const event of source.value) {
    const previo = seen.get(event.eventType)
    seen.set(event.eventType, {
      label: previo?.label ?? tipoDeEvento(event),
      count: (previo?.count ?? 0) + 1
    })
  }
  return [
    { value: 'all', label: t('common.all'), count: source.value.length },
    ...[...seen.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, locale()))
  ]
})

/** Las pestañas, para el selector segmentado de móvil y tablet. */
const tabOptions = computed(() => TABS.map((name) => ({ value: name, label: t(`events.${name}`) })))

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
onMounted(async () => {
  live.load()
  gameData.load()
  noticias.value = await cargarNoticias()
})
</script>

<template>
  <section class="text-gray-800 dark:text-gray-200">
    <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">{{ $t('nav.events') }}</h1>
    <!-- Como el Top y «Ahora»: el título y qué hay en la página. -->
    <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3">{{ $t('events.intro') }}</p>

    <!--
      En escritorio ancho, como en el Top: barra lateral fija con las pestañas y
      los tipos (un clic, con cuántos hay de cada uno) y las tarjetas a su
      derecha. Por debajo, el selector de pestañas y los tipos en una fila de
      chips, como los grupos de «Ahora»: el desplegable eran dos renglones y un
      toque de más para ver qué tipos había.
    -->
    <div :class="ancho ? 'grid grid-cols-[240px_minmax(0,1fr)] gap-6 items-start' : ''">
      <base-sidebar :activa="ancho">
        <div v-if="ancho" class="grid grid-cols-2 gap-2">
          <base-pill-button
            v-for="name in TABS"
            :key="name"
            :active="tab === name"
            @click="tab = name"
          >
            {{ $t(`events.${name}`) }}
          </base-pill-button>
        </div>
        <base-segmented v-else v-model="tab" :options="tabOptions" class="mb-3" />

        <div v-if="ancho" role="group" aria-labelledby="eventos-tipo">
          <span
            id="eventos-tipo"
            class="block mb-1 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300"
          >
            {{ $t('events.filterType') }}
          </span>
          <base-filter-list v-model="typeFilter" :options="typeOptions" />
        </div>

        <!-- top-16 / sm:top-14: justo debajo de la cabecera fija (64 px en móvil, 56 desde sm). -->
        <div
          v-else-if="typeOptions.length > 2"
          role="group"
          :aria-label="$t('events.filterType')"
          class="sticky top-16 sm:top-14 z-10 -mx-4 px-4 py-2 mb-3 flex gap-2 overflow-x-auto bg-gray-100 dark:bg-gray-700 [scrollbar-width:none]"
        >
          <button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            class="shrink-0 px-3 py-1.5 text-xs rounded-full border border-gray-400 dark:border-gray-500"
            :class="typeFilter === option.value
              ? 'bg-gray-500 dark:bg-gray-600 text-white'
              : 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200'"
            :aria-pressed="typeFilter === option.value"
            @click="typeFilter = option.value"
          >
            {{ option.label }}
            <span class="text-mini tabular-nums" :class="typeFilter === option.value ? 'text-white' : 'text-gray-600 dark:text-gray-300'">({{ option.count }})</span>
          </button>
        </div>
      </base-sidebar>

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
          <event-card v-for="event in list" :key="event.eventID" :event="event" :bonus="bonusDeEvento(noticias, event)" @abrir="abierto = $event" />
        </div>
      </div>
    </div>

    <event-detail :event="abierto" @close="abierto = null" />
  </section>
</template>
