import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  computeCounters,
  computeDefenders,
  computeTypeRankings,
  evaluatePokemon,
  puedeDefender,
  SUPERMEGA_PLUS,
  typeMatchups
} from '../src/utils/pve'
import { CLIMAS, climaDeTipo } from '../src/utils/clima'
import { dexFromImage, eventStatus, parseDate } from '../src/utils/liveFeed'
import { normalizeName, translateGameText } from '../src/utils/gameText'
import { spriteUrl } from '../src/utils/sprites'

/**
 * Corre contra los datos reales de public/data: si una actualización del juego
 * rompe el pipeline (`pnpm data`), salta aquí y no en la cara del usuario.
 */
const DATA = path.join(process.cwd(), 'public', 'data')
const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'))

const roster = read('roster.json')
const moves = read('moves.json')
const typechart = read('typechart.json')
const maxbattles = read('maxbattles.json')

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

  it('en cada tipo, contra un jefe débil a él: el ×1,6 se nota en el DPS', () => {
    const neutro = computeTypeRankings(roster, moves, { limit: 20, sortBy: 'dps' })
    const charizard = (lista) => lista.find((row) => row.id === 'charizard')
    const fuego = computeTypeRankings(roster, moves, { limit: 500, sortBy: 'dps' }).byType.fire
    expect(charizard(fuego).dps).toBeGreaterThan(20)
    expect(neutro.overall[0].general).toBeGreaterThan(neutro.overall[0].dps)
  })

  it('ordena la lista general por la suma de los dos mejores tipos', () => {
    const { overall } = computeTypeRankings(roster, moves, { limit: 50, sortBy: 'edps' })
    for (let i = 1; i < overall.length; i++)
      expect(overall[i - 1].general).toBeGreaterThanOrEqual(overall[i].general)
    // La fila enseña su mejor tipo: la suma nunca pasa del doble de él.
    for (const row of overall) {
      expect(row.general).toBeLessThanOrEqual(row.edps * 2 + 1e-9)
      expect(row.tiposGeneral[0]).toBe(row.charged.type)
    }
    // Versátiles arriba (psíquico y lucha): Mewtwo Mega X, como en GO Hub.
    expect(ids(overall.slice(0, 5))).toContain('mewtwo_mega_x')
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
    const vsWater = computeCounters(
      roster,
      moves,
      typechart.chart,
      { types: ['water'] },
      { limit: 1 }
    )
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

  it('las regionales van como en el resto de la app, y las demás formas con sufijo', () => {
    const porId = new Map(roster.map((p) => [p.id, p]))
    expect(porId.get('marowak_alolan').nameEs).toBe('Marowak de Alola')
    expect(porId.get('marowak_alolan').name).toBe('Alolan Marowak')
    expect(porId.get('sandslash_alolan_shadow').nameEs).toBe('Sandslash de Alola Oscuro')
    expect(porId.get('groudon_primal').nameEs).toBe('Groudon (Primigenio)')
  })
})

