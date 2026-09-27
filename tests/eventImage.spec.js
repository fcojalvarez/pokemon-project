import { describe, expect, it } from 'vitest'
import { eventImageSrc, eventImageSrcset } from '../src/utils/eventImage'

const CARTEL =
  'https://cdn.leekduck.com/assets/img/events/article-images/2026/2026-09-26-catch-mastery-phantump-2026/phantump-catch-mastery.jpg?v2'

describe('carteles de evento', () => {
  it('pide al CDN de LeekDuck el cartel redimensionado, conservando la ruta y la query', () => {
    expect(eventImageSrc(CARTEL)).toBe(
      'https://cdn.leekduck.com/cdn-cgi/image/width=800,format=auto/assets/img/events/article-images/2026/2026-09-26-catch-mastery-phantump-2026/phantump-catch-mastery.jpg?v2'
    )
  })

  it('ofrece varios anchos para que el navegador elija', () => {
    const srcset = eventImageSrcset(CARTEL)
    expect(srcset.split(', ').map((uno) => uno.split(' ')[1])).toEqual(['480w', '800w', '1200w'])
  })

  it('deja tal cual las imágenes de otros sitios, que el CDN no redimensiona', () => {
    const otra = 'https://example.com/cartel.jpg'
    expect(eventImageSrc(otra)).toBe(otra)
    expect(eventImageSrcset(otra)).toBeNull()
    expect(eventImageSrc(null)).toBeNull()
    expect(eventImageSrcset(undefined)).toBeNull()
  })
})
