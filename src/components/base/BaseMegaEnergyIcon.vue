<script setup>
import { computed, useId } from 'vue'
import { generica, puntos as PUNTOS, rampas as RAMPAS } from '../../assets/megaEnergia.json'
import PRIMIGENIAS from '../../assets/energiaPrimigenia.json'

/**
 * La megaenergía del juego, en SVG. En el juego es un modelo 3D y nadie
 * publica un vector: la silueta de la piedra, el símbolo mega y sus cuatro
 * huecos (dos barras y dos triángulos) son el contorno vectorizado del sprite
 * del juego (Bulbagarden Archives, «GO Mega Energy»), seguido a 512 px y
 * suavizado. Así se ve nítida a 14 px y en pantallas de alta densidad.
 *
 * El color es el de cada especie, medido en su sprite (src/assets/megaEnergia.json,
 * `pnpm megaenergia`): 25 puntos por dentro y 16 pegados al canto, donde
 * está el tornasol (el morado de Gyarados o de Venusaur). Se pintan como
 * círculos muy desenfocados dentro de la silueta, así que se funden igual que
 * en el sprite. Las megas que aún no han salido en GO no tienen sprite: sus
 * puntos salen de sus cuatro colores de rampa del juego (MEZCLAS). Sin
 * especie, la genérica.
 *
 * Kyogre y Groudon no usan la piedra: su energía primigenia es una gema
 * facetada con la alfa o la omega encendida (src/assets/energiaPrimigenia.json).
 * Está vectorizada igual, de su sprite: la silueta, las facetas (los colores
 * del sprite reducidos a siete tonos) y el símbolo con su resplandor.
 */
const props = defineProps({
  /** Número de Pokédex de la especie que megaevoluciona. */
  dex: { type: [Number, String], default: null },
  /** Id de la mega si tiene la suya («6_MEGA_X»): manda sobre la especie. */
  forma: { type: String, default: null }
})

// Los ids de los degradados y filtros, únicos: hay varias piedras en la misma página.
const id = useId()

const primigenia = computed(() => PRIMIGENIAS[String(props.dex)] ?? null)

/** Dónde se midió cada color del sprite, en coordenadas del SVG. */
const DENTRO = [
  [87.7, 46.8],
  [82.1, 64.5],
  [71.9, 82.1],
  [51.5, 88.8],
  [32.9, 79.3],
  [18.6, 65.8],
  [10.1, 46.8],
  [16.2, 26.4],
  [33.7, 15.8],
  [51.5, 10.5],
  [72, 11.3],
  [87.7, 25.8],
  [74.7, 51.2],
  [69.5, 66],
  [55.2, 77],
  [38.3, 70.8],
  [26, 58.8],
  [22, 41.2],
  [33.7, 27.7],
  [65, 22.1],
  [76.9, 34.8],
  [26.2, 35.6],
  [35.5, 68.1],
  [72.4, 31],
  [77, 54.2]
]
const CANTO = [
  [89.5, 54.3],
  [84, 68.6],
  [75.2, 82.4],
  [60.5, 92.7],
  [43.1, 89.3],
  [29.4, 80.1],
  [17.8, 69.4],
  [8.7, 55.4],
  [6.9, 37.8],
  [15.9, 22.9],
  [29.5, 13.8],
  [43.9, 8.4],
  [59.6, 6.2],
  [76.8, 8.8],
  [89.8, 21.1],
  [92.5, 38.7]
]

/**
 * Para las megas sin sprite: cuánto pone cada rampa (1 a 4) y el blanco en la
 * luz, el centro y la sombra de la piedra, ajustado por mínimos cuadrados
 * contra las 60 megaenergías con sprite.
 */
const MEZCLAS = [
  [0, 0.121, 0.355, 0.102, 0.416],
  [0.025, 0.542, 0.211, 0, 0.28],
  [0.119, 0.806, 0.04, 0, 0.148]
]

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const hex = (canales) =>
  '#' + canales.map((c) => Math.min(255, Math.round(c)).toString(16).padStart(2, '0')).join('')

const mezclar = (rampas, pesos) =>
  [0, 1, 2].map(
    (c) => rampas.reduce((suma, color, i) => suma + rgb(color)[c] * pesos[i], 0) + 255 * pesos[4]
  )

