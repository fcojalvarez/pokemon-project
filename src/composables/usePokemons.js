import axios from 'axios';

export function usePokemons() {
  const getPokemonsName = async() => {
    console.log('object');
    try {
      const { status, data: allPokemons } = await axios.get('https://pogoapi.net/api/v1/pokemon_names.json');
      if(status === 200) {
        const arrPokemonsName = [];
        
        for (const pokemonId in allPokemons) {
          if (Object.hasOwnProperty.call(allPokemons, pokemonId)) {
            arrPokemonsName.push(allPokemons[pokemonId].name);
          }
        }
    
        localStorage.setItem('pokemonsName', JSON.stringify(arrPokemonsName));
      }
    } catch (error) {
      console.log(error);
    }
  }


  return {
    getPokemonsName
  }
}



