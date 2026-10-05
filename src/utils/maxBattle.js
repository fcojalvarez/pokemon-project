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
 *   no hay forma honesta de calcular daño por segundo. Lo que sí se sabe es de
 *   qué tipo es: el Ataque Max de un Dinamax es del tipo de su ataque RÁPIDO
 *   (Excadrill con Disparo Lodo usa Maxitemblor; con Garra Metal, Maximetal),
 *   y el de un Gigamax es su ataque Gigamax, fijo. Todos los Ataques Max de un
 *   tipo son el mismo, así que su potencia se cancela y quedan el ataque base,
 *   el STAB (×1,2 si el Pokémon es del tipo del ataque) y la efectividad. Y la
 *   potencia sí cuenta entre un Dinamax y un Gigamax: el ataque Gigamax pega
 *   450 y el Ataque Max, 350.
 *
 *   - Atacante: potencia × ataque × STAB × efectividad, con el rápido que
 *     mejor le pegue (o su ataque Gigamax, si le sale mejor).
 *   - Tanque:   (defensa × PS) × lo que resiste los tipos del jefe.
 *
 *   Del jefe se asume que pega de sus propios tipos, que es lo normal y lo
 *   único que se puede saber sin tener su conjunto de ataques.
 *
 * Es una ordenación relativa, no una predicción de daño: sirve para elegir a
 * quién llevar, no para decir cuánto va a durar el combate.
 */

/** El STAB: un 20 % más si el Pokémon es del tipo del ataque. */
export const STAB = 1.2

/**
 * Potencia de los ataques en los combates Max. Viene en los datos
 * (maxbattles.json, `power` por nivel, de Pokebattler: el GAME_MASTER no la
 * trae): 250/300/350 los Ataques Max y 350/400/450 los Gigamax y los
 * exclusivos, más un cuarto nivel con el Cañón Dinamax de Eternatus. Se
 * compara con el ataque al máximo normal, el nivel 3. Estas constantes solo
 * son el respaldo si un movimiento llega sin potencia.
 */
const NIVEL_MAX = 3
export const POTENCIA_MAX = 350
const POTENCIA_GIGAMAX = 450

/** La potencia de un Ataque Max al nivel 3, la de los datos si la trae. */
export function potenciaMax(max, { gigamax = false } = {}) {
  return max?.power?.[NIVEL_MAX - 1] ?? (gigamax ? POTENCIA_GIGAMAX : POTENCIA_MAX)
}

/**
 * Lo que pesa un Pokémon al pegar con un Ataque Max, con la fórmula de daño
 * del juego sin la parte del rival (que es la misma para todos):
 * potencia × ataque × STAB. El ataque es el base más los 15 de IV, como en el
 * juego; el nivel no entra porque a igualdad de nivel se cancela.
 */
export function pesoAtaqueMax(entry, { max = null, gigamax = false, stab = false } = {}) {
  const ataque = (entry?.stats?.atk ?? 0) + 15
  return potenciaMax(max, { gigamax }) * ataque * (stab ? STAB : 1)
}

/** Poder Oculto no da el Ataque Max de su tipo: siempre Maxiataque (normal). */
const PODER_OCULTO = 'HIDDEN_POWER'

/** El ataque Gigamax de un Pokémon del roster, indexado por especie. */
export function gigamaxDe(entry, gmaxPorEspecie) {
  if (!entry?.gigantamax) return null
  const especie = String(entry.id ?? '')
    .split('_')[0]
    .toUpperCase()
  return gmaxPorEspecie?.[especie] ?? null
}

/**
 * Los Ataques Max que puede usar un Pokémon, agrupados: uno por cada Ataque
 * Max distinto, con los rápidos que llevan a él, y el Gigamax aparte.
 *
 *   [{ max, rapidos: [movimiento], gigamax: false, stab: true }, …]
 *
 * Los rápidos solo cuentan si puede dinamaxizar: Snorlax o Lapras solo salen
 * en Gigamax, y ahí el ataque es siempre el suyo.
 *
 * Zacian y Zamazenta coronados y Eternatus tienen un Ataque Max exclusivo
 * (Tajo Supremo, Embate Supremo, Cañón Dinamax): el GAME_MASTER los pone en la
 * misma tabla que los Gigamax, así que como ellos es fijo y sustituye a los de
 * sus rápidos. Van con `exclusivo: true`.
 */
