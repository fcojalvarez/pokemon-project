/**
 * Formas y disfraces de cada Pokémon, con la imagen del propio juego.
 *
 * La Pokédex enseña una sola imagen por especie, y había cosas que no se veían:
 * los 20 motivos de Vivillon, las formas de Zygarde, el Rockruff Crepuscular o
 * los disfraces (170 variantes solo de Pikachu). pokemon-go-api publica todas
 * con sus iconos, que son los del juego, en versión normal y variocolor.
 *
 * Los nombres de las formas salen de los textos del juego («Motivo Isleño»);
 * los disfraces no tienen nombre en ellos, solo un código («HOLIDAY_2016»), así
 * que se arma uno legible con las palabras que usan.
 *
 * El juego trae también disfraces que aún no han salido: se enseñan todos, y
 * se marca el variocolor de los que LeekDuck da como liberado.
 */

// De cada icono se guarda solo el nombre del fichero, sin carpeta ni
// extensión: la URL la arma la app (src/utils/formas.js).

const PALABRAS = {
  ANNIVERSARY: ['Aniversario', 'Anniversary'],
  HOLIDAY: ['Fiestas', 'Holiday'],
  HALLOWEEN: ['Halloween', 'Halloween'],
  FALL: ['Otoño', 'Fall'],
  SPRING: ['Primavera', 'Spring'],
  SUMMER: ['Verano', 'Summer'],
  WINTER: ['Invierno', 'Winter'],
  HAT: ['Sombrero', 'Hat'],
  NIGHTCAP: ['Gorro de dormir', 'Nightcap'],
  BANDANA: ['Pañuelo', 'Bandana'],
  FASHION: ['Moda', 'Fashion'],
  GEMS: ['Gemas', 'Gems'],
  ROYAL: ['Real', 'Royal'],
  SAFARI: ['Safari', 'Safari'],
  GOFEST: ['GO Fest', 'GO Fest'],
  GOTOUR: ['GO Tour', 'GO Tour'],
  TCG: ['JCC', 'TCG'],
  INSTINCT: ['Instinto', 'Instinct'],
  MYSTIC: ['Sabiduría', 'Mystic'],
  VALOR: ['Valor', 'Valor'],
  KANTO: ['Kanto', 'Kanto'],
  JOHTO: ['Johto', 'Johto'],
  HOENN: ['Hoenn', 'Hoenn'],
  SINNOH: ['Sinnoh', 'Sinnoh'],
  INDONESIA: ['Indonesia', 'Indonesia'],
  HORIZONS: ['Horizontes', 'Horizons'],
  YEAR: ['Año', 'Year'],
  FLYING: ['Volador', 'Flying'],
  ADVENTURE: ['Aventura', 'Adventure'],
  COPY: ['Copia', 'Copy'],
  JAN: ['enero', 'January'],
  FEB: ['febrero', 'February'],
  APRIL: ['abril', 'April'],
  MAY: ['mayo', 'May'],
  NOVEMBER: ['noviembre', 'November'],
  // Solo dice que no evoluciona: no aporta al nombre.
  NOEVOLVE: [null, null],
  COSTUME: ['Disfraz', 'Costume']
}

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()

/** «HOLIDAY_2016» → «Fiestas 2016» / «Holiday 2016». */
export function nombreDisfraz(codigo) {
  const partes = String(codigo ?? '').split('_').filter(Boolean)
  const traducir = (i) =>
    partes
      .map((parte) => {
        const conocida = PALABRAS[parte.toUpperCase()]
        if (conocida) return conocida[i]
        return /^\d+$/.test(parte) ? parte : capitalizar(parte)
      })
      .filter(Boolean)
      .join(' ')
  const primeraMayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1)
  return { es: primeraMayuscula(traducir(0)) || codigo, en: traducir(1) || codigo }
}

/** El fichero del icono, sin carpeta ni extensión: «pm666.fARCHIPELAGO». */
const fichero = (url) => String(url ?? '').split('/').pop().replace(/(\.s)?\.icon\.png$/, '')

/**
 * @param {object[]} pga Pokédex de pokemon-go-api
 * @param {{es: Map, en: Map, shinyLeekDuck: object[]}} fuentes
 * @returns {Record<number, {formas: object[], disfraces: object[]}>}
 */
export function buildFormas(pga, { es, en, shinyLeekDuck = [] }) {
  const conVariocolor = new Map(shinyLeekDuck.filter((uno) => uno?.aa_fn).map((uno) => [uno.aa_fn, uno.released_date]))
  const salida = {}

  for (const p of pga) {
    const variantes = p.assetForms ?? []
    if (variantes.length < 2) continue
    const especie = String(p.id ?? '').toLowerCase()

    const nombreForma = (forma) => {
      const clave = String(forma).toLowerCase()
      for (const k of [`form_${especie}_${clave}`, `form_${clave}`]) {
        if (es.get(k)) return { es: es.get(k), en: en.get(k) ?? es.get(k) }
      }
      // Sin nombre en el juego (las formas de Pikachu): como los disfraces.
      return nombreDisfraz(forma)
    }

    const formas = []
    const disfraces = []
    for (const v of variantes) {
      const f = fichero(v.image)
      if (!f) continue
      let nombre = v.costume ? nombreDisfraz(v.costume) : v.form ? nombreForma(v.form) : { es: 'Normal', en: 'Normal' }
      if (v.isFemale) nombre = { es: `${nombre.es} · hembra`, en: `${nombre.en} · female` }
      const fecha = conVariocolor.get(f)
      const entrada = { f, es: nombre.es, en: nombre.en, ...(fecha ? { s: fecha.replace(/\//g, '-') } : {}) }
      ;(v.costume ? disfraces : formas).push(entrada)
    }
    // El juego tiene variantes que se llaman igual (Zygarde 50 % y el 50 % que
    // puede completarse): se enseña una.
    const sinRepetir = (lista) => lista.filter((uno, i) => lista.findIndex((otro) => otro.es === uno.es) === i)
    salida[p.dexNr] = { formas: sinRepetir(formas), disfraces: sinRepetir(disfraces) }
  }
  return salida
}
