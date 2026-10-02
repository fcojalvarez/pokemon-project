import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import i18n from '../src/plugins/i18n'
import { maxLevelForCap, rankIVsForLeague } from '../src/utils/formulas'
import FichaIvPvp from '../src/components/pokemon/ficha/FichaIvPvp.vue'

/**
 * IV para PvP (F2). Las cifras de Charizard (223/173/186) están contrastadas
 * con las calculadoras de PvP: en la Súper Liga el mejor es 0/15/13 a nivel
 * 19,5 con 1500 PC.
 */
const CHARIZARD = { atk: 223, def: 173, hp: 186 }

describe('ranking de IV por liga', () => {
  it('el mejor de Charizard en Súper y en Hiper', () => {
    const super_ = rankIVsForLeague(CHARIZARD, 1500)
    expect(super_).toHaveLength(4096)
    expect(super_[0]).toMatchObject({ ivs: { atk: 0, def: 15, hp: 13 }, level: 19.5, cp: 1500, rank: 1, percent: 100 })
    const hiper = rankIVsForLeague(CHARIZARD, 2500)
    expect(hiper[0]).toMatchObject({ ivs: { atk: 0, def: 13, hp: 15 }, level: 35, cp: 2500 })
  })

  it('un 100 % no es el mejor con tope, y el puesto baja con él', () => {
    const super_ = rankIVsForLeague(CHARIZARD, 1500)
    const hundo = super_.find((e) => e.ivs.atk === 15 && e.ivs.def === 15 && e.ivs.hp === 15)
    expect(hundo.rank).toBeGreaterThan(1000)
    expect(hundo.percent).toBeLessThan(100)
    expect(super_.every((e) => e.cp <= 1500)).toBe(true)
  })

  it('sin tope que lo frene, llega a nivel 50', () => {
    expect(maxLevelForCap({ atk: 50, def: 50, hp: 50 }, { atk: 15, def: 15, hp: 15 }, 1500)).toBe(50)
  })

  it('el oscuro tiene los mismos mejores IV: ×1,2 de ataque y ÷1,2 de defensa se anulan', () => {
    const normal = rankIVsForLeague(CHARIZARD, 1500).slice(0, 20).map((e) => e.ivs)
    const oscuro = rankIVsForLeague(CHARIZARD, 1500, { shadow: true }).slice(0, 20).map((e) => e.ivs)
    expect(oscuro).toEqual(normal)
  })
})

describe('sección IV para PvP', () => {
  const montar = () => mount(FichaIvPvp, { props: { stats: CHARIZARD }, global: { plugins: [i18n] } })

  it('enseña el mejor de cada liga y, con los IV del jugador, su puesto', async () => {
    const w = montar()
    expect(w.text()).toContain('0/15/13')
    expect(w.text()).toContain('0/13/15')
    expect(w.text()).not.toContain('#2846')
    const [a, d, h] = w.findAll('input')
    await a.setValue('13')
    await d.setValue('14')
    await h.setValue('15')
    expect(w.text()).toContain('#2846')
    expect(w.text()).toContain('93,9 %')
  })

  it('un IV fuera de 0–15 no cuenta', async () => {
    const w = montar()
    const [a, d, h] = w.findAll('input')
    await a.setValue('16')
    await d.setValue('14')
    await h.setValue('15')
    expect(w.text()).not.toMatch(/#\d+ ·/)
  })
})
