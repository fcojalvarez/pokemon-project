import { expect, test } from '@playwright/test'

/**
 * Buscar en lo que hay ahora en el juego: el buscador de «Ahora», el de la
 * cabecera y los botones de la Pokédex. Los feeds se contestan aquí: los de
 * verdad cambian cada pocos días.
 */
const icono = (dex) => `https://cdn.leekduck.com/assets/img/pokemon_icons_crop/pm${dex}.icon.png`
const mon = (name, dex) => ({
  name,
  image: icono(dex),
  canBeShiny: false,
  combatPower: { min: 300, max: 400 }
})

/** Hora local sin zona, como las publica LeekDuck. */
const local = (dias) => {
  const fecha = new Date(Date.now() + dias * 86_400_000)
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000).toISOString().slice(0, -1)
}

test.beforeEach(async ({ page }) => {
  const feed = (fichero, json) =>
    page.route(`**/ScrapedDuck/data/${fichero}`, (route) => route.fulfill({ json }))
  await feed('research.json', [
    { text: 'Catch 7 Pokémon', type: 'catch', rewards: [mon('Magikarp', 129)] },
    { text: 'Win a raid', type: 'battle', rewards: [mon('Machop', 66)] },
    // Sin tipo: las del evento, que llegan así y tienen que ir primero.
    {
      text: '<span>Earn a Candy exploring with your buddy</span>',
      rewards: [mon('Electrike', 309), mon('Bramblin', 946)]
    }
  ])
  await feed('raids.json', [
    {
      name: 'Yveltal',
      tier: '5-Star Raids',
      image: icono(717),
      canBeShiny: true,
      types: [{ name: 'dark' }, { name: 'flying' }],
      combatPower: { normal: { min: 1900, max: 2000 } },
      boostedWeather: []
    }
  ])
  await feed('eggs.json', [])
  await feed('rocketLineups.json', [])
  await feed('events.json', [
    {
      eventID: 'e2e-maraton',
      name: 'Fall Marathon: Buddy Trek',
      eventType: 'event',
      heading: 'Event',
      link: 'https://leekduck.com/events/e2e-maraton/',
      image: null,
      start: local(-1),
      end: local(3),
      extraData: {}
    }
  ])
})

test('en Misiones, las del evento van primero y el buscador las filtra', async ({ page }) => {
  await page.goto('/live?tab=research')
  const grupos = page.locator('section[id^="tareas-"] h2')
  await expect(grupos.first()).toHaveText(/^Evento/)
  await expect(grupos).toHaveCount(3)

  await page.getByRole('searchbox', { name: 'Busca misión o Pokémon' }).fill('bramblin')
  await expect(grupos).toHaveCount(1)
  await expect(page.getByText('1 de 3')).toBeVisible()
  await expect(page).toHaveURL(/q=bramblin/)

  await page.getByRole('button', { name: 'Quitar la búsqueda' }).click()
  await expect(grupos).toHaveCount(3)
})

test('si en una pestaña no sale, dice en cuál sí', async ({ page }) => {
  await page.goto('/live?tab=raids&q=bramblin')
  await expect(page.getByText('Nada coincide con «bramblin» en Incursiones.')).toBeVisible()
  await page.getByRole('button', { name: 'Misiones (1)' }).click()
  await expect(page).toHaveURL(/tab=research/)
  await expect(page.locator('section[id^="tareas-"] h2')).toHaveCount(1)
})

test('el buscador de la cabecera encuentra misiones y eventos y lleva a ellos', async ({
  page
}) => {
  await page.goto('/events')
  const buscar = async (texto) => {
    await page.getByRole('button', { name: 'Abrir el buscador' }).click()
    await page.locator('#input-search').fill(texto)
  }

  await buscar('bramblin')
  await page.getByRole('group', { name: 'Misiones' }).getByRole('option').first().click()
  await expect(page).toHaveURL(/\/live\?.*tab=research/)
  await expect(page.getByRole('searchbox', { name: 'Busca misión o Pokémon' })).toHaveValue(
    'bramblin'
  )
  await expect(page.locator('section[id^="tareas-"] h2')).toHaveCount(1)

  await buscar('buddy trek')
  await page.getByRole('group', { name: 'Eventos' }).getByRole('option').first().click()
  await expect(page.getByRole('dialog', { name: 'Detalle del evento' })).toBeVisible()
  // El ?event= es de un solo uso: si se quedara, al volver atrás se abriría otra vez.
  await expect(page).not.toHaveURL(/event=/)
})

test('al buscar en la Pokédex, lo de ahora sale en pestañas junto a los Pokémon', async ({
  page
}) => {
  await page.goto('/?q=bramblin')
  const pestanas = page.getByRole('group', { name: 'Resultados de la búsqueda' })
  await expect(pestanas.getByRole('button', { name: /^Pokémon/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await pestanas.getByRole('button', { name: 'Misiones (1)' }).click()
  // Sus resultados, aquí mismo; cada uno lleva a su pestaña de «Ahora».
  await page.getByRole('link', { name: /Earn a Candy|Consigue 1 caramelo/i }).click()
  await expect(page).toHaveURL(/tab=research/)
  await expect(page.locator('section[id^="tareas-"] h2')).toHaveCount(1)
})

test('si lo buscado no es un Pokémon, se abre la primera pestaña con algo', async ({ page }) => {
  await page.goto('/?q=candy')
  const pestanas = page.getByRole('group', { name: 'Resultados de la búsqueda' })
  await expect(pestanas.getByRole('button', { name: 'Misiones (1)' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(page.getByRole('link', { name: 'Ver en Misiones' })).toBeVisible()
})
