import { expect, test } from '@playwright/test'

/** En móvil los filtros del Top van plegados: se abren antes de tocarlos. */
async function abrirFiltrosTop(page) {
  // isVisible no espera: si la vista aún no estaba pintada no se abrían los
  // filtros y el test se quedaba esperando un desplegable que no llegaba.
  await page.getByRole('heading', { level: 1, name: 'Top' }).waitFor()
  const boton = page.locator('button[aria-controls="filtros-top"]')
  if (await boton.isVisible()) await boton.click()
}

/**
 * Cambia el modo del Top: PvE o PvP, siempre a la vista, y si hace falta su
 * variante (Incursiones o Max; la liga), que va lo primero de los filtros.
 */
async function elegirModoTop(page, { familia, variante }) {
  await page.getByRole('heading', { level: 1, name: 'Top' }).waitFor()
  await page
    .getByRole('group', { name: 'Modo', exact: true })
    .getByRole('button', { name: familia, exact: true })
    .click()
  if (!variante) return
  await abrirFiltrosTop(page)
  await page
    .getByRole('group', { name: /^(liga|modo pve)$/i })
    .getByRole('button', { name: variante, exact: true })
    .click()
}

/** Marca o desmarca una opción de «Incluir», el desplegable de varias del Top. */
async function alternarIncluir(page, opcion) {
  await page.getByRole('combobox', { name: /incluir/i }).click()
  await page.getByRole('option', { name: new RegExp(`^${opcion}`) }).click()
  await page.keyboard.press('Escape')
}

/**
 * En móvil y tablet las secciones de la ficha empiezan plegadas: para mirar
 * lo que hay dentro, antes hay que abrirlas. En escritorio van siempre
 * abiertas y no hay botón, así que no hace nada.
 */
/**
 * La etiqueta de la métrica del Top: en la lista va en cada fila; en la tabla
 * de escritorio ancho, en la cabecera de su columna.
 */
async function etiquetaDeMetrica(page, filas, texto) {
  await expect(filas.first()).toBeVisible()
  if (await page.locator('table').count()) return page.getByRole('columnheader', { name: texto })
  return filas.first().getByText(texto)
}

async function abrirSecciones(page, ...titulos) {
  for (const titulo of titulos) {
    const boton = page.getByRole('button', { name: new RegExp(`^${titulo}`) })
    if ((await boton.count()) && (await boton.getAttribute('aria-expanded')) === 'false')
      await boton.click()
  }
}

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
  await expect(page.getByRole('heading', { name: 'Mejores ataques' })).toBeVisible()
  await abrirSecciones(page, 'Mejores ataques')
  await expect(page.getByText('Ataques cargados')).toBeVisible()
})

test('el buscador filtra contra la base de datos', async ({ page }) => {
  await page.goto('/')

  // Se espera a la consulta de la búsqueda en concreto, no a cualquiera de la
  // tabla: la carga inicial del listado también pega a /rest/v1/pokemons y
  // resolvía la espera antes de tiempo, lo que hacía el test inestable cuando
  // los tres perfiles corren a la vez. La búsqueda encuentra los nombres en la
  // lista (sin fijarse en signos) y pide sus fichas por número: Mewtwo, 150.
  const consulta = page.waitForResponse(
    (res) =>
      res.url().includes('/rest/v1/pokemons') &&
      decodeURIComponent(res.url()).includes('pokemon_id=in.(150)') &&
      res.status() === 200
  )
  // El buscador empieza plegado en una lupa (en todos los anchos): se abre
  // como lo abriría una persona. Rellenarlo plegado a veces no llegaba a
  // lanzar la búsqueda.
  await page.getByRole('button', { name: 'Abrir el buscador' }).click()
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

  const filas = page.locator('[data-fila-top]')
  await expect(filas.first()).toBeVisible()
  const cuantasPve = await filas.count()
  expect(cuantasPve).toBeGreaterThan(5)
  // La métrica: en la fila (lista) o en la cabecera (tabla). Suelto, "DPS"
  // engancharía también las opciones del desplegable de ordenación.
  await expect(await etiquetaDeMetrica(page, filas, /^dps$/i)).toBeVisible()

  // Ya no es un <select> nativo: es el desplegable propio, que se abre y se
  // elige con clics como haría cualquiera.
  await elegirModoTop(page, { familia: 'PvP' })

  await expect(page).toHaveURL(/mode=pvp/)
  await expect(filas.first()).toBeVisible()
  expect(await filas.count()).toBeGreaterThan(5)
})

