import { supabase } from './supabaseClient'

/**
 * Filas de `game_data` guardadas en el dispositivo (IndexedDB).
 *
 * El roster, los ataques, los rankings… pesan casi 3 MB y antes se bajaban
 * enteros en cada visita. Ahora se pregunta primero qué versión hay de cada
 * fila (su `updated_at`, unos 70 ms) y solo se baja la que ha cambiado desde
 * la última vez.
 *
 * No caduca por tiempo: vale mientras la fila de Supabase siga siendo la
 * misma, y en cuanto un workflow la reescribe cambia su `updated_at` y se baja
 * la nueva. Así no puede quedarse nada viejo. Si IndexedDB no está (modo
 * privado, navegador raro) o falla, se baja todo como antes.
 *
 * Sin red (o si Supabase no responde), se usa lo guardado aunque no se pueda
 * comprobar si sigue al día: es la copia más reciente que hay. Antes se
 * lanzaba el error y la app tiraba de los JSON del despliegue, que pueden
 * ser de varios días antes.
 */

const BASE_DE_DATOS = 'pogodex-datos'
const ALMACEN = 'filas'
/** IndexedDB en Safari a veces no responde nunca: pasado esto, se sigue sin él. */
const ESPERA_MAXIMA_MS = 1500

let abierta = null
function abrir() {
  abierta ??= new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    const plazo = setTimeout(() => resolve(null), ESPERA_MAXIMA_MS)
    const terminar = (db) => {
      clearTimeout(plazo)
      resolve(db)
    }
    try {
      const peticion = indexedDB.open(BASE_DE_DATOS, 1)
      peticion.onupgradeneeded = () =>
        peticion.result.createObjectStore(ALMACEN, { keyPath: 'name' })
      peticion.onsuccess = () => {
        const db = peticion.result
        // Si otra pestaña con una versión nueva de la app necesita la base,
        // se le deja: la próxima lectura vuelve a abrirla.
        db.onversionchange = () => {
          db.close()
          abierta = null
        }
        terminar(db)
      }
      peticion.onerror = () => terminar(null)
      peticion.onblocked = () => terminar(null)
    } catch {
      terminar(null)
    }
  })
  return abierta
}

/** Las filas guardadas con esos nombres: Map nombre -> { updated_at, payload }. */
async function leerGuardadas(nombres) {
  const db = await abrir()
  if (!db) return new Map()
  return new Promise((resolve) => {
    const guardadas = new Map()
    try {
      const almacen = db.transaction(ALMACEN, 'readonly').objectStore(ALMACEN)
      for (const nombre of nombres) {
        const peticion = almacen.get(nombre)
        peticion.onsuccess = () => {
          if (peticion.result) guardadas.set(nombre, peticion.result)
        }
      }
      almacen.transaction.oncomplete = () => resolve(guardadas)
      almacen.transaction.onerror = () => resolve(new Map())
      almacen.transaction.onabort = () => resolve(new Map())
    } catch {
      resolve(new Map())
    }
  })
}

async function guardar(filas) {
  const db = await abrir()
  if (!db || !filas.length) return
  try {
    const almacen = db.transaction(ALMACEN, 'readwrite').objectStore(ALMACEN)
    for (const { name, updated_at, payload } of filas) almacen.put({ name, updated_at, payload })
  } catch {
    // Sin espacio o sin permiso: la próxima vez se bajará otra vez, nada más.
  }
}

/** Lo guardado en el dispositivo, como { nombre: payload }; si no hay nada, el error. */
function soloGuardadas(guardadas, error) {
  if (!guardadas.size) throw error
  return Object.fromEntries(
    [...guardadas]
      .filter(([, fila]) => fila.payload != null)
      .map(([nombre, fila]) => [nombre, fila.payload])
  )
}

/**
 * Pregunta a Supabase las versiones y baja las filas que han cambiado (o que
 * no estaban guardadas). Devuelve { filas, nuevas }: todas las que hay, y de
 * ellas las que se han bajado ahora. Si Supabase falla, lanza el error.
 */
async function comprobar(nombres, guardadas) {
  const versiones = await supabase
    .from('game_data')
    .select('name,updated_at')
    .in('name', nombres)
    .then(
      (respuesta) => respuesta,
      (error) => ({ error })
    )
  if (versiones.error) throw new Error(versiones.error.message ?? String(versiones.error))

  const filas = {}
  const faltan = []
  for (const { name, updated_at: version } of versiones.data ?? []) {
    const guardada = guardadas.get(name)
    if (guardada && guardada.updated_at === version && guardada.payload != null)
      filas[name] = guardada.payload
    else faltan.push(name)
  }
  if (!faltan.length) return { filas, nuevas: {} }

  const { data, error } = await supabase
    .from('game_data')
    .select('name,payload,updated_at')
    .in('name', faltan)
  if (error) {
    // La consulta de versiones fue bien pero la de contenidos no: lo guardado
    // de las que faltan, aunque esté por detrás.
    for (const nombre of faltan) {
      const guardada = guardadas.get(nombre)
      if (guardada?.payload != null) filas[nombre] = guardada.payload
    }
    if (!Object.keys(filas).length) throw new Error(error.message)
    return { filas, nuevas: {} }
  }
  const nuevas = {}
  for (const fila of data ?? []) {
    filas[fila.name] = fila.payload
    nuevas[fila.name] = fila.payload
  }
  guardar(data ?? [])
  return { filas, nuevas }
}

/**
 * Las filas de `game_data` con esos nombres: { nombre: payload }. Las que no
 * existen en la tabla no vienen. Si Supabase falla, las guardadas en el
 * dispositivo; si tampoco hay, lanza el error.
 *
 * Con `alActualizar`, si en el dispositivo están ya todas las
 * `imprescindibles`, se devuelven al momento, sin esperar a Supabase: abrir
 * la app ya no espera a la red (de 0,5 a 1 s en el móvil). Las versiones se
 * comprueban por detrás y, si alguna fila ha cambiado, se baja y se llama a
 * `alActualizar({ nombre: payload })` con las nuevas.
 */
export async function leerFilas(nombres, { alActualizar = null, imprescindibles = nombres } = {}) {
  const guardadas = await leerGuardadas(nombres)

  const deGuardadas = () => soloGuardadas(guardadas, new Error('sin datos guardados'))
  if (alActualizar && imprescindibles.every((nombre) => guardadas.get(nombre)?.payload != null)) {
    comprobar(nombres, guardadas)
      .then(({ nuevas }) => {
        if (Object.keys(nuevas).length) alActualizar(nuevas)
      })
      .catch(() => {
        /* sin red: se sigue con lo guardado, como al arrancar sin conexión */
      })
    return deGuardadas()
  }

  try {
    return (await comprobar(nombres, guardadas)).filas
  } catch (err) {
    return soloGuardadas(guardadas, err)
  }
}
