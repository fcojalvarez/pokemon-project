import { createI18n } from 'vue-i18n'
import es from '../locales/es.json'

/** Idiomas que se pueden elegir en el menú, en el orden en que salen. */
export const LOCALES = ['es', 'en']

const STORAGE_KEY = 'locale'

/**
 * Idioma con el que arranca la app: el que se eligió en el menú, si hay; si
 * no, español. No se mira el del navegador: la app es en español y muchos
 * móviles de aquí van en inglés sin que su dueño lo haya elegido.
 */
function localeInicial() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY)
    if (LOCALES.includes(guardado)) return guardado
  } catch {
    // Sin acceso a localStorage (modo privado estricto): se sigue sin él.
  }
  return import.meta.env.VITE_I18N_LOCALE || 'es'
}

/**
 * El español va en el bundle; el resto de idiomas, en su propio fichero, que
 * se descarga al elegirlo. Casi nadie cambia de idioma y el inglés eran 6 KB
 * comprimidos en el arranque de todos.
 */
const CARGADORES = {
  en: () => import('../locales/en.json')
}

const i18n = createI18n({
  legacy: true,
  locale: 'es',
  // El respaldo es el español porque es el único que está siempre cargado.
  // Tampoco debería hacer falta: tests/locales.spec.js exige que los dos
  // idiomas tengan las mismas claves.
  fallbackLocale: 'es',
  messages: { es }
})

/** Descarga los textos de un idioma, si no están ya. */
export async function cargarIdioma(locale) {
  if (i18n.global.availableLocales.includes(locale) || !CARGADORES[locale]) return
  const { default: mensajes } = await CARGADORES[locale]()
  i18n.global.setLocaleMessage(locale, mensajes)
}

/**
 * Pone el idioma con el que arranca la app (el que se eligió la última vez).
 * main.js espera a esto antes de montar, para no pintar en español a quien
 * lo tiene en inglés.
 */
export async function idiomaInicial() {
  const locale = localeInicial()
  if (locale === i18n.global.locale) return
  try {
    await cargarIdioma(locale)
    i18n.global.locale = locale
  } catch {
    // Sin red y sin el fichero en caché: se arranca en español.
  }
}

/**
 * Cambia el idioma de toda la app y lo recuerda para la próxima vez.
 *
 * El `lang` del documento va con él: con el que no toca, los lectores de
 * pantalla leen el texto con la pronunciación del otro idioma.
 */
export async function setLocale(locale) {
  if (!LOCALES.includes(locale)) return
  await cargarIdioma(locale)
  i18n.global.locale = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Sin localStorage se cambia igual; solo que no se recordará.
  }
}

export default i18n
