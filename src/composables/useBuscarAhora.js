import { useLiveStore } from '../stores/live'
import { useGameDataStore } from '../stores/gameData'
import { useTranslate } from './useTranslate'
import { useEventos } from './useEventos'
import { plainText } from '../utils/gameText'
import { spriteUrl } from '../utils/sprites'
import { dexFromImage } from '../utils/liveFeed'
import { nombreAlineacion, puestosRocket } from '../utils/rocket'
import { casa, normalizarBusqueda, palabrasDe } from '../utils/buscar'

/**
 * Las misiones del evento. LeekDuck pone a su sección el nombre del evento
 * («Fall Marathon: Buddy Trek Tasks») y ScrapedDuck, que solo conoce los
 * títulos fijos («Catching Tasks»…), las deja sin tipo. Así que las que
 * llegan sin tipo son justo esas, y van las primeras: son las que se buscan.
 */
export const TIPO_EVENTO = 'event'

/**
 * Desde cuántas letras se busca en todo lo de ahora. Con «as» casaban 59
 * cosas (cualquier misión con «pas», «las», «más») y lo que se buscaba, un
 * Pokémon, quedaba debajo de todo eso.
 */
export const MIN_LETRAS = 3

/**
 * Qué textos de cada cosa de «Ahora en el juego» cuentan al buscar, y la
 * búsqueda en todo a la vez para el buscador de la cabecera.
 *
 * Los nombres van en inglés y en el idioma de la app: los feeds los dan en
 * inglés y hay quien busca así. Como useTranslate, hay que llamar a lo que
 * devuelve dentro de un computed o de la plantilla.
 */
