<script setup>
/**
 * Hoja de calendario con el día en que empieza un evento: mes, número y día
 * de la semana. Es lo primero que se busca en la tarjeta, así que va en
 * grande; la cabecera en verde dice además que ya está en marcha.
 */
import { computed } from 'vue'
import { useTranslate } from '../../composables/useTranslate'

const props = defineProps({
  date: { type: Date, required: true },
  active: Boolean
})

const { intlLocale } = useTranslate()

const partes = computed(() => {
  const fmt = (opciones) => new Intl.DateTimeFormat(intlLocale(), opciones).format(props.date)
  return {
    mes: fmt({ month: 'short' }),
    dia: fmt({ day: 'numeric' }),
    semana: fmt({ weekday: 'short' })
  }
})
</script>

<template>
  <div
    class="w-14 sm:w-16 text-center border border-gray-400 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-900"
  >
    <div
      class="py-0.5 text-mini uppercase tracking-wider"
      :class="
        active
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
      "
    >
      {{ partes.mes }}
    </div>
    <div class="text-xl sm:text-2xl font-bold leading-tight pt-0.5 sm:pt-1">{{ partes.dia }}</div>
    <div class="pb-1 text-mini text-gray-600 dark:text-gray-300">{{ partes.semana }}</div>
  </div>
</template>
