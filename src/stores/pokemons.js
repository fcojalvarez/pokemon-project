import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useLocalStorage } from '../composables/localStorage';

export const usePokemonsStore = defineStore('pokemon', () => {
    const pokemons = ref([]);
    const pokemonsFiltered = ref([]);
    const isLoading = ref(false);
    const { setJsonToLocalStorage, getJsonToLocalStorage } = useLocalStorage();

    
    const isAllPokemonsLoad = computed(() => pokemons.value.length === pokemonsFiltered.value.length);

    const createPokemonData = async(isNewContent = false) => {
        isLoading.value = true;

        /* if(!isNewContent) {
            const pokemonData = JSON.parse(await getJsonToLocalStorage('all_pokemon_data'));
            if(pokemonData) {
                pokemons.value = [...pokemonData];
                pokemonsFiltered.value = [...pokemons.value];
                isLoading.value = false;
                return;

            }
        } */

        const allPokemons = Object.values( JSON.parse(localStorage.getItem('pokemon_names') ||'')) || [];
        const releasedPokemons = Object.values( JSON.parse(localStorage.getItem('released_pokemon')) ) || [];
        const allNamesPokemonsReleased = releasedPokemons.map( ({ name }) => name.toLowerCase() );
        const pokemonsTypes = Object.values( JSON.parse(localStorage.getItem('pokemon_types'))) || [];
        const pokemonsMoves = Object.values( JSON.parse(localStorage.getItem('current_pokemon_moves')) ) || [];
        const pokemonsStats = Object.values( JSON.parse(localStorage.getItem('pokemon_stats')) ) || [];
        const pokemonsMaxCP = Object.values( JSON.parse(localStorage.getItem('pokemon_max_cp')) ) || [];

        
        pokemons.value = [...allPokemons].map( ({ id, name }) => ({
            id,
            name,
            isReleased: allNamesPokemonsReleased.includes(name.toLowerCase()),
            types: pokemonsTypes.find( ({pokemon_id, form}) => pokemon_id === id && form === 'Normal')?.type,
            moves: getMovesFromPokemon(pokemonsMoves, id),
            stats: {
                max_cp: pokemonsMaxCP.find( ({pokemon_id, form}) => pokemon_id === id && form === 'Normal' )?.max_cp,
                ...getStatsFromPokemon(pokemonsStats, id)},

        }))

        setJsonToLocalStorage('all_pokemon_data', JSON.stringify(pokemons.value));
        pokemonsFiltered.value = [...pokemons.value];
        isLoading.value = false;
    }

    const getMovesFromPokemon = (pokemonsArr, pokemonIDToFound) => {
        const pokemon = pokemonsArr.find( ({pokemon_id, form}) => pokemon_id === pokemonIDToFound && form === 'Normal' );
        
        if(!pokemon) return null;

        return {
            charged: pokemon.charged_moves,
            elite_charged: pokemon.elite_charged_moves,
            elite_fast: pokemon.elite_fast_moves,
            fast: pokemon.fast_moves,
        }
    }

    const getStatsFromPokemon = (dataArr, pokemonIdToFound) => {
        const stats = dataArr.find( ({pokemon_id, form}) => pokemon_id === pokemonIdToFound && form === 'Normal');
        if(!stats) return null;

        return {
            attack: stats.base_attack,
            defense: stats.base_defense,
            stamina: stats.base_stamina
        }
    }

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

    const getPokemon = (id) => {
        const pokemon = pokemons.value.find( poke => String(poke.id) === id);
        const moves = pokemonsMoves.find( ({pokemon_id, form}) => String(pokemon_id) === id && form === 'Normal' );
        const {base_attack, base_defense, base_stamina} = pokemonsStats.find(({pokemon_id, form}) => String(pokemon_id) === id && form === 'Normal');

        pokemon.types = pokemonsTypes.find( ({pokemon_id, form}) => pokemon_id === id && form === 'Normal' )?.type;
        pokemon.charged_moves = moves.charged_moves;
        pokemon.fast_moves = moves.fast_moves;
        pokemon.stats = { base_attack, base_defense, base_stamina };
        pokemon.max_cp = pokemonsMaxCP.find( ({pokemon_id, form}) => String(pokemon_id) === id && form === 'Normal')?.max_cp;
    
        return pokemon;
    }
  
    return {
        createPokemonData,
        filterPokemons,
        getPokemon,
        getPokemonsToScroll,
        isAllPokemonsLoad,
        isLoading,
        pokemons,
        pokemonsFiltered
    }
  })