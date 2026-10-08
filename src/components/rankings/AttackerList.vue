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
 *   - PvE: `{ fast, charged, dps, tdo, edps }` tal y como sale de evaluatePokemon.
 *   - PvP: `{ moves: [{ name, nameEs, type }], value }` ya normalizada por la vista.
 */
import { computed } from 'vue'
import { usePorTandas } from '../../composables/usePorTandas'
import TypeIcons from '../base/TypeIcons.vue'
import MoveTag from '../pokemon/MoveTag.vue'
import { spriteUrl } from '../../utils/sprites'
import BaseSprite from '../base/BaseSprite.vue'
import { localName, formatDecimal } from '../../composables/useTranslate'
import StabBadge from '../base/StabBadge.vue'
import BaseNivel from '../base/BaseNivel.vue'
import PapelesMax from './PapelesMax.vue'
import IconoClima from '../base/IconoClima.vue'
import { useTituloClima } from '../../composables/useTituloClima'
import MaxMoveLines from './MaxMoveLines.vue'
import { fichaDeFila, movesOf, rowKey } from '../../utils/rankingRows'
import { useGameDataStore } from '../../stores/gameData'

const props = defineProps({
  rows: { type: Array, required: true },
  sortBy: { type: String, default: 'edps' },
  // Etiqueta de la métrica. Por defecto la que corresponda a `sortBy`.
  unit: { type: String, default: null },
  // La barra compara cada fila con la primera: sin ranking ordenado no aporta.
  showBar: { type: Boolean, default: true },
  // Métrica de apoyo bajo la principal (en PvE, el DPS o el TDO contrario).
  showSecondary: { type: Boolean, default: true },
  /**
   * La letra de cada puesto, al final de la fila: 'general' (la lista general
   * y las de PvP), 'tipo' (la de un tipo, con cortes más cortos) o nada.
   */
  nivel: { type: String, default: '' },
  /**
   * En escritorio, dos columnas con las métricas por las que no se ordena
   * (de eDPS, DPS y TDO), con su cabecera encima de la lista. Solo PvE.
   */
  columnas: { type: Boolean, default: false }
})

/** Las filas por tandas: lo que cabe en pantalla primero (ver usePorTandas). */
const filas = usePorTandas(() => props.rows)

const UNITS = { edps: 'eDPS', dps: 'DPS', tdo: 'TDO' }

/** Top Max: cada fila lleva sus letras de atacante, tanque y sanador. */
const conPapeles = computed(() => props.rows.some((row) => row.papeles))

const gameData = useGameDataStore()
const fichaDe = (row) => fichaDeFila(row, gameData.fichaBase)

const unitLabel = computed(() => props.unit ?? UNITS[props.sortBy] ?? '')

const valueOf = (row) => row.value ?? row[props.sortBy]

// En «Todos» la barra sigue a la puntuación por la que se ordena (`general`:
// la media contra todos los jefes; sin tabla de tipos, la suma de sus dos
// mejores tipos).
const barra = (row) => row.general ?? valueOf(row)
const max = computed(() => Math.max(1e-9, ...props.rows.map(barra)))

const mainValue = (row) => {
  const value = valueOf(row)
  // El TDO y el ataque base (Dinamax) van enteros: «306.0» no dice más que «306».
  return props.sortBy === 'tdo' || props.sortBy === 'value'
    ? Math.round(value)
    : formatDecimal(value)
}

const percent = (row) => Math.round((barra(row) / max.value) * 100)

/** Las métricas de las columnas: las dos por las que no se ordena. */
const metricasColumnas = computed(() =>
  props.columnas ? ['edps', 'dps', 'tdo'].filter((m) => m !== props.sortBy) : []
)

const cifra = (row, metrica) =>
  metrica === 'tdo' ? Math.round(row[metrica]) : formatDecimal(row[metrica])

/**
 * Columnas de la fila: sprite, nombre y ataques, métrica y, si hay, la letra
 * o los papeles. Con `columnas`, desde lg entran las dos de cifras antes de la
 * métrica. La cabecera usa las mismas para quedar alineada.
 */
const gridCols = computed(() => {
  const [base, conColumnas] = props.nivel
    ? [
        'grid-cols-[3.25rem_minmax(0,1fr)_64px_1.5rem] sm:grid-cols-[3.75rem_minmax(0,1fr)_80px_1.5rem]',
        'lg:grid-cols-[3.75rem_minmax(0,1fr)_4.5rem_4.5rem_80px_1.5rem]'
      ]
    : conPapeles.value
    ? [
        'grid-cols-[3.25rem_minmax(0,1fr)_64px_2rem] sm:grid-cols-[3.75rem_minmax(0,1fr)_80px_2rem]',
        'lg:grid-cols-[3.75rem_minmax(0,1fr)_4.5rem_4.5rem_80px_2rem]'
      ]
    : [
        'grid-cols-[3.25rem_minmax(0,1fr)_72px] sm:grid-cols-[3.75rem_minmax(0,1fr)_80px]',
        'lg:grid-cols-[3.75rem_minmax(0,1fr)_4.5rem_4.5rem_80px]'
      ]
  return props.columnas ? `${base} ${conColumnas}` : base
})

