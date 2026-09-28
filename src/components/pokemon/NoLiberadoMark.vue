<script setup>
/**
 * «No liberado» en la leyenda: una Poké Ball en gris y transparente, como el
 * sprite de la tarjeta, tachada.
 *
 * El tachado es horizontal, como el del nombre, y un poco más ancho que la
 * bola. Va más marcado que ella (claro en modo oscuro, algo más oscuro en el
 * claro, donde la bola sale casi blanca) y con un borde del color del fondo
 * (el del botón y el del desplegable) para que no se confunda con la línea del
 * centro de la bola.
 */
</script>

<template>
  <svg viewBox="-4 0 32 24" class="w-5 h-4 shrink-0 overflow-visible" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path class="opacity-40" stroke="currentColor" stroke-width="2" d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M3 12h6 M15 12h6" />
    <path class="stroke-white dark:stroke-gray-900" stroke-width="5" d="M-2 12h28" />
    <path class="stroke-gray-500 dark:stroke-gray-200" stroke-width="2" d="M-2 12h28" />
  </svg>
</template>
