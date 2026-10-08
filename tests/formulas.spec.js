import { describe, expect, it } from 'vitest'
import {
  calcCP,
  calcHP,
  cpm,
  damage,
  effectiveStats,
  movesetPerformance,
  TIEMPO_POR_CAIDA
} from '../src/utils/formulas'

const PERFECT = { atk: 15, def: 15, hp: 15 }

// Estadísticas base reales del GAME_MASTER.
const MEWTWO = { atk: 300, def: 182, hp: 214 }
const RAYQUAZA = { atk: 284, def: 170, hp: 213 }
const SLAKING = { atk: 290, def: 166, hp: 284 }
const CHARIZARD = { atk: 223, def: 173, hp: 186 }
const BULBASAUR = { atk: 118, def: 111, hp: 128 }
const BLISSEY = { atk: 129, def: 169, hp: 496 }

describe('cpm', () => {
  it('devuelve el valor del GAME_MASTER en niveles enteros', () => {
    expect(cpm(1)).toBe(0.094)
    expect(cpm(40)).toBe(0.7903)
    expect(cpm(50)).toBe(0.8403)
  })

  it('interpola los medios niveles con la media cuadrática', () => {
    expect(cpm(1.5)).toBeCloseTo(0.135137432, 9)
    expect(cpm(39.5)).toBeCloseTo(0.78747359, 8)
  })

  it('rechaza niveles fuera de rango', () => {
    expect(() => cpm(0)).toThrow(RangeError)
  })
})

describe('calcCP', () => {
  // Valores contrastables con el propio juego.
  it.each([
    ['Mewtwo nivel 40', MEWTWO, 40, 4178],
    ['Mewtwo nivel 50', MEWTWO, 50, 4724],
    ['Rayquaza nivel 40', RAYQUAZA, 40, 3835],
    ['Slaking nivel 40', SLAKING, 40, 4431],
    ['Charizard nivel 40', CHARIZARD, 40, 2889],
    ['Bulbasaur nivel 20', BULBASAUR, 20, 637]
  ])('%s', (_, base, level, expected) => {
    expect(calcCP(base, PERFECT, level)).toBe(expected)
  })

  it('nunca baja de 10', () => {
    expect(calcCP({ atk: 10, def: 10, hp: 10 }, { atk: 0, def: 0, hp: 0 }, 1)).toBe(10)
  })
})

describe('calcHP', () => {
  it('trunca hacia abajo', () => {
    expect(calcHP(BLISSEY, 15, 40)).toBe(403)
    expect(calcHP(BULBASAUR, 15, 20)).toBe(85)
  })
})

describe('effectiveStats', () => {
  it('aplica los multiplicadores de Pokémon oscuro', () => {
    const normal = effectiveStats(MEWTWO, PERFECT, 40)
    const shadow = effectiveStats(MEWTWO, PERFECT, 40, { shadow: true })
    expect(shadow.atk / normal.atk).toBeCloseTo(1.2, 6)
    expect(shadow.def / normal.def).toBeCloseTo(1 / 1.2, 6)
    // Los PS no cambian: el oscuro solo toca ataque y defensa.
    expect(shadow.hp).toBe(normal.hp)
  })
})

describe('damage', () => {
  it('sigue floor(0.5 · potencia · atk/def · mods) + 1', () => {
    expect(damage(100, 200, 100)).toBe(101)
    expect(damage(100, 200, 100, { stab: 1.2 })).toBe(121)
    expect(damage(100, 200, 100, { effectiveness: 1.6 })).toBe(161)
  })

  it('siempre hace al menos 1 de daño', () => {
    expect(damage(1, 1, 1000)).toBe(1)
  })
})

describe('movesetPerformance', () => {
  const stats = { atk: 200, def: 150, hp: 160 }
  const target = { def: 180 }
  const fast = { power: 10, energy: 8, duration: 1, stab: true }
  const charged = { power: 100, energy: -50, duration: 2.5, stab: true }

  it('devuelve métricas coherentes entre sí', () => {
    const result = movesetPerformance({ stats, fast, charged, target })
    expect(result.dps).toBeGreaterThan(0)
    expect(result.tdo).toBeCloseTo(result.dps * result.timeAlive, 6)
    expect(result.edps).toBeCloseTo(
      (result.dps * result.timeAlive) / (result.timeAlive + TIEMPO_POR_CAIDA),
      6
    )
    expect(result.edps).toBeLessThan(result.dps)
  })

  it('el eDPS castiga al de cristal: con el mismo DPS, rinde menos el que cae antes', () => {
    const cristal = movesetPerformance({ stats: { ...stats, def: 80 }, fast, charged, target })
    const tanque = movesetPerformance({ stats: { ...stats, def: 300 }, fast, charged, target })
    expect(cristal.edps / cristal.dps).toBeLessThan(tanque.edps / tanque.dps)
  })

  it('la energía que queda al caer se pierde: pesa más en un cargado de una barra', () => {
    const corto = movesetPerformance({ stats, fast, charged, target })
    const largo = movesetPerformance({ stats: { ...stats, hp: 1600 }, fast, charged, target })
    // Con diez veces más vida, el medio cargado perdido se reparte y el DPS sube.
    expect(largo.dps).toBeGreaterThan(corto.dps)
    const unaBarra = { ...charged, power: 200, energy: -100 }
    const perdidaUna =
      movesetPerformance({ stats: { ...stats, hp: 1600 }, fast, charged: unaBarra, target }).dps -
      movesetPerformance({ stats, fast, charged: unaBarra, target }).dps
    expect(perdidaUna).toBeGreaterThan(largo.dps - corto.dps)
  })

  it('cada vida empieza sin energía: el de cristal cae antes de que pegue su cargado', () => {
    // Cargado barato pero lento: con vida de sobra rinde; si cae antes de la
    // ventana de daño, no llega a hacer nada y solo cuentan los rápidos.
    const lento = { power: 150, energy: -33, duration: 4, damageWindow: 3.5, stab: true }
    const cristal = movesetPerformance({
      stats: { ...stats, def: 40, hp: 100 },
      fast,
      charged: lento,
      target
    })
    const fDps = cristal.fastDamage / fast.duration
    expect(cristal.timeAlive).toBeLessThan((lento.energy * -1) / 8 + lento.damageWindow)
    expect(cristal.dps).toBeLessThan(fDps * 1.5)
    const tanque = movesetPerformance({
      stats: { ...stats, hp: 1600 },
      fast,
      charged: lento,
      target
    })
    expect(tanque.dps).toBeGreaterThan(fDps * 2)
  })

  it('más defensa se traduce en más aguante', () => {
    const soft = movesetPerformance({ stats: { ...stats, def: 80 }, fast, charged, target })
    const tanky = movesetPerformance({ stats: { ...stats, def: 300 }, fast, charged, target })
    expect(tanky.timeAlive).toBeGreaterThan(soft.timeAlive)
  })
})
