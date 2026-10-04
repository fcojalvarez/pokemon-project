<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabaseClient'
import PokemonExtraInfo from './pokemon/PokemonExtraInfo.vue'
import EvolutionChain from './pokemon/EvolutionChain.vue'
import ShinyMark from './pokemon/ShinyMark.vue'
import { useGameDataStore } from '../stores/gameData'
import { useLiveStore } from '../stores/live'
import BaseCard from './base/BaseCard.vue'
import TypeIcons from './base/TypeIcons.vue'
import { spriteUrl } from '../utils/sprites'
import { formatDex } from '../utils/dex'
import BaseSprite from './base/BaseSprite.vue'
import BasePillButton from './base/BasePillButton.vue'
import { typesSVG } from '../utils/Settings'
import { calcCP } from '../utils/formulas'
import IconoMascara from './base/IconoMascara.vue'
import iconoClima from '../assets/weather/partly_cloudy.png'
import SkeletonLoader from './base/SkeletonLoader.vue'
import { localName } from '../composables/useTranslate'
import NotFoundView from '../views/NotFoundView.vue'
import FormasGaleria from './pokemon/FormasGaleria.vue'
import MaxMark from './pokemon/MaxMark.vue'
import MarkLegend from './pokemon/MarkLegend.vue'

const pokemon = ref(null)
// La consulta acabó y no hay ningún Pokémon con ese número (/pokemon/99999):
// sin esto se quedaba el esqueleto cargando para siempre.
const noExiste = ref(false)
const route = useRoute()
const isShowShiny = ref(false)
const gameData = useGameDataStore()

/**
 * La ficha sale cuando están el Pokémon y los datos de juego. Antes salía con
 * el Pokémon solo, y al llegar los datos de juego aparecían las megas en la
 * línea evolutiva y «Dinamax, Gigamax» en la cabecera: todo bajaba de golpe.
 * Si los datos de juego fallan, sale igual con lo que haya.
 */
const datosListos = computed(() => gameData.isReady || gameData.status === 'error')
const live = useLiveStore()

// ?form=charizard_mega_y muestra esa forma concreta en vez del Pokémon base,
// sin necesidad de una ruta aparte.
const formId = computed(() => route.query.form || null)
const form = computed(() => (formId.value ? gameData.byId.get(formId.value) || null : null))

/**
 * Lo que va en la cabecera: el Pokémon que se está viendo, o la forma si la
 * URL pide una (megas y supermegas tienen su propia pantalla).
 */
const hero = computed(() => {
  const p = pokemon.value
  if (!p) return null
  const f = form.value
  return {
    number: formatDex(p.pokemon_id),
    // El `name` de la tabla `pokemons` es el inglés, que para las especies
    // coincide con el español; las formas sí cambian («Mega Venusaur»).
    name: f ? localName(f) : p.name,
    types: f?.types || p.types || [],
    image: f
      ? spriteUrl(f.spriteId, { shiny: isShowShiny.value })
      : isShowShiny.value
      ? p.sprites?.male_shiny
      : p.sprites?.male
  }
})

/**
 * El PC al 100 % en la cabecera, que es lo que más se mira de un Pokémon: el
 * de incursión y huevo (nivel 20) y con clima (25). Antes había que bajar a
 * «PC 100 %» y abrirla. Las megas no: lo que se atrapa en su incursión es la
 * forma base, que ya tiene su ficha.
 */
const IV_PERFECTOS = { atk: 15, def: 15, hp: 15 }
const pc100 = computed(() => {
  const p = pokemon.value
  if (!p || !gameData.isReady) return null
  const entrada = form.value || gameData.fichaBase(p.pokemon_id, p.name)
  if (!entrada?.stats || entrada.mega) return null
  return {
    normal: calcCP(entrada.stats, IV_PERFECTOS, 20),
    clima: calcCP(entrada.stats, IV_PERFECTOS, 25)
  }
})

/**
 * Luz de sus tipos detrás de la cabecera: el primero desde la esquina del
 * sprite y el segundo, si lo hay, desde la opuesta. Va como imagen de fondo,
 * así que el blanco o el gray-900 de la tarjeta siguen debajo.
 */
