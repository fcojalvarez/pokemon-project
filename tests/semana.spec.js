import { describe, expect, it } from 'vitest'
import { diasDeLaSemana } from '../src/utils/semana'

const ev = (eventID, inicio, fin) => ({
  eventID,
  startDate: inicio ? new Date(inicio) : null,
  endDate: fin ? new Date(fin) : null
})

describe('diasDeLaSemana', () => {
  // Viernes 2 de octubre de 2026, 13:00 (hora local).
  const ahora = new Date(2026, 9, 2, 13, 0)
  const eventos = [
    ev('temporada', '2026-09-01T10:00', '2026-12-01T10:00'),
    ev('acaba-pronto', '2026-09-27T10:00', '2026-10-02T20:00'),
    ev('ya-acabo', '2026-09-27T10:00', '2026-10-02T12:00'),
    ev('hoy-tarde', '2026-10-02T18:00', '2026-10-02T19:00'),
    ev('hoy-manana', '2026-10-02T10:00', '2026-10-02T20:00'),
    ev('cd', '2026-10-10T14:00', '2026-10-10T17:00'),
    ev('sabado', '2026-10-03T14:00', '2026-10-03T17:00'),
    ev('sin-fecha', null, null)
  ]
  const dias = diasDeLaSemana(eventos, ahora)
  const ids = (lista) => lista.map((e) => e.eventID)

  it('siete días desde hoy a medianoche', () => {
    expect(dias).toHaveLength(7)
    expect(dias[0].fecha).toEqual(new Date(2026, 9, 2))
    expect(dias[6].fecha).toEqual(new Date(2026, 9, 8))
  })

  it('hoy: lo que empieza hoy por hora, y lo que ya iba y no ha acabado, por el que acaba antes', () => {
    expect(ids(dias[0].empiezan)).toEqual(['hoy-manana', 'hoy-tarde'])
    expect(ids(dias[0].enMarcha)).toEqual(['acaba-pronto', 'temporada'])
  })

  it('los demás días, solo lo que empieza; lo de fuera de la semana no sale', () => {
    expect(ids(dias[1].empiezan)).toEqual(['sabado'])
    expect(dias[1].enMarcha).toEqual([])
    expect(dias.flatMap((d) => ids(d.empiezan))).not.toContain('cd')
  })
})
