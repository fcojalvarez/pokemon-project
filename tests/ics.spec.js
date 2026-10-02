import { describe, expect, it } from 'vitest'
import { eventoIcs, nombreIcs } from '../src/utils/ics'

const inicio = new Date(2026, 9, 7, 14, 0, 0)
const fin = new Date(2026, 9, 7, 17, 0, 0)
const ahora = new Date(Date.UTC(2026, 9, 2, 9, 15, 0))

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

  it('sin fin dura una hora', () => {
    const ics = eventoIcs({ id: 'x', titulo: 'x', inicio }, ahora)
    expect(ics).toContain('DTEND:20261007T150000')
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

  it('añade url y descripción solo si las hay', () => {
    const sin = eventoIcs({ id: 'x', titulo: 'x', inicio }, ahora)
    expect(sin).not.toContain('URL:')
    expect(sin).not.toContain('DESCRIPTION:')
    const con = eventoIcs({ id: 'x', titulo: 'x', inicio, url: 'https://a.b/c' }, ahora)
    expect(con).toContain('URL:https://a.b/c')
  })
})

describe('nombreIcs', () => {
  it('quita acentos y símbolos', () => {
    expect(nombreIcs('Día de la Comunidad: Pikachu')).toBe('dia-de-la-comunidad-pikachu.ics')
    expect(nombreIcs('')).toBe('evento.ics')
  })
})
