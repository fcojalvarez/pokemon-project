<script setup>
import { computed, ref, watch } from 'vue'
import { useLiveStore } from '../../stores/live'
import { useGameDataStore } from '../../stores/gameData'
import { formatDateTime, formatDuration } from '../../utils/time'
import { useTranslate } from '../../composables/useTranslate'
import {
  parseEventName,
  parseMaxBattle,
  splitPokemonList,
  translatePokemonName
} from '../../utils/eventName'
import { spriteUrl } from '../../utils/sprites'
import { summarizeEvent } from '../../utils/eventSummary'
import MaxMark from '../pokemon/MaxMark.vue'
import ShinyMark from '../pokemon/ShinyMark.vue'

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

/**
 * Combate Max: qué Pokémon sale y si es Dinamax o Gigamax.
 *
 * LeekDuck no lo publica en un campo propio ni pone su imagen (la del evento
 * es un cartel), así que se lee del título y se busca en el roster para sacar
 * el sprite y poder enlazar a su ficha. Algunos no nombran a ninguno
 * ("Dynamax Max Battle Day"): entonces se enseña solo la marca.
 */
/**
 * LeekDuck publica a veces una imagen que no existe: ahora mismo las cinco
 * City Safari apuntan a un `safarizone-default.jpg` que da 404. Sin esto, el
 * navegador deja su icono de imagen rota en mitad de la tarjeta.
 */
const imagenRota = ref(false)
watch(() => props.event.image, () => { imagenRota.value = false })

const maxBattle = computed(() => {
  const parsed = parseMaxBattle(props.event.name)
  if (!parsed) return null

  const clave = parsed.pokemon?.toLowerCase().replace(/[^a-z0-9]/g, '')
  const entry = clave && gameData.isReady
    ? gameData.roster.find(
        (p) => !p.mega && !p.shadow && p.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clave
      ) ?? null
    : null

  return {
    gigantamax: parsed.gigantamax,
    nameEs: entry?.nameEs ?? parsed.pokemon,
    dex: entry?.dex ?? null,
    image: entry ? spriteUrl(entry.spriteId) : null
  }
})

/**
 * Nombre de un Pokémon en español. LeekDuck los publica en inglés y con la
 * forma entre paréntesis; se reutiliza el mismo traductor que los títulos para
 * que «Shadow Thundurus (Incarnate Forme)» salga igual en los dos sitios.
 */
const nombreEs = (nombre) =>
  translatePokemonName(nombre, gameData.namesEs, (form, base) =>
    t(`events.forms.${form}`, { pokemon: base })
  )

/**
 * Resumen del evento a partir de `extraData`.
 *
 * LeekDuck no publica descripciones, así que esto no traduce ninguna: arma en
 * español lo que de verdad se quiere saber con los datos sueltos que sí trae.
 * Aquí se pintan solo las partes que no cubren ya los bloques de hora
 * destacada, Día de la Comunidad e incursiones.
 */
const resumen = computed(() => summarizeEvent(props.event))

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
        v-if="event.image && !imagenRota"
        :src="event.image"
        alt=""
        class="w-20 h-14 shrink-0 object-cover rounded-xl bg-gray-100 dark:bg-gray-800"
        loading="lazy"
        @error="imagenRota = true"
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

    <!--
      Combate Max: la marca dice de un vistazo si es Dinamax (hueca) o Gigamax
      (rellena), que es lo que de verdad cambia entre un lunes Max y un Día de
      Combates Max.
    -->
    <div
      v-if="maxBattle"
      class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
    >
      <max-mark
        :variant="maxBattle.gigantamax ? 'gigantamax' : 'dynamax'"
        :size="20"
        class="shrink-0 text-gray-700 dark:text-gray-200"
      />
      <component
        :is="maxBattle.dex ? 'router-link' : 'span'"
        :to="maxBattle.dex ? `/pokemon/${maxBattle.dex}` : undefined"
        class="flex items-center gap-2 min-w-0"
        :class="maxBattle.dex ? 'hover:underline' : ''"
      >
        <img v-if="maxBattle.image" :src="maxBattle.image" alt="" class="w-8 h-8" loading="lazy" />
        <strong v-if="maxBattle.nameEs" class="text-sm truncate">{{ maxBattle.nameEs }}</strong>
        <span v-else class="text-sm font-semibold">
          {{ $t(maxBattle.gigantamax ? 'max.legendGigantamax' : 'max.legendDynamax') }}
        </span>
      </component>
    </div>

    <!-- Hora destacada: el Pokémon y la bonificación son lo que importa -->
    <div
      v-if="spotlight"
      class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
    >
      <img v-if="spotlight.image" :src="spotlight.image" :alt="spotlight.name" class="w-8 h-8" />
      <div class="min-w-0">
        <strong class="text-sm">{{ nombreEs(spotlight.name) }}</strong>
        <shiny-mark
          v-if="spotlight.canBeShiny"
          variant="dex"
          size="text-mini"
          class="inline-block align-middle ml-1 scale-90"
          :title="$t('pokemon.shinyLegend')"
        />
        <div class="text-mini text-gray-500 dark:text-gray-400">{{ gameData.translateText(spotlight.bonus) }}</div>
      </div>
    </div>

    <div v-if="communityDay" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div class="flex flex-wrap items-center gap-2">
        <span v-for="spawn in communityDay.spawns" :key="spawn.name" class="flex items-center gap-1">
          <img :src="spawn.image" :alt="spawn.name" class="w-7 h-7" />
          <span class="text-mini">{{ nombreEs(spawn.name) }}</span>
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
        {{ nombreEs(boss.name) }}
      </span>
    </div>

    <!--
      Lo que trae el evento y no sale arriba. Para la mayoría de eventos
      («generic») esto es lo único que hay: LeekDuck no publica descripción,
      solo si hay apariciones en libertad y si hay tareas de campo.
    -->
    <div
      v-if="resumen && (resumen.hasSpawns || resumen.hasResearch || resumen.shinies.length)"
      class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
    >
      <div v-if="resumen.hasSpawns || resumen.hasResearch" class="flex flex-wrap gap-1.5">
        <span
          v-if="resumen.hasSpawns"
          class="px-2 py-0.5 text-mini rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
        >
          {{ $t('events.hasSpawns') }}
        </span>
        <span
          v-if="resumen.hasResearch"
          class="px-2 py-0.5 text-mini rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
        >
          {{ $t('events.hasResearch') }}
        </span>
      </div>

      <div v-if="resumen.shinies.length" class="mt-2">
        <p class="text-mini text-gray-500 dark:text-gray-400">{{ $t('events.shinies') }}</p>
        <div class="flex flex-wrap items-center gap-2 mt-1">
          <span
            v-for="uno in resumen.shinies"
            :key="uno.name"
            class="flex items-center gap-1 text-mini"
          >
            <img v-if="uno.image" :src="uno.image" alt="" class="w-6 h-6" loading="lazy" />
            {{ nombreEs(uno.name) }}
          </span>
        </div>
      </div>
    </div>

    <p
      v-for="nota in resumen?.notes ?? []"
      :key="nota"
      class="mt-2 text-mini text-gray-500 dark:text-gray-400"
    >
      {{ gameData.translateText(nota) }}
    </p>

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
