import { describe, expect, it } from 'vitest'
import { dexPorNombre, maxEnEventos, maxLiberados, sumarVistos } from '../scripts/lib/maxLiberados.mjs'

/**
 * La marca de Dinamax y Gigamax es de lo que ya se puede conseguir, no de lo
 * que el juego tiene preparado: Flapple y Appletun salían con Gigamax sin
 * haber salido nunca.
 */
const roster = [
  { id: 'charmander', dex: 4, name: 'Charmander', family: 'FAMILY_CHARMANDER', evolutions: ['charmeleon'], dynamax: true },
  { id: 'charmeleon', dex: 5, name: 'Charmeleon', family: 'FAMILY_CHARMANDER', evolutions: ['charizard'], dynamax: true },
  { id: 'charizard', dex: 6, name: 'Charizard', family: 'FAMILY_CHARMANDER', evolutions: [], dynamax: true, gigantamax: true },
  { id: 'charizard_mega_x', dex: 6, name: 'Mega Charizard X', family: 'FAMILY_CHARMANDER', evolutions: [], mega: true },
  { id: 'lapras', dex: 131, name: 'Lapras', family: null, evolutions: [], dynamax: true, gigantamax: true },
  { id: 'meowth', dex: 52, name: 'Meowth', family: 'FAMILY_MEOWTH', evolutions: [], dynamax: true, gigantamax: true },
  { id: 'meowth_galarian', dex: 52, name: 'Meowth (Galarian)', family: 'FAMILY_MEOWTH', evolutions: [], regional: true, dynamax: true },
  { id: 'applin', dex: 840, name: 'Applin', family: 'FAMILY_APPLIN', evolutions: ['flapple'] },
  { id: 'flapple', dex: 841, name: 'Flapple', family: 'FAMILY_APPLIN', evolutions: [], gigantamax: true },
  { id: 'toxtricity_amped', dex: 849, name: 'Toxtricity (Amped)', family: 'FAMILY_TOXEL', evolutions: [], dynamax: true, gigantamax: true },
  { id: 'cinderace', dex: 815, name: 'Cinderace', family: 'FAMILY_SCORBUNNY', evolutions: [], dynamax: true, gigantamax: true }
]
const hoy = new Date('2026-09-27T12:00:00Z')
const gmax = (family, released_date, dex = 0) => ({ dex, family, released_date, aa_fn: `pm${dex}.fGIGANTAMAX` })

describe('Dinamax liberados', () => {
  it('parte de la semilla y lo hereda a las evoluciones, no hacia atrás', () => {
    const { dinamax } = maxLiberados(roster, { semilla: { Charmeleon: '2024-09-10' }, hoy })
    expect([...dinamax].sort()).toEqual(['charizard', 'charmeleon'])
  })

  it('añade lo visto en los combates Max, sin formas regionales ni megas', () => {
    const { dinamax } = maxLiberados(roster, { vistos: { dinamax: { 52: true, 6: true } }, hoy })
    expect([...dinamax].sort()).toEqual(['charizard', 'meowth'])
  })

  it('no inventa Dinamax que el juego no permite', () => {
    const { dinamax } = maxLiberados(roster, { semilla: { Applin: 'x' }, hoy })
    expect(dinamax.size).toBe(0)
  })
})

describe('Gigamax liberados', () => {
  it('solo los de LeekDuck con fecha ya pasada, por familia', () => {
    const { gigamax } = maxLiberados(roster, {
      shinyLeekDuck: [
        gmax('Charmander', '2024/10/26', 6),
        // Anunciado, aún no: y con el número de Pokédex mal, como lo trae LeekDuck.
        gmax('Scorbunny', '2026/10/03', 812),
        gmax('Toxel', '2024/11/16', 849),
        // Especie sin evoluciones: en el roster viene sin familia.
        gmax('Lapras', '2024/12/08', 131),
        // Variocolor normal, no Gigamax.
        { dex: 841, family: 'Applin', released_date: '2020/01/01', aa_fn: 'pm841' }
      ],
      hoy
    })
    expect([...gigamax].sort()).toEqual(['charizard', 'lapras', 'toxtricity_amped'])
  })

  it('suma lo visto en los combates Max aunque LeekDuck aún no lo tenga', () => {
    const { gigamax } = maxLiberados(roster, { vistos: { gigamax: { 815: true } }, hoy })
    expect([...gigamax]).toEqual(['cinderace'])
  })
})

describe('la lista de Pokebattler', () => {
  it('suma Dinamax por id, con herencia, y Gigamax solo si el juego lo permite', () => {
    const { dinamax, gigamax } = maxLiberados(roster, {
      pokebattler: { dinamax: ['charmeleon', 'charizard_mega_x'], gigamax: ['cinderace', 'flapple', 'lapras_mega'] },
      hoy
    })
    // Las megas no dinamaxizan aunque Pokebattler las nombrara.
    expect([...dinamax].sort()).toEqual(['charizard', 'charmeleon'])
    // Con Gigamax permitido en el juego, entra aunque no tenga variocolor
    // (Cinderace, Flapple); una mega, nunca.
    expect([...gigamax].sort()).toEqual(['cinderace', 'flapple'])
  })

  it('no inventa: lo que el juego no permite se queda fuera', () => {
    const { dinamax } = maxLiberados(roster, { pokebattler: { dinamax: ['applin'] }, hoy })
    expect(dinamax.size).toBe(0)
  })
})

describe('eventos de LeekDuck', () => {
  const nombres = dexPorNombre(roster)

  it('cuentan los que ya han empezado, con varios Pokémon en el título', () => {
    const eventos = [
      { name: 'Dynamax Charmander, Lapras, and Meowth during Max Monday', start: '2026-09-21T06:00:00.000' },
      { name: 'Gigantamax Cinderace Max Battle Day', start: '2026-10-03T14:00:00.000' },
      { name: 'Dynamax Max Battle Day', start: '2026-09-01T14:00:00.000' },
      { name: 'Mega Malamar in Mega Raids', start: '2026-09-01T10:00:00.000' }
    ]
    expect(maxEnEventos(eventos, nombres, hoy)).toEqual({ dinamax: [4, 131, 52], gigamax: [] })
  })

  it('el día que empieza, el Gigamax entra', () => {
    const eventos = [{ name: 'Gigantamax Cinderace Max Battle Day', start: '2026-10-03T14:00:00.000' }]
    expect(maxEnEventos(eventos, nombres, new Date('2026-10-03T15:00:00')).gigamax).toEqual([815])
  })
})

describe('la memoria de vistos', () => {
  it('suma sin quitar nada y sin pisar la primera fecha', () => {
    const antes = { dinamax: { 4: '2026-01-01' }, gigamax: {} }
    const despues = sumarVistos(antes, [{ dex: 4 }, { dex: 131, gigantamax: true }], '2026-09-27')
    expect(despues).toEqual({ dinamax: { 4: '2026-01-01' }, gigamax: { 131: '2026-09-27' } })
  })
})
