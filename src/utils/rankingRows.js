/**
 * Las filas del Top llegan con dos formas: las de PvE traen `fast`/`charged`
 * (tal y como sale de evaluatePokemon) y las de PvP y Max, una lista `moves`
 * ya montada. AttackerList y AttackerTable las leen igual con esto.
 */
export const movesOf = (row) => row.moves ?? [row.fast, row.charged].filter(Boolean)

/** Clave de una fila: el mismo Pokémon sale una vez por cada conjunto de ataques. */
export const rowKey = (row) => [row.id, ...movesOf(row).map((move) => move?.id ?? move?.nameEs)].join('-')
