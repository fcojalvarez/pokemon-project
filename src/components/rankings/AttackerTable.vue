<script setup>
/**
 * El ranking del Top en tabla, para escritorio ancho. Mismas filas que
 * <attacker-list>, pero con cada dato en su columna: así eDPS, DPS y TDO quedan
 * alineados y se comparan de un vistazo.
 *
 * En PvE se ordena pulsando la cabecera de eDPS, DPS o TDO (sustituye al
 * selector «Ordenar por»). En Dinamax y PvP el orden es fijo.
 *
 * Toda la fila es el enlace a la ficha: el del nombre se estira sobre la fila.
 */
import { computed } from 'vue'
import { usePorTandas } from '../../composables/usePorTandas'
import TypeIcons from '../base/TypeIcons.vue'
import StabBadge from '../base/StabBadge.vue'
import BaseNivel from '../base/BaseNivel.vue'
import IconoPapel from '../base/IconoPapel.vue'
import IconoClima from '../base/IconoClima.vue'
import { useTituloClima } from '../../composables/useTituloClima'
import MoveTag from '../pokemon/MoveTag.vue'
import BaseSprite from '../base/BaseSprite.vue'
import { spriteUrl } from '../../utils/sprites'
import { useTranslate, formatDecimal } from '../../composables/useTranslate'
import MaxMoveLines from './MaxMoveLines.vue'
import { fichaDeFila, movesOf, rowKey } from '../../utils/rankingRows'
import { useGameDataStore } from '../../stores/gameData'

const props = defineProps({
  rows: { type: Array, required: true },
  /** 'pve' | 'max' | 'pvp' */
  mode: { type: String, default: 'pve' },
  sortBy: { type: String, default: 'edps' },
  /**
   * La letra de cada puesto, al final de la fila: 'general' (la lista general
   * y las de PvP), 'tipo' (la de un tipo, con cortes más cortos) o nada.
   */
  nivel: { type: String, default: '' }
})

/** Las filas por tandas: lo que cabe en pantalla primero (ver usePorTandas). */
const filas = usePorTandas(() => props.rows)
const emit = defineEmits(['update:sortBy'])
const { t, localName } = useTranslate()
const gameData = useGameDataStore()
const fichaDe = (row) => fichaDeFila(row, gameData.fichaBase)

const METRICAS = ['edps', 'dps', 'tdo']
/** La sigla de cada columna: «eDPS» lleva la e minúscula. */
const SIGLAS = { edps: 'eDPS', dps: 'DPS', tdo: 'TDO' }

/** Top Max: cada fila lleva sus letras de atacante, tanque y sanador. */
const conPapeles = computed(() => props.rows.some((row) => row.papeles))
const PAPELES = ['atacante', 'tanque', 'sanador']
/** Atacante: su puesto en esta lista; tanque y sanador, entre todos los que dinamaxizan. */
const puestoPapel = (row, papel) => (papel === 'atacante' ? row.rank : row.papeles?.[papel])

/** La columna que manda: la de la barra. */
const principal = computed(() => (props.mode === 'pve' ? props.sortBy : 'value'))
const valor = (row, clave) => row[clave] ?? row.value ?? 0
// En «Todos» la barra sigue a la puntuación por la que se ordena (`general`:
// la media contra todos los jefes; sin tabla de tipos, la suma de sus dos
// mejores tipos).
const barra = (row) => row.general ?? valor(row, principal.value)
const tope = computed(() => Math.max(1e-9, ...props.rows.map(barra)))
const porcentaje = (row) => Math.round((barra(row) / tope.value) * 100)
const formato = (clave, v) =>
  clave === 'tdo' || props.mode === 'max' || props.mode === 'gym'
    ? Math.round(v)
    : formatDecimal(Number(v))
const tituloClima = useTituloClima()

const tituloValor = computed(() =>
  props.mode === 'max'
    ? t('max.damageUnit')
    : props.mode === 'gym'
    ? t('top.gym.unit')
    : t('top.pvpUnit')
)
const ordenar = (metrica) => {
  if (metrica !== props.sortBy) emit('update:sortBy', metrica)
}
</script>

