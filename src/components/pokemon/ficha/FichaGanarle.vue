<script setup>
/**
 * Cómo ganarle: los mejores counters contra el Pokémon de la ficha, con el
 * mismo panel que los jefes de incursión de «Ahora».
 *
 * Antes solo salían para los jefes que estaban activos. Quien prepara una
 * incursión que aún no ha empezado, o un combate con un amigo, no tenía dónde
 * mirarlos. Las debilidades ya van en su sección: aquí no se repiten.
 */
import { computed, ref } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import RaidCountersPanel from '../../raids/RaidCountersPanel.vue'
import { useTranslate } from '../../../composables/useTranslate'
import { useGameDataStore } from '../../../stores/gameData'

const props = defineProps({
  /** counters de useFichaDatos (gameData.counters con sus tipos). */
  counters: { type: Array, required: true },
  /** Sus tipos, para «Solo lo común», que pide su propia lista. */
  tipos: { type: Array, default: () => [] }
})

const { localName } = useTranslate()
const gameData = useGameDataStore()

/** «Solo lo común»: sin megas, oscuros, legendarios ni ultraentes. */
const soloComunes = ref(false)
const lista = computed(() =>
  soloComunes.value && props.tipos.length
    ? gameData.counters(props.tipos, { limit: props.counters.length || 8, soloComunes: true })
    : props.counters
)

/** Plegada: los tres primeros. */
const resumen = computed(() =>
  props.counters
    .slice(0, 3)
    .map((c) => localName(c))
    .join(' · ')
)
</script>

<template>
  <ficha-seccion
    id="ganarle"
    :title="$t('pokemon.howToBeat')"
    :summary="resumen"
    :ayuda="$t('pokemon.howToBeatHelp')"
  >
    <raid-counters-panel v-model:solo-comunes="soloComunes" :counters="lista" />
  </ficha-seccion>
</template>
