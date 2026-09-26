<script setup>
/**
 * Dónde sale ahora mismo este Pokémon: incursiones, huevos, misiones y
 * combates Max.
 *
 * Va lo primero de la ficha porque caduca. Cuando no sale en ningún sitio
 * también se dice, que es justo lo que se necesita saber antes de ponerse a
 * buscarlo, y se espera a que carguen los datos en vivo para no afirmar que
 * no se consigue mientras todavía no se sabe.
 *
 * Cada insignia lleva a «Ahora en juego» con ese Pokémon señalado: antes
 * decía «sale en incursiones» y tocaba ir a buscarlo a ojo entre cincuenta
 * tarjetas.
 */
import { computed } from 'vue'
import { useLiveStore } from '../../stores/live'
import { useGameDataStore } from '../../stores/gameData'
import FichaSeccion from './FichaSeccion.vue'
import { useTranslate } from '../../composables/useTranslate'
import MaxMark from './MaxMark.vue'

const props = defineProps({
  pokemon: { type: Object, required: true }
})

const live = useLiveStore()
const { t } = useTranslate()
const gameData = useGameDataStore()

const whereToFind = computed(() => live.whereToFind(props.pokemon.name))

/**
 * Combates Max en los que sale. No viene de LeekDuck como el resto: los nodos
 * energéticos no los publica, y sin esto la ficha de Articuno decía que no se
 * conseguía en ningún sitio estando de jefe Max. Puede salir en más de un
 * nivel, así que se listan todos.
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

const irA = (pestana) => ({
  path: '/ahora',
  query: { tab: pestana, dex: props.pokemon.pokemon_id }
})

const plainText = (html) =>
  gameData.translateText(String(html).replace(/<[^>]*>/g, '').trim())

/** Plegada, la sección dice de dónde sale ahora, sin el detalle. */
const resumen = computed(() => {
  if (!hasWhereToFind.value) return t('pokemon.notAvailableNow')
  const where = whereToFind.value
  return [
    enCombatesMax.value.length && t('pokemon.inMaxBattles'),
    where.raids.length && t('pokemon.inRaids'),
    where.eggs.length && t('pokemon.inEggs'),
    where.research.length && t('pokemon.inResearch')
  ].filter(Boolean).join(' · ')
})
</script>

<template>
  <ficha-seccion v-if="live.status === 'ready'" id="donde" :title="$t('pokemon.whereToFind')" :summary="resumen">

    <p v-if="!hasWhereToFind" class="mt-2 text-xs text-gray-600 dark:text-gray-300">
      {{ $t('pokemon.notAvailableNow') }}
    </p>

    <template v-else>
      <div v-if="enCombatesMax.length" class="mt-3">
        <span class="text-mini text-gray-600 dark:text-gray-300">
          {{ $t('pokemon.inMaxBattles') }}
        </span>
        <div class="flex flex-wrap gap-2 mt-1">
          <router-link
            v-for="uno in enCombatesMax"
            :key="`max-${uno.tier}`"
            :to="irA('max')"
            class="flex items-center gap-1.5 px-2 py-1 text-xs rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 hover:dark:bg-gray-800"
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
          </router-link>
        </div>
      </div>

      <div v-if="whereToFind.raids.length" class="mt-3">
        <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('pokemon.inRaids') }}</span>
        <div class="flex flex-wrap gap-2 mt-1">
          <router-link
            v-for="boss in whereToFind.raids"
            :key="boss.name"
            :to="irA('raids')"
            class="flex items-center gap-1 px-2 py-1 text-xs rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 hover:dark:bg-gray-800"
          >
            <img :src="boss.image" :alt="boss.name" class="w-6 h-6" loading="lazy" />
            {{ boss.name }}
          </router-link>
        </div>
      </div>

      <div v-if="whereToFind.eggs.length" class="mt-3">
        <span class="text-mini text-gray-600 dark:text-gray-300">{{ $t('pokemon.inEggs') }}</span>
        <div class="flex flex-wrap gap-2 mt-1">
          <router-link
            v-for="egg in whereToFind.eggs"
            :key="`${egg.eggType}-${egg.name}`"
            :to="irA('eggs')"
            class="px-2 py-1 text-xs rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 hover:dark:bg-gray-800"
          >
            {{ egg.eggType }} · {{ $t('raids.cpRange') }} {{ egg.combatPower.min }}
          </router-link>
        </div>
      </div>

      <div v-if="whereToFind.research.length" class="mt-3">
        <span class="text-mini text-gray-600 dark:text-gray-300">
          {{ $t('pokemon.inResearch') }}
        </span>
        <ul class="mt-1 flex flex-col gap-1">
          <li
            v-for="(task, index) in whereToFind.research"
            :key="index"
            class="text-xs text-gray-600 dark:text-gray-300"
          >
            {{ plainText(task.text) }}
          </li>
        </ul>
      </div>
    </template>
  </ficha-seccion>

</template>
