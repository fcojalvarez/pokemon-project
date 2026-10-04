<script setup>
/**
 * Leyenda de las marcas que llevan los Pokémon: una por línea, con su nombre
 * y «liberado».
 *
 *   ✦ Shiny liberado
 *   ✕ Dinamax liberado
 *   ✕ Gigamax liberado
 *   ◌ No liberado (la tarjeta, tachada y en gris)
 *
 * Es la misma en toda la app: la Pokédex y «Ahora» tenían cada una la suya
 * (ShinyLegend, MaxLegend, ReleasedLegend), con textos distintos. En la
 * Pokédex va arriba, junto a Filtros (al fondo de un scroll infinito no la
 * vería nadie); en «Ahora», al final. Con `marcas` se eligen las que salen:
 * solo las que aparecen en esa página.
 *
 * Con `plegable` se queda en un botón («Leyenda» y las marcas) que la
 * despliega debajo, en móvil y en escritorio: abierta, las líneas ocupaban
 * sitio antes del primer Pokémon.
 *
 * Las marcas son los mismos componentes que las pintan sobre el sprite, al
 * tamaño de la leyenda: si cambia el símbolo, cambia en los dos sitios.
 *
 * «No liberado» (noLiberado) no es una marca sobre el sprite sino cómo se
 * pinta la tarjeta entera (en gris y con el nombre tachado): su icono es una
 * Poké Ball tachada, y el texto va tachado como el nombre.
 */
import { ref } from 'vue'
import ShinyMark from './ShinyMark.vue'
import MaxMark from './MaxMark.vue'
import NoLiberadoMark from './NoLiberadoMark.vue'
import useDetectOutsideClick from '../../composables/useDetectOutsideClick'

defineProps({
  marcas: { type: Array, default: () => ['shiny', 'dynamax', 'gigantamax', 'noLiberado'] },
  plegable: Boolean
})

const abierta = ref(false)
const caja = ref(null)
useDetectOutsideClick(caja, () => {
  abierta.value = false
})
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
      class="zona-tactil [--zona:-8px_-3px] boton gap-2"
      :aria-expanded="abierta"
      aria-controls="leyenda-marcas"
      @click="abierta = !abierta"
    >
      <!-- Con el nombre a la vista: solo con los símbolos no se sabía qué era.
           Desde md, del mismo alto y letra que «Filtros», que va a su lado. -->
      <span>{{ $t('legend.title') }}</span>
      <span class="flex items-center gap-1.5" aria-hidden="true">
        <template v-for="marca in marcas" :key="marca">
          <shiny-mark
            v-if="marca === 'shiny'"
            variant="dex"
            size="text-mini"
            inline
            :scale="0.65"
          />
          <no-liberado-mark v-else-if="marca === 'noLiberado'" />
          <max-mark v-else :variant="marca" :size="14" class="shrink-0" />
        </template>
      </span>
    </button>

    <!--
      Plegable: un desplegable bajo el botón, que crece desde él como Ajustes
      (antes aparecía de golpe). Sin plegar, la lista siempre.
    -->
    <Transition name="leyenda">
      <div
        v-show="!plegable || abierta"
        id="leyenda-marcas"
        class="flex flex-col gap-1.5 text-mini text-gray-600 dark:text-gray-300"
        :class="
          plegable
            ? 'leyenda absolute left-0 top-full z-20 mt-2 w-max p-3 rounded-xl border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-lg'
            : ''
        "
      >
        <ul :aria-label="$t('legend.title')" class="flex flex-col gap-1.5">
          <li v-for="marca in marcas" :key="marca" class="flex items-center gap-2">
            <!-- Todas en una caja del mismo ancho: así los textos quedan alineados. -->
            <span class="w-4 shrink-0 flex justify-center" aria-hidden="true">
              <shiny-mark
                v-if="marca === 'shiny'"
                variant="dex"
                size="text-mini"
                inline
                :scale="0.65"
              />
              <no-liberado-mark v-else-if="marca === 'noLiberado'" />
              <max-mark v-else :variant="marca" :size="15" class="shrink-0" />
            </span>
            <span :class="marca === 'noLiberado' ? 'line-through' : ''">{{
              $t(`legend.${marca}`)
            }}</span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Crece desde el botón, arriba a la izquierda, como el panel de Ajustes. */
.leyenda {
  transform-origin: 1.5rem top;
}
.leyenda-enter-active {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
.leyenda-leave-active {
  transition: opacity 0.12s ease, transform 0.15s ease-in;
}
.leyenda-enter-from,
.leyenda-leave-to {
  opacity: 0;
  transform: scale(0.6);
}
@media (prefers-reduced-motion: reduce) {
  .leyenda-enter-active,
  .leyenda-leave-active {
    transition: none;
  }
}
</style>
