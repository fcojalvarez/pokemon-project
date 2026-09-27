import { expect, test } from '@playwright/test'

/**
 * Lo que un test unitario no puede ver: que la página quepa a lo ancho.
 *
 * El desbordamiento horizontal es el fallo típico al tocar tipografías o
 * añadir insignias, y en móvil lo sufre el jugador cada vez que hace scroll.
 * Por eso esta comprobación corre en los tres tamaños.
 */

const RUTAS = [
  { url: '/', nombre: 'Pokédex' },
  { url: '/top', nombre: 'Top' },
  { url: '/live', nombre: 'Ahora en juego' },
  { url: '/events', nombre: 'Eventos' },
  { url: '/pokemon/3', nombre: 'Ficha de Pokémon' }
]

for (const ruta of RUTAS) {
  test(`${ruta.nombre} cabe a lo ancho`, async ({ page }) => {
    await page.goto(ruta.url)
    await page.waitForLoadState('networkidle')

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }))

    // 1px de margen por redondeos del navegador.
    expect(scrollWidth, `${ruta.nombre} desborda a lo ancho`).toBeLessThanOrEqual(clientWidth + 1)
  })
}

test('ninguna vista principal suelta errores de consola', async ({ page }) => {
  const errores = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errores.push(msg.text())
  })
  page.on('pageerror', (err) => errores.push(err.message))

  for (const ruta of RUTAS) {
    await page.goto(ruta.url)
    await page.waitForLoadState('networkidle')
  }

  // Las imágenes de terceros (LeekDuck) pueden fallar sin que sea culpa nuestra.
  const propios = errores.filter((e) => !/Failed to load resource/i.test(e))
  expect(propios).toEqual([])
})

/**
 * El texto secundario estaba a 0.6rem (9,6px), que no hay quien lo lea.
 * Si alguien lo vuelve a bajar, que salte aquí.
 */
test('el texto más pequeño sigue siendo legible', async ({ page }) => {
  await page.goto('/pokemon/3')
  await page.waitForLoadState('networkidle')

  const tamaños = await page.locator('.text-mini').first().evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize)
  )
  expect(tamaños).toBeGreaterThanOrEqual(12)
})
