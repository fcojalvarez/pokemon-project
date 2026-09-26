<script setup>
/**
 * Aviso de que una carga ha fallado. `detail` es el mensaje técnico que llega
 * de la store; puede venir vacío.
 */
defineProps({
  message: { type: String, required: true },
  detail: { type: String, default: null }
})
</script>

<template>
  <p
    role="alert"
    class="p-4 rounded-xl border border-red-400 bg-red-50 dark:bg-red-900/30 text-sm"
  >
    {{ message }}<template v-if="detail"> {{ detail }}</template>
  </p>
</template>
