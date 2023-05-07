import { ref } from 'vue';
import { defineStore } from 'pinia';

export const usePokemonsStore = defineStore('pokemon', () => {
    const arrPokemons = Object.values( JSON.parse(localStorage.getItem('pokemon_names')) ); 
    const pokemons = ref([...arrPokemons]);
    const pokemonsFiltered = ref([...arrPokemons]);

    const filterPokemons = (inputValue) => {
        const value = inputValue.toLowerCase();
        pokemonsFiltered.value = pokemons.value.filter( ({ name }) => name.toLowerCase().includes( value ))
    }
  
    return {
        pokemons,
        pokemonsFiltered,
        filterPokemons
    }
  })