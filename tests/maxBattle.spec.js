import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { maxCounters, mejorRapido, opcionesMax, potenciaMax } from '../src/utils/maxBattle'

const DATA = path.join(process.cwd(), 'public', 'data')
const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'))
const roster = read('roster.json')
const chart = read('typechart.json').chart
const movesJson = read('moves.json')
const maxbattles = read('maxbattles.json')
const datos = {
  moves: movesJson.moves ?? movesJson,
  maxPorTipo: maxbattles.byType,
  gmaxPorEspecie: maxbattles.gmaxBySpecies
}
const porId = (id) => roster.find((p) => p.id === id)

/**
 * El Ataque Max de un Dinamax es del tipo de su ataque RÁPIDO, no de su tipo
 * principal: Excadrill con Disparo Lodo usa Maxitemblor y con Garra Metal,
 * Maximetal. El Gigamax es fijo.
 */
describe('Ataques Max según el ataque rápido', () => {
  it('da un Ataque Max por cada tipo de rápido', () => {
    const opciones = opcionesMax(porId('excadrill'), datos)
    const porTipo = Object.fromEntries(opciones.map((o) => [o.max.type, o]))
    expect(Object.keys(porTipo).sort()).toEqual(['ground', 'steel'])
    expect(porTipo.ground.max.nameEs).toBe('Maxitemblor')
    expect(porTipo.ground.rapidos.map((r) => r.id).sort()).toEqual(['MUD_SHOT', 'MUD_SLAP'])
    expect(porTipo.steel.rapidos.map((r) => r.id)).toEqual(['METAL_CLAW'])
    // Excadrill es tierra/acero: los dos llevan STAB.
    expect(porTipo.ground.stab && porTipo.steel.stab).toBe(true)
  })

  it('marca sin STAB el Ataque Max de un tipo que no es el suyo', () => {
    const kingler = opcionesMax(porId('kingler'), datos)
    const tierra = kingler.find((o) => !o.gigamax && o.max.type === 'ground')
    expect(tierra?.stab).toBe(false)
  })

  it('el Gigamax va aparte, con su ataque fijo', () => {
    const gigamax = opcionesMax(porId('charizard'), datos).filter((o) => o.gigamax)
    expect(gigamax).toHaveLength(1)
    expect(gigamax[0].max.nameEs).toBe('Gigallamarada')
    expect(gigamax[0].rapidos).toEqual([])
  })

  it('el mejor rápido es el de más daño por segundo, con STAB', () => {
    const charizard = porId('charizard')
    const mejor = mejorRapido(charizard, datos.moves)
    const dps = (id) => {
      const m = datos.moves[id]
      return (m.pve.power * (charizard.types.includes(m.type) ? 1.2 : 1)) / m.pve.duration
    }
    for (const id of charizard.fast) expect(dps(mejor.id)).toBeGreaterThanOrEqual(dps(id))
  })

  it('en un empate de daño gana el rápido de su tipo', () => {
    // Blastoise: Mordisco (6 / 0,5 s) y Pistola Agua (5 × 1,2 / 0,5 s) empatan.
    expect(mejorRapido(porId('blastoise'), datos.moves)?.id).toBe('WATER_GUN')
  })

  it('Zacian coronado usa su Ataque Max exclusivo, fijo y a 450', () => {
    const conExclusivos = { ...datos, exclusivoPorForma: maxbattles.exclusiveByForm }
    const opciones = opcionesMax(porId('zacian_crowned_sword'), conExclusivos)
    const exclusivo = opciones.find((o) => o.exclusivo)
    expect(exclusivo?.max.nameEs).toBe('Tajo Supremo')
    expect(potenciaMax(exclusivo.max)).toBe(450)
    // Sustituye a los de sus rápidos: no le queda ningún otro de Dinamax.
    expect(opciones.filter((o) => !o.gigamax && !o.exclusivo)).toEqual([])
  })

  it('la potencia sale de los datos: 350 un Ataque Max y 450 un Gigamax', () => {
    expect(potenciaMax(maxbattles.byType.fire)).toBe(350)
    expect(potenciaMax(maxbattles.gmaxBySpecies.CHARIZARD)).toBe(450)
  })

  it('quien solo sale en Gigamax no tiene Ataques Max de rápidos', () => {
    const snorlax = opcionesMax(porId('snorlax'), datos)
    expect(snorlax.every((o) => o.gigamax)).toBe(true)
  })

  it('en el equipo, cada atacante lleva el rápido que mejor le pega', () => {
    // Contra Articuno (hielo/volador) lo mejor es roca: quien lleve un rápido
    // de roca tiene que salir con él, aunque su tipo principal sea otro.
    const { attackers } = maxCounters(jefe('Articuno'), roster, chart, { limit: 10, ...datos })
    expect(attackers.length).toBeGreaterThan(0)
    for (const uno of attackers) {
      expect(uno.maxMove?.type).toBe(uno.maxType)
      // Con un ataque fijo (Gigamax, exclusivo) el rápido es el que mejor carga.
      if (uno.fastMove && !uno.maxFijo) expect(uno.fastMove.type).toBe(uno.maxType)
    }
    expect(attackers[0].maxType).toBe('rock')
  })
})

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
