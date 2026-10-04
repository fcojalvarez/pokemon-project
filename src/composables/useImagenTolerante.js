import { computed, ref, toValue, watch } from 'vue'

/**
 * Una imagen de fuera (LeekDuck) que no se queda rota a la primera.
 *
 * Se piden con `crossorigin` para que el service worker no guarde respuestas
 * opacas (podían esconder un 404). El precio: si la respuesta llega sin la
 * cabecera CORS —una copia vieja en la caché del móvil, o un nodo del CDN que
 * la quita—, el navegador la rechaza aunque la imagen exista. En producción
 * salían así los Pokémon de algunas tarjetas de evento en Android.
 *
 * Por eso, al fallar: 1) la misma URL sin `crossorigin`, que no puede fallar
 * por CORS (y el service worker no la guarda: solo guarda las 200 de verdad);
 * 2) la de respaldo, si la hay (nuestro sprite, servido desde la web);
 * 3) nada: mejor sin imagen que con el icono de imagen rota.
 *
 * `src` y `respaldo` pueden ser refs o getters.
 */
export function useImagenTolerante(src, respaldo = null) {
  // 0: con crossorigin · 1: sin crossorigin · 2: respaldo · 3: sin imagen
  const intento = ref(0)

  watch(
    () => toValue(src),
    () => {
      intento.value = 0
    }
  )

  const url = computed(() => {
    if (intento.value <= 1) return toValue(src) || null
    if (intento.value === 2) return toValue(respaldo) || null
    return null
  })

  /** Solo en el primer intento: en el segundo es justo lo que se quita. */
  const crossorigin = computed(() => (intento.value === 1 ? undefined : 'anonymous'))

  /**
   * Solo cuenta el fallo del `<img>` que está en la página. Si Vue lo cambia
   * por otro (en EventMon, el `span` pasa a `router-link` al llegar el
   * roster), el viejo sigue con su petición en vuelo y su `@error` puesto:
   * contaba como un segundo fallo y saltaba al respaldo sin haber probado
   * sin `crossorigin`.
   */
  const alFallar = (evento) => {
    if (evento?.target?.isConnected === false) return
    intento.value++
    // Sin respaldo, del segundo intento se pasa directamente a no enseñarla.
    if (intento.value === 2 && !toValue(respaldo)) intento.value = 3
  }

  return { url, crossorigin, alFallar }
}
