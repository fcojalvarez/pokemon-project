<script setup>
/**
 * IV para PvP: los mejores para la Súper y la Hiper Liga y en qué puesto
 * quedan los del jugador.
 *
 * En una liga con tope de PC gana el que más aguanta bajo el tope (producto
 * de estadísticas), no el 100 %: un 0/15/13 rinde más que un 15/15/15. Es el
 * mismo criterio que pvpoke. La Master no tiene tope: ahí el mejor es el 100 %.
 *
 * Vale igual para el oscuro: su ×1,2 de ataque y su ÷1,2 de defensa se
 * anulan en el producto, así que los mejores IV son los mismos.
 */
import { computed, reactive } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import { rankIVsForLeague } from '../../../utils/formulas'
import { useTranslate } from '../../../composables/useTranslate'

const props = defineProps({
  /** Estadísticas base de la forma que se ve: { atk, def, hp }. */
  stats: { type: Object, required: true }
})

const { t, formatNumber } = useTranslate()

const LIGAS = [
  { league: 'great', cap: 1500 },
  { league: 'ultra', cap: 2500 }
]

/** Los IV del jugador; vacíos hasta que los escribe. */
const mios = reactive({ atk: '', def: '', hp: '' })
const CAMPOS = ['atk', 'def', 'hp']
const valor = (texto) => {
  const n = Number(texto)
  return texto !== '' && Number.isInteger(n) && n >= 0 && n <= 15 ? n : null
}
const misIvs = computed(() => {
  const ivs = Object.fromEntries(CAMPOS.map((c) => [c, valor(mios[c])]))
  return CAMPOS.every((c) => ivs[c] !== null) ? ivs : null
})

/** Las 4096 combinaciones de cada liga: se recalculan solo si cambia el Pokémon. */
const rankings = computed(() =>
  LIGAS.map(({ league, cap }) => ({
    league,
    cap,
    todas: rankIVsForLeague(props.stats, cap)
  }))
)

const ivTexto = (ivs) => `${ivs.atk}/${ivs.def}/${ivs.hp}`
const nivel = (l) => formatNumber(l)

const filas = computed(() =>
  rankings.value.map(({ league, cap, todas }) => {
    const mejor = todas[0]
    const mio = misIvs.value
      ? todas.find(
          (e) =>
            e.ivs.atk === misIvs.value.atk &&
            e.ivs.def === misIvs.value.def &&
            e.ivs.hp === misIvs.value.hp
        )
      : null
    return { league, cap, total: todas.length, mejor, mio }
  })
)

/** Plegada: los mejores IV de cada liga. */
const resumen = computed(() =>
  filas.value.map((f) => `${t(`top.${f.league}`)}: ${ivTexto(f.mejor.ivs)}`).join(' · ')
)
</script>

<template>
  <ficha-seccion id="pvpIv" :title="$t('pokemon.pvpIv.title')" :summary="resumen">
    <p class="mt-2 text-mini text-gray-600 dark:text-gray-300">{{ $t('pokemon.pvpIv.intro') }}</p>

    <fieldset class="mt-2">
      <legend class="text-mini text-gray-600 dark:text-gray-300">
        {{ $t('pokemon.pvpIv.yours') }}
      </legend>
      <div class="mt-1 grid grid-cols-3 gap-2">
        <label
          v-for="campo in CAMPOS"
          :key="campo"
          class="text-mini text-gray-600 dark:text-gray-300"
        >
          {{ $t(`pokemon.pvpIv.${campo}`) }}
          <input
            v-model="mios[campo]"
            type="number"
            inputmode="numeric"
            min="0"
            max="15"
            placeholder="0–15"
            class="campo shadow-md mt-1"
          />
        </label>
      </div>
    </fieldset>

    <ul class="mt-3 flex flex-col gap-1.5">
      <li
        v-for="fila in filas"
        :key="fila.league"
        class="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs"
      >
        <span class="block font-semibold"
          >{{ $t(`top.${fila.league}`) }} · {{ formatNumber(fila.cap) }} PC</span
        >
        <span class="flex flex-wrap items-center gap-x-2 mt-0.5 text-gray-600 dark:text-gray-300">
          {{ $t('pokemon.pvpIv.best') }}:
          <strong class="text-gray-800 dark:text-gray-100">{{ ivTexto(fila.mejor.ivs) }}</strong> ·
          {{ $t('common.levelShort') }} {{ nivel(fila.mejor.level) }} · {{ fila.mejor.cp }}
          <span class="text-[0.8em] font-normal text-gray-600 dark:text-gray-300">{{
            $t('raids.cpRange')
          }}</span>
        </span>
        <span v-if="fila.mio" class="flex items-center gap-2 mt-0.5">
          <span class="text-gray-600 dark:text-gray-300">
            {{ $t('pokemon.pvpIv.yoursShort') }}: {{ $t('common.levelShort') }}
            {{ nivel(fila.mio.level) }} · {{ fila.mio.cp }}
            <span class="text-[0.8em] font-normal text-gray-600 dark:text-gray-300">{{
              $t('raids.cpRange')
            }}</span>
          </span>
          <span class="ml-auto shrink-0">
            #{{ fila.mio.rank }} ·
            <strong>{{ formatNumber(Math.round(fila.mio.percent * 10) / 10) }} %</strong>
          </span>
        </span>
      </li>
    </ul>
    <p class="mt-2 text-mini text-gray-600 dark:text-gray-300">{{ $t('pokemon.pvpIv.master') }}</p>
  </ficha-seccion>
</template>
