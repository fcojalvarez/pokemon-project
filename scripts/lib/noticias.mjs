/**
 * Noticias oficiales de Pokémon GO (pokemongo.com/es/news) y su evento.
 *
 * LeekDuck no publica la descripción de los eventos: solo título, fechas y
 * algunos datos sueltos, y para saber los bonus había que ir a su web. La web
 * oficial sí la tiene, entera y ya en español con los nombres del juego:
 * horario, Pokémon destacados, bonus con sus notas, investigaciones… Aquí se
 * lee esa página y se busca a qué evento de LeekDuck corresponde.
 *
 * Es lógica pura (sin red) para poder probarla: si Niantic rehace la web,
 * salta en tests/noticias.spec.js.
 */
import { aShinyEnTodo, normalizeName } from '../../src/utils/gameText.js'

const ENTIDADES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' '
}
const texto = (html) =>
  String(html ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTIDADES[e] ?? e)
    .replace(/\s+/g, ' ')
    .trim()

/** Direcciones de las noticias que enlaza la portada, sin repetir y en orden. */
export function slugsDePortada(html, idioma = 'es') {
  const re = new RegExp(`href="/${idioma}/news/([a-z0-9-]+)"`, 'g')
  return [...new Set([...String(html).matchAll(re)].map((m) => m[1]))]
}

/**
 * Una noticia: título, imagen, fecha de publicación y sus secciones.
 *
 * Cada sección es un <h2> con su bloque de texto detrás; de ese bloque se
 * sacan párrafos, subtítulos y elementos de lista, que es lo que tiene la web
 * (los bonus van en listas). La despedida («—El equipo de Pokémon GO») y el
 * pie de página no son contenido y se quedan fuera.
 *
 * @returns {{titulo: string, imagen: string|null, publicada: string|null,
 *            secciones: {titulo: string, bloques: {t: string, x: string}[]}[]}|null}
 */
export function leerNoticia(html) {
  const doc = String(html ?? '')
  const meta = (propiedad) =>
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]+property="${propiedad}"`).exec(doc)?.[1] ??
    new RegExp(`<meta[^>]+property="${propiedad}"[^>]+content="([^"]*)"`).exec(doc)?.[1] ??
    null

  const titulo = texto(meta('og:title') ?? '').replace(/\s+—\s+Pokémon GO$/, '')
  if (!titulo) return null
  const marca = /timestamp="(\d{12,})"/.exec(doc)?.[1]

  // El cuerpo: de la primera sección al pie.
  const inicio = doc.search(/<h2[^>]*>/)
  if (inicio < 0)
    return {
      titulo,
      imagen: meta('og:image'),
      publicada: marca ? new Date(Number(marca)).toISOString() : null,
      secciones: []
    }
  const finPie = doc.indexOf('<footer', inicio)
  const cuerpo = doc.slice(inicio, finPie > 0 ? finPie : undefined)

  const secciones = []
  for (const trozo of cuerpo.split(/(?=<h2[^>]*>)/)) {
    const cabecera = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(trozo)
    if (!cabecera) continue
    const resto = trozo.slice(cabecera.index + cabecera[0].length)
    const bloques = []
    for (const m of resto.matchAll(/<(p|li|h3|h4)[^>]*>([\s\S]*?)<\/\1>/g)) {
      const x = texto(m[2])
      if (!x || /^—\s*El equipo de Pokémon GO/i.test(x) || /^—\s*The Pokémon GO team/i.test(x))
        continue
      bloques.push({ t: m[1] === 'h4' ? 'h3' : m[1], x })
    }
    const nombre = texto(cabecera[1])
    // La promoción de Campfire que llevan muchas al final no es del evento.
    if (/^¿Buscas Entrenadores|^Looking for Trainers/i.test(nombre)) continue
    if (nombre && bloques.length) secciones.push({ titulo: nombre, bloques })
  }

  return {
    titulo,
    imagen: meta('og:image'),
    publicada: marca ? new Date(Number(marca)).toISOString() : null,
    secciones: depurar(secciones)
  }
}

