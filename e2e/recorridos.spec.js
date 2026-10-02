import { expect, test } from '@playwright/test'

/**
 * Recorridos que no tenían test: el scroll infinito de la Pokédex, ordenar
 * la ficha, la galería de formas, el detalle de un evento, las sugerencias y
 * el idioma que se queda al recargar.
 */

/**
 * El botón de Ajustes (móvil) o el del menú (desde sm), ya pintado: la app se
 * monta cuando el router llega a la vista, y un isVisible de antes daba false.
 */
async function botonDeLaCabecera(page) {
  const ajustes = page.getByRole('button', { name: /^(Abrir ajustes|Open settings)$/ })
  const menu = page.getByRole('button', { name: /^(Abrir menú|Open menu)$/ })
  await expect(ajustes.or(menu)).toBeVisible()
  return (await ajustes.isVisible()) ? { ajustes } : { menu }
}

/** Sugerencias está en Ajustes en móvil y en el menú lateral desde sm. */
async function abrirSugerencias(page) {
  const { ajustes } = await botonDeLaCabecera(page)
  if (ajustes) await ajustes.click()
  else await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page.getByRole('button', { name: 'Sugerencias' }).click()
  await expect(page.getByRole('dialog', { name: 'Enviar una sugerencia' })).toBeVisible()
}

test('la Pokédex carga más al bajar, también después de buscar y borrar la búsqueda', async ({ page }) => {
  await page.goto('/')
  const tarjetas = page.locator('[data-dex-tile]')
  await expect(tarjetas).toHaveCount(100)

  // Hasta el fondo y vuelta a mirar: la página siguiente llega por el scroll.
  const bajarHastaQueHaya = async (cuantas) => {
    await expect(async () => {
      await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight))
      expect(await tarjetas.count()).toBeGreaterThan(cuantas)
    }).toPass({ timeout: 20_000 })
  }
  await bajarHastaQueHaya(100)
  // La segunda página empieza justo donde acabó la primera: sin repetir el 100.
  await expect(page.locator('[data-dex-tile][href="/pokemon/100"]')).toHaveCount(1)
  await expect(page.locator('[data-dex-tile][href="/pokemon/101"]')).toHaveCount(1)

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Abrir el buscador' }).click()
  await page.locator('#input-search').fill('pikachu')
  await expect(tarjetas.first()).toContainText('Pikachu')
  await page.getByRole('button', { name: 'Cerrar el buscador' }).click()
  await expect(tarjetas).toHaveCount(100)
  // Si la carga se quedaba encendida tras la búsqueda, aquí ya no bajaba más.
  await bajarHastaQueHaya(100)
})

test('el orden de las secciones de la ficha se guarda y se puede restablecer', async ({ page }) => {
  await page.goto('/pokemon/6')
  await expect(page.getByRole('heading', { level: 1, name: 'Charizard' })).toBeVisible()
  // El orden en la página (en escritorio van en dos columnas, así que lo
  // que cuenta es el del DOM y no la posición en pantalla).
  const orden = () => page.locator('section[id^="ficha-"]').evaluateAll((els) => els.map((el) => el.id))
  const antes = async (a, b) => {
    const ids = await orden()
    return ids.indexOf(`ficha-${a}`) < ids.indexOf(`ficha-${b}`)
  }
  await expect(page.locator('#ficha-debilidades')).toBeAttached()

  await page.getByRole('button', { name: 'Ordenar secciones' }).click()
  // Debilidades va la última de fábrica: se sube por encima de Efectos.
  expect(await antes('efectos', 'debilidades')).toBe(true)
  await page.getByRole('button', { name: 'Subir Debilidades' }).click()
  await page.getByRole('button', { name: 'Listo' }).click()

  await page.reload()
  await expect(page.locator('#ficha-debilidades')).toBeAttached()
  expect(await antes('debilidades', 'efectos')).toBe(true)

  await page.getByRole('button', { name: 'Ordenar secciones' }).click()
  await page.getByRole('button', { name: 'Restablecer orden' }).click()
  expect(await antes('efectos', 'debilidades')).toBe(true)
})

