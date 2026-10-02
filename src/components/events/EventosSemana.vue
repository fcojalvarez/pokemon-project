<script setup>
/**
 * La semana de Eventos: los próximos siete días, cada uno en su tarjeta, con
 * su hoja de fecha y lo que empieza ese día, cada evento con la miniatura de
 * su cartel. Hoy lleva además lo que ya está en marcha: los dos que acaban
 * antes y, del resto, cuántos son (están todos en su pestaña).
 *
 * Es la opción D de las propuestas: la que más se parece al resto de Eventos
 * (carteles, tarjetas). Antes cada evento era una tarjeta con borde dentro de
 * una lista de días, y lo de hoy ocupaba casi una pantalla. Cada fila abre el
 * detalle del evento, como su tarjeta.
 */
import { computed, ref } from 'vue'
import { useTranslate } from '../../composables/useTranslate'
import { useEventos } from '../../composables/useEventos'
import { diasDeLaSemana } from '../../utils/semana'
import { eventImageMini } from '../../utils/eventImage'

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

/** La hoja de fecha: «VIE» y «2», sin el punto de la abreviatura. */
const diaCorto = (fecha) => fmt(fecha, { weekday: 'short' }).replace('.', '')

/**
 * Hasta cuándo dura lo que ya está en marcha: «lun 5, 20:00», con el mes si
 * acaba en otro (sin él, «mar 3» de noviembre se leía como un 3 de octubre).
 */
const hasta = (evento) => {
  const fin = evento.endDate
  if (!fin) return ''
  const cuando = `${fmt(fin, {
    weekday: 'short',
    day: 'numeric',
    ...(fin.getMonth() !== props.ahora.getMonth() && { month: 'short' })
  })}, ${hora(fin)}`
  return t('events.weekView.until', { when: cuando })
}

/** Lo de debajo del título: cuándo y de qué tipo. */
const detalle = (evento, enMarcha) =>
  enMarcha
    ? `${t('events.inProgress')} · ${hasta(evento)}`
    : `${hora(evento.startDate)} · ${tipoDeEvento(evento)}`

/**
 * Las filas de un día, en orden: lo que ya está en marcha (dos, o todos si se
 * despliega), la de «y N más» si quedan, y lo que empieza ese día.
 */
const filasDe = (dia) => {
  const enMarcha = verTodos.value ? dia.enMarcha : dia.enMarcha.slice(0, EN_MARCHA_VISIBLES)
  const quedan = dia.enMarcha.length - EN_MARCHA_VISIBLES
  return [
    ...enMarcha.map((evento) => ({ clave: `ya-${evento.eventID}`, evento, enMarcha: true })),
    ...(quedan > 0 ? [{ clave: 'mas', mas: quedan }] : []),
    ...dia.empiezan.map((evento) => ({
      clave: `empieza-${evento.eventID}`,
      evento,
      enMarcha: false
    }))
  ]
}

/** Un cartel que no carga se quita: mejor el hueco que el icono de imagen rota. */
const sinCartel = ref(new Set())
const quitarCartel = (id) => {
  sinCartel.value = new Set(sinCartel.value).add(id)
}
</script>

<template>
  <div :class="columnas ? 'columns-2 gap-4' : ''">
    <section
      v-for="(dia, i) in dias"
      :key="dia.fecha.getTime()"
      class="mb-3 break-inside-avoid rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md overflow-hidden"
      :aria-labelledby="`semana-${i}`"
    >
      <h2
        :id="`semana-${i}`"
        class="flex items-center gap-3 px-3 py-2 bg-gray-100 dark:bg-gray-800"
      >
        <!-- La hoja de fecha, como la de las tarjetas de evento. -->
        <span class="w-9 shrink-0 flex flex-col items-center leading-none" aria-hidden="true">
          <span class="text-mini uppercase text-gray-600 dark:text-gray-300">{{
            diaCorto(dia.fecha)
          }}</span>
          <span class="mt-0.5 text-lg font-bold">{{ dia.fecha.getDate() }}</span>
        </span>
        <span class="text-sm font-bold">
          {{ nombreDia(dia.fecha, i) }}
          <span class="sr-only">{{ fmt(dia.fecha, { day: 'numeric', month: 'long' }) }}</span>
        </span>
        <span class="ml-auto text-mini font-normal text-gray-600 dark:text-gray-300">{{
          dia.empiezan.length
            ? $tc('events.weekView.starting', dia.empiezan.length, { n: dia.empiezan.length })
            : $t('events.weekView.nothing')
        }}</span>
      </h2>

      <ul v-if="dia.enMarcha.length || dia.empiezan.length" class="px-3 pb-1">
        <li
          v-for="fila in filasDe(dia)"
          :key="fila.clave"
          class="border-t border-gray-300 dark:border-gray-700 first:border-t-0"
        >
          <!-- Hoy: del resto de lo que ya está en marcha, cuántos son. -->
          <button
            v-if="fila.mas"
            type="button"
            class="py-1.5 text-mini text-gray-600 dark:text-gray-300 underline"
            :aria-expanded="verTodos"
            @click="verTodos = !verTodos"
          >
            {{
              verTodos ? $t('events.weekView.less') : $t('events.weekView.more', { n: fila.mas })
            }}
          </button>
          <button
            v-else
            type="button"
            class="w-full flex items-center gap-3 py-2 text-left rounded-lg hover:bg-gray-150 hover:dark:bg-gray-800"
            @click="emit('abrir', fila.evento)"
          >
            <span class="w-16 h-9 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                v-if="fila.evento.image && !sinCartel.has(fila.evento.eventID)"
                :src="eventImageMini(fila.evento.image)"
                alt=""
                width="64"
                height="36"
                loading="lazy"
                class="w-full h-full object-cover"
                @error="quitarCartel(fila.evento.eventID)"
              />
            </span>
            <span class="flex-1 min-w-0">
              <span class="block text-xs font-semibold leading-snug">{{
                tituloDeEvento(fila.evento)
              }}</span>
              <span
                class="block text-mini tabular-nums"
                :class="
                  fila.enMarcha
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-300'
                "
                >{{ detalle(fila.evento, fila.enMarcha) }}</span
              >
            </span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
