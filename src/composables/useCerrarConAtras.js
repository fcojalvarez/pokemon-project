/**
 * El «atrás» del navegador (el gesto o el botón de Android) cierra la ventana
 * que haya abierta encima (un modal, Ajustes, el menú…) en vez de salir de la
 * página. Con el detalle de un evento abierto, atrás se iba de Eventos.
 *
 * Al abrir, se añade una entrada al historial con la misma URL; atrás la
 * quita y cierra la ventana de más arriba. Si se cierra de otra forma (la ✕,
 * Escape, pulsando fuera), se retira esa entrada para no dejar un «atrás» que
 * no hace nada. Si se cierra porque se navega a otra página, no se toca el
 * historial: retirarla desharía esa navegación.
 *
 * La entrada nueva copia el history.state del router, así que para él es la
 * misma página: al volver de ella no navega a ningún sitio.
 */
const pila = []
let popsPropios = 0
let escuchando = false

const escuchar = () => {
  if (escuchando || typeof window === 'undefined') return
  escuchando = true
  window.addEventListener('popstate', () => {
    // El history.back() que hacemos al cerrar desde la propia ventana.
    if (popsPropios > 0) {
      popsPropios--
      return
    }
    const capa = pila.pop()
    if (capa) {
      capa.porAtras = true
      capa.cerrar()
    }
  })
}

/**
 * `cerrar` es lo que cierra la ventana. Devuelve qué llamar al abrirla
 * (`alAbrir`), al cerrarla (`alCerrar`) y, si se cerró porque se cambió de
 * página, `alNavegar` en vez de `alCerrar`.
 */
export function useCerrarConAtras(cerrar) {
  escuchar()
  let capa = null

  const alAbrir = () => {
    if (capa) return
    capa = { cerrar, porAtras: false }
    pila.push(capa)
    history.pushState({ ...history.state, pogodexCapa: pila.length }, '')
  }

  /** La saca de la pila y dice si se cerró con atrás. */
  const quitar = () => {
    const i = pila.indexOf(capa)
    if (i !== -1) pila.splice(i, 1)
    const eraPorAtras = capa.porAtras
    capa = null
    return eraPorAtras
  }

  const alCerrar = () => {
    if (!capa) return
    const eraPorAtras = quitar()
    // Cerrada con atrás, su entrada ya no está. Si no, se retira ahora.
    if (!eraPorAtras) {
      popsPropios++
      history.back()
    }
  }

  const alNavegar = () => {
    if (capa) quitar()
  }

  return { alAbrir, alCerrar, alNavegar }
}
