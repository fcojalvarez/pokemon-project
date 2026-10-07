/**
 * Los PS del jefe y lo que dura cada nivel de incursión, por el nombre del
 * nivel que da ScrapedDuck. No vienen en el GAME_MASTER: son los de siempre
 * de la comunidad, y sirven para una estimación, no para un cálculo exacto.
 */
const INCURSIONES = {
  '1-Star Raids': { ps: 600, segundos: 180 },
  '3-Star Raids': { ps: 3600, segundos: 180 },
  '5-Star Raids': { ps: 15000, segundos: 300 },
  'Mega Raids': { ps: 9000, segundos: 300 },
  'Elite Raids': { ps: 20000, segundos: 300 },
  'Primal Raids': { ps: 22500, segundos: 300 },
  'Ultra Beast Raids': { ps: 15000, segundos: 300 }
}

/** Lo que se va en entrar y en las animaciones: no se pega en esos segundos. */
const SEGUNDOS_PERDIDOS = 30

/** Los datos de un nivel de incursión, o null si no se conoce. */
export const datosIncursion = (nivel) => INCURSIONES[nivel] ?? null

/**
 * Cuántos jugadores harían falta para ganar a tiempo si todos llevan seis de
 * ese counter: los PS del jefe entre el eDPS (que ya descuenta las caídas)
 * dan lo que tardaría uno solo, y eso se reparte en el tiempo útil.
 */
export function jugadoresNecesarios(edps, nivel) {
  const datos = datosIncursion(nivel)
  if (!datos || !(edps > 0)) return null
  const soloSegundos = datos.ps / edps
  return Math.max(1, Math.ceil(soloSegundos / (datos.segundos - SEGUNDOS_PERDIDOS)))
}
