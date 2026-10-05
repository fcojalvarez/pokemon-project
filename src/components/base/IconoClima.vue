<script setup>
/**
 * El icono de un clima del juego (los PNG blancos de assets/weather), del
 * color del texto. `clima` es una clave de CLIMAS (utils/clima).
 */
import { computed } from 'vue'
import IconoMascara from './IconoMascara.vue'
import clear from '../../assets/weather/clear.png'
import rainy from '../../assets/weather/rain.png'
import partlycloudy from '../../assets/weather/partly_cloudy.png'
import cloudy from '../../assets/weather/cloudy.png'
import windy from '../../assets/weather/windy.png'
import snow from '../../assets/weather/snow.png'
import fog from '../../assets/weather/fog.png'

const ICONOS = { clear, rainy, partlycloudy, cloudy, windy, snow, fog }

const props = defineProps({
  clima: { type: String, required: true }
})

const src = computed(() => ICONOS[props.clima])
</script>

<template>
  <icono-mascara v-if="src" :src="src" />
</template>