/** De la luz (arriba a la izquierda) a la sombra (abajo), como en los sprites. */
const desdeRampas = (rampas) => {
  const [luz, centro, sombra] = MEZCLAS.map((pesos) => mezclar(rampas, pesos))
  const en = ([x, y]) => {
    const t = Math.min(1, Math.max(0, ((x - 3) * 0.35 + (y - 3) * 0.65) / 92))
    const [a, b, f] = t < 0.5 ? [luz, centro, t * 2] : [centro, sombra, (t - 0.5) * 2]
    return hex(a.map((v, i) => v + (b[i] - v) * f))
  }
  return [...DENTRO, ...CANTO].map(en)
}

const colores = computed(() => {
  const clave =
    props.forma && (PUNTOS[props.forma] || RAMPAS[props.forma]) ? props.forma : String(props.dex)
  if (PUNTOS[clave]) return PUNTOS[clave].match(/.{6}/g).map((h) => '#' + h)
  if (RAMPAS[clave]) return desdeRampas(RAMPAS[clave])
  return generica.match(/.{6}/g).map((h) => '#' + h)
})

/** Los puntos donde no se pudo medir (fuera del sprite) vienen en negro. */
const manchas = computed(() =>
  [...DENTRO, ...CANTO]
    .map(([x, y], i) => ({ x, y, color: colores.value[i], canto: i >= DENTRO.length }))
    .filter((p) => p.color !== '#000000')
)

/** El fondo, la media de todo: tapa lo que los círculos no alcanzan. */
const fondo = computed(() => {
  const lista = manchas.value.map((p) => rgb(p.color))
  return hex([0, 1, 2].map((c) => lista.reduce((s, v) => s + v[c], 0) / lista.length))
})

const PIEDRA =
  'M55.9 3.1C59.6 2.7 62.1 2.8 65.2 3.1C68.4 3.5 72.1 4.4 74.6 5.1C77.1 5.8 78.1 6.1 80.1 7.2C82.1 8.4 84.8 10.3 86.5 11.9C88.3 13.5 89.5 15.0 90.6 16.8C91.8 18.6 92.9 20.9 93.6 22.7C94.2 24.4 94.4 24.7 94.7 27.1C95.1 29.6 95.6 33.7 95.5 37.1C95.4 40.5 95.0 43.6 94.1 47.5C93.3 51.4 91.5 57.0 90.2 60.5C89.0 64.1 88.2 65.7 86.5 68.9C84.8 72.2 82.2 76.9 79.9 80.1C77.6 83.3 75.3 86.0 72.9 88.3C70.4 90.5 67.6 92.3 65.2 93.6C62.9 94.8 60.8 95.3 58.8 95.7C56.7 96.1 55.5 96.4 52.9 95.9C50.4 95.4 46.4 93.8 43.6 92.6C40.8 91.3 39.2 90.6 36.1 88.5C33.0 86.4 28.2 82.6 25.0 79.9C21.8 77.2 19.4 74.9 17.0 72.3C14.6 69.7 12.4 67.0 10.5 64.3C8.7 61.5 6.8 58.2 5.7 55.9C4.5 53.5 4.1 52.7 3.7 50.4C3.3 48.1 3.1 44.2 3.1 42.0C3.1 39.8 3.2 39.0 3.7 37.1C4.3 35.2 5.3 32.6 6.4 30.5C7.6 28.4 8.9 26.3 10.5 24.4C12.2 22.5 13.8 21.0 16.2 19.1C18.6 17.3 21.6 15.1 24.8 13.3C28.0 11.5 32.2 9.6 35.2 8.4C38.1 7.2 39.1 6.7 42.6 5.9C46.0 5.0 52.1 3.6 55.9 3.1Z'
