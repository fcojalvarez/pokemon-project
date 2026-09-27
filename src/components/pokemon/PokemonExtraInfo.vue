<script setup>
import { computed } from 'vue'
import { useGameDataStore } from '../../stores/gameData'
import FichaSeccion from './FichaSeccion.vue'
import TypeIcons from '../base/TypeIcons.vue'
import MoveTag from './MoveTag.vue'
import MoveLegend from './MoveLegend.vue'
import WhereToFind from './WhereToFind.vue'
import MaxBattlePanel from './MaxBattlePanel.vue'
import { useTranslate } from '../../composables/useTranslate'
import { describeMoveEffect, effectChanceLabel } from '../../utils/moveEffect'
import { calcCP } from '../../utils/formulas'

const props = defineProps({
  pokemon: { type: Object, required: true },
  /** Id de forma del roster (mega, primigenia…) para mostrar esa en concreto. */
  formId: { type: String, default: null }
})

const gameData = useGameDataStore()
const { t, tc, localName, intlLocale } = useTranslate()

const CP_LABELS = {
  20: 'pokemon.cpLevel20',
  25: 'pokemon.cpLevel25',
  30: 'pokemon.cpLevel30',
  35: 'pokemon.cpLevel35',
  40: 'pokemon.cpLevel40',
  50: 'pokemon.cpLevel50'
}

const form = computed(() =>
  props.formId && gameData.isReady ? gameData.byId.get(props.formId) ?? null : null
)

/**
 * La especie en el roster, que sale del GAME_MASTER y se regenera cada día.
 * De aquí salen los ataques, las estadísticas y el coste del segundo ataque:
 * en la tabla `pokemons` eran de la siembra y se habían quedado atrás (a 511
 * especies les faltaban ataques nuevos, y las más recientes tenían las
 * estadísticas a cero). La tabla queda de respaldo por si el roster no la trae.
 *
 * Se busca la forma que se llama como la especie (charizard, no charizard_x);
 * si no hay, la primera que no sea mega, oscura ni regional.
 */
