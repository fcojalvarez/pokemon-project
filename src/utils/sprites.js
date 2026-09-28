const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other'

/**
 * URL del sprite en PokeAPI.
 *
 * Todo sale de "home", que está normalizado: mismo lienzo de 512x512 y el
 * Pokémon encuadrado igual en la versión normal y en la variocolor. Antes la
 * novena generación tiraba de "official-artwork" porque no tenía sprites home;
 * ya los tiene, y el artwork no está normalizado: en Gimmighoul (#999) el
 * dibujo variocolor ocupa más que el normal y al pulsar "Ver shiny" el sprite
 * pegaba un salto de tamaño.
 *
 * `spriteId` es el número de Pokédex para las formas base y un id >= 10000
 * para megas, formas regionales y variantes (lo genera scripts/build-data.mjs).
 */
export function spriteUrl(spriteId, { shiny = false } = {}) {
  return `${BASE}/home/${shiny ? 'shiny/' : ''}${spriteId}.png`
}

/**
 * La versión más ligera de un sprite, si la hay; si no, null. BaseSprite la
 * pide primero y, si falla, cae a la original, así que nunca queda rota.
 *
 * - PokeAPI: la miniatura WebP propia (ver scripts/build-sprites.mjs), 256 px
 *   y unos 12 KB en vez de un PNG de 512 px y 80-200 KB.
 * - LeekDuck: el icono recortado (`pokemon_icons_crop`). El normal es de
 *   256 px con mucho margen transparente, y en las tarjetas de incursión el
 *   Pokémon salía diminuto al lado de su estrella shiny; huevos y misiones ya
 *   usaban el recortado.
 */
const HOME = /\/sprites\/pokemon\/other\/home\/(shiny\/)?(\d+)\.png$/
const LEEKDUCK = /^(https:\/\/cdn\.leekduck\.com\/assets\/img)\/pokemon_icons\/([^/]+\.png)$/

export function miniatura(url) {
  if (typeof url !== 'string') return null
  const home = HOME.exec(url)
  if (home) return `${import.meta.env.BASE_URL}sprites/${home[1] ?? ''}${home[2]}.webp`
  const leek = LEEKDUCK.exec(url)
  if (leek) return `${leek[1]}/pokemon_icons_crop/${leek[2]}`
  return null
}
