<script setup>
/**
 * El PC de un 100 % en dos grupos: lo que sale al atraparlo y lo que se saca
 * subiéndolo.
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
      Los orígenes van con iconos y no con texto (antes todo eran letras y
      números del mismo color y grosor); sin clima y con clima, en columnas,
      que es lo que se compara. Cada icono lleva su texto para lectores de
      pantalla y en el title.
    -->
    <h3
      class="mt-2 mb-1 text-mini font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300"
    >
      {{ $t('pokemon.cpCatch') }}
    </h3>
    <table class="w-full border-separate [border-spacing:0_6px] -my-1.5 tabular-nums">
      <thead>
        <tr class="text-mini text-gray-600 dark:text-gray-300">
          <th scope="col">
            <span class="sr-only">{{ $t('pokemon.cpOrigin') }}</span>
          </th>
          <th scope="col" class="w-24 pr-2 font-normal text-right">{{ $t('pokemon.cpNormal') }}</th>
          <th scope="col" class="w-24 pr-2 font-normal">
            <span class="flex items-center justify-end gap-1">
              <icono-mascara :src="iconoClima" class="w-4 h-4 text-sky-600 dark:text-sky-400" />
              {{ $t('pokemon.cpWeather') }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="fila in pcAtrapar" :key="fila.clave">
          <th scope="row" class="text-left font-normal">
            <span class="sr-only">{{ fila.texto }}</span>
            <span
              class="flex items-center gap-1.5 text-gray-700 dark:text-gray-200"
              :title="fila.texto"
              aria-hidden="true"
            >
              <template v-for="icono in fila.iconos" :key="icono">
                <max-mark v-if="icono === 'max'" variant="dynamax" :size="16" class="shrink-0" />
                <icono-mascara v-else :src="ICONOS_PC[icono]" class="w-5 h-5" />
              </template>
            </span>
          </th>
          <td class="p-0 pl-1.5">
            <span class="flex flex-col items-end px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-800">
              <span class="text-base font-bold leading-tight">{{ fila.normal.cp }}</span>
              <span class="text-mini text-gray-600 dark:text-gray-300"
                >{{ $t('common.levelShort') }} {{ fila.normal.level }}</span
              >
            </span>
          </td>
          <td class="p-0 pl-1.5">
            <span
              v-if="fila.clima"
              class="flex flex-col items-end px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-800"
            >
              <span class="text-base font-bold leading-tight">{{ fila.clima.cp }}</span>
              <span class="text-mini text-gray-600 dark:text-gray-300"
                >{{ $t('common.levelShort') }} {{ fila.clima.level }}</span
              >
            </span>
            <!-- Huevos, combates Max y misiones no se potencian con el clima -->
            <span v-else class="block pr-2 text-right text-gray-500 dark:text-gray-400">
              <span aria-hidden="true">—</span>
              <span class="sr-only">{{ $t('pokemon.cpNoWeather') }}</span>
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <h3
      class="mt-3 mb-1.5 text-mini font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300"
    >
      {{ $t('pokemon.cpPowerUp') }}
    </h3>
    <dl class="grid grid-cols-2 gap-1.5 tabular-nums">
      <div
        v-for="fila in pcSubir"
        :key="fila.level"
        class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800"
      >
        <dt
          class="flex items-center gap-1.5 whitespace-nowrap text-mini text-gray-600 dark:text-gray-300"
          :title="fila.texto"
        >
          <icono-mascara
            :src="fila.xl ? iconoCarameloXl : iconoCaramelo"
            class="w-4 h-4 text-gray-600 dark:text-gray-300"
          />
          <span class="sr-only">{{ fila.texto }},</span>
          {{ $t('common.levelShort') }} {{ fila.level }}
        </dt>
        <dd class="text-base font-bold">{{ fila.cp }}</dd>
      </div>
    </dl>
  </ficha-seccion>
</template>
