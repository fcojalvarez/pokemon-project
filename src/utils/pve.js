/**
 * Rankings PvE: quién pega más fuerte en incursiones.
 *
 * Se calcula en el navegador a partir de pokemon.json + moves.json, con las
 * fórmulas de formulas.js. Así no hay una tabla precocinada que se quede vieja:
 * si cambian los datos, cambian los rankings.
 */
import {
  damage,
  effectiveStats,
  movesetPerformance,
  effectivenessAgainst,
  porVida,
  STAB
} from './formulas.js'

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
 * Los ataques que puede llevar en el cálculo: sus rápidos y sus cargados, sin
 * los legacy o élite si se piden fuera, y con el «+» de las supermegas.
 * La comparten evaluatePokemon y computeTypeRankings.
 */
function baraja(entry, options = {}) {
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

  return { fastPool, chargedPool, legacySet, eliteSet, megaMoves }
}

/**
 * Legendarios y megas de GO que nunca han sido jefes de incursión: Eternatus
 * solo sale en combates Max, los coronados y Necrozma Ultra se consiguen
 * fusionando, y Zygarde, Kubfu y Urshifu por otras vías. De los singulares
 * solo han sido jefes los de `SINGULARES_JEFE`; el resto llega con
 * investigaciones. No hay un historial de jefes que leer: la lista va a mano.
 */
const NUNCA_JEFE = new Set([
  'eternatus',
  'zacian_crowned_sword',
  'zamazenta_crowned_shield',
  'necrozma_ultra',
  'zygarde',
  'zygarde_10',
  'zygarde_complete',
  'kubfu',
  'urshifu_single_strike',
  'urshifu_rapid_strike'
])
const SINGULARES_JEFE = /^(deoxys|darkrai|genesect|hoopa_unbound)/

/** ¿Puede ser jefe de una incursión de 5 estrellas o mega? */
export function puedeSerJefe(e) {
  if (!e.released || e.shadow || !e.types?.length || NUNCA_JEFE.has(e.id)) return false
  if (e.mythical) return SINGULARES_JEFE.test(e.id)
  return Boolean(e.legendary || e.ultraBeast || e.mega)
}

/**
 * De qué tipos son los ataques de un jefe, como reparto que suma 1: la mitad
 * para sus rápidos y la mitad para sus cargados, cada uno con su STAB. Con
 * esto se sabe cuánto daño le hace a un atacante según sus tipos (ver
 * danoRecibido).
 */
function perfilDeAtaques(e, moves) {
  const perfil = new Map()
  for (const lista of [e.fast, e.charged]) {
    const ataques = (lista ?? []).filter((id) => usableMove(moves[id], id))
    const stab = (id) => (e.types.includes(moves[id].type) ? STAB : 1)
    const total = ataques.reduce((suma, id) => suma + stab(id), 0)
    for (const id of ataques) {
      const tipo = moves[id].type
      perfil.set(tipo, (perfil.get(tipo) ?? 0) + (0.5 * stab(id)) / total)
    }
  }
  return perfil
}

/**
 * Cuánto más (o menos) daño recibe un atacante de esos tipos de un jefe con
 * ese perfil, frente a uno neutro: el atacante dragón contra un jefe dragón
 * recibe ×1,6 de sus ataques de dragón y cae antes; el que los resiste
 * aguanta más.
 */
function danoRecibido(chart, perfil, tiposAtacante) {
  if (!perfil?.size) return 1
  let total = 0
  let pesos = 0
  for (const [tipo, peso] of perfil) {
    total += peso * effectivenessAgainst(chart, tipo, tiposAtacante)
    pesos += peso
  }
  return total / pesos
}

/**
 * Los jefes contra los que se calcula la lista de un tipo: los que han sido
 * jefes de incursión (ver puedeSerJefe) y son débiles a él, con sus tipos
 * reales y el reparto de tipos de sus ataques. Se agrupan por combinación de
 * tipos (`peso`, cuántos la comparten; su perfil, la media).
 *
 * Contra un jefe genérico débil solo a ese tipo, un cargado de otro tipo
 * pegaba ×1 aunque en el juego no sea así: Kyurem Negro con Rayo Gélido
 * Fusión hace ×1,6 o ×2,56 a casi todos los dragones, y era el #13 de dragón
 * cuando en Dittobase, DialgaDex o GO Hub es de los cinco primeros.
 *
 * Sin tabla de tipos, o si no hay ninguno débil (Normal), devuelve null y la
 * lista va contra el jefe genérico. Sin `moves`, sin perfil: el jefe pega
 * igual a cualquier atacante.
 */
