/**
 * Cuentas de un combate PvP: cuántos ataques rápidos hacen falta para cargar
 * cada ataque cargado. Es la base del PvP: con ella se sabe cuándo va a
 * lanzar el rival y cuándo conviene cambiar.
 *
 * `rapido` y `cargado` son movimientos de moves.json, con su `pvp`: el rápido
 * da `energyGain` por uso y dura `turns` turnos; el cargado cuesta `energy`.
 */
export function rapidosParaCargar(rapido, cargado) {
  const gana = rapido?.pvp?.energyGain
  const cuesta = Math.abs(cargado?.pvp?.energy ?? 0)
  if (!gana || !cuesta) return null
  const veces = Math.ceil(cuesta / gana)
  return { veces, turnos: veces * (rapido.pvp.turns || 1) }
}

/**
 * El conjunto recomendado de una entrada de pvp.json (moveset: rápido y uno o
 * dos cargados), con la cuenta de cada cargado. Los ataques que no estén en
 * moves.json se saltan.
 */
export function conjuntoPvp(moveset, moves) {
  const [idRapido, ...idsCargados] = moveset ?? []
  const rapido = moves[idRapido]
  if (!rapido) return null
  const cargados = idsCargados
    .map((id) => moves[id])
    .filter(Boolean)
    .map((cargado) => ({ ...cargado, cuenta: rapidosParaCargar(rapido, cargado) }))
  return { rapido, cargados }
}
