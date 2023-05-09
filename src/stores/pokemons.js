import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const usePokemonsStore = defineStore('pokemon', () => {
    const arrPokemons = Object.values( JSON.parse(localStorage.getItem('pokemon_names')) );
    const isAllPokemonsLoad = computed(() => pokemons.value.length === pokemonsFiltered.value.length);
    const pokemons = ref([...arrPokemons]);
    const pokemonsFiltered = ref([ ...arrPokemons.slice(0, 150) ]);

    const filterPokemons = (inputValue) => {
        const value = inputValue.toLowerCase().trim();

        if(!value) {
            pokemonsFiltered.value = pokemons.value.slice(0, 150);
            return;
        }
        if(value.length > 2) {
            pokemonsFiltered.value = pokemons.value.filter( ({ name }) => name.toLowerCase().includes( value ));
            return;
        }
    }

    const getPokemonsToScroll = (lastLength, isSearch = false, inputSearch = '') => {
        if(!isSearch) {
            pokemonsFiltered.value.push(...pokemons.value.slice(lastLength, lastLength + 100))
        }
    }
  
    return {
        filterPokemons,
        getPokemonsToScroll,
        isAllPokemonsLoad,
        pokemons,
        pokemonsFiltered
    }
  })