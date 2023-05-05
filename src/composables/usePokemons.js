import axios from 'axios';

import { usePokemonStore } from '@/stores/pokemon.js';

export function usePokemons() {
  const pokemon = usePokemonStore();


  const getPokemonsName = async() => {
    try {
      const { status, data: allPokemons } = await axios.get('https://pogoapi.net/api/v1/pokemon_names.json');
      if(status === 200) {
        const arrPokemons = Object.values(allPokemons);

        pokemon.setPokemons(arrPokemons);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const filterPokemonsStore = (value) => {
    const pokemonsFiltered = pokemon.pokemons.filter(poke => poke.name.toLowerCase().includes(value) );
    pokemon.filterPokemons(pokemonsFiltered);
  }


  return {
    filterPokemonsStore,
    getPokemonsName
  }
}