const baseDelRoster = computed(() => {
  if (!gameData.isReady) return null
  const formas = (gameData.formsByDex.get(props.pokemon.pokemon_id) ?? []).filter(
    (entry) => !entry.mega && !entry.shadow && !entry.regional
  )
  const nombre = String(props.pokemon.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return formas.find((entry) => entry.id === nombre) ?? formas[0] ?? null
})

const cpTable = computed(() => {
  if (!gameData.isReady) return []
  const stats = form.value?.stats ?? (baseDelRoster.value?.stats?.atk ? baseDelRoster.value.stats : null)
  if (stats) {
    const ivs = { atk: 15, def: 15, hp: 15 }
    return [20, 25, 30, 35, 40, 50].map((level) => ({
      level,
      cp: calcCP(stats, ivs, level)
    }))
  }
  return props.pokemon.stats?.base_attack ? gameData.perfectCP(props.pokemon.stats) : []
})

const matchups = computed(() => {
  const types = form.value?.types ?? props.pokemon.types
  return gameData.isReady && types?.length ? gameData.matchups(types) : { weak: [], resist: [] }
})

/**
 * El Pokémon con la forma que usa el motor de rankings, construido a partir de
 * lo que ya guarda Supabase: así la ficha no depende de encontrarlo en el
 * roster generado.
 */
const asRosterEntry = computed(() => {
  if (form.value) return form.value
  if (baseDelRoster.value) return baseDelRoster.value

  // Sin roster (aún cargando o especie que no trae): lo que haya en la tabla.

  const { stats, moves, types } = props.pokemon
  if (!stats || !moves) return null
  // Supabase guarda "dragon tail" y el GAME_MASTER lo identifica como
  // DRAGON_TAIL: sin esta normalización solo casarían los de una palabra.
  const toMoveId = (move) => move.toUpperCase().replace(/[\s-]+/g, '_').replace(/[^A-Z0-9_]/g, '')
  const upper = (list) => (list ?? []).map(toMoveId)

  // Supabase ya separa los élite, pero no sabe de legacy: eso solo está en el
  // roster generado. Se coge de la forma base, si es que aparece.
  const base = gameData.isReady
    ? (gameData.formsByDex.get(props.pokemon.pokemon_id) ?? []).find(
        (entry) => !entry.mega && !entry.shadow && !entry.regional
      )
    : null

  return {
    id: `dex-${props.pokemon.pokemon_id}`,
    dex: props.pokemon.pokemon_id,
    name: props.pokemon.name,
    nameEs: props.pokemon.name,
    types: types ?? [],
    stats: { atk: stats.base_attack, def: stats.base_defense, hp: stats.base_stamina },
    fast: [...upper(moves.fast), ...upper(moves.elite_fast)],
    charged: [...upper(moves.charged), ...upper(moves.elite_charged)],
    eliteMoves: [...upper(moves.elite_fast), ...upper(moves.elite_charged)],
    legacyMoves: base?.legacyMoves ?? [],
    released: true,
    shadow: false,
    mega: false,
    // De los combates Max solo sabe el roster generado: Supabase guarda el
    // `can_dynamax` de la especie, pero no de qué grupo de coste es.
    dynamax: base?.dynamax ?? false,
    gigantamax: base?.gigantamax ?? false,
    maxCostGroup: base?.maxCostGroup ?? null
  }
})

/**
 * Datos de combates Max del Pokémon que se está viendo, o null si no puede
 * dinamaxizar. Las megas y los oscuros entran siempre por aquí con null, que
 * es lo correcto: en el juego son formas incompatibles con dinamaxizar.
 */
const bestMovesets = computed(() =>
  gameData.isReady && asRosterEntry.value ? gameData.bestMovesets(asRosterEntry.value, 5) : []
)

const movepool = computed(() => {
  const entry = asRosterEntry.value
  if (!entry || !gameData.isReady) return { fast: [], charged: [], hasElite: false, hasLegacy: false, hasMega: false }

  const elite = new Set(entry.eliteMoves ?? [])
  const legacy = new Set(entry.legacyMoves ?? [])
  const mega = new Set(entry.megaMoves ?? [])
  const pick = (ids) =>
    ids
      .map((id) => {
        const move = gameData.moves[id]
        return move && { ...move, elite: elite.has(id), legacy: legacy.has(id), mega: mega.has(id) }
      })
      .filter(Boolean)

  // El exclusivo de la supermega va con los cargados: para el jugador es un
  // ataque más de los que puede llevar, aunque no entre en los rankings.
  const charged = pick([...entry.charged, ...(entry.megaMoves ?? [])])
  const fast = pick(entry.fast)
  const all = [...fast, ...charged]

  return {
    fast,
    charged,
    hasElite: all.some((move) => move.elite),
    hasLegacy: all.some((move) => move.legacy),
    hasMega: all.some((move) => move.mega)
  }
})

/**
 * Lo que hay que gastar con este Pokémon. Todo sale de columnas que Supabase
 * ya guardaba y no se enseñaban.
 */
const costs = computed(() => {
  const { third_move: third, shadow_info: shadow, buddy } = props.pokemon
  const rows = []

  // El coste del segundo ataque, del roster (en polvo; los caramelos van a la
  // par). En la tabla había especies con el polvo a 0.
  const polvo = baseDelRoster.value?.thirdMoveCost
  const CARAMELOS = { 10000: 25, 50000: 50, 75000: 75, 100000: 100 }
  if (polvo) {
    rows.push({ key: 'secondCharged', candy: CARAMELOS[polvo] ?? third?.candy_required ?? null, dust: polvo })
  } else if (third?.candy_required) {
    // Sí, en la base de datos la columna se llama "startdust_required".
    rows.push({
      key: 'secondCharged',
      candy: third.candy_required,
      dust: third.startdust_required ?? null
    })
  }

  if (props.pokemon.is_shadow_released && shadow?.candy_required_purification) {
    rows.push({
      key: 'purify',
      candy: shadow.candy_required_purification,
      dust: shadow.stardust_required_purification ?? null
    })
  }

  // El coste de megaevolucionar vive en el roster generado, no en Supabase.
  const mega = gameData.isReady
    ? (gameData.formsByDex.get(props.pokemon.pokemon_id) ?? [])
        .find((form) => form.mega && form.megaEnergy)
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
  const p = props.pokemon
  return [
    !p.is_tradeable && 'notTradeable',
    !p.is_transferable && 'notTransferable',
    p.is_shadow_released && 'canBeShadow'
  ].filter(Boolean)
})

const formatNumber = (value) => new Intl.NumberFormat(intlLocale()).format(value)

/**
 * Ataques de este Pokémon que hacen algo además de daño, con el efecto ya
 * redactado. Solo los que tienen efecto: listarlos todos sería una tabla
 * enorme en la que no se vería lo que importa.
 */
const moveEffects = computed(() => {
  const pool = [...movepool.value.fast, ...movepool.value.charged]

  return pool
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
})

const pveRanks = computed(() => {
  if (!gameData.isReady) return { overall: null, byType: [] }
  const ranks = gameData.pveRanksFor(props.pokemon.pokemon_id)
  if (!form.value) return ranks
  // Viendo una forma concreta solo interesan sus propios puestos.
  return {
    overall: ranks.overall?.id === form.value.id ? ranks.overall : null,
    byType: ranks.byType.filter((entry) => entry.id === form.value.id)
  }
})

const pvpRanks = computed(() => {
  if (!gameData.isReady) return []
  const ranks = gameData.pvpRanksFor(props.pokemon.pokemon_id)
  return form.value ? ranks.filter((entry) => entry.id === form.value.id) : ranks
})


/**
 * La línea que enseña cada sección plegada: lo que más se viene a buscar, para
 * que muchas veces no haga falta abrirla.
 */
const costeTexto = (row) => {
  if (row.candy) return `${formatNumber(row.candy)} ${tc('candy', row.candy).toLowerCase()}${row.dust ? ` · ${formatNumber(row.dust)} ${t('pokemon.stardust')}` : ''}`
  if (row.energy) return `${formatNumber(row.energy)} ${t('megaenergy')}`
  return `${formatNumber(row.km)} ${t('unitDistance')}`
}
const resumen = computed(() => {
  const r = {}
  const avisos = flags.value.map((flag) => t(`pokemon.flags.${flag}`))
  const primerCoste = costs.value[0]
  r.costes = [...avisos, primerCoste && `${t(`pokemon.costLabels.${primerCoste.key}`)}: ${costeTexto(primerCoste)}`]
    .filter(Boolean).join(' · ')
  if (cpTable.value.length) {
    const primero = cpTable.value[0]
    const ultimo = cpTable.value[cpTable.value.length - 1]
    r.pc = `${t('common.levelShort')} ${primero.level}: ${primero.cp} · ${t('common.levelShort')} ${ultimo.level}: ${ultimo.cp}`
  }
  const pve = pveRanks.value
  r.pve = pve.byType.length
    ? [pve.overall && `${t('top.overall')}: #${pve.overall.rank}`, `${t(`types.${pve.byType[0].type}`)} #${pve.byType[0].rank}`].filter(Boolean).join(' · ')
    : t('pokemon.noPveRank')
  r.pvp = pvpRanks.value.length
    ? pvpRanks.value.slice(0, 2).map((entry) => `${t(`top.${entry.league}`)} #${entry.rank}`).join(' · ')
    : t('pokemon.noPvpRank')
  const mejor = bestMovesets.value[0]
  if (mejor) r.ataques = `${localName(mejor.fast)} + ${localName(mejor.charged)} · ${mejor.dps.toFixed(1)} DPS`
  else r.ataques = [...movepool.value.fast, ...movepool.value.charged].map(localName).join(' · ')
  const efecto = moveEffects.value[0]
  if (efecto) r.efectos = `${localName(efecto)}: ${efecto.text}${moveEffects.value.length > 1 ? ` · +${moveEffects.value.length - 1}` : ''}`
  r.debilidades = matchups.value.weak.slice(0, 3)
    .map((entry) => `${t(`types.${entry.type}`)} ×${entry.mult.toFixed(2)}`).join(' · ')
  return r
})
</script>

<template>
  <!--
    Dos columnas desde lg. A la izquierda, cómo se consigue y qué cuesta; a la
    derecha, cómo combate. En móvil, una detrás de otra en ese mismo orden, y
    cada sección plegada con su resumen (ver <ficha-seccion>).
  -->
  <div class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start text-gray-800 dark:text-gray-200">
    <div class="flex flex-col gap-3 lg:gap-4 min-w-0">
      <!-- Va lo primero porque es lo único de la ficha que caduca. -->
      <where-to-find :pokemon="pokemon" />

      <!-- ---------- Avisos y costes ---------- -->
      <ficha-seccion
        v-if="flags.length || costs.length"
        id="costes"
        :title="flags.length && costs.length ? $t('pokemon.statusAndCosts') : flags.length ? $t('pokemon.status') : $t('pokemon.costs')"
        :summary="resumen.costes"
      >
        <div v-if="flags.length" :class="costs.length ? 'mb-4' : ''">
          <h3 v-if="costs.length" class="text-xs font-bold text-gray-600 dark:text-gray-300">{{ $t('pokemon.status') }}</h3>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span
              v-for="flag in flags"
              :key="flag"
              class="px-2 py-0.5 text-mini rounded-full border border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-300"
            >
              {{ $t(`pokemon.flags.${flag}`) }}
            </span>
          </div>
        </div>

        <div v-if="costs.length">
          <h3 v-if="flags.length" class="text-xs font-bold text-gray-600 dark:text-gray-300">{{ $t('pokemon.costs') }}</h3>
          <ul class="mt-2 flex flex-col gap-1.5">
            <!--
              flex-wrap: si etiqueta y valor no caben en una línea, el valor baja
              a la siguiente, a la derecha. Antes la etiqueta se encogía hasta
              cero y «Purificar» acababa debajo de «3 caramelos».
            -->
            <li
              v-for="row in costs"
              :key="row.key"
              class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
            >
              <span>{{ $t(`pokemon.costLabels.${row.key}`) }}</span>
              <strong class="ml-auto text-right whitespace-nowrap">{{ costeTexto(row) }}</strong>
            </li>
          </ul>
        </div>
      </ficha-seccion>

      <max-battle-panel :entry="asRosterEntry" />

      <!-- ---------- PC de un 100 % ---------- -->
      <ficha-seccion v-if="cpTable.length" id="pc" :title="$t('pokemon.cp100')" :summary="resumen.pc">
        <dl class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          <div
            v-for="row in cpTable"
            :key="row.level"
            class="p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
          >
            <dt class="text-mini text-gray-600 dark:text-gray-300">
              {{ $t('common.levelShort') }} {{ row.level }} · {{ $t(CP_LABELS[row.level]) }}
            </dt>
            <dd class="text-lg font-bold">{{ row.cp }}</dd>
          </div>
        </dl>
      </ficha-seccion>
    </div>

    <div class="flex flex-col gap-3 lg:gap-4 min-w-0">
      <!-- Puestos en los rankings: uno debajo de otro en móvil, en dos columnas desde sm. -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 items-start">
        <!-- ---------- Puesto en PvE ---------- -->
        <ficha-seccion id="pve" :title="$t('pokemon.pveRanks')" :summary="resumen.pve">
          <p
            v-if="!pveRanks.byType.length"
            class="mt-2 text-mini text-gray-600 dark:text-gray-300"
          >
            {{ $t('pokemon.noPveRank') }}
          </p>
          <template v-else>
            <p v-if="pveRanks.overall" class="mt-2 text-mini text-gray-600 dark:text-gray-300">
              {{ $t('top.overall') }}: <strong>#{{ pveRanks.overall.rank }}</strong>
            </p>
            <ul class="mt-2 flex flex-col gap-1.5">
              <!--
                En dos líneas: tipo y puesto arriba, la forma debajo a todo el
                ancho. En una sola, en la columna estrecha, «Pikachu 5.º
                aniversario» o «Mega Charizard Y» se partían a media palabra.
              -->
              <li
                v-for="entry in pveRanks.byType"
                :key="`${entry.type}-${entry.id}`"
                class="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
              >
                <span class="flex items-center gap-2">
                  <type-icons :types="[entry.type]" size="13" />
                  <span class="font-semibold">{{ $t(`types.${entry.type}`) }}</span>
                  <span class="ml-auto shrink-0">
                    #{{ entry.rank }} · <strong>{{ entry.dps.toFixed(1) }}</strong>
                  </span>
                </span>
                <span class="block mt-0.5 text-gray-600 dark:text-gray-300">{{ localName(entry) }}</span>
              </li>
            </ul>
          </template>
        </ficha-seccion>

        <!-- ---------- Puesto en PvP ---------- -->
        <ficha-seccion id="pvp" :title="$t('pokemon.pvpRanks')" :summary="resumen.pvp">
          <p v-if="!pvpRanks.length" class="mt-2 text-mini text-gray-600 dark:text-gray-300">
            {{ $t('pokemon.noPvpRank') }}
          </p>
          <ul v-else class="mt-2 flex flex-col gap-1.5">
            <li
              v-for="entry in pvpRanks"
              :key="`${entry.league}-${entry.id}`"
              class="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
            >
              <span class="flex items-center gap-2">
                <span class="font-semibold">{{ $t(`top.${entry.league}`) }}</span>
                <span class="ml-auto shrink-0">
                  #{{ entry.rank }} · <strong>{{ entry.score.toFixed(1) }}</strong>
                </span>
              </span>
              <span class="block mt-0.5 text-gray-600 dark:text-gray-300">{{ localName(entry) }}</span>
            </li>
          </ul>
        </ficha-seccion>
      </div>

      <!-- ---------- Mejores ataques ----------
           Aunque no haya combinaciones que puntuar (Applin solo tiene
           Forcejeo, que no cuenta), la lista de ataques se enseña igual. -->
      <ficha-seccion v-if="bestMovesets.length || movepool.fast.length" id="ataques" :title="$t('pokemon.bestMoves')" :summary="resumen.ataques">
        <ol v-if="bestMovesets.length" class="mt-2 flex flex-col gap-1.5">
          <li
            v-for="set in bestMovesets"
            :key="`${set.fast.id}-${set.charged.id}`"
            class="flex flex-wrap items-center gap-x-3 gap-y-1 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
          >
            <move-tag
              chip
              :name="localName(set.fast)"
              :type="set.fast.type"
              size="11"
              :elite="set.fast.elite"
              :legacy="set.fast.legacy"
            />
            <move-tag
              chip
              :name="localName(set.charged)"
              :type="set.charged.type"
              size="11"
              :elite="set.charged.elite"
              :legacy="set.charged.legacy"
              :mega="set.charged.mega"
            />
            <span class="ml-auto font-bold">{{ set.dps.toFixed(1) }} DPS</span>
          </li>
        </ol>

        <div :class="bestMovesets.length ? 'mt-3 pt-3 border-t border-gray-300 dark:border-gray-700' : 'mt-2'">
          <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('pokemon.fastMoves') }}</span>
          <div class="flex flex-wrap gap-1 mt-1">
            <move-tag
              v-for="move in movepool.fast"
              :key="move.id"
              chip
              :name="localName(move)"
              :type="move.type"
              :elite="move.elite"
              :legacy="move.legacy"
            />
          </div>
          <span class="block mt-2 text-mini text-gray-600 dark:text-gray-300">
            {{ $t('pokemon.chargedMoves') }}
          </span>
          <div class="flex flex-wrap gap-1 mt-1">
            <move-tag
              v-for="move in movepool.charged"
              :key="move.id"
              chip
              :name="localName(move)"
              :type="move.type"
              :elite="move.elite"
              :legacy="move.legacy"
              :mega="move.mega"
            />
          </div>
          <move-legend
            v-if="movepool.hasElite || movepool.hasLegacy || movepool.hasMega"
            class="mt-3"
            :elite="movepool.hasElite"
            :legacy="movepool.hasLegacy"
            :mega="movepool.hasMega"
          />
        </div>
      </ficha-seccion>

      <!-- ---------- Efectos de los ataques en PvP ---------- -->
      <ficha-seccion v-if="moveEffects.length" id="efectos" :title="$t('moves.effectsTitle')" :summary="resumen.efectos">
        <ul class="mt-2 flex flex-col gap-1.5">
          <li
            v-for="move in moveEffects"
            :key="move.id"
            class="flex flex-wrap items-center gap-x-3 gap-y-1 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
          >
            <move-tag
              :name="localName(move)"
              :type="move.type"
              size="11"
              :elite="move.elite"
              :legacy="move.legacy"
              :mega="move.mega"
            />
            <span class="text-gray-600 dark:text-gray-300">{{ move.text }}</span>
            <span v-if="move.chance" class="ml-auto text-mini text-gray-600 dark:text-gray-300">
              {{ move.chance }}
            </span>
          </li>
        </ul>
      </ficha-seccion>

      <!-- ---------- Debilidades y resistencias ---------- -->
      <ficha-seccion
        v-if="matchups.weak.length || matchups.resist.length"
        id="debilidades"
        :title="$t('pokemon.weaknesses')"
        :summary="resumen.debilidades"
      >
        <div class="flex flex-wrap gap-2 mt-2">
          <span
            v-for="entry in matchups.weak"
            :key="entry.type"
            class="flex items-center gap-1 px-2 py-1 text-mini rounded-xl border border-gray-300 dark:border-gray-600"
          >
            <type-icons :types="[entry.type]" size="13" with-label />
            <span class="text-gray-600 dark:text-gray-300">×{{ entry.mult.toFixed(2) }}</span>
          </span>
        </div>

        <h3 class="text-sm font-bold mt-4">{{ $t('pokemon.resistances') }}</h3>
        <div class="flex flex-wrap gap-2 mt-2">
          <span
            v-for="entry in matchups.resist"
            :key="entry.type"
            class="flex items-center gap-1 px-2 py-1 text-mini rounded-xl border border-gray-300 dark:border-gray-600"
          >
            <type-icons :types="[entry.type]" size="13" with-label />
            <span class="text-gray-600 dark:text-gray-300">×{{ entry.mult.toFixed(2) }}</span>
          </span>
        </div>
      </ficha-seccion>
    </div>
  </div>
</template>
