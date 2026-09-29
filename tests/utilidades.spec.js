import { describe, expect, it } from 'vitest'
import { COLORES_ORIGEN, ORIGENES, origenDe, origenesPresentes } from '../src/utils/moveOrigins'
import { movesOf, rowKey } from '../src/utils/rankingRows'
import { formatDex } from '../src/utils/dex'
import { GIGAMAX_SPRITE, gigamaxSpriteId } from '../src/utils/gigamax'
import { iconoForma } from '../src/utils/formas'
import { NAV_LINKS, esSeccionActiva } from '../src/components/shared/navLinks'
import { FEEDS, dexFromImage } from '../src/utils/liveFeed'
import { plainText } from '../src/utils/gameText'
import { buildFormas, nombreDisfraz } from '../scripts/lib/formas.mjs'

/**
 * Las piezas pequeñas que comparten varias vistas: si una se rompe, se rompe
 * en todas a la vez, y sin test no avisa nadie.
 */
describe('procedencia de los ataques', () => {
  const entrada = { eliteMoves: ['HYDRO_CANNON'], legacyMoves: ['FRENZY_PLANT'], megaMoves: ['DRAGON_ASCENT'] }

  it('marca cada ataque según las listas de la entrada', () => {
    const origen = origenDe(entrada)
    expect(origen('HYDRO_CANNON')).toEqual({ elite: true, legacy: false, mega: false })
    expect(origen('FRENZY_PLANT')).toEqual({ elite: false, legacy: true, mega: false })
    expect(origen('DRAGON_ASCENT')).toEqual({ elite: false, legacy: false, mega: true })
    expect(origen('TACKLE')).toEqual({ elite: false, legacy: false, mega: false })
  })

  it('una entrada sin listas (o sin entrada) no marca nada', () => {
    expect(origenDe(undefined)('TACKLE')).toEqual({ elite: false, legacy: false, mega: false })
    expect(origenDe({})('TACKLE')).toEqual({ elite: false, legacy: false, mega: false })
  })

  it('la leyenda solo enciende lo que aparece, y aguanta huecos', () => {
    expect(origenesPresentes([])).toEqual({ elite: false, legacy: false, mega: false })
    expect(origenesPresentes([{ elite: true }, null, undefined, { mega: true }])).toEqual({
      elite: true,
      legacy: false,
      mega: true
    })
  })

  it('cada procedencia tiene sus tres colores (píldora, subrayado y punto)', () => {
    for (const origen of ORIGENES) {
      expect(Object.keys(COLORES_ORIGEN[origen]).sort()).toEqual(['chip', 'dot', 'line'])
    }
  })
})

describe('filas del Top', () => {
  it('lee los ataques de las dos formas de fila', () => {
    const pve = { id: 'mewtwo', fast: { id: 'CONFUSION' }, charged: { id: 'PSYSTRIKE' } }
    const pvp = { id: 'azumarill', moves: [{ id: 'BUBBLE' }, { nameEs: 'Carantoña' }] }
    expect(movesOf(pve).map((m) => m.id)).toEqual(['CONFUSION', 'PSYSTRIKE'])
    expect(movesOf(pvp)).toHaveLength(2)
    expect(movesOf({ id: 'x' })).toEqual([])
  })

  it('la clave distingue el mismo Pokémon con otro conjunto de ataques', () => {
    const a = { id: 'mewtwo', fast: { id: 'CONFUSION' }, charged: { id: 'PSYSTRIKE' } }
    const b = { id: 'mewtwo', fast: { id: 'PSYCHO_CUT' }, charged: { id: 'PSYSTRIKE' } }
    expect(rowKey(a)).not.toBe(rowKey(b))
    // Sin id de ataque, el nombre en español.
    expect(rowKey({ id: 'azumarill', moves: [{ nameEs: 'Carantoña' }] })).toBe('azumarill-Carantoña')
  })
})

describe('número de Pokédex', () => {
  it('a tres cifras, como en el juego, sin recortar los de cuatro', () => {
    expect(formatDex(1)).toBe('001')
    expect(formatDex(25)).toBe('025')
    expect(formatDex(1025)).toBe('1025')
    expect(formatDex(null)).toBe('')
    expect(formatDex(undefined)).toBe('')
  })
})

describe('sprites Gigamax', () => {
  it('cada forma que gigamaxiza tiene el suyo, y el resto se queda el normal', () => {
    expect(gigamaxSpriteId(6)).toBe(10196)
    // Toxtricity Grave gigamaxiza distinto que el Agudo: va por sprite, no por número.
    expect(gigamaxSpriteId(10184)).toBe(10228)
    expect(gigamaxSpriteId(849)).toBe(10219)
    expect(gigamaxSpriteId(1)).toBe(1)
  })

  it('no hay dos formas con el mismo sprite Gigamax', () => {
    const destinos = Object.values(GIGAMAX_SPRITE)
    expect(new Set(destinos).size).toBe(destinos.length)
  })
})

