<script setup>
import { computed } from 'vue'
import { useGameDataStore } from '../../stores/gameData'
import { useLiveStore } from '../../stores/live'
import BaseCard from '../base/BaseCard.vue'
import TypeIcons from '../base/TypeIcons.vue'
import MoveTag from './MoveTag.vue'
import MoveLegend from './MoveLegend.vue'
import MaxMark from './MaxMark.vue'
import { useTranslate } from '../../composables/useTranslate'
import { describeMoveEffect, effectChanceLabel } from '../../utils/moveEffect'
import { calcCP } from '../../utils/formulas'

const props = defineProps({
  pokemon: { type: Object, required: true },
  /** Id de forma del roster (mega, primigenia…) para mostrar esa en concreto. */
  formId: { type: String, default: null }
})

const gameData = useGameDataStore()
const live = useLiveStore()
const { t, locale } = useTranslate()

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

const cpTable = computed(() => {
  if (!gameData.isReady) return []
  if (form.value) {
    const ivs = { atk: 15, def: 15, hp: 15 }
    return [20, 25, 30, 35, 40, 50].map((level) => ({
      level,
      cp: calcCP(form.value.stats, ivs, level)
    }))
  }
  return props.pokemon.stats ? gameData.perfectCP(props.pokemon.stats) : []
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
const maxInfo = computed(() =>
  gameData.isReady && asRosterEntry.value ? gameData.maxInfoFor(asRosterEntry.value) : null
)

/**
 * Coste de subir un movimiento Max de nivel, aplanado para la tabla.
 *
 * El primer nivel viene con un coste simbólico (1 partícula, 1 caramelo)
 * porque es el desbloqueo, así que se enseña tal cual: forma parte del total
 * que hay que pagar.
 */
const SLOTS = [
  { key: 'attack', label: 'max.slotAttack' },
  { key: 'guard', label: 'max.slotGuard' },
  { key: 'spirit', label: 'max.slotSpirit' }
]

const upgradeRows = computed(() => {
  const costs = maxInfo.value?.costs
  if (!costs) return []
  return SLOTS.map(({ key, label }) => {
    const niveles = costs[key] ?? []
    return {
      key,
      label: t(label),
      total: {
        mp: niveles.reduce((suma, n) => suma + (n.mpCost ?? 0), 0),
        candy: niveles.reduce((suma, n) => suma + (n.candyCost ?? 0), 0),
        xl: niveles.reduce((suma, n) => suma + (n.xlCandyCost ?? 0), 0)
      },
      levels: niveles.length
    }
  }).filter((fila) => fila.levels > 0)
})

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

  if (third?.candy_required) {
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
 * porque el script que repuebla la tabla nunca lo rellena.
 */
const flags = computed(() => {
  const p = props.pokemon
  return [
    !p.is_tradeable && 'notTradeable',
    !p.is_transferable && 'notTransferable',
    p.is_possible_ditto && 'possibleDitto',
    p.is_pvp_exclusive && 'pvpExclusive',
    p.is_shadow_released && 'canBeShadow'
  ].filter(Boolean)
})

const formatNumber = (value) => new Intl.NumberFormat(locale.value).format(value)

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
      const percent = effectChanceLabel(effect.chance, locale.value)

      return {
        id: move.id,
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

const whereToFind = computed(() => live.whereToFind(props.pokemon.name))

/**
 * Combates Max en los que sale ahora mismo.
 *
 * Esto no viene de LeekDuck como el resto de «dónde conseguirlo»: los nodos
 * energéticos no los publica, y sin esto la ficha de Articuno decía que no se
 * conseguía en ningún sitio estando de jefe Max.
 *
 * Puede aparecer en más de un nivel, así que se listan todos.
 */
const enCombatesMax = computed(() =>
  (gameData.maxLive?.pokemon ?? []).filter((uno) => uno.dex === props.pokemon.pokemon_id)
)

const hasWhereToFind = computed(() => {
  const where = whereToFind.value
  return (
    where.raids.length ||
    where.eggs.length ||
    where.research.length ||
    enCombatesMax.value.length
  )
})

const plainText = (html) =>
  gameData.translateText(String(html).replace(/<[^>]*>/g, '').trim())
</script>

<template>
  <div class="mt-10 flex flex-col gap-4 text-gray-800 dark:text-gray-200">
    <!--
      Dónde conseguirlo: va lo primero porque caduca. Cuando no sale en ningún
      sitio también se dice, que es justo lo que el jugador necesita saber
      antes de ponerse a buscarlo. Espera a que carguen los datos en vivo para
      no afirmar que no se consigue mientras todavía no se sabe.
    -->
    <base-card v-if="live.status === 'ready'">
      <h3 class="text-sm font-bold">{{ $t('pokemon.whereToFind') }}</h3>

      <p v-if="!hasWhereToFind" class="mt-2 text-xs text-gray-600 dark:text-gray-400">
        {{ $t('pokemon.notAvailableNow') }}
      </p>

      <template v-else>
        <div v-if="enCombatesMax.length" class="mt-3">
          <span class="text-mini text-gray-500 dark:text-gray-400">
            {{ $t('pokemon.inMaxBattles') }}
          </span>
          <div class="flex flex-wrap gap-2 mt-1">
            <span
              v-for="uno in enCombatesMax"
              :key="`max-${uno.tier}`"
              class="flex items-center gap-1.5 px-2 py-1 text-xs rounded-xl border border-gray-300 dark:border-gray-600"
            >
              <max-mark
                :variant="uno.gigantamax ? 'gigantamax' : 'dynamax'"
                :size="14"
                class="shrink-0"
              />
              {{ $t('max.tier', { n: uno.tier }) }}
              <template v-if="uno.cp">
                · {{ $t('raids.cpRange') }} {{ uno.cp.min }}–{{ uno.cp.max }}
              </template>
            </span>
          </div>
        </div>

        <div v-if="whereToFind.raids.length" class="mt-3">
          <span class="text-mini text-gray-500 dark:text-gray-400">{{ $t('pokemon.inRaids') }}</span>
          <div class="flex flex-wrap gap-2 mt-1">
            <span
              v-for="boss in whereToFind.raids"
              :key="boss.name"
              class="flex items-center gap-1 px-2 py-1 text-xs rounded-xl border border-gray-300 dark:border-gray-600"
            >
              <img :src="boss.image" :alt="boss.name" class="w-6 h-6" loading="lazy" />
              {{ boss.name }}
            </span>
          </div>
        </div>

        <div v-if="whereToFind.eggs.length" class="mt-3">
          <span class="text-mini text-gray-500 dark:text-gray-400">{{ $t('pokemon.inEggs') }}</span>
          <div class="flex flex-wrap gap-2 mt-1">
            <span
              v-for="egg in whereToFind.eggs"
              :key="`${egg.eggType}-${egg.name}`"
              class="px-2 py-1 text-xs rounded-xl border border-gray-300 dark:border-gray-600"
            >
              {{ egg.eggType }} · {{ $t('raids.cpRange') }} {{ egg.combatPower.min }}
            </span>
          </div>
        </div>

        <div v-if="whereToFind.research.length" class="mt-3">
          <span class="text-mini text-gray-500 dark:text-gray-400">
            {{ $t('pokemon.inResearch') }}
          </span>
          <ul class="mt-1 flex flex-col gap-1">
            <li
              v-for="(task, index) in whereToFind.research"
              :key="index"
              class="text-xs text-gray-600 dark:text-gray-400"
            >
              {{ plainText(task.text) }}
            </li>
          </ul>
        </div>
      </template>
    </base-card>

    <!-- ---------- Avisos y costes ---------- -->
    <base-card v-if="flags.length || costs.length">
      <div v-if="flags.length" :class="costs.length ? 'mb-4' : ''">
        <h3 class="text-sm font-bold">{{ $t('pokemon.status') }}</h3>
        <div class="flex flex-wrap gap-1.5 mt-2">
          <span
            v-for="flag in flags"
            :key="flag"
            class="px-2 py-0.5 text-mini rounded-full border border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300"
          >
            {{ $t(`pokemon.flags.${flag}`) }}
          </span>
        </div>
      </div>

      <div v-if="costs.length">
        <h3 class="text-sm font-bold">{{ $t('pokemon.costs') }}</h3>
        <ul class="mt-2 flex flex-col gap-1.5">
          <li
            v-for="row in costs"
            :key="row.key"
            class="flex items-center gap-2 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
          >
            <span class="flex-1 min-w-0">{{ $t(`pokemon.costLabels.${row.key}`) }}</span>
            <strong class="shrink-0 whitespace-nowrap">
              <template v-if="row.candy">
                {{ formatNumber(row.candy) }} {{ $tc('candy', row.candy).toLowerCase() }}<template v-if="row.dust"> · {{ formatNumber(row.dust) }} {{ $t('pokemon.stardust') }}</template>
              </template>
              <template v-else-if="row.energy">
                {{ formatNumber(row.energy) }} {{ $t('megaenergy') }}
              </template>
              <template v-else>
                {{ formatNumber(row.km) }} {{ $t('unitDistance') }}
              </template>
            </strong>
          </li>
        </ul>
      </div>
    </base-card>

    <!-- ---------- Combates Max ---------- -->
    <base-card v-if="maxInfo">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-bold">{{ $t('max.title') }}</h3>
        <span class="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
          <max-mark variant="dynamax" :size="18" />
          <max-mark v-if="maxInfo.gigantamax" variant="gigantamax" :size="18" />
        </span>
      </div>

      <p class="mt-2 text-xs text-gray-600 dark:text-gray-400">
        {{ $t('max.intro') }}
      </p>

      <!--
        El ataque Max no se elige: lo marca el tipo principal. Por eso se
        enseña como un dato, no como una lista de opciones.
      -->
      <dl class="mt-3 flex flex-col gap-2">
        <div
          v-if="maxInfo.maxMove"
          class="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
        >
          <dt class="text-xs text-gray-600 dark:text-gray-400">{{ $t('max.maxMove') }}</dt>
          <dd class="flex items-center gap-2 text-sm font-semibold">
            <type-icons :types="[maxInfo.maxMove.type]" size="16" />
            {{ locale() === 'en' ? maxInfo.maxMove.name : maxInfo.maxMove.nameEs }}
          </dd>
        </div>

        <div
          v-if="maxInfo.gmaxMove"
          class="flex items-center justify-between gap-2 p-2 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950 border border-fuchsia-300 dark:border-fuchsia-800"
        >
          <dt class="text-xs text-gray-700 dark:text-gray-300">{{ $t('max.gmaxMove') }}</dt>
          <dd class="flex items-center gap-2 text-sm font-semibold">
            <type-icons :types="[maxInfo.gmaxMove.type]" size="16" />
            {{ locale() === 'en' ? maxInfo.gmaxMove.name : maxInfo.gmaxMove.nameEs }}
          </dd>
        </div>
      </dl>

      <!--
        Coste total de dejar cada movimiento Max al máximo. Se da el total y no
        el desglose por nivel porque lo que se decide antes de empezar es si
        merece la pena gastarse las partículas en este Pokémon.
      -->
      <div v-if="upgradeRows.length" class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <h4 class="text-xs font-bold text-gray-700 dark:text-gray-300">
          {{ $t('max.upgradeTitle') }}
        </h4>
        <ul class="mt-2 flex flex-col gap-1.5">
          <li
            v-for="row in upgradeRows"
            :key="row.key"
            class="flex items-center justify-between gap-2 text-xs"
          >
            <span class="font-semibold">{{ row.label }}</span>
            <span class="text-gray-600 dark:text-gray-400 text-right">
              {{ row.total.mp }} {{ $t('max.particles') }}
              <template v-if="row.total.candy"> · {{ row.total.candy }} {{ $t('max.candy') }}</template>
              <template v-if="row.total.xl"> · {{ row.total.xl }} {{ $t('max.candyXl') }}</template>
            </span>
          </li>
        </ul>
        <p class="mt-2 text-mini text-gray-500 dark:text-gray-400">
          {{ $t('max.upgradeNote') }}
        </p>
      </div>
    </base-card>

    <!-- ---------- PC de un 100 % ---------- -->
    <base-card v-if="cpTable.length">
      <h3 class="text-sm font-bold">{{ $t('pokemon.cp100') }}</h3>

      <dl class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
        <div
          v-for="row in cpTable"
          :key="row.level"
          class="p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
        >
          <dt class="text-mini text-gray-500 dark:text-gray-400">
            Nv. {{ row.level }} · {{ $t(CP_LABELS[row.level]) }}
          </dt>
          <dd class="text-lg font-bold">{{ row.cp }}</dd>
        </div>
      </dl>
    </base-card>

    <!--
      Puestos en los rankings. En móvil van uno debajo de otro con el PvE
      arriba, que es lo que más se consulta; desde md caben en dos columnas.
    -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- ---------- Puesto en PvE ---------- -->
      <base-card>
        <h3 class="text-sm font-bold">{{ $t('pokemon.pveRanks') }}</h3>

        <p
          v-if="!pveRanks.byType.length"
          class="mt-2 text-mini text-gray-500 dark:text-gray-400"
        >
          {{ $t('pokemon.noPveRank') }}
        </p>

        <template v-else>
          <p v-if="pveRanks.overall" class="mt-2 text-mini text-gray-500 dark:text-gray-400">
            {{ $t('top.overall') }}: <strong>#{{ pveRanks.overall.rank }}</strong>
          </p>

          <ul class="mt-2 flex flex-col gap-1.5">
            <li
              v-for="entry in pveRanks.byType"
              :key="`${entry.type}-${entry.id}`"
              class="flex items-center gap-2 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
            >
              <type-icons :types="[entry.type]" size="13" />
              <span class="font-semibold">{{ $t(`types.${entry.type}`) }}</span>
              <span class="text-gray-500 dark:text-gray-400 truncate">{{ entry.nameEs }}</span>
              <span class="ml-auto shrink-0">
                #{{ entry.rank }} · <strong>{{ entry.dps.toFixed(1) }}</strong>
              </span>
            </li>
          </ul>
        </template>
      </base-card>

      <!-- ---------- Puesto en PvP ---------- -->
      <base-card>
        <h3 class="text-sm font-bold">{{ $t('pokemon.pvpRanks') }}</h3>

        <p v-if="!pvpRanks.length" class="mt-2 text-mini text-gray-500 dark:text-gray-400">
          {{ $t('pokemon.noPvpRank') }}
        </p>

        <ul v-else class="mt-2 flex flex-col gap-1.5">
          <li
            v-for="entry in pvpRanks"
            :key="`${entry.league}-${entry.id}`"
            class="flex items-center gap-2 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
          >
            <span class="font-semibold">{{ $t(`top.${entry.league}`) }}</span>
            <span class="text-gray-500 dark:text-gray-400 truncate">{{ entry.nameEs }}</span>
            <span class="ml-auto shrink-0">
              #{{ entry.rank }} · <strong>{{ entry.score.toFixed(1) }}</strong>
            </span>
          </li>
        </ul>
      </base-card>
    </div>

    <!-- ---------- Mejores ataques ---------- -->
    <base-card v-if="bestMovesets.length">
      <h3 class="text-sm font-bold">{{ $t('pokemon.bestMoves') }}</h3>
      <ol class="mt-2 flex flex-col gap-1.5">
        <li
          v-for="set in bestMovesets"
          :key="`${set.fast.id}-${set.charged.id}`"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
        >
          <move-tag
            chip
            :name="set.fast.nameEs"
            :type="set.fast.type"
            size="11"
            :elite="set.fast.elite"
            :legacy="set.fast.legacy"
          />
          <move-tag
            chip
            :name="set.charged.nameEs"
            :type="set.charged.type"
            size="11"
            :elite="set.charged.elite"
            :legacy="set.charged.legacy"
            :mega="set.charged.mega"
          />
          <span class="ml-auto font-bold">{{ set.dps.toFixed(1) }} DPS</span>
        </li>
      </ol>

      <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <span class="text-mini text-gray-500 dark:text-gray-400">{{ $t('pokemon.fastMoves') }}</span>
        <div class="flex flex-wrap gap-1 mt-1">
          <move-tag
            v-for="move in movepool.fast"
            :key="move.id"
            chip
            :name="move.nameEs"
            :type="move.type"
            :elite="move.elite"
            :legacy="move.legacy"
          />
        </div>

        <span class="block mt-2 text-mini text-gray-500 dark:text-gray-400">
          {{ $t('pokemon.chargedMoves') }}
        </span>
        <div class="flex flex-wrap gap-1 mt-1">
          <move-tag
            v-for="move in movepool.charged"
            :key="move.id"
            chip
            :name="move.nameEs"
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
    </base-card>

    <!-- ---------- Efectos de los ataques en PvP ---------- -->
    <base-card v-if="moveEffects.length">
      <h3 class="text-sm font-bold">{{ $t('moves.effectsTitle') }}</h3>
      <ul class="mt-2 flex flex-col gap-1.5">
        <li
          v-for="move in moveEffects"
          :key="move.id"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
        >
          <move-tag
            :name="move.nameEs"
            :type="move.type"
            size="11"
            :elite="move.elite"
            :legacy="move.legacy"
            :mega="move.mega"
          />
          <span class="text-gray-700 dark:text-gray-300">{{ move.text }}</span>
          <span v-if="move.chance" class="ml-auto text-mini text-gray-500 dark:text-gray-400">
            {{ move.chance }}
          </span>
        </li>
      </ul>
    </base-card>

    <!-- ---------- Debilidades y resistencias ---------- -->
    <base-card v-if="matchups.weak.length || matchups.resist.length">
      <h3 class="text-sm font-bold">{{ $t('pokemon.weaknesses') }}</h3>
      <div class="flex flex-wrap gap-2 mt-2">
        <span
          v-for="entry in matchups.weak"
          :key="entry.type"
          class="flex items-center gap-1 px-2 py-1 text-mini rounded-xl border border-gray-300 dark:border-gray-600"
        >
          <type-icons :types="[entry.type]" size="13" with-label />
          <span class="text-gray-500">×{{ entry.mult.toFixed(2) }}</span>
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
          <span class="text-gray-500">×{{ entry.mult.toFixed(2) }}</span>
        </span>
      </div>
    </base-card>

  </div>
</template>
