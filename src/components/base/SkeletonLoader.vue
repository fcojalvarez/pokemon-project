<script setup>
/**
 * Envoltorio de los esqueletos de carga. Para el lector de pantalla es un
 * «Cargando…» y nada más: las formas que imitan el contenido son decoración.
 */
</script>

<template>
  <div role="status" aria-busy="true">
    <span class="sr-only">{{ $t('common.loading') }}</span>
    <div aria-hidden="true">
      <slot />
    </div>
  </div>
</template>
