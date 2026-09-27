import { createI18n } from 'vue-i18n';
import es from '../locales/es.json';
import en from '../locales/en.json';

/** Idiomas que se pueden elegir en el menú, en el orden en que salen. */
export const LOCALES = ['es', 'en'];

const STORAGE_KEY = 'locale';

/**
 * Idioma con el que arranca la app: el que se eligió en el menú, si hay; si
 * no, español. No se mira el del navegador: la app es en español y muchos
 * móviles de aquí van en inglés sin que su dueño lo haya elegido.
 */
function localeInicial() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (LOCALES.includes(guardado)) return guardado;
  } catch {
    // Sin acceso a localStorage (modo privado estricto): se sigue sin él.
  }
  return import.meta.env.VITE_I18N_LOCALE || 'es';
}

const i18n = createI18n({
  legacy: true,
  locale: localeInicial(),
  fallbackLocale: import.meta.env.VITE_I18N_FALLBACK_LOCALE || 'en',
  messages: {
    en,
    es
  }
})

/**
 * Cambia el idioma de toda la app y lo recuerda para la próxima vez.
 *
 * El `lang` del documento va con él: con el que no toca, los lectores de
 * pantalla leen el texto con la pronunciación del otro idioma.
 */
export function setLocale(locale) {
  if (!LOCALES.includes(locale)) return;
  i18n.global.locale = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Sin localStorage se cambia igual; solo que no se recordará.
  }
}

export default i18n