export function opcionesMax(entry, { moves, maxPorTipo, gmaxPorEspecie, exclusivoPorForma } = {}) {
  if (!entry) return []
  const porMax = new Map()
  const exclusivo = entry.dynamax ? exclusivoPorForma?.[entry.id]?.attack ?? null : null
  if (exclusivo) {
    porMax.set(exclusivo.id, { max: exclusivo, rapidos: [], gigamax: false, exclusivo: true })
  } else if (entry.dynamax) {
    for (const id of entry.fast ?? []) {
      const rapido = moves?.[id]
      if (!rapido) continue
      const max = maxPorTipo?.[id === PODER_OCULTO ? 'normal' : rapido.type]
      if (!max) continue
      if (!porMax.has(max.id))
        porMax.set(max.id, { max, rapidos: [], gigamax: false, exclusivo: false })
      porMax.get(max.id).rapidos.push(rapido)
    }
  }
  const opciones = [...porMax.values()]
  const gmax = gigamaxDe(entry, gmaxPorEspecie)
  if (gmax) opciones.push({ max: gmax, rapidos: [], gigamax: true, exclusivo: false })
  return opciones.map((opcion) => ({
    ...opcion,
    stab: entry.types?.includes(opcion.max.type) ?? false
  }))
}

/**
 * El mejor ataque rápido para llenar el medidor Max: el que más daño hace por
 * segundo (potencia × STAB / duración). En un Gigamax el rápido no cambia su
 * ataque, que es fijo, pero sí lo pronto que llega a gigamaxizar.
 *
 * En un empate gana el de su tipo: Blastoise saca lo mismo con Mordisco que
 * con Pistola Agua, y lo esperable es verlo con el de agua.
 */
export function mejorRapido(entry, moves) {
  let mejor = null
  let mejorValor = -1
  let mejorEsSuyo = false
  for (const id of entry?.fast ?? []) {
    const rapido = moves?.[id]
    const duracion = rapido?.pve?.duration
    if (!rapido || !duracion) continue
    const suyo = entry.types?.includes(rapido.type) ?? false
    const valor = ((rapido.pve.power ?? 0) * (suyo ? STAB : 1)) / duracion
    // Con margen: 5 × 1,2 / 0,5 y 6 / 0,5 no dan exactamente lo mismo en coma flotante.
    const empate = Math.abs(valor - mejorValor) < 1e-9
    if (valor > mejorValor + 1e-9 || (empate && suyo && !mejorEsSuyo)) {
      mejor = rapido
      mejorValor = valor
      mejorEsSuyo = suyo
    }
  }
  return mejor
}

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
 * @param {{limit?: number, available?: Set<number>, moves?: object, maxPorTipo?: object, gmaxPorEspecie?: object}} [options]
 *        `moves`, `maxPorTipo` y `gmaxPorEspecie` son los datos de movimientos y
 *        de ataques Max (maxbattles.json). Sin ellos se cae al tipo principal,
 *        que es una aproximación.
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
    const cola = roster.filter((e) => disponibles.has(e.dex)).map((e) => ({ actual: e, origen: e }))

    while (cola.length) {
      const { actual, origen } = cola.shift()
      for (const siguiente of actual.evolutions ?? []) {
        const entry = porId.get(siguiente)
        // Lo ya disponible directamente no necesita ruta, y sin `has` una
        // familia con evoluciones cruzadas daría vueltas para siempre.
        if (!entry || desdeEvolucion.has(siguiente) || disponibles.has(entry.dex)) continue
        desdeEvolucion.set(siguiente, { id: origen.id, name: origen.name, nameEs: origen.nameEs })
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

    // El Ataque Max que mejor le pega al jefe, contando el STAB. Sin datos de
    // movimientos, el del tipo principal.
    const opciones = options.maxPorTipo ? opcionesMax(entry, options) : []
    let mejor = {
      tipo: entry.types[0],
      max: null,
      rapido: null,
      stab: true,
      gigamax: false,
      exclusivo: false,
      valor: efectividad(chart, entry.types[0], tiposJefe) * STAB * POTENCIA_MAX
    }
    if (opciones.length) {
      mejor = null
      for (const opcion of opciones) {
        const valor =
          efectividad(chart, opcion.max.type, tiposJefe) *
          (opcion.stab ? STAB : 1) *
          potenciaMax(opcion.max, opcion)
        if (!mejor || valor > mejor.valor) {
          mejor = {
            tipo: opcion.max.type,
            max: opcion.max,
            rapido: opcion.rapidos[0] ?? null,
            gigamax: opcion.gigamax,
            exclusivo: opcion.exclusivo,
            stab: opcion.stab,
            valor
          }
        }
      }
    }
    const tipoMax = mejor.tipo
    const ataque = efectividad(chart, tipoMax, tiposJefe)

    // Lo que le hace el jefe: se asume que pega de sus tipos, y se toma el
    // peor caso, que es el que decide si el tanque aguanta o no.
    const recibe = Math.max(...tiposJefe.map((t) => efectividad(chart, t, entry.types)))

    candidatos.push({
      id: entry.id,
      dex: entry.dex,
      name: entry.name,
      nameEs: entry.nameEs,
      spriteId: entry.spriteId ?? entry.dex,
      types: entry.types,
      gigantamax: !!entry.gigantamax,
      maxType: tipoMax,
      // Con qué ataque llevarlo: el rápido (si es Dinamax) y el Ataque Max.
      maxMove: mejor.max,
      // Con un ataque fijo (Gigamax o exclusivo), el mejor rápido para cargar.
      fastMove: mejor.gigamax || mejor.exclusivo ? mejorRapido(entry, options.moves) : mejor.rapido,
      stab: mejor.stab,
      // Gigamax o exclusivo: el ataque no depende del rápido.
      maxFijo: Boolean(mejor.gigamax || mejor.exclusivo),
      effectiveness: ataque,
      incoming: recibe,
      availableNow: disponibles ? disponibles.has(entry.dex) : null,
      // De quién habría que evolucionar, si no sale él directamente.
      availableFrom: desdeEvolucion.get(entry.id) ?? null,
      attackScore: pesoAtaqueMax(entry, mejor) * ataque,
      // La resistencia entra como divisor: recibir el doble vale lo mismo que
      // tener la mitad de aguante.
      tankScore: (entry.stats.def * entry.stats.hp) / recibe
    })
  }

  const mejores = (clave) => [...candidatos].sort((a, b) => b[clave] - a[clave]).slice(0, limit)

  return {
    // Solo atacantes que no salgan perdiendo por tipo: ya se ha elegido su
    // mejor rápido, así que si ni con ese es efectivo, no tiene arreglo.
    attackers: mejores('attackScore').filter((uno) => uno.effectiveness >= 1),
    tanks: mejores('tankScore')
  }
}

