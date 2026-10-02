/**
 * En qué puesto del Top quedaría un Pokémon con un conjunto de ataques
 * concreto: no el mejor, sino el que lleva el tuyo.
 *
 * El Top coloca a cada Pokémon con su mejor conjunto, aunque necesite un
 * ataque élite o legacy que muchos no tienen. Aquí se cuenta cuántos otros
 * Pokémon pegan más que ese conjunto, en general y en el tipo de su ataque
 * cargado (que es la lista del Top en la que saldría).
 *
 * `ranking` es lo que da gameData.pveRankings: { overall, byType }, ya
 * cortado. Si el conjunto queda por debajo del corte, el puesto es `null`
 * («más allá del #N»): contar sobre una lista cortada daría un puesto falso.
 */
export function puestoDeConjunto(conjunto, entryId, ranking, limite) {
  const puesto = (lista) => {
    if (!lista) return null
    const delante = lista.filter((otro) => otro.id !== entryId && otro.dps > conjunto.dps).length
    // Toda la lista le gana y está llena: puede haber más por debajo del corte.
    if (delante >= limite) return null
    return delante + 1
  }
  return {
    general: puesto(ranking.overall),
    tipo: puesto(ranking.byType?.[conjunto.charged.type] ?? [])
  }
}
