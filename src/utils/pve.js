/**
 * Rankings PvE: quién pega más fuerte en incursiones.
 *
 * Se calcula en el navegador a partir de pokemon.json + moves.json, con las
 * fórmulas de formulas.js. Así no hay una tabla precocinada que se quede vieja:
 * si cambian los datos, cambian los rankings.
 */
import { effectiveStats, movesetPerformance, effectivenessAgainst } from './formulas.js'

/** Jefe genérico: defensa típica de una incursión, sin ventaja de tipo. */
const DEFAULT_TARGET = { def: 180 }
const DEFAULT_LEVEL = 40
const PERFECT_IVS = { atk: 15, def: 15, hp: 15 }

/**
 * Lo que pega de más un ataque súper eficaz. Las listas por tipo se calculan
 * contra un jefe débil a ese tipo (ver computeTypeRankings).
 */
export const SUPER_EFICAZ = 1.6

/** Lo que pega de más un ataque de un tipo potenciado por el clima. */
export const CLIMA = 1.2

/**
 * Lo que da una mega (o un primigenio) activa en la incursión a los demás:
 * ×1,3 a los ataques de sus tipos y ×1,1 al resto. Es MEGA_EVOLUTION_LEVEL del
 * GAME_MASTER (sameTypeAttackBoost y differentTypeAttackBoost), igual en
 * todos los niveles mega.
 */
export const MEGA_MISMO_TIPO = 1.3
export const MEGA_OTRO_TIPO = 1.1

/**
 * Tipos a los que no es débil nadie: su lista va contra un jefe neutro. Sin
 * esto, Regigigas Oscuro sumaba su tipo Normal a ×1,6, un daño que en el juego
 * no se da nunca, y salía entre los cinco primeros de la lista general.
 */
const SIN_DEBILES = new Set(['normal'])

/**
 * La métrica con la que se ordena todo lo de incursiones (Top, counters,
 * mejores conjuntos de la ficha): el eDPS, el DPS descontando el tiempo que se
 * pierde al debilitarse. Es la que dice a quién merece la pena subir; el DPS
 * a secas premiaba a los de cristal (ver movesetPerformance).
 */
export const METRICA_PVE = 'edps'

/**
 * Lo que pega de más el ataque «+» de una supermega en su nivel mega 4 (Super
 * Max): ×1 en el nivel 1, ×1,1 en el 2, ×1,2 en el 3 y ×1,3 en el 4. El
 * GAME_MASTER no lo publica (sus niveles mega solo traen el bonus a los
 * compañeros); son los valores observados por la comunidad, los mismos que usa
 * Dittobase. Se toma el del nivel 4: el Top dice a quién subir, y una mega que
 * se sube se acaba llevando a tope.
 */
export const SUPERMEGA_PLUS = 1.3

/** Movimientos que no son una opción real para un atacante optimizado. */
const EXCLUDED_MOVES = new Set(['FRUSTRATION', 'RETURN', 'STRUGGLE'])

/**
 * Un movimiento sirve para rankear si existe, no está vetado y tiene stats de
 * PvE. Lo de `pve` no es paranoia: los movimientos exclusivos de las supermegas
 * llegan desde pvpoke sin datos de incursiones (`pve: null`), y sin esta
 * comprobación reventaría al leer `.power`.
 */
function usableMove(move, id) {
  return Boolean(move) && !EXCLUDED_MOVES.has(id) && move.pve?.power > 0
}

function usable(entry, options) {
  if (options.onlyReleased !== false && !entry.released) return false
  if (options.includeMega === false && entry.mega) return false
  if (options.includeShadow === false && entry.shadow) return false
  if (options.includeLegendary === false && (entry.legendary || entry.mythical)) return false
  // Lo que tiene todo el mundo: sin megas, oscuros, legendarios ni ultraentes.
  if (
    options.soloComunes &&
    (entry.mega || entry.shadow || entry.legendary || entry.mythical || entry.ultraBeast)
  )
    return false
  return true
}

/**
 * Evalúa todos los movesets de un Pokémon y devuelve el mejor por cada tipo
 * de ataque cargado, más el mejor absoluto.
 */
