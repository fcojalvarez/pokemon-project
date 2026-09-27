/**
 * Genera los datos estáticos de la app en public/data/.
 *
 *   npm run data          usa la caché de .cache/ si existe
 *   npm run data:fresh    vuelve a descargar todo
 *   npm run data -- --dry-run   todo igual, pero sin guardar nada en Supabase
 *
 * Fuentes:
 *   - PokeMiners/game_masters  -> stats de movimientos en PvE, tabla de tipos, CPM
 *   - PokeMiners/pogo_assets   -> nombres en español
 *   - pvpoke (su repo de GitHub) -> roster jugable + stats de movimientos en PvP
 *   - pvpoke (su repo de GitHub) -> rankings PvP de las tres ligas
 *   - leekduck.com/shiny       -> variocolores liberados, con fecha de estreno
 *
 * Los eventos, incursiones, huevos e investigaciones NO se generan aquí:
 * la app los pide en vivo a ScrapedDuck en cada arranque.
 *
 * Además de escribir los ficheros, sube cada uno a la tabla `game_data` de
 * Supabase, para que la base de datos sea la copia de referencia y no haya que
 * redesplegar para actualizar los datos del juego. Necesita SUPABASE_DB_URL
 * (en .env o en el entorno); sin ella genera los ficheros y avisa de que no
 * ha subido nada.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CPM_BY_LEVEL } from '../src/utils/formulas.js'
import { normalizeText } from '../src/utils/gameText.js'
import { loadEnv } from './lib/env.mjs'
import { maxLiberados } from './lib/maxLiberados.mjs'
import { buildFormas } from './lib/formas.mjs'
import { createRequire } from 'node:module'

// La última lista de variocolores de pogoapi, congelada (ver especiesConVariocolor).
const VARIOCOLORES_POGOAPI = createRequire(import.meta.url)('./datos/variocolores-pogoapi.json')
// Los Dinamax ya liberados hasta la fecha de la semilla (ver scripts/lib/maxLiberados.mjs).
const DINAMAX_LIBERADOS = createRequire(import.meta.url)('./datos/dinamax-liberados.json')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = path.join(ROOT, '.cache')
const OUT = path.join(ROOT, 'public', 'data')
const FRESH = process.argv.includes('--fresh')
/**
 * En CI la subida es el objetivo, no un extra: sin esto, un secreto mal puesto
 * dejaría el workflow en verde sin haber actualizado nada.
 */
const EXIGE_SUBIDA = process.argv.includes('--must-upload')
/**
 * Ensayo: hace la pasada entera contra Supabase, con sus mensajes de lo que
 * cambiaría, pero al final deshace la transacción. Para revisar un cambio en
 * el pipeline antes de dejar que toque la base de datos.
 */
const ENSAYO = process.argv.includes('--dry-run')

/**
 * Qué especies tienen variocolor en el juego.
 *
 * Hasta septiembre de 2026 salía de pogoapi.net, que dejó de actualizarse el
 * 31 de enero de 2026 (Nickit, Applin, Snom, Zacian… no salían aunque ya
 * estaban). Ya no se consulta: su última lista está congelada en
 * scripts/datos/variocolores-pogoapi.json, y sus datos (también `shiny_found`,
 * dónde aparece cada uno) se quedan en la tabla tal cual.
 *
 * Lo nuevo sale de LeekDuck (la misma web de la que ScrapedDuck saca los
 * eventos), que trae la fecha de estreno de cada uno, también de los
 * anunciados: solo cuentan los que ya han salido, así que un estreno
 * anunciado se enciende solo el día que toca. Una especie cuenta si
 * cualquiera de sus formas lo tiene.
 */
function especiesConVariocolor(leekRaw) {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
  const leekDuck = new Set(
    (Array.isArray(leekRaw) ? leekRaw : [])
      .filter((uno) => Number.isInteger(uno?.dex) && /^\d{4}\/\d\d\/\d\d$/.test(uno.released_date ?? '') && uno.released_date <= hoy)
      .map((uno) => uno.dex)
  )
  // Si LeekDuck falla o cambia de formato, se sigue con lo congelado y se avisa
  // en el registro de la Action; nunca se apaga nada por eso.
  if (leekDuck.size < 800) {
    console.warn(`  ⚠ la lista de variocolores de LeekDuck trae ${leekDuck.size} especies: no se usa hoy`)
    leekDuck.clear()
  }
  return new Set([...VARIOCOLORES_POGOAPI.especies, ...leekDuck])
}

/**
 * Pone al día qué variocolores están liberados en la tabla `pokemons`.
 *
 * Dos detalles que importan:
 *
 *   - Solo enciende, nunca apaga. Liberar un variocolor es permanente, así
 *     que si un día la fuente devuelve menos de la cuenta, lo peor que pasa es
 *     que no se entera de los nuevos; lo que no puede pasar es que un fallo de
 *     red borre los 800 que ya había.
 *   - `is_shiny_released` está también copiado dentro del jsonb
 *     `evolution_info`, que es de donde lo lee la cadena evolutiva de la
 *     ficha. Si se toca solo la columna, la estrella no aparece ahí.
 */
async function syncShinyReleases(client, conVariocolor) {
  const { rowCount: nuevos } = await client.query(
    `UPDATE public.pokemons
        SET is_shiny_released = true,
            updated_at = now()
      WHERE pokemon_id = ANY($1::int[])
        AND is_shiny_released IS DISTINCT FROM true`,
    [[...conVariocolor]]
  )

  // Y la copia que vive dentro de evolution_info, que es la que pinta la
  // estrella en la cadena evolutiva.
  const cadenas = await resincronizarCadenas(client, 'is_shiny_released')

  console.log(`  variocolores   ${conVariocolor.size} especies con variocolor; ` +
    `${nuevos} recién liberados, ${cadenas} cadenas evolutivas resincronizadas`)
}

/**
 * Copia un campo de cada Pokémon a los pasos de evolution_info que lo
 * mencionan. La cadena evolutiva guarda su propia copia de algunos campos de
 * la tabla (variocolor, liberado) y, si se toca solo la columna, se queda
 * atrás. `campo` es siempre uno de los nombres fijos de abajo, nunca algo que
 * venga de fuera.
 */
const CAMPOS_COPIADOS = ['is_shiny_released', 'is_released']
async function resincronizarCadenas(client, campo) {
  if (!CAMPOS_COPIADOS.includes(campo)) throw new Error(`campo no permitido: ${campo}`)
  const { rowCount } = await client.query(`
    UPDATE public.pokemons p
       SET evolution_info = (
             SELECT jsonb_object_agg(fam.key, (
                      SELECT jsonb_agg(
                               CASE
                                 WHEN uno ? 'form' THEN uno
                                 WHEN ref.${campo} IS DISTINCT FROM
                                      (uno->>'${campo}')::boolean
                                 THEN jsonb_set(uno, '{${campo}}',
                                                to_jsonb(coalesce(ref.${campo}, false)))
                                 ELSE uno
                               END ORDER BY t.idx)
                        FROM jsonb_array_elements(fam.value) WITH ORDINALITY AS t(uno, idx)
                        LEFT JOIN public.pokemons ref
                               ON ref.pokemon_id = (uno->>'pokemon_id')::int))
               FROM jsonb_each(p.evolution_info) fam),
           updated_at = now()
     WHERE p.evolution_info IS NOT NULL
       AND EXISTS (
             SELECT 1
               FROM jsonb_each(p.evolution_info) fam,
                    jsonb_array_elements(fam.value) uno
               LEFT JOIN public.pokemons ref
                      ON ref.pokemon_id = (uno->>'pokemon_id')::int
              WHERE NOT uno ? 'form'
                AND coalesce(ref.${campo}, false)
                    IS DISTINCT FROM coalesce((uno->>'${campo}')::boolean, false))
  `)
  return rowCount
}

/**
 * Qué Pokémon están liberados en el juego, en la tabla `pokemons`.
 *
 * Igual que el variocolor, `is_released` era un dato estático de cuando se
 * sembró la tabla (src/utils/released.json) y nadie lo tocaba después: Kubfu y
 * Urshifu salían tachados y en gris en la Pokédex aunque ya estaban en el
 * juego, incluso en combates Dinamax. Ahora sale del roster, que viene del
 * GAME_MASTER de pvpoke, en la misma pasada diaria.
 *
 * Solo enciende, nunca apaga: liberar un Pokémon es permanente, así que un
 * fallo de la fuente no puede des-liberar nada. Una especie cuenta como
 * liberada si lo está cualquiera de sus formas.
 */
async function syncReleases(client, roster) {
  const liberados = new Set(roster.filter((p) => p.released && Number.isInteger(p.dex)).map((p) => p.dex))
  if (liberados.size < 700) {
    throw new Error(`el roster trae ${liberados.size} especies liberadas: no me fío`)
  }

  const { rowCount: nuevos } = await client.query(
    `UPDATE public.pokemons
        SET is_released = true,
            updated_at = now()
      WHERE pokemon_id = ANY($1::int[])
        AND is_released IS DISTINCT FROM true`,
    [[...liberados]]
  )
  const cadenas = await resincronizarCadenas(client, 'is_released')

  console.log(`  liberados      ${liberados.size} especies según el roster; ` +
    `${nuevos} recién liberadas, ${cadenas} cadenas evolutivas resincronizadas`)
}

/**
 * Qué Pokémon tienen versión oscura en el juego (`is_shadow_released`).
 *
 * Otro dato estático de la siembra: había 212 marcados sin oscuro que ya lo
 * tenían, y eso decide el filtro «Solo oscuro», el aviso de la ficha y el
 * coste de purificar. Como los demás, solo enciende, nunca apaga.
 */
async function syncShadowReleases(client, roster) {
  const conOscuro = new Set(roster.filter((p) => p.shadow && p.released && Number.isInteger(p.dex)).map((p) => p.dex))
  if (conOscuro.size < 300) {
    throw new Error(`el roster trae ${conOscuro.size} especies con versión oscura: no me fío`)
  }
  const { rowCount } = await client.query(
    `UPDATE public.pokemons
        SET is_shadow_released = true,
            updated_at = now()
      WHERE pokemon_id = ANY($1::int[])
        AND is_shadow_released IS DISTINCT FROM true`,
    [[...conOscuro]]
  )
  console.log(`  oscuros        ${conOscuro.size} especies según el roster; ${rowCount} recién marcadas`)
}

const GENERACIONES = [151, 251, 386, 493, 649, 721, 809, 905, 1025]
const generacionDe = (dex) => GENERACIONES.findIndex((tope) => dex <= tope) + 1 || GENERACIONES.length
// El roster da el coste del segundo ataque en polvo; los caramelos van a la par.
const CARAMELOS_POR_POLVO = { 10000: 25, 50000: 50, 75000: 75, 100000: 100 }

/**
 * Da de alta en `pokemons` las especies que el juego ya tiene y la tabla no.
 *
 * La tabla se sembró una vez y acababa en Ogerpon (#1017): Archaludon,
 * Hydrapple, las paradojas nuevas, Terapagos y Pecharunt no salían en la
 * Pokédex, aunque Hydrapple ya está liberado. Las filas nuevas llevan el mismo
 * formato que las demás, con lo que trae el roster; la ficha lee de todas
 * formas ataques y estadísticas del roster. Solo inserta, nunca pisa una fila
 * que ya exista.
 */
