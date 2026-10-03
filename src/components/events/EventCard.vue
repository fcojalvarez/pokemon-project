<script setup>
import { computed, ref, watch } from 'vue'
import { useLiveStore } from '../../stores/live'
import { useGameDataStore } from '../../stores/gameData'
import { formatDuration } from '../../utils/time'
import { useTranslate } from '../../composables/useTranslate'
import { useEventos } from '../../composables/useEventos'
import { parseMaxBattle } from '../../utils/eventName'
import { spriteUrl } from '../../utils/sprites'
import { eventImageSrc, eventImageSrcset } from '../../utils/eventImage'
import { summarizeEvent } from '../../utils/eventSummary'
import MaxMark from '../pokemon/MaxMark.vue'
import EventMon from './EventMon.vue'
import EventDateBlock from './EventDateBlock.vue'

const props = defineProps({
  event: { type: Object, required: true },
  /** Dentro del detalle del evento: cartel en grande y sin abrir nada al pulsar. */
  detalle: Boolean,
  /** Bonus de la noticia oficial, si la hay (ya en el idioma de la app). */
  bonus: { type: Array, default: () => [] }
})
const emit = defineEmits(['abrir'])

const live = useLiveStore()
const gameData = useGameDataStore()
const { t, localName, intlLocale } = useTranslate()

const { tipoDeEvento, tituloDeEvento } = useEventos()
const typeLabel = computed(() => tipoDeEvento(props.event))

/**
 * La cuenta atrás. El reloj va al segundo, pero el texto solo cambia cuando
 * cambia lo que se ve («2 h 14 min» dura un minuto entero): por eso son dos
 * valores sueltos (texto y urgencia) y no un objeto, que al ser uno nuevo cada
 * segundo repintaba todas las tarjetas aunque dijeran lo mismo.
 */
const restante = () => {
  const target = props.event.status === 'upcoming' ? props.event.startDate : props.event.endDate
  return target ? target.getTime() - live.now.getTime() : 0
}
const countdownText = computed(() => {
  const ms = restante()
  if (ms <= 0) return null
  const prefix = props.event.status === 'upcoming' ? t('events.startsIn') : t('events.endsIn')
  return `${prefix} ${formatDuration(ms)}`
})
const countdownUrgent = computed(() => restante() > 0 && restante() < 6 * 3600 * 1000)

/**
 * El día de inicio ya lo dice la hoja de calendario; aquí va el resto:
 * «14:00 → 17:00» si acaba ese mismo día, «02:00 → dom 27, 18:00» si no, y
 * con el mes si acaba en otro.
 */
const horario = computed(() => {
  const { startDate: inicio, endDate: fin } = props.event
  if (!inicio) return ''
  const fmt = (date, opciones) => new Intl.DateTimeFormat(intlLocale(), opciones).format(date)
  const hora = (date) => fmt(date, { hour: '2-digit', minute: '2-digit' })
  if (!fin) return hora(inicio)
  if (inicio.toDateString() === fin.toDateString()) return `${hora(inicio)} → ${hora(fin)}`
  const dia = fmt(
    fin,
    inicio.getMonth() === fin.getMonth()
      ? { weekday: 'short', day: 'numeric' }
      : { weekday: 'short', day: 'numeric', month: 'short' }
  )
  return `${hora(inicio)} → ${dia}, ${hora(fin)}`
})

/** El título en el idioma de la app, sin el tipo delante si lo repite (useEventos). */
const titulo = computed(() => tituloDeEvento(props.event))

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
/**
 * La tarjeta entera abre el detalle del evento (con la noticia oficial, si la
 * hay, y los enlaces a ella y a LeekDuck).
 *
 * El botón de verdad está en el título —hace falta uno real para llegar con
 * el teclado y que un lector de pantalla lo anuncie—, y esto solo añade que
 * valga pinchar en cualquier parte. Se ignora el clic que cae sobre otro
 * enlace o botón (los Pokémon llevan a su ficha) para no robarle su destino.
 */
const abrirEvento = (evento) => {
  if (props.detalle) return
  if (evento.target.closest('a, button')) return
  emit('abrir', props.event)
}