export function evaluatePokemon(entry, moves, options = {}) {
  const level = options.level ?? DEFAULT_LEVEL
  const ivs = options.ivs ?? PERFECT_IVS
  const target = options.target ?? DEFAULT_TARGET
  const chart = options.chart ?? null
  const defenderTypes = options.defenderTypes ?? null
  const sortBy = options.sortBy ?? METRICA_PVE
  // Contra un jefe débil a este tipo: solo sus ataques cargados de ese tipo,
  // y cada ataque de ese tipo (rápido o cargado) pega ×1,6; el resto, ×1.
  const debilA = options.debilA ?? null
  // Con clima: los ataques de los tipos que potencia pegan ×1,2.
  const clima = options.clima ?? null
  // Con una mega de otro jugador en la incursión: ×1,3 a los ataques de sus
  // tipos y ×1,1 al resto (ver potenciaMega).
  const potencia = options.potencia ?? null
  const eficacia = (tipo) =>
    (chart && defenderTypes
      ? effectivenessAgainst(chart, tipo, defenderTypes)
      : debilA && tipo === debilA && !SIN_DEBILES.has(debilA)
      ? SUPER_EFICAZ
      : 1) *
    (clima?.includes(tipo) ? CLIMA : 1) *
    (potencia ? (potencia.includes(tipo) ? MEGA_MISMO_TIPO : MEGA_OTRO_TIPO) : 1)

  const stats = effectiveStats(entry.stats, ivs, level, { shadow: entry.shadow })
  const results = []

  // Los legacy ya no se pueden conseguir, ni con MT Élite. Se pueden dejar
  // fuera para ver el ranking que de verdad está al alcance: hay Pokémon que
  // suben mucho gracias a uno y sin él pegan bastante menos —Zamazenta pierde
  // casi un tercio de DPS sin Embate Supremo— y el ranking enseñaba solo su
  // mejor conjunto, sin decir a qué distancia queda el alcanzable.
  const legacySet = new Set(entry.legacyMoves ?? [])
  // Los élite sí se consiguen, pero solo gastando una MT Élite o en eventos
  // concretos. Apagarlos deja el ranking de lo que se aprende con MT normales.
  const eliteSet = new Set(entry.eliteMoves ?? [])
  const alcanzable = (id) =>
    (options.includeLegacy !== false || !legacySet.has(id)) &&
    (options.includeElite !== false || !eliteSet.has(id))

  // El movimiento exclusivo de las supermegas («+») entra en la baraja como
  // uno más, con su potencia ×SUPERMEGA_PLUS, pero solo si su especie tiene
  // abierto el nivel mega 4 (`superMax`, del GAME_MASTER): pvpoke trae el «+»
  // de alguna que aún no puede usarlo. Si el GAME_MASTER aún no publica sus
  // stats de PvE, `usable` lo descarta solo.
  const megaMoves = entry.superMax ? entry.megaMoves ?? [] : []
  const chargedPool = (megaMoves.length ? [...entry.charged, ...megaMoves] : entry.charged).filter(
    alcanzable
  )

  const fastPool = entry.fast.filter(alcanzable)

  // De dónde sale cada movimiento. Viaja con el resultado para que quien lo
  // pinte (rankings, counters, ficha) pueda marcarlo sin volver al roster.
  const elite = eliteSet
  const legacy = legacySet
  const exclusive = new Set(megaMoves)
  const describe = (id, move) => ({
    id,
    name: move.name,
    nameEs: move.nameEs,
    type: move.type,
    elite: elite.has(id),
    legacy: legacy.has(id),
    mega: exclusive.has(id)
  })

  for (const fastId of fastPool) {
    const fm = moves[fastId]
    if (!usableMove(fm, fastId)) continue
    const fastEff = eficacia(fm.type)

    for (const chargedId of chargedPool) {
      const cm = moves[chargedId]
      if (!usableMove(cm, chargedId)) continue
      if (debilA && cm.type !== debilA) continue
      const chargedEff = eficacia(cm.type)

      const perf = movesetPerformance({
        stats,
        target,
        fast: {
          power: fm.pve.power,
          energy: fm.pve.energy,
          duration: fm.pve.duration,
          stab: entry.types.includes(fm.type),
          effectiveness: fastEff
        },
        charged: {
          power: cm.pve.power * (exclusive.has(chargedId) ? SUPERMEGA_PLUS : 1),
          energy: cm.pve.energy,
          duration: cm.pve.duration,
          stab: entry.types.includes(cm.type),
          effectiveness: chargedEff
        }
      })

      results.push({
        id: entry.id,
        nameEs: entry.nameEs,
        name: entry.name,
        dex: entry.dex,
        // Sin esto las megas y las formas regionales saldrían con el sprite roto.
        spriteId: entry.spriteId ?? entry.dex,
        types: entry.types,
        shadow: entry.shadow,
        mega: entry.mega,
        legendary: entry.legendary,
        mythical: entry.mythical,
        fast: describe(fastId, fm),
        charged: describe(chargedId, cm),
        dps: perf.dps,
        tdo: perf.tdo,
        edps: perf.edps
      })
    }
  }

  results.sort((a, b) => b[sortBy] - a[sortBy])
  return results
}

