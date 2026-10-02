import { describe, expect, it } from 'vitest'
import { puestoDeConjunto } from '../src/utils/puestoAtaques'

const fila = (id, dps, type = 'psychic') => ({ id, dps, charged: { type } })

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
