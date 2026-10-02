/**
 * El feed en vivo de ScrapedDuck (que scrapea LeekDuck): de dónde se baja y
 * cómo se leen sus fechas e imágenes.
 *
 * Va aparte de la store (stores/live.js) para que lo usen también los scripts
 * de datos, que corren en Node sin Pinia.
 */
const BASE = 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data'

export const FEEDS = {
  events: `${BASE}/events.json`,
  raids: `${BASE}/raids.json`,
  eggs: `${BASE}/eggs.json`,
  research: `${BASE}/research.json`
}

/**
 * Cuánto vale la caché. Las incursiones, huevos y tareas del feed no llevan
 * fecha: son "lo que hay ahora". Lo único que dice si siguen valiendo es
 * cuándo se descargaron, así que pasado este plazo no se muestran como
 * actuales: o se recarga, o se avisa de que son viejas.
 */
export const MAX_CACHE_AGE_MS = 6 * 60 * 60 * 1000

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

/** 'upcoming', 'active', 'past' o, sin fecha de inicio, 'undated'. */
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
 * ¿Siguen valiendo unos datos descargados en `fetchedAt`? Es la regla que
 * decide si al abrir la app se enseñan las incursiones guardadas o se espera
 * a las nuevas.
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
  const file =
    String(url ?? '')
      .split('/')
      .pop() ?? ''
  const match = /pm(\d+)|pokemon_icon_(\d+)/.exec(file)
  if (!match) return null
  return Number(match[1] ?? match[2])
}
