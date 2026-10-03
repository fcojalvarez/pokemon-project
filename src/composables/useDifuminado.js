/**
 * Difumina los bordes de una fila que se desliza en horizontal (los chips de
 * Eventos y Ahora), solo por el lado en el que queda algo: antes el último
 * chip salía cortado en seco («M…») y no se veía que la fila seguía.
 *
 * Es una directiva: `v-difuminado` en el elemento con overflow-x-auto. Pone
 * --difumina-izq y --difumina-dcha (0 o el ancho del degradado), que usa la
 * clase `.difuminado` de index.css como máscara. Al llegar al final, el borde
 * vuelve a ser nítido.
 */
const ANCHO = '2rem'

const medir = (el) => {
  const queda = el.scrollWidth - el.clientWidth - el.scrollLeft
  el.style.setProperty('--difumina-izq', el.scrollLeft > 1 ? ANCHO : '0px')
  el.style.setProperty('--difumina-dcha', queda > 1 ? ANCHO : '0px')
}

export const vDifuminado = {
  mounted(el) {
    el.classList.add('difuminado')
    const alMover = () => medir(el)
    el.addEventListener('scroll', alMover, { passive: true })
    // Cambia el ancho (girar el móvil) o los chips (llegan los datos).
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(alMover)
    observador?.observe(el)
    for (const hijo of el.children) observador?.observe(hijo)
    el._difuminado = { alMover, observador }
    medir(el)
  },
  updated(el) {
    medir(el)
  },
  unmounted(el) {
    el.removeEventListener('scroll', el._difuminado?.alMover)
    el._difuminado?.observador?.disconnect()
  }
}
