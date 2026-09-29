<script setup>
/**
 * Ajustes en móvil: un botón de reguladores en la cabecera que abre un panel pegado a
 * él, con el tema, el idioma, Sugerencias y la versión.
 *
 * Con la barra de secciones abajo (BottomNav), el menú lateral en móvil ya
 * solo servía para esto, y un cajón entero para cuatro cosas sobraba. Desde
 * `sm` se sigue usando el menú de siempre y esto no se enseña.
 *
 * El panel crece desde el propio botón (transform-origin arriba a la
 * derecha, donde está el botón) y lleva un pico que apunta a él. Mientras
 * está abierto, el resto de la app queda inerte, como con el menú: el foco
 * entra en el panel y al cerrar vuelve al botón.
 */
import { computed, nextTick, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '../../stores/main'
import i18n, { LOCALES, setLocale } from '../../plugins/i18n'
import { useCapa } from '../../composables/useCapa'
import BaseIcon from '../base/BaseIcon.vue'
import SuggestionButton from './SuggestionButton.vue'
import AppVersion from './AppVersion.vue'

const mainStore = useMainStore()
const { isDarkMode } = storeToRefs(mainStore)

const ICONOS = {
  // Reguladores (Tabler, adjustments-horizontal): más ligero que el engranaje y se lee como «preferencias».
  ajustes: 'M14 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M4 6l8 0 M16 6l4 0 M8 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M4 12l2 0 M10 12l10 0 M17 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0 M4 18l11 0 M19 18l1 0',
  claro: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7',
  oscuro: 'M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z'
}

const isOpen = ref(false)
const trigger = ref(null)
const panel = ref(null)
/** Dónde va el panel: justo debajo del botón, con el pico en su centro. */
const posicion = ref({ top: 0, right: 0, pico: 0 })
// Sin bloquear el scroll: el panel es pequeño y va pegado al botón.
const capa = useCapa((opciones) => close(opciones), { bloquearScroll: false })

const open = async () => {
  // clientWidth y no innerWidth: este cuenta la barra de scroll, y el panel
  // quedaba corrido a la izquierda del botón lo que mide ella.
  const ancho = document.documentElement.clientWidth
  const caja = trigger.value.getBoundingClientRect()
  const right = Math.max(8, ancho - caja.right)
  posicion.value = { top: caja.bottom + 10, right, pico: ancho - right - (caja.left + caja.width / 2) }
  isOpen.value = true
  capa.alAbrir()
  await nextTick()
  panel.value?.querySelector('[aria-checked="true"]')?.focus()
}

const close = ({ restoreFocus = true, navegando = false } = {}) => {
  if (!isOpen.value) return
  isOpen.value = false
  capa.alCerrar({ navegando })
  if (restoreFocus) trigger.value?.focus()
}

/** El tema, igual que el botón de la cabecera en escritorio (ToggleDarkMode). */
const ponerTema = (oscuro) => mainStore.setDarkMode(oscuro)

const idioma = computed(() => i18n.global.locale)

/**
 * Cada grupo es un radiogroup: Tab entra y sale del grupo, y con las flechas
 * se cambia de opción, que queda elegida al instante como en el sistema.
 */
const alTeclear = (event, opciones, elegir) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  const botones = [...event.currentTarget.querySelectorAll('[role="radio"]')]
  const actual = botones.indexOf(document.activeElement)
  const paso = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1
  const siguiente = (actual + paso + botones.length) % botones.length
  elegir(opciones[siguiente])
  botones[siguiente].focus()
}

const onKeydown = (event) => {
  if (event.key === 'Escape') close()
}

// Las clases de cada opción de un grupo: la elegida, en bloque invertido.
const opcion = (elegida) => [
  'flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs transition-colors',
  elegida
    ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 font-semibold'
    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 hover:dark:bg-gray-700'
]
</script>

