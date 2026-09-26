<script setup>
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMainStore } from '../../stores/main'
import { storeToRefs } from 'pinia'
import BaseIcon from '../base/BaseIcon.vue'
import SuggestionButton from './SuggestionButton.vue'

const mainStore = useMainStore()
const { isDarkMode } = storeToRefs(mainStore)
const route = useRoute()

const isOpen = ref(false)
const panel = ref(null)
const trigger = ref(null)

// La versión sale de package.json (vite.config.js la inyecta), así que al
// subir versión solo hay que tocarla ahí.
const version = import.meta.env.VITE_APP_VERSION

const links = [
  { to: '/', key: 'pokedex', icon: 'M4 6h16M4 12h16M4 18h16' },
  { to: '/top', key: 'top', icon: 'm12 3 2.6 6.3 6.9.5-5.3 4.4 1.7 6.7L12 17.3 6.1 20.9l1.7-6.7-5.3-4.4 6.9-.5L12 3z' },
  { to: '/eventos', key: 'events', icon: 'M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z' },
  { to: '/ahora', key: 'raids', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM3 12h6m6 0h6' }
]

const open = async () => {
  isOpen.value = true
  document.body.style.overflow = 'hidden'
  await nextTick()
  panel.value?.querySelector('a')?.focus()
}

const close = ({ restoreFocus = true } = {}) => {
  isOpen.value = false
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

    <nav
      ref="panel"
      class="nav-drawer fixed top-0 bottom-0 right-0 z-50 w-[min(300px,84vw)] bg-gray-100 dark:bg-gray-800 border-l border-gray-400 dark:border-gray-600 shadow-md flex flex-col"
      :class="{ 'nav-drawer-open': isOpen }"
      :aria-hidden="!isOpen"
      :inert="!isOpen || undefined"
      @keydown="onKeydown"
    >
      <div class="flex items-center gap-3 px-4 py-4 border-b border-gray-300 dark:border-gray-600">
        <span class="font-bold text-gray-800 dark:text-gray-200">PogoDex</span>
        <button
          type="button"
          class="ml-auto w-9 h-9 rounded-xl border border-gray-400 bg-white dark:bg-gray-900 hover:bg-gray-150 hover:dark:bg-gray-700 text-gray-600 dark:text-gray-200"
          :aria-label="$t('nav.close')"
          @click="close()"
        >
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl border text-gray-800 dark:text-gray-200 transition-colors"
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
      </div>

      <div
        class="flex items-center gap-3 px-4 py-3 border-t border-gray-300 dark:border-gray-600"
      >
        <span v-if="version" class="text-mini text-gray-500 dark:text-gray-400">v{{ version }}</span>

        <!-- ml-auto: el botón queda abajo a la derecha del cajón, y sigue ahí
             aunque no haya versión que enseñar a su izquierda. -->
        <suggestion-button
          class="ml-auto"
          @open="close({ restoreFocus: false })"
          @close="trigger?.focus()"
        />
      </div>
    </nav>
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
