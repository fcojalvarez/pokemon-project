/**
 * Noticias oficiales de Pokémon GO para el detalle de cada evento.
 *
 *   pnpm noticias            lee las noticias, las asocia a su evento y sube
 *   pnpm noticias --dry-run  dice qué asociaría; no escribe nada
 *
 * Lee la portada de pokemongo.com/es/news, cada noticia en español y en inglés
 * (la app tiene los dos idiomas), y guarda en game_data.noticias las que
 * corresponden a un evento de LeekDuck, con qué evento es cada una. La lógica
 * de leer y asociar está en scripts/lib/noticias.mjs.
 *
 * Se lanza una vez al día: los eventos se anuncian con bastante antelación.
 * Los que ya han terminado desaparecen solos, porque solo se guardan las
 * noticias de los eventos que ScrapedDuck sigue publicando. Y una noticia ya
 * guardada solo se vuelve a leer si se publicó hace menos de tres semanas: más
 * tarde ya no cambia.
 */
import fs from 'node:fs/promises'
import { loadEnv } from './lib/env.mjs'
import { asociarEventos, bonusDe, depurar, leerNoticia, slugsDePortada } from './lib/noticias.mjs'
import { normalizeName } from '../src/utils/gameText.js'
import { FEEDS } from '../src/utils/liveFeed.js'

const SECO = process.argv.includes('--dry-run')
const WEB = 'https://pokemongo.com'
const EVENTOS = FEEDS.events
const RELEER_DIAS = 21

const CABECERAS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
}

async function bajar(url) {
  const res = await fetch(url, { headers: CABECERAS })
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir ${url}`)
  return res.text()
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  await loadEnv()
  if (!SECO && !process.env.SUPABASE_DB_URL) {
    throw new Error('falta SUPABASE_DB_URL. En CI viene del secreto del repositorio.')
  }

  console.log('Leyendo la portada de noticias y los eventos de LeekDuck')
  const [portada, eventos] = await Promise.all([
    bajar(`${WEB}/es/news`),
    fetch(EVENTOS).then((r) => r.json())
  ])
  const slugs = slugsDePortada(portada, 'es')
  console.log(`  ${slugs.length} noticias en portada, ${eventos.length} eventos`)
  if (slugs.length < 5) throw new Error('la portada trae muy pocas noticias: ¿han cambiado la web?')

  // Lo que ya había, para no releer lo que no cambia.
  let client = null
  let guardado = { noticias: {} }
  if (process.env.SUPABASE_DB_URL) {
    const { default: pg } = await import('pg')
    client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
    await client.connect()
    const { rows } = await client.query(`SELECT payload FROM public.game_data WHERE name = 'noticias'`)
    guardado = rows[0]?.payload ?? guardado
  }

  try {
    const ahora = Date.now()
    const noticias = {}
    let leidas = 0
    for (const slug of slugs) {
      const previa = guardado.noticias?.[slug]
      const publicada = previa?.es?.publicada ? new Date(previa.es.publicada).getTime() : 0
      if (previa && ahora - publicada > RELEER_DIAS * 86_400_000) {
        // Lo guardado pasa también por el filtro: si se afina, se aplica a todo.
        const limpia = (n) => (n ? { ...n, secciones: depurar(n.secciones ?? []) } : n)
        noticias[slug] = { ...previa, es: limpia(previa.es), en: limpia(previa.en) }
        continue
      }
      try {
        const es = leerNoticia(await bajar(`${WEB}/es/news/${slug}`))
        await esperar(400)
        const en = leerNoticia(await bajar(`${WEB}/en/news/${slug}`))
        await esperar(400)
        if (es) {
          noticias[slug] = { es, en: en ?? null }
          leidas++
        }
      } catch (err) {
        console.log(`  ${slug}: ${err.message}`)
        if (previa) noticias[slug] = previa
      }
    }
    console.log(`  ${leidas} leídas ahora, ${Object.keys(noticias).length - leidas} ya guardadas`)

    const roster = JSON.parse(await fs.readFile(new URL('../public/data/roster.json', import.meta.url), 'utf8'))
    const especies = new Set(roster.map((p) => normalizeName(String(p.name).replace(/\s*\(.*\)$/, ''))))
    const soloEs = Object.fromEntries(Object.entries(noticias).map(([slug, n]) => [slug, n.es]))
    const eventosANoticia = asociarEventos(eventos, soloEs, especies)

    // Solo se guardan las que tienen evento: el resto no se enseña en ningún sitio.
    const usadas = new Set(Object.values(eventosANoticia))
    const payload = {
      actualizado: new Date().toISOString(),
      eventos: eventosANoticia,
      // Los bonus de cada evento, para la tarjeta: sin tener que abrir el detalle.
      bonus: Object.fromEntries(
        Object.entries(eventosANoticia)
          .map(([id, slug]) => [id, { es: bonusDe(noticias[slug]?.es), en: bonusDe(noticias[slug]?.en) }])
          .filter(([, b]) => b.es.length)
      ),
      noticias: Object.fromEntries(
        [...usadas].map((slug) => [slug, { url: `${WEB}/es/news/${slug}`, ...noticias[slug] }])
      )
    }
    console.log(`  ${Object.keys(eventosANoticia).length} eventos con su noticia oficial (${usadas.size} noticias)`)
    for (const [id, slug] of Object.entries(eventosANoticia)) console.log(`    · ${id}  →  ${slug}`)

    if (SECO) return
    const json = JSON.stringify(payload)
    await client.query(
      `INSERT INTO public.game_data (name, payload, bytes, generated_at, updated_at)
            VALUES ('noticias', $1::jsonb, $2, now(), now())
       ON CONFLICT (name) DO UPDATE
              SET payload = EXCLUDED.payload,
                  bytes = EXCLUDED.bytes,
                  generated_at = EXCLUDED.generated_at,
                  updated_at = now()`,
      [json, json.length]
    )
    console.log(`  noticias       ${(json.length / 1024).toFixed(1)} KB subidos a Supabase`)
  } finally {
    await client?.end()
  }
}

main().catch((err) => {
  const detalle = err?.message || String(err)
  console.error(`\n${detalle}`)
  console.log(`::error title=pnpm noticias::${detalle.replace(/\n/g, '%0A')}`)
  process.exitCode = 1
})