<template>
  <div
    class="overflow-x-auto border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
  >
    <table class="w-full border-collapse text-left">
      <thead class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
        <tr class="text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300">
          <th scope="col" class="w-10 px-3 py-2 font-semibold text-right">#</th>
          <th scope="col" class="px-3 py-2 font-semibold">{{ $t('top.pokemonColumn') }}</th>
          <template v-if="mode === 'pve'">
            <!-- Una columna para los dos, el rápido delante: con dos, «Ataques
                 cargados» saltaba de línea y repetían «Ataques». -->
            <th scope="col" class="px-3 py-2 font-semibold">{{ $t('top.moves') }}</th>
            <th
              v-for="metrica in METRICAS"
              :key="metrica"
              scope="col"
              class="px-3 py-2 font-semibold text-right"
              :aria-sort="sortBy === metrica ? 'descending' : 'none'"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1 normal-case tracking-wider rounded-md"
                :class="
                  sortBy === metrica
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'hover:text-gray-900 hover:dark:text-gray-100'
                "
                :title="$t(`top.${metrica}Help`)"
                @click="ordenar(metrica)"
              >
                {{ SIGLAS[metrica] }}
                <span aria-hidden="true" class="text-[10px]">{{
                  sortBy === metrica ? '▼' : '↕'
                }}</span>
              </button>
            </th>
          </template>
          <template v-else>
            <th scope="col" class="px-3 py-2 font-semibold">{{ $t('top.moves') }}</th>
            <th scope="col" class="px-3 py-2 font-semibold text-right" aria-sort="descending">
              {{ tituloValor }}
            </th>
          </template>
          <th v-if="nivel" scope="col" class="px-3 py-2 font-semibold text-center">
            {{ $t('top.tierColumn') }}
          </th>
          <!-- Max: una columna por papel, con su icono, como la de «Nivel». -->
          <template v-else-if="conPapeles">
            <th
              v-for="papel in PAPELES"
              :key="papel"
              scope="col"
              class="px-2 py-2 text-center"
              :title="$t(`max.rolesLegend.${papel}`)"
            >
              <icono-papel :papel="papel" class="inline-block w-4 h-4" />
              <span class="sr-only">{{ $t(`max.roles.${papel}`) }}</span>
            </th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in filas"
          :key="rowKey(row)"
          data-fila-top
          class="relative border-t border-gray-300 dark:border-gray-700 first:border-t-0 even:bg-gray-50 dark:even:bg-gray-800/40 hover:bg-gray-150 hover:dark:bg-gray-800"
        >
          <td
            class="px-3 py-1.5 text-right text-xs text-gray-600 dark:text-gray-300 tabular-nums"
            :class="
              row.version === 'gigantamax'
                ? 'shadow-[inset_4px_0_0] shadow-fuchsia-500 dark:shadow-fuchsia-400'
                : ''
            "
          >
            {{ row.rank }}
          </td>
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
                :to="fichaDe(row)"
                class="text-sm font-semibold text-gray-800 dark:text-gray-200 after:absolute after:inset-0 after:content-['']"
                >{{ localName(row) }}</router-link
              >
              <span v-else class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{
                localName(row)
              }}</span>
              <type-icons :types="row.types" size="12" class="shrink-0" />
            </div>
          </td>
          <template v-if="mode === 'pve'">
            <td class="px-3 py-1.5 text-mini">
              <span class="flex gap-1.5 whitespace-nowrap">
                <move-tag
                  chip
                  :name="localName(row.fast)"
                  :type="row.fast.type"
                  :elite="row.fast.elite"
                  :legacy="row.fast.legacy"
                />
                <move-tag
                  chip
                  :name="localName(row.charged)"
                  :type="row.charged.type"
                  :elite="row.charged.elite"
                  :legacy="row.charged.legacy"
                  :mega="row.charged.mega"
                />
              </span>
            </td>
            <td
              v-for="metrica in METRICAS"
              :key="metrica"
              class="px-3 py-1.5 text-right tabular-nums"
              :class="
                metrica === sortBy
                  ? 'text-sm font-bold text-gray-900 dark:text-gray-100'
                  : 'text-xs text-gray-600 dark:text-gray-300'
              "
            >
              <span class="inline-flex items-center justify-end gap-2">
                <span
                  v-if="metrica === sortBy"
                  class="w-14 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
                  aria-hidden="true"
                  ><span
                    class="block h-full bg-gray-600 dark:bg-gray-300"
                    :style="{ width: porcentaje(row) + '%' }"
                  ></span
                ></span>
                {{ formato(metrica, row[metrica]) }}
              </span>
              <!-- Debajo, en ámbar, con el clima que potencia su tipo. -->
              <span
                v-if="metrica === sortBy && row.conClima"
                class="flex items-center justify-end gap-1 text-mini font-bold text-amber-700 dark:text-amber-400"
                :title="tituloClima(row.conClima.clima)"
              >
                <icono-clima :clima="row.conClima.clima" class="w-3.5 h-3.5" />
                <span class="sr-only">{{ tituloClima(row.conClima.clima) }}:</span>
                {{ formato(metrica, row.conClima[metrica]) }}
              </span>
            </td>
          </template>
          <template v-else>
            <td v-if="row.maxLines" class="px-3 py-1.5 text-mini">
              <div class="flex flex-col gap-1.5">
                <max-move-lines :lines="row.maxLines" />
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
                />
              </span>
            </td>
            <td
              class="px-3 py-1.5 text-right text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums"
            >
              <span class="inline-flex items-center justify-end gap-2">
                <span
                  v-if="mode === 'max' || mode === 'gym'"
                  class="w-14 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
                  aria-hidden="true"
                >
                  <span
                    class="block h-full bg-gray-600 dark:bg-gray-300"
                    :style="{ width: porcentaje(row) + '%' }"
                  ></span>
                </span>
                <stab-badge v-if="row.stab" />
                {{ formato('value', row.value) }}
              </span>
              <span
                v-if="row.psDefensor"
                class="block text-mini font-normal text-gray-600 dark:text-gray-300"
              >
                {{ row.psDefensor }} {{ $t('top.gym.hp') }} · {{ row.defensa }}
                {{ $t('top.gym.def') }}
              </span>
            </td>
          </template>
          <td v-if="nivel" class="px-3 py-1.5 text-center">
            <base-nivel :rank="row.rank" :por-tipo="nivel === 'tipo'" />
          </td>
          <template v-else-if="conPapeles">
            <td v-for="papel in PAPELES" :key="papel" class="px-2 py-1.5 text-center">
              <base-nivel v-if="puestoPapel(row, papel)" :rank="puestoPapel(row, papel)" />
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
