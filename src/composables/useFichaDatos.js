import { computed, toValue, watch } from 'vue'
import { useGameDataStore } from '../stores/gameData'
import { useTranslate } from './useTranslate'
import { describeMoveEffect, effectChanceLabel } from '../utils/moveEffect'
import { calcCP } from '../utils/formulas'
import { origenDe, origenesPresentes } from '../utils/moveOrigins'

/** Los niveles de la tabla de PC 100 %: misiones, incursiones, clima, tope sin XL y con XL. */
const NIVELES_PC = [15, 20, 25, 30, 35, 40, 50]

/** Caramelos del segundo ataque según su coste en polvo (van a la par). */
const CARAMELOS_SEGUNDO_ATAQUE = { 10000: 25, 50000: 50, 75000: 75, 100000: 100 }

/**
 * El juego pone 9.999.999 caramelos a los que no pueden aprender un segundo
 * ataque (Smeargle): salía tal cual como coste.
 */
const NO_APRENDE = 1000000

/** Las ligas PvP, de la Súper a la Master. */
const LIGAS = ['great', 'ultra', 'master']

/**
 * Supabase guarda "dragon tail" y el GAME_MASTER lo identifica como
 * DRAGON_TAIL: sin esta normalización solo casarían los de una palabra.
 */
const idDeAtaque = (move) =>
  move
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')

/**
 * Todo lo que enseña la ficha de un Pokémon, calculado una vez para la
 * cabecera (PokemonView) y las secciones (PokemonExtraInfo).
 *
 * `pokemon` es la fila de la tabla `pokemons` y `formId` el ?form= de la URL
 * (mega, primigenia, regional…). Los dos se pasan como getter o ref.
 */
