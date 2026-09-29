import { onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useInertApp } from './useInertApp'
import { useCerrarConAtras } from './useCerrarConAtras'

/**
 * Lo que comparten todas las ventanas que se abren encima de la app (el menú
 * lateral, Ajustes, el diálogo de sugerencias y BaseModal):
 *
 * - la app queda inerte mientras están abiertas (useInertApp);
 * - el «atrás» del navegador las cierra (useCerrarConAtras);
 * - la página de detrás no hace scroll, si se pide (`bloquearScroll`);
 * - al cambiar de página se cierran solas;
 * - si el componente se desmonta abiertas, no dejan nada de lo anterior
 *   colgando (la app inerte, el scroll fijo o la entrada del historial).
 *
 * `cerrar` es lo que cierra la ventana en el componente. Se llama con
 * `{ restoreFocus: false, navegando: true }` cuando se cierra por cambiar de
 * página, y sin nada cuando es el «atrás». El componente, al cerrar, llama a
 * `alCerrar` con el mismo `navegando`.
 *
 * `vigilar` dice qué cambio de la ruta cuenta como cambiar de página: por
 * defecto el path, para que cambiar un filtro de la URL no la cierre.
 */
export function useCapa(cerrar, { bloquearScroll = true, vigilar } = {}) {
  const route = useRoute()
  const { bloquear, liberar } = useInertApp()
  const atras = useCerrarConAtras(() => cerrar())
  let abierta = false

  const alAbrir = () => {
    if (abierta) return
    abierta = true
    atras.alAbrir()
    bloquear()
    if (bloquearScroll) document.body.style.overflow = 'hidden'
  }

  /**
   * `navegando`: se cierra porque se va a otra página. Entonces no se retira
   * la entrada del historial: hacerlo desharía la navegación que se acaba de
   * pedir.
   */
  const alCerrar = ({ navegando = false } = {}) => {
    if (!abierta) return
    abierta = false
    if (navegando) atras.alNavegar()
    else atras.alCerrar()
    // Antes de devolver el foco: sobre una app inerte no se puede enfocar nada.
    liberar()
    if (bloquearScroll) document.body.style.overflow = ''
  }

  watch(vigilar ?? (() => route.path), () => {
    if (abierta) cerrar({ restoreFocus: false, navegando: true })
  })

  onUnmounted(() => alCerrar({ navegando: true }))

  return { alAbrir, alCerrar }
}
