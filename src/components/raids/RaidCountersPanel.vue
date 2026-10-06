<script setup>
/**
 * Con quién ganarle a un jefe de incursión: a qué es débil, qué clima lo
 * potencia y la lista de counters con sus ataques y DPS. Sale desplegado bajo
 * el jefe.
 */
import { computed } from 'vue'
import MoveTag from '../pokemon/MoveTag.vue'
import TypeIcons from '../base/TypeIcons.vue'
import MoveLegend from '../pokemon/MoveLegend.vue'
import BaseSprite from '../base/BaseSprite.vue'
import { spriteUrl } from '../../utils/sprites'
import { useTranslate, formatDecimal } from '../../composables/useTranslate'
import { origenesPresentes } from '../../utils/moveOrigins'

const props = defineProps({
  weaknesses: { type: Array, default: () => [] },
  /** Climas que lo potencian, ya traducidos. */
  weather: { type: Array, default: () => [] },
  counters: { type: Array, default: () => [] }
})

const { localName } = useTranslate()

/** Qué procedencias salen entre los counters, para la leyenda de colores. */
const origins = computed(() =>
  origenesPresentes(props.counters.flatMap((counter) => [counter.fast, counter.charged]))
)
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span v-if="weaknesses.length" class="flex items-center gap-2">
        <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('raids.weakTo') }}</span>
        <type-icons :types="weaknesses" size="14" />
      </span>
      <span v-if="weather.length" class="flex items-center gap-2">
        <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('raids.boostedBy') }}</span>
        <span class="text-mini">{{ weather.join(' · ') }}</span>
      </span>
    </div>

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
          <!-- Con su unidad: la cifra sola no decía que era el eDPS contra él. -->
          <span class="shrink-0 flex flex-col items-end leading-tight tabular-nums">
            <span class="text-xs font-bold">{{ formatDecimal(counter.edps) }}</span>
            <span class="text-mini text-gray-600 dark:text-gray-300">eDPS</span>
          </span>
        </component>
      </li>
    </ol>

    <move-legend class="mt-2" v-bind="origins" />
  </div>
</template>
