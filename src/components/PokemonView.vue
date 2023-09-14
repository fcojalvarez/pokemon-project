<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { supabase } from '../lib/supabaseClient';

const pokemon = ref(null);
const route = useRoute();

const getPokemon = async(pokemonId) => {
    const { data: [ pokemonFinded ] } = await supabase.from('pokemons').select('*').eq('pokemon_id', pokemonId);

    pokemon.value = {...pokemonFinded};
}

onMounted(async() => {
    const pokemonId = Number(route.params.id);
    
    if(pokemonId) await getPokemon(pokemonId);
})

watch(route, async(newRoute) => {
    const pokemonIdFromRoute = Number(newRoute.params.id);
    if(pokemon.value.pokemon_id !== pokemonIdFromRoute) {
        await getPokemon(pokemonIdFromRoute);
    }
})
</script>

<template>
    <section class="py-12 px-24 w-100 border border-red-400 rounded bg-red-200"
    >
        <h1 class="block my-8 text-center">POKEMON VIEW: {{ pokemon?.name }}</h1>
        <p>
            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Officia asperiores excepturi dolorum impedit eum cumque a ea laborum possimus, harum voluptatibus commodi delectus nostrum id perspiciatis facere voluptate! Delectus, optio.

            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Officia asperiores excepturi dolorum impedit eum cumque a ea laborum possimus, harum voluptatibus commodi delectus nostrum id perspiciatis facere voluptate! Delectus, optio.Lorem, ipsum dolor sit amet consectetur adipisicing elit. Officia asperiores excepturi dolorum impedit eum cumque a ea laborum possimus, harum voluptatibus commodi delectus nostrum id perspiciatis facere voluptate! Delectus, optio.

            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Officia asperiores excepturi dolorum impedit eum cumque a ea laborum possimus, harum voluptatibus commodi delectus nostrum id perspiciatis facere voluptate! Delectus, optio.


            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Officia asperiores excepturi dolorum impedit eum cumque a ea laborum possimus, harum voluptatibus commodi delectus nostrum id perspiciatis facere voluptate! Delectus, optio.Lorem, ipsum dolor sit amet consectetur adipisicing elit. Officia asperiores excepturi dolorum impedit eum cumque a ea laborum possimus, harum voluptatibus commodi delectus nostrum id perspiciatis facere voluptate! Delectus, optio.
            Lorem, ipsum dolor sit amet consectetur adipisicing elit. Officia asperiores excepturi dolorum impedit eum cumque a ea laborum possimus, harum voluptatibus commodi delectus nostrum id perspiciatis facere voluptate! Delectus, optio.
        </p>
    </section>
</template>
