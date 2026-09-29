<script setup>
/**
 * Las secciones de datos de la ficha, en el orden que elija cada uno.
 *
 * Los datos salen de useFichaDatos y cada sección es su componente (en
 * ./ficha/), que pinta su contenido y la línea que enseña plegada.
 */
import { computed, ref } from 'vue'
import { useGameDataStore } from '../../stores/gameData'
import { useLiveStore } from '../../stores/live'
import { useOrdenFicha } from '../../composables/useOrdenFicha'
import { useFichaDatos } from '../../composables/useFichaDatos'
import WhereToFind from './WhereToFind.vue'
import MaxBattlePanel from './MaxBattlePanel.vue'
import FichaCostes from './ficha/FichaCostes.vue'
import FichaPc from './ficha/FichaPc.vue'
import FichaPve from './ficha/FichaPve.vue'
import FichaPvp from './ficha/FichaPvp.vue'
import FichaAtaques from './ficha/FichaAtaques.vue'
import FichaEfectos from './ficha/FichaEfectos.vue'
import FichaDebilidades from './ficha/FichaDebilidades.vue'

const props = defineProps({
  pokemon: { type: Object, required: true },
  /** Id de forma del roster (mega, primigenia…) para mostrar esa en concreto. */
  formId: { type: String, default: null }
})

const gameData = useGameDataStore()
const live = useLiveStore()
const {
  entrada, cpTable, esMax, maxInfo, matchups, bestMovesets, movepool, moveEffects,
  costs, flags, pveRanks, pvpPorLiga, conNombre
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
  ataques: 'pokemon.bestMoves',
  efectos: 'moves.effectsTitle',
  debilidades: 'pokemon.weaknesses'
}

/**
 * Los bloques que este Pokémon tiene: sin ellos, la lista dejaba huecos (un
 * Pokémon sin efectos en combate) y las flechas de ordenar se saltaban uno
 * que no se veía.
 */
const tiene = computed(() => ({
  donde: live.status === 'ready',
  costes: flags.value.length > 0 || costs.value.length > 0,
  max: Boolean(maxInfo.value),
  pc: cpTable.value.length > 0,
  pve: true,
  pvp: true,
  ataques: bestMovesets.value.length > 0 || movepool.value.fast.length > 0,
  efectos: moveEffects.value.length > 0,
  debilidades: matchups.value.weak.length > 0 || matchups.value.resist.length > 0
}))

const bloquesVisibles = computed(() => orden.value.filter((id) => tiene.value[id]))

/** Sube o baja un bloque saltándose los que este Pokémon no tiene. */
const moverVisible = (id, paso) => {
  const visibles = bloquesVisibles.value
  const vecino = visibles[visibles.indexOf(id) + paso]
  if (!vecino) return
  const lista = orden.value.filter((otro) => otro !== id)
  const j = lista.indexOf(vecino)
  lista.splice(paso > 0 ? j + 1 : j, 0, id)
  fijar(lista)
}
</script>

<template>
  <div class="text-gray-800 dark:text-gray-200">
    <!--
      Cada uno ordena los bloques a su gusto; se guarda en el navegador (ver
      useOrdenFicha). El botón queda discreto a la derecha: es una preferencia
      que se toca una vez, no algo de cada visita.
    -->
    <div class="flex flex-wrap items-center justify-end gap-2 mb-2">
      <template v-if="ordenando">
        <p class="mr-auto text-mini text-gray-600 dark:text-gray-300">{{ $t('pokemon.reorderHelp') }}</p>
        <button type="button" class="px-3 py-1 text-xs rounded-xl border border-gray-400 dark:border-gray-600 hover:bg-gray-150 hover:dark:bg-gray-800" @click="restablecer">
          {{ $t('pokemon.reorderReset') }}
        </button>
      </template>
      <button
        type="button"
        class="px-3 py-1 text-xs rounded-xl border transition-colors"
        :class="ordenando
          ? 'bg-gray-700 dark:bg-gray-600 text-white border-gray-700 dark:border-gray-600'
          : 'border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800'"
        :aria-pressed="ordenando"
        @click="ordenando = !ordenando"
      >
        {{ ordenando ? $t('pokemon.reorderDone') : $t('pokemon.reorder') }}
      </button>
    </div>

    <!--
      Una lista de bloques en el orden elegido: en una columna en móvil y en dos
      desde lg, que se llenan de arriba abajo. Antes eran dos columnas fijas (a
      la izquierda cómo se consigue, a la derecha cómo combate), que es también
      el orden de fábrica.
    -->
    <div class="flex flex-col gap-3 lg:block lg:columns-2 lg:gap-4">
      <div v-for="(id, indice) in bloquesVisibles" :key="id" class="min-w-0 lg:break-inside-avoid lg:mb-4">
        <div
          v-if="ordenando"
          class="flex items-center gap-2 mb-1 px-3 py-1.5 rounded-xl border border-dashed border-gray-400 dark:border-gray-600"
        >
          <span class="flex-1 min-w-0 text-xs font-semibold truncate">{{ $t(TITULOS[id]) }}</span>
          <button
            type="button"
            class="w-8 h-8 rounded-lg border border-gray-400 dark:border-gray-600 disabled:opacity-40"
            :disabled="indice === 0"
            :aria-label="$t('pokemon.moveUp', { section: $t(TITULOS[id]) })"
            @click="moverVisible(id, -1)"
          >↑</button>
          <button
            type="button"
            class="w-8 h-8 rounded-lg border border-gray-400 dark:border-gray-600 disabled:opacity-40"
            :disabled="indice === bloquesVisibles.length - 1"
            :aria-label="$t('pokemon.moveDown', { section: $t(TITULOS[id]) })"
            @click="moverVisible(id, 1)"
          >↓</button>
        </div>

        <!-- bloquesVisibles ya deja fuera las que este Pokémon no tiene. -->
        <!-- Va lo primero de fábrica porque es lo único de la ficha que caduca. -->
        <where-to-find v-if="id === 'donde'" :pokemon="pokemon" />
        <ficha-costes v-else-if="id === 'costes'" :flags="flags" :costs="costs" />
        <max-battle-panel v-else-if="id === 'max'" :entry="entrada" />
        <ficha-pc v-else-if="id === 'pc'" :cp-table="cpTable" :es-max="esMax" />
        <ficha-pve v-else-if="id === 'pve'" :ranks="pveRanks" :con-nombre="conNombre" />
        <ficha-pvp v-else-if="id === 'pvp'" :por-liga="pvpPorLiga" :con-nombre="conNombre" :listo="gameData.pvpListo" />
        <ficha-ataques v-else-if="id === 'ataques'" :best-movesets="bestMovesets" :movepool="movepool" />
        <ficha-efectos v-else-if="id === 'efectos'" :efectos="moveEffects" />
        <ficha-debilidades v-else-if="id === 'debilidades'" :matchups="matchups" />
      </div>
    </div>
  </div>
</template>