const SIMBOLO =
  'M55.1 21.3C56.5 20.9 56.0 21.4 56.1 21.9C56.2 22.3 55.7 22.9 55.7 24.0C55.6 25.2 55.6 27.3 55.9 28.9C56.2 30.5 56.8 32.4 57.4 33.8C58.1 35.2 58.6 36.2 59.8 37.5C61.0 38.8 63.1 40.0 64.6 41.6C66.2 43.2 68.2 45.5 69.3 47.1C70.5 48.7 71.0 50.1 71.5 51.2C72.0 52.3 72.1 52.5 72.3 53.7C72.4 54.9 72.4 57.2 72.3 58.2C72.2 59.2 72.1 59.2 71.7 60.0C71.3 60.7 70.9 61.6 69.9 62.9C68.9 64.2 67.2 66.4 65.6 67.8C64.1 69.1 63.6 69.5 60.7 70.9C57.9 72.3 50.8 75.5 48.6 76.4C46.5 77.3 47.9 76.5 47.7 76.4C47.4 76.3 47.3 77.0 47.3 75.8C47.3 74.6 47.8 70.8 47.7 69.1C47.6 67.4 47.2 67.0 46.7 65.6C46.2 64.3 45.2 62.3 44.5 61.1C43.9 60.0 44.1 60.2 42.8 58.8C41.5 57.4 38.2 54.4 36.7 52.7C35.2 51.1 34.5 50.2 33.8 48.8C33.0 47.5 32.5 46.5 32.2 44.7C32.0 43.0 31.9 40.3 32.2 38.5C32.6 36.7 33.7 35.1 34.4 34.0C35.0 32.9 35.1 33.0 36.1 32.0C37.2 31.1 38.7 29.6 40.6 28.3C42.5 27.1 45.1 25.6 47.5 24.4C49.9 23.2 53.6 21.7 55.1 21.3Z'
const HUECOS =
  'M50.6 27.7C51.1 27.6 51.0 27.8 51.2 27.9C51.4 28.1 51.6 28.1 51.8 28.7C52.0 29.3 52.0 30.4 52.3 31.6C52.7 32.8 53.8 35.1 54.1 35.9C54.4 36.8 54.2 36.5 54.1 36.7C54.0 37.0 54.3 37.8 53.3 37.5C52.3 37.2 49.6 35.6 48.0 35.0C46.5 34.3 44.6 33.8 43.8 33.4C42.9 33.0 43.1 32.7 43.0 32.4C42.9 32.2 43.0 32.1 43.2 31.8C43.4 31.6 43.3 31.6 44.1 31.1C45.0 30.5 47.2 29.3 48.2 28.7C49.3 28.2 50.1 27.9 50.6 27.7ZM38.5 35.5C39.2 35.6 39.5 35.6 41.8 36.5C44.1 37.5 48.8 39.4 52.5 41.2C56.2 43.1 61.9 46.4 64.1 47.7C66.2 49.0 65.2 48.5 65.6 49.0C66.0 49.5 66.3 49.9 66.4 50.6C66.5 51.3 66.5 52.6 66.4 53.1C66.3 53.6 66.1 53.5 65.8 53.5C65.6 53.5 65.7 53.7 64.8 53.1C64.0 52.6 62.9 51.5 60.5 50.2C58.2 48.9 53.4 46.4 50.8 45.1C48.2 43.9 46.0 43.3 44.9 42.8C43.8 42.3 45.5 42.7 44.1 42.2C42.8 41.7 38.2 40.3 36.9 39.8C35.6 39.4 36.6 39.6 36.5 39.3C36.5 39.0 36.4 38.6 36.5 38.1C36.7 37.6 37.2 36.8 37.5 36.3C37.8 35.9 37.8 35.5 38.5 35.5ZM37.9 44.3C38.1 44.3 37.8 44.0 38.7 44.3C39.6 44.6 40.9 45.0 43.4 46.1C45.9 47.2 50.1 48.9 53.7 50.8C57.3 52.7 62.9 56.3 64.8 57.6C66.8 58.9 65.4 58.1 65.4 58.4C65.5 58.7 65.6 59.0 65.2 59.6C64.9 60.1 63.9 61.2 63.3 61.5C62.7 61.9 62.7 62.2 61.7 61.7C60.7 61.2 58.8 59.5 57.4 58.6C56.0 57.7 54.7 56.9 53.3 56.2C52.0 55.6 50.7 55.1 49.4 54.5C48.1 53.8 47.0 53.0 45.7 52.3C44.4 51.7 42.4 51.2 41.4 50.6C40.4 50.0 40.0 49.4 39.5 48.8C38.9 48.2 38.4 47.7 38.1 47.1C37.7 46.5 37.4 45.7 37.3 45.3C37.2 44.9 37.4 44.7 37.5 44.5C37.6 44.4 37.7 44.4 37.9 44.3ZM49.6 58.6C49.9 58.5 49.7 58.3 50.4 58.8C51.0 59.2 52.3 60.5 53.5 61.3C54.8 62.1 57.0 63.2 57.8 63.7C58.6 64.2 58.3 64.0 58.4 64.3C58.5 64.5 58.5 64.8 58.4 65.0C58.3 65.3 58.6 65.1 57.8 65.6C57.0 66.1 54.5 67.6 53.5 68.0C52.6 68.4 52.5 68.1 52.1 68.0C51.8 67.8 51.9 68.0 51.6 67.2C51.3 66.4 50.8 64.5 50.4 63.3C49.9 62.1 49.1 60.8 48.8 60.2C48.6 59.5 48.7 59.4 48.8 59.2C49.0 58.9 49.3 58.7 49.6 58.6Z'
