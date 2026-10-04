import { expect, test } from '@playwright/test'

/**
 * La ficha de un Pokémon: la línea evolutiva, las secciones plegables y cómo
 * se reparte en cada tamaño.
 */

// La tarjeta de la línea evolutiva: la que lleva ese título (su padre directo).
const cadena = (page) => page.getByRole('heading', { name: 'Línea evolutiva' }).locator('xpath=..')

test('la línea evolutiva de Eevee lo enseña una sola vez y agrupa sus evoluciones', async ({ page }) => {
  await page.goto('/pokemon/133')
  const linea = cadena(page)
  await expect(linea.getByRole('group', { name: '8 evoluciones' })).toBeVisible()

  // Antes salía una vez por rama: ocho Eevee.
  await expect(linea.getByText(/Eevee/)).toHaveCount(1)
  await expect(linea.getByRole('group', { name: '8 evoluciones' }).getByRole('link')).toHaveCount(8)
  await expect(linea.getByRole('group').getByText('Cebo musgoso')).toBeVisible()
})

test('las megas X e Y de Charizard van juntas en su grupo', async ({ page }) => {
  await page.goto('/pokemon/6')
  const grupo = cadena(page).getByRole('group', { name: 'Megaevoluciones' })
  await expect(grupo).toBeVisible()
  const enlaces = grupo.getByRole('link')
  await expect(enlaces).toHaveCount(2)
  await expect(enlaces.nth(0)).toHaveAttribute('href', '/pokemon/6?form=charizard_mega_x')
  await expect(enlaces.nth(1)).toHaveAttribute('href', '/pokemon/6?form=charizard_mega_y')

  // En su ficha, la mega es la marcada.
  await enlaces.nth(1).click()
  await expect(page).toHaveURL(/form=charizard_mega_y/)
  await expect(cadena(page).locator('[aria-current="page"]')).toContainText('Mega Charizard Y')
})

/**
 * Las marcas del sprite de la cabecera, como en su tarjeta de la Pokédex. Ya
 * no hay línea «Liberado: …»: la leyenda va al final de la ficha.
 */
const cabecera = (page) => page.locator('main header').first()
const marca = (page, nombre) => cabecera(page).getByRole('img', { name: nombre, exact: true })

test('el sprite de la cabecera lleva las marcas de lo que tiene liberado', async ({ page }) => {
  await page.goto('/pokemon/6')
  await expect(marca(page, 'Shiny liberado')).toBeVisible()
  await expect(marca(page, 'Puede dinamaxizar')).toBeVisible()
  await expect(marca(page, 'Puede gigamaxizar')).toBeVisible()
  await expect(page.locator('main p', { hasText: /^Liberado:/ })).toHaveCount(0)
  // La leyenda, al final de la ficha.
  await expect(page.getByRole('list', { name: 'Leyenda' })).toBeVisible()

  // Dinamax sí, Gigamax no.
  await page.goto('/pokemon/1')
  await expect(marca(page, 'Puede dinamaxizar')).toBeVisible()
  await expect(marca(page, 'Puede gigamaxizar')).toHaveCount(0)

  // Sin combates Max: solo el shiny.
  await page.goto('/pokemon/151')
  await expect(marca(page, 'Shiny liberado')).toBeVisible()
  await expect(marca(page, 'Puede dinamaxizar')).toHaveCount(0)
})

/** A 1024 px, el escritorio más estrecho, las megas X e Y se montaban. */
test.describe('escritorio estrecho', () => {
  test.use({ viewport: { width: 1024, height: 768 } })
  test.skip(({ isMobile }) => isMobile, 'el ancho de escritorio no aplica a un móvil')

  test('las megas de Charizard no se montan una sobre otra', async ({ page }) => {
    await page.goto('/pokemon/6')
    const enlaces = cadena(page).getByRole('group', { name: 'Megaevoluciones' }).getByRole('link')
    await expect(enlaces).toHaveCount(2)
    const [x, y] = [await enlaces.nth(0).boundingBox(), await enlaces.nth(1).boundingBox()]
    expect(x.x + x.width).toBeLessThanOrEqual(y.x)
  })
})

test.describe('secciones plegables (móvil y tablet)', () => {
  test.skip(({ viewport }) => viewport.width >= 1024, 'en escritorio van siempre abiertas')

  test('empiezan cerradas, con su resumen, y lo que se abre se recuerda en otras fichas', async ({ page }) => {
    await page.goto('/pokemon/6')
    const debilidades = page.getByRole('button', { name: /^Debilidades/ })
    await expect(debilidades).toHaveAttribute('aria-expanded', 'false')
    // Cerrada, dice lo importante sin abrirla.
    await expect(debilidades).toContainText('Roca ×2,56')

    const ataques = page.getByRole('button', { name: /^Mejores ataques/ })
    await ataques.click()
    await expect(ataques).toHaveAttribute('aria-expanded', 'true')

    await page.goto('/pokemon/133')
    await expect(page.getByRole('button', { name: /^Mejores ataques/ })).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('button', { name: /^Debilidades/ })).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('escritorio', () => {
  test.skip(({ viewport }) => viewport.width < 1024, 'solo en escritorio')

  test('las secciones van abiertas y en dos columnas', async ({ page }) => {
    await page.goto('/pokemon/6')
    await expect(page.getByRole('heading', { name: 'Mejores ataques' })).toBeVisible()
    await expect(page.locator('main h2 > button')).toHaveCount(0)

    const donde = await page.getByRole('heading', { name: 'Dónde conseguirlo' }).boundingBox()
    const ataques = await page.getByRole('heading', { name: 'Mejores ataques' }).boundingBox()
    expect(ataques.x).toBeGreaterThan(donde.x + 300)
  })
})

/** B1: la etiqueta y el valor de cada coste se pisaban en móvil. */
test('los costes no se montan unos encima de otros', async ({ page }) => {
  await page.goto('/pokemon/6')
  // Se espera a la ficha: antes de que cargue, el botón aún no existe.
  await expect(page.getByRole('heading', { name: /^Avisos y costes/ })).toBeVisible()
  const seccion = page.getByRole('button', { name: /^Avisos y costes/ })
  if (await seccion.count()) await seccion.click()
  await expect(page.getByText('Purificar')).toBeVisible()

  const solapadas = await page.evaluate(() => {
    const filas = [...document.querySelectorAll('li')].filter((li) => li.children.length === 2 && li.closest('main'))
    return filas.filter((li) => {
      const [a, b] = [...li.children].map((e) => e.getBoundingClientRect())
      return a.right > b.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1
    }).map((li) => li.innerText.replace(/\s+/g, ' '))
  })
  expect(solapadas).toEqual([])
})

test('el favicon es el icono de la app', async ({ page, request }) => {
  await page.goto('/')
  const svg = page.locator('link[rel="icon"][type="image/svg+xml"]')
  await expect(svg).toHaveAttribute('href', '/icons/favicon.svg')
  const respuesta = await request.get('/icons/favicon.svg')
  expect(respuesta.ok()).toBe(true)
  expect(await respuesta.text()).toContain('#2563EB')
})
