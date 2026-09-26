/**
 * Lee .env a mano.
 *
 * Los scripts los arranca Node pelado, sin pasar por Vite, así que nadie les
 * ha cargado las variables. Lo que ya venga del entorno manda, que es lo que
 * permite que en CI las ponga el workflow.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export async function loadEnv() {
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
