<script setup>
/**
 * Las secciones de datos de la ficha, en el orden que elija cada uno.
 *
 * Los datos salen de useFichaDatos y cada sección es su componente (en
 * ./ficha/), que pinta su contenido y la línea que enseña plegada.
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useGameDataStore } from '../../stores/gameData'
import { useLiveStore } from '../../stores/live'
import { useOrdenFicha } from '../../composables/useOrdenFicha'
import { useFichaDatos } from '../../composables/useFichaDatos'
import { ICONOS_FICHA } from '../../utils/iconosFicha'
import { comoSeConsigue } from '../../utils/cambiosForma'
import WhereToFind from './WhereToFind.vue'
import MaxBattlePanel from './MaxBattlePanel.vue'
import FichaCostes from './ficha/FichaCostes.vue'
import FichaPc from './ficha/FichaPc.vue'
import FichaPve from './ficha/FichaPve.vue'
import FichaPvp from './ficha/FichaPvp.vue'
import FichaIvPvp from './ficha/FichaIvPvp.vue'
import FichaAtaques from './ficha/FichaAtaques.vue'
import FichaEfectos from './ficha/FichaEfectos.vue'
import FichaDebilidades from './ficha/FichaDebilidades.vue'
import FichaGanarle from './ficha/FichaGanarle.vue'
import FichaComparar from './ficha/FichaComparar.vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  /** Id de forma del roster (mega, primigenia…) para mostrar esa en concreto. */
  formId: { type: String, default: null }
})

const gameData = useGameDataStore()
const live = useLiveStore()
const {
  entrada,
  cpTable,
  esMax,
  maxInfo,
  matchups,
  counters,
  bestMovesets,
  movepool,
  moveEffects,
  costs,
  flags,
  pveRanks,
  pvpPorLiga,
  conNombre
} = useFichaDatos({ pokemon: () => props.pokemon, formId: () => props.formId })

// ---------- Orden de los bloques ----------
const { orden, fijar, restablecer } = useOrdenFicha()
const ordenando = ref(false)

const TITULOS = {
  donde: 'pokemon.whereToFind',
  costes: 'pokemon.statusAndCosts',
  max: 'max.title',
  pc: 'pokemon.cp100',
  pve: 'pokemon.pveRanks',
  pvp: 'pokemon.pvpRanks',
  pvpIv: 'pokemon.pvpIv.title',
  ataques: 'pokemon.bestMoves',
  efectos: 'moves.effectsTitle',
  debilidades: 'pokemon.weaknesses',
  ganarle: 'pokemon.howToBeat',
  comparar: 'pokemon.compare.title'
}

/**
 * Los bloques que este Pokémon tiene: sin ellos, la lista dejaba huecos (un
 * Pokémon sin efectos en combate) y las flechas de ordenar se saltaban uno
 * que no se veía.
 */
const tiene = computed(() => ({
  donde: live.status === 'ready',
  costes: flags.value.length > 0 || costs.value.length > 0 || Boolean(entrada.value?.stats?.atk),
  max: Boolean(maxInfo.value),
  pc: cpTable.value.length > 0,
  pve: true,
  pvp: true,
  // Sin estadísticas (una especie que el roster aún no trae) no hay qué calcular.
  pvpIv: Boolean(entrada.value?.stats?.atk),
  ataques: bestMovesets.value.length > 0 || movepool.value.fast.length > 0,
  efectos: moveEffects.value.length > 0,
  debilidades: matchups.value.weak.length > 0 || matchups.value.resist.length > 0,
  ganarle: counters.value.length > 0,
  comparar: Boolean(entrada.value?.stats?.atk)
}))

const bloquesVisibles = computed(() => orden.value.filter((id) => tiene.value[id]))

/**
 * Pone un bloque en otro puesto de los visibles. Los que este Pokémon no
 * tiene se quedan donde estaban: solo se reparten de nuevo los huecos de los
 * visibles, para no descolocar el orden de otras fichas.
 */