describe('iconos de formas', () => {
  it('arma la URL del icono normal y del shiny', () => {
    expect(iconoForma('pm666.fARCHIPELAGO')).toMatch(/\/pm666\.fARCHIPELAGO\.icon\.png$/)
    expect(iconoForma('pm666.fARCHIPELAGO', { shiny: true })).toMatch(/\/pm666\.fARCHIPELAGO\.s\.icon\.png$/)
  })
})

describe('secciones del menú', () => {
  it('la Pokédex solo en su ruta y en las fichas; el resto con sus subrutas', () => {
    expect(esSeccionActiva('/', '/')).toBe(true)
    expect(esSeccionActiva('/pokemon/25', '/')).toBe(true)
    expect(esSeccionActiva('/top', '/')).toBe(false)
    expect(esSeccionActiva('/top', '/top')).toBe(true)
    expect(esSeccionActiva('/events', '/top')).toBe(false)
  })

  it('son cuatro, cada una con su clave de idioma e icono', () => {
    expect(NAV_LINKS.map((link) => link.to)).toEqual(['/', '/top', '/events', '/live'])
    for (const link of NAV_LINKS) expect(link.icon).toMatch(/^M/)
  })
})

describe('feed en vivo', () => {
  it('las cuatro fuentes son de ScrapedDuck', () => {
    expect(Object.keys(FEEDS).sort()).toEqual(['eggs', 'events', 'raids', 'research'])
    for (const url of Object.values(FEEDS)) expect(url).toMatch(/^https:\/\/raw\.githubusercontent\.com\/bigfoott\/ScrapedDuck\/data\//)
  })

  it('saca el número de Pokédex de los dos nombres de icono', () => {
    expect(dexFromImage('https://cdn.leekduck.com/assets/img/pokemon_icons/pm147.icon.png')).toBe(147)
    expect(dexFromImage('https://x/pokemon_icon_025_00.png')).toBe(25)
    expect(dexFromImage('https://x/huevo.png')).toBe(null)
    expect(dexFromImage(undefined)).toBe(null)
  })

  it('el texto de una tarea sale sin sus etiquetas', () => {
    expect(plainText('<span>Catch 5 Pokémon</span>')).toBe('Catch 5 Pokémon')
    expect(plainText('  Win a raid ')).toBe('Win a raid')
  })
})

describe('formas y disfraces (pipeline)', () => {
  it('pone nombre a los disfraces con las palabras que conoce', () => {
    expect(nombreDisfraz('HOLIDAY_2016')).toEqual({ es: 'Fiestas 2016', en: 'Holiday 2016' })
    expect(nombreDisfraz('FLYING_NOEVOLVE')).toEqual({ es: 'Volador', en: 'Flying' })
    // Una palabra que no conoce va tal cual, con mayúscula; NOEVOLVE no aporta nada.
    expect(nombreDisfraz('SPOOKY_NOEVOLVE')).toEqual({ es: 'Spooky', en: 'Spooky' })
  })

  it('separa formas y disfraces, marca el shiny liberado y no repite nombres', () => {
    const es = new Map([['form_vivillon_archipelago', 'Motivo Archipiélago']])
    const en = new Map([['form_vivillon_archipelago', 'Archipelago Pattern']])
    const pga = [
      {
        id: 'VIVILLON',
        dexNr: 666,
        assetForms: [
          { form: 'ARCHIPELAGO', image: 'https://x/pm666.fARCHIPELAGO.icon.png' },
          { form: 'ARCHIPELAGO', image: 'https://x/pm666.fARCHIPELAGO_2.icon.png' },
          { costume: 'HOLIDAY_2016', image: 'https://x/pm666.cHOLIDAY_2016.icon.png' }
        ]
      },
      // Con una sola variante no hay galería que enseñar.
      { id: 'BULBASAUR', dexNr: 1, assetForms: [{ image: 'https://x/pm1.icon.png' }] }
    ]
    const salida = buildFormas(pga, {
      es,
      en,
      shinyLeekDuck: [{ aa_fn: 'pm666.fARCHIPELAGO', released_date: '2023/03/01' }]
    })
    expect(Object.keys(salida)).toEqual(['666'])
    expect(salida[666].formas).toEqual([{ f: 'pm666.fARCHIPELAGO', es: 'Motivo Archipiélago', en: 'Archipelago Pattern', s: '2023-03-01' }])
    expect(salida[666].disfraces).toEqual([{ f: 'pm666.cHOLIDAY_2016', es: 'Fiestas 2016', en: 'Holiday 2016' }])
  })
})
