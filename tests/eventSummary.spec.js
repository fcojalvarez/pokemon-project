import { describe, expect, it } from 'vitest'
import { summarizeEvent } from '../src/utils/eventSummary'

/**
 * LeekDuck no publica descripciones: el resumen se arma con `extraData`. Si
 * cambian esa forma, la tarjeta se quedaría muda sin que nadie se entere, así
 * que se comprueba aquí con las cuatro formas que publican hoy.
 */
describe('summarizeEvent', () => {
  it('saca lo que trae un evento normal, que solo tiene los dos avisos', () => {
    const resumen = summarizeEvent({
      extraData: { generic: { hasSpawns: true, hasFieldResearchTasks: false } }
    })
    expect(resumen).toMatchObject({ hasSpawns: true, hasResearch: false })
    expect(resumen.spawns).toEqual([])
  })

  it('junta protagonista y bonificación de una hora destacada', () => {
    const resumen = summarizeEvent({
      extraData: {
        generic: { hasSpawns: false, hasFieldResearchTasks: false },
        spotlight: { name: 'Rattata', bonus: '2× Catch XP', list: [{ name: 'Rattata' }] }
      }
    })
    expect(resumen.spawns.map((p) => p.name)).toEqual(['Rattata'])
    expect(resumen.bonuses).toEqual(['2× Catch XP'])
  })

  it('separa jefes de incursión de los variocolores que se pueden pillar', () => {
    const resumen = summarizeEvent({
      extraData: {
        generic: {},
        raidbattles: {
          bosses: [{ name: 'Mega Malamar' }],
          shinies: [{ name: 'Malamar' }, { name: 'Mega Malamar' }]
        }
      }
    })
    expect(resumen.bosses.map((p) => p.name)).toEqual(['Mega Malamar'])
    expect(resumen.shinies).toHaveLength(2)
  })

  it('no repite un Pokémon que venga en dos listas', () => {
    const resumen = summarizeEvent({
      extraData: {
        generic: {},
        spotlight: { list: [{ name: 'Zorua' }] },
        communityday: { spawns: [{ name: 'Zorua' }] }
      }
    })
    expect(resumen.spawns).toHaveLength(1)
  })

  it('devuelve null cuando no hay nada que contar', () => {
    expect(summarizeEvent({ extraData: { generic: {} } })).toBeNull()
    expect(summarizeEvent({})).toBeNull()
    expect(summarizeEvent(null)).toBeNull()
  })

  it('aguanta que falten listas enteras', () => {
    expect(() => summarizeEvent({ extraData: { generic: { hasSpawns: true }, raidbattles: {} } }))
      .not.toThrow()
  })
})
