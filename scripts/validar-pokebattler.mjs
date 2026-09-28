/**
 * Contrasta los counters de la app con los de Pokebattler. Solo lee: no
 * escribe nada, ni en public/data ni en Supabase.
 *
 *   node scripts/validar-pokebattler.mjs              jefes actuales
 *   node scripts/validar-pokebattler.mjs MEWTWO GROUDON_PRIMAL:RAID_LEVEL_MEGA_5
 *
 * Para cada jefe compara el top 10 de la app (computeCounters, el mismo cálculo
 * que la pantalla de incursiones) con el de Pokebattler, que simula el combate
 * entero: cuántos coinciden y cómo se parecen los órdenes (Spearman sobre los
 * 30 que publica Pokebattler). Con los jefes de los combates Max hace lo mismo
 * con maxCounters.
 *
 * No son la misma medida: la app ordena por DPS (o por potencia del Ataque
 * Max) y Pokebattler por su «estimator», que cuenta también lo que aguanta
 * cada uno. Que no coincidan del todo es esperable; sirve para ver qué falta
 * en los datos (un ataque, una marca de Dinamax) y dónde el modelo se aleja.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeCounters } from '../src/utils/pve.js'
import { maxCounters } from '../src/utils/maxBattle.js'
import { POKEBATTLER, idDelRoster, ataqueDelJuego } from './lib/pokebattler.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const leer = async (nombre) => JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'data', nombre), 'utf8'))

/** Los mismos ajustes que la página de Pokebattler por defecto. */
const AJUSTES = new URLSearchParams({
  sort: 'ESTIMATOR',
  weatherCondition: 'NO_WEATHER',
  dodgeStrategy: 'DODGE_REACTION_TIME',
  aggregation: 'AVERAGE',
  randomAssistants: '-1',
  includeLegendary: 'true',
  includeShadow: 'true',
  includeMegas: 'true',
  attackerTypes: 'POKEMON_TYPE_ALL',
})
const urlRanking = (jefe, nivel) =>
  `https://fight.pokebattler.com/raids/defenders/${jefe}/levels/${nivel}/attackers/levels/40/` +
  `strategies/CINEMATIC_ATTACK_WHEN_POSSIBLE/DEFENSE_RANDOM_MC?${AJUSTES}`

