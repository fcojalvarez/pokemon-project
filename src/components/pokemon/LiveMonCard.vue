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
  highlight: Boolean
})

const cpLabel = computed(() => {
  const cp = props.combatPower
  if (!cp?.min) return null
  return cp.max && cp.max !== cp.min ? `${cp.min}–${cp.max}` : `${cp.min}`
})

const to = computed(() => (props.dex ? `/pokemon/${props.dex}` : null))
</script>

<template>
  <component
    :is="to ? 'router-link' : 'div'"
    :to="to ?? undefined"
    class="flex items-center gap-2 p-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
    :class="[
      to ? 'cursor-pointer hover:bg-gray-150 hover:dark:bg-gray-800' : '',
      highlight ? 'ring-2 ring-offset-2 ring-gray-600 dark:ring-gray-300 ring-offset-gray-100 dark:ring-offset-gray-950' : ''
    ]"
  >
    <span class="relative shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center">
      <!-- El aura del oscuro la ponemos nosotros: no hay sprite con ella. -->
      <span
        v-if="shadow"
        class="absolute inset-0 rounded-full"
        style="background: radial-gradient(circle, rgba(147,51,234,0.55) 0%, rgba(147,51,234,0) 70%)"
        aria-hidden="true"
      ></span>
      <img
        v-if="image"
        :src="image"
        alt=""
        class="relative w-9 h-9 sm:w-10 sm:h-10 object-contain"
        loading="lazy"
      />
      <shiny-mark
        v-if="canBeShiny"
        variant="dex"
        size="text-mini"
        class="absolute -top-1 -right-1 z-10 scale-[0.7] origin-top-right"
        :title="$t('pokemon.shinyLegend')"
      />
    </span>

    <span class="flex-1 min-w-0">
      <span class="block text-xs font-semibold truncate" :title="name">{{ name }}</span>
      <!--
        En móvil, a dos columnas, no caben etiqueta y rango: el texto se salía
        por debajo del botón de desplegar. Se queda el rango, que junto a un
        jefe de incursión se entiende solo, y la etiqueta vuelve desde sm.
        El `title` la lleva siempre, para quien use lector de pantalla.
      -->
      <span
        v-if="cpLabel"
        class="block text-mini text-gray-600 dark:text-gray-400 truncate"
        :title="`${$t('raids.cpRange')} ${cpLabel}`"
      >
        <span class="hidden sm:inline">{{ $t('raids.cpRange') }} </span>{{ cpLabel }}
      </span>
      <span v-if="badge" class="block text-mini text-gray-500 dark:text-gray-400">{{ badge }}</span>
    </span>

    <slot />
  </component>
</template>