export function jefesDebilesA(pokemon, chart, tipo, moves = null) {
  if (!chart || SIN_DEBILES.has(tipo)) return null
  const grupos = new Map()
  for (const e of pokemon) {
    if (!puedeSerJefe(e)) continue
    if (effectivenessAgainst(chart, tipo, e.types) <= 1) continue
    const clave = [...e.types].sort().join('+')
    const grupo = grupos.get(clave) ?? { types: e.types, peso: 0, perfil: new Map() }
    grupo.peso++
    if (moves) {
      for (const [t, p] of perfilDeAtaques(e, moves))
        grupo.perfil.set(t, (grupo.perfil.get(t) ?? 0) + p)
    }
    grupos.set(clave, grupo)
  }
  // El perfil del grupo es la media de los suyos (sigue sumando 1).
  for (const grupo of grupos.values()) {
    for (const [t, p] of grupo.perfil) grupo.perfil.set(t, p / grupo.peso)
  }
  return grupos.size ? [...grupos.values()] : null
}

/**
 * Tablas por lista de jefes, para no repetir cuentas: la eficacia de cada tipo
 * de ataque contra cada jefe y lo que recibe de cada jefe cada combinación de
 * tipos de atacante, en el orden de `jefes`. El ranking entero pregunta lo
 * mismo cientos de miles de veces.
 */
const tablasPorJefes = new WeakMap()
function tablasDe(chart, jefes) {
  let tablas = tablasPorJefes.get(jefes)
  if (!tablas) {
    tablas = { eficacia: new Map(), recibido: new Map() }
    tablasPorJefes.set(jefes, tablas)
  }
  return {
    eficacias(tipo) {
      let fila = tablas.eficacia.get(tipo)
      if (!fila) {
        fila = jefes.map((jefe) => effectivenessAgainst(chart, tipo, jefe.types))
        tablas.eficacia.set(tipo, fila)
      }
      return fila
    },
    recibidos(tiposAtacante) {
      const clave = tiposAtacante.length > 1 ? tiposAtacante.join('+') : tiposAtacante[0]
      let fila = tablas.recibido.get(clave)
      if (!fila) {
        fila = jefes.map((jefe) => danoRecibido(chart, jefe.perfil, tiposAtacante))
        tablas.recibido.set(clave, fila)
      }
      return fila
    }
  }
}

/**
 * Los tipos de sus ataques cargados que entran en el cálculo, sin evaluar
 * ninguna combinación (si no tiene un rápido que sirva, ninguno). Antes el
 * ranking evaluaba a cada Pokémon entero solo para saber esto, y luego otra
 * vez por cada tipo: casi un tercio del trabajo era esa primera pasada.
 */
