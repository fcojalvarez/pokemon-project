import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Supabase de mentira: guarda qué se le ha pedido y responde con `tabla`.
 * `select('name,updated_at')` es la pregunta por las versiones; con `payload`,
 * la descarga de verdad.
 */
const tabla = {}
const pedidas = []
/** Sin red: Supabase contesta con error (o la petición falla del todo). */
const red = { caida: false, lanza: false }
vi.mock('../src/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: (columnas) => ({
        in: async (_campo, nombres) => {
          if (red.lanza) throw new TypeError('Failed to fetch')
          if (red.caida) return { data: null, error: { message: 'sin red' } }
          const conPayload = columnas.includes('payload')
          if (conPayload) pedidas.push(...nombres)
          const data = nombres
            .filter((nombre) => tabla[nombre])
            .map((name) => ({ name, updated_at: tabla[name].updated_at, ...(conPayload ? { payload: tabla[name].payload } : {}) }))
          return { data, error: null }
        }
      })
    })
  }
}))

/** Cada prueba con una base de datos vacía y el módulo recién cargado. */
async function nuevo() {
  vi.resetModules()
  await new Promise((resolve) => {
    const borrar = indexedDB.deleteDatabase('pogodex-datos')
    borrar.onsuccess = borrar.onerror = borrar.onblocked = resolve
  })
  return import('../src/lib/filasDeDatos')
}

/** Lo guarda sin esperar: se le da un momento antes de la siguiente lectura. */
const guardado = () => new Promise((resolve) => setTimeout(resolve, 20))

beforeEach(() => {
  pedidas.length = 0
  red.caida = false
  red.lanza = false
  for (const nombre of Object.keys(tabla)) delete tabla[nombre]
  tabla.roster = { updated_at: '2026-09-27T20:08:04Z', payload: [{ id: 'bulbasaur' }] }
  tabla.moves = { updated_at: '2026-09-27T20:08:04Z', payload: { TACKLE: {} } }
})

describe('leerFilas', () => {
  it('la primera vez las baja todas', async () => {
    const { leerFilas } = await nuevo()
    const filas = await leerFilas(['roster', 'moves'])
    expect(filas.roster).toEqual([{ id: 'bulbasaur' }])
    expect(pedidas.sort()).toEqual(['moves', 'roster'])
  })

  it('si no han cambiado, salen del dispositivo sin bajar nada', async () => {
    const { leerFilas } = await nuevo()
    await leerFilas(['roster', 'moves'])
    await guardado()
    pedidas.length = 0

    const filas = await leerFilas(['roster', 'moves'])
    expect(pedidas).toEqual([])
    expect(filas.moves).toEqual({ TACKLE: {} })
  })

  it('baja solo la que ha cambiado en Supabase', async () => {
    const { leerFilas } = await nuevo()
    await leerFilas(['roster', 'moves'])
    await guardado()
    pedidas.length = 0

    tabla.roster = { updated_at: '2026-09-28T06:00:00Z', payload: [{ id: 'ivysaur' }] }
    const filas = await leerFilas(['roster', 'moves'])
    expect(pedidas).toEqual(['roster'])
    expect(filas.roster).toEqual([{ id: 'ivysaur' }])
  })

  it('una fila que no está en la tabla no viene', async () => {
    const { leerFilas } = await nuevo()
    const filas = await leerFilas(['roster', 'maxlive'])
    expect(Object.keys(filas)).toEqual(['roster'])
  })

  it('sin red, lo guardado en el dispositivo, aunque no se pueda comprobar si sigue al día', async () => {
    const { leerFilas } = await nuevo()
    await leerFilas(['roster', 'moves'])
    await guardado()
    red.caida = true
    expect((await leerFilas(['roster', 'moves'])).roster).toEqual([{ id: 'bulbasaur' }])
    red.caida = false
    red.lanza = true
    expect((await leerFilas(['roster'])).roster).toEqual([{ id: 'bulbasaur' }])
  })

  it('sin red y sin nada guardado, el error (y la app tira de los ficheros)', async () => {
    const { leerFilas } = await nuevo()
    red.caida = true
    await expect(leerFilas(['roster'])).rejects.toThrow('sin red')
  })

  it('sin IndexedDB, se baja todo cada vez', async () => {
    const { leerFilas } = await nuevo()
    const original = window.indexedDB
    window.indexedDB = undefined
    try {
      await leerFilas(['roster'])
      await leerFilas(['roster'])
    } finally {
      window.indexedDB = original
    }
    expect(pedidas).toEqual(['roster', 'roster'])
  })
})
