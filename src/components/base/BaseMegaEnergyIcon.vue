<script setup>
import { computed, useId } from 'vue'
import COLORES from '../../assets/megaEnergia.json'

/**
 * La megaenergía del juego, en SVG. En el juego es un modelo 3D y no hay
 * imagen ni vector publicados (ni en pogo_assets ni en la wiki): la silueta de
 * la piedra, el símbolo mega y sus cuatro huecos (dos barras y dos
 * triángulos) son el contorno vectorizado de un render del juego, seguido
 * sobre el PNG de 1024 px y suavizado. Así se ve nítida a 14 px y en
 * pantallas de alta densidad.
 *
 * La piedra es siempre la misma, teñida con los cuatro colores de rampa de
 * cada especie: los del juego, sacados con `pnpm megaenergia`
 * (src/assets/megaEnergia.json). De oscuro a claro: 1 el canto, 2 la sombra,
 * 3 el cuerpo y 4 la luz. Sin especie, o con una sin mega, la genérica gris
 * azulada.
 */
const props = defineProps({
  /** Número de Pokédex de la especie que megaevoluciona. */
  dex: { type: [Number, String], default: null },
  /** Id de la mega si tiene la suya («6_MEGA_X»): manda sobre la especie. */
  forma: { type: String, default: null }
})

// Los ids de los degradados, únicos: hay varias piedras en la misma página.
const id = useId()

const GENERICA = ['#9fb7c4', '#5b6f7c', '#c6dbe3', '#eef7fa']

const rampas = computed(
  () => (props.forma && COLORES[props.forma]) || COLORES[String(props.dex)] || GENERICA
)

const PIEDRA =
  'M59.7 2.0C62.7 1.8 65.1 2.0 67.6 2.3C70.2 2.5 72.8 3.0 75.2 3.7C77.6 4.4 79.7 5.2 81.8 6.3C84.0 7.4 86.3 9.0 88.0 10.5C89.7 11.9 90.7 12.9 92.0 14.9C93.3 16.9 95.0 19.8 95.9 22.3C96.9 24.9 97.4 27.4 97.7 30.1C98.1 32.9 98.2 35.4 98.0 38.7C97.8 42.1 97.1 46.5 96.3 50.2C95.5 53.9 94.5 57.2 93.1 60.9C91.6 64.6 89.7 68.9 87.8 72.3C86.0 75.8 84.3 78.6 82.1 81.6C79.9 84.6 76.7 88.2 74.4 90.4C72.2 92.7 70.7 93.7 68.6 94.9C66.5 96.1 64.1 97.1 61.8 97.6C59.5 98.1 57.3 98.2 54.9 98.0C52.5 97.8 50.3 97.3 47.5 96.2C44.6 95.0 41.3 93.5 37.8 91.2C34.3 89.0 30.0 85.7 26.5 82.8C23.0 79.8 19.6 76.4 16.7 73.4C13.9 70.3 11.4 67.3 9.4 64.4C7.4 61.5 5.9 58.6 4.7 56.2C3.6 53.8 3.1 52.3 2.7 50.1C2.2 47.8 1.8 45.1 2.0 42.5C2.2 40.0 2.8 37.3 3.7 34.8C4.6 32.4 5.8 30.1 7.6 27.7C9.4 25.2 12.2 22.3 14.2 20.2C16.3 18.2 17.9 17.1 20.1 15.5C22.3 14.0 24.3 12.7 27.3 11.1C30.3 9.6 34.4 7.6 38.1 6.3C41.8 5.0 45.9 3.9 49.5 3.2C53.1 2.5 56.7 2.2 59.7 2.0Z'
const SIMBOLO =
  'M55.5 21.0C57.4 20.3 56.4 20.1 56.6 21.3C56.8 22.4 56.3 25.9 56.6 27.9C56.8 29.9 57.4 31.7 58.1 33.3C58.9 34.9 59.4 35.9 60.9 37.6C62.3 39.2 65.3 41.6 66.7 43.2C68.2 44.7 68.8 45.7 69.6 46.9C70.4 48.2 71.1 49.3 71.4 50.8C71.8 52.4 72.0 54.5 71.8 56.2C71.6 57.9 71.4 59.3 70.4 61.0C69.4 62.7 67.6 64.9 65.7 66.6C63.8 68.3 61.5 69.6 58.8 71.0C56.0 72.5 50.9 74.7 49.2 75.2C47.4 75.7 48.5 75.1 48.4 74.2C48.2 73.3 48.4 71.3 48.1 69.7C47.9 68.2 47.6 66.6 46.8 64.9C46.0 63.2 45.1 61.7 43.4 59.7C41.7 57.7 38.2 54.5 36.6 52.8C35.1 51.1 34.9 50.7 34.2 49.4C33.5 48.2 32.7 46.8 32.4 45.2C32.0 43.7 31.7 41.9 32.0 40.2C32.2 38.5 32.6 36.8 33.8 35.0C35.0 33.1 37.2 30.8 39.1 29.2C41.0 27.6 42.5 26.7 45.2 25.3C48.0 23.9 53.6 21.7 55.5 21.0Z'
