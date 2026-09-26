/**
 * Deja inerte la app (todo lo que hay dentro de #app) mientras haya abierto
 * un panel modal: el menú lateral o el diálogo de sugerencias, que se montan
 * con Teleport fuera de #app. Con `inert` el tabulador no se escapa del panel
 * a la página de detrás, y un lector de pantalla tampoco la recorre.
 *
 * Lleva la cuenta en vez de un sí/no: al abrir sugerencias desde el menú, uno
 * se cierra y el otro se abre casi a la vez, y el orden no debe importar.
 */
let abiertos = 0

const aplicar = () => {
  const app = document.getElementById('app')
  if (!app) return
  if (abiertos > 0) app.setAttribute('inert', '')
  else app.removeAttribute('inert')
}

export function useInertApp() {
  let activo = false

  const bloquear = () => {
    if (activo) return
    activo = true
    abiertos++
    aplicar()
  }

  const liberar = () => {
    if (!activo) return
    activo = false
    abiertos = Math.max(0, abiertos - 1)
    aplicar()
  }

  return { bloquear, liberar }
}
