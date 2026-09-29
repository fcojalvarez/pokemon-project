import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

/**
 * Lo que calculan la ficha (useFichaDatos) y el Top (useTopFilas), contra los
 * datos reales de public/data: la store se carga como en la app, con las
 * filas de game_data servidas desde los ficheros.
 */
const DATA = path.join(process.cwd(), 'public', 'data')
vi.mock('../src/lib/supabaseClient', () => ({ supabase: {} }))
vi.mock('../src/lib/filasDeDatos', () => ({
  leerFilas: async (nombres) =>
    Object.fromEntries(
      nombres
        .filter((nombre) => fs.existsSync(path.join(DATA, `${nombre}.json`)))
        .map((nombre) => [nombre, JSON.parse(fs.readFileSync(path.join(DATA, `${nombre}.json`), 'utf8'))])
    )
}))

const { useGameDataStore } = await import('../src/stores/gameData')
const { useFichaDatos } = await import('../src/composables/useFichaDatos')
const { useTopFilas } = await import('../src/composables/useTopFilas')

let gameData
beforeAll(async () => {
  setActivePinia(createPinia())
  gameData = useGameDataStore()
  await gameData.load()
  await gameData.cargarPvp()
})

/** Una fila de la tabla `pokemons` con lo que la ficha lee de ella. */
const filaDeTabla = (extra) => ({
  types: ['fire', 'flying'],
  is_released: true,
  is_tradeable: true,
  is_transferable: true,
  is_shadow_released: false,
  buddy: { candy_distance: 3, mega_distance: 3 },
  ...extra
})

const ficha = (pokemon, formId = null) => {
  const scope = effectScope()
  const datos = scope.run(() => useFichaDatos({ pokemon: () => pokemon, formId: () => formId }))
  return datos
}

describe('datos de la ficha', () => {
  it('la cargó la store', () => {
    expect(gameData.isReady).toBe(true)
    expect(gameData.pvpListo).toBe(true)
  })

  const charizard = filaDeTabla({
    pokemon_id: 6,
    name: 'Charizard',
    is_shadow_released: true,
    third_move: { candy_required: 25, startdust_required: 10000 },
    shadow_info: { candy_required_purification: 3, stardust_required_purification: 3000 }
  })

  it('la forma base es la de la especie y el PC 100 % sale de sus estadísticas', () => {
    const d = ficha(charizard)
    expect(d.base.value.id).toBe('charizard')
    expect(d.entrada.value.id).toBe('charizard')
    const pc = Object.fromEntries(d.cpTable.value.map((fila) => [fila.level, fila.cp]))
    expect(pc[20]).toBe(1651)
    expect(pc[15]).toBeLessThan(pc[20])
    expect(pc[50]).toBeGreaterThan(pc[40])
  })

  it('costes: segundo ataque, purificar, mega y compañero, en ese orden', () => {
    const d = ficha(charizard)
    expect(d.costs.value.map((c) => c.key)).toEqual(['secondCharged', 'purify', 'megaFirst', 'megaNext', 'buddyCandy', 'buddyMega'])
    expect(d.costs.value[0]).toMatchObject({ candy: 25, dust: 10000 })
    expect(d.costs.value[1]).toMatchObject({ candy: 3, dust: 3000 })
    expect(d.flags.value).toEqual(['canBeShadow'])
  })

  it('el que no puede aprender un segundo ataque lo dice en vez de enseñar 9.999.999 caramelos', () => {
    const smeargle = ficha(filaDeTabla({ pokemon_id: 235, name: 'Smeargle', types: ['normal'], third_move: { candy_required: 9999999 } }))
    expect(smeargle.costs.value[0]).toMatchObject({ key: 'secondCharged' })
    expect(smeargle.costs.value[0].texto).toBeTruthy()
    expect(smeargle.costs.value[0].candy).toBeUndefined()
  })

  it('solo avisa de lo que no se puede hacer', () => {
    const d = ficha(filaDeTabla({ pokemon_id: 6, name: 'Charizard', is_released: false, is_tradeable: false }))
    expect(d.flags.value).toEqual(['notReleased', 'notTradeable'])
  })

  it('una mega de la URL se ve a sí misma, con su oscura si la tiene, y la base pierde protagonismo', () => {
    const d = ficha(charizard, 'charizard_mega_y')
    expect(d.entrada.value.id).toBe('charizard_mega_y')
    expect(d.pveRanks.value.map((forma) => forma.id)).toEqual(['charizard_mega_y'])
    // Sin forma en la URL: la base, su oscura y detrás las megas.
    const base = ficha(charizard)
    expect(base.pveRanks.value.slice(0, 2).map((forma) => forma.id)).toEqual(['charizard', 'charizard_shadow'])
  })

  it('los puestos PvP van por liga, de la Súper a la Master', () => {
    const d = ficha(charizard)
    const ligas = d.pvpPorLiga.value.map((liga) => liga.league)
    expect(ligas).toEqual([...ligas].sort((a, b) => ['great', 'ultra', 'master'].indexOf(a) - ['great', 'ultra', 'master'].indexOf(b)))
    expect(ligas.length).toBeGreaterThan(0)
  })

  it('el nombre de la forma solo se pone si hace falta', () => {
    const d = ficha(charizard)
    // Charizard tiene una sola forma base: con un solo puesto, sobra.
    expect(d.formaUnica.value).toBe(true)
    expect(d.conNombre('charizard', false)).toBe(false)
    expect(d.conNombre('charizard', true)).toBe(true)
    expect(d.conNombre('charizard_shadow', false)).toBe(true)
  })

  it('los ataques llevan su procedencia y la leyenda sabe cuáles hay', () => {
    const d = ficha(charizard)
    const { fast, charged, origenes } = d.movepool.value
    expect(fast.length).toBeGreaterThan(0)
    const marcados = [...fast, ...charged].filter((m) => m.elite || m.legacy)
    expect(origenes.elite || origenes.legacy).toBe(marcados.length > 0)
    expect(d.bestMovesets.value.length).toBeGreaterThan(0)
  })

  it('sin la especie en el roster, arma la entrada con lo de la tabla', () => {
    const d = ficha(filaDeTabla({
      pokemon_id: 32000,
      name: 'Nuevo',
      stats: { base_attack: 200, base_defense: 150, base_stamina: 180 },
      moves: { fast: ['dragon tail'], charged: ['draco-meteor'], elite_fast: [], elite_charged: ["king's shield"] }
    }))
    expect(d.base.value).toBe(null)
    expect(d.entrada.value).toMatchObject({
      id: 'dex-32000',
      stats: { atk: 200, def: 150, hp: 180 },
      fast: ['DRAGON_TAIL'],
      charged: ['DRACO_METEOR', 'KINGS_SHIELD'],
      eliteMoves: ['KINGS_SHIELD'],
      dynamax: false
    })
    // Sin roster, el PC sale de la tabla.
    expect(d.cpTable.value.length).toBeGreaterThan(0)
  })
})