</script>

<template>
  <svg v-if="primigenia" viewBox="0 0 100 100" class="inline-block shrink-0" aria-hidden="true">
    <defs>
      <clipPath :id="`${id}-gema`"><path :d="primigenia.silueta" /></clipPath>
      <filter :id="`${id}-facetas`"><feGaussianBlur stdDeviation=".7" /></filter>
      <filter :id="`${id}-resplandor`" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
    </defs>
    <g :clip-path="`url(#${id}-gema)`">
      <rect width="100" height="100" :fill="primigenia.fondo" />
      <g :filter="`url(#${id}-facetas)`">
        <path v-for="([color, d], i) in primigenia.facetas" :key="i" :d="d" :fill="color" />
      </g>
      <!-- El símbolo encendido: el resplandor debajo y el trazo claro encima. -->
      <path
        :d="primigenia.simbolo + primigenia.anillo"
        fill-rule="evenodd"
        :fill="primigenia.brillo[1]"
        :filter="`url(#${id}-resplandor)`"
      />
      <path
        :d="primigenia.simbolo + primigenia.anillo"
        fill-rule="evenodd"
        :fill="primigenia.brillo[0]"
      />
    </g>
  </svg>
  <svg v-else viewBox="0 0 100 100" class="inline-block shrink-0" aria-hidden="true">
    <defs>
      <clipPath :id="`${id}-recorte`"><path :d="PIEDRA" /></clipPath>
      <filter :id="`${id}-dentro`" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
      <filter :id="`${id}-canto`" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <filter :id="`${id}-brillo`" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.2" />
      </filter>
    </defs>
    <g :clip-path="`url(#${id}-recorte)`">
      <rect width="100" height="100" :fill="fondo" />
      <g :filter="`url(#${id}-dentro)`">
        <circle
          v-for="(p, i) in manchas.filter((m) => !m.canto)"
          :key="i"
          :cx="p.x"
          :cy="p.y"
          r="16"
          :fill="p.color"
        />
      </g>
      <!-- Encima, el tornasol del canto. -->
      <g :filter="`url(#${id}-canto)`">
        <circle
          v-for="(p, i) in manchas.filter((m) => m.canto)"
          :key="i"
          :cx="p.x"
          :cy="p.y"
          r="10"
          :fill="p.color"
        />
      </g>
      <!-- El brillo alargado de arriba a la izquierda. -->
      <ellipse
        cx="38"
        cy="19"
        rx="13"
        ry="3.2"
        transform="rotate(-9 38 19)"
        fill="#fff"
        opacity=".75"
        :filter="`url(#${id}-brillo)`"
      />
    </g>
    <path :d="PIEDRA" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1" />
    <path
      :d="SIMBOLO"
      fill="#fff"
      fill-opacity=".38"
      stroke="#fff"
      stroke-opacity=".5"
      stroke-width=".9"
      stroke-linejoin="round"
    />
    <path
      :d="HUECOS"
      fill="#000"
      fill-opacity=".12"
      stroke="#000"
      stroke-opacity=".15"
      stroke-width=".7"
    />
  </svg>
</template>