async function addMissingSpecies(client, roster) {
  const { rows } = await client.query('SELECT pokemon_id FROM public.pokemons')
  const existentes = new Set(rows.map((r) => r.pokemon_id))
  const base = new Map()
  for (const p of roster) {
    if (!Number.isInteger(p.dex) || p.mega || p.shadow || p.regional) continue
    if (!base.has(p.dex)) base.set(p.dex, p)
  }
  const conOscuro = new Set(roster.filter((p) => p.shadow && p.released).map((p) => p.dex))
  const nuevas = [...base.values()].filter((p) => !existentes.has(p.dex)).map((p) => {
    const elite = new Set(p.eliteMoves ?? [])
    const sprite = (shiny) =>
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${shiny ? 'shiny/' : ''}${p.dex}.png`
    return {
      pokemon_id: p.dex,
      name: p.name,
      sprites: { male: sprite(false), male_shiny: sprite(true) },
      is_shiny_released: p.shinyReleased === true,
      is_released: p.released === true,
      is_raid_exclusive: false,
      is_possible_ditto: false,
      stats: { base_attack: p.stats?.atk ?? 0, base_defense: p.stats?.def ?? 0, base_stamina: p.stats?.hp ?? 0 },
      moves: {
        fast: p.fast.filter((m) => !elite.has(m)),
        charged: p.charged.filter((m) => !elite.has(m)),
        elite_fast: p.fast.filter((m) => elite.has(m)),
        elite_charged: p.charged.filter((m) => elite.has(m))
      },
      buddy: { candy_rewards: 1, mega_distance: 0, candy_distance: p.buddyDistance ?? 0 },
      pokemon_encounter_data: {},
      types: p.types,
      rarity: p.mythical ? 'mythic' : p.legendary ? 'legendary' : 'standard',
      generation: generacionDe(p.dex),
      is_shadow_released: conOscuro.has(p.dex),
      shadow_info: null,
      third_move: { candy_required: CARAMELOS_POR_POLVO[p.thirdMoveCost] ?? 0, startdust_required: p.thirdMoveCost ?? 0 },
      // Los singulares no se pueden intercambiar; el resto, como casi todos.
      is_tradeable: !p.mythical,
      is_transferable: true,
      is_pvp_exclusive: false,
      evolution_info: {}
    }
  })
  if (!nuevas.length) {
    console.log('  especies       ninguna nueva')
    return
  }
  const { rowCount } = await client.query(
    // `id` no tiene valor por defecto: las filas de la siembra van seguidas
    // (10098 + número de Pokédex), así que las nuevas siguen detrás de la última.
    `INSERT INTO public.pokemons (
        id, pokemon_id, name, sprites, is_shiny_released, is_released, is_raid_exclusive,
        is_possible_ditto, forms, stats, moves, buddy, pokemon_encounter_data, types,
        rarity, generation, is_shadow_released, shadow_info, third_move, is_tradeable,
        is_transferable, is_pvp_exclusive, evolution_info)
     SELECT (SELECT max(id) FROM public.pokemons) + row_number() OVER (ORDER BY n.pokemon_id),
            n.pokemon_id, n.name, n.sprites, n.is_shiny_released, n.is_released, n.is_raid_exclusive,
            n.is_possible_ditto, '{}'::jsonb[], n.stats, n.moves, n.buddy, n.pokemon_encounter_data, n.types,
            n.rarity, n.generation, n.is_shadow_released, n.shadow_info, n.third_move, n.is_tradeable,
            n.is_transferable, n.is_pvp_exclusive, n.evolution_info
       FROM jsonb_to_recordset($1::jsonb) AS n(
              pokemon_id int, name text, sprites jsonb, is_shiny_released boolean, is_released boolean,
              is_raid_exclusive boolean, is_possible_ditto boolean, stats jsonb, moves jsonb,
              buddy jsonb, pokemon_encounter_data jsonb, types jsonb, rarity text, generation int,
              is_shadow_released boolean, shadow_info jsonb, third_move jsonb, is_tradeable boolean,
              is_transferable boolean, is_pvp_exclusive boolean, evolution_info jsonb)
      WHERE NOT EXISTS (SELECT 1 FROM public.pokemons p WHERE p.pokemon_id = n.pokemon_id)`,
    [JSON.stringify(nuevas)]
  )
  console.log(`  especies       ${rowCount} nuevas: ${nuevas.map((n) => `#${n.pokemon_id} ${n.name}`).join(', ')}`)
}

const RAMAS = ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary', 'senary', 'septenary', 'octonary', 'nonary', 'denary']

// Objetos y cebos del GAME_MASTER con el nombre que usa la tabla (y la ficha
// para el icono y la traducción, en evolutions.items y evolutions.lure).
const OBJETOS_DE_EVOLUCION = {
  ITEM_SUN_STONE: 'Sun Stone',
  ITEM_KINGS_ROCK: "King's Rock",
  ITEM_METAL_COAT: 'Metal Coat',
  ITEM_DRAGON_SCALE: 'Dragon Scale',
  ITEM_UP_GRADE: 'Upgrade',
  ITEM_GEN4_EVOLUTION_STONE: 'Sinnoh Stone',
  ITEM_GEN5_EVOLUTION_STONE: 'Unova Stone',
  ITEM_OTHER_EVOLUTION_STONE_MAPLE_A: 'Sweet Apple',
  ITEM_OTHER_EVOLUTION_STONE_MAPLE_B: 'Tart Apple',
  ITEM_OTHER_EVOLUTION_STONE_MAPLE_C: 'Syrupy Apple',
  ITEM_OTHER_EVOLUTION_STONE_A: 'Gimmighoul Coin',
}
const CEBOS_DE_EVOLUCION = {
  ITEM_TROY_DISK_MAGNETIC: 'magneticLureModule',
  ITEM_TROY_DISK_MOSSY: 'mossyLureModule',
  ITEM_TROY_DISK_GLACIAL: 'glacialLureModule',
  ITEM_TROY_DISK_RAINY: 'rainyLureModule',
}

/**
 * Cada requisito de la tabla y cómo se lee de una rama del GAME_MASTER.
 * `undefined` = el GAME_MASTER lo trae en un formato que no sabemos pintar:
 * entonces se deja lo que haya.
 */
const REQUISITOS_DEL_JUEGO = {
  candy_required: (b) => b.candyCost ?? null,
  item_required: (b) => (b.evolutionItemRequirement ? OBJETOS_DE_EVOLUCION[b.evolutionItemRequirement] : null),
  item_cost: (b) => (b.evolutionItemRequirementCost > 1 ? b.evolutionItemRequirementCost : null),
  lure_required: (b) => (b.lureItemRequirement ? CEBOS_DE_EVOLUCION[b.lureItemRequirement] : null),
  // Los km salen también de las misiones de caminar (Milotic, Sudowoodo…).
  buddy_distance_required: (b) => b.kmBuddyDistanceRequirement ?? b._mision?.km ?? null,
  // El resto de misiones, con el texto del juego en los dos idiomas: «Consigue
  // 70 corazones con tu compañero» para Sylveon.
  quest_required: (b) => b._mision?.texto ?? null,
  must_be_buddy_to_evolve: (b) => b.mustBeBuddy === true || null,
  only_evolves_in_daytime: (b) => b.onlyDaytime === true || null,
  only_evolves_in_nighttime: (b) => b.onlyNighttime === true || null,
  only_evolves_in_full_moon: (b) => b.onlyFullMoon === true || null,
  gender_required: (b) => ({ MALE: 'Male', FEMALE: 'Female' })[b.genderRequirement] ?? null,
  no_candy_cost_if_traded: (b) => b.noCandyCostViaTrade === true || null,
  upside_down: (b) => b.onlyUpsideDown === true || null,
}
const FORMAS_REGIONALES = /_(ALOLA|GALARIAN|HISUIAN|PALDEA)/

const sinVacios = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null))
// JSON con las claves ordenadas: Postgres guarda las de un jsonb en su propio
// orden y, comparando el texto tal cual, las misiones ({es, en}) salían
// distintas en cada pasada aunque no hubieran cambiado.
const canonico = (valor) => JSON.stringify(valor, (_, v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v)
const conRepetidos = (rama) => new Set(rama.map((paso) => paso.pokemon_id)).size !== rama.length

/**
 * Los requisitos de cada evolución según el GAME_MASTER, por `${dex}>${dexDestino}`.
 *
 * Una misma evolución puede venir en varias ramas (una por forma: Pyroar macho
 * y hembra, Sinistcha falsificado y genuino). Un requisito solo se da por bueno
 * si todas coinciden; si no, esa evolución no lo lleva en la tabla, que no
 * distingue formas. Las regionales van aparte (Meowth de Galar → Perrserker)
 * porque sus cadenas no son las de la especie.
 */
/**
 * Las misiones de evolución (Sylveon, Kingambit, Annihilape…), ya redactadas.
 * El GAME_MASTER da el tipo, el objetivo y la clave del texto en el juego;
 * aquí se sustituye el {0} por el objetivo en español y en inglés. Las de
 * caminar con el compañero se devuelven como km, que ya tienen su icono.
 */
function misionesDeEvolucion(gm, es, en) {
  const misiones = new Map()
  for (const t of gm) {
    const q = t.data?.evolutionQuestTemplate
    if (!q) continue
    const objetivo = q.goals?.[0]?.target ?? 1
    if (q.questType === 'QUEST_BUDDY_EVOLUTION_WALK') {
      misiones.set(t.templateId, { km: objetivo })
      continue
    }
    let clave = q.display?.description ?? ''
    // El juego usa a veces la clave en singular con un objetivo mayor
    // (Sylveon: «Consigue un corazón» y pide 70).
    if (objetivo > 1) clave = clave.replace(/_SINGLE$/, '_PLURAL').replace(/_singular$/, '_plural')
    const texto = (mapa) => (mapa.get(clave) ?? mapa.get(clave.toLowerCase()))?.replace('{0}', objetivo)
    if (texto(es) && texto(en)) misiones.set(t.templateId, { texto: { es: texto(es), en: texto(en) } })
  }
  return misiones
}

function requisitosDelJuego(gm, misiones = new Map()) {
  const dexDe = new Map()
  for (const t of gm) {
    const m = /^V(\d{4})_POKEMON_/.exec(t.templateId)
    const s = t.data?.pokemonSettings
    if (m && s?.pokemonId && !dexDe.has(s.pokemonId)) dexDe.set(s.pokemonId, Number(m[1]))
  }
  const ramas = new Map()
  for (const t of gm) {
    const s = t.data?.pokemonSettings
    const dex = dexDe.get(s?.pokemonId)
    if (!dex || !s.evolutionBranch || FORMAS_REGIONALES.test(t.templateId)) continue
    for (const b of s.evolutionBranch) {
      const destino = dexDe.get(b.evolution)
      if (!destino || destino === dex || b.temporaryEvolution) continue
      const clave = `${dex}>${destino}`
      if (!ramas.has(clave)) ramas.set(clave, [])
      const mision = misiones.get(b.questDisplay?.[0]?.questRequirementTemplateId)
      ramas.get(clave).push(mision ? { ...b, _mision: mision } : b)
    }
  }
  const requisitos = new Map()
  const dudosos = []
  for (const [clave, lista] of ramas) {
    const req = {}
    for (const [campo, leer] of Object.entries(REQUISITOS_DEL_JUEGO)) {
      const valores = new Set(lista.map((b) => JSON.stringify(leer(b) ?? null)))
      if (valores.size === 1) req[campo] = JSON.parse([...valores][0])
      else dudosos.push(`${clave} ${campo}`)
    }
    // Un objeto que no sabemos pintar: mejor no tocar ni el objeto ni su número.
    if (lista.some((b) => b.evolutionItemRequirement && !OBJETOS_DE_EVOLUCION[b.evolutionItemRequirement])) {
      delete req.item_required
      delete req.item_cost
    }
    if (lista.some((b) => b.lureItemRequirement && !CEBOS_DE_EVOLUCION[b.lureItemRequirement])) delete req.lure_required
    requisitos.set(clave, req)
  }
  return { requisitos, dudosos }
}

/**
 * Todas las líneas evolutivas del roster, de la raíz a cada forma final, en
 * números de Pokédex. Solo cuentan las evoluciones que el GAME_MASTER también
 * tiene (`existe`): pvpoke apunta alguna que en GO no se hace evolucionando,
 * como Scyther → Kleavor.
 */
function caminosDelRoster(roster, existe) {
  const base = roster.filter((p) => Number.isInteger(p.dex) && !p.mega && !p.shadow && !p.regional)
  const dexDe = new Map(base.map((p) => [p.id, p.dex]))
  const sale = new Map()
  const entra = new Set()
  for (const p of base) {
    for (const id of p.evolutions ?? []) {
      const d = dexDe.get(id)
      if (!d || d === p.dex || !existe(p.dex, d)) continue
      if (!sale.has(p.dex)) sale.set(p.dex, new Set())
      sale.get(p.dex).add(d)
      entra.add(d)
    }
  }
  const caminos = []
  const andar = (camino) => {
    const siguientes = [...(sale.get(camino.at(-1)) ?? [])].filter((d) => !camino.includes(d)).sort((a, b) => a - b)
    if (!siguientes.length) return caminos.push(camino)
    for (const d of siguientes) andar([...camino, d])
  }
  for (const dex of [...sale.keys()].filter((d) => !entra.has(d)).sort((a, b) => a - b)) andar([dex])
  return caminos
}

/**
 * Mantiene al día las cadenas evolutivas de `pokemons` (`evolution_info`).
 *
 * Venían de la siembra y nadie las tocaba: a Dipplin le faltaba Hydrapple, a
 * Duraludon Archaludon, a las especies nuevas todo; casi toda la Gen 9 salía
 * sin caramelos, Applin y Kubfu pedían el doble, Frosmoth no decía que es de
 * noche y el paso de Crocalor se llamaba «Fuecoco». Cada Pokémon guarda la
 * familia entera, una rama por línea de la raíz a la forma final.
 *
 * - Enlaces, del roster. Solo añade: alarga ramas cortas y crea las que
 *   faltan, sin quitar ninguna. Se rehacen solo las rotas (un Pokémon
 *   repetido: Jangmo-o traía a Hakamo-o dos veces). Si la raíz de la tabla y
 *   la del roster no coinciden no se toca nada: el roster trae alguna al
 *   revés (Sinistcha «evoluciona» en Poltchageist).
 * - Requisitos, del GAME_MASTER, que manda en todo lo que define. Lo que no
 *   sabe decir (una rama por forma con costes distintos, un objeto sin
 *   traducción) se deja como esté.
 * - Nombre y tipos de cada paso, de la fila de ese Pokémon, que ya lleva el
 *   nombre oficial. Había pasos con el de otra especie (Crocalor «Fuecoco»).
 */
async function syncEvolutionChains(client, roster, gm, es, en) {
  const { rows } = await client.query(
    'SELECT pokemon_id, name, types, sprites, is_released, is_shiny_released, evolution_info FROM public.pokemons')
  const fila = new Map(rows.map((r) => [r.pokemon_id, r]))
  const { requisitos, dudosos } = requisitosDelJuego(gm, misionesDeEvolucion(gm, i18nMap(es), i18nMap(en)))

  const familia = new Map()
  for (const camino of caminosDelRoster(roster, (a, b) => requisitos.has(`${a}>${b}`)).filter((c) => c.every((d) => fila.has(d)))) {
    if (!familia.has(camino[0])) familia.set(camino[0], [])
    familia.get(camino[0]).push(camino)
  }
  const familiaDe = new Map()
  for (const lista of familia.values()) for (const d of new Set(lista.flat())) familiaDe.set(d, lista)

  // Los pasos que ya hay en alguna fila, por evolución: traen lo que el
  // GAME_MASTER no dice en este formato (la prioridad de Eevee, por ejemplo).
  // Primero las filas de las raíces, que suelen ser las completas.
  const esRaiz = (r) => familiaDe.get(r.pokemon_id)?.[0][0] === r.pokemon_id
  const conocidos = new Map()
  for (const r of [...rows].sort((a, b) => esRaiz(b) - esRaiz(a))) {
    for (const rama of Object.values(r.evolution_info ?? {})) {
      if (!Array.isArray(rama) || conRepetidos(rama)) continue
      rama.forEach((paso, i) => {
        const clave = `${paso.pokemon_id}>${rama[i + 1]?.pokemon_id}`
        if (rama[i + 1] && !conocidos.has(clave)) conocidos.set(clave, paso)
      })
    }
  }

  // El nombre, el de la fila, que syncFichaDesdeJuego ya ha dejado con el
  // oficial del juego (Nidoran♀, Mr. Mime, Jangmo-o).
  const nombreDe = (dex) => fila.get(dex).name.trim()

  const pasoNuevo = (dex) => {
    const f = fila.get(dex)
    return { name: nombreDe(dex), types: f.types, sprites: f.sprites, pokemon_id: dex,
      is_released: Boolean(f.is_released), is_shiny_released: Boolean(f.is_shiny_released) }
  }
  // El paso con lo que diga el juego encima. `siguiente` es a quién evoluciona.
  const alDia = (paso, siguiente) => {
    // Los pasos de una forma regional los lleva syncCadenasRegionales: con los
    // datos de la fila se les pondría el nombre y los tipos de la de Kanto.
    if (paso.form) return paso
    const f = fila.get(paso.pokemon_id)
    const out = { ...paso }
    if (f) {
      out.name = nombreDe(paso.pokemon_id)
      out.types = f.types
    }
    const req = siguiente == null ? null : requisitos.get(`${paso.pokemon_id}>${siguiente}`)
    if (req) {
      for (const [campo, valor] of Object.entries(req)) {
        if (valor == null) delete out[campo]
        else out[campo] = valor
      }
    }
    if (siguiente == null) for (const campo of Object.keys(REQUISITOS_DEL_JUEGO)) delete out[campo]
    return out
  }
  const ids = (rama) => rama.map((paso) => paso.pokemon_id).join('>')

  const cambios = []
  const saltadas = []
  let enlaces = 0
  for (const r of rows) {
    const original = r.evolution_info && typeof r.evolution_info === 'object' ? r.evolution_info : {}
    const info = { ...original }
    for (const [k, rama] of Object.entries(info)) if (Array.isArray(rama) && conRepetidos(rama)) delete info[k]

    const caminos = familiaDe.get(r.pokemon_id)
    const existentes = Object.entries(info).filter(([, rama]) => Array.isArray(rama) && rama.length)
    if (caminos && existentes.some(([, rama]) => rama[0].pokemon_id !== caminos[0][0])) {
      saltadas.push(`#${r.pokemon_id} ${r.name}`)
    } else if (caminos) {
      for (const camino of caminos) {
        const clave = camino.join('>')
        if (existentes.some(([, rama]) => ids(rama) === clave || ids(rama).startsWith(clave + '>'))) continue
        const pasos = camino.map((dex, i) => {
          const siguiente = camino[i + 1]
          if (siguiente == null) return pasoNuevo(dex)
          const hasta = camino.slice(0, i + 2).join('>')
          const igual = existentes.find(([, rama]) => rama.length > i + 1 && ids(rama.slice(0, i + 2)) === hasta)
          const previo = igual?.[1][i] ?? conocidos.get(`${dex}>${siguiente}`)
          return previo ? sinVacios(previo) : pasoNuevo(dex)
        })
        const corta = existentes.find(([, rama]) => clave.startsWith(ids(rama) + '>'))
        const k = corta ? corta[0] : RAMAS.find((x) => !(x in info))
        if (!k) break
        info[k] = pasos
        if (corta) existentes.splice(existentes.indexOf(corta), 1, [k, pasos])
        else existentes.push([k, pasos])
        enlaces++
      }
    }

    for (const [k, rama] of Object.entries(info)) {
      if (Array.isArray(rama)) info[k] = rama.map((paso, i) => alDia(paso, rama[i + 1]?.pokemon_id))
    }
    if (canonico(info) !== canonico(original)) cambios.push([r.pokemon_id, JSON.stringify(info)])
  }

  for (const [id, info] of cambios) {
    await client.query(
      'UPDATE public.pokemons SET evolution_info = $2::jsonb, updated_at = now() WHERE pokemon_id = $1', [id, info])
  }
  console.log(`  evoluciones    ${cambios.length} cadenas al día (${enlaces} ramas nuevas o alargadas)` +
    (saltadas.length ? `; no cuadran con el roster y se dejan: ${saltadas.join(', ')}` : ''))
  if (dudosos.length) console.log(`                 requisitos distintos según la forma, sin tocar: ${dudosos.join(', ')}`)
}

