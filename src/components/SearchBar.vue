<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import BaseIcon from './base/BaseIcon.vue'
import SpinnerComponent from './SpinnerComponent.vue'
import BaseSprite from './base/BaseSprite.vue'
import ShinyMark from './pokemon/ShinyMark.vue'
import MaxMark from './pokemon/MaxMark.vue'
import { spriteUrl } from '../utils/sprites'
import { formatDex } from '../utils/dex'
import { useRoute, useRouter } from 'vue-router'
import useDetectOutsideClick from '../composables/useDetectOutsideClick'
import { usePokemonsStore } from '@/stores/pokemons'
import { useMainStore } from '../stores/main'
import { storeToRefs } from 'pinia'
import { useGameDataStore } from '../stores/gameData'
import { calcCP } from '../utils/formulas'
import IconoMascara from './base/IconoMascara.vue'
import iconoClima from '../assets/weather/partly_cloudy.png'

const mainStore = useMainStore()
const gameData = useGameDataStore()

/**
 * Lo que más se mira de un Pokémon, en el propio resultado: el PC al 100 % de
 * incursión y huevo (nivel 20) y con clima (25) y, debajo, su mejor puesto
 * PvE. Sin otra línea: la fila mide lo mismo. Si los datos del juego aún no
 * han llegado, no sale nada, y el resultado sigue valiendo para ir a la ficha.
 */
const IV_PERFECTOS = { atk: 15, def: 15, hp: 15 }
const datosClave = (dex) => {
  if (!gameData.isReady) return null
  const base = gameData.baseByDex(dex)
  if (!base?.stats) return null
  const mejor = gameData.pveRanksFor(dex).find((forma) => forma.id === base.id)?.byType[0]
  return {
    pc: calcCP(base.stats, IV_PERFECTOS, 20),
    clima: calcCP(base.stats, IV_PERFECTOS, 25),
    puesto: mejor ? { tipo: mejor.type, rank: mejor.rank } : null
  }
}
const { isDarkMode } = storeToRefs(mainStore)
const { filterPokemons, setIsSearching } = usePokemonsStore()
const route = useRoute()
const router = useRouter()

const inputValue = ref(null)
const isShowModalSearch = ref(false)
const isLoadingPokemonNames = ref(true)
const pokemonsNamesArrFiltered = ref([])
// Solo en la Pokédex el buscador filtra la rejilla que hay debajo. En el
// resto de páginas no hay lista que filtrar, así que abre el desplegable
// de resultados y desde ahí se salta a la ficha.
const isListView = computed(() => route.name === 'PokemonList')
const searchBarRef = ref()

/**
 * El buscador se queda plegado en una lupa: abierto ocupaba media cabecera
 * todo el rato. Al tocarla crece hacia la derecha hasta el menú, tapando el
 * modo oscuro, y se vuelve a plegar al salir si está vacío. Con algo
 * escrito sigue abierto: en la Pokédex eso es lo que filtra la rejilla.
 * Igual en todos los anchos: en escritorio iba siempre desplegado, con
 * caja, y la cabecera se veía distinta a la del móvil.
 */
const emit = defineEmits(['tapa'])
const abierto = ref(false)
const plegado = computed(() => !abierto.value)
watch(abierto, (tapa) => emit('tapa', tapa), { immediate: true })

const inputRef = ref()
const lupaRef = ref()
const cajaRef = ref()
// El foco, en el mismo toque: si se deja para después del repintado, el
// Safari del iPhone no saca el teclado.
const abrir = () => {
  abierto.value = true
  inputRef.value?.focus()
}
/**
 * Al plegarse, el contenido tiene que volver a su sitio. La caja oculta lo
 * que sobresale (overflow-hidden) pero guarda el desplazamiento: si el
 * foco volvía a la lupa mientras aún se estaba encogiendo, el navegador
 * corría el contenido para enseñarla y, ya plegada, la lupa quedaba
 * cortada por la izquierda. Pasaba al cerrar con la ✕.
 */
