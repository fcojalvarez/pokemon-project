<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import ItemPokemonList from '../components/ItemPokemonList.vue'
import ScrollUpButton from '../components/ScrollUpButton.vue'
import BaseSprite from '../components/base/BaseSprite.vue'
import { spriteUrl } from '../utils/sprites'
import MarkLegend from '../components/pokemon/MarkLegend.vue'
import PokedexFilters from '../components/pokemon/PokedexFilters.vue'
import { storeToRefs } from 'pinia'
import { usePokemonsStore } from '@/stores/pokemons'
import {
  MAX_LENGTH_POKEMONS,
  NEXT_LOAD_LENGTH_ITEMS,
  DISTANCE_TO_BOTTOM_PAGE,
  typesSVG
} from '../utils/Settings'
import { entre, lista, useFiltrosEnUrl } from '../composables/useFiltrosEnUrl'
import { useRoute } from 'vue-router'
import { useMedia } from '../composables/useMedia'

const pokemonStore = usePokemonsStore()
const route = useRoute()
const { pokemons, isLoading, isSearching, filters, searchTerm, activeFilterCount } =
  storeToRefs(pokemonStore)
const {
  getPokemons,
  addPokemons,
  setFilters,
  clearFilters,
  filterPokemons,
  setIsSearching,
  parecidos
} = pokemonStore

/**
 * Los filtros, en la URL: un enlace o una recarga conservan la selección.
 *
 * Cada campo escribe en la store, pero los que llegan juntos (al entrar con
 * una URL con varios) se agrupan en una sola llamada a setFilters, que es la
 * que consulta a Supabase. Si ya están así en la store (al volver de una
 * ficha), no se toca nada: la lista y el scroll siguen como estaban.
 */
let pendiente = null
const aplicar = (cambio) => {
  const iguales = Object.entries(cambio).every(
    ([clave, valor]) => JSON.stringify(filters.value[clave]) === JSON.stringify(valor)
  )
  if (iguales) return
  const primero = !pendiente
  pendiente = { ...(pendiente ?? {}), ...cambio }
  if (primero)
    queueMicrotask(() => {
      const junto = pendiente
      pendiente = null
      setFilters(junto)
    })
}
const filtro = (clave) =>
  computed({ get: () => filters.value[clave], set: (valor) => aplicar({ [clave]: valor }) })
const SOLO = {
  shiny: 'onlyShiny',
  shadow: 'onlyShadow',
  dynamax: 'onlyDynamax',
  gigantamax: 'onlyGigantamax',
  cheapevo: 'onlyCheapEvo'
}
const solo = computed({
  get: () =>
    Object.entries(SOLO)
      .filter(([, clave]) => filters.value[clave])
      .map(([nombre]) => nombre),
  set: (nombres) =>
    aplicar(
      Object.fromEntries(
        Object.entries(SOLO).map(([nombre, clave]) => [clave, nombres.includes(nombre)])
      )
    )
})
// La búsqueda también, como ?q=. Al restaurarla desde la URL se busca igual
// que si se hubiera escrito en el buscador.
const busqueda = computed({
  get: () => searchTerm.value,
  set: (texto) => {
    setIsSearching(Boolean(texto))
    filterPokemons(texto)
  }
})
const { habiaFiltros } = useFiltrosEnUrl({
  q: { valor: busqueda, defecto: '' },
  kinds: { valor: filtro('types'), defecto: [], ...lista(Object.keys(typesSVG)) },
  gen: {
    valor: filtro('generation'),
    defecto: null,
    leer: (texto) => (/^[1-9]$/.test(texto) ? Number(texto) : undefined),
    escribir: (valor) => (valor ? String(valor) : '')
  },
  rarity: {
    valor: filtro('rarity'),
    defecto: null,
    leer: entre(['standard', 'legendary', 'mythic', 'ultra_beast']),
    escribir: (valor) => valor ?? ''
  },
  only: { valor: solo, defecto: [], ...lista(Object.keys(SOLO)) }
})

const currentPokemonsLength = computed(() => pokemons.value.length)
const isAllPokemonsLoaded = ref(false)

