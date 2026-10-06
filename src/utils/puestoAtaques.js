/**
 * En qué puesto del Top quedaría un Pokémon con un conjunto de ataques
 * concreto: no el mejor, sino el que lleva el tuyo.
 *
 * El Top coloca a cada Pokémon con su mejor conjunto, aunque necesite un
 * ataque élite o legacy que muchos no tienen. Aquí se cuenta cuántos otros
 * Pokémon rinden más que ese conjunto (en eDPS, como el Top), en general y en el tipo de su ataque
 * cargado (que es la lista del Top en la que saldría).
 *
 * Con las mismas cuentas que el Top: `conjunto.edps` es contra un jefe débil
 * al tipo de su cargado (gameData.conjuntosContra), y `general`, la suma de
 * sus dos mejores tipos con ese conjunto en el suyo (ver puntuacionGeneral).
 * Sin `general`, se compara el eDPS del conjunto.
 *
 * `ranking` es lo que da gameData.pveRankings: { overall, byType }, ya
 * cortado. Si el conjunto queda por debajo del corte, el puesto es `null`
 * («más allá del #N»): contar sobre una lista cortada daría un puesto falso.
 */
export function puestoDeConjunto(conjunto, entryId, ranking, limite, general = conjunto.edps) {
  const puesto = (lista, valor, deOtro) => {
    if (!lista) return null
    const delante = lista.filter((otro) => otro.id !== entryId && deOtro(otro) > valor).length
    // Toda la lista le gana y está llena: puede haber más por debajo del corte.
    if (delante >= limite) return null
    return delante + 1
  }
  return {
    general: puesto(ranking.overall, general, (otro) => otro.general ?? otro.edps),
    tipo: puesto(ranking.byType?.[conjunto.charged.type] ?? [], conjunto.edps, (otro) => otro.edps)
  }
}

/**
 * La puntuación de la lista general con un conjunto concreto: la suma de sus
 * dos mejores tipos, con el conjunto en el tipo de su cargado (lo que tienes
 * en ese tipo es lo tuyo) y los demás tipos con su mejor conjunto.
 * `mejorPorTipo` es { tipo: eDPS } contra un jefe débil a cada uno.
 */
export function puntuacionGeneral(conjunto, mejorPorTipo) {
  const valores = { ...mejorPorTipo, [conjunto.charged.type]: conjunto.edps }
  const [a = 0, b = 0] = Object.values(valores).sort((x, y) => y - x)
  return a + b
}