export function useFichaDatos({ pokemon, formId }) {
  const gameData = useGameDataStore()
  const { t, intlLocale } = useTranslate()

  const fila = () => toValue(pokemon)

  /** La forma que pide la URL, si la pide y existe. */
  const form = computed(() => {
    const id = toValue(formId)
    return id && gameData.isReady ? gameData.byId.get(id) ?? null : null
  })

  /**
   * La especie en el roster, que sale del GAME_MASTER y se regenera cada día.
   * De aquí salen los ataques, las estadísticas y el coste del segundo ataque:
   * en la tabla `pokemons` eran de la siembra y se habían quedado atrás (a 511
   * especies les faltaban ataques nuevos, y las más recientes tenían las
   * estadísticas a cero). La tabla queda de respaldo por si el roster no la trae.
   *
   * Cuál de sus formas es lo decide `fichaBase`, la misma para la cabecera y
   * las secciones.
   */
  const base = computed(() => {
    const p = fila()
    return p && gameData.isReady ? gameData.fichaBase(p.pokemon_id, p.name) : null
  })

  /**
   * La especie tiene una sola forma (sin contar megas, oscuros ni regionales):
   * entonces en los puestos no hace falta repetir su nombre en cada fila. Con
   * varias (Urshifu, Deoxys) sí, que si no no se sabe de cuál es cada una.
   */
  const formaUnica = computed(
    () =>
      (gameData.formsByDex.get(fila()?.pokemon_id) ?? []).filter(
        (e) => !e.mega && !e.shadow && !e.regional
      ).length === 1
  )

  /**
   * El Pokémon con la forma que usa el motor de rankings: la de la URL, la
   * base del roster o, sin roster (aún cargando o especie que no trae), una
   * construida con lo que guarda Supabase.
   */
  const entrada = computed(() => {
    if (form.value) return form.value
    if (base.value) return base.value

    const p = fila()
    const { stats, moves, types } = p ?? {}
    if (!stats || !moves) return null
    const upper = (list) => (list ?? []).map(idDeAtaque)

    // Sin forma base en el roster, no hay legacy ni datos Max: eso solo lo
    // sabe el roster generado.
    return {
      id: `dex-${p.pokemon_id}`,
      dex: p.pokemon_id,
      name: p.name,
      nameEs: p.name,
      types: types ?? [],
      stats: { atk: stats.base_attack, def: stats.base_defense, hp: stats.base_stamina },
      fast: [...upper(moves.fast), ...upper(moves.elite_fast)],
      charged: [...upper(moves.charged), ...upper(moves.elite_charged)],
      eliteMoves: [...upper(moves.elite_fast), ...upper(moves.elite_charged)],
      legacyMoves: [],
      released: true,
      shadow: false,
      mega: false,
      dynamax: false,
      gigantamax: false,
      maxCostGroup: null
    }
  })

  // ---------- PC de un 100 % ----------
  const cpTable = computed(() => {
    if (!gameData.isReady) return []
    const stats = form.value?.stats ?? (base.value?.stats?.atk ? base.value.stats : null)
    if (stats) {
      const ivs = { atk: 15, def: 15, hp: 15 }
      return NIVELES_PC.map((level) => ({ level, cp: calcCP(stats, ivs, level) }))
    }
    const deTabla = fila()?.stats
    return deTabla?.base_attack ? gameData.perfectCP(deTabla) : []
  })

  /** Si puede dinamaxizar, el nivel 20 es también el de lo que sale de un combate Max. */
  const esMax = computed(() => Boolean(entrada.value?.dynamax || entrada.value?.gigantamax))

  const maxInfo = computed(() =>
    gameData.isReady && entrada.value ? gameData.maxInfoFor(entrada.value) : null
  )

  // ---------- Debilidades ----------
  const matchups = computed(() => {
    const types = form.value?.types ?? fila()?.types
    return gameData.isReady && types?.length ? gameData.matchups(types) : { weak: [], resist: [] }
  })

  // ---------- Ataques ----------
  const bestMovesets = computed(() =>
    gameData.isReady && entrada.value ? gameData.bestMovesets(entrada.value, 5) : []
  )

  const movepool = computed(() => {
    const entry = entrada.value
    if (!entry || !gameData.isReady)
      return { fast: [], charged: [], origenes: origenesPresentes([]) }

    const origen = origenDe(entry)
    const pick = (ids) =>
      ids
        .map((id) => {
          const move = gameData.moves[id]
          return move && { ...move, ...origen(id) }
        })
        .filter(Boolean)

    // El exclusivo de la supermega va con los cargados: para el jugador es un
    // ataque más de los que puede llevar, aunque no entre en los rankings.
    const charged = pick([...entry.charged, ...(entry.megaMoves ?? [])])
    const fast = pick(entry.fast)
    return { fast, charged, origenes: origenesPresentes([...fast, ...charged]) }
  })

  /**
   * Ataques de este Pokémon que hacen algo además de daño, con el efecto ya
   * redactado. Solo los que tienen efecto: listarlos todos sería una tabla
   * enorme en la que no se vería lo que importa.
   */
  const moveEffects = computed(() =>
    [...movepool.value.fast, ...movepool.value.charged]
      .map((move) => {
        const effect = describeMoveEffect(move.pvp)
        if (!effect) return null

        const verb = t(`moves.verbs.${effect.direction}`)
        const intensity = t(`moves.intensity.${effect.intensity}`)
        const stats = effect.stats
          .map((stat) => t(`moves.statNames.${effect.target}.${stat}`))
          .join(` ${t('and')} `)
        const percent = effectChanceLabel(effect.chance, intlLocale())

        return {
          id: move.id,
          name: move.name,
          nameEs: move.nameEs,
          type: move.type,
          elite: move.elite,
          legacy: move.legacy,
          mega: move.mega,
          text: [verb, intensity, stats].filter(Boolean).join(' '),
          chance: percent ? t('moves.chance', { percent }) : null
        }
      })
      .filter(Boolean)
  )

  // ---------- Avisos y costes ----------
  /**
   * Lo que hay que gastar con este Pokémon. Todo sale de columnas que Supabase
   * ya guardaba y no se enseñaban.
   */
  const costs = computed(() => {
    const p = fila()
    if (!p) return []
    const { third_move: third, shadow_info: shadow, buddy } = p
    const rows = []

    // El coste del segundo ataque, del roster (en polvo; los caramelos van a la
    // par). En la tabla había especies con el polvo a 0.
    const polvo = base.value?.thirdMoveCost
    if (third?.candy_required >= NO_APRENDE) {
      rows.push({ key: 'secondCharged', texto: t('pokemon.cannotLearn') })
    } else if (polvo) {
      rows.push({
        key: 'secondCharged',
        candy: CARAMELOS_SEGUNDO_ATAQUE[polvo] ?? third?.candy_required ?? null,
        dust: polvo
      })
    } else if (third?.candy_required) {
      // Sí, en la base de datos la columna se llama "startdust_required".
      rows.push({
        key: 'secondCharged',
        candy: third.candy_required,
        dust: third.startdust_required ?? null
      })
    }

    if (p.is_shadow_released && shadow?.candy_required_purification) {
      rows.push({
        key: 'purify',
        candy: shadow.candy_required_purification,
        dust: shadow.stardust_required_purification ?? null
      })
    }

    // El coste de megaevolucionar vive en el roster generado, no en Supabase.
    const mega = gameData.isReady
      ? (gameData.formsByDex.get(p.pokemon_id) ?? []).find(
          (forma) => forma.mega && forma.megaEnergy
        )
      : null
    if (mega) {
      rows.push({ key: 'megaFirst', energy: mega.megaEnergy.first })
      rows.push({ key: 'megaNext', energy: mega.megaEnergy.subsequent })
    }

    if (buddy?.candy_distance) rows.push({ key: 'buddyCandy', km: buddy.candy_distance })
    if (buddy?.mega_distance) rows.push({ key: 'buddyMega', km: buddy.mega_distance })

    return rows
  })

  /**
   * Avisos que cambian lo que puedes hacer con él.
   *
   * Solo las excepciones: el 97 % es intercambiable y transferible, así que
   * ponerle la etiqueta a todos sería ruido. Lo que importa es cuando NO se
   * puede. `is_raid_exclusive` no entra: está a false en los 1017 registros
   * porque el script que repuebla la tabla nunca lo rellena. Tampoco «Puede ser
   * un Ditto» ni «Solo por combates»: eran listas escritas a mano en 2023 sin
   * ninguna fuente que las mantenga al día.
   */
  const flags = computed(() => {
    const p = fila()
    if (!p) return []
    return [
      // Terapagos, Gouging Fire…: en la Pokédex salen tachados; en la ficha no
      // lo decía nada.
      !p.is_released && 'notReleased',
      !p.is_tradeable && 'notTradeable',
      !p.is_transferable && 'notTransferable',
      p.is_shadow_released && 'canBeShadow'
    ].filter(Boolean)
  })

  // ---------- Puestos ----------
  /**
   * Puestos PvE por forma: la que se está viendo y, debajo, su versión oscura,
   * que en el Top sale aparte y aquí no aparecía nunca. Sin forma concreta,
   * todas las de la especie.
   */
  const pveRanks = computed(() => {
    if (!gameData.isReady || !fila()) return []
    const formas = gameData.pveRanksFor(fila().pokemon_id).filter((forma) => forma.byType.length)
    const principal = form.value?.id ?? base.value?.id
    const ids = [principal, `${principal}_shadow`]
    const suyas = ids.map((id) => formas.find((forma) => forma.id === id)).filter(Boolean)
    // Viendo una forma concreta, solo ella y su oscura. En la ficha de la
    // especie, detrás, las demás (las megas), por puesto.
    if (form.value) return suyas
    return [...suyas, ...formas.filter((forma) => !ids.includes(forma.id))]
  })

  // Los rankings PvP se piden aparte, cuando ya está lo principal de la ficha.
  watch(
    () => gameData.isReady,
    (listo) => {
      if (listo) gameData.cargarPvp()
    },
    { immediate: true }
  )

  const pvpRanks = computed(() => {
    if (!gameData.isReady || !fila()) return []
    const ranks = gameData.pvpRanksFor(fila().pokemon_id)
    return form.value ? ranks.filter((entry) => entry.id === form.value.id) : ranks
  })

  /**
   * Los puestos PvP por liga, de la Súper a la Master, y dentro de cada una del
   * mejor al peor. Antes iban todos mezclados por puesto y el resumen decía
   * «Hiper #103 · Hiper #125» sin aclarar que el segundo era el oscuro.
   */
  const pvpPorLiga = computed(() =>
    LIGAS.map((league) => ({
      league,
      entries: pvpRanks.value.filter((entry) => entry.league === league)
    })).filter((liga) => liga.entries.length)
  )

  /**
   * Si hay que poner el nombre de la forma junto a un puesto: con una sola
   * forma y siendo la base, sobra. `varias`: hay más de un puesto en ese grupo.
   */
  const conNombre = (id, varias) => varias || !formaUnica.value || id !== base.value?.id

  return {
    form,
    base,
    formaUnica,
    entrada,
    cpTable,
    esMax,
    maxInfo,
    matchups,
    bestMovesets,
    movepool,
    moveEffects,
    costs,
    flags,
    pveRanks,
    pvpRanks,
    pvpPorLiga,
    conNombre
  }
}
