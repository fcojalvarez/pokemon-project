/**
 * Miniaturas WebP de los sprites de PokeAPI, en public/sprites/.
 *
 *   pnpm sprites            genera las que falten
 *   pnpm sprites --dry-run  dice cuántas faltan; no descarga nada
 *
 * Los sprites de PokeAPI son PNG de 512×512 (entre 80 y 200 KB) y la app los
 * pinta a 96 px, o 112 en la cabecera de la ficha. Aquí se bajan una vez y se
 * guardan a 256 px en WebP (unos 12 KB), que se sirven desde nuestra propia web
 * con caché larga: la Pokédex pasa de gastar ~2,5 MB por pantalla a ~250 KB.
 *
 * Solo se hacen las que faltan, así que después de la primera vez cada pasada
 * es cosa de segundos. Si una no está (un Pokémon recién añadido), la app usa
 * el PNG original: nunca queda una imagen rota.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = path.join(ROOT, 'public', 'sprites')
const ORIGEN = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home'
const SECO = process.argv.includes('--dry-run')

export const LADO = 256
const CALIDAD = 78
const A_LA_VEZ = 8
/** Última especie de la Pokédex nacional: la tabla de la Pokédex llega hasta aquí. */
const ULTIMA_ESPECIE = 1025

const existe = (fichero) => fs.access(fichero).then(() => true, () => false)

async function main() {
  const roster = JSON.parse(await fs.readFile(path.join(ROOT, 'public', 'data', 'roster.json'), 'utf8'))
  const ids = new Set(roster.map((p) => p.spriteId).filter(Number.isInteger))
  for (let dex = 1; dex <= ULTIMA_ESPECIE; dex++) ids.add(dex)

  const trabajos = []
  for (const id of [...ids].sort((a, b) => a - b)) {
    for (const shiny of [false, true]) {
      const destino = path.join(SALIDA, shiny ? 'shiny' : '', `${id}.webp`)
      if (!(await existe(destino))) trabajos.push({ id, shiny, destino })
    }
  }
  console.log(`${ids.size} sprites (normal y variocolor): faltan ${trabajos.length}`)
  if (SECO || !trabajos.length) return

  await fs.mkdir(path.join(SALIDA, 'shiny'), { recursive: true })
  let hechos = 0
  let bytes = 0
  const sinOrigen = []
  const cola = [...trabajos]
  const trabajar = async () => {
    for (let t = cola.shift(); t; t = cola.shift()) {
      const url = `${ORIGEN}/${t.shiny ? 'shiny/' : ''}${t.id}.png`
      try {
        const res = await fetch(url)
        if (res.status === 404) {
          sinOrigen.push(`${t.shiny ? 'shiny/' : ''}${t.id}`)
          continue
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const webp = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize(LADO, LADO, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: CALIDAD, alphaQuality: 90, effort: 6 })
          .toBuffer()
        await fs.writeFile(t.destino, webp)
        hechos++
        bytes += webp.length
        if (hechos % 200 === 0) console.log(`  ${hechos} de ${trabajos.length}`)
      } catch (err) {
        console.log(`  ${url}: ${err.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: A_LA_VEZ }, trabajar))

  console.log(`  ${hechos} miniaturas nuevas, ${(bytes / 1024 / 1024).toFixed(1)} MB` +
    (sinOrigen.length ? `; sin sprite en PokeAPI: ${sinOrigen.length} (${sinOrigen.slice(0, 8).join(', ')}…)` : ''))
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
