<script setup>
/**
 * «Subir de nivel»: cuánto polvo, caramelos y caramelos XL cuesta llevarlo de
 * un nivel a otro, con dos tiradores sobre una barra del 1 al 50. Va al final
 * de «Avisos y costes».
 *
 * Empieza en 20 → 40: lo que sale de una incursión o un huevo y hasta donde
 * se sube sin caramelos XL. Oscuro y purificado solo si tiene versión oscura;
 * con suerte, solo si se puede intercambiar (la suerte sale de intercambiar).
 *
 * Los dos tiradores son dos <input type="range"> superpuestos: cada uno se
 * mueve con el dedo, con el ratón y con las flechas del teclado, y el lector
 * de pantalla los lee como «desde» y «hasta».
 */
import { computed, ref, watch } from 'vue'
import BaseSegmented from '../../base/BaseSegmented.vue'
import IconoMascara from '../../base/IconoMascara.vue'
import { useTranslate } from '../../../composables/useTranslate'
import { calcCP } from '../../../utils/formulas'
import { costeSubida, NIVEL_MAX, NIVEL_MIN } from '../../../utils/subida'
import iconoCaramelo from '../../../assets/icons/candy_icon.png'
import iconoCarameloXl from '../../../assets/icons/candy_xl.png'

const props = defineProps({
  /** Estadísticas base de la forma que se ve. */
  stats: { type: Object, required: true },
  /** Tabla propia de la especie (`costesSubida` del roster), si la tiene. */
  propia: { type: Object, default: null },
  conOscuro: Boolean,
  conSuerte: Boolean
})

const { t, formatNumber } = useTranslate()

const IV_PERFECTOS = { atk: 15, def: 15, hp: 15 }
const MARCAS = [1, 10, 20, 30, 40, 50]

const desde = ref(20)
const hasta = ref(40)
const variante = ref('normal')

// Los tiradores no se cruzan: siempre al menos una subida (medio nivel) entre ellos.
const moverDesde = (valor) => {
  desde.value = Math.min(Number(valor), hasta.value - 0.5)
}
const moverHasta = (valor) => {
  hasta.value = Math.max(Number(valor), desde.value + 0.5)
}

const variantes = computed(() =>
  [
    { value: 'normal', label: t('pokemon.levelUp.normal') },
    props.conOscuro && { value: 'oscuro', label: t('pokemon.levelUp.shadow') },
    props.conOscuro && { value: 'purificado', label: t('pokemon.levelUp.purified') },
    props.conSuerte && { value: 'suerte', label: t('pokemon.levelUp.lucky') }
  ].filter(Boolean)
)
// Si la variante elegida deja de estar (otra ficha), vuelve a normal.
watch(variantes, (lista) => {
  if (!lista.some((v) => v.value === variante.value)) variante.value = 'normal'
})

const coste = computed(() => costeSubida(desde.value, hasta.value, variante.value, props.propia))
const pc = (nivel) => calcCP(props.stats, IV_PERFECTOS, nivel)

/** Posición de un nivel en la barra, en %, para la parte rellena y las marcas. */
const pos = (nivel) => ((nivel - NIVEL_MIN) / (NIVEL_MAX - NIVEL_MIN)) * 100
// El centro del tirador recorre la barra menos medio tirador a cada lado.
const enBarra = (nivel) =>
  `calc(var(--tirador) / 2 + (100% - var(--tirador)) * ${pos(nivel) / 100})`

const nivelTexto = (nivel) => formatNumber(nivel)

const cifras = computed(() => [
  { clave: 'dust', valor: coste.value.polvo, signo: '✧' },
  { clave: 'candy', valor: coste.value.caramelos, icono: iconoCaramelo },
  { clave: 'xl', valor: coste.value.xl, icono: iconoCarameloXl }
])
</script>

<template>
  <div>
    <h3 class="subtitulo">{{ $t('pokemon.levelUp.title') }}</h3>

    <div class="mt-2 flex justify-between gap-3 text-sm tabular-nums">
      <span>
        {{ $t('pokemon.levelUp.level') }} <strong>{{ nivelTexto(desde) }}</strong>
        <span class="ml-1 text-mini text-gray-600 dark:text-gray-300">{{ pc(desde) }} PC</span>
      </span>
      <span class="text-right">
        {{ $t('pokemon.levelUp.level') }} <strong>{{ nivelTexto(hasta) }}</strong>
        <span class="ml-1 text-mini text-gray-600 dark:text-gray-300">{{ pc(hasta) }} PC</span>
      </span>
    </div>

    <div class="rango-doble mt-2">
      <div class="rango-pista" aria-hidden="true"></div>
      <div
        class="rango-relleno"
        aria-hidden="true"
        :style="{ left: enBarra(desde), right: `calc(100% - ${enBarra(hasta)})` }"
      ></div>
      <input
        id="subida-desde"
        type="range"
        :min="NIVEL_MIN"
        :max="NIVEL_MAX"
        step="0.5"
        :value="desde"
        :aria-label="$t('pokemon.levelUp.from')"
        :aria-valuetext="`${$t('pokemon.levelUp.level')} ${nivelTexto(desde)}`"
        @input="moverDesde($event.target.value)"
      />
      <input
        id="subida-hasta"
        type="range"
        :min="NIVEL_MIN"
        :max="NIVEL_MAX"
        step="0.5"
        :value="hasta"
        :aria-label="$t('pokemon.levelUp.to')"
        :aria-valuetext="`${$t('pokemon.levelUp.level')} ${nivelTexto(hasta)}`"
        @input="moverHasta($event.target.value)"
      />
    </div>
    <div
      class="rango-marcas relative h-4 text-mini text-gray-500 dark:text-gray-400"
      aria-hidden="true"
    >
      <span
        v-for="marca in MARCAS"
        :key="marca"
        class="absolute -translate-x-1/2 tabular-nums"
        :style="{ left: enBarra(marca) }"
        >{{ marca }}</span
      >
    </div>

    <!-- Lo que cuesta: tres cifras grandes, siempre las tres, en el mismo sitio. -->
    <dl class="mt-3 grid grid-cols-3 gap-2" aria-live="polite">
      <div
        v-for="cifra in cifras"
        :key="cifra.clave"
        class="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-center"
      >
        <dt class="text-mini text-gray-600 dark:text-gray-300">
          {{ $t(`pokemon.levelUp.${cifra.clave}`) }}
        </dt>
        <dd class="mt-0.5 flex items-center justify-center gap-1 text-base font-bold tabular-nums">
          {{ formatNumber(cifra.valor) }}
          <icono-mascara v-if="cifra.icono" :src="cifra.icono" class="w-4 h-4" />
          <span v-else aria-hidden="true" class="font-normal text-gray-600 dark:text-gray-300">{{
            cifra.signo
          }}</span>
        </dd>
      </div>
    </dl>

    <base-segmented
      v-if="variantes.length > 1"
      v-model="variante"
      :options="variantes"
      class="mt-3"
    />
  </div>
</template>
