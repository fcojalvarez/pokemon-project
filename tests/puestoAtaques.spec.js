import { describe, expect, it } from 'vitest'
import { puestoDeConjunto, puntuacionGeneral } from '../src/utils/puestoAtaques'

const fila = (id, edps, type = 'psychic') => ({ id, edps, charged: { type } })

describe('puestoDeConjunto', () => {
  const ranking = {
    overall: [fila('a', 30), fila('mewtwo', 19.7), fila('b', 19), fila('c', 18.5), fila('d', 17)],
    byType: {
      psychic: [fila('mewtwo', 19.7), fila('b', 19), fila('d', 17)],
      fighting: [fila('a', 30, 'fighting')]
    }
  }

  it('cuenta a los demás que pegan más, sin contarse a sí mismo', () => {
    // El propio Mewtwo está en la lista con su mejor conjunto: no cuenta.
    expect(puestoDeConjunto(fila('mewtwo', 18.1), 'mewtwo', ranking, 500)).toEqual({
      general: 4,
      tipo: 2
    })
    expect(puestoDeConjunto(fila('mewtwo', 19.7), 'mewtwo', ranking, 500)).toEqual({
      general: 2,
      tipo: 1
    })
  })

  it('en el tipo de su ataque cargado; sin lista de ese tipo, el primero', () => {
    expect(puestoDeConjunto(fila('mewtwo', 20, 'fighting'), 'mewtwo', ranking, 500).tipo).toBe(2)
    expect(puestoDeConjunto(fila('mewtwo', 20, 'ice'), 'mewtwo', ranking, 500).tipo).toBe(1)
  })

  it('por debajo del corte no inventa el puesto', () => {
    // Una lista cortada a 3 y los 3 le ganan: puede haber más por debajo.
    const cortado = { overall: [fila('a', 30), fila('b', 25), fila('c', 20)], byType: {} }
    expect(puestoDeConjunto(fila('x', 10), 'x', cortado, 3).general).toBeNull()
    expect(puestoDeConjunto(fila('x', 22), 'x', cortado, 3).general).toBe(3)
  })
})

describe('puntuacionGeneral', () => {
  it('suma sus dos mejores tipos, con el conjunto en el suyo', () => {
    const mejores = { psychic: 30, fighting: 25, ice: 10 }
    // En su tipo manda lo tuyo, aunque sea peor que su mejor conjunto.
    expect(puntuacionGeneral({ edps: 20, charged: { type: 'psychic' } }, mejores)).toBe(45)
    // Si su tipo no está entre los dos mejores, no cambia la suma.
    expect(puntuacionGeneral({ edps: 5, charged: { type: 'ice' } }, mejores)).toBe(55)
    expect(puntuacionGeneral({ edps: 12, charged: { type: 'ice' } }, {})).toBe(12)
  })

  it('con ella, la general se compara con la suma de los demás', () => {
    const ranking = {
      overall: [
        { id: 'a', edps: 30, general: 60 },
        { id: 'b', edps: 35, general: 40 }
      ],
      byType: {}
    }
    expect(puestoDeConjunto(fila('x', 32), 'x', ranking, 500, 50).general).toBe(2)
  })
})
