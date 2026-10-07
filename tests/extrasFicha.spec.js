import { describe, expect, it } from 'vitest'
import {
  cortesDeRasgos,
  efectosAventura,
  evolucionesBaratas,
  rasgosPvp
} from '../scripts/lib/extrasFicha.mjs'
import { datosIncursion, jugadoresNecesarios } from '../src/utils/incursion'

const especie = (pokemonId, ramas, form) => ({
  templateId: `X_${pokemonId}`,
  data: { pokemonSettings: { pokemonId, form, evolutionBranch: ramas } }
})

describe('evoluciones baratas', () => {
  it('12 o 25 caramelos, gratis al intercambiar, y nada con más', () => {
    const gm = [
      especie('PIDGEY', [{ evolution: 'PIDGEOTTO', candyCost: 12 }]),
      especie('EEVEE', [{ evolution: 'VAPOREON', candyCost: 25 }, { evolution: 'LEAFEON', candyCost: 25 }], 'EEVEE_NORMAL'),
      especie('KADABRA', [{ evolution: 'ALAKAZAM', candyCost: 100, noCandyCostViaTrade: true }]),
      especie('IVYSAUR', [{ evolution: 'VENUSAUR', candyCost: 100 }]),
      // La megaevolución no es una evolución.
      especie('VENUSAUR', [{ temporaryEvolution: 'TEMP_EVOLUTION_MEGA', temporaryEvolutionEnergyCost: 200 }])
    ]
    const baratas = evolucionesBaratas(gm)
    expect(baratas.get('PIDGEY')).toBe(12)
    expect(baratas.get('EEVEE_NORMAL')).toBe(25)
    expect(baratas.get('EEVEE')).toBe(25)
    expect(baratas.get('KADABRA')).toBe('intercambio')
    expect(baratas.get('IVYSAUR')).toBeNull()
    expect(baratas.has('VENUSAUR')).toBe(false)
  })
})

describe('efectos de aventura', () => {
  it('lee coste y duración de nonCombatMoveSettings', () => {
    const gm = [
      {
        templateId: 'NON_COMBAT_V0388_MOVE_SPACIAL_REND',
        data: {
          nonCombatMoveSettings: {
            uniqueId: 'SPACIAL_REND',
            cost: { candyCost: 5, stardustCost: 5000 },
            durationMs: '600000',
            bonusType: 'SPACE_BONUS'
          }
        }
      }
    ]
    expect(efectosAventura(gm)).toEqual({
      SPACIAL_REND: { tipo: 'SPACE_BONUS', minutos: 10, polvo: 5000, caramelos: 5, energia: null }
    })
  })
})

describe('rasgos PvP', () => {
  // Diez filas con puntuaciones de 80 a 89 en los seis escenarios.
  const filas = Array.from({ length: 10 }, (_, i) => ({ scores: Array(6).fill(80 + i) }))
  const cortes = cortesDeRasgos(filas)

  it('a favor lo del cuarto de arriba de la liga y en contra lo del de abajo', () => {
    const r = rasgosPvp([89, 89, 80, 85, 85, 85], cortes)
    expect(r.favor).toEqual(['abrir', 'cerrar'])
    expect(r.contra).toEqual(['cambiar'])
  })

  it('como mucho dos de cada lado, los más marcados', () => {
    const r = rasgosPvp([88, 89, 89, 89, 89, 89], cortes)
    expect(r.favor).toHaveLength(2)
    expect(r.favor).not.toContain('abrir')
  })
})

describe('jugadores para una incursión', () => {
  it('reparte lo que tardaría uno solo en el tiempo útil del jefe', () => {
    // Nivel 5: 15.000 PS en 300 s, de los que se pega en 270.
    expect(datosIncursion('5-Star Raids')).toEqual({ ps: 15000, segundos: 300 })
    expect(jugadoresNecesarios(40, '5-Star Raids')).toBe(2) // 375 s solo
    expect(jugadoresNecesarios(60, '5-Star Raids')).toBe(1) // 250 s solo
    expect(jugadoresNecesarios(20, '1-Star Raids')).toBe(1)
  })

  it('sin nivel conocido o sin daño, no hay cifra', () => {
    expect(jugadoresNecesarios(30, 'Raid Inventada')).toBeNull()
    expect(jugadoresNecesarios(0, '5-Star Raids')).toBeNull()
  })
})
