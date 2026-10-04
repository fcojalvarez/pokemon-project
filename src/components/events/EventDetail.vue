<script setup>
/**
 * Detalle de un evento, en un modal.
 *
 * Primero lo útil: la propia tarjeta en grande (cartel, fecha, horario y
 * bonus) y los Pokémon que nombra la noticia, con su sprite. La noticia
 * oficial de Pokémon GO va al final y plegada: entera eran tres o cuatro
 * pantallas de texto y lo que se busca quedaba enterrado. Si no la hay, queda
 * lo de LeekDuck y el enlace a su página.
 */
import { computed, ref, watch } from 'vue'
import { cargarNoticias } from '../../stores/gameData'
import { useTranslate } from '../../composables/useTranslate'
import { useEventos } from '../../composables/useEventos'
import { enlaceSeguro } from '../../utils/safeUrl'
import { esApple, urlGoogleCalendar, urlIcs } from '../../utils/ics'
import BaseModal from '../base/BaseModal.vue'
import BaseSprite from '../base/BaseSprite.vue'
import BaseChevron from '../base/BaseChevron.vue'
import EventCard from './EventCard.vue'
import EventBonus from './EventBonus.vue'
import { useGameDataStore } from '../../stores/gameData'
import { localName } from '../../composables/useTranslate'
import { pokemonEnTexto } from '../../utils/pokemonEnTexto'
import { spriteUrl } from '../../utils/sprites'

const props = defineProps({
  /** El evento abierto, o null con el modal cerrado. */
  event: { type: Object, default: null }
})
const emit = defineEmits(['close'])

const { locale } = useTranslate()
const { bonusDeEvento } = useEventos()
const datos = ref(null)
const cargando = ref(false)

watch(
  () => props.event,
  async (evento) => {
    if (!evento || datos.value) return
    cargando.value = true
    datos.value = await cargarNoticias()
    cargando.value = false
  },
  { immediate: true }
)

const noticia = computed(() => {
  const slug = datos.value?.eventos?.[props.event?.eventID]
  const entrada = slug ? datos.value.noticias?.[slug] : null
  if (!entrada) return null
  const idioma = locale() === 'en' && entrada.en ? 'en' : 'es'
  const texto = entrada[idioma]
  return {
    ...texto,
    // Agrupadas aquí y no en la plantilla: ahí se rehacían en cada repintado.
    secciones: (texto?.secciones ?? []).map((seccion) => ({
      ...seccion,
      bloques: agrupar(seccion.bloques ?? [])
    })),
    url: enlaceSeguro(
      idioma === 'en' ? entrada.url?.replace('/es/news/', '/en/news/') : entrada.url
    )
  }
})

/**
 * Los Pokémon que nombra la noticia, en su orden: es lo que sale en el
 * evento, y la noticia no lo da en lista. Como mucho una veintena, que una
 * noticia larga (un Pase de GO) nombra muchos de pasada.
 */
const gameData = useGameDataStore()
const pokemonDelEvento = computed(() => {
  if (!noticia.value || !gameData.isReady) return []
  const texto = noticia.value.secciones
    .flatMap((seccion) => [
      seccion.titulo,
      ...seccion.bloques.flatMap((b) => (b.t === 'ul' ? b.items : [b.x]))
    ])
    .join(' ')
  return pokemonEnTexto(texto, gameData.roster).slice(0, 20)
})

/** La noticia va plegada; al abrir otro evento, vuelve a plegarse. */
const noticiaAbierta = ref(false)
watch(
  () => props.event,
  () => {
    noticiaAbierta.value = false
  }
)

/** La página del evento en LeekDuck; llega de ScrapedDuck, así que se filtra. */
const enlaceLeekDuck = computed(() => enlaceSeguro(props.event?.link))