/** Secciones que no son del evento: cómo jugar en general, tienda, promoción. */
const SECCIONES_FUERA = [
  /^¿Dónde (puedo|podéis) encontrar/i,
  /^Where can I find/i,
  /^Tienda en línea/i,
  /^Pokémon GO Web Store/i,
  /^¿Buscas Entrenadores/i,
  /^Looking for Trainers/i
]

/** «Sábado 10 de octubre de 2026 de 14:00 a 17:00…» / «Saturday, October 10, 2026…». */
const FECHA =
  /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b.*\b20\d\d\b/i

/** Frases de relleno o del pie de la web que se cuelan al final. */
const FRASES_FUERA = [
  /^Prestad siempre atención a vuestro entorno/i,
  /^Always be aware of your surroundings/i,
  /^Noticias\s*Temporadas/i,
  /^News\s*Seasons/i,
  /©/,
  /^Aquí podéis obtener más información/i,
  /^Pronto podréis echarle un vistazo/i,
  // Lo de siempre sobre las entradas: cómo regalarlas, reembolsos, restricciones.
  /^Prestad atención para saber cuándo/i,
  /podéis comprar y regalar entradas/i,
  /^Para regalar una entrada/i,
  /no son reembolsables/i,
  /^\*?Se aplicarán determinadas restricciones/i,
  /can (now )?purchase and gift tickets/i,
  /^To gift a ticket/i,
  /non-refundable/i,
  /^\*?Some restrictions apply/i
]

/**
 * Deja lo que sirve de una noticia: la de Cinderace Gigamax traía cómo buscar
 * Combates Max en general, la tienda en línea, el aviso de seguridad y hasta
 * el menú del pie. Se queda lo que dice algo del evento:
 *
 *   - Fuera las secciones genéricas y la primera si solo repite la fecha (la
 *     tarjeta ya la da).
 *   - Fuera las frases que solo presentan una lista sin dar un dato («También
 *     recibiréis estos bonus:») y los párrafos larguísimos de relleno.
 *   - Se quedan las listas y todo lo que lleve fechas o cifras («Los bonus
 *     siguientes estarán activos el 2 de octubre de 00:00 a 17:00»).
 */
export function depurar(secciones) {
  const salida = []
  secciones.forEach((seccion, i) => {
    if (SECCIONES_FUERA.some((re) => re.test(seccion.titulo))) return
    const bloques = seccion.bloques.filter((b, j, todos) => {
      if (FRASES_FUERA.some((re) => re.test(b.x))) return false
      // La línea de fecha y hora del principio: la tarjeta ya la da.
      if (i === 0 && b.t === 'p' && b.x.length < 120 && FECHA.test(b.x)) return false
      if (b.t !== 'p') return true
      const conDato = /\d/.test(b.x)
      const presentaLista = todos[j + 1]?.t === 'li' && b.x.length < 140
      if (presentaLista && !conDato) return false
      if (b.x.length > 280 && !conDato) return false
      return true
    })
    // La primera sección suele ser solo el título del evento y su horario.
    if (i === 0 && bloques.length <= 1 && bloques.every((b) => b.t === 'p')) return
    if (bloques.length) salida.push({ ...seccion, bloques })
  })
  // «shiny», no «variocolor», como en el resto de la app.
  return aShinyEnTodo(salida)
}

/** Los bonus de la noticia, para enseñarlos en la tarjeta sin abrir el detalle. */
export function bonusDe(noticia) {
  return (noticia?.secciones ?? [])
    .filter((s) => /bonus|bonificaci/i.test(s.titulo))
    .flatMap((s) => s.bloques.filter((b) => b.t === 'li').map((b) => b.x))
}

// ---------------------------------------------------------------------------
// Qué noticia es de qué evento
// ---------------------------------------------------------------------------

/** Palabras que no distinguen un evento de otro. */
const COMUNES = new Set([
  'pokemon',
  'go',
  'the',
  'and',
  'in',
  'of',
  'a',
  'to',
  'with',
  'event',
  'events',
  'day',
  'hour',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'season',
  'celebration',
  'part',
  'i',
  'ii'
])

