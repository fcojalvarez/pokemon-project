<script setup>
    import { computed } from 'vue';
    import { useRouter } from 'vue-router';

    const props = defineProps({
        id: Number,
        isReleased: Boolean,
        name: String
    })
    const router = useRouter();

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
        :class="[props.isReleased? 'cursor-pointer' : '', 'bg-white rounded-xl p-2 group']"
        @click="goToPokemonPage(props.id)"
    >   
        <img
            :src="pokemonImage"
            :alt="`${props.name} ${$t('image')}`"
            :class="[props.isReleased? 'group-hover:animate-bounce drop-shadow-[5px_5px_10px_#333]': 'grayscale opacity-40', 'w-24 h-24 mx-auto ']"
            loading="lazy"
        >
        <div class="flex-row mt-2 text-gray-800 font-semibold">
            <span :class="[props.isReleased? '' : 'line-through', 'font-semibold text-center block']">
                {{ props.name }}
            </span>
            <span class="flex justify-center mb-2 mt-1 mx-8 font-semibold rounded bg-gray-500/30 text-xs">
                #{{ pokemonId }}
            </span>
        </div>
    </section>
</template>
