import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import i18n from '../src/plugins/i18n'
import AttackerTable from '../src/components/rankings/AttackerTable.vue'

/**
 * La tabla del Top en escritorio ancho. En PvE se ordena desde las cabeceras
 * de DPS, TDO y ER (y va a la par con el selector «Ordenar por», que escucha
 * el mismo v-model); en Dinamax y PvP las columnas son otras.
 */
const movimiento = (nameEs, type = 'fire') => ({ id: nameEs.toUpperCase(), nameEs, type })
const fila = (rank, nameEs, dps, tdo, er) => ({
  id: `p${rank}`, rank, dex: rank, spriteId: rank, nameEs, types: ['fire'],
  fast: movimiento('Ascuas'), charged: movimiento('Llamarada'), dps, tdo, er
})
const montar = (props) =>
  mount(AttackerTable, {
    props,
    global: { plugins: [i18n], stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
  })

describe('tabla del Top', () => {
  it('en PvE marca la columna por la que se ordena y la cambia al pulsar otra cabecera', async () => {
    const w = montar({ mode: 'pve', sortBy: 'dps', rows: [fila(1, 'Charizard', 20.5, 900.4, 60.12), fila(2, 'Moltres', 18, 700, 55)] })
    const cabeceras = w.findAll('th[aria-sort]')
    expect(cabeceras.map((th) => th.attributes('aria-sort'))).toEqual(['descending', 'none', 'none'])

    await w.findAll('th button')[1].trigger('click')
    expect(w.emitted('update:sortBy')).toEqual([['tdo']])

    // Pulsar la que ya manda no emite nada.
    await w.findAll('th button')[0].trigger('click')
    expect(w.emitted('update:sortBy')).toHaveLength(1)
  })

  it('cada dato en su columna, con la coma decimal del español', () => {
    const w = montar({ mode: 'pve', sortBy: 'dps', rows: [fila(1, 'Charizard', 20.54, 900.4, 60.12)] })
    const celdas = w.get('tbody tr').findAll('td').map((td) => td.text())
    expect(celdas[0]).toBe('1')
    expect(celdas[1]).toContain('Charizard')
    expect(celdas[2]).toContain('Ascuas')
    expect(celdas[3]).toContain('Llamarada')
    expect(celdas.slice(4)).toEqual(['20,5', '900', '60,1'])
    // Toda la fila es el enlace a la ficha.
    expect(w.get('tbody a').attributes('href')).toBe('/pokemon/1')
  })

  it('en Max la columna son los ataques y el valor, el daño', () => {
    const w = montar({
      mode: 'max',
      rows: [{ id: 'x', rank: 1, dex: 6, spriteId: 6, nameEs: 'Charizard', types: ['fire'], moves: [movimiento('Maxignición')], value: 223 }]
    })
    const cabeceras = w.findAll('th').map((th) => th.text())
    expect(cabeceras).toEqual(['#', 'Pokémon', 'Ataques', 'Daño'])
    expect(w.get('tbody tr').text()).toContain('Maxignición')
    expect(w.findAll('tbody td').at(-1).text()).toBe('223')
  })

  it('en PvP, los ataques y la puntuación, sin cabeceras para ordenar', () => {
    const w = montar({
      mode: 'pvp',
      rows: [{ id: 'y', rank: 1, dex: 308, spriteId: 308, nameEs: 'Medicham', types: ['fighting'], moves: [movimiento('Contraataque'), movimiento('Puño Hielo')], value: 94.3 }]
    })
    expect(w.findAll('th button')).toHaveLength(0)
    expect(w.findAll('th').at(-1).text()).toBe('Puntuación')
    expect(w.findAll('tbody td').at(-1).text()).toBe('94,3')
  })
})
