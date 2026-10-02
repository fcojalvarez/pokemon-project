<script setup>
import { onMounted, ref, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '../lib/supabaseClient';
import PokemonExtraInfo from './pokemon/PokemonExtraInfo.vue';
import EvolutionChain from './pokemon/EvolutionChain.vue';
import ShinyMark from './pokemon/ShinyMark.vue';
import { useGameDataStore } from '../stores/gameData';
import { useLiveStore } from '../stores/live';
import BaseCard from './base/BaseCard.vue';
import TypeIcons from './base/TypeIcons.vue';
import { spriteUrl } from '../utils/sprites';
import { formatDex } from '../utils/dex';
import BaseSprite from './base/BaseSprite.vue';
import SkeletonLoader from './base/SkeletonLoader.vue';
import { localName } from '../composables/useTranslate';
import NotFoundView from '../views/NotFoundView.vue';
import FormasGaleria from './pokemon/FormasGaleria.vue';
import MaxMark from './pokemon/MaxMark.vue';

const pokemon = ref(null);
// La consulta acabó y no hay ningún Pokémon con ese número (/pokemon/99999):
// sin esto se quedaba el esqueleto cargando para siempre.
const noExiste = ref(false);
const route = useRoute();
const isShowShiny = ref(false);
const gameData = useGameDataStore();
const live = useLiveStore();

// ?form=charizard_mega_y muestra esa forma concreta en vez del Pokémon base,
// sin necesidad de una ruta aparte.
const formId = computed(() => route.query.form || null);
const form = computed(() => formId.value ? gameData.byId.get(formId.value) || null : null);

/**
 * Lo que va en la cabecera: el Pokémon que se está viendo, o la forma si la
 * URL pide una (megas y supermegas tienen su propia pantalla).
 */
const hero = computed(() => {
    const p = pokemon.value;
    if(!p) return null;
    const f = form.value;
    return {
        number: formatDex(p.pokemon_id),
        // El `name` de la tabla `pokemons` es el inglés, que para las especies
        // coincide con el español; las formas sí cambian («Mega Venusaur»).
        name: f ? localName(f) : p.name,
        types: f?.types || p.types || [],
        image: f
            ? spriteUrl(f.spriteId, { shiny: isShowShiny.value })
            : (isShowShiny.value ? p.sprites?.male_shiny : p.sprites?.male)
    };
});

/**
 * Las formas regionales de la especie (Muk y Muk de Alola, los tres Tauros de
 * Paldea…), para cambiar entre ellas desde la cabecera. Cada una tiene su
 * ficha (?form=muk_alolan) con sus tipos, ataques y puestos, pero no había
 * cómo llegar: solo se veía su dibujo en la galería de formas. Sin formas
 * regionales, no sale nada.
 */
const formasRegionales = computed(() => {
    const p = pokemon.value;
    if(!p || !gameData.isReady) return [];
    const base = gameData.fichaBase(p.pokemon_id, p.name);
    const regionales = (gameData.formsByDex.get(p.pokemon_id) ?? [])
        .filter((entry) => entry.regional && !entry.shadow && !entry.mega);
    if(!base || !regionales.length) return [];
    const actual = formId.value ?? base.id;
    return [base, ...regionales].map((entry) => ({
        id: entry.id,
        entry,
        to: entry.id === base.id ? `/pokemon/${p.pokemon_id}` : `/pokemon/${p.pokemon_id}?form=${entry.id}`,
        activa: entry.id === actual
    }));
});

/**
 * Legendario, singular o ultraente: lo marca el propio juego, y cambia mucho
 * cómo se consigue (casi siempre en incursiones de nivel 5 o misiones).
 */
const categoria = computed(() => {
    const p = pokemon.value;
    if(!p) return null;
    const entrada = form.value || gameData.baseByDex(p.pokemon_id);
    if(entrada?.mythical) return 'mythical';
    if(entrada?.ultraBeast) return 'ultraBeast';
    if(entrada?.legendary) return 'legendary';
    return null;
});

/**
 * Las marcas Max que tiene liberadas, para la línea «Liberado:» de la
 * cabecera: la sección Combates Max está abajo y plegada, y es de lo primero
 * que se mira. Sale de la misma forma que esa sección (la de la URL o
 * `fichaBase`): el Gigamax va por forma.
 */
const maxLiberado = computed(() => {
    const p = pokemon.value;
    if(!p || !gameData.isReady) return [];
    const info = gameData.maxInfoFor(form.value || gameData.fichaBase(p.pokemon_id, p.name));
    if(!info) return [];
    return info.gigantamax ? ['dynamax', 'gigantamax'] : ['dynamax'];
});
const MAX_TEXTO = { dynamax: 'max.legendDynamax', gigantamax: 'max.legendGigantamax' };

// El título de la pestaña lo pone el router para las páginas fijas; aquí
// depende de qué Pokémon se cargue.
watch(() => hero.value?.name, (name) => {
    if(name) document.title = `${name} · PoGoDex`;
}, { immediate: true });

/**
 * `pokemon_id` es smallint: un número fuera de rango (22003) o que no es
 * número (22P02) tampoco existe, aunque la base lo diga como error.
 */
const NO_EXISTE = ['22003', '22P02'];

const getPokemon = async(pokemonId) => {
    const { data, error } = await supabase.from('pokemons').select('*').eq('pokemon_id', pokemonId).limit(1);

    const noHay = !error || NO_EXISTE.includes(error.code);
    if(!noHay) console.error(error);

    const [ pokemonFinded ] = data || [];
    if(pokemonFinded) pokemon.value = {...pokemonFinded};
    else if(noHay) { pokemon.value = null; noExiste.value = true; }
}

onMounted(() => {
    // Los rankings, la tabla de tipos y los datos en vivo se cargan una sola
    // vez por sesión: las stores ignoran las llamadas repetidas.
    gameData.load();
    live.load();
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
watch(() => route.params.id, async(id) => {
    const pokemonId = Number(id);
    noExiste.value = false;
    if(!pokemonId) {
        pokemon.value = null;
        noExiste.value = true;
        return;
    }
    if(pokemon.value?.pokemon_id !== pokemonId) await getPokemon(pokemonId);
}, { immediate: true })
</script>

<template>
    <!--
        La ficha son tarjetas sueltas sobre el fondo, sin una tarjeta grande que
        las envuelva: cabecera, cadena evolutiva y las secciones de datos. Desde
        md las secciones van en dos columnas (ver <pokemon-extra-info>).
    -->
    <div v-if="pokemon" class="flex flex-col gap-3 lg:gap-4">
        <!--
            Desde lg, una sola fila: el Pokémon a la izquierda y la leyenda y los
            botones a la derecha. En dos filas, la tarjeta ocupaba el ancho entero
            con casi nada dentro.
        -->
        <base-card class="!pb-3 lg:!py-4 lg:!px-6 lg:flex lg:items-center lg:gap-6">
            <!--
                Cabecera con el nombre: antes la ficha empezaba por la cadena
                evolutiva y el Pokémon actual solo se distinguía por un fondo gris.
            -->
            <header class="flex items-center gap-4 pb-3 border-b border-gray-300 dark:border-gray-700 lg:flex-1 lg:min-w-0 lg:pb-0 lg:border-b-0">
                <base-sprite
                    :src="hero.image"
                    :lazy="false"
                    class="w-20 h-20 lg:w-28 lg:h-28 shrink-0"
                    img-class="drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark"
                />
                <div class="min-w-0">
                    <span class="block text-xs text-gray-600 dark:text-gray-300">#{{ hero.number }}</span>
                    <h1 class="text-2xl lg:text-3xl font-bold leading-tight text-gray-900 dark:text-gray-100">{{ hero.name }}</h1>
                    <type-icons :types="hero.types" size="14" with-label class="mt-1.5 flex-wrap text-gray-800 dark:text-gray-200" />
                    <span
                        v-if="categoria"
                        class="inline-block mt-2 px-2 py-0.5 text-mini uppercase tracking-wider rounded-full border border-amber-500 text-amber-700 dark:text-amber-400"
                    >{{ $t(`pokemon.category.${categoria}`) }}</span>
                    <!--
                        Una píldora por forma regional, con su sprite y su
                        nombre; la que se ve, rellena. replace: cambiar de forma
                        no apila entradas, y «atrás» sale de la ficha.
                    -->
                    <nav v-if="formasRegionales.length" :aria-label="$t('pokemon.regionalForms')" class="mt-2.5 flex flex-wrap gap-1.5">
                        <router-link
                            v-for="forma in formasRegionales"
                            :key="forma.id"
                            :to="forma.to"
                            replace
                            :aria-current="forma.activa ? 'page' : undefined"
                            class="flex items-center gap-1 pl-1 pr-2.5 py-0.5 rounded-full border text-xs transition-colors"
                            :class="forma.activa
                                ? 'border-gray-700 dark:border-gray-200 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold'
                                : 'border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800'"
                        >
                            <base-sprite :src="spriteUrl(forma.entry.spriteId)" :lazy="false" class="w-6 h-6 shrink-0" />
                            {{ localName(forma.entry) }}
                        </router-link>
                    </nav>
                </div>
            </header>

            <!--
                En móvil, la leyenda a la izquierda y los botones a la derecha,
                misma línea. Desde lg, la leyenda encima de los botones: al lado
                ocupaba tanto que se montaba sobre el nombre del Pokémon.
            -->
            <div class="mt-3 lg:mt-0 lg:shrink-0 flex flex-wrap items-center justify-between gap-3 lg:flex-col lg:items-end lg:gap-2">
                <!--
                    «Liberado: ✦ Shiny, ✕ Dinamax, ✕ Gigamax», cada uno con la
                    misma marca que lleva en la cadena y en la rejilla, así que
                    además sirve de leyenda de la estrella de la cadena.
                -->
                <p
                    v-if="pokemon.is_shiny_released || maxLiberado.length"
                    class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-mini text-gray-600 dark:text-gray-300"
                >
                    <span>{{ $t('pokemon.released') }}:</span>
                    <span v-if="pokemon.is_shiny_released" class="flex items-center gap-1">
                        <shiny-mark variant="evolution" size="text-mini" inline :scale="0.65" />
                        {{ $t('pokemon.releasedShiny') }}<template v-if="maxLiberado.length">,</template>
                    </span>
                    <!--
                        Solo texto, como el shiny: Dinamax y Gigamax llevaban a
                        Combates Max y el shiny a ningún sitio, y la línea se
                        leía rara.
                    -->
                    <span v-for="(marca, i) in maxLiberado" :key="marca" class="flex items-center gap-1">
                        <max-mark :variant="marca" :size="15" class="shrink-0" aria-hidden="true" />
                        {{ $t(MAX_TEXTO[marca]) }}<template v-if="i < maxLiberado.length - 1">,</template>
                    </span>
                </p>
                <!-- Los botones a su ancho, a la derecha, y bajan de línea si no caben
                     junto a la leyenda: antes «Ver shiny» se salía de la tarjeta. -->
                <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
                <formas-galeria :dex="pokemon.pokemon_id" :name="hero.name" :sin-regionales="formasRegionales.length > 0" />

                <!--
                    Es un interruptor, así que es un <button> con aria-pressed.
                    Activado va en gris-700 sobre blanco (10,3:1); en gris-500 se
                    quedaba en 4,39:1 y el texto no se leía bien en modo claro.
                    Mismo alto y letra que «Formas»: al lado, distintos, parecía
                    que uno mandaba sobre el otro.
                -->
                <button
                    type="button"
                    :aria-pressed="isShowShiny"
                    @click="isShowShiny = !isShowShiny"
                    :class="[
                        isShowShiny
                            ? 'bg-gray-700 dark:bg-gray-600 text-white border-gray-700 dark:border-gray-600'
                            : 'text-gray-800 dark:text-gray-200 border-gray-400 dark:border-gray-600',
                        'shrink-0 border rounded-xl h-[34px] px-3 text-xs text-center cursor-pointer transition-colors'
                    ]"
                >
                    {{ $t('viewShiny') }}
                </button>
                </div>
            </div>
        </base-card>

        <!-- Cadena evolutiva: en línea desde lg; en móvil, lo que sale de varias formas baja -->
        <base-card class="!px-2 !pb-4 lg:!px-6 lg:!pb-6">
            <h2 class="px-2 lg:px-0 text-sm font-bold text-gray-800 dark:text-gray-200">{{ $t('pokemon.evolutionLine') }}</h2>
            <div class="mt-4">
                <evolution-chain :pokemon="pokemon" :form-id="formId" :shiny="isShowShiny" />
            </div>
        </base-card>

        <pokemon-extra-info :pokemon="pokemon" :form-id="formId" />
    </div>

    <not-found-view v-else-if="noExiste" />

    <!-- Mientras llega el Pokémon: las mismas tarjetas, con su forma. -->
    <skeleton-loader v-else class="flex flex-col gap-3 lg:gap-4">
        <base-card>
            <div class="flex items-center gap-4 pb-3 border-b border-gray-300 dark:border-gray-700">
                <span class="w-20 h-20 shrink-0 flex items-center justify-center"><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span></span>
                <span class="flex flex-col gap-2">
                    <span class="esqueleto h-3 w-10 rounded-full"></span>
                    <span class="esqueleto h-6 w-40 rounded-full"></span>
                    <span class="flex gap-2">
                        <span class="esqueleto h-3.5 w-16 rounded-full"></span>
                        <span class="esqueleto h-3.5 w-16 rounded-full"></span>
                    </span>
                </span>
            </div>
            <div class="mt-3 flex items-center justify-between">
                <span class="esqueleto h-3.5 w-28 rounded-full"></span>
                <span class="esqueleto h-8 w-28 rounded-xl"></span>
            </div>
        </base-card>
        <base-card>
            <div class="flex items-center justify-center gap-4 py-2">
                <template v-for="n in 3" :key="n">
                    <span v-if="n > 1" class="esqueleto h-0.5 w-8 rounded-full"></span>
                    <span class="flex flex-col items-center gap-2">
                        <span class="w-16 h-16 lg:w-24 lg:h-24 flex items-center justify-center"><span class="esqueleto block w-[76%] h-[76%] rounded-full"></span></span>
                        <span class="esqueleto h-3 w-16 rounded-full"></span>
                    </span>
                </template>
            </div>
        </base-card>
        <base-card v-for="n in 4" :key="`s${n}`" as="div" padding="px-4 py-3.5" class="flex items-center gap-3">
            <span class="flex-1 flex flex-col gap-1.5">
                <span class="esqueleto h-3.5 w-32 rounded-full"></span>
                <span class="esqueleto h-3 w-48 rounded-full"></span>
            </span>
            <span class="esqueleto w-5 h-5 rounded-full"></span>
        </base-card>
    </skeleton-loader>
</template>
