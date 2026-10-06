/**
 * Formas que se consiguen convirtiendo otra: fusiones (Necrozma con Solgaleo
 * o Lunala, Kyurem con Zekrom o Reshiram) y cambios de forma (Zacian a
 * Espada Suprema, Hoopa a Desatado, Shaymin, Zygarde).
 *
 * Es `formChange` del GAME_MASTER. Va aquí fijo, como el CPM o los climas:
 * son pocos y cambian poco, y el pipeline (build-data) avisa si dejan de
 * coincidir. `gmDesde` y `gmA` son los nombres de forma del GAME_MASTER, para
 * esa comprobación.
 *
 * Cada una: `desde` y `a` (ids del roster), `con` (el compañero de la
 * fusión), lo que cuesta (`energia` y `cantidad`, `caramelos`, `caramelosCon`
 * del compañero, `polvo`, `celulas`) y `vuelta`, lo que cuesta deshacerla
 * ({} es gratis; sin `vuelta`, no se deshace). `soloAsi`: la forma no se
 * atrapa, solo se consigue así (su PC «al atraparlo» no tiene sentido).
 */
export const CONVERSIONES = [
  {
    tipo: 'fusion',
    desde: 'necrozma',
    con: 'solgaleo',
    a: 'necrozma_dusk_mane',
    energia: 'solar',
    cantidad: 1000,
    caramelos: 30,
    caramelosCon: 30,
    vuelta: {},
    soloAsi: true,
    gmDesde: 'NECROZMA_NORMAL',
    gmA: 'NECROZMA_DUSK_MANE'
  },
  {
    tipo: 'fusion',
    desde: 'necrozma',
    con: 'lunala',
    a: 'necrozma_dawn_wings',
    energia: 'lunar',
    cantidad: 1000,
    caramelos: 30,
    caramelosCon: 30,
    vuelta: {},
    soloAsi: true,
    gmDesde: 'NECROZMA_NORMAL',
    gmA: 'NECROZMA_DAWN_WINGS'
  },
  {
    tipo: 'fusion',
    desde: 'kyurem',
    con: 'zekrom',
    a: 'kyurem_black',
    energia: 'voltaje',
    cantidad: 1000,
    caramelos: 30,
    caramelosCon: 30,
    vuelta: {},
    soloAsi: true,
    gmDesde: 'KYUREM_NORMAL',
    gmA: 'KYUREM_BLACK'
  },
  {
    tipo: 'fusion',
    desde: 'kyurem',
    con: 'reshiram',
    a: 'kyurem_white',
    energia: 'llama',
    cantidad: 1000,
    caramelos: 30,
    caramelosCon: 30,
    vuelta: {},
    soloAsi: true,
    gmDesde: 'KYUREM_NORMAL',
    gmA: 'KYUREM_WHITE'
  },
  {
    tipo: 'cambio',
    desde: 'zacian_hero',
    a: 'zacian_crowned_sword',
    energia: 'espadaSuprema',
    cantidad: 1000,
    caramelos: 30,
    vuelta: {},
    soloAsi: true,
    gmDesde: 'ZACIAN_HERO',
    gmA: 'ZACIAN_CROWNED_SWORD'
  },
  {
    tipo: 'cambio',
    desde: 'zamazenta_hero',
    a: 'zamazenta_crowned_shield',
    energia: 'escudoSupremo',
    cantidad: 1000,
    caramelos: 30,
    vuelta: {},
    soloAsi: true,
    gmDesde: 'ZAMAZENTA_HERO',
    gmA: 'ZAMAZENTA_CROWNED_SHIELD'
  },
  {
    tipo: 'cambio',
    desde: 'hoopa',
    a: 'hoopa_unbound',
    caramelos: 50,
    polvo: 10000,
    vuelta: { caramelos: 10, polvo: 2000 },
    gmDesde: 'HOOPA_CONFINED',
    gmA: 'HOOPA_UNBOUND'
  },
  {
    tipo: 'cambio',
    desde: 'shaymin_land',
    a: 'shaymin_sky',
    caramelos: 25,
    polvo: 10000,
    vuelta: { caramelos: 25, polvo: 10000 },
    gmDesde: 'SHAYMIN_LAND',
    gmA: 'SHAYMIN_SKY'
  },
  {
    tipo: 'cambio',
    desde: 'zygarde_10',
    a: 'zygarde',
    celulas: 50,
    vuelta: { caramelos: 10, polvo: 2000 },
    gmDesde: 'ZYGARDE_COMPLETE_TEN_PERCENT',
    gmA: 'ZYGARDE_COMPLETE_FIFTY_PERCENT'
  },
  {
    tipo: 'cambio',
    desde: 'zygarde',
    a: 'zygarde_complete',
    celulas: 200,
    vuelta: { caramelos: 10, polvo: 2000 },
    soloAsi: true,
    gmDesde: 'ZYGARDE_COMPLETE_FIFTY_PERCENT',
    gmA: 'ZYGARDE_COMPLETE'
  }
]

/** Las conversiones en que aparece una forma, como origen o como resultado. */
export const conversionesDe = (id) => CONVERSIONES.filter((c) => c.desde === id || c.a === id)

/** Las de toda la especie: alguna de sus formas es origen o resultado. */
export const conversionesDeEspecie = (ids) =>
  CONVERSIONES.filter((c) => ids.includes(c.desde) || ids.includes(c.a))

/** Si la forma solo se consigue convirtiendo otra, cómo (la conversión). */
export const comoSeConsigue = (id) => CONVERSIONES.find((c) => c.a === id && c.soloAsi) ?? null
