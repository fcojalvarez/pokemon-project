import { readFileSync } from 'node:fs'
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

test('la Pokédex carga más al bajar, también después de buscar y borrar la búsqueda', async ({
  page
}) => {
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
  const orden = () =>
    page.locator('section[id^="ficha-"]').evaluateAll((els) => els.map((el) => el.id))
  const antes = async (a, b) => {
    const ids = await orden()
    return ids.indexOf(`ficha-${a}`) < ids.indexOf(`ficha-${b}`)
  }
  await expect(page.locator('#ficha-debilidades')).toBeAttached()

  // Debilidades va detrás de Efectos de fábrica: se sube por encima.
  expect(await antes('efectos', 'debilidades')).toBe(true)
  await page.getByRole('button', { name: 'Ordenar secciones' }).click()
  await page.getByRole('button', { name: 'Subir Debilidades' }).click()
  await page.getByRole('button', { name: 'Listo' }).click()

  await page.reload()
  await expect(page.locator('#ficha-debilidades')).toBeAttached()
  expect(await antes('debilidades', 'efectos')).toBe(true)

  await page.getByRole('button', { name: 'Ordenar secciones' }).click()
  await page.getByRole('button', { name: 'Restablecer orden' }).click()
  await page.getByRole('button', { name: 'Listo' }).click()
  expect(await antes('efectos', 'debilidades')).toBe(true)
})

test('al ordenar, una sección se puede arrastrar por su asa', async ({ page }) => {
  await page.goto('/pokemon/6')
  await expect(page.getByRole('heading', { level: 1, name: 'Charizard' })).toBeVisible()
  await expect(page.locator('#ficha-comparar')).toBeAttached()
  await page.getByRole('button', { name: 'Ordenar secciones' }).click()

  // La lista compacta, una fila por sección: se lleva la última arriba del todo.
  const filas = page.locator('ol > li')
  await page.locator('ol').evaluate((ol) => ol.scrollIntoView({ block: 'center' }))
  const primera = await filas.first().innerText()
  const ultima = filas.last()
  const asa = ultima.locator('span[aria-hidden="true"]').first()
  const desde = await asa.boundingBox()
  const hasta = await filas.first().boundingBox()
  await page.mouse.move(desde.x + desde.width / 2, desde.y + desde.height / 2)
  await page.mouse.down()
  await page.mouse.move(desde.x + desde.width / 2, hasta.y + 2, { steps: 20 })
  await page.mouse.up()
  await expect(filas.first()).toContainText('Comparar con')
  await expect(filas.nth(1)).toContainText(primera.trim().split(/\s*\n\s*/)[0])

  // Y de vuelta al último puesto: antes se quedaba siempre en el penúltimo.
  const asaArriba = filas.first().locator('span[aria-hidden="true"]').first()
  const otra = await asaArriba.boundingBox()
  const fondo = await filas.last().boundingBox()
  await page.mouse.move(otra.x + otra.width / 2, otra.y + otra.height / 2)
  await page.mouse.down()
  await page.mouse.move(otra.x + otra.width / 2, fondo.y + fondo.height - 2, { steps: 20 })
  await page.mouse.up()
  await expect(filas.last()).toContainText('Comparar con')

  await page.getByRole('button', { name: 'Restablecer orden' }).click()
})

