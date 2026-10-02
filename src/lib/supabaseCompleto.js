import { createClient } from '@supabase/supabase-js'

/**
 * Cliente completo de Supabase: con sesión, para las sugerencias y el panel
 * de administración (las políticas RLS miran el token). Va en su propio chunk
 * y solo se carga desde `supabaseCompleto()` en supabaseClient.js.
 */
export const supabase = createClient(
  import.meta.env.VITE_BASE_SUPABASE_URL,
  import.meta.env.VITE_BASE_SUPABASE_KEY
)
