import { computed, ref, shallowRef } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { computeCounters, computeTypeRankings, typeMatchups, evaluatePokemon } from '../utils/pve'
import { calcCP } from '../utils/formulas'
import { translateGameText } from '../utils/gameText'

const BASE = import.meta.env.BASE_URL

const FICHEROS = ['roster', 'moves', 'typechart', 'pvp', 'texts', 'meta']

/**
 * Los datos de juego, desde la tabla `game_data` de Supabase.
 *
 * Se piden las seis filas de una vez: cada una es uno de los ficheros que
 * genera `pnpm data`. Leer de la base de datos y no de public/data es lo que
 * permite que actualizar los datos no obligue a redesplegar la app.
 */
async function desdeSupabase() {
  const { data, error } = await supabase.from('game_data').select('name,payload')
  if (error) throw new Error(error.message)

  const porNombre = Object.fromEntries((data ?? []).map((fila) => [fila.name, fila.payload]))
  const faltan = FICHEROS.filter((nombre) => !porNombre[nombre])
  if (faltan.length) throw new Error(`faltan en game_data: ${faltan.join(', ')}`)

  return porNombre
}

/**
 * Respaldo: los JSON que se despliegan con la app.
 *
 * Son la foto del último despliegue, así que pueden ir por detrás de la base
 * de datos, pero permiten que la app siga funcionando si Supabase no responde
 * o si la tabla todavía está vacía.
 */
async function desdeFicheros() {
  const contenidos = await Promise.all(
    FICHEROS.map(async (nombre) => {
      const res = await fetch(`${BASE}data/${nombre}.json`)
      if (!res.ok) throw new Error(`No se ha podido cargar ${nombre}.json (HTTP ${res.status})`)
      return [nombre, await res.json()]
    })
  )
  return Object.fromEntries(contenidos)
}

/**
 * Datos de juego generados por scripts/build-data.mjs (public/data/).
 *
 * Es complementario a la store `pokemons`, que sigue leyendo de Supabase: aquí
 * vive lo que Supabase no tiene (stats de movimientos en PvE y PvP, tabla de
 * tipos, rankings de liga y el roster con megas y oscuros).
 *
 * Los rankings PvE se calculan en el cliente y se memorizan por combinación de
 * filtros, así que cambiar de pestaña no repite el trabajo.
 */
