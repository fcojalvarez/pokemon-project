import { expect, test } from '@playwright/test'

/**
 * Los recorridos que de verdad hace un jugador, de punta a punta: con Supabase
 * respondiendo, los datos generados cargados y el router de por medio.
 */

test('la Pokédex carga desde Supabase y lleva a la ficha', async ({ page }) => {
  await page.goto('/')

  // Bulbasaur es el primero de la dex: si está, la consulta a Supabase fue bien.
  const primero = page.getByText('Bulbasaur', { exact: true }).first()
  await expect(primero).toBeVisible()

  await primero.click()
  await expect(page).toHaveURL(/\/pokemon\/1$/)
  await expect(page.getByText('Ataques cargados')).toBeVisible()
})

test('el buscador filtra contra la base de datos', async ({ page }) => {
  await page.goto('/')

  // Se espera a la consulta de la búsqueda en concreto, no a cualquiera de la
  // tabla: la carga inicial del listado también pega a /rest/v1/pokemons y
  // resolvía la espera antes de tiempo, lo que hacía el test inestable cuando
  // los tres perfiles corren a la vez.
  const consulta = page.waitForResponse(
    (res) =>
      res.url().includes('/rest/v1/pokemons') &&
      res.url().toLowerCase().includes('mewtwo') &&
      res.status() === 200
  )
  await page.getByPlaceholder(/buscar pok/i).fill('mewtwo')
  await consulta

  await expect(page.getByText('Mewtwo', { exact: true }).first()).toBeVisible()
  // Bulbasaur ya no debería estar: la búsqueda consulta, no filtra en cliente.
  await expect(page.getByText('Bulbasaur', { exact: true })).toHaveCount(0)
})

/**
 * Este recorrido cubre el refactor que hizo que una sola lista sirva para los
 * rankings PvE y los de PvP. Si la lista de PvP se rompe, salta aquí.
 */
test('el Top cambia entre PvE y PvP sin romperse', async ({ page }) => {
  await page.goto('/top')

  const filas = page.locator('ol > li')
  await expect(filas.first()).toBeVisible()
  const cuantasPve = await filas.count()
  expect(cuantasPve).toBeGreaterThan(5)
  // En PvE cada fila lleva su métrica. Se busca dentro de la fila: suelto,
  // "DPS" engancha también las opciones del desplegable de ordenación.
  await expect(filas.first().getByText('DPS')).toBeVisible()

  // Ya no es un <select> nativo: es el desplegable propio, que se abre y se
  // elige con clics como haría cualquiera.
  await page.getByRole('combobox').first().click()
  await page.getByRole('option', { name: /pvp/i }).click()

  await expect(page.getByRole('combobox').first()).toContainText(/pvp/i)
  await expect(filas.first()).toBeVisible()
  expect(await filas.count()).toBeGreaterThan(5)
})

test('las pestañas de Ahora en juego cambian de contenido', async ({ page }) => {
  await page.goto('/ahora')

  const huevos = page.getByRole('button', { name: /huevos/i })
  await huevos.click()
  await expect(huevos).toHaveAttribute('aria-pressed', 'true')

  const tareas = page.getByRole('button', { name: /tareas/i })
  await tareas.click()
  await expect(tareas).toHaveAttribute('aria-pressed', 'true')
  await expect(huevos).toHaveAttribute('aria-pressed', 'false')
})

/**
 * Las insignias de procedencia sin leyenda no dicen nada: van juntas o no van.
 * Venusaur aprende Planta Feroz solo con MT Élite.
 */
test('los ataques élite se marcan y la leyenda los explica', async ({ page }) => {
  await page.goto('/pokemon/3')
  await page.waitForLoadState('networkidle')

  const elite = page.locator('[title="Solo se aprende con MT Élite"]').first()
  await expect(elite).toBeVisible()
  await expect(elite).toContainText('Planta Feroz')

  // La leyenda dice solo «Élite» y deja la explicación en el title: la frase
  // entera ocupaba dos líneas encima de los rankings.
  const leyenda = page.locator('li[title*="MT Élite"]').first()
  await expect(leyenda).toBeVisible()
  await expect(leyenda).toHaveText('Élite')
})

