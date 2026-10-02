/**
 * La semana de Eventos (F10): los próximos días, con lo que empieza en cada
 * uno. El primero, hoy, lleva además lo que ya está en marcha.
 *
 * Los eventos van con `startDate` y `endDate` ya leídos (los de la store en
 * vivo). Los días son de medianoche a medianoche en la hora del móvil, que es
 * la de los eventos de LeekDuck.
 */

/** La medianoche del día de `fecha`, en hora local. */
const medianoche = (fecha) => {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * @param {Array} eventos los en marcha y los próximos
 * @param {Date} ahora
 * @param {number} [cuantos] días, hoy incluido
 * @returns {{ fecha: Date, enMarcha: Array, empiezan: Array }[]}
 */
export function diasDeLaSemana(eventos, ahora, cuantos = 7) {
  const hoy = medianoche(ahora)
  const conFecha = (eventos ?? []).filter((evento) => evento.startDate)
  return Array.from({ length: cuantos }, (_, i) => {
    // Con setDate y no sumando 24 h: el día del cambio de hora dura 23 o 25.
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + i)
    const siguiente = new Date(fecha)
    siguiente.setDate(fecha.getDate() + 1)

    const empiezan = conFecha
      .filter((e) => e.startDate >= fecha && e.startDate < siguiente)
      .sort((a, b) => a.startDate - b.startDate)

    // Solo hoy: repetir cada día una temporada de un mes sería ruido. Los que
    // acaban antes van primero, que son los que corren prisa.
    const enMarcha =
      i === 0
        ? conFecha
            .filter((e) => e.startDate < fecha && (!e.endDate || e.endDate > ahora))
            .sort((a, b) => (a.endDate ?? Infinity) - (b.endDate ?? Infinity))
        : []

    return { fecha, enMarcha, empiezan }
  })
}
