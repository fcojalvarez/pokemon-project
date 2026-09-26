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
import { loadEnv } from './lib/env.mjs'

const FUENTE = 'https://www.snacknap.com/max-battles'
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

async function main() {
  await loadEnv()

  console.log(`Bajando ${FUENTE}`)
  const res = await fetch(FUENTE, {
    headers: { 'user-agent': 'pogodex-bot (+https://github.com/fcojalvarez/pokemon-project)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir los combates Max`)
  const html = await res.text()

  const pokemon = parse(html)
  if (pokemon.length < MINIMO) {
    throw new Error(
      `solo se han reconocido ${pokemon.length} Pokémon (mínimo ${MINIMO}): ` +
        'lo más probable es que Snacknap haya cambiado la página'
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

  if (SECO) {
    console.log(JSON.stringify(payload, null, 1).slice(0, 1200))
    return
  }

  const url = process.env.SUPABASE_DB_URL
  if (!url) throw new Error('falta SUPABASE_DB_URL')

  const { default: pg } = await import('pg')
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
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error(`\n${err.message}`)
  process.exitCode = 1
})
