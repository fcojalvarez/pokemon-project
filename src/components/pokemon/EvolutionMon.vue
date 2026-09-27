<script setup>
/**
 * Un Pokémon de la cadena evolutiva: sprite, marca de variocolor, nombre y
 * tipos. Es un enlace a su ficha (o a la de su forma, en las megas), salvo el
 * que se está viendo, que se resalta.
 *
 * El enlace reemplaza la entrada del historial en vez de añadir otra: moverse
 * por la cadena es seguir en la misma ficha, y «Volver» tiene que llevar a la
 * página de antes (la Pokédex, el Top…), no deshacer la cadena paso a paso.
 *
 * Tres tamaños: el normal de la fila principal, el de dentro de un grupo
 * (varias salidas desde el mismo Pokémon) y en ambos, más pequeño en móvil.
 */
import { computed } from 'vue'
import BaseSprite from '../base/BaseSprite.vue'
import TypeIcons from '../base/TypeIcons.vue'
import ShinyMark from './ShinyMark.vue'
import { localName } from '../../composables/useTranslate'

const props = defineProps({
  mon: { type: Object, required: true },
  /** Ruta de su ficha. */
  to: { type: String, default: null },
  active: Boolean,
  shiny: Boolean,
  /** Dentro de un grupo, más pequeño. */
  enGrupo: Boolean,
  /** Grupo de solo dos (megas X e Y): hay sitio para nombres largos. */
  pocos: Boolean,
  /** Sin número delante: en las megas es el mismo que el del base, y dentro
   *  de un grupo no cabe (Eevee, a cuatro columnas en móvil). */
  sinNumero: Boolean,
  badge: { type: String, default: null }
})

// En una sola expresión: un espacio al final de un bloque condicional de la
// plantilla se lo come el compilador y salía «#4Charmander».
// Los pasos de una forma regional traen el nombre en los dos idiomas
// («Meowth de Galar» / «Galarian Meowth»); el resto, solo `name`.
const nombre = computed(() => {
  const texto = localName(props.mon)
  return props.sinNumero ? texto : `#${props.mon.pokemon_id} ${texto}`
})

const sprite = computed(() => (props.shiny ? props.mon.sprites?.male_shiny : props.mon.sprites?.male) ?? null)

// El ancho incluye el relleno de la tarjeta (p-1.5 / lg:p-2).
const ancho = computed(() => {
  if (!props.enGrupo) return 'w-[72px] lg:w-32'
  return props.pocos ? 'w-[132px] lg:w-[136px]' : 'w-full lg:w-[104px]'
})
// Igual que las tarjetas de la Pokédex: la tarjeta es el sprite, el nombre y
// los tipos. El que se está viendo se marca con fondo y borde, y mide lo mismo
// que los demás; los demás se resaltan al pasar el ratón.
const activo = 'bg-gray-200 dark:bg-gray-700 outline outline-1 outline-gray-400 dark:outline-gray-500'
const alPasar = 'hover:outline hover:bg-gray-150 hover:outline-white hover:dark:bg-gray-800 hover:dark:outline-gray-600'

const caja = computed(() =>
  props.enGrupo ? 'w-[54px] h-[54px] lg:w-[72px] lg:h-[72px]' : 'w-[60px] h-[60px] lg:w-24 lg:h-24'
)
</script>

<template>
  <component
    :is="to && !active ? 'router-link' : 'div'"
    :to="to && !active ? to : undefined"
    :replace="Boolean(to && !active)"
    :aria-current="active ? 'page' : undefined"
    class="flex flex-col items-center gap-1.5 shrink-0 p-1.5 lg:p-2 rounded-xl text-gray-800 dark:text-gray-200"
    :class="[ancho, active ? activo : to ? alPasar : '']"
  >
    <span class="relative grid place-items-center" :class="caja">
      <base-sprite
        :src="sprite"
        :lazy="false"
        class="w-full h-full"
        img-class="drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark"
      />
      <shiny-mark
        v-if="mon.is_shiny_released"
        variant="evolution"
        :label="$t('pokemon.shinyLegend')"
        class="absolute top-0 right-0 z-10 origin-top-right"
        :class="enGrupo ? 'scale-75' : 'scale-90'"
      />
    </span>
    <span class="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-center leading-tight">
      <span class="font-semibold text-mini lg:text-xs break-words hyphens-auto min-w-0">{{ nombre }}</span>
      <type-icons v-if="mon.types?.length" :types="mon.types" size="11" class="!gap-0.5" />
    </span>
    <span
      v-if="badge"
      class="px-2 py-0.5 text-mini uppercase tracking-wider rounded-full border border-amber-500 text-amber-700 dark:text-amber-400"
    >{{ badge }}</span>
  </component>
</template>
