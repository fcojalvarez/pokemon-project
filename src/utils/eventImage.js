/**
 * Carteles de evento a la medida de la tarjeta.
 *
 * LeekDuck publica los carteles a 1920×1080 (unos 270 KB en JPEG), y en la
 * tarjeta se pintan a menos de 500 px de ancho: la rejilla tardaba en llenarse
 * bajando píxeles que nadie ve. Su CDN es Cloudflare con el redimensionado de
 * imágenes activo, así que se le pide el ancho que hace falta y el formato que
 * mejor acepte el navegador (AVIF o WebP): a 800 px, unos 40 KB.
 *
 * Solo sirve para imágenes de su propio CDN (con otras da 403); cualquier otra
 * URL se deja tal cual.
 */
const CDN = 'https://cdn.leekduck.com/'
const ANCHOS = [480, 800, 1200]

const redimensionada = (url, ancho) =>
  `${CDN}cdn-cgi/image/width=${ancho},format=auto/${url.slice(CDN.length)}`

/** `srcset` con varios anchos, o null si la imagen no es del CDN de LeekDuck. */
export function eventImageSrcset(url) {
  if (typeof url !== 'string' || !url.startsWith(CDN)) return null
  return ANCHOS.map((ancho) => `${redimensionada(url, ancho)} ${ancho}w`).join(', ')
}

/** La versión de 800 px para `src`, o la original si no es del CDN. */
export function eventImageSrc(url) {
  if (typeof url !== 'string' || !url.startsWith(CDN)) return url
  return redimensionada(url, 800)
}

/** Una miniatura del cartel (la semana de Eventos), o la original si no es del CDN. */
export function eventImageMini(url) {
  if (typeof url !== 'string' || !url.startsWith(CDN)) return url
  return redimensionada(url, 160)
}
