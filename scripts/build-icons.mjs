/**
 * Genera los iconos de la app a partir de public/icons/favicon.svg.
 *
 *   pnpm icons
 *
 * Rasteriza con el Chromium que ya trae Playwright, así no hay que añadir una
 * dependencia de imagen solo para esto. Si cambia el logo, se toca el SVG y se
 * vuelve a lanzar.
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ICONS = path.join(ROOT, 'public', 'icons')
const FONDO = '#f3f4f6'

/**
 * El maskable lleva el logo al 60 % y centrado: Android recorta el icono con
 * la forma que le dé la gana (círculo, cuadrado redondeado…) y puede comerse
 * hasta un 20 % por cada lado.
 */
const maskable = (svg) =>
  svg
    .replace(/<svg([^>]*)>/, '<svg$1><rect width="100" height="100" fill="' + FONDO + '"/><g transform="translate(20 20) scale(0.6)">')
    .replace('</svg>', '</g></svg>')

const ENCARGOS = [
  { salida: 'icon-192.png', tam: 192, fondo: null },
  { salida: 'icon-512.png', tam: 512, fondo: null },
  // Apple no respeta la transparencia: sin fondo saldría sobre negro.
  { salida: 'apple-touch-icon.png', tam: 180, fondo: FONDO },
  { salida: 'icon-maskable-512.png', tam: 512, fondo: FONDO, transformar: maskable }
]

const origen = await fs.readFile(path.join(ICONS, 'favicon.svg'), 'utf8')
const navegador = await chromium.launch()

console.log('Generando iconos desde public/icons/favicon.svg')
for (const { salida, tam, fondo, transformar } of ENCARGOS) {
  const svg = (transformar ? transformar(origen) : origen)
    .replace(/width="\d+"\s+height="\d+"/, `width="${tam}" height="${tam}"`)

  const pagina = await navegador.newPage({ viewport: { width: tam, height: tam } })
  await pagina.setContent(`<body style="margin:0;background:${fondo ?? 'transparent'}">${svg}</body>`)
  await pagina.screenshot({ path: path.join(ICONS, salida), omitBackground: !fondo })
  await pagina.close()
  console.log(`  ${salida.padEnd(24)} ${tam}x${tam}`)
}

await navegador.close()