function keep(best, key, candidate, sortBy) {
  const current = best.get(key)
  if (!current || candidate[sortBy] > current[sortBy]) best.set(key, candidate)
}

/**
 * Mejores atacantes de cada tipo y en general.
 *
 * Cada tipo, contra un jefe débil a ese tipo, como las listas de atacantes de
 * la comunidad (GO Hub, GamePress): un Pokémon entra con su mejor conjunto de
 * cargado de ese tipo, y su ataque rápido cuenta ×1,6 si también es de ese
 * tipo. Antes era contra un jefe neutro, y un rápido de otro tipo puntuaba
 * igual: salían arriba de Fuego Mega Mewtwo con Contraataque o Groudon
 * Primigenio con Cola Dragón, que contra un jefe de verdad pegan bastante
 * menos.
 *
 * La lista general, por versatilidad: cada Pokémon puntúa la suma de sus dos
 * mejores tipos (con la métrica de `sortBy`), y su fila enseña el conjunto y
 * las cifras de su mejor tipo. Antes era el mejor DPS contra un jefe neutro y
 * salía primero Regigigas Oscuro, que pega mucho pero con ataques Normal, que
 * nunca son súper eficaces. Comparada con la lista general de GO Hub, la suma
 * de los dos mejores es la que más se le parece (39 de sus 50 primeros).
 *
 * @returns {{byType: Record<string, object[]>, overall: object[]}}
 */
export function computeTypeRankings(pokemon, moves, options = {}) {
  const sortBy = options.sortBy ?? METRICA_PVE
  const limit = options.limit ?? 40
  const byType = new Map()
  const overall = new Map()

  for (const entry of pokemon) {
    if (!usable(entry, options)) continue
    // Una pasada por cada tipo de cargado que tenga, contra un jefe débil a él.
    const tipos = new Set(evaluatePokemon(entry, moves, options).map((r) => r.charged.type))
    const suyos = []
    for (const type of tipos) {
      if (!byType.has(type)) byType.set(type, new Map())
      const porTipo = new Map()
      for (const r of evaluatePokemon(entry, moves, { ...options, debilA: type })) {
        keep(byType.get(type), r.id, r, sortBy)
        keep(porTipo, r.id, r, sortBy)
      }
      suyos.push(...porTipo.values())
    }
    // Por forma (un mismo dex puede traer varias): sus dos mejores tipos.
    const porForma = new Map()
    for (const r of suyos) {
      if (!porForma.has(r.id)) porForma.set(r.id, [])
      porForma.get(r.id).push(r)
    }
    for (const filas of porForma.values()) {
      filas.sort((a, b) => b[sortBy] - a[sortBy])
      const [mejor, segundo] = filas
      overall.set(mejor.id, {
        ...mejor,
        general: mejor[sortBy] + (segundo?.[sortBy] ?? 0),
        tiposGeneral: [mejor.charged.type, segundo?.charged.type].filter(Boolean)
      })
    }
  }

  const rank = (map, clave = sortBy) =>
    [...map.values()]
      .sort((a, b) => b[clave] - a[clave])
      .slice(0, limit)
      .map((e, i) => ({ ...e, rank: i + 1 }))

  const out = {}
  for (const [type, map] of byType) out[type] = rank(map)
  return { byType: out, overall: rank(overall, 'general') }
}

