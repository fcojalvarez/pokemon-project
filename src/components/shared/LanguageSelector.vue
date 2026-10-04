<script setup>
/**
 * Selector de idioma del menú lateral.
 *
 * El botón enseña solo la bandera del idioma actual; el nombre va en el
 * aria-label. Al pulsarlo, las opciones salen del propio botón hacia arriba:
 * está al pie del cajón y por debajo no hay sitio.
 */
import { computed, nextTick, ref } from 'vue'
import i18n, { LOCALES, setLocale } from '../../plugins/i18n'
import useDetectOutsideClick from '../../composables/useDetectOutsideClick'
import FlagIcon from '../base/FlagIcon.vue'

const isOpen = ref(false)
const root = ref(null)
const trigger = ref(null)
const lista = ref(null)

const actual = computed(() => i18n.global.locale)

const opciones = () => [...(lista.value?.querySelectorAll('[role="menuitemradio"]') ?? [])]

const open = async () => {
  isOpen.value = true
  await nextTick()
  // El foco va al idioma que ya está puesto: así, con el teclado, las
  // flechas parten de ahí y Enter no cambia nada sin querer.
  const i = LOCALES.indexOf(actual.value)
  opciones()[i >= 0 ? i : 0]?.focus()
}

const close = ({ restoreFocus = true } = {}) => {
  if (!isOpen.value) return
  isOpen.value = false
  if (restoreFocus) trigger.value?.focus()
}

const elegir = (locale) => {
  setLocale(locale)
  close()
}

const onKeydown = (event) => {
  if (!isOpen.value) return
  if (event.key === 'Escape') {
    // Que no llegue al cajón: si no, Escape cerraría también el menú entero.
    event.stopPropagation()
    close()
    return
  }
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const items = opciones()
  const i = items.indexOf(document.activeElement)
  const siguiente = {
    ArrowUp: i <= 0 ? items.length - 1 : i - 1,
    ArrowDown: i >= items.length - 1 ? 0 : i + 1,
    Home: 0,
    End: items.length - 1
  }[event.key]
  items[siguiente]?.focus()
}

// Si el foco se va fuera (Tab), la lista se cierra: abierta y sin foco se
// quedaría tapando los enlaces del menú.
const onFocusout = (event) => {
  if (!root.value?.contains(event.relatedTarget)) close({ restoreFocus: false })
}

useDetectOutsideClick(root, () => close({ restoreFocus: false }))
</script>

<template>
  <div ref="root" class="relative flex" @keydown="onKeydown" @focusout="onFocusout">
    <button
      ref="trigger"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      aria-controls="lista-idiomas"
      :aria-label="$t('language.choose', { language: $t(`language.names.${actual}`) })"
      class="boton"
      :class="{ 'boton-activo': isOpen }"
      @click="isOpen ? close() : open()"
    >
      <flag-icon :locale="actual" class="w-[22px] h-4" />
    </button>

    <Transition name="idiomas">
      <ul
        v-show="isOpen"
        id="lista-idiomas"
        ref="lista"
        role="menu"
        :aria-label="$t('language.label')"
        class="idiomas-lista absolute bottom-full left-0 mb-2 z-10 min-w-[9.5rem] p-1.5 rounded-xl border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-md"
      >
        <li
          v-for="(locale, i) in LOCALES"
          :key="locale"
          role="none"
          class="idiomas-opcion"
          :style="{ '--i': LOCALES.length - 1 - i }"
        >
          <button
            type="button"
            role="menuitemradio"
            :aria-checked="locale === actual"
            :lang="locale"
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-150 hover:dark:bg-gray-700 focus-visible:bg-gray-150 focus-visible:dark:bg-gray-700"
            :class="{ 'font-semibold': locale === actual }"
            @click="elegir(locale)"
          >
            <flag-icon :locale="locale" class="w-[22px] h-4" />
            <span class="flex-1">{{ $t(`language.names.${locale}`) }}</span>
            <svg
              v-if="locale === actual"
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke-width="2"
              class="stroke-gray-600 dark:stroke-gray-200"
            >
              <path d="m5 12 5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
/*
 * Sale del botón: el origen del escalado es el centro del botón (22 px de
 * bandera + 10 px de padding a cada lado ≈ 21 px) en el borde de abajo. Las
 * opciones suben detrás, la más cercana al botón primero.
 */
.idiomas-lista {
  transform-origin: 21px calc(100% + 0.5rem);
}
.idiomas-enter-active {
  transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2), opacity 0.16s ease-out;
}
.idiomas-leave-active {
  transition: transform 0.14s ease-in, opacity 0.14s ease-in;
}
.idiomas-enter-from,
.idiomas-leave-to {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.35);
}
.idiomas-enter-active .idiomas-opcion {
  animation: opcion-sube 0.24s ease-out both;
  animation-delay: calc(0.04s + var(--i) * 0.04s);
}
@keyframes opcion-sube {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
}
@media (prefers-reduced-motion: reduce) {
  .idiomas-enter-active,
  .idiomas-leave-active {
    transition: opacity 0.1s linear;
  }
  .idiomas-enter-from,
  .idiomas-leave-to {
    transform: none;
  }
  .idiomas-enter-active .idiomas-opcion {
    animation: none;
  }
}
</style>
