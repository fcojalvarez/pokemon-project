import { describe, expect, it } from 'vitest'
import { conAsterisco, debutsEnNoticia, pokemonEnTexto } from '../src/utils/pokemonEnTexto'

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

describe('debutsEnNoticia', () => {
  const roster = [
    { dex: 946, name: 'Bramblin', nameEs: 'Bramblin', shinyReleased: false },
    { dex: 310, name: 'Manectric', nameEs: 'Manectric', shinyReleased: true },
    { dex: 77, name: 'Ponyta', nameEs: 'Ponyta', shinyReleased: true },
    { dex: 25, name: 'Pikachu', nameEs: 'Pikachu', shinyReleased: true },
    { dex: 999, name: 'Gimmighoul', nameEs: 'Gimmighoul', shinyReleased: false }
  ]
  const p = (x) => ({ t: 'p', x })
  const debuts = (noticia) => debutsEnNoticia(noticia, roster).map((entrada) => entrada.name)

  it('saca el debut del título y de la sección de debut', () => {
    const noticia = {
      titulo: '¡Maratón otoñal nos trae el debut de Bramblin en Pokémon GO!',
      secciones: [
        { titulo: 'Debut de Pokémon', bloques: [p('Os podréis encontrar a Bramblin.')] },
        { titulo: 'Encuentros salvajes', bloques: [p('Ponyta*, Gimmighoul y más.')] }
      ]
    }
    expect(debuts(noticia)).toEqual(['Bramblin'])
  })

  it('también de una frase suelta, en español o en inglés', () => {
    const frase = (x) => ({
      titulo: 'Evento',
      secciones: [{ titulo: 'Novedades', bloques: [p(x)] }]
    })
    expect(debuts(frase('Por primera vez en Pokémon GO, Gimmighoul. Y Ponyta.'))).toEqual([
      'Gimmighoul'
    ])
    expect(debuts(frase('Bramblin makes its Pokémon GO debut!'))).toEqual(['Bramblin'])
  })

  it('no cuenta debuts de otra cosa ni a quien ya tiene shiny', () => {
    const noticia = {
      titulo: 'Evento',
      secciones: [
        { titulo: 'Debut supermáximo', bloques: [p('Mega Manectric, por primera vez.')] },
        { titulo: 'Novedades', bloques: [p('Debut de Bramblin shiny.')] },
        { titulo: 'Novedades', bloques: [p('Pikachu con visera debuta en el evento.')] }
      ]
    }
    expect(debuts(noticia)).toEqual([])
    expect(debutsEnNoticia(null, roster)).toEqual([])
  })
})

describe('conAsterisco', () => {
  it('reconoce el asterisco de «puede salir shiny» pegado al nombre', () => {
    const ponyta = { name: 'Ponyta', nameEs: 'Ponyta' }
    const doduo = { name: 'Doduo', nameEs: 'Doduo' }
    expect(conAsterisco('Ponyta*, Doduo y más', ponyta)).toBe(true)
    expect(conAsterisco('Ponyta*, Doduo y más', doduo)).toBe(false)
    expect(conAsterisco('Rapidash Ponyta*', { name: 'Rapidash' })).toBe(false)
  })
})