/**
 * Al calendario, para que avise él, con el título que se ve. Solo si aún no ha
 * acabado.
 *
 * Antes se descargaba un .ics, y descargar un fichero no es lo que se espera
 * al pulsar «Añadir al calendario». Ahora el botón abre un modal con las tres
 * formas: Google Calendar (el evento ya relleno), el Calendario de Apple (un
 * enlace a /api/calendario, que Safari abre con «Añadir al calendario») y el
 * fichero, para Outlook u otro. Primero la del sistema de cada uno.
 */
const tarjeta = ref(null)
const eligiendoCalendario = ref(false)
// Al cerrar el detalle o abrir otro, el selector no se queda abierto.
watch(
  () => props.event,
  () => {
    eligiendoCalendario.value = false
  }
)
const apple = typeof navigator !== 'undefined' && esApple(navigator)
const calendario = computed(() => {
  const evento = props.event
  if (!evento?.startDate || evento.status === 'past' || !evento.eventID) return null
  if (evento.endDate && evento.endDate.getTime() <= Date.now()) return null
  const titulo = tarjeta.value?.titulo ?? evento.name
  const google = urlGoogleCalendar({
    titulo,
    inicio: evento.start,
    fin: evento.end,
    detalles: noticia.value?.url ?? enlaceLeekDuck.value ?? undefined
  })
  const googleOpcion = { clave: 'google', url: google }
  const appleOpcion = { clave: 'apple', url: urlIcs({ id: evento.eventID, titulo }) }
  const fichero = { clave: 'file', url: urlIcs({ id: evento.eventID, titulo, descargar: true }) }
  // Primero la del sistema de cada uno; el fichero, siempre al final.
  return (
    apple ? [appleOpcion, googleOpcion, fichero] : [googleOpcion, appleOpcion, fichero]
  ).filter((opcion) => opcion.url)
})

/** Los bonus de la noticia: con ellos, la tarjeta no los repite. */
const bonusOficial = computed(() => bonusDeEvento(datos.value, props.event))

/**
 * Los bloques de una sección, con los elementos de lista seguidos juntos en
 * una misma lista: la web los da sueltos, uno detrás de otro.
 */
const agrupar = (bloques) => {
  const salida = []
  for (const b of bloques) {
    const ultimo = salida[salida.length - 1]
    if (b.t === 'li') {
      if (ultimo?.t === 'ul') ultimo.items.push(b.x)
      else salida.push({ t: 'ul', items: [b.x] })
    } else {
      salida.push(b)
    }
  }
  return salida
}
</script>

