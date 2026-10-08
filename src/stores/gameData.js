import { computed, ref, shallowRef } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { leerFilas } from '../lib/filasDeDatos'
import {
  computeCounters,
  computeDefenders,
  computeTypeRankings,
  typeMatchups,
  evaluatePokemon,
  jefesDebilesA,
  MEGA_OTRO_TIPO,
  METRICA_PVE
} from '../utils/pve'
import { CLIMAS, climaDeTipo } from '../utils/clima'
import { calcCP } from '../utils/formulas'
import { filasMaxOrdenadas, gigamaxDe, opcionesMax, papelesMax } from '../utils/maxBattle'
import { aShinyEnTodo, normalizeName, translateGameText } from '../utils/gameText'
import { stripFormPrefix, translatePokemonName } from '../utils/eventName'
import { useTranslate } from '../composables/useTranslate'

const BASE = import.meta.env.BASE_URL

const FICHEROS = ['roster', 'moves', 'typechart', 'meta', 'maxbattles']
/** Las escriben workflows aparte: si faltan, la app sigue sin ellas. */
const OPCIONALES = ['maxlive', 'traducciones']
/**
 * Se piden solo cuando hacen falta: los rankings PvP (1,1 MB) los usan la
 * sección PvP de la ficha y el Top en modo PvP, y las frases del juego
 * (360 KB), traducir tareas y bonificaciones. Juntas eran la mitad de lo que
 * se bajaba al abrir una ficha.
 */
const APARTE = ['pvp', 'texts']

/**
 * Noticias oficiales de Pokémon GO asociadas a cada evento (las escribe
 * `pnpm noticias`): `{ eventos: {eventID: slug}, noticias: {slug: {url, es, en}} }`.
 * Solo hacen falta al abrir el detalle de un evento.
 */
let noticiasPendientes = null
export function cargarNoticias() {
  noticiasPendientes ??= leerFilas(['noticias'])
    // «shiny» y no «variocolor» también en lo guardado antes de que el script
    // lo cambiara al guardar (scripts/lib/noticias.mjs).
    .then((filas) => aShinyEnTodo(filas.noticias ?? { eventos: {}, noticias: {} }))
    .catch((err) => {
      console.warn('noticias no disponibles:', err.message)
      noticiasPendientes = null
      return { eventos: {}, noticias: {} }
    })
  return noticiasPendientes
}

/**
 * Formas y disfraces de cada Pokémon (Vivillon, Zygarde, Pikachu…). Pesan más
 * que el resto y solo hacen falta al abrir la galería de una ficha, así que se
 * piden entonces, una vez por sesión.
 */
let formasPendientes = null
export function cargarFormas() {
  formasPendientes ??= (async () => {
    try {
      const { formas } = await leerFilas(['formas'])
      if (formas) return formas
    } catch (err) {
      console.warn('formas no disponibles en game_data, se usa el fichero:', err.message)
    }
    const res = await fetch(`${BASE}data/formas.json`)
    return res.ok ? res.json() : {}
  })().catch(() => {
    formasPendientes = null
    return {}
  })
  return formasPendientes
}

/**
 * Los datos de juego, desde la tabla `game_data` de Supabase.
 *
 * Se piden las filas de una vez: cada una es uno de los ficheros que genera
 * `pnpm data`. Leer de la base de datos y no de public/data es lo que permite
 * que actualizar los datos no obligue a redesplegar la app. Las que no han
 * cambiado desde la última visita salen del dispositivo (ver filasDeDatos.js).
 */
async function desdeSupabase(alActualizar) {
  // Solo las filas que se usan al arrancar: en la tabla hay más (las formas y
  // disfraces, la memoria de Max liberados) y no hace falta bajarlas siempre.
  // Si ya están en el dispositivo, salen al momento y las versiones se
  // comprueban por detrás (ver leerFilas): abrir la app no espera a la red.
  const porNombre = await leerFilas([...FICHEROS, ...OPCIONALES], {
    alActualizar,
    imprescindibles: FICHEROS
  })
  // Si falta alguna imprescindible (sin red y sin copia de esa en el
  // dispositivo), solo esa sale de los ficheros: el resto sigue siendo lo más
  // reciente que hay.
  const faltan = FICHEROS.filter((nombre) => !porNombre[nombre])
  if (faltan.length) Object.assign(porNombre, await desdeFicheros(faltan))

  return porNombre
}

