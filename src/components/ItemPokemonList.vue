<script setup>
import { computed } from 'vue'
import TypeIcons from './base/TypeIcons.vue'
import ShinyMark from './pokemon/ShinyMark.vue'
import MaxMark from './pokemon/MaxMark.vue'
import BaseSprite from './base/BaseSprite.vue'
import { typesSVG } from '../utils/Settings'
import { formatDex } from '../utils/dex'
import { usePokemonsStore } from '../stores/pokemons'
import { useGameDataStore } from '../stores/gameData'

const pokemonsStore = usePokemonsStore()
const { setIsSearching } = pokemonsStore
const gameData = useGameDataStore()

const props = defineProps({
  /**
   * Una fila de la Pokédex (COLUMNAS_TARJETA en stores/pokemons.js):
   * pokemon_id, name, types, sprite y las marcas is_released,
   * is_shiny_released, can_dynamax y can_gigantamax.
   */
  pokemon: { type: Object, required: true }
})
const numero = computed(() => formatDex(props.pokemon.pokemon_id))
const liberado = computed(() => Boolean(props.pokemon.is_released))
/** Los tipos que tienen icono (se ignora cualquiera desconocido). */
const tipos = computed(() => (props.pokemon.types ?? []).filter((type) => typesSVG[type]))
/**
 * Con el filtro «Evoluciona barato», lo que cuesta: 12, 25 o gratis al
 * intercambiar. Sin el filtro no sale: en todas las tarjetas sería ruido.
 */
const barata = computed(() =>
  pokemonsStore.filters.onlyCheapEvo ? gameData.evolucionBarataDe(props.pokemon.pokemon_id) : null
)
</script>

<template>
  <!--
        Un enlace de verdad y no un bloque con @click: así se llega con el
        tabulador, se abre con Enter y se puede abrir en otra pestaña. Los que
        aún no han salido no llevan a ninguna parte y se quedan en un div.
    -->
  <component
    :is="liberado ? 'router-link' : 'div'"
    :to="liberado ? `/pokemon/${pokemon.pokemon_id}` : undefined"
    data-dex-tile
    :class="[
      liberado
        ? 'hover:outline hover:bg-gray-150 hover:outline-white hover:dark:bg-gray-800 hover:dark:outline-gray-600'
        : '',
      'block p-2 rounded-xl'
    ]"
    @click="liberado && setIsSearching(false)"
  >
    <div class="relative mx-auto w-24 h-24">
      <!-- alt vacío: el nombre ya va escrito debajo, dentro del mismo enlace. -->
      <base-sprite
        :src="pokemon.sprite"
        entrada="salida"
        class="w-full h-full"
        :img-class="[
          liberado
            ? 'drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark'
            : 'grayscale opacity-40',
          'z-10'
        ]"
      />
      <!-- Escalada, no con otro font-size: así la marca no se descuadra. -->
      <shiny-mark
        v-if="pokemon.is_shiny_released"
        variant="dex"
        :label="$t('pokemon.shinyLegend')"
        class="absolute top-0 right-0 z-10 scale-[0.8] origin-top-right"
      />
      <span
        v-if="barata"
        class="absolute top-0 left-0 z-10 px-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-mini font-bold text-gray-800 dark:text-gray-100"
        :title="$t(barata === 'intercambio' ? 'filters.evoGratis' : 'filters.evoCaramelos', { n: barata })"
        >{{ barata === 'intercambio' ? $t('filters.evoGratisCorto') : barata }}</span
      >
      <!--
                Abajo, una en cada esquina, para no pelearse con la marca de
                shiny (que va arriba a la derecha) ni tapar al Pokémon.
                Se pintan las dos: gigamaxizar y dinamaxizar son cosas
                distintas y hay 31 que pueden las dos.
            -->
      <max-mark
        v-if="pokemon.can_dynamax"
        variant="dynamax"
        :size="18"
        class="absolute bottom-0 left-0 z-10 text-gray-800 dark:text-gray-200"
      />
      <max-mark
        v-if="pokemon.can_gigantamax"
        variant="gigantamax"
        :size="18"
        class="absolute bottom-0 right-0 z-10 text-gray-800 dark:text-gray-200"
      />
    </div>
    <!--
            El nombre tiene la fila entera y los tipos van debajo: en la misma
            línea se lo comían y con un nombre largo se truncaba enseguida.
            En móvil van tres por fila y «#001 Bulbasaur» no cabe en una línea:
            el número pasa encima, pequeño, y el nombre se queda la fila entera.
        -->
    <div
      class="mt-2 sm:mt-3 flex flex-col sm:flex-row items-center justify-center sm:gap-1 text-gray-800 dark:text-gray-300"
    >
      <span v-if="numero" class="text-mini sm:text-xs font-semibold shrink-0 leading-tight"
        >#{{ numero }}</span
      >
      <span
        :class="[
          liberado ? '' : 'line-through',
          'max-w-full font-semibold text-xs sm:text-sm truncate'
        ]"
      >
        {{ pokemon.name }}
      </span>
    </div>

    <!-- Con TypeIcons, como en el resto de la app: cada icono dice su tipo al lector de pantalla. -->
    <type-icons
      v-if="liberado && tipos.length"
      :types="tipos"
      size="14"
      class="mt-1 justify-center"
    />
  </component>
</template>
