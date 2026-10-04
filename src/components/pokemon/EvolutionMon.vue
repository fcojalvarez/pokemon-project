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
import MaxMark from './MaxMark.vue'
import { localName } from '../../composables/useTranslate'
import { useGameDataStore } from '../../stores/gameData'

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
  badge: { type: String, default: null },
  /** Id de la forma (mega o regional) para saber si se puede dinamaxizar. */
  formaId: { type: String, default: null }
})

const gameData = useGameDataStore()

// Las mismas marcas que en la Pokédex y en la cabecera de la ficha, y con el
// mismo dato: el de la forma si es una mega o una regional y si no, el de la base.
const maxLiberado = computed(() => {
  if (!gameData.isReady) return []
  const entry = props.formaId
    ? gameData.byId.get(props.formaId)
    : gameData.fichaBase(props.mon.pokemon_id, props.mon.name)
  const info = gameData.maxInfoFor(entry)
  if (!info) return []
  return info.gigantamax ? ['dynamax', 'gigantamax'] : ['dynamax']
})

// En una sola expresión: un espacio al final de un bloque condicional de la
// plantilla se lo come el compilador y salía «#4Charmander».
// Los pasos de una forma regional traen el nombre en los dos idiomas
// («Meowth de Galar» / «Galarian Meowth»); el resto, solo `name`.
const nombre = computed(() => {
  const texto = localName(props.mon)
  return props.sinNumero ? texto : `#${props.mon.pokemon_id} ${texto}`
})

const sprite = computed(
  () => (props.shiny ? props.mon.sprites?.male_shiny : props.mon.sprites?.male) ?? null
)

// El ancho incluye el relleno de la tarjeta (p-1.5 / lg:p-2).
const ancho = computed(() => {
  // 72 px en los móviles más estrechos, con el nombre algo más pequeño (ver
  // abajo): con 68 y a 12 px, «Charmander» no cabía y se partía con guion.
  // Tres fases y sus dos flechas caben justas en 390 px. Desde 420 px sobra
  // sitio, y más ancho y con más relleno el recuadro del Pokémon actual deja
  // de ir pegado a su contenido.
  if (!props.enGrupo) return 'w-[72px] min-[420px]:w-20 md:w-24 lg:w-32'
  // Con tope: sola en su fila (Froslass junto a Glalie y su mega), a lo ancho
  // el recuadro del actual ocupaba todo el grupo.
  return props.pocos ? 'w-[132px] lg:w-[136px]' : 'w-full max-w-[104px]'
})
// Igual que las tarjetas de la Pokédex: la tarjeta es el sprite, el nombre y
// los tipos. El que se está viendo se marca con fondo y borde, y mide lo mismo
// que los demás; los demás se resaltan al pasar el ratón.
const activo =
  'bg-gray-200 dark:bg-gray-700 outline outline-1 outline-gray-400 dark:outline-gray-500'
const alPasar =
  'hover:outline hover:bg-gray-150 hover:outline-white hover:dark:bg-gray-800 hover:dark:outline-gray-600'

// Las marcas crecen y menguan con el sprite: la caja va de 54 a 96 px y las
// marcas guardan con ella la proporción que tienen a 96 (la de Max, 18 px como
// en la Pokédex; la de shiny, al 90 %). Con scale y no con otro tamaño de letra
// o de svg, para no descuadrarlas.
const escalaShiny = computed(() =>
  props.enGrupo ? 'scale-[0.51] lg:scale-[0.675]' : 'scale-[0.56] md:scale-[0.675] lg:scale-90'
)
const escalaMax = computed(() =>
  props.enGrupo ? 'scale-[0.56] lg:scale-75' : 'scale-[0.625] md:scale-75 lg:scale-100'
)

const caja = computed(() =>
  props.enGrupo
    ? 'w-[54px] h-[54px] lg:w-[72px] lg:h-[72px]'
    : 'w-[60px] h-[60px] md:w-[72px] md:h-[72px] lg:w-24 lg:h-24'
)
</script>

<template>
  <component
    :is="to && !active ? 'router-link' : 'div'"
    :to="to && !active ? to : undefined"
    :replace="Boolean(to && !active)"
    :aria-current="active ? 'page' : undefined"
    class="flex flex-col items-center gap-1.5 shrink-0 p-1 min-[420px]:p-2 rounded-xl text-gray-800 dark:text-gray-200"
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
        :class="escalaShiny"
      />
      <max-mark
        v-for="(marca, i) in maxLiberado"
        :key="marca"
        :variant="marca"
        :size="18"
        :class="[i === 0 ? 'left-0 origin-bottom-left' : 'right-0 origin-bottom-right', escalaMax]"
        class="absolute bottom-0 z-10 text-gray-800 dark:text-gray-200"
      />
    </span>
    <span
      class="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-center leading-tight"
    >
      <!-- En móvil estrecho, a 11 px y un pelo más juntas: así un nombre de diez
           letras entra entero en vez de partirse («Charman-der»). -->
      <span
        class="font-semibold text-[11px] tracking-tight min-[420px]:text-mini min-[420px]:tracking-normal lg:text-xs break-words min-w-0"
        >{{ nombre }}</span
      >
      <type-icons v-if="mon.types?.length" :types="mon.types" size="11" class="!gap-0.5" />
    </span>
    <span v-if="badge" class="insignia insignia-ambar">{{ badge }}</span>
  </component>
</template>
