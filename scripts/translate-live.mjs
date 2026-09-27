/**
 * Traduce con Gemini lo que LeekDuck publica en inglés y la app no sabe
 * traducir sola (títulos de evento con nombre propio, bonificaciones y tareas
 * que no están entre las frases del juego), y lo guarda en la tabla
 * `game_data` de Supabase, fila `traducciones`, que la app lee con el resto.
 *
 *   pnpm traducir            traduce lo que falte y lo sube
 *   pnpm traducir --dry-run  dice qué traduciría; ni llama a Gemini ni escribe
 *
 * Cada texto se traduce una sola vez: lo que ya está en la memoria no se
 * vuelve a pedir. Por eso cada pasada manda, como mucho, un puñado de textos.
 *
 * Una traducción mala se corrige a mano en la fila `traducciones`, poniendo
 * `origen: 'manual'`: esto nunca pisa una que ya exista.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './lib/env.mjs'
import {
  fusionar,
  glosario,
  leerRespuesta,
  lotes,
  peticionGemini,
  textosPendientes
} from './lib/traducciones.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SECO = process.argv.includes('--dry-run')

const FUENTES = {
  events: 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json',
  research: 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/research.json'
}

/**
 * Tope de textos por pasada. Normalmente llegan unos pocos, pero la primera
 * vez son todos: con esto nunca se dispara el gasto ni la cuota, y lo que
 * quede se traduce en las siguientes pasadas.
 */
const MAXIMO = 200
const POR_LOTE = 40

const MODELO = process.env.GEMINI_MODEL || 'gemini-3.6-flash'

const leerJson = async (relativa) => JSON.parse(await fs.readFile(path.join(ROOT, relativa), 'utf8'))

async function bajarJson(url) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`)
  return res.json()
}

/**
 * Una llamada a Gemini, con reintentos si el fallo es pasajero (cuota por
 * minuto, 5xx). Un 4xx de otro tipo es de configuración y no se arregla
 * reintentando.
 */
async function llamarGemini(cuerpo, intentos = 3) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`
  let ultimo
  for (let i = 1; i <= intentos; i++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(cuerpo)
    })
    if (res.ok) return res.json()

    const detalle = (await res.text()).slice(0, 400)
    ultimo = new Error(`Gemini respondió HTTP ${res.status}: ${detalle}`)
    const pasajero = res.status === 429 || res.status >= 500
    if (!pasajero || i === intentos) throw ultimo
    console.log(`  intento ${i}: HTTP ${res.status}, reintento en ${i * 10} s`)
    await new Promise((r) => setTimeout(r, i * 10_000))
  }
  throw ultimo
}

async function main() {
  await loadEnv()

  if (!SECO) {
    const faltan = ['SUPABASE_DB_URL', 'GEMINI_API_KEY'].filter((nombre) => !process.env[nombre])
    if (faltan.length) {
      throw new Error(
        `falta ${faltan.join(' y ')}. En CI vienen de los secretos del repositorio; ` +
          'comprueba que están puestos y que el workflow se los pasa al paso.'
      )
    }
  }

  const [en, es] = await Promise.all([leerJson('src/locales/en.json'), leerJson('src/locales/es.json')])

  console.log('Bajando eventos y tareas de ScrapedDuck')
  const [events, research] = await Promise.all([bajarJson(FUENTES.events), bajarJson(FUENTES.research)])
  console.log(`  ${events.length} eventos, ${research.length} tareas`)

  // Las frases del juego y la memoria, de donde las lee la app. En seco y sin
  // base de datos, las frases del último despliegue y la memoria vacía.
  let client = null
  let texts
  let memoria = {}
  if (process.env.SUPABASE_DB_URL) {
    const { default: pg } = await import('pg')
    client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
    await client.connect()
    const { rows } = await client.query(
      `SELECT name, payload FROM public.game_data WHERE name IN ('texts', 'traducciones')`
    )
    const fila = Object.fromEntries(rows.map((uno) => [uno.name, uno.payload]))
    texts = fila.texts
    memoria = fila.traducciones?.es ?? {}
  }
  if (!texts) texts = await leerJson('public/data/texts.json')

  try {
    const pendientes = textosPendientes(
      { events, research },
      {
        texts,
        memoria,
        tiposConocidos: new Set(Object.keys(es.events?.types ?? {})),
        nombresConocidos: new Set(Object.keys(es.events?.names ?? {}))
      }
    )
    console.log(`  ${Object.keys(memoria).length} ya en la memoria, ${pendientes.length} por traducir`)

    if (!pendientes.length) return
    const ahora = pendientes.slice(0, MAXIMO)
    if (pendientes.length > MAXIMO) {
      console.log(`  se traducen ${MAXIMO}; el resto, en las siguientes pasadas`)
    }

    if (SECO) {
      for (const texto of ahora) console.log(`    · ${texto}`)
      return
    }

    const pares = glosario(en, es)
    const nuevas = new Map()
    for (const [indice, lote] of lotes(ahora, POR_LOTE).entries()) {
      try {
        const respuesta = await llamarGemini(peticionGemini(lote, pares))
        const leidas = leerRespuesta(respuesta, lote)
        for (const [original, texto] of leidas) nuevas.set(original, texto)
        console.log(`  lote ${indice + 1}: ${leidas.size} de ${lote.length} traducidos`)
      } catch (err) {
        // Un lote fallido no tira lo que ya se ha traducido: se guarda lo que
        // haya y lo demás se reintenta en la próxima pasada.
        console.log(`  lote ${indice + 1}: ${err.message}`)
      }
    }

    if (!nuevas.size) throw new Error('Gemini no ha devuelto ninguna traducción válida')

    for (const [original, texto] of nuevas) console.log(`    · ${original}  →  ${texto}`)

    const payload = { es: fusionar(memoria, nuevas, { modelo: MODELO, fecha: new Date().toISOString() }) }
    const json = JSON.stringify(payload)
    await client.query(
      `INSERT INTO public.game_data (name, payload, bytes, generated_at, updated_at)
            VALUES ('traducciones', $1::jsonb, $2, now(), now())
       ON CONFLICT (name) DO UPDATE
              SET payload = EXCLUDED.payload,
                  bytes = EXCLUDED.bytes,
                  generated_at = EXCLUDED.generated_at,
                  updated_at = now()`,
      [json, json.length]
    )
    console.log(`  traducciones  ${Object.keys(payload.es).length} en total, ${(json.length / 1024).toFixed(1)} KB subidos a Supabase`)
  } finally {
    await client?.end()
  }
}

main().catch((err) => {
  const detalle = err?.message || String(err)
  console.error(`\n${detalle}`)
  // Como anotación de Actions, que se lee desde la API sin sesión.
  console.log(`::error title=pnpm traducir::${detalle.replace(/\n/g, '%0A')}`)
  process.exitCode = 1
})
