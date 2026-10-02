<script setup>
/**
 * Cómo ganarle: los mejores counters contra el Pokémon de la ficha, con el
 * mismo panel que los jefes de incursión de «Ahora».
 *
 * Antes solo salían para los jefes que estaban activos. Quien prepara una
 * incursión que aún no ha empezado, o un combate con un amigo, no tenía dónde
 * mirarlos. Las debilidades ya van en su sección: aquí no se repiten.
 */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import RaidCountersPanel from '../../raids/RaidCountersPanel.vue'
import { useTranslate } from '../../../composables/useTranslate'

const props = defineProps({
  /** counters de useFichaDatos (gameData.counters con sus tipos). */
  counters: { type: Array, required: true }
})

const { localName } = useTranslate()

/** Plegada: los tres primeros. */
const resumen = computed(() =>
  props.counters
    .slice(0, 3)
    .map((c) => localName(c))
    .join(' · ')
)
</script>

<template>
  <ficha-seccion id="ganarle" :title="$t('pokemon.howToBeat')" :summary="resumen">
    <p class="mt-2 text-mini text-gray-600 dark:text-gray-300">{{ $t('pokemon.howToBeatHelp') }}</p>
    <raid-counters-panel :counters="counters" />
  </ficha-seccion>
</template>
