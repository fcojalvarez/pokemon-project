<template>
    <!--
        Rejilla de tres columnas con la del medio ajustada al contenido: así el
        Pokémon queda siempre centrado, lleve requisitos a la derecha o no.
    -->
    <section class="my-4 w-full cursor-pointer grid grid-cols-[1fr_auto_1fr] items-start" @click="goToPokemonPage(pokemon.pokemon_id)" >
        <div></div>

        <section class="min-w-0">
            <!-- El bloque entero se resalta cuando es el que se está viendo. -->
            <div
                class="mx-auto w-fit max-w-full px-3 py-2 rounded-2xl transition-colors"
                :class="isActive ? 'bg-gray-200 dark:bg-gray-700 outline outline-1 outline-gray-400' : ''"
            >
            <!-- El contenedor mide justo lo que el sprite, así las estrellas
                 quedan siempre pegadas a su esquina superior derecha. -->
            <div
                class="relative mx-auto max-w-full transition-all"
                :class="isActive ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-24 w-24'"
            >
                <img
                    :src="isShowShiny? pokemon.sprites.male_shiny : pokemon.sprites.male"
                    :alt="pokemon.name"
                    class="h-full w-full object-contain"
                >
                <!-- Escalada, no con otro font-size: así la marca no se descuadra. -->
                <shiny-mark v-if="pokemon.is_shiny_released" variant="evolution" class="absolute top-0 right-0 z-10 scale-90 origin-top-right" />
            </div>
            <div class="mt-3 flex items-center justify-center gap-1 text-gray-800 dark:text-gray-300">
                <span v-if="pokemon.pokemon_id" class="text-xs font-semibold shrink-0">
                    #{{ pokemon.pokemon_id }}
                </span>
                <span class="font-semibold text-xs truncate">
                    {{ pokemon.name }}
                </span>
                <div class="flex items-center gap-1 shrink-0">
                    <base-icon
                        v-if="pokemon.types"
                        view-box="0 0 512 512"
                        width="14"
                        height="14"
                        icon-class="drop-shadow-svg"
                        :fill-path="typesSVG[pokemon.types[0]].color"
                        :d="typesSVG[pokemon.types[0]].icon"
                    />
                    <base-icon
                        v-if="pokemon.types && pokemon.types[1]"
                        view-box="0 0 512 512"
                        width="14"
                        height="14"
                        icon-class="drop-shadow-svg"
                        :fill-path="typesSVG[pokemon.types[1]].color"
                        :d="typesSVG[pokemon.types[1]].icon"
                    />
                </div>
            </div>

            <div v-if="pokemon.super_mega" class="flex justify-center mt-1">
                <span class="px-2 py-0.5 text-mini uppercase tracking-wider rounded-full border border-amber-500 text-amber-600 dark:text-amber-400">
                    {{ $t('pokemon.superMega') }}
                </span>
            </div>
            </div>
        </section>

        <!--
            Anclado al borde inferior de la fila y desplazado media altura:
            queda justo en el hueco entre este Pokémon y el siguiente, fuera de
            su tarjeta, y siempre a la misma distancia del centro.
        -->
        <section
            v-if="hasRequirements"
            class="absolute left-1/2 -bottom-4 ml-28 translate-y-1/2 flex flex-col justify-center"
        >
            <svg
                v-if="!hideArrow"
                class="absolute -left-[1.5rem] -rotate-[251deg] stroke-gray-700 dark:stroke-white"
                width="24" height="24px" fill="none"
                stroke-width="1" stroke-linecap="round"
            >
                <path d="M21 7v6h-6"/>
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2l3 3"/>
            </svg>
            <span v-if="pokemon.candy_required" class="flex items-center text-gray-800 dark:text-white text-xs my-1">
                <span class="text-xs font-light">x</span>{{ pokemon.candy_required }}
                <base-candy-icon :type="pokemon.types && pokemon.types[0]" class="h-3 w-3 ml-1 drop-shadow" />
            </span>
            <span v-if="pokemon.mega_energy_required" class="flex items-center text-gray-800 dark:text-white text-xs my-1">
                <span class="text-xs font-light">x</span>{{ pokemon.mega_energy_required }}
                <span class="ml-1 text-mini">{{ $t('megaenergy') }}</span>
            </span>
            <span v-if="pokemon.lure_required" class="flex w-full my-1">
                <img src="../../assets/icons/lure_icon.png" class="invert dark:invert-0 w-6 h-3 ml-1 drop-shadow">
                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    {{ $t(`evolutions.lure.${pokemon.lure_required}`) }}
                </span>
            </span>
            <span v-if="pokemon.item_required" class="flex w-full my-1">
                <img v-if="itemRequired === 'SunStone'" src="../../assets/icons/SunStone.png" class="w-3 h-3 ml-1 drop-shadow">
                <img v-if="itemRequired === 'SinnohStone'" src="../../assets/icons/SinnohStone.png" class="w-3 h-3 ml-1 drop-shadow">
                <img v-if="itemRequired === 'KingsRock'" src="../../assets/icons/KingsRock.png" class="w-3 h-3 ml-1 drop-shadow">
                <img v-if="itemRequired === 'UnovaStone'" src="../../assets/icons/UnovaStone.png" class="w-3 h-3 ml-1 drop-shadow">
                <img v-if="itemRequired === 'DragonScale'" src="../../assets/icons/DragonScale.png" class="w-3 h-3 ml-1 drop-shadow">
                <img v-if="itemRequired === 'Upgrade'" src="../../assets/icons/Upgrade.png" class="w-3 h-3 ml-1 drop-shadow">
                <img v-if="itemRequired === 'MetalCoat'" src="../../assets/icons/MetalCoat.png" class="w-3 h-3 ml-1 drop-shadow">
                
                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    {{ $t(`evolutions.items.${itemRequired}`) }}
                </span>
            </span>
            <span v-if="pokemon.buddy_distance_required" class="flex w-full my-1">
                <img src="../../assets/icons/walkWithYourBuddy.png" class="invert dark:invert-0 w-4 h-3 ml-1 drop-shadow">
                
                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    {{ 
                        `${$t('evolutions.walk')} ${pokemon.buddy_distance_required}${$t('unitDistance')} ${$t('evolutions.withBuddy')}`
                    }}
                </span>
            </span>
            
            <span v-if="pokemon.only_evolves_in_nighttime" class="flex w-full my-1">
                <img src="../../assets/icons/ic_moon.png" class="invert dark:invert-0 w-4 h-3 ml-1 drop-shadow">
                
                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    {{ $t('evolutions.onlyEvolvesNight') }}
                </span>
            </span>
            <span v-if="pokemon.only_evolves_in_daytime" class="flex w-full my-1">
                <img src="../../assets/icons/ic_sun.png" class="invert dark:invert-0 w-4 h-3 ml-1 drop-shadow">
                
                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    {{ $t('evolutions.onlyEvolvesDay') }}
                </span>
            </span>
            
            <span v-if="pokemon.gender_required" class="flex w-full my-1">
                <img v-if="pokemon.gender_required === 'Female'" src="../../assets/icons/ic_female.png" class="invert dark:invert-0 w-4 h-3 ml-1 drop-shadow">
                <img v-if="pokemon.gender_required === 'Male'" src="../../assets/icons/ic_male.png" class="invert dark:invert-0 w-4 h-3 ml-1 drop-shadow">

                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    {{ $t(`evolutions.${pokemon.gender_required}`) }}
                </span>
            </span>
            
            <!--
                Solo el icono: el texto no cabía en la columna de la cadena
                evolutiva y se partía en mitad de la palabra. Lo que significa
                se explica una vez en la leyenda de la sección, y el icono
                lleva su `title` y su `alt` para quien no la lea.
            -->
            <span v-if="pokemon.no_candy_cost_if_traded" class="flex flex-col items-center w-full my-1">
                <span class="text-gray-800 dark:text-white text-mini font-light">o</span>
                <img
                    src="../../assets/icons/ic_trade_ball.png"
                    class="invert dark:invert-0 w-4 h-4 mt-1 drop-shadow"
                    :alt="$t('evolutions.tradeLegend')"
                    :title="$t('evolutions.tradeLegend')"
                >
            </span>
        </section>
    </section>