test('la galería de formas se recorre con las flechas y se cierra con Escape', async ({ page }) => {
  await page.goto('/pokemon/25')
  const boton = page.getByRole('button', { name: /^(Formas|Disfraces)/ })
  await boton.click()
  const galeria = page.getByRole('dialog', { name: /Pikachu/ })
  await expect(galeria).toBeVisible()

  await galeria
    .getByRole('button', { name: /^Ver .* en grande$/ })
    .first()
    .click()
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

test('el detalle de un evento se cierra con Escape y con «atrás», sin salir de Eventos', async ({
  page
}) => {
  await page.goto('/events')
  const detalle = page.getByRole('dialog', { name: 'Detalle del evento' })
  const abrir = () =>
    page
      .locator('article')
      .first()
      .click({ position: { x: 20, y: 20 } })

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

test('«Añadir al calendario» ofrece Google, Apple o el archivo, y se cierra solo', async ({
  page
}) => {
  await page.goto('/events')
  await page.locator('article h2 button').first().click()
  const detalle = page.getByRole('dialog', { name: 'Detalle del evento' })
  await detalle.getByRole('button', { name: 'Añadir al calendario' }).click()
  const elegir = page.getByRole('dialog', { name: 'Añadir al calendario' })
  await expect(elegir).toBeVisible()

  // Los tres proyectos son Chrome fuera de Apple: Google va primero.
  const opciones = elegir.getByRole('link')
  await expect(opciones).toHaveCount(3)
  await expect(opciones.first()).toContainText('Google Calendar')
  const google = new URL(await opciones.nth(0).getAttribute('href'))
  expect(google.origin + google.pathname).toBe('https://calendar.google.com/calendar/render')
  expect(google.searchParams.get('dates')).toMatch(/^\d{8}T\d{6}Z?\/\d{8}T\d{6}Z?$/)
  await expect(opciones.nth(1)).toContainText('Calendario de Apple')
  await expect(opciones.nth(1)).toHaveAttribute('href', /^\/api\/calendario\?id=[\w-]+&titulo=/)
  await expect(opciones.nth(2)).toContainText('Descargar el archivo')
  await expect(opciones.nth(2)).toHaveAttribute('href', /&descargar=1$/)

  // Escape cierra solo el de elegir; el detalle sigue abierto.
  await page.keyboard.press('Escape')
  await expect(elegir).toBeHidden()
  await expect(detalle).toBeVisible()
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

test('los iconos de LeekDuck se ven aunque lleguen sin una cabecera CORS válida', async ({
  page
}) => {
  // Lo que pasaba en Android: la imagen existe, pero la cabecera CORS no vale
  // para nuestra web y, pedida con crossorigin, el navegador la rechaza. Sin
  // ninguna cabecera no se puede simular: Playwright pone la suya al contestar.
  // La imagen es una nuestra: lo que se prueba es la cabecera, y así el test
  // no depende de que el CDN de LeekDuck conteste a tiempo.
  //
  // La primera petición de cada icono se contesta tarde: es la del <img> que
  // Vue cambia por otro cuando llega el roster, y si su error llega después
  // del del nuevo es cuando se colaba como un segundo fallo.
  const sprite = readFileSync(new URL('../public/sprites/25.webp', import.meta.url))
  const pedidos = new Set()
  await page.route('https://cdn.leekduck.com/assets/img/pokemon_icons**', async (route) => {
    const url = route.request().url()
    if (!pedidos.has(url)) {
      pedidos.add(url)
      await new Promise((listo) => setTimeout(listo, 1500))
    }
    await route.fulfill({
      contentType: 'image/webp',
      body: sprite,
      headers: { 'access-control-allow-origin': 'https://otra-web.example' }
    })
  })
  // El feed se contesta aquí: el de verdad hay semanas que no trae ningún
  // icono de LeekDuck, y entonces no habría nada que comprobar. Son nombres
  // del roster a propósito: al llegar este, EventMon pasa de `span` a enlace
  // y cambia el <img>, que es lo que antes lo mandaba al respaldo.
  const icono = (fichero) => `https://cdn.leekduck.com/assets/img/pokemon_icons/${fichero}`
  // Hora local sin zona, como las publica LeekDuck.
  const local = (dias) => {
    const fecha = new Date(Date.now() + dias * 86_400_000)
    return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000).toISOString().slice(0, -1)
  }
  const evento = (eventID, eventType, extraData) => ({
    eventID,
    name: eventID,
    eventType,
    heading: eventType,
    link: `https://leekduck.com/events/${eventID}/`,
    image: null,
    start: local(-1),
    end: local(1),
    extraData
  })
  const xerneas = { name: 'Xerneas', image: icono('pokemon_icon_716_00.png'), canBeShiny: true }
  const victreebel = { name: 'Victreebel', image: icono('pm71.fMEGA.icon.png'), canBeShiny: false }
  const thundurus = { name: 'Thundurus', image: icono('pokemon_icon_642_11.png'), canBeShiny: true }
  await page.route('**/ScrapedDuck/data/events.json', (route) =>
    route.fulfill({
      json: [
        evento('e2e-incursiones', 'raid-battles', { raidbattles: { bosses: [xerneas] } }),
        evento('e2e-hora-destacada', 'pokemon-spotlight-hour', {
          spotlight: { ...victreebel, bonus: '2× Catch Candy', list: [victreebel] }
        }),
        evento('e2e-dia-comunidad', 'community-day', {
          communityday: { spawns: [thundurus], bonuses: [], bonusDisclaimers: [], shinies: [] }
        })
      ]
    })
  )
  await page.goto('/events')
  await expect(page.locator('main article').first()).toBeVisible()
  // Bajando poco a poco, para que carguen las perezosas.
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(150)
  }
  // Ninguna rota, y las tres de LeekDuck cargadas de verdad: basta con el
  // reintento sin crossorigin, sin caer al sprite de respaldo. Se espera a que
  // carguen: una imagen a medio bajar tampoco cuenta como rota.
  const estado = () =>
    page.locator('main article img').evaluateAll((imgs) => ({
      rotas: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
      deLeekDuck: imgs.filter(
        (i) => i.src.includes('pokemon_icons') && i.complete && i.naturalWidth > 0
      ).length
    }))
  await expect.poll(estado).toEqual({ rotas: 0, deLeekDuck: 3 })
})

test('la ficha dice en qué puesto queda con tus ataques', async ({ page }) => {
  await page.goto('/pokemon/150')
  const seccion = page.locator('#ficha-ataques')
  await expect(seccion).toBeVisible()
  // La sección, plegada en móvil y tablet (su botón es el del título).
  const plegada = seccion.locator('h2 button[aria-expanded="false"]')
  if (await plegada.count()) await plegada.click()
  // El nombre del botón lleva delante el del tipo (el icono): se busca por el final.
  const ataque = (nombre) =>
    seccion.locator('button[aria-pressed]').filter({ hasText: new RegExp(`^\\W*${nombre}$`) })
  // «¿Y con otros ataques?» empieza cerrado: los ataques no se pueden tocar.
  const otros = seccion.getByRole('button', { name: '¿Y con otros ataques?' })
  await expect(otros).toHaveAttribute('aria-expanded', 'false')
  await expect(seccion.locator('button[aria-pressed]')).toHaveCount(0)
  await otros.click()
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
  // Al cerrarlo se olvida lo elegido.
  await ataque('Psíquico').click()
  await otros.click()
  await expect(seccion.locator('button[aria-pressed]')).toHaveCount(0)
  await otros.click()
  await expect(ataque('Psicocorte')).toHaveAttribute('aria-pressed', 'false')
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

test('la calculadora de subida cambia con los tiradores y la variante', async ({ page }) => {
  await page.goto('/pokemon/6')
  const seccion = page.locator('#ficha-costes')
  await expect(seccion).toBeVisible()
  const plegada = seccion.locator('h2 button[aria-expanded="false"]')
  if (await plegada.count()) await plegada.click()
  const cifras = seccion.locator('dl')
  // De incursión (20) a 40, de entrada.
  await expect(cifras).toContainText('225.000')
  await expect(cifras).toContainText('248')
  // El de «hasta», al 50 con el teclado: aparecen los caramelos XL.
  await seccion.getByLabel('Hasta el nivel').focus()
  await page.keyboard.press('End')
  await expect(cifras).toContainText('475.000')
  await expect(cifras).toContainText('296')
  // Con suerte, la mitad de polvo.
  await seccion.getByRole('button', { name: 'Con suerte', exact: true }).click()
  await expect(cifras).toContainText('237.500')
})

test('el Top de gimnasio pone a Blissey primera y su ficha lo dice', async ({ page }) => {
  await page.goto('/top?mode=gym')
  const primera = page.locator('[data-fila-top]').first()
  await expect(primera).toContainText('Blissey')
  await expect(primera).toContainText('100')
  await page.goto('/pokemon/242')
  const seccion = page.locator('#ficha-pve')
  const plegada = seccion.locator('h2 button[aria-expanded="false"]')
  if (await plegada.count()) await plegada.click()
  await expect(seccion).toContainText('Defendiendo un gimnasio')
  await expect(seccion).toContainText('#1')
})

test('cada fila del Top de incursiones lleva su cifra con clima', async ({ page }) => {
  await page.goto('/top?kind=fire')
  const fila = page.locator('[data-fila-top]').first()
  await expect(fila.locator('[title^="Con Soleado"]')).toBeVisible()
})

test('una fusión dice cómo se consigue, lo que cuesta y su PC al fusionarla', async ({ page }) => {
  await page.goto('/pokemon/800?form=necrozma_dawn_wings')
  for (const id of ['donde', 'costes', 'pc']) {
    const plegada = page.locator(`#ficha-${id} h2 button[aria-expanded="false"]`)
    if (await plegada.count()) await plegada.click()
  }
  await expect(page.locator('#ficha-donde')).toContainText('se consigue fusionando')
  await expect(page.locator('#ficha-donde')).toContainText('Energía Fusión Lunar')
  await expect(page.locator('#ficha-costes')).toContainText('Fusiones')
  await expect(page.locator('#ficha-costes')).toContainText('Melena Crepuscular')
  await expect(page.locator('#ficha-pc')).toContainText('Al fusionarlo')
})
