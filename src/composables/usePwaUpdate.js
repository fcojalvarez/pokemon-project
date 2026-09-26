/**
 * Mantiene la app al día cuando hay un despliegue nuevo.
 *
 * El problema que resuelve: instalada como app, la ventana no se cierra nunca,
 * así que el service worker nuevo se quedaba esperando su turno para siempre y
 * había que desinstalarla para ver los cambios.
 *
 * Con `clientsClaim` y `skipWaiting` el nuevo toma el control en cuanto se
 * activa, pero la pestaña que ya está abierta sigue con los ficheros viejos en
 * memoria. Por eso aquí se recarga cuando eso pasa.
 *
 * Además se pregunta por actualizaciones al arrancar y cada vez que se vuelve
 * a la app, que en móvil es lo normal: se deja abierta días entre usos.
 */
const CADA = 60 * 60 * 1000

export function usePwaUpdate() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  // Recarga una sola vez: si el navegador cambia de controlador otra vez
  // mientras se recarga, no hay que entrar en bucle.
  let recargando = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Sin controlador previo es la primera instalación, no una actualización:
    // ahí no hay nada viejo que refrescar.
    if (recargando || !sessionStorage.getItem('sw-activo')) return
    recargando = true
    window.location.reload()
  })

  navigator.serviceWorker.ready.then((registro) => {
    try {
      sessionStorage.setItem('sw-activo', '1')
    } catch {
      /* modo privado: sin esto solo se pierde la protección del primer arranque */
    }

    const mirar = () => {
      if (document.hidden) return
      registro.update().catch(() => {
        /* sin conexión: ya se mirará en la siguiente */
      })
    }

    mirar()
    setInterval(mirar, CADA)
    document.addEventListener('visibilitychange', mirar)
  })
}