</template>

<script setup>
    import { computed } from 'vue';
import ShinyMark from './ShinyMark.vue';
    import { BaseIcon } from '../index';
    import BaseCandyIcon from '../base/BaseCandyIcon.vue';
    import { typesSVG } from '../../utils/Settings';
    import { useRouter } from 'vue-router';

    const router = useRouter(); 

    const props = defineProps({
        pokemon: { type: Object, required: true },
        positionInfo: { type: Object, default: () => ({ index: 1, length: 1 }) },
        isShowShiny: { type: Boolean, default: false },
        // Las megaevoluciones apuntan a su propia forma, no al Pokémon base.
        routeTo: { type: String, default: null },
        // Las megas salen todas del Pokémon base, no una de otra: sin flecha.
        hideArrow: { type: Boolean, default: false },
        // Marca el que se está viendo ahora mismo en la ficha.
        isActive: { type: Boolean, default: false }
    })

    // Sin caramelos ni megaenergía no hay columna derecha, así que el bloque
    // del Pokémon puede ocupar todo el ancho en vez de quedarse en 2/3.
    const hasRequirements = computed(() => Boolean(
        props.pokemon.candy_required || props.pokemon.mega_energy_required
    ));

    const itemRequired = computed(() => (props.pokemon.item_required || '').replace("'","").replace(" ", ""))

    const goToPokemonPage = (pokemonId) => {
        if(props.routeTo) return router.push(props.routeTo);
        pokemonId && router.push(`/pokemon/${pokemonId}`);
    }
</script>
