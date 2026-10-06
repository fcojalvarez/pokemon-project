/**
 * ¿Coinciden las conversiones de src/utils/cambiosForma.js con `formChange`
 * del GAME_MASTER? Devuelve las diferencias, una por línea (vacío si cuadra).
 */
export function diferenciasCambiosForma(gmRaw, conversiones) {
  /** Los cambios que el GAME_MASTER da para una forma (por su nombre de forma). */
  const cambiosDe = (forma) => {
    const plantilla = gmRaw.find((t) => {
      const p = t.data?.pokemonSettings
      return p?.formChange && (p.form ?? p.pokemonId) === forma
    })
    return plantilla?.data.pokemonSettings.formChange ?? []
  }
  /** Lo que cuesta un cambio, con las claves de cambiosForma.js. */
  const coste = (f) => ({
    caramelos: f.candyCost,
    polvo: f.stardustCost,
    cantidad: f.item && f.item !== 'ITEM_BEANS' ? f.itemCostCount : undefined,
    celulas: f.item === 'ITEM_BEANS' ? f.itemCostCount : undefined,
    caramelosCon: f.componentPokemonSettings?.componentCandyCost
  })
  const CLAVES = ['caramelos', 'polvo', 'cantidad', 'celulas', 'caramelosCon']
  const igual = (nuestro, suyo) => CLAVES.every((k) => nuestro[k] === suyo[k])
  // Zacian y Zamazenta traen dos entradas iguales, una sin coste: vale la que lo tiene.
  const buscar = (forma, destino) =>
    cambiosDe(forma)
      .filter((f) => f.availableForm?.includes(destino))
      .sort((a, b) => Number(Boolean(b.candyCost || b.item)) - Number(Boolean(a.candyCost || a.item)))[0]

  const fallos = []
  for (const c of conversiones) {
    const ida = buscar(c.gmDesde, c.gmA)
    if (!ida) fallos.push(`${c.desde} → ${c.a}: no está`)
    else if (!igual(c, coste(ida))) fallos.push(`${c.desde} → ${c.a}: otro coste`)
    if (!c.vuelta) continue
    const vuelta = buscar(c.gmA, c.gmDesde)
    if (!vuelta) fallos.push(`${c.a} → ${c.desde}: no está`)
    else if (!igual(c.vuelta, coste(vuelta))) fallos.push(`${c.a} → ${c.desde}: otro coste`)
  }
  return fallos
}
