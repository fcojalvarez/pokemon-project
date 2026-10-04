/**
 * Los colores de la megaenergía de cada especie, para la piedra en SVG
 * (BaseMegaEnergyIcon).
 *
 *   pnpm megaenergia
 *
 * En el juego la megaenergía es un modelo 3D, una piedra siempre igual teñida
 * por especie, y nadie publica un vector. En src/assets/megaEnergia.json van:
 *
 *   - `puntos`: 41 colores por especie (25 por dentro, fuera del símbolo, y 16
 *     pegados al canto), medidos en el sprite de cada megaenergía que publica
 *     Bulbagarden Archives (Category:Pokémon GO Mega Energy, los del juego a
 *     128 px), y `generica`, la piedra sin especie. Solo están las megas que
 *     ya han salido en GO. Se midieron a mano en el navegador: la web corta a
 *     los navegadores automáticos, así que este script no los toca y se
 *     conservan. Dónde va cada punto, en el componente (DENTRO y CANTO).
 *   - `rampas`: los cuatro colores de rampa del juego (PokeMiners, «Candy Color
 *     Data»), que traen también las megas aún sin publicar. De ellos sale el
 *     color de las que no tienen puntos medidos.
 *
 * Solo cambia cuando sale una mega nueva: se vuelve a lanzar entonces.
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

// ---------- Rampas del juego ----------
const res = await fetch(URL_COLORES)
if (!res.ok) throw new Error(`HTTP ${res.status} al bajar los colores de megaenergía`)
const rampas = {}
for (const [clave, material] of Object.entries(await res.json())) {
  // «0006» → «6»; «0006_MEGA_X» → «6_MEGA_X».
  const id = clave.replace(/^0+/, '')
  const colores = [1, 2, 3, 4].map((n) => material[`_RampColor${n}`])
  if (colores.every(Boolean)) rampas[id] = colores.map(hex)
}

// ---------- Tonos medidos: se conservan ----------
let previo = {}
try {
  previo = JSON.parse(await fs.readFile(SALIDA, 'utf8'))
} catch {
  /* primera vez */
}
const { generica = null, puntos = {} } = previo

await fs.writeFile(SALIDA, JSON.stringify({ generica, puntos, rampas }) + '\n')
console.log(
  `${Object.keys(rampas).length} megaenergías con rampas (${
    Object.keys(puntos).length
  } medidas en su sprite) en ${path.relative(ROOT, SALIDA)}`
)
