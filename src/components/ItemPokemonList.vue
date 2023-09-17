<script setup>
    import { computed } from 'vue';
    import { useRouter } from 'vue-router';
    import { BaseIcon } from '.';
    import { typesSVG } from '../utils/Settings';
    import { usePokemonsStore } from '../stores/pokemons';

    const { setIsSearching } = usePokemonsStore();

    const props = defineProps({
        id: Number,
        image: String,
        is_relased: Boolean,
        name: String,
        types: Array,
        is_shiny_relased: Boolean
    })
    const router = useRouter();

    const pokemonId = computed(() => props.id?.toString().padStart(3, '0'));

    const goToPokemonPage = (pokemonId) => {
        pokemonId && setIsSearching(false);
        pokemonId && router.push(`/pokemon/${pokemonId}`);
    }
</script>

<template>
    <section
        :class="[props.is_relased? 'cursor-pointer' : '', 'p-2']"
        class="
            rounded-2xl hover:outline
            hover:bg-gray-150 hover:outline-white
            hover:dark:bg-gray-800 hover:dark:outline-gray-600
        "
        @click="props.is_relased && goToPokemonPage(props.id)"
    >   
        <img
            :src="image"
            :alt="`${props.name} ${$t('image')}`"
            :class="[props.is_relased? 'drop-shadow-pokemon_light dark:drop-shadow-pokemon_dark': 'grayscale opacity-40', 'z-10 w-24 h-24 mx-auto ']"
            loading="lazy"
        >
        <div v-if="props.is_shiny_relased" class="text-center text-sm absolute top-1 right-5 z-10 text-gray-500 dark:text-gray-200">
            <span>✦</span>
            <span class="block leading-none">✦✦</span>
        </div>
        <div class="flex-row mt-1 text-gray-800 dark:text-gray-300 font-semibold">
            <span v-if="pokemonId" class="flex justify-center mx-8 pt-1 font-semibold rounded text-xs">
                #{{ pokemonId }}
            </span>
            <span :class="[props.is_relased? '' : 'line-through', 'font-semibold text-sm text-center block']">
                {{ props.name }}
            </span>
            <div v-if="props.is_relased" class="flex justify-center mt-1">
                <base-icon
                    v-if="types"
                    view-box="0 0 512 512"
                    width="14"
                    height="14"
                    icon-class="drop-shadow-svg"
                    :fill-path="typesSVG[types[0]].color"
                    :d="typesSVG[types[0]].icon"
                />
                <base-icon
                    v-if="types && types[1]"
                    view-box="0 0 512 512"
                    width="14"
                    height="14"
                    icon-class="ml-2 drop-shadow-svg"
                    :fill-path="typesSVG[types[1]].color"
                    :d="typesSVG[types[1]].icon"
                />
            </div>
        </div>
    </section>
</template>