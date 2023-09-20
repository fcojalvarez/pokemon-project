<template>
    <section class="my-4 w-full cursor-pointer flex justify-center" @click="goToPokemonPage(pokemon.pokemon_id)" >
        <section class="">
            <img
                :src="isShowShiny? pokemon.sprites.male_shiny : pokemon.sprites.male"
                :alt="pokemon.name"
                class="h-24 w-24"
            >
            <div v-if="pokemon.is_shiny_released" class="text-center text-sm absolute top-2 right-0 z-10 text-gray-600 dark:text-gray-100 shiny">
                <span class="block leading-none text-xs drwp">✦✦</span>
                <span class="text-xs">✦</span>
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

        <section v-if="pokemon.candy_required" class="flex absolute bottom-24 -right-8 justify-center items-center">
            <span class="flex items-center text-gray-800 dark:text-white text-xs right-2">
                <span class="text-xs font-light">x</span>{{ pokemon.candy_required }}
                <img src="../../assets/ic_candy.png" class="h-3 w-3 ml-1 drop-shadow">
            </span>
            <section class="absolute top-6 -right-7 mr-4">
                <div class="relative w-[7.5vw] border-t border-white" />
                <div class="absolute -top-3 -right-1 transform -translate-x-1/2 translate-y-1/2 -rotate-[135deg] w-3 h-3 border-l border-b border-white" />
            </section>
        </section>


    </section>
</template>

<script setup>
    import { BaseIcon } from '../index';
    import { typesSVG } from '../../utils/Settings';
    import { useRouter } from 'vue-router';

    const router = useRouter(); 

    defineProps({
        pokemon: { type: Object, required: true },
        positionInfo: { type: Number, default: 1 },
        isShowShiny: { type: Boolean, default: false }
    })

    // Methods
    const goToPokemonPage = (pokemonId) => {
        pokemonId && router.push(`/pokemon/${pokemonId}`);
    }
</script>

<style scoped>
</style>