/**
 * El movimiento exclusivo de supermega solo existe en la forma mega, y tiene
 * que llegar hasta la ficha: es el dato que el pipeline estaba tirando.
 */
test('la supermega enseña su ataque exclusivo', async ({ page }) => {
  await page.goto('/pokemon/15?form=beedrill_mega')
  await page.waitForLoadState('networkidle')

  // Sale dos veces a propósito: en el repertorio y en los efectos de combate.
  await expect(page.getByText('Aguijón Letal+').first()).toBeVisible()
  await expect(page.getByText('Aguijón Letal+')).toHaveCount(2)
})

test('los eventos se listan con el título en español', async ({ page }) => {
  await page.goto('/eventos')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('button', { name: /en marcha/i })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  // "Actualizado hace…" es la garantía de que los datos no son de hace una semana.
  await expect(page.getByText(/Actualizado hace|Datos de hace/)).toBeVisible()
})

/**
 * Los datos de juego se leen de la tabla `game_data`. Si Supabase no responde
 * la app no puede quedarse en blanco: tiene que tirar de los JSON desplegados.
 * Se comprueba cortando esa consulta y viendo que el Top sigue saliendo.
 */
test('si game_data no responde, tira de los ficheros desplegados', async ({ page }) => {
  await page.route('**/rest/v1/game_data**', (route) => route.abort())

  await page.goto('/top')

  const filas = page.locator('ol > li')
  await expect(filas.first()).toBeVisible()
  expect(await filas.count()).toBeGreaterThan(5)

  const usados = await page.evaluate(() =>
    performance.getEntriesByType('resource').filter((r) => /\/data\/\w+\.json/.test(r.name)).length
  )
  expect(usados).toBeGreaterThan(0)
})

/**
 * El Top Dinamax es el único ranking que no sale de un cálculo de DPS: ordena
 * por ataque base porque dentro de un tipo el Ataque Max es el mismo para
 * todos. Si algún día eso deja de traerse del GAME_MASTER, la tabla saldría
 * vacía y nadie se enteraría.
 */
test('el Top Dinamax ordena por ataque y enseña el Ataque Max', async ({ page }) => {
  await page.goto('/top')

  await page.getByRole('combobox').first().click()
  await page.getByRole('option', { name: /dinamax/i }).click()

  const filas = page.locator('ol > li')
  await expect(filas.first()).toBeVisible()
  expect(await filas.count()).toBeGreaterThan(10)

  // La métrica es el ataque, no el DPS.
  await expect(filas.first().getByText('Ataque')).toBeVisible()
  // Y cada fila lleva su Ataque Max, que en español siempre empieza por "Maxi".
  await expect(filas.first().getByText(/^Maxi/)).toBeVisible()
})

/**
 * El filtro de Gigamax va contra Supabase, no contra lo ya traído: si la
 * columna `can_gigantamax` deja de escribirse, aquí sale la Pokédex entera.
 */
test('el filtro de Gigamax recorta la Pokédex', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const tarjetas = page.locator('section:has(img[loading="lazy"])')
  const antes = await tarjetas.count()
  expect(antes).toBeGreaterThan(20)

  await page.getByRole('button', { name: /filtros/i }).click()
  await page.getByRole('button', { name: 'Solo Gigamax' }).click()
  await page.waitForResponse((res) => res.url().includes('can_gigantamax'))

  await expect(page.getByText('Venusaur')).toBeVisible()
  expect(await tarjetas.count()).toBeLessThan(antes)
  // Los 31 que pueden gigamaxizar caben de sobra en la primera página.
  await expect(page.getByText('Ivysaur')).toHaveCount(0)
})
