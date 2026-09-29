import { ref, computed } from 'vue';
import { defineStore, acceptHMRUpdate } from 'pinia';
import { supabase } from '../lib/supabaseClient';
import { NEXT_LOAD_LENGTH_ITEMS } from '../utils/Settings';

/**
 * Lo que pinta cada resultado del buscador: número (y con él el sprite),
 * nombre y las marcas de liberado. Van en la lista de nombres que se baja una
 * vez por sesión; con las tres banderas son unos pocos bytes por Pokémon.
 */
const COLUMNAS_BUSCADOR = 'pokemon_id,name,is_shiny_released,can_dynamax,can_gigantamax';

/**
 * Lo que pinta la tarjeta de la Pokédex. Con `*` cada Pokémon traía también
 * sus evoluciones, encuentros, ataques… (unos 2,7 KB): una página de 100
 * pesaba 270 KB para usar un 5 %. La ficha pide su fila entera aparte.
 */
const COLUMNAS_TARJETA = 'pokemon_id,name,types,is_released,is_shiny_released,can_dynamax,can_gigantamax,sprite:sprites->>male';

/** Los filtros sin nada puesto. */
export const FILTROS_VACIOS = Object.freeze({
    types: [],
    generation: null,
    rarity: null,
    onlyShiny: false,
    onlyShadow: false,
    onlyDynamax: false,
    onlyGigantamax: false
});

/** La primera página del listado. `range` de PostgREST incluye los dos extremos. */
const PRIMERA_PAGINA = { start: 0, end: NEXT_LOAD_LENGTH_ITEMS - 1 };

export const usePokemonsStore = defineStore('pokemon', () => {
    const pokemonList = ref([]);
    /**
     * Filtros de la Pokédex. Se aplican en la consulta a Supabase, no en el
     * cliente: el listado se carga por páginas, así que filtrar lo ya traído
     * solo escondería resultados en vez de buscarlos.
     */
    const filters = ref({ ...FILTROS_VACIOS });
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
    const normalizar = (texto) => String(texto ?? '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]/g, '');
    // La promesa y no la lista: mientras llegaba la primera respuesta, cada
    // tecla pedía otra vez las 1025 filas.
    let nombres = null;
    const cargarNombres = () => {
        nombres ??= supabase.from('pokemons').select(COLUMNAS_BUSCADOR).order('pokemon_id')
            // Sin .range, Supabase corta en 1000 filas y faltarían los últimos.
            .range(0, 1999)
            .then(({ data }) => {
                // Vacía (sin red, por ejemplo): se vuelve a pedir la próxima vez.
                if(!data?.length) nombres = null;
                return data ?? [];
            }, () => {
                nombres = null;
                return [];
            });
        return nombres;
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
            // Antes pedía la tabla sin .range, y Supabase cortaba en 1000.
            if(toSearchModal) return pokemonList.value.length ? pokemonList.value : cargarNombres();
            pokemonsFiltered.value = pokemonList.value.slice(0, NEXT_LOAD_LENGTH_ITEMS);
            // Sin búsqueda ya no se está buscando: el buscador lo encendía al
            // escribir y nadie lo apagaba al vaciarlo, y con eso el scroll
            // infinito dejaba de cargar páginas.
            searchingPokemon.value = false;
            return;
        }

        // El desplegable solo necesita número y nombre.
        if(toSearchModal && isWritingName) return buscarPorNombre(value);

        // El desplegable no toca el listado, así que no compite con él: si
        // contara, un número tecleado fuera de la Pokédex cancelaba la página
        // que estuviera cargando.
        const peticion = toSearchModal ? null : nuevaPeticion();
        // La búsqueda sustituye a la carga que hubiera en marcha, que ya no
        // pintará nada: si no se soltaba aquí, el scroll infinito se quedaba
        // esperando a que acabara para siempre.
        if(!toSearchModal) isLoadingPokemons.value = false;
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

    /**
     * Pide un tramo del listado y, si sigue siendo lo último que se pidió, lo
     * pone (`poner`). La carga se apaga siempre que esta sea la última, aunque
     * falle; si otra la ha sustituido, es esa la que la apagará.
     */
    const cargarTramo = async(range, poner) => {
        const peticion = nuevaPeticion();
        isLoadingPokemons.value = true;
        try {
            const resultado = await fetchPokemonsRange(range);
            if(esLaUltima(peticion)) poner(resultado);
        } finally {
            if(esLaUltima(peticion)) isLoadingPokemons.value = false;
        }
    }

    const getPokemons = (range = PRIMERA_PAGINA) => cargarTramo(range, setPokemons);

    const addPokemons = (range) => cargarTramo(range, setAddPokemons);

    /**
     * Cambia los filtros y vuelve a empezar el listado.
     * Devuelve cuántos quedan, para que la vista sepa si aún hay más páginas.
     */
    const setFilters = async(newFilters) => {
        filters.value = { ...filters.value, ...newFilters };
        await cargarTramo(PRIMERA_PAGINA, setPokemons);
        return totalCount.value;
    }

    const clearFilters = () => setFilters(FILTROS_VACIOS);

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
        clearFilters,
        filters,
        setFilters,
        totalCount,
        filterPokemons,
        getPokemons,
        isLoading,
        isSearching,
        searchTerm,
        setIsSearching,
        pokemons
    }
  })

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(usePokemonsStore, import.meta.hot));
