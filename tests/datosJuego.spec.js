import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Lo que el pipeline (scripts/build-data.mjs) deja en public/data, contrastado
 * con el juego y con Pokebattler. Si una de estas falla después de regenerar
 * los datos, algo se ha perdido por el camino.
 */
const DATA = path.join(process.cwd(), 'public', 'data')
const read = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'))
const roster = read('roster.json')
const moves = read('moves.json')
const max = read('maxbattles.json')
const porId = (id) => roster.find((p) => p.id === id)

describe('ataques del juego en el roster', () => {
  it('las primigenias llevan su ataque exclusivo, como élite', () => {
    expect(porId('kyogre_primal').charged).toContain('ORIGIN_PULSE')
    expect(porId('kyogre_primal').eliteMoves).toContain('ORIGIN_PULSE')
    expect(porId('groudon_primal').charged).toContain('PRECIPICE_BLADES')
    expect(porId('groudon_primal').eliteMoves).toContain('PRECIPICE_BLADES')
  })

  it('no se pierden los que pvpoke escribe distinto', () => {
    expect(porId('cinderace').charged).toContain('PYROBALL')
    expect(porId('alakazam').charged).toContain('FUTURESIGHT')
    expect(porId('genesect_douse').charged).toContain('TECHNO_BLAST_WATER')
    expect(porId('suicune').fast).toContain('HIDDEN_POWER')
    expect(porId('suicune').eliteMoves).toContain('HIDDEN_POWER')
  })

  it('todo ataque del roster existe en moves.json y es del tipo que toca', () => {
    // Forcejeo es el relleno de pvpoke para los que aún no han salido
    // (Magearna lo lleva de rápido): la app nunca lo rankea.
    const mal = []
    for (const p of roster) {
      for (const id of p.fast) if (moves[id]?.kind !== 'fast' && id !== 'STRUGGLE') mal.push(`${p.id} ${id}`)
      for (const id of p.charged) if (moves[id]?.kind !== 'charged') mal.push(`${p.id} ${id}`)
    }
    expect(mal).toEqual([])
  })

  it('añade lo que el juego da y Pokebattler confirma', () => {
    expect(porId('mewtwo_shadow').fast).toContain('COUNTER')
    expect(porId('mewtwo_shadow').eliteMoves).toContain('COUNTER')
    expect(porId('keldeo_resolute').charged).toContain('SACRED_SWORD')
    expect(porId('miraidon').fast).toContain('DRAGON_BREATH')
  })
})

describe('ataques de las supermegas', () => {
  it('llevan datos de incursión (de Pokebattler mientras el GAME_MASTER no los publique)', () => {
    for (const m of Object.values(moves).filter((uno) => uno.megaMove)) {
      expect(m.pve?.power, m.id).toBeGreaterThan(0)
      if (m.pveSource) expect(m.pveSource).toBe('pokebattler')
    }
    expect(moves.FUTURE_SIGHT_PLUS.pve).toMatchObject({ power: 140, energy: -100, duration: 2.5 })
  })
})

describe('Dinamax y Gigamax liberados', () => {
  it.each(['eternatus', 'zacian_crowned_sword', 'zamazenta_crowned_shield'])('%s dinamaxiza', (id) => {
    expect(porId(id).dynamax).toBe(true)
  })

  it('las formas de siempre de Zacian y Zamazenta, no', () => {
    expect(porId('zacian_hero').dynamax).toBe(false)
    expect(porId('zamazenta_hero').dynamax).toBe(false)
    expect(porId('eternatus_eternamax').dynamax).toBe(false)
  })

  it.each(['inteleon', 'cinderace', 'rillaboom'])('%s gigamaxiza', (id) => {
    expect(porId(id).gigantamax).toBe(true)
  })

  it('Flapple y Appletun siguen sin Gigamax: el juego lo tiene, pero no ha salido', () => {
    expect(porId('flapple').gigantamax).toBe(false)
    expect(porId('appletun').gigantamax).toBe(false)
  })
})

describe('Ataques Max exclusivos', () => {
  it.each([
    ['zacian_crowned_sword', 'VN_BM_060', 'steel', 'Tajo Supremo'],
    ['zamazenta_crowned_shield', 'VN_BM_061', 'steel', 'Embate Supremo'],
    ['eternatus', 'VN_BM_062', 'dragon', 'Cañón Dinamax']
  ])('%s usa %s', (id, move, type, nameEs) => {
    const propio = max.exclusiveByForm[id]
    expect(propio.attack).toMatchObject({ id: move, type, nameEs })
    // También cambian su Maxibarrera y su Maxivigor.
    expect(propio.guard.nameEs).toBe('Maxibarrera')
    expect(propio.spirit.nameEs).toBe('Maxivigor')
  })

  it('un Gigamax aún sin salir no se cuela como exclusivo', () => {
    expect(max.exclusiveByForm.duraludon).toBeUndefined()
  })
})

describe('potencia de los Ataques Max por nivel', () => {
  it('Ataque Max 250/300/350, Gigamax y exclusivos 350/400/450; el 4.º nivel es el del Cañón Dinamax', () => {
    expect(max.byType.fire.power).toEqual([250, 300, 350, 450])
    expect(max.gmaxBySpecies.CHARIZARD.power).toEqual([350, 400, 450, 550])
    expect(max.exclusiveByForm.zacian_crowned_sword.attack.power).toEqual([350, 400, 450, 550])
  })

  it('Maxibarrera da escudo y Maxivigor cura, por nivel', () => {
    expect(max.exclusiveByForm.eternatus.guard.shield).toEqual([20, 40, 60])
    expect(max.exclusiveByForm.eternatus.spirit.heal).toEqual([0.08, 0.12, 0.16])
  })
})
