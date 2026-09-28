import { describe, expect, it } from 'vitest'
import { ataqueDelJuego, ataquesPorPokemon, idDelRoster, maxDePokebattler, nivelesMax } from '../scripts/lib/pokebattler.mjs'

const ids = new Set([
  'kyogre_primal', 'zacian_crowned_sword', 'raichu_alolan_shadow', 'tauros_blaze', 'darmanitan_standard',
  'giratina_altered_shadow', 'wo_chien', 'eternatus', 'inteleon', 'toxtricity_amped', 'weavile'
])

describe('ids de Pokebattler → roster', () => {
  it.each([
    ['KYOGRE_PRIMAL', 'kyogre_primal'],
    ['ZACIAN_CROWNED_SWORD_FORM', 'zacian_crowned_sword'],
    ['RAICHU_ALOLA_SHADOW_FORM', 'raichu_alolan_shadow'],
    ['TAUROS_PALDEA_BLAZE_FORM', 'tauros_blaze'],
    ['DARMANITAN', 'darmanitan_standard'],
    ['GIRATINA_SHADOW_FORM', 'giratina_altered_shadow'],
    ['WOCHIEN', 'wo_chien'],
    ['MEWTWO_A_FORM', null]
  ])('%s → %s', (pb, roster) => {
    expect(idDelRoster(pb, ids)).toBe(roster)
  })
})

describe('Max de Pokebattler', () => {
  it('separa Gigamax de Dinamax y avisa de lo que no casa', () => {
    const salida = maxDePokebattler(
      ['ETERNATUS', 'ZACIAN_CROWNED_SWORD_FORM', 'INTELEON_GIGANTAMAX', 'TOXTRICITY_AMPED_GIGANTAMAX', 'NOEXISTE'],
      ids
    )
    expect([...salida.dinamax].sort()).toEqual(['eternatus', 'zacian_crowned_sword'])
    expect([...salida.gigamax].sort()).toEqual(['inteleon', 'toxtricity_amped'])
    expect(salida.sinCasar).toEqual(['NOEXISTE'])
  })
})

describe('ataques de Pokebattler', () => {
  it('quita _FAST y junta los Poder Oculto', () => {
    expect(ataqueDelJuego('WATERFALL_FAST')).toBe('WATERFALL')
    expect(ataqueDelJuego('HIDDEN_POWER_FIRE_FAST')).toBe('HIDDEN_POWER')
    expect(ataqueDelJuego('ORIGIN_PULSE')).toBe('ORIGIN_PULSE')
  })

  it('suma los élite a la lista de cada Pokémon', () => {
    const mapa = ataquesPorPokemon(
      [{ pokemonId: 'KYOGRE_PRIMAL', quickMoves: ['WATERFALL_FAST'], cinematicMoves: ['SURF'], eliteCinematicMove: ['ORIGIN_PULSE'] }],
      ids
    )
    expect([...mapa.get('kyogre_primal')].sort()).toEqual(['ORIGIN_PULSE', 'SURF', 'WATERFALL'])
  })
})

describe('potencia de los Ataques Max por nivel', () => {
  const pb = [
    { moveId: 'VN_BM_001', vfxName: 'max_flare' },
    { moveId: 'MAX_FLARE', vfxName: 'max_flare', power: 250 },
    { moveId: 'MAX_FLARE2', vfxName: 'max_flare', power: 300 },
    { moveId: 'MAX_FLARE3', vfxName: 'max_flare', power: 350 },
    { moveId: 'MAX_FLARE4', vfxName: 'max_flare', power: 450 },
    { moveId: 'GMAX_WILDFIRE3', vfxName: 'gmax_wildfire', power: 450 },
    { moveId: 'MAX_SHIELD', power: 20 },
    { moveId: 'MAX_SHIELD2', power: 40 },
    { moveId: 'MAX_SHIELD3', power: 60 },
    // Un ataque normal con un efecto que no es Max: no entra.
    { moveId: 'BEHEMOTH_BLADE', vfxName: 'behemoth_blade', power: 200 }
  ]
  const niveles = nivelesMax(pb)

  it('da la lista por nivel, del 1 al 4', () => {
    expect(niveles.get('max_flare')).toEqual({ power: [250, 300, 350, 450] })
    expect(niveles.get('max_shield')).toEqual({ shield: [20, 40, 60] })
  })

  it('descarta una lista con huecos en vez de dejarla corrida', () => {
    expect(niveles.has('gmax_wildfire')).toBe(false)
    expect(niveles.has('behemoth_blade')).toBe(false)
  })
})
