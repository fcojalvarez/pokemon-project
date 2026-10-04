/**
 * Las filas del Top llegan con dos formas: las de PvE traen `fast`/`charged`
 * (tal y como sale de evaluatePokemon) y las de PvP y Max, una lista `moves`
 * ya montada. AttackerList y AttackerTable las leen igual con esto.
 */
export const movesOf = (row) => row.moves ?? [row.fast, row.charged].filter(Boolean)

/** Clave de una fila: el mismo Pokémon sale una vez por cada conjunto de ataques. */
export const rowKey = (row) =>
  [row.id, ...movesOf(row).map((move) => move?.id ?? move?.nameEs)].join('-')

/**
 * La ficha de una fila. Megas, regionales y demás formas van con su ?form=:
 * sin él, Mega Delphox llevaba a la ficha de Delphox. Un oscuro va a la de su
 * forma normal, que es donde sale; la forma base, sin nada. `fichaBase` es la
 * del store de gameData. Las filas Max traen la forma en `formId`, porque su
 * id lleva también el Ataque Max.
 */
export const fichaDeFila = (row, fichaBase) => {
  if (!row.dex) return null
  const id = String(row.formId ?? row.id).replace(/_shadow$/, '')
  // Con el nombre de la especie, como la ficha: en Meowstic y Zygarde la base
  // no es la primera forma (meowstic_female, zygarde_10).
  const base = fichaBase(row.dex, id.split('_')[0])
  return !base || base.id === id ? `/pokemon/${row.dex}` : `/pokemon/${row.dex}?form=${id}`
}
