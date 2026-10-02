<script setup>
/**
 * La semana de Eventos (F10): los próximos siete días, uno debajo de otro,
 * con lo que empieza en cada uno a qué hora. Hoy lleva además lo que ya está
 * en marcha: los dos que acaban antes y, del resto, cuántos son (están todos
 * en su pestaña).
 *
 * Para planear la semana de un vistazo: en las otras pestañas las tarjetas
 * con cartel dejan ver tres o cuatro eventos por pantalla. Cada fila abre el
 * detalle del evento, como su tarjeta.
 */
import { computed, ref } from 'vue'
import { useTranslate } from '../../composables/useTranslate'
import { useEventos } from '../../composables/useEventos'
import { diasDeLaSemana } from '../../utils/semana'

const props = defineProps({
  /** Los en marcha y los próximos, con startDate y endDate. */
  eventos: { type: Array, required: true },
  ahora: { type: Date, required: true },
  /** Dos columnas de días (escritorio ancho). */
  columnas: Boolean
})
const emit = defineEmits(['abrir'])

const { t, intlLocale } = useTranslate()
const { tipoDeEvento, tituloDeEvento } = useEventos()

// Las clases de una fila, repetidas en las de «en marcha» y las que empiezan.
const FILA =
  'w-full flex items-start gap-3 p-2 rounded-xl text-left border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-150 hover:dark:bg-gray-800'
const HORA = 'w-12 shrink-0 text-xs font-semibold tabular-nums text-gray-800 dark:text-gray-200'
const TIPO =
  'inline-block px-2 py-0.5 mb-0.5 text-mini uppercase tracking-wide rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'

/** De lo que ya está en marcha, cuántos se ven sin desplegar. */
const EN_MARCHA_VISIBLES = 2
const verTodos = ref(false)

const dias = computed(() => diasDeLaSemana(props.eventos, props.ahora))

const fmt = (fecha, opciones) => new Intl.DateTimeFormat(intlLocale(), opciones).format(fecha)
const hora = (fecha) => fmt(fecha, { hour: '2-digit', minute: '2-digit' })

const nombreDia = (fecha, i) => {
  if (i === 0) return t('events.weekView.today')
  if (i === 1) return t('events.weekView.tomorrow')
  const dia = fmt(fecha, { weekday: 'long' })
  return dia.charAt(0).toUpperCase() + dia.slice(1)
}

/**
 * «→ 17:00» si acaba el mismo día; si no, «→ dom 12, 20:00», y con el mes si
 * acaba en otro (sin él, «mar 3» de noviembre se leía como un 3 de octubre).
 */
const hastaCuando = (evento, enMarcha) => {
  const fin = evento.endDate
  if (!fin) return ''
  const mismoDia = fin.toDateString() === evento.startDate.toDateString()
  const cuando =
    mismoDia && !enMarcha
      ? hora(fin)
      : `${fmt(fin, {
          weekday: 'short',
          day: 'numeric',
          ...(fin.getMonth() !== props.ahora.getMonth() && { month: 'short' })
        })}, ${hora(fin)}`
  return enMarcha ? t('events.weekView.until', { when: cuando }) : `→ ${cuando}`
}
</script>

<template>
  <div :class="columnas ? 'columns-2 gap-5' : ''">
    <section
      v-for="(dia, i) in dias"
      :key="dia.fecha.getTime()"
      class="mb-4 break-inside-avoid"
      :aria-labelledby="`semana-${i}`"
    >
      <!-- top-16 / sm:top-14: justo debajo de la cabecera fija. En dos columnas no se pega. -->
      <h2
        :id="`semana-${i}`"
        class="py-1.5 text-sm font-bold bg-gray-100 dark:bg-gray-700"
        :class="columnas ? '' : 'sticky top-16 sm:top-14 z-[5]'"
      >
        {{ nombreDia(dia.fecha, i) }}
        <span class="font-normal text-gray-600 dark:text-gray-300"
          >· {{ fmt(dia.fecha, { day: 'numeric', month: 'short' }) }}</span
        >
      </h2>

      <p
        v-if="!dia.enMarcha.length && !dia.empiezan.length"
        class="text-mini text-gray-600 dark:text-gray-300"
      >
        {{ $t('events.weekView.nothing') }}
      </p>

      <ul v-else class="flex flex-col gap-1.5">
        <template v-if="dia.enMarcha.length">
          <li class="pt-1 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300">
            {{ $t('events.inProgress') }} ({{ dia.enMarcha.length }})
          </li>
          <li
            v-for="evento in verTodos ? dia.enMarcha : dia.enMarcha.slice(0, EN_MARCHA_VISIBLES)"
            :key="`ya-${evento.eventID}`"
          >
            <button type="button" :class="FILA" @click="emit('abrir', evento)">
              <span :class="HORA">{{ $t('events.weekView.now') }}</span>
              <span class="flex-1 min-w-0">
                <span :class="TIPO">{{ tipoDeEvento(evento) }}</span>
                <span class="block text-xs font-semibold leading-snug">{{
                  tituloDeEvento(evento)
                }}</span>
                <span class="block text-mini text-gray-600 dark:text-gray-300">{{
                  hastaCuando(evento, true)
                }}</span>
              </span>
            </button>
          </li>
          <li v-if="dia.enMarcha.length > EN_MARCHA_VISIBLES">
            <button
              type="button"
              class="pl-2 text-mini text-gray-600 dark:text-gray-300 underline"
              :aria-expanded="verTodos"
              @click="verTodos = !verTodos"
            >
              {{
                verTodos
                  ? $t('events.weekView.less')
                  : $t('events.weekView.more', { n: dia.enMarcha.length - EN_MARCHA_VISIBLES })
              }}
            </button>
          </li>
          <li
            v-if="dia.empiezan.length"
            class="pt-2 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300"
          >
            {{ $t('events.weekView.startToday') }}
          </li>
        </template>

        <li v-for="evento in dia.empiezan" :key="evento.eventID">
          <button type="button" :class="FILA" @click="emit('abrir', evento)">
            <span :class="HORA">{{ hora(evento.startDate) }}</span>
            <span class="flex-1 min-w-0">
              <span :class="TIPO">{{ tipoDeEvento(evento) }}</span>
              <span class="block text-xs font-semibold leading-snug">{{
                tituloDeEvento(evento)
              }}</span>
              <span class="block text-mini text-gray-600 dark:text-gray-300">{{
                hastaCuando(evento, false)
              }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
