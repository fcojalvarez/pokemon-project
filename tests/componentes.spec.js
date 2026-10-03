import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import i18n from '../src/plugins/i18n'
import BaseModal from '../src/components/base/BaseModal.vue'
import BaseFilterList from '../src/components/base/BaseFilterList.vue'
import MoveTag from '../src/components/pokemon/MoveTag.vue'
import MoveLegend from '../src/components/pokemon/MoveLegend.vue'
import FichaCostes from '../src/components/pokemon/ficha/FichaCostes.vue'
import FichaPc from '../src/components/pokemon/ficha/FichaPc.vue'
import FichaDebilidades from '../src/components/pokemon/ficha/FichaDebilidades.vue'

/**
 * Componentes pequeños que pintan lo mismo en varias pantallas. Las secciones
 * de la ficha se montan tal cual, con la sección abierta, y se lee su texto.
 */
const router = () =>
  createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { render: () => null } }, { path: '/otra', component: { render: () => null } }] })

const conPlugins = (extra = []) => ({ global: { plugins: [i18n, ...extra] } })

describe('BaseModal', () => {
  let r
  beforeEach(async () => {
    vi.spyOn(history, 'back').mockImplementation(() => {})
    document.body.innerHTML = '<div id="app"><button id="origen">abrir</button></div>'
    r = router()
    await r.push('/')
  })
  afterEach(() => vi.restoreAllMocks())

  const montar = (props) =>
    mount(BaseModal, { props: { title: 'Detalle', ...props }, slots: { default: '<p>dentro</p>' }, attachTo: document.getElementById('app'), ...conPlugins([r]) })

  it('abierto: diálogo con título, foco dentro y la app inerte', async () => {
    const w = montar({ open: false })
    document.getElementById('origen').focus()
    await w.setProps({ open: true })
    await nextTick()
    const dialogo = document.querySelector('[role="dialog"]')
    expect(dialogo.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(dialogo.getAttribute('aria-labelledby')).textContent).toBe('Detalle')
    expect(document.activeElement).toBe(dialogo)
    expect(document.getElementById('app').hasAttribute('inert')).toBe(true)
    w.unmount()
  })

  it('Escape, la ✕ y pulsar fuera piden cerrarlo', async () => {
    const w = montar({ open: true })
    await nextTick()
    const dialogo = document.querySelector('[role="dialog"]')
    dialogo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    document.querySelector('[role="dialog"] button').click()
    dialogo.parentElement.click()
    expect(w.emitted('close')).toHaveLength(3)
    w.unmount()
  })

  it('Escape también lo cierra si el foco se ha perdido en el body', async () => {
    // Pasa al pulsar un botón que desaparece (una forma de la galería).
    const w = montar({ open: true })
    await nextTick()
    document.activeElement.blur()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toHaveLength(1)
    // Con el foco en otro sitio de la página, no es cosa suya.
    document.getElementById('origen').focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })

  it('al cerrar devuelve el foco a quien lo abrió', async () => {
    const origen = document.getElementById('origen')
    origen.focus()
    const w = montar({ open: false })
    await w.setProps({ open: true })
    await nextTick()
    await w.setProps({ open: false })
    await nextTick()
    expect(document.activeElement).toBe(origen)
    expect(document.getElementById('app').hasAttribute('inert')).toBe(false)
    w.unmount()
  })

  it('cambiar de página lo cierra', async () => {
    const w = montar({ open: true })
    await nextTick()
    await r.push('/otra')
    await nextTick()
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })
})

describe('BaseFilterList', () => {
  const opciones = [
    { value: 'all', label: 'Todas', count: 7 },
    { value: 'nivel-5', label: 'Nivel 5', count: 3 }
  ]

  it('marca la elegida y dice cuántas hay en el nombre accesible', () => {
    const w = mount(BaseFilterList, { props: { modelValue: 'nivel-5', options: opciones } })
    const [todas, cinco] = w.findAll('button')
    expect(todas.attributes('aria-pressed')).toBe('false')
    expect(cinco.attributes('aria-pressed')).toBe('true')
    expect(cinco.attributes('aria-label')).toBe('Nivel 5 (3)')
    expect(cinco.text()).toContain('3')
  })

  it('al pulsar una, la emite', async () => {
    const w = mount(BaseFilterList, { props: { modelValue: 'all', options: opciones } })
    await w.findAll('button')[1].trigger('click')
    expect(w.emitted('update:modelValue')).toEqual([['nivel-5']])
  })
})

describe('MoveTag y MoveLegend', () => {
  it('manda la procedencia más restrictiva y la explica en el title', () => {
    const w = mount(MoveTag, { props: { name: 'Hidrocañón', chip: true, elite: true, legacy: true }, ...conPlugins() })
    expect(w.classes()).toContain('border-violet-600')
    expect(w.attributes('title')).toBe(i18n.global.t('moves.legacyHelp'))
    const mega = mount(MoveTag, { props: { name: 'Ascenso Draco', mega: true, legacy: true }, ...conPlugins() })
    expect(mega.classes()).toContain('border-fuchsia-600')
  })

  it('sin procedencia, píldora gris y sin title', () => {
    const w = mount(MoveTag, { props: { name: 'Placaje', chip: true }, ...conPlugins() })
    expect(w.classes()).toContain('border-gray-300')
    expect(w.attributes('title')).toBeUndefined()
  })

  it('la leyenda solo enseña lo que se le pasa, en orden élite, legacy, mega', () => {
    const w = mount(MoveLegend, { props: { mega: true, elite: true }, ...conPlugins() })
    expect(w.findAll('li').map((li) => li.text())).toEqual([i18n.global.t('moves.elite'), i18n.global.t('moves.mega')])
    const vacia = mount(MoveLegend, conPlugins())
    expect(vacia.find('ul').exists()).toBe(false)
  })
})

