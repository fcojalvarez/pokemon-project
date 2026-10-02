import { computed, ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { supabaseCompleto } from '../lib/supabaseClient'
// El cliente con sesión se descarga al usarlo por primera vez: el botón de
// sugerencias está en el menú, y cargarlo al arrancar metía 32 KB en el bundle.

/** Las categorías y estados válidos están replicados en el CHECK de la tabla. */
export const CATEGORIES = ['bug', 'idea', 'data', 'other']
export const STATUSES = ['new', 'doing', 'done', 'discarded']

const MIN_MESSAGE = 10
export const MAX_MESSAGE = 2000

/**
 * Cuánto hay que esperar entre dos sugerencias del mismo navegador.
 *
 * Es un freno de cortesía, no una defensa: vive en localStorage y se salta
 * borrándolo. Frenar de verdad el spam necesitaría algo del lado del servidor
 * (una Edge Function con límite por IP); mientras no lo haya, lo que protege
 * los datos es la RLS, que impide leer y modificar lo que ya está enviado.
 */
export const COOLDOWN_MS = 60 * 1000
const COOLDOWN_KEY = 'pogodex:ultimaSugerencia'

/**
 * Comprueba lo que se va a enviar y devuelve la clave del error, o null.
 *
 * Devuelve la clave y no el texto para que la traducción la resuelva el
 * componente, y para poder probar esto sin montar i18n.
 */
export function validate({ category, message, contact } = {}) {
  if (!CATEGORIES.includes(category)) return 'category'

  const texto = String(message ?? '').trim()
  if (texto.length < MIN_MESSAGE) return 'tooShort'
  if (texto.length > MAX_MESSAGE) return 'tooLong'

  const email = String(contact ?? '').trim()
  // Vacío vale: el contacto es opcional. Si lo rellenan, al menos que tenga
  // forma de email, porque una dirección mal escrita es peor que ninguna.
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'contact'

  return null
}

/** Segundos que faltan para poder enviar otra vez. 0 si ya se puede. */
export function remainingCooldown(lastAt, now = Date.now(), cooldownMs = COOLDOWN_MS) {
  const at = Number(lastAt)
  if (!Number.isFinite(at) || at <= 0) return 0
  // Un reloj que se ha movido hacia atrás dejaría el envío bloqueado durante
  // horas; si la marca está en el futuro se ignora.
  if (at > now) return 0
  return Math.max(0, Math.ceil((cooldownMs - (now - at)) / 1000))
}

function leerUltimoEnvio() {
  try {
    return Number(localStorage.getItem(COOLDOWN_KEY)) || 0
  } catch {
    return 0
  }
}

function guardarUltimoEnvio(at) {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(at))
  } catch {
    // Modo privado o almacenamiento lleno: sin freno, pero el envío es válido.
  }
}

/**
 * Las sugerencias que manda la gente desde el menú.
 *
 * Tiene dos mitades que casi no se tocan: `send`, que usa cualquiera sin
 * identificarse, y el resto, que solo funciona con la sesión del administrador
 * abierta porque la RLS de Supabase bloquea el `select` a todo lo demás.
 */
export const useSuggestionsStore = defineStore('suggestions', () => {
  const items = ref([])
  const isLoading = ref(false)
  const isSending = ref(false)
  const error = ref(null)

  const countsByStatus = computed(() =>
    Object.fromEntries(
      STATUSES.map((status) => [
        status,
        items.value.filter((item) => item.status === status).length
      ])
    )
  )

  /** Cuántas hay sin tocar, para el contador del panel. */
  const pendingCount = computed(() => countsByStatus.value.new)

  /** Al cerrar sesión: la lista era de quien la tenía abierta. */
  const reset = () => {
    items.value = []
  }

  /**
   * Envía una sugerencia.
   *
   * Devuelve `{ ok }` en vez de lanzar: el formulario tiene que pintar el
   * error dentro del diálogo, no dejar que suba.
   */
  const send = async ({ category, message, contact, page }) => {
    const invalido = validate({ category, message, contact })
    if (invalido) return { ok: false, errorKey: invalido }

    const espera = remainingCooldown(leerUltimoEnvio())
    if (espera > 0) return { ok: false, errorKey: 'cooldown', seconds: espera }

    isSending.value = true
    error.value = null
    try {
      // Sin `.select()` a propósito: la RLS no deja leer, así que pedir la
      // fila de vuelta haría fallar un insert que en realidad ha ido bien.
      const { error: fallo } = await (await supabaseCompleto()).from('suggestions').insert({
        category,
        message: String(message).trim(),
        contact: String(contact ?? '').trim() || null,
        page: page ?? null,
        app_version: import.meta.env.VITE_APP_VERSION ?? null
      })
      if (fallo) throw new Error(fallo.message)

      guardarUltimoEnvio(Date.now())
      return { ok: true }
    } catch (e) {
      error.value = e.message
      return { ok: false, errorKey: 'network', detail: e.message }
    } finally {
      isSending.value = false
    }
  }

  /** Carga todas las sugerencias. Solo responde con sesión de administrador. */
  const load = async () => {
    isLoading.value = true
    error.value = null
    try {
      const { data, error: fallo } = await (await supabaseCompleto())
        .from('suggestions')
        .select('*')
        .order('created_at', { ascending: false })
      if (fallo) throw new Error(fallo.message)
      items.value = data ?? []
    } catch (e) {
      error.value = e.message
      items.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Cambia campos de una sugerencia.
   *
   * Actualiza primero la copia local y la deshace si Supabase falla: el panel
   * es de una sola persona, así que esperar a la respuesta para mover un
   * estado solo añade parpadeo.
   */
  const update = async (id, cambios) => {
    const indice = items.value.findIndex((item) => item.id === id)
    const previo = indice >= 0 ? { ...items.value[indice] } : null
    if (indice >= 0) items.value[indice] = { ...items.value[indice], ...cambios }

    const { error: fallo } = await (await supabaseCompleto())
      .from('suggestions')
      .update(cambios)
      .eq('id', id)
    if (fallo) {
      if (previo) items.value[indice] = previo
      error.value = fallo.message
      return false
    }
    return true
  }

  const setStatus = (id, status) => update(id, { status })

  const remove = async (id) => {
    const { error: fallo } = await (await supabaseCompleto())
      .from('suggestions')
      .delete()
      .eq('id', id)
    if (fallo) {
      error.value = fallo.message
      return false
    }
    items.value = items.value.filter((item) => item.id !== id)
    return true
  }

  return {
    items,
    isLoading,
    isSending,
    error,
    pendingCount,
    countsByStatus,
    send,
    load,
    update,
    setStatus,
    remove,
    reset
  }
})

// Sin esto, al recargar en caliente Pinia se queda con la definición anterior
// de la store y los métodos nuevos no existen hasta recargar la página entera.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSuggestionsStore, import.meta.hot))
}
