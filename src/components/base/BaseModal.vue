<script setup>
/**
 * Diálogo modal: fondo oscuro, panel con título y botón de cerrar.
 *
 * Mismo trato que el de sugerencias: va en `Teleport` fuera de #app, deja la
 * app inerte mientras está abierto (el tabulador no se escapa a la página de
 * detrás), se cierra con Escape, pulsando fuera o al navegar, y devuelve el
 * foco a quien lo abrió. En móvil sale desde abajo, a todo lo ancho. El
 * «atrás» del navegador lo cierra en vez de salir de la página
 * (useCerrarConAtras).
 */
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useInertApp } from '../../composables/useInertApp'
import { useCerrarConAtras } from '../../composables/useCerrarConAtras'

const props = defineProps({
  open: Boolean,
  title: { type: String, required: true },
  /** Ancho máximo del panel desde sm. */
  size: { type: String, default: 'sm:max-w-lg' }
})
const emit = defineEmits(['close'])

const route = useRoute()
const { bloquear, liberar } = useInertApp()
const panel = ref(null)
let origen = null
const titulo = `modal-${Math.random().toString(36).slice(2, 9)}`
const atras = useCerrarConAtras(() => emit('close'))
/** Se cierra porque se ha cambiado de página: el historial ya no se toca. */
let porNavegacion = false

watch(
  () => props.open,
  async (abierto) => {
    if (abierto) {
      origen = document.activeElement
      bloquear()
      document.body.style.overflow = 'hidden'
      atras.alAbrir()
      await nextTick()
      panel.value?.focus()
    } else {
      if (porNavegacion) atras.alNavegar()
      else atras.alCerrar()
      porNavegacion = false
      liberar()
      document.body.style.overflow = ''
      if (origen && !origen.closest?.('[inert]')) origen.focus?.()
      origen = null
    }
  },
  { immediate: true }
)

watch(() => route.fullPath, () => {
  if (!props.open) return
  porNavegacion = true
  emit('close')
})

onUnmounted(() => {
  atras.alNavegar()
  liberar()
  document.body.style.overflow = ''
})

const onKeydown = (event) => {
  if (event.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] bg-gray-900/60 flex items-end sm:items-center justify-center sm:p-4"
      @click.self="emit('close')"
    >
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titulo"
        tabindex="-1"
        class="w-full max-h-[90vh] flex flex-col bg-gray-100 dark:bg-gray-800 border border-gray-400 dark:border-gray-600 rounded-t-xl sm:rounded-xl shadow-md outline-none text-gray-800 dark:text-gray-200"
        :class="size"
        @keydown="onKeydown"
      >
        <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
          <h2 :id="titulo" class="min-w-0 font-bold leading-snug">{{ title }}</h2>
          <!-- La ✕ sin caja, como la lupa y los ajustes de la cabecera. -->
          <button
            type="button"
            class="zona-tactil ml-auto shrink-0 w-9 h-9 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-200 hover:dark:bg-gray-700"
            :aria-label="$t('common.close')"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
        <div class="overflow-y-auto">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
