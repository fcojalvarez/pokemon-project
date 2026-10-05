import { computed } from 'vue'
import { useGameDataStore } from '../stores/gameData'
import { POTENCIA_MAX, mejorRapido, pesoAtaqueMax } from '../utils/maxBattle'
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
    return type.value === 'all' ? rankings.overall : rankings.byType[type.value] ?? []
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
          // Sin el movimiento en moves.json queda el id, que es mejor que nada.
          moves: (row.moveset ?? []).map((id) => ({
            id,
            name: gameData.moves[id]?.name ?? id,
            nameEs: gameData.moves[id]?.nameEs ?? id,
            type: moveType(id),
            ...origen(id)
          })),
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

    const vistos = new Set()
    const filas = []
    for (const entry of gameData.roster) {
      if (!entry.dynamax && !entry.gigantamax) continue
      if (!includeLegendary.value && (entry.legendary || entry.mythical)) continue
      const opciones = gameData.maxInfoFor(entry)?.opciones ?? []
      // Una fila por cada puntuación distinta: los Ataques Max de su tipo pegan
      // igual (misma potencia, con STAB) y van juntos; los ajenos a su tipo,
      // sin STAB, pegan menos y salen en otra fila más abajo. Así Alakazam
      // queda arriba con Maxionda y más abajo con Maxipuño, y Excadrill sale
      // una sola vez con Maxitemblor y Maximetal, que son de sus dos tipos.
      const grupos = new Map()
      for (const opcion of opciones) {
        if (type.value !== 'all' && opcion.max.type !== type.value) continue
        const version = opcion.gigamax ? 'gigantamax' : 'dynamax'
        const peso = pesoAtaqueMax(entry, opcion)
        const clave = `${entry.dex}-${version}-${Math.round(peso)}`
        if (!grupos.has(clave))
          grupos.set(clave, { version, peso, stab: opcion.stab, opciones: [] })
        grupos.get(clave).opciones.push(opcion)
      }
      for (const [clave, grupo] of grupos) {
        // Los Pikachu con gorro comparten stats con el normal: una fila basta.
        if (vistos.has(clave)) continue
        vistos.add(clave)
        filas.push({
          entry,
          version: grupo.version,
          maxId: grupo.opciones.map((opcion) => opcion.max.id).join('+'),
          maxLines: grupo.opciones.map((opcion) => lineaMax(opcion, entry)),
          stab: grupo.stab,
          // Potencia × ataque × STAB, en la escala del ataque: el de un Dinamax
          // sin STAB (base + 15 de IV). Un Gigamax pega 450 en vez de 350.
          value: grupo.peso / POTENCIA_MAX
        })
      }
    }

    return filas
      .sort((a, b) => b.value - a.value)
      .slice(0, LIMITE)
      .map(({ entry, version, maxId, maxLines, stab, value }, indice) => ({
        id: `${entry.id}-${maxId}`,
        formId: entry.id,
        // Sus puestos como tanque y sanador, para las tres letras de la fila.
        papeles: gameData.papelesDeMax().get(entry.id) ?? null,
        version,
        maxLines,
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
    mode.value === 'max' ? maxRows.value : mode.value === 'pve' ? pveRows.value : pvpRows.value
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

  return { pveRows, pvpRows, maxRows, filasVisibles, origenes, leyendaMax }
}
