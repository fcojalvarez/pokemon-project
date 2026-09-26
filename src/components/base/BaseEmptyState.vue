<script setup>
/**
 * Caja de "aquí no hay nada". Se repetía en las tres pestañas de incursiones y
 * en el Top con las mismas clases copiadas a mano.
 */
defineProps({
  message: { type: String, required: true }
})
</script>

<template>
  <p
    class="p-6 text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-400 rounded-xl"
  >
    {{ message }}
  </p>
</template>
