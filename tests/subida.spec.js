import { describe, expect, it } from 'vitest'
import { costeSubida } from '../src/utils/subida'

/** Lo que cuesta subir de nivel: las cifras que da el juego (y GO Hub). */
describe('costeSubida', () => {
  it('del 1 al 40, 270.000 de polvo y 304 caramelos', () => {
    expect(costeSubida(1, 40)).toEqual({ polvo: 270000, caramelos: 304, xl: 0 })
  })

  it('de incursión (20) a 40 y a 50', () => {
    expect(costeSubida(20, 40)).toEqual({ polvo: 225000, caramelos: 248, xl: 0 })
    expect(costeSubida(20, 50)).toEqual({ polvo: 475000, caramelos: 248, xl: 296 })
  })

  it('del 40 al 50 solo se paga en caramelos XL', () => {
    expect(costeSubida(40, 50)).toEqual({ polvo: 250000, caramelos: 0, xl: 296 })
  })

  it('con medios niveles: una subida es medio nivel', () => {
    expect(costeSubida(20, 20.5)).toEqual({ polvo: 2500, caramelos: 2, xl: 0 })
    expect(costeSubida(30, 30)).toEqual({ polvo: 0, caramelos: 0, xl: 0 })
  })

  it('oscuro, purificado y con suerte, redondeando cada subida hacia arriba', () => {
    // Un caramelo ×1,2 son dos: el redondeo es por subida, no del total.
    expect(costeSubida(1, 2, 'oscuro')).toEqual({ polvo: 480, caramelos: 4, xl: 0 })
    expect(costeSubida(20, 40, 'oscuro').polvo).toBe(270000)
    expect(costeSubida(20, 40, 'purificado').polvo).toBe(202500)
    expect(costeSubida(20, 40, 'suerte')).toEqual({ polvo: 112500, caramelos: 248, xl: 0 })
  })

  it('con la tabla propia de la especie (Eternatus)', () => {
    const propia = { caramelos: Array(39).fill(30), xl: Array(10).fill(100) }
    expect(costeSubida(39, 41, 'normal', propia)).toEqual({ polvo: 40000, caramelos: 60, xl: 200 })
  })
})
