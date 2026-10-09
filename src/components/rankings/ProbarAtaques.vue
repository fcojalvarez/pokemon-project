<script setup>
/**
 * «Probar otros ataques» de una fila del Top PvE: eliges un rápido y un
 * cargado, dice en qué puesto quedaría con ellos y «Ponerlo en el Top» saca
 * la fila fantasma (punteada) debajo de la suya, con ese puesto.
 *
 * Responde a «el mío no tiene ese ataque, ¿dónde queda?» sin salir del Top:
 * es lo mismo que «¿Y con otros ataques?» de la ficha, con las cuentas de la
 * lista que se está viendo. El cálculo lo hace `probar` (probarConjunto de
 * useTopFilas); aquí solo se elige y se cuenta.
 */
import { computed, ref, watch } from 'vue'
import BaseModal from '../base/BaseModal.vue'
import MoveTag from '../pokemon/MoveTag.vue'
import { useTranslate, formatDecimal } from '../../composables/useTranslate'
import { useGameDataStore } from '../../stores/gameData'
import { origenDe } from '../../utils/moveOrigins'

const props = defineProps({
  /** La fila del Top que se prueba, o null con el modal cerrado. */
  row: { type: Object, default: null },
  /** La métrica del Top: la cifra que se enseña. */
  sortBy: { type: String, default: 'edps' },
  /** probarConjunto de useTopFilas. */
  probar: { type: Function, required: true }
})
const emit = defineEmits(['close', 'poner'])

const { t, localName } = useTranslate()
const gameData = useGameDataStore()

const SIGLAS = { edps: 'eDPS', dps: 'DPS', tdo: 'TDO' }

const rapido = ref(null)
const cargado = ref(null)

// Se empieza con los ataques de la fila: casi siempre se cambia solo uno.
watch(
  () => props.row,
  (row) => {
    rapido.value = row?.fast.id ?? null
    cargado.value = row?.charged.id ?? null
  },
  { immediate: true }
)

/** Sus ataques, como en la ficha: el exclusivo de la supermega va con los cargados. */
const ataques = computed(() => {
  const entry = props.row && gameData.byId.get(props.row.id)
  if (!entry) return { fast: [], charged: [] }
  const origen = origenDe(entry)
  const pick = (ids) =>
    ids.map((id) => gameData.moves[id] && { ...gameData.moves[id], ...origen(id) }).filter(Boolean)
  return { fast: pick(entry.fast), charged: pick([...entry.charged, ...(entry.megaMoves ?? [])]) }
})

const resultado = computed(() =>
  props.row && rapido.value && cargado.value
    ? props.probar({ id: props.row.id, fast: rapido.value, charged: cargado.value })
    : null
)

const cifra = (fila) =>
  props.sortBy === 'tdo' ? Math.round(fila[props.sortBy]) : formatDecimal(fila[props.sortBy])

const poner = () => {
  emit('poner', { id: props.row.id, fast: rapido.value, charged: cargado.value })
  emit('close')
}
</script>

<template>
  <base-modal
    :open="Boolean(row)"
    :title="row ? t('top.probar.title', { name: localName(row) }) : ''"
    @close="emit('close')"
  >
    <div v-if="row" class="p-4 flex flex-col gap-3 text-sm">
      <p class="text-xs text-gray-600 dark:text-gray-300">{{ $t('top.probar.hint') }}</p>

      <div>
        <h3 class="subtitulo">{{ $t('pokemon.fastMoves') }}</h3>
        <div class="flex flex-wrap gap-1 mt-1">
          <button
            v-for="move in ataques.fast"
            :key="move.id"
            type="button"
            class="rounded-full"
            :aria-pressed="rapido === move.id"
            @click="rapido = move.id"
          >
            <move-tag
              chip
              :name="localName(move)"
              :type="move.type"
              :elite="move.elite"
              :legacy="move.legacy"
              :selected="rapido === move.id"
            />
          </button>
        </div>
        <h3 class="mt-2 subtitulo">{{ $t('pokemon.chargedMoves') }}</h3>
        <div class="flex flex-wrap gap-1 mt-1">
          <button
            v-for="move in ataques.charged"
            :key="move.id"
            type="button"
            class="rounded-full"
            :aria-pressed="cargado === move.id"
            @click="cargado = move.id"
          >
            <move-tag
              chip
              :name="localName(move)"
              :type="move.type"
              :elite="move.elite"
              :legacy="move.legacy"
              :mega="move.mega"
              :selected="cargado === move.id"
            />
          </button>
        </div>
      </div>

      <!-- role=status: al cambiar un ataque, el lector de pantalla lee el puesto. -->
      <div role="status" class="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs">
        <template v-if="resultado?.fuera">
          {{ $t('top.probar.notInList', { type: $t(`types.${row.tipo ?? row.charged.type}`) }) }}
        </template>
        <template v-else-if="resultado?.sinDatos">{{ $t('top.probar.noData') }}</template>
        <template v-else-if="resultado?.fila">
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-semibold"
              >{{ localName(resultado.fila.fast) }} + {{ localName(resultado.fila.charged) }}</span
            >
            <span class="shrink-0 font-bold tabular-nums"
              >{{ cifra(resultado.fila) }} {{ SIGLAS[sortBy] }}</span
            >
          </div>
          <p v-if="resultado.esLaSuya" class="mt-1 text-gray-600 dark:text-gray-300">
            {{ $t('top.probar.isBest') }}
          </p>
          <template v-else>
            <p class="mt-1 text-base font-bold tabular-nums">
              <template v-if="resultado.puesto">
                #{{ resultado.puesto }}
                <span
                  v-if="resultado.baja"
                  class="text-xs font-normal text-amber-700 dark:text-amber-400"
                  :title="$t('top.probar.drop', { n: resultado.baja })"
                  >▼ {{ resultado.baja }}</span
                >
              </template>
              <span v-else class="text-xs font-normal">{{
                $t('top.probar.beyond', { n: 500 })
              }}</span>
            </p>
            <p v-if="resultado.suya" class="mt-1 text-gray-600 dark:text-gray-300">
              {{
                $t('top.probar.versus', {
                  percent: resultado.porcentaje,
                  fast: localName(resultado.suya.fast),
                  charged: localName(resultado.suya.charged)
                })
              }}
            </p>
          </template>
        </template>
      </div>

      <button
        v-if="resultado?.fila && !resultado.esLaSuya"
        type="button"
        class="boton boton-principal self-end"
        @click="poner"
      >
        {{ $t('top.probar.place') }}
      </button>
    </div>
  </base-modal>
</template>
