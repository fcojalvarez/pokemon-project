/**
 * Los colores de la megaenergía de cada especie, sacados del propio juego.
 *
 *   pnpm megaenergia
 *
 * En el juego la megaenergía es un modelo 3D (no hay imagen en pogo_assets):
 * una piedra con el símbolo mega, siempre la misma, teñida con cuatro colores
 * de rampa que cambian por especie. PokeMiners los publica en
 * «Candy Color Data/PokemonMegaCandyAkaMegaEnergy.json». La app dibuja la
 * piedra en SVG (BaseMegaEnergyIcon) y la pinta con estos colores.
 *
 * Sale src/assets/megaEnergia.json: { "6": ["#de9372", …], "6_MEGA_X": … },
 * las cuatro rampas de oscuro a claro en el orden del juego (1 a 4). Solo
 * cambia cuando sale una mega nueva: se vuelve a lanzar entonces.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = path.join(ROOT, 'src', 'assets', 'megaEnergia.json')
const URL_COLORES =
  'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Candy%20Color%20Data/PokemonMegaCandyAkaMegaEnergy.json'

const hex = ({ r, g, b }) =>
  '#' +
  [r, g, b]
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')

const res = await fetch(URL_COLORES)
if (!res.ok) throw new Error(`HTTP ${res.status} al bajar los colores de megaenergía`)
const datos = await res.json()

const colores = {}
for (const [clave, material] of Object.entries(datos)) {
  // «0006» → «6»; «0006_MEGA_X» → «6_MEGA_X».
  const id = clave.replace(/^0+/, '')
  const rampas = [1, 2, 3, 4].map((n) => material[`_RampColor${n}`])
  if (rampas.every(Boolean)) colores[id] = rampas.map(hex)
}

await fs.writeFile(SALIDA, JSON.stringify(colores, null, 0) + '\n')
console.log(`${Object.keys(colores).length} megaenergías en ${path.relative(ROOT, SALIDA)}`)