const HUECOS =
  'M51.1 27.9C52.4 27.4 51.8 28.0 52.0 28.6C52.3 29.2 52.1 30.2 52.5 31.4C52.9 32.7 54.1 35.2 54.4 36.1C54.6 37.1 55.8 37.6 54.0 37.0C52.2 36.5 45.2 33.5 43.6 32.6C41.9 31.7 42.8 32.2 44.1 31.4C45.3 30.7 49.8 28.4 51.1 27.9ZM38.6 35.5C40.4 35.9 45.5 37.8 48.6 39.1C51.7 40.4 54.4 41.7 57.1 43.2C59.8 44.6 63.3 46.5 64.9 47.7C66.5 48.9 66.4 49.3 66.7 50.2C67.1 51.1 67.2 52.4 67.1 52.9C67.0 53.5 67.2 53.9 66.2 53.5C65.2 53.0 63.7 51.7 61.0 50.2C58.3 48.7 53.9 46.3 50.1 44.6C46.2 42.9 40.0 40.9 37.8 39.8C35.6 38.7 36.8 38.6 36.8 38.1C36.7 37.5 37.3 36.8 37.6 36.4C37.9 36.0 36.8 35.0 38.6 35.5ZM38.2 44.2C39.6 44.5 43.1 45.4 46.2 46.7C49.2 47.9 53.6 49.9 56.7 51.6C59.8 53.3 63.1 55.8 64.7 56.8C66.2 57.9 65.8 57.7 66.0 58.1C66.2 58.6 66.2 58.9 65.8 59.4C65.5 60.0 64.4 61.2 63.9 61.7C63.4 62.1 63.3 62.0 63.0 62.0C62.6 62.0 63.3 62.6 61.8 61.7C60.3 60.7 57.4 58.5 54.0 56.6C50.6 54.7 44.2 52.1 41.5 50.3C38.8 48.5 38.5 46.7 37.8 45.8C37.2 44.9 37.5 45.1 37.6 44.9C37.6 44.6 36.8 43.9 38.2 44.2ZM50.1 58.9C50.5 58.9 50.6 58.7 51.6 59.3C52.7 59.9 55.3 61.6 56.4 62.3C57.6 63.0 58.2 63.3 58.7 63.7C59.1 64.2 59.9 64.1 59.3 64.8C58.7 65.4 56.2 67.0 55.0 67.6C53.9 68.3 53.1 68.7 52.4 68.4C51.7 68.1 51.5 67.3 51.0 66.0C50.4 64.7 49.3 61.7 49.0 60.6C48.7 59.6 49.0 59.9 49.2 59.6C49.3 59.3 49.7 59.0 50.1 58.9Z'
</script>

<template>
  <svg viewBox="0 0 100 100" class="inline-block shrink-0" aria-hidden="true">
    <defs>
      <!-- Como el sombreado del juego: la luz arriba a la izquierda (rampa 4),
           el cuerpo (3) y la sombra abajo a la derecha (2). -->
      <radialGradient :id="`${id}-color`" cx=".3" cy=".25" r=".95">
        <stop offset="0" :stop-color="rampas[3]" />
        <stop offset=".35" :stop-color="rampas[2]" />
        <stop offset="1" :stop-color="rampas[1]" />
      </radialGradient>
      <radialGradient :id="`${id}-luz`" cx=".35" cy=".25" r=".7">
        <stop offset="0" stop-color="#fff" stop-opacity=".35" />
        <stop offset=".6" stop-color="#fff" stop-opacity="0" />
      </radialGradient>
      <clipPath :id="`${id}-recorte`"><path :d="PIEDRA" /></clipPath>
    </defs>
    <path :d="PIEDRA" :fill="`url(#${id}-color)`" />
    <path :d="PIEDRA" :fill="`url(#${id}-luz)`" />
    <!-- El brillo del canto de arriba: el borde, bajado un poco y recortado con
         la piedra quieta (el recorte va en el grupo, no en el trazo movido). -->
    <g :clip-path="`url(#${id}-recorte)`">
      <path
        :d="PIEDRA"
        transform="translate(0 3)"
        fill="none"
        stroke="#fff"
        stroke-opacity=".7"
        stroke-width="3"
      />
    </g>
    <path :d="PIEDRA" fill="none" :stroke="rampas[0]" stroke-width="1.4" />
    <path
      :d="SIMBOLO"
      fill="#fff"
      fill-opacity=".55"
      stroke="#fff"
      stroke-opacity=".9"
      stroke-width="1.6"
      stroke-linejoin="round"
    />
    <path
      :d="HUECOS"
      :fill="rampas[1]"
      fill-opacity=".35"
      stroke="#fff"
      stroke-opacity=".6"
      stroke-width="1"
    />
  </svg>
</template>
