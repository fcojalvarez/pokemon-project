import { describe, expect, it } from 'vitest'
import { enlaceSeguro } from '../src/utils/safeUrl'

describe('enlaces de fuera', () => {
  it('deja pasar los enlaces https tal cual', () => {
    const url = 'https://leekduck.com/events/phantump-catch-mastery/?a=1#b'
    expect(enlaceSeguro(url)).toBe(url)
  })

  it('no enlaza nada que pueda ejecutar código', () => {
    expect(enlaceSeguro('javascript:alert(1)')).toBeNull()
    expect(enlaceSeguro(' JavaScript:alert(1)')).toBeNull()
    expect(enlaceSeguro('java\tscript:alert(1)')).toBeNull()
    expect(enlaceSeguro('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('tampoco http, rutas relativas ni lo que no es texto', () => {
    expect(enlaceSeguro('http://leekduck.com/events/')).toBeNull()
    expect(enlaceSeguro('/events')).toBeNull()
    expect(enlaceSeguro('')).toBeNull()
    expect(enlaceSeguro(null)).toBeNull()
    expect(enlaceSeguro({ href: 'https://leekduck.com' })).toBeNull()
  })
})
