/**
 * Efectos secundarios de los movimientos en PvP.
 *
 * pvpoke los publica como `buffs: [ataque, defensa]` en escalones, más a quién
 * afectan y con qué probabilidad. Son 99 movimientos de 344 y en combate pesan
 * tanto como el daño: Bomba Ácida hace 20, pero deja al rival sin defensa.
 *
 * Aquí solo se descompone el dato; el texto lo pone la vista con $t, que es
 * donde viven los idiomas.
 */

/** Escalones -> intensidad, con los nombres que usa el propio juego. */
function intensityOf(steps) {
  if (steps >= 3) return 'lots'
  if (steps === 2) return 'much'
  return 'normal'
}

/**
 * Descompone el efecto de un movimiento.
 *
 * @param {object|null} pvp stats de PvP del movimiento (moves.json)
 * @returns {{stats: string[], direction: 'up'|'down', intensity: string,
 *            target: 'self'|'opponent'|'both', chance: number}|null}
 *          null si el movimiento no tiene efecto secundario
 */
export function describeMoveEffect(pvp) {
  const buffs = pvp?.buffs
  if (!Array.isArray(buffs) || buffs.length < 2) return null

  const [attack, defense] = buffs
  if (!attack && !defense) return null

  const stats = []
  if (attack) stats.push('attack')
  if (defense) stats.push('defense')

  // Comprobado sobre los 99 movimientos con efecto: ataque y defensa nunca
  // van en sentidos opuestos, así que basta con uno para saber la dirección.
  const steps = Math.max(Math.abs(attack), Math.abs(defense))

  return {
    stats,
    direction: (attack || defense) > 0 ? 'up' : 'down',
    intensity: intensityOf(steps),
    target: pvp.buffTarget ?? 'self',
    chance: pvp.buffApplyChance ?? 1
  }
}

/**
 * La probabilidad como porcentaje legible: 0.125 -> "12,5", 1 -> null.
 * Se devuelve null cuando siempre ocurre, para no ensuciar con un "(100 %)".
 */
export function effectChanceLabel(chance, locale = 'es') {
  if (chance == null || chance >= 1) return null
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(chance * 100)
}
