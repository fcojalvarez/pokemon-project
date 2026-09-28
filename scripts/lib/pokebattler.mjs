/**
 * Pokebattler como segunda fuente del juego.
 *
 * Pokebattler simula las incursiones y los combates Max con los datos del
 * juego, y publica sin autenticación lo que usa: los Pokémon con sus ataques
 * (/pokemon), los ataques (/moves, con la potencia de los Ataques Max en cada
 * nivel, que el GAME_MASTER no trae) y los jefes (/raids, con la lista de
 * Dinamax y Gigamax que ya se pueden usar, `dynamaxPokemon`).
 *
 * Aquí solo se traducen sus nombres a los del roster y se extrae lo que el
 * pipeline usa; las decisiones las toma build-data.mjs.
 */

export const POKEBATTLER = {
  pokemon: 'https://fight.pokebattler.com/pokemon',
  moves: 'https://fight.pokebattler.com/moves',
  raids: 'https://fight.pokebattler.com/raids',
}

/** Especies que pvpoke escribe con guion bajo y Pokebattler todo junto. */
const JUNTOS = {
  wochien: 'wo_chien',
  chienpao: 'chien_pao',
  tinglu: 'ting_lu',
  chiyu: 'chi_yu',
  walkingwake: 'walking_wake',
  ironleaves: 'iron_leaves',
  gougingfire: 'gouging_fire',
  ragingbolt: 'raging_bolt',
  ironboulder: 'iron_boulder',
  ironcrown: 'iron_crown',
}

/**
 * Formas que en pvpoke llevan nombre aunque sean la de siempre: Darmanitan es
 * darmanitan_standard; Giratina, giratina_altered.
 */
const FORMA_POR_DEFECTO = ['_normal', '_standard', '_incarnate', '_altered', '_ordinary', '_aria', '_land']

/**
 * El id del roster de un Pokémon de Pokebattler, o null si no hay.
 *
 *   KYOGRE_PRIMAL → kyogre_primal
 *   ZACIAN_CROWNED_SWORD_FORM → zacian_crowned_sword
 *   RAICHU_ALOLA_SHADOW_FORM → raichu_alolan_shadow
 *   TAUROS_PALDEA_BLAZE_FORM → tauros_blaze
 *   DARMANITAN → darmanitan_standard
 *
 * @param {string} pbId
 * @param {Set<string>|Map<string, unknown>} existe  ids del roster
 */
export function idDelRoster(pbId, existe) {
  let id = String(pbId ?? '').toLowerCase().replace(/_form$/, '')
  id = id
    .replace(/_alola(?=_|$)/, '_alolan')
    .replace(/^tauros_paldea_(combat|blaze|aqua)/, 'tauros_$1')
    .replace(/_paldea(?=_|$)/, '_paldean')
  const oscuro = id.endsWith('_shadow')
  let base = oscuro ? id.slice(0, -'_shadow'.length) : id
  base = JUNTOS[base] ?? base
  const fin = oscuro ? '_shadow' : ''
  for (const candidato of [base, ...FORMA_POR_DEFECTO.map((s) => base + s)]) {
    if (existe.has(candidato + fin)) return candidato + fin
  }
  return null
}

/** Ataque de Pokebattler → nombre del juego: sin _FAST, y un solo Poder Oculto. */
export const ataqueDelJuego = (id) =>
  String(id ?? '').replace(/_FAST$/, '').replace(/^HIDDEN_POWER_[A-Z]+$/, 'HIDDEN_POWER')

/**
 * Los ataques que Pokebattler da a cada Pokémon del roster, élite incluidos.
 *
 * @returns {Map<string, Set<string>>} id del roster → ataques
 */
export function ataquesPorPokemon(pbPokemon = [], existe) {
  const salida = new Map()
  for (const p of pbPokemon) {
    const id = idDelRoster(p.pokemonId, existe)
    if (!id) continue
    const todos = [
      ...(p.quickMoves ?? []), ...(p.cinematicMoves ?? []),
      ...(p.eliteQuickMove ?? []), ...(p.eliteCinematicMove ?? []),
    ].map(ataqueDelJuego)
    // Algunas formas vienen repetidas (ZACIAN_GIGANTAMAX, que no existe en el
    // juego, copia a ZACIAN): se juntan.
    if (!salida.has(id)) salida.set(id, new Set())
    for (const m of todos) salida.get(id).add(m)
  }
  return salida
}

/**
 * Los Dinamax y Gigamax que Pokebattler da por disponibles (`dynamaxPokemon`
 * de /raids), con los ids del roster. «CINDERACE_GIGANTAMAX» es el Gigamax de
 * Cinderace; lo demás, Dinamax. Lista sobre todo formas finales: es la de
 * atacantes, no la de todo lo que sale en los combates.
 *
 * @returns {{dinamax: Set<string>, gigamax: Set<string>, sinCasar: string[]}}
 */
export function maxDePokebattler(dynamaxPokemon = [], existe) {
  const salida = { dinamax: new Set(), gigamax: new Set(), sinCasar: [] }
  for (const pbId of dynamaxPokemon) {
    const gigamax = /_GIGANTAMAX$/.test(pbId)
    const id = idDelRoster(String(pbId).replace(/_GIGANTAMAX$/, ''), existe)
    if (!id) salida.sinCasar.push(pbId)
    else (gigamax ? salida.gigamax : salida.dinamax).add(id)
  }
  return salida
}

/**
 * La potencia de los Ataques Max en cada nivel, por su `vfxName`, que es el
 * mismo en el GAME_MASTER (VN_BM_001 → max_flare) y en Pokebattler
 * (MAX_FLARE, MAX_FLARE2, MAX_FLARE3, MAX_FLARE4). Maxibarrera y Maxivigor no
 * pegan: dan escudo (PS) y curación (fracción de los PS) por nivel.
 *
 * El nivel 4 no se alcanza mejorando el ataque: es el +1 a todos los Ataques
 * Max que da el Cañón Dinamax de Eternatus fuera de combate
 * (NON_COMBAT_V0482_MOVE_DYNAMAX_CANNON: maxMoveBonus.numAllMaxMoveLevelIncrease).
 *
 * @returns {Map<string, {power?: number[], shield?: number[], heal?: number[]}>}
 */
export function nivelesMax(pbMoves = []) {
  const salida = new Map()
  const poner = (clave, campo, nivel, valor) => {
    if (!salida.has(clave)) salida.set(clave, {})
    const fila = salida.get(clave)
    fila[campo] ??= []
    fila[campo][nivel - 1] = valor
  }
  for (const m of pbMoves) {
    const id = String(m?.moveId ?? '')
    if (id.startsWith('VN_BM_')) continue
    const nivel = Number(/(\d)$/.exec(id)?.[1] ?? 1)
    if (/^MAX_SHIELD\d?$/.test(id)) poner('max_shield', 'shield', nivel, m.power)
    else if (/^MAX_HEAL\d?$/.test(id)) poner('max_heal', 'heal', nivel, m.power)
    else if (/^g?max_/.test(m?.vfxName ?? '') && m.power > 0) poner(m.vfxName, 'power', nivel, m.power)
  }
  // Sin huecos: un nivel que faltara dejaría la lista corrida.
  for (const [clave, fila] of salida) {
    for (const campo of Object.keys(fila)) {
      // Con el spread, los huecos salen como undefined (`some` se los salta).
      if ([...fila[campo]].some((v) => v == null)) delete fila[campo]
    }
    if (!Object.keys(fila).length) salida.delete(clave)
  }
  return salida
}
