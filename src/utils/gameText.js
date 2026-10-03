/**
 * Traducción de los textos que LeekDuck publica en inglés (tareas de
 * investigación y bonificaciones) usando **los textos del propio juego**.
 *
 * No se traduce nada a mano: el diccionario lo genera scripts/build-data.mjs
 * cruzando los ficheros i18n de Pokémon GO en inglés y en español, así que las
 * frases son literalmente las que ves en la app.
 */

/**
 * Clave para comparar nombres de Pokémon: minúsculas y solo letras y números.
 * Con eso, «Farfetch'd» y «Farfetchd» son el mismo, y da igual de dónde venga
 * el nombre (LeekDuck, pvpoke o el juego).
 */
export function normalizeName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Clave de búsqueda: minúsculas, números unificados como `{n}` y fuera todo lo
 * demás (incluidas las tildes, que se quitan en ambos lados por igual, así que
 * siguen casando).
 *
 * Con `keepNumbers` los números se quedan tal cual. Hace falta para las
 * bonificaciones: el español del juego escribe el multiplicador con palabras
 * («Doble de PX por captura», «Triple de PX por captura») y no con un
 * marcador, así que si 2×, 3× y 4× comparten clave se pisan entre ellas.
 */
export function normalizeText(text, { keepNumbers = false } = {}) {
  let out = String(text)
    .toLowerCase()
    // El juego escribe «3× Catch XP» y LeekDuck «3x Catch XP». Sin unificarlo,
    // la x pegada al número impide que éste cuente como palabra y las dos
    // frases normalizan distinto: así no casaba ni una bonificación.
    .replace(/(\d)\s*[x×](?=\s|$)/g, '$1 ')

  if (!keepNumbers) {
    out = out.replace(/\{\d+\}/g, '{n}').replace(/\b\d+\b/g, '{n}')
  }

  return out
    .replace(/[^a-z0-9{} ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Traduce un texto si existe la frase equivalente en el juego.
 *
 * Se busca primero la frase con su número tal cual y solo después la forma
 * genérica, porque son dos casos distintos:
 *
 *   - Bonificaciones: «3× Catch XP» → «Triple de PX por captura». El número va
 *     en el propio texto español, así que la clave tiene que llevarlo.
 *   - Tareas: «Make 7 Great Throws» → «Haz {0} grandes lanzamientos» → «Haz 7
 *     grandes lanzamientos». Ahí el español sí trae marcador.
 *
 * @returns {string} la frase en español, o el original si no hay equivalencia
 */
export function translateGameText(text, dictionary) {
  if (!text || !dictionary) return text

  const plain = String(text)
  const numbers = plain.match(/\d+/g) ?? []

  const exact = dictionary[normalizeText(plain, { keepNumbers: true })]
  if (exact) return exact

  const template = dictionary[normalizeText(plain)]
  if (!template) return plain

  const placeholders = template.match(/\{\d+\}/g) ?? []

  // Plantilla sin marcadores para un texto que sí lleva números: viene de otra
  // frase que normaliza igual, justo el caso del multiplicador. Antes de
  // soltar una cifra equivocada, se deja el original.
  if (!placeholders.length) return numbers.length ? plain : template

  // Sin números que poner quedaría un "{0}" suelto: mejor dejar el original.
  if (numbers.length < placeholders.length) return plain

  return template.replace(/\{(\d+)\}/g, (_, index) => numbers[Number(index)] ?? numbers[0])
}

/**
 * El texto de una tarea de investigación de LeekDuck, sin el <span> en que
 * viene envuelto. Es también la clave con la que scripts/lib/traducciones.mjs
 * guarda su traducción, así que los dos lados tienen que limpiarlo igual.
 */
export function plainText(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .trim()
}

/**
 * La app dice «shiny», nunca «variocolor» como el juego y las noticias en
 * español. Lo usa el script de noticias al guardarlas y la app al leerlas,
 * para lo que ya estuviera guardado.
 */
export function aShiny(texto) {
  if (typeof texto !== 'string') return texto
  return texto.replace(/\b(v)ariocolor(es)?\b/gi, (_, v) => (v === 'V' ? 'Shiny' : 'shiny'))
}

/** aShiny en todos los textos de un objeto (una noticia con sus secciones). */
export function aShinyEnTodo(valor) {
  if (typeof valor === 'string') return aShiny(valor)
  if (Array.isArray(valor)) return valor.map(aShinyEnTodo)
  if (valor && typeof valor === 'object')
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, aShinyEnTodo(v)]))
  return valor
}
