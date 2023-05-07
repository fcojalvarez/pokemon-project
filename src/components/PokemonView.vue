<script setup>
    import { computed } from 'vue';
    import { useRouter } from 'vue-router';

    const props = defineProps({
        id: String,
        name: String
    })
    const router = useRouter();

    const pokemonImage = computed({
        get() {
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${props.id}.png`;
        }
    })

    const goToPokemonPage = (pokemonId) => {
        pokemonId && router.push(`/${pokemonId}`);
    }
</script>

<template>
    <section class="cursor-pointer rounded-xl p-4 group" @click="goToPokemonPage(props.id)">   
        <img
            :src="pokemonImage"
            :alt="`${props.name} ${$t('image')}`"
            class="w-24 h-24 mx-auto group-hover:animate-bounce"
            loading="lazy"
        >
        <p class="text-center mt-4 mb-auto group-hover:font-semibold">{{ props.name }}</p>
    </section>
</template>
