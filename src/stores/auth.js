import { computed, ref } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { supabase } from '../lib/supabaseClient'

/**
 * La sesión de Supabase, que solo usa el panel de sugerencias.
 *
 * A propósito no se arranca en `main.js`: el 99 % de las visitas nunca entra al
 * panel y no tiene por qué cargar nada de autenticación. La vista llama a
 * `init()` al montarse.
 *
 * Quién es administrador lo decide Supabase, no esto: las políticas RLS de
 * `supabase/suggestions.sql` comparan el email del token. Aquí solo se guarda
 * si hay sesión, para saber qué pintar.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  /** Hasta que no se resuelve `init()` no se sabe si hay sesión guardada. */
  const isReady = ref(false)
  const isBusy = ref(false)
  const error = ref(null)

  let desuscribir = null

  const email = computed(() => session.value?.user?.email ?? null)
  const isSignedIn = computed(() => Boolean(session.value))

  const init = async () => {
    if (isReady.value) return

    const { data } = await supabase.auth.getSession()
    session.value = data.session ?? null
    isReady.value = true

    // Mantiene la vista al día cuando el token se renueva solo o cuando se
    // cierra sesión desde otra pestaña.
    if (!desuscribir) {
      const { data: sub } = supabase.auth.onAuthStateChange((_evento, nueva) => {
        session.value = nueva ?? null
      })
      desuscribir = () => sub.subscription.unsubscribe()
    }
  }

  const signIn = async (correo, password) => {
    isBusy.value = true
    error.value = null
    try {
      const { data, error: fallo } = await supabase.auth.signInWithPassword({
        email: String(correo ?? '').trim(),
        password
      })
      if (fallo) throw new Error(fallo.message)
      session.value = data.session ?? null
      return true
    } catch (e) {
      error.value = e.message
      return false
    } finally {
      isBusy.value = false
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    session.value = null
  }

  return { session, isReady, isBusy, error, email, isSignedIn, init, signIn, signOut }
})

// Sin esto, al recargar en caliente Pinia se queda con la definición anterior
// de la store y los métodos nuevos no existen hasta recargar la página entera.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}
