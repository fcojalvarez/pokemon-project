<script setup>
/**
 * Lista rankeada de Pokémon: puesto, sprite, nombre, tipos, movimientos y una
 * métrica.
 *
 * Sirve para los rankings PvE y para los de PvP, que pintaban exactamente lo
 * mismo con dos plantillas distintas. Las diferencias reales (la barra de
 * proporción y la métrica secundaria, que solo tienen sentido en PvE) son
 * props opcionales activadas por defecto, así que quien ya lo usaba no cambia.
 *
 * Cada fila admite dos formas:
 *   - PvE: `{ fast, charged, dps, tdo, er }` tal y como sale de evaluatePokemon.
 *   - PvP: `{ moves: [{ nameEs, type }], value }` ya normalizada por la vista.
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import TypeIcons from '../base/TypeIcons.vue'
import MoveTag from '../pokemon/MoveTag.vue'
import { spriteUrl } from '../../utils/sprites'

const props = defineProps({
  rows: { type: Array, required: true },
  sortBy: { type: String, default: 'dps' },
  // Etiqueta de la métrica. Por defecto la que corresponda a `sortBy`.
  unit: { type: String, default: null },
  // La barra compara cada fila con la primera: sin ranking ordenado no aporta.
  showBar: { type: Boolean, default: true },
  // Métrica de apoyo bajo la principal (en PvE, el DPS o el TDO contrario).
  showSecondary: { type: Boolean, default: true }
})

const router = useRouter()

const UNITS = { dps: 'DPS', tdo: 'TDO', er: 'ER' }

const unitLabel = computed(() => props.unit ?? UNITS[props.sortBy] ?? '')

const valueOf = (row) => row.value ?? row[props.sortBy]

/** Las filas de PvE traen `fast`/`charged`; las de PvP, una lista ya montada. */
const movesOf = (row) => row.moves ?? [row.fast, row.charged].filter(Boolean)

const rowKey = (row) => [row.id, ...movesOf(row).map((move) => move?.id ?? move?.nameEs)].join('-')

const max = computed(() => (props.rows.length ? valueOf(props.rows[0]) || 1 : 1))

const mainValue = (row) => {
  const value = valueOf(row)
  return props.sortBy === 'tdo' ? Math.round(value) : value.toFixed(1)
}

const percent = (row) => Math.round((valueOf(row) / max.value) * 100)

const goToPokemon = (dex) => dex && router.push(`/pokemon/${dex}`)
</script>

<template>
  <ol class="flex flex-col gap-2">
    <li
      v-for="row in rows"
      :key="rowKey(row)"
      class="flex items-center gap-3 p-2 pr-3 cursor-pointer border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900 hover:bg-gray-150 hover:dark:bg-gray-800"
      @click="goToPokemon(row.dex)"
    >
      <span class="w-6 shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
        {{ row.rank }}
      </span>

      <img
        :src="spriteUrl(row.spriteId)"
        :alt="`${row.nameEs} ${$t('image')}`"
        class="w-12 h-12 shrink-0 object-contain drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark"
        loading="lazy"
      />

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
            {{ row.nameEs }}
          </span>
          <type-icons :types="row.types" size="12" />
        </div>
        <div class="mt-1 flex flex-wrap gap-1.5 text-mini text-gray-600 dark:text-gray-400">
          <move-tag
            v-for="move in movesOf(row)"
            :key="move.id ?? move.nameEs"
            chip
            :name="move.nameEs"
            :type="move.type"
            :elite="move.elite"
            :legacy="move.legacy"
            :mega="move.mega"
          />
        </div>
      </div>

      <div class="w-[72px] shrink-0 text-right">
        <div class="font-bold text-gray-800 dark:text-gray-100 leading-tight">
          {{ mainValue(row) }}
          <span v-if="unitLabel" class="text-mini font-normal text-gray-500 dark:text-gray-400">
            {{ unitLabel }}
          </span>
        </div>
        <div
          v-if="showBar"
          class="mt-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
        >
          <span class="block h-full bg-gray-500 dark:bg-gray-300" :style="{ width: percent(row) + '%' }"></span>
        </div>
        <div v-if="showSecondary" class="mt-0.5 text-mini text-gray-500 dark:text-gray-400">
          <template v-if="sortBy !== 'dps'">{{ row.dps.toFixed(1) }} DPS</template>
          <template v-else>{{ Math.round(row.tdo) }} TDO</template>
        </div>
      </div>
    </li>
  </ol>
</template>
