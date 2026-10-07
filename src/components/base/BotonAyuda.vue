<script setup>
/**
 * El «?» que despliega una explicación: la de una sección de la ficha
 * (FichaSeccion) o la de un bloque (TituloAyuda). Las explicaciones se leen
 * una vez y luego estorban; así no ocupan sitio hasta que se piden.
 */
defineProps({
  abierta: Boolean,
  /** id del texto que despliega, para aria-controls. */
  controla: { type: String, required: true },
  /** De qué es la ayuda, para el lector de pantalla («Ayuda: Combates Max»). */
  tema: { type: String, required: true }
})
defineEmits(['update:abierta'])
</script>

<template>
  <button
    type="button"
    class="zona-tactil [--zona:-10px] shrink-0 w-5 h-5 rounded-full border-[1.5px] grid place-items-center text-mini font-bold leading-none"
    :class="
      abierta
        ? 'border-gray-600 dark:border-gray-300 bg-gray-600 dark:bg-gray-300 text-white dark:text-gray-900'
        : 'border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-300'
    "
    :aria-expanded="abierta"
    :aria-controls="controla"
    :aria-label="$t('common.ayudaDe', { tema })"
    @click="$emit('update:abierta', !abierta)"
  >
    ?
  </button>
</template>
