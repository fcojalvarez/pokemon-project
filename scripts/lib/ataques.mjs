/**
 * Los ataques de cada Pokémon, tal como los tiene el juego.
 *
 * El roster sale de pvpoke, pero los ataques se identifican por el nombre del
 * GAME_MASTER (moves.json se arma con él), y hay unos pocos que pvpoke escribe
 * distinto. Hasta ahora esos se perdían sin avisar al cruzar las dos listas:
 * Cinderace se quedaba sin Pirobola, Alakazam y 50 más sin Premonición, los de
 * Poder Oculto sin él y Genesect Hidro sin su Tecno Shock.
 *
 * Y al revés: el GAME_MASTER da a algunos Pokémon ataques que pvpoke no ha
 * recogido (Contraataque en Mewtwo Oscuro, Espada Santa en Keldeo Brioso,
 * Dragoaliento en Miraidon…). Esos se añaden, pero solo si Pokebattler, que
 * simula las incursiones con los datos del juego, también los da: el
 * GAME_MASTER lleva algún ataque de relleno (Salpicadura, Forcejeo) en los
 * Pokémon que aún no han salido, y la segunda fuente los descarta.
 */

/**
 * Nombre de pvpoke → nombre del GAME_MASTER, para los que no coinciden. Los
 * Poder Oculto de cada tipo son el mismo ataque en el juego: su tipo depende
 * de cada ejemplar, y el GAME_MASTER solo tiene uno (HIDDEN_POWER, normal),
 * que es el que la app sabe tratar (en los combates Max da Maxiataque).
 */
const DE_PVPOKE = {
  FUTURE_SIGHT: 'FUTURESIGHT',
  PYRO_BALL: 'PYROBALL',
  TECHNO_BLAST_DOUSE: 'TECHNO_BLAST_WATER',
  HIDDEN_POWER_NORMAL: 'HIDDEN_POWER',
}

/** El nombre del juego para un ataque de pvpoke. */
export function idDelJuego(id) {
  const texto = String(id ?? '')
  return DE_PVPOKE[texto] ?? (texto.startsWith('HIDDEN_POWER_') ? 'HIDDEN_POWER' : texto)
}

/**
 * El nombre del juego para leer los datos PvP de pvpoke. Aquí no entran los
 * Poder Oculto de cada tipo: sus datos son los de «Hidden Power (Bug)»…, y el
 * del juego se queda con los del normal.
 */
export const idDelJuegoParaPvp = (id) => DE_PVPOKE[id] ?? id

/** Una lista de pvpoke con los nombres del juego, sin repetidos. */
export const listaDelJuego = (lista = []) => [...new Set(lista.map(idDelJuego))]

/** Los ataques de relleno que la app nunca rankea: tampoco se añaden. */
const DE_RELLENO = new Set(['RETURN', 'FRUSTRATION', 'STRUGGLE', 'SPLASH'])

/**
 * Los ataques de cada forma en el GAME_MASTER, con los élite aparte.
 *
 * Las formas nuevas traen a veces el ataque como número de enum sin resolver
 * (592 en vez de SNIPE_SHOT): se traduce con las plantillas V0592_MOVE_….
 *
 * @returns {Map<string, {fast: string[], charged: string[], elite: Set<string>}>}
 *          por nombre de forma del GAME_MASTER (ZACIAN_CROWNED_SWORD)
 */
export function ataquesDelJuego(gm) {
  const porNumero = new Map()
  for (const t of gm) {
    const m = /^V(\d+)_MOVE_(.+)$/.exec(t.templateId ?? '')
    if (m) porNumero.set(Number(m[1]), m[2])
  }
  const nombre = (id) => {
    const texto = typeof id === 'number' ? porNumero.get(id) ?? '' : String(id ?? '')
    return texto.replace(/_FAST$/, '')
  }
  const lista = (ids) => (ids ?? []).map(nombre).filter(Boolean)

  const salida = new Map()
  for (const t of gm) {
    const ps = t.data?.pokemonSettings
    const m = /^V\d+_POKEMON_(.+)$/.exec(t.templateId ?? '')
    if (!ps || !m) continue
    salida.set(m[1], {
      fast: [...lista(ps.quickMoves), ...lista(ps.eliteQuickMove)],
      charged: [...lista(ps.cinematicMoves), ...lista(ps.eliteCinematicMove)],
      elite: new Set([...lista(ps.eliteQuickMove), ...lista(ps.eliteCinematicMove)]),
    })
  }
  return salida
}

/**
 * Añade a cada Pokémon del roster los ataques que el GAME_MASTER le da y que
 * pvpoke no trae, si la otra fuente los confirma. Solo añade: lo que ya
 * tenía se queda.
 *
 * Las megas, las primigenias y los oscuros usan la plantilla de su forma
 * base (el GAME_MASTER no tiene otra), pero se confirman con lo que
 * Pokebattler da a esa forma en concreto.
 *
 * @param {object[]} roster                     se modifica
 * @param {Map} delJuego                        de ataquesDelJuego
 * @param {(id: string) => string[]} nombresGm  nombres de forma del GAME_MASTER de un id del roster
 * @param {Map<string, Set<string>>} confirmados id del roster → ataques que da la otra fuente
 * @param {object} moves                        moves.json: solo se añade lo que existe
 * @returns {{id: string, move: string, kind: string, elite: boolean}[]} lo añadido
 */
export function completarAtaques(roster, delJuego, nombresGm, confirmados, moves) {
  const anadidos = []
  for (const p of roster) {
    const base = p.id.replace(/_shadow$/, '').replace(/_(mega|mega_[xyz]|primal)$/, '')
    const delGm = nombresGm(base).map((n) => delJuego.get(n)).find(Boolean)
    const confirma = confirmados.get(p.id)
    if (!delGm || !confirma) continue
    for (const [kind, lista] of [['fast', delGm.fast], ['charged', delGm.charged]]) {
      for (const move of lista) {
        if (DE_RELLENO.has(move) || !confirma.has(move)) continue
        if (p.fast.includes(move) || p.charged.includes(move) || p.megaMoves?.includes(move)) continue
        // Solo del tipo que toca: un rápido en la lista de cargados rompería
        // el cálculo de energía.
        if (moves[move]?.kind !== kind) continue
        p[kind].push(move)
        const elite = delGm.elite.has(move)
        if (elite && !p.eliteMoves.includes(move)) p.eliteMoves.push(move)
        anadidos.push({ id: p.id, move, kind, elite })
      }
    }
  }
  return anadidos
}
