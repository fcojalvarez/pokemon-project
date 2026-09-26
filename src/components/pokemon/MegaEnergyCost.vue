<script setup>
/**
 * El coste de megaenergía. Estaba copiado en los dos lados de la cadena de
 * megas y ahora también en el centro, así que vive aquí.
 */
defineProps({
  amount: { type: Number, required: true }
})
</script>

<template>
  <span class="flex items-center whitespace-nowrap text-gray-800 dark:text-white text-xs">
    <span class="text-xs font-light">x</span>{{ amount }}
    <span class="ml-1 text-mini">{{ $t('megaenergy') }}</span>
  </span>
</template>