const imagenRota = ref(false)
/**
 * Primero se pide el cartel redimensionado; si el redimensionado falla, se
 * prueba con el original antes de darla por rota.
 */
const sinRedimensionar = ref(false)
watch(
  () => props.event.image,
  () => {
    imagenRota.value = false
    sinRedimensionar.value = false
  }
)

const cartel = computed(() => {
  const url = props.event.image
  if (!url || imagenRota.value) return null
  if (sinRedimensionar.value) return { src: url, srcset: null }
  return { src: eventImageSrc(url), srcset: eventImageSrcset(url) }
})

const alFallarCartel = () => {
  if (!sinRedimensionar.value && eventImageSrcset(props.event.image)) sinRedimensionar.value = true
  else imagenRota.value = true
}

const maxBattle = computed(() => {
  const parsed = parseMaxBattle(props.event.name)
  if (!parsed) return null

  const entry = parsed.pokemon ? gameData.baseByName(parsed.pokemon) : null

  return {
    gigantamax: parsed.gigantamax,
    // Sin entrada en el roster solo queda el nombre del título, en inglés.
    label: entry ? localName(entry) : parsed.pokemon,
    dex: entry?.dex ?? null,
    image: entry ? spriteUrl(entry.spriteId) : null
  }
})

/**
 * Resumen del evento a partir de `extraData`.
 *
 * LeekDuck no publica descripciones, así que esto no traduce ninguna: arma en
 * español lo que de verdad se quiere saber con los datos sueltos que sí trae.
 * Aquí se pintan solo las partes que no cubren ya los bloques de hora
 * destacada, Día de la Comunidad e incursiones.
 */
const resumen = computed(() => summarizeEvent(props.event))

/**
 * Nombres que pueden salir variocolor.
 *
 * LeekDuck lo publica de dos formas: como `canBeShiny` en cada Pokémon y como
 * una lista `shinies` aparte. Se juntan aquí para poder marcar la estrella
 * sobre el Pokémon en vez de sacar una sección de «variocolor disponible»,
 * que es del Pokémon y no del evento.
 */
const conVariocolor = computed(() => new Set((resumen.value?.shinies ?? []).map((uno) => uno.name)))

const esVariocolor = (uno) => !!uno?.canBeShiny || conVariocolor.value.has(uno?.name)

const spotlight = computed(() => props.event.extraData?.spotlight ?? null)
const communityDay = computed(() => props.event.extraData?.communityday ?? null)

/**
 * Los bonus, en una lista corta y con el mismo aspecto en todas las tarjetas.
 *
 * Si hay noticia oficial, su texto: es el del juego («Triple de PX por
 * capturar Pokémon») y trae todos. Si no, los que da LeekDuck, traducidos.
 * Antes el Día de la Comunidad los pintaba como pastillas verdes, y las largas
 * se volvían bloques de cuatro líneas: la tarjeta medía una pantalla.
 *
 * En la tarjeta, los tres primeros y cuántos más hay. En el detalle, ninguno:
 * van en su propio bloque, con iconos (EventBonus).
 */
const MAX_BONUS = 3
const oficial = computed(() => props.bonus.length > 0)
const todosLosBonus = computed(() =>
  oficial.value
    ? props.bonus
    : (communityDay.value?.bonuses ?? []).map((uno) => gameData.translateText(uno.text))
)
const bonusVisibles = computed(() => {
  if (props.detalle) return []
  return todosLosBonus.value.slice(0, MAX_BONUS)
})
const bonusOcultos = computed(() =>
  props.detalle ? 0 : todosLosBonus.value.length - bonusVisibles.value.length
)
const raidBosses = computed(() => props.event.extraData?.raidbattles?.bosses ?? [])

// El detalle usa el título para el calendario (el mismo traducido que se ve)
// y los bonus para su bloque propio (EventBonus).
defineExpose({ titulo, todosLosBonus })
</script>

