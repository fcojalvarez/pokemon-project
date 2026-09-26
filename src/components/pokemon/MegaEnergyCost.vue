<script setup>
/**
 * El coste de megaenergía. Estaba copiado en los dos lados de la cadena de
 * megas y ahora también en el centro, así que vive aquí.
 *
 * La etiqueta puede caer a una segunda línea: el bloque va posicionado en
 * absoluto a la derecha del centro y en móvil «Megaenergía» no cabe hasta el
 * borde de la tarjeta, así que se salía. La cifra sí se mantiene entera.
 */
defineProps({
  amount: { type: Number, required: true }
})
</script>

<template>
  <span class="flex flex-wrap items-center gap-x-1 text-gray-800 dark:text-white text-xs">
    <span class="whitespace-nowrap"><span class="text-xs font-light">x</span>{{ amount }}</span>
    <!-- "Megaenergía" es más larga que el hueco en móvil: se deja partir. -->
    <span class="text-mini break-words min-w-0">{{ $t('megaenergy') }}</span>
  </span>
</template>
