/**
 * La letra de un puesto (S, A+, A, B+, B, C, D o F), con los cortes de la
 * lista general de GO Hub, que es la que citan los youtubers: S hasta el 20,
 * A+ hasta el 50, A hasta el 100… En la lista de un tipo, que es mucho más
 * corta, los cortes son la quinta parte (S hasta el 4, A+ hasta el 10…): con
 * los generales, los cincuenta primeros de un tipo serían todos S o A+.
 */
const CORTES = [
  [20, 'S'],
  [50, 'A+'],
  [100, 'A'],
  [150, 'B+'],
  [200, 'B'],
  [250, 'C'],
  [300, 'D']
]
const PARTE_TIPO = 5

export const NIVELES = [...CORTES.map(([, letra]) => letra), 'F']

const cortes = (porTipo) =>
  CORTES.map(([hasta, letra]) => [porTipo ? hasta / PARTE_TIPO : hasta, letra])

/** La letra del puesto `rank`; `porTipo` para la lista de un tipo. */
export function nivelDe(rank, { porTipo = false } = {}) {
  for (const [hasta, letra] of cortes(porTipo)) if (rank <= hasta) return letra
  return 'F'
}

/** Los puestos que abarca una letra: { desde, hasta }; `hasta` es null en la F. */
export function rangoDe(letra, { porTipo = false } = {}) {
  const lista = cortes(porTipo)
  const i = lista.findIndex(([, l]) => l === letra)
  if (i === -1) return { desde: lista.at(-1)[0] + 1, hasta: null }
  return { desde: i === 0 ? 1 : lista[i - 1][0] + 1, hasta: lista[i][0] }
}

/**
 * El gris de cada grupo, sin color: con colores competía con los tipos. Las
 * dos primeras, en claro sobre oscuro (o al revés); las del medio, en un gris
 * medio; y de la C para abajo, apagadas.
 */
export function claseNivel(letra) {
  if (letra === 'S' || letra === 'A+')
    return 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900'
  if (letra === 'A' || letra === 'B+' || letra === 'B')
    return 'bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  return 'bg-gray-200 text-gray-500 dark:bg-white/[0.06] dark:text-gray-400'
}
