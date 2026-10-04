import { describe, expect, it } from 'vitest'
import { fichaDeFila } from '../src/utils/rankingRows'

/** Las filas del Top enlazan a la ficha de su forma, no a la de la especie. */
describe('fichaDeFila', () => {
  const fichaBase = (dex) => ({ 655: { id: 'delphox' }, 6: { id: 'charizard' } }[dex] ?? null)

  it('una mega, con su ?form=', () => {
    expect(fichaDeFila({ id: 'delphox_mega', dex: 655 }, fichaBase)).toBe(
      '/pokemon/655?form=delphox_mega'
    )
  })

  it('la forma base y su oscuro, a la ficha de la especie', () => {
    expect(fichaDeFila({ id: 'delphox', dex: 655 }, fichaBase)).toBe('/pokemon/655')
    expect(fichaDeFila({ id: 'delphox_shadow', dex: 655 }, fichaBase)).toBe('/pokemon/655')
  })

  it('las filas Max, por su formId', () => {
    expect(fichaDeFila({ id: 'charizard-GMAX', formId: 'charizard', dex: 6 }, fichaBase)).toBe(
      '/pokemon/6'
    )
  })

  it('la base se busca por el nombre de la especie, como en la ficha', () => {
    const porNombre = (dex, nombre) =>
      ({ meowstic: { id: 'meowstic' } }[nombre] ?? { id: 'meowstic_female' })
    expect(fichaDeFila({ id: 'meowstic_female', dex: 678 }, porNombre)).toBe(
      '/pokemon/678?form=meowstic_female'
    )
    expect(fichaDeFila({ id: 'meowstic', dex: 678 }, porNombre)).toBe('/pokemon/678')
  })

  it('sin dex, sin enlace', () => {
    expect(fichaDeFila({ id: 'x' }, fichaBase)).toBe(null)
  })
})
