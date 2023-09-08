import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useLocalStorage, } from '../composables/localStorage';
import { supabase } from '../lib/supabaseClient';

export const usePokemonsStore = defineStore('pokemon', () => {
    // STATE
    const pokemons = ref([]);
    const pokemonsFiltered = ref([]);
    const isLoading = ref(false);
    const { setJsonToLocalStorage, getObjectValuesFromLocalStorage } = useLocalStorage();
    const pokemonTypes = ref([]);

    // GETTERS
    const isAllPokemonsLoad = computed(() => pokemons.value.length === pokemonsFiltered.value.length);
    const types = computed(() => pokemonTypes.value)

    //ACTIONS
    const createPokemonData = async() => {
        isLoading.value = true;
        const allPokemons = await getObjectValuesFromLocalStorage('pokemon_names');
        const releasedPokemons = Object.values( JSON.parse(localStorage.getItem('released_pokemon') ));
        const pokemonsTypes = Object.values( JSON.parse(localStorage.getItem('pokemon_types') ));
        const pokemonsShinies = Object.values( JSON.parse(localStorage.getItem('shiny_pokemon') ));
        
        const allNamesPokemonsReleased = releasedPokemons.map( ({ name }) => name.toLowerCase() );
        
        pokemons.value = [...allPokemons].map( ({ id, name }) => {
            if(id > 100) return;
            return {id,
            name,
            isReleased: allNamesPokemonsReleased.includes(name.toLowerCase()),
            types: pokemonsTypes.find( ({pokemon_id, form}) => pokemon_id === id && form === 'Normal')?.type,
            is_released_shiny: checkReleasedShiny(pokemonsShinies, id)
        }} )

        setJsonToLocalStorage('all_pokemon_data', JSON.stringify(pokemons.value));
        pokemonsFiltered.value = [...pokemons.value.splice(0,100)];
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

    const checkReleasedShiny = (dataArr, pokemonId) => {
        const pokemon = dataArr.find( ({id}) => pokemonId === id);
        if(!pokemon) return false;

        const { id, name, ...shinyData } = pokemon; 


        return pokemon && Object.values(shinyData).some(isShinyReleased => isShinyReleased)
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
        /* let pokemon = pokemons.value.find( poke => String(poke.id) === id);
        
        const pokemonsMoves = Object.values( JSON.parse(localStorage.getItem('current_pokemon_moves') ));
        const pokemonsStats = Object.values( JSON.parse(localStorage.getItem('pokemon_stats') ));
        const pokemonsMaxCP = Object.values( JSON.parse(localStorage.getItem('pokemon_max_cp') ));

        pokemon = {
            moves: getMovesFromPokemon(pokemonsMoves, id),
            stats: {
                max_cp: pokemonsMaxCP.find( ({pokemon_id, form}) => pokemon_id === id && form === 'Normal' )?.max_cp,
                ...getStatsFromPokemon(pokemonsStats, id)
            },
            ...pokemon
        }

        return pokemon; */
    }

    const getTypes = async() => {
        const { data: types, error } = await supabase
            .from('types')
            .select('*')
    }

    // MUTATIONS
    const setTypes = (typesArr) => types.value = typesArr;
  
    return {
        createPokemonData,
        filterPokemons,
        getPokemon,
        getPokemonsToScroll,
        getTypes,
        isAllPokemonsLoad,
        isLoading,
        types,
        pokemons,
        pokemonsFiltered
    }
  })