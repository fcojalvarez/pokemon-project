import { computed } from 'vue'
import { useGameDataStore } from '../stores/gameData'
import { filasMaxOrdenadas, mejorRapido } from '../utils/maxBattle'
import { gigamaxSpriteId } from '../utils/gigamax'
import { origenDe, origenesPresentes } from '../utils/moveOrigins'

/** Cuántos atacantes salen en cada top. */
const LIMITE = 50
/** Sobre cuántos se cuenta el puesto de la fila fantasma, como en la ficha. */
const LIMITE_PUESTO = 500

/**
 * Las clases del Top de incursiones («Todos», «Megas»…): responden a «¿qué
 * subo si no tengo legendarios?» sin tocar «Incluir». Cada fila conserva su
 * puesto en la lista completa, para que la letra siga diciendo lo mismo.
 */
export const CLASES_PVE = ['todos', 'megas', 'oscuros', 'sinLegendarios', 'comunes']
const deClase = {
  megas: (row) => row.mega,
  oscuros: (row) => row.shadow,
  sinLegendarios: (row, entry) => !row.legendary && !row.mythical && !entry?.ultraBeast,
  comunes: (row, entry) =>
    !row.mega && !row.shadow && !row.legendary && !row.mythical && !entry?.ultraBeast
}

const chipRapido = (movimiento) => ({
  id: movimiento.id,
  name: movimiento.name,
  nameEs: movimiento.nameEs,
  type: movimiento.type
})

/**
 * Las filas del Top en los tres modos, ya con la forma que esperan
 * AttackerList y AttackerTable.
 *
 * `filtros` son los refs de la vista: mode, type, sortBy, league y los
 * include* de «Incluir».
 */