test('las pestañas de Ahora en juego cambian de contenido', async ({ page }) => {
  await page.goto('/live')

  const huevos = page.getByRole('button', { name: /huevos/i })
  await huevos.click()
  await expect(huevos).toHaveAttribute('aria-pressed', 'true')

  const misiones = page.getByRole('button', { name: /misiones/i })
  await misiones.click()
  await expect(misiones).toHaveAttribute('aria-pressed', 'true')
  await expect(huevos).toHaveAttribute('aria-pressed', 'false')
})

/**
 * Las insignias de procedencia sin leyenda no dicen nada: van juntas o no van.
 * Venusaur aprende Planta Feroz solo con MT Élite.
 */
test('los ataques élite se marcan y la leyenda los explica', async ({ page }) => {
  await page.goto('/pokemon/3')
  await page.waitForLoadState('networkidle')
  await abrirSecciones(page, 'Mejores ataques')

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
  await abrirSecciones(page, 'Mejores ataques', 'Efectos en combate')

  // Sale en el repertorio y en los efectos de combate, y desde que tiene datos
  // de incursión (de Pokebattler) también en las mejores combinaciones.
  await expect(page.getByText('Aguijón Letal+').first()).toBeVisible()
  expect(await page.getByText('Aguijón Letal+').count()).toBeGreaterThanOrEqual(2)
})

test('los eventos se listan con el título en español', async ({ page }) => {
  await page.goto('/events')
  await page.waitForLoadState('networkidle')

  // El estado son pastillas y arranca en "En marcha".
  await expect(page.getByRole('button', { name: /en marcha/i })).toHaveAttribute(
    'aria-pressed',
    'true'
  )

  // El título llega en inglés desde LeekDuck y se arma en español por patrón.
  await expect(
    page.getByText(/incursiones|Hora destacada|Día de la Comunidad/i).first()
  ).toBeVisible()
})

/**
 * Los datos de juego se leen de la tabla `game_data`. Si Supabase no responde
 * la app no puede quedarse en blanco: tiene que tirar de los JSON desplegados.
 * Se comprueba cortando esa consulta y viendo que el Top sigue saliendo.
 */
test('si game_data no responde, tira de los ficheros desplegados', async ({ page }) => {
  await page.route('**/rest/v1/game_data**', (route) => route.abort())

  await page.goto('/top')

  const filas = page.locator('[data-fila-top]')
  await expect(filas.first()).toBeVisible()
  expect(await filas.count()).toBeGreaterThan(5)

  const usados = await page.evaluate(
    () =>
      performance.getEntriesByType('resource').filter((r) => /\/data\/\w+\.json/.test(r.name))
        .length
  )
  expect(usados).toBeGreaterThan(0)
})

/**
 * El Top Dinamax es el único ranking que no sale de un cálculo de DPS: ordena
 * por ataque base porque todos los Ataques Max de un tipo son el mismo (el
 * tipo lo da el ataque rápido). Si algún día eso deja de traerse del GAME_MASTER, la tabla saldría
 * vacía y nadie se enteraría.
 */
test('el Top Dinamax ordena por ataque y enseña el Ataque Max', async ({ page }) => {
  await page.goto('/top')
  await elegirModoTop(page, { familia: 'PvE', variante: 'Max' })

  const filas = page.locator('[data-fila-top]')
  await expect(filas.first()).toBeVisible()
  expect(await filas.count()).toBeGreaterThan(10)

  // La métrica es el daño del Ataque Max, no el DPS.
  await expect(await etiquetaDeMetrica(page, filas, /^daño$/i)).toBeVisible()
  // Y cada fila lleva, bajo el nombre, su Ataque Max (o su Gigamax, que es
  // fijo) y debajo los rápidos que lo dan.
  // Es un párrafo con su nombre: Maxi…, Giga… o un exclusivo («Cañón Dinamax»).
  await expect(filas.first().locator('p').first()).toHaveText(/\S{4,}/)
})

/**
 * El filtro de Gigamax va contra Supabase, no contra lo ya traído: si la
 * columna `can_gigantamax` deja de escribirse, aquí sale la Pokédex entera.
 */
