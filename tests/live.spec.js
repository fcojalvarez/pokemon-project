import { describe, expect, it } from 'vitest'
import { eventStatus, isCacheExpired, parseDate } from '../src/stores/live'
import { formatDuration } from '../src/utils/time'

/**
 * Lo que decide si la app enseña datos viejos como si fueran de ahora.
 *
 * Las incursiones, huevos y tareas del feed no traen fecha propia: lo único
 * que dice si siguen valiendo es cuándo se descargaron. Si esta regla falla,
 * el jugador va a una incursión que ya no existe.
 */
describe('caducidad de la caché en vivo', () => {
  const ahora = new Date('2026-09-26T12:00:00')
  const haceHoras = (h) => new Date(ahora.getTime() - h * 3600 * 1000).toISOString()

  it('da por buenos los datos recientes', () => {
    expect(isCacheExpired(haceHoras(0), ahora)).toBe(false)
    expect(isCacheExpired(haceHoras(5.9), ahora)).toBe(false)
  })

  it('caduca los que pasan de seis horas', () => {
    expect(isCacheExpired(haceHoras(6.1), ahora)).toBe(true)
    expect(isCacheExpired(haceHoras(24), ahora)).toBe(true)
    expect(isCacheExpired(haceHoras(24 * 7), ahora)).toBe(true)
  })

  it('caduca lo que no se sabe cuándo se descargó', () => {
    expect(isCacheExpired(null, ahora)).toBe(true)
    expect(isCacheExpired(undefined, ahora)).toBe(true)
    expect(isCacheExpired('no es una fecha', ahora)).toBe(true)
  })

  it('respeta el plazo que se le pase', () => {
    expect(isCacheExpired(haceHoras(2), ahora, 60 * 60 * 1000)).toBe(true)
    expect(isCacheExpired(haceHoras(2), ahora, 24 * 3600 * 1000)).toBe(false)
  })
})

describe('estado de un evento en los límites', () => {
  const now = new Date('2026-09-26T12:00:00')

  it('está activo justo al empezar y justo antes de acabar', () => {
    expect(eventStatus({ start: '2026-09-26T12:00:00', end: '2026-09-26T18:00:00' }, now))
      .toBe('active')
    expect(eventStatus({ start: '2026-09-26T06:00:00', end: '2026-09-26T12:00:00' }, now))
      .toBe('active')
  })

  it('pasa a pasado en cuanto se cruza el fin', () => {
    expect(eventStatus({ start: '2026-09-26T06:00:00', end: '2026-09-26T11:59:59' }, now))
      .toBe('past')
  })

  /**
   * LeekDuck publica las fechas sin zona horaria porque los eventos de Pokémon
   * GO son a la hora local de cada uno. Si esto se interpretara como UTC, en
   * España los eventos saldrían con una o dos horas de desfase.
   */
  it('lee las fechas sin zona como hora local', () => {
    const fecha = parseDate('2026-09-26T10:00:00.000')
    expect(fecha.getHours()).toBe(10)
    expect(fecha.getMinutes()).toBe(0)
  })
})

describe('formatDuration', () => {
  const s = 1000
  const m = 60 * s
  const h = 60 * m
  const d = 24 * h

  it('va soltando precisión según crece la duración', () => {
    expect(formatDuration(45 * s)).toBe('45 s')
    expect(formatDuration(5 * m + 30 * s)).toBe('5 min 30 s')
    expect(formatDuration(3 * h + 20 * m)).toBe('3 h 20 min')
    expect(formatDuration(2 * d + 4 * h)).toBe('2 d 4 h')
  })

  it('no devuelve duraciones negativas', () => {
    expect(formatDuration(0)).toBe('0 s')
    expect(formatDuration(-5000)).toBe('0 s')
  })
})