const moverA = (id, destino) => {
  const visibles = bloquesVisibles.value.filter((otro) => otro !== id)
  visibles.splice(Math.max(0, Math.min(destino, visibles.length)), 0, id)
  let k = 0
  fijar(orden.value.map((otro) => (tiene.value[otro] ? visibles[k++] : otro)))
}

/** Sube o baja un bloque saltándose los que este Pokémon no tiene. */
const moverVisible = (id, paso) => {
  const i = bloquesVisibles.value.indexOf(id)
  if (i + paso < 0 || i + paso >= bloquesVisibles.value.length) return
  moverA(id, i + paso)
}

/**
 * Arrastrar con el asa: con eventos de puntero y no con el arrastre nativo
 * del navegador, que en el móvil no funciona. Al pasar por encima de la mitad
 * de otra fila, el bloque se coloca en su puesto.
 */
const filas = ref([])
const arrastrando = ref(null)
// En la ventana y no en el asa: al recolocar la fila, el navegador mueve su
// nodo y suelta la captura del puntero, y el arrastre se cortaba a medias.
const alPulsarAsa = (event, id) => {
  event.preventDefault()
  arrastrando.value = id
  window.addEventListener('pointermove', alMoverAsa)
  window.addEventListener('pointerup', alSoltarAsa)
  window.addEventListener('pointercancel', alSoltarAsa)
}
const alMoverAsa = (event) => {
  const id = arrastrando.value
  if (!id) return
  // Cerca de los bordes de la pantalla, la página se desplaza sola: así se
  // llega a una fila que no se veía (debajo de la cabecera o de la barra).
  if (event.clientY < 100) window.scrollBy(0, -16)
  else if (event.clientY > window.innerHeight - 100) window.scrollBy(0, 16)
  const destino = filas.value.findIndex((fila) => {
    const caja = fila?.getBoundingClientRect()
    return caja && event.clientY < caja.top + caja.height / 2
  })
  // `destino` es la primera fila cuya mitad queda por debajo del puntero; si
  // no hay ninguna, el puntero ha pasado la última y va al final. moverA
  // cuenta el puesto sin el propio bloque: por eso, al bajar, uno menos.
  const actual = bloquesVisibles.value.indexOf(id)
  const puesto =
    destino === -1 ? bloquesVisibles.value.length - 1 : destino > actual ? destino - 1 : destino
  if (puesto !== actual) moverA(id, puesto)
}
const alSoltarAsa = () => {
  arrastrando.value = null
  window.removeEventListener('pointermove', alMoverAsa)
  window.removeEventListener('pointerup', alSoltarAsa)
  window.removeEventListener('pointercancel', alSoltarAsa)
}
onBeforeUnmount(alSoltarAsa)
</script>

