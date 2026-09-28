import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { supabase } from '../lib/supabaseClient';
import { NEXT_LOAD_LENGTH_ITEMS } from '../utils/Settings';

/**
 * Lo que pinta la tarjeta de la Pokédex. Con `*` cada Pokémon traía también
 * sus evoluciones, encuentros, ataques… (unos 2,7 KB): una página de 100
 * pesaba 270 KB para usar un 5 %. La ficha pide su fila entera aparte.
 */
const COLUMNAS_TARJETA = 'pokemon_id,name,types,is_released,is_shiny_released,can_dynamax,can_gigantamax,sprite:sprites->>male';

export const usePokemonsStore = defineStore('pokemon', () => {
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
        onlyShadow: false,
        onlyDynamax: false,
        onlyGigantamax: false
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
    const pokemonsFiltered = ref([]);
    // Lo último que se buscó en la Pokédex: con él la vista sabe si lo que
    // enseña son resultados de búsqueda (y cuántos anunciar) o la lista normal.
    const searchTerm = ref('');

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
        if(active.onlyDynamax) query = query.eq('can_dynamax', true);
        if(active.onlyGigantamax) query = query.eq('can_gigantamax', true);
        return query;
    }

    // Consulta paginada a Supabase, ordenada por pokemon_id.
    //
    // El total solo se enseña con filtros puestos, y solo cambia al cambiar
    // los filtros: se cuenta en la primera página y nada más. Contar la tabla
    // en cada página le costaba a Supabase unos 200 ms por petición.
    const fetchPokemonsRange = async({ start, end }) => {
        const contar = start === 0 && activeFilterCount.value > 0;
        const query = applyFilters(
            supabase.from('pokemons').select(COLUMNAS_TARJETA, contar ? { count: 'exact' } : undefined)
        ).order('pokemon_id', { ascending: true }).range(start, end);

        const { data, error, count } = await query;

        if(error) console.error(error);
        if(start === 0) totalCount.value = typeof count === 'number' ? count : null;

        return data || [];
    }

    /**
     * Búsqueda por nombre sin fijarse en mayúsculas, tildes ni signos: «mr
     * mime» encuentra «Mr. Mime», «sirfetchd» a «Sirfetch'd» y «hooh» a
     * «Ho-Oh». Con un `ilike` contra la base no se podía. La lista de nombres
     * (1025, poca cosa) se pide una vez y se busca en ella; primero los que
     * empiezan por lo escrito y luego los que lo contienen.
     */
    let nombres = null;
    const normalizar = (texto) => String(texto ?? '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]/g, '');
    const cargarNombres = async() => {
        if(!nombres) {
            // Sin .range, Supabase corta en 1000 filas y faltarían los últimos.
            const { data } = await supabase.from('pokemons').select('pokemon_id,name').order('pokemon_id').range(0, 1999);
            if(data?.length) nombres = data;
        }
        return nombres ?? [];
    };
    const buscarPorNombre = async(texto) => {
        const q = normalizar(texto);
        if(!q) return [];
        const empiezan = [], contienen = [];
        for(const p of await cargarNombres()) {
            const n = normalizar(p.name);
            if(n.startsWith(q)) empiezan.push(p);
            else if(n.includes(q)) contienen.push(p);
        }
        return [...empiezan, ...contienen];
    };

    const filterPokemons = async(inputValue, toSearchModal = false) => {
        const value = (inputValue || '').toLowerCase().trim();
        const isWritingName = isNaN(value); 
        if(!toSearchModal) searchTerm.value = value;

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

        // El desplegable solo necesita número y nombre.
        if(toSearchModal && isWritingName) return buscarPorNombre(value);

        const peticion = nuevaPeticion();
        let pokemons;
        if(isWritingName) {
            const encontrados = await buscarPorNombre(value);
            const orden = new Map(encontrados.map((p, i) => [p.pokemon_id, i]));
            const { data } = encontrados.length
                ? await supabase.from('pokemons').select(COLUMNAS_TARJETA).in('pokemon_id', [...orden.keys()])
                : { data: [] };
            pokemons = (data || []).sort((a, b) => orden.get(a.pokemon_id) - orden.get(b.pokemon_id));
        } else {
            ({ data: pokemons } = await supabase.from('pokemons').select(COLUMNAS_TARJETA).eq('pokemon_id', parseInt(value)));
        }

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
        types: [], generation: null, rarity: null, onlyShiny: false, onlyShadow: false,
        onlyDynamax: false, onlyGigantamax: false
    });

    /** Cuántos filtros hay puestos, para el contador del botón. */
    const activeFilterCount = computed(() => {
        const active = filters.value;
        return active.types.length
            + (active.generation ? 1 : 0)
            + (active.rarity ? 1 : 0)
            + (active.onlyShiny ? 1 : 0)
            + (active.onlyShadow ? 1 : 0)
            + (active.onlyDynamax ? 1 : 0)
            + (active.onlyGigantamax ? 1 : 0);
    });

    const getPokemon = (id) => {
        if(!id) {
            console.warn('No se ha encontrado ID para buscar al pokemon.');
            return undefined;
        }
        return pokemonList.value.find( pokemon => pokemon.pokemon_id === id );
    }

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
        isLoading,
        isSearching,
        searchTerm,
        setIsSearching,
        pokemons
    }
  })