describe('dexFromImage', () => {
  it('saca el número de Pokédex de la imagen de LeekDuck', () => {
    expect(dexFromImage('https://cdn.leekduck.com/assets/img/pokemon_icons/pm147.icon.png')).toBe(
      147
    )
    expect(
      dexFromImage('https://cdn.leekduck.com/assets/img/pokemon_icons/pm687.fMEGA.icon.png')
    ).toBe(687)
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
    expect(translateGameText('Make an Excellent Throw', dictionary)).toBe(
      'Haz un lanzamiento excelente'
    )
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
    // Hoy puede no quedar ninguno: los de las supermegas llevan los datos de
    // incursión de Pokebattler (pveSource), a falta de los del GAME_MASTER.
    const sinPve = new Set(
      Object.values(moves)
        .filter((m) => !m.pve)
        .map((m) => m.id)
    )
    const contaminados = roster.filter((p) =>
      [...p.fast, ...p.charged].some((id) => sinPve.has(id))
    )
    expect(contaminados.map((p) => p.id)).toEqual([])
  })

  it('no rankea el movimiento exclusivo mientras no haya datos de PvE', () => {
    const beedrill = roster.find((p) => p.id === 'beedrill_mega')
    expect(beedrill.megaMoves).toEqual(['FELL_STINGER_PLUS'])
    const sinPve = { ...moves, FELL_STINGER_PLUS: { ...moves.FELL_STINGER_PLUS, pve: null } }

    const sets = evaluatePokemon(beedrill, sinPve)
    expect(sets.length).toBeGreaterThan(0)
    expect(sets.some((s) => s.charged.id === 'FELL_STINGER_PLUS')).toBe(false)
  })

  it('lo rankea en cuanto el GAME_MASTER publique sus stats de PvE', () => {
    // Con el nivel mega 4 abierto, que es cuando puede usar el «+».
    const beedrill = { ...roster.find((p) => p.id === 'beedrill_mega'), superMax: true }
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

  it('sin el nivel mega 4 abierto no usa su «+», aunque pvpoke ya lo traiga', () => {
    // Una mega con su «+» en pvpoke pero sin el nivel 4 (Beedrill antes de
    // abrírselo): no se lo cuenta.
    const beedrill = { ...roster.find((p) => p.id === 'beedrill_mega'), superMax: false }
    const sets = evaluatePokemon(beedrill, moves)
    expect(sets.some((s) => s.charged.id === 'FELL_STINGER_PLUS')).toBe(false)
    // Las que lo tienen abierto, sí: Mega Raichu X con Placaje Eléctrico+.
    const raichu = roster.find((p) => p.id === 'raichu_mega_x')
    expect(raichu.superMax).toBe(true)
    expect(evaluatePokemon(raichu, moves).some((s) => s.charged.id === 'VOLT_TACKLE_PLUS')).toBe(true)
  })

  it('el ataque «+» pega ×1,3, lo de su nivel mega 4: pesa como el normal con un 30 % más de potencia', () => {
    const raichu = roster.find((p) => p.id === 'raichu_mega_x')
    const plus = moves.VOLT_TACKLE_PLUS
    // El mismo ataque sin ser exclusivo y con la potencia ya multiplicada.
    const comoNormal = {
      ...raichu,
      charged: [...raichu.charged, 'CLON'],
      megaMoves: []
    }
    const conClon = {
      ...moves,
      CLON: { ...plus, pve: { ...plus.pve, power: plus.pve.power * SUPERMEGA_PLUS } }
    }
    const deUno = (sets, id) => sets.find((s) => s.fast.id === 'THUNDER_SHOCK' && s.charged.id === id)
    const real = deUno(evaluatePokemon(raichu, moves), 'VOLT_TACKLE_PLUS')
    const clon = deUno(evaluatePokemon(comoNormal, conClon), 'CLON')
    expect(SUPERMEGA_PLUS).toBe(1.3)
    expect(real.dps).toBeCloseTo(clon.dps, 6)
  })
})

/**
 * Combates Max. Lo que se vigila aquí es sobre todo que los distintivos no se
 * derramen: la primera versión cruzaba por número de Pokédex y marcaba como
 * dinamaxizables a Mega Charizard X y a los oscuros, que en el juego no pueden.
 */
describe('combates Max', () => {
  it('asigna un Ataque Max a los dieciocho tipos', () => {
    expect(Object.keys(maxbattles.byType)).toHaveLength(18)
    for (const [type, move] of Object.entries(maxbattles.byType)) {
      expect(move, `el tipo ${type} se ha quedado sin Ataque Max`).toBeTruthy()
      expect(move.type).toBe(type)
      expect(move.nameEs).toMatch(/^Maxi/)
    }
  })

  it('da su propio ataque a cada Gigamax', () => {
    const gigamax = roster.filter((p) => p.gigantamax)
    // Solo los ya liberados (16 en septiembre de 2026), no los 33 que el
    // juego tiene preparados.
    expect(gigamax.length).toBeGreaterThan(10)
    for (const entry of gigamax) {
      const especie = entry.id.split('_')[0].toUpperCase()
      const move = maxbattles.gmaxBySpecies[especie]
      expect(move, `${entry.nameEs} no tiene ataque Gigamax`).toBeTruthy()
      expect(move.nameEs).toMatch(/^Giga/)
    }
  })

  it('no marca Gigamax lo que el juego tiene preparado pero no ha salido', () => {
    // Flapple y Appletun venían en el GAME_MASTER años antes de salir.
    const preparados = roster.filter((p) =>
      ['flapple', 'appletun', 'eevee', 'melmetal'].includes(p.id)
    )
    expect(preparados.filter((p) => p.gigantamax).map((p) => p.id)).toEqual([])
    expect(roster.find((p) => p.id === 'charizard').gigantamax).toBe(true)
  })

  it('no marca como Max a megas, primigenios ni oscuros', () => {
    const colados = roster.filter((p) => (p.dynamax || p.gigantamax) && (p.mega || p.shadow))
    expect(colados.map((p) => p.id)).toEqual([])
  })

  it('reconoce a Charizard y lo separa de sus megas', () => {
    const base = roster.find((p) => p.id === 'charizard')
    expect(base).toMatchObject({ dynamax: true, gigantamax: true })
    // Con un rápido de fuego (Giro Fuego, Ascuas), su Ataque Max es Maxignición.
    expect(base.types[0]).toBe('fire')
    expect(maxbattles.byType.fire.nameEs).toBe('Maxignición')

    for (const id of ['charizard_mega_x', 'charizard_mega_y', 'charizard_shadow']) {
      expect(roster.find((p) => p.id === id)).toMatchObject({
        dynamax: false,
        gigantamax: false
      })
    }
  })

  it('trae el coste de mejora de cada grupo que usa el roster', () => {
    const grupos = new Set(
      roster
        .filter((p) => p.dynamax)
        .map((p) => p.maxCostGroup)
        .filter(Boolean)
    )
    expect(grupos.size).toBeGreaterThan(0)
    for (const grupo of grupos) {
      const coste = maxbattles.upgradeCosts[grupo]
      expect(coste, `falta el coste del ${grupo}`).toBeTruthy()
      // Tres ranuras (ataque, Maxibarrera, Maxivigor) y tres niveles cada una.
      expect(coste.attack).toHaveLength(3)
      expect(coste.guard).toHaveLength(3)
      expect(coste.spirit).toHaveLength(3)
    }
  })
})

/**
 * Traducción de bonificaciones. El multiplicador es la parte delicada: el
 * español del juego lo escribe con palabras («Doble», «Triple», «Cuádruple»)
 * y no con un marcador, así que si 2×, 3× y 4× comparten clave se pisan y un
 * 3× sale traducido como «Doble». Eso es peor que no traducir, porque da un
 * número falso con toda la confianza del mundo.
 */
describe('bonificaciones de evento', () => {
  const textos = read('texts.json')

  it('respeta el multiplicador de cada bonificación', () => {
    expect(translateGameText('2× Catch XP', textos)).toBe('Doble de PX por captura')
    expect(translateGameText('3× Catch XP', textos)).toBe('Triple de PX por captura')
    expect(translateGameText('4× Catch XP', textos)).toBe('Cuádruple de PX por captura')
  })

  it('casa la "x" de LeekDuck con el "×" del juego', () => {
    // LeekDuck escribe "3x" y el juego "3×". Sin unificarlo no casaba ninguna.
    expect(translateGameText('3x Catch XP', textos)).toBe(translateGameText('3× Catch XP', textos))
  })

  it('no inventa un número cuando no tiene la frase exacta', () => {
    // Si solo existiera la entrada de otro multiplicador, antes se devolvía esa
    // con su cifra. Ahora, sin frase exacta, se deja el original.
    const raro = translateGameText('7× Catch XP', textos)
    expect(raro === '7× Catch XP' || raro.includes('7')).toBe(true)
    expect(raro).not.toContain('Doble')
  })

  it('sigue traduciendo las tareas, que sí llevan marcador', () => {
    expect(translateGameText('Make 7 Great Throws', textos)).toBe('Haz 7 grandes lanzamientos')
    expect(translateGameText('Make 3 Great Throws in a row', textos)).toBe(
      'Haz 3 grandes lanzamientos seguidos'
    )
  })
})

/**
 * Los ataques legacy ya no se pueden conseguir, ni con MT Élite, pero el
 * ranking solo guarda el mejor conjunto de cada Pokémon: si el mejor usa uno,
 * esa es la única fila suya y nadie avisa de a qué distancia queda el
 * alcanzable. Zamazenta pierde casi un tercio de DPS sin Embate Supremo.
 */
describe('ranking sin ataques legacy', () => {
  it('los deja fuera cuando se pide', () => {
    const { overall } = computeTypeRankings(roster, moves, {
      sortBy: 'dps',
      limit: 50,
      includeLegacy: false
    })
    const colados = overall.filter((row) => row.fast.legacy || row.charged.legacy)
    expect(colados.map((row) => row.nameEs)).toEqual([])
  })

  it('con ellos sí aparecen, que es el comportamiento de siempre', () => {
    const { overall } = computeTypeRankings(roster, moves, { sortBy: 'dps', limit: 50 })
    expect(overall.some((row) => row.fast.legacy || row.charged.legacy)).toBe(true)
  })

  it('un Pokémon que dependía de un legacy baja de DPS', () => {
    const mejor = (opciones) => {
      const { overall } = computeTypeRankings(roster, moves, {
        sortBy: 'dps',
        // Sin Embate Supremo cae más allá del 500 de la lista general.
        limit: 2000,
        ...opciones
      })
      return overall.find((row) => row.id === 'zamazenta_crowned_shield')
    }
    const con = mejor({})
    const sin = mejor({ includeLegacy: false })
    expect(con.charged.legacy).toBe(true)
    expect(sin.charged.legacy).toBe(false)
    expect(sin.dps).toBeLessThan(con.dps)
  })
})

/**
 * Lo mismo con los élite: se pueden conseguir, pero solo con MT Élite o en
 * eventos concretos. Apagados, el ranking enseña lo que se aprende con MT
 * normales.
 */
describe('ranking sin ataques élite', () => {
  it('los deja fuera cuando se pide', () => {
    const { overall } = computeTypeRankings(roster, moves, {
      sortBy: 'dps',
      limit: 50,
      includeElite: false
    })
    const colados = overall.filter((row) => row.fast.elite || row.charged.elite)
    expect(colados.map((row) => row.nameEs)).toEqual([])
  })

  it('con ellos sí aparecen, que es el comportamiento de siempre', () => {
    const { overall } = computeTypeRankings(roster, moves, { sortBy: 'dps', limit: 50 })
    expect(overall.some((row) => row.fast.elite || row.charged.elite)).toBe(true)
  })

  it('se combina con el filtro de legacy', () => {
    const { overall } = computeTypeRankings(roster, moves, {
      sortBy: 'dps',
      limit: 50,
      includeElite: false,
      includeLegacy: false
    })
    const colados = overall.filter(
      (row) => row.fast.elite || row.charged.elite || row.fast.legacy || row.charged.legacy
    )
    expect(colados).toEqual([])
    expect(overall.length).toBeGreaterThan(0)
  })
})

describe('defensores de gimnasio', () => {
  const defensores = computeDefenders(roster, moves)

  it('Blissey y Snorlax, arriba, como dice la comunidad', () => {
    expect(defensores[0].id).toBe('blissey')
    expect(defensores[0].value).toBe(100)
    expect(ids(defensores.slice(0, 3))).toContain('snorlax')
  })

  it('PS de defensor, el doble', () => {
    const blissey = defensores[0]
    expect(blissey.psDefensor % 2).toBe(0)
    expect(blissey.psDefensor).toBeGreaterThan(800)
  })

  it('sin legendarios, singulares, ultraentes, oscuros ni megas', () => {
    for (const fila of defensores) {
      const entry = roster.find((e) => e.id === fila.id)
      expect(puedeDefender(entry)).toBe(true)
      expect(
        entry.shadow || entry.mega || entry.legendary || entry.mythical || entry.ultraBeast
      ).toBe(false)
    }
  })
})

describe('clima', () => {
  it('cada tipo, con un solo clima', () => {
    for (const tipo of typechart.order) expect(climaDeTipo(tipo)).not.toBeNull()
    const todos = Object.values(CLIMAS).flat()
    expect(new Set(todos).size).toBe(todos.length)
  })

  it('con su clima, el conjunto pega un 20 % más si sus dos ataques son de ese tipo', () => {
    const charizard = roster.find((e) => e.id === 'charizard')
    const opciones = { debilA: 'fire' }
    const igual = (r) => r.fast.type === 'fire' && r.charged.type === 'fire'
    const sin = evaluatePokemon(charizard, moves, opciones).find(igual)
    const con = evaluatePokemon(charizard, moves, { ...opciones, clima: CLIMAS.clear }).find(
      (r) => r.fast.id === sin.fast.id && r.charged.id === sin.charged.id
    )
    expect(con.dps / sin.dps).toBeGreaterThan(1.15)
    expect(con.dps / sin.dps).toBeLessThan(1.25)
  })
})

describe('ideas de Dittobase', () => {
  it('«Solo lo común» deja fuera megas, oscuros, legendarios y ultraentes', () => {
    const lista = computeCounters(roster, moves, typechart.chart, { types: ['steel', 'dragon'] }, {
      limit: 30,
      soloComunes: true
    })
    const porId = new Map(roster.map((p) => [p.id, p]))
    expect(lista.length).toBeGreaterThan(0)
    for (const fila of lista) {
      const e = porId.get(fila.id)
      expect(e.mega || e.shadow || e.legendary || e.mythical || e.ultraBeast, fila.id).toBeFalsy()
    }
    // Contra Dialga Oscuro, los de Lucha de siempre.
    expect(ids(lista.slice(0, 5))).toContain('lucario')
  })

  it('con una mega del grupo, sus tipos pegan ×1,3 y el resto ×1,1', () => {
    const raichu = roster.find((p) => p.id === 'raikou')
    const base = evaluatePokemon(raichu, moves)[0].edps
    const conElectrica = evaluatePokemon(raichu, moves, { potencia: ['electric'] })[0].edps
    const conOtra = evaluatePokemon(raichu, moves, { potencia: ['grass'] })[0].edps
    // El eDPS no sube del todo un 30 %: la vida no cambia, pero sí la energía.
    expect(conElectrica / base).toBeGreaterThan(1.25)
    expect(conElectrica / base).toBeLessThan(1.31)
    expect(conOtra / base).toBeGreaterThan(1.07)
    expect(conOtra / base).toBeLessThan(1.11)
  })
})
