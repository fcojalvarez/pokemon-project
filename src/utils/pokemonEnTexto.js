/**
 * Los Pokémon que nombra un texto, en el orden en que salen: para el detalle
 * de un evento, que solo trae la noticia oficial («podríais encontrar a
 * Skwovet, Lechonk, Smoliv…») y no una lista de lo que sale.
 *
 * Se busca cada nombre como palabra entera y respetando mayúsculas: los
 * nombres van con mayúscula y así no casan palabras corrientes. Primero los
 * nombres largos, y lo ya encontrado se tapa, para que «Muk de Alola» no
 * cuente también como «Muk». Megas y oscuros no: son el mismo Pokémon.
 *
 * @param {string} texto
 * @param {Array<{dex:number, name?:string, nameEs?:string, mega?:boolean, shadow?:boolean}>} roster
 * @returns {Array} las entradas del roster, sin repetir especie
 */
export function pokemonEnTexto(texto, roster) {
  if (!texto || !roster?.length) return []
  const candidatos = []
  for (const entrada of roster) {
    if (entrada.mega || entrada.shadow) continue
    for (const nombre of new Set([entrada.nameEs, entrada.name])) {
      if (nombre && nombre.length >= 3) candidatos.push({ nombre, entrada })
    }
  }
  candidatos.sort((a, b) => b.nombre.length - a.nombre.length)

  let resto = texto
  const encontrados = []
  for (const { nombre, entrada } of candidatos) {
    const escapado = nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const patron = new RegExp(`(?<![\\p{L}\\d])${escapado}(?![\\p{L}\\d])`, 'gu')
    let m
    while ((m = patron.exec(resto))) {
      encontrados.push({ pos: m.index, entrada })
      // Se tapa con espacios del mismo largo: las posiciones no se mueven.
      resto =
        resto.slice(0, m.index) + ' '.repeat(nombre.length) + resto.slice(m.index + nombre.length)
    }
  }

  encontrados.sort((a, b) => a.pos - b.pos)
  const vistos = new Set()
  return encontrados
    .filter(({ entrada }) => !vistos.has(entrada.dex) && vistos.add(entrada.dex))
    .map(({ entrada }) => entrada)
}
