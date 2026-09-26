import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { computeCounters, computeTypeRankings, evaluatePokemon, typeMatchups } from '../src/utils/pve'
import { dexFromImage, eventStatus, normalizeName, parseDate } from '../src/stores/live'
import { translateGameText } from '../src/utils/gameText'
import { spriteUrl } from '../src/utils/sprites'
import { shortFormName } from '../src/utils/formName'

/**
 * Corre contra los datos reales de public/data: si una actualización del juego
 * rompe el pipeline (`pnpm data`), salta aquí y no en la cara del usuario.
 */
const DATA = path.join(process.cwd(), 'public', 'data')
const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'))

const roster = read('roster.json')
const moves = read('moves.json')
const typechart = read('typechart.json')

const ids = (list) => list.map((row) => row.id)

describe('datos generados', () => {
  it('trae el roster con formas, megas y oscuros', () => {
    expect(roster.length).toBeGreaterThan(1000)
    expect(roster.some((p) => p.mega)).toBe(true)
    expect(roster.some((p) => p.shadow)).toBe(true)
  })

  it('da un sprite propio a las formas alternativas', () => {
    const megaY = roster.find((p) => p.id === 'charizard_mega_y')
    expect(megaY.dex).toBe(6)
    // Las formas viven en ids >= 10000 de PokeAPI.
    expect(megaY.spriteId).toBeGreaterThan(10000)
    expect(spriteUrl(megaY.spriteId)).toContain(`/home/${megaY.spriteId}.png`)
    expect(spriteUrl(megaY.spriteId, { shiny: true })).toContain('/home/shiny/')
  })

  it('usa la Pokédex como sprite cuando no hay forma propia', () => {
    const shadow = roster.find((p) => p.id === 'mewtwo_shadow')
    expect(shadow.spriteId).toBe(shadow.dex)
  })

  it('separa las stats de PvE y PvP de cada movimiento', () => {
    // Dragoaliento: 6 de potencia, 4 de energía, 0,5 s.
    expect(moves.DRAGON_BREATH.pve).toMatchObject({ power: 6, energy: 4, duration: 0.5 })
    // Anillo Ígneo pega 120 en incursiones pero 110 en PvP.
    expect(moves.BLAST_BURN.pve.power).toBe(120)
    expect(moves.BLAST_BURN.pvp.power).toBe(110)
  })

  it('tiene la tabla de tipos completa y correcta', () => {
    expect(typechart.order).toHaveLength(18)
    expect(typechart.chart.water.fire).toBeCloseTo(1.6, 3)
    expect(typechart.chart.fire.water).toBeCloseTo(0.625, 3)
    expect(typechart.chart.normal.ghost).toBeCloseTo(0.390625, 6)
  })
})

describe('computeTypeRankings', () => {
  const rankings = computeTypeRankings(roster, moves, { limit: 20 })

  it('cubre los 18 tipos', () => {
    expect(Object.keys(rankings.byType).sort()).toEqual([...typechart.order].sort())
  })

  it('pone a cada Pokémon en el tipo de su ataque cargado', () => {
    for (const [type, list] of Object.entries(rankings.byType)) {
      for (const row of list) expect(row.charged.type).toBe(type)
    }
  })

  it('arrastra el sprite de cada forma a las filas del ranking', () => {
    // Si se pierde el spriteId, las megas salen con la imagen rota.
    for (const list of Object.values(rankings.byType)) {
      for (const row of list) expect(row.spriteId).toBeGreaterThan(0)
    }
    const megaY = rankings.byType.fire.find((row) => row.id === 'charizard_mega_y')
    expect(megaY.spriteId).toBeGreaterThan(10000)
  })

  it('coloca en cabeza a los atacantes que la comunidad reconoce', () => {
    expect(ids(rankings.byType.dragon)).toContain('rayquaza_mega')
    expect(ids(rankings.byType.fighting)).toContain('lucario_mega')
    expect(ids(rankings.byType.fire)).toContain('charizard_mega_y')
  })

  it('deja fuera megas y oscuros cuando se piden sin ellos', () => {
    const clean = computeTypeRankings(roster, moves, {
      limit: 20,
      includeMega: false,
      includeShadow: false
    })
    for (const list of Object.values(clean.byType)) {
      for (const row of list) {
        expect(row.mega).toBe(false)
        expect(row.shadow).toBe(false)
      }
    }
  })
})

