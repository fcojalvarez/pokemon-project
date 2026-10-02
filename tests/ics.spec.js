import { describe, expect, it } from 'vitest'
import {
  esApple,
  eventoIcs,
  fechasCalendario,
  nombreIcs,
  urlGoogleCalendar,
  urlIcs
} from '../src/utils/ics'

const inicio = '2026-10-07T14:00:00.000'
const fin = '2026-10-07T17:00:00.000'
const ahora = new Date(Date.UTC(2026, 9, 2, 9, 15, 0))

describe('fechasCalendario', () => {
  it('las locales, sin zona; las globales, en UTC', () => {
    expect(fechasCalendario(inicio, fin)).toEqual({
      inicio: '20261007T140000',
      fin: '20261007T170000'
    })
    expect(fechasCalendario('2026-10-06T20:00:00.000Z', '2026-10-13T20:00:00.000Z')).toEqual({
      inicio: '20261006T200000Z',
      fin: '20261013T200000Z'
    })
  })

  it('sin fin dura una hora, también al cambiar de día', () => {
    expect(fechasCalendario('2026-10-07T23:30:00.000').fin).toBe('20261008T003000')
  })

  it('sin un inicio que se entienda, nada', () => {
    expect(fechasCalendario(null)).toBeNull()
    expect(fechasCalendario('mañana')).toBeNull()
  })
})

describe('eventoIcs', () => {
  it('da un VEVENT con las horas locales sin zona', () => {
    const ics = eventoIcs({ id: 'cd-oct', titulo: 'Día de la Comunidad', inicio, fin }, ahora)
    expect(ics).toContain('BEGIN:VCALENDAR\r\n')
    expect(ics).toContain('UID:cd-oct@pogodex\r\n')
    expect(ics).toContain('DTSTAMP:20261002T091500Z\r\n')
    expect(ics).toContain('DTSTART:20261007T140000\r\n')
    expect(ics).toContain('DTEND:20261007T170000\r\n')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('escapa comas, puntos y coma y saltos', () => {
    const ics = eventoIcs({ id: 'x', titulo: 'Uno, dos; tres\ncuatro', inicio }, ahora)
    expect(ics).toContain(String.raw`SUMMARY:Uno\, dos\; tres\ncuatro`)
  })

  it('pliega las líneas largas', () => {
    const ics = eventoIcs({ id: 'x', titulo: 'a'.repeat(200), inicio }, ahora)
    for (const linea of ics.split('\r\n')) expect(linea.length).toBeLessThanOrEqual(75)
    expect(ics).toContain('\r\n a')
  })

  it('añade url y descripción solo si las hay; sin fecha, nada', () => {
    const sin = eventoIcs({ id: 'x', titulo: 'x', inicio }, ahora)
    expect(sin).not.toContain('URL:')
    expect(sin).not.toContain('DESCRIPTION:')
    const con = eventoIcs({ id: 'x', titulo: 'x', inicio, url: 'https://a.b/c' }, ahora)
    expect(con).toContain('URL:https://a.b/c')
    expect(eventoIcs({ id: 'x', titulo: 'x', inicio: null }, ahora)).toBeNull()
  })
})

describe('enlaces al calendario', () => {
  it('Google Calendar con el evento relleno', () => {
    const url = new URL(
      urlGoogleCalendar({ titulo: 'Día de la Comunidad', inicio, fin, detalles: 'https://x.y' })
    )
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe('Día de la Comunidad')
    expect(url.searchParams.get('dates')).toBe('20261007T140000/20261007T170000')
    expect(url.searchParams.get('details')).toBe('https://x.y')
  })

  it('el .ics de la API, con el id y el título', () => {
    expect(urlIcs({ id: 'cd-oct', titulo: 'Día & noche' })).toBe(
      '/api/calendario?id=cd-oct&titulo=D%C3%ADa+%26+noche'
    )
    expect(urlIcs({ id: 'x', descargar: true })).toBe('/api/calendario?id=x&descargar=1')
  })

  it('reconoce iPhone, iPad y Mac; Android y Windows no', () => {
    const ua = (texto) => esApple({ userAgent: texto })
    expect(ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit')).toBe(true)
    expect(ua('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit')).toBe(true)
    expect(ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130')).toBe(true)
    expect(ua('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit Chrome/130')).toBe(false)
    expect(ua('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130')).toBe(false)
  })
})

describe('nombreIcs', () => {
  it('quita acentos y símbolos', () => {
    expect(nombreIcs('Día de la Comunidad: Pikachu')).toBe('dia-de-la-comunidad-pikachu.ics')
    expect(nombreIcs('')).toBe('evento.ics')
  })
})
