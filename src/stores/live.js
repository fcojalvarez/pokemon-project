import { computed, ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { normalizeName } from '../utils/gameText'

// Se reexporta porque es aquí donde la buscan quienes ya la usaban.
export { normalizeName }

const FEEDS = {
  events: 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json',
  raids: 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json',
  eggs: 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json',
  research: 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/research.json'
}

const STORAGE_KEY = 'pogodex:live'

/**
 * Cuánto vale la caché. Las incursiones, huevos y tareas del feed no llevan
 * fecha: son "lo que hay ahora". Lo único que dice si siguen valiendo es
 * cuándo se descargaron, así que pasado este plazo no se muestran como
 * actuales: o se recarga, o se avisa de que son viejas.
 */
const MAX_CACHE_AGE_MS = 6 * 60 * 60 * 1000

/**
 * LeekDuck publica las fechas en hora local sin zona horaria
 * ("2026-09-26T10:00:00.000"), que es justo como funcionan los eventos de
 * Pokémon GO: a las 10:00 de donde estés. new Date() ya lo interpreta así.
 */
export function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function eventStatus(event, now = new Date()) {
  const start = parseDate(event.start)
  const end = parseDate(event.end)
  if (start && end) {
    if (now < start) return 'upcoming'
    if (now > end) return 'past'
    return 'active'
  }
  if (start && !end) return now < start ? 'upcoming' : 'active'
  return 'undated'
}

/**
 * ¿Siguen valiendo unos datos descargados en `fetchedAt`?
 *
 * Se separa de la store para poder probarla: es la regla que decide si al
 * abrir la app se enseñan las incursiones guardadas o se espera a las nuevas.
 */
export function isCacheExpired(fetchedAt, now = new Date(), maxAgeMs = MAX_CACHE_AGE_MS) {
  const at = parseDate(fetchedAt)
  if (!at) return true
  return now.getTime() - at.getTime() > maxAgeMs
}

/**
 * Número de Pokédex a partir de la imagen de LeekDuck.
 * Los ficheros se llaman `pm147.icon.png` o `pokemon_icon_147_00.png`, así que
 * el número sale de ahí sin tener que adivinarlo por el nombre.
 */
export function dexFromImage(url) {
  const file = String(url ?? '').split('/').pop() ?? ''
  const match = /pm(\d+)|pokemon_icon_(\d+)/.exec(file)
  if (!match) return null
  return Number(match[1] ?? match[2])
}

/** Normaliza un nombre de LeekDuck para poder cruzarlo con la Pokédex. */
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
 * (que scrapea LeekDuck). Se guardan en localStorage para que la app abra con
 * algo útil aunque no haya cobertura.
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
    if (status.value === 'loading') return
    if (!isCacheExpired(fetchedAt.value)) return
    load({ force: true })
  }

  if (typeof window !== 'undefined') {
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

  const withStatus = computed(() =>
    events.value.map((event) => ({
      ...event,
      status: eventStatus(event, statusClock.value),
      startDate: parseDate(event.start),
      endDate: parseDate(event.end)
    }))
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

  const undated = computed(() => withStatus.value.filter((e) => e.status === 'undated'))

  /** Hace cuánto se descargaron los datos, en ms. null si nunca. */
  const cacheAge = computed(() => {
    if (!fetchedAt.value) return null
    const at = parseDate(fetchedAt.value)
    return at ? statusClock.value.getTime() - at.getTime() : null
  })

  /** Datos con más de MAX_CACHE_AGE_MS: hay que avisar de que son viejos. */
  const isStale = computed(() => stale.value || (cacheAge.value ?? 0) > MAX_CACHE_AGE_MS)

  const past = computed(() =>
    withStatus.value
      .filter((e) => e.status === 'past')
      .sort((a, b) => (b.endDate?.getTime() ?? 0) - (a.endDate?.getTime() ?? 0))
  )

  const groupBy = (list, key, order) => {
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

const TIER_ORDER = [
  '1-Star Raids',
  '3-Star Raids',
  '5-Star Raids',
  'Mega Raids',
  'Elite Raids'
]

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
        list: [...oscuros].sort(
          (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
        )
      })
    }

    return grupos
  })

  const eggsByType = computed(() =>
    groupBy(eggs.value, 'eggType', ['1 km', '2 km', '5 km', '7 km', '10 km', '12 km'])
  )

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

  const load = async ({ force = false } = {}) => {
    if (status.value === 'loading') return
    if (status.value === 'ready' && !force) return

    const hadCache = hydrateFromCache()
    status.value = hadCache ? 'ready' : 'loading'
    error.value = null

    try {
      const [ev, rd, eg, rs] = await Promise.all(
        Object.values(FEEDS).map(async (url) => {
          const res = await fetch(url, { cache: 'no-cache' })
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
    withStatus,
    active,
    upcoming,
    undated,
    past,
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