export function useTopFilas(filtros) {
  const gameData = useGameDataStore()
  const {
    mode,
    type,
    sortBy,
    league,
    includeMega,
    includeShadow,
    includeLegacy,
    includeElite,
    includeLegendary,
    clase,
    fantasma
  } = filtros

  /** Los filtros de «Incluir» y el orden, como los pide gameData.pveRankings. */
  const opcionesPve = (limit) => ({
    includeMega: includeMega.value,
    includeShadow: includeShadow.value,
    includeLegacy: includeLegacy.value,
    includeElite: includeElite.value,
    sortBy: sortBy.value,
    limit
  })

  const pveRows = computed(() => {
    if (!gameData.isReady || mode.value !== 'pve') return []
    const filtro = deClase[clase?.value]
    // Con una clase se filtra sobre la lista larga: los 50 primeros comunes
    // no están entre los 50 primeros de todos.
    const rankings = gameData.pveRankings(opcionesPve(filtro ? LIMITE_PUESTO : LIMITE))
    const todas = type.value === 'all' ? rankings.overall : rankings.byType[type.value] ?? []
    const filas = filtro
      ? todas.filter((row) => filtro(row, gameData.byId.get(row.id))).slice(0, LIMITE)
      : todas
    // Cada fila, también con el clima que potencia su tipo (la cifra en ámbar).
    return filas.map((row) => ({ ...row, conClima: gameData.conClima(row) }))
  })

  /**
   * Dónde quedaría un Pokémon de esta lista con otros ataques
   * ({ id, fast, charged }, ids): la «fila fantasma» del Top.
   *
   * Con las cuentas del Top y de «¿Y con otros ataques?» de la ficha: en la
   * lista de un tipo, contra los jefes débiles a él; en «Todos», su media
   * contra todos los jefes. El puesto es cuántos otros rinden más, sobre los
   * 500 primeros con los mismos filtros; su propia fila no cuenta.
   *
   * Devuelve { fila, puesto, baja, porcentaje, suya, esLaSuya }, o
   * { fuera } (con esos ataques no entra en esta lista) o { sinDatos }.
   */
  const probarConjunto = ({ id, fast, charged }) => {
    if (!gameData.isReady || mode.value !== 'pve') return null
    const entry = gameData.byId.get(id)
    if (!entry) return null
    const enTodos = type.value === 'all'
    const conjunto = gameData.conjuntoEnLista(entry, fast, charged, enTodos ? null : type.value)
    if (!conjunto) {
      // En la lista de un tipo, sin ningún ataque de ese tipo no entra; con
      // alguno, es que le faltan datos de daño (el exclusivo de una supermega).
      const delTipo = [fast, charged].some((uno) => gameData.moves[uno]?.type === type.value)
      return enTodos || delTipo ? { sinDatos: true } : { fuera: true }
    }

    const metrica = sortBy.value
    const valor = conjunto[metrica]
    // En «Todos» se ordena por `general`, la media contra todos los jefes.
    const deFila = (fila) => (enTodos ? fila.general : fila[metrica])
    const ranking = gameData.pveRankings(opcionesPve(LIMITE_PUESTO))
    const lista = enTodos ? ranking.overall : ranking.byType[type.value] ?? []
    const delante = lista.filter((otro) => otro.id !== id && deFila(otro) > valor).length
    const puesto = delante >= LIMITE_PUESTO ? null : delante + 1
    const suya = lista.find((otro) => otro.id === id) ?? null

    const fila = {
      ...conjunto,
      ...(enTodos ? { general: valor } : {}),
      // Más allá del corte, la letra de un puesto que ya no la merece.
      rank: puesto ?? LIMITE_PUESTO + 1,
      fantasma: true
    }
    fila.conClima = gameData.conClima(fila)

    return {
      fila,
      puesto,
      baja: suya && puesto && puesto > suya.rank ? puesto - suya.rank : null,
      porcentaje: suya ? Math.round((valor / deFila(suya)) * 100) : null,
      suya,
      esLaSuya: suya?.fast.id === fast && suya?.charged.id === charged
    }
  }

  /**
   * La fila fantasma que se está probando, justo debajo de la suya y con el
   * puesto que tendría: no en ese puesto, porque si baja mucho había que ir a
   * buscarla por la lista.
   */
  const pveConFantasma = computed(() => {
    const prueba = fantasma?.value && probarConjunto(fantasma.value)
    if (!prueba?.fila || prueba.esLaSuya) return pveRows.value
    const filas = [...pveRows.value]
    const suya = filas.findIndex((fila) => fila.id === prueba.fila.id)
    if (suya === -1) return filas
    filas.splice(suya + 1, 0, { ...prueba.fila, baja: prueba.baja, masAlla: !prueba.puesto })
    return filas
  })

  /**
   * Gimnasio: los mejores defensores. Filtrar por tipo no cambia su puesto
   * (como en PvP): es el de la lista entera.
   */
  const gymRows = computed(() => {
    if (!gameData.isReady || mode.value !== 'gym') return []
    const filas = gameData.defensores({
      includeLegacy: includeLegacy.value,
      includeElite: includeElite.value
    })
    return (
      type.value === 'all' ? filas : filas.filter((row) => row.types.includes(type.value))
    ).slice(0, LIMITE)
  })

  const moveType = (id) => gameData.moves[id]?.type ?? 'normal'

  /**
   * Las filas de PvP llegan de pvpoke con otra forma (movimientos por id y una
   * puntuación en vez de DPS). Se traducen aquí a lo que espera AttackerList,
   * que es quien pinta los dos rankings.
   */
  const pvpRows = computed(() => {
    if (!gameData.isReady || mode.value !== 'pvp') return []
    const rows = gameData.pvp[league.value] ?? []
    return (type.value === 'all' ? rows : rows.filter((row) => row.types.includes(type.value))).map(
      (row) => {
        const entry = gameData.byId.get(row.id)
        const origen = origenDe(entry)
        return {
          id: row.id,
          rank: row.rank,
          dex: entry?.dex ?? null,
          spriteId: entry?.spriteId ?? 0,
          // Para el halo morado del oscuro, como en el PvE.
          shadow: Boolean(entry?.shadow),
          name: row.name,
          nameEs: row.nameEs,
          types: row.types,
          moves: (row.moveset ?? []).map((id) => {
            // El Poder Oculto llega con su tipo (HIDDEN_POWER_ICE): en PvP el
            // tipo cuenta. Se pinta como Poder Oculto, del color de ese tipo.
            const oculto = /^HIDDEN_POWER_([A-Z]+)$/.exec(id)
            const base = oculto ? gameData.moves.HIDDEN_POWER : gameData.moves[id]
            return {
              id,
              // Sin el movimiento en moves.json queda el id, que es mejor que nada.
              name: base?.name ?? id,
              nameEs: base?.nameEs ?? id,
              type: oculto ? oculto[1].toLowerCase() : moveType(id),
              ...origen(oculto ? 'HIDDEN_POWER' : id)
            }
          }),
          value: row.score
        }
      }
    )
  })

  /**
   * Una línea de la fila Max: el Ataque Max y los rápidos que lo dan. Con un
   * ataque fijo (Gigamax o exclusivo), el mejor rápido para llenar el medidor.
   */
  const lineaMax = (opcion, entry) => ({
    max: opcion.max,
    gigamax: opcion.gigamax,
    rapidos:
      opcion.gigamax || opcion.exclusivo
        ? [mejorRapido(entry, gameData.moves)].filter(Boolean).map(chipRapido)
        : opcion.rapidos.map(chipRapido)
  })

  /**
   * Top de Dinamax, ordenado por ataque base.
   *
   * Aquí no se puede calcular un DPS como en el PvE: los ataques Max no publican
   * potencia, el daño lo resuelve el cliente del juego a partir del nivel del
   * movimiento. Lo que sí se sabe es el tipo: el Ataque Max de un Dinamax es del
   * tipo de su ataque RÁPIDO, y todos los de un tipo son el mismo ataque. Así
   * que dentro de un tipo la potencia se cancela y queda el ataque base, con el
   * STAB (×1,2 si el Pokémon es de ese tipo).
   *
   * Con un tipo elegido salen todos los que pueden sacar ese Ataque Max, sean o
   * no de ese tipo, con los rápidos que llevan a él. Con «Todos», por ataque
   * base, con todos sus Ataques Max: sin tipo no se comparan ataques distintos.
   *
   * Dinamax y Gigamax van en filas distintas, cada una con su marca: son
   * Pokémon distintos en el juego (hay especies que solo han salido en una de
   * las dos, y otras en las dos), y el Gigamax pega con su ataque propio, fijo,
   * sea cual sea su rápido. Por eso en su fila va el mejor rápido (el que antes
   * llena el medidor).
   *
   * Cada fila lleva, bajo el nombre, su Ataque Max (o su ataque Gigamax) y
   * debajo los rápidos con los que se saca. Con «Todos», una línea así por cada
   * Ataque Max que tenga.
   */
  const maxRows = computed(() => {
    if (!gameData.isReady || mode.value !== 'max') return []

    const filas = filasMaxOrdenadas(
      gameData.roster,
      (entry) => gameData.maxInfoFor(entry)?.opciones ?? [],
      { tipo: type.value, legendarios: includeLegendary.value }
    )

    return filas.slice(0, LIMITE).map(({ entry, version, opciones, stab, value }, indice) => ({
      id: `${entry.id}-${opciones.map((opcion) => opcion.max.id).join('+')}`,
      formId: entry.id,
      // Sus puestos como tanque y sanador, para las tres letras de la fila.
      papeles: gameData.papelesDeMax().get(entry.id) ?? null,
      version,
      maxLines: opciones.map((opcion) => lineaMax(opcion, entry)),
      rank: indice + 1,
      dex: entry.dex,
      // La fila Gigamax, con su sprite gigamaxizado.
      spriteId: version === 'gigantamax' ? gigamaxSpriteId(entry.spriteId) : entry.spriteId,
      name: entry.name,
      nameEs: entry.nameEs,
      types: entry.types,
      moves: [],
      stab,
      value
    }))
  })

  /** Las filas del modo que se está viendo. */
  const filasVisibles = computed(() =>
    mode.value === 'max'
      ? maxRows.value
      : mode.value === 'pve'
      ? pveConFantasma.value
      : mode.value === 'gym'
      ? gymRows.value
      : pvpRows.value
  )

  /**
   * Qué procedencias de movimiento salen en la tabla que se está viendo.
   *
   * La leyenda solo explica los colores que de verdad aparecen: si en ese top no
   * hay ningún legacy, decir qué significa el morado sobra y despista.
   */
  const origenes = computed(() =>
    origenesPresentes(
      filasVisibles.value.flatMap((fila) => fila.moves ?? [fila.fast, fila.charged])
    )
  )

  /** Qué marcas explica la leyenda del Max: solo las que salen en la lista. */
  const leyendaMax = computed(() => ({
    stab: maxRows.value.some((fila) => fila.stab),
    gigantamax: maxRows.value.some((fila) => fila.version === 'gigantamax')
  }))

  return {
    pveRows: pveConFantasma,
    pvpRows,
    maxRows,
    gymRows,
    filasVisibles,
    origenes,
    leyendaMax,
    probarConjunto
  }
}
