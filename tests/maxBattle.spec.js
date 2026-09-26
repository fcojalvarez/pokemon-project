import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { maxCounters } from '../src/utils/maxBattle'

const DATA = path.join(process.cwd(), 'public', 'data')
const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'))
const roster = read('roster.json')
const chart = read('typechart.json').chart

const jefe = (nombre) => roster.find((p) => p.nameEs === nombre && !p.mega && !p.shadow)

/**
 * Un equipo Max son tres: uno aguanta con Maxibarrera y dos pegan. La regla
 * dura es que solo puede entrar quien pueda dinamaxizar; lo demás es una
 * ordenación por ataque y ventaja de tipo, porque los ataques Max no publican
 * potencia y no hay DPS que calcular.
 */
describe('equipo contra un jefe Max', () => {
  it('solo propone Pokémon que puedan dinamaxizar', () => {
    const { attackers, tanks } = maxCounters(jefe('Articuno'), roster, chart, { limit: 6 })
    const todos = [...attackers, ...tanks]
    expect(todos.length).toBeGreaterThan(0)
    for (const uno of todos) {
      const entry = roster.find((p) => p.id === uno.id)
      expect(entry.dynamax || entry.gigantamax, `${uno.nameEs} no puede dinamaxizar`).toBe(true)
    }
  })

  it('contra Articuno (hielo/volador) manda el tipo roca', () => {
    // Roca pega doble a hielo y doble a volador: x2,56. No hay nada mejor.
    const { attackers } = maxCounters(jefe('Articuno'), roster, chart, { limit: 5 })
    expect(attackers[0].maxType).toBe('rock')
    expect(attackers[0].effectiveness).toBeCloseTo(2.56, 2)
  })

  it('no propone atacantes que salgan perdiendo por tipo', () => {
    const { attackers } = maxCounters(jefe('Zapdos'), roster, chart, { limit: 8 })
    for (const uno of attackers) expect(uno.effectiveness).toBeGreaterThanOrEqual(1)
  })

  it('el primer tanque aguanta más que cualquier atacante propuesto', () => {
    // Ojo: no vale exigir que los tanques reciban menos que los atacantes.
    // Contra Moltres (fuego/volador) los mejores atacantes son de roca, que
    // resisten los dos tipos, así que aguantan de sobra. Lo que sí tiene que
    // cumplirse es que el tanque número uno sea el de más aguante de todos.
    const { attackers, tanks } = maxCounters(jefe('Moltres'), roster, chart, { limit: 6 })
    for (const uno of attackers) {
      expect(tanks[0].tankScore).toBeGreaterThanOrEqual(uno.tankScore)
    }
  })

  it('marca cuáles están hoy en los nodos', () => {
    const { tanks } = maxCounters(jefe('Moltres'), roster, chart, {
      limit: 20,
      available: new Set([113])
    })
    const chansey = tanks.find((uno) => uno.dex === 113)
    expect(chansey?.availableNow).toBe(true)
    expect(tanks.some((uno) => uno.dex !== 113 && uno.availableNow === false)).toBe(true)
  })

  it('aguanta un jefe sin tipos sin reventar', () => {
    expect(maxCounters({ types: [] }, roster, chart)).toEqual({ attackers: [], tanks: [] })
    expect(maxCounters(null, roster, chart)).toEqual({ attackers: [], tanks: [] })
  })
})

/**
 * Al evolucionar se conserva la forma Dinamax, así que un Chansey sacado de un
 * nodo se convierte en un Blissey Dinamax. Marcar solo lo que sale
 * directamente dejaba fuera media familia.
 */
describe('disponible evolucionando', () => {
  it('marca la evolución de algo que sí está en los nodos', () => {
    const { tanks } = maxCounters(jefe('Moltres'), roster, chart, {
      limit: 20,
      available: new Set([113]) // solo Chansey
    })
    const blissey = tanks.find((uno) => uno.dex === 242)
    expect(blissey?.availableNow).toBe(false)
    expect(blissey?.availableFrom?.nameEs).toBe('Chansey')
  })

  it('encadena varios saltos', () => {
    const { attackers } = maxCounters(jefe('Moltres'), roster, chart, {
      limit: 20,
      available: new Set([524]) // Roggenrola -> Boldore -> Gigalith
    })
    const gigalith = attackers.find((uno) => uno.dex === 526)
    expect(gigalith?.availableFrom?.nameEs).toBe('Roggenrola')
  })

  it('lo que sale directamente no lleva ruta de evolución', () => {
    const { tanks } = maxCounters(jefe('Moltres'), roster, chart, {
      limit: 20,
      available: new Set([113, 242]) // Chansey y Blissey, los dos en nodos
    })
    const blissey = tanks.find((uno) => uno.dex === 242)
    expect(blissey?.availableNow).toBe(true)
    expect(blissey?.availableFrom).toBeNull()
  })
})