/**
 * Lo que la ficha lee de `pokemons` y el GAME_MASTER sabe: nombre, estadísticas,
 * coste del segundo ataque, compañero, purificación y si se puede intercambiar
 * o transferir.
 *
 * Todo esto se sembró una vez en 2023 (src/utils/PokemonDDBB.js) y no se volvió
 * a tocar: las especies más nuevas tenían las estadísticas a 0, el polvo del
 * segundo ataque a 0, las que estrenaron oscuro después no tenían coste de
 * purificar, la energía mega al caminar salía en Pokémon sin mega, y los
 * nombres venían del identificador interno («Nidoran female», «Mr mime»,
 * «Wirdeer»), que además no casaban con los de LeekDuck en «Dónde encontrarlo».
 *
 * Se lee la plantilla base de cada especie (V0003_POKEMON_VENUSAUR, sin forma)
 * y se escribe solo lo que el juego define, mezclado con lo que ya hay en cada
 * jsonb, así que un campo que el GAME_MASTER no trae se queda como estaba.
 */
async function syncFichaDesdeJuego(client, gm, en) {
  const nombres = i18nMap(en)
  const porDex = new Map()
  for (const t of gm) {
    const m = /^V(\d{4})_POKEMON_([A-Z0-9_]+)$/.exec(t.templateId)
    const s = t.data?.pokemonSettings
    // La plantilla base: sin `form`, o la primera si todas tienen (Unown).
    if (!m || !s || (s.form && porDex.has(Number(m[1])))) continue
    if (porDex.has(Number(m[1])) && porDex.get(Number(m[1])).form == null) continue
    porDex.set(Number(m[1]), s)
  }

  // Qué especies megaevolucionan: las que tienen `tempEvoOverrides` en alguna
  // plantilla. `buddyWalkedMegaEnergyAward` no sirve para esto: lo lleva
  // Bulbasaur y no Charizard, Mewtwo ni Gardevoir.
  const conMega = new Set()
  for (const t of gm) {
    const m = /^V(\d{4})_POKEMON_/.exec(t.templateId)
    if (m && t.data?.pokemonSettings?.tempEvoOverrides?.length) conMega.add(Number(m[1]))
  }

  const filas = []
  for (const [dex, s] of porDex) {
    const nombre = nombres.get(`pokemon_name_${String(dex).padStart(4, '0')}`)
    const fila = { pokemon_id: dex }
    if (nombre) fila.name = nombre
    if (s.stats?.baseAttack) {
      fila.stats = { base_attack: s.stats.baseAttack, base_defense: s.stats.baseDefense, base_stamina: s.stats.baseStamina }
    }
    if (s.thirdMove) {
      fila.third_move = { candy_required: s.thirdMove.candyToUnlock ?? 0, startdust_required: s.thirdMove.stardustToUnlock ?? 0 }
    }
    if (s.kmBuddyDistance) {
      // La energía mega al caminar solo la dan los que megaevolucionan, cada
      // tantos km como los caramelos. La siembra la ponía en todos.
      fila.buddy = { candy_distance: s.kmBuddyDistance, mega_distance: conMega.has(dex) ? s.kmBuddyDistance : null }
    }
    if (s.shadow?.purificationCandyNeeded) {
      fila.shadow_info = {
        candy_required_purification: s.shadow.purificationCandyNeeded,
        stardust_required_purification: s.shadow.purificationStardustNeeded ?? null,
      }
    }
    if (typeof s.isTradable === 'boolean') fila.is_tradeable = s.isTradable
    if (typeof s.isTransferable === 'boolean') fila.is_transferable = s.isTransferable
    // La rareza del filtro de la Pokédex, de la clase del juego. La siembra
    // dejaba como «normales» a los Ultraentes, Type: Null, los tesoros
    // funestos o los paradoja legendarios de Paldea.
    fila.rarity = { POKEMON_CLASS_MYTHIC: 'mythic', POKEMON_CLASS_LEGENDARY: 'legendary', POKEMON_CLASS_ULTRA_BEAST: 'ultra_beast' }[s.pokemonClass] ?? 'standard'
    filas.push(fila)
  }
  if (filas.length < 1000) throw new Error(`el GAME_MASTER trae ${filas.length} especies: no me fío`)

  const { rowCount } = await client.query(
    `WITH juego AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb) AS j(
         pokemon_id int, name text, stats jsonb, third_move jsonb, buddy jsonb,
         shadow_info jsonb, is_tradeable boolean, is_transferable boolean, rarity text)
     ), nuevo AS (
       SELECT p.pokemon_id,
              coalesce(j.name, p.name) AS name,
              CASE WHEN j.stats IS NULL THEN p.stats ELSE coalesce(p.stats, '{}') || j.stats END AS stats,
              CASE WHEN j.third_move IS NULL THEN p.third_move ELSE coalesce(p.third_move, '{}') || j.third_move END AS third_move,
              CASE WHEN j.buddy IS NULL THEN p.buddy ELSE coalesce(p.buddy, '{}') || j.buddy END AS buddy,
              CASE WHEN j.shadow_info IS NULL THEN p.shadow_info ELSE coalesce(p.shadow_info, '{}') || j.shadow_info END AS shadow_info,
              coalesce(j.is_tradeable, p.is_tradeable) AS is_tradeable,
              coalesce(j.is_transferable, p.is_transferable) AS is_transferable,
              coalesce(j.rarity, p.rarity) AS rarity
         FROM public.pokemons p JOIN juego j USING (pokemon_id)
     )
     UPDATE public.pokemons p
        SET name = n.name, stats = n.stats, third_move = n.third_move, buddy = n.buddy,
            shadow_info = n.shadow_info, is_tradeable = n.is_tradeable,
            is_transferable = n.is_transferable, rarity = n.rarity, updated_at = now()
       FROM nuevo n
      WHERE p.pokemon_id = n.pokemon_id
        AND (p.name, p.stats, p.third_move, p.buddy, p.shadow_info, p.is_tradeable, p.is_transferable, p.rarity)
            IS DISTINCT FROM
            (n.name, n.stats, n.third_move, n.buddy, n.shadow_info, n.is_tradeable, n.is_transferable, n.rarity)`,
    [JSON.stringify(filas)]
  )
  console.log(`  ficha          ${filas.length} especies en el GAME_MASTER; ${rowCount} filas al día ` +
    '(nombre, estadísticas, segundo ataque, compañero, purificación, intercambio, rareza)')
}

