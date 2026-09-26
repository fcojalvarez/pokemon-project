import i18n from '../plugins/i18n'

/**
 * Acceso a las traducciones desde `<script setup>`.
 *
 * El proyecto arranca vue-i18n en modo legacy, donde `useI18n()` lanza un
 * error, así que se tira de la instancia global. En las plantillas se sigue
 * usando `$t` como en el resto de componentes.
 */
export function useTranslate() {
  const global = i18n.global

  return {
    t: (...args) => global.t(...args),
    /** Plurales («caramelo» / «caramelos»): en modo legacy `t` no los resuelve. */
    tc: (...args) => global.tc(...args),
    /** ¿Existe esa clave? Útil cuando la fuente puede traer valores nuevos. */
    te: (...args) => global.te(...args),
    locale: () => global.locale
  }
}
