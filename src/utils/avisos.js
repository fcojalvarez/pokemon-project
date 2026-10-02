/**
 * Avisos en el móvil: de qué eventos se avisa y cuándo.
 *
 * Lo usan la app (para las casillas de qué avisar) y el script que manda los
 * avisos (scripts/send-push.mjs), que corre en Node: por eso aquí no hay nada
 * de Vue ni del navegador.
 */

/**
 * Las categorías que se pueden elegir y los tipos de evento de LeekDuck que
 * entra en cada una. Las rotaciones de incursiones, la Liga de Combates, las
 * temporadas y los pases no avisan: duran semanas y no hay que estar a una hora.
 */
export const CATEGORIAS_AVISO = {
  community: ['community-day'],
  hours: ['pokemon-spotlight-hour', 'raid-hour'],
  raids: ['raid-day', 'max-battles', 'max-mondays'],
  events: ['event', 'pokemon-go-tour', 'wild-area']
}

/** Con cuánta antelación se avisa. */
export const ANTELACION_MS = 60 * 60 * 1000

/** La categoría de un tipo de evento, o null si ese tipo no avisa. */
export function categoriaDeEvento(eventType) {
  for (const [categoria, tipos] of Object.entries(CATEGORIAS_AVISO)) {
    if (tipos.includes(eventType)) return categoria
  }
  return null
}

/** Cuántos minutos va la zona por delante de UTC en ese instante. */
function desfaseMinutos(zona, instante) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
      .formatToParts(instante)
      .map((p) => [p.type, p.value])
  )
  const comoUtc = Date.UTC(
    partes.year,
    partes.month - 1,
    partes.day,
    partes.hour,
    partes.minute,
    partes.second
  )
  return Math.round((comoUtc - instante.getTime()) / 60000)
}

/**
 * El instante en que es esa hora local («2026-10-07T14:00:00», sin zona,
 * como las da LeekDuck) en la zona `zona`. Las fechas que sí traen zona (los
 * eventos globales, con «Z») se respetan tal cual.
 */
export function instanteEnZona(local, zona) {
  if (!local) return null
  if (/[zZ]|[+-]\d\d:?\d\d$/.test(local)) return new Date(local)
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(local)
  if (!m) return null
  const comoUtc = Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6] ?? 0)
  // Dos pasadas: el desfase de la primera puede ser el del otro lado de un
  // cambio de hora.
  let instante = new Date(comoUtc - desfaseMinutos(zona, new Date(comoUtc)) * 60000)
  instante = new Date(comoUtc - desfaseMinutos(zona, instante) * 60000)
  return instante
}

/**
 * Los eventos de los que hay que avisar ahora a alguien de esa zona y con
 * esas categorías: los que empiezan dentro de `antelacion` (y aún no han
 * empezado).
 */
export function eventosPorAvisar(eventos, { ahora, zona, categorias, antelacion = ANTELACION_MS }) {
  const elegidas = new Set(categorias ?? [])
  return (eventos ?? []).filter((evento) => {
    const categoria = categoriaDeEvento(evento.eventType)
    if (!categoria || !elegidas.has(categoria)) return false
    const inicio = instanteEnZona(evento.start, zona)
    if (!inicio) return false
    const falta = inicio.getTime() - ahora.getTime()
    return falta > 0 && falta <= antelacion
  })
}

/** La clave pública VAPID (base64url) como la pide pushManager.subscribe. */
export function claveAplicacion(base64url) {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const binario = atob(base64)
  return Uint8Array.from(binario, (c) => c.charCodeAt(0))
}