/**
 * Los papeles de cada Pokémon que puede dinamaxizar, para las letras del Top
 * Max: su puesto como tanque y como sanador entre todos ellos, sin un jefe
 * concreto (el de atacante es su puesto en la propia lista del Top).
 *
 *   - Tanque: defensa × PS, lo mismo que «Para aguantar» sin la resistencia
 *     al jefe. Es quien aguanta usando Maxibarrera.
 *   - Sanador: los PS (y, a igualdad, el aguante). Maxivigor cura según los
 *     PS de cada uno, así que lo que cuenta es tener muchos y seguir en pie.
 *
 * El juego no publica cuánto protege Maxibarrera ni cuánto cura Maxivigor:
 * es una ordenación, como el resto del top Max. Las formas con las mismas
 * estadísticas (los Pikachu con gorro) cuentan una vez y comparten puesto.
 *
 * @returns {Map<string, {tanque: number, sanador: number}>} por id del roster
 */
export function papelesMax(roster) {
  const grupos = new Map()
  for (const entry of roster ?? []) {
    if (!entry.dynamax && !entry.gigantamax) continue
    if (!entry.stats?.def || !entry.stats?.hp) continue
    const clave = `${entry.dex}-${entry.stats.atk}-${entry.stats.def}-${entry.stats.hp}`
    if (!grupos.has(clave)) grupos.set(clave, { stats: entry.stats, ids: [] })
    grupos.get(clave).ids.push(entry.id)
  }
  const lista = [...grupos.values()].map((g) => ({
    ...g,
    aguante: g.stats.def * g.stats.hp,
    ps: g.stats.hp
  }))
  const puestos = (orden) => {
    const mapa = new Map()
    ;[...lista].sort(orden).forEach((g, i) => mapa.set(g, i + 1))
    return mapa
  }
  const tanque = puestos((a, b) => b.aguante - a.aguante)
  const sanador = puestos((a, b) => b.ps - a.ps || b.aguante - a.aguante)
  const out = new Map()
  for (const g of lista)
    for (const id of g.ids) out.set(id, { tanque: tanque.get(g), sanador: sanador.get(g) })
  return out
}
