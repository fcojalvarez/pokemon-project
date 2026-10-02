import { computed, ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { normalizeName } from '../utils/gameText'
import { FEEDS, MAX_CACHE_AGE_MS, eventStatus, isCacheExpired, parseDate } from '../utils/liveFeed'

const STORAGE_KEY = 'pogodex:live'

const TIER_ORDER = ['1-Star Raids', '3-Star Raids', '5-Star Raids', 'Mega Raids', 'Elite Raids']

const EGG_ORDER = ['1 km', '2 km', '5 km', '7 km', '10 km', '12 km']

/**
 * Cuánto se espera a cada feed. Sin plazo, con mala cobertura y sin caché,
 * el esqueleto se quedaba puesto hasta que el navegador se rendía (minutos).
 */
const ESPERA_MAXIMA_MS = 15000

/**
 * Tras un intento fallido, cuánto esperar para volver a intentarlo solo. Sin
 * red, la recarga automática lo reintentaba cada 30 s para siempre.
 */
const REINTENTO_MS = 5 * 60 * 1000

/** Agrupa por `key` y ordena los grupos según `order` (los desconocidos, al final). */
function groupBy(list, key, order) {
  const groups = new Map()
  for (const item of list) {
    if (!groups.has(item[key])) groups.set(item[key], [])
    groups.get(item[key]).push(item)
  }
  return [...groups.entries()]
    .sort((a, b) => {
      const ia = order.indexOf(a[0])
      const ib = order.indexOf(b[0])
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    .map(([name, list]) => ({ name, list }))
}

function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* cuota llena o modo privado: se sigue sin caché */
  }
}

/**
 * Eventos, incursiones, huevos e investigaciones en vivo desde ScrapedDuck
 * (que scrapea LeekDuck, ver utils/liveFeed.js). Se guardan en localStorage
 * para que la app abra con algo útil aunque no haya cobertura.
 */
export const useLiveStore = defineStore('live', () => {
  const events = ref([])
  const raids = ref([])
  const eggs = ref([])
  const research = ref([])
  const status = ref('idle')
  const error = ref(null)
  const fetchedAt = ref(null)
  const stale = ref(false)
  // Dos relojes a propósito: `now` va al segundo porque las cuentas atrás de
  // la última hora lo necesitan, y `statusClock` va cada 30 s porque recalcular
  // el estado de todos los eventos (y repintar sus tarjetas) una vez por
  // segundo era tirar batería sin que cambiara nada en pantalla.
  const now = ref(new Date())
  const statusClock = ref(new Date())

  /**
   * Vuelve a bajar los datos si la caché ha caducado y la pestaña está a la
   * vista. Antes esto lo hacía un botón «Actualizar»: los datos solo se
   * pedían al entrar en la vista, así que dejándola abierta el «Actualizado
   * hace» crecía sin que se refrescara nada.
   *
   * No hace nada si ya se está cargando ni con la pestaña oculta, así que una
   * pestaña olvidada de fondo no se pasa el día pidiendo ficheros.
   */
  const refrescarSiCaduca = () => {
    if (typeof document !== 'undefined' && document.hidden) return
    if (enCurso) return
    if (!isCacheExpired(fetchedAt.value)) return
    if (Date.now() - ultimoIntento < REINTENTO_MS) return
    load({ force: true })
  }

  /**
   * Los relojes arrancan con la primera carga y no al crear la store: la
   * crea también la ficha de un Pokémon, que no enseña nada que caduque.
   */
  let relojEnMarcha = false
  const arrancarReloj = () => {
    if (relojEnMarcha || typeof window === 'undefined') return
    relojEnMarcha = true
    let ticks = 0
    setInterval(() => {
      // En una pestaña oculta no hay nada que repintar.
      if (document.hidden) return
      now.value = new Date()
      if (++ticks % 30 === 0) {
        statusClock.value = now.value
        refrescarSiCaduca()
      }
    }, 1000)

    // Al volver a la pestaña, ponerse al día sin esperar al siguiente tic.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return
      now.value = new Date()
      statusClock.value = now.value
      refrescarSiCaduca()
    })
  }

  /**
   * Cada evento con su estado. Si el estado no ha cambiado se devuelve el
   * mismo objeto que la vez anterior: cada 30 s se recalcula, y con objetos
   * nuevos todas las tarjetas de Eventos se volvían a pintar (y a traducir su
   * título) sin que nada hubiera cambiado.
   */
  const conEstado = new WeakMap()
  const withStatus = computed(() =>
    events.value.map((event) => {
      const status = eventStatus(event, statusClock.value)
      const previo = conEstado.get(event)
      if (previo?.status === status) return previo
      const conSuEstado = {
        ...event,
        status,
        startDate: parseDate(event.start),
        endDate: parseDate(event.end)
      }
      conEstado.set(event, conSuEstado)
      return conSuEstado
    })
  )

  const active = computed(() =>
    withStatus.value
      .filter((e) => e.status === 'active')
      .sort((a, b) => (a.endDate?.getTime() ?? Infinity) - (b.endDate?.getTime() ?? Infinity))
  )

  const upcoming = computed(() =>
    withStatus.value
      .filter((e) => e.status === 'upcoming')
      .sort((a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0))
  )

  /** Hace cuánto se descargaron los datos, en ms. null si nunca. */
  const cacheAge = computed(() => {
    if (!fetchedAt.value) return null
    const at = parseDate(fetchedAt.value)
    return at ? statusClock.value.getTime() - at.getTime() : null
  })

  /** Datos con más de MAX_CACHE_AGE_MS: hay que avisar de que son viejos. */
  const isStale = computed(() => stale.value || (cacheAge.value ?? 0) > MAX_CACHE_AGE_MS)

  /**
   * Jefes por nivel, con los oscuros aparte.
   *
   * El feed no les da nivel propio: los reparte entre 1, 3 y 5 estrellas con
   * el nombre empezando por "Shadow", así que un Thundurus oscuro aparecía
   * mezclado con los legendarios normales. Se sacan a su propio grupo y cada
   * uno se queda con su nivel en `tier`, para poder enseñarlo en la tarjeta.
   */
  const raidsByTier = computed(() => {
    const esOscuro = (boss) => /^shadow\s/i.test(boss.name ?? '')
    const normales = raids.value.filter((boss) => !esOscuro(boss))
    const oscuros = raids.value.filter(esOscuro)

    const grupos = groupBy(normales, 'tier', TIER_ORDER).map((grupo) => ({
      ...grupo,
      shadow: false
    }))

    if (oscuros.length) {
      grupos.push({
        name: 'shadow',
        shadow: true,
        list: [...oscuros].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
      })
    }

    return grupos
  })

  // LeekDuck repite a veces el mismo Pokémon en el mismo huevo (Corsola de
  // Galar en 7 km, uno normal y otro de intercambio de regalos): se enseña una vez.
  const eggsByType = computed(() => {
    const vistos = new Set()
    const unicos = eggs.value.filter((egg) => {
      const clave = `${egg.eggType}|${egg.name}`
      if (vistos.has(clave)) return false
      vistos.add(clave)
      return true
    })
    return groupBy(unicos, 'eggType', EGG_ORDER)
  })

  /**
   * Dónde sale ahora mismo un Pokémon concreto: incursiones, huevos y tareas.
   * Se cruza por nombre normalizado porque LeekDuck no publica el número.
   */
  const whereToFind = (pokemonName) => {
    const key = normalizeName(pokemonName)
    const matches = (name) => normalizeName(name).includes(key)

    return {
      raids: raids.value.filter((boss) => matches(boss.name)),
      eggs: eggs.value.filter((egg) => matches(egg.name)),
      research: research.value.filter((task) =>
        (task.rewards || []).some((reward) => matches(reward.name))
      )
    }
  }

  const hydrateFromCache = ({ allowExpired = false } = {}) => {
    const cached = readCache()
    if (!cached) return false

    // Caducada solo como último recurso (sin red): mostrar incursiones de hace
    // una semana como si fueran las de hoy es peor que no mostrar nada.
    if (!allowExpired && isCacheExpired(cached.fetchedAt)) return false

    events.value = cached.events ?? []
    raids.value = cached.raids ?? []
    eggs.value = cached.eggs ?? []
    research.value = cached.research ?? []
    fetchedAt.value = cached.fetchedAt ?? null
    stale.value = true
    return true
  }

  /** La carga en marcha: quien llame mientras tanto espera a la misma. */
  let enCurso = null
  let ultimoIntento = 0

  const load = ({ force = false } = {}) => {
    if (enCurso) return enCurso
    if (status.value === 'ready' && !force) return Promise.resolve()
    arrancarReloj()
    enCurso = bajar().finally(() => {
      enCurso = null
    })
    return enCurso
  }

  const bajar = async () => {
    ultimoIntento = Date.now()
    // Con datos ya en pantalla (una recarga automática) se refresca por
    // detrás: antes volvía a 'loading' y las vistas enseñaban el esqueleto.
    const hadCache = status.value === 'ready' || hydrateFromCache()
    status.value = hadCache ? 'ready' : 'loading'
    error.value = null

    try {
      const [ev, rd, eg, rs] = await Promise.all(
        Object.values(FEEDS).map(async (url) => {
          const res = await fetch(url, {
            cache: 'no-cache',
            signal: AbortSignal.timeout?.(ESPERA_MAXIMA_MS)
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
      )
      events.value = ev
      raids.value = rd
      eggs.value = eg
      research.value = rs
      fetchedAt.value = new Date().toISOString()
      stale.value = false
      status.value = 'ready'
      writeCache({ events: ev, raids: rd, eggs: eg, research: rs, fetchedAt: fetchedAt.value })
    } catch (err) {
      error.value = err.message
      // Sin red tiramos de caché aunque esté caducada, pero marcada: las vistas
      // enseñan desde cuándo es. Si no hay ni eso, error.
      const rescued = hadCache || hydrateFromCache({ allowExpired: true })
      status.value = rescued ? 'ready' : 'error'
    }
  }

  return {
    events,
    raids,
    eggs,
    research,
    status,
    error,
    fetchedAt,
    stale,
    cacheAge,
    isStale,
    now,
    statusClock,
    load,
    active,
    upcoming,
    raidsByTier,
    eggsByType,
    whereToFind
  }
})

// Sin esto, al recargar en caliente Pinia se queda con la definición anterior
// de la store y los métodos nuevos no existen hasta recargar la página entera.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useLiveStore, import.meta.hot))
}
