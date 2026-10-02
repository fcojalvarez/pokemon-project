import { reactive, ref } from 'vue'

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
  consulta.addEventListener?.('change', (evento) => {
    esEscritorio.value = evento.matches
  })
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

  return { estaAbierta, alternar, esEscritorio }
}