test('la galería de formas se recorre con las flechas y se cierra con Escape', async ({ page }) => {
  await page.goto('/pokemon/25')
  const boton = page.getByRole('button', { name: /^(Formas|Disfraces)/ })
  await boton.click()
  const galeria = page.getByRole('dialog', { name: /Pikachu/ })
  await expect(galeria).toBeVisible()

  await galeria.getByRole('button', { name: /^Ver .* en grande$/ }).first().click()
  // En grande: la imagen lleva el nombre de la forma y debajo va «1 / N».
  await expect(galeria.getByText(/^1 \/ \d+$/)).toBeVisible()
  const nombre = () => galeria.getByRole('img').first().getAttribute('alt')
  const antes = await nombre()
  await galeria.getByRole('button', { name: 'Siguiente' }).click()
  await expect(galeria.getByText(/^2 \/ \d+$/)).toBeVisible()
  await expect.poll(nombre).not.toBe(antes)
  await galeria.getByRole('button', { name: 'Volver a la galería' }).click()
  await expect(galeria.getByRole('button', { name: /^Ver .* en grande$/ }).first()).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(galeria).toBeHidden()
  await expect(boton).toBeFocused()
})

test('el detalle de un evento se cierra con Escape y con «atrás», sin salir de Eventos', async ({ page }) => {
  await page.goto('/events')
  const detalle = page.getByRole('dialog', { name: 'Detalle del evento' })
  const abrir = () => page.locator('article').first().click({ position: { x: 20, y: 20 } })

  await expect(page.locator('article').first()).toBeVisible()
  await abrir()
  await expect(detalle).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(detalle).toBeHidden()

  await abrir()
  await expect(detalle).toBeVisible()
  await page.goBack()
  await expect(detalle).toBeHidden()
  await expect(page).toHaveURL(/\/events/)
})

test('un evento en marcha se descarga como .ics para el calendario', async ({ page }) => {
  await page.goto('/events')
  await page.locator('article h2 button').first().click()
  const detalle = page.getByRole('dialog', { name: 'Detalle del evento' })
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    detalle.getByRole('button', { name: 'Añadir al calendario' }).click()
  ])
  expect(descarga.suggestedFilename()).toMatch(/\.ics$/)
})

