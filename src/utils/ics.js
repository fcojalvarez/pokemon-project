/**
 * Un evento como fichero de calendario (.ics, RFC 5545), para meterlo en el
 * calendario del móvil y que avise él.
 *
 * Las horas van «flotantes» (sin zona): los eventos de Pokémon GO son a la
 * hora local de cada jugador («de 14:00 a 17:00 donde estés»), que es justo
 * como las publica LeekDuck y como las entiende un .ics sin zona horaria.
 */

const dos = (n) => String(n).padStart(2, '0')

/** 20261007T180000: la fecha en hora local, sin zona. */
const flotante = (d) =>
  `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}T${dos(d.getHours())}${dos(
    d.getMinutes()
  )}${dos(d.getSeconds())}`

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
 * @param {{ id: string, titulo: string, inicio: Date, fin?: Date, url?: string, descripcion?: string }} evento
 * @param {Date} [ahora] para la marca DTSTAMP (los tests la fijan)
 */
export function eventoIcs(evento, ahora = new Date()) {
  // Sin fin conocido, una hora: un evento de cero minutos no se ve en el calendario.
  const fin = evento.fin ?? new Date(evento.inicio.getTime() + 3600 * 1000)
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PoGoDex//Eventos//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapar(evento.id)}@pogodex`,
    `DTSTAMP:${utc(ahora)}`,
    `DTSTART:${flotante(evento.inicio)}`,
    `DTEND:${flotante(fin)}`,
    `SUMMARY:${escapar(evento.titulo)}`,
    evento.descripcion && `DESCRIPTION:${escapar(evento.descripcion)}`,
    evento.url && `URL:${evento.url}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean)
  return lineas.map(plegar).join('\r\n') + '\r\n'
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

/** Descarga el .ics: el móvil lo ofrece abrir con su calendario. */
export function descargarIcs(nombre, texto) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/calendar;charset=utf-8' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