const heroLuz = computed(() => {
  const [uno, dos] = (hero.value?.types || [])
    .filter((t) => typesSVG[t])
    .map((t) => typesSVG[t].color)
  if (!uno) return undefined
  const capas = [`radial-gradient(120% 140% at 0% 0%, ${uno}40, transparent 55%)`]
  if (dos) capas.push(`radial-gradient(90% 120% at 100% 100%, ${dos}33, transparent 60%)`)
  return { backgroundImage: capas.join(', ') }
})

/**
 * Las formas regionales de la especie (Muk y Muk de Alola, los tres Tauros de
 * Paldea…), para cambiar entre ellas desde la cabecera. Cada una tiene su
 * ficha (?form=muk_alolan) con sus tipos, ataques y puestos, pero no había
 * cómo llegar: solo se veía su dibujo en la galería de formas. Sin formas
 * regionales, no sale nada.
 */
const formasRegionales = computed(() => {
  const p = pokemon.value
  if (!p || !gameData.isReady) return []
  const base = gameData.fichaBase(p.pokemon_id, p.name)
  const regionales = (gameData.formsByDex.get(p.pokemon_id) ?? []).filter(
    (entry) => entry.regional && !entry.shadow && !entry.mega
  )
  if (!base || !regionales.length) return []
  const actual = formId.value ?? base.id
  return [base, ...regionales].map((entry) => ({
    id: entry.id,
    entry,
    to:
      entry.id === base.id
        ? `/pokemon/${p.pokemon_id}`
        : `/pokemon/${p.pokemon_id}?form=${entry.id}`,
    activa: entry.id === actual
  }))
})

/**
 * Legendario, singular o ultraente: lo marca el propio juego, y cambia mucho
 * cómo se consigue (casi siempre en incursiones de nivel 5 o misiones).
 */
const categoria = computed(() => {
  const p = pokemon.value
  if (!p) return null
  const entrada = form.value || gameData.baseByDex(p.pokemon_id)
  if (entrada?.mythical) return 'mythical'
  if (entrada?.ultraBeast) return 'ultraBeast'
  if (entrada?.legendary) return 'legendary'
  return null
})

/**
 * Las marcas Max que tiene liberadas, sobre el sprite de la cabecera como en
 * su tarjeta de la Pokédex: la sección Combates Max está abajo y plegada, y
 * es de lo primero que se mira. Sale de la misma forma que esa sección (la de
 * la URL o `fichaBase`): el Gigamax va por forma.
 */
const maxLiberado = computed(() => {
  const p = pokemon.value
  if (!p || !gameData.isReady) return []
  const info = gameData.maxInfoFor(form.value || gameData.fichaBase(p.pokemon_id, p.name))
  if (!info) return []
  return info.gigantamax ? ['dynamax', 'gigantamax'] : ['dynamax']
})

/**
 * La especie de la línea evolutiva que megaevoluciona (su coste lleva la
 * piedra de megaenergía, o la gema primigenia en Kyogre y Groudon), o null.
 */
const dexEnergia = computed(() => {
  const p = pokemon.value
  if (!p || !gameData.isReady) return null
  const ids = new Set(
    [...JSON.stringify(p.evolution_info ?? {}).matchAll(/"pokemon_id":(\d+)/g)].map((m) =>
      Number(m[1])
    )
  )
  ids.add(p.pokemon_id)
  return (
    [...ids].find((dex) =>
      (gameData.formsByDex.get(dex) ?? []).some((f) => f.mega && f.released)
    ) ?? null
  )
})

/** Las marcas de la leyenda del pie: las de siempre y, si hay megas, su energía. */
const ENERGIA_PRIMIGENIA = [382, 383]
const marcasLeyenda = computed(() => {
  const marcas = ['shiny', 'dynamax', 'gigantamax', 'noLiberado']
  if (!dexEnergia.value) return marcas
  return [...marcas, ENERGIA_PRIMIGENIA.includes(dexEnergia.value) ? 'primalEnergy' : 'megaEnergy']
})

// El título de la pestaña lo pone el router para las páginas fijas; aquí
// depende de qué Pokémon se cargue.
watch(
  () => hero.value?.name,
  (name) => {
    if (name) document.title = `${name} · PoGoDex`
  },
  { immediate: true }
)

