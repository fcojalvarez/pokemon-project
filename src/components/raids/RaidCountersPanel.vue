<script setup>
/**
 * Con quién ganarle a un jefe de incursión: a qué es débil, qué clima lo
 * potencia y la lista de counters con sus ataques y su eDPS. Sale desplegado
 * bajo el jefe.
 *
 * Con el nivel de la incursión, cada counter dice además cuántos jugadores
 * harían falta llevando seis de él (una estimación, ver utils/incursion.js).
 * «Solo lo común» deja los que tiene todo el mundo: sin megas, oscuros,
 * legendarios ni ultraentes.
 */
import { computed } from 'vue'
import MoveTag from '../pokemon/MoveTag.vue'
import TypeIcons from '../base/TypeIcons.vue'
import MoveLegend from '../pokemon/MoveLegend.vue'
import BaseSprite from '../base/BaseSprite.vue'
import BasePillButton from '../base/BasePillButton.vue'
import { datosIncursion, jugadoresNecesarios } from '../../utils/incursion'
import { spriteUrl } from '../../utils/sprites'
import { useTranslate, formatDecimal } from '../../composables/useTranslate'
import { origenesPresentes } from '../../utils/moveOrigins'

const props = defineProps({
  weaknesses: { type: Array, default: () => [] },
  /** Climas que lo potencian, ya traducidos. */
  weather: { type: Array, default: () => [] },
  counters: { type: Array, default: () => [] },
  /** El nivel de la incursión, como lo da ScrapedDuck ('5-Star Raids'). */
  nivel: { type: String, default: '' },
  soloComunes: Boolean
})
defineEmits(['update:soloComunes'])

const { localName } = useTranslate()

/** Los segundos de la incursión, para la nota; sin nivel conocido no hay cifra. */
const segundos = computed(() => datosIncursion(props.nivel)?.segundos ?? null)
const jugadores = (counter) => jugadoresNecesarios(counter.edps, props.nivel)

/** Qué procedencias salen entre los counters, para la leyenda de colores. */
const origins = computed(() =>
  origenesPresentes(props.counters.flatMap((counter) => [counter.fast, counter.charged]))
)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span v-if="weaknesses.length" class="flex items-center gap-2">
        <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('raids.weakTo') }}</span>
        <type-icons :types="weaknesses" size="14" />
      </span>
      <span v-if="weather.length" class="flex items-center gap-2">
        <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('raids.boostedBy') }}</span>
        <span class="text-mini">{{ weather.join(' · ') }}</span>
      </span>
      <base-pill-button
        casilla
        :active="soloComunes"
        class="ml-auto"
        :title="$t('raids.soloComunesHelp')"
        @click="$emit('update:soloComunes', !soloComunes)"
        >{{ $t('raids.soloComunes') }}</base-pill-button
      >
    </div>

    <!--
      La unidad, una vez sobre la lista y no en cada fila: en el móvil va en una
      columna y «eDPS» se repetía diez veces. Con varias columnas (md) no hay
      un sitio común encima de todas, así que allí sigue en cada fila.
    -->
    <p
      v-if="counters.length"
      class="md:hidden mt-2 -mb-1 pr-2 text-right text-mini text-gray-600 dark:text-gray-300"
      aria-hidden="true"
    >
      eDPS
    </p>
    <ol class="mt-2 grid gap-1.5 grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
      <li
        v-for="(counter, i) in counters"
        :key="`${counter.id}-${counter.fast.id}-${counter.charged.id}`"
      >
        <component
          :is="counter.dex ? 'router-link' : 'div'"
          :to="counter.dex ? `/pokemon/${counter.dex}` : undefined"
          class="flex items-center gap-2 p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-150 hover:dark:bg-gray-700"
        >
          <!-- El puesto, como en el Top: la lista va del que más daño hace al que menos. -->
          <span
            class="shrink-0 min-w-[1.25rem] px-1 rounded-md bg-gray-200 dark:bg-gray-700 text-center text-mini font-bold tabular-nums text-gray-700 dark:text-gray-200"
            >{{ i + 1 }}</span
          >
          <base-sprite
            :src="spriteUrl(counter.spriteId)"
            :oscuro="counter.shadow"
            class="w-8 h-8 shrink-0"
            img-class="drop-shadow-contorno dark:drop-shadow-none"
          />
          <div class="flex-1 min-w-0">
            <div class="text-xs font-semibold truncate">{{ localName(counter) }}</div>
            <div class="flex flex-wrap gap-1.5 text-mini text-gray-600 dark:text-gray-300">
              <move-tag
                chip
                :name="localName(counter.fast)"
                hide-icon
                :elite="counter.fast.elite"
                :legacy="counter.fast.legacy"
              />
              <move-tag
                chip
                :name="localName(counter.charged)"
                hide-icon
                :elite="counter.charged.elite"
                :legacy="counter.charged.legacy"
                :mega="counter.charged.mega"
              />
            </div>
          </div>
          <span class="shrink-0 flex flex-col items-end leading-tight tabular-nums">
            <span class="text-xs font-bold"
              >{{ formatDecimal(counter.edps) }}<span class="sr-only md:hidden"> eDPS</span></span
            >
            <span class="hidden md:inline text-mini text-gray-600 dark:text-gray-300">eDPS</span>
            <span
              v-if="jugadores(counter)"
              class="mt-0.5 px-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-mini font-bold"
              >{{ $tc('raids.jugadores', jugadores(counter), { n: jugadores(counter) }) }}</span
            >
          </span>
        </component>
      </li>
    </ol>

    <p v-if="segundos" class="mt-2 text-mini text-gray-600 dark:text-gray-300">
      {{ $t('raids.jugadoresNota', { s: segundos }) }}
    </p>
    <p v-if="soloComunes && !counters.length" class="mt-2 text-mini">
      {{ $t('raids.sinComunes') }}
    </p>
    <move-legend class="mt-2" v-bind="origins" />
  </div>
</template>
