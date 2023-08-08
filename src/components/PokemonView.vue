<script setup>
    import { computed } from 'vue';
    import { useRouter } from 'vue-router';

    const props = defineProps({
        id: Number,
        isReleased: Boolean,
        name: String,
        types: Array
    })
    const router = useRouter();

    const bgClass = computed({
        get() {
            return `bg-${props.types? props.types[0] : ''} bg-${props.types? props.types[1] : 'Fire'}`
        }
    })

    const pokemonImage = computed({
        get() {
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${props.id}.png`;
        }
    })

    const pokemonId = computed(() => props.id.toString().padStart(3, '0'))

    const goToPokemonPage = (pokemonId) => {
        pokemonId && router.push(`/pokemon/${pokemonId}`);
    }
</script>

<template>
    <section
        :class="[props.isReleased? 'cursor-pointer' : '', 'p-2 group']"
        @click="props.isReleased && goToPokemonPage(props.id)"
    >   
    {{ props.types }}
        <img
            :src="pokemonImage"
            :alt="`${props.name} ${$t('image')}`"
            :class="[props.isReleased? 'group-hover:animate-bounce drop-shadow-[5px_5px_10px_#333]': 'grayscale opacity-40', 'w-24 h-24 mx-auto ']"
            loading="lazy"
        >
        <div class="flex-row mt-2 text-gray-800 dark:text-gray-300 font-semibold">
            <span :class="[props.isReleased? '' : 'line-through', 'font-semibold text-center block']">
                {{ props.name }}
            </span>
            <span class="flex justify-center mb-2 mt-1 mx-8 py-1 font-semibold rounded bg-gray-500/30 text-xs">
                #{{ pokemonId }}
            </span>
        </div>
        <div class="flex justify-between">
            <div v-if="props.types && props.types[0]" :class="`h-3 w-3 rounded-full m-auto ${bgClass}`"></div>
            <div v-if="props.types && props.types[1]" :class="`h-3 w-3 rounded-full m-auto ${bgClass}`"></div>
        </div>
    </section>
</template>
