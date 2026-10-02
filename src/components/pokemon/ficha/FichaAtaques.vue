<script setup>
/**
 * Mejores combinaciones de ataques y, debajo, todos los que puede aprender.
 *
 * Aunque no haya combinaciones que puntuar (Applin solo tiene Forcejeo, que no
 * cuenta), la lista de ataques se enseña igual.
 *
 * Los ataques de la lista se pueden elegir: con un rápido y un cargado, dice
 * en qué puesto del Top quedaría con ellos y cuánto pierde frente a su mejor
 * conjunto. El Top lo coloca con el mejor, aunque lleve un élite o un legacy
 * que muchos no tienen; esto contesta «el mío no lo tiene, ¿dónde queda?».
 */
import { computed, ref, watch } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import MoveTag from '../MoveTag.vue'
import MoveLegend from '../MoveLegend.vue'
import BaseChevron from '../../base/BaseChevron.vue'
import { useTranslate } from '../../../composables/useTranslate'
import { useGameDataStore } from '../../../stores/gameData'
import { puestoDeConjunto } from '../../../utils/puestoAtaques'

const props = defineProps({
  bestMovesets: { type: Array, required: true },
  /** { fast, charged, origenes } de useFichaDatos. */
  movepool: { type: Object, required: true },
  /** La forma que se ve (la `entrada` de useFichaDatos), para el puesto con tus ataques. */
  entrada: { type: Object, default: null }
})

const { localName } = useTranslate()
const gameData = useGameDataStore()

/**
 * Los puestos se cuentan sobre los 500 primeros, como los de «Puestos en
 * incursiones»: el mismo cálculo y en caché, así que elegir no recalcula nada.
 */
const LIMITE = 500

const rapido = ref(null)
const cargado = ref(null)

/**
 * «¿Y con otros ataques?» va plegado y empieza siempre cerrado: no se guarda,
 * es una consulta de un momento. Cerrado, las listas son solo informativas;
 * abierto, sus ataques se eligen. Al cerrarlo se olvida lo elegido.
 */
const abiertoOtros = ref(false)
const alternarOtros = () => {
  abiertoOtros.value = !abiertoOtros.value
  if (!abiertoOtros.value) {
    rapido.value = null
    cargado.value = null
  }
}

// En la ficha de otro Pokémon (u otra forma) se empieza cerrado y sin elegir.
watch(
  () => props.entrada?.id,
  () => {
    abiertoOtros.value = false
    rapido.value = null
    cargado.value = null
  }
)

// Tocar el elegido lo quita. Una función por lista: en la plantilla, las refs
// llegan ya desenvueltas y no se podrían cambiar desde allí.
const elegirRapido = (id) => {
  rapido.value = rapido.value === id ? null : id
}
const elegirCargado = (id) => {
  cargado.value = cargado.value === id ? null : id
}

/**
 * Solo hay desplegable si hay conjuntos que puntuar: con Applin, que solo
 * tiene Forcejeo, no habría nada que decir. Y solo se elige con él abierto.
 */
const puedeElegir = computed(() => Boolean(props.entrada) && props.bestMovesets.length > 0)
const elegible = computed(() => puedeElegir.value && abiertoOtros.value)

/** Con los dos elegidos: el conjunto, su puesto y el de su mejor conjunto. */
const conTusAtaques = computed(() => {
  if (!rapido.value || !cargado.value || !props.entrada || !gameData.isReady) return null
  // Todos los conjuntos (el de los mejores trae solo cinco).
  const todos = gameData.bestMovesets(props.entrada, 1000)
  const conjunto = todos.find(
    (uno) => uno.fast.id === rapido.value && uno.charged.id === cargado.value
  )
  // Un ataque sin datos de daño en incursiones (el de una supermega, aún sin
  // publicar) no tiene conjunto que puntuar.
  if (!conjunto) return { sinDatos: true }
  const ranking = gameData.pveRankings({ limit: LIMITE })
  const mejor = todos[0]
  return {
    conjunto,
    puesto: puestoDeConjunto(conjunto, props.entrada.id, ranking, LIMITE),
    mejor,
    puestoMejor: puestoDeConjunto(mejor, props.entrada.id, ranking, LIMITE),
    porcentaje: Math.round((conjunto.dps / mejor.dps) * 100),
    esElMejor: conjunto === mejor
  }
})

/** Las dos casillas del resultado: en general y en el tipo del cargado. */
const casillas = computed(() => {
  const r = conTusAtaques.value
  if (!r?.conjunto) return []
  return [
    {
      clave: 'general',
      etiqueta: 'pokemon.yourMoves.overall',
      puesto: r.puesto.general,
      mejor: r.puestoMejor.general
    },
    {
      clave: 'tipo',
      etiqueta: `types.${r.conjunto.charged.type}`,
      puesto: r.puesto.tipo,
      mejor: r.puestoMejor.tipo
    }
  ]
})

