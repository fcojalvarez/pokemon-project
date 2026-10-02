import { describe, expect, it } from 'vitest'
import { conjuntoPvp, rapidosParaCargar } from '../src/utils/pvpCombate'

/** F4: cuántos rápidos hacen falta para cada cargado, con cifras del juego. */
const ASCUAS = { id: 'EMBER', pvp: { energyGain: 9, turns: 2 } }
const ANILLO = { id: 'BLAST_BURN', pvp: { energy: 50 } }
const AIRE = { id: 'AIR_CUTTER', pvp: { energy: 40 } }

describe('rápidos para cargar', () => {
  it('redondea hacia arriba: con 9 de energía, 50 piden 6 rápidos (12 turnos)', () => {
    expect(rapidosParaCargar(ASCUAS, ANILLO)).toEqual({ veces: 6, turnos: 12 })
    expect(rapidosParaCargar(ASCUAS, AIRE)).toEqual({ veces: 5, turnos: 10 })
  })

  it('sin energía que contar no inventa nada', () => {
    expect(rapidosParaCargar({ pvp: { energyGain: 0 } }, ANILLO)).toBe(null)
    expect(rapidosParaCargar(ASCUAS, { pvp: {} })).toBe(null)
    expect(rapidosParaCargar(undefined, ANILLO)).toBe(null)
  })

  it('el conjunto salta los ataques que no conoce', () => {
    const moves = { EMBER: ASCUAS, BLAST_BURN: ANILLO }
    const conjunto = conjuntoPvp(['EMBER', 'BLAST_BURN', 'NO_EXISTE'], moves)
    expect(conjunto.rapido.id).toBe('EMBER')
    expect(conjunto.cargados.map((c) => [c.id, c.cuenta.veces])).toEqual([['BLAST_BURN', 6]])
    expect(conjuntoPvp(['NO_EXISTE'], moves)).toBe(null)
  })
})
