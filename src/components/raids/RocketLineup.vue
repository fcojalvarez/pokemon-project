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

const tipo = computed(() => props.lineup.type || null)

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
    class="p-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900"
  >
    <div class="flex flex-wrap items-center gap-2 mb-2">
      <h3 class="flex-1 min-w-0 text-xs font-semibold">{{ nombre }}</h3>
      <counters-toggle
        v-if="tipo"
        class="!w-auto !h-7 px-3"
        :open="open"
        :boss-name="nombre"
        @toggle="emit('toggle')"
      />
    </div>

    <ol class="flex flex-col gap-1.5">
      <li v-for="(lista, i) in puestos" :key="i" class="flex items-start gap-2">
        <span
          class="shrink-0 w-5 pt-2.5 text-mini font-semibold text-gray-600 dark:text-gray-300 tabular-nums"
          :aria-label="$t('raids.rocket.slot', { n: i + 1 })"
          >{{ i + 1 }}</span
        >
        <ul class="flex-1 min-w-0 grid grid-cols-3 gap-1">
          <li v-for="mon in lista" :key="mon.name">
            <component
              :is="mon.dex ? 'router-link' : 'div'"
              :to="mon.dex ? `/pokemon/${mon.dex}` : undefined"
              class="flex flex-col items-center gap-0.5 p-1 rounded-lg text-center"
              :class="mon.dex ? 'hover:bg-gray-150 hover:dark:bg-gray-800' : ''"
            >
              <base-sprite
                v-if="mon.image"
                :src="mon.image"
                class="w-9 h-9"
                img-class="drop-shadow-contorno dark:drop-shadow-none"
              />
              <span class="text-mini leading-tight line-clamp-2 break-words">{{ mon.nombre }}</span>
              <span
                v-if="mon.isEncounter"
                class="text-mini leading-tight font-semibold text-green-700 dark:text-green-400"
                >{{ $t('raids.rocket.catchable') }}</span
              >
            </component>
          </li>
        </ul>
      </li>
    </ol>

    <raid-counters-panel
      v-if="open && tipo"
      class="mt-2 pt-2 border-t border-gray-300 dark:border-gray-700"
      :weaknesses="debilidades"
      :counters="counters"
    />
  </article>
</template>
