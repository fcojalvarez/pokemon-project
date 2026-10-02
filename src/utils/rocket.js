/**
 * Las alineaciones del Team GO Rocket, del rocketLineups.json de ScrapedDuck
 * (que lo saca de la página de LeekDuck). Cada una trae quién es, su tipo si
 * lo tiene y los Pokémon que puede sacar en cada uno de los tres puestos;
 * `isEncounter` marca los que se pueden atrapar al ganarle.
 */

/** El orden de los grupos: Giovanni, los líderes y los reclutas. */
export const GRUPOS_ROCKET = ['boss', 'leader', 'grunt']

/** De «Team GO Rocket Boss / Leader / Grunt» al grupo. */
export function grupoRocket(lineup) {
  const titulo = String(lineup?.title ?? '').toLowerCase()
  if (titulo.includes('boss')) return 'boss'
  if (titulo.includes('leader')) return 'leader'
  return 'grunt'
}

/**
 * Cómo se llama un recluta, partido en piezas para traducirlo: LeekDuck da
 * «Fire-type Female Grunt», «Male Grunt» o «Decoy Female Grunt» (el señuelo
 * que lleva a Giovanni). Los líderes y Giovanni llevan su nombre tal cual.
 */
export function piezasRecluta(nombre) {
  const m = /^(decoy\s+)?(?:(\w+)-type\s+)?(male|female)\s+grunt$/i.exec(
    String(nombre ?? '').trim()
  )
  if (!m) return null
  return {
    senuelo: Boolean(m[1]),
    tipo: m[2]?.toLowerCase() ?? null,
    sexo: m[3].toLowerCase()
  }
}

/** Los tres puestos de una alineación; uno sin datos, como lista vacía. */
export function puestosRocket(lineup) {
  return [lineup.firstPokemon, lineup.secondPokemon, lineup.thirdPokemon].map(
    (lista) => lista ?? []
  )
}

/**
 * Las alineaciones por grupo, en el orden de GRUPOS_ROCKET. Dentro de los
 * reclutas, primero los de un tipo (por cómo se llama el tipo en el idioma de
 * la app) y detrás los que no tienen.
 */
export function rocketPorGrupo(lineups, nombreTipo = (tipo) => tipo) {
  const grupos = new Map(GRUPOS_ROCKET.map((g) => [g, []]))
  for (const lineup of lineups ?? []) grupos.get(grupoRocket(lineup)).push(lineup)
  const reclutas = grupos.get('grunt')
  reclutas.sort((a, b) => {
    if (Boolean(a.type) !== Boolean(b.type)) return a.type ? -1 : 1
    return String(nombreTipo(a.type)).localeCompare(String(nombreTipo(b.type)))
  })
  return GRUPOS_ROCKET.map((grupo) => ({ grupo, list: grupos.get(grupo) })).filter(
    (g) => g.list.length
  )
}
