import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { useImagenTolerante } from '../src/composables/useImagenTolerante'

describe('useImagenTolerante', () => {
  it('con CORS, luego sin CORS, luego el respaldo y luego nada', () => {
    const img = useImagenTolerante('https://cdn/a.png', '/sprites/1.webp')
    expect(img.url.value).toBe('https://cdn/a.png')
    expect(img.crossorigin.value).toBe('anonymous')
    img.alFallar()
    expect(img.url.value).toBe('https://cdn/a.png')
    expect(img.crossorigin.value).toBeUndefined()
    img.alFallar()
    expect(img.url.value).toBe('/sprites/1.webp')
    expect(img.crossorigin.value).toBe('anonymous')
    img.alFallar()
    expect(img.url.value).toBeNull()
  })

  it('sin respaldo, del segundo fallo pasa a no enseñarla', () => {
    const img = useImagenTolerante('https://cdn/a.png')
    img.alFallar()
    img.alFallar()
    expect(img.url.value).toBeNull()
  })

  it('no cuenta el fallo de un <img> que ya no está en la página', () => {
    const img = useImagenTolerante('https://cdn/a.png', '/sprites/1.webp')
    img.alFallar({ target: { isConnected: true } })
    img.alFallar({ target: { isConnected: false } })
    expect(img.url.value).toBe('https://cdn/a.png')
    expect(img.crossorigin.value).toBeUndefined()
  })

  it('una imagen nueva vuelve a empezar', async () => {
    const src = ref('https://cdn/a.png')
    const img = useImagenTolerante(src, null)
    img.alFallar()
    img.alFallar()
    src.value = 'https://cdn/b.png'
    await nextTick()
    expect(img.url.value).toBe('https://cdn/b.png')
    expect(img.crossorigin.value).toBe('anonymous')
  })
})
