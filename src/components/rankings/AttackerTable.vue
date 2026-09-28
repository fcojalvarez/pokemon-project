<script setup>
/**
 * El ranking del Top en tabla, para escritorio ancho. Mismas filas que
 * <attacker-list>, pero con cada dato en su columna: así DPS, TDO y ER quedan
 * alineados y se comparan de un vistazo.
 *
 * En PvE se ordena pulsando la cabecera de DPS, TDO o ER (sustituye al
 * selector «Ordenar por»). En Dinamax y PvP el orden es fijo.
 *
 * Toda la fila es el enlace a la ficha: el del nombre se estira sobre la fila.
 */
import { computed } from 'vue'
import TypeIcons from '../base/TypeIcons.vue'
import StabBadge from '../base/StabBadge.vue'
import MoveTag from '../pokemon/MoveTag.vue'
import BaseSprite from '../base/BaseSprite.vue'
import { spriteUrl } from '../../utils/sprites'
import { useTranslate } from '../../composables/useTranslate'

const props = defineProps({
  rows: { type: Array, required: true },
  /** 'pve' | 'max' | 'pvp' */
  mode: { type: String, default: 'pve' },
  sortBy: { type: String, default: 'dps' }
})
const emit = defineEmits(['update:sortBy'])
const { t, localName } = useTranslate()

const METRICAS = ['dps', 'tdo', 'er']

/** La columna que manda: la de la barra. */
const principal = computed(() => (props.mode === 'pve' ? props.sortBy : 'value'))
const valor = (row, clave) => row[clave] ?? row.value ?? 0
const tope = computed(() => (props.rows.length ? valor(props.rows[0], principal.value) || 1 : 1))
const porcentaje = (row) => Math.round((valor(row, principal.value) / tope.value) * 100)
const formato = (clave, v) => (clave === 'tdo' || props.mode === 'max' ? Math.round(v) : Number(v).toFixed(1))

const movesOf = (row) => row.moves ?? [row.fast, row.charged].filter(Boolean)
const clave = (row) => [row.id, ...movesOf(row).map((m) => m?.id ?? m?.nameEs)].join('-')

const tituloValor = computed(() => (props.mode === 'max' ? t('max.damageUnit') : t('top.score')))
const ordenar = (metrica) => {
  if (metrica !== props.sortBy) emit('update:sortBy', metrica)
}
</script>

