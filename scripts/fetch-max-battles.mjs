/**
 * Baja de Snacknap qué Pokémon hay ahora mismo en los combates Max y lo guarda
 * en la tabla `game_data` de Supabase.
 *
 *   pnpm max            escribe game_data.maxlive
 *   pnpm max --dry-run  lo imprime y no toca la base de datos
 *
 * Va aparte de `build-data` a propósito: ese baja 20 MB de GAME_MASTER y se
 * lanza una vez al día, y esto cambia cada pocas horas. Aquí solo se pide una
 * página.
 *
 * Por qué Snacknap y no otra: es la única fuente que publica el roster
 * completo (todos los niveles, no solo lo que alguien ha escaneado cerca),
 * responde a una petición normal desde servidor y trae el número de Pokédex
 * en el propio enlace, que es justo donde estos parseos se rompen cuando hay
 * que cruzar por nombre.
 *
 * Lo que el GAME_MASTER no sabe es esto: él dice quién PUEDE dinamaxizar
 * (156 especies), no quién ESTÁ hoy en los nodos.
 */
import fs from 'node:fs/promises'
import { loadEnv } from './lib/env.mjs'
import { dexPorNombre, maxEnEventos, sumarVistos } from './lib/maxLiberados.mjs'
import { FEEDS } from '../src/utils/liveFeed.js'

const FUENTE = 'https://www.snacknap.com/max-battles'
const EVENTOS = FEEDS.events
const SECO = process.argv.includes('--dry-run')

/**
 * Mínimo de Pokémon por debajo del cual no nos fiamos.
 *
 * Si rehacen la página, el parseo devolvería cero o cuatro cosas sueltas, y
 * guardar eso encima de una lista buena es peor que no actualizar: la app
 * enseñaría "no hay combates Max" cuando sí los hay. Así que se planta.
 */
const MINIMO = 15

const NIVEL = { t1: 1, t2: 2, t3: 3, t4: 4, t5: 5, t6: 6 }

/** Un bloque `data-tier` por nivel; dentro, un enlace por Pokémon. */
function parse(html) {
  const bloques = [...html.matchAll(/data-tier="(t\d)"([\s\S]*?)(?=data-tier="t\d"|$)/g)]
  const salida = []

  for (const [, clave, cuerpo] of bloques) {
    const tier = NIVEL[clave]
    if (!tier) continue

    const tiles = cuerpo.matchAll(
      /href="\/pokedex\/pokemon\/(\d+)"\s*\n?\s*title="(D-Max|G-Max) ([^"]+)"([\s\S]*?)<\/a>/g
    )
    for (const [, dex, modo, nombre, resto] of tiles) {
      // El PC del encuentro: el máximo es el de un 100 %.
      const pc = /([\d,]+)\s*-\s*<strong>([\d,]+)<\/strong>/.exec(resto)
      const numero = (valor) => Number(String(valor).replace(/,/g, ''))

      salida.push({
        dex: Number(dex),
        name: nombre.trim(),
        tier,
        gigantamax: modo === 'G-Max',
        // La página marca con un icono los que tienen variocolor liberado.
        canBeShiny: /is_shiny/.test(resto),
        cp: pc ? { min: numero(pc[1]), max: numero(pc[2]) } : null,
      })
    }
  }

  // La misma especie puede salir en dos niveles; cada fila es un encuentro
  // distinto, así que no se deduplica por número de Pokédex.
  return salida
}

/**
 * Cabeceras de navegador. Desde un servidor de CI, una petición que se
 * presenta como bot se la come cualquier protección intermedia; esto es lo
 * que manda un Chrome normal.
 */
const CABECERAS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
}

/** Un reintento: un corte de red puntual no debería tumbar la pasada. */
async function bajar(url, intentos = 2) {
  let ultimo
  for (let i = 1; i <= intentos; i++) {
    try {
      const res = await fetch(url, { headers: CABECERAS })
      console.log(`  intento ${i}: HTTP ${res.status}`)
      if (res.ok) return await res.text()
      ultimo = new Error(`HTTP ${res.status} al pedir ${url}`)
    } catch (err) {
      console.log(`  intento ${i}: ${err.message}`)
      ultimo = err
    }
    if (i < intentos) await new Promise((r) => setTimeout(r, 3000))
  }
  throw ultimo
}

