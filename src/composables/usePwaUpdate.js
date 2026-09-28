/**
 * Avisa de que hay una versión nueva y la pone cuando se pide.
 *
 * El service worker nuevo se descarga solo, pero ya no entra solo (en
 * vite.config.js, registerType 'prompt' y skipWaiting false): antes recargaba
 * la página sin preguntar, a mitad de lo que se estuviera haciendo. Ahora sale
 * un aviso (UpdatePrompt) con «Actualizar», que le da paso y recarga; cerrarlo
 * calla el aviso de esa versión 24 horas. Si se cierra la app del todo, la próxima vez
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
const CLAVE = 'aviso-version-aplazado'
/** La de antes, solo con la fecha: ya no vale y se borra. */
const CLAVE_VIEJA = 'aviso-version-hasta'
const CANAL = 'pogodex-version'

/**
 * Qué versión se aplazó y hasta cuándo: { version, hasta }. Callar el aviso
 * vale solo para esa versión; si sale otra, se avisa aunque no hayan pasado
 * las 24 horas. Antes solo se guardaba la fecha, y cerrar el aviso de una
 * versión callaba también el de las siguientes.
 */
const leerAplazado = () => {
  try {
    localStorage.removeItem(CLAVE_VIEJA)
    const guardado = JSON.parse(localStorage.getItem(CLAVE))
    return guardado && typeof guardado.hasta === 'number' ? guardado : null
  } catch {
    return null
  }
}

const hayNueva = ref(false)
const aplazado = ref(leerAplazado())
const ahora = ref(Date.now())
/** La versión a la que se actualizaría, para decirla en el aviso. */
export const versionNueva = ref(null)

/** El aviso se ve si hay una versión esperando y no se ha aplazado esa misma. */
export const avisoVisible = computed(() => {
  if (!hayNueva.value) return false
  const callado = aplazado.value
  return !(callado && callado.version === versionNueva.value && ahora.value < callado.hasta)
})

let actualizarSW = null

/** Da paso a la versión nueva y recarga la página con ella. */
export function actualizarAhora() {
  actualizarSW?.(true)
}

/** Al cerrar el aviso: no se vuelve a avisar de esta versión en 24 horas. */
export function aplazarAviso() {
  aplazado.value = { version: versionNueva.value, hasta: Date.now() + APLAZAR }
  try {
    localStorage.setItem(CLAVE, JSON.stringify(aplazado.value))
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
    /**
     * Cada push despliega dos veces: el commit, que aún lleva el número de
     * versión de antes, y luego el que lo sube. El primero no se anuncia:
     * actualizar a él dejaba la app en «la misma» versión y enseguida salía
     * otro aviso. Cuando llega el segundo, el service worker lo instala en su
     * lugar y esto vuelve a saltar, ya con el número nuevo.
     */
    async onNeedRefresh() {
      await leerVersion()
      if (versionNueva.value && versionNueva.value === import.meta.env.VITE_APP_VERSION) return
      hayNueva.value = true
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
