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
 * DPS, TDO y ER de un moveset contra un objetivo genérico.
 *
 * Modelo continuo, el estándar de la comunidad:
 *   r = (EPSrápido + 0.5·y) / (coste + EPSrápido · duraciónCargado)
 *       (ritmo de cargados por segundo; el 0.5·y es la energía que genera el
 *        daño recibido)
 *   DPS = DPSrápido + r · (dañoCargado − DPSrápido · duraciónCargado)
 *   y   = 900 / defensa efectiva  (DPS entrante de un enemigo genérico)
 *   TDO = DPS · PS / y
 *   ER  = (DPS³ · TDO)^(1/4)
 *
 * No modela esquivar, relevos ni ventanas de daño exactas: sirve para ordenar
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

  const y = 900 / def
  const denom = cost + fEps * cDur
  let r = denom > 0 ? (fEps + 0.5 * y) / denom : 0
  r = Math.min(r, 1 / cDur)

  const fDps = fDmg / fDur
  const dps = Math.max(fDps, fDps + r * (cDmg - fDps * cDur))
  const timeAlive = hp / y
  const tdo = dps * timeAlive
  const er = Math.pow(Math.pow(dps, 3) * tdo, 0.25)

  return { dps, tdo, er, fastDamage: fDmg, chargedDamage: cDmg, timeAlive }
}

/** Efectividad de un tipo atacante contra uno o dos tipos defensores. */
export function effectivenessAgainst(chart, attackType, defenderTypes) {
  const row = chart[attackType]
  if (!row) return 1
  return defenderTypes.reduce((acc, t) => acc * (row[t] ?? 1), 1)
}
