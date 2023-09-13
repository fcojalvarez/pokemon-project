<script setup>
    import { computed } from 'vue';
    import { useRouter } from 'vue-router';

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
        pokemonId && router.push(`/pokemon/${pokemonId}`);
    }
</script>

<template>
    <section
        :class="[props.is_relased? 'cursor-pointer' : '', 'p-2']"
        @click="props.is_relased && goToPokemonPage(props.id)"
    >   
        <img
            :src="image"
            :alt="`${props.name} ${$t('image')}`"
            :class="[props.is_relased? 'drop-shadow-[5px_5px_10px_#333]': 'grayscale opacity-40', 'z-10 w-24 h-24 mx-auto ']"
            loading="lazy"
        >
        <div v-if="props.is_shiny_relased" class="text-center text-sm absolute top-0 right-0 text-gray-700 dark:text-gray-400">
            <span>✦</span>
            <span class="block leading-none">✦✦</span>
        </div>
        <div class="flex-row mt-1 text-gray-800 dark:text-gray-300 font-semibold">
            <span v-if="pokemonId" class="flex justify-center mx-8 pt-1 font-semibold rounded text-xs">
                #{{ pokemonId }}
            </span>
            <span :class="[props.is_relased? '' : 'line-through', 'font-semibold text-center block']">
                {{ props.name }}
            </span>
            <div v-if="props.is_relased" class="flex justify-center mt-1">
                <img v-if="types" class="w-4 h-4 md:w-3 md:h-3 drop-shadow-svg" :src="`src/assets/icons/types/${types[0].toLowerCase()}.svg`" :alt="`${types[0]} type icon`">
                <img v-if="types && types[1]" class="w-4 h-4 md:w-3 md:h-3 ml-2 drop-shadow-svg" :src="`src/assets/icons/types/${types[1].toLowerCase()}.svg`" :alt="`${types[1]} type icon`">
            </div>
        </div>
    </section>
</template>

<style>
.text-Grass{
    color: '#035c26';
} 
.text-Poison{
    color: '#51069c';
} 
.text-Water{
    color: '#06099c';
} 
.text-Fire{
    color: '#ff0000';
} 
.text-Flying{
    color: '#c8c9fa';
} 
.text-Bug{
    color: '#26ff8f';
} 
.text-Normal{
    color: '#ffffff';
} 
.text-Ground{
    color: '#6e2c13';
} 
.text-Electric{
    color: '#d9ff00';
} 
.text-Fairy{
    color: '#dca1ff';
} 
.text-Fighting{
    color: '#ff3b44';
} 
.text-Rock{
    color: '#522114';
} 
.text-Psychic{
    color: '#4b3a6e';
} 
.text-Ice{
    color: '#80b7ff';
} 
.text-Ghost{
    color: '#705e8c';
} 
.text-Steel{
    color: '#ff0000';
} 
.text-Dark{
    color: '#cccccc';
} 
</style>