/**
 * Lo que cuesta subir un Pokémon de un nivel a otro: polvo, caramelos y
 * caramelos XL.
 *
 * Las tablas son las de POKEMON_UPGRADE_SETTINGS del GAME_MASTER, una entrada
 * por nivel entero: cada nivel son dos subidas (de 20 a 20,5 y de 20,5 a 21)
 * y las dos cuestan lo mismo. Van aquí fijas, como el CPM de formulas.js, y
 * el pipeline (build-data) avisa si el GAME_MASTER deja de coincidir.
 *
 * Del 40 al 50 ya no se paga en caramelos sino en caramelos XL.
 */
export const POLVO_POR_NIVEL = [
  200, 200, 400, 400, 600, 600, 800, 800, 1000, 1000, 1300, 1300, 1600, 1600, 1900, 1900, 2200,
  2200, 2500, 2500, 3000, 3000, 3500, 3500, 4000, 4000, 4500, 4500, 5000, 5000, 6000, 6000, 7000,
  7000, 8000, 8000, 9000, 9000, 10000, 10000, 11000, 11000, 12000, 12000, 13000, 13000, 14000,
  14000, 15000
]
export const CARAMELOS_POR_NIVEL = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 6, 6, 8,
  8, 10, 10, 12, 12, 15
]
export const XL_POR_NIVEL = [10, 10, 12, 12, 15, 15, 17, 17, 20, 20]

export const NIVEL_MIN = 1
export const NIVEL_MAX = 50
/** Desde aquí se paga en caramelos XL. */
const NIVEL_XL = 40

/**
 * Lo que cambia cada variante, por subida y redondeando hacia arriba, como
 * el juego: un oscuro paga un 20 % más de polvo y de caramelos, uno
 * purificado un 10 % menos, y uno con suerte, la mitad de polvo.
 */
export const VARIANTES = {
  normal: { polvo: 1, caramelos: 1 },
  oscuro: { polvo: 1.2, caramelos: 1.2 },
  purificado: { polvo: 0.9, caramelos: 0.9 },
  suerte: { polvo: 0.5, caramelos: 1 }
}

/**
 * Coste de subir de `desde` a `hasta` (niveles, con medios). Si `hasta` no
 * es mayor que `desde`, no cuesta nada.
 *
 * `propia` es la tabla de la especie, si el juego le pone otra
 * (`costesSubida` del roster: Eternatus paga treinta veces más caramelos).
 * @returns {{ polvo: number, caramelos: number, xl: number }}
 */
export function costeSubida(desde, hasta, variante = 'normal', propia = null) {
  const mult = VARIANTES[variante] ?? VARIANTES.normal
  const caramelos = propia?.caramelos ?? CARAMELOS_POR_NIVEL
  const xl = propia?.xl ?? XL_POR_NIVEL
  const coste = { polvo: 0, caramelos: 0, xl: 0 }
  for (let nivel = desde; nivel < hasta; nivel += 0.5) {
    const i = Math.floor(nivel) - 1
    coste.polvo += Math.ceil(POLVO_POR_NIVEL[i] * mult.polvo)
    if (nivel < NIVEL_XL) coste.caramelos += Math.ceil(caramelos[i] * mult.caramelos)
    else coste.xl += Math.ceil(xl[i - (NIVEL_XL - 1)] * mult.caramelos)
  }
  return coste
}
