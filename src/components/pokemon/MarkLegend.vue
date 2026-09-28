<script setup>
/**
 * Leyenda de las marcas que llevan los Pokémon: una por línea, con su nombre
 * y «liberado».
 *
 *   ✦ Shiny liberado
 *   ✕ Dinamax liberado
 *   ✕ Gigamax liberado
 *
 * Es la misma en toda la app: la Pokédex y «Ahora» tenían cada una la suya
 * (ShinyLegend, MaxLegend, ReleasedLegend), con textos distintos. En la
 * Pokédex va arriba, junto a Filtros (al fondo de un scroll infinito no la
 * vería nadie); en «Ahora», al final. Con `marcas` se eligen las que salen:
 * solo las que aparecen en esa página.
 *
 * Con `plegable`, en móvil se queda en un botón con solo las marcas que la
 * despliega debajo, con «Leyenda» de título: las tres líneas ocupaban media
 * pantalla de la Pokédex antes del primer Pokémon. Desde sm hay sitio y va
 * abierta.
 *
 * Las marcas son los mismos componentes que las pintan sobre el sprite, al
 * tamaño de la leyenda: si cambia el símbolo, cambia en los dos sitios.
 */
import { ref } from 'vue'
import ShinyMark from './ShinyMark.vue'
import MaxMark from './MaxMark.vue'
import useDetectOutsideClick from '../../composables/useDetectOutsideClick'

defineProps({
  marcas: { type: Array, default: () => ['shiny', 'dynamax', 'gigantamax'] },
  variant: { type: String, default: 'dex' },
  plegable: Boolean
})

const abierta = ref(false)
const caja = ref(null)
useDetectOutsideClick(caja, () => { abierta.value = false })
const onKeydown = (event) => {
  if (event.key === 'Escape' && abierta.value) {
    abierta.value = false
    event.currentTarget.querySelector('button')?.focus()
  }
}
</script>

<template>
  <div ref="caja" class="relative" @keydown="onKeydown">
    <button
      v-if="plegable"
      type="button"
      class="sm:hidden zona-tactil [--zona:-8px_-3px] flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border border-gray-400 shadow-md bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-150 hover:dark:bg-gray-800"
      :aria-label="$t('legend.title')"
      :aria-expanded="abierta"
      aria-controls="leyenda-marcas"
      @click="abierta = !abierta"
    >
      <span class="flex items-center gap-1.5" aria-hidden="true">
        <template v-for="marca in marcas" :key="marca">
          <shiny-mark v-if="marca === 'shiny'" :variant="variant" size="text-mini" inline :scale="0.65" />
          <max-mark v-else :variant="marca" :size="14" class="shrink-0" />
        </template>
      </span>
    </button>

    <!--
      Plegable: en móvil, un desplegable bajo el botón; desde sm, la lista de
      siempre en su sitio. Sin plegar, la lista siempre.
    -->
    <div
      id="leyenda-marcas"
      class="flex-col gap-1.5 text-mini text-gray-600 dark:text-gray-300"
      :class="plegable
        ? [abierta ? 'flex' : 'hidden', 'max-sm:absolute max-sm:left-0 max-sm:top-full max-sm:z-20 max-sm:mt-2 max-sm:w-max max-sm:p-3 max-sm:rounded-xl max-sm:border max-sm:border-gray-400 max-sm:dark:border-gray-600 max-sm:bg-white max-sm:dark:bg-gray-900 max-sm:shadow-lg sm:flex']
        : 'flex'"
    >
      <!-- El título, solo en el desplegable: el botón ya no lleva texto. -->
      <p v-if="plegable" class="sm:hidden text-xs font-semibold text-gray-800 dark:text-gray-100">{{ $t('legend.title') }}</p>
      <ul :aria-label="$t('legend.title')" class="flex flex-col gap-1.5">
        <li v-for="marca in marcas" :key="marca" class="flex items-center gap-2">
          <!-- Todas en una caja del mismo ancho: así los textos quedan alineados. -->
          <span class="w-4 shrink-0 flex justify-center" aria-hidden="true">
            <shiny-mark v-if="marca === 'shiny'" :variant="variant" size="text-mini" inline :scale="0.65" />
            <max-mark v-else :variant="marca" :size="15" class="shrink-0" />
          </span>
          {{ $t(`legend.${marca}`) }}
        </li>
      </ul>
    </div>
  </div>
</template>
