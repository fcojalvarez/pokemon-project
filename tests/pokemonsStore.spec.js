import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

/**
 * La store de la Pokédex habla con Supabase por páginas y compite consigo
 * misma: la carga inicial, el scroll infinito, los filtros y la búsqueda
 * escriben sobre la misma lista. Aquí Supabase es de mentira y cada petición
 * responde cuando el test lo dice, para poder reproducir las carreras.
 */
const peticiones = []

/** Una consulta de PostgREST que se resuelve a mano con `responder`. */
function consulta(tabla) {
  const registro = { tabla, llamadas: [] }
  let resolver
  const promesa = new Promise((r) => { resolver = r })
  registro.responder = (data, extra = {}) => resolver({ data, error: null, ...extra })
  const q = new Proxy(
    {},
    {
      get(_, metodo) {
        if (metodo === 'then') return (ok, ko) => promesa.then(ok, ko)
        return (...args) => {
          registro.llamadas.push([metodo, ...args])
          return q
        }
      }
    }
  )
  peticiones.push(registro)
  return q
}

vi.mock('../src/lib/supabaseClient', () => ({ supabase: { from: (tabla) => consulta(tabla) } }))

const { usePokemonsStore, FILTROS_VACIOS } = await import('../src/stores/pokemons')

const fila = (id, name = `P${id}`) => ({ pokemon_id: id, name })
const pagina = (desde, hasta) => Array.from({ length: hasta - desde + 1 }, (_, i) => fila(desde + i))
const llamada = (registro, metodo) => registro.llamadas.find(([m]) => m === metodo)
const esperar = () => new Promise((r) => setTimeout(r, 0))

describe('store de la Pokédex', () => {
  let store
  beforeEach(() => {
    peticiones.length = 0
    setActivePinia(createPinia())
    store = usePokemonsStore()
  })

  it('pide las páginas de 100 en 100 sin repetir la última fila', async () => {
    const carga = store.getPokemons()
    expect(store.isLoading).toBe(true)
    // `range` incluye los dos extremos: la primera página es 0-99.
    expect(llamada(peticiones[0], 'range')).toEqual(['range', 0, 99])
    peticiones[0].responder(pagina(1, 100))
    await carga
    expect(store.pokemons).toHaveLength(100)
    expect(store.isLoading).toBe(false)
  })

  it('una búsqueda que sustituye a la carga no deja la carga encendida', async () => {
    store.getPokemons()
    const busqueda = store.filterPokemons('25')
    // La búsqueda por número pide su fila; la carga de antes ya no pinta nada.
    expect(store.isLoading).toBe(false)
    peticiones[1].responder([fila(25, 'Pikachu')])
    await busqueda
    peticiones[0].responder(pagina(1, 100))
    await esperar()
    expect(store.pokemons.map((p) => p.name)).toEqual(['Pikachu'])
    // Antes se quedaba en true para siempre y el scroll infinito no volvía.
    expect(store.isLoading).toBe(false)
  })

  it('el desplegable del buscador no cancela la página que se está cargando', async () => {
    const carga = store.getPokemons()
    const desplegable = store.filterPokemons('25', true)
    peticiones[1].responder([fila(25, 'Pikachu')])
    expect(await desplegable).toEqual([fila(25, 'Pikachu')])
    peticiones[0].responder(pagina(1, 100))
    await carga
    expect(store.pokemons).toHaveLength(100)
    expect(store.isLoading).toBe(false)
  })

  it('si la petición falla, la carga se apaga igual', async () => {
    const carga = store.getPokemons()
    peticiones[0].responder(null, { error: { message: 'sin red' } })
    const aviso = vi.spyOn(console, 'error').mockImplementation(() => {})
    await carga
    expect(store.isLoading).toBe(false)
    expect(store.pokemons).toEqual([])
    aviso.mockRestore()
  })

  it('los nombres para buscar se piden una sola vez aunque se escriba rápido', async () => {
    const a = store.filterPokemons('pi', true)
    const b = store.filterPokemons('pik', true)
    const deNombres = peticiones.filter((p) => llamada(p, 'select')?.[1]?.startsWith('pokemon_id,name,is_shiny'))
    expect(deNombres).toHaveLength(1)
    // Sin .range, Supabase corta en 1000 filas.
    expect(llamada(deNombres[0], 'range')).toEqual(['range', 0, 1999])
    deNombres[0].responder([fila(25, 'Pikachu'), fila(172, 'Pichu'), fila(1025, 'Pecharunt')])
    expect((await a).map((p) => p.name)).toEqual(['Pikachu', 'Pichu'])
    expect((await b).map((p) => p.name)).toEqual(['Pikachu'])
  })

  it('busca sin fijarse en tildes ni signos, y primero lo que empieza así', async () => {
    const r = store.filterPokemons('mime', true)
    peticiones[0].responder([fila(439, 'Mime Jr.'), fila(122, 'Mr. Mime'), fila(866, 'Mr. Rime')])
    expect((await r).map((p) => p.name)).toEqual(['Mime Jr.', 'Mr. Mime'])
    const hooh = store.filterPokemons('hooh', true)
    expect((await hooh)).toEqual([])
  })

  it('los filtros van en la consulta y cuentan para el botón', async () => {
    const cambio = store.setFilters({ types: ['grass', 'poison'], onlyShiny: true })
    expect(store.activeFilterCount).toBe(3)
    const q = peticiones[0]
    expect(llamada(q, 'contains')).toEqual(['contains', 'types', '["grass","poison"]'])
    expect(llamada(q, 'eq')).toEqual(['eq', 'is_shiny_released', true])
    // Con filtros se cuenta el total en la primera página.
    expect(llamada(q, 'select')[2]).toEqual({ count: 'exact' })
    q.responder([fila(1)], { count: 1 })
    expect(await cambio).toBe(1)

    const limpio = store.clearFilters()
    peticiones[1].responder(pagina(1, 100))
    await limpio
    expect(store.filters).toEqual(FILTROS_VACIOS)
    expect(store.activeFilterCount).toBe(0)
  })

  it('al borrar la búsqueda vuelve la lista que había', async () => {
    const carga = store.getPokemons()
    peticiones[0].responder(pagina(1, 100))
    await carga
    const busqueda = store.filterPokemons('25')
    peticiones[1].responder([fila(25, 'Pikachu')])
    await busqueda
    expect(store.pokemons).toHaveLength(1)
    store.setIsSearching(true)
    await store.filterPokemons('')
    expect(store.pokemons).toHaveLength(100)
    expect(store.searchTerm).toBe('')
    // Si se quedaba «buscando», el scroll infinito no volvía a cargar.
    expect(store.isSearching).toBe(false)
  })
})