const scrollHandler = async () => {
  const { scrollTop, scrollHeight } = document.scrollingElement
  if (scrollTop <= scrollHeight - DISTANCE_TO_BOTTOM_PAGE || isAllPokemonsLoaded.value) return
  if (isLoading.value || isSearching.value) return

  // `range` de PostgREST incluye los dos extremos: de 100 en 100 es 0-99, 100-199…
  const start = currentPokemonsLength.value
  const siguiente = start + NEXT_LOAD_LENGTH_ITEMS
  isAllPokemonsLoaded.value = siguiente >= MAX_LENGTH_POKEMONS
  await addPokemons({ start, end: Math.min(siguiente, MAX_LENGTH_POKEMONS) - 1 })
}

/**
 * Como mucho una comprobación por fotograma: el scroll lanza decenas de
 * eventos por segundo y cada uno leía scrollHeight, que obliga al navegador a
 * recalcular el layout si algo ha cambiado (las imágenes que van llegando).
 */
let comprobando = false
const alDesplazar = () => {
  if (comprobando) return
  comprobando = true
  requestAnimationFrame(() => {
    comprobando = false
    scrollHandler()
  })
}

/**
 * La URL manda. Al volver atrás (del navegador o de la app) trae los filtros y
 * la búsqueda, que se escriben en ella al aplicarlos, y se restauran. Al
 * entrar desde el menú llega sin nada: entonces se limpian también en la
 * store, que si no seguía aplicando lo de la visita anterior.
 */
const hayAlgoAplicado = () => Boolean(searchTerm.value) || activeFilterCount.value > 0
const limpiar = () => {
  if (searchTerm.value) {
    setIsSearching(false)
    filterPokemons('')
  }
  if (hayAlgoAplicado()) clearFilters()
}
if (!habiaFiltros && hayAlgoAplicado()) limpiar()
// Pulsar «Pokédex» en el menú estando ya en la Pokédex: misma página, URL limpia.
watch(
  () => route.query,
  (query) => {
    if (!Object.keys(query).length && hayAlgoAplicado()) limpiar()
  }
)

// passive: le dice al navegador que el listener no va a hacer preventDefault,
// así no tiene que esperarnos para desplazar la página. Se nota en móvil.
// Al cambiar de filtros la store reinicia el listado: aquí hay que soltar la
// bandera de "ya no hay más" o el scroll infinito se quedaría muerto.
watch(
  filters,
  () => {
    isAllPokemonsLoaded.value = false
  },
  { deep: true }
)

// Al buscar o filtrar la lista se rehace desde el principio: arriba del todo.
// Si no, con la página bajada y pocos resultados, la página encogía y los
// resultados quedaban escondidos bajo la cabecera.
const volverArriba = () => {
  if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' })
}
watch(searchTerm, volverArriba)
watch(filters, volverArriba, { deep: true })

onMounted(async () => {
  // Con filtros en la URL, la primera carga la hace setFilters (ver arriba).
  if (pokemons.value.length === 0 && !habiaFiltros) await getPokemons()
  document.addEventListener('scroll', alDesplazar, { passive: true })
})
onUnmounted(() => {
  document.removeEventListener('scroll', alDesplazar)
})

/**
 * Sin resultados: antes la Pokédex se quedaba en blanco, sin saber si cargaba,
 * si había fallado o si no había nada. Con una búsqueda por nombre, los
 * Pokémon de nombre parecido («¿Querías decir…?»), por si era una errata; con
 * filtros que no dejan a nadie, el botón para quitarlos.
 */
const sinResultados = computed(
  () =>
    !isLoading.value &&
    pokemons.value.length === 0 &&
    (Boolean(searchTerm.value) || activeFilterCount.value > 0)
)
const sugerencias = ref([])
watch(
  [sinResultados, searchTerm],
  async ([vacio, texto]) => {
    sugerencias.value = vacio && texto && isNaN(texto) ? await parecidos(texto) : []
  },
  { immediate: true }
)

// El mismo corte que PokedexFilters y el Top: desde aquí, barra lateral.
const ancho = useMedia('(min-width: 1280px)')
</script>

