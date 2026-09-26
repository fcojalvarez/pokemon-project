import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import i18n from '../src/plugins/i18n'

/**
 * Las secciones plegables de la ficha. Lo que se promete:
 *   - en móvil empiezan cerradas y enseñan su resumen;
 *   - lo que alguien pliega o despliega se recuerda, y vale para todas las
 *     fichas (si no juega PvP, no tiene que volver a plegarlo en cada una);
 *   - en escritorio van siempre abiertas y no hay botón.
 *
 * El estado vive en el módulo, así que cada test lo importa de cero.
 */
const conAncho = (escritorio) => {
  window.matchMedia = vi.fn().mockImplementation((consulta) => ({
    matches: escritorio && consulta.includes('min-width: 1024px'),
    addEventListener: vi.fn()
  }))
}

const cargar = async () => {
  vi.resetModules()
  const { useFichaSecciones } = await import('../src/composables/useFichaSecciones')
  const { default: FichaSeccion } = await import('../src/components/pokemon/FichaSeccion.vue')
  return { useFichaSecciones, FichaSeccion }
}

const montar = (FichaSeccion, props = {}) =>
  mount(FichaSeccion, {
    props: { id: 'pvp', title: 'Puesto PvP', summary: 'Hiper #103 · Master #182', ...props },
    slots: { default: '<p class="contenido">Tabla de rankings</p>' },
    global: { plugins: [i18n] }
  })

describe('secciones plegables de la ficha', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => { delete window.matchMedia })

  it('en móvil empieza cerrada, con su resumen y sin el contenido', async () => {
    conAncho(false)
    const { FichaSeccion } = await cargar()
    const w = montar(FichaSeccion)
    const boton = w.get('button')
    expect(boton.attributes('aria-expanded')).toBe('false')
    expect(w.text()).toContain('Hiper #103 · Master #182')
    expect(w.get('.contenido').isVisible()).toBe(false)
  })

  it('al abrirla enseña el contenido, quita el resumen y lo guarda', async () => {
    conAncho(false)
    const { FichaSeccion } = await cargar()
    const w = montar(FichaSeccion)
    await w.get('button').trigger('click')
    expect(w.get('button').attributes('aria-expanded')).toBe('true')
    expect(w.get('.contenido').isVisible()).toBe(true)
    expect(w.text()).not.toContain('Hiper #103')
    expect(JSON.parse(localStorage.getItem('pogodex:ficha-secciones'))).toEqual({ pvp: true })
  })

  it('el estado es el mismo para todas las fichas', async () => {
    conAncho(false)
    const { FichaSeccion } = await cargar()
    await montar(FichaSeccion).get('button').trigger('click')
    // Otra ficha: otra instancia del componente, la misma sección.
    const otra = montar(FichaSeccion, { summary: 'Fuera del top 400' })
    expect(otra.get('button').attributes('aria-expanded')).toBe('true')
  })

  it('recuerda lo guardado de una visita anterior', async () => {
    conAncho(false)
    localStorage.setItem('pogodex:ficha-secciones', JSON.stringify({ pvp: true }))
    const { useFichaSecciones } = await cargar()
    expect(useFichaSecciones().estaAbierta('pvp')).toBe(true)
    expect(useFichaSecciones().estaAbierta('debilidades')).toBe(false)
  })

  it('en escritorio va siempre abierta y sin botón', async () => {
    conAncho(true)
    const { FichaSeccion } = await cargar()
    const w = montar(FichaSeccion)
    expect(w.find('button').exists()).toBe(false)
    expect(w.get('h2').text()).toContain('Puesto PvP')
    expect(w.get('.contenido').isVisible()).toBe(true)
  })

  it('si el navegador no deja guardar, sigue funcionando durante la visita', async () => {
    conAncho(false)
    const guardar = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('modo privado') })
    const { FichaSeccion } = await cargar()
    const w = montar(FichaSeccion)
    await w.get('button').trigger('click')
    expect(w.get('button').attributes('aria-expanded')).toBe('true')
    guardar.mockRestore()
  })
})
