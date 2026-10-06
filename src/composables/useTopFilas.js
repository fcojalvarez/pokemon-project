import { computed } from 'vue'
import { useGameDataStore } from '../stores/gameData'
import { filasMaxOrdenadas, mejorRapido } from '../utils/maxBattle'
import { gigamaxSpriteId } from '../utils/gigamax'
import { origenDe, origenesPresentes } from '../utils/moveOrigins'

/** Cuántos atacantes salen en cada top. */
const LIMITE = 50

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
    includeLegendary
  } = filtros

  const pveRows = computed(() => {
    if (!gameData.isReady || mode.value !== 'pve') return []
    const rankings = gameData.pveRankings({
      includeMega: includeMega.value,
      includeShadow: includeShadow.value,
      includeLegacy: includeLegacy.value,
      includeElite: includeElite.value,
      sortBy: sortBy.value,
      limit: LIMITE
    })
    const filas = type.value === 'all' ? rankings.overall : rankings.byType[type.value] ?? []
    // Cada fila, también con el clima que potencia su tipo (la cifra en ámbar).
    return filas.map((row) => ({ ...row, conClima: gameData.conClima(row) }))
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
      ? pveRows.value
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

  return { pveRows, pvpRows, maxRows, gymRows, filasVisibles, origenes, leyendaMax }
}
