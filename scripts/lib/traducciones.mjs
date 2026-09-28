/**
 * Lógica de las traducciones automáticas, sin red ni base de datos: qué textos
 * faltan, cómo se le piden a Gemini y cómo se guardan. Va aparte del script
 * para poder probarla (tests/traducciones.spec.js).
 *
 * El orden en que la app traduce un texto de LeekDuck es:
 *
 *   1. Las frases del propio juego (texts.json): tareas y bonificaciones.
 *   2. Los patrones de título («Spotlight Hour: X» → «Hora destacada: X»).
 *   3. La memoria de traducciones que rellena esto.
 *   4. El inglés, si no hay nada.
 *
 * Así que aquí solo se recoge lo que no cubren ni 1 ni 2: cada texto se
 * traduce una vez y se queda en la memoria para siempre.
 */
import { translateGameText } from '../../src/utils/gameText.js'
import { parseEventName } from '../../src/utils/eventName.js'

/** El texto de la tarea viene envuelto en <span>; en la app, igual. */
export const plainText = (html) => String(html).replace(/<[^>]*>/g, '').trim()

/** Ni números sueltos ni símbolos: eso no hay que mandarlo a traducir. */
const tieneLetras = (texto) => /\p{L}{2,}/u.test(texto)

/**
 * Textos de LeekDuck que la app enseñaría en inglés.
 *
 * Tiene que mirar lo mismo que la app y con la misma clave (el texto tal cual
 * llega, o sin etiquetas en las tareas): si no, se traduciría algo que la app
 * nunca busca.
 *
 * @param {{events?: object[], research?: object[]}} fuentes
 * @param {{texts: object, memoria: object, tiposConocidos: Set<string>,
 *          nombresConocidos: Set<string>}} contexto
 * @returns {string[]} sin repetir, en el orden en que aparecen
 */
export function textosPendientes({ events = [], research = [] }, contexto) {
  const { texts, memoria, tiposConocidos, nombresConocidos } = contexto
  const vistos = new Set()
  const salida = []

  const anadir = (texto, { frasesDelJuego = false } = {}) => {
    if (typeof texto !== 'string') return
    const limpio = texto.trim()
    if (!limpio || !tieneLetras(limpio) || vistos.has(limpio)) return
    vistos.add(limpio)
    if (memoria[limpio]) return
    if (frasesDelJuego && translateGameText(limpio, texts) !== limpio) return
    salida.push(limpio)
  }

  for (const evento of events) {
    // Título: solo si no lo arma ya un patrón con su plantilla traducida.
    const partes = parseEventName(evento.name)
    if (!partes || !nombresConocidos.has(partes.key)) anadir(evento.name)

    // El encabezado solo se ve cuando el tipo es nuevo y no lo tenemos.
    if (evento.heading && !tiposConocidos.has(evento.eventType)) anadir(evento.heading)

    const extra = evento.extraData ?? {}
    anadir(extra.spotlight?.bonus, { frasesDelJuego: true })
    for (const bonus of extra.communityday?.bonuses ?? []) anadir(bonus?.text, { frasesDelJuego: true })
    for (const nota of extra.communityday?.bonusDisclaimers ?? []) anadir(nota, { frasesDelJuego: true })
  }

  for (const tarea of research) {
    if (tarea?.text) anadir(plainText(tarea.text), { frasesDelJuego: true })
  }

  return salida
}

/**
 * Términos que tienen que salir como en el juego en español.
 *
 * Casi todo sale de nuestros propios ficheros de idioma (tipos de evento,
 * niveles de incursión, climas), así que crece solo cuando se añade uno. Lo de
 * abajo es lo que no está en ellos y se cuela en los títulos.
 */
const FIJOS = {
  'Community Day': 'Día de la Comunidad',
  'Spotlight Hour': 'Hora del Pokémon Destacado',
  'Raid Hour': 'Hora de Incursiones',
  'Raid Day': 'Día de Incursiones',
  'Max Battle': 'Combate Max',
  'Max Battles': 'Combates Max',
  'Max Monday': 'Lunes Max',
  'GO Battle League': 'Liga Combates GO',
  'Great League': 'Liga Super Ball',
  'Ultra League': 'Liga Ultra Ball',
  'Master League': 'Liga Master Ball',
  'Little Cup': 'Copa Chica',
  // Temporadas: el nombre oficial, que no siempre es la traducción literal.
  'Twilight Trails': 'Senderos Crepusculares',
  'Field Research': 'Investigación de campo',
  'Special Research': 'Investigación especial',
  'Timed Research': 'Investigación temporal',
  'Collection Challenge': 'Desafío de colección',
  'GO Pass': 'Pase GO',
  Stardust: 'Polvos estelares',
  Candy: 'Caramelos',
  'Candy XL': 'Caramelos XL',
  'Lure Module': 'Módulo Cebo',
  Incense: 'Incienso',
  'Poké Ball': 'Poké Ball',
  Shiny: 'shiny',
  Shadow: 'oscuro',
  Dynamax: 'Dinamax',
  Gigantamax: 'Gigamax',
  'Mega Evolution': 'Megaevolución',
  PokéStop: 'Poképarada',
  Gym: 'Gimnasio',
  Egg: 'Huevo',
  'Trainer Battle': 'Combate de Entrenador'
}

