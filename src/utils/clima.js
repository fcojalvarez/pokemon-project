/**
 * Qué tipos potencia cada clima: sus ataques pegan un 20 % más (CLIMA en
 * pve.js). Es WEATHER_AFFINITY del GAME_MASTER; va aquí fijo, como el CPM, y
 * el pipeline (build-data) avisa si cambia. Las claves son las de
 * raids.weather en las traducciones.
 */
export const CLIMAS = {
  clear: ['fire', 'grass', 'ground'],
  rainy: ['water', 'electric', 'bug'],
  partlycloudy: ['normal', 'rock'],
  cloudy: ['fairy', 'fighting', 'poison'],
  windy: ['dragon', 'flying', 'psychic'],
  snow: ['ice', 'steel'],
  fog: ['dark', 'ghost']
}

/** El clima que potencia un tipo (cada tipo tiene uno y solo uno). */
export const climaDeTipo = (tipo) =>
  Object.keys(CLIMAS).find((clima) => CLIMAS[clima].includes(tipo)) ?? null