function tiposDeCargados(entry, moves, options, conRapidos = false) {
  const { fastPool, chargedPool } = baraja(entry, options)
  const rapidos = fastPool.filter((id) => usableMove(moves[id], id))
  const cargados = chargedPool.filter((id) => usableMove(moves[id], id))
  if (!rapidos.length || !cargados.length) return []
  // Con jefes reales, también entra en la lista del tipo de su rápido.
  return [...new Set([...cargados, ...(conRapidos ? rapidos : [])].map((id) => moves[id].type))]
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
  // Con `jefes` (ver jefesDebilesA), contra esos jefes de verdad: entra todo
  // conjunto con algún ataque de ese tipo, rápido o cargado, y la cifra es la
  // media contra todos ellos, cada ataque con su eficacia real.
  const jefes = (debilA && chart && options.jefes) || null
  const tablas = jefes && tablasDe(chart, jefes)
  // Con clima: los ataques de los tipos que potencia pegan ×1,2.
  const clima = options.clima ?? null
  // Con una mega de otro jugador en la incursión: ×1,3 a los ataques de sus
  // tipos y ×1,1 al resto (ver potenciaMega).
  const potencia = options.potencia ?? null
  // Lo que suman el clima y la mega, aparte de la eficacia.
  const extra = (tipo) =>
    (clima?.includes(tipo) ? CLIMA : 1) *
    (potencia ? (potencia.includes(tipo) ? MEGA_MISMO_TIPO : MEGA_OTRO_TIPO) : 1)
  const eficacia = (tipo) =>
    (chart && defenderTypes
      ? effectivenessAgainst(chart, tipo, defenderTypes)
      : debilA && tipo === debilA && !SIN_DEBILES.has(debilA)
      ? SUPER_EFICAZ
      : 1) * extra(tipo)

  const stats = effectiveStats(entry.stats, ivs, level, { shadow: entry.shadow })
  // Lo que le pega cada jefe, por sus tipos (ver danoRecibido).
  const recibidos = tablas && tablas.recibidos(entry.types)
  const results = []

  const { fastPool, chargedPool, legacySet, eliteSet, megaMoves } = baraja(entry, options)

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
    const fast = {
      power: fm.pve.power,
      energy: fm.pve.energy,
      duration: fm.pve.duration,
      stab: entry.types.includes(fm.type)
    }

    for (const chargedId of chargedPool) {
      const cm = moves[chargedId]
      if (!usableMove(cm, chargedId)) continue
      if (debilA && cm.type !== debilA && !(jefes && fm.type === debilA)) continue
      const charged = {
        power: cm.pve.power * (exclusive.has(chargedId) ? SUPERMEGA_PLUS : 1),
        energy: cm.pve.energy,
        duration: cm.pve.duration,
        damageWindow: cm.pve.damageWindow,
        stab: entry.types.includes(cm.type)
      }
      const rinde = (fEff, cEff, recibido = 1) =>
        movesetPerformance({
          stats,
          target: recibido === 1 ? target : { ...target, recibido },
          fast: { ...fast, effectiveness: fEff },
          charged: { ...charged, effectiveness: cEff }
        })

      let perf
      if (jefes) {
        // La media contra los jefes.
        const fExtra = extra(fm.type)
        const cExtra = extra(cm.type)
        const dano = (ataque, eff) =>
          damage(ataque.power, stats.atk, target.def, {
            stab: ataque.stab ? STAB : 1,
            effectiveness: eff
          })
        perf = { dps: 0, tdo: 0, edps: 0 }
        let pesos = 0
        const fila = tablas.eficacias(fm.type)
        const filaC = tablas.eficacias(cm.type)
        for (let n = 0; n < jefes.length; n++) {
          const uno = porVida(
            dano(fast, fila[n] * fExtra),
            dano(charged, filaC[n] * cExtra),
            fast,
            charged,
            stats.def,
            stats.hp,
            recibidos[n]
          )
          const peso = jefes[n].peso
          perf.dps += uno.dps * peso
          perf.tdo += uno.tdo * peso
          perf.edps += uno.edps * peso
          pesos += peso
        }
        perf.dps /= pesos
        perf.tdo /= pesos
        perf.edps /= pesos
      } else {
        perf = rinde(fastEff, eficacia(cm.type))
      }

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
        // La lista en la que cuenta: con jefes reales puede ser la del rápido.
        tipo: debilA ?? cm.type,
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
 * Cada tipo, contra los jefes débiles a ese tipo (con `chart`; ver
 * jefesDebilesA): un Pokémon entra con su mejor conjunto contra ellos, que
 * tiene que llevar algún ataque de ese tipo, rápido o cargado. Cada ataque
 * pega lo que pegaría de verdad a cada jefe, y la cifra es la media. Así
 * Kyurem Negro sale en dragón con Rayo Gélido Fusión, como en Dittobase o
 * DialgaDex. Sin `chart`, contra un jefe genérico débil solo a ese tipo y con
 * el cargado de ese tipo.
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
  // Los jefes de cada tipo, una vez para todos (ver jefesDebilesA).
  const chart = options.chart ?? null
  const jefesDe = new Map()
  const jefes = (tipo) => {
    if (!jefesDe.has(tipo)) jefesDe.set(tipo, jefesDebilesA(pokemon, chart, tipo, moves))
    return jefesDe.get(tipo)
  }

  for (const entry of pokemon) {
    if (!usable(entry, options)) continue
    // Una pasada por cada tipo de sus ataques, contra los jefes débiles a él.
    const tipos = tiposDeCargados(entry, moves, options, Boolean(chart))
    const suyos = []
    for (const type of tipos) {
      if (!byType.has(type)) byType.set(type, new Map())
      const porTipo = new Map()
      const contra = { ...options, debilA: type, jefes: jefes(type) }
      for (const r of evaluatePokemon(entry, moves, contra)) {
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
        tiposGeneral: [mejor.tipo, segundo?.tipo].filter(Boolean)
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
