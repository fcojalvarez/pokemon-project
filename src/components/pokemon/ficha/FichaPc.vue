<script setup>
/**
 * El PC de un 100 % en dos grupos: lo que sale al atraparlo y lo que se saca
 * subiéndolo, cada cifra en una pastilla con su icono y su nivel.
 */
import { computed } from 'vue'
import FichaSeccion from '../FichaSeccion.vue'
import MaxMark from '../MaxMark.vue'
import IconoMascara from '../../base/IconoMascara.vue'
import { useTranslate } from '../../../composables/useTranslate'
import iconoClima from '../../../assets/weather/partly_cloudy.png'
import iconoCaramelo from '../../../assets/icons/candy_icon.png'
import iconoCarameloXl from '../../../assets/icons/candy_xl.png'
import iconoIncursion from '../../../assets/icons/raid.png'
import iconoHuevo from '../../../assets/icons/egg.png'
import iconoMision from '../../../assets/icons/research.png'

const props = defineProps({
  /** [{ level, cp }] (useFichaDatos). */
  cpTable: { type: Array, required: true },
  /** Puede dinamaxizar: el nivel 20 es también el de un combate Max. */
  esMax: Boolean
})

const { t } = useTranslate()

/**
 * Iconos de los orígenes del PC 100 %: los del juego (PokeMiners, pogo_assets),
 * blancos, pintados con IconoMascara del color del texto.
 */
const ICONOS_PC = { raid: iconoIncursion, egg: iconoHuevo, research: iconoMision }

const nivelPc = (level) => props.cpTable.find((row) => row.level === level) ?? { level, cp: '—' }

/**
 * Al atraparlo, los niveles fijos del juego: incursión a 20 (25 con clima);
 * huevo y combate Max a 20, y misión a 15, sin clima. Salvaje no va: sale a
 * cualquier nivel del 1 al 30 (35 con clima), y un solo número engañaba. Al
 * subirlo: el 40 sin caramelos XL y el 50 con ellos.
 */
const pcAtrapar = computed(() => [
  {
    clave: 'raid',
    iconos: ['raid'],
    texto: t('pokemon.cpFromRaid'),
    normal: nivelPc(20),
    clima: nivelPc(25)
  },
  {
    clave: 'egg',
    iconos: props.esMax ? ['egg', 'max'] : ['egg'],
    texto: t(props.esMax ? 'pokemon.cpFromEggMax' : 'pokemon.cpFromEgg'),
    normal: nivelPc(20),
    clima: null
  },
  {
    clave: 'research',
    iconos: ['research'],
    texto: t('pokemon.cpFromResearch'),
    normal: nivelPc(15),
    clima: null
  }
])

/** Las pastillas de «Al atraparlo»: la del clima, detrás de la de incursión. */
const pastillasAtrapar = computed(() =>
  pcAtrapar.value.flatMap((fila) => {
    const normal = { clave: fila.clave, iconos: fila.iconos, texto: fila.texto, ...fila.normal }
    if (!fila.clima) return [normal]
    const clima = {
      clave: `${fila.clave}-clima`,
      iconos: ['clima'],
      texto: `${fila.texto}, ${t('pokemon.cpWeather').toLowerCase()}`,
      ...fila.clima
    }
    return [normal, clima]
  })
)

/** Las mismas etiquetas que el resto de la ficha, y la pastilla de cada cifra. */
const ETIQUETA = 'mb-1.5 subtitulo'
const PASTILLA =
  'inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'

const pcSubir = computed(() => [
  { ...nivelPc(40), xl: false, texto: t('pokemon.cpNoXl') },
  { ...nivelPc(50), xl: true, texto: t('pokemon.cpXl') }
])

/** Plegada: el 20 (incursión, huevo) y el tope; el 15 de las misiones va dentro. */
const resumen = computed(() => {
  const primero = nivelPc(20)
  const ultimo = nivelPc(50)
  return `${t('common.levelShort')} ${primero.level}: ${primero.cp} · ${t('common.levelShort')} ${
    ultimo.level
  }: ${ultimo.cp}`
})
</script>

<template>
  <ficha-seccion id="pc" :title="$t('pokemon.cp100')" :summary="resumen">
    <!--
      Cada cifra en una pastilla, con el icono de qué te la da y su nivel, como
      los chips del resto de la ficha. Antes era una tabla con una fila alta
      por origen, y la columna de los iconos dejaba un hueco enorme hasta los
      números. El clima solo potencia las incursiones: va en su propia
      pastilla, detrás de la de incursión. Cada pastilla lleva su texto para
      lectores de pantalla y en el title.
    -->
    <h3 :class="ETIQUETA" class="mt-2">{{ $t('pokemon.cpCatch') }}</h3>
    <ul class="flex flex-wrap gap-1.5 tabular-nums">
      <li
        v-for="pastilla in pastillasAtrapar"
        :key="pastilla.clave"
        :class="PASTILLA"
        :title="pastilla.texto"
      >
        <span class="flex items-center gap-0.5 text-gray-700 dark:text-gray-200" aria-hidden="true">
          <template v-for="icono in pastilla.iconos" :key="icono">
            <max-mark v-if="icono === 'max'" variant="dynamax" :size="14" class="shrink-0" />
            <icono-mascara
              v-else-if="icono === 'clima'"
              :src="iconoClima"
              class="w-[18px] h-[18px] text-sky-600 dark:text-sky-400"
            />
            <icono-mascara v-else :src="ICONOS_PC[icono]" class="w-[18px] h-[18px]" />
          </template>
        </span>
        <span class="sr-only">{{ pastilla.texto }}:</span>
        <strong class="text-sm">{{ pastilla.cp }}</strong>
        <span class="text-mini text-gray-600 dark:text-gray-300"
          >{{ $t('common.levelShort') }} {{ pastilla.level }}</span
        >
      </li>
    </ul>

    <h3 :class="ETIQUETA" class="mt-3">{{ $t('pokemon.cpPowerUp') }}</h3>
    <ul class="flex flex-wrap gap-1.5 tabular-nums">
      <li v-for="fila in pcSubir" :key="fila.level" :class="PASTILLA" :title="fila.texto">
        <icono-mascara
          :src="fila.xl ? iconoCarameloXl : iconoCaramelo"
          class="w-[18px] h-[18px] text-gray-600 dark:text-gray-300"
          aria-hidden="true"
        />
        <span class="sr-only">{{ fila.texto }}:</span>
        <strong class="text-sm">{{ fila.cp }}</strong>
        <span class="text-mini text-gray-600 dark:text-gray-300"
          >{{ $t('common.levelShort') }} {{ fila.level }}</span
        >
      </li>
    </ul>
  </ficha-seccion>
</template>
