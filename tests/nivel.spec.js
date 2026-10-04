import { describe, expect, it } from 'vitest'
import { claseNivel, nivelDe, NIVELES, rangoDe } from '../src/utils/nivel'

describe('nivelDe', () => {
  it('usa los cortes de la lista general de GO Hub', () => {
    expect(
      [1, 20, 21, 50, 51, 100, 101, 150, 151, 200, 201, 250, 251, 300, 301].map((r) => nivelDe(r))
    ).toEqual(['S', 'S', 'A+', 'A+', 'A', 'A', 'B+', 'B+', 'B', 'B', 'C', 'C', 'D', 'D', 'F'])
  })

  it('en la lista de un tipo, la quinta parte', () => {
    expect([4, 5, 10, 11, 20, 60, 61].map((r) => nivelDe(r, { porTipo: true }))).toEqual([
      'S',
      'A+',
      'A+',
      'A',
      'A',
      'D',
      'F'
    ])
  })
})

describe('rangoDe', () => {
  it('dice qué puestos abarca cada letra', () => {
    expect(rangoDe('S')).toEqual({ desde: 1, hasta: 20 })
    expect(rangoDe('A+')).toEqual({ desde: 21, hasta: 50 })
    expect(rangoDe('F')).toEqual({ desde: 301, hasta: null })
    expect(rangoDe('A', { porTipo: true })).toEqual({ desde: 11, hasta: 20 })
  })
})

describe('claseNivel', () => {
  it('tres grises, sin color', () => {
    const grupos = new Set(NIVELES.map(claseNivel))
    expect(grupos.size).toBe(3)
    for (const clase of grupos) expect(clase).not.toMatch(/red|green|amber|blue|yellow/)
  })
})
