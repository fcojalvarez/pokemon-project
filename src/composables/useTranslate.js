import i18n from '../plugins/i18n'

/**
 * Nombre de un Pokémon, ataque o forma en el idioma de la app.
 *
 * Los datos de juego traen los dos: `name` en inglés y `nameEs` en español.
 * Si falta el del idioma elegido se usa el otro, que es mejor que nada.
 */
export function localName(entry) {
  if (!entry) return ''
  return i18n.global.locale === 'en'
    ? entry.name ?? entry.nameEs ?? ''
    : entry.nameEs ?? entry.name ?? ''
}

/** Etiqueta BCP 47 para fechas y números: `en-GB` o `es-ES`. */
export function intlLocale() {
  return i18n.global.locale === 'en' ? 'en-GB' : 'es-ES'
}

/** Un número con los separadores del idioma de la app («1.800» / «1,800»). */
export function formatNumber(value) {
  return new Intl.NumberFormat(intlLocale()).format(value)
}

/**
 * Un decimal con la coma o el punto del idioma («15,6» en español, «15.6» en
 * inglés), siempre con `digitos` cifras detrás. Antes salía con toFixed, que
 * pone punto siempre, y en Comparar con coma: dos formas para lo mismo.
 */
export function formatDecimal(value, digitos = 1) {
  return new Intl.NumberFormat(intlLocale(), {
    minimumFractionDigits: digitos,
    maximumFractionDigits: digitos
  }).format(value)
}

/**
 * Acceso a las traducciones desde `<script setup>`.
 *
 * El proyecto arranca vue-i18n en modo legacy, donde `useI18n()` lanza un
 * error, así que se tira de la instancia global. En las plantillas se sigue
 * usando `$t` como en el resto de componentes.
 *
 * Todo lo que salga de aquí hay que llamarlo dentro de un `computed` o de la
 * plantilla: el idioma se puede cambiar en caliente desde el menú, y un texto
 * calculado una sola vez al montar se quedaría en el idioma anterior.
 */
export function useTranslate() {
  const global = i18n.global

  return {
    t: (...args) => global.t(...args),
    /** Plurales («caramelo» / «caramelos»): en modo legacy `t` no los resuelve. */
    tc: (...args) => global.tc(...args),
    /** ¿Existe esa clave? Útil cuando la fuente puede traer valores nuevos. */
    te: (...args) => global.te(...args),
    locale: () => global.locale,
    localName,
    intlLocale,
    formatNumber,
    formatDecimal
  }
}
