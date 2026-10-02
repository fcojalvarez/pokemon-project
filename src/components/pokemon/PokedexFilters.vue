<script setup>
/**
 * Filtros de la Pokédex, con el mismo aspecto que los del Top.
 *
 * Desde xl (1280 px), en una barra lateral fija a la izquierda, siempre a la
 * vista, con la leyenda debajo, como el Top. Por debajo, plegados en un
 * botón: la pantalla de entrada es la rejilla de Pokémon y los filtros no
 * deben comerle sitio hasta que alguien los pida (en el Top, en tablet, van
 * abiertos; aquí los tipos solos ya ocupaban media pantalla). El botón lleva
 * el número de filtros puestos para que, plegado, se siga sabiendo que el
 * listado está filtrado.
 *
 * Los «Solo…» son casillas como el «Incluir» del Top (✓ encendida, borde
 * discontinuo apagada), bajo su etiqueta, y las etiquetas van en versalitas
 * como allí. Antes eran pastillas sueltas que no se parecían a nada.
 *
 * La leyenda llega por el slot, que recibe `ancho`: en la barra va abierta;
 * en la fila del botón, plegada.
 *
 * Todo lo que hay aquí se resuelve en la consulta a Supabase; no hay ningún
 * filtrado en el cliente que pueda desincronizarse con la paginación.
 */
import { computed, ref } from 'vue'
import { useTranslate } from '../../composables/useTranslate'
import { storeToRefs } from 'pinia'
import { usePokemonsStore } from '../../stores/pokemons'
import { useMedia } from '../../composables/useMedia'
import { typesSVG } from '../../utils/Settings'
import BaseIcon from '../base/BaseIcon.vue'
import BasePillButton from '../base/BasePillButton.vue'
import BaseDropdown from '../base/BaseDropdown.vue'
import BaseChevron from '../base/BaseChevron.vue'
import BaseSidebar from '../base/BaseSidebar.vue'

const store = usePokemonsStore()
const { filters, activeFilterCount, totalCount } = storeToRefs(store)
const { setFilters, clearFilters } = store
const { t } = useTranslate()

/** El mismo corte que el Top: desde aquí, barra lateral. */
const ancho = useMedia('(min-width: 1280px)')
const isOpen = ref(false)
const abiertos = computed(() => ancho.value || isOpen.value)

const TYPES = Object.keys(typesSVG)
const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const RARITIES = ['standard', 'legendary', 'mythic', 'ultra_beast']
/** Los interruptores «Solo…», por su clave en los filtros (y en filters.* de los idiomas). */
const SOLO = ['onlyShiny', 'onlyShadow', 'onlyDynamax', 'onlyGigantamax']

const panelId = 'filtros-pokedex'

const hasFilters = computed(() => activeFilterCount.value > 0)

/** Las mismas etiquetas que el Top: en versalitas, pequeñas y grises. */
const ETIQUETA = 'block mb-1 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300'

const toggleType = (type) => {
  const current = filters.value.types
  setFilters({
    types: current.includes(type) ? current.filter((one) => one !== type) : [...current, type]
  })
}

const generationOptions = computed(() => [
  { value: '', label: t('filters.allGenerations') },
  ...GENERATIONS.map((gen) => ({
    value: gen,
    label: t('filters.generationNumber', { number: gen })
  }))
])

const rarityOptions = computed(() => [
  { value: '', label: t('filters.allRarities') },
  ...RARITIES.map((rarity) => ({ value: rarity, label: t(`filters.rarities.${rarity}`) }))
])
</script>

