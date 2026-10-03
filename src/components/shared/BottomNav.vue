<script setup>
/**
 * Barra de secciones abajo, solo en móvil: una isla que flota separada de
 * los bordes, con el mismo aspecto que las tarjetas de la app. La sección
 * abierta es un bloque entero, icono y nombre, con un tinte suave del azul de
 * la Poké Ball del logo y el icono en ese azul (más claro en oscuro). En gris
 * con borde parecía un botón más; rellena de azul llamaba demasiado la
 * atención y en oscuro era lo más claro de la pantalla.
 *
 * En el móvil las cuatro secciones vivían dentro del menú: cambiar de una a
 * otra eran dos toques, y el botón del menú está arriba, lejos del pulgar. El
 * menú se queda para lo demás (idioma, tema, sugerencias). Desde `sm` sobra
 * sitio y no hace falta: se oculta.
 *
 * Mientras se escribe se esconde. Con el teclado abierto, Chrome en Android
 * encoge la ventana y la barra subía a pegarse al teclado, tapando justo los
 * resultados del buscador.
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BaseIcon from '../base/BaseIcon.vue'
import { NAV_LINKS, esSeccionActiva } from './navLinks'

const route = useRoute()

const escribiendo = ref(false)
const esCampo = (el) =>
  el?.matches?.(
    'input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable="true"]'
  )
const alEnfocar = (event) => {
  escribiendo.value = Boolean(esCampo(event.target))
}
const alSalir = () => {
  // El foco pasa de un campo a otro sin quedarse en el body: se mira después.
  setTimeout(() => {
    escribiendo.value = Boolean(esCampo(document.activeElement))
  })
}

onMounted(() => {
  document.addEventListener('focusin', alEnfocar)
  document.addEventListener('focusout', alSalir)
})
onUnmounted(() => {
  document.removeEventListener('focusin', alEnfocar)
  document.removeEventListener('focusout', alSalir)
})
</script>

<template>
  <nav
    :aria-label="$t('nav.sections')"
    class="barra-inferior sm:hidden fixed inset-x-3 z-30 grid grid-cols-4 gap-1 p-1.5 rounded-2xl border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-lg dark:shadow-black/40 transition-transform duration-200"
    :class="escribiendo ? 'translate-y-[calc(100%+24px)]' : ''"
  >
    <RouterLink
      v-for="link in NAV_LINKS"
      :key="link.to"
      :to="link.to"
      :aria-current="esSeccionActiva(route.path, link.to) ? 'page' : undefined"
      class="flex flex-col items-center justify-center gap-0.5 min-h-[52px] rounded-xl border text-[11px] leading-tight transition-colors"
      :class="
        esSeccionActiva(route.path, link.to)
          ? 'border-transparent bg-blue-600/10 dark:bg-blue-400/15 text-gray-900 dark:text-white font-semibold'
          : 'border-transparent text-gray-600 dark:text-gray-300'
      "
    >
      <!--
        El color va en el propio SVG: BaseIcon trae color="#000" y el trazo en
        currentColor salía negro también en modo oscuro.
      -->
      <base-icon
        :class="esSeccionActiva(route.path, link.to) ? 'text-blue-600 dark:text-blue-400' : ''"
        :stroke-width="esSeccionActiva(route.path, link.to) ? 2 : 1.5"
        width="22"
        height="22"
        color="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        :d="link.icon"
      />
      <span>{{ $t(`nav.${link.key}`) }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
/* Separada 8 px del borde, más la barra de gestos del iPhone o de Android. */
.barra-inferior {
  bottom: calc(8px + env(safe-area-inset-bottom));
}
</style>
