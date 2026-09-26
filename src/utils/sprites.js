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
