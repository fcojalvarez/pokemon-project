import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { FEEDS } from '../src/utils/liveFeed'
import { useLiveStore } from '../src/stores/live'

/**
 * La store de «Ahora en el juego»: baja los cuatro feeds de ScrapedDuck, los
 * guarda para abrir sin cobertura y los agrupa para las vistas.
 */
const AHORA = new Date('2026-09-28T12:00:00')

const FEED = {
  events: [
    { eventID: 'ya', name: 'Ya empezó', start: '2026-09-27T10:00:00', end: '2026-09-29T20:00:00' },
    { eventID: 'antes', name: 'Acaba antes', start: '2026-09-27T10:00:00', end: '2026-09-28T20:00:00' },
    { eventID: 'luego', name: 'Luego', start: '2026-10-01T10:00:00', end: '2026-10-02T20:00:00' },
    { eventID: 'paso', name: 'Pasó', start: '2026-09-01T10:00:00', end: '2026-09-02T20:00:00' }
  ],
  raids: [
    { name: 'Groudon', tier: '5-Star Raids' },
    { name: 'Shadow Machop', tier: '1-Star Raids' },
    { name: 'Dratini', tier: '1-Star Raids' },
    { name: 'Mega Malamar', tier: 'Mega Raids' },
    { name: 'Shadow Lugia', tier: '5-Star Raids' }
  ],
  eggs: [
    { name: 'Corsola (Galarian)', eggType: '7 km' },
    { name: 'Corsola (Galarian)', eggType: '7 km' },
    { name: 'Riolu', eggType: '10 km' },
    { name: 'Pichu', eggType: '2 km' }
  ],
  research: [{ text: 'Catch 5 Pokémon', type: 'catch', rewards: [{ name: 'Machop' }] }]
}

const responder = (fallar = false) =>
  vi.fn(async (url) => {
    if (fallar) throw new Error('sin red')
    const clave = Object.keys(FEEDS).find((k) => FEEDS[k] === url)
    return { ok: true, json: async () => FEED[clave] }
  })

