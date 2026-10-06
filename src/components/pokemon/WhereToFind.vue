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
 *
 * Las formas que no se atrapan (Necrozma Alas del Alba, Zacian Espada
 * Suprema…) dicen cómo se consiguen: fusionando o cambiando de forma, con
 * dibujos y lo que hace falta. Antes decía que no estaba en incursiones.
 */
import { computed } from 'vue'
import { useLiveStore } from '../../stores/live'
import { useGameDataStore } from '../../stores/gameData'
import FichaSeccion from './FichaSeccion.vue'
import { useTranslate } from '../../composables/useTranslate'
import MaxMark from './MaxMark.vue'
import BaseSprite from '../base/BaseSprite.vue'
import ConversionDibujo from './ConversionDibujo.vue'
import { comoSeConsigue } from '../../utils/cambiosForma'
import { useConversion } from '../../composables/useConversion'

const props = defineProps({
  pokemon: { type: Object, required: true },
  /** La forma que se ve (la `entrada` de useFichaDatos). */
  entrada: { type: Object, default: null }
})

const { comoTexto, resumenTexto } = useConversion()
/** Si la forma solo se consigue fusionando o cambiando de forma, cómo. */
const conversion = computed(() => comoSeConsigue(props.entrada?.id))

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

/**
 * Ditto no sale nunca con su aspecto: en estado salvaje siempre va disfrazado
 * de otro Pokémon, y de cuáles va cambiando cada cierto tiempo. Decir que
 * «ahora mismo no está» era falso: se puede capturar siempre.
 */
const esDitto = computed(() => props.pokemon.pokemon_id === 132)

const hasWhereToFind = computed(() => {
  const where = whereToFind.value
  return (
    esDitto.value ||
    where.raids.length ||
    where.eggs.length ||
    where.research.length ||
    enCombatesMax.value.length
  )
})

const irA = (pestana) => ({
  path: '/live',
  query: { tab: pestana, dex: props.pokemon.pokemon_id }
})

const plainText = (html) =>
  gameData.translateText(
    String(html)
      .replace(/<[^>]*>/g, '')
      .trim()
  )

/** Plegada, la sección dice de dónde sale ahora, sin el detalle. */
const resumen = computed(() => {
  if (conversion.value) return resumenTexto(conversion.value)
  if (!hasWhereToFind.value) return t('pokemon.notAvailableNow')
  const where = whereToFind.value
  return [
    esDitto.value && t('pokemon.dittoWild'),
    enCombatesMax.value.length && t('pokemon.inMaxBattles'),
    where.raids.length && t('pokemon.inRaids'),
    where.eggs.length && t('pokemon.inEggs'),
    where.research.length && t('pokemon.inResearch')
  ]
    .filter(Boolean)
    .join(' · ')
})
</script>

<template>
  <ficha-seccion
    v-if="live.status === 'ready'"
    id="donde"
    :title="$t('pokemon.whereToFind')"
    :summary="resumen"
  >
    <!-- No se atrapa: cómo se consigue, con los dibujos de la fusión o el cambio. -->
    <div v-if="conversion" class="mt-2">
      <p class="text-xs text-gray-600 dark:text-gray-300">
        {{
          $t(
            conversion.tipo === 'fusion'
              ? 'pokemon.conversion.notCaughtFusion'
              : 'pokemon.conversion.notCaughtCambio'
          )
        }}
      </p>
      <conversion-dibujo
        :conversion="conversion"
        class="mt-2 p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
      />
      <p class="mt-2 text-mini text-gray-600 dark:text-gray-300">{{ comoTexto(conversion) }}</p>
    </div>

    <p v-else-if="!hasWhereToFind" class="mt-2 text-xs text-gray-600 dark:text-gray-300">
      {{ $t('pokemon.notAvailableNow') }}
    </p>

    <!--
      Cada apartado con su título en negrita y color fuerte, y lo de dentro en
      gris: antes título y tareas iban en el mismo gris y casi del mismo tamaño,
      y no se sabía qué era qué.
    -->
    <template v-if="hasWhereToFind">
      <div v-if="esDitto" class="mt-3">
        <h3 class="subtitulo">
          {{ $t('pokemon.dittoWild') }}
        </h3>
        <p class="mt-1 text-xs text-gray-600 dark:text-gray-300">{{ $t('pokemon.dittoHelp') }}</p>
      </div>

      <div v-if="enCombatesMax.length" class="mt-3">
        <h3 class="subtitulo">
          {{ $t('pokemon.inMaxBattles') }}
        </h3>
        <div class="flex flex-wrap gap-2 mt-1">
          <router-link
            v-for="uno in enCombatesMax"
            :key="`max-${uno.tier}`"
            :to="irA('max')"
            class="boton px-2"
          >
            <max-mark
              :variant="uno.gigantamax ? 'gigantamax' : 'dynamax'"
              :size="14"
              class="shrink-0"
            />
            {{ $t('max.tier', { n: uno.tier }) }}
            <template v-if="uno.cp">
              · {{ uno.cp.min }}–{{ uno.cp.max }}
              <span class="text-[0.8em] font-normal text-gray-600 dark:text-gray-300">{{
                $t('raids.cpRange')
              }}</span>
            </template>
          </router-link>
        </div>
      </div>

      <div v-if="whereToFind.raids.length" class="mt-3">
        <h3 class="subtitulo">
          {{ $t('pokemon.inRaids') }}
        </h3>
        <div class="flex flex-wrap gap-2 mt-1">
          <router-link
            v-for="boss in whereToFind.raids"
            :key="boss.name"
            :to="irA('raids')"
            class="boton px-2"
          >
            <!-- BaseSprite y no un <img>: si el icono de LeekDuck falla, lo reintenta. -->
            <base-sprite :src="boss.image" class="w-6 h-6" />
            {{ gameData.nombreEs(boss.name) }}
          </router-link>
        </div>
      </div>

      <div v-if="whereToFind.eggs.length" class="mt-3">
        <h3 class="subtitulo">
          {{ $t('pokemon.inEggs') }}
        </h3>
        <div class="flex flex-wrap gap-2 mt-1">
          <router-link
            v-for="egg in whereToFind.eggs"
            :key="`${egg.eggType}-${egg.name}`"
            :to="irA('eggs')"
            class="boton px-2"
          >
            {{ egg.eggType }} · {{ egg.combatPower.min }}
            <span class="text-[0.8em] font-normal text-gray-600 dark:text-gray-300">{{
              $t('raids.cpRange')
            }}</span>
          </router-link>
        </div>
      </div>

      <div v-if="whereToFind.research.length" class="mt-3">
        <h3 class="subtitulo">
          {{ $t('pokemon.inResearch') }}
        </h3>
        <ul class="mt-1 flex flex-col gap-1 pl-4 list-disc">
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