const alPlegarse = () => {
  if (cajaRef.value && !abierto.value) cajaRef.value.scrollLeft = 0
}
const cerrar = ({ devolverFoco = false } = {}) => {
  abierto.value = false
  isShowModalSearch.value = false
  if (devolverFoco) lupaRef.value?.focus({ preventScroll: true })
  nextTick(alPlegarse)
}
/**
 * La ✕ vacía y pliega. En la Pokédex además deja la rejilla sin filtro.
 * Con teclado el foco vuelve a la lupa, para no perder el sitio; con el dedo
 * o el ratón (detail > 0) se suelta, y no se queda el anillo de foco en la
 * lupa como si siguiera activa.
 */
const vaciarYCerrar = (event) => {
  const habiaTexto = Boolean(inputValue.value)
  inputValue.value = null
  if (habiaTexto && isListView.value) inputSearch()
  const conTeclado = !event || event.detail === 0
  cerrar({ devolverFoco: conTeclado })
  if (!conTeclado) document.activeElement?.blur?.()
}
const alSalir = (event) => {
  if (inputValue.value) return
  if (event.currentTarget.contains(event.relatedTarget)) return
  cerrar()
}

const ICONO_LUPA = 'm17 17 4 4M3 11a8 8 0 1 0 16 0 8 8 0 0 0-16 0z'

const scrollbarBackground = computed(() => (isDarkMode.value ? '#111827' : '#fff'))

const inputSearch = () => {
  setIsSearching(true)
  filterPokemons(inputValue.value)
}

// Solo cuenta la respuesta a lo último que se ha escrito: si no, la de
// «sir» podía llegar después que la de «sirfetchd» y quedarse en pantalla.
let ultimaBusqueda = 0
const inputSearchModal = async () => {
  setIsSearching(true)
  isShowModalSearch.value = true
  // Fuera del Top y la ficha puede que aún no estén: hacen falta para el 100 %.
  gameData.load()
  isLoadingPokemonNames.value = true

  const esta = ++ultimaBusqueda
  const pokemonsResponse = await filterPokemons(inputValue.value, true)
  if (esta !== ultimaBusqueda) return
  pokemonsNamesArrFiltered.value = pokemonsResponse
  setIsSearching(false)
  isLoadingPokemonNames.value = false
}

const goToPokemonPage = (pokemonId) => {
  pokemonId && router.push(`/pokemon/${pokemonId}`)
  inputValue.value = null
  cerrar()
}

/**
 * Navegación con teclado por los resultados (patrón combobox): el foco se
 * queda en el campo y las flechas mueven la opción activa, que se anuncia
 * con aria-activedescendant.
 */
const activeIndex = ref(-1)
const hasResults = computed(
  () =>
    isShowModalSearch.value &&
    !isLoadingPokemonNames.value &&
    pokemonsNamesArrFiltered.value.length > 0
)
const activeId = computed(() =>
  hasResults.value && activeIndex.value >= 0 ? `search-option-${activeIndex.value}` : undefined
)

watch(pokemonsNamesArrFiltered, () => {
  activeIndex.value = -1
})

const onKeydown = (event) => {
  if (event.key === 'Escape') {
    // Primero cierra los resultados; con ellos ya cerrados, pliega.
    if (!isListView.value && isShowModalSearch.value) isShowModalSearch.value = false
    else if (!inputValue.value) cerrar({ devolverFoco: true })
    return
  }
  if (isListView.value) return
  if (!hasResults.value) return
  const last = pokemonsNamesArrFiltered.value.length - 1
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = activeIndex.value >= last ? 0 : activeIndex.value + 1
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = activeIndex.value <= 0 ? last : activeIndex.value - 1
  } else if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault()
    goToPokemonPage(pokemonsNamesArrFiltered.value[activeIndex.value].pokemon_id)
  }
}

useDetectOutsideClick(searchBarRef, (e) => {
  const isClickInSearch = e.target.id === 'input-search'

  if (!isShowModalSearch.value || isClickInSearch) return

  isShowModalSearch.value = false
})

// Al cambiar de página, el buscador enseña la búsqueda de la Pokédex si la
// URL la trae (?q=, al volver atrás) y se vacía si no. Solo al cambiar de
// página, no con cada tecla: la URL se actualiza mientras se escribe y, si
// se copiara de vuelta, podría pisar lo último tecleado.
// Al arrancar se espera al router: antes de la primera navegación la ruta
// aún no trae el ?q=, y al entrar con una búsqueda en la URL la rejilla
// salía filtrada pero con el buscador plegado.
const leerDeLaUrl = () => {
  if (isListView.value) isShowModalSearch.value = false
  inputValue.value = isListView.value && route.query.q ? String(route.query.q) : null
  abierto.value = Boolean(inputValue.value)
}
watch(() => route.path, leerDeLaUrl)
router.isReady().then(leerDeLaUrl)
</script>

