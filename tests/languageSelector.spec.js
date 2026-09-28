import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import i18n, { cargarIdioma, setLocale } from '../src/plugins/i18n'
import LanguageSelector from '../src/components/shared/LanguageSelector.vue'

/**
 * El selector de idioma del menú:
 *   - el botón enseña solo la bandera y dice en su nombre qué idioma hay;
 *   - al elegir otro, cambia la app entera, el lang del documento y se guarda;
 *   - Escape cierra la lista sin que el evento llegue al cajón del menú.
 */
const montar = () => mount(LanguageSelector, { global: { plugins: [i18n] }, attachTo: document.body })

describe('selector de idioma', () => {
  afterEach(async () => {
    await setLocale('es')
    localStorage.clear()
    document.body.innerHTML = ''
  })

  it('el botón solo lleva la bandera y el idioma actual en su nombre', () => {
    const w = montar()
    const boton = w.get('button[aria-haspopup="menu"]')
    expect(boton.text()).toBe('')
    expect(boton.attributes('aria-label')).toContain('Español')
    expect(boton.attributes('aria-expanded')).toBe('false')
  })

  it('al abrir marca el idioma actual y al elegir otro cambia la app', async () => {
    const w = montar()
    await w.get('button[aria-haspopup="menu"]').trigger('click')
    const opciones = w.findAll('[role="menuitemradio"]')
    expect(opciones.map((o) => o.text())).toEqual(['Español', 'English'])
    expect(opciones[0].attributes('aria-checked')).toBe('true')

    // La descarga del inglés se prueba en locales.spec.js; aquí ya está.
    await cargarIdioma('en')
    await opciones[1].trigger('click')
    await flushPromises()
    expect(i18n.global.locale).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('locale')).toBe('en')
    expect(w.get('button[aria-haspopup="menu"]').attributes('aria-expanded')).toBe('false')
    expect(w.get('button[aria-haspopup="menu"]').attributes('aria-label')).toContain('English')
  })

  it('Escape cierra la lista y no llega al menú', async () => {
    const w = montar()
    let llegoFuera = false
    document.body.addEventListener('keydown', () => { llegoFuera = true }, { once: true })
    await w.get('button[aria-haspopup="menu"]').trigger('click')
    await w.get('[role="menuitemradio"]').trigger('keydown', { key: 'Escape' })
    expect(w.get('button[aria-haspopup="menu"]').attributes('aria-expanded')).toBe('false')
    expect(llegoFuera).toBe(false)
  })

  it('ignora idiomas que no hay', () => {
    setLocale('fr')
    expect(i18n.global.locale).toBe('es')
  })
})