<template>
  <section class="flex flex-wrap">
    <!-- Oculto a la vista: la Pokédex se reconoce sola, pero la página
             necesita su h1 para quien navega por encabezados. -->
    <h1 class="sr-only">{{ $t('nav.pokedex') }}</h1>
    <p class="sr-only" role="status">
      <template v-if="searchTerm && !isLoading">{{
        $tc('a11y.pokemonCount', pokemons.length, { n: pokemons.length })
      }}</template>
    </p>

    <!--
      Como el Top: desde xl, los filtros en una barra lateral fija y la
      rejilla a su derecha; por debajo, el botón de Filtros encima.
    -->
    <div
      class="w-full pt-3"
      :class="ancho ? 'grid grid-cols-[280px_minmax(0,1fr)] gap-6 items-start' : ''"
    >
      <!--
        La leyenda, arriba y a la izquierda de Filtros (en la barra, debajo de
        ellos). Al final no la veía nadie: con el scroll infinito, a la
        Pokédex casi nunca se le llega al fondo.
      -->
      <pokedex-filters v-slot="{ ancho: enBarra }">
        <!-- En la fila del botón, plegada: abierta ocupaba media pantalla. -->
        <mark-legend v-if="pokemons.length > 0 || isLoading" :plegable="!enBarra" />
      </pokedex-filters>

      <div class="min-w-0">
        <!--
            Rejilla de verdad: antes cada tarjeta medía lo que su contenido y
            el flex-wrap metía las que cupieran, así que en un móvil de 375 px
            salía una por fila. Ahora, tres en móvil (como la Pokédex del
            juego) y las que quepan de ahí para arriba: columnas de 140 px en
            tablet y de 168 en escritorio (cuatro y siete), que con más anchas
            se veían 20 Pokémon por pantalla en escritorio.
        -->
        <div
          v-if="pokemons.length > 0 || isLoading"
          class="w-full grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-x-1 gap-y-2 sm:gap-y-4 md:p-2"
        >
          <template v-if="pokemons.length > 0">
            <div
              v-for="pokemon in pokemons"
              :key="pokemon.pokemon_id"
              class="min-w-0 flex justify-center"
            >
              <item-pokemon-list :pokemon="pokemon" class="w-full max-w-[8rem] md:max-w-[12rem]" />
            </div>
          </template>

          <!--
            Esqueletos con la misma caja que una tarjeta de verdad: al cargar la
            siguiente tanda con el scroll, la rejilla ya tiene el hueco hecho y
            no salta. Al entrar se pinta una pantalla entera; al hacer scroll,
            una fila corta al final de lo que ya hay.
        -->
          <template v-if="isLoading">
            <p class="sr-only" role="status">{{ $t('common.loading') }}</p>
            <div
              v-for="n in pokemons.length ? 10 : 20"
              :key="`esqueleto-${n}`"
              class="min-w-0 flex justify-center"
              aria-hidden="true"
            >
              <div class="w-full max-w-[8rem] md:max-w-[12rem] p-2">
                <div class="w-24 h-24 mx-auto flex items-center justify-center">
                  <div class="w-[76%] h-[76%] rounded-full esqueleto"></div>
                </div>
                <div class="mt-3 h-5 flex items-center justify-center gap-1">
                  <span class="h-3 w-8 rounded-full esqueleto"></span>
                  <span class="h-3.5 w-16 rounded-full esqueleto"></span>
                </div>
                <div class="mt-1 flex justify-center gap-1">
                  <span class="w-3.5 h-3.5 rounded-full esqueleto"></span>
                  <span class="w-3.5 h-3.5 rounded-full esqueleto"></span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div
          v-else-if="sinResultados"
          class="mt-4 mx-auto max-w-md p-6 flex flex-col items-center gap-3 text-center border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900"
          role="status"
        >
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {{
              searchTerm ? $t('filters.noneNamed', { texto: searchTerm }) : $t('filters.noneMatch')
            }}
          </p>
          <template v-if="sugerencias.length">
            <p class="text-xs text-gray-600 dark:text-gray-300">{{ $t('filters.didYouMean') }}</p>
            <ul class="flex flex-wrap justify-center gap-4">
              <li v-for="p in sugerencias" :key="p.pokemon_id">
                <router-link
                  :to="`/pokemon/${p.pokemon_id}`"
                  class="flex flex-col items-center gap-1 p-1 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800"
                >
                  <base-sprite :src="spriteUrl(p.pokemon_id)" class="w-14 h-14" />
                  {{ p.name }}
                </router-link>
              </li>
            </ul>
          </template>
          <p v-else-if="searchTerm" class="text-xs text-gray-600 dark:text-gray-300">
            {{ $t('filters.tryOther') }}
          </p>
          <button v-if="activeFilterCount > 0" type="button" class="boton" @click="clearFilters">
            {{ $t('filters.clearAll') }}
          </button>
        </div>
      </div>
    </div>

    <scroll-up-button />
  </section>
</template>
