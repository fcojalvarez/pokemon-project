import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameDataStore } from '../src/stores/gameData'

// La store importa el cliente de Supabase, que sin credenciales revienta al cargar.
vi.mock('../src/lib/supabaseClient', () => ({ supabase: {} }))

/**
 * Los combates Max los escribe un workflow cada tres horas. Si falla, la app
 * tiene que saber de cuándo son para avisar, en vez de enseñar jefes viejos.
 */
describe('antigüedad de los combates Max', () => {
  const ahora = new Date('2026-09-27T12:00:00Z')
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useGameDataStore()
  })

  it('cuenta desde que Snacknap actualizó y, si no lo dice, desde la descarga', () => {
    store.maxLive = { freshAt: '2026-09-27T10:00:00Z', fetchedAt: '2026-09-27T11:00:00Z' }
    expect(store.maxLiveEdad(ahora)).toBe(2 * 3600e3)
    store.maxLive = { freshAt: null, fetchedAt: '2026-09-27T11:00:00Z' }
    expect(store.maxLiveEdad(ahora)).toBe(3600e3)
  })

  it('sin datos no hay antigüedad ni aviso', () => {
    expect(store.maxLiveEdad(ahora)).toBeNull()
    expect(store.maxLiveCaducado(ahora)).toBe(false)
  })

  it('avisa a partir de tres pasadas seguidas sin actualizar (9 h)', () => {
    store.maxLive = { freshAt: '2026-09-27T04:00:00Z' }
    expect(store.maxLiveCaducado(ahora)).toBe(false)
    store.maxLive = { freshAt: '2026-09-27T02:00:00Z' }
    expect(store.maxLiveCaducado(ahora)).toBe(true)
  })
})
