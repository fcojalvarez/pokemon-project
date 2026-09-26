/**
 * Genera los datos estáticos de la app en public/data/.
 *
 *   npm run data          usa la caché de .cache/ si existe
 *   npm run data:fresh    vuelve a descargar todo
 *
 * Fuentes:
 *   - PokeMiners/game_masters  -> stats de movimientos en PvE, tabla de tipos, CPM
 *   - PokeMiners/pogo_assets   -> nombres en español
 *   - pvpoke.com/data          -> roster jugable + stats de movimientos en PvP
 *   - pvpoke.com/data/rankings -> rankings PvP de las tres ligas
 *
 * Los eventos, incursiones, huevos e investigaciones NO se generan aquí:
 * la app los pide en vivo a ScrapedDuck en cada arranque.
 *
 * Además de escribir los ficheros, sube cada uno a la tabla `game_data` de
 * Supabase, para que la base de datos sea la copia de referencia y no haya que
 * redesplegar para actualizar los datos del juego. Necesita SUPABASE_DB_URL
 * (en .env o en el entorno); sin ella genera los ficheros y avisa de que no
 * ha subido nada.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CPM_BY_LEVEL } from '../src/utils/formulas.js'
import { normalizeText } from '../src/utils/gameText.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = path.join(ROOT, '.cache')
const OUT = path.join(ROOT, 'public', 'data')
const FRESH = process.argv.includes('--fresh')
/**
 * En CI la subida es el objetivo, no un extra: sin esto, un secreto mal puesto
 * dejaría el workflow en verde sin haber actualizado nada.
 */
const EXIGE_SUBIDA = process.argv.includes('--must-upload')

/**
 * Lee .env a mano: este script lo arranca Node pelado, sin pasar por Vite, así
 * que nadie le ha cargado las variables. Lo que ya venga del entorno manda.
 */
async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, '.env'), 'utf8')
    // Se parte con \r?\n: en Windows cualquier editor puede guardar el .env
    // con CRLF, y ese \r de más impedía que casara ni una sola línea, así que
    // el script se callaba y no subía nada.
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line)
      if (!match || process.env[match[1]]) continue
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    /* sin .env: se usan las variables del entorno tal cual */
  }
}

/**
 * Sube los ficheros generados a la tabla `game_data`, uno por fila y todo en
 * una transacción: o entran los seis o no entra ninguno, para que la app nunca
 * lea un roster nuevo con unos movimientos viejos.
 */
async function uploadToSupabase(data) {
  const url = process.env.SUPABASE_DB_URL
  if (!url) {
    if (EXIGE_SUBIDA) {
      throw new Error('falta SUPABASE_DB_URL y se ha lanzado con --must-upload')
    }
    console.log('\nSUPABASE_DB_URL sin definir: los ficheros se han escrito, pero no se sube nada.')
    return
  }

  const { default: pg } = await import('pg')
  // El pooler de Supabase va por TLS con un certificado que Node no valida
  // contra su almacén; la conexión sigue cifrada.
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })

  console.log('\nSubiendo a Supabase (game_data)')
  await client.connect()
  try {
    await client.query('BEGIN')
    for (const [file, content] of Object.entries(data)) {
      const name = file.replace(/\.json$/, '')
      const json = JSON.stringify(content)
      await client.query(
        `INSERT INTO public.game_data (name, payload, bytes, generated_at, updated_at)
              VALUES ($1, $2::jsonb, $3, now(), now())
         ON CONFLICT (name) DO UPDATE
                SET payload = EXCLUDED.payload,
                    bytes = EXCLUDED.bytes,
                    generated_at = EXCLUDED.generated_at,
                    updated_at = now()`,
        [name, json, json.length]
      )
      console.log(`  ${name.padEnd(14)} ${(json.length / 1024).toFixed(0)} KB`)
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw new Error(`no se ha podido subir a Supabase: ${err.message}`)
  } finally {
    await client.end()
  }
}

