<script setup>
/**
 * Filtros de la Pokédex, plegados por defecto.
 *
 * Van cerrados a propósito: la pantalla de entrada es la rejilla de Pokémon y
 * los filtros no deben comerle sitio hasta que alguien los pida. El botón
 * lleva el número de filtros puestos para que, plegado, se siga sabiendo que
 * el listado está filtrado.
 *
 * Todo lo que hay aquí se resuelve en la consulta a Supabase; no hay ningún
 * filtrado en el cliente que pueda desincronizarse con la paginación.
 */
import { computed, ref } from 'vue'
import { useTranslate } from '../../composables/useTranslate'
import { storeToRefs } from 'pinia'
import { usePokemonsStore } from '../../stores/pokemons'
import { typesSVG } from '../../utils/Settings'
import BaseIcon from '../base/BaseIcon.vue'
import BasePillButton from '../base/BasePillButton.vue'
import BaseDropdown from '../base/BaseDropdown.vue'
import BaseChevron from '../base/BaseChevron.vue'

const store = usePokemonsStore()
const { filters, activeFilterCount, totalCount } = storeToRefs(store)
const { setFilters, clearFilters } = store
const { t } = useTranslate()

const isOpen = ref(false)

const TYPES = Object.keys(typesSVG)
const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const RARITIES = ['standard', 'legendary', 'mythic']

const panelId = 'filtros-pokedex'

const hasFilters = computed(() => activeFilterCount.value > 0)

const toggleType = (type) => {
  const current = filters.value.types
  setFilters({
    types: current.includes(type)
      ? current.filter((one) => one !== type)
      : [...current, type]
  })
}

const generationOptions = computed(() => [
  { value: '', label: t('filters.allGenerations') },
  ...GENERATIONS.map((gen) => ({ value: gen, label: t('filters.generationNumber', { number: gen }) }))
])

const rarityOptions = computed(() => [
  { value: '', label: t('filters.allRarities') },
  ...RARITIES.map((rarity) => ({ value: rarity, label: t(`filters.rarities.${rarity}`) }))
])
</script>

<template>
  <section class="w-full">
    <div class="flex items-center gap-3">
      <!--
        Hueco para lo que vaya a la izquierda de la fila (hoy, la leyenda del
        variocolor). Así comparten línea sin que el panel desplegado se quede
        encajonado en la mitad derecha.
      -->
      <slot />

      <div class="ml-auto flex items-center gap-3">
      <button
        type="button"
        class="zona-tactil [--zona:-8px_-3px] flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border border-gray-400 shadow-md transition-colors bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800"
        :aria-expanded="isOpen"
        :aria-controls="panelId"
        @click="isOpen = !isOpen"
      >
        {{ $t('filters.title') }}
        <span
          v-if="hasFilters"
          class="px-1.5 rounded-full bg-gray-600 dark:bg-gray-500 text-white text-mini"
        >{{ activeFilterCount }}</span>
        <base-chevron :open="isOpen" />
      </button>
      </div>
    </div>

    <!--
      La fila se pinta siempre, con o sin filtros: si apareciera solo al
      aplicar uno, todo el listado daría un salto hacia abajo justo cuando el
      usuario está mirando los resultados.
    -->
    <div class="mt-2 h-5 flex items-center gap-3 justify-end">
      <template v-if="hasFilters">
        <p v-if="totalCount !== null" role="status" class="text-mini text-gray-600 dark:text-gray-300">
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

    <transition name="desplegar">
      <div
        v-if="isOpen"
        :id="panelId"
      class="mt-2 p-3 flex flex-col gap-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
    >
      <div>
        <span class="block text-mini text-gray-600 dark:text-gray-300 mb-1">
          {{ $t('filters.type') }}
        </span>
        <div class="flex flex-wrap gap-2.5">
          <button
            v-for="type in TYPES"
            :key="type"
            type="button"
            :aria-pressed="filters.types.includes(type)"
            :class="[
              'zona-tactil flex items-center gap-1 px-2 py-1 text-mini rounded-xl border transition-colors',
              filters.types.includes(type)
                ? 'bg-gray-600 dark:bg-gray-600 border-gray-600 text-white'
                : 'bg-white dark:bg-gray-900 border-gray-400 text-gray-700 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800'
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

      <div class="grid grid-cols-2 gap-3">
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

      <!--
        Mismo ancho y alto que los selectores, pero separados por una línea:
        pegados debajo parecían opciones de generación y rareza, y son otra
        cosa (interruptores, no listas).
      -->
      <div class="grid grid-cols-2 gap-3 pt-4 mt-1 border-t border-gray-200 dark:border-gray-700">
        <base-pill-button
          class="h-11 w-full text-sm"
          :active="filters.onlyShiny"
          @click="setFilters({ onlyShiny: !filters.onlyShiny })"
        >
          {{ $t('filters.onlyShiny') }}
        </base-pill-button>
        <base-pill-button
          class="h-11 w-full text-sm"
          :active="filters.onlyShadow"
          @click="setFilters({ onlyShadow: !filters.onlyShadow })"
        >
          {{ $t('filters.onlyShadow') }}
        </base-pill-button>
        <base-pill-button
          class="h-11 w-full text-sm"
          :active="filters.onlyDynamax"
          @click="setFilters({ onlyDynamax: !filters.onlyDynamax })"
        >
          {{ $t('filters.onlyDynamax') }}
        </base-pill-button>
        <base-pill-button
          class="h-11 w-full text-sm"
          :active="filters.onlyGigantamax"
          @click="setFilters({ onlyGigantamax: !filters.onlyGigantamax })"
        >
          {{ $t('filters.onlyGigantamax') }}
        </base-pill-button>
      </div>
      </div>
    </transition>
  </section>
</template>

<style scoped>
/*
 * El panel aparecía de golpe mientras el resto de la app va con transiciones.
 * Se despliega desde arriba: la altura la anima el navegador con grid-rows,
 * que no exige saber cuánto mide el contenido.
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
