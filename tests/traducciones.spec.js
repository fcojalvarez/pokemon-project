import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import i18n from '../src/plugins/i18n'
import { useGameDataStore } from '../src/stores/gameData'
import { normalizeText } from '../src/utils/gameText'
import {
  fusionar,
  glosario,
  leerRespuesta,
  lotes,
  peticionGemini,
  textosPendientes
} from '../scripts/lib/traducciones.mjs'
import en from '../src/locales/en.json'
import es from '../src/locales/es.json'

// La store importa el cliente de Supabase, que sin credenciales revienta al cargar.
vi.mock('../src/lib/supabaseClient', () => ({ supabase: {} }))

/**
 * Las traducciones automáticas: qué se manda a Gemini, qué se acepta de lo
 * que responde y en qué orden las usa la app. Nada de esto toca la red.
 */

const texts = { [normalizeText('Catch 5 Pokémon')]: 'Atrapa {0} Pokémon' }
const contexto = (memoria = {}) => ({
  texts,
  memoria,
  tiposConocidos: new Set(Object.keys(es.events.types)),
  nombresConocidos: new Set(Object.keys(es.events.names))
})

describe('qué textos faltan por traducir', () => {
  const events = [
    // Nombre propio: ningún patrón lo arma.
    { name: 'Harvest Festival 2026: Applin Picking', eventType: 'event', heading: 'Event' },
    // Lo arma un patrón con su plantilla: no hace falta.
    { name: 'Mega Malamar in Mega Raids', eventType: 'raid-battles', heading: 'Raid Battles' },
    // Tipo nuevo: se ve su encabezado, así que va también.
    { name: 'Harvest Festival 2026: Applin Picking', eventType: 'city-safari', heading: 'City Safari' },
    {
      name: 'Chimchar Community Day',
      eventType: 'community-day',
      extraData: {
        communityday: {
          bonuses: [{ text: '3-hour Incense' }, { text: 'Catch 5 Pokémon' }],
          bonusDisclaimers: ['* Bonuses active from 2:00 p.m.']
        }
      }
    }
  ]
  const research = [{ text: '<span>Catch 5 Pokémon</span>' }, { text: '<span>Spin 3 PokéStops or Gyms</span>' }]

  it('recoge solo lo que ni las frases del juego ni los patrones cubren, sin repetir', () => {
    expect(textosPendientes({ events, research }, contexto())).toEqual([
      'Harvest Festival 2026: Applin Picking',
      'City Safari',
      '3-hour Incense',
      '* Bonuses active from 2:00 p.m.',
      'Spin 3 PokéStops or Gyms'
    ])
  })

  it('no vuelve a pedir lo que ya está en la memoria', () => {
    const memoria = { 'City Safari': { texto: 'City Safari', origen: 'manual' } }
    expect(textosPendientes({ events, research }, contexto(memoria))).not.toContain('City Safari')
  })

  it('no manda números ni símbolos sueltos', () => {
    expect(textosPendientes({ research: [{ text: '<span>2026</span>' }, { text: '*' }] }, contexto())).toEqual([])
  })
})

describe('la petición a Gemini', () => {
  it('lleva solo la parte del glosario que aparece en los textos', () => {
    const cuerpo = peticionGemini(['GO Battle League: Twilight Trails'], glosario(en, es))
    const pregunta = cuerpo.contents[0].parts[0].text
    expect(pregunta).toContain('GO Battle League → Liga Combates GO')
    expect(pregunta).not.toContain('Spotlight Hour')
    expect(cuerpo.generationConfig.responseMimeType).toBe('application/json')
  })

  it('saca el glosario de nuestros ficheros de idioma', () => {
    const pares = glosario(en, es)
    expect(pares[en.events.types['community-day']]).toBe(es.events.types['community-day'])
    expect(pares[en.raids.weather.rainy]).toBe(es.raids.weather.rainy)
  })

  it('parte en lotes', () => {
    expect(lotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
})

describe('lo que se acepta de la respuesta', () => {
  const respuesta = (pares) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(pares) }] } }] })

  it('se queda con los pares pedidos y válidos', () => {
    const leidas = leerRespuesta(
      respuesta([
        { en: 'Patterns of the Wild', es: 'Patrones de la naturaleza' },
        // No se pidió: se inventa uno.
        { en: 'Otra cosa', es: 'Algo' },
        // Vacío.
        { en: 'GO Pass: September', es: '  ' },
        // Una explicación, no una traducción.
        { en: 'City Safari', es: 'x'.repeat(200) }
      ]),
      ['Patterns of the Wild', 'GO Pass: September', 'City Safari']
    )
    expect([...leidas]).toEqual([['Patterns of the Wild', 'Patrones de la naturaleza']])
  })

  it('no revienta con una respuesta rota', () => {
    expect(leerRespuesta({}, ['a']).size).toBe(0)
    expect(leerRespuesta({ candidates: [{ content: { parts: [{ text: 'no es json' }] } }] }, ['a']).size).toBe(0)
  })
})

describe('la memoria', () => {
  it('añade las nuevas sin pisar las que ya había, y menos las corregidas a mano', () => {
    const memoria = { 'City Safari': { texto: 'City Safari', origen: 'manual' } }
    const nuevas = new Map([
      ['City Safari', 'Safari urbano'],
      ['Patterns of the Wild', 'Patrones de la naturaleza']
    ])
    const salida = fusionar(memoria, nuevas, { modelo: 'gemini-x', fecha: '2026-09-27T00:00:00Z' })
    expect(salida['City Safari']).toEqual({ texto: 'City Safari', origen: 'manual' })
    expect(salida['Patterns of the Wild']).toMatchObject({ texto: 'Patrones de la naturaleza', origen: 'gemini' })
  })
})

describe('en qué orden traduce la app', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useGameDataStore()
    store.texts = texts
    store.traducciones = {
      'Catch 5 Pokémon': { texto: 'Esto no debería salir' },
      '3-hour Incense': { texto: 'Incienso de 3 horas' }
    }
  })
  afterEach(() => {
    i18n.global.locale = 'es'
  })

  it('primero las frases del juego, luego la memoria y si no, el inglés', () => {
    expect(store.translateText('Catch 5 Pokémon')).toBe('Atrapa 5 Pokémon')
    expect(store.translateText('3-hour Incense')).toBe('Incienso de 3 horas')
    expect(store.translateText('Nada de esto')).toBe('Nada de esto')
    expect(store.autoTranslate('3-hour Incense ')).toBe('Incienso de 3 horas')
  })

  it('con la app en inglés deja el original', () => {
    i18n.global.locale = 'en'
    expect(store.translateText('3-hour Incense')).toBe('3-hour Incense')
    expect(store.autoTranslate('3-hour Incense')).toBe('3-hour Incense')
  })
})
