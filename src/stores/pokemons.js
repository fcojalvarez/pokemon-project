import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { supabase } from '../lib/supabaseClient';
import { NEXT_LOAD_LENGTH_ITEMS } from '../utils/Settings';

export const usePokemonsStore = defineStore('pokemon', () => {
    // STATE
    const pokemonList = ref([]);
    /**
     * Filtros de la Pokédex. Se aplican en la consulta a Supabase, no en el
     * cliente: el listado se carga por páginas, así que filtrar lo ya traído
     * solo escondería resultados en vez de buscarlos.
     */
    const filters = ref({
        types: [],
        generation: null,
        rarity: null,
        onlyShiny: false,
        onlyShadow: false
    });
    const totalCount = ref(null);

    /**
     * Contador de peticiones al listado: gana la última que se pidió.
     *
     * Sin esto, buscar nada más abrir la app se rompía. La carga inicial y la
     * búsqueda escriben las dos sobre la misma lista, así que si la inicial
     * tardaba más, llegaba después y pisaba los resultados de la búsqueda: el
     * usuario escribía "mewtwo" y se le volvía a llenar la pantalla con la
     * Pokédex entera.
     */
    let peticionActual = 0;
    const nuevaPeticion = () => ++peticionActual;
    const esLaUltima = (peticion) => peticion === peticionActual;
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

    /** Traduce el estado de los filtros a condiciones de PostgREST. */
    const applyFilters = (query) => {
        const active = filters.value;
        // `contains` sobre el jsonb exige que estén TODOS los tipos marcados,
        // que es lo que se espera al marcar "planta" y "veneno" a la vez.
        //
        // Va como cadena JSON a propósito: pasándole el array, supabase-js lo
        // serializa como array de Postgres (`cs.{grass}`) y contra una columna
        // jsonb eso no casa con nada. Como cadena manda `cs.["grass"]`.
        if(active.types.length) query = query.contains('types', JSON.stringify(active.types));
        if(active.generation) query = query.eq('generation', active.generation);
        if(active.rarity) query = query.eq('rarity', active.rarity);
        if(active.onlyShiny) query = query.eq('is_shiny_released', true);
        if(active.onlyShadow) query = query.eq('is_shadow_released', true);
        return query;
    }

    // Consulta paginada a Supabase, ordenada por pokemon_id
    const fetchPokemonsRange = async({ start, end }) => {
        const query = applyFilters(
            supabase.from('pokemons').select('*', { count: 'exact' })
        ).order('pokemon_id', { ascending: true }).range(start, end);

        const { data, error, count } = await query;

        if(error) console.error(error);
        if(typeof count === 'number') totalCount.value = count;

        return data || [];
    }

    //ACTIONS
    const filterPokemons = async(inputValue, toSearchModal = false) => {
        const value = (inputValue || '').toLowerCase().trim();
        const isWritingName = isNaN(value); 

        if(!value) {
            if(toSearchModal) {
                if(allPokemons.value.length === 0) {
                    const { data: pokemons } = await supabase.from('pokemons').select('pokemon_id,name');
                    return pokemons || [];
                }
                return pokemonList.value;
            }
            pokemonsFiltered.value = pokemonList.value.slice(0, NEXT_LOAD_LENGTH_ITEMS);
            return;
        }

        const peticion = nuevaPeticion();
        const { data: pokemons } = await supabase.from('pokemons').select('*').filter(
            isWritingName? 'name' : 'pokemon_id',
            isWritingName? 'ilike' : 'eq',
            isWritingName? `%${value}%`: parseInt(value)
        );

        if(toSearchModal) return pokemons || [];

        // Si mientras respondía se pidió otra cosa, esta ya no vale.
        if(!esLaUltima(peticion)) return;

        pokemonsFiltered.value = pokemons || [];
        return;
    }

    const getPokemons = async(range = { start: 0, end: NEXT_LOAD_LENGTH_ITEMS }) => {
        const peticion = nuevaPeticion();
        isLoadingPokemons.value = true;
        const resultado = await fetchPokemonsRange(range);
        if(!esLaUltima(peticion)) return;
        setPokemons(resultado);
        isLoadingPokemons.value = false;
    }

    const addPokemons = async(range = { start: 0, end: NEXT_LOAD_LENGTH_ITEMS}) => {
        const peticion = nuevaPeticion();
        isLoadingPokemons.value = true;
        const resultado = await fetchPokemonsRange(range);
        if(!esLaUltima(peticion)) return;
        setAddPokemons(resultado);
        isLoadingPokemons.value = false;
    }

    /**
     * Cambia los filtros y vuelve a empezar el listado.
     * Devuelve cuántos quedan, para que la vista sepa si aún hay más páginas.
     */
    const setFilters = async(newFilters) => {
        filters.value = { ...filters.value, ...newFilters };
        const peticion = nuevaPeticion();
        isLoadingPokemons.value = true;
        const resultado = await fetchPokemonsRange({ start: 0, end: NEXT_LOAD_LENGTH_ITEMS });
        if(!esLaUltima(peticion)) return totalCount.value;
        setPokemons(resultado);
        isLoadingPokemons.value = false;
        return totalCount.value;
    }

    const clearFilters = () => setFilters({
        types: [], generation: null, rarity: null, onlyShiny: false, onlyShadow: false
    });

    /** Cuántos filtros hay puestos, para el contador del botón. */
    const activeFilterCount = computed(() => {
        const active = filters.value;
        return active.types.length
            + (active.generation ? 1 : 0)
            + (active.rarity ? 1 : 0)
            + (active.onlyShiny ? 1 : 0)
            + (active.onlyShadow ? 1 : 0);
    });

    const getPokemon = (id) => {
        if(!id) {
            console.warn('No se ha encontrado ID para buscar al pokemon.');
            return undefined;
        }
        return pokemonList.value.find( pokemon => pokemon.pokemon_id === id );
    }

    const getTypes = async() => {
        const { data: types } = await supabase
            .from('types')
            .select('*')

        setTypes(types || []);
    }

    // MUTATIONS
    const setTypes = (typesArr) => pokemonTypes.value = typesArr;

    const setPokemons = (pokemonsArr) => {
        pokemonList.value = [...pokemonsArr];
        pokemonsFiltered.value = [...pokemonsArr];
    }

    const setAddPokemons = (pokemonsArr) => {
        pokemonList.value.push(...pokemonsArr);
        pokemonsFiltered.value.push(...pokemonsArr);
    }

    const setIsSearching = (isSearching) => searchingPokemon.value = isSearching;
  
    return {
        activeFilterCount,
        addPokemons,
        allPokemons,
        clearFilters,
        filters,
        setFilters,
        totalCount,
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