const SOURCES = {
  gm: 'https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json',
  es: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_spanish.json',
  en: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_english.json',
  pvpGm: 'https://pvpoke.com/data/gamemaster.json',
  great: 'https://pvpoke.com/data/rankings/all/overall/rankings-1500.json',
  ultra: 'https://pvpoke.com/data/rankings/all/overall/rankings-2500.json',
  master: 'https://pvpoke.com/data/rankings/all/overall/rankings-10000.json',
  // Una sola llamada para saber el id de sprite de cada forma (megas incluidas).
  forms: 'https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0',
}

/** pvpoke nombra las formas distinto que PokeAPI. */
const FORM_ALIASES = [
  [/-alolan$/, '-alola'],
  [/-galarian$/, '-galar'],
  [/-hisuian$/, '-hisui'],
  [/-paldean/, '-paldea'],
  [/-therian$/, '-therian'],
]

/**
 * Id de sprite de PokeAPI para un Pokémon de pvpoke.
 * Las formas viven en ids ≥ 10000; si no encontramos la forma, se cae al
 * número de Pokédex, que siempre existe.
 */
function spriteIdFor(speciesId, dex, forms) {
  let name = speciesId.replace(/_shadow$/, '').replace(/_/g, '-')
  for (const [re, rep] of FORM_ALIASES) name = name.replace(re, rep)

  if (forms.has(name)) return forms.get(name)

  // Algunas formas de pvpoke no existen en PokeAPI: se usa la base.
  const base = name.split('-')[0]
  if (forms.has(base)) return forms.get(base)

  return dex
}

/** Orden canónico de tipos: es el índice que usa attackScalar en el GAME_MASTER. */
const TYPE_ORDER = [
  'normal', 'fighting', 'flying', 'poison', 'ground', 'rock',
  'bug', 'ghost', 'steel', 'fire', 'water', 'grass',
  'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy',
]

const TYPE_ES = {
  normal: 'Normal', fighting: 'Lucha', flying: 'Volador', poison: 'Veneno',
  ground: 'Tierra', rock: 'Roca', bug: 'Bicho', ghost: 'Fantasma',
  steel: 'Acero', fire: 'Fuego', water: 'Agua', grass: 'Planta',
  electric: 'Eléctrico', psychic: 'Psíquico', ice: 'Hielo',
  dragon: 'Dragón', dark: 'Siniestro', fairy: 'Hada',
}

/** Traducción de los sufijos de forma que usa pvpoke en speciesName. */
const FORM_ES = [
  [/\(Shadow\)/i, '(Oscuro)'],
  [/\(Mega X\)/i, '(Mega X)'],
  [/\(Mega Y\)/i, '(Mega Y)'],
  [/\(Mega\)/i, '(Mega)'],
  [/\(Primal\)/i, '(Primigenio)'],
  [/\(Alolan\)/i, '(Alola)'],
  [/\(Galarian\)/i, '(Galar)'],
  [/\(Hisuian\)/i, '(Hisui)'],
  [/\(Paldean\)/i, '(Paldea)'],
  [/\(Origin\)/i, '(Origen)'],
  [/\(Altered\)/i, '(Modificado)'],
  [/\(Therian\)/i, '(Tótem)'],
  [/\(Incarnate\)/i, '(Avatar)'],
  [/\(Attack\)/i, '(Ataque)'],
  [/\(Defense\)/i, '(Defensa)'],
  [/\(Speed\)/i, '(Velocidad)'],
  [/\(Black\)/i, '(Negro)'],
  [/\(White\)/i, '(Blanco)'],
  [/\(Dawn Wings\)/i, '(Alas del Alba)'],
  [/\(Dusk Mane\)/i, '(Melena Crepuscular)'],
  [/\(Ultra\)/i, '(Ultra)'],
  [/\(Resolute\)/i, '(Brío)'],
  [/\(Ordinary\)/i, '(Habitual)'],
  [/\(Zen\)/i, '(Daruma)'],
  [/\(Standard\)/i, '(Estándar)'],
  [/\(Unbound\)/i, '(Desatado)'],
  [/\(Confined\)/i, '(Contenido)'],
  [/\(Crowned Sword\)/i, '(Espada Suprema)'],
  [/\(Crowned Shield\)/i, '(Escudo Supremo)'],
  [/\(Ice Rider\)/i, '(Jinete Glacial)'],
  [/\(Shadow Rider\)/i, '(Jinete Espectral)'],
  [/\(Single Strike\)/i, '(Estilo Brusco)'],
  [/\(Rapid Strike\)/i, '(Estilo Fluido)'],
  [/\(Hero\)/i, '(Gallardo)'],
  [/\(Complete\)/i, '(Completa)'],
  [/\(Sky\)/i, '(Cielo)'],
  [/\(Land\)/i, '(Tierra)'],
  [/\(Blade\)/i, '(Filo)'],
  [/\(Shield\)/i, '(Escudo)'],
  [/\(Sunny\)/i, '(Soleado)'],
  [/\(Rainy\)/i, '(Lluvioso)'],
  [/\(Snowy\)/i, '(Nevado)'],
  [/\(Winter\)/i, '(Invierno)'],
  [/\(Summer\)/i, '(Verano)'],
  [/\(Autumn\)/i, '(Otoño)'],
  [/\(Spring\)/i, '(Primavera)'],
  [/\(Normal\)/i, '(Normal)'],
]

