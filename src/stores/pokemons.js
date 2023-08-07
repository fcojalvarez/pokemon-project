import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const usePokemonsStore = defineStore('pokemon', () => {
    const allPokemons = Object.values( JSON.parse(localStorage.getItem('pokemon_names')) );
    const releasedPokemons = Object.values( JSON.parse(localStorage.getItem('released_pokemon')) );
    const pokemonsTypes = Object.values( JSON.parse(localStorage.getItem('pokemon_types')));
    const isAllPokemonsLoad = computed(() => pokemons.value.length === pokemonsFiltered.value.length);
    const pokemons = ref([]);
    const pokemonsFiltered = ref([]);

    const getPokemonsToLS = () => {
        const allNamesPokemonsReleased = releasedPokemons.map( ({ name }) => name.toLowerCase() );

        pokemons.value = [...allPokemons].map( ({ id, name }) => ({
            id,
            name,
            isReleased: allNamesPokemonsReleased.includes(name.toLowerCase())
        }) )

        console.log(pokemonsTypes);
        pokemonsFiltered.value = [...pokemons.value]
    }

    getPokemonsToLS()

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

    const getPokemon = (id) => pokemons.value.find( poke => String(poke.id) === id);
  
    return {
        filterPokemons,
        getPokemon,
        getPokemonsToScroll,
        isAllPokemonsLoad,
        pokemons,
        pokemonsFiltered
    }
  })