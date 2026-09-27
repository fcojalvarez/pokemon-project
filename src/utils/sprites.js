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
 * La miniatura WebP propia de un sprite de PokeAPI (ver scripts/build-sprites.mjs):
 * 256 px y unos 12 KB en vez de un PNG de 512 px y 80-200 KB. Para cualquier
 * otra imagen, null.
 */
const HOME = /\/sprites\/pokemon\/other\/home\/(shiny\/)?(\d+)\.png$/

export function miniatura(url) {
  const m = typeof url === 'string' ? HOME.exec(url) : null
  return m ? `${import.meta.env.BASE_URL}sprites/${m[1] ?? ''}${m[2]}.webp` : null
}
