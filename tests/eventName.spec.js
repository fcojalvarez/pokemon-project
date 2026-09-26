import { describe, expect, it } from 'vitest'
import { parseEventName, splitPokemonList, translatePokemonName } from '../src/utils/eventName'

describe('parseEventName', () => {
  it('reconoce los patrones que publica LeekDuck', () => {
    expect(parseEventName('Rattata Spotlight Hour')).toMatchObject({
      key: 'spotlightHour',
      pokemon: 'Rattata'
    })
    expect(parseEventName('Mega Malamar in Mega Raids')).toMatchObject({
      key: 'megaRaids',
      pokemon: 'Mega Malamar'
    })
    expect(parseEventName('Dynamax Sobble during Max Monday')).toMatchObject({
      key: 'maxMonday',
      pokemon: 'Dynamax Sobble'
    })
    expect(parseEventName('Shadow Thundurus (Incarnate Forme) in Shadow Raids')).toMatchObject({
      key: 'shadowRaids',
      pokemon: 'Shadow Thundurus (Incarnate Forme)'
    })
  })

  it('saca el nivel de las incursiones de estrellas', () => {
    expect(parseEventName('Xurkitree in 5-star Raid Battles')).toMatchObject({
      key: 'starRaids',
      pokemon: 'Xurkitree',
      tier: '5'
    })
    expect(parseEventName('Altaria in 3-star Raid Battles')).toMatchObject({ tier: '3' })
  })

  /**
   * "Community Day Classic" tiene que ganarle a "Community Day": si se
   * comprobara al revés, el Clásico saldría como un Día de la Comunidad
   * normal llamado "Pikachu Classic".
   */
  it('distingue el Día de la Comunidad Clásico del normal', () => {
    expect(parseEventName('Charmander Community Day Classic')).toMatchObject({
      key: 'communityDayClassic',
      pokemon: 'Charmander'
    })
    expect(parseEventName('Charmander Community Day')).toMatchObject({
      key: 'communityDay'
    })
  })

  /**
   * Lo más importante: no tocar los eventos con nombre propio. Traducir
   * "LEGO Stores and Pokémon GO" sería peor que dejarlo en inglés.
   */
  it('deja en paz los eventos con nombre propio', () => {
    for (const nombre of [
      'LEGO Stores and Pokémon GO',
      'Pokémon GO Tour: Unova – Global',
      'Harvest Festival 2026',
      'Patterns of the Wild',
      'GO Pass: September',
      'Choose Your Path: Twilight Trails'
    ]) {
      expect(parseEventName(nombre), nombre).toBeNull()
    }
  })

  it('aguanta entradas vacías', () => {
    expect(parseEventName('')).toBeNull()
    expect(parseEventName(null)).toBeNull()
    expect(parseEventName(undefined)).toBeNull()
  })
})

describe('translatePokemonName', () => {
  const namesEs = new Map([
    ['Bulbasaur', 'Bulbasaur'],
    ['Charmander', 'Charmander'],
    ['Farfetch’d', 'Sirfetch’d']
  ])
  const forma = (form, pokemon) =>
    ({ mega: `Mega ${pokemon}`, shadow: `${pokemon} Oscuro`, dynamax: `${pokemon} Dinamax` })[form]

  it('traduce el nombre base', () => {
    expect(translatePokemonName('Farfetch’d', namesEs, forma)).toBe('Sirfetch’d')
  })

  it('mueve el prefijo de forma al español', () => {
    expect(translatePokemonName('Mega Charmander', namesEs, forma)).toBe('Mega Charmander')
    expect(translatePokemonName('Dynamax Bulbasaur', namesEs, forma)).toBe('Bulbasaur Dinamax')
  })

  it('deja el original cuando no conoce el nombre', () => {
    // Mejor el inglés que inventarse una traducción.
    expect(translatePokemonName('Xurkitree', namesEs, forma)).toBe('Xurkitree')
    expect(translatePokemonName('Mega Xurkitree', namesEs, forma)).toBe('Mega Xurkitree')
  })
})

describe('splitPokemonList', () => {
  it('separa los eventos con varios protagonistas', () => {
    expect(splitPokemonList('Xurkitree, Pheromosa, and Buzzwole')).toEqual([
      'Xurkitree',
      'Pheromosa',
      'Buzzwole'
    ])
    expect(splitPokemonList('Latias and Latios')).toEqual(['Latias', 'Latios'])
  })

  it('devuelve un solo nombre tal cual', () => {
    expect(splitPokemonList('Mega Malamar')).toEqual(['Mega Malamar'])
    expect(splitPokemonList('')).toEqual([])
  })
})