const pedir = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`)
  return res.json()
}

/** Los niveles de incursión que se comparan si no se pasa ninguno. */
const NIVELES_INCURSION = ['RAID_LEVEL_5', 'RAID_LEVEL_MEGA', 'RAID_LEVEL_MEGA_5', 'RAID_LEVEL_5_SHADOW', 'RAID_LEVEL_ULTRA_BEAST', 'RAID_LEVEL_3']
/** Y algunos clásicos, para tener jefes de tipos variados aunque no estén hoy. */
const CLASICOS = [
  ['MEWTWO', 'RAID_LEVEL_5_LEGACY'], ['GROUDON', 'RAID_LEVEL_5_LEGACY'], ['KYOGRE', 'RAID_LEVEL_5_LEGACY'],
  ['RAYQUAZA', 'RAID_LEVEL_5_LEGACY'], ['DIALGA', 'RAID_LEVEL_5_LEGACY'], ['GIRATINA_ORIGIN_FORM', 'RAID_LEVEL_5_LEGACY'],
]

/**
 * El ranking de Pokebattler, del mejor al peor. `randomMove.defenders` son los
 * 30 mejores atacantes contra los ataques del jefe al azar, ordenados del
 * peor al mejor; de cada uno vale su mejor conjunto (menor estimator).
 */
function rankingPokebattler(datos, ids) {
  const lista = datos?.attackers?.[0]?.randomMove?.defenders ?? []
  return lista
    .map((d) => {
      const mejor = d.byMove.reduce((a, b) => (b.result.estimator < a.result.estimator ? b : a))
      return {
        pb: d.pokemonId,
        id: idDelRoster(d.pokemonId.replace(/_GIGANTAMAX$/, ''), ids),
        gigamax: /_GIGANTAMAX$/.test(d.pokemonId),
        fast: ataqueDelJuego(mejor.move1),
        charged: ataqueDelJuego(mejor.move2),
        estimator: mejor.result.estimator,
      }
    })
    .sort((a, b) => a.estimator - b.estimator)
}

/** Spearman sobre los que están en las dos listas, con el puesto de cada una. */
function spearman(pares) {
  const n = pares.length
  if (n < 3) return null
  const rango = (valores) => {
    const orden = [...valores.keys()].sort((a, b) => valores[a] - valores[b])
    const r = []
    orden.forEach((i, k) => (r[i] = k + 1))
    return r
  }
  const ra = rango(pares.map((p) => p[0]))
  const rb = rango(pares.map((p) => p[1]))
  const d2 = ra.reduce((s, v, i) => s + (v - rb[i]) ** 2, 0)
  return 1 - (6 * d2) / (n * (n * n - 1))
}

/** Por qué puede faltar uno de Pokebattler en la lista de la app. */
function motivo(entrada, porId, moves, max) {
  const p = porId.get(entrada.id)
  if (!entrada.id) return `no casa con el roster (${entrada.pb})`
  if (!p) return 'no está en el roster'
  if (!p.released) return 'marcado sin liberar'
  if (max && !p.dynamax && !p.gigantamax) return 'sin marca de Dinamax/Gigamax'
  if (!max) {
    const falta = [entrada.fast, entrada.charged].filter((m) => !p.fast.includes(m) && !p.charged.includes(m) && !p.megaMoves?.includes(m))
    if (falta.length) return `le falta ${falta.join(', ')}`
    const sinPve = [entrada.fast, entrada.charged].filter((m) => !(moves[m]?.pve?.power > 0))
    if (sinPve.length) return `${sinPve.join(', ')} sin datos de incursión (la app no lo rankea)`
  }
  return null
}

async function main() {
  const [roster, moves, typechart, maxbattles] = await Promise.all([
    leer('roster.json'), leer('moves.json'), leer('typechart.json'), leer('maxbattles.json'),
  ])
  const chart = typechart.chart
  const ids = new Set(roster.map((p) => p.id))
  const porId = new Map(roster.map((p) => [p.id, p]))
  const raids = await pedir(POKEBATTLER.raids)

  const pedidos = process.argv.slice(2)
  let jefes
  if (pedidos.length) {
    jefes = pedidos.map((txt) => {
      const [pb, nivel] = txt.split(':')
      return [pb, nivel ?? 'RAID_LEVEL_5']
    })
  } else {
    jefes = [
      ...raids.tiers.filter((t) => NIVELES_INCURSION.includes(t.tier)).flatMap((t) => t.raids.map((r) => [r.pokemon, t.tier])),
      ...CLASICOS,
      ...raids.tiers.filter((t) => /_MAX$/.test(t.tier)).flatMap((t) => t.raids.map((r) => [r.pokemon, t.tier])),
    ]
  }

  const resumen = []
  for (const [pb, nivel] of jefes) {
    const esMax = /_MAX/.test(nivel)
    const idJefe = idDelRoster(pb.replace(/_GIGANTAMAX$/, ''), ids)
    const jefe = porId.get(idJefe)
    if (!jefe) {
      console.log(`\n${pb} (${nivel}): no casa con el roster, se salta`)
      continue
    }
    let datos
    try {
      datos = await pedir(urlRanking(pb, nivel))
    } catch (err) {
      console.log(`\n${pb} (${nivel}): ${err.message}`)
      continue
    }
    const suyo = rankingPokebattler(datos, ids)

    let nuestro
    if (esMax) {
      nuestro = maxCounters(jefe, roster, chart, {
        limit: 200,
        moves,
        maxPorTipo: maxbattles.byType,
        gmaxPorEspecie: maxbattles.gmaxBySpecies,
      }).attackers.map((a) => ({ id: a.id, gigamax: a.gigantamax, texto: `${a.fastMove?.id ?? '—'} → ${a.maxMove?.name ?? a.maxType}` }))
    } else {
      nuestro = computeCounters(roster, moves, chart, { types: jefe.types }, { limit: 2000 })
        .map((c) => ({ id: c.id, texto: `${c.fast.id}/${c.charged.id} ${c.dps.toFixed(1)} DPS` }))
    }
    // En los Max, un mismo Pokémon puede salir en Dinamax y en Gigamax: se
    // compara por id, que es lo que la app lista.
    const puestoNuestro = new Map()
    nuestro.forEach((c, i) => { if (!puestoNuestro.has(c.id)) puestoNuestro.set(c.id, i + 1) })
    const suyoUnico = []
    const vistos = new Set()
    for (const s of suyo) if (s.id && !vistos.has(s.id)) { vistos.add(s.id); suyoUnico.push(s) }

    const top = 10
    const suyoTop = suyoUnico.slice(0, top)
    const nuestroTop = [...new Set(nuestro.map((c) => c.id))].slice(0, top)
    const comunes = suyoTop.filter((s) => nuestroTop.includes(s.id)).length
    const rho = spearman(suyoUnico.filter((s) => puestoNuestro.has(s.id)).map((s, i) => [i + 1, puestoNuestro.get(s.id)]))

    console.log(`\n=== ${jefe.name} (${nivel}) — ${jefe.types.join('/')}`)
    console.log(`  top ${top} en común: ${comunes}/${top}` + (rho == null ? '' : `, Spearman ${rho.toFixed(2)} sobre ${suyoUnico.filter((s) => puestoNuestro.has(s.id)).length}`))
    console.log('  Pokebattler                                  | app')
    for (let i = 0; i < top; i++) {
      const s = suyoTop[i]
      const n = nuestro.find((c) => c.id === nuestroTop[i])
      const izq = s ? `${String(i + 1).padStart(2)}. ${s.id ?? s.pb} ${s.fast}/${s.charged}`.slice(0, 44).padEnd(44) : ''.padEnd(44)
      console.log(`  ${izq} | ${n ? `${n.id} ${n.texto}` : ''}`)
    }
    const faltan = suyoTop.filter((s) => !nuestroTop.includes(s.id))
    for (const s of faltan) {
      const puesto = puestoNuestro.get(s.id)
      const por = motivo(s, porId, moves, esMax)
      console.log(`  · ${s.id ?? s.pb}: ${puesto ? `en la app, puesto ${puesto}` : 'no sale en la app'}${por ? ` — ${por}` : ''}`)
    }
    resumen.push({ jefe: jefe.name, nivel, comunes, rho })
  }

  console.log('\n=== Resumen')
  for (const r of resumen) {
    console.log(`  ${r.jefe.padEnd(28)} ${r.nivel.padEnd(22)} ${r.comunes}/10${r.rho == null ? '' : `  ρ=${r.rho.toFixed(2)}`}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
