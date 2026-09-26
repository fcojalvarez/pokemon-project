import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Mientras hay un panel modal abierto (menú, sugerencias), la app de detrás es
 * inerte: el tabulador no se escapa al fondo. Al abrir sugerencias desde el
 * menú, uno se cierra y el otro se abre casi a la vez; si el orden importara,
 * la app podría quedarse bloqueada o desbloqueada con un panel abierto.
 */
describe('useInertApp', () => {
  let useInertApp
  let app

  beforeEach(async () => {
    vi.resetModules()
    document.body.innerHTML = '<div id="app"></div>'
    app = document.getElementById('app')
    ;({ useInertApp } = await import('../src/composables/useInertApp'))
  })

  it('bloquea la app al abrir y la libera al cerrar', () => {
    const menu = useInertApp()
    menu.bloquear()
    expect(app.hasAttribute('inert')).toBe(true)
    menu.liberar()
    expect(app.hasAttribute('inert')).toBe(false)
  })

  it('con dos paneles, no libera hasta que se cierra el último, sea cual sea el orden', () => {
    const menu = useInertApp()
    const sugerencias = useInertApp()
    // Abrir sugerencias desde el menú: se abre una antes de cerrar el otro.
    menu.bloquear()
    sugerencias.bloquear()
    menu.liberar()
    expect(app.hasAttribute('inert')).toBe(true)
    sugerencias.liberar()
    expect(app.hasAttribute('inert')).toBe(false)
  })

  it('bloquear o liberar dos veces el mismo panel no descuadra la cuenta', () => {
    const menu = useInertApp()
    const sugerencias = useInertApp()
    menu.bloquear()
    menu.bloquear()
    sugerencias.bloquear()
    sugerencias.liberar()
    sugerencias.liberar()
    expect(app.hasAttribute('inert')).toBe(true)
    menu.liberar()
    expect(app.hasAttribute('inert')).toBe(false)
  })
})
