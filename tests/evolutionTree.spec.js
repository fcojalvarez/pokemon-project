import { describe, expect, it } from 'vitest'
import { construirArbol, nodosDe, repartirRequisitos } from '../src/utils/evolutionTree'

const paso = (pokemon_id, extra = {}) => ({ pokemon_id, name: `#${pokemon_id}`, ...extra })

describe('construirArbol', () => {
  it('una cadena sin ramas queda en línea (Charizard)', () => {
    const arbol = construirArbol({
      primary: [paso(4, { candy_required: 25 }), paso(5, { candy_required: 100 }), paso(6)]
    })
    expect(arbol.mon.pokemon_id).toBe(4)
    expect(arbol.ramas).toHaveLength(1)
    expect(arbol.ramas[0].req).toEqual({ candy_required: 25 })
    expect(arbol.ramas[0].destino.ramas[0].req).toEqual({ candy_required: 100 })
    expect(arbol.ramas[0].destino.ramas[0].destino.ramas).toEqual([])
  })

  it('Eevee sale una sola vez, con sus ocho ramas en orden', () => {
    const rama = (clave, destino, extra = {}) => [clave, [paso(133, { candy_required: 25, ...extra }), paso(destino)]]
    const arbol = construirArbol(Object.fromEntries([
      rama('senary', 470, { lure_required: 'mossyLureModule' }),
      rama('primary', 134),
      rama('quinary', 197, { buddy_distance_required: 10, only_evolves_in_nighttime: true }),
      rama('octonary', 700),
      rama('tertiary', 136),
      rama('secondary', 135),
      rama('septenary', 471, { lure_required: 'glacialLureModule' }),
      rama('quaternary', 196, { buddy_distance_required: 10, only_evolves_in_daytime: true })
    ]))
    expect(arbol.mon.pokemon_id).toBe(133)
    expect(nodosDe(arbol).filter((n) => n.mon.pokemon_id === 133)).toHaveLength(1)
    expect(arbol.ramas.map((r) => r.destino.mon.pokemon_id)).toEqual([134, 135, 136, 196, 197, 470, 471, 700])

    const { comunes, propios } = repartirRequisitos(arbol.ramas)
    expect(comunes).toEqual({ candy_required: 25 })
    expect(propios[0]).toEqual({})
    expect(propios[5]).toEqual({ lure_required: 'mossyLureModule' })
    expect(propios[4]).toEqual({ buddy_distance_required: 10, only_evolves_in_nighttime: true })
  })

  it('se separa donde toca y cada rama lleva su requisito (Poliwag)', () => {
    const arbol = construirArbol({
      primary: [paso(60, { candy_required: 25 }), paso(61, { candy_required: 100 }), paso(62)],
      secondary: [paso(60, { candy_required: 25 }), paso(61, { candy_required: 100, item_required: "King's Rock" }), paso(186)]
    })
    expect(arbol.ramas).toHaveLength(1)
    const poliwhirl = arbol.ramas[0].destino
    expect(poliwhirl.mon.pokemon_id).toBe(61)
    expect(poliwhirl.ramas.map((r) => r.destino.mon.pokemon_id)).toEqual([62, 186])
    const { comunes, propios } = repartirRequisitos(poliwhirl.ramas)
    expect(comunes).toEqual({ candy_required: 100 })
    expect(propios).toEqual([{}, { item_required: "King's Rock" }])
  })

  it('las ramas pueden tener más de un paso (Wurmple)', () => {
    const arbol = construirArbol({
      primary: [paso(265, { candy_required: 12 }), paso(266, { candy_required: 50 }), paso(267)],
      secondary: [paso(265, { candy_required: 12 }), paso(268, { candy_required: 50 }), paso(269)]
    })
    expect(arbol.ramas.map((r) => r.destino.mon.pokemon_id)).toEqual([266, 268])
    expect(arbol.ramas[0].destino.ramas[0].destino.mon.pokemon_id).toBe(267)
    expect(arbol.ramas[1].destino.ramas[0].destino.mon.pokemon_id).toBe(269)
  })

  it('sin cadena, el propio Pokémon solo (Rayquaza)', () => {
    expect(construirArbol({}, paso(384))).toEqual({ mon: paso(384), ramas: [] })
    expect(construirArbol(null)).toBeNull()
  })
})