describe('computeCounters', () => {
  it('pega mucho más contra una debilidad doble', () => {
    // Planta/Hielo come x2,56 de fuego; el agua como mucho recibe x1,6.
    const vsGrassIce = computeCounters(
      roster,
      moves,
      typechart.chart,
      { types: ['grass', 'ice'] },
      { limit: 1 }
    )
    const vsWater = computeCounters(roster, moves, typechart.chart, { types: ['water'] }, { limit: 1 })
    expect(vsGrassIce[0].dps).toBeGreaterThan(vsWater[0].dps)
    expect(vsGrassIce[0].charged.type).toBe('fire')
  })
})

describe('typeMatchups', () => {
  it('saca las debilidades reales de Charizard', () => {
    const { weak, resist } = typeMatchups(typechart.chart, ['fire', 'flying'], typechart.order)
    expect(weak.find((entry) => entry.type === 'rock').mult).toBeCloseTo(2.56, 2)
    // En Pokémon GO no hay inmunidades: x0,39 es lo más bajo posible.
    expect(resist.find((entry) => entry.type === 'grass').mult).toBeCloseTo(0.390625, 6)
    for (const entry of resist) expect(entry.mult).toBeGreaterThan(0)
  })
})

describe('datos en vivo', () => {
  it('interpreta las fechas de LeekDuck como hora local', () => {
    // Sin zona horaria: un evento "a las 10:00" es a las 10:00 donde estés.
    const date = parseDate('2026-09-26T10:00:00.000')
    expect(date.getHours()).toBe(10)
    expect(date.getDate()).toBe(26)
  })

  it('tolera fechas vacías o inválidas', () => {
    expect(parseDate(null)).toBeNull()
    expect(parseDate('no es una fecha')).toBeNull()
  })

  it('clasifica los eventos', () => {
    const now = new Date('2026-09-26T12:00:00')
    const on = { start: '2026-09-26T10:00:00.000', end: '2026-09-26T20:00:00.000' }
    const soon = { start: '2026-09-28T10:00:00.000', end: '2026-09-28T20:00:00.000' }
    const done = { start: '2026-09-20T10:00:00.000', end: '2026-09-21T20:00:00.000' }

    expect(eventStatus(on, now)).toBe('active')
    expect(eventStatus(soon, now)).toBe('upcoming')
    expect(eventStatus(done, now)).toBe('past')
    // Las temporadas se publican sin fin, y las horas destacadas sin fechas.
    expect(eventStatus({ start: '2026-09-01T10:00:00.000', end: null }, now)).toBe('active')
    expect(eventStatus({ start: null, end: null }, now)).toBe('undated')
  })

  it('normaliza nombres para poder cruzarlos con la Pokédex', () => {
    expect(normalizeName('Mega Charizard Y')).toBe('megacharizardy')
    expect(normalizeName('Farfetch’d')).toBe('farfetchd')
  })
})

describe('shortFormName', () => {
  it('deja solo la letra cuando hay Mega X y Mega Y', () => {
    expect(shortFormName('Mega Raichu X')).toBe('Raichu X')
    expect(shortFormName('Mega Charizard Y')).toBe('Charizard Y')
  })

  it('conserva el "Mega" de la mega única', () => {
    // Rayquaza no tiene cadena evolutiva: sin el "Mega" parecería el normal.
    expect(shortFormName('Mega Rayquaza')).toBe('Mega Rayquaza')
    expect(shortFormName('Mega Venusaur')).toBe('Mega Venusaur')
  })

  it('no toca el resto de nombres', () => {
    expect(shortFormName('Pikachu')).toBe('Pikachu')
    expect(shortFormName('Groudon (Primigenio)')).toBe('Groudon (Primigenio)')
  })
})

describe('nombres de las megas', () => {
  it('las nombra con el "Mega" delante, como el juego', () => {
    const porId = new Map(roster.map((p) => [p.id, p]))
    expect(porId.get('blastoise_mega').nameEs).toBe('Mega Blastoise')
    expect(porId.get('charizard_mega_x').nameEs).toBe('Mega Charizard X')
    expect(porId.get('charizard_mega_y').nameEs).toBe('Mega Charizard Y')
  })

  it('no deja ninguna con el sufijo entre paréntesis', () => {
    const sobras = roster.filter((p) => p.mega && p.nameEs.includes('(Mega'))
    expect(sobras.map((p) => p.nameEs)).toEqual([])
  })

  it('no toca el resto de formas, que sí van con sufijo', () => {
    const porId = new Map(roster.map((p) => [p.id, p]))
    expect(porId.get('marowak_alolan').nameEs).toBe('Marowak (Alola)')
    expect(porId.get('groudon_primal').nameEs).toBe('Groudon (Primigenio)')
  })
})

