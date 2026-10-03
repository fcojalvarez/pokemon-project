import { describe, expect, it } from 'vitest'
import { iconoDeBonus, indiceEstrella } from '../src/utils/iconoBonus'

describe('iconoDeBonus', () => {
  it('reconoce cada tipo de bonus por su texto', () => {
    expect(iconoDeBonus('Más probabilidades de encontraros un Smoliv shiny.')).toBe('shiny')
    expect(iconoDeBonus('Un Caramelo ++ garantizado por intercambiar Pokémon')).toBe('candyXl')
    expect(iconoDeBonus('Un Caramelo adicional por intercambiar Pokémon.')).toBe('candy')
    expect(iconoDeBonus('Los Módulos Cebo Musgosos durarán una hora.')).toBe('lure')
    expect(iconoDeBonus('1/2 Hatch Distance')).toBe('egg')
    expect(iconoDeBonus('Más Polvo Estelar al derrotar a los Reclutas')).toBe('stardust')
    expect(iconoDeBonus('Abrid hasta 40 regalos al día.')).toBeNull()
  })
})

describe('indiceEstrella', () => {
  it('destaca el de shiny y, si no hay, el primero', () => {
    expect(indiceEstrella(['Cebo de una hora', 'Más Applin shiny'])).toBe(1)
    expect(indiceEstrella(['Cebo de una hora', 'Más polvo'])).toBe(0)
    expect(indiceEstrella([])).toBe(-1)
  })
})
