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
import { nextTick, onUnmounted, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCapa } from '../../composables/useCapa'

const props = defineProps({
  open: Boolean,
  title: { type: String, required: true },
  /** Ancho máximo del panel desde sm. */
  size: { type: String, default: 'sm:max-w-lg' },
  /**
   * Selector de lo que se enfoca al abrir (el campo de un formulario). Sin él,
   * el propio panel, para que el lector de pantalla lea el título.
   */
  enfocar: { type: String, default: null }
})
const emit = defineEmits(['close'])

const route = useRoute()
const panel = ref(null)
let origen = null
const titulo = useId()
/** Se cierra porque se ha cambiado de página: el historial ya no se toca. */
let porNavegacion = false
// Lo abre y lo cierra el padre con `open`: aquí solo se le pide que lo cierre.
// Con fullPath, como hasta ahora: también se cierra si cambia la query.
const capa = useCapa(
  ({ navegando = false } = {}) => {
    porNavegacion = navegando
    emit('close')
  },
  { vigilar: () => route.fullPath }
)

/**
 * Escape cierra el diálogo con el foco dentro o perdido en el <body>. Pasa
 * cuando el botón pulsado desaparece al pulsarlo (en la galería de formas,
 * una forma o «Volver a la galería»): escuchando solo en el panel, Escape ya
 * no hacía nada.
 */
const alTeclear = (event) => {
  if (event.key !== 'Escape') return
  const foco = document.activeElement
  if (foco && foco !== document.body && !panel.value?.contains(foco)) return
  emit('close')
}
const escuchar = (si) =>
  (si ? document.addEventListener : document.removeEventListener).call(
    document,
    'keydown',
    alTeclear
  )

watch(
  () => props.open,
  async (abierto) => {
    escuchar(abierto)
    if (abierto) {
      origen = document.activeElement
      capa.alAbrir()
      await nextTick()
      const destino = props.enfocar ? panel.value?.querySelector(props.enfocar) : null
      ;(destino ?? panel.value)?.focus()
    } else {
      capa.alCerrar({ navegando: porNavegacion })
      porNavegacion = false
      if (origen && !origen.closest?.('[inert]')) origen.focus?.()
      origen = null
    }
  },
  { immediate: true }
)

onUnmounted(() => escuchar(false))
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
      >
        <div
          class="flex items-center gap-3 px-4 py-3 border-b border-gray-300 dark:border-gray-600"
        >
          <h2 :id="titulo" class="min-w-0 font-bold leading-snug">{{ title }}</h2>
          <!-- Algún control del contenido junto al título (el «Ver shiny» del sprite). -->
          <div v-if="$slots.acciones" class="ml-auto shrink-0 flex items-center gap-2">
            <slot name="acciones" />
          </div>
          <!-- La ✕ sin caja, como la lupa y los ajustes de la cabecera. -->
          <button
            type="button"
            :class="!$slots.acciones && 'ml-auto'"
            class="zona-tactil shrink-0 w-9 h-9 rounded-xl text-gray-500 dark:text-gray-300 hover:bg-gray-200 hover:dark:bg-gray-700"
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
