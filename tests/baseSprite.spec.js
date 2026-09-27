import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import BaseSprite from '../src/components/base/BaseSprite.vue'

/**
 * El sprite con esqueleto: hueco gris mientras la imagen no llega, destello al
 * llegar, y nada de destello si ya estaba en caché o si se pide menos
 * movimiento. jsdom no descarga imágenes, así que se simula el estado de
 * carga del <img> a mano.
 */
const imagen = ({ complete, naturalWidth = 0 }) => {
  Object.defineProperty(HTMLImageElement.prototype, 'complete', { configurable: true, get: () => complete })
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', { configurable: true, get: () => naturalWidth })
}
const movimiento = (reducido) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reducido, addEventListener: vi.fn() })
}
const montar = (props = {}) =>
  mount(BaseSprite, { props: { src: 'https://ejemplo.test/6.png', imgClass: 'grayscale', entrada: 'salida', ...props } })

describe('BaseSprite', () => {
  beforeEach(() => movimiento(false))
  afterEach(() => {
    delete HTMLImageElement.prototype.complete
    delete HTMLImageElement.prototype.naturalWidth
    delete window.matchMedia
  })

  it('mientras carga enseña el hueco y la imagen está oculta', () => {
    imagen({ complete: false })
    const w = montar()
    expect(w.find('.esqueleto').exists()).toBe(true)
    expect(w.get('img').attributes('style')).toContain('opacity: 0')
    // Las clases de la imagen llegan a la imagen, no al contenedor.
    expect(w.get('img').classes()).toContain('grayscale')
  })

  it('al llegar la imagen quita el hueco y la saca con el destello, que se va al acabar', async () => {
    imagen({ complete: false })
    const w = montar()
    await w.get('img').trigger('load')
    expect(w.find('.esqueleto').exists()).toBe(false)
    expect(w.get('img').classes()).toContain('sprite-brilla')
    await w.get('img').trigger('animationend')
    expect(w.get('img').classes()).not.toContain('sprite-brilla')
  })

  it('aunque ya estuviera en la caché, sale con su animación', async () => {
    imagen({ complete: true, naturalWidth: 96 })
    const w = montar()
    await flushPromises()
    expect(w.find('.esqueleto').exists()).toBe(false)
    expect(w.get('img').classes()).toContain('sprite-brilla')
    expect(w.get('img').attributes('style') ?? '').not.toContain('opacity: 0')
  })

  it('en la caché y con movimiento reducido, sale directamente', async () => {
    movimiento(true)
    imagen({ complete: true, naturalWidth: 96 })
    const w = montar()
    await flushPromises()
    expect(w.get('img').classes()).not.toContain('sprite-brilla')
  })

  it('fuera de la Pokédex, un fundido corto en vez de la salida', async () => {
    imagen({ complete: false })
    const w = montar({ entrada: 'suave' })
    await w.get('img').trigger('load')
    expect(w.get('img').classes()).toContain('sprite-suave')
    expect(w.get('img').classes()).not.toContain('sprite-brilla')
  })

  it('con movimiento reducido no hay destello', async () => {
    movimiento(true)
    imagen({ complete: false })
    const w = montar()
    await w.get('img').trigger('load')
    expect(w.get('img').classes()).not.toContain('sprite-brilla')
    expect(w.find('.esqueleto').exists()).toBe(false)
  })

  it('si la imagen falla, no se queda el hueco pulsando para siempre', async () => {
    imagen({ complete: false })
    const w = montar()
    await w.get('img').trigger('error')
    expect(w.find('.esqueleto').exists()).toBe(false)
  })

  it('los sprites de PokeAPI salen de la miniatura WebP propia, y si falta, del PNG', async () => {
    imagen({ complete: false })
    const png = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/6.png'
    const w = montar({ src: png })
    expect(w.get('img').attributes('src')).toBe('/sprites/shiny/6.webp')
    await w.get('img').trigger('error')
    expect(w.get('img').attributes('src')).toBe(png)
    // Y si también falla el PNG, se da por rota: no se queda probando.
    await w.get('img').trigger('error')
    expect(w.find('.esqueleto').exists()).toBe(false)
  })

  it('cualquier otra imagen se pide tal cual', () => {
    imagen({ complete: false })
    expect(montar().get('img').attributes('src')).toBe('https://ejemplo.test/6.png')
  })

  it('al cambiar de imagen (ver shiny) vuelve a enseñar el hueco hasta que llega', async () => {
    imagen({ complete: false })
    const w = montar()
    await w.get('img').trigger('load')
    await w.setProps({ src: 'https://ejemplo.test/shiny/6.png' })
    expect(w.find('.esqueleto').exists()).toBe(true)
  })
})
