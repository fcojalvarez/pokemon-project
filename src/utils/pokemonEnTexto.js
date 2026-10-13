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

/**
 * Lo que dice que un Pokémon sale por primera vez en el juego, en español o en
 * inglés. Los debuts de otra cosa (su shiny, su nivel supermáximo, su forma
 * Dinamax o Gigamax) no cuentan: el Pokémon ya estaba.
 */
const DEBUT = /\bdebut|debuta|por primera vez|first time/i
const OTRO_DEBUT = /shiny|variocolor|supermáx|super max|dinamax|dynamax|gigamax|gigantamax/i

/** Las frases de un texto: se corta tras . ! ? y antes de ¡ ¿ */
const frases = (texto) => String(texto ?? '').split(/(?<=[.!?])\s+|\s+(?=[¡¿])/)

/**
 * Los Pokémon que debutan según la noticia de un evento: los que nombra su
 * título o una frase que hable de debut, y todos los de una sección cuyo título
 * lo diga («Debut de Pokémon»: «Por primera vez en Pokémon GO, os podréis
 * encontrar a Bramblin»). LeekDuck no lo publica en ningún campo.
 *
 * @param {{ titulo?: string, secciones?: Array<{ titulo?: string, bloques?: Array }> }} noticia
 *   con los bloques tal cual se guardan ({ t: 'p', x } o { t: 'ul', items })
 * @param {Array} roster
 */
export function debutsEnNoticia(noticia, roster) {
  if (!noticia) return []
  const esDebut = (texto) => DEBUT.test(texto ?? '') && !OTRO_DEBUT.test(texto ?? '')
  const bloquesDe = (seccion) =>
    (seccion.bloques ?? []).flatMap((bloque) => (bloque.t === 'ul' ? bloque.items : [bloque.x]))
  const frasesDeDebut = (texto) => frases(texto).filter(esDebut)

  const textos = frasesDeDebut(noticia.titulo)
  for (const seccion of noticia.secciones ?? []) {
    if (esDebut(seccion.titulo)) textos.push(...bloquesDe(seccion))
    else textos.push(...[seccion.titulo, ...bloquesDe(seccion)].flatMap(frasesDeDebut))
  }
  // Uno con el shiny ya liberado no puede estar debutando: así no cuelan
  // «Mega Manectric debuta» ni «Pikachu con visera debuta».
  return pokemonEnTexto(textos.join(' · '), roster).filter((entrada) => !entrada.shinyReleased)
}

/**
 * Si la noticia marca a un Pokémon con asterisco («Ponyta*»): así avisa
 * Pokémon GO de que puede salir shiny en el evento.
 */
export function conAsterisco(texto, entrada) {
  if (!texto || !entrada) return false
  return [entrada.nameEs, entrada.name].some((nombre) => {
    if (!nombre) return false
    const escapado = nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(?<![\\p{L}\\d])${escapado}\\*`, 'u').test(texto)
  })
}
