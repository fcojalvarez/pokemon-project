<script setup>
/**
 * Mejores combinaciones de ataques y, debajo, todos los que puede aprender.
 *
 * Aunque no haya combinaciones que puntuar (Applin solo tiene Forcejeo, que no
 * cuenta), la lista de ataques se enseña igual.
 */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import MoveTag from '../MoveTag.vue'
import MoveLegend from '../MoveLegend.vue'
import { useTranslate } from '../../../composables/useTranslate'

const props = defineProps({
  bestMovesets: { type: Array, required: true },
  /** { fast, charged, origenes } de useFichaDatos. */
  movepool: { type: Object, required: true }
})

const { localName } = useTranslate()

/** Plegada: la mejor combinación o, sin ninguna, los ataques que tiene. */
const resumen = computed(() => {
  const mejor = props.bestMovesets[0]
  if (mejor) return `${localName(mejor.fast)} + ${localName(mejor.charged)} · ${mejor.dps.toFixed(1)} DPS`
  return [...props.movepool.fast, ...props.movepool.charged].map(localName).join(' · ')
})
</script>

<template>
  <ficha-seccion id="ataques" :title="$t('pokemon.bestMoves')" :summary="resumen">
    <ol v-if="bestMovesets.length" class="mt-2 flex flex-col gap-1.5">
      <li
        v-for="set in bestMovesets"
        :key="`${set.fast.id}-${set.charged.id}`"
        class="flex flex-wrap items-center gap-x-3 gap-y-1 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
      >
        <move-tag
          chip
          :name="localName(set.fast)"
          :type="set.fast.type"
          size="11"
          :elite="set.fast.elite"
          :legacy="set.fast.legacy"
        />
        <move-tag
          chip
          :name="localName(set.charged)"
          :type="set.charged.type"
          size="11"
          :elite="set.charged.elite"
          :legacy="set.charged.legacy"
          :mega="set.charged.mega"
        />
        <span class="ml-auto font-bold">{{ set.dps.toFixed(1) }} DPS</span>
      </li>
    </ol>

    <div :class="bestMovesets.length ? 'mt-3 pt-3 border-t border-gray-300 dark:border-gray-700' : 'mt-2'">
      <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('pokemon.fastMoves') }}</span>
      <div class="flex flex-wrap gap-1 mt-1">
        <move-tag
          v-for="move in movepool.fast"
          :key="move.id"
          chip
          :name="localName(move)"
          :type="move.type"
          :elite="move.elite"
          :legacy="move.legacy"
        />
      </div>
      <span class="block mt-2 text-mini text-gray-600 dark:text-gray-300">
        {{ $t('pokemon.chargedMoves') }}
      </span>
      <div class="flex flex-wrap gap-1 mt-1">
        <move-tag
          v-for="move in movepool.charged"
          :key="move.id"
          chip
          :name="localName(move)"
          :type="move.type"
          :elite="move.elite"
          :legacy="move.legacy"
          :mega="move.mega"
        />
      </div>
      <move-legend class="mt-3" v-bind="movepool.origenes" />
    </div>
  </ficha-seccion>
</template>
