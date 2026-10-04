import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import i18n from '../src/plugins/i18n'

/**
 * La línea evolutiva montada de verdad. Lo que se comprueba es la regla que se
 * acordó al diseñarla:
 *   - cada Pokémon sale una sola vez (Eevee salía ocho);
 *   - cuando de uno salen varias formas, van juntas en un grupo con su título,
 *     con una sola flecha de entrada y sin flechas entre ellas;
 *   - lo que piden todas va en la flecha; lo propio de cada una, debajo de ella.
 */

// Las megas salen del catálogo de formas del juego: se simula con lo justo.
const formas = new Map()
vi.mock('../src/stores/gameData', () => ({
  useGameDataStore: () => ({
    isReady: true,
    formsByDex: formas,
    // Como en la store: cada forma por su id.
    get byId() {
      return new Map([...formas.values()].flat().map((forma) => [forma.id, forma]))
    },
    // Como en la store: la forma base de la especie y, si se puede, su info Max.
    fichaBase: (dex) => (formas.get(dex) ?? []).find((forma) => !forma.mega) ?? null,
    maxInfoFor: (entry) =>
      entry?.dynamax || entry?.gigantamax ? { gigantamax: Boolean(entry.gigantamax) } : null
  })
}))

const { default: EvolutionChain } = await import('../src/components/pokemon/EvolutionChain.vue')

const sprites = (id) => ({ male: `https://sprites.test/${id}.png`, male_shiny: `https://sprites.test/shiny/${id}.png` })
const paso = (pokemon_id, name, types, extra = {}) => ({ pokemon_id, name, types, sprites: sprites(pokemon_id), is_shiny_released: true, ...extra })
const mega = (id, dex, nameEs, types, energia = 200) => ({ id, dex, nameEs, types, spriteId: `${id}`, mega: true, released: true, megaEnergy: { first: energia } })

const montar = (pokemon, props = {}) =>
  mount(EvolutionChain, {
    props: { pokemon, ...props },
    global: {
      plugins: [i18n],
      stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }
    }
  })

const nombres = (w) => w.findAll('span.font-semibold').map((s) => s.text())

