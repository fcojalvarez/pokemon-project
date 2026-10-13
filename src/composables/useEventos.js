import { useGameDataStore } from '../stores/gameData'
import { useTranslate } from './useTranslate'
import { parseEventName, quitarTipo, splitPokemonList } from '../utils/eventName'
import { debutsEnNoticia } from '../utils/pokemonEnTexto'

/**
 * Los debuts de cada noticia, calculados una vez: buscar todo el roster en el
 * texto no es gratis y la lista de eventos se repinta a menudo. Por noticia y
 * por roster (al llegar el roster, se recalcula).
 */
const debutsGuardados = new WeakMap()

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

  /**
   * Los Pokémon que debutan en un evento, según su noticia oficial (ver
   * debutsEnNoticia). `noticias` es lo que devuelve cargarNoticias().
   */
  const debutsDeEvento = (noticias, evento) => {
    const slug = noticias?.eventos?.[evento?.eventID]
    const entrada = slug ? noticias.noticias?.[slug] : null
    const noticia = entrada?.es ?? entrada?.en
    if (!noticia || !gameData.isReady) return []
    const guardado = debutsGuardados.get(noticia)
    if (guardado?.roster === gameData.roster) return guardado.debuts
    const debuts = debutsEnNoticia(noticia, gameData.roster)
    debutsGuardados.set(noticia, { roster: gameData.roster, debuts })
    return debuts
  }

  /**
   * El título en el idioma de la app. LeekDuck lo da en inglés («Mega Malamar
   * in Mega Raids»): si sigue uno de los patrones conocidos se arma en el
   * idioma de la interfaz, con el nombre del Pokémon traducido; si no (eventos
   * con nombre propio), la traducción automática de `pnpm traducir` o, sin
   * ella, el inglés.
   */
  const nombreDeEvento = (evento) => {
    const parts = parseEventName(evento.name)
    if (!parts) return gameData.autoTranslate(evento.name)

    const key = `events.names.${parts.key}`
    if (!te(key)) return gameData.autoTranslate(evento.name)

    // Varios protagonistas: se traduce cada uno y se unen con la conjunción
    // del idioma, que el "and" inglés en mitad de una frase en español canta.
    const nombres = splitPokemonList(parts.pokemon).map((uno) => gameData.nombreEs(uno))
    const pokemon =
      nombres.length > 1
        ? `${nombres.slice(0, -1).join(', ')} ${t('and')} ${nombres.at(-1)}`
        : nombres[0] ?? parts.pokemon

    return t(key, { pokemon, tier: parts.tier })
  }

  /**
   * El título sin el tipo delante cuando lo repite: la etiqueta ya dice «Lunes
   * MAX» encima, y «Lunes MAX: Sobble Dinamax» debajo era decirlo dos veces.
   */
  const tituloDeEvento = (evento) => quitarTipo(nombreDeEvento(evento), tipoDeEvento(evento))

  return { tipoDeEvento, bonusDeEvento, debutsDeEvento, nombreDeEvento, tituloDeEvento }
}
