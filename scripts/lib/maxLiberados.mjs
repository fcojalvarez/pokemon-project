/**
 * Qué Pokémon tienen de verdad Dinamax y Gigamax en el juego.
 *
 * El GAME_MASTER dice quién PUEDE dinamaxizar o gigamaxizar, y lo dice antes
 * de tiempo: Flapple y Appletun, Eevee, Urshifu o Melmetal salían con la marca
 * de Gigamax sin haber salido nunca. Como con el variocolor, la marca solo
 * sirve si ya se puede conseguir, así que aquí se cruza lo que el juego
 * permite con lo que se sabe liberado:
 *
 *   - Dinamax: la semilla de scripts/datos/dinamax-liberados.json (la wiki,
 *     sacada una vez) y lo que haya salido en los combates Max (`vistos`, que
 *     va guardando `pnpm max`). Se hereda a las evoluciones: de un Charmander
 *     Dinamax sale un Charizard Dinamax.
 *   - Gigamax: los variocolores Gigamax de LeekDuck con fecha ya pasada (los
 *     anunciados vienen con fecha futura) y lo visto en los combates Max. El
 *     Gigamax es de una especie concreta: no se hereda.
 */
import { normalizeName } from '../../src/utils/gameText.js'
import { parseMaxBattle, splitPokemonList } from '../../src/utils/eventName.js'

/** «Toxtricity (Amped)» → «toxtricity»: la semilla va por especie. */
const especie = (nombre) => normalizeName(String(nombre ?? '').replace(/\s*\(.*\)\s*$/, ''))

/** Ni megas ni oscuros: esas formas no dinamaxizan aunque su especie sí. */
const esFormaBase = (p) => !p.mega && !p.shadow && !/_(mega|mega_x|mega_y|primal|shadow)$/.test(p.id)

/** LeekDuck escribe la familia como «Pikachu_20170815» o «Scorbunny». */
const familiaLeekDuck = (familia) => `FAMILY_${String(familia ?? '').replace(/_\d+$/, '').toUpperCase()}`

/**
 * @param {object[]} roster con `dynamax`/`gigantamax` tal como los da el juego
 * @param {{semilla?: object, vistos?: {dinamax?: object, gigamax?: object},
 *          shinyLeekDuck?: object[], hoy?: Date}} fuentes
 * @returns {{dinamax: Set<string>, gigamax: Set<string>}} ids del roster
 */
export function maxLiberados(roster, { semilla = {}, vistos = {}, shinyLeekDuck = [], hoy = new Date() } = {}) {
  const base = roster.filter(esFormaBase)
  const porId = new Map(roster.map((p) => [p.id, p]))

  // --- Dinamax ---------------------------------------------------------------
  const nombresSemilla = new Set(Object.keys(semilla).map(especie))
  const dexVistosD = new Set(Object.keys(vistos.dinamax ?? {}).map(Number))
  const pendientes = base
    .filter((p) => !p.regional && (nombresSemilla.has(especie(p.name)) || dexVistosD.has(p.dex)))
    .map((p) => p.id)

  const dinamax = new Set()
  while (pendientes.length) {
    const id = pendientes.pop()
    if (dinamax.has(id)) continue
    dinamax.add(id)
    for (const siguiente of porId.get(id)?.evolutions ?? []) pendientes.push(siguiente)
  }
  // Solo lo que el juego permite: la herencia no inventa Dinamax.
  for (const id of dinamax) if (!porId.get(id)?.dynamax) dinamax.delete(id)

  // --- Gigamax ---------------------------------------------------------------
  const familias = new Set(
    shinyLeekDuck
      .filter((uno) => /GIGANTAMAX/.test(uno?.aa_fn ?? '') && uno.released_date)
      .filter((uno) => new Date(uno.released_date.replace(/\//g, '-')) <= hoy)
      .map((uno) => familiaLeekDuck(uno.family))
  )
  // Las especies sin evoluciones (Lapras, Snorlax) vienen sin familia en el
  // roster: su familia es ella misma, como la nombra LeekDuck. No se usa el
  // número de Pokédex de LeekDuck porque a veces viene mal (G-Max Cinderace
  // lo trae con el 812, que es Rillaboom).
  const familiaDe = (p) => p.family ?? `FAMILY_${especie(p.name).toUpperCase()}`
  const dexVistosG = new Set(Object.keys(vistos.gigamax ?? {}).map(Number))
  const gigamax = new Set(
    base
      .filter((p) => p.gigantamax && (familias.has(familiaDe(p)) || dexVistosG.has(p.dex)))
      .map((p) => p.id)
  )

  return { dinamax, gigamax }
}

/**
 * Los Pokémon Max de los eventos de LeekDuck que ya han empezado.
 *
 * Es el aviso más temprano de que sale uno nuevo: «Dynamax Sobble during Max
 * Monday» o «Gigantamax Cinderace Max Battle Day» dicen quién y cuándo, y en
 * cuanto empieza ya se puede conseguir. Los que aún no han empezado no
 * cuentan: el anuncio no es la salida.
 *
 * @param {object[]} events de ScrapedDuck
 * @param {Map<string, number>} dexPorNombre nombre normalizado → Pokédex
 * @returns {{dinamax: number[], gigamax: number[]}}
 */
export function maxEnEventos(events = [], dexPorNombre, ahora = new Date()) {
  const salida = { dinamax: new Set(), gigamax: new Set() }
  for (const evento of events) {
    const inicio = evento?.start ? new Date(evento.start) : null
    if (!inicio || Number.isNaN(inicio.getTime()) || inicio > ahora) continue
    const max = parseMaxBattle(evento.name)
    if (!max?.pokemon) continue
    for (const nombre of splitPokemonList(max.pokemon)) {
      const dex = dexPorNombre.get(especie(nombre))
      if (dex) (max.gigantamax ? salida.gigamax : salida.dinamax).add(dex)
    }
  }
  return { dinamax: [...salida.dinamax], gigamax: [...salida.gigamax] }
}

/** Nombre normalizado de cada especie → su número de Pokédex. */
export function dexPorNombre(roster) {
  const mapa = new Map()
  for (const p of roster) {
    if (!esFormaBase(p) || p.regional) continue
    if (!mapa.has(especie(p.name))) mapa.set(especie(p.name), p.dex)
  }
  return mapa
}

/**
 * Lo visto en una pasada de los combates Max, sumado a lo que ya había.
 * La primera fecha en que se vio cada uno no se pisa.
 */
export function sumarVistos(anteriores = {}, pokemon = [], fecha = new Date().toISOString()) {
  const salida = { dinamax: { ...(anteriores.dinamax ?? {}) }, gigamax: { ...(anteriores.gigamax ?? {}) } }
  for (const uno of pokemon) {
    if (!Number.isInteger(uno?.dex)) continue
    const donde = uno.gigantamax ? salida.gigamax : salida.dinamax
    donde[uno.dex] ??= fecha
  }
  return salida
}
