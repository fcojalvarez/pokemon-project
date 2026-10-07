import { computed, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Pinta una lista larga por tandas: primero las que caben en pantalla y el
 * resto en los fotogramas siguientes. El total es el mismo, pero lo primero
 * se ve antes: en el móvil, las 50 filas del Top de golpe dejaban la pantalla
 * en blanco casi un segundo.
 *
 * `lista` es un ref o un getter. Al cambiar la lista (otro tipo, otro filtro)
 * se vuelve a empezar por la primera tanda. Con `completa` (un getter) a true,
 * la lista entera de golpe: para cuando hay que llevar a la vista algo que
 * podría estar en una tanda aún sin pintar.
 */
export function usePorTandas(lista, { primera = 12, paso = 16, completa = () => false } = {}) {
  const leer = typeof lista === 'function' ? lista : () => lista.value
  const cuantas = ref(primera)
  // Cada lista nueva es una generación: las tandas pendientes de la anterior
  // se descartan al llegar.
  let generacion = 0

  // Tras pintar el fotograma, la siguiente tanda. Con la página oculta no hay
  // fotogramas (requestAnimationFrame se para) y la lista se quedaba a medias:
  // entonces, con un temporizador.
  const siguiente = (fn) =>
    typeof window !== 'undefined' && window.requestAnimationFrame && !document.hidden
      ? window.requestAnimationFrame(() => setTimeout(fn, 0))
      : setTimeout(fn, 16)

  const crecer = (gen) => {
    if (gen !== generacion) return
    const total = leer()?.length ?? 0
    if (cuantas.value >= total) return
    cuantas.value = Math.min(total, cuantas.value + paso)
    if (cuantas.value < total) siguiente(() => crecer(gen))
  }

  watch(
    leer,
    () => {
      const gen = ++generacion
      cuantas.value = primera
      siguiente(() => crecer(gen))
    },
    { immediate: true }
  )
  onBeforeUnmount(() => {
    generacion++
  })

  return computed(() => (completa() ? leer() ?? [] : (leer() ?? []).slice(0, cuantas.value)))
}
