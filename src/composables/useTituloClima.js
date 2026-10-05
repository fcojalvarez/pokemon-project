import { useTranslate } from './useTranslate'
import { CLIMAS } from '../utils/clima'

/**
 * El texto que explica la cifra con clima: «Con Soleado, los ataques de
 * Fuego, Planta y Tierra pegan un 20 % más». Para el title y el lector de
 * pantalla.
 */
export function useTituloClima() {
  const { t, intlLocale } = useTranslate()
  return (clima) => {
    const tipos = new Intl.ListFormat(intlLocale(), { type: 'conjunction' }).format(
      CLIMAS[clima].map((tipo) => t(`types.${tipo}`))
    )
    return t('top.weatherTitle', { clima: t(`raids.weather.${clima}`), tipos })
  }
}
