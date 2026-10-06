/**
 * Fórmulas de Pokémon GO.
 *
 * Todo lo que hay aquí es puro y determinista: es la única fuente de verdad
 * tanto para la app como para el script que genera los rankings PvE
 * (scripts/build-data.mjs). Si tocas algo, los tests de tests/ lo cazan.
 */

/**
 * Multiplicador de PC por nivel entero (índice 0 = nivel 1).
 * Extraído de PLAYER_LEVEL_SETTINGS del GAME_MASTER. El script de datos
 * comprueba que sigue coincidiendo y avisa si Niantic lo cambia.
 */
export const CPM_BY_LEVEL = [
  0.094, 0.16639787, 0.21573247, 0.25572005, 0.29024988, 0.3210876, 0.34921268, 0.3752356,
  0.39956728, 0.4225, 0.44310755, 0.4627984, 0.48168495, 0.49985844, 0.51739395, 0.5343543,
  0.5507927, 0.5667545, 0.5822789, 0.5974, 0.6121573, 0.6265671, 0.64065295, 0.65443563, 0.667934,
  0.6811649, 0.69414365, 0.7068842, 0.7193991, 0.7317, 0.7377695, 0.74378943, 0.74976104, 0.7556855,
  0.76156384, 0.76739717, 0.7731865, 0.77893275, 0.784637, 0.7903, 0.7953, 0.8003, 0.8053, 0.8103,
  0.8153, 0.8203, 0.8253, 0.8303, 0.8353, 0.8403, 0.8453, 0.8503, 0.8553, 0.8603, 0.8653, 0.8653,
  0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653,
  0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653
]

/** Multiplicadores de un Pokémon oscuro. */
export const SHADOW_ATK = 1.2
export const SHADOW_DEF = 1 / 1.2

/** Bonus por ataque del mismo tipo. */
export const STAB = 1.2

/**
 * CPM de un nivel, admitiendo medios niveles.
 * Los medios niveles no vienen en el GAME_MASTER: se derivan con la media
 * cuadrática de los dos enteros adyacentes.
 */
export function cpm(level) {
  const low = Math.floor(level)
  const a = CPM_BY_LEVEL[low - 1]
  if (a === undefined) throw new RangeError('Nivel fuera de rango: ' + level)
  if (level === low) return a
  const b = CPM_BY_LEVEL[low]
  if (b === undefined) return a
  return Math.sqrt((a * a + b * b) / 2)
}

/**
 * Estadísticas efectivas en combate.
 * @param {{atk:number,def:number,hp:number}} base estadísticas base
 * @param {{atk:number,def:number,hp:number}} ivs 0-15 cada una
 */
export function effectiveStats(base, ivs, level, options = {}) {
  const shadow = options.shadow === true
  const m = cpm(level)
  return {
    atk: (base.atk + ivs.atk) * m * (shadow ? SHADOW_ATK : 1),
    def: (base.def + ivs.def) * m * (shadow ? SHADOW_DEF : 1),
    hp: Math.max(10, Math.floor((base.hp + ivs.hp) * m))
  }
}

/** PC de un Pokémon. Mínimo 10, siempre truncado hacia abajo. */
export function calcCP(base, ivs, level) {
  const m = cpm(level)
  const a = (base.atk + ivs.atk) * m
  const d = (base.def + ivs.def) * m
  const s = (base.hp + ivs.hp) * m
  return Math.max(10, Math.floor((a * Math.sqrt(d) * Math.sqrt(s)) / 10))
}

/** PS de un Pokémon. */
export function calcHP(base, ivHp, level) {
  return Math.max(10, Math.floor((base.hp + ivHp) * cpm(level)))
}

/**
 * Daño de un golpe: floor(0.5 · potencia · atk/def · modificadores) + 1
 */
export function damage(power, atk, def, mods = {}) {
  const stab = mods.stab ?? 1
  const effectiveness = mods.effectiveness ?? 1
  const extra = mods.extra ?? 1
  return Math.floor(0.5 * power * (atk / def) * stab * effectiveness * extra) + 1
}

/**
 * Lo que pega el jefe: su DPS contra un atacante es esto entre la defensa del
 * atacante. Antes era 900, el jefe genérico de GamePress, que pega flojo: los
 * atacantes duraban de más y los de cristal salían demasiado arriba. 1333 es
 * el jefe de Dittobase (sale de sus TDO publicados: casi todos dan
 * exactamente esto), más parecido a un jefe de incursión de nivel 5.
 */
export const JEFE_DPS = 4000 / 3

/**
 * Segundos que se pierden cada vez que un atacante se debilita: lo que tarda
 * en entrar el siguiente y la parte que le toca de volver a la sala (10 s cada
 * equipo de seis). Calibrado con el eDPS de Dittobase: su descuento equivale a
 * unos 2,3 s por caída.
 */
export const TIEMPO_POR_CAIDA = 2.3

