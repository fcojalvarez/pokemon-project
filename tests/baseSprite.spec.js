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
const montar = () => mount(BaseSprite, { props: { src: 'https://ejemplo.test/6.png', imgClass: 'grayscale' } })

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

  it('si ya estaba en la caché, sale directamente, sin destello', async () => {
    imagen({ complete: true, naturalWidth: 96 })
    const w = montar()
    await flushPromises()
    expect(w.find('.esqueleto').exists()).toBe(false)
    expect(w.get('img').classes()).not.toContain('sprite-brilla')
    expect(w.get('img').attributes('style') ?? '').not.toContain('opacity: 0')
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

  it('al cambiar de imagen (ver shiny) vuelve a enseñar el hueco hasta que llega', async () => {
    imagen({ complete: false })
    const w = montar()
    await w.get('img').trigger('load')
    await w.setProps({ src: 'https://ejemplo.test/shiny/6.png' })
    expect(w.find('.esqueleto').exists()).toBe(true)
  })
})