test('la ficha compara con otro Pokémon elegido por su nombre', async ({ page }) => {
  await page.goto('/pokemon/6')
  const seccion = page.locator('#ficha-comparar')
  await expect(seccion).toBeVisible()
  // En móvil y tablet va plegada; en escritorio, siempre abierta.
  const plegada = seccion.locator('button[aria-expanded="false"]')
  if (await plegada.count()) await plegada.click()
  await seccion.getByRole('searchbox').fill('blasto')
  await seccion.getByRole('button', { name: /^Blastoise #9$/ }).click()
  const tabla = seccion.getByRole('table')
  await expect(tabla.getByRole('columnheader', { name: 'Blastoise' })).toBeVisible()
  await expect(tabla.getByRole('rowheader', { name: 'Ataque' })).toBeVisible()
  await seccion.getByRole('button', { name: 'Comparar con otro' }).click()
  await expect(seccion.getByRole('searchbox')).toBeVisible()
})

test('la pestaña Rocket enseña las alineaciones y los counters de un recluta', async ({ page }) => {
  // El feed se contesta aquí: el de verdad cambia cada pocas semanas.
  const mon = (name, dex, isEncounter = false) => ({
    name,
    image: `https://cdn.leekduck.com/assets/img/pokemon_icons_crop/pm${dex}.icon.png`,
    isEncounter
  })
  await page.route('**/rocketLineups.json', (route) =>
    route.fulfill({
      json: [
        {
          name: 'Giovanni',
          title: 'Team GO Rocket Boss',
          type: '',
          firstPokemon: [mon('Persian', 53)],
          secondPokemon: [mon('Kangaskhan', 115)],
          thirdPokemon: [mon('Zekrom', 644, true)]
        },
        {
          name: 'Fire-type Female Grunt',
          title: 'Team GO Rocket Grunt',
          type: 'fire',
          firstPokemon: [mon('Ponyta', 77, true)],
          secondPokemon: [mon('Magmar', 126)],
          thirdPokemon: [mon('Magmortar', 467)]
        }
      ]
    })
  )
  await page.goto('/live?tab=rocket')
  await expect(page.getByRole('heading', { name: 'Giovanni', level: 3 })).toBeVisible()
  const recluta = page.locator('article', { hasText: 'Recluta de tipo Fuego (chica)' })
  await expect(recluta.getByText('Se atrapa')).toBeVisible()
  await recluta.getByRole('button', { name: /Recluta de tipo Fuego/ }).click()
  await expect(recluta.getByText('Débil a')).toBeVisible()
})

test('la semana de Eventos va por días y cada fila abre su detalle', async ({ page }) => {
  await page.goto('/events')
  await page.getByRole('button', { name: 'Semana', exact: true }).first().click()
  await expect(page).toHaveURL(/view=week/)
  await expect(page.getByRole('heading', { name: /^Hoy/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Mañana/ })).toBeVisible()
  // La semana no se filtra por tipo.
  await expect(page.getByRole('group', { name: 'Tipo de evento' })).toHaveCount(0)
  await page.locator('section[aria-labelledby^="semana-"] li button').first().click()
  await expect(page.getByRole('dialog', { name: 'Detalle del evento' })).toBeVisible()
})

test('los iconos de LeekDuck se ven aunque lleguen sin una cabecera CORS válida', async ({ page }) => {
  // Lo que pasaba en Android: la imagen existe, pero la cabecera CORS no vale
  // para nuestra web y, pedida con crossorigin, el navegador la rechaza. Sin
  // ninguna cabecera no se puede simular: Playwright pone la suya al contestar.
  await page.route('https://cdn.leekduck.com/assets/img/pokemon_icons**', async (route) => {
    const respuesta = await route.fetch()
    const headers = { ...respuesta.headers() }
    for (const clave of Object.keys(headers)) {
      if (clave.toLowerCase().startsWith('access-control-')) delete headers[clave]
    }
    headers['access-control-allow-origin'] = 'https://otra-web.example'
    await route.fulfill({ response: respuesta, headers })
  })
  await page.goto('/events')
  await expect(page.locator('main article').first()).toBeVisible()
  // Bajando poco a poco, para que carguen las perezosas.
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(150)
  }
  const rotas = () =>
    page
      .locator('main article img')
      .evaluateAll((imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).length)
  await expect.poll(rotas).toBe(0)
  // Y que siguen siendo las de LeekDuck: basta con el reintento sin crossorigin.
  expect(await page.locator('main article img[src*="pokemon_icons"]').count()).toBeGreaterThan(0)
})

test('la ficha dice en qué puesto queda con tus ataques', async ({ page }) => {
  await page.goto('/pokemon/150')
  const seccion = page.locator('#ficha-ataques')
  await expect(seccion).toBeVisible()
  const plegada = seccion.locator('button[aria-expanded="false"]')
  if (await plegada.count()) await plegada.click()
  // El nombre del botón lleva delante el del tipo (el icono): se busca por el final.
  const ataque = (nombre) =>
    seccion.locator('button[aria-pressed]').filter({ hasText: new RegExp(`^\\W*${nombre}$`) })
  await ataque('Psicocorte').click()
  await expect(ataque('Psicocorte')).toHaveAttribute('aria-pressed', 'true')
  await ataque('Psíquico').click()
  const resultado = seccion.getByRole('status')
  await expect(resultado).toContainText('Psicocorte + Psíquico')
  await expect(resultado).toContainText(/General\s*#\d+/)
  await expect(resultado).toContainText('del daño de su mejor conjunto')
  // Tocar otra vez el elegido lo quita, y sin los dos no hay resultado.
  await ataque('Psíquico').click()
  await expect(resultado).toBeEmpty()
})

test('una sugerencia demasiado corta no sale; una buena, sí', async ({ page }) => {
  // Nunca se escribe en la tabla de verdad: el insert se contesta aquí.
  const enviadas = []
  await page.route('**/rest/v1/suggestions**', async (route) => {
    enviadas.push(route.request().postDataJSON())
    await route.fulfill({ status: 201, body: '' })
  })

  await page.goto('/top')
  await abrirSugerencias(page)
  const dialogo = page.getByRole('dialog', { name: 'Enviar una sugerencia' })

  await dialogo.getByLabel('Tu sugerencia').fill('corto')
  await dialogo.getByRole('button', { name: 'Enviar' }).click()
  await expect(dialogo.getByRole('alert')).toContainText('menos de 10 caracteres')
  expect(enviadas).toHaveLength(0)

  await dialogo.getByLabel('Tu sugerencia').fill('Estaría bien poder filtrar la Pokédex por región')
  await dialogo.getByRole('button', { name: 'Enviar' }).click()
  await expect(dialogo.getByText('¡Gracias! Sugerencia enviada.')).toBeVisible()
  expect(enviadas).toHaveLength(1)
  expect(enviadas[0]).toMatchObject({ category: 'idea', page: '/top', contact: null })
})

test('el idioma elegido se queda al recargar', async ({ page }) => {
  await page.goto('/top')
  const { ajustes } = await botonDeLaCabecera(page)
  if (ajustes) {
    await ajustes.click()
    await page.locator('#ajustes').getByRole('radio', { name: 'English' }).click()
    await page.keyboard.press('Escape')
  } else {
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByRole('button', { name: /^Cambiar idioma/ }).click()
    await page.getByRole('menuitemradio', { name: 'English' }).click()
  }
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle(/Top · PoGoDex/)
  // Una etiqueta de la app, ya en inglés (en móvil, el botón de los filtros).
  await expect(page.getByRole('button', { name: /^(Open menu|Open settings)$/ })).toBeVisible()
})