test('el filtro de Gigamax recorta la Pokédex', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const tarjetas = page.locator('[data-dex-tile]')
  const antes = await tarjetas.count()
  expect(antes).toBeGreaterThan(20)

  // Desde 1280 px los filtros van a la vista, en la barra lateral.
  const abrir = page.getByRole('button', { name: /filtros/i })
  if (await abrir.isVisible()) await abrir.click()
  // «Filtrar» es un desplegable de varias: se abre y se marca Gigamax.
  await page.getByRole('combobox', { name: /filtrar/i }).click()
  const respuesta = page.waitForResponse((res) => res.url().includes('can_gigantamax'))
  await page.getByRole('option', { name: /^Gigamax/ }).click()
  await respuesta

  await expect(page.getByText('Venusaur')).toBeVisible()
  // Con `count()` a secas se leía el DOM antes de que Vue repintara y el test
  // fallaba de vez en cuando; `poll` reintenta hasta que la lista se recorta.
  await expect.poll(() => tarjetas.count()).toBeLessThan(antes)
  // Los 31 que pueden gigamaxizar caben de sobra en la primera página.
  await expect(page.getByText('Ivysaur')).toHaveCount(0)
})

/**
 * La opción Élite de «Incluir»: desmarcada, el ranking enseña solo lo que se aprende
 * con MT normales. Se combina con el de Legacy.
 */
test('desmarcar Élite quita los ataques élite del ranking', async ({ page }) => {
  await page.goto('/top')
  const filas = page.locator('[data-fila-top]')
  await expect(filas.first()).toBeVisible()
  const conElite = () =>
    filas.filter({ has: page.locator('[title="Solo se aprende con MT Élite"]') })
  expect(await conElite().count()).toBeGreaterThan(0)

  await abrirFiltrosTop(page)
  await alternarIncluir(page, 'Élite')
  await expect(page.getByRole('combobox', { name: /incluir/i })).not.toContainText('Élite')
  await expect(conElite()).toHaveCount(0)
  await expect(filas.first()).toBeVisible()
})

/**
 * El botón de volver de la ficha lleva a la página de donde se venía, no
 * siempre a la Pokédex. Y esa página recupera su scroll.
 */