describe('store en vivo', () => {
  let live
  beforeEach(() => {
    // El reloj de la store es un setInterval: con temporizadores falsos no se
    // queda uno vivo por test.
    vi.useFakeTimers({ toFake: ['setInterval', 'Date'] })
    vi.setSystemTime(AHORA)
    localStorage.clear()
    setActivePinia(createPinia())
    live = useLiveStore()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('baja los cuatro feeds, queda lista y lo guarda para la próxima vez', async () => {
    const fetch = responder()
    vi.stubGlobal('fetch', fetch)
    await live.load()
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(live.status).toBe('ready')
    expect(live.isStale).toBe(false)
    const guardado = JSON.parse(localStorage.getItem('pogodex:live'))
    expect(guardado.raids).toHaveLength(5)
    expect(guardado.fetchedAt).toBe(AHORA.toISOString())
  })

  it('una segunda llamada no vuelve a pedir nada', async () => {
    const fetch = responder()
    vi.stubGlobal('fetch', fetch)
    await live.load()
    await live.load()
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('con la caché reciente abre ya con ella mientras baja lo nuevo', async () => {
    localStorage.setItem('pogodex:live', JSON.stringify({ ...FEED, raids: [{ name: 'Viejo', tier: '1-Star Raids' }], fetchedAt: AHORA.toISOString() }))
    let soltar
    vi.stubGlobal('fetch', vi.fn(() => new Promise((r) => { soltar = r })))
    const carga = live.load()
    expect(live.status).toBe('ready')
    expect(live.raids.map((r) => r.name)).toEqual(['Viejo'])
    soltar({ ok: false, status: 500 })
    await carga
  })

  it('sin red, tira de la caché aunque haya caducado, y avisa de que es vieja', async () => {
    const hace = new Date(AHORA.getTime() - 24 * 3600 * 1000).toISOString()
    localStorage.setItem('pogodex:live', JSON.stringify({ ...FEED, fetchedAt: hace }))
    vi.stubGlobal('fetch', responder(true))
    await live.load()
    expect(live.status).toBe('ready')
    expect(live.raids).toHaveLength(5)
    expect(live.isStale).toBe(true)
    expect(live.error).toBe('sin red')
  })

  it('sin red y sin caché, error', async () => {
    vi.stubGlobal('fetch', responder(true))
    await live.load()
    expect(live.status).toBe('error')
  })

  it('una respuesta que no es 200 cuenta como fallo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 })))
    await live.load()
    expect(live.status).toBe('error')
    expect(live.error).toBe('HTTP 503')
  })

  it('dos cargas a la vez son una sola, y las dos esperan a que acabe', async () => {
    const fetch = responder()
    vi.stubGlobal('fetch', fetch)
    const a = live.load()
    const b = live.load()
    await Promise.all([a, b])
    expect(fetch).toHaveBeenCalledTimes(4)
    expect(live.status).toBe('ready')
  })

  it('la recarga automática refresca por detrás, sin volver a «cargando»', async () => {
    vi.stubGlobal('fetch', responder())
    await live.load()
    const estados = []
    let soltar
    vi.stubGlobal('fetch', vi.fn(() => new Promise((r) => { soltar = r })))
    // Pasa el plazo de la caché y llega el tic de los 30 s.
    vi.setSystemTime(new Date(AHORA.getTime() + 7 * 3600 * 1000))
    vi.advanceTimersByTime(30_000)
    estados.push(live.status)
    soltar({ ok: false, status: 500 })
    await vi.waitFor(() => expect(live.error).toBe('HTTP 500'))
    estados.push(live.status)
    // Nunca se enseña el esqueleto: los datos siguen ahí y marcados como viejos.
    expect(estados).toEqual(['ready', 'ready'])
    expect(live.raids).toHaveLength(5)
    expect(live.isStale).toBe(true)
  })

  it('sin red, la recarga automática no lo reintenta cada 30 s', async () => {
    vi.stubGlobal('fetch', responder())
    await live.load()
    const sinRed = responder(true)
    vi.stubGlobal('fetch', sinRed)
    vi.setSystemTime(new Date(AHORA.getTime() + 7 * 3600 * 1000))
    vi.advanceTimersByTime(30_000)
    await vi.waitFor(() => expect(live.error).toBe('sin red'))
    // Que acabe del todo la carga fallida (su finally) antes de mover el reloj.
    await new Promise((r) => setImmediate(r))
    expect(sinRed).toHaveBeenCalledTimes(4)
    // Unos minutos más de tics: nada nuevo hasta pasado el plazo de reintento.
    vi.advanceTimersByTime(4 * 60_000)
    expect(sinRed).toHaveBeenCalledTimes(4)
    vi.advanceTimersByTime(90_000)
    await vi.waitFor(() => expect(sinRed).toHaveBeenCalledTimes(8))
  })

  it('un evento que no cambia de estado es el mismo objeto de una vez a otra', async () => {
    vi.stubGlobal('fetch', responder())
    await live.load()
    const antes = live.active[0]
    vi.advanceTimersByTime(30_000)
    expect(live.active[0]).toBe(antes)
  })

  describe('agrupado', () => {
    beforeEach(async () => {
      vi.stubGlobal('fetch', responder())
      await live.load()
    })

    it('eventos en marcha por el que acaba antes, y los próximos por fecha; los pasados fuera', () => {
      expect(live.active.map((e) => e.eventID)).toEqual(['antes', 'ya'])
      expect(live.upcoming.map((e) => e.eventID)).toEqual(['luego'])
    })

    it('incursiones por nivel, y las oscuras aparte con su nivel', () => {
      const grupos = live.raidsByTier
      expect(grupos.map((g) => g.name)).toEqual(['1-Star Raids', '5-Star Raids', 'Mega Raids', 'shadow'])
      const oscuras = grupos.at(-1)
      expect(oscuras.shadow).toBe(true)
      // De menor a mayor nivel, como el resto.
      expect(oscuras.list.map((r) => r.name)).toEqual(['Shadow Machop', 'Shadow Lugia'])
    })

    it('huevos por distancia, sin repetir el mismo Pokémon en el mismo huevo', () => {
      expect(live.eggsByType.map((g) => g.name)).toEqual(['2 km', '7 km', '10 km'])
      expect(live.eggsByType[1].list).toHaveLength(1)
    })

    it('dónde sale un Pokémon: incursiones, huevos y recompensas de tareas', () => {
      const machop = live.whereToFind('Machop')
      expect(machop.raids.map((r) => r.name)).toEqual(['Shadow Machop'])
      expect(machop.research).toHaveLength(1)
      expect(live.whereToFind('Corsola').eggs.map((e) => e.eggType)).toContain('7 km')
      expect(live.whereToFind('Snorlax')).toEqual({ raids: [], eggs: [], research: [] })
    })

    it('la antigüedad de los datos avanza con el reloj de la store', () => {
      expect(live.cacheAge).toBe(0)
      vi.advanceTimersByTime(30_000)
      expect(live.cacheAge).toBe(30_000)
    })
  })
})
