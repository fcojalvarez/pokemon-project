<script setup>
/**
 * Lo de dentro de un resultado de «Ahora en el juego» (useBuscarAhora): el
 * sprite con sus marcas (SpriteMarcado, como en la Pokédex) o, si no hay
 * (Rocket, eventos), el icono de su sección, y al lado qué es y de dónde. Lo
 * usan el desplegable de la cabecera y las pestañas de la Pokédex; cada uno lo
 * envuelve en su opción o en su enlace.
 */
import BaseIcon from '../base/BaseIcon.vue'
import SpriteMarcado from '../pokemon/SpriteMarcado.vue'
import { NAV_LINKS } from './navLinks'

defineProps({
  /** Un resultado de useBuscarAhora().buscar(): texto, sub, imagen, marcas. */
  item: { type: Object, required: true },
  /** La clave de su sección (research, raids, eggs, rocket, events). */
  seccion: { type: String, required: true }
})

const icono = (clave) =>
  NAV_LINKS.find((link) => link.key === (clave === 'events' ? 'events' : 'raids')).icon
</script>

<template>
  <span class="flex-1 min-w-0 flex flex-col leading-tight">
    <span class="line-clamp-2 text-sm">{{ item.texto }}</span>
    <span class="flex items-center gap-1.5 min-w-0">
      <span v-if="item.insignia" class="insignia shrink-0">{{ item.insignia }}</span>
      <span v-if="item.sub" class="truncate text-mini text-gray-600 dark:text-gray-300">{{
        item.sub
      }}</span>
    </span>
  </span>
  <!-- El sprite va detrás en el HTML y delante a la vista (order-first): así se lee primero qué es. -->
  <sprite-marcado
    v-if="item.imagen"
    class="order-first"
    :src="item.imagen"
    :shiny="item.shiny"
    :dynamax="item.dynamax"
    :gigantamax="item.gigantamax"
    :oscuro="item.oscuro"
  />
  <span v-else class="order-first w-12 h-12 shrink-0 flex items-center justify-center">
    <base-icon
      :stroke-width="1.5"
      icon-class="w-6"
      class-path="stroke-gray-500 dark:stroke-gray-300"
      :d="icono(seccion)"
    />
  </span>
</template>