<template>
  <!-- El anillo de foco va en la caja entera y no en el campo, que queda
         metido dentro del borde y se veía como un segundo recuadro. -->
  <!-- Poco relleno: con 28 px por lado, en la ficha a 320 px solo cabía la
         «B» de «Buscar». Ninguno a la izquierda: la lupa ocupa el cuadrado
         entero del botón plegado y queda en el mismo sitio al abrirse. -->
  <section
    ref="cajaRef"
    class="buscador relative flex items-center gap-2 transition-colors w-full border border-gray-400 bg-white dark:bg-gray-900 rounded-xl shadow-md focus-within:outline focus-within:outline-1 focus-within:outline-offset-2 focus-within:outline-blue-600 dark:focus-within:outline-blue-300"
    :class="{
      'buscador-abierto pr-1': abierto,
      'overflow-hidden !border-transparent !bg-transparent !shadow-none': plegado
    }"
    @focusout="alSalir"
    @transitionend="alPlegarse"
  >
    <button
      ref="lupaRef"
      type="button"
      class="shrink-0 self-stretch w-12 flex items-center justify-center"
      :class="abierto ? 'pointer-events-none' : 'cursor-pointer'"
      :tabindex="abierto ? -1 : 0"
      :aria-hidden="abierto || undefined"
      :aria-label="$t('a11y.openSearch')"
      :aria-expanded="abierto"
      @click="abrir"
    >
      <!-- Plegada, solo el icono en gris, sin caja: con borde y sombra
                 pesaba más que el nombre de la app, que va en el centro. -->
      <base-icon
        :stroke-width="1.5"
        icon-class="w-6"
        class-path="stroke-gray-500 dark:stroke-gray-300"
        :d="ICONO_LUPA"
      />
    </button>
    <input
      id="input-search"
      ref="inputRef"
      type="text"
      v-model="inputValue"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      enterkeyhint="search"
      class="flex-1 min-w-0 bg-transparent py-2 px-1.5 outline-none focus-visible:outline-none text-black dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400"
      :placeholder="$t('searchPokemon')"
      :aria-label="$t('a11y.search')"
      :role="isListView ? undefined : 'combobox'"
      :aria-expanded="isListView ? undefined : isShowModalSearch"
      :aria-controls="isListView ? undefined : 'search-results'"
      :aria-autocomplete="isListView ? undefined : 'list'"
      :aria-activedescendant="activeId"
      :tabindex="plegado ? -1 : undefined"
      :aria-hidden="plegado || undefined"
      @input="isListView ? inputSearch() : inputSearchModal()"
      @keydown="onKeydown"
    />
    <button
      v-if="abierto"
      type="button"
      class="zona-tactil shrink-0 w-9 h-9 rounded-lg text-gray-600 dark:text-gray-200 hover:bg-gray-150 hover:dark:bg-gray-800"
      :aria-label="$t('a11y.closeSearch')"
      @click="vaciarYCerrar"
    >
      <span aria-hidden="true">✕</span>
    </button>

    <section
      ref="searchBarRef"
      v-if="isShowModalSearch"
      class="absolute left-0 top-full z-40 mt-2 w-full py-2 border border-gray-400 bg-white dark:bg-gray-900 dark:text-white rounded-xl shadow-md"
    >
      <div class="overflow-y-scroll search-modal min-h-[120px] max-h-96">
        <SpinnerComponent v-if="isLoadingPokemonNames" />

        <ul v-else id="search-results" role="listbox" :aria-label="$t('a11y.searchResults')">
          <!--
                        Cada resultado, con su sprite, su número y las marcas de
                        liberado, como en la Pokédex: con el nombre solo, las
                        formas y los nombres parecidos costaba reconocerlos.
                    -->
          <li
            v-for="(pokemon, index) in pokemonsNamesArrFiltered"
            :id="`search-option-${index}`"
            :key="pokemon.pokemon_id"
            role="option"
            :aria-selected="index === activeIndex"
            class="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            :class="index === activeIndex ? 'bg-gray-100 dark:bg-gray-700' : ''"
            @click="goToPokemonPage(pokemon.pokemon_id)"
          >
            <!-- El sprite y, al lado, dos líneas: el nombre, que es lo que se busca, y debajo el número con las marcas. -->
            <base-sprite :src="spriteUrl(pokemon.pokemon_id)" class="w-9 h-9 shrink-0" />
            <span class="flex-1 min-w-0 flex flex-col leading-tight">
              <span class="truncate">{{ pokemon.name }}</span>
              <span class="flex items-center gap-2">
                <span class="text-mini tabular-nums text-gray-600 dark:text-gray-300"
                  >#{{ formatDex(pokemon.pokemon_id) }}</span
                >
                <span class="flex items-center gap-1.5">
                  <shiny-mark
                    v-if="pokemon.is_shiny_released"
                    variant="dex"
                    size="text-mini"
                    inline
                    :scale="0.65"
                    :label="$t('legend.shiny')"
                  />
                  <max-mark
                    v-if="pokemon.can_dynamax"
                    variant="dynamax"
                    :size="14"
                    class="shrink-0"
                  />
                  <max-mark
                    v-if="pokemon.can_gigantamax"
                    variant="gigantamax"
                    :size="14"
                    class="shrink-0"
                  />
                </span>
              </span>
            </span>
            <span
              v-if="datosClave(pokemon.pokemon_id)"
              class="shrink-0 flex flex-col items-end leading-tight tabular-nums"
            >
              <span
                class="flex items-center gap-1 text-sm font-semibold"
                :title="`${$t('pokemon.cp100')}: ${datosClave(pokemon.pokemon_id).pc} · ${$t(
                  'pokemon.cpWeather'
                )}: ${datosClave(pokemon.pokemon_id).clima}`"
              >
                {{ datosClave(pokemon.pokemon_id).pc }}
                <span class="flex items-center gap-0.5 font-normal text-gray-600 dark:text-gray-300"
                  >/ {{ datosClave(pokemon.pokemon_id).clima }}
                  <icono-mascara
                    :src="iconoClima"
                    class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
                /></span>
              </span>
              <span
                v-if="datosClave(pokemon.pokemon_id).puesto"
                class="text-mini text-gray-600 dark:text-gray-300"
                >{{ $t(`types.${datosClave(pokemon.pokemon_id).puesto.tipo}`) }} #{{
                  datosClave(pokemon.pokemon_id).puesto.rank
                }}</span
              >
            </span>
          </li>
        </ul>
      </div>
    </section>
  </section>
</template>

<style scoped>
/* Plegado mide lo mismo que los botones de modo oscuro y menú. Va encima del
   de modo oscuro (HeaderComponent) y al abrirse lo tapa. */
.buscador {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
  width: 50px;
  /*
   * Al plegarse, la caja sigue a la vista mientras encoge y se funde al final
   * (retraso de 0,2 s), ya del tamaño de la lupa. Antes borde y sombra se
   * iban de golpe y el fondo a la vez que empezaba a encoger: parecía que se
   * desvanecía en vez de recogerse como se abre.
   */
  transition: width 0.25s ease, left 0.25s ease, background-color 0.1s ease 0.2s,
    border-color 0.1s ease 0.2s, box-shadow 0.1s ease 0.2s, color 0.15s;
}
.buscador-abierto {
  /* Al abrir, la caja aparece ya y luego crece. */
  transition: width 0.25s ease, left 0.25s ease, background-color 0s, border-color 0s, box-shadow 0s,
    color 0.15s;
  width: 100%;
  /* En escritorio llenaba el hueco entero hasta el menú: un campo de más
       de 1000 px para escribir un nombre. */
  max-width: 32rem;
}
.buscador input {
  transition: opacity 0.2s ease;
}
.buscador:not(.buscador-abierto) input {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .buscador,
  .buscador input {
    transition: none;
  }
}
[placeholder]:focus::-webkit-input-placeholder {
  transition: text-indent 0.4s 0.4s ease;
  text-indent: -100%;
  opacity: 1;
}
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: v-bind(scrollbarBackground);
}

::-webkit-scrollbar-thumb {
  border: 1px solid #33333350;
  background: #cccccc80;
  border-radius: 20px;
}
</style>