/** Palabras que LeekDuck escribe pegadas y la web oficial por separado. */
const PEGADAS = {
  communityday: ['community', 'day'],
  communitydayclassic: ['community', 'day', 'classic'],
  raidhour: ['raid', 'hour'],
  raidday: ['raid', 'day'],
  spotlighthour: ['spotlight', 'hour'],
  pokemonspotlighthour: ['spotlight', 'hour'],
  gbl: ['battle', 'league'],
  tgr: ['team', 'rocket'],
  gofest: ['fest'],
  megafinale: ['mega', 'finale']
}

/** Palabras con peso de un identificador: sin comunes, años ni números. */
export function palabras(textoLibre) {
  const salida = new Set()
  for (const trozo of String(textoLibre ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)) {
    // «communityday2026» o «raidhour20261007»: letras por un lado, cifras por otro.
    for (const parte of trozo.split(/(\d+)/).filter(Boolean)) {
      if (/^\d+$/.test(parte)) continue
      for (const p of PEGADAS[parte] ?? [parte.replace(/s$/, '')]) {
        if (p.length > 1 && !COMUNES.has(p)) salida.add(p)
      }
    }
  }
  return salida
}

const dice = (a, b) => {
  if (!a.size || !b.size) return 0
  let comunes = 0
  for (const x of a) if (b.has(x)) comunes++
  return (2 * comunes) / (a.size + b.size)
}

const sinTildes = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * La noticia de cada evento, o ninguna si no hay una que encaje con seguridad.
 *
 *   1. La misma dirección en las dos webs (la mitad de los casos).
 *   2. Liga Combates GO: una noticia por temporada para todas sus copas.
 *   3. Si no, la que más palabras comparta (índice de Dice ≥ 0,75), publicada
 *      antes del evento y como mucho dos meses antes.
 *
 * Y si el evento nombra Pokémon, tienen que salir en el texto de la noticia:
 * así el City Safari de Brisbane no se engancha a la noticia de los de Europa.
 *
 * @param {object[]} eventos de ScrapedDuck
 * @param {Record<string, object>} noticias slug → noticia leída
 * @param {Set<string>} especies nombres de Pokémon normalizados
 */
export function asociarEventos(eventos, noticias, especies = new Set()) {
  const salida = {}
  const lista = Object.entries(noticias).map(([slug, n]) => ({
    slug,
    n,
    palabras: palabras(slug),
    contenido: sinTildes(
      `${n.titulo} ${n.secciones
        .map((s) => `${s.titulo} ${s.bloques.map((b) => b.x).join(' ')}`)
        .join(' ')}`
    )
  }))

  for (const evento of eventos) {
    const id = evento?.eventID
    if (!id) continue
    if (noticias[id]) {
      salida[id] = id
      continue
    }

    const inicio = evento.start ? new Date(evento.start) : null
    const aTiempo = (n) => {
      if (!inicio || !n.publicada) return true
      const dias = (inicio - new Date(n.publicada)) / 86_400_000
      return dias >= -1 && dias <= 60
    }
    const suyas = palabras(`${id} ${evento.name ?? ''}`)
    const pokemon = [...suyas].filter((p) => especies.has(normalizeName(p)))
    const nombraA = (candidata) => pokemon.every((p) => candidata.contenido.includes(p))

    let mejor = null
    if (evento.eventType === 'go-battle-league') {
      const temporada = lista.filter((c) => c.slug.startsWith('go-battle-league') && aTiempo(c.n))
      mejor =
        temporada.find((c) =>
          [...c.palabras].some((p) => p !== 'battle' && p !== 'league' && suyas.has(p))
        ) ?? null
    } else {
      let nota = 0
      for (const c of lista) {
        if (!aTiempo(c.n) || !nombraA(c)) continue
        const d = dice(suyas, c.palabras)
        if (d > nota) {
          nota = d
          mejor = c
        }
      }
      if (nota < 0.75) mejor = null
    }
    if (mejor) salida[id] = mejor.slug
  }
  return salida
}
