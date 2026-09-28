/**
 * Avisa de que hay una versión nueva y la pone cuando se pide.
 *
 * El service worker nuevo se descarga solo, pero ya no entra solo (en
 * vite.config.js, registerType 'prompt' y skipWaiting false): antes recargaba
 * la página sin preguntar, a mitad de lo que se estuviera haciendo. Ahora sale
 * un aviso (UpdatePrompt) con «Actualizar», que le da paso y recarga; cerrarlo
 * lo calla 24 horas. Si se cierra la app del todo, la próxima vez
 * ya arranca con la nueva.
 *
 * Cuándo se entera de que la hay:
 *   - Al instante, por websocket: tras cada despliegue a producción, un
 *     workflow (aviso-version.yml) manda un mensaje por Supabase Realtime a
 *     las apps abiertas. El mensaje no se cree tal cual (lo podría mandar
 *     cualquiera con la clave pública): solo hace que se busque ya. Si no hay
 *     nada nuevo, no pasa nada.
 *   - Y como siempre: al arrancar, al volver a la app y cada hora, por si el
 *     websocket no estaba (sin red, en segundo plano…).
 */
import { computed, ref } from 'vue'

const CADA = 60 * 60 * 1000
const APLAZAR = 24 * 60 * 60 * 1000
const CLAVE = 'aviso-version-hasta'
const CANAL = 'pogodex-version'

const leerAplazado = () => {
  try {
    return Number(localStorage.getItem(CLAVE)) || 0
  } catch {
    return 0
  }
}

const hayNueva = ref(false)
const aplazadoHasta = ref(leerAplazado())
const ahora = ref(Date.now())
/** La versión a la que se actualizaría, para decirla en el aviso. */
export const versionNueva = ref(null)

/** El aviso se ve si hay una versión esperando y no se ha aplazado. */
export const avisoVisible = computed(() => hayNueva.value && ahora.value >= aplazadoHasta.value)

let actualizarSW = null

/** Da paso a la versión nueva y recarga la página con ella. */
export function actualizarAhora() {
  actualizarSW?.(true)
}

/** Al cerrar el aviso: no se vuelve a avisar en 24 horas. */
export function aplazarAviso() {
  const hasta = Date.now() + APLAZAR
  aplazadoHasta.value = hasta
  try {
    localStorage.setItem(CLAVE, String(hasta))
  } catch {
    /* sin almacenamiento, se calla solo mientras dure esta visita */
  }
}

const leerVersion = async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
    if (res.ok) versionNueva.value = (await res.json()).version ?? null
  } catch {
    /* el aviso sale igual, sin el número */
  }
}

/**
 * El canal por el que llega el aviso de despliegue. El cliente completo de
 * Supabase (con Realtime) va en su propio fichero: se pide cuando la app ya
 * está pintada, para no quitarle nada al arranque.
 */
const escucharDespliegues = (buscar) => {
  const empezar = async () => {
    try {
      const { supabaseCompleto } = await import('../lib/supabaseClient')
      const supabase = await supabaseCompleto()
      supabase.channel(CANAL).on('broadcast', { event: 'nueva-version' }, buscar).subscribe()
    } catch {
      /* sin websocket quedan las comprobaciones de siempre */
    }
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(empezar, { timeout: 5000 })
  else setTimeout(empezar, 3000)
}

export async function usePwaUpdate() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const { registerSW } = await import('virtual:pwa-register')
  actualizarSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      hayNueva.value = true
      leerVersion()
    },
    onRegisteredSW(_url, registro) {
      if (!registro) return
      const buscar = () => {
        registro.update().catch(() => {
          /* sin conexión: ya se mirará en la siguiente */
        })
      }
      const alVolver = () => {
        if (document.hidden) return
        // Al volver también cuenta el tiempo: si pasaron las 24 horas, el
        // aviso aplazado vuelve a salir.
        ahora.value = Date.now()
        buscar()
      }
      buscar()
      setInterval(alVolver, CADA)
      document.addEventListener('visibilitychange', alVolver)
      escucharDespliegues(buscar)
    }
  })
}