describe('secciones de la ficha', () => {
  // Abiertas: en escritorio van siempre abiertas (useFichaSecciones).
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  })
  afterEach(() => { delete window.matchMedia })

  it('costes: caramelos y polvo con separador de miles, megaenergía y km', () => {
    const w = mount(FichaCostes, {
      props: {
        flags: ['canBeShadow'],
        costs: [
          { key: 'secondCharged', candy: 25, dust: 10000 },
          { key: 'megaFirst', energy: 200 },
          { key: 'buddyCandy', km: 3 }
        ]
      },
      ...conPlugins()
    })
    const texto = w.text()
    // Cifras con su icono; la palabra («caramelos», «polvo») va para el lector de pantalla.
    expect(w.find('li img').exists()).toBe(true)
    expect(texto).toMatch(/25\s*caramelos/)
    expect(texto).toContain('10.000')
    expect(texto).toContain('200')
    expect(texto).toContain('3 km')
    expect(texto).toContain(i18n.global.t('pokemon.flags.canBeShadow'))
    expect(w.find('h2').text()).toContain(i18n.global.t('pokemon.statusAndCosts'))
  })

  it('PC: incursión con y sin clima, y el huevo marca el combate Max si puede dinamaxizar', () => {
    const cpTable = [15, 20, 25, 30, 35, 40, 50].map((level) => ({ level, cp: level * 100 }))
    const w = mount(FichaPc, { props: { cpTable, esMax: true }, ...conPlugins() })
    const [atrapar, subir] = w.findAll('ul')
    // Una pastilla por cifra: incursión, incursión con clima, huevo y misión.
    const pastillas = atrapar.findAll('li')
    expect(pastillas).toHaveLength(4)
    expect(pastillas[0].text()).toContain('2000')
    expect(pastillas[1].text()).toContain('2500')
    expect(pastillas[1].attributes('title')).toContain(i18n.global.t('pokemon.cpWeather').toLowerCase())
    expect(pastillas[2].text()).toContain(i18n.global.t('pokemon.cpFromEggMax'))
    expect(pastillas[3].text()).toContain('1500')
    expect(subir.findAll('strong').map((n) => n.text())).toEqual(['4000', '5000'])
  })

  it('debilidades por intensidad y resistencias, con su multiplicador', () => {
    const w = mount(FichaDebilidades, {
      props: {
        matchups: {
          weak: [
            { type: 'rock', mult: 2.56 },
            { type: 'water', mult: 1.6 }
          ],
          resist: [{ type: 'grass', mult: 0.39 }]
        }
      },
      ...conPlugins()
    })
    // Un rótulo por nivel, de más a menos daño, y al final las resistencias.
    const t = i18n.global.t
    expect(w.findAll('h3').map((h) => h.text())).toEqual([
      `${t('pokemon.weakDouble')} ×2.56`,
      `${t('pokemon.weakSingle')} ×1.60`,
      t('pokemon.resistances')
    ])
    expect(w.text()).toContain('×0.39')
  })
})

describe('router', () => {
  it('las rutas en español redirigen a las nuevas conservando la query', async () => {
    const { default: r } = await import('../src/router/index.js')
    await r.push('/ahora?tab=eggs')
    expect(r.currentRoute.value.fullPath).toBe('/live?tab=eggs')
    await r.push('/eventos')
    expect(r.currentRoute.value.path).toBe('/events')
    await r.push('/no-existe')
    expect(r.currentRoute.value.name).toBe('NotFound')
  })

  it('al volver recupera el scroll; con solo otra query, no se mueve', async () => {
    const { default: r } = await import('../src/router/index.js')
    const scroll = r.options.scrollBehavior
    expect(scroll({ path: '/top' }, { path: '/' }, { top: 500 })).toEqual({ top: 500 })
    expect(scroll({ path: '/pokemon/6' }, { path: '/pokemon/6' }, null)).toBe(false)
    expect(scroll({ path: '/top' }, { path: '/' }, null)).toEqual({ top: 0 })
  })
})

describe('BaseSegmented y la casilla de BasePillButton', async () => {
  const { default: BaseSegmented } = await import('../src/components/base/BaseSegmented.vue')
  const { default: BasePillButton } = await import('../src/components/base/BasePillButton.vue')

  it('el selector marca la parte elegida y emite la que se pulsa', async () => {
    const opciones = [{ value: 'raids', label: 'Incursiones' }, { value: 'eggs', label: 'Huevos' }]
    const w = mount(BaseSegmented, { props: { modelValue: 'raids', options: opciones } })
    const [a, b] = w.findAll('button')
    expect(a.attributes('aria-pressed')).toBe('true')
    expect(b.attributes('aria-pressed')).toBe('false')
    await b.trigger('click')
    expect(w.emitted('update:modelValue')).toEqual([['eggs']])
  })

  it('la casilla lleva ✓ solo encendida, y el nombre accesible no cambia', () => {
    const on = mount(BasePillButton, { props: { casilla: true, active: true }, slots: { default: 'Élite' } })
    const off = mount(BasePillButton, { props: { casilla: true, active: false }, slots: { default: 'Élite' } })
    expect(on.text()).toBe('✓Élite')
    expect(on.find('[aria-hidden="true"]').text()).toBe('✓')
    expect(off.text()).toBe('Élite')
    expect(off.classes()).toContain('border-dashed')
  })
})
