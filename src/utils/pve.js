/**
 * Rankings PvE: quién pega más fuerte en incursiones.
 *
 * Se calcula en el navegador a partir de pokemon.json + moves.json, con las
 * fórmulas de formulas.js. Así no hay una tabla precocinada que se quede vieja:
 * si cambian los datos, cambian los rankings.
 */
import { effectiveStats, movesetPerformance, effectivenessAgainst } from './formulas.js'

/** Jefe genérico: defensa típica de una incursión, sin ventaja de tipo. */
export const DEFAULT_TARGET = { def: 180 }
export const DEFAULT_LEVEL = 40
export const PERFECT_IVS = { atk: 15, def: 15, hp: 15 }

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
  const sortBy = options.sortBy ?? 'dps'

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

  // El movimiento exclusivo de las supermegas entra en la baraja como uno más.
  // Hoy se descarta solo, porque `usable` exige stats de PvE y el GAME_MASTER
  // todavía no las publica; el día que aparezcan, se rankea sin tocar nada.
  const chargedPool = (
    entry.megaMoves?.length ? [...entry.charged, ...entry.megaMoves] : entry.charged
  ).filter(alcanzable)

  const fastPool = entry.fast.filter(alcanzable)

  // De dónde sale cada movimiento. Viaja con el resultado para que quien lo
  // pinte (rankings, counters, ficha) pueda marcarlo sin volver al roster.
  const elite = eliteSet
  const legacy = legacySet
  const exclusive = new Set(entry.megaMoves ?? [])
  const describe = (id, move) => ({
    id,
    nameEs: move.nameEs,
    type: move.type,
    elite: elite.has(id),
    legacy: legacy.has(id),
    mega: exclusive.has(id),
  })

  for (const fastId of fastPool) {
    const fm = moves[fastId]
    if (!usableMove(fm, fastId)) continue
    const fastEff = chart && defenderTypes
      ? effectivenessAgainst(chart, fm.type, defenderTypes)
      : 1

    for (const chargedId of chargedPool) {
      const cm = moves[chargedId]
      if (!usableMove(cm, chargedId)) continue
      const chargedEff = chart && defenderTypes
        ? effectivenessAgainst(chart, cm.type, defenderTypes)
        : 1

      const perf = movesetPerformance({
        stats,
        target,
        fast: {
          power: fm.pve.power,
          energy: fm.pve.energy,
          duration: fm.pve.duration,
          stab: entry.types.includes(fm.type),
          effectiveness: fastEff,
        },
        charged: {
          power: cm.pve.power,
          energy: cm.pve.energy,
          duration: cm.pve.duration,
          stab: entry.types.includes(cm.type),
          effectiveness: chargedEff,
        },
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
        er: perf.er,
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
 * Mejores atacantes de cada tipo, contra un objetivo neutro.
 * Un Pokémon entra en la lista del tipo de su movimiento cargado.
 *
 * @returns {{byType: Record<string, object[]>, overall: object[]}}
 */
export function computeTypeRankings(pokemon, moves, options = {}) {
  const sortBy = options.sortBy ?? 'dps'
  const limit = options.limit ?? 40
  const byType = new Map()
  const overall = new Map()

  for (const entry of pokemon) {
    if (!usable(entry, options)) continue
    for (const r of evaluatePokemon(entry, moves, options)) {
      const type = r.charged.type
      if (!byType.has(type)) byType.set(type, new Map())
      keep(byType.get(type), r.id, r, sortBy)
      keep(overall, r.id, r, sortBy)
    }
  }

  const rank = (map) =>
    [...map.values()]
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, limit)
      .map((e, i) => ({ ...e, rank: i + 1 }))

  const out = {}
  for (const [type, map] of byType) out[type] = rank(map)
  return { byType: out, overall: rank(overall) }
}

/**
 * Mejores counters contra un jefe concreto: se recalcula el daño aplicando la
 * efectividad real de cada movimiento contra los tipos del jefe.
 */
export function computeCounters(pokemon, moves, chart, boss, options = {}) {
  const sortBy = options.sortBy ?? 'dps'
  const limit = options.limit ?? 20
  const best = new Map()
  const opts = {
    ...options,
    chart,
    defenderTypes: boss.types,
    target: boss.target ?? DEFAULT_TARGET,
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