/**
 * DPS, TDO y eDPS de un moveset contra un objetivo genérico.
 *
 * Modelo continuo, el estándar de la comunidad:
 *   r = (EPSrápido + 0.5·y − coste/2/vida) / (coste + EPSrápido · duraciónCargado)
 *       (ritmo de cargados por segundo; el 0.5·y es la energía que genera el
 *        daño recibido, y coste/2/vida la que se pierde al debilitarse)
 *   DPS  = DPSrápido + r · (dañoCargado − DPSrápido · duraciónCargado)
 *   y    = JEFE_DPS / defensa efectiva  (DPS entrante del jefe)
 *   TDO  = DPS · PS / y
 *   eDPS = DPS · vida / (vida + TIEMPO_POR_CAIDA)
 *          (el DPS real de una incursión: el que cae pronto pierde más tiempo
 *           entrando de nuevo, y eso es lo que separa a un atacante de cristal
 *           de uno que aguanta; sustituye al ER, (DPS³·TDO)^¼, que lo
 *           mezclaba a ojo)
 *
 * No modela esquivar ni ventanas de daño exactas: sirve para ordenar
 * atacantes entre sí, no para predecir un combate concreto al segundo.
 */
export function movesetPerformance({ stats, fast, charged, target }) {
  const { atk, def, hp } = stats
  const tDef = target.def

  const fDmg = damage(fast.power, atk, tDef, {
    stab: fast.stab ? STAB : 1,
    effectiveness: fast.effectiveness ?? 1
  })
  const cDmg = damage(charged.power, atk, tDef, {
    stab: charged.stab ? STAB : 1,
    effectiveness: charged.effectiveness ?? 1
  })

  const fDur = fast.duration
  const cDur = charged.duration
  const fEps = fast.energy / fDur
  const cost = Math.abs(charged.energy)

  const y = JEFE_DPS / def
  const timeAlive = hp / y
  const denom = cost + fEps * cDur
  // La energía que queda al debilitarse se pierde: de media, medio cargado.
  // Castiga a los cargados de una barra y a los que caen pronto, que en una
  // incursión lanzan menos cargados de los que dice el ritmo continuo.
  const perdida = cost / 2 / timeAlive
  let r = denom > 0 ? Math.max(0, fEps + 0.5 * y - perdida) / denom : 0
  r = Math.min(r, 1 / cDur)

  const fDps = fDmg / fDur
  const dps = Math.max(fDps, fDps + r * (cDmg - fDps * cDur))
  const tdo = dps * timeAlive
  const edps = (dps * timeAlive) / (timeAlive + TIEMPO_POR_CAIDA)

  return { dps, tdo, edps, fastDamage: fDmg, chargedDamage: cDmg, timeAlive }
}

/** Efectividad de un tipo atacante contra uno o dos tipos defensores. */
export function effectivenessAgainst(chart, attackType, defenderTypes) {
  const row = chart[attackType]
  if (!row) return 1
  return defenderTypes.reduce((acc, t) => acc * (row[t] ?? 1), 1)
}

/** Nivel máximo de un Pokémon (con caramelos XL). */
export const MAX_LEVEL = 50

/** Producto de estadísticas (bulk), criterio para valorar IV en PvP. */
export function statProduct(base, ivs, level, options = {}) {
  const s = effectiveStats(base, ivs, level, options)
  return s.atk * s.def * s.hp
}

/** Nivel máximo al que unos IV siguen por debajo del tope de PC, o null si ni a nivel 1. */
export function maxLevelForCap(base, ivs, cap, maxLevel = MAX_LEVEL) {
  let best = null
  for (let l = 1; l <= maxLevel; l += 0.5) {
    if (calcCP(base, ivs, l) <= cap) best = l
    else break
  }
  return best
}

/**
 * Las 4096 combinaciones de IV para una liga con tope de PC, de mejor a peor
 * por producto de estadísticas, cada una con su puesto, nivel, PC y su
 * porcentaje respecto a la mejor. Es el criterio de pvpoke y de las
 * calculadoras de IV de PvP: en una liga con tope gana el que más aguanta
 * (defensa y PS), no el 100 %.
 */
export function rankIVsForLeague(base, cap, options = {}) {
  const maxLevel = options.maxLevel ?? MAX_LEVEL
  const shadow = options.shadow === true
  const all = []
  for (let a = 0; a <= 15; a++) {
    for (let d = 0; d <= 15; d++) {
      for (let h = 0; h <= 15; h++) {
        const ivs = { atk: a, def: d, hp: h }
        const level = maxLevelForCap(base, ivs, cap, maxLevel)
        if (level === null) continue
        all.push({
          ivs,
          level,
          cp: calcCP(base, ivs, level),
          product: statProduct(base, ivs, level, { shadow })
        })
      }
    }
  }
  all.sort((x, y) => y.product - x.product)
  const top = all.length ? all[0].product : 1
  all.forEach((e, i) => {
    e.rank = i + 1
    e.percent = (e.product / top) * 100
  })
  return all
}
