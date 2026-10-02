import { ref } from 'vue'

/**
 * Orden de los bloques de la ficha, a gusto de cada uno y guardado en el
 * navegador.
 *
 * Es una preferencia personal, así que va en localStorage y no en la cuenta:
 * si el navegador no deja guardar (modo privado, almacenamiento bloqueado), se
 * usa el orden de siempre sin más. Lo guardado se cruza con los bloques que
 * existen: uno que ya no está se ignora y uno nuevo va al final, para que un
 * cambio en la ficha no deje a nadie sin ver una sección.
 */
export const BLOQUES_FICHA = [
  'donde',
  'costes',
  'max',
  'pc',
  'pve',
  'pvp',
  'pvpIv',
  'ataques',
  'efectos',
  'debilidades'
]

const CLAVE = 'pogodex.fichaOrden'

export function ordenValido(guardado, bloques = BLOQUES_FICHA) {
  const lista = Array.isArray(guardado) ? guardado.filter((id) => bloques.includes(id)) : []
  const sinRepetir = [...new Set(lista)]
  return [...sinRepetir, ...bloques.filter((id) => !sinRepetir.includes(id))]
}

function leer() {
  try {
    return ordenValido(JSON.parse(localStorage.getItem(CLAVE) ?? 'null'))
  } catch {
    return [...BLOQUES_FICHA]
  }
}

function guardar(orden) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(orden))
  } catch {
    /* sin almacenamiento: el orden vale para esta visita */
  }
}

// Una sola copia para toda la app: al cambiarlo en una ficha, la siguiente
// ya sale igual.
const orden = ref(leer())

export function useOrdenFicha() {
  /** Deja el orden como la lista que se pasa (saneada) y lo guarda. */
  const fijar = (lista) => {
    orden.value = ordenValido(lista)
    guardar(orden.value)
  }

  const restablecer = () => {
    orden.value = [...BLOQUES_FICHA]
    try {
      localStorage.removeItem(CLAVE)
    } catch {
      /* nada que borrar */
    }
  }

  return { orden, fijar, restablecer }
}
