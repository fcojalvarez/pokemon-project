/**
 * De dónde sale un movimiento: élite (solo con MT Élite), legacy (vino de un
 * evento y ya no vuelve) o exclusivo de la supermegaevolución.
 *
 * Lo pintan MoveTag (cada movimiento) y MoveLegend (la leyenda del contenedor),
 * y lo calculaban a mano la ficha, el Top y las incursiones.
 */
export const ORIGENES = ['elite', 'legacy', 'mega']

/**
 * Colores medidos contra fondo blanco y gray-900.
 *
 * El texto de las píldoras va siempre >= 4.5:1. El subrayado del élite es la
 * excepción a propósito: en amber-600 llegaba a 3,19:1 pero se leía marrón y
 * dejaba de parecer amarillo, que es justo lo que tiene que distinguirlo del
 * morado del legacy. Se usa amber-500, que es amarillo de verdad, y la
 * identificación no queda colgando del color: cada movimiento lleva su
 * `title` y todos los contenedores que los listan llevan un <move-legend> que
 * lo dice con palabras.
 *
 * `chip` es el relleno suave del movimiento, sin borde: el borde es de lo que
 * se pulsa, y un movimiento solo informa.
 *
 * `dot` es el punto de la leyenda: relleno y no como anillo, porque es la
 * única muestra del color en toda la pantalla, y cuanta más superficie de
 * color, más fácil es casarlo con el subrayado del movimiento.
 */
export const COLORES_ORIGEN = {
  mega: {
    chip: 'bg-fuchsia-100 dark:bg-fuchsia-400/15 text-fuchsia-700 dark:text-fuchsia-300',
    line: 'border-fuchsia-600 dark:border-fuchsia-400',
    dot: 'bg-fuchsia-600 dark:bg-fuchsia-400'
  },
  legacy: {
    chip: 'bg-violet-100 dark:bg-violet-400/15 text-violet-700 dark:text-violet-300',
    line: 'border-violet-600 dark:border-violet-400',
    dot: 'bg-violet-600 dark:bg-violet-400'
  },
  elite: {
    chip: 'bg-amber-100 dark:bg-amber-400/15 text-amber-800 dark:text-amber-300',
    line: 'border-amber-500 dark:border-amber-400',
    dot: 'bg-amber-500 dark:bg-amber-400'
  }
}

/**
 * Las marcas de procedencia de un movimiento para una entrada del roster:
 * `origenDe(entrada)('SHADOW_BALL')` → { elite, legacy, mega }.
 */
export function origenDe(entrada) {
  const elite = new Set(entrada?.eliteMoves ?? [])
  const legacy = new Set(entrada?.legacyMoves ?? [])
  const mega = new Set(entrada?.megaMoves ?? [])
  return (id) => ({ elite: elite.has(id), legacy: legacy.has(id), mega: mega.has(id) })
}

/**
 * Qué procedencias aparecen en una lista de movimientos, para que la leyenda
 * solo explique los colores que de verdad se ven.
 */
export function origenesPresentes(movimientos) {
  const presentes = { elite: false, legacy: false, mega: false }
  for (const movimiento of movimientos) {
    for (const origen of ORIGENES) if (movimiento?.[origen]) presentes[origen] = true
  }
  return presentes
}
