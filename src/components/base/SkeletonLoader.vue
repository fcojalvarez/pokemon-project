<script setup>
/**
 * Envoltorio de los esqueletos de carga. Para el lector de pantalla es un
 * «Cargando…» y nada más: las formas que imitan el contenido son decoración.
 *
 * Las clases que se le pasen (`flex flex-col gap-3`…) van a la caja que lleva
 * las formas, no a la de fuera: ahí no hacían nada, y las tarjetas del
 * esqueleto de la ficha salían pegadas mientras las de verdad van separadas.
 */
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div role="status" aria-busy="true">
    <span class="sr-only">{{ $t('common.loading') }}</span>
    <div aria-hidden="true" v-bind="$attrs">
      <slot />
    </div>
  </div>
</template>
