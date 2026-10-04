<script setup>
/**
 * El botón de la app (`.boton` de index.css) con estado encendido: «Ver
 * shiny», las categorías de avisos y de sugerencias, Cancelar…
 *
 * Con `casilla` es un interruptor de «meter o no meter» («Ver shiny», las
 * categorías de avisos): encendido lleva una ✓ delante. Sin ella, elegir una
 * opción entre varias (la categoría de una sugerencia). En los dos casos el
 * encendido es `.boton-activo`: borde oscuro y fondo claro.
 */
defineProps({
  active: Boolean,
  casilla: Boolean
})
</script>

<template>
  <button
    type="button"
    class="zona-tactil boton"
    :class="active ? 'boton-activo' : ''"
    :aria-pressed="active"
  >
    <span v-if="casilla && active" aria-hidden="true">✓</span><slot />
  </button>
</template>
