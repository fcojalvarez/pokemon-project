/**
 * La dirección si es un enlace web normal (https), o null.
 *
 * Los enlaces de los eventos llegan en tiempo real de ScrapedDuck, que no es
 * nuestro, y Vue pinta un `:href` tal cual: un `javascript:…` ahí ejecutaría
 * código en nuestro dominio, que es donde vive la sesión del administrador.
 * Con esto, lo que no sea https no se enlaza.
 */
export function enlaceSeguro(url) {
  if (typeof url !== 'string') return null
  try {
    return new URL(url).protocol === 'https:' ? url : null
  } catch {
    return null
  }
}
