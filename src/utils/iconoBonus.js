/**
 * El icono de un bonus de evento, por las palabras de su texto (en español o
 * en inglés: la noticia llega en los dos). El orden importa: «Caramelo ++»
 * antes que «Caramelo», y lo de shiny antes que todo, porque «más
 * probabilidades de encontrar un X shiny» habla también de encontrar.
 *
 * Devuelve la clave del icono (ver EventBonus) o null si no hay uno que
 * encaje; entonces se pinta un punto.
 */
const REGLAS = [
  ['shiny', /\b(shiny|variocolor)/i],
  ['candyXl', /caramelo\s*\+\+|caramelos\s*\+\+|candy\s*xl/i],
  ['candy', /caramelo|candy/i],
  ['lure', /cebo|lure/i],
  ['egg', /huevo|eclosi|\begg|hatch/i],
  ['trade', /intercambi|\btrade/i],
  ['raid', /incursi|\braid/i],
  ['research', /investigaci|tarea|research|task/i],
  ['buddy', /compañero|buddy/i],
  ['stardust', /polvo estelar|stardust/i],
  ['xp', /\bpx\b|\bxp\b|experiencia/i]
]

export function iconoDeBonus(texto) {
  const t = String(texto ?? '')
  return REGLAS.find(([, patron]) => patron.test(t))?.[0] ?? null
}

/**
 * Cuál va destacado: el primero que habla de shiny, que es lo que más se
 * busca en un evento. Si ninguno, el primero de la lista.
 */
export function indiceEstrella(bonus) {
  if (!bonus?.length) return -1
  const shiny = bonus.findIndex((uno) => iconoDeBonus(uno) === 'shiny')
  return shiny >= 0 ? shiny : 0
}