describe('dexFromImage', () => {
  it('saca el número de Pokédex de la imagen de LeekDuck', () => {
    expect(dexFromImage('https://cdn.leekduck.com/assets/img/pokemon_icons/pm147.icon.png')).toBe(147)
    expect(dexFromImage('https://cdn.leekduck.com/assets/img/pokemon_icons/pm687.fMEGA.icon.png')).toBe(687)
    expect(dexFromImage('.../pokemon_icon_025_00.png')).toBe(25)
  })

  it('devuelve null si no hay número', () => {
    expect(dexFromImage('https://cdn.leekduck.com/assets/img/eggs/egg10km.png')).toBeNull()
    expect(dexFromImage(null)).toBeNull()
  })
})

describe('traducción con los textos del juego', () => {
  const dictionary = read('texts.json')

  it('traduce las tareas manteniendo los números', () => {
    expect(translateGameText('Make 7 Great Throws', dictionary)).toBe('Haz 7 grandes lanzamientos')
    expect(translateGameText('Make an Excellent Throw', dictionary)).toBe('Haz un lanzamiento excelente')
  })

  it('deja el original si no hay frase equivalente', () => {
    const inventado = 'Do something that is not in the game'
    expect(translateGameText(inventado, dictionary)).toBe(inventado)
  })
})

describe('movimientos exclusivos de supermega', () => {
  const superMegas = roster.filter((p) => p.superMega)

  it('da a cada supermega su movimiento exclusivo', () => {
    expect(superMegas.length).toBeGreaterThan(0)
    for (const mega of superMegas) {
      expect(mega.megaMoves, `${mega.id} sin movimiento exclusivo`).toHaveLength(1)
      const move = moves[mega.megaMoves[0]]
      expect(move, `${mega.megaMoves[0]} no está en moves.json`).toBeDefined()
      expect(move.megaMove).toBe(true)
    }
  })

  it('solo las supermegas tienen movimiento exclusivo', () => {
    const intrusos = roster.filter((p) => p.megaMoves?.length && !p.superMega)
    expect(intrusos.map((p) => p.id)).toEqual([])
  })

  it('los traduce al español en vez de dejar el identificador crudo', () => {
    // "Aguijón Letal+" sale del movimiento base; sin eso se vería FELL_STINGER_PLUS.
    expect(moves.FELL_STINGER_PLUS.nameEs).toBe('Aguijón Letal+')
    for (const move of Object.values(moves)) {
      if (!move.megaMove) continue
      expect(move.nameEs, `${move.id} sin traducir`).not.toBe(move.id)
      expect(move.nameEs.endsWith('+')).toBe(true)
    }
  })

  /**
   * La invariante que protege los rankings: `fast` y `charged` alimentan el
   * cálculo de DPS, así que ahí no puede colarse nada sin stats de PvE.
   */
  it('mantiene fuera de fast/charged los movimientos sin stats de PvE', () => {
    const sinPve = new Set(
      Object.values(moves).filter((m) => !m.pve).map((m) => m.id)
    )
    expect(sinPve.size).toBeGreaterThan(0)
    const contaminados = roster.filter(
      (p) => [...p.fast, ...p.charged].some((id) => sinPve.has(id))
    )
    expect(contaminados.map((p) => p.id)).toEqual([])
  })

  it('no rankea el movimiento exclusivo mientras no haya datos de PvE', () => {
    const beedrill = roster.find((p) => p.id === 'beedrill_mega')
    expect(beedrill.megaMoves).toEqual(['FELL_STINGER_PLUS'])
    expect(moves.FELL_STINGER_PLUS.pve).toBeNull()

    const sets = evaluatePokemon(beedrill, moves)
    expect(sets.length).toBeGreaterThan(0)
    expect(sets.some((s) => s.charged.id === 'FELL_STINGER_PLUS')).toBe(false)
  })

  it('lo rankea en cuanto el GAME_MASTER publique sus stats de PvE', () => {
    const beedrill = roster.find((p) => p.id === 'beedrill_mega')
    const conPve = {
      ...moves,
      FELL_STINGER_PLUS: {
        ...moves.FELL_STINGER_PLUS,
        pve: { power: 90, energy: -50, duration: 2.2, damageWindow: 1.5 }
      }
    }
    const sets = evaluatePokemon(beedrill, conPve)
    expect(sets.some((s) => s.charged.id === 'FELL_STINGER_PLUS')).toBe(true)
  })
})
