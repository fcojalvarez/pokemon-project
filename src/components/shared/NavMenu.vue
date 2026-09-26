<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMainStore } from '../../stores/main'
import { storeToRefs } from 'pinia'
import BaseIcon from '../base/BaseIcon.vue'
import SuggestionButton from './SuggestionButton.vue'
import ToggleDarkMode from '../ToggleDarkMode.vue'
import { useInertApp } from '../../composables/useInertApp'

const mainStore = useMainStore()
const { isDarkMode } = storeToRefs(mainStore)
const route = useRoute()

const isOpen = ref(false)
const { bloquear, liberar } = useInertApp()
const panel = ref(null)
const trigger = ref(null)

// La versión sale de package.json (vite.config.js la inyecta), así que al
// subir versión solo hay que tocarla ahí.
const version = import.meta.env.VITE_APP_VERSION
// El build cambia en cada despliegue; la versión solo cuando se sube a mano.
// Con los dos se sabe exactamente qué hay instalado.
const build = import.meta.env.VITE_APP_BUILD

const links = [
  { to: '/', key: 'pokedex', icon: 'M4 6h16M4 12h16M4 18h16' },
  { to: '/top', key: 'top', icon: 'm12 3 2.6 6.3 6.9.5-5.3 4.4 1.7 6.7L12 17.3 6.1 20.9l1.7-6.7-5.3-4.4 6.9-.5L12 3z' },
  { to: '/eventos', key: 'events', icon: 'M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z' },
  { to: '/ahora', key: 'raids', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM3 12h6m6 0h6' }
]

const open = async () => {
  isOpen.value = true
  bloquear()
  document.body.style.overflow = 'hidden'
  await nextTick()
  panel.value?.querySelector('a')?.focus()
}

const close = ({ restoreFocus = true } = {}) => {
  isOpen.value = false
  // Antes de devolver el foco: sobre una app inerte no se puede enfocar nada.
  liberar()
  document.body.style.overflow = ''
  if (restoreFocus) trigger.value?.focus()
}

/**
 * Se calcula aquí en vez de con `router-link-active`: esa clase la añade el
 * router fuera del alcance del `<style scoped>`, así que la variante oscura no
 * llegaba a aplicarse y el botón activo quedaba claro con texto claro.
 */
const isActive = (to) => (to === '/' ? route.path === '/' : route.path.startsWith(to))

const onKeydown = (event) => {
  if (event.key === 'Escape') close()
}

onUnmounted(liberar)

// Al cambiar de página el menú se cierra solo.
watch(
  () => route.path,
  () => {
    if (isOpen.value) close({ restoreFocus: false })
  }
)
</script>

<template>
  <button
    ref="trigger"
    type="button"
    :aria-label="$t(isOpen ? 'nav.close' : 'nav.open')"
    :aria-expanded="isOpen"
    aria-controls="menu-lateral"
    class="nav-trigger transition-colors max-w-[50px] md:max-w-[160px] flex justify-center items-center cursor-pointer border border-gray-400 rounded-xl shadow-md bg-white dark:bg-gray-900 w-40 md:w-auto px-4 hover:bg-gray-150 hover:dark:bg-gray-800"
    @click="isOpen ? close() : open()"
  >
    <base-icon
      :stroke-width="1.5"
      height="24"
      width="24"
      class-path="stroke-gray-600 dark:stroke-gray-100"
      d="M4 6h16M4 12h16M4 18h16"
    />
    <span class="hidden md:block text-sm text-gray-800 dark:text-gray-200 ml-3">
      {{ $t('nav.menu') }}
    </span>
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
          <!-- alt vacío: al lado ya pone «PogoDex». -->
          <img src="/icons/favicon.svg" alt="" class="w-7 h-7" width="28" height="28">
          PogoDex
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
              ? 'bg-gray-200 dark:bg-gray-700 border-gray-500 dark:border-gray-400 font-semibold'
              : 'bg-white dark:bg-gray-900 border-gray-400 hover:bg-gray-150 hover:dark:bg-gray-700'
          "
          @click="close({ restoreFocus: false })"
        >
          <base-icon
            :stroke-width="1.5"
            width="20"
            height="20"
            :color="isDarkMode ? '#e5e7eb' : '#374151'"
            :d="link.icon"
          />
          <span class="text-sm">{{ $t(`nav.${link.key}`) }}</span>
        </RouterLink>
      </nav>

      <div class="flex flex-col items-end gap-2 px-4 py-3 border-t border-gray-300 dark:border-gray-600">
        <!--
          Abajo a la derecha del cajón. En móvil el botón de modo oscuro vive
          aquí, al lado de Sugerencias: en la cabecera le quitaba al buscador
          el sitio que necesita. Es el mismo botón que en escritorio.
        -->
        <!--
          Dos columnas iguales: los dos botones miden lo mismo. En pantallas
          muy estrechas (320 px) no caben en una fila y pasan a una columna,
          los dos a todo el ancho, en vez de cortarse.
        -->
        <div class="w-full grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-2 md:flex md:justify-end">
          <toggle-dark-mode con-texto class="md:hidden justify-center" />
          <suggestion-button
            class="justify-center"
            @open="close({ restoreFocus: false })"
            @close="trigger?.focus()"
          />
        </div>
        <span v-if="version" class="text-mini text-gray-600 dark:text-gray-300">
          v{{ version }}<template v-if="build"> · {{ build }}</template>
        </span>
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