/**
 * `pokemon_id` es smallint: un número fuera de rango (22003) o que no es
 * número (22P02) tampoco existe, aunque la base lo diga como error.
 */
const NO_EXISTE = ['22003', '22P02']

const getPokemon = async (pokemonId) => {
  const { data, error } = await supabase
    .from('pokemons')
    .select('*')
    .eq('pokemon_id', pokemonId)
    .limit(1)

  const noHay = !error || NO_EXISTE.includes(error.code)
  if (!noHay) console.error(error)

  const [pokemonFinded] = data || []
  if (pokemonFinded) pokemon.value = { ...pokemonFinded }
  else if (noHay) {
    pokemon.value = null
    noExiste.value = true
  }
}

onMounted(() => {
  // Los rankings, la tabla de tipos y los datos en vivo se cargan una sola
  // vez por sesión: las stores ignoran las llamadas repetidas.
  gameData.load()
  live.load()
})

/**
 * El Pokémon de la URL, al entrar y al cambiar de ficha sin salir (desde la
 * cadena evolutiva o el buscador). Antes eran dos caminos, y al cambiar a una
 * dirección que no es un número (/pokemon/abc) se quedaba el Pokémon anterior.
 *
 * El scroll arriba lo hace el router (scrollBehavior). Aquí había un scrollTo
 * suave que, si se volvía atrás antes de que acabara, seguía subiendo y pisaba
 * el scroll recuperado de la página anterior.
 */
watch(
  () => route.params.id,
  async (id) => {
    const pokemonId = Number(id)
    noExiste.value = false
    if (!pokemonId) {
      pokemon.value = null
      noExiste.value = true
      return
    }
    if (pokemon.value?.pokemon_id !== pokemonId) await getPokemon(pokemonId)
  },
  { immediate: true }
)
</script>