/**
 * Pares inglés → español para el glosario.
 *
 * @param {object} en fichero de idioma inglés (src/locales/en.json)
 * @param {object} es fichero de idioma español
 */
export function glosario(en, es) {
  const pares = { ...FIJOS }
  const cruzar = (a, b) => {
    for (const [clave, ingles] of Object.entries(a ?? {})) {
      const espanol = b?.[clave]
      if (typeof ingles === 'string' && typeof espanol === 'string' && ingles !== espanol) {
        pares[ingles] = espanol
      }
    }
  }
  cruzar(en.events?.types, es.events?.types)
  cruzar(en.raids?.tiers, es.raids?.tiers)
  cruzar(en.raids?.weather, es.raids?.weather)
  return pares
}

const INSTRUCCIONES = `Traduces al español de España textos de Pokémon GO publicados en inglés por LeekDuck: títulos de eventos, bonificaciones, notas y tareas de investigación. Se leen en una app de ayuda para jugadores.

Reglas:
- Usa la terminología oficial de Pokémon GO en español. Cuando un término esté en el glosario, usa exactamente esa traducción.
- «Shiny» se queda como «shiny» (en minúscula salvo a principio de frase), nunca «variocolor».
- No traduzcas nombres de Pokémon, de movimientos, de ciudades o países, de marcas (LEGO, Pokémon GO) ni de eventos con nombre propio que el juego no traduce («City Safari», «GO Fest», «GO Tour»).
- Conserva números, fechas, símbolos (×, *, |, :) y el orden de las partes del título.
- Frases cortas y naturales, como las del juego. Sin comillas ni explicaciones.
- Si un texto no se debe traducir, devuélvelo igual.

Devuelve un objeto por texto, con el original en "en" exactamente como llegó y la traducción en "es".`

/** Esquema de la respuesta: un par por texto. */
const ESQUEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: { en: { type: 'STRING' }, es: { type: 'STRING' } },
    required: ['en', 'es']
  }
}

/**
 * Cuerpo de la petición a `generateContent`.
 *
 * Solo va la parte del glosario que aparece en los textos del lote: el
 * glosario entero no hace falta y cada término de más es ruido.
 */
export function peticionGemini(textos, pares) {
  const juntos = textos.join('\n').toLowerCase()
  const utiles = Object.entries(pares).filter(([ingles]) => juntos.includes(ingles.toLowerCase()))
  const bloqueGlosario = utiles.length
    ? `Glosario:\n${utiles.map(([ingles, espanol]) => `- ${ingles} → ${espanol}`).join('\n')}\n\n`
    : ''

  return {
    systemInstruction: { parts: [{ text: INSTRUCCIONES }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: `${bloqueGlosario}Textos:\n${JSON.stringify(textos, null, 1)}` }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: ESQUEMA
    }
  }
}

/**
 * Traducciones válidas de una respuesta de Gemini.
 *
 * Nada de fiarse a ciegas: solo se aceptan pares cuyo original sea uno de los
 * que se pidieron, con traducción no vacía y de un largo razonable (una
 * traducción cinco veces más larga que el original es una explicación, no una
 * traducción). Lo que no pasa se queda sin traducir y se reintenta la próxima
 * vez.
 *
 * @returns {Map<string, string>} original → traducción
 */
export function leerRespuesta(respuesta, pedidos) {
  const salida = new Map()
  const texto = respuesta?.candidates?.[0]?.content?.parts?.map((parte) => parte.text ?? '').join('')
  if (!texto) return salida

  let pares
  try {
    pares = JSON.parse(texto)
  } catch {
    return salida
  }
  if (!Array.isArray(pares)) return salida

  const pedidosSet = new Set(pedidos)
  for (const par of pares) {
    const original = typeof par?.en === 'string' ? par.en.trim() : ''
    const traduccion = typeof par?.es === 'string' ? par.es.trim() : ''
    if (!pedidosSet.has(original) || !traduccion) continue
    if (traduccion.length > Math.max(40, original.length * 5)) continue
    salida.set(original, traduccion)
  }
  return salida
}

/**
 * Memoria con las traducciones nuevas añadidas.
 *
 * Nunca pisa una que ya estuviera: las corregidas a mano (`origen: 'manual'`)
 * mandan, y las automáticas no se rehacen para no gastar ni cambiar lo que ya
 * se ha visto.
 */
export function fusionar(memoria, nuevas, { modelo, fecha }) {
  const salida = { ...memoria }
  for (const [original, texto] of nuevas) {
    if (salida[original]) continue
    salida[original] = { texto, origen: 'gemini', modelo, fecha }
  }
  return salida
}

/** Parte una lista en trozos de `tamano`. */
export function lotes(lista, tamano) {
  const salida = []
  for (let i = 0; i < lista.length; i += tamano) salida.push(lista.slice(i, i + tamano))
  return salida
}
