import { nextTick, reactive, ref } from 'vue'

/**
 * Qué secciones de la ficha están abiertas.
 *
 * Es el mismo estado para todas las fichas y se guarda en el navegador: si
 * alguien pliega «Puesto PvP» porque no juega PvP, se queda plegado en todos
 * los Pokémon que abra después.
 *
 * Por defecto, cerradas: cada una enseña su resumen en una línea y la ficha se
 * ve corta desde el principio. En escritorio (lg) van siempre abiertas: con
 * las dos columnas sobra sitio y plegar no ahorra nada.
 */

const CLAVE = 'pogodex:ficha-secciones'

const leer = () => {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? '{}')
    return guardado && typeof guardado === 'object' ? guardado : {}
  } catch {
    return {}
  }
}

const abiertas = reactive(leer())
const esEscritorio = ref(false)
let vigilando = false

const vigilarAncho = () => {
  if (vigilando || typeof window === 'undefined' || !window.matchMedia) return
  vigilando = true
  const consulta = window.matchMedia('(min-width: 1024px)')
  esEscritorio.value = consulta.matches
  consulta.addEventListener?.('change', (evento) => { esEscritorio.value = evento.matches })
}

export function useFichaSecciones() {
  vigilarAncho()

  const estaAbierta = (id) => esEscritorio.value || abiertas[id] === true

  const guardar = () => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(abiertas))
    } catch {
      // Sin almacenamiento (modo privado): se recuerda solo mientras dure la visita.
    }
  }

  const alternar = (id) => {
    abiertas[id] = !abiertas[id]
    guardar()
  }

  /**
   * Abre la sección y la trae a la vista, con el foco dentro: es a donde se
   * salta desde la cabecera de la ficha («Gigamax» → Combates Max).
   */
  const irA = async (id) => {
    if (!estaAbierta(id)) {
      abiertas[id] = true
      guardar()
      await nextTick()
    }
    const seccion = document.getElementById(`ficha-${id}`)
    if (!seccion) return
    // El foco antes: en Chrome, un focus() a mitad del scroll suave lo corta.
    seccion.focus({ preventScroll: true })
    const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    seccion.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' })
  }

  return { estaAbierta, alternar, irA, esEscritorio }
}
