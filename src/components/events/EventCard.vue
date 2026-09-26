<script setup>
import { computed } from 'vue'
import { useLiveStore } from '../../stores/live'
import { useGameDataStore } from '../../stores/gameData'
import { formatDateTime, formatDuration } from '../../utils/time'
import { useTranslate } from '../../composables/useTranslate'
import { parseEventName, splitPokemonList, translatePokemonName } from '../../utils/eventName'

const props = defineProps({
  event: { type: Object, required: true }
})

const live = useLiveStore()
const gameData = useGameDataStore()
const { t, te, locale } = useTranslate()

/** LeekDuck publica tipos nuevos de vez en cuando: si falta, usamos su título. */
const typeLabel = computed(() => {
  const key = `events.types.${props.event.eventType}`
  return te(key) ? t(key) : props.event.heading || t('events.types.event')
})

const countdown = computed(() => {
  const target = props.event.status === 'upcoming' ? props.event.startDate : props.event.endDate
  if (!target) return null
  const remaining = target.getTime() - live.now.getTime()
  if (remaining <= 0) return null
  const prefix = props.event.status === 'upcoming' ? t('events.startsIn') : t('events.endsIn')
  return { text: `${prefix} ${formatDuration(remaining)}`, urgent: remaining < 6 * 3600 * 1000 }
})

/**
 * El título llega en inglés desde LeekDuck ("Mega Malamar in Mega Raids").
 * Si sigue uno de los patrones conocidos se arma en el idioma de la interfaz;
 * si no (eventos con nombre propio como "LEGO Stores and Pokémon GO"), se deja
 * tal cual, que traducirlos sería peor.
 */
const displayName = computed(() => {
  const parts = parseEventName(props.event.name)
  if (!parts) return props.event.name

  const key = `events.names.${parts.key}`
  if (!te(key)) return props.event.name

  // Hay eventos con varios protagonistas: se traduce cada uno y se unen con
  // la conjunción del idioma, que el "and" inglés en mitad de una frase en
  // español canta mucho.
  const nombres = splitPokemonList(parts.pokemon).map((uno) =>
    translatePokemonName(uno, gameData.namesEs, (form, base) =>
      t(`events.forms.${form}`, { pokemon: base })
    )
  )
  const pokemon =
    nombres.length > 1
      ? `${nombres.slice(0, -1).join(', ')} ${t('and')} ${nombres.at(-1)}`
      : nombres[0] ?? parts.pokemon

  return t(key, { pokemon, tier: parts.tier })
})

const spotlight = computed(() => props.event.extraData?.spotlight ?? null)
const communityDay = computed(() => props.event.extraData?.communityday ?? null)
const raidBosses = computed(() => props.event.extraData?.raidbattles?.bosses ?? [])
</script>

<template>
  <article
    class="flex flex-col p-4 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
  >
    <div class="flex gap-3 items-start">
      <img
        v-if="event.image"
        :src="event.image"
        alt=""
        class="w-20 h-14 shrink-0 object-cover rounded-xl bg-gray-100 dark:bg-gray-800"
        loading="lazy"
      />
      <div class="min-w-0 flex flex-col items-start gap-1">
        <span
          class="px-2 py-0.5 text-mini uppercase tracking-wider rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
        >
          {{ typeLabel }}
        </span>
        <h3 class="text-sm font-bold leading-snug">{{ displayName }}</h3>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 mt-3">
      <span
        v-if="event.status === 'active'"
        class="flex items-center gap-1 px-2 py-0.5 text-mini rounded-full border border-green-500 text-green-700 dark:text-green-400"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        {{ $t('events.inProgress') }}
      </span>
      <span
        v-if="countdown"
        class="px-2 py-0.5 text-mini rounded-full border"
        :class="
          countdown.urgent
            ? 'border-amber-500 text-amber-700 dark:text-amber-400'
            : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
        "
      >
        {{ countdown.text }}
      </span>
      <span
        v-else-if="event.status === 'undated'"
        class="px-2 py-0.5 text-mini rounded-full border border-gray-300 dark:border-gray-600 text-gray-500"
      >
        {{ $t('events.noDate') }}
      </span>
    </div>

    <p v-if="event.startDate" class="mt-2 text-mini text-gray-500 dark:text-gray-400">
      {{ formatDateTime(event.startDate, locale() === 'en' ? 'en-GB' : 'es-ES') }}
      <template v-if="event.endDate">
        → {{ formatDateTime(event.endDate, locale() === 'en' ? 'en-GB' : 'es-ES') }}
      </template>
    </p>

    <!-- Hora destacada: el Pokémon y la bonificación son lo que importa -->
    <div
      v-if="spotlight"
      class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
    >
      <img v-if="spotlight.image" :src="spotlight.image" :alt="spotlight.name" class="w-8 h-8" />
      <div class="min-w-0">
        <strong class="text-sm">{{ spotlight.name }}</strong>
        <span v-if="spotlight.canBeShiny" class="ml-1 text-amber-600 dark:text-amber-400">✦</span>
        <div class="text-mini text-gray-500 dark:text-gray-400">{{ gameData.translateText(spotlight.bonus) }}</div>
      </div>
    </div>

    <div v-if="communityDay" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div class="flex flex-wrap items-center gap-2">
        <span v-for="spawn in communityDay.spawns" :key="spawn.name" class="flex items-center gap-1">
          <img :src="spawn.image" :alt="spawn.name" class="w-7 h-7" />
          <span class="text-mini">{{ spawn.name }}</span>
        </span>
      </div>
      <div class="flex flex-wrap gap-1 mt-2">
        <span
          v-for="bonus in communityDay.bonuses"
          :key="bonus.text"
          class="px-2 py-0.5 text-mini rounded-full border border-green-400 text-green-700 dark:text-green-400"
        >
          {{ gameData.translateText(bonus.text) }}
        </span>
      </div>
    </div>

    <div v-if="raidBosses.length" class="flex flex-wrap gap-2 mt-3">
      <span
        v-for="boss in raidBosses"
        :key="boss.name"
        class="flex items-center gap-1 px-2 py-0.5 text-mini rounded-full border border-gray-300 dark:border-gray-600"
      >
        <img v-if="boss.image" :src="boss.image" alt="" class="w-5 h-5" />
        {{ boss.name }}
      </span>
    </div>

    <a
      v-if="event.link"
      :href="event.link"
      target="_blank"
      rel="noopener"
      class="mt-3 text-mini text-gray-500 dark:text-gray-400 underline self-start"
    >
      {{ $t('events.seeOnLeekDuck') }} ↗
    </a>
  </article>
</template>
