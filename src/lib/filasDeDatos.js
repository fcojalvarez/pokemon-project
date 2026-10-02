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

/**
 * Las filas de `game_data` con esos nombres: { nombre: payload }. Las que no
 * existen en la tabla no vienen. Si Supabase falla, lanza el error.
 */
export async function leerFilas(nombres) {
  const [versiones, guardadas] = await Promise.all([
    supabase.from('game_data').select('name,updated_at').in('name', nombres),
    leerGuardadas(nombres)
  ])
  if (versiones.error) throw new Error(versiones.error.message)

  const filas = {}
  const faltan = []
  for (const { name, updated_at: version } of versiones.data ?? []) {
    const guardada = guardadas.get(name)
    if (guardada && guardada.updated_at === version && guardada.payload != null)
      filas[name] = guardada.payload
    else faltan.push(name)
  }

  if (faltan.length) {
    const { data, error } = await supabase
      .from('game_data')
      .select('name,payload,updated_at')
      .in('name', faltan)
    if (error) throw new Error(error.message)
    for (const fila of data ?? []) filas[fila.name] = fila.payload
    guardar(data ?? [])
  }
  return filas
}
