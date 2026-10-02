/**
 * Un evento al calendario del móvil, para que avise él.
 *
 * En Apple (iPhone, iPad, Mac) va como fichero de calendario (.ics, RFC 5545)
 * servido por /api/calendario: Safari lo abre con «Añadir al calendario» en
 * vez de descargarlo. En el resto, como enlace a Google Calendar con el evento
 * ya relleno. Lo usan la app y la función de Vercel, así que no hay nada del
 * navegador salvo `esApple`, que recibe lo que necesita.
 *
 * Las fechas se trabajan como las da LeekDuck, en texto: «2026-10-10T14:00:00.000»
 * (hora local de cada jugador: «de 14:00 a 17:00 donde estés») o con «Z» los
 * pocos globales (la Liga de Combates). Las locales van «flotantes», sin zona,
 * que es como las entiende un calendario; las globales, en UTC. Leerlas con
 * Date las movería a la zona de quien las procesa (el servidor va en UTC).
 */

const dos = (n) => String(n).padStart(2, '0')

/**
 * «2026-10-10T14:00:00.000» → { comoUtc, utc }. `comoUtc` son los mismos
 * dígitos leídos como si fueran UTC: sirve para sumar horas sin que se meta
 * ninguna zona horaria por medio.
 */
function leer(valor) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(valor ?? ''))
  if (!m) return null
  return {
    comoUtc: new Date(Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6] ?? 0)),
    utc: /Z$|[+-]00:?00$/.test(String(valor))
  }
}

const formatear = ({ comoUtc: d, utc }) =>
  `${d.getUTCFullYear()}${dos(d.getUTCMonth() + 1)}${dos(d.getUTCDate())}T${dos(
    d.getUTCHours()
  )}${dos(d.getUTCMinutes())}${dos(d.getUTCSeconds())}${utc ? 'Z' : ''}`

/**
 * Inicio y fin en formato de calendario: «20261010T140000» o, si es global,
 * «20261006T200000Z». Sin fin conocido, una hora: un evento de cero minutos
 * no se ve en el calendario. null si el inicio no se entiende.
 */
export function fechasCalendario(inicio, fin) {
  const a = leer(inicio)
  if (!a) return null
  const b = leer(fin) ?? { comoUtc: new Date(a.comoUtc.getTime() + 3600 * 1000), utc: a.utc }
  return { inicio: formatear(a), fin: formatear(b) }
}

/** 20261002T091500Z: la marca de creación, que sí va en UTC. */
const utc = (d) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/** Los textos no pueden llevar comas, puntos y coma ni saltos sin escapar. */
const escapar = (texto) =>
  String(texto ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1')

/** Las líneas de más de 75 caracteres se parten y siguen con un espacio. */
const plegar = (linea) => {
  const trozos = []
  for (let i = 0; i < linea.length; i += 74) trozos.push(linea.slice(i, i + 74))
  return trozos.join('\r\n ')
}

/**
 * @param {{ id: string, titulo: string, inicio: string, fin?: string, url?: string, descripcion?: string }} evento
 *   con `inicio` y `fin` como los da LeekDuck
 * @param {Date} [ahora] para la marca DTSTAMP (los tests la fijan)
 * @returns {string|null} el .ics, o null si el inicio no se entiende
 */
export function eventoIcs(evento, ahora = new Date()) {
  const fechas = fechasCalendario(evento.inicio, evento.fin)
  if (!fechas) return null
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PoGoDex//Eventos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapar(evento.id)}@pogodex`,
    `DTSTAMP:${utc(ahora)}`,
    `DTSTART:${fechas.inicio}`,
    `DTEND:${fechas.fin}`,
    `SUMMARY:${escapar(evento.titulo)}`,
    evento.descripcion && `DESCRIPTION:${escapar(evento.descripcion)}`,
    evento.url && `URL:${evento.url}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean)
  return lineas.map(plegar).join('\r\n') + '\r\n'
}

/**
 * El enlace que abre Google Calendar con el evento ya relleno, para guardarlo
 * de un toque. Las horas sin «Z» las toma en la zona del calendario de cada
 * uno, que es justo lo que son los eventos locales.
 */
export function urlGoogleCalendar({ titulo, inicio, fin, detalles }) {
  const fechas = fechasCalendario(inicio, fin)
  if (!fechas) return null
  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo ?? '',
    dates: `${fechas.inicio}/${fechas.fin}`
  })
  if (detalles) parametros.set('details', detalles)
  return `https://calendar.google.com/calendar/render?${parametros}`
}

/**
 * El enlace a nuestro .ics (/api/calendario), que en Apple abre «Añadir al
 * calendario». Lleva el título que se ve en la app: ya va traducido, y el
 * servidor no tiene con qué traducirlo. Con `descargar`, el mismo fichero
 * para guardarlo (Outlook u otro calendario).
 */
export function urlIcs({ id, titulo, descargar = false }) {
  const parametros = new URLSearchParams({ id: id ?? '' })
  if (titulo) parametros.set('titulo', titulo)
  if (descargar) parametros.set('descargar', '1')
  return `/api/calendario?${parametros}`
}

/**
 * Si el aparato es de Apple: iPhone, iPad o Mac (también con Chrome, que en
 * iPhone lleva «iPhone» en el agente). El iPad se presenta como Mac desde
 * iPadOS 13, pero da igual: los dos van al Calendario de Apple.
 */
export function esApple({ userAgent = '', platform = '' } = {}) {
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent) || /^Mac|^iP/.test(platform)
}

/** Nombre de fichero a partir del título: «dia-de-la-comunidad-pikachu.ics». */
export function nombreIcs(titulo) {
  const base = String(titulo ?? 'evento')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `${base || 'evento'}.ics`
}
