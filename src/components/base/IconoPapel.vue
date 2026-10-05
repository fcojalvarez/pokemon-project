<script setup>
/**
 * El icono de un papel en los combates Max: espadas (atacante), escudo
 * (tanque, Maxibarrera) y cruz (sanador, Maxivigor). Trazos de 24×24, como
 * ICONOS_FICHA; el tamaño y el color, con las clases.
 */
defineProps({
  /** 'atacante' | 'tanque' | 'sanador' */
  papel: { type: String, required: true }
})

const ICONOS = {
  atacante: [
    'M14.5 17.5L3 6V3h3l11.5 11.5',
    'M13 19l6-6',
    'M9.5 17.5L21 6V3h-3L6.5 14.5',
    'M11 19l-6-6'
  ],
  tanque: ['M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z'],
  sanador: ['M12 5v14', 'M5 12h14']
}
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    class="shrink-0"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="d in ICONOS[papel]" :key="d" :d="d" />
  </svg>
</template>
