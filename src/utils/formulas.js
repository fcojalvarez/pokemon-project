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
  0.5507927, 0.5667545, 0.5822789, 0.5974, 0.6121573, 0.6265671, 0.64065295, 0.65443563,
  0.667934, 0.6811649, 0.69414365, 0.7068842, 0.7193991, 0.7317, 0.7377695, 0.74378943,
  0.74976104, 0.7556855, 0.76156384, 0.76739717, 0.7731865, 0.77893275, 0.784637, 0.7903,
  0.7953, 0.8003, 0.8053, 0.8103, 0.8153, 0.8203, 0.8253, 0.8303,
  0.8353, 0.8403, 0.8453, 0.8503, 0.8553, 0.8603, 0.8653, 0.8653,
  0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653,
  0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653,
  0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653, 0.8653,
]

export const MAX_LEVEL = 50
export const MAX_LEVEL_NO_XL = 40

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

/** Lista de niveles jugables (1 a max en pasos de 0.5). */
export function levelRange(max = MAX_LEVEL) {
  const out = []
  for (let l = 1; l <= max; l += 0.5) out.push(l)
  return out
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
    hp: Math.max(10, Math.floor((base.hp + ivs.hp) * m)),
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
    effectiveness: fast.effectiveness ?? 1,
  })
  const cDmg = damage(charged.power, atk, tDef, {
    stab: charged.stab ? STAB : 1,
    effectiveness: charged.effectiveness ?? 1,
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

/** Producto de estadísticas (bulk), criterio para valorar IVs en PvP. */
export function statProduct(base, ivs, level, options = {}) {
  const s = effectiveStats(base, ivs, level, options)
  return s.atk * s.def * s.hp
}

/** Nivel máximo al que unos IVs siguen por debajo del tope de PC. */
export function maxLevelForCap(base, ivs, cap, maxLevel = MAX_LEVEL) {
  let best = null
  for (let l = 1; l <= maxLevel; l += 0.5) {
    if (calcCP(base, ivs, l) <= cap) best = l
    else break
  }
  return best
}

/**
 * Ranking de las 4096 combinaciones de IV para una liga con tope de PC,
 * ordenado por producto de estadísticas.
 */
export function rankIVsForLeague(base, cap, options = {}) {
  const maxLevel = options.maxLevel ?? MAX_LEVEL
  const shadow = options.shadow === true
  const limit = options.limit ?? 0
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
          product: statProduct(base, ivs, level, { shadow }),
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
  return limit ? all.slice(0, limit) : all
}

/**
 * Combinaciones de IV compatibles con un PC y unos PS observados.
 * @param {number[]} levels niveles candidatos (acótalos con el polvo estelar)
 */
export function findIVs(base, cp, hp, levels = levelRange()) {
  const out = []
  for (const level of levels) {
    for (let h = 0; h <= 15; h++) {
      if (calcHP(base, h, level) !== hp) continue
      for (let a = 0; a <= 15; a++) {
        for (let d = 0; d <= 15; d++) {
          if (calcCP(base, { atk: a, def: d, hp: h }, level) !== cp) continue
          out.push({ level, ivs: { atk: a, def: d, hp: h }, percent: ((a + d + h) / 45) * 100 })
        }
      }
    }
  }
  return out
}

/** Polvo estelar necesario para subir medio nivel (índice = nivel entero - 1). */
export const DUST_COST = [
  200, 200, 400, 400, 600, 600, 800, 800, 1000, 1000, 1300, 1300, 1600, 1600, 1900, 1900,
  2200, 2200, 2500, 2500, 3000, 3000, 3500, 3500, 4000, 4000, 4500, 4500, 5000, 5000,
  6000, 6000, 7000, 7000, 8000, 8000, 9000, 9000, 10000, 10000,
  10000, 10000, 10000, 10000, 15000, 15000, 15000, 15000, 15000, 15000,
]

/** Niveles posibles a partir del coste de polvo que muestra el juego. */
export function levelsForDust(dust) {
  const out = []
  DUST_COST.forEach((c, i) => {
    if (c !== dust) return
    out.push(i + 1, i + 1.5)
  })
  return out.filter((l) => l <= MAX_LEVEL)
}