<template>
  <div class="flex flex-col text-gray-800 dark:text-gray-200">
    <!--
      Cada uno ordena los bloques a su gusto; se guarda en el navegador (ver
      useOrdenFicha). Es una preferencia que se toca una vez, no algo de cada
      visita: en móvil y tablet va al final, como enlace, para que las
      secciones empiecen justo debajo de la línea evolutiva; en escritorio,
      discreto arriba a la derecha, sobre las dos columnas.
    -->
    <div
      class="order-last mt-3 lg:order-first lg:mt-0 lg:mb-2 flex flex-wrap items-center justify-end gap-2"
    >
      <template v-if="ordenando">
        <p class="mr-auto text-mini text-gray-600 dark:text-gray-300">
          {{ $t('pokemon.reorderHelp') }}
        </p>
        <button type="button" class="boton" @click="restablecer">
          {{ $t('pokemon.reorderReset') }}
        </button>
      </template>
      <button
        type="button"
        class="boton"
        :class="ordenando ? 'boton-activo' : ''"
        :aria-pressed="ordenando"
        @click="ordenando = !ordenando"
      >
        {{ ordenando ? $t('pokemon.reorderDone') : $t('pokemon.reorder') }}
      </button>
    </div>

    <!--
      Una lista de bloques en el orden elegido: en una columna en móvil y en dos
      desde md, que se llenan de arriba abajo. En tablet, a una columna, cada
      sección plegada dejaba media pantalla libre a la derecha de su resumen.
      Antes eran dos columnas fijas (a la izquierda cómo se consigue, a la
      derecha cómo combate), que es también el orden de fábrica.
    -->
    <!--
      Ordenando, una lista compacta: una fila por sección con su icono, su
      nombre, el asa para arrastrar y las flechas (para el teclado y para quien
      no quiera arrastrar). Antes cada sección llevaba encima una barra con su
      nombre y debajo la tarjeta con el mismo nombre otra vez.
    -->
    <ol v-if="ordenando" class="flex flex-col gap-2 max-w-xl lg:ml-auto lg:w-full">
      <li
        v-for="(id, indice) in bloquesVisibles"
        :key="id"
        :ref="(el) => (filas[indice] = el)"
        class="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md bg-white dark:bg-gray-900 transition-shadow"
        :class="arrastrando === id ? 'shadow-xl ring-2 ring-gray-500' : ''"
      >
        <span
          class="shrink-0 w-7 h-9 grid place-items-center cursor-grab touch-none text-gray-500 dark:text-gray-400"
          :class="arrastrando === id ? 'cursor-grabbing' : ''"
          aria-hidden="true"
          @pointerdown="alPulsarAsa($event, id)"
        >
          <svg viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor">
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
        </span>
        <span
          class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path v-for="(d, i) in ICONOS_FICHA[id]" :key="i" :d="d" />
          </svg>
        </span>
        <span class="flex-1 min-w-0 text-sm font-semibold truncate">{{ $t(TITULOS[id]) }}</span>
        <button
          type="button"
          class="boton w-9 !px-0"
          :disabled="indice === 0"
          :aria-label="$t('pokemon.moveUp', { section: $t(TITULOS[id]) })"
          @click="moverVisible(id, -1)"
        >
          ↑
        </button>
        <button
          type="button"
          class="boton w-9 !px-0"
          :disabled="indice === bloquesVisibles.length - 1"
          :aria-label="$t('pokemon.moveDown', { section: $t(TITULOS[id]) })"
          @click="moverVisible(id, 1)"
        >
          ↓
        </button>
      </li>
    </ol>

    <div v-else class="flex flex-col gap-3 md:block md:columns-2 lg:gap-4">
      <div
        v-for="id in bloquesVisibles"
        :key="id"
        class="min-w-0 md:break-inside-avoid md:mb-3 lg:mb-4"
      >
        <!-- bloquesVisibles ya deja fuera las que este Pokémon no tiene. -->
        <!-- Va lo primero de fábrica porque es lo único de la ficha que caduca. -->
        <where-to-find v-if="id === 'donde'" :pokemon="pokemon" :entrada="entrada" />
        <ficha-costes
          v-else-if="id === 'costes'"
          :flags="flags"
          :costs="costs"
          :dex-mega="pokemon.pokemon_id"
          :entrada="entrada"
        />
        <max-battle-panel v-else-if="id === 'max'" :entry="entrada" />
        <ficha-pc
          v-else-if="id === 'pc'"
          :cp-table="cpTable"
          :es-max="esMax"
          :conversion="comoSeConsigue(entrada?.id)"
        />
        <ficha-pve v-else-if="id === 'pve'" :ranks="pveRanks" :con-nombre="conNombre" />
        <ficha-pvp
          v-else-if="id === 'pvp'"
          :por-liga="pvpPorLiga"
          :con-nombre="conNombre"
          :listo="gameData.pvpListo"
        />
        <ficha-iv-pvp v-else-if="id === 'pvpIv'" :stats="entrada.stats" />
        <ficha-ataques
          v-else-if="id === 'ataques'"
          :best-movesets="bestMovesets"
          :movepool="movepool"
          :entrada="entrada"
        />
        <ficha-efectos v-else-if="id === 'efectos'" :efectos="moveEffects" />
        <ficha-debilidades v-else-if="id === 'debilidades'" :matchups="matchups" />
        <ficha-ganarle v-else-if="id === 'ganarle'" :counters="counters" />
        <ficha-comparar v-else-if="id === 'comparar'" :entrada="entrada" />
      </div>
    </div>
  </div>
</template>
