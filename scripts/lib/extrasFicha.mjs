/**
 * Datos de la ficha que salen del GAME_MASTER y de pvpoke y que no son ni
 * estadísticas ni ataques: evoluciones baratas, efectos de aventura y rasgos
 * PvP. Van aparte para probarlos sin bajar nada.
 */

/**
 * Lo que cuesta evolucionarlo, si es barato: 12 o 25 caramelos, o
 * 'intercambio' si es gratis al intercambiarlo (Kadabra, Machoke…). Con
 * `null`, nada de eso. Las megas no cuentan: no son una evolución.
 *
 * Devuelve un mapa por forma del GAME_MASTER (PIDGEY_NORMAL, RAICHU_ALOLA) y
 * por especie (PIDGEY), para buscar con gmFormNames y caer a la especie.
 */
export function evolucionesBaratas(gm) {
  const porClave = new Map()
  for (const t of gm) {
    const ps = t.data?.pokemonSettings
    const ramas = (ps?.evolutionBranch ?? []).filter((b) => b.evolution && !b.temporaryEvolution)
    if (!ramas.length) continue
    const caramelos = Math.min(...ramas.map((b) => b.candyCost ?? Infinity))
    const valor = caramelos <= 25 ? caramelos : ramas.some((b) => b.noCandyCostViaTrade) ? 'intercambio' : null
    for (const clave of [ps.form, ps.pokemonId]) if (clave && !porClave.has(clave)) porClave.set(clave, valor)
  }
  return porClave
}

/**
 * Los efectos de aventura (`nonCombatMoveSettings`): ataques que, gastando
 * polvo y caramelos, dan una ventaja fuera del combate durante unos minutos.
 * Devuelve { ATAQUE: { tipo, minutos, polvo, caramelos, energia } }; qué hace
 * cada `tipo` lo dicen las traducciones (pokemon.aventura.tipos).
 * El de Mega Mewtwo va por la megaevolución, no por un ataque: se guarda con
 * su clave del juego para quien quiera enseñarlo.
 */
export function efectosAventura(gm) {
  const out = {}
  for (const t of gm) {
    const s = t.data?.nonCombatMoveSettings
    if (!s?.uniqueId || !s.bonusType) continue
    const id = typeof s.uniqueId === 'string' ? s.uniqueId : t.templateId.replace(/^NON_COMBAT_V\d+_MOVE_/, '')
    out[id] = {
      tipo: s.bonusType,
      minutos: Math.round(Number(s.durationMs ?? 0) / 60000),
      polvo: s.cost?.stardustCost ?? null,
      caramelos: s.cost?.candyCost ?? null,
      energia: s.cost?.tempEvoResourceCost?.megaEnergyCost ?? null,
    }
  }
  return out
}

/**
 * Los rasgos PvP de una fila de pvpoke, por sus seis puntuaciones de escenario
 * (`scores`: abrir, cerrar, cambiar, cargar, atacar y consistencia). Cada una
 * se compara con las del resto de la liga: en el cuarto de arriba es un rasgo
 * a favor; en el de abajo, en contra. Así salen rasgos también a los que no
 * están arriba del todo, y nadie sale con todo a favor solo por ser bueno.
 *
 * Devuelve como mucho dos de cada lado, los más marcados:
 * { favor: ['cargar', …], contra: ['cambiar', …] }.
 */
export const ESCENARIOS = ['abrir', 'cerrar', 'cambiar', 'cargar', 'atacar', 'consistencia']

export function cortesDeRasgos(filas) {
  return ESCENARIOS.map((_, i) => {
    const v = filas.map((f) => f.scores?.[i]).filter((x) => typeof x === 'number').sort((a, b) => a - b)
    if (!v.length) return null
    return { bajo: v[Math.floor(v.length * 0.25)], alto: v[Math.floor(v.length * 0.75)] }
  })
}

export function rasgosPvp(scores, cortes, maximo = 2) {
  const favor = []
  const contra = []
  ESCENARIOS.forEach((e, i) => {
    const v = scores?.[i]
    const c = cortes[i]
    if (typeof v !== 'number' || !c) return
    // Cuánto se pasa del corte, en proporción al rango de la liga: así se
    // comparan escenarios con escalas distintas.
    const rango = Math.max(1e-9, c.alto - c.bajo)
    if (v >= c.alto) favor.push({ e, cuanto: (v - c.alto) / rango })
    else if (v < c.bajo) contra.push({ e, cuanto: (c.bajo - v) / rango })
  })
  // Los más marcados de cada lado: con cinco a favor no destacaba ninguno.
  const top = (lista) => lista.sort((a, b) => b.cuanto - a.cuanto).slice(0, maximo).map((x) => x.e)
  return { favor: top(favor), contra: top(contra) }
}
