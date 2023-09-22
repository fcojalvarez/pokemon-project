<template>
    <section class="my-4 w-full cursor-pointer flex justify-center" @click="goToPokemonPage(pokemon.pokemon_id)" >
        <section class="w-1/2 mr-auto">
            <img
                :src="isShowShiny? pokemon.sprites.male_shiny : pokemon.sprites.male"
                :alt="pokemon.name"
                class="h-24 w-24"
            >
            <div v-if="pokemon.is_shiny_released" class="text-center text-mini absolute top-6 right-6 z-10 text-gray-600 dark:text-gray-100 shiny">
                <span class="block leading-none">✦✦</span>
                <span>✦</span>
            </div>
            <div class="flex-row sm:flex-col mt-1 text-gray-800 dark:text-gray-300 font-semibold">
                <span v-if="pokemon.pokemon_id" class="flex justify-center mx-8 pt-1 font-semibold rounded text-xs">
                    #{{ pokemon.pokemon_id }}
                </span>
                <span class="'font-semibold text-xs text-center block">
                    {{ pokemon.name }}
                </span>
                <div class="flex justify-center mt-1">
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
                        icon-class="ml-2 drop-shadow-svg"
                        :fill-path="typesSVG[pokemon.types[1]].color"
                        :d="typesSVG[pokemon.types[1]].icon"
                    />
                </div>
            </div>
        </section>

        <section v-if="pokemon.candy_required" class="relative -bottom-[6rem] w-1/2 flex flex-col justify-center">
            <svg
                class="absolute -left-[1.5rem] -rotate-[251deg]"
                width="24" height="24px" fill="none"
                stroke="#fff" stroke-width="1" stroke-linecap="round"
            >
                <path d="M21 7v6h-6"/>
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2l3 3"/>
            </svg>
            <span class="flex items-center text-gray-800 dark:text-white text-xs my-1">
                <span class="text-xs font-light">x</span>{{ pokemon.candy_required }}
                <img src="../../assets/icons/candy_icon.png" class="h-3 w-3 ml-1 drop-shadow">
            </span>
            <span v-if="pokemon.lure_required" class="flex w-full my-1">
                <img src="../../assets/icons/lure_icon.png" class="w-6 h-3 ml-1 drop-shadow">
                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    {{ $t(`evolutions.lure.${pokemon.lure_required}`) }}
                </span>
            </span>
            <span v-if="pokemon.item_required" class="flex w-full my-1">
                <img v-if="itemRequired === 'SunStore'" src="../../assets/icons/SunStone.png" class="w-3 h-3 ml-1 drop-shadow">
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
                <img src="../../assets/icons/walkWithYourBuddy.png" class="w-4 h-3 ml-1 drop-shadow">
                
                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    
                    {{ $t('evolutions.walkWithBuddy', pokemon.buddy_distance_required) }}
                </span>
            </span>
            
            <span v-if="pokemon.only_evolves_in_nighttime" class="flex w-full my-1">
                <img src="../../assets/icons/ic_moon.png" class="w-4 h-3 ml-1 drop-shadow">
                
                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    {{ $t('evolutions.onlyEvolvesNight') }}
                </span>
            </span>
            <span v-if="pokemon.only_evolves_in_daytime" class="flex w-full my-1">
                <img src="../../assets/icons/ic_sun.png" class="w-4 h-3 ml-1 drop-shadow">
                
                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    {{ $t('evolutions.onlyEvolvesDay') }}
                </span>
            </span>
            
            <span v-if="pokemon.gender_required" class="flex w-full my-1">
                <img v-if="pokemon.gender_required === 'Female'" src="../../assets/icons/ic_female.png" class="w-4 h-3 ml-1 drop-shadow">
                <img v-if="pokemon.gender_required === 'Male'" src="../../assets/icons/ic_male.png" class="w-4 h-3 ml-1 drop-shadow">

                <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                    {{ $t(`evolutions.${pokemon.gender_required}`) }}
                </span>
            </span>
            
            <span v-if="pokemon.no_candy_cost_if_traded" class="w-full my-1">
                <span class="text-gray-800 dark:text-white text-mini font-light text-center mx-4 my-2">o</span>
                <div class="flex items-center mt-2">
                    <img src="../../assets/icons/ic_trade_ball.png" class="w-4 h-4 drop-shadow">
                    <span class="text-gray-800 dark:text-white text-mini font-light ml-1">
                        {{ $t('evolutions.freeWhenWxchanging') }}
                    </span>
                </div>
            </span>
        </section>
    </section>
</template>

<script setup>
    import { computed } from 'vue';
    import { BaseIcon } from '../index';
    import { typesSVG } from '../../utils/Settings';
    import { useRouter } from 'vue-router';

    const router = useRouter(); 

    const props = defineProps({
        pokemon: { type: Object, required: true },
        positionInfo: { type: Number, default: 1 },
        isShowShiny: { type: Boolean, default: false }
    })

    const itemRequired = computed(() => props.pokemon.item_required.replace("'","").replace(" ", ""))

    // Methods
    const goToPokemonPage = (pokemonId) => {
        pokemonId && router.push(`/pokemon/${pokemonId}`);
    }
</script>

<style scoped>
</style>