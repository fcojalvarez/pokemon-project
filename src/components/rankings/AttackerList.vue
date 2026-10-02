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
 *   - PvP: `{ moves: [{ name, nameEs, type }], value }` ya normalizada por la vista.
 */
import { computed } from 'vue'
import TypeIcons from '../base/TypeIcons.vue'
import MoveTag from '../pokemon/MoveTag.vue'
import { spriteUrl } from '../../utils/sprites'
import BaseSprite from '../base/BaseSprite.vue'
import { localName } from '../../composables/useTranslate'
import StabBadge from '../base/StabBadge.vue'
import MaxMoveLines from './MaxMoveLines.vue'
import { movesOf, rowKey } from '../../utils/rankingRows'

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

const UNITS = { dps: 'DPS', tdo: 'TDO', er: 'ER' }

const unitLabel = computed(() => props.unit ?? UNITS[props.sortBy] ?? '')

const valueOf = (row) => row.value ?? row[props.sortBy]

const max = computed(() => (props.rows.length ? valueOf(props.rows[0]) || 1 : 1))

const mainValue = (row) => {
  const value = valueOf(row)
  // El TDO y el ataque base (Dinamax) van enteros: «306.0» no dice más que «306».
  return props.sortBy === 'tdo' || props.sortBy === 'value' ? Math.round(value) : value.toFixed(1)
}

const percent = (row) => Math.round((valueOf(row) / max.value) * 100)
</script>

<template>
  <ol class="flex flex-col gap-2">
    <li data-fila-top v-for="row in rows" :key="rowKey(row)">
      <!--
        El enlace ocupa la fila entera: se llega con el tabulador y se puede
        abrir en otra pestaña, cosa que un <li> con @click no permitía.

        Tres columnas, cada una centrada en toda la altura: el sprite con el
        puesto en una esquina; el nombre y, debajo, los ataques; y la cifra con
        su barra. Así todo queda alineado de una fila a otra, aunque unas
        tengan más ataques que otras.
      -->
      <component
        :is="row.dex ? 'router-link' : 'div'"
        :to="row.dex ? `/pokemon/${row.dex}` : undefined"
        class="grid grid-cols-[3.25rem_minmax(0,1fr)_72px] sm:grid-cols-[3.75rem_minmax(0,1fr)_80px] items-center gap-x-3 p-2 pr-3 border rounded-xl shadow-md bg-white dark:bg-gray-900 hover:bg-gray-150 hover:dark:bg-gray-800"
        :class="
          row.version === 'gigantamax'
            ? 'border-fuchsia-500 dark:border-fuchsia-400'
            : 'border-gray-300 dark:border-gray-700'
        "
      >
        <span class="relative block">
          <base-sprite
            :src="spriteUrl(row.spriteId)"
            :oscuro="row.shadow"
            class="w-[3.25rem] h-[3.25rem] sm:w-[3.75rem] sm:h-[3.75rem]"
            img-class="drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark"
          />
          <span
            class="absolute -top-1 -left-1 z-10 min-w-[1.25rem] px-1 rounded-md bg-gray-200 dark:bg-gray-700 text-center text-mini font-bold tabular-nums text-gray-700 dark:text-gray-200"
          >
            {{ row.rank }}
          </span>
        </span>

        <div class="min-w-0 flex flex-col gap-1">
          <!-- flex-wrap: si no caben, bajan las marcas y no se parte el nombre («Chariz-ard»). -->
          <div class="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              class="min-w-0 text-sm font-semibold leading-snug text-gray-800 dark:text-gray-200 break-words"
            >
              {{ localName(row) }}
            </span>
            <type-icons :types="row.types" size="12" class="shrink-0" />
          </div>

          <max-move-lines
            v-if="row.maxLines"
            :lines="row.maxLines"
            line-class="min-w-0 text-mini text-gray-600 dark:text-gray-300"
          />
          <!--
            PvE: rápido y cargado, cada uno en su fila. Casi nunca caben juntos, y
            las pocas filas en que sí salían más bajas que el resto.
          -->
          <div
            v-else
            class="flex gap-1.5 text-mini text-gray-600 dark:text-gray-300"
            :class="row.moves ? 'flex-wrap' : 'flex-col items-start'"
          >
            <move-tag
              v-for="move in movesOf(row)"
              :key="move.id ?? move.nameEs"
              chip
              :name="localName(move)"
              :type="move.type"
              :elite="move.elite"
              :legacy="move.legacy"
              :mega="move.mega"
            />
          </div>
        </div>

        <div class="text-right">
          <div class="font-bold text-gray-800 dark:text-gray-100 leading-tight">
            {{ mainValue(row) }}
            <span v-if="unitLabel" class="text-mini font-normal text-gray-600 dark:text-gray-300">
              {{ unitLabel }}
            </span>
          </div>
          <div
            v-if="showBar"
            class="mt-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
          >
            <span
              class="block h-full bg-gray-500 dark:bg-gray-300"
              :style="{ width: percent(row) + '%' }"
            ></span>
          </div>
          <div v-if="showSecondary" class="mt-0.5 text-mini text-gray-600 dark:text-gray-300">
            <template v-if="sortBy !== 'dps'">{{ row.dps.toFixed(1) }} DPS</template>
            <template v-else>{{ Math.round(row.tdo) }} TDO</template>
          </div>
          <!-- El STAB va con la cifra, que es lo que multiplica: junto al nombre bajaba de línea. -->
          <stab-badge v-if="row.stab" class="mt-1 inline-block" />
        </div>
      </component>
    </li>
  </ol>
</template>
