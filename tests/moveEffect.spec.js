import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { describeMoveEffect, effectChanceLabel } from '../src/utils/moveEffect'

const moves = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'moves.json'), 'utf8')
)

describe('describeMoveEffect', () => {
  it('no ve efecto donde no lo hay', () => {
    expect(describeMoveEffect(null)).toBeNull()
    expect(describeMoveEffect({})).toBeNull()
    expect(describeMoveEffect({ buffs: [0, 0] })).toBeNull()
    // Hidrobomba pega fuerte y ya está.
    expect(describeMoveEffect(moves.HYDRO_PUMP.pvp)).toBeNull()
  })

  it('distingue subir de bajar y a quién', () => {
    // Bomba Ácida deja al rival sin defensa: es su razón de ser.
    expect(describeMoveEffect(moves.ACID_SPRAY.pvp)).toMatchObject({
      stats: ['defense'],
      direction: 'down',
      target: 'opponent'
    })
    // Nitrocarga se sube el ataque a sí mismo.
    expect(describeMoveEffect(moves.FLAME_CHARGE.pvp)).toMatchObject({
      stats: ['attack'],
      direction: 'up',
      target: 'self'
    })
  })

  it('gradúa la intensidad por escalones', () => {
    expect(describeMoveEffect({ buffs: [1, 0] }).intensity).toBe('normal')
    expect(describeMoveEffect({ buffs: [2, 0] }).intensity).toBe('much')
    expect(describeMoveEffect({ buffs: [0, -3] }).intensity).toBe('lots')
    expect(describeMoveEffect({ buffs: [0, -4] }).intensity).toBe('lots')
  })

  it('recoge los dos stats cuando el efecto toca ambos', () => {
    expect(describeMoveEffect({ buffs: [1, 1] }).stats).toEqual(['attack', 'defense'])
    expect(describeMoveEffect({ buffs: [0, -1] }).stats).toEqual(['defense'])
  })

  it('da por hecho que siempre ocurre si no dicen otra cosa', () => {
    expect(describeMoveEffect({ buffs: [1, 0] }).chance).toBe(1)
    expect(describeMoveEffect({ buffs: [1, 0], buffApplyChance: 0.3 }).chance).toBe(0.3)
  })

  /**
   * La suposición sobre la que se decide la dirección con un solo signo.
   * Si una actualización del juego trajera un movimiento que sube una stat y
   * baja la otra, el texto saldría mal y hay que revisarlo.
   */
  it('ningún movimiento sube una stat y baja la otra a la vez', () => {
    const mixtos = Object.values(moves)
      .filter((move) => move.pvp?.buffs)
      .filter((move) => move.pvp.buffs[0] * move.pvp.buffs[1] < 0)
    expect(mixtos.map((move) => move.id)).toEqual([])
  })
})

describe('effectChanceLabel', () => {
  it('calla cuando el efecto es seguro', () => {
    expect(effectChanceLabel(1)).toBeNull()
    expect(effectChanceLabel(null)).toBeNull()
  })

  it('pasa la probabilidad a porcentaje del idioma', () => {
    expect(effectChanceLabel(0.3, 'es')).toBe('30')
    expect(effectChanceLabel(0.125, 'es')).toBe('12,5')
    expect(effectChanceLabel(0.125, 'en')).toBe('12.5')
  })
})
