<script setup>
/**
 * Un Pokémon dentro de una tarjeta de evento: sprite, nombre en español,
 * marca de variocolor si lo tiene, y enlace a su ficha.
 *
 * Lo usan la hora destacada, el Día de la Comunidad y los jefes de incursión,
 * que antes lo pintaban cada uno a su manera. La marca va sobre el Pokémon y
 * no en una lista aparte de «variocolor disponible»: es del Pokémon, no del
 * evento.
 *
 * LeekDuck no publica el número de Pokédex, así que se busca por nombre en el
 * roster. Si no se encuentra (formas raras), no se enlaza: mejor eso que
 * prometer una navegación que no va a pasar.
 */
import { computed } from 'vue'
import { useGameDataStore } from '../../stores/gameData'
import ShinyMark from '../pokemon/ShinyMark.vue'

const props = defineProps({
  /** Nombre tal cual lo publica LeekDuck, en inglés. */
  name: { type: String, required: true },
  image: { type: String, default: null },
  canBeShiny: Boolean,
  /** Lado del sprite en clases de Tailwind. */
  spriteClass: { type: String, default: 'w-8 h-8' }
})

const gameData = useGameDataStore()

const entrada = computed(() => gameData.baseByName(props.name))
const nombreEs = computed(() => gameData.nombreEs(props.name))

const to = computed(() => (entrada.value ? `/pokemon/${entrada.value.dex}` : null))

/**
 * La marca de variocolor, a escala del sprite que acompaña.
 *
 * Iba a tamaño fijo mientras el sprite va de 32 px en la hora destacada a 20
 * en los jefes de incursión, así que en los pequeños la marca pesaba más que
 * el propio Pokémon. Se saca del `w-N` de las clases y se ata a él.
 */
const markScale = computed(() => {
  const ancho = Number(/\bw-(\d+)\b/.exec(props.spriteClass)?.[1] ?? 8)
  // 0,7 a w-8, que es el tamaño de referencia; nunca por debajo de 0,4, que
  // ahí ya no se distinguiría de una mota.
  return Math.max(0.4, Math.round((ancho / 8) * 0.7 * 100) / 100)
})
</script>

<template>
  <component
    :is="to ? 'router-link' : 'span'"
    :to="to ?? undefined"
    class="flex items-center gap-1.5 min-w-0"
    :class="to ? 'hover:underline' : ''"
  >
    <img
      v-if="props.image"
      :src="props.image"
      alt=""
      :class="['shrink-0 object-contain', props.spriteClass]"
      loading="lazy"
    />
    <span class="truncate">{{ nombreEs }}</span>
    <!--
      Misma escala y mismo ajuste vertical que <shiny-legend>: la marca se sale
      de su caja porque una de sus dos filas tiene alto de línea cero, así que
      su centro visual no es el de la caja y `items-center` la deja alta.
    -->
    <shiny-mark
      v-if="props.canBeShiny"
      variant="dex"
      size="text-mini"
      inline
      :scale="markScale"
      :title="$t('pokemon.shinyLegend')"
    />
  </component>
</template>
