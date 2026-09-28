/**
 * Las cuatro secciones de la app. Las usan el menú lateral y, en móvil, la
 * barra de abajo, así que tienen que ser las mismas en los dos.
 *
 * Los iconos son de Tabler Icons (MIT, tabler.io/icons), con los trazos de
 * cada uno unidos en un solo `d` para BaseIcon: trophy, calendar-event y
 * pokeball (la de «Ahora»: lo que se puede atrapar ahora). La
 * Pokédex no está en Tabler y va dibujada con el mismo trazo: el aparato
 * con su lente grande, los dos pilotos y la pantalla.
 */
export const NAV_LINKS = [
  {
    to: '/',
    key: 'pokedex',
    icon: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z M8.5 7.5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M13 6.5h.01 M15.5 6.5h.01 M7 12h10v5h-10z'
  },
  {
    to: '/top',
    key: 'top',
    icon: 'M8 21l8 0 M12 17l0 4 M7 4l10 0 M17 4v8a5 5 0 0 1 -10 0v-8 M5 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M19 9m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0'
  },
  {
    to: '/events',
    key: 'events',
    icon: 'M4 5m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z M16 3l0 4 M8 3l0 4 M4 11l16 0 M8 15h2v2h-2z'
  },
  {
    to: '/live',
    key: 'raids',
    icon: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M3 12h6 M15 12h6'
  }
]

/**
 * Si la sección está abierta. La Pokédex solo en su ruta exacta (si no, lo
 * estaría siempre) y el resto con sus subrutas; la ficha de un Pokémon cuenta
 * como Pokédex, que es de donde se llega.
 */
export function esSeccionActiva(path, to) {
  if (to === '/') return path === '/' || path.startsWith('/pokemon/')
  return path.startsWith(to)
}