describe('línea evolutiva', () => {
  it('Eevee sale una vez y sus ocho evoluciones van en un grupo', () => {
    formas.clear()
    const rama = (destino, nombre, tipos, extra = {}) =>
      [paso(133, 'Eevee', ['normal'], { candy_required: 25, ...extra }), paso(destino, nombre, tipos)]
    const eevee = {
      ...paso(133, 'Eevee', ['normal']),
      evolution_info: {
        primary: rama(134, 'Vaporeon', ['water']),
        secondary: rama(135, 'Jolteon', ['electric']),
        tertiary: rama(136, 'Flareon', ['fire']),
        quaternary: rama(196, 'Espeon', ['psychic'], { buddy_distance_required: 10, only_evolves_in_daytime: true }),
        quinary: rama(197, 'Umbreon', ['dark'], { buddy_distance_required: 10, only_evolves_in_nighttime: true }),
        senary: rama(470, 'Leafeon', ['grass'], { lure_required: 'mossyLureModule' }),
        septenary: rama(471, 'Glaceon', ['ice'], { lure_required: 'glacialLureModule' }),
        octonary: rama(700, 'Sylveon', ['fairy'])
      }
    }
    const w = montar(eevee)

    expect(nombres(w).filter((n) => n.includes('Eevee'))).toEqual(['#133 Eevee'])
    const grupo = w.get('[role="group"]')
    expect(grupo.attributes('aria-label')).toBe('8 evoluciones')
    expect(grupo.findAll('a').map((a) => a.attributes('href'))).toEqual(
      [134, 135, 136, 196, 197, 470, 471, 700].map((id) => `/pokemon/${id}`)
    )
    // Dentro del grupo no hay flechas: ninguna sale de otra.
    expect(grupo.findAll('svg path[d^="M21 7"]')).toHaveLength(0)

    // Los 25 caramelos van en la flecha que entra al grupo (hay dos: la de
    // escritorio y la vertical de móvil, y el CSS enseña una u otra), nunca
    // repetidos en cada evolución. El cebo, solo en Leafeon.
    expect(w.text().match(/×25/g)).toHaveLength(2)
    expect(grupo.text()).not.toContain('×25')
    const leafeon = grupo.findAll('.grid > div').find((c) => c.text().includes('Leafeon'))
    expect(leafeon.text()).toContain('Cebo musgoso')
    const vaporeon = grupo.findAll('.grid > div').find((c) => c.text().includes('Vaporeon'))
    expect(vaporeon.find('ul').exists()).toBe(false)
  })

  it('las megas X e Y van en su grupo, con una sola flecha y un solo coste', () => {
    formas.clear()
    formas.set(6, [
      mega('charizard_mega_x', 6, 'Mega Charizard X', ['fire', 'dragon']),
      mega('charizard_mega_y', 6, 'Mega Charizard Y', ['fire', 'flying'])
    ])
    const charizard = {
      ...paso(6, 'Charizard', ['fire', 'flying']),
      evolution_info: {
        primary: [
          paso(4, 'Charmander', ['fire'], { candy_required: 25 }),
          paso(5, 'Charmeleon', ['fire'], { candy_required: 100 }),
          paso(6, 'Charizard', ['fire', 'flying'])
        ]
      }
    }
    const w = montar(charizard)
    const grupo = w.get('[role="group"]')
    expect(grupo.attributes('aria-label')).toBe('Megaevoluciones')
    expect(grupo.findAll('a').map((a) => a.attributes('href'))).toEqual([
      '/pokemon/6?form=charizard_mega_x',
      '/pokemon/6?form=charizard_mega_y'
    ])
    expect(grupo.text()).not.toContain('#6')
    expect(w.text().match(/×200Megaenergía/g)).toHaveLength(2) // flecha de escritorio y la vertical de móvil
    expect(grupo.findAll('svg path[d^="M21 7"]')).toHaveLength(0)
  })

  it('cada Pokémon lleva sus marcas de Dinamax y Gigamax, y las megas ninguna', () => {
    formas.clear()
    formas.set(4, [{ id: 'charmander', dex: 4, dynamax: true }])
    formas.set(6, [
      { id: 'charizard', dex: 6, dynamax: true, gigantamax: true },
      mega('charizard_mega_x', 6, 'Mega Charizard X', ['fire', 'dragon'])
    ])
    const charizard = {
      ...paso(6, 'Charizard', ['fire', 'flying']),
      evolution_info: {
        primary: [
          paso(4, 'Charmander', ['fire'], { candy_required: 25 }),
          paso(5, 'Charmeleon', ['fire'], { candy_required: 100 }),
          paso(6, 'Charizard', ['fire', 'flying'])
        ]
      }
    }
    const w = montar(charizard)
    const marcas = (texto) =>
      w
        .findAll('a, [aria-current="page"]')
        .find((el) => el.text().includes(texto))
        .findAll('svg[role="img"]')
        .map((svg) => svg.attributes('aria-label'))
        .filter((nombre) => nombre.includes('maxizar'))
    expect(marcas('Charmander')).toEqual(['Puede dinamaxizar'])
    expect(marcas('Charmeleon')).toEqual([])
    expect(marcas('#6 Charizard')).toEqual(['Puede dinamaxizar', 'Puede gigamaxizar'])
    expect(marcas('Mega Charizard X')).toEqual([])
  })

  it('el Pokémon que se está viendo se marca y no es un enlace', () => {
    formas.clear()
    const w = montar({
      ...paso(5, 'Charmeleon', ['fire']),
      evolution_info: { primary: [paso(4, 'Charmander', ['fire'], { candy_required: 25 }), paso(5, 'Charmeleon', ['fire'])] }
    })
    const actual = w.get('[aria-current="page"]')
    expect(actual.text()).toContain('Charmeleon')
    expect(actual.element.tagName).not.toBe('A')
    expect(w.findAll('a').map((a) => a.attributes('href'))).toEqual(['/pokemon/4'])
  })

  it('una mega suelta va en línea, sin grupo', () => {
    formas.clear()
    formas.set(3, [mega('venusaur_mega', 3, 'Mega Venusaur', ['grass', 'poison'])])
    const w = montar({
      ...paso(3, 'Venusaur', ['grass', 'poison']),
      evolution_info: {
        primary: [
          paso(1, 'Bulbasaur', ['grass'], { candy_required: 25 }),
          paso(2, 'Ivysaur', ['grass'], { candy_required: 100 }),
          paso(3, 'Venusaur', ['grass', 'poison'])
        ]
      }
    })
    expect(w.find('[role="group"]').exists()).toBe(false)
    expect(w.find('a[href="/pokemon/3?form=venusaur_mega"]').exists()).toBe(true)
  })

  it('sin cadena, el Pokémon solo con su mega (Rayquaza)', () => {
    formas.clear()
    formas.set(384, [mega('rayquaza_mega', 384, 'Mega Rayquaza', ['dragon', 'flying'], 400)])
    const w = montar({ ...paso(384, 'Rayquaza', ['dragon', 'flying']), evolution_info: {} })
    expect(nombres(w)).toEqual(['#384 Rayquaza', 'Mega Rayquaza'])
    expect(w.text()).toContain('×400Megaenergía')
  })

  it('en la ficha de una mega, la marcada es la mega y no el base', () => {
    formas.clear()
    formas.set(384, [mega('rayquaza_mega', 384, 'Mega Rayquaza', ['dragon', 'flying'], 400)])
    const w = montar({ ...paso(384, 'Rayquaza', ['dragon', 'flying']), evolution_info: {} }, { formId: 'rayquaza_mega' })
    expect(w.get('[aria-current="page"]').text()).toContain('Mega Rayquaza')
    expect(w.find('a[href="/pokemon/384"]').exists()).toBe(true)
  })

  it('en la ficha de una forma regional, la cadena es la de la forma', () => {
    formas.clear()
    formas.set(52, [{
      id: 'meowth_galarian', dex: 52, name: 'Galarian Meowth', nameEs: 'Meowth de Galar', types: ['steel'],
      spriteId: '10161', regional: true,
      cadena: {
        primary: [
          paso(52, 'Galarian Meowth', ['steel'], { nameEs: 'Meowth de Galar', form: 'meowth_galarian', candy_required: 50 }),
          paso(863, 'Perrserker', ['steel'])
        ]
      }
    }])
    const kanto = { primary: [paso(52, 'Meowth', ['normal'], { candy_required: 50 }), paso(53, 'Persian', ['normal'])] }
    const w = montar({ ...paso(52, 'Meowth', ['normal']), evolution_info: kanto }, { formId: 'meowth_galarian' })
    expect(nombres(w)).toEqual(['#52 Meowth de Galar', '#863 Perrserker'])
    expect(w.get('[aria-current="page"]').text()).toContain('Meowth de Galar')
    expect(w.text()).not.toContain('Persian')
  })

  it('una forma regional que no evoluciona sale sola, sin las megas de la especie', () => {
    formas.clear()
    formas.set(144, [{ id: 'articuno_galarian', dex: 144, name: 'Galarian Articuno', nameEs: 'Articuno de Galar', types: ['psychic', 'flying'], spriteId: '10169', regional: true }])
    const w = montar({ ...paso(144, 'Articuno', ['ice', 'flying']), evolution_info: {} }, { formId: 'articuno_galarian' })
    expect(nombres(w)).toEqual(['#144 Articuno de Galar'])
  })
})
