<script setup>
/**
 * «¿Cómo se calcula?» del Top. Es un componente porque va en sitios distintos
 * según el ancho: al final de la lista o dentro de la barra lateral.
 */
import { ref } from 'vue'
import BaseChevron from '../base/BaseChevron.vue'

const abierto = ref(false)
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
    <p class="mt-2">{{ $t('top.method1') }}</p>
    <p class="mt-2">{{ $t('top.method2') }}</p>
    <p class="mt-2">{{ $t('top.method3') }}</p>
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