<template>
  <button
    ref="trigger"
    v-bind="$attrs"
    type="button"
    :aria-label="$t(isOpen ? 'settings.close' : 'settings.open')"
    :aria-expanded="isOpen"
    aria-controls="ajustes"
    class="flex justify-center items-center w-11 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-200 hover:dark:bg-gray-800 transition-colors"
    :class="isOpen ? 'bg-gray-200 dark:bg-gray-800' : ''"
    @click="isOpen ? close() : open()"
  >
    <base-icon
      :stroke-width="1.5"
      width="24"
      height="24"
      color="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      :d="ICONOS.ajustes"
    />
  </button>

  <Teleport to="body">
    <Transition name="ajustes-fondo">
      <div v-if="isOpen" class="fixed inset-0 z-40 bg-gray-900/40" @click="close()"></div>
    </Transition>

    <!--
      v-show y no v-if: el botón de Sugerencias está dentro, y al abrir su
      diálogo el panel se cierra. Con v-if se desmontaba con él y el diálogo
      no llegaba a salir.
    -->
    <Transition name="ajustes">
      <div
        v-show="isOpen"
        id="ajustes"
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('settings.title')"
        class="ajustes fixed z-50 w-[min(240px,calc(100vw-16px))] flex flex-col gap-3 p-3 rounded-2xl border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-xl"
        :style="{ top: `${posicion.top}px`, right: `${posicion.right}px`, '--pico': `${posicion.pico}px` }"
        @keydown="onKeydown"
      >
        <!-- El pico que apunta al botón. -->
        <span class="pico" aria-hidden="true"></span>

        <div>
          <p id="ajustes-tema" class="mb-1 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300">{{ $t('settings.theme') }}</p>
          <div
            role="radiogroup"
            aria-labelledby="ajustes-tema"
            class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800"
            @keydown="alTeclear($event, [false, true], ponerTema)"
          >
            <button
              v-for="oscuro in [false, true]"
              :key="String(oscuro)"
              type="button"
              role="radio"
              :aria-checked="isDarkMode === oscuro"
              :tabindex="isDarkMode === oscuro ? 0 : -1"
              :class="opcion(isDarkMode === oscuro)"
              @click="ponerTema(oscuro)"
            >
              <base-icon :stroke-width="1.5" width="16" height="16" color="currentColor" stroke-linecap="round" stroke-linejoin="round" :d="oscuro ? ICONOS.oscuro : ICONOS.claro" />
              {{ $t(oscuro ? 'settings.dark' : 'settings.light') }}
            </button>
          </div>
        </div>

        <div>
          <p id="ajustes-idioma" class="mb-1 text-mini uppercase tracking-wider text-gray-600 dark:text-gray-300">{{ $t('language.label') }}</p>
          <div
            role="radiogroup"
            aria-labelledby="ajustes-idioma"
            class="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800"
            @keydown="alTeclear($event, LOCALES, setLocale)"
          >
            <button
              v-for="locale in LOCALES"
              :key="locale"
              type="button"
              role="radio"
              :lang="locale"
              :aria-checked="idioma === locale"
              :tabindex="idioma === locale ? 0 : -1"
              :class="opcion(idioma === locale)"
              @click="setLocale(locale)"
            >
              {{ $t(`language.names.${locale}`) }}
            </button>
          </div>
        </div>

        <suggestion-button
          class="w-full justify-center !shadow-none"
          @open="close({ restoreFocus: false })"
          @close="trigger?.focus()"
        />

        <app-version class="text-right" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Crece desde el botón: el origen, arriba a la derecha, donde apunta el pico. */
.ajustes {
  transform-origin: calc(100% - var(--pico)) top;
}
.ajustes-enter-active,
.ajustes-leave-active {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
.ajustes-leave-active {
  transition: opacity 0.12s ease, transform 0.15s ease-in;
}
.ajustes-enter-from,
.ajustes-leave-to {
  opacity: 0;
  transform: scale(0.6);
}
.ajustes-fondo-enter-active,
.ajustes-fondo-leave-active {
  transition: opacity 0.2s ease;
}
.ajustes-fondo-enter-from,
.ajustes-fondo-leave-to {
  opacity: 0;
}

.pico {
  position: absolute;
  top: -7px;
  right: calc(var(--pico) - 6px);
  width: 12px;
  height: 12px;
  transform: rotate(45deg);
  background: inherit;
  border-left: inherit;
  border-top: inherit;
}

@media (prefers-reduced-motion: reduce) {
  .ajustes-enter-active,
  .ajustes-leave-active,
  .ajustes-fondo-enter-active,
  .ajustes-fondo-leave-active {
    transition: none;
  }
}
</style>
