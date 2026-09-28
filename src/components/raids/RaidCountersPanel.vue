<script setup>
/**
 * Con quién ganarle a un jefe de incursión: a qué es débil, qué clima lo
 * potencia y la lista de counters con sus ataques y DPS.
 *
 * Sale desplegado bajo el jefe o, en escritorio ancho, en el panel lateral:
 * por eso va aparte, para no tener el mismo marcado dos veces.
 */
import { MoveTag, TypeIcons } from '../index'
import MoveLegend from '../pokemon/MoveLegend.vue'
import BaseSprite from '../base/BaseSprite.vue'
import { spriteUrl } from '../../utils/sprites'
import { useTranslate } from '../../composables/useTranslate'

defineProps({
  weaknesses: { type: Array, default: () => [] },
  /** Climas que lo potencian, ya traducidos. */
  weather: { type: Array, default: () => [] },
  counters: { type: Array, default: () => [] },
  /** Qué procedencias de ataque salen, para la leyenda: { elite, legacy, mega }. */
  origins: { type: Object, default: () => ({}) },
  /** Una columna: para el panel lateral, donde no caben dos. */
  single: Boolean
})

const { localName } = useTranslate()
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

    <ol
      class="mt-2 grid gap-1.5"
      :class="single ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fill,minmax(230px,1fr))]'"
    >
      <li
        v-for="(counter, index) in counters"
        :key="`${counter.id}-${counter.fast.id}-${counter.charged.id}`"
      >
        <component
          :is="counter.dex ? 'router-link' : 'div'"
          :to="counter.dex ? `/pokemon/${counter.dex}` : undefined"
          class="flex items-center gap-2 p-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-150 hover:dark:bg-gray-700"
        >
          <span v-if="single" class="w-5 shrink-0 text-right text-mini text-gray-600 dark:text-gray-300 tabular-nums">{{ index + 1 }}</span>
          <base-sprite :src="spriteUrl(counter.spriteId)" :oscuro="counter.shadow" class="w-8 h-8 shrink-0" img-class="drop-shadow-contorno dark:drop-shadow-none" />
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
          <span class="text-xs font-bold shrink-0">{{ counter.dps.toFixed(1) }}</span>
        </component>
      </li>
    </ol>

    <move-legend
      v-if="origins.elite || origins.legacy || origins.mega"
      class="mt-2"
      :elite="origins.elite"
      :legacy="origins.legacy"
      :mega="origins.mega"
    />
  </div>
</template>
