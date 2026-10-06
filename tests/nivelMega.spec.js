import { describe, expect, it } from 'vitest'
import { especiesConNivelMega4 } from '../scripts/lib/nivelMega.mjs'

/**
 * El nivel mega 4 (Super Max) se abre especie a especie en el GAME_MASTER.
 * Solo con él cuenta el ataque «+» en el Top.
 */
const nivel = (templateId, level) => ({
  templateId,
  data: { templateId, megaEvoLevelSettings: { level, pokemonId: 'X' } }
})

describe('nivel mega 4', () => {
  it('saca el número de Pokédex de cada especie con el nivel 4 abierto', () => {
    const gm = [
      nivel('MEGA_EVOLUTION_LEVEL_4_V0026_POKEMON_RAICHU', 4),
      nivel('MEGA_EVOLUTION_LEVEL_4_V0150_POKEMON_MEWTWO', 4),
      // Los niveles 0 a 3 (genéricos o por especie) no cuentan.
      nivel('MEGA_EVOLUTION_LEVEL_3_V0015_POKEMON_BEEDRILL', 3),
      nivel('MEGA_EVOLUTION_LEVEL_3', 3),
      { templateId: 'V0026_POKEMON_RAICHU', data: {} }
    ]
    expect([...especiesConNivelMega4(gm)].sort((a, b) => a - b)).toEqual([26, 150])
  })
})
