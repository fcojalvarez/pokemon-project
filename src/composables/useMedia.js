import { onBeforeUnmount, ref } from 'vue'

/**
 * Si se cumple una media query, como ref reactiva. Para cuando no basta con
 * esconder por CSS y hay que pintar otra cosa (el Top: tabla en escritorio
 * ancho, lista en el resto), sin tener las dos en la página a la vez.
 */
export function useMedia(query) {
  const cumple = ref(false)
  if (typeof window === 'undefined' || !window.matchMedia) return cumple

  const consulta = window.matchMedia(query)
  cumple.value = consulta.matches
  const alCambiar = (evento) => { cumple.value = evento.matches }
  consulta.addEventListener?.('change', alCambiar)
  onBeforeUnmount(() => consulta.removeEventListener?.('change', alCambiar))
  return cumple
}
