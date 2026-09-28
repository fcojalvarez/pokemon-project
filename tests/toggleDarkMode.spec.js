import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import i18n from '../src/plugins/i18n'
import ToggleDarkMode from '../src/components/ToggleDarkMode.vue'

/**
 * El modo oscuro:
 *   - la primera vez sigue al sistema, pero sin guardarlo (si el móvil cambia
 *     de tema, la app lo sigue hasta que alguien elija);
 *   - lo que elige el usuario sí se guarda y manda sobre el sistema;
 *   - es un botón de verdad, con aria-pressed y nombre fijo.
 */
const sistema = (oscuro) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: oscuro, addEventListener: vi.fn() })
}
const montar = (props = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(ToggleDarkMode, { props, global: { plugins: [pinia, i18n] } })
}

describe('botón de modo oscuro', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })
  afterEach(() => { delete window.matchMedia })

  it('sin preferencia guardada sigue al sistema y no la guarda', () => {
    sistema(true)
    const w = montar()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(w.get('button').attributes('aria-pressed')).toBe('true')
    expect(localStorage.getItem('isDarkMode')).toBeNull()
  })

  it('lo guardado manda sobre el sistema', () => {
    sistema(true)
    localStorage.setItem('isDarkMode', 'false')
    montar()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('al pulsarlo cambia el tema y lo guarda', async () => {
    sistema(false)
    const w = montar()
    await w.get('button').trigger('click')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('isDarkMode')).toBe('true')
    expect(w.get('button').attributes('aria-pressed')).toBe('true')
  })

  it('tiene nombre fijo y el estado va en aria-pressed', () => {
    sistema(false)
    const w = montar()
    expect(w.get('button').attributes('aria-label')).toBe('Modo oscuro')
    expect(w.get('button').attributes('aria-pressed')).toBe('false')
  })

  it('las clases y atributos de la cabecera llegan al botón', () => {
    sistema(false)
    // La cabecera lo saca del tabulador (inert) cuando el buscador lo tapa.
    const pinia = createPinia()
    const w = mount(ToggleDarkMode, { attrs: { class: 'ml-auto', inert: true }, global: { plugins: [pinia, i18n] } })
    expect(w.get('button').classes()).toContain('ml-auto')
    expect(w.get('button').attributes('inert')).toBeDefined()
  })
})
