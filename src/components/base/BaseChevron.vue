<script setup>
/**
 * El chevrón de «esto se abre» de toda la app.
 *
 * Estaba tres veces: como SVG en <base-dropdown> y como carácter «▾» en el
 * panel de filtros y en el desplegable de «cómo se calcula». Los caracteres se
 * veían mucho más pequeños que el SVG y además dependían de la fuente, así que
 * ahora los tres son este mismo trazo.
 *
 * Gira 180º cuando está abierto; con `prefers-reduced-motion` salta sin
 * animar, como el resto de transiciones.
 */
defineProps({
  open: Boolean,
  /** Clases de tamaño de Tailwind. */
  size: { type: String, default: 'w-4 h-4' }
})
</script>

<template>
  <svg
    :class="['shrink-0 chevron', size, open ? 'rotate-180' : '']"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2.5 4.5 6 8l3.5-3.5"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.chevron {
  transition: transform 150ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}
</style>
