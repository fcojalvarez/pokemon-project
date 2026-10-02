<script setup>
/**
 * Detalle de un evento, en un modal.
 *
 * Arriba, la propia tarjeta en grande (cartel, fecha, horario, Pokémon y
 * bonificaciones que ya da LeekDuck). Debajo, la noticia oficial de Pokémon GO
 * cuando la hay: es la que trae todo —bonus con sus notas, investigaciones,
 * horarios— y ya en español con los nombres del juego. Si no la hay, queda lo
 * de LeekDuck y el enlace a su página.
 */
import { computed, ref, watch } from 'vue'
import { cargarNoticias } from '../../stores/gameData'
import { useTranslate } from '../../composables/useTranslate'
import { useEventos } from '../../composables/useEventos'
import { enlaceSeguro } from '../../utils/safeUrl'
import { descargarIcs, eventoIcs, nombreIcs } from '../../utils/ics'
import BaseModal from '../base/BaseModal.vue'
import EventCard from './EventCard.vue'

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

/** La página del evento en LeekDuck; llega de ScrapedDuck, así que se filtra. */
const enlaceLeekDuck = computed(() => enlaceSeguro(props.event?.link))

/**
 * Al calendario del móvil, para que avise él: con el título que se ve y, de
 * descripción, el enlace a la noticia (o a LeekDuck). Solo si aún no ha acabado.
 */
const tarjeta = ref(null)
const alCalendario = computed(() => {
  const evento = props.event
  if (!evento?.startDate || evento.status === 'past') return false
  return !evento.endDate || evento.endDate.getTime() > Date.now()
})
const anadirAlCalendario = () => {
  const evento = props.event
  const titulo = tarjeta.value?.titulo ?? evento.name
  const url = noticia.value?.url ?? enlaceLeekDuck.value ?? undefined
  const ics = eventoIcs({
    id: evento.eventID ?? titulo,
    titulo,
    inicio: evento.startDate,
    fin: evento.endDate ?? undefined,
    url,
    descripcion: url
  })
  descargarIcs(nombreIcs(titulo), ics)
}

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
        <p v-if="cargando" class="text-xs text-gray-600 dark:text-gray-300">
          {{ $t('common.loading') }}
        </p>

        <article v-else-if="noticia" class="pt-3 border-t border-gray-300 dark:border-gray-700">
          <p class="text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300">
            {{ $t('events.official') }}
          </p>
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

        <p
          v-else
          class="pt-3 border-t border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300"
        >
          {{ $t('events.noOfficial') }}
        </p>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-if="alCalendario"
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border border-gray-400 dark:border-gray-600 hover:bg-gray-150 hover:dark:bg-gray-700"
            @click="anadirAlCalendario"
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
</template>