<template>
  <article
    class="flex flex-col text-gray-800 dark:text-gray-200"
    :class="
      detalle
        ? 'p-4'
        : 'p-3 sm:p-4 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900 cursor-pointer hover:border-gray-400 dark:hover:border-gray-600'
    "
    @click="abrirEvento"
  >
    <!--
      En móvil el `sizes` se queda corto a propósito (66vw): un teléfono de
      densidad 3 pedía la de 1200 px para un cartel de 96 px de alto y
      recortado. Así se queda en la de 800, que no se distingue y pesa menos.

      El cartel del evento, de cabecera a todo lo ancho. Si LeekDuck no publica
      imagen, o la que publica no existe, la tarjeta empieza por la fecha.
    -->
    <img
      v-if="cartel"
      :key="cartel.src"
      :src="cartel.src"
      :srcset="cartel.srcset ?? undefined"
      crossorigin="anonymous"
      :sizes="
        detalle
          ? '(min-width: 768px) 768px, 100vw'
          : '(min-width: 1536px) 30vw, (min-width: 1280px) 40vw, (min-width: 768px) 50vw, (min-width: 640px) 100vw, 66vw'
      "
      alt=""
      class="max-w-none object-cover bg-gray-100 dark:bg-gray-800"
      :class="
        detalle
          ? '-mx-4 -mt-4 mb-4 w-[calc(100%+2rem)] h-auto aspect-video'
          : '-mx-3 -mt-3 mb-2.5 w-[calc(100%+1.5rem)] h-24 sm:-mx-4 sm:-mt-4 sm:mb-3 sm:w-[calc(100%+2rem)] sm:h-32 rounded-t-xl'
      "
      loading="lazy"
      decoding="async"
      @error="alFallarCartel"
    />

    <!-- La fecha, lo primero que se busca: la hoja de calendario a la izquierda. -->
    <div class="flex gap-3 sm:gap-4">
      <event-date-block
        v-if="event.startDate"
        :date="event.startDate"
        :active="event.status === 'active'"
        class="shrink-0 self-start"
      />

      <div class="min-w-0 flex-1 flex flex-col">
        <div class="flex flex-col items-start gap-1">
          <!-- La flecha dice que la tarjeta entera abre el detalle: antes no había nada que lo indicara. -->
          <span class="self-stretch flex items-center justify-between gap-2">
            <span
              class="px-2 py-0.5 text-mini uppercase tracking-wider rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
            >
              {{ typeLabel }}
            </span>
            <span
              v-if="!detalle"
              class="shrink-0 text-lg leading-none text-gray-500 dark:text-gray-400"
              aria-hidden="true"
              >›</span
            >
          </span>
          <!-- Siempre un h2 (la página lleva su h1), con el enlace dentro si lo hay. -->
          <h2 class="font-bold leading-snug" :class="detalle ? 'text-lg' : 'text-sm sm:text-base'">
            <template v-if="detalle">{{ titulo }}</template>
            <button
              v-else
              type="button"
              class="text-left hover:underline"
              @click="emit('abrir', event)"
            >
              {{ titulo }}
            </button>
          </h2>
        </div>

        <!-- El horario entero y, debajo, la cuenta atrás: primero cuándo, luego cuánto falta. -->
        <p v-if="horario" class="mt-1.5 sm:mt-2 text-xs sm:text-sm tabular-nums">{{ horario }}</p>
        <p v-if="event.status === 'active' || countdownText" class="mt-0.5 text-mini">
          <span v-if="event.status === 'active'" class="text-green-700 dark:text-green-400"
            >● {{ $t('events.inProgress') }}</span
          >
          <template v-if="event.status === 'active' && countdownText"> · </template>
          <span
            v-if="countdownText"
            :class="
              countdownUrgent
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-gray-600 dark:text-gray-300'
            "
            >{{ countdownText }}</span
          >
        </p>

        <!--
          Combate Max: la marca dice de un vistazo si es Dinamax (hueca) o Gigamax
          (rellena), que es lo que de verdad cambia entre un lunes Max y un Día de
          Combates Max.
        -->
        <div
          v-if="maxBattle"
          class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-300 dark:border-gray-700"
        >
          <max-mark
            :variant="maxBattle.gigantamax ? 'gigantamax' : 'dynamax'"
            :size="20"
            class="shrink-0 text-gray-800 dark:text-gray-200"
          />
          <component
            :is="maxBattle.dex ? 'router-link' : 'span'"
            :to="maxBattle.dex ? `/pokemon/${maxBattle.dex}` : undefined"
            class="flex items-center gap-2 min-w-0"
            :class="maxBattle.dex ? 'hover:underline' : ''"
          >
            <img
              v-if="maxBattle.image"
              :src="maxBattle.image"
              alt=""
              crossorigin="anonymous"
              class="w-8 h-8"
              loading="lazy"
            />
            <strong v-if="maxBattle.label" class="text-sm truncate">{{ maxBattle.label }}</strong>
            <span v-else class="text-sm font-semibold">
              {{ $t(maxBattle.gigantamax ? 'max.legendGigantamax' : 'max.legendDynamax') }}
            </span>
          </component>
        </div>

        <!-- Hora destacada: el Pokémon y la bonificación son lo que importa -->
        <div
          v-if="spotlight"
          class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-300 dark:border-gray-700"
        >
          <div class="min-w-0">
            <event-mon
              :name="spotlight.name"
              :image="spotlight.image"
              :can-be-shiny="esVariocolor(spotlight)"
              class="text-sm font-bold"
            />
            <div class="text-mini text-gray-600 dark:text-gray-300">
              {{ gameData.translateText(spotlight.bonus) }}
            </div>
          </div>
        </div>

        <div v-if="communityDay" class="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700">
          <div class="flex flex-wrap items-center gap-2">
            <event-mon
              v-for="spawn in communityDay.spawns"
              :key="spawn.name"
              :name="spawn.name"
              :image="spawn.image"
              :can-be-shiny="esVariocolor(spawn)"
              sprite-class="w-7 h-7"
              class="text-mini"
            />
          </div>
        </div>

        <div v-if="raidBosses.length" class="flex flex-wrap gap-2 mt-3">
          <event-mon
            v-for="boss in raidBosses"
            :key="boss.name"
            :name="boss.name"
            :image="boss.image"
            :can-be-shiny="esVariocolor(boss)"
            sprite-class="w-5 h-5"
            class="px-2 py-0.5 text-mini rounded-full border border-gray-300 dark:border-gray-600"
          />
        </div>

        <div
          v-if="bonusVisibles.length"
          class="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700"
        >
          <p class="text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300">
            {{ $t('events.bonus') }}
          </p>
          <ul class="mt-1 flex flex-col gap-0.5 pl-4 list-disc text-xs">
            <li v-for="uno in bonusVisibles" :key="uno">{{ uno }}</li>
          </ul>
          <button
            v-if="bonusOcultos > 0"
            type="button"
            class="mt-1 text-mini text-gray-600 dark:text-gray-300 underline"
            @click="emit('abrir', event)"
          >
            {{ $tc('events.moreBonus', bonusOcultos, { n: bonusOcultos }) }}
          </button>
        </div>

        <!--
          Lo que trae el evento y no sale arriba. Para la mayoría de eventos
          («generic») esto es lo único que hay: LeekDuck no publica descripción,
          solo si hay apariciones en libertad y si hay tareas de campo.
        -->
        <!-- En el detalle no: ahí están los Pokémon del evento, con su sprite. -->
        <div
          v-if="!detalle && resumen && (resumen.hasSpawns || resumen.hasResearch)"
          class="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700"
        >
          <div v-if="resumen.hasSpawns || resumen.hasResearch" class="flex flex-wrap gap-1.5">
            <span
              v-if="resumen.hasSpawns"
              class="px-2 py-0.5 text-mini rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
            >
              {{ $t('events.hasSpawns') }}
            </span>
            <span
              v-if="resumen.hasResearch"
              class="px-2 py-0.5 text-mini rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
            >
              {{ $t('events.hasResearch') }}
            </span>
          </div>
        </div>

        <p
          v-for="nota in detalle && !oficial ? resumen?.notes ?? [] : []"
          :key="nota"
          class="mt-2 text-mini text-gray-600 dark:text-gray-300"
        >
          {{ gameData.translateText(nota) }}
        </p>
      </div>
    </div>
  </article>
</template>