async function main() {
  await loadEnv()

  // Antes de nada: sin sitio donde escribir, no hay nada que hacer. Fallar
  // aquí deja claro que el problema es el secreto y no la fuente.
  if (!SECO && !process.env.SUPABASE_DB_URL) {
    throw new Error(
      'falta SUPABASE_DB_URL. En CI viene del secreto del repositorio; ' +
        'comprueba que está puesto y que el workflow se lo pasa al paso.'
    )
  }

  console.log(`Bajando ${FUENTE}`)
  const html = await bajar(FUENTE)
  console.log(`  ${(html.length / 1024).toFixed(0)} KB recibidos`)

  const pokemon = parse(html)
  if (pokemon.length < MINIMO) {
    // Se enseña un trozo para poder ver desde el log si han cambiado la
    // maquetación o si lo que ha llegado es una página de bloqueo.
    const titulo = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '(sin título)'
    throw new Error(
      `solo se han reconocido ${pokemon.length} Pokémon (mínimo ${MINIMO}).
` +
        `Título de lo que ha llegado: ${titulo}
` +
        'O han cambiado la página, o esto no es la página que esperábamos.'
    )
  }

  // La propia página dice cuándo se actualizó; se guarda para poder avisar en
  // pantalla si lo que se enseña se ha quedado viejo.
  const marca = /data-fresh="(\d+)"/.exec(html)
  const payload = {
    pokemon,
    source: FUENTE,
    freshAt: marca ? new Date(Number(marca[1]) * 1000).toISOString() : null,
    fetchedAt: new Date().toISOString(),
  }

  const porNivel = pokemon.reduce((acc, p) => ({ ...acc, [p.tier]: (acc[p.tier] ?? 0) + 1 }), {})
  console.log(
    `  ${pokemon.length} Pokémon` +
      ` (${Object.entries(porNivel).map(([t, n]) => `${n} de nivel ${t}`).join(', ')})` +
      `, ${pokemon.filter((p) => p.gigantamax).length} Gigamax`
  )

  // Además de lo que hay ahora, los eventos Max de LeekDuck que ya han
  // empezado: es el primer aviso de que sale un Dinamax o un Gigamax nuevo.
  // Todo esto va a `maxliberados`, que no se vacía nunca: build-data lo usa
  // para dejar la marca de Dinamax y Gigamax solo en los ya liberados.
  const vistosAhora = [...pokemon]
  try {
    const roster = JSON.parse(await fs.readFile(new URL('../public/data/roster.json', import.meta.url), 'utf8'))
    const eventos = await (await fetch(EVENTOS)).json()
    const enEventos = maxEnEventos(eventos, dexPorNombre(roster))
    vistosAhora.push(
      ...enEventos.dinamax.map((dex) => ({ dex, gigantamax: false })),
      ...enEventos.gigamax.map((dex) => ({ dex, gigantamax: true }))
    )
    console.log(`  eventos Max ya empezados: ${enEventos.dinamax.length} Dinamax, ${enEventos.gigamax.length} Gigamax`)
  } catch (err) {
    // Sin eventos se sigue: lo de Snacknap basta para esta pasada.
    console.log(`  eventos de LeekDuck: ${err.message}`)
  }

  if (SECO) {
    console.log(JSON.stringify(payload, null, 1).slice(0, 1200))
    console.log(JSON.stringify(sumarVistos({}, vistosAhora)).slice(0, 600))
    return
  }

  const { default: pg } = await import('pg')
  const url = process.env.SUPABASE_DB_URL
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const json = JSON.stringify(payload)
    await client.query(
      `INSERT INTO public.game_data (name, payload, bytes, generated_at, updated_at)
            VALUES ('maxlive', $1::jsonb, $2, now(), now())
       ON CONFLICT (name) DO UPDATE
              SET payload = EXCLUDED.payload,
                  bytes = EXCLUDED.bytes,
                  generated_at = EXCLUDED.generated_at,
                  updated_at = now()`,
      [json, json.length]
    )
    console.log(`  maxlive        ${(json.length / 1024).toFixed(1)} KB subidos a Supabase`)

    // La memoria de liberados: se suma a lo que había, nunca se quita nada.
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT payload FROM public.game_data WHERE name = 'maxliberados' FOR UPDATE`
    )
    const antes = rows[0]?.payload ?? {}
    const liberados = sumarVistos(antes, vistosAhora, payload.fetchedAt)
    const nuevos =
      Object.keys(liberados.dinamax).length - Object.keys(antes.dinamax ?? {}).length +
      Object.keys(liberados.gigamax).length - Object.keys(antes.gigamax ?? {}).length
    const jsonLiberados = JSON.stringify(liberados)
    await client.query(
      `INSERT INTO public.game_data (name, payload, bytes, generated_at, updated_at)
            VALUES ('maxliberados', $1::jsonb, $2, now(), now())
       ON CONFLICT (name) DO UPDATE
              SET payload = EXCLUDED.payload,
                  bytes = EXCLUDED.bytes,
                  updated_at = now()`,
      [jsonLiberados, jsonLiberados.length]
    )
    await client.query('COMMIT')
    console.log(
      `  maxliberados   ${Object.keys(liberados.dinamax).length} Dinamax y ` +
        `${Object.keys(liberados.gigamax).length} Gigamax vistos (${nuevos} nuevos)`
    )
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    await client.end()
  }
}

/**
 * Un fallo de conexión en Node 24 llega como AggregateError, y ésos tienen el
 * `message` vacío: el detalle está en `errors`, uno por dirección intentada.
 * Sin desenvolverlo, el log de Actions se quedaba en una línea en blanco y un
 * «exit code 1», que no dice nada.
 */
function explicar(err) {
  const partes = [err?.message || err?.code || `error sin mensaje (${err?.name ?? 'Error'})`]
  for (const causa of err?.errors ?? []) {
    partes.push(`  - ${[causa.code, causa.address, causa.message].filter(Boolean).join(' ')}`)
  }
  if (err?.cause) partes.push(`  - causa: ${err.cause.message ?? err.cause}`)
  return partes.join('\n')
}

main().catch((err) => {
  const detalle = explicar(err)
  console.error(`\n${detalle}`)
  // Como anotación de Actions: los logs piden sesión, pero las anotaciones se
  // pueden leer desde la API sin token.
  console.log(`::error title=pnpm max::${detalle.replace(/\n/g, '%0A')}`)
  process.exitCode = 1
})
