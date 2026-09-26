/**
 * Traducción de los textos que LeekDuck publica en inglés (tareas de
 * investigación y bonificaciones) usando **los textos del propio juego**.
 *
 * No se traduce nada a mano: el diccionario lo genera scripts/build-data.mjs
 * cruzando los ficheros i18n de Pokémon GO en inglés y en español, así que las
 * frases son literalmente las que ves en la app.
 */

/**
 * Clave de búsqueda: minúsculas, números y marcadores unificados como `{n}`,
 * y fuera todo lo demás (incluidas las tildes, que se quitan en ambos lados
 * por igual, así que siguen casando).
 */
export function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .replace(/\{\d+\}/g, '{n}')
    .replace(/\b\d+\b/g, '{n}')
    .replace(/[^a-z0-9{} ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Traduce un texto si existe la frase equivalente en el juego.
 * Los números del original se colocan en los marcadores de la plantilla:
 * "Make 7 Great Throws" -> "Haz {0} grandes lanzamientos" -> "Haz 7 grandes…".
 *
 * @returns {string} la frase en español, o el original si no hay equivalencia
 */
export function translateGameText(text, dictionary) {
  if (!text || !dictionary) return text

  const plain = String(text)
  const template = dictionary[normalizeText(plain)]
  if (!template) return plain

  const numbers = plain.match(/\d+/g) ?? []
  const placeholders = template.match(/\{\d+\}/g) ?? []

  if (!placeholders.length) return template

  // Sin números que poner quedaría un "{0}" suelto: mejor dejar el original.
  if (numbers.length < placeholders.length) return plain

  return template.replace(/\{(\d+)\}/g, (_, index) => numbers[Number(index)] ?? numbers[0])
}
