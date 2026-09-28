/**
 * La cadena evolutiva como árbol.
 *
 * En la base de datos cada rama viene entera y por separado: Eevee trae ocho
 * listas [Eevee, Vaporeon], [Eevee, Jolteon]… y Poliwag dos que comparten
 * Poliwag y Poliwhirl. Pintadas tal cual, Eevee salía ocho veces. Aquí se
 * juntan por el tramo que comparten, así que cada Pokémon sale una sola vez y
 * donde se separan las ramas queda un nodo con varias salidas.
 *
 * Lo que cuesta evolucionar (caramelos, objeto, cebo…) viene en el paso que
 * evoluciona, no en el que sale. Y puede ser distinto en cada rama: el Poliwhirl
 * de la rama de Politoed pide Roca del Rey y el otro no. Por eso los requisitos
 * viajan en la rama (la flecha), no en el nodo.
 */

export const CAMPOS_REQUISITO = [
  'candy_required',
  'mega_energy_required',
  'item_required',
  'item_cost',
  'lure_required',
  'buddy_distance_required',
  'only_evolves_in_daytime',
  'only_evolves_in_nighttime',
  'only_evolves_in_full_moon',
  'gender_required',
  'no_candy_cost_if_traded',
  'quest_required'
]

// Las ramas vienen con claves primary, secondary… y el objeto no garantiza el
// orden. Se ordenan así para que salgan siempre igual (Vaporeon, Jolteon…).
const ORDEN = ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary', 'senary', 'septenary', 'octonary', 'nonary', 'denary']
const posicion = (clave) => {
  const i = ORDEN.indexOf(clave)
  return i === -1 ? ORDEN.length : i
}

/** Solo los requisitos que tiene el paso, sin los campos vacíos. */
export function requisitosDe(paso) {
  const req = {}
  for (const campo of CAMPOS_REQUISITO) if (paso?.[campo]) req[campo] = paso[campo]
  return req
}

/**
 * @param {object} evolutionInfo  `pokemons.evolution_info`: { primary: [pasos], … }
 * @param {object|null} base      El Pokémon, para cuando no tiene cadena (Rayquaza).
 * @returns {{ mon: object, ramas: Array<{ req: object, destino: object }> } | null}
 */
export function construirArbol(evolutionInfo, base = null) {
  const familias = Object.entries(evolutionInfo ?? {})
    .filter(([, pasos]) => Array.isArray(pasos) && pasos.length)
    .sort(([a], [b]) => posicion(a) - posicion(b))
    .map(([, pasos]) => pasos)

  if (!familias.length) return base ? { mon: base, ramas: [] } : null

  const nodo = (grupo, i) => {
    const siguientes = new Map()
    for (const familia of grupo) {
      const siguiente = familia[i + 1]
      if (!siguiente) continue
      if (!siguientes.has(siguiente.pokemon_id)) siguientes.set(siguiente.pokemon_id, [])
      siguientes.get(siguiente.pokemon_id).push(familia)
    }
    return {
      mon: grupo[0][i],
      // Por número de Pokédex: cada ficha trae las ramas en su propio orden
      // (en la de Froslass, primero Froslass), y al pasar de una a otra la
      // cadena se recolocaba.
      ramas: [...siguientes.values()]
        .sort((a, b) => a[0][i + 1].pokemon_id - b[0][i + 1].pokemon_id)
        .map((sub) => ({
          req: requisitosDe(sub[0][i]),
          destino: nodo(sub, i + 1)
        }))
    }
  }

  return nodo(familias, 0)
}

/**
 * Reparte los requisitos de varias ramas que salen del mismo Pokémon: lo que
 * piden todas por igual va una vez en la flecha que entra al grupo; lo demás,
 * en cada una. Eevee: los 25 caramelos, comunes; el cebo musgoso, solo Leafeon.
 */
export function repartirRequisitos(ramas) {
  if (!ramas.length) return { comunes: {}, propios: [] }
  const comunes = {}
  for (const campo of CAMPOS_REQUISITO) {
    const valor = ramas[0].req[campo]
    if (valor !== undefined && ramas.every((rama) => rama.req[campo] === valor)) comunes[campo] = valor
  }
  // La cantidad va con su objeto: las tres manzanas de Applin piden 20, pero
  // cada una es distinta, y «×20» suelto en la flecha no diría de qué.
  if ('item_cost' in comunes && !('item_required' in comunes)) delete comunes.item_cost
  const propios = ramas.map((rama) => {
    const resto = {}
    for (const [campo, valor] of Object.entries(rama.req)) if (!(campo in comunes)) resto[campo] = valor
    return resto
  })
  return { comunes, propios }
}

/** Todos los Pokémon del árbol, para buscarles las megas. */
export function nodosDe(arbol) {
  if (!arbol) return []
  return [arbol, ...arbol.ramas.flatMap((rama) => nodosDe(rama.destino))]
}
