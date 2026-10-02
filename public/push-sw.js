/*
 * Avisos en el móvil (F14): lo que hace el service worker al llegar uno.
 *
 * El service worker lo genera vite-plugin-pwa; esto se le añade con
 * `workbox.importScripts` (vite.config.js). El aviso llega del workflow
 * avisos.yml con { title, body, url, tag } en JSON.
 */
self.addEventListener('push', (event) => {
  let datos = {}
  try {
    datos = event.data ? event.data.json() : {}
  } catch {
    datos = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(datos.title || 'PoGoDex', {
      body: datos.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // El mismo evento no se apila dos veces si llega repetido.
      tag: datos.tag || undefined,
      data: { url: datos.url || '/events' }
    })
  )
})

// Al tocar el aviso: a la pestaña que ya esté abierta, o una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL(event.notification.data?.url || '/events', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if (new URL(ventana.url).origin === self.location.origin && 'focus' in ventana) {
          ventana.navigate?.(destino)
          return ventana.focus()
        }
      }
      return self.clients.openWindow(destino)
    })
  )
})
