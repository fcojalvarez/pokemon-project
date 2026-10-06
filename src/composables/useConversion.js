import { useTranslate } from './useTranslate'
import { useGameDataStore } from '../stores/gameData'

/**
 * Los textos de una fusión o un cambio de forma (utils/cambiosForma): el
 * nombre de cada Pokémon y, en una frase, con qué se consigue.
 */
export function useConversion() {
  const { t, formatNumber, localName } = useTranslate()
  const gameData = useGameDataStore()

  const nombre = (id) => {
    const entry = gameData.byId.get(id)
    return entry ? localName(entry) : id
  }

  /** «Con 1.000 de Energía Fusión Lunar, que se consigue derrotando a…». */
  const comoTexto = (c) => {
    if (c.energia)
      return t('pokemon.conversion.energyFrom', {
        cantidad: formatNumber(c.cantidad),
        energia: t(`pokemon.conversion.energy.${c.energia}`),
        forma: nombre(c.a)
      })
    if (c.celulas) return t('pokemon.conversion.cells', { n: formatNumber(c.celulas) })
    return t('pokemon.conversion.candyDust', {
      caramelos: formatNumber(c.caramelos),
      polvo: formatNumber(c.polvo)
    })
  }

  /** Plegada: «Fusionando Necrozma con Lunala». */
  const resumenTexto = (c) =>
    c.tipo === 'fusion'
      ? t('pokemon.conversion.summaryFusion', { desde: nombre(c.desde), con: nombre(c.con) })
      : t('pokemon.conversion.summaryCambio', { desde: nombre(c.desde) })

  return { nombre, comoTexto, resumenTexto }
}
