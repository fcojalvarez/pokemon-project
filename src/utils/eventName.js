/**
 * Traducción de los títulos de evento que publica LeekDuck.
 *
 * Los nombres llegan en inglés ("Mega Malamar in Mega Raids") y no están en
 * los ficheros i18n del juego, así que `translateGameText` no puede con ellos.
 * Pero siguen plantillas muy regulares: de los 67 eventos del feed, unos 50
 * encajan en media docena de patrones. Con reconocerlos basta, y no hace falta
 * depender de ninguna web de terceros.
 *
 * El módulo no traduce: reconoce. Devuelve la clave i18n y sus piezas, y es la
 * vista quien las pasa por `$t`, que es donde viven los idiomas.
 */

/**
 * Prefijos de forma que LeekDuck antepone al nombre del Pokémon.
 * Se separan para poder traducir el Pokémon por su nombre base.
 */
const FORM_PREFIXES = [
  [/^Mega\s+/i, 'mega'],
  [/^Gigantamax\s+/i, 'gigantamax'],
  [/^Dynamax\s+/i, 'dynamax'],
  [/^Shadow\s+/i, 'shadow'],
  [/^Primal\s+/i, 'primal'],
  // Las regionales las escribe LeekDuck como prefijo («Hisuian Samurott») y
  // en español van detrás y con «de» («Samurott de Hisui»).
  [/^Alolan\s+/i, 'alola'],
  [/^Galarian\s+/i, 'galar'],
  [/^Hisuian\s+/i, 'hisui'],
  [/^Paldean\s+/i, 'paldea']
]

const RULES = [
  { re: /^(.+?)\s+Spotlight Hour$/i, key: 'spotlightHour' },
  { re: /^(.+?)\s+Raid Hour$/i, key: 'raidHour' },
  { re: /^(.+?)\s+Raid Day$/i, key: 'raidDay' },
  { re: /^(.+?)\s+Max Battle Day$/i, key: 'maxBattleDay' },
  { re: /^(.+?)\s+Catch Mastery$/i, key: 'catchMastery' },
  { re: /^(.+?)\s+Community Day Classic$/i, key: 'communityDayClassic' },
  { re: /^(.+?)\s+Community Day$/i, key: 'communityDay' },
  { re: /^(.+?)\s+during Max Monday$/i, key: 'maxMonday' },
  { re: /^(.+?)\s+in Mega Raids$/i, key: 'megaRaids' },
  { re: /^(.+?)\s+in Shadow Raids$/i, key: 'shadowRaids' },
  { re: /^(.+?)\s+in Elite Raids$/i, key: 'eliteRaids' },
  // El nivel viaja como parámetro: "5-star" y "3-star" comparten plantilla.
  { re: /^(.+?)\s+in (\d+)-star Raid Battles$/i, key: 'starRaids' }
]

/**
 * Descompone un título de evento.
 *
 * @returns {{key: string, pokemon: string, tier: string|null}|null}
 *   null cuando el título no sigue ningún patrón conocido (eventos con nombre
 *   propio como "LEGO Stores and Pokémon GO", que no hay que traducir).
 */
export function parseEventName(name) {
  const clean = String(name ?? '').trim()
  if (!clean) return null

  for (const rule of RULES) {
    const match = rule.re.exec(clean)
    if (!match) continue
    return {
      key: rule.key,
      pokemon: match[1].trim(),
      tier: rule.key === 'starRaids' ? match[2] : null
    }
  }
  return null
}

/**
 * Separa "Xurkitree, Pheromosa, and Buzzwole" en sus tres nombres.
 * Varios eventos anuncian más de un Pokémon y el "and" inglés se cuela en
 * medio de una frase en español.
 */
export function splitPokemonList(name) {
  return String(name ?? '')
    .split(/\s*,\s*and\s+|\s*,\s*|\s+and\s+/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

/**
 * Nombre del Pokémon en español, respetando el prefijo de forma.
 *
 * `namesEs` es un Map de nombre en inglés a nombre en español. Si no está,
 * se devuelve el original: muchos Pokémon se llaman igual en los dos idiomas
 * y quedarse con el inglés es mejor que inventarse nada.
 */
export function translatePokemonName(name, namesEs, translateForm = (form) => form) {
  const clean = String(name ?? '').trim()
  if (!clean) return clean

  for (const [re, form] of FORM_PREFIXES) {
    if (!re.test(clean)) continue
    const base = clean.replace(re, '')
    const baseEs = namesEs?.get(base) ?? base
    return translateForm(form, baseEs)
  }

  return namesEs?.get(clean) ?? clean
}

/**
 * Saca de un título de combate Max qué Pokémon sale y de qué tipo es.
 *
 * LeekDuck no publica el Pokémon en un campo propio: va en el título, con dos
 * formas ("Dynamax Sobble during Max Monday", "Gigantamax Cinderace Max Battle
 * Day"). Algunos no nombran a ninguno ("Dynamax Max Battle Day"), y entonces
 * `pokemon` viene a null en vez de inventarse uno.
 *
 * @returns {{gigantamax: boolean, pokemon: string|null}|null}
 */
export function parseMaxBattle(name) {
  const limpio = String(name ?? '')
    .trim()
    .replace(/\s+during\s+max\s+monday$/i, '')
    .replace(/\s+max\s+battle\s+day$/i, '')

  const match = /^(dynamax|gigantamax)\b\s*(.*)$/i.exec(limpio)
  if (!match) return null

  const pokemon = match[2].trim()
  return {
    gigantamax: match[1].toLowerCase() === 'gigantamax',
    pokemon: pokemon || null
  }
}