// Cómo se nombra cada región delante (inglés) y detrás (español), y el sufijo
// de los ids del roster (meowth_galarian, wooper_paldean).
const REGIONES = {
  ALOLA: { en: 'Alolan', es: 'de Alola', id: 'alolan' },
  GALARIAN: { en: 'Galarian', es: 'de Galar', id: 'galarian' },
  HISUIAN: { en: 'Hisuian', es: 'de Hisui', id: 'hisuian' },
  PALDEA: { en: 'Paldean', es: 'de Paldea', id: 'paldean' },
}

/**
 * Las cadenas de las especies que solo salen de una forma regional:
 * Perrserker (de Meowth de Galar), Obstagoon (de Zigzagoon y Linoone de
 * Galar), Clodsire (de Wooper de Paldea), Sneasler, Overqwil, Sirfetch'd,
 * Mr. Rime, Cursola y Runerigus. Venían vacías: la tabla va por número de
 * Pokédex y no sabe de formas, y la cadena de Meowth es la de Kanto.
 *
 * Se montan con el GAME_MASTER: los pasos regionales llevan `form` (el id del
 * roster, para enlazar a esa forma), su nombre en los dos idiomas, sus tipos
 * y su sprite, y los requisitos de la rama (caramelos, misión…). Los demás
 * sincronizadores respetan los pasos con `form`, que si no los pisarían con
 * los datos de la especie de Kanto.
 *
 * Solo escribe en filas con la cadena vacía o montada aquí antes (todas sus
 * ramas empiezan por un paso regional); cualquier otra se deja y se avisa.
 */
async function syncCadenasRegionales(client, roster, gm, es, en) {
  const misiones = misionesDeEvolucion(gm, i18nMap(es), i18nMap(en))
  const dexDe = new Map()
  for (const t of gm) {
    const m = /^V(\d{4})_POKEMON_/.exec(t.templateId)
    const s = t.data?.pokemonSettings
    if (m && s?.pokemonId && !dexDe.has(s.pokemonId)) dexDe.set(s.pokemonId, Number(m[1]))
  }

  // Cada forma regional con sus ramas: LINOONE_GALARIAN → { dex, región… }.
  const formas = new Map()
  for (const t of gm) {
    const m = /^V(\d{4})_POKEMON_(.+)_(ALOLA|GALARIAN|HISUIAN|PALDEA)$/.exec(t.templateId)
    const s = t.data?.pokemonSettings
    if (!m || !s) continue
    formas.set(`${m[2]}_${m[3]}`, { dex: Number(m[1]), base: m[2], region: m[3], ramas: s.evolutionBranch ?? [] })
  }
  const esRegional = (form) => /_(ALOLA|GALARIAN|HISUIAN|PALDEA)(_|$)/.test(form ?? '')

  // Las especies exclusivas y de qué forma salen.
  const exclusivas = []
  for (const [clave, forma] of formas) {
    for (const rama of forma.ramas) {
      if (rama.temporaryEvolution || esRegional(rama.form)) continue
      const destino = dexDe.get(rama.evolution)
      if (destino && destino !== forma.dex) exclusivas.push({ destino, desde: clave, rama })
    }
  }
  // Hacia atrás: la forma regional que evoluciona en esta (Zigzagoon → Linoone de Galar).
  const previa = (clave) => {
    for (const [otra, forma] of formas) {
      const rama = forma.ramas.find((r) => r.form === clave)
      if (rama) return { clave: otra, rama }
    }
    return null
  }

  // Todas las formas, no solo la última: Obstagoon viene de Linoone y este de Zigzagoon.
  const dexes = [...new Set([...exclusivas.map((e) => e.destino), ...[...formas.values()].map((f) => f.dex)])]
  const { rows } = await client.query(
    `SELECT pokemon_id, name, types, sprites, is_released, is_shiny_released, evolution_info
       FROM public.pokemons WHERE pokemon_id = ANY($1::int[])`, [dexes])
  const fila = new Map(rows.map((r) => [r.pokemon_id, r]))
  const rosterPorId = new Map(roster.map((p) => [p.id, p]))
  const requisitosDe = (rama) => {
    const mision = misiones.get(rama.questDisplay?.[0]?.questRequirementTemplateId)
    const b = mision ? { ...rama, _mision: mision } : rama
    return sinVacios(Object.fromEntries(Object.entries(REQUISITOS_DEL_JUEGO).map(([campo, leer]) => [campo, leer(b)])))
  }
  const sprite = (id, shiny) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${shiny ? 'shiny/' : ''}${id}.png`
  const pasoRegional = (clave, rama) => {
    const forma = formas.get(clave)
    const region = REGIONES[forma.region]
    const base = fila.get(forma.dex)
    const p = rosterPorId.get(`${forma.base.toLowerCase()}_${region.id}`)
    if (!base || !p) return null
    return {
      name: `${region.en} ${base.name.trim()}`,
      nameEs: `${base.name.trim()} ${region.es}`,
      types: p.types,
      sprites: { male: sprite(p.spriteId, false), male_shiny: sprite(p.spriteId, true) },
      pokemon_id: forma.dex,
      form: p.id,
      is_released: p.released === true,
      // El variocolor del roster es por especie, no por forma: mejor no decir nada.
      is_shiny_released: false,
      ...requisitosDe(rama),
    }
  }

  const cadenas = new Map()
  for (const { destino, desde, rama } of exclusivas) {
    const final = fila.get(destino)
    if (!final) continue
    const pasos = [{
      name: final.name.trim(), types: final.types, sprites: final.sprites, pokemon_id: destino,
      is_released: Boolean(final.is_released), is_shiny_released: Boolean(final.is_shiny_released),
    }]
    let actual = { clave: desde, rama }
    while (actual) {
      const paso = pasoRegional(actual.clave, actual.rama)
      if (!paso) break
      pasos.unshift(paso)
      actual = previa(actual.clave)
    }
    if (pasos.length < 2) continue
    if (!cadenas.has(destino)) cadenas.set(destino, [])
    cadenas.get(destino).push(pasos)
  }

  let escritas = 0
  const saltadas = []
  for (const [destino, ramas] of cadenas) {
    const actual = fila.get(destino).evolution_info ?? {}
    const existentes = Object.values(actual).filter((r) => Array.isArray(r) && r.length)
    if (existentes.some((r) => !r[0].form)) {
      saltadas.push(`#${destino} ${fila.get(destino).name}`)
      continue
    }
    const info = Object.fromEntries(ramas.map((r, i) => [RAMAS[i], r]))
    if (canonico(info) === canonico(actual)) continue
    await client.query(
      'UPDATE public.pokemons SET evolution_info = $2::jsonb, updated_at = now() WHERE pokemon_id = $1',
      [destino, JSON.stringify(info)])
    escritas++
  }
  console.log(`  regionales     ${cadenas.size} especies que salen de una forma regional; ${escritas} cadenas al día` +
    (saltadas.length ? `; con otra cadena, sin tocar: ${saltadas.join(', ')}` : ''))
}

async function updatePokemonsTable(client, roster) {
  const dinamax = new Set()
  const gigamax = new Set()
  for (const p of roster) {
    if (/_(mega|mega_x|mega_y|primal|shadow)$/.test(p.id)) continue
    if (p.dynamax) dinamax.add(p.dex)
    if (p.gigantamax) gigamax.add(p.dex)
  }

  const { rowCount } = await client.query(
    `UPDATE public.pokemons
        SET can_dynamax = (pokemon_id = ANY($1::int[])),
            can_gigantamax = (pokemon_id = ANY($2::int[])),
            updated_at = now()
      WHERE can_dynamax IS DISTINCT FROM (pokemon_id = ANY($1::int[]))
         OR can_gigantamax IS DISTINCT FROM (pokemon_id = ANY($2::int[]))`,
    [[...dinamax], [...gigamax]]
  )
  console.log(`  pokemons       ${rowCount} filas tocadas (${dinamax.size} Dinamax, ${gigamax.size} Gigamax)`)
}

async function uploadToSupabase(data, roster, conVariocolor, gm, en, es) {
  const url = process.env.SUPABASE_DB_URL
  if (!url) {
    if (EXIGE_SUBIDA) {
      throw new Error('falta SUPABASE_DB_URL y se ha lanzado con --must-upload')
    }
    console.log('\nSUPABASE_DB_URL sin definir: los ficheros se han escrito, pero no se sube nada.')
    return
  }

  const { default: pg } = await import('pg')
  // El pooler de Supabase va por TLS con un certificado que Node no valida
  // contra su almacén; la conexión sigue cifrada.
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })

  console.log('\nSubiendo a Supabase (game_data)')
  await client.connect()
  try {
    await client.query('BEGIN')
    for (const [file, content] of Object.entries(data)) {
      const name = file.replace(/\.json$/, '')
      const json = JSON.stringify(content)
      await client.query(
        `INSERT INTO public.game_data (name, payload, bytes, generated_at, updated_at)
              VALUES ($1, $2::jsonb, $3, now(), now())
         ON CONFLICT (name) DO UPDATE
                SET payload = EXCLUDED.payload,
                    bytes = EXCLUDED.bytes,
                    generated_at = EXCLUDED.generated_at,
                    updated_at = now()`,
        [name, json, json.length]
      )
      console.log(`  ${name.padEnd(14)} ${(json.length / 1024).toFixed(0)} KB`)
    }
    // Las altas primero: así las filas nuevas pasan también por los ajustes
    // de Dinamax, variocolor y liberado de abajo.
    await addMissingSpecies(client, roster)
    await syncFichaDesdeJuego(client, gm, en)
    await updatePokemonsTable(client, roster)
    await syncShinyReleases(client, conVariocolor)
    await syncReleases(client, roster)
    await syncShadowReleases(client, roster)
    await syncEvolutionChains(client, roster, gm, es, en)
    await syncCadenasRegionales(client, roster, gm, es, en)
    if (ENSAYO) {
      await client.query('ROLLBACK')
      console.log('  --dry-run: no se ha guardado nada')
    } else {
      await client.query('COMMIT')
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw new Error(`no se ha podido subir a Supabase: ${err.message}`)
  } finally {
    await client.end()
  }
}

const PVPOKE_REPO = 'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/'

