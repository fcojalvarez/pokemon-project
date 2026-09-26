import { expect, test } from '@playwright/test'

/**
 * Lo de la revisión de accesibilidad que solo se puede comprobar en un
 * navegador de verdad: el orden del tabulador, a dónde va el foco, qué queda
 * inerte, y qué se ve en cada tamaño de pantalla.
 */

test('cada página tiene su título, su h1 y el idioma en español', async ({ page }) => {
  const paginas = [
    ['/', 'PogoDex', 'Pokédex'],
    ['/top', 'Top · PogoDex', 'Top'],
    ['/eventos', 'Eventos · PogoDex', 'Eventos'],
    ['/ahora', 'Ahora en juego · PogoDex', 'Ahora en juego'],
    ['/pokemon/6', 'Charizard · PogoDex', 'Charizard']
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
 * En móvil el botón va dentro del menú y en la cabecera no; desde 768 px, al
 * revés. Se rompió una vez y salía en los dos sitios a la vez.
 */
test('el botón de modo oscuro está en un solo sitio', async ({ page }) => {
  await page.goto('/pokemon/6')
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await expect(page.getByRole('dialog', { name: 'Menú' })).toBeVisible()

  const visibles = await page.evaluate(() =>
    [...document.querySelectorAll('button[aria-label="Modo oscuro"]')]
      .filter((b) => b.offsetWidth > 0 && getComputedStyle(b).visibility !== 'hidden')
      .map((b) => (b.closest('#menu-lateral') ? 'menú' : 'cabecera'))
  )
  const ancho = page.viewportSize().width
  expect(visibles).toEqual([ancho < 768 ? 'menú' : 'cabecera'])
})

test('los resultados del buscador se recorren con las flechas y se abren con Enter', async ({ page }) => {
  await page.goto('/top')
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
  await expect(page.locator('h1')).toHaveText(elegido.trim())
})