async function load(name, url) {
  await fs.mkdir(CACHE, { recursive: true })
  const file = path.join(CACHE, name + '.json')
  if (!FRESH) {
    try {
      const raw = await fs.readFile(file, 'utf8')
      console.log(`  ${name}: caché (${(raw.length / 1e6).toFixed(1)} MB)`)
      return JSON.parse(raw)
    } catch {
      /* sin caché, se descarga */
    }
  }
  process.stdout.write(`  ${name}: descargando… `)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  const raw = await res.text()
  await fs.writeFile(file, raw)
  console.log(`${(raw.length / 1e6).toFixed(1)} MB`)
  return JSON.parse(raw)
}

/** El i18n viene como array plano [clave, valor, clave, valor, …]. */
function i18nMap(es) {
  const flat = es.data ?? es
  const map = new Map()
  for (let i = 0; i < flat.length - 1; i += 2) map.set(flat[i], flat[i + 1])
  return map
}


/**
 * Diccionario inglés -> español con las frases del propio juego, para traducir
 * las tareas de investigación y las bonificaciones que LeekDuck publica en
 * inglés. Se acota a frases con pinta de tarea o de bonus: el fichero completo
 * son casi 29.000 entradas y no hace falta ninguna más.
 */
function buildTextDictionary(enRaw, esRaw) {
  const en = i18nMap(enRaw)
  const es = i18nMap(esRaw)

  // Se comparan palabras, no expresiones regulares: el texto ya viene
  // normalizado y así no hay escapes que se puedan colar mal.
  const TASK_VERBS = [
    'catch', 'make', 'win', 'spin', 'hatch', 'evolve', 'trade', 'send', 'take', 'use',
    'battle', 'defeat', 'earn', 'complete', 'purify', 'transfer', 'walk', 'explore',
    'snap', 'open', 'give', 'play', 'add', 'receive', 'claim', 'participate',
    'power', 'level', 'get', 'find', 'visit', 'buy'
  ]
  const BONUS_WORDS = [
    'xp', 'candy', 'stardust', 'incense', 'lure', 'hatch distance', 'spawns',
    'raid pass', 'trade', 'egg', 'dust'
  ]

  const dictionary = {}
  for (const [key, english] of en) {
    const spanish = es.get(key)
    if (!spanish || !english || english.length > 90) continue

    const normalized = normalizeText(english)
    const words = normalized ? normalized.split(' ') : []
    if (words.length < 2) continue

    const isTask = TASK_VERBS.includes(words[0])
    const isBonus = english.length < 60 && BONUS_WORDS.some((w) => normalized.includes(w))
    if (!isTask && !isBonus) continue

    if (normalized in dictionary) continue
    dictionary[normalized] = spanish
  }
  return dictionary
}

