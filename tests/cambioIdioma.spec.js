import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import i18n, { cargarIdioma } from '../src/plugins/i18n'
import { intlLocale, localName } from '../src/composables/useTranslate'
import { useGameDataStore } from '../src/stores/gameData'
import AttackerTable from '../src/components/rankings/AttackerTable.vue'

// La store importa el cliente de Supabase, que sin credenciales revienta al cargar.
vi.mock('../src/lib/supabaseClient', () => ({ supabase: {} }))

/**
 * El idioma se puede cambiar en caliente desde el menú: lo que depende de él
 * tiene que leerlo en cada llamada, no quedarse con el del arranque.
 */
// El inglés se descarga al elegirlo: aquí se deja cargado de antemano.
beforeAll(() => cargarIdioma('en'))

afterEach(() => {
  i18n.global.locale = 'es'
})

describe('nombres de los datos de juego', () => {
  it('localName elige el del idioma y, si falta, tira del otro', () => {
    const entrada = { name: 'Charizard (Mega X)', nameEs: 'Mega Charizard X' }
    expect(localName(entrada)).toBe('Mega Charizard X')
    i18n.global.locale = 'en'
    expect(localName(entrada)).toBe('Charizard (Mega X)')
    expect(localName({ nameEs: 'Llamarada' })).toBe('Llamarada')
    expect(intlLocale()).toBe('en-GB')
  })
})

describe('store de datos de juego según el idioma', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useGameDataStore()
    store.roster = [{ id: 'machop', dex: 66, name: 'Machop', nameEs: 'Machop' }, { id: 'farfetchd', dex: 83, name: 'Farfetch’d', nameEs: 'Farfetch’d' }]
    store.typeChart = { order: ['fire'], es: { fire: 'Fuego' }, chart: {} }
    store.texts = { 'trade pokmon': 'Intercambia Pokémon' }
  })

  it('nombreEs rehace la forma en español y deja el inglés en inglés', () => {
    expect(store.nombreEs('Shadow Machop')).toBe('Machop Oscuro')
    i18n.global.locale = 'en'
    expect(store.nombreEs('Shadow Machop')).toBe('Shadow Machop')
    expect(store.nombreEs('Machop')).toBe('Machop')
  })

  it('translateText no traduce nada con la app en inglés', () => {
    expect(store.translateText('Trade Pokémon')).toBe('Intercambia Pokémon')
    i18n.global.locale = 'en'
    expect(store.translateText('Trade Pokémon')).toBe('Trade Pokémon')
  })
})

describe('tabla del Top al cambiar de idioma', () => {
  it('repinta nombres de Pokémon y de ataques sin volver a montar', async () => {
    const movimiento = (name, nameEs) => ({ id: name.toUpperCase(), name, nameEs, type: 'fire' })
    const w = mount(AttackerTable, {
      props: {
        mode: 'pve',
        sortBy: 'dps',
        rows: [{
          id: 'charizard_mega_x', rank: 1, dex: 6, spriteId: 6, name: 'Charizard (Mega X)', nameEs: 'Mega Charizard X',
          types: ['fire'], fast: movimiento('Ember', 'Ascuas'), charged: movimiento('Fire Blast', 'Llamarada'), dps: 20, tdo: 900, edps: 60
        }]
      },
      global: { plugins: [i18n], stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
    })
    expect(w.get('tbody').text()).toContain('Mega Charizard X')
    expect(w.get('tbody').text()).toContain('Llamarada')

    i18n.global.locale = 'en'
    await nextTick()
    expect(w.get('tbody').text()).toContain('Charizard (Mega X)')
    expect(w.get('tbody').text()).toContain('Fire Blast')
    expect(w.get('thead').text()).toContain('Moves')
  })
})
