<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { usePokemonsStore } from '../stores/pokemons';

const route = useRoute();
const { getPokemon } = usePokemonsStore();

const pokemon = ref(null);

onMounted(() => {
    const pokemonId = Number(route.params.id);
    pokemon.value = getPokemon(pokemonId);
})
</script>

<template>
    <section class="min-h-screen px-16">
        

    </section>
</template>