describe('caché de resultados', () => {
  it('lo calculado antes de tener datos no se queda para siempre', async () => {
    setActivePinia(createPinia())
    const vacia = useGameDataStore()
    // Sin cargar, un matchup sale vacío…
    expect(vacia.matchups(['fire']).weak).toEqual([])
    await vacia.load()
    // …y con los datos ya no.
    expect(vacia.matchups(['fire']).weak.length).toBeGreaterThan(0)
    setActivePinia(createPinia())
    gameData = useGameDataStore()
    await gameData.load()
    await gameData.cargarPvp()
  })
})

describe('filas del Top', () => {
  const filtros = (extra = {}) => ({
    mode: ref('pve'),
    type: ref('all'),
    sortBy: ref('dps'),
    league: ref('great'),
    includeMega: ref(true),
    includeShadow: ref(true),
    includeLegacy: ref(true),
    includeElite: ref(true),
    includeLegendary: ref(true),
    ...extra
  })
  const top = (f) => effectScope().run(() => useTopFilas(f))

  it('solo calcula el modo que se ve', () => {
    const t = top(filtros())
    expect(t.pveRows.value.length).toBe(50)
    expect(t.maxRows.value).toEqual([])
    expect(t.pvpRows.value).toEqual([])
    expect(t.filasVisibles.value).toBe(t.pveRows.value)
  })

  it('sin élite ni legacy, la leyenda no los enciende', () => {
    const t = top(filtros({ includeElite: ref(false), includeLegacy: ref(false) }))
    expect(t.origenes.value.elite).toBe(false)
    expect(t.origenes.value.legacy).toBe(false)
  })

  it('Max: de mayor a menor daño, con puesto seguido y el sprite Gigamax en su fila', () => {
    const t = top(filtros({ mode: ref('max') }))
    const filas = t.maxRows.value
    expect(filas.length).toBe(50)
    expect(filas.map((f) => f.rank)).toEqual(filas.map((_, i) => i + 1))
    for (let i = 1; i < filas.length; i++) expect(filas[i - 1].value).toBeGreaterThanOrEqual(filas[i].value)
    const gigamax = filas.find((f) => f.version === 'gigantamax')
    if (gigamax) expect(gigamax.spriteId).toBeGreaterThan(10000)
    expect(new Set(filas.map((f) => f.id)).size).toBe(filas.length)
  })

  it('Max sin legendarios deja fuera a legendarios y míticos', () => {
    const t = top(filtros({ mode: ref('max'), includeLegendary: ref(false) }))
    const porDex = new Map(gameData.roster.map((p) => [p.dex, p]))
    expect(t.maxRows.value.some((f) => porDex.get(f.dex)?.legendary || porDex.get(f.dex)?.mythical)).toBe(false)
  })

  it('Max de un tipo: todas sus líneas son de ese tipo', () => {
    const t = top(filtros({ mode: ref('max'), type: ref('water') }))
    for (const fila of t.maxRows.value) {
      for (const linea of fila.maxLines) expect(linea.max.type).toBe('water')
    }
  })

  it('PvP: filas con sus ataques y la marca de procedencia', () => {
    const t = top(filtros({ mode: ref('pvp') }))
    const filas = t.pvpRows.value
    expect(filas.length).toBeGreaterThan(0)
    for (const m of filas[0].moves) expect(m).toHaveProperty('elite')
    const conTipo = top(filtros({ mode: ref('pvp'), type: ref('fairy') })).pvpRows.value
    expect(conTipo.every((f) => f.types.includes('fairy'))).toBe(true)
  })
})
