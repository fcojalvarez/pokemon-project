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
import TypeIcons from '../base/TypeIcons.vue'
import { typesSVG } from '../../utils/Settings'

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
  ancha: Boolean,
  /**
   * Tipos del jefe (incursiones y combates Max). Con ellos la tarjeta es la
   * de jefe: luz de su primer tipo, sprite grande arriba a la derecha y, abajo,
   * su tipo y a qué es débil junto al botón de counters (el slot `pie`).
   */
  tipos: { type: Array, default: () => [] },
  /** Tipos que le hacen más daño, de más a menos. */
  debil: { type: Array, default: () => [] },
  /**
   * En columna y estrecha: sprite grande arriba y nombre y PC debajo. Para
   * los carruseles de huevos y las recompensas de las misiones, donde manda
   * la imagen.
   */
  vertical: Boolean,
  /** Sin borde ni fondo: va dentro de otra tarjeta (la de su misión). */
  sinCaja: Boolean,
  /**
   * Rareza en el huevo, de 1 (lo más común) a 5 (lo más raro), como los
   * iconos de huevo del juego. Con 0 o sin ella, no sale.
   */
  rareza: { type: Number, default: 0 }
})

const colorTipo = computed(() => typesSVG[props.tipos.find((t) => typesSVG[t])]?.color ?? null)
const esJefe = computed(() => Boolean(colorTipo.value))

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
  <!--
    Tarjeta de jefe. Todo en columna: en móvil, a dos por fila, no cabían
    sprite grande, nombre y botón en la misma línea.
  -->
  <component
    :is="to ? 'router-link' : 'div'"
    v-if="esJefe"
    :to="to ?? undefined"
    class="luz-tipo relative isolate flex flex-col p-2 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
    :style="{ '--tipo': colorTipo }"
    :class="[
      to ? 'cursor-pointer hover:bg-gray-150 hover:dark:bg-gray-800' : '',
      highlight
        ? 'ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-300 ring-offset-gray-100 dark:ring-offset-gray-950'
        : ''
    ]"
  >
    <shiny-mark
      v-if="canBeShiny"
      variant="dex"
      size="text-mini"
      class="absolute top-2 right-2 z-10 scale-[0.8] origin-top-right"
      :title="$t('pokemon.shinyLegend')"
      :label="$t('pokemon.shinyLegend')"
    />
    <base-sprite
      v-if="image"
      :src="image"
      :oscuro="shadow"
      class="self-end w-14 h-14 sm:w-16 sm:h-16"
      :img-class="['drop-shadow-contorno dark:drop-shadow-none', conMargen ? 'scale-125' : '']"
    />
    <span class="flex items-center gap-1.5 min-w-0">
      <span class="text-xs font-semibold line-clamp-2 break-words hyphens-auto" :title="name">{{
        name
      }}</span>
      <slot />
    </span>
    <!--
      Los PC y, a su derecha, su tipo: antes el tipo iba en su propia fila
      («Tipo») abajo, y era una línea más en cada tarjeta.
    -->
    <span class="flex items-center gap-2 min-w-0">
      <span
        v-if="cpLabel"
        class="text-mini text-gray-600 dark:text-gray-300 truncate"
        :title="`${$t('raids.cpRange')} ${cpLabel}`"
      >
        {{ cpLabel }}
        <span class="text-[0.8em] font-normal text-gray-600 dark:text-gray-300">{{
          $t('raids.cpRange')
        }}</span>
      </span>
      <type-icons :types="tipos" size="14" class="!gap-1 shrink-0" />
    </span>
    <span v-if="badge" class="block text-mini text-gray-600 dark:text-gray-300">{{ badge }}</span>
    <!--
      Abajo, bajo una raya, a qué es débil (hasta cuatro, los que más daño le
      hacen), con su rótulo: sin él, los iconos sueltos no se entendían. Debajo,
      a lo ancho, el botón de counters con su texto: al lado de las debilidades
      no cabía en las tarjetas estrechas del móvil.
    -->
    <span
      class="mt-auto pt-1.5 border-t border-gray-300/70 dark:border-gray-700 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1"
    >
      <template v-if="debil.length">
        <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('raids.weak') }}</span>
        <type-icons :types="debil.slice(0, 4)" size="14" class="!gap-1 min-w-0" />
      </template>
      <span v-if="$slots.pie" class="col-span-2 mt-1 grid"><slot name="pie" /></span>
    </span>
  </component>

  <component
    :is="to ? 'router-link' : 'div'"
    v-else-if="vertical"
    :to="to ?? undefined"
    class="relative isolate shrink-0 w-[5.5rem] flex flex-col items-center p-1.5 rounded-xl text-center text-gray-800 dark:text-gray-200"
    :class="[
      sinCaja
        ? ''
        : 'border border-gray-300 dark:border-gray-700 shadow-md bg-white dark:bg-gray-900',
      to ? 'cursor-pointer hover:bg-gray-150 hover:dark:bg-gray-800' : '',
      highlight
        ? 'ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-300 ring-offset-gray-100 dark:ring-offset-gray-950'
        : ''
    ]"
  >
    <shiny-mark
      v-if="canBeShiny"
      variant="dex"
      size="text-mini"
      class="absolute top-1 right-1 z-10 scale-[0.7] origin-top-right"
      :title="$t('pokemon.shinyLegend')"
      :label="$t('pokemon.shinyLegend')"
    />
    <base-sprite
      v-if="image"
      :src="image"
      :oscuro="shadow"
      class="w-14 h-14"
      :img-class="['drop-shadow-contorno dark:drop-shadow-none', conMargen ? 'scale-125' : '']"
    />
    <span
      class="mt-0.5 w-full text-xs font-semibold leading-tight line-clamp-2 break-words hyphens-auto"
      :title="name"
      >{{ name }}</span
    >
    <span
      v-if="cpLabel"
      class="text-mini text-gray-600 dark:text-gray-300 tabular-nums"
      :title="`${$t('raids.cpRange')} ${cpLabel}`"
      >{{ cpLabel }}
      <span class="text-[0.8em] font-normal text-gray-600 dark:text-gray-300">{{
        $t('raids.cpRange')
      }}</span></span
    >
    <span
      v-if="rareza > 0"
      class="mt-0.5 flex gap-0.5"
      role="img"
      :aria-label="$t('raids.rareza', { n: rareza })"
      :title="$t('raids.rareza', { n: rareza })"
    >
      <span
        v-for="n in 5"
        :key="n"
        class="w-1.5 h-2 rounded-[50%]"
        :class="n <= rareza ? 'bg-gray-700 dark:bg-gray-200' : 'border border-gray-400 dark:border-gray-600'"
      ></span>
    </span>
  </component>

  <component
    :is="to ? 'router-link' : 'div'"
    v-else
    :to="to ?? undefined"
    class="flex flex-wrap md:flex-nowrap items-center gap-2 p-1.5 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
    :class="[
      to ? 'cursor-pointer hover:bg-gray-150 hover:dark:bg-gray-800' : '',
      highlight
        ? 'ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-300 ring-offset-gray-100 dark:ring-offset-gray-950'
        : ''
    ]"
  >
    <!--
      `isolate`: el z-10 de la marca shiny tiene que ganar al sprite y a nada
      más. Suelto, competía con la barra fija de filtros de Ahora (también
      z-10, pero antes en el DOM) y la marca asomaba por encima al hacer scroll.
    -->
    <span
      class="relative isolate shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center"
    >
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
      <span
        class="text-xs font-semibold line-clamp-2 break-words"
        :class="ancha ? '' : 'hyphens-auto'"
        :title="name"
        >{{ name }}</span
      >
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
        <!--
          La cifra y «PC» pequeño detrás, en todas partes y en todos los
          anchos, como «29.7 DPS» en el Top. Antes «PC» iba delante y solo
          desde tablet.
        -->
        {{ cpLabel }}
        <span class="text-[0.8em] font-normal text-gray-600 dark:text-gray-300">{{
          $t('raids.cpRange')
        }}</span>
      </span>
      <span v-if="badge" class="block text-mini text-gray-600 dark:text-gray-300">{{ badge }}</span>
    </span>

    <slot />

    <!--
      En móvil, una fila más abajo, a todo el ancho: deja la de arriba para el
      nombre. Desde md cabe a la derecha, en la misma fila.
    -->
    <span v-if="$slots.pie" class="basis-full md:basis-auto md:ml-auto shrink-0">
      <slot name="pie" />
    </span>
  </component>
</template>
