import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import i18n from '../src/plugins/i18n'
import BaseDropdown from '../src/components/base/BaseDropdown.vue'

/**
 * El desplegable con buscador (el tipo del Top): se escribe para localizar la
 * opción, sin tildes ni mayúsculas, y se elige con el teclado.
 */
const TIPOS = [
  { value: 'all', label: 'Todos' },
  { value: 'fire', label: 'Fuego' },
  { value: 'electric', label: 'Eléctrico' },
  { value: 'water', label: 'Agua' }
]
const montar = (props = {}) =>
  mount(BaseDropdown, {
    props: { label: 'Tipo', options: TIPOS, modelValue: 'all', buscable: true, ...props },
    global: { plugins: [i18n] },
    attachTo: document.body
  })

describe('desplegable con buscador', () => {
  it('al abrir enseña el campo y filtra sin tildes ni mayúsculas', async () => {
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    const campo = w.get('input[role="searchbox"]')
    expect(document.activeElement).toBe(campo.element)
    await campo.setValue('ELEC')
    expect(w.findAll('[role="option"]').map((o) => o.text())).toEqual(['Eléctrico'])
    w.unmount()
  })

  it('Enter elige la primera que queda y devuelve el foco al botón', async () => {
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    await w.get('input').setValue('ag')
    await w.get('input').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:modelValue')).toEqual([['water']])
    expect(w.find('[role="listbox"]').exists()).toBe(false)
    expect(document.activeElement).toBe(w.get('button').element)
    w.unmount()
  })

  it('en el campo, el espacio se escribe y no elige', async () => {
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    await w.get('input').trigger('keydown', { key: ' ' })
    expect(w.emitted('update:modelValue')).toBeUndefined()
    w.unmount()
  })

  it('escribir con el desplegable cerrado lo abre con esa letra', async () => {
    const w = montar()
    await w.get('button').trigger('keydown', { key: 'f' })
    await flushPromises()
    expect(w.get('input').element.value).toBe('f')
    expect(w.findAll('[role="option"]').map((o) => o.text())).toEqual(['Fuego'])
    w.unmount()
  })

  it('sin resultados lo dice, y sin `buscable` no hay campo', async () => {
    const w = montar()
    await w.get('button').trigger('click')
    await flushPromises()
    await w.get('input').setValue('zzz')
    expect(w.findAll('[role="option"]')).toHaveLength(0)
    expect(w.get('[role="listbox"]').text()).not.toBe('')
    w.unmount()

    const normal = montar({ buscable: false })
    await normal.get('button').trigger('click')
    expect(normal.find('input').exists()).toBe(false)
    expect(normal.findAll('[role="option"]')).toHaveLength(4)
    normal.unmount()
  })
})
