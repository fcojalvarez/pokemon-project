<script setup>
/**
 * Barra lateral de filtros del escritorio ancho (Top, Incursiones, Eventos).
 *
 * Se queda fija al hacer scroll si la pantalla tiene altura para ella (720 px)
 * y va justo debajo de la cabecera. Sin overflow propio: si recortara, las
 * opciones de los desplegables quedarían encerradas dentro de la barra.
 *
 * Con `activa` a false es un <aside> sin estilo: el Top pinta los mismos
 * filtros encima de la lista cuando no hay sitio para la barra.
 */
defineProps({
  activa: { type: Boolean, default: true }
})
</script>

<template>
  <aside
    :class="
      activa
        ? '[@media(min-height:720px)]:sticky top-[104px] flex flex-col gap-4 p-4 border border-gray-300 dark:border-gray-700 rounded-xl shadow-md bg-white dark:bg-gray-900'
        : ''
    "
  >
    <slot />
  </aside>
</template>
