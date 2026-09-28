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
 * Las marcas son los mismos componentes que las pintan sobre el sprite, al
 * tamaño de la leyenda: si cambia el símbolo, cambia en los dos sitios.
 */
import ShinyMark from './ShinyMark.vue'
import MaxMark from './MaxMark.vue'

defineProps({
  marcas: { type: Array, default: () => ['shiny', 'dynamax', 'gigantamax'] },
  variant: { type: String, default: 'dex' }
})
</script>

<template>
  <ul :aria-label="$t('legend.title')" class="flex flex-col gap-1.5 text-mini text-gray-600 dark:text-gray-300">
    <li v-for="marca in marcas" :key="marca" class="flex items-center gap-2">
      <!-- Todas en una caja del mismo ancho: así los textos quedan alineados. -->
      <span class="w-4 shrink-0 flex justify-center" aria-hidden="true">
        <shiny-mark v-if="marca === 'shiny'" :variant="variant" size="text-mini" inline :scale="0.65" />
        <max-mark v-else :variant="marca" :size="15" class="shrink-0" />
      </span>
      {{ $t(`legend.${marca}`) }}
    </li>
  </ul>
</template>
