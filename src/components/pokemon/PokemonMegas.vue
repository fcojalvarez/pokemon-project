<script setup>
import { computed } from 'vue'
import { useGameDataStore } from '../../stores/gameData'
import EvolPokemonItem from './EvolPokemonItem.vue'
import MegaEnergyCost from './MegaEnergyCost.vue'
import { spriteUrl } from '../../utils/sprites'
import { shortFormName } from '../../utils/formName'

const props = defineProps({
  dex: { type: Number, required: true },
  isShowShiny: Boolean,
  /** Se hereda del Pokémon base: las megas comparten número de Pokédex. */
  isShinyReleased: Boolean,
  /** Id de la forma que se está viendo, para destacarla en la cadena. */
  activeFormId: { type: String, default: null },
  /** Sin cadena evolutiva no hay de dónde salga la flecha (Rayquaza, Absol…). */
  withArrow: { type: Boolean, default: true }
})

const gameData = useGameDataStore()

/**
 * Cuando una especie tiene Mega X y Mega Y el coste de registro es el mismo en
 * ambas (comprobado en todo el roster), así que se enseña una sola vez junto a
 * la flecha. Si alguna vez dejaran de coincidir, cae a mostrarlo en cada una.
 */
const sharedEnergy = computed(() => {
  const costs = [...new Set(megas.value.map((mega) => mega.energy))]
  return costs.length === 1 ? costs[0] : null
})

/**
 * Megas y supermegas de esta especie, con la misma forma que espera
 * EvolPokemonItem: son el último paso de la cadena de evolución.
 */
const megas = computed(() => {
  const forms = gameData.formsByDex.get(props.dex) ?? []
  return forms
    .filter((form) => form.mega && form.released)
    .map((form) => ({
      id: form.id,
      to: `/pokemon/${form.dex}?form=${form.id}`,
      energy: form.megaEnergy?.first ?? null,
      item: {
        pokemon_id: form.dex,
        name: shortFormName(form.nameEs),
        types: form.types,
        is_shiny_released: props.isShinyReleased,
        sprites: {
          male: spriteUrl(form.spriteId),
          male_shiny: spriteUrl(form.spriteId, { shiny: true })
        },
        super_mega: form.superMega
      }
    }))
})
</script>

<template>
  <!--
    Cuando hay dos (Mega X y Mega Y) van una al lado de la otra: las dos salen
    del mismo Pokémon, una no evoluciona de la otra.
  -->
  <div v-if="megas.length" class="relative w-full">
    <!--
      Flecha que une la última evolución con las megas. Va posicionada sobre el
      borde superior del bloque, igual que las de caramelos: a la derecha del
      centro y sin ocupar alto propio.
    -->
    <div
      class="absolute left-1/2 top-0 ml-14 sm:ml-[5.5rem] -translate-y-1/2 flex items-center gap-2 max-w-[calc(50%-3.75rem)] sm:max-w-[calc(50%-5.75rem)]"
    >
      <svg
        v-if="withArrow"
        class="stroke-gray-700 dark:stroke-white"
        style="transform: rotate(-251deg)"
        width="24"
        height="24"
        fill="none"
        stroke-width="1"
        stroke-linecap="round"
      >
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2l3 3" />
      </svg>
      <!-- Con dos megas el coste se saca al centro, entre las dos flechas. -->
      <mega-energy-cost v-if="sharedEnergy && megas.length === 1" :amount="sharedEnergy" />
    </div>

    <!--
      Con dos megas cada una tiene la suya: la de la izquierda va en espejo,
      primero el coste y luego la flecha girada hacia el otro lado.
    -->
    <div
      v-if="megas.length > 1"
      class="absolute right-1/2 top-0 mr-14 sm:mr-[5.5rem] -translate-y-1/2 flex items-center gap-2 max-w-[calc(50%-3.75rem)] sm:max-w-[calc(50%-5.75rem)]"
    >
      <svg
        v-if="withArrow"
        class="stroke-gray-700 dark:stroke-white"
        style="transform: scaleX(-1) rotate(-251deg)"
        width="24"
        height="24"
        fill="none"
        stroke-width="1"
        stroke-linecap="round"
      >
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2l3 3" />
      </svg>
    </div>

    <!--
      Las dos megas cuestan lo mismo, así que el coste va una sola vez y
      centrado: repetirlo a los dos lados hacía pensar que había que pagarlo
      dos veces.
    -->
    <div
      v-if="megas.length > 1 && sharedEnergy"
      class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex items-center max-w-full px-2"
    >
      <mega-energy-cost :amount="sharedEnergy" />
    </div>

    <div class="flex flex-wrap justify-center">
    <div
      v-for="mega in megas"
      :key="mega.id"
      class="flex items-center"
      :class="megas.length > 1 ? 'w-1/2' : 'w-full'"
    >
      <evol-pokemon-item
        :pokemon="{ ...mega.item, mega_energy_required: sharedEnergy ? null : mega.energy }"
        :is-show-shiny="isShowShiny"
        :route-to="mega.to"
        :is-active="mega.id === activeFormId"
        hide-arrow
      />
      </div>
    </div>
  </div>
</template>
