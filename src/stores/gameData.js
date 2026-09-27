import { computed, ref, shallowRef } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'
import { computeCounters, computeTypeRankings, typeMatchups, evaluatePokemon } from '../utils/pve'
import { calcCP } from '../utils/formulas'
import { normalizeName, translateGameText } from '../utils/gameText'
import { stripFormPrefix, translatePokemonName } from '../utils/eventName'
import { useTranslate } from '../composables/useTranslate'

const BASE = import.meta.env.BASE_URL

const FICHEROS = ['roster', 'moves', 'typechart', 'pvp', 'texts', 'meta', 'maxbattles']

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
  const { t, te, locale } = useTranslate()

  const roster = shallowRef([])
  const moves = shallowRef({})
  const typeChart = shallowRef({ order: [], es: {}, chart: {} })
  const pvp = shallowRef({ great: [], ultra: [], master: [] })
  const texts = shallowRef({})
  const meta = shallowRef(null)
  const maxBattles = shallowRef({ moves: {}, byType: {}, gmaxBySpecies: {}, upgradeCosts: {} })
  /**
   * Qué Pokémon hay ahora mismo en los combates Max. Lo escribe un workflow
   * aparte cada tres horas, así que puede no estar (despliegue nuevo, primera
   * ejecución, o leyendo de los ficheros de respaldo). Si falta, las vistas
   * que lo usan sencillamente no se pintan.
   */
  const maxLive = shallowRef(null)
  const status = ref('idle')
  const error = ref(null)

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

  /**
   * Lo que hace falta para pintar los combates Max de un Pokémon del roster.
   *
   * El ataque Max sale del tipo principal: todos los Dinamax de un tipo
   * comparten el mismo, así que no hay nada que elegir. El Gigamax sí es suyo
   * y va indexado por especie.
   *
   * Devuelve null si ese Pokémon no puede dinamaxizar, que es lo normal: las
   * megas y los oscuros no pueden, y de los demás solo unos 156.
   */
  const maxInfoFor = (entry) => {
    if (!entry?.dynamax && !entry?.gigantamax) return null
    const especie = String(entry.id ?? '').split('_')[0].toUpperCase()
    return {
      gigantamax: !!entry.gigantamax,
      maxMove: maxBattles.value.byType?.[entry.types?.[0]] ?? null,
      gmaxMove: entry.gigantamax ? maxBattles.value.gmaxBySpecies?.[especie] ?? null : null,
      costs: maxBattles.value.upgradeCosts?.[entry.maxCostGroup] ?? null
    }
  }

  /**
   * La forma base de cada Pokémon, indexada por número de Pokédex y por
   * nombre.
   *
   * Son mapas y no búsquedas sueltas porque esto se consulta desde dentro de
   * listas —cada jefe, cada huevo, cada recompensa—, y un `roster.find()` por
   * tarjeta recorre 1.700 entradas cada vez que se repinta.
   *
   * Base = ni mega ni oscuro: son el mismo Pokémon a efectos de ficha, y es
   * lo que se quiere cuando se busca por nombre o por número.
   */
  const bases = computed(() => {
    const porDex = new Map()
    const porNombre = new Map()
    for (const entry of roster.value) {
      if (entry.mega || entry.shadow) continue
      if (!porDex.has(entry.dex)) porDex.set(entry.dex, entry)
      const clave = normalizeName(entry.name)
      if (!porNombre.has(clave)) porNombre.set(clave, entry)
    }
    return { porDex, porNombre }
  })

  /** La forma base con ese número de Pokédex, o null. */
  const baseByDex = (dex) => bases.value.porDex.get(dex) ?? null

  /**
   * La forma base a partir de un nombre como lo publica LeekDuck, en inglés y
   * con el prefijo de forma delante («Mega Malamar», «Hisuian Samurott»).
   */
  const baseByName = (name) => {
    const clave = normalizeName(stripFormPrefix(name))
    return clave ? bases.value.porNombre.get(clave) ?? null : null
  }

  /**
   * Si ese Pokémon puede salir variocolor.
   *
   * No vale el `canBeShiny` del feed: LeekDuck lo trae a false en TODAS las
   * recompensas de investigación. Manda nuestro dato, que se sincroniza a
   * diario, y el del feed solo se usa si no conocemos la especie.
   *
   * Da igual el sitio: si el variocolor está liberado, puede aparecer en
   * cualquier encuentro de esa especie.
   */
  const shinyReleased = (dex, delFeed = false) =>
    baseByDex(dex)?.shinyReleased ?? !!delFeed

  /**
   * Nombre en el idioma de la app de un Pokémon publicado en inglés, con su
   * forma. Estaba repetido en las tres vistas que pintan Pokémon del feed.
   *
   * En inglés el nombre ya viene bien; solo se rehace el prefijo de forma con
   * la misma plantilla, para que se escriba igual en toda la app. El idioma se
   * lee en cada llamada: desde una plantilla o un computed, cambia con él.
   */
  const nombreEs = (name) =>
    translatePokemonName(name, locale() === 'en' ? null : namesEs.value, (form, base) =>
      t(`events.forms.${form}`, { pokemon: base })
    )

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
    maxBattles.value = datos.maxbattles
    maxLive.value = datos.maxlive ?? null
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
   * Si no hay equivalencia, devuelve el original en inglés. Con la app en
   * inglés no hay nada que traducir: el texto ya llega así.
   */
  const translateText = (text) => (locale() === 'en' ? text : translateGameText(text, texts.value))

  /**
   * Nombre del tipo en el idioma de la app. El español sale de la tabla de
   * tipos del juego; el inglés, de los ficheros de idioma o, si es un tipo
   * nuevo que aún no está ahí, del propio id con mayúscula.
   */
  const typeName = (type) => {
    if (locale() === 'en') {
      if (te(`types.${type}`)) return t(`types.${type}`)
      const id = String(type ?? '')
      return id.charAt(0).toUpperCase() + id.slice(1)
    }
    return typeChart.value.es[type] ?? type
  }

  return {
    roster,
    moves,
    typeChart,
    pvp,
    texts,
    meta,
    maxBattles,
    maxLive,
    maxInfoFor,
    status,
    error,
    origen,
    isReady,
    types,
    chart,
    byId,
    namesEs,
    baseByDex,
    baseByName,
    shinyReleased,
    nombreEs,
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
