import { ref } from 'vue'
import { defineStore } from 'pinia'

export const usePokemonStore = defineStore('pokemon', () => {
    const pokemons = ref([]);
    const pokemonsFiltered = ref([]);

    function setPokemons(arrPokemons) {
        pokemons.value = [...arrPokemons];
        pokemonsFiltered.value = [...arrPokemons];
    }

    function filterPokemons(pokemonsFiltered) {
        pokemonsFiltered.value = [...pokemonsFiltered];
    }

    return { 
        filterPokemons,
        pokemons,
        pokemonsFiltered,
        setPokemons
    }
})