<template>
  <!--
        La ficha son tarjetas sueltas sobre el fondo, sin una tarjeta grande que
        las envuelva: cabecera, cadena evolutiva y las secciones de datos. Desde
        md las secciones van en dos columnas (ver <pokemon-extra-info>).
    -->
  <div v-if="pokemon && datosListos" class="flex flex-col gap-3 lg:gap-4">
    <!--
            Desde lg, una sola fila: el Pokémon a la izquierda y la leyenda y los
            botones a la derecha. En dos filas, la tarjeta ocupaba el ancho entero
            con casi nada dentro.
        -->
    <base-card class="!pb-3 lg:!py-4 lg:!px-6 lg:flex lg:items-center lg:gap-6" :style="heroLuz">
      <!--
                Cabecera con el nombre: antes la ficha empezaba por la cadena
                evolutiva y el Pokémon actual solo se distinguía por un fondo gris.
            -->
      <header
        class="flex items-center gap-4 pb-3 border-b border-gray-300 dark:border-gray-700 lg:flex-1 lg:min-w-0 lg:pb-0 lg:border-b-0"
      >
        <!--
          Con las mismas marcas que su tarjeta de la Pokédex (shiny arriba a la
          derecha, Dinamax y Gigamax abajo), que explica la leyenda del final.
          Antes lo decía una línea «Liberado: …» que repetía esa leyenda.
        -->
        <span class="relative w-24 h-24 lg:w-32 lg:h-32 shrink-0">
          <base-sprite
            :src="hero.image"
            :lazy="false"
            class="w-full h-full"
            img-class="drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark"
          />
          <shiny-mark
            v-if="pokemon.is_shiny_released"
            variant="dex"
            :label="$t('pokemon.shinyLegend')"
            class="absolute top-0 right-0 z-10 scale-[0.8] origin-top-right"
          />
          <max-mark
            v-for="(marca, i) in maxLiberado"
            :key="marca"
            :variant="marca"
            :size="18"
            :class="i === 0 ? 'left-0' : 'right-0'"
            class="absolute bottom-0 z-10 text-gray-800 dark:text-gray-200"
          />
        </span>
        <div class="min-w-0">
          <span class="block text-xs text-gray-600 dark:text-gray-300">#{{ hero.number }}</span>
          <h1 class="text-2xl lg:text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">
            {{ hero.name }}
          </h1>
          <type-icons
            :types="hero.types"
            size="14"
            with-label
            class="mt-1.5 flex-wrap text-gray-800 dark:text-gray-200"
          />
          <p v-if="pc100" class="mt-2 flex flex-wrap gap-1.5 text-xs tabular-nums">
            <span
              class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100"
              :title="$t('pokemon.cp100')"
            >
              <span class="font-normal text-gray-600 dark:text-gray-300">100 %</span>
              {{ pc100.normal }}
              <span class="text-[0.8em] font-normal text-gray-600 dark:text-gray-300">{{
                $t('raids.cpRange')
              }}</span>
            </span>
            <span
              class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100"
              :title="`${$t('pokemon.cp100')} · ${$t('pokemon.cpWeather')}`"
            >
              <icono-mascara :src="iconoClima" class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span class="sr-only">{{ $t('pokemon.cpWeather') }}:</span>
              {{ pc100.clima }}
              <span class="text-[0.8em] font-normal text-gray-600 dark:text-gray-300">{{
                $t('raids.cpRange')
              }}</span>
            </span>
          </p>
          <span v-if="categoria" class="insignia insignia-ambar mt-2">{{
            $t(`pokemon.category.${categoria}`)
          }}</span>
          <!--
                        Una píldora por forma regional, con su sprite y su
                        nombre; la que se ve, rellena. replace: cambiar de forma
                        no apila entradas, y «atrás» sale de la ficha.
                    -->
          <nav
            v-if="formasRegionales.length"
            :aria-label="$t('pokemon.regionalForms')"
            class="mt-2.5 flex flex-wrap gap-1.5"
          >
            <router-link
              v-for="forma in formasRegionales"
              :key="forma.id"
              :to="forma.to"
              replace
              :aria-current="forma.activa ? 'page' : undefined"
              class="flex items-center gap-1 pl-1 pr-2.5 py-0.5 rounded-full border text-xs transition-colors"
              :class="
                forma.activa
                  ? 'border-gray-700 dark:border-gray-200 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold'
                  : 'border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800'
              "
            >
              <base-sprite
                :src="spriteUrl(forma.entry.spriteId)"
                :lazy="false"
                class="w-6 h-6 shrink-0"
              />
              {{ localName(forma.entry) }}
            </router-link>
          </nav>
        </div>
      </header>

      <!-- Los botones, a la derecha; desde lg, en la misma fila que el Pokémon. -->
      <div
        class="mt-3 lg:mt-0 lg:shrink-0 flex flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end lg:gap-2"
      >
        <!-- Los botones a su ancho, a la derecha, y bajan de línea si no caben
                     junto a la leyenda: antes «Ver shiny» se salía de la tarjeta. -->
        <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
          <formas-galeria
            :dex="pokemon.pokemon_id"
            :name="hero.name"
            :sin-regionales="formasRegionales.length > 0"
          />

          <!--
                    Es un interruptor: la casilla de los filtros, con su ✓ al
                    encenderlo, para que se vea si está puesto sin adivinarlo
                    por el relleno. Mismo alto que «Formas»: al lado, distintos,
                    parecía que uno mandaba sobre el otro.
                -->
          <base-pill-button
            casilla
            class="shrink-0"
            :active="isShowShiny"
            @click="isShowShiny = !isShowShiny"
          >
            {{ $t('viewShiny') }}
          </base-pill-button>
        </div>
      </div>
    </base-card>

    <!-- Cadena evolutiva: en línea desde lg; en móvil, lo que sale de varias formas baja -->
    <base-card class="!px-2 !pb-4 lg:!px-6 lg:!pb-6">
      <h2 class="px-2 lg:px-0 text-sm font-bold text-gray-800 dark:text-gray-200">
        {{ $t('pokemon.evolutionLine') }}
      </h2>
      <div class="mt-4">
        <evolution-chain :pokemon="pokemon" :form-id="formId" :shiny="isShowShiny" />
      </div>
    </base-card>

    <pokemon-extra-info :pokemon="pokemon" :form-id="formId" />

    <!-- La misma leyenda que la Pokédex, abierta y al final: explica las marcas del sprite y de la línea evolutiva. -->
    <mark-legend en-fila :marcas="marcasLeyenda" :dex-energia="dexEnergia" class="mt-3" />
  </div>

  <not-found-view v-else-if="noExiste" />

  <!--
    Mientras llega el Pokémon: las mismas tarjetas, con las mismas cajas y
    medidas que la ficha de verdad (cabecera, línea evolutiva y secciones),
    para que al llegar no se mueva nada. En móvil y tablet las secciones van
    plegadas, con su título y el resumen; desde lg, abiertas y a dos columnas,
    con «Ordenar secciones» encima.
  -->
  <skeleton-loader v-else class="flex flex-col gap-3 lg:gap-4">
    <base-card class="!pb-3 lg:!py-4 lg:!px-6 lg:flex lg:items-center lg:gap-6">
      <div
        class="flex items-center gap-4 pb-3 border-b border-gray-300 dark:border-gray-700 lg:flex-1 lg:pb-0 lg:border-b-0"
      >
        <span class="w-24 h-24 lg:w-32 lg:h-32 shrink-0 flex items-center justify-center"
          ><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span
        ></span>
        <span class="flex flex-col">
          <span class="esqueleto h-3 w-10 rounded-full"></span>
          <span class="esqueleto mt-1.5 h-7 lg:h-8 w-44 rounded-full"></span>
          <span class="mt-2 flex gap-2">
            <span class="esqueleto h-4 w-16 rounded-full"></span>
            <span class="esqueleto h-4 w-16 rounded-full"></span>
          </span>
        </span>
      </div>
      <!-- «Liberado: …» y, debajo a la derecha, «Formas» y «Ver shiny». -->
      <div
        class="mt-3 lg:mt-0 lg:shrink-0 flex flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end lg:gap-2"
      >
        <span class="esqueleto h-3.5 w-64 max-w-full rounded-full"></span>
        <span class="ml-auto flex gap-2">
          <span class="esqueleto h-9 w-24 rounded-xl"></span>
          <span class="esqueleto h-9 w-[5.5rem] rounded-xl"></span>
        </span>
      </div>
    </base-card>

    <base-card class="!px-2 !pb-4 lg:!px-6 lg:!pb-6">
      <span class="esqueleto block mx-2 lg:mx-0 h-4 w-32 rounded-full"></span>
      <div class="mt-4 flex items-center justify-center gap-2 min-[420px]:gap-4">
        <template v-for="n in 3" :key="n">
          <span v-if="n > 1" class="esqueleto h-0.5 w-8 rounded-full"></span>
          <span class="flex flex-col items-center gap-1.5 p-1 min-[420px]:p-2">
            <span class="w-16 h-16 lg:w-24 lg:h-24 flex items-center justify-center"
              ><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span
            ></span>
            <span class="esqueleto h-3 w-8 rounded-full"></span>
            <span class="esqueleto h-3 w-20 rounded-full"></span>
            <span class="esqueleto h-3.5 w-3.5 rounded-full"></span>
          </span>
        </template>
      </div>
    </base-card>

    <div class="flex flex-col">
      <span class="hidden lg:flex justify-end mb-2"
        ><span class="esqueleto h-[26px] w-36 rounded-xl"></span
      ></span>
      <div class="flex flex-col gap-3 md:block md:columns-2 lg:gap-4">
        <div v-for="n in 6" :key="`s${n}`" class="min-w-0 md:break-inside-avoid md:mb-3">
          <base-card padding="" as="div">
            <!-- Plegada (móvil y tablet): el título, el resumen y la flecha. -->
            <span class="lg:hidden flex items-center gap-3 px-4 py-3.5">
              <span class="flex-1 flex flex-col gap-1.5">
                <span class="esqueleto h-4 w-36 rounded-full"></span>
                <span class="esqueleto h-3 w-full max-w-[16rem] rounded-full"></span>
                <span class="esqueleto h-3 w-2/3 max-w-[11rem] rounded-full"></span>
              </span>
              <span class="esqueleto w-5 h-5 rounded-full"></span>
            </span>
            <!-- Abierta (escritorio): el título y unas filas de contenido. -->
            <span class="hidden lg:flex flex-col gap-2 p-4">
              <span class="esqueleto h-4 w-36 rounded-full"></span>
              <span
                v-for="fila in n % 2 ? 4 : 3"
                :key="fila"
                class="esqueleto h-8 w-full rounded-xl"
              ></span>
            </span>
          </base-card>
        </div>
      </div>
    </div>
  </skeleton-loader>
</template>