export function useBuscarAhora() {
  const live = useLiveStore()
  const gameData = useGameDataStore()
  const { t, te } = useTranslate()
  const { nombreDeEvento, tipoDeEvento } = useEventos()

  const nombres = (enIngles) => [enIngles, gameData.nombreEs(enIngles)]
  const nombreTipo = (tipo) => (te(`types.${tipo}`) ? t(`types.${tipo}`) : tipo)

  const nivelIncursion = (tier) => (te(`raids.tiers.${tier}`) ? t(`raids.tiers.${tier}`) : tier)
  /** «Nivel 5», o «Oscuras · Nivel 5» si es un jefe oscuro. */
  const nivelJefe = (boss) =>
    /^shadow\s/i.test(boss.name ?? '')
      ? `${t('raids.tiers.shadow')} · ${nivelIncursion(boss.tier)}`
      : nivelIncursion(boss.tier)

  const tipoMision = (task) => task.type ?? TIPO_EVENTO
  /**
   * Un tipo que aún no está traducido sale tal cual, pero con mayúscula:
   * «rocket» y «training» se colaron así en la lista.
   */
  const etiquetaMision = (tipo) =>
    te(`raids.researchTypes.${tipo}`)
      ? t(`raids.researchTypes.${tipo}`)
      : tipo.charAt(0).toUpperCase() + tipo.slice(1)
  /** Las tareas llegan en inglés: se traducen con las frases del juego. */
  const textoMision = (task) => gameData.translateText(plainText(task.text))

  const camposMision = (task) => [
    plainText(task.text),
    textoMision(task),
    etiquetaMision(tipoMision(task)),
    ...(task.rewards ?? []).flatMap((reward) => nombres(reward.name))
  ]
  const camposJefe = (boss) => [...nombres(boss.name), nivelJefe(boss)]
  const camposHuevo = (egg) => [...nombres(egg.name), egg.eggType]
  /** Un jefe Max ya resuelto contra el roster (name y nameEs). */
  const camposMax = (uno) => [uno.name, uno.nameEs, 'Max', t('max.tier', { n: uno.tier })]
  const camposRocket = (lineup) => [
    lineup.name,
    nombreAlineacion(lineup, t, nombreTipo),
    lineup.type ? nombreTipo(lineup.type) : null,
    ...puestosRocket(lineup)
      .flat()
      .flatMap((mon) => nombres(mon.name))
  ]
  const camposEvento = (evento) => [evento.name, nombreDeEvento(evento), tipoDeEvento(evento)]

  /** Los huevos repetidos (LeekDuck lista algunos dos veces), fuera. */
  const huevosUnicos = () => {
    const vistos = new Set()
    return live.eggs.filter((egg) => {
      const clave = `${egg.eggType}|${egg.name}`
      if (vistos.has(clave)) return false
      vistos.add(clave)
      return true
    })
  }

  /** Los jefes Max de hoy, con el nombre y el sprite del roster. */
  const jefesMax = () =>
    (gameData.maxLive?.pokemon ?? []).map((uno) => {
      const entry = gameData.baseByDex(uno.dex)
      return {
        ...uno,
        name: entry?.name ?? uno.name,
        nameEs: entry?.nameEs ?? uno.name,
        imagen: entry ? spriteUrl(entry.spriteId) : null
      }
    })

  /**
   * Todo lo que casa con `consulta`, por secciones y en el orden en que se
   * enseña. Cada resultado lleva a donde se ve: la pestaña de «Ahora» con la
   * misma búsqueda puesta, o el evento abierto. El `to` de cada sección es el
   * de la sección entera.
   *
   * @returns {Array<{ clave: string, titulo: string, to: object, items: Array<{
   *   id: string, texto: string, sub?: string, imagen?: string,
   *   insignia?: string, shiny?: boolean, dynamax?: boolean, gigantamax?: boolean,
   *   to: object }> }>}
   *
   * `shiny`, `dynamax` y `gigantamax` son las marcas del sprite (ver
   * SpriteMarcado), las mismas que en la Pokédex. En una misión, el sprite es
   * su primera recompensa.
   */
  const buscar = (consulta) => {
    const palabras = palabrasDe(consulta)
    if (palabras.join('').length < MIN_LETRAS) return []
    const q = String(consulta).trim()
    // ?buscar= y no ?q=: es de un solo uso (ver RaidsView).
    const enAhora = (tab) => ({ path: '/live', query: { tab, buscar: q } })

    /**
     * El sprite y las marcas de un Pokémon del feed. El sprite, el nuestro (el
     * de la Pokédex) y no el icono de LeekDuck, que es otro dibujo y llena la
     * imagen entera: junto a un jefe Max, que ya usa el nuestro, uno salía más
     * grande y distinto que el otro. El de LeekDuck, solo si no lo tenemos
     * (disfraces). Las marcas: shiny si está liberado (o lo dice el feed) y
     * Dinamax o Gigamax si su especie puede, como en la Pokédex.
     */
    const spriteDe = (mon) => {
      if (!mon) return {}
      const dex = dexFromImage(mon.image)
      const entrada = gameData.baseByName(mon.name) ?? gameData.baseByDex(dex)
      const info = gameData.maxInfoFor(entrada)
      return {
        imagen: entrada ? spriteUrl(entrada.spriteId) : mon.image,
        shiny: gameData.shinyReleased(dex, mon.canBeShiny),
        dynamax: Boolean(info),
        gigantamax: Boolean(info?.gigantamax)
      }
    }

    /**
     * De varios Pokémon (las recompensas de una misión, los de un recluta), el
     * que más se parece a lo buscado: primero uno cuyo nombre empiece por lo
     * escrito, luego uno que lo contenga. null si ninguno casa (se buscaba
     * otra cosa, como «caramelo»).
     */
    const elMasParecido = (mons) => {
      const puntos = (mon) => {
        const suyos = nombres(mon.name).map(normalizarBusqueda)
        if (suyos.some((nombre) => nombre.startsWith(palabras[0]))) return 2
        return casa(palabras, suyos) ? 1 : 0
      }
      let mejor = null
      let maximo = 0
      for (const mon of mons) {
        const p = puntos(mon)
        if (p > maximo) [mejor, maximo] = [mon, p]
      }
      return mejor
    }

    /**
     * Una misión da varios Pokémon, pero se busca uno: sale ese, con su sprite,
     * y el resto como «y 2 más». Si no se buscaba un Pokémon, el primero.
     */
    const misiones = live.research
      .filter((task) => casa(palabras, camposMision(task)))
      .map((task, i) => {
        const recompensas = task.rewards ?? []
        const elegida = elMasParecido(recompensas) ?? recompensas[0]
        const nombre = elegida ? gameData.nombreEs(elegida.name) : ''
        const otras = recompensas.length - 1
        return {
          id: `mision-${i}`,
          texto: textoMision(task),
          sub: otras > 0 ? t('buscador.yOtros', { nombre, n: otras }) : nombre,
          ...spriteDe(elegida),
          insignia: tipoMision(task) === TIPO_EVENTO ? etiquetaMision(TIPO_EVENTO) : null,
          to: enAhora('research')
        }
      })

    const incursiones = [
      ...live.raids
        .filter((boss) => casa(palabras, camposJefe(boss)))
        .map((boss) => ({
          id: `jefe-${boss.name}`,
          texto: gameData.nombreEs(boss.name),
          sub: nivelJefe(boss),
          ...spriteDe(boss),
          oscuro: /^shadow\s/i.test(boss.name ?? ''),
          to: enAhora('raids')
        })),
      ...jefesMax()
        .filter((uno) => casa(palabras, camposMax(uno)))
        .map((uno) => ({
          id: `max-${uno.dex}-${uno.tier}`,
          texto: gameData.nombreEs(uno.name),
          sub: `Max · ${t('max.tier', { n: uno.tier })}`,
          imagen: uno.imagen,
          shiny: Boolean(uno.canBeShiny),
          dynamax: true,
          gigantamax: Boolean(gameData.maxInfoFor(gameData.baseByDex(uno.dex))?.gigantamax),
          to: enAhora('raids')
        }))
    ]

    const huevos = huevosUnicos()
      .filter((egg) => casa(palabras, camposHuevo(egg)))
      .map((egg) => ({
        id: `huevo-${egg.eggType}-${egg.name}`,
        texto: gameData.nombreEs(egg.name),
        sub: t('raids.huevoDe', { km: egg.eggType }),
        ...spriteDe(egg),
        to: enAhora('eggs')
      }))

    const rocket = live.rocket
      .filter((lineup) => casa(palabras, camposRocket(lineup)))
      .map((lineup) => {
        // Si se buscaba uno de sus Pokémon, su sprite; si no, el icono de Rocket.
        const elegido = elMasParecido(puestosRocket(lineup).flat())
        return {
          id: `rocket-${lineup.name}`,
          texto: nombreAlineacion(lineup, t, nombreTipo),
          sub: elegido ? `Team GO Rocket · ${gameData.nombreEs(elegido.name)}` : 'Team GO Rocket',
          ...spriteDe(elegido),
          to: enAhora('rocket')
        }
      })

    const eventos = [...live.active, ...live.upcoming]
      .filter((evento) => casa(palabras, camposEvento(evento)))
      .map((evento) => ({
        id: `evento-${evento.eventID}`,
        texto: nombreDeEvento(evento),
        sub: tipoDeEvento(evento),
        to: { path: '/events', query: { event: evento.eventID } }
      }))

    return [
      { clave: 'research', titulo: t('raids.tabResearch'), items: misiones },
      { clave: 'raids', titulo: t('raids.tabRaids'), items: incursiones },
      { clave: 'eggs', titulo: t('raids.tabEggs'), items: huevos },
      { clave: 'rocket', titulo: t('raids.tabRocket'), items: rocket },
      { clave: 'events', titulo: t('nav.events'), items: eventos, to: { path: '/events' } }
    ]
      .filter((seccion) => seccion.items.length)
      .map((seccion) => ({ to: enAhora(seccion.clave), ...seccion }))
  }

  return {
    nivelIncursion,
    tipoMision,
    etiquetaMision,
    textoMision,
    camposMision,
    camposJefe,
    camposHuevo,
    camposMax,
    camposRocket,
    buscar
  }
}
