import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { supabase } from '../lib/supabaseClient';

export const usePokemonsStore = defineStore('pokemon', () => {
    // STATE
    const pokemonList = ref([]);
    const isLoadingPokemons = ref(false);
    const searchingPokemon = ref(false);
    const pokemonTypes = ref([]);
    const pokemonsFiltered = ref([]);

    // GETTERS
    const types = computed(() => pokemonTypes.value);
    const pokemons = computed(() => pokemonsFiltered.value);
    const isLoading = computed(() => isLoadingPokemons.value);
    const allPokemons = computed(() => pokemonList.value);
    const isSearching = computed(() => searchingPokemon.value)

    //ACTIONS
    const filterPokemons = async(inputValue) => {
        const value = inputValue.toLowerCase().trim();

        if(!value) {
            pokemonsFiltered.value = pokemonList.value.slice(0, 100);
            return;
        }
        if(value.length > 2) {
            const { data: pokemons } = await supabase.from('pokemons').select('*').filter('name', 'ilike', `%${value}%`);
            pokemonsFiltered.value = pokemons;
            return;
        }
    }

    const getPokemons = async(range = { start: 0, end: 150}) => {
        isLoadingPokemons.value = true;
        const { data: pokemons, error } = await supabase.from('pokemons').select('*').order('pokemon_id', { ascending: true }).range(range.start, range.end);
        
        if(error) console.log(error);
        
        setPokemons([...pokemons]);
        isLoadingPokemons.value = false;
    }

    const addPokemons = async(range = { start: 0, end: 150}) => {
        isLoadingPokemons.value = true;
        const { data: pokemons, error } = await supabase.from('pokemons').select('*').order('pokemon_id', { ascending: true }).range(range.start, range.end);
        
        if(error) console.log(error);
        
        setAddPokemons([...pokemons]);
        isLoadingPokemons.value = false;
    }


    const getPokemon = async(id) => {
        if(!id) console.log('No se ha encontrado ID para buscar al pokemon.');
        return pokemons.value.find( pokemon => pokemon.id === id );
    }

    const getTypes = async() => {
        const { data: types } = await supabase
            .from('types')
            .select('*')

        setTypes(types);
    }

    // MUTATIONS
    const setTypes = (typesArr) => types.value = typesArr;

    const setPokemons = (pokemonsArr) => {
        pokemonList.value = [...pokemonsArr];
        pokemonsFiltered.value = [...pokemonsArr];
    }

    const setAddPokemons = (pokemonsArr) => {
        pokemonsArr.forEach(poke => {
            pokemonList.value.push(poke);
            pokemonsFiltered.value.push(poke);
            
        });
    }

    const setIsSearching = (isSearching) => searchingPokemon.value = isSearching;
  
    return {
        addPokemons,
        allPokemons,
        filterPokemons,
        getPokemon,
        getPokemons,
        getTypes,
        isLoading,
        isSearching,
        setIsSearching,
        types,
        pokemons
    }
  })