const SOURCES = {
  gm: 'https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json',
  es: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_spanish.json',
  en: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_english.json',
  // pvpoke, desde su repositorio de GitHub y no desde su web: la web responde
  // 403 a los servidores de GitHub Actions (el workflow diario no pasaba de
  // aquí), y el repo trae los mismos ficheros —los rankings, idénticos byte a
  // byte; el gamemaster solo cambia en las copas de temporada, que no se usan—.
  // La web queda de respaldo por si el repo fallara.
  pvpGm: [PVPOKE_REPO + 'gamemaster.json', 'https://pvpoke.com/data/gamemaster.json'],
  great: [PVPOKE_REPO + 'rankings/all/overall/rankings-1500.json', 'https://pvpoke.com/data/rankings/all/overall/rankings-1500.json'],
  ultra: [PVPOKE_REPO + 'rankings/all/overall/rankings-2500.json', 'https://pvpoke.com/data/rankings/all/overall/rankings-2500.json'],
  master: [PVPOKE_REPO + 'rankings/all/overall/rankings-10000.json', 'https://pvpoke.com/data/rankings/all/overall/rankings-10000.json'],
  // Una sola llamada para saber el id de sprite de cada forma (megas incluidas).
  forms: 'https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0',
  // Lista canónica de variocolores liberados, con de dónde sale cada uno.
  // Variocolores liberados, con fecha de estreno. pogoapi.net se paró en enero
  // de 2026 y ya no se consulta (ver especiesConVariocolor).
  shinyLeekDuck: 'https://leekduck.com/shiny/pms.json',
  // Los textos del juego, al día (los de PokeMiners se pararon en agosto de
  // 2025). Solo para los nombres de ataque que faltan.
  pokemonGoApi: 'https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json',
}

/** pvpoke nombra las formas distinto que PokeAPI. */
const FORM_ALIASES = [
  [/-alolan$/, '-alola'],
  [/-galarian$/, '-galar'],
  [/-hisuian$/, '-hisui'],
  [/-paldean/, '-paldea'],
  [/-therian$/, '-therian'],
]

/**
 * Id de sprite de PokeAPI para un Pokémon de pvpoke.
 * Las formas viven en ids ≥ 10000; si no encontramos la forma, se cae al
 * número de Pokédex, que siempre existe.
 */
function spriteIdFor(speciesId, dex, forms) {
  let name = speciesId.replace(/_shadow$/, '').replace(/_/g, '-')
  for (const [re, rep] of FORM_ALIASES) name = name.replace(re, rep)

  if (forms.has(name)) return forms.get(name)

  // Algunas formas de pvpoke no existen en PokeAPI: se usa la base.
  const base = name.split('-')[0]
  if (forms.has(base)) return forms.get(base)

  return dex
}

/**
 * Nombres de forma tal como los escribe el GAME_MASTER a partir del speciesId
 * de pvpoke, que no usa los mismos sufijos. Devuelve varios candidatos porque
 * la forma base aparece unas veces como `PIKACHU` y otras como `PIKACHU_NORMAL`.
 */
const SUFIJOS_GM = [
  [/_alolan$/, '_alola'],
  [/_galarian$/, '_galarian'],
  [/_hisuian$/, '_hisuian'],
]

function gmFormNames(speciesId) {
  let id = String(speciesId ?? '')
  for (const [re, rep] of SUFIJOS_GM) id = id.replace(re, rep)
  const alto = id.toUpperCase()
  return id.includes('_') ? [alto] : [alto, `${alto}_NORMAL`]
}

/** Orden canónico de tipos: es el índice que usa attackScalar en el GAME_MASTER. */
const TYPE_ORDER = [
  'normal', 'fighting', 'flying', 'poison', 'ground', 'rock',
  'bug', 'ghost', 'steel', 'fire', 'water', 'grass',
  'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy',
]

const TYPE_ES = {
  normal: 'Normal', fighting: 'Lucha', flying: 'Volador', poison: 'Veneno',
  ground: 'Tierra', rock: 'Roca', bug: 'Bicho', ghost: 'Fantasma',
  steel: 'Acero', fire: 'Fuego', water: 'Agua', grass: 'Planta',
  electric: 'Eléctrico', psychic: 'Psíquico', ice: 'Hielo',
  dragon: 'Dragón', dark: 'Siniestro', fairy: 'Hada',
}

/** Traducción de los sufijos de forma que usa pvpoke en speciesName. */
/**
 * Los Pikachu disfrazados que cuentan como forma propia (tienen ataques
 * suyos), con el nombre que les da GO. El juego no tiene clave de forma para
 * ellos, pero los nombra en otros textos: «Pikachu Roquera» y «Pikachu
 * Superstar» en la elección del GO Fest 2021, «Pikachu Enmascarada» en la
 * ropa del avatar, «Pikachu Vuelo» y «Capitán Pikachu» en eventos. Los tres
 * últimos no aparecen en ningún texto y son traducción nuestra.
 */
const DISFRACES = {
  pikachu_pop_star: { es: 'Pikachu Superstar', en: 'Pikachu Pop Star' },
  pikachu_rock_star: { es: 'Pikachu Roquera', en: 'Pikachu Rock Star' },
  pikachu_libre: { es: 'Pikachu Enmascarada', en: 'Pikachu Libre' },
  pikachu_flying: { es: 'Pikachu Vuelo', en: 'Flying Pikachu' },
  pikachu_horizons: { es: 'Capitán Pikachu', en: 'Captain Pikachu' },
  pikachu_kariyushi: { es: 'Pikachu Kariyushi', en: 'Kariyushi Pikachu' },
  pikachu_5th_anniversary: { es: 'Pikachu 5.º aniversario', en: '5th Anniversary Pikachu' },
  pikachu_shaymin: { es: 'Pikachu con bufanda de Shaymin', en: 'Shaymin Scarf Pikachu' },
}