const tituloClima = useTituloClima()
/** La cifra de la métrica que manda, con el clima. */
const cifraClima = (row) => {
  const valor = row.conClima[props.sortBy]
  return props.sortBy === 'tdo' ? Math.round(valor) : formatDecimal(valor)
}
</script>

<template>
  <!-- Cabecera de las columnas, con la misma rejilla y relleno que las filas. -->
  <div
    v-if="metricasColumnas.length"
    aria-hidden="true"
    class="hidden lg:grid gap-x-3 px-2 pr-3 pb-1 border border-transparent text-mini text-right text-gray-600 dark:text-gray-300"
    :class="gridCols"
  >
    <span v-for="(metrica, i) in metricasColumnas" :key="metrica" :class="i === 0 && 'col-start-3'">
      {{ UNITS[metrica] }}
    </span>
  </div>
  <ol class="flex flex-col gap-2">
    <li data-fila-top v-for="row in filas" :key="rowKey(row)">
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
        :to="row.dex ? fichaDe(row) : undefined"
        class="grid items-center gap-x-3 p-2 pr-3 border rounded-xl shadow-md bg-white dark:bg-gray-900 hover:bg-gray-150 hover:dark:bg-gray-800"
        :class="[
          gridCols,
          row.version === 'gigantamax'
            ? 'border-fuchsia-500 dark:border-fuchsia-400'
            : 'border-gray-300 dark:border-gray-700'
        ]"
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

        <!--
          Desde lg, nombre y ataques en una línea si caben; si no, los ataques
          bajan enteros debajo del nombre, como en el móvil.
        -->
        <div class="min-w-0 flex flex-col gap-1 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3">
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
            PvE: rápido y cargado, cada uno en su fila. En el móvil casi nunca
            caben juntos, y las pocas filas en que sí salían más bajas que el
            resto. En escritorio sobra sitio: van uno al lado del otro.
          -->
          <div
            v-else
            class="flex gap-1.5 text-mini text-gray-600 dark:text-gray-300"
            :class="row.moves ? 'flex-wrap' : 'flex-col items-start lg:flex-row lg:flex-wrap'"
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

        <span
          v-for="metrica in metricasColumnas"
          :key="metrica"
          class="hidden lg:block text-right text-sm tabular-nums text-gray-800 dark:text-gray-200"
        >
          <span class="sr-only">{{ UNITS[metrica] }}:</span>
          {{ cifra(row, metrica) }}
        </span>

        <div class="text-right">
          <!-- En una línea: «eDPS» bajaba solo en algunas filas (30,2 / eDPS). -->
          <div class="font-bold text-gray-800 dark:text-gray-100 leading-tight whitespace-nowrap">
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
          <!--
            Debajo, en ámbar, lo mismo con el clima que potencia su tipo: el
            orden no cambia, pero se ve cuánto ganaría con ese clima.
          -->
          <div
            v-if="showSecondary && row.conClima"
            class="mt-0.5 inline-flex items-center gap-1 text-mini font-bold tabular-nums text-amber-700 dark:text-amber-400"
            :title="tituloClima(row.conClima.clima)"
          >
            <icono-clima :clima="row.conClima.clima" class="w-3.5 h-3.5" />
            <span class="sr-only">{{ tituloClima(row.conClima.clima) }}:</span>
            {{ cifraClima(row) }}
          </div>
          <!-- PS y defensa de defensor, una por línea: juntas no cabían en la columna. -->
          <div
            v-else-if="showSecondary && row.psDefensor"
            class="mt-0.5 flex flex-col text-mini text-gray-600 dark:text-gray-300 tabular-nums"
          >
            <span>{{ row.psDefensor }} {{ $t('top.gym.hp') }}</span>
            <span>{{ row.defensa }} {{ $t('top.gym.def') }}</span>
          </div>
          <!-- Con columnas, en escritorio ya está en la suya. -->
          <div
            v-else-if="showSecondary"
            class="mt-0.5 text-mini text-gray-600 dark:text-gray-300"
            :class="columnas && 'lg:hidden'"
          >
            <template v-if="sortBy !== 'dps'">{{ formatDecimal(row.dps) }} DPS</template>
            <template v-else>{{ Math.round(row.tdo) }} TDO</template>
          </div>
          <!-- El STAB va con la cifra, que es lo que multiplica: junto al nombre bajaba de línea. -->
          <stab-badge v-if="row.stab" class="mt-1 inline-block" />
        </div>

        <base-nivel
          v-if="nivel"
          :rank="row.rank"
          :por-tipo="nivel === 'tipo'"
          class="justify-self-end"
        />
        <papeles-max
          v-else-if="conPapeles && row.papeles"
          :rank="row.rank"
          :papeles="row.papeles"
          class="justify-self-end"
        />
      </component>
    </li>
  </ol>
</template>