function buildTypeChart(gm) {
  const rows = gm.filter((t) => t.data?.typeEffective)
  const chart = {}
  for (const t of rows) {
    const attack = t.data.typeEffective.attackType.replace('POKEMON_TYPE_', '').toLowerCase()
    const scalars = t.data.typeEffective.attackScalar
    chart[attack] = {}
    TYPE_ORDER.forEach((def, i) => {
      chart[attack][def] = scalars[i]
    })
  }
  const missing = TYPE_ORDER.filter((t) => !chart[t])
  if (missing.length) throw new Error('Faltan tipos en la tabla: ' + missing.join(', '))
  // Comprobación de cordura: agua sobre fuego debe ser superefectivo.
  if (chart.water.fire <= 1) throw new Error('La tabla de tipos no cuadra (agua vs fuego)')
  return chart
}


/**
 * Coste en megaenergía de cada mega, sacado del GAME_MASTER.
 *
 * El primero es fijo (el que hace falta para registrarla en la Megadex); el
 * siguiente es el de base, que luego el juego rebaja según el enfriamiento.
 * Devuelve un mapa con los ids de pvpoke: charizard_mega_x, venusaur_mega…
 */
function buildMegaEnergy(gm) {
  const costs = new Map()

  for (const template of gm) {
    const settings = template.data?.pokemonSettings
    const branches = settings?.evolutionBranch
    if (!branches) continue

    for (const branch of branches) {
      if (!branch.temporaryEvolution || branch.temporaryEvolutionEnergyCost == null) continue

      const suffix = branch.temporaryEvolution
        .replace('TEMP_EVOLUTION_', '')
        .toLowerCase()
      const id = `${settings.pokemonId.toLowerCase()}_${suffix}`

      if (costs.has(id)) continue
      costs.set(id, {
        first: branch.temporaryEvolutionEnergyCost,
        subsequent: branch.temporaryEvolutionEnergyCostSubsequent ?? null
      })
    }
  }

  return costs
}

function buildMoves(gm, pvpGm, es) {
  const moves = {}

  // Stats PvE del GAME_MASTER.
  for (const t of gm) {
    const m = t.data?.moveSettings
    if (!m) continue
    // movementId llega a veces como número (enum sin resolver), así que el
    // identificador se saca del templateId, que siempre es texto.
    const parsed = /^V(\d+)_MOVE_(.+)$/.exec(t.templateId)
    if (!parsed) continue
    const num = parsed[1]
    const raw = parsed[2]
    const isFast = raw.endsWith('_FAST')
    const id = isFast ? raw.slice(0, -5) : raw
    const energy = m.energyDelta ?? 0
    moves[id] = {
      id,
      kind: isFast ? 'fast' : 'charged',
      type: m.pokemonType.replace('POKEMON_TYPE_', '').toLowerCase(),
      name: null,
      nameEs: num ? (es.get(`move_name_${num}`) ?? null) : null,
      pve: {
        power: m.power ?? 0,
        energy,
        duration: (m.durationMs ?? 0) / 1000,
        damageWindow: (m.damageWindowStartMs ?? 0) / 1000,
      },
      pvp: null,
    }
  }

  // Stats PvP y nombre en inglés desde pvpoke.
  for (const m of pvpGm.moves) {
    let entry = moves[m.moveId]
    if (!entry) {
      // Los movimientos exclusivos de las supermegas (isMegaMove) solo existen
      // en pvpoke: el GAME_MASTER todavía no los publica. Se crean igualmente
      // para poder nombrarlos y mostrarlos, con pve = null porque no hay datos
      // de incursiones. El día que Niantic los publique, el bucle de arriba los
      // creará con sus stats de PvE y este de aquí solo añadirá los de PvP.
      if (!m.isMegaMove) continue
      entry = moves[m.moveId] = {
        id: m.moveId,
        kind: 'charged',
        type: m.type,
        name: null,
        nameEs: null,
        pve: null,
        pvp: null,
      }
    }
    if (m.isMegaMove) entry.megaMove = true
    entry.name = m.name
    entry.pvp = {
      power: m.power,
      energy: m.energy ?? 0,
      energyGain: m.energyGain ?? 0,
      turns: m.turns ?? Math.round((m.cooldown ?? 500) / 500),
      buffs: m.buffs ?? null,
      buffTarget: m.buffTarget ?? null,
      buffApplyChance: m.buffApplyChance ? Number(m.buffApplyChance) : null,
    }
  }

  for (const entry of Object.values(moves)) {
    if (!entry.name) {
      entry.name = entry.id
        .toLowerCase()
        .split('_')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ')
    }
    // "Fell Stinger+" no está traducido en los textos del juego, pero sí lo
    // está "Aguijón Letal": se reutiliza el nombre del movimiento base.
    if (!entry.nameEs && entry.id.endsWith('_PLUS')) {
      const base = moves[entry.id.slice(0, -5)]
      if (base?.nameEs) entry.nameEs = `${base.nameEs}+`
    }
    if (!entry.nameEs) entry.nameEs = entry.name
  }
  return moves
}