const FORM_ES = [
  [/\(Shadow\)/i, '(Oscuro)'],
  [/\(Mega X\)/i, '(Mega X)'],
  [/\(Mega Y\)/i, '(Mega Y)'],
  [/\(Mega\)/i, '(Mega)'],
  [/\(Primal\)/i, '(Primigenio)'],
  [/\(Alolan\)/i, '(Alola)'],
  [/\(Galarian\)/i, '(Galar)'],
  [/\(Hisuian\)/i, '(Hisui)'],
  [/\(Paldean\)/i, '(Paldea)'],
  [/\(Origin\)/i, '(Origen)'],
  [/\(Altered\)/i, '(Modificado)'],
  [/\(Therian\)/i, '(Tótem)'],
  [/\(Incarnate\)/i, '(Avatar)'],
  [/\(Attack\)/i, '(Ataque)'],
  [/\(Defense\)/i, '(Defensa)'],
  [/\(Speed\)/i, '(Velocidad)'],
  [/\(Black\)/i, '(Negro)'],
  [/\(White\)/i, '(Blanco)'],
  [/\(Dawn Wings\)/i, '(Alas del Alba)'],
  [/\(Dusk Mane\)/i, '(Melena Crepuscular)'],
  [/\(Ultra\)/i, '(Ultra)'],
  [/\(Resolute\)/i, '(Brío)'],
  [/\(Ordinary\)/i, '(Habitual)'],
  [/\(Zen\)/i, '(Modo Daruma)'],
  [/\(Standard\)/i, '(Estándar)'],
  [/\(Unbound\)/i, '(Desatado)'],
  [/\(Confined\)/i, '(Contenido)'],
  [/\(Crowned Sword\)/i, '(Espada Suprema)'],
  [/\(Crowned Shield\)/i, '(Escudo Supremo)'],
  [/\(Ice Rider\)/i, '(Jinete Glacial)'],
  [/\(Shadow Rider\)/i, '(Jinete Espectral)'],
  [/\(Single Strike\)/i, '(Estilo Brusco)'],
  [/\(Rapid Strike\)/i, '(Estilo Fluido)'],
  [/\(Hero\)/i, '(Gallardo)'],
  [/\(Complete\)/i, '(Completa)'],
  [/\(Sky\)/i, '(Cielo)'],
  [/\(Land\)/i, '(Tierra)'],
  [/\(Blade\)/i, '(Filo)'],
  [/\(Shield\)/i, '(Escudo)'],
  [/\(Sunny\)/i, '(Soleado)'],
  [/\(Rainy\)/i, '(Lluvioso)'],
  [/\(Snowy\)/i, '(Nevado)'],
  [/\(Winter\)/i, '(Invierno)'],
  [/\(Summer\)/i, '(Verano)'],
  [/\(Autumn\)/i, '(Otoño)'],
  [/\(Spring\)/i, '(Primavera)'],
  [/\(Normal\)/i, '(Normal)'],
  [/\(Male\)/i, '(Macho)'],
  [/\(Female\)/i, '(Hembra)'],
  [/\(Plant\)/i, '(Tronco Planta)'],
  [/\(Sandy\)/i, '(Tronco Arena)'],
  [/\(Trash\)/i, '(Tronco Basura)'],
  [/\(Aqua\)/i, '(Raza Acuática)'],
  [/\(Blaze\)/i, '(Raza Ardiente)'],
  [/\(Combat\)/i, '(Raza Combativa)'],
  [/\(10% Forme\)/i, '(Forma 10 %)'],
  [/\(50% Forme\)/i, '(Forma 50 %)'],
  [/\(Pa'u\)/i, '(Estilo Plácido)'],
  [/\(Pom-Pom\)/i, '(Estilo Animado)'],
  [/\(Armored\)/i, '(Acorazado)'],
  [/\(Core\)/i, '(Núcleo)'],
]

/**
 * Descarga (o lee de la caché) una fuente. `urls` puede ser una lista: se
 * prueba en orden y vale la primera que responda.
 */
async function load(name, urls) {
  await fs.mkdir(CACHE, { recursive: true })
  const file = path.join(CACHE, name + '.json')
  if (!FRESH) {
    try {
      const raw = await fs.readFile(file, 'utf8')
      console.log(`  ${name}: caché (${(raw.length / 1e6).toFixed(1)} MB)`)
      return JSON.parse(raw)
    } catch {
      /* sin caché, se descarga */
    }
  }
  process.stdout.write(`  ${name}: descargando… `)
  const lista = Array.isArray(urls) ? urls : [urls]
  let res = null
  const fallos = []
  for (const url of lista) {
    try {
      res = await fetch(url)
      if (res.ok) break
      fallos.push(`HTTP ${res.status} en ${new URL(url).host}`)
    } catch (err) {
      fallos.push(`${err.message} en ${new URL(url).host}`)
    }
    res = null
  }
  if (!res) throw new Error(`${name}: ${fallos.join('; ')}`)
  const raw = await res.text()
  await fs.writeFile(file, raw)
  console.log(`${(raw.length / 1e6).toFixed(1)} MB`)
  return JSON.parse(raw)
}

/** El i18n viene como array plano [clave, valor, clave, valor, …]. */
function i18nMap(es) {
  const flat = es.data ?? es
  const map = new Map()
  for (let i = 0; i < flat.length - 1; i += 2) map.set(flat[i], flat[i + 1])
  return map
}


/**
 * Diccionario inglés -> español con las frases del propio juego, para traducir
 * las tareas de investigación y las bonificaciones que LeekDuck publica en
 * inglés. Se acota a frases con pinta de tarea o de bonus: el fichero completo
 * son casi 29.000 entradas y no hace falta ninguna más.
 */
function buildTextDictionary(enRaw, esRaw) {
  const en = i18nMap(enRaw)
  const es = i18nMap(esRaw)

  // Se comparan palabras, no expresiones regulares: el texto ya viene
  // normalizado y así no hay escapes que se puedan colar mal.
  const TASK_VERBS = [
    'catch', 'make', 'win', 'spin', 'hatch', 'evolve', 'trade', 'send', 'take', 'use',
    'battle', 'defeat', 'earn', 'complete', 'purify', 'transfer', 'walk', 'explore',
    'snap', 'open', 'give', 'play', 'add', 'receive', 'claim', 'participate',
    'power', 'level', 'get', 'find', 'visit', 'buy'
  ]
  const BONUS_WORDS = [
    'xp', 'candy', 'stardust', 'incense', 'lure', 'hatch distance', 'spawns',
    'raid pass', 'trade', 'egg', 'dust'
  ]

  const dictionary = {}
  for (const [key, english] of en) {
    const spanish = es.get(key)
    if (!spanish || !english || english.length > 90) continue

    const normalized = normalizeText(english)
    const words = normalized ? normalized.split(' ') : []
    if (words.length < 2) continue

    const isTask = TASK_VERBS.includes(words[0])
    const isBonus = english.length < 60 && BONUS_WORDS.some((w) => normalized.includes(w))
    if (!isTask && !isBonus) continue

    // Dos claves por frase: la exacta (con su número) y la genérica (con
    // {n}). La exacta es la que salva los multiplicadores, que en español van
    // en palabras; la genérica es la que hace funcionar las tareas, donde el
    // español sí trae marcadores.
    const exact = normalizeText(english, { keepNumbers: true })
    if (!(exact in dictionary)) dictionary[exact] = spanish
    if (normalized in dictionary) continue
    dictionary[normalized] = spanish
  }
  return dictionary
}

function buildTypeChart(gm) {
  const rows = gm.filter((t) => t.data?.typeEffective)
  const chart = {}
  for (const t of rows) {
    const attack = t.data.typeEffective.attackType.replace('POKEMON_TYPE_', '').toLowerCase()
    const scalars = t.data.typeEffective.attackScalar
    chart[attack] = {}
    TYPE_ORDER.forEach((def, i) => {
      chart[attack][def] = scalars[i]
    })
  }
  const missing = TYPE_ORDER.filter((t) => !chart[t])
  if (missing.length) throw new Error('Faltan tipos en la tabla: ' + missing.join(', '))
  // Comprobación de cordura: agua sobre fuego debe ser superefectivo.
  if (chart.water.fire <= 1) throw new Error('La tabla de tipos no cuadra (agua vs fuego)')
  return chart
}


/**
 * Coste en megaenergía de cada mega, sacado del GAME_MASTER.
 *
 * El primero es fijo (el que hace falta para registrarla en la Megadex); el
 * siguiente es el de base, que luego el juego rebaja según el enfriamiento.
 * Devuelve un mapa con los ids de pvpoke: charizard_mega_x, venusaur_mega…
 */
function buildMegaEnergy(gm) {
  const costs = new Map()

  for (const template of gm) {
    const settings = template.data?.pokemonSettings
    const branches = settings?.evolutionBranch
    if (!branches) continue

    for (const branch of branches) {
      if (!branch.temporaryEvolution || branch.temporaryEvolutionEnergyCost == null) continue

      const suffix = branch.temporaryEvolution
        .replace('TEMP_EVOLUTION_', '')
        .toLowerCase()
      const id = `${settings.pokemonId.toLowerCase()}_${suffix}`

      if (costs.has(id)) continue
      costs.set(id, {
        first: branch.temporaryEvolutionEnergyCost,
        subsequent: branch.temporaryEvolutionEnergyCostSubsequent ?? null
      })
    }
  }

  return costs
}

/** Nombre de cada ataque en español e inglés, sacado de pokemon-go-api. */
function nombresDeAtaques(pga) {
  const nombres = new Map()
  for (const p of Array.isArray(pga) ? pga : []) {
    for (const campo of ['quickMoves', 'cinematicMoves', 'eliteQuickMoves', 'eliteCinematicMoves']) {
      for (const m of Object.values(p[campo] ?? {})) {
        if (m?.id && m.names?.Spanish && !nombres.has(m.id)) nombres.set(m.id, { es: m.names.Spanish, en: m.names.English })
      }
    }
  }
  return nombres
}

function buildMoves(gm, pvpGm, es, nombresPga = new Map()) {
  const moves = {}

  // Stats PvE del GAME_MASTER.
  for (const t of gm) {
    const m = t.data?.moveSettings
    if (!m) continue
    // movementId llega a veces como número (enum sin resolver), así que el
    // identificador se saca del templateId, que siempre es texto.
    const parsed = /^V(\d+)_MOVE_(.+)$/.exec(t.templateId)
    if (!parsed) continue
    const num = parsed[1]
    const raw = parsed[2]
    const isFast = raw.endsWith('_FAST')
    const id = isFast ? raw.slice(0, -5) : raw
    const energy = m.energyDelta ?? 0
    moves[id] = {
      id,
      kind: isFast ? 'fast' : 'charged',
      type: m.pokemonType.replace('POKEMON_TYPE_', '').toLowerCase(),
      name: null,
      nameEs: num ? (es.get(`move_name_${num}`) ?? null) : null,
      pve: {
        power: m.power ?? 0,
        energy,
        duration: (m.durationMs ?? 0) / 1000,
        damageWindow: (m.damageWindowStartMs ?? 0) / 1000,
      },
      pvp: null,
    }
  }

  // Stats PvP y nombre en inglés desde pvpoke.
  for (const m of pvpGm.moves) {
    let entry = moves[m.moveId]
    if (!entry) {
      // Los movimientos exclusivos de las supermegas (isMegaMove) solo existen
      // en pvpoke: el GAME_MASTER todavía no los publica. Se crean igualmente
      // para poder nombrarlos y mostrarlos, con pve = null porque no hay datos
      // de incursiones. El día que Niantic los publique, el bucle de arriba los
      // creará con sus stats de PvE y este de aquí solo añadirá los de PvP.
      if (!m.isMegaMove) continue
      entry = moves[m.moveId] = {
        id: m.moveId,
        kind: 'charged',
        type: m.type,
        name: null,
        nameEs: null,
        pve: null,
        pvp: null,
      }
    }
    if (m.isMegaMove) entry.megaMove = true
    entry.name = m.name
    entry.pvp = {
      power: m.power,
      energy: m.energy ?? 0,
      energyGain: m.energyGain ?? 0,
      turns: m.turns ?? Math.round((m.cooldown ?? 500) / 500),
      buffs: m.buffs ?? null,
      buffTarget: m.buffTarget ?? null,
      buffApplyChance: m.buffApplyChance ? Number(m.buffApplyChance) : null,
    }
  }

  // Los textos del juego de PokeMiners no se actualizan desde agosto de 2025:
  // los ataques de después (Pico Cañón, Cabeza Sorpresa, Agua Fría…) salían
  // en inglés. pokemon-go-api publica los mismos textos del juego y al día.
  for (const entry of Object.values(moves)) {
    if (!entry.nameEs) entry.nameEs = nombresPga.get(entry.id)?.es ?? null
  }

  for (const entry of Object.values(moves)) {
    if (!entry.name) {
      entry.name = entry.id
        .toLowerCase()
        .split('_')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ')
    }
    // "Fell Stinger+" no está traducido en los textos del juego, pero sí lo
    // está "Aguijón Letal": se reutiliza el nombre del movimiento base.
    if (!entry.nameEs && entry.id.endsWith('_PLUS')) {
      const base = moves[entry.id.slice(0, -5)]
      if (base?.nameEs) entry.nameEs = `${base.nameEs}+`
    }
    if (!entry.nameEs) entry.nameEs = entry.name
  }
  return moves
}

/**
 * Lo que lleva el nombre de pvpoke entre paréntesis, separado: «Sandslash
 * (Alolan) (Shadow)» → base Sandslash, región Alolan, oscuro, y el resto de
 * formas. «Standard» no cuenta: es la forma de siempre («Darmanitan»).
 */
function partesDelNombre(speciesName) {
  const base = String(speciesName).replace(/\s*\(.*$/, '').trim()
  let region = null
  let oscuro = false
  let mega = null
  const formas = []
  for (const [, dentro] of String(speciesName).matchAll(/\(([^)]+)\)/g)) {
    const f = dentro.trim()
    const conRegion = /^(Alolan|Galarian|Hisuian|Paldean)\b\s*(.*)$/i.exec(f)
    const esMega = /^Mega(?:\s+([XY]))?$/i.exec(f)
    if (conRegion) {
      region = conRegion[1][0].toUpperCase() + conRegion[1].slice(1).toLowerCase()
      if (conRegion[2]) formas.push(conRegion[2])
    } else if (/^Shadow$/i.test(f)) oscuro = true
    else if (esMega) mega = esMega[1] ? esMega[1].toUpperCase() : ''
    else if (!/^Standard$/i.test(f)) formas.push(f)
  }
  return { base, region, oscuro, mega, formas }
}

const REGION_ES = { Alolan: 'de Alola', Galarian: 'de Galar', Hisuian: 'de Hisui', Paldean: 'de Paldea' }

/**
 * El nombre en inglés, como lo escribe el juego: la región delante («Galarian
 * Corsola»), «Shadow» delante (como LeekDuck: «Shadow Machop») y la mega
 * delante («Mega Charizard X»). Antes era el de pvpoke, «Corsola (Galarian)»,
 * y cada vista lo escribía de una manera.
 */
function englishName(speciesName, dex, en = new Map()) {
  const partes = partesDelNombre(speciesName)
  // El de la especie, del juego («Mime Jr.», «Type: Null», «Farfetch'd»).
  const base = en.get(`pokemon_name_${String(dex).padStart(4, '0')}`) ?? partes.base
  const { region, oscuro, mega } = partes
  if (mega != null) return `Mega ${base}${mega ? ` ${mega}` : ''}`
  const formas = partes.formas.filter((f) => !/^(jr|null)$/i.test(f) && !base.toLowerCase().includes(f.toLowerCase()))
  const nombre = [oscuro && 'Shadow', region, base].filter(Boolean).join(' ')
  return formas.length ? `${nombre} (${formas.join(', ')})` : nombre
}

/**
 * El nombre en español, como en el resto de la app: «Corsola de Galar»,
 * «Machop Oscuro», «Sandslash de Alola Oscuro», «Mega Charizard X»; las demás
 * formas, entre paréntesis y con el nombre del juego («Toxtricity (Forma
 * Grave)», «Darmanitan de Galar (Modo Daruma)»).
 */
function spanishName(speciesName, dex, es, speciesId = '') {
  const base = es.get(`pokemon_name_${String(dex).padStart(4, '0')}`)
  if (!base) return speciesName
  const { region, oscuro, mega, formas } = partesDelNombre(speciesName)
  if (mega != null) return `Mega ${base}${mega ? ` ${mega}` : ''}`

  const especie = speciesId.split('_')[0]
  const partes = []
  let completo = null
  for (const forma of formas) {
    // pvpoke parte algunos nombres como si fueran forma: «Mime (Jr)», «Type (Null)».
    if (/^(jr|null)$/i.test(forma) || base.toLowerCase().includes(forma.toLowerCase())) continue
    const fija = FORM_ES.find(([re]) => re.test(`(${forma})`))
    if (fija) {
      partes.push(fija[1].slice(1, -1))
      continue
    }
    // Si no, el nombre que da el propio juego (form_rotom_wash → «Rotom
    // Lavado», form_toxtricity_low_key → «Forma Grave»).
    const clave = forma.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const delJuego = [clave, clave.replace(/_forme?$/, '')]
      .flatMap((c) => [`form_${especie}_${c}`, `form_${c}`])
      .map((c) => es.get(c))
      .find(Boolean)
    if (delJuego?.toLowerCase().startsWith(base.toLowerCase())) completo = delJuego
    else partes.push(delJuego ?? forma)
  }
  const nombre = [completo ?? base, region && REGION_ES[region], oscuro && 'Oscuro'].filter(Boolean).join(' ')
  return partes.length ? `${nombre} (${partes.join(', ')})` : nombre
}

/**
 * Todo lo de los combates Max, que en el GAME_MASTER va con nombres en clave:
 * `bread` es Dinamax y `sourdough` (masa madre) es Gigamax.
 *
 * Lo que se saca:
 *   - quien puede dinamaxizar (breadOverrides) y gigamaxizar (breadSettings)
 *   - el ataque Max que le toca a cada tipo, y el propio de cada Gigamax
 *   - el grupo de coste de mejora de cada Pokemon (breadTierGroup)
 *
 * Los ataques Max no publican `power`: en los combates Max el dano lo calcula
 * el cliente a partir del nivel del ataque, asi que aqui solo viajan su
 * nombre, su tipo y su duracion.
 */
function buildMaxData(gm, en, es) {
  const norm = (texto) => String(texto ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

  // Los ataques Max no tienen plantilla numerada, pero su `vfxName` coincide
  // con el nombre en ingles, que sí está en los textos: por ahí se llega al
  // nombre traducido.
  const porNombreIngles = new Map()
  for (const [clave, valor] of en) {
    if (clave.startsWith('move_name_')) porNombreIngles.set(norm(valor), clave)
  }

  // Maxibarrera y Maxivigor no son movimientos numerados: se nombran aparte.
  const SIN_NUMERAR = {
    max_shield: 'bread_move_upgrade_bread_b',
    max_heal: 'bread_move_upgrade_bread_c',
  }

  const movimientos = {}
  for (const t of gm) {
    if (!/^VN_BM_\d+$/.test(t.templateId ?? '')) continue
    const m = t.data.moveSettings
    const clave = SIN_NUMERAR[m.vfxName] ?? porNombreIngles.get(norm(m.vfxName))
    movimientos[t.templateId] = {
      id: t.templateId,
      type: (m.pokemonType ?? '').replace('POKEMON_TYPE_', '').toLowerCase(),
      duration: (m.durationMs ?? 0) / 1000,
      name: (clave && en.get(clave)) || m.vfxName,
      nameEs: (clave && es.get(clave)) || (clave && en.get(clave)) || m.vfxName,
    }
  }

  const dato = (clave) => gm.find((t) => t.data?.[clave])?.data[clave]

  const porTipo = {}
  for (const m of dato('breadMoveMappings')?.mappings ?? []) {
    porTipo[m.type.replace('POKEMON_TYPE_', '').toLowerCase()] = movimientos[m.move] ?? null
  }

  const gmaxPorEspecie = {}
  for (const m of dato('sourdoughMoveMappingSettings')?.mappings ?? []) {
    gmaxPorEspecie[m.pokemonId] ??= movimientos[m.move] ?? null
  }

  // `allowedSourdoughPokemon` es la lista que el propio juego declara
  // permitida para gigamaxizar; es la unica afirmacion explicita que hay.
  const gigamax = new Set(
    // Las especies de una sola forma vienen con FORM_UNSET, que no es un
    // nombre de forma: para esas manda el propio id.
    (dato('breadSettings')?.allowedSourdoughPokemon ?? []).flatMap((p) =>
      (p.form ?? []).filter((f) => f && f !== 'FORM_UNSET').length
        ? p.form.filter((f) => f !== 'FORM_UNSET')
        : [p.pokemonId]
    )
  )

  // Esto va por FORMA, no por numero de Pokedex: Charizard puede dinamaxizar
  // pero Mega Charizard X no, y los oscuros tampoco. El GAME_MASTER ya lo
  // distingue —cada forma tiene su plantilla— asi que basta con no perder el
  // sufijo por el camino.
  const dinamax = new Set()
  const grupoCoste = {}
  for (const t of gm) {
    const ext = t.data?.pokemonExtendedSettings
    if (ext?.breadOverrides?.some((o) => String(o.breadMode ?? '').startsWith('BREAD_MODE'))) {
      const m = /^EXTENDED_V\d+_(?:POKEMON_)?(.+)$/.exec(t.templateId ?? '')
      if (m) dinamax.add(m[1])
    }
    const ps = t.data?.pokemonSettings
    if (ps?.breadTierGroup) {
      const m = /^V(\d+)_POKEMON_/.exec(t.templateId ?? '')
      if (m) grupoCoste[Number(m[1])] ??= ps.breadTierGroup
    }
  }

  const costes = {}
  for (const t of gm) {
    const bm = t.data?.breadMoveLevelSettings
    if (bm?.group) costes[bm.group] = { attack: bm.aSettings, guard: bm.bSettings, spirit: bm.cSettings }
  }

  return { movimientos, porTipo, gmaxPorEspecie, gigamax, dinamax, grupoCoste, costes }
}

/**
 * La cadena evolutiva de cada forma regional, para su ficha (?form=…).
 *
 * La tabla `pokemons` va por número de Pokédex, así que la ficha de Meowth de
 * Galar enseñaba la cadena de Kanto (Meowth → Persian). Aquí se monta, con el
 * GAME_MASTER, la de la forma: Meowth de Galar → Perrserker, Cyndaquil →
 * Quilava → Typhlosion de Hisui, Pichu → Pikachu → Raichu de Alola, Slowpoke
 * de Galar → Slowbro y Slowking de Galar… Va en la entrada del roster de cada
 * forma (`cadena`), con el mismo formato que `evolution_info`.
 *
 * Se parte de la forma y se sube por sus antecesores hasta la raíz; desde
 * ahí se baja siguiendo, en los Pokémon sin forma, solo el camino hacia la
 * regional (de Quilava no se va al Typhlosion de Johto), y en las regionales,
 * todas sus ramas.
 */
function cadenasDeFormasRegionales(gm, roster, es, en) {
  const misiones = misionesDeEvolucion(gm, es, en)
  const REGION = /_(ALOLA|GALARIAN|HISUIAN|PALDEA)(?=_|$)/
  const dexDe = new Map()
  for (const t of gm) {
    const m = /^V(\d{4})_POKEMON_/.exec(t.templateId)
    const s = t.data?.pokemonSettings
    if (m && s?.pokemonId && !dexDe.has(s.pokemonId)) dexDe.set(s.pokemonId, Number(m[1]))
  }
  const rosterPorId = new Map(roster.map((p) => [p.id, p]))
  const basePorDex = new Map()
  for (const p of roster) {
    if (!p.mega && !p.shadow && !p.regional && !basePorDex.has(p.dex)) basePorDex.set(p.dex, p)
  }
  // RAICHU_ALOLA → raichu_alolan; WOOPER_PALDEA → wooper_paldean.
  const idDeForma = (form) => form.toLowerCase().replace(/_alola(?=_|$)/, '_alolan').replace(/_paldea(?=_|$)/, '_paldean')

  // Nodos: «r:FORMA» para las regionales y «p:DEX» para los que no tienen forma.
  const sale = new Map()
  const entra = new Map()
  const unir = (origen, destino, rama) => {
    if (origen === destino) return
    if (!sale.has(origen)) sale.set(origen, [])
    if (!entra.has(destino)) entra.set(destino, [])
    if (sale.get(origen).some((e) => e.destino === destino)) return
    sale.get(origen).push({ destino, rama })
    entra.get(destino).push({ origen, rama })
  }
  for (const t of gm) {
    const m = /^V(\d{4})_POKEMON_(.+)$/.exec(t.templateId)
    const s = t.data?.pokemonSettings
    if (!m || !s?.evolutionBranch) continue
    const resto = m[2]
    // Solo la plantilla base de la especie o la de su forma regional; los
    // disfraces y demás formas no cuentan.
    const regional = new RegExp(`^${s.pokemonId}_(ALOLA|GALARIAN|HISUIAN|PALDEA)$`).test(resto)
    if (!regional && resto !== s.pokemonId) continue
    const origen = regional ? `r:${resto}` : `p:${Number(m[1])}`
    for (const rama of s.evolutionBranch) {
      if (rama.temporaryEvolution) continue
      const dex = dexDe.get(rama.evolution)
      if (!dex) continue
      unir(origen, rama.form && REGION.test(rama.form) ? `r:${rama.form}` : `p:${dex}`, rama)
    }
  }

  const requisitosDe = (rama) => {
    const mision = misiones.get(rama.questDisplay?.[0]?.questRequirementTemplateId)
    const b = mision ? { ...rama, _mision: mision } : rama
    return sinVacios(Object.fromEntries(Object.entries(REQUISITOS_DEL_JUEGO).map(([campo, leer]) => [campo, leer(b)])))
  }
  const sprite = (id, shiny) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${shiny ? 'shiny/' : ''}${id}.png`
  const paso = (nodo) => {
    if (nodo.startsWith('p:')) {
      const p = basePorDex.get(Number(nodo.slice(2)))
      if (!p) return null
      return {
        name: p.name, nameEs: p.nameEs, types: p.types,
        sprites: { male: sprite(p.spriteId, false), male_shiny: sprite(p.spriteId, true) },
        pokemon_id: p.dex, is_released: p.released === true, is_shiny_released: p.shinyReleased === true,
      }
    }
    const forma = nodo.slice(2)
    const p = rosterPorId.get(idDeForma(forma))
    const base = p && basePorDex.get(p.dex)
    const region = REGIONES[REGION.exec(forma)?.[1]]
    if (!p || !base || !region) return null
    return {
      // El nombre de la especie, sin la forma de la entrada base («Darmanitan (Estándar)»).
      name: `${region.en} ${sinForma(base.name)}`, nameEs: `${sinForma(base.nameEs)} ${region.es}`, types: p.types,
      sprites: { male: sprite(p.spriteId, false), male_shiny: sprite(p.spriteId, true) },
      pokemon_id: p.dex, form: p.id, is_released: p.released === true,
      // El variocolor del roster es por especie, no por forma: mejor no decir nada.
      is_shiny_released: false,
    }
  }

  const sinForma = (nombre) => String(nombre).replace(/\s*\([^)]*\)\s*$/, '')
  const cadenas = new Map()
  const regionales = new Set([...sale.keys(), ...entra.keys()].filter((n) => n.startsWith('r:')))
  for (const nodo of regionales) {
    // Hacia arriba: mejor por la regional (Linoone de Galar viene de Zigzagoon de Galar).
    const linea = [nodo]
    for (let x = nodo; entra.get(x)?.length;) {
      const previos = entra.get(x)
      const previo = previos.find((e) => e.origen.startsWith('r:')) ?? previos[0]
      if (linea.includes(previo.origen)) break
      linea.unshift(previo.origen)
      x = previo.origen
    }
    const caminos = []
    const bajar = (actual, acumulado) => {
      let siguientes = sale.get(actual) ?? []
      if (actual.startsWith('p:')) siguientes = siguientes.filter((e) => e.destino.startsWith('r:') || linea.includes(e.destino))
      siguientes = siguientes.filter((e) => !acumulado.some((a) => a.nodo === e.destino))
      if (!siguientes.length) return caminos.push(acumulado)
      for (const e of siguientes) {
        const hasta = acumulado.map((a, i) => (i === acumulado.length - 1 ? { ...a, rama: e.rama } : a))
        bajar(e.destino, [...hasta, { nodo: e.destino }])
      }
    }
    bajar(linea[0], [{ nodo: linea[0] }])

    // La familia entera: en Slowbro de Galar sale también Slowking de Galar.
    const ramas = caminos
      .map((c) => c.map((a) => {
        const p = paso(a.nodo)
        return p && (a.rama ? { ...p, ...requisitosDe(a.rama) } : p)
      }))
      .filter((c) => c.length > 1 && c.every(Boolean))
    if (!ramas.length) continue
    const id = rosterPorId.get(idDeForma(nodo.slice(2)))?.id
    if (id) cadenas.set(id, Object.fromEntries(ramas.slice(0, RAMAS.length).map((r, i) => [RAMAS[i], r])))
  }
  return cadenas
}

function buildPokemon(pvpGm, es, moves, forms, megaEnergy, max, conShiny, en = new Map()) {
  // Qué especies tienen el variocolor liberado. LeekDuck publica un
  // `canBeShiny` por encuentro, pero viene a false en TODAS las recompensas de
  // investigación, así que no se puede usar. Y da igual el sitio: si el
  // variocolor está liberado, puede salir en cualquier encuentro de esa
  // especie. `conShiny` sale de especiesConVariocolor.
  const out = []
  for (const p of pvpGm.pokemon) {
    const tags = p.tags ?? []
    const fast = (p.fastMoves ?? []).filter((m) => moves[m])
    const charged = (p.chargedMoves ?? []).filter((m) => moves[m])
    if (!fast.length || !charged.length) continue
    const gmForms = gmFormNames(p.speciesId)
    out.push({
      id: p.speciesId,
      dex: p.dex,
      spriteId: spriteIdFor(p.speciesId, p.dex, forms),
      name: DISFRACES[p.speciesId]?.en ?? englishName(p.speciesName, p.dex, en),
      nameEs: DISFRACES[p.speciesId]?.es ?? spanishName(p.speciesName, p.dex, es, p.speciesId),
      types: p.types.filter((t) => t && t !== 'none'),
      stats: p.baseStats,
      fast,
      charged,
      // pvpoke solo marca liberado lo que sirve para combatir: Ditto, Shedinja,
      // Spewpa o Aegislash salían sin liberar aunque llevan tiempo en el juego.
      // Si su variocolor está liberado, el Pokémon lo está; eso solo vale para
      // la forma normal, no para una mega o un oscuro que aún no hayan salido.
      released: p.released === true ||
        (conShiny.has(p.dex) && !tags.includes('shadow') && !tags.includes('mega')),
      shadow: tags.includes('shadow'),
      mega: tags.includes('mega'),
      // Las supermegas son megas con stats y movimientos propios.
      superMega: tags.includes('supermega'),
      // Movimiento cargado exclusivo de la supermega (el "+"). Va aparte de
      // `charged` porque todavía no tiene stats de PvE y no puede entrar en los
      // rankings de incursiones sin falsear los números.
      megaMoves: (p.extraChargedMoves ?? []).filter((m) => moves[m]),
      // Movimientos que ya no se aprenden normalmente. Los élite solo se
      // consiguen con MT Élite; los legacy vinieron de eventos y ni eso.
      eliteMoves: (p.eliteMoves ?? []).filter((m) => moves[m]),
      legacyMoves: (p.legacyMoves ?? []).filter((m) => moves[m]),
      // Combates Max. `maxMove` sale del tipo principal: todos los Dinamax de
      // un mismo tipo comparten el mismo ataque Max.
      shinyReleased: conShiny.has(p.dex),
      dynamax: gmForms.some((f) => max.dinamax.has(f)),
      gigantamax: gmForms.some((f) => max.gigamax.has(f)),
      maxCostGroup: max.grupoCoste[p.dex] ?? null,
      megaEnergy: megaEnergy.get(p.speciesId) ?? null,
      legendary: tags.includes('legendary') || tags.includes('wildlegendary'),
      mythical: tags.includes('mythical'),
      ultraBeast: tags.includes('ultrabeast'),
      shadowEligible: tags.includes('shadoweligible'),
      // Forma regional (Meowth de Galar). pvpoke usa además la etiqueta
      // `regional` para las especies exclusivas de una zona del mundo
      // (Kangaskhan, Heracross, Tauros…): mezclarlas dejaba a 37 especies sin
      // forma base, y su ficha leía ataques y estadísticas de la tabla vieja.
      // Los Tauros de Paldea van sin la región en el id (tauros_blaze).
      regional: /_(alolan|galarian|hisuian|paldean)(_|$)|^tauros_(aqua|blaze|combat)$/.test(p.speciesId) ||
        tags.includes('alolan') || tags.includes('galarian') || tags.includes('hisuian') || tags.includes('paldean'),
      regionExclusive: tags.includes('regional') && !/_(alolan|galarian|hisuian|paldean)(_|$)|^tauros_(aqua|blaze|combat)$/.test(p.speciesId),
      family: p.family?.id ?? null,
      evolutions: p.family?.evolutions ?? [],
      buddyDistance: p.buddyDistance ?? null,
      thirdMoveCost: p.thirdMoveCost ?? null,
    })
  }
  return out
}

function trimRankings(list, roster, limit) {
  const byId = new Map(roster.map((p) => [p.id, p]))
  return list.slice(0, limit).map((r, i) => {
    const p = byId.get(r.speciesId)
    return {
      rank: i + 1,
      id: r.speciesId,
      name: p?.name ?? r.speciesName,
      nameEs: p?.nameEs ?? r.speciesName,
      types: p?.types ?? [],
      score: r.score,
      moveset: r.moveset ?? [],
      stats: r.stats ?? null,
      counters: (r.counters ?? []).slice(0, 5).map((c) => ({
        id: c.opponent,
        nameEs: byId.get(c.opponent)?.nameEs ?? c.opponent,
        rating: c.rating,
      })),
      wins: (r.matchups ?? []).slice(0, 5).map((c) => ({
        id: c.opponent,
        nameEs: byId.get(c.opponent)?.nameEs ?? c.opponent,
        rating: c.rating,
      })),
      notes: r.editorNotes ?? null,
    }
  })
}

/**
 * Lo que `pnpm max` ha ido viendo en los combates Max y en los eventos de
 * LeekDuck (fila `maxliberados`) y lo que hay ahora mismo (`maxlive`). Sin
 * base de datos, o si falla, nada: quedan la semilla y LeekDuck.
 */
async function leerVistosMax() {
  if (!process.env.SUPABASE_DB_URL) return {}
  const { default: pg } = await import('pg')
  const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    const { rows } = await client.query(
      `SELECT name, payload FROM public.game_data WHERE name IN ('maxliberados', 'maxlive')`
    )
    const fila = Object.fromEntries(rows.map((uno) => [uno.name, uno.payload]))
    const vistos = {
      dinamax: { ...(fila.maxliberados?.dinamax ?? {}) },
      gigamax: { ...(fila.maxliberados?.gigamax ?? {}) },
    }
    for (const uno of fila.maxlive?.pokemon ?? []) {
      const donde = uno.gigantamax ? vistos.gigamax : vistos.dinamax
      donde[uno.dex] ??= fila.maxlive.fetchedAt ?? true
    }
    return vistos
  } catch (err) {
    console.warn(`  ⚠ no se han podido leer los combates Max vistos: ${err.message}`)
    return {}
  } finally {
    await client.end().catch(() => {})
  }
}

/**
 * Deja la marca de Dinamax y Gigamax solo en los ya liberados. El GAME_MASTER
 * los declara antes de tiempo (Flapple y Appletun salían con Gigamax), y la
 * marca, como la del variocolor, solo sirve si se puede conseguir.
 *
 * Si LeekDuck no ha respondido, los Gigamax se quedan como en la pasada
 * anterior en vez de quitarlos todos.
 */
async function soloMaxLiberados(pokemon, leekRaw) {
  const vistos = await leerVistosMax()
  const { dinamax, gigamax } = maxLiberados(pokemon, {
    semilla: DINAMAX_LIBERADOS.dinamax,
    vistos,
    shinyLeekDuck: leekRaw,
  })

  if (!leekRaw.length) {
    try {
      const anterior = JSON.parse(await fs.readFile(path.join(OUT, 'roster.json'), 'utf8'))
      for (const p of anterior) if (p.gigantamax) gigamax.add(p.id)
      console.warn('  ⚠ sin LeekDuck: los Gigamax, como en la pasada anterior')
    } catch {
      /* sin roster anterior: se queda lo visto en los combates Max */
    }
  }

  const antes = { d: pokemon.filter((p) => p.dynamax).length, g: pokemon.filter((p) => p.gigantamax).length }
  for (const p of pokemon) {
    p.dynamax = p.dynamax && dinamax.has(p.id)
    p.gigantamax = p.gigantamax && gigamax.has(p.id)
  }
  const despues = { d: pokemon.filter((p) => p.dynamax).length, g: pokemon.filter((p) => p.gigantamax).length }
  console.log(`  Max liberados: ${despues.d} de ${antes.d} Dinamax, ${despues.g} de ${antes.g} Gigamax`)
}

async function main() {
  await loadEnv()
  console.log('Descargando fuentes…')
  const [gmRaw, esRaw, enRaw, pvpGm, great, ultra, master, formsRaw, leekRaw, pgaRaw] = await Promise.all([
    load('gm', SOURCES.gm),
    load('es', SOURCES.es),
    load('en', SOURCES.en),
    load('pvp-gm', SOURCES.pvpGm),
    load('rank-great', SOURCES.great),
    load('rank-ultra', SOURCES.ultra),
    load('rank-master', SOURCES.master),
    load('pokeapi-forms', SOURCES.forms),
    // Si LeekDuck falla, se sigue con lo que ya había en vez de tirar la pasada.
    load('shiny-leekduck', SOURCES.shinyLeekDuck).catch((err) => {
      console.warn(`  ⚠ ${err.message}`)
      return []
    }),
    // Solo de respaldo para nombres: si falla, se sigue sin ella.
    load('pokemon-go-api', SOURCES.pokemonGoApi).catch((err) => {
      console.warn(`  ⚠ ${err.message}`)
      return []
    }),
  ])

  const es = i18nMap(esRaw)

  // El CPM que llevamos hardcodeado en formulas.js debe seguir coincidiendo.
  const liveCpm = gmRaw.find((t) => t.data?.playerLevel)?.data.playerLevel.cpMultiplier ?? []
  const drift = liveCpm.length !== CPM_BY_LEVEL.length ||
    liveCpm.some((v, i) => Math.abs(v - CPM_BY_LEVEL[i]) > 1e-9)
  if (drift) {
    console.warn('\n  ⚠ El CPM del GAME_MASTER ya no coincide con CPM_BY_LEVEL de src/utils/formulas.js')
    console.warn('    Actualízalo antes de fiarte de los PC.\n')
  }

  const chart = buildTypeChart(gmRaw)
  const moves = buildMoves(gmRaw, pvpGm, es, nombresDeAtaques(pgaRaw))
  const forms = new Map(
    formsRaw.results.map((r) => [r.name, Number(r.url.split('/').filter(Boolean).pop())])
  )
  const megaEnergy = buildMegaEnergy(gmRaw)
  const maxData = buildMaxData(gmRaw, i18nMap(enRaw), es)
  const conVariocolor = especiesConVariocolor(leekRaw)
  const pokemon = buildPokemon(pvpGm, es, moves, forms, megaEnergy, maxData, conVariocolor, i18nMap(enRaw))
  await soloMaxLiberados(pokemon, leekRaw)
  const cadenasFormas = cadenasDeFormasRegionales(gmRaw, pokemon, es, i18nMap(enRaw))
  for (const p of pokemon) if (cadenasFormas.has(p.id)) p.cadena = cadenasFormas.get(p.id)
  console.log(`  ${cadenasFormas.size} formas regionales con cadena propia`)
  console.log(`  ${maxData.dinamax.size} pueden Dinamax, ${maxData.gigamax.size} Gigamax`)
  console.log(`  ${megaEnergy.size} megas con coste de energía`)

  const withOwnSprite = pokemon.filter((p) => p.spriteId !== p.dex).length
  console.log(`  ${withOwnSprite} formas con sprite propio de ${pokemon.length}`)

  const data = {
    'typechart.json': {
      order: TYPE_ORDER,
      es: TYPE_ES,
      chart,
    },
    'moves.json': moves,
    'maxbattles.json': {
      moves: maxData.movimientos,
      byType: maxData.porTipo,
      gmaxBySpecies: maxData.gmaxPorEspecie,
      upgradeCosts: maxData.costes,
    },
    'roster.json': pokemon,
    'pvp.json': {
      great: trimRankings(great, pokemon, 400),
      ultra: trimRankings(ultra, pokemon, 400),
      master: trimRankings(master, pokemon, 400),
    },
    'texts.json': buildTextDictionary(enRaw, esRaw),
    'meta.json': {
      generatedAt: new Date().toISOString(),
      gameMasterTimestamp: pvpGm.timestamp ?? null,
      counts: {
        pokemon: pokemon.length,
        released: pokemon.filter((p) => p.released).length,
        moves: Object.keys(moves).length,
      },
      cpmDrift: drift,
      sources: SOURCES,
    },
  }

  // Formas y disfraces (ver scripts/lib/formas.mjs). pokemon-go-api es solo
  // un respaldo en esta pasada: si no ha respondido, no se sube la fila y se
  // queda la de la vez anterior en vez de una vacía.
  const formas = buildFormas(pgaRaw, { es, en: i18nMap(enRaw), shinyLeekDuck: leekRaw })
  if (Object.keys(formas).length > 100) data['formas.json'] = formas
  else console.warn('  ⚠ sin pokemon-go-api: las formas se quedan como estaban')

  await fs.mkdir(OUT, { recursive: true })
  console.log('\nEscribiendo public/data/')
  for (const [file, content] of Object.entries(data)) {
    const json = JSON.stringify(content)
    await fs.writeFile(path.join(OUT, file), json)
    console.log(`  ${file.padEnd(14)} ${(json.length / 1024).toFixed(0)} KB`)
  }

  await uploadToSupabase(data, pokemon, conVariocolor, gmRaw, enRaw, esRaw)

  console.log(`\n${pokemon.length} Pokémon (${data['meta.json'].counts.released} disponibles), ` +
    `${Object.keys(moves).length} movimientos.`)
}

main().catch((err) => {
  console.error('\nHa fallado la generación de datos:', err.message)
  process.exit(1)
})
