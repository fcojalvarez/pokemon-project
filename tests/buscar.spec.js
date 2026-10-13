import { describe, expect, it } from 'vitest'
import { casa, normalizarBusqueda, palabrasDe } from '../src/utils/buscar'
import { nombreAlineacion } from '../src/utils/rocket'

describe('buscar', () => {
  it('normaliza sin tildes, mayúsculas ni espacios de más', () => {
    expect(normalizarBusqueda('  Compañero   ÉLITE ')).toBe('companero elite')
    expect(palabrasDe(' caramelo  compañero ')).toEqual(['caramelo', 'companero'])
    expect(palabrasDe('   ')).toEqual([])
  })

  it('casa si todas las palabras están, aunque sea en campos distintos', () => {
    const mision = ['Consigue 1 caramelo explorando con tu compañero', 'Electrike', 'Bramblin']
    expect(casa(palabrasDe('caramelo'), mision)).toBe(true)
    expect(casa(palabrasDe('companero caramelo'), mision)).toBe(true)
    expect(casa(palabrasDe('bramblin caramelo'), mision)).toBe(true)
    expect(casa(palabrasDe('bramblin huevo'), mision)).toBe(false)
  })

  it('sin consulta casa todo y los campos vacíos no molestan', () => {
    expect(casa([], ['lo que sea'])).toBe(true)
    expect(casa(palabrasDe('pikachu'), [null, undefined, 'Pikachu'])).toBe(true)
  })
})

describe('nombreAlineacion', () => {
  const t = (clave, datos) => (datos ? `${clave}:${datos.type}` : clave)
  it('traduce a los reclutas y deja a los líderes tal cual', () => {
    expect(nombreAlineacion({ name: 'Fire-type Female Grunt' }, t, (tipo) => `T-${tipo}`)).toBe(
      'raids.rocket.gruntType:T-fire (raids.rocket.female)'
    )
    expect(nombreAlineacion({ name: 'Decoy Male Grunt' }, t)).toBe(
      'raids.rocket.decoy (raids.rocket.male)'
    )
    expect(nombreAlineacion({ name: 'Cliff' }, t)).toBe('Cliff')
  })
})
