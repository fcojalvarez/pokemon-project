import { describe, expect, it } from 'vitest'
import {
  CONVERSIONES,
  comoSeConsigue,
  conversionesDe,
  conversionesDeEspecie
} from '../src/utils/cambiosForma'
import { diferenciasCambiosForma } from '../scripts/lib/cambiosForma.mjs'

describe('fusiones y cambios de forma', () => {
  it('Alas del Alba solo se consigue fusionando Necrozma con Lunala', () => {
    const c = comoSeConsigue('necrozma_dawn_wings')
    expect(c).toMatchObject({ tipo: 'fusion', desde: 'necrozma', con: 'lunala', energia: 'lunar' })
    expect(c.cantidad).toBe(1000)
  })

  it('las formas que también se atrapan no dicen «solo así»', () => {
    expect(comoSeConsigue('hoopa_unbound')).toBeNull()
    expect(comoSeConsigue('necrozma')).toBeNull()
  })

  it('Necrozma tiene sus dos fusiones; Zygarde, sus dos cambios', () => {
    expect(conversionesDe('necrozma').map((c) => c.a)).toEqual([
      'necrozma_dusk_mane',
      'necrozma_dawn_wings'
    ])
    expect(conversionesDeEspecie(['zygarde_10', 'zygarde', 'zygarde_complete'])).toHaveLength(2)
  })

  it('el pipeline avisa si el GAME_MASTER cambia un coste', () => {
    const plantilla = (forma, cambios) => ({
      data: { pokemonSettings: { form: forma, formChange: cambios } }
    })
    const una = [CONVERSIONES.find((c) => c.a === 'hoopa_unbound')]
    const gm = [
      plantilla('HOOPA_CONFINED', [
        { availableForm: ['HOOPA_UNBOUND'], candyCost: 50, stardustCost: 10000 }
      ]),
      plantilla('HOOPA_UNBOUND', [
        { availableForm: ['HOOPA_CONFINED'], candyCost: 10, stardustCost: 2000 }
      ])
    ]
    expect(diferenciasCambiosForma(gm, una)).toEqual([])
    gm[0].data.pokemonSettings.formChange[0].candyCost = 60
    expect(diferenciasCambiosForma(gm, una)).toEqual(['hoopa → hoopa_unbound: otro coste'])
  })
})
