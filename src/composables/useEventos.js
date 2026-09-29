import { useGameDataStore } from '../stores/gameData'
import { useTranslate } from './useTranslate'

/**
 * Lo que la lista de eventos, la tarjeta y el detalle sacaban cada uno por su
 * cuenta de un evento de LeekDuck.
 *
 * Como todo lo de useTranslate, hay que llamarlo dentro de un computed o de la
 * plantilla, para que cambie con el idioma.
 */
export function useEventos() {
  const gameData = useGameDataStore()
  const { t, te, locale } = useTranslate()

  /** LeekDuck publica tipos nuevos de vez en cuando: si falta, se usa su título. */
  const tipoDeEvento = (evento) => {
    const key = `events.types.${evento.eventType}`
    return te(key) ? t(key) : gameData.autoTranslate(evento.heading) || t('events.types.event')
  }

  /**
   * Los bonus de la noticia oficial de un evento, en el idioma de la app (el
   * español si la noticia no está en inglés). `noticias` es lo que devuelve
   * cargarNoticias().
   */
  const bonusDeEvento = (noticias, evento) => {
    const bonus = noticias?.bonus?.[evento?.eventID]
    return (locale() === 'en' && bonus?.en?.length ? bonus.en : bonus?.es) ?? []
  }

  return { tipoDeEvento, bonusDeEvento }
}
