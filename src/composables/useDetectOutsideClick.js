import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Llama a `callback` al hacer clic fuera de `component`, que puede ser un
 * elemento o una lista de ellos (fuera de todos). La lista sirve cuando lo que
 * cuenta como «dentro» no es un solo bloque: el botón de Filtros y su panel,
 * sin la Leyenda que va entre los dos en la misma barra.
 */
export default function useDetectOutsideClick(component, callback) {
  if (!component) return
  const listener = (event) => {
    const camino = event.composedPath()
    // Con una lista, dentro es cualquier punto de cualquiera de ellos (también
    // el propio botón). Con un solo elemento, como siempre: el clic en el
    // propio elemento (el fondo de un modal) cuenta como fuera.
    const dentro = Array.isArray(component.value)
      ? component.value.some((zona) => zona && camino.includes(zona))
      : event.target !== component.value && camino.includes(component.value)
    if (dentro) return
    if (typeof callback === 'function') {
      callback(event)
    }
  }
  onMounted(() => {
    window.addEventListener('click', listener)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('click', listener)
  })

  return { listener }
}