/** Cuántos puestos baja frente al mejor; nada si no se puede saber o no baja. */
const baja = (puesto, mejor) => (puesto && mejor && puesto > mejor ? puesto - mejor : null)

/** Plegada: la mejor combinación o, sin ninguna, los ataques que tiene. */
const resumen = computed(() => {
  const mejor = props.bestMovesets[0]
  if (mejor)
    return `${localName(mejor.fast)} + ${localName(mejor.charged)} · ${mejor.dps.toFixed(1)} DPS`
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

    <div
      :class="
        bestMovesets.length ? 'mt-3 pt-3 border-t border-gray-300 dark:border-gray-700' : 'mt-2'
      "
    >
      <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('pokemon.fastMoves') }}</span>
      <div class="flex flex-wrap gap-1 mt-1">
        <component
          :is="elegible ? 'button' : 'span'"
          v-for="move in movepool.fast"
          :key="move.id"
          :type="elegible ? 'button' : undefined"
          :aria-pressed="elegible ? rapido === move.id : undefined"
          class="rounded-full"
          @click="elegible && elegirRapido(move.id)"
        >
          <move-tag
            chip
            :name="localName(move)"
            :type="move.type"
            :elite="move.elite"
            :legacy="move.legacy"
            :selected="rapido === move.id"
          />
        </component>
      </div>
      <span class="block mt-2 text-mini text-gray-600 dark:text-gray-300">
        {{ $t('pokemon.chargedMoves') }}
      </span>
      <div class="flex flex-wrap gap-1 mt-1">
        <component
          :is="elegible ? 'button' : 'span'"
          v-for="move in movepool.charged"
          :key="move.id"
          :type="elegible ? 'button' : undefined"
          :aria-pressed="elegible ? cargado === move.id : undefined"
          class="rounded-full"
          @click="elegible && elegirCargado(move.id)"
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
        </component>
      </div>

      <!-- El desplegable: cerrado no ocupa más que esta línea. -->
      <button
        v-if="puedeElegir"
        type="button"
        class="mt-3 flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-100 hover:underline"
        :aria-expanded="abiertoOtros"
        @click="alternarOtros"
      >
        {{ $t('pokemon.yourMoves.title') }}
        <base-chevron :open="abiertoOtros" size="w-3.5 h-3.5" />
      </button>
      <p v-if="elegible" class="mt-1 text-mini text-gray-600 dark:text-gray-300">
        {{ $t('pokemon.yourMoves.hint') }}
      </p>

      <!-- role=status: al elegir el segundo, el lector de pantalla lee el puesto. -->
      <div role="status">
        <p
          v-if="conTusAtaques?.sinDatos"
          class="mt-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300"
        >
          {{ $t('pokemon.yourMoves.noData') }}
        </p>
        <div
          v-else-if="conTusAtaques"
          class="mt-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
        >
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-semibold"
              >{{ localName(conTusAtaques.conjunto.fast) }} +
              {{ localName(conTusAtaques.conjunto.charged) }}</span
            >
            <span class="shrink-0 font-bold">{{ conTusAtaques.conjunto.dps.toFixed(1) }} DPS</span>
          </div>
          <dl class="mt-2 grid grid-cols-2 gap-2">
            <div
              v-for="casilla in casillas"
              :key="casilla.clave"
              class="p-2 rounded-lg bg-white dark:bg-gray-900"
            >
              <dt class="text-mini text-gray-600 dark:text-gray-300">{{ $t(casilla.etiqueta) }}</dt>
              <dd class="text-sm font-bold tabular-nums">
                <template v-if="casilla.puesto">
                  #{{ casilla.puesto }}
                  <span
                    v-if="baja(casilla.puesto, casilla.mejor)"
                    class="text-mini font-normal text-amber-700 dark:text-amber-400"
                    :title="
                      $t('pokemon.yourMoves.dropHelp', { n: baja(casilla.puesto, casilla.mejor) })
                    "
                    >▼ {{ baja(casilla.puesto, casilla.mejor) }}</span
                  >
                </template>
                <span v-else class="text-xs font-normal text-gray-600 dark:text-gray-300">{{
                  $t('pokemon.yourMoves.beyond', { n: LIMITE })
                }}</span>
              </dd>
            </div>
          </dl>
          <p class="mt-2 text-mini text-gray-600 dark:text-gray-300">
            <template v-if="conTusAtaques.esElMejor">{{ $t('pokemon.yourMoves.isBest') }}</template>
            <template v-else>{{
              $t('pokemon.yourMoves.versusBest', {
                percent: conTusAtaques.porcentaje,
                fast: localName(conTusAtaques.mejor.fast),
                charged: localName(conTusAtaques.mejor.charged)
              })
            }}</template>
          </p>
        </div>
      </div>
      <move-legend class="mt-3" v-bind="movepool.origenes" />
    </div>
  </ficha-seccion>
</template>
