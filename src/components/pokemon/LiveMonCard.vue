<script setup>
/**
 * Tarjeta compacta de un Pokémon que sale ahora mismo: en incursión, en huevo
 * o como recompensa de una tarea.
 *
 * Las tres vistas lo pintaban distinto y cada una ocupaba lo suyo. Esta es
 * horizontal —sprite a la izquierda, nombre y PC a la derecha— porque así
 * entra el doble por pantalla que la tarjeta vertical de la Pokédex, y al ir
 * en rejilla aprovecha también el ancho.
 *
 * Lleva a la ficha del Pokémon cuando se sabe cuál es: LeekDuck no publica el
 * número, se saca de su imagen, y de algunos (formas raras) no se puede. En
 * ese caso no es un enlace, para no prometer una navegación que no va a pasar.
 */
import { computed } from 'vue'
import ShinyMark from './ShinyMark.vue'
import BaseSprite from '../base/BaseSprite.vue'

const props = defineProps({
  name: { type: String, required: true },
  image: { type: String, default: null },
  /** Número de Pokédex, o null si no se ha podido deducir. */
  dex: { type: Number, default: null },
  /** { min, max } del encuentro. */
  combatPower: { type: Object, default: null },
  canBeShiny: Boolean,
  /** Pinta el aura morada: LeekDuck reutiliza el sprite normal del oscuro. */
  shadow: Boolean,
  /** Texto corto extra (el nivel de la incursión, por ejemplo). */
  badge: { type: String, default: null },
  /** Señalado al llegar desde la ficha de ese Pokémon. */
  highlight: Boolean,
  /**
   * Va a todo el ancho también en móvil (los combates Max, a una columna):
   * hay sitio para «PC» delante del rango y el nombre no hace falta partirlo.
   */
  ancha: Boolean
})

const cpLabel = computed(() => {
  const cp = props.combatPower
  if (!cp?.min) return null
  return cp.max && cp.max !== cp.min ? `${cp.min}–${cp.max}` : `${cp.min}`
})

const to = computed(() => (props.dex ? `/pokemon/${props.dex}` : null))

/**
 * Los iconos de LeekDuck vienen recortados al contorno: el Pokémon llena el
 * 96 % de la imagen. Los sprites HOME de PokeAPI (los combates Max) llevan
 * margen y se queda en un 77 %, así que en la misma caja salía una quinta
 * parte más pequeño que el jefe de al lado. Se amplía lo que falta (96/77).
 */
const conMargen = computed(() => Boolean(props.image) && !props.image.includes('leekduck.com'))
</script>

<template>
  <component
    :is="to ? 'router-link' : 'div'"
    :to="to ?? undefined"
    class="flex flex-wrap items-center gap-2 p-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
    :class="[
      to ? 'cursor-pointer hover:bg-gray-150 hover:dark:bg-gray-800' : '',
      highlight ? 'ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-300 ring-offset-gray-100 dark:ring-offset-gray-950' : ''
    ]"
  >
    <!--
      `isolate`: el z-10 de la marca shiny tiene que ganar al sprite y a nada
      más. Suelto, competía con la barra fija de filtros de Ahora (también
      z-10, pero antes en el DOM) y la marca asomaba por encima al hacer scroll.
    -->
    <span class="relative isolate shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center">
      <!-- El aura del oscuro la pone BaseSprite: no hay sprite con ella. -->
      <base-sprite
        v-if="image"
        :src="image"
        :oscuro="shadow"
        class="w-9 h-9 sm:w-10 sm:h-10"
        :img-class="['drop-shadow-contorno dark:drop-shadow-none', conMargen ? 'scale-125' : '']"
      />
      <shiny-mark
        v-if="canBeShiny"
        variant="dex"
        size="text-mini"
        class="absolute -top-1 -right-1 z-10 scale-[0.6] origin-top-right"
        :title="$t('pokemon.shinyLegend')"
        :label="$t('pokemon.shinyLegend')"
      />
    </span>

    <span class="flex-1 min-w-0">
      <!-- Hasta dos líneas antes de recortar: «Typhlosion de Hisui» salía cortado con media pantalla libre. -->
      <span class="text-xs font-semibold line-clamp-2 break-words" :class="ancha ? '' : 'hyphens-auto'" :title="name">{{ name }}</span>
      <!--
        En móvil, a dos columnas, no caben etiqueta y rango: el texto se salía
        por debajo del botón de desplegar. Se queda el rango, que junto a un
        jefe de incursión se entiende solo, y la etiqueta vuelve desde sm.
        El `title` la lleva siempre, para quien use lector de pantalla.
      -->
      <span
        v-if="cpLabel"
        class="block text-mini text-gray-600 dark:text-gray-300 truncate"
        :title="`${$t('raids.cpRange')} ${cpLabel}`"
      >
        <!-- &nbsp;: el espacio normal al final del span se perdía («PC529–574»). -->
        <span :class="ancha ? 'min-[420px]:hidden sm:inline' : 'hidden sm:inline'">{{ $t('raids.cpRange') }}&nbsp;</span>{{ cpLabel }}
      </span>
      <span v-if="badge" class="block text-mini text-gray-600 dark:text-gray-300">{{ badge }}</span>
    </span>

    <slot />

    <!-- Una fila más abajo, a todo el ancho de la tarjeta: deja la de arriba para el nombre. -->
    <span v-if="$slots.pie" class="basis-full">
      <slot name="pie" />
    </span>
  </component>
</template>