test.describe('volver desde la ficha', () => {
  const volver = (page) => page.locator('header button.back-btn')

  test('del Top a la ficha y vuelta al Top, en el mismo sitio', async ({ page }) => {
    await page.goto('/top')
    const filas = page.locator('[data-fila-top]')
    await expect(filas.nth(20)).toBeAttached()
    // Se baja siempre lo mismo, sea cual sea el alto de la pantalla, y se
    // pulsa la primera fila que quede a la vista.
    await page.evaluate(() => window.scrollTo(0, 800))
    const scrollAntes = await page.evaluate(() => window.scrollY)
    expect(scrollAntes).toBeGreaterThan(100)
    const indice = await filas.evaluateAll((ls) =>
      ls.findIndex((li) => li.getBoundingClientRect().top > 120)
    )

    await filas.nth(indice).getByRole('link').click()
    await expect(page).toHaveURL(/\/pokemon\/\d+/)
    await volver(page).click()
    await expect(page).toHaveURL(/\/top$/)
    await expect(filas.nth(indice)).toBeInViewport()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollAntes - 50)
  })

  test('de Ahora en juego a la ficha de un counter y vuelta', async ({ page }) => {
    await page.goto('/live')
    const boss = page.locator('main button[aria-expanded]').first()
    await expect(boss).toBeVisible()
    await boss.click()
    const counter = page.locator('main ol li a').first()
    await expect(counter).toBeVisible()
    await counter.click()
    await expect(page).toHaveURL(/\/pokemon\/\d+/)
    await volver(page).click()
    await expect(page).toHaveURL(/\/live/)
  })

  // Moverse por la cadena es seguir en la misma ficha: «Volver» lleva a la
  // página de antes de entrar, no deshace la cadena paso a paso.
  test('por la línea evolutiva y vuelta a la página de antes de la ficha', async ({ page }) => {
    await page.goto('/')
    await page.locator('main a[href="/pokemon/6"]').first().click()
    await expect(page).toHaveURL(/\/pokemon\/6$/)
    await page
      .getByRole('link', { name: /Charmander/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/pokemon\/4$/)
    await page
      .getByRole('link', { name: /Charmeleon/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/pokemon\/5$/)
    await volver(page).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('si se entró directamente a la ficha, vuelve a la Pokédex', async ({ page }) => {
    await page.goto('/pokemon/6')
    await expect(volver(page)).toBeVisible()
    await volver(page).click()
    await expect(page).toHaveURL(/\/$/)
  })
})

/**
 * El Top en escritorio ancho: filtros en una barra lateral fija y el ranking
 * en tabla. Se ordena igual desde la cabecera que desde el selector.
 */
test.describe('Top en escritorio ancho', () => {
  test.skip(({ viewport }) => viewport.width < 1280, 'solo desde 1280 px')

  test('la barra de filtros se queda a la vista al bajar', async ({ page }) => {
    await page.goto('/top')
    await expect(page.locator('table [data-fila-top]').first()).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 1500))
    await expect(page.getByRole('group', { name: 'Modo', exact: true })).toBeInViewport()
  })

  test('cabecera y selector ordenan a la par', async ({ page }) => {
    await page.goto('/top')
    const orden = page.getByRole('combobox', { name: /ordenar/i })
    await expect(page.locator('th[aria-sort="descending"]')).toContainText(/dps/i)

    await page.getByRole('button', { name: /^tdo/i }).click()
    await expect(page.locator('th[aria-sort="descending"]')).toContainText(/tdo/i)
    await expect(orden).toContainText('TDO')

    await orden.click()
    await page.getByRole('option', { name: /\(ER\)/ }).click()
    await expect(page.locator('th[aria-sort="descending"]')).toContainText(/er/i)
  })
})

/**
 * Los filtros van en la URL: al volver de una ficha o al recargar, la página
 * sale con la misma selección.
 */
test.describe('filtros en la URL', () => {
  test('el Top conserva tipo e «Incluir» al volver de una ficha y al recargar', async ({
    page
  }) => {
    await page.goto('/top')
    await abrirFiltrosTop(page)
    await page.getByRole('combobox', { name: /tipo/i }).click()
    await page.getByRole('option', { name: 'Fuego', exact: true }).click()
    await alternarIncluir(page, 'Legacy')
    await expect(page).toHaveURL(/kind=fire/)
    await expect(page).toHaveURL(/without=legacy/)

    await page.locator('[data-fila-top] a').first().click()
    await expect(page).toHaveURL(/\/pokemon\//)
    await page.locator('header button.back-btn').click()
    await expect(page).toHaveURL(/\/top\?.*kind=fire/)
    await abrirFiltrosTop(page)
    await expect(page.getByRole('combobox', { name: /tipo/i })).toContainText('Fuego')
    await expect(page.getByRole('combobox', { name: /incluir/i })).not.toContainText('Legacy')

    await page.reload()
    await abrirFiltrosTop(page)
    await expect(page.getByRole('combobox', { name: /tipo/i })).toContainText('Fuego')
  })

  test('la Pokédex abre con los filtros de la URL', async ({ page }) => {
    await page.goto('/?kinds=fire&only=gigantamax')
    await expect(page.getByText('Charizard', { exact: true })).toBeVisible()
    await expect(page.getByText('Bulbasaur', { exact: true })).toHaveCount(0)
    // Con el botón (por debajo de 1280 px), su contador; en la barra, marcados.
    const abrir = page.getByRole('button', { name: /filtros/i })
    if (await abrir.isVisible()) {
      await expect(abrir).toContainText('2')
    } else {
      await expect(page.getByRole('button', { name: /Fuego/ })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      await expect(page.getByRole('combobox', { name: /filtrar/i })).toContainText('Gigamax')
    }
  })
})

/** Las URL van en inglés; las de antes redirigen, con su query. */
test('las rutas antiguas en español redirigen a las nuevas', async ({ page }) => {
  await page.goto('/ahora?tab=eggs')
  await expect(page).toHaveURL(/\/live\?tab=eggs$/)
  await expect(page.getByRole('button', { name: /huevos/i })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.goto('/eventos')
  await expect(page).toHaveURL(/\/events$/)
  await page.goto('/incursiones')
  await expect(page).toHaveURL(/\/live$/)
})

// Antes, una ruta desconocida llevaba a la Pokédex sin decir nada, y una ficha
// que no existe se quedaba cargando para siempre.
test('lo que no existe lo dice, y ofrece las secciones', async ({ page }) => {
  await page.goto('/esto-no-existe')
  await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible()
  await expect(page).toHaveTitle(/Esta página no existe/)
  await page.goto('/pokemon/99999')
  await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible()
  await page.getByRole('link', { name: 'Top' }).last().click()
  await expect(page).toHaveURL(/\/top$/)
})