<template>
  <base-modal
    :open="Boolean(event)"
    :title="$t('events.detail')"
    size="sm:max-w-3xl"
    @close="emit('close')"
  >
    <template v-if="event">
      <event-card ref="tarjeta" :event="event" detalle :bonus="bonusOficial" />

      <div class="px-4 pb-4">
        <!--
          Justo debajo de cuándo es, que es cuando se piensa en apuntarlo. Antes
          iba al final, debajo de toda la noticia oficial, junto a los enlaces.
        -->
        <button
          v-if="calendario"
          type="button"
          aria-haspopup="dialog"
          class="mb-4 w-full sm:w-auto flex items-center justify-center gap-2 h-11 sm:h-10 px-4 text-sm font-semibold rounded-xl bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-white"
          @click="eligiendoCalendario = true"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
          </svg>
          {{ $t('events.addToCalendar') }}
        </button>

        <event-bonus :bonus="tarjeta?.todosLosBonus ?? []" />

        <p v-if="cargando" class="text-xs text-gray-600 dark:text-gray-300">
          {{ $t('common.loading') }}
        </p>

        <template v-else-if="noticia">
          <section
            v-if="pokemonDelEvento.length"
            class="mb-4 pt-3 border-t border-gray-300 dark:border-gray-700"
          >
            <h3 class="subtitulo">
              {{ $t('events.eventPokemon') }}
            </h3>
            <ul class="mt-2 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1">
              <li v-for="mon in pokemonDelEvento" :key="mon.dex">
                <router-link
                  :to="`/pokemon/${mon.dex}`"
                  class="flex flex-col items-center gap-0.5 p-1 rounded-lg text-center hover:bg-gray-150 hover:dark:bg-gray-800"
                >
                  <base-sprite
                    :src="spriteUrl(mon.spriteId)"
                    class="w-12 h-12"
                    img-class="drop-shadow-contorno dark:drop-shadow-none"
                  />
                  <span class="text-mini leading-tight line-clamp-2 break-words">{{
                    localName(mon)
                  }}</span>
                </router-link>
              </li>
            </ul>
          </section>

          <!-- La noticia entera, plegada: se abre si se quiere leer. -->
          <div class="pt-3 border-t border-gray-300 dark:border-gray-700">
            <h3 class="subtitulo">{{ $t('events.official') }}</h3>
            <button
              type="button"
              class="mt-1 ver-mas"
              :aria-expanded="noticiaAbierta"
              aria-controls="noticia-oficial"
              @click="noticiaAbierta = !noticiaAbierta"
            >
              {{ $t(noticiaAbierta ? 'events.hideNews' : 'events.readNews') }}
              <base-chevron :open="noticiaAbierta" size="w-3.5 h-3.5" />
            </button>
          </div>
          <article v-show="noticiaAbierta" id="noticia-oficial">
            <section v-for="(seccion, i) in noticia.secciones" :key="i" class="mt-3">
              <h3 class="text-sm font-bold">{{ seccion.titulo }}</h3>
              <template v-for="(bloque, j) in seccion.bloques" :key="j">
                <ul
                  v-if="bloque.t === 'ul'"
                  class="mt-1.5 flex flex-col gap-1 pl-4 list-disc text-sm"
                >
                  <li v-for="(item, k) in bloque.items" :key="k">{{ item }}</li>
                </ul>
                <h4
                  v-else-if="bloque.t === 'h3'"
                  class="mt-2 text-xs font-bold text-gray-600 dark:text-gray-300"
                >
                  {{ bloque.x }}
                </h4>
                <p v-else class="mt-1.5 text-sm">{{ bloque.x }}</p>
              </template>
            </section>
          </article>
        </template>

        <p
          v-else
          class="pt-3 border-t border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300"
        >
          {{ $t('events.noOfficial') }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <a
            v-if="noticia?.url"
            :href="noticia.url"
            target="_blank"
            rel="noopener"
            class="px-3 py-1.5 text-xs rounded-xl border border-gray-400 dark:border-gray-600 hover:bg-gray-150 hover:dark:bg-gray-700"
            >{{ $t('events.openOfficial') }}</a
          >
          <a
            v-if="enlaceLeekDuck"
            :href="enlaceLeekDuck"
            target="_blank"
            rel="noopener"
            class="px-3 py-1.5 text-xs rounded-xl border border-gray-400 dark:border-gray-600 hover:bg-gray-150 hover:dark:bg-gray-700"
            >{{ $t('events.openLeekDuck') }}</a
          >
        </div>
      </div>
    </template>
  </base-modal>

  <!--
    Encima del detalle: Escape y «atrás» cierran solo este (BaseModal mira
    dónde está el foco, y el «atrás» va por pila). Cada opción se abre aparte
    (target=_blank: con la app instalada, el calendario sale por encima y al
    cerrarlo se sigue en la app), y al elegir se cierra.
  -->
  <base-modal
    :open="eligiendoCalendario && Boolean(calendario)"
    :title="$t('events.calendar.title')"
    @close="eligiendoCalendario = false"
  >
    <ul class="p-4 flex flex-col gap-2">
      <li v-for="opcion in calendario" :key="opcion.clave">
        <a
          :href="opcion.url"
          target="_blank"
          rel="noopener"
          class="flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-150 hover:dark:bg-gray-700"
          @click="eligiendoCalendario = false"
        >
          <span class="text-sm font-semibold">{{ $t(`events.calendar.${opcion.clave}`) }}</span>
          <span class="text-mini text-gray-600 dark:text-gray-300">{{
            $t(`events.calendar.${opcion.clave}Help`)
          }}</span>
        </a>
      </li>
    </ul>
  </base-modal>
</template>
