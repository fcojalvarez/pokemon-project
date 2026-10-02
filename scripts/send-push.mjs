/**
 * Manda los avisos en el móvil (F14): a cada suscripción activa, los eventos
 * de sus categorías que empiezan dentro de una hora a la hora de su zona.
 *
 *   pnpm avisos            manda los que toquen
 *   pnpm avisos --dry-run  dice a cuántos mandaría; ni manda ni escribe
 *
 * Lo lanza el workflow avisos.yml cada 15 minutos. Lo enviado se apunta en
 * `push_enviados` antes de mandarlo, así que un evento no llega dos veces
 * aunque el workflow se solape o se repita.
 *
 * Nunca borra nada: una suscripción que el servicio de push da por caducada
 * (404 o 410: el navegador la ha retirado) se marca con `baja_at`.
 *
 * Sin las claves VAPID o sin la base de datos, avisa y sale sin error: así
 * el workflow puede estar puesto antes de configurarlo.
 */
import { loadEnv } from './lib/env.mjs'
import { FEEDS } from '../src/utils/liveFeed.js'
import { eventosPorAvisar } from '../src/utils/avisos.js'

const SECO = process.argv.includes('--dry-run')

/** El texto del aviso, en el idioma de cada uno. */
export function textoAviso(evento, idioma, traducciones = {}) {
  const nombre =
    idioma === 'en' ? evento.name : traducciones[evento.name?.trim()]?.texto ?? evento.name
  return {
    title: idioma === 'en' ? 'Starts in 1 hour' : 'Empieza en 1 hora',
    body: nombre,
    url: '/events',
    tag: evento.eventID
  }
}

async function main() {
  await loadEnv()
  const { SUPABASE_DB_URL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env
  const sujeto = process.env.VAPID_SUBJECT || 'mailto:avisos@pogodex.app'
  if (!SUPABASE_DB_URL || (!SECO && (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY))) {
    console.log(
      'Avisos sin configurar (faltan SUPABASE_DB_URL o las claves VAPID): no se manda nada.'
    )
    return
  }

  const res = await fetch(FEEDS.events, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status} al pedir los eventos`)
  const eventos = await res.json()

  const { default: pg } = await import('pg')
  const client = new pg.Client({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  })
  await client.connect()

  let webpush = null
  if (!SECO) {
    webpush = (await import('web-push')).default
    webpush.setVapidDetails(sujeto, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  }

  try {
    const { rows: filaTraducciones } = await client.query(
      "select payload from public.game_data where name = 'traducciones' limit 1"
    )
    const traducciones = filaTraducciones[0]?.payload?.es ?? {}

    let suscripciones
    try {
      ;({ rows: suscripciones } = await client.query(
        `select id, endpoint, p256dh, auth, zona, idioma, categorias
           from public.push_subscriptions
          where baja_at is null and cardinality(categorias) > 0`
      ))
    } catch (err) {
      // Sin la tabla aún (falta lanzar supabase/migrations/20261002_avisos_push.sql).
      if (err.code === '42P01') {
        console.log('Avisos sin configurar (no existe push_subscriptions): no se manda nada.')
        return
      }
      throw err
    }

    const ahora = new Date()
    let enviados = 0
    let caducadas = 0
    let pendientes = 0

    for (const sub of suscripciones) {
      let tocan
      try {
        tocan = eventosPorAvisar(eventos, { ahora, zona: sub.zona, categorias: sub.categorias })
      } catch {
        // Una zona que este Node no conoce: esa suscripción se salta.
        continue
      }
      for (const evento of tocan) {
        pendientes++
        if (SECO) continue
        // Primero se apunta; si ya estaba, otro pase lo mandó.
        const { rowCount } = await client.query(
          `insert into public.push_enviados (subscription_id, event_id)
           values ($1, $2) on conflict do nothing`,
          [sub.id, evento.eventID]
        )
        if (!rowCount) continue
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(textoAviso(evento, sub.idioma, traducciones)),
            { TTL: 3600 }
          )
          enviados++
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await client.query(
              'update public.push_subscriptions set baja_at = now(), updated_at = now() where id = $1',
              [sub.id]
            )
            caducadas++
            break
          }
          console.warn(
            `No se pudo mandar el aviso de ${evento.eventID}: ${err.statusCode ?? err.message}`
          )
        }
      }
    }

    console.log(
      SECO
        ? `${suscripciones.length} suscripciones activas; mandaría ${pendientes} avisos.`
        : `${enviados} avisos mandados a ${suscripciones.length} suscripciones; ${caducadas} caducadas marcadas de baja.`
    )
  } finally {
    await client.end()
  }
}

// Solo al lanzarlo, no al importarlo desde los tests.
if (process.argv[1]?.endsWith('send-push.mjs')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
