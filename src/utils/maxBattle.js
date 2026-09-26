/**
 * A quién llevar a un combate Max.
 *
 * Un equipo Max son tres Pokémon y no se juega como una incursión: uno aguanta
 * y usa Maxibarrera mientras los otros dos pegan con su Ataque Max. Por eso
 * aquí salen dos listas y no una sola de "mejores counters".
 *
 * Cómo se puntúa, y por qué no es un DPS:
 *
 *   Los ataques Max NO publican potencia —en los combates Max el daño lo
 *   calcula el cliente del juego a partir del nivel del movimiento—, así que
 *   no hay forma honesta de calcular daño por segundo. Lo que sí se sabe es
 *   que el Ataque Max de un Pokémon es SIEMPRE del tipo de su tipo principal,
 *   y que todos los de un mismo tipo comparten ataque. Con eso, dentro de una
 *   comparación la potencia del movimiento es una constante que se cancela y
 *   quedan dos cosas: el ataque base y la efectividad contra el jefe.
 *
 *   - Atacante: ataque × efectividad de su Ataque Max contra los tipos del jefe.
 *   - Tanque:   (defensa × PS) × lo que resiste los tipos del jefe.
 *
 *   Del jefe se asume que pega de sus propios tipos, que es lo normal y lo
 *   único que se puede saber sin tener su conjunto de ataques.
 *
 * Es una ordenación relativa, no una predicción de daño: sirve para elegir a
 * quién llevar, no para decir cuánto va a durar el combate.
 */

/** Efectividad de un tipo contra una combinación de tipos. */
function efectividad(chart, tipoAtaque, tiposDefensor) {
  const fila = chart?.[tipoAtaque]
  if (!fila) return 1
  return tiposDefensor.reduce((acc, t) => acc * (fila[t] ?? 1), 1)
}

/**
 * @param {{types: string[]}} jefe          tipos del Pokémon Dinamax al que se combate
 * @param {object[]} roster                 roster completo
 * @param {object} chart                    tabla de tipos
 * @param {{limit?: number, available?: Set<number>}} [options]
 *        `available` = números de Pokédex que están ahora mismo en los nodos.
 *        No cambia el orden, solo marca cuáles se pueden conseguir hoy: un
 *        Pokémon solo se obtiene en forma Dinamax ganando un combate Max, así
 *        que el mejor counter no sirve de nada si no hay dónde pillarlo.
 *        También se marca lo que se alcanza evolucionando algo disponible:
 *        si hoy sale Chansey, Blissey está a un caramelo de distancia.
 * @returns {{attackers: object[], tanks: object[]}}
 */
export function maxCounters(jefe, roster, chart, options = {}) {
  const limit = options.limit ?? 6
  const disponibles = options.available ?? null
  const tiposJefe = jefe?.types ?? []
  if (!tiposJefe.length || !Array.isArray(roster)) return { attackers: [], tanks: [] }

  // Lo que se alcanza evolucionando algo que sí está en los nodos. Al
  // evolucionar, la forma Dinamax se conserva, así que un Chansey de un nodo
  // se convierte en un Blissey Dinamax.
  const porId = new Map(roster.map((e) => [e.id, e]))
  const desdeEvolucion = new Map()
  if (disponibles) {
    const cola = roster
      .filter((e) => disponibles.has(e.dex))
      .map((e) => ({ actual: e, origen: e }))

    while (cola.length) {
      const { actual, origen } = cola.shift()
      for (const siguiente of actual.evolutions ?? []) {
        const entry = porId.get(siguiente)
        // Lo ya disponible directamente no necesita ruta, y sin `has` una
        // familia con evoluciones cruzadas daría vueltas para siempre.
        if (!entry || desdeEvolucion.has(siguiente) || disponibles.has(entry.dex)) continue
        desdeEvolucion.set(siguiente, { id: origen.id, nameEs: origen.nameEs })
        cola.push({ actual: entry, origen })
      }
    }
  }

  const candidatos = []
  for (const entry of roster) {
    // Solo quien puede dinamaxizar: en un combate Max no entra nadie más.
    // Megas y oscuros quedan fuera desde el pipeline, que ya sabe que en el
    // juego son formas incompatibles con dinamaxizar.
    if (!entry.dynamax && !entry.gigantamax) continue
    if (!entry.stats || !entry.types?.length) continue

    // El Ataque Max es del tipo principal, siempre.
    const tipoMax = entry.types[0]
    const ataque = efectividad(chart, tipoMax, tiposJefe)

    // Lo que le hace el jefe: se asume que pega de sus tipos, y se toma el
    // peor caso, que es el que decide si el tanque aguanta o no.
    const recibe = Math.max(...tiposJefe.map((t) => efectividad(chart, t, entry.types)))

    candidatos.push({
      id: entry.id,
      dex: entry.dex,
      nameEs: entry.nameEs,
      spriteId: entry.spriteId ?? entry.dex,
      types: entry.types,
      gigantamax: !!entry.gigantamax,
      maxType: tipoMax,
      effectiveness: ataque,
      incoming: recibe,
      availableNow: disponibles ? disponibles.has(entry.dex) : null,
      // De quién habría que evolucionar, si no sale él directamente.
      availableFrom: desdeEvolucion.get(entry.id) ?? null,
      attackScore: entry.stats.atk * ataque,
      // La resistencia entra como divisor: recibir el doble vale lo mismo que
      // tener la mitad de aguante.
      tankScore: (entry.stats.def * entry.stats.hp) / recibe,
    })
  }

  const mejores = (clave) =>
    [...candidatos].sort((a, b) => b[clave] - a[clave]).slice(0, limit)

  return {
    // Solo atacantes que no salgan perdiendo por tipo: con el Ataque Max
    // atado al tipo principal, uno que no sea efectivo no tiene arreglo.
    attackers: mejores('attackScore').filter((uno) => uno.effectiveness >= 1),
    tanks: mejores('tankScore'),
  }
}
