/**
 * Iconos de formas y disfraces (los del juego, vía pokemon-go-api). En los
 * datos va solo el nombre del fichero; aquí se arma la URL completa.
 */
export const BASE_ICONOS = 'https://raw.githubusercontent.com/pokemon-go-api/assets/main/Pokemon/'

export const iconoForma = (fichero, { shiny = false } = {}) =>
  `${BASE_ICONOS}${fichero}${shiny ? '.s' : ''}.icon.png`