<template>
  <div class="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900">
    <table class="w-full border-collapse text-left">
      <thead class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
        <tr class="text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300">
          <th scope="col" class="w-10 px-3 py-2 font-semibold text-right">#</th>
          <th scope="col" class="px-3 py-2 font-semibold">{{ $t('top.pokemonColumn') }}</th>
          <template v-if="mode === 'pve'">
            <th scope="col" class="px-3 py-2 font-semibold">{{ $t('pokemon.fastMoves') }}</th>
            <th scope="col" class="px-3 py-2 font-semibold">{{ $t('pokemon.chargedMoves') }}</th>
            <th
              v-for="metrica in METRICAS"
              :key="metrica"
              scope="col"
              class="px-3 py-2 font-semibold text-right"
              :aria-sort="sortBy === metrica ? 'descending' : 'none'"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1 uppercase tracking-wider rounded-md"
                :class="sortBy === metrica ? 'text-gray-900 dark:text-gray-100' : 'hover:text-gray-900 hover:dark:text-gray-100'"
                :title="$t(`top.${metrica}Help`)"
                @click="ordenar(metrica)"
              >
                {{ metrica }}
                <span aria-hidden="true" class="text-[10px]">{{ sortBy === metrica ? '▼' : '↕' }}</span>
              </button>
            </th>
          </template>
          <template v-else>
            <th scope="col" class="px-3 py-2 font-semibold">{{ $t('top.moves') }}</th>
            <th scope="col" class="px-3 py-2 font-semibold text-right" aria-sort="descending">{{ tituloValor }}</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="clave(row)"
          data-fila-top
          class="relative border-t border-gray-300 dark:border-gray-700 first:border-t-0 even:bg-gray-50 dark:even:bg-gray-800/40 hover:bg-gray-150 hover:dark:bg-gray-800"
        >
          <td
            class="px-3 py-1.5 text-right text-xs text-gray-600 dark:text-gray-300 tabular-nums"
            :class="row.version === 'gigantamax' ? 'shadow-[inset_4px_0_0] shadow-fuchsia-500 dark:shadow-fuchsia-400' : ''"
          >{{ row.rank }}</td>
          <td class="px-3 py-1.5">
            <div class="flex items-center gap-2 min-w-0">
              <base-sprite
                :src="spriteUrl(row.spriteId)"
                :oscuro="row.shadow"
                class="w-9 h-9 shrink-0"
                img-class="drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark"
              />
              <router-link
                v-if="row.dex"
                :to="`/pokemon/${row.dex}`"
                class="text-sm font-semibold text-gray-800 dark:text-gray-200 after:absolute after:inset-0 after:content-['']"
              >{{ localName(row) }}</router-link>
              <span v-else class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ localName(row) }}</span>
              <type-icons :types="row.types" size="12" class="shrink-0" />
            </div>
          </td>
          <template v-if="mode === 'pve'">
            <td class="px-3 py-1.5 text-mini">
              <move-tag chip :name="localName(row.fast)" :type="row.fast.type" :elite="row.fast.elite" :legacy="row.fast.legacy" />
            </td>
            <td class="px-3 py-1.5 text-mini">
              <move-tag chip :name="localName(row.charged)" :type="row.charged.type" :elite="row.charged.elite" :legacy="row.charged.legacy" :mega="row.charged.mega" />
            </td>
            <td
              v-for="metrica in METRICAS"
              :key="metrica"
              class="px-3 py-1.5 text-right tabular-nums"
              :class="metrica === sortBy ? 'text-sm font-bold text-gray-900 dark:text-gray-100' : 'text-xs text-gray-600 dark:text-gray-300'"
            >
              <span class="inline-flex items-center justify-end gap-2">
                <span
                  v-if="metrica === sortBy"
                  class="w-14 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
                  aria-hidden="true"
                ><span class="block h-full bg-gray-600 dark:bg-gray-300" :style="{ width: porcentaje(row) + '%' }"></span></span>
                {{ formato(metrica, row[metrica]) }}
              </span>
            </td>
          </template>
          <template v-else>
            <td v-if="row.maxLines" class="px-3 py-1.5 text-mini">
              <div class="flex flex-col gap-1.5">
                <!--
                  Max: bajo el nombre, su Ataque Max (el Gigamax, en fucsia) y debajo los
                  rápidos que lo dan. Con «Todos», un bloque así por cada Ataque Max.
                -->
                <div v-for="linea in row.maxLines" :key="linea.max.id" class="min-w-0">
                  <p
                    class="flex items-center gap-1 pl-[9px] text-xs font-semibold"
                    :class="linea.gigamax ? 'text-fuchsia-700 dark:text-fuchsia-300' : 'text-gray-800 dark:text-gray-100'"
                    :title="linea.gigamax ? $t('moves.gigamaxHelp') : null"
                  >
                    <type-icons :types="[linea.max.type]" size="10" />
                    {{ localName(linea.max) }}
                  </p>
                  <span class="mt-1 flex flex-wrap gap-1.5">
                    <move-tag
                      v-for="rapido in linea.rapidos"
                      :key="rapido.id"
                      chip
                      :name="localName(rapido)"
                      :type="rapido.type"
                    />
                  </span>
                </div>
              </div>
            </td>
            <td v-else class="px-3 py-1.5 text-mini">
              <span class="flex flex-wrap gap-1.5">
                <move-tag
                  v-for="move in movesOf(row)"
                  :key="move.id ?? move.nameEs"
                  chip
                  :name="localName(move)"
                  :type="move.type"
                  :elite="move.elite"
                  :legacy="move.legacy"
                  :mega="move.mega"
                  :gigamax="move.gigamax"
                />
              </span>
            </td>
            <td class="px-3 py-1.5 text-right text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
              <span class="inline-flex items-center justify-end gap-2">
                <span v-if="mode === 'max'" class="w-14 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden" aria-hidden="true">
                  <span class="block h-full bg-gray-600 dark:bg-gray-300" :style="{ width: porcentaje(row) + '%' }"></span>
                </span>
                <stab-badge v-if="row.stab" />
                {{ formato('value', row.value) }}
              </span>
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
