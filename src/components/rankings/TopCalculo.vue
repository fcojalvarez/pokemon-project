<script setup>
/**
 * «¿Cómo se calcula?» del Top. Es un componente porque va en sitios distintos
 * según el ancho: al final de la lista o dentro de la barra lateral. Con
 * `modo="max"`, el del top Max: va siempre debajo de la lista, encima de la
 * leyenda, porque es algo que solo busca quien quiere el detalle.
 */
import { computed, ref } from 'vue'
import BaseChevron from '../base/BaseChevron.vue'

const props = defineProps({
  modo: { type: String, default: 'pve' }
})

const abierto = ref(false)
const textos = computed(() =>
  props.modo === 'max'
    ? ['max.method1', 'max.method2', 'max.methodRoles', 'max.calcLegend']
    : ['top.method1', 'top.methodAll', 'top.methodTier', 'top.method2', 'top.method3']
)
</script>

<template>
  <details class="text-sm text-gray-600 dark:text-gray-300" @toggle="abierto = $event.target.open">
    <!--
      El triángulo nativo apunta a la derecha; aquí apunta hacia abajo, como
      el resto de desplegables de la app.
    -->
    <summary class="flex items-center gap-2 cursor-pointer py-2 marcador-propio">
      <base-chevron :open="abierto" />
      {{ $t('top.howCalculated') }}
    </summary>
    <p v-for="texto in textos" :key="texto" class="mt-2">{{ $t(texto) }}</p>
  </details>
</template>

<style scoped>
.marcador-propio {
  list-style: none;
}

/* Safari no entiende `list-style` en un <summary>. */
.marcador-propio::-webkit-details-marker {
  display: none;
}
</style>
