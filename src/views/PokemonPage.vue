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
    console.log(pokemon.value);
}),
console.log(route.params.id);
</script>

<template>
    <section>
        <button class="border-2 py-2 px-12 mb-12 rounded-md" @click="$router.push('/')">{{ $t('back') }}</button>
        
        <h1>POKEMON PAGE</h1> 
    </section>
</template>
