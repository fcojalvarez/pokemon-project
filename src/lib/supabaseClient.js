import { PostgrestClient } from '@supabase/postgrest-js'

const supabaseUrl = import.meta.env.VITE_BASE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_BASE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan las variables VITE_BASE_SUPABASE_URL y/o VITE_BASE_SUPABASE_KEY. ' +
      'Copia .env.example a .env y rellena las credenciales de Supabase.'
  )
}

/**
 * Cliente de solo consultas para leer las tablas (Pokédex, ficha, game_data).
 *
 * Es lo único de Supabase que va en el bundle principal. `createClient` trae
 * además la autenticación, el tiempo real y el almacenamiento, que la app no
 * usa al leer datos: 39 KB comprimidos frente a 7. Se llama igual que antes y
 * se usa igual (`supabase.from(...)`).
 */
export const supabase = new PostgrestClient(`${supabaseUrl}/rest/v1`, {
  headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
})

/**
 * El cliente completo, con sesión, para las sugerencias y el panel de
 * administración. Se descarga la primera vez que se pide.
 */
export const supabaseCompleto = () => import('./supabaseCompleto').then((m) => m.supabase)
