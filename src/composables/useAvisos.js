import { ref } from 'vue'
import { supabaseCompleto } from '../lib/supabaseClient'
import { claveAplicacion } from '../utils/avisos'
import i18n from '../plugins/i18n'

const CLAVE = 'pogodex:avisos'

/** La clave pública VAPID. Sin ella (aún sin configurar) no se ofrecen avisos. */
const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

const leerCategorias = () => {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE))
    return Array.isArray(guardado) ? guardado : null
  } catch {
    return null
  }
}
const guardarCategorias = (categorias) => {
  try {
    if (categorias) localStorage.setItem(CLAVE, JSON.stringify(categorias))
    else localStorage.removeItem(CLAVE)
  } catch {
    /* modo privado: se pierde solo lo marcado, la suscripción sigue */
  }
}

/**
 * Avisos en el móvil (F14): suscribirse en el navegador y apuntarse en
 * Supabase con qué avisar, o darse de baja.
 *
 * Lo que se marcó se guarda también aquí, en el navegador: la tabla no se
 * deja leer con la clave pública, así que es la única forma de enseñarlo.
 */
export function useAvisos() {
  const soportado =
    Boolean(VAPID) &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window

  /** 'off' | 'on' | 'denied' | 'unsupported' */
  const estado = ref(soportado ? 'off' : 'unsupported')
  const categorias = ref(leerCategorias() ?? ['community', 'hours'])
  const ocupado = ref(false)
  const error = ref(null)

  /** Si este navegador ya está suscrito. */
  const comprobar = async () => {
    if (!soportado) return
    if (Notification.permission === 'denied') {
      estado.value = 'denied'
      return
    }
    const registro = await navigator.serviceWorker.getRegistration()
    const suscripcion = await registro?.pushManager.getSubscription()
    estado.value = suscripcion && leerCategorias() ? 'on' : 'off'
  }

  const activar = async (elegidas) => {
    if (!soportado || ocupado.value) return false
    ocupado.value = true
    error.value = null
    try {
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        estado.value = permiso === 'denied' ? 'denied' : 'off'
        return false
      }
      const registro = await navigator.serviceWorker.ready
      const suscripcion =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: claveAplicacion(VAPID)
        }))
      const { endpoint, keys } = suscripcion.toJSON()
      const { error: fallo } = await (
        await supabaseCompleto()
      ).rpc('push_alta', {
        p_endpoint: endpoint,
        p_p256dh: keys.p256dh,
        p_auth: keys.auth,
        p_zona: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        p_idioma: i18n.global.locale === 'en' ? 'en' : 'es',
        p_categorias: elegidas
      })
      if (fallo) throw new Error(fallo.message)
      categorias.value = elegidas
      guardarCategorias(elegidas)
      estado.value = 'on'
      return true
    } catch (err) {
      error.value = err.message
      return false
    } finally {
      ocupado.value = false
    }
  }

  const desactivar = async () => {
    if (!soportado || ocupado.value) return false
    ocupado.value = true
    error.value = null
    try {
      const registro = await navigator.serviceWorker.getRegistration()
      const suscripcion = await registro?.pushManager.getSubscription()
      if (suscripcion) {
        // Primero la baja en la tabla: sin el endpoint ya no se podría dar.
        const { error: fallo } = await (
          await supabaseCompleto()
        ).rpc('push_baja', { p_endpoint: suscripcion.endpoint })
        if (fallo) throw new Error(fallo.message)
        await suscripcion.unsubscribe()
      }
      guardarCategorias(null)
      estado.value = 'off'
      return true
    } catch (err) {
      error.value = err.message
      return false
    } finally {
      ocupado.value = false
    }
  }

  return { soportado, estado, categorias, ocupado, error, comprobar, activar, desactivar }
}
