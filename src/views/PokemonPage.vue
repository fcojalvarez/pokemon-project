<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { usePokemonsStore } from '../stores/pokemons';

const route = useRoute();
const { getPokemon } = usePokemonsStore();

const pokemon = ref(null);

onMounted(() => {
    const pokemonId = route.params.id;
    pokemon.value = getPokemon(pokemonId);
})
</script>

<template>
    <section class="min-h-screen px-16">
        <button
            class="border border-gray-400 py-2 px-12 mb-12 rounded-xl shadow-md"
            @click="$router.push('/')"
        >
            <span class="text-gray-800 dark:text-white">
                {{ $t('back') }}
            </span>
        </button>
        
        <h1>POKEMON PAGE</h1> 
    </section>
</template>