function spanishName(speciesName, dex, es) {
  const base = es.get(`pokemon_name_${String(dex).padStart(4, '0')}`)
  if (!base) return speciesName
  const suffix = /\(([^)]+)\)\s*$/.exec(speciesName)
  if (!suffix) return base
  let tail = `(${suffix[1]})`
  for (const [re, rep] of FORM_ES) {
    if (re.test(tail)) {
      tail = rep
      break
    }
  }

  // Las megas se nombran como en el juego, con el "Mega" delante: "Mega
  // Blastoise", "Mega Charizard X". El resto de formas se quedan con el
  // sufijo entre paréntesis, que es como se las nombra ("Marowak (Alola)").
  const mega = /^\(Mega(?:\s+([XY]))?\)$/i.exec(tail)
  if (mega) return `Mega ${base}${mega[1] ? ` ${mega[1].toUpperCase()}` : ''}`

  return `${base} ${tail}`
}

function buildPokemon(pvpGm, es, moves, forms, megaEnergy) {
  const out = []
  for (const p of pvpGm.pokemon) {
    const tags = p.tags ?? []
    const fast = (p.fastMoves ?? []).filter((m) => moves[m])
    const charged = (p.chargedMoves ?? []).filter((m) => moves[m])
    if (!fast.length || !charged.length) continue
    out.push({
      id: p.speciesId,
      dex: p.dex,
      spriteId: spriteIdFor(p.speciesId, p.dex, forms),
      name: p.speciesName,
      nameEs: spanishName(p.speciesName, p.dex, es),
      types: p.types.filter((t) => t && t !== 'none'),
      stats: p.baseStats,
      fast,
      charged,
      released: p.released === true,
      shadow: tags.includes('shadow'),
      mega: tags.includes('mega'),
      // Las supermegas son megas con stats y movimientos propios.
      superMega: tags.includes('supermega'),
      // Movimiento cargado exclusivo de la supermega (el "+"). Va aparte de
      // `charged` porque todavía no tiene stats de PvE y no puede entrar en los
      // rankings de incursiones sin falsear los números.
      megaMoves: (p.extraChargedMoves ?? []).filter((m) => moves[m]),
      // Movimientos que ya no se aprenden normalmente. Los élite solo se
      // consiguen con MT Élite; los legacy vinieron de eventos y ni eso.
      eliteMoves: (p.eliteMoves ?? []).filter((m) => moves[m]),
      legacyMoves: (p.legacyMoves ?? []).filter((m) => moves[m]),
      megaEnergy: megaEnergy.get(p.speciesId) ?? null,
      legendary: tags.includes('legendary') || tags.includes('wildlegendary'),
      mythical: tags.includes('mythical'),
      ultraBeast: tags.includes('ultrabeast'),
      shadowEligible: tags.includes('shadoweligible'),
      regional: tags.includes('regional') || tags.includes('alolan') ||
        tags.includes('galarian') || tags.includes('hisuian') || tags.includes('paldean'),
      family: p.family?.id ?? null,
      evolutions: p.family?.evolutions ?? [],
      buddyDistance: p.buddyDistance ?? null,
      thirdMoveCost: p.thirdMoveCost ?? null,
    })
  }
  return out
}

