/**
 * GET /api/calendario?id=<eventID>&titulo=<título traducido>[&descargar=1]
 *
 * Un evento como fichero de calendario (.ics) para el Calendario de Apple. En
 * iPhone, iPad y Mac, un enlace a esto abre «Añadir al calendario» en vez de
 * descargar un fichero: Safari lo reconoce por el tipo `text/calendar`.
 * Generarlo en el navegador no sirve para eso: un fichero hecho allí solo se
 * puede descargar.
 *
 * El evento se busca en el mismo feed de ScrapedDuck que lee la app, por su
 * id: de la petición solo se toma el título, que la app ya trae traducido y
 * aquí no habría con qué traducirlo. Lo demás (fechas, enlace) sale del feed.
 */
import { FEEDS } from '../src/utils/liveFeed.js'
import { eventoIcs, nombreIcs } from '../src/utils/ics.js'

/** Los eventID de LeekDuck: letras, números y guiones. */
const ID_VALIDO = /^[\w-]{1,150}$/

/** El título que manda la app: sin saltos ni caracteres de control, y acotado. */
const limpiarTitulo = (texto) =>
  String(texto ?? '')
    .replace(/\p{Cc}+/gu, ' ')
    .trim()
    .slice(0, 200)

/** El enlace del evento en LeekDuck, solo si es de LeekDuck. */
const enlaceLeekDuck = (url) => (/^https:\/\/leekduck\.com\//.test(url ?? '') ? url : undefined)

export default async function handler(req, res) {
  const id = String(req.query?.id ?? '')
  if (!ID_VALIDO.test(id)) {
    res.status(400).send('Falta el evento.')
    return
  }

  let eventos
  try {
    const respuesta = await fetch(FEEDS.events, { signal: AbortSignal.timeout(8000) })
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
    eventos = await respuesta.json()
  } catch {
    res.status(502).send('No se ha podido leer la lista de eventos. Inténtalo en un rato.')
    return
  }

  const evento = (Array.isArray(eventos) ? eventos : []).find((e) => e.eventID === id)
  const titulo = limpiarTitulo(req.query?.titulo) || evento?.name
  const enlace = enlaceLeekDuck(evento?.link)
  const ics =
    evento &&
    eventoIcs({
      id,
      titulo,
      inicio: evento.start,
      fin: evento.end,
      url: enlace,
      descripcion: enlace
    })
  if (!ics) {
    res.status(404).send('Ese evento ya no está en la lista o no tiene fecha.')
    return
  }

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  // inline: que se abra con el Calendario. Con descargar=1, para guardarlo.
  const modo = req.query?.descargar === '1' ? 'attachment' : 'inline'
  res.setHeader('Content-Disposition', `${modo}; filename="${nombreIcs(titulo)}"`)
  // Las fechas de un evento casi nunca cambian; unos minutos de caché bastan.
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.status(200).send(ics)
}