<template>
  <base-sidebar :activa="ancho" class="w-full">
    <!-- Por debajo de xl: la leyenda a la izquierda y el botón de Filtros a la derecha. -->
    <div v-if="!ancho" class="flex items-center gap-3">
      <slot :ancho="false" />

      <button
        type="button"
        class="zona-tactil [--zona:-8px_-3px] ml-auto shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs md:h-10 md:px-4 md:text-sm rounded-xl border border-gray-400 shadow-md transition-colors bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800"
        :aria-expanded="isOpen"
        :aria-controls="panelId"
        @click="isOpen = !isOpen"
      >
        {{ $t('filters.title') }}
        <span
          v-if="hasFilters"
          class="px-1.5 rounded-full bg-gray-600 dark:bg-gray-500 text-white text-mini"
          >{{ activeFilterCount }}</span
        >
        <base-chevron :open="isOpen" />
      </button>
    </div>

    <!--
      La fila de resultados se pinta siempre, con o sin filtros: si apareciera
      solo al aplicar uno, todo el listado daría un salto hacia abajo justo
      cuando el usuario está mirando los resultados. En la barra va al final.
    -->
    <div v-if="!ancho" class="mt-2 h-5 flex items-center gap-3 justify-end">
      <template v-if="hasFilters">
        <p
          v-if="totalCount !== null"
          role="status"
          class="text-mini text-gray-600 dark:text-gray-300"
        >
          {{ $t('filters.results', { count: totalCount }) }}
        </p>
        <button
          type="button"
          class="text-mini text-gray-600 dark:text-gray-300 underline"
          @click="clearFilters"
        >
          {{ $t('filters.clear') }}
        </button>
      </template>
    </div>

    <transition :name="ancho ? '' : 'desplegar'">
      <!--
        Por debajo de xl, en una tarjeta como la del Top en móvil. En la barra,
        sin caja: la caja es la barra.
      -->
      <div
        v-if="abiertos"
        :id="panelId"
        class="flex flex-col gap-3"
        :class="
          ancho
            ? ''
            : 'mt-2 p-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900'
        "
      >
        <div role="group" aria-labelledby="filtro-tipo">
          <span id="filtro-tipo" :class="ETIQUETA">{{ $t('filters.type') }}</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="type in TYPES"
              :key="type"
              type="button"
              :aria-pressed="filters.types.includes(type)"
              :class="[
                'zona-tactil flex items-center gap-1 px-2 py-1 text-mini rounded-xl border transition-colors',
                filters.types.includes(type)
                  ? 'bg-gray-600 dark:bg-gray-600 border-gray-600 text-white'
                  : 'bg-white dark:bg-gray-900 border-gray-400 text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800'
              ]"
              @click="toggleType(type)"
            >
              <base-icon
                view-box="0 0 512 512"
                width="12"
                height="12"
                icon-class="drop-shadow-svg"
                :fill-path="typesSVG[type].color"
                :d="typesSVG[type].icon"
              />
              {{ $t(`types.${type}`) }}
            </button>
          </div>
        </div>

        <!-- Como los selectores del Top: uno debajo de otro en la barra, a la par por debajo. -->
        <div class="grid gap-3" :class="ancho ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'">
          <base-dropdown
            class="min-w-0"
            :label="$t('filters.generation')"
            :model-value="filters.generation ?? ''"
            :options="generationOptions"
            @update:model-value="setFilters({ generation: $event === '' ? null : Number($event) })"
          />
          <base-dropdown
            class="min-w-0"
            :label="$t('filters.rarity')"
            :model-value="filters.rarity ?? ''"
            :options="rarityOptions"
            @update:model-value="setFilters({ rarity: $event === '' ? null : $event })"
          />
        </div>

        <!-- Mismo trato que el «Incluir» del Top: etiqueta encima y casillas en rejilla. -->
        <div>
          <span id="filtro-solo" :class="ETIQUETA">{{ $t('filters.only') }}</span>
          <div
            role="group"
            aria-labelledby="filtro-solo"
            class="grid gap-2"
            :class="ancho ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'"
          >
            <base-pill-button
              v-for="clave in SOLO"
              :key="clave"
              :class="ancho ? 'h-9 w-full text-xs' : 'h-11 w-full text-sm'"
              casilla
              :active="filters[clave]"
              @click="setFilters({ [clave]: !filters[clave] })"
            >
              {{ $t(`filters.${clave}`) }}
            </base-pill-button>
          </div>
        </div>

        <!-- En la barra, los resultados y «Limpiar» al final de los filtros. -->
        <div v-if="ancho && hasFilters" class="flex items-center gap-3">
          <p
            v-if="totalCount !== null"
            role="status"
            class="text-mini text-gray-600 dark:text-gray-300"
          >
            {{ $t('filters.results', { count: totalCount }) }}
          </p>
          <button
            type="button"
            class="ml-auto text-mini text-gray-600 dark:text-gray-300 underline"
            @click="clearFilters"
          >
            {{ $t('filters.clear') }}
          </button>
        </div>
      </div>
    </transition>

    <!-- En la barra, la leyenda abierta debajo de los filtros, como en el Top. -->
    <div v-if="ancho" class="pt-3 border-t border-gray-300 dark:border-gray-700">
      <slot :ancho="true" />
    </div>
  </base-sidebar>
</template>

<style scoped>
/*
 * El panel aparecía de golpe mientras el resto de la app va con transiciones.
 * Se despliega desde arriba.
 */
.desplegar-enter-active,
.desplegar-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.desplegar-enter-from,
.desplegar-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .desplegar-enter-active,
  .desplegar-leave-active {
    transition: none;
  }
}
</style>
