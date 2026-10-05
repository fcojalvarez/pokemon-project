import { calcCP } from './formulas'

/** Sin tildes ni mayúsculas: «mega char» encuentra «Mega Charizard X». */
const sinTildes = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
const normalizar = (texto) => sinTildes(texto).replace(/[^a-z0-9]/g, '')
/** Las palabras del nombre, para casar también por la segunda («char» → «Mega Charizard»). */
const palabras = (texto) =>
  sinTildes(texto)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

/**
 * Las formas del roster que casan con lo escrito, para elegir con quién
 * comparar: primero las que empiezan por el texto, luego las que tienen una
 * palabra que empieza por él (sin esto, «blasto» sacaba «Karrablast Oscuro»).
 * Con las megas, regionales y oscuras, que son justo las dudas de siempre
 * («¿mejor el oscuro o la mega?»). El propio Pokémon de la ficha no sale.
 */
export function candidatosComparar(roster, texto, nombre, { excluir = null, limite = 8 } = {}) {
  const q = normalizar(texto)
  if (!q) return []
  const empiezan = []
  const contienen = []
  for (const entry of roster) {
    if (entry.id === excluir || !entry.stats?.atk) continue
    const nombres = [nombre(entry), entry.name]
    if (nombres.some((n) => normalizar(n).startsWith(q))) empiezan.push(entry)
    else if (
      String(entry.dex) === q ||
      nombres.some((n) => palabras(n).some((palabra) => palabra.startsWith(q)))
    )
      contienen.push(entry)
    if (empiezan.length >= limite) break
  }
  return [...empiezan, ...contienen].slice(0, limite)
}

/**
 * Lo que se compara de una forma: estadísticas, PC máximo, su mejor conjunto
 * de ataques para incursiones y sus puestos PvE y PvP. En PvE, el general y
 * su mejor puesto por tipo: muchos no entran en el general (Blastoise) y en
 * su tipo sí. Todo sale de lo que ya
 * calcula el resto de la ficha, así que los números son los mismos que se ven
 * en la de cada uno.
 */
export function resumenComparable(gameData, entry) {
  const mejor = gameData.bestMovesets(entry, 1)[0] ?? null
  const pve = gameData.pveRanksFor(entry.dex).find((forma) => forma.id === entry.id)
  const pvp = {}
  for (const puesto of gameData.pvpRanksFor(entry.dex)) {
    if (puesto.id !== entry.id) continue
    pvp[puesto.league] = Math.min(pvp[puesto.league] ?? Infinity, puesto.rank)
  }
  return {
    entry,
    stats: entry.stats,
    cp: calcCP(entry.stats, { atk: 15, def: 15, hp: 15 }, 50),
    mejor,
    pve: pve?.overall?.rank ?? null,
    // byType viene ordenado por puesto: el primero es su mejor tipo.
    mejorTipo: pve?.byType?.[0] ? { tipo: pve.byType[0].type, rank: pve.byType[0].rank } : null,
    pvp
  }
}

/**
 * Las filas de la tabla: cada una con su valor a cada lado y cuál gana.
 * `mayor`: gana el número más alto (estadísticas, DPS); `menor`: el puesto
 * más bajo. Sin dato en un lado, no gana nadie: no es que sea peor, es que
 * no está entre los que se clasifican.
 */
export function filasComparar(a, b) {
  const fila = (clave, va, vb, mejor, extra = {}) => {
    let gana = null
    if (va != null && vb != null && va !== vb) {
      gana = (mejor === 'mayor' ? va > vb : va < vb) ? 'a' : 'b'
    }
    return { clave, a: va, b: vb, mejor, gana, ...extra }
  }
  return [
    fila('atk', a.stats.atk, b.stats.atk, 'mayor'),
    fila('def', a.stats.def, b.stats.def, 'mayor'),
    fila('hp', a.stats.hp, b.stats.hp, 'mayor'),
    fila('cp', a.cp, b.cp, 'mayor'),
    fila('dps', a.mejor?.dps ?? null, b.mejor?.dps ?? null, 'mayor'),
    fila('tdo', a.mejor?.tdo ?? null, b.mejor?.tdo ?? null, 'mayor'),
    fila('pve', a.pve, b.pve, 'menor'),
    // El de cada uno en su tipo: con `tipos` para el icono y las letras por tipo.
    fila('bestType', a.mejorTipo?.rank ?? null, b.mejorTipo?.rank ?? null, 'menor', {
      tipos: { a: a.mejorTipo?.tipo ?? null, b: b.mejorTipo?.tipo ?? null }
    }),
    fila('great', a.pvp.great ?? null, b.pvp.great ?? null, 'menor'),
    fila('ultra', a.pvp.ultra ?? null, b.pvp.ultra ?? null, 'menor'),
    fila('master', a.pvp.master ?? null, b.pvp.master ?? null, 'menor')
  ]
}