/**
 * Respaldo: los JSON que se despliegan con la app.
 *
 * Son la foto del último despliegue, así que pueden ir por detrás de la base
 * de datos, pero permiten que la app siga funcionando si Supabase no responde
 * o si la tabla todavía está vacía.
 */
async function desdeFicheros(nombres = FICHEROS) {
  const contenidos = await Promise.all(
    nombres.map(async (nombre) => {
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
  const { t, locale } = useTranslate()

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
  /**
   * Traducciones automáticas de lo que LeekDuck publica en inglés y ni las
   * frases del juego ni los patrones de título cubren: `{ [inglés]: { texto,
   * origen, modelo, fecha } }`. Las escribe `pnpm traducir` (Gemini) cada pocas
   * horas; como `maxLive`, puede no estar, y entonces se ve el inglés.
   */
  const traducciones = shallowRef({})

  /**
   * Antigüedad de los combates Max, en ms: desde que Snacknap actualizó su
   * página (`freshAt`) o, si no lo dice, desde que se descargó. El workflow
   * pasa cada tres horas; si falla, los jefes de hace días se enseñarían como
   * si fueran de hoy. `now` lo pone la vista, para que la cuenta avance.
   */
  const maxLiveEdad = (now = new Date()) => {
    const marca = maxLive.value?.freshAt ?? maxLive.value?.fetchedAt
    const at = marca ? new Date(marca).getTime() : NaN
    return Number.isFinite(at) ? Math.max(0, now.getTime() - at) : null
  }
  // Tres pasadas seguidas sin actualizar: algo ha fallado.
  const MAX_LIVE_CADUCA_MS = 9 * 60 * 60 * 1000
  const maxLiveCaducado = (now = new Date()) => (maxLiveEdad(now) ?? 0) > MAX_LIVE_CADUCA_MS
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

  /** Lo que piden opcionesMax y maxCounters para saber los Ataques Max. */
  const datosMax = () => ({
    moves: moves.value,
    maxPorTipo: maxBattles.value.byType,
    gmaxPorEspecie: maxBattles.value.gmaxBySpecies,
    exclusivoPorForma: maxBattles.value.exclusiveByForm
  })

  /**
   * Lo que hace falta para pintar los combates Max de un Pokémon del roster.
   *
   * El Ataque Max de un Dinamax sale del tipo de su ataque rápido, así que hay
   * uno por cada tipo de rápido (`opciones`, ver opcionesMax). El Gigamax es
   * suyo, fijo, y va indexado por especie.
   *
   * Devuelve null si ese Pokémon no puede dinamaxizar, que es lo normal: las
   * megas y los oscuros no pueden, y de los demás solo unos 156.
   */
  const maxInfoFor = (entry) => {
    if (!entry?.dynamax && !entry?.gigantamax) return null
    const datos = datosMax()
    return {
      gigantamax: !!entry.gigantamax,
      opciones: opcionesMax(entry, datos),
      gmaxMove: gigamaxDe(entry, datos.gmaxPorEspecie),
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
   * La forma que enseña la ficha cuando la URL no pide otra: la que se llama
   * como la especie (charizard, no charizard_x) y, si no hay, la primera que
   * no sea mega, oscura ni regional. Está aquí y no en la ficha porque la
   * cabecera y las secciones tienen que hablar del mismo Pokémon.
   */
  const fichaBase = (dex, name) => {
    const formas = (formsByDex.value.get(dex) ?? []).filter(
      (entry) => !entry.mega && !entry.shadow && !entry.regional
    )
    const nombre = String(name ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
    return formas.find((entry) => entry.id === nombre) ?? formas[0] ?? null
  }

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
  const shinyReleased = (dex, delFeed = false) => baseByDex(dex)?.shinyReleased ?? !!delFeed

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

  /**
   * Resultados ya calculados (rankings, counters…). Solo se guardan con los
   * datos cargados: calculado antes, un resultado vacío se quedaba para toda
   * la sesión. Con datos nuevos (load), se empieza de cero.
   */
  const cache = new Map()
  const cached = (key, factory) => {
    if (status.value !== 'ready') return factory()
    if (!cache.has(key)) cache.set(key, factory())
    return cache.get(key)
  }

  /**
   * Pone los datos en la store. Al arrancar llegan todos; después, si al
   * comprobar las versiones por detrás alguna fila había cambiado, solo esas.
   * Los cálculos guardados se tiran: eran de los datos de antes.
   */
  const aplicar = (datos) => {
    if ('roster' in datos) roster.value = datos.roster
    if ('moves' in datos) moves.value = datos.moves
    if ('typechart' in datos) typeChart.value = datos.typechart
    if ('maxbattles' in datos) maxBattles.value = datos.maxbattles
    if ('maxlive' in datos) maxLive.value = datos.maxlive ?? null
    if ('traducciones' in datos) traducciones.value = datos.traducciones?.es ?? {}
    if ('meta' in datos) meta.value = datos.meta
    cache.clear()
  }

  /** De dónde salieron los datos que hay cargados: 'supabase' o 'ficheros'. */
  const origen = ref(null)

  const load = async () => {
    if (status.value === 'loading' || status.value === 'ready') return
    status.value = 'loading'
    error.value = null

    let datos = null
    try {
      datos = await desdeSupabase(aplicar)
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

    aplicar(datos)
    status.value = 'ready'
    // Con la pantalla ya pintada, lo que más se pide (ver precalcular).
    precalcular()
  }

  /**
   * Las filas que se piden aparte (APARTE), cada una una vez por sesión. Van
   * a la misma fuente que el resto: si los datos salieron de los ficheros de
   * respaldo, estas también.
   */
  const aparte = { pvp, texts }
  const estadoAparte = ref(Object.fromEntries(APARTE.map((nombre) => [nombre, 'idle'])))
  const pendientes = {}
  const cargarAparte = (nombre) => {
    pendientes[nombre] ??= (async () => {
      // Se llama desde computeds (pvpRanksFor, translateText): el estado se
      // toca después de un tic, no mientras Vue está evaluando uno.
      await null
      estadoAparte.value = { ...estadoAparte.value, [nombre]: 'loading' }
      let fila = null
      if (origen.value !== 'ficheros') {
        try {
          // Lo guardado al momento; si en Supabase hay una versión nueva, se
          // cambia en cuanto llega.
          fila =
            (
              await leerFilas([nombre], {
                alActualizar: (nuevas) => {
                  if (nuevas[nombre] != null) aparte[nombre].value = nuevas[nombre]
                }
              })
            )[nombre] ?? null
        } catch (err) {
          console.warn(`${nombre} no disponible en game_data, se usa el fichero:`, err.message)
        }
      }
      try {
        fila ??= (await desdeFicheros([nombre]))[nombre]
      } catch (err) {
        // Se podrá volver a intentar: sin esto, un fallo de red dejaba la
        // sección sin datos hasta recargar.
        pendientes[nombre] = null
        estadoAparte.value = { ...estadoAparte.value, [nombre]: 'error' }
        return
      }
      aparte[nombre].value = fila
      estadoAparte.value = { ...estadoAparte.value, [nombre]: 'ready' }
    })()
    return pendientes[nombre]
  }
  /** Pide los rankings PvP. Se puede llamar las veces que haga falta. */
  const cargarPvp = () => cargarAparte('pvp')
  const pvpListo = computed(() => estadoAparte.value.pvp === 'ready')
  const cargarTextos = () => cargarAparte('texts')

  /** Rankings PvE por tipo. Admite includeMega, includeShadow y sortBy (eDPS por defecto). */
  /**
   * Las opciones de un cálculo, con los valores por defecto puestos y siempre
   * en el mismo orden: el Top pide { includeMega: true, … } y la ficha {}, y
   * con claves distintas se calculaba dos veces lo mismo.
   */
  const claveDe = (options, defecto) =>
    JSON.stringify(
      Object.fromEntries(Object.keys(defecto).map((k) => [k, options[k] ?? defecto[k]]))
    )
  const PVE_DEFECTO = {
    includeMega: true,
    includeShadow: true,
    includeLegacy: true,
    includeElite: true,
    sortBy: METRICA_PVE
  }

  /**
   * El ranking se calcula entero una vez por combinación de filtros, y cada
   * quien se queda con los que necesita: el Top los 50 primeros, la ficha y
   * las clases del Top los 500. Antes eran dos cálculos completos.
   */
  const pveRankings = (options = {}) => {
    const clave = claveDe(options, PVE_DEFECTO)
    const limit = options.limit ?? 50
    const completo = cached(`pve:${clave}`, () =>
      computeTypeRankings(roster.value, moves.value, {
        ...JSON.parse(clave),
        chart: chart.value,
        limit: Infinity
      })
    )
    return cached(`pve:${clave}:${limit}`, () => ({
      overall: completo.overall.slice(0, limit),
      byType: Object.fromEntries(
        Object.entries(completo.byType).map(([tipo, lista]) => [tipo, lista.slice(0, limit)])
      )
    }))
  }

  /**
   * Su puesto como atacante en el Top Max (todos los tipos, con legendarios),
   * sin el corte de 50 del Top: la ficha lo enseña aunque quede más abajo.
   */
  const puestoMaxAtacante = (id) =>
    cached('puestoMax', () => {
      const puestos = new Map()
      filasMaxOrdenadas(roster.value, (entry) => maxInfoFor(entry)?.opciones ?? []).forEach(
        (fila, i) => {
          if (!puestos.has(fila.entry.id)) puestos.set(fila.entry.id, i + 1)
        }
      )
      return puestos
    }).get(id) ?? null

  /** Los defensores de gimnasio, todos, del mejor al peor (Top y ficha). */
  const defensores = (options = {}) => {
    const clave = claveDe(options, { includeLegacy: true, includeElite: true })
    return cached(`def:${clave}`, () =>
      computeDefenders(roster.value, moves.value, JSON.parse(clave))
    )
  }

  /** Su fila de defensor (con `rank`), si puede defender un gimnasio. */
  const defensorPara = (id) =>
    cached('defPorId', () => new Map(defensores().map((fila) => [fila.id, fila]))).get(id) ?? null

  /** Los jefes débiles a un tipo con los que se calcula su lista (ver jefesDebilesA). */
  const jefesDe = (tipo) =>
    cached(`jefes:${tipo}`, () => jefesDebilesA(roster.value, chart.value, tipo, moves.value))

  /**
   * Un conjunto concreto contra todos los jefes, como la lista general del
   * Top: su media (`edps`, `dps`, `tdo`), o null si no puede llevarlo.
   */
  const enGeneral = (entry, conjunto, extra = {}) =>
    evaluatePokemon(entry, moves.value, {
      chart: chart.value,
      jefes: jefesDe(null),
      conjuntos: new Set([`${conjunto.fast.id}|${conjunto.charged.id}`]),
      ...extra
    })[0] ?? null

  /** Lo que rinde ese conjunto en la lista general (ver enGeneral), en eDPS. */
  const generalDe = (entry, conjunto) =>
    cached(
      `general:${entry.id}:${conjunto.fast.id}:${conjunto.charged.id}`,
      () => enGeneral(entry, conjunto)?.edps ?? 0
    )

  /** Contra los jefes débiles a `tipo`, como las listas por tipo del Top. */
  const contraTipo = (tipo, extra = {}) => ({
    debilA: tipo,
    chart: chart.value,
    jefes: jefesDe(tipo),
    ...extra
  })

  /**
   * Una fila del Top PvE con el clima que potencia el tipo de su lista:
   * el mismo conjunto, contra los mismos jefes, con los ataques de los tipos
   * de ese clima ×1,2. Devuelve { clima, dps, tdo, edps }.
   */
  const conClima = (row) =>
    cached(`clima:${row.id}:${row.fast.id}:${row.charged.id}:${row.tipo}`, () => {
      const entry = byId.value.get(row.id)
      // En la general, el clima de su cargado, contra todos los jefes.
      const tipo = row.tipo ?? row.charged.type
      const clima = climaDeTipo(tipo)
      if (!entry || !clima) return null
      if (row.enGeneral) {
        const conClimaGeneral = enGeneral(entry, row, { clima: CLIMAS[clima] })
        return conClimaGeneral
          ? {
              clima,
              dps: conClimaGeneral.dps,
              tdo: conClimaGeneral.tdo,
              edps: conClimaGeneral.edps
            }
          : null
      }
      const igual = evaluatePokemon(
        entry,
        moves.value,
        contraTipo(tipo, { clima: CLIMAS[clima] })
      ).find((otro) => otro.fast.id === row.fast.id && otro.charged.id === row.charged.id)
      return igual ? { clima, dps: igual.dps, tdo: igual.tdo, edps: igual.edps } : null
    })

  /** Puesto de tanque y de sanador de cada Pokémon que dinamaxiza (letras del Top Max). */
  const papelesDeMax = () => cached('papelesMax', () => papelesMax(roster.value))

  /**
   * Lo que más se pide, calculado de antemano cuando el navegador está libre:
   * el ranking por defecto (Top y puestos de la ficha), los defensores y los
   * papeles Max. Una tarea por hueco libre, para no bloquear de golpe: así el
   * primer Top y la primera ficha salen sin esperar al cálculo. Si los datos
   * cambian a medias, cache.clear() tira lo hecho y se vuelve a pedir cuando
   * haga falta.
   */
  const enReposo = (tarea) =>
    typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? window.requestIdleCallback(tarea, { timeout: 4000 })
      : setTimeout(tarea, 300)
  const precalcular = () => {
    const tareas = [
      () => pveRankings(),
      () => defensorPara(''),
      () => papelesDeMax(),
      () => puestoMaxAtacante('')
    ]
    const siguiente = () => {
      const tarea = tareas.shift()
      if (!tarea || status.value !== 'ready') return
      try {
        tarea()
      } catch (err) {
        console.warn('No se ha podido precalcular:', err)
      }
      if (tareas.length) enReposo(siguiente)
    }
    enReposo(siguiente)
  }

  /** Mejores counters contra un jefe con esos tipos. */
  const counters = (bossTypes, options = {}) =>
    cached(`cnt:${bossTypes.join('+')}:${JSON.stringify(options)}`, () =>
      computeCounters(
        roster.value,
        moves.value,
        chart.value,
        { types: bossTypes },
        {
          limit: 12,
          ...options
        }
      )
    )

  /** Debilidades y resistencias de una combinación de tipos. */
  const matchups = (pokemonTypes) =>
    cached(`mat:${pokemonTypes.join('+')}`, () =>
      typeMatchups(chart.value, pokemonTypes, types.value)
    )

  /** Mejores conjuntos de ataques de un Pokémon del roster. */
  const bestMovesets = (entry, limit = 5) =>
    cached(`sets:${entry.id}:${limit}`, () => evaluatePokemon(entry, moves.value).slice(0, limit))

  /**
   * Sus conjuntos contra los jefes débiles a `tipo`, como las listas por tipo
   * del Top: los que llevan algún ataque de ese tipo.
   */
  const conjuntosContra = (entry, tipo) =>
    cached(`contra:${entry.id}:${tipo}`, () =>
      evaluatePokemon(entry, moves.value, contraTipo(tipo))
    )

  /**
   * Las megas (y primigenios) que más le suben el eDPS en una incursión, con
   * su mejor conjunto: ×1,3 a los ataques de sus tipos y ×1,1 al resto. Un
   * primigenio potencia los tipos de su clima (Kyogre los de lluvia, Groudon
   * los de sol). La propia forma no cuenta: una mega no se potencia a sí misma.
   * Devuelve [{ entry, ganancia }] (0,3 es un 30 %), de más a menos.
   */
  /**
   * Lo que cuesta evolucionar la forma base de un número de Pokédex, si es
   * barato: 12, 25 o 'intercambio' (ver evolucionBarata en build-data). La
   * Pokédex lo usa para su filtro y su marca.
   */
  const evolucionBarataPorDex = computed(() => {
    const porDex = new Map()
    for (const e of roster.value) {
      if (e.shadow || e.mega || e.regional || porDex.has(e.dex)) continue
      porDex.set(e.dex, e.evolucionBarata ?? null)
    }
    return porDex
  })
  const evolucionBarataDe = (dex) => evolucionBarataPorDex.value.get(dex) ?? null
  const dexConEvolucionBarata = computed(() =>
    [...evolucionBarataPorDex.value].filter(([, valor]) => valor).map(([dex]) => dex)
  )

  const potenciadores = (entry, limite = 5) =>
    cached(`potencian:${entry.id}:${limite}`, () => {
      const base = evaluatePokemon(entry, moves.value)[0]?.edps
      if (!base) return []
      const porTipos = new Map()
      const filas = []
      for (const mega of roster.value) {
        if (!mega.mega || !mega.released || mega.id === entry.id) continue
        const tipos = /_primal$/.test(mega.id)
          ? CLIMAS[climaDeTipo(mega.types[0])] ?? mega.types
          : mega.types
        const clave = [...tipos].sort().join('+')
        if (!porTipos.has(clave)) {
          const con = evaluatePokemon(entry, moves.value, { potencia: tipos })[0]?.edps ?? base
          porTipos.set(clave, con / base - 1)
        }
        filas.push({ entry: mega, ganancia: porTipos.get(clave) })
      }
      // Solo las que le dan más que cualquier mega (el ×1,1 a todo).
      return filas
        .filter((f) => f.ganancia > MEGA_OTRO_TIPO - 1 + 1e-6)
        .sort((a, b) => b.ganancia - a.ganancia || a.entry.nameEs.localeCompare(b.entry.nameEs))
        .slice(0, limite)
    })

  /**
   * PC con IVs 15/15/15 en los niveles que importan: 20 (incursión, tarea o
   * huevo), 25 (con clima), 30 y 35 (salvaje) y los topes 40 y 50.
   */
  const perfectCP = (stats) => {
    const ivs = { atk: 15, def: 15, hp: 15 }
    const base = { atk: stats.base_attack, def: stats.base_defense, hp: stats.base_stamina }
    return [15, 20, 25, 30, 35, 40, 50].map((level) => ({ level, cp: calcCP(base, ivs, level) }))
  }

  /**
   * Puesto de cada forma del Pokémon (la normal, la oscura, las megas…) en los
   * rankings PvE, con las opciones por defecto del Top. Se mira sobre los 500
   * primeros de cada tipo: por debajo de ahí el dato ya no le dice nada a nadie.
   *
   * Devuelve una lista por forma, { id, entry, overall, byType }. Antes se
   * quedaba con la primera fila de la especie en cada tipo, y la forma oscura,
   * que en el Top sale aparte, no aparecía nunca en la ficha.
   */
  const pveRanksFor = (dex) =>
    cached(`pveRank:${dex}`, () => {
      const rankings = pveRankings({ limit: 500 })
      const formas = new Map()
      const deLaForma = (row) => {
        if (!formas.has(row.id))
          formas.set(row.id, { id: row.id, entry: row, overall: null, byType: [] })
        return formas.get(row.id)
      }
      for (const row of rankings.overall) if (row.dex === dex) deLaForma(row).overall = row
      for (const [type, list] of Object.entries(rankings.byType)) {
        for (const row of list) if (row.dex === dex) deLaForma(row).byType.push({ type, ...row })
      }
      for (const forma of formas.values()) forma.byType.sort((a, b) => a.rank - b.rank)
      return [...formas.values()]
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
   * Un texto de LeekDuck con la traducción automática, si la hay; si no, tal
   * cual. Es el último recurso: antes van las frases del juego y los patrones.
   */
  const autoTranslate = (text) => {
    if (locale() === 'en' || typeof text !== 'string') return text
    return traducciones.value[text.trim()]?.texto ?? text
  }

  /**
   * Traduce una tarea o bonificación con las frases del propio juego y, si no
   * hay equivalencia, con la traducción automática. Si tampoco hay, el original
   * en inglés. Con la app en inglés no hay nada que traducir.
   */
  const translateText = (text) => {
    if (locale() === 'en') return text
    // Las frases del juego se piden la primera vez que hacen falta. Mientras
    // llegan se enseña la traducción automática, si la hay; al llegar, el
    // texto se vuelve a pintar solo.
    if (estadoAparte.value.texts === 'idle' && status.value === 'ready') cargarTextos()
    const delJuego = translateGameText(text, texts.value)
    return delJuego !== text ? delJuego : autoTranslate(text)
  }

  return {
    roster,
    moves,
    typeChart,
    pvp,
    texts,
    meta,
    maxLive,
    maxLiveEdad,
    maxLiveCaducado,
    maxInfoFor,
    papelesDeMax,
    puestoMaxAtacante,
    defensores,
    defensorPara,
    conClima,
    datosMax,
    status,
    error,
    origen,
    isReady,
    types,
    chart,
    byId,
    baseByDex,
    baseByName,
    fichaBase,
    shinyReleased,
    nombreEs,
    formsByDex,
    load,
    pveRankings,
    counters,
    matchups,
    bestMovesets,
    conjuntosContra,
    generalDe,
    potenciadores,
    evolucionBarataDe,
    dexConEvolucionBarata,
    perfectCP,
    pveRanksFor,
    pvpRanksFor,
    cargarPvp,
    estadoAparte,
    pvpListo,
    traducciones,
    autoTranslate,
    translateText
  }
})

// Sin esto, al recargar en caliente Pinia se queda con la definición anterior
// de la store y los métodos nuevos no existen hasta recargar la página entera.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGameDataStore, import.meta.hot))
}
