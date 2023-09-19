<template>
    <section class="flex">
        <section class="my-4">
            <img
                :src="isShowShiny? pokemon.sprites.male_shiny : pokemon.sprites.male"
                :alt="pokemon.name"
                class="h-24 w-24"
            >
            <div class="flex-row mt-1 text-gray-800 dark:text-gray-300 font-semibold">
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
            <div v-if="pokemon.is_shiny_released" class="text-center text-sm absolute top-1 -right-2 z-10 text-yellow-200 dark:text-gray-100 shiny">
                <span class="text-xs">✦</span>
                <span class="block leading-none text-xs">✦✦</span>
            </div>
        </section>
    
        <section class="flex justify-center items-center">
            <span class="my-auto text-gray-800 dark:text-white text-xs">
                x{{ pokemon.candy_required }}
            </span>
            <img src="../../assets/ic_candy.png" class="h-5 w-5s ml-2">
        </section>
    </section>
</template>

<script setup>
    import { BaseIcon } from '../index';
    import { typesSVG } from '../../utils/Settings';


    defineProps({
        pokemon: { type: Object, required: true },
        positionInfo: { type: Number, default: 1 },
        isShowShiny: { type: Boolean, default: false }
    })
</script>

<style scoped>
</style>