import { describe, expect, it } from 'vitest'
import { pokemonEnTexto } from '../src/utils/pokemonEnTexto'

const roster = [
  { dex: 89, name: 'Muk', nameEs: 'Muk' },
  { dex: 89, name: 'Alolan Muk', nameEs: 'Muk de Alola' },
  { dex: 928, name: 'Smoliv', nameEs: 'Smoliv' },
  { dex: 840, name: 'Applin', nameEs: 'Applin' },
  { dex: 6, name: 'Charizard', nameEs: 'Charizard', mega: true },
  { dex: 6, name: 'Charizard', nameEs: 'Charizard' },
  { dex: 1, name: 'Bulbasaur', nameEs: 'Bulbasaur' }
]

describe('pokemonEnTexto', () => {
  it('saca los Pokémon nombrados en el orden del texto, sin repetir', () => {
    const texto = '¡Podríais encontrar a Smoliv*, Applin y Smoliv! Incluso a Charizard.'
    expect(pokemonEnTexto(texto, roster).map((e) => e.dex)).toEqual([928, 840, 6])
  })

  it('prefiere el nombre largo y no cuenta dentro de otras palabras', () => {
    const texto = 'Aparece Muk de Alola. Los Bulbasaurios no existen.'
    const res = pokemonEnTexto(texto, roster)
    expect(res).toHaveLength(1)
    expect(res[0].nameEs).toBe('Muk de Alola')
  })

  it('sin texto o sin roster, nada', () => {
    expect(pokemonEnTexto('', roster)).toEqual([])
    expect(pokemonEnTexto('Smoliv', [])).toEqual([])
  })
})
