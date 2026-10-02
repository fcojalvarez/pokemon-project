import { describe, expect, it } from 'vitest'
import {
  categoriaDeEvento,
  claveAplicacion,
  eventosPorAvisar,
  instanteEnZona
} from '../src/utils/avisos'

describe('avisos', () => {
  it('cada tipo de evento con su categoría; los largos no avisan', () => {
    expect(categoriaDeEvento('community-day')).toBe('community')
    expect(categoriaDeEvento('raid-hour')).toBe('hours')
    expect(categoriaDeEvento('max-mondays')).toBe('raids')
    expect(categoriaDeEvento('event')).toBe('events')
    expect(categoriaDeEvento('raid-battles')).toBeNull()
    expect(categoriaDeEvento('go-battle-league')).toBeNull()
  })

  it('la hora local de LeekDuck es la de la zona de cada uno, con su cambio de hora', () => {
    // Madrid en verano va a UTC+2 y en invierno a UTC+1.
    expect(instanteEnZona('2026-10-10T14:00:00.000', 'Europe/Madrid').toISOString()).toBe(
      '2026-10-10T12:00:00.000Z'
    )
    expect(instanteEnZona('2026-11-14T14:00:00.000', 'Europe/Madrid').toISOString()).toBe(
      '2026-11-14T13:00:00.000Z'
    )
    expect(instanteEnZona('2026-10-10T14:00:00.000', 'America/Mexico_City').toISOString()).toBe(
      '2026-10-10T20:00:00.000Z'
    )
    // Las globales, con «Z», no se mueven.
    expect(instanteEnZona('2026-10-06T20:00:00.000Z', 'Europe/Madrid').toISOString()).toBe(
      '2026-10-06T20:00:00.000Z'
    )
    expect(instanteEnZona(null, 'Europe/Madrid')).toBeNull()
  })

  it('avisa de lo elegido que empieza dentro de la hora, y de nada más', () => {
    const eventos = [
      { eventID: 'cd', eventType: 'community-day', start: '2026-10-10T14:00:00.000' },
      { eventID: 'spot', eventType: 'pokemon-spotlight-hour', start: '2026-10-10T14:10:00.000' },
      { eventID: 'tarde', eventType: 'community-day', start: '2026-10-10T15:30:00.000' },
      { eventID: 'rot', eventType: 'raid-battles', start: '2026-10-10T14:00:00.000' }
    ]
    // 13:15 en Madrid.
    const ahora = new Date('2026-10-10T11:15:00.000Z')
    const ids = (categorias) =>
      eventosPorAvisar(eventos, { ahora, zona: 'Europe/Madrid', categorias }).map((e) => e.eventID)
    expect(ids(['community'])).toEqual(['cd'])
    expect(ids(['community', 'hours'])).toEqual(['cd', 'spot'])
    expect(ids([])).toEqual([])
    // Ya empezado: no.
    const tarde = new Date('2026-10-10T12:05:00.000Z')
    expect(
      eventosPorAvisar(eventos, { ahora: tarde, zona: 'Europe/Madrid', categorias: ['community'] })
    ).toEqual([])
  })

  it('la clave VAPID en base64url pasa a bytes', () => {
    expect([...claveAplicacion('AQID_-8')]).toEqual([1, 2, 3, 255, 239])
  })
})

describe('texto del aviso', async () => {
  const { textoAviso } = await import('../scripts/send-push.mjs')
  const evento = { eventID: 'cd-oct', name: 'October Community Day' }

  it('en español, con la traducción si la hay', () => {
    const traducciones = { 'October Community Day': { texto: 'Día de la Comunidad de octubre' } }
    expect(textoAviso(evento, 'es', traducciones)).toEqual({
      title: 'Empieza en 1 hora',
      body: 'Día de la Comunidad de octubre',
      url: '/events',
      tag: 'cd-oct'
    })
    expect(textoAviso(evento, 'es').body).toBe('October Community Day')
  })

  it('en inglés, el nombre original', () => {
    expect(textoAviso(evento, 'en').title).toBe('Starts in 1 hour')
    expect(textoAviso(evento, 'en').body).toBe('October Community Day')
  })
})
