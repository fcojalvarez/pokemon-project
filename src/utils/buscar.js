/**
 * Búsqueda de texto libre en lo que hay ahora en el juego (misiones,
 * incursiones, huevos, Rocket, eventos).
 *
 * Sin tildes ni mayúsculas y por palabras sueltas: «caramelo compañero»
 * encuentra «Consigue 1 caramelo explorando con tu compañero», igual que
 * «compañero caramelo» o «companero».
 */

/** Minúsculas, sin tildes y con los espacios juntos. */
export function normalizarBusqueda(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Las palabras de lo que se ha escrito, ya normalizadas. */
export function palabrasDe(consulta) {
  return normalizarBusqueda(consulta).split(' ').filter(Boolean)
}

/**
 * Si todas las palabras de la consulta están en alguno de los campos (cada
 * una puede estar en uno distinto: «bramblin caramelo» casa con la misión por
 * el texto y por la recompensa). Sin consulta, todo casa.
 *
 * @param {string[]} palabras  lo que devuelve palabrasDe()
 * @param {Array<string | null | undefined>} campos  textos del elemento
 */
export function casa(palabras, campos) {
  if (!palabras.length) return true
  const pajar = normalizarBusqueda(campos.filter(Boolean).join(' · '))
  return palabras.every((palabra) => pajar.includes(palabra))
}
