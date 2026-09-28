import { expect, test } from '@playwright/test'

/**
 * Lo de la revisión de accesibilidad que solo se puede comprobar en un
 * navegador de verdad: el orden del tabulador, a dónde va el foco, qué queda
 * inerte, y qué se ve en cada tamaño de pantalla.
 */

test('cada página tiene su título, su h1 y el idioma en español', async ({ page }) => {
  const paginas = [
    ['/', 'PoGoDex', 'Pokédex'],
    ['/top', 'Top · PoGoDex', 'Top'],
    ['/events', 'Eventos · PoGoDex', 'Eventos'],
    ['/live', 'Ahora en el juego · PoGoDex', 'Ahora en el juego'],
    ['/pokemon/6', 'Charizard · PoGoDex', 'Charizard']
  ]
  for (const [ruta, titulo, h1] of paginas) {
    await page.goto(ruta)
    await expect(page).toHaveTitle(titulo)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText(h1)
    await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  }
})

test('con el teclado se llega a los Pokémon de la Pokédex y se abren con Enter', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Bulbasaur', { exact: true }).first()).toBeVisible()

  // Antes las tarjetas eran <section> con @click y el tabulador se las saltaba.
  let enTarjeta = false
  for (let i = 0; i < 12 && !enTarjeta; i++) {
    await page.keyboard.press('Tab')
    enTarjeta = await page.evaluate(() => document.activeElement?.hasAttribute('data-dex-tile'))
  }
  expect(enTarjeta).toBe(true)
  await expect(page.locator(':focus')).toContainText('Bulbasaur')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/pokemon\/1$/)
})

test('el primer Tab lleva a «Saltar al contenido», y este al contenido', async ({ page }) => {
  await page.goto('/top')
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toHaveText('Saltar al contenido')
  await page.keyboard.press('Enter')
  await expect(page.locator(':focus')).toHaveAttribute('id', 'contenido')
  // Sin cambiar de página: es un salto, no una navegación.
  await expect(page).toHaveURL(/\/top$/)
})

test('con el menú abierto la página queda inerte, y al cerrarlo vuelve el foco', async ({ page }) => {
  test.skip(page.viewportSize().width < 640, 'en móvil no hay menú: van Ajustes y la barra de abajo')
  await page.goto('/top')
  const abrir = page.getByRole('button', { name: 'Abrir menú' })
  await abrir.click()

  await expect(page.locator('#app')).toHaveAttribute('inert', '')
  await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible()
  await expect(page.locator(':focus')).toHaveText(/Pokédex/)

  await page.keyboard.press('Escape')
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '')
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeFocused()
})

/**
 * En móvil, Ajustes sustituye al menú: el panel sale del botón de ajustes, deja la
 * página inerte, cambia tema e idioma al momento y al cerrarlo devuelve el
 * foco a ese botón.
 */
test('en móvil los ajustes cambian tema e idioma y devuelven el foco', async ({ page }) => {
  test.skip(page.viewportSize().width >= 640, 'solo en móvil')
  await page.goto('/top')
  await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeHidden()
  await page.getByRole('button', { name: 'Abrir ajustes' }).click()

  // Por id: al cambiar a inglés el diálogo pasa a llamarse «Settings».
  const ajustes = page.locator('#ajustes')
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible()
  await expect(page.locator('#app')).toHaveAttribute('inert', '')

  await ajustes.getByRole('radio', { name: 'Oscuro' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await ajustes.getByRole('radio', { name: 'English' }).click()
  await expect(ajustes.getByRole('radio', { name: 'Light' })).toBeVisible()
  await ajustes.getByRole('radio', { name: 'Español' }).click()

  await page.keyboard.press('Escape')
  await expect(ajustes).toBeHidden()
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '')
  await expect(page.getByRole('button', { name: 'Abrir ajustes' })).toBeFocused()
})

/**
 * Desde sm va en la cabecera y no se repite en el menú: se rompió una vez y
 * salía en los dos sitios a la vez. En móvil, en la cabecera no está: vive en
 * Ajustes.
 */
test('el botón de modo oscuro está en un solo sitio', async ({ page }) => {
  await page.goto('/pokemon/6')
  if (page.viewportSize().width < 640) {
    await expect(page.locator('header button[aria-label="Modo oscuro"]')).toBeHidden()
    await page.getByRole('button', { name: 'Abrir ajustes' }).click()
    await expect(page.getByRole('dialog', { name: 'Ajustes' }).getByRole('radio', { name: 'Oscuro' })).toBeVisible()
    return
  }
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible()

  const visibles = await page.evaluate(() =>
    [...document.querySelectorAll('button[aria-label="Modo oscuro"]')]
      .filter((b) => b.offsetWidth > 0 && getComputedStyle(b).visibility !== 'hidden')
      .map((b) => (b.closest('#menu-lateral') ? 'menú' : 'cabecera'))
  )
  expect(visibles).toEqual(['cabecera'])
})

/**
 * En móvil el buscador es una lupa: al tocarla se abre con el foco dentro y
 * tapa el modo oscuro, que sale del tabulador. La ✕ lo vacía, lo pliega y
 * devuelve el foco a la lupa.
 */
test('en móvil el buscador se abre desde la lupa y se pliega con la ✕', async ({ page }) => {
  test.skip(page.viewportSize().width >= 768, 'solo en móvil')
  await page.goto('/')
  const lupa = page.getByRole('button', { name: 'Abrir el buscador' })
  const oscuro = page.locator('button[aria-label="Modo oscuro"]')
  await expect(oscuro).not.toHaveAttribute('inert', '')

  await lupa.click()
  await expect(page.locator('#input-search')).toBeFocused()
  await expect(oscuro).toHaveAttribute('inert', '')

  await page.locator('#input-search').fill('bulba')
  await expect(page).toHaveURL(/q=bulba/)
  await page.getByRole('button', { name: 'Cerrar el buscador' }).click()
  await expect(page).not.toHaveURL(/q=/)
  await expect(lupa).toBeFocused()
  await expect(oscuro).not.toHaveAttribute('inert', '')
})

test('los resultados del buscador se recorren con las flechas y se abren con Enter', async ({ page }) => {
  await page.goto('/top')
  if (page.viewportSize().width < 768) await page.getByRole('button', { name: 'Abrir el buscador' }).click()
  const campo = page.getByRole('combobox', { name: 'Buscar un Pokémon por nombre' })
  await campo.fill('charm')
  await expect(page.getByRole('listbox', { name: 'Resultados de la búsqueda' })).toBeVisible()
  await expect(page.getByRole('option').first()).toBeVisible()

  await campo.press('ArrowDown')
  const activa = await campo.getAttribute('aria-activedescendant')
  expect(activa).toBe('search-option-0')
  const elegido = await page.locator(`#${activa}`).innerText()
  await expect(page.locator(`#${activa}`)).toHaveAttribute('aria-selected', 'true')

  await campo.press('Enter')
  await expect(page).toHaveURL(/\/pokemon\/\d+$/)
  // La opción lleva debajo del nombre el número y las marcas: vale la primera línea.
  await expect(page.locator('h1')).toHaveText(elegido.split('\n')[0].trim())
})