function trimRankings(list, roster, limit) {
  const byId = new Map(roster.map((p) => [p.id, p]))
  return list.slice(0, limit).map((r, i) => {
    const p = byId.get(r.speciesId)
    return {
      rank: i + 1,
      id: r.speciesId,
      name: r.speciesName,
      nameEs: p?.nameEs ?? r.speciesName,
      types: p?.types ?? [],
      score: r.score,
      moveset: r.moveset ?? [],
      stats: r.stats ?? null,
      counters: (r.counters ?? []).slice(0, 5).map((c) => ({
        id: c.opponent,
        nameEs: byId.get(c.opponent)?.nameEs ?? c.opponent,
        rating: c.rating,
      })),
      wins: (r.matchups ?? []).slice(0, 5).map((c) => ({
        id: c.opponent,
        nameEs: byId.get(c.opponent)?.nameEs ?? c.opponent,
        rating: c.rating,
      })),
      notes: r.editorNotes ?? null,
    }
  })
}

async function main() {
  await loadEnv()
  console.log('Descargando fuentes…')
  const [gmRaw, esRaw, enRaw, pvpGm, great, ultra, master, formsRaw] = await Promise.all([
    load('gm', SOURCES.gm),
    load('es', SOURCES.es),
    load('en', SOURCES.en),
    load('pvp-gm', SOURCES.pvpGm),
    load('rank-great', SOURCES.great),
    load('rank-ultra', SOURCES.ultra),
    load('rank-master', SOURCES.master),
    load('pokeapi-forms', SOURCES.forms),
  ])

  const es = i18nMap(esRaw)

  // El CPM que llevamos hardcodeado en formulas.js debe seguir coincidiendo.
  const liveCpm = gmRaw.find((t) => t.data?.playerLevel)?.data.playerLevel.cpMultiplier ?? []
  const drift = liveCpm.length !== CPM_BY_LEVEL.length ||
    liveCpm.some((v, i) => Math.abs(v - CPM_BY_LEVEL[i]) > 1e-9)
  if (drift) {
    console.warn('\n  ⚠ El CPM del GAME_MASTER ya no coincide con CPM_BY_LEVEL de src/utils/formulas.js')
    console.warn('    Actualízalo antes de fiarte de los PC.\n')
  }

  const chart = buildTypeChart(gmRaw)
  const moves = buildMoves(gmRaw, pvpGm, es)
  const forms = new Map(
    formsRaw.results.map((r) => [r.name, Number(r.url.split('/').filter(Boolean).pop())])
  )
  const megaEnergy = buildMegaEnergy(gmRaw)
  const pokemon = buildPokemon(pvpGm, es, moves, forms, megaEnergy)
  console.log(`  ${megaEnergy.size} megas con coste de energía`)

  const withOwnSprite = pokemon.filter((p) => p.spriteId !== p.dex).length
  console.log(`  ${withOwnSprite} formas con sprite propio de ${pokemon.length}`)

  const data = {
    'typechart.json': {
      order: TYPE_ORDER,
      es: TYPE_ES,
      chart,
    },
    'moves.json': moves,
    'roster.json': pokemon,
    'pvp.json': {
      great: trimRankings(great, pokemon, 400),
      ultra: trimRankings(ultra, pokemon, 400),
      master: trimRankings(master, pokemon, 400),
    },
    'texts.json': buildTextDictionary(enRaw, esRaw),
    'meta.json': {
      generatedAt: new Date().toISOString(),
      gameMasterTimestamp: pvpGm.timestamp ?? null,
      counts: {
        pokemon: pokemon.length,
        released: pokemon.filter((p) => p.released).length,
        moves: Object.keys(moves).length,
      },
      cpmDrift: drift,
      sources: SOURCES,
    },
  }

  await fs.mkdir(OUT, { recursive: true })
  console.log('\nEscribiendo public/data/')
  for (const [file, content] of Object.entries(data)) {
    const json = JSON.stringify(content)
    await fs.writeFile(path.join(OUT, file), json)
    console.log(`  ${file.padEnd(14)} ${(json.length / 1024).toFixed(0)} KB`)
  }

  await uploadToSupabase(data)

  console.log(`\n${pokemon.length} Pokémon (${data['meta.json'].counts.released} disponibles), ` +
    `${Object.keys(moves).length} movimientos.`)
}

main().catch((err) => {
  console.error('\nHa fallado la generación de datos:', err.message)
  process.exit(1)
})
