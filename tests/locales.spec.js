import { describe, expect, it } from 'vitest'
import es from '../src/locales/es.json'
import en from '../src/locales/en.json'

/**
 * El español es el único idioma que va en el bundle y el respaldo de los
 * demás, que se descargan al elegirlos (src/plugins/i18n.js). Si a un idioma le
 * falta una clave se vería el español; si le falta al español, la clave tal
 * cual. Por eso los dos tienen que tener exactamente las mismas.
 */
const claves = (objeto, prefijo = '') =>
  Object.entries(objeto).flatMap(([clave, valor]) =>
    valor && typeof valor === 'object' ? claves(valor, `${prefijo}${clave}.`) : [`${prefijo}${clave}`]
  )

describe('ficheros de idioma', () => {
  it('español e inglés tienen las mismas claves', () => {
    const enEs = new Set(claves(es))
    const enEn = new Set(claves(en))
    expect([...enEn].filter((clave) => !enEs.has(clave))).toEqual([])
    expect([...enEs].filter((clave) => !enEn.has(clave))).toEqual([])
  })
})

describe('idiomas que se descargan al elegirlos', () => {
  it('setLocale baja el inglés y la app pasa a él', async () => {
    const { default: i18n, setLocale } = await import('../src/plugins/i18n')
    expect(i18n.global.availableLocales).toEqual(['es'])
    await setLocale('en')
    expect(i18n.global.locale).toBe('en')
    expect(i18n.global.t('nav.events')).toBe(en.nav.events)
    expect(en.nav.events).not.toBe(es.nav.events)
    await setLocale('es')
    localStorage.clear()
  })
})
