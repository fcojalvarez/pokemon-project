/**
 * Resumen de un evento a partir de lo que publica LeekDuck.
 *
 * LeekDuck NO publica descripciones: cada evento trae título, tipo, fechas,
 * imagen y un `extraData` con datos sueltos. Lo que hay aquí no es una
 * traducción de una descripción que no existe, sino un resumen armado con esos
 * datos, que es lo que de verdad se quiere saber: qué Pokémon salen, qué
 * bonificaciones hay y qué variocolores se pueden encontrar.
 *
 * Es una función pura para poder probarla: si LeekDuck cambia la forma de
 * `extraData`, salta en los tests y no en la cara del usuario.
 *
 * @returns {{spawns: object[], bosses: object[], shinies: object[],
 *            bonuses: string[], notes: string[], hasSpawns: boolean,
 *            hasResearch: boolean}|null}
 */
export function summarizeEvent(event) {
  const extra = event?.extraData
  if (!extra) return null

  const lista = (valor) => (Array.isArray(valor) ? valor : [])
  const conNombre = (uno) => uno && uno.name

  // La hora destacada trae su protagonista en `spotlight.list` (a veces varios)
  // y el Día de la Comunidad en `communityday.spawns`.
  const spawns = [
    ...lista(extra.spotlight?.list),
    ...lista(extra.communityday?.spawns)
  ].filter(conNombre)

  const bosses = lista(extra.raidbattles?.bosses).filter(conNombre)

  const shinies = [
    ...lista(extra.raidbattles?.shinies),
    ...lista(extra.communityday?.shinies)
  ].filter(conNombre)

  const bonuses = [
    extra.spotlight?.bonus,
    ...lista(extra.communityday?.bonuses).map((uno) => uno?.text)
  ].filter(Boolean)

  const resumen = {
    spawns: dedupe(spawns),
    bosses: dedupe(bosses),
    shinies: dedupe(shinies),
    bonuses: [...new Set(bonuses)],
    // Los asteriscos de las bonificaciones se explican aquí abajo.
    notes: lista(extra.communityday?.bonusDisclaimers).filter(Boolean),
    hasSpawns: !!extra.generic?.hasSpawns,
    hasResearch: !!extra.generic?.hasFieldResearchTasks
  }

  const vacio =
    !resumen.spawns.length &&
    !resumen.bosses.length &&
    !resumen.shinies.length &&
    !resumen.bonuses.length &&
    !resumen.hasSpawns &&
    !resumen.hasResearch

  return vacio ? null : resumen
}

/** Un mismo Pokémon puede venir repetido entre listas. */
function dedupe(list) {
  const vistos = new Set()
  return list.filter((uno) => {
    if (vistos.has(uno.name)) return false
    vistos.add(uno.name)
    return true
  })
}
