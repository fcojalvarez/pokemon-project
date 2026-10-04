import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Si hay un campo de texto con el foco (el buscador, una sugerencia…). Con el
 * teclado abierto, Chrome en Android encoge la ventana y lo fijo a la
 * pantalla tapaba justo los resultados del buscador: la barra de secciones y
 * la de Leyenda y Filtros de la Pokédex se esconden mientras dura.
 */
const esCampo = (el) =>
  el?.matches?.(
    'input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable="true"]'
  )

export function useEscribiendo() {
  const escribiendo = ref(false)
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
  return escribiendo
}