export const useGameDataStore = defineStore('gameData', () => {
  // STATE
  const roster = shallowRef([])
  const moves = shallowRef({})
  const typeChart = shallowRef({ order: [], es: {}, chart: {} })
  const pvp = shallowRef({ great: [], ultra: [], master: [] })
  const texts = shallowRef({})
  const meta = shallowRef(null)
  const status = ref('idle')
  const error = ref(null)

  // GETTERS
  const isReady = computed(() => status.value === 'ready')
  const types = computed(() => typeChart.value.order)
  const chart = computed(() => typeChart.value.chart)
  const byId = computed(() => new Map(roster.value.map((p) => [p.id, p])))

  /**
   * Nombre inglés -> nombre español, solo de las formas base. Lo usan los
   * títulos de evento, que LeekDuck publica en inglés.
   */
  const namesEs = computed(() => {
    const map = new Map()
    for (const p of roster.value) {
      if (p.mega || p.shadow || map.has(p.name)) continue
      map.set(p.name, p.nameEs)
    }
    return map
  })

  /** Formas alternativas agrupadas por número de Pokédex. */
  const formsByDex = computed(() => {
    const map = new Map()
    for (const p of roster.value) {
      if (!map.has(p.dex)) map.set(p.dex, [])
      map.get(p.dex).push(p)
    }
    return map
  })

  const cache = new Map()
  const cached = (key, factory) => {
    if (!cache.has(key)) cache.set(key, factory())
    return cache.get(key)
  }

  // ACTIONS
  /** De dónde salieron los datos que hay cargados: 'supabase' o 'ficheros'. */
  const origen = ref(null)

  const load = async () => {
    if (status.value === 'loading' || status.value === 'ready') return
    status.value = 'loading'
    error.value = null

    let datos = null
    try {
      datos = await desdeSupabase()
      origen.value = 'supabase'
    } catch (err) {
      // Que no responda la base de datos no puede dejar la app en blanco:
      // se tira de los JSON desplegados y se deja constancia del porqué.
      console.warn('game_data no disponible, se usan los ficheros:', err.message)
      try {
        datos = await desdeFicheros()
        origen.value = 'ficheros'
      } catch (errFicheros) {
        error.value = errFicheros.message
        status.value = 'error'
        return
      }
    }

    roster.value = datos.roster
    moves.value = datos.moves
    typeChart.value = datos.typechart
    pvp.value = datos.pvp
    texts.value = datos.texts
    meta.value = datos.meta
    status.value = 'ready'
  }

  /** Rankings PvE por tipo. Admite includeMega, includeShadow y sortBy. */
  const pveRankings = (options = {}) =>
    cached(`pve:${JSON.stringify(options)}`, () =>
      computeTypeRankings(roster.value, moves.value, { limit: 50, ...options })
    )

  /** Mejores counters contra un jefe con esos tipos. */
  const counters = (bossTypes, options = {}) =>
    cached(`cnt:${bossTypes.join('+')}:${JSON.stringify(options)}`, () =>
      computeCounters(roster.value, moves.value, chart.value, { types: bossTypes }, {
        limit: 12,
        ...options
      })
    )

  /** Debilidades y resistencias de una combinación de tipos. */
  const matchups = (pokemonTypes) =>
    cached(`mat:${pokemonTypes.join('+')}`, () =>
      typeMatchups(chart.value, pokemonTypes, types.value)
    )

  /** Mejores conjuntos de ataques de un Pokémon del roster. */
  const bestMovesets = (entry, limit = 5) =>
    cached(`sets:${entry.id}:${limit}`, () =>
      evaluatePokemon(entry, moves.value, { sortBy: 'dps' }).slice(0, limit)
    )

  /**
   * PC con IVs 15/15/15 en los niveles que importan: 20 (incursión, tarea o
   * huevo), 25 (con clima), 30 y 35 (salvaje) y los topes 40 y 50.
   */
  const perfectCP = (stats) => {
    const ivs = { atk: 15, def: 15, hp: 15 }
    const base = { atk: stats.base_attack, def: stats.base_defense, hp: stats.base_stamina }
    return [20, 25, 30, 35, 40, 50].map((level) => ({ level, cp: calcCP(base, ivs, level) }))
  }

  /**
   * Puesto del Pokémon (y de sus formas) en los rankings PvE.
   * Se mira sobre los 500 primeros de cada tipo: por debajo de ahí el dato ya
   * no le dice nada a nadie.
   */
  const pveRanksFor = (dex) =>
    cached(`pveRank:${dex}`, () => {
      const rankings = pveRankings({ limit: 500 })
      const byType = []
      for (const [type, list] of Object.entries(rankings.byType)) {
        const entry = list.find((row) => row.dex === dex)
        if (entry) byType.push({ type, ...entry })
      }
      byType.sort((a, b) => a.rank - b.rank)
      return {
        overall: rankings.overall.find((row) => row.dex === dex) ?? null,
        byType
      }
    })

  /** Puesto del Pokémon en cada liga, si está entre los mejores. */
  const pvpRanksFor = (dex) => {
    const out = []
    for (const league of ['great', 'ultra', 'master']) {
      const entries = (pvp.value[league] || []).filter((r) => byId.value.get(r.id)?.dex === dex)
      for (const entry of entries) out.push({ league, ...entry })
    }
    return out.sort((a, b) => a.rank - b.rank)
  }

  /**
   * Traduce una tarea o bonificación con las frases del propio juego.
   * Si no hay equivalencia, devuelve el original en inglés.
   */
  const translateText = (text) => translateGameText(text, texts.value)

  const typeName = (type) => typeChart.value.es[type] ?? type

  return {
    roster,
    moves,
    typeChart,
    pvp,
    texts,
    meta,
    status,
    error,
    origen,
    isReady,
    types,
    chart,
    byId,
    namesEs,
    formsByDex,
    load,
    pveRankings,
    counters,
    matchups,
    bestMovesets,
    perfectCP,
    pveRanksFor,
    pvpRanksFor,
    translateText,
    typeName
  }
})

// Sin esto, al recargar en caliente Pinia se queda con la definición anterior
// de la store y los métodos nuevos no existen hasta recargar la página entera.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGameDataStore, import.meta.hot))
}
