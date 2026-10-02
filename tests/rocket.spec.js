import { describe, expect, it } from 'vitest'
import { grupoRocket, piezasRecluta, puestosRocket, rocketPorGrupo } from '../src/utils/rocket'

const linea = (name, title, type = '') => ({ name, title, type, firstPokemon: [{ name: 'Uno' }] })

describe('rocket', () => {
  it('saca el grupo del título', () => {
    expect(grupoRocket(linea('Giovanni', 'Team GO Rocket Boss'))).toBe('boss')
    expect(grupoRocket(linea('Cliff', 'Team GO Rocket Leader'))).toBe('leader')
    expect(grupoRocket(linea('Male Grunt', 'Team GO Rocket Grunt'))).toBe('grunt')
  })

  it('parte el nombre de un recluta', () => {
    expect(piezasRecluta('Fire-type Female Grunt')).toEqual({
      senuelo: false,
      tipo: 'fire',
      sexo: 'female'
    })
    expect(piezasRecluta('Male Grunt')).toEqual({ senuelo: false, tipo: null, sexo: 'male' })
    expect(piezasRecluta('Decoy Female Grunt')).toEqual({
      senuelo: true,
      tipo: null,
      sexo: 'female'
    })
    expect(piezasRecluta('Giovanni')).toBeNull()
  })

  it('tres puestos siempre, aunque falte alguno', () => {
    expect(puestosRocket({ firstPokemon: [{ name: 'A' }] })).toEqual([[{ name: 'A' }], [], []])
  })

  it('agrupa: Giovanni, líderes y reclutas; los de tipo primero, por su nombre', () => {
    const tipos = { water: 'Agua', fire: 'Fuego', bug: 'Bicho' }
    const grupos = rocketPorGrupo(
      [
        linea('Male Grunt', 'Team GO Rocket Grunt'),
        linea('Water-type Male Grunt', 'Team GO Rocket Grunt', 'water'),
        linea('Cliff', 'Team GO Rocket Leader'),
        linea('Fire-type Female Grunt', 'Team GO Rocket Grunt', 'fire'),
        linea('Giovanni', 'Team GO Rocket Boss'),
        linea('Bug-type Male Grunt', 'Team GO Rocket Grunt', 'bug')
      ],
      (tipo) => tipos[tipo]
    )
    expect(grupos.map((g) => g.grupo)).toEqual(['boss', 'leader', 'grunt'])
    expect(grupos[2].list.map((l) => l.type || '-')).toEqual(['water', 'bug', 'fire', '-'])
  })
})
