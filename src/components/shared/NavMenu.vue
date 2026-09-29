<script setup>
import { nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import BaseIcon from '../base/BaseIcon.vue'
import SuggestionButton from './SuggestionButton.vue'
import LanguageSelector from './LanguageSelector.vue'
import AppVersion from './AppVersion.vue'
import { useCapa } from '../../composables/useCapa'
import { NAV_LINKS as links, esSeccionActiva } from './navLinks'

const route = useRoute()

// Dos raíces (el botón y el Teleport del cajón): las clases que lleguen de
// fuera van al botón, que es lo que ocupa sitio en la cabecera.
defineOptions({ inheritAttrs: false })

const isOpen = ref(false)
const panel = ref(null)
const trigger = ref(null)

const capa = useCapa((opciones) => close(opciones))

const open = async () => {
  isOpen.value = true
  capa.alAbrir()
  await nextTick()
  panel.value?.querySelector('a')?.focus()
}

/** `navegando`: se cierra porque se va a otra página (una sección del menú). */
const close = ({ restoreFocus = true, navegando = false } = {}) => {
  isOpen.value = false
  capa.alCerrar({ navegando })
  if (restoreFocus) trigger.value?.focus()
}

/**
 * Se calcula aquí en vez de con `router-link-active`: esa clase la añade el
 * router fuera del alcance del `<style scoped>`, así que la variante oscura no
 * llegaba a aplicarse y el botón activo quedaba claro con texto claro.
 */
const isActive = (to) => esSeccionActiva(route.path, to)

const onKeydown = (event) => {
  if (event.key === 'Escape') close()
}
</script>

<template>
  <button
    ref="trigger"
    v-bind="$attrs"
    type="button"
    :aria-label="$t(isOpen ? 'nav.close' : 'nav.open')"
    :aria-expanded="isOpen"
    aria-controls="menu-lateral"
    class="nav-trigger flex justify-center items-center w-11 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-200 hover:dark:bg-gray-800 transition-colors"
    :class="isOpen ? 'bg-gray-200 dark:bg-gray-800' : ''"
    @click="isOpen ? close() : open()"
  >
    <base-icon
      :stroke-width="1.5"
      height="24"
      width="24"
      color="currentColor"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </button>

  <Teleport to="body">
    <div v-if="isOpen" class="nav-scrim fixed inset-0 z-40 bg-gray-900/60" @click="close()"></div>

    <div
      id="menu-lateral"
      ref="panel"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('nav.menu')"
      class="nav-drawer fixed top-0 bottom-0 right-0 z-50 w-[min(300px,84vw)] bg-gray-100 dark:bg-gray-800 border-l border-gray-400 dark:border-gray-600 shadow-md flex flex-col"
      :class="{ 'nav-drawer-open': isOpen }"
      :aria-hidden="!isOpen"
      :inert="!isOpen || undefined"
      @keydown="onKeydown"
    >
      <div class="flex items-center gap-3 px-4 py-4 border-b border-gray-300 dark:border-gray-600">
        <span class="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
          <!-- alt vacío: al lado ya pone «PoGoDex». -->
          <img src="/icons/favicon.svg" alt="" class="w-7 h-7" width="28" height="28">
          PoGoDex
        </span>
        <button
          type="button"
          class="zona-tactil ml-auto w-9 h-9 rounded-xl border border-gray-400 bg-white dark:bg-gray-900 hover:bg-gray-150 hover:dark:bg-gray-700 text-gray-600 dark:text-gray-200"
          :aria-label="$t('nav.close')"
          @click="close()"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto p-3" :aria-label="$t('nav.menu')">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl border text-gray-800 dark:text-gray-200 transition-colors"
          :aria-current="isActive(link.to) ? 'page' : undefined"
          :class="
            isActive(link.to)
              ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-600 font-semibold'
              : 'bg-white dark:bg-gray-900 border-gray-400 hover:bg-gray-150 hover:dark:bg-gray-700'
          "
          @click="close({ restoreFocus: false, navegando: true })"
        >
          <!-- currentColor: el gris del texto del enlace, 700 en claro y 200 en oscuro. -->
          <base-icon
            :stroke-width="1.5"
            width="20"
            height="20"
            color="currentColor"
            class="text-gray-700 dark:text-gray-200"
            stroke-linecap="round"
            stroke-linejoin="round"
            :d="link.icon"
          />
          <span class="text-sm">{{ $t(`nav.${link.key}`) }}</span>
        </RouterLink>
      </nav>

      <div class="flex flex-col items-end gap-2 px-4 py-3 border-t border-gray-300 dark:border-gray-600">
        <!--
          Una fila al pie del cajón: idioma, solo con el icono, y Sugerencias
          con el ancho que sobra. El modo oscuro va en la cabecera, también en
          móvil (con el buscador plegado en una lupa ya cabe). items-stretch:
          los dos botones, de la misma altura.
        -->
        <div class="w-full flex items-stretch gap-2">
          <language-selector />
          <suggestion-button
            class="flex-1 justify-center"
            @open="close({ restoreFocus: false })"
            @close="trigger?.focus()"
          />
        </div>
        <app-version tag="span" />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.nav-drawer {
  transform: translateX(100%);
  visibility: hidden;
  /* La visibilidad se retrasa al cerrar para no cortar la animación. */
  transition: transform 0.22s ease-out, visibility 0s linear 0.22s;
}
.nav-drawer-open {
  transform: none;
  visibility: visible;
  transition: transform 0.22s ease-out, visibility 0s;
}
@media (prefers-reduced-motion: reduce) {
  .nav-drawer {
    transition: none;
  }
}
</style>
