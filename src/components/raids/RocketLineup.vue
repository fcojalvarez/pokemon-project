<script setup>
/**
 * Una alineación del Team GO Rocket: quién es y qué puede sacar en cada uno
 * de sus tres puestos. Los que se pueden atrapar al ganarle llevan «Se
 * atrapa»: es lo que de verdad se pregunta antes de gastar un Radar Rocket.
 *
 * Los reclutas de un tipo llevan sus counters (contra ese tipo, como los de
 * una incursión). Los líderes y Giovanni no: cada puesto es de un tipo
 * distinto, y cada Pokémon lleva a su ficha, que ya dice cómo ganarle.
 */
import { computed } from 'vue'
import BaseSprite from '../base/BaseSprite.vue'
import CountersToggle from './CountersToggle.vue'
import RaidCountersPanel from './RaidCountersPanel.vue'
import { useGameDataStore } from '../../stores/gameData'
import { useTranslate } from '../../composables/useTranslate'
import { dexFromImage } from '../../utils/liveFeed'
import { piezasRecluta, puestosRocket } from '../../utils/rocket'

const props = defineProps({
  /** Una entrada de rocketLineups.json. */
  lineup: { type: Object, required: true },
  /** Si su panel de counters está abierto. */
  open: Boolean
})
const emit = defineEmits(['toggle'])

const gameData = useGameDataStore()
const { t, te } = useTranslate()

const nombreTipo = (tipo) => (te(`types.${tipo}`) ? t(`types.${tipo}`) : tipo)

/** «Recluta de tipo Fuego (chica)»; Giovanni y los líderes, tal cual. */
const nombre = computed(() => {
  const piezas = piezasRecluta(props.lineup.name)
  if (!piezas) return props.lineup.name
  const base = piezas.senuelo
    ? t('raids.rocket.decoy')
    : piezas.tipo
    ? t('raids.rocket.gruntType', { type: nombreTipo(piezas.tipo) })
    : t('raids.rocket.grunt')
  return `${base} (${t(`raids.rocket.${piezas.sexo}`)})`
})

const puestos = computed(() =>
  puestosRocket(props.lineup).map((lista) =>
    lista.map((mon) => ({
      ...mon,
      dex: dexFromImage(mon.image),
      nombre: gameData.nombreEs(mon.name)
    }))
  )
)

/**
 * Si se atrapa algo en ese puesto: toda la fila, en verde; solo alguno, un
 * anillo verde en ese sprite.
 */
const atrapables = (lista) => lista.filter((mon) => mon.isEncounter).length
const todosAtrapables = (lista) => lista.length > 0 && atrapables(lista) === lista.length

const tipo = computed(() => props.lineup.type || null)

/**
 * Lo que dice el recluta al empezar, que en el juego es la pista de su tipo
 * («¡Prepárate para alucinar!» = Eléctrico). Sale de los textos del juego
 * (combat_grunt_quote_<tipo>) y va en las traducciones. Los demás (Giovanni,
 * líderes, señuelos) dicen una al azar, que no ayuda a reconocerlos.
 */
const frase = computed(() => {
  const clave = `raids.rocket.quotes.${tipo.value}`
  return tipo.value && te(clave) ? t(clave) : null
})

const counters = computed(() =>
  props.open && tipo.value && gameData.isReady ? gameData.counters([tipo.value], { limit: 10 }) : []
)
const debilidades = computed(() =>
  props.open && tipo.value && gameData.isReady
    ? gameData.matchups([tipo.value]).weak.map((entry) => entry.type)
    : []
)
</script>

<template>
  <article
    class="overflow-hidden border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
  >
    <div class="flex flex-wrap items-center gap-2 px-2.5 pt-2.5 pb-2">
      <div class="flex-1 min-w-0">
        <h3 class="text-xs font-semibold">{{ nombre }}</h3>
        <p v-if="frase" class="mt-0.5 text-xs italic text-gray-700 dark:text-gray-200">
          {{ $t('raids.rocket.quote', { text: frase }) }}
        </p>
      </div>
      <counters-toggle
        v-if="tipo"
        icono
        :open="open"
        :boss-name="nombre"
        @toggle="emit('toggle')"
      />
    </div>

    <!--
      Una fila fina por puesto, como una tabla: el número, los sprites en línea
      (cada uno lleva a su ficha) y sus nombres. Antes cada Pokémon tenía su
      casilla en una rejilla de tres y Giovanni ocupaba casi una pantalla. La
      fila de lo que se atrapa va en verde, con «Se atrapa» a la derecha.
    -->
    <ol
      class="divide-y divide-gray-300 dark:divide-gray-700 border-t border-gray-300 dark:border-gray-700"
    >
      <li
        v-for="(lista, i) in puestos"
        :key="i"
        class="flex items-center gap-2 px-2.5 py-1.5"
        :class="todosAtrapables(lista) ? 'bg-green-50 dark:bg-green-900/30' : ''"
      >
        <span
          class="shrink-0 w-4 text-mini font-semibold text-gray-600 dark:text-gray-300 tabular-nums"
          :aria-label="$t('raids.rocket.slot', { n: i + 1 })"
          >{{ i + 1 }}</span
        >
        <ul class="shrink-0 flex">
          <li v-for="mon in lista" :key="mon.name">
            <component
              :is="mon.dex ? 'router-link' : 'div'"
              :to="mon.dex ? `/pokemon/${mon.dex}` : undefined"
              class="block rounded-lg"
              :class="[
                mon.dex ? 'hover:bg-gray-150 hover:dark:bg-gray-800' : '',
                mon.isEncounter && !todosAtrapables(lista)
                  ? 'ring-2 ring-green-600 dark:ring-green-400'
                  : ''
              ]"
              :title="mon.nombre"
              :aria-label="mon.nombre"
            >
              <base-sprite
                v-if="mon.image"
                :src="mon.image"
                class="w-8 h-8"
                img-class="drop-shadow-contorno dark:drop-shadow-none"
              />
            </component>
          </li>
        </ul>
        <span class="flex-1 min-w-0 text-mini leading-tight" aria-hidden="true">{{
          lista.map((mon) => mon.nombre).join(' · ')
        }}</span>
        <span
          v-if="atrapables(lista)"
          class="shrink-0 text-mini font-semibold text-green-700 dark:text-green-400"
          >{{ $t('raids.rocket.catchable') }}</span
        >
      </li>
    </ol>

    <raid-counters-panel
      v-if="open && tipo"
      class="p-2.5 border-t border-gray-300 dark:border-gray-700"
      :weaknesses="debilidades"
      :counters="counters"
    />
  </article>
</template>
