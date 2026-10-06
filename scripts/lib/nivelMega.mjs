/**
 * El nivel mega 4 (Super Max), del GAME_MASTER.
 *
 * Niantic lo va abriendo especie a especie, con una plantilla por especie:
 * MEGA_EVOLUTION_LEVEL_4_V0026_POKEMON_RAICHU, …_V0150_POKEMON_MEWTWO… Solo
 * las megas que pueden llegar a él usan su ataque «+», y es ahí donde pega
 * ×1,3 (ver SUPERMEGA_PLUS en src/utils/pve.js). pvpoke trae ya el «+» de
 * alguna que aún no lo tiene abierto (Beedrill, Houndoom, Staraptor), así
 * que el «+» de pvpoke no basta: manda esto.
 *
 * Devuelve los números de Pokédex con el nivel 4 abierto.
 */
export function especiesConNivelMega4(gm) {
  const dexes = new Set()
  for (const t of gm) {
    const m = /^MEGA_EVOLUTION_LEVEL_4_V(\d{4})_POKEMON_/.exec(t.templateId ?? '')
    if (m && t.data?.megaEvoLevelSettings?.level === 4) dexes.add(Number(m[1]))
  }
  return dexes
}