/**
 * Mejores counters contra un jefe concreto: se recalcula el daño aplicando la
 * efectividad real de cada movimiento contra los tipos del jefe.
 */
export function computeCounters(pokemon, moves, chart, boss, options = {}) {
  const sortBy = options.sortBy ?? METRICA_PVE
  const limit = options.limit ?? 20
  const best = new Map()
  const opts = {
    ...options,
    chart,
    defenderTypes: boss.types,
    target: boss.target ?? DEFAULT_TARGET
  }

  for (const entry of pokemon) {
    if (!usable(entry, opts)) continue
    for (const r of evaluatePokemon(entry, moves, opts)) keep(best, r.id, r, sortBy)
  }

  return [...best.values()]
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, limit)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

/**
 * Debilidades y resistencias de una combinación de tipos.
 *
 * En Pokémon GO no hay inmunidades: lo más bajo posible es ×0.390625, que es
 * una resistencia doble. Por eso solo hay dos cubos, ordenados por intensidad.
 */
export function typeMatchups(chart, types, allTypes) {
  const weak = []
  const resist = []
  for (const t of allTypes) {
    const mult = effectivenessAgainst(chart, t, types)
    if (mult > 1) weak.push({ type: t, mult })
    else if (mult < 1) resist.push({ type: t, mult })
  }
  weak.sort((a, b) => b.mult - a.mult)
  resist.sort((a, b) => a.mult - b.mult)
  return { weak, resist }
}

/**
 * ¿Puede defender un gimnasio? No pueden los legendarios, los singulares,
 * los ultraentes, los oscuros ni las megas (la mega vuelve a su forma al
 * dejarla).
 */
export function puedeDefender(entry) {
  return Boolean(
    entry?.released &&
      entry.stats &&
      !entry.shadow &&
      !entry.mega &&
      !entry.legendary &&
      !entry.mythical &&
      !entry.ultraBeast
  )
}

/**
 * Los mejores defensores de gimnasio.
 *
 * Un defensor aguanta y obliga a gastar pociones; el daño que hace cuenta,
 * pero menos. Por eso pesa sobre todo el aguante: PS de defensor (en un
 * gimnasio, el doble) por defensa, al nivel 40 y 15/15/15. Puntuación:
 * aguante^1,5 × DPS^0,5, con su mejor conjunto contra un objetivo neutro.
 * Así salen arriba Blissey y Snorlax, como dice la comunidad, y no un
 * atacante de cristal.
 *
 * Cada fila es la de evaluatePokemon con `rank`, `value` (de 0 a 100,
 * respecto al primero), `psDefensor` y `defensa`.
 */
export function computeDefenders(pokemon, moves, options = {}) {
  const filas = []
  for (const entry of pokemon) {
    if (!puedeDefender(entry)) continue
    const mejor = evaluatePokemon(entry, moves, { ...options, sortBy: 'dps' })[0]
    if (!mejor) continue
    const stats = effectiveStats(entry.stats, PERFECT_IVS, DEFAULT_LEVEL)
    const psDefensor = stats.hp * 2
    const aguante = psDefensor * stats.def
    filas.push({
      ...mejor,
      psDefensor,
      defensa: Math.round(stats.def),
      puntuacion: aguante ** 1.5 * mejor.dps ** 0.5
    })
  }
  filas.sort((a, b) => b.puntuacion - a.puntuacion)
  const tope = filas[0]?.puntuacion || 1
  return filas.map((fila, i) => ({
    ...fila,
    rank: i + 1,
    value: Math.round((fila.puntuacion / tope) * 100)
  }))
}
