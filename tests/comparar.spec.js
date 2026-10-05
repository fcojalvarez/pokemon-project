import { describe, expect, it } from 'vitest'
import { candidatosComparar, filasComparar, resumenComparable } from '../src/utils/comparar'

const stats = { atk: 200, def: 150, hp: 180 }
const roster = [
  { id: 'blastoise', dex: 9, name: 'Blastoise', nameEs: 'Blastoise', stats },
  { id: 'blastoise_mega', dex: 9, name: 'Mega Blastoise', nameEs: 'Mega Blastoise', stats },
  {
    id: 'karrablast_shadow',
    dex: 588,
    name: 'Karrablast Shadow',
    nameEs: 'Karrablast Oscuro',
    stats
  },
  { id: 'charizard', dex: 6, name: 'Charizard', nameEs: 'Charizard', stats },
  { id: 'sin_stats', dex: 999, name: 'Blastsin', nameEs: 'Blastsin', stats: { atk: 0 } }
]
const nombre = (e) => e.nameEs

describe('candidatosComparar', () => {
  it('primero los que empiezan por lo escrito y luego por una palabra', () => {
    const ids = candidatosComparar(roster, 'blasto', nombre).map((e) => e.id)
    expect(ids).toEqual(['blastoise', 'blastoise_mega'])
  })

  it('sin tildes ni mayúsculas, y por número', () => {
    expect(candidatosComparar(roster, 'CHÁRI', nombre).map((e) => e.id)).toEqual(['charizard'])
    expect(candidatosComparar(roster, '588', nombre).map((e) => e.id)).toEqual([
      'karrablast_shadow'
    ])
  })

  it('deja fuera al de la ficha y a los que no tienen estadísticas', () => {
    const ids = candidatosComparar(roster, 'blast', nombre, { excluir: 'blastoise' }).map(
      (e) => e.id
    )
    expect(ids).toEqual(['blastoise_mega'])
  })

  it('sin texto, nada', () => {
    expect(candidatosComparar(roster, '  ', nombre)).toEqual([])
  })
})

describe('resumenComparable y filasComparar', () => {
  const gameData = {
    bestMovesets: (entry) => [{ dps: entry.id === 'a' ? 15 : 12, tdo: 400 }],
    pveRanksFor: () => [
      { id: 'a', overall: { rank: 10 }, byType: [{ type: 'fire', rank: 44 }] },
      { id: 'b', overall: null, byType: [{ type: 'water', rank: 98 }] }
    ],
    pvpRanksFor: () => [
      { id: 'a', league: 'great', rank: 30 },
      { id: 'a', league: 'great', rank: 5 },
      { id: 'b', league: 'great', rank: 2 }
    ]
  }
  const a = resumenComparable(gameData, { id: 'a', dex: 1, stats: { atk: 200, def: 150, hp: 180 } })
  const b = resumenComparable(gameData, { id: 'b', dex: 1, stats: { atk: 180, def: 170, hp: 180 } })

  it('se queda con el mejor puesto de cada liga de esa forma', () => {
    expect(a.pvp.great).toBe(5)
    expect(b.pvp.great).toBe(2)
    expect(a.pve).toBe(10)
    expect(b.pve).toBeNull()
    // Aunque no entre en el general, en su tipo sí.
    expect(b.mejorTipo).toEqual({ tipo: 'water', rank: 98 })
    expect(a.cp).toBeGreaterThan(0)
  })

  it('gana el número más alto o el puesto más bajo; sin dato o empate, nadie', () => {
    const filas = Object.fromEntries(filasComparar(a, b).map((f) => [f.clave, f.gana]))
    expect(filas).toMatchObject({
      atk: 'a',
      def: 'b',
      hp: null,
      dps: 'a',
      tdo: null,
      pve: null,
      bestType: 'a',
      great: 'b',
      ultra: null
    })
    const mejorTipo = filasComparar(a, b).find((f) => f.clave === 'bestType')
    expect(mejorTipo.tipos).toEqual({ a: 'fire', b: 'water' })
  })
})
