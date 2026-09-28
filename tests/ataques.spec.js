import { describe, expect, it } from 'vitest'
import { ataquesDelJuego, completarAtaques, idDelJuego, listaDelJuego } from '../scripts/lib/ataques.mjs'

describe('nombres de pvpoke → juego', () => {
  it('traduce los que pvpoke escribe distinto', () => {
    expect(idDelJuego('FUTURE_SIGHT')).toBe('FUTURESIGHT')
    expect(idDelJuego('PYRO_BALL')).toBe('PYROBALL')
    expect(idDelJuego('TECHNO_BLAST_DOUSE')).toBe('TECHNO_BLAST_WATER')
    expect(idDelJuego('SURF')).toBe('SURF')
  })

  it('deja un solo Poder Oculto', () => {
    expect(listaDelJuego(['HIDDEN_POWER_BUG', 'HIDDEN_POWER_FIRE', 'WATER_GUN'])).toEqual(['HIDDEN_POWER', 'WATER_GUN'])
  })
})

/** Un GAME_MASTER mínimo, con un ataque como número de enum sin resolver. */
const gm = [
  { templateId: 'V0482_MOVE_DYNAMAX_CANNON' },
  { templateId: 'V0243_MOVE_COUNTER_FAST' },
  {
    templateId: 'V0150_POKEMON_MEWTWO',
    data: { pokemonSettings: { quickMoves: ['CONFUSION_FAST'], cinematicMoves: ['PSYCHIC', 'SPLASH'], eliteQuickMove: ['COUNTER_FAST'] } }
  },
  {
    templateId: 'V0890_POKEMON_ETERNATUS_ETERNAMAX',
    data: { pokemonSettings: { quickMoves: ['DRAGON_TAIL_FAST'], cinematicMoves: [], eliteCinematicMove: [482] } }
  }
]
const moves = {
  CONFUSION: { kind: 'fast' }, COUNTER: { kind: 'fast' }, PSYCHIC: { kind: 'charged' },
  SPLASH: { kind: 'fast' }, DRAGON_TAIL: { kind: 'fast' }, DYNAMAX_CANNON: { kind: 'charged' }
}
const nombresGm = (id) => (id.includes('_') ? [id.toUpperCase()] : [id.toUpperCase(), `${id.toUpperCase()}_NORMAL`])

describe('ataques del juego que pvpoke no trae', () => {
  it('resuelve los números de enum del GAME_MASTER', () => {
    expect(ataquesDelJuego(gm).get('ETERNATUS_ETERNAMAX').charged).toEqual(['DYNAMAX_CANNON'])
  })

  it('añade solo lo confirmado, con su marca de élite, y nunca quita', () => {
    const roster = [
      { id: 'mewtwo_shadow', fast: ['CONFUSION'], charged: ['PSYCHIC', 'SHADOW_BALL'], eliteMoves: [] },
      { id: 'eternatus_eternamax', fast: ['DRAGON_TAIL'], charged: [], eliteMoves: [] }
    ]
    const confirmados = new Map([
      ['mewtwo_shadow', new Set(['CONFUSION', 'COUNTER', 'PSYCHIC', 'SPLASH'])],
      // Sin confirmar: Cañón Dinamax no se añade.
      ['eternatus_eternamax', new Set(['DRAGON_TAIL'])]
    ])
    const anadidos = completarAtaques(roster, ataquesDelJuego(gm), nombresGm, confirmados, moves)
    expect(anadidos).toEqual([{ id: 'mewtwo_shadow', move: 'COUNTER', kind: 'fast', elite: true }])
    expect(roster[0].fast).toEqual(['CONFUSION', 'COUNTER'])
    expect(roster[0].eliteMoves).toEqual(['COUNTER'])
    // Lo que ya tenía (Bola Sombra) se queda; el relleno (Salpicadura) no entra.
    expect(roster[0].charged).toEqual(['PSYCHIC', 'SHADOW_BALL'])
    expect(roster[1].charged).toEqual([])
  })